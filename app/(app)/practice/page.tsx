import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PracticeClient } from "./PracticeClient";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: { focus?: string; diagnostic?: string };
}) {
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

  if (!profile?.onboarded && !searchParams.diagnostic) redirect("/onboarding");

  const focus = searchParams.focus ? parseInt(searchParams.focus, 10) : null;
  const isDiagnostic = searchParams.diagnostic === "1";

  return (
    <PracticeClient
      focus={Number.isFinite(focus) && focus! >= 1 && focus! <= 10 ? focus : null}
      isDiagnostic={isDiagnostic}
      mode={profile?.mode ?? "kid"}
    />
  );
}
