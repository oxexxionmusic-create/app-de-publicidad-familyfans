import { createContext, useContext, useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { authAPI } from "@/lib/api";

// ===================== IMPORTS DE PÁGINAS =====================
// Páginas públicas
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Rankings from "@/pages/Rankings";
import Explore from "@/pages/Explore";
import CreatorProfile from "@/pages/CreatorProfile";

// Dashboards por rol
import AdminDashboard from "@/pages/AdminDashboard";
import AdvertiserDashboard from "@/pages/AdvertiserDashboard";
import CreatorDashboard from "@/pages/CreatorDashboard";
import FanDashboard from "@/pages/FanDashboard";

// Nuevas páginas: Chat Privado
import CreatorPrivateChat from "@/pages/CreatorPrivateChat";
import FanPrivateChat from "@/pages/FanPrivateChat";

// ===================== CONTEXTO DE AUTENTICACIÓN =====================
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("ffm_token"));

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.me();
      setUser(res.data);
    } catch {
      localStorage.removeItem("ffm_token");
      localStorage.removeItem("ffm_user");
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = (tokenVal, userData) => {
    localStorage.setItem("ffm_token", tokenVal);
    localStorage.setItem("ffm_user", JSON.stringify(userData));
    setToken(tokenVal);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("ffm_token");
    localStorage.removeItem("ffm_user");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ===================== RUTA PROTEGIDA POR ROL =====================
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ===================== REDIRECCIÓN INTELIGENTE AL DASHBOARD =====================
function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "advertiser":
      return <Navigate to="/advertiser" replace />;
    case "creator":
      return <Navigate to="/creator" replace />;
    case "fan":
      return <Navigate to="/fan" replace />;
    default:
      return <Navigate to="/" replace />;
  }
}

// ===================== COMPONENTE PRINCIPAL =====================
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ===================== RUTAS PÚBLICAS ===================== */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/explorar" element={<Explore />} />
          <Route path="/creador/:id" element={<CreatorProfile />} />

          {/* Redirección inteligente al dashboard según rol */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* ===================== ADMIN ===================== */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ===================== ANUNCIANTE ===================== */}
          <Route
            path="/advertiser/*"
            element={
              <ProtectedRoute roles={["advertiser", "admin"]}>
                <AdvertiserDashboard />
              </ProtectedRoute>
            }
          />

          {/* ===================== CREADOR ===================== */}
          <Route
            path="/creator/*"
            element={
              <ProtectedRoute roles={["creator", "admin"]}>
                <CreatorDashboard />
              </ProtectedRoute>
            }
          />
          {/* Chat Privado para Creadores */}
          <Route
            path="/creator/chat"
            element={
              <ProtectedRoute roles={["creator", "admin"]}>
                <CreatorPrivateChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator/chat/:fanId"
            element={
              <ProtectedRoute roles={["creator", "admin"]}>
                <CreatorPrivateChat />
              </ProtectedRoute>
            }
          />

          {/* ===================== FAN ===================== */}
          <Route
            path="/fan/*"
            element={
              <ProtectedRoute roles={["fan", "admin"]}>
                <FanDashboard />
              </ProtectedRoute>
            }
          />
          {/* Chat Privado para Fans */}
          <Route
            path="/fan/chat"
            element={
              <ProtectedRoute roles={["fan", "admin"]}>
                <FanPrivateChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fan/chat/:creatorId"
            element={
              <ProtectedRoute roles={["fan", "admin"]}>
                <FanPrivateChat />
              </ProtectedRoute>
            }
          />

          {/* ===================== RUTA POR DEFECTO (404) ===================== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Notificaciones globales */}
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
export default App;
