/**
 * Nos permite scan la red desde cualquier nodo partiendo desde host
 * 
 * @param {NS} ns
 * @param {string} start
 * @returns {string[]}
 * */
export const scanAllServers= (ns, start="home") => {
    const discovered = new Set([start]);
    const queue=[start];

    while (queue.length >0){
        const current = queue.shift();

        for (const server of ns.scan(current)){
            if (!discovered.has(server)){
                discovered.add(server);
                queue.push(server);
            }
        }
    }

    return [...discovered]
}