import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const clientConfig: any = {
  region: process.env.AWS_REGION || "us-east-1",
};

if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
  };
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

const S3_BASE_URL = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");

function replaceLocalUrls(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    if (typeof obj === "string" && obj.includes("http://localhost:9000/")) {
      return obj.replace("http://localhost:9000/", `${S3_BASE_URL}/`);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(replaceLocalUrls);
  }

  const newObj: any = {};
  for (const key in obj) {
    newObj[key] = replaceLocalUrls(obj[key]);
  }
  return newObj;
}

async function run() {
  const nodesPath = path.join(__dirname, "nodes.json");
  if (!fs.existsSync(nodesPath)) {
    console.error(`File not found: ${nodesPath}`);
    return;
  }

  const raw = fs.readFileSync(nodesPath, "utf-8");
  let items = JSON.parse(raw);

  console.log(`Initial items count: ${items.length}`);
  items = items.map(replaceLocalUrls);

  const TABLE_NAME = "node";
  const BATCH_SIZE = 25;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const putRequests = chunk.map((item: any) => ({
      PutRequest: { Item: item },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    });

    try {
      await docClient.send(command);
      console.log(`Inserted batch ${i / BATCH_SIZE + 1}`);
    } catch (err) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, err);
    }
  }

  console.log("Seeding complete.");
}

run();