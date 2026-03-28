import type { ServiceType } from "@prisma/client";

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields?: string[];
}

export interface MongoOperation {
  database: string;
  collection: string;
  operation: "find" | "insertOne" | "insertMany" | "updateOne" | "updateMany" | "deleteOne" | "deleteMany" | "aggregate" | "countDocuments";
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  documents?: Record<string, unknown>[];
  update?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
  options?: Record<string, unknown>;
}

export interface DbDriver {
  query(
    config: Record<string, string>,
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult>;
  testConnection(config: Record<string, string>): Promise<void>;
}

export interface MongoDriver {
  execute(
    config: Record<string, string>,
    op: MongoOperation
  ): Promise<QueryResult>;
  testConnection(config: Record<string, string>): Promise<void>;
}

const CONNECT_TIMEOUT = 5_000;
const QUERY_TIMEOUT = 30_000;

// ---------- PostgreSQL ----------

const postgresDriver: DbDriver = {
  async query(config, sql, params) {
    const { default: pg } = await import("pg");
    const client = new pg.Client({
      host: config.host,
      port: Number(config.port) || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionTimeoutMillis: CONNECT_TIMEOUT,
      statement_timeout: QUERY_TIMEOUT,
    });
    try {
      await client.connect();
      const result = await client.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
        fields: result.fields?.map((f) => f.name),
      };
    } finally {
      await client.end().catch(() => {});
    }
  },

  async testConnection(config) {
    await postgresDriver.query(config, "SELECT 1");
  },
};

// ---------- MySQL ----------

const mysqlDriver: DbDriver = {
  async query(config, sql, params) {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection({
      host: config.host,
      port: Number(config.port) || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      connectTimeout: CONNECT_TIMEOUT,
    });
    try {
      const [rows, fields] = await conn.query(sql, params || []);
      const rowArray = Array.isArray(rows) ? rows : [];
      return {
        rows: rowArray as Record<string, unknown>[],
        rowCount: rowArray.length,
        fields: fields?.map((f) => f.name),
      };
    } finally {
      await conn.end().catch(() => {});
    }
  },

  async testConnection(config) {
    await mysqlDriver.query(config, "SELECT 1");
  },
};

// ---------- MongoDB ----------

const mongoDriver: MongoDriver = {
  async execute(config, op) {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(config.connectionString, {
      connectTimeoutMS: CONNECT_TIMEOUT,
      socketTimeoutMS: QUERY_TIMEOUT,
      serverSelectionTimeoutMS: CONNECT_TIMEOUT,
    });
    try {
      await client.connect();
      const db = client.db(op.database);
      const coll = db.collection(op.collection);

      let result: Record<string, unknown>[];

      switch (op.operation) {
        case "find":
          result = await coll.find(op.filter || {}, op.options).toArray() as Record<string, unknown>[];
          break;
        case "insertOne": {
          const ins = await coll.insertOne(op.document || {});
          result = [{ insertedId: ins.insertedId }];
          break;
        }
        case "insertMany": {
          const insM = await coll.insertMany(op.documents || []);
          result = [{ insertedCount: insM.insertedCount, insertedIds: insM.insertedIds }];
          break;
        }
        case "updateOne": {
          const upd = await coll.updateOne(op.filter || {}, op.update || {});
          result = [{ matchedCount: upd.matchedCount, modifiedCount: upd.modifiedCount }];
          break;
        }
        case "updateMany": {
          const updM = await coll.updateMany(op.filter || {}, op.update || {});
          result = [{ matchedCount: updM.matchedCount, modifiedCount: updM.modifiedCount }];
          break;
        }
        case "deleteOne": {
          const del = await coll.deleteOne(op.filter || {});
          result = [{ deletedCount: del.deletedCount }];
          break;
        }
        case "deleteMany": {
          const delM = await coll.deleteMany(op.filter || {});
          result = [{ deletedCount: delM.deletedCount }];
          break;
        }
        case "aggregate":
          result = await coll.aggregate(op.pipeline || []).toArray() as Record<string, unknown>[];
          break;
        case "countDocuments": {
          const count = await coll.countDocuments(op.filter || {});
          result = [{ count }];
          break;
        }
        default:
          throw new Error(`Unsupported MongoDB operation: ${op.operation}`);
      }

      return { rows: result, rowCount: result.length };
    } finally {
      await client.close().catch(() => {});
    }
  },

  async testConnection(config) {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(config.connectionString, {
      connectTimeoutMS: CONNECT_TIMEOUT,
      serverSelectionTimeoutMS: CONNECT_TIMEOUT,
    });
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
    } finally {
      await client.close().catch(() => {});
    }
  },
};

// ---------- Factory ----------

export function getDbDriver(serviceType: ServiceType): DbDriver {
  switch (serviceType) {
    case "postgresql":
      return postgresDriver;
    case "mysql":
      return mysqlDriver;
    default:
      throw new Error(`No SQL driver for service type: ${serviceType}`);
  }
}

export function getMongoDriver(): MongoDriver {
  return mongoDriver;
}

export function isMongoType(serviceType: ServiceType): boolean {
  return serviceType === "mongodb";
}
