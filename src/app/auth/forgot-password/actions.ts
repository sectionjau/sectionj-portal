"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestReset(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/auth/forgot-password?error=Please%20enter%20your%20email%20address.");
  }

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ?? hdrs.get("x-forwarded-host")
      ? `https://${hdrs.get("x-forwarded-host")}`
      : "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });

  // We always show a generic success message — never confirm or deny whether the email exists.
  if (error) {
    console.error("Password reset error:", error.message);
  }

  redirect("/login?message=If%20that%20email%20exists%2C%20we%E2%80%99ve%20sent%20a%20reset%20link.");
}
