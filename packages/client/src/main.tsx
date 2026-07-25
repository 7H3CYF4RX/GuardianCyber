import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/styles/globals.css';
import LandingPage from '@/pages/LandingPage';
import LevelSelect from '@/pages/LevelSelect';
import GamePage from '@/pages/GamePage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import { useAuthStore } from '@/store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return !token ? <>{children}</> : <Navigate to="/levels" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><LandingPage /></GuestRoute>} />
        <Route path="/levels" element={<ProtectedRoute><LevelSelect /></ProtectedRoute>} />
        <Route path="/level/:id" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
