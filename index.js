import sapp, { argv } from "@randajan/simple-lib";


sapp(argv.isBuild, {
    mode:"node",
    lib:{
        entries:[
            "index.js",
            "handlers/StreamToJson.js",
            "handlers/StreamToLines.js",
            "python/PythonSpawner.js"
        ],
        statics:["types"]
    }
})