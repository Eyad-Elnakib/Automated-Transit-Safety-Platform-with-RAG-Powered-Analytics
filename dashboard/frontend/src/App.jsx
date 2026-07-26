import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppLayout from './layout/AppLayout.jsx'
import OverviewPage from './features/overview/OverviewPage.jsx'
import DriversPage from './features/drivers/DriversPage.jsx'
import DriverDetailsPage from './features/drivers/DriverDetailsPage.jsx'
import EditDriverPage from './features/drivers/EditDriverPage.jsx'
import RoutesPage from './features/routes/RoutesPage.jsx'
import BusesPage from './features/buses/BusesPage.jsx'
import TripsPage from './features/trips/TripsPage.jsx'
import TripDetailsPage from './features/trips/TripDetailsPage.jsx'
import ChatbotPage from './features/chatbot/ChatbotPage.jsx'
import NotFound from './pages/NotFound.jsx'

const App = () => (
  <>
    <Toaster richColors position="top-right" />
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/drivers/:id/edit" element={<EditDriverPage />} />
          <Route path="/drivers/:id" element={<DriverDetailsPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/buses" element={<BusesPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/:id" element={<TripDetailsPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
)

export default App
