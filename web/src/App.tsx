import { Link, Outlet } from "react-router-dom";
import MedicoreLogo from './assets/medicore-logo.png'; // <--- Your logo import

const navItems = [
  { name: 'Dashboard', path: '/', icon: '🏠' },
  { name: 'Admin', path: '/admin', icon: '🧾' },
  { name: 'Doctor', path: '/doctor', icon: '🩺' },
  { name: 'Lab', path: '/lab', icon: '🧪' },
  { name: 'Pharmacy', path: '/pharmacy', icon: '💊' },
];

export default function App() {
  return (
    <div className="flex min-h-screen">
      {/* Professional Sidebar - Changed background to match logo, adjusted padding */}
      <aside className="w-64 bg-[#041C34] p-4 shadow-xl flex flex-col sticky top-0 h-screen z-10 border-r border-gray-700">
        {/* Adjusted vertical padding, centered logo, increased height */}
        <div className="mb-1 pt-6 pb-4 text-center"> {/* Added text-center for centering img */}
          <img 
            src={MedicoreLogo} 
            alt="Medicore Management Logo" 
            className="h-40 object-contain mx-auto" // <--- Changed to h-32 and added mx-auto
          /> 
        </div>
        <nav className="space-y-2 flex-grow"> {/* Added flex-grow to push content down if needed */}
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center space-x-3 p-3 rounded-lg text-gray-300 hover:bg-blue-600 hover:text-white transition duration-200"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name} Portal</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet /> 
      </main>
    </div>
  );
}