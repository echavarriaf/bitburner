import { scanAllServers } from "../utils/network";

/** @param {NS} ns */
export async function main(ns) {
    const servers=scanAllServers(ns);

    ns.tprint(`Found ${servers.length} servers:`);
    ns.tprint("");

    for (const server of servers){
        const requiredLevel=ns.getServerRequiredHackingLevel(server);

        const maxMoney=ns.getServerMaxMoney(server);

        const hasRoot=ns.hasRootAccess(server);

        ns.tprint(
            `${server} | `+
            `Level: ${requiredLevel} | ` +
            `Money: ${maxMoney} | ` +
            `Root: ${hasRoot ? "YES":"NO"}`
        );
    }
}