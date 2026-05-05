import { useState } from 'react';
import './SideNav.css';

const NAV_ITEMS = ['Home', 'Explore', 'Search', 'Profile', 'Post'];

export default function SideNav() {
  const [selected, setSelected] = useState('Home');

  return (
    <div className="side-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item}
          className={`side-nav-item ${selected === item ? 'selected' : ''}`}
          onClick={() => setSelected(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
