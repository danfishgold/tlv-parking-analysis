import { type RecordStatus } from './lotRecords'

export type Status = 'available' | 'full' | 'unknown'

export function statusColor(status: Status): string {
  switch (status) {
    case 'available':
      return 'green'
    case 'full':
      return 'red'
    case 'unknown':
      return 'gray'
  }
}

export function parseRecordStatus(status: RecordStatus): Status {
  switch (status) {
    case 'full':
      return 'full'
    case 'available':
      return 'available'
    case 'few':
      return 'available'
    default:
      return 'unknown'
  }
}
