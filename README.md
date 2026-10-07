# @randajan/tether

A small Node.js library for starting child processes, writing to their standard input, and transforming their output with pluggable stream handlers. It also includes a convenience wrapper for running inline Python code from a project-local virtual environment.

The package ships both ESM and CommonJS builds and has no runtime dependencies.

## Installation

```sh
npm install @randajan/tether
```

Node.js 16.9 or newer is required.

## Quick start

```js
import { ProcessSpawner } from "@randajan/tether";
import { StreamToLines } from "@randajan/tether/handle/lines";

const handler = new StreamToLines({
  onData(line) {
    console.log("stdout:", line);
  },
  onStdErr(chunk) {
    console.error("stderr:", chunk.toString());
  },
  onError(error) {
    console.error(error);
  },
  onStop(reason) {
    console.log("stopped", reason);
  }
});

const child = new ProcessSpawner(process.execPath, {
  args: ["-e", "console.log('hello from the child process')"],
  handler
});

await child.start();
```

## Public imports

| Import | Exports |
| --- | --- |
| `@randajan/tether` | `ProcessSpawner` (default and named), `ProcessSpawnError`, `StreamHandler` |
| `@randajan/tether/handle/lines` | `StreamToLines` |
| `@randajan/tether/handle/json` | `StreamToJson` |
| `@randajan/tether/python` | `PythonSpawner` |

Every import is available through both ESM `import` and CommonJS `require()`.

## ProcessSpawner

```js
const child = new ProcessSpawner(command, options);
```

The constructor stores the process configuration. It does not start the process unless `autoStart` is enabled.

### Options

- `args`: array of command arguments; defaults to `[]`.
- `options`: options passed to Node.js `child_process.spawn()`.
- `handler`: a `StreamHandler` instance used for stdout, stderr, lifecycle, and error callbacks.
- `autoStart`: start immediately from the constructor when truthy.
- `autoRestart`: start again whenever the child closes unexpectedly.

Processes are spawned with `shell: false` by default. A value supplied in `options.shell` overrides that default. If a handler is provided, keep stdout and stderr piped so the handler can receive them.

### Properties and methods

#### `state`

Returns `"running"` while a child is assigned and `"stopped"` otherwise.

#### `isState(state)`

Checks the current state.

#### `await start()`

Starts the configured process. Returns `true` when a process was started and `false` if it was already running. The returned promise resolves after the handler's `onStart` callback.

#### `write(data)`

Writes a string or `Buffer` to the child's stdin. It throws `ProcessSpawnError` when the process is stopped and `TypeError` for unsupported data types.

```js
child.write("a line\n");
```

#### `await stop(abortPending?, reason?)`

Marks the spawner as stopped, closes the child's stdin with `stdin.end()`, flushes the handler, and calls its `onStop` callback. Returns `false` when already stopped.

Important: `stop()` does not call `child.kill()`. It asks stdin-driven programs to finish by sending EOF. A program that does not exit after its stdin closes can continue running after the spawner has entered the stopped state.

When `abortPending` is truthy, the handler clears its queued data without waiting for its current dispatch cycle.

#### `await restart(abortPending?, reason?)`

Calls `stop()` followed by `start()`.

### Lifecycle

```text
stopped -- start() --> running
running -- stop()  --> stopped (stdin is ended; the OS process is not killed)
running -- close   --> stopped -- autoRestart --> running
```

Any child `close` event that occurs while the spawner still considers itself running is treated as an abrupt close, including an exit code of `0`. The handler receives a `ProcessSpawnError`, followed by `onStop`; `autoRestart` then starts a new process when enabled. A close event following a manual `stop()` is ignored by the lifecycle listener.

## Stream handlers

A handler transforms stdout chunks into application data and owns the related callbacks.

```text
stdout chunk -> onStdOut() -> parse() -> queue -> onData()
stderr chunk --------------------------------> onStdErr()
```

`StreamHandler` is the base class. Its default `parse()` method throws, so use one of the supplied handlers or extend it and implement `parse()`.

```js
import { StreamHandler } from "@randajan/tether";

class NumberHandler extends StreamHandler {
  parse(chunk) {
    return Number(chunk.toString());
  }
}
```

`parse(chunk)` may return:

- `null` or `undefined` to emit nothing;
- one value to enqueue one `onData` call;
- an array to enqueue each element separately.

### Handler callbacks

Callbacks are passed to the handler constructor:

```js
new StreamHandler({
  onData(data, ...extra) {},
  onError(error, ...extra) {},
  onStdErr(chunk, ...extra) {},
  onStart(...extra) {},
  onStop(reason, ...extra) {}
});
```

