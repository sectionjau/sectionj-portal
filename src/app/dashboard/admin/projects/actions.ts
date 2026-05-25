"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");
  return { supabase, user };
}

export async function createProject(formData: FormData) {
  const { supabase } = await assertAdmin();

  const name        = String(formData.get("name") ?? "").trim();
  const address     = String(formData.get("address") ?? "").trim();
  const projectType = String(formData.get("project_type") ?? "Residential");
  const service     = String(formData.get("service") ?? "NatHERS");
  const status      = String(formData.get("status") ?? "Active");
  const notes       = String(formData.get("notes") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim().toLowerCase();

  if (!name || !address) {
    redirect("/dashboard/admin/projects/new?error=Project+name+and+address+are+required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name,
      address,
      project_type: projectType,
      service,
      status,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    redirect(
      `/dashboard/admin/projects/new?error=${encodeURIComponent(
        projectError?.message ?? "Failed to create project.",
      )}`,
    );
  }

  if (clientEmail) {
    const { data: clientId } = await supabase.rpc("get_user_id_by_email", {
      lookup_email: clientEmail,
    });

    if (clientId) {
      await supabase.from("project_clients").insert({
        project_id: project.id,
        client_id: clientId as string,
      });
    }
  }

  redirect("/dashboard/admin/projects?success=Project+created.");
}

export async function deleteProject(projectId: string) {
  const { supabase } = await assertAdmin();
  await supabase.from("projects").delete().eq("id", projectId);
  redirect("/dashboard/admin/projects");
}
