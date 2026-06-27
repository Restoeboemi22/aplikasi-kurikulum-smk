const { spawnSync } = require("node:child_process");

const hasPrismaDbUrl = Boolean(process.env.POSTGRES_PRISMA_URL);

if (!hasPrismaDbUrl) {
  console.log("Skipping Prisma generate: POSTGRES_PRISMA_URL is not set.");
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
