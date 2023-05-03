import {
  addDays,
  differenceInDays,
  format,
  parse,
  roundToNearestMinutes,
  startOfDay,
} from 'date-fns'
import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Point,
  Polygon,
} from 'geojson'
import { mean, range, sortBy } from 'lodash-es'
import lotRecordsJson from '../../lotRecords.json'
import isochroneString from '../../parking_lot_isochrones_500m.geojson?raw'
import { LotStatus, parseLotStatus, statusGrade } from './status'

// ISOCHRONES

type JsonLotProperties = {
  distance: number
  ahuzot_id: number | null
  gis_id: number
  ahuzot_name: string | null
  gis_name: string
  address: string
  lot_type: 'paid' | 'close to home'
  lot_latitude: number
  lot_longitude: number
  nearest_node: number
}

export type LotProperties = JsonLotProperties & {
  statuses: LotStatus[]
  grade: number
}

const isochrones: FeatureCollection<Polygon, JsonLotProperties> =
  JSON.parse(isochroneString)

const lotPoints: FeatureCollection<Point, JsonLotProperties> = {
  type: 'FeatureCollection',
  features: isochrones.features.map((f) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [f.properties.lot_longitude, f.properties.lot_latitude],
    },
    properties: f.properties,
    id: f.properties.gis_id,
  })),
}

// LOT RECORDS

const keyFormat = 'yyyy-MM-dd HH:mm'

const lotRecords = parseLotRecords(lotRecordsJson)
const recordDates = Array.from(lotRecords.keys()).sort()

export const earliestDate = parse(recordDates.at(0)!, keyFormat, new Date())
export const latestDate = parse(recordDates.at(-1)!, keyFormat, new Date())

const dateSpan = differenceInDays(latestDate, earliestDate)
export const days: Date[] = range(dateSpan + 1)
  .map((dayIndex) => addDays(earliestDate, dayIndex))
  .map(startOfDay)

// LOT RECORD PARSING

function parseLotRecords(
  rawLotRecords: Record<string, Record<string, string>>,
): Map<string, Record<string, LotStatus>> {
  const map = new Map()
  for (const [timestampString, record] of Object.entries(rawLotRecords)) {
    const roundedTimestampKey = parseTimestampKey(timestampString)
    const parsedRecord = parseSingleLotRecord(record)
    map.set(roundedTimestampKey, parsedRecord)
  }
  return map
}

function parseTimestampKey(timestampString: string): string {
  const parsedTimestamp = parseFloat(timestampString) * 1000
  const roundedDate = roundToNearestMinutes(parsedTimestamp, { nearestTo: 30 })
  return format(roundedDate, keyFormat)
}

function parseSingleLotRecord(
  record: Record<string, string>,
): Record<string, LotStatus> {
  return Object.fromEntries(
    Object.entries(record).map(([id, rawStatus]) => [
      id,
      parseLotStatus(rawStatus),
    ]),
  )
}

// GETTERS

function lotRecordsAtDate(date: RecordDate): Record<string, LotStatus[]> {
  switch (date.type) {
    case 'timestamp':
      return lotRecordsAtTimestamps([date.timestamp])
    case 'dayGroup':
      return lotRecordsAtTimestamps(daysInDayGroup(date.group, date.time))
  }
}

function lotRecordsAtTimestamps(
  timetamps: Date[],
): Record<string, LotStatus[]> {
  const keys = timetamps.map((ts) => format(ts, keyFormat))
  const recordSets = keys.map((key) => lotRecords.get(key) ?? {})
  const groupedRecords: Record<string, LotStatus[]> = {}
  for (const record of recordSets) {
    for (const [lotId, status] of Object.entries(record)) {
      groupedRecords[lotId] = [...(groupedRecords[lotId] ?? []), status]
    }
  }
  return groupedRecords
}

function featureCollectionAtDate<Geom extends Geometry>(
  featureCollection: FeatureCollection<Geom, JsonLotProperties>,
  date: RecordDate,
): FeatureCollection<Geom, LotProperties> {
  const records = lotRecordsAtDate(date)
  const features = featureCollection.features.map(
    (f): Feature<Geom, LotProperties> => {
      const statuses = f.properties.ahuzot_id
        ? records[f.properties.ahuzot_id] ?? []
        : []
      const grades = statuses
        .map((status) => statusGrade(parseLotStatus(status)))
        .filter((grade) => grade !== null)

      const meanGrade = grades.length > 0 ? mean(grades) : -1
      return {
        ...f,
        properties: { ...f.properties, statuses, grade: meanGrade },
      }
    },
  )
  return {
    type: 'FeatureCollection',
    features: sortBy(features, (f) => f.properties.grade),
  }
}

export function isochroneFeatureCollectionAtDate(
  date: RecordDate,
): FeatureCollection<Polygon | MultiPolygon, LotProperties> {
  return featureCollectionAtDate(isochrones, date)
}

export function lotPointsAtDate(
  date: RecordDate,
): FeatureCollection<Point, LotProperties> {
  return featureCollectionAtDate(lotPoints, date)
}

// DATE STUFF

type RecordDate =
  | { type: 'timestamp'; timestamp: Date }
  | { type: 'dayGroup'; group: DayGroup; time: Date }

type DayGroup = 'allDays' | 'weekdays' | 'weekends' | 'fridays' | 'saturdays'

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

function daysInDayGroup(group: DayGroup, time: Date): Date[] {
  const relevantDayIndexes = new Set(dayIndexesInDayGroup(group))
  return days
    .filter((day) => relevantDayIndexes.has(day.getDay()))
    .map((day) => mergeDates(day, time))
}

function mergeDates(day: Date, time: Date): Date {
  const dayAtTime = new Date(day)
  dayAtTime.setHours(time.getHours())
  dayAtTime.setMinutes(time.getMinutes())
  dayAtTime.setSeconds(time.getSeconds())
  dayAtTime.setMilliseconds(time.getMilliseconds())
  return dayAtTime
}
