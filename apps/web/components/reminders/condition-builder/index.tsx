'use client';

import * as React from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFieldCatalog } from '@/lib/queries/reminders';
import { ConditionGroupBlock } from './condition-group';
import { countLeaves, newGroup, type ConditionGroup } from './types';

/**
 * Public entry point for the condition tree editor.
 *
 *   <ConditionBuilder value={tree} onChange={setTree} disabled={…} />
 *
 * - `value` is the root group, or null/undefined for "no conditions".
 * - When null, the body renders an empty hint with an "Add condition"
 *   CTA. Clicking it seeds a default root group with a single leaf.
 * - When set, the recursive group block renders the tree.
 *
 * Disabled view is automatic when the parent passes `disabled`.
 *
 * The field catalog is fetched once per session via TanStack Query
 * (10-minute stale time). While it's loading we show a small spinner
 * row so the parent layout doesn't jump.
 */
export interface ConditionBuilderProps {
  value: ConditionGroup | null | undefined;
  onChange: (next: ConditionGroup | null) => void;
  disabled?: boolean;
}

export function ConditionBuilder({ value, onChange, disabled }: ConditionBuilderProps) {
  const catalog = useFieldCatalog();
  const entities = catalog.data?.entities ?? [];
  const operators = catalog.data?.operators ?? {
    string: [],
    number: [],
    date: [],
    boolean: [],
    enum: [],
  };

  if (catalog.isPending) {
    return (
      <div className="gap-fn-2 flex items-center">
        <Loader2 className="text-fn-fg-faint h-fn-4 w-fn-4 animate-spin" />
        <Skeleton className="h-fn-9 flex-1" />
      </div>
    );
  }

  if (!value) {
    return (
      <div className="rounded-fn-xs border-fn-border bg-fn-bg-subtle/40 gap-fn-3 px-fn-4 py-fn-5 flex flex-col items-start border border-dashed">
        <div className="gap-fn-1 flex items-center">
          <Filter className="text-fn-fg-faint h-fn-4 w-fn-4" />
          <span className="text-fn-fg font-fn-semibold text-[13px]">No conditions</span>
        </div>
        <p className="text-fn-fg-muted max-w-[520px] text-[12px]">
          This rule fires for every entity the trigger surfaces. Add conditions if you want to
          narrow the audience — e.g. only employees in a certain department, only projects on hold,
          only commission runs above a threshold.
        </p>
        {!disabled && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(newGroup(entities))}
          >
            <Filter className="h-fn-3_5 w-fn-3_5" /> Add first condition
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <ConditionGroupBlock
        group={value}
        entities={entities}
        operatorsByType={operators}
        disabled={disabled}
        isRoot
        onChange={(next) => onChange(next)}
      />
      {!disabled && (
        <div className="gap-fn-1 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-fn-fg-muted"
          >
            Clear all conditions
          </Button>
          <span className="text-fn-fg-faint text-[11px]">
            ({countLeaves(value)} {countLeaves(value) === 1 ? 'condition' : 'conditions'})
          </span>
        </div>
      )}
    </div>
  );
}

export { countLeaves } from './types';
export type { ConditionGroup } from './types';
