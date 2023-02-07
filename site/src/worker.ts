import { isochroneFeatureCollection } from './lotData'

onmessage = (event: MessageEvent<{ time: string }>) => {
  const { time } = event.data
  const featureCollection = isochroneFeatureCollection(time)
  postMessage({ time, featureCollection })
}
