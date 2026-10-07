import { StreamToLines } from "./StreamToLines";

export class StreamToJson extends StreamToLines {

    onData(line) {
        try {
            return super.onData(JSON.parse(line), line);
        } catch(cause) {
            throw new SyntaxError(`JSON parse failed at line: '${line}'`, { cause });
        }
        
    }

}