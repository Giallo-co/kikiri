import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ─────────────────────────────────────────────
//  Configuración
// ─────────────────────────────────────────────
const CONFIG = {
  outputDir: "./musica",          // Carpeta de destino
  format: "mp3",                  // Formato de salida
  audioQuality: "0",              // 0 = mejor calidad (VBR), 9 = peor
  concurrentDownloads: 3,         // Descargas en paralelo
  retries: 3,                     // Reintentos por archivo fallido
  embedThumbnail: true,           // Incrustar carátula en el MP3
  embedMetadata: true,            // Incrustar título, artista, etc.
  skipExisting: true,             // Omitir archivos ya descargados
};

// ─────────────────────────────────────────────
//  Colores para la terminal
// ─────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
};

function log(msg: string) { console.log(msg); }
function ok(msg: string)   { log(`${c.green}✔${c.reset}  ${msg}`); }
function warn(msg: string) { log(`${c.yellow}⚠${c.reset}  ${msg}`); }
function err(msg: string)  { log(`${c.red}✖${c.reset}  ${msg}`); }
function info(msg: string) { log(`${c.cyan}ℹ${c.reset}  ${msg}`); }

// ─────────────────────────────────────────────
//  Verificar dependencias
// ─────────────────────────────────────────────
function checkDependencies(): void {
  const deps = ["yt-dlp", "ffmpeg"];
  const missing: string[] = [];

  for (const dep of deps) {
    try {
      execSync(`which ${dep}`, { stdio: "ignore" });
    } catch {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    err(`Faltan dependencias: ${missing.join(", ")}`);
    log("");
    log(`${c.bold}Instalar con:${c.reset}`);
    if (missing.includes("yt-dlp")) {
      log(`  ${c.gray}pip install yt-dlp${c.reset}   o   ${c.gray}brew install yt-dlp${c.reset}`);
    }
    if (missing.includes("ffmpeg")) {
      log(`  ${c.gray}brew install ffmpeg${c.reset}   o   ${c.gray}sudo apt install ffmpeg${c.reset}`);
    }
    process.exit(1);
  }

  ok("Dependencias verificadas (yt-dlp + ffmpeg)");
}

// ─────────────────────────────────────────────
//  Obtener información de la playlist
// ─────────────────────────────────────────────
interface VideoInfo {
  id: string;
  title: string;
  uploader: string;
  duration: number;
}

function getPlaylistInfo(url: string): VideoInfo[] {
  info("Obteniendo información de la playlist...");

  try {
    const raw = execSync(
      `yt-dlp --flat-playlist --dump-json --no-warnings "${url}"`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
    );

    const videos: VideoInfo[] = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const v = JSON.parse(line);
        return {
          id: v.id,
          title: v.title ?? "Sin título",
          uploader: v.uploader ?? v.channel ?? "Desconocido",
          duration: v.duration ?? 0,
        };
      });

    return videos;
  } catch (e) {
    err("No se pudo obtener la playlist. Verifica la URL y tu conexión.");
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
//  Descargar un video como MP3
// ─────────────────────────────────────────────
function downloadVideo(video: VideoInfo, index: number, total: number): Promise<boolean> {
  return new Promise((resolve) => {
    const prefix = `[${String(index).padStart(String(total).length, "0")}/${total}]`;
    const label  = `${c.bold}${video.title}${c.reset} ${c.gray}(${video.uploader})${c.reset}`;

    log(`\n${c.blue}${prefix}${c.reset} Descargando ${label}`);

    const args = [
      `https://www.youtube.com/watch?v=${video.id}`,
      "--extract-audio",
      "--audio-format", CONFIG.format,
      "--audio-quality", CONFIG.audioQuality,
      "--retries", String(CONFIG.retries),
      "--output", `${CONFIG.outputDir}/%(title)s.%(ext)s`,
      "--no-warnings",
      "--progress",
    ];

    if (CONFIG.embedThumbnail)  args.push("--embed-thumbnail");
    if (CONFIG.embedMetadata)   args.push("--embed-metadata");
    if (CONFIG.skipExisting)    args.push("--no-overwrites");

    const proc = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });

    // Mostrar progreso filtrado
    proc.stdout.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line.includes("[download]") && line.includes("%")) {
        process.stdout.write(`\r  ${c.gray}${line.replace(/\[download\]\s*/, "")}${c.reset}   `);
      }
    });

    proc.stderr.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line && !line.includes("WARNING")) {
        process.stdout.write(`\r  ${c.yellow}${line}${c.reset}\n`);
      }
    });

    proc.on("close", (code) => {
      process.stdout.write("\n");
      if (code === 0) {
        ok(`Completado: ${video.title}`);
        resolve(true);
      } else {
        err(`Error en: ${video.title}`);
        resolve(false);
      }
    });
  });
}

