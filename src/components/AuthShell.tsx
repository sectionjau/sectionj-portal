// Shared wrapper for login / forgot-password / update-password pages.
// Matches the marketing site's calm, editorial aesthetic.
export default function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="px-6 py-6 md:px-12 md:py-8 border-b border-sj-line">
        <a
          href="https://sectionj.au"
          className="text-base md:text-lg font-medium tracking-tight text-sj-fg no-underline hover:underline underline-offset-4"
        >
          Section J
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 md:py-20">
        <div className="w-full max-w-md">
          <p className="text-[0.72rem] tracking-eyebrow uppercase text-sj-muted mb-4 font-medium">
            Client Portal
          </p>
          <h1 className="text-3xl md:text-4xl leading-tight font-normal tracking-tight mb-3">
            {title}
          </h1>
          {intro && <p className="text-sj-muted mb-8 leading-relaxed">{intro}</p>}
          {children}
        </div>
      </main>

      <footer className="px-6 py-6 md:px-12 text-xs text-sj-muted border-t border-sj-line">
        {footer ?? (
          <p>
            &copy; {new Date().getFullYear()} Section J Pty Ltd · ACN 684 183 079
          </p>
        )}
      </footer>
    </div>
  );
}
