import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Status, statusColor, times } from './lotData'
import './style.css'
import IsochroneGeometryWorker from './worker?worker'

const worker = new IsochroneGeometryWorker()

let timer = 0

const debouncedPostMessage = (time: string) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    worker.postMessage(time)
    console.log('tick')
  }, 300)
}

worker.onmessage = (event) => {
  const { time, featureCollection } = event.data
  if (time !== times[timeIndex]) {
    return
  }
  if (layer) {
    map.removeLayer(layer)
  }
  layer = L.geoJSON<{ status: Status }>(featureCollection, {
    style: (feature) => ({
      fillColor: statusColor(feature!.properties.status),
      fillOpacity: 0.3,
      color: 'gray',
    }),
  }).addTo(map)
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

let layer: L.GeoJSON | null = null

L.tileLayer(
  'https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}@2x.png',
).addTo(map)

function setTimeIndex(newTimeIndex: number) {
  timeIndex = newTimeIndex
  const time = times[timeIndex]

  elements.timeLabel.innerHTML = Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))

  setDisabled(elements.beforeButton, timeIndex === 0)
  setDisabled(elements.afterButton, timeIndex === times.length - 1)
  debouncedPostMessage(time)
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
