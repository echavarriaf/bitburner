import { printTable } from "utils/table.js";

const WORKER_SCRIPT = "/hacking/worker.js";

export async function main(ns) {
  const server = "home";

  const maxRam = ns.getServerMaxRam(server);

  const usedRam = ns.getServerUsedRam(server);

  const freeRam = Math.max(maxRam - usedRam, 0);

  const workerRam = ns.getScriptRam(WORKER_SCRIPT, "home");

  const possibleThreads = workerRam > 0 ? Math.floor(freeRam / workerRam) : 0;

  const rows = [
    {
      metric: "RAM maxima",
      value: `${ns.format.number(maxRam)} GB`,
    },
    {
      metric: "RAM usada",
      value: `${ns.format.number(usedRam)} GB`,
    },
    {
      metric: "RAM libre",
      value: `${ns.format.number(freeRam)} GB`,
    },
    {
      metric: "RAM de worker.js",
      value: `${ns.format.number(workerRam)} GB`,
    },
    {
      metric: "Threads posibles",
      value: possibleThreads,
    },
  ];

  const columns = [
    {
      key: "metric",
      label: "METRICA",
      align: "left",
    },
    {
      key: "value",
      label: "VALOR",
      align: "right",
    },
  ];

  ns.tprintf("Estado actual de RAM en home:");
  ns.tprintf("");

  printTable(ns, columns, rows);
}
