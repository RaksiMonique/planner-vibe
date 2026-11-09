/**
 * Development seed. Idempotent: safe to run repeatedly against the dev project.
 *
 *   SEED_USER_ID=<auth user uuid> npm run db:seed
 *
 * SEED_USER_ID must be an existing Supabase auth user whose profile row exists
 * (sign in once so the on_auth_user_created trigger creates it).
 */
import { addDays, format, subDays } from 'date-fns';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const userId = process.env.SEED_USER_ID;
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!userId) {
  console.error(
    'SEED_USER_ID is required: the uuid of an existing Supabase auth user (profiles.id).\n' +
      'Example: SEED_USER_ID=00000000-0000-0000-0000-000000000000 npm run db:seed'
  );
  process.exit(1);
}
if (!url) {
  console.error('DIRECT_URL or DATABASE_URL is required (see .env.example).');
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });
const {
  calendars,
  captures,
  goals,
  habitCheckIns,
  habits,
  lifeSegments,
  profiles,
  projects,
  routineSteps,
  routines,
  tasks,
} = schema;

const day = (offset: number) =>
  format(offset >= 0 ? addDays(new Date(), offset) : subDays(new Date(), -offset), 'yyyy-MM-dd');

/** The ten default Life Segments (instructions.md 1.3). */
const DEFAULT_SEGMENTS: Array<{
  name: string;
  slug: string;
  accent: schema.Accent;
  icon: string;
}> = [
  { name: 'Faith', slug: 'faith', accent: 'burgundy', icon: 'church' },
  { name: 'Finance', slug: 'finance', accent: 'terracotta', icon: 'wallet' },
  { name: 'Family', slug: 'family', accent: 'coral', icon: 'users' },
  { name: 'Health & Wellness', slug: 'health-wellness', accent: 'sage', icon: 'heart-pulse' },
  { name: 'Career & Work', slug: 'career-work', accent: 'burgundy', icon: 'briefcase' },
  {
    name: 'Education & Learning',
    slug: 'education-learning',
    accent: 'terracotta',
    icon: 'graduation-cap',
  },
  { name: 'Personal Development', slug: 'personal-development', accent: 'sage', icon: 'sprout' },
  { name: 'Lifestyle & Home', slug: 'lifestyle-home', accent: 'peach', icon: 'house' },
  { name: 'Relationships', slug: 'relationships', accent: 'coral', icon: 'heart' },
  { name: 'Recreation', slug: 'recreation', accent: 'beige', icon: 'palmtree' },
];

