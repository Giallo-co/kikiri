import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoConfig = {
  region: "us-east-1",
  endpoint: "http://localhost:8002",
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin123",
  },
};

const client = new DynamoDBClient(dynamoConfig);
const docClient = DynamoDBDocumentClient.from(client);

async function checkNodes() {
  try {
    const command = new ScanCommand({
      TableName: "node",
    });
    const response = await docClient.send(command);
    console.log("Count:", response.Count);
    console.log("First item:", JSON.stringify(response.Items?.[0], null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

checkNodes();
