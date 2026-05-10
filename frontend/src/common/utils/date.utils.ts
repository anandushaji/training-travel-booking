import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export function formatDate(iso: string, format = 'MMM D, YYYY'): string {
  return dayjs(iso).format(format);
}

export function isDateInPast(iso: string): boolean {
  return dayjs(iso).isBefore(dayjs());
}

export function addDays(iso: string, days: number): string {
  return dayjs(iso).add(days, 'day').toISOString();
}
