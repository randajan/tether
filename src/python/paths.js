import { existsSync } from "fs";
import path from "path";

import { ProcessSpawnError } from "../common/ProcessSpawnError";


export const resolvePythonPath = (startDir) => {

    let dir = startDir;

    while (true) {

        const venvPath = path.join(dir, ".venv");

        if (existsSync(venvPath)) {

            return process.platform === "win32"
                ? path.join(venvPath, "Scripts", "python.exe")
                : path.join(venvPath, "bin", "python");

        }

        const parent = path.dirname(dir);

        if (parent === dir) {
            throw new ProcessSpawnError("Unable to find Python virtual environment '.venv'");
        }

        dir = parent;

    }

};