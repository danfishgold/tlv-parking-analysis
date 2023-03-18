import { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import mapboxgl, { GeoJSONSource } from 'mapbox-gl'
import { lotRecords, times } from './lotRecords'
import { isochroneFeatureCollection } from './polygonCalculation'
import { type Status } from './status'
import './style.css'

const elements = {
  map: document.querySelector<HTMLDivElement>('#map')!,
  beforeButton: document.querySelector<HTMLDivElement>('#before')!,
  afterButton: document.querySelector<HTMLDivElement>('#after')!,
  timeLabel: document.querySelector<HTMLDivElement>('#time')!,
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.setRTLTextPlugin(
  'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
  () => {},
  true,
)

const isochroneSourceId = 'isochrones'
const fullIsochroneSourceId = 'full-isochrones'
const availableIsochroneSourceId = 'available-isochrones'
const unknownIsochroneSourceId = 'unknown-isochrones'

const map = new mapboxgl.Map({
  container: elements.map,
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [34.78262901306153, 32.08642879334798],
  zoom: 13,
})

map.on('load', () => {
  const firstLayerId = map.getStyle().layers[11].id
  console.log(
    map
      .getStyle()
      .layers.slice(7, 40)
      .map((l) => l.id),
  )

  map.addSource(isochroneSourceId, {
    type: 'geojson',
    data: isochroneFeatureCollection(lotRecords[times[0]]),
  })
  map.addLayer(
    {
      id: availableIsochroneSourceId,
      source: isochroneSourceId,
      type: 'fill',
      filter: ['==', ['get', 'status'], ['string', 'available']],
      paint: {
        'fill-color': '#9fd49f',
      },
    },
    firstLayerId,
  )
  map.addLayer(
    {
      id: fullIsochroneSourceId,
      source: isochroneSourceId,
      type: 'fill',
      filter: ['==', ['get', 'status'], ['string', 'full']],
      paint: {
        'fill-color': '#ffb3b3',
      },
    },
    availableIsochroneSourceId,
  )
  map.addLayer(
    {
      id: unknownIsochroneSourceId,
      source: isochroneSourceId,
      type: 'fill',
      filter: ['==', ['get', 'status'], ['string', 'unknown']],
      paint: {
        'fill-color': '#b3b3b3',
      },
    },
    fullIsochroneSourceId,
  )
})

function resetLayers(
  featureCollection: FeatureCollection<
    Polygon | MultiPolygon,
    { status: Status }
  >,
) {
  if (!map.loaded()) {
    return
  }
  const isochroneSource = map.getSource(isochroneSourceId) as GeoJSONSource
  isochroneSource.setData(featureCollection)
}

let timeIndex: number

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
