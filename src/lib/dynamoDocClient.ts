import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import config from '../config/config';

const lowLevel = new DynamoDBClient({ region: config.awsRegion });

export const dynamoDocClient = DynamoDBDocumentClient.from(lowLevel, {
  marshallOptions: { removeUndefinedValues: true }
});
