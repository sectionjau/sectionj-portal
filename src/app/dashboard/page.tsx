import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "Dashboard — Section J Portal" };

const statusColour: Record<string, string> = {
  Active:    "text-emerald-700 bg-emerald-50 border-emerald-200",
  "On hold": "text-amber-700 bg-amber-50 border-amber-200",
  Complete:  "text-sj-muted bg-sj-surface border-sj-line",
};

type Project = {
  id: string;
  name: string;
  address: string;
  project_type: string;
  service: string;
  status: string;
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

  const projects: Project[] = [];
  for (const link of projectLinks ?? []) {
    const p = link.projects;
    if (!p) continue;
    if (Array.isArray(p)) {
      for (const item of p) projects.push(item as Project);
    } else {
      projects.push(p as unknown as Project);
    }
  }

  const nathersProjects = projects.filter((p) => p.service === "NatHERS");

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-20">
      <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-4 font-medium">
        Client Portal
      </p>
      <h1 className="text-3xl md:text-5xl leading-tight tracking-tight mb-10 font-normal">
        Welcome, {greeting}.
      </h1>

      {/* NatHERS Projects Table */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-1 font-medium">
              Service 1
            </p>
            <h2 className="text-lg font-medium tracking-tight">NatHERS assessments</h2>
          </div>
          {nathersProjects.length > 0 && (
            <Link
              href="/dashboard/insights"
              className="text-xs text-sj-muted underline underline-offset-4 hover:text-sj-fg transition-colors"
            >
              View glazing insights →
            </Link>
          )}
        </div>

        {nathersProjects.length === 0 ? (
          <div className="border border-sj-line bg-sj-surface px-8 py-12 text-center max-w-2xl">
            <p className="text-sj-muted text-sm leading-relaxed">
              No NatHERS projects yet. Once Section J has set up your first assessment,
              it will appear here.
            </p>
            <p className="text-xs text-sj-muted mt-3">
              Questions? Email{" "}
              <a href="mailto:j.poovely@sectionj.au" className="underline underline-offset-4">
                j.poovely@sectionj.au
              </a>
            </p>
          </div>
        ) : (
          <div className="border border-sj-line divide-y divide-sj-line">
            {/* Table header */}
            <div className="px-6 py-3 bg-sj-surface grid grid-cols-[1fr_auto_auto] gap-6 items-center">
              <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted font-medium">Project</p>
              <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted font-medium w-24 text-center">Type</p>
              <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted font-medium w-20 text-right">Status</p>
            </div>
            {/* Rows */}
            {nathersProjects.map((project) => (
              <div
                key={project.id}
                className="px-6 py-4 grid grid-cols-[1fr_auto_auto] gap-6 items-center hover:bg-sj-surface transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium tracking-tight truncate">{project.name}</p>
                  <p className="text-sm text-sj-muted truncate mt-0.5">{project.address}</p>
                </div>
                <p className="text-xs text-sj-muted w-24 text-center">{project.project_type}</p>
                <div className="w-20 flex justify-end">
                  <span
                    className={`text-[0.65rem] uppercase tracking-eyebrow border px-2 py-0.5 ${statusColour[project.status] ?? ""}`}
                  >
                    {project.status}
                  </span>
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
