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
  if (existing.TableNames?.includes("author")) {
    return;
  }

  const command = new CreateTableCommand({
    TableName: "author",
    AttributeDefinitions: [
      { AttributeName: "author_id", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "author_id", KeyType: "HASH" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  });

  await client.send(command);
  
}

run();