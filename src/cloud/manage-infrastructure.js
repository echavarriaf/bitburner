import { getInfrastructureDecision } from "utils/infrastructure";
import { purchaseCloudWorker, upgradeCloudServer, normalizedCloudServerNames } from "utils/cloud";
import { deployWorker } from "utils/deploy";
import { scanAllServers } from "utils/network";
import { getBestTarget } from "utils/targets";
import { logTable } from "utils/table";

const WORKER_SCRIPT = "/hacking/worker.js";

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
    const renamedServers=normalizedCloudServerNames(ns);

    for (const result of renamedServers){
        if (!result.renamed){
            continue;
        }

        ns.print(`Servidor renombrado: ${result.oldName} ->${result.newName}`);
    }

    const networkServers = scanAllServers(ns);

    const target = getBestTarget(ns, networkServers);

    if (!target) {
      ns.print("No se encontro un objetivo valido.");
      await waitForNextCheck(ns);
      continue;
    }

    const decision = getInfrastructureDecision(ns);

    printHeader(ns, decision, target);

    printCloudServers(ns);

    ns.print("");

    printDecision(ns, decision);

    ns.print("");

    ns.print(`Dinero: $${ns.format.number(decision.money)}`);

    ns.print(
      `Cloud Servers: ${decision.serverCount} / ${decision.serverLimit}`,
    );
    ns.print(`Target de hacking: ${target}`);

    ns.print("");

    if (decision.action === "UPGRADE") {
      await handleUpgrade(ns, decision, target);
    } else if (decision.action === "BUY") {
      await handlePurchase(ns, decision, target);
    } else {
      ns.print("Sin cambios en esta revision");
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
  const workerPath = WORKER_SCRIPT.replace(/^\/+/, "");

  const servers = ns.cloud
    .getServerNames()
    .map((server) => {
      const maxRam = ns.getServerMaxRam(server);

      const usedRam = ns.getServerUsedRam(server);

      const freeRam = Math.max(maxRam - usedRam, 0);

      /**
       * Buscamos todas las instancias de worker.js ejecutandose en este servidor
       */

      const workerProcesses = ns.ps(server).filter((process) => {
        const proceePath = process.filename.replace(/^\/+/, "");

        return proceePath === workerPath;
      });

      const threads = workerProcesses.reduce(
        (total, process) => total + process.threads,
        0,
      );

      return {
        server,
        maxRam,
        usedRam,
        freeRam,
        threads,
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
    threads: server.threads,
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
    {
      key: "threads",
      label: "THREADS",
      align: "right",
    },
  ];

  logTable(ns, columns, rows);
};

const printHeader = (ns, decision, target) => {
  ns.print("=== ADMINISTRADOR DE INGRAESTRUCTURA ===");

  ns.print("");

  ns.print(`Dinero: $${ns.format.number(decision.money)}`);

  ns.print(`Cloud Servers: ${decision.serverCount} / ${decision.serverLimit}`);

  ns.print(`Target de hacking: ${target}`);

  ns.print("");
};

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
 * @param {NS} ns
 * @param {Object} decision
 * @param {string} target
 */
const handleUpgrade = async (ns, decision, target) => {
  ns.print(`Mejorando ${decision.server}...`);

  const result = upgradeCloudServer(ns, decision.server, decision.targetRam);

  if (!result.success) {
    ns.print("No fue posible mejorar el servidor.");
    return;
  }

  ns.print(`${result.oldRam} GB -> ${result.newRam} GB`);

  ns.scriptKill(WORKER_SCRIPT, decision.server);

  const deployResult = await deployWorker(
    ns,
    decision.server,
    WORKER_SCRIPT,
    target,
  );

  if (!deployResult.success) {
    ns.print("Upgrade completado, pero el worker no pudo iniciar");
    return;
  }

  ns.print(`Worker reiniciado con ${deployResult.threads} threads`);
};

/**
 * Compra un nuevo servidor y despliega inmediatamente worker.js
 *
 * @param {NS} ns
 * @param {Object} decision
 * @param {string} target
 */
const handlePurchase = async (ns, decision, target) => {
  ns.print(`Comprando servidor de ${decision.targetRam} GB...`);

  const result = purchaseCloudWorker(ns, decision.targetRam);

  if (!result.success) {
    ns.print("No fue posible comprar el servidor.");
    return;
  }

  ns.print(`Servidor creado: ${result.hostname}`);

  const deployResult = await deployWorker(
    ns,
    result.hostname,
    WORKER_SCRIPT,
    target,
  );

  if (!deployResult.success) {
    ns.print("Servidor comprado, pero el worker no pudo iniciar");
    return;
  }

  ns.print(`Worker reiniciado con ${deployResult.threads} threads`);
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
