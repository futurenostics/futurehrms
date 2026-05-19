'use client';

import * as React from 'react';
import { FolderPlus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConditionLeafRow } from './condition-leaf';
import {
  deriveConnectors,
  newGroup,
  newLeaf,
  type ConditionGroup,
  type ConditionLeaf,
  type ConditionNode,
} from './types';
import type { EntityDef, FieldType } from '@/lib/queries/reminders';

/**
 * Recursive group node.
 *
 * Each pair of siblings has its own AND/OR connector — click the pill
 * between two rows to flip it. The group itself no longer carries a
 * single operator; the evaluator handles mixed connectors with
 * SQL-standard precedence (AND tighter than OR).
 *
 *     ┃ leaf 1
 *     ┃   [AND/OR]                ← clickable connector
 *     ┃ leaf 2
 *     ┃   [AND/OR]
 *     ┃ ┃ leaf 3                  ← nested group for explicit grouping
 *     ┃ ┃ leaf 4
 *     ┃ + Add condition · + Add group · ×
 *
 * Root group never shows the × remove button. Nested groups can be
 * removed which deletes the subtree.
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
  const connectors = deriveConnectors(group);

  function persist(nextConditions: ConditionNode[], nextConnectors: Array<'and' | 'or'>) {
    // Always emit canonical form: connectors[] only, no operator. The
    // BE accepts either; keeping legacy `operator` out avoids drift.
    const { operator: _legacy, ...rest } = group;
    void _legacy;
    onChange({ ...rest, conditions: nextConditions, connectors: nextConnectors });
  }

  function updateChild(index: number, next: ConditionNode) {
    const nextConditions = [...group.conditions];
    nextConditions[index] = next;
    persist(nextConditions, connectors);
  }
  function removeChild(index: number) {
    const nextConditions = group.conditions.filter((_, i) => i !== index);
    // Drop the connector to or from the removed child. Specifically:
    // if it had a predecessor, the connector at index-1 dies; if it
    // didn't, the connector at index dies (the first connector to
    // its successor).
    const nextConnectors = connectors.filter((_, i) => (index === 0 ? i !== 0 : i !== index - 1));
    persist(nextConditions, nextConnectors);
  }
  function addChild(node: ConditionNode) {
    const nextConditions = [...group.conditions, node];
    const nextConnectors =
      group.conditions.length === 0 ? connectors : [...connectors, 'and' as const];
    persist(nextConditions, nextConnectors);
  }
  function flipConnector(index: number) {
    const nextConnectors = [...connectors];
    nextConnectors[index] = nextConnectors[index] === 'and' ? 'or' : 'and';
    persist(group.conditions, nextConnectors);
  }

  // Border accent reflects the *first* connector — so the user can tell
  // at a glance whether a group leads with AND or OR. Mixed groups stay
  // with a neutral accent (border-fn-divider).
  const allAnd = connectors.length > 0 && connectors.every((c) => c === 'and');
  const allOr = connectors.length > 0 && connectors.every((c) => c === 'or');
  const accent = allAnd
    ? 'border-l-fn-accent/55'
    : allOr
      ? 'border-l-fn-warning/55'
      : 'border-l-fn-fg-faint/40';

  return (
    <div
      className={cn(
        'gap-fn-3 rounded-fn-xs bg-fn-bg-panel p-fn-3 flex flex-col border border-l-[3px]',
        accent,
        isRoot ? 'border-fn-border' : 'border-fn-divider ml-fn-2',
      )}
    >
      {!isRoot && !disabled && onRemove && (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove group"
            className="text-fn-fg-faint hover:text-fn-danger"
          >
            <X className="h-fn-4 w-fn-4" />
          </Button>
        </div>
      )}

      <div className="gap-fn-2 flex flex-col">
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
                  onChange={(next) => updateChild(i, next)}
                  onRemove={() => removeChild(i)}
                />
              ) : (
                <ConditionGroupBlock
                  group={child as ConditionGroup}
                  entities={entities}
                  operatorsByType={operatorsByType}
                  disabled={disabled}
                  depth={depth + 1}
                  onChange={(next) => updateChild(i, next)}
                  onRemove={() => removeChild(i)}
                />
              )}
              {i < group.conditions.length - 1 && (
                <ConnectorToggle
                  value={connectors[i] ?? 'and'}
                  disabled={disabled}
                  onClick={() => flipConnector(i)}
                />
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {!disabled && (
        <div className="gap-fn-2 flex flex-wrap items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addChild(newLeaf(entities))}
          >
            <Plus className="h-fn-3_5 w-fn-3_5" /> Condition
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addChild(newGroup(entities))}
          >
            <FolderPlus className="h-fn-3_5 w-fn-3_5" /> Group
          </Button>
          {connectors.length >= 2 && hasMixed(connectors) && (
            <span
              className="text-fn-fg-faint ml-auto text-[11px]"
              title="AND binds tighter than OR — A OR B AND C means A OR (B AND C)"
            >
              Mixed connectors · AND binds tighter
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectorToggle({
  value,
  disabled,
  onClick,
}: {
  value: 'and' | 'or';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="ml-fn-3 gap-fn-2 flex items-center">
      <span className="bg-fn-divider h-px flex-1" aria-hidden />
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={`Connector currently ${value.toUpperCase()} — click to switch`}
        className={cn(
          'rounded-fn-xs px-fn-2 py-fn-0_5 font-fn-semibold border text-[10.5px] uppercase tracking-[0.08em] transition-colors',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          value === 'and'
            ? 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent/30 hover:bg-fn-accent-soft/80'
            : 'bg-fn-warning-soft text-fn-warning-soft-fg border-fn-warning/30 hover:bg-fn-warning-soft/80',
        )}
      >
        {value}
      </button>
      <span className="bg-fn-divider h-px flex-1" aria-hidden />
    </div>
  );
}

function hasMixed(connectors: Array<'and' | 'or'>): boolean {
  return connectors.some((c) => c !== connectors[0]);
}
