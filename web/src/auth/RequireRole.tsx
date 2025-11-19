import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireRole({
  children,
  role,
}: {
  children: JSX.Element;
  role: string;
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;

  return children;
}
