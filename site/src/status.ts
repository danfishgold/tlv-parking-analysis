import { type RecordStatus } from './lotRecords'

export type Status = 'available' | 'full' | 'unknown'

export function statusColor(status: Status): string {
  switch (status) {
    case 'available':
      return '#9fd49f'
    case 'full':
      return '#ffb3b3'
    case 'unknown':
      return '#b3b3b3'
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
