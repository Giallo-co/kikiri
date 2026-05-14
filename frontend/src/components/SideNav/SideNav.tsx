import { useState } from 'react';
import './SideNav.css';

const NAV_ITEMS = ['Home', 'Explore', 'Search', 'Profile', 'Post'] as const;
export type NavItem = typeof NAV_ITEMS[number];

interface SideNavProps {
  activeTab: NavItem;
  onSelect?: (item: NavItem) => void;
}

export default function SideNav({ activeTab, onSelect }: SideNavProps) {
  const handleClick = (item: NavItem) => {
    console.log('SideNav clicking item:', item);
    onSelect?.(item);
  };

  return (
    <div className="side-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item}
          className={`side-nav-item ${activeTab === item ? 'selected' : ''}`}
          onClick={() => handleClick(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
