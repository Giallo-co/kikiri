const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API = API_BASE ? `${API_BASE}/user` : '/user';

console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('API_BASE:', API_BASE);
console.log('API:', API);

export function parseJwtSub(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown };
    if (typeof json.sub === 'number' && Number.isFinite(json.sub)) return json.sub;
    if (typeof json.sub === 'string') {
      const n = parseInt(json.sub, 10);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function presign(
  token: string,
  kind: 'avatar' | 'post_audio' | 'post_image',
  file: File
): Promise<{ url: string; headers: Record<string, string>; key: string; publicUrl?: string }> {
  const res = await fetch(`${API}/v1/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      kind,
      contentType: file.type || 'application/octet-stream',
      contentLength: file.size
    })
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : `presign failed: ${res.status}`);
  }
  return data as {
    url: string;
    headers: Record<string, string>;
    key: string;
    publicUrl?: string;
  };
}

async function putToS3(url: string, headers: Record<string, string>, file: File): Promise<void> {
  const h = new Headers(headers);
  const res = await fetch(url, { method: 'PUT', headers: h, body: file });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`S3 PUT failed: ${res.status} ${t.slice(0, 200)}`);
  }
}

export async function uploadAvatar(token: string, userId: number, file: File): Promise<string> {
  const p = await presign(token, 'avatar', file);
  await putToS3(p.url, p.headers, file);
  const res = await fetch(`${API}/v1/users/${userId}/profile-picture`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ profilePictureKey: p.key })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : JSON.stringify(data));
  }
  return JSON.stringify(data, null, 2);
}

export async function uploadUserPost(
  token: string,
  title: string,
  body: string,
  audio: File,
  images: File[]
): Promise<string> {
  const audioPresign = await presign(token, 'post_audio', audio);
  await putToS3(audioPresign.url, audioPresign.headers, audio);

  const imageKeys: string[] = [];
  for (const img of images) {
    if (!img.size) continue;
    const ip = await presign(token, 'post_image', img);
    await putToS3(ip.url, ip.headers, img);
    imageKeys.push(ip.key);
  }

  const res = await fetch(`${API}/v1/user-posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title,
      body,
      audioKey: audioPresign.key,
      imageKeys
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : JSON.stringify(data));
  }
  return JSON.stringify(data, null, 2);
}

export async function uploadMusicNode(
  token: string,
  sourceId: string,
  nodeData: {
    node_name: string;
    music_description: string;
    node_color?: string;
    audioFile: File;
    coverFile?: File;
  }
): Promise<any> {
  const audioPresign = await presign(token, 'post_audio', nodeData.audioFile);
  await putToS3(audioPresign.url, audioPresign.headers, nodeData.audioFile);

  let coverKey = '';
  if (nodeData.coverFile) {
    const coverPresign = await presign(token, 'post_image', nodeData.coverFile);
    await putToS3(coverPresign.url, coverPresign.headers, nodeData.coverFile);
    coverKey = coverPresign.key;
  }

  const payload = {
    node_type: 'Music',
    node_name: nodeData.node_name,
    music_description: nodeData.music_description,
    node_color: nodeData.node_color || '#1db954',
    audioKey: audioPresign.key,
    coverKey: coverKey,
    edgeFieldNext: 'node_music_links_next'
  };

  const res = await fetch(`${API}/v1/nodes/${sourceId}/edges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create music node');
  }
  return data.data;
}
