/**
 * Normalizes a script path so Bitburner can
 * work with it consistently.
 *
 * @param {string} path
 * @returns {string}
 */
function normalizeScriptPath(path) {
  return path.replace(/^\/+/, "");
}

/**
 * Returns the free RAM available on a server.
 *
 * @param {NS} ns
 * @param {string} server
 * @returns {number}
 */
export function getFreeRam(ns, server) {
  const maxRam = ns.getServerMaxRam(server);
  const usedRam = ns.getServerUsedRam(server);

  return Math.max(maxRam - usedRam, 0);
}

/**
 * Calculates how many threads of a script
 * can run on a specific server.
 *
 * @param {NS} ns
 * @param {string} server
 * @param {string} script
 * @returns {number}
 */
export function getAvailableThreads(ns, server, script) {
  const scriptPath = normalizeScriptPath(script);

  const scriptRam = ns.getScriptRam(scriptPath, "home");

  if (scriptRam <= 0) {
    return 0;
  }

  const freeRam = getFreeRam(ns, server);

  return Math.floor(freeRam / scriptRam);
}

/**
 * Returns all Cloud Servers with available
 * capacity for a specific script.
 *
 * @param {NS} ns
 * @param {string} script
 * @returns {{
 *   server: string,
 *   maxRam: number,
 *   usedRam: number,
 *   freeRam: number,
 *   availableThreads: number
 * }[]}
 */
export function getWorkerCapacity(ns, script) {
  const servers = ns.cloud.getServerNames();

  return servers
    .map((server) => {
      const maxRam = ns.getServerMaxRam(server);

      const usedRam = ns.getServerUsedRam(server);

      const freeRam = getFreeRam(ns, server);

      const availableThreads = getAvailableThreads(ns, server, script);

      return {
        server,
        maxRam,
        usedRam,
        freeRam,
        availableThreads,
      };
    })
    .filter((server) => server.availableThreads > 0)
    .sort((a, b) => a.server.localeCompare(b.server));
}

/**
 * Builds a balanced thread distribution plan.
 *
 * Threads are spread across available Cloud Servers
 * instead of filling one server completely first.
 *
 * @param {NS} ns
 * @param {string} script
 * @param {number} requestedThreads
 * @returns {{
 *   requestedThreads: number,
 *   assignedThreads: number,
 *   remainingThreads: number,
 *   assignments: {
 *     server: string,
 *     threads: number
 *   }[]
 * }}
 */
export function buildThreadDistribution(ns, script, requestedThreads) {
  const requested = Math.max(Math.ceil(requestedThreads), 0);

  const workers = getWorkerCapacity(ns, script);

  if (requested === 0 || workers.length === 0) {
    return {
      requestedThreads: requested,
      assignedThreads: 0,
      remainingThreads: requested,
      assignments: [],
    };
  }

  const totalCapacity = workers.reduce(
    (total, worker) => total + worker.availableThreads,
    0,
  );

  const threadsToAssign = Math.min(requested, totalCapacity);

  const assignments = workers.map((worker) => ({
    server: worker.server,
    capacity: worker.availableThreads,
    threads: 0,
  }));

  let remainingThreads = threadsToAssign;

  while (remainingThreads > 0) {
    const activeWorkers = assignments.filter(
      (worker) => worker.threads < worker.capacity,
    );

    if (activeWorkers.length === 0) {
      break;
    }

    const share = Math.max(
      Math.floor(remainingThreads / activeWorkers.length),
      1,
    );

    let assignedThisRound = 0;

    for (const worker of activeWorkers) {
      if (remainingThreads <= 0) {
        break;
      }

      const available = worker.capacity - worker.threads;

      const threads = Math.min(share, available, remainingThreads);

      if (threads <= 0) {
        continue;
      }

      worker.threads += threads;

      remainingThreads -= threads;

      assignedThisRound += threads;
    }

    if (assignedThisRound === 0) {
      break;
    }
  }

  const finalAssignments = assignments
    .filter((worker) => worker.threads > 0)
    .map((worker) => ({
      server: worker.server,
      threads: worker.threads,
    }));

  const assignedThreads = finalAssignments.reduce(
    (total, assignment) => total + assignment.threads,
    0,
  );

  return {
    requestedThreads: requested,

    assignedThreads,

    remainingThreads: requested - assignedThreads,

    assignments: finalAssignments,
  };
}

/**
 * Executes a distribution plan across
 * Cloud Servers.
 *
 * @param {NS} ns
 * @param {string} script
 * @param {string} target
 * @param {{
 *   assignments: {
 *     server: string,
 *     threads: number
 *   }[]
 * }} plan
 * @returns {Promise<{
 *   server: string,
 *   threads: number,
 *   pid: number,
 *   success: boolean
 * }[]>}
 */
export async function executeDistribution(ns, script, target, plan) {
  const results = [];

  const scriptPath = normalizeScriptPath(script);

  for (const assignment of plan.assignments) {
    const server = assignment.server;

    await ns.scp(scriptPath, server, "home");

    const pid = ns.exec(scriptPath, server, assignment.threads, target);

    results.push({
      server,
      threads: assignment.threads,
      pid,
      success: pid !== 0,
    });
  }

  return results;
}

/**
 * Waits until every successfully started
 * process has finished.
 *
 * @param {NS} ns
 * @param {{
 *   server: string,
 *   pid: number,
 *   success: boolean
 * }[]} executions
 */
export const waitForExecutions = async (ns, executions) => {
  const runningExecutions = executions.filter(
    (execution) => execution.success && execution.pid !== 0,
  );

  while (runningExecutions.length > 0) {
    let anyRunning = false;

    for (const execution of runningExecutions) {
      if (ns.isRunning(execution.pid, execution.server)) {
        anyRunning = true;
        break;
      }
    }

    if (!anyRunning) {
      return;
    }

    await ns.sleep(200);
  }
};
