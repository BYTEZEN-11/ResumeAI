import { createConnection } from "node:net";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n❌ DATABASE_URL is not set in your environment.\n");
  console.error("  Add it to .env (or .env.local). Reference: .env.example\n");
  process.exit(1);
}

let parsed: URL;
try {
  parsed = new URL(url);
} catch {
  console.error(`\n❌ DATABASE_URL is not a valid URL: ${url}\n`);
  process.exit(1);
}

if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
  console.error(
    `\n❌ DATABASE_URL must use the postgresql:// or postgres:// protocol. Got: ${parsed.protocol}\n`
  );
  process.exit(1);
}
const host = parsed.hostname;
const port = Number.parseInt(parsed.port || "5432", 10);
const database = parsed.pathname.replace(/^\//, "");
const masked = `${parsed.protocol}//${parsed.username}${
  parsed.password ? ":****" : ""
}@${host}:${port}/${database}`;
console.log(`\n➤ Checking database TCP connection: ${masked}\n`);

const start = Date.now();
const socket = createConnection({ host, port });

const timeout = setTimeout(() => {
  socket.destroy();
  console.error(`❌ Connection timed out after 5s.\n`);
  console.error("Likely causes:");
  console.error("  1. Postgres isn't running on this host/port.");
  console.error("     → Start it (e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`)");
  console.error("  2. A firewall / VPN is blocking the connection.\n");
  process.exit(1);
}, 5_000);

socket.on("connect", () => {
  clearTimeout(timeout);
  const ms = Date.now() - start;
  console.log(`✅ TCP connect succeeded in ${ms}ms.`);
  console.log(`✅ Port ${port} is open and accepting connections.`);
  console.log(
    "\nIf signup still fails with a 503 after this, the issue is upstream —\n" +
      "  database name, credentials, or pg_hba.conf. Check the dev-server\n" +
      "  terminal for `[API Error] ... P1001/P1003` and adjust .env.\n"
  );
  socket.end();
  process.exit(0);
});

socket.on("error", (err) => {
  clearTimeout(timeout);
  console.error(`❌ ${err.message}\n`);
  console.error("Likely causes:");
  console.error("  1. Postgres isn't running on this host/port.");
  console.error("     → Start it (e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`)");
  console.error("  2. The database name doesn't exist yet.");
  console.error(`     → Connect with psql and run: CREATE DATABASE ${database};`);
  console.error("  3. The host/port in DATABASE_URL is wrong.\n");
  process.exit(1);
});
