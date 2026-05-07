import { GetCommand, ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../lib/aws/dynamo/dynamoClient";
import { BaseNode, NodeType } from "../types/graphTypes";

export class NodeRepository {
  private readonly tableName = "node";

  public async getNodeById(nodeId: string): Promise<BaseNode | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { node_id: nodeId },
    });

    const response = await docClient.send(command);
    return (response.Item as BaseNode) || null;
  }

  public async getNodesByType(type?: NodeType): Promise<BaseNode[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: type ? "#type = :val" : undefined,
      ExpressionAttributeNames: type ? { "#type": "node_type" } : undefined,
      ExpressionAttributeValues: type ? { ":val": type } : undefined,
    });

    const response = await docClient.send(command);
    return (response.Items as BaseNode[]) || [];
  }

  public async createNodeWithEdge(
    newNode: BaseNode,
    sourceNodeId: string,
    edgeFieldNext: string
  ): Promise<void> {
    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.tableName,
            Item: newNode,
          },
        },
        {
          Update: {
            TableName: this.tableName,
            Key: { node_id: sourceNodeId },
            UpdateExpression:
              "SET #edgeField = list_append(if_not_exists(#edgeField, :empty_list), :new_id)",
            ExpressionAttributeNames: {
              "#edgeField": edgeFieldNext,
            },
            ExpressionAttributeValues: {
              ":empty_list": [],
              ":new_id": [newNode.node_id],
            },
          },
        },
      ],
    });

    await docClient.send(command);
  }

  public async createNode(newNode: BaseNode): Promise<void> {
    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.tableName,
            Item: newNode,
          },
        },
      ],
    });
    await docClient.send(command);
  }

  public async addEdgeBetweenNodes(
    sourceId: string,
    targetId: string,
    sourceEdgeField: string,
    targetEdgeField?: string
  ): Promise<void> {
    const transactItems: any[] = [
      {
        Update: {
          TableName: this.tableName,
          Key: { node_id: sourceId },
          UpdateExpression:
            "SET #edgeField = list_append(if_not_exists(#edgeField, :empty_list), :target_id)",
          ExpressionAttributeNames: {
            "#edgeField": sourceEdgeField,
          },
          ExpressionAttributeValues: {
            ":empty_list": [],
            ":target_id": [targetId],
          },
        },
      },
    ];

    if (targetEdgeField) {
      transactItems.push({
        Update: {
          TableName: this.tableName,
          Key: { node_id: targetId },
          UpdateExpression:
            "SET #edgeField = list_append(if_not_exists(#edgeField, :empty_list), :source_id)",
          ExpressionAttributeNames: {
            "#edgeField": targetEdgeField,
          },
          ExpressionAttributeValues: {
            ":empty_list": [],
            ":source_id": [sourceId],
          },
        },
      });
    }

    const command = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await docClient.send(command);
  }

  public async updateNode(nodeId: string, updateData: Partial<BaseNode>): Promise<void> {
    const expressions: string[] = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        expressions.push(`${attrName} = ${attrValue}`);
        attributeNames[attrName] = key;
        attributeValues[attrValue] = value;
      }
    }

    if (expressions.length === 0) return;

    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: this.tableName,
            Key: { node_id: nodeId },
            UpdateExpression: `SET ${expressions.join(", ")}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
          },
        },
      ],
    });

    await docClient.send(command);
  }

  public async deleteNode(nodeId: string): Promise<void> {
    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: this.tableName,
            Key: { node_id: nodeId },
          },
        },
      ],
    });

    await docClient.send(command);
  }

  public async removeEdgeBetweenNodes(
    sourceId: string,
    targetId: string,
    sourceEdgeField: string
  ): Promise<void> {
    // Note: list_remove is tricky in DynamoDB because it uses indexes.
    // For simplicity and matching the request, we would ideally use a Set, 
    // but the schema uses List []. 
    // A common workaround is to read, filter, and write, or use a different schema.
    // Given the constraints, I will implement a read-modify-write for removing from list.
    
    const node = await this.getNodeById(sourceId);
    if (!node) return;

    const list = (node as any)[sourceEdgeField] as string[];
    if (!list || !list.includes(targetId)) return;

    const newList = list.filter(id => id !== targetId);

    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: this.tableName,
            Key: { node_id: sourceId },
            UpdateExpression: "SET #edgeField = :newList",
            ExpressionAttributeNames: {
              "#edgeField": sourceEdgeField,
            },
            ExpressionAttributeValues: {
              ":newList": newList,
            },
          },
        },
      ],
    });

    await docClient.send(command);
  }
}
