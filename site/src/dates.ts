import { addMinutes, isEqual, startOfDay, subMinutes } from 'date-fns'
import { days, earliestDate, formatKey, fullDays, latestDate } from './lots'

export type RecordDate =
  | { type: 'timestamp'; timestamp: Date }
  | { type: 'dayGroup'; group: DayGroup; time: Date }

export const dayGroups = [
  'allDays',
  'weekdays',
  'weekends',
  'fridays',
  'saturdays',
] as const

type DayGroup = (typeof dayGroups)[number]

// PRESENTATION

export const dateOptions: RecordDate[] = [
  ...dayGroups.map((group) => ({
    type: 'dayGroup' as const,
    group,
    time: new Date(0, 0, 0, 7), // 7am
  })),
  ...days.map((day) => ({ type: 'timestamp' as const, timestamp: day })),
]

export function hasPartialRecords(date: RecordDate): boolean {
  switch (date.type) {
    case 'dayGroup':
      return false
    case 'timestamp':
      return !fullDays.has(formatKey(startOfDay(date.timestamp)))
  }
}

const timeFormatter = Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
})

const dayFormatter = Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
})

export function formattedTime(date: RecordDate): string {
  return timeFormatter.format(timeForDate(date))
}

export function formattedDay(date: RecordDate): string {
  switch (date.type) {
    case 'timestamp':
      return dayFormatter.format(date.timestamp)
    case 'dayGroup':
      switch (date.group) {
        case 'allDays':
          return 'כל הימים'
        case 'weekdays':
          return 'ימי עבודה'
        case 'weekends':
          return 'סופי שבוע'
        case 'fridays':
          return 'ימי שישי'
        case 'saturdays':
          return 'ימי שבת'
      }
  }
}

export function encodeDate(date: RecordDate): string {
  switch (date.type) {
    case 'timestamp':
      return `timestamp:${startOfDay(date.timestamp).getTime()}`
    case 'dayGroup':
      return `dayGroup:${date.group}`
  }
}

export function decodeDate({
  dateString,
  baseDate,
}: {
  dateString: string
  baseDate: RecordDate
}): RecordDate {
  if (dateString.startsWith('timestamp:')) {
    const day = new Date(+dateString.replace(/^timestamp:/, ''))
    const timestamp = mergeDates({ day, time: timeForDate(baseDate) })
    return { type: 'timestamp', timestamp }
  } else if (dateString.startsWith('dayGroup:')) {
    const group = dateString.replace(/^dayGroup:/, '')
    if (!dayGroups.includes(group as DayGroup)) {
      throw new Error(`Couldn't parse date ${dateString}`)
    }
    return {
      type: 'dayGroup',
      group: group as DayGroup,
      time: timeForDate(baseDate),
    }
  } else {
    throw new Error(`Couldn't parse date ${dateString}`)
  }
}

export function nextDate(date: RecordDate): RecordDate | null {
  switch (date.type) {
    case 'timestamp': {
      if (isEqual(date.timestamp, latestDate)) {
        return null
      } else {
        return { type: 'timestamp', timestamp: addMinutes(date.timestamp, 30) }
      }
    }
    case 'dayGroup': {
      return { ...date, time: addMinutes(date.time, 30) }
    }
  }
}

export function previousDate(date: RecordDate): RecordDate | null {
  switch (date.type) {
    case 'timestamp': {
      if (isEqual(date.timestamp, earliestDate)) {
        return null
      } else {
        return { type: 'timestamp', timestamp: subMinutes(date.timestamp, 30) }
      }
    }
    case 'dayGroup': {
      return { ...date, time: subMinutes(date.time, 30) }
    }
  }
}

// DATE LOGIC

function timeForDate(date: RecordDate): Date {
  switch (date.type) {
    case 'dayGroup':
      return date.time
    case 'timestamp':
      return date.timestamp
  }
}

export function timestampsForDate(date: RecordDate): Date[] {
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

// UTILITIES

function mergeDates({ day, time }: { day: Date; time: Date }): Date {
  const dayAtTime = new Date(day)
  dayAtTime.setHours(time.getHours())
  dayAtTime.setMinutes(time.getMinutes())
  dayAtTime.setSeconds(time.getSeconds())
  dayAtTime.setMilliseconds(time.getMilliseconds())
  return dayAtTime
}
