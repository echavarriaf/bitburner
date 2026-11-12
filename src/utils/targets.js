/**
 * Devuelve los servidores que son targets validos
 *
 * Un target valido:
 * - no es home
 * - tiene dinero
 * - alcanzamos el nivel de hacking requerido
 * - tiene acceso Root
 *
 * @param {NS} ns
 * @param {string[]} servers
 * @return {string[]}
 */

export const getHackableTargets = (ns, servers) => {
  const playerHackingLevel = ns.getHackingLevel();

  return servers.filter((server) => {
    if (server === "home") {
      return false;
    }

    const maxMoney = ns.getServerMaxMoney(server);
    const requiredLevel = ns.getServerRequiredHackingLevel(server);
    const hasRoot = ns.hasRootAccess(server);

    return maxMoney > 0 && requiredLevel <= playerHackingLevel && hasRoot;
  });
};

/**
 * Calcula un valor para un objetivo hacking
 *
 * Dinero mas alto, incrementa el valor
 * Nivel de hacking requerido alto, decrementa el valor
 *
 * @param {NS} ns
 * @param {string} server
 * @return {number}
 */
export const getTargetScore = (ns, server) => {
  const maxMoney = ns.getServerMaxMoney(server);
  const requiredLevel = ns.getServerRequiredHackingLevel(server);

  return maxMoney / Math.max(requiredLevel, 1);
};

/**
 * Devuelve el mejor objetivo de la lista de servidores
 *
 * @param {NS} ns
 * @param {string[]} servers
 * @returns {string | null}
 */
export const getBestTarget = (ns, servers) => {
  const targets = getHackableTargets(ns, servers);

  if (targets.length === 0) {
    return null;
  }

  let bestTarget = targets[0];
  let bestScore = getTargetScore(ns, bestTarget);

  for (const server of targets) {
    const score = getTargetScore(ns, server);

    if (score > bestScore) {
      bestTarget = server;
      bestScore = score;
    }
  }

  return bestTarget;
};
