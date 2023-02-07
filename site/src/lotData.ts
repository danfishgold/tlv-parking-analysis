import difference from '@turf/difference'
import union from '@turf/union'
import { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import isochroneString from '../../parking_lot_isochrones_7min.geojson?raw'
import lotRecordsJson from '../../parsed_lot_records.json'

const isochrones: FeatureCollection<Polygon, { id: number }> =
  JSON.parse(isochroneString)

const lotRecords = lotRecordsJson as Record<
  string,
  Record<string, 'available' | 'few' | 'full' | 'active' | 'na'>
>

export const times = Object.keys(lotRecords).sort()

export type Status = 'available' | 'full' | 'unknown'

export function isochroneFeatureCollection(
  time: string,
): FeatureCollection<Polygon | MultiPolygon, { status: Status }> {
  const statusPolygons: Record<Status, Feature<Polygon | MultiPolygon> | null> =
    {
      available: null,
      full: null,
      unknown: null,
    }

  for (const feature of isochrones.features) {
    const status = statusForFeature(feature, time)
    if (statusPolygons[status] === null) {
      statusPolygons[status] = feature
    } else {
      statusPolygons[status] = union(statusPolygons[status]!, feature)!
    }
  }

  const availableMultipolygon = statusPolygons.available
  const fullMultipolygon = nullableDifference(
    statusPolygons.full,
    availableMultipolygon,
  )
  const unknownMultipolygon = nullableDifference(
    nullableDifference(statusPolygons.unknown, fullMultipolygon),
    availableMultipolygon,
  )

  const features: Feature<Polygon | MultiPolygon, { status: Status }>[] = []

  if (availableMultipolygon) {
    features.push({
      ...availableMultipolygon,
      properties: { status: 'available' },
    })
  }

  if (fullMultipolygon) {
    features.push({
      ...fullMultipolygon,
      properties: { status: 'full' },
    })
  }

  if (unknownMultipolygon) {
    features.push({
      ...unknownMultipolygon,
      properties: { status: 'unknown' },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

function nullableDifference(
  f1: Feature<Polygon | MultiPolygon> | null,
  f2: Feature<Polygon | MultiPolygon> | null,
): Feature<Polygon | MultiPolygon> | null {
  if (f1 === null) {
    return null
  }
  if (f2 === null) {
    return f1
  }
  return difference(f1, f2)
}

function statusForFeature(
  feature: Feature<Polygon, { id: number }>,
  time: string,
): Status {
  switch (lotRecords[time][feature.properties.id]) {
    case 'full':
      return 'full'
    case 'available':
      return 'available'
    case 'few':
      return 'available'
    default:
      return 'unknown'
  }
}

export function statusColor(status: Status): string {
  switch (status) {
    case 'available':
      return 'green'
    case 'full':
      return 'red'
    case 'unknown':
      return 'gray'
  }
}
