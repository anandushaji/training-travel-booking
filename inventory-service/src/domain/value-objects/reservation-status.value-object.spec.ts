import { ReservationStatus } from './reservation-status.value-object';

describe('ReservationStatus value object', () => {
  it('should store PENDING value', () => {
    expect(new ReservationStatus('PENDING').value).toBe('PENDING');
  });

  it('should store CONFIRMED value', () => {
    expect(new ReservationStatus('CONFIRMED').value).toBe('CONFIRMED');
  });

  it('should store CANCELLED value', () => {
    expect(new ReservationStatus('CANCELLED').value).toBe('CANCELLED');
  });

  it('should store EXPIRED value', () => {
    expect(new ReservationStatus('EXPIRED').value).toBe('EXPIRED');
  });

  it('should return true from equals() when values match', () => {
    const a = new ReservationStatus('PENDING');
    const b = new ReservationStatus('PENDING');
    expect(a.equals(b)).toBe(true);
  });

  it('should return false from equals() when values differ', () => {
    const a = new ReservationStatus('PENDING');
    const b = new ReservationStatus('CONFIRMED');
    expect(a.equals(b)).toBe(false);
  });

  it('should return string value from toString()', () => {
    expect(new ReservationStatus('PENDING').toString()).toBe('PENDING');
    expect(new ReservationStatus('EXPIRED').toString()).toBe('EXPIRED');
  });

  it('should expose static singleton instances', () => {
    expect(ReservationStatus.PENDING.value).toBe('PENDING');
    expect(ReservationStatus.CONFIRMED.value).toBe('CONFIRMED');
    expect(ReservationStatus.CANCELLED.value).toBe('CANCELLED');
    expect(ReservationStatus.EXPIRED.value).toBe('EXPIRED');
  });
});
