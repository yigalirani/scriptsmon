// src/index.ts
var vscode = acquireVsCodeApi();
function append(txt) {
  const term_div = document.getElementById("terminal");
  if (term_div == null)
    return;
  term_div.insertAdjacentHTML("beforeend", `${txt}
`);
  term_div.scrollTop = term_div.scrollHeight;
}
function start() {
  console.log("start");
  const sendButton = document.getElementById("sendMessage");
  if (sendButton == null) {
    console.warn(" div not found");
    return;
  }
  sendButton.addEventListener("click", () => {
    append("buttonClick clicked");
    vscode.postMessage({
      command: "buttonClick",
      text: "Hello from webview!"
    });
  });
  document.getElementById("getReport").addEventListener("click", () => {
    append("getReport clicked");
    const message = {
      command: "get_report",
      text: "Hello from webview!"
    };
    vscode.postMessage(message);
  });
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "RunnerReport": {
        const json = JSON.stringify(message.runners, null, 2);
        append(json);
        break;
      }
      case "updateContent":
        append(message.text || "<no message>");
        break;
    }
  });
}
start();
//# sourceMappingURL=index.js.map
