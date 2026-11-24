/** @param {NS} ns */
export async function main(ns){
    const target = String(ns.args[0] ?? "").trim();

  if (!target) {
    ns.tprintf("ERROR: Debes indicar un objetivo");
    return;
  }
    await ns.grow(target);
}