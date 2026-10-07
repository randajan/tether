import { StreamHandler } from "./StreamHandler";

export class StreamToLines extends StreamHandler {

    #tail = "";

    parse(chunk) {
        this.#tail += chunk.toString();

        const lines = this.#tail.split("\n");
        this.#tail = lines.pop();

        return lines;
    }

    trim() {
        const tail = this.#tail;
        this.#tail = "";
        return tail;
    }

}