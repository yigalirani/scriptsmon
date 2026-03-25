import ansiRegex from 'ansi-regex';
const ansi_regex=ansiRegex()
type font_style = 'bold' | 'italic' |'faint'| 'underline' | 'blinking' | 'inverse' | 'strikethrough';

export interface Style {
  foreground: string | undefined;
  background: string | undefined;
  font_styles: Set<font_style>;
}
type AnsiCommandType='style'|'insert'|'style_insert'
interface AnsiCommand{
  position: number;
  command:AnsiCommandType
}

interface AnsiStyleCommand extends AnsiCommand{
  command:'style'
  style:Style
}
function make_clear_style_command(position:number):AnsiStyleCommand{
  return {
    command:'style',
    position,
    style:{
      foreground:undefined,
      background:undefined,
      font_styles: new Set()
    }
  }
}
export interface AnsiInsertCommand extends AnsiCommand{
  command:'insert'
  str:string
}
export interface AnsiStyleInsertCommand extends AnsiCommand{
  command:'style_insert'
  str:string,
  style:Style
}
function is_style_command(a:AnsiCommand|undefined):a is AnsiStyleCommand{
  return a?.command==="style"
}
function is_insert_command(a:AnsiCommand|undefined):a is AnsiInsertCommand{
  return a?.command==="insert"
}
function is_style_insert_command(a:AnsiCommand|undefined):a is AnsiStyleInsertCommand{
  return a?.command==="style_insert"
}

function check_inserts_validity(inserts: Array<AnsiInsertCommand>): void {
  let last_end = -1;
  for (const r of inserts) {
    if (r.position <= last_end)
      throw new Error("Replacements cannot overlap and must be sorted");
    last_end = r.position;
  }
}

function check_style_positions_validity(style_positions: Array<AnsiStyleCommand>): void {
  let last_pos = -1;
  for (const s of style_positions) {
    if (s.position < last_pos)
      throw new Error("Style positions must be sorted");
    last_pos = s.position;
  }
}

function get_style_css(style: Style|undefined): string {
  if (style==null)
    return ''
  const css_parts: string[] = [];
  let {foreground,background}=style;

  // Handle 'inverse' by swapping colors (destructured for single statement)
  if (style.font_styles.has('inverse'))
    [foreground, background] = [background, foreground];
  if (style.font_styles.has('faint'))
    css_parts.push(`opacity:.5`);
  if (foreground!=null)
    css_parts.push(`color:${foreground}`);
  if (background!=null)
    css_parts.push(`background-color:${background}`);
  if (style.font_styles.has('bold'))
    css_parts.push(`font-weight:bold`);
  if (style.font_styles.has('italic'))
    css_parts.push(`font-style:italic`);

  const decorations: string[] = [];
  if (style.font_styles.has('underline'))
    decorations.push('underline');
  if (style.font_styles.has('strikethrough'))
    decorations.push('line-through');
  if (style.font_styles.has('blinking'))
    decorations.push('blink');
  
  if (decorations.length > 0)
    css_parts.push(`text-decoration:${decorations.join(' ')}`);
  if (css_parts.length===0)
    return ''
  return `style='${css_parts.map(x=>`${x};`).join('')}'`
}
function is_clear_style(style:Style){
  return style.background==null&&style.foreground==null&&style.font_styles.size===0
}

