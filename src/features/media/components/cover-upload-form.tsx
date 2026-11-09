'use client';

import { useActionState } from 'react';
import { UploadIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { uploadCoverAction } from '../actions';

export function CoverUploadForm({ itemId }: { itemId: string }) {
  const [state, formAction] = useActionState(uploadCoverAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-2" encType="multipart/form-data">
      <input type="hidden" name="id" value={itemId} />
      <div className="flex items-center gap-2">
        <Input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label="Cover image"
          required
          className="text-xs"
        />
        <SubmitButton size="sm" variant="outline" pendingLabel="Uploading…">
          <UploadIcon data-icon="inline-start" />
          Upload cover
        </SubmitButton>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}
