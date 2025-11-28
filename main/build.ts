import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  sourcemap: true,
  minify: false,
}).then(() => {
  console.log("Build complete");
});