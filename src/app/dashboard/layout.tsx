import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-sj-line">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-base md:text-lg font-medium tracking-tight no-underline">
            Section J
          </Link>
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
