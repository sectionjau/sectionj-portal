import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CertificateUploadForm from "./CertificateUploadForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminProjectDetailPage({ params }: Props) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch project + certificate via admin client
  const adminClient = createAdminClient();

  const { data: project } = await adminClient
    .from("projects")
    .select("id, name, address, project_type, service, status, notes, created_at")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard/admin/projects");

  const { data: certificate } = await adminClient
    .from("certificates")
    .select(`
      id, star_rating, whole_of_home_score, whole_of_home_no_solar,
      climate_zone, conditioned_floor_area,
      heating_load, heating_limit, cooling_load, cooling_limit,
      greenhouse_with_solar, greenhouse_without_solar,
      solar_pv_kw, solar_generation_kwh,
      wall_r_value, ceiling_r_value, floor_r_value,
      hot_water_type, ai_summary, created_at,
      certificate_windows ( id, label, room_type, orientation, window_type, width_mm, height_mm, area_m2, glazing_product, u_value, shgc )
    `)
    .eq("project_id", id)
    .maybeSingle();

  const statusColour: Record<string, string> = {
    Active: "text-emerald-700 bg-emerald-50 border-emerald-200",
    "On hold": "text-amber-700 bg-amber-50 border-amber-200",
    Complete: "text-sj-muted bg-sj-surface border-sj-line",
  };

  const headroom = (load: number | null, limit: number | null) => {
    if (!load || !limit) return null;
    return (((limit - load) / limit) * 100).toFixed(1);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-16">
      {/* Back */}
      <Link
        href="/dashboard/admin/projects"
        className="text-xs text-sj-muted underline underline-offset-4 hover:text-sj-fg transition-colors"
      >
        ← All projects
      </Link>

      {/* Header */}
      <div className="mt-6 mb-10 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-2 font-medium">
            Admin · {project.service}
          </p>
          <h1 className="text-3xl md:text-4xl font-normal tracking-tight mb-1">{project.name}</h1>
          <p className="text-sj-muted">{project.address}</p>
        </div>
        <span
          className={`text-[0.65rem] uppercase tracking-eyebrow border px-3 py-1 mt-1 ${statusColour[project.status] ?? ""}`}
        >
          {project.status}
        </span>
      </div>

      {/* Project meta */}
      <div className="border border-sj-line bg-sj-surface px-6 py-5 mb-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div>
          <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-1">Type</p>
          <p className="text-sm">{project.project_type}</p>
        </div>
        <div>
          <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-1">Service</p>
          <p className="text-sm">{project.service}</p>
        </div>
        <div>
          <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-1">Created</p>
          <p className="text-sm">{new Date(project.created_at).toLocaleDateString("en-AU")}</p>
        </div>
        {project.notes && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-1">Notes</p>
            <p className="text-sm text-sj-muted">{project.notes}</p>
          </div>
        )}
      </div>

      {/* ── Certificate section ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium tracking-tight">NatHERS Certificate</h2>
        </div>

        {/* Upload form */}
        <div className="border border-sj-line p-6 mb-8">
          <CertificateUploadForm projectId={id} hasCertificate={!!certificate} />
        </div>

        {/* Extracted data */}
        {certificate && (
          <div className="space-y-8">
            {/* AI Summary */}
            {certificate.ai_summary && (
              <div className="border-l-2 border-sj-fg pl-5 py-1">
                <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-2">AI Summary</p>
                <p className="text-sm leading-relaxed">{certificate.ai_summary}</p>
              </div>
            )}

            {/* Headline scores */}
            <div>
              <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-4">Performance</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="border border-sj-line p-4 text-center">
                  <p className="text-3xl font-light tracking-tight">{certificate.star_rating ?? "—"}</p>
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mt-1">Stars</p>
                </div>
                <div className="border border-sj-line p-4 text-center">
                  <p className="text-3xl font-light tracking-tight">{certificate.whole_of_home_score ?? "—"}</p>
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mt-1">Whole of Home</p>
                </div>
                <div className="border border-sj-line p-4 text-center">
                  <p className="text-3xl font-light tracking-tight">{certificate.conditioned_floor_area ?? "—"}</p>
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mt-1">m² conditioned</p>
                </div>
                <div className="border border-sj-line p-4 text-center">
                  <p className="text-3xl font-light tracking-tight">{certificate.climate_zone?.split(" ")[0] ?? "—"}</p>
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mt-1">Climate zone</p>
                </div>
              </div>
            </div>

            {/* Thermal loads */}
            <div>
              <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-4">Thermal loads</p>
              <div className="border border-sj-line divide-y divide-sj-line">
                <div className="px-5 py-3 grid grid-cols-4 gap-4 bg-sj-surface">
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted">Load</p>
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted text-right">Actual (MJ/m²)</p>
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted text-right">Limit (MJ/m²)</p>
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted text-right">Headroom</p>
                </div>
                <div className="px-5 py-3 grid grid-cols-4 gap-4">
                  <p className="text-sm">Heating</p>
                  <p className="text-sm text-right">{certificate.heating_load ?? "—"}</p>
                  <p className="text-sm text-right">{certificate.heating_limit ?? "—"}</p>
                  <p className="text-sm text-right text-emerald-700">
                    {headroom(certificate.heating_load, certificate.heating_limit)
                      ? `${headroom(certificate.heating_load, certificate.heating_limit)}% under`
                      : "—"}
                  </p>
                </div>
                <div className="px-5 py-3 grid grid-cols-4 gap-4">
                  <p className="text-sm">Cooling</p>
                  <p className="text-sm text-right">{certificate.cooling_load ?? "—"}</p>
                  <p className="text-sm text-right">{certificate.cooling_limit ?? "—"}</p>
                  <p className="text-sm text-right text-emerald-700">
                    {headroom(certificate.cooling_load, certificate.cooling_limit)
                      ? `${headroom(certificate.cooling_load, certificate.cooling_limit)}% under`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Window schedule */}
            {certificate.certificate_windows && certificate.certificate_windows.length > 0 && (
              <div>
                <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-4">
                  Window schedule ({certificate.certificate_windows.length} windows)
                </p>
                <div className="border border-sj-line divide-y divide-sj-line overflow-x-auto">
                  <div className="px-5 py-3 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 bg-sj-surface min-w-[640px]">
                    {["Label", "Room", "Orient.", "Type", "W × H (mm)", "U-value", "SHGC"].map((h) => (
                      <p key={h} className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted">{h}</p>
                    ))}
                  </div>
                  {certificate.certificate_windows.map((w) => (
                    <div
                      key={w.id}
                      className="px-5 py-3 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 items-center min-w-[640px]"
                    >
                      <p className="text-sm truncate">{w.label}</p>
                      <p className="text-sm capitalize text-sj-muted">{w.room_type}</p>
                      <p className="text-sm text-sj-muted">{w.orientation}</p>
                      <p className="text-sm capitalize text-sj-muted">{w.window_type}</p>
                      <p className="text-sm text-sj-muted">
                        {w.width_mm} × {w.height_mm}
                      </p>
                      <p className="text-sm text-sj-muted">{w.u_value}</p>
                      <p className="text-sm text-sj-muted">{w.shgc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Construction */}
            <div>
              <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-4">Construction</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Wall R-value", value: certificate.wall_r_value },
                  { label: "Ceiling R-value", value: certificate.ceiling_r_value },
                  { label: "Floor R-value", value: certificate.floor_r_value },
                  { label: "Hot water", value: certificate.hot_water_type },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-sj-line p-4">
                    <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-1">{label}</p>
                    <p className="text-sm font-medium">{value ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
