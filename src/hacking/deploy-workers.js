/**
 * Controlador
 */

import { scanAllServers } from "utils/network";
import { getBestTarget } from "utils/targets";
import { deployWorker, getFreeRam } from "utils/deploy";
import { printTable } from "utils/table";

const WORKER_SCRIPT = "/hacking/worker.js";

export async function main(ns) {
  const networkServers = scanAllServers(ns);

  const cloudServers = ns.cloud.getServerNames();

  const target = getBestTarget(ns, networkServers);

  if (!target) {
    ns.tprintf("No se encontro un objetivo valido");
    return;
  }

  ns.tprintf("Objetivo seleccionado: %s", target);

  ns.tprintf("");

  const workerServers = [...networkServers, ...cloudServers];

  const uniqueServers = [...new Set(workerServers)];

  const rows = [];

  for (const server of uniqueServers) {
    if (server === "home") {
      continue;
    }

    if (!ns.hasRootAccess(server)) {
      continue;
    }

    const maxRam = ns.getServerMaxRam(server);

    if (maxRam <= 0) {
      continue;
    }

    const freeRamBefore = getFreeRam(ns, server);

    const result = await deployWorker(ns, server, WORKER_SCRIPT, target);

    const isCloudServer = cloudServers.includes(server);

    rows.push({
      server,
      type: isCloudServer ? "CLOUD" : "RES",
      ram: ns.format.number(maxRam),
      free: ns.format.number(freeRamBefore),
      threads: result.threads,
      status: result.success ? "EJECUTANDO" : "SIN RAM",
    });
  }

  const columns = [
    {
      key: "server",
      label: "SERVER",
      align: "left",
    },
    {
      key: "type",
      label: "TIPO",
      align: "left",
    },
    {
      key: "ram",
      label: "RAM",
      align: "right",
    },
    {
      key: "free",
      label: "RAM LIBRE",
      align: "right",
    },
    {
      key: "threads",
      label: "THREADS",
      align: "right",
    },
    {
      key: "status",
      label: "ESTADO",
      align: "left",
    },
  ];

  printTable(ns, columns, rows);

  ns.tprintf("");

  ns.tprintf("Workers desplegados contra: %s", target);
}
