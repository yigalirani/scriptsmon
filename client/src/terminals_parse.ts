import type {AnsiInsertCommand} from './terminals_ansi.js'
import {regex} from 'regex';
const links_regex = regex('g')`
  (?<source_file>               #capture group source_file
    ([a-zA-Z]:)?                #optional drive char followed by colon
    [a-zA-Z0-9_\-.\/\\@]+       #one or more file name charecters
  )
  (
    (   #optional row/col biome style :3:5
      :
      (?<row>\d+)
      :
      (?<col>\d+)
    )|(
      \(
      (?<row>\d+)
      ,
      (?<col>\d+)
      \)
    )
  )?               `              
const ancor_regex = /^(?<source_file>([a-zA-Z]:)?[a-zA-Z0-9_\-./\\@]+)(:(?<row>\d+))?(:(?<col>\d+))?\s*$/;
const ref_regex = /^\s*(?<row>\d+):(?<col>\d+)(.*)/
interface IlinkData{
  start:number
  end:number
  row:number
  col:number
  source_file:string
}
type GroupType= {
    [key: string]: string;
} | undefined
function parse_group_int(groups:GroupType,name:string){
  if (groups==null)
    return 0
  const str=groups[name]||''
  return parseInt(str, 10)||0 
}
function parse_group_string(groups:GroupType,name:string){
  if (groups==null)
    return ''
  const str=groups[name]||''
  return str
}
function calc_match(match:RegExpMatchArray):IlinkData{
  const { index,groups} = match;
  const text = match[0];
  const start= index!
  const end= index! + text.length
  const row= parse_group_int(groups,'row')
  const col= parse_group_int(groups,'col')
  const source_file=parse_group_string(groups,'source_file')
  return {start,end,row,col,source_file}
}
export function parse_to_links(input:string,ancore:string|undefined){
  const links:IlinkData[]=[]
  const ancor_match=input.match(ancor_regex)
  if (ancor_match!=null){
    const ret=calc_match(ancor_match)
    const {source_file:ancore}=ret
    links.push(ret)
    return {ancore,links}
  }
  if (ancore!=null){
    const ref_match = input.match(ref_regex)
    if (ref_match!==null){
      links.push({
        ...calc_match(ref_match), //by theoram will source_file will be empty string at this line, overriden by the next
        source_file:ancore
      })
      return {ancore,links}
    }
  }

  for (const match of input.matchAll(links_regex)){
      ancore=undefined //if found link than cancel the ancore otherwize let it be
      links.push(calc_match(match))
  }
  return {links,ancore}
}
function link_to_replacemnt(link:IlinkData):AnsiInsertCommand[]{
  const {start,end,source_file,row,col}=link
  const open=`<span data-source_file='${source_file}' data-row='${row}' data-col='${col}'>`
  const close=`</span>`
  return [{position:start,str:open,command:'insert'},{position:end,str:close,command:'insert'}]
}
function merge_replacements(inserts:Array<AnsiInsertCommand>){
  const ans=[]
  for (const x of inserts){
    const last_item=ans.at(-1)
    if (x.position===last_item?.position)
      last_item.str+=x.str
    else
      ans.push(x)
  }
  return ans
}
export function parse(line:string,old_ancore:string|undefined){
  const {links,ancore}=parse_to_links(line,old_ancore)
  const replacments=merge_replacements(links.flatMap(link_to_replacemnt))
  return {replacments,ancore}
}