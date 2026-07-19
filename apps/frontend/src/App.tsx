import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { api } from './api/client';
import { GuestRoute } from './components/GuestRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { Profile } from './pages/dashboard/Profile';
import { SitesPage } from './pages/dashboard/SitesPage';
import { Domains } from './pages/dashboard/Domains';
import { AddDomain } from './pages/dashboard/AddDomain';
import { DomainDetails } from './pages/dashboard/DomainDetails';
import { FileManager } from './pages/dashboard/FileManager';
import { Databases } from './pages/dashboard/Databases';
import { ScriptInstaller } from './pages/dashboard/ScriptInstaller';
import { SSLCertificates } from './pages/dashboard/SSLCertificates';
import { Backups } from './pages/dashboard/Backups';
import { ResourceUsage } from './pages/dashboard/ResourceUsage';
import { Logs } from './pages/dashboard/Logs';
import { SettingsPage } from './pages/dashboard/Settings';

export default function App() {
  const { setAuth, clearAuth, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Try calling the refresh endpoint to obtain a new access token silently on page load
        const response = await api.post('/auth/refresh', {});
        const { user, accessToken } = response.data.data;

        // Fetch user profile and preferences metadata
        const meResponse = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const { profile } = meResponse.data.data;

        setAuth(user, accessToken, profile);
      } catch (err) {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [setAuth, clearAuth, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">
            Loading WPHub Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Guest only routes (login, signup, etc.) */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
        </Route>

        {/* Protected Dashboard routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/sites/create" element={<SitesPage />} />
            <Route path="/domains" element={<Domains />} />
            <Route path="/domains/add" element={<AddDomain />} />
            <Route path="/domains/:id" element={<DomainDetails />} />
            <Route path="/file-manager" element={<FileManager />} />
            <Route path="/databases" element={<Databases />} />
            <Route path="/script-installer" element={<ScriptInstaller />} />
            <Route path="/ssl" element={<SSLCertificates />} />
            <Route path="/backups" element={<Backups />} />
            <Route path="/resource-usage" element={<ResourceUsage />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-slate-900 text-slate-100 border border-slate-800 text-sm rounded-lg',
          duration: 4000,
        }}
      />
    </BrowserRouter>
  );
}
