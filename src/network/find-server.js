import {scanAllServers} from "utils/network";

/**
 * Finds the path from start server to the target server
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @param {string} start 
 * @returns {string[] | null}
 */
const findPath=(ns, target, start="home")=>{
    const visited=new Set([start]);
    const queue=[[start]];

    while (queue.length>0){
        const path =queue.shift();
        const current =path[path.length -1];

        if (current===target){
            return path;
        }

        for (const neighbor of ns.scan(current)){
            if (!visited.has(neighbor)){
                visited.add(neighbor);
                queue.push([...path, neighbor]);
            }
        }
    }

    return null;
}

/**
 * Crea la conexion en terminal para la ruta aal servidor
 * 
 * @param {string[]} path 
 * @returns {string}
 */
const buildConnectCommand=(path)=>{
    return path
        .slice(1)
        .map((server)=>`connect ${server}`)
        .join("; ");
}

export async function main(ns) {
    const target=String(ns.args[0] ?? "").trim();

    if (!target){
        ns.tprintf("ERROR: Debes indicar el nombre de un servidor.");
        ns.tprintf("Ejemplo:");
        ns.tprintf("run network/find-server.js CSEC");
        return;
    }

    const servers=scanAllServers(ns);

    if (!servers.includes(target)){
        ns.tprintf(`ERROR: No se encontro el servidor ${target}.`);
        return;
    }

    const path=findPath(ns, target);

    if (!path){
        ns.tprintf(`ERROR: No se pido encontrar una ruta hasta "${target}".`);
        return;
    }

    ns.tprintf("");
    ns.tprintf(`=== RUTA HASTA ${target} ===`);
    ns.tprintf("");

    for (let i=0;i<path.length;i++){
        const prefix=i===0?"":"→ ";
        ns.tprintf(`${prefix}${path[i]}`);
    }

    ns.tprintf("");
    ns.tprintf("Comando para conectarte:");
    ns.tprintf("");
    ns.tprintf(buildConnectCommand(path));
    ns.tprintf("");
}