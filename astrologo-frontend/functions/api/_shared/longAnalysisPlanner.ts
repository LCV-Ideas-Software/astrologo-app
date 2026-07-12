export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type AnalysisDomain =
  | 'core'
  | 'legacy'
  | 'tropical'
  | 'astronomical'
  | 'foundations'
  | 'natal'
  | 'transit'
  | 'synastry'
  | 'locality';

export interface MonolithicPromptSnapshot {
  readonly bytes: Uint8Array;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface MonolithicPromptPayloadInput {
  readonly payloadId: string;
  readonly serialized: string;
}

export interface ExtractedMonolithicPromptPayload extends MonolithicPromptPayloadInput {
  readonly placeholder: string;
  readonly sha256: string;
}

export interface ExtractedMonolithicPrompt {
  readonly snapshot: MonolithicPromptSnapshot;
  readonly fixedInstructionPrefix: string;
  readonly payloads: readonly ExtractedMonolithicPromptPayload[];
}

export interface LongAnalysisSourceBundle {
  readonly legacy: {
    readonly query: unknown;
    readonly tropical: unknown;
    readonly astronomical: unknown;
    readonly globals: unknown;
  };
  readonly canonicalTatwa?: unknown;
  readonly canonicalV2?: unknown;
  readonly natal?: unknown;
  readonly transit?: unknown;
  readonly synastry?: unknown;
  readonly locality?: unknown;
}

export type SemanticAnalysisUnitKind =
  | 'document'
  | 'json-document-part'
  | 'locality-metadata'
  | 'locality-line'
  | 'locality-line-window';

export interface LocalityLineWindow {
  readonly segmentIndex: number;
  readonly startIndex: number;
  readonly endIndexExclusive: number;
  readonly segmentCoordinateCount: number;
}

export interface JsonDocumentPart {
  readonly ordinal: number;
  readonly total: number;
}

export interface SemanticAnalysisUnit {
  readonly unitId: string;
  readonly evidenceId: string;
  readonly sourceEvidenceId: string;
  readonly sourcePath: string;
  readonly domain: AnalysisDomain;
  readonly kind: SemanticAnalysisUnitKind;
  readonly sourceHash: string;
  readonly payloadJson: string;
  readonly parentUnitId?: string;
  readonly window?: LocalityLineWindow;
  readonly documentPart?: JsonDocumentPart;
}

export interface AnalysisManifest {
  readonly schemaId: 'urn:astrologo:ai-analysis-manifest';
  readonly schemaVersion: '1.0.0';
  readonly promptVersion: string;
  readonly monolithicPromptHash: string;
  readonly rootInputHash: string;
  readonly evidenceIds: readonly string[];
  readonly sourceHashes: readonly string[];
}

export interface PackedAnalysisFragment {
  readonly fragmentId: string;
  readonly ordinal: number;
  readonly domain: AnalysisDomain;
  readonly inputHash: string;
  readonly inputText: string;
  readonly inputTokens: number;
  readonly coveredEvidenceIds: readonly string[];
  readonly units: readonly SemanticAnalysisUnit[];
}

export interface PackedCoverageManifest {
  readonly rootInputHash: string;
  readonly evidenceIds: readonly string[];
  readonly sourceEvidenceIds: readonly string[];
}

export interface PackedAnalysisPlan {
  readonly manifest: AnalysisManifest;
  readonly fragments: readonly PackedAnalysisFragment[];
  readonly coverage: PackedCoverageManifest;
}

export interface PackAnalysisUnitsOptions {
  readonly manifest: AnalysisManifest;
  readonly units: readonly SemanticAnalysisUnit[];
  readonly fixedInstructionPrefix: string;
  readonly maxInputTokens: number;
  readonly countTokens: (input: string) => Promise<number>;
}

export class TokenCountUnavailableError extends Error {
  override readonly name = 'TokenCountUnavailableError';

  constructor(message = 'A contagem canônica de tokens não está disponível.', options?: ErrorOptions) {
    super(message, options);
  }
}

export class OversizedAnalysisUnitError extends Error {
  override readonly name = 'OversizedAnalysisUnitError';

  constructor(readonly unitId: string) {
    super(`A unidade semântica ${unitId} não cabe isoladamente no orçamento de tokens.`);
  }
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const PROMPT_VERSION_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const canonicalizeJson = (value: unknown, context: string, inArray = false): JsonValue | undefined => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${context} contém um número não finito.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return inArray ? null : undefined;
  }
  if (typeof value === 'bigint') throw new TypeError(`${context} contém BigInt, que não pertence a JSON.`);
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalizeJson(item, `${context}/${index}`, true) ?? null);
  }
  if (!isRecord(value)) throw new TypeError(`${context} não é serializável como JSON canônico.`);

  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) {
    const projected = canonicalizeJson(value[key], `${context}/${key}`);
    if (projected !== undefined) result[key] = projected;
  }
  return result;
};

export const canonicalJsonStringify = (value: unknown): string => {
  const canonical = canonicalizeJson(value, '$');
  if (canonical === undefined) throw new TypeError('A raiz da fonte não pode ser omitida por JSON.stringify.');
  return JSON.stringify(canonical);
};

