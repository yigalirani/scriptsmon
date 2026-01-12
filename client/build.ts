import { build } from "esbuild";
async function call_build(){
  try{
    await build({
      entryPoints: ["src/index.ts","src/tree_view.ts"],
      outdir: "resources/dist",
      bundle: true,
      platform: "node",
      format: "esm",
      sourcemap: true,
      minify: false,
        loader: {
        '.html': 'text',
      },
    })
    console.log("Build complete");
  }catch(ex){
    console.error(ex);
    process.exit(1);    
  }
}
await call_build()
