import type { Place, PlanResult, TravelConstraints } from "./types";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// Agent 1: 需求拆解（规则+容错）
export function parseConstraints(text: string): { constraints: TravelConstraints; questions: string[] } {
  const t = (text || "").trim();
  const questions: string[] = [];

  // days
  const dayMatch = t.match(/(\d+)\s*天/);
  const days = dayMatch ? clamp(parseInt(dayMatch[1], 10), 1, 7) : 3;
  if (!dayMatch) questions.push("你计划玩几天？（例如：2天/3天）");

  // budget
  const budgetMatch = t.match(/预算\s*(\d+)\s*元/);
  const budgetCny = budgetMatch ? parseInt(budgetMatch[1], 10) : undefined;
  if (!budgetMatch) questions.push("大概预算多少元？（可选）");

  // crowd
  let crowd: TravelConstraints["crowd"] = "unknown";
  if (/(亲子|带娃|儿童)/.test(t)) crowd = "family";
  else if (/(情侣|约会)/.test(t)) crowd = "couple";
  else if (/(独自|一个人|单人)/.test(t)) crowd = "solo";
  else if (/(朋友|同学|同事)/.test(t)) crowd = "friends";

  // indoor
  const preferIndoor = /(室内|雨天|避雨)/.test(t) ? true : /(户外|公园|徒步)/.test(t) ? false : undefined;

  // pace
  let pace: TravelConstraints["pace"] = "normal";
  if (/(慢|悠闲|轻松)/.test(t)) pace = "relaxed";
  if (/(特种兵|紧凑|暴走)/.test(t)) pace = "intensive";

  // must/avoid (very lightweight)
  const mustInclude: string[] = [];
  const avoid: string[] = [];
  const mustRe = t.match(/包含([^，。]+)/);
  if (mustRe?.[1]) mustInclude.push(mustRe[1].trim());
  const avoidRe = t.match(/不去([^，。]+)/);
  if (avoidRe?.[1]) avoid.push(avoidRe[1].trim());

  const constraints: TravelConstraints = {
    days,
    budgetCny,
    crowd,
    preferIndoor,
    pace,
    mustInclude: mustInclude.length ? mustInclude : undefined,
    avoid: avoid.length ? avoid : undefined,
  };

  return { constraints, questions };
}

// Haversine distance (km)
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

// Agent 3: 行程编排（地理聚类+贪心）
export function buildPlan(constraints: TravelConstraints, places: Place[]): PlanResult {
  const notes: string[] = [];
  const days = constraints.days || 3;

  const filtered = places.filter((p) => {
    if (!constraints.avoid?.length) return true;
    return !constraints.avoid.some((kw) => p.name.includes(kw));
  });

  // Simple geographic clustering by lon split (Shanghai roughly west/east)
  const sortedByLon = [...filtered].sort((a, b) => a.lon - b.lon);
  const chunks: Place[][] = Array.from({ length: days }, () => []);
  sortedByLon.forEach((p, i) => chunks[i % days].push(p));

  const dayPlans = chunks.map((chunk, idx) => {
    // greedy route order starting from first
    const remaining = [...chunk];
    const ordered: Place[] = [];
    let current = remaining.shift();
    if (current) ordered.push(current);
    while (remaining.length) {
      const last = ordered[ordered.length - 1];
      let bestIdx = 0;
      let bestD = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = distanceKm(last, remaining[i]);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      ordered.push(remaining.splice(bestIdx, 1)[0]);
    }

    const estimatedTicketsCny = ordered.reduce((sum, p) => sum + (p.ticketCny ?? 0), 0);

    return {
      day: idx + 1,
      title: `Day ${idx + 1} · ${constraints.preferIndoor ? "偏室内" : "经典"}路线`,
      places: ordered,
      legs: [],
      estimatedTicketsCny,
    };
  });

  if (constraints.budgetCny != null) {
    const tickets = dayPlans.reduce((s, d) => s + d.estimatedTicketsCny, 0);
    if (tickets > constraints.budgetCny) {
      notes.push(`门票粗估约¥${tickets}，可能超出预算¥${constraints.budgetCny}，建议减少收费景点或优先免费场所。`);
    } else {
      notes.push(`门票粗估约¥${tickets}，在预算范围内（¥${constraints.budgetCny}）。`);
    }
  } else {
    notes.push("门票价格为演示级粗估（部分点位无法实时获取门票），可在对话中调整。 ");
  }

  if (constraints.preferIndoor) {
    notes.push("已偏向室内/可避雨点位；如遇雨天可进一步将公园类替换为商场/博物馆。 ");
  }

  return { constraints, days: dayPlans, notes };
}
