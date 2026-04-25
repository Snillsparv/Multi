"use client";

import { useEffect, useRef, useState } from "react";
import { Numpad } from "@/components/Numpad";
import { strategyFor } from "@/lib/strategies";
import { cn } from "@/lib/utils";

type Props = {
  a: number;
  b: number;
  total: number;
  index: number;
  showResponseTime: boolean;
  onAnswered: (result: {
    a: number;
    b: number;
    given: number | null;
    correct: boolean;
    responseMs: number;
  }) => void;
};

type Phase = "asking" | "feedback";

const FEEDBACK_DURATION_MS = 1200;

export function PracticeQuestion({
  a,
  b,
  total,
  index,
  showResponseTime,
  onAnswered,
}: Props) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("asking");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue("");
    setPhase("asking");
    setLastCorrect(null);
    setLastMs(null);
    startedAtRef.current = Date.now();
  }, [a, b, index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "asking") return;
      if (e.key >= "0" && e.key <= "9") {
        setValue((v) => (v.length >= 4 ? v : v + e.key));
      } else if (e.key === "Backspace") {
        setValue((v) => v.slice(0, -1));
      } else if (e.key === "Enter") {
        submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, value, a, b]);

  function submit() {
    if (phase !== "asking") return;
    if (value.length === 0) return;
    const responseMs = Date.now() - startedAtRef.current;
    const given = parseInt(value, 10);
    const correct = given === a * b;
    setLastCorrect(correct);
    setLastMs(responseMs);
    setPhase("feedback");

    setTimeout(() => {
      onAnswered({ a, b, given, correct, responseMs });
    }, correct ? FEEDBACK_DURATION_MS - 400 : FEEDBACK_DURATION_MS + 800);
  }

  const progressPct = Math.round((index / total) * 100);
  const strategy = !lastCorrect && phase === "feedback" ? strategyFor(a, b) : null;

  return (
    <div className="flex flex-col items-stretch gap-6 max-w-md mx-auto w-full" ref={inputRef}>
      {phase === "feedback" && lastCorrect !== null && (
        <div
          className={lastCorrect ? "flash-correct" : "flash-wrong"}
          aria-hidden
        />
      )}

      <div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {index + 1} / {total}
        </div>
      </div>

      <div className="text-center space-y-2 py-6">
        <div className="text-7xl md:text-8xl font-bold tabular-nums">
          {a} × {b}
        </div>

        <div
          className={cn(
            "h-16 mt-4 rounded-lg border-2 border-dashed flex items-center justify-center text-4xl font-semibold tabular-nums",
            phase === "feedback" && lastCorrect && "border-green-500 text-green-600",
            phase === "feedback" && !lastCorrect && "border-red-500 text-red-600"
          )}
          aria-live="polite"
        >
          {phase === "feedback" && !lastCorrect ? (
            <span>
              {value || "—"} <span className="text-muted-foreground mx-2">→</span>{" "}
              <span className="text-foreground">{a * b}</span>
            </span>
          ) : (
            value || <span className="text-muted-foreground">?</span>
          )}
        </div>

        {phase === "feedback" && showResponseTime && lastMs !== null && (
          <div className="text-xs text-muted-foreground tabular-nums">
            {(lastMs / 1000).toFixed(2)}s {lastCorrect ? "✓" : "✗"}
          </div>
        )}

        {strategy && (
          <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-md p-3 text-left">
            💡 {strategy}
          </p>
        )}
      </div>

      <Numpad
        value={value}
        onChange={setValue}
        onSubmit={submit}
        disabled={phase !== "asking"}
      />
    </div>
  );
}
