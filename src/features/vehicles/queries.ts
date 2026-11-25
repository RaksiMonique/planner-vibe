import 'server-only';
import { and, asc, eq, inArray, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, vehicleDocuments, vehicles } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleDocument = typeof vehicleDocuments.$inferSelect;
export type VehicleRow = Vehicle & { segment: SegmentRef; documents: VehicleDocument[] };

export async function listVehicles(userId: string): Promise<VehicleRow[]> {
  const rows = await db
    .select({ vehicle: vehicles, segment: segmentRefColumns })
    .from(vehicles)
    .innerJoin(lifeSegments, eq(vehicles.lifeSegmentId, lifeSegments.id))
    .where(and(eq(vehicles.userId, userId), isNull(vehicles.deletedAt)))
    .orderBy(asc(vehicles.sortOrder), asc(vehicles.createdAt));
  if (rows.length === 0) return [];
  const documents = await db
    .select()
    .from(vehicleDocuments)
    .where(
      inArray(
        vehicleDocuments.vehicleId,
        rows.map((r) => r.vehicle.id)
      )
    )
    .orderBy(asc(vehicleDocuments.expiresOn));
  return rows.map((r) => ({
    ...r.vehicle,
    segment: r.segment,
    documents: documents.filter((d) => d.vehicleId === r.vehicle.id),
  }));
}

export async function getVehicle(userId: string, id: string): Promise<Vehicle | null> {
  const [row] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.userId, userId), eq(vehicles.id, id), isNull(vehicles.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getDocument(userId: string, id: string): Promise<VehicleDocument | null> {
  const [row] = await db
    .select()
    .from(vehicleDocuments)
    .where(and(eq(vehicleDocuments.userId, userId), eq(vehicleDocuments.id, id)))
    .limit(1);
  return row ?? null;
}

export type ExpiringDocument = { document: VehicleDocument; vehicle: Vehicle };

/** Documents of live vehicles that expire on or before `untilKey`, soonest first (expired ones included). */
export async function listExpiringDocuments(
  userId: string,
  untilKey: string
): Promise<ExpiringDocument[]> {
  const rows = await db
    .select({ document: vehicleDocuments, vehicle: vehicles })
    .from(vehicleDocuments)
    .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicleDocuments.userId, userId),
        isNull(vehicles.deletedAt),
        lte(vehicleDocuments.expiresOn, untilKey)
      )
    )
    .orderBy(asc(vehicleDocuments.expiresOn), asc(vehicleDocuments.kind));
  return rows;
}
