import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

async function testConnection() {
  const client = new DynamoDBClient({ region: "us-east-1" });
  try {
    const result = await client.send(new DescribeTableCommand({ TableName: "UserPosts" }));
    const table = result.Table;
    console.log("Connected to DynamoDB.");
    console.log("Table name   :", table?.TableName);
    console.log("Table status :", table?.TableStatus);
    console.log("Item count   :", table?.ItemCount);
    console.log("Table ARN    :", table?.TableArn);
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  }
}

testConnection();
