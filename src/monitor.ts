//simport * as fsSync from "node:fs";
import { spawn, type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import type {Run,Runner,Folder} from './data.js'
import chokidar from 'chokidar';
import {read_package_json,to_json,find_runner} from './parser.js'
import  cloneDeep  from 'lodash.clonedeep'
import * as path from 'node:path';
import {
  mkdir_write_file,
  sleep} from "@yigal/base_types";
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
export class Monitor{
  ipty:Record<string,IPty>={}
  runs:Runs={}
  root?:Folder
  watched_dirs=new Set<string>()
  changed_dirs=new Set<string>()
  watched_runners:Runner[]=[]
  is_running=true  
  constructor(
    public workspace_folders:string[]    
  ){}
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
      //const new_state=(exitCode===0?'done':'error') //todo: should think of aborted
      //set_state(runner,new_state)
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
  collect_watch_dirs(root:Folder){
    const ans=new Set<string>
    function f(node:Folder){
      for (const runner of node.runners)
        if (runner.watched)
          for (const x of runner.effective_watch)
            ans.add(x.full)
      node.folders.forEach(f)
    }
    f(root)
    return ans
  }
  watch_to_set(watched_dirs:Set<string>,changed_dirs:Set<string>){
    for (const watched_dir of watched_dirs){
      try{
        console.log(`watching ${watched_dir}`)
        chokidar.watch(watched_dir).on('change', (changed_file) =>{
        //fsSync.watch(watched_dir,{},(eventType, changed_file) => {
          changed_dirs.add(watched_dir)
          console.log(`changed: *${watched_dir}/${changed_file} `)
        }) 
      }catch(ex){
        console.warn(`file not found, ignoring ${watched_dir}: ${String(ex)}`)  
      }
    }
  }
  get_runners_by_changed_dirs(root:Folder,changed_dirs:Set<string>){
    const ans:RunnerWithReason[]=[]
    function f(node:Folder){
      const {folders,runners}=node
      folders.forEach(f);
      for (const runner of runners){
        if (runner.watched)
          for (const {full} of runner.effective_watch)
            if (changed_dirs.has(full))
              ans.push({runner,reason:full})
      }
    }
    f(root)
    return Object.values(ans)
  }
  calc_one_debug_name=(workspace_folder:string)=>{
    const ans=path.basename(path.resolve(path.normalize(workspace_folder)));
    return ans
    /*const full_path=path.resolve(path.normalize(workspace_folder))
    const split=full_path.split(/(\/)|(\\\\)/)
    const ans=split.at(-1)
    return ans*/
  }
  async runRepeatedly() {
    while (this.is_running) {
      try {
        const result = await this.read_package_json();
        console.log(result);
      } catch (error) {
        console.error("Error:", error);
      }

      // wait before next run
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  async read_package_json(){
    const new_root= await read_package_json(this.workspace_folders)
    this.root=new_root
    this.watched_dirs=this.collect_watch_dirs(this.root)
    this.watched_runners=this.find_runners(this.root,(x)=>x.watched)
    const name=this.workspace_folders.map(this.calc_one_debug_name).join('_')
    const filename=`c:/yigal/scriptsmon/generated/${name}_packages.json`
    console.log(filename)
    const to_write=to_json(this,["ipty"])
    await mkdir_write_file(filename,to_write) 
  }
  get_root(){
    if (this.root==null) 
      throw new Error("Monitor not initialied succsfuly")
    return this.root    
  }
  async run_runner(runner_id:string,reason:string){
    const runner=find_runner(this.get_root(),runner_id)
    if (runner==null)
      throw new Error(`runnwe is not found:${runner_id}`)
    await this.run_runner2({runner,reason})
  }
  start_watching(){
    /*collect all invidyalk watch dirs
    for each set  up node watch
    upon change, collect all the runners that depends on the change
    for each, all run_runner*/
    this.watch_to_set(this.watched_dirs,this.changed_dirs)
    setInterval(()=>{ 
      if (this.changed_dirs.size===0)
        return
      const runners=this.get_runners_by_changed_dirs(this.root!,this.changed_dirs)
      for (const {runner,reason} of runners){
        void this.run_runner(runner.id,reason)
      }
      this.changed_dirs.clear()
    },100)
    for (const runner of this.watched_runners)
      void this.run_runner(runner.id,"start")
  }
}