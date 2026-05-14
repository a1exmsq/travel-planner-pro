export interface RouteExpenseDTO {
  id: number
  routePoiId?: number | null
  routePoiName?: string | null
  category: string
  name: string
  plannedAmount?: number | null
  actualAmount?: number | null
  currency?: string | null
  date?: string | null
  isPaid?: boolean | null
  notes?: string | null
}

export interface CategoryBudgetDTO {
  category: string
  planned: number
  actual: number
}

export interface BudgetSummaryDTO {
  totalBudget: number
  totalPlanned: number
  totalActual: number
  remaining: number
  currency: string
  categories: CategoryBudgetDTO[]
}
