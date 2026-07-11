import { spawnSync } from 'node:child_process';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BINARY_SAMPLE_SIZE = 1_024;
const BINARY_EXTENSIONS = new Set([
  'crx',
  'deb',
  'dex',
  'dey',
  'elf',
  'o',
  'a',
  'so',
  'macho',
  'iso',
  'class',
  'jar',
  'bundle',
  'dylib',
  'lib',
  'msi',
  'dll',
  'drv',
  'efi',
  'exe',
  'ocx',
  'pyc',
  'pyo',
  'par',
  'rpm',
  'wasm',
  'whl',
]);

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const ref = process.env.TRACKED_EXECUTABLES_REF || process.env.GITHUB_SHA || 'HEAD';

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: packageRoot,
    maxBuffer: 512 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw new Error(`Falha ao executar git ${args.join(' ')}: ${result.error.message}`);
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result;
}

function hasPrefix(bytes, prefix) {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function detectedBinaryMagic(bytes) {
  const signatures = [
    ['wasm', [0x00, 0x61, 0x73, 0x6d]],
    ['elf', [0x7f, 0x45, 0x4c, 0x46]],
    ['pe', [0x4d, 0x5a]],
    ['dex', [0x64, 0x65, 0x78, 0x0a]],
    ['crx', [0x43, 0x72, 0x32, 0x34]],
    ['rpm', [0xed, 0xab, 0xee, 0xdb]],
    ['java-class-or-mach-fat', [0xca, 0xfe, 0xba, 0xbe]],
    ['mach-o', [0xfe, 0xed, 0xfa, 0xce]],
    ['mach-o', [0xfe, 0xed, 0xfa, 0xcf]],
    ['mach-o', [0xce, 0xfa, 0xed, 0xfe]],
    ['mach-o', [0xcf, 0xfa, 0xed, 0xfe]],
    ['mach-fat', [0xbe, 0xba, 0xfe, 0xca]],
    ['archive', [0x21, 0x3c, 0x61, 0x72, 0x63, 0x68, 0x3e, 0x0a]],
  ];
  return signatures.find(([, signature]) => hasPrefix(bytes, signature))?.[0] ?? null;
}

function isText(bytes) {
  for (const byte of bytes) {
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) return false;
  }
  return true;
}

const treeResult = runGit(['ls-tree', '-r', '-z', '--full-tree', ref], { encoding: 'utf8' });
const blobs = treeResult.stdout
  .split('\0')
  .filter(Boolean)
  .map((record) => {
    const separator = record.indexOf('\t');
    const [mode, type, objectId] = record.slice(0, separator).split(' ');
    return { mode, type, objectId, path: record.slice(separator + 1) };
  })
  .filter((entry) => entry.type === 'blob' && entry.mode !== '120000');

const batchResult = runGit(['cat-file', '--batch'], {
  input: `${blobs.map((entry) => entry.objectId).join('\n')}\n`,
});
const output = batchResult.stdout;
const trackedBinaries = [];
let cursor = 0;

for (const blob of blobs) {
  const headerEnd = output.indexOf(0x0a, cursor);
  if (headerEnd < 0) throw new Error(`Resposta incompleta de git cat-file para ${blob.path}.`);
  const [objectId, type, sizeText] = output.subarray(cursor, headerEnd).toString('utf8').split(' ');
  const size = Number(sizeText);
  if (objectId !== blob.objectId || type !== 'blob' || !Number.isSafeInteger(size)) {
    throw new Error(`Cabeçalho inesperado de git cat-file para ${blob.path}.`);
  }

  const contentStart = headerEnd + 1;
  const contentEnd = contentStart + size;
  const sample = output.subarray(contentStart, Math.min(contentStart + BINARY_SAMPLE_SIZE, contentEnd));
  cursor = contentEnd + 1;

  const magic = detectedBinaryMagic(sample);
  const extension = extname(blob.path).slice(1).toLowerCase();
  if (magic || (!isText(sample) && BINARY_EXTENSIONS.has(extension))) {
    trackedBinaries.push({ path: blob.path, reason: magic ? `magic:${magic}` : `extensão:.${extension}` });
  }
}

if (trackedBinaries.length > 0) {
  console.error(`Artefatos binários executáveis detectados no commit ${ref}:`);
  for (const file of trackedBinaries) console.error(`- ${file.path} (${file.reason})`);
  process.exit(1);
}

console.log(`Nenhum artefato binário executável foi detectado no commit ${ref}.`);
