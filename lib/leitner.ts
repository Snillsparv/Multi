export const FAST_MS = 3000;

export const BOX_INTERVAL_DAYS: Record<number, number> = {
  1: 0,
  2: 1,
  3: 3,
  4: 7,
  5: 21,
};

export type Box = 1 | 2 | 3 | 4 | 5;

export type FactRow = {
  user_id: string;
  a: number;
  b: number;
  box: number;
  correct_count: number;
  wrong_count: number;
  avg_response_ms: number | null;
  last_seen_at: string | null;
  next_due_at: string | null;
};

export type MasteryUpdate = {
  box: number;
  correct_count: number;
  wrong_count: number;
  avg_response_ms: number;
  last_seen_at: string;
  next_due_at: string;
};

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function nextMastery(
  current: FactRow,
  correct: boolean,
  responseMs: number,
  now: Date = new Date()
): MasteryUpdate {
  const prevCount = current.correct_count + current.wrong_count;
  const prevAvg = current.avg_response_ms ?? responseMs;
  const newAvg = Math.round(
    (prevAvg * prevCount + responseMs) / Math.max(prevCount + 1, 1)
  );

  if (!correct) {
    return {
      box: 1,
      correct_count: current.correct_count,
      wrong_count: current.wrong_count + 1,
      avg_response_ms: newAvg,
      last_seen_at: now.toISOString(),
      next_due_at: now.toISOString(),
    };
  }

  const fast = responseMs < FAST_MS;
  const nextBox = fast ? Math.min((current.box ?? 1) + 1, 5) : current.box ?? 1;
  const intervalDays = fast
    ? BOX_INTERVAL_DAYS[nextBox] ?? 0
    : 1;
  const dueAt = intervalDays === 0 ? now : addDays(now, intervalDays);

  return {
    box: nextBox,
    correct_count: current.correct_count + 1,
    wrong_count: current.wrong_count,
    avg_response_ms: newAvg,
    last_seen_at: now.toISOString(),
    next_due_at: dueAt.toISOString(),
  };
}

/**
 * Build a question queue for a session.
 * 1. Take all due facts, sorted by box asc, next_due_at asc.
 * 2. If fewer than `target`, fill from lowest-box not-due facts.
 * 3. Avoid showing the same fact twice in a row.
 */
export function buildQueue(
  facts: FactRow[],
  target: number,
  now: Date = new Date()
): FactRow[] {
  const nowMs = now.getTime();

  const due = facts
    .filter((f) => (f.next_due_at ? Date.parse(f.next_due_at) <= nowMs : true))
    .sort((a, b) => {
      if (a.box !== b.box) return a.box - b.box;
      const aDue = a.next_due_at ? Date.parse(a.next_due_at) : 0;
      const bDue = b.next_due_at ? Date.parse(b.next_due_at) : 0;
      return aDue - bDue;
    });

  let queue = due.slice(0, target);

  if (queue.length < target) {
    const fillers = facts
      .filter((f) => !queue.includes(f))
      .sort((a, b) => a.box - b.box);
    // Light shuffle within same box for variety
    shuffleByBox(fillers);
    for (const f of fillers) {
      queue.push(f);
      if (queue.length >= target) break;
    }
  }

  return avoidImmediateRepeat(queue);
}

function shuffleByBox(arr: FactRow[]) {
  const groups = new Map<number, FactRow[]>();
  for (const f of arr) {
    const list = groups.get(f.box) ?? [];
    list.push(f);
    groups.set(f.box, list);
  }
  const result: FactRow[] = [];
  for (const [, list] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    result.push(...list);
  }
  arr.length = 0;
  arr.push(...result);
}

function avoidImmediateRepeat(queue: FactRow[]): FactRow[] {
  const out = [...queue];
  for (let i = 1; i < out.length; i++) {
    if (out[i].a === out[i - 1].a && out[i].b === out[i - 1].b) {
      const swapIdx = out.findIndex(
        (f, j) =>
          j > i &&
          (f.a !== out[i - 1].a || f.b !== out[i - 1].b) &&
          (j + 1 >= out.length ||
            f.a !== out[j + 1]?.a ||
            f.b !== out[j + 1]?.b)
      );
      if (swapIdx > -1) {
        [out[i], out[swapIdx]] = [out[swapIdx], out[i]];
      }
    }
  }
  return out;
}

export function buildDiagnosticQueue(count = 30): { a: number; b: number }[] {
  const all: { a: number; b: number }[] = [];
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) all.push({ a, b });
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
}

export function boxColor(box: number): string {
  // 1 = red, 5 = green
  switch (box) {
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-orange-400";
    case 3:
      return "bg-yellow-400";
    case 4:
      return "bg-lime-400";
    case 5:
      return "bg-green-500";
    default:
      return "bg-slate-200";
  }
}
