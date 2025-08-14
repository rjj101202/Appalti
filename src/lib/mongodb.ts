import { MongoClient, Db, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (!process.env.MONGODB_DB) {
  throw new Error('Please add your MongoDB database name to .env.local');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const options: MongoClientOptions = {
  retryWrites: true,
  serverSelectionTimeoutMS: 15000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function logMongo(message: string, extra?: Record<string, unknown>) {
  const safeUri = (() => {
    try {
      const u = new URL(uri);
      return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}/${dbName}`;
    } catch {
      return `mongodb://<hidden>/${dbName}`;
    }
  })();
  console.log(`[MongoDB] ${message}`, { uri: safeUri, ...(extra || {}) });
}

function attachClientEventLogging(c: MongoClient) {
  // These events help diagnose selection timeouts in production
  // @ts-ignore - event names are supported by the driver
  c.on('serverDescriptionChanged', (e: any) => {
    console.log('[MongoDB] serverDescriptionChanged', {
      address: e.address,
      newType: e.newDescription?.type,
    });
  });
  // @ts-ignore
  c.on('topologyDescriptionChanged', (e: any) => {
    console.log('[MongoDB] topologyDescriptionChanged', {
      newServers: Array.from(e.newDescription?.servers?.keys?.() || []),
      type: e.newDescription?.type,
    });
  });
  // @ts-ignore
  c.on('error', (err: any) => {
    console.error('[MongoDB] client error', err);
  });
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    logMongo('Creating new MongoClient (dev)');
    client = new MongoClient(uri, options);
    attachClientEventLogging(client);
    global._mongoClientPromise = client.connect().then((c) => {
      logMongo('Connected (dev)');
      return c;
    }).catch((err) => {
      console.error('[MongoDB] Connect error (dev)', err);
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  logMongo('Creating new MongoClient (prod)');
  client = new MongoClient(uri, options);
  attachClientEventLogging(client);
  clientPromise = client.connect().then((c) => {
    logMongo('Connected (prod)');
    return c;
  }).catch((err) => {
    console.error('[MongoDB] Connect error (prod)', err);
    throw err;
  });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function pingDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  try {
    const start = Date.now();
    const db = await getDatabase();
    await db.command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}