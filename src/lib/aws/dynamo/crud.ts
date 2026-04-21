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
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  }));
  return item;
}

export async function getPost(PK: string, SK: string): Promise<UserPost | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK, SK },
  }));
  return (result.Item as UserPost) ?? null;
}

export async function updatePost(
  PK: string,
  SK: string,
  updates: Partial<Omit<UserPost, "PK" | "SK">>
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
    Key: { PK, SK },
    UpdateExpression: `SET ${parts.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
    ReturnValues: "ALL_NEW",
  }));

  return (result.Attributes as UserPost) ?? null;
}

export async function deletePost(PK: string, SK: string): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK, SK },
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  }));
}

export async function queryByPK(PK: string, limit = 20): Promise<UserPost[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "#PK = :PK",
    ExpressionAttributeNames: { "#PK": "PK" },
    ExpressionAttributeValues: { ":PK": PK },
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

export async function searchPosts(query: string): Promise<UserPost[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression:
      "contains(#title, :q) OR contains(#content, :q) OR contains(#status, :q)",
    ExpressionAttributeNames: {
      "#title": "title",
      "#content": "content",
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":q": query,
    },
  }));
  return (result.Items as UserPost[]) ?? [];
}

/*
async function main() {
  const PK = "USER#user-001";
  const SK = `POST#${Date.now()}`;

  console.log("\n--- CREATE ---");
  const post = await createPost({
    PK,
    SK,
    title: "Hello from EC2",
    content: "DynamoDB connection works.",
    status: "published",
    tags: ["aws", "ec2", "dynamodb"],
  });
  console.log(post);

  console.log("\n--- GET ---");
  console.log(await getPost(PK, SK));

  console.log("\n--- UPDATE ---");
  console.log(await updatePost(PK, SK, { title: "Updated Title", status: "draft" }));

  console.log("\n--- QUERY ---");
  console.log(await queryByPK(PK));

  console.log("\n--- DELETE ---");
  await deletePost(PK, SK);
  console.log("Deleted.");
}

main().catch(console.error);
*/

export async function getRandomPosts(limit = 20): Promise<UserPost[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
  }));
  const all = (result.Items as UserPost[]) ?? [];
  // shuffle random
  return all.sort(() => Math.random() - 0.5).slice(0, limit);
}
