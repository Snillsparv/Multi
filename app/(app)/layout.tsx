import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings as SettingsIcon, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
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

  const mode = profile?.mode ?? "kid";

  return (
    <div className={mode === "kid" ? "kid" : ""}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Home className="h-5 w-5" />
              <span>Multiplikation</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/settings"
                aria-label="Inställningar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
              >
                <SettingsIcon className="h-5 w-5" />
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  aria-label="Logga ut"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </nav>
          </div>
        </header>
        <main className="flex-1 container py-6">{children}</main>
      </div>
    </div>
  );
}
