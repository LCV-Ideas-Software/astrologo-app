import type { SwissEphemerisLike } from './positionV2';
import swissEphemerisWasm from './swiss_eph.wasm';

const WASI_SUCCESS = 0;
const WASI_BAD_FILE_DESCRIPTOR = 8;
const WASI_NOT_FOUND = 44;
const WASI_NOT_IMPLEMENTED = 70;

interface SwissWasmExports extends WebAssembly.Exports {
  readonly memory: WebAssembly.Memory;
  readonly malloc: (size: number) => number;
  readonly free: (pointer: number) => void;
  readonly swe_houses: (
    tjdUt: number,
    latitudeDeg: number,
    longitudeDeg: number,
    houseSystem: number,
    cuspsPointer: number,
    ascmcPointer: number,
  ) => number;
  readonly swe_calc_ut: (
    tjdUt: number,
    bodyId: number,
    flags: number,
    resultPointer: number,
    errorPointer: number,
  ) => number;
  readonly swe_house_pos: (
    armc: number,
    latitudeDeg: number,
    obliquityDeg: number,
    houseSystem: number,
    planetPointer: number,
    errorPointer: number,
  ) => number;
  readonly swe_version: (versionPointer: number) => number;
}

class SwissWasmHeap {
  constructor(
    private readonly memory: WebAssembly.Memory,
    private readonly exports: SwissWasmExports,
  ) {}

  alloc(size: number): number {
    const pointer = this.exports.malloc(size);
    if (!Number.isInteger(pointer) || pointer <= 0) throw new Error('Swiss Ephemeris WASM não alocou memória.');
    new Uint8Array(this.memory.buffer, pointer, size).fill(0);
    return pointer;
  }

  free(pointer: number): void {
    this.exports.free(pointer);
  }

  f64(pointer: number, length: number): Float64Array {
    return new Float64Array(this.memory.buffer, pointer, length);
  }

  writeF64(pointer: number, values: readonly number[]): void {
    this.f64(pointer, values.length).set(values);
  }

  readString(pointer: number): string {
    const bytes = new Uint8Array(this.memory.buffer);
    let end = pointer;
    while (end < bytes.length && bytes[end] !== 0) end += 1;
    return new TextDecoder().decode(bytes.subarray(pointer, end));
  }
}

class MinimalWasiRuntime {
  private memory: WebAssembly.Memory | null = null;

  setMemory(memory: WebAssembly.Memory): void {
    this.memory = memory;
  }

  private dataView(): DataView | null {
    return this.memory ? new DataView(this.memory.buffer) : null;
  }

  readonly imports = {
    wasi_snapshot_preview1: new Proxy<Record<string, (...args: number[]) => number>>(
      {
        proc_exit: (code: number) => {
          if (code !== 0) throw new Error(`Swiss Ephemeris WASM encerrou com código ${code}.`);
          return WASI_SUCCESS;
        },
        fd_write: (fd: number, iovsPointer: number, iovsLength: number, writtenPointer: number) => {
          if (!this.memory) return WASI_NOT_IMPLEMENTED;
          const view = new DataView(this.memory.buffer);
          let written = 0;
          for (let index = 0; index < iovsLength; index += 1) {
            const entry = iovsPointer + index * 8;
            const bufferPointer = view.getUint32(entry, true);
            const bufferLength = view.getUint32(entry + 4, true);
            written += bufferLength;
            if (fd === 2 && bufferLength > 0) {
              const message = new TextDecoder().decode(new Uint8Array(this.memory.buffer, bufferPointer, bufferLength));
              console.error(message.trim());
            }
          }
          view.setUint32(writtenPointer, written, true);
          return WASI_SUCCESS;
        },
        args_sizes_get: (countPointer: number, sizePointer: number) => {
          const view = this.dataView();
          if (!view) return WASI_NOT_IMPLEMENTED;
          view.setUint32(countPointer, 0, true);
          view.setUint32(sizePointer, 0, true);
          return WASI_SUCCESS;
        },
        args_get: () => WASI_SUCCESS,
        environ_sizes_get: (countPointer: number, sizePointer: number) => {
          const view = this.dataView();
          if (!view) return WASI_NOT_IMPLEMENTED;
          view.setUint32(countPointer, 1, true);
          view.setUint32(sizePointer, 8, true);
          return WASI_SUCCESS;
        },
        environ_get: (environmentPointer: number, environmentBufferPointer: number) => {
          if (!this.memory) return WASI_NOT_IMPLEMENTED;
          const environment = new TextEncoder().encode('PATH=.\0');
          new Uint8Array(this.memory.buffer, environmentBufferPointer, environment.length).set(environment);
          new DataView(this.memory.buffer).setUint32(environmentPointer, environmentBufferPointer, true);
          return WASI_SUCCESS;
        },
        clock_time_get: (_clockId: number, _precision: number, timePointer: number) => {
          const view = this.dataView();
          if (!view) return WASI_NOT_IMPLEMENTED;
          view.setBigUint64(timePointer, BigInt(Date.now()) * 1_000_000n, true);
          return WASI_SUCCESS;
        },
        clock_res_get: (_clockId: number, resolutionPointer: number) => {
          const view = this.dataView();
          if (!view) return WASI_NOT_IMPLEMENTED;
          view.setBigUint64(resolutionPointer, 1_000_000n, true);
          return WASI_SUCCESS;
        },
        random_get: (bufferPointer: number, bufferLength: number) => {
          if (!this.memory) return WASI_NOT_IMPLEMENTED;
          const target = new Uint8Array(this.memory.buffer, bufferPointer, bufferLength);
          for (let offset = 0; offset < target.length; offset += 65_536) {
            crypto.getRandomValues(target.subarray(offset, Math.min(offset + 65_536, target.length)));
          }
          return WASI_SUCCESS;
        },
        fd_fdstat_get: (fd: number, statPointer: number) => {
          const view = this.dataView();
          if (!view) return WASI_NOT_IMPLEMENTED;
          if (fd !== 1 && fd !== 2 && fd !== 3) return WASI_BAD_FILE_DESCRIPTOR;
          view.setUint8(statPointer, fd === 3 ? 3 : 2);
          view.setUint16(statPointer + 2, 0, true);
          view.setBigUint64(statPointer + 8, fd === 3 ? 0xffffffffn : 64n, true);
          view.setBigUint64(statPointer + 16, fd === 3 ? 0xffffffffn : 64n, true);
          return WASI_SUCCESS;
        },
        fd_close: () => WASI_BAD_FILE_DESCRIPTOR,
        fd_prestat_get: (fd: number, prestatPointer: number) => {
          const view = this.dataView();
          if (!view) return WASI_NOT_IMPLEMENTED;
          if (fd !== 3) return WASI_BAD_FILE_DESCRIPTOR;
          view.setUint8(prestatPointer, 0);
          view.setUint32(prestatPointer + 4, 1, true);
          return WASI_SUCCESS;
        },
        fd_prestat_dir_name: (fd: number, pathPointer: number, pathLength: number) => {
          if (!this.memory) return WASI_NOT_IMPLEMENTED;
          if (fd !== 3) return WASI_BAD_FILE_DESCRIPTOR;
          const path = new TextEncoder().encode('.');
          new Uint8Array(this.memory.buffer, pathPointer, Math.min(pathLength, path.length)).set(path);
          return WASI_SUCCESS;
        },
        path_open: () => WASI_NOT_FOUND,
        path_filestat_get: () => WASI_NOT_FOUND,
        sched_yield: () => WASI_SUCCESS,
      },
      {
        get: (target, property: string) => target[property] ?? (() => WASI_NOT_IMPLEMENTED),
      },
    ),
  };
}

