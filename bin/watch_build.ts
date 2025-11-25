import {run} from '@yigal/watch_runner'

 
void run({
  cmd:'node bin/run_build.ts',
  title:'build',
  watchfiles:[
    'src',
    'package.json',
    'tsconfig.json'
  ]
})
