import React, { useState, useEffect } from 'react';
import './Profile.css';
import { RawNode } from '../../types/graph';

const TOKEN_KEY = 'kikiri_token';

interface ProfileProps {
  userNode: RawNode;
  onUpdate: (updatedNode: RawNode) => void;
  onClose: () => void;
}

export default function Profile({ userNode, onUpdate, onClose }: ProfileProps) {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '').trim() ?? '';
  const apiUrl = (path: string) => `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const [authorName, setAuthorName] = useState(userNode.author_name || '');
  const [description, setDescription] = useState(userNode.author_description || '');
  const [nodeColor, setNodeColor] = useState(userNode.node_color || '#636363');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(userNode.author_profile_picture || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!avatarFile) {
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const token = () => localStorage.getItem(TOKEN_KEY);

  const authHeaders = (): HeadersInit => {
    const t = token();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  };

  const presign = async (body: Record<string, unknown>) => {
    const res = await fetch(apiUrl('/user/v1/uploads/presign'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { message?: string }).message || `Presign failed (${res.status})`);
    }
    return data as { url: string; headers: Record<string, string>; key: string; publicUrl?: string };
  };

  const putToS3 = async (upload: { url: string; headers: Record<string, string> }, file: File) => {
    const h = new Headers();
    Object.entries(upload.headers).forEach(([k, v]) => h.set(k, v));
    const res = await fetch(upload.url, { method: 'PUT', headers: h, body: file });
    if (!res.ok) {
      throw new Error(`S3 upload failed: ${res.status}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalAvatarUrl = userNode.author_profile_picture || '';

      if (avatarFile) {
        const avatarType = avatarFile.type || 'image/jpeg';
        const avatarPresign = await presign({
          kind: 'avatar',
          contentType: avatarType,
          contentLength: avatarFile.size,
        });
        await putToS3(avatarPresign, avatarFile);
        finalAvatarUrl = avatarPresign.publicUrl || '';
      }

      const response = await fetch(apiUrl('/user/profile/update'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          node_id: userNode.node_id,
          author_name: authorName,
          author_description: description,
          author_profile_picture: finalAvatarUrl,
          node_color: nodeColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Update failed');
      }

      const data = await response.json();
      onUpdate(data.node);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-glass-overlay" />

      <div className="profile-content-layer">
        <div className="profile-card">
          <div className="profile-card-inner">
            <div className="profile-header">
              <h2 className="profile-header-title">User Profile</h2>
              <p>Customize your identity in the network.</p>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="profile-form-scrollable">
                <div className="form-section">
                  <h3>Identity</h3>
                  <div className="form-group">
                    <label>Profile Picture</label>
                    <div className="profile-avatar-row">
                      <div className="file-upload-container profile-avatar-file-wrap">
                        <input
                          id="profile-avatar-input"
                          type="file"
                          className="file-input"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setAvatarFile(f ?? null);
                          }}
                        />
                        <label htmlFor="profile-avatar-input" className="file-label">
                          {avatarFile ? avatarFile.name : 'Select profile picture…'}
                        </label>
                      </div>
                      {avatarPreviewUrl ? (
                        <div className="profile-avatar-thumb">
                          <img src={avatarPreviewUrl} alt="Avatar preview" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Username</label>
                    <input 
                      type="text" 
                      value={authorName} 
                      onChange={(e) => setAuthorName(e.target.value)} 
                      placeholder="Enter username"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Tell us about yourself"
                      className="profile-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label>Node Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="color"
                        value={nodeColor}
                        onChange={(e) => setNodeColor(e.target.value)}
                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <span style={{ fontSize: '0.9rem', color: '#ccc' }}>{nodeColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {error && <p className="error-msg">{error}</p>}

              <div className="profile-actions">
                <button type="button" className="cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
