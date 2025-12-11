# Scriptsmon

This project contains a VS Code extension and a client-side web application.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

## Building the Project

To build the project, run:

```bash
npm run build
```

This will compile the TypeScript files and bundle the client-side assets.

## Running the Extension

After building, you can run the VS Code extension in a development host:

1.  Open this project in VS Code.
2.  Press `F5` to launch the extension development host.

## Running Tests

To run the tests, use:

```bash
npm test
```

## File List
```
C:\yigal\scriptsmon\
├───.gitignore - Specifies intentionally untracked files to ignore.
├───eslint.config.mjs - Configuration file for ESLint.
├───eslintout.txt - Output from ESLint.
├───lsout.txt - Output from the ls command.
├───package-lock.json - Records the exact version of each installed package.
├───package.json - Contains project metadata and dependency information.
├───readme.MD - This file.
├───tsc.log - Log file for TypeScript compiler.
├───tsconfig.json - Configuration file for TypeScript compiler.
├───tscout.txt - Output from TypeScript compiler.
├───.git\... - Git directory.
├───.vscode\
│   ├───launch.json - Launch configurations for debugging.
│   ├───settings.json - Workspace settings for VS Code.
│   └───tasks.json - Task configurations for VS Code.
├───bin\
│   ├───run_build.ts
│   ├───watch_build.ts
│   ├───watch_eslint.ts
│   ├───watch_test.ts
│   └───watch_tsc.ts
├───client\
│   ├───build.ts
│   ├───copy.html
│   ├───package-lock.json
│   ├───package.json
│   ├───resources\
│   │   ├───icons.css
│   │   ├───icons.html
│   │   ├───icons.js
│   │   ├───index.css
│   │   ├───index.html
│   │   ├───xterm.css
│   │   ├───dist\...
│   │   └───icons\
│   │       ├───Chevron-down.svg
│   │       ├───Chevron-right.svg
│   │       ├───debug.svg
│   │       ├───done.svg
│   │       ├───file-dark.svg
│   │       ├───file-light.svg
│   │       ├───file.svg
│   │       ├───folder-dark.svg
│   │       ├───folder-light.svg
│   │       ├───folder.svg
│   │       ├───play.svg
│   │       ├───running.svg
│   │       └───undefined.svg
│   ├───src\
│   │   ├───index.ts
│   │   ├───tree_control.ts
│   │   └───types.d.ts
│   └───tools\
├───dist\...
├───generated\
│   └───packages.json
├───node_modules\...
├───src\
│   ├───bundler.ts
│   ├───data.ts
│   ├───extension.ts
│   ├───monitor.ts
│   ├───test_types.ts
│   ├───test.ts
│   └───vscode_utils.ts
└───types\
    ├───bin\...
    ├───client\
    │   ├───build.d.ts
│   │   ├───resources\
│   │   │   └───icons.d.ts
│   │   └───src\
│   │       ├───index.d.ts
│   │       └───tree_control.d.ts
    ├───main\
    │   ├───build.d.ts
    │   └───src\
    │       └───webview.d.ts
    └───src\
        ├───bundler.d.ts
        ├───data.d.ts
        ├───extension.d.ts
        ├───monitor.d.ts
        ├───test_types.d.ts
        ├───test.d.ts
        ├───view_uitls.d.ts
        └───vscode_utils.d.ts
```