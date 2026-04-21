import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { client, TABLE_NAME } from "../lib/dynamo";

export async function createSocialTable() {
  const command = new CreateTableCommand({
    TableName: TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" },
      { AttributeName: "SK", AttributeType: "S" },
      { AttributeName: "GSI1PK", AttributeType: "S" },
      { AttributeName: "GSI1SK", AttributeType: "S" },
      { AttributeName: "GSI2PK", AttributeType: "S" },
      { AttributeName: "GSI2SK", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "GSI1PK", KeyType: "HASH" },
          { AttributeName: "GSI1SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "GSI2",
        KeySchema: [
          { AttributeName: "GSI2PK", KeyType: "HASH" },
          { AttributeName: "GSI2SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });

  try {
    await client.send(command);
    console.log("Table KikiriSocial created successfully");
  } catch (error: any) {
    if (error.name === "ResourceInUseException") {
      console.log("Table KikiriSocial already exists");
    } else {
      console.error("Error creating table KikiriSocial:", error);
      throw error;
    }
  }
}

if (require.main === module) {
  createSocialTable();
}
