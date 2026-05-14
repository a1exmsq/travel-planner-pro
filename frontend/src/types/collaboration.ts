export interface CollaboratorDTO {
  userId: number
  username: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER' | string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | string
  invitedAt?: string | null
  acceptedAt?: string | null
  owner?: boolean
}

export interface InvitationDTO {
  id: number
  routeId: number
  routeName: string
  invitedByUsername: string
  invitedUserUsername: string
  inviteCode: string
  role: 'EDITOR' | 'VIEWER' | string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | string
  expiresAt?: string | null
}

export interface UserSearchResultDTO {
  id: number
  username: string
}
