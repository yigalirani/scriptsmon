var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../node_modules/ansi-html/index.js
var require_ansi_html = __commonJS({
  "../node_modules/ansi-html/index.js"(exports, module) {
    "use strict";
    module.exports = ansiHTML2;
    var _regANSI = /(?:(?:\u001b\[)|\u009b)(?:(?:[0-9]{1,3})?(?:(?:;[0-9]{0,3})*)?[A-M|f-m])|\u001b[A-M]/;
    var _defColors = {
      reset: ["fff", "000"],
      // [FOREGROUD_COLOR, BACKGROUND_COLOR]
      black: "000",
      red: "ff0000",
      green: "209805",
      yellow: "e8bf03",
      blue: "0000ff",
      magenta: "ff00ff",
      cyan: "00ffee",
      lightgrey: "f0f0f0",
      darkgrey: "888"
    };
    var _styles = {
      30: "black",
      31: "red",
      32: "green",
      33: "yellow",
      34: "blue",
      35: "magenta",
      36: "cyan",
      37: "lightgrey"
    };
    var _openTags = {
      "1": "font-weight:bold",
      // bold
      "2": "opacity:0.5",
      // dim
      "3": "<i>",
      // italic
      "4": "<u>",
      // underscore
      "8": "display:none",
      // hidden
      "9": "<del>"
      // delete
    };
    var _closeTags = {
      "23": "</i>",
      // reset italic
      "24": "</u>",
      // reset underscore
      "29": "</del>"
      // reset delete
    };
    [0, 21, 22, 27, 28, 39, 49].forEach(function(n) {
      _closeTags[n] = "</span>";
    });
    function ansiHTML2(text) {
      if (!_regANSI.test(text)) {
        return text;
      }
      var ansiCodes = [];
      var ret = text.replace(/\033\[(\d+)m/g, function(match, seq) {
        var ot = _openTags[seq];
        if (ot) {
          if (!!~ansiCodes.indexOf(seq)) {
            ansiCodes.pop();
            return "</span>";
          }
          ansiCodes.push(seq);
          return ot[0] === "<" ? ot : '<span style="' + ot + ';">';
        }
        var ct = _closeTags[seq];
        if (ct) {
          ansiCodes.pop();
          return ct;
        }
        return "";
      });
      var l = ansiCodes.length;
      l > 0 && (ret += Array(l + 1).join("</span>"));
      return ret;
    }
    ansiHTML2.setColors = function(colors) {
      if (typeof colors !== "object") {
        throw new Error("`colors` parameter must be an Object.");
      }
      var _finalColors = {};
      for (var key in _defColors) {
        var hex = colors.hasOwnProperty(key) ? colors[key] : null;
        if (!hex) {
          _finalColors[key] = _defColors[key];
          continue;
        }
        if ("reset" === key) {
          if (typeof hex === "string") {
            hex = [hex];
          }
          if (!Array.isArray(hex) || hex.length === 0 || hex.some(function(h) {
            return typeof h !== "string";
          })) {
            throw new Error("The value of `" + key + "` property must be an Array and each item could only be a hex string, e.g.: FF0000");
          }
          var defHexColor = _defColors[key];
          if (!hex[0]) {
            hex[0] = defHexColor[0];
          }
          if (hex.length === 1 || !hex[1]) {
            hex = [hex[0]];
            hex.push(defHexColor[1]);
          }
          hex = hex.slice(0, 2);
        } else if (typeof hex !== "string") {
          throw new Error("The value of `" + key + "` property must be a hex string, e.g.: FF0000");
        }
        _finalColors[key] = hex;
      }
      _setTags(_finalColors);
    };
    ansiHTML2.reset = function() {
      _setTags(_defColors);
    };
    ansiHTML2.tags = {};
    if (Object.defineProperty) {
      Object.defineProperty(ansiHTML2.tags, "open", {
        get: function() {
          return _openTags;
        }
      });
      Object.defineProperty(ansiHTML2.tags, "close", {
        get: function() {
          return _closeTags;
        }
      });
    } else {
      ansiHTML2.tags.open = _openTags;
      ansiHTML2.tags.close = _closeTags;
    }
    function _setTags(colors) {
      _openTags["0"] = "font-weight:normal;opacity:1;color:#" + colors.reset[0] + ";background:#" + colors.reset[1];
      _openTags["7"] = "color:#" + colors.reset[1] + ";background:#" + colors.reset[0];
      _openTags["90"] = "color:#" + colors.darkgrey;
      for (var code in _styles) {
        var color = _styles[code];
        var oriColor = colors[color] || "000";
        _openTags[code] = "color:#" + oriColor;
        code = parseInt(code);
        _openTags[(code + 10).toString()] = "background:#" + oriColor;
      }
    }
    ansiHTML2.reset();
  }
});

// src/index.ts
var import_ansi_html = __toESM(require_ansi_html(), 1);
function create_terminal_element(parent, id) {
  const ans = parent.querySelector(`#${id}`);
  if (ans != null)
    return ans;
  const template = document.createElement("template");
  template.innerHTML = `
<div class="term_panel" id="${id}" style={display='none'};">
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
  return new_runner.output.map((line) => `<div class=${line.type}>${(0, import_ansi_html.default)(line.data)}</div>`).join("\n");
}
var Terminal = class {
  constructor(parent, runner) {
    this.parent = parent;
    this.runner = runner;
    this.el = create_terminal_element(parent, runner.id);
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
          terminals.get_terminal(runner).update(runner);
        break;
      }
      case "set_selected":
        update_child_html(document.body, "#selected", message.selected);
        for (const panel of document.querySelectorAll(".term_panel")) {
          if (!(panel instanceof HTMLElement))
            continue;
          panel.style.display = panel.id === message.selected ? "block" : "none";
        }
        break;
      case "updateContent":
        append(message.text || "<no message>");
        break;
    }
  });
}
start();
//# sourceMappingURL=index.js.map
