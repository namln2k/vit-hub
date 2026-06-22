const VIETNAM_TIMEZONE_OFFSET_HOURS = 7;

export function toVietnamDateTimeLocalValue(date: Date) {
  const vietnamTime = new Date(date.getTime() + VIETNAM_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);

  return vietnamTime.toISOString().slice(0, 16);
}

export function fromVietnamDateTimeLocalValue(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}
