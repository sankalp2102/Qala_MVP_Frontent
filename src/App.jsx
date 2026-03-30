import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spinner } from './components/Spinner';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Discover from './pages/Discover';
import DiscoverResults from './pages/DiscoverResults';
import StudioProfile from './pages/StudioProfile';
import StudioDirectory from './pages/StudioDirectory';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full />;
  return (
    <Routes>
      <Route path="/"                 element={<Landing />} />
      <Route path="/login"            element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Login />} />
      <Route path="/discover"         element={<Discover />} />
      <Route path="/discover/results" element={<DiscoverResults />} />
      <Route path="/directory"        element={<StudioDirectory />} />
      <Route path="/studio/:id"       element={<StudioProfile />} />
      <Route path="/dashboard/*"      element={<Guard role="seller"><SellerDashboard /></Guard>} />
      <Route path="/admin/*"          element={<Guard role="admin"><AdminDashboard /></Guard>} />
      <Route path="*"                 element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}