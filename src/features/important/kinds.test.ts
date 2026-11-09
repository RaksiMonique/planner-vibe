import { describe, expect, it } from 'vitest';
import { IMPORTANT_KINDS, fieldsForKind, matchesQuery, parseFields, summaryOf } from './kinds';

describe('kinds', () => {
  it('defines fields for every kind with at least one required field', () => {
    for (const kind of IMPORTANT_KINDS) {
      const fields = fieldsForKind(kind);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.required)).toBe(true);
    }
  });

  it('parses prefixed form values and reports missing required fields', () => {
    const { fields, errors } = parseFields('emergency_contact', {
      field_phone: ' 555 0100 ',
      field_relationship: 'Sister',
      field_unknown: 'ignored',
    });
    expect(fields).toEqual({ phone: '555 0100', relationship: 'Sister' });
    expect(errors).toEqual({});
    const missing = parseFields('insurance', { field_policy: 'P-1' });
    expect(missing.errors).toEqual({ field_provider: ['Provider is required.'] });
  });

  it('summarises the first two filled fields in definition order', () => {
    expect(
      summaryOf('insurance', { renewal: '2027-01-01', provider: 'Sagicor', covers: 'Health' })
    ).toBe('Sagicor · 2027-01-01');
    expect(summaryOf('household', {})).toBe('');
  });

  it('matches queries across title, notes and fields, case-insensitively', () => {
    const record = { title: 'Dr Lee', notes: null, fields: { role: 'Dentist', phone: '555' } };
    expect(matchesQuery(record, 'dent')).toBe(true);
    expect(matchesQuery(record, '555')).toBe(true);
    expect(matchesQuery(record, 'LEE')).toBe(true);
    expect(matchesQuery(record, 'plumber')).toBe(false);
    expect(matchesQuery(record, '  ')).toBe(true);
  });
});
