import IsochroneGeometryWorker from './worker?worker'

export type Message = {
  time: string
}

export const worker = new IsochroneGeometryWorker()

let timer = 0

export function postMessage(message: Message) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    worker.postMessage(message)
  }, 300)
}
