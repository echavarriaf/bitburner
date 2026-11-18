import {
  getCloudServersByRam,
  getCloudServerUpgradeCost,
  upgradeCloudServer,
} from "utils/cloud";

import { deployWorker } from "utils/deploy";

import { scanAllServers } from "utils/network";
import { getBestTarget } from "utils/targets";

import { printTable } from "utils/table";

const WORKER_SCRIPT = "/hacking/worker.js";

/**
 *
 * @param {NS} ns
 */
export async function main(ns) {
  const servers = getCloudServersByRam(ns);

  if (servers.length === 0) {
    ns.tprintf("No tienes Cloud Servers.");
    return;
  }

  const targetRam = Number(ns.args[0]);

  if (!targetRam || targetRam <= 0) {
    ns.tprintf("Debes indicar la RAM objetivo");
    ns.tprintf("Ejemplo: run /cloud/upgrade-servers.js 32");
    return;
  }

  const networkServers = scanAllServers(ns);

  const target = getBestTarget(ns, networkServers);

  if (!target) {
    ns.tprintf("No se encontro un objetivo valido.");
    return;
  }

  const rows = [];

  for (const server of servers) {
    const cost =
      server.ram < targetRam
        ? getCloudServerUpgradeCost(ns, server.name, targetRam)
        : 0;

    rows.push({
      server: server.name,
      current: `${server.ram} GB`,
      target: `${targetRam} GB`,
      cost: cost > 0 ? `$${ns.format.number(cost)}` : "-",
      status: server.ram >= targetRam ? "OK" : "MEJORAR",
    });
  }

  const columns = [
    {
      key: "server",
      label: "SERVIDOR",
      align: "left",
    },
    {
      key: "current",
      label: "RAM ACTUAL",
      align: "right",
    },
    {
      key: "target",
      label: "RAM OBJETIVO",
      align: "right",
    },
    {
      key: "cost",
      label: "COSTO",
      align: "right",
    },
    {
      key: "status",
      label: "ESTADO",
      align: "left",
    },
  ];

  ns.tprintf("Cloud Servers ordenados por RAM:");
  ns.tprintf("");

  printTable(ns, columns, rows);

  ns.tprintf("");

  for (const server of servers) {
    if (server.ram >= targetRam) {
      continue;
    }

    const cost = getCloudServerUpgradeCost(ns, server.name, targetRam);

    const money = ns.getServerMoneyAvailable("home");

    if (money < cost) {
      ns.tprintf(
        "%s: Dinero insuficiente. Se detienen las mejoras",
        server.name,
      );
      break;
    }

    ns.tprintf("Mejorando %s...", server.name);

    const result = upgradeCloudServer(ns, server.name, targetRam);

    if (!result.success) {
      ns.tprintf("%s: No fue posible mejorar el servidor");
      continue;
    }

    ns.tprintf(
      "%s: %d GB -> %d GB",
      result.server,
      result.oldRam,
      result.newRam,
    );

    ns.tprintf("Reiniciando worker para usar la nueva RAM...");

    ns.scriptKill(WORKER_SCRIPT, server.name);

    const deployResult = await deployWorker(
      ns,
      server.name,
      WORKER_SCRIPT,
      target,
    );

    if (!deployResult.success) {
      ns.tprintf(
        "%s: upgrade completado, pero no se pudo iinicial el worker",
        server.name,
      );
      continue;
    }

    ns.tprintf(
      "%s: worker reiniciado con %d threads",
      server.name,
      deployResult.threads,
    );

    ns.tprintf("");
  }

  ns.tprintf("Proceso de mejoras terminado.");
}
