"use client";

import { create } from "zustand";

export type SessionMode = "diagnostic" | "practice" | "flow";

export type Question = { a: number; b: number };

export type SessionAttempt = {
  a: number;
  b: number;
  given_answer: number | null;
  correct: boolean;
  response_ms: number;
};

type SessionState = {
  sessionId: string | null;
  mode: SessionMode | null;
  queue: Question[];
  index: number;
  attempts: SessionAttempt[];
  startQuestionAt: number | null;

  start: (sessionId: string, mode: SessionMode, queue: Question[]) => void;
  markStart: () => void;
  recordAttempt: (attempt: SessionAttempt) => void;
  next: () => void;
  reset: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  mode: null,
  queue: [],
  index: 0,
  attempts: [],
  startQuestionAt: null,

  start: (sessionId, mode, queue) =>
    set({
      sessionId,
      mode,
      queue,
      index: 0,
      attempts: [],
      startQuestionAt: Date.now(),
    }),

  markStart: () => set({ startQuestionAt: Date.now() }),

  recordAttempt: (attempt) =>
    set((state) => ({ attempts: [...state.attempts, attempt] })),

  next: () =>
    set((state) => ({
      index: state.index + 1,
      startQuestionAt: Date.now(),
    })),

  reset: () =>
    set({
      sessionId: null,
      mode: null,
      queue: [],
      index: 0,
      attempts: [],
      startQuestionAt: null,
    }),
}));
