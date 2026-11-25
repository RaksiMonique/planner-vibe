import { z } from 'zod';

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.');

export const vehicleInput = z.object({
  name: z.string().trim().max(80).optional(),
  make: z.string().trim().min(1, 'Give the make.').max(80),
  model: z.string().trim().min(1, 'Give the model.').max(80),
  year: z.coerce.number().int().min(1900, 'Use a full year.').max(2100).optional(),
  colour: z.string().trim().max(40).optional(),
  licensePlate: z.string().trim().max(20).optional(),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  notes: z.string().trim().max(2000).optional(),
});
export type VehicleInput = z.infer<typeof vehicleInput>;

export const documentInput = z.object({
  vehicleId: z.uuid(),
  kind: z.string().trim().min(1, 'Name the document.').max(60),
  expiresOn: dateKeyValue,
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type DocumentInput = z.infer<typeof documentInput>;
