import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import MedicoreLogo from "./assets/medicore-logo.png";
import { useAuth } from "./auth/AuthProvider";

// Define allowed roles for each nav item
const navItems = [
  { name: "Dashboard", path: "/", icon: "🏠", roles: ["admin", "doctor", "lab", "pharmacy"] },
  { name: "Admin", path: "/admin", icon: "🧾", roles: ["admin"] },
  { name: "Doctor", path: "/doctor", icon: "🩺", roles: ["doctor"] },
  { name: "Lab", path: "/lab", icon: "🧪", roles: ["lab"] },
  { name: "Pharmacy", path: "/pharmacy", icon: "💊", roles: ["pharmacy"] },
];

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navError, setNavError] = useState("");

  function handleNavClick(item, e) {
    e.preventDefault();

    const allowed = item.roles.includes(user?.role);

    if (!allowed) {
      setNavError(`You do not have access to the ${item.name} portal.`);
      return;
    }

    setNavError("");
    navigate(item.path);
  }

  return (
    <div className="flex min-h-screen relative">
      {/* Sidebar */}
      <aside className="w-64 bg-[#041C34] p-4 shadow-xl flex flex-col sticky top-0 h-screen z-10 border-r border-gray-700">
        {/* Logo */}
        <div className="mb-1 pt-6 pb-4 text-center">
          <img
            src={MedicoreLogo}
            alt="Medicore Management Logo"
            className="h-40 object-contain mx-auto"
          />
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-grow">
          {navItems.map((item) => {
            const allowed = item.roles.includes(user?.role);
            const isActive = location.pathname === item.path;

            return (
              <a
                key={item.name}
                href={item.path}
                onClick={(e) => handleNavClick(item, e)}
                className={[
                  "flex items-center space-x-3 p-3 rounded-lg transition duration-200",
                  allowed
                    ? isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-blue-600 hover:text-white"
                    : "text-gray-500 opacity-50 cursor-not-allowed border border-dashed border-gray-600",
                ].join(" ")}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name} Portal</span>
              </a>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto pt-4">
          <Link
            to="/logout"

            className="w-full block text-center p-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 transition duration-200"
          >
            <span className="font-medium">Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative">
        {/* ===================== OVERLAY POPUP (MATCHES DASHBOARD) ===================== */}
        {navError && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="bg-red-50 border border-red-500 text-red-800 rounded-lg px-6 py-5 shadow-2xl w-[90%] max-w-md">
              <h2 className="text-lg font-semibold mb-2">Restricted Access</h2>
              <p className="text-sm mb-4">{navError}</p>

              <div className="flex justify-end">
                <button
                  onClick={() => setNavError("")}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* =========================================================================== */}

        <Outlet />
      </main>
    </div>
  );
}
