import { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import isochroneString from '../../parking_lot_isochrones_7min.geojson?raw'
import { RecordStatus } from './lotRecords'
import { parseRecordStatus, Status } from './status'

const isochrones: FeatureCollection<Polygon, { id: number }> =
  JSON.parse(isochroneString)

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
