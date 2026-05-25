import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteProject } from "./actions";

export const metadata = { title: "Projects — Section J Admin" };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: projects } = await supabase
    .from("projects")
    .select(`
      id, name, address, project_type, service, status, created_at,
      project_clients ( client_id, profiles ( full_name ) )
    `)
    .order("created_at", { ascending: false });

  const params = await searchParams;

  const statusColour: Record<string, string> = {
    Active:    "text-emerald-700 bg-emerald-50 border-emerald-200",
    "On hold": "text-amber-700 bg-amber-50 border-amber-200",
    Complete:  "text-sj-muted bg-sj-surface border-sj-line",
  };

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-16">
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-2 font-medium">
            Admin
          </p>
          <h1 className="text-3xl md:text-4xl font-normal tracking-tight">Projects</h1>
        </div>
        <Link
          href="/dashboard/admin/projects/new"
          className="bg-sj-fg text-white px-5 py-2.5 text-sm tracking-wide hover:bg-black transition-colors"
        >
          + New project
        </Link>
      </div>

      {params.success && (
        <p className="mb-6 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-3">
          {params.success}
        </p>
      )}
      {params.error && (
        <p className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
          {params.error}
        </p>
      )}

      {!projects?.length ? (
        <div className="border border-sj-line bg-sj-surface px-8 py-12 text-center">
          <p className="text-sj-muted text-sm">No projects yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="border border-sj-line divide-y divide-sj-line">
          {projects.map((p) => {
            const clients = (p.project_clients as { profiles: { full_name: string } | null }[]) ?? [];
            return (
              <div key={p.id} className="px-6 py-5 flex items-center justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="font-medium tracking-tight truncate">{p.name}</p>
                    <span
                      className={`text-[0.65rem] uppercase tracking-eyebrow border px-2 py-0.5 ${statusColour[p.status] ?? ""}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-sj-muted truncate">{p.address}</p>
                  <p className="text-xs text-sj-muted mt-1">
                    {p.project_type} · {p.service}
                    {clients.length > 0 && (
                      <> · {clients.map((c) => c.profiles?.full_name ?? "—").join(", ")}</>
                    )}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteProject(p.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-sj-muted underline underline-offset-4 hover:text-red-600 hover:no-underline transition-colors"
                    onClick={(e) => {
                      if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Delete
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
