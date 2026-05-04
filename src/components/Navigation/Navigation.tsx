import React from 'react';
import './Navigation.css';

interface NavigationProps {
  onHomeClick: () => void;
  onSearchClick: () => void;
  onLibraryClick: () => void;
  onProfileClick: () => void; // Nueva prop para abrir el perfil
  currentView: 'home' | 'library' | 'profile'; // Añadimos profile a los posibles estados
}

const Navigation: React.FC<NavigationProps> = ({ 
  onHomeClick, 
  onSearchClick, 
  onLibraryClick, 
  onProfileClick,
  currentView 
}) => {
  
  // Mapeamos el estado actual para resaltar el botón correcto
  const getActiveName = () => {
    if (currentView === 'home') return 'Inicio';
    if (currentView === 'library') return 'Biblioteca';
    if (currentView === 'profile') return 'Perfil';
    return '';
  };

  const activeName = getActiveName();

  const menuItems = [
    { name: 'Inicio', icon: '◈', action: onHomeClick },
    { name: 'Explorar', icon: '◎', action: () => {} }, 
    { name: 'Buscar', icon: '◇', action: onSearchClick },
    { name: 'Biblioteca', icon: '▢', action: onLibraryClick },
    { name: 'Perfil', icon: '○', action: onProfileClick }, // Vinculado a onProfileClick
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
            
            {/* El puntito celeste indicador de sección activa */}
            {activeName === item.name && <div className="active-dot" />}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;