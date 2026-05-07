import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, User, Search, LogOut, PlusSquare } from 'lucide-react';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-indigo-600 tracking-tight">
            Kikiri
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-indigo-600 transition-colors">
              <Home size={24} />
            </Link>
            <Link to="/search" className="text-gray-700 hover:text-indigo-600 transition-colors">
              <Search size={24} />
            </Link>
            <Link to="/create" className="text-gray-700 hover:text-indigo-600 transition-colors">
              <PlusSquare size={24} />
            </Link>
            <Link to={`/profile/${user?.id}`} className="text-gray-700 hover:text-indigo-600 transition-colors">
              <User size={24} />
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-600 transition-colors"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto w-full flex-grow py-8 px-4">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
