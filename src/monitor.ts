import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import { spawn, IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import {Run,State,Runner,Folder,Scriptsmon,Watcher,Filename} from './data.js'
import  cloneDeep  from 'lodash.clonedeep'
import {
  is_object,
  s2t,
  mkdir_write_file,
  read_json_object ,
  s2u,
  reset,
  green,
  is_string_array,
  s2s,
  get_error,
  sleep,
  pk
} from "@yigal/base_types";




function is_ready_to_start(runner:Runner){
  if (runner.runs.length===0)
    return true
  return runner.runs.at(-1)?.end_time!=null;
}


function keep_only_last<T>(arr: T[]): void {
  if (arr.length > 1) {
    arr.splice(0, arr.length - 1);
  }
}
function extract_base(folder:Folder):Folder{
  const {full_pathname}=folder
  const runners=[]
  for (const runner of folder.runners){
    const copy=cloneDeep(runner)
    runners.push(copy)
    for (const run of runner.runs){
      if (run.output.length!==0){
        console.log(`runner ${runner.name} ${JSON.stringify(run.output)}`)
        run.output=[]
      }
    }    
    keep_only_last(runner.runs)
  }
  const folders=folder.folders.map(extract_base)
  return {...folder,folders,runners}
}
function is_valid_watch(a:unknown){
  if (a==null)
    return true
  return is_string_array(a)
}
function is_valid_watcher(a:unknown){
  if (typeof a==='string' || is_string_array(a))
      return true 
  if (!is_object(a))
    return "expecting object"
  if (!is_valid_watch(a.watch)){
    return 'watch: expecting  array of strings'
  }

  for (const k of Object.keys(a))
    if (!['watch','env','filter','pre'].includes(k))
      return `${k}:invalid key`
  return true
}
function is_non_watcher(k:string){
  return  (['watched','$watch'].includes(k))
}
function is_config2(a:unknown){
  if (!is_object(a))
    return false
  const {$watch}=a
  if (!is_valid_watch($watch)){
    console.log('watch: must be string or array of string')
    return false  
  }
  for (const [k,v] of Object.entries(a)){
    if (is_non_watcher(k))
      continue
    const valid_watcher=is_valid_watcher(v)
    if (valid_watcher!==true){
      console.log(`${k}: invalid watcher:${valid_watcher}`)
      return false
    }

  }
  return true

}
function parse_config(filename:string,pkgJson:s2u|undefined):Scriptsmon{
  if (pkgJson==null)
    return{}
  const {scriptsmon}=pkgJson
  if (scriptsmon==null)
    return {}
  const ans=is_config2(scriptsmon);
  if (ans)
    return scriptsmon as Scriptsmon
  console.warn(ans)
  return {}  
}
function parse_scripts(pkgJson:s2u):s2s{

  if (pkgJson==null)
    return {}
  const {scripts}=pkgJson
  if (scripts==null)
    return {}  
  return scripts as s2s
}
function normalize_watch(a:string[]|undefined){
  if (a==null)
    return []
  return a
}
/*function set_state(runner:Runner,state:State){
  runner.state=state
  runner.version++

}*/
interface RunnerCtrl{
  ipty:Record<string,IPty> 
}
function make_runner_ctrl(){
  const ipty={}
  return {ipty}
}
async function stop({
  runner_ctrl,runner
}:{
  runner_ctrl:RunnerCtrl,
  runner: Runner
}): Promise<void> {
  //const { state } = runner;
  let was_stopped=false
  while(true){
    if (is_ready_to_start(runner)) {
      /*if (was_stopped)
        set_state(runner,'stopped')*/
      return Promise.resolve()
    }
    if (!was_stopped){
      was_stopped=true
      console.log(`stopping runner ${runner.name}...`)
      const {id}=runner
      runner_ctrl.ipty[id]?.kill() // what if more than one kill function call is needed
    }
    await sleep(10)
  }
}

 async function run_runner({ //this is not async function on purpuse
  runner,
  reason,
  runner_ctrl
}: {
  runner: Runner;
  reason:string
  runner_ctrl:RunnerCtrl
}) {
  await stop({runner_ctrl,runner})
  void new Promise((resolve, _reject) => { 
    const {script,full_pathname,runs}=runner
    //(runner,'running')
    // Spawn a shell with the script as command
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    const shellArgs = process.platform === 'win32' ? ['/c', script] : ['-c', script];
    const child = spawn(shell, shellArgs,  {
     // name: 'xterm-color',
      cols:200,
      useConpty:false,
      cwd:full_pathname,
      env: { ...process.env, FORCE_COLOR: "3" },

    });
    if (child===null)
      return
    runner_ctrl.ipty[runner.id]=child//overrides that last on
    // Set state to running immediately (spawn happens synchronously)
    const run_id=function(){
      if (runs.length===0)
        return 0
      return runs.at(-1)!.run_id+1
    }()    
    const run:Run={
      start_time: Date.now(),
      end_time  : undefined,    //initialy is undefined then changes to number and stops changing
      reason,
      output   : [],
      Err      : undefined,   //initialy is undefined then maybe changes to error and stop changing
      exit_code: undefined,
      stopped  : undefined,
      run_id
    }
    runner.runs.push(run)
    
    // Listen to data events (both stdout and stderr come through onData)
    const dataDisposable = child.onData((data: string) => {
      run.output.push(data)
      //run.output_time=Date.now()
    });
    
    // Listen to exit events
    const exitDisposable = child.onExit(({ exitCode,signal }) => {
      dataDisposable.dispose();
      exitDisposable.dispose();
      console.log({ exitCode,signal })
      const new_state=(exitCode===0?'done':'error') //todo: should think of aborted
      //set_state(runner,new_state)
      run.end_time=Date.now()
      run.exit_code=exitCode
      if (signal!=null)
        run.stopped=true
      resolve(null);
    });
  }); 
}
function calc_effective_watch($watch:string[],watcher?:Watcher|string[]){
  const watcher_array=function(){
    if (watcher==null)
      return undefined
    if (Array.isArray(watcher))
      return watcher
    return watcher.watch
  }()
  if (watcher_array==null)
    return $watch
  if (!watcher_array.includes('$watch'))
    return watcher_array
  return [...watcher_array.filter(x=>x!=='$watch'),...$watch]
}

function scriptsmon_to_runners(pkgPath:string,watchers:Scriptsmon,scripts:s2s){
  const $watch=normalize_watch(watchers.$watch)
  const watched=normalize_watch(watchers.watched)
  const ans=[]
  for (const [name,script] of Object.entries(scripts)){
    if (is_non_watcher(name))
      continue
    const the_watcher=watchers[name]
    //const script=scripts[name]
    if (script==null){
      console.warn(`missing script ${name}`)
      continue
    }
    const runner=function(){
      const full_pathname=path.dirname(pkgPath)
      const id=`${full_pathname} ${name}`.replaceAll(/\\|:/g,'-').replaceAll(' ','--')
      const effective_watch_rel=calc_effective_watch($watch,the_watcher)
      const effective_watch:Filename[]=effective_watch_rel.map(rel=>({rel,full:path.join(full_pathname,rel)}))
      const ans:Runner= {
        type:'runner',
        name,
        script,
        full_pathname,
        the_watcher,
        effective_watch,
        watched:watched.includes(name),
        //state:'ready',
        id,
        //version:0,
        runs:[]
      }

      return ans
    }()
    ans.push(runner)
  }
  return ans
}
 async function read_package_json(
  full_pathnames: string[]
) {

  const folder_index: Record<string, Folder> = {}; //by full_pathname
  async function f(full_pathname: string,name:string){
    const pkgPath = path.resolve(path.normalize(full_pathname), "package.json");
    const d= path.resolve(full_pathname);
    const exists=folder_index[d]
    if (exists!=null){
      console.warn(`${pkgPath}: skippin, already done`)
      return exists
    }    
    //const pkgJson = await 
    const pkgJson=await read_json_object(pkgPath,'package.json')
    if (pkgJson==null)
      return null
    console.warn(`${green}${pkgPath}${reset}`)
    const scriptsmon=parse_config(pkgPath,pkgJson)
    const scripts=parse_scripts(pkgJson)
    const runners=scriptsmon_to_runners(pkgPath,scriptsmon,scripts)
    const {workspaces} = pkgJson
    const folders=[]
    if (is_string_array(workspaces))
      for (const workspace of workspaces){
          const ret=await f(path.join(full_pathname,workspace),workspace)
          if (ret!=null)
            folders.push(ret)
        }

    
    const ans:Folder= {runners,folders,name,full_pathname,scriptsmon,type:'folder',id:full_pathname}
    return ans
  }
  const folders=[]
  for (const pathname of full_pathnames){
    const full_pathname=path.resolve(pathname)
    const ret=await f(full_pathname,path.basename(full_pathname))
      if (ret!=null)
        folders.push(ret)
  }
  const root:Folder={
    name:'root',
    id:'root',
    full_pathname: '',
    folders,
    runners:[],
    scriptsmon:{},
    type:'folder'
  }
  //const keys=Object.keys(ans)
  //const common_prefix=getCommonPrefix(keys)
  //const extra={keys,common_prefix}
  //await mkdir_write_file('generated/extra.json',JSON.stringify(extra,null,2))

  return root
}
function find_runner(root:Folder,id:string){
  function f(folder:Folder):Runner|undefined{
    const ans=folder.runners.find(x=>x.id===id)
    if (ans!=null)
      return ans
    for (const subfolder of folder.folders){
      const ans=f(subfolder)
      if (ans!=null)
        return ans
    }
  }
  return f(root)
}
function collect_watch_dirs(root:Folder){
  const ans=new Set<string>
  function f(node:Folder){
    for (const runner of node.runners)
      if (runner.watched)
        runner.effective_watch.forEach(x=>ans.add(x.full))
    node.folders.forEach(f)
  }
  f(root)
  return ans
}
function set_replacer(_k:string,v:unknown){
  if (v instanceof Set)
    return [...v] as unknown
  /*if (kdd=='init')
    return format_ast(v)*/
  return v
}
export function to_json(x:unknown){
  const ans=JSON.stringify(x,set_replacer,2).replace(/\\n/g, '\n');
  return ans
}
function watch_to_set(watched_dirs:Set<string>,changed_dirs:Set<string>){
  for (const watched_dir of watched_dirs){
    try{
      console.log(`watching ${watched_dir}`)
      fsSync.watch(watched_dir,{},(eventType, changed_file) => {
        changed_dirs.add(watched_dir)
        console.log(`changed: *${watched_dir}/${changed_file} `)

      }) 
    }catch(ex){
      console.warn(`file not found, ignoring ${watched_dir}: ${String(ex)}`)  
    }
  }
}
interface RunnerWithReason{
  runner:Runner
  reason:string
}
function get_runners_by_changed_dirs(root:Folder,changed_dirs:Set<string>){
  const ans:RunnerWithReason[]=[]
  function f(node:Folder){
    const {folders,runners,full_pathname}=node
    folders.forEach(f);
    for (const runner of runners){
      for (const {full} of runner.effective_watch)
        if (changed_dirs.has(full))
          ans.push({runner,reason:full})
    }
  }
  f(root)
  return Object.values(ans)
}
export class Monitor{
  runner_ctrl=make_runner_ctrl()
  root?:Folder
  watched_dirs=new Set<string>()
  changed_dirs=new Set<string>()
  constructor(
    public full_pathnames:string[]
  ){
  }
  async read_package_json(){
    this.root= await read_package_json(this.full_pathnames)
    this.watched_dirs=collect_watch_dirs(this.root)
    await mkdir_write_file('c:\\yigal\\generated\\packages.json',to_json(this))
  }
  get_root(){
    if (this.root==null) 
      throw new Error("Monitor not initialied succsfuly")
    return this.root    
  }
  run_runner(runner_id:string,reason:string){
    const {runner_ctrl}=this
    const runner=find_runner(this.get_root(),runner_id)
    if (runner==null)
      throw new Error(`runnwe is not found:${runner_id}`)
    void run_runner({runner,reason,runner_ctrl})
  }
  extract_base():Folder{
    return extract_base(this.get_root())
  }
  start_watching(){
    /*collect all invidyalk watch dirs
    for each set  up node watch
    upon change, collect all the runners that depends on the change
    for each, all run_runner*/
    watch_to_set(this.watched_dirs,this.changed_dirs)
    setInterval(()=>{
      if (this.changed_dirs.size===0)
        return
      const runners=get_runners_by_changed_dirs(this.root!,this.changed_dirs)
      for (const {runner,reason} of runners){
        this.run_runner(runner.id,reason)
      }
      this.changed_dirs.clear()
    },100)
  }
}