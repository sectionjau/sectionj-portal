// Handles email link callbacks (invite acceptance, password reset, magic links).
// Supabase redirects here after the user clicks the link in their email.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/update-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send back to login with an error.
  return NextResponse.redirect(
    `${origin}/login?error=The%20link%20has%20expired%20or%20is%20invalid.%20Please%20request%20a%20new%20one.`,
  );
}
