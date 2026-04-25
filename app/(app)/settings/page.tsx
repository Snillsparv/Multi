import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mode")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <SettingsClient
      email={user.email ?? ""}
      displayName={profile?.display_name ?? ""}
      mode={(profile?.mode as "kid" | "adult") ?? "kid"}
    />
  );
}
