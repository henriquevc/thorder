import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.VITE_TURSO_DB_URL,
  authToken: process.env.VITE_TURSO_DB_TOKEN
});

async function run() {
  try {
    await client.execute("ALTER TABLE users ADD COLUMN username TEXT");
    console.log("Column username added to users.");
  } catch (e) {
    console.log("Column username already exists or error:", e.message);
  }

  // Update existing users with appropriate usernames
  await client.execute("UPDATE users SET username = 'admin' WHERE email = 'master@thorder.com' AND (username IS NULL OR username = '')");
  await client.execute("UPDATE users SET username = 'padaria' WHERE email = 'padaria@test.com' AND (username IS NULL OR username = '')");
  await client.execute("UPDATE users SET username = 'doceria' WHERE email = 'mylla.doce@thorder.com' AND (username IS NULL OR username = '')");

  // Also make sure any other user gets a username based on email or slug
  await client.execute(`
    UPDATE users 
    SET username = LOWER(REPLACE(SUBSTR(email, 1, INSTR(email, '@') - 1), '.', '')) 
    WHERE username IS NULL OR username = ''
  `);

  try {
    await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    console.log("Unique index on username created.");
  } catch (e) {
    console.log("Error creating index:", e.message);
  }

  const res = await client.execute("SELECT id, name, username, email, role, company_slug FROM users");
  console.log("USERS WITH USERNAME:", res.rows);
}

run().catch(console.error);
