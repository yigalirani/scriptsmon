import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "resources/dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  sourcemap: true,
  minify: false,
    loader: {
    '.html': 'text',
  },
}).then(() => {
  console.log("Build complete");
});