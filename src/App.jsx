import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spinner } from './components/Spinner';
import DeviceGate from './components/DeviceGate';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import DiscoverV2 from './pages/DiscoverV2';      // ← V2 chat interface
import DiscoverResults from './pages/DiscoverResults';
import StudioProfile from './pages/StudioProfile';
import StudioDirectory from './pages/StudioDirectory';
import PublicProposalView from './pages/public/PublicProposalView';

// Reserved paths that must NOT be caught by the /:studioSlug wildcard.
// Any new top-level route added to AppRoutes must also be listed here.
export const RESERVED_PATHS = new Set([
  'login', 'discover', 'directory', 'studio',
  'buyer', 'dashboard', 'admin', 'p',
]);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelectorAll('[data-scroll-reset]').forEach(el => {
      el.scrollTop = 0;
    });
  }, [pathname]);
  return null;
}

function roleHome(role) {
  if (role === 'admin')    return '/admin';
  if (role === 'seller')   return '/dashboard';
  if (role === 'customer') return '/buyer';
  return '/';
}

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full />;
  return (
    <Routes>
      <Route path="/"                 element={<Landing />} />
      <Route path="/login"            element={user ? <Navigate to={roleHome(user.role)} /> : <Login />} />
      <Route path="/discover"         element={<DiscoverV2 />} />        {/* V2 chat */}
      <Route path="/discover/results" element={<DiscoverResults />} />   {/* V1 results — unchanged */}
      <Route path="/directory"        element={<StudioDirectory />} />
      <Route path="/p/:token"         element={<PublicProposalView />} />   {/* no-login proposal link */}

      {/* Legacy route — numeric ID. Keep so existing recommendation/directory links don't break. */}
      <Route path="/studio/:id"       element={<StudioProfile />} />

      {/* v3 slug route — e.g. /hindostan-archive */}
      <Route path="/:studioSlug"      element={<StudioProfile />} />

      <Route path="/buyer/*"          element={<Guard role="customer"><BuyerDashboard /></Guard>} />
      <Route path="/dashboard/*"      element={<Guard role="seller"><SellerDashboard /></Guard>} />
      <Route path="/admin/*"          element={<Guard role="admin"><AdminDashboard /></Guard>} />
      <Route path="*"                 element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    // Mobile/device gate wraps EVERYTHING — outside BrowserRouter and
    // AuthProvider, so a blocked phone never even reaches routing or an
    // auth check. Applies site-wide, every route, with no per-page work
    // needed: this gate is the entire mobile story by design (see
    // DeviceGate.jsx) — nothing else in the app is mobile-optimized.
    <DeviceGate>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </DeviceGate>
  );
}