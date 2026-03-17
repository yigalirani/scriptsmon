type font_style = 'normal' | 'bold' | 'italic' | 'underline' | 'blinking' | 'inverse' | 'strikethrough';

export interface Style {
  foreground: string | undefined;
  background: string | undefined;
  font_styles: Set<font_style>;
}

interface StylePosition extends Style {
  position: number;
}
export interface Replacement{
  pos:number
  str:string
}
/*export function _generate_html({start_style,style_positions,replacments,plain_text}:{
  start_style:Style
  replacments:Array<Replacement>
  style_positions: Array<StylePosition>
  plain_text:string
}):{
  html:string,
  end_style:Style
}{
  position in StylePosition, start,end in Replacement all refer to postion in plain_text
  open and close in Replacement means the text that should be inserted 
  perform the replacement but also add divs to apply styles in style_positions, 
  the style in StylePosition sets the style starting at plain_text postion until the end undefined values foreground,background measns stay with the same stle
  return html and end postion
  use snake_case for everything except class and interfaces
  if using helper function define them outside the main function

  its is guranteeds not to have two overkapping replacements. start <end always. add a sanity function to check that 
  style_positions are sorted by position. replacments are sorted by start. no two replacements have the same position add sanity functions to check that

  when genrating the html first create an array of substrings then join it -for permormance
  i just need the implmenation , dont regenerate the existing definitions
  dont use else
    when creating set pass along the initaal members rather then adding them immidiatly
    dont use braces for bocks that have just one statement. put the single statmente in a new line indented 
  

}*/

function check_replacements_validity(replacments: Array<Replacement>): void {
  let last_end = -1;
  for (const r of replacments) {
    if (r.pos < last_end)
      throw new Error("Replacements cannot overlap and must be sorted");
    last_end = r.pos;
  }
}

function check_style_positions_validity(style_positions: Array<StylePosition>): void {
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
  let fg = style.foreground;
  let bg = style.background;

  // Handle 'inverse' by swapping colors (destructured for single statement)
  if (style.font_styles.has('inverse'))
    [fg, bg] = [bg, fg];

  if (fg)
    css_parts.push(`color:${fg}`);
  if (bg)
    css_parts.push(`background-color:${bg}`);
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
  if (css_parts.length)
    return ''
  return `style="${css_parts.join(';')}"`
}
function is_clear_style(style:Style){
  return style.background==null&&style.foreground==null&&style.font_styles.size===0
}
export function generate_html({
  style_positions,
  replacments,
  plain_text
}: {
  replacments: Array<Replacement>
  style_positions: Array<StylePosition>
  plain_text: string
}): string{
  check_replacements_validity(replacments);
  check_style_positions_validity(style_positions);
  const html:string[]= [];

  let style_head = 0;
  let repl_head = 0;
  let num_open=0
  function open_style(pos:number){
    if (num_open>0){
      throw "style alreay open"
    }
    while(true){
      if (style_head+1>=style_positions.length)
        break
      if (style_positions[style_head]?.position===pos)
        break
      style_head++
    }
    const cur_style=style_positions[style_head]
    if (cur_style==null||is_clear_style(cur_style))
      return
    html.push(`<div "${get_style_css(cur_style)}">`);
    num_open++
  }
  function close_style(){
    if (num_open===0)
      return
    num_open--
    html.push(`</div>`);
  }

  for (let i = 0; i <= plain_text.length; i++) {
    const cur_replacement=replacments[repl_head]
    if (cur_replacement?.pos===i){
      close_style()
      html.push(cur_replacement.str)
      open_style(i)
      repl_head++
    }
    const c=plain_text[i]
    if (c!=null)
      html.push(c)

  }
  close_style()
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

function cloneStyle(style: Style): Style {
  // Requirement: if all font styles are normal, don't report 'normal'
  const styles = new Set(style.font_styles);
  styles.delete('normal'); 

  return {
    foreground: style.foreground,
    background: style.background,
    font_styles: styles,
  };
}

function applySGRCode(params: number[], style: Style): void {
  let i = 0;
  while (i < params.length) {
    const code = params[i]!;

    if (code === 0) {
      style.foreground = undefined;
      style.background = undefined;
      style.font_styles.clear();
      style.font_styles.add('normal');
      i++;
      continue;
    }

    // Font Styles
    if (code === 1) { style.font_styles.add('bold'); i++; continue; }
    if (code === 3) { style.font_styles.add('italic'); i++; continue; }
    if (code === 4) { style.font_styles.add('underline'); i++; continue; }
    if (code === 5) { style.font_styles.add('blinking'); i++; continue; }
    if (code === 7) { style.font_styles.add('inverse'); i++; continue; }
    if (code === 9) { style.font_styles.add('strikethrough'); i++; continue; }

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

export function strip_ansi(text: string, start_style: Style): {
  plain_text: string,
  style_positions: Array<StylePosition>
} {
  const style_positions: Array<StylePosition> = [];
  let plain_text = "";
  const current_style = { ...start_style, font_styles: new Set(start_style.font_styles) };

// Regex matches ALL ANSI sequences (CSI, OSC, etc.)
  const ansi_regex = /[\u001b\u009b](?:\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\][^\x07\x1b]*[\x07\x1b\\]|[@-_][0-?]*[ -/]*[@-~])/g;

  let last_index = 0;
  let match: RegExpExecArray | null;

  while ((match = ansi_regex.exec(text)) !== null) {
    // 1. Accumulate plain text
    plain_text += text.slice(last_index, match.index);
    last_index = ansi_regex.lastIndex;

    const sequence = match[0];

    // 2. Filter for SGR only (ESC [ ... m)
    if (!sequence.startsWith('\x1b[') || !sequence.endsWith('m')) {
      continue;
    }

    // 3. Parse parameters
    const params = sequence.slice(2, -1).split(';').map(p => parseInt(p || "0", 10));
    applySGRCode(params, current_style);

    // 4. Capture state
    style_positions.push({
      ...cloneStyle(current_style),
      position: plain_text.length
    });
  }

  plain_text += text.slice(last_index);

  return {
    plain_text,
    style_positions
  };
}
