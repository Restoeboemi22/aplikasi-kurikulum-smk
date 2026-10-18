const { spawnSync } = require("node:child_process");

process.env.POSTGRES_PRISMA_URL = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";

const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
