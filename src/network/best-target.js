import { scanAllServers } from "/utils/network";
import {
  getBestTarget,
  getHackableTargets,
  getTargetScore,
} from "/utils/targets";
import { printTable } from "utils/table";

export async function main(ns) {
  const servers = scanAllServers(ns);

  const targets = getHackableTargets(ns, servers);

  if (targets.length === 0) {
    ns.tprint("No hackable targets found.");
    return;
  }

  const rows = targets.map((server) => {
    const score = getTargetScore(ns, server);
    const maxMoney = ns.getServerMaxMoney(server);
    const requiredLevel = ns.getServerRequiredHackingLevel(server);

    return {
      server,
      money: ns.format.number(maxMoney),
      level: requiredLevel,
      score: ns.format.number(score),
    };
  });

  const columns =[
    {
        key:"server",
        label:"SERVER",
        align:"left"
    },
    {
        key:"money",
        label:"MAX MONEY",
        align:"rigth"
    },
    {
        key:"level",
        label:"LEVEL",
        align:"rigth"
    },
    {
        key:"score",
        label:"score",
        align:"rigth"
    },
  ];

  printTable(ns, columns, rows);

  const bestTarget=getBestTarget(ns, servers);
  ns.tprintf("");
  ns.tprintf(
    "Best target: %s",
    bestTarget
  );
}
