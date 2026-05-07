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
}
