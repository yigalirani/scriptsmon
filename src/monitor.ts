import * as path from "node:path";
import * as fs from "node:fs/promises";
//simport * as fsSync from "node:fs";
import { spawn, type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import {type Run,State,type Runner,type Folder,type Scriptsmon,type Watcher,type Filename,type Lstr,find_runner} from './data.js'
import {parseExpressionAt, type Node,type Expression,ArrayExpression,type SpreadElement, type Property,Program} from "acorn"
import chokidar from 'chokidar';

import  cloneDeep  from 'lodash.clonedeep'
import {
  is_object,
  type s2t,
  mkdir_write_file,
  read_json_object ,
  type s2u,
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
  //const {full_pathname}=folder
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


function is_literal(ast:Expression,literal:string){
  if (ast.type==='Literal' && ast.value===literal)
    return true
}

function find_prop(ast:Expression,name:string){
  if (ast.type!=='ObjectExpression')
    return undefined
  console.log(ast)
  for (const prop of ast.properties)
    if (prop.type==='Property' && is_literal(prop.key,name))
      return prop.value
  return 
}
 class AstException extends Error {
  constructor(
    public message: string,
    public  ast: Node|Lstr
  ){
    super(message);
    this.name = "AstException";
  }
}

function read_prop(ast:Property|SpreadElement){
    if (
      ast.type!=="Property" || 
      ast.key.type!=='Literal' || 
      ast.value.type!=='Literal' || 
      typeof ast.key.value !=='string' ||
      typeof ast.value.value !=='string'
    )
      throw  new AstException('expecting "name"="value"',ast)
    return {key:ast.key.value,str:ast.value.value,...pk(ast,'start','end')}
}
function read_prop_any(ast:Property|SpreadElement){
  if (
    ast.type!=="Property" || 
    ast.key.type!=='Literal' || 
    typeof ast.key.value !=='string'
  )
    throw  new AstException('expecting "name"=value',ast)
  
  return {
    key:ast.key.value,
    value:ast.value
  }
}
function get_array(ast:Expression,full_pathname:string):Lstr[]{
  if (ast.type==="Literal" && typeof ast.value ==="string"){
    const location={
      str:ast.value,
      full_pathname,
      ...pk(ast,'start','end')
    }
    return [location]
  }
  const ans:Lstr[]=[]  
  if (ast.type==="ArrayExpression"){
    for (const elem of ast.elements){
      if (elem==null)
        throw new AstException('null supported here',ast)
      if (elem.type==="SpreadElement")
        throw new AstException('spread element not supported here',elem)
      if (elem.type!=='Literal' || typeof elem.value!=='string')
        throw new AstException('expecting string here',elem)
      ans.push({
        str:elem.value,
        full_pathname,
        ...pk(ast,'start','end')
      })
    }
  }
  return ans
}
function make_unique(ar:Lstr[][]):Lstr[]{
  const ans:s2t<Lstr>={}
  for (const a of ar)
    for (const b of a)
      ans[b.str]=b
  return Object.values(ans)
}

function resolve_vars(vars:s2t<Lstr[]>,ast:Expression){
    function resolve(a:Lstr|Lstr[]){
      const visiting=new Set<string>
      function f(a:Lstr|Lstr[]):Lstr[]{
        if (Array.isArray(a))
          return make_unique(a.map(f))
        if (!a.str.startsWith('$'))
          return [a]
        if (visiting.has(a.str))
          throw new AstException(`${a.str}:circular reference`,ast)
        visiting.add(a.str)
        const reference=vars[a.str]
        if (reference==null)
          throw new AstException(`${a.str} undefined`,a)
        const ans2=f(reference)
        visiting.delete(a.str)
        return ans2
      }
      return f(a)
    }
    const ans:s2t<Lstr[]>={}    
    for (const [k,v] of Object.entries(vars)){
      const resolved=resolve(v)
      ans[k]=resolved
    }
    return ans
}
interface Watchers{
  watches:s2t<Lstr[]>,
  autowatch_scripts:string[]  
}
export function parse_watchers(
  ast: Expression,
  full_pathname:string
):Watchers { 
  const scriptsmon=find_prop(ast,'scriptsmon')
  if (scriptsmon==null){
    return {
      watches:{},
      autowatch_scripts:[]
    }
  }
  const autowatch=find_prop(scriptsmon,'autowatch')
  const watch=find_prop(scriptsmon,'watch')
  const vars:s2t<Lstr[]>={}
  const scripts=new Set<string>
  function collect_vars(ast:Expression|undefined){
    if (ast==null)
      return
    if (ast.type!=='ObjectExpression')
      return    
    for (const propast of ast.properties){
      const {key,value}=read_prop_any(propast)
      const ar=get_array(value,full_pathname)
      //if (key.startsWith('$')) //index all
      if (vars[key]!==undefined)
        throw new AstException(`duplicate value: ${key}`,propast)
      for (const subk of key.split(',')){ //so multiple scripts can easily have the save watched
        scripts.add(subk)
        vars[subk]=ar
      }
    }
  }
  collect_vars(autowatch)
  const autowatch_scripts=[...scripts]
  collect_vars(watch)
  return {
    watches:resolve_vars(vars,ast),
    autowatch_scripts
  }
}

export function parse_scripts2(
  ast: Expression,
  full_pathname:string
): s2t<Lstr> { 
  const ans:s2t<Lstr>={}
  const scripts=find_prop(ast,'scripts')
  if (scripts==null)
    return ans
  if (scripts.type!=='ObjectExpression')
    return ans
  //console.log(ast)
  for (const propast of scripts.properties){
    const {start,end,key,str}=read_prop(propast)
    ans[key]={str,start,end,full_pathname}
  }
  return ans
}


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
  await new Promise((resolve, _reject) => { 
    const {full_pathname,runs,name}=runner
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


function scriptsmon_to_runners(pkgPath:string,watchers:Watchers,scripts:s2t<Lstr>){
  const ans=[]
  for (const [name,script] of Object.entries(scripts)){

    //const script=scripts[name]
    if (script==null){
      console.warn(`missing script ${name}`)
      continue
    }
    const runner=function(){
      const full_pathname=path.dirname(pkgPath)
      const id=`${full_pathname} ${name}`.replaceAll(/\\|:/g,'-').replaceAll(' ','--')
      const effective_watch_rel=watchers.watches[name]||[]
      const effective_watch:Filename[]=effective_watch_rel.map(rel=>({rel,full:path.join(full_pathname,rel.str)}))
      const watched=watchers.autowatch_scripts.includes(name)
      const ans:Runner= {
        type:'runner',
        name,
        script,
        full_pathname,
        effective_watch,
        watched,
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
    const source=await fs.readFile(pkgPath,'utf-8')

    if (pkgJson==null||source==null)
      return null
    const ast = parseExpressionAt(source, 0, {
      ecmaVersion: "latest",
    });
 
    
    console.warn(`${green}${pkgPath}${reset}`)

    //const scripts=parse_scripts2(ast)
    const scripts=parse_scripts2(ast,pkgPath)
    const watchers=parse_watchers(ast,pkgPath)
    const runners=scriptsmon_to_runners(pkgPath,watchers,scripts)
    const {workspaces} = pkgJson
    const folders=[] 
    if (is_string_array(workspaces))
      for (const workspace of workspaces){
          const ret=await f(path.join(full_pathname,workspace),workspace)
          if (ret!=null)
            folders.push(ret)
        }

    
    const ans:Folder= {runners,folders,name,full_pathname,type:'folder',id:full_pathname}
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
    type:'folder'
  }
  //const keys=Object.keys(ans)
  //const common_prefix=getCommonPrefix(keys)
  //const extra={keys,common_prefix}
  //await mkdir_write_file('generated/extra.json',JSON.stringify(extra,null,2))

  return root
}
function find_runners(root:Folder,filter:(x:Runner)=>boolean){
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
function collect_watch_dirs(root:Folder){
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
interface RunnerWithReason{
  runner:Runner
  reason:string
}
function get_runners_by_changed_dirs(root:Folder,changed_dirs:Set<string>){
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
export class Monitor{
  runner_ctrl=make_runner_ctrl()
  root?:Folder
  watched_dirs=new Set<string>()
  changed_dirs=new Set<string>()
  watched_runners:Runner[]=[]
  constructor(
    public full_pathnames:string[]
  ){
  }
  async read_package_json(){
    this.root= await read_package_json(this.full_pathnames)
    this.watched_dirs=collect_watch_dirs(this.root)
    this.watched_runners=find_runners(this.root,(x)=>x.watched)
    await mkdir_write_file('.\\generated\\packages.json',to_json(this))
    
  }
  get_root(){
    if (this.root==null) 
      throw new Error("Monitor not initialied succsfuly")
    return this.root    
  }
  async run_runner(runner_id:string,reason:string){
    const {runner_ctrl}=this
    const runner=find_runner(this.get_root(),runner_id)
    if (runner==null)
      throw new Error(`runnwe is not found:${runner_id}`)
    await run_runner({runner,reason,runner_ctrl})
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
        void this.run_runner(runner.id,reason)
      }
      this.changed_dirs.clear()
    },100)
    for (const runner of this.watched_runners)
      void this.run_runner(runner.id,"start")
  }
}