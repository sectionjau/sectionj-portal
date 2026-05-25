import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard — Section J Portal" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Look up the profile we created on signup (Phase 2 will use this for full_name, company, etc.)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company, role")
    .eq("id", user!.id)
    .maybeSingle();

  const greeting = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-20">
      <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-4 font-medium">
        Client Portal
      </p>
      <h1 className="text-3xl md:text-5xl leading-tight tracking-tight mb-4 font-normal">
        Welcome, {greeting}.
      </h1>
      <p className="text-sj-muted text-lg max-w-2xl leading-relaxed mb-10">
        Your project dashboard is being set up. Soon you&rsquo;ll see your active projects,
        documents, and design insights here.
      </p>

      <div className="border border-sj-line bg-sj-surface px-6 py-8 md:px-10 md:py-12 max-w-2xl">
        <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-3 font-medium">
          Coming soon
        </p>
        <h2 className="text-xl md:text-2xl font-normal mb-3 tracking-tight">
          NatHERS-powered design insights
        </h2>
        <p className="text-sj-muted text-sm leading-relaxed mb-4">
          Upload a NatHERS certificate and we&rsquo;ll surface the window-to-floor ratios,
          glazing performance by orientation, and room-by-room results that matter most for
          your next design iteration.
        </p>
        <p className="text-xs text-sj-muted">
          Questions? Email{" "}
          <a href="mailto:j.poovely@sectionj.au" className="underline underline-offset-4">
            j.poovely@sectionj.au
          </a>.
        </p>
      </div>

      {profile?.role === "admin" && (
        <p className="mt-10 text-xs uppercase tracking-eyebrow text-sj-muted">
          Signed in as admin. Admin tools arrive in Phase 2.
        </p>
      )}
    </div>
  );
}
