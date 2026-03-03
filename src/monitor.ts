import { spawn, type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import type {Run,Runner,Folder,Runs,RunnerReport,FullReason} from './data.js'
import {read_package_json,to_json,find_runner} from './parser.js'
import  cloneDeep  from 'lodash.clonedeep'
import * as path from 'node:path';
const fs = await import("node:fs/promises");
import {Watcher,type IdRelPath} from './watcher.js'

import {
  sleep,
  toggle_set,
  Repeater
} from "@yigal/base_types";


function keep_only_last<T>(arr: T[]): void {
  if (arr.length > 1) {
    arr.splice(0, arr.length - 1);
  }
}  
/*interface RunnerWithReason{
  runner:Runner
  reason:string
}*/


async function read_file(filename:string){
  try{
    const ans=await fs.readFile(filename)
    return ans.toString()
  } catch {
    return null
  }
}
export async function mkdir_write_file(filePath:string,data:string,cache=false){
  const directory=path.dirname(filePath);
  try{
    await fs.mkdir(directory,{recursive:true});
    if (cache){
      const exists=await read_file(filePath);
      if (exists===data)
        return
    }                                                           

    await fs.writeFile(filePath,data);
    //console.log(`File '${filePath}' has been written successfully.`);
  } catch (err){
    console.error('Error writing file',err)
  }
}
export class Monitor{
  ipty:Record<string,IPty>={}
  runs:Runs={} 
  monitored=new Set<string>
  root?:Folder
  watcher=new Watcher()
  //monitored_runners:Runner[]=[]
  repeater=new Repeater(100)
  constructor(
    public workspace_folders:string[]    
  ){}
  async start_monitor(){
    await this.read_package_json_and_start_watching()
    await new Repeater(2000).repeat(this.dump_debug)
    return await this.repeater.repeat(this.iter)

  }
  get_runner_runs(runner:Runner):Run[]{
    const {id}=runner
    const exists=this.runs[id]
    if (exists!=null)
      return exists
    this.runs[id]=[]
    return this.runs[id]
  }
  is_ready_to_start(runner:Runner){
    const runs=this.get_runner_runs(runner)
    if (runs.length===0)
      return true
    return runs.at(-1)?.end_time!=null;
  }
  extract_report(base_uri:string):RunnerReport{ //tbd: delete
    //const {full_pathname}=folder
    const runs:Runs={}
    for (const [k,v] of Object.entries(this.runs)){
      if (v.length===0)
        continue
      runs[k]=cloneDeep(v)
      keep_only_last(v)
      v[0]!.output=[]
    }
    return {
      command: "RunnerReport",
      root:this.get_root(),
      base_uri,
      runs,
      monitored:[...this.monitored]
    }
  }
  async  stop({
    runner
  }:{
    runner: Runner
  }): Promise<void> {
    //const { state } = runner;
    let was_stopped=false
    while(true){
      if (this.is_ready_to_start(runner)) {
        /*if (was_stopped)
          set_state(runner,'stopped')*/
        return
      }
      if (!was_stopped){
        was_stopped=true
        console.log(`stopping runner ${runner.name}...`)
        const {id}=runner
        this.ipty[id]?.kill() // what if more than one kill function call is needed
      }
      await sleep(10)
    }
  }
  async run_runner2({ //this is not async function on purpuse
    runner,
    full_reason,
  }: {
    runner: Runner;
    full_reason:FullReason
  }) {
    await this.stop({runner})
    await new Promise((resolve, _reject) => { 
      const runs=this.get_runner_runs(runner)
      const {workspace_folder,name}=runner
      //(runner,'running')
      // Spawn a shell with the script as command
      //const split_args=script.str.split(' ').filter(Boolean)
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
      const shellArgs = process.platform === 'win32' ? ['/c', 'npm run',name] : ['-c', 'npm run',name];
      //const shellArgs = process.platform === 'win32' ? ['/c', ...split_args] : ['-c', ...split_args];
      this.watcher.set_started(runner.id)
      const child = spawn(shell, shellArgs,  {
      // name: 'xterm-color',
        cols:200,
        useConpty:false,
        cwd:workspace_folder,
        env: { ...process.env, FORCE_COLOR: "3" },
      });
      if (child===null)
        return
      this.ipty[runner.id]=child//overrides that last on
      // Set state to running immediately (spawn happens synchronously)
      const run_id=function(){
        if (runs.length===0)
          return 0 
        return runs.at(-1)!.run_id+1
      }()
      const run:Run={
        start_time: Date.now(),
        end_time  : undefined,    //initialy is undefined then changes to number and stops changing
        full_reason,
        output   : [],
        Err      : undefined,   //initialy is undefined then maybe changes to error and stop changing
        exit_code: undefined,
        stopped  : undefined,
        run_id 
      }
    
    this.get_runner_runs(runner).push(run)
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
      run.end_time=Date.now()
      run.exit_code=exitCode
      if (signal!=null || exitCode==null && signal==null){
        run.stopped=true
      }
      resolve(null);
    });
  }); 
  }
  find_runners(root:Folder,filter:(x:Runner)=>boolean){
    const ans:Runner[]=[]
    function f(node:Folder){
      node.folders.forEach(f)
      for (const runner of node.runners){
        if (filter(runner))
          ans.push(runner)
      }
    }
    f(root)
    return ans
  }
  calc_one_debug_name=(workspace_folder:string)=>{
    const ans=path.basename(path.resolve(path.normalize(workspace_folder)));
    return ans
  }
  collect_watch_requests(folder:Folder){
    const ans:IdRelPath[]=[]
    function add_watch(watch_id:string,path:string,rel:string){
      ans.push({watch_id,path,rel})
    }
    function f(folder:Folder){
      add_watch("root",path.join(folder.workspace_folder,'package.json'),'package.json')
      for (const runner of folder.runners){
        const {id,effective_watch}=runner
        //const watched=this.watched[id]===true
        //if (runner.watched)
        for (const x of effective_watch)
            add_watch(id,x.full,x.rel.str)
      }    
      folder.folders.map(f)
    }
    f(folder)
    return ans
  }
  dump_debug=async()=>{
    const name=this.workspace_folders.map(this.calc_one_debug_name).join('_')
    const filename=`c:/yigal/scriptsmon/generated2/${name}_packages.json`
    //console.log(filename)
    const to_write=to_json(this,["ipty","watchers"])
    await mkdir_write_file(filename,to_write,true)
  }
  async read_package_json_and_start_watching(){
    const new_root= await read_package_json(this.workspace_folders)
    this.root=new_root
    const requests=this.collect_watch_requests(new_root)
    await this.watcher.restart(requests)
  }
  iter=async ()=>{
    const changed=this.watcher.get_reasons(this.monitored)
    if (changed.length===0)
      return
    if (changed.some(x=>x.runner_id==='root')) //one of the package.json file was changed
      await this.read_package_json_and_start_watching()
    this.watcher.clear_changed()
    for (const x of changed)
      void this.run_runner(x)
  }
  get_root(){
    if (this.root==null) 
      throw new Error("Monitor not initialied succsfuly")
    return this.root    
  }
  async stop_runner({runner_id}:{runner_id:string}){
    const runner=find_runner(this.get_root(),runner_id)
    if (runner==null)
      throw new Error(`runnwe is not found:${runner_id}`)

    await this.stop({runner})
    const runs=this.get_runner_runs(runner)
    runs.at(-1)!.output.push('stopped')
  }
  async run_runner({runner_id,full_reason}:{
    runner_id:string
    full_reason:FullReason
  }){
    const runner=find_runner(this.get_root(),runner_id)
    if (runner==null)
      throw new Error(`runnwe is not found:${runner_id}`)
    await this.run_runner2({runner,full_reason})
  }
  toggle_watch_state(runner_id:string){
    //const runner=find_runner(this.get_root(),runner_id)
    toggle_set(this.monitored,runner_id)
  }
  start_watching(){
    console.log('start_watching')
  }
}