const sha256Bytes = async (bytes: Uint8Array): Promise<string> => {
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', digestInput.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const sha256Text = async (value: string): Promise<string> => sha256Bytes(new TextEncoder().encode(value));

export const captureMonolithicPrompt = async (prompt: string): Promise<MonolithicPromptSnapshot> => {
  if (typeof prompt !== 'string' || prompt.length === 0)
    throw new TypeError('O prompt monolítico deve ser texto não vazio.');
  const bytes = new TextEncoder().encode(prompt);
  return { bytes, byteLength: bytes.byteLength, sha256: await sha256Bytes(bytes) };
};

export const restoreMonolithicPrompt = async (snapshot: MonolithicPromptSnapshot): Promise<string> => {
  if (
    !(snapshot.bytes instanceof Uint8Array) ||
    snapshot.bytes.byteLength !== snapshot.byteLength ||
    !SHA256_PATTERN.test(snapshot.sha256)
  ) {
    throw new TypeError('Snapshot do prompt monolítico inválido.');
  }
  const actualHash = await sha256Bytes(snapshot.bytes);
  if (actualHash !== snapshot.sha256)
    throw new TypeError('O hash do prompt monolítico divergiu dos bytes preservados.');
  return new TextDecoder('utf-8', { fatal: true }).decode(snapshot.bytes);
};

export const extractMonolithicPromptPayloads = async (
  prompt: string,
  payloadInputs: readonly MonolithicPromptPayloadInput[],
): Promise<ExtractedMonolithicPrompt> => {
  if (!Array.isArray(payloadInputs) || payloadInputs.length === 0) {
    throw new TypeError('Ao menos um payload serializado deve ser extraído do prompt monolítico.');
  }
  const snapshot = await captureMonolithicPrompt(prompt);
  const payloads: ExtractedMonolithicPromptPayload[] = [];
  const seenIds = new Set<string>();
  let fixedInstructionPrefix = prompt;

  for (const input of payloadInputs) {
    if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(input.payloadId) || seenIds.has(input.payloadId)) {
      throw new TypeError(`Identificador de payload inválido ou duplicado: ${input.payloadId}.`);
    }
    if (typeof input.serialized !== 'string' || input.serialized.length === 0) {
      throw new TypeError(`O payload ${input.payloadId} deve ser texto serializado não vazio.`);
    }
    const firstIndex = fixedInstructionPrefix.indexOf(input.serialized);
    const secondIndex =
      firstIndex < 0 ? -1 : fixedInstructionPrefix.indexOf(input.serialized, firstIndex + input.serialized.length);
    if (firstIndex < 0) throw new TypeError(`O payload ${input.payloadId} não foi encontrado integralmente no prompt.`);
    if (secondIndex >= 0) {
      throw new TypeError(`O payload ${input.payloadId} é ambíguo porque aparece mais de uma vez no prompt.`);
    }
    const hash = await sha256Text(input.serialized);
    const placeholder = `⟦ASTROLOGO_PAYLOAD:${input.payloadId}:${hash}⟧`;
    if (fixedInstructionPrefix.includes(placeholder)) {
      throw new TypeError(`O placeholder de ${input.payloadId} já existe no prompt original.`);
    }
    fixedInstructionPrefix =
      fixedInstructionPrefix.slice(0, firstIndex) +
      placeholder +
      fixedInstructionPrefix.slice(firstIndex + input.serialized.length);
    payloads.push({ payloadId: input.payloadId, serialized: input.serialized, placeholder, sha256: hash });
    seenIds.add(input.payloadId);
  }

  return { snapshot, fixedInstructionPrefix, payloads };
};

export const restoreMonolithicPromptPayloads = async (extracted: ExtractedMonolithicPrompt): Promise<string> => {
  let restored = extracted.fixedInstructionPrefix;
  for (const payload of [...extracted.payloads].reverse()) {
    if ((await sha256Text(payload.serialized)) !== payload.sha256) {
      throw new TypeError(`O hash do payload ${payload.payloadId} divergiu de seu conteúdo preservado.`);
    }
    const firstIndex = restored.indexOf(payload.placeholder);
    const secondIndex =
      firstIndex < 0 ? -1 : restored.indexOf(payload.placeholder, firstIndex + payload.placeholder.length);
    if (firstIndex < 0 || secondIndex >= 0) {
      throw new TypeError(`O placeholder de ${payload.payloadId} está ausente ou duplicado.`);
    }
    restored =
      restored.slice(0, firstIndex) + payload.serialized + restored.slice(firstIndex + payload.placeholder.length);
  }

  const canonicalOriginal = await restoreMonolithicPrompt(extracted.snapshot);
  const restoredBytes = new TextEncoder().encode(restored);
  const restoredHash = await sha256Bytes(restoredBytes);
  if (
    restoredHash !== extracted.snapshot.sha256 ||
    restoredBytes.byteLength !== extracted.snapshot.byteLength ||
    restored !== canonicalOriginal
  ) {
    throw new TypeError('A restauração dos payloads não recompôs byte a byte o prompt monolítico.');
  }
  return restored;
};

const makeUnit = async (
  unitId: string,
  sourcePath: string,
  domain: AnalysisDomain,
  kind: SemanticAnalysisUnitKind,
  payload: unknown,
): Promise<SemanticAnalysisUnit> => {
  const payloadJson = canonicalJsonStringify(payload);
  return {
    unitId,
    evidenceId: unitId,
    sourceEvidenceId: unitId,
    sourcePath,
    domain,
    kind,
    payloadJson,
    sourceHash: await sha256Text(payloadJson),
  };
};

