'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldPicker } from './field-picker';
import { ValueInput } from './value-input';
import { defaultOperatorFor, defaultValueFor, type ConditionLeaf } from './types';
import type { DateRole, EntityDef, FieldType } from '@/lib/queries/reminders';

/**
 * A single leaf row: [field-picker] [operator-select] [value-input] [remove].
 *
 * Layout matches the design's filter row pattern — field picker takes
 * the largest slice, operator a fixed ~170px, value the rest. On
 * narrow widths it wraps; the parent group keeps a fixed left indent
 * for nesting depth.
 */
export function ConditionLeafRow({
  leaf,
  entities,
  operatorsByType,
  dateOperatorsByRole,
  onChange,
  onRemove,
  disabled,
}: {
  leaf: ConditionLeaf;
  entities: EntityDef[];
  operatorsByType: Record<FieldType, Array<{ id: string; label: string }>>;
  dateOperatorsByRole: Record<DateRole, string[]>;
  onChange: (next: ConditionLeaf) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const field = React.useMemo(() => {
    for (const e of entities) {
      for (const f of e.fields) {
        if (f.path === leaf.field) return f;
      }
    }
    return null;
  }, [entities, leaf.field]);

  const operators = React.useMemo(() => {
    if (!field) return [];
    const base = operatorsByType[field.type] ?? [];
    // Date fields with a semantic role get filtered down to the
    // operators that can actually match — e.g. "is today" is hidden
    // on Date of birth since it would only fire for a literal newborn.
    if (field.type === 'date' && field.dateRole) {
      const allowed = new Set(dateOperatorsByRole[field.dateRole] ?? []);
      return base.filter((op) => allowed.has(op.id));
    }
    return base;
  }, [field, operatorsByType, dateOperatorsByRole]);

  return (
    <div className="gap-fn-2 flex flex-wrap items-start">
      <div className="min-w-[200px] flex-1">
        <FieldPicker
          entities={entities}
          value={leaf.field}
          disabled={disabled}
          onChange={(path, nextField) => {
            // Field changed → reset operator + value to typed defaults.
            const op = defaultOperatorFor(nextField.type, nextField);
            onChange({
              ...leaf,
              field: path,
              operator: op,
              value: defaultValueFor(op, nextField.type),
            });
          }}
        />
      </div>

      <div className="w-[170px]">
        <Select
          value={leaf.operator}
          disabled={disabled || !field}
          onValueChange={(op) => {
            onChange({
              ...leaf,
              operator: op,
              value: defaultValueFor(op, field?.type ?? 'string'),
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[160px] flex-1">
        <ValueInput
          field={field}
          operator={leaf.operator}
          value={leaf.value}
          disabled={disabled}
          onChange={(v) => onChange({ ...leaf, value: v })}
        />
      </div>

      {!disabled && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove condition"
          className="text-fn-fg-faint hover:text-fn-danger"
        >
          <X className="h-fn-4 w-fn-4" />
        </Button>
      )}
    </div>
  );
}
