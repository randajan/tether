import { spawn } from "child_process";
import { ProcessSpawnError } from "./ProcessSpawnError";
import { StreamHandler } from "../handlers/StreamHandler";


export class ProcessSpawner {

    #cfg;
    #proc;

    constructor(command, {
        args = [],
        options = {},
        handler,
        autoStart,
        autoRestart
    } = {}) {
        if (handler && !(handler instanceof StreamHandler)) {
            throw new TypeError("handler must be an instance of StreamHandler");
        }

        this.#cfg = { command, args, options, handler, autoRestart };

        if (autoStart) { this.start(); }
    }

    get state() { return this.#proc ? "running" : "stopped"; }
    isState(state) { return this.state === state; }

    throwIfStopped() {
        if (!this.isState("stopped")) { return; }
        throw new ProcessSpawnError("Process is stopped");
    }

    write(data) {
        this.throwIfStopped();

        if (typeof data !== "string" && !Buffer.isBuffer(data)) {
            throw new TypeError("ProcessSpawner.write() expects string or Buffer");
        }

        this.#proc.stdin.write(data);
    }

    async start() {
        if (!this.isState("stopped")) { return false; }

        const { command, args, options, handler, autoRestart } = this.#cfg;
        const proc = this.#proc = spawn(command, args, { shell: false, ...options });

        if (handler) {
            proc.stdout?.on("data", handler.onStdOut.bind(handler));
            proc.stderr?.on("data", handler.onStdErr.bind(handler));
            proc.on("error", async err => {
                await handler.onError(new ProcessSpawnError("Process runtime error", { cause: err }));
            });
        }

        proc.on("close", async (exitCode, signal) => {
            if (this.isState("stopped")) { return; }

            const tail = await handler?.trim();
            this.#proc = null;

            const reason = new ProcessSpawnError("Process closed abruptly", { exitCode, signal, tail });

            await handler?.onError(reason);
            await handler?.onStop(false, reason);
            if (autoRestart) { await this.start(); }
        });

        await handler?.onStart();
        return true;
    }

    async stop(abortPending, reason) {
        if (this.isState("stopped")) { return false; }

        const proc = this.#proc;

        this.#proc = null;
        proc.stdin?.end();

        const { handler } = this.#cfg;
        await handler?.onStop(abortPending, reason);
        return true;
    }

    async restart(abortPending, reason) {
        await this.stop(abortPending, reason);
        return this.start();
    }

}