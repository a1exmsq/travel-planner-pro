import type { PoiResponseDTO } from './route'

export interface PoiCategoryCountDTO {
  label: string
  count: number
}

export interface PoiCatalogResponseDTO {
  items: PoiResponseDTO[]
  categories: PoiCategoryCountDTO[]
  total: number
  featuredCount: number
  cityId?: number | null
  countryId?: number | null
}
