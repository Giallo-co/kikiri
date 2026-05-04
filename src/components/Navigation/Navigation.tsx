import React from 'react';
import './Navigation.css';

interface NavigationProps {
  onHomeClick: () => void;
  onSearchClick: () => void;
  onLibraryClick: () => void;
  currentView: 'home' | 'library'; // Sincronizado con el estado de App.tsx
}

const Navigation: React.FC<NavigationProps> = ({ 
  onHomeClick, 
  onSearchClick, 
  onLibraryClick, 
  currentView 
}) => {
  
  // Mapeamos el estado interno de App a los nombres del menú
  const activeName = currentView === 'home' ? 'Inicio' : 'Biblioteca';

  const menuItems = [
    { name: 'Inicio', icon: '◈', action: onHomeClick },
    { name: 'Explorar', icon: '◎', action: () => {} }, 
    { name: 'Buscar', icon: '◇', action: onSearchClick },
    { name: 'Biblioteca', icon: '▢', action: onLibraryClick }, // Ahora ejecuta la acción
    { name: 'Perfil', icon: '○', action: () => {} },
  ];

  return (
    <nav className="orbital-menu">
      <div className="menu-container">
        {menuItems.map((item) => (
          <div 
            key={item.name} 
            className={`menu-item ${activeName === item.name ? 'active' : ''}`}
            onClick={item.action}
            style={{ cursor: 'pointer' }}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-text">{item.name}</span>
            
            {/* El puntito celeste que pediste */}
            {activeName === item.name && <div className="active-dot" />}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;