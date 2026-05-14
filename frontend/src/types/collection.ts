import type { RouteResponseDTO } from './route'

export interface RouteCollectionDTO {
  id: number
  name: string
  description?: string
  routesCount: number
  routes: RouteResponseDTO[]
}
