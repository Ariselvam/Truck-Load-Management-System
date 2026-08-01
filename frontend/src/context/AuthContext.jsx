import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on initial load
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    const storedDriver = localStorage.getItem('driver');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
      if (storedDriver) {
        try {
          setDriver(JSON.parse(storedDriver));
        } catch (e) {
          setDriver(null);
        }
      }
    }
    setLoading(false);
  }, []);

  // Standard User Login (Shipper, Carrier, Admin)
  const login = async (username, password) => {
    const response = await api.post('auth/login/', { username, password });
    const { access, refresh, user: userData } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('driver');

    setToken(access);
    setUser(userData);
    setDriver(null);
    return userData;
  };

  // Driver Login
  const driverLogin = async (username, password) => {
    const response = await api.post('auth/driver/login/', { username, password });
    const { access, refresh, user: userData, driver: driverData } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('driver', JSON.stringify(driverData));

    setToken(access);
    setUser(userData);
    setDriver(driverData);
    return { user: userData, driver: driverData };
  };

  // Standard User Register
  const register = async (formData) => {
    const response = await api.post('auth/register/', formData);
    return response.data;
  };

  // Driver Register
  const driverRegister = async (formData) => {
    const response = await api.post('auth/driver/register/', formData);
    return response.data;
  };

  // Logout
  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('auth/logout/', { refresh: refreshToken });
      } catch (e) {
        console.error('Logout error blacklisting token:', e);
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('driver');

    setToken(null);
    setUser(null);
    setDriver(null);
  };

  // Change Password
  const changePassword = async (old_password, new_password) => {
    const response = await api.post('auth/change-password/', { old_password, new_password });
    return response.data;
  };

  const value = {
    user,
    driver,
    token,
    role: user?.role || null,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    driverLogin,
    register,
    driverRegister,
    logout,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
