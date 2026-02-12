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
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  port: parseNumber(process.env.PORT, 3000),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  minPasswordLength: parseNumber(process.env.MIN_PASSWORD_LENGTH, 8),
  apiBasePath: process.env.API_BASE_PATH || '/user',
  host: process.env.HOST || 'localhost',
  protocol: parseProtocol(process.env.PROTOCOL),
  errorMessage: process.env.ERROR_MESSAGE || 'Something broke!'
};

export default config;