import fs from "fs";
import path from "path";
import { Client } from "pg";

export async function migrate(client: Client) {
  await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

  const dir = path.join(process.cwd(), "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const res = await client.query(`SELECT 1 FROM migrations WHERE name = $1`, [file]);
    if (res.rowCount && res.rowCount > 0) {
      console.log(`Skipping already run migration: ${file}`);
      continue;
    }

    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await client.query(sql);
    await client.query(`INSERT INTO migrations(name) VALUES ($1)`, [file]);
  }

  console.log("Migrations complete.");
}
