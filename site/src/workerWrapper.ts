import { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { RecordStatus } from './lotRecords'
import { type Status } from './status'
import IsochroneGeometryWorker from './worker?worker'

export type Message = {
  time: string
  statuses: Record<string, RecordStatus>
}

export type Response = {
  time: string
  featureCollection: FeatureCollection<
    Polygon | MultiPolygon,
    { status: Status }
  >
}

export const worker = new IsochroneGeometryWorker()

let timer = 0

export function postMessage(message: Message) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    worker.postMessage(message)
  }, 300)
}
