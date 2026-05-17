'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Briefcase,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Move,
  Network,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { OrgChartNode } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgChart } from '@/lib/queries/employees';
import { cn } from '@/lib/utils';

/**
 * Org Chart — interactive reporting structure.
 *
 * Visual reference: docs/design/screens/org-chart.jsx. The tree uses
 * the classic CSS pseudo-element pattern for connectors:
 *   • `::before` on the children wrapper draws the vertical line
 *     dropping from the parent
 *   • per-child `::before` draws the short drop into the child card
 *   • per-child `::after` (only on sibling sets) draws the horizontal
 *     connector that's a half-span for first/last and full-span for
 *     middle children
 *
 * Interactions:
 *   • click any card → highlights the path-to-root and pins the
 *     person to the right-side details panel
 *   • per-card −/+ button collapses / expands that subtree
 *   • search (Find person…) dims non-matching cards
 *   • department chip filter dims non-matching cards
 *   • Full / Compact toggle for high-headcount viewing
 *
 * Promoted out of /employees/org to a top-level /org-chart so it
 * shows up directly under HR Core in the sidebar.
 */

// --- Department hue map: same five anchor hues the design uses,
// fallback to a stable hash so unknown departments still get a
// distinct colour rather than collapsing to grey.
const DEPT_HUES: Record<string, number> = {
  Engineering: 280,
  'Business Development': 175,
  'Business Dev': 175,
  Operations: 145,
  HR: 22,
  'HR & People': 22,
  Leadership: 295,
  Finance: 220,
  Sales: 35,
  Marketing: 320,
};
function hueFor(dept: string): number {
  if (DEPT_HUES[dept] != null) return DEPT_HUES[dept]!;
  let h = 0;
  for (const c of dept) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function countDescendants(node: OrgChartNode): number {
  if (!node.reports?.length) return 0;
  let n = node.reports.length;
  for (const c of node.reports) n += countDescendants(c);
  return n;
}

function maxDepth(node: OrgChartNode, current = 1): number {
  if (!node.reports?.length) return current;
  return Math.max(...node.reports.map((c) => maxDepth(c, current + 1)));
}

function totalNodes(roots: OrgChartNode[]): number {
  return roots.reduce((sum, r) => sum + 1 + countDescendants(r), 0);
}

function findPath(
  node: OrgChartNode,
  id: string,
  path: OrgChartNode[] = [],
): OrgChartNode[] | null {
  if (node.id === id) return [...path, node];
  for (const c of node.reports ?? []) {
    const r = findPath(c, id, [...path, node]);
    if (r) return r;
  }
  return null;
}

function findPathInRoots(roots: OrgChartNode[], id: string): OrgChartNode[] | null {
  for (const r of roots) {
    const p = findPath(r, id);
    if (p) return p;
  }
  return null;
}

function spanOfControl(roots: OrgChartNode[]): number {
  let managers = 0;
  let reports = 0;
  function walk(node: OrgChartNode) {
    if (node.reports.length > 0) {
      managers += 1;
      reports += node.reports.length;
    }
    for (const c of node.reports) walk(c);
  }
  for (const r of roots) walk(r);
  return managers === 0 ? 0 : Number((reports / managers).toFixed(1));
}

function uniqueDepartments(roots: OrgChartNode[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  function walk(node: OrgChartNode) {
    counts.set(node.department, (counts.get(node.department) ?? 0) + 1);
    for (const c of node.reports) walk(c);
  }
  for (const r of roots) walk(r);
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function OrgChartPage() {
  const { data, isLoading, isError, error, refetch } = useOrgChart();
  const roots = React.useMemo(() => data ?? [], [data]);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');
  const [dept, setDept] = React.useState<string>('All');
  const [compact, setCompact] = React.useState(false);
  const [fullWidth, setFullWidth] = React.useState(false);

  // Default the selected node to the first root once data arrives.
  React.useEffect(() => {
    if (!selectedId && roots[0]) setSelectedId(roots[0].id);
  }, [roots, selectedId]);

  // --- Pan + zoom state for the tree canvas. The tree itself lives
  // inside an absolutely-positioned wrapper that we translate / scale;
  // the viewport is the outer canvas div. Drag anywhere on the canvas
  // background to pan; wheel + Cmd/Ctrl-wheel to zoom; the toolbar
  // buttons jump to common zoom levels.
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const dragState = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const [isPanning, setIsPanning] = React.useState(false);

  const clampZoom = (z: number) => Math.max(0.4, Math.min(2, z));

  const recenter = React.useCallback(() => {
    const vp = viewportRef.current;
    const inner = innerRef.current;
    if (!vp || !inner) return;
    // wait a tick so children have laid out
    requestAnimationFrame(() => {
      const innerW = inner.scrollWidth;
      const vpW = vp.clientWidth;
      setPan({ x: Math.max(0, (vpW - innerW) / 2), y: 24 });
      setZoom(1);
    });
  }, []);

  React.useEffect(() => {
    if (!isLoading && roots.length > 0) recenter();
  }, [isLoading, roots, recenter, fullWidth]);

  function onCanvasMouseDown(e: React.MouseEvent) {
    // Only start a pan if the user grabbed the canvas background — not
    // a card click. Cards are interactive elements; the wrapper itself
    // is the pan-handle.
    if ((e.target as HTMLElement).closest('[data-card]')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pan.x,
      baseY: pan.y,
    };
    setIsPanning(true);
  }

  React.useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragState.current;
      if (!d?.active) return;
      setPan({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
    }
    function onUp() {
      if (dragState.current) dragState.current.active = false;
      setIsPanning(false);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // React's synthetic onWheel is registered passively in React 17+,
  // which means preventDefault() inside the JSX handler is silently
  // ignored — so ⌘+wheel on the canvas would still zoom the whole
  // browser page. We attach a native non-passive listener via ref so
  // preventDefault actually wins.
  //
  // We track zoom/pan in a ref the listener can read mutably without
  // forcing the effect to re-bind on every state change (which would
  // miss the first wheel tick of a gesture).
  const zoomRef = React.useRef(zoom);
  const panRef = React.useRef(pan);
  React.useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  React.useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = vp!.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const nextZoom = clampZoom(zoomRef.current * (e.deltaY > 0 ? 0.92 : 1.08));
        const ratio = nextZoom / zoomRef.current;
        const cur = panRef.current;
        setPan({ x: cx - (cx - cur.x) * ratio, y: cy - (cy - cur.y) * ratio });
        setZoom(nextZoom);
      } else {
        const cur = panRef.current;
        setPan({ x: cur.x - e.deltaX, y: cur.y - e.deltaY });
      }
    }
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  function zoomBy(factor: number) {
    const vp = viewportRef.current;
    if (!vp) {
      setZoom((z) => clampZoom(z * factor));
      return;
    }
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const nextZoom = clampZoom(zoom * factor);
    const ratio = nextZoom / zoom;
    setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio });
    setZoom(nextZoom);
  }

  // Select a node and pan the canvas so its card lands in the centre
  // of the viewport. Used by the search effect and by the clickable
  // manager / direct-report rows in the details panel. If any ancestor
  // of the target is collapsed the card isn't in the DOM, so we first
  // uncollapse every ancestor on the path-to-root.
  const rootsRef = React.useRef(roots);
  React.useEffect(() => {
    rootsRef.current = roots;
  }, [roots]);
  const focusNode = React.useCallback((id: string) => {
    setSelectedId(id);
    const path = findPathInRoots(rootsRef.current, id);
    if (path) {
      // Ancestors only — keep the target's own collapse state alone so
      // clicking a node doesn't force its own subtree open.
      const ancestorIds = path.slice(0, -1).map((n) => n.id);
      setCollapsed((prev) => {
        if (!ancestorIds.some((aid) => prev.has(aid))) return prev;
        const next = new Set(prev);
        for (const aid of ancestorIds) next.delete(aid);
        return next;
      });
    }
    // wait for layout + transform commit before measuring
    window.setTimeout(() => {
      const vp = viewportRef.current;
      const card = vp?.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
      if (!vp || !card) return;
      const vpRect = vp.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const cardCx = cardRect.left + cardRect.width / 2 - vpRect.left;
      const cardCy = cardRect.top + cardRect.height / 2 - vpRect.top;
      setPan((p) => ({
        x: p.x + (vp.clientWidth / 2 - cardCx),
        y: p.y + (vp.clientHeight / 2 - cardCy),
      }));
    }, 80);
  }, []);

  // Pan to the first matching card whenever the search changes, so
  // the user doesn't have to drag around hunting for who they typed.
  // We also auto-select it so the right-side details panel updates.
  React.useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q || roots.length === 0) return;
    let match: OrgChartNode | null = null;
    const walk = (n: OrgChartNode): boolean => {
      if (matchesFilters(n, q, dept)) {
        match = n;
        return true;
      }
      for (const c of n.reports) if (walk(c)) return true;
      return false;
    };
    for (const r of roots) if (walk(r)) break;
    if (!match) return;
    const found: OrgChartNode = match;
    setSelectedId(found.id);
    // wait for layout + transform commit before measuring
    const id = window.setTimeout(() => {
      const vp = viewportRef.current;
      const card = vp?.querySelector<HTMLElement>(`[data-node-id="${found.id}"]`);
      if (!vp || !card) return;
      const vpRect = vp.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const cardCx = cardRect.left + cardRect.width / 2 - vpRect.left;
      const cardCy = cardRect.top + cardRect.height / 2 - vpRect.top;
      setPan((p) => ({
        x: p.x + (vp.clientWidth / 2 - cardCx),
        y: p.y + (vp.clientHeight / 2 - cardCy),
      }));
    }, 80);
    return () => window.clearTimeout(id);
    // We intentionally don't depend on pan — recentring on every pan
    // change would yank the canvas back during a drag.
  }, [search, dept, roots]);

  // When collapsing/expanding a branch the inner tree reflows; because
  // the canvas is transform-translated (not scrolled), the just-clicked
  // card can shift well off-screen at higher zooms. We snapshot the
  // card's screen position before the toggle and, after React commits
  // the new layout, nudge `pan` so the same card stays anchored.
  const pendingAnchorRef = React.useRef<{ id: string; x: number; y: number } | null>(null);

  function toggleCollapse(id: string) {
    const vp = viewportRef.current;
    const card = vp?.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (vp && card) {
      const vpRect = vp.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      pendingAnchorRef.current = {
        id,
        x: cardRect.left + cardRect.width / 2 - vpRect.left,
        y: cardRect.top + cardRect.height / 2 - vpRect.top,
      };
    }
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  React.useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    if (!anchor) return;
    pendingAnchorRef.current = null;
    const vp = viewportRef.current;
    const card = vp?.querySelector<HTMLElement>(`[data-node-id="${anchor.id}"]`);
    if (!vp || !card) return;
    const vpRect = vp.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    const newX = rect.left + rect.width / 2 - vpRect.left;
    const newY = rect.top + rect.height / 2 - vpRect.top;
    const dx = anchor.x - newX;
    const dy = anchor.y - newY;
    if (dx === 0 && dy === 0) return;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, [collapsed]);

  const totalHeadcount = React.useMemo(() => totalNodes(roots), [roots]);
  const depth = React.useMemo(
    () => (roots.length ? Math.max(...roots.map((r) => maxDepth(r))) : 0),
    [roots],
  );
  const spanAvg = React.useMemo(() => spanOfControl(roots), [roots]);
  const departments = React.useMemo(() => uniqueDepartments(roots), [roots]);

  const selectedPath = React.useMemo(
    () => (selectedId ? findPathInRoots(roots, selectedId) : null),
    [roots, selectedId],
  );
  const selected = selectedPath?.[selectedPath.length - 1] ?? null;
  const selectedAncestors = React.useMemo(
    () => new Set((selectedPath ?? []).map((n) => n.id)),
    [selectedPath],
  );

  // Visible-node count after search/dept filters (used in the "X visible" badge).
  const visibleCount = React.useMemo(() => {
    if (!search && dept === 'All') return totalHeadcount;
    let n = 0;
    function walk(node: OrgChartNode) {
      if (matchesFilters(node, search.toLowerCase(), dept)) n += 1;
      for (const c of node.reports) walk(c);
    }
    for (const r of roots) walk(r);
    return n;
  }, [roots, search, dept, totalHeadcount]);

  return (
    <AppShell breadcrumbs={[{ label: 'Org Chart' }]}>
      <style dangerouslySetInnerHTML={{ __html: ORG_STYLES }} />
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        {/* Header */}
        <div className="gap-fn-3 flex flex-wrap items-end justify-between">
          <div>
            <h1
              className="text-fn-fg font-fn-semibold m-0 text-[26px]"
              style={{ letterSpacing: '-0.025em' }}
            >
              Reporting structure
            </h1>
            <p className="text-fn-fg-muted mt-fn-1_5 text-[14px]">
              {totalHeadcount} {totalHeadcount === 1 ? 'person' : 'people'} · {depth}{' '}
              {depth === 1 ? 'level' : 'levels'} deep · click any card to focus its branch, use −/+
              to collapse a sub-tree.
            </p>
          </div>
          <div className="gap-fn-2 flex items-center">
            <Button variant="secondary" size="sm" disabled>
              <UserPlus className="h-fn-3_5 w-fn-3_5" /> Add report line
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="gap-fn-4 grid grid-cols-2 sm:grid-cols-4">
          <KpiCell
            icon={<Users className="h-fn-4 w-fn-4" />}
            label="Total headcount"
            value={String(totalHeadcount)}
            sub={`across ${departments.length} departments`}
          />
          <KpiCell
            icon={<Layers className="h-fn-4 w-fn-4" />}
            label="Org depth"
            value={String(depth)}
            sub="levels of reporting"
          />
          <KpiCell
            icon={<Briefcase className="h-fn-4 w-fn-4" />}
            label="Span of control"
            value={String(spanAvg)}
            sub="avg reports / manager"
          />
          <KpiCell
            icon={<UserPlus className="h-fn-4 w-fn-4" />}
            label="Open roles"
            value="—"
            sub="role planning coming soon"
          />
        </div>

        {/* Main grid */}
        <div className={cn('gap-fn-4 grid grid-cols-1', !fullWidth && 'lg:grid-cols-[1fr_320px]')}>
          {/* Canvas card */}
          <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
            <div className="border-fn-divider gap-fn-3 px-fn-5 py-fn-4 flex flex-wrap items-center justify-between border-b">
              <div className="gap-fn-2_5 flex items-center">
                <span
                  aria-hidden
                  className="rounded-fn-xs h-fn-7 w-fn-7 bg-fn-icon-tile text-fn-icon-tile-fg inline-flex items-center justify-center"
                >
                  <Network className="h-fn-3_5 w-fn-3_5" />
                </span>
                <div className="gap-fn-2 flex items-center">
                  <h2 className="text-fn-fg font-fn-semibold text-[15px]">Org chart</h2>
                  <Badge tone="default">
                    {visibleCount} {visibleCount === 1 ? 'visible' : 'visible'}
                  </Badge>
                </div>
              </div>
              <div className="gap-fn-2 flex flex-wrap items-center">
                <div className="relative w-[220px]">
                  <Search className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find person…"
                    className="pl-fn-8 h-fn-8"
                  />
                </div>
                {/* Zoom cluster */}
                <div className="border-fn-border-strong bg-fn-bg-subtle rounded-fn-xs p-fn-0_5 gap-fn-0_5 inline-flex items-center border">
                  <ToolbarIconBtn onClick={() => zoomBy(0.9)} ariaLabel="Zoom out">
                    <ZoomOut className="h-fn-3_5 w-fn-3_5" />
                  </ToolbarIconBtn>
                  <span className="text-fn-fg-muted font-fn-semibold w-[36px] text-center text-[11px] tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                  <ToolbarIconBtn onClick={() => zoomBy(1.1)} ariaLabel="Zoom in">
                    <ZoomIn className="h-fn-3_5 w-fn-3_5" />
                  </ToolbarIconBtn>
                  <span className="bg-fn-border h-fn-4 mx-fn-0_5 w-px" aria-hidden />
                  <ToolbarIconBtn onClick={recenter} ariaLabel="Fit to screen">
                    <RotateCcw className="h-fn-3_5 w-fn-3_5" />
                  </ToolbarIconBtn>
                </div>
                {/* Density toggle */}
                <div className="border-fn-border-strong bg-fn-bg-subtle rounded-fn-xs p-fn-0_5 inline-flex border">
                  <ToolbarIconBtn
                    onClick={() => setCompact(false)}
                    active={!compact}
                    ariaLabel="Standard density"
                  >
                    <Layers className="h-fn-3_5 w-fn-3_5" />
                  </ToolbarIconBtn>
                  <ToolbarIconBtn
                    onClick={() => setCompact(true)}
                    active={compact}
                    ariaLabel="Compact density"
                  >
                    <Minimize2 className="h-fn-3_5 w-fn-3_5" />
                  </ToolbarIconBtn>
                </div>
                {/* Full-width toggle (hides right sidebar) */}
                <ToolbarIconBtn
                  onClick={() => setFullWidth((v) => !v)}
                  active={fullWidth}
                  ariaLabel={fullWidth ? 'Show details panel' : 'Expand to full width'}
                  bordered
                >
                  {fullWidth ? (
                    <Minimize2 className="h-fn-3_5 w-fn-3_5" />
                  ) : (
                    <Maximize2 className="h-fn-3_5 w-fn-3_5" />
                  )}
                </ToolbarIconBtn>
              </div>
            </div>

            {/* Filter chips row */}
            <div className="border-fn-divider gap-fn-2 px-fn-5 py-fn-3 flex flex-wrap items-center border-b">
              <DeptChip
                name="All"
                count={totalHeadcount}
                active={dept === 'All'}
                onClick={() => setDept('All')}
              />
              {departments.map((d) => (
                <DeptChip
                  key={d.name}
                  name={d.name}
                  count={d.count}
                  hue={hueFor(d.name)}
                  active={dept === d.name}
                  onClick={() => setDept(d.name)}
                />
              ))}
              <span className="text-fn-fg-faint ml-auto text-[11.5px]">
                Click{' '}
                <span className="bg-fn-bg-inset rounded-fn-full font-fn-semibold inline-flex h-[16px] w-[16px] items-center justify-center align-middle text-[10px]">
                  −
                </span>{' '}
                to collapse a branch
              </span>
            </div>

            {/* Tree canvas — pan + zoom viewport */}
            <div
              ref={viewportRef}
              className="org-canvas"
              onMouseDown={onCanvasMouseDown}
              style={{
                position: 'relative',
                height: fullWidth ? 'calc(100vh - 280px)' : '560px',
                background:
                  'radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--fn-fg-faint) 35%, transparent) 1px, transparent 0) 0 0 / 20px 20px var(--fn-bg-subtle)',
                overflow: 'hidden',
                cursor: isPanning ? 'grabbing' : 'grab',
                userSelect: isPanning ? 'none' : 'auto',
              }}
            >
              {isLoading && (
                <div className="p-fn-6">
                  <Skeleton className="h-[320px] w-full" />
                </div>
              )}
              {isError && (
                <div className="text-fn-danger-soft-fg gap-fn-2 py-fn-12 flex h-full items-center justify-center text-[13px]">
                  <AlertCircle className="h-fn-4 w-fn-4" />
                  {(error as Error)?.message ?? 'Failed to load org chart.'}
                  <Button size="sm" variant="outline" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              )}
              {!isLoading && !isError && roots.length === 0 && (
                <div className="text-fn-fg-muted py-fn-12 flex h-full items-center justify-center text-center text-[13px]">
                  No reporting structure yet. Add employees with manager links to build the chart.
                </div>
              )}
              {!isLoading && !isError && roots.length > 0 && (
                <div
                  ref={innerRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    transition: isPanning ? 'none' : 'transform 120ms ease-out',
                    display: 'inline-flex',
                    alignItems: 'flex-start',
                    padding: '12px 24px',
                    willChange: 'transform',
                    userSelect: 'none',
                  }}
                >
                  {roots.map((root) => (
                    <OrgTree
                      key={root.id}
                      node={root}
                      isRoot
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      isCollapsed={(id) => collapsed.has(id)}
                      onToggle={toggleCollapse}
                      search={search.toLowerCase()}
                      deptFilter={dept}
                      compact={compact}
                      highlightedIds={selectedAncestors}
                    />
                  ))}
                </div>
              )}
              {/* Pan/zoom helper overlay (corner hint) */}
              {!isLoading && !isError && roots.length > 0 && (
                <div
                  className="border-fn-border bg-fn-bg-panel/90 text-fn-fg-muted gap-fn-1_5 bottom-fn-3 right-fn-3 rounded-fn-xs px-fn-2_5 py-fn-1 absolute inline-flex items-center border text-[10.5px] backdrop-blur"
                  style={{ pointerEvents: 'none' }}
                >
                  <Move className="h-fn-3 w-fn-3" />
                  Drag to pan · <span className="font-mono">⌘</span> + wheel to zoom
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="border-fn-divider gap-fn-3_5 px-fn-5 py-fn-3 flex flex-wrap items-center border-t text-[11.5px]">
              <span className="text-fn-fg font-fn-semibold">Departments:</span>
              {departments.map((d) => (
                <span key={d.name} className="gap-fn-1_5 text-fn-fg-muted inline-flex items-center">
                  <span
                    aria-hidden
                    className="rounded-fn-full inline-block"
                    style={{
                      width: 12,
                      height: 4,
                      background: `oklch(0.55 0.16 ${hueFor(d.name)})`,
                    }}
                  />
                  {d.name}
                </span>
              ))}
              <span className="text-fn-fg-faint ml-auto">
                Scroll horizontally if tree exceeds canvas
              </span>
            </div>
          </div>

          {/* Right detail panel */}
          <aside className="gap-fn-4 flex flex-col">
            {selected && (
              <DetailPanel
                node={selected}
                path={selectedPath ?? []}
                directReports={selected.reports}
                totalReports={countDescendants(selected)}
                onFocusNode={focusNode}
              />
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

/* ───────────────── Tree renderer ───────────────── */

interface OrgTreeProps {
  node: OrgChartNode;
  isRoot?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isCollapsed: (id: string) => boolean;
  onToggle: (id: string) => void;
  search: string;
  deptFilter: string;
  compact: boolean;
  highlightedIds: Set<string>;
}

function OrgTree({
  node,
  isRoot,
  selectedId,
  onSelect,
  isCollapsed,
  onToggle,
  search,
  deptFilter,
  compact,
  highlightedIds,
}: OrgTreeProps) {
  const hasReports = node.reports?.length > 0;
  const collapsed = isCollapsed(node.id);
  const matches = matchesFilters(node, search, deptFilter);
  const dimmed = !matches && !highlightedIds.has(node.id);

  return (
    <div className="org-tree">
      <OrgCard
        node={node}
        selected={node.id === selectedId}
        onlinePath={highlightedIds.has(node.id)}
        dimmed={dimmed}
        compact={compact}
        hasReports={hasReports}
        collapsed={collapsed}
        onSelect={() => onSelect(node.id)}
        onToggle={() => onToggle(node.id)}
      />
      {hasReports && !collapsed && (
        <div className="org-tree-children">
          {node.reports.map((child, idx) => {
            const cls =
              node.reports.length === 1
                ? 'only'
                : idx === 0
                  ? 'first has-sibs'
                  : idx === node.reports.length - 1
                    ? 'last has-sibs'
                    : 'middle has-sibs';
            return (
              <div key={child.id} className={`org-tree-child ${cls}`}>
                <OrgTree
                  node={child}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  isCollapsed={isCollapsed}
                  onToggle={onToggle}
                  search={search}
                  deptFilter={deptFilter}
                  compact={compact}
                  highlightedIds={highlightedIds}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  void isRoot;
}

/* ───────────────── Card ───────────────── */

function OrgCard({
  node,
  selected,
  onlinePath,
  dimmed,
  compact,
  hasReports,
  collapsed,
  onSelect,
  onToggle,
}: {
  node: OrgChartNode;
  selected: boolean;
  onlinePath: boolean;
  dimmed: boolean;
  compact: boolean;
  hasReports: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const hue = hueFor(node.department);
  const reportsCount = countDescendants(node);
  return (
    <div
      role="button"
      tabIndex={0}
      data-card
      data-node-id={node.id}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'rounded-fn-sm bg-fn-bg-panel relative cursor-pointer select-none transition-all',
        compact ? 'px-fn-2_5 py-fn-2' : 'px-fn-3_5 py-fn-3',
        dimmed && 'opacity-35',
        selected
          ? 'border-fn-accent shadow-fn-md border-[1.5px]'
          : onlinePath
            ? 'border-fn-accent/40 shadow-fn-sm border'
            : 'border-fn-border hover:border-fn-fg-faint border',
      )}
      style={{
        minWidth: compact ? 168 : 220,
        boxShadow:
          selected || onlinePath
            ? `0 0 0 3px color-mix(in oklch, oklch(0.55 0.16 ${hue}) 12%, transparent)`
            : undefined,
      }}
    >
      <div className="gap-fn-2_5 flex items-center">
        <span
          aria-hidden
          className="rounded-fn-xs font-fn-semibold inline-flex shrink-0 items-center justify-center"
          style={{
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            background: `oklch(0.92 0.07 ${hue})`,
            color: `oklch(0.38 0.16 ${hue})`,
            fontSize: compact ? 12 : 14,
            letterSpacing: '-0.02em',
          }}
        >
          {initialsOf(node.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="text-fn-fg font-fn-semibold truncate text-[13px]"
            style={{ letterSpacing: '-0.005em' }}
          >
            {node.fullName}
          </div>
          <div className="text-fn-fg-muted mt-fn-0_5 truncate text-[11.5px]">
            {node.designation}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="gap-fn-1_5 mt-fn-2 flex flex-wrap items-center">
          <span
            aria-hidden
            className="rounded-fn-full h-fn-1_5 w-fn-1_5 inline-block"
            style={{ background: `oklch(0.55 0.16 ${hue})` }}
          />
          <span className="text-fn-fg-faint text-[11px]">{node.department}</span>
          <span aria-hidden className="text-fn-fg-faint">
            ·
          </span>
          <span className="text-fn-fg-faint font-mono text-[10.5px]">{node.eid}</span>
          {hasReports && (
            <span className="text-fn-fg-faint ml-auto text-[11px] tabular-nums">
              {reportsCount} {reportsCount === 1 ? 'report' : 'reports'}
            </span>
          )}
        </div>
      )}
      {hasReports && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={collapsed ? 'Expand branch' : 'Collapse branch'}
          className={cn(
            'border-fn-border-strong bg-fn-bg-panel text-fn-fg-muted hover:bg-fn-bg-subtle hover:text-fn-fg rounded-fn-full font-fn-semibold h-fn-5 w-fn-5 absolute inline-flex cursor-pointer items-center justify-center border text-[10px] transition-colors',
          )}
          style={{ bottom: -10, left: 'calc(50% - 10px)' }}
        >
          {collapsed ? (
            <Plus className="h-fn-2_5 w-fn-2_5" />
          ) : (
            <Minus className="h-fn-2_5 w-fn-2_5" />
          )}
        </button>
      )}
    </div>
  );
}

/* ───────────────── Details panel ───────────────── */

function DetailPanel({
  node,
  path,
  directReports,
  totalReports,
  onFocusNode,
}: {
  node: OrgChartNode;
  path: OrgChartNode[];
  directReports: OrgChartNode[];
  totalReports: number;
  onFocusNode: (id: string) => void;
}) {
  const hue = hueFor(node.department);
  const manager = path.length > 1 ? path[path.length - 2] : null;
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel top-fn-4 sticky overflow-hidden border">
      <div className="border-fn-divider px-fn-5 py-fn-3_5 border-b">
        <h3 className="text-fn-fg font-fn-semibold text-[13px]">Selected person</h3>
      </div>
      <div className="px-fn-5 py-fn-4 gap-fn-3 flex flex-col">
        <div className="gap-fn-3 flex items-center">
          <span
            aria-hidden
            className="rounded-fn-sm font-fn-semibold inline-flex shrink-0 items-center justify-center"
            style={{
              width: 52,
              height: 52,
              background: `oklch(0.92 0.07 ${hue})`,
              color: `oklch(0.38 0.16 ${hue})`,
              fontSize: 17,
              letterSpacing: '-0.02em',
            }}
          >
            {initialsOf(node.fullName)}
          </span>
          <div className="min-w-0">
            <div
              className="text-fn-fg font-fn-semibold text-[16px]"
              style={{ letterSpacing: '-0.015em' }}
            >
              {node.fullName}
            </div>
            <div className="text-fn-fg-muted mt-fn-0_5 truncate text-[12.5px]">
              {node.designation} · {node.department}
            </div>
          </div>
        </div>
        <div className="gap-fn-1_5 flex flex-wrap">
          <Badge tone="default" className="font-mono">
            {node.eid}
          </Badge>
          <Badge tone="default">
            {totalReports} {totalReports === 1 ? 'report' : 'reports'} total
          </Badge>
        </div>
      </div>

      {manager && (
        <div className="border-fn-divider px-fn-5 py-fn-4 border-t">
          <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight mb-fn-2 text-[11px] uppercase">
            Reports to
          </div>
          <button
            type="button"
            onClick={() => onFocusNode(manager.id)}
            className="bg-fn-bg-subtle border-fn-border hover:border-fn-fg-faint hover:bg-fn-bg-panel rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-2_5 flex w-full cursor-pointer items-center border text-left transition-colors"
          >
            <span
              aria-hidden
              className="rounded-fn-xs font-fn-semibold h-fn-7 w-fn-7 inline-flex shrink-0 items-center justify-center"
              style={{
                background: `oklch(0.92 0.07 ${hueFor(manager.department)})`,
                color: `oklch(0.38 0.16 ${hueFor(manager.department)})`,
                fontSize: 11,
                letterSpacing: '-0.02em',
              }}
            >
              {initialsOf(manager.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-fn-fg font-fn-semibold truncate text-[12.5px]">
                {manager.fullName}
              </div>
              <div className="text-fn-fg-faint truncate text-[11px]">{manager.designation}</div>
            </div>
          </button>
        </div>
      )}

      {directReports.length > 0 && (
        <div className="border-fn-divider px-fn-5 py-fn-4 border-t">
          <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight mb-fn-2 text-[11px] uppercase">
            Direct reports · {directReports.length}
          </div>
          <ul className="gap-fn-0_5 flex flex-col">
            {directReports.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onFocusNode(r.id)}
                  className="rounded-fn-xs px-fn-2 py-fn-1_5 gap-fn-2_5 hover:bg-fn-bg-subtle flex w-full cursor-pointer items-center text-left text-[12.5px] transition-colors"
                >
                  <span
                    aria-hidden
                    className="rounded-fn-xs font-fn-semibold h-fn-6 w-fn-6 inline-flex shrink-0 items-center justify-center"
                    style={{
                      background: `oklch(0.92 0.07 ${hueFor(r.department)})`,
                      color: `oklch(0.38 0.16 ${hueFor(r.department)})`,
                      fontSize: 10,
                    }}
                  >
                    {initialsOf(r.fullName)}
                  </span>
                  <span className="text-fn-fg font-fn-medium flex-1 truncate">{r.fullName}</span>
                  <span className="text-fn-fg-faint shrink-0 text-[11px]">{r.designation}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-fn-divider px-fn-5 py-fn-3_5 border-t">
        <Link
          href={`/employees/${node.id}`}
          className="text-fn-accent-soft-fg font-fn-semibold inline-flex w-full cursor-pointer items-center justify-center text-[12.5px] hover:underline"
        >
          Open profile →
        </Link>
      </div>
    </div>
  );
}

/* ───────────────── Sub-components ───────────────── */

function KpiCell({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-4 gap-fn-2 flex flex-col border">
      <div className="gap-fn-2 text-fn-fg-muted font-fn-medium flex items-center text-[12px]">
        <span
          aria-hidden
          className="rounded-fn-xs h-fn-7 w-fn-7 bg-fn-icon-tile text-fn-icon-tile-fg inline-flex shrink-0 items-center justify-center"
        >
          {icon}
        </span>
        {label}
      </div>
      <div
        className="text-fn-fg font-fn-semibold leading-fn-unit text-[22px] tabular-nums"
        style={{ letterSpacing: '-0.025em' }}
      >
        {value}
      </div>
      <div className="text-fn-fg-faint text-[11.5px]">{sub}</div>
    </div>
  );
}

function ToolbarIconBtn({
  onClick,
  active,
  ariaLabel,
  bordered,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  ariaLabel: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'rounded-fn-xs h-fn-7 w-fn-7 inline-flex cursor-pointer items-center justify-center transition-colors',
        bordered && 'border-fn-border-strong bg-fn-bg-subtle border',
        active
          ? 'bg-fn-bg-panel text-fn-fg shadow-fn-xs'
          : 'text-fn-fg-muted hover:bg-fn-bg-panel hover:text-fn-fg',
      )}
    >
      {children}
    </button>
  );
}

function DeptChip({
  name,
  count,
  hue,
  active,
  onClick,
}: {
  name: string;
  count: number;
  hue?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-fn-full gap-fn-1_5 px-fn-2_5 py-fn-1 font-fn-medium inline-flex cursor-pointer items-center border text-[12px] transition-colors',
        active
          ? 'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg'
          : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
      )}
    >
      {hue != null && (
        <span
          aria-hidden
          className="rounded-fn-full h-fn-1_5 w-fn-1_5 inline-block"
          style={{ background: `oklch(0.55 0.16 ${hue})` }}
        />
      )}
      {name}
      <span className="text-fn-fg-faint text-[11px] tabular-nums">{count}</span>
    </button>
  );
}

/* ───────────────── Filter helper ───────────────── */

function matchesFilters(node: OrgChartNode, search: string, deptFilter: string): boolean {
  if (deptFilter !== 'All' && node.department !== deptFilter) return false;
  if (search) {
    const hay = `${node.fullName} ${node.designation} ${node.department} ${node.eid}`.toLowerCase();
    if (!hay.includes(search)) return false;
  }
  return true;
}

/* ───────────────── CSS connectors ─────────────────
 * Pseudo-element pattern from the design source. The vertical drops
 * + horizontal sibling connector are pure CSS — no SVG.
 */
const ORG_STYLES = `
.org-tree { display: inline-flex; flex-direction: column; align-items: center; vertical-align: top; padding: 0 4px; }
.org-tree-children {
  display: flex; align-items: flex-start; justify-content: center;
  gap: 0; padding-top: 0; margin-top: 24px; position: relative;
}
.org-tree-children::before {
  /* Line starts BELOW the parent-card's collapse button. The button is
   * a 20px circle centred on the card's bottom edge, so its lower edge
   * sits 10px below the card; the children container is 24px below
   * the card; we want the drop to fill the 14px gap between them so
   * the button reads as the head of the connector, not on top of it. */
  content: ''; position: absolute;
  top: -14px; left: 50%; transform: translateX(-50%);
  width: 2px; height: 14px;
  background: var(--fn-border-strong); border-radius: 99px;
}
.org-tree-child {
  position: relative;
  padding-top: 24px;
  padding-left: 4px;
  padding-right: 4px;
}
.org-tree-child::before {
  content: ''; position: absolute;
  top: 0; left: calc(50% - 1px);
  width: 2px; height: 24px;
  background: var(--fn-border-strong); border-radius: 99px;
}
.org-tree-child.has-sibs::after {
  content: ''; position: absolute;
  top: 0; height: 2px;
  background: var(--fn-border-strong); border-radius: 99px;
}
.org-tree-child.first::after { left: 50%; right: 0; }
.org-tree-child.last::after  { left: 0; right: 50%; }
.org-tree-child.middle::after { left: 0; right: 0; }
.org-tree-child.only::after { display: none; }
.org-tree-child.only::before {
  content: ''; position: absolute;
  top: 0; left: calc(50% - 1px);
  width: 2px; height: 24px;
  background: var(--fn-border-strong); border-radius: 99px;
}
`;
