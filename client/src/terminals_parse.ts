import {type AnsiInsertCommand,parse_group_string} from './terminals_ansi.js'
import {re} from './dom_utils.js'
import type {ParseRange} from './terminal.js'

const links_regex_old = re('g')`
  (?<source_file>              #capture group source_file
    (?<![.a-zA-Z]) 
    ([a-zA-Z]:)?               #optional drive char followed by colon
    [a-zA-Z0-9_/\\@.-]+        #one or more file name charecters
    [.]
    [a-zA-Z0-9]+
    (?![.])                    #disallow dot immediatly after the match
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
  )?`     
function capture(name:string){
  return function(...content:string[]){
    return `(?<${name}>${content.join('')})`
  }
}
  //const links_regex2 = re('g')
function neg_lookahead(...pat:string[]){
  return `(?!${pat.join('')})`
}
function neg_lookbehind(...pat:string[]){
  return `(?<!${pat.join('')})`
}
function seq(...pat:string[]){
  return `(${pat.join('')})`
}
function or(...pat:string[]){
  return `(${pat.join('|')})`
}
function make_re(flags:string){
  return function(...pat:string[]){
    return new RegExp(pat.join(''),flags)
  }
}

const r = String.raw;
const digits=r`\d+`
const row=capture('row')(digits)
const col=capture('col')(digits)
const optional_rowcol=seq(
  or(
    seq(r`\(`,row,',',col,r`\)`),
    seq(':',row,':',col),
  ),
  '?'
)
const links_regex=make_re('g')(
  capture('source_file')(            // capture group source_file
    neg_lookbehind(`[.a-zA-Z]`),
    `([a-zA-Z]:)?`,               //optional drive char followed by colon
    r`[a-zA-Z0-9_/\\@.-]+`,        //one or more file name charecters
    `[.]`,
    `[a-zA-Z0-9]+`,
    neg_lookahead('[.]')                    //disallow dot immediatly after the match
  ),
  optional_rowcol
)

const ancor_regex=make_re('g')(
  '^',
  capture('source_file')(
    '([a-zA-Z]:)?',
    r`[a-zA-Z0-9_\-./\\@]+`,
  ),
  optional_rowcol,
  r`\s*$`
)

const ref_regex = /^\s*(?<row>\d+):(?<col>\d+)(.*)/
interface IlinkData{
  start:number
  end:number
  row:number
  col:number
  source_file:string
}


function no_nulls(obj: Record<string, string|undefined>){
  const ans:Record<string,string>={}
  for (const [k,v] of Object.entries(obj))
    if (v!=null)
      ans[k]=v
  return ans
}


function calc_match(match:RegExpMatchArray):ParseRange{
  const { index} = match;
  const text = match[0];
  const start= index!
  const end= index! + text.length
  const row= parse_group_string(match,'row')
  const col= parse_group_string(match,'col')
  const source_file=parse_group_string(match,'source_file')
  return {start,end,values:no_nulls({row,col,source_file})}
}
export function parse_to_ranges(input:string,parser_state:string|undefined){
  const ranges:ParseRange[]=[]
  const ancor_match=input.match(ancor_regex)
  if (ancor_match!=null){
    const ret=calc_match(ancor_match)
    ranges.push(ret)
    return {parser_state:ret.values.source_file,ranges}
  }
  if (parser_state!=null){
    const ref_match = input.match(ref_regex)
    if (ref_match!==null){
      const range=calc_match(ref_match)
      const {values}=range
      ranges.push({
        ...calc_match(ref_match), //by theoram will source_file will be empty string at this line, overriden by the next
        values:{...values,source_file:parser_state}
      })
      return {parser_state,ranges}
    }
  }

  for (const match of input.matchAll(links_regex)){
      parser_state=undefined //if found link than cancel the ancore otherwize let it be
      ranges.push(calc_match(match))
  }
  return {ranges,parser_state}
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
function is_string_or_undefined(x:unknown): x is string|undefined{
  return  typeof x === 'string' || x === undefined;
}
export function parse_line(line:string,parser_state:unknown){
  if (!is_string_or_undefined(parser_state))
    throw new Error("expecting string or undefined")
  return parse_to_ranges(line,parser_state)
}