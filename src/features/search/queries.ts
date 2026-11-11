import 'server-only';
import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  bibleStudies,
  courses,
  events,
  gifts,
  goals,
  habits,
  importantRecords,
  journalEntries,
  mediaItems,
  notes,
  prayerEntries,
  products,
  projects,
  recipes,
  routines,
  tasks,
  visionBoards,
} from '@/db/schema';
import { hrefFor, isSearchType, type SearchHit, type SearchType } from './results';
import { SEARCH_DEFAULT_LIMIT } from './schema';

export type { SearchHit, SearchType } from './results';

/**
 * One UNION ALL branch per searchable table. `title` and `body` are the text
 * shown for a hit; `extra` is the one detail the href needs (a day), if any.
 * `where` adds a per-branch condition on top of owner, soft delete and match.
 */
type Branch = {
  type: SearchType;
  table: PgTable & { userId: PgColumn; deletedAt: PgColumn; search: PgColumn; id: PgColumn };
  title: SQL | PgColumn;
  body: SQL | PgColumn;
  extra?: SQL;
  where?: SQL;
  updatedAt: PgColumn;
};

const text = (col: PgColumn) => sql`coalesce(${col}, '')`;
const join = (...cols: PgColumn[]) =>
  sql.join(
    cols.map((c) => text(c)),
    sql` || ' ' || `
  );
/** A title that falls back to the start of the content when the record has none. */
const titleOr = (title: PgColumn, content: PgColumn) =>
  sql`coalesce(nullif(${title}, ''), left(${content}, 80))`;

/**
 * Sensitive records (instructions.md 8.19, 8.23) still match on their notes,
 * but the palette shows only their title: an empty body gives an empty snippet.
 */
const nothing = sql`''`;

const BRANCHES: Branch[] = [
  {
    type: 'task',
    table: tasks,
    title: tasks.title,
    body: text(tasks.notes),
    updatedAt: tasks.updatedAt,
  },
  {
    type: 'goal',
    table: goals,
    title: goals.title,
    body: text(goals.description),
    updatedAt: goals.updatedAt,
  },
  {
    type: 'project',
    table: projects,
    title: projects.title,
    body: text(projects.description),
    updatedAt: projects.updatedAt,
  },
  {
    type: 'event',
    table: events,
    title: events.title,
    body: join(events.description, events.location),
    extra: sql`coalesce(${events.allDayDate}::text, to_char(${events.startsAt}, 'YYYY-MM-DD'))`,
    updatedAt: events.updatedAt,
  },
  {
    type: 'note',
    table: notes,
    title: titleOr(notes.title, notes.content),
    body: notes.content,
    where: sql`${notes.kind} = 'note'`,
    updatedAt: notes.updatedAt,
  },
  {
    type: 'quote',
    table: notes,
    title: titleOr(notes.title, notes.content),
    body: join(notes.content, notes.author, notes.source),
    where: sql`${notes.kind} = 'quote'`,
    updatedAt: notes.updatedAt,
  },
  {
    type: 'journal',
    table: journalEntries,
    title: titleOr(journalEntries.title, journalEntries.content),
    body: journalEntries.content,
    extra: sql`${journalEntries.date}::text`,
    updatedAt: journalEntries.updatedAt,
  },
  { type: 'habit', table: habits, title: habits.name, body: nothing, updatedAt: habits.updatedAt },
  {
    type: 'routine',
    table: routines,
    title: routines.name,
    body: nothing,
    updatedAt: routines.updatedAt,
  },
  {
    type: 'recipe',
    table: recipes,
    title: recipes.title,
    body: join(recipes.description, recipes.notes),
    updatedAt: recipes.updatedAt,
  },
  {
    type: 'media',
    table: mediaItems,
    title: mediaItems.title,
    body: join(mediaItems.creator, mediaItems.notes),
    updatedAt: mediaItems.updatedAt,
  },
  {
    type: 'bible_study',
    table: bibleStudies,
    title: bibleStudies.title,
    body: text(bibleStudies.description),
    updatedAt: bibleStudies.updatedAt,
  },
  {
    type: 'prayer',
    table: prayerEntries,
    title: prayerEntries.title,
    body: text(prayerEntries.content),
    extra: sql`${prayerEntries.date}::text`,
    updatedAt: prayerEntries.updatedAt,
  },
  {
    type: 'course',
    table: courses,
    title: courses.title,
    body: text(courses.notes),
    updatedAt: courses.updatedAt,
  },
  {
    type: 'important',
    table: importantRecords,
    title: importantRecords.title,
    body: nothing,
    updatedAt: importantRecords.updatedAt,
  },
  {
    type: 'gift',
    table: gifts,
    title: gifts.title,
    body: text(gifts.notes),
    updatedAt: gifts.updatedAt,
  },
  {
    type: 'vision_board',
    table: visionBoards,
    title: visionBoards.name,
    body: text(visionBoards.description),
    updatedAt: visionBoards.updatedAt,
  },
  {
    type: 'product',
    table: products,
    title: products.name,
    body: nothing,
    updatedAt: products.updatedAt,
  },
];

