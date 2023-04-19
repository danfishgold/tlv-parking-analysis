import { format, parse, roundToNearestMinutes } from 'date-fns'
import { FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'
import lotRecordsJson from '../../lotRecords.json'
import isochroneString from '../../parking_lot_isochrones_500m.geojson?raw'
import { LotStatus, parseLotStatus } from './status'

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
  rawStatus: string
  status: LotStatus
}

const isochrones: FeatureCollection<Polygon, JsonLotProperties> =
  JSON.parse(isochroneString)

// LOT RECORDS

const keyFormat = 'yyyy-MM-dd HH:mm'

const lotRecords = parseLotRecords(lotRecordsJson)
const recordDates = Array.from(lotRecords.keys()).sort()

export const earliestDate = parse(recordDates.at(0)!, keyFormat, new Date())
export const latestDate = parse(recordDates.at(-1)!, keyFormat, new Date())

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

function lotRecordsAtDate(date: Date): Record<string, LotStatus> | null {
  const key = format(date, keyFormat)
  return lotRecords.get(key) ?? null
}

export function isochroneFeatureCollectionAtDate(
  date: Date,
): FeatureCollection<Polygon | MultiPolygon, LotProperties> {
  const statuses = lotRecordsAtDate(date) ?? {}
  return {
    type: 'FeatureCollection',
    features: isochrones.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        rawStatus: f.properties.ahuzot_id
          ? statuses[f.properties.ahuzot_id] ?? 'na'
          : 'na',
        status: parseLotStatus(
          f.properties.ahuzot_id
            ? statuses[f.properties.ahuzot_id] ?? 'na'
            : 'na',
        ),
      },
    })),
  }
}

export function lotPointsAtDate(
  date: Date,
): FeatureCollection<Point, LotProperties> {
  const statuses = lotRecordsAtDate(date) ?? {}

  return {
    type: 'FeatureCollection',
    features: isochrones.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [f.properties.lot_longitude, f.properties.lot_latitude],
      },
      properties: {
        ...f.properties,
        rawStatus: f.properties.ahuzot_id
          ? statuses[f.properties.ahuzot_id] ?? 'na'
          : 'na',
        status: parseLotStatus(
          f.properties.ahuzot_id
            ? statuses[f.properties.ahuzot_id] ?? 'na'
            : 'na',
        ),
      },
      id: f.properties.gis_id,
    })),
  }
}
