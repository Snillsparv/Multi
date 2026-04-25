"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PracticeQuestion } from "@/components/PracticeQuestion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  buildQueue,
  buildDiagnosticQueue,
  type FactRow,
} from "@/lib/leitner";

type Question = { a: number; b: number };

type AttemptLog = {
  a: number;
  b: number;
  given: number | null;
  correct: boolean;
  responseMs: number;
  prevBox: number;
  nextBox: number;
};

const PRACTICE_TARGET = 20;
const DIAGNOSTIC_COUNT = 30;

type Phase = "loading" | "running" | "done" | "error";

export function PracticeClient({
  focus,
  isDiagnostic,
  mode,
}: {
  focus: number | null;
  isDiagnostic: boolean;
  mode: "kid" | "adult";
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [boxBefore, setBoxBefore] = useState<Map<string, number>>(new Map());
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<AttemptLog[]>([]);

  const supabase = createClient();
  const showResponseTime = mode === "adult";

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: facts, error: factsErr } = await supabase
        .from("fact_mastery")
        .select("user_id, a, b, box, correct_count, wrong_count, avg_response_ms, last_seen_at, next_due_at")
        .eq("user_id", user.id);

      if (factsErr || !facts) {
        if (!cancelled) {
          setErrorMsg("Kunde inte hämta dina fakta.");
          setPhase("error");
        }
        return;
      }

      const factRows: FactRow[] = facts as FactRow[];
      const boxMap = new Map<string, number>();
      for (const f of factRows) boxMap.set(`${f.a}-${f.b}`, f.box);
      if (!cancelled) setBoxBefore(boxMap);

      let sessionMode: "diagnostic" | "practice" = isDiagnostic
        ? "diagnostic"
        : "practice";

      let q: Question[] = [];
      if (isDiagnostic) {
        q = buildDiagnosticQueue(DIAGNOSTIC_COUNT);
      } else if (focus) {
        const focusFacts = factRows.filter((f) => f.a === focus || f.b === focus);
        q = buildQueue(focusFacts, PRACTICE_TARGET).map((f) => ({
          a: f.a,
          b: f.b,
        }));
      } else {
        q = buildQueue(factRows, PRACTICE_TARGET).map((f) => ({
          a: f.a,
          b: f.b,
        }));
      }

      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .insert({ user_id: user.id, mode: sessionMode })
        .select()
        .single();

      if (sessionErr || !session) {
        if (!cancelled) {
          setErrorMsg("Kunde inte starta session.");
          setPhase("error");
        }
        return;
      }

      if (!cancelled) {
        setSessionId(session.id);
        setQueue(q);
        setPhase("running");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, isDiagnostic]);

  const onAnswered = useCallback(
    async (result: {
      a: number;
      b: number;
      given: number | null;
      correct: boolean;
      responseMs: number;
    }) => {
      if (!sessionId) return;

      const prevBox = boxBefore.get(`${result.a}-${result.b}`) ?? 1;

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          a: result.a,
          b: result.b,
          given_answer: result.given,
          correct: result.correct,
          response_ms: result.responseMs,
        }),
      });

      let nextBox = prevBox;
      if (res.ok) {
        const data = (await res.json()) as { box: number };
        nextBox = data.box;
        boxBefore.set(`${result.a}-${result.b}`, nextBox);
      }

      setLog((prev) => [
        ...prev,
        {
          a: result.a,
          b: result.b,
          given: result.given,
          correct: result.correct,
          responseMs: result.responseMs,
          prevBox,
          nextBox,
        },
      ]);

      if (index + 1 >= queue.length) {
        await fetch("/api/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (isDiagnostic) {
          // mark profile as onboarded
          const supabaseClient = createClient();
          const {
            data: { user },
          } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient
              .from("profiles")
              .update({ onboarded: true })
              .eq("id", user.id);
          }
        }
        setPhase("done");
      } else {
        setIndex(index + 1);
      }
    },
    [boxBefore, index, isDiagnostic, queue.length, sessionId]
  );

  if (phase === "loading") {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Laddar…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex justify-center py-12">
        <Card>
          <CardHeader>
            <CardTitle>Något gick fel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Link href="/dashboard" className={buttonVariants({})}>
              Tillbaka
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    const correctCount = log.filter((l) => l.correct).length;
    const avgMs =
      log.length > 0
        ? log.reduce((s, l) => s + l.responseMs, 0) / log.length
        : 0;
    const movedUp = log.filter((l) => l.nextBox > l.prevBox);
    const movedDown = log.filter((l) => l.nextBox < l.prevBox);

    return (
      <div className="flex justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Bra jobbat! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold">
                  {correctCount}/{log.length}
                </div>
                <div className="text-xs text-muted-foreground">Rätt</div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums">
                  {(avgMs / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">Snittid</div>
              </div>
            </div>

            {movedUp.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-1">⬆️ Klättrade</h3>
                <ul className="text-sm text-muted-foreground flex flex-wrap gap-2">
                  {movedUp.map((m, i) => (
                    <li
                      key={i}
                      className="rounded bg-green-100 text-green-900 px-2 py-1 tabular-nums"
                    >
                      {m.a}×{m.b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {movedDown.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-1">⬇️ Behöver mer övning</h3>
                <ul className="text-sm text-muted-foreground flex flex-wrap gap-2">
                  {movedDown.map((m, i) => (
                    <li
                      key={i}
                      className="rounded bg-red-100 text-red-900 px-2 py-1 tabular-nums"
                    >
                      {m.a}×{m.b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", className: "flex-1" })}
              >
                Till dashboard
              </Link>
              <Button onClick={() => router.refresh()} className="flex-1">
                Kör igen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = queue[index];
  if (!current) return null;

  return (
    <PracticeQuestion
      key={`${index}-${current.a}-${current.b}`}
      a={current.a}
      b={current.b}
      total={queue.length}
      index={index}
      showResponseTime={showResponseTime}
      onAnswered={onAnswered}
    />
  );
}
