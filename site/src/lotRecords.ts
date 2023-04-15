import { format, parse, roundToNearestMinutes } from 'date-fns'
import lotRecordsJson from '../../lotRecords.json'

export type RecordStatus = 'available' | 'few' | 'full' | 'active' | 'na'

const keyFormat = 'yyyy-MM-dd HH:mm'

const lotRecords = new Map(
  Object.entries(lotRecordsJson).map(([timestampString, records]) => [
    parseTimestampKey(timestampString),
    records as Record<string, RecordStatus>,
  ]),
)

function parseTimestampKey(timestampString: string): string {
  const parsedTimestamp = parseFloat(timestampString) * 1000
  const roundedDate = roundToNearestMinutes(parsedTimestamp, { nearestTo: 30 })
  return format(roundedDate, keyFormat)
}

const keys = Array.from(lotRecords.keys()).sort()

export const earliestDate = parse(keys.at(0)!, keyFormat, new Date())
export const latestDate = parse(keys.at(-1)!, keyFormat, new Date())

export function lotRecordsAtDate(
  date: Date,
): Record<string, RecordStatus> | null {
  const key = format(date, keyFormat)
  return lotRecords.get(key) ?? null
}
