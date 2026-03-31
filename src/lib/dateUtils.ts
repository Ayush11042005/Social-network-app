import { formatDistanceToNow } from 'date-fns';

export function safeFormatDistance(dateVal: any): string {
  if (!dateVal) return '';
  try {
    let d: Date;
    if (typeof dateVal === 'string' || typeof dateVal === 'number') {
      d = new Date(dateVal);
    } else if (dateVal?.year && dateVal?.month && dateVal?.day) {
      const year = dateVal.year.low ?? dateVal.year;
      const month = (dateVal.month.low ?? dateVal.month) - 1;
      const day = dateVal.day.low ?? dateVal.day;
      const hour = dateVal.hour?.low ?? dateVal.hour ?? 0;
      const min = dateVal.minute?.low ?? dateVal.minute ?? 0;
      const sec = dateVal.second?.low ?? dateVal.second ?? 0;
      d = new Date(year, month, day, hour, min, sec);
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '';
  }
}
