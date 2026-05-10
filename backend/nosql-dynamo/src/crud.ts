import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { docClient, TABLE_NAME } from "./dynamoClient";
import { Node } from "./types";

function generateId(): number {
  return Date.now();
}

export async function createNode(
  item: Omit<Node, "node_id">
): Promise<Node> {
  const node = {
    ...item,
    node_id: generateId(),
  } as Node;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: node,
      ConditionExpression: "attribute_not_exists(node_id)",
    })
  );

  return node;
}

export async function getNode(
  node_id: number
): Promise<Node | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { node_id },
    })
  );

  return (result.Item as Node) ?? null;
}

export async function updateNode(
  node_id: number,
  updates: Partial<Node>
): Promise<Node | null> {
  const fields = Object.entries(updates);

  if (fields.length === 0) {
    throw new Error("No fields to update.");
  }

  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const parts: string[] = [];

  fields.forEach(([k, v]) => {
    names[`#${k}`] = k;
    values[`:${k}`] = v;
    parts.push(`#${k} = :${k}`);
  });

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { node_id },

      UpdateExpression: `SET ${parts.join(", ")}`,

      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,

      ReturnValues: "ALL_NEW",
    })
  );

  return (result.Attributes as Node) ?? null;
}

export async function deleteNode(
  node_id: number
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { node_id },
    })
  );
}

export async function scanNodes(
  limit = 50
): Promise<Node[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: limit,
    })
  );

  return (result.Items as Node[]) ?? [];
}

async function main() {
  const node = await createNode({
    node_type: "Music",
    node_name: "Key",
    node_color: "#67AC37",

    node_music_links_next: [],
    node_music_links_previous: [],

    node_tag_links_next: [],
    node_tag_links_previous: [],

    node_author_links_next: [2],
    node_author_links_previous: [],

    node_album_links_next: [7],
    node_album_links_previous: [],

    music_id: 59,
    music_name: "Key",
    music_description: "Key from C418",
    music_author: "C418",

    music_cover_url:
      "http://localhost:9000/music-cover/c418/volume-alpha.jpg",

    music_url:
      "http://localhost:9000/music/c418/volume-alpha/01-key.mp3",

    music_album: "Volume Alpha",

    likes: 0,
    views: 0,
    shares: 0,
    comments: 0,
  });

  console.log(node);

  console.log(await getNode(node.node_id));

  console.log(
    await updateNode(node.node_id, {
      node_name: "Key Updated",
      likes: 10,
    })
  );

  console.log(await scanNodes());

  await deleteNode(node.node_id);

  console.log("Deleted");
}

main().catch(console.error);
