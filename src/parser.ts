import * as path from "node:path";
import * as fs from "node:fs/promises";
import type {Runner,Folder,Filename,Lstr,Pos,RunnerBase} from './data.js'
import {parseExpressionAt, type Node,type Expression,type SpreadElement, type Property} from "acorn"
import {
  type s2t,
  reset,
  green,
  pk,
  get_error,
  is_object,
  is_atom,
  objects_only,
  default_get
} from "@yigal/base_types";
interface AcornSyntaxError extends SyntaxError {
  pos: number;        // same as raisedAt
  raisedAt: number;   // index in source string where error occurred
  loc?: {
    line: number;
    column: number;
  };
}
function is_acorn_error(e: unknown):e is AcornSyntaxError {
  return (
    e instanceof SyntaxError &&
    typeof (e as AcornSyntaxError).raisedAt === "number"
  );
}
export function find_base(root:Folder,id:string){
  function f(folder:Folder):RunnerBase|undefined{
    for (const ar of [folder.runners,folder.errors,folder.folders]){
      const ans=ar.find(x=>x.id===id)
      if (ans!=null)
        return ans
    }
    for (const subfolder of folder.folders){
      const ans=f(subfolder)
      if (ans!=null)
        return ans
    }
  }
  return f(root)
}
export function find_runner(root:Folder,id:string){
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
function is_literal(ast:Expression,literal:string){
  if (ast.type==='Literal' && ast.value===literal)
    return true
}
function find_prop(ast:Expression,name:string){
  if (ast.type!=='ObjectExpression')
    return
  //console.log(ast)
  for (const prop of ast.properties)
    if (prop.type==='Property' && is_literal(prop.key,name))
      return prop.value
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
function get_erray_mandatory(ast:Expression,source_file:string){
  const ans:Lstr[]=[]  
  if (ast.type==="ArrayExpression"){
    for (const elem of ast.elements){
      if (elem==null)
        throw new AstException('null not supported here',ast)
      if (elem.type==="SpreadElement")
        throw new AstException('spread element not supported here',elem)
      if (elem.type!=='Literal' || typeof elem.value!=='string')
        throw new AstException('expecting string here',elem)
      ans.push({
        str:elem.value,
        source_file,
        ...pk(elem,'start','end')
      })
    }
    return ans
  }
  throw new AstException('expecting array',ast)
}
function get_array(ast:Expression,source_file:string):Lstr[]{
  if (ast.type==="Literal" && typeof ast.value ==="string"){
    const location={
      str:ast.value,
      source_file,
      ...pk(ast,'start','end')
    }
    return [location]
  }
  return get_erray_mandatory(ast,source_file)
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
  tags:Record<string,string[]>
}
function collect_vars(ast:Expression|undefined,source_file:string){
  const vars:s2t<Lstr[]>={}
  const scripts=new Set<string>   
  //const ans={vars,scripts}
  if (ast==null)
    return vars
  if (ast.type!=='ObjectExpression')
    return vars
  for (const propast of ast.properties){
    const {key,value}=read_prop_any(propast)
    const ar=get_array(value,source_file)
    if (vars[key]!==undefined)
      throw new AstException(`duplicate value: ${key}`,propast)
    for (const subk of key.split(',')){ //so multiple scripts can easily have the save watched
      scripts.add(subk)
      vars[subk]=ar
    }
  }
  return vars
}
function make_empty_array(){
  return []
}
function parse_watchers(
  ast: Expression,
  source_file:string
):Watchers { 
  const scriptsmon=find_prop(ast,'scriptsmon')
  if (scriptsmon==null){
    return {
      watches:{},
      tags:{}
    }
  }
  //const autowatch=find_prop(scriptsmon,'autowatch')
  //const watch=find_prop(scriptsmon,'watch')
  const vars=collect_vars(scriptsmon,source_file)
  const watches=resolve_vars(vars,ast)
  const tags=function(){
    const ans:Record<string,string[]>={}
    //loop over all name, for those who start with #, loop over the result and add to ans
    for (const [k,ar] of Object.entries(watches)){
      if (k.startsWith('#')){
        const tag=k.slice(1)
        for (const script of ar){
          default_get(ans,script.str,make_empty_array).push(tag)
        }
        //continue
      }
      /*if (ar.length!==0){
        default_get(ans,k,make_empty_array).push("watchable")
      }
      else{
        default_get(ans ,k,make_empty_array).push("nonwatchable")
      }*/
    }
    return ans
  }()
  return {
    watches,
    tags
  }
}
function parse_scripts2(
  ast: Expression,
  source_file:string
): s2t<Lstr> { 
  const ans:s2t<Lstr>={}
  const scripts=find_prop(ast,'scripts')
  if (scripts==null)
    return ans
  if (scripts.type!=='ObjectExpression')
    return ans
  for (const propast of scripts.properties){
    const {start,end,key,str}=read_prop(propast)
    ans[key]={str,start,end,source_file}
  }
  return ans
}
function escape_id(s:string){
  return s.replaceAll(/\\|:|\//g,'-').replaceAll(' ','--')
}
function scriptsmon_to_runners(source_file:string,watchers:Watchers,scripts:s2t<Lstr>){
  const ans=[]
  for (const [name,script] of Object.entries(scripts)){
    if (script==null){
      console.warn(`missing script ${name}`)
      continue
    }
    const runner=function(){
      const workspace_folder=path.dirname(source_file)
      const id=escape_id(`${workspace_folder} ${name}`)
      const effective_watch_rel=watchers.watches[name]??[]
      const effective_watch:Filename[]=effective_watch_rel.map(rel=>({rel,full:path.join(workspace_folder,rel.str)}))
      //const watched_default=watchers.autowatch_scripts.includes(name)
      const tags=watchers.tags[name]||[]
      const ans:Runner= {
        //ntype:'runner',
        pos: script,
        need_ctl:true,
        name,
        script:script.str,
        workspace_folder,
        effective_watch,
        //watched_default,
        id,
        tags
        //watched:false
      } 
      return ans
    }()
    ans.push(runner)
  }
  return ans
}   

function calc_pos(ex:Error){
  if (ex instanceof AstException)
    return pk(ex.ast,'start','end')
  if (is_acorn_error(ex)){
    const start=ex.pos
    const end=ex.raisedAt
    return {start,end}
  }
}
export async function read_package_json(
  workspace_folders: string[]
):Promise<Folder> {
  const folder_index: Record<string, Folder> = {}; //by full_pathname
  async function read_one(workspace_folder: string,name:string,pos?:Pos):Promise<Folder>{
    const ans:Folder= {
        runners:[],
        folders:[],
        name,
        workspace_folder,/*ntype:'folder',*/
        id:escape_id(workspace_folder),
        pos,
        need_ctl:true,
        errors:[]
    }
    const source_file = path.resolve(path.normalize(workspace_folder), "package.json");
    try{

      const d= path.resolve(source_file);
      const exists=folder_index[d]
      if (exists!=null){
        console.warn(`${source_file}: skippin, already done`)
        return exists
      }    
      //const pkgJson = await 
      const source=await fs.readFile(source_file,'utf8')
      const ast = parseExpressionAt(source, 0, {
        ecmaVersion: "latest",
      });
      console.log(`${green}${source_file}${reset}`)
      const scripts=parse_scripts2(ast,source_file)
      const watchers=parse_watchers(ast,source_file)
      ans.runners=scriptsmon_to_runners(source_file,watchers,scripts)
      const workspaces_ast=find_prop (ast,'workspaces')
      const workspaces=workspaces_ast?get_erray_mandatory(workspaces_ast,source_file):[]
      ans.folders=[] 
      {
        const promises=[]
        for (const workspace of workspaces)
            promises.push(read_one(path.join(workspace_folder,workspace.str),workspace.str,workspace))
        for (const ret of await Promise.all(promises))
          if (ret!=null)
              ans.folders.push(ret)
      }
      return ans
    }catch(ex){
      const ex_error=get_error(ex)
      const pos:Pos={source_file,...calc_pos(ex_error)}
      console.log({pos})
      ans.errors=[{
          pos,
          id:`${ans.id}error`,
          need_ctl:false,
          message:ex_error.message
  }
      ]
      return ans
    }
  }
  const folders=[]
  const promises=[]
  for (const workspace_folder of workspace_folders){
    //const full_pathname=path.resolve(pathname)
    promises.push(read_one(workspace_folder,path.basename(workspace_folder)))
  }
  for (const ret of await Promise.all(promises))
    if (ret!=null)
      folders.push(ret)
  const root:Folder={
    name:'root',
    id:'root',
    workspace_folder: '',
    folders,
    runners:[],//,
    need_ctl:true,
    pos:undefined,
    errors:[]
    //ntype:'folder'
  }
  return root
}
function no_cycles(x:unknown){
   const ws=new WeakSet
   function f(v:unknown):unknown{
    if (typeof v === "function")
      return '<function>'
    if (v instanceof Set)
      return [...v].map(f)
    if (v==null||is_atom(v))
      return v
    if (ws.has(v))
      return '<cycle>'
    ws.add(v)    
    const ans=function (){
      if (Array.isArray(v))
        return v.map(f)
      if (is_object(v)){
        return Object.fromEntries(Object.entries(v).map(([ k, v]) => [k, f(v)]))
      }
      return v.constructor.name||"<unknown type>"
    }()
    ws.delete(v)
    return ans
   }
   return f(x)
}
export function to_json(x:unknown,skip_keys:string[]=[]){
 
  function set_replacer(k:string,v:unknown){
    if (skip_keys.includes(k))
      return '<skipped>'
    return v 
  }
  const x2=no_cycles(x)
  const ans=JSON.stringify(x2,set_replacer,2).replace(/\\n/g, '\n');
  return ans
}