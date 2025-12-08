import { promises as fs } from "fs";
import * as path from "path";

/**
 * Reads a directory and returns an HTML page that lists each file
 * in a <div class="page"> element.
 */
function wrap(content:string){
return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Scriptsmon icons</title>
    <link rel="stylesheet" href="./icons.css">
</head>
<body>
<button id=animatebutton>animate</button>
${content}
</body>
<script src="./icons.js"></script>
`  
}

export async function directoryToHtml(dirPath: string,outfile: string) {
  const fileNames = await fs.readdir(dirPath);

  const pages: string[] = [];

  for (const fileName of fileNames) {
    const fullPath = path.join(dirPath, fileName);

    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) continue;

    const content = await fs.readFile(fullPath, "utf-8");


    const pageHtml = `
<div class="icon">${fileName.split('.')[0]}
  ${content}
</div>`;
    pages.push(pageHtml);
  }

  const all= wrap(pages.join("\n"))

  await fs.writeFile(outfile,all)
}

void directoryToHtml('./client/resources/icons','./client/resources/icons.html')


