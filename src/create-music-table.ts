import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8002",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy"
  }
});

async function run() {
  const tables = await client.send(new ListTablesCommand({}));
  console.log(tables);
  
  const existing = await client.send(new ListTablesCommand({}));
  if (existing.TableNames?.includes("music")) {
    return;
  }

  const command = new CreateTableCommand({
    TableName: "music",
    AttributeDefinitions: [
      { AttributeName: "music_id", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "music_id", KeyType: "HASH" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  });

  await client.send(command);
  
}

run();