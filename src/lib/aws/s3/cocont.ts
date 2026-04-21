import "dotenv/config";
import { deleteObject } from "./crud";

async function deleteOnly(): Promise<void> {
  const key = "test/coconut.jpg";

  console.log(`Deleting ${key}...`);

  await deleteObject(key);

  console.log("Delete successful");
}

deleteOnly().catch((err) => {
  console.error("Delete failed:", err);
  process.exit(1);
});
