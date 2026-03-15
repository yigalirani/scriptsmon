type font_style = 'normal' | 'bold' | 'italic' | 'underline' | 'blinking' | 'inverse' | 'strikethrough';

export interface Style {
  foreground: string | undefined;
  background: string | undefined;
  font_styles: Set<font_style>;
}

interface StylePosition extends Style {
  position: number;
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
  stripped_text: string,
  style_positions: Array<StylePosition>
} {
  const style_positions: Array<StylePosition> = [];
  let stripped_text = "";
  const current_style = { ...start_style, font_styles: new Set(start_style.font_styles) };

// Regex matches ALL ANSI sequences (CSI, OSC, etc.)
  const ansi_regex = /[\u001b\u009b](?:\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\][^\x07\x1b]*[\x07\x1b\\]|[@-_][0-?]*[ -/]*[@-~])/g;

  let last_index = 0;
  let match: RegExpExecArray | null;

  while ((match = ansi_regex.exec(text)) !== null) {
    // 1. Accumulate plain text
    stripped_text += text.slice(last_index, match.index);
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
      position: stripped_text.length
    });
  }

  stripped_text += text.slice(last_index);

  return {
    stripped_text,
    style_positions
  };
}
export interface Replacement{
  start:number
  end:number
  open:string
  close:string
}
export function replace_ansi({start_style,replacments,text}:{
  start_style:Style
  replacments:Array<Replacement>
  text:string
}){
  return text

}