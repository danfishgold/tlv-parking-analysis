import { countBy } from 'lodash-es'
import mapboxgl, { MapLayerMouseEvent } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ChangeEvent, useState } from 'react'
import Map, { Layer, Popup, Source } from 'react-map-gl'
import {
  RecordDate,
  dateOptions,
  decodeDate,
  encodeDate,
  formattedDay,
  formattedTime,
  nextDate,
  previousDate,
} from './dates'
import {
  LotProperties,
  isochroneFeatureCollectionAtDate,
  lotPointsAtDate,
} from './features'
import { statusColor, statusGradeColorGradient } from './status'

mapboxgl.setRTLTextPlugin(
  'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
  () => {},
  true,
)

const lotPointSourceId = 'lot-points'
const lotHoverLayerId = 'lot-hover-circles'

type PopupData = {
  longitude: number
  latitude: number
  lots: LotProperties[]
}

export function App() {
  const [firstLayerId, setFirstLayerId] = useState<string | null>(null)
  const [date, setDate] = useState<RecordDate>(dateOptions[0])
  const [popup, setPopup] = useState<PopupData | null>(null)

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
              <Layer
                type='fill'
                beforeId={firstLayerId}
                paint={{
                  'fill-color': statusGradeColorGradient('light'),
                }}
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
                  'circle-color': statusGradeColorGradient('dark'),
                  'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    10,
                    5,
                  ],
                }}
              />
            </Source>
            {popup && <LotPopup popup={popup} />}
          </>
        )}
      </Map>
      <Controls date={date} setDate={setDate} />
    </>
  )
}

function Controls({
  date,
  setDate,
}: {
  date: RecordDate
  setDate: (date: RecordDate) => void
}) {
  const next = nextDate(date)
  const prev = previousDate(date)

  return (
    <div id='controls'>
      <button disabled={!prev} onClick={() => setDate(prev!)}>
        קודם
      </button>
      <DaySelect date={date} setDate={setDate} />
      <span>{formattedTime(date)}</span>
      <button disabled={!next} onClick={() => setDate(next!)}>
        אחר כך
      </button>
    </div>
  )
}

function DaySelect({
  date,
  setDate,
}: {
  date: RecordDate
  setDate: (date: RecordDate) => void
}) {
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newDate = decodeDate({
      dateString: event.target.value,
      baseDate: date,
    })
    setDate(newDate)
  }

  return (
    <select value={encodeDate(date)} onChange={onChange}>
      {dateOptions.map((dateOption) => (
        <option key={encodeDate(dateOption)} value={encodeDate(dateOption)}>
          {formattedDay(dateOption)}
        </option>
      ))}
    </select>
  )
}

function popupForEvent(event: MapLayerMouseEvent): PopupData | null {
  const lots: LotProperties[] = (
    (event.features ?? [])
      .map((feature) => feature.properties)
      .filter((lot) => lot?.statuses) as LotProperties[]
  ).map((lot) => ({
    ...lot,
    statuses: JSON.parse(lot.statuses as unknown as string),
  }))

  if (lots.length === 0) {
    return null
  }

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    lots,
  }
}

function LotPopup({ popup }: { popup: PopupData }) {
  return (
    <Popup
      longitude={popup.longitude}
      latitude={popup.latitude}
      closeButton={false}
    >
      <div dir='rtl'>
        {popup.lots.map((lot) => (
          <PopupSectionForLot key={lot.gis_id} lot={lot} />
        ))}
      </div>
    </Popup>
  )
}

function PopupSectionForLot({ lot }: { lot: LotProperties }) {
  const statusCounts = countBy(lot.statuses)

  return (
    <>
      <h3>{lot.gis_name}</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100px',
          height: '15px',
        }}
      >
        <div
          style={{
            flexGrow: statusCounts['available'] ?? 0,
            background: statusColor('available', 'dark'),
          }}
        />
        <div
          style={{
            flexGrow: statusCounts['full'] ?? 0,
            background: statusColor('full', 'dark'),
          }}
        />
        <div
          style={{
            flexGrow: statusCounts['unknown'] ?? 0,
            background: statusColor('unknown', 'dark'),
          }}
        />
      </div>
    </>
  )
}
