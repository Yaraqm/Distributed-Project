import { Link } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/', icon: '🏠' },
  { name: 'Admin', path: '/admin', icon: '🧾' },
  { name: 'Doctor', path: '/doctor', icon: '🩺' },
  { name: 'Lab', path: '/lab', icon: '🧪' },
  { name: 'Pharmacy', path: '/pharmacy', icon: '💊' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 shadow-xl flex flex-col">
        <div className="text-2xl font-extrabold text-blue-400 mb-8 tracking-wider">
          MicroHealth 
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center space-x-3 p-3 rounded-lg text-gray-300 hover:bg-blue-600 hover:text-white transition duration-200"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name} Portal</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}