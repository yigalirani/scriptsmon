import {run,eslint_linting_code} from '@yigal/watch_runner'
void run({
  cmd:'set timing=1&npx eslint . --debug --color ',
  watchfiles:[
    'src',
    'bin',
    'package.json',
    'eslint.config.mjs',
    'tsconfig.json',
    'client/src'    
  ],
  filter:eslint_linting_code
})  
