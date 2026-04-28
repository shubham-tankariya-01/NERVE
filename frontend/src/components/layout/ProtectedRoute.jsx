import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          backgroundColor: "var(--bg-canvas)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(0, 229, 160, 0.1)",
            borderTop: "3px solid var(--brand)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role) && user?.role !== 'platform_admin') {
    // Auto-redirect to their primary dashboard instead of 403
    if (user?.role === 'node_operator') return <Navigate to="/operator" replace />;
    if (user?.role === 'customer') return <Navigate to="/customer" replace />;
    if (user?.role === 'platform_admin' && location.pathname.startsWith('/operator')) return <Navigate to="/admin" replace />;
    if (user?.role === 'logistics_manager' && location.pathname.startsWith('/operator')) return <Navigate to="/" replace />;
    
    // Fallback 403 for other cases
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          backgroundColor: "var(--bg-canvas)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          gap: "20px",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: "800",
            color: "var(--danger)",
          }}
        >
          403
        </div>
        <div style={{ fontSize: "18px", fontWeight: "600" }}>ACCESS DENIED</div>
        <div
          style={{
            color: "var(--text-secondary)",
            maxWidth: "400px",
            textAlign: "center",
          }}
        >
          Your account ({user?.role}) does not have permission to access this
          area.
        </div>
        <button 
          onClick={() => window.location.href = user?.role === 'node_operator' ? '/operator' : '/'}
          style={{
            padding: "12px 24px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          GO TO MY DASHBOARD
        </button>
      </div>
    );
  }

  return children;
}
