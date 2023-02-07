import difference from '@turf/difference'
import union from '@turf/union'
import { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import isochroneString from '../../parking_lot_isochrones_7min.geojson?raw'
import { RecordStatus } from './lotRecords'
import { parseRecordStatus, Status } from './status'

const isochrones: FeatureCollection<Polygon, { id: number }> =
  JSON.parse(isochroneString)

export function isochroneFeatureCollection(
  statuses: Record<string, RecordStatus>,
): FeatureCollection<Polygon | MultiPolygon, { status: Status }> {
  const statusPolygons: Record<Status, Feature<Polygon | MultiPolygon> | null> =
    {
      available: null,
      full: null,
      unknown: null,
    }

  for (const feature of isochrones.features) {
    const status = parseRecordStatus(statuses[feature.properties.id] ?? 'na')
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
