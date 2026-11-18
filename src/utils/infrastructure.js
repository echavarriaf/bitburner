/**
 * Devuelve el siguiente nivel de RAM para un servidor.
 *
 * Ejemplo:
 * 8 GB -> 16 GB
 * 16 GB -> 32 GB
 * 32 GB -> 64 GB
 *
 * Nunca supera el limite permitido por el juego.
 *
 * @param {NS} ns
 * @param {number} currentRam
 * @returns {number}
 */
export const getNextLevelRam = (ns, currentRam) => {
  const ramLimit = ns.cloud.getRamLimit();

  const nextRam = currentRam * 2;

  return Math.min(nextRam, ramLimit);
};

/**
 * Analiza la infraestructura y decide si debemos comprar, mejorar o esperar
 *
 * Prioridades:
 *
 * 1.Igualar los servidores con menor RAM
 * 2. MIentras haya espacio, comprar nuevos servidores
 * 3. All llegar al limite de servidores, subir toda la infraestructura al siguiente nivel
 *
 * @param {NS} ns
 * @param {number} targetRam
 * @returns {{
 *  action: "BUY" | "UPGRADE" | "WAIT",
 *  reason: string,
 *  serverCount:number,
 *  serverLimit:number,
 * server: string|null,
 * currentRam:number,
 * targetRam:number,
 * cost:number,
 * }}
 */
export const getInfrastructureDecision = (ns, targetRam) => {
  const servers = ns.cloud.getServerNames();

  const serverLimit = ns.cloud.getServerLimit();

  const ramLimit = ns.cloud.getRamLimit();

  const money = ns.getServerMoneyAvailable("home");

  /**
   * Si todavia no tenemos servidores, empezamos con 8 GB
   */

  if (servers.length === 0) {
    const initialRam = 8;

    const cost = ns.cloud.getServerCost(initialRam);

    return {
      action: money >= cost ? "BUY" : "WAIT",
      reason:
        money >= cost
          ? "CREANDO PRIMER CLOUD SERVER"
          : "DINER INSUFICIENTE PARA EL PRIMER SERVIDOR",
      money,
      serverCount: 0,
      serverLimit,
      server: null,
      currentRam: 0,
      targetRam: initialRam,
      cost,
    };
  }

  const serverDetails = servers
    .map((server) => ({
      name: server,
      ram: ns.getServerMaxRam(server),
    }))
    .sort((a, b) => a.ram - b.ram);

  const smallestServer = serverDetails[0];

  const largestServer = serverDetails[serverDetails.length - 1];

  /**
   * Prioridad 1:
   * Si existen servidores con menos RAM que el mas grande, primero igualamos la infraestructura
   */
  if (smallestServer.ram < largestServer.ram) {
    const targetRam = getNextLevelRam(ns, smallestServer.ram);

    const cost = ns.cloud.getServerUpgradeCost(smallestServer.name, targetRam);

    return {
      action: money >= cost ? "UPGRADE" : "WAIT",
      reason:
        money >= cost
          ? "IGUALANDO CAPACIDAD DE SERVIDORES"
          : "DINERO INSUFICIENTE PARA IGUALAR SERVIDORES",
      money,
      serverCount: servers.length,
      serverLimit,
      server: smallestServer.name,
      currentRam: smallestServer.ram,
      targetRam,
      cost,
    };
  }

  /**
   * PRIORIDAD 2:
   *
   * TODOS TIENEN La misma RAM.
   *
   * Si todavia podemos comprar servidores, a~adimos uno con la misma capacidad
   */
  if (servers.length < serverLimit) {
    const purchaseRam = smallestServer.ram;

    const cost = ns.cloud.getServerCost(purchaseRam);

    return {
      action: money > cost ? "BUY" : "WAIT",
      reason:
        money > cost
          ? "AMPLIANDO CANTIDAD DE SERVIDORES"
          : "DINERO INSUFICIENTE PARA COMPRAR OTRO SERVIDOR",
      money,
      serverCount: servers.length,
      serverLimit,
      server: null,
      currentRam: 0,
      targetRam: purchaseRam,
      cost,
    };
  }

  /*
   * PRIORIDAD 3
   *
   * Ya llegamos al límite de servidores.
   *
   * Ahora dejamos de comprar y empezamos
   * a aumentar la RAM de toda la infraestructura.
   */
  if (servers.length >= serverLimit && smallestServer.ram < ramLimit) {
    const targetRam = getNextLevelRam(ns, smallestServer.ram);
    /**
     * Proteccion adicional:
     * Si no existe un nive superior, estamos realmente en el maximo
     */

    if (targetRam <= smallestServer){
        return{
            action:"WAIT",
            reason:"INFRAESTRUCTURA AL MAXIMO",
            money,
            serverCount: servers.length,
            serverLimit,
            server:null,
            currentRam:smallestServer.ram,
            targetRam:smallestServer.ram,
            cost:0
        }
    }

    const cost = ns.cloud.getServerUpgradeCost(smallestServer.name, targetRam);

      return {
        action: money >= cost ? "UPGRADE":"WAIT",
        reason: money >= cost ? "SUBIENDO AL SIGUIENTE NIVEL DE RAM":"DINERO INSUFICIENTE PARA EL SIGUIENTE NIVEL",
        money,
        serverCount: servers.length,
        serverLimit,
        server: smallestServer.name,
        currentRam: smallestServer.ram,
        targetRam,
        cost,
      };
  }

  return {
    action: "WAIT",
    reason: "INFRAESTRUCTURA AL MAXIMO",
    money,
    serverCount: servers.length,
    serverLimit,
    server: null,
    currentRam: smallestServer.ram,
    targetRam: smallestServer.ram,
    cost: 0,
  };
};
