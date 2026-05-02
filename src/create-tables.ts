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
  const tables1 = await client.send(new ListTablesCommand({}));
  console.log(tables1);
  
  const existing1 = await client.send(new ListTablesCommand({}));
  if (existing1.TableNames?.includes("author")) {
    return;
  }

  const command1 = new CreateTableCommand({
    TableName: "author",
    AttributeDefinitions: [
      { AttributeName: "author_id", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "author_id", KeyType: "HASH" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  });

  await client.send(command1);

    const tables2 = await client.send(new ListTablesCommand({}));
    console.log(tables2);


    const existing2 = await client.send(new ListTablesCommand({}));
    if (existing2.TableNames?.includes("music")) {
        return;
    }

    const command2 = new CreateTableCommand({
    TableName: "music",
    AttributeDefinitions: [
      { AttributeName: "music_id", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "music_id", KeyType: "HASH" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  });

    await client.send(command2);


    const tables3 = await client.send(new ListTablesCommand({}));
    console.log(tables3);

    const existing3 = await client.send(new ListTablesCommand({}));
    if (existing3.TableNames?.includes("node")) {
        return;
    }

    const command3 = new CreateTableCommand({
    TableName: "node",
    AttributeDefinitions: [
      { AttributeName: "node_id", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "node_id", KeyType: "HASH" }
    ],
    BillingMode: "PAY_PER_REQUEST"
    });

    await client.send(command3);
}

run();