function merge_one(a:AnsiCommand,b:AnsiCommand):AnsiStyleInsertCommand{
  if (is_style_command(a)&&is_insert_command(b) ){  
    return {
      command:"style_insert",
      position:a.position,
      style:a.style,
      str:b.str
    }
  }
  if (is_style_command(b)&&is_insert_command(a) ){  
    return {
      command:"style_insert",
      position:a.position,
      style:b.style,
      str:a.str
    }
  }  
  throw new Error("unexpected ansi structure")  
}
export function merge_inserts(a:Array<AnsiInsertCommand>,b:Array<AnsiInsertCommand>){
  const ans=[...a,...b].toSorted((a, b)=>a.position-b.position) //todo: marge faster using the fact that a and b are sorted by themself, or maybe that automaticly faster
  return ans
}
export function merge(a:Array<AnsiCommand>,b:Array<AnsiCommand>){
  const sorted=[...a,...b].toSorted((a, b)=>a.position-b.position) //todo: marge faster using the fact that a and b are sorted by themself, or maybe that automaticly faster
  const ans:Array<AnsiCommand>=[]
  for (const x of sorted){
    const last_index:number=ans.length - 1
    const last_item=ans[last_index]
    if(last_item?.position===x.position)
      ans[last_index] = merge_one(last_item,x)
    else
      ans.push(x)
  }
  return ans
}
export function generate_html({
  style_positions,
  inserts,
  plain_text
}: {
  inserts: Array<AnsiInsertCommand>
  style_positions: Array<AnsiStyleCommand>
  plain_text: string
}): string{
  check_inserts_validity(inserts);
  if (style_positions[0]?.position!==0)
    style_positions=[...style_positions]
  check_style_positions_validity(style_positions);
  const commands=merge(inserts,style_positions)
  const html:string[]= [];

  let command_head = 0;
  let pushed_style:Style|undefined
  function push_style(style:Style){
    if (pushed_style!=null){
      throw new Error("style alreay open")
    }    
    html.push(`<span ${get_style_css(style)}>`);
    pushed_style=style
  }
  function pop_style(allow_empty:boolean){ 
    if (pushed_style==null){
      if (allow_empty)
        return make_clear_style_command(0).style
      throw new Error("unexpected null style")
    }
    const ans=pushed_style
    pushed_style=undefined
    html.push(`</span>`);
    return ans
  }
  function get_command(position:number){
    for(;;){
      const ans=commands[command_head]
      if (ans==null)
        return 
      if (ans.position===position)
        return ans
      if (ans.position>position)
        return
      command_head++
    }
  }
  for (let i = 0; i <= plain_text.length; i++) {
    const command=get_command(i)
    if (is_insert_command(command)){
      const style=pop_style(i===0)
      html.push(command.str)
      push_style(style)
    }
    if (is_style_command(command)){
      pop_style(i===0)
      push_style(command.style)
    }
    if (is_style_insert_command(command)){
      pop_style(i===0)
      html.push(command.str)
      push_style(command.style)      
    }
    const c=plain_text[i]!
    html.push(c)
  }
  pop_style(plain_text.length===0)
  const ans=html.join('')
  return ans
}

/**
 * Maps standard ANSI color codes to CSS named colors.
 */
function getAnsiNamedColor(code: number): string {
  const map: Record<number, string> = {
    0: "black", 1: "red", 2: "green", 3: "yellow", 4: "blue", 5: "magenta", 6: "cyan", 7: "white",
    8: "gray", 9: "red", 10: "lime", 11: "yellow", 12: "blue", 13: "fuchsia", 14: "aqua", 15: "white"
  };
  return map[code] || "white";
}

/**
 * Converts 8-bit ANSI (0-255) to a CSS color string.
 */
function get8BitColor(n: number): string {
  if (n < 16) return getAnsiNamedColor(n);
  if (n >= 232) {
    const v = (n - 232) * 10 + 8;
    return `rgb(${v},${v},${v})`;
  }
  const n2 = n - 16;
  const r = Math.floor(n2 / 36) * 51;
  const g = Math.floor((n2 % 36) / 6) * 51;
  const b = (n2 % 6) * 51;
  return `rgb(${r},${g},${b})`;
}

function clone_style(style: Style): Style {
  // Requirement: if all font styles are normal, don't report 'normal'
  return {...style,font_styles:new Set(style.font_styles)}
}

function is_same_style(a: Style|undefined, b: Style): boolean {
  if (a == null)
    return false
  if (a.foreground !== b.foreground || a.background !== b.background)
    return false
  if (a.font_styles.size !== b.font_styles.size)
    return false
  for (const style of a.font_styles)
    if (!b.font_styles.has(style))
      return false
  return true
}

