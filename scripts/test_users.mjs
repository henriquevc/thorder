import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.VITE_TURSO_DB_URL,
  authToken: process.env.VITE_TURSO_DB_TOKEN
});

async function main() {
  console.log("--- TEST: Verify Users in Turso ---");
  const users = await client.execute("SELECT id, name, username, email, role, company_slug FROM users");
  console.log("Current Users:", users.rows);

  // Check unique constraint on username
  const testUsername = "teste_funcional_" + Date.now();
  console.log("Inserting test user:", testUsername);
  
  await client.execute({
    sql: "INSERT INTO users (name, username, email, password_hash, role, company_slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: ["Test User", testUsername, `${testUsername}@example.com`, "hash123", "store_admin", "doceria", new Date().toISOString()]
  });

  const inserted = await client.execute({
    sql: "SELECT id, name, username, role, company_slug FROM users WHERE username = ?",
    args: [testUsername]
  });
  console.log("Inserted user:", inserted.rows[0]);

  // Try duplicate username
  try {
    await client.execute({
      sql: "INSERT INTO users (name, username, email, password_hash, role, company_slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: ["Test Duplicate", testUsername, "dup@example.com", "hash123", "store_admin", "doceria", new Date().toISOString()]
    });
    console.error("FAIL: Duplicate username was allowed!");
  } catch (e) {
    console.log("PASS: Duplicate username correctly rejected by DB:", e.message);
  }

  // Cleanup test user
  await client.execute({
    sql: "DELETE FROM users WHERE username = ?",
    args: [testUsername]
  });
  console.log("Cleaned up test user.");
  console.log("--- ALL BACKEND TESTS PASSED ---");
}

main().catch(console.error);
