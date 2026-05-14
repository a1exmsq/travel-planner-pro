export interface JournalEntryDTO {
  id: number
  entryDate: string
  title: string
  story?: string | null
  locationLabel?: string | null
  mood?: string | null
  highlight?: string | null
  favorite: boolean
  mediaUrls: string[]
  createdAt: string
  updatedAt: string
}
