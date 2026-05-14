export interface ContinentDTO {
  id: number
  name: string
  code?: string
  description?: string
  imageUrl?: string
  emoji?: string
  countriesCount?: number
  routesCount?: number
}

export interface CountryDTO {
  id: number
  name: string
  code?: string
  description?: string
  imageUrl?: string
  flagEmoji?: string
  citiesCount?: number
  routesCount?: number
  poiCount?: number
  continentId?: number
  continentName?: string
}

export interface CityDTO {
  id: number
  name: string
  description?: string
  imageUrl?: string
  galleryUrls?: string[]
  latitude?: number
  longitude?: number
  routesCount?: number
  poiCount?: number
  countryId?: number
  countryName?: string
  countryCode?: string
  flagEmoji?: string
}
