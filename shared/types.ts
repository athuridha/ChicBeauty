export type BookingStatus =
  | 'pending_deposit'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'cancelled_penalty_applied'

export type UserRole = 'admin' | 'artist' | 'client'

export interface Client {
  id: number
  email: string
  phone: string
  full_name: string
  created_at: string
  updated_at: string
}

export interface Artist {
  id: number
  name: string
  email: string
  phone: string
  start_time: string // HH:mm
  end_time: string // HH:mm
  allows_studio?: boolean
  allows_home_service?: boolean
  home_service_start_time?: string // HH:mm
  home_service_end_time?: string // HH:mm
  is_active: boolean
  created_at: string
}

export interface BusinessRules {
  id: number
  deposit_percentage: number
  cancel_threshold_hours: number
  penalty_percentage: number
  buffer_minutes: number
  allow_studio?: boolean
  allow_home_service?: boolean
  updated_at: string
}

export interface Booking {
  id: number
  client_id: number
  artist_id: number
  scheduled_at: string
  service_package: string
  location_type: 'studio' | 'home_service'
  address: string | null
  status: BookingStatus
  deposit_paid: number | null
  penalty_applied: number | null
  created_at: string
  updated_at: string
  client?: Client
  artist?: Artist
  photos?: BeforeAfterPhoto[]
}

export interface BeforeAfterPhoto {
  id: number
  booking_id: number
  file_path: string
  caption: string | null
  uploaded_at: string
  uploaded_by_artist_id: number
}

export interface ServicePackage {
  id: string
  name: string
  duration_minutes: number
  price: number
  description: string
  is_active: boolean
}


