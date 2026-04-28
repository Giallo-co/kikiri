import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as fs from "fs";
import * as path from "path";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8002",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy"
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function run() {
  const dataPath = path.join(__dirname, "../data/nodes.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const items = JSON.parse(raw);

  console.log(`Seeding ${items.length} items into 'node' table...`);

  for (const item of items) {
    await docClient.send(
      new PutCommand({
        TableName: "node",
        Item: item
      })
    );
  }
  console.log("Seeding complete!");
}

run().catch(console.error);
