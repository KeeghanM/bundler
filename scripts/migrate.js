import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  // If using local SQLite, just run standard Prisma migrate
  if (!url || (!url.startsWith("libsql:") && !url.startsWith("https:"))) {
    console.log("Not using Turso, running standard Prisma migrate...");
    execSync("npx prisma migrate deploy", { 
      stdio: "inherit",
      env: process.env
    });
    return;
  }

  console.log(`Connecting to Turso: ${url}`);
  const client = createClient({ url, authToken });

  // Create migrations table if not exists
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    TEXT PRIMARY KEY NOT NULL,
        "checksum"              TEXT NOT NULL,
        "finished_at"           DATETIME,
        "migration_name"        TEXT NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        DATETIME,
        "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);

  // Get applied migrations
  const { rows } = await client.execute(`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`);
  const appliedMigrations = new Set(rows.map(r => r.migration_name));

  const migrationsDir = path.join(__dirname, "../prisma/migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory found.");
    return;
  }

  const migrations = fs.readdirSync(migrationsDir)
    .filter(dir => fs.statSync(path.join(migrationsDir, dir)).isDirectory() && !dir.startsWith("."));

  migrations.sort(); // Apply in order

  for (const migration of migrations) {
    if (!appliedMigrations.has(migration)) {
      console.log(`Applying migration: ${migration}`);
      const sqlPath = path.join(migrationsDir, migration, "migration.sql");
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, "utf-8");
        
        try {
          // Execute the migration SQL
          await client.executeMultiple(sql);

          // Record the migration
          const checksum = "custom-" + Date.now();
          const id = crypto.randomUUID();
          await client.execute({
            sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, current_timestamp, ?, 1)`,
            args: [id, checksum, migration]
          });
          console.log(`Successfully applied ${migration}`);
        } catch (err) {
          console.error(`Failed to apply migration ${migration}`);
          throw err;
        }
      }
    }
  }

  console.log("All migrations applied successfully!");
}

main().catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});
