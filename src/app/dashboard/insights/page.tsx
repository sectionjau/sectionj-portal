import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Glazing Insights — Section J Portal" };

// Orientation display order (clockwise from north) and full labels
const ORIENTATION_ORDER = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const ORIENTATION_LABEL: Record<string, string> = {
  N: "North", NE: "North-East", E: "East", SE: "South-East",
  S: "South", SW: "South-West", W: "West", NW: "North-West",
};

// Orientation performance guidance for context
const ORIENTATION_CONTEXT: Record<string, string> = {
  N:  "High solar access in winter. Large glazing can boost passive heating but needs shading control to avoid summer overheating.",
  NE: "Good morning sun. Moderate solar gain — lower overheating risk than north-west.",
  E:  "Morning sun only. Lower peak heat load. Awnings perform well without heavy shading.",
  SE: "Low direct sun. Useful for diffuse light in low-glare rooms.",
  S:  "Minimal direct sun year-round. Glazing here contributes to heat loss — keep areas modest or use higher-performance glass.",
  SW: "Afternoon summer sun — highest overheating risk. Limit area or use low SHGC glass.",
  W:  "Hot afternoon sun. Cooling loads rise quickly. Low SHGC glazing or external shading essential.",
  NW: "Strong afternoon sun, especially in summer. Similar risks to west but with some winter benefit.",
};

type WindowRow = {
  orientation: string;
  room_type: string;
  window_type: string;
  width_mm: number | null;
  height_mm: number | null;
  area_m2: number | null;
  u_value: number | null;
  shgc: number | null;
  glazing_product: string | null;
  climate_zone: string | null;
  star_rating: number | null;
  heating_headroom: number | null;
  cooling_headroom: number | null;
};

