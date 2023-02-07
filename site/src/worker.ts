import { isochroneFeatureCollection } from './lotData'

onmessage = (event) => {
  const time = event.data
  const featureCollection = isochroneFeatureCollection(time)
  postMessage({ time, featureCollection })
}

export const a = 4
