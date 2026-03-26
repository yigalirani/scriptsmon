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
