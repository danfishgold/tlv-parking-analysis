import { add, isEqual, sub } from 'date-fns'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl'
import { earliestDate, latestDate, lotRecordsAtDate } from './lotRecords'
import { isochroneFeatureCollection, lotPoints } from './polygonCalculation'
import { Status, statusColor } from './status'

mapboxgl.setRTLTextPlugin(
  'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
  () => {},
  true,
)

const fullIsochroneLayerId = 'full-isochrones'
const availableIsochroneLayerId = 'available-isochrones'
const unknownIsochroneLayerId = 'unknown-isochrones'

export function App() {
  const [firstLayerId, setFirstLayerId] = useState<string | null>(null)
  const [date, setDate] = useState(earliestDate)
  const [popup, setPopup] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const timeString = Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  return (
    <>
      <Map
        initialViewState={{
          longitude: 34.78262901306153,
          latitude: 32.08642879334798,
          zoom: 13,
        }}
        style={{ flexGrow: 1, position: 'relative' }}
        mapStyle={'mapbox://styles/mapbox/streets-v12'}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        attributionControl={false}
        onLoad={(event) => {
          console.log(event.target.getStyle().layers[11].id)
          setFirstLayerId(event.target.getStyle().layers[11].id)
        }}
      >
        {firstLayerId && (
          <>
            <Source
              type='geojson'
              data={isochroneFeatureCollection(lotRecordsAtDate(date)!)}
            >
              <StatusLayer
                status='available'
                id={availableIsochroneLayerId}
                beforeId={firstLayerId}
              />
              <StatusLayer
                status='full'
                id={fullIsochroneLayerId}
                beforeId={availableIsochroneLayerId!}
              />
              <StatusLayer
                status='unknown'
                id={unknownIsochroneLayerId}
                beforeId={fullIsochroneLayerId!}
              />
            </Source>
            <Source type='geojson' data={lotPoints}>
              <Layer type='circle' />
            </Source>
          </>
        )}
      </Map>
      <div id='controls'>
        <button
          disabled={isEqual(date, earliestDate)}
          onClick={() => setDate(sub(date, { minutes: 30 }))}
        >
          קודם
        </button>
        <span>{timeString}</span>
        <button
          disabled={isEqual(date, latestDate)}
          onClick={() => setDate(add(date, { minutes: 30 }))}
        >
          אחר כך
        </button>
      </div>
    </>
  )
}

function StatusLayer({
  status,
  id,
  beforeId,
  source,
}: {
  status: Status
  id: string
  beforeId: string
  source?: string
}) {
  return (
    <Layer
      source={source}
      type='fill'
      id={id}
      beforeId={beforeId}
      filter={['==', ['get', 'status'], ['string', status]]}
      paint={{
        'fill-color': statusColor(status),
      }}
    />
  )
}