const optionalUnit = async (
  value: unknown,
  unitId: string,
  sourcePath: string,
  domain: AnalysisDomain,
): Promise<SemanticAnalysisUnit | null> =>
  value === undefined || value === null ? null : makeUnit(unitId, sourcePath, domain, 'document', value);

const safeLineRecordId = (line: unknown, index: number): string => {
  if (isRecord(line) && typeof line.recordId === 'string' && /^[A-Za-z0-9._:-]{1,128}$/u.test(line.recordId)) {
    return line.recordId;
  }
  return `index-${String(index).padStart(4, '0')}`;
};

export const extractSemanticAnalysisUnits = async (
  sources: LongAnalysisSourceBundle,
): Promise<readonly SemanticAnalysisUnit[]> => {
  if (!isRecord(sources) || !isRecord(sources.legacy))
    throw new TypeError('As fontes legadas completas são obrigatórias.');
  const units: SemanticAnalysisUnit[] = [
    await makeUnit('legacy.query', '/legacy/query', 'core', 'document', sources.legacy.query),
    await makeUnit('legacy.tropical', '/legacy/tropical', 'core', 'document', sources.legacy.tropical),
    await makeUnit('legacy.astronomical', '/legacy/astronomical', 'core', 'document', sources.legacy.astronomical),
    await makeUnit('legacy.globals', '/legacy/globals', 'core', 'document', sources.legacy.globals),
  ];

  for (const pending of [
    await optionalUnit(sources.canonicalTatwa, 'canonical.tatwa', '/canonicalTatwa', 'core'),
    await optionalUnit(sources.canonicalV2, 'canonical.v2', '/canonicalV2', 'core'),
    await optionalUnit(sources.natal, 'advanced.natal', '/natal', 'core'),
    await optionalUnit(sources.transit, 'advanced.transit', '/transit', 'transit'),
    await optionalUnit(sources.synastry, 'advanced.synastry', '/synastry', 'synastry'),
  ]) {
    if (pending) units.push(pending);
  }

  if (sources.locality !== undefined && sources.locality !== null) {
    if (!isRecord(sources.locality) || !Array.isArray(sources.locality.lines)) {
      throw new TypeError('A fonte de localidade deve conter o array completo de linhas.');
    }
    const { lines, ...metadata } = sources.locality;
    units.push(await makeUnit('advanced.locality.metadata', '/locality', 'locality', 'locality-metadata', metadata));
    const seen = new Set<string>();
    for (const [index, line] of lines.entries()) {
      const recordId = safeLineRecordId(line, index);
      const unitId = `advanced.locality.line.${recordId}`;
      if (seen.has(unitId)) throw new TypeError(`Linha cartográfica duplicada: ${recordId}.`);
      seen.add(unitId);
      units.push(await makeUnit(unitId, `/locality/lines/${index}`, 'locality', 'locality-line', line));
    }
  }

  const evidenceIds = units.map(({ evidenceId }) => evidenceId);
  if (new Set(evidenceIds).size !== evidenceIds.length) throw new TypeError('As unidades semânticas não são unívocas.');
  return units;
};

export const restoreLocalityFromUnits = (units: readonly SemanticAnalysisUnit[]): unknown => {
  const metadata = units.find(({ kind }) => kind === 'locality-metadata');
  if (!metadata) return undefined;
  const parsedMetadata: unknown = JSON.parse(metadata.payloadJson);
  if (!isRecord(parsedMetadata)) throw new TypeError('Metadados de localidade inválidos.');
  const lines = units
    .filter(({ kind }) => kind === 'locality-line')
    .map(({ payloadJson }) => JSON.parse(payloadJson) as unknown);
  return { ...parsedMetadata, lines };
};

