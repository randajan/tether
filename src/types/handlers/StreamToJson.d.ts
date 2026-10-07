import { type StreamHandlerOptions } from "../index.js";
import { StreamToLines } from "./StreamToLines.js";

/** The original JSON line supplied after its parsed value. */
export type StreamToJsonDataArgs = [originalLine: string];

/** Parses every complete stdout line as JSON. */
export class StreamToJson<T = unknown> extends StreamToLines {
    constructor(options?: StreamHandlerOptions<T, StreamToJsonDataArgs>);

    onData(line: string): Promise<unknown>;
}
