import { ProcessSpawner } from "../common/ProcessSpawner";
import { resolvePythonPath } from "./paths";

import path from "path";
import { fileURLToPath } from "url";

const resolveDefaultPythonPath = ()=>{
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return resolvePythonPath(currentDir);
}

export class PythonSpawner extends ProcessSpawner {

    constructor(script, {
        pythonPath,
        args = [],
        options = {},
        handler,
        autoStart,
        autoRestart
    } = {}) {
        super(pythonPath || resolveDefaultPythonPath(), {
            handler,
            options,
            args: ["-c", script, ...args],
            autoStart,
            autoRestart
        });
    }

}