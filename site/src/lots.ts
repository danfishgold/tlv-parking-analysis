import {
  eachDayOfInterval,
  format,
  parse,
  roundToNearestMinutes,
  startOfDay,
} from 'date-fns'
import { FeatureCollection, Point, Polygon } from 'geojson'
import { countBy } from 'lodash-es'
import lotRecordsJson from '../../lotRecords.json'
import isochroneString from '../../parking_lot_isochrones_500m.geojson?raw'
import { LotStatus, parseLotStatus } from './status'

// ISOCHRONES

export type JsonLotProperties = {
  distance: number
  ahuzot_id: number | null
  gis_id: number
  ahuzot_name: string | null
  gis_name: string
  address: string
  lot_capacity: number
  lot_type: 'paid' | 'close to home'
  lot_latitude: number
  lot_longitude: number
  nearest_node: number
}

export const isochrones: FeatureCollection<Polygon, JsonLotProperties> =
  JSON.parse(isochroneString)

export const lotPoints: FeatureCollection<Point, JsonLotProperties> = {
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

export function parseKey(key: string): Date {
  return parse(key, keyFormat, new Date())
}

export function formatKey(date: Date): string {
  return format(date, keyFormat)
}

export const lotRecords = parseLotRecords(lotRecordsJson)
const recordDates = Array.from(lotRecords.keys()).sort()

export const earliestDate = parseKey(recordDates.at(0)!)
export const latestDate = parseKey(recordDates.at(-1)!)
export const days: Date[] = eachDayOfInterval({
  start: earliestDate,
  end: latestDate,
})
export const fullDays = new Set(
  Object.entries(
    countBy(recordDates, (key) => formatKey(startOfDay(parseKey(key)))),
  )
    .filter(([key, count]) => count === 48)
    .map(([key]) => key),
)

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
  return formatKey(roundedDate)
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