// ─────────────────────────────────────────────
//  Descargar en lotes (concurrencia limitada)
// ─────────────────────────────────────────────
async function downloadBatch(videos: VideoInfo[]): Promise<void> {
  const total   = videos.length;
  let completed = 0;
  let failed    = 0;
  const failedVideos: VideoInfo[] = [];

  // Dividir en chunks según concurrencia configurada
  for (let i = 0; i < videos.length; i += CONFIG.concurrentDownloads) {
    const chunk = videos.slice(i, i + CONFIG.concurrentDownloads);

    const results = await Promise.all(
      chunk.map((video, j) => downloadVideo(video, i + j + 1, total))
    );

    results.forEach((success, j) => {
      if (success) {
        completed++;
      } else {
        failed++;
        failedVideos.push(chunk[j]);
      }
    });
  }

  // Resumen final
  log(`\n${"─".repeat(50)}`);
  log(`${c.bold}Resumen de descarga:${c.reset}`);
  ok(`Exitosos: ${c.green}${completed}${c.reset} / ${total}`);

  if (failed > 0) {
    warn(`Fallidos:  ${c.red}${failed}${c.reset} / ${total}`);
    log(`\n${c.yellow}Videos que fallaron:${c.reset}`);
    failedVideos.forEach((v) => log(`  ${c.gray}• ${v.title}${c.reset}`));

    // Guardar log de fallidos
    const logPath = path.join(CONFIG.outputDir, "fallidos.txt");
    const logContent = failedVideos
      .map((v) => `https://www.youtube.com/watch?v=${v.id}  # ${v.title}`)
      .join("\n");
    fs.writeFileSync(logPath, logContent, "utf-8");
    info(`Lista de fallidos guardada en: ${logPath}`);
  }

  info(`Archivos guardados en: ${path.resolve(CONFIG.outputDir)}`);
}

// ─────────────────────────────────────────────
//  Entrada interactiva si no se pasa URL
// ─────────────────────────────────────────────
async function promptUrl(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\n${c.cyan}URL de la playlist de YouTube: ${c.reset}`, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
async function main(): Promise<void> {
  log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════╗${c.reset}`);
  log(`${c.bold}${c.cyan}║   🎵  YouTube Playlist Downloader   ║${c.reset}`);
  log(`${c.bold}${c.cyan}╚══════════════════════════════════════╝${c.reset}\n`);

  // 1. Verificar dependencias
  checkDependencies();

  // 2. Obtener URL (argumento CLI o prompt interactivo)
  let playlistUrl = process.argv[2];
  if (!playlistUrl) {
    playlistUrl = await promptUrl();
  }

  if (!playlistUrl || !playlistUrl.startsWith("http")) {
    err("URL inválida. Debe empezar con http:// o https://");
    process.exit(1);
  }

  // 3. Crear carpeta de salida
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    info(`Carpeta creada: ${CONFIG.outputDir}`);
  }

  // 4. Obtener info de la playlist
  const videos = getPlaylistInfo(playlistUrl);
  log(`\n${c.bold}Playlist encontrada:${c.reset} ${videos.length} canciones`);

  if (videos.length === 0) {
    warn("La playlist está vacía o no se pudo leer.");
    process.exit(0);
  }

  // Mostrar primeras canciones como preview
  const preview = videos.slice(0, 5);
  preview.forEach((v, i) => {
    const dur = v.duration > 0
      ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, "0")}`
      : "--:--";
    log(`  ${c.gray}${i + 1}. ${v.title} [${dur}]${c.reset}`);
  });
  if (videos.length > 5) log(`  ${c.gray}... y ${videos.length - 5} más${c.reset}`);

  log("");

  // 5. Descargar todo
  await downloadBatch(videos);
}

main().catch((e) => {
  err(`Error inesperado: ${e.message}`);
  process.exit(1);
});