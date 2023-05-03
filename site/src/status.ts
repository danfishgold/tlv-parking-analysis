export const lotStatuses = ['available', 'full', 'unknown'] as const
export type LotStatus = (typeof lotStatuses)[number]
import { Expression as MapboxStyleExpression } from 'mapbox-gl'

export function localizedLotStatus(status: string): string {
  switch (status) {
    case 'full':
      return 'מלא'
    case 'available':
      return 'פנוי'
    case 'few':
      return 'מעט'
    case 'unknown':
      return 'לא ידוע'
    case 'closed':
      return 'סגור'
    default:
      return status
  }
}

export function parseLotStatus(status: string): LotStatus {
  switch (status) {
    case 'full':
      return 'full'
    case 'available':
      return 'available'
    case 'few':
      return 'available'
    case 'closed':
      return 'full'
    default:
      return 'unknown'
  }
}

export function statusGrade(status: LotStatus): number | null {
  switch (status) {
    case 'available':
      return 1
    case 'full':
      return 0
    case 'unknown':
      return null
  }
}

export function statusGradeColorGradient(
  variant: 'light' | 'dark',
): MapboxStyleExpression {
  return [
    'interpolate-lab',
    ['linear'],
    ['get', 'grade'],
    -1,
    statusColor('unknown', variant),
    0,
    statusColor('full', variant),
    1,
    statusColor('available', variant),
  ]
}

export function statusColor(
  status: LotStatus,
  variant: 'light' | 'dark',
): string {
  if (variant === 'light') {
    switch (status) {
      case 'available':
        return '#9fd49f'
      case 'full':
        return '#ffb3b3'
      case 'unknown':
        return '#b3b3b3'
    }
  } else {
    switch (status) {
      case 'available':
        return 'green'
      case 'full':
        return 'red'
      case 'unknown':
        return 'black'
    }
  }
}
