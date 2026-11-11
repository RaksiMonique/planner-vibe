'use client';

import { PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Opens the browser's print dialog; "Save as PDF" there is the PDF export (instructions.md 9.3). */
export function PrintButton({ label = 'Print or save as PDF' }: { label?: string }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
      <PrinterIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}
