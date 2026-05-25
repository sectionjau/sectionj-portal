import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createProject } from "../actions";

export const metadata = { title: "New project — Section J Admin" };

const inputClass =
  "w-full px-4 py-3 border border-sj-line focus:border-sj-fg focus:outline-none bg-white text-sj-fg";
const labelClass =
  "block text-xs uppercase tracking-eyebrow text-sj-muted mb-2 font-medium";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const params = await searchParams;

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-12 py-12 md:py-16">
      <div className="mb-10">
        <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-2 font-medium">
          Admin · Projects
        </p>
        <h1 className="text-3xl md:text-4xl font-normal tracking-tight">New project</h1>
      </div>

      {params.error && (
        <p className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
          {params.error}
        </p>
      )}

      <form action={createProject} className="space-y-6">
        <div>
          <label htmlFor="name" className={labelClass}>Project name</label>
          <input
            id="name" name="name" type="text"
            placeholder="e.g. 32 Buckley Road, Pt Lonsdale"
            required className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>Address</label>
          <input
            id="address" name="address" type="text"
            placeholder="Full street address"
            required className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="project_type" className={labelClass}>Project type</label>
          <select id="project_type" name="project_type" className={inputClass}>
            <option>Residential</option>
            <option>Multi-residential</option>
            <option>Commercial</option>
            <option>Heritage</option>
          </select>
        </div>

        <div>
          <label htmlFor="service" className={labelClass}>Service</label>
          <select id="service" name="service" className={inputClass}>
            <option value="NatHERS">NatHERS</option>
            <option value="NatHERS + Glazing">NatHERS + Glazing advisor</option>
          </select>
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>Status</label>
          <select id="status" name="status" className={inputClass}>
            <option>Active</option>
            <option>On hold</option>
            <option>Complete</option>
          </select>
        </div>

        <div>
          <label htmlFor="client_email" className={labelClass}>
            Assign to client (email)
          </label>
          <input
            id="client_email" name="client_email" type="email"
            placeholder="client@example.com — must already have a portal account"
            className={inputClass}
          />
          <p className="mt-2 text-xs text-sj-muted">
            Leave blank to create the project without assigning it yet.
          </p>
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>Notes (optional)</label>
          <textarea
            id="notes" name="notes" rows={3}
            placeholder="Any internal notes about this project…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="bg-sj-fg text-white py-3 px-8 hover:bg-black transition-colors text-sm tracking-wide"
          >
            Create project
          </button>
          <Link
            href="/dashboard/admin/projects"
            className="text-sm text-sj-muted underline underline-offset-4 hover:no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