- `onData` receives parsed stdout data.
- `onStdErr` receives the raw stderr chunk, normally a `Buffer`.
- `onError` receives parsing, callback, spawn, and close errors.
- `onStart` runs after listeners have been attached to a newly spawned child.
- `onStop` runs after the handler has been flushed. The public wrapper accepts `(abort, reason)`, but the configured callback receives only `reason`.

The `isBusy` and `isFlushing` getters expose the handler's internal dispatch and flush state.

### StreamToLines

`StreamToLines` buffers stdout until a newline is encountered and emits complete lines without the newline character.

```js
import { StreamToLines } from "@randajan/tether/handle/lines";

const handler = new StreamToLines({
  onData: line => console.log(line)
});
```

Chunks may split a line at any position; the handler preserves the incomplete tail between chunks. `trim()` returns and clears that tail, but does not emit it through `onData`. Consequently, output that does not end in `\n` is not delivered as a line.

The splitter currently recognizes `\n` only. Output using `\r\n` retains the `\r` at the end of each emitted line.

### StreamToJson

`StreamToJson` extends `StreamToLines` and parses each complete line with `JSON.parse()`.

```js
import { StreamToJson } from "@randajan/tether/handle/json";

const handler = new StreamToJson({
  onData(value, originalLine) {
    console.log(value, originalLine);
  },
  onError(error) {
    console.error("Invalid JSONL output", error);
  }
});
```

The first `onData` argument is the parsed value and the second is the original JSON line. Invalid JSON is wrapped in a `SyntaxError` and sent to `onError`. This handler is intended for JSON Lines/NDJSON output, not a pretty-printed multi-line JSON document.

## PythonSpawner

`PythonSpawner` runs a JavaScript string as inline Python source using `python -c`.

```js
import { PythonSpawner } from "@randajan/tether/python";
import { StreamToJson } from "@randajan/tether/handle/json";

const python = new PythonSpawner(
  `
import json
print(json.dumps({"runtime": "python", "ready": True}))
  `,
  {
    handler: new StreamToJson({
      onData: value => console.log(value)
    })
  }
);

await python.start();
```

Its options are the same as `ProcessSpawner`, with one addition:

- `pythonPath`: explicit path to a Python executable.

When `pythonPath` is omitted, the library walks upward from its compiled module location until it finds a `.venv` directory. It then uses:

- `.venv/bin/python` on Linux and macOS;
- `.venv/Scripts/python.exe` on Windows.

If no `.venv` is found before reaching the filesystem root, construction throws `ProcessSpawnError`. Extra `args` are appended after the inline script and are available to Python through `sys.argv`.

```js
const python = new PythonSpawner("import sys; print(sys.argv[1])", {
  pythonPath: "/usr/bin/python3",
  args: ["hello"],
  handler: new StreamToLines({ onData: console.log })
});
```

## Errors

`ProcessSpawnError` extends `Error` and adds:

- `exitCode`: the child's exit code when available;
- `signal`: the signal that closed the child when available;
- standard `cause` support through the `Error` options object.

The error message includes the exit code and signal when supplied.

## Current concurrency semantics

Parsed values are removed from the internal queue in order. However, asynchronous `onData` callbacks are started without being awaited, so they may overlap and may complete out of order. `flush(false)` waits for the queue's dispatch cycle, not necessarily for every asynchronous `onData` callback to settle.

Code that requires strictly sequential asynchronous processing should implement its own promise chain inside `onData` until the handler implementation provides serial awaiting.

## Development and architecture

Source code lives under `src/`:

```text
src/
├── index.js                     root exports
├── common/
│   ├── ProcessSpawner.js        child-process lifecycle
│   └── ProcessSpawnError.js     process-specific error
├── handlers/
│   ├── StreamHandler.js         parsing and callback base class
│   ├── StreamToLines.js         newline framing
│   └── StreamToJson.js          JSON Lines parsing
├── python/
│   ├── paths.js                 upward .venv discovery
│   └── PythonSpawner.js         python -c wrapper
└── types/
    ├── index.d.ts               root API declarations
    ├── handlers/                handler subpath declarations
    └── python/                  Python subpath declarations
```

The root `index.js` is the build entry and uses `@randajan/simple-lib` to generate parallel builds under `dist/esm` and `dist/cjs`. It also copies `src/types` to `dist/types`. The independently published entry points must stay synchronized across four places:

1. the `entries` array in the root `index.js`;
2. the `exports` map in `package.json`;
3. the declarations below `src/types`;
4. the public-import table in this README.

Build and inspect the publishable package with:

```sh
npm run build
npm pack --dry-run
```

`npm publish` automatically runs `prepack`, which rebuilds `dist` before npm creates the package archive.

## License

MIT
