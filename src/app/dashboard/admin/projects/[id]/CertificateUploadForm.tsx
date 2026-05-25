"use client";

import { useActionState, useRef } from "react";
import { uploadCertificate } from "./actions";

type Props = {
  projectId: string;
  hasCertificate: boolean;
};

const initialState = { error: undefined, success: undefined };

export default function CertificateUploadForm({ projectId, hasCertificate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const boundAction = uploadCertificate.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <div>
      {state?.success && (
        <p className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-3">
          Certificate uploaded and data extracted successfully.
        </p>
      )}
      {state?.error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <label htmlFor="certificate" className="block text-xs text-sj-muted mb-2">
            {hasCertificate ? "Replace existing certificate (PDF)" : "Upload NatHERS certificate (PDF)"}
          </label>
          <input
            ref={fileRef}
            id="certificate"
            name="certificate"
            type="file"
            accept="application/pdf"
            required
            disabled={isPending}
            className="block w-full text-sm text-sj-muted file:mr-4 file:py-2 file:px-4 file:border file:border-sj-line file:bg-sj-surface file:text-sm file:text-sj-fg file:cursor-pointer hover:file:bg-white disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-6 bg-sj-fg text-white px-5 py-2.5 text-sm tracking-wide hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isPending ? "Processing…" : hasCertificate ? "Re-upload & re-extract" : "Upload & extract"}
        </button>
      </form>

      {isPending && (
        <p className="mt-3 text-xs text-sj-muted">
          Extracting data from the certificate — this takes 15–30 seconds. Please don&apos;t close this page.
        </p>
      )}
    </div>
  );
}
