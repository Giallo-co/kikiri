import { useState } from 'react';
import './SideNav.css';

const NAV_ITEMS = ['Home', 'Explore', 'Search', 'Profile', 'Post'] as const;
export type NavItem = typeof NAV_ITEMS[number];

interface SideNavProps {
  onSelect?: (item: NavItem) => void;
}

export default function SideNav({ onSelect }: SideNavProps) {
  const [selected, setSelected] = useState<NavItem>('Home');

  const handleClick = (item: NavItem) => {
    setSelected(item);
    onSelect?.(item);
  };

  return (
    <div className="side-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item}
          className={`side-nav-item ${selected === item ? 'selected' : ''}`}
          onClick={() => handleClick(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
