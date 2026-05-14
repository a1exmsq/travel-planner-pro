export interface PackingItemDTO {
  id: number
  title: string
  category: string
  notes?: string | null
  quantity: number
  packed: boolean
  requiredFor?: string | null
  orderIndex: number
}
