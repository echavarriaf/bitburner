/**
 * Devuelve informacion basica sobre los Cloud Servers comprados.
 * 
 * @param {NS} ns 
 * @returns {{
 *  names:string[],
 *  count:number,
 *  limit:number
 * }}
 */
export const getCloudServerInfo=(ns)=>{
    const names=ns.cloud.getServerNames();

    const limit=ns.cloud.getServerLimit();

    return {
        names,
        count:names.length,
        limit,
    }
}
/**
 * Devuelve el nombre del proximo worker
 * 
 * Ejemplo:
 * worker-01
 * worker-02
 * worker-03
 * 
 * @param {NS} ns 
 * @returns {string}
 */
export const getNextWorkerName=(ns)=>{
    const servers=ns.cloud.getServerNames();

    let index=1;

    while (true){
        const name=`worker-${String(index).padStart(2, "0")}`;

        if (!servers.includes(name)){
            return name;
        }

        index++;
    }
}

/**
 * Comprueba si podemos comprar un Cloud Server
 * @param {NS} ns 
 * @param {number} ram 
 * @returns {{
 *  canBuy: boolean,
 *  cost:number,
 *  money:number,
 *  serverCount:number,
 *  serverLimit:number,
 *  reason:string,
 * }}
 */
export const canPurchaseCloudServer=(ns, ram)=>{
    const servers=ns.cloud.getServerNames();

    const serverLimit=ns.cloud.getServerLimit();

    const cost=ns.cloud.getServerCost(ram);

    const money=ns.getServerMoneyAvailable("home");

    if (servers.length>=serverLimit){
        return {
            canBuy:false,
            cost,
            money,
            serverCount:serverLimit.length,
            serverLimit,
            reason:"Limite Alcanzado"
        };
    }
    
    if (money<cost){
        return {
            canBuy:false,
            cost,
            money,
            serverCount:serverLimit.length,
            serverLimit,
            reason:"Dinero Insuficiente"
        };
    }

    return {
            canBuy:true,
            cost,
            money,
            serverCount:serverLimit.length,
            serverLimit,
            reason:"Disponible"
        };


}
/**
 * Compra un nuevo Cloud Server.
 * 
 * @param {NS} ns 
 * @param {number} ram 
 * @returns {{
 *  success:boolean,
 *  hostname:string,
 *  ram:number,
 *  cost:number
 * }}
 */
export const purchaseCloudWorker=(ns, ram)=>{
    const check=canPurchaseCloudServer(ns, ram);

    if (!check.canBuy){
        return{
            success:false,
            hostname:"",
            ram,
            cost:check.cost,
        };
    }

    const hostname=getNextWorkerName(ns);

    const purchased=ns.cloud.purchaseServer(hostname, ram);

    return{
        success:purchased!=="",
        hostname:purchased,
        ram,
        cost:check.cost
    }
}