#!/usr/bin/env bun
/**
 * Puts the pinned Vale binary in .tools/, verified against the release's own
 * checksum file. Idempotent: if the binary is already there and reports the
 * pinned version, this does nothing and costs a process start.
 */
import { chmod, mkdir } from "node:fs/promises";
import {
  CHECKSUMS_URL,
  installedVersion,
  releaseUrl,
  VALE_VERSION,
  valeAsset,
} from "./vale-release";

const TOOLS = ".tools";
const BINARY = `${TOOLS}/vale`;

async function fetchOrDie(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} → ${response.status} ${response.statusText}`);
  return response;
}

/**
 * The checksum file is one "<sha256>  <filename>" per line. Verifying is cheap
 * and it is the only thing standing between a pinned version and whatever a
 * compromised or re-cut release happens to serve.
 */
async function expectedDigest(asset: string): Promise<string> {
  const text = await (await fetchOrDie(CHECKSUMS_URL)).text();
  for (const line of text.split("\n")) {
    const [digest, name] = line.trim().split(/\s+/);
    if (name === asset && digest) return digest;
  }
  throw new Error(`${asset} is not listed in ${CHECKSUMS_URL}`);
}

const asset = valeAsset(process.platform, process.arch);

if ((await installedVersion(BINARY)) === VALE_VERSION) {
  console.log(`vale ${VALE_VERSION} already in ${TOOLS}/`);
  process.exit(0);
}

const url = releaseUrl(asset);
console.log(`fetching ${url}`);

const [archive, wanted] = await Promise.all([
  fetchOrDie(url).then((response) => response.bytes()),
  expectedDigest(asset),
]);

const found = new Bun.CryptoHasher("sha256").update(archive).digest("hex");
if (found !== wanted) {
  throw new Error(`checksum mismatch for ${asset}\n  expected ${wanted}\n  got      ${found}`);
}

await mkdir(TOOLS, { recursive: true });
const tarball = `${TOOLS}/${asset}`;
await Bun.write(tarball, archive);

// tar rather than a library: it is on every machine this project claims to run
// on, including the busybox one in CI, and the archive holds a single binary.
const untar = Bun.spawnSync(["tar", "xzf", asset, "vale"], { cwd: TOOLS });
if (!untar.success) {
  throw new Error(`tar failed: ${untar.stderr.toString().trim()}`);
}

await chmod(BINARY, 0o755);
await Bun.file(tarball).delete();

const version = await installedVersion(BINARY);
if (version !== VALE_VERSION) {
  throw new Error(`installed vale reports ${version}, expected ${VALE_VERSION}`);
}
console.log(`vale ${VALE_VERSION} installed to ${BINARY}`);
