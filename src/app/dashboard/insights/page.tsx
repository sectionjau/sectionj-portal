import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Glazing Insights — Section J Portal" };

// ─── Climate zone benchmarks ──────────────────────────────────────────────────
// Glazing ratio = (total glazing area on this orientation / conditioned floor area) × 100
// shgcCritical: 'min' = want high SHGC, 'max' = want low SHGC, 'none' = U-value matters more
type Benchmark = {
  ratioMin: number;   // % of floor area — below this is conservative
  ratioMax: number;   // % of floor area — above this needs review
  shgcIdealMin: number;
  shgcIdealMax: number;
  shgcCritical: "min" | "max" | "range" | "none";
  // Approximate cooling load contribution per m² of glazing (MJ/m²/yr), SHGC ~0.5
  coolingFactor: number;
  // Approximate heating load contribution per m² of glazing (MJ/m²/yr), SHGC ~0.5 (negative = helps heating)
  heatingFactor: number;
};

// Zone 62 — Melbourne area (temperate, heating-dominated)
const ZONE_62: Record<string, Benchmark> = {
  N:  { ratioMin: 5,  ratioMax: 15, shgcIdealMin: 0.4,  shgcIdealMax: 1.0,  shgcCritical: "min",   coolingFactor: 1.0, heatingFactor: -2.5 },
  NE: { ratioMin: 3,  ratioMax: 8,  shgcIdealMin: 0.35, shgcIdealMax: 0.6,  shgcCritical: "range", coolingFactor: 2.0, heatingFactor: -1.5 },
  E:  { ratioMin: 2,  ratioMax: 7,  shgcIdealMin: 0.3,  shgcIdealMax: 0.6,  shgcCritical: "range", coolingFactor: 3.0, heatingFactor: -0.5 },
  SE: { ratioMin: 1,  ratioMax: 5,  shgcIdealMin: 0.0,  shgcIdealMax: 0.6,  shgcCritical: "none",  coolingFactor: 1.5, heatingFactor:  0.5 },
  S:  { ratioMin: 1,  ratioMax: 4,  shgcIdealMin: 0.0,  shgcIdealMax: 0.6,  shgcCritical: "none",  coolingFactor: 0.5, heatingFactor:  1.5 },
  SW: { ratioMin: 1,  ratioMax: 4,  shgcIdealMin: 0.0,  shgcIdealMax: 0.35, shgcCritical: "max",   coolingFactor: 3.5, heatingFactor:  0.5 },
  W:  { ratioMin: 1,  ratioMax: 4,  shgcIdealMin: 0.0,  shgcIdealMax: 0.3,  shgcCritical: "max",   coolingFactor: 4.5, heatingFactor:  0.5 },
  NW: { ratioMin: 2,  ratioMax: 6,  shgcIdealMin: 0.0,  shgcIdealMax: 0.4,  shgcCritical: "max",   coolingFactor: 3.5, heatingFactor: -1.0 },
};

// Default fallback for other zones (neutral guidance)
const DEFAULT_BENCHMARK: Benchmark = {
  ratioMin: 2, ratioMax: 10, shgcIdealMin: 0.2, shgcIdealMax: 0.6,
  shgcCritical: "range", coolingFactor: 2.5, heatingFactor: 0,
};

function getBenchmarks(zoneStr: string | null): Record<string, Benchmark> {
  const num = parseInt((zoneStr ?? "").split(/[\s-]/)[0]);
  if (num === 62 || num === 63 || num === 64) return ZONE_62;
  // Could add other zones here
  return ZONE_62; // reasonable default for now
}

function assessRatio(ratio: number, b: Benchmark): "conservative" | "optimal" | "heavy" {
  if (ratio < b.ratioMin) return "conservative";
  if (ratio > b.ratioMax) return "heavy";
  return "optimal";
}

function assessSHGC(shgc: number, b: Benchmark): "good" | "review" | "concern" {
  if (b.shgcCritical === "none") return "good";
  if (b.shgcCritical === "min") {
    if (shgc >= b.shgcIdealMin) return "good";
    if (shgc >= b.shgcIdealMin - 0.1) return "review";
    return "concern";
  }
  if (b.shgcCritical === "max") {
    if (shgc <= b.shgcIdealMax) return "good";
    if (shgc <= b.shgcIdealMax + 0.1) return "review";
    return "concern";
  }
  // range
  if (shgc >= b.shgcIdealMin && shgc <= b.shgcIdealMax) return "good";
  return "review";
}

