import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !username || !password) {
      console.error('CRITICAL: Neo4j environment variables are missing!');
      throw new Error('Database connection failed: Missing credentials. Please check your environment variables.');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10000,
      maxTransactionRetryTime: 15000,
      disableLosslessIntegers: true,
    });
  }
  return driver;
}

export function getSession(): Session {
  return getDriver().session({ database: 'neo4j' });
}

export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => {
      const obj: Record<string, unknown> = {};
      (record.keys as string[]).forEach((key: string) => {
        const value = record.get(key);
        obj[key] = value?.properties ? { ...value.properties, _labels: value.labels } : value;
      });
      return obj as T;
    });
  } catch (error) {
    console.error('Neo4j query error:', error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function runSingleQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T | null> {
  const results = await runQuery<T>(cypher, params);
  return results.length > 0 ? results[0] : null;
}

export async function runWriteQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  return runQuery<T>(cypher, params);
}

export default getDriver;
