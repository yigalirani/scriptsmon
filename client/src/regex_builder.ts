export function re(flags = "") {
  return function (strings: TemplateStringsArray, ...values: any[]) {
    // 1. Combine strings and interpolated values
    const full_raw = strings.raw.reduce((acc, str, i) => 
      acc + str + (values[i] ?? "")
    , "");

    // 2. Clean the string
    const no_comments = full_raw.replace(/ #.*\n/g, "");
    const no_spaces = no_comments.replace(/\s+/g, "");

    return new RegExp(no_spaces, flags);
  };
}
export function capture(name:string){
  return function(...content:string[]){
    return `(?<${name}>${content.join('')})`
  }
}
export function neg_lookahead(...pat:string[]){
  return `(?!${pat.join('')})`
}
export function neg_lookbehind(...pat:string[]){
  return `(?<!${pat.join('')})`
}
export function seq(...pat:string[]){
  return pat.join('')
}
export function group(...pat:string[]){
  return `(${pat.join('')})`
}
export function or(...pat:string[]){
  return `(${pat.join('|')})`
}
export function make_re(flags:string){
  return function(...pat:string[]){
    return new RegExp(pat.join(''),flags)
  }
}
export const r = String.raw;
export const digits=r`\d+`
