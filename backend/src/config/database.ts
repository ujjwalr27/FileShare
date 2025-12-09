import { Pool } from 'pg';
import config from './index';

const pool = new Pool(config.database);

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.env === 'development') {
    console.log('Executed query:', { text, duration, rows: res.rowCount });
  }

  return res;
};

export const getClient = async () => {
  const client: any = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args: any[]) => {
    client.lastQuery = args;
    return originalQuery.apply(client, args);
  };

  client.release = () => {
    // Clear timeout
    clearTimeout(timeout);
    // Set the methods back to their old un-monkey-patched version
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };

  return client;
};

export default pool;
