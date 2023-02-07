import { isochroneFeatureCollection } from './polygonCalculation'
import { type Message, type Response } from './workerWrapper'

onmessage = (event: MessageEvent<Message>) => {
  const { time, statuses } = event.data
  const featureCollection = isochroneFeatureCollection(statuses)
  const response: Response = {
    time,
    featureCollection,
  }
  postMessage(response)
}