function applySGRCode(params: number[], style: Style): void {
  //todo goto and verify that correct https://stackoverflow.com/questions/4842424/list-of-ansi-color-escape-sequences
  let i = 0;
  while (i < params.length) {
    const code = params[i]!;

    if (code === 0) {
      style.foreground = undefined;
      style.background = undefined;
      style.font_styles.clear();
      i++;
      continue;
    }

    // Font Styles
    if (code === 1) { style.font_styles.add('bold'); i++; continue; }
    if (code === 2) { style.font_styles.add('faint'); i++; continue; }
    if (code === 3) { style.font_styles.add('italic'); i++; continue; }
    if (code === 4) { style.font_styles.add('underline'); i++; continue; }
    if (code === 5) { style.font_styles.add('blinking'); i++; continue; }
    if (code === 7) { style.font_styles.add('inverse'); i++; continue; }
    if (code === 9) { style.font_styles.add('strikethrough'); i++; continue; }
    if (code === 22) { style.font_styles.delete('faint');style.font_styles.delete('bold'); i++; continue; }

    // Foreground (Standard & Bright)
    if (code >= 30 && code <= 37) { style.foreground = getAnsiNamedColor(code - 30); i++; continue; }
    if (code >= 90 && code <= 97) { style.foreground = getAnsiNamedColor(code - 90 + 8); i++; continue; }
    if (code === 39) { style.foreground = undefined; i++; continue; }

    // Background (Standard & Bright)
    if (code >= 40 && code <= 47) { style.background = getAnsiNamedColor(code - 40); i++; continue; }
    if (code >= 100 && code <= 107) { style.background = getAnsiNamedColor(code - 100 + 8); i++; continue; }
    if (code === 49) { style.background = undefined; i++; continue; }

    // Extended Colors (38=FG, 48=BG)
    if (code === 38 || code === 48) {
      const target = code === 38 ? 'foreground' : 'background';
      const type = params[i + 1];

      if (type === 5) { // 8-bit
        style[target] = get8BitColor(params[i + 2]!);
        i += 3;
        continue;
      }
      if (type === 2) { // 24-bit
        style[target] = `rgb(${params[i + 2]},${params[i + 3]},${params[i + 4]})`;
        i += 5;
        continue;
      }
    }

    i++;
  }
}
function dedup_positions(style_positions:Array<AnsiStyleCommand>){
  const ans=[]
  let last:AnsiStyleCommand|undefined
  for (const x of style_positions){
    const same=is_same_style(last?.style,x.style)
    last=x
    if (!same)
      ans.push(x)
  }
  return ans
}
export function strip_ansi(text: string, start_style: Style){
  const style_positions: Array<AnsiStyleCommand> = [];
  const strings=[]
  const current_style = { ...start_style, font_styles: new Set(start_style.font_styles) };
  const link_inserts:Array<AnsiInsertCommand>=[]

  let last_index = 0;
  let position=0

  for (const match of text.matchAll(ansi_regex)){
    // 1. Accumulate plain text
    const {index}=match
    const skip_str=text.slice(last_index, index)
    position+=skip_str.length
    strings.push(skip_str)
    

    const sequence = match[0];
    last_index = index+sequence.length
    // 2. Filter for SGR only (ESC [ ... m)
    /*if link than create a parseRange and return it. remove all link text from plain_text*/
    if (!sequence.startsWith('\x1b[') || !sequence.endsWith('m')) {
      continue;
    }

    // 3. Parse parameters
    const params = sequence.slice(2, -1).split(';').map(p => parseInt(p || "0", 10));
    applySGRCode(params, current_style);

    // 4. Capture state
    const cloned:AnsiStyleCommand={style:clone_style(current_style),position,command:'style'}
    const last_style=style_positions.at(-1)
    if (is_same_style(last_style?.style, cloned.style))
        continue
    if (last_style?.position===position) {
      style_positions.splice(-1,1,cloned)
      continue
    }
    style_positions.push(cloned)
    //if (is_same_style(style_positions.at(-1),style_positions.at(-2)))
    //console.log('after_bug')
  }
  const deduped=dedup_positions(style_positions)//dedup_positions is needed even thoow we knowen out a few above 
  const with_pos0=function(){ //i want a style at pos 0 to help the logic of genetate_html
    if (deduped[0]?.position!==0)
      return [make_clear_style_command(0),...deduped]
    return deduped
  }()
  const ans= {
    plain_text:strings.join('')+text.slice(last_index),
    style_positions:with_pos0,
    link_inserts
  }; 
  //console.log(ans)
  return ans
}