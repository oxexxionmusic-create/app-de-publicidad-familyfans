import { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { authAPI } from "@/lib/api";

// ==================== IMPORTACIONES ====================

// Páginas Públicas
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Rankings from "@/pages/Rankings";
import Explore from "@/pages/Explore";
import CreatorProfile from "@/pages/CreatorProfile";

// Dashboards
import AdminDashboard from "@/pages/AdminDashboard";
import AdvertiserDashboard from "@/pages/AdvertiserDashboard";
import CreatorDashboard from "@/pages/CreatorDashboard";
import FanDashboard from "@/pages/FanDashboard";

// 🔹 IMPORTANTE: Recuperación de componentes de Chat
import CreatorPrivateChat from "@/pages/CreatorPrivateChat";
import FanPrivateChat from "@/pages/FanPrivateChat";

// ==================== CONTEXTO DE AUTENTICACIÓN ====================

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("ffm_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("ffm_token");
      const storedUser = localStorage.getItem("ffm_user");

      if (storedToken && storedUser) {
        try {
          const res = await authAPI.me();
          setUser(res.data);
        } catch (error) {
          console.error("Error fetching user:", error);
          localStorage.removeItem("ffm_token");
          localStorage.removeItem("ffm_user");
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==================== RUTAS PROTEGIDAS ====================

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "admin": return <Navigate to="/admin" replace />;
    case "advertiser": return <Navigate to="/advertiser" replace />;
    case "creator": return <Navigate to="/creator" replace />;
    case "fan": return <Navigate to="/fan" replace />;
    default: return <Navigate to="/" replace />;
  }
}

// ==================== COMPONENTE PRINCIPAL ====================

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ==================== RUTAS PÚBLICAS ==================== */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/explorar" element={<Explore />} />
          <Route path="/creador/:id" element={<CreatorProfile />} />

          {/* ==================== REDIRECCIÓN ==================== */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* ==================== ADMIN ==================== */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ==================== ANUNCIANTE ==================== */}
          <Route
            path="/advertiser/*"
            element={
              <ProtectedRoute roles={["advertiser", "admin"]}>
                <AdvertiserDashboard />
              </ProtectedRoute>
            }
          />

          {/* ==================== CREADOR ==================== */}
          <Route
            path="/creator/*"
            element={
              <ProtectedRoute roles={["creator", "admin"]}>
                <CreatorDashboard />
              </ProtectedRoute>
            }
          />

          {/* 🔹 NUEVO: RUTAS DE CHAT PRIVADO (RECUPERADAS) ==================== */}
          <Route
            path="/creator/chat/*"
            element={
              <ProtectedRoute roles={["creator", "admin"]}>
                <CreatorPrivateChat />
              </ProtectedRoute>
            }
          />

          {/* ==================== FAN ==================== */}
          <Route
            path="/fan/*"
            element={
              <ProtectedRoute roles={["fan", "admin"]}>
                <FanDashboard />
              </ProtectedRoute>
            }
          />

          {/* 🔹 NUEVO: RUTAS DE CHAT PRIVADO (RECUPERADAS) ==================== */}
          <Route
            path="/fan/chat/*"
            element={
              <ProtectedRoute roles={["fan", "admin"]}>
                <FanPrivateChat />
              </ProtectedRoute>
            }
          />

          {/* ==================== RUTA POR DEFECTO ==================== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
