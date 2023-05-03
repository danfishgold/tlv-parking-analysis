// DATE STUFF
export type RecordDate =
  | { type: 'timestamp'; timestamp: Date }
  | { type: 'dayGroup'; group: DayGroup; time: Date }

type DayGroup = 'allDays' | 'weekdays' | 'weekends' | 'fridays' | 'saturdays'

export function timestampsForDate(date: RecordDate, days: Date[]): Date[] {
  switch (date.type) {
    case 'timestamp': {
      return [date.timestamp]
    }
    case 'dayGroup': {
      const relevantDayIndexes = new Set(dayIndexesInDayGroup(date.group))
      return days
        .filter((day) => relevantDayIndexes.has(day.getDay()))
        .map((day) => mergeDates({ day, time: date.time }))
    }
  }
}

function dayIndexesInDayGroup(group: DayGroup): number[] {
  switch (group) {
    case 'allDays':
      return [0, 1, 2, 3, 4, 5, 6]
    case 'weekdays':
      return [0, 1, 2, 3, 4]
    case 'weekends':
      return [5, 6]
    case 'fridays':
      return [5]
    case 'saturdays':
      return [6]
  }
}

export function mergeDates({ day, time }: { day: Date; time: Date }): Date {
  const dayAtTime = new Date(day)
  dayAtTime.setHours(time.getHours())
  dayAtTime.setMinutes(time.getMinutes())
  dayAtTime.setSeconds(time.getSeconds())
  dayAtTime.setMilliseconds(time.getMilliseconds())
  return dayAtTime
}
