import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/dashboard/Dashboard';
import NotebooksList from './pages/notebooks/NotebooksList';
import NotebookDetail from './pages/notebooks/NotebookDetail';
import Settings from './pages/settings/Settings';
import Todos from './pages/todos/Todos';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notebooks" element={<NotebooksList />} />
          <Route path="/notebooks/:id" element={<NotebookDetail />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/notebooks" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
