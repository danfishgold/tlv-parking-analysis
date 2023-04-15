import { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import isochroneString from '../../parking_lot_isochrones_500m.geojson?raw'
import { RecordStatus } from './lotRecords'
import { parseRecordStatus, Status } from './status'

const isochrones: FeatureCollection<
  Polygon,
  { id: number; lot_latitude: number; lot_longitude: number }
> = JSON.parse(isochroneString)

export function isochroneFeatureCollection(
  statuses: Record<string, RecordStatus>,
): FeatureCollection<Polygon | MultiPolygon, { status: Status }> {
  return {
    type: 'FeatureCollection',
    features: isochrones.features.map((f) => ({
      ...f,
      properties: {
        status: parseRecordStatus(statuses[f.properties.id] ?? 'na'),
      },
    })),
  }
}

export const lotPoints: FeatureCollection = {
  type: 'FeatureCollection',
  features: isochrones.features.map((f) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [f.properties.lot_longitude, f.properties.lot_latitude],
    },
    properties: { id: f.properties.id },
  })),
}
