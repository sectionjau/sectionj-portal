import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-sj-line">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-base md:text-lg font-medium tracking-tight no-underline">
              Section J
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-sj-muted">
              {isAdmin ? (
                <Link
                  href="/dashboard/admin/projects"
                  className="hover:text-sj-fg transition-colors no-underline"
                >
                  Projects
                </Link>
              ) : (
                <Link
                  href="/dashboard/insights"
                  className="hover:text-sj-fg transition-colors no-underline"
                >
                  Glazing insights
                </Link>
              )}
            </nav>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <span className="text-sj-muted hidden sm:inline">{user?.email}</span>
            <form action="/dashboard/logout" method="post">
              <button type="submit" className="underline underline-offset-4 hover:no-underline">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-sj-line px-6 md:px-12 py-6 text-xs text-sj-muted">
        <div className="max-w-6xl mx-auto">
          &copy; {new Date().getFullYear()} Section J Pty Ltd · ACN 684 183 079
        </div>
      </footer>
    </div>
  );
}
