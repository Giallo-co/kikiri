import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  minPasswordLength: number;
  apiBasePath: string;
  host: string;
  protocol: 'http' | 'https';
  errorMessage: string;
  awsRegion: string;
  s3BucketName: string;
  s3PublicBaseUrl: string;
  dynamodbUserPostTableName: string;
  dynamodbNodeTableName: string;
}

function parseNumber(
  value: string | undefined,
  fallback: number,
  opts?: { positive?: boolean }
): number {
  if (value === undefined || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (opts?.positive && parsed <= 0) return fallback;
  return parsed;
}

function parseNodeEnv(value: string | undefined): Config['nodeEnv'] {
  if (value === 'production' || value === 'test' || value === 'development') return value;
  return 'development';
}

function parseProtocol(value: string | undefined): Config['protocol'] {
  if (value === 'https' || value === 'http') return value;
  return 'http';
}

const config: Config = {
  port: parseNumber(process.env.PORT, 3000, { positive: true }),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  minPasswordLength: parseNumber(process.env.MIN_PASSWORD_LENGTH, 8, { positive: true }),
  apiBasePath: process.env.API_BASE_PATH || '/user',
  host: process.env.HOST || 'localhost',
  protocol: parseProtocol(process.env.PROTOCOL),
  errorMessage: process.env.ERROR_MESSAGE || 'Something broke!',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  s3BucketName: process.env.S3_BUCKET_NAME || '',
  s3PublicBaseUrl: (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  /** @deprecated User posts use single-table `DYNAMODB_TABLE_NAME`; kept for backward-compatible env reads */
  dynamodbUserPostTableName: process.env.DYNAMODB_USER_POST_TABLE_NAME || process.env.DYNAMODB_TABLE_NAME || 'KikiriSocial',
  dynamodbNodeTableName: process.env.DYNAMODB_NODE_TABLE_NAME || 'node'
};

export default config;