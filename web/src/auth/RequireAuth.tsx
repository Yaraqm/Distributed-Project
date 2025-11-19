import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading)
    return <div className="text-center p-10 text-xl">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
