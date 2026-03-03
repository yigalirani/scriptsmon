import * as chokidar from 'chokidar'; //{watch,FSWatcher}
import {default_get} from '@yigal/base_types'
import type { FullReason } from './data.js';

function new_set<T>(){
  return new Set<T>
}
function add<T>(data:Record<string,Set<T>>,id:string,value:T){
    default_get(data,id,new_set<T>).add(value)
}
interface IdRel{
  watch_id:string,
  rel:string
}
export interface IdRelPath extends IdRel{
  path:string
}
function diff_set<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set(
    [...a].filter(element => !b.has(element))
  );
}
interface watch_index{
  id_to_watching_path:Record<string,  Set<string>>
  watching_path_to_id:Record<string, Set<IdRel>>
}
function make_watch_index():watch_index{
  return {
    id_to_watching_path:{},
    watching_path_to_id:{}
  }  
}
function calc_watch_state(v:IdRelPath[],existing_paths:Set<string>){

  const requested_paths=new Set<string>
  const watch_index=make_watch_index()
  for (const {watch_id,path,rel} of v){
    requested_paths.add(path)
    add(watch_index.id_to_watching_path,watch_id,path)
    add(watch_index.watching_path_to_id,path,{watch_id,rel})
  }
  const paths_to_add=diff_set(requested_paths,existing_paths)
  const paths_to_close=diff_set(existing_paths,requested_paths)
  return {
    watch_index,
    paths_to_add,
    paths_to_close
  }

}
export class Watcher{
  private started=new Set<string>
  private id_to_reason     : Record<string, FullReason > = {}  //watch id to listfirst detected reason, no need to show all reason because the ui cant show more than one
  private watched_paths:Map<string,chokidar.FSWatcher> =new Map()
  private watch_index=make_watch_index()
  private close_watched_path=async (path:string)=>{
    await this.watched_paths.get(path)?.close()
    this.watched_paths.delete(path)
  }
  private add_watched_path=(path:string)=>{
    const watcher=chokidar.watch(path).on('all', (event,full_filename) => {
      console.log(event)
      for (const {watch_id,rel} of this.watch_index.watching_path_to_id[path]!){
        const full_reason:FullReason={
          reason:'change',
          full_filename,
          rel
        }
        this.id_to_reason[watch_id]=full_reason //path can be file within watching_path
      }
    })
    this.watched_paths.set(path,watcher)
  }
  async restart(watch_requests:IdRelPath[]){
    const keys=new Set(this.watched_paths.keys())
    const {
      watch_index,
      paths_to_add,
      paths_to_close
    }=calc_watch_state(watch_requests,keys)
    await Promise.all([...paths_to_close].map(this.close_watched_path));//semicolon is important other whise it parses the next line bracket as part of the expression
    [...paths_to_add].map(this.add_watched_path)
    this.watch_index=watch_index
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
  private get_reason(watch_id:string):FullReason|undefined{//return list of paths that have changed
    const ans=this.id_to_reason[watch_id]
    if (ans!=null)
      return ans
    if (this.started.has(watch_id))
      return
    return {
      reason:'initial'
    }
  }
  clear_changed(){//should we call this from get_reasons and make it private?
    this.id_to_reason={}
  }
}
