/**
 * Devuelve el programa que abre un puerto que este disponible en home
 *
 * @param {NS} ns
 * @returns {{
 *  name:string,
 *  open:(server: string)=>boolean
 * }[]}
 */
export const getAvailablePortPrograms = (ns) => {
  const programs = [];

  if (ns.fileExists("BruteSSH.exe", "home")) {
    programs.push({
      name: "BruteSSH.exe",
      open: (server) => ns.brutessh(server),
    });
  }

  if (ns.fileExists("FTPCrack.exe", "home")) {
    programs.push({
      name: "FTPCrack.exe",
      open: (server) => ns.frpcrack(server),
    });
  }

  if (ns.fileExists("relaySMTP.exe", "home")) {
    programs.push({
      name: "relaySMTP.exe",
      open: (server) => ns.relaysmtp(server),
    });
  }

  if (ns.fileExists("SQLInject.exe", "home")) {
    programs.push({
      name: "SQLInject.exe",
      open: (server) => ns.sqlinject(server),
    });
  }

  return programs;
};

/**
 * Intenta obtener acceso root en un servidor
 *
 * @param {NS} ns
 * @param {string} server
 * @returns {{
 *  success: boolean,
 *  requiredPorts: number,
 *  availablePrograms: number,
 *  openedPorts: number
 * }}
 */
export const tryRootServer = (ns, server) => {
  const requiredPorts = ns.getServerNumPortsRequired(server);

  const programs = getAvailablePortPrograms(ns);

  if (ns.hasRootAccess(server)) {
    return {
      success: true,
      requiredPorts: ns.getServerNumPortsRequired(server),
      availablePrograms: getAvailablePortPrograms(ns).length,
      openedPorts: 0,
    };
  }

  let openedPorts = 0;

  for (const program of programs) {
    const success = program.open(server);

    if (success) {
      openedPorts++;
    }
  }

  if (openedPorts >= requiredPorts) {
    const success = ns.nuke(server);

    return {
      success: success || ns.hasRootAccess(server),
      requiredPorts,
      availablePrograms: programs.length,
      openedPorts,
    };
  }

  return {
    success: false,
    requiredPorts,
    availablePrograms: programs.length,
    openedPorts,
  };
};
