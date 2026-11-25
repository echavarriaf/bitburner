import { getInfrastructureDecision } from "utils/infrastructure";
import {
  purchaseCloudWorker,
  upgradeCloudServer,
  normalizedCloudServerNames,
} from "utils/cloud";
import { logTable } from "utils/table";

const CHECK_INTERVAL = 10000;

/**@param {NS} ns */
export async function main(ns) {
  //Nueva parte. Presta atencion
  ns.ui.openTail();

  ns.ui.setTailTitle("Administrador de infraestructura");

  /**
   * Ocualtamos los log automaticos de las funciones de Netscript.
   *
   * Solo veremos nuestros mensajes
   */
  ns.disableLog("ALL");

  while (true) {
    ns.clearLog();
    const renamedServers = normalizedCloudServerNames(ns);

    for (const result of renamedServers) {
      if (!result.renamed) {
        continue;
      }

      ns.print(`Servidor renombrado: ${result.oldName} ->${result.newName}`);
    }

    const decision = getInfrastructureDecision(ns);

    printHeader(ns, decision);
    printCloudServers(ns);
    printDecision(ns, decision);

    switch (decision.action){
      case "BUY": 
        await handlePurchase(ns, decision);
        break;
      case "UPGRADE": 
        await handleUpgrade(ns, decision);
        break;
      case "WAIT":
        break;
    }

    await waitForNextCheck(ns);
  }
}

/**
 * Muestra los CLoud Servers actuales dentro de la ventana Tail
 *
 * TAMBIEN MUESTRa cuantos threads de worker,js se estan ejecutando
 * @param {NS} ns
 */
const printCloudServers = (ns) => {

  const servers = ns.cloud
    .getServerNames()
    .map((server) => {
      const maxRam = ns.getServerMaxRam(server);

      const usedRam = ns.getServerUsedRam(server);

      const freeRam = Math.max(maxRam - usedRam, 0);

      return {
        server,
        maxRam,
        usedRam,
        freeRam
      };
    })
    .sort((a, b) => {
      if (a.maxRam !== b.maxRam) {
        return a.maxRam - b.maxRam;
      }
      return a.server.localeCompare(b.server);
    });

  if (servers.length === 0) {
    ns.print("No hay Cloud Servers");
    return;
  }

  const rows = servers.map((server) => ({
    server: server.server,
    maxRam: `${ns.format.number(server.maxRam)} GB`,
    usedRam: `${ns.format.number(server.usedRam)} GB`,
    freeRam: `${ns.format.number(server.freeRam)} GB`,
  }));

  const columns = [
    {
      key: "server",
      label: "SERVIDOR",
      align: "left",
    },
    {
      key: "maxRam",
      label: "RAM",
      align: "right",
    },
    {
      key: "usedRam",
      label: "USADA",
      align: "right",
    },
    {
      key: "freeRam",
      label: "LIBRE",
      align: "right",
    },
  ];

  logTable(ns, columns, rows);
};

/**
 * Muestra el estado general del administrador
 * @param {NS} ns 
 * @param {Object} decision 
 */
const printHeader = (ns, decision) => {
  ns.print("=== ADMINISTRADOR DE INGRAESTRUCTURA ===");

  ns.print("");

  ns.print(`Dinero: $${ns.format.number(decision.money)}`);

  ns.print(`Cloud Servers: ${decision.serverCount} / ${decision.serverLimit}`);

  ns.print("");
};

/**
 * Muestra la proxima decision del administrador
 * @param {NS} ns 
 * @param {Object} decision 
 */
const printDecision = (ns, decision) => {
  ns.print(`Decision: ${decision.action}`);
  ns.print(`Motivo: ${decision.reason}`);

  if (decision.server) {
    ns.print(`Servidor: ${decision.server}`);
  }

  if (decision.currentRam > 0 && decision.targetRam > decision.currentRam) {
    ns.print(`RAM: ${decision.currentRam} GB -> ${decision.targetRam} GB`);
  } else if (decision.action === "BUY") {
    ns.print(`RAM nuevo servidor: ${decision.targetRam} GB`);
  }

  if (decision.cost > 0) {
    ns.print(`Costo: $${ns.format.number(decision.cost)}`);
  }
};

/**
 * Mejorar un servidor y reinicia su worker para aprovechar la nueva RAM
 * 
 * El servidor queda disponible para que hack-manager lo utilice
 *
 * @param {NS} ns
 * @param {Object} decision
 */
const handleUpgrade = async (ns, decision) => {
  ns.print(`Mejorando ${decision.server}...`);

  const result = upgradeCloudServer(ns, decision.server, decision.targetRam);

  if (!result.success) {
    ns.print("");
    ns.print(`ERROR: ${result.reason}`);
    return;
  }

  ns.print("");
  ns.print(`${decision.server} mejorado correctamente`);
  ns.print(`${result.oldRam} GB -> ${result.newRam} GB`);
};

/**
 * Compra un nuevo servidor.
 * 
 * No despliega nada
 * 
 * El hack manager detectara automaticamente la nueva capacidad disponible
 *
 * @param {NS} ns
 * @param {Object} decision
 */
const handlePurchase = async (ns, decision) => {
  ns.print(`Comprando servidor de ${decision.targetRam} GB...`);

  const result = purchaseCloudWorker(ns, decision.targetRam);

  if (!result.success) {
    ns.print("");
    ns.print(`ERROR: ${result.reason}`);
    return;
  }

  ns.print("");
  ns.print(`Servidor comprado: ${result.hostname}`);

  ns.print(`RAM: ${ns.format.ram(decision.targetRam)}`);
};

/**
 * Espera antes de realizar la proxima revision
 *
 * @param {NS} ns
 */
const waitForNextCheck = async (ns) => {
  ns.print("");

  ns.print(`Proxima revision en ${CHECK_INTERVAL / 1000} segundos...`);

  await ns.sleep(CHECK_INTERVAL);
};
