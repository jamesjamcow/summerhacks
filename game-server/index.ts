import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { arenaServer } = await import("./server");
  const port = Number.parseInt(process.env.COLYSEUS_PORT || "2567", 10);
  await arenaServer.listen(Number.isFinite(port) ? port : 2567);
}

main().catch((error: unknown) => {
  console.error("Could not start the Colyseus arena service", error);
  process.exitCode = 1;
});
