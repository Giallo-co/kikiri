import React, { useState } from 'react';
import './Post.css';

interface TrackInput {
  name: string;
  url: string;
  description: string;
  tag: string;
}

interface PostProps {
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function Post({ username, onClose, onSuccess }: PostProps) {
  const [albumName, setAlbumName] = useState('');
  const [authorName, setAuthorName] = useState(username);
  const [generalTag, setGeneralTag] = useState('');
  const [tracks, setTracks] = useState<TrackInput[]>([{ name: '', url: '', description: '', tag: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddTrack = () => {
    setTracks([...tracks, { name: '', url: '', description: '', tag: '' }]);
  };

  const handleTrackChange = (index: number, field: keyof TrackInput, value: string) => {
    const newTracks = [...tracks];
    (newTracks[index] as any)[field] = value;
    setTracks(newTracks);
  };

  const handleRemoveTrack = (index: number) => {
    if (tracks.length === 1) return;
    setTracks(tracks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/album/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumName,
          authorName,
          coverUrl: '', // Removed from UI
          generalTag,
          tracks,
          postedBy: username
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload album');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-container">
      <div className="post-glass-overlay" />
      
      <div className="post-content-layer">
        <div className="post-card">
          <div className="post-card-inner">
            <div className="post-header">
              <button type="button" className="post-header-btn">
                [ Album Cover ]
              </button>
              <p>Share your music with the network.</p>
            </div>

            <form onSubmit={handleSubmit} className="post-form">
              <div className="post-form-scrollable">
                <div className="form-section">
                  <h3>Album Info</h3>
                  <div className="form-group">
                    <label>Album Name</label>
                    <input 
                      type="text" 
                      value={albumName} 
                      onChange={(e) => setAlbumName(e.target.value)} 
                      placeholder="e.g. Volume Beta"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Artist Name</label>
                    <input 
                      type="text" 
                      value={authorName} 
                      onChange={(e) => setAuthorName(e.target.value)} 
                      placeholder="e.g. C418"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>General Tag(s)</label>
                    <input 
                      type="text" 
                      value={generalTag} 
                      onChange={(e) => setGeneralTag(e.target.value)} 
                      placeholder="e.g. Soundtrack, Indie, Electronic"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-header">
                    <h3>Tracks</h3>
                    <button type="button" onClick={handleAddTrack} className="add-track-btn">+ Add Track</button>
                  </div>
                  
                  {tracks.map((track, index) => (
                    <div key={index} className="track-input-group">
                      <div className="track-header">
                        <span>Track #{index + 1}</span>
                        {tracks.length > 1 && (
                          <button type="button" onClick={() => handleRemoveTrack(index)} className="remove-track-btn">×</button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={track.name} 
                        onChange={(e) => handleTrackChange(index, 'name', e.target.value)} 
                        placeholder="Track Name"
                        required 
                      />
                      <div className="file-upload-container">
                        <input 
                          type="file" 
                          id={`track-file-${index}`}
                          className="file-input"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleTrackChange(index, 'url', file.name);
                          }}
                        />
                        <label htmlFor={`track-file-${index}`} className="file-label">
                          {track.url || 'Select Music File...'}
                        </label>
                      </div>
                      <input 
                        type="text" 
                        value={track.description} 
                        onChange={(e) => handleTrackChange(index, 'description', e.target.value)} 
                        placeholder="Description (optional)"
                      />
                      <input 
                        type="text" 
                        value={track.tag} 
                        onChange={(e) => handleTrackChange(index, 'tag', e.target.value)} 
                        placeholder="Tag(s) (optional, e.g. Rock, Metal)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="error-msg">{error}</p>}
              
              <div className="post-actions">
                <button type="button" className="cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Uploading...' : 'Create Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
