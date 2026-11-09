import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "mobile");
const archive = resolve(root, "archive");
const output = resolve(root, "www");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
await mkdir(resolve(output, "data"), { recursive: true });
await cp(resolve(archive, "2026.json"), resolve(output, "data", "2026.json"));
console.log("Redline Grid mobile assets and 2026 season archive prepared in ./www");
