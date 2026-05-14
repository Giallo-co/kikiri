import React, { useEffect, useState } from 'react';
import './Post.css';

const TOKEN_KEY = 'kikiri_token';

interface TrackInput {
  name: string;
  description: string;
  tag: string;
  file: File | null;
}

interface PostProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function Post({ onClose, onSuccess }: PostProps) {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '').trim() ?? '';
  const apiUrl = (path: string) => `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const [albumName, setAlbumName] = useState('');
  const [generalTag, setGeneralTag] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<TrackInput[]>([
    { name: '', description: '', tag: '', file: null },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

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
    return data as { url: string; headers: Record<string, string>; key: string };
  };

  const putToS3 = async (upload: { url: string; headers: Record<string, string> }, file: File) => {
    const h = new Headers();
    Object.entries(upload.headers).forEach(([k, v]) => h.set(k, v));
    const res = await fetch(upload.url, { method: 'PUT', headers: h, body: file });
    if (!res.ok) {
      throw new Error(`S3 upload failed: ${res.status}`);
    }
  };

  const handleAddTrack = () => {
    setTracks([...tracks, { name: '', description: '', tag: '', file: null }]);
  };

  const handleTrackChange = (index: number, field: keyof TrackInput, value: string | File | null) => {
    setTracks((prev) =>
      prev.map((track, i) => (i === index ? { ...track, [field]: value } : track))
    );
  };

  const handleRemoveTrack = (index: number) => {
    if (tracks.length === 1) return;
    setTracks(tracks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!token()) {
      setError('You must be logged in again to upload (missing session token).');
      setLoading(false);
      return;
    }

    if (!coverFile) {
      setError('Album cover image is required.');
      setLoading(false);
      return;
    }

    for (let i = 0; i < tracks.length; i++) {
      if (!tracks[i].name.trim()) {
        setError(`Track ${i + 1}: name is required.`);
        setLoading(false);
        return;
      }
      if (!tracks[i].file) {
        setError(`Track ${i + 1}: audio file is required.`);
        setLoading(false);
        return;
      }
    }

    try {
      const coverType = coverFile.type || 'image/jpeg';
      const coverPresign = await presign({
        kind: 'album_cover',
        contentType: coverType,
        contentLength: coverFile.size,
        albumName,
      });
      await putToS3(coverPresign, coverFile);

      const audioKeys: string[] = [];
      for (let i = 0; i < tracks.length; i++) {
        const tr = tracks[i];
        const file = tr.file as File;
        const audioType = file.type || 'application/octet-stream';
        const audioPresign = await presign({
          kind: 'album_track',
          contentType: audioType,
          contentLength: file.size,
          albumName,
          trackIndex: i + 1,
          trackName: tr.name.trim(),
        });
        await putToS3(audioPresign, file);
        audioKeys.push(audioPresign.key);
      }

      const publishRes = await fetch(apiUrl('/user/v1/albums/publish'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          albumName: albumName.trim(),
          generalTag: generalTag.trim(),
          coverKey: coverPresign.key,
          tracks: tracks.map((tr, i) => ({
            name: tr.name.trim(),
            description: tr.description.trim(),
            tag: tr.tag.trim(),
            audioKey: audioKeys[i],
          })),
        }),
      });

      const pubData = await publishRes.json().catch(() => ({}));
      if (!publishRes.ok) {
        throw new Error(
          (pubData as { message?: string }).message ||
            (pubData as { error?: string }).error ||
            `Publish failed (${publishRes.status})`
        );
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
              <h2 className="post-header-title">New album</h2>
              <p>Share your music with the network.</p>
            </div>

            <form method="post" action="#" onSubmit={handleSubmit} className="post-form">
              <div className="post-form-scrollable">
                <div className="form-section">
                  <h3>Album Info</h3>
                  <div className="form-group">
                    <label htmlFor="post-album-cover-input">Album cover</label>
                    <div className="post-cover-row">
                      <div className="file-upload-container post-cover-file-wrap">
                        <input
                          id="post-album-cover-input"
                          type="file"
                          className="file-input"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setCoverFile(f ?? null);
                          }}
                        />
                        <label htmlFor="post-album-cover-input" className="file-label">
                          {coverFile ? coverFile.name : 'Select cover image…'}
                        </label>
                      </div>
                      {coverPreviewUrl ? (
                        <div className="post-cover-thumb">
                          <img src={coverPreviewUrl} alt="Album cover preview" />
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                    <button type="button" onClick={handleAddTrack} className="add-track-btn">
                      + Add Track
                    </button>
                  </div>

                  {tracks.map((track, index) => (
                    <div key={index} className="track-input-group">
                      <div className="track-header">
                        <span>Track #{index + 1}</span>
                        {tracks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTrack(index)}
                            className="remove-track-btn"
                          >
                            ×
                          </button>
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
                          accept="audio/*,video/mp4,.mp3,.m4a,.wav,.flac,.ogg,.webm,.mp4"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleTrackChange(index, 'file', file ?? null);
                          }}
                        />
                        <label htmlFor={`track-file-${index}`} className="file-label">
                          {track.file ? track.file.name : 'Select Music File...'}
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
