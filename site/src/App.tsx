import { add, isAfter, isBefore, isEqual, startOfDay, sub } from 'date-fns'
import mapboxgl, { MapLayerMouseEvent } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ChangeEvent, useState } from 'react'
import Map, { Layer, Popup, Source } from 'react-map-gl'
import {
  days,
  earliestDate,
  isochroneFeatureCollectionAtDate,
  latestDate,
  lotPointsAtDate,
  LotProperties,
} from './lots'
import {
  localizedLotStatus,
  LotStatus,
  lotStatuses,
  statusColor,
} from './status'

mapboxgl.setRTLTextPlugin(
  'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
  () => {},
  true,
)

const fullIsochroneLayerId = 'full-isochrones'
const availableIsochroneLayerId = 'available-isochrones'
const unknownIsochroneLayerId = 'unknown-isochrones'
const lotPointSourceId = 'lot-points'
const lotHoverLayerId = 'lot-hover-circles'

type PopupData = {
  longitude: number
  latitude: number
  lots: LotProperties[]
}

export function App() {
  const [firstLayerId, setFirstLayerId] = useState<string | null>(null)
  const [date, setDate] = useState(earliestDate)
  const [popup, setPopup] = useState<PopupData | null>(null)

  const timeString = Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  const onMouseChange = (event: MapLayerMouseEvent) => {
    const newPopup = popupForEvent(event)
    const oldLotIds = (popup?.lots ?? []).map((lot) => lot.gis_id)
    const newLotIds = (newPopup?.lots ?? []).map((lot) => lot.gis_id)
    for (const id of oldLotIds) {
      event.target.removeFeatureState({
        source: lotPointSourceId,
        id,
      })
    }
    for (const id of newLotIds) {
      event.target.setFeatureState(
        {
          source: lotPointSourceId,
          id,
        },
        { hover: true },
      )
    }
    setPopup(newPopup)
  }

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
        interactiveLayerIds={[lotHoverLayerId]}
        onMouseEnter={onMouseChange}
        onMouseMove={onMouseChange}
        onMouseLeave={onMouseChange}
      >
        {firstLayerId && (
          <>
            <Source
              type='geojson'
              data={isochroneFeatureCollectionAtDate(date)}
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
            <Source
              type='geojson'
              data={lotPointsAtDate(date)}
              id={lotPointSourceId}
            >
              <Layer
                type='circle'
                id={lotHoverLayerId}
                paint={{ 'circle-opacity': 0, 'circle-radius': 10 }}
              />
              <Layer
                type='circle'
                paint={{
                  'circle-color': [
                    'match',
                    ['get', 'status'],
                    ...lotStatuses.flatMap((status) => [
                      status,
                      statusColor(status, 'dark'),
                    ]),
                    statusColor('unknown', 'dark'),
                  ],
                  'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    10,
                    5,
                  ],
                }}
              />
            </Source>
            {popup && (
              <Popup
                longitude={popup.longitude}
                latitude={popup.latitude}
                closeButton={false}
              >
                <div dir='rtl'>
                  {popup.lots.map((lot) => (
                    <p key={lot.gis_id}>{`${lot.gis_name}: ${localizedLotStatus(
                      lot.rawStatus,
                    )}`}</p>
                  ))}
                </div>
              </Popup>
            )}
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
        <DaySelect date={date} setDate={setDate} />
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

function DaySelect({
  date,
  setDate,
}: {
  date: Date
  setDate: (date: Date) => void
}) {
  const formatter = Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(+event.target.value)
    newDate.setHours(date.getHours())
    newDate.setMinutes(date.getMinutes())

    if (isBefore(newDate, earliestDate)) {
      setDate(earliestDate)
    } else if (isAfter(newDate, latestDate)) {
      setDate(latestDate)
    } else {
      setDate(newDate)
    }
  }

  return (
    <select value={startOfDay(date).getTime()} onChange={onChange}>
      {days.map((day) => (
        <option key={day.getTime()} value={day.getTime()}>
          {formatter.format(day)}
        </option>
      ))}
    </select>
  )
}

function StatusLayer({
  status,
  id,
  beforeId,
  source,
}: {
  status: LotStatus
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
        'fill-color': statusColor(status, 'light'),
      }}
    />
  )
}

function popupForEvent(event: MapLayerMouseEvent): PopupData | null {
  const lots = (event.features ?? [])
    .map((feature) => feature.properties)
    .filter((lot) => lot?.gis_id && lot?.rawStatus) as LotProperties[]

  if (lots.length === 0) {
    return null
  }

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    lots,
  }
}
