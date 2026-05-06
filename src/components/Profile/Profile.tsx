import React, { useState, useEffect } from 'react';
import './Profile.css';
import { RawNode } from '../../types/graph';

interface ProfileProps {
  userNode: RawNode;
  onUpdate: (updatedNode: RawNode) => void;
  onClose: () => void;
}

export default function Profile({ userNode, onUpdate, onClose }: ProfileProps) {
  const [nodeName, setNodeName] = useState(userNode.node_name || '');
  const [authorName, setAuthorName] = useState(userNode.author_name || '');
  const [description, setDescription] = useState(userNode.author_description || '');
  const [nodeColor, setNodeColor] = useState(userNode.node_color || '#000000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_id: userNode.node_id,
          node_name: nodeName,
          author_name: authorName,
          author_description: description,
          node_color: nodeColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Update failed');
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
      <div className="glass-effect-layer" />
      
      <div className="profile-content-layer">
        <div className="profile-card">
          <div className="profile-card-inner">
            <div className="logo-icon">P</div>
            
            <div className="profile-header">
              <h2>[ User Profile ]</h2>
              <p>Customize your identity in the network.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Node Name</label>
                <input 
                  type="text" 
                  value={nodeName} 
                  onChange={(e) => setNodeName(e.target.value)} 
                  placeholder="Enter node name"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Author Name</label>
                <input 
                  type="text" 
                  value={authorName} 
                  onChange={(e) => setAuthorName(e.target.value)} 
                  placeholder="Enter author name"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Tell us about yourself"
                  rows={4}
                  className="profile-textarea"
                />
              </div>
              <div className="form-group">
                <label>Node Color</label>
                <div className="color-input-wrapper">
                  <input 
                    type="color" 
                    value={nodeColor} 
                    onChange={(e) => setNodeColor(e.target.value)} 
                    className="color-picker"
                  />
                  <input 
                    type="text" 
                    value={nodeColor} 
                    onChange={(e) => setNodeColor(e.target.value)} 
                    placeholder="#000000"
                    className="color-text-input"
                  />
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
