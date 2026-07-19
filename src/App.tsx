import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '@/components/app-shell'
import { Toaster } from '@/components/ui/sonner'
import HomePage from '@/pages/home'
import BookingPage from '@/pages/booking'
import BookingManagePage from '@/pages/booking-manage'
import BookingDetailPage from '@/pages/booking-detail'
import ArtistDashboardPage from '@/pages/artist-dashboard'
import AdminDashboardPage from '@/pages/admin-dashboard'
import AdminRulesPage from '@/pages/admin-rules'
import AdminArtistsPage from '@/pages/admin-artists'
import AdminClientsPage from '@/pages/admin-clients'
import AdminServicesPage from '@/pages/admin-services'
import ClientProfilePage from '@/pages/client-profile'
import LoginPage from '@/pages/login'
import ServicesPage from '@/pages/services'

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/manage" element={<BookingManagePage />} />
          <Route path="/booking/:id" element={<BookingDetailPage />} />
          <Route path="/dashboard/artist" element={<ArtistDashboardPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/rules" element={<AdminRulesPage />} />
          <Route path="/admin/artists" element={<AdminArtistsPage />} />
          <Route path="/admin/clients" element={<AdminClientsPage />} />
          <Route path="/admin/services" element={<AdminServicesPage />} />
          <Route path="/clients/:id" element={<ClientProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}
