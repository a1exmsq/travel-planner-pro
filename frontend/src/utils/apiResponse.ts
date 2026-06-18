/**
 * Normalizes API responses that may be either a plain array or a wrapped page
 * object (e.g. Spring Data `Page` with `content`, or a generic `{ data: [...] }`
 * envelope). Returns an empty array for `null`, `undefined`, or any unexpected
 * shape so callers can safely run array methods like `reduce`/`forEach`/`map`.
 */
export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data
  }

  if (data != null && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.content)) {
      return record.content as T[]
    }
    if (Array.isArray(record.data)) {
      return record.data as T[]
    }
  }

  return []
}

export interface PageMetadata {
  last?: boolean
  totalPages?: number
  number?: number
  totalElements?: number
}

/**
 * Extracts both the item array and pagination metadata from a response.
 * Works for plain arrays (non-paginated endpoints) and Spring Data `Page`
 * objects alike.
 */
export function extractPage<T>(data: unknown): { content: T[]; meta: PageMetadata } {
  if (Array.isArray(data)) {
    return { content: data, meta: {} }
  }

  if (data != null && typeof data === 'object') {
    const record = data as Record<string, unknown>
    return {
      content: asArray<T>(data),
      meta: {
        last: typeof record.last === 'boolean' ? record.last : undefined,
        totalPages: typeof record.totalPages === 'number' ? record.totalPages : undefined,
        number: typeof record.number === 'number' ? record.number : undefined,
        totalElements: typeof record.totalElements === 'number' ? record.totalElements : undefined,
      },
    }
  }

  return { content: [], meta: {} }
}
