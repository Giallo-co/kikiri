import { useMemo, useState } from 'react';
import { fetchUserPosts, parseJwtSub, uploadAvatar, uploadUserPost } from './uploadFlows';

function App() {
  const [token, setToken] = useState('');
  const [log, setLog] = useState('');
  const [title, setTitle] = useState('My track');
  const [body, setBody] = useState('Recorded at home.');

  const userId = useMemo(() => parseJwtSub(token.trim()), [token]);

  const appendLog = (msg: string) => {
    setLog((prev) => `${prev}\n${msg}`.trim());
  };

  return (
    <div className="main-container" style={{ maxWidth: 720, margin: '0 auto', padding: 16, fontFamily: 'system-ui' }}>
      <h1>Kikiri uploads</h1>
      <p style={{ color: '#444' }}>
        Paste a JWT from login/register. With <code>npm run dev:all</code> or backend on port 3000, Vite proxies{' '}
        <code>/user</code> to the API.
      </p>

      <label style={{ display: 'block', marginBottom: 8 }}>
        Bearer token
        <textarea
          style={{ width: '100%', minHeight: 72, marginTop: 4 }}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIs..."
        />
      </label>
      <p style={{ fontSize: 14 }}>
        Parsed user id: <strong>{userId ?? '—'}</strong>
      </p>

      <section style={{ marginTop: 24, borderTop: '1px solid #ddd', paddingTop: 16 }}>
        <h2>Profile picture</h2>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || userId === null) {
              appendLog(userId === null ? 'Need a valid JWT with sub (user id).' : 'Pick a file.');
              return;
            }
            try {
              appendLog('Uploading avatar…');
              const out = await uploadAvatar(token.trim(), userId, file);
              appendLog(out);
            } catch (err) {
              appendLog(err instanceof Error ? err.message : String(err));
            }
            e.target.value = '';
          }}
        />
      </section>

      <section style={{ marginTop: 24, borderTop: '1px solid #ddd', paddingTop: 16 }}>
        <h2>Post (audio + optional images)</h2>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Title
          <input style={{ width: '100%', marginTop: 4 }} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Body
          <textarea style={{ width: '100%', marginTop: 4, minHeight: 64 }} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Audio file
          <input type="file" accept="audio/*" style={{ display: 'block', marginTop: 4 }} id="audio-input" />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Optional images (JPEG/PNG/WebP/GIF)
          <input type="file" accept="image/*" multiple style={{ display: 'block', marginTop: 4 }} id="images-input" />
        </label>
        <button
          type="button"
          onClick={async () => {
            if (userId === null) {
              appendLog('Need a valid JWT with sub (user id).');
              return;
            }
            const audioEl = document.getElementById('audio-input') as HTMLInputElement | null;
            const imgsEl = document.getElementById('images-input') as HTMLInputElement | null;
            const audio = audioEl?.files?.[0];
            if (!audio) {
              appendLog('Choose an audio file.');
              return;
            }
            const images = imgsEl?.files ? Array.from(imgsEl.files) : [];
            try {
              appendLog('Uploading post…');
              const out = await uploadUserPost(token.trim(), title, body, audio, images);
              appendLog(out);
            } catch (err) {
              appendLog(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          Upload post
        </button>
        <button
          type="button"
          style={{ marginLeft: 8 }}
          onClick={async () => {
            if (userId === null) {
              appendLog('Need a valid JWT with sub (user id).');
              return;
            }
            try {
              appendLog('Loading posts…');
              const out = await fetchUserPosts(token.trim(), userId);
              appendLog(out);
            } catch (err) {
              appendLog(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          List my Dynamo posts
        </button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Log</h2>
        <pre
          style={{
            background: '#111',
            color: '#e0e0e0',
            padding: 12,
            minHeight: 120,
            overflow: 'auto',
            fontSize: 12
          }}
        >
          {log || '—'}
        </pre>
      </section>
    </div>
  );
}

export default App;
