/**
 * Calcula cuantos threads de weaken son requeridos para reducir la seguridad del objetivo al minimo
 *
 * @param {NS} ns
 * @param {string} target
 * @returns {number}
 */
export const getWeakenThreads = (ns, target) => {
  const currentSecurity = ns.getServerSecurityLevel(target);
  const minSecurity = ns.getServerMinSecurityLevel(target);

  const securityDifference = currentSecurity - minSecurity;

  if (securityDifference <= 0) {
    return 0;
  }

  const weakenPerThread = ns.weakenAnalyze(1);

  return Math.ceil(securityDifference / weakenPerThread);
};

/**
 * Calcula cuantos threads de grow son requeridos para aumentar el dinero del objetivo al maximo
 *
 * @param {NS} ns
 * @param {string} target
 * @returns {number}
 */
export const getGrowThreads = (ns, target) => {
  const currentMoney = ns.getServerMoneyAvailable(target);
  const maxMoney = ns.getServerMaxMoney(target);

  if (maxMoney <= 0) {
    return 0;
  }

  if (currentMoney >= maxMoney) {
    return 0;
  }

  const safeCurrentMoney = Math.max(currentMoney, 1);

  const growthMultiplier = maxMoney / safeCurrentMoney;

  const threads = ns.growthAnalyze(target, growthMultiplier);

  if (!Number.isFinite(threads)) {
    return 0;
  }

  return Math.ceil(threads);
};

/**
 * Calcula cuantos threas de hack son requeridos para robar un porcentaje del dinero del servidor
 * @param {NS} ns
 * @param {string} target
 * @param {number} percentage
 * @returns {number}
 */
export const getHackThreads = (ns, target, percentage = 0.1) => {
  const currentMoney = ns.getServerMoneyAvailable(target);

  if (currentMoney < -0) {
    return 0;
  }

  const safePercentage = Math.min(Math.max(percentage, 0));

  const amountToHack = currentMoney * safePercentage;

  const threads = ns.hackAnalyzeThreads(target, amountToHack);

  if (!Number.isFinite(threads) || threads < 0) {
    return 0;
  }

  return Math.ceil(threads);
};

/**
 * Devuelve el estado actual del objetivo
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @returns {{
 *  money:number,
 *  maxMoney: number,
 *  security: number,
 *  minSecurity: number,
 *  moneyPercent:number
 * }}
 */
export const getTargetState=(ns, target)=>{
    const money=ns.getServerMoneyAvailable(target);
    const maxMoney=ns.getServerMaxMoney(target);
    const security=ns.getServerSecurityLevel(target);
    const minSecurity=ns.getServerMinSecurityLevel(target);

    const moneyPercent=maxMoney>0 ? money/maxMoney : 0;

    return {
        money,
        maxMoney,
        security,
        minSecurity,
        moneyPercent
    }
}
