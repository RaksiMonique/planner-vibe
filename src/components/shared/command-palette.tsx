'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CornerDownLeftIcon, InboxIcon, LoaderCircleIcon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { CURRENT_RELEASE, navGroups, type NavItem } from '@/components/layout/nav-config';
import { addCaptureAction } from '@/features/capture/actions';
import { searchAction } from '@/features/search/actions';
import {
  groupHits,
  matchNavItems,
  splitHighlights,
  type SearchHit,
} from '@/features/search/results';
import { SEARCH_QUERY_MAX } from '@/features/search/schema';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 200;

type PaletteItem =
  | { kind: 'nav'; id: string; item: NavItem }
  | { kind: 'hit'; id: string; hit: SearchHit }
  | { kind: 'capture'; id: string; text: string };

type PaletteGroup = { id: string; label: string; items: PaletteItem[] };

type SearchStatus = 'idle' | 'searching' | 'done' | 'error';

/**
 * Search and quick capture from anywhere (instructions.md 9.5). Opens with
 * Ctrl or Cmd + K or the header button, searches as the user types, and lists
 * matching pages, records grouped by type, and a capture to the Inbox.
 * One text input holds focus; the list is a listbox driven by the arrow keys.
 */
export function CommandPalette({
  enabledModules,
}: {
  enabledModules?: Partial<Record<string, boolean>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);
  const listboxId = useId();

  const pages = useMemo(
    () =>
      navGroups
        .flatMap((g) => g.items)
        .filter(
          (item) =>
            item.release <= CURRENT_RELEASE &&
            (!item.module || enabledModules?.[item.module] !== false)
        ),
    [enabledModules]
  );

  const trimmed = query.trim();
  const groups = useMemo<PaletteGroup[]>(() => {
    if (!trimmed) return [];
    const out: PaletteGroup[] = [];
    const nav = matchNavItems(pages, trimmed);
    if (nav.length > 0) {
      out.push({
        id: 'pages',
        label: 'Pages',
        items: nav.map((item) => ({ kind: 'nav', id: `nav:${item.href}`, item })),
      });
    }
    for (const group of groupHits(hits)) {
      out.push({
        id: `type:${group.type}`,
        label: group.label,
        items: group.hits.map((hit) => ({ kind: 'hit', id: `hit:${hit.type}:${hit.id}`, hit })),
      });
    }
    out.push({
      id: 'capture',
      label: 'Quick capture',
      items: [{ kind: 'capture', id: 'capture', text: trimmed }],
    });
    return out;
  }, [trimmed, pages, hits]);
  const items = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeIndex = items.length === 0 ? -1 : Math.min(active, items.length - 1);
  const activeId = activeIndex >= 0 ? optionId(listboxId, items[activeIndex].id) : undefined;

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    request.current += 1;
    setQuery('');
    setHits([]);
    setStatus('idle');
    setError(null);
    setNotice(null);
    setActive(0);
  }, []);

  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) reset();
    },
    [reset]
  );

  // Ctrl or Cmd + K from anywhere in the app toggles the palette.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!e.repeat) changeOpen(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, changeOpen]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    setActive(0);
    setNotice(null);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    const id = ++request.current;
    const q = value.trim();
    if (!q) {
      setHits([]);
      setStatus('idle');
      return;
    }
    setStatus('searching');
    timer.current = setTimeout(async () => {
      const result = await searchAction({ query: q });
      if (request.current !== id) return; // a newer query is in flight
      if (result.ok) {
        setHits(result.data);
        setStatus('done');
      } else {
        setHits([]);
        setStatus('error');
        setError(result.error);
      }
    }, DEBOUNCE_MS);
  }

  async function run(item: PaletteItem) {
    if (busy) return;
    if (item.kind === 'nav') {
      changeOpen(false);
      router.push(item.item.href);
      return;
    }
    if (item.kind === 'hit') {
      changeOpen(false);
      router.push(item.hit.href);
      return;
    }
    const formData = new FormData();
    formData.set('text', item.text);
    setBusy(true);
    try {
      const result = await addCaptureAction(undefined, formData);
      if (result?.ok) {
        if (timer.current) clearTimeout(timer.current);
        request.current += 1;
        setQuery('');
        setHits([]);
        setStatus('idle');
        setActive(0);
        setNotice(`Captured “${item.text}” to the Inbox.`);
        inputRef.current?.focus();
      } else {
        setError(result?.error ?? 'That could not be captured.');
      }
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((activeIndex + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((activeIndex - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) void run(items[activeIndex]);
        break;
    }
  }

  const expanded = items.length > 0;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => changeOpen(true)}
      >
        <SearchIcon />
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          showCloseButton={false}
          initialFocus={inputRef}
          className={cn(
            'flex max-h-dvh flex-col gap-0 overflow-hidden p-0',
            // A full-height sheet on phones, a centred panel below the top on wider screens.
            'top-0 left-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none',
            'sm:top-[12vh] sm:left-1/2 sm:h-auto sm:max-h-[min(70vh,36rem)] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-xl'
          )}
        >
          <DialogTitle className="sr-only">Search the planner</DialogTitle>
          <DialogDescription className="sr-only">
            Type to search every record, jump to a page, or capture a thought to the Inbox.
          </DialogDescription>
          <div className="flex items-center gap-2 border-b px-3">
            {status === 'searching' ? (
              <LoaderCircleIcon
                className="text-muted-foreground size-4 shrink-0 animate-spin"
                aria-hidden
              />
            ) : (
              <SearchIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            )}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Search the planner"
              aria-expanded={expanded}
              aria-controls={listboxId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-busy={status === 'searching' || busy}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              maxLength={SEARCH_QUERY_MAX}
              placeholder="Search tasks, goals, notes, recipes…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              className="placeholder:text-muted-foreground h-12 w-full min-w-0 bg-transparent text-base outline-none"
            />
            <DialogClose
              render={<Button variant="ghost" size="icon-sm" aria-label="Close search" />}
            >
              <XIcon />
            </DialogClose>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label="Results"
            className="min-h-0 flex-1 overflow-y-auto p-2"
          >
            {notice && (
              <p
                role="status"
                className="bg-secondary text-secondary-foreground mb-2 rounded-lg px-3 py-2 text-sm"
              >
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="text-destructive mb-2 px-3 py-2 text-sm">
                {error}
              </p>
            )}
            {!trimmed && !notice && (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                Search everything you have planned, or type a page name to jump to it.
              </p>
            )}
            {trimmed && status === 'done' && hits.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-sm">
                Nothing matches “{trimmed}” yet.
              </p>
            )}
            {groups.map((group) => {
              const headingId = `${listboxId}-${group.id}`;
              return (
                <div key={group.id} role="group" aria-labelledby={headingId} className="mb-1">
                  <p
                    id={headingId}
                    role="presentation"
                    className="tracking-eyebrow text-muted-foreground px-3 pt-2 pb-1 text-[11px] font-medium uppercase"
                  >
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const index = items.indexOf(item);
                    const selected = index === activeIndex;
                    return (
                      <div
                        key={item.id}
                        id={optionId(listboxId, item.id)}
                        role="option"
                        aria-selected={selected}
                        tabIndex={-1}
                        onMouseMove={() => index !== activeIndex && setActive(index)}
                        onClick={() => void run(item)}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm',
                          selected ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted/60'
                        )}
                      >
                        <PaletteRow item={item} selected={selected} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="text-muted-foreground hidden items-center gap-3 border-t px-3 py-2 text-[11px] sm:flex">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
            </span>
            <span>
              <Kbd>Enter</Kbd> to open
            </span>
            <span>
              <Kbd>Esc</Kbd> to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function optionId(listboxId: string, itemId: string) {
  return `${listboxId}-opt-${itemId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function PaletteRow({ item, selected }: { item: PaletteItem; selected: boolean }) {
  if (item.kind === 'nav') {
    const Icon = item.item.icon;
    return (
      <>
        <Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{item.item.label}</span>
          <span className="text-muted-foreground block truncate text-xs">{item.item.href}</span>
        </span>
        {selected && <EnterHint />}
      </>
    );
  }
  if (item.kind === 'capture') {
    return (
      <>
        <InboxIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Capture “{item.text}” to the Inbox</span>
          <span className="text-muted-foreground block text-xs">
            Keep the thought now, file it from the dashboard later.
          </span>
        </span>
        {selected && <EnterHint />}
      </>
    );
  }
  const parts = splitHighlights(item.hit.snippet);
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium">{item.hit.title}</span>
      {parts.length > 0 && (
        <span className="text-muted-foreground block truncate text-xs">
          {parts.map((part, i) =>
            part.match ? (
              <mark key={i} className="bg-accent/60 text-foreground rounded-xs">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </span>
      )}
    </span>
  );
}

function EnterHint() {
  return (
    <CornerDownLeftIcon
      className="text-muted-foreground mt-1 hidden size-3.5 shrink-0 sm:block"
      aria-hidden
    />
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted text-foreground rounded-sm border px-1 font-sans text-[10px]">
      {children}
    </kbd>
  );
}
