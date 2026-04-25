"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SettingsClient({
  email,
  displayName: initialDisplayName,
  mode: initialMode,
}: {
  email: string;
  displayName: string;
  mode: "kid" | "adult";
}) {
  const router = useRouter();
  const [name, setName] = useState(initialDisplayName);
  const [mode, setMode] = useState<"kid" | "adult">(initialMode);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    await supabase
      .from("profiles")
      .update({ display_name: name, mode })
      .eq("id", user.id);
    setSaving(false);
    setSavedAt(Date.now());
    router.refresh();
  }

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inställningar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>E-post</Label>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Visningsnamn</Label>
            <Input
              id="displayName"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                  mode === "kid" ? "border-primary bg-primary/10" : "hover:bg-accent"
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
                  mode === "adult" ? "border-primary bg-primary/10" : "hover:bg-accent"
                )}
              >
                <div className="font-semibold">Vuxen</div>
                <div className="text-xs text-muted-foreground">
                  Minimalistiskt, visar tider
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? "Sparar…" : "Spara"}
            </Button>
            {savedAt && (
              <span className="text-xs text-green-600">Sparat ✓</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut}>
            Logga ut
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
