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
const DASHBOARD_REFRESH = 250;

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
    threads: getHackThreads(ns, target, HACK_PERCENTAGE),
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
 * devuelve tiempo estimado de ejecucion
 * @param {NS} ns
 * @param {string} target
 * @param {string} action
 * @returns {number}
 */
const getActionTime = (ns, target, action) => {
  switch (action) {
    case "HACK":
      return ns.getHackTime(target);

    case "GROW":
      return ns.getGrowTime(target);

    case "WEAKEN":
      return ns.getWeakenTime(target);

    default:
      return 0;
  }
};

/**
 *
 * @param {number} miliseconds
 * @returns {string}
 */
const formatDuration = (miliseconds) => {
  const totalSeconds = Math.max(Math.ceil(miliseconds / 1000), 0);

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

/**
 * devuelve las estadisticas de la ejecucion
 * @param {{
 *  server:string,
 *  type:string,
 * threads:number,
 * pid:number,
 * success:boolean
 * }[]} executions
 *
 * @returns
 */
const getExecutionStats = (executions) => {
  const successful = executions.filter((execution) => execution.pid > 0);

  const failed = executions.filter((execution) => execution.pid <= 0);

  const executedThreads = successful.reduce(
    (total, execution) => total + execution.threads,
    0,
  );

  return {
    successful,
    failed,
    executedThreads,
    serverCount: successful.length,
  };
};

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
      (process) => process.filename === currentScript && process.pid !== ns.pid,
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
 * @param {Array} executions
 * @param {number} estimatedTime
 * @param {number} remainingTime
 */
function renderDashboard(
  ns,
  target,
  decision,
  plan,
  status,
  executions = [],
  estimatedTime = 0,
  remainingTime = 0,
) {
  const state = getTargetState(ns, target);

  const stats = getExecutionStats(executions);

  /**
   * Antes de ejecutar, mostramos el plan.
   * Una vez que ns.exec() corra, mostramos los threas actuales lanzados
   */

  const hasExecutionResults = executions.length > 0;

  const displayedThreads = hasExecutionResults
    ? stats.executedThreads
    : plan.assignedThreads;

  const displayedServers = hasExecutionResults
    ? stats.serverCount
    : plan.assignments.length;

  ns.clearLog();

  ns.print("=== HACK MANAGER ===");

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
      value: `${ns.format.number(state.money)} / ${ns.format.number(state.maxMoney)}`,
    },
    {
      metric: "DINERO %",
      value: `${(state.moneyPercent * 100).toFixed(1)}%`,
    },
    {
      metric: "SEGURIDAD",
      value: `${state.security.toFixed(2)} / ${state.minSecurity.toFixed(2)}`,
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
      value: `${plan.assignedThreads} / ${decision.threads}`,
    },
    {
      metric: "SERVIDORES",
      value: displayedServers,
    },
    {
      metric: "DURACION EST",
      value: formatDuration(estimatedTime),
    },
  ];

  if (remainingTime > 0) {
    targetRows.push({
      metric: "TIEMPO REST.",
      value: formatDuration(remainingTime),
    });
  }

  if (hasExecutionResults) {
    targetRows.push({
      metric: "FALLOS",
      value: stats.failed.length,
    });
  }

  logTable(ns, targetColumns, targetRows);

  ns.print("");

  if (hasExecutionResults) {
    ns.print("=== EJECUCION REAL ===");
    ns.print("");

    const distributionColumns = [
      {
        key: "server",
        label: "SERVIDOR",
        align: "left",
      },
      {
        key: "type",
        label: "TIPO",
        align: "left",
      },
      {
        key: "threads",
        label: "THREADS",
        align: "right",
      },
      {
        key: "status",
        label: "STATUS",
        align: "left",
      },
    ];

    const distributionRows = executions.map((execution) => ({
      server: execution.server,
      type: execution.type ?? "N/A",
      threads: execution.threads,
      status: execution.success ? "OK" : "ERROR",
    }));

    logTable(ns, distributionColumns, distributionRows);
  } else if (plan.assignments.length > 0) {
    ns.print("=== PLAN DE DISTRIBUCIÓN ===");

    ns.print("");

    const distributionColumns = [
      {
        key: "server",
        label: "SERVIDOR",
        align: "left",
      },
      {
        key: "type",
        label: "TIPO",
        align: "left",
      },
      {
        key: "threads",
        label: "THREADS",
        align: "right",
      },
    ];

    const distributionRows = plan.assignments.map((assignment) => ({
      server: assignment.server,
      type: assignment.type ?? "N/A",
      threads: assignment.threads,
    }));

    logTable(ns, distributionColumns, distributionRows);
  }

  if (plan.remainingThreads > 0) {
    ns.print("");

    ns.print(`SIN CAPACIDAD: ${plan.remainingThreads} threads`);
  }
}

