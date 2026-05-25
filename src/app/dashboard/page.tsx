import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "Dashboard — Section J Portal" };

const statusColour: Record<string, string> = {
  Active:    "text-emerald-700 bg-emerald-50 border-emerald-200",
  "On hold": "text-amber-700 bg-amber-50 border-amber-200",
  Complete:  "text-sj-muted bg-sj-surface border-sj-line",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company, role")
    .eq("id", user!.id)
    .maybeSingle();

  const greeting = profile?.full_name?.split(" ")[0] ?? "there";
  const isAdmin = profile?.role === "admin";

  const { data: projectLinks } = await supabase
    .from("project_clients")
    .select("project_id, projects ( id, name, address, project_type, service, status )")
    .eq("client_id", user!.id);

  const projects = (projectLinks ?? [])
    .map((l) => l.projects)
    .filter(Boolean) as {
      id: string;
      name: string;
      address: string;
      project_type: string;
      service: string;
      status: string;
    }[];

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-20">
      <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-4 font-medium">
        Client Portal
      </p>
      <h1 className="text-3xl md:text-5xl leading-tight tracking-tight mb-10 font-normal">
        Welcome, {greeting}.
      </h1>

      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium tracking-tight">Your projects</h2>
        </div>

        {projects.length === 0 ? (
          <div className="border border-sj-line bg-sj-surface px-8 py-12 text-center max-w-2xl">
            <p className="text-sj-muted text-sm leading-relaxed">
              No projects yet. Once Section J has set up your project,
              it will appear here with your documents and insights.
            </p>
            <p className="text-xs text-sj-muted mt-3">
              Questions? Email{" "}
              <a href="mailto:j.poovely@sectionj.au" className="underline underline-offset-4">
                j.poovely@sectionj.au
              </a>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border border-sj-line bg-white p-6 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium tracking-tight leading-snug">{project.name}</h3>
                  <span
                    className={`shrink-0 text-[0.6rem] uppercase tracking-eyebrow border px-2 py-0.5 ${statusColour[project.status] ?? ""}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-sj-muted leading-relaxed">{project.address}</p>
                <p className="text-xs text-sj-muted">
                  {project.project_type} · {project.service}
                </p>
                <div className="mt-auto pt-3 border-t border-sj-line">
                  <p className="text-xs text-sj-muted italic">
                    Design insights coming soon.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-sj-line bg-sj-surface px-6 py-8 md:px-10 md:py-10 max-w-2xl">
        <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-3 font-medium">
          New project
        </p>
        <h2 className="text-xl md:text-2xl font-normal mb-3 tracking-tight">
          Glazing advisor
        </h2>
        <p className="text-sj-muted text-sm leading-relaxed mb-6">
          Upload a dimensioned floor plan and get a window schedule showing
          how much glazing each room can carry — across multiple product tiers —
          to meet Part H6 DTS requirements.
        </p>
        <button
          disabled
          className="bg-sj-fg text-white py-3 px-6 text-sm tracking-wide opacity-40 cursor-not-allowed"
          title="Coming in the next phase"
        >
          Design a new project
        </button>
        <p className="text-xs text-sj-muted mt-3">Available soon.</p>
      </div>

      {isAdmin && (
        <p className="mt-10 text-xs uppercase tracking-eyebrow text-sj-muted">
          Signed in as admin ·{" "}
          <Link href="/dashboard/admin/projects" className="underline underline-offset-4">
            Manage projects
          </Link>
        </p>
      )}
    </div>
  );
}