export const restoreLocalityLineFromWindows = async (
  parent: SemanticAnalysisUnit,
  windows: readonly SemanticAnalysisUnit[],
): Promise<unknown> => {
  if (parent.kind !== 'locality-line') throw new TypeError('A unidade pai deve ser uma linha cartográfica integral.');
  const original = parseLocalityLine(parent);
  const originalGeometry = original.geometry as Record<string, unknown>;
  const originalSegments = originalGeometry.coordinates as unknown[];
  const rebuiltSegments: unknown[][] = originalSegments.map((segment, segmentIndex) => {
    if (!Array.isArray(segment)) throw new TypeError(`Segmento ${segmentIndex} inválido na linha cartográfica pai.`);
    return [];
  });
  const ordered = [...windows].sort((left, right) => {
    const leftWindow = left.window;
    const rightWindow = right.window;
    if (!leftWindow || !rightWindow) return 0;
    return leftWindow.segmentIndex - rightWindow.segmentIndex || leftWindow.startIndex - rightWindow.startIndex;
  });
  const seenEvidenceIds = new Set<string>();
  const seenHashes = new Set<string>();

  for (const unit of ordered) {
    const window = unit.window;
    if (
      unit.kind !== 'locality-line-window' ||
      unit.parentUnitId !== parent.unitId ||
      unit.sourceEvidenceId !== parent.sourceEvidenceId ||
      !window
    ) {
      throw new TypeError('Uma janela não pertence integralmente à linha cartográfica pai.');
    }
    if (seenEvidenceIds.has(unit.evidenceId) || seenHashes.has(unit.sourceHash)) {
      throw new TypeError('As janelas cartográficas contêm identificador ou hash duplicado.');
    }
    if ((await sha256Text(unit.payloadJson)) !== unit.sourceHash) {
      throw new TypeError(`O hash da janela ${unit.evidenceId} não corresponde ao payload.`);
    }
    const originalSegment = originalSegments[window.segmentIndex];
    const rebuiltSegment = rebuiltSegments[window.segmentIndex];
    if (
      !Array.isArray(originalSegment) ||
      !rebuiltSegment ||
      window.segmentCoordinateCount !== originalSegment.length ||
      window.startIndex !== rebuiltSegment.length ||
      window.endIndexExclusive <= window.startIndex ||
      window.endIndexExclusive > originalSegment.length
    ) {
      throw new TypeError(`A cobertura da janela ${unit.evidenceId} não é contígua.`);
    }
    const payload: unknown = JSON.parse(unit.payloadJson);
    if (!isRecord(payload) || !isRecord(payload.geometry) || !Array.isArray(payload.geometry.coordinates)) {
      throw new TypeError(`Payload inválido na janela ${unit.evidenceId}.`);
    }
    const slices = payload.geometry.coordinates;
    const slice = slices[0];
    if (!Array.isArray(slice) || slices.length !== 1 || slice.length !== window.endIndexExclusive - window.startIndex) {
      throw new TypeError(`A geometria da janela ${unit.evidenceId} não coincide com seus índices.`);
    }
    rebuiltSegment.push(...slice);
    seenEvidenceIds.add(unit.evidenceId);
    seenHashes.add(unit.sourceHash);
  }

  for (const [segmentIndex, originalSegment] of originalSegments.entries()) {
    if (!Array.isArray(originalSegment) || rebuiltSegments[segmentIndex]?.length !== originalSegment.length) {
      throw new TypeError(`As janelas não cobrem integralmente o segmento ${segmentIndex}.`);
    }
  }
  return { ...original, geometry: { ...originalGeometry, coordinates: rebuiltSegments } };
};

type JsonPath = readonly (string | number)[];

type JsonDocumentAtom =
  | { readonly kind: 'container'; readonly path: JsonPath; readonly containerType: 'object' | 'array' }
  | {
      readonly kind: 'object-entries';
      readonly path: JsonPath;
      readonly entries: readonly { readonly key: string; readonly value: JsonValue }[];
    }
  | {
      readonly kind: 'array-range';
      readonly path: JsonPath;
      readonly startIndex: number;
      readonly items: readonly JsonValue[];
    }
  | { readonly kind: 'value'; readonly path: JsonPath; readonly value: JsonPrimitive }
  | {
      readonly kind: 'string-window';
      readonly path: JsonPath;
      readonly startIndex: number;
      readonly endIndexExclusive: number;
      readonly codePointCount: number;
      readonly value: string;
    };

const utf8Length = (value: string): number => new TextEncoder().encode(value).byteLength;

const atomByteLength = (atom: JsonDocumentAtom): number => utf8Length(canonicalJsonStringify(atom));

