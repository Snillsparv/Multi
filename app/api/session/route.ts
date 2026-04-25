import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextMastery, type FactRow } from "@/lib/leitner";

type AttemptBody = {
  session_id: string;
  a: number;
  b: number;
  given_answer: number | null;
  correct: boolean;
  response_ms: number;
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = (await req.json()) as AttemptBody;
  if (
    !body.session_id ||
    typeof body.a !== "number" ||
    typeof body.b !== "number" ||
    typeof body.correct !== "boolean" ||
    typeof body.response_ms !== "number"
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Insert attempt
  const { error: attemptErr } = await supabase.from("attempts").insert({
    session_id: body.session_id,
    user_id: user.id,
    a: body.a,
    b: body.b,
    given_answer: body.given_answer,
    correct: body.correct,
    response_ms: body.response_ms,
  });
  if (attemptErr) {
    return NextResponse.json({ error: attemptErr.message }, { status: 400 });
  }

  // Read current mastery
  const { data: factRow, error: readErr } = await supabase
    .from("fact_mastery")
    .select("user_id, a, b, box, correct_count, wrong_count, avg_response_ms, last_seen_at, next_due_at")
    .eq("user_id", user.id)
    .eq("a", body.a)
    .eq("b", body.b)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 400 });
  }

  const current: FactRow = factRow ?? {
    user_id: user.id,
    a: body.a,
    b: body.b,
    box: 1,
    correct_count: 0,
    wrong_count: 0,
    avg_response_ms: null,
    last_seen_at: null,
    next_due_at: null,
  };

  const updated = nextMastery(current, body.correct, body.response_ms);

  const { error: upsertErr } = await supabase.from("fact_mastery").upsert({
    user_id: user.id,
    a: body.a,
    b: body.b,
    ...updated,
  });
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 400 });
  }

  return NextResponse.json({ box: updated.box });
}

// Close session and bump streak.
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const { session_id } = (await req.json()) as { session_id: string };
  if (!session_id) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Aggregate attempts for the session
  const { data: attempts } = await supabase
    .from("attempts")
    .select("correct")
    .eq("session_id", session_id);

  const total = attempts?.length ?? 0;
  const correctCount = attempts?.filter((a) => a.correct).length ?? 0;

  const { error: sessionErr } = await supabase
    .from("sessions")
    .update({
      ended_at: new Date().toISOString(),
      total_questions: total,
      correct_count: correctCount,
    })
    .eq("id", session_id)
    .eq("user_id", user.id);

  if (sessionErr) {
    return NextResponse.json({ error: sessionErr.message }, { status: 400 });
  }

  // Update streak
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);

  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, last_practice_date")
    .eq("user_id", user.id)
    .maybeSingle();

  let current = streak?.current_streak ?? 0;
  let longest = streak?.longest_streak ?? 0;
  const last = streak?.last_practice_date ?? null;

  if (last !== todayDate) {
    if (last) {
      const lastDate = new Date(last + "T00:00:00Z");
      const diffDays = Math.round(
        (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
          lastDate.getTime()) /
          (24 * 60 * 60 * 1000)
      );
      current = diffDays === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);

    await supabase.from("streaks").upsert({
      user_id: user.id,
      current_streak: current,
      longest_streak: longest,
      last_practice_date: todayDate,
    });
  }

  return NextResponse.json({
    total,
    correct: correctCount,
    streak: { current, longest },
  });
}
