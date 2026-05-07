/** Ensures JWT signing/verification works in Jest when .env omits JWT_SECRET_KEY. */
if (!process.env.JWT_SECRET_KEY || String(process.env.JWT_SECRET_KEY).trim() === '') {
  process.env.JWT_SECRET_KEY = 'jest_jwt_secret_key_must_be_long_enough_32';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://root:root@localhost:3306/test_db';
}

if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = 'us-east-1';
}

