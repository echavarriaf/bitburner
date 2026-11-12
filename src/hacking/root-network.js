import { scanAllServers } from "utils/network";
import { tryRootServer, getAvailablePortPrograms } from "utils/root";
import { printTable } from "utils/table";

export async function main(ns) {
  const servers = scanAllServers(ns);

  const programs = getAvailablePortPrograms(ns);

  ns.tprintf("Programas disponibles para abrir puertos:");

  if (programs.length === 0) {
    ns.tprintf("- Ninguno");
  } else {
    for (const program of programs) {
      ns.tprintf("- %s", program.name

      );
    }
  }

  ns.tprintf("");

  const rows = [];

  for (const server of servers) {
    if (server === "home") {
      continue;
    }

    const hadRoot = ns.hasRootAccess(server);

    const result = tryRootServer(ns, server);

    let status;

    if (hadRoot) {
      status = "YA TENIA ROOT";
    } else if (result.success) {
      status = "ROOT OBTENIDO";
    } else {
      status = "SIN ACCESO";
    }

    rows.push({
      server,
      required: result.requiredPorts,
      programs: result.availablePrograms,
      opened: result.openedPorts,
      status,
    });
  }

  const columns = [
    {
      key: "server",
      label: "SERVIDOR",
      align: "left",
    },
    {
      key: "required",
      label: "PORTS",
      align: "right",
    },
    {
      key: "programs",
      label: "PROGRAMAS",
      align: "right",
    },
    {
      key: "opened",
      label: "ABIERTOS",
      align: "right",
    },
    {
      key: "status",
      label: "ESTADO",
      align: "left",
    },
  ];

  printTable(ns, columns, rows);
}
