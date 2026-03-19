import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';

// Pages
import HomePage from './pages/HomePage';
import HotelsPage from './pages/HotelsPage';
import HotelDetailPage from './pages/HotelDetailPage';
import BookingPage from './pages/BookingPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import MyBookingsPage from './pages/MyBookingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';

// Layout
import Navbar from './components/common/Navbar';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/hotels/:id" element={<HotelDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected — guest */}
        <Route
          path="/book/:roomTypeId"
          element={<PrivateRoute roles={['guest']}><BookingPage /></PrivateRoute>}
        />
        <Route
          path="/booking/confirmation/:bookingId"
          element={<PrivateRoute><BookingConfirmationPage /></PrivateRoute>}
        />
        <Route
          path="/my-bookings"
          element={<PrivateRoute><MyBookingsPage /></PrivateRoute>}
        />

        {/* Protected — admin */}
        <Route
          path="/admin/*"
          element={<PrivateRoute roles={['hotel_admin', 'superadmin']}><AdminDashboardPage /></PrivateRoute>}
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <AppRoutes />
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
