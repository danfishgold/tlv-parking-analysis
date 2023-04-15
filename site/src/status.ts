export const lotStatuses = ['available', 'full', 'unknown'] as const
export type LotStatus = typeof lotStatuses[number]

export function parseLotStatus(status: string): LotStatus {
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
