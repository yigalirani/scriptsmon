import type {Scriptsmon} from './data.js'
export const a:Scriptsmon={
    "$watch": ["src","package.json","./bin/run_build.ts"],
    "test"  : {"watch":["./dist/test.ts"]},
    "tsc"   : {"watch":["$watch","tsconfig.json"]},
    "eslint": {
      "watch" : ["$watch","tsconfig.json","eslint.config.mjs"],
      "filter": "npx @yigal/eslint_filter",
      "pre"   : "set TIMING=1"
    },
    "autorun":["test","build","tsc","eslint"]
}
const {autorun,$watch,test}=a
console.log(autorun,$watch,test)