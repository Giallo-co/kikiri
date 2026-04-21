import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { createObject } from "./crud";

const IMAGE_PATH = path.resolve(__dirname, "coconut.jpg");
const CONTENT_TYPE = "image/jpeg";

async function uploadOnly(): Promise<void> {
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`File not found: ${IMAGE_PATH}`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  console.log(`Uploading coconut.jpg (${(imageBuffer.length / 1024).toFixed(1)} KB)...`);

  const key = "test/coconut.jpg";

  const result = await createObject(key, imageBuffer, CONTENT_TYPE);

  console.log("Upload successful");
  console.log(`ETag: ${result.ETag}`);
}

uploadOnly().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
