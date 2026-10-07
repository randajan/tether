import {
    StreamHandler,
    type StreamChunk,
    type StreamHandlerOptions
} from "../index.js";

/** Frames stdout on `\n` and emits complete lines without the delimiter. */
export class StreamToLines extends StreamHandler<string, []> {
    constructor(options?: StreamHandlerOptions<string, []>);

    parse(chunk: StreamChunk): string[];
    trim(): string;
}
