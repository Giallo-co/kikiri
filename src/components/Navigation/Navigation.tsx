import React from 'react';
import './Navigation.css';

// Usaremos strings para los iconos si no tienes una librería de iconos instalada, 
// o puedes usar Lucide-React que es muy limpia.
const Navigation = () => {
  const menuItems = [
    { name: 'Inicio', icon: '◈' },
    { name: 'Explorar', icon: '◎' },
    { name: 'Buscar', icon: '◇' },
    { name: 'Biblioteca', icon: '▢' },
    { name: 'Perfil', icon: '○' },
  ];

  return (
    <nav className="orbital-menu">
      <div className="menu-container">
        {menuItems.map((item) => (
          <div key={item.name} className="menu-item">
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-text">{item.name}</span>
            <div className="active-dot" />
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;