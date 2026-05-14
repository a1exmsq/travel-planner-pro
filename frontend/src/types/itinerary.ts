export interface DayActivityDTO {
  id: number
  routePoiId: number
  name: string
  orderIndex: number
  startTime?: string | null
  durationMinutes: number
  activityType: string
  notes?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface RouteDayDTO {
  id: number
  dayNumber: number
  date?: string | null
  title?: string | null
  notes?: string | null
  totalDistanceKm?: number
  totalDurationMinutes?: number
  totalBudget?: number
  activityCount?: number
  activities: DayActivityDTO[]
}
