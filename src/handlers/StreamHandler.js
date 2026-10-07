export class StreamHandler {

    #traits;
    #pending;
    #queue = [];
    #isFlushing = false;

    constructor({
        onData = data => { },
        onError = err => { },
        onStdErr = stderr => { },
        onStart = () => { },
        onStop = reason => { },
    } = {}) {

        this.#traits = {
            onData,
            onError,
            onStdErr,
            onStart,
            onStop
        }
    }

    get isBusy() { return !!this.#pending; }
    get isFlushing() { return this.#isFlushing; }

    async onData(data, ...args) { return this.#traits.onData(data, ...args); }
    async onStdErr(stderr, ...args) { return this.#traits.onStdErr(stderr, ...args); }
    async onStart(...args) { return this.#traits.onStart(...args); }
    async onError(err, ...args) { return this.#traits.onError(err, ...args); }
    async onStop(abort, reason, ...args) {
        await this.flush(abort);
        return this.#traits.onStop(reason, ...args);
    }

    async onStdOut(chunk) {
        if (this.#isFlushing) { return; }
        
        let r;
        try { r = this.parse(chunk); }
        catch (error) {
            await this.onError(error);
            return;
        }

        if (r == null) { return; }
        else if (!Array.isArray(r)) { this.#queue.push(r); }
        else if (r.length) { this.#queue.push(...r); }
        else { return; }

        this.#process();
    }

    parse(chunk) {
        throw new Error("StreamParser.parse() must be implemented");
    }

    trim() {

    }

    async flush(abort) {
        if (this.#isFlushing) { return; }
        this.#isFlushing = true;
        try {
            if (!abort) { await this.#pending; }
            this.trim();
            this.#queue = [];
        } finally {
            this.#isFlushing = false;
        }
    }

    #process() {
        if (this.#pending) { return; }

        const process = async () => {
            while (this.#queue.length) {
                const item = this.#queue.shift();
                this.onData(item).catch(async error => {
                    try { await this.onError(error); } catch {}
                });
            }
        };

        this.#pending = process().finally(() => { this.#pending = null; });
    }

}