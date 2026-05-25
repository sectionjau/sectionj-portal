import AuthShell from "@/components/AuthShell";
import Link from "next/link";
import { login } from "./actions";

export const metadata = {
  title: "Sign in — Section J Portal",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      intro="Access your project dashboard, documents, and design insights."
    >
      <form action={login} className="space-y-5">
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
            className="w-full px-4 py-3 border border-sj-line focus:border-sj-fg focus:outline-none bg-white text-sj-fg"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs uppercase tracking-eyebrow text-sj-muted mb-2 font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full px-4 py-3 border border-sj-line focus:border-sj-fg focus:outline-none bg-white text-sj-fg"
          />
        </div>

        {params.error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2">
            {params.message}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-sj-fg text-white py-3 px-6 hover:bg-black transition-colors text-sm tracking-wide"
        >
          Sign in
        </button>

        <div className="text-sm text-sj-muted pt-4 border-t border-sj-line space-y-2">
          <p>
            <Link href="/auth/forgot-password" className="underline underline-offset-4 hover:no-underline">
              Forgot your password?
            </Link>
          </p>
          <p className="text-xs">
            Section J is invite-only. If you don&rsquo;t have an account, email
            {" "}<a href="mailto:j.poovely@sectionj.au" className="underline underline-offset-4">j.poovely@sectionj.au</a>.
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