const decomposeJsonDocument = (value: JsonValue, targetBytes: number): readonly JsonDocumentAtom[] => {
  const atoms: JsonDocumentAtom[] = [];
  const append = (atom: JsonDocumentAtom): void => {
    if (atomByteLength(atom) > targetBytes) {
      throw new OversizedAnalysisUnitError(`json-atom:${JSON.stringify(atom.path)}`);
    }
    atoms.push(atom);
  };

  const walk = (node: JsonValue, path: JsonPath): void => {
    if (typeof node === 'string') {
      const whole: JsonDocumentAtom = { kind: 'value', path, value: node };
      if (atomByteLength(whole) <= targetBytes) {
        atoms.push(whole);
        return;
      }
      const codePoints = Array.from(node);
      let startIndex = 0;
      while (startIndex < codePoints.length) {
        let low = startIndex + 1;
        let high = codePoints.length;
        let best: JsonDocumentAtom | null = null;
        while (low <= high) {
          const endIndexExclusive = Math.floor((low + high) / 2);
          const candidate: JsonDocumentAtom = {
            kind: 'string-window',
            path,
            startIndex,
            endIndexExclusive,
            codePointCount: codePoints.length,
            value: codePoints.slice(startIndex, endIndexExclusive).join(''),
          };
          if (atomByteLength(candidate) <= targetBytes) {
            best = candidate;
            low = endIndexExclusive + 1;
          } else {
            high = endIndexExclusive - 1;
          }
        }
        if (best?.kind !== 'string-window') {
          throw new OversizedAnalysisUnitError(`json-string:${JSON.stringify(path)}`);
        }
        atoms.push(best);
        startIndex = best.endIndexExclusive;
      }
      return;
    }

    if (node === null || typeof node === 'number' || typeof node === 'boolean') {
      append({ kind: 'value', path, value: node });
      return;
    }

    if (Array.isArray(node)) {
      append({ kind: 'container', path, containerType: 'array' });
      let startIndex = 0;
      while (startIndex < node.length) {
        let low = startIndex + 1;
        let high = node.length;
        let best: Extract<JsonDocumentAtom, { kind: 'array-range' }> | null = null;
        while (low <= high) {
          const endIndexExclusive = Math.floor((low + high) / 2);
          const candidate: Extract<JsonDocumentAtom, { kind: 'array-range' }> = {
            kind: 'array-range',
            path,
            startIndex,
            items: node.slice(startIndex, endIndexExclusive),
          };
          if (atomByteLength(candidate) <= targetBytes) {
            best = candidate;
            low = endIndexExclusive + 1;
          } else {
            high = endIndexExclusive - 1;
          }
        }
        if (best) {
          atoms.push(best);
          startIndex += best.items.length;
          continue;
        }
        const child = node[startIndex];
        if (child === undefined) throw new TypeError(`Elemento JSON ausente em ${JSON.stringify(path)}.`);
        walk(child, [...path, startIndex]);
        startIndex += 1;
      }
      return;
    }

    append({ kind: 'container', path, containerType: 'object' });
    const objectNode = node as { readonly [key: string]: JsonValue };
    const entries = Object.keys(objectNode)
      .sort()
      .map((key) => ({ key, value: objectNode[key] as JsonValue }));
    let startIndex = 0;
    while (startIndex < entries.length) {
      let low = startIndex + 1;
      let high = entries.length;
      let best: Extract<JsonDocumentAtom, { kind: 'object-entries' }> | null = null;
      while (low <= high) {
        const endIndexExclusive = Math.floor((low + high) / 2);
        const candidate: Extract<JsonDocumentAtom, { kind: 'object-entries' }> = {
          kind: 'object-entries',
          path,
          entries: entries.slice(startIndex, endIndexExclusive),
        };
        if (atomByteLength(candidate) <= targetBytes) {
          best = candidate;
          low = endIndexExclusive + 1;
        } else {
          high = endIndexExclusive - 1;
        }
      }
      if (best) {
        atoms.push(best);
        startIndex += best.entries.length;
        continue;
      }
      const entry = entries[startIndex];
      if (!entry) throw new TypeError(`Entrada JSON ausente em ${JSON.stringify(path)}.`);
      walk(entry.value, [...path, entry.key]);
      startIndex += 1;
    }
  };

  walk(value, []);
  return atoms;
};

const isJsonPath = (value: unknown): value is JsonPath =>
  Array.isArray(value) &&
  value.every((segment) => typeof segment === 'string' || (Number.isSafeInteger(segment) && Number(segment) >= 0));

const readAtPath = (root: unknown, path: JsonPath): unknown => {
  let current = root;
  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) throw new TypeError('O caminho JSON esperava um array.');
      current = current[segment];
    } else {
      if (!isRecord(current)) throw new TypeError('O caminho JSON esperava um objeto.');
      current = current[segment];
    }
  }
  return current;
};

