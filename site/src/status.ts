export const lotStatuses = ['available', 'full', 'unknown'] as const
export type LotStatus = typeof lotStatuses[number]

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
