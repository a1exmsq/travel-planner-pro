export interface UserAchievementDTO {
  id: number
  code: string
  name: string
  description: string
  icon: string
  points: number
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | string
  type: string
  unlockedAt?: string | null
  progress?: number
}

export interface UserStatsDTO {
  userId: number
  username: string
  totalPoints: number
  level: number
  levelTitle: string
  routesCreated: number
  countriesVisited: number
  citiesVisited: number
  poisAdded: number
  totalDistanceTraveled: number
  currentStreak: number
  nextLevelPoints: number
}
