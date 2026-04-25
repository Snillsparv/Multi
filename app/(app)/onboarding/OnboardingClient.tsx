"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";
import { buildDiagnosticQueue } from "@/lib/leitner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "details" | "ready";

export function OnboardingClient({
  initialName,
  initialMode,
}: {
  initialName: string;
  initialMode: "kid" | "adult";
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState(initialName);
  const [mode, setMode] = useState<"kid" | "adult">(initialMode);
  const [saving, setSaving] = useState(false);
  const start = useSessionStore((s) => s.start);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: name, mode });
    setSaving(false);
    setStep("ready");
  }

  async function startDiagnostic() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({ user_id: user.id, mode: "diagnostic" })
      .select()
      .single();
    if (error || !session) {
      setSaving(false);
      return;
    }
    start(session.id, "diagnostic", buildDiagnosticQueue(30));
    router.push("/practice?diagnostic=1");
  }

  if (step === "details") {
    return (
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Välkommen!</CardTitle>
            <CardDescription>Berätta lite om dig så ställer vi in appen.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveDetails}>
              <div className="space-y-2">
                <Label htmlFor="name">Vad heter du?</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ditt namn"
                />
              </div>
              <div className="space-y-2">
                <Label>Läge</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("kid")}
                    className={cn(
                      "rounded-md border p-4 text-left transition-colors",
                      mode === "kid"
                        ? "border-primary bg-primary/10"
                        : "hover:bg-accent"
                    )}
                  >
                    <div className="font-semibold">Barn</div>
                    <div className="text-xs text-muted-foreground">
                      Stora knappar, glada färger
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("adult")}
                    className={cn(
                      "rounded-md border p-4 text-left transition-colors",
                      mode === "adult"
                        ? "border-primary bg-primary/10"
                        : "hover:bg-accent"
                    )}
                  >
                    <div className="font-semibold">Vuxen</div>
                    <div className="text-xs text-muted-foreground">
                      Minimalistiskt, visar tider
                    </div>
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={saving}>
                {saving ? "Sparar…" : "Gå vidare"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Diagnostiskt test</CardTitle>
          <CardDescription>
            30 blandade frågor från tabellerna 1–10. Vi använder svaren för att bygga din personliga övning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Stressa inte — det här är inget prov. Svara så snabbt och rätt du kan.</p>
          <Button size="lg" className="w-full" onClick={startDiagnostic} disabled={saving}>
            {saving ? "Startar…" : "Starta diagnostiskt test"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
