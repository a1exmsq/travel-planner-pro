export interface PoiResponseDTO {
  routePoiId: number
  id: number
  name: string
  category: string
  orderIndex: number
  travelTimeMinutes: number
  latitude: number
  longitude: number
  description: string
  mainImageUrl: string
  imageUrl?: string
  galleryUrls: string[]
  isGlobal?: boolean
  address?: string
  cityId?: number
  cityName?: string
  countryId?: number
  countryName?: string
  source?: string
  externalSourceId?: string
  sourceUrl?: string
  editorialScore?: number
  qualityScore?: number
  visitMinutes?: number
  priceLevel?: number
  usageCount?: number
  featured?: boolean
  verified?: boolean
  importBatch?: string
  tags?: string[]
  distanceFromPrevious?: number
  durationFromPrevious?: number
  roadGeometry?: [number, number][]
}

export interface RouteResponseDTO {
  id: number
  name: string
  description: string
  likeCounts: number
  public: boolean
  routeType: 'CITY' | 'REGION' | 'MULTI_CITY' | 'ROAD_TRIP' | 'CUSTOM'
  regionLabel?: string
  locationSummary?: string
  primaryCountryId?: number
  primaryCountryName?: string
  primaryCountryCode?: string
  primaryCountryImageUrl?: string
  primaryCityId?: number
  primaryCityName?: string
  primaryCityImageUrl?: string
  mainImageUrl: string
  routeMediaUrls: string[]
  vibeTags: string[]
  forkedFromRouteId?: number
  forkedFromRouteName?: string
  forkedFromAuthorUsername?: string
  originalRouteId?: number
  originalRouteName?: string
  originalRouteAuthorUsername?: string
  remixCount?: number
  totalDistanceKm?: number
  isOptimized?: boolean
  accessRole?: 'OWNER' | 'EDITOR' | 'VIEWER' | 'PUBLIC' | string | null
  canEdit?: boolean
  canManageCollaborators?: boolean
  startDate?: string | null
  endDate?: string | null
  numberOfDays?: number
  totalBudget?: number
  budgetSpent?: number
  currency?: string
  packingItemCount?: number
  packedItemCount?: number
  journalEntryCount?: number
  author: {
    id: number
    username: string
    level?: number
    levelTitle?: string
  }
  stops: PoiResponseDTO[]
  totalPoints: number
  totalDurationMinutes: number
}
