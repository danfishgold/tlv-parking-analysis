import { format } from 'date-fns'
import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Point,
  Polygon,
} from 'geojson'
import { mean, sortBy } from 'lodash-es'
import { RecordDate, timestampsForDate } from './dates'
import {
  JsonLotProperties,
  LotProperties,
  isochrones,
  keyFormat,
  lotPoints,
  lotRecords,
} from './lots'
import { LotStatus, parseLotStatus, statusGrade } from './status'

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

function lotRecordsAtDate(date: RecordDate): Record<string, LotStatus[]> {
  const timestamps = timestampsForDate(date)
  const keys = timestamps.map((ts) => format(ts, keyFormat))

  const recordSets = keys.map((key) => lotRecords.get(key) ?? {})
  const groupedRecords: Record<string, LotStatus[]> = {}
  for (const record of recordSets) {
    for (const [lotId, status] of Object.entries(record)) {
      groupedRecords[lotId] = [...(groupedRecords[lotId] ?? []), status]
    }
  }
  return groupedRecords
}
