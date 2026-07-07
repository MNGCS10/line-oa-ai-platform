import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/line_oa_platform";

export const pool = mysql.createPool(DATABASE_URL);
export const db = drizzle(pool, { schema, mode: "default" });