export const restoreJsonDocumentFromParts = async (
  parent: SemanticAnalysisUnit,
  parts: readonly SemanticAnalysisUnit[],
): Promise<unknown> => {
  if (parent.kind === 'json-document-part' || parts.length === 0) {
    throw new TypeError('A restauração exige uma unidade pai integral e ao menos uma parte.');
  }
  if ((await sha256Text(parent.payloadJson)) !== parent.sourceHash) {
    throw new TypeError(`O hash da unidade pai ${parent.unitId} divergiu.`);
  }
  const ordered = [...parts].sort(
    (left, right) => (left.documentPart?.ordinal ?? 0) - (right.documentPart?.ordinal ?? 0),
  );
  let root: unknown;
  const stringWindows = new Map<
    string,
    { path: JsonPath; codePointCount: number; windows: Array<{ start: number; end: number; value: string }> }
  >();

  const setAtPath = (path: JsonPath, value: unknown): void => {
    if (path.length === 0) {
      root = value;
      return;
    }
    const parentPath = path.slice(0, -1);
    const parentValue = readAtPath(root, parentPath);
    const finalSegment = path[path.length - 1];
    if (typeof finalSegment === 'number') {
      if (!Array.isArray(parentValue)) throw new TypeError('A parte JSON esperava um array pai.');
      parentValue[finalSegment] = value;
    } else {
      if (!isRecord(parentValue) || finalSegment === undefined) {
        throw new TypeError('A parte JSON esperava um objeto pai.');
      }
      parentValue[finalSegment] = value;
    }
  };

  for (const [index, part] of ordered.entries()) {
    if (
      part.kind !== 'json-document-part' ||
      part.parentUnitId !== parent.unitId ||
      part.sourceEvidenceId !== parent.sourceEvidenceId ||
      part.documentPart?.ordinal !== index + 1 ||
      part.documentPart.total !== ordered.length ||
      (await sha256Text(part.payloadJson)) !== part.sourceHash
    ) {
      throw new TypeError(`Parte JSON inválida na posição ${index + 1}.`);
    }
    const atom: unknown = JSON.parse(part.payloadJson);
    if (!isRecord(atom) || typeof atom.kind !== 'string' || !isJsonPath(atom.path)) {
      throw new TypeError(`Átomo JSON inválido na posição ${index + 1}.`);
    }
    const path = atom.path;
    if (atom.kind === 'container') {
      if (atom.containerType !== 'object' && atom.containerType !== 'array') {
        throw new TypeError('Descritor de contêiner JSON inválido.');
      }
      setAtPath(path, atom.containerType === 'array' ? [] : {});
    } else if (atom.kind === 'object-entries') {
      const target = readAtPath(root, path);
      if (!isRecord(target) || !Array.isArray(atom.entries)) throw new TypeError('Parte de objeto JSON inválida.');
      for (const entry of atom.entries) {
        if (!isRecord(entry) || typeof entry.key !== 'string' || !('value' in entry)) {
          throw new TypeError('Entrada de objeto JSON inválida.');
        }
        target[entry.key] = entry.value;
      }
    } else if (atom.kind === 'array-range') {
      const target = readAtPath(root, path);
      if (!Array.isArray(target) || !Number.isSafeInteger(atom.startIndex) || !Array.isArray(atom.items)) {
        throw new TypeError('Faixa de array JSON inválida.');
      }
      for (const [offset, item] of atom.items.entries()) target[Number(atom.startIndex) + offset] = item;
    } else if (atom.kind === 'value') {
      if (!('value' in atom)) throw new TypeError('Valor JSON ausente.');
      setAtPath(path, atom.value);
    } else if (atom.kind === 'string-window') {
      if (
        typeof atom.value !== 'string' ||
        !Number.isSafeInteger(atom.startIndex) ||
        !Number.isSafeInteger(atom.endIndexExclusive) ||
        !Number.isSafeInteger(atom.codePointCount)
      ) {
        throw new TypeError('Janela de texto JSON inválida.');
      }
      const key = JSON.stringify(path);
      const collected = stringWindows.get(key) ?? {
        path,
        codePointCount: Number(atom.codePointCount),
        windows: [],
      };
      if (collected.codePointCount !== atom.codePointCount) throw new TypeError('Tamanho de texto JSON divergente.');
      collected.windows.push({
        start: Number(atom.startIndex),
        end: Number(atom.endIndexExclusive),
        value: atom.value,
      });
      stringWindows.set(key, collected);
    } else {
      throw new TypeError(`Tipo de átomo JSON desconhecido: ${atom.kind}.`);
    }
  }

  for (const collected of stringWindows.values()) {
    const windows = collected.windows.sort((left, right) => left.start - right.start);
    let cursor = 0;
    let value = '';
    for (const window of windows) {
      if (
        window.start !== cursor ||
        window.end <= window.start ||
        Array.from(window.value).length !== window.end - window.start
      ) {
        throw new TypeError('As janelas de texto JSON não são contíguas.');
      }
      value += window.value;
      cursor = window.end;
    }
    if (cursor !== collected.codePointCount) throw new TypeError('As janelas não cobrem todo o texto JSON.');
    setAtPath(collected.path, value);
  }

  if (canonicalJsonStringify(root) !== parent.payloadJson) {
    throw new TypeError(`As partes não recompõem integralmente a unidade ${parent.unitId}.`);
  }
  return root;
};

export const createAnalysisManifest = async (
  prompt: MonolithicPromptSnapshot,
  units: readonly SemanticAnalysisUnit[],
  promptVersion: string,
): Promise<AnalysisManifest> => {
  if (!PROMPT_VERSION_PATTERN.test(promptVersion)) throw new TypeError('Versão do prompt inválida.');
  if (!SHA256_PATTERN.test(prompt.sha256)) throw new TypeError('Hash do prompt inválido.');
  const evidenceIds = units.map(({ evidenceId }) => evidenceId);
  const sourceHashes = units.map(({ sourceHash }) => sourceHash);
  if (new Set(evidenceIds).size !== evidenceIds.length || sourceHashes.some((hash) => !SHA256_PATTERN.test(hash))) {
    throw new TypeError('Unidades inválidas para o manifesto.');
  }
  const rootInputHash = await sha256Text(
    canonicalJsonStringify({ promptVersion, monolithicPromptHash: prompt.sha256, evidenceIds, sourceHashes }),
  );
  return {
    schemaId: 'urn:astrologo:ai-analysis-manifest',
    schemaVersion: '1.0.0',
    promptVersion,
    monolithicPromptHash: prompt.sha256,
    rootInputHash,
    evidenceIds,
    sourceHashes,
  };
};

const renderFragmentInput = (
  manifest: AnalysisManifest,
  fixedInstructionPrefix: string,
  domain: AnalysisDomain,
  units: readonly SemanticAnalysisUnit[],
): string =>
  `${fixedInstructionPrefix}\n\nDADOS_DA_ETAPA_DE_ANALISE_LONGA — INÍCIO\n${canonicalJsonStringify({
    schemaId: 'urn:astrologo:ai-analysis-input-fragment',
    schemaVersion: '1.0.0',
    rootInputHash: manifest.rootInputHash,
    promptVersion: manifest.promptVersion,
    domain,
    units: units.map((unit) => ({
      evidenceId: unit.evidenceId,
      sourceEvidenceId: unit.sourceEvidenceId,
      sourcePath: unit.sourcePath,
      sourceHash: unit.sourceHash,
      kind: unit.kind,
      ...(unit.window ? { window: unit.window } : {}),
      ...(unit.documentPart ? { documentPart: unit.documentPart } : {}),
      payload: JSON.parse(unit.payloadJson) as JsonValue,
    })),
  })}\nDADOS_DA_ETAPA_DE_ANALISE_LONGA — FIM`;

