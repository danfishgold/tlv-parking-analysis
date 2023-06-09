import { countBy } from 'lodash-es'
import mapboxgl, { MapLayerMouseEvent } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import Map, { Layer, Popup, Source } from 'react-map-gl'
import {
  RecordDate,
  dateOptions,
  decodeDate,
  encodeDate,
  formattedDay,
  formattedTime,
  hasPartialRecords,
  nextDate,
  previousDate,
} from './dates'
import {
  LotProperties,
  isochroneFeatureCollectionAtDate,
  lotPointsAtDate,
  lotRecordsAtDate,
} from './features'
import {
  LotStatus,
  localizedLotStatus,
  statusColor,
  statusGradeColorGradient,
} from './status'

if (mapboxgl.getRTLTextPluginStatus() === 'unavailable') {
  mapboxgl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
    () => {},
    true,
  )
}

const lotPointSourceId = 'lot-points'
const lotHoverLayerId = 'lot-hover-circles'

type PopupData = {
  longitude: number
  latitude: number
  lots: Omit<LotProperties, 'statuses'>[]
}

export function App() {
  const [firstLayerId, setFirstLayerId] = useState<string | null>(null)
  const [date, setDate] = useState<RecordDate>(dateOptions[0])
  const [popup, setPopup] = useState<PopupData | null>(null)

  const onMouseChange = (event: MapLayerMouseEvent) => {
    const newPopup = popupForEvent(event)
    event.target.removeFeatureState({ source: lotPointSourceId })
    for (const lot of newPopup?.lots ?? []) {
      event.target.setFeatureState(
        {
          source: lotPointSourceId,
          id: lot.gis_id,
        },
        { hover: true },
      )
    }
    setPopup(newPopup)
  }

  useEffect(() => {
    const keyboardHandler = (event: KeyboardEvent) => {
      if (['j', 'J', 'ח'].includes(event.key)) {
        setDate((date) => previousDate(date) ?? date)
      } else if (['k', 'K', 'ל'].includes(event.key)) {
        setDate((date) => nextDate(date) ?? date)
      }
    }

    document.addEventListener('keydown', keyboardHandler)
    return () => document.removeEventListener('keydown', keyboardHandler)
  }, [])

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
            {popup && <LotPopup popup={popup} date={date} />}
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
      <p>
        כל נקודה היא חניון לילה של אחוזות החוף והשטח סביבן מייצג מרחק הליכה של
        עד 500 מטרים (או 250 מטרים לחניונים של עד 70 מקומות חניה).
      </p>
      <p>
        מקרא:
        <span
          className='legend-marker'
          style={{ background: statusColor('unknown', 'light') }}
        />{' '}
        מידע לא זמין
        <span
          className='legend-marker'
          style={{ background: statusColor('full', 'light') }}
        />{' '}
        חניון מלא
        <span
          className='legend-marker'
          style={{ background: statusColor('available', 'light') }}
        />{' '}
        חניון פנוי
      </p>
      <DaySelect date={date} setDate={setDate} />
      <button disabled={!prev} onClick={() => setDate(prev!)}>
        קודם
      </button>
      <span>{formattedTime(date)}</span>
      <button disabled={!next} onClick={() => setDate(next!)}>
        אחר כך
      </button>
      <p>
        ניתן להשתמש במקשי <kbd>j</kbd> ו <kbd>k</kbd> כדי להזיז את השעה
        קדימה/אחורה.
      </p>
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
          {hasPartialRecords(dateOption) ? ` (מידע חסר)` : ''}
        </option>
      ))}
    </select>
  )
}

function popupForEvent(event: MapLayerMouseEvent): PopupData | null {
  const lots: LotProperties[] = (event.features ?? [])
    .map((feature) => feature.properties)
    .filter((lot) => lot?.gis_id) as LotProperties[]

  if (lots.length === 0) {
    return null
  }

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    lots,
  }
}

function LotPopup({ popup, date }: { popup: PopupData; date: RecordDate }) {
  const records = useMemo(() => lotRecordsAtDate(date), [date])
  return (
    <Popup
      longitude={popup.longitude}
      latitude={popup.latitude}
      closeButton={false}
    >
      <div dir='rtl'>
        {popup.lots.map((lot) => (
          <PopupSectionForLot
            key={lot.gis_id}
            lot={{
              ...lot,
              statuses: lot.ahuzot_id ? records[lot.ahuzot_id] ?? [] : [],
            }}
            date={date}
          />
        ))}
      </div>
    </Popup>
  )
}

function PopupSectionForLot({
  lot,
  date,
}: {
  lot: LotProperties
  date: RecordDate
}) {
  return (
    <>
      <h3>{lot.gis_name}</h3>
      {lot.lot_capacity ? (
        <p>{`${lot.lot_capacity} מקומות חניה`}</p>
      ) : (
        <p>כמות מקומות חניה לא ידועה</p>
      )}
      <p>{statusDescription(date, lot.statuses)}</p>
      {date.type === 'dayGroup' && <StatusBar statuses={lot.statuses} />}
    </>
  )
}

function statusDescription(date: RecordDate, statuses: LotStatus[]): string {
  switch (date.type) {
    case 'dayGroup': {
      const counts = countBy(statuses)
      const countPart = Object.entries(counts)
        .map(([status, count]) => `${localizedLotStatus(status)} (${count})`)
        .join(', ')
      return `מתוך ${statuses.length} פעמים בשעה ${formattedTime(
        date,
      )} ב${formattedDay(date)}: ${countPart}`
    }
    case 'timestamp': {
      if (statuses.length > 1) {
        throw new Error(`Expected just one status for date ${date}`)
      } else if (statuses.length === 0) {
        return 'לא ידוע'
      }
      return localizedLotStatus(statuses[0])
    }
  }
}

function StatusBar({ statuses }: { statuses: LotStatus[] }) {
  const statusCounts = countBy(statuses)

  return (
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
  )
}
