export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Returns number of days in given year and month (1-12)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Gets day of week name (2 letters) for a specific date
 */
export function getDayOfWeek(year: number, month: number, day: number): {
  shortName: string;
  fullName: string;
  dayIndex: number;
} {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return {
    shortName: DAY_NAMES[dayIndex],
    fullName: FULL_DAY_NAMES[dayIndex],
    dayIndex,
  };
}

/**
 * Groups days of month into 5 standard tracker weeks matching reference screenshots
 */
export function getWeekGroups(daysInMonth: number): {
  weekNumber: number;
  label: string;
  days: number[];
}[] {
  return [
    { weekNumber: 1, label: 'Week 1', days: [1, 2, 3, 4, 5, 6, 7] },
    { weekNumber: 2, label: 'Week 2', days: [8, 9, 10, 11, 12, 13, 14] },
    { weekNumber: 3, label: 'Week 3', days: [15, 16, 17, 18, 19, 20, 21] },
    { weekNumber: 4, label: 'Week 4', days: [22, 23, 24, 25, 26, 27, 28] },
    {
      weekNumber: 5,
      label: 'Week 5',
      days: Array.from(
        { length: daysInMonth - 28 },
        (_, i) => 29 + i
      ).filter((d) => d <= daysInMonth),
    },
  ];
}
