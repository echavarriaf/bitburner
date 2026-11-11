export async function main(ns) {
    /**Decidimo que servidor atacaremos */
    const target="n00dles";

    //Si el dinero disponible cae por debajo del 75% del maximo, utilizaremos grow()
    const moneyThreshold=ns.getServerMaxMoney(target)*0.75

    //Permitimos que la seguridad suba hasta 5 puntos por encima de su minimo. Si supera ese limite, utilizaremos weaken()
    const securityThreshold=ns.getServerMinSecurityLevel(target)+5;

    //Proceso principal
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
            await ns.weaken(target);
        }else if (currentMoney<moneyThreshold){
            await ns.grow(target);
        } else{
            await ns.hack(target);
        }
    }
}