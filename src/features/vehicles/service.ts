import 'server-only';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { addDays, subDays, parseISO, format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { db } from '@/db';
import { lifeSegments, reminders, tasks, vehicleDocuments, vehicles } from '@/db/schema';
import { getPreferences } from '@/features/settings/service';
import { toDateKey, todayInZone } from '@/lib/dates';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { getDocument, getVehicle, type Vehicle, type VehicleDocument } from './queries';
import type { DocumentInput, VehicleInput } from './schema';
import {
  documentStatus,
  REMINDER_DAYS_BEFORE,
  RENEW_WITHIN_DAYS,
  renewalTitle,
  vehicleLabel,
} from './status';

/** Reminders for a paper go out at nine in the morning, local time. */
const REMINDER_HOUR = '09:00:00';

async function assertSegment(userId: string, lifeSegmentId: string) {
  const owned = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (owned === 0) throw new ValidationError('That Life Segment does not exist.');
}

function vehicleValues(input: VehicleInput) {
  return {
    name: input.name || null,
    make: input.make,
    model: input.model,
    year: input.year ?? null,
    colour: input.colour || null,
    licensePlate: input.licensePlate || null,
    lifeSegmentId: input.lifeSegmentId,
    notes: input.notes || null,
  };
}

export async function createVehicle(userId: string, input: VehicleInput): Promise<Vehicle> {
  await assertSegment(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(vehicles)
    .values({ ...vehicleValues(input), userId })
    .returning();
  return row;
}

export async function updateVehicle(
  userId: string,
  id: string,
  input: VehicleInput
): Promise<Vehicle> {
  if (!(await getVehicle(userId, id))) throw new NotFoundError('That vehicle does not exist.');
  await assertSegment(userId, input.lifeSegmentId);
  const [row] = await db
    .update(vehicles)
    .set(vehicleValues(input))
    .where(and(eq(vehicles.userId, userId), eq(vehicles.id, id)))
    .returning();
  // A renamed vehicle renames its renewal tasks.
  await ensureRenewalTasks(userId);
  return row;
}

/** Soft-deletes the vehicle; its papers stay for the record but stop reminding. */
export async function removeVehicle(userId: string, id: string): Promise<void> {
  if (!(await getVehicle(userId, id))) throw new NotFoundError('That vehicle does not exist.');
  const docs = await db
    .select({ id: vehicleDocuments.id })
    .from(vehicleDocuments)
    .where(and(eq(vehicleDocuments.userId, userId), eq(vehicleDocuments.vehicleId, id)));
  for (const d of docs) {
    await clearDocumentReminders(userId, d.id);
    await dropRenewalTasks(userId, d.id);
  }
  await db
    .update(vehicles)
    .set({ deletedAt: new Date() })
    .where(and(eq(vehicles.userId, userId), eq(vehicles.id, id)));
}

export async function saveDocument(
  userId: string,
  input: DocumentInput,
  id?: string
): Promise<VehicleDocument> {
  if (!(await getVehicle(userId, input.vehicleId)))
    throw new ValidationError('That vehicle does not exist.');
  const values = {
    vehicleId: input.vehicleId,
    kind: input.kind,
    expiresOn: input.expiresOn,
    reference: input.reference || null,
    notes: input.notes || null,
  };
  let row: VehicleDocument;
  if (id) {
    if (!(await getDocument(userId, id))) throw new NotFoundError('That document does not exist.');
    [row] = await db
      .update(vehicleDocuments)
      .set(values)
      .where(and(eq(vehicleDocuments.userId, userId), eq(vehicleDocuments.id, id)))
      .returning();
  } else {
    [row] = await db
      .insert(vehicleDocuments)
      .values({ ...values, userId })
      .returning();
  }
  await syncDocumentReminders(userId, row);
  await syncRenewalTask(userId, row);
  return row;
}

export async function removeDocument(userId: string, id: string): Promise<void> {
  if (!(await getDocument(userId, id))) throw new NotFoundError('That document does not exist.');
  await clearDocumentReminders(userId, id);
  await dropRenewalTasks(userId, id);
  await db
    .delete(vehicleDocuments)
    .where(and(eq(vehicleDocuments.userId, userId), eq(vehicleDocuments.id, id)));
}

// ── Renewal tasks ─────────────────────────────────────────────────────────────

const RENEWAL_NOTES =
  'Enter the new expiry date on the Vehicles page. This task closes itself once the paper is more than three months from running out.';

async function openRenewalTasks(userId: string, documentId: string) {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.vehicleDocumentId, documentId),
        ne(tasks.status, 'done'),
        isNull(tasks.deletedAt)
      )
    );
}