const safelyCountTokens = async (countTokens: (input: string) => Promise<number>, input: string): Promise<number> => {
  let value: number;
  try {
    value = await countTokens(input);
  } catch (error) {
    throw new TokenCountUnavailableError(undefined, { cause: error });
  }
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TokenCountUnavailableError('A contagem canônica de tokens retornou um valor inválido.');
  }
  return value;
};

const parseLocalityLine = (unit: SemanticAnalysisUnit): Record<string, unknown> => {
  const line: unknown = JSON.parse(unit.payloadJson);
  if (!isRecord(line) || !isRecord(line.geometry) || !Array.isArray(line.geometry.coordinates)) {
    throw new TypeError(`A unidade ${unit.unitId} não contém uma linha cartográfica válida.`);
  }
  return line;
};

const createWindowUnit = async (
  parent: SemanticAnalysisUnit,
  line: Record<string, unknown>,
  segmentIndex: number,
  startIndex: number,
  endIndexExclusive: number,
  segmentCoordinateCount: number,
): Promise<SemanticAnalysisUnit> => {
  const geometry = line.geometry as Record<string, unknown>;
  const coordinates = geometry.coordinates as unknown[];
  const segment = coordinates[segmentIndex];
  if (!Array.isArray(segment)) throw new TypeError(`Segmento ${segmentIndex} inválido em ${parent.unitId}.`);
  const window: LocalityLineWindow = { segmentIndex, startIndex, endIndexExclusive, segmentCoordinateCount };
  const payload = {
    ...line,
    geometry: { ...geometry, coordinates: [segment.slice(startIndex, endIndexExclusive)] },
    sourceLineWindow: window,
  };
  const evidenceId = `${parent.evidenceId}#segment-${segmentIndex}:${startIndex}-${endIndexExclusive}`;
  const payloadJson = canonicalJsonStringify(payload);
  return {
    unitId: evidenceId,
    evidenceId,
    sourceEvidenceId: parent.sourceEvidenceId,
    sourcePath: `${parent.sourcePath}/geometry/coordinates/${segmentIndex}/${startIndex}:${endIndexExclusive}`,
    domain: 'locality',
    kind: 'locality-line-window',
    sourceHash: await sha256Text(payloadJson),
    payloadJson,
    parentUnitId: parent.unitId,
    window,
  };
};

const splitOversizedLocalityLine = async (
  unit: SemanticAnalysisUnit,
  options: PackAnalysisUnitsOptions,
): Promise<readonly SemanticAnalysisUnit[]> => {
  const line = parseLocalityLine(unit);
  const geometry = line.geometry as Record<string, unknown>;
  const coordinates = geometry.coordinates as unknown[];
  const windows: SemanticAnalysisUnit[] = [];

  for (const [segmentIndex, rawSegment] of coordinates.entries()) {
    if (!Array.isArray(rawSegment) || rawSegment.length === 0) continue;
    let startIndex = 0;
    while (startIndex < rawSegment.length) {
      let low = startIndex + 1;
      let high = rawSegment.length;
      let best: SemanticAnalysisUnit | null = null;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidate = await createWindowUnit(unit, line, segmentIndex, startIndex, middle, rawSegment.length);
        const input = renderFragmentInput(options.manifest, options.fixedInstructionPrefix, 'locality', [candidate]);
        const tokens = await safelyCountTokens(options.countTokens, input);
        if (tokens <= options.maxInputTokens) {
          best = candidate;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      if (!best?.window) throw new OversizedAnalysisUnitError(unit.unitId);
      windows.push(best);
      startIndex = best.window.endIndexExclusive;
    }
  }
  if (windows.length === 0) throw new OversizedAnalysisUnitError(unit.unitId);
  return windows;
};

const splitOversizedJsonDocument = async (
  unit: SemanticAnalysisUnit,
  options: PackAnalysisUnitsOptions,
): Promise<readonly SemanticAnalysisUnit[]> => {
  const parsed = JSON.parse(unit.payloadJson) as JsonValue;
  let targetBytes = Math.max(512, options.maxInputTokens * 4);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    let atoms: readonly JsonDocumentAtom[];
    try {
      atoms = decomposeJsonDocument(parsed, targetBytes);
    } catch (error) {
      if (targetBytes <= 512) throw error;
      targetBytes = Math.max(512, Math.floor(targetBytes / 2));
      continue;
    }
    const total = atoms.length;
    const parts: SemanticAnalysisUnit[] = [];
    let allFit = true;
    for (const [index, atom] of atoms.entries()) {
      const payloadJson = canonicalJsonStringify(atom);
      const ordinal = index + 1;
      const part: SemanticAnalysisUnit = {
        unitId: `${unit.unitId}#part-${String(ordinal).padStart(4, '0')}`,
        evidenceId: `${unit.evidenceId}#part-${String(ordinal).padStart(4, '0')}`,
        sourceEvidenceId: unit.sourceEvidenceId,
        sourcePath: `${unit.sourcePath}#part/${ordinal}`,
        domain: unit.domain,
        kind: 'json-document-part',
        sourceHash: await sha256Text(payloadJson),
        payloadJson,
        parentUnitId: unit.unitId,
        documentPart: { ordinal, total },
      };
      const input = renderFragmentInput(options.manifest, options.fixedInstructionPrefix, unit.domain, [part]);
      if ((await safelyCountTokens(options.countTokens, input)) > options.maxInputTokens) {
        allFit = false;
        break;
      }
      parts.push(part);
    }
    if (allFit && parts.length === total) {
      await restoreJsonDocumentFromParts(unit, parts);
      return parts;
    }
    if (targetBytes <= 512) break;
    targetBytes = Math.max(512, Math.floor(targetBytes / 2));
  }
  throw new OversizedAnalysisUnitError(unit.unitId);
};

