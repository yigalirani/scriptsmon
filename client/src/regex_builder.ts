import {get_error} from '@yigal/base_types'
export function re(flags = "") {
  return function (strings: TemplateStringsArray, ...values: any[]) {
    // 1. Combine strings and interpolated values
    const full_raw = strings.raw.reduce((acc, str, i) => 
      acc + str + (values[i] ?? "")
    , "");

    // 2. Clean the string
    const no_comments = full_raw.replace(/ #.*\n/g, "");
    const no_spaces = no_comments.replace(/\s+/g, "");
    try{
      return new RegExp(no_spaces, flags);
    }catch(ex){
      const err=get_error(ex)  //catch and rethrow so can place debugger here to debug regex
      console.log(err)
      throw err
    }
  };
}
export const r = String.raw;
export const digits=r`\d+`
