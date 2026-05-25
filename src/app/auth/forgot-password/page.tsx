import AuthShell from "@/components/AuthShell";
import Link from "next/link";
import { requestReset } from "./actions";

export const metadata = { title: "Reset password — Section J Portal" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Reset your password"
      intro="Enter the email address you use for Section J. We&rsquo;ll send you a link to set a new password."
    >
      <form action={requestReset} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs uppercase tracking-eyebrow text-sj-muted mb-2 font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-4 py-3 border border-sj-line focus:border-sj-fg focus:outline-none"
          />
        </div>

        {params.error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{params.error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-sj-fg text-white py-3 px-6 hover:bg-black transition-colors text-sm tracking-wide"
        >
          Send reset link
        </button>

        <p className="text-sm text-sj-muted pt-4 border-t border-sj-line">
          <Link href="/login" className="underline underline-offset-4 hover:no-underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
