import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  isochroneFeatureCollection,
  Status,
  statusColor,
  times,
} from './lotData'
import './style.css'

const elements = {
  map: document.querySelector<HTMLDivElement>('#map')!,
  beforeButton: document.querySelector<HTMLDivElement>('#before')!,
  afterButton: document.querySelector<HTMLDivElement>('#after')!,
  timeLabel: document.querySelector<HTMLDivElement>('#time')!,
}

let timeIndex = 0

const map = L.map(elements.map, {
  center: [32.08642879334798, 34.78262901306153],
  zoom: 13,
})

let layer: L.GeoJSON | null = null

L.tileLayer(
  'https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}@2x.png',
).addTo(map)

function setTimeIndex(newTimeIndex: number) {
  if (layer) {
    map.removeLayer(layer)
  }

  timeIndex = newTimeIndex
  const time = times[timeIndex]

  elements.timeLabel.innerHTML = Intl.DateTimeFormat('he-IL', {
    timeStyle: 'short',
    dateStyle: 'medium',
  }).format(new Date(time))

  setDisabled(elements.beforeButton, timeIndex === 0)
  setDisabled(elements.afterButton, timeIndex === times.length - 1)

  layer = L.geoJSON<{ status: Status }>(isochroneFeatureCollection(time), {
    style: (feature) => ({
      fillColor: statusColor(feature!.properties.status),
      fillOpacity: 0.3,
      color: 'gray',
    }),
  }).addTo(map)
}

setTimeIndex(0)

elements.beforeButton.onclick = () => setTimeIndex(timeIndex - 1)
elements.afterButton.onclick = () => setTimeIndex(timeIndex + 1)

function setDisabled(element: HTMLElement, disabled: boolean) {
  if (disabled) {
    element.setAttribute('disabled', '')
  } else {
    element.removeAttribute('disabled')
  }
}