async function dropRenewalTasks(userId: string, documentId: string) {
  const open = await openRenewalTasks(userId, documentId);
  if (open.length === 0) return;
  await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.vehicleDocumentId, documentId),
        ne(tasks.status, 'done'),
        isNull(tasks.deletedAt)
      )
    );
}

/**
 * One open "Renew X for Y" task while a paper is within three months of
 * expiring or already expired, due on the expiry date. Once the paper has a
 * date further out the task completes itself; it cannot be ticked off by hand
 * before then (tasks/service.ts refuses). Keeps title and due date current.
 */
async function syncRenewalTask(
  userId: string,
  doc: VehicleDocument,
  todayKey?: string,
  vehicle?: Vehicle | null
): Promise<void> {
  const v = vehicle ?? (await getVehicle(userId, doc.vehicleId));
  if (!v) return;
  const today = todayKey ?? toDateKey(todayInZone((await getPreferences(userId)).timeZone));
  const status = documentStatus(doc.expiresOn, today);
  const open = await openRenewalTasks(userId, doc.id);
  if (status.state === 'ok') {
    if (open.length > 0) {
      await db
        .update(tasks)
        .set({ status: 'done', completedAt: new Date() })
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.vehicleDocumentId, doc.id),
            ne(tasks.status, 'done'),
            isNull(tasks.deletedAt)
          )
        );
    }
    return;
  }
  const title = renewalTitle(doc.kind, vehicleLabel(v));
  if (open.length === 0) {
    await db.insert(tasks).values({
      userId,
      lifeSegmentId: v.lifeSegmentId,
      title,
      notes: RENEWAL_NOTES,
      dueDate: doc.expiresOn,
      isImportant: true,
      vehicleDocumentId: doc.id,
    });
    return;
  }
  const [task] = open;
  if (
    task.title !== title ||
    task.dueDate !== doc.expiresOn ||
    task.lifeSegmentId !== v.lifeSegmentId
  ) {
    await db
      .update(tasks)
      .set({ title, dueDate: doc.expiresOn, lifeSegmentId: v.lifeSegmentId })
      .where(eq(tasks.id, task.id));
  }
}

/**
 * Brings every live vehicle's renewal tasks up to date: creates the ones that
 * fell within three months since last time, closes the ones whose paper was
 * renewed. Run when the Vehicles page opens and once a day by the cron.
 */
export async function ensureRenewalTasks(userId: string): Promise<void> {
  const prefs = await getPreferences(userId);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const rows = await db
    .select({ document: vehicleDocuments, vehicle: vehicles })
    .from(vehicleDocuments)
    .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
    .where(and(eq(vehicleDocuments.userId, userId), isNull(vehicles.deletedAt)));
  for (const { document, vehicle } of rows) {
    await syncRenewalTask(userId, document, todayKey, vehicle);
  }
}

/** The day a paper's renewal task appears, for the card. */
export function renewalWindowStart(expiresOn: string): string {
  return format(addDays(parseISO(expiresOn), -RENEW_WITHIN_DAYS), 'yyyy-MM-dd');
}

async function clearDocumentReminders(userId: string, documentId: string) {
  await db
    .delete(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.entityType, 'vehicle_document'),
        eq(reminders.entityId, documentId)
      )
    );
}

/**
 * A nudge a month before, a week before and on the day, each at nine in the
 * morning. Marks already in the past are skipped, so editing a date never
 * fires old reminders again.
 */
async function syncDocumentReminders(userId: string, doc: VehicleDocument, now = new Date()) {
  await clearDocumentReminders(userId, doc.id);
  const { timeZone } = await getPreferences(userId);
  const expires = parseISO(doc.expiresOn);
  const marks = REMINDER_DAYS_BEFORE.map((days) =>
    fromZonedTime(`${format(subDays(expires, days), 'yyyy-MM-dd')}T${REMINDER_HOUR}`, timeZone)
  ).filter((at) => at > now);
  if (marks.length === 0) return;
  await db.insert(reminders).values(
    marks.map((remindAt) => ({
      userId,
      entityType: 'vehicle_document' as const,
      entityId: doc.id,
      remindAt,
    }))
  );
}
