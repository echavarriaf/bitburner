import { canPurchaseCloudServer, purchaseCloudWorker } from "utils/cloud";
import { deployWorker } from "utils/deploy";
import { scanAllServers } from "utils/network";
import { getBestTarget } from "utils/targets.js";
import { printTable } from "utils/table";

const WORKER_SCRIPT = "/hacking/worker.js";

export async function main(ns) {
  const ramArgument = Number(ns.args[0]);

  const RAM = ramArgument > 0 ? ramArgument : 16;

  const check=canPurchaseCloudServer(ns, RAM);

  const serverCount=ns.cloud.getServerNames().length;

  const rows = [
    {
      metric: "RAM del servidor",
      value: `${RAM} GB`,
    },
    {
      metric: "Costo",
      value: `$${ns.format.number(check.cost)}`,
    },
    {
      metric: "Dinero disponible",
      value: `$${ns.format.number(check.money)}`,
    },
    {
      metric: "Servidores",
      value: `${serverCount} / ${check.serverLimit}`,
    },
    {
      metric: "Estado",
      value: check.reason,
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

  ns.tprintf("Compra auomatica de Cloud Server");
  ns.tprintf("");

  printTable(ns, columns, rows);

  ns.tprintf("");

  if (!check.canBuy) {
    ns.tprintf("No se puede comprar el servidor en este momento.");

    return;
  }

  const result = purchaseCloudWorker(ns, RAM);

  if (!result.success) {
    ns.tprintf("No fue posible comprar el servidor.");
    return;
  }

  ns.tprintf("servidor comprado correctamente");

  ns.tprintf(
    "%s | %d GB | $%s",
    result.hostname,
    result.ram,
    ns.format.number(result.cost),
  );

  ns.tprintf("");
  
  ns.tprintf("Preparando nuevo worker...");
  
  const networkServers=scanAllServers(ns);
  
  const target=getBestTarget(ns, networkServers);
  
  if (!target){
      ns.tprintf("No se encontro un objetivo valido");
      return;
    }
    
    const deployResult=await deployWorker(ns, result.hostname, WORKER_SCRIPT,target);
    
    ns.tprintf("");
    
    if (!deployResult.success){
        ns.tprintf("El servidor fue comprado, pero no se pudo inicial el worker.");
        return;
    }

    ns.tprintf("Worker desplegado correctamente");

    ns.tprintf("Servidord: %s", result.hostname);
    ns.tprintf("Objetivo: %s", target);
    ns.tprintf("Threads: %d", deployResult.threads);
    ns.tprintf("PID: %d", deployResult.pid);

    ns.tprintf("");
    
    ns.tprintf("%s se esta EJECUTANDO", result.hostname);

}