const assertManifestMatchesUnits = (manifest: AnalysisManifest, units: readonly SemanticAnalysisUnit[]): void => {
  const evidenceIds = units.map(({ evidenceId }) => evidenceId);
  const hashes = units.map(({ sourceHash }) => sourceHash);
  if (
    evidenceIds.length !== manifest.evidenceIds.length ||
    evidenceIds.some((id, index) => id !== manifest.evidenceIds[index]) ||
    hashes.some((hash, index) => hash !== manifest.sourceHashes[index])
  ) {
    throw new TypeError('As unidades não correspondem integralmente ao manifesto raiz.');
  }
};

export const packAnalysisUnits = async (options: PackAnalysisUnitsOptions): Promise<PackedAnalysisPlan> => {
  if (!Number.isSafeInteger(options.maxInputTokens) || options.maxInputTokens <= 0) {
    throw new RangeError('O orçamento de tokens deve ser um inteiro positivo.');
  }
  if (typeof options.fixedInstructionPrefix !== 'string' || options.fixedInstructionPrefix.length === 0) {
    throw new TypeError('O prefixo fixo de instruções é obrigatório.');
  }
  assertManifestMatchesUnits(options.manifest, options.units);

  const groups: Array<{
    domain: AnalysisDomain;
    units: SemanticAnalysisUnit[];
    inputText: string;
    inputTokens: number;
  }> = [];
  const balancedSplitIndex = (units: readonly SemanticAnalysisUnit[]): number => {
    const weights = units.map(({ payloadJson }) => utf8Length(payloadJson));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let accumulated = 0;
    for (let index = 0; index < weights.length - 1; index += 1) {
      accumulated += weights[index] ?? 0;
      if (accumulated >= total / 2) return index + 1;
    }
    return Math.max(1, Math.floor(units.length / 2));
  };

  const packDomain = async (domain: AnalysisDomain, units: readonly SemanticAnalysisUnit[]): Promise<void> => {
    if (units.length === 0) return;
    const inputText = renderFragmentInput(options.manifest, options.fixedInstructionPrefix, domain, units);
    const inputTokens = await safelyCountTokens(options.countTokens, inputText);
    if (inputTokens <= options.maxInputTokens) {
      groups.push({ domain, units: [...units], inputText, inputTokens });
      return;
    }
    if (units.length > 1) {
      const splitIndex = balancedSplitIndex(units);
      await packDomain(domain, units.slice(0, splitIndex));
      await packDomain(domain, units.slice(splitIndex));
      return;
    }

    const unit = units[0];
    if (!unit) return;
    if (unit.kind === 'locality-line') {
      await packDomain(domain, await splitOversizedLocalityLine(unit, options));
      return;
    }
    if (unit.kind !== 'locality-line-window' && unit.kind !== 'json-document-part') {
      await packDomain(domain, await splitOversizedJsonDocument(unit, options));
      return;
    }
    throw new OversizedAnalysisUnitError(unit.unitId);
  };

  let domainStart = 0;
  while (domainStart < options.units.length) {
    const domain = options.units[domainStart]?.domain;
    if (!domain) break;
    let domainEnd = domainStart + 1;
    while (domainEnd < options.units.length && options.units[domainEnd]?.domain === domain) domainEnd += 1;
    await packDomain(domain, options.units.slice(domainStart, domainEnd));
    domainStart = domainEnd;
  }

  const fragments: PackedAnalysisFragment[] = [];
  for (const [index, group] of groups.entries()) {
    const inputHash = await sha256Text(group.inputText);
    fragments.push({
      fragmentId: `fragment:${String(index + 1).padStart(4, '0')}:${inputHash.slice(0, 16)}`,
      ordinal: index + 1,
      domain: group.domain,
      inputHash,
      inputText: group.inputText,
      inputTokens: group.inputTokens,
      coveredEvidenceIds: group.units.map(({ evidenceId }) => evidenceId),
      units: group.units,
    });
  }

  const evidenceIds = fragments.flatMap(({ coveredEvidenceIds }) => coveredEvidenceIds);
  if (new Set(evidenceIds).size !== evidenceIds.length)
    throw new TypeError('A cobertura empacotada contém duplicatas.');
  const sourceEvidenceIds = [
    ...new Set(fragments.flatMap(({ units }) => units.map(({ sourceEvidenceId }) => sourceEvidenceId))),
  ];
  if (
    sourceEvidenceIds.length !== options.manifest.evidenceIds.length ||
    sourceEvidenceIds.some((id, index) => id !== options.manifest.evidenceIds[index])
  ) {
    throw new TypeError('A cobertura empacotada não alcança todas as fontes do manifesto.');
  }

  return {
    manifest: options.manifest,
    fragments,
    coverage: { rootInputHash: options.manifest.rootInputHash, evidenceIds, sourceEvidenceIds },
  };
};
