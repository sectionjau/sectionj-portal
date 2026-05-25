"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function assertAdmin() {
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
  return { supabase, user };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WindowRow = {
  label: string;
  room_type: string;
  orientation: string;
  window_type: string;
  width_mm: number;
  height_mm: number;
  glazing_product: string;
  u_value: number;
  shgc: number;
};

type ExtractedCertificate = {
  star_rating: number | null;
  whole_of_home_score: number | null;
  whole_of_home_no_solar: number | null;
  climate_zone: string | null;
  conditioned_floor_area: number | null;
  heating_load: number | null;
  heating_limit: number | null;
  cooling_load: number | null;
  cooling_limit: number | null;
  greenhouse_with_solar: number | null;
  greenhouse_without_solar: number | null;
  solar_pv_kw: number | null;
  solar_generation_kwh: number | null;
  wall_r_value: number | null;
  ceiling_r_value: number | null;
  floor_r_value: number | null;
  hot_water_type: string | null;
  ai_summary: string | null;
  windows: WindowRow[];
};

// ─── Extraction prompt ────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `Extract data from this NatHERS certificate. Return ONLY valid JSON with exactly this structure — no other text, no markdown, no code fences:

{
  "star_rating": 7.0,
  "whole_of_home_score": 60,
  "whole_of_home_no_solar": 23,
  "climate_zone": "62 - Moorabbin Airport",
  "conditioned_floor_area": 119.7,
  "heating_load": 70.7,
  "heating_limit": 80.0,
  "cooling_load": 13.1,
  "cooling_limit": 22.0,
  "greenhouse_with_solar": 3343,
  "greenhouse_without_solar": 7317,
  "solar_pv_kw": 2.5,
  "solar_generation_kwh": 3550,
  "wall_r_value": 2.70,
  "ceiling_r_value": 8.00,
  "floor_r_value": 0.56,
  "hot_water_type": "Electric storage peak",
  "ai_summary": "2-3 sentence plain English summary of the home's thermal performance for a non-technical client. Mention the star rating and what it means practically (e.g. lower energy bills, year-round comfort). Include one sentence about the main design strength.",
  "windows": [
    {
      "label": "Bedroom 1 East",
      "room_type": "bedroom",
      "orientation": "E",
      "window_type": "awning",
      "width_mm": 850,
      "height_mm": 2100,
      "glazing_product": "ALM-004-03 A",
      "u_value": 4.3,
      "shgc": 0.53
    }
  ]
}

Rules:
- room_type must be one of: bedroom, living, kitchen, bathroom, study, dining, other
- orientation must be one of: N, S, E, W, NE, NW, SE, SW
- window_type must be one of: awning, sliding, fixed, casement, louvre, other
- Extract ALL windows from the window schedule
- If a field is not present in the certificate, use null
- greenhouse values are in kg CO2e per year
- solar_generation_kwh is annual generation in kWh
- The ai_summary must be written for a non-technical client`;

// ─── Server action ────────────────────────────────────────────────────────────

export async function uploadCertificate(
  projectId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  await assertAdmin();

  const file = formData.get("certificate") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please select a PDF file." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are accepted." };
  }

  // ── 1. Read file buffer ──────────────────────────────────────────────────
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Pdf = buffer.toString("base64");

  // ── 2. Upload to Supabase Storage ────────────────────────────────────────
  const adminClient = createAdminClient();
  const storagePath = `${projectId}/certificate.pdf`;

  const { error: storageError } = await adminClient.storage
    .from("certificates")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (storageError) {
    return { error: `Storage error: ${storageError.message}` };
  }

  // ── 3. Call Anthropic API to extract data ────────────────────────────────
  let extracted: ExtractedCertificate;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf,
                },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`);
    }

    const anthropicData = await anthropicRes.json();
    const rawText: string = anthropicData.content?.[0]?.text ?? "";

    // Strip any accidental markdown fences
    const jsonText = rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    extracted = JSON.parse(jsonText) as ExtractedCertificate;
  } catch (err) {
    return { error: `AI extraction failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // ── 4. Upsert certificate row ────────────────────────────────────────────
  const { data: cert, error: certError } = await adminClient
    .from("certificates")
    .upsert(
      {
        project_id: projectId,
        storage_path: storagePath,
        star_rating: extracted.star_rating,
        whole_of_home_score: extracted.whole_of_home_score,
        whole_of_home_no_solar: extracted.whole_of_home_no_solar,
        climate_zone: extracted.climate_zone,
        conditioned_floor_area: extracted.conditioned_floor_area,
        heating_load: extracted.heating_load,
        heating_limit: extracted.heating_limit,
        cooling_load: extracted.cooling_load,
        cooling_limit: extracted.cooling_limit,
        greenhouse_with_solar: extracted.greenhouse_with_solar,
        greenhouse_without_solar: extracted.greenhouse_without_solar,
        solar_pv_kw: extracted.solar_pv_kw,
        solar_generation_kwh: extracted.solar_generation_kwh,
        wall_r_value: extracted.wall_r_value,
        ceiling_r_value: extracted.ceiling_r_value,
        floor_r_value: extracted.floor_r_value,
        hot_water_type: extracted.hot_water_type,
        ai_summary: extracted.ai_summary,
      },
      { onConflict: "project_id" },
    )
    .select("id")
    .single();

  if (certError || !cert) {
    return { error: `Failed to save certificate: ${certError?.message}` };
  }

  // ── 5. Replace windows (delete old, insert new) ──────────────────────────
  await adminClient.from("certificate_windows").delete().eq("certificate_id", cert.id);

  if (extracted.windows?.length) {
    const windowRows = extracted.windows.map((w) => ({
      certificate_id: cert.id,
      label: w.label,
      room_type: w.room_type,
      orientation: w.orientation,
      window_type: w.window_type,
      width_mm: w.width_mm,
      height_mm: w.height_mm,
      area_m2:
        w.width_mm && w.height_mm
          ? parseFloat(((w.width_mm * w.height_mm) / 1_000_000).toFixed(3))
          : null,
      glazing_product: w.glazing_product,
      u_value: w.u_value,
      shgc: w.shgc,
    }));

    const { error: windowsError } = await adminClient
      .from("certificate_windows")
      .insert(windowRows);

    if (windowsError) {
      return { error: `Windows insert failed: ${windowsError.message}` };
    }
  }

  return { success: true };
}
