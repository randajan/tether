export class ProcessSpawnError extends Error {

    constructor(message, options = {}) {
        const { exitCode, signal, ...passOpt } = options;

        const exitMsg = exitCode == null ? "" : ` with exit code ${exitCode}`;
        const signalMsg = signal == null ? "" : ` (signal ${signal})`;

        super(`${message}${exitMsg}${signalMsg}`, passOpt);

        this.name = "ProcessSpawnError";
        this.exitCode = exitCode;
        this.signal = signal;
    }

}