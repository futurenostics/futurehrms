import { Sidebar } from './sidebar';
import { Topbar, type BreadcrumbItem } from './topbar';

export function AppShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-fn-bg flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar breadcrumbs={breadcrumbs} />
        <main className="min-w-0 flex-1 p-7">{children}</main>
      </div>
    </div>
  );
}
