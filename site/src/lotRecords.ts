import lotRecordsJson from '../../parsed_lot_records.json'

export type RecordStatus = 'available' | 'few' | 'full' | 'active' | 'na'

export const lotRecords = lotRecordsJson as Record<
  string,
  Record<string, RecordStatus>
>
export const times = Object.keys(lotRecords).sort()
