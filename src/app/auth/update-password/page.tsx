import AuthShell from "@/components/AuthShell";
import { updatePassword } from "./actions";

export const metadata = { title: "Set password — Section J Portal" };

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Set your password"
      intro="Choose a password you&rsquo;ll use to sign in to your Section J client portal. Minimum 8 characters."
    >
      <form action={updatePassword} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-xs uppercase tracking-eyebrow text-sj-muted mb-2 font-medium">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full px-4 py-3 border border-sj-line focus:border-sj-fg focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-xs uppercase tracking-eyebrow text-sj-muted mb-2 font-medium">
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
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
          Set password &amp; continue
        </button>
      </form>
    </AuthShell>
  );
}
