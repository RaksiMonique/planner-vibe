import type { ActionResult } from '@/lib/action-result';

export function FormStatus({
  state,
  savedText,
}: {
  state: ActionResult | null;
  savedText: string;
}) {
  if (!state) return null;
  if (state.ok) return <p className="text-muted-foreground text-sm">{savedText}</p>;
  return (
    <p role="alert" className="text-destructive text-sm">
      {state.error}
    </p>
  );
}
