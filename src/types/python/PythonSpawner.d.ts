import {
    ProcessSpawner,
    type ProcessSpawnerOptions
} from "../index.js";

/** ProcessSpawner options plus an optional explicit Python executable. */
export interface PythonSpawnerOptions extends ProcessSpawnerOptions {
    pythonPath?: string;
}

/** Runs inline source through `python -c`, using a discovered .venv by default. */
export class PythonSpawner extends ProcessSpawner {
    constructor(script: string, options?: PythonSpawnerOptions);
}
