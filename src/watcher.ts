import * as chokidar from 'chokidar'; //{watch,FSWatcher}
import {default_get} from '@yigal/base_types'
import { Filename,type FullReason } from './data.js';

function new_set(){
  return new Set<string>
}
function add(data:Record<string,Set<string>>,id:string,value:string){
    default_get(data,id,new_set).add(value)
}

export class Watcher{
  started=new Set<string>
  id_to_reason     : Record<string, FullReason > = {}  //watch id to listfirst detected reason, no need to show all reason because the ui cant show more than one
  id_to_watching_path    : Record<string, Set<string>>  = {}  //watch id to list of paths
  watching_path_to_id    :Record<string,  Set<string>>  = {}
  watchers         = new Set< chokidar.FSWatcher> 
  add_watch(watch_id:string,path:string){//can have multiple watchers per k
    add(this.id_to_watching_path,watch_id,path)
    add(this.watching_path_to_id,path,watch_id)
  }
  start_watching(){
    for (const [watching_path,ids] of Object.entries(this.watching_path_to_id)){
      const watcher=chokidar.watch(watching_path).on('change', (path) => {
        const full_reason:FullReason={
          reason:'changed',
          full_filename:path,
          rel:watching_path
        }
        for (const id of ids)
          this.id_to_reason[id]=full_reason //path can be file within watching_path
      })
      this.watchers.add(watcher)
    }
  }
  async stop_watching(){ //and clear the 
    const promises=[...this.watchers].map(async x=> await x.close())
    this.watchers.clear()
    await Promise.all(promises)
  }  
  initial_or_changed(watch_id:string):boolean{ //have watches under this k and did not changed
    const exists=this.id_to_watching_path[watch_id]
    if (exists==null)
      return true
    const changed=this.id_to_reason[watch_id]
    return changed!=null
  }
 
  set_started(id:string){
    this.started.add(id)
  }
  get_reasons(monitored:Set<string>){ //id:string
    const ans=[]
    for (const runner_id of monitored){
      const full_reason=this.get_reason(runner_id)
      if (full_reason!=null)
        ans.push({full_reason,runner_id})
    }
    return ans
  }
  get_reason(watch_id:string):FullReason|undefined{//return list of paths that have changed
    const ans=this.id_to_reason[watch_id]
    if (ans!=null)
      return ans
    if (this.started.has(watch_id))
      return
    return {
      reason:'initial'
    }
  }
  clear_changed(){
    this.id_to_reason={}
  }
}
