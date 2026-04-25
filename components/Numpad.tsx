"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

const KEYS: (string | "del" | "ok")[] = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "del", "0", "ok",
];

export function Numpad({ value, onChange, onSubmit, disabled }: Props) {
  function press(key: string) {
    if (disabled) return;
    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "ok") {
      if (value.length > 0) onSubmit();
      return;
    }
    if (value.length >= 4) return;
    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2 max-w-sm w-full mx-auto">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          disabled={disabled}
          aria-label={k === "del" ? "Radera" : k === "ok" ? "Skicka svar" : `Siffra ${k}`}
          className={cn(
            "h-16 rounded-lg border bg-background text-2xl font-medium select-none touch-manipulation",
            "active:scale-95 transition-transform",
            "disabled:opacity-50",
            k === "ok" && "bg-primary text-primary-foreground border-primary",
            k === "del" && "bg-secondary"
          )}
        >
          {k === "del" ? <Delete className="mx-auto h-6 w-6" /> : k === "ok" ? "OK" : k}
        </button>
      ))}
    </div>
  );
}
