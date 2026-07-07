import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

async function main() {
  const DATABASE_URL =
    process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/line_oa_platform";
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