const SHGC_LABEL: Record<string, { label: string; colour: string }> = {
  good:    { label: "Appropriate",    colour: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  review:  { label: "Review",         colour: "text-amber-700 bg-amber-50 border-amber-200" },
  concern: { label: "Concern",        colour: "text-red-700 bg-red-50 border-red-200" },
};

const RATIO_LABEL: Record<string, { label: string; colour: string; detail: string }> = {
  conservative: {
    label: "Conservative",
    colour: "text-sky-700 bg-sky-50 border-sky-200",
    detail: "You have room to increase glazing on this face.",
  },
  optimal: {
    label: "Optimal",
    colour: "text-emerald-700 bg-emerald-50 border-emerald-200",
    detail: "Glazing area is well-balanced for this orientation.",
  },
  heavy: {
    label: "Review",
    colour: "text-amber-700 bg-amber-50 border-amber-200",
    detail: "Glazing area is above the typical optimal range — check headroom.",
  },
};

const SHGC_GUIDANCE: Record<string, Record<string, string>> = {
  N: {
    good:    "High SHGC on north is ideal in zone 62 — you're capturing winter solar gain effectively.",
    review:  "SHGC is slightly below optimal for north. You may be limiting passive heating unnecessarily.",
    concern: "Low SHGC on north-facing glazing blocks valuable winter sun. Consider a higher-SHGC product.",
  },
  E: {
    good:    "SHGC is well-suited for east glazing — balanced morning solar access without excessive gain.",
    review:  "SHGC sits outside the optimal range for east-facing glass. Minor adjustment may improve performance.",
    concern: "SHGC choice for east glazing may be costing thermal performance. Review product selection.",
  },
  W: {
    good:    "Low SHGC on west is the right call — protecting against afternoon overheating.",
    review:  "SHGC is slightly high for west-facing glass. Risk of cooling load pressure on warm days.",
    concern: "SHGC is too high for west-facing glazing in zone 62. This is likely contributing to cooling load.",
  },
  SW: {
    good:    "SHGC is appropriately low for this high-risk orientation.",
    review:  "SHGC is borderline for south-west glazing. Consider a lower-SHGC product.",
    concern: "SHGC is too high for south-west — this is the second-highest overheating risk after west.",
  },
  NW: {
    good:    "SHGC is controlled for this afternoon-sun orientation.",
    review:  "SHGC is slightly elevated for north-west. Monitor cooling load as project count grows.",
    concern: "SHGC is too high for north-west glazing — strong afternoon exposure in summer.",
  },
  NE: {
    good:    "SHGC is within the right range for north-east — morning sun with manageable gain.",
    review:  "SHGC is outside the optimal range for north-east glazing.",
    concern: "SHGC needs attention on this orientation.",
  },
  SE: {
    good:    "South-east glazing has low direct sun exposure — SHGC is not the critical variable here.",
    review:  "South-east glazing — focus on U-value rather than SHGC for this orientation.",
    concern: "South-east glazing — focus on U-value rather than SHGC for this orientation.",
  },
  S: {
    good:    "South-facing glazing receives minimal direct sun — U-value is your main performance lever here.",
    review:  "South-facing glazing — U-value matters more than SHGC on this orientation.",
    concern: "South-facing glazing — U-value matters more than SHGC on this orientation.",
  },
};

const ORIENTATION_ORDER = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const ORIENTATION_FULL: Record<string, string> = {
  N: "North", NE: "North-East", E: "East", SE: "South-East",
  S: "South", SW: "South-West", W: "West", NW: "North-West",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GlazingInsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: links } = await supabase
    .from("project_clients")
    .select("project_id")
    .eq("client_id", user.id);

  const projectIds = (links ?? []).map((l) => l.project_id);

  const { data: certificates } = projectIds.length
    ? await supabase
        .from("certificates")
        .select(`
          id, star_rating, climate_zone, conditioned_floor_area,
          heating_load, heating_limit, cooling_load, cooling_limit,
          certificate_windows (
            orientation, room_type, window_type,
            width_mm, height_mm, area_m2, u_value, shgc, glazing_product
          )
        `)
        .in("project_id", projectIds)
    : { data: [] };

  // ── Aggregate data ───────────────────────────────────────────────────────────
  type OrientationData = {
    windows: { room_type: string; window_type: string; area_m2: number; shgc: number; u_value: number }[];
    totalArea: number;
    avgSHGC: number;
    avgUValue: number;
    topRoomType: string;
  };

  const byOrientation = new Map<string, OrientationData>();
  const climateZones = new Set<string>();
  let totalFloorArea = 0;
  let totalProjects = 0;
  let primaryZone: string | null = null;

  // Heating/cooling headroom (average across all certs)
  let totalHeatingHeadroom = 0;
  let totalCoolingHeadroom = 0;
  let heatingAbsolute = 0; // MJ/m² available
  let coolingAbsolute = 0;
  let certCount = 0;

  for (const cert of certificates ?? []) {
    if (!cert.certificate_windows?.length) continue;
    totalProjects++;
    if (cert.climate_zone) { climateZones.add(cert.climate_zone); primaryZone = cert.climate_zone; }
    if (cert.conditioned_floor_area) totalFloorArea += cert.conditioned_floor_area;

    if (cert.heating_load && cert.heating_limit) {
      totalHeatingHeadroom += ((cert.heating_limit - cert.heating_load) / cert.heating_limit) * 100;
      heatingAbsolute += cert.heating_limit - cert.heating_load;
    }
    if (cert.cooling_load && cert.cooling_limit) {
      totalCoolingHeadroom += ((cert.cooling_limit - cert.cooling_load) / cert.cooling_limit) * 100;
      coolingAbsolute += cert.cooling_limit - cert.cooling_load;
    }
    certCount++;

    for (const w of cert.certificate_windows) {
      if (!w.orientation) continue;
      const area = w.area_m2 ?? (w.width_mm && w.height_mm ? (w.width_mm * w.height_mm) / 1_000_000 : 0);
      if (!byOrientation.has(w.orientation)) {
        byOrientation.set(w.orientation, { windows: [], totalArea: 0, avgSHGC: 0, avgUValue: 0, topRoomType: "" });
      }
      const d = byOrientation.get(w.orientation)!;
      d.windows.push({ room_type: w.room_type ?? "other", window_type: w.window_type ?? "other", area_m2: area, shgc: w.shgc ?? 0, u_value: w.u_value ?? 0 });
      d.totalArea += area;
    }
  }

  // Compute averages per orientation
  for (const [, d] of byOrientation) {
    d.avgSHGC = d.windows.reduce((sum, w) => sum + w.shgc, 0) / d.windows.length;
    d.avgUValue = d.windows.reduce((sum, w) => sum + w.u_value, 0) / d.windows.length;
    // Most common room type
    const roomCounts = new Map<string, number>();
    for (const w of d.windows) roomCounts.set(w.room_type, (roomCounts.get(w.room_type) ?? 0) + 1);
    d.topRoomType = [...roomCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }

  const avgHeatingHeadroom = certCount ? totalHeatingHeadroom / certCount : 0;
  const avgCoolingHeadroom = certCount ? totalCoolingHeadroom / certCount : 0;
  const avgHeatingAbsolute = certCount ? heatingAbsolute / certCount : 0;
  const avgCoolingAbsolute = certCount ? coolingAbsolute / certCount : 0;
  const avgFloorArea = totalProjects ? totalFloorArea / totalProjects : 0;

  const benchmarks = getBenchmarks(primaryZone);
  const sortedOrientations = ORIENTATION_ORDER.filter((o) => byOrientation.has(o));
  const totalWindows = [...byOrientation.values()].reduce((n, d) => n + d.windows.length, 0);

  // ── Design freedom: additional m² capacity per orientation ────────────────
  // Additional glazing = available headroom (MJ/m²) / cooling factor for that orientation
  // Only applies where cooling headroom exists
  function additionalGlazingCapacity(orientation: string): number | null {
    const b = benchmarks[orientation];
    if (!b || avgCoolingAbsolute <= 0) return null;
    const shgcScale = 0.5; // normalised to SHGC 0.5 reference
    return parseFloat((avgCoolingAbsolute / (b.coolingFactor * shgcScale)).toFixed(1));
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (totalWindows === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-16">
        <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-2 font-medium">Service 1 · NatHERS</p>
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
      <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-2 font-medium">Service 1 · NatHERS</p>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight mb-3">Glazing Insights</h1>
      <p className="text-sm text-sj-muted mb-2 max-w-xl">
        Analysis drawn from {totalProjects} {totalProjects === 1 ? "project" : "projects"}, {totalWindows} windows
        {primaryZone ? ` · Climate zone ${primaryZone.split(/[\s-]/)[0]}` : ""}.
      </p>
      <p className="text-xs text-sj-muted mb-10 max-w-xl">
        Additional glazing capacity figures are estimates based on zone 62 solar heat gain factors. Use as design direction, not compliance calculation.
      </p>

      {/* ── Question 1: How am I using glazing? ─────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-lg font-medium tracking-tight mb-1">How am I using glazing?</h2>
        <p className="text-sm text-sj-muted mb-6">
          Glazing area on each orientation as a percentage of conditioned floor area, compared to the optimal range for zone 62.
        </p>

        <div className="border border-sj-line divide-y divide-sj-line">
          {/* Header row */}
          <div className="px-5 py-3 bg-sj-surface grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center">
            {["Orientation", "Windows", "Glazing area", "% of floor area", "Assessment"].map((h) => (
              <p key={h} className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted">{h}</p>
            ))}
          </div>

          {sortedOrientations.map((o) => {
            const d = byOrientation.get(o)!;
            const b = benchmarks[o] ?? DEFAULT_BENCHMARK;
            const ratio = avgFloorArea > 0 ? (d.totalArea / avgFloorArea) * 100 : 0;
            const assessment = assessRatio(ratio, b);
            const { label, colour, detail } = RATIO_LABEL[assessment];

            return (
              <div key={o}>
                <div className="px-5 py-4 grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-sj-fg text-white flex items-center justify-center text-xs font-medium shrink-0">
                      {o}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ORIENTATION_FULL[o] ?? o}</p>
                      <p className="text-xs text-sj-muted capitalize">{d.topRoomType}</p>
                    </div>
                  </div>
                  <p className="text-sm">{d.windows.length}</p>
                  <p className="text-sm">{d.totalArea.toFixed(2)} m²</p>
                  <div>
                    <p className="text-sm font-medium">{ratio.toFixed(1)}%</p>
                    <p className="text-[0.6rem] text-sj-muted">optimal {b.ratioMin}–{b.ratioMax}%</p>
                  </div>
                  <span className={`text-[0.65rem] uppercase tracking-eyebrow border px-2 py-0.5 w-fit ${colour}`}>
                    {label}
                  </span>
                </div>
                <div className="px-5 pb-3 ml-11">
                  <p className="text-xs text-sj-muted">{detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Question 2: Is my SHGC appropriate? ─────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-lg font-medium tracking-tight mb-1">Is my SHGC selection working?</h2>
        <p className="text-sm text-sj-muted mb-6">
          SHGC (Solar Heat Gain Coefficient) needs to be tuned to each orientation — what's right for north can be wrong for west.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedOrientations.map((o) => {
            const d = byOrientation.get(o)!;
            const b = benchmarks[o] ?? DEFAULT_BENCHMARK;
            const assessment = assessSHGC(d.avgSHGC, b);
            const { label, colour } = SHGC_LABEL[assessment];
            const guidance = SHGC_GUIDANCE[o]?.[assessment] ?? "";

            return (
              <div key={o} className="border border-sj-line p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-sj-fg text-white flex items-center justify-center text-xs font-medium shrink-0">
                      {o}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ORIENTATION_FULL[o] ?? o}</p>
                      <p className="text-xs text-sj-muted">
                        SHGC {d.avgSHGC.toFixed(2)} · U-value {d.avgUValue.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[0.65rem] uppercase tracking-eyebrow border px-2 py-0.5 ${colour}`}>
                    {label}
                  </span>
                </div>
                {guidance && <p className="text-xs text-sj-muted leading-relaxed">{guidance}</p>}
                {b.shgcCritical !== "none" && (
                  <p className="text-[0.6rem] text-sj-muted mt-2">
                    Recommended: SHGC {b.shgcCritical === "min" ? `≥ ${b.shgcIdealMin}` : b.shgcCritical === "max" ? `≤ ${b.shgcIdealMax}` : `${b.shgcIdealMin}–${b.shgcIdealMax}`}
                  </p>
                )}
                {b.shgcCritical === "none" && (
                  <p className="text-[0.6rem] text-sj-muted mt-2">
                    U-value is the primary lever on this orientation — target U ≤ 2.0 for best performance.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Question 3: How much design freedom do I have? ──────────────────── */}
      <section className="mb-10">
        <h2 className="text-lg font-medium tracking-tight mb-1">How much design freedom do I have?</h2>
        <p className="text-sm text-sj-muted mb-6">
          Based on {certCount === 1 ? "this project's" : "your projects'"} thermal loads, here is the remaining headroom — and what it means in practical glazing terms.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Heating headroom */}
          <div className="border border-sj-line p-6">
            <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-3">Heating headroom</p>
            <p className="text-4xl font-light tracking-tight mb-1">{avgHeatingHeadroom.toFixed(0)}%</p>
            <p className="text-sm text-sj-muted mb-4">{avgHeatingAbsolute.toFixed(1)} MJ/m² below the heating limit</p>
            <div className="border-t border-sj-line pt-4">
              <p className="text-xs text-sj-muted leading-relaxed">
                {avgHeatingHeadroom > 20
                  ? `You have a comfortable heating buffer. Adding more north-facing glazing (approximately ${additionalGlazingCapacity("N") ?? "—"} m² estimated capacity) could further improve passive heating without risk.`
                  : avgHeatingHeadroom > 5
                  ? "Heating headroom is adequate. North glazing is well-deployed but there is limited room to expand further without detailed modelling."
                  : "Heating load is close to the limit. Prioritise insulation improvements before adding more glazing."}
              </p>
            </div>
          </div>

          {/* Cooling headroom */}
          <div className="border border-sj-line p-6">
            <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-3">Cooling headroom</p>
            <p className="text-4xl font-light tracking-tight mb-1">{avgCoolingHeadroom.toFixed(0)}%</p>
            <p className="text-sm text-sj-muted mb-4">{avgCoolingAbsolute.toFixed(1)} MJ/m² below the cooling limit</p>
            <div className="border-t border-sj-line pt-4">
              <p className="text-xs text-sj-muted leading-relaxed">
                {avgCoolingHeadroom > 30
                  ? `Strong cooling buffer. This gives you meaningful flexibility — estimated additional glazing capacity: east ~${additionalGlazingCapacity("E") ?? "—"} m², north ~${additionalGlazingCapacity("N") ?? "—"} m². West glazing remains the highest risk use of this headroom.`
                  : avgCoolingHeadroom > 10
                  ? `Moderate cooling headroom. Estimated capacity for additional east-facing glazing: ~${additionalGlazingCapacity("E") ?? "—"} m². Avoid adding west glazing without detailed modelling.`
                  : "Cooling load is close to the limit. Do not add west or south-west glazing. Any additional glazing should be north-facing only."}
              </p>
            </div>
          </div>
        </div>

        {/* Orientation priority guide */}
        <div className="border border-sj-line p-6">
          <p className="text-[0.65rem] uppercase tracking-eyebrow text-sj-muted mb-4">Where to use your remaining headroom</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium text-emerald-700 mb-2">Best use of headroom</p>
              <p className="text-xs text-sj-muted leading-relaxed">
                North-facing glazing in zone 62 gives you passive heating benefit with minimal cooling cost.
                Increase north glazing area first if the design allows.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700 mb-2">Use with caution</p>
              <p className="text-xs text-sj-muted leading-relaxed">
                East-facing glazing is manageable with awnings. Each m² costs more cooling headroom than north —
                use it for daylight and cross-ventilation, not as primary solar access.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-red-700 mb-2">Avoid unless necessary</p>
              <p className="text-xs text-sj-muted leading-relaxed">
                West and south-west glazing consume cooling headroom at 4–5× the rate of north.
                If required, drop SHGC below 0.3 and use external shading as a primary strategy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-sj-muted">
        Insights sharpen as more certificates are uploaded. Capacity estimates are approximations based on zone 62 solar heat gain factors at SHGC 0.5 reference.
      </p>
    </div>
  );
}
