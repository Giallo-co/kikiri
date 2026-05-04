import React from 'react';

interface ProfileViewProps {
  onClose: () => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
    stats: {
      likedCount: number;
      collectionsCount: number;
    }
  };
}

export default function ProfileView({ onClose, user }: ProfileViewProps) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(10, 10, 10, 0.9)', backdropFilter: 'blur(15px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        width: '400px', padding: '40px', borderRadius: '30px',
        backgroundColor: 'rgba(20, 20, 20, 0.5)', border: '1px solid rgba(0, 242, 255, 0.3)',
        boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)', textAlign: 'center', position: 'relative'
      }}>
        {/* Botón Cerrar */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none',
          color: '#666', cursor: 'pointer', fontSize: '20px'
        }}>✕</button>

        {/* Avatar con Resplandor */}
        <div style={{
          width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 20px',
          border: '2px solid #00f2ff', boxShadow: '0 0 15px rgba(0, 242, 255, 0.4)',
          overflow: 'hidden', backgroundColor: '#333'
        }}>
          {user.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 
          <div style={{ fontSize: '50px', marginTop: '20px' }}>👤</div>}
        </div>

        <h2 style={{ color: 'white', margin: '10px 0 5px', fontSize: '24px', letterSpacing: '1px' }}>{user.name}</h2>
        <p style={{ color: '#00f2ff', fontSize: '14px', marginBottom: '30px', opacity: 0.8 }}>{user.email}</p>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>{user.stats.likedCount}</div>
            <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase' }}>Me gusta</div>
          </div>
          <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>{user.stats.collectionsCount}</div>
            <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase' }}>Colecciones</div>
          </div>
        </div>

        <button style={{
          width: '100%', padding: '12px', borderRadius: '12px',
          backgroundColor: 'transparent', border: '1px solid #ff4b4b', color: '#ff4b4b',
          cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
        }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 75, 75, 0.1)'}
           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}