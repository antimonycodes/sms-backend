import { Pool, Client, QueryResult } from "pg";
import dotenv from "dotenv";

dotenv.config();

const devConfig: any = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const prodConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
};

const pool = new Pool(
  process.env.NODE_ENV === "production" ? prodConfig : devConfig
);

pool.on("connect", () => {
  console.log(
    "Connected to",
    process.env.NODE_ENV === "production" ? "Production DB" : "Development DB"
  );
});

pool.on("error", (err) => {
  console.error("Database connection error:", err);
});

export default pool;

export const query = (text: string, params?: any[]): Promise<QueryResult> =>
  pool.query(text, params);

export const withTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
