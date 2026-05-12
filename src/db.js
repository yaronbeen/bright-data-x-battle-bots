/**
 * MongoDB integration for BattleBots H2H.
 *
 * Provides prediction caching with graceful degradation:
 * if MongoDB is unavailable, the app works normally (just slower).
 *
 * Optimized for serverless (Cloudflare Workers / short-lived Node):
 *   - Single-connection pool
 *   - Fast timeouts (don't block the pipeline)
 *   - Module-level client caching for warm starts
 */

import { MongoClient } from 'mongodb';

const DB_NAME = 'battlebots';
const PREDICTIONS_COLLECTION = 'predictions';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @type {MongoClient | null} */
let cachedClient = null;

/**
 * Get a connected MongoClient. Reuses across warm invocations.
 * Returns null if no URI configured or connection fails.
 */
export async function getClient(uri) {
  if (!uri) return null;
  if (cachedClient) return cachedClient;

  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    await client.connect();
    cachedClient = client;
    return client;
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    return null;
  }
}

/**
 * Build a deterministic cache key for a matchup.
 * "A vs B" and "B vs A" produce the same key.
 */
export function matchupKey(botAId, botBId) {
  return [botAId, botBId].sort().join('::');
}

/**
 * Look up a cached prediction. Returns null if miss or expired.
 */
export async function getCachedPrediction(uri, botAId, botBId) {
  const client = await getClient(uri);
  if (!client) return null;

  try {
    const db = client.db(DB_NAME);
    const key = matchupKey(botAId, botBId);
    const doc = await db.collection(PREDICTIONS_COLLECTION).findOne(
      { key, expiresAt: { $gt: new Date() } },
      { sort: { createdAt: -1 } }
    );
    return doc?.result || null;
  } catch (err) {
    console.error('[db] Cache read failed:', err.message);
    return null;
  }
}

/**
 * Store a prediction result in the cache.
 */
export async function cachePrediction(uri, botAId, botBId, result) {
  const client = await getClient(uri);
  if (!client) return;

  try {
    const db = client.db(DB_NAME);
    const now = new Date();
    await db.collection(PREDICTIONS_COLLECTION).insertOne({
      key: matchupKey(botAId, botBId),
      botAId,
      botBId,
      result,
      createdAt: now,
      expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    });
  } catch (err) {
    console.error('[db] Cache write failed:', err.message);
  }
}

/**
 * Get recent matchup history (for trends / popular matchups).
 */
export async function getMatchupHistory(uri, { limit = 20 } = {}) {
  const client = await getClient(uri);
  if (!client) return [];

  try {
    const db = client.db(DB_NAME);
    return await db.collection(PREDICTIONS_COLLECTION)
      .find({}, { projection: { key: 1, botAId: 1, botBId: 1, 'result.verdict': 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.error('[db] History read failed:', err.message);
    return [];
  }
}

/**
 * Get most popular matchups (aggregation).
 */
export async function getPopularMatchups(uri, { limit = 10 } = {}) {
  const client = await getClient(uri);
  if (!client) return [];

  try {
    const db = client.db(DB_NAME);
    return await db.collection(PREDICTIONS_COLLECTION).aggregate([
      { $group: { _id: '$key', count: { $sum: 1 }, botAId: { $first: '$botAId' }, botBId: { $first: '$botBId' }, lastResult: { $last: '$result.verdict' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]).toArray();
  } catch (err) {
    console.error('[db] Popular matchups failed:', err.message);
    return [];
  }
}

/**
 * Ensure indexes exist (call once on startup / first request).
 */
export async function ensureIndexes(uri) {
  const client = await getClient(uri);
  if (!client) return;

  try {
    const db = client.db(DB_NAME);
    const col = db.collection(PREDICTIONS_COLLECTION);
    await col.createIndex({ key: 1, expiresAt: 1 });
    await col.createIndex({ createdAt: -1 });
    // TTL index: MongoDB auto-deletes expired docs
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch (err) {
    console.error('[db] Index creation failed:', err.message);
  }
}