class SwissEphemerisRuntime implements SwissEphemerisLike {
  private readonly exports: SwissWasmExports;
  private readonly heap: SwissWasmHeap;

  constructor(module: WebAssembly.Module) {
    const wasi = new MinimalWasiRuntime();
    const instance = new WebAssembly.Instance(module, wasi.imports);
    this.exports = instance.exports as SwissWasmExports;
    wasi.setMemory(this.exports.memory);
    this.heap = new SwissWasmHeap(this.exports.memory, this.exports);
  }

  swe_houses(tjdUt: number, latitudeDeg: number, longitudeDeg: number, houseSystem: number) {
    const cuspsPointer = this.heap.alloc(13 * 8);
    const ascmcPointer = this.heap.alloc(10 * 8);
    try {
      const returnCode = this.exports.swe_houses(
        tjdUt,
        latitudeDeg,
        longitudeDeg,
        houseSystem,
        cuspsPointer,
        ascmcPointer,
      );
      return {
        returnCode,
        cusps: this.heap.f64(cuspsPointer, 13).slice(),
        ascmc: this.heap.f64(ascmcPointer, 10).slice(),
      };
    } finally {
      this.heap.free(cuspsPointer);
      this.heap.free(ascmcPointer);
    }
  }

  swe_calc_ut(tjdUt: number, bodyId: number, flags: number) {
    const resultPointer = this.heap.alloc(6 * 8);
    const errorPointer = this.heap.alloc(256);
    try {
      const returnCode = this.exports.swe_calc_ut(tjdUt, bodyId, flags, resultPointer, errorPointer);
      return {
        returnCode,
        xx: this.heap.f64(resultPointer, 6).slice(),
        error: this.heap.readString(errorPointer),
      };
    } finally {
      this.heap.free(resultPointer);
      this.heap.free(errorPointer);
    }
  }

  swe_house_pos(
    armc: number,
    latitudeDeg: number,
    obliquityDeg: number,
    houseSystem: number,
    planetCoordinates: [number, number],
  ) {
    const planetPointer = this.heap.alloc(2 * 8);
    const errorPointer = this.heap.alloc(256);
    this.heap.writeF64(planetPointer, planetCoordinates);
    try {
      const position = this.exports.swe_house_pos(
        armc,
        latitudeDeg,
        obliquityDeg,
        houseSystem,
        planetPointer,
        errorPointer,
      );
      return { position, error: this.heap.readString(errorPointer) };
    } finally {
      this.heap.free(planetPointer);
      this.heap.free(errorPointer);
    }
  }

  swe_version(): string {
    const versionPointer = this.heap.alloc(256);
    try {
      this.exports.swe_version(versionPointer);
      return this.heap.readString(versionPointer);
    } finally {
      this.heap.free(versionPointer);
    }
  }
}

export const swissEphemeris: SwissEphemerisLike = new SwissEphemerisRuntime(swissEphemerisWasm);