/**
 * Espera para la ejecucion para terminar mientras continuamente refresca el dashboard
 * @param {NS} ns
 * @param {string} target
 * @param {Object} decision
 * @param {Object} plan
 * @param {Array} executions
 * @param {number} estimatedTime
 */
const waitWithDashboard = async (
  ns,
  target,
  decision,
  plan,
  executions,
  estimatedTime,
) => {
  const successful = executions.filter(
    (execution) => execution.success && execution.pid != 0,
  );

  const startTime = Date.now();

  while (true) {
    const stillRunning = successful.some((execution) =>
      ns.isRunning(execution.pid, execution.server),
    );

    if (!stillRunning) {
      return;
    }

    const elapsed = Date.now() - startTime;

    const remaining = Math.max(estimatedTime - elapsed, 0);

    renderDashboard(
      ns,
      target,
      decision,
      plan,
      getActionStatus(decision.action),
      executions,
      estimatedTime,
      remaining,
    );

    await ns.sleep(DASHBOARD_REFRESH);
  }
};

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  if (isAnotherManagerRunning(ns)) {
    ns.tprintf("ERROR: Ya existe otro Hack Manager ejecutándose.");

    return;
  }

  const requestedTarget = String(ns.args[0] ?? "").trim();

  const servers = scanAllServers(ns);

  const target = requestedTarget || getBestTarget(ns, servers);

  if (!target) {
    ns.tprintf("ERROR: No se encontró un objetivo válido.");

    return;
  }

  ns.ui.openTail();

  ns.ui.setTailTitle(`Hack Manager - ${target}`);

  while (true) {
    const decision = getNextAction(ns, target);

    const estimatedTime = getActionTime(ns, target, decision.action);

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
        "ESPERANDO",
        [],
        estimatedTime,
        0,
      );

      await ns.sleep(RETRY_INTERVAL);

      continue;
    }

    const plan = buildThreadDistribution(ns, decision.script, decision.threads);

    if (plan.assignedThreads <= 0) {
      renderDashboard(
        ns,
        target,
        decision,
        plan,
        "SIN RAM DISPONIBLE",
        [],
        estimatedTime,
        0,
      );

      await ns.sleep(RETRY_INTERVAL);

      continue;
    }

    /**
     * Muestra el plant anteds de empezar
     */

    renderDashboard(
      ns,
      target,
      decision,
      plan,
      "PREPARANDO",
      [],
      estimatedTime,
      estimatedTime,
    );

    /**
     * Ejecucion actual
     */
    const results = await executeDistribution(
      ns,
      decision.script,
      target,
      plan,
    );

    /**
     * Ahora el dashboard muesta que empezo, no solamente el plan
     */
    renderDashboard(
      ns,
      target,
      decision,
      plan,
      getActionStatus(decision.action),
      results,
      estimatedTime,
      estimatedTime,
    );

    await waitWithDashboard(ns, target, decision, plan, results, estimatedTime);

    renderDashboard(
      ns,
      target,
      decision,
      plan,
      `${decision.action} TERMINADO`,
      results,
      estimatedTime,
      0,
    );

    await ns.sleep(250);
  }
}
