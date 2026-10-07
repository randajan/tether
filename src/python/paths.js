import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ProcessSpawnError } from "../common/ProcessSpawnError";


export const resolvePythonPath = () => {

    let dir = path.dirname(fileURLToPath(import.meta.url));

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