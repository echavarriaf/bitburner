import {scanAllServers} from "/utils/network";
import {getBestTarget} from "/utils/targets";

export async function main(ns) {
    const servers=scanAllServers(ns);
    const target=getBestTarget(ns, servers);

    if (!target){
        Node.tprintf("NO target valido encontrado");
        return;
    }

    
    const moneyThreshold=ns.getServerMaxMoney(target)*0.75

    const securityThreshold=ns.getServerMinSecurityLevel(target)+5;

    ns.tprintf(
        "Objetivo seleccionado: %s",
        target
    );
    ns.tprintf(
        "Dinero Max: %s",
        ns.format.number(ns.getServerMaxMoney(target))
    );
    ns.tprintf(
        "Seguridad Min: %s",
        ns.format.number(ns.getServerMinSecurityLevel(target))
    );
    ns.tprintf(
        "Nivel Requerido: %d",
        ns.getServerRequiredHackingLevel(target)
    );

    ns.tprintf("");
    ns.tprintf("Hacking automatico iniciado...");
    ns.tprintf("");

    while(true){
        const currentSecurity=ns.getServerSecurityLevel(target);

        const currentMoney=ns.getServerMoneyAvailable(target);

        /**
         * El script revisa continuamente el servidor:
         * Seguridad alta -> weaken()
         * Dinero bajo -> grow()
         * servidor preparado ->hack()
         */
        if (currentSecurity>securityThreshold){
            ns.tprintf(
                "WEAKEN | %s | Seguridad: %s",
                target,
                ns.format.number(currentSecurity)
            );
            await ns.weaken(target);
        }else if (currentMoney<moneyThreshold){
            ns.tprintf(
                "GROW | %s | Dinero: %s",
                target,
                ns.format.number(currentMoney)
            );
            await ns.grow(target);
        } else{
            ns.tprintf(
                "HACK | %s | Dinero: %s",
                target,
                ns.format.number(currentMoney)
            );
            await ns.hack(target);
        }
    }
}