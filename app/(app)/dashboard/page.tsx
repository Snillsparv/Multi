import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Play, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Heatmap } from "@/components/Heatmap";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mode, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded) redirect("/onboarding");

  const [{ data: facts }, { data: streak }] = await Promise.all([
    supabase
      .from("fact_mastery")
      .select("a, b, box")
      .eq("user_id", user.id),
    supabase
      .from("streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const factsList = facts ?? [];
  const avgBox =
    factsList.length > 0
      ? factsList.reduce((s, f) => s + f.box, 0) / factsList.length
      : 0;
  const masteredCount = factsList.filter((f) => f.box >= 4).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Hej {profile.display_name ?? "kompis"}!
        </h1>
        <p className="text-muted-foreground">
          {streak?.current_streak ? (
            <>
              <Flame className="inline h-4 w-4 text-orange-500" />{" "}
              {streak.current_streak} dagar i rad — fortsätt så!
            </>
          ) : (
            <>Dags att börja — en kort övning per dag bygger streak.</>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" /> Starta övning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              20 frågor anpassade efter vad du behöver träna mest.
            </p>
            <Link
              href="/practice"
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              Kör 5 minuter
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" /> Fokusera tabell
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Välj en specifik tabell att öva på.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`/practice?focus=${n}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {n}×
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Din karta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Snittlåda: <strong>{avgBox.toFixed(1)}</strong> / 5</span>
            <span>Bemästrade fakta (låda 4–5): <strong>{masteredCount}</strong> / 100</span>
          </div>
          <Heatmap facts={factsList} />
        </CardContent>
      </Card>
    </div>
  );
}
