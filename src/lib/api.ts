import type {
  Artist,
  Booking,
  BookingStatus,
  BeforeAfterPhoto,
  BusinessRules,
  Client,
  ServicePackage,
} from '../../shared/types'

const API_BASE = '/api'

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'same-origin',
    ...init,
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${msg}`)
  }
  return res.json() as Promise<T>
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export interface Slot {
  start: string
  end: string
  available: boolean
}

export interface SlotsResponse {
  artist: Artist
  package: { id: string; name: string; duration_minutes: number; price: number }
  slots: Slot[]
}

export interface ClientWithBookings extends Client {
  bookings: (Booking & { artist?: Artist })[]
}

export interface ClientWithCount extends Client {
  _count: { bookings: number }
}

export const api = {
  artists: {
    list: () => request<Artist[]>('/artists'),
  },
  bookings: {
    create: (data: {
      client: { full_name: string; email: string; phone: string }
      artist_id: number
      scheduled_at: string
      service_package: string
      location_type: 'studio' | 'home_service'
      address?: string
    }) => request<Booking>('/booking/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    get: (id: number) => request<Booking>(`/booking/${id}`),
    lookup: (email: string) =>
      request<ClientWithBookings>(`/booking/lookup?email=${encodeURIComponent(email)}`),
    slots: (artist_id: number, date: string, pkg: string) =>
      request<SlotsResponse>(
        `/booking/slots?artist_id=${artist_id}&date=${date}&package=${pkg}`,
      ),
    uploadDeposit: (id: number, file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return fetch(`${API_BASE}/booking/${id}/deposit-upload`, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json() as Promise<Booking>
      })
    },
    cancel: (id: number) =>
      request<{ ok: boolean; penalty_applied: number | null }>(
        `/booking/${id}/cancel`,
        { method: 'POST' },
      ),
    checkIn: (id: number) =>
      request<Booking>(`/booking/${id}/check-in`, { method: 'POST' }),
    complete: (id: number) =>
      request<Booking>(`/booking/${id}/complete`, { method: 'POST' }),
    reschedule: (id: number, scheduled_at: string) =>
      request<Booking>(`/booking/${id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ scheduled_at }),
      }),
    listByArtistRange: (artist_id: number, from: Date, to: Date) =>
      request<Booking[]>(
        `/booking?artist_id=${artist_id}&from=${toDateString(from)}&to=${toDateString(to)}`,
      ),
    listForAdmin: (params: { status?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams()
      if (params.status) qs.set('status', params.status)
      if (params.from) qs.set('from', params.from)
      if (params.to) qs.set('to', params.to)
      return request<Booking[]>(`/admin/bookings?${qs.toString()}`)
    },
  },
  photos: {
    list: (booking_id: number) =>
      request<BeforeAfterPhoto[]>(`/booking/${booking_id}/photos`),
    upload: (booking_id: number, file: File, caption?: string) => {
      const fd = new FormData()
      fd.append('file', file)
      if (caption) fd.append('caption', caption)
      return fetch(`${API_BASE}/booking/${booking_id}/photos`, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json() as Promise<BeforeAfterPhoto>
      })
    },
    remove: (id: number) =>
      request<{ ok: boolean }>(`/photo/${id}`, { method: 'DELETE' }),
  },
  clients: {
    get: (id: number) => request<Client>(`/clients/${id}`),
    history: (id: number) => request<Booking[]>(`/clients/${id}/bookings`),
    search: (q: string) =>
      request<ClientWithCount[]>(`/admin/clients/search?q=${encodeURIComponent(q)}`),
    listForAdmin: () => request<ClientWithCount[]>('/admin/clients'),
  },
  admin: {
    rules: {
      get: () => request<BusinessRules>('/admin/rules'),
      update: (data: Partial<BusinessRules>) =>
        request<BusinessRules>('/admin/rules', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },
    stats: () =>
      request<{
        bookings_today: number
        pending_deposits: number
        cancel_rate: number
        top_artist: { name: string; bookings: number } | null
      }>('/admin/stats'),
    artists: {
      list: () => request<Artist[]>('/admin/artists'),
      create: (data: {
        name: string
        email: string
        phone: string
        password?: string
        start_time: string
        end_time: string
        is_active?: boolean
      }) =>
        request<Artist>('/admin/artists', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: number, data: Partial<{
        name: string
        email: string
        phone: string
        password?: string
        start_time: string
        end_time: string
        is_active: boolean
      }>) =>
        request<Artist>(`/admin/artists/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id: number) =>
        request<{ ok: boolean }>(`/admin/artists/${id}`, {
          method: 'DELETE',
        }),
    },
    exportCsvUrl: () => `${API_BASE}/admin/bookings/export.csv`,
    confirmDeposit: (id: number) =>
      request<Booking>(`/admin/bookings/${id}/confirm-deposit`, {
        method: 'POST',
      }),
    cancelBooking: (id: number) =>
      request<Booking>(`/admin/bookings/${id}/cancel`, { method: 'POST' }),
  },
  auth: {
    login: (email: string, password: string) =>
      request<{ user: { id: number; role: string; name: string } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ id: number; role: string; name: string }>('/auth/me'),
  },
  services: {
    list: () => request<ServicePackage[]>('/services'),
    listForAdmin: () => request<ServicePackage[]>('/services/admin'),
    create: (data: { name: string; duration_minutes: number; price: number; description: string; is_active?: boolean }) =>
      request<ServicePackage>('/services/admin', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; duration_minutes: number; price: number; description: string; is_active: boolean }>) =>
      request<ServicePackage>(`/services/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ ok: boolean }>(`/services/admin/${id}`, { method: 'DELETE' }),
  },
}

export type BookingStatusFilter = BookingStatus
