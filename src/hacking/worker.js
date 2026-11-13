/**
 * Este es nuestro script trabajador. No escanea la red ni decide
 * target; recibe el objetivo como argumento
 */
export async function main(ns) {
  const target = ns.args[0];

  if (!target) {
    ns.tprint("ERROR: No se proporciono un objetivo.");
    return;
  }

  const moneyThreshold = ns.getServerMaxMoney(target) * 0.75;

  const securityThreshold = ns.getServerMinSecurityLevel(target) + 5;

  while (true) {
    const currentSecurity = ns.getServerSecurityLevel(target);

    const currentMoney = ns.getServerMoneyAvailable(target);

    if (currentSecurity > securityThreshold) {
      await ns.weaken(target);
    } else if (currentMoney < moneyThreshold) {
      await ns.grow(target);
    } else {
      await ns.hack(target);
    }
  }
}
