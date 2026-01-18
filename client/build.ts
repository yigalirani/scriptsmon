import { build } from "esbuild";
async function call_build(){
  try{
    await build({
      entryPoints: ["src/index.ts"],
      outfile: "resources/dist/index.js",
      bundle: true,
      platform: "node",
      format: "esm",
      sourcemap: 'inline',
      minify: false,
        loader: {
        '.html': 'text',
      },
      sourcesContent: true,  // ✅ helps DevTools      
    })
    console.log("Build complete");
  }catch(ex){
    console.error(ex);
    process.exit(1);    
  }
}
await call_build()
