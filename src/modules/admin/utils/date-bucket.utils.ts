import { format, subDays } from 'date-fns';

export interface IDateWindow {
  bucketStart: Date;
  bucketEnd: Date;
}

export function getDateRange(totalDays: number): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = subDays(endDate, totalDays);
  return { startDate, endDate };
}

export function buildBucketWindows(
  startDate: Date,
  endDate: Date,
  bucketCount: number,
): IDateWindow[] {
  const bucketSizeMs = (endDate.getTime() - startDate.getTime()) / bucketCount;
  return Array.from({ length: bucketCount }, (_, i) => ({
    bucketStart: new Date(startDate.getTime() + i * bucketSizeMs),
    bucketEnd: new Date(startDate.getTime() + (i + 1) * bucketSizeMs),
  }));
}

export function formatBucketLabel(date: Date, totalDays: number): string {
  const labelFormat = totalDays <= 90 ? 'd MMM' : 'MMM yyyy';
  return format(date, labelFormat);
}
