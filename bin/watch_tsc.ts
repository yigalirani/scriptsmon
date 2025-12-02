import {run} from '@yigal/watch_runner'
void run({
  cmd:'npx tsc',
  watchfiles:[
    'src',
    'bin',
    'package.json',
    'eslint.config.mjs',
    'tsconfig.json'
  ]
})

