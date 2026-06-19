import { format } from "date-fns";

export function formatDate(
  date: string | Date
) {
  return format(
    new Date(date),
    "dd MMM yyyy"
  );
}

export function formatDateTime(
  date: string | Date
) {
  return format(
    new Date(date),
    "dd MMM yyyy HH:mm"
  );
}

export const fmtDate = formatDate;
export const fmtDateTime = formatDateTime;