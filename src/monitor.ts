import { spawn, type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import type {Run,Runner,Folder} from './data.js'
import {read_package_json,to_json,find_runner} from './parser.js'
import  cloneDeep  from 'lodash.clonedeep'
import * as path from 'node:path';
const fs = await import("node:fs/promises");
import {Watcher} from './watcher.js'
import {
  //mkdir_write_file,
  sleep,
  Repeater
} from "@yigal/base_types";
function keep_only_last<T>(arr: T[]): void {
  if (arr.length > 1) {
    arr.splice(0, arr.length - 1);
  }
}  
interface RunnerWithReason{
  runner:Runner
  reason:string
}
type Runs=Record<string,Run[]>
export interface RunnerReport{
  command: "RunnerReport";
  root:Folder,
  base_uri:string,
  runs:Runs  
}

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
    console.log(`File '${filePath}' has been written successfully.`);
  } catch (err){
    console.error('Error writing file',err)
  }
}
export class Monitor{
  ipty:Record<string,IPty>={}
  runs:Runs={}
  root?:Folder
  watcher=new Watcher()
  //monitored_runners:Runner[]=[]
  repeater=new Repeater()
  constructor(
    public workspace_folders:string[]    
  ){}
  async run(){
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
      runs
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
    reason,
  }: {
    runner: Runner;
    reason:string
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
        reason,
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
      if (signal!=null)
        run.stopped=true
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
  add_watch=(folder:Folder)=>{
    this.watcher.add_watch("root",path.join(folder.workspace_folder,'package.json'))
    for (const runner of folder.runners){
      const {watched,id,effective_watch}=runner
      //if (runner.watched)
      for (const x of effective_watch)
          this.watcher.add_watch(id,x.full)
    }    
    folder.folders.map(this.add_watch)
  }
  async dump_debug(){
    const name=this.workspace_folders.map(this.calc_one_debug_name).join('_')
    const filename=`c:/yigal/scriptsmon/generated/${name}_packages.json`
    console.log(filename)
    const to_write=to_json(this,["ipty","watchers"])
    await mkdir_write_file(filename,to_write,true)
  }
  get_reason(id:string){
    const changed=this.watcher.get_changed(id)
    if (changed[0]!==null)
      return changed[0]
    if (this.watcher.initial_or_changed(id))
      return 'inital'
  }
  get_changed_runners(monitored_runners:Runner[]){
    const ans=[]
    for (const runner of monitored_runners){
      const {id}=runner
      const reason=this.get_reason(id)
      if (reason!=null)
        ans.push({runner_id:id,reason})
    }
    return ans
  }
  iter=async ()=>{
    if (this.watcher.initial_or_changed('root')){
      await this.watcher.stop_watching() //does not clear the changed 
      const new_root= await read_package_json(this.workspace_folders)
      this.add_watch(new_root)
      this.root=new_root
      this.watcher.start_watching() //based on add watcg from before
    }
    const monitored_runners=this.find_runners(this.root!,(x)=>x.watched)
    const changed=this.get_changed_runners(monitored_runners)
    this.watcher.clear_changed()
    for (const x of changed)
      void this.run_runner(x)
    await this.dump_debug()
  }
  get_root(){
    if (this.root==null) 
      throw new Error("Monitor not initialied succsfuly")
    return this.root    
  }
  async run_runner({runner_id,reason}:{
    runner_id:string
    reason:string
  }){
    const runner=find_runner(this.get_root(),runner_id)
    if (runner==null)
      throw new Error(`runnwe is not found:${runner_id}`)
    await this.run_runner2({runner,reason})
  }
  start_watching(){
  }
}