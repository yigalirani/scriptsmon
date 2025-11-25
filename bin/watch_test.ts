import {run} from '@yigal/watch_runner'

 
void run({
  cmd:'node dist/test.js',
  title:'test',
  watchfiles:[
    'dist/test.js'
  ]
})
  