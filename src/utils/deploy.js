/**
 * Devuelve la RAM libre de un servidor
 *
 * @param {NS} ns
 * @param {string} server
 * @returns {number}
 */
export const getFreeRam = (ns, server) => {
  const maxRam = ns.getServerMaxRam(server);

  const usedRam = ns.getServerUsedRam(server);

  return Math.max(maxRam - usedRam, 0);
};

/**
 * Calcula cuantos threads puede ejecutar un
 * servidor
 *
 * @param {NS} ns
 * @param {string} server
 * @param {string} script
 * @returns {number}
 */
export const getAvailableThreads = (ns, server, script) => {
  const freeRam = getFreeRam(ns, server);

  const scriptRam = ns.getScriptRam(script, "home");

  if (scriptRam <= 0) {
    return 0;
  }

  return Math.floor(freeRam / scriptRam);
};

export const deployWorker = async (ns, server, script, target) => {
  const threads = getAvailableThreads(ns, server, script);

  if (threads < 1) {
    return {
      success: false,
      threads: 0,
      pid: 0,
    };
  }

  const copied = await ns.scp(script, server, "home");

  if (!copied) {
    return {
      success: false,
      threads: 0,
      pid: 0,
    };
  }

  const pid = ns.exec(script, server, threads, target);

  return {
    success: pid !== 0,
    threads,
    pid,
  };
};