async function main(uid: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, uid)).limit(1);
  if (!profile) {
    throw new Error(
      `No profiles row for ${uid}. Sign in once so the on_auth_user_created trigger creates it.`
    );
  }
  console.log(`Seeding for ${profile.email}`);

  // Life Segments: upsert on (user_id, slug).
  const segmentRows = await db
    .insert(lifeSegments)
    .values(DEFAULT_SEGMENTS.map((s, i) => ({ ...s, userId: uid, sortOrder: i, isDefault: true })))
    .onConflictDoUpdate({
      target: [lifeSegments.userId, lifeSegments.slug],
      set: { isDefault: true },
    })
    .returning();
  const seg = Object.fromEntries(segmentRows.map((s) => [s.slug, s.id]));
  console.log(`  ${segmentRows.length} life segments`);

  // Calendars: upsert on (user_id, name).
  await db
    .insert(calendars)
    .values([
      { userId: uid, name: 'Personal', kind: 'personal', accent: 'burgundy' },
      { userId: uid, name: 'Work', kind: 'work', accent: 'terracotta' },
    ])
    .onConflictDoNothing({ target: [calendars.userId, calendars.name] });
  console.log('  2 calendars');

  // Goals: a lifelong → annual → quarterly chain in Finance (instructions.md 7.2).
  async function findOrCreateGoal(values: Omit<schema.NewGoal, 'userId'>): Promise<schema.Goal> {
    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, uid), eq(goals.title, values.title)))
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(goals)
      .values({ ...values, userId: uid })
      .returning();
    return created;
  }
  const lifelong = await findOrCreateGoal({
    lifeSegmentId: seg.finance,
    horizon: 'lifelong',
    title: 'Financial independence',
    status: 'active',
    progress: 12,
  });
  const annual = await findOrCreateGoal({
    lifeSegmentId: seg.finance,
    parentGoalId: lifelong.id,
    horizon: 'annual',
    title: 'Increase investment assets',
    status: 'active',
    targetDate: `${new Date().getFullYear()}-12-31`,
    targetValue: '12000.00',
    currentValue: '4500.00',
    unit: 'JMD',
    progress: 38,
  });
  const quarterly = await findOrCreateGoal({
    lifeSegmentId: seg.finance,
    parentGoalId: annual.id,
    horizon: 'quarterly',
    title: 'Reach savings milestone',
    status: 'active',
    targetDate: day(60),
    progress: 50,
  });
  console.log('  3 goals');

  // Project.
  let [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, uid), eq(projects.title, 'Build the Life Planner website')))
    .limit(1);
  if (!project) {
    [project] = await db
      .insert(projects)
      .values({
        userId: uid,
        lifeSegmentId: seg['career-work'],
        title: 'Build the Life Planner website',
        description: 'Release 0 to Release 6 as described in instructions.md.',
        status: 'active',
        startDate: day(-14),
        dueDate: day(120),
        progress: 10,
      })
      .returning();
  }
  console.log('  1 project');

  // Tasks.
  const taskSeeds: Array<Omit<schema.NewTask, 'userId'>> = [
    {
      lifeSegmentId: seg.finance,
      goalId: quarterly.id,
      title: 'Review investments',
      priority: 'high',
      isImportant: true,
      dueDate: day(0),
    },
    {
      lifeSegmentId: seg['career-work'],
      projectId: project.id,
      title: 'Approve the Release 0 schema',
      priority: 'high',
      isImportant: true,
      dueDate: day(1),
    },
    {
      lifeSegmentId: seg['health-wellness'],
      title: 'Book dentist appointment',
      priority: 'medium',
      dueDate: day(-2),
    },
    {
      lifeSegmentId: seg.family,
      title: 'Call Mom',
      priority: 'medium',
      dueDate: day(3),
      rrule: 'FREQ=WEEKLY;BYDAY=SU',
    },
    {
      lifeSegmentId: seg['lifestyle-home'],
      title: 'Grocery run',
      priority: 'low',
      dueDate: day(5),
    },
    {
      lifeSegmentId: seg['education-learning'],
      title: 'Read one chapter of the Drizzle docs',
      priority: 'low',
      dueDate: day(7),
      status: 'done',
      completedAt: new Date(),
    },
  ];
  let createdTasks = 0;
  for (const t of taskSeeds) {
    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.userId, uid), eq(tasks.title, t.title)))
      .limit(1);
    if (existing) continue;
    await db.insert(tasks).values({ ...t, userId: uid });
    createdTasks++;
  }
  console.log(`  ${createdTasks} new tasks (${taskSeeds.length} total)`);

  // Habits with two weeks of check-ins.
  const habitSeeds: Array<Omit<schema.NewHabit, 'userId'>> = [
    { lifeSegmentId: seg.faith, name: 'Morning prayer', frequency: 'daily', accent: 'burgundy' },
    {
      lifeSegmentId: seg['health-wellness'],
      name: 'Drink 2L of water',
      frequency: 'daily',
      accent: 'sage',
    },
    {
      lifeSegmentId: seg['education-learning'],
      name: 'Read for 20 minutes',
      frequency: 'daily',
      accent: 'terracotta',
    },
  ];
  for (const [i, h] of habitSeeds.entries()) {
    let [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, uid), eq(habits.name, h.name)))
      .limit(1);
    if (!habit) {
      [habit] = await db
        .insert(habits)
        .values({ ...h, userId: uid })
        .returning();
    }
    // Skip every (i + 3)rd day so streaks and completion rates look real.
    const checkIns = Array.from({ length: 14 }, (_, d) => d)
      .filter((d) => d % (i + 3) !== 0)
      .map((d) => ({ userId: uid, habitId: habit.id, date: day(-d) }));
    await db
      .insert(habitCheckIns)
      .values(checkIns)
      .onConflictDoNothing({ target: [habitCheckIns.habitId, habitCheckIns.date] });
  }
  console.log(`  ${habitSeeds.length} habits with check-ins`);

  // Morning and evening routines with steps (steps only on first creation).
  const routineSeeds: Array<{
    kind: 'morning' | 'evening';
    name: string;
    steps: Array<{ title: string; durationMinutes: number; habitName?: string }>;
  }> = [
    {
      kind: 'morning',
      name: 'Morning routine',
      steps: [
        { title: 'Prayer', durationMinutes: 10, habitName: 'Morning prayer' },
        { title: 'Glass of water', durationMinutes: 2, habitName: 'Drink 2L of water' },
        { title: 'Stretch', durationMinutes: 10 },
        { title: 'Review today', durationMinutes: 5 },
      ],
    },
    {
      kind: 'evening',
      name: 'Evening routine',
      steps: [
        { title: 'Tidy the kitchen', durationMinutes: 10 },
        { title: 'Read', durationMinutes: 20, habitName: 'Read for 20 minutes' },
        { title: 'Plan tomorrow', durationMinutes: 5 },
      ],
    },
  ];
  for (const r of routineSeeds) {
    const [existing] = await db
      .select({ id: routines.id })
      .from(routines)
      .where(and(eq(routines.userId, uid), eq(routines.kind, r.kind), eq(routines.name, r.name)))
      .limit(1);
    if (existing) continue;
    const [routine] = await db
      .insert(routines)
      .values({
        userId: uid,
        lifeSegmentId: seg['personal-development'],
        kind: r.kind,
        name: r.name,
      })
      .returning();
    const habitRows = await db.select().from(habits).where(eq(habits.userId, uid));
    await db.insert(routineSteps).values(
      r.steps.map((s, sortOrder) => ({
        userId: uid,
        routineId: routine.id,
        sortOrder,
        title: s.title,
        durationMinutes: s.durationMinutes,
        habitId: s.habitName ? habitRows.find((h) => h.name === s.habitName)?.id : undefined,
      }))
    );
  }
  console.log(`  ${routineSeeds.length} routines`);

  // Inbox captures.
  const captureSeeds = ['Look into a standing desk', 'Idea: weekly review every Sunday evening'];
  for (const text of captureSeeds) {
    const [existing] = await db
      .select({ id: captures.id })
      .from(captures)
      .where(and(eq(captures.userId, uid), eq(captures.text, text)))
      .limit(1);
    if (!existing) await db.insert(captures).values({ userId: uid, text });
  }
  console.log(`  ${captureSeeds.length} captures`);
}

main(userId)
  .then(() => {
    console.log('Seed complete.');
    return client.end();
  })
  .catch(async (err) => {
    console.error(err);
    await client.end();
    process.exit(1);
  });
