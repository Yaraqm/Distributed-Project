import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, []);

  return <div className="p-6 text-xl">Logging out...</div>;
}
