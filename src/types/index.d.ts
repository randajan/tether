import type { Buffer } from "node:buffer";
import type { SpawnOptions } from "node:child_process";

/** A value returned either immediately or through a promise-like object. */
export type Awaitable<T> = T | PromiseLike<T>;

/** The chunk shape normally produced by piped Node.js child-process streams. */
export type StreamChunk = Buffer | string;

/** State tracked by ProcessSpawner. */
export type ProcessState = "running" | "stopped";

/** Callbacks invoked by StreamHandler. */
export interface StreamHandlerOptions<
    TData = unknown,
    TDataArgs extends unknown[] = unknown[]
> {
    onData?: (data: TData, ...args: TDataArgs) => Awaitable<unknown>;
    onError?: (error: unknown, ...args: unknown[]) => Awaitable<unknown>;
    onStdErr?: (chunk: StreamChunk, ...args: unknown[]) => Awaitable<unknown>;
    onStart?: (...args: unknown[]) => Awaitable<unknown>;
    onStop?: (reason?: unknown, ...args: unknown[]) => Awaitable<unknown>;
}

/**
 * Base stdout parser and lifecycle callback coordinator.
 *
 * Extend this class and implement parse(), or use one of the supplied handler
 * subpath exports. The base parse() implementation throws at runtime.
 */
export class StreamHandler<
    TData = unknown,
    TDataArgs extends unknown[] = unknown[]
> {
    constructor(options?: StreamHandlerOptions<TData, TDataArgs>);

    readonly isBusy: boolean;
    readonly isFlushing: boolean;

    onData(data: TData, ...args: TDataArgs): Promise<unknown>;
    onStdErr(chunk: StreamChunk, ...args: unknown[]): Promise<unknown>;
    onStart(...args: unknown[]): Promise<unknown>;
    onError(error: unknown, ...args: unknown[]): Promise<unknown>;
    onStop(abort?: boolean, reason?: unknown, ...args: unknown[]): Promise<unknown>;
    onStdOut(chunk: StreamChunk): Promise<void>;

    parse(chunk: StreamChunk): TData | TData[] | null | undefined;
    trim(): unknown;
    flush(abort?: boolean): Promise<void>;
}

/** Options accepted by ProcessSpawner. */
export interface ProcessSpawnerOptions {
    args?: readonly string[];
    options?: SpawnOptions;
    handler?: StreamHandler<any, any[]>;
    autoStart?: boolean;
    autoRestart?: boolean;
}

/** Extra information accepted by ProcessSpawnError. */
export interface ProcessSpawnErrorOptions {
    cause?: unknown;
    exitCode?: number | null;
    signal?: NodeJS.Signals | null;
    /** Internal close-handler metadata; it is not exposed as an error property. */
    tail?: unknown;
}

/** Error raised for stopped, failed, or unexpectedly closed processes. */
export class ProcessSpawnError extends Error {
    constructor(message: string, options?: ProcessSpawnErrorOptions);

    name: "ProcessSpawnError";
    exitCode: number | null | undefined;
    signal: NodeJS.Signals | null | undefined;
}

/**
 * Starts and tracks one child process at a time.
 *
 * stop() ends stdin but does not send an operating-system kill signal.
 */
export class ProcessSpawner {
    constructor(command: string, options?: ProcessSpawnerOptions);

    readonly state: ProcessState;

    isState(state: ProcessState): boolean;
    throwIfStopped(): void;
    write(data: string | Buffer): void;
    start(): Promise<boolean>;
    stop(abortPending?: boolean, reason?: unknown): Promise<boolean>;
    restart(abortPending?: boolean, reason?: unknown): Promise<boolean>;
}

export default ProcessSpawner;
