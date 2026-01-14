import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Client } from "pg";

const MIGRATION_LOCK_ID = 839274628;

function computeChecksum(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function acquireLock(client: Client): Promise<void> {
  console.log("Acquiring migration lock...");
  const result = await client.query("SELECT pg_try_advisory_lock($1) as acquired", [
    MIGRATION_LOCK_ID
  ]);
  if (!result.rows[0].acquired) {
    throw new Error("Could not acquire migration lock. Another migration may be running.");
  }
  console.log("Migration lock acquired.");
}

async function releaseLock(client: Client): Promise<void> {
  await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
  console.log("Migration lock released.");
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  const columnCheck = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = '_migrations' AND column_name = 'checksum'
  `);
  if (columnCheck.rowCount === 0) {
    await client.query(`ALTER TABLE _migrations ADD COLUMN checksum TEXT`);
  }
}

export async function migrate(client: Client): Promise<void> {
  await acquireLock(client);

  try {
    await ensureMigrationsTable(client);

    const dir = path.join(process.cwd(), "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql") && !f.includes(".down."))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      const checksum = computeChecksum(sql);

      const res = await client.query(`SELECT checksum FROM _migrations WHERE name = $1`, [file]);

      if (res.rowCount && res.rowCount > 0) {
        const storedChecksum = res.rows[0].checksum;
        if (storedChecksum && storedChecksum !== checksum) {
          throw new Error(
            `Checksum mismatch for migration ${file}. ` +
              `Expected: ${storedChecksum}, Got: ${checksum}. ` +
              `Migration file may have been modified after execution.`
          );
        }
        console.log(`Skipping already run migration: ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO _migrations(name, checksum) VALUES ($1, $2)`, [
          file,
          checksum
        ]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("Migrations complete.");
  } finally {
    await releaseLock(client);
  }
}

export async function rollback(client: Client, steps: number = 1): Promise<void> {
  await acquireLock(client);

  try {
    await ensureMigrationsTable(client);

    const applied = await client.query(`SELECT name FROM _migrations ORDER BY name DESC LIMIT $1`, [
      steps
    ]);

    if (applied.rowCount === 0) {
      console.log("No migrations to rollback.");
      return;
    }

    const dir = path.join(process.cwd(), "migrations");

    for (const row of applied.rows) {
      const upFile = row.name;
      const downFile = upFile.replace(".sql", ".down.sql");
      const downPath = path.join(dir, downFile);

      if (!fs.existsSync(downPath)) {
        throw new Error(
          `Rollback file not found: ${downFile}. ` +
            `Cannot rollback migration ${upFile} without a corresponding .down.sql file.`
        );
      }

      console.log(`Rolling back migration: ${upFile}`);
      const sql = fs.readFileSync(downPath, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`DELETE FROM _migrations WHERE name = $1`, [upFile]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log(`Rolled back ${applied.rowCount} migration(s).`);
  } finally {
    await releaseLock(client);
  }
}
