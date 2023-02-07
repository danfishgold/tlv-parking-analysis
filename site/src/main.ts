import { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { lotRecords, times } from './lotRecords'
import { isochroneFeatureCollection } from './polygonCalculation'
import { statusColor, type Status } from './status'
import './style.css'

function resetLayers(
  featureCollection: FeatureCollection<
    Polygon | MultiPolygon,
    { status: Status }
  >,
) {
  if (layer) {
    map.removeLayer(layer)
  }
  layer = L.layerGroup([
    L.geoJSON<{ status: Status }>(featureCollection!, {
      style: (feature) => ({
        fillColor: statusColor(feature!.properties.status),
        fillOpacity: 1,
        stroke: false,
      }),
      filter: (feature) => feature.properties.status === 'unknown',
    }),
    L.geoJSON<{ status: Status }>(featureCollection!, {
      style: (feature) => ({
        fillColor: statusColor(feature!.properties.status),
        fillOpacity: 1,
        stroke: false,
      }),
      filter: (feature) => feature.properties.status === 'full',
    }),
    L.geoJSON<{ status: Status }>(featureCollection!, {
      style: (feature) => ({
        fillColor: statusColor(feature!.properties.status),
        fillOpacity: 1,
        stroke: false,
      }),
      filter: (feature) => feature.properties.status === 'available',
    }),
  ]).addTo(map)
}

const elements = {
  map: document.querySelector<HTMLDivElement>('#map')!,
  beforeButton: document.querySelector<HTMLDivElement>('#before')!,
  afterButton: document.querySelector<HTMLDivElement>('#after')!,
  timeLabel: document.querySelector<HTMLDivElement>('#time')!,
}

let timeIndex: number

const map = L.map(elements.map, {
  center: [32.08642879334798, 34.78262901306153],
  zoom: 13,
})

let layer: L.LayerGroup | null = null

L.tileLayer(
  'https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}@2x.png',
).addTo(map)

function setTimeIndex(newTimeIndex: number) {
  timeIndex = newTimeIndex
  const time = times[newTimeIndex]

  elements.timeLabel.innerHTML = Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))

  setDisabled(elements.beforeButton, newTimeIndex === 0)
  setDisabled(elements.afterButton, newTimeIndex === times.length - 1)
  resetLayers(isochroneFeatureCollection(lotRecords[time]))
}

setTimeIndex(128)

elements.beforeButton.onclick = () => setTimeIndex(timeIndex - 1)
elements.afterButton.onclick = () => setTimeIndex(timeIndex + 1)

function setDisabled(element: HTMLElement, disabled: boolean) {
  if (disabled) {
    element.setAttribute('disabled', '')
  } else {
    element.removeAttribute('disabled')
  }
}
