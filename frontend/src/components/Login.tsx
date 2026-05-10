import React, { useState } from 'react';
import './Login.css';
import type { AuthUser } from '../hooks/useAuth';

interface LoginProps {
  onLogin: (token: string, user: AuthUser) => void;
  isTransitioning: boolean;
}

export default function Login({ onLogin, isTransitioning }: LoginProps) {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const apiUrl = (path: string) => `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const body = isRegister
      ? { email, username, password, role: 0 }
      : { username, password };

    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({})) as {
        message?: string;
        token?: string;
        user?: AuthUser;
      };

      if (!response.ok) {
        throw new Error(data.message || (isRegister ? 'Registration failed' : 'Login failed'));
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      onLogin(data.token, data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-container ${isTransitioning ? 'fade-out' : ''}`}>
      <div className="glass-effect-layer" />
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

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Please wait...' : isRegister ? 'Register' : 'Log in'}
              </button>
            </form>

            {!isRegister && <span className="forgot-pw">Forgot password</span>}

            <p className="toggle-auth">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                {isRegister ? 'Log in' : 'Register'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
