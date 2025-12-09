import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || 'localhost',

  database: process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'fileshare',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    useSupabaseStorage: process.env.USE_SUPABASE_STORAGE === 'true',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'video/mp4',
      'video/mpeg',
      'audio/mpeg',
      'audio/wav',
    ],
  },

  quota: {
    defaultUserQuota: parseInt(process.env.DEFAULT_USER_QUOTA || '5368709120', 10), // 5GB
    adminUserQuota: parseInt(process.env.ADMIN_USER_QUOTA || '53687091200', 10), // 50GB
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },

  ml: {
    serviceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001',
    enabled: process.env.ML_SERVICE_ENABLED !== 'false',
    url: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001',
  },
};

export default config;