export default async function GlazingInsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Get all project IDs for this architect ──────────────────────────────
  const { data: links } = await supabase
    .from("project_clients")
    .select("project_id")
    .eq("client_id", user.id);

  const projectIds = (links ?? []).map((l) => l.project_id);

  // ── Get certificates + windows for those projects ───────────────────────
  const { data: certificates } = projectIds.length
    ? await supabase
        .from("certificates")
        .select(`
          id, star_rating, climate_zone, conditioned_floor_area,
          heating_load, heating_limit, cooling_load, cooling_limit,
          project_id,
          certificate_windows (
            id, label, room_type, orientation, window_type,
            width_mm, height_mm, area_m2, u_value, shgc, glazing_product
          )
        `)
        .in("project_id", projectIds)
    : { data: [] };

  // ── Flatten all windows with certificate context ─────────────────────────
  const allWindows: WindowRow[] = [];
  const climateZones = new Set<string>();
  let totalProjects = 0;

  for (const cert of certificates ?? []) {
    if (!cert.certificate_windows?.length) continue;
    totalProjects++;
    if (cert.climate_zone) climateZones.add(cert.climate_zone);

    const heatingHeadroom =
      cert.heating_load && cert.heating_limit
        ? ((cert.heating_limit - cert.heating_load) / cert.heating_limit) * 100
        : null;
    const coolingHeadroom =
      cert.cooling_load && cert.cooling_limit
        ? ((cert.cooling_limit - cert.cooling_load) / cert.cooling_limit) * 100
        : null;

    for (const w of cert.certificate_windows) {
      allWindows.push({
        orientation: w.orientation ?? "?",
        room_type: w.room_type ?? "other",
        window_type: w.window_type ?? "other",
        width_mm: w.width_mm,
        height_mm: w.height_mm,
        area_m2: w.area_m2,
        u_value: w.u_value,
        shgc: w.shgc,
        glazing_product: w.glazing_product,
        climate_zone: cert.climate_zone,
        star_rating: cert.star_rating,
        heating_headroom: heatingHeadroom,
        cooling_headroom: coolingHeadroom,
      });
    }
  }

  // ── Group by orientation ─────────────────────────────────────────────────
  const byOrientation = new Map<string, WindowRow[]>();
  for (const w of allWindows) {
    if (!byOrientation.has(w.orientation)) byOrientation.set(w.orientation, []);
    byOrientation.get(w.orientation)!.push(w);
  }

  // Sort orientations in compass order, putting unknown at end
  const sortedOrientations = [
    ...ORIENTATION_ORDER.filter((o) => byOrientation.has(o)),
    ...[...byOrientation.keys()].filter((o) => !ORIENTATION_ORDER.includes(o)),
  ];

  // ── Helper: most common value in array ──────────────────────────────────
  function mostCommon<T>(arr: T[]): T | null {
    if (!arr.length) return null;
    const counts = new Map<string, number>();
    for (const v of arr) {
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const [topKey] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return arr.find((v) => String(v) === topKey) ?? null;
  }

  function avg(nums: (number | null)[]): number | null {
    const valid = nums.filter((n): n is number => n !== null);
    if (!valid.length) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (allWindows.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-16">
        <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-2 font-medium">
          Service 1 · NatHERS
        </p>
        <h1 className="text-3xl md:text-4xl font-normal tracking-tight mb-10">Glazing Insights</h1>
        <div className="border border-sj-line bg-sj-surface px-8 py-12 text-center max-w-2xl">
          <p className="text-sj-muted text-sm leading-relaxed">
            No certificate data yet. Insights will appear here once Section J uploads
            NatHERS certificates for your completed projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-16">
      {/* Header */}
      <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-2 font-medium">
        Service 1 · NatHERS
      </p>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight mb-3">Glazing Insights</h1>
      <p className="text-sj-muted text-sm mb-10 max-w-xl">
        Patterns drawn from your NatHERS-certified projects. Each new certificate refines the picture.
      </p>

      {/* Summary strip */}
      <div className="border border-sj-line bg-sj-surface px-6 py-5 mb-10 grid grid-cols-3 gap-6">
        <div>
          <p className="text-2xl font-light tracking-tight">{totalProjects}</p>
          <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mt-1">
            {totalProjects === 1 ? "Project analysed" : "Projects analysed"}
          </p>
        </div>
        <div>
          <p className="text-2xl font-light tracking-tight">{allWindows.length}</p>
          <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mt-1">Windows extracted</p>
        </div>
        <div>
          <p className="text-2xl font-light tracking-tight">{climateZones.size}</p>
          <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mt-1">
            {climateZones.size === 1 ? "Climate zone" : "Climate zones"}
          </p>
        </div>
      </div>

      {/* Climate zones */}
      {climateZones.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {[...climateZones].map((zone) => (
            <span key={zone} className="text-[0.65rem] uppercase tracking-eyebrow border border-sj-line bg-sj-surface px-3 py-1">
              Zone {zone}
            </span>
          ))}
        </div>
      )}

      {/* Orientation breakdown */}
      <h2 className="text-lg font-medium tracking-tight mb-6">By orientation</h2>
      <div className="space-y-6">
        {sortedOrientations.map((orientation) => {
          const windows = byOrientation.get(orientation)!;

          // Room type counts
          const roomCounts = new Map<string, number>();
          for (const w of windows) {
            roomCounts.set(w.room_type, (roomCounts.get(w.room_type) ?? 0) + 1);
          }
          const roomsSorted = [...roomCounts.entries()].sort((a, b) => b[1] - a[1]);

          // Size range
          const widths = windows.map((w) => w.width_mm).filter((n): n is number => n !== null);
          const minWidth = widths.length ? Math.min(...widths) : null;
          const maxWidth = widths.length ? Math.max(...widths) : null;

          // Typical product
          const topProduct = mostCommon(windows.map((w) => w.glazing_product).filter(Boolean));
          const topSHGC = mostCommon(windows.map((w) => w.shgc).filter((n): n is number => n !== null));
          const topUValue = mostCommon(windows.map((w) => w.u_value).filter((n): n is number => n !== null));
          const topType = mostCommon(windows.map((w) => w.window_type).filter(Boolean));

          // Average headroom
          const avgHeating = avg(windows.map((w) => w.heating_headroom));
          const avgCooling = avg(windows.map((w) => w.cooling_headroom));

          return (
            <div key={orientation} className="border border-sj-line">
              {/* Orientation header */}
              <div className="px-6 py-4 border-b border-sj-line flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 border border-sj-line bg-sj-fg text-white flex items-center justify-center text-sm font-medium shrink-0">
                    {orientation}
                  </div>
                  <div>
                    <p className="font-medium tracking-tight">{ORIENTATION_LABEL[orientation] ?? orientation}</p>
                    <p className="text-xs text-sj-muted mt-0.5">{windows.length} {windows.length === 1 ? "window" : "windows"}</p>
                  </div>
                </div>
                {/* Headroom pills */}
                <div className="flex gap-3">
                  {avgHeating !== null && (
                    <div className="text-center">
                      <p className="text-xs font-medium text-emerald-700">{avgHeating.toFixed(0)}% under</p>
                      <p className="text-[0.6rem] uppercase tracking-eyebrow text-sj-muted">heating limit</p>
                    </div>
                  )}
                  {avgCooling !== null && (
                    <div className="text-center">
                      <p className="text-xs font-medium text-emerald-700">{avgCooling.toFixed(0)}% under</p>
                      <p className="text-[0.6rem] uppercase tracking-eyebrow text-sj-muted">cooling limit</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left: glazing specs */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-2">Glazing used</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-eyebrow text-sj-muted mb-0.5">Width range</p>
                        <p className="text-sm font-medium">
                          {minWidth === maxWidth
                            ? `${minWidth} mm`
                            : `${minWidth}–${maxWidth} mm`}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-eyebrow text-sj-muted mb-0.5">Type</p>
                        <p className="text-sm font-medium capitalize">{topType ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-eyebrow text-sj-muted mb-0.5">U-value</p>
                        <p className="text-sm font-medium">{topUValue ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-eyebrow text-sj-muted mb-0.5">SHGC</p>
                        <p className="text-sm font-medium">{topSHGC ?? "—"}</p>
                      </div>
                    </div>
                    {topProduct && (
                      <p className="text-xs text-sj-muted mt-3">
                        Product: <span className="font-medium text-sj-fg">{topProduct}</span>
                      </p>
                    )}
                  </div>

                  {/* Room types */}
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-eyebrow text-sj-muted mb-2">Room types</p>
                    <div className="flex flex-wrap gap-2">
                      {roomsSorted.map(([room, count]) => (
                        <span
                          key={room}
                          className="text-[0.65rem] border border-sj-line bg-sj-surface px-2 py-0.5 capitalize"
                        >
                          {room} {count > 1 ? `×${count}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: context */}
                <div className="border-l border-sj-line pl-6">
                  <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-2">Design context</p>
                  <p className="text-sm text-sj-muted leading-relaxed">
                    {ORIENTATION_CONTEXT[orientation] ?? "No guidance available for this orientation."}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-xs text-sj-muted">
        Insights update automatically as Section J uploads certificates for new projects.
      </p>
    </div>
  );
}
