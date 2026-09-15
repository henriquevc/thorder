import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.VITE_TURSO_DB_URL,
  authToken: process.env.VITE_TURSO_DB_TOKEN
});

async function run() {
  await client.execute(`
    UPDATE users 
    SET role = replace(replace(replace(trim(role), char(9), ''), char(10), ''), char(13), ''),
        email = replace(replace(replace(trim(email), char(9), ''), char(10), ''), char(13), ''),
        company_slug = replace(replace(replace(trim(company_slug), char(9), ''), char(10), ''), char(13), '')
  `);
  const res = await client.execute("SELECT id, name, email, role, company_slug FROM users");
  console.log("CLEANED USERS:", res.rows);
}

run().catch(console.error);
