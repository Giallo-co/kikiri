import React from 'react';
import './Navigation.css';

interface NavigationProps {
  onHomeClick: () => void;
  onSearchClick: () => void;
  activeSection?: string;
}

const Navigation: React.FC<NavigationProps> = ({ onHomeClick, onSearchClick, activeSection = 'Inicio' }) => {
  const menuItems = [
    { name: 'Inicio', icon: '◈', action: onHomeClick },
    { name: 'Explorar', icon: '◎', action: () => {} }, // Por ahora vacíos
    { name: 'Buscar', icon: '◇', action: onSearchClick },
    { name: 'Biblioteca', icon: '▢', action: () => {} },
    { name: 'Perfil', icon: '○', action: () => {} },
  ];

  return (
    <nav className="orbital-menu">
      <div className="menu-container">
        {menuItems.map((item) => (
          <div 
            key={item.name} 
            className={`menu-item ${activeSection === item.name ? 'active' : ''}`}
            onClick={item.action}
            style={{ cursor: 'pointer' }}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-text">{item.name}</span>
            {activeSection === item.name && <div className="active-dot" />}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;