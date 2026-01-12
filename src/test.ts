import {read_package_json} from './parser.js'
import {run_tests} from '@yigal/base_types'
async function get_package_json_length(){
  const root=await read_package_json(['.'])
  return Object.keys(root).length
}
if (import.meta.main) {
  void run_tests({
    v:8,
    f:get_package_json_length
  })
}
 