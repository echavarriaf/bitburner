import {
    getGrowThreads,
    getHackThreads,
    getTargetState,
    getWeakenThreads,
} from "/utils/hacking.js";

import {
    buildThreadDistribution,
    executeDistribution,
    waitForExecutions,
} from "/utils/distribution.js";

import { scanAllServers } from "/utils/network.js";
import { getBestTarget } from "/utils/targets.js";
import { logTable } from "/utils/table.js";

const HACK_SCRIPT = "/hacking/hack.js";
const GROW_SCRIPT = "/hacking/grow.js";
const WEAKEN_SCRIPT = "/hacking/weaken.js";

const MONEY_THRESHOLD = 0.9;
const HACK_PERCENTAGE = 0.1;
const RETRY_INTERVAL = 1000;

/**
 * Determines which action should be executed
 * against the current target.
 *
 * @param {NS} ns
 * @param {string} target
 * @returns {{
 *   action: "WEAKEN" | "GROW" | "HACK",
 *   script: string,
 *   threads: number
 * }}
 */
function getNextAction(ns, target) {
    const state = getTargetState(ns, target);

    if (state.security > state.minSecurity) {
        return {
            action: "WEAKEN",
            script: WEAKEN_SCRIPT,
            threads: getWeakenThreads(ns, target),
        };
    }

    if (state.moneyPercent < MONEY_THRESHOLD) {
        return {
            action: "GROW",
            script: GROW_SCRIPT,
            threads: getGrowThreads(ns, target),
        };
    }

    return {
        action: "HACK",
        script: HACK_SCRIPT,
        threads: getHackThreads(
            ns,
            target,
            HACK_PERCENTAGE
        ),
    };
}

/**
 * Returns a readable status for the
 * current hacking action.
 *
 * @param {string} action
 * @returns {string}
 */
function getActionStatus(action) {
    switch (action) {
        case "HACK":
            return "ROBANDO DINERO";

        case "GROW":
            return "RECUPERANDO DINERO";

        case "WEAKEN":
            return "REDUCIENDO SEGURIDAD";

        default:
            return "ESPERANDO";
    }
}

/**
 * Prevents multiple Hack Manager instances
 * from running simultaneously.
 *
 * @param {NS} ns
 * @returns {boolean}
 */
function isAnotherManagerRunning(ns) {
    const currentScript = ns.getScriptName();

    return ns
        .ps("home")
        .some(
            (process) =>
                process.filename === currentScript &&
                process.pid !== ns.pid
        );
}

/**
 * Draws the Hack Manager dashboard.
 *
 * @param {NS} ns
 * @param {string} target
 * @param {{
 *   action: string,
 *   threads: number
 * }} decision
 * @param {{
 *   requestedThreads: number,
 *   assignedThreads: number,
 *   remainingThreads: number,
 *   assignments: {
 *     server: string,
 *     threads: number
 *   }[]
 * }} plan
 * @param {string} status
 */
function renderDashboard(
    ns,
    target,
    decision,
    plan,
    status
) {
    const state = getTargetState(
        ns,
        target
    );

    ns.clearLog();

    ns.print(
        "=== HACK MANAGER ==="
    );

    ns.print("");

    const targetColumns = [
        {
            key: "metric",
            label: "MÉTRICA",
            align: "left",
        },
        {
            key: "value",
            label: "VALOR",
            align: "left",
        },
    ];

    const targetRows = [
        {
            metric: "OBJETIVO",
            value: target,
        },
        {
            metric: "DINERO",
            value:
                `${ns.format.number(state.money)} / ${ns.format.number(state.maxMoney)}`,
        },
        {
            metric: "DINERO %",
            value:
                `${(state.moneyPercent * 100).toFixed(1)}%`,
        },
        {
            metric: "SEGURIDAD",
            value:
                `${state.security.toFixed(2)} / ${state.minSecurity.toFixed(2)}`,
        },
        {
            metric: "ACCIÓN",
            value: decision.action,
        },
        {
            metric: "ESTADO",
            value: status,
        },
        {
            metric: "THREADS",
            value:
                `${plan.assignedThreads} / ${decision.threads}`,
        },
        {
            metric: "SERVIDORES",
            value:
                plan.assignments.length,
        },
    ];

    logTable(
        ns,
        targetColumns,
        targetRows
    );

    ns.print("");

    if (plan.assignments.length > 0) {
        ns.print(
            "=== DISTRIBUCIÓN ==="
        );

        ns.print("");

        const distributionColumns = [
            {
                key: "server",
                label: "SERVIDOR",
                align: "left",
            },
            {
                key: "threads",
                label: "THREADS",
                align: "right",
            },
        ];

        const distributionRows =
            plan.assignments.map(
                (assignment) => ({
                    server:
                        assignment.server,

                    threads:
                        assignment.threads,
                })
            );

        logTable(
            ns,
            distributionColumns,
            distributionRows
        );
    }

    if (plan.remainingThreads > 0) {
        ns.print("");

        ns.print(
            `SIN CAPACIDAD: ${plan.remainingThreads} threads`
        );
    }
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    if (
        isAnotherManagerRunning(ns)
    ) {
        ns.tprintf(
            "ERROR: Ya existe otro Hack Manager ejecutándose."
        );

        return;
    }

    const requestedTarget =
        String(
            ns.args[0] ?? ""
        ).trim();

    const servers =
        scanAllServers(ns);

    const target =
        requestedTarget ||
        getBestTarget(
            ns,
            servers
        );

    if (!target) {
        ns.tprintf(
            "ERROR: No se encontró un objetivo válido."
        );

        return;
    }

    ns.ui.openTail();

    ns.ui.setTailTitle(
        `Hack Manager - ${target}`
    );

    while (true) {
        const decision =
            getNextAction(
                ns,
                target
            );

        if (decision.threads <= 0) {
            const emptyPlan = {
                requestedThreads: 0,
                assignedThreads: 0,
                remainingThreads: 0,
                assignments: [],
            };

            renderDashboard(
                ns,
                target,
                decision,
                emptyPlan,
                "ESPERANDO"
            );

            await ns.sleep(
                RETRY_INTERVAL
            );

            continue;
        }

        const plan =
            buildThreadDistribution(
                ns,
                decision.script,
                decision.threads
            );

        if (plan.assignedThreads <= 0) {
            renderDashboard(
                ns,
                target,
                decision,
                plan,
                "SIN RAM DISPONIBLE"
            );

            await ns.sleep(
                RETRY_INTERVAL
            );

            continue;
        }

        renderDashboard(
            ns,
            target,
            decision,
            plan,
            getActionStatus(
                decision.action
            )
        );

        const results =
            await executeDistribution(
                ns,
                decision.script,
                target,
                plan
            );

        await waitForExecutions(
            ns,
            results
        );

        renderDashboard(
            ns,
            target,
            decision,
            plan,
            `${decision.action} TERMINADO`
        );

        await ns.sleep(250);
    }
}