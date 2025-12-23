import * as path from "node:path";
import * as fs from "node:fs/promises";
//simport * as fsSync from "node:fs";
import type {Runner,Folder,Filename,Lstr} from './data.js'
import {parseExpressionAt, type Node,type Expression,type SpreadElement, type Property} from "acorn"

import {
  type s2t,
  read_json_object ,
  reset,
  green,
  is_string_array,
  pk
} from "@yigal/base_types";



function is_literal(ast:Expression,literal:string){
  if (ast.type==='Literal' && ast.value===literal)
    return true
}

function find_prop(ast:Expression,name:string){
  if (ast.type!=='ObjectExpression')
    return
  console.log(ast)
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
function parse_watchers(
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

function parse_scripts2(
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

 export async function read_package_json(
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
    const source=await fs.readFile(pkgPath,'utf8')

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

