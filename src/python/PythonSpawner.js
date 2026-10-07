import { ProcessSpawner } from "../common/ProcessSpawner";
import { resolvePythonPath } from "./paths";

export class PythonSpawner extends ProcessSpawner {

    constructor(script, {
        pythonPath,
        args = [],
        options = {},
        handler,
        autoStart,
        autoRestart
    } = {}) {
        super(pythonPath || resolvePythonPath(), {
            handler,
            options,
            args: ["-c", script, ...args],
            autoStart,
            autoRestart
        });
    }

}