'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type Choice = { value: string; label: React.ReactNode };

/**
 * A single-value select that submits with the surrounding form through
 * Base UI's hidden input. Pass `value`/`onValueChange` to control it.
 */
export function ChoiceSelect({
  name,
  id,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder = 'Choose…',
  className,
  required,
}: {
  name: string;
  id?: string;
  options: Choice[];
  defaultValue?: string | null;
  value?: string | null;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const items = options.map((o) => ({ value: o.value, label: o.label }));
  const controlled = value !== undefined;
  return (
    <Select
      name={name}
      items={items}
      required={required}
      {...(controlled
        ? { value, onValueChange: (v: string | null) => onValueChange?.(v ?? '') }
        : { defaultValue: defaultValue ?? null })}
    >
      <SelectTrigger id={id} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
