import { Sidebar } from './sidebar';
import { Topbar, type BreadcrumbItem } from './topbar';

/**
 * The outer wrapper takes the full viewport height and clips its own
 * overflow, so neither the sidebar nor the topbar can scroll out of
 * view. The right column is also overflow-hidden so the only element
 * that actually scrolls is <main> — the chrome is structurally outside
 * the scroll area, which is why it appears pinned without needing
 * position: sticky (more reliable across browser quirks and stacking
 * contexts than sticky positioning).
 */
export function AppShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-fn-bg flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar breadcrumbs={breadcrumbs} />
        <main className="p-fn-7 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
