// src/index.ts
var vscode = acquireVsCodeApi();
function start() {
  console.log("start");
  debugger;
  const sendButton = document.getElementById("sendMessage");
  const messageDiv = document.getElementById("message");
  if (sendButton == null || messageDiv == null)
    throw "sendButton or messageDiv not found";
  sendButton.addEventListener("click", () => {
    messageDiv.insertAdjacentHTML("beforeend", `<li> clicked!!!@!@</li>`);
    vscode.postMessage({
      command: "buttonClick",
      text: "Hello from webview!"
    });
  });
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "updateContent":
        messageDiv.insertAdjacentHTML("beforeend", `<li>${message.text}</li>`);
        break;
    }
  });
}
start();
//# sourceMappingURL=index.js.map
