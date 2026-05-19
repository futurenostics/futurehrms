'use client';

import * as React from 'react';
import { ChevronsDown, FolderPlus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConditionLeafRow } from './condition-leaf';
import {
  newGroup,
  newLeaf,
  type ConditionGroup,
  type ConditionLeaf,
  type ConditionNode,
} from './types';
import type { EntityDef, FieldType } from '@/lib/queries/reminders';

/**
 * A group node — owns an AND/OR operator and a list of child
 * conditions (leaves or nested groups). Renders as a left-bordered
 * panel; the border colour swaps with the operator so AND-vs-OR is
 * visually obvious without reading the chip.
 *
 *     ┃ [AND][OR]
 *     ┃   leaf 1
 *     ┃   leaf 2
 *     ┃   ┃ [AND][OR]
 *     ┃   ┃   leaf 3
 *     ┃   ┃   leaf 4
 *     ┃ + Add condition · + Add group · ×
 *
 * Root group never shows the × remove button (the whole rule still
 * needs a group). Nested groups can be removed which deletes the
 * subtree.
 */
export function ConditionGroupBlock({
  group,
  entities,
  operatorsByType,
  onChange,
  onRemove,
  isRoot = false,
  depth = 0,
  disabled,
}: {
  group: ConditionGroup;
  entities: EntityDef[];
  operatorsByType: Record<FieldType, Array<{ id: string; label: string }>>;
  onChange: (next: ConditionGroup) => void;
  onRemove?: () => void;
  isRoot?: boolean;
  depth?: number;
  disabled?: boolean;
}) {
  function update(index: number, next: ConditionNode) {
    const conditions = [...group.conditions];
    conditions[index] = next;
    onChange({ ...group, conditions });
  }
  function remove(index: number) {
    const conditions = group.conditions.filter((_, i) => i !== index);
    onChange({ ...group, conditions });
  }
  function addLeaf() {
    onChange({ ...group, conditions: [...group.conditions, newLeaf(entities)] });
  }
  function addGroup() {
    onChange({ ...group, conditions: [...group.conditions, newGroup(entities)] });
  }
  function setOperator(op: 'and' | 'or') {
    onChange({ ...group, operator: op });
  }

  const accent = group.operator === 'and' ? 'border-l-fn-accent/55' : 'border-l-fn-warning/55';

  return (
    <div
      className={cn(
        'gap-fn-3 rounded-fn-xs bg-fn-bg-panel p-fn-3 flex flex-col border border-l-[3px]',
        accent,
        isRoot ? 'border-fn-border' : 'border-fn-divider ml-fn-2',
      )}
    >
      <div className="gap-fn-2 flex items-center">
        <div className="rounded-fn-xs border-fn-border bg-fn-bg-inset gap-fn-px inline-flex overflow-hidden border p-[2px]">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOperator('and')}
            className={cn(
              'rounded-fn-xs-low px-fn-2_5 py-fn-0_5 font-fn-semibold cursor-pointer text-[11px] uppercase tracking-[0.06em] transition-colors',
              group.operator === 'and'
                ? 'bg-fn-accent text-fn-accent-fg'
                : 'text-fn-fg-muted hover:text-fn-fg',
            )}
          >
            And
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOperator('or')}
            className={cn(
              'rounded-fn-xs-low px-fn-2_5 py-fn-0_5 font-fn-semibold cursor-pointer text-[11px] uppercase tracking-[0.06em] transition-colors',
              group.operator === 'or'
                ? 'bg-fn-warning text-fn-warning-fg'
                : 'text-fn-fg-muted hover:text-fn-fg',
            )}
          >
            Or
          </button>
        </div>
        <span className="text-fn-fg-faint text-[11.5px]">
          {group.operator === 'and' ? 'All conditions must match' : 'Any condition is enough'}
        </span>
        {!isRoot && !disabled && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove group"
            className="text-fn-fg-faint hover:text-fn-danger ml-auto"
          >
            <X className="h-fn-4 w-fn-4" />
          </Button>
        )}
      </div>

      <div className="gap-fn-2_5 flex flex-col">
        {group.conditions.length === 0 ? (
          <p className="text-fn-fg-faint text-[12px] italic">
            No conditions yet — this group matches everything.
          </p>
        ) : (
          group.conditions.map((child, i) => (
            <React.Fragment key={i}>
              {child.kind === 'leaf' ? (
                <ConditionLeafRow
                  leaf={child as ConditionLeaf}
                  entities={entities}
                  operatorsByType={operatorsByType}
                  disabled={disabled}
                  onChange={(next) => update(i, next)}
                  onRemove={() => remove(i)}
                />
              ) : (
                <ConditionGroupBlock
                  group={child as ConditionGroup}
                  entities={entities}
                  operatorsByType={operatorsByType}
                  disabled={disabled}
                  depth={depth + 1}
                  onChange={(next) => update(i, next)}
                  onRemove={() => remove(i)}
                />
              )}
              {i < group.conditions.length - 1 && (
                <div className="gap-fn-2 text-fn-fg-faint ml-fn-1 flex items-center text-[10.5px] uppercase tracking-[0.08em]">
                  <ChevronsDown className="h-fn-3 w-fn-3" />
                  {group.operator}
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {!disabled && (
        <div className="gap-fn-2 flex flex-wrap items-center">
          <Button type="button" variant="ghost" size="sm" onClick={addLeaf}>
            <Plus className="h-fn-3_5 w-fn-3_5" /> Condition
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={addGroup}>
            <FolderPlus className="h-fn-3_5 w-fn-3_5" /> Group
          </Button>
        </div>
      )}
    </div>
  );
}
