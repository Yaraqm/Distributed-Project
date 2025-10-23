import { Link, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div>
      <nav className="p-4 bg-gray-200 flex gap-4">
        <Link to="/doctor">Doctor</Link>
        <Link to="/lab">Lab</Link>
        <Link to="/pharmacy">Pharmacy</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <Outlet />
    </div>
  );
}
