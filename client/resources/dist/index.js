// src/index.ts
function create_terminal_element(parent, id) {
  const ans = parent.querySelector(`#${id}`);
  if (ans != null)
    return ans;
  const template = document.createElement("template");
  template.innerHTML = `
<div class="term_panel" id="${id} style={display='block'};">
  <table class=stats>
  </table>
  <div class=term>
  </div>
</div>
  `.trim();
  const element = template.content.firstElementChild;
  parent.appendChild(element);
  return element;
}
function query_selector(el, selector) {
  const ans = el.querySelector(selector);
  if (ans == null || !(ans instanceof HTMLElement))
    throw new Error("selector not found or not html element");
  return ans;
}
function update_child_html(el, selector, html) {
  const child = query_selector(el, selector);
  if (child.innerHTML === html) return;
  child.innerHTML = html;
}
function append(txt, el = null) {
  if (el == null)
    el = document.getElementById("terminal");
  if (el == null)
    return;
  el.insertAdjacentHTML("beforeend", `${txt}
`);
  el.scrollTop = el.scrollHeight;
}
function calc_stats_html(new_runner) {
  return Object.entries(new_runner).map(([k, v]) => `<tr>
      <td><span class=value>${k} = </span>${v}</td>
    </tr>`).join("\n");
}
function calc_new_lines(new_runner) {
  return new_runner.output.map((line) => `<div class=${line.type}>${line.data}</div>`).join("\n");
}
var Terminal = class {
  constructor(parent, runner) {
    this.parent = parent;
    this.runner = runner;
    this.el = create_terminal_element(parent, runner.id);
    this.update(runner);
  }
  el;
  update(new_runner) {
    const term = query_selector(this.el, ".term");
    const new_lines = calc_new_lines(new_runner);
    append(new_lines, term);
    const stats = calc_stats_html(new_runner);
    update_child_html(this.el, ".stats", stats);
    this.runner = new_runner;
  }
};
var Terminals = class {
  constructor(parent) {
    this.parent = parent;
  }
  terminals = {};
  get_terminal(runner) {
    const ans = this.terminals[runner.id] ??= new Terminal(this.parent, runner);
    return ans;
  }
};
var vscode = acquireVsCodeApi();
function start() {
  console.log("start");
  const sendButton = document.getElementById("sendMessage");
  const terminals = new Terminals(document.body);
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
        for (const runner of message.runners)
          terminals.get_terminal(runner);
        const json = JSON.stringify(message.runners, null, 2);
        void navigator.clipboard.writeText(json);
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
