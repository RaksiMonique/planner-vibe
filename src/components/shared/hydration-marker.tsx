'use client';

import { useEffect } from 'react';

/**
 * Marks the document once React has hydrated. Playwright waits for it before
 * interacting, because a click or keypress that lands before hydration is
 * lost. Renders nothing.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true';
  }, []);
  return null;
}
