export const IMPORTANT_KINDS = [
  'emergency_contact',
  'important_date',
  'insurance',
  'medical_contact',
  'household',
  'document_reference',
  'emergency_instruction',
] as const;
export type ImportantKind = (typeof IMPORTANT_KINDS)[number];

export type FieldType = 'text' | 'tel' | 'email' | 'date' | 'url' | 'textarea';
export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
};

export const IMPORTANT_KIND_META: Record<
  ImportantKind,
  { label: string; plural: string; description: string; fields: FieldDef[] }
> = {
  emergency_contact: {
    label: 'Emergency contact',
    plural: 'Emergency contacts',
    description: 'Who to call first.',
    fields: [
      { key: 'phone', label: 'Phone', type: 'tel', required: true },
      {
        key: 'relationship',
        label: 'Relationship',
        type: 'text',
        placeholder: 'Sister, neighbour',
      },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
  },
  important_date: {
    label: 'Important date',
    plural: 'Important dates',
    description: 'Renewals, anniversaries, expiries.',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'recurs', label: 'Repeats', type: 'text', placeholder: 'Yearly, every two years' },
      { key: 'reminder', label: 'Remind me', type: 'text', placeholder: 'A month before' },
    ],
  },
  insurance: {
    label: 'Insurance',
    plural: 'Insurance',
    description: 'Policies and who to call about them.',
    fields: [
      { key: 'provider', label: 'Provider', type: 'text', required: true },
      { key: 'policy', label: 'Policy reference', type: 'text' },
      { key: 'phone', label: 'Claims phone', type: 'tel' },
      { key: 'renewal', label: 'Renewal date', type: 'date' },
      { key: 'covers', label: 'Covers', type: 'text', placeholder: 'Health, car, home' },
    ],
  },
  medical_contact: {
    label: 'Medical contact',
    plural: 'Medical contacts',
    description: 'Doctors, dentists, pharmacies.',
    fields: [
      {
        key: 'role',
        label: 'Role',
        type: 'text',
        required: true,
        placeholder: 'GP, dentist, pharmacy',
      },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'notes', label: 'Patient or plan number', type: 'text' },
    ],
  },
  household: {
    label: 'Household',
    plural: 'Household',
    description: 'Accounts, suppliers and the practical facts of the home.',
    fields: [
      {
        key: 'category',
        label: 'Category',
        type: 'text',
        required: true,
        placeholder: 'Electricity, landlord, plumber',
      },
      { key: 'contact', label: 'Contact', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'account', label: 'Account reference', type: 'text' },
    ],
  },
  document_reference: {
    label: 'Document reference',
    plural: 'Document references',
    description: 'Where important documents live and their numbers.',
    fields: [
      { key: 'number', label: 'Document number', type: 'text' },
      {
        key: 'location',
        label: 'Where it is kept',
        type: 'text',
        required: true,
        placeholder: 'Safe, folder, cloud drive',
      },
      { key: 'expires', label: 'Expires', type: 'date' },
      { key: 'link', label: 'Link', type: 'url' },
    ],
  },
  emergency_instruction: {
    label: 'Emergency instruction',
    plural: 'Emergency instructions',
    description: 'What to do, step by step, if something goes wrong.',
    fields: [
      {
        key: 'when',
        label: 'When',
        type: 'text',
        required: true,
        placeholder: 'Power cut, flood, medical emergency',
      },
      { key: 'steps', label: 'Steps', type: 'textarea', required: true },
    ],
  },
};

export function fieldsForKind(kind: ImportantKind): FieldDef[] {
  return IMPORTANT_KIND_META[kind].fields;
}

/** Reads `field_<key>` values from a form, trimmed; reports missing required ones. */
export function parseFields(
  kind: ImportantKind,
  raw: Record<string, unknown>
): { fields: Record<string, string>; errors: Record<string, string[]> } {
  const fields: Record<string, string> = {};
  const errors: Record<string, string[]> = {};
  for (const def of fieldsForKind(kind)) {
    const value = raw[`field_${def.key}`];
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) fields[def.key] = text.slice(0, 2000);
    else if (def.required) errors[`field_${def.key}`] = [`${def.label} is required.`];
  }
  return { fields, errors };
}

/** The first two filled fields, for a card summary line. */
export function summaryOf(kind: ImportantKind, fields: Record<string, string>): string {
  return fieldsForKind(kind)
    .map((def) => fields[def.key])
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');
}

/** Case-insensitive match over the title, notes and every field value. */
export function matchesQuery(
  record: { title: string; notes: string | null; fields: Record<string, string> },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [record.title, record.notes ?? '', ...Object.values(record.fields)]
    .join('\n')
    .toLowerCase();
  return haystack.includes(q);
}
