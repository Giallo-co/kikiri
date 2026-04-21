import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./dynamoClient";
import { UserPost } from "./types";

export async function createPost(item: UserPost): Promise<UserPost> {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(createdOn)",
  }));
  return item;
}

export async function getPost(userId: string, createdOn: number): Promise<UserPost | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { userId, createdOn },
  }));
  return (result.Item as UserPost) ?? null;
}

export async function updatePost(
  userId: string,
  createdOn: number,
  updates: Partial<Omit<UserPost, "userId" | "createdOn">>
): Promise<UserPost | null> {
  const fields = Object.entries(updates);
  if (fields.length === 0) throw new Error("No fields to update.");

  const names: Record<string, string> = { "#updatedOn": "updatedOn" };
  const values: Record<string, unknown> = { ":updatedOn": Date.now() };
  const parts: string[] = ["#updatedOn = :updatedOn"];

  fields.forEach(([k, v]) => {
    names[`#${k}`] = k;
    values[`:${k}`] = v;
    parts.push(`#${k} = :${k}`);
  });

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { userId, createdOn },
    UpdateExpression: `SET ${parts.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: "attribute_exists(userId) AND attribute_exists(createdOn)",
    ReturnValues: "ALL_NEW",
  }));

  return (result.Attributes as UserPost) ?? null;
}

export async function deletePost(userId: string, createdOn: number): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { userId, createdOn },
    ConditionExpression: "attribute_exists(userId) AND attribute_exists(createdOn)",
  }));
}

export async function queryByUser(userId: string, limit = 20): Promise<UserPost[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "#userId = :userId",
    ExpressionAttributeNames: { "#userId": "userId" },
    ExpressionAttributeValues: { ":userId": userId },
    Limit: limit,
    ScanIndexForward: false,
  }));
  return (result.Items as UserPost[]) ?? [];
}

export async function scanAll(limit = 50): Promise<UserPost[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    Limit: limit,
  }));
  return (result.Items as UserPost[]) ?? [];
}

async function main() {
  const now = Date.now();

  console.log("\n--- CREATE ---");
  const post = await createPost({
    userId: "user-001",
    createdOn: now,
    title: "Hello from EC2",
    content: "DynamoDB connection works.",
    status: "published",
    tags: ["aws", "ec2", "dynamodb"],
  });
  console.log(post);

  console.log("\n--- GET ---");
  console.log(await getPost("user-001", now));

  console.log("\n--- UPDATE ---");
  console.log(await updatePost("user-001", now, { title: "Updated Title", status: "draft" }));

  console.log("\n--- QUERY ---");
  console.log(await queryByUser("user-001"));

  console.log("\n--- DELETE ---");
  await deletePost("user-001", now);
  console.log("Deleted.");
}

main().catch(console.error);