type Row = {
  type: string;
  id: string;
  title: string;
  snippet: string | null;
  extra: string | null;
  rank: number;
  updated_at: Date | string;
};

/**
 * Full-text search over everything the user owns (instructions.md 9.5) in one
 * statement: a UNION ALL over the stored `search` tsvector of every searchable
 * table, ranked, then the best `limit` rows get a highlighted snippet.
 *
 * The query goes through `websearch_to_tsquery`, so quotes, `or` and `-`
 * work. When it ends in a plain word, that word also matches as a prefix, so
 * the palette finds "habits" while the user is still typing "habi". Rows that
 * only satisfy a negation rank zero and are left out. The headline is computed
 * after the limit, for the rows shown, not for every match.
 */
export async function searchEverything(
  userId: string,
  query: string,
  limit = SEARCH_DEFAULT_LIMIT
): Promise<SearchHit[]> {
  const branches = BRANCHES.map(
    (b) => sql`
      select ${b.type}::text as type,
        ${b.table.id}::text as id,
        ${b.title} as title,
        ${b.body} as body,
        ${b.extra ?? sql`null::text`} as extra,
        ts_rank(${b.table.search}, q.query) as rank,
        ${b.updatedAt} as updated_at
      from ${b.table}, q
      where ${b.table.userId} = ${userId}
        and ${b.table.deletedAt} is null
        ${b.where ? sql`and ${b.where}` : sql``}
        and ${b.table.search} @@ q.query`
  );

  const statement = sql`
    with raw as (select websearch_to_tsquery('english', ${query}) as tq),
    q as (
      select case
        when tq::text ~ '''$' then (tq::text || ':*')::tsquery
        else tq
      end as query
      from raw
    ),
    ranked as (
      select * from (${sql.join(branches, sql` union all `)}) as hits
      where rank > 0
      order by rank desc, updated_at desc
      limit ${limit}
    )
    select ranked.type, ranked.id, ranked.title, ranked.extra, ranked.rank, ranked.updated_at,
      ts_headline('english', ranked.body, q.query,
        'MaxFragments=1, MaxWords=18, MinWords=8, StartSel=<mark>, StopSel=</mark>') as snippet
    from ranked, q
    order by ranked.rank desc, ranked.updated_at desc`;

  const rows = (await db.execute(statement)) as unknown as Row[];
  const hits: SearchHit[] = [];
  for (const row of rows) {
    if (!isSearchType(row.type)) continue;
    const snippet = (row.snippet ?? '').replace(/\s+/g, ' ').trim();
    hits.push({
      type: row.type,
      id: row.id,
      title: row.title || 'Untitled',
      snippet,
      href: hrefFor({ type: row.type, id: row.id, extra: row.extra }),
      rank: Number(row.rank),
      updatedAt: new Date(row.updated_at).toISOString(),
    });
  }
  return hits;
}
