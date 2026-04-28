import urllib.request
import re
import os
import time

BASE = "https://downloads.khinsider.com"
ALBUM = "https://downloads.khinsider.com/game-soundtracks/album/minecraft-volume-alpha-2015"

OUTPUT = "music"
os.makedirs(OUTPUT, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0"
}

def fetch(url):
    req = urllib.request.Request(url, headers=headers)
    return urllib.request.urlopen(req).read().decode("utf-8", errors="ignore")

def get_track_pages(html):
    return list(set(re.findall(r'href="(/game-soundtracks/album/[^"]+\.mp3)"', html)))

def get_real_download(html):
    # ESTE ES EL FIX IMPORTANTE
    match = re.search(r'href="(https://[^"]+\.mp3)"', html)
    if match:
        return match.group(1)
    return None

def download(url):
    filename = url.split("/")[-1]
    path = os.path.join(OUTPUT, filename)

    print("Downloading:", filename)

    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(path, "wb") as f:
        f.write(response.read())

def main():
    album_html = fetch(ALBUM)
    tracks = get_track_pages(album_html)

    print("Tracks found:", len(tracks))

    for i, t in enumerate(tracks):
        print(f"[{i+1}/{len(tracks)}]")

        track_html = fetch(BASE + t)
        real = get_real_download(track_html)

        if real:
            download(real)

        time.sleep(1)

if __name__ == "__main__":
    main()