import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_SIZE = 1_275_365;
const EXPECTED_SHA256 = '31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c';
const source = fileURLToPath(import.meta.resolve('@fusionstrings/swiss-eph/wasm-wasi'));
const target = fileURLToPath(new URL('../functions/api/_shared/swiss_eph.wasm', import.meta.url));
const temporaryTarget = `${target}.${process.pid}.${randomUUID()}.tmp`;
const bytes = await readFile(source);
const sha256 = createHash('sha256').update(bytes).digest('hex');

if (bytes.byteLength !== EXPECTED_SIZE || sha256 !== EXPECTED_SHA256) {
  throw new Error(
    `Artefato Swiss Ephemeris inesperado: tamanho=${bytes.byteLength}, sha256=${sha256}. ` +
      `Esperado: tamanho=${EXPECTED_SIZE}, sha256=${EXPECTED_SHA256}.`,
  );
}

await mkdir(dirname(target), { recursive: true });
try {
  const targetStats = await lstat(target);
  if (targetStats.isSymbolicLink()) {
    throw new Error(`O destino Swiss Ephemeris não pode ser um link simbólico: ${target}`);
  }
  await rm(target, { force: true });
} catch (error) {
  if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
}

try {
  await writeFile(temporaryTarget, bytes, { flag: 'wx', mode: 0o600 });
  const temporaryBytes = await readFile(temporaryTarget);
  const temporarySha256 = createHash('sha256').update(temporaryBytes).digest('hex');
  if (temporaryBytes.byteLength !== EXPECTED_SIZE || temporarySha256 !== EXPECTED_SHA256) {
    throw new Error('A cópia temporária do Swiss Ephemeris divergiu dos bytes verificados.');
  }
  await rename(temporaryTarget, target);
} finally {
  await rm(temporaryTarget, { force: true });
}

const materializedBytes = await readFile(target);
const materializedSha256 = createHash('sha256').update(materializedBytes).digest('hex');
if (materializedBytes.byteLength !== EXPECTED_SIZE || materializedSha256 !== EXPECTED_SHA256) {
  await rm(target, { force: true });
  throw new Error('O Swiss Ephemeris materializado falhou na verificação final.');
}

console.log(`Swiss Ephemeris WASM preparado e verificado (${EXPECTED_SHA256}).`);
