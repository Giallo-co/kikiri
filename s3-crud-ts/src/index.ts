import "dotenv/config";
import {
  createObject,
  readObject,
  listObjects,
  updateObject,
  deleteObject,
  renameObject,
} from "./crud";

interface Record {
  id: number;
  name: string;
  status: string;
}

async function main(): Promise<void> {
  const testKey = "data/test-record.json";

  const initialData: Record = { id: 1, name: "kikiri", status: "active" };
  const updatedData: Record = { id: 1, name: "kikiri", status: "updated" };

  console.log("--- CREATE ---");
  await createObject(testKey, JSON.stringify(initialData, null, 2), "application/json");

  console.log("\n--- LIST ---");
  const objects = await listObjects("data/");
  console.log(objects);

  console.log("\n--- READ ---");
  const content = await readObject(testKey);
  console.log(content);

  console.log("\n--- UPDATE ---");
  await updateObject(testKey, JSON.stringify(updatedData, null, 2), "application/json");
  const updated = await readObject(testKey);
  console.log(updated);

  console.log("\n--- RENAME ---");
  await renameObject(testKey, "data/renamed-record.json");

  console.log("\n--- LIST AFTER RENAME ---");
  const afterRename = await listObjects("data/");
  console.log(afterRename);

  console.log("\n--- DELETE ---");
  await deleteObject("data/renamed-record.json");

  console.log("\n--- LIST AFTER DELETE ---");
  const afterDelete = await listObjects("data/");
  console.log(afterDelete);
}

main().catch(console.error);
