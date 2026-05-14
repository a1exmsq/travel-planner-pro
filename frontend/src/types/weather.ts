export interface WeatherDayDTO {
  date: string
  condition: string
  highTempC: number
  lowTempC: number
  precipitationChance: number
  windKph: number
  note?: string | null
}

export interface WeatherStopSnapshotDTO {
  stopName: string
  cityName?: string | null
  date: string
  condition: string
  temperatureC: number
  precipitationChance: number
}

export interface WeatherOverviewDTO {
  provider: string
  generatedAt: string
  summary: string
  days: WeatherDayDTO[]
  stopSnapshots: WeatherStopSnapshotDTO[]
}
