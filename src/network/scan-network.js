import { scanAllServers } from "../utils/network";
import { printTable } from "utils/table";

/** @param {NS} ns */
export async function main(ns) {
    const servers=scanAllServers(ns);

    const rows=servers.map((server)=>{
        const requiredLevel=ns.getServerRequiredHackingLevel(server);

        const maxMoney=ns.getServerMaxMoney(server);

        const hasRoot=ns.hasRootAccess(server);

        return {
            server,
            level:requiredLevel,
            money:ns.format.number(maxMoney),
            root: hasRoot? "YES" : "NO"
        }
    });

    const columns=[
        {
            key:"server",
            label:"SERVER",
            align:"left"
        },
        {
            key:"level",
            label:"LEVEL",
            align:"rigth"
        },
        {
            key:"money",
            label:"MAX MONEY",
            align:"rigth"
        },
        {
            key:"root",
            label:"ROOT",
            align:"left"
        },
    ]

    ns.tprintf("Found %d servers:", servers.length);
    ns.tprint("");

    printTable(ns, columns, rows)
}