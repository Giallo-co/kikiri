import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (username: string) => void;
  isTransitioning: boolean;
}

export default function Login({ onLogin, isTransitioning }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            username,
            password,
            role: 0
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Registration failed');
        }

        const data = await response.json();
        // After successful registration, log them in
        onLogin(data.user.username);
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Login failed');
        }

        const data = await response.json();
        onLogin(data.user.username);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <div className={`login-container ${isTransitioning ? 'fade-out' : ''}`}>
      {/* 2nd layer: Glass Effect */}
      <div className="glass-effect-layer" />

      {/* 3rd layer: Login Content */}
      <div className="login-content-layer">
        <div className="login-card">
          <div className="login-card-inner">
            <div className="logo-icon">▢</div>
            
            <div className="login-header">
              <h2>[ {isRegister ? 'Create an account' : 'Access your account'} ]</h2>
              <p>{isRegister ? 'Join the network to sync your data.' : 'Log in to sync your cloud data.'}</p>
            </div>

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Enter your email"
                    required 
                  />
                </div>
              )}
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Enter your username"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Enter your password"
                  required 
                />
              </div>
              
              {error && <p className="error-msg">{error}</p>}
              
              <button type="submit" className="login-btn">
                {isRegister ? 'Register' : 'Log in'}
              </button>
            </form>

            {!isRegister && <span className="forgot-pw">Forgot password</span>}

            <p className="toggle-auth">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? 'Log in' : 'Register'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
