import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import {
  createObject,
  readObject,
  updateObject,
  deleteObject,
  listObjects,
  renameObject,
  getTTL,
  purgeExpired,
} from "./crud";

const IMAGE_PATH = path.resolve(__dirname, "coconut.jpg");
const CONTENT_TYPE = "image/jpeg";

async function runTests(): Promise<void> {
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`File not found: ${IMAGE_PATH}`);
    console.error(`Place coconut.jpg in the project root and try again.`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  console.log(`File loaded: coconut.jpg (${(imageBuffer.length / 1024).toFixed(1)} KB)\n`);
  console.log("=".repeat(50));
  console.log("  CRUD TEST — WITHOUT TTL");
  console.log("=".repeat(50));

  const keyNoTTL = "test/coconut-no-ttl.jpg";

  console.log("\n--- CREATE ---");
  const created = await createObject(keyNoTTL, imageBuffer, CONTENT_TYPE);
  console.log(`ETag: ${created.ETag}`);

  console.log("\n--- LIST ---");
  const listed = await listObjects("test/");
  listed.forEach((obj) => console.log(`  ${obj.key} | ${(obj.size / 1024).toFixed(1)} KB | ${obj.lastModified}`));

  console.log("\n--- GET ---");
  const content = await readObject(keyNoTTL);
  if (content) {
    console.log(`Retrieved: ${(content.length / 1024).toFixed(1)} KB of binary data`);
  }

  console.log("\n--- UPDATE ---");
  const updatedBuffer = Buffer.concat([imageBuffer, Buffer.from("updated")]);
  const updated = await updateObject(keyNoTTL, updatedBuffer, CONTENT_TYPE);
  console.log(`ETag after update: ${updated.ETag}`);

  console.log("\n--- RENAME ---");
  const renamedKey = "test/coconut-renamed.jpg";
  await renameObject(keyNoTTL, renamedKey);

  console.log("\n--- DELETE ---");
  await deleteObject(renamedKey);

  console.log("\n--- LIST AFTER DELETE ---");
  const afterDelete = await listObjects("test/");
  console.log(`Objects remaining in test/: ${afterDelete.length}`);

  console.log("\n");
  console.log("=".repeat(50));
  console.log("  CRUD TEST — WITH TTL");
  console.log("=".repeat(50));

  const keyWithTTL = "test/coconut-ttl.jpg";
  const TTL_SECONDS = 10;

  console.log("\n--- CREATE (TTL: 10s) ---");
  const createdTTL = await createObject(keyWithTTL, imageBuffer, CONTENT_TYPE, TTL_SECONDS);
  console.log(`ETag: ${createdTTL.ETag}`);

  console.log("\n--- GET TTL REMAINING ---");
  const remaining = await getTTL(keyWithTTL);
  console.log(`Seconds remaining: ${remaining}s`);

  console.log("\n--- GET (before expiry) ---");
  const contentTTL = await readObject(keyWithTTL);
  if (contentTTL) {
    console.log(`Retrieved: ${(contentTTL.length / 1024).toFixed(1)} KB of binary data`);
  }

  console.log("\n--- UPDATE (reset TTL to 20s) ---");
  await updateObject(keyWithTTL, imageBuffer, CONTENT_TYPE, 20);
  const remainingAfterUpdate = await getTTL(keyWithTTL);
  console.log(`Seconds remaining after TTL reset: ${remainingAfterUpdate}s`);

  console.log("\n--- DELETE (manual cleanup) ---");
  await deleteObject(keyWithTTL);

  console.log("\n--- PURGE EXPIRED ---");
  const keyExpired = "test/coconut-expired.jpg";
  await createObject(keyExpired, imageBuffer, CONTENT_TYPE, 1);
  console.log(`Created object with TTL of 1s, waiting 2s...`);
  await new Promise((res) => setTimeout(res, 2000));
  const purged = await purgeExpired("test/");
  console.log(`Purged keys: ${purged.length > 0 ? purged.join(", ") : "none (already auto-deleted on read)"}`);

  console.log("\n");
  console.log("=".repeat(50));
  console.log("  ALL TESTS COMPLETE");
  console.log("=".repeat(50));
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});