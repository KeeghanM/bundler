import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log("Generating Prisma Client...");
  // Pass a dummy SQLite URL so prisma generate doesn't fail on libsql:// URLs
  execSync("npx prisma generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./dev.db" }
  });

  console.log("Running migrations...");
  execSync("node scripts/migrate.js", {
    stdio: "inherit",
    cwd: path.join(__dirname, "..")
  });
} catch (err) {
  process.exit(1);
}
