import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import type { ReactNode } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import BoardPage from "./pages/BoardPage";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading, demo } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          demo || loading ? (
            loading ? <div className="spinner" /> : <Navigate to="/" replace />
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/register"
        element={
          demo || loading ? (
            loading ? <div className="spinner" /> : <Navigate to="/" replace />
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <RegisterPage />
          )
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/boards/:boardId"
        element={
          <Protected>
            <BoardPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
