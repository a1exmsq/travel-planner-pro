export interface ImportedStopDTO {
  name: string
  latitude?: number | null
  longitude?: number | null
  resolved: boolean
  sourceLabel: string
  note?: string | null
}

export interface RouteImportPreviewDTO {
  provider: string
  sourceUrl: string
  suggestedTitle?: string | null
  summary: string
  warnings: string[]
  stops: ImportedStopDTO[]
}
