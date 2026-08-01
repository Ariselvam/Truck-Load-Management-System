import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoadingSpinner from './components/LoadingSpinner';

const HomeRedirect = () => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <LoadingSpinner text="Checking credentials..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === 'driver') return <Navigate to="/driver-dashboard" replace />;
  if (role === 'admin') return <Navigate to="/admin-dashboard" replace />;
  return <Navigate to="/user-dashboard" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-main-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected User/Shipper Dashboard */}
              <Route
                path="/user-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['shipper', 'carrier', 'admin']}>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Driver Dashboard */}
              <Route
                path="/driver-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['driver', 'admin']}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Dashboard */}
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
