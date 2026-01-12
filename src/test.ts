import {Monitor} from './monitor.js'
import {run_tests} from '@yigal/base_types'
async function get_package_json_length(){
  const monitor=new Monitor(['.','..\\tsbase'])
  await monitor.run()
  return Object.keys(monitor.root!).length
}
if (import.meta.main) {
  void run_tests({
    k:'run on self',
    v:5,
    f:get_package_json_length
  })
}
 
 