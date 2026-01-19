import * as chokidar from 'chokidar'; //{watch,FSWatcher}
import {default_get} from '@yigal/base_types'

function new_set(){
  return new Set<string>
}
function add(data:Record<string,Set<string>>,id:string,value:string){
    default_get(data,id,new_set).add(value)
}

export class Watcher{
  started=new Set<string>
  id_to_changed_path     : Record<string, Set<string> > = {}  //watch id to list of paths
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
        for (const id of ids)
          add(this.id_to_changed_path,id,path) //path can be file within watching_path
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
    const changed=this.id_to_changed_path[watch_id]
    return changed!=null
  }
  private get_reason=(id:string)=>{
  //get_reason(id:string){
    const all_changed=this.get_changed(id)
    const changed=all_changed[0]
    if (changed!=null)
      return {
          runner_id:id,
          reason:`changed:${changed}`,
          
      }
    if (this.started.has(id))
      return
    return {
      runner_id:id,
      reason:'initial',
    }
  }
  set_started(id:string){
    this.started.add(id)
  }
  get_reasons(monitored:Set<string>){ //id:string
    const ans=[]
    for (const id of monitored){
      const reason=this.get_reason(id)
      if (reason!=null)
        ans.push(reason)
    }
    return ans
  }
  get_changed(watch_id:string):string[]{//return list of paths that have changed
    return [...(this.id_to_changed_path[watch_id]??new Set())]
  }
  clear_changed(){
    this.id_to_changed_path={}
  }
}
