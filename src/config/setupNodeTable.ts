import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { client } from "../lib/dynamo";

export async function createNodeTable() {
  const command = new CreateTableCommand({
    TableName: "node",
    AttributeDefinitions: [
      { AttributeName: "node_id", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "node_id", KeyType: "HASH" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });

  try {
    await client.send(command);
    console.log("Table 'node' created successfully");
  } catch (error: any) {
    if (error.name === "ResourceInUseException") {
      console.log("Table 'node' already exists");
    } else {
      console.error("Error creating table 'node':", error);
      throw error;
    }
  }
}

if (require.main === module) {
  createNodeTable();
}
