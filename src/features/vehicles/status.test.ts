import { describe, expect, it } from 'vitest';
import { documentStatus, orderKinds, vehicleLabel } from './status';

describe('documentStatus', () => {
  const today = '2026-11-24';
  it('is expired once the date has passed', () => {
    expect(documentStatus('2026-11-23', today)).toEqual({
      state: 'expired',
      days: -1,
      wording: 'Expired yesterday',
    });
    expect(documentStatus('2026-11-01', today).wording).toBe('Expired 23 days ago');
  });
  it('needs renewing within three months, including today', () => {
    expect(documentStatus('2026-11-24', today)).toMatchObject({
      state: 'due',
      wording: 'Expires today',
    });
    expect(documentStatus('2026-11-25', today).wording).toBe('Expires tomorrow');
    expect(documentStatus('2026-12-24', today)).toMatchObject({
      state: 'due',
      wording: 'Expires in 30 days',
    });
    expect(documentStatus('2027-02-22', today)).toMatchObject({
      state: 'due',
      days: 90,
      wording: 'Expires in 3 months',
    });
  });
  it('says nothing beyond three months', () => {
    expect(documentStatus('2027-02-23', today)).toEqual({ state: 'ok', days: 91, wording: '' });
    expect(documentStatus('2027-11-24', today).wording).toBe('');
  });
});

describe('vehicleLabel', () => {
  it('prefers the name, then year make model', () => {
    expect(vehicleLabel({ name: 'Blue Beast', year: 2019, make: 'Toyota', model: 'Aqua' })).toBe(
      'Blue Beast'
    );
    expect(vehicleLabel({ name: ' ', year: 2019, make: 'Toyota', model: 'Aqua' })).toBe(
      '2019 Toyota Aqua'
    );
    expect(vehicleLabel({ name: null, year: null, make: 'Honda', model: 'Fit' })).toBe('Honda Fit');
  });
});

describe('orderKinds', () => {
  it('keeps the standard papers in order and the rest alphabetical', () => {
    expect(orderKinds(['Road tax', 'Service', 'Insurance', 'Alarm', 'Fitness'])).toEqual([
      'Insurance',
      'Fitness',
      'Service',
      'Alarm',
      'Road tax',
    ]);
  });
});
