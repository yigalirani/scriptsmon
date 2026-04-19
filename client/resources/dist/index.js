// ../../base_types/src/index.ts
function nl(value) {
  if (value === null || value === void 0) {
    throw new Error("Value cannot be null or undefined");
  }
  return value;
}
function get_error(x) {
  if (x instanceof Error)
    return x;
  const str = String(x);
  return new Error(str);
}
function default_get(obj, k, maker) {
  const exists = obj[k];
  if (exists == null) {
    obj[k] = maker();
  }
  return obj[k];
}
function toggle_set(set, value) {
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
}

// src/dom_utils.ts
function query_selector(el2, selector) {
  const ans = el2.querySelector(selector);
  if (ans == null)
    throw new Error("selector not found or not expected type");
  return ans;
}
function create_element(html, parent) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const ans = template.content.firstElementChild;
  if (parent != null)
    parent.appendChild(ans);
  return ans;
}
function divs(vals) {
  const ans = [];
  for (const [k, v] of Object.entries(vals))
    if (v != null && v !== "")
      ans.push(`<div class="${k}">${v}</div>`);
  return ans.join("");
}
function get_parent_with_dataset(el2) {
  if (el2 == null)
    return null;
  let ans = el2;
  while (ans != null) {
    if (Object.entries(ans.dataset).length !== 0)
      return ans;
    ans = ans.parentElement;
  }
  return null;
}
function get_parent_by_class(el2, className) {
  if (el2 == null)
    return null;
  let ans = el2;
  while (ans != null) {
    if (ans.classList.contains(className))
      return ans;
    ans = ans.parentElement;
  }
  return null;
}
function has_classes(el2, classes) {
  if (el2 == null)
    return false;
  return classes.some((c) => el2.classList.contains(c));
}
function has_class(parent, selector, c) {
  const el2 = parent.querySelector(selector);
  if (el2 == null)
    return false;
  return el2.classList.contains(c);
}
function get_parent_by_classes(el2, className) {
  const classes = Array.isArray(className) ? className : [className];
  let ans = el2;
  while (ans !== null) {
    if (has_classes(ans, classes))
      return ans;
    ans = ans.parentElement;
  }
  return null;
}
function get_parent_id(el2) {
  let ans = el2.parentElement;
  while (ans !== null) {
    const id = ans.getAttribute("id");
    if (id != null)
      return id;
    ans = ans.parentElement;
  }
}
function setter_cache(setter) {
  const el_to_html = /* @__PURE__ */ new WeakMap();
  return function(el2, selector, value) {
    for (const child of el2.querySelectorAll(selector)) {
      const exists = el_to_html.get(child);
      if (exists === value)
        continue;
      el_to_html.set(child, value);
      setter(child, value);
    }
  };
}
var update_child_html = setter_cache((el2, value) => {
  el2.innerHTML = value;
});
var update_class_name = setter_cache((el2, value) => {
  el2.className = value;
});
var CtrlTracker = class {
  pressed = false;
  constructor() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Control") {
        this.pressed = true;
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "Control") {
        this.pressed = false;
      }
    });
  }
};
var vscode = acquireVsCodeApi();
var ctrl = new CtrlTracker();
function get_range_array(x) {
  const ans = [...x.values()];
  return ans;
}
var HighlightEx = class {
  highlight;
  selected_highlight;
  focused = false;
  selected_range;
  ranges;
  constructor(highlight_name, el2) {
    this.highlight = this.make_highlight(highlight_name, "findMatch", 0);
    this.selected_highlight = this.make_highlight(`selected_${highlight_name}`, "findMatchHighlight", 1);
    el2.addEventListener("blur", this.onblur, true);
    el2.addEventListener("focus", this.onfocus, true);
  }
  onblur = (e) => {
    this.focused = false;
    console.log("scriptsmon:blur", e.target, this.focused);
    const s = window.getSelection();
    if (!s || s.rangeCount === 0) {
      return;
    }
    const r2 = s.getRangeAt(0);
    this.selected_highlight.clear();
    this.selected_highlight.add(r2);
    s.removeAllRanges();
  };
  onfocus = (e) => {
    this.focused = true;
    const s = window.getSelection();
    if (s == null)
      return;
    for (const r2 of this.selected_highlight.keys()) {
      s.removeAllRanges();
      s.addRange(r2);
      break;
    }
    this.selected_highlight.clear();
    console.log("scriptsmon:focus", e.target, this.focused);
  };
  make_highlight(name, base, priority) {
    const ans = new Highlight();
    const dynamic_sheet = new CSSStyleSheet();
    document.adoptedStyleSheets.push(dynamic_sheet);
    dynamic_sheet.insertRule(`
  ::highlight(${name}) { 
    background-color: var(--vscode-terminal-${base}Background);
    outline: 1px solid var(--vscode-terminal-${base}Border);
  }
`);
    CSS.highlights.set(name, ans);
    ans.priority = priority;
    return ans;
  }
  get_range_by_index(highlight, index) {
    const ranges = Array.from(highlight);
    return ranges[index];
  }
  clear() {
    this.highlight.clear();
    this.selected_highlight.clear();
    this.ranges = void 0;
  }
  delete(range) {
    this.highlight.delete(range);
    this.ranges = void 0;
  }
  add(range) {
    this.highlight.add(range);
    this.ranges = void 0;
  }
  /*clear_selected_range(){
    if (this.selected_range==null)
      return
    document.getSelection()?.removeAllRanges();
    this.selected_range=undefined
  }*/
  get_ranges() {
    if (this.ranges == null)
      this.ranges = get_range_array(this.highlight);
    return this.ranges;
  }
  select(range_num) {
    const range = this.get_ranges()[range_num - 1];
    if (range == null) {
      console.warn(`scriptsmon: cant find range by num ${range_num}`);
      return;
    }
    if (range === this.selected_range)
      return;
    this.selected_range = range;
    if (this.focused) {
      const selection = nl(document.getSelection());
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      this.selected_highlight.clear();
      this.selected_highlight.add(range);
    }
  }
  get size() {
    return this.highlight.size;
  }
};

// src/tree_internals.ts
function get_prev_selected(selected) {
  if (selected == null)
    return null;
  let cur = selected;
  while (cur != null) {
    cur = cur.previousSibling;
    if (cur instanceof HTMLElement)
      return cur;
  }
  return null;
}
function get_next_selected(selected) {
  if (selected == null)
    return null;
  let cur = selected;
  while (cur != null) {
    cur = cur.nextSibling;
    if (cur instanceof HTMLElement)
      return cur;
  }
  return null;
}
function calc_summary(node) {
  const ignore = ["icon_version", "icon", "toggles", "className"];
  function replacer(k, v) {
    if (ignore.includes(k))
      return "";
    return v;
  }
  return JSON.stringify(node, replacer, 2);
}
function need_full_render(root, old_root) {
  if (old_root == null)
    return true;
  const summary = calc_summary(root);
  const old_summary = calc_summary(old_root);
  return old_summary !== summary;
}
function get_children(selected) {
  if (selected.classList.contains("collapsed"))
    return null;
  const ans = selected.querySelector(".children");
  if (ans != null)
    return ans;
}
function getLastElementChild(parent) {
  for (let i = parent.childNodes.length - 1; i >= 0; i--) {
    const node = parent.childNodes[i];
    if (node instanceof HTMLElement) {
      return node;
    }
  }
  return null;
}
function getFirstElementChild(parent) {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i];
    if (node instanceof HTMLElement) {
      return node;
    }
  }
  return null;
}
function get_last_visible(selected) {
  const children_div = get_children(selected);
  if (children_div == null)
    return selected;
  const last_child = getLastElementChild(children_div);
  if (last_child == null)
    return selected;
  return get_last_visible(last_child);
}
function element_for_up_arrow(selected) {
  const ans = get_prev_selected(selected);
  if (ans == null)
    return get_parent_by_class(selected.parentElement, "tree_folder");
  return get_last_visible(ans);
}
function element_for_down_arrow(selected) {
  const children_div = get_children(selected);
  if (children_div != null) {
    const first = getFirstElementChild(children_div);
    if (first !== null)
      return first;
  }
  const ans = get_next_selected(selected);
  if (ans != null)
    return ans;
  let cur = selected;
  while (true) {
    const parent = get_parent_by_class(cur.parentElement, "tree_folder");
    if (!(parent instanceof HTMLElement))
      return null;
    const ans2 = get_next_selected(parent);
    if (ans2 != null)
      return ans2;
    cur = parent;
  }
}

// src/tree_control.ts
var TreeControl = class {
  constructor(parent, provider, icons) {
    this.parent = parent;
    this.provider = provider;
    this.icons = icons;
    parent.addEventListener("click", (evt) => {
      if (!(evt.target instanceof Element))
        return;
      parent.tabIndex = 0;
      parent.focus();
      const clicked = get_parent_by_class(evt.target, "label_row")?.parentElement;
      if (clicked == null)
        return;
      const { id } = clicked;
      if (clicked.classList.contains("tree_folder"))
        toggle_set(this.collapsed, id);
      void this.set_selected(id);
    });
    parent.addEventListener("keydown", (evt) => {
      if (!(evt.target instanceof HTMLElement))
        return;
      evt.preventDefault();
      console.log(evt.key);
      const selected = parent.querySelector(".selected");
      if (!(selected instanceof HTMLElement))
        return;
      switch (evt.key) {
        case "ArrowUp": {
          const prev = element_for_up_arrow(selected);
          if (!(prev instanceof HTMLElement))
            return;
          void this.set_selected(prev.id);
          break;
        }
        case "ArrowDown": {
          const prev = element_for_down_arrow(selected);
          if (prev == null)
            return;
          void this.set_selected(prev.id);
          break;
        }
        case "ArrowRight":
          this.collapsed.delete(this.selected_id);
          break;
        case "ArrowLeft":
          this.collapsed.add(this.selected_id);
          break;
        case "Enter":
        case " ":
          toggle_set(this.collapsed, this.selected_id);
          break;
      }
    });
  }
  //private root:unknown
  collapsed = /* @__PURE__ */ new Set();
  selected_id = "";
  converted;
  calc_node_class(node) {
    const { id, type, toggles } = node;
    const ans = /* @__PURE__ */ new Set([`tree_${type}`]);
    for (const k of this.provider.toggle_order) {
      const cls = `${k}_${toggles[k]}`;
      ans.add(cls);
    }
    if (this.selected_id === id)
      ans.add("selected");
    if (this.collapsed.has(id))
      ans.add("collapsed");
    return [...ans].join(" ");
  }
  on_interval() {
    const f = (a) => {
      const { id, children } = a;
      const new_class = this.calc_node_class(a);
      update_class_name(this.parent, `#${id}`, new_class);
      children.map(f);
    };
    if (this.converted)
      f(this.converted);
    for (const toggle of this.provider.toggle_order) {
      for (const state of [true, false, void 0]) {
        const selector = `.${toggle}_${state}>.label_row #${toggle}.toggle_icon`;
        const icon_name = `${toggle}_${state}`;
        update_child_html(this.parent, selector, this.icons[icon_name] ?? "");
      }
    }
  }
  //collapsed_set:Set<string>=new Set()
  create_node_element(node, margin, parent) {
    const { type, id, description, label, tags } = node;
    const children = type === "folder" ? `<div class=children></div>` : "";
    const node_class = this.calc_node_class(node);
    const vtags = tags.map((x) => `<div class=tag>${x}</div>`).join("");
    const ans = create_element(` 
  <div  class="${node_class}" id="${id}" >
    <div  class="label_row">
      <div class=toggles_icons></div>
      <div  class=shifter style='margin-left:${margin}px'>
        <div class="icon"> </div>
        ${divs({ label, vtags, description })}
      </div>
      <div class=commands_icons></div>
    </div>
    ${children}
  </div>`, parent);
    return ans;
  }
  //on_selected_changed:(a:string)=>MaybePromise<void>=(a:string)=>undefined
  async set_selected(id) {
    this.selected_id = id;
    await this.provider.selected(id);
  }
  create_node(parent, node, depth) {
    const children_el = (() => {
      if (depth === 0)
        return create_element("<div class=children></div>", parent);
      const new_parent = this.create_node_element(node, depth * 20 + 16 + 16, parent);
      return new_parent.querySelector(".children");
    })();
    if (children_el == null) {
      return;
    }
    for (const x of node.children) {
      this.create_node(children_el, x, depth + 1);
    }
  }
  big_render(converted) {
    this.parent.innerHTML = "";
    this.create_node(this.parent, converted, 0);
  }
  on_data(converted) {
    if (need_full_render(converted, this.converted))
      this.big_render(converted);
    this.converted = converted;
  }
};

// ../node_modules/acorn/dist/acorn.mjs
var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 7, 9, 32, 4, 318, 1, 78, 5, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 68, 8, 2, 0, 3, 0, 2, 3, 2, 4, 2, 0, 15, 1, 83, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 7, 19, 58, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 199, 7, 137, 9, 54, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 55, 9, 266, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 10, 5350, 0, 7, 14, 11465, 27, 2343, 9, 87, 9, 39, 4, 60, 6, 26, 9, 535, 9, 470, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4178, 9, 519, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 245, 1, 2, 9, 233, 0, 3, 0, 8, 1, 6, 0, 475, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];
var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 4, 51, 13, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 7, 25, 39, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 39, 27, 10, 22, 251, 41, 7, 1, 17, 5, 57, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 31, 9, 2, 0, 3, 0, 2, 37, 2, 0, 26, 0, 2, 0, 45, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 200, 32, 32, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 24, 43, 261, 18, 16, 0, 2, 12, 2, 33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 26, 3994, 6, 582, 6842, 29, 1763, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 433, 44, 212, 63, 33, 24, 3, 24, 45, 74, 6, 0, 67, 12, 65, 1, 2, 0, 15, 4, 10, 7381, 42, 31, 98, 114, 8702, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19, 43, 485, 27, 229, 29, 3, 0, 208, 30, 2, 2, 2, 1, 2, 6, 3, 4, 10, 1, 225, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4381, 3, 5773, 3, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 8489];
var nonASCIIidentifierChars = "\u200C\u200D\xB7\u0300-\u036F\u0387\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u0897-\u089F\u08CA-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C04\u0C3C\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0CF3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECE\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1369-\u1371\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u180F-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19D0-\u19DA\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1ABF-\u1ADD\u1AE0-\u1AEB\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DFF\u200C\u200D\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\u30FB\uA620-\uA629\uA66F\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880\uA881\uA8B4-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F1\uA8FF-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F\uFF65";
var nonASCIIidentifierStartChars = "\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088F\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5C\u0C5D\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDC-\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C8A\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7DC\uA7F1-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC";
var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};
var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";
var keywords$1 = {
  5: ecma5AndLessKeywords,
  "5module": ecma5AndLessKeywords + " export import",
  6: ecma5AndLessKeywords + " const class extends export import super"
};
var keywordRelationalOperator = /^in(stanceof)?$/;
var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
function isInAstralSet(code, set) {
  var pos = 65536;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) {
      return false;
    }
    pos += set[i + 1];
    if (pos >= code) {
      return true;
    }
  }
  return false;
}
function isIdentifierStart(code, astral) {
  if (code < 65) {
    return code === 36;
  }
  if (code < 91) {
    return true;
  }
  if (code < 97) {
    return code === 95;
  }
  if (code < 123) {
    return true;
  }
  if (code <= 65535) {
    return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
  }
  if (astral === false) {
    return false;
  }
  return isInAstralSet(code, astralIdentifierStartCodes);
}
function isIdentifierChar(code, astral) {
  if (code < 48) {
    return code === 36;
  }
  if (code < 58) {
    return true;
  }
  if (code < 65) {
    return false;
  }
  if (code < 91) {
    return true;
  }
  if (code < 97) {
    return code === 95;
  }
  if (code < 123) {
    return true;
  }
  if (code <= 65535) {
    return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
  }
  if (astral === false) {
    return false;
  }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
}
var TokenType = function TokenType2(label, conf) {
  if (conf === void 0) conf = {};
  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};
function binop(name, prec) {
  return new TokenType(name, { beforeExpr: true, binop: prec });
}
var beforeExpr = { beforeExpr: true };
var startsExpr = { startsExpr: true };
var keywords = {};
function kw(name, options) {
  if (options === void 0) options = {};
  options.keyword = name;
  return keywords[name] = new TokenType(name, options);
}
var types$1 = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  privateId: new TokenType("privateId", startsExpr),
  eof: new TokenType("eof"),
  // Punctuation token types.
  bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  questionDot: new TokenType("?."),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),
  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.
  eq: new TokenType("=", { beforeExpr: true, isAssign: true }),
  assign: new TokenType("_=", { beforeExpr: true, isAssign: true }),
  incDec: new TokenType("++/--", { prefix: true, postfix: true, startsExpr: true }),
  prefix: new TokenType("!/~", { beforeExpr: true, prefix: true, startsExpr: true }),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", { beforeExpr: true, binop: 9, prefix: true, startsExpr: true }),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", { beforeExpr: true }),
  coalesce: binop("??", 1),
  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", { isLoop: true, beforeExpr: true }),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", { isLoop: true }),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", { isLoop: true }),
  _with: kw("with"),
  _new: kw("new", { beforeExpr: true, startsExpr: true }),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import", startsExpr),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", { beforeExpr: true, binop: 7 }),
  _instanceof: kw("instanceof", { beforeExpr: true, binop: 7 }),
  _typeof: kw("typeof", { beforeExpr: true, prefix: true, startsExpr: true }),
  _void: kw("void", { beforeExpr: true, prefix: true, startsExpr: true }),
  _delete: kw("delete", { beforeExpr: true, prefix: true, startsExpr: true })
};
var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");
function isNewLine(code) {
  return code === 10 || code === 13 || code === 8232 || code === 8233;
}
function nextLineBreak(code, from, end) {
  if (end === void 0) end = code.length;
  for (var i = from; i < end; i++) {
    var next = code.charCodeAt(i);
    if (isNewLine(next)) {
      return i < end - 1 && next === 13 && code.charCodeAt(i + 1) === 10 ? i + 2 : i + 1;
    }
  }
  return -1;
}
var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString = ref.toString;
var hasOwn = Object.hasOwn || (function(obj, propName) {
  return hasOwnProperty.call(obj, propName);
});
var isArray = Array.isArray || (function(obj) {
  return toString.call(obj) === "[object Array]";
});
var regexpCache = /* @__PURE__ */ Object.create(null);
function wordsRegexp(words) {
  return regexpCache[words] || (regexpCache[words] = new RegExp("^(?:" + words.replace(/ /g, "|") + ")$"));
}
function codePointToString(code) {
  if (code <= 65535) {
    return String.fromCharCode(code);
  }
  code -= 65536;
  return String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
}
var loneSurrogate = /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;
var Position = function Position2(line, col2) {
  this.line = line;
  this.column = col2;
};
Position.prototype.offset = function offset(n) {
  return new Position(this.line, this.column + n);
};
var SourceLocation = function SourceLocation2(p, start2, end) {
  this.start = start2;
  this.end = end;
  if (p.sourceFile !== null) {
    this.source = p.sourceFile;
  }
};
function getLineInfo(input, offset2) {
  for (var line = 1, cur = 0; ; ) {
    var nextBreak = nextLineBreak(input, cur, offset2);
    if (nextBreak < 0) {
      return new Position(line, offset2 - cur);
    }
    ++line;
    cur = nextBreak;
  }
}
var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must be
  // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
  // (2019), 11 (2020), 12 (2021), 13 (2022), 14 (2023), or `"latest"`
  // (the latest version the library supports). This influences
  // support for strict mode, the set of reserved words, and support
  // for new syntax features.
  ecmaVersion: null,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"`, `"module"` or `"commonjs"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called when
  // a semicolon is automatically inserted. It will be passed the
  // position of the inserted semicolon as an offset, and if
  // `locations` is enabled, it is given the location as a `{line,
  // column}` object as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program, and an import.meta expression
  // in a script isn't considered an error.
  allowImportExportEverywhere: false,
  // By default, await identifiers are allowed to appear at the top-level scope only if ecmaVersion >= 2022.
  // When enabled, await identifiers are allowed to appear at the top-level scope,
  // but they are still not allowed in non-async functions.
  allowAwaitOutsideFunction: null,
  // When enabled, super identifiers are not constrained to
  // appearing in methods and do not raise an error when they appear elsewhere.
  allowSuperOutsideMethod: null,
  // When enabled, hashbang directive in the beginning of file is
  // allowed and treated as a line comment. Enabled by default when
  // `ecmaVersion` >= 2023.
  allowHashBang: false,
  // By default, the parser will verify that private properties are
  // only used in places where they are valid and have been declared.
  // Set this to false to turn such checks off.
  checkPrivateFields: true,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  // When this option has an array as value, objects representing the
  // comments are pushed to it.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false
};
var warnedAboutEcmaVersion = false;
function getOptions(opts) {
  var options = {};
  for (var opt in defaultOptions) {
    options[opt] = opts && hasOwn(opts, opt) ? opts[opt] : defaultOptions[opt];
  }
  if (options.ecmaVersion === "latest") {
    options.ecmaVersion = 1e8;
  } else if (options.ecmaVersion == null) {
    if (!warnedAboutEcmaVersion && typeof console === "object" && console.warn) {
      warnedAboutEcmaVersion = true;
      console.warn("Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future.");
    }
    options.ecmaVersion = 11;
  } else if (options.ecmaVersion >= 2015) {
    options.ecmaVersion -= 2009;
  }
  if (options.allowReserved == null) {
    options.allowReserved = options.ecmaVersion < 5;
  }
  if (!opts || opts.allowHashBang == null) {
    options.allowHashBang = options.ecmaVersion >= 14;
  }
  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function(token) {
      return tokens.push(token);
    };
  }
  if (isArray(options.onComment)) {
    options.onComment = pushComment(options, options.onComment);
  }
  if (options.sourceType === "commonjs" && options.allowAwaitOutsideFunction) {
    throw new Error("Cannot use allowAwaitOutsideFunction with sourceType: commonjs");
  }
  return options;
}
function pushComment(options, array) {
  return function(block, text, start2, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start2,
      end
    };
    if (options.locations) {
      comment.loc = new SourceLocation(this, startLoc, endLoc);
    }
    if (options.ranges) {
      comment.range = [start2, end];
    }
    array.push(comment);
  };
}
var SCOPE_TOP = 1;
var SCOPE_FUNCTION = 2;
var SCOPE_ASYNC = 4;
var SCOPE_GENERATOR = 8;
var SCOPE_ARROW = 16;
var SCOPE_SIMPLE_CATCH = 32;
var SCOPE_SUPER = 64;
var SCOPE_DIRECT_SUPER = 128;
var SCOPE_CLASS_STATIC_BLOCK = 256;
var SCOPE_CLASS_FIELD_INIT = 512;
var SCOPE_SWITCH = 1024;
var SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK;
function functionFlags(async, generator) {
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0);
}
var BIND_NONE = 0;
var BIND_VAR = 1;
var BIND_LEXICAL = 2;
var BIND_FUNCTION = 3;
var BIND_SIMPLE_CATCH = 4;
var BIND_OUTSIDE = 5;
var Parser = function Parser2(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = wordsRegexp(keywords$1[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
  var reserved = "";
  if (options.allowReserved !== true) {
    reserved = reservedWords[options.ecmaVersion >= 6 ? 6 : options.ecmaVersion === 5 ? 5 : 3];
    if (options.sourceType === "module") {
      reserved += " await";
    }
  }
  this.reservedWords = wordsRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = wordsRegexp(reservedStrict);
  this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);
  this.containsEsc = false;
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }
  this.type = types$1.eof;
  this.value = null;
  this.start = this.end = this.pos;
  this.startLoc = this.endLoc = this.curPosition();
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;
  this.context = this.initialContext();
  this.exprAllowed = true;
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);
  this.potentialArrowAt = -1;
  this.potentialArrowInForAwait = false;
  this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
  this.labels = [];
  this.undefinedExports = /* @__PURE__ */ Object.create(null);
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!") {
    this.skipLineComment(2);
  }
  this.scopeStack = [];
  this.enterScope(
    this.options.sourceType === "commonjs" ? SCOPE_FUNCTION : SCOPE_TOP
  );
  this.regexpState = null;
  this.privateNameStack = [];
};
var prototypeAccessors = { inFunction: { configurable: true }, inGenerator: { configurable: true }, inAsync: { configurable: true }, canAwait: { configurable: true }, allowReturn: { configurable: true }, allowSuper: { configurable: true }, allowDirectSuper: { configurable: true }, treatFunctionsAsVar: { configurable: true }, allowNewDotTarget: { configurable: true }, allowUsing: { configurable: true }, inClassStaticBlock: { configurable: true } };
Parser.prototype.parse = function parse() {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node);
};
prototypeAccessors.inFunction.get = function() {
  return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0;
};
prototypeAccessors.inGenerator.get = function() {
  return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0;
};
prototypeAccessors.inAsync.get = function() {
  return (this.currentVarScope().flags & SCOPE_ASYNC) > 0;
};
prototypeAccessors.canAwait.get = function() {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    var ref2 = this.scopeStack[i];
    var flags = ref2.flags;
    if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT)) {
      return false;
    }
    if (flags & SCOPE_FUNCTION) {
      return (flags & SCOPE_ASYNC) > 0;
    }
  }
  return this.inModule && this.options.ecmaVersion >= 13 || this.options.allowAwaitOutsideFunction;
};
prototypeAccessors.allowReturn.get = function() {
  if (this.inFunction) {
    return true;
  }
  if (this.options.allowReturnOutsideFunction && this.currentVarScope().flags & SCOPE_TOP) {
    return true;
  }
  return false;
};
prototypeAccessors.allowSuper.get = function() {
  var ref2 = this.currentThisScope();
  var flags = ref2.flags;
  return (flags & SCOPE_SUPER) > 0 || this.options.allowSuperOutsideMethod;
};
prototypeAccessors.allowDirectSuper.get = function() {
  return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0;
};
prototypeAccessors.treatFunctionsAsVar.get = function() {
  return this.treatFunctionsAsVarInScope(this.currentScope());
};
prototypeAccessors.allowNewDotTarget.get = function() {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    var ref2 = this.scopeStack[i];
    var flags = ref2.flags;
    if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT) || flags & SCOPE_FUNCTION && !(flags & SCOPE_ARROW)) {
      return true;
    }
  }
  return false;
};
prototypeAccessors.allowUsing.get = function() {
  var ref2 = this.currentScope();
  var flags = ref2.flags;
  if (flags & SCOPE_SWITCH) {
    return false;
  }
  if (!this.inModule && flags & SCOPE_TOP) {
    return false;
  }
  return true;
};
prototypeAccessors.inClassStaticBlock.get = function() {
  return (this.currentVarScope().flags & SCOPE_CLASS_STATIC_BLOCK) > 0;
};
Parser.extend = function extend() {
  var plugins = [], len = arguments.length;
  while (len--) plugins[len] = arguments[len];
  var cls = this;
  for (var i = 0; i < plugins.length; i++) {
    cls = plugins[i](cls);
  }
  return cls;
};
Parser.parse = function parse2(input, options) {
  return new this(options, input).parse();
};
Parser.parseExpressionAt = function parseExpressionAt(input, pos, options) {
  var parser = new this(options, input, pos);
  parser.nextToken();
  return parser.parseExpression();
};
Parser.tokenizer = function tokenizer(input, options) {
  return new this(options, input);
};
Object.defineProperties(Parser.prototype, prototypeAccessors);
var pp$9 = Parser.prototype;
var literal = /^(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/;
pp$9.strictDirective = function(start2) {
  if (this.options.ecmaVersion < 5) {
    return false;
  }
  for (; ; ) {
    skipWhiteSpace.lastIndex = start2;
    start2 += skipWhiteSpace.exec(this.input)[0].length;
    var match = literal.exec(this.input.slice(start2));
    if (!match) {
      return false;
    }
    if ((match[1] || match[2]) === "use strict") {
      skipWhiteSpace.lastIndex = start2 + match[0].length;
      var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
      var next = this.input.charAt(end);
      return next === ";" || next === "}" || lineBreak.test(spaceAfter[0]) && !(/[(`.[+\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "=");
    }
    start2 += match[0].length;
    skipWhiteSpace.lastIndex = start2;
    start2 += skipWhiteSpace.exec(this.input)[0].length;
    if (this.input[start2] === ";") {
      start2++;
    }
  }
};
pp$9.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true;
  } else {
    return false;
  }
};
pp$9.isContextual = function(name) {
  return this.type === types$1.name && this.value === name && !this.containsEsc;
};
pp$9.eatContextual = function(name) {
  if (!this.isContextual(name)) {
    return false;
  }
  this.next();
  return true;
};
pp$9.expectContextual = function(name) {
  if (!this.eatContextual(name)) {
    this.unexpected();
  }
};
pp$9.canInsertSemicolon = function() {
  return this.type === types$1.eof || this.type === types$1.braceR || lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
};
pp$9.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon) {
      this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
    }
    return true;
  }
};
pp$9.semicolon = function() {
  if (!this.eat(types$1.semi) && !this.insertSemicolon()) {
    this.unexpected();
  }
};
pp$9.afterTrailingComma = function(tokType, notNext) {
  if (this.type === tokType) {
    if (this.options.onTrailingComma) {
      this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
    }
    if (!notNext) {
      this.next();
    }
    return true;
  }
};
pp$9.expect = function(type) {
  this.eat(type) || this.unexpected();
};
pp$9.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};
var DestructuringErrors = function DestructuringErrors2() {
  this.shorthandAssign = this.trailingComma = this.parenthesizedAssign = this.parenthesizedBind = this.doubleProto = -1;
};
pp$9.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) {
    return;
  }
  if (refDestructuringErrors.trailingComma > -1) {
    this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element");
  }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) {
    this.raiseRecoverable(parens, isAssign ? "Assigning to rvalue" : "Parenthesized pattern");
  }
};
pp$9.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  if (!refDestructuringErrors) {
    return false;
  }
  var shorthandAssign = refDestructuringErrors.shorthandAssign;
  var doubleProto = refDestructuringErrors.doubleProto;
  if (!andThrow) {
    return shorthandAssign >= 0 || doubleProto >= 0;
  }
  if (shorthandAssign >= 0) {
    this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns");
  }
  if (doubleProto >= 0) {
    this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property");
  }
};
pp$9.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos)) {
    this.raise(this.yieldPos, "Yield expression cannot be a default value");
  }
  if (this.awaitPos) {
    this.raise(this.awaitPos, "Await expression cannot be a default value");
  }
};
pp$9.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression") {
    return this.isSimpleAssignTarget(expr.expression);
  }
  return expr.type === "Identifier" || expr.type === "MemberExpression";
};
var pp$8 = Parser.prototype;
pp$8.parseTopLevel = function(node) {
  var exports = /* @__PURE__ */ Object.create(null);
  if (!node.body) {
    node.body = [];
  }
  while (this.type !== types$1.eof) {
    var stmt = this.parseStatement(null, true, exports);
    node.body.push(stmt);
  }
  if (this.inModule) {
    for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1) {
      var name = list[i];
      this.raiseRecoverable(this.undefinedExports[name].start, "Export '" + name + "' is not defined");
    }
  }
  this.adaptDirectivePrologue(node.body);
  this.next();
  node.sourceType = this.options.sourceType === "commonjs" ? "script" : this.options.sourceType;
  return this.finishNode(node, "Program");
};
var loopLabel = { kind: "loop" };
var switchLabel = { kind: "switch" };
pp$8.isLet = function(context) {
  if (this.options.ecmaVersion < 6 || !this.isContextual("let")) {
    return false;
  }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.fullCharCodeAt(next);
  if (nextCh === 91 || nextCh === 92) {
    return true;
  }
  if (context) {
    return false;
  }
  if (nextCh === 123) {
    return true;
  }
  if (isIdentifierStart(nextCh)) {
    var start2 = next;
    do {
      next += nextCh <= 65535 ? 1 : 2;
    } while (isIdentifierChar(nextCh = this.fullCharCodeAt(next)));
    if (nextCh === 92) {
      return true;
    }
    var ident = this.input.slice(start2, next);
    if (!keywordRelationalOperator.test(ident)) {
      return true;
    }
  }
  return false;
};
pp$8.isAsyncFunction = function() {
  if (this.options.ecmaVersion < 8 || !this.isContextual("async")) {
    return false;
  }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, after;
  return !lineBreak.test(this.input.slice(this.pos, next)) && this.input.slice(next, next + 8) === "function" && (next + 8 === this.input.length || !(isIdentifierChar(after = this.fullCharCodeAt(next + 8)) || after === 92));
};
pp$8.isUsingKeyword = function(isAwaitUsing, isFor) {
  if (this.options.ecmaVersion < 17 || !this.isContextual(isAwaitUsing ? "await" : "using")) {
    return false;
  }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;
  if (lineBreak.test(this.input.slice(this.pos, next))) {
    return false;
  }
  if (isAwaitUsing) {
    var usingEndPos = next + 5, after;
    if (this.input.slice(next, usingEndPos) !== "using" || usingEndPos === this.input.length || isIdentifierChar(after = this.fullCharCodeAt(usingEndPos)) || after === 92) {
      return false;
    }
    skipWhiteSpace.lastIndex = usingEndPos;
    var skipAfterUsing = skipWhiteSpace.exec(this.input);
    next = usingEndPos + skipAfterUsing[0].length;
    if (skipAfterUsing && lineBreak.test(this.input.slice(usingEndPos, next))) {
      return false;
    }
  }
  var ch = this.fullCharCodeAt(next);
  if (!isIdentifierStart(ch) && ch !== 92) {
    return false;
  }
  var idStart = next;
  do {
    next += ch <= 65535 ? 1 : 2;
  } while (isIdentifierChar(ch = this.fullCharCodeAt(next)));
  if (ch === 92) {
    return true;
  }
  var id = this.input.slice(idStart, next);
  if (keywordRelationalOperator.test(id) || isFor && id === "of") {
    return false;
  }
  return true;
};
pp$8.isAwaitUsing = function(isFor) {
  return this.isUsingKeyword(true, isFor);
};
pp$8.isUsing = function(isFor) {
  return this.isUsingKeyword(false, isFor);
};
pp$8.parseStatement = function(context, topLevel, exports) {
  var starttype = this.type, node = this.startNode(), kind;
  if (this.isLet(context)) {
    starttype = types$1._var;
    kind = "let";
  }
  switch (starttype) {
    case types$1._break:
    case types$1._continue:
      return this.parseBreakContinueStatement(node, starttype.keyword);
    case types$1._debugger:
      return this.parseDebuggerStatement(node);
    case types$1._do:
      return this.parseDoStatement(node);
    case types$1._for:
      return this.parseForStatement(node);
    case types$1._function:
      if (context && (this.strict || context !== "if" && context !== "label") && this.options.ecmaVersion >= 6) {
        this.unexpected();
      }
      return this.parseFunctionStatement(node, false, !context);
    case types$1._class:
      if (context) {
        this.unexpected();
      }
      return this.parseClass(node, true);
    case types$1._if:
      return this.parseIfStatement(node);
    case types$1._return:
      return this.parseReturnStatement(node);
    case types$1._switch:
      return this.parseSwitchStatement(node);
    case types$1._throw:
      return this.parseThrowStatement(node);
    case types$1._try:
      return this.parseTryStatement(node);
    case types$1._const:
    case types$1._var:
      kind = kind || this.value;
      if (context && kind !== "var") {
        this.unexpected();
      }
      return this.parseVarStatement(node, kind);
    case types$1._while:
      return this.parseWhileStatement(node);
    case types$1._with:
      return this.parseWithStatement(node);
    case types$1.braceL:
      return this.parseBlock(true, node);
    case types$1.semi:
      return this.parseEmptyStatement(node);
    case types$1._export:
    case types$1._import:
      if (this.options.ecmaVersion > 10 && starttype === types$1._import) {
        skipWhiteSpace.lastIndex = this.pos;
        var skip = skipWhiteSpace.exec(this.input);
        var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
        if (nextCh === 40 || nextCh === 46) {
          return this.parseExpressionStatement(node, this.parseExpression());
        }
      }
      if (!this.options.allowImportExportEverywhere) {
        if (!topLevel) {
          this.raise(this.start, "'import' and 'export' may only appear at the top level");
        }
        if (!this.inModule) {
          this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'");
        }
      }
      return starttype === types$1._import ? this.parseImport(node) : this.parseExport(node, exports);
    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
    default:
      if (this.isAsyncFunction()) {
        if (context) {
          this.unexpected();
        }
        this.next();
        return this.parseFunctionStatement(node, true, !context);
      }
      var usingKind = this.isAwaitUsing(false) ? "await using" : this.isUsing(false) ? "using" : null;
      if (usingKind) {
        if (!this.allowUsing) {
          this.raise(this.start, "Using declaration cannot appear in the top level when source type is `script` or in the bare case statement");
        }
        if (usingKind === "await using") {
          if (!this.canAwait) {
            this.raise(this.start, "Await using cannot appear outside of async function");
          }
          this.next();
        }
        this.next();
        this.parseVar(node, false, usingKind);
        this.semicolon();
        return this.finishNode(node, "VariableDeclaration");
      }
      var maybeName = this.value, expr = this.parseExpression();
      if (starttype === types$1.name && expr.type === "Identifier" && this.eat(types$1.colon)) {
        return this.parseLabeledStatement(node, maybeName, expr, context);
      } else {
        return this.parseExpressionStatement(node, expr);
      }
  }
};
pp$8.parseBreakContinueStatement = function(node, keyword) {
  var isBreak = keyword === "break";
  this.next();
  if (this.eat(types$1.semi) || this.insertSemicolon()) {
    node.label = null;
  } else if (this.type !== types$1.name) {
    this.unexpected();
  } else {
    node.label = this.parseIdent();
    this.semicolon();
  }
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) {
        break;
      }
      if (node.label && isBreak) {
        break;
      }
    }
  }
  if (i === this.labels.length) {
    this.raise(node.start, "Unsyntactic " + keyword);
  }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
};
pp$8.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement");
};
pp$8.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("do");
  this.labels.pop();
  this.expect(types$1._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6) {
    this.eat(types$1.semi);
  } else {
    this.semicolon();
  }
  return this.finishNode(node, "DoWhileStatement");
};
pp$8.parseForStatement = function(node) {
  this.next();
  var awaitAt = this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await") ? this.lastTokStart : -1;
  this.labels.push(loopLabel);
  this.enterScope(0);
  this.expect(types$1.parenL);
  if (this.type === types$1.semi) {
    if (awaitAt > -1) {
      this.unexpected(awaitAt);
    }
    return this.parseFor(node, null);
  }
  var isLet = this.isLet();
  if (this.type === types$1._var || this.type === types$1._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    return this.parseForAfterInit(node, init$1, awaitAt);
  }
  var startsWithLet = this.isContextual("let"), isForOf = false;
  var usingKind = this.isUsing(true) ? "using" : this.isAwaitUsing(true) ? "await using" : null;
  if (usingKind) {
    var init$2 = this.startNode();
    this.next();
    if (usingKind === "await using") {
      if (!this.canAwait) {
        this.raise(this.start, "Await using cannot appear outside of async function");
      }
      this.next();
    }
    this.parseVar(init$2, true, usingKind);
    this.finishNode(init$2, "VariableDeclaration");
    return this.parseForAfterInit(node, init$2, awaitAt);
  }
  var containsEsc = this.containsEsc;
  var refDestructuringErrors = new DestructuringErrors();
  var initPos = this.start;
  var init = awaitAt > -1 ? this.parseExprSubscripts(refDestructuringErrors, "await") : this.parseExpression(true, refDestructuringErrors);
  if (this.type === types$1._in || (isForOf = this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    if (awaitAt > -1) {
      if (this.type === types$1._in) {
        this.unexpected(awaitAt);
      }
      node.await = true;
    } else if (isForOf && this.options.ecmaVersion >= 8) {
      if (init.start === initPos && !containsEsc && init.type === "Identifier" && init.name === "async") {
        this.unexpected();
      } else if (this.options.ecmaVersion >= 9) {
        node.await = false;
      }
    }
    if (startsWithLet && isForOf) {
      this.raise(init.start, "The left-hand side of a for-of loop may not start with 'let'.");
    }
    this.toAssignable(init, false, refDestructuringErrors);
    this.checkLValPattern(init);
    return this.parseForIn(node, init);
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  if (awaitAt > -1) {
    this.unexpected(awaitAt);
  }
  return this.parseFor(node, init);
};
pp$8.parseForAfterInit = function(node, init, awaitAt) {
  if ((this.type === types$1._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && init.declarations.length === 1) {
    if (this.options.ecmaVersion >= 9) {
      if (this.type === types$1._in) {
        if (awaitAt > -1) {
          this.unexpected(awaitAt);
        }
      } else {
        node.await = awaitAt > -1;
      }
    }
    return this.parseForIn(node, init);
  }
  if (awaitAt > -1) {
    this.unexpected(awaitAt);
  }
  return this.parseFor(node, init);
};
pp$8.parseFunctionStatement = function(node, isAsync, declarationPosition) {
  this.next();
  return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync);
};
pp$8.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  node.consequent = this.parseStatement("if");
  node.alternate = this.eat(types$1._else) ? this.parseStatement("if") : null;
  return this.finishNode(node, "IfStatement");
};
pp$8.parseReturnStatement = function(node) {
  if (!this.allowReturn) {
    this.raise(this.start, "'return' outside of function");
  }
  this.next();
  if (this.eat(types$1.semi) || this.insertSemicolon()) {
    node.argument = null;
  } else {
    node.argument = this.parseExpression();
    this.semicolon();
  }
  return this.finishNode(node, "ReturnStatement");
};
pp$8.parseSwitchStatement = function(node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types$1.braceL);
  this.labels.push(switchLabel);
  this.enterScope(SCOPE_SWITCH);
  var cur;
  for (var sawDefault = false; this.type !== types$1.braceR; ) {
    if (this.type === types$1._case || this.type === types$1._default) {
      var isCase = this.type === types$1._case;
      if (cur) {
        this.finishNode(cur, "SwitchCase");
      }
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) {
          this.raiseRecoverable(this.lastTokStart, "Multiple default clauses");
        }
        sawDefault = true;
        cur.test = null;
      }
      this.expect(types$1.colon);
    } else {
      if (!cur) {
        this.unexpected();
      }
      cur.consequent.push(this.parseStatement(null));
    }
  }
  this.exitScope();
  if (cur) {
    this.finishNode(cur, "SwitchCase");
  }
  this.next();
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement");
};
pp$8.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) {
    this.raise(this.lastTokEnd, "Illegal newline after throw");
  }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement");
};
var empty$1 = [];
pp$8.parseCatchClauseParam = function() {
  var param = this.parseBindingAtom();
  var simple = param.type === "Identifier";
  this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
  this.checkLValPattern(param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
  this.expect(types$1.parenR);
  return param;
};
pp$8.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types$1._catch) {
    var clause = this.startNode();
    this.next();
    if (this.eat(types$1.parenL)) {
      clause.param = this.parseCatchClauseParam();
    } else {
      if (this.options.ecmaVersion < 10) {
        this.unexpected();
      }
      clause.param = null;
      this.enterScope(0);
    }
    clause.body = this.parseBlock(false);
    this.exitScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types$1._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer) {
    this.raise(node.start, "Missing catch or finally clause");
  }
  return this.finishNode(node, "TryStatement");
};
pp$8.parseVarStatement = function(node, kind, allowMissingInitializer) {
  this.next();
  this.parseVar(node, false, kind, allowMissingInitializer);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration");
};
pp$8.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("while");
  this.labels.pop();
  return this.finishNode(node, "WhileStatement");
};
pp$8.parseWithStatement = function(node) {
  if (this.strict) {
    this.raise(this.start, "'with' in strict mode");
  }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement("with");
  return this.finishNode(node, "WithStatement");
};
pp$8.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement");
};
pp$8.parseLabeledStatement = function(node, maybeName, expr, context) {
  for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1) {
    var label = list[i$1];
    if (label.name === maybeName) {
      this.raise(expr.start, "Label '" + maybeName + "' is already declared");
    }
  }
  var kind = this.type.isLoop ? "loop" : this.type === types$1._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this.labels[i];
    if (label$1.statementStart === node.start) {
      label$1.statementStart = this.start;
      label$1.kind = kind;
    } else {
      break;
    }
  }
  this.labels.push({ name: maybeName, kind, statementStart: this.start });
  node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement");
};
pp$8.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement");
};
pp$8.parseBlock = function(createNewLexicalScope, node, exitStrict) {
  if (createNewLexicalScope === void 0) createNewLexicalScope = true;
  if (node === void 0) node = this.startNode();
  node.body = [];
  this.expect(types$1.braceL);
  if (createNewLexicalScope) {
    this.enterScope(0);
  }
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  if (exitStrict) {
    this.strict = false;
  }
  this.next();
  if (createNewLexicalScope) {
    this.exitScope();
  }
  return this.finishNode(node, "BlockStatement");
};
pp$8.parseFor = function(node, init) {
  node.init = init;
  this.expect(types$1.semi);
  node.test = this.type === types$1.semi ? null : this.parseExpression();
  this.expect(types$1.semi);
  node.update = this.type === types$1.parenR ? null : this.parseExpression();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, "ForStatement");
};
pp$8.parseForIn = function(node, init) {
  var isForIn = this.type === types$1._in;
  this.next();
  if (init.type === "VariableDeclaration" && init.declarations[0].init != null && (!isForIn || this.options.ecmaVersion < 8 || this.strict || init.kind !== "var" || init.declarations[0].id.type !== "Identifier")) {
    this.raise(
      init.start,
      (isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer"
    );
  }
  node.left = init;
  node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
};
pp$8.parseVar = function(node, isFor, kind, allowMissingInitializer) {
  node.declarations = [];
  node.kind = kind;
  for (; ; ) {
    var decl = this.startNode();
    this.parseVarId(decl, kind);
    if (this.eat(types$1.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (!allowMissingInitializer && kind === "const" && !(this.type === types$1._in || this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
      this.unexpected();
    } else if (!allowMissingInitializer && (kind === "using" || kind === "await using") && this.options.ecmaVersion >= 17 && this.type !== types$1._in && !this.isContextual("of")) {
      this.raise(this.lastTokEnd, "Missing initializer in " + kind + " declaration");
    } else if (!allowMissingInitializer && decl.id.type !== "Identifier" && !(isFor && (this.type === types$1._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(types$1.comma)) {
      break;
    }
  }
  return node;
};
pp$8.parseVarId = function(decl, kind) {
  decl.id = kind === "using" || kind === "await using" ? this.parseIdent() : this.parseBindingAtom();
  this.checkLValPattern(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
};
var FUNC_STATEMENT = 1;
var FUNC_HANGING_STATEMENT = 2;
var FUNC_NULLABLE_ID = 4;
pp$8.parseFunction = function(node, statement, allowExpressionBody, isAsync, forInit) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
    if (this.type === types$1.star && statement & FUNC_HANGING_STATEMENT) {
      this.unexpected();
    }
    node.generator = this.eat(types$1.star);
  }
  if (this.options.ecmaVersion >= 8) {
    node.async = !!isAsync;
  }
  if (statement & FUNC_STATEMENT) {
    node.id = statement & FUNC_NULLABLE_ID && this.type !== types$1.name ? null : this.parseIdent();
    if (node.id && !(statement & FUNC_HANGING_STATEMENT)) {
      this.checkLValSimple(node.id, this.strict || node.generator || node.async ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION);
    }
  }
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(node.async, node.generator));
  if (!(statement & FUNC_STATEMENT)) {
    node.id = this.type === types$1.name ? this.parseIdent() : null;
  }
  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody, false, forInit);
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, statement & FUNC_STATEMENT ? "FunctionDeclaration" : "FunctionExpression");
};
pp$8.parseFunctionParams = function(node) {
  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};
pp$8.parseClass = function(node, isStatement) {
  this.next();
  var oldStrict = this.strict;
  this.strict = true;
  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var privateNameMap = this.enterClassBody();
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types$1.braceL);
  while (this.type !== types$1.braceR) {
    var element = this.parseClassElement(node.superClass !== null);
    if (element) {
      classBody.body.push(element);
      if (element.type === "MethodDefinition" && element.kind === "constructor") {
        if (hadConstructor) {
          this.raiseRecoverable(element.start, "Duplicate constructor in the same class");
        }
        hadConstructor = true;
      } else if (element.key && element.key.type === "PrivateIdentifier" && isPrivateNameConflicted(privateNameMap, element)) {
        this.raiseRecoverable(element.key.start, "Identifier '#" + element.key.name + "' has already been declared");
      }
    }
  }
  this.strict = oldStrict;
  this.next();
  node.body = this.finishNode(classBody, "ClassBody");
  this.exitClassBody();
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
};
pp$8.parseClassElement = function(constructorAllowsSuper) {
  if (this.eat(types$1.semi)) {
    return null;
  }
  var ecmaVersion = this.options.ecmaVersion;
  var node = this.startNode();
  var keyName = "";
  var isGenerator = false;
  var isAsync = false;
  var kind = "method";
  var isStatic = false;
  if (this.eatContextual("static")) {
    if (ecmaVersion >= 13 && this.eat(types$1.braceL)) {
      this.parseClassStaticBlock(node);
      return node;
    }
    if (this.isClassElementNameStart() || this.type === types$1.star) {
      isStatic = true;
    } else {
      keyName = "static";
    }
  }
  node.static = isStatic;
  if (!keyName && ecmaVersion >= 8 && this.eatContextual("async")) {
    if ((this.isClassElementNameStart() || this.type === types$1.star) && !this.canInsertSemicolon()) {
      isAsync = true;
    } else {
      keyName = "async";
    }
  }
  if (!keyName && (ecmaVersion >= 9 || !isAsync) && this.eat(types$1.star)) {
    isGenerator = true;
  }
  if (!keyName && !isAsync && !isGenerator) {
    var lastValue = this.value;
    if (this.eatContextual("get") || this.eatContextual("set")) {
      if (this.isClassElementNameStart()) {
        kind = lastValue;
      } else {
        keyName = lastValue;
      }
    }
  }
  if (keyName) {
    node.computed = false;
    node.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
    node.key.name = keyName;
    this.finishNode(node.key, "Identifier");
  } else {
    this.parseClassElementName(node);
  }
  if (ecmaVersion < 13 || this.type === types$1.parenL || kind !== "method" || isGenerator || isAsync) {
    var isConstructor = !node.static && checkKeyName(node, "constructor");
    var allowsDirectSuper = isConstructor && constructorAllowsSuper;
    if (isConstructor && kind !== "method") {
      this.raise(node.key.start, "Constructor can't have get/set modifier");
    }
    node.kind = isConstructor ? "constructor" : kind;
    this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
  } else {
    this.parseClassField(node);
  }
  return node;
};
pp$8.isClassElementNameStart = function() {
  return this.type === types$1.name || this.type === types$1.privateId || this.type === types$1.num || this.type === types$1.string || this.type === types$1.bracketL || this.type.keyword;
};
pp$8.parseClassElementName = function(element) {
  if (this.type === types$1.privateId) {
    if (this.value === "constructor") {
      this.raise(this.start, "Classes can't have an element named '#constructor'");
    }
    element.computed = false;
    element.key = this.parsePrivateIdent();
  } else {
    this.parsePropertyName(element);
  }
};
pp$8.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
  var key = method.key;
  if (method.kind === "constructor") {
    if (isGenerator) {
      this.raise(key.start, "Constructor can't be a generator");
    }
    if (isAsync) {
      this.raise(key.start, "Constructor can't be an async method");
    }
  } else if (method.static && checkKeyName(method, "prototype")) {
    this.raise(key.start, "Classes may not have a static property named prototype");
  }
  var value = method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);
  if (method.kind === "get" && value.params.length !== 0) {
    this.raiseRecoverable(value.start, "getter should have no params");
  }
  if (method.kind === "set" && value.params.length !== 1) {
    this.raiseRecoverable(value.start, "setter should have exactly one param");
  }
  if (method.kind === "set" && value.params[0].type === "RestElement") {
    this.raiseRecoverable(value.params[0].start, "Setter cannot use rest params");
  }
  return this.finishNode(method, "MethodDefinition");
};
pp$8.parseClassField = function(field) {
  if (checkKeyName(field, "constructor")) {
    this.raise(field.key.start, "Classes can't have a field named 'constructor'");
  } else if (field.static && checkKeyName(field, "prototype")) {
    this.raise(field.key.start, "Classes can't have a static field named 'prototype'");
  }
  if (this.eat(types$1.eq)) {
    this.enterScope(SCOPE_CLASS_FIELD_INIT | SCOPE_SUPER);
    field.value = this.parseMaybeAssign();
    this.exitScope();
  } else {
    field.value = null;
  }
  this.semicolon();
  return this.finishNode(field, "PropertyDefinition");
};
pp$8.parseClassStaticBlock = function(node) {
  node.body = [];
  var oldLabels = this.labels;
  this.labels = [];
  this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  this.next();
  this.exitScope();
  this.labels = oldLabels;
  return this.finishNode(node, "StaticBlock");
};
pp$8.parseClassId = function(node, isStatement) {
  if (this.type === types$1.name) {
    node.id = this.parseIdent();
    if (isStatement) {
      this.checkLValSimple(node.id, BIND_LEXICAL, false);
    }
  } else {
    if (isStatement === true) {
      this.unexpected();
    }
    node.id = null;
  }
};
pp$8.parseClassSuper = function(node) {
  node.superClass = this.eat(types$1._extends) ? this.parseExprSubscripts(null, false) : null;
};
pp$8.enterClassBody = function() {
  var element = { declared: /* @__PURE__ */ Object.create(null), used: [] };
  this.privateNameStack.push(element);
  return element.declared;
};
pp$8.exitClassBody = function() {
  var ref2 = this.privateNameStack.pop();
  var declared = ref2.declared;
  var used = ref2.used;
  if (!this.options.checkPrivateFields) {
    return;
  }
  var len = this.privateNameStack.length;
  var parent = len === 0 ? null : this.privateNameStack[len - 1];
  for (var i = 0; i < used.length; ++i) {
    var id = used[i];
    if (!hasOwn(declared, id.name)) {
      if (parent) {
        parent.used.push(id);
      } else {
        this.raiseRecoverable(id.start, "Private field '#" + id.name + "' must be declared in an enclosing class");
      }
    }
  }
};
function isPrivateNameConflicted(privateNameMap, element) {
  var name = element.key.name;
  var curr = privateNameMap[name];
  var next = "true";
  if (element.type === "MethodDefinition" && (element.kind === "get" || element.kind === "set")) {
    next = (element.static ? "s" : "i") + element.kind;
  }
  if (curr === "iget" && next === "iset" || curr === "iset" && next === "iget" || curr === "sget" && next === "sset" || curr === "sset" && next === "sget") {
    privateNameMap[name] = "true";
    return false;
  } else if (!curr) {
    privateNameMap[name] = next;
    return false;
  } else {
    return true;
  }
}
function checkKeyName(node, name) {
  var computed = node.computed;
  var key = node.key;
  return !computed && (key.type === "Identifier" && key.name === name || key.type === "Literal" && key.value === name);
}
pp$8.parseExportAllDeclaration = function(node, exports) {
  if (this.options.ecmaVersion >= 11) {
    if (this.eatContextual("as")) {
      node.exported = this.parseModuleExportName();
      this.checkExport(exports, node.exported, this.lastTokStart);
    } else {
      node.exported = null;
    }
  }
  this.expectContextual("from");
  if (this.type !== types$1.string) {
    this.unexpected();
  }
  node.source = this.parseExprAtom();
  if (this.options.ecmaVersion >= 16) {
    node.attributes = this.parseWithClause();
  }
  this.semicolon();
  return this.finishNode(node, "ExportAllDeclaration");
};
pp$8.parseExport = function(node, exports) {
  this.next();
  if (this.eat(types$1.star)) {
    return this.parseExportAllDeclaration(node, exports);
  }
  if (this.eat(types$1._default)) {
    this.checkExport(exports, "default", this.lastTokStart);
    node.declaration = this.parseExportDefaultDeclaration();
    return this.finishNode(node, "ExportDefaultDeclaration");
  }
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseExportDeclaration(node);
    if (node.declaration.type === "VariableDeclaration") {
      this.checkVariableExport(exports, node.declaration.declarations);
    } else {
      this.checkExport(exports, node.declaration.id, node.declaration.id.start);
    }
    node.specifiers = [];
    node.source = null;
    if (this.options.ecmaVersion >= 16) {
      node.attributes = [];
    }
  } else {
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    if (this.eatContextual("from")) {
      if (this.type !== types$1.string) {
        this.unexpected();
      }
      node.source = this.parseExprAtom();
      if (this.options.ecmaVersion >= 16) {
        node.attributes = this.parseWithClause();
      }
    } else {
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        var spec = list[i];
        this.checkUnreserved(spec.local);
        this.checkLocalExport(spec.local);
        if (spec.local.type === "Literal") {
          this.raise(spec.local.start, "A string literal cannot be used as an exported binding without `from`.");
        }
      }
      node.source = null;
      if (this.options.ecmaVersion >= 16) {
        node.attributes = [];
      }
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration");
};
pp$8.parseExportDeclaration = function(node) {
  return this.parseStatement(null);
};
pp$8.parseExportDefaultDeclaration = function() {
  var isAsync;
  if (this.type === types$1._function || (isAsync = this.isAsyncFunction())) {
    var fNode = this.startNode();
    this.next();
    if (isAsync) {
      this.next();
    }
    return this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
  } else if (this.type === types$1._class) {
    var cNode = this.startNode();
    return this.parseClass(cNode, "nullableID");
  } else {
    var declaration = this.parseMaybeAssign();
    this.semicolon();
    return declaration;
  }
};
pp$8.checkExport = function(exports, name, pos) {
  if (!exports) {
    return;
  }
  if (typeof name !== "string") {
    name = name.type === "Identifier" ? name.name : name.value;
  }
  if (hasOwn(exports, name)) {
    this.raiseRecoverable(pos, "Duplicate export '" + name + "'");
  }
  exports[name] = true;
};
pp$8.checkPatternExport = function(exports, pat) {
  var type = pat.type;
  if (type === "Identifier") {
    this.checkExport(exports, pat, pat.start);
  } else if (type === "ObjectPattern") {
    for (var i = 0, list = pat.properties; i < list.length; i += 1) {
      var prop = list[i];
      this.checkPatternExport(exports, prop);
    }
  } else if (type === "ArrayPattern") {
    for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];
      if (elt) {
        this.checkPatternExport(exports, elt);
      }
    }
  } else if (type === "Property") {
    this.checkPatternExport(exports, pat.value);
  } else if (type === "AssignmentPattern") {
    this.checkPatternExport(exports, pat.left);
  } else if (type === "RestElement") {
    this.checkPatternExport(exports, pat.argument);
  }
};
pp$8.checkVariableExport = function(exports, decls) {
  if (!exports) {
    return;
  }
  for (var i = 0, list = decls; i < list.length; i += 1) {
    var decl = list[i];
    this.checkPatternExport(exports, decl.id);
  }
};
pp$8.shouldParseExportStatement = function() {
  return this.type.keyword === "var" || this.type.keyword === "const" || this.type.keyword === "class" || this.type.keyword === "function" || this.isLet() || this.isAsyncFunction();
};
pp$8.parseExportSpecifier = function(exports) {
  var node = this.startNode();
  node.local = this.parseModuleExportName();
  node.exported = this.eatContextual("as") ? this.parseModuleExportName() : node.local;
  this.checkExport(
    exports,
    node.exported,
    node.exported.start
  );
  return this.finishNode(node, "ExportSpecifier");
};
pp$8.parseExportSpecifiers = function(exports) {
  var nodes = [], first = true;
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    nodes.push(this.parseExportSpecifier(exports));
  }
  return nodes;
};
pp$8.parseImport = function(node) {
  this.next();
  if (this.type === types$1.string) {
    node.specifiers = empty$1;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types$1.string ? this.parseExprAtom() : this.unexpected();
  }
  if (this.options.ecmaVersion >= 16) {
    node.attributes = this.parseWithClause();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration");
};
pp$8.parseImportSpecifier = function() {
  var node = this.startNode();
  node.imported = this.parseModuleExportName();
  if (this.eatContextual("as")) {
    node.local = this.parseIdent();
  } else {
    this.checkUnreserved(node.imported);
    node.local = node.imported;
  }
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportSpecifier");
};
pp$8.parseImportDefaultSpecifier = function() {
  var node = this.startNode();
  node.local = this.parseIdent();
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportDefaultSpecifier");
};
pp$8.parseImportNamespaceSpecifier = function() {
  var node = this.startNode();
  this.next();
  this.expectContextual("as");
  node.local = this.parseIdent();
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportNamespaceSpecifier");
};
pp$8.parseImportSpecifiers = function() {
  var nodes = [], first = true;
  if (this.type === types$1.name) {
    nodes.push(this.parseImportDefaultSpecifier());
    if (!this.eat(types$1.comma)) {
      return nodes;
    }
  }
  if (this.type === types$1.star) {
    nodes.push(this.parseImportNamespaceSpecifier());
    return nodes;
  }
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    nodes.push(this.parseImportSpecifier());
  }
  return nodes;
};
pp$8.parseWithClause = function() {
  var nodes = [];
  if (!this.eat(types$1._with)) {
    return nodes;
  }
  this.expect(types$1.braceL);
  var attributeKeys = {};
  var first = true;
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    var attr = this.parseImportAttribute();
    var keyName = attr.key.type === "Identifier" ? attr.key.name : attr.key.value;
    if (hasOwn(attributeKeys, keyName)) {
      this.raiseRecoverable(attr.key.start, "Duplicate attribute key '" + keyName + "'");
    }
    attributeKeys[keyName] = true;
    nodes.push(attr);
  }
  return nodes;
};
pp$8.parseImportAttribute = function() {
  var node = this.startNode();
  node.key = this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never");
  this.expect(types$1.colon);
  if (this.type !== types$1.string) {
    this.unexpected();
  }
  node.value = this.parseExprAtom();
  return this.finishNode(node, "ImportAttribute");
};
pp$8.parseModuleExportName = function() {
  if (this.options.ecmaVersion >= 13 && this.type === types$1.string) {
    var stringLiteral = this.parseLiteral(this.value);
    if (loneSurrogate.test(stringLiteral.value)) {
      this.raise(stringLiteral.start, "An export name cannot include a lone surrogate.");
    }
    return stringLiteral;
  }
  return this.parseIdent(true);
};
pp$8.adaptDirectivePrologue = function(statements) {
  for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
    statements[i].directive = statements[i].expression.raw.slice(1, -1);
  }
};
pp$8.isDirectiveCandidate = function(statement) {
  return this.options.ecmaVersion >= 5 && statement.type === "ExpressionStatement" && statement.expression.type === "Literal" && typeof statement.expression.value === "string" && // Reject parenthesized strings.
  (this.input[statement.start] === '"' || this.input[statement.start] === "'");
};
var pp$7 = Parser.prototype;
pp$7.toAssignable = function(node, isBinding, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
      case "Identifier":
        if (this.inAsync && node.name === "await") {
          this.raise(node.start, "Cannot use 'await' as identifier inside an async function");
        }
        break;
      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
        break;
      case "ObjectExpression":
        node.type = "ObjectPattern";
        if (refDestructuringErrors) {
          this.checkPatternErrors(refDestructuringErrors, true);
        }
        for (var i = 0, list = node.properties; i < list.length; i += 1) {
          var prop = list[i];
          this.toAssignable(prop, isBinding);
          if (prop.type === "RestElement" && (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")) {
            this.raise(prop.argument.start, "Unexpected token");
          }
        }
        break;
      case "Property":
        if (node.kind !== "init") {
          this.raise(node.key.start, "Object pattern can't contain getter or setter");
        }
        this.toAssignable(node.value, isBinding);
        break;
      case "ArrayExpression":
        node.type = "ArrayPattern";
        if (refDestructuringErrors) {
          this.checkPatternErrors(refDestructuringErrors, true);
        }
        this.toAssignableList(node.elements, isBinding);
        break;
      case "SpreadElement":
        node.type = "RestElement";
        this.toAssignable(node.argument, isBinding);
        if (node.argument.type === "AssignmentPattern") {
          this.raise(node.argument.start, "Rest elements cannot have a default value");
        }
        break;
      case "AssignmentExpression":
        if (node.operator !== "=") {
          this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
        }
        node.type = "AssignmentPattern";
        delete node.operator;
        this.toAssignable(node.left, isBinding);
        break;
      case "ParenthesizedExpression":
        this.toAssignable(node.expression, isBinding, refDestructuringErrors);
        break;
      case "ChainExpression":
        this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
        break;
      case "MemberExpression":
        if (!isBinding) {
          break;
        }
      default:
        this.raise(node.start, "Assigning to rvalue");
    }
  } else if (refDestructuringErrors) {
    this.checkPatternErrors(refDestructuringErrors, true);
  }
  return node;
};
pp$7.toAssignableList = function(exprList, isBinding) {
  var end = exprList.length;
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) {
      this.toAssignable(elt, isBinding);
    }
  }
  if (end) {
    var last = exprList[end - 1];
    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier") {
      this.unexpected(last.argument.start);
    }
  }
  return exprList;
};
pp$7.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement");
};
pp$7.parseRestBinding = function() {
  var node = this.startNode();
  this.next();
  if (this.options.ecmaVersion === 6 && this.type !== types$1.name) {
    this.unexpected();
  }
  node.argument = this.parseBindingAtom();
  return this.finishNode(node, "RestElement");
};
pp$7.parseBindingAtom = function() {
  if (this.options.ecmaVersion >= 6) {
    switch (this.type) {
      case types$1.bracketL:
        var node = this.startNode();
        this.next();
        node.elements = this.parseBindingList(types$1.bracketR, true, true);
        return this.finishNode(node, "ArrayPattern");
      case types$1.braceL:
        return this.parseObj(true);
    }
  }
  return this.parseIdent();
};
pp$7.parseBindingList = function(close, allowEmpty, allowTrailingComma, allowModifiers) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) {
      first = false;
    } else {
      this.expect(types$1.comma);
    }
    if (allowEmpty && this.type === types$1.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break;
    } else if (this.type === types$1.ellipsis) {
      var rest = this.parseRestBinding();
      this.parseBindingListItem(rest);
      elts.push(rest);
      if (this.type === types$1.comma) {
        this.raiseRecoverable(this.start, "Comma is not permitted after the rest element");
      }
      this.expect(close);
      break;
    } else {
      elts.push(this.parseAssignableListItem(allowModifiers));
    }
  }
  return elts;
};
pp$7.parseAssignableListItem = function(allowModifiers) {
  var elem = this.parseMaybeDefault(this.start, this.startLoc);
  this.parseBindingListItem(elem);
  return elem;
};
pp$7.parseBindingListItem = function(param) {
  return param;
};
pp$7.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types$1.eq)) {
    return left;
  }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern");
};
pp$7.checkLValSimple = function(expr, bindingType, checkClashes) {
  if (bindingType === void 0) bindingType = BIND_NONE;
  var isBind = bindingType !== BIND_NONE;
  switch (expr.type) {
    case "Identifier":
      if (this.strict && this.reservedWordsStrictBind.test(expr.name)) {
        this.raiseRecoverable(expr.start, (isBind ? "Binding " : "Assigning to ") + expr.name + " in strict mode");
      }
      if (isBind) {
        if (bindingType === BIND_LEXICAL && expr.name === "let") {
          this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name");
        }
        if (checkClashes) {
          if (hasOwn(checkClashes, expr.name)) {
            this.raiseRecoverable(expr.start, "Argument name clash");
          }
          checkClashes[expr.name] = true;
        }
        if (bindingType !== BIND_OUTSIDE) {
          this.declareName(expr.name, bindingType, expr.start);
        }
      }
      break;
    case "ChainExpression":
      this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
      break;
    case "MemberExpression":
      if (isBind) {
        this.raiseRecoverable(expr.start, "Binding member expression");
      }
      break;
    case "ParenthesizedExpression":
      if (isBind) {
        this.raiseRecoverable(expr.start, "Binding parenthesized expression");
      }
      return this.checkLValSimple(expr.expression, bindingType, checkClashes);
    default:
      this.raise(expr.start, (isBind ? "Binding" : "Assigning to") + " rvalue");
  }
};
pp$7.checkLValPattern = function(expr, bindingType, checkClashes) {
  if (bindingType === void 0) bindingType = BIND_NONE;
  switch (expr.type) {
    case "ObjectPattern":
      for (var i = 0, list = expr.properties; i < list.length; i += 1) {
        var prop = list[i];
        this.checkLValInnerPattern(prop, bindingType, checkClashes);
      }
      break;
    case "ArrayPattern":
      for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
        var elem = list$1[i$1];
        if (elem) {
          this.checkLValInnerPattern(elem, bindingType, checkClashes);
        }
      }
      break;
    default:
      this.checkLValSimple(expr, bindingType, checkClashes);
  }
};
pp$7.checkLValInnerPattern = function(expr, bindingType, checkClashes) {
  if (bindingType === void 0) bindingType = BIND_NONE;
  switch (expr.type) {
    case "Property":
      this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
      break;
    case "AssignmentPattern":
      this.checkLValPattern(expr.left, bindingType, checkClashes);
      break;
    case "RestElement":
      this.checkLValPattern(expr.argument, bindingType, checkClashes);
      break;
    default:
      this.checkLValPattern(expr, bindingType, checkClashes);
  }
};
var TokContext = function TokContext2(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};
var types = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function(p) {
    return p.tryReadTemplateToken();
  }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};
var pp$6 = Parser.prototype;
pp$6.initialContext = function() {
  return [types.b_stat];
};
pp$6.curContext = function() {
  return this.context[this.context.length - 1];
};
pp$6.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types.f_expr || parent === types.f_stat) {
    return true;
  }
  if (prevType === types$1.colon && (parent === types.b_stat || parent === types.b_expr)) {
    return !parent.isExpr;
  }
  if (prevType === types$1._return || prevType === types$1.name && this.exprAllowed) {
    return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
  }
  if (prevType === types$1._else || prevType === types$1.semi || prevType === types$1.eof || prevType === types$1.parenR || prevType === types$1.arrow) {
    return true;
  }
  if (prevType === types$1.braceL) {
    return parent === types.b_stat;
  }
  if (prevType === types$1._var || prevType === types$1._const || prevType === types$1.name) {
    return false;
  }
  return !this.exprAllowed;
};
pp$6.inGeneratorContext = function() {
  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this.context[i];
    if (context.token === "function") {
      return context.generator;
    }
  }
  return false;
};
pp$6.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType === types$1.dot) {
    this.exprAllowed = false;
  } else if (update = type.updateContext) {
    update.call(this, prevType);
  } else {
    this.exprAllowed = type.beforeExpr;
  }
};
pp$6.overrideContext = function(tokenCtx) {
  if (this.curContext() !== tokenCtx) {
    this.context[this.context.length - 1] = tokenCtx;
  }
};
types$1.parenR.updateContext = types$1.braceR.updateContext = function() {
  if (this.context.length === 1) {
    this.exprAllowed = true;
    return;
  }
  var out = this.context.pop();
  if (out === types.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};
types$1.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
  this.exprAllowed = true;
};
types$1.dollarBraceL.updateContext = function() {
  this.context.push(types.b_tmpl);
  this.exprAllowed = true;
};
types$1.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types$1._if || prevType === types$1._for || prevType === types$1._with || prevType === types$1._while;
  this.context.push(statementParens ? types.p_stat : types.p_expr);
  this.exprAllowed = true;
};
types$1.incDec.updateContext = function() {
};
types$1._function.updateContext = types$1._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types$1._else && !(prevType === types$1.semi && this.curContext() !== types.p_stat) && !(prevType === types$1._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) && !((prevType === types$1.colon || prevType === types$1.braceL) && this.curContext() === types.b_stat)) {
    this.context.push(types.f_expr);
  } else {
    this.context.push(types.f_stat);
  }
  this.exprAllowed = false;
};
types$1.colon.updateContext = function() {
  if (this.curContext().token === "function") {
    this.context.pop();
  }
  this.exprAllowed = true;
};
types$1.backQuote.updateContext = function() {
  if (this.curContext() === types.q_tmpl) {
    this.context.pop();
  } else {
    this.context.push(types.q_tmpl);
  }
  this.exprAllowed = false;
};
types$1.star.updateContext = function(prevType) {
  if (prevType === types$1._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types.f_expr) {
      this.context[index] = types.f_expr_gen;
    } else {
      this.context[index] = types.f_gen;
    }
  }
  this.exprAllowed = true;
};
types$1.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6 && prevType !== types$1.dot) {
    if (this.value === "of" && !this.exprAllowed || this.value === "yield" && this.inGeneratorContext()) {
      allowed = true;
    }
  }
  this.exprAllowed = allowed;
};
var pp$5 = Parser.prototype;
pp$5.checkPropClash = function(prop, propHash, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement") {
    return;
  }
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand)) {
    return;
  }
  var key = prop.key;
  var name;
  switch (key.type) {
    case "Identifier":
      name = key.name;
      break;
    case "Literal":
      name = String(key.value);
      break;
    default:
      return;
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) {
        if (refDestructuringErrors) {
          if (refDestructuringErrors.doubleProto < 0) {
            refDestructuringErrors.doubleProto = key.start;
          }
        } else {
          this.raiseRecoverable(key.start, "Redefinition of __proto__ property");
        }
      }
      propHash.proto = true;
    }
    return;
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition) {
      this.raiseRecoverable(key.start, "Redefinition of property");
    }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};
pp$5.parseExpression = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
  if (this.type === types$1.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types$1.comma)) {
      node.expressions.push(this.parseMaybeAssign(forInit, refDestructuringErrors));
    }
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
};
pp$5.parseMaybeAssign = function(forInit, refDestructuringErrors, afterLeftParse) {
  if (this.isContextual("yield")) {
    if (this.inGenerator) {
      return this.parseYield(forInit);
    } else {
      this.exprAllowed = false;
    }
  }
  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1, oldDoubleProto = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    oldDoubleProto = refDestructuringErrors.doubleProto;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors();
    ownDestructuringErrors = true;
  }
  var startPos = this.start, startLoc = this.startLoc;
  if (this.type === types$1.parenL || this.type === types$1.name) {
    this.potentialArrowAt = this.start;
    this.potentialArrowInForAwait = forInit === "await";
  }
  var left = this.parseMaybeConditional(forInit, refDestructuringErrors);
  if (afterLeftParse) {
    left = afterLeftParse.call(this, left, startPos, startLoc);
  }
  if (this.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    if (this.type === types$1.eq) {
      left = this.toAssignable(left, false, refDestructuringErrors);
    }
    if (!ownDestructuringErrors) {
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
    }
    if (refDestructuringErrors.shorthandAssign >= left.start) {
      refDestructuringErrors.shorthandAssign = -1;
    }
    if (this.type === types$1.eq) {
      this.checkLValPattern(left);
    } else {
      this.checkLValSimple(left);
    }
    node.left = left;
    this.next();
    node.right = this.parseMaybeAssign(forInit);
    if (oldDoubleProto > -1) {
      refDestructuringErrors.doubleProto = oldDoubleProto;
    }
    return this.finishNode(node, "AssignmentExpression");
  } else {
    if (ownDestructuringErrors) {
      this.checkExpressionErrors(refDestructuringErrors, true);
    }
  }
  if (oldParenAssign > -1) {
    refDestructuringErrors.parenthesizedAssign = oldParenAssign;
  }
  if (oldTrailingComma > -1) {
    refDestructuringErrors.trailingComma = oldTrailingComma;
  }
  return left;
};
pp$5.parseMaybeConditional = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(forInit, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) {
    return expr;
  }
  if (this.eat(types$1.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types$1.colon);
    node.alternate = this.parseMaybeAssign(forInit);
    return this.finishNode(node, "ConditionalExpression");
  }
  return expr;
};
pp$5.parseExprOps = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false, false, forInit);
  if (this.checkExpressionErrors(refDestructuringErrors)) {
    return expr;
  }
  return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, forInit);
};
pp$5.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, forInit) {
  var prec = this.type.binop;
  if (prec != null && (!forInit || this.type !== types$1._in)) {
    if (prec > minPrec) {
      var logical = this.type === types$1.logicalOR || this.type === types$1.logicalAND;
      var coalesce = this.type === types$1.coalesce;
      if (coalesce) {
        prec = types$1.logicalAND.binop;
      }
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false, false, forInit), startPos, startLoc, prec, forInit);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical || coalesce);
      if (logical && this.type === types$1.coalesce || coalesce && (this.type === types$1.logicalOR || this.type === types$1.logicalAND)) {
        this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
      }
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, forInit);
    }
  }
  return left;
};
pp$5.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  if (right.type === "PrivateIdentifier") {
    this.raise(right.start, "Private identifier can only be left side of binary expression");
  }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression");
};
pp$5.parseMaybeUnary = function(refDestructuringErrors, sawUnary, incDec, forInit) {
  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.isContextual("await") && this.canAwait) {
    expr = this.parseAwait(forInit);
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types$1.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true, update, forInit);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) {
      this.checkLValSimple(node.argument);
    } else if (this.strict && node.operator === "delete" && isLocalVariableAccess(node.argument)) {
      this.raiseRecoverable(node.start, "Deleting local variable in strict mode");
    } else if (node.operator === "delete" && isPrivateFieldAccess(node.argument)) {
      this.raiseRecoverable(node.start, "Private fields can not be deleted");
    } else {
      sawUnary = true;
    }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else if (!sawUnary && this.type === types$1.privateId) {
    if ((forInit || this.privateNameStack.length === 0) && this.options.checkPrivateFields) {
      this.unexpected();
    }
    expr = this.parsePrivateIdent();
    if (this.type !== types$1._in) {
      this.unexpected();
    }
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors, forInit);
    if (this.checkExpressionErrors(refDestructuringErrors)) {
      return expr;
    }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.operator = this.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this.checkLValSimple(expr);
      this.next();
      expr = this.finishNode(node$1, "UpdateExpression");
    }
  }
  if (!incDec && this.eat(types$1.starstar)) {
    if (sawUnary) {
      this.unexpected(this.lastTokStart);
    } else {
      return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false, false, forInit), "**", false);
    }
  } else {
    return expr;
  }
};
function isLocalVariableAccess(node) {
  return node.type === "Identifier" || node.type === "ParenthesizedExpression" && isLocalVariableAccess(node.expression);
}
function isPrivateFieldAccess(node) {
  return node.type === "MemberExpression" && node.property.type === "PrivateIdentifier" || node.type === "ChainExpression" && isPrivateFieldAccess(node.expression) || node.type === "ParenthesizedExpression" && isPrivateFieldAccess(node.expression);
}
pp$5.parseExprSubscripts = function(refDestructuringErrors, forInit) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors, forInit);
  if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")") {
    return expr;
  }
  var result = this.parseSubscripts(expr, startPos, startLoc, false, forInit);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) {
      refDestructuringErrors.parenthesizedAssign = -1;
    }
    if (refDestructuringErrors.parenthesizedBind >= result.start) {
      refDestructuringErrors.parenthesizedBind = -1;
    }
    if (refDestructuringErrors.trailingComma >= result.start) {
      refDestructuringErrors.trailingComma = -1;
    }
  }
  return result;
};
pp$5.parseSubscripts = function(base, startPos, startLoc, noCalls, forInit) {
  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" && this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 && this.potentialArrowAt === base.start;
  var optionalChained = false;
  while (true) {
    var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit);
    if (element.optional) {
      optionalChained = true;
    }
    if (element === base || element.type === "ArrowFunctionExpression") {
      if (optionalChained) {
        var chainNode = this.startNodeAt(startPos, startLoc);
        chainNode.expression = element;
        element = this.finishNode(chainNode, "ChainExpression");
      }
      return element;
    }
    base = element;
  }
};
pp$5.shouldParseAsyncArrow = function() {
  return !this.canInsertSemicolon() && this.eat(types$1.arrow);
};
pp$5.parseSubscriptAsyncArrow = function(startPos, startLoc, exprList, forInit) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true, forInit);
};
pp$5.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit) {
  var optionalSupported = this.options.ecmaVersion >= 11;
  var optional = optionalSupported && this.eat(types$1.questionDot);
  if (noCalls && optional) {
    this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions");
  }
  var computed = this.eat(types$1.bracketL);
  if (computed || optional && this.type !== types$1.parenL && this.type !== types$1.backQuote || this.eat(types$1.dot)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.object = base;
    if (computed) {
      node.property = this.parseExpression();
      this.expect(types$1.bracketR);
    } else if (this.type === types$1.privateId && base.type !== "Super") {
      node.property = this.parsePrivateIdent();
    } else {
      node.property = this.parseIdent(this.options.allowReserved !== "never");
    }
    node.computed = !!computed;
    if (optionalSupported) {
      node.optional = optional;
    }
    base = this.finishNode(node, "MemberExpression");
  } else if (!noCalls && this.eat(types$1.parenL)) {
    var refDestructuringErrors = new DestructuringErrors(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    var exprList = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
    if (maybeAsyncArrow && !optional && this.shouldParseAsyncArrow()) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (this.awaitIdentPos > 0) {
        this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function");
      }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.parseSubscriptAsyncArrow(startPos, startLoc, exprList, forInit);
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
    var node$1 = this.startNodeAt(startPos, startLoc);
    node$1.callee = base;
    node$1.arguments = exprList;
    if (optionalSupported) {
      node$1.optional = optional;
    }
    base = this.finishNode(node$1, "CallExpression");
  } else if (this.type === types$1.backQuote) {
    if (optional || optionalChained) {
      this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
    }
    var node$2 = this.startNodeAt(startPos, startLoc);
    node$2.tag = base;
    node$2.quasi = this.parseTemplate({ isTagged: true });
    base = this.finishNode(node$2, "TaggedTemplateExpression");
  }
  return base;
};
pp$5.parseExprAtom = function(refDestructuringErrors, forInit, forNew) {
  if (this.type === types$1.slash) {
    this.readRegexp();
  }
  var node, canBeArrow = this.potentialArrowAt === this.start;
  switch (this.type) {
    case types$1._super:
      if (!this.allowSuper) {
        this.raise(this.start, "'super' keyword outside a method");
      }
      node = this.startNode();
      this.next();
      if (this.type === types$1.parenL && !this.allowDirectSuper) {
        this.raise(node.start, "super() call outside constructor of a subclass");
      }
      if (this.type !== types$1.dot && this.type !== types$1.bracketL && this.type !== types$1.parenL) {
        this.unexpected();
      }
      return this.finishNode(node, "Super");
    case types$1._this:
      node = this.startNode();
      this.next();
      return this.finishNode(node, "ThisExpression");
    case types$1.name:
      var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
      var id = this.parseIdent(false);
      if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types$1._function)) {
        this.overrideContext(types.f_expr);
        return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true, forInit);
      }
      if (canBeArrow && !this.canInsertSemicolon()) {
        if (this.eat(types$1.arrow)) {
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false, forInit);
        }
        if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types$1.name && !containsEsc && (!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc)) {
          id = this.parseIdent(false);
          if (this.canInsertSemicolon() || !this.eat(types$1.arrow)) {
            this.unexpected();
          }
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true, forInit);
        }
      }
      return id;
    case types$1.regexp:
      var value = this.value;
      node = this.parseLiteral(value.value);
      node.regex = { pattern: value.pattern, flags: value.flags };
      return node;
    case types$1.num:
    case types$1.string:
      return this.parseLiteral(this.value);
    case types$1._null:
    case types$1._true:
    case types$1._false:
      node = this.startNode();
      node.value = this.type === types$1._null ? null : this.type === types$1._true;
      node.raw = this.type.keyword;
      this.next();
      return this.finishNode(node, "Literal");
    case types$1.parenL:
      var start2 = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow, forInit);
      if (refDestructuringErrors) {
        if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr)) {
          refDestructuringErrors.parenthesizedAssign = start2;
        }
        if (refDestructuringErrors.parenthesizedBind < 0) {
          refDestructuringErrors.parenthesizedBind = start2;
        }
      }
      return expr;
    case types$1.bracketL:
      node = this.startNode();
      this.next();
      node.elements = this.parseExprList(types$1.bracketR, true, true, refDestructuringErrors);
      return this.finishNode(node, "ArrayExpression");
    case types$1.braceL:
      this.overrideContext(types.b_expr);
      return this.parseObj(false, refDestructuringErrors);
    case types$1._function:
      node = this.startNode();
      this.next();
      return this.parseFunction(node, 0);
    case types$1._class:
      return this.parseClass(this.startNode(), false);
    case types$1._new:
      return this.parseNew();
    case types$1.backQuote:
      return this.parseTemplate();
    case types$1._import:
      if (this.options.ecmaVersion >= 11) {
        return this.parseExprImport(forNew);
      } else {
        return this.unexpected();
      }
    default:
      return this.parseExprAtomDefault();
  }
};
pp$5.parseExprAtomDefault = function() {
  this.unexpected();
};
pp$5.parseExprImport = function(forNew) {
  var node = this.startNode();
  if (this.containsEsc) {
    this.raiseRecoverable(this.start, "Escape sequence in keyword import");
  }
  this.next();
  if (this.type === types$1.parenL && !forNew) {
    return this.parseDynamicImport(node);
  } else if (this.type === types$1.dot) {
    var meta = this.startNodeAt(node.start, node.loc && node.loc.start);
    meta.name = "import";
    node.meta = this.finishNode(meta, "Identifier");
    return this.parseImportMeta(node);
  } else {
    this.unexpected();
  }
};
pp$5.parseDynamicImport = function(node) {
  this.next();
  node.source = this.parseMaybeAssign();
  if (this.options.ecmaVersion >= 16) {
    if (!this.eat(types$1.parenR)) {
      this.expect(types$1.comma);
      if (!this.afterTrailingComma(types$1.parenR)) {
        node.options = this.parseMaybeAssign();
        if (!this.eat(types$1.parenR)) {
          this.expect(types$1.comma);
          if (!this.afterTrailingComma(types$1.parenR)) {
            this.unexpected();
          }
        }
      } else {
        node.options = null;
      }
    } else {
      node.options = null;
    }
  } else {
    if (!this.eat(types$1.parenR)) {
      var errorPos = this.start;
      if (this.eat(types$1.comma) && this.eat(types$1.parenR)) {
        this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
      } else {
        this.unexpected(errorPos);
      }
    }
  }
  return this.finishNode(node, "ImportExpression");
};
pp$5.parseImportMeta = function(node) {
  this.next();
  var containsEsc = this.containsEsc;
  node.property = this.parseIdent(true);
  if (node.property.name !== "meta") {
    this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'");
  }
  if (containsEsc) {
    this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters");
  }
  if (this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere) {
    this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module");
  }
  return this.finishNode(node, "MetaProperty");
};
pp$5.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  if (node.raw.charCodeAt(node.raw.length - 1) === 110) {
    node.bigint = node.value != null ? node.value.toString() : node.raw.slice(0, -1).replace(/_/g, "");
  }
  this.next();
  return this.finishNode(node, "Literal");
};
pp$5.parseParenExpression = function() {
  this.expect(types$1.parenL);
  var val = this.parseExpression();
  this.expect(types$1.parenR);
  return val;
};
pp$5.shouldParseArrow = function(exprList) {
  return !this.canInsertSemicolon();
};
pp$5.parseParenAndDistinguishExpression = function(canBeArrow, forInit) {
  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();
    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    while (this.type !== types$1.parenR) {
      first ? first = false : this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(types$1.parenR, true)) {
        lastIsComma = true;
        break;
      } else if (this.type === types$1.ellipsis) {
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRestBinding()));
        if (this.type === types$1.comma) {
          this.raiseRecoverable(
            this.start,
            "Comma is not permitted after the rest element"
          );
        }
        break;
      } else {
        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
      }
    }
    var innerEndPos = this.lastTokEnd, innerEndLoc = this.lastTokEndLoc;
    this.expect(types$1.parenR);
    if (canBeArrow && this.shouldParseArrow(exprList) && this.eat(types$1.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList, forInit);
    }
    if (!exprList.length || lastIsComma) {
      this.unexpected(this.lastTokStart);
    }
    if (spreadStart) {
      this.unexpected(spreadStart);
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }
  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression");
  } else {
    return val;
  }
};
pp$5.parseParenItem = function(item) {
  return item;
};
pp$5.parseParenArrowList = function(startPos, startLoc, exprList, forInit) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, false, forInit);
};
var empty = [];
pp$5.parseNew = function() {
  if (this.containsEsc) {
    this.raiseRecoverable(this.start, "Escape sequence in keyword new");
  }
  var node = this.startNode();
  this.next();
  if (this.options.ecmaVersion >= 6 && this.type === types$1.dot) {
    var meta = this.startNodeAt(node.start, node.loc && node.loc.start);
    meta.name = "new";
    node.meta = this.finishNode(meta, "Identifier");
    this.next();
    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target") {
      this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'");
    }
    if (containsEsc) {
      this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters");
    }
    if (!this.allowNewDotTarget) {
      this.raiseRecoverable(node.start, "'new.target' can only be used in functions and class static block");
    }
    return this.finishNode(node, "MetaProperty");
  }
  var startPos = this.start, startLoc = this.startLoc;
  node.callee = this.parseSubscripts(this.parseExprAtom(null, false, true), startPos, startLoc, true, false);
  if (this.eat(types$1.parenL)) {
    node.arguments = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false);
  } else {
    node.arguments = empty;
  }
  return this.finishNode(node, "NewExpression");
};
pp$5.parseTemplateElement = function(ref2) {
  var isTagged = ref2.isTagged;
  var elem = this.startNode();
  if (this.type === types$1.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value.replace(/\r\n?/g, "\n"),
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types$1.backQuote;
  return this.finishNode(elem, "TemplateElement");
};
pp$5.parseTemplate = function(ref2) {
  if (ref2 === void 0) ref2 = {};
  var isTagged = ref2.isTagged;
  if (isTagged === void 0) isTagged = false;
  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({ isTagged });
  node.quasis = [curElt];
  while (!curElt.tail) {
    if (this.type === types$1.eof) {
      this.raise(this.pos, "Unterminated template literal");
    }
    this.expect(types$1.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(types$1.braceR);
    node.quasis.push(curElt = this.parseTemplateElement({ isTagged }));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral");
};
pp$5.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" && (this.type === types$1.name || this.type === types$1.num || this.type === types$1.string || this.type === types$1.bracketL || this.type.keyword || this.options.ecmaVersion >= 9 && this.type === types$1.star) && !lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
};
pp$5.parseObj = function(isPattern, refDestructuringErrors) {
  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    var prop = this.parseProperty(isPattern, refDestructuringErrors);
    if (!isPattern) {
      this.checkPropClash(prop, propHash, refDestructuringErrors);
    }
    node.properties.push(prop);
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
};
pp$5.parseProperty = function(isPattern, refDestructuringErrors) {
  var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
  if (this.options.ecmaVersion >= 9 && this.eat(types$1.ellipsis)) {
    if (isPattern) {
      prop.argument = this.parseIdent(false);
      if (this.type === types$1.comma) {
        this.raiseRecoverable(this.start, "Comma is not permitted after the rest element");
      }
      return this.finishNode(prop, "RestElement");
    }
    prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    if (this.type === types$1.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
      refDestructuringErrors.trailingComma = this.start;
    }
    return this.finishNode(prop, "SpreadElement");
  }
  if (this.options.ecmaVersion >= 6) {
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refDestructuringErrors) {
      startPos = this.start;
      startLoc = this.startLoc;
    }
    if (!isPattern) {
      isGenerator = this.eat(types$1.star);
    }
  }
  var containsEsc = this.containsEsc;
  this.parsePropertyName(prop);
  if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
    isAsync = true;
    isGenerator = this.options.ecmaVersion >= 9 && this.eat(types$1.star);
    this.parsePropertyName(prop);
  } else {
    isAsync = false;
  }
  this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
  return this.finishNode(prop, "Property");
};
pp$5.parseGetterSetter = function(prop) {
  var kind = prop.key.name;
  this.parsePropertyName(prop);
  prop.value = this.parseMethod(false);
  prop.kind = kind;
  var paramCount = prop.kind === "get" ? 0 : 1;
  if (prop.value.params.length !== paramCount) {
    var start2 = prop.value.start;
    if (prop.kind === "get") {
      this.raiseRecoverable(start2, "getter should have no params");
    } else {
      this.raiseRecoverable(start2, "setter should have exactly one param");
    }
  } else {
    if (prop.kind === "set" && prop.value.params[0].type === "RestElement") {
      this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params");
    }
  }
};
pp$5.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
  if ((isGenerator || isAsync) && this.type === types$1.colon) {
    this.unexpected();
  }
  if (this.eat(types$1.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types$1.parenL) {
    if (isPattern) {
      this.unexpected();
    }
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
    prop.kind = "init";
  } else if (!isPattern && !containsEsc && this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && (this.type !== types$1.comma && this.type !== types$1.braceR && this.type !== types$1.eq)) {
    if (isGenerator || isAsync) {
      this.unexpected();
    }
    this.parseGetterSetter(prop);
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    if (isGenerator || isAsync) {
      this.unexpected();
    }
    this.checkUnreserved(prop.key);
    if (prop.key.name === "await" && !this.awaitIdentPos) {
      this.awaitIdentPos = startPos;
    }
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else if (this.type === types$1.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0) {
        refDestructuringErrors.shorthandAssign = this.start;
      }
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else {
      prop.value = this.copyNode(prop.key);
    }
    prop.kind = "init";
    prop.shorthand = true;
  } else {
    this.unexpected();
  }
};
pp$5.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types$1.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types$1.bracketR);
      return prop.key;
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types$1.num || this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never");
};
pp$5.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) {
    node.generator = node.expression = false;
  }
  if (this.options.ecmaVersion >= 8) {
    node.async = false;
  }
};
pp$5.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
  var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6) {
    node.generator = isGenerator;
  }
  if (this.options.ecmaVersion >= 8) {
    node.async = !!isAsync;
  }
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));
  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false, true, false);
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "FunctionExpression");
};
pp$5.parseArrowExpression = function(node, params, isAsync, forInit) {
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8) {
    node.async = !!isAsync;
  }
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true, false, forInit);
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "ArrowFunctionExpression");
};
pp$5.parseFunctionBody = function(node, isArrowFunction, isMethod, forInit) {
  var isExpression = isArrowFunction && this.type !== types$1.braceL;
  var oldStrict = this.strict, useStrict = false;
  if (isExpression) {
    node.body = this.parseMaybeAssign(forInit);
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      if (useStrict && nonSimple) {
        this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list");
      }
    }
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) {
      this.strict = true;
    }
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
    if (this.strict && node.id) {
      this.checkLValSimple(node.id, BIND_OUTSIDE);
    }
    node.body = this.parseBlock(false, void 0, useStrict && !oldStrict);
    node.expression = false;
    this.adaptDirectivePrologue(node.body.body);
    this.labels = oldLabels;
  }
  this.exitScope();
};
pp$5.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1) {
    var param = list[i];
    if (param.type !== "Identifier") {
      return false;
    }
  }
  return true;
};
pp$5.checkParams = function(node, allowDuplicates) {
  var nameHash = /* @__PURE__ */ Object.create(null);
  for (var i = 0, list = node.params; i < list.length; i += 1) {
    var param = list[i];
    this.checkLValInnerPattern(param, BIND_VAR, allowDuplicates ? null : nameHash);
  }
};
pp$5.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(close)) {
        break;
      }
    } else {
      first = false;
    }
    var elt = void 0;
    if (allowEmpty && this.type === types$1.comma) {
      elt = null;
    } else if (this.type === types$1.ellipsis) {
      elt = this.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this.type === types$1.comma && refDestructuringErrors.trailingComma < 0) {
        refDestructuringErrors.trailingComma = this.start;
      }
    } else {
      elt = this.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts;
};
pp$5.checkUnreserved = function(ref2) {
  var start2 = ref2.start;
  var end = ref2.end;
  var name = ref2.name;
  if (this.inGenerator && name === "yield") {
    this.raiseRecoverable(start2, "Cannot use 'yield' as identifier inside a generator");
  }
  if (this.inAsync && name === "await") {
    this.raiseRecoverable(start2, "Cannot use 'await' as identifier inside an async function");
  }
  if (!(this.currentThisScope().flags & SCOPE_VAR) && name === "arguments") {
    this.raiseRecoverable(start2, "Cannot use 'arguments' in class field initializer");
  }
  if (this.inClassStaticBlock && (name === "arguments" || name === "await")) {
    this.raise(start2, "Cannot use " + name + " in class static initialization block");
  }
  if (this.keywords.test(name)) {
    this.raise(start2, "Unexpected keyword '" + name + "'");
  }
  if (this.options.ecmaVersion < 6 && this.input.slice(start2, end).indexOf("\\") !== -1) {
    return;
  }
  var re2 = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re2.test(name)) {
    if (!this.inAsync && name === "await") {
      this.raiseRecoverable(start2, "Cannot use keyword 'await' outside an async function");
    }
    this.raiseRecoverable(start2, "The keyword '" + name + "' is reserved");
  }
};
pp$5.parseIdent = function(liberal) {
  var node = this.parseIdentNode();
  this.next(!!liberal);
  this.finishNode(node, "Identifier");
  if (!liberal) {
    this.checkUnreserved(node);
    if (node.name === "await" && !this.awaitIdentPos) {
      this.awaitIdentPos = node.start;
    }
  }
  return node;
};
pp$5.parseIdentNode = function() {
  var node = this.startNode();
  if (this.type === types$1.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;
    if ((node.name === "class" || node.name === "function") && (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
      this.context.pop();
    }
    this.type = types$1.name;
  } else {
    this.unexpected();
  }
  return node;
};
pp$5.parsePrivateIdent = function() {
  var node = this.startNode();
  if (this.type === types$1.privateId) {
    node.name = this.value;
  } else {
    this.unexpected();
  }
  this.next();
  this.finishNode(node, "PrivateIdentifier");
  if (this.options.checkPrivateFields) {
    if (this.privateNameStack.length === 0) {
      this.raise(node.start, "Private field '#" + node.name + "' must be declared in an enclosing class");
    } else {
      this.privateNameStack[this.privateNameStack.length - 1].used.push(node);
    }
  }
  return node;
};
pp$5.parseYield = function(forInit) {
  if (!this.yieldPos) {
    this.yieldPos = this.start;
  }
  var node = this.startNode();
  this.next();
  if (this.type === types$1.semi || this.canInsertSemicolon() || this.type !== types$1.star && !this.type.startsExpr) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types$1.star);
    node.argument = this.parseMaybeAssign(forInit);
  }
  return this.finishNode(node, "YieldExpression");
};
pp$5.parseAwait = function(forInit) {
  if (!this.awaitPos) {
    this.awaitPos = this.start;
  }
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true, false, forInit);
  return this.finishNode(node, "AwaitExpression");
};
var pp$4 = Parser.prototype;
pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  if (this.sourceFile) {
    message += " in " + this.sourceFile;
  }
  var err = new SyntaxError(message);
  err.pos = pos;
  err.loc = loc;
  err.raisedAt = this.pos;
  throw err;
};
pp$4.raiseRecoverable = pp$4.raise;
pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart);
  }
};
var pp$3 = Parser.prototype;
var Scope = function Scope2(flags) {
  this.flags = flags;
  this.var = [];
  this.lexical = [];
  this.functions = [];
};
pp$3.enterScope = function(flags) {
  this.scopeStack.push(new Scope(flags));
};
pp$3.exitScope = function() {
  this.scopeStack.pop();
};
pp$3.treatFunctionsAsVarInScope = function(scope) {
  return scope.flags & SCOPE_FUNCTION || !this.inModule && scope.flags & SCOPE_TOP;
};
pp$3.declareName = function(name, bindingType, pos) {
  var redeclared = false;
  if (bindingType === BIND_LEXICAL) {
    var scope = this.currentScope();
    redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
    scope.lexical.push(name);
    if (this.inModule && scope.flags & SCOPE_TOP) {
      delete this.undefinedExports[name];
    }
  } else if (bindingType === BIND_SIMPLE_CATCH) {
    var scope$1 = this.currentScope();
    scope$1.lexical.push(name);
  } else if (bindingType === BIND_FUNCTION) {
    var scope$2 = this.currentScope();
    if (this.treatFunctionsAsVar) {
      redeclared = scope$2.lexical.indexOf(name) > -1;
    } else {
      redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1;
    }
    scope$2.functions.push(name);
  } else {
    for (var i = this.scopeStack.length - 1; i >= 0; --i) {
      var scope$3 = this.scopeStack[i];
      if (scope$3.lexical.indexOf(name) > -1 && !(scope$3.flags & SCOPE_SIMPLE_CATCH && scope$3.lexical[0] === name) || !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
        redeclared = true;
        break;
      }
      scope$3.var.push(name);
      if (this.inModule && scope$3.flags & SCOPE_TOP) {
        delete this.undefinedExports[name];
      }
      if (scope$3.flags & SCOPE_VAR) {
        break;
      }
    }
  }
  if (redeclared) {
    this.raiseRecoverable(pos, "Identifier '" + name + "' has already been declared");
  }
};
pp$3.checkLocalExport = function(id) {
  if (this.scopeStack[0].lexical.indexOf(id.name) === -1 && this.scopeStack[0].var.indexOf(id.name) === -1) {
    this.undefinedExports[id.name] = id;
  }
};
pp$3.currentScope = function() {
  return this.scopeStack[this.scopeStack.length - 1];
};
pp$3.currentVarScope = function() {
  for (var i = this.scopeStack.length - 1; ; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & (SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK)) {
      return scope;
    }
  }
};
pp$3.currentThisScope = function() {
  for (var i = this.scopeStack.length - 1; ; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & (SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK) && !(scope.flags & SCOPE_ARROW)) {
      return scope;
    }
  }
};
var Node = function Node2(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations) {
    this.loc = new SourceLocation(parser, loc);
  }
  if (parser.options.directSourceFile) {
    this.sourceFile = parser.options.directSourceFile;
  }
  if (parser.options.ranges) {
    this.range = [pos, 0];
  }
};
var pp$2 = Parser.prototype;
pp$2.startNode = function() {
  return new Node(this, this.start, this.startLoc);
};
pp$2.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc);
};
function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations) {
    node.loc.end = loc;
  }
  if (this.options.ranges) {
    node.range[1] = pos;
  }
  return node;
}
pp$2.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc);
};
pp$2.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc);
};
pp$2.copyNode = function(node) {
  var newNode = new Node(this, node.start, this.startLoc);
  for (var prop in node) {
    newNode[prop] = node[prop];
  }
  return newNode;
};
var scriptValuesAddedInUnicode = "Berf Beria_Erfe Gara Garay Gukh Gurung_Khema Hrkt Katakana_Or_Hiragana Kawi Kirat_Rai Krai Nag_Mundari Nagm Ol_Onal Onao Sidetic Sidt Sunu Sunuwar Tai_Yo Tayo Todhri Todr Tolong_Siki Tols Tulu_Tigalari Tutg Unknown Zzzz";
var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
var ecma11BinaryProperties = ecma10BinaryProperties;
var ecma12BinaryProperties = ecma11BinaryProperties + " EBase EComp EMod EPres ExtPict";
var ecma13BinaryProperties = ecma12BinaryProperties;
var ecma14BinaryProperties = ecma13BinaryProperties;
var unicodeBinaryProperties = {
  9: ecma9BinaryProperties,
  10: ecma10BinaryProperties,
  11: ecma11BinaryProperties,
  12: ecma12BinaryProperties,
  13: ecma13BinaryProperties,
  14: ecma14BinaryProperties
};
var ecma14BinaryPropertiesOfStrings = "Basic_Emoji Emoji_Keycap_Sequence RGI_Emoji_Modifier_Sequence RGI_Emoji_Flag_Sequence RGI_Emoji_Tag_Sequence RGI_Emoji_ZWJ_Sequence RGI_Emoji";
var unicodeBinaryPropertiesOfStrings = {
  9: "",
  10: "",
  11: "",
  12: "",
  13: "",
  14: ecma14BinaryPropertiesOfStrings
};
var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";
var ecma9ScriptValues = "Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
var ecma12ScriptValues = ecma11ScriptValues + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
var ecma13ScriptValues = ecma12ScriptValues + " Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith";
var ecma14ScriptValues = ecma13ScriptValues + " " + scriptValuesAddedInUnicode;
var unicodeScriptValues = {
  9: ecma9ScriptValues,
  10: ecma10ScriptValues,
  11: ecma11ScriptValues,
  12: ecma12ScriptValues,
  13: ecma13ScriptValues,
  14: ecma14ScriptValues
};
var data = {};
function buildUnicodeData(ecmaVersion) {
  var d = data[ecmaVersion] = {
    binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
    binaryOfStrings: wordsRegexp(unicodeBinaryPropertiesOfStrings[ecmaVersion]),
    nonBinary: {
      General_Category: wordsRegexp(unicodeGeneralCategoryValues),
      Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
    }
  };
  d.nonBinary.Script_Extensions = d.nonBinary.Script;
  d.nonBinary.gc = d.nonBinary.General_Category;
  d.nonBinary.sc = d.nonBinary.Script;
  d.nonBinary.scx = d.nonBinary.Script_Extensions;
}
for (i = 0, list = [9, 10, 11, 12, 13, 14]; i < list.length; i += 1) {
  ecmaVersion = list[i];
  buildUnicodeData(ecmaVersion);
}
var ecmaVersion;
var i;
var list;
var pp$1 = Parser.prototype;
var BranchID = function BranchID2(parent, base) {
  this.parent = parent;
  this.base = base || this;
};
BranchID.prototype.separatedFrom = function separatedFrom(alt) {
  for (var self = this; self; self = self.parent) {
    for (var other = alt; other; other = other.parent) {
      if (self.base === other.base && self !== other) {
        return true;
      }
    }
  }
  return false;
};
BranchID.prototype.sibling = function sibling() {
  return new BranchID(this.parent, this.base);
};
var RegExpValidationState = function RegExpValidationState2(parser) {
  this.parser = parser;
  this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "") + (parser.options.ecmaVersion >= 13 ? "d" : "") + (parser.options.ecmaVersion >= 15 ? "v" : "");
  this.unicodeProperties = data[parser.options.ecmaVersion >= 14 ? 14 : parser.options.ecmaVersion];
  this.source = "";
  this.flags = "";
  this.start = 0;
  this.switchU = false;
  this.switchV = false;
  this.switchN = false;
  this.pos = 0;
  this.lastIntValue = 0;
  this.lastStringValue = "";
  this.lastAssertionIsQuantifiable = false;
  this.numCapturingParens = 0;
  this.maxBackReference = 0;
  this.groupNames = /* @__PURE__ */ Object.create(null);
  this.backReferenceNames = [];
  this.branchID = null;
};
RegExpValidationState.prototype.reset = function reset(start2, pattern, flags) {
  var unicodeSets = flags.indexOf("v") !== -1;
  var unicode = flags.indexOf("u") !== -1;
  this.start = start2 | 0;
  this.source = pattern + "";
  this.flags = flags;
  if (unicodeSets && this.parser.options.ecmaVersion >= 15) {
    this.switchU = true;
    this.switchV = true;
    this.switchN = true;
  } else {
    this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
    this.switchV = false;
    this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
  }
};
RegExpValidationState.prototype.raise = function raise(message) {
  this.parser.raiseRecoverable(this.start, "Invalid regular expression: /" + this.source + "/: " + message);
};
RegExpValidationState.prototype.at = function at(i, forceU) {
  if (forceU === void 0) forceU = false;
  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return -1;
  }
  var c = s.charCodeAt(i);
  if (!(forceU || this.switchU) || c <= 55295 || c >= 57344 || i + 1 >= l) {
    return c;
  }
  var next = s.charCodeAt(i + 1);
  return next >= 56320 && next <= 57343 ? (c << 10) + next - 56613888 : c;
};
RegExpValidationState.prototype.nextIndex = function nextIndex(i, forceU) {
  if (forceU === void 0) forceU = false;
  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return l;
  }
  var c = s.charCodeAt(i), next;
  if (!(forceU || this.switchU) || c <= 55295 || c >= 57344 || i + 1 >= l || (next = s.charCodeAt(i + 1)) < 56320 || next > 57343) {
    return i + 1;
  }
  return i + 2;
};
RegExpValidationState.prototype.current = function current(forceU) {
  if (forceU === void 0) forceU = false;
  return this.at(this.pos, forceU);
};
RegExpValidationState.prototype.lookahead = function lookahead(forceU) {
  if (forceU === void 0) forceU = false;
  return this.at(this.nextIndex(this.pos, forceU), forceU);
};
RegExpValidationState.prototype.advance = function advance(forceU) {
  if (forceU === void 0) forceU = false;
  this.pos = this.nextIndex(this.pos, forceU);
};
RegExpValidationState.prototype.eat = function eat(ch, forceU) {
  if (forceU === void 0) forceU = false;
  if (this.current(forceU) === ch) {
    this.advance(forceU);
    return true;
  }
  return false;
};
RegExpValidationState.prototype.eatChars = function eatChars(chs, forceU) {
  if (forceU === void 0) forceU = false;
  var pos = this.pos;
  for (var i = 0, list = chs; i < list.length; i += 1) {
    var ch = list[i];
    var current2 = this.at(pos, forceU);
    if (current2 === -1 || current2 !== ch) {
      return false;
    }
    pos = this.nextIndex(pos, forceU);
  }
  this.pos = pos;
  return true;
};
pp$1.validateRegExpFlags = function(state) {
  var validFlags = state.validFlags;
  var flags = state.flags;
  var u = false;
  var v = false;
  for (var i = 0; i < flags.length; i++) {
    var flag = flags.charAt(i);
    if (validFlags.indexOf(flag) === -1) {
      this.raise(state.start, "Invalid regular expression flag");
    }
    if (flags.indexOf(flag, i + 1) > -1) {
      this.raise(state.start, "Duplicate regular expression flag");
    }
    if (flag === "u") {
      u = true;
    }
    if (flag === "v") {
      v = true;
    }
  }
  if (this.options.ecmaVersion >= 15 && u && v) {
    this.raise(state.start, "Invalid regular expression flag");
  }
};
function hasProp(obj) {
  for (var _ in obj) {
    return true;
  }
  return false;
}
pp$1.validateRegExpPattern = function(state) {
  this.regexp_pattern(state);
  if (!state.switchN && this.options.ecmaVersion >= 9 && hasProp(state.groupNames)) {
    state.switchN = true;
    this.regexp_pattern(state);
  }
};
pp$1.regexp_pattern = function(state) {
  state.pos = 0;
  state.lastIntValue = 0;
  state.lastStringValue = "";
  state.lastAssertionIsQuantifiable = false;
  state.numCapturingParens = 0;
  state.maxBackReference = 0;
  state.groupNames = /* @__PURE__ */ Object.create(null);
  state.backReferenceNames.length = 0;
  state.branchID = null;
  this.regexp_disjunction(state);
  if (state.pos !== state.source.length) {
    if (state.eat(
      41
      /* ) */
    )) {
      state.raise("Unmatched ')'");
    }
    if (state.eat(
      93
      /* ] */
    ) || state.eat(
      125
      /* } */
    )) {
      state.raise("Lone quantifier brackets");
    }
  }
  if (state.maxBackReference > state.numCapturingParens) {
    state.raise("Invalid escape");
  }
  for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
    var name = list[i];
    if (!state.groupNames[name]) {
      state.raise("Invalid named capture referenced");
    }
  }
};
pp$1.regexp_disjunction = function(state) {
  var trackDisjunction = this.options.ecmaVersion >= 16;
  if (trackDisjunction) {
    state.branchID = new BranchID(state.branchID, null);
  }
  this.regexp_alternative(state);
  while (state.eat(
    124
    /* | */
  )) {
    if (trackDisjunction) {
      state.branchID = state.branchID.sibling();
    }
    this.regexp_alternative(state);
  }
  if (trackDisjunction) {
    state.branchID = state.branchID.parent;
  }
  if (this.regexp_eatQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  if (state.eat(
    123
    /* { */
  )) {
    state.raise("Lone quantifier brackets");
  }
};
pp$1.regexp_alternative = function(state) {
  while (state.pos < state.source.length && this.regexp_eatTerm(state)) {
  }
};
pp$1.regexp_eatTerm = function(state) {
  if (this.regexp_eatAssertion(state)) {
    if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
      if (state.switchU) {
        state.raise("Invalid quantifier");
      }
    }
    return true;
  }
  if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
    this.regexp_eatQuantifier(state);
    return true;
  }
  return false;
};
pp$1.regexp_eatAssertion = function(state) {
  var start2 = state.pos;
  state.lastAssertionIsQuantifiable = false;
  if (state.eat(
    94
    /* ^ */
  ) || state.eat(
    36
    /* $ */
  )) {
    return true;
  }
  if (state.eat(
    92
    /* \ */
  )) {
    if (state.eat(
      66
      /* B */
    ) || state.eat(
      98
      /* b */
    )) {
      return true;
    }
    state.pos = start2;
  }
  if (state.eat(
    40
    /* ( */
  ) && state.eat(
    63
    /* ? */
  )) {
    var lookbehind = false;
    if (this.options.ecmaVersion >= 9) {
      lookbehind = state.eat(
        60
        /* < */
      );
    }
    if (state.eat(
      61
      /* = */
    ) || state.eat(
      33
      /* ! */
    )) {
      this.regexp_disjunction(state);
      if (!state.eat(
        41
        /* ) */
      )) {
        state.raise("Unterminated group");
      }
      state.lastAssertionIsQuantifiable = !lookbehind;
      return true;
    }
  }
  state.pos = start2;
  return false;
};
pp$1.regexp_eatQuantifier = function(state, noError) {
  if (noError === void 0) noError = false;
  if (this.regexp_eatQuantifierPrefix(state, noError)) {
    state.eat(
      63
      /* ? */
    );
    return true;
  }
  return false;
};
pp$1.regexp_eatQuantifierPrefix = function(state, noError) {
  return state.eat(
    42
    /* * */
  ) || state.eat(
    43
    /* + */
  ) || state.eat(
    63
    /* ? */
  ) || this.regexp_eatBracedQuantifier(state, noError);
};
pp$1.regexp_eatBracedQuantifier = function(state, noError) {
  var start2 = state.pos;
  if (state.eat(
    123
    /* { */
  )) {
    var min = 0, max = -1;
    if (this.regexp_eatDecimalDigits(state)) {
      min = state.lastIntValue;
      if (state.eat(
        44
        /* , */
      ) && this.regexp_eatDecimalDigits(state)) {
        max = state.lastIntValue;
      }
      if (state.eat(
        125
        /* } */
      )) {
        if (max !== -1 && max < min && !noError) {
          state.raise("numbers out of order in {} quantifier");
        }
        return true;
      }
    }
    if (state.switchU && !noError) {
      state.raise("Incomplete quantifier");
    }
    state.pos = start2;
  }
  return false;
};
pp$1.regexp_eatAtom = function(state) {
  return this.regexp_eatPatternCharacters(state) || state.eat(
    46
    /* . */
  ) || this.regexp_eatReverseSolidusAtomEscape(state) || this.regexp_eatCharacterClass(state) || this.regexp_eatUncapturingGroup(state) || this.regexp_eatCapturingGroup(state);
};
pp$1.regexp_eatReverseSolidusAtomEscape = function(state) {
  var start2 = state.pos;
  if (state.eat(
    92
    /* \ */
  )) {
    if (this.regexp_eatAtomEscape(state)) {
      return true;
    }
    state.pos = start2;
  }
  return false;
};
pp$1.regexp_eatUncapturingGroup = function(state) {
  var start2 = state.pos;
  if (state.eat(
    40
    /* ( */
  )) {
    if (state.eat(
      63
      /* ? */
    )) {
      if (this.options.ecmaVersion >= 16) {
        var addModifiers = this.regexp_eatModifiers(state);
        var hasHyphen = state.eat(
          45
          /* - */
        );
        if (addModifiers || hasHyphen) {
          for (var i = 0; i < addModifiers.length; i++) {
            var modifier = addModifiers.charAt(i);
            if (addModifiers.indexOf(modifier, i + 1) > -1) {
              state.raise("Duplicate regular expression modifiers");
            }
          }
          if (hasHyphen) {
            var removeModifiers = this.regexp_eatModifiers(state);
            if (!addModifiers && !removeModifiers && state.current() === 58) {
              state.raise("Invalid regular expression modifiers");
            }
            for (var i$1 = 0; i$1 < removeModifiers.length; i$1++) {
              var modifier$1 = removeModifiers.charAt(i$1);
              if (removeModifiers.indexOf(modifier$1, i$1 + 1) > -1 || addModifiers.indexOf(modifier$1) > -1) {
                state.raise("Duplicate regular expression modifiers");
              }
            }
          }
        }
      }
      if (state.eat(
        58
        /* : */
      )) {
        this.regexp_disjunction(state);
        if (state.eat(
          41
          /* ) */
        )) {
          return true;
        }
        state.raise("Unterminated group");
      }
    }
    state.pos = start2;
  }
  return false;
};
pp$1.regexp_eatCapturingGroup = function(state) {
  if (state.eat(
    40
    /* ( */
  )) {
    if (this.options.ecmaVersion >= 9) {
      this.regexp_groupSpecifier(state);
    } else if (state.current() === 63) {
      state.raise("Invalid group");
    }
    this.regexp_disjunction(state);
    if (state.eat(
      41
      /* ) */
    )) {
      state.numCapturingParens += 1;
      return true;
    }
    state.raise("Unterminated group");
  }
  return false;
};
pp$1.regexp_eatModifiers = function(state) {
  var modifiers = "";
  var ch = 0;
  while ((ch = state.current()) !== -1 && isRegularExpressionModifier(ch)) {
    modifiers += codePointToString(ch);
    state.advance();
  }
  return modifiers;
};
function isRegularExpressionModifier(ch) {
  return ch === 105 || ch === 109 || ch === 115;
}
pp$1.regexp_eatExtendedAtom = function(state) {
  return state.eat(
    46
    /* . */
  ) || this.regexp_eatReverseSolidusAtomEscape(state) || this.regexp_eatCharacterClass(state) || this.regexp_eatUncapturingGroup(state) || this.regexp_eatCapturingGroup(state) || this.regexp_eatInvalidBracedQuantifier(state) || this.regexp_eatExtendedPatternCharacter(state);
};
pp$1.regexp_eatInvalidBracedQuantifier = function(state) {
  if (this.regexp_eatBracedQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  return false;
};
pp$1.regexp_eatSyntaxCharacter = function(state) {
  var ch = state.current();
  if (isSyntaxCharacter(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
function isSyntaxCharacter(ch) {
  return ch === 36 || ch >= 40 && ch <= 43 || ch === 46 || ch === 63 || ch >= 91 && ch <= 94 || ch >= 123 && ch <= 125;
}
pp$1.regexp_eatPatternCharacters = function(state) {
  var start2 = state.pos;
  var ch = 0;
  while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
    state.advance();
  }
  return state.pos !== start2;
};
pp$1.regexp_eatExtendedPatternCharacter = function(state) {
  var ch = state.current();
  if (ch !== -1 && ch !== 36 && !(ch >= 40 && ch <= 43) && ch !== 46 && ch !== 63 && ch !== 91 && ch !== 94 && ch !== 124) {
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_groupSpecifier = function(state) {
  if (state.eat(
    63
    /* ? */
  )) {
    if (!this.regexp_eatGroupName(state)) {
      state.raise("Invalid group");
    }
    var trackDisjunction = this.options.ecmaVersion >= 16;
    var known = state.groupNames[state.lastStringValue];
    if (known) {
      if (trackDisjunction) {
        for (var i = 0, list = known; i < list.length; i += 1) {
          var altID = list[i];
          if (!altID.separatedFrom(state.branchID)) {
            state.raise("Duplicate capture group name");
          }
        }
      } else {
        state.raise("Duplicate capture group name");
      }
    }
    if (trackDisjunction) {
      (known || (state.groupNames[state.lastStringValue] = [])).push(state.branchID);
    } else {
      state.groupNames[state.lastStringValue] = true;
    }
  }
};
pp$1.regexp_eatGroupName = function(state) {
  state.lastStringValue = "";
  if (state.eat(
    60
    /* < */
  )) {
    if (this.regexp_eatRegExpIdentifierName(state) && state.eat(
      62
      /* > */
    )) {
      return true;
    }
    state.raise("Invalid capture group name");
  }
  return false;
};
pp$1.regexp_eatRegExpIdentifierName = function(state) {
  state.lastStringValue = "";
  if (this.regexp_eatRegExpIdentifierStart(state)) {
    state.lastStringValue += codePointToString(state.lastIntValue);
    while (this.regexp_eatRegExpIdentifierPart(state)) {
      state.lastStringValue += codePointToString(state.lastIntValue);
    }
    return true;
  }
  return false;
};
pp$1.regexp_eatRegExpIdentifierStart = function(state) {
  var start2 = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);
  if (ch === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierStart(ch)) {
    state.lastIntValue = ch;
    return true;
  }
  state.pos = start2;
  return false;
};
function isRegExpIdentifierStart(ch) {
  return isIdentifierStart(ch, true) || ch === 36 || ch === 95;
}
pp$1.regexp_eatRegExpIdentifierPart = function(state) {
  var start2 = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);
  if (ch === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierPart(ch)) {
    state.lastIntValue = ch;
    return true;
  }
  state.pos = start2;
  return false;
};
function isRegExpIdentifierPart(ch) {
  return isIdentifierChar(ch, true) || ch === 36 || ch === 95 || ch === 8204 || ch === 8205;
}
pp$1.regexp_eatAtomEscape = function(state) {
  if (this.regexp_eatBackReference(state) || this.regexp_eatCharacterClassEscape(state) || this.regexp_eatCharacterEscape(state) || state.switchN && this.regexp_eatKGroupName(state)) {
    return true;
  }
  if (state.switchU) {
    if (state.current() === 99) {
      state.raise("Invalid unicode escape");
    }
    state.raise("Invalid escape");
  }
  return false;
};
pp$1.regexp_eatBackReference = function(state) {
  var start2 = state.pos;
  if (this.regexp_eatDecimalEscape(state)) {
    var n = state.lastIntValue;
    if (state.switchU) {
      if (n > state.maxBackReference) {
        state.maxBackReference = n;
      }
      return true;
    }
    if (n <= state.numCapturingParens) {
      return true;
    }
    state.pos = start2;
  }
  return false;
};
pp$1.regexp_eatKGroupName = function(state) {
  if (state.eat(
    107
    /* k */
  )) {
    if (this.regexp_eatGroupName(state)) {
      state.backReferenceNames.push(state.lastStringValue);
      return true;
    }
    state.raise("Invalid named reference");
  }
  return false;
};
pp$1.regexp_eatCharacterEscape = function(state) {
  return this.regexp_eatControlEscape(state) || this.regexp_eatCControlLetter(state) || this.regexp_eatZero(state) || this.regexp_eatHexEscapeSequence(state) || this.regexp_eatRegExpUnicodeEscapeSequence(state, false) || !state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state) || this.regexp_eatIdentityEscape(state);
};
pp$1.regexp_eatCControlLetter = function(state) {
  var start2 = state.pos;
  if (state.eat(
    99
    /* c */
  )) {
    if (this.regexp_eatControlLetter(state)) {
      return true;
    }
    state.pos = start2;
  }
  return false;
};
pp$1.regexp_eatZero = function(state) {
  if (state.current() === 48 && !isDecimalDigit(state.lookahead())) {
    state.lastIntValue = 0;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatControlEscape = function(state) {
  var ch = state.current();
  if (ch === 116) {
    state.lastIntValue = 9;
    state.advance();
    return true;
  }
  if (ch === 110) {
    state.lastIntValue = 10;
    state.advance();
    return true;
  }
  if (ch === 118) {
    state.lastIntValue = 11;
    state.advance();
    return true;
  }
  if (ch === 102) {
    state.lastIntValue = 12;
    state.advance();
    return true;
  }
  if (ch === 114) {
    state.lastIntValue = 13;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatControlLetter = function(state) {
  var ch = state.current();
  if (isControlLetter(ch)) {
    state.lastIntValue = ch % 32;
    state.advance();
    return true;
  }
  return false;
};
function isControlLetter(ch) {
  return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122;
}
pp$1.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
  if (forceU === void 0) forceU = false;
  var start2 = state.pos;
  var switchU = forceU || state.switchU;
  if (state.eat(
    117
    /* u */
  )) {
    if (this.regexp_eatFixedHexDigits(state, 4)) {
      var lead = state.lastIntValue;
      if (switchU && lead >= 55296 && lead <= 56319) {
        var leadSurrogateEnd = state.pos;
        if (state.eat(
          92
          /* \ */
        ) && state.eat(
          117
          /* u */
        ) && this.regexp_eatFixedHexDigits(state, 4)) {
          var trail = state.lastIntValue;
          if (trail >= 56320 && trail <= 57343) {
            state.lastIntValue = (lead - 55296) * 1024 + (trail - 56320) + 65536;
            return true;
          }
        }
        state.pos = leadSurrogateEnd;
        state.lastIntValue = lead;
      }
      return true;
    }
    if (switchU && state.eat(
      123
      /* { */
    ) && this.regexp_eatHexDigits(state) && state.eat(
      125
      /* } */
    ) && isValidUnicode(state.lastIntValue)) {
      return true;
    }
    if (switchU) {
      state.raise("Invalid unicode escape");
    }
    state.pos = start2;
  }
  return false;
};
function isValidUnicode(ch) {
  return ch >= 0 && ch <= 1114111;
}
pp$1.regexp_eatIdentityEscape = function(state) {
  if (state.switchU) {
    if (this.regexp_eatSyntaxCharacter(state)) {
      return true;
    }
    if (state.eat(
      47
      /* / */
    )) {
      state.lastIntValue = 47;
      return true;
    }
    return false;
  }
  var ch = state.current();
  if (ch !== 99 && (!state.switchN || ch !== 107)) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatDecimalEscape = function(state) {
  state.lastIntValue = 0;
  var ch = state.current();
  if (ch >= 49 && ch <= 57) {
    do {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 48);
      state.advance();
    } while ((ch = state.current()) >= 48 && ch <= 57);
    return true;
  }
  return false;
};
var CharSetNone = 0;
var CharSetOk = 1;
var CharSetString = 2;
pp$1.regexp_eatCharacterClassEscape = function(state) {
  var ch = state.current();
  if (isCharacterClassEscape(ch)) {
    state.lastIntValue = -1;
    state.advance();
    return CharSetOk;
  }
  var negate = false;
  if (state.switchU && this.options.ecmaVersion >= 9 && ((negate = ch === 80) || ch === 112)) {
    state.lastIntValue = -1;
    state.advance();
    var result;
    if (state.eat(
      123
      /* { */
    ) && (result = this.regexp_eatUnicodePropertyValueExpression(state)) && state.eat(
      125
      /* } */
    )) {
      if (negate && result === CharSetString) {
        state.raise("Invalid property name");
      }
      return result;
    }
    state.raise("Invalid property name");
  }
  return CharSetNone;
};
function isCharacterClassEscape(ch) {
  return ch === 100 || ch === 68 || ch === 115 || ch === 83 || ch === 119 || ch === 87;
}
pp$1.regexp_eatUnicodePropertyValueExpression = function(state) {
  var start2 = state.pos;
  if (this.regexp_eatUnicodePropertyName(state) && state.eat(
    61
    /* = */
  )) {
    var name = state.lastStringValue;
    if (this.regexp_eatUnicodePropertyValue(state)) {
      var value = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
      return CharSetOk;
    }
  }
  state.pos = start2;
  if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
    var nameOrValue = state.lastStringValue;
    return this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
  }
  return CharSetNone;
};
pp$1.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
  if (!hasOwn(state.unicodeProperties.nonBinary, name)) {
    state.raise("Invalid property name");
  }
  if (!state.unicodeProperties.nonBinary[name].test(value)) {
    state.raise("Invalid property value");
  }
};
pp$1.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
  if (state.unicodeProperties.binary.test(nameOrValue)) {
    return CharSetOk;
  }
  if (state.switchV && state.unicodeProperties.binaryOfStrings.test(nameOrValue)) {
    return CharSetString;
  }
  state.raise("Invalid property name");
};
pp$1.regexp_eatUnicodePropertyName = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyNameCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== "";
};
function isUnicodePropertyNameCharacter(ch) {
  return isControlLetter(ch) || ch === 95;
}
pp$1.regexp_eatUnicodePropertyValue = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyValueCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== "";
};
function isUnicodePropertyValueCharacter(ch) {
  return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch);
}
pp$1.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
  return this.regexp_eatUnicodePropertyValue(state);
};
pp$1.regexp_eatCharacterClass = function(state) {
  if (state.eat(
    91
    /* [ */
  )) {
    var negate = state.eat(
      94
      /* ^ */
    );
    var result = this.regexp_classContents(state);
    if (!state.eat(
      93
      /* ] */
    )) {
      state.raise("Unterminated character class");
    }
    if (negate && result === CharSetString) {
      state.raise("Negated character class may contain strings");
    }
    return true;
  }
  return false;
};
pp$1.regexp_classContents = function(state) {
  if (state.current() === 93) {
    return CharSetOk;
  }
  if (state.switchV) {
    return this.regexp_classSetExpression(state);
  }
  this.regexp_nonEmptyClassRanges(state);
  return CharSetOk;
};
pp$1.regexp_nonEmptyClassRanges = function(state) {
  while (this.regexp_eatClassAtom(state)) {
    var left = state.lastIntValue;
    if (state.eat(
      45
      /* - */
    ) && this.regexp_eatClassAtom(state)) {
      var right = state.lastIntValue;
      if (state.switchU && (left === -1 || right === -1)) {
        state.raise("Invalid character class");
      }
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
    }
  }
};
pp$1.regexp_eatClassAtom = function(state) {
  var start2 = state.pos;
  if (state.eat(
    92
    /* \ */
  )) {
    if (this.regexp_eatClassEscape(state)) {
      return true;
    }
    if (state.switchU) {
      var ch$1 = state.current();
      if (ch$1 === 99 || isOctalDigit(ch$1)) {
        state.raise("Invalid class escape");
      }
      state.raise("Invalid escape");
    }
    state.pos = start2;
  }
  var ch = state.current();
  if (ch !== 93) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatClassEscape = function(state) {
  var start2 = state.pos;
  if (state.eat(
    98
    /* b */
  )) {
    state.lastIntValue = 8;
    return true;
  }
  if (state.switchU && state.eat(
    45
    /* - */
  )) {
    state.lastIntValue = 45;
    return true;
  }
  if (!state.switchU && state.eat(
    99
    /* c */
  )) {
    if (this.regexp_eatClassControlLetter(state)) {
      return true;
    }
    state.pos = start2;
  }
  return this.regexp_eatCharacterClassEscape(state) || this.regexp_eatCharacterEscape(state);
};
pp$1.regexp_classSetExpression = function(state) {
  var result = CharSetOk, subResult;
  if (this.regexp_eatClassSetRange(state)) ;
  else if (subResult = this.regexp_eatClassSetOperand(state)) {
    if (subResult === CharSetString) {
      result = CharSetString;
    }
    var start2 = state.pos;
    while (state.eatChars(
      [38, 38]
      /* && */
    )) {
      if (state.current() !== 38 && (subResult = this.regexp_eatClassSetOperand(state))) {
        if (subResult !== CharSetString) {
          result = CharSetOk;
        }
        continue;
      }
      state.raise("Invalid character in character class");
    }
    if (start2 !== state.pos) {
      return result;
    }
    while (state.eatChars(
      [45, 45]
      /* -- */
    )) {
      if (this.regexp_eatClassSetOperand(state)) {
        continue;
      }
      state.raise("Invalid character in character class");
    }
    if (start2 !== state.pos) {
      return result;
    }
  } else {
    state.raise("Invalid character in character class");
  }
  for (; ; ) {
    if (this.regexp_eatClassSetRange(state)) {
      continue;
    }
    subResult = this.regexp_eatClassSetOperand(state);
    if (!subResult) {
      return result;
    }
    if (subResult === CharSetString) {
      result = CharSetString;
    }
  }
};
pp$1.regexp_eatClassSetRange = function(state) {
  var start2 = state.pos;
  if (this.regexp_eatClassSetCharacter(state)) {
    var left = state.lastIntValue;
    if (state.eat(
      45
      /* - */
    ) && this.regexp_eatClassSetCharacter(state)) {
      var right = state.lastIntValue;
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
      return true;
    }
    state.pos = start2;
  }
  return false;
};
pp$1.regexp_eatClassSetOperand = function(state) {
  if (this.regexp_eatClassSetCharacter(state)) {
    return CharSetOk;
  }
  return this.regexp_eatClassStringDisjunction(state) || this.regexp_eatNestedClass(state);
};
pp$1.regexp_eatNestedClass = function(state) {
  var start2 = state.pos;
  if (state.eat(
    91
    /* [ */
  )) {
    var negate = state.eat(
      94
      /* ^ */
    );
    var result = this.regexp_classContents(state);
    if (state.eat(
      93
      /* ] */
    )) {
      if (negate && result === CharSetString) {
        state.raise("Negated character class may contain strings");
      }
      return result;
    }
    state.pos = start2;
  }
  if (state.eat(
    92
    /* \ */
  )) {
    var result$1 = this.regexp_eatCharacterClassEscape(state);
    if (result$1) {
      return result$1;
    }
    state.pos = start2;
  }
  return null;
};
pp$1.regexp_eatClassStringDisjunction = function(state) {
  var start2 = state.pos;
  if (state.eatChars(
    [92, 113]
    /* \q */
  )) {
    if (state.eat(
      123
      /* { */
    )) {
      var result = this.regexp_classStringDisjunctionContents(state);
      if (state.eat(
        125
        /* } */
      )) {
        return result;
      }
    } else {
      state.raise("Invalid escape");
    }
    state.pos = start2;
  }
  return null;
};
pp$1.regexp_classStringDisjunctionContents = function(state) {
  var result = this.regexp_classString(state);
  while (state.eat(
    124
    /* | */
  )) {
    if (this.regexp_classString(state) === CharSetString) {
      result = CharSetString;
    }
  }
  return result;
};
pp$1.regexp_classString = function(state) {
  var count = 0;
  while (this.regexp_eatClassSetCharacter(state)) {
    count++;
  }
  return count === 1 ? CharSetOk : CharSetString;
};
pp$1.regexp_eatClassSetCharacter = function(state) {
  var start2 = state.pos;
  if (state.eat(
    92
    /* \ */
  )) {
    if (this.regexp_eatCharacterEscape(state) || this.regexp_eatClassSetReservedPunctuator(state)) {
      return true;
    }
    if (state.eat(
      98
      /* b */
    )) {
      state.lastIntValue = 8;
      return true;
    }
    state.pos = start2;
    return false;
  }
  var ch = state.current();
  if (ch < 0 || ch === state.lookahead() && isClassSetReservedDoublePunctuatorCharacter(ch)) {
    return false;
  }
  if (isClassSetSyntaxCharacter(ch)) {
    return false;
  }
  state.advance();
  state.lastIntValue = ch;
  return true;
};
function isClassSetReservedDoublePunctuatorCharacter(ch) {
  return ch === 33 || ch >= 35 && ch <= 38 || ch >= 42 && ch <= 44 || ch === 46 || ch >= 58 && ch <= 64 || ch === 94 || ch === 96 || ch === 126;
}
function isClassSetSyntaxCharacter(ch) {
  return ch === 40 || ch === 41 || ch === 45 || ch === 47 || ch >= 91 && ch <= 93 || ch >= 123 && ch <= 125;
}
pp$1.regexp_eatClassSetReservedPunctuator = function(state) {
  var ch = state.current();
  if (isClassSetReservedPunctuator(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
function isClassSetReservedPunctuator(ch) {
  return ch === 33 || ch === 35 || ch === 37 || ch === 38 || ch === 44 || ch === 45 || ch >= 58 && ch <= 62 || ch === 64 || ch === 96 || ch === 126;
}
pp$1.regexp_eatClassControlLetter = function(state) {
  var ch = state.current();
  if (isDecimalDigit(ch) || ch === 95) {
    state.lastIntValue = ch % 32;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatHexEscapeSequence = function(state) {
  var start2 = state.pos;
  if (state.eat(
    120
    /* x */
  )) {
    if (this.regexp_eatFixedHexDigits(state, 2)) {
      return true;
    }
    if (state.switchU) {
      state.raise("Invalid escape");
    }
    state.pos = start2;
  }
  return false;
};
pp$1.regexp_eatDecimalDigits = function(state) {
  var start2 = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isDecimalDigit(ch = state.current())) {
    state.lastIntValue = 10 * state.lastIntValue + (ch - 48);
    state.advance();
  }
  return state.pos !== start2;
};
function isDecimalDigit(ch) {
  return ch >= 48 && ch <= 57;
}
pp$1.regexp_eatHexDigits = function(state) {
  var start2 = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isHexDigit(ch = state.current())) {
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return state.pos !== start2;
};
function isHexDigit(ch) {
  return ch >= 48 && ch <= 57 || ch >= 65 && ch <= 70 || ch >= 97 && ch <= 102;
}
function hexToInt(ch) {
  if (ch >= 65 && ch <= 70) {
    return 10 + (ch - 65);
  }
  if (ch >= 97 && ch <= 102) {
    return 10 + (ch - 97);
  }
  return ch - 48;
}
pp$1.regexp_eatLegacyOctalEscapeSequence = function(state) {
  if (this.regexp_eatOctalDigit(state)) {
    var n1 = state.lastIntValue;
    if (this.regexp_eatOctalDigit(state)) {
      var n2 = state.lastIntValue;
      if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
        state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
      } else {
        state.lastIntValue = n1 * 8 + n2;
      }
    } else {
      state.lastIntValue = n1;
    }
    return true;
  }
  return false;
};
pp$1.regexp_eatOctalDigit = function(state) {
  var ch = state.current();
  if (isOctalDigit(ch)) {
    state.lastIntValue = ch - 48;
    state.advance();
    return true;
  }
  state.lastIntValue = 0;
  return false;
};
function isOctalDigit(ch) {
  return ch >= 48 && ch <= 55;
}
pp$1.regexp_eatFixedHexDigits = function(state, length) {
  var start2 = state.pos;
  state.lastIntValue = 0;
  for (var i = 0; i < length; ++i) {
    var ch = state.current();
    if (!isHexDigit(ch)) {
      state.pos = start2;
      return false;
    }
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return true;
};
var Token = function Token2(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations) {
    this.loc = new SourceLocation(p, p.startLoc, p.endLoc);
  }
  if (p.options.ranges) {
    this.range = [p.start, p.end];
  }
};
var pp = Parser.prototype;
pp.next = function(ignoreEscapeSequenceInKeyword) {
  if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc) {
    this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword);
  }
  if (this.options.onToken) {
    this.options.onToken(new Token(this));
  }
  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};
pp.getToken = function() {
  this.next();
  return new Token(this);
};
if (typeof Symbol !== "undefined") {
  pp[Symbol.iterator] = function() {
    var this$1$1 = this;
    return {
      next: function() {
        var token = this$1$1.getToken();
        return {
          done: token.type === types$1.eof,
          value: token
        };
      }
    };
  };
}
pp.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) {
    this.skipSpace();
  }
  this.start = this.pos;
  if (this.options.locations) {
    this.startLoc = this.curPosition();
  }
  if (this.pos >= this.input.length) {
    return this.finishToken(types$1.eof);
  }
  if (curContext.override) {
    return curContext.override(this);
  } else {
    this.readToken(this.fullCharCodeAtPos());
  }
};
pp.readToken = function(code) {
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92) {
    return this.readWord();
  }
  return this.getTokenFromCode(code);
};
pp.fullCharCodeAt = function(pos) {
  var code = this.input.charCodeAt(pos);
  if (code <= 55295 || code >= 56320) {
    return code;
  }
  var next = this.input.charCodeAt(pos + 1);
  return next <= 56319 || next >= 57344 ? code : (code << 10) + next - 56613888;
};
pp.fullCharCodeAtPos = function() {
  return this.fullCharCodeAt(this.pos);
};
pp.skipBlockComment = function() {
  var startLoc = this.options.onComment && this.curPosition();
  var start2 = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) {
    this.raise(this.pos - 2, "Unterminated comment");
  }
  this.pos = end + 2;
  if (this.options.locations) {
    for (var nextBreak = void 0, pos = start2; (nextBreak = nextLineBreak(this.input, pos, this.pos)) > -1; ) {
      ++this.curLine;
      pos = this.lineStart = nextBreak;
    }
  }
  if (this.options.onComment) {
    this.options.onComment(
      true,
      this.input.slice(start2 + 2, end),
      start2,
      this.pos,
      startLoc,
      this.curPosition()
    );
  }
};
pp.skipLineComment = function(startSkip) {
  var start2 = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this.input.charCodeAt(++this.pos);
  }
  if (this.options.onComment) {
    this.options.onComment(
      false,
      this.input.slice(start2 + startSkip, this.pos),
      start2,
      this.pos,
      startLoc,
      this.curPosition()
    );
  }
};
pp.skipSpace = function() {
  loop: while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    switch (ch) {
      case 32:
      case 160:
        ++this.pos;
        break;
      case 13:
        if (this.input.charCodeAt(this.pos + 1) === 10) {
          ++this.pos;
        }
      case 10:
      case 8232:
      case 8233:
        ++this.pos;
        if (this.options.locations) {
          ++this.curLine;
          this.lineStart = this.pos;
        }
        break;
      case 47:
        switch (this.input.charCodeAt(this.pos + 1)) {
          case 42:
            this.skipBlockComment();
            break;
          case 47:
            this.skipLineComment(2);
            break;
          default:
            break loop;
        }
        break;
      default:
        if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
          ++this.pos;
        } else {
          break loop;
        }
    }
  }
};
pp.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) {
    this.endLoc = this.curPosition();
  }
  var prevType = this.type;
  this.type = type;
  this.value = val;
  this.updateContext(prevType);
};
pp.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) {
    return this.readNumber(true);
  }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
    this.pos += 3;
    return this.finishToken(types$1.ellipsis);
  } else {
    ++this.pos;
    return this.finishToken(types$1.dot);
  }
};
pp.readToken_slash = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) {
    ++this.pos;
    return this.readRegexp();
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(types$1.slash, 1);
};
pp.readToken_mult_modulo_exp = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types$1.star : types$1.modulo;
  if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
    ++size;
    tokentype = types$1.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, size + 1);
  }
  return this.finishOp(tokentype, size);
};
pp.readToken_pipe_amp = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (this.options.ecmaVersion >= 12) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 === 61) {
        return this.finishOp(types$1.assign, 3);
      }
    }
    return this.finishOp(code === 124 ? types$1.logicalOR : types$1.logicalAND, 2);
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(code === 124 ? types$1.bitwiseOR : types$1.bitwiseAND, 1);
};
pp.readToken_caret = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(types$1.bitwiseXOR, 1);
};
pp.readToken_plus_min = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 && (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken();
    }
    return this.finishOp(types$1.incDec, 2);
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(types$1.plusMin, 1);
};
pp.readToken_lt_gt = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) {
      return this.finishOp(types$1.assign, size + 1);
    }
    return this.finishOp(types$1.bitShift, size);
  }
  if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 && this.input.charCodeAt(this.pos + 3) === 45) {
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken();
  }
  if (next === 61) {
    size = 2;
  }
  return this.finishOp(types$1.relational, size);
};
pp.readToken_eq_excl = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) {
    return this.finishOp(types$1.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
  }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
    this.pos += 2;
    return this.finishToken(types$1.arrow);
  }
  return this.finishOp(code === 61 ? types$1.eq : types$1.prefix, 1);
};
pp.readToken_question = function() {
  var ecmaVersion = this.options.ecmaVersion;
  if (ecmaVersion >= 11) {
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 46) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 < 48 || next2 > 57) {
        return this.finishOp(types$1.questionDot, 2);
      }
    }
    if (next === 63) {
      if (ecmaVersion >= 12) {
        var next2$1 = this.input.charCodeAt(this.pos + 2);
        if (next2$1 === 61) {
          return this.finishOp(types$1.assign, 3);
        }
      }
      return this.finishOp(types$1.coalesce, 2);
    }
  }
  return this.finishOp(types$1.question, 1);
};
pp.readToken_numberSign = function() {
  var ecmaVersion = this.options.ecmaVersion;
  var code = 35;
  if (ecmaVersion >= 13) {
    ++this.pos;
    code = this.fullCharCodeAtPos();
    if (isIdentifierStart(code, true) || code === 92) {
      return this.finishToken(types$1.privateId, this.readWord1());
    }
  }
  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};
pp.getTokenFromCode = function(code) {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
    case 46:
      return this.readToken_dot();
    // Punctuation tokens.
    case 40:
      ++this.pos;
      return this.finishToken(types$1.parenL);
    case 41:
      ++this.pos;
      return this.finishToken(types$1.parenR);
    case 59:
      ++this.pos;
      return this.finishToken(types$1.semi);
    case 44:
      ++this.pos;
      return this.finishToken(types$1.comma);
    case 91:
      ++this.pos;
      return this.finishToken(types$1.bracketL);
    case 93:
      ++this.pos;
      return this.finishToken(types$1.bracketR);
    case 123:
      ++this.pos;
      return this.finishToken(types$1.braceL);
    case 125:
      ++this.pos;
      return this.finishToken(types$1.braceR);
    case 58:
      ++this.pos;
      return this.finishToken(types$1.colon);
    case 96:
      if (this.options.ecmaVersion < 6) {
        break;
      }
      ++this.pos;
      return this.finishToken(types$1.backQuote);
    case 48:
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 120 || next === 88) {
        return this.readRadixNumber(16);
      }
      if (this.options.ecmaVersion >= 6) {
        if (next === 111 || next === 79) {
          return this.readRadixNumber(8);
        }
        if (next === 98 || next === 66) {
          return this.readRadixNumber(2);
        }
      }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    case 49:
    case 50:
    case 51:
    case 52:
    case 53:
    case 54:
    case 55:
    case 56:
    case 57:
      return this.readNumber(false);
    // Quotes produce strings.
    case 34:
    case 39:
      return this.readString(code);
    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.
    case 47:
      return this.readToken_slash();
    case 37:
    case 42:
      return this.readToken_mult_modulo_exp(code);
    case 124:
    case 38:
      return this.readToken_pipe_amp(code);
    case 94:
      return this.readToken_caret();
    case 43:
    case 45:
      return this.readToken_plus_min(code);
    case 60:
    case 62:
      return this.readToken_lt_gt(code);
    case 61:
    case 33:
      return this.readToken_eq_excl(code);
    case 63:
      return this.readToken_question();
    case 126:
      return this.finishOp(types$1.prefix, 1);
    case 35:
      return this.readToken_numberSign();
  }
  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};
pp.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str);
};
pp.readRegexp = function() {
  var escaped, inClass, start2 = this.pos;
  for (; ; ) {
    if (this.pos >= this.input.length) {
      this.raise(start2, "Unterminated regular expression");
    }
    var ch = this.input.charAt(this.pos);
    if (lineBreak.test(ch)) {
      this.raise(start2, "Unterminated regular expression");
    }
    if (!escaped) {
      if (ch === "[") {
        inClass = true;
      } else if (ch === "]" && inClass) {
        inClass = false;
      } else if (ch === "/" && !inClass) {
        break;
      }
      escaped = ch === "\\";
    } else {
      escaped = false;
    }
    ++this.pos;
  }
  var pattern = this.input.slice(start2, this.pos);
  ++this.pos;
  var flagsStart = this.pos;
  var flags = this.readWord1();
  if (this.containsEsc) {
    this.unexpected(flagsStart);
  }
  var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
  state.reset(start2, pattern, flags);
  this.validateRegExpFlags(state);
  this.validateRegExpPattern(state);
  var value = null;
  try {
    value = new RegExp(pattern, flags);
  } catch (e) {
  }
  return this.finishToken(types$1.regexp, { pattern, flags, value });
};
pp.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
  var allowSeparators = this.options.ecmaVersion >= 12 && len === void 0;
  var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;
  var start2 = this.pos, total = 0, lastCode = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
    var code = this.input.charCodeAt(this.pos), val = void 0;
    if (allowSeparators && code === 95) {
      if (isLegacyOctalNumericLiteral) {
        this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals");
      }
      if (lastCode === 95) {
        this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore");
      }
      if (i === 0) {
        this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits");
      }
      lastCode = code;
      continue;
    }
    if (code >= 97) {
      val = code - 97 + 10;
    } else if (code >= 65) {
      val = code - 65 + 10;
    } else if (code >= 48 && code <= 57) {
      val = code - 48;
    } else {
      val = Infinity;
    }
    if (val >= radix) {
      break;
    }
    lastCode = code;
    total = total * radix + val;
  }
  if (allowSeparators && lastCode === 95) {
    this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits");
  }
  if (this.pos === start2 || len != null && this.pos - start2 !== len) {
    return null;
  }
  return total;
};
function stringToNumber(str, isLegacyOctalNumericLiteral) {
  if (isLegacyOctalNumericLiteral) {
    return parseInt(str, 8);
  }
  return parseFloat(str.replace(/_/g, ""));
}
function stringToBigInt(str) {
  if (typeof BigInt !== "function") {
    return null;
  }
  return BigInt(str.replace(/_/g, ""));
}
pp.readRadixNumber = function(radix) {
  var start2 = this.pos;
  this.pos += 2;
  var val = this.readInt(radix);
  if (val == null) {
    this.raise(this.start + 2, "Expected number in radix " + radix);
  }
  if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
    val = stringToBigInt(this.input.slice(start2, this.pos));
    ++this.pos;
  } else if (isIdentifierStart(this.fullCharCodeAtPos())) {
    this.raise(this.pos, "Identifier directly after number");
  }
  return this.finishToken(types$1.num, val);
};
pp.readNumber = function(startsWithDot) {
  var start2 = this.pos;
  if (!startsWithDot && this.readInt(10, void 0, true) === null) {
    this.raise(start2, "Invalid number");
  }
  var octal = this.pos - start2 >= 2 && this.input.charCodeAt(start2) === 48;
  if (octal && this.strict) {
    this.raise(start2, "Invalid number");
  }
  var next = this.input.charCodeAt(this.pos);
  if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
    var val$1 = stringToBigInt(this.input.slice(start2, this.pos));
    ++this.pos;
    if (isIdentifierStart(this.fullCharCodeAtPos())) {
      this.raise(this.pos, "Identifier directly after number");
    }
    return this.finishToken(types$1.num, val$1);
  }
  if (octal && /[89]/.test(this.input.slice(start2, this.pos))) {
    octal = false;
  }
  if (next === 46 && !octal) {
    ++this.pos;
    this.readInt(10);
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) {
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) {
      ++this.pos;
    }
    if (this.readInt(10) === null) {
      this.raise(start2, "Invalid number");
    }
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) {
    this.raise(this.pos, "Identifier directly after number");
  }
  var val = stringToNumber(this.input.slice(start2, this.pos), octal);
  return this.finishToken(types$1.num, val);
};
pp.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;
  if (ch === 123) {
    if (this.options.ecmaVersion < 6) {
      this.unexpected();
    }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 1114111) {
      this.invalidStringToken(codePos, "Code point out of bounds");
    }
  } else {
    code = this.readHexChar(4);
  }
  return code;
};
pp.readString = function(quote) {
  var out = "", chunkStart = ++this.pos;
  for (; ; ) {
    if (this.pos >= this.input.length) {
      this.raise(this.start, "Unterminated string constant");
    }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) {
      break;
    }
    if (ch === 92) {
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(false);
      chunkStart = this.pos;
    } else if (ch === 8232 || ch === 8233) {
      if (this.options.ecmaVersion < 10) {
        this.raise(this.start, "Unterminated string constant");
      }
      ++this.pos;
      if (this.options.locations) {
        this.curLine++;
        this.lineStart = this.pos;
      }
    } else {
      if (isNewLine(ch)) {
        this.raise(this.start, "Unterminated string constant");
      }
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types$1.string, out);
};
var INVALID_TEMPLATE_ESCAPE_ERROR = {};
pp.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err;
    }
  }
  this.inTemplateElement = false;
};
pp.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR;
  } else {
    this.raise(position, message);
  }
};
pp.readTmplToken = function() {
  var out = "", chunkStart = this.pos;
  for (; ; ) {
    if (this.pos >= this.input.length) {
      this.raise(this.start, "Unterminated template");
    }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) {
      if (this.pos === this.start && (this.type === types$1.template || this.type === types$1.invalidTemplate)) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(types$1.dollarBraceL);
        } else {
          ++this.pos;
          return this.finishToken(types$1.backQuote);
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(types$1.template, out);
    }
    if (ch === 92) {
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(true);
      chunkStart = this.pos;
    } else if (isNewLine(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      switch (ch) {
        case 13:
          if (this.input.charCodeAt(this.pos) === 10) {
            ++this.pos;
          }
        case 10:
          out += "\n";
          break;
        default:
          out += String.fromCharCode(ch);
          break;
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};
pp.readInvalidTemplateToken = function() {
  for (; this.pos < this.input.length; this.pos++) {
    switch (this.input[this.pos]) {
      case "\\":
        ++this.pos;
        break;
      case "$":
        if (this.input[this.pos + 1] !== "{") {
          break;
        }
      // fall through
      case "`":
        return this.finishToken(types$1.invalidTemplate, this.input.slice(this.start, this.pos));
      case "\r":
        if (this.input[this.pos + 1] === "\n") {
          ++this.pos;
        }
      // fall through
      case "\n":
      case "\u2028":
      case "\u2029":
        ++this.curLine;
        this.lineStart = this.pos + 1;
        break;
    }
  }
  this.raise(this.start, "Unterminated template");
};
pp.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
    case 110:
      return "\n";
    // 'n' -> '\n'
    case 114:
      return "\r";
    // 'r' -> '\r'
    case 120:
      return String.fromCharCode(this.readHexChar(2));
    // 'x'
    case 117:
      return codePointToString(this.readCodePoint());
    // 'u'
    case 116:
      return "	";
    // 't' -> '\t'
    case 98:
      return "\b";
    // 'b' -> '\b'
    case 118:
      return "\v";
    // 'v' -> '\u000b'
    case 102:
      return "\f";
    // 'f' -> '\f'
    case 13:
      if (this.input.charCodeAt(this.pos) === 10) {
        ++this.pos;
      }
    // '\r\n'
    case 10:
      if (this.options.locations) {
        this.lineStart = this.pos;
        ++this.curLine;
      }
      return "";
    case 56:
    case 57:
      if (this.strict) {
        this.invalidStringToken(
          this.pos - 1,
          "Invalid escape sequence"
        );
      }
      if (inTemplate) {
        var codePos = this.pos - 1;
        this.invalidStringToken(
          codePos,
          "Invalid escape sequence in template string"
        );
      }
    default:
      if (ch >= 48 && ch <= 55) {
        var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
        var octal = parseInt(octalStr, 8);
        if (octal > 255) {
          octalStr = octalStr.slice(0, -1);
          octal = parseInt(octalStr, 8);
        }
        this.pos += octalStr.length - 1;
        ch = this.input.charCodeAt(this.pos);
        if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
          this.invalidStringToken(
            this.pos - 1 - octalStr.length,
            inTemplate ? "Octal literal in template string" : "Octal literal in strict mode"
          );
        }
        return String.fromCharCode(octal);
      }
      if (isNewLine(ch)) {
        if (this.options.locations) {
          this.lineStart = this.pos;
          ++this.curLine;
        }
        return "";
      }
      return String.fromCharCode(ch);
  }
};
pp.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) {
    this.invalidStringToken(codePos, "Bad character escape sequence");
  }
  return n;
};
pp.readWord1 = function() {
  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this.pos += ch <= 65535 ? 1 : 2;
    } else if (ch === 92) {
      this.containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) !== 117) {
        this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX");
      }
      ++this.pos;
      var esc = this.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral)) {
        this.invalidStringToken(escStart, "Invalid Unicode escape");
      }
      word += codePointToString(esc);
      chunkStart = this.pos;
    } else {
      break;
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos);
};
pp.readWord = function() {
  var word = this.readWord1();
  var type = types$1.name;
  if (this.keywords.test(word)) {
    type = keywords[word];
  }
  return this.finishToken(type, word);
};
var version = "8.16.0";
Parser.acorn = {
  Parser,
  version,
  defaultOptions,
  Position,
  SourceLocation,
  getLineInfo,
  Node,
  TokenType,
  tokTypes: types$1,
  keywordTypes: keywords,
  TokContext,
  tokContexts: types,
  isIdentifierChar,
  isIdentifierStart,
  Token,
  isNewLine,
  lineBreak,
  lineBreakG,
  nonASCIIwhitespace
};

// ../src/parser.ts
function find_base(root, id) {
  function f(folder) {
    for (const ar of [folder.runners, folder.errors, folder.folders]) {
      const ans = ar.find((x) => x.id === id);
      if (ans != null)
        return ans;
    }
    for (const subfolder of folder.folders) {
      const ans = f(subfolder);
      if (ans != null)
        return ans;
    }
  }
  return f(root);
}

// src/common.ts
function post_message(msg) {
  vscode.postMessage(msg);
}
function calc_last_run(report, runner) {
  const runs = report.runs[runner.id] ?? [];
  return runs.at(-1);
}
function calc_runner_status(report, runner) {
  const last_run = calc_last_run(report, runner);
  if (last_run == null)
    return { version: 0, state: "ready" };
  const { end_time, run_id: version2, exit_code, stopped } = last_run;
  if (end_time == null) {
    return { version: version2, state: "running" };
  }
  if (stopped)
    return { version: version2, state: "stopped" };
  if (exit_code === 0)
    return { version: version2, state: "done" };
  return { version: version2, state: "error" };
}

// resources/icons.html
var icons_default = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <title>Scriptsmon icons</title>
  <link rel="stylesheet" href="./icons.css">
</head>

<body>
  <button id=animatebutton>animate</button>
  <div id=stat>stat</div>
  <button id=animatebutton_the_done>animatebutton_the_done</button>
  <div class="icon">error
    <svg  width="16px" height="16px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="red">
      <!-- Circle -->
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="transparent" />
      <!-- X -->
      <path d="M5 5 L11 11 M5 11 L11 5"  stroke="currentColor" stroke-width="1.5" fill="transparent"
        stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>

  <div class="icon" id="the_done">done
    <svg width="16" height="16" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="10" fill="transparent" />
      <g  transform-origin="50 50">
        <path d="M30 50 L45 65 L70 35" stroke="currentColor" stroke-width="10" fill="transparent" stroke-linecap="round"
          stroke-linejoin="round" />
      </g>
    </svg>
  </div>

  <div class="icon" id="the_done">copy
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M3 5V12.73C2.4 12.38 2 11.74 2 11V5C2 2.79 3.79 1 6 1H9C9.74 1 10.38 1.4 10.73 2H6C4.35 2 3 3.35 3 5ZM11 15H6C4.897 15 4 14.103 4 13V5C4 3.897 4.897 3 6 3H11C12.103 3 13 3.897 13 5V13C13 14.103 12.103 15 11 15ZM12 5C12 4.448 11.552 4 11 4H6C5.448 4 5 4.448 5 5V13C5 13.552 5.448 14 6 14H11C11.552 14 12 13.552 12 13V5Z"/></svg>
  </div>
  <div class="icon" id="the_done">stop
  
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M12.5 3.5V12.5H3.5V3.5H12.5ZM12.5 2H3.5C2.672 2 2 2.672 2 3.5V12.5C2 13.328 2.672 14 3.5 14H12.5C13.328 14 14 13.328 14 12.5V3.5C14 2.672 13.328 2 12.5 2Z"/></svg>
  </div>


  <div class="icon" id="the_done">stopped

<svg  width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M14 2H10C10 0.897 9.103 0 8 0C6.897 0 6 0.897 6 2H2C1.724 2 1.5 2.224 1.5 2.5C1.5 2.776 1.724 3 2 3H2.54L3.349 12.708C3.456 13.994 4.55 15 5.84 15H10.159C11.449 15 12.543 13.993 12.65 12.708L13.459 3H13.999C14.275 3 14.499 2.776 14.499 2.5C14.499 2.224 14.275 2 13.999 2H14ZM8 1C8.551 1 9 1.449 9 2H7C7 1.449 7.449 1 8 1ZM11.655 12.625C11.591 13.396 10.934 14 10.16 14H5.841C5.067 14 4.41 13.396 4.346 12.625L3.544 3H12.458L11.656 12.625H11.655ZM7 5.5V11.5C7 11.776 6.776 12 6.5 12C6.224 12 6 11.776 6 11.5V5.5C6 5.224 6.224 5 6.5 5C6.776 5 7 5.224 7 5.5ZM10 5.5V11.5C10 11.776 9.776 12 9.5 12C9.224 12 9 11.776 9 11.5V5.5C9 5.224 9.224 5 9.5 5C9.776 5 10 5.224 10 5.5Z"/></svg>
  </div>
  <div class="icon">ready


    <svg width="64px" height="64px" viewBox="10 10 45.00 45.00" xmlns="http://www.w3.org/2000/svg" stroke-width="3">
      <path stroke="currentColor" fill="none"
        d="M41.71,10.58H28l-7.4,22.28a.1.1,0,0,0,.09.13h8.49a.1.1,0,0,1,.1.13L22.71,52.76a.5.5,0,0,0,.88.45L43.41,26a.1.1,0,0,0-.08-.16H34.42a.11.11,0,0,1-.09-.15l7.47-15A.1.1,0,0,0,41.71,10.58Z" />
    </svg>

  </div>
  <div class="icon">syntaxerror

    <svg width="64px" height="64px" viewBox="-4 -4 22.00 22.00" xmlns="http://www.w3.org/2000/svg" stroke-width="2">
      <path stroke="currentColor" fill="red"
        d="M 8 0 L 0 16 L 16 16 z8 0" />
    </svg>

  </div>






   <div class="icon">running
<svg class="runningicon" xmlns = "http://www.w3.org/2000/svg" viewBox = "0 0 100 100" preserveAspectRatio = "xMidYMid" width = "233" height = "233" fill="none" xmlns:xlink = "http://www.w3.org/1999/xlink">
    <circle stroke-dasharray = "164.93361431346415 56.97787143782138" r = "35" stroke-width = "10" stroke = "currentColor" fill = "none" cy = "50" cx = "50"></circle>
</svg>
</div>


  <div class="icon">chevron-down
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path
        d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z" />
    </svg>
  </div>

  <div class="icon">chevron-right
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path
        d="M5.64645 3.14645C5.45118 3.34171 5.45118 3.65829 5.64645 3.85355L9.79289 8L5.64645 12.1464C5.45118 12.3417 5.45118 12.6583 5.64645 12.8536C5.84171 13.0488 6.15829 13.0488 6.35355 12.8536L10.8536 8.35355C11.0488 8.15829 11.0488 7.84171 10.8536 7.64645L6.35355 3.14645C6.15829 2.95118 5.84171 2.95118 5.64645 3.14645Z" />
    </svg>
  </div>

  <div class="icon">debug
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path
        d="M21.75 12H19.5V9C19.5 8.445 19.347 7.9245 19.083 7.4775L20.7795 5.781C21.072 5.4885 21.072 5.013 20.7795 4.7205C20.487 4.428 20.0115 4.428 19.719 4.7205L18.0225 6.417C17.5755 6.153 17.055 6 16.5 6C16.5 3.519 14.481 1.5 12 1.5C9.519 1.5 7.5 3.519 7.5 6C6.945 6 6.4245 6.153 5.9775 6.417L4.281 4.7205C3.9885 4.428 3.513 4.428 3.2205 4.7205C2.928 5.013 2.928 5.4885 3.2205 5.781L4.917 7.4775C4.653 7.9245 4.5 8.445 4.5 9V12H2.25C1.836 12 1.5 12.336 1.5 12.75C1.5 13.164 1.836 13.5 2.25 13.5H4.5C4.5 15.2985 5.136 16.95 6.195 18.2445L3.594 20.8455C3.3015 21.138 3.3015 21.6135 3.594 21.906C3.741 22.053 3.933 22.125 4.125 22.125C4.317 22.125 4.509 22.0515 4.656 21.906L7.257 19.305C8.55 20.364 10.203 21 12.0015 21C13.8 21 15.4515 20.364 16.746 19.305L19.347 21.906C19.494 22.053 19.686 22.125 19.878 22.125C20.07 22.125 20.262 22.0515 20.409 21.906C20.7015 21.6135 20.7015 21.138 20.409 20.8455L17.808 18.2445C18.867 16.9515 19.503 15.2985 19.503 13.5H21.753C22.167 13.5 22.503 13.164 22.503 12.75C22.503 12.336 22.167 12 21.753 12H21.75ZM12 3C13.6545 3 15 4.3455 15 6H9C9 4.3455 10.3455 3 12 3ZM18 13.5C18 16.809 15.309 19.5 12 19.5C8.691 19.5 6 16.809 6 13.5V9C6 8.172 6.672 7.5 7.5 7.5H16.5C17.328 7.5 18 8.172 18 9V13.5ZM14.781 11.031L13.062 12.75L14.781 14.469C15.0735 14.7615 15.0735 15.237 14.781 15.5295C14.634 15.6765 14.442 15.7485 14.25 15.7485C14.058 15.7485 13.866 15.675 13.719 15.5295L12 13.8105L10.281 15.5295C10.134 15.6765 9.942 15.7485 9.75 15.7485C9.558 15.7485 9.366 15.675 9.219 15.5295C8.9265 15.237 8.9265 14.7615 9.219 14.469L10.938 12.75L9.219 11.031C8.9265 10.7385 8.9265 10.263 9.219 9.9705C9.5115 9.678 9.987 9.678 10.2795 9.9705L11.9985 11.6895L13.7175 9.9705C14.01 9.678 14.4855 9.678 14.778 9.9705C15.0705 10.263 15.0705 10.7385 14.778 11.031H14.781Z" />
    </svg>
  </div>

  <div class="icon">file
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
      <path fill="currentColor"
        d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  </div>

  </div>

  <div class="icon">folder
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 20 20" width="16" height="16">
      <path stroke='currentColor' fill="transparent"
        d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25V4.75A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1L5.875 1.475A1.75 1.75 0 0 0 4.518 1H1.75Z" />
    </svg>
  </div>

   <div class="icon">foldersyntaxerror
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 20 20" width="16" height="16">
  <path stroke='currentColor' fill="transparent"
    d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25V4.75A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1L5.875 1.475A1.75 1.75 0 0 0 4.518 1H1.75Z" />
  <path stroke="currentColor" fill="red"
    d="M 8 5.3333 L 4 13.3333 L 12 13.3333 Z" />
</svg>

  </div>

  <div class="icon">play
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path
        d="M4.74514 3.06414C4.41183 2.87665 4 3.11751 4 3.49993V12.5002C4 12.8826 4.41182 13.1235 4.74512 12.936L12.7454 8.43601C13.0852 8.24486 13.0852 7.75559 12.7454 7.56443L4.74514 3.06414ZM3 3.49993C3 2.35268 4.2355 1.63011 5.23541 2.19257L13.2357 6.69286C14.2551 7.26633 14.2551 8.73415 13.2356 9.30759L5.23537 13.8076C4.23546 14.37 3 13.6474 3 12.5002V3.49993Z" />
    </svg>
  </div>

    <div class="icon">play-watch
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path
        d="M4.74514 3.06414C4.41183 2.87665 4 3.11751 4 3.49993V12.5002C4 12.8826 4.41182 13.1235 4.74512 12.936L12.7454 8.43601C13.0852 8.24486 13.0852 7.75559 12.7454 7.56443L4.74514 3.06414ZM3 3.49993C3 2.35268 4.2355 1.63011 5.23541 2.19257L13.2357 6.69286C14.2551 7.26633 14.2551 8.73415 13.2356 9.30759L5.23537 13.8076C4.23546 14.37 3 13.6474 3 12.5002V3.49993Z" />
    </svg>
  </div>


  <div class="icon">selector_undefined
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path d="M 0 0 H 16 V 16 H0 V0"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" stroke-dasharray="2,4"/>
      </svg>
  </div> 

  <div class="icon">selector_false
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path d="M 0 0 H 16 V 16 H0 V0"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      </svg>
  </div>   

  <div class="icon">selector_true
    <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16">
      <path d="M 0 0 H 16 V 16 H0 V0"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path stroke="currentColor" d="M13.6572 3.13573C13.8583 2.9465 14.175 2.95614 14.3643 3.15722C14.5535 3.35831 14.5438 3.675 14.3428 3.86425L5.84277 11.8642C5.64597 12.0494 5.33756 12.0446 5.14648 11.8535L1.64648 8.35351C1.45121 8.15824 1.45121 7.84174 1.64648 7.64647C1.84174 7.45121 2.15825 7.45121 2.35351 7.64647L5.50976 10.8027L13.6572 3.13573Z"/>
      </svg>
  </div>   



  <div class="icon">watched_missing
<svg width="800px" height="800px" viewBox="0 0 24 24" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
 <g transform="translate(0 -1028.4)">
  <path d="m24 14a2 2 0 1 1 -4 0 2 2 0 1 1 4 0z" transform="matrix(1 0 0 1.25 -10 1031.4)" fill="#7f8c8d"/>
  <path d="m12 1030.4c-3.866 0-7 3.2-7 7.2 0 3.1 3.125 5.9 4 7.8 0.875 1.8 0 5 0 5l3-0.5 3 0.5s-0.875-3.2 0-5c0.875-1.9 4-4.7 4-7.8 0-4-3.134-7.2-7-7.2z" fill="#f39c12"/>
  <path d="m12 1030.4c3.866 0 7 3.2 7 7.2 0 3.1-3.125 5.9-4 7.8-0.875 1.8 0 5 0 5l-3-0.5v-19.5z" fill="#f1c40f"/>
  <path d="m9 1036.4-1 1 4 12 4-12-1-1-1 1-1-1-1 1-1-1-1 1-1-1zm0 1 1 1 0.5-0.5 0.5-0.5 0.5 0.5 0.5 0.5 0.5-0.5 0.5-0.5 0.5 0.5 0.5 0.5 1-1 0.438 0.4-3.438 10.3-3.4375-10.3 0.4375-0.4z" fill="#e67e22"/>
  <rect height="5" width="6" y="1045.4" x="9" fill="#bdc3c7"/>
  <path d="m9 1045.4v5h3v-1h3v-1h-3v-1h3v-1h-3v-1h-3z" fill="#95a5a6"/>
  <path d="m9 1046.4v1h3v-1h-3zm0 2v1h3v-1h-3z" fill="#7f8c8d"/>
 </g>
</svg>
  </div>


  <div class="icon">watched_true
 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE --><path fill="currentColor" d="m5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275z"/></svg> 
  </div>
  <div class="icon">watched_false
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE --><path fill="currentColor" d="m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zM5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275zM12 12.25"/></svg>
  </div>

<script src="./icons.js"></script>


`;

// src/regex_builder.ts
function re(flags = "") {
  return function(strings, ...values) {
    const full_raw = strings.raw.reduce(
      (acc, str, i) => acc + str + (values[i] ?? ""),
      ""
    );
    const no_comments = full_raw.replace(/ #.*\n/g, "");
    const no_spaces = no_comments.replace(/\s+/g, "");
    try {
      return new RegExp(no_spaces, flags);
    } catch (ex) {
      const err = get_error(ex);
      console.log(err);
      throw err;
    }
  };
}
var r = String.raw;
var digits = r`\d+`;

// src/terminals_ansi.ts
var hyperlink = r`
  \x1b\]8;
  [^;]*
  ;
  (?<url>[^\x1b\x07]*) 
  (?:\x1b\\|\x07)
  (?<link_text>[^\x1b\x07]*)
  \x1b\]8;;
  (?:\x1b\\|\x07)`;
var sgr_color = r`
  \x1b\[
  (?<color>[\d;]*)
  m`;
var other_ansi = r`
  \x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]   # Standard CSI (Cursor, etc)
  \x1b\][^\x1b\x07]*                          # Any other OSC
  \x1b[\x40-\x5a\x5c\x5e\x5f,                 # Fe Escape sequences
  \x1b.                                       # 2-character sequences
  [\x00-\x1f]                                # Control chars (Tab, CR, LF, etc)
`;
var ansi_regex = re("g")`
    ${hyperlink}|
    ${sgr_color}|
    ${other_ansi}|
`;
function parse_group_string(match, name) {
  const { groups } = match;
  if (groups == null)
    return;
  return groups[name];
}
function make_clear_style_command(position) {
  return {
    command: "style",
    position,
    style: {
      foreground: void 0,
      background: void 0,
      font_styles: /* @__PURE__ */ new Set()
    }
  };
}
function is_style_command(a) {
  return a?.command === "style";
}
function is_insert_command(a) {
  return a?.command === "insert";
}
function is_style_insert_command(a) {
  return a?.command === "style_insert";
}
function check_inserts_validity(inserts) {
  let last_end = -1;
  for (const r2 of inserts) {
    if (r2.position <= last_end)
      throw new Error("Replacements cannot overlap and must be sorted");
    last_end = r2.position;
  }
}
function check_style_positions_validity(style_positions) {
  let last_pos = -1;
  for (const s of style_positions) {
    if (s.position < last_pos)
      throw new Error("Style positions must be sorted");
    last_pos = s.position;
  }
}
function get_style_css(style) {
  if (style == null)
    return "";
  const css_parts = [];
  let { foreground, background } = style;
  if (style.font_styles.has("inverse"))
    [foreground, background] = [background, foreground];
  if (style.font_styles.has("faint"))
    css_parts.push(`opacity:.5`);
  if (foreground != null)
    css_parts.push(`color:${foreground}`);
  if (background != null)
    css_parts.push(`background-color:${background}`);
  if (style.font_styles.has("bold"))
    css_parts.push(`font-weight:bold`);
  if (style.font_styles.has("italic"))
    css_parts.push(`font-style:italic`);
  const decorations = [];
  if (style.font_styles.has("underline"))
    decorations.push("underline");
  if (style.font_styles.has("strikethrough"))
    decorations.push("line-through");
  if (style.font_styles.has("blinking"))
    decorations.push("blink");
  if (decorations.length > 0)
    css_parts.push(`text-decoration:${decorations.join(" ")}`);
  if (css_parts.length === 0)
    return "";
  return `style='${css_parts.map((x) => `${x};`).join("")}'`;
}
function is_clear_style(style) {
  return style.background == null && style.foreground == null && style.font_styles.size === 0;
}
function merge_one(a, b) {
  if (is_style_command(a) && is_insert_command(b)) {
    return {
      command: "style_insert",
      position: a.position,
      style: a.style,
      str: b.str
    };
  }
  if (is_style_command(b) && is_insert_command(a)) {
    return {
      command: "style_insert",
      position: a.position,
      style: b.style,
      str: a.str
    };
  }
  throw new Error("unexpected ansi structure");
}
function merge_inserts(a, b) {
  const ans = [...a, ...b].toSorted((a2, b2) => a2.position - b2.position);
  return ans;
}
function merge(a, b) {
  const sorted = [...a, ...b].toSorted((a2, b2) => a2.position - b2.position);
  const ans = [];
  for (const x of sorted) {
    const last_index = ans.length - 1;
    const last_item = ans[last_index];
    if (last_item?.position === x.position)
      ans[last_index] = merge_one(last_item, x);
    else
      ans.push(x);
  }
  return ans;
}
var html_entity_map = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escape_html_char(char_to_escape) {
  return html_entity_map[char_to_escape] ?? char_to_escape;
}
function generate_html({
  style_positions,
  inserts,
  plain_text
}) {
  check_inserts_validity(inserts);
  if (style_positions[0]?.position !== 0)
    style_positions = [...style_positions];
  check_style_positions_validity(style_positions);
  const commands = merge(inserts, style_positions);
  const html = [];
  let command_head = 0;
  let pushed_style;
  function push_style(style) {
    if (pushed_style != null) {
      throw new Error("style alreay open");
    }
    html.push(`<span ${get_style_css(style)}>`);
    pushed_style = style;
  }
  function pop_style(allow_empty) {
    if (pushed_style == null) {
      if (allow_empty)
        return make_clear_style_command(0).style;
      throw new Error("unexpected null style");
    }
    const ans2 = pushed_style;
    pushed_style = void 0;
    html.push(`</span>`);
    return ans2;
  }
  function get_command(position) {
    for (; ; ) {
      const ans2 = commands[command_head];
      if (ans2 == null)
        return;
      if (ans2.position === position)
        return ans2;
      if (ans2.position > position)
        return;
      command_head++;
    }
  }
  for (let i = 0; i <= plain_text.length; i++) {
    const command = get_command(i);
    if (is_insert_command(command)) {
      const style = pop_style(i === 0);
      html.push(command.str);
      push_style(style);
    }
    if (is_style_command(command)) {
      pop_style(i === 0);
      push_style(command.style);
    }
    if (is_style_insert_command(command)) {
      pop_style(i === 0);
      html.push(command.str);
      push_style(command.style);
    }
    const c = plain_text[i];
    const escaped = escape_html_char(c);
    html.push(escaped);
  }
  pop_style(plain_text.length === 0);
  const ans = html.join("");
  return ans;
}
function getAnsiNamedColor(code) {
  const map = {
    0: "black",
    1: "red",
    2: "green",
    3: "yellow",
    4: "blue",
    5: "magenta",
    6: "cyan",
    7: "white",
    8: "gray",
    9: "red",
    10: "lime",
    11: "yellow",
    12: "blue",
    13: "fuchsia",
    14: "aqua",
    15: "white"
  };
  return map[code] || "white";
}
function get8BitColor(n) {
  if (n < 16) return getAnsiNamedColor(n);
  if (n >= 232) {
    const v = (n - 232) * 10 + 8;
    return `rgb(${v},${v},${v})`;
  }
  const n2 = n - 16;
  const r2 = Math.floor(n2 / 36) * 51;
  const g = Math.floor(n2 % 36 / 6) * 51;
  const b = n2 % 6 * 51;
  return `rgb(${r2},${g},${b})`;
}
function clone_style(style) {
  return { ...style, font_styles: new Set(style.font_styles) };
}
function is_same_style(a, b) {
  if (a == null)
    return false;
  if (a.foreground !== b.foreground || a.background !== b.background)
    return false;
  if (a.font_styles.size !== b.font_styles.size)
    return false;
  for (const style of a.font_styles)
    if (!b.font_styles.has(style))
      return false;
  return true;
}
function applySGRCode(params, style) {
  let i = 0;
  while (i < params.length) {
    const code = params[i];
    if (code === 0) {
      style.foreground = void 0;
      style.background = void 0;
      style.font_styles.clear();
      i++;
      continue;
    }
    if (code === 1) {
      style.font_styles.add("bold");
      i++;
      continue;
    }
    if (code === 2) {
      style.font_styles.add("faint");
      i++;
      continue;
    }
    if (code === 3) {
      style.font_styles.add("italic");
      i++;
      continue;
    }
    if (code === 4) {
      style.font_styles.add("underline");
      i++;
      continue;
    }
    if (code === 5) {
      style.font_styles.add("blinking");
      i++;
      continue;
    }
    if (code === 7) {
      style.font_styles.add("inverse");
      i++;
      continue;
    }
    if (code === 9) {
      style.font_styles.add("strikethrough");
      i++;
      continue;
    }
    if (code === 22) {
      style.font_styles.delete("faint");
      style.font_styles.delete("bold");
      i++;
      continue;
    }
    if (code >= 30 && code <= 37) {
      style.foreground = getAnsiNamedColor(code - 30);
      i++;
      continue;
    }
    if (code >= 90 && code <= 97) {
      style.foreground = getAnsiNamedColor(code - 90 + 8);
      i++;
      continue;
    }
    if (code === 39) {
      style.foreground = void 0;
      i++;
      continue;
    }
    if (code >= 40 && code <= 47) {
      style.background = getAnsiNamedColor(code - 40);
      i++;
      continue;
    }
    if (code >= 100 && code <= 107) {
      style.background = getAnsiNamedColor(code - 100 + 8);
      i++;
      continue;
    }
    if (code === 49) {
      style.background = void 0;
      i++;
      continue;
    }
    if (code === 38 || code === 48) {
      const target = code === 38 ? "foreground" : "background";
      const type = params[i + 1];
      if (type === 5) {
        style[target] = get8BitColor(params[i + 2]);
        i += 3;
        continue;
      }
      if (type === 2) {
        style[target] = `rgb(${params[i + 2]},${params[i + 3]},${params[i + 4]})`;
        i += 5;
        continue;
      }
    }
    i++;
  }
}
function dedup_positions(style_positions) {
  const ans = [];
  let last;
  for (const x of style_positions) {
    const same = is_same_style(last?.style, x.style);
    last = x;
    if (!same)
      ans.push(x);
  }
  return ans;
}
function strip_ansi(text, start_style) {
  const style_positions = [];
  if (!is_clear_style(start_style))
    style_positions.push({
      command: "style",
      style: start_style,
      position: 0
    });
  const strings = [];
  const current_style = { ...start_style, font_styles: new Set(start_style.font_styles) };
  const link_inserts = [];
  let last_index = 0;
  let position = 0;
  function apply_color(color) {
    const params = color.split(";").map((p) => parseInt(p || "0", 10));
    applySGRCode(params, current_style);
    const cloned = { style: clone_style(current_style), position, command: "style" };
    const last_style = style_positions.at(-1);
    if (is_same_style(last_style?.style, cloned.style))
      return;
    if (last_style?.position === position) {
      style_positions.splice(-1, 1, cloned);
      return;
    }
    style_positions.push(cloned);
  }
  for (const match of text.matchAll(ansi_regex)) {
    const { index } = match;
    const skip_str = text.slice(last_index, index);
    position += skip_str.length;
    strings.push(skip_str);
    const sequence = match[0];
    last_index = index + sequence.length;
    const color = parse_group_string(match, "color");
    if (color != null) {
      apply_color(color);
      continue;
    }
    const url = parse_group_string(match, "url");
    const link_text = parse_group_string(match, "link_text");
    if (url != null && link_text != null) {
      link_inserts.push({
        str: `<span data-url=${url}>${link_text}</span>`,
        position,
        command: "insert"
      });
    }
  }
  const deduped = dedup_positions(style_positions);
  const with_pos0 = (function() {
    if (deduped[0]?.position !== 0)
      return [make_clear_style_command(0), ...deduped];
    return deduped;
  })();
  const ans = {
    plain_text: strings.join("") + text.slice(last_index),
    style_positions: with_pos0,
    link_inserts
  };
  return ans;
}

// src/terminal_search.ts
var RangeFinder = class {
  constructor(el2) {
    this.el = el2;
    this.walker = document.createTreeWalker(el2, NodeFilter.SHOW_TEXT);
    this.get_next_node();
  }
  walker;
  cur_node = null;
  cur_length = 0;
  text_head = 0;
  all_done = false;
  get_next_node() {
    this.text_head += this.cur_length;
    this.cur_node = this.walker.nextNode();
    if (this.cur_node == null)
      throw new Error("scriptsmon:cur node is null");
    this.cur_length = this.cur_node.textContent?.length || 0;
  }
  get_node_offset(pos) {
    while (true) {
      if (pos >= this.text_head && pos < this.text_head + this.cur_length + 1)
        return {
          node: this.cur_node,
          node_pos: pos - this.text_head
        };
      this.get_next_node();
    }
  }
};
var RegExpSearcher = class {
  constructor(search_data, regex) {
    this.search_data = search_data;
    this.regex = regex;
    this.children = search_data.term_text.children;
    this.search_data.highlight.clear();
  }
  children;
  last_line_ranges;
  line_head = 0;
  get_line_ranges(line_number) {
    const line = nl(this.children[line_number]);
    const { textContent } = line;
    const line_length = textContent.length;
    if (this.last_line_ranges && this.last_line_ranges.line_length === line_length && this.last_line_ranges.line_number === line_number)
      return;
    const ranges = [];
    let range_finder;
    for (const match of textContent.matchAll(this.regex)) {
      if (range_finder == null)
        range_finder = new RangeFinder(line);
      const range = new Range();
      const start2 = range_finder.get_node_offset(match.index);
      const end = range_finder.get_node_offset(match.index + match[0].length);
      range.setStart(start2.node, start2.node_pos);
      range.setEnd(end.node, end.node_pos);
      ranges.push(range);
    }
    return {
      line_length,
      ranges,
      line_number
    };
  }
  get_start_line() {
    if (this.last_line_ranges == null)
      return 0;
    return this.last_line_ranges.line_number;
  }
  apply_cur_ranges(cur_ranges) {
    if (this.last_line_ranges && this.last_line_ranges.line_number === cur_ranges.line_number) {
      for (const range of this.last_line_ranges.ranges) {
        this.search_data.highlight.delete(range);
      }
    }
    for (const range of cur_ranges.ranges) {
      this.search_data.highlight.add(range);
    }
  }
  iter = () => {
    for (let line = this.get_start_line(); line < this.children.length; line++) {
      const cur_ranges = this.get_line_ranges(line);
      if (cur_ranges == null)
        continue;
      this.apply_cur_ranges(cur_ranges);
      this.last_line_ranges = cur_ranges;
    }
  };
};
function make_regex({ txt, match_case, whole_word, reg_ex }) {
  let pattern = txt;
  if (txt === "")
    return;
  let flags = "g";
  if (!match_case) {
    flags += "i";
  }
  if (!reg_ex) {
    pattern = txt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  if (whole_word) {
    pattern = `\\b${pattern}\\b`;
  }
  return new RegExp(pattern, flags);
}
function get_regexp_string(pattern) {
  if (pattern == null)
    return "none";
  const source = pattern.source;
  const flags = pattern.flags;
  if (flags.length > 0) {
    return `/${source}/${flags}`;
  }
  return `/${source}/`;
}
function trunk(x, min, max) {
  if (x > max)
    return min;
  if (x < min)
    return max;
  return x;
}
var TerminalSearch = class {
  constructor(data2) {
    this.data = data2;
    this.find_widget = create_element(`
      <div class="find_widget_container hidden">
        <div class="find_toolbar">
          <div class="find_input_wrapper">
            <input type="text" class="find_input_field" placeholder="Find" id="find_input" />
            <div class="action_buttons">
              <div class="icon_button" title="Match Case" id=match_case>Aa</div>
              <div class="icon_button" title="Match Whole Word" id=whole_word><u>ab</u></div>
              <div class="icon_button" title="Use Regular Expression" id=reg_ex>.*</div>
            </div>
          </div>
          <div class="navigation_buttons">
            <div class="status_container" id="match_status">
              0 of 0
            </div>   
            <div class="nav_button" id="prev_match" title="Previous Match (Shift+F3)">
               &#x2191;
            </div>             
            <div class="nav_button" id="next_match" title="Next Match (F3)">
               &#x2193;
            </div>
            <div class="nav_button" id="close_widget" title="Close (Escape)">
              \xD7
            </div>
            <div id="regex" title="Close (Escape)">
              df
            </div>            
          </div>
        </div>
    
    
      </div>`, this.data.term_el);
    this.data.term_el.addEventListener("click", this.onclick);
    this.data.term_el.addEventListener("moupsedown", (e) => {
      const { target } = e;
      if (!(target instanceof HTMLElement))
        return;
      const parent = get_parent_by_class(target, "term_text");
      if (parent !== this.data.term_text)
        e.preventDefault();
    });
    this.input().addEventListener("change", this.update_search);
    this.input().addEventListener("input", this.update_search);
    this.interval_id = setInterval(this.iter, 20);
  }
  find_widget;
  interval_id;
  regex_searcher;
  regex;
  selection = 0;
  show() {
    this.find_widget.classList.remove("hidden");
    this.input()?.focus();
  }
  apply_selection(diff) {
    this.selection += diff;
    this.selection = trunk(this.selection, 1, this.data.highlight.size);
    if (this.selection !== 0)
      this.data.highlight.select(this.selection);
  }
  calc_match_status() {
    if (this.data.highlight.size === 0) {
      if (this.regex_searcher != null)
        return `<div class='search_error'>No Results</div>`;
      return `<div>No Results</div>`;
    }
    return `${this.selection} of ${this.data.highlight.size}`;
  }
  iter = () => {
    if (this.regex_searcher) {
      this.regex_searcher.iter();
      this.apply_selection(0);
    }
    update_child_html(this.find_widget, "#match_status", this.calc_match_status());
  };
  input() {
    return this.find_widget.querySelector("#find_input");
  }
  search_term_clear() {
    if (this.regex)
      this.regex_searcher = new RegExpSearcher(this.data, this.regex);
  }
  update_search = () => {
    const txt = this.input().value;
    const match_case = has_class(this.find_widget, "#match_case", "checked");
    const whole_word = has_class(this.find_widget, "#whole_word", "checked");
    const reg_ex = has_class(this.find_widget, "#reg_ex", "checked");
    const regex = make_regex({ txt, match_case, whole_word, reg_ex });
    update_child_html(this.find_widget, "#regex", get_regexp_string(regex));
    this.data.highlight.clear();
    this.regex_searcher = void 0;
    this.data.highlight.clear();
    if (regex != null)
      this.regex_searcher = new RegExpSearcher(this.data, regex);
  };
  onclick = (event) => {
    const { target } = event;
    if (target instanceof HTMLElement) {
      const parent = get_parent_by_class(target, "term_text");
      if (parent !== this.data.term_text)
        event.preventDefault();
    }
    if (!(target instanceof HTMLElement))
      return;
    if (target.id === "find_input") {
      target.focus();
      this.apply_selection(0);
      return;
    }
    if (target.id === "close_widget") {
      get_parent_by_class(target, "find_widget_container")?.classList.toggle("hidden");
      return;
    }
    if (target.id === "prev_match") {
      this.data.term_text.focus();
      this.apply_selection(-1);
      return;
    }
    if (target.id === "next_match") {
      this.data.term_text.focus();
      this.apply_selection(1);
      return;
    }
    const icon_button = get_parent_by_class(target, "icon_button");
    if (icon_button != null) {
      icon_button.classList.toggle("checked");
      this.update_search();
    }
  };
};

// src/terminal.ts
var clear_style = {
  foreground: void 0,
  background: void 0,
  font_styles: /* @__PURE__ */ new Set()
};
function make_channel_states() {
  const stdout = {
    start_parser_state: void 0,
    end_parser_state: void 0,
    start_style: clear_style,
    class_name: "line_stdout",
    end_style: clear_style,
    last_line: ""
    //last_line_plain:''
  };
  const stderr = { ...stdout, class_name: "line_stderr" };
  return {
    stdout,
    stderr
  };
}
function range_to_inserts(range) {
  const { start: start2, end, dataset } = range;
  const datamap = Object.entries(dataset).map(([k, v]) => `data-${k}='${v}'`).join("");
  const open = `<span ${datamap}>`;
  const close = `</span>`;
  return [{ position: start2, str: open, command: "insert" }, { position: end, str: close, command: "insert" }];
}
function ranges_to_inserts(ranges) {
  return ranges.flatMap(range_to_inserts);
}
function get_element_dataset(element) {
  return Object.fromEntries(Object.entries(element.dataset));
}
var Terminal = class {
  //text_index
  constructor(parent, listener, id) {
    this.listener = listener;
    this.channel_states = make_channel_states();
    this.term_el = create_element(`
<div class=term >
  <div class="term_text" tabindex="0"></div>
</div>
    `, parent);
    this.term_text = this.term_el.querySelector(".term_text");
    this.term_text.innerHTML = "";
    this.highlight = new HighlightEx(`search_${id}`, this.term_text);
    this.search = new TerminalSearch(this);
    this.term_el.addEventListener("click", this.onclick);
    this.last_channel = this.channel_states.stdout;
  }
  channel_states;
  term_text;
  term_el;
  search;
  highlight;
  last_channel;
  onclick = (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement))
      return;
    const parent = get_parent_with_dataset(target);
    if (parent == null)
      return;
    const dataset = get_element_dataset(parent);
    const { url } = dataset;
    if (url != null)
      this.listener.open_link(url);
    else
      this.listener.dataset_click(dataset);
  };
  after_write() {
    this.term_text.querySelector(".eof")?.classList.remove("eof");
    this.term_text.lastElementChild?.classList.add("eof");
  }
  apply_styles(channel_state) {
    channel_state.start_parser_state = channel_state.end_parser_state;
    channel_state.start_style = channel_state.end_style;
    channel_state.end_parser_state = void 0;
    channel_state.end_style = clear_style;
    channel_state.last_line = "";
  }
  /*del_last_html_line(channel_state:ChannelState){
    const {last_line_plain}=channel_state
    const line_to_delete=this.term_text.querySelector(`& > :last-child`)
    if (line_to_delete==null){
      console.error('missmatch:line_to_delete_null')
      return
    }
    const {textContent}=line_to_delete
    if (textContent!==last_line_plain){
      console.error('missmatch:text_content')
      return
    }
    line_to_delete.remove()
  }*/
  term_write(output, channel_name) {
    if (output.length === 0)
      return;
    const channel = this.channel_states[channel_name];
    if (this.last_channel !== channel && this.last_channel.last_line !== "") {
      this.apply_styles(this.last_channel);
    }
    this.last_channel = channel;
    const joined_lines = [channel.last_line, ...output].join("").replaceAll("\r\n", "\n");
    const lines = joined_lines.split("\n");
    if (channel.last_line !== "")
      this.term_text.querySelector(`& > :last-child`)?.remove();
    const acum_html = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const {
        plain_text,
        style_positions,
        link_inserts
      } = strip_ansi(line, channel.start_style);
      const is_last = i === lines.length - 1;
      if (is_last && line === "") {
        this.apply_styles(channel);
        break;
      }
      const { ranges, parser_state } = this.listener.parse(plain_text, channel.start_parser_state);
      channel.end_style = style_positions.at(-1).style;
      channel.end_parser_state = parser_state;
      channel.last_line = line;
      const range_inserts = ranges_to_inserts(ranges);
      const inserts = merge_inserts(range_inserts, link_inserts);
      const html = generate_html({ style_positions, inserts, plain_text });
      const br = plain_text === "" ? "<br>" : "";
      acum_html.push(`<div class="${channel.class_name}">${html}${br}</div>`);
      if (!is_last)
        this.apply_styles(channel);
    }
    const new_html = acum_html.join("");
    this.term_text.insertAdjacentHTML("beforeend", new_html);
  }
  show_find() {
    this.search.show();
  }
  term_clear() {
    this.term_text.innerHTML = "";
    this.channel_states = make_channel_states();
    this.search.search_term_clear();
  }
};

// src/terminals_parse.ts
var row = r`(?<row>${digits})`;
var col = r`(?<col>${digits})`;
var optional_rowcol = r`(
    (?:${row},${col})|
    (?::${row}:${col})
  )?`;
var links_regex = re("g")`
  (?<source_file>            # capture group source_file
    (?<![.a-zA-Z])
    (?:[a-zA-Z]:)?             # optional drive char followed by colon
    [a-zA-Z0-9_/\\@.-]+     # one or more file name charecters
    [.]
    [a-zA-Z0-9]+
    (?![.]')                    #disallow dot immediatly after the match
  )
  ${optional_rowcol}`;
var ancor_regex = re("")`
  ^
  (?<source_file>
    ([a-zA-Z]:)?
    [a-zA-Z0-9_\-./\\@]+
  )
  ${optional_rowcol}
  \s*$`;
var ref_regex = re("")`
  ^\s*
  ${row}
  :
  ${col}
  (.*)
`;
function no_nulls(obj) {
  const ans = {};
  for (const [k, v] of Object.entries(obj))
    if (v != null)
      ans[k] = v;
  return ans;
}
function calc_match(match) {
  const { index } = match;
  const text = match[0];
  const start2 = index;
  const end = index + text.length;
  const row2 = parse_group_string(match, "row");
  const col2 = parse_group_string(match, "col");
  const source_file = parse_group_string(match, "source_file");
  return { start: start2, end, dataset: no_nulls({ row: row2, col: col2, source_file }) };
}
function parse_to_ranges(input, parser_state) {
  const ranges = [];
  const ancor_match = input.match(ancor_regex);
  if (ancor_match != null) {
    const ret = calc_match(ancor_match);
    ranges.push(ret);
    return { parser_state: ret.dataset.source_file, ranges };
  }
  if (parser_state != null) {
    const ref_match = input.match(ref_regex);
    if (ref_match !== null) {
      const range = calc_match(ref_match);
      const { dataset } = range;
      ranges.push({
        ...calc_match(ref_match),
        //by theoram will source_file will be empty string at this line, overriden by the next
        dataset: { ...dataset, source_file: parser_state }
      });
      return { parser_state, ranges };
    }
  }
  for (const match of input.matchAll(links_regex)) {
    parser_state = void 0;
    ranges.push(calc_match(match));
  }
  return { ranges, parser_state };
}
function is_string_or_undefined(x) {
  return typeof x === "string" || x === void 0;
}
function parse_line(line, parser_state) {
  if (!is_string_or_undefined(parser_state))
    throw new Error("expecting string or undefined");
  return parse_to_ranges(line, parser_state);
}

// src/terminals.ts
function formatElapsedTime(ms, title, show_ms) {
  const totalSeconds = Math.floor(ms / 1e3);
  const milliseconds = ms % 1e3;
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad2 = (n) => n.toString().padStart(2, "0");
  const pad3 = (n) => n.toString().padStart(3, "0");
  const time = hours > 0 ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
  const ms_display = show_ms ? `<span class=ms>.${pad3(milliseconds)}</span>` : "";
  return `<div title="${title}">${time}${ms_display}</div>`;
}
function rel_click(event, target, effective_watch) {
  const parent = get_parent_by_class(target, "rel");
  if (parent == null)
    return false;
  if (!event.ctrlKey) {
    const { title } = parent;
    post_message({
      command: "command_open_file_rowcol",
      workspace_folder: "",
      source_file: title,
      row: 0,
      col: 0
    });
    return true;
  }
  const rel = effective_watch.find((x) => x.rel.str === parent.textContent);
  if (rel != null) {
    post_message({
      command: "command_open_file_pos",
      pos: rel.rel
    });
    return true;
  }
  return false;
}
function make_onclick(effective_watch) {
  return function(event) {
    const { target } = event;
    if (!(target instanceof HTMLElement))
      return;
    rel_click(event, target, effective_watch);
  };
}
function create_terminal_element(runner) {
  const terms_container = query_selector(document.body, ".terms_container");
  const { id } = runner;
  const ret = terms_container.querySelector(`#${id}`);
  if (ret != null)
    return ret;
  const ans = create_element(`
<div class="term_panel" id="${id}" style="display: none;">
  <div class="term_title_bar">
    <div class="icon text"></div>
    <div class=commands_icons></div>
    <div class=term_title_duration></div>
    <div class=dbg></div>
    <table class=watching></table>
  
  </div>
</div>
  `, terms_container);
  ans.addEventListener("click", make_onclick(runner.effective_watch));
  return ans;
}
function calc_elapsed_html(report, runner) {
  const last_run = calc_last_run(report, runner);
  if (last_run == null)
    return "";
  const { start_time, end_time } = last_run;
  const now = Date.now();
  const effective_end_time = (function() {
    if (end_time == null)
      return now;
    return end_time;
  })();
  const time_since_end = (function() {
    if (end_time == null)
      return "";
    return formatElapsedTime(now - end_time, "time since done", false);
  })();
  const new_time = formatElapsedTime(effective_end_time - start_time, "run time", true) + time_since_end;
  return new_time;
}
var ignore_reasons = ["initial", "user"];
function calc_reason_tr(report, runner) {
  const last_run = calc_last_run(report, runner);
  if (last_run == null)
    return "";
  const { full_reason } = last_run;
  const { reason, full_filename } = full_reason;
  if (ignore_reasons.includes(reason))
    return "";
  return `<tr><td>(${reason})</td><td><div><div class=rel title=${full_filename}>${full_filename}</div></div></td></tr>`;
}
function calc_watching_tr(runner) {
  if (runner.effective_watch.length === 0)
    return "";
  const sep = `<span class=sep> \u2022 </span>`;
  const ret = runner.effective_watch.map(({ rel, full }) => `<div title='${full}'class=rel>${rel.str}</div>`).join(sep);
  return `<tr><td><div><div class=toggles_icons></div>Watching:</td></div><td><div>${ret}</div></td></tr>`;
}
var TerminalPanel = class {
  last_run_id;
  el;
  term;
  workspace_folder;
  constructor(runner) {
    this.workspace_folder = runner.workspace_folder;
    this.el = create_terminal_element(runner);
    this.term = new Terminal(this.el, this, runner.id);
  }
  set_visibility(val) {
    this.el.style.display = val ? "flex" : "none";
  }
  parse(line_text, parse_state) {
    return parse_line(line_text, parse_state);
  }
  open_link(url) {
    post_message({
      command: "command_open_link",
      url
    });
  }
  dataset_click(dataset) {
    const source_file = dataset.source_file;
    if (source_file == null)
      return;
    const row2 = parseInt(dataset.row ?? "", 10) || 0;
    const col2 = parseInt(dataset.col ?? "", 10) || 0;
    const { workspace_folder } = this;
    post_message({
      command: "command_open_file_rowcol",
      workspace_folder,
      source_file,
      row: row2,
      col: col2
    });
  }
  update_terminal2(report, runner) {
    const watching = `${calc_watching_tr(runner)}  
  ${calc_reason_tr(report, runner)}`;
    update_child_html(this.el, ".term_title_bar .term_title_duration", calc_elapsed_html(report, runner));
    update_child_html(this.el, ".term_title_bar .watching", watching);
    const last_run = calc_last_run(report, runner);
    if (last_run == null)
      return;
    const { run_id } = last_run;
    if (run_id !== this.last_run_id) {
      this.term.term_clear();
    }
    this.last_run_id = last_run.run_id;
    if (last_run.stderr.length === 0 && last_run.stdout.length === 0)
      return;
    this.term.term_write(last_run.stderr, "stderr");
    this.term.term_write(last_run.stdout, "stdout");
    this.term.after_write();
  }
  update_terminal(report, runner) {
    try {
      this.update_terminal2(report, runner);
    } catch (ex) {
      const { message } = get_error(ex);
      update_child_html(this.el, ".dbg", message);
    }
  }
};
var Terminals = class {
  terminals = {};
  visible_panel;
  get_terminal(runner) {
    const ans = default_get(this.terminals, runner.id, () => new TerminalPanel(runner));
    return ans;
  }
  on_interval() {
  }
  on_data(data2) {
    const report = data2;
    const f = (folder) => {
      for (const runner of folder.runners)
        this.get_terminal(runner).update_terminal(report, runner);
      folder.folders.forEach(f);
    };
    f(report.root);
  }
  command_find() {
    this.visible_panel?.term.show_find();
  }
  set_selected(id) {
    for (const [panel_id, panel] of Object.entries(this.terminals)) {
      const visible = panel_id === id;
      panel.set_visibility(visible);
      if (visible)
        this.visible_panel = panel;
    }
  }
};

// src/icons.ts
function parse_icons(html) {
  const result = {};
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const icons = doc.querySelectorAll(".icon");
  icons.forEach((icon) => {
    const nameEl = icon.childNodes[0];
    const contentEl = icon.querySelector("svg");
    if (nameEl && contentEl) {
      const name = nameEl.textContent?.trim();
      const content = contentEl.outerHTML;
      if (name != null) {
        result[name] = content;
      }
    }
  });
  const iconnames = Object.keys(result);
  console.log({ iconnames });
  return result;
}
function deceleratingMap(x) {
  const t = Math.min(Math.max(x / 2, 0), 1);
  const easeOut = 1 - (1 - t) * (1 - t);
  return 10 - easeOut * 10;
}
function calc_box_shadow(icon, timeOffset) {
  function f(color) {
    const px = deceleratingMap(timeOffset);
    return `0px 0px ${px}px ${px}px ${color}`;
  }
  if (icon === "done")
    return f("rgba(0, 255, 0,.5)");
  if (icon === "error")
    return f("rgba(255, 0, 0, .5)");
  if (icon === "running")
    return f("rgba(255, 140, 0, 0.5)");
  if (icon === "stopped")
    return f("rgba(128, 0, 128, 0.5)");
  return "";
}
var IconsAnimator = class {
  constructor(icons, commands) {
    this.icons = icons;
    this.commands = commands;
    document.body.addEventListener("click", this.on_click);
  }
  //icons
  id_changed = {};
  icon_versions = {};
  get_command(icon) {
    for (const className of icon.classList)
      if (this.commands.includes(className))
        return className;
  }
  on_click = (evt) => {
    if (evt.target == null)
      return false;
    const command_icon = get_parent_by_classes(evt.target, ["command_icon", "toggle_icon"]);
    if (command_icon == null)
      return;
    const command_name = this.get_command(command_icon);
    if (command_name == null)
      return;
    const id = get_parent_id(command_icon);
    if (id == null)
      return;
    post_message({
      command: "command_clicked",
      id,
      command_name
    });
    evt.stopImmediatePropagation();
  };
  set_icon_version(id, icon, version2) {
    const exists = this.icon_versions[id];
    if (exists != null && exists.icon === icon && exists.version === version2)
      return;
    this.id_changed[id] = Date.now();
    this.icon_versions[id] = { icon, version: version2 };
  }
  calc_icon(k, v) {
    if (v === void 0)
      return "";
    return this.icons[`${k}_${v}`];
  }
  update_icons(tree_node) {
    const f = (node) => {
      const { id, icon, icon_version } = node;
      this.set_icon_version(id, icon, icon_version);
      const toggles = Object.entries(node.toggles).map(([k, v]) => `<div class='toggle_icon ${v} ${k}'>${this.calc_icon(k, v)}</div>`).join("");
      const commands_icons = node.commands.map((x) => `<div class="command_icon ${x}" title="${x}">${this.icons[x]}</div>`).join("");
      const top = `#${id} > :not(.children)`;
      update_child_html(document.body, `${top} .icon:not(.text)`, this.icons[icon] ?? "");
      update_child_html(document.body, `${top} .icon.text`, ` ${this.icons[icon] ?? ""}&nbsp;&nbsp;&nbsp;${icon}`);
      update_child_html(document.body, `${top} .toggles_icons`, toggles);
      update_child_html(document.body, `${top} .commands_icons`, commands_icons);
      update_class_name(document.body, `${top} .icon.text`, `icon text ${icon}`);
      update_class_name(document.body, `${top} .icon:not(.text)`, `icon ${icon}`);
      node.children.map(f);
    };
    f(tree_node);
  }
  animate(tree_node) {
    this.update_icons(tree_node);
    const now = Date.now();
    for (const [id, time] of Object.entries(this.id_changed)) {
      const selector = `#${id} .icon`;
      const elements = document.querySelectorAll(selector);
      for (const el2 of elements) {
        const timeOffset = (now - time) / 1e3;
        if (timeOffset > 4)
          continue;
        const { icon } = this.icon_versions[id];
        el2.style.boxShadow = calc_box_shadow(icon, timeOffset);
      }
    }
  }
};

// src/index.ts
function the_convert(_report) {
  const report = _report;
  function convert_runner(runner) {
    const { script, id, name, effective_watch, tags } = runner;
    const watched = (function() {
      if (effective_watch.length === 0)
        return;
      return report.monitored.includes(id);
    })();
    const { version: version2, state } = calc_runner_status(report, runner);
    return {
      type: "item",
      id,
      label: name,
      commands: ["play", "stop", "copy"],
      children: [],
      description: script,
      icon: state,
      icon_version: version2,
      className: void 0,
      toggles: { watched },
      tags
      //default_checkbox_state: effective_watch.length>0||undefined
    };
  }
  function convert_error(root) {
    const { id, message } = root;
    return {
      type: "item",
      id,
      label: message,
      children: [],
      icon: "syntaxerror",
      icon_version: 1,
      commands: [],
      className: "warning",
      toggles: {},
      tags: []
    };
  }
  function convert_folder(root) {
    const { name, id } = root;
    const folders = root.folders.map(convert_folder);
    const items = root.runners.map(convert_runner);
    const errors = root.errors.map(convert_error);
    const children = [...folders, ...items, ...errors];
    const icon = errors.length === 0 ? "folder" : "foldersyntaxerror";
    return {
      children,
      type: "folder",
      id,
      label: name,
      commands: [],
      icon,
      icon_version: 0,
      className: void 0,
      toggles: {},
      tags: []
    };
  }
  return convert_folder(report.root);
}
var TheTreeProvider = class {
  constructor(terminals) {
    this.terminals = terminals;
  }
  toggle_order = ["watched"];
  //convert=the_convert
  report;
  command(id, command_name) {
    post_message({
      command: "command_clicked",
      id,
      command_name
    });
  }
  //icons_html=ICONS_HTML
  selected(id) {
    this.terminals.set_selected(id);
    const base = find_base(this.report.root, id);
    if (base == null || base.pos == null)
      return;
    if (base.need_ctl && !ctrl.pressed)
      return;
    const { pos } = base;
    post_message({
      command: "command_open_file_pos",
      pos
    });
  }
};
function start() {
  console.log("start");
  const terminals = new Terminals();
  const provider = new TheTreeProvider(terminals);
  const icons = parse_icons(icons_default);
  const icons_animator = new IconsAnimator(icons, ["watched", "play", "stop"]);
  const container = query_selector(document.body, "#the_tree");
  window.addEventListener("focus", () => {
    post_message({ command: "view_focus", val: true });
  });
  window.addEventListener("blur", () => {
    post_message({ command: "view_focus", val: false });
  });
  const tree = new TreeControl(container, provider, icons);
  function on_interval() {
    tree.on_interval();
    terminals.on_interval();
  }
  setInterval(on_interval, 100);
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "RunnerReport": {
        provider.report = message;
        terminals.on_data(message);
        const tree_node = the_convert(message);
        tree.on_data(tree_node);
        icons_animator.animate(tree_node);
        break;
      }
      case "command_find": {
        terminals.command_find();
        break;
      }
      case "set_selected":
        provider.selected(message.selected);
        break;
      default:
        console.log(`unexpected message ${message.command}`);
        break;
    }
  });
}
start();
var el = document.querySelector(".terms_container");
console.log(el);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vYmFzZV90eXBlcy9zcmMvaW5kZXgudHMiLCAiLi4vLi4vc3JjL2RvbV91dGlscy50cyIsICIuLi8uLi9zcmMvdHJlZV9pbnRlcm5hbHMudHMiLCAiLi4vLi4vc3JjL3RyZWVfY29udHJvbC50cyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvYWNvcm4vZGlzdC9hY29ybi5tanMiLCAiLi4vLi4vLi4vc3JjL3BhcnNlci50cyIsICIuLi8uLi9zcmMvY29tbW9uLnRzIiwgIi4uL2ljb25zLmh0bWwiLCAiLi4vLi4vc3JjL3JlZ2V4X2J1aWxkZXIudHMiLCAiLi4vLi4vc3JjL3Rlcm1pbmFsc19hbnNpLnRzIiwgIi4uLy4uL3NyYy90ZXJtaW5hbF9zZWFyY2gudHMiLCAiLi4vLi4vc3JjL3Rlcm1pbmFsLnRzIiwgIi4uLy4uL3NyYy90ZXJtaW5hbHNfcGFyc2UudHMiLCAiLi4vLi4vc3JjL3Rlcm1pbmFscy50cyIsICIuLi8uLi9zcmMvaWNvbnMudHMiLCAiLi4vLi4vc3JjL2luZGV4LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBzMnQ8VD4gPSBSZWNvcmQ8c3RyaW5nLCBUPlxuZXhwb3J0IHR5cGUgczJ1ID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbmV4cG9ydCB0eXBlIHAydSA9IFJlY29yZDxQcm9wZXJ0eUtleSwgdW5rbm93bj4gXG5leHBvcnQgY29uc3QgZ3JlZW49J1xceDFiWzQwbVxceDFiWzMybSdcbmV4cG9ydCBjb25zdCByZWQ9J1xceDFiWzQwbVxceDFiWzMxbSdcbmV4cG9ydCBjb25zdCB5ZWxsb3c9J1xceDFiWzQwbVxceDFiWzMzbSdcblxuZXhwb3J0IGNvbnN0IHJlc2V0PSdcXHgxYlswbSdcbmV4cG9ydCBmdW5jdGlvbiBubDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQpOiBUIHtcbiAgLy90b2RvOmNoZWNrIG9ubHkgYWN0aXZlIG9uIGRlYnVnIG1vZGVcbiAgLy9yZXR1cm4gdmFsdWVcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZCcpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5leHBvcnQgdHlwZSBLZXkgPSBudW1iZXIgfCBzdHJpbmcgLy9zaG91bGQgaSB1c2UgcHJvcGVyeWtleSBmb3IgdGhpcz9cbmV4cG9ydCB0eXBlIEF0b20gPSBudW1iZXIgfCBzdHJpbmcgfCBib29sZWFuIFxuZXhwb3J0IGZ1bmN0aW9uIGlzX2F0b20oeDogdW5rbm93bik6IHggaXMgQXRvbSB7XG4gIGlmICh4ID09IG51bGwpIHJldHVybiBmYWxzZVxuICByZXR1cm4gWydudW1iZXInLCAnc3RyaW5nJywgJ2Jvb2xlYW4nXS5pbmNsdWRlcyh0eXBlb2YgeClcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc19rZXkoeDogdW5rbm93bik6IHggaXMgS2V5IHtcbiAgaWYgKHggPT0gbnVsbCkgcmV0dXJuIGZhbHNlXG4gIHJldHVybiBbJ251bWJlcicsICdzdHJpbmcnXS5pbmNsdWRlcyh0eXBlb2YgeClcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc19hdG9tX2V4KHY6IHVua25vd24sIHBsYWNlOiBzdHJpbmcsIGsgPSAnJyk6IHYgaXMgQXRvbSB7XG4gIGlmIChpc19hdG9tKHYpKSByZXR1cm4gdHJ1ZVxuICBjb25zb2xlLndhcm4oJ25vbi1hdG9tJywgcGxhY2UsIGssIHYpXG4gIHJldHVybiBmYWxzZVxufVxuZXhwb3J0IGZ1bmN0aW9uIGdldF9lcnJvcih4OnVua25vd24pe1xuICBpZiAoeCBpbnN0YW5jZW9mIEVycm9yKVxuICAgIHJldHVybiB4XG4gIGNvbnN0IHN0ciA9IFN0cmluZyh4KVxuICByZXR1cm4gbmV3IEVycm9yKHN0cilcbn1cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1wYXJhbWV0ZXJzXG5leHBvcnQgZnVuY3Rpb24gaXNfb2JqZWN0PFQgZXh0ZW5kcyBvYmplY3Q9czJ1Pih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFR7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gIFxuICAvLyBBY2NlcHQgb2JqZWN0cyBhbmQgZnVuY3Rpb25zXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuICBcbiAgLy8gRXhjbHVkZSBrbm93biBub24tb2JqZWN0IHR5cGVzXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBTZXQpIHJldHVybiBmYWxzZTtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgTWFwKSByZXR1cm4gZmFsc2U7XG4gIFxuICByZXR1cm4gdHJ1ZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBoYXNfa2V5KG9iajogdW5rbm93biwgazogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICghaXNfb2JqZWN0KG9iaikpIHJldHVybiBmYWxzZVxuICByZXR1cm4gayBpbiBvYmpcbn1cbmV4cG9ydCBmdW5jdGlvbiogb2JqZWN0c19vbmx5KGFyOnVua25vd25bXSl7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBhcilcbiAgICBpZiAoaXNfb2JqZWN0KGl0ZW0pKVxuICAgICAgeWllbGQgaXRlbVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzX2tleXMob2JqOiB1bmtub3duLCBrZXlzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICBpZiAoIWlzX29iamVjdChvYmopKSByZXR1cm4gZmFsc2VcbiAgZm9yIChjb25zdCBrIG9mIGtleXMpIGlmIChrIGluIGtleXMpIHJldHVybiB0cnVlXG4gIHJldHVybiBmYWxzZVxufSBcbmV4cG9ydCB0eXBlIHN0cnNldCA9IFNldDxzdHJpbmc+XG5leHBvcnQgdHlwZSBzMm51bSA9IFJlY29yZDxzdHJpbmcsIG51bWJlcj5cbmV4cG9ydCB0eXBlIHMycyA9IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbmV4cG9ydCB0eXBlIG51bTJudW0gPSBSZWNvcmQ8bnVtYmVyLCBudW1iZXI+XG5cbmV4cG9ydCBmdW5jdGlvbiBwazxULCBLIGV4dGVuZHMga2V5b2YgVD4ob2JqOiBUIHwgdW5kZWZpbmVkLCAuLi5rZXlzOiBLW10pOiBQaWNrPFQsIEs+IHtcbiAgY29uc3QgcmV0OiBSZWNvcmQ8UHJvcGVydHlLZXksdW5rbm93bj4gPSB7fSBcbiAga2V5cy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICByZXRba2V5XSA9IG9iaj8uW2tleV1cbiAgfSlcbiAgcmV0dXJuIHJldCBhcyBQaWNrPFQsIEs+IFxufVxuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2U8VD12b2lkPih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByb21pc2U8VD4geyAvLy90cygyNjc3KVxuICBpZiAoIWlzX29iamVjdCh2YWx1ZSkpXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgY29uc3QgYW5zPXR5cGVvZiAodmFsdWUudGhlbik9PT0nZnVuY3Rpb24nXG4gIHJldHVybiBhbnNcbn1cbmV4cG9ydCB0eXBlIE1heWJlUHJvbWlzZTxUPj1UfFByb21pc2U8VD5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlX21heWJlX3Byb21pc2U8VD4oYTpNYXliZVByb21pc2U8VD4pe1xuICBpZiAoaXNfcHJvbWlzZShhKSlcbiAgICByZXR1cm4gYXdhaXQgYVxuICByZXR1cm4gYVxufVxuICAgICAgXG5leHBvcnQgaW50ZXJmYWNlIFRlc3R7XG4gIGs/OnN0cmluZyxcbiAgdj86QXRvbSxcbiAgZjooKT0+TWF5YmVQcm9taXNlPEF0b20+XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5fdGVzdHMoLi4udGVzdHM6IFRlc3RbXSkge1xuICBsZXQgcGFzc2VkID0gMFxuICBsZXQgZmFpbGVkID0gMFxuICBcbiAgZm9yIChjb25zdCB7ayx2LGZ9IG9mIHRlc3RzKSB7XG4gICAgY29uc3QgZWs9ZnVuY3Rpb24oKXtcbiAgICAgIGlmIChrIT1udWxsKVxuICAgICAgICByZXR1cm4ga1xuICAgICAgY29uc3QgZnN0cj1TdHJpbmcoZilcbiAgICAgIHtcbiAgICAgICAgY29uc3QgbWF0Y2g9ZnN0ci5tYXRjaCgvKFxcKFxcKSA9PiApKC4qKS8pXG4gICAgICAgIGlmIChtYXRjaD8ubGVuZ3RoPT09MylcbiAgICAgICAgICByZXR1cm4gbWF0Y2hbMl1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgY29uc3QgbWF0Y2g9ZnN0ci5tYXRjaCgvZnVuY3Rpb25cXHMoXFx3KykvKVxuICAgICAgICBpZiAobWF0Y2g/Lmxlbmd0aD09PTIpXG4gICAgICAgICAgcmV0dXJuIG1hdGNoWzFdICAgICAgXG4gICAgICB9XG4gICAgICByZXR1cm4gJ2Z1bmN0aW9uJ1xuICAgIH0oKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXQ9ZigpXG4gICAgICBjb25zdCBlZmZlY3RpdmVfdj12Pz90cnVlXG4gICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IHJlc29sdmVfbWF5YmVfcHJvbWlzZShyZXQpXG4gICAgICBpZiAocmVzb2x2ZWQ9PT1lZmZlY3RpdmVfdil7XG4gICAgICAgIGNvbnNvbGUubG9nKGBcdTI3MDUgJHtla306ICR7Z3JlZW59JHtlZmZlY3RpdmVfdn0ke3Jlc2V0fWApXG4gICAgICAgIHBhc3NlZCsrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBcdTI3NEMgJHtla306ZXhwZWN0ZWQgJHt5ZWxsb3d9JHtlZmZlY3RpdmVfdn0ke3Jlc2V0fSwgZ290ICR7cmVkfSR7cmVzb2x2ZWR9JHtyZXNldH1gKVxuICAgICAgICBmYWlsZWQrK1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgXHVEODNEXHVEQ0E1ICR7ZWt9IHRocmV3IGFuIGVycm9yOmAsIGVycilcbiAgICAgIGZhaWxlZCsrXG4gICAgfVxuICB9XG4gIGlmIChmYWlsZWQ9PT0wKVxuICAgIGNvbnNvbGUubG9nKGBcXG5TdW1tYXJ5OiAgYWxsICR7cGFzc2VkfSBwYXNzZWRgKSAgXG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhgXFxuU3VtbWFyeTogICR7ZmFpbGVkfSBmYWlsZWQsICR7cGFzc2VkfSBwYXNzZWRgKSAgXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbW1vblByZWZpeChwYXRoczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBpZiAocGF0aHMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJcIjtcbiAgaWYgKHBhdGhzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHBhdGhzWzBdO1xuXG4gIC8vIFNwbGl0IGVhY2ggcGF0aCBpbnRvIHBhcnRzIChlLmcuLCBieSBcIi9cIiBvciBcIlxcXFxcIilcbiAgY29uc3Qgc3BsaXRQYXRocyA9IHBhdGhzLm1hcChwID0+IHAuc3BsaXQoL1tcXFxcL10rLykpO1xuXG4gIGNvbnN0IGNvbW1vblBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBmaXJzdCA9IHNwbGl0UGF0aHNbMF07XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaXJzdC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhcnQgPSBmaXJzdFtpXTtcbiAgICBpZiAoc3BsaXRQYXRocy5ldmVyeShwID0+IHBbaV0gPT09IHBhcnQpKSB7XG4gICAgICBjb21tb25QYXJ0cy5wdXNoKHBhcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvLyBKb2luIGJhY2sgd2l0aCBcIi9cIiAob3IgdXNlIHBhdGguam9pbiBmb3IgcGxhdGZvcm0tc3BlY2lmaWMgYmVoYXZpb3IpXG4gIHJldHVybiBjb21tb25QYXJ0cy5qb2luKFwiL1wiKTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiBnZXRfbm9kZSgpe1xuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcImdldEZpbGVDb250ZW50cygpIHJlcXVpcmVzIE5vZGUuanNcIik7XG4gIH1cbiAgY29uc3QgcGF0aCA9IGF3YWl0IGltcG9ydChcIm5vZGU6cGF0aFwiKTtcbiAgY29uc3QgZnMgPSBhd2FpdCBpbXBvcnQoXCJub2RlOmZzL3Byb21pc2VzXCIpO1xuICByZXR1cm4ge2ZzLHBhdGh9ICBcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBta2Rpcl93cml0ZV9maWxlKGZpbGVQYXRoOnN0cmluZyxkYXRhOnN0cmluZyxjYWNoZT1mYWxzZSl7XG4gIGNvbnN0IHtwYXRoLGZzfT1hd2FpdCBnZXRfbm9kZSgpXG4gIGNvbnN0IGRpcmVjdG9yeT1wYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xuICB0cnl7XG4gICAgYXdhaXQgZnMubWtkaXIoZGlyZWN0b3J5LHtyZWN1cnNpdmU6dHJ1ZX0pO1xuICAgIGlmIChjYWNoZSl7XG4gICAgICBjb25zdCBleGlzdHM9YXdhaXQgcmVhZF9maWxlKGZpbGVQYXRoKTtcbiAgICAgIGlmIChleGlzdHM9PT1kYXRhKVxuICAgICAgICByZXR1cm5cbiAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblxuICAgIGF3YWl0IGZzLndyaXRlRmlsZShmaWxlUGF0aCxkYXRhKTtcbiAgICBjb25zb2xlLmxvZyhgRmlsZSAnJHtmaWxlUGF0aH0nIGhhcyBiZWVuIHdyaXR0ZW4gc3VjY2Vzc2Z1bGx5LmApO1xuICB9IGNhdGNoIChlcnIpe1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHdyaXRpbmcgZmlsZScsZXJyKVxuICB9XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZF9maWxlKGZpbGVuYW1lOnN0cmluZyl7XG4gIGNvbnN0IHtmc309YXdhaXQgZ2V0X25vZGUoKSAgXG4gIHRyeXtcbiAgICBjb25zdCBhbnM9YXdhaXQgZnMucmVhZEZpbGUoZmlsZW5hbWUpXG4gICAgcmV0dXJuIGFucy50b1N0cmluZygpXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkX2pzb25fb2JqZWN0KGZpbGVuYW1lOnN0cmluZyxvYmplY3RfdHlwZTpzdHJpbmcpe1xuICBjb25zdCB7ZnN9PWF3YWl0IGdldF9ub2RlKClcbiAgdHJ5e1xuICAgIGNvbnN0IGRhdGE9YXdhaXQgZnMucmVhZEZpbGUoZmlsZW5hbWUsIFwidXRmLThcIik7XG4gICAgY29uc3QgYW5zPUpTT04ucGFyc2UoZGF0YSkgYXMgdW5rbm93blxuICAgIGlmICghaXNfb2JqZWN0KGFucykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vdCBhIHZhbGlkICR7b2JqZWN0X3R5cGV9YClcbiAgICByZXR1cm4gYW5zXG4gIH1jYXRjaChleDp1bmtub3duKXtcbiAgICBjb25zb2xlLndhcm4oYCR7ZmlsZW5hbWV9OiR7Z2V0X2Vycm9yKGV4KX0ubWVzc2FnZWApXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5leHBvcnQgZnVuY3Rpb24gaXNfc3RyaW5nX2FycmF5KGE6dW5rbm93bik6YSBpcyBzdHJpbmdbXXtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGEpKVxuICAgIHJldHVybiBmYWxzZVxuICBmb3IgKGNvbnN0IHggb2YgYSlcbiAgICBpZiAodHlwZW9mIHghPT0nc3RyaW5nJylcbiAgICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gdHJ1ZSAgXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzbGVlcChtczogbnVtYmVyKSB7XG4gIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZSh1bmRlZmluZWQpLCBtcyk7XG4gIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VfYXJyYXk8VD4oKTpBcnJheTxUPntcbiAgcmV0dXJuIFtdXG59XG5leHBvcnQgZnVuY3Rpb24gbWFrZV9zZXQ8VD4oKXtcbiAgcmV0dXJuIG5ldyBTZXQ8VD5cbn1cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0X2dldDxUPihvYmo6UmVjb3JkPFByb3BlcnR5S2V5LFQ+LGs6UHJvcGVydHlLZXksbWFrZXI6KCk9PlQpe1xuICBjb25zdCBleGlzdHM9b2JqW2tdXG4gIGlmIChleGlzdHM9PW51bGwpe1xuICAgIG9ialtrXT1tYWtlcigpIFxuICB9XG4gIHJldHVybiBvYmpba11cbn1cbmV4cG9ydCBjbGFzcyBSZXBlYXRlcntcbiAgaXNfcnVubmluZz10cnVlXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBkZWxheT0yMDApe1xuICB9XG4gIHByaXZhdGUgbG9vcD1hc3luYyAoZjooKT0+TWF5YmVQcm9taXNlPHZvaWQ+KT0+e1xuICAgIHdoaWxlICh0aGlzLmlzX3J1bm5pbmcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGYoKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yOlwiLCBlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIHdhaXQgYmVmb3JlIG5leHQgcnVuXG4gICAgICBhd2FpdCBzbGVlcCh0aGlzLmRlbGF5KVxuICAgIH0gICAgXG4gIH1cbiAgYXN5bmMgcmVwZWF0KGY6KCk9Pk1heWJlUHJvbWlzZTx2b2lkPil7ICBcbiAgICBhd2FpdCBmKCk7XG4gICAgdm9pZCB0aGlzLmxvb3AoZilcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHRvZ2dsZV9zZXQ8VD4oc2V0OlNldDxUPix2YWx1ZTpUKXtcbiAgaWYgKHNldC5oYXModmFsdWUpKSB7XG4gICAgc2V0LmRlbGV0ZSh2YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgc2V0LmFkZCh2YWx1ZSk7XG4gIH1cbn0iLCAiaW1wb3J0ICB7IHR5cGUgczJ0LG5sfSBmcm9tICdAeWlnYWwvYmFzZV90eXBlcydcblxuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJ5X3NlbGVjdG9yPFQgZXh0ZW5kcyBFbGVtZW50PUVsZW1lbnQ+KGVsOkVsZW1lbnQsc2VsZWN0b3I6c3RyaW5nKXsgLy8gMzozMiAgd2FybmluZyAgVHlwZSBwYXJhbWV0ZXIgVCBpcyB1c2VkIG9ubHkgb25jZSBpbiB0aGUgZnVuY3Rpb24gc2lnbmF0dXJlICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1wYXJhbWV0ZXJzIHdoeT9cbiAgICBjb25zdCBhbnM9ZWwucXVlcnlTZWxlY3RvcjxUPihzZWxlY3Rvcik7XG4gICAgaWYgKGFucz09bnVsbClcbiAgICAgIHRocm93IG5ldyBFcnJvcignc2VsZWN0b3Igbm90IGZvdW5kIG9yIG5vdCBleHBlY3RlZCB0eXBlJykgIFxuICAgICAgcmV0dXJuIGFuc1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9lbGVtZW50KGh0bWw6c3RyaW5nLHBhcmVudD86SFRNTEVsZW1lbnQpe1xuICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZW1wbGF0ZVwiKVxuICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sLnRyaW0oKVxuICBjb25zdCBhbnMgPSB0ZW1wbGF0ZS5jb250ZW50LmZpcnN0RWxlbWVudENoaWxkIGFzIEhUTUxFbGVtZW50O1xuICBpZiAocGFyZW50IT1udWxsKVxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChhbnMpXG4gIHJldHVybiBhbnNcbn1cbmV4cG9ydCBmdW5jdGlvbiBkaXZzKHZhbHM6czJ0PHN0cmluZ3x1bmRlZmluZWQ+KXtcbiAgY29uc3QgYW5zPVtdXG4gIGZvciAoY29uc3QgW2ssdl0gb2YgT2JqZWN0LmVudHJpZXModmFscykpXG4gICAgaWYgKHYhPW51bGwmJnYhPT0nJylcbiAgICAgIGFucy5wdXNoKGA8ZGl2IGNsYXNzPVwiJHtrfVwiPiR7dn08L2Rpdj5gKVxuICByZXR1cm4gYW5zLmpvaW4oJycpXG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0X3BhcmVudF9ieV9kYXRhX2F0dGlidXRlKGVsOkhUTUxFbGVtZW50fG51bGwsa2V5OnN0cmluZyl7XG4gIGlmIChlbD09bnVsbClcbiAgICByZXR1cm4gbnVsbFxuICBsZXQgYW5zOkhUTUxFbGVtZW50fG51bGw9ZWxcbiAgd2hpbGUoYW5zIT1udWxsKXtcbiAgICBjb25zdCB7ZGF0YXNldH09YW5zXG4gICAgaWYgKGtleSBpbiBkYXRhc2V0KVxuICAgICAgcmV0dXJuIGFuc1xuICAgIGFucz1hbnMucGFyZW50RWxlbWVudFxuICB9XG4gIHJldHVybiBudWxsXG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0X3BhcmVudF93aXRoX2RhdGFzZXQoZWw6SFRNTEVsZW1lbnR8bnVsbCl7XG4gIGlmIChlbD09bnVsbClcbiAgICByZXR1cm4gbnVsbFxuICBsZXQgYW5zOkhUTUxFbGVtZW50fG51bGw9ZWxcbiAgd2hpbGUoYW5zIT1udWxsKXtcbiAgICBpZiAoT2JqZWN0LmVudHJpZXMoYW5zLmRhdGFzZXQpLmxlbmd0aCE9PTApXG4gICAgICByZXR1cm4gYW5zXG4gICAgYW5zPWFucy5wYXJlbnRFbGVtZW50XG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRfcGFyZW50X2J5X2NsYXNzKGVsOkVsZW1lbnR8bnVsbCxjbGFzc05hbWU6c3RyaW5nKXtcbiAgaWYgKGVsPT1udWxsKVxuICAgIHJldHVybiBudWxsXG4gIGxldCBhbnM6RWxlbWVudHxudWxsPWVsXG4gIHdoaWxlKGFucyE9bnVsbCl7XG4gICAgaWYgKGFucy5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSlcbiAgICAgIHJldHVybiBhbnMgYXMgSFRNTEVsZW1lbnRcbiAgICBhbnM9YW5zLnBhcmVudEVsZW1lbnRcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuZnVuY3Rpb24gaGFzX2NsYXNzZXMoZWw6IEhUTUxFbGVtZW50IHwgbnVsbCxjbGFzc2VzOnN0cmluZ1tdKXtcbiAgaWYgKGVsPT1udWxsKVxuICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gY2xhc3Nlcy5zb21lKGMgPT4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGMpKVxufVxuZXhwb3J0IGZ1bmN0aW9uIGhhc19jbGFzcyhwYXJlbnQ6IEhUTUxFbGVtZW50LHNlbGVjdG9yOnN0cmluZyxjOnN0cmluZyl7XG4gIGNvbnN0IGVsPXBhcmVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKVxuICBpZiAoZWw9PW51bGwpXG4gICAgcmV0dXJuIGZhbHNlXG4gIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoYylcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF9wYXJlbnRfYnlfY2xhc3NlcyhcbiAgZWw6IEhUTUxFbGVtZW50LFxuICBjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdXG4pOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICBjb25zdCBjbGFzc2VzID0gQXJyYXkuaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gIGxldCBhbnM6IEhUTUxFbGVtZW50IHwgbnVsbCA9IGVsO1xuXG4gIHdoaWxlIChhbnMgIT09IG51bGwpIHtcbiAgICBpZiAoaGFzX2NsYXNzZXMoYW5zLGNsYXNzZXMpKVxuICAgICAgcmV0dXJuIGFucztcbiAgICBhbnMgPSBhbnMucGFyZW50RWxlbWVudDtcbiAgfSBcbiAgcmV0dXJuIG51bGw7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0X3BhcmVudF9pZCggLy9sb29wcyBvdmVyIHBhcmVudHMgdW50aWwgZmlyc3Qgd2l0aCBpZFxuICBlbDogSFRNTEVsZW1lbnRcbik6IHN0cmluZ3x1bmRlZmluZWR7XG4gIGxldCBhbnM9ZWwucGFyZW50RWxlbWVudFxuXG4gIHdoaWxlIChhbnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBpZD1hbnMuZ2V0QXR0cmlidXRlKCdpZCcpXG4gICAgaWYgKGlkIT1udWxsKVxuICAgICAgcmV0dXJuIGlkXG4gICAgYW5zID0gYW5zLnBhcmVudEVsZW1lbnQ7XG4gIH0gXG59XG5mdW5jdGlvbiBzZXR0ZXJfY2FjaGUoc2V0dGVyOihlbDpIVE1MRWxlbWVudCx2YWx1ZTpzdHJpbmcpPT52b2lkKXtcbiAgY29uc3QgZWxfdG9faHRtbD0gbmV3IFdlYWtNYXA8SFRNTEVsZW1lbnQsc3RyaW5nPigpXG4gIHJldHVybiBmdW5jdGlvbihlbDpIVE1MRWxlbWVudCxzZWxlY3RvcjpzdHJpbmcsdmFsdWU6c3RyaW5nKXsgXG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBlbC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihzZWxlY3Rvcikpe1xuICAgICAgY29uc3QgZXhpc3RzPWVsX3RvX2h0bWwuZ2V0KGNoaWxkKVxuICAgICAgaWYgKGV4aXN0cz09PXZhbHVlKVxuICAgICAgICBjb250aW51ZVxuICAgICAgZWxfdG9faHRtbC5zZXQoY2hpbGQsdmFsdWUpXG4gICAgICBzZXR0ZXIoY2hpbGQsdmFsdWUpICBcbiAgICB9IFxuICB9XG59XG5cbmV4cG9ydCBjb25zdCB1cGRhdGVfY2hpbGRfaHRtbD1zZXR0ZXJfY2FjaGUoKGVsOkhUTUxFbGVtZW50LHZhbHVlOnN0cmluZyk9PntlbC5pbm5lckhUTUw9dmFsdWV9KVxuZXhwb3J0IGNvbnN0IHVwZGF0ZV9jbGFzc19uYW1lPXNldHRlcl9jYWNoZSgoZWw6SFRNTEVsZW1lbnQsdmFsdWU6c3RyaW5nKT0+eyBlbC5jbGFzc05hbWU9dmFsdWV9KVxuXG5leHBvcnQgY2xhc3MgQ3RybFRyYWNrZXJ7XG4gIHByZXNzZWQgPSBmYWxzZTtcbiAgY29uc3RydWN0b3IoKXtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGUpID0+IHtcbiAgICAgIGlmIChlLmtleSA9PT0gXCJDb250cm9sXCIpIHtcbiAgICAgICAgdGhpcy5wcmVzc2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKGUpID0+IHtcbiAgICAgIGlmIChlLmtleSA9PT0gXCJDb250cm9sXCIpIHtcbiAgICAgICAgdGhpcy5wcmVzc2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7ICAgIFxuICB9XG59XG5pbnRlcmZhY2UgVlNDb2RlQXBpIHtcbiAgcG9zdE1lc3NhZ2UobWVzc2FnZTogdW5rbm93bik6IHZvaWQ7XG4gIGdldFN0YXRlKCk6IHVua25vd247XG4gIHNldFN0YXRlKHN0YXRlOiB1bmtub3duKTogdm9pZDtcbn1cbmRlY2xhcmUgZnVuY3Rpb24gYWNxdWlyZVZzQ29kZUFwaSgpOiBWU0NvZGVBcGk7XG5leHBvcnQgY29uc3QgdnNjb2RlID0gYWNxdWlyZVZzQ29kZUFwaSgpO1xuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnR7XG4gIG9uX2ludGVydmFsOigpPT52b2lkXG4gIG9uX2RhdGE6KGRhdGE6dW5rbm93bik9PnZvaWRcbn1cbmV4cG9ydCBjb25zdCBjdHJsPW5ldyBDdHJsVHJhY2tlcigpXG5leHBvcnQgY29uc3QgcmUgPSAoZmxhZ3M/OiBzdHJpbmcpID0+ICAvL3RvZG86IG1vdmUgaXQgdG8gc29tZSBnZW5lcmljIGxpYiBsaWtlIHRoZSBiYXNlX3R5cGVzLiBhbHJlYWR5IG9ic29sZXRlXG4gIChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pOiBSZWdFeHAgPT4ge1xuICAgIGNvbnN0IHJhdyA9IFN0cmluZy5yYXcoeyByYXc6IHN0cmluZ3MgfSwgLi4udmFsdWVzKTtcbiAgICBjb25zdCBzYW5pdGl6ZWQgPSByYXcucmVwbGFjZSgvIy4qJC9nbSwgJycpLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIHJldHVybiBuZXcgUmVnRXhwKHNhbml0aXplZCwgZmxhZ3MpO1xuICB9O1xuZnVuY3Rpb24gZ2V0X3JhbmdlX2FycmF5KHg6IEhpZ2hsaWdodCl7XG4gIGNvbnN0IGFucz1bLi4ueC52YWx1ZXMoKV1cbiAgcmV0dXJuIGFuc1xufVxuZnVuY3Rpb24gZ2V0X2VsZW1lbnRfc2VsZWN0aW9uKGNvbnRhaW5lcjpIVE1MRWxlbWVudCkge1xuICBjb25zdCBzID0gd2luZG93LmdldFNlbGVjdGlvbigpO1xuICBpZiAocz09bnVsbClcbiAgICByZXR1cm5cblxuICBpZiAocy5yYW5nZUNvdW50ID4gMCkge1xuICAgIGNvbnN0IHIgPSBzLmdldFJhbmdlQXQoMCk7XG4gICAgY29uc3QgbiA9IHIuY29tbW9uQW5jZXN0b3JDb250YWluZXI7XG4gICAgY29uc3Qgb2ZfY29udGFpbmVyPWNvbnRhaW5lci5jb250YWlucyhuLm5vZGVUeXBlID09PSAxID8gbiA6IG4ucGFyZW50Tm9kZSlcbiAgICByZXR1cm4gYG9mX2NvbnRhaW5lciAke29mX2NvbnRhaW5lcn0sICR7c31gXG4gIH1cblxuICByZXR1cm5cbn1cbmZ1bmN0aW9uIHByaW50X3NlbGVjdGlvbihlbDp1bmtub3duKXtcbiAgaWYgKCEoZWwgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgcmV0dXJuXG4gIGNvbnNvbGUubG9nKCdzY3JpcHRzbW9uOiBzZWxlY3Rpb24nLGdldF9lbGVtZW50X3NlbGVjdGlvbihlbCkpXG59XG5leHBvcnQgY2xhc3MgSGlnaGxpZ2h0RXh7XG4gIGhpZ2hsaWdodFxuICBzZWxlY3RlZF9oaWdobGlnaHRcbiAgZm9jdXNlZD1mYWxzZVxuICBzZWxlY3RlZF9yYW5nZTpBYnN0cmFjdFJhbmdlfHVuZGVmaW5lZFxuICByYW5nZXM6QXJyYXk8QWJzdHJhY3RSYW5nZT58dW5kZWZpbmVkXG4gIGNvbnN0cnVjdG9yKGhpZ2hsaWdodF9uYW1lOnN0cmluZyxlbDpFbGVtZW50KXtcbiAgICB0aGlzLmhpZ2hsaWdodD10aGlzLm1ha2VfaGlnaGxpZ2h0KGhpZ2hsaWdodF9uYW1lLCdmaW5kTWF0Y2gnLDApXG4gICAgdGhpcy5zZWxlY3RlZF9oaWdobGlnaHQ9dGhpcy5tYWtlX2hpZ2hsaWdodChgc2VsZWN0ZWRfJHtoaWdobGlnaHRfbmFtZX1gLCdmaW5kTWF0Y2hIaWdobGlnaHQnLDEpXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsdGhpcy5vbmJsdXIsdHJ1ZSlcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsdGhpcy5vbmZvY3VzLHRydWUpXG4gIH0gIFxuICBvbmJsdXI9KGU6RXZlbnQpPT57XG4gICAgdGhpcy5mb2N1c2VkPWZhbHNlXG4gICAgY29uc29sZS5sb2coJ3NjcmlwdHNtb246Ymx1cicsZS50YXJnZXQsdGhpcy5mb2N1c2VkKVxuICAgIGNvbnN0IHMgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG4gICAgaWYgKCFzIHx8IHMucmFuZ2VDb3VudCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCByID0gcy5nZXRSYW5nZUF0KDApO1xuICAgIHRoaXMuc2VsZWN0ZWRfaGlnaGxpZ2h0LmNsZWFyKClcbiAgICB0aGlzLnNlbGVjdGVkX2hpZ2hsaWdodC5hZGQocilcbiAgICBzLnJlbW92ZUFsbFJhbmdlcygpXG4gICAgLy90b2RvOiBnZXQgc2VsZWN0aW9pbiByYW5nZSBhbmQgcHV0IGl0IG9uIHRoZSBzZWxlY3RlZF9oaWdobGlnaHRcbiAgfVxuICBvbmZvY3VzPShlOkV2ZW50KT0+e1xuICAgIC8vdG9kbzp0YWtlIHRoZSBzZWxlY3RlZF9oaWdobGlnaHQgYW5kIHB1dCBpdCBvbiB0aGUgaGlnaGxpZ2h0XG4gICAgdGhpcy5mb2N1c2VkPXRydWVcbiAgICBjb25zdCBzID0gd2luZG93LmdldFNlbGVjdGlvbigpOyAgICBcbiAgICBpZiAocz09bnVsbClcbiAgICAgIHJldHVyblxuICAgIGZvciAoY29uc3QgciBvZiB0aGlzLnNlbGVjdGVkX2hpZ2hsaWdodC5rZXlzKCkpe1xuICAgICAgcy5yZW1vdmVBbGxSYW5nZXMoKVxuICAgICAgcy5hZGRSYW5nZShyIGFzIFJhbmdlKVxuICAgICAgYnJlYWsvL2J5IHRob2VyYW0gdGhhdCBpcyBhbGwgc2VsZWN0ZWRfaGlnaGxpZ2h0IGhhdmUgYnV0IGJyZWFrIFxuICAgIH1cbiAgICB0aGlzLnNlbGVjdGVkX2hpZ2hsaWdodC5jbGVhcigpXG4gICAgY29uc29sZS5sb2coJ3NjcmlwdHNtb246Zm9jdXMnLGUudGFyZ2V0LHRoaXMuZm9jdXNlZClcbiAgfVxuICBcbiAgbWFrZV9oaWdobGlnaHQobmFtZTpzdHJpbmcsYmFzZTpzdHJpbmcscHJpb3JpdHk6bnVtYmVyKXtcbiAgICBjb25zdCBhbnM9bmV3IEhpZ2hsaWdodCgpXG4gICAgY29uc3QgZHluYW1pY19zaGVldCA9IG5ldyBDU1NTdHlsZVNoZWV0KCk7XG4gICAgZG9jdW1lbnQuYWRvcHRlZFN0eWxlU2hlZXRzLnB1c2goZHluYW1pY19zaGVldCk7ICAgIFxuICAgIGR5bmFtaWNfc2hlZXQuaW5zZXJ0UnVsZShgXG4gIDo6aGlnaGxpZ2h0KCR7bmFtZX0pIHsgXG4gICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLXRlcm1pbmFsLSR7YmFzZX1CYWNrZ3JvdW5kKTtcbiAgICBvdXRsaW5lOiAxcHggc29saWQgdmFyKC0tdnNjb2RlLXRlcm1pbmFsLSR7YmFzZX1Cb3JkZXIpO1xuICB9XG5gKS8vdGhpcyB3b3JrcyBmb3IgdnNjb2RlIHBsdWdpbiB3ZWJ2aWV3LCBidXQgaWYgaSBldmVyeSB3YW50IHRvIHVzZSB0aGUgbW9kdWxlIGZvciBvdGhlciBjYXNlcywgdGhpcyB3b3VsZCBoYXZlIHRvIGNoYW5nZVxuXG5cbiAgICBDU1MuaGlnaGxpZ2h0cy5zZXQobmFtZSxhbnMpO1xuICAgIGFucy5wcmlvcml0eT1wcmlvcml0eVxuICAgIHJldHVybiBhbnNcbiAgfVxuICBnZXRfcmFuZ2VfYnlfaW5kZXgoaGlnaGxpZ2h0OiBIaWdobGlnaHQsIGluZGV4OiBudW1iZXIpe1xuICAgIGNvbnN0IHJhbmdlcyA9IEFycmF5LmZyb20oaGlnaGxpZ2h0KTtcbiAgICByZXR1cm4gcmFuZ2VzW2luZGV4XSBcbiAgfVxuICBjbGVhcigpe1xuICAgIHRoaXMuaGlnaGxpZ2h0LmNsZWFyKClcbiAgICB0aGlzLnNlbGVjdGVkX2hpZ2hsaWdodC5jbGVhcigpXG4gICAgLy90aGlzLnNlbGVjdGVkX3JhbmdlXG4gICAgdGhpcy5yYW5nZXM9dW5kZWZpbmVkXG4gICAgLy90aGlzLmNsZWFyX3NlbGVjdGVkX3JhbmdlKClcbiAgfVxuICBkZWxldGUocmFuZ2U6UmFuZ2Upe1xuICAgIHRoaXMuaGlnaGxpZ2h0LmRlbGV0ZShyYW5nZSlcbiAgICB0aGlzLnJhbmdlcz11bmRlZmluZWRcbiAgfVxuICBhZGQocmFuZ2U6UmFuZ2Upe1xuICAgIHRoaXMuaGlnaGxpZ2h0LmFkZChyYW5nZSlcbiAgICB0aGlzLnJhbmdlcz11bmRlZmluZWRcbiAgfVxuICAvKmNsZWFyX3NlbGVjdGVkX3JhbmdlKCl7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRfcmFuZ2U9PW51bGwpXG4gICAgICByZXR1cm5cbiAgICBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKT8ucmVtb3ZlQWxsUmFuZ2VzKCk7XG4gICAgdGhpcy5zZWxlY3RlZF9yYW5nZT11bmRlZmluZWRcbiAgfSovXG4gIGdldF9yYW5nZXMoKXtcbiAgICBpZiAodGhpcy5yYW5nZXM9PW51bGwpXG4gICAgICB0aGlzLnJhbmdlcz0gZ2V0X3JhbmdlX2FycmF5KHRoaXMuaGlnaGxpZ2h0KVxuICAgIHJldHVybiB0aGlzLnJhbmdlc1xuICB9XG4gIFxuICBzZWxlY3QocmFuZ2VfbnVtOm51bWJlcil7XG4gICAgY29uc3QgcmFuZ2U9dGhpcy5nZXRfcmFuZ2VzKClbcmFuZ2VfbnVtLTFdXG4gICAgaWYgKHJhbmdlPT1udWxsKXtcbiAgICAgIGNvbnNvbGUud2Fybihgc2NyaXB0c21vbjogY2FudCBmaW5kIHJhbmdlIGJ5IG51bSAke3JhbmdlX251bX1gKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmIChyYW5nZT09PXRoaXMuc2VsZWN0ZWRfcmFuZ2UpXG4gICAgICByZXR1cm4gXG4gICAgdGhpcy5zZWxlY3RlZF9yYW5nZT1yYW5nZVxuICAgIGlmICh0aGlzLmZvY3VzZWQpe1xuICAgICAgY29uc3Qgc2VsZWN0aW9uPW5sKGRvY3VtZW50LmdldFNlbGVjdGlvbigpKVxuICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXG4gICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UgYXMgUmFuZ2UpXG4gICAgfWVsc2V7XG4gICAgICB0aGlzLnNlbGVjdGVkX2hpZ2hsaWdodC5jbGVhcigpXG4gICAgICB0aGlzLnNlbGVjdGVkX2hpZ2hsaWdodC5hZGQocmFuZ2UpXG4gICAgfVxuICB9XG4gIGdldCBzaXplKCl7XG4gICAgcmV0dXJuIHRoaXMuaGlnaGxpZ2h0LnNpemVcbiAgfVxufSIsICJpbXBvcnQgIHR5cGUgeyBNYXliZVByb21pc2V9IGZyb20gJ0B5aWdhbC9iYXNlX3R5cGVzJ1xuaW1wb3J0IHtnZXRfcGFyZW50X2J5X2NsYXNzfSBmcm9tICcuL2RvbV91dGlscy5qcydcbmV4cG9ydCBpbnRlcmZhY2UgVHJlZU5vZGV7XG4gIHR5cGUgICAgICAgICAgICAgICAgICAgOiAnaXRlbSd8J2ZvbGRlcicgICAvL2lzIHRoaXMgbmVlZGVkP1xuICBsYWJlbCAgICAgICAgICAgICAgICAgIDogc3RyaW5nLFxuICBpZCAgICAgICAgICAgICAgICAgICAgIDogc3RyaW5nO1xuICBpY29uICAgICAgICAgICAgICAgICAgIDogc3RyaW5nXG4gIGNsYXNzTmFtZSAgICAgICAgICAgICAgOiBzdHJpbmd8dW5kZWZpbmVkXG4gIGRlc2NyaXB0aW9uICAgICAgICAgICA/OiBzdHJpbmdcbiAgY29tbWFuZHMgICAgICAgICAgICAgICA6IHN0cmluZ1tdICAgICAgICAgIC8vaGFyZCBjb2RkZWQgY29tbW1hbmQ6IGNoZWNrYm94IGNsaWNrZWRcbiAgY2hpbGRyZW4gICAgICAgICAgICAgICA6IFRyZWVOb2RlW11cbiAgaWNvbl92ZXJzaW9uICAgICAgICAgICA6IG51bWJlcixcbiAgdG9nZ2xlcyAgICAgICAgICAgICAgICA6IFJlY29yZDxzdHJpbmcsYm9vbGVhbnx1bmRlZmluZWQ+XG4gIHRhZ3M6ICAgICAgICAgICAgICAgICAgc3RyaW5nW11cbiAgLy9jaGVja2JveF9zdGF0ZSAgICAgICAgIDogYm9vbGVhbnx1bmRlZmluZWRcbiAgLy9kZWZhdWx0X2NoZWNrYm94X3N0YXRlIDogYm9vbGVhbnx1bmRlZmluZWRcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVHJlZURhdGFQcm92aWRlcntcbiAgdG9nZ2xlX29yZGVyOkFycmF5PHN0cmluZz5cbiAgLy9jb252ZXJ0OiAocm9vdDp1bmtub3duKT0+VHJlZU5vZGVcbiAgY29tbWFuZDooaWQ6c3RyaW5nLGNvbW1hbmRfbmFtZTpzdHJpbmcpPT5NYXliZVByb21pc2U8dm9pZD5cbiAgc2VsZWN0ZWQ6KGlkOnN0cmluZyk9Pk1heWJlUHJvbWlzZTx2b2lkPlxuICAvL2ljb25zX2h0bWw6c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGdldF9wcmV2X3NlbGVjdGVkKHNlbGVjdGVkOkhUTUxFbGVtZW50KXtcbiAgaWYgKHNlbGVjdGVkPT1udWxsKVxuICAgIHJldHVybiBudWxsIC8vIGkgbGlrZSB1bmRlZmluZWQgYmV0dGVyIGJ1dCB3YW50IHRvIGhhdmUgdGhlIFxuICBsZXQgY3VyOkNoaWxkTm9kZXxudWxsPXNlbGVjdGVkXG4gIHdoaWxlKGN1ciE9bnVsbCl7XG4gICAgY3VyPWN1ci5wcmV2aW91c1NpYmxpbmdcbiAgICBpZiAoY3VyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpXG4gICAgICByZXR1cm4gY3VyXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cbmZ1bmN0aW9uIGdldF9uZXh0X3NlbGVjdGVkKHNlbGVjdGVkOkhUTUxFbGVtZW50KXtcbiAgaWYgKHNlbGVjdGVkPT1udWxsKVxuICAgIHJldHVybiBudWxsIC8vIGkgbGlrZSB1bmRlZmluZWQgYmV0dGVyIGJ1dCB3YW50IHRvIGhhdmUgdGhlIFxuICBsZXQgY3VyOkNoaWxkTm9kZXxudWxsPXNlbGVjdGVkXG4gIHdoaWxlKGN1ciE9bnVsbCl7XG4gICAgY3VyPWN1ci5uZXh0U2libGluZ1xuICAgIGlmIChjdXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcbiAgICAgIHJldHVybiBjdXJcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuLypmdW5jdGlvbiBpbmRleF9mb2xkZXIocm9vdDpUcmVlTm9kZSl7XG4gIGNvbnN0IGFuczpzMnQ8VHJlZU5vZGU+PXt9XG4gIGZ1bmN0aW9uIGYobm9kZTpUcmVlTm9kZSl7XG4gICAgYW5zW25vZGUuaWRdPW5vZGVcbiAgICBub2RlLmNoaWxkcmVuLmZvckVhY2goZilcbiAgfVxuICBmKHJvb3QpXG4gIHJldHVybiBhbnNcbn0qL1xuZnVuY3Rpb24gY2FsY19zdW1tYXJ5KG5vZGU6VHJlZU5vZGUpOnN0cmluZ3tcbiAgY29uc3QgaWdub3JlPVsnaWNvbl92ZXJzaW9uJywnaWNvbicsJ3RvZ2dsZXMnLCdjbGFzc05hbWUnXVxuICBmdW5jdGlvbiByZXBsYWNlcihrOnN0cmluZyx2OnVua25vd24pe1xuICAgIGlmIChpZ25vcmUuaW5jbHVkZXMoaykpXG4gICAgICByZXR1cm4gJydcbiAgICByZXR1cm4gdlxuICB9XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShub2RlLHJlcGxhY2VyLDIpLy9cdTI2QTAgRXJyb3IgKFRTMjc2OSlcbn1cbmV4cG9ydCBmdW5jdGlvbiBuZWVkX2Z1bGxfcmVuZGVyKHJvb3Q6VHJlZU5vZGUsb2xkX3Jvb3Q6VHJlZU5vZGV8dW5kZWZpbmVkKXtcbiAgaWYgKG9sZF9yb290PT1udWxsKVxuICAgIHJldHVybiB0cnVlXG4gIGNvbnN0IHN1bW1hcnk9Y2FsY19zdW1tYXJ5KHJvb3QpXG4gIGNvbnN0IG9sZF9zdW1tYXJ5PWNhbGNfc3VtbWFyeShvbGRfcm9vdClcbiAgcmV0dXJuIChvbGRfc3VtbWFyeSE9PXN1bW1hcnkpXG59XG5mdW5jdGlvbiBnZXRfY2hpbGRyZW4oc2VsZWN0ZWQ6SFRNTEVsZW1lbnQpe1xuICBpZiAoc2VsZWN0ZWQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjb2xsYXBzZWQnKSlcbiAgICByZXR1cm4gbnVsbFxuICBjb25zdCBhbnM9IHNlbGVjdGVkLnF1ZXJ5U2VsZWN0b3IoJy5jaGlsZHJlbicpLy9ieSB0aG9lcm5tIGlzIGFuIEhUTUxFbGVtZW50XG4gIGlmIChhbnMhPW51bGwpXG4gICAgcmV0dXJuIGFucyBhcyBIVE1MRWxlbWVudCBcblxufVxuZnVuY3Rpb24gZ2V0TGFzdEVsZW1lbnRDaGlsZChwYXJlbnQ6IEhUTUxFbGVtZW50KTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgLy8gSXRlcmF0ZSBiYWNrd2FyZHMgdGhyb3VnaCBjaGlsZCBub2Rlc1xuICBmb3IgKGxldCBpID0gcGFyZW50LmNoaWxkTm9kZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBjb25zdCBub2RlID0gcGFyZW50LmNoaWxkTm9kZXNbaV07XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gZ2V0Rmlyc3RFbGVtZW50Q2hpbGQocGFyZW50OiBIVE1MRWxlbWVudCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gIGZvciAobGV0IGkgPSAwO2k8cGFyZW50LmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBub2RlID0gcGFyZW50LmNoaWxkTm9kZXNbaV07XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gZ2V0X2xhc3RfdmlzaWJsZShzZWxlY3RlZDpIVE1MRWxlbWVudCl7XG4gIGNvbnN0IGNoaWxkcmVuX2Rpdj1nZXRfY2hpbGRyZW4oc2VsZWN0ZWQpXG4gIGlmIChjaGlsZHJlbl9kaXY9PW51bGwpXG4gICAgcmV0dXJuIHNlbGVjdGVkXG4gIGNvbnN0IGxhc3RfY2hpbGQ9Z2V0TGFzdEVsZW1lbnRDaGlsZChjaGlsZHJlbl9kaXYpXG4gIGlmIChsYXN0X2NoaWxkPT1udWxsKVxuICAgIHJldHVybiBzZWxlY3RlZFxuICByZXR1cm4gZ2V0X2xhc3RfdmlzaWJsZShsYXN0X2NoaWxkKVxufVxuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRfZm9yX3VwX2Fycm93KHNlbGVjdGVkOkhUTUxFbGVtZW50KXtcbiAgY29uc3QgYW5zPWdldF9wcmV2X3NlbGVjdGVkKHNlbGVjdGVkKVxuICBpZiAoYW5zPT1udWxsKVxuICAgIHJldHVybiBnZXRfcGFyZW50X2J5X2NsYXNzKHNlbGVjdGVkLnBhcmVudEVsZW1lbnQsJ3RyZWVfZm9sZGVyJylcbiAgcmV0dXJuIGdldF9sYXN0X3Zpc2libGUoYW5zKVxufVxuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRfZm9yX2Rvd25fYXJyb3coc2VsZWN0ZWQ6SFRNTEVsZW1lbnQpe1xuICBjb25zdCBjaGlsZHJlbl9kaXY9Z2V0X2NoaWxkcmVuKHNlbGVjdGVkKVxuICBpZiAoY2hpbGRyZW5fZGl2IT1udWxsKXtcbiAgICBjb25zdCBmaXJzdD1nZXRGaXJzdEVsZW1lbnRDaGlsZChjaGlsZHJlbl9kaXYpXG4gICAgaWYgKGZpcnN0IT09bnVsbClcbiAgICAgIHJldHVybiBmaXJzdFxuICB9XG4gIGNvbnN0IGFucz1nZXRfbmV4dF9zZWxlY3RlZChzZWxlY3RlZClcbiAgaWYgKGFucyE9bnVsbClcbiAgICByZXR1cm4gYW5zXG4gIGxldCBjdXI9c2VsZWN0ZWRcbiAgd2hpbGUodHJ1ZSl7XG4gICAgY29uc3QgcGFyZW50PWdldF9wYXJlbnRfYnlfY2xhc3MoY3VyLnBhcmVudEVsZW1lbnQsJ3RyZWVfZm9sZGVyJylcbiAgICBpZiAoIShwYXJlbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICByZXR1cm4gbnVsbFxuICAgIGNvbnN0IGFucz1nZXRfbmV4dF9zZWxlY3RlZChwYXJlbnQpXG4gICAgaWYgKGFucyE9bnVsbClcbiAgICAgIHJldHVybiBhbnNcbiAgICBjdXI9cGFyZW50XG4gIH1cbn0iLCAiaW1wb3J0ICB7IHR5cGUgczJzLHRvZ2dsZV9zZXR9IGZyb20gJ0B5aWdhbC9iYXNlX3R5cGVzJ1xuaW1wb3J0IHtnZXRfcGFyZW50X2J5X2NsYXNzLGNyZWF0ZV9lbGVtZW50LGRpdnMsdXBkYXRlX2NsYXNzX25hbWUsdXBkYXRlX2NoaWxkX2h0bWx9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuaW1wb3J0IHtcbiAgdHlwZSBUcmVlTm9kZSxcbiAgdHlwZSBUcmVlRGF0YVByb3ZpZGVyLFxuICBlbGVtZW50X2Zvcl91cF9hcnJvdyxcbiAgZWxlbWVudF9mb3JfZG93bl9hcnJvdyxcbiAgbmVlZF9mdWxsX3JlbmRlclxufWZyb20gJy4vdHJlZV9pbnRlcm5hbHMuanMnXG5leHBvcnQgdHlwZSB7VHJlZURhdGFQcm92aWRlcixUcmVlTm9kZX1cbmV4cG9ydCBjbGFzcyBUcmVlQ29udHJvbHtcbiAgLy9wcml2YXRlIHJvb3Q6dW5rbm93blxuICBwcml2YXRlIGNvbGxhcHNlZD1uZXcgU2V0PHN0cmluZz4oKVxuICBwcml2YXRlIHNlbGVjdGVkX2lkPScnXG4gIHByaXZhdGUgY29udmVydGVkOlRyZWVOb2RlfHVuZGVmaW5lZFxuICBwcml2YXRlIGNhbGNfbm9kZV9jbGFzcyhub2RlOlRyZWVOb2RlKXtcbiAgICBjb25zdCB7aWQsdHlwZSx0b2dnbGVzfT1ub2RlICAgIFxuICAgIGNvbnN0IGFucz1uZXcgU2V0PHN0cmluZz4oW2B0cmVlXyR7dHlwZX1gXSlcbiAgICBmb3IgKGNvbnN0IGsgb2YgdGhpcy5wcm92aWRlci50b2dnbGVfb3JkZXIpeyAvL2xlYXZpbmcgaXQgaGVyZSBiZWNhdXNlIGkgbXkgd2FudCB0byBjaGFuZ2UgdGhlIHN0eWxpbmcgb2YgdGhlIHRyZWUgbGluZSBiYXNlZCBvbiB3YXRjaCBzdGF0ZS4gYnV0IGNhbmNsZWQgdGhlIGNzcyB0aGF0IHN1cHBvcnRzIGl0XG4gICAgICBjb25zdCBjbHM9YCR7a31fJHt0b2dnbGVzW2tdfWBcbiAgICAgIGFucy5hZGQoY2xzKVxuICAgIH0gXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRfaWQ9PT1pZClcbiAgICAgIGFucy5hZGQoJ3NlbGVjdGVkJylcbiAgICBpZiAodGhpcy5jb2xsYXBzZWQuaGFzKGlkKSlcbiAgICAgIGFucy5hZGQoJ2NvbGxhcHNlZCcpXG4gICAgcmV0dXJuIFsuLi5hbnNdLmpvaW4oJyAnKVxuICB9XG4gIG9uX2ludGVydmFsKCl7XG4gICAgY29uc3QgZj0oYTpUcmVlTm9kZSk9PntcbiAgICAgIGNvbnN0IHtpZCxjaGlsZHJlbn09YVxuICAgICAgY29uc3QgbmV3X2NsYXNzPXRoaXMuY2FsY19ub2RlX2NsYXNzKGEpXG4gICAgICB1cGRhdGVfY2xhc3NfbmFtZSh0aGlzLnBhcmVudCxgIyR7aWR9YCxuZXdfY2xhc3MpXG4gICAgICBjaGlsZHJlbi5tYXAoZilcbiAgICB9XG4gICAgaWYgKHRoaXMuY29udmVydGVkKVxuICAgICAgZih0aGlzLmNvbnZlcnRlZClcbiAgICBmb3IgKGNvbnN0IHRvZ2dsZSBvZiAgdGhpcy5wcm92aWRlci50b2dnbGVfb3JkZXIpe1xuICAgICAgZm9yIChjb25zdCBzdGF0ZSBvZiBbdHJ1ZSxmYWxzZSx1bmRlZmluZWRdKXtcbiAgICAgICAgY29uc3Qgc2VsZWN0b3I9YC4ke3RvZ2dsZX1fJHtzdGF0ZX0+LmxhYmVsX3JvdyAjJHt0b2dnbGV9LnRvZ2dsZV9pY29uYFxuICAgICAgICBjb25zdCBpY29uX25hbWU9YCR7dG9nZ2xlfV8ke3N0YXRlfWBcbiAgICAgICAgdXBkYXRlX2NoaWxkX2h0bWwodGhpcy5wYXJlbnQsc2VsZWN0b3IsdGhpcy5pY29uc1tpY29uX25hbWVdPz8nJylcbiAgICAgIH1cbiAgICB9XG4gICAgLy91cGRhdGVfY2hpbGRfaHRtbCh0aGlzLnBhcmVudCxcIi5sYWJlbF9yb3cgLnRyZWVfY2hlY2tib3hcIixjaGVja19zdmcpXG4gICAgLy91cGRhdGVfY2hpbGRfaHRtbCh0aGlzLnBhcmVudCxcIi5jaGtfdW5jaGVja2VkPi5sYWJlbF9yb3cgLnRyZWVfY2hlY2tib3hcIiwnJylcbiAgfVxuICAvL2NvbGxhcHNlZF9zZXQ6U2V0PHN0cmluZz49bmV3IFNldCgpXG4gIHByaXZhdGUgY3JlYXRlX25vZGVfZWxlbWVudChub2RlOlRyZWVOb2RlLG1hcmdpbjpudW1iZXIscGFyZW50PzpIVE1MRWxlbWVudCl7XG4gICAgLy9jb25zdCB7aWNvbnN9PXRoaXNcbiAgICBjb25zdCB7dHlwZSxpZCxkZXNjcmlwdGlvbixsYWJlbCx0YWdzfT1ub2RlXG4gICAgY29uc3QgY2hpbGRyZW49KHR5cGU9PT0nZm9sZGVyJyk/YDxkaXYgY2xhc3M9Y2hpbGRyZW4+PC9kaXY+YDonJ1xuICAgIC8vY29uc3QgIGNvbW1hbmRzX2ljb25zPWNvbW1hbmRzLm1hcCh4PT5gPGRpdiBjbGFzcz1jb21tYW5kX2ljb24gaWQ9JHt4fT4ke2ljb25zW3hdfTwvZGl2PmApLmpvaW4oJycpXG4gICAgY29uc3Qgbm9kZV9jbGFzcz10aGlzLmNhbGNfbm9kZV9jbGFzcyhub2RlKVxuICAgIGNvbnN0IHZ0YWdzPXRhZ3MubWFwKHg9PmA8ZGl2IGNsYXNzPXRhZz4ke3h9PC9kaXY+YCkuam9pbignJylcbiAgICBjb25zdCBhbnM9IGNyZWF0ZV9lbGVtZW50KGAgXG4gIDxkaXYgIGNsYXNzPVwiJHtub2RlX2NsYXNzfVwiIGlkPVwiJHtpZH1cIiA+XG4gICAgPGRpdiAgY2xhc3M9XCJsYWJlbF9yb3dcIj5cbiAgICAgIDxkaXYgY2xhc3M9dG9nZ2xlc19pY29ucz48L2Rpdj5cbiAgICAgIDxkaXYgIGNsYXNzPXNoaWZ0ZXIgc3R5bGU9J21hcmdpbi1sZWZ0OiR7bWFyZ2lufXB4Jz5cbiAgICAgICAgPGRpdiBjbGFzcz1cImljb25cIj4gPC9kaXY+XG4gICAgICAgICR7ZGl2cyh7bGFiZWwsdnRhZ3MsZGVzY3JpcHRpb259KX1cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1jb21tYW5kc19pY29ucz48L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICAke2NoaWxkcmVufVxuICA8L2Rpdj5gLHBhcmVudCkgXG4gICAgcmV0dXJuIGFuc1xuICB9XG4gIC8vb25fc2VsZWN0ZWRfY2hhbmdlZDooYTpzdHJpbmcpPT5NYXliZVByb21pc2U8dm9pZD49KGE6c3RyaW5nKT0+dW5kZWZpbmVkXG4gIHByaXZhdGUgYXN5bmMgc2V0X3NlbGVjdGVkKGlkOnN0cmluZyl7XG4gICAgdGhpcy5zZWxlY3RlZF9pZD1pZFxuICAgIGF3YWl0IHRoaXMucHJvdmlkZXIuc2VsZWN0ZWQoaWQpXG4gIH1cblxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcGFyZW50OkhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgcHJvdmlkZXI6VHJlZURhdGFQcm92aWRlcixcbiAgICBwcml2YXRlIGljb25zOnMyc1xuICApe1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsKGV2dCk9PntcbiAgICAgIGlmICghKGV2dC50YXJnZXQgaW5zdGFuY2VvZiBFbGVtZW50KSlcbiAgICAgICAgcmV0dXJuXG4gICAgICBwYXJlbnQudGFiSW5kZXggPSAwO1xuICAgICAgcGFyZW50LmZvY3VzKCk7XG4gICAgICBjb25zdCBjbGlja2VkPWdldF9wYXJlbnRfYnlfY2xhc3MoZXZ0LnRhcmdldCwnbGFiZWxfcm93Jyk/LnBhcmVudEVsZW1lbnRcbiAgICAgIGlmIChjbGlja2VkPT1udWxsKVxuICAgICAgICByZXR1cm5cbiAgICAgIGNvbnN0IHtpZH09Y2xpY2tlZFxuICAgICAgaWYgKGNsaWNrZWQuY2xhc3NMaXN0LmNvbnRhaW5zKCd0cmVlX2ZvbGRlcicpKSAvL2lmIGNsaWNrZWQgY29tbWFuZCB0aGFuIGRvbiAgY2hhbmdlIGNvbGxwYXNlZCBzdGF0dXMgYmVjYXVzZSBkdWFsIGFjdGlvbiBpcyBhbm5vaW5nXG4gICAgICAgIHRvZ2dsZV9zZXQodGhpcy5jb2xsYXBzZWQsaWQpXG4gICAgICB2b2lkIHRoaXMuc2V0X3NlbGVjdGVkKGlkKVxuICAgIH0pXG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLChldnQpPT57XG4gICAgICBpZiAoIShldnQudGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuICAgICAgICByZXR1cm5cbiAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpOyAvLyBzdG9wcyBkZWZhdWx0IGJyb3dzZXIgYWN0aW9uXG4gICAgICBjb25zb2xlLmxvZyhldnQua2V5KVxuICAgICAgY29uc3Qgc2VsZWN0ZWQ9cGFyZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3RlZCcpXG4gICAgICBpZiAoIShzZWxlY3RlZCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSlcbiAgICAgICAgcmV0dXJuXG4gICAgICBzd2l0Y2goZXZ0LmtleSl7XG4gICAgICAgIGNhc2UgJ0Fycm93VXAnOntcbiAgICAgICAgICBjb25zdCBwcmV2PWVsZW1lbnRfZm9yX3VwX2Fycm93KHNlbGVjdGVkKVxuICAgICAgICAgIGlmICghIChwcmV2IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgdm9pZCB0aGlzLnNldF9zZWxlY3RlZChwcmV2LmlkKSAgICAgICAgIFxuICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdBcnJvd0Rvd24nOntcbiAgICAgICAgICBjb25zdCBwcmV2PWVsZW1lbnRfZm9yX2Rvd25fYXJyb3coc2VsZWN0ZWQpXG4gICAgICAgICAgaWYgKHByZXY9PW51bGwpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB2b2lkIHRoaXMuc2V0X3NlbGVjdGVkKHByZXYuaWQpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdBcnJvd1JpZ2h0JzpcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZC5kZWxldGUodGhpcy5zZWxlY3RlZF9pZClcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdBcnJvd0xlZnQnOlxuICAgICAgICAgIHRoaXMuY29sbGFwc2VkLmFkZCh0aGlzLnNlbGVjdGVkX2lkKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ0VudGVyJzogICAgICAgICAgXG4gICAgICAgIGNhc2UgJyAnOlxuICAgICAgICAgIHRvZ2dsZV9zZXQodGhpcy5jb2xsYXBzZWQsdGhpcy5zZWxlY3RlZF9pZClcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH0pICAgIFxuICB9XG4gIHByaXZhdGUgY3JlYXRlX25vZGUocGFyZW50OkhUTUxFbGVtZW50LG5vZGU6VHJlZU5vZGUsZGVwdGg6bnVtYmVyKXsgLy90b2RvOiBjb21wYXJlIHRvIGxhc3QgYnkgaWQgdG8gYWRkIGNoYW5nZSBhbmltYXRpb24/XG4gICAgY29uc3QgY2hpbGRyZW5fZWw9KCgpPT57XG4gICAgICBpZiAoZGVwdGg9PT0wKVxuICAgICAgICByZXR1cm4gY3JlYXRlX2VsZW1lbnQoJzxkaXYgY2xhc3M9Y2hpbGRyZW4+PC9kaXY+JyxwYXJlbnQpXG4gICAgICBjb25zdCBuZXdfcGFyZW50PXRoaXMuY3JlYXRlX25vZGVfZWxlbWVudChub2RlLGRlcHRoKjIwKzE2KzE2LHBhcmVudClcbiAgICAgIHJldHVybiBuZXdfcGFyZW50LnF1ZXJ5U2VsZWN0b3IoJy5jaGlsZHJlbicpIC8vcmV0dXJuIHZhbHVlIG1pZ2h0IGJlIG51bGwgZm9yIGl0ZW0gbm9kZSAgXG4gICAgfSkoKVxuICAgIGlmIChjaGlsZHJlbl9lbD09bnVsbCl7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgZm9yIChjb25zdCB4IG9mIG5vZGUuY2hpbGRyZW4pe1xuICAgICAgdGhpcy5jcmVhdGVfbm9kZShjaGlsZHJlbl9lbCBhcyBIVE1MRWxlbWVudCx4LGRlcHRoKzEpXG4gICAgfVxuICB9XG4gIHByaXZhdGUgYmlnX3JlbmRlcihjb252ZXJ0ZWQ6VHJlZU5vZGUpe1xuICAgIHRoaXMucGFyZW50LmlubmVySFRNTCA9ICcnO1xuICAgIHRoaXMuY3JlYXRlX25vZGUodGhpcy5wYXJlbnQsY29udmVydGVkLDApIC8vdG9kbyBwYXNzIHRoZSBsYXN0IGNvbnZlcnRlZCBzbyBjYW4gZG8gY2hhbmdlL2NhdGUgYW5pbWF0aW9uICAgIFxuICB9XG4gIG9uX2RhdGEoY29udmVydGVkOlRyZWVOb2RlKXtcbiAgICAvL2NvbnN0IGNvbnZlcnRlZD10aGlzLnByb3ZpZGVyLmNvbnZlcnQocm9vdClcbiAgICAvL3RoaXMucm9vdD1yb290XG4gICAgaWYgKG5lZWRfZnVsbF9yZW5kZXIoY29udmVydGVkLHRoaXMuY29udmVydGVkKSlcbiAgICAgIHRoaXMuYmlnX3JlbmRlcihjb252ZXJ0ZWQpXG4gICAgdGhpcy5jb252ZXJ0ZWQ9Y29udmVydGVkXG4gIH1cbn0iLCAiLy8gVGhpcyBmaWxlIHdhcyBnZW5lcmF0ZWQuIERvIG5vdCBtb2RpZnkgbWFudWFsbHkhXG52YXIgYXN0cmFsSWRlbnRpZmllckNvZGVzID0gWzUwOSwgMCwgMjI3LCAwLCAxNTAsIDQsIDI5NCwgOSwgMTM2OCwgMiwgMiwgMSwgNiwgMywgNDEsIDIsIDUsIDAsIDE2NiwgMSwgNTc0LCAzLCA5LCA5LCA3LCA5LCAzMiwgNCwgMzE4LCAxLCA3OCwgNSwgNzEsIDEwLCA1MCwgMywgMTIzLCAyLCA1NCwgMTQsIDMyLCAxMCwgMywgMSwgMTEsIDMsIDQ2LCAxMCwgOCwgMCwgNDYsIDksIDcsIDIsIDM3LCAxMywgMiwgOSwgNiwgMSwgNDUsIDAsIDEzLCAyLCA0OSwgMTMsIDksIDMsIDIsIDExLCA4MywgMTEsIDcsIDAsIDMsIDAsIDE1OCwgMTEsIDYsIDksIDcsIDMsIDU2LCAxLCAyLCA2LCAzLCAxLCAzLCAyLCAxMCwgMCwgMTEsIDEsIDMsIDYsIDQsIDQsIDY4LCA4LCAyLCAwLCAzLCAwLCAyLCAzLCAyLCA0LCAyLCAwLCAxNSwgMSwgODMsIDE3LCAxMCwgOSwgNSwgMCwgODIsIDE5LCAxMywgOSwgMjE0LCA2LCAzLCA4LCAyOCwgMSwgODMsIDE2LCAxNiwgOSwgODIsIDEyLCA5LCA5LCA3LCAxOSwgNTgsIDE0LCA1LCA5LCAyNDMsIDE0LCAxNjYsIDksIDcxLCA1LCAyLCAxLCAzLCAzLCAyLCAwLCAyLCAxLCAxMywgOSwgMTIwLCA2LCAzLCA2LCA0LCAwLCAyOSwgOSwgNDEsIDYsIDIsIDMsIDksIDAsIDEwLCAxMCwgNDcsIDE1LCAxOTksIDcsIDEzNywgOSwgNTQsIDcsIDIsIDcsIDE3LCA5LCA1NywgMjEsIDIsIDEzLCAxMjMsIDUsIDQsIDAsIDIsIDEsIDIsIDYsIDIsIDAsIDksIDksIDQ5LCA0LCAyLCAxLCAyLCA0LCA5LCA5LCA1NSwgOSwgMjY2LCAzLCAxMCwgMSwgMiwgMCwgNDksIDYsIDQsIDQsIDE0LCAxMCwgNTM1MCwgMCwgNywgMTQsIDExNDY1LCAyNywgMjM0MywgOSwgODcsIDksIDM5LCA0LCA2MCwgNiwgMjYsIDksIDUzNSwgOSwgNDcwLCAwLCAyLCA1NCwgOCwgMywgODIsIDAsIDEyLCAxLCAxOTYyOCwgMSwgNDE3OCwgOSwgNTE5LCA0NSwgMywgMjIsIDU0MywgNCwgNCwgNSwgOSwgNywgMywgNiwgMzEsIDMsIDE0OSwgMiwgMTQxOCwgNDksIDUxMywgNTQsIDUsIDQ5LCA5LCAwLCAxNSwgMCwgMjMsIDQsIDIsIDE0LCAxMzYxLCA2LCAyLCAxNiwgMywgNiwgMiwgMSwgMiwgNCwgMTAxLCAwLCAxNjEsIDYsIDEwLCA5LCAzNTcsIDAsIDYyLCAxMywgNDk5LCAxMywgMjQ1LCAxLCAyLCA5LCAyMzMsIDAsIDMsIDAsIDgsIDEsIDYsIDAsIDQ3NSwgNiwgMTEwLCA2LCA2LCA5LCA0NzU5LCA5LCA3ODc3MTksIDIzOV07XG5cbi8vIFRoaXMgZmlsZSB3YXMgZ2VuZXJhdGVkLiBEbyBub3QgbW9kaWZ5IG1hbnVhbGx5IVxudmFyIGFzdHJhbElkZW50aWZpZXJTdGFydENvZGVzID0gWzAsIDExLCAyLCAyNSwgMiwgMTgsIDIsIDEsIDIsIDE0LCAzLCAxMywgMzUsIDEyMiwgNzAsIDUyLCAyNjgsIDI4LCA0LCA0OCwgNDgsIDMxLCAxNCwgMjksIDYsIDM3LCAxMSwgMjksIDMsIDM1LCA1LCA3LCAyLCA0LCA0MywgMTU3LCAxOSwgMzUsIDUsIDM1LCA1LCAzOSwgOSwgNTEsIDEzLCAxMCwgMiwgMTQsIDIsIDYsIDIsIDEsIDIsIDEwLCAyLCAxNCwgMiwgNiwgMiwgMSwgNCwgNTEsIDEzLCAzMTAsIDEwLCAyMSwgMTEsIDcsIDI1LCA1LCAyLCA0MSwgMiwgOCwgNzAsIDUsIDMsIDAsIDIsIDQzLCAyLCAxLCA0LCAwLCAzLCAyMiwgMTEsIDIyLCAxMCwgMzAsIDY2LCAxOCwgMiwgMSwgMTEsIDIxLCAxMSwgMjUsIDcsIDI1LCAzOSwgNTUsIDcsIDEsIDY1LCAwLCAxNiwgMywgMiwgMiwgMiwgMjgsIDQzLCAyOCwgNCwgMjgsIDM2LCA3LCAyLCAyNywgMjgsIDUzLCAxMSwgMjEsIDExLCAxOCwgMTQsIDE3LCAxMTEsIDcyLCA1NiwgNTAsIDE0LCA1MCwgMTQsIDM1LCAzOSwgMjcsIDEwLCAyMiwgMjUxLCA0MSwgNywgMSwgMTcsIDUsIDU3LCAyOCwgMTEsIDAsIDksIDIxLCA0MywgMTcsIDQ3LCAyMCwgMjgsIDIyLCAxMywgNTIsIDU4LCAxLCAzLCAwLCAxNCwgNDQsIDMzLCAyNCwgMjcsIDM1LCAzMCwgMCwgMywgMCwgOSwgMzQsIDQsIDAsIDEzLCA0NywgMTUsIDMsIDIyLCAwLCAyLCAwLCAzNiwgMTcsIDIsIDI0LCAyMCwgMSwgNjQsIDYsIDIsIDAsIDIsIDMsIDIsIDE0LCAyLCA5LCA4LCA0NiwgMzksIDcsIDMsIDEsIDMsIDIxLCAyLCA2LCAyLCAxLCAyLCA0LCA0LCAwLCAxOSwgMCwgMTMsIDQsIDMxLCA5LCAyLCAwLCAzLCAwLCAyLCAzNywgMiwgMCwgMjYsIDAsIDIsIDAsIDQ1LCA1MiwgMTksIDMsIDIxLCAyLCAzMSwgNDcsIDIxLCAxLCAyLCAwLCAxODUsIDQ2LCA0MiwgMywgMzcsIDQ3LCAyMSwgMCwgNjAsIDQyLCAxNCwgMCwgNzIsIDI2LCAzOCwgNiwgMTg2LCA0MywgMTE3LCA2MywgMzIsIDcsIDMsIDAsIDMsIDcsIDIsIDEsIDIsIDIzLCAxNiwgMCwgMiwgMCwgOTUsIDcsIDMsIDM4LCAxNywgMCwgMiwgMCwgMjksIDAsIDExLCAzOSwgOCwgMCwgMjIsIDAsIDEyLCA0NSwgMjAsIDAsIDE5LCA3MiwgMjAwLCAzMiwgMzIsIDgsIDIsIDM2LCAxOCwgMCwgNTAsIDI5LCAxMTMsIDYsIDIsIDEsIDIsIDM3LCAyMiwgMCwgMjYsIDUsIDIsIDEsIDIsIDMxLCAxNSwgMCwgMjQsIDQzLCAyNjEsIDE4LCAxNiwgMCwgMiwgMTIsIDIsIDMzLCAxMjUsIDAsIDgwLCA5MjEsIDEwMywgMTEwLCAxOCwgMTk1LCAyNjM3LCA5NiwgMTYsIDEwNzEsIDE4LCA1LCAyNiwgMzk5NCwgNiwgNTgyLCA2ODQyLCAyOSwgMTc2MywgNTY4LCA4LCAzMCwgMTgsIDc4LCAxOCwgMjksIDE5LCA0NywgMTcsIDMsIDMyLCAyMCwgNiwgMTgsIDQzMywgNDQsIDIxMiwgNjMsIDMzLCAyNCwgMywgMjQsIDQ1LCA3NCwgNiwgMCwgNjcsIDEyLCA2NSwgMSwgMiwgMCwgMTUsIDQsIDEwLCA3MzgxLCA0MiwgMzEsIDk4LCAxMTQsIDg3MDIsIDMsIDIsIDYsIDIsIDEsIDIsIDI5MCwgMTYsIDAsIDMwLCAyLCAzLCAwLCAxNSwgMywgOSwgMzk1LCAyMzA5LCAxMDYsIDYsIDEyLCA0LCA4LCA4LCA5LCA1OTkxLCA4NCwgMiwgNzAsIDIsIDEsIDMsIDAsIDMsIDEsIDMsIDMsIDIsIDExLCAyLCAwLCAyLCA2LCAyLCA2NCwgMiwgMywgMywgNywgMiwgNiwgMiwgMjcsIDIsIDMsIDIsIDQsIDIsIDAsIDQsIDYsIDIsIDMzOSwgMywgMjQsIDIsIDI0LCAyLCAzMCwgMiwgMjQsIDIsIDMwLCAyLCAyNCwgMiwgMzAsIDIsIDI0LCAyLCAzMCwgMiwgMjQsIDIsIDcsIDE4NDUsIDMwLCA3LCA1LCAyNjIsIDYxLCAxNDcsIDQ0LCAxMSwgNiwgMTcsIDAsIDMyMiwgMjksIDE5LCA0MywgNDg1LCAyNywgMjI5LCAyOSwgMywgMCwgMjA4LCAzMCwgMiwgMiwgMiwgMSwgMiwgNiwgMywgNCwgMTAsIDEsIDIyNSwgNiwgMiwgMywgMiwgMSwgMiwgMTQsIDIsIDE5NiwgNjAsIDY3LCA4LCAwLCAxMjA1LCAzLCAyLCAyNiwgMiwgMSwgMiwgMCwgMywgMCwgMiwgOSwgMiwgMywgMiwgMCwgMiwgMCwgNywgMCwgNSwgMCwgMiwgMCwgMiwgMCwgMiwgMiwgMiwgMSwgMiwgMCwgMywgMCwgMiwgMCwgMiwgMCwgMiwgMCwgMiwgMCwgMiwgMSwgMiwgMCwgMywgMywgMiwgNiwgMiwgMywgMiwgMywgMiwgMCwgMiwgOSwgMiwgMTYsIDYsIDIsIDIsIDQsIDIsIDE2LCA0NDIxLCA0MjcxOSwgMzMsIDQzODEsIDMsIDU3NzMsIDMsIDc0NzIsIDE2LCA2MjEsIDI0NjcsIDU0MSwgMTUwNywgNDkzOCwgNiwgODQ4OV07XG5cbi8vIFRoaXMgZmlsZSB3YXMgZ2VuZXJhdGVkLiBEbyBub3QgbW9kaWZ5IG1hbnVhbGx5IVxudmFyIG5vbkFTQ0lJaWRlbnRpZmllckNoYXJzID0gXCJcXHUyMDBjXFx1MjAwZFxceGI3XFx1MDMwMC1cXHUwMzZmXFx1MDM4N1xcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2NGItXFx1MDY2OVxcdTA2NzBcXHUwNmQ2LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZTRcXHUwNmU3XFx1MDZlOFxcdTA2ZWEtXFx1MDZlZFxcdTA2ZjAtXFx1MDZmOVxcdTA3MTFcXHUwNzMwLVxcdTA3NGFcXHUwN2E2LVxcdTA3YjBcXHUwN2MwLVxcdTA3YzlcXHUwN2ViLVxcdTA3ZjNcXHUwN2ZkXFx1MDgxNi1cXHUwODE5XFx1MDgxYi1cXHUwODIzXFx1MDgyNS1cXHUwODI3XFx1MDgyOS1cXHUwODJkXFx1MDg1OS1cXHUwODViXFx1MDg5Ny1cXHUwODlmXFx1MDhjYS1cXHUwOGUxXFx1MDhlMy1cXHUwOTAzXFx1MDkzYS1cXHUwOTNjXFx1MDkzZS1cXHUwOTRmXFx1MDk1MS1cXHUwOTU3XFx1MDk2MlxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2RcXHUwOWQ3XFx1MDllMlxcdTA5ZTNcXHUwOWU2LVxcdTA5ZWZcXHUwOWZlXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMlxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYWZhLVxcdTBhZmZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU1LVxcdTBiNTdcXHUwYjYyXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiODJcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMC1cXHUwYzA0XFx1MGMzY1xcdTBjM2UtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM2MlxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgxLVxcdTBjODNcXHUwY2JjXFx1MGNiZS1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2UyXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBjZjNcXHUwZDAwLVxcdTBkMDNcXHUwZDNiXFx1MGQzY1xcdTBkM2UtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZFxcdTBkNTdcXHUwZDYyXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODEtXFx1MGQ4M1xcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRlNi1cXHUwZGVmXFx1MGRmMlxcdTBkZjNcXHUwZTMxXFx1MGUzNC1cXHUwZTNhXFx1MGU0Ny1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGViMVxcdTBlYjQtXFx1MGViY1xcdTBlYzgtXFx1MGVjZVxcdTBlZDAtXFx1MGVkOVxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGYzZVxcdTBmM2ZcXHUwZjcxLVxcdTBmODRcXHUwZjg2XFx1MGY4N1xcdTBmOGQtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDJiLVxcdTEwM2VcXHUxMDQwLVxcdTEwNDlcXHUxMDU2LVxcdTEwNTlcXHUxMDVlLVxcdTEwNjBcXHUxMDYyLVxcdTEwNjRcXHUxMDY3LVxcdTEwNmRcXHUxMDcxLVxcdTEwNzRcXHUxMDgyLVxcdTEwOGRcXHUxMDhmLVxcdTEwOWRcXHUxMzVkLVxcdTEzNWZcXHUxMzY5LVxcdTEzNzFcXHUxNzEyLVxcdTE3MTVcXHUxNzMyLVxcdTE3MzRcXHUxNzUyXFx1MTc1M1xcdTE3NzJcXHUxNzczXFx1MTdiNC1cXHUxN2QzXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MGYtXFx1MTgxOVxcdTE4YTlcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NGZcXHUxOWQwLVxcdTE5ZGFcXHUxYTE3LVxcdTFhMWJcXHUxYTU1LVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWIwLVxcdTFhYmRcXHUxYWJmLVxcdTFhZGRcXHUxYWUwLVxcdTFhZWJcXHUxYjAwLVxcdTFiMDRcXHUxYjM0LVxcdTFiNDRcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYjgwLVxcdTFiODJcXHUxYmExLVxcdTFiYWRcXHUxYmIwLVxcdTFiYjlcXHUxYmU2LVxcdTFiZjNcXHUxYzI0LVxcdTFjMzdcXHUxYzQwLVxcdTFjNDlcXHUxYzUwLVxcdTFjNTlcXHUxY2QwLVxcdTFjZDJcXHUxY2Q0LVxcdTFjZThcXHUxY2VkXFx1MWNmNFxcdTFjZjctXFx1MWNmOVxcdTFkYzAtXFx1MWRmZlxcdTIwMGNcXHUyMDBkXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjBkMC1cXHUyMGRjXFx1MjBlMVxcdTIwZTUtXFx1MjBmMFxcdTJjZWYtXFx1MmNmMVxcdTJkN2ZcXHUyZGUwLVxcdTJkZmZcXHUzMDJhLVxcdTMwMmZcXHUzMDk5XFx1MzA5YVxcdTMwZmJcXHVhNjIwLVxcdWE2MjlcXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZVxcdWE2OWZcXHVhNmYwXFx1YTZmMVxcdWE4MDJcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4MmNcXHVhODgwXFx1YTg4MVxcdWE4YjQtXFx1YThjNVxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmMVxcdWE4ZmYtXFx1YTkwOVxcdWE5MjYtXFx1YTkyZFxcdWE5NDctXFx1YTk1M1xcdWE5ODAtXFx1YTk4M1xcdWE5YjMtXFx1YTljMFxcdWE5ZDAtXFx1YTlkOVxcdWE5ZTVcXHVhOWYwLVxcdWE5ZjlcXHVhYTI5LVxcdWFhMzZcXHVhYTQzXFx1YWE0Y1xcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTdiLVxcdWFhN2RcXHVhYWIwXFx1YWFiMi1cXHVhYWI0XFx1YWFiN1xcdWFhYjhcXHVhYWJlXFx1YWFiZlxcdWFhYzFcXHVhYWViLVxcdWFhZWZcXHVhYWY1XFx1YWFmNlxcdWFiZTMtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1ZmIxZVxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyZlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmYxMC1cXHVmZjE5XFx1ZmYzZlxcdWZmNjVcIjtcblxuLy8gVGhpcyBmaWxlIHdhcyBnZW5lcmF0ZWQuIERvIG5vdCBtb2RpZnkgbWFudWFsbHkhXG52YXIgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyA9IFwiXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwODcwLVxcdTA4ODdcXHUwODg5LVxcdTA4OGZcXHUwOGEwLVxcdTA4YzlcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM1Y1xcdTBjNWRcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkYy1cXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDQtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4Ni1cXHUwZThhXFx1MGU4Yy1cXHUwZWEzXFx1MGVhNVxcdTBlYTctXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzExXFx1MTcxZi1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0Y1xcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzhhXFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YzXFx1MWNmNVxcdTFjZjZcXHUxY2ZhXFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJmXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGJmXFx1NGUwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3ZGNcXHVhN2YxLVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY5XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXCI7XG5cbi8vIFRoZXNlIGFyZSBhIHJ1bi1sZW5ndGggYW5kIG9mZnNldCBlbmNvZGVkIHJlcHJlc2VudGF0aW9uIG9mIHRoZVxuLy8gPjB4ZmZmZiBjb2RlIHBvaW50cyB0aGF0IGFyZSBhIHZhbGlkIHBhcnQgb2YgaWRlbnRpZmllcnMuIFRoZVxuLy8gb2Zmc2V0IHN0YXJ0cyBhdCAweDEwMDAwLCBhbmQgZWFjaCBwYWlyIG9mIG51bWJlcnMgcmVwcmVzZW50cyBhblxuLy8gb2Zmc2V0IHRvIHRoZSBuZXh0IHJhbmdlLCBhbmQgdGhlbiBhIHNpemUgb2YgdGhlIHJhbmdlLlxuXG4vLyBSZXNlcnZlZCB3b3JkIGxpc3RzIGZvciB2YXJpb3VzIGRpYWxlY3RzIG9mIHRoZSBsYW5ndWFnZVxuXG52YXIgcmVzZXJ2ZWRXb3JkcyA9IHtcbiAgMzogXCJhYnN0cmFjdCBib29sZWFuIGJ5dGUgY2hhciBjbGFzcyBkb3VibGUgZW51bSBleHBvcnQgZXh0ZW5kcyBmaW5hbCBmbG9hdCBnb3RvIGltcGxlbWVudHMgaW1wb3J0IGludCBpbnRlcmZhY2UgbG9uZyBuYXRpdmUgcGFja2FnZSBwcml2YXRlIHByb3RlY3RlZCBwdWJsaWMgc2hvcnQgc3RhdGljIHN1cGVyIHN5bmNocm9uaXplZCB0aHJvd3MgdHJhbnNpZW50IHZvbGF0aWxlXCIsXG4gIDU6IFwiY2xhc3MgZW51bSBleHRlbmRzIHN1cGVyIGNvbnN0IGV4cG9ydCBpbXBvcnRcIixcbiAgNjogXCJlbnVtXCIsXG4gIHN0cmljdDogXCJpbXBsZW1lbnRzIGludGVyZmFjZSBsZXQgcGFja2FnZSBwcml2YXRlIHByb3RlY3RlZCBwdWJsaWMgc3RhdGljIHlpZWxkXCIsXG4gIHN0cmljdEJpbmQ6IFwiZXZhbCBhcmd1bWVudHNcIlxufTtcblxuLy8gQW5kIHRoZSBrZXl3b3Jkc1xuXG52YXIgZWNtYTVBbmRMZXNzS2V5d29yZHMgPSBcImJyZWFrIGNhc2UgY2F0Y2ggY29udGludWUgZGVidWdnZXIgZGVmYXVsdCBkbyBlbHNlIGZpbmFsbHkgZm9yIGZ1bmN0aW9uIGlmIHJldHVybiBzd2l0Y2ggdGhyb3cgdHJ5IHZhciB3aGlsZSB3aXRoIG51bGwgdHJ1ZSBmYWxzZSBpbnN0YW5jZW9mIHR5cGVvZiB2b2lkIGRlbGV0ZSBuZXcgaW4gdGhpc1wiO1xuXG52YXIga2V5d29yZHMkMSA9IHtcbiAgNTogZWNtYTVBbmRMZXNzS2V5d29yZHMsXG4gIFwiNW1vZHVsZVwiOiBlY21hNUFuZExlc3NLZXl3b3JkcyArIFwiIGV4cG9ydCBpbXBvcnRcIixcbiAgNjogZWNtYTVBbmRMZXNzS2V5d29yZHMgKyBcIiBjb25zdCBjbGFzcyBleHRlbmRzIGV4cG9ydCBpbXBvcnQgc3VwZXJcIlxufTtcblxudmFyIGtleXdvcmRSZWxhdGlvbmFsT3BlcmF0b3IgPSAvXmluKHN0YW5jZW9mKT8kLztcblxuLy8gIyMgQ2hhcmFjdGVyIGNhdGVnb3JpZXNcblxudmFyIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0ID0gbmV3IFJlZ0V4cChcIltcIiArIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0Q2hhcnMgKyBcIl1cIik7XG52YXIgbm9uQVNDSUlpZGVudGlmaWVyID0gbmV3IFJlZ0V4cChcIltcIiArIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0Q2hhcnMgKyBub25BU0NJSWlkZW50aWZpZXJDaGFycyArIFwiXVwiKTtcblxuLy8gVGhpcyBoYXMgYSBjb21wbGV4aXR5IGxpbmVhciB0byB0aGUgdmFsdWUgb2YgdGhlIGNvZGUuIFRoZVxuLy8gYXNzdW1wdGlvbiBpcyB0aGF0IGxvb2tpbmcgdXAgYXN0cmFsIGlkZW50aWZpZXIgY2hhcmFjdGVycyBpc1xuLy8gcmFyZS5cbmZ1bmN0aW9uIGlzSW5Bc3RyYWxTZXQoY29kZSwgc2V0KSB7XG4gIHZhciBwb3MgPSAweDEwMDAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNldC5sZW5ndGg7IGkgKz0gMikge1xuICAgIHBvcyArPSBzZXRbaV07XG4gICAgaWYgKHBvcyA+IGNvZGUpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICBwb3MgKz0gc2V0W2kgKyAxXTtcbiAgICBpZiAocG9zID49IGNvZGUpIHsgcmV0dXJuIHRydWUgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG4vLyBUZXN0IHdoZXRoZXIgYSBnaXZlbiBjaGFyYWN0ZXIgY29kZSBzdGFydHMgYW4gaWRlbnRpZmllci5cblxuZnVuY3Rpb24gaXNJZGVudGlmaWVyU3RhcnQoY29kZSwgYXN0cmFsKSB7XG4gIGlmIChjb2RlIDwgNjUpIHsgcmV0dXJuIGNvZGUgPT09IDM2IH1cbiAgaWYgKGNvZGUgPCA5MSkgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmIChjb2RlIDwgOTcpIHsgcmV0dXJuIGNvZGUgPT09IDk1IH1cbiAgaWYgKGNvZGUgPCAxMjMpIHsgcmV0dXJuIHRydWUgfVxuICBpZiAoY29kZSA8PSAweGZmZmYpIHsgcmV0dXJuIGNvZGUgPj0gMHhhYSAmJiBub25BU0NJSWlkZW50aWZpZXJTdGFydC50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkpIH1cbiAgaWYgKGFzdHJhbCA9PT0gZmFsc2UpIHsgcmV0dXJuIGZhbHNlIH1cbiAgcmV0dXJuIGlzSW5Bc3RyYWxTZXQoY29kZSwgYXN0cmFsSWRlbnRpZmllclN0YXJ0Q29kZXMpXG59XG5cbi8vIFRlc3Qgd2hldGhlciBhIGdpdmVuIGNoYXJhY3RlciBpcyBwYXJ0IG9mIGFuIGlkZW50aWZpZXIuXG5cbmZ1bmN0aW9uIGlzSWRlbnRpZmllckNoYXIoY29kZSwgYXN0cmFsKSB7XG4gIGlmIChjb2RlIDwgNDgpIHsgcmV0dXJuIGNvZGUgPT09IDM2IH1cbiAgaWYgKGNvZGUgPCA1OCkgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmIChjb2RlIDwgNjUpIHsgcmV0dXJuIGZhbHNlIH1cbiAgaWYgKGNvZGUgPCA5MSkgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmIChjb2RlIDwgOTcpIHsgcmV0dXJuIGNvZGUgPT09IDk1IH1cbiAgaWYgKGNvZGUgPCAxMjMpIHsgcmV0dXJuIHRydWUgfVxuICBpZiAoY29kZSA8PSAweGZmZmYpIHsgcmV0dXJuIGNvZGUgPj0gMHhhYSAmJiBub25BU0NJSWlkZW50aWZpZXIudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpKSB9XG4gIGlmIChhc3RyYWwgPT09IGZhbHNlKSB7IHJldHVybiBmYWxzZSB9XG4gIHJldHVybiBpc0luQXN0cmFsU2V0KGNvZGUsIGFzdHJhbElkZW50aWZpZXJTdGFydENvZGVzKSB8fCBpc0luQXN0cmFsU2V0KGNvZGUsIGFzdHJhbElkZW50aWZpZXJDb2Rlcylcbn1cblxuLy8gIyMgVG9rZW4gdHlwZXNcblxuLy8gVGhlIGFzc2lnbm1lbnQgb2YgZmluZS1ncmFpbmVkLCBpbmZvcm1hdGlvbi1jYXJyeWluZyB0eXBlIG9iamVjdHNcbi8vIGFsbG93cyB0aGUgdG9rZW5pemVyIHRvIHN0b3JlIHRoZSBpbmZvcm1hdGlvbiBpdCBoYXMgYWJvdXQgYVxuLy8gdG9rZW4gaW4gYSB3YXkgdGhhdCBpcyB2ZXJ5IGNoZWFwIGZvciB0aGUgcGFyc2VyIHRvIGxvb2sgdXAuXG5cbi8vIEFsbCB0b2tlbiB0eXBlIHZhcmlhYmxlcyBzdGFydCB3aXRoIGFuIHVuZGVyc2NvcmUsIHRvIG1ha2UgdGhlbVxuLy8gZWFzeSB0byByZWNvZ25pemUuXG5cbi8vIFRoZSBgYmVmb3JlRXhwcmAgcHJvcGVydHkgaXMgdXNlZCB0byBkaXNhbWJpZ3VhdGUgYmV0d2VlbiByZWd1bGFyXG4vLyBleHByZXNzaW9ucyBhbmQgZGl2aXNpb25zLiBJdCBpcyBzZXQgb24gYWxsIHRva2VuIHR5cGVzIHRoYXQgY2FuXG4vLyBiZSBmb2xsb3dlZCBieSBhbiBleHByZXNzaW9uICh0aHVzLCBhIHNsYXNoIGFmdGVyIHRoZW0gd291bGQgYmUgYVxuLy8gcmVndWxhciBleHByZXNzaW9uKS5cbi8vXG4vLyBUaGUgYHN0YXJ0c0V4cHJgIHByb3BlcnR5IGlzIHVzZWQgdG8gY2hlY2sgaWYgdGhlIHRva2VuIGVuZHMgYVxuLy8gYHlpZWxkYCBleHByZXNzaW9uLiBJdCBpcyBzZXQgb24gYWxsIHRva2VuIHR5cGVzIHRoYXQgZWl0aGVyIGNhblxuLy8gZGlyZWN0bHkgc3RhcnQgYW4gZXhwcmVzc2lvbiAobGlrZSBhIHF1b3RhdGlvbiBtYXJrKSBvciBjYW5cbi8vIGNvbnRpbnVlIGFuIGV4cHJlc3Npb24gKGxpa2UgdGhlIGJvZHkgb2YgYSBzdHJpbmcpLlxuLy9cbi8vIGBpc0xvb3BgIG1hcmtzIGEga2V5d29yZCBhcyBzdGFydGluZyBhIGxvb3AsIHdoaWNoIGlzIGltcG9ydGFudFxuLy8gdG8ga25vdyB3aGVuIHBhcnNpbmcgYSBsYWJlbCwgaW4gb3JkZXIgdG8gYWxsb3cgb3IgZGlzYWxsb3dcbi8vIGNvbnRpbnVlIGp1bXBzIHRvIHRoYXQgbGFiZWwuXG5cbnZhciBUb2tlblR5cGUgPSBmdW5jdGlvbiBUb2tlblR5cGUobGFiZWwsIGNvbmYpIHtcbiAgaWYgKCBjb25mID09PSB2b2lkIDAgKSBjb25mID0ge307XG5cbiAgdGhpcy5sYWJlbCA9IGxhYmVsO1xuICB0aGlzLmtleXdvcmQgPSBjb25mLmtleXdvcmQ7XG4gIHRoaXMuYmVmb3JlRXhwciA9ICEhY29uZi5iZWZvcmVFeHByO1xuICB0aGlzLnN0YXJ0c0V4cHIgPSAhIWNvbmYuc3RhcnRzRXhwcjtcbiAgdGhpcy5pc0xvb3AgPSAhIWNvbmYuaXNMb29wO1xuICB0aGlzLmlzQXNzaWduID0gISFjb25mLmlzQXNzaWduO1xuICB0aGlzLnByZWZpeCA9ICEhY29uZi5wcmVmaXg7XG4gIHRoaXMucG9zdGZpeCA9ICEhY29uZi5wb3N0Zml4O1xuICB0aGlzLmJpbm9wID0gY29uZi5iaW5vcCB8fCBudWxsO1xuICB0aGlzLnVwZGF0ZUNvbnRleHQgPSBudWxsO1xufTtcblxuZnVuY3Rpb24gYmlub3AobmFtZSwgcHJlYykge1xuICByZXR1cm4gbmV3IFRva2VuVHlwZShuYW1lLCB7YmVmb3JlRXhwcjogdHJ1ZSwgYmlub3A6IHByZWN9KVxufVxudmFyIGJlZm9yZUV4cHIgPSB7YmVmb3JlRXhwcjogdHJ1ZX0sIHN0YXJ0c0V4cHIgPSB7c3RhcnRzRXhwcjogdHJ1ZX07XG5cbi8vIE1hcCBrZXl3b3JkIG5hbWVzIHRvIHRva2VuIHR5cGVzLlxuXG52YXIga2V5d29yZHMgPSB7fTtcblxuLy8gU3VjY2luY3QgZGVmaW5pdGlvbnMgb2Yga2V5d29yZCB0b2tlbiB0eXBlc1xuZnVuY3Rpb24ga3cobmFtZSwgb3B0aW9ucykge1xuICBpZiAoIG9wdGlvbnMgPT09IHZvaWQgMCApIG9wdGlvbnMgPSB7fTtcblxuICBvcHRpb25zLmtleXdvcmQgPSBuYW1lO1xuICByZXR1cm4ga2V5d29yZHNbbmFtZV0gPSBuZXcgVG9rZW5UeXBlKG5hbWUsIG9wdGlvbnMpXG59XG5cbnZhciB0eXBlcyQxID0ge1xuICBudW06IG5ldyBUb2tlblR5cGUoXCJudW1cIiwgc3RhcnRzRXhwciksXG4gIHJlZ2V4cDogbmV3IFRva2VuVHlwZShcInJlZ2V4cFwiLCBzdGFydHNFeHByKSxcbiAgc3RyaW5nOiBuZXcgVG9rZW5UeXBlKFwic3RyaW5nXCIsIHN0YXJ0c0V4cHIpLFxuICBuYW1lOiBuZXcgVG9rZW5UeXBlKFwibmFtZVwiLCBzdGFydHNFeHByKSxcbiAgcHJpdmF0ZUlkOiBuZXcgVG9rZW5UeXBlKFwicHJpdmF0ZUlkXCIsIHN0YXJ0c0V4cHIpLFxuICBlb2Y6IG5ldyBUb2tlblR5cGUoXCJlb2ZcIiksXG5cbiAgLy8gUHVuY3R1YXRpb24gdG9rZW4gdHlwZXMuXG4gIGJyYWNrZXRMOiBuZXcgVG9rZW5UeXBlKFwiW1wiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBicmFja2V0UjogbmV3IFRva2VuVHlwZShcIl1cIiksXG4gIGJyYWNlTDogbmV3IFRva2VuVHlwZShcIntcIiwge2JlZm9yZUV4cHI6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgYnJhY2VSOiBuZXcgVG9rZW5UeXBlKFwifVwiKSxcbiAgcGFyZW5MOiBuZXcgVG9rZW5UeXBlKFwiKFwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBwYXJlblI6IG5ldyBUb2tlblR5cGUoXCIpXCIpLFxuICBjb21tYTogbmV3IFRva2VuVHlwZShcIixcIiwgYmVmb3JlRXhwciksXG4gIHNlbWk6IG5ldyBUb2tlblR5cGUoXCI7XCIsIGJlZm9yZUV4cHIpLFxuICBjb2xvbjogbmV3IFRva2VuVHlwZShcIjpcIiwgYmVmb3JlRXhwciksXG4gIGRvdDogbmV3IFRva2VuVHlwZShcIi5cIiksXG4gIHF1ZXN0aW9uOiBuZXcgVG9rZW5UeXBlKFwiP1wiLCBiZWZvcmVFeHByKSxcbiAgcXVlc3Rpb25Eb3Q6IG5ldyBUb2tlblR5cGUoXCI/LlwiKSxcbiAgYXJyb3c6IG5ldyBUb2tlblR5cGUoXCI9PlwiLCBiZWZvcmVFeHByKSxcbiAgdGVtcGxhdGU6IG5ldyBUb2tlblR5cGUoXCJ0ZW1wbGF0ZVwiKSxcbiAgaW52YWxpZFRlbXBsYXRlOiBuZXcgVG9rZW5UeXBlKFwiaW52YWxpZFRlbXBsYXRlXCIpLFxuICBlbGxpcHNpczogbmV3IFRva2VuVHlwZShcIi4uLlwiLCBiZWZvcmVFeHByKSxcbiAgYmFja1F1b3RlOiBuZXcgVG9rZW5UeXBlKFwiYFwiLCBzdGFydHNFeHByKSxcbiAgZG9sbGFyQnJhY2VMOiBuZXcgVG9rZW5UeXBlKFwiJHtcIiwge2JlZm9yZUV4cHI6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcblxuICAvLyBPcGVyYXRvcnMuIFRoZXNlIGNhcnJ5IHNldmVyYWwga2luZHMgb2YgcHJvcGVydGllcyB0byBoZWxwIHRoZVxuICAvLyBwYXJzZXIgdXNlIHRoZW0gcHJvcGVybHkgKHRoZSBwcmVzZW5jZSBvZiB0aGVzZSBwcm9wZXJ0aWVzIGlzXG4gIC8vIHdoYXQgY2F0ZWdvcml6ZXMgdGhlbSBhcyBvcGVyYXRvcnMpLlxuICAvL1xuICAvLyBgYmlub3BgLCB3aGVuIHByZXNlbnQsIHNwZWNpZmllcyB0aGF0IHRoaXMgb3BlcmF0b3IgaXMgYSBiaW5hcnlcbiAgLy8gb3BlcmF0b3IsIGFuZCB3aWxsIHJlZmVyIHRvIGl0cyBwcmVjZWRlbmNlLlxuICAvL1xuICAvLyBgcHJlZml4YCBhbmQgYHBvc3RmaXhgIG1hcmsgdGhlIG9wZXJhdG9yIGFzIGEgcHJlZml4IG9yIHBvc3RmaXhcbiAgLy8gdW5hcnkgb3BlcmF0b3IuXG4gIC8vXG4gIC8vIGBpc0Fzc2lnbmAgbWFya3MgYWxsIG9mIGA9YCwgYCs9YCwgYC09YCBldGNldGVyYSwgd2hpY2ggYWN0IGFzXG4gIC8vIGJpbmFyeSBvcGVyYXRvcnMgd2l0aCBhIHZlcnkgbG93IHByZWNlZGVuY2UsIHRoYXQgc2hvdWxkIHJlc3VsdFxuICAvLyBpbiBBc3NpZ25tZW50RXhwcmVzc2lvbiBub2Rlcy5cblxuICBlcTogbmV3IFRva2VuVHlwZShcIj1cIiwge2JlZm9yZUV4cHI6IHRydWUsIGlzQXNzaWduOiB0cnVlfSksXG4gIGFzc2lnbjogbmV3IFRva2VuVHlwZShcIl89XCIsIHtiZWZvcmVFeHByOiB0cnVlLCBpc0Fzc2lnbjogdHJ1ZX0pLFxuICBpbmNEZWM6IG5ldyBUb2tlblR5cGUoXCIrKy8tLVwiLCB7cHJlZml4OiB0cnVlLCBwb3N0Zml4OiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIHByZWZpeDogbmV3IFRva2VuVHlwZShcIiEvflwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgcHJlZml4OiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIGxvZ2ljYWxPUjogYmlub3AoXCJ8fFwiLCAxKSxcbiAgbG9naWNhbEFORDogYmlub3AoXCImJlwiLCAyKSxcbiAgYml0d2lzZU9SOiBiaW5vcChcInxcIiwgMyksXG4gIGJpdHdpc2VYT1I6IGJpbm9wKFwiXlwiLCA0KSxcbiAgYml0d2lzZUFORDogYmlub3AoXCImXCIsIDUpLFxuICBlcXVhbGl0eTogYmlub3AoXCI9PS8hPS89PT0vIT09XCIsIDYpLFxuICByZWxhdGlvbmFsOiBiaW5vcChcIjwvPi88PS8+PVwiLCA3KSxcbiAgYml0U2hpZnQ6IGJpbm9wKFwiPDwvPj4vPj4+XCIsIDgpLFxuICBwbHVzTWluOiBuZXcgVG9rZW5UeXBlKFwiKy8tXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBiaW5vcDogOSwgcHJlZml4OiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIG1vZHVsbzogYmlub3AoXCIlXCIsIDEwKSxcbiAgc3RhcjogYmlub3AoXCIqXCIsIDEwKSxcbiAgc2xhc2g6IGJpbm9wKFwiL1wiLCAxMCksXG4gIHN0YXJzdGFyOiBuZXcgVG9rZW5UeXBlKFwiKipcIiwge2JlZm9yZUV4cHI6IHRydWV9KSxcbiAgY29hbGVzY2U6IGJpbm9wKFwiPz9cIiwgMSksXG5cbiAgLy8gS2V5d29yZCB0b2tlbiB0eXBlcy5cbiAgX2JyZWFrOiBrdyhcImJyZWFrXCIpLFxuICBfY2FzZToga3coXCJjYXNlXCIsIGJlZm9yZUV4cHIpLFxuICBfY2F0Y2g6IGt3KFwiY2F0Y2hcIiksXG4gIF9jb250aW51ZToga3coXCJjb250aW51ZVwiKSxcbiAgX2RlYnVnZ2VyOiBrdyhcImRlYnVnZ2VyXCIpLFxuICBfZGVmYXVsdDoga3coXCJkZWZhdWx0XCIsIGJlZm9yZUV4cHIpLFxuICBfZG86IGt3KFwiZG9cIiwge2lzTG9vcDogdHJ1ZSwgYmVmb3JlRXhwcjogdHJ1ZX0pLFxuICBfZWxzZToga3coXCJlbHNlXCIsIGJlZm9yZUV4cHIpLFxuICBfZmluYWxseToga3coXCJmaW5hbGx5XCIpLFxuICBfZm9yOiBrdyhcImZvclwiLCB7aXNMb29wOiB0cnVlfSksXG4gIF9mdW5jdGlvbjoga3coXCJmdW5jdGlvblwiLCBzdGFydHNFeHByKSxcbiAgX2lmOiBrdyhcImlmXCIpLFxuICBfcmV0dXJuOiBrdyhcInJldHVyblwiLCBiZWZvcmVFeHByKSxcbiAgX3N3aXRjaDoga3coXCJzd2l0Y2hcIiksXG4gIF90aHJvdzoga3coXCJ0aHJvd1wiLCBiZWZvcmVFeHByKSxcbiAgX3RyeToga3coXCJ0cnlcIiksXG4gIF92YXI6IGt3KFwidmFyXCIpLFxuICBfY29uc3Q6IGt3KFwiY29uc3RcIiksXG4gIF93aGlsZToga3coXCJ3aGlsZVwiLCB7aXNMb29wOiB0cnVlfSksXG4gIF93aXRoOiBrdyhcIndpdGhcIiksXG4gIF9uZXc6IGt3KFwibmV3XCIsIHtiZWZvcmVFeHByOiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIF90aGlzOiBrdyhcInRoaXNcIiwgc3RhcnRzRXhwciksXG4gIF9zdXBlcjoga3coXCJzdXBlclwiLCBzdGFydHNFeHByKSxcbiAgX2NsYXNzOiBrdyhcImNsYXNzXCIsIHN0YXJ0c0V4cHIpLFxuICBfZXh0ZW5kczoga3coXCJleHRlbmRzXCIsIGJlZm9yZUV4cHIpLFxuICBfZXhwb3J0OiBrdyhcImV4cG9ydFwiKSxcbiAgX2ltcG9ydDoga3coXCJpbXBvcnRcIiwgc3RhcnRzRXhwciksXG4gIF9udWxsOiBrdyhcIm51bGxcIiwgc3RhcnRzRXhwciksXG4gIF90cnVlOiBrdyhcInRydWVcIiwgc3RhcnRzRXhwciksXG4gIF9mYWxzZToga3coXCJmYWxzZVwiLCBzdGFydHNFeHByKSxcbiAgX2luOiBrdyhcImluXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBiaW5vcDogN30pLFxuICBfaW5zdGFuY2VvZjoga3coXCJpbnN0YW5jZW9mXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBiaW5vcDogN30pLFxuICBfdHlwZW9mOiBrdyhcInR5cGVvZlwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgcHJlZml4OiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIF92b2lkOiBrdyhcInZvaWRcIiwge2JlZm9yZUV4cHI6IHRydWUsIHByZWZpeDogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBfZGVsZXRlOiBrdyhcImRlbGV0ZVwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgcHJlZml4OiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSlcbn07XG5cbi8vIE1hdGNoZXMgYSB3aG9sZSBsaW5lIGJyZWFrICh3aGVyZSBDUkxGIGlzIGNvbnNpZGVyZWQgYSBzaW5nbGVcbi8vIGxpbmUgYnJlYWspLiBVc2VkIHRvIGNvdW50IGxpbmVzLlxuXG52YXIgbGluZUJyZWFrID0gL1xcclxcbj98XFxufFxcdTIwMjh8XFx1MjAyOS87XG52YXIgbGluZUJyZWFrRyA9IG5ldyBSZWdFeHAobGluZUJyZWFrLnNvdXJjZSwgXCJnXCIpO1xuXG5mdW5jdGlvbiBpc05ld0xpbmUoY29kZSkge1xuICByZXR1cm4gY29kZSA9PT0gMTAgfHwgY29kZSA9PT0gMTMgfHwgY29kZSA9PT0gMHgyMDI4IHx8IGNvZGUgPT09IDB4MjAyOVxufVxuXG5mdW5jdGlvbiBuZXh0TGluZUJyZWFrKGNvZGUsIGZyb20sIGVuZCkge1xuICBpZiAoIGVuZCA9PT0gdm9pZCAwICkgZW5kID0gY29kZS5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IGZyb207IGkgPCBlbmQ7IGkrKykge1xuICAgIHZhciBuZXh0ID0gY29kZS5jaGFyQ29kZUF0KGkpO1xuICAgIGlmIChpc05ld0xpbmUobmV4dCkpXG4gICAgICB7IHJldHVybiBpIDwgZW5kIC0gMSAmJiBuZXh0ID09PSAxMyAmJiBjb2RlLmNoYXJDb2RlQXQoaSArIDEpID09PSAxMCA/IGkgKyAyIDogaSArIDEgfVxuICB9XG4gIHJldHVybiAtMVxufVxuXG52YXIgbm9uQVNDSUl3aGl0ZXNwYWNlID0gL1tcXHUxNjgwXFx1MjAwMC1cXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0vO1xuXG52YXIgc2tpcFdoaXRlU3BhY2UgPSAvKD86XFxzfFxcL1xcLy4qfFxcL1xcKlteXSo/XFwqXFwvKSovZztcblxudmFyIHJlZiA9IE9iamVjdC5wcm90b3R5cGU7XG52YXIgaGFzT3duUHJvcGVydHkgPSByZWYuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSByZWYudG9TdHJpbmc7XG5cbnZhciBoYXNPd24gPSBPYmplY3QuaGFzT3duIHx8IChmdW5jdGlvbiAob2JqLCBwcm9wTmFtZSkgeyByZXR1cm4gKFxuICBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcE5hbWUpXG4pOyB9KTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IChmdW5jdGlvbiAob2JqKSB7IHJldHVybiAoXG4gIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiXG4pOyB9KTtcblxudmFyIHJlZ2V4cENhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuZnVuY3Rpb24gd29yZHNSZWdleHAod29yZHMpIHtcbiAgcmV0dXJuIHJlZ2V4cENhY2hlW3dvcmRzXSB8fCAocmVnZXhwQ2FjaGVbd29yZHNdID0gbmV3IFJlZ0V4cChcIl4oPzpcIiArIHdvcmRzLnJlcGxhY2UoLyAvZywgXCJ8XCIpICsgXCIpJFwiKSlcbn1cblxuZnVuY3Rpb24gY29kZVBvaW50VG9TdHJpbmcoY29kZSkge1xuICAvLyBVVEYtMTYgRGVjb2RpbmdcbiAgaWYgKGNvZGUgPD0gMHhGRkZGKSB7IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpIH1cbiAgY29kZSAtPSAweDEwMDAwO1xuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgoY29kZSA+PiAxMCkgKyAweEQ4MDAsIChjb2RlICYgMTAyMykgKyAweERDMDApXG59XG5cbnZhciBsb25lU3Vycm9nYXRlID0gLyg/OltcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKS87XG5cbi8vIFRoZXNlIGFyZSB1c2VkIHdoZW4gYG9wdGlvbnMubG9jYXRpb25zYCBpcyBvbiwgZm9yIHRoZVxuLy8gYHN0YXJ0TG9jYCBhbmQgYGVuZExvY2AgcHJvcGVydGllcy5cblxudmFyIFBvc2l0aW9uID0gZnVuY3Rpb24gUG9zaXRpb24obGluZSwgY29sKSB7XG4gIHRoaXMubGluZSA9IGxpbmU7XG4gIHRoaXMuY29sdW1uID0gY29sO1xufTtcblxuUG9zaXRpb24ucHJvdG90eXBlLm9mZnNldCA9IGZ1bmN0aW9uIG9mZnNldCAobikge1xuICByZXR1cm4gbmV3IFBvc2l0aW9uKHRoaXMubGluZSwgdGhpcy5jb2x1bW4gKyBuKVxufTtcblxudmFyIFNvdXJjZUxvY2F0aW9uID0gZnVuY3Rpb24gU291cmNlTG9jYXRpb24ocCwgc3RhcnQsIGVuZCkge1xuICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gIHRoaXMuZW5kID0gZW5kO1xuICBpZiAocC5zb3VyY2VGaWxlICE9PSBudWxsKSB7IHRoaXMuc291cmNlID0gcC5zb3VyY2VGaWxlOyB9XG59O1xuXG4vLyBUaGUgYGdldExpbmVJbmZvYCBmdW5jdGlvbiBpcyBtb3N0bHkgdXNlZnVsIHdoZW4gdGhlXG4vLyBgbG9jYXRpb25zYCBvcHRpb24gaXMgb2ZmIChmb3IgcGVyZm9ybWFuY2UgcmVhc29ucykgYW5kIHlvdVxuLy8gd2FudCB0byBmaW5kIHRoZSBsaW5lL2NvbHVtbiBwb3NpdGlvbiBmb3IgYSBnaXZlbiBjaGFyYWN0ZXJcbi8vIG9mZnNldC4gYGlucHV0YCBzaG91bGQgYmUgdGhlIGNvZGUgc3RyaW5nIHRoYXQgdGhlIG9mZnNldCByZWZlcnNcbi8vIGludG8uXG5cbmZ1bmN0aW9uIGdldExpbmVJbmZvKGlucHV0LCBvZmZzZXQpIHtcbiAgZm9yICh2YXIgbGluZSA9IDEsIGN1ciA9IDA7Oykge1xuICAgIHZhciBuZXh0QnJlYWsgPSBuZXh0TGluZUJyZWFrKGlucHV0LCBjdXIsIG9mZnNldCk7XG4gICAgaWYgKG5leHRCcmVhayA8IDApIHsgcmV0dXJuIG5ldyBQb3NpdGlvbihsaW5lLCBvZmZzZXQgLSBjdXIpIH1cbiAgICArK2xpbmU7XG4gICAgY3VyID0gbmV4dEJyZWFrO1xuICB9XG59XG5cbi8vIEEgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgZ2l2ZW4gdG8gY29uZmlndXJlIHRoZSBwYXJzZXIgcHJvY2Vzcy5cbi8vIFRoZXNlIG9wdGlvbnMgYXJlIHJlY29nbml6ZWQgKG9ubHkgYGVjbWFWZXJzaW9uYCBpcyByZXF1aXJlZCk6XG5cbnZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgLy8gYGVjbWFWZXJzaW9uYCBpbmRpY2F0ZXMgdGhlIEVDTUFTY3JpcHQgdmVyc2lvbiB0byBwYXJzZS4gTXVzdCBiZVxuICAvLyBlaXRoZXIgMywgNSwgNiAob3IgMjAxNSksIDcgKDIwMTYpLCA4ICgyMDE3KSwgOSAoMjAxOCksIDEwXG4gIC8vICgyMDE5KSwgMTEgKDIwMjApLCAxMiAoMjAyMSksIDEzICgyMDIyKSwgMTQgKDIwMjMpLCBvciBgXCJsYXRlc3RcImBcbiAgLy8gKHRoZSBsYXRlc3QgdmVyc2lvbiB0aGUgbGlicmFyeSBzdXBwb3J0cykuIFRoaXMgaW5mbHVlbmNlc1xuICAvLyBzdXBwb3J0IGZvciBzdHJpY3QgbW9kZSwgdGhlIHNldCBvZiByZXNlcnZlZCB3b3JkcywgYW5kIHN1cHBvcnRcbiAgLy8gZm9yIG5ldyBzeW50YXggZmVhdHVyZXMuXG4gIGVjbWFWZXJzaW9uOiBudWxsLFxuICAvLyBgc291cmNlVHlwZWAgaW5kaWNhdGVzIHRoZSBtb2RlIHRoZSBjb2RlIHNob3VsZCBiZSBwYXJzZWQgaW4uXG4gIC8vIENhbiBiZSBlaXRoZXIgYFwic2NyaXB0XCJgLCBgXCJtb2R1bGVcImAgb3IgYFwiY29tbW9uanNcImAuIFRoaXMgaW5mbHVlbmNlcyBnbG9iYWxcbiAgLy8gc3RyaWN0IG1vZGUgYW5kIHBhcnNpbmcgb2YgYGltcG9ydGAgYW5kIGBleHBvcnRgIGRlY2xhcmF0aW9ucy5cbiAgc291cmNlVHlwZTogXCJzY3JpcHRcIixcbiAgLy8gYG9uSW5zZXJ0ZWRTZW1pY29sb25gIGNhbiBiZSBhIGNhbGxiYWNrIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2hlblxuICAvLyBhIHNlbWljb2xvbiBpcyBhdXRvbWF0aWNhbGx5IGluc2VydGVkLiBJdCB3aWxsIGJlIHBhc3NlZCB0aGVcbiAgLy8gcG9zaXRpb24gb2YgdGhlIGluc2VydGVkIHNlbWljb2xvbiBhcyBhbiBvZmZzZXQsIGFuZCBpZlxuICAvLyBgbG9jYXRpb25zYCBpcyBlbmFibGVkLCBpdCBpcyBnaXZlbiB0aGUgbG9jYXRpb24gYXMgYSBge2xpbmUsXG4gIC8vIGNvbHVtbn1gIG9iamVjdCBhcyBzZWNvbmQgYXJndW1lbnQuXG4gIG9uSW5zZXJ0ZWRTZW1pY29sb246IG51bGwsXG4gIC8vIGBvblRyYWlsaW5nQ29tbWFgIGlzIHNpbWlsYXIgdG8gYG9uSW5zZXJ0ZWRTZW1pY29sb25gLCBidXQgZm9yXG4gIC8vIHRyYWlsaW5nIGNvbW1hcy5cbiAgb25UcmFpbGluZ0NvbW1hOiBudWxsLFxuICAvLyBCeSBkZWZhdWx0LCByZXNlcnZlZCB3b3JkcyBhcmUgb25seSBlbmZvcmNlZCBpZiBlY21hVmVyc2lvbiA+PSA1LlxuICAvLyBTZXQgYGFsbG93UmVzZXJ2ZWRgIHRvIGEgYm9vbGVhbiB2YWx1ZSB0byBleHBsaWNpdGx5IHR1cm4gdGhpcyBvblxuICAvLyBhbiBvZmYuIFdoZW4gdGhpcyBvcHRpb24gaGFzIHRoZSB2YWx1ZSBcIm5ldmVyXCIsIHJlc2VydmVkIHdvcmRzXG4gIC8vIGFuZCBrZXl3b3JkcyBjYW4gYWxzbyBub3QgYmUgdXNlZCBhcyBwcm9wZXJ0eSBuYW1lcy5cbiAgYWxsb3dSZXNlcnZlZDogbnVsbCxcbiAgLy8gV2hlbiBlbmFibGVkLCBhIHJldHVybiBhdCB0aGUgdG9wIGxldmVsIGlzIG5vdCBjb25zaWRlcmVkIGFuXG4gIC8vIGVycm9yLlxuICBhbGxvd1JldHVybk91dHNpZGVGdW5jdGlvbjogZmFsc2UsXG4gIC8vIFdoZW4gZW5hYmxlZCwgaW1wb3J0L2V4cG9ydCBzdGF0ZW1lbnRzIGFyZSBub3QgY29uc3RyYWluZWQgdG9cbiAgLy8gYXBwZWFyaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHByb2dyYW0sIGFuZCBhbiBpbXBvcnQubWV0YSBleHByZXNzaW9uXG4gIC8vIGluIGEgc2NyaXB0IGlzbid0IGNvbnNpZGVyZWQgYW4gZXJyb3IuXG4gIGFsbG93SW1wb3J0RXhwb3J0RXZlcnl3aGVyZTogZmFsc2UsXG4gIC8vIEJ5IGRlZmF1bHQsIGF3YWl0IGlkZW50aWZpZXJzIGFyZSBhbGxvd2VkIHRvIGFwcGVhciBhdCB0aGUgdG9wLWxldmVsIHNjb3BlIG9ubHkgaWYgZWNtYVZlcnNpb24gPj0gMjAyMi5cbiAgLy8gV2hlbiBlbmFibGVkLCBhd2FpdCBpZGVudGlmaWVycyBhcmUgYWxsb3dlZCB0byBhcHBlYXIgYXQgdGhlIHRvcC1sZXZlbCBzY29wZSxcbiAgLy8gYnV0IHRoZXkgYXJlIHN0aWxsIG5vdCBhbGxvd2VkIGluIG5vbi1hc3luYyBmdW5jdGlvbnMuXG4gIGFsbG93QXdhaXRPdXRzaWRlRnVuY3Rpb246IG51bGwsXG4gIC8vIFdoZW4gZW5hYmxlZCwgc3VwZXIgaWRlbnRpZmllcnMgYXJlIG5vdCBjb25zdHJhaW5lZCB0b1xuICAvLyBhcHBlYXJpbmcgaW4gbWV0aG9kcyBhbmQgZG8gbm90IHJhaXNlIGFuIGVycm9yIHdoZW4gdGhleSBhcHBlYXIgZWxzZXdoZXJlLlxuICBhbGxvd1N1cGVyT3V0c2lkZU1ldGhvZDogbnVsbCxcbiAgLy8gV2hlbiBlbmFibGVkLCBoYXNoYmFuZyBkaXJlY3RpdmUgaW4gdGhlIGJlZ2lubmluZyBvZiBmaWxlIGlzXG4gIC8vIGFsbG93ZWQgYW5kIHRyZWF0ZWQgYXMgYSBsaW5lIGNvbW1lbnQuIEVuYWJsZWQgYnkgZGVmYXVsdCB3aGVuXG4gIC8vIGBlY21hVmVyc2lvbmAgPj0gMjAyMy5cbiAgYWxsb3dIYXNoQmFuZzogZmFsc2UsXG4gIC8vIEJ5IGRlZmF1bHQsIHRoZSBwYXJzZXIgd2lsbCB2ZXJpZnkgdGhhdCBwcml2YXRlIHByb3BlcnRpZXMgYXJlXG4gIC8vIG9ubHkgdXNlZCBpbiBwbGFjZXMgd2hlcmUgdGhleSBhcmUgdmFsaWQgYW5kIGhhdmUgYmVlbiBkZWNsYXJlZC5cbiAgLy8gU2V0IHRoaXMgdG8gZmFsc2UgdG8gdHVybiBzdWNoIGNoZWNrcyBvZmYuXG4gIGNoZWNrUHJpdmF0ZUZpZWxkczogdHJ1ZSxcbiAgLy8gV2hlbiBgbG9jYXRpb25zYCBpcyBvbiwgYGxvY2AgcHJvcGVydGllcyBob2xkaW5nIG9iamVjdHMgd2l0aFxuICAvLyBgc3RhcnRgIGFuZCBgZW5kYCBwcm9wZXJ0aWVzIGluIGB7bGluZSwgY29sdW1ufWAgZm9ybSAod2l0aFxuICAvLyBsaW5lIGJlaW5nIDEtYmFzZWQgYW5kIGNvbHVtbiAwLWJhc2VkKSB3aWxsIGJlIGF0dGFjaGVkIHRvIHRoZVxuICAvLyBub2Rlcy5cbiAgbG9jYXRpb25zOiBmYWxzZSxcbiAgLy8gQSBmdW5jdGlvbiBjYW4gYmUgcGFzc2VkIGFzIGBvblRva2VuYCBvcHRpb24sIHdoaWNoIHdpbGxcbiAgLy8gY2F1c2UgQWNvcm4gdG8gY2FsbCB0aGF0IGZ1bmN0aW9uIHdpdGggb2JqZWN0IGluIHRoZSBzYW1lXG4gIC8vIGZvcm1hdCBhcyB0b2tlbnMgcmV0dXJuZWQgZnJvbSBgdG9rZW5pemVyKCkuZ2V0VG9rZW4oKWAuIE5vdGVcbiAgLy8gdGhhdCB5b3UgYXJlIG5vdCBhbGxvd2VkIHRvIGNhbGwgdGhlIHBhcnNlciBmcm9tIHRoZVxuICAvLyBjYWxsYmFja1x1MjAxNHRoYXQgd2lsbCBjb3JydXB0IGl0cyBpbnRlcm5hbCBzdGF0ZS5cbiAgb25Ub2tlbjogbnVsbCxcbiAgLy8gQSBmdW5jdGlvbiBjYW4gYmUgcGFzc2VkIGFzIGBvbkNvbW1lbnRgIG9wdGlvbiwgd2hpY2ggd2lsbFxuICAvLyBjYXVzZSBBY29ybiB0byBjYWxsIHRoYXQgZnVuY3Rpb24gd2l0aCBgKGJsb2NrLCB0ZXh0LCBzdGFydCxcbiAgLy8gZW5kKWAgcGFyYW1ldGVycyB3aGVuZXZlciBhIGNvbW1lbnQgaXMgc2tpcHBlZC4gYGJsb2NrYCBpcyBhXG4gIC8vIGJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRoaXMgaXMgYSBibG9jayAoYC8qICovYCkgY29tbWVudCxcbiAgLy8gYHRleHRgIGlzIHRoZSBjb250ZW50IG9mIHRoZSBjb21tZW50LCBhbmQgYHN0YXJ0YCBhbmQgYGVuZGAgYXJlXG4gIC8vIGNoYXJhY3RlciBvZmZzZXRzIHRoYXQgZGVub3RlIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBjb21tZW50LlxuICAvLyBXaGVuIHRoZSBgbG9jYXRpb25zYCBvcHRpb24gaXMgb24sIHR3byBtb3JlIHBhcmFtZXRlcnMgYXJlXG4gIC8vIHBhc3NlZCwgdGhlIGZ1bGwgYHtsaW5lLCBjb2x1bW59YCBsb2NhdGlvbnMgb2YgdGhlIHN0YXJ0IGFuZFxuICAvLyBlbmQgb2YgdGhlIGNvbW1lbnRzLiBOb3RlIHRoYXQgeW91IGFyZSBub3QgYWxsb3dlZCB0byBjYWxsIHRoZVxuICAvLyBwYXJzZXIgZnJvbSB0aGUgY2FsbGJhY2tcdTIwMTR0aGF0IHdpbGwgY29ycnVwdCBpdHMgaW50ZXJuYWwgc3RhdGUuXG4gIC8vIFdoZW4gdGhpcyBvcHRpb24gaGFzIGFuIGFycmF5IGFzIHZhbHVlLCBvYmplY3RzIHJlcHJlc2VudGluZyB0aGVcbiAgLy8gY29tbWVudHMgYXJlIHB1c2hlZCB0byBpdC5cbiAgb25Db21tZW50OiBudWxsLFxuICAvLyBOb2RlcyBoYXZlIHRoZWlyIHN0YXJ0IGFuZCBlbmQgY2hhcmFjdGVycyBvZmZzZXRzIHJlY29yZGVkIGluXG4gIC8vIGBzdGFydGAgYW5kIGBlbmRgIHByb3BlcnRpZXMgKGRpcmVjdGx5IG9uIHRoZSBub2RlLCByYXRoZXIgdGhhblxuICAvLyB0aGUgYGxvY2Agb2JqZWN0LCB3aGljaCBob2xkcyBsaW5lL2NvbHVtbiBkYXRhLiBUbyBhbHNvIGFkZCBhXG4gIC8vIFtzZW1pLXN0YW5kYXJkaXplZF1bcmFuZ2VdIGByYW5nZWAgcHJvcGVydHkgaG9sZGluZyBhIGBbc3RhcnQsXG4gIC8vIGVuZF1gIGFycmF5IHdpdGggdGhlIHNhbWUgbnVtYmVycywgc2V0IHRoZSBgcmFuZ2VzYCBvcHRpb24gdG9cbiAgLy8gYHRydWVgLlxuICAvL1xuICAvLyBbcmFuZ2VdOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD03NDU2NzhcbiAgcmFuZ2VzOiBmYWxzZSxcbiAgLy8gSXQgaXMgcG9zc2libGUgdG8gcGFyc2UgbXVsdGlwbGUgZmlsZXMgaW50byBhIHNpbmdsZSBBU1QgYnlcbiAgLy8gcGFzc2luZyB0aGUgdHJlZSBwcm9kdWNlZCBieSBwYXJzaW5nIHRoZSBmaXJzdCBmaWxlIGFzXG4gIC8vIGBwcm9ncmFtYCBvcHRpb24gaW4gc3Vic2VxdWVudCBwYXJzZXMuIFRoaXMgd2lsbCBhZGQgdGhlXG4gIC8vIHRvcGxldmVsIGZvcm1zIG9mIHRoZSBwYXJzZWQgZmlsZSB0byB0aGUgYFByb2dyYW1gICh0b3ApIG5vZGVcbiAgLy8gb2YgYW4gZXhpc3RpbmcgcGFyc2UgdHJlZS5cbiAgcHJvZ3JhbTogbnVsbCxcbiAgLy8gV2hlbiBgbG9jYXRpb25zYCBpcyBvbiwgeW91IGNhbiBwYXNzIHRoaXMgdG8gcmVjb3JkIHRoZSBzb3VyY2VcbiAgLy8gZmlsZSBpbiBldmVyeSBub2RlJ3MgYGxvY2Agb2JqZWN0LlxuICBzb3VyY2VGaWxlOiBudWxsLFxuICAvLyBUaGlzIHZhbHVlLCBpZiBnaXZlbiwgaXMgc3RvcmVkIGluIGV2ZXJ5IG5vZGUsIHdoZXRoZXJcbiAgLy8gYGxvY2F0aW9uc2AgaXMgb24gb3Igb2ZmLlxuICBkaXJlY3RTb3VyY2VGaWxlOiBudWxsLFxuICAvLyBXaGVuIGVuYWJsZWQsIHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvbnMgYXJlIHJlcHJlc2VudGVkIGJ5XG4gIC8vIChub24tc3RhbmRhcmQpIFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uIG5vZGVzXG4gIHByZXNlcnZlUGFyZW5zOiBmYWxzZVxufTtcblxuLy8gSW50ZXJwcmV0IGFuZCBkZWZhdWx0IGFuIG9wdGlvbnMgb2JqZWN0XG5cbnZhciB3YXJuZWRBYm91dEVjbWFWZXJzaW9uID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGdldE9wdGlvbnMob3B0cykge1xuICB2YXIgb3B0aW9ucyA9IHt9O1xuXG4gIGZvciAodmFyIG9wdCBpbiBkZWZhdWx0T3B0aW9ucylcbiAgICB7IG9wdGlvbnNbb3B0XSA9IG9wdHMgJiYgaGFzT3duKG9wdHMsIG9wdCkgPyBvcHRzW29wdF0gOiBkZWZhdWx0T3B0aW9uc1tvcHRdOyB9XG5cbiAgaWYgKG9wdGlvbnMuZWNtYVZlcnNpb24gPT09IFwibGF0ZXN0XCIpIHtcbiAgICBvcHRpb25zLmVjbWFWZXJzaW9uID0gMWU4O1xuICB9IGVsc2UgaWYgKG9wdGlvbnMuZWNtYVZlcnNpb24gPT0gbnVsbCkge1xuICAgIGlmICghd2FybmVkQWJvdXRFY21hVmVyc2lvbiAmJiB0eXBlb2YgY29uc29sZSA9PT0gXCJvYmplY3RcIiAmJiBjb25zb2xlLndhcm4pIHtcbiAgICAgIHdhcm5lZEFib3V0RWNtYVZlcnNpb24gPSB0cnVlO1xuICAgICAgY29uc29sZS53YXJuKFwiU2luY2UgQWNvcm4gOC4wLjAsIG9wdGlvbnMuZWNtYVZlcnNpb24gaXMgcmVxdWlyZWQuXFxuRGVmYXVsdGluZyB0byAyMDIwLCBidXQgdGhpcyB3aWxsIHN0b3Agd29ya2luZyBpbiB0aGUgZnV0dXJlLlwiKTtcbiAgICB9XG4gICAgb3B0aW9ucy5lY21hVmVyc2lvbiA9IDExO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMjAxNSkge1xuICAgIG9wdGlvbnMuZWNtYVZlcnNpb24gLT0gMjAwOTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmFsbG93UmVzZXJ2ZWQgPT0gbnVsbClcbiAgICB7IG9wdGlvbnMuYWxsb3dSZXNlcnZlZCA9IG9wdGlvbnMuZWNtYVZlcnNpb24gPCA1OyB9XG5cbiAgaWYgKCFvcHRzIHx8IG9wdHMuYWxsb3dIYXNoQmFuZyA9PSBudWxsKVxuICAgIHsgb3B0aW9ucy5hbGxvd0hhc2hCYW5nID0gb3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNDsgfVxuXG4gIGlmIChpc0FycmF5KG9wdGlvbnMub25Ub2tlbikpIHtcbiAgICB2YXIgdG9rZW5zID0gb3B0aW9ucy5vblRva2VuO1xuICAgIG9wdGlvbnMub25Ub2tlbiA9IGZ1bmN0aW9uICh0b2tlbikgeyByZXR1cm4gdG9rZW5zLnB1c2godG9rZW4pOyB9O1xuICB9XG4gIGlmIChpc0FycmF5KG9wdGlvbnMub25Db21tZW50KSlcbiAgICB7IG9wdGlvbnMub25Db21tZW50ID0gcHVzaENvbW1lbnQob3B0aW9ucywgb3B0aW9ucy5vbkNvbW1lbnQpOyB9XG5cbiAgaWYgKG9wdGlvbnMuc291cmNlVHlwZSA9PT0gXCJjb21tb25qc1wiICYmIG9wdGlvbnMuYWxsb3dBd2FpdE91dHNpZGVGdW5jdGlvbilcbiAgICB7IHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCB1c2UgYWxsb3dBd2FpdE91dHNpZGVGdW5jdGlvbiB3aXRoIHNvdXJjZVR5cGU6IGNvbW1vbmpzXCIpIH1cblxuICByZXR1cm4gb3B0aW9uc1xufVxuXG5mdW5jdGlvbiBwdXNoQ29tbWVudChvcHRpb25zLCBhcnJheSkge1xuICByZXR1cm4gZnVuY3Rpb24oYmxvY2ssIHRleHQsIHN0YXJ0LCBlbmQsIHN0YXJ0TG9jLCBlbmRMb2MpIHtcbiAgICB2YXIgY29tbWVudCA9IHtcbiAgICAgIHR5cGU6IGJsb2NrID8gXCJCbG9ja1wiIDogXCJMaW5lXCIsXG4gICAgICB2YWx1ZTogdGV4dCxcbiAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgIGVuZDogZW5kXG4gICAgfTtcbiAgICBpZiAob3B0aW9ucy5sb2NhdGlvbnMpXG4gICAgICB7IGNvbW1lbnQubG9jID0gbmV3IFNvdXJjZUxvY2F0aW9uKHRoaXMsIHN0YXJ0TG9jLCBlbmRMb2MpOyB9XG4gICAgaWYgKG9wdGlvbnMucmFuZ2VzKVxuICAgICAgeyBjb21tZW50LnJhbmdlID0gW3N0YXJ0LCBlbmRdOyB9XG4gICAgYXJyYXkucHVzaChjb21tZW50KTtcbiAgfVxufVxuXG4vLyBFYWNoIHNjb3BlIGdldHMgYSBiaXRzZXQgdGhhdCBtYXkgY29udGFpbiB0aGVzZSBmbGFnc1xudmFyXG4gICAgU0NPUEVfVE9QID0gMSxcbiAgICBTQ09QRV9GVU5DVElPTiA9IDIsXG4gICAgU0NPUEVfQVNZTkMgPSA0LFxuICAgIFNDT1BFX0dFTkVSQVRPUiA9IDgsXG4gICAgU0NPUEVfQVJST1cgPSAxNixcbiAgICBTQ09QRV9TSU1QTEVfQ0FUQ0ggPSAzMixcbiAgICBTQ09QRV9TVVBFUiA9IDY0LFxuICAgIFNDT1BFX0RJUkVDVF9TVVBFUiA9IDEyOCxcbiAgICBTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0sgPSAyNTYsXG4gICAgU0NPUEVfQ0xBU1NfRklFTERfSU5JVCA9IDUxMixcbiAgICBTQ09QRV9TV0lUQ0ggPSAxMDI0LFxuICAgIFNDT1BFX1ZBUiA9IFNDT1BFX1RPUCB8IFNDT1BFX0ZVTkNUSU9OIHwgU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLO1xuXG5mdW5jdGlvbiBmdW5jdGlvbkZsYWdzKGFzeW5jLCBnZW5lcmF0b3IpIHtcbiAgcmV0dXJuIFNDT1BFX0ZVTkNUSU9OIHwgKGFzeW5jID8gU0NPUEVfQVNZTkMgOiAwKSB8IChnZW5lcmF0b3IgPyBTQ09QRV9HRU5FUkFUT1IgOiAwKVxufVxuXG4vLyBVc2VkIGluIGNoZWNrTFZhbCogYW5kIGRlY2xhcmVOYW1lIHRvIGRldGVybWluZSB0aGUgdHlwZSBvZiBhIGJpbmRpbmdcbnZhclxuICAgIEJJTkRfTk9ORSA9IDAsIC8vIE5vdCBhIGJpbmRpbmdcbiAgICBCSU5EX1ZBUiA9IDEsIC8vIFZhci1zdHlsZSBiaW5kaW5nXG4gICAgQklORF9MRVhJQ0FMID0gMiwgLy8gTGV0LSBvciBjb25zdC1zdHlsZSBiaW5kaW5nXG4gICAgQklORF9GVU5DVElPTiA9IDMsIC8vIEZ1bmN0aW9uIGRlY2xhcmF0aW9uXG4gICAgQklORF9TSU1QTEVfQ0FUQ0ggPSA0LCAvLyBTaW1wbGUgKGlkZW50aWZpZXIgcGF0dGVybikgY2F0Y2ggYmluZGluZ1xuICAgIEJJTkRfT1VUU0lERSA9IDU7IC8vIFNwZWNpYWwgY2FzZSBmb3IgZnVuY3Rpb24gbmFtZXMgYXMgYm91bmQgaW5zaWRlIHRoZSBmdW5jdGlvblxuXG52YXIgUGFyc2VyID0gZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMsIGlucHV0LCBzdGFydFBvcykge1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zID0gZ2V0T3B0aW9ucyhvcHRpb25zKTtcbiAgdGhpcy5zb3VyY2VGaWxlID0gb3B0aW9ucy5zb3VyY2VGaWxlO1xuICB0aGlzLmtleXdvcmRzID0gd29yZHNSZWdleHAoa2V5d29yZHMkMVtvcHRpb25zLmVjbWFWZXJzaW9uID49IDYgPyA2IDogb3B0aW9ucy5zb3VyY2VUeXBlID09PSBcIm1vZHVsZVwiID8gXCI1bW9kdWxlXCIgOiA1XSk7XG4gIHZhciByZXNlcnZlZCA9IFwiXCI7XG4gIGlmIChvcHRpb25zLmFsbG93UmVzZXJ2ZWQgIT09IHRydWUpIHtcbiAgICByZXNlcnZlZCA9IHJlc2VydmVkV29yZHNbb3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ID8gNiA6IG9wdGlvbnMuZWNtYVZlcnNpb24gPT09IDUgPyA1IDogM107XG4gICAgaWYgKG9wdGlvbnMuc291cmNlVHlwZSA9PT0gXCJtb2R1bGVcIikgeyByZXNlcnZlZCArPSBcIiBhd2FpdFwiOyB9XG4gIH1cbiAgdGhpcy5yZXNlcnZlZFdvcmRzID0gd29yZHNSZWdleHAocmVzZXJ2ZWQpO1xuICB2YXIgcmVzZXJ2ZWRTdHJpY3QgPSAocmVzZXJ2ZWQgPyByZXNlcnZlZCArIFwiIFwiIDogXCJcIikgKyByZXNlcnZlZFdvcmRzLnN0cmljdDtcbiAgdGhpcy5yZXNlcnZlZFdvcmRzU3RyaWN0ID0gd29yZHNSZWdleHAocmVzZXJ2ZWRTdHJpY3QpO1xuICB0aGlzLnJlc2VydmVkV29yZHNTdHJpY3RCaW5kID0gd29yZHNSZWdleHAocmVzZXJ2ZWRTdHJpY3QgKyBcIiBcIiArIHJlc2VydmVkV29yZHMuc3RyaWN0QmluZCk7XG4gIHRoaXMuaW5wdXQgPSBTdHJpbmcoaW5wdXQpO1xuXG4gIC8vIFVzZWQgdG8gc2lnbmFsIHRvIGNhbGxlcnMgb2YgYHJlYWRXb3JkMWAgd2hldGhlciB0aGUgd29yZFxuICAvLyBjb250YWluZWQgYW55IGVzY2FwZSBzZXF1ZW5jZXMuIFRoaXMgaXMgbmVlZGVkIGJlY2F1c2Ugd29yZHMgd2l0aFxuICAvLyBlc2NhcGUgc2VxdWVuY2VzIG11c3Qgbm90IGJlIGludGVycHJldGVkIGFzIGtleXdvcmRzLlxuICB0aGlzLmNvbnRhaW5zRXNjID0gZmFsc2U7XG5cbiAgLy8gU2V0IHVwIHRva2VuIHN0YXRlXG5cbiAgLy8gVGhlIGN1cnJlbnQgcG9zaXRpb24gb2YgdGhlIHRva2VuaXplciBpbiB0aGUgaW5wdXQuXG4gIGlmIChzdGFydFBvcykge1xuICAgIHRoaXMucG9zID0gc3RhcnRQb3M7XG4gICAgdGhpcy5saW5lU3RhcnQgPSB0aGlzLmlucHV0Lmxhc3RJbmRleE9mKFwiXFxuXCIsIHN0YXJ0UG9zIC0gMSkgKyAxO1xuICAgIHRoaXMuY3VyTGluZSA9IHRoaXMuaW5wdXQuc2xpY2UoMCwgdGhpcy5saW5lU3RhcnQpLnNwbGl0KGxpbmVCcmVhaykubGVuZ3RoO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucG9zID0gdGhpcy5saW5lU3RhcnQgPSAwO1xuICAgIHRoaXMuY3VyTGluZSA9IDE7XG4gIH1cblxuICAvLyBQcm9wZXJ0aWVzIG9mIHRoZSBjdXJyZW50IHRva2VuOlxuICAvLyBJdHMgdHlwZVxuICB0aGlzLnR5cGUgPSB0eXBlcyQxLmVvZjtcbiAgLy8gRm9yIHRva2VucyB0aGF0IGluY2x1ZGUgbW9yZSBpbmZvcm1hdGlvbiB0aGFuIHRoZWlyIHR5cGUsIHRoZSB2YWx1ZVxuICB0aGlzLnZhbHVlID0gbnVsbDtcbiAgLy8gSXRzIHN0YXJ0IGFuZCBlbmQgb2Zmc2V0XG4gIHRoaXMuc3RhcnQgPSB0aGlzLmVuZCA9IHRoaXMucG9zO1xuICAvLyBBbmQsIGlmIGxvY2F0aW9ucyBhcmUgdXNlZCwgdGhlIHtsaW5lLCBjb2x1bW59IG9iamVjdFxuICAvLyBjb3JyZXNwb25kaW5nIHRvIHRob3NlIG9mZnNldHNcbiAgdGhpcy5zdGFydExvYyA9IHRoaXMuZW5kTG9jID0gdGhpcy5jdXJQb3NpdGlvbigpO1xuXG4gIC8vIFBvc2l0aW9uIGluZm9ybWF0aW9uIGZvciB0aGUgcHJldmlvdXMgdG9rZW5cbiAgdGhpcy5sYXN0VG9rRW5kTG9jID0gdGhpcy5sYXN0VG9rU3RhcnRMb2MgPSBudWxsO1xuICB0aGlzLmxhc3RUb2tTdGFydCA9IHRoaXMubGFzdFRva0VuZCA9IHRoaXMucG9zO1xuXG4gIC8vIFRoZSBjb250ZXh0IHN0YWNrIGlzIHVzZWQgdG8gc3VwZXJmaWNpYWxseSB0cmFjayBzeW50YWN0aWNcbiAgLy8gY29udGV4dCB0byBwcmVkaWN0IHdoZXRoZXIgYSByZWd1bGFyIGV4cHJlc3Npb24gaXMgYWxsb3dlZCBpbiBhXG4gIC8vIGdpdmVuIHBvc2l0aW9uLlxuICB0aGlzLmNvbnRleHQgPSB0aGlzLmluaXRpYWxDb250ZXh0KCk7XG4gIHRoaXMuZXhwckFsbG93ZWQgPSB0cnVlO1xuXG4gIC8vIEZpZ3VyZSBvdXQgaWYgaXQncyBhIG1vZHVsZSBjb2RlLlxuICB0aGlzLmluTW9kdWxlID0gb3B0aW9ucy5zb3VyY2VUeXBlID09PSBcIm1vZHVsZVwiO1xuICB0aGlzLnN0cmljdCA9IHRoaXMuaW5Nb2R1bGUgfHwgdGhpcy5zdHJpY3REaXJlY3RpdmUodGhpcy5wb3MpO1xuXG4gIC8vIFVzZWQgdG8gc2lnbmlmeSB0aGUgc3RhcnQgb2YgYSBwb3RlbnRpYWwgYXJyb3cgZnVuY3Rpb25cbiAgdGhpcy5wb3RlbnRpYWxBcnJvd0F0ID0gLTE7XG4gIHRoaXMucG90ZW50aWFsQXJyb3dJbkZvckF3YWl0ID0gZmFsc2U7XG5cbiAgLy8gUG9zaXRpb25zIHRvIGRlbGF5ZWQtY2hlY2sgdGhhdCB5aWVsZC9hd2FpdCBkb2VzIG5vdCBleGlzdCBpbiBkZWZhdWx0IHBhcmFtZXRlcnMuXG4gIHRoaXMueWllbGRQb3MgPSB0aGlzLmF3YWl0UG9zID0gdGhpcy5hd2FpdElkZW50UG9zID0gMDtcbiAgLy8gTGFiZWxzIGluIHNjb3BlLlxuICB0aGlzLmxhYmVscyA9IFtdO1xuICAvLyBUaHVzLWZhciB1bmRlZmluZWQgZXhwb3J0cy5cbiAgdGhpcy51bmRlZmluZWRFeHBvcnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvLyBJZiBlbmFibGVkLCBza2lwIGxlYWRpbmcgaGFzaGJhbmcgbGluZS5cbiAgaWYgKHRoaXMucG9zID09PSAwICYmIG9wdGlvbnMuYWxsb3dIYXNoQmFuZyAmJiB0aGlzLmlucHV0LnNsaWNlKDAsIDIpID09PSBcIiMhXCIpXG4gICAgeyB0aGlzLnNraXBMaW5lQ29tbWVudCgyKTsgfVxuXG4gIC8vIFNjb3BlIHRyYWNraW5nIGZvciBkdXBsaWNhdGUgdmFyaWFibGUgbmFtZXMgKHNlZSBzY29wZS5qcylcbiAgdGhpcy5zY29wZVN0YWNrID0gW107XG4gIHRoaXMuZW50ZXJTY29wZShcbiAgICB0aGlzLm9wdGlvbnMuc291cmNlVHlwZSA9PT0gXCJjb21tb25qc1wiXG4gICAgICAvLyBJbiBjb21tb25qcywgdGhlIHRvcC1sZXZlbCBzY29wZSBiZWhhdmVzIGxpa2UgYSBmdW5jdGlvbiBzY29wZVxuICAgICAgPyBTQ09QRV9GVU5DVElPTlxuICAgICAgOiBTQ09QRV9UT1BcbiAgKTtcblxuICAvLyBGb3IgUmVnRXhwIHZhbGlkYXRpb25cbiAgdGhpcy5yZWdleHBTdGF0ZSA9IG51bGw7XG5cbiAgLy8gVGhlIHN0YWNrIG9mIHByaXZhdGUgbmFtZXMuXG4gIC8vIEVhY2ggZWxlbWVudCBoYXMgdHdvIHByb3BlcnRpZXM6ICdkZWNsYXJlZCcgYW5kICd1c2VkJy5cbiAgLy8gV2hlbiBpdCBleGl0ZWQgZnJvbSB0aGUgb3V0ZXJtb3N0IGNsYXNzIGRlZmluaXRpb24sIGFsbCB1c2VkIHByaXZhdGUgbmFtZXMgbXVzdCBiZSBkZWNsYXJlZC5cbiAgdGhpcy5wcml2YXRlTmFtZVN0YWNrID0gW107XG59O1xuXG52YXIgcHJvdG90eXBlQWNjZXNzb3JzID0geyBpbkZ1bmN0aW9uOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGluR2VuZXJhdG9yOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGluQXN5bmM6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0sY2FuQXdhaXQ6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0sYWxsb3dSZXR1cm46IHsgY29uZmlndXJhYmxlOiB0cnVlIH0sYWxsb3dTdXBlcjogeyBjb25maWd1cmFibGU6IHRydWUgfSxhbGxvd0RpcmVjdFN1cGVyOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LHRyZWF0RnVuY3Rpb25zQXNWYXI6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0sYWxsb3dOZXdEb3RUYXJnZXQ6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0sYWxsb3dVc2luZzogeyBjb25maWd1cmFibGU6IHRydWUgfSxpbkNsYXNzU3RhdGljQmxvY2s6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0gfTtcblxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlICgpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLm9wdGlvbnMucHJvZ3JhbSB8fCB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHRUb2tlbigpO1xuICByZXR1cm4gdGhpcy5wYXJzZVRvcExldmVsKG5vZGUpXG59O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuaW5GdW5jdGlvbi5nZXQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAodGhpcy5jdXJyZW50VmFyU2NvcGUoKS5mbGFncyAmIFNDT1BFX0ZVTkNUSU9OKSA+IDAgfTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmluR2VuZXJhdG9yLmdldCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICh0aGlzLmN1cnJlbnRWYXJTY29wZSgpLmZsYWdzICYgU0NPUEVfR0VORVJBVE9SKSA+IDAgfTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmluQXN5bmMuZ2V0ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gKHRoaXMuY3VycmVudFZhclNjb3BlKCkuZmxhZ3MgJiBTQ09QRV9BU1lOQykgPiAwIH07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5jYW5Bd2FpdC5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGkgPSB0aGlzLnNjb3BlU3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgcmVmID0gdGhpcy5zY29wZVN0YWNrW2ldO1xuICAgICAgdmFyIGZsYWdzID0gcmVmLmZsYWdzO1xuICAgIGlmIChmbGFncyAmIChTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0sgfCBTQ09QRV9DTEFTU19GSUVMRF9JTklUKSkgeyByZXR1cm4gZmFsc2UgfVxuICAgIGlmIChmbGFncyAmIFNDT1BFX0ZVTkNUSU9OKSB7IHJldHVybiAoZmxhZ3MgJiBTQ09QRV9BU1lOQykgPiAwIH1cbiAgfVxuICByZXR1cm4gKHRoaXMuaW5Nb2R1bGUgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDEzKSB8fCB0aGlzLm9wdGlvbnMuYWxsb3dBd2FpdE91dHNpZGVGdW5jdGlvblxufTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmFsbG93UmV0dXJuLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuaW5GdW5jdGlvbikgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmICh0aGlzLm9wdGlvbnMuYWxsb3dSZXR1cm5PdXRzaWRlRnVuY3Rpb24gJiYgdGhpcy5jdXJyZW50VmFyU2NvcGUoKS5mbGFncyAmIFNDT1BFX1RPUCkgeyByZXR1cm4gdHJ1ZSB9XG4gIHJldHVybiBmYWxzZVxufTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmFsbG93U3VwZXIuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVmID0gdGhpcy5jdXJyZW50VGhpc1Njb3BlKCk7XG4gICAgdmFyIGZsYWdzID0gcmVmLmZsYWdzO1xuICByZXR1cm4gKGZsYWdzICYgU0NPUEVfU1VQRVIpID4gMCB8fCB0aGlzLm9wdGlvbnMuYWxsb3dTdXBlck91dHNpZGVNZXRob2Rcbn07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5hbGxvd0RpcmVjdFN1cGVyLmdldCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICh0aGlzLmN1cnJlbnRUaGlzU2NvcGUoKS5mbGFncyAmIFNDT1BFX0RJUkVDVF9TVVBFUikgPiAwIH07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy50cmVhdEZ1bmN0aW9uc0FzVmFyLmdldCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMudHJlYXRGdW5jdGlvbnNBc1ZhckluU2NvcGUodGhpcy5jdXJyZW50U2NvcGUoKSkgfTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmFsbG93TmV3RG90VGFyZ2V0LmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgaSA9IHRoaXMuc2NvcGVTdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciByZWYgPSB0aGlzLnNjb3BlU3RhY2tbaV07XG4gICAgICB2YXIgZmxhZ3MgPSByZWYuZmxhZ3M7XG4gICAgaWYgKGZsYWdzICYgKFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSyB8IFNDT1BFX0NMQVNTX0ZJRUxEX0lOSVQpIHx8XG4gICAgICAgICgoZmxhZ3MgJiBTQ09QRV9GVU5DVElPTikgJiYgIShmbGFncyAmIFNDT1BFX0FSUk9XKSkpIHsgcmV0dXJuIHRydWUgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmFsbG93VXNpbmcuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmVmID0gdGhpcy5jdXJyZW50U2NvcGUoKTtcbiAgICB2YXIgZmxhZ3MgPSByZWYuZmxhZ3M7XG4gIGlmIChmbGFncyAmIFNDT1BFX1NXSVRDSCkgeyByZXR1cm4gZmFsc2UgfVxuICBpZiAoIXRoaXMuaW5Nb2R1bGUgJiYgZmxhZ3MgJiBTQ09QRV9UT1ApIHsgcmV0dXJuIGZhbHNlIH1cbiAgcmV0dXJuIHRydWVcbn07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5pbkNsYXNzU3RhdGljQmxvY2suZ2V0ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gKHRoaXMuY3VycmVudFZhclNjb3BlKCkuZmxhZ3MgJiBTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0spID4gMFxufTtcblxuUGFyc2VyLmV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZCAoKSB7XG4gICAgdmFyIHBsdWdpbnMgPSBbXSwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB3aGlsZSAoIGxlbi0tICkgcGx1Z2luc1sgbGVuIF0gPSBhcmd1bWVudHNbIGxlbiBdO1xuXG4gIHZhciBjbHMgPSB0aGlzO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHsgY2xzID0gcGx1Z2luc1tpXShjbHMpOyB9XG4gIHJldHVybiBjbHNcbn07XG5cblBhcnNlci5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlIChpbnB1dCwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IHRoaXMob3B0aW9ucywgaW5wdXQpLnBhcnNlKClcbn07XG5cblBhcnNlci5wYXJzZUV4cHJlc3Npb25BdCA9IGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbkF0IChpbnB1dCwgcG9zLCBvcHRpb25zKSB7XG4gIHZhciBwYXJzZXIgPSBuZXcgdGhpcyhvcHRpb25zLCBpbnB1dCwgcG9zKTtcbiAgcGFyc2VyLm5leHRUb2tlbigpO1xuICByZXR1cm4gcGFyc2VyLnBhcnNlRXhwcmVzc2lvbigpXG59O1xuXG5QYXJzZXIudG9rZW5pemVyID0gZnVuY3Rpb24gdG9rZW5pemVyIChpbnB1dCwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IHRoaXMob3B0aW9ucywgaW5wdXQpXG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyggUGFyc2VyLnByb3RvdHlwZSwgcHJvdG90eXBlQWNjZXNzb3JzICk7XG5cbnZhciBwcCQ5ID0gUGFyc2VyLnByb3RvdHlwZTtcblxuLy8gIyMgUGFyc2VyIHV0aWxpdGllc1xuXG52YXIgbGl0ZXJhbCA9IC9eKD86JygoPzpcXFxcW15dfFteJ1xcXFxdKSo/KSd8XCIoKD86XFxcXFteXXxbXlwiXFxcXF0pKj8pXCIpLztcbnBwJDkuc3RyaWN0RGlyZWN0aXZlID0gZnVuY3Rpb24oc3RhcnQpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDUpIHsgcmV0dXJuIGZhbHNlIH1cbiAgZm9yICg7Oykge1xuICAgIC8vIFRyeSB0byBmaW5kIHN0cmluZyBsaXRlcmFsLlxuICAgIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgIHN0YXJ0ICs9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dClbMF0ubGVuZ3RoO1xuICAgIHZhciBtYXRjaCA9IGxpdGVyYWwuZXhlYyh0aGlzLmlucHV0LnNsaWNlKHN0YXJ0KSk7XG4gICAgaWYgKCFtYXRjaCkgeyByZXR1cm4gZmFsc2UgfVxuICAgIGlmICgobWF0Y2hbMV0gfHwgbWF0Y2hbMl0pID09PSBcInVzZSBzdHJpY3RcIikge1xuICAgICAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gc3RhcnQgKyBtYXRjaFswXS5sZW5ndGg7XG4gICAgICB2YXIgc3BhY2VBZnRlciA9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dCksIGVuZCA9IHNwYWNlQWZ0ZXIuaW5kZXggKyBzcGFjZUFmdGVyWzBdLmxlbmd0aDtcbiAgICAgIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQXQoZW5kKTtcbiAgICAgIHJldHVybiBuZXh0ID09PSBcIjtcIiB8fCBuZXh0ID09PSBcIn1cIiB8fFxuICAgICAgICAobGluZUJyZWFrLnRlc3Qoc3BhY2VBZnRlclswXSkgJiZcbiAgICAgICAgICEoL1soYC5bK1xcLS8qJTw+PSw/XiZdLy50ZXN0KG5leHQpIHx8IG5leHQgPT09IFwiIVwiICYmIHRoaXMuaW5wdXQuY2hhckF0KGVuZCArIDEpID09PSBcIj1cIikpXG4gICAgfVxuICAgIHN0YXJ0ICs9IG1hdGNoWzBdLmxlbmd0aDtcblxuICAgIC8vIFNraXAgc2VtaWNvbG9uLCBpZiBhbnkuXG4gICAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gc3RhcnQ7XG4gICAgc3RhcnQgKz0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KVswXS5sZW5ndGg7XG4gICAgaWYgKHRoaXMuaW5wdXRbc3RhcnRdID09PSBcIjtcIilcbiAgICAgIHsgc3RhcnQrKzsgfVxuICB9XG59O1xuXG4vLyBQcmVkaWNhdGUgdGhhdCB0ZXN0cyB3aGV0aGVyIHRoZSBuZXh0IHRva2VuIGlzIG9mIHRoZSBnaXZlblxuLy8gdHlwZSwgYW5kIGlmIHllcywgY29uc3VtZXMgaXQgYXMgYSBzaWRlIGVmZmVjdC5cblxucHAkOS5lYXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGUpIHtcbiAgICB0aGlzLm5leHQoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59O1xuXG4vLyBUZXN0cyB3aGV0aGVyIHBhcnNlZCB0b2tlbiBpcyBhIGNvbnRleHR1YWwga2V5d29yZC5cblxucHAkOS5pc0NvbnRleHR1YWwgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiB0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSAmJiB0aGlzLnZhbHVlID09PSBuYW1lICYmICF0aGlzLmNvbnRhaW5zRXNjXG59O1xuXG4vLyBDb25zdW1lcyBjb250ZXh0dWFsIGtleXdvcmQgaWYgcG9zc2libGUuXG5cbnBwJDkuZWF0Q29udGV4dHVhbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKCF0aGlzLmlzQ29udGV4dHVhbChuYW1lKSkgeyByZXR1cm4gZmFsc2UgfVxuICB0aGlzLm5leHQoKTtcbiAgcmV0dXJuIHRydWVcbn07XG5cbi8vIEFzc2VydHMgdGhhdCBmb2xsb3dpbmcgdG9rZW4gaXMgZ2l2ZW4gY29udGV4dHVhbCBrZXl3b3JkLlxuXG5wcCQ5LmV4cGVjdENvbnRleHR1YWwgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmICghdGhpcy5lYXRDb250ZXh0dWFsKG5hbWUpKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG59O1xuXG4vLyBUZXN0IHdoZXRoZXIgYSBzZW1pY29sb24gY2FuIGJlIGluc2VydGVkIGF0IHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuXG5wcCQ5LmNhbkluc2VydFNlbWljb2xvbiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50eXBlID09PSB0eXBlcyQxLmVvZiB8fFxuICAgIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5icmFjZVIgfHxcbiAgICBsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMubGFzdFRva0VuZCwgdGhpcy5zdGFydCkpXG59O1xuXG5wcCQ5Lmluc2VydFNlbWljb2xvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub25JbnNlcnRlZFNlbWljb2xvbilcbiAgICAgIHsgdGhpcy5vcHRpb25zLm9uSW5zZXJ0ZWRTZW1pY29sb24odGhpcy5sYXN0VG9rRW5kLCB0aGlzLmxhc3RUb2tFbmRMb2MpOyB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxufTtcblxuLy8gQ29uc3VtZSBhIHNlbWljb2xvbiwgb3IsIGZhaWxpbmcgdGhhdCwgc2VlIGlmIHdlIGFyZSBhbGxvd2VkIHRvXG4vLyBwcmV0ZW5kIHRoYXQgdGhlcmUgaXMgYSBzZW1pY29sb24gYXQgdGhpcyBwb3NpdGlvbi5cblxucHAkOS5zZW1pY29sb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmVhdCh0eXBlcyQxLnNlbWkpICYmICF0aGlzLmluc2VydFNlbWljb2xvbigpKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG59O1xuXG5wcCQ5LmFmdGVyVHJhaWxpbmdDb21tYSA9IGZ1bmN0aW9uKHRva1R5cGUsIG5vdE5leHQpIHtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdG9rVHlwZSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub25UcmFpbGluZ0NvbW1hKVxuICAgICAgeyB0aGlzLm9wdGlvbnMub25UcmFpbGluZ0NvbW1hKHRoaXMubGFzdFRva1N0YXJ0LCB0aGlzLmxhc3RUb2tTdGFydExvYyk7IH1cbiAgICBpZiAoIW5vdE5leHQpXG4gICAgICB7IHRoaXMubmV4dCgpOyB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxufTtcblxuLy8gRXhwZWN0IGEgdG9rZW4gb2YgYSBnaXZlbiB0eXBlLiBJZiBmb3VuZCwgY29uc3VtZSBpdCwgb3RoZXJ3aXNlLFxuLy8gcmFpc2UgYW4gdW5leHBlY3RlZCB0b2tlbiBlcnJvci5cblxucHAkOS5leHBlY3QgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHRoaXMuZWF0KHR5cGUpIHx8IHRoaXMudW5leHBlY3RlZCgpO1xufTtcblxuLy8gUmFpc2UgYW4gdW5leHBlY3RlZCB0b2tlbiBlcnJvci5cblxucHAkOS51bmV4cGVjdGVkID0gZnVuY3Rpb24ocG9zKSB7XG4gIHRoaXMucmFpc2UocG9zICE9IG51bGwgPyBwb3MgOiB0aGlzLnN0YXJ0LCBcIlVuZXhwZWN0ZWQgdG9rZW5cIik7XG59O1xuXG52YXIgRGVzdHJ1Y3R1cmluZ0Vycm9ycyA9IGZ1bmN0aW9uIERlc3RydWN0dXJpbmdFcnJvcnMoKSB7XG4gIHRoaXMuc2hvcnRoYW5kQXNzaWduID1cbiAgdGhpcy50cmFpbGluZ0NvbW1hID1cbiAgdGhpcy5wYXJlbnRoZXNpemVkQXNzaWduID1cbiAgdGhpcy5wYXJlbnRoZXNpemVkQmluZCA9XG4gIHRoaXMuZG91YmxlUHJvdG8gPVxuICAgIC0xO1xufTtcblxucHAkOS5jaGVja1BhdHRlcm5FcnJvcnMgPSBmdW5jdGlvbihyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBpc0Fzc2lnbikge1xuICBpZiAoIXJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHsgcmV0dXJuIH1cbiAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA+IC0xKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSwgXCJDb21tYSBpcyBub3QgcGVybWl0dGVkIGFmdGVyIHRoZSByZXN0IGVsZW1lbnRcIik7IH1cbiAgdmFyIHBhcmVucyA9IGlzQXNzaWduID8gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduIDogcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQmluZDtcbiAgaWYgKHBhcmVucyA+IC0xKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShwYXJlbnMsIGlzQXNzaWduID8gXCJBc3NpZ25pbmcgdG8gcnZhbHVlXCIgOiBcIlBhcmVudGhlc2l6ZWQgcGF0dGVyblwiKTsgfVxufTtcblxucHAkOS5jaGVja0V4cHJlc3Npb25FcnJvcnMgPSBmdW5jdGlvbihyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBhbmRUaHJvdykge1xuICBpZiAoIXJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHsgcmV0dXJuIGZhbHNlIH1cbiAgdmFyIHNob3J0aGFuZEFzc2lnbiA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuc2hvcnRoYW5kQXNzaWduO1xuICB2YXIgZG91YmxlUHJvdG8gPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLmRvdWJsZVByb3RvO1xuICBpZiAoIWFuZFRocm93KSB7IHJldHVybiBzaG9ydGhhbmRBc3NpZ24gPj0gMCB8fCBkb3VibGVQcm90byA+PSAwIH1cbiAgaWYgKHNob3J0aGFuZEFzc2lnbiA+PSAwKVxuICAgIHsgdGhpcy5yYWlzZShzaG9ydGhhbmRBc3NpZ24sIFwiU2hvcnRoYW5kIHByb3BlcnR5IGFzc2lnbm1lbnRzIGFyZSB2YWxpZCBvbmx5IGluIGRlc3RydWN0dXJpbmcgcGF0dGVybnNcIik7IH1cbiAgaWYgKGRvdWJsZVByb3RvID49IDApXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZG91YmxlUHJvdG8sIFwiUmVkZWZpbml0aW9uIG9mIF9fcHJvdG9fXyBwcm9wZXJ0eVwiKTsgfVxufTtcblxucHAkOS5jaGVja1lpZWxkQXdhaXRJbkRlZmF1bHRQYXJhbXMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMueWllbGRQb3MgJiYgKCF0aGlzLmF3YWl0UG9zIHx8IHRoaXMueWllbGRQb3MgPCB0aGlzLmF3YWl0UG9zKSlcbiAgICB7IHRoaXMucmFpc2UodGhpcy55aWVsZFBvcywgXCJZaWVsZCBleHByZXNzaW9uIGNhbm5vdCBiZSBhIGRlZmF1bHQgdmFsdWVcIik7IH1cbiAgaWYgKHRoaXMuYXdhaXRQb3MpXG4gICAgeyB0aGlzLnJhaXNlKHRoaXMuYXdhaXRQb3MsIFwiQXdhaXQgZXhwcmVzc2lvbiBjYW5ub3QgYmUgYSBkZWZhdWx0IHZhbHVlXCIpOyB9XG59O1xuXG5wcCQ5LmlzU2ltcGxlQXNzaWduVGFyZ2V0ID0gZnVuY3Rpb24oZXhwcikge1xuICBpZiAoZXhwci50eXBlID09PSBcIlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uXCIpXG4gICAgeyByZXR1cm4gdGhpcy5pc1NpbXBsZUFzc2lnblRhcmdldChleHByLmV4cHJlc3Npb24pIH1cbiAgcmV0dXJuIGV4cHIudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgfHwgZXhwci50eXBlID09PSBcIk1lbWJlckV4cHJlc3Npb25cIlxufTtcblxudmFyIHBwJDggPSBQYXJzZXIucHJvdG90eXBlO1xuXG4vLyAjIyMgU3RhdGVtZW50IHBhcnNpbmdcblxuLy8gUGFyc2UgYSBwcm9ncmFtLiBJbml0aWFsaXplcyB0aGUgcGFyc2VyLCByZWFkcyBhbnkgbnVtYmVyIG9mXG4vLyBzdGF0ZW1lbnRzLCBhbmQgd3JhcHMgdGhlbSBpbiBhIFByb2dyYW0gbm9kZS4gIE9wdGlvbmFsbHkgdGFrZXMgYVxuLy8gYHByb2dyYW1gIGFyZ3VtZW50LiAgSWYgcHJlc2VudCwgdGhlIHN0YXRlbWVudHMgd2lsbCBiZSBhcHBlbmRlZFxuLy8gdG8gaXRzIGJvZHkgaW5zdGVhZCBvZiBjcmVhdGluZyBhIG5ldyBub2RlLlxuXG5wcCQ4LnBhcnNlVG9wTGV2ZWwgPSBmdW5jdGlvbihub2RlKSB7XG4gIHZhciBleHBvcnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgaWYgKCFub2RlLmJvZHkpIHsgbm9kZS5ib2R5ID0gW107IH1cbiAgd2hpbGUgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5lb2YpIHtcbiAgICB2YXIgc3RtdCA9IHRoaXMucGFyc2VTdGF0ZW1lbnQobnVsbCwgdHJ1ZSwgZXhwb3J0cyk7XG4gICAgbm9kZS5ib2R5LnB1c2goc3RtdCk7XG4gIH1cbiAgaWYgKHRoaXMuaW5Nb2R1bGUpXG4gICAgeyBmb3IgKHZhciBpID0gMCwgbGlzdCA9IE9iamVjdC5rZXlzKHRoaXMudW5kZWZpbmVkRXhwb3J0cyk7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKVxuICAgICAge1xuICAgICAgICB2YXIgbmFtZSA9IGxpc3RbaV07XG5cbiAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMudW5kZWZpbmVkRXhwb3J0c1tuYW1lXS5zdGFydCwgKFwiRXhwb3J0ICdcIiArIG5hbWUgKyBcIicgaXMgbm90IGRlZmluZWRcIikpO1xuICAgICAgfSB9XG4gIHRoaXMuYWRhcHREaXJlY3RpdmVQcm9sb2d1ZShub2RlLmJvZHkpO1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5zb3VyY2VUeXBlID0gdGhpcy5vcHRpb25zLnNvdXJjZVR5cGUgPT09IFwiY29tbW9uanNcIiA/IFwic2NyaXB0XCIgOiB0aGlzLm9wdGlvbnMuc291cmNlVHlwZTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlByb2dyYW1cIilcbn07XG5cbnZhciBsb29wTGFiZWwgPSB7a2luZDogXCJsb29wXCJ9LCBzd2l0Y2hMYWJlbCA9IHtraW5kOiBcInN3aXRjaFwifTtcblxucHAkOC5pc0xldCA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDYgfHwgIXRoaXMuaXNDb250ZXh0dWFsKFwibGV0XCIpKSB7IHJldHVybiBmYWxzZSB9XG4gIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHRoaXMucG9zO1xuICB2YXIgc2tpcCA9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dCk7XG4gIHZhciBuZXh0ID0gdGhpcy5wb3MgKyBza2lwWzBdLmxlbmd0aCwgbmV4dENoID0gdGhpcy5mdWxsQ2hhckNvZGVBdChuZXh0KTtcbiAgLy8gRm9yIGFtYmlndW91cyBjYXNlcywgZGV0ZXJtaW5lIGlmIGEgTGV4aWNhbERlY2xhcmF0aW9uIChvciBvbmx5IGFcbiAgLy8gU3RhdGVtZW50KSBpcyBhbGxvd2VkIGhlcmUuIElmIGNvbnRleHQgaXMgbm90IGVtcHR5IHRoZW4gb25seSBhIFN0YXRlbWVudFxuICAvLyBpcyBhbGxvd2VkLiBIb3dldmVyLCBgbGV0IFtgIGlzIGFuIGV4cGxpY2l0IG5lZ2F0aXZlIGxvb2thaGVhZCBmb3JcbiAgLy8gRXhwcmVzc2lvblN0YXRlbWVudCwgc28gc3BlY2lhbC1jYXNlIGl0IGZpcnN0LlxuICBpZiAobmV4dENoID09PSA5MSB8fCBuZXh0Q2ggPT09IDkyKSB7IHJldHVybiB0cnVlIH0gLy8gJ1snLCAnXFwnXG4gIGlmIChjb250ZXh0KSB7IHJldHVybiBmYWxzZSB9XG5cbiAgaWYgKG5leHRDaCA9PT0gMTIzKSB7IHJldHVybiB0cnVlIH0gLy8gJ3snXG4gIGlmIChpc0lkZW50aWZpZXJTdGFydChuZXh0Q2gpKSB7XG4gICAgdmFyIHN0YXJ0ID0gbmV4dDtcbiAgICBkbyB7IG5leHQgKz0gbmV4dENoIDw9IDB4ZmZmZiA/IDEgOiAyOyB9XG4gICAgd2hpbGUgKGlzSWRlbnRpZmllckNoYXIobmV4dENoID0gdGhpcy5mdWxsQ2hhckNvZGVBdChuZXh0KSkpXG4gICAgaWYgKG5leHRDaCA9PT0gOTIpIHsgcmV0dXJuIHRydWUgfVxuICAgIHZhciBpZGVudCA9IHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQsIG5leHQpO1xuICAgIGlmICgha2V5d29yZFJlbGF0aW9uYWxPcGVyYXRvci50ZXN0KGlkZW50KSkgeyByZXR1cm4gdHJ1ZSB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBjaGVjayAnYXN5bmMgW25vIExpbmVUZXJtaW5hdG9yIGhlcmVdIGZ1bmN0aW9uJ1xuLy8gLSAnYXN5bmMgLypmb28qLyBmdW5jdGlvbicgaXMgT0suXG4vLyAtICdhc3luYyAvKlxcbiovIGZ1bmN0aW9uJyBpcyBpbnZhbGlkLlxucHAkOC5pc0FzeW5jRnVuY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDggfHwgIXRoaXMuaXNDb250ZXh0dWFsKFwiYXN5bmNcIikpXG4gICAgeyByZXR1cm4gZmFsc2UgfVxuXG4gIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHRoaXMucG9zO1xuICB2YXIgc2tpcCA9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dCk7XG4gIHZhciBuZXh0ID0gdGhpcy5wb3MgKyBza2lwWzBdLmxlbmd0aCwgYWZ0ZXI7XG4gIHJldHVybiAhbGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLnBvcywgbmV4dCkpICYmXG4gICAgdGhpcy5pbnB1dC5zbGljZShuZXh0LCBuZXh0ICsgOCkgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIChuZXh0ICsgOCA9PT0gdGhpcy5pbnB1dC5sZW5ndGggfHxcbiAgICAgIShpc0lkZW50aWZpZXJDaGFyKGFmdGVyID0gdGhpcy5mdWxsQ2hhckNvZGVBdChuZXh0ICsgOCkpIHx8IGFmdGVyID09PSA5MiAvKiAnXFwnICovKSlcbn07XG5cbnBwJDguaXNVc2luZ0tleXdvcmQgPSBmdW5jdGlvbihpc0F3YWl0VXNpbmcsIGlzRm9yKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCAxNyB8fCAhdGhpcy5pc0NvbnRleHR1YWwoaXNBd2FpdFVzaW5nID8gXCJhd2FpdFwiIDogXCJ1c2luZ1wiKSlcbiAgICB7IHJldHVybiBmYWxzZSB9XG5cbiAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gdGhpcy5wb3M7XG4gIHZhciBza2lwID0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KTtcbiAgdmFyIG5leHQgPSB0aGlzLnBvcyArIHNraXBbMF0ubGVuZ3RoO1xuXG4gIGlmIChsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMucG9zLCBuZXh0KSkpIHsgcmV0dXJuIGZhbHNlIH1cblxuICBpZiAoaXNBd2FpdFVzaW5nKSB7XG4gICAgdmFyIHVzaW5nRW5kUG9zID0gbmV4dCArIDUgLyogdXNpbmcgKi8sIGFmdGVyO1xuICAgIGlmICh0aGlzLmlucHV0LnNsaWNlKG5leHQsIHVzaW5nRW5kUG9zKSAhPT0gXCJ1c2luZ1wiIHx8XG4gICAgICB1c2luZ0VuZFBvcyA9PT0gdGhpcy5pbnB1dC5sZW5ndGggfHxcbiAgICAgIGlzSWRlbnRpZmllckNoYXIoYWZ0ZXIgPSB0aGlzLmZ1bGxDaGFyQ29kZUF0KHVzaW5nRW5kUG9zKSkgfHxcbiAgICAgIGFmdGVyID09PSA5MiAvKiAnXFwnICovXG4gICAgKSB7IHJldHVybiBmYWxzZSB9XG5cbiAgICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSB1c2luZ0VuZFBvcztcbiAgICB2YXIgc2tpcEFmdGVyVXNpbmcgPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpO1xuICAgIG5leHQgPSB1c2luZ0VuZFBvcyArIHNraXBBZnRlclVzaW5nWzBdLmxlbmd0aDtcbiAgICBpZiAoc2tpcEFmdGVyVXNpbmcgJiYgbGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh1c2luZ0VuZFBvcywgbmV4dCkpKSB7IHJldHVybiBmYWxzZSB9XG4gIH1cblxuICB2YXIgY2ggPSB0aGlzLmZ1bGxDaGFyQ29kZUF0KG5leHQpO1xuICBpZiAoIWlzSWRlbnRpZmllclN0YXJ0KGNoKSAmJiBjaCAhPT0gOTIgLyogJ1xcJyAqLykgeyByZXR1cm4gZmFsc2UgfVxuICB2YXIgaWRTdGFydCA9IG5leHQ7XG4gIGRvIHsgbmV4dCArPSBjaCA8PSAweGZmZmYgPyAxIDogMjsgfVxuICB3aGlsZSAoaXNJZGVudGlmaWVyQ2hhcihjaCA9IHRoaXMuZnVsbENoYXJDb2RlQXQobmV4dCkpKVxuICBpZiAoY2ggPT09IDkyKSB7IHJldHVybiB0cnVlIH1cbiAgdmFyIGlkID0gdGhpcy5pbnB1dC5zbGljZShpZFN0YXJ0LCBuZXh0KTtcbiAgaWYgKGtleXdvcmRSZWxhdGlvbmFsT3BlcmF0b3IudGVzdChpZCkgfHwgaXNGb3IgJiYgaWQgPT09IFwib2ZcIikgeyByZXR1cm4gZmFsc2UgfVxuICByZXR1cm4gdHJ1ZVxufTtcblxucHAkOC5pc0F3YWl0VXNpbmcgPSBmdW5jdGlvbihpc0Zvcikge1xuICByZXR1cm4gdGhpcy5pc1VzaW5nS2V5d29yZCh0cnVlLCBpc0Zvcilcbn07XG5cbnBwJDguaXNVc2luZyA9IGZ1bmN0aW9uKGlzRm9yKSB7XG4gIHJldHVybiB0aGlzLmlzVXNpbmdLZXl3b3JkKGZhbHNlLCBpc0Zvcilcbn07XG5cbi8vIFBhcnNlIGEgc2luZ2xlIHN0YXRlbWVudC5cbi8vXG4vLyBJZiBleHBlY3RpbmcgYSBzdGF0ZW1lbnQgYW5kIGZpbmRpbmcgYSBzbGFzaCBvcGVyYXRvciwgcGFyc2UgYVxuLy8gcmVndWxhciBleHByZXNzaW9uIGxpdGVyYWwuIFRoaXMgaXMgdG8gaGFuZGxlIGNhc2VzIGxpa2Vcbi8vIGBpZiAoZm9vKSAvYmxhaC8uZXhlYyhmb28pYCwgd2hlcmUgbG9va2luZyBhdCB0aGUgcHJldmlvdXMgdG9rZW5cbi8vIGRvZXMgbm90IGhlbHAuXG5cbnBwJDgucGFyc2VTdGF0ZW1lbnQgPSBmdW5jdGlvbihjb250ZXh0LCB0b3BMZXZlbCwgZXhwb3J0cykge1xuICB2YXIgc3RhcnR0eXBlID0gdGhpcy50eXBlLCBub2RlID0gdGhpcy5zdGFydE5vZGUoKSwga2luZDtcblxuICBpZiAodGhpcy5pc0xldChjb250ZXh0KSkge1xuICAgIHN0YXJ0dHlwZSA9IHR5cGVzJDEuX3ZhcjtcbiAgICBraW5kID0gXCJsZXRcIjtcbiAgfVxuXG4gIC8vIE1vc3QgdHlwZXMgb2Ygc3RhdGVtZW50cyBhcmUgcmVjb2duaXplZCBieSB0aGUga2V5d29yZCB0aGV5XG4gIC8vIHN0YXJ0IHdpdGguIE1hbnkgYXJlIHRyaXZpYWwgdG8gcGFyc2UsIHNvbWUgcmVxdWlyZSBhIGJpdCBvZlxuICAvLyBjb21wbGV4aXR5LlxuXG4gIHN3aXRjaCAoc3RhcnR0eXBlKSB7XG4gIGNhc2UgdHlwZXMkMS5fYnJlYWs6IGNhc2UgdHlwZXMkMS5fY29udGludWU6IHJldHVybiB0aGlzLnBhcnNlQnJlYWtDb250aW51ZVN0YXRlbWVudChub2RlLCBzdGFydHR5cGUua2V5d29yZClcbiAgY2FzZSB0eXBlcyQxLl9kZWJ1Z2dlcjogcmV0dXJuIHRoaXMucGFyc2VEZWJ1Z2dlclN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX2RvOiByZXR1cm4gdGhpcy5wYXJzZURvU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fZm9yOiByZXR1cm4gdGhpcy5wYXJzZUZvclN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX2Z1bmN0aW9uOlxuICAgIC8vIEZ1bmN0aW9uIGFzIHNvbGUgYm9keSBvZiBlaXRoZXIgYW4gaWYgc3RhdGVtZW50IG9yIGEgbGFiZWxlZCBzdGF0ZW1lbnRcbiAgICAvLyB3b3JrcywgYnV0IG5vdCB3aGVuIGl0IGlzIHBhcnQgb2YgYSBsYWJlbGVkIHN0YXRlbWVudCB0aGF0IGlzIHRoZSBzb2xlXG4gICAgLy8gYm9keSBvZiBhbiBpZiBzdGF0ZW1lbnQuXG4gICAgaWYgKChjb250ZXh0ICYmICh0aGlzLnN0cmljdCB8fCBjb250ZXh0ICE9PSBcImlmXCIgJiYgY29udGV4dCAhPT0gXCJsYWJlbFwiKSkgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICByZXR1cm4gdGhpcy5wYXJzZUZ1bmN0aW9uU3RhdGVtZW50KG5vZGUsIGZhbHNlLCAhY29udGV4dClcbiAgY2FzZSB0eXBlcyQxLl9jbGFzczpcbiAgICBpZiAoY29udGV4dCkgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHJldHVybiB0aGlzLnBhcnNlQ2xhc3Mobm9kZSwgdHJ1ZSlcbiAgY2FzZSB0eXBlcyQxLl9pZjogcmV0dXJuIHRoaXMucGFyc2VJZlN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX3JldHVybjogcmV0dXJuIHRoaXMucGFyc2VSZXR1cm5TdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl9zd2l0Y2g6IHJldHVybiB0aGlzLnBhcnNlU3dpdGNoU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fdGhyb3c6IHJldHVybiB0aGlzLnBhcnNlVGhyb3dTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl90cnk6IHJldHVybiB0aGlzLnBhcnNlVHJ5U3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fY29uc3Q6IGNhc2UgdHlwZXMkMS5fdmFyOlxuICAgIGtpbmQgPSBraW5kIHx8IHRoaXMudmFsdWU7XG4gICAgaWYgKGNvbnRleHQgJiYga2luZCAhPT0gXCJ2YXJcIikgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHJldHVybiB0aGlzLnBhcnNlVmFyU3RhdGVtZW50KG5vZGUsIGtpbmQpXG4gIGNhc2UgdHlwZXMkMS5fd2hpbGU6IHJldHVybiB0aGlzLnBhcnNlV2hpbGVTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl93aXRoOiByZXR1cm4gdGhpcy5wYXJzZVdpdGhTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLmJyYWNlTDogcmV0dXJuIHRoaXMucGFyc2VCbG9jayh0cnVlLCBub2RlKVxuICBjYXNlIHR5cGVzJDEuc2VtaTogcmV0dXJuIHRoaXMucGFyc2VFbXB0eVN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX2V4cG9ydDpcbiAgY2FzZSB0eXBlcyQxLl9pbXBvcnQ6XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+IDEwICYmIHN0YXJ0dHlwZSA9PT0gdHlwZXMkMS5faW1wb3J0KSB7XG4gICAgICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSB0aGlzLnBvcztcbiAgICAgIHZhciBza2lwID0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KTtcbiAgICAgIHZhciBuZXh0ID0gdGhpcy5wb3MgKyBza2lwWzBdLmxlbmd0aCwgbmV4dENoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KG5leHQpO1xuICAgICAgaWYgKG5leHRDaCA9PT0gNDAgfHwgbmV4dENoID09PSA0NikgLy8gJygnIG9yICcuJ1xuICAgICAgICB7IHJldHVybiB0aGlzLnBhcnNlRXhwcmVzc2lvblN0YXRlbWVudChub2RlLCB0aGlzLnBhcnNlRXhwcmVzc2lvbigpKSB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuYWxsb3dJbXBvcnRFeHBvcnRFdmVyeXdoZXJlKSB7XG4gICAgICBpZiAoIXRvcExldmVsKVxuICAgICAgICB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCInaW1wb3J0JyBhbmQgJ2V4cG9ydCcgbWF5IG9ubHkgYXBwZWFyIGF0IHRoZSB0b3AgbGV2ZWxcIik7IH1cbiAgICAgIGlmICghdGhpcy5pbk1vZHVsZSlcbiAgICAgICAgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiJ2ltcG9ydCcgYW5kICdleHBvcnQnIG1heSBhcHBlYXIgb25seSB3aXRoICdzb3VyY2VUeXBlOiBtb2R1bGUnXCIpOyB9XG4gICAgfVxuICAgIHJldHVybiBzdGFydHR5cGUgPT09IHR5cGVzJDEuX2ltcG9ydCA/IHRoaXMucGFyc2VJbXBvcnQobm9kZSkgOiB0aGlzLnBhcnNlRXhwb3J0KG5vZGUsIGV4cG9ydHMpXG5cbiAgICAvLyBJZiB0aGUgc3RhdGVtZW50IGRvZXMgbm90IHN0YXJ0IHdpdGggYSBzdGF0ZW1lbnQga2V5d29yZCBvciBhXG4gICAgLy8gYnJhY2UsIGl0J3MgYW4gRXhwcmVzc2lvblN0YXRlbWVudCBvciBMYWJlbGVkU3RhdGVtZW50LiBXZVxuICAgIC8vIHNpbXBseSBzdGFydCBwYXJzaW5nIGFuIGV4cHJlc3Npb24sIGFuZCBhZnRlcndhcmRzLCBpZiB0aGVcbiAgICAvLyBuZXh0IHRva2VuIGlzIGEgY29sb24gYW5kIHRoZSBleHByZXNzaW9uIHdhcyBhIHNpbXBsZVxuICAgIC8vIElkZW50aWZpZXIgbm9kZSwgd2Ugc3dpdGNoIHRvIGludGVycHJldGluZyBpdCBhcyBhIGxhYmVsLlxuICBkZWZhdWx0OlxuICAgIGlmICh0aGlzLmlzQXN5bmNGdW5jdGlvbigpKSB7XG4gICAgICBpZiAoY29udGV4dCkgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZUZ1bmN0aW9uU3RhdGVtZW50KG5vZGUsIHRydWUsICFjb250ZXh0KVxuICAgIH1cblxuICAgIHZhciB1c2luZ0tpbmQgPSB0aGlzLmlzQXdhaXRVc2luZyhmYWxzZSkgPyBcImF3YWl0IHVzaW5nXCIgOiB0aGlzLmlzVXNpbmcoZmFsc2UpID8gXCJ1c2luZ1wiIDogbnVsbDtcbiAgICBpZiAodXNpbmdLaW5kKSB7XG4gICAgICBpZiAoIXRoaXMuYWxsb3dVc2luZykge1xuICAgICAgICB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiVXNpbmcgZGVjbGFyYXRpb24gY2Fubm90IGFwcGVhciBpbiB0aGUgdG9wIGxldmVsIHdoZW4gc291cmNlIHR5cGUgaXMgYHNjcmlwdGAgb3IgaW4gdGhlIGJhcmUgY2FzZSBzdGF0ZW1lbnRcIik7XG4gICAgICB9XG4gICAgICBpZiAodXNpbmdLaW5kID09PSBcImF3YWl0IHVzaW5nXCIpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNhbkF3YWl0KSB7XG4gICAgICAgICAgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIkF3YWl0IHVzaW5nIGNhbm5vdCBhcHBlYXIgb3V0c2lkZSBvZiBhc3luYyBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgdGhpcy5wYXJzZVZhcihub2RlLCBmYWxzZSwgdXNpbmdLaW5kKTtcbiAgICAgIHRoaXMuc2VtaWNvbG9uKCk7XG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiVmFyaWFibGVEZWNsYXJhdGlvblwiKVxuICAgIH1cblxuICAgIHZhciBtYXliZU5hbWUgPSB0aGlzLnZhbHVlLCBleHByID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICBpZiAoc3RhcnR0eXBlID09PSB0eXBlcyQxLm5hbWUgJiYgZXhwci50eXBlID09PSBcIklkZW50aWZpZXJcIiAmJiB0aGlzLmVhdCh0eXBlcyQxLmNvbG9uKSlcbiAgICAgIHsgcmV0dXJuIHRoaXMucGFyc2VMYWJlbGVkU3RhdGVtZW50KG5vZGUsIG1heWJlTmFtZSwgZXhwciwgY29udGV4dCkgfVxuICAgIGVsc2UgeyByZXR1cm4gdGhpcy5wYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQobm9kZSwgZXhwcikgfVxuICB9XG59O1xuXG5wcCQ4LnBhcnNlQnJlYWtDb250aW51ZVN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUsIGtleXdvcmQpIHtcbiAgdmFyIGlzQnJlYWsgPSBrZXl3b3JkID09PSBcImJyZWFrXCI7XG4gIHRoaXMubmV4dCgpO1xuICBpZiAodGhpcy5lYXQodHlwZXMkMS5zZW1pKSB8fCB0aGlzLmluc2VydFNlbWljb2xvbigpKSB7IG5vZGUubGFiZWwgPSBudWxsOyB9XG4gIGVsc2UgaWYgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5uYW1lKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gIGVsc2Uge1xuICAgIG5vZGUubGFiZWwgPSB0aGlzLnBhcnNlSWRlbnQoKTtcbiAgICB0aGlzLnNlbWljb2xvbigpO1xuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgdGhlcmUgaXMgYW4gYWN0dWFsIGRlc3RpbmF0aW9uIHRvIGJyZWFrIG9yXG4gIC8vIGNvbnRpbnVlIHRvLlxuICB2YXIgaSA9IDA7XG4gIGZvciAoOyBpIDwgdGhpcy5sYWJlbHMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgbGFiID0gdGhpcy5sYWJlbHNbaV07XG4gICAgaWYgKG5vZGUubGFiZWwgPT0gbnVsbCB8fCBsYWIubmFtZSA9PT0gbm9kZS5sYWJlbC5uYW1lKSB7XG4gICAgICBpZiAobGFiLmtpbmQgIT0gbnVsbCAmJiAoaXNCcmVhayB8fCBsYWIua2luZCA9PT0gXCJsb29wXCIpKSB7IGJyZWFrIH1cbiAgICAgIGlmIChub2RlLmxhYmVsICYmIGlzQnJlYWspIHsgYnJlYWsgfVxuICAgIH1cbiAgfVxuICBpZiAoaSA9PT0gdGhpcy5sYWJlbHMubGVuZ3RoKSB7IHRoaXMucmFpc2Uobm9kZS5zdGFydCwgXCJVbnN5bnRhY3RpYyBcIiArIGtleXdvcmQpOyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgaXNCcmVhayA/IFwiQnJlYWtTdGF0ZW1lbnRcIiA6IFwiQ29udGludWVTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VEZWJ1Z2dlclN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIHRoaXMuc2VtaWNvbG9uKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJEZWJ1Z2dlclN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZURvU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgdGhpcy5sYWJlbHMucHVzaChsb29wTGFiZWwpO1xuICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KFwiZG9cIik7XG4gIHRoaXMubGFiZWxzLnBvcCgpO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLl93aGlsZSk7XG4gIG5vZGUudGVzdCA9IHRoaXMucGFyc2VQYXJlbkV4cHJlc3Npb24oKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KVxuICAgIHsgdGhpcy5lYXQodHlwZXMkMS5zZW1pKTsgfVxuICBlbHNlXG4gICAgeyB0aGlzLnNlbWljb2xvbigpOyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJEb1doaWxlU3RhdGVtZW50XCIpXG59O1xuXG4vLyBEaXNhbWJpZ3VhdGluZyBiZXR3ZWVuIGEgYGZvcmAgYW5kIGEgYGZvcmAvYGluYCBvciBgZm9yYC9gb2ZgXG4vLyBsb29wIGlzIG5vbi10cml2aWFsLiBCYXNpY2FsbHksIHdlIGhhdmUgdG8gcGFyc2UgdGhlIGluaXQgYHZhcmBcbi8vIHN0YXRlbWVudCBvciBleHByZXNzaW9uLCBkaXNhbGxvd2luZyB0aGUgYGluYCBvcGVyYXRvciAoc2VlXG4vLyB0aGUgc2Vjb25kIHBhcmFtZXRlciB0byBgcGFyc2VFeHByZXNzaW9uYCksIGFuZCB0aGVuIGNoZWNrXG4vLyB3aGV0aGVyIHRoZSBuZXh0IHRva2VuIGlzIGBpbmAgb3IgYG9mYC4gV2hlbiB0aGVyZSBpcyBubyBpbml0XG4vLyBwYXJ0IChzZW1pY29sb24gaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIG9wZW5pbmcgcGFyZW50aGVzaXMpLCBpdFxuLy8gaXMgYSByZWd1bGFyIGBmb3JgIGxvb3AuXG5cbnBwJDgucGFyc2VGb3JTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICB2YXIgYXdhaXRBdCA9ICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSAmJiB0aGlzLmNhbkF3YWl0ICYmIHRoaXMuZWF0Q29udGV4dHVhbChcImF3YWl0XCIpKSA/IHRoaXMubGFzdFRva1N0YXJ0IDogLTE7XG4gIHRoaXMubGFiZWxzLnB1c2gobG9vcExhYmVsKTtcbiAgdGhpcy5lbnRlclNjb3BlKDApO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuTCk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuc2VtaSkge1xuICAgIGlmIChhd2FpdEF0ID4gLTEpIHsgdGhpcy51bmV4cGVjdGVkKGF3YWl0QXQpOyB9XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGb3Iobm9kZSwgbnVsbClcbiAgfVxuICB2YXIgaXNMZXQgPSB0aGlzLmlzTGV0KCk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX3ZhciB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2NvbnN0IHx8IGlzTGV0KSB7XG4gICAgdmFyIGluaXQkMSA9IHRoaXMuc3RhcnROb2RlKCksIGtpbmQgPSBpc0xldCA/IFwibGV0XCIgOiB0aGlzLnZhbHVlO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIHRoaXMucGFyc2VWYXIoaW5pdCQxLCB0cnVlLCBraW5kKTtcbiAgICB0aGlzLmZpbmlzaE5vZGUoaW5pdCQxLCBcIlZhcmlhYmxlRGVjbGFyYXRpb25cIik7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGb3JBZnRlckluaXQobm9kZSwgaW5pdCQxLCBhd2FpdEF0KVxuICB9XG4gIHZhciBzdGFydHNXaXRoTGV0ID0gdGhpcy5pc0NvbnRleHR1YWwoXCJsZXRcIiksIGlzRm9yT2YgPSBmYWxzZTtcblxuICB2YXIgdXNpbmdLaW5kID0gdGhpcy5pc1VzaW5nKHRydWUpID8gXCJ1c2luZ1wiIDogdGhpcy5pc0F3YWl0VXNpbmcodHJ1ZSkgPyBcImF3YWl0IHVzaW5nXCIgOiBudWxsO1xuICBpZiAodXNpbmdLaW5kKSB7XG4gICAgdmFyIGluaXQkMiA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgaWYgKHVzaW5nS2luZCA9PT0gXCJhd2FpdCB1c2luZ1wiKSB7XG4gICAgICBpZiAoIXRoaXMuY2FuQXdhaXQpIHtcbiAgICAgICAgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIkF3YWl0IHVzaW5nIGNhbm5vdCBhcHBlYXIgb3V0c2lkZSBvZiBhc3luYyBmdW5jdGlvblwiKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubmV4dCgpO1xuICAgIH1cbiAgICB0aGlzLnBhcnNlVmFyKGluaXQkMiwgdHJ1ZSwgdXNpbmdLaW5kKTtcbiAgICB0aGlzLmZpbmlzaE5vZGUoaW5pdCQyLCBcIlZhcmlhYmxlRGVjbGFyYXRpb25cIik7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGb3JBZnRlckluaXQobm9kZSwgaW5pdCQyLCBhd2FpdEF0KVxuICB9XG4gIHZhciBjb250YWluc0VzYyA9IHRoaXMuY29udGFpbnNFc2M7XG4gIHZhciByZWZEZXN0cnVjdHVyaW5nRXJyb3JzID0gbmV3IERlc3RydWN0dXJpbmdFcnJvcnM7XG4gIHZhciBpbml0UG9zID0gdGhpcy5zdGFydDtcbiAgdmFyIGluaXQgPSBhd2FpdEF0ID4gLTFcbiAgICA/IHRoaXMucGFyc2VFeHByU3Vic2NyaXB0cyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBcImF3YWl0XCIpXG4gICAgOiB0aGlzLnBhcnNlRXhwcmVzc2lvbih0cnVlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5faW4gfHwgKGlzRm9yT2YgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiB0aGlzLmlzQ29udGV4dHVhbChcIm9mXCIpKSkge1xuICAgIGlmIChhd2FpdEF0ID4gLTEpIHsgLy8gaW1wbGllcyBgZWNtYVZlcnNpb24gPj0gOWAgKHNlZSBkZWNsYXJhdGlvbiBvZiBhd2FpdEF0KVxuICAgICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5faW4pIHsgdGhpcy51bmV4cGVjdGVkKGF3YWl0QXQpOyB9XG4gICAgICBub2RlLmF3YWl0ID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGlzRm9yT2YgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgpIHtcbiAgICAgIGlmIChpbml0LnN0YXJ0ID09PSBpbml0UG9zICYmICFjb250YWluc0VzYyAmJiBpbml0LnR5cGUgPT09IFwiSWRlbnRpZmllclwiICYmIGluaXQubmFtZSA9PT0gXCJhc3luY1wiKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgICBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSkgeyBub2RlLmF3YWl0ID0gZmFsc2U7IH1cbiAgICB9XG4gICAgaWYgKHN0YXJ0c1dpdGhMZXQgJiYgaXNGb3JPZikgeyB0aGlzLnJhaXNlKGluaXQuc3RhcnQsIFwiVGhlIGxlZnQtaGFuZCBzaWRlIG9mIGEgZm9yLW9mIGxvb3AgbWF5IG5vdCBzdGFydCB3aXRoICdsZXQnLlwiKTsgfVxuICAgIHRoaXMudG9Bc3NpZ25hYmxlKGluaXQsIGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICB0aGlzLmNoZWNrTFZhbFBhdHRlcm4oaW5pdCk7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGb3JJbihub2RlLCBpbml0KVxuICB9IGVsc2Uge1xuICAgIHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpO1xuICB9XG4gIGlmIChhd2FpdEF0ID4gLTEpIHsgdGhpcy51bmV4cGVjdGVkKGF3YWl0QXQpOyB9XG4gIHJldHVybiB0aGlzLnBhcnNlRm9yKG5vZGUsIGluaXQpXG59O1xuXG4vLyBIZWxwZXIgbWV0aG9kIHRvIHBhcnNlIGZvciBsb29wIGFmdGVyIHZhcmlhYmxlIGluaXRpYWxpemF0aW9uXG5wcCQ4LnBhcnNlRm9yQWZ0ZXJJbml0ID0gZnVuY3Rpb24obm9kZSwgaW5pdCwgYXdhaXRBdCkge1xuICBpZiAoKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5faW4gfHwgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIHRoaXMuaXNDb250ZXh0dWFsKFwib2ZcIikpKSAmJiBpbml0LmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkpIHtcbiAgICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2luKSB7XG4gICAgICAgIGlmIChhd2FpdEF0ID4gLTEpIHsgdGhpcy51bmV4cGVjdGVkKGF3YWl0QXQpOyB9XG4gICAgICB9IGVsc2UgeyBub2RlLmF3YWl0ID0gYXdhaXRBdCA+IC0xOyB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBhcnNlRm9ySW4obm9kZSwgaW5pdClcbiAgfVxuICBpZiAoYXdhaXRBdCA+IC0xKSB7IHRoaXMudW5leHBlY3RlZChhd2FpdEF0KTsgfVxuICByZXR1cm4gdGhpcy5wYXJzZUZvcihub2RlLCBpbml0KVxufTtcblxucHAkOC5wYXJzZUZ1bmN0aW9uU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSwgaXNBc3luYywgZGVjbGFyYXRpb25Qb3NpdGlvbikge1xuICB0aGlzLm5leHQoKTtcbiAgcmV0dXJuIHRoaXMucGFyc2VGdW5jdGlvbihub2RlLCBGVU5DX1NUQVRFTUVOVCB8IChkZWNsYXJhdGlvblBvc2l0aW9uID8gMCA6IEZVTkNfSEFOR0lOR19TVEFURU1FTlQpLCBmYWxzZSwgaXNBc3luYylcbn07XG5cbnBwJDgucGFyc2VJZlN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUudGVzdCA9IHRoaXMucGFyc2VQYXJlbkV4cHJlc3Npb24oKTtcbiAgLy8gYWxsb3cgZnVuY3Rpb24gZGVjbGFyYXRpb25zIGluIGJyYW5jaGVzLCBidXQgb25seSBpbiBub24tc3RyaWN0IG1vZGVcbiAgbm9kZS5jb25zZXF1ZW50ID0gdGhpcy5wYXJzZVN0YXRlbWVudChcImlmXCIpO1xuICBub2RlLmFsdGVybmF0ZSA9IHRoaXMuZWF0KHR5cGVzJDEuX2Vsc2UpID8gdGhpcy5wYXJzZVN0YXRlbWVudChcImlmXCIpIDogbnVsbDtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIklmU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlUmV0dXJuU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICBpZiAoIXRoaXMuYWxsb3dSZXR1cm4pXG4gICAgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiJ3JldHVybicgb3V0c2lkZSBvZiBmdW5jdGlvblwiKTsgfVxuICB0aGlzLm5leHQoKTtcblxuICAvLyBJbiBgcmV0dXJuYCAoYW5kIGBicmVha2AvYGNvbnRpbnVlYCksIHRoZSBrZXl3b3JkcyB3aXRoXG4gIC8vIG9wdGlvbmFsIGFyZ3VtZW50cywgd2UgZWFnZXJseSBsb29rIGZvciBhIHNlbWljb2xvbiBvciB0aGVcbiAgLy8gcG9zc2liaWxpdHkgdG8gaW5zZXJ0IG9uZS5cblxuICBpZiAodGhpcy5lYXQodHlwZXMkMS5zZW1pKSB8fCB0aGlzLmluc2VydFNlbWljb2xvbigpKSB7IG5vZGUuYXJndW1lbnQgPSBudWxsOyB9XG4gIGVsc2UgeyBub2RlLmFyZ3VtZW50ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTsgdGhpcy5zZW1pY29sb24oKTsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiUmV0dXJuU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlU3dpdGNoU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5kaXNjcmltaW5hbnQgPSB0aGlzLnBhcnNlUGFyZW5FeHByZXNzaW9uKCk7XG4gIG5vZGUuY2FzZXMgPSBbXTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFjZUwpO1xuICB0aGlzLmxhYmVscy5wdXNoKHN3aXRjaExhYmVsKTtcbiAgdGhpcy5lbnRlclNjb3BlKFNDT1BFX1NXSVRDSCk7XG5cbiAgLy8gU3RhdGVtZW50cyB1bmRlciBtdXN0IGJlIGdyb3VwZWQgKGJ5IGxhYmVsKSBpbiBTd2l0Y2hDYXNlXG4gIC8vIG5vZGVzLiBgY3VyYCBpcyB1c2VkIHRvIGtlZXAgdGhlIG5vZGUgdGhhdCB3ZSBhcmUgY3VycmVudGx5XG4gIC8vIGFkZGluZyBzdGF0ZW1lbnRzIHRvLlxuXG4gIHZhciBjdXI7XG4gIGZvciAodmFyIHNhd0RlZmF1bHQgPSBmYWxzZTsgdGhpcy50eXBlICE9PSB0eXBlcyQxLmJyYWNlUjspIHtcbiAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9jYXNlIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fZGVmYXVsdCkge1xuICAgICAgdmFyIGlzQ2FzZSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fY2FzZTtcbiAgICAgIGlmIChjdXIpIHsgdGhpcy5maW5pc2hOb2RlKGN1ciwgXCJTd2l0Y2hDYXNlXCIpOyB9XG4gICAgICBub2RlLmNhc2VzLnB1c2goY3VyID0gdGhpcy5zdGFydE5vZGUoKSk7XG4gICAgICBjdXIuY29uc2VxdWVudCA9IFtdO1xuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICBpZiAoaXNDYXNlKSB7XG4gICAgICAgIGN1ci50ZXN0ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzYXdEZWZhdWx0KSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLmxhc3RUb2tTdGFydCwgXCJNdWx0aXBsZSBkZWZhdWx0IGNsYXVzZXNcIik7IH1cbiAgICAgICAgc2F3RGVmYXVsdCA9IHRydWU7XG4gICAgICAgIGN1ci50ZXN0ID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29sb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWN1cikgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgICAgY3VyLmNvbnNlcXVlbnQucHVzaCh0aGlzLnBhcnNlU3RhdGVtZW50KG51bGwpKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5leGl0U2NvcGUoKTtcbiAgaWYgKGN1cikgeyB0aGlzLmZpbmlzaE5vZGUoY3VyLCBcIlN3aXRjaENhc2VcIik7IH1cbiAgdGhpcy5uZXh0KCk7IC8vIENsb3NpbmcgYnJhY2VcbiAgdGhpcy5sYWJlbHMucG9wKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJTd2l0Y2hTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VUaHJvd1N0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIGlmIChsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMubGFzdFRva0VuZCwgdGhpcy5zdGFydCkpKVxuICAgIHsgdGhpcy5yYWlzZSh0aGlzLmxhc3RUb2tFbmQsIFwiSWxsZWdhbCBuZXdsaW5lIGFmdGVyIHRocm93XCIpOyB9XG4gIG5vZGUuYXJndW1lbnQgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICB0aGlzLnNlbWljb2xvbigpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiVGhyb3dTdGF0ZW1lbnRcIilcbn07XG5cbi8vIFJldXNlZCBlbXB0eSBhcnJheSBhZGRlZCBmb3Igbm9kZSBmaWVsZHMgdGhhdCBhcmUgYWx3YXlzIGVtcHR5LlxuXG52YXIgZW1wdHkkMSA9IFtdO1xuXG5wcCQ4LnBhcnNlQ2F0Y2hDbGF1c2VQYXJhbSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGFyYW0gPSB0aGlzLnBhcnNlQmluZGluZ0F0b20oKTtcbiAgdmFyIHNpbXBsZSA9IHBhcmFtLnR5cGUgPT09IFwiSWRlbnRpZmllclwiO1xuICB0aGlzLmVudGVyU2NvcGUoc2ltcGxlID8gU0NPUEVfU0lNUExFX0NBVENIIDogMCk7XG4gIHRoaXMuY2hlY2tMVmFsUGF0dGVybihwYXJhbSwgc2ltcGxlID8gQklORF9TSU1QTEVfQ0FUQ0ggOiBCSU5EX0xFWElDQUwpO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuUik7XG5cbiAgcmV0dXJuIHBhcmFtXG59O1xuXG5wcCQ4LnBhcnNlVHJ5U3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5ibG9jayA9IHRoaXMucGFyc2VCbG9jaygpO1xuICBub2RlLmhhbmRsZXIgPSBudWxsO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9jYXRjaCkge1xuICAgIHZhciBjbGF1c2UgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIGlmICh0aGlzLmVhdCh0eXBlcyQxLnBhcmVuTCkpIHtcbiAgICAgIGNsYXVzZS5wYXJhbSA9IHRoaXMucGFyc2VDYXRjaENsYXVzZVBhcmFtKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCAxMCkgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgICAgY2xhdXNlLnBhcmFtID0gbnVsbDtcbiAgICAgIHRoaXMuZW50ZXJTY29wZSgwKTtcbiAgICB9XG4gICAgY2xhdXNlLmJvZHkgPSB0aGlzLnBhcnNlQmxvY2soZmFsc2UpO1xuICAgIHRoaXMuZXhpdFNjb3BlKCk7XG4gICAgbm9kZS5oYW5kbGVyID0gdGhpcy5maW5pc2hOb2RlKGNsYXVzZSwgXCJDYXRjaENsYXVzZVwiKTtcbiAgfVxuICBub2RlLmZpbmFsaXplciA9IHRoaXMuZWF0KHR5cGVzJDEuX2ZpbmFsbHkpID8gdGhpcy5wYXJzZUJsb2NrKCkgOiBudWxsO1xuICBpZiAoIW5vZGUuaGFuZGxlciAmJiAhbm9kZS5maW5hbGl6ZXIpXG4gICAgeyB0aGlzLnJhaXNlKG5vZGUuc3RhcnQsIFwiTWlzc2luZyBjYXRjaCBvciBmaW5hbGx5IGNsYXVzZVwiKTsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiVHJ5U3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlVmFyU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSwga2luZCwgYWxsb3dNaXNzaW5nSW5pdGlhbGl6ZXIpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIHRoaXMucGFyc2VWYXIobm9kZSwgZmFsc2UsIGtpbmQsIGFsbG93TWlzc2luZ0luaXRpYWxpemVyKTtcbiAgdGhpcy5zZW1pY29sb24oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlZhcmlhYmxlRGVjbGFyYXRpb25cIilcbn07XG5cbnBwJDgucGFyc2VXaGlsZVN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUudGVzdCA9IHRoaXMucGFyc2VQYXJlbkV4cHJlc3Npb24oKTtcbiAgdGhpcy5sYWJlbHMucHVzaChsb29wTGFiZWwpO1xuICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KFwid2hpbGVcIik7XG4gIHRoaXMubGFiZWxzLnBvcCgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiV2hpbGVTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VXaXRoU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICBpZiAodGhpcy5zdHJpY3QpIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIid3aXRoJyBpbiBzdHJpY3QgbW9kZVwiKTsgfVxuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5vYmplY3QgPSB0aGlzLnBhcnNlUGFyZW5FeHByZXNzaW9uKCk7XG4gIG5vZGUuYm9keSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoXCJ3aXRoXCIpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiV2l0aFN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZUVtcHR5U3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkVtcHR5U3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlTGFiZWxlZFN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUsIG1heWJlTmFtZSwgZXhwciwgY29udGV4dCkge1xuICBmb3IgKHZhciBpJDEgPSAwLCBsaXN0ID0gdGhpcy5sYWJlbHM7IGkkMSA8IGxpc3QubGVuZ3RoOyBpJDEgKz0gMSlcbiAgICB7XG4gICAgdmFyIGxhYmVsID0gbGlzdFtpJDFdO1xuXG4gICAgaWYgKGxhYmVsLm5hbWUgPT09IG1heWJlTmFtZSlcbiAgICAgIHsgdGhpcy5yYWlzZShleHByLnN0YXJ0LCBcIkxhYmVsICdcIiArIG1heWJlTmFtZSArIFwiJyBpcyBhbHJlYWR5IGRlY2xhcmVkXCIpO1xuICB9IH1cbiAgdmFyIGtpbmQgPSB0aGlzLnR5cGUuaXNMb29wID8gXCJsb29wXCIgOiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuX3N3aXRjaCA/IFwic3dpdGNoXCIgOiBudWxsO1xuICBmb3IgKHZhciBpID0gdGhpcy5sYWJlbHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFiZWwkMSA9IHRoaXMubGFiZWxzW2ldO1xuICAgIGlmIChsYWJlbCQxLnN0YXRlbWVudFN0YXJ0ID09PSBub2RlLnN0YXJ0KSB7XG4gICAgICAvLyBVcGRhdGUgaW5mb3JtYXRpb24gYWJvdXQgcHJldmlvdXMgbGFiZWxzIG9uIHRoaXMgbm9kZVxuICAgICAgbGFiZWwkMS5zdGF0ZW1lbnRTdGFydCA9IHRoaXMuc3RhcnQ7XG4gICAgICBsYWJlbCQxLmtpbmQgPSBraW5kO1xuICAgIH0gZWxzZSB7IGJyZWFrIH1cbiAgfVxuICB0aGlzLmxhYmVscy5wdXNoKHtuYW1lOiBtYXliZU5hbWUsIGtpbmQ6IGtpbmQsIHN0YXRlbWVudFN0YXJ0OiB0aGlzLnN0YXJ0fSk7XG4gIG5vZGUuYm9keSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoY29udGV4dCA/IGNvbnRleHQuaW5kZXhPZihcImxhYmVsXCIpID09PSAtMSA/IGNvbnRleHQgKyBcImxhYmVsXCIgOiBjb250ZXh0IDogXCJsYWJlbFwiKTtcbiAgdGhpcy5sYWJlbHMucG9wKCk7XG4gIG5vZGUubGFiZWwgPSBleHByO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiTGFiZWxlZFN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlLCBleHByKSB7XG4gIG5vZGUuZXhwcmVzc2lvbiA9IGV4cHI7XG4gIHRoaXMuc2VtaWNvbG9uKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJFeHByZXNzaW9uU3RhdGVtZW50XCIpXG59O1xuXG4vLyBQYXJzZSBhIHNlbWljb2xvbi1lbmNsb3NlZCBibG9jayBvZiBzdGF0ZW1lbnRzLCBoYW5kbGluZyBgXCJ1c2Vcbi8vIHN0cmljdFwiYCBkZWNsYXJhdGlvbnMgd2hlbiBgYWxsb3dTdHJpY3RgIGlzIHRydWUgKHVzZWQgZm9yXG4vLyBmdW5jdGlvbiBib2RpZXMpLlxuXG5wcCQ4LnBhcnNlQmxvY2sgPSBmdW5jdGlvbihjcmVhdGVOZXdMZXhpY2FsU2NvcGUsIG5vZGUsIGV4aXRTdHJpY3QpIHtcbiAgaWYgKCBjcmVhdGVOZXdMZXhpY2FsU2NvcGUgPT09IHZvaWQgMCApIGNyZWF0ZU5ld0xleGljYWxTY29wZSA9IHRydWU7XG4gIGlmICggbm9kZSA9PT0gdm9pZCAwICkgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG5cbiAgbm9kZS5ib2R5ID0gW107XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2VMKTtcbiAgaWYgKGNyZWF0ZU5ld0xleGljYWxTY29wZSkgeyB0aGlzLmVudGVyU2NvcGUoMCk7IH1cbiAgd2hpbGUgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5icmFjZVIpIHtcbiAgICB2YXIgc3RtdCA9IHRoaXMucGFyc2VTdGF0ZW1lbnQobnVsbCk7XG4gICAgbm9kZS5ib2R5LnB1c2goc3RtdCk7XG4gIH1cbiAgaWYgKGV4aXRTdHJpY3QpIHsgdGhpcy5zdHJpY3QgPSBmYWxzZTsgfVxuICB0aGlzLm5leHQoKTtcbiAgaWYgKGNyZWF0ZU5ld0xleGljYWxTY29wZSkgeyB0aGlzLmV4aXRTY29wZSgpOyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJCbG9ja1N0YXRlbWVudFwiKVxufTtcblxuLy8gUGFyc2UgYSByZWd1bGFyIGBmb3JgIGxvb3AuIFRoZSBkaXNhbWJpZ3VhdGlvbiBjb2RlIGluXG4vLyBgcGFyc2VTdGF0ZW1lbnRgIHdpbGwgYWxyZWFkeSBoYXZlIHBhcnNlZCB0aGUgaW5pdCBzdGF0ZW1lbnQgb3Jcbi8vIGV4cHJlc3Npb24uXG5cbnBwJDgucGFyc2VGb3IgPSBmdW5jdGlvbihub2RlLCBpbml0KSB7XG4gIG5vZGUuaW5pdCA9IGluaXQ7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuc2VtaSk7XG4gIG5vZGUudGVzdCA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zZW1pID8gbnVsbCA6IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuc2VtaSk7XG4gIG5vZGUudXBkYXRlID0gdGhpcy50eXBlID09PSB0eXBlcyQxLnBhcmVuUiA/IG51bGwgOiB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuUik7XG4gIG5vZGUuYm9keSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoXCJmb3JcIik7XG4gIHRoaXMuZXhpdFNjb3BlKCk7XG4gIHRoaXMubGFiZWxzLnBvcCgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRm9yU3RhdGVtZW50XCIpXG59O1xuXG4vLyBQYXJzZSBhIGBmb3JgL2BpbmAgYW5kIGBmb3JgL2BvZmAgbG9vcCwgd2hpY2ggYXJlIGFsbW9zdFxuLy8gc2FtZSBmcm9tIHBhcnNlcidzIHBlcnNwZWN0aXZlLlxuXG5wcCQ4LnBhcnNlRm9ySW4gPSBmdW5jdGlvbihub2RlLCBpbml0KSB7XG4gIHZhciBpc0ZvckluID0gdGhpcy50eXBlID09PSB0eXBlcyQxLl9pbjtcbiAgdGhpcy5uZXh0KCk7XG5cbiAgaWYgKFxuICAgIGluaXQudHlwZSA9PT0gXCJWYXJpYWJsZURlY2xhcmF0aW9uXCIgJiZcbiAgICBpbml0LmRlY2xhcmF0aW9uc1swXS5pbml0ICE9IG51bGwgJiZcbiAgICAoXG4gICAgICAhaXNGb3JJbiB8fFxuICAgICAgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgOCB8fFxuICAgICAgdGhpcy5zdHJpY3QgfHxcbiAgICAgIGluaXQua2luZCAhPT0gXCJ2YXJcIiB8fFxuICAgICAgaW5pdC5kZWNsYXJhdGlvbnNbMF0uaWQudHlwZSAhPT0gXCJJZGVudGlmaWVyXCJcbiAgICApXG4gICkge1xuICAgIHRoaXMucmFpc2UoXG4gICAgICBpbml0LnN0YXJ0LFxuICAgICAgKChpc0ZvckluID8gXCJmb3ItaW5cIiA6IFwiZm9yLW9mXCIpICsgXCIgbG9vcCB2YXJpYWJsZSBkZWNsYXJhdGlvbiBtYXkgbm90IGhhdmUgYW4gaW5pdGlhbGl6ZXJcIilcbiAgICApO1xuICB9XG4gIG5vZGUubGVmdCA9IGluaXQ7XG4gIG5vZGUucmlnaHQgPSBpc0ZvckluID8gdGhpcy5wYXJzZUV4cHJlc3Npb24oKSA6IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuUik7XG4gIG5vZGUuYm9keSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoXCJmb3JcIik7XG4gIHRoaXMuZXhpdFNjb3BlKCk7XG4gIHRoaXMubGFiZWxzLnBvcCgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIGlzRm9ySW4gPyBcIkZvckluU3RhdGVtZW50XCIgOiBcIkZvck9mU3RhdGVtZW50XCIpXG59O1xuXG4vLyBQYXJzZSBhIGxpc3Qgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zLlxuXG5wcCQ4LnBhcnNlVmFyID0gZnVuY3Rpb24obm9kZSwgaXNGb3IsIGtpbmQsIGFsbG93TWlzc2luZ0luaXRpYWxpemVyKSB7XG4gIG5vZGUuZGVjbGFyYXRpb25zID0gW107XG4gIG5vZGUua2luZCA9IGtpbmQ7XG4gIGZvciAoOzspIHtcbiAgICB2YXIgZGVjbCA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5wYXJzZVZhcklkKGRlY2wsIGtpbmQpO1xuICAgIGlmICh0aGlzLmVhdCh0eXBlcyQxLmVxKSkge1xuICAgICAgZGVjbC5pbml0ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGlzRm9yKTtcbiAgICB9IGVsc2UgaWYgKCFhbGxvd01pc3NpbmdJbml0aWFsaXplciAmJiBraW5kID09PSBcImNvbnN0XCIgJiYgISh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2luIHx8ICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiB0aGlzLmlzQ29udGV4dHVhbChcIm9mXCIpKSkpIHtcbiAgICAgIHRoaXMudW5leHBlY3RlZCgpO1xuICAgIH0gZWxzZSBpZiAoIWFsbG93TWlzc2luZ0luaXRpYWxpemVyICYmIChraW5kID09PSBcInVzaW5nXCIgfHwga2luZCA9PT0gXCJhd2FpdCB1c2luZ1wiKSAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTcgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLl9pbiAmJiAhdGhpcy5pc0NvbnRleHR1YWwoXCJvZlwiKSkge1xuICAgICAgdGhpcy5yYWlzZSh0aGlzLmxhc3RUb2tFbmQsIChcIk1pc3NpbmcgaW5pdGlhbGl6ZXIgaW4gXCIgKyBraW5kICsgXCIgZGVjbGFyYXRpb25cIikpO1xuICAgIH0gZWxzZSBpZiAoIWFsbG93TWlzc2luZ0luaXRpYWxpemVyICYmIGRlY2wuaWQudHlwZSAhPT0gXCJJZGVudGlmaWVyXCIgJiYgIShpc0ZvciAmJiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9pbiB8fCB0aGlzLmlzQ29udGV4dHVhbChcIm9mXCIpKSkpIHtcbiAgICAgIHRoaXMucmFpc2UodGhpcy5sYXN0VG9rRW5kLCBcIkNvbXBsZXggYmluZGluZyBwYXR0ZXJucyByZXF1aXJlIGFuIGluaXRpYWxpemF0aW9uIHZhbHVlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWNsLmluaXQgPSBudWxsO1xuICAgIH1cbiAgICBub2RlLmRlY2xhcmF0aW9ucy5wdXNoKHRoaXMuZmluaXNoTm9kZShkZWNsLCBcIlZhcmlhYmxlRGVjbGFyYXRvclwiKSk7XG4gICAgaWYgKCF0aGlzLmVhdCh0eXBlcyQxLmNvbW1hKSkgeyBicmVhayB9XG4gIH1cbiAgcmV0dXJuIG5vZGVcbn07XG5cbnBwJDgucGFyc2VWYXJJZCA9IGZ1bmN0aW9uKGRlY2wsIGtpbmQpIHtcbiAgZGVjbC5pZCA9IGtpbmQgPT09IFwidXNpbmdcIiB8fCBraW5kID09PSBcImF3YWl0IHVzaW5nXCJcbiAgICA/IHRoaXMucGFyc2VJZGVudCgpXG4gICAgOiB0aGlzLnBhcnNlQmluZGluZ0F0b20oKTtcblxuICB0aGlzLmNoZWNrTFZhbFBhdHRlcm4oZGVjbC5pZCwga2luZCA9PT0gXCJ2YXJcIiA/IEJJTkRfVkFSIDogQklORF9MRVhJQ0FMLCBmYWxzZSk7XG59O1xuXG52YXIgRlVOQ19TVEFURU1FTlQgPSAxLCBGVU5DX0hBTkdJTkdfU1RBVEVNRU5UID0gMiwgRlVOQ19OVUxMQUJMRV9JRCA9IDQ7XG5cbi8vIFBhcnNlIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gb3IgbGl0ZXJhbCAoZGVwZW5kaW5nIG9uIHRoZVxuLy8gYHN0YXRlbWVudCAmIEZVTkNfU1RBVEVNRU5UYCkuXG5cbi8vIFJlbW92ZSBgYWxsb3dFeHByZXNzaW9uQm9keWAgZm9yIDcuMC4wLCBhcyBpdCBpcyBvbmx5IGNhbGxlZCB3aXRoIGZhbHNlXG5wcCQ4LnBhcnNlRnVuY3Rpb24gPSBmdW5jdGlvbihub2RlLCBzdGF0ZW1lbnQsIGFsbG93RXhwcmVzc2lvbkJvZHksIGlzQXN5bmMsIGZvckluaXQpIHtcbiAgdGhpcy5pbml0RnVuY3Rpb24obm9kZSk7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSB8fCB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiAhaXNBc3luYykge1xuICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RhciAmJiAoc3RhdGVtZW50ICYgRlVOQ19IQU5HSU5HX1NUQVRFTUVOVCkpXG4gICAgICB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgbm9kZS5nZW5lcmF0b3IgPSB0aGlzLmVhdCh0eXBlcyQxLnN0YXIpO1xuICB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOClcbiAgICB7IG5vZGUuYXN5bmMgPSAhIWlzQXN5bmM7IH1cblxuICBpZiAoc3RhdGVtZW50ICYgRlVOQ19TVEFURU1FTlQpIHtcbiAgICBub2RlLmlkID0gKHN0YXRlbWVudCAmIEZVTkNfTlVMTEFCTEVfSUQpICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5uYW1lID8gbnVsbCA6IHRoaXMucGFyc2VJZGVudCgpO1xuICAgIGlmIChub2RlLmlkICYmICEoc3RhdGVtZW50ICYgRlVOQ19IQU5HSU5HX1NUQVRFTUVOVCkpXG4gICAgICAvLyBJZiBpdCBpcyBhIHJlZ3VsYXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gaW4gc2xvcHB5IG1vZGUsIHRoZW4gaXQgaXNcbiAgICAgIC8vIHN1YmplY3QgdG8gQW5uZXggQiBzZW1hbnRpY3MgKEJJTkRfRlVOQ1RJT04pLiBPdGhlcndpc2UsIHRoZSBiaW5kaW5nXG4gICAgICAvLyBtb2RlIGRlcGVuZHMgb24gcHJvcGVydGllcyBvZiB0aGUgY3VycmVudCBzY29wZSAoc2VlXG4gICAgICAvLyB0cmVhdEZ1bmN0aW9uc0FzVmFyKS5cbiAgICAgIHsgdGhpcy5jaGVja0xWYWxTaW1wbGUobm9kZS5pZCwgKHRoaXMuc3RyaWN0IHx8IG5vZGUuZ2VuZXJhdG9yIHx8IG5vZGUuYXN5bmMpID8gdGhpcy50cmVhdEZ1bmN0aW9uc0FzVmFyID8gQklORF9WQVIgOiBCSU5EX0xFWElDQUwgOiBCSU5EX0ZVTkNUSU9OKTsgfVxuICB9XG5cbiAgdmFyIG9sZFlpZWxkUG9zID0gdGhpcy55aWVsZFBvcywgb2xkQXdhaXRQb3MgPSB0aGlzLmF3YWl0UG9zLCBvbGRBd2FpdElkZW50UG9zID0gdGhpcy5hd2FpdElkZW50UG9zO1xuICB0aGlzLnlpZWxkUG9zID0gMDtcbiAgdGhpcy5hd2FpdFBvcyA9IDA7XG4gIHRoaXMuYXdhaXRJZGVudFBvcyA9IDA7XG4gIHRoaXMuZW50ZXJTY29wZShmdW5jdGlvbkZsYWdzKG5vZGUuYXN5bmMsIG5vZGUuZ2VuZXJhdG9yKSk7XG5cbiAgaWYgKCEoc3RhdGVtZW50ICYgRlVOQ19TVEFURU1FTlQpKVxuICAgIHsgbm9kZS5pZCA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lID8gdGhpcy5wYXJzZUlkZW50KCkgOiBudWxsOyB9XG5cbiAgdGhpcy5wYXJzZUZ1bmN0aW9uUGFyYW1zKG5vZGUpO1xuICB0aGlzLnBhcnNlRnVuY3Rpb25Cb2R5KG5vZGUsIGFsbG93RXhwcmVzc2lvbkJvZHksIGZhbHNlLCBmb3JJbml0KTtcblxuICB0aGlzLnlpZWxkUG9zID0gb2xkWWllbGRQb3M7XG4gIHRoaXMuYXdhaXRQb3MgPSBvbGRBd2FpdFBvcztcbiAgdGhpcy5hd2FpdElkZW50UG9zID0gb2xkQXdhaXRJZGVudFBvcztcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCAoc3RhdGVtZW50ICYgRlVOQ19TVEFURU1FTlQpID8gXCJGdW5jdGlvbkRlY2xhcmF0aW9uXCIgOiBcIkZ1bmN0aW9uRXhwcmVzc2lvblwiKVxufTtcblxucHAkOC5wYXJzZUZ1bmN0aW9uUGFyYW1zID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuTCk7XG4gIG5vZGUucGFyYW1zID0gdGhpcy5wYXJzZUJpbmRpbmdMaXN0KHR5cGVzJDEucGFyZW5SLCBmYWxzZSwgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgpO1xuICB0aGlzLmNoZWNrWWllbGRBd2FpdEluRGVmYXVsdFBhcmFtcygpO1xufTtcblxuLy8gUGFyc2UgYSBjbGFzcyBkZWNsYXJhdGlvbiBvciBsaXRlcmFsIChkZXBlbmRpbmcgb24gdGhlXG4vLyBgaXNTdGF0ZW1lbnRgIHBhcmFtZXRlcikuXG5cbnBwJDgucGFyc2VDbGFzcyA9IGZ1bmN0aW9uKG5vZGUsIGlzU3RhdGVtZW50KSB7XG4gIHRoaXMubmV4dCgpO1xuXG4gIC8vIGVjbWEtMjYyIDE0LjYgQ2xhc3MgRGVmaW5pdGlvbnNcbiAgLy8gQSBjbGFzcyBkZWZpbml0aW9uIGlzIGFsd2F5cyBzdHJpY3QgbW9kZSBjb2RlLlxuICB2YXIgb2xkU3RyaWN0ID0gdGhpcy5zdHJpY3Q7XG4gIHRoaXMuc3RyaWN0ID0gdHJ1ZTtcblxuICB0aGlzLnBhcnNlQ2xhc3NJZChub2RlLCBpc1N0YXRlbWVudCk7XG4gIHRoaXMucGFyc2VDbGFzc1N1cGVyKG5vZGUpO1xuICB2YXIgcHJpdmF0ZU5hbWVNYXAgPSB0aGlzLmVudGVyQ2xhc3NCb2R5KCk7XG4gIHZhciBjbGFzc0JvZHkgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB2YXIgaGFkQ29uc3RydWN0b3IgPSBmYWxzZTtcbiAgY2xhc3NCb2R5LmJvZHkgPSBbXTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFjZUwpO1xuICB3aGlsZSAodGhpcy50eXBlICE9PSB0eXBlcyQxLmJyYWNlUikge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5wYXJzZUNsYXNzRWxlbWVudChub2RlLnN1cGVyQ2xhc3MgIT09IG51bGwpO1xuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICBjbGFzc0JvZHkuYm9keS5wdXNoKGVsZW1lbnQpO1xuICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PT0gXCJNZXRob2REZWZpbml0aW9uXCIgJiYgZWxlbWVudC5raW5kID09PSBcImNvbnN0cnVjdG9yXCIpIHtcbiAgICAgICAgaWYgKGhhZENvbnN0cnVjdG9yKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShlbGVtZW50LnN0YXJ0LCBcIkR1cGxpY2F0ZSBjb25zdHJ1Y3RvciBpbiB0aGUgc2FtZSBjbGFzc1wiKTsgfVxuICAgICAgICBoYWRDb25zdHJ1Y3RvciA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGVsZW1lbnQua2V5ICYmIGVsZW1lbnQua2V5LnR5cGUgPT09IFwiUHJpdmF0ZUlkZW50aWZpZXJcIiAmJiBpc1ByaXZhdGVOYW1lQ29uZmxpY3RlZChwcml2YXRlTmFtZU1hcCwgZWxlbWVudCkpIHtcbiAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGVsZW1lbnQua2V5LnN0YXJ0LCAoXCJJZGVudGlmaWVyICcjXCIgKyAoZWxlbWVudC5rZXkubmFtZSkgKyBcIicgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZFwiKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHRoaXMuc3RyaWN0ID0gb2xkU3RyaWN0O1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5ib2R5ID0gdGhpcy5maW5pc2hOb2RlKGNsYXNzQm9keSwgXCJDbGFzc0JvZHlcIik7XG4gIHRoaXMuZXhpdENsYXNzQm9keSgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIGlzU3RhdGVtZW50ID8gXCJDbGFzc0RlY2xhcmF0aW9uXCIgOiBcIkNsYXNzRXhwcmVzc2lvblwiKVxufTtcblxucHAkOC5wYXJzZUNsYXNzRWxlbWVudCA9IGZ1bmN0aW9uKGNvbnN0cnVjdG9yQWxsb3dzU3VwZXIpIHtcbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuc2VtaSkpIHsgcmV0dXJuIG51bGwgfVxuXG4gIHZhciBlY21hVmVyc2lvbiA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbjtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB2YXIga2V5TmFtZSA9IFwiXCI7XG4gIHZhciBpc0dlbmVyYXRvciA9IGZhbHNlO1xuICB2YXIgaXNBc3luYyA9IGZhbHNlO1xuICB2YXIga2luZCA9IFwibWV0aG9kXCI7XG4gIHZhciBpc1N0YXRpYyA9IGZhbHNlO1xuXG4gIGlmICh0aGlzLmVhdENvbnRleHR1YWwoXCJzdGF0aWNcIikpIHtcbiAgICAvLyBQYXJzZSBzdGF0aWMgaW5pdCBibG9ja1xuICAgIGlmIChlY21hVmVyc2lvbiA+PSAxMyAmJiB0aGlzLmVhdCh0eXBlcyQxLmJyYWNlTCkpIHtcbiAgICAgIHRoaXMucGFyc2VDbGFzc1N0YXRpY0Jsb2NrKG5vZGUpO1xuICAgICAgcmV0dXJuIG5vZGVcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNDbGFzc0VsZW1lbnROYW1lU3RhcnQoKSB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3Rhcikge1xuICAgICAgaXNTdGF0aWMgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBrZXlOYW1lID0gXCJzdGF0aWNcIjtcbiAgICB9XG4gIH1cbiAgbm9kZS5zdGF0aWMgPSBpc1N0YXRpYztcbiAgaWYgKCFrZXlOYW1lICYmIGVjbWFWZXJzaW9uID49IDggJiYgdGhpcy5lYXRDb250ZXh0dWFsKFwiYXN5bmNcIikpIHtcbiAgICBpZiAoKHRoaXMuaXNDbGFzc0VsZW1lbnROYW1lU3RhcnQoKSB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RhcikgJiYgIXRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkpIHtcbiAgICAgIGlzQXN5bmMgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBrZXlOYW1lID0gXCJhc3luY1wiO1xuICAgIH1cbiAgfVxuICBpZiAoIWtleU5hbWUgJiYgKGVjbWFWZXJzaW9uID49IDkgfHwgIWlzQXN5bmMpICYmIHRoaXMuZWF0KHR5cGVzJDEuc3RhcikpIHtcbiAgICBpc0dlbmVyYXRvciA9IHRydWU7XG4gIH1cbiAgaWYgKCFrZXlOYW1lICYmICFpc0FzeW5jICYmICFpc0dlbmVyYXRvcikge1xuICAgIHZhciBsYXN0VmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgIGlmICh0aGlzLmVhdENvbnRleHR1YWwoXCJnZXRcIikgfHwgdGhpcy5lYXRDb250ZXh0dWFsKFwic2V0XCIpKSB7XG4gICAgICBpZiAodGhpcy5pc0NsYXNzRWxlbWVudE5hbWVTdGFydCgpKSB7XG4gICAgICAgIGtpbmQgPSBsYXN0VmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrZXlOYW1lID0gbGFzdFZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlIGVsZW1lbnQgbmFtZVxuICBpZiAoa2V5TmFtZSkge1xuICAgIC8vICdhc3luYycsICdnZXQnLCAnc2V0Jywgb3IgJ3N0YXRpYycgd2VyZSBub3QgYSBrZXl3b3JkIGNvbnRleHR1YWxseS5cbiAgICAvLyBUaGUgbGFzdCB0b2tlbiBpcyBhbnkgb2YgdGhvc2UuIE1ha2UgaXQgdGhlIGVsZW1lbnQgbmFtZS5cbiAgICBub2RlLmNvbXB1dGVkID0gZmFsc2U7XG4gICAgbm9kZS5rZXkgPSB0aGlzLnN0YXJ0Tm9kZUF0KHRoaXMubGFzdFRva1N0YXJ0LCB0aGlzLmxhc3RUb2tTdGFydExvYyk7XG4gICAgbm9kZS5rZXkubmFtZSA9IGtleU5hbWU7XG4gICAgdGhpcy5maW5pc2hOb2RlKG5vZGUua2V5LCBcIklkZW50aWZpZXJcIik7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJzZUNsYXNzRWxlbWVudE5hbWUobm9kZSk7XG4gIH1cblxuICAvLyBQYXJzZSBlbGVtZW50IHZhbHVlXG4gIGlmIChlY21hVmVyc2lvbiA8IDEzIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wYXJlbkwgfHwga2luZCAhPT0gXCJtZXRob2RcIiB8fCBpc0dlbmVyYXRvciB8fCBpc0FzeW5jKSB7XG4gICAgdmFyIGlzQ29uc3RydWN0b3IgPSAhbm9kZS5zdGF0aWMgJiYgY2hlY2tLZXlOYW1lKG5vZGUsIFwiY29uc3RydWN0b3JcIik7XG4gICAgdmFyIGFsbG93c0RpcmVjdFN1cGVyID0gaXNDb25zdHJ1Y3RvciAmJiBjb25zdHJ1Y3RvckFsbG93c1N1cGVyO1xuICAgIC8vIENvdWxkbid0IG1vdmUgdGhpcyBjaGVjayBpbnRvIHRoZSAncGFyc2VDbGFzc01ldGhvZCcgbWV0aG9kIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5LlxuICAgIGlmIChpc0NvbnN0cnVjdG9yICYmIGtpbmQgIT09IFwibWV0aG9kXCIpIHsgdGhpcy5yYWlzZShub2RlLmtleS5zdGFydCwgXCJDb25zdHJ1Y3RvciBjYW4ndCBoYXZlIGdldC9zZXQgbW9kaWZpZXJcIik7IH1cbiAgICBub2RlLmtpbmQgPSBpc0NvbnN0cnVjdG9yID8gXCJjb25zdHJ1Y3RvclwiIDoga2luZDtcbiAgICB0aGlzLnBhcnNlQ2xhc3NNZXRob2Qobm9kZSwgaXNHZW5lcmF0b3IsIGlzQXN5bmMsIGFsbG93c0RpcmVjdFN1cGVyKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnNlQ2xhc3NGaWVsZChub2RlKTtcbiAgfVxuXG4gIHJldHVybiBub2RlXG59O1xuXG5wcCQ4LmlzQ2xhc3NFbGVtZW50TmFtZVN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAoXG4gICAgdGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUgfHxcbiAgICB0aGlzLnR5cGUgPT09IHR5cGVzJDEucHJpdmF0ZUlkIHx8XG4gICAgdGhpcy50eXBlID09PSB0eXBlcyQxLm51bSB8fFxuICAgIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdHJpbmcgfHxcbiAgICB0aGlzLnR5cGUgPT09IHR5cGVzJDEuYnJhY2tldEwgfHxcbiAgICB0aGlzLnR5cGUua2V5d29yZFxuICApXG59O1xuXG5wcCQ4LnBhcnNlQ2xhc3NFbGVtZW50TmFtZSA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wcml2YXRlSWQpIHtcbiAgICBpZiAodGhpcy52YWx1ZSA9PT0gXCJjb25zdHJ1Y3RvclwiKSB7XG4gICAgICB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiQ2xhc3NlcyBjYW4ndCBoYXZlIGFuIGVsZW1lbnQgbmFtZWQgJyNjb25zdHJ1Y3RvcidcIik7XG4gICAgfVxuICAgIGVsZW1lbnQuY29tcHV0ZWQgPSBmYWxzZTtcbiAgICBlbGVtZW50LmtleSA9IHRoaXMucGFyc2VQcml2YXRlSWRlbnQoKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnNlUHJvcGVydHlOYW1lKGVsZW1lbnQpO1xuICB9XG59O1xuXG5wcCQ4LnBhcnNlQ2xhc3NNZXRob2QgPSBmdW5jdGlvbihtZXRob2QsIGlzR2VuZXJhdG9yLCBpc0FzeW5jLCBhbGxvd3NEaXJlY3RTdXBlcikge1xuICAvLyBDaGVjayBrZXkgYW5kIGZsYWdzXG4gIHZhciBrZXkgPSBtZXRob2Qua2V5O1xuICBpZiAobWV0aG9kLmtpbmQgPT09IFwiY29uc3RydWN0b3JcIikge1xuICAgIGlmIChpc0dlbmVyYXRvcikgeyB0aGlzLnJhaXNlKGtleS5zdGFydCwgXCJDb25zdHJ1Y3RvciBjYW4ndCBiZSBhIGdlbmVyYXRvclwiKTsgfVxuICAgIGlmIChpc0FzeW5jKSB7IHRoaXMucmFpc2Uoa2V5LnN0YXJ0LCBcIkNvbnN0cnVjdG9yIGNhbid0IGJlIGFuIGFzeW5jIG1ldGhvZFwiKTsgfVxuICB9IGVsc2UgaWYgKG1ldGhvZC5zdGF0aWMgJiYgY2hlY2tLZXlOYW1lKG1ldGhvZCwgXCJwcm90b3R5cGVcIikpIHtcbiAgICB0aGlzLnJhaXNlKGtleS5zdGFydCwgXCJDbGFzc2VzIG1heSBub3QgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBuYW1lZCBwcm90b3R5cGVcIik7XG4gIH1cblxuICAvLyBQYXJzZSB2YWx1ZVxuICB2YXIgdmFsdWUgPSBtZXRob2QudmFsdWUgPSB0aGlzLnBhcnNlTWV0aG9kKGlzR2VuZXJhdG9yLCBpc0FzeW5jLCBhbGxvd3NEaXJlY3RTdXBlcik7XG5cbiAgLy8gQ2hlY2sgdmFsdWVcbiAgaWYgKG1ldGhvZC5raW5kID09PSBcImdldFwiICYmIHZhbHVlLnBhcmFtcy5sZW5ndGggIT09IDApXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodmFsdWUuc3RhcnQsIFwiZ2V0dGVyIHNob3VsZCBoYXZlIG5vIHBhcmFtc1wiKTsgfVxuICBpZiAobWV0aG9kLmtpbmQgPT09IFwic2V0XCIgJiYgdmFsdWUucGFyYW1zLmxlbmd0aCAhPT0gMSlcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh2YWx1ZS5zdGFydCwgXCJzZXR0ZXIgc2hvdWxkIGhhdmUgZXhhY3RseSBvbmUgcGFyYW1cIik7IH1cbiAgaWYgKG1ldGhvZC5raW5kID09PSBcInNldFwiICYmIHZhbHVlLnBhcmFtc1swXS50eXBlID09PSBcIlJlc3RFbGVtZW50XCIpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodmFsdWUucGFyYW1zWzBdLnN0YXJ0LCBcIlNldHRlciBjYW5ub3QgdXNlIHJlc3QgcGFyYW1zXCIpOyB9XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShtZXRob2QsIFwiTWV0aG9kRGVmaW5pdGlvblwiKVxufTtcblxucHAkOC5wYXJzZUNsYXNzRmllbGQgPSBmdW5jdGlvbihmaWVsZCkge1xuICBpZiAoY2hlY2tLZXlOYW1lKGZpZWxkLCBcImNvbnN0cnVjdG9yXCIpKSB7XG4gICAgdGhpcy5yYWlzZShmaWVsZC5rZXkuc3RhcnQsIFwiQ2xhc3NlcyBjYW4ndCBoYXZlIGEgZmllbGQgbmFtZWQgJ2NvbnN0cnVjdG9yJ1wiKTtcbiAgfSBlbHNlIGlmIChmaWVsZC5zdGF0aWMgJiYgY2hlY2tLZXlOYW1lKGZpZWxkLCBcInByb3RvdHlwZVwiKSkge1xuICAgIHRoaXMucmFpc2UoZmllbGQua2V5LnN0YXJ0LCBcIkNsYXNzZXMgY2FuJ3QgaGF2ZSBhIHN0YXRpYyBmaWVsZCBuYW1lZCAncHJvdG90eXBlJ1wiKTtcbiAgfVxuXG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLmVxKSkge1xuICAgIC8vIFRvIHJhaXNlIFN5bnRheEVycm9yIGlmICdhcmd1bWVudHMnIGV4aXN0cyBpbiB0aGUgaW5pdGlhbGl6ZXIuXG4gICAgdGhpcy5lbnRlclNjb3BlKFNDT1BFX0NMQVNTX0ZJRUxEX0lOSVQgfCBTQ09QRV9TVVBFUik7XG4gICAgZmllbGQudmFsdWUgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcbiAgICB0aGlzLmV4aXRTY29wZSgpO1xuICB9IGVsc2Uge1xuICAgIGZpZWxkLnZhbHVlID0gbnVsbDtcbiAgfVxuICB0aGlzLnNlbWljb2xvbigpO1xuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUoZmllbGQsIFwiUHJvcGVydHlEZWZpbml0aW9uXCIpXG59O1xuXG5wcCQ4LnBhcnNlQ2xhc3NTdGF0aWNCbG9jayA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgbm9kZS5ib2R5ID0gW107XG5cbiAgdmFyIG9sZExhYmVscyA9IHRoaXMubGFiZWxzO1xuICB0aGlzLmxhYmVscyA9IFtdO1xuICB0aGlzLmVudGVyU2NvcGUoU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLIHwgU0NPUEVfU1VQRVIpO1xuICB3aGlsZSAodGhpcy50eXBlICE9PSB0eXBlcyQxLmJyYWNlUikge1xuICAgIHZhciBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudChudWxsKTtcbiAgICBub2RlLmJvZHkucHVzaChzdG10KTtcbiAgfVxuICB0aGlzLm5leHQoKTtcbiAgdGhpcy5leGl0U2NvcGUoKTtcbiAgdGhpcy5sYWJlbHMgPSBvbGRMYWJlbHM7XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlN0YXRpY0Jsb2NrXCIpXG59O1xuXG5wcCQ4LnBhcnNlQ2xhc3NJZCA9IGZ1bmN0aW9uKG5vZGUsIGlzU3RhdGVtZW50KSB7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSkge1xuICAgIG5vZGUuaWQgPSB0aGlzLnBhcnNlSWRlbnQoKTtcbiAgICBpZiAoaXNTdGF0ZW1lbnQpXG4gICAgICB7IHRoaXMuY2hlY2tMVmFsU2ltcGxlKG5vZGUuaWQsIEJJTkRfTEVYSUNBTCwgZmFsc2UpOyB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGlzU3RhdGVtZW50ID09PSB0cnVlKVxuICAgICAgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIG5vZGUuaWQgPSBudWxsO1xuICB9XG59O1xuXG5wcCQ4LnBhcnNlQ2xhc3NTdXBlciA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgbm9kZS5zdXBlckNsYXNzID0gdGhpcy5lYXQodHlwZXMkMS5fZXh0ZW5kcykgPyB0aGlzLnBhcnNlRXhwclN1YnNjcmlwdHMobnVsbCwgZmFsc2UpIDogbnVsbDtcbn07XG5cbnBwJDguZW50ZXJDbGFzc0JvZHkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGVsZW1lbnQgPSB7ZGVjbGFyZWQ6IE9iamVjdC5jcmVhdGUobnVsbCksIHVzZWQ6IFtdfTtcbiAgdGhpcy5wcml2YXRlTmFtZVN0YWNrLnB1c2goZWxlbWVudCk7XG4gIHJldHVybiBlbGVtZW50LmRlY2xhcmVkXG59O1xuXG5wcCQ4LmV4aXRDbGFzc0JvZHkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlZiA9IHRoaXMucHJpdmF0ZU5hbWVTdGFjay5wb3AoKTtcbiAgdmFyIGRlY2xhcmVkID0gcmVmLmRlY2xhcmVkO1xuICB2YXIgdXNlZCA9IHJlZi51c2VkO1xuICBpZiAoIXRoaXMub3B0aW9ucy5jaGVja1ByaXZhdGVGaWVsZHMpIHsgcmV0dXJuIH1cbiAgdmFyIGxlbiA9IHRoaXMucHJpdmF0ZU5hbWVTdGFjay5sZW5ndGg7XG4gIHZhciBwYXJlbnQgPSBsZW4gPT09IDAgPyBudWxsIDogdGhpcy5wcml2YXRlTmFtZVN0YWNrW2xlbiAtIDFdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZWQubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaWQgPSB1c2VkW2ldO1xuICAgIGlmICghaGFzT3duKGRlY2xhcmVkLCBpZC5uYW1lKSkge1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwYXJlbnQudXNlZC5wdXNoKGlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShpZC5zdGFydCwgKFwiUHJpdmF0ZSBmaWVsZCAnI1wiICsgKGlkLm5hbWUpICsgXCInIG11c3QgYmUgZGVjbGFyZWQgaW4gYW4gZW5jbG9zaW5nIGNsYXNzXCIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGlzUHJpdmF0ZU5hbWVDb25mbGljdGVkKHByaXZhdGVOYW1lTWFwLCBlbGVtZW50KSB7XG4gIHZhciBuYW1lID0gZWxlbWVudC5rZXkubmFtZTtcbiAgdmFyIGN1cnIgPSBwcml2YXRlTmFtZU1hcFtuYW1lXTtcblxuICB2YXIgbmV4dCA9IFwidHJ1ZVwiO1xuICBpZiAoZWxlbWVudC50eXBlID09PSBcIk1ldGhvZERlZmluaXRpb25cIiAmJiAoZWxlbWVudC5raW5kID09PSBcImdldFwiIHx8IGVsZW1lbnQua2luZCA9PT0gXCJzZXRcIikpIHtcbiAgICBuZXh0ID0gKGVsZW1lbnQuc3RhdGljID8gXCJzXCIgOiBcImlcIikgKyBlbGVtZW50LmtpbmQ7XG4gIH1cblxuICAvLyBgY2xhc3MgeyBnZXQgI2EoKXt9OyBzdGF0aWMgc2V0ICNhKF8pe30gfWAgaXMgYWxzbyBjb25mbGljdC5cbiAgaWYgKFxuICAgIGN1cnIgPT09IFwiaWdldFwiICYmIG5leHQgPT09IFwiaXNldFwiIHx8XG4gICAgY3VyciA9PT0gXCJpc2V0XCIgJiYgbmV4dCA9PT0gXCJpZ2V0XCIgfHxcbiAgICBjdXJyID09PSBcInNnZXRcIiAmJiBuZXh0ID09PSBcInNzZXRcIiB8fFxuICAgIGN1cnIgPT09IFwic3NldFwiICYmIG5leHQgPT09IFwic2dldFwiXG4gICkge1xuICAgIHByaXZhdGVOYW1lTWFwW25hbWVdID0gXCJ0cnVlXCI7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSBpZiAoIWN1cnIpIHtcbiAgICBwcml2YXRlTmFtZU1hcFtuYW1lXSA9IG5leHQ7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGVja0tleU5hbWUobm9kZSwgbmFtZSkge1xuICB2YXIgY29tcHV0ZWQgPSBub2RlLmNvbXB1dGVkO1xuICB2YXIga2V5ID0gbm9kZS5rZXk7XG4gIHJldHVybiAhY29tcHV0ZWQgJiYgKFxuICAgIGtleS50eXBlID09PSBcIklkZW50aWZpZXJcIiAmJiBrZXkubmFtZSA9PT0gbmFtZSB8fFxuICAgIGtleS50eXBlID09PSBcIkxpdGVyYWxcIiAmJiBrZXkudmFsdWUgPT09IG5hbWVcbiAgKVxufVxuXG4vLyBQYXJzZXMgbW9kdWxlIGV4cG9ydCBkZWNsYXJhdGlvbi5cblxucHAkOC5wYXJzZUV4cG9ydEFsbERlY2xhcmF0aW9uID0gZnVuY3Rpb24obm9kZSwgZXhwb3J0cykge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDExKSB7XG4gICAgaWYgKHRoaXMuZWF0Q29udGV4dHVhbChcImFzXCIpKSB7XG4gICAgICBub2RlLmV4cG9ydGVkID0gdGhpcy5wYXJzZU1vZHVsZUV4cG9ydE5hbWUoKTtcbiAgICAgIHRoaXMuY2hlY2tFeHBvcnQoZXhwb3J0cywgbm9kZS5leHBvcnRlZCwgdGhpcy5sYXN0VG9rU3RhcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLmV4cG9ydGVkID0gbnVsbDtcbiAgICB9XG4gIH1cbiAgdGhpcy5leHBlY3RDb250ZXh0dWFsKFwiZnJvbVwiKTtcbiAgaWYgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5zdHJpbmcpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgbm9kZS5zb3VyY2UgPSB0aGlzLnBhcnNlRXhwckF0b20oKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNilcbiAgICB7IG5vZGUuYXR0cmlidXRlcyA9IHRoaXMucGFyc2VXaXRoQ2xhdXNlKCk7IH1cbiAgdGhpcy5zZW1pY29sb24oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkV4cG9ydEFsbERlY2xhcmF0aW9uXCIpXG59O1xuXG5wcCQ4LnBhcnNlRXhwb3J0ID0gZnVuY3Rpb24obm9kZSwgZXhwb3J0cykge1xuICB0aGlzLm5leHQoKTtcbiAgLy8gZXhwb3J0ICogZnJvbSAnLi4uJ1xuICBpZiAodGhpcy5lYXQodHlwZXMkMS5zdGFyKSkge1xuICAgIHJldHVybiB0aGlzLnBhcnNlRXhwb3J0QWxsRGVjbGFyYXRpb24obm9kZSwgZXhwb3J0cylcbiAgfVxuICBpZiAodGhpcy5lYXQodHlwZXMkMS5fZGVmYXVsdCkpIHsgLy8gZXhwb3J0IGRlZmF1bHQgLi4uXG4gICAgdGhpcy5jaGVja0V4cG9ydChleHBvcnRzLCBcImRlZmF1bHRcIiwgdGhpcy5sYXN0VG9rU3RhcnQpO1xuICAgIG5vZGUuZGVjbGFyYXRpb24gPSB0aGlzLnBhcnNlRXhwb3J0RGVmYXVsdERlY2xhcmF0aW9uKCk7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkV4cG9ydERlZmF1bHREZWNsYXJhdGlvblwiKVxuICB9XG4gIC8vIGV4cG9ydCB2YXJ8Y29uc3R8bGV0fGZ1bmN0aW9ufGNsYXNzIC4uLlxuICBpZiAodGhpcy5zaG91bGRQYXJzZUV4cG9ydFN0YXRlbWVudCgpKSB7XG4gICAgbm9kZS5kZWNsYXJhdGlvbiA9IHRoaXMucGFyc2VFeHBvcnREZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAobm9kZS5kZWNsYXJhdGlvbi50eXBlID09PSBcIlZhcmlhYmxlRGVjbGFyYXRpb25cIilcbiAgICAgIHsgdGhpcy5jaGVja1ZhcmlhYmxlRXhwb3J0KGV4cG9ydHMsIG5vZGUuZGVjbGFyYXRpb24uZGVjbGFyYXRpb25zKTsgfVxuICAgIGVsc2VcbiAgICAgIHsgdGhpcy5jaGVja0V4cG9ydChleHBvcnRzLCBub2RlLmRlY2xhcmF0aW9uLmlkLCBub2RlLmRlY2xhcmF0aW9uLmlkLnN0YXJ0KTsgfVxuICAgIG5vZGUuc3BlY2lmaWVycyA9IFtdO1xuICAgIG5vZGUuc291cmNlID0gbnVsbDtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2KVxuICAgICAgeyBub2RlLmF0dHJpYnV0ZXMgPSBbXTsgfVxuICB9IGVsc2UgeyAvLyBleHBvcnQgeyB4LCB5IGFzIHogfSBbZnJvbSAnLi4uJ11cbiAgICBub2RlLmRlY2xhcmF0aW9uID0gbnVsbDtcbiAgICBub2RlLnNwZWNpZmllcnMgPSB0aGlzLnBhcnNlRXhwb3J0U3BlY2lmaWVycyhleHBvcnRzKTtcbiAgICBpZiAodGhpcy5lYXRDb250ZXh0dWFsKFwiZnJvbVwiKSkge1xuICAgICAgaWYgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5zdHJpbmcpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICAgIG5vZGUuc291cmNlID0gdGhpcy5wYXJzZUV4cHJBdG9tKCk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2KVxuICAgICAgICB7IG5vZGUuYXR0cmlidXRlcyA9IHRoaXMucGFyc2VXaXRoQ2xhdXNlKCk7IH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBub2RlLnNwZWNpZmllcnM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIC8vIGNoZWNrIGZvciBrZXl3b3JkcyB1c2VkIGFzIGxvY2FsIG5hbWVzXG4gICAgICAgIHZhciBzcGVjID0gbGlzdFtpXTtcblxuICAgICAgICB0aGlzLmNoZWNrVW5yZXNlcnZlZChzcGVjLmxvY2FsKTtcbiAgICAgICAgLy8gY2hlY2sgaWYgZXhwb3J0IGlzIGRlZmluZWRcbiAgICAgICAgdGhpcy5jaGVja0xvY2FsRXhwb3J0KHNwZWMubG9jYWwpO1xuXG4gICAgICAgIGlmIChzcGVjLmxvY2FsLnR5cGUgPT09IFwiTGl0ZXJhbFwiKSB7XG4gICAgICAgICAgdGhpcy5yYWlzZShzcGVjLmxvY2FsLnN0YXJ0LCBcIkEgc3RyaW5nIGxpdGVyYWwgY2Fubm90IGJlIHVzZWQgYXMgYW4gZXhwb3J0ZWQgYmluZGluZyB3aXRob3V0IGBmcm9tYC5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbm9kZS5zb3VyY2UgPSBudWxsO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNilcbiAgICAgICAgeyBub2RlLmF0dHJpYnV0ZXMgPSBbXTsgfVxuICAgIH1cbiAgICB0aGlzLnNlbWljb2xvbigpO1xuICB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJFeHBvcnROYW1lZERlY2xhcmF0aW9uXCIpXG59O1xuXG5wcCQ4LnBhcnNlRXhwb3J0RGVjbGFyYXRpb24gPSBmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiB0aGlzLnBhcnNlU3RhdGVtZW50KG51bGwpXG59O1xuXG5wcCQ4LnBhcnNlRXhwb3J0RGVmYXVsdERlY2xhcmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpc0FzeW5jO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9mdW5jdGlvbiB8fCAoaXNBc3luYyA9IHRoaXMuaXNBc3luY0Z1bmN0aW9uKCkpKSB7XG4gICAgdmFyIGZOb2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICBpZiAoaXNBc3luYykgeyB0aGlzLm5leHQoKTsgfVxuICAgIHJldHVybiB0aGlzLnBhcnNlRnVuY3Rpb24oZk5vZGUsIEZVTkNfU1RBVEVNRU5UIHwgRlVOQ19OVUxMQUJMRV9JRCwgZmFsc2UsIGlzQXN5bmMpXG4gIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9jbGFzcykge1xuICAgIHZhciBjTm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VDbGFzcyhjTm9kZSwgXCJudWxsYWJsZUlEXCIpXG4gIH0gZWxzZSB7XG4gICAgdmFyIGRlY2xhcmF0aW9uID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG4gICAgdGhpcy5zZW1pY29sb24oKTtcbiAgICByZXR1cm4gZGVjbGFyYXRpb25cbiAgfVxufTtcblxucHAkOC5jaGVja0V4cG9ydCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIHBvcykge1xuICBpZiAoIWV4cG9ydHMpIHsgcmV0dXJuIH1cbiAgaWYgKHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKVxuICAgIHsgbmFtZSA9IG5hbWUudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgPyBuYW1lLm5hbWUgOiBuYW1lLnZhbHVlOyB9XG4gIGlmIChoYXNPd24oZXhwb3J0cywgbmFtZSkpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUocG9zLCBcIkR1cGxpY2F0ZSBleHBvcnQgJ1wiICsgbmFtZSArIFwiJ1wiKTsgfVxuICBleHBvcnRzW25hbWVdID0gdHJ1ZTtcbn07XG5cbnBwJDguY2hlY2tQYXR0ZXJuRXhwb3J0ID0gZnVuY3Rpb24oZXhwb3J0cywgcGF0KSB7XG4gIHZhciB0eXBlID0gcGF0LnR5cGU7XG4gIGlmICh0eXBlID09PSBcIklkZW50aWZpZXJcIilcbiAgICB7IHRoaXMuY2hlY2tFeHBvcnQoZXhwb3J0cywgcGF0LCBwYXQuc3RhcnQpOyB9XG4gIGVsc2UgaWYgKHR5cGUgPT09IFwiT2JqZWN0UGF0dGVyblwiKVxuICAgIHsgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBwYXQucHJvcGVydGllczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpXG4gICAgICB7XG4gICAgICAgIHZhciBwcm9wID0gbGlzdFtpXTtcblxuICAgICAgICB0aGlzLmNoZWNrUGF0dGVybkV4cG9ydChleHBvcnRzLCBwcm9wKTtcbiAgICAgIH0gfVxuICBlbHNlIGlmICh0eXBlID09PSBcIkFycmF5UGF0dGVyblwiKVxuICAgIHsgZm9yICh2YXIgaSQxID0gMCwgbGlzdCQxID0gcGF0LmVsZW1lbnRzOyBpJDEgPCBsaXN0JDEubGVuZ3RoOyBpJDEgKz0gMSkge1xuICAgICAgdmFyIGVsdCA9IGxpc3QkMVtpJDFdO1xuXG4gICAgICAgIGlmIChlbHQpIHsgdGhpcy5jaGVja1BhdHRlcm5FeHBvcnQoZXhwb3J0cywgZWx0KTsgfVxuICAgIH0gfVxuICBlbHNlIGlmICh0eXBlID09PSBcIlByb3BlcnR5XCIpXG4gICAgeyB0aGlzLmNoZWNrUGF0dGVybkV4cG9ydChleHBvcnRzLCBwYXQudmFsdWUpOyB9XG4gIGVsc2UgaWYgKHR5cGUgPT09IFwiQXNzaWdubWVudFBhdHRlcm5cIilcbiAgICB7IHRoaXMuY2hlY2tQYXR0ZXJuRXhwb3J0KGV4cG9ydHMsIHBhdC5sZWZ0KTsgfVxuICBlbHNlIGlmICh0eXBlID09PSBcIlJlc3RFbGVtZW50XCIpXG4gICAgeyB0aGlzLmNoZWNrUGF0dGVybkV4cG9ydChleHBvcnRzLCBwYXQuYXJndW1lbnQpOyB9XG59O1xuXG5wcCQ4LmNoZWNrVmFyaWFibGVFeHBvcnQgPSBmdW5jdGlvbihleHBvcnRzLCBkZWNscykge1xuICBpZiAoIWV4cG9ydHMpIHsgcmV0dXJuIH1cbiAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBkZWNsczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpXG4gICAge1xuICAgIHZhciBkZWNsID0gbGlzdFtpXTtcblxuICAgIHRoaXMuY2hlY2tQYXR0ZXJuRXhwb3J0KGV4cG9ydHMsIGRlY2wuaWQpO1xuICB9XG59O1xuXG5wcCQ4LnNob3VsZFBhcnNlRXhwb3J0U3RhdGVtZW50ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnR5cGUua2V5d29yZCA9PT0gXCJ2YXJcIiB8fFxuICAgIHRoaXMudHlwZS5rZXl3b3JkID09PSBcImNvbnN0XCIgfHxcbiAgICB0aGlzLnR5cGUua2V5d29yZCA9PT0gXCJjbGFzc1wiIHx8XG4gICAgdGhpcy50eXBlLmtleXdvcmQgPT09IFwiZnVuY3Rpb25cIiB8fFxuICAgIHRoaXMuaXNMZXQoKSB8fFxuICAgIHRoaXMuaXNBc3luY0Z1bmN0aW9uKClcbn07XG5cbi8vIFBhcnNlcyBhIGNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIG1vZHVsZSBleHBvcnRzLlxuXG5wcCQ4LnBhcnNlRXhwb3J0U3BlY2lmaWVyID0gZnVuY3Rpb24oZXhwb3J0cykge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIG5vZGUubG9jYWwgPSB0aGlzLnBhcnNlTW9kdWxlRXhwb3J0TmFtZSgpO1xuXG4gIG5vZGUuZXhwb3J0ZWQgPSB0aGlzLmVhdENvbnRleHR1YWwoXCJhc1wiKSA/IHRoaXMucGFyc2VNb2R1bGVFeHBvcnROYW1lKCkgOiBub2RlLmxvY2FsO1xuICB0aGlzLmNoZWNrRXhwb3J0KFxuICAgIGV4cG9ydHMsXG4gICAgbm9kZS5leHBvcnRlZCxcbiAgICBub2RlLmV4cG9ydGVkLnN0YXJ0XG4gICk7XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkV4cG9ydFNwZWNpZmllclwiKVxufTtcblxucHAkOC5wYXJzZUV4cG9ydFNwZWNpZmllcnMgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gIHZhciBub2RlcyA9IFtdLCBmaXJzdCA9IHRydWU7XG4gIC8vIGV4cG9ydCB7IHgsIHkgYXMgeiB9IFtmcm9tICcuLi4nXVxuICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNlTCk7XG4gIHdoaWxlICghdGhpcy5lYXQodHlwZXMkMS5icmFjZVIpKSB7XG4gICAgaWYgKCFmaXJzdCkge1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICBpZiAodGhpcy5hZnRlclRyYWlsaW5nQ29tbWEodHlwZXMkMS5icmFjZVIpKSB7IGJyZWFrIH1cbiAgICB9IGVsc2UgeyBmaXJzdCA9IGZhbHNlOyB9XG5cbiAgICBub2Rlcy5wdXNoKHRoaXMucGFyc2VFeHBvcnRTcGVjaWZpZXIoZXhwb3J0cykpO1xuICB9XG4gIHJldHVybiBub2Rlc1xufTtcblxuLy8gUGFyc2VzIGltcG9ydCBkZWNsYXJhdGlvbi5cblxucHAkOC5wYXJzZUltcG9ydCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG5cbiAgLy8gaW1wb3J0ICcuLi4nXG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RyaW5nKSB7XG4gICAgbm9kZS5zcGVjaWZpZXJzID0gZW1wdHkkMTtcbiAgICBub2RlLnNvdXJjZSA9IHRoaXMucGFyc2VFeHByQXRvbSgpO1xuICB9IGVsc2Uge1xuICAgIG5vZGUuc3BlY2lmaWVycyA9IHRoaXMucGFyc2VJbXBvcnRTcGVjaWZpZXJzKCk7XG4gICAgdGhpcy5leHBlY3RDb250ZXh0dWFsKFwiZnJvbVwiKTtcbiAgICBub2RlLnNvdXJjZSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdHJpbmcgPyB0aGlzLnBhcnNlRXhwckF0b20oKSA6IHRoaXMudW5leHBlY3RlZCgpO1xuICB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTYpXG4gICAgeyBub2RlLmF0dHJpYnV0ZXMgPSB0aGlzLnBhcnNlV2l0aENsYXVzZSgpOyB9XG4gIHRoaXMuc2VtaWNvbG9uKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJbXBvcnREZWNsYXJhdGlvblwiKVxufTtcblxuLy8gUGFyc2VzIGEgY29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgbW9kdWxlIGltcG9ydHMuXG5cbnBwJDgucGFyc2VJbXBvcnRTcGVjaWZpZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBub2RlLmltcG9ydGVkID0gdGhpcy5wYXJzZU1vZHVsZUV4cG9ydE5hbWUoKTtcblxuICBpZiAodGhpcy5lYXRDb250ZXh0dWFsKFwiYXNcIikpIHtcbiAgICBub2RlLmxvY2FsID0gdGhpcy5wYXJzZUlkZW50KCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5jaGVja1VucmVzZXJ2ZWQobm9kZS5pbXBvcnRlZCk7XG4gICAgbm9kZS5sb2NhbCA9IG5vZGUuaW1wb3J0ZWQ7XG4gIH1cbiAgdGhpcy5jaGVja0xWYWxTaW1wbGUobm9kZS5sb2NhbCwgQklORF9MRVhJQ0FMKTtcblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSW1wb3J0U3BlY2lmaWVyXCIpXG59O1xuXG5wcCQ4LnBhcnNlSW1wb3J0RGVmYXVsdFNwZWNpZmllciA9IGZ1bmN0aW9uKCkge1xuICAvLyBpbXBvcnQgZGVmYXVsdE9iaiwgeyB4LCB5IGFzIHogfSBmcm9tICcuLi4nXG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgbm9kZS5sb2NhbCA9IHRoaXMucGFyc2VJZGVudCgpO1xuICB0aGlzLmNoZWNrTFZhbFNpbXBsZShub2RlLmxvY2FsLCBCSU5EX0xFWElDQUwpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSW1wb3J0RGVmYXVsdFNwZWNpZmllclwiKVxufTtcblxucHAkOC5wYXJzZUltcG9ydE5hbWVzcGFjZVNwZWNpZmllciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dCgpO1xuICB0aGlzLmV4cGVjdENvbnRleHR1YWwoXCJhc1wiKTtcbiAgbm9kZS5sb2NhbCA9IHRoaXMucGFyc2VJZGVudCgpO1xuICB0aGlzLmNoZWNrTFZhbFNpbXBsZShub2RlLmxvY2FsLCBCSU5EX0xFWElDQUwpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSW1wb3J0TmFtZXNwYWNlU3BlY2lmaWVyXCIpXG59O1xuXG5wcCQ4LnBhcnNlSW1wb3J0U3BlY2lmaWVycyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZXMgPSBbXSwgZmlyc3QgPSB0cnVlO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUpIHtcbiAgICBub2Rlcy5wdXNoKHRoaXMucGFyc2VJbXBvcnREZWZhdWx0U3BlY2lmaWVyKCkpO1xuICAgIGlmICghdGhpcy5lYXQodHlwZXMkMS5jb21tYSkpIHsgcmV0dXJuIG5vZGVzIH1cbiAgfVxuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnN0YXIpIHtcbiAgICBub2Rlcy5wdXNoKHRoaXMucGFyc2VJbXBvcnROYW1lc3BhY2VTcGVjaWZpZXIoKSk7XG4gICAgcmV0dXJuIG5vZGVzXG4gIH1cbiAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFjZUwpO1xuICB3aGlsZSAoIXRoaXMuZWF0KHR5cGVzJDEuYnJhY2VSKSkge1xuICAgIGlmICghZmlyc3QpIHtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgaWYgKHRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKHR5cGVzJDEuYnJhY2VSKSkgeyBicmVhayB9XG4gICAgfSBlbHNlIHsgZmlyc3QgPSBmYWxzZTsgfVxuXG4gICAgbm9kZXMucHVzaCh0aGlzLnBhcnNlSW1wb3J0U3BlY2lmaWVyKCkpO1xuICB9XG4gIHJldHVybiBub2Rlc1xufTtcblxucHAkOC5wYXJzZVdpdGhDbGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGVzID0gW107XG4gIGlmICghdGhpcy5lYXQodHlwZXMkMS5fd2l0aCkpIHtcbiAgICByZXR1cm4gbm9kZXNcbiAgfVxuICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNlTCk7XG4gIHZhciBhdHRyaWJ1dGVLZXlzID0ge307XG4gIHZhciBmaXJzdCA9IHRydWU7XG4gIHdoaWxlICghdGhpcy5lYXQodHlwZXMkMS5icmFjZVIpKSB7XG4gICAgaWYgKCFmaXJzdCkge1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICBpZiAodGhpcy5hZnRlclRyYWlsaW5nQ29tbWEodHlwZXMkMS5icmFjZVIpKSB7IGJyZWFrIH1cbiAgICB9IGVsc2UgeyBmaXJzdCA9IGZhbHNlOyB9XG5cbiAgICB2YXIgYXR0ciA9IHRoaXMucGFyc2VJbXBvcnRBdHRyaWJ1dGUoKTtcbiAgICB2YXIga2V5TmFtZSA9IGF0dHIua2V5LnR5cGUgPT09IFwiSWRlbnRpZmllclwiID8gYXR0ci5rZXkubmFtZSA6IGF0dHIua2V5LnZhbHVlO1xuICAgIGlmIChoYXNPd24oYXR0cmlidXRlS2V5cywga2V5TmFtZSkpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShhdHRyLmtleS5zdGFydCwgXCJEdXBsaWNhdGUgYXR0cmlidXRlIGtleSAnXCIgKyBrZXlOYW1lICsgXCInXCIpOyB9XG4gICAgYXR0cmlidXRlS2V5c1trZXlOYW1lXSA9IHRydWU7XG4gICAgbm9kZXMucHVzaChhdHRyKTtcbiAgfVxuICByZXR1cm4gbm9kZXNcbn07XG5cbnBwJDgucGFyc2VJbXBvcnRBdHRyaWJ1dGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBub2RlLmtleSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdHJpbmcgPyB0aGlzLnBhcnNlRXhwckF0b20oKSA6IHRoaXMucGFyc2VJZGVudCh0aGlzLm9wdGlvbnMuYWxsb3dSZXNlcnZlZCAhPT0gXCJuZXZlclwiKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5jb2xvbik7XG4gIGlmICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuc3RyaW5nKSB7XG4gICAgdGhpcy51bmV4cGVjdGVkKCk7XG4gIH1cbiAgbm9kZS52YWx1ZSA9IHRoaXMucGFyc2VFeHByQXRvbSgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSW1wb3J0QXR0cmlidXRlXCIpXG59O1xuXG5wcCQ4LnBhcnNlTW9kdWxlRXhwb3J0TmFtZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDEzICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdHJpbmcpIHtcbiAgICB2YXIgc3RyaW5nTGl0ZXJhbCA9IHRoaXMucGFyc2VMaXRlcmFsKHRoaXMudmFsdWUpO1xuICAgIGlmIChsb25lU3Vycm9nYXRlLnRlc3Qoc3RyaW5nTGl0ZXJhbC52YWx1ZSkpIHtcbiAgICAgIHRoaXMucmFpc2Uoc3RyaW5nTGl0ZXJhbC5zdGFydCwgXCJBbiBleHBvcnQgbmFtZSBjYW5ub3QgaW5jbHVkZSBhIGxvbmUgc3Vycm9nYXRlLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cmluZ0xpdGVyYWxcbiAgfVxuICByZXR1cm4gdGhpcy5wYXJzZUlkZW50KHRydWUpXG59O1xuXG4vLyBTZXQgYEV4cHJlc3Npb25TdGF0ZW1lbnQjZGlyZWN0aXZlYCBwcm9wZXJ0eSBmb3IgZGlyZWN0aXZlIHByb2xvZ3Vlcy5cbnBwJDguYWRhcHREaXJlY3RpdmVQcm9sb2d1ZSA9IGZ1bmN0aW9uKHN0YXRlbWVudHMpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aCAmJiB0aGlzLmlzRGlyZWN0aXZlQ2FuZGlkYXRlKHN0YXRlbWVudHNbaV0pOyArK2kpIHtcbiAgICBzdGF0ZW1lbnRzW2ldLmRpcmVjdGl2ZSA9IHN0YXRlbWVudHNbaV0uZXhwcmVzc2lvbi5yYXcuc2xpY2UoMSwgLTEpO1xuICB9XG59O1xucHAkOC5pc0RpcmVjdGl2ZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKHN0YXRlbWVudCkge1xuICByZXR1cm4gKFxuICAgIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA1ICYmXG4gICAgc3RhdGVtZW50LnR5cGUgPT09IFwiRXhwcmVzc2lvblN0YXRlbWVudFwiICYmXG4gICAgc3RhdGVtZW50LmV4cHJlc3Npb24udHlwZSA9PT0gXCJMaXRlcmFsXCIgJiZcbiAgICB0eXBlb2Ygc3RhdGVtZW50LmV4cHJlc3Npb24udmFsdWUgPT09IFwic3RyaW5nXCIgJiZcbiAgICAvLyBSZWplY3QgcGFyZW50aGVzaXplZCBzdHJpbmdzLlxuICAgICh0aGlzLmlucHV0W3N0YXRlbWVudC5zdGFydF0gPT09IFwiXFxcIlwiIHx8IHRoaXMuaW5wdXRbc3RhdGVtZW50LnN0YXJ0XSA9PT0gXCInXCIpXG4gIClcbn07XG5cbnZhciBwcCQ3ID0gUGFyc2VyLnByb3RvdHlwZTtcblxuLy8gQ29udmVydCBleGlzdGluZyBleHByZXNzaW9uIGF0b20gdG8gYXNzaWduYWJsZSBwYXR0ZXJuXG4vLyBpZiBwb3NzaWJsZS5cblxucHAkNy50b0Fzc2lnbmFibGUgPSBmdW5jdGlvbihub2RlLCBpc0JpbmRpbmcsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIG5vZGUpIHtcbiAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgIGNhc2UgXCJJZGVudGlmaWVyXCI6XG4gICAgICBpZiAodGhpcy5pbkFzeW5jICYmIG5vZGUubmFtZSA9PT0gXCJhd2FpdFwiKVxuICAgICAgICB7IHRoaXMucmFpc2Uobm9kZS5zdGFydCwgXCJDYW5ub3QgdXNlICdhd2FpdCcgYXMgaWRlbnRpZmllciBpbnNpZGUgYW4gYXN5bmMgZnVuY3Rpb25cIik7IH1cbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiT2JqZWN0UGF0dGVyblwiOlxuICAgIGNhc2UgXCJBcnJheVBhdHRlcm5cIjpcbiAgICBjYXNlIFwiQXNzaWdubWVudFBhdHRlcm5cIjpcbiAgICBjYXNlIFwiUmVzdEVsZW1lbnRcIjpcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiT2JqZWN0RXhwcmVzc2lvblwiOlxuICAgICAgbm9kZS50eXBlID0gXCJPYmplY3RQYXR0ZXJuXCI7XG4gICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykgeyB0aGlzLmNoZWNrUGF0dGVybkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTsgfVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBub2RlLnByb3BlcnRpZXM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIHZhciBwcm9wID0gbGlzdFtpXTtcblxuICAgICAgdGhpcy50b0Fzc2lnbmFibGUocHJvcCwgaXNCaW5kaW5nKTtcbiAgICAgICAgLy8gRWFybHkgZXJyb3I6XG4gICAgICAgIC8vICAgQXNzaWdubWVudFJlc3RQcm9wZXJ0eVtZaWVsZCwgQXdhaXRdIDpcbiAgICAgICAgLy8gICAgIGAuLi5gIERlc3RydWN0dXJpbmdBc3NpZ25tZW50VGFyZ2V0W1lpZWxkLCBBd2FpdF1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gICBJdCBpcyBhIFN5bnRheCBFcnJvciBpZiB8RGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXR8IGlzIGFuIHxBcnJheUxpdGVyYWx8IG9yIGFuIHxPYmplY3RMaXRlcmFsfC5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHByb3AudHlwZSA9PT0gXCJSZXN0RWxlbWVudFwiICYmXG4gICAgICAgICAgKHByb3AuYXJndW1lbnQudHlwZSA9PT0gXCJBcnJheVBhdHRlcm5cIiB8fCBwcm9wLmFyZ3VtZW50LnR5cGUgPT09IFwiT2JqZWN0UGF0dGVyblwiKVxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLnJhaXNlKHByb3AuYXJndW1lbnQuc3RhcnQsIFwiVW5leHBlY3RlZCB0b2tlblwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJQcm9wZXJ0eVwiOlxuICAgICAgLy8gQXNzaWdubWVudFByb3BlcnR5IGhhcyB0eXBlID09PSBcIlByb3BlcnR5XCJcbiAgICAgIGlmIChub2RlLmtpbmQgIT09IFwiaW5pdFwiKSB7IHRoaXMucmFpc2Uobm9kZS5rZXkuc3RhcnQsIFwiT2JqZWN0IHBhdHRlcm4gY2FuJ3QgY29udGFpbiBnZXR0ZXIgb3Igc2V0dGVyXCIpOyB9XG4gICAgICB0aGlzLnRvQXNzaWduYWJsZShub2RlLnZhbHVlLCBpc0JpbmRpbmcpO1xuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJBcnJheUV4cHJlc3Npb25cIjpcbiAgICAgIG5vZGUudHlwZSA9IFwiQXJyYXlQYXR0ZXJuXCI7XG4gICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykgeyB0aGlzLmNoZWNrUGF0dGVybkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTsgfVxuICAgICAgdGhpcy50b0Fzc2lnbmFibGVMaXN0KG5vZGUuZWxlbWVudHMsIGlzQmluZGluZyk7XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIlNwcmVhZEVsZW1lbnRcIjpcbiAgICAgIG5vZGUudHlwZSA9IFwiUmVzdEVsZW1lbnRcIjtcbiAgICAgIHRoaXMudG9Bc3NpZ25hYmxlKG5vZGUuYXJndW1lbnQsIGlzQmluZGluZyk7XG4gICAgICBpZiAobm9kZS5hcmd1bWVudC50eXBlID09PSBcIkFzc2lnbm1lbnRQYXR0ZXJuXCIpXG4gICAgICAgIHsgdGhpcy5yYWlzZShub2RlLmFyZ3VtZW50LnN0YXJ0LCBcIlJlc3QgZWxlbWVudHMgY2Fubm90IGhhdmUgYSBkZWZhdWx0IHZhbHVlXCIpOyB9XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIkFzc2lnbm1lbnRFeHByZXNzaW9uXCI6XG4gICAgICBpZiAobm9kZS5vcGVyYXRvciAhPT0gXCI9XCIpIHsgdGhpcy5yYWlzZShub2RlLmxlZnQuZW5kLCBcIk9ubHkgJz0nIG9wZXJhdG9yIGNhbiBiZSB1c2VkIGZvciBzcGVjaWZ5aW5nIGRlZmF1bHQgdmFsdWUuXCIpOyB9XG4gICAgICBub2RlLnR5cGUgPSBcIkFzc2lnbm1lbnRQYXR0ZXJuXCI7XG4gICAgICBkZWxldGUgbm9kZS5vcGVyYXRvcjtcbiAgICAgIHRoaXMudG9Bc3NpZ25hYmxlKG5vZGUubGVmdCwgaXNCaW5kaW5nKTtcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiUGFyZW50aGVzaXplZEV4cHJlc3Npb25cIjpcbiAgICAgIHRoaXMudG9Bc3NpZ25hYmxlKG5vZGUuZXhwcmVzc2lvbiwgaXNCaW5kaW5nLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiQ2hhaW5FeHByZXNzaW9uXCI6XG4gICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCJPcHRpb25hbCBjaGFpbmluZyBjYW5ub3QgYXBwZWFyIGluIGxlZnQtaGFuZCBzaWRlXCIpO1xuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJNZW1iZXJFeHByZXNzaW9uXCI6XG4gICAgICBpZiAoIWlzQmluZGluZykgeyBicmVhayB9XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhpcy5yYWlzZShub2RlLnN0YXJ0LCBcIkFzc2lnbmluZyB0byBydmFsdWVcIik7XG4gICAgfVxuICB9IGVsc2UgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHsgdGhpcy5jaGVja1BhdHRlcm5FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7IH1cbiAgcmV0dXJuIG5vZGVcbn07XG5cbi8vIENvbnZlcnQgbGlzdCBvZiBleHByZXNzaW9uIGF0b21zIHRvIGJpbmRpbmcgbGlzdC5cblxucHAkNy50b0Fzc2lnbmFibGVMaXN0ID0gZnVuY3Rpb24oZXhwckxpc3QsIGlzQmluZGluZykge1xuICB2YXIgZW5kID0gZXhwckxpc3QubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdmFyIGVsdCA9IGV4cHJMaXN0W2ldO1xuICAgIGlmIChlbHQpIHsgdGhpcy50b0Fzc2lnbmFibGUoZWx0LCBpc0JpbmRpbmcpOyB9XG4gIH1cbiAgaWYgKGVuZCkge1xuICAgIHZhciBsYXN0ID0gZXhwckxpc3RbZW5kIC0gMV07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA9PT0gNiAmJiBpc0JpbmRpbmcgJiYgbGFzdCAmJiBsYXN0LnR5cGUgPT09IFwiUmVzdEVsZW1lbnRcIiAmJiBsYXN0LmFyZ3VtZW50LnR5cGUgIT09IFwiSWRlbnRpZmllclwiKVxuICAgICAgeyB0aGlzLnVuZXhwZWN0ZWQobGFzdC5hcmd1bWVudC5zdGFydCk7IH1cbiAgfVxuICByZXR1cm4gZXhwckxpc3Rcbn07XG5cbi8vIFBhcnNlcyBzcHJlYWQgZWxlbWVudC5cblxucHAkNy5wYXJzZVNwcmVhZCA9IGZ1bmN0aW9uKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5hcmd1bWVudCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJTcHJlYWRFbGVtZW50XCIpXG59O1xuXG5wcCQ3LnBhcnNlUmVzdEJpbmRpbmcgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHQoKTtcblxuICAvLyBSZXN0RWxlbWVudCBpbnNpZGUgb2YgYSBmdW5jdGlvbiBwYXJhbWV0ZXIgbXVzdCBiZSBhbiBpZGVudGlmaWVyXG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPT09IDYgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLm5hbWUpXG4gICAgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuXG4gIG5vZGUuYXJndW1lbnQgPSB0aGlzLnBhcnNlQmluZGluZ0F0b20oKTtcblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiUmVzdEVsZW1lbnRcIilcbn07XG5cbi8vIFBhcnNlcyBsdmFsdWUgKGFzc2lnbmFibGUpIGF0b20uXG5cbnBwJDcucGFyc2VCaW5kaW5nQXRvbSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHtcbiAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xuICAgIGNhc2UgdHlwZXMkMS5icmFja2V0TDpcbiAgICAgIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgbm9kZS5lbGVtZW50cyA9IHRoaXMucGFyc2VCaW5kaW5nTGlzdCh0eXBlcyQxLmJyYWNrZXRSLCB0cnVlLCB0cnVlKTtcbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJBcnJheVBhdHRlcm5cIilcblxuICAgIGNhc2UgdHlwZXMkMS5icmFjZUw6XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZU9iaih0cnVlKVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcy5wYXJzZUlkZW50KClcbn07XG5cbnBwJDcucGFyc2VCaW5kaW5nTGlzdCA9IGZ1bmN0aW9uKGNsb3NlLCBhbGxvd0VtcHR5LCBhbGxvd1RyYWlsaW5nQ29tbWEsIGFsbG93TW9kaWZpZXJzKSB7XG4gIHZhciBlbHRzID0gW10sIGZpcnN0ID0gdHJ1ZTtcbiAgd2hpbGUgKCF0aGlzLmVhdChjbG9zZSkpIHtcbiAgICBpZiAoZmlyc3QpIHsgZmlyc3QgPSBmYWxzZTsgfVxuICAgIGVsc2UgeyB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTsgfVxuICAgIGlmIChhbGxvd0VtcHR5ICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSkge1xuICAgICAgZWx0cy5wdXNoKG51bGwpO1xuICAgIH0gZWxzZSBpZiAoYWxsb3dUcmFpbGluZ0NvbW1hICYmIHRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKGNsb3NlKSkge1xuICAgICAgYnJlYWtcbiAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lbGxpcHNpcykge1xuICAgICAgdmFyIHJlc3QgPSB0aGlzLnBhcnNlUmVzdEJpbmRpbmcoKTtcbiAgICAgIHRoaXMucGFyc2VCaW5kaW5nTGlzdEl0ZW0ocmVzdCk7XG4gICAgICBlbHRzLnB1c2gocmVzdCk7XG4gICAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCBcIkNvbW1hIGlzIG5vdCBwZXJtaXR0ZWQgYWZ0ZXIgdGhlIHJlc3QgZWxlbWVudFwiKTsgfVxuICAgICAgdGhpcy5leHBlY3QoY2xvc2UpO1xuICAgICAgYnJlYWtcbiAgICB9IGVsc2Uge1xuICAgICAgZWx0cy5wdXNoKHRoaXMucGFyc2VBc3NpZ25hYmxlTGlzdEl0ZW0oYWxsb3dNb2RpZmllcnMpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVsdHNcbn07XG5cbnBwJDcucGFyc2VBc3NpZ25hYmxlTGlzdEl0ZW0gPSBmdW5jdGlvbihhbGxvd01vZGlmaWVycykge1xuICB2YXIgZWxlbSA9IHRoaXMucGFyc2VNYXliZURlZmF1bHQodGhpcy5zdGFydCwgdGhpcy5zdGFydExvYyk7XG4gIHRoaXMucGFyc2VCaW5kaW5nTGlzdEl0ZW0oZWxlbSk7XG4gIHJldHVybiBlbGVtXG59O1xuXG5wcCQ3LnBhcnNlQmluZGluZ0xpc3RJdGVtID0gZnVuY3Rpb24ocGFyYW0pIHtcbiAgcmV0dXJuIHBhcmFtXG59O1xuXG4vLyBQYXJzZXMgYXNzaWdubWVudCBwYXR0ZXJuIGFyb3VuZCBnaXZlbiBhdG9tIGlmIHBvc3NpYmxlLlxuXG5wcCQ3LnBhcnNlTWF5YmVEZWZhdWx0ID0gZnVuY3Rpb24oc3RhcnRQb3MsIHN0YXJ0TG9jLCBsZWZ0KSB7XG4gIGxlZnQgPSBsZWZ0IHx8IHRoaXMucGFyc2VCaW5kaW5nQXRvbSgpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgNiB8fCAhdGhpcy5lYXQodHlwZXMkMS5lcSkpIHsgcmV0dXJuIGxlZnQgfVxuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgbm9kZS5sZWZ0ID0gbGVmdDtcbiAgbm9kZS5yaWdodCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQXNzaWdubWVudFBhdHRlcm5cIilcbn07XG5cbi8vIFRoZSBmb2xsb3dpbmcgdGhyZWUgZnVuY3Rpb25zIGFsbCB2ZXJpZnkgdGhhdCBhIG5vZGUgaXMgYW4gbHZhbHVlIFx1MjAxNFxuLy8gc29tZXRoaW5nIHRoYXQgY2FuIGJlIGJvdW5kLCBvciBhc3NpZ25lZCB0by4gSW4gb3JkZXIgdG8gZG8gc28sIHRoZXkgcGVyZm9ybVxuLy8gYSB2YXJpZXR5IG9mIGNoZWNrczpcbi8vXG4vLyAtIENoZWNrIHRoYXQgbm9uZSBvZiB0aGUgYm91bmQvYXNzaWduZWQtdG8gaWRlbnRpZmllcnMgYXJlIHJlc2VydmVkIHdvcmRzLlxuLy8gLSBSZWNvcmQgbmFtZSBkZWNsYXJhdGlvbnMgZm9yIGJpbmRpbmdzIGluIHRoZSBhcHByb3ByaWF0ZSBzY29wZS5cbi8vIC0gQ2hlY2sgZHVwbGljYXRlIGFyZ3VtZW50IG5hbWVzLCBpZiBjaGVja0NsYXNoZXMgaXMgc2V0LlxuLy9cbi8vIElmIGEgY29tcGxleCBiaW5kaW5nIHBhdHRlcm4gaXMgZW5jb3VudGVyZWQgKGUuZy4sIG9iamVjdCBhbmQgYXJyYXlcbi8vIGRlc3RydWN0dXJpbmcpLCB0aGUgZW50aXJlIHBhdHRlcm4gaXMgcmVjdXJzaXZlbHkgY2hlY2tlZC5cbi8vXG4vLyBUaGVyZSBhcmUgdGhyZWUgdmVyc2lvbnMgb2YgY2hlY2tMVmFsKigpIGFwcHJvcHJpYXRlIGZvciBkaWZmZXJlbnRcbi8vIGNpcmN1bXN0YW5jZXM6XG4vL1xuLy8gLSBjaGVja0xWYWxTaW1wbGUoKSBzaGFsbCBiZSB1c2VkIGlmIHRoZSBzeW50YWN0aWMgY29uc3RydWN0IHN1cHBvcnRzXG4vLyAgIG5vdGhpbmcgb3RoZXIgdGhhbiBpZGVudGlmaWVycyBhbmQgbWVtYmVyIGV4cHJlc3Npb25zLiBQYXJlbnRoZXNpemVkXG4vLyAgIGV4cHJlc3Npb25zIGFyZSBhbHNvIGNvcnJlY3RseSBoYW5kbGVkLiBUaGlzIGlzIGdlbmVyYWxseSBhcHByb3ByaWF0ZSBmb3Jcbi8vICAgY29uc3RydWN0cyBmb3Igd2hpY2ggdGhlIHNwZWMgc2F5c1xuLy9cbi8vICAgPiBJdCBpcyBhIFN5bnRheCBFcnJvciBpZiBBc3NpZ25tZW50VGFyZ2V0VHlwZSBvZiBbdGhlIHByb2R1Y3Rpb25dIGlzIG5vdFxuLy8gICA+IHNpbXBsZS5cbi8vXG4vLyAgIEl0IGlzIGFsc28gYXBwcm9wcmlhdGUgZm9yIGNoZWNraW5nIGlmIGFuIGlkZW50aWZpZXIgaXMgdmFsaWQgYW5kIG5vdFxuLy8gICBkZWZpbmVkIGVsc2V3aGVyZSwgbGlrZSBpbXBvcnQgZGVjbGFyYXRpb25zIG9yIGZ1bmN0aW9uL2NsYXNzIGlkZW50aWZpZXJzLlxuLy9cbi8vICAgRXhhbXBsZXMgd2hlcmUgdGhpcyBpcyB1c2VkIGluY2x1ZGU6XG4vLyAgICAgYSArPSBcdTIwMjY7XG4vLyAgICAgaW1wb3J0IGEgZnJvbSAnXHUyMDI2Jztcbi8vICAgd2hlcmUgYSBpcyB0aGUgbm9kZSB0byBiZSBjaGVja2VkLlxuLy9cbi8vIC0gY2hlY2tMVmFsUGF0dGVybigpIHNoYWxsIGJlIHVzZWQgaWYgdGhlIHN5bnRhY3RpYyBjb25zdHJ1Y3Qgc3VwcG9ydHNcbi8vICAgYW55dGhpbmcgY2hlY2tMVmFsU2ltcGxlKCkgc3VwcG9ydHMsIGFzIHdlbGwgYXMgb2JqZWN0IGFuZCBhcnJheVxuLy8gICBkZXN0cnVjdHVyaW5nIHBhdHRlcm5zLiBUaGlzIGlzIGdlbmVyYWxseSBhcHByb3ByaWF0ZSBmb3IgY29uc3RydWN0cyBmb3Jcbi8vICAgd2hpY2ggdGhlIHNwZWMgc2F5c1xuLy9cbi8vICAgPiBJdCBpcyBhIFN5bnRheCBFcnJvciBpZiBbdGhlIHByb2R1Y3Rpb25dIGlzIG5laXRoZXIgYW4gT2JqZWN0TGl0ZXJhbCBub3Jcbi8vICAgPiBhbiBBcnJheUxpdGVyYWwgYW5kIEFzc2lnbm1lbnRUYXJnZXRUeXBlIG9mIFt0aGUgcHJvZHVjdGlvbl0gaXMgbm90XG4vLyAgID4gc2ltcGxlLlxuLy9cbi8vICAgRXhhbXBsZXMgd2hlcmUgdGhpcyBpcyB1c2VkIGluY2x1ZGU6XG4vLyAgICAgKGEgPSBcdTIwMjYpO1xuLy8gICAgIGNvbnN0IGEgPSBcdTIwMjY7XG4vLyAgICAgdHJ5IHsgXHUyMDI2IH0gY2F0Y2ggKGEpIHsgXHUyMDI2IH1cbi8vICAgd2hlcmUgYSBpcyB0aGUgbm9kZSB0byBiZSBjaGVja2VkLlxuLy9cbi8vIC0gY2hlY2tMVmFsSW5uZXJQYXR0ZXJuKCkgc2hhbGwgYmUgdXNlZCBpZiB0aGUgc3ludGFjdGljIGNvbnN0cnVjdCBzdXBwb3J0c1xuLy8gICBhbnl0aGluZyBjaGVja0xWYWxQYXR0ZXJuKCkgc3VwcG9ydHMsIGFzIHdlbGwgYXMgZGVmYXVsdCBhc3NpZ25tZW50XG4vLyAgIHBhdHRlcm5zLCByZXN0IGVsZW1lbnRzLCBhbmQgb3RoZXIgY29uc3RydWN0cyB0aGF0IG1heSBhcHBlYXIgd2l0aGluIGFuXG4vLyAgIG9iamVjdCBvciBhcnJheSBkZXN0cnVjdHVyaW5nIHBhdHRlcm4uXG4vL1xuLy8gICBBcyBhIHNwZWNpYWwgY2FzZSwgZnVuY3Rpb24gcGFyYW1ldGVycyBhbHNvIHVzZSBjaGVja0xWYWxJbm5lclBhdHRlcm4oKSxcbi8vICAgYXMgdGhleSBhbHNvIHN1cHBvcnQgZGVmYXVsdHMgYW5kIHJlc3QgY29uc3RydWN0cy5cbi8vXG4vLyBUaGVzZSBmdW5jdGlvbnMgZGVsaWJlcmF0ZWx5IHN1cHBvcnQgYm90aCBhc3NpZ25tZW50IGFuZCBiaW5kaW5nIGNvbnN0cnVjdHMsXG4vLyBhcyB0aGUgbG9naWMgZm9yIGJvdGggaXMgZXhjZWVkaW5nbHkgc2ltaWxhci4gSWYgdGhlIG5vZGUgaXMgdGhlIHRhcmdldCBvZlxuLy8gYW4gYXNzaWdubWVudCwgdGhlbiBiaW5kaW5nVHlwZSBzaG91bGQgYmUgc2V0IHRvIEJJTkRfTk9ORS4gT3RoZXJ3aXNlLCBpdFxuLy8gc2hvdWxkIGJlIHNldCB0byB0aGUgYXBwcm9wcmlhdGUgQklORF8qIGNvbnN0YW50LCBsaWtlIEJJTkRfVkFSIG9yXG4vLyBCSU5EX0xFWElDQUwuXG4vL1xuLy8gSWYgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGEgbm9uLUJJTkRfTk9ORSBiaW5kaW5nVHlwZSwgdGhlblxuLy8gYWRkaXRpb25hbGx5IGEgY2hlY2tDbGFzaGVzIG9iamVjdCBtYXkgYmUgc3BlY2lmaWVkIHRvIGFsbG93IGNoZWNraW5nIGZvclxuLy8gZHVwbGljYXRlIGFyZ3VtZW50IG5hbWVzLiBjaGVja0NsYXNoZXMgaXMgaWdub3JlZCBpZiB0aGUgcHJvdmlkZWQgY29uc3RydWN0XG4vLyBpcyBhbiBhc3NpZ25tZW50IChpLmUuLCBiaW5kaW5nVHlwZSBpcyBCSU5EX05PTkUpLlxuXG5wcCQ3LmNoZWNrTFZhbFNpbXBsZSA9IGZ1bmN0aW9uKGV4cHIsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpIHtcbiAgaWYgKCBiaW5kaW5nVHlwZSA9PT0gdm9pZCAwICkgYmluZGluZ1R5cGUgPSBCSU5EX05PTkU7XG5cbiAgdmFyIGlzQmluZCA9IGJpbmRpbmdUeXBlICE9PSBCSU5EX05PTkU7XG5cbiAgc3dpdGNoIChleHByLnR5cGUpIHtcbiAgY2FzZSBcIklkZW50aWZpZXJcIjpcbiAgICBpZiAodGhpcy5zdHJpY3QgJiYgdGhpcy5yZXNlcnZlZFdvcmRzU3RyaWN0QmluZC50ZXN0KGV4cHIubmFtZSkpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShleHByLnN0YXJ0LCAoaXNCaW5kID8gXCJCaW5kaW5nIFwiIDogXCJBc3NpZ25pbmcgdG8gXCIpICsgZXhwci5uYW1lICsgXCIgaW4gc3RyaWN0IG1vZGVcIik7IH1cbiAgICBpZiAoaXNCaW5kKSB7XG4gICAgICBpZiAoYmluZGluZ1R5cGUgPT09IEJJTkRfTEVYSUNBTCAmJiBleHByLm5hbWUgPT09IFwibGV0XCIpXG4gICAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGV4cHIuc3RhcnQsIFwibGV0IGlzIGRpc2FsbG93ZWQgYXMgYSBsZXhpY2FsbHkgYm91bmQgbmFtZVwiKTsgfVxuICAgICAgaWYgKGNoZWNrQ2xhc2hlcykge1xuICAgICAgICBpZiAoaGFzT3duKGNoZWNrQ2xhc2hlcywgZXhwci5uYW1lKSlcbiAgICAgICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShleHByLnN0YXJ0LCBcIkFyZ3VtZW50IG5hbWUgY2xhc2hcIik7IH1cbiAgICAgICAgY2hlY2tDbGFzaGVzW2V4cHIubmFtZV0gPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGJpbmRpbmdUeXBlICE9PSBCSU5EX09VVFNJREUpIHsgdGhpcy5kZWNsYXJlTmFtZShleHByLm5hbWUsIGJpbmRpbmdUeXBlLCBleHByLnN0YXJ0KTsgfVxuICAgIH1cbiAgICBicmVha1xuXG4gIGNhc2UgXCJDaGFpbkV4cHJlc3Npb25cIjpcbiAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZXhwci5zdGFydCwgXCJPcHRpb25hbCBjaGFpbmluZyBjYW5ub3QgYXBwZWFyIGluIGxlZnQtaGFuZCBzaWRlXCIpO1xuICAgIGJyZWFrXG5cbiAgY2FzZSBcIk1lbWJlckV4cHJlc3Npb25cIjpcbiAgICBpZiAoaXNCaW5kKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShleHByLnN0YXJ0LCBcIkJpbmRpbmcgbWVtYmVyIGV4cHJlc3Npb25cIik7IH1cbiAgICBicmVha1xuXG4gIGNhc2UgXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiOlxuICAgIGlmIChpc0JpbmQpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGV4cHIuc3RhcnQsIFwiQmluZGluZyBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cIik7IH1cbiAgICByZXR1cm4gdGhpcy5jaGVja0xWYWxTaW1wbGUoZXhwci5leHByZXNzaW9uLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKVxuXG4gIGRlZmF1bHQ6XG4gICAgdGhpcy5yYWlzZShleHByLnN0YXJ0LCAoaXNCaW5kID8gXCJCaW5kaW5nXCIgOiBcIkFzc2lnbmluZyB0b1wiKSArIFwiIHJ2YWx1ZVwiKTtcbiAgfVxufTtcblxucHAkNy5jaGVja0xWYWxQYXR0ZXJuID0gZnVuY3Rpb24oZXhwciwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcykge1xuICBpZiAoIGJpbmRpbmdUeXBlID09PSB2b2lkIDAgKSBiaW5kaW5nVHlwZSA9IEJJTkRfTk9ORTtcblxuICBzd2l0Y2ggKGV4cHIudHlwZSkge1xuICBjYXNlIFwiT2JqZWN0UGF0dGVyblwiOlxuICAgIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gZXhwci5wcm9wZXJ0aWVzOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdmFyIHByb3AgPSBsaXN0W2ldO1xuXG4gICAgdGhpcy5jaGVja0xWYWxJbm5lclBhdHRlcm4ocHJvcCwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcyk7XG4gICAgfVxuICAgIGJyZWFrXG5cbiAgY2FzZSBcIkFycmF5UGF0dGVyblwiOlxuICAgIGZvciAodmFyIGkkMSA9IDAsIGxpc3QkMSA9IGV4cHIuZWxlbWVudHM7IGkkMSA8IGxpc3QkMS5sZW5ndGg7IGkkMSArPSAxKSB7XG4gICAgICB2YXIgZWxlbSA9IGxpc3QkMVtpJDFdO1xuXG4gICAgaWYgKGVsZW0pIHsgdGhpcy5jaGVja0xWYWxJbm5lclBhdHRlcm4oZWxlbSwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcyk7IH1cbiAgICB9XG4gICAgYnJlYWtcblxuICBkZWZhdWx0OlxuICAgIHRoaXMuY2hlY2tMVmFsU2ltcGxlKGV4cHIsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpO1xuICB9XG59O1xuXG5wcCQ3LmNoZWNrTFZhbElubmVyUGF0dGVybiA9IGZ1bmN0aW9uKGV4cHIsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpIHtcbiAgaWYgKCBiaW5kaW5nVHlwZSA9PT0gdm9pZCAwICkgYmluZGluZ1R5cGUgPSBCSU5EX05PTkU7XG5cbiAgc3dpdGNoIChleHByLnR5cGUpIHtcbiAgY2FzZSBcIlByb3BlcnR5XCI6XG4gICAgLy8gQXNzaWdubWVudFByb3BlcnR5IGhhcyB0eXBlID09PSBcIlByb3BlcnR5XCJcbiAgICB0aGlzLmNoZWNrTFZhbElubmVyUGF0dGVybihleHByLnZhbHVlLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKTtcbiAgICBicmVha1xuXG4gIGNhc2UgXCJBc3NpZ25tZW50UGF0dGVyblwiOlxuICAgIHRoaXMuY2hlY2tMVmFsUGF0dGVybihleHByLmxlZnQsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpO1xuICAgIGJyZWFrXG5cbiAgY2FzZSBcIlJlc3RFbGVtZW50XCI6XG4gICAgdGhpcy5jaGVja0xWYWxQYXR0ZXJuKGV4cHIuYXJndW1lbnQsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpO1xuICAgIGJyZWFrXG5cbiAgZGVmYXVsdDpcbiAgICB0aGlzLmNoZWNrTFZhbFBhdHRlcm4oZXhwciwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcyk7XG4gIH1cbn07XG5cbi8vIFRoZSBhbGdvcml0aG0gdXNlZCB0byBkZXRlcm1pbmUgd2hldGhlciBhIHJlZ2V4cCBjYW4gYXBwZWFyIGF0IGFcbi8vIGdpdmVuIHBvaW50IGluIHRoZSBwcm9ncmFtIGlzIGxvb3NlbHkgYmFzZWQgb24gc3dlZXQuanMnIGFwcHJvYWNoLlxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL3N3ZWV0LmpzL3dpa2kvZGVzaWduXG5cblxudmFyIFRva0NvbnRleHQgPSBmdW5jdGlvbiBUb2tDb250ZXh0KHRva2VuLCBpc0V4cHIsIHByZXNlcnZlU3BhY2UsIG92ZXJyaWRlLCBnZW5lcmF0b3IpIHtcbiAgdGhpcy50b2tlbiA9IHRva2VuO1xuICB0aGlzLmlzRXhwciA9ICEhaXNFeHByO1xuICB0aGlzLnByZXNlcnZlU3BhY2UgPSAhIXByZXNlcnZlU3BhY2U7XG4gIHRoaXMub3ZlcnJpZGUgPSBvdmVycmlkZTtcbiAgdGhpcy5nZW5lcmF0b3IgPSAhIWdlbmVyYXRvcjtcbn07XG5cbnZhciB0eXBlcyA9IHtcbiAgYl9zdGF0OiBuZXcgVG9rQ29udGV4dChcIntcIiwgZmFsc2UpLFxuICBiX2V4cHI6IG5ldyBUb2tDb250ZXh0KFwie1wiLCB0cnVlKSxcbiAgYl90bXBsOiBuZXcgVG9rQ29udGV4dChcIiR7XCIsIGZhbHNlKSxcbiAgcF9zdGF0OiBuZXcgVG9rQ29udGV4dChcIihcIiwgZmFsc2UpLFxuICBwX2V4cHI6IG5ldyBUb2tDb250ZXh0KFwiKFwiLCB0cnVlKSxcbiAgcV90bXBsOiBuZXcgVG9rQ29udGV4dChcImBcIiwgdHJ1ZSwgdHJ1ZSwgZnVuY3Rpb24gKHApIHsgcmV0dXJuIHAudHJ5UmVhZFRlbXBsYXRlVG9rZW4oKTsgfSksXG4gIGZfc3RhdDogbmV3IFRva0NvbnRleHQoXCJmdW5jdGlvblwiLCBmYWxzZSksXG4gIGZfZXhwcjogbmV3IFRva0NvbnRleHQoXCJmdW5jdGlvblwiLCB0cnVlKSxcbiAgZl9leHByX2dlbjogbmV3IFRva0NvbnRleHQoXCJmdW5jdGlvblwiLCB0cnVlLCBmYWxzZSwgbnVsbCwgdHJ1ZSksXG4gIGZfZ2VuOiBuZXcgVG9rQ29udGV4dChcImZ1bmN0aW9uXCIsIGZhbHNlLCBmYWxzZSwgbnVsbCwgdHJ1ZSlcbn07XG5cbnZhciBwcCQ2ID0gUGFyc2VyLnByb3RvdHlwZTtcblxucHAkNi5pbml0aWFsQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW3R5cGVzLmJfc3RhdF1cbn07XG5cbnBwJDYuY3VyQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXVxufTtcblxucHAkNi5icmFjZUlzQmxvY2sgPSBmdW5jdGlvbihwcmV2VHlwZSkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5jdXJDb250ZXh0KCk7XG4gIGlmIChwYXJlbnQgPT09IHR5cGVzLmZfZXhwciB8fCBwYXJlbnQgPT09IHR5cGVzLmZfc3RhdClcbiAgICB7IHJldHVybiB0cnVlIH1cbiAgaWYgKHByZXZUeXBlID09PSB0eXBlcyQxLmNvbG9uICYmIChwYXJlbnQgPT09IHR5cGVzLmJfc3RhdCB8fCBwYXJlbnQgPT09IHR5cGVzLmJfZXhwcikpXG4gICAgeyByZXR1cm4gIXBhcmVudC5pc0V4cHIgfVxuXG4gIC8vIFRoZSBjaGVjayBmb3IgYHR0Lm5hbWUgJiYgZXhwckFsbG93ZWRgIGRldGVjdHMgd2hldGhlciB3ZSBhcmVcbiAgLy8gYWZ0ZXIgYSBgeWllbGRgIG9yIGBvZmAgY29uc3RydWN0LiBTZWUgdGhlIGB1cGRhdGVDb250ZXh0YCBmb3JcbiAgLy8gYHR0Lm5hbWVgLlxuICBpZiAocHJldlR5cGUgPT09IHR5cGVzJDEuX3JldHVybiB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5uYW1lICYmIHRoaXMuZXhwckFsbG93ZWQpXG4gICAgeyByZXR1cm4gbGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLmxhc3RUb2tFbmQsIHRoaXMuc3RhcnQpKSB9XG4gIGlmIChwcmV2VHlwZSA9PT0gdHlwZXMkMS5fZWxzZSB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5zZW1pIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLmVvZiB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5wYXJlblIgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuYXJyb3cpXG4gICAgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmIChwcmV2VHlwZSA9PT0gdHlwZXMkMS5icmFjZUwpXG4gICAgeyByZXR1cm4gcGFyZW50ID09PSB0eXBlcy5iX3N0YXQgfVxuICBpZiAocHJldlR5cGUgPT09IHR5cGVzJDEuX3ZhciB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5fY29uc3QgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEubmFtZSlcbiAgICB7IHJldHVybiBmYWxzZSB9XG4gIHJldHVybiAhdGhpcy5leHByQWxsb3dlZFxufTtcblxucHAkNi5pbkdlbmVyYXRvckNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IHRoaXMuY29udGV4dC5sZW5ndGggLSAxOyBpID49IDE7IGktLSkge1xuICAgIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0W2ldO1xuICAgIGlmIChjb250ZXh0LnRva2VuID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICB7IHJldHVybiBjb250ZXh0LmdlbmVyYXRvciB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG5wcCQ2LnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbihwcmV2VHlwZSkge1xuICB2YXIgdXBkYXRlLCB0eXBlID0gdGhpcy50eXBlO1xuICBpZiAodHlwZS5rZXl3b3JkICYmIHByZXZUeXBlID09PSB0eXBlcyQxLmRvdClcbiAgICB7IHRoaXMuZXhwckFsbG93ZWQgPSBmYWxzZTsgfVxuICBlbHNlIGlmICh1cGRhdGUgPSB0eXBlLnVwZGF0ZUNvbnRleHQpXG4gICAgeyB1cGRhdGUuY2FsbCh0aGlzLCBwcmV2VHlwZSk7IH1cbiAgZWxzZVxuICAgIHsgdGhpcy5leHByQWxsb3dlZCA9IHR5cGUuYmVmb3JlRXhwcjsgfVxufTtcblxuLy8gVXNlZCB0byBoYW5kbGUgZWRnZSBjYXNlcyB3aGVuIHRva2VuIGNvbnRleHQgY291bGQgbm90IGJlIGluZmVycmVkIGNvcnJlY3RseSBkdXJpbmcgdG9rZW5pemF0aW9uIHBoYXNlXG5cbnBwJDYub3ZlcnJpZGVDb250ZXh0ID0gZnVuY3Rpb24odG9rZW5DdHgpIHtcbiAgaWYgKHRoaXMuY3VyQ29udGV4dCgpICE9PSB0b2tlbkN0eCkge1xuICAgIHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV0gPSB0b2tlbkN0eDtcbiAgfVxufTtcblxuLy8gVG9rZW4tc3BlY2lmaWMgY29udGV4dCB1cGRhdGUgY29kZVxuXG50eXBlcyQxLnBhcmVuUi51cGRhdGVDb250ZXh0ID0gdHlwZXMkMS5icmFjZVIudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jb250ZXh0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHRoaXMuZXhwckFsbG93ZWQgPSB0cnVlO1xuICAgIHJldHVyblxuICB9XG4gIHZhciBvdXQgPSB0aGlzLmNvbnRleHQucG9wKCk7XG4gIGlmIChvdXQgPT09IHR5cGVzLmJfc3RhdCAmJiB0aGlzLmN1ckNvbnRleHQoKS50b2tlbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgb3V0ID0gdGhpcy5jb250ZXh0LnBvcCgpO1xuICB9XG4gIHRoaXMuZXhwckFsbG93ZWQgPSAhb3V0LmlzRXhwcjtcbn07XG5cbnR5cGVzJDEuYnJhY2VMLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbihwcmV2VHlwZSkge1xuICB0aGlzLmNvbnRleHQucHVzaCh0aGlzLmJyYWNlSXNCbG9jayhwcmV2VHlwZSkgPyB0eXBlcy5iX3N0YXQgOiB0eXBlcy5iX2V4cHIpO1xuICB0aGlzLmV4cHJBbGxvd2VkID0gdHJ1ZTtcbn07XG5cbnR5cGVzJDEuZG9sbGFyQnJhY2VMLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jb250ZXh0LnB1c2godHlwZXMuYl90bXBsKTtcbiAgdGhpcy5leHByQWxsb3dlZCA9IHRydWU7XG59O1xuXG50eXBlcyQxLnBhcmVuTC51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24ocHJldlR5cGUpIHtcbiAgdmFyIHN0YXRlbWVudFBhcmVucyA9IHByZXZUeXBlID09PSB0eXBlcyQxLl9pZiB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5fZm9yIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLl93aXRoIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLl93aGlsZTtcbiAgdGhpcy5jb250ZXh0LnB1c2goc3RhdGVtZW50UGFyZW5zID8gdHlwZXMucF9zdGF0IDogdHlwZXMucF9leHByKTtcbiAgdGhpcy5leHByQWxsb3dlZCA9IHRydWU7XG59O1xuXG50eXBlcyQxLmluY0RlYy51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIHRva0V4cHJBbGxvd2VkIHN0YXlzIHVuY2hhbmdlZFxufTtcblxudHlwZXMkMS5fZnVuY3Rpb24udXBkYXRlQ29udGV4dCA9IHR5cGVzJDEuX2NsYXNzLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbihwcmV2VHlwZSkge1xuICBpZiAocHJldlR5cGUuYmVmb3JlRXhwciAmJiBwcmV2VHlwZSAhPT0gdHlwZXMkMS5fZWxzZSAmJlxuICAgICAgIShwcmV2VHlwZSA9PT0gdHlwZXMkMS5zZW1pICYmIHRoaXMuY3VyQ29udGV4dCgpICE9PSB0eXBlcy5wX3N0YXQpICYmXG4gICAgICAhKHByZXZUeXBlID09PSB0eXBlcyQxLl9yZXR1cm4gJiYgbGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLmxhc3RUb2tFbmQsIHRoaXMuc3RhcnQpKSkgJiZcbiAgICAgICEoKHByZXZUeXBlID09PSB0eXBlcyQxLmNvbG9uIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLmJyYWNlTCkgJiYgdGhpcy5jdXJDb250ZXh0KCkgPT09IHR5cGVzLmJfc3RhdCkpXG4gICAgeyB0aGlzLmNvbnRleHQucHVzaCh0eXBlcy5mX2V4cHIpOyB9XG4gIGVsc2VcbiAgICB7IHRoaXMuY29udGV4dC5wdXNoKHR5cGVzLmZfc3RhdCk7IH1cbiAgdGhpcy5leHByQWxsb3dlZCA9IGZhbHNlO1xufTtcblxudHlwZXMkMS5jb2xvbi51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmN1ckNvbnRleHQoKS50b2tlbiA9PT0gXCJmdW5jdGlvblwiKSB7IHRoaXMuY29udGV4dC5wb3AoKTsgfVxuICB0aGlzLmV4cHJBbGxvd2VkID0gdHJ1ZTtcbn07XG5cbnR5cGVzJDEuYmFja1F1b3RlLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY3VyQ29udGV4dCgpID09PSB0eXBlcy5xX3RtcGwpXG4gICAgeyB0aGlzLmNvbnRleHQucG9wKCk7IH1cbiAgZWxzZVxuICAgIHsgdGhpcy5jb250ZXh0LnB1c2godHlwZXMucV90bXBsKTsgfVxuICB0aGlzLmV4cHJBbGxvd2VkID0gZmFsc2U7XG59O1xuXG50eXBlcyQxLnN0YXIudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKHByZXZUeXBlKSB7XG4gIGlmIChwcmV2VHlwZSA9PT0gdHlwZXMkMS5fZnVuY3Rpb24pIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLmNvbnRleHQubGVuZ3RoIC0gMTtcbiAgICBpZiAodGhpcy5jb250ZXh0W2luZGV4XSA9PT0gdHlwZXMuZl9leHByKVxuICAgICAgeyB0aGlzLmNvbnRleHRbaW5kZXhdID0gdHlwZXMuZl9leHByX2dlbjsgfVxuICAgIGVsc2VcbiAgICAgIHsgdGhpcy5jb250ZXh0W2luZGV4XSA9IHR5cGVzLmZfZ2VuOyB9XG4gIH1cbiAgdGhpcy5leHByQWxsb3dlZCA9IHRydWU7XG59O1xuXG50eXBlcyQxLm5hbWUudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKHByZXZUeXBlKSB7XG4gIHZhciBhbGxvd2VkID0gZmFsc2U7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiBwcmV2VHlwZSAhPT0gdHlwZXMkMS5kb3QpIHtcbiAgICBpZiAodGhpcy52YWx1ZSA9PT0gXCJvZlwiICYmICF0aGlzLmV4cHJBbGxvd2VkIHx8XG4gICAgICAgIHRoaXMudmFsdWUgPT09IFwieWllbGRcIiAmJiB0aGlzLmluR2VuZXJhdG9yQ29udGV4dCgpKVxuICAgICAgeyBhbGxvd2VkID0gdHJ1ZTsgfVxuICB9XG4gIHRoaXMuZXhwckFsbG93ZWQgPSBhbGxvd2VkO1xufTtcblxuLy8gQSByZWN1cnNpdmUgZGVzY2VudCBwYXJzZXIgb3BlcmF0ZXMgYnkgZGVmaW5pbmcgZnVuY3Rpb25zIGZvciBhbGxcbi8vIHN5bnRhY3RpYyBlbGVtZW50cywgYW5kIHJlY3Vyc2l2ZWx5IGNhbGxpbmcgdGhvc2UsIGVhY2ggZnVuY3Rpb25cbi8vIGFkdmFuY2luZyB0aGUgaW5wdXQgc3RyZWFtIGFuZCByZXR1cm5pbmcgYW4gQVNUIG5vZGUuIFByZWNlZGVuY2Vcbi8vIG9mIGNvbnN0cnVjdHMgKGZvciBleGFtcGxlLCB0aGUgZmFjdCB0aGF0IGAheFsxXWAgbWVhbnMgYCEoeFsxXSlgXG4vLyBpbnN0ZWFkIG9mIGAoIXgpWzFdYCBpcyBoYW5kbGVkIGJ5IHRoZSBmYWN0IHRoYXQgdGhlIHBhcnNlclxuLy8gZnVuY3Rpb24gdGhhdCBwYXJzZXMgdW5hcnkgcHJlZml4IG9wZXJhdG9ycyBpcyBjYWxsZWQgZmlyc3QsIGFuZFxuLy8gaW4gdHVybiBjYWxscyB0aGUgZnVuY3Rpb24gdGhhdCBwYXJzZXMgYFtdYCBzdWJzY3JpcHRzIFx1MjAxNCB0aGF0XG4vLyB3YXksIGl0J2xsIHJlY2VpdmUgdGhlIG5vZGUgZm9yIGB4WzFdYCBhbHJlYWR5IHBhcnNlZCwgYW5kIHdyYXBzXG4vLyAqdGhhdCogaW4gdGhlIHVuYXJ5IG9wZXJhdG9yIG5vZGUuXG4vL1xuLy8gQWNvcm4gdXNlcyBhbiBbb3BlcmF0b3IgcHJlY2VkZW5jZSBwYXJzZXJdW29wcF0gdG8gaGFuZGxlIGJpbmFyeVxuLy8gb3BlcmF0b3IgcHJlY2VkZW5jZSwgYmVjYXVzZSBpdCBpcyBtdWNoIG1vcmUgY29tcGFjdCB0aGFuIHVzaW5nXG4vLyB0aGUgdGVjaG5pcXVlIG91dGxpbmVkIGFib3ZlLCB3aGljaCB1c2VzIGRpZmZlcmVudCwgbmVzdGluZ1xuLy8gZnVuY3Rpb25zIHRvIHNwZWNpZnkgcHJlY2VkZW5jZSwgZm9yIGFsbCBvZiB0aGUgdGVuIGJpbmFyeVxuLy8gcHJlY2VkZW5jZSBsZXZlbHMgdGhhdCBKYXZhU2NyaXB0IGRlZmluZXMuXG4vL1xuLy8gW29wcF06IGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvT3BlcmF0b3ItcHJlY2VkZW5jZV9wYXJzZXJcblxuXG52YXIgcHAkNSA9IFBhcnNlci5wcm90b3R5cGU7XG5cbi8vIENoZWNrIGlmIHByb3BlcnR5IG5hbWUgY2xhc2hlcyB3aXRoIGFscmVhZHkgYWRkZWQuXG4vLyBPYmplY3QvY2xhc3MgZ2V0dGVycyBhbmQgc2V0dGVycyBhcmUgbm90IGFsbG93ZWQgdG8gY2xhc2ggXHUyMDE0XG4vLyBlaXRoZXIgd2l0aCBlYWNoIG90aGVyIG9yIHdpdGggYW4gaW5pdCBwcm9wZXJ0eSBcdTIwMTQgYW5kIGluXG4vLyBzdHJpY3QgbW9kZSwgaW5pdCBwcm9wZXJ0aWVzIGFyZSBhbHNvIG5vdCBhbGxvd2VkIHRvIGJlIHJlcGVhdGVkLlxuXG5wcCQ1LmNoZWNrUHJvcENsYXNoID0gZnVuY3Rpb24ocHJvcCwgcHJvcEhhc2gsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ICYmIHByb3AudHlwZSA9PT0gXCJTcHJlYWRFbGVtZW50XCIpXG4gICAgeyByZXR1cm4gfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgKHByb3AuY29tcHV0ZWQgfHwgcHJvcC5tZXRob2QgfHwgcHJvcC5zaG9ydGhhbmQpKVxuICAgIHsgcmV0dXJuIH1cbiAgdmFyIGtleSA9IHByb3Aua2V5O1xuICB2YXIgbmFtZTtcbiAgc3dpdGNoIChrZXkudHlwZSkge1xuICBjYXNlIFwiSWRlbnRpZmllclwiOiBuYW1lID0ga2V5Lm5hbWU7IGJyZWFrXG4gIGNhc2UgXCJMaXRlcmFsXCI6IG5hbWUgPSBTdHJpbmcoa2V5LnZhbHVlKTsgYnJlYWtcbiAgZGVmYXVsdDogcmV0dXJuXG4gIH1cbiAgdmFyIGtpbmQgPSBwcm9wLmtpbmQ7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikge1xuICAgIGlmIChuYW1lID09PSBcIl9fcHJvdG9fX1wiICYmIGtpbmQgPT09IFwiaW5pdFwiKSB7XG4gICAgICBpZiAocHJvcEhhc2gucHJvdG8pIHtcbiAgICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgICAgICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5kb3VibGVQcm90byA8IDApIHtcbiAgICAgICAgICAgIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuZG91YmxlUHJvdG8gPSBrZXkuc3RhcnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShrZXkuc3RhcnQsIFwiUmVkZWZpbml0aW9uIG9mIF9fcHJvdG9fXyBwcm9wZXJ0eVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcHJvcEhhc2gucHJvdG8gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm5cbiAgfVxuICBuYW1lID0gXCIkXCIgKyBuYW1lO1xuICB2YXIgb3RoZXIgPSBwcm9wSGFzaFtuYW1lXTtcbiAgaWYgKG90aGVyKSB7XG4gICAgdmFyIHJlZGVmaW5pdGlvbjtcbiAgICBpZiAoa2luZCA9PT0gXCJpbml0XCIpIHtcbiAgICAgIHJlZGVmaW5pdGlvbiA9IHRoaXMuc3RyaWN0ICYmIG90aGVyLmluaXQgfHwgb3RoZXIuZ2V0IHx8IG90aGVyLnNldDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVkZWZpbml0aW9uID0gb3RoZXIuaW5pdCB8fCBvdGhlcltraW5kXTtcbiAgICB9XG4gICAgaWYgKHJlZGVmaW5pdGlvbilcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGtleS5zdGFydCwgXCJSZWRlZmluaXRpb24gb2YgcHJvcGVydHlcIik7IH1cbiAgfSBlbHNlIHtcbiAgICBvdGhlciA9IHByb3BIYXNoW25hbWVdID0ge1xuICAgICAgaW5pdDogZmFsc2UsXG4gICAgICBnZXQ6IGZhbHNlLFxuICAgICAgc2V0OiBmYWxzZVxuICAgIH07XG4gIH1cbiAgb3RoZXJba2luZF0gPSB0cnVlO1xufTtcblxuLy8gIyMjIEV4cHJlc3Npb24gcGFyc2luZ1xuXG4vLyBUaGVzZSBuZXN0LCBmcm9tIHRoZSBtb3N0IGdlbmVyYWwgZXhwcmVzc2lvbiB0eXBlIGF0IHRoZSB0b3AgdG9cbi8vICdhdG9taWMnLCBub25kaXZpc2libGUgZXhwcmVzc2lvbiB0eXBlcyBhdCB0aGUgYm90dG9tLiBNb3N0IG9mXG4vLyB0aGUgZnVuY3Rpb25zIHdpbGwgc2ltcGx5IGxldCB0aGUgZnVuY3Rpb24ocykgYmVsb3cgdGhlbSBwYXJzZSxcbi8vIGFuZCwgKmlmKiB0aGUgc3ludGFjdGljIGNvbnN0cnVjdCB0aGV5IGhhbmRsZSBpcyBwcmVzZW50LCB3cmFwXG4vLyB0aGUgQVNUIG5vZGUgdGhhdCB0aGUgaW5uZXIgcGFyc2VyIGdhdmUgdGhlbSBpbiBhbm90aGVyIG5vZGUuXG5cbi8vIFBhcnNlIGEgZnVsbCBleHByZXNzaW9uLiBUaGUgb3B0aW9uYWwgYXJndW1lbnRzIGFyZSB1c2VkIHRvXG4vLyBmb3JiaWQgdGhlIGBpbmAgb3BlcmF0b3IgKGluIGZvciBsb29wcyBpbml0YWxpemF0aW9uIGV4cHJlc3Npb25zKVxuLy8gYW5kIHByb3ZpZGUgcmVmZXJlbmNlIGZvciBzdG9yaW5nICc9JyBvcGVyYXRvciBpbnNpZGUgc2hvcnRoYW5kXG4vLyBwcm9wZXJ0eSBhc3NpZ25tZW50IGluIGNvbnRleHRzIHdoZXJlIGJvdGggb2JqZWN0IGV4cHJlc3Npb25cbi8vIGFuZCBvYmplY3QgcGF0dGVybiBtaWdodCBhcHBlYXIgKHNvIGl0J3MgcG9zc2libGUgdG8gcmFpc2Vcbi8vIGRlbGF5ZWQgc3ludGF4IGVycm9yIGF0IGNvcnJlY3QgcG9zaXRpb24pLlxuXG5wcCQ1LnBhcnNlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICB2YXIgZXhwciA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSkge1xuICAgIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgIG5vZGUuZXhwcmVzc2lvbnMgPSBbZXhwcl07XG4gICAgd2hpbGUgKHRoaXMuZWF0KHR5cGVzJDEuY29tbWEpKSB7IG5vZGUuZXhwcmVzc2lvbnMucHVzaCh0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykpOyB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlNlcXVlbmNlRXhwcmVzc2lvblwiKVxuICB9XG4gIHJldHVybiBleHByXG59O1xuXG4vLyBQYXJzZSBhbiBhc3NpZ25tZW50IGV4cHJlc3Npb24uIFRoaXMgaW5jbHVkZXMgYXBwbGljYXRpb25zIG9mXG4vLyBvcGVyYXRvcnMgbGlrZSBgKz1gLlxuXG5wcCQ1LnBhcnNlTWF5YmVBc3NpZ24gPSBmdW5jdGlvbihmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBhZnRlckxlZnRQYXJzZSkge1xuICBpZiAodGhpcy5pc0NvbnRleHR1YWwoXCJ5aWVsZFwiKSkge1xuICAgIGlmICh0aGlzLmluR2VuZXJhdG9yKSB7IHJldHVybiB0aGlzLnBhcnNlWWllbGQoZm9ySW5pdCkgfVxuICAgIC8vIFRoZSB0b2tlbml6ZXIgd2lsbCBhc3N1bWUgYW4gZXhwcmVzc2lvbiBpcyBhbGxvd2VkIGFmdGVyXG4gICAgLy8gYHlpZWxkYCwgYnV0IHRoaXMgaXNuJ3QgdGhhdCBraW5kIG9mIHlpZWxkXG4gICAgZWxzZSB7IHRoaXMuZXhwckFsbG93ZWQgPSBmYWxzZTsgfVxuICB9XG5cbiAgdmFyIG93bkRlc3RydWN0dXJpbmdFcnJvcnMgPSBmYWxzZSwgb2xkUGFyZW5Bc3NpZ24gPSAtMSwgb2xkVHJhaWxpbmdDb21tYSA9IC0xLCBvbGREb3VibGVQcm90byA9IC0xO1xuICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICAgIG9sZFBhcmVuQXNzaWduID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduO1xuICAgIG9sZFRyYWlsaW5nQ29tbWEgPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWE7XG4gICAgb2xkRG91YmxlUHJvdG8gPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLmRvdWJsZVByb3RvO1xuICAgIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA9IC0xO1xuICB9IGVsc2Uge1xuICAgIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMgPSBuZXcgRGVzdHJ1Y3R1cmluZ0Vycm9ycztcbiAgICBvd25EZXN0cnVjdHVyaW5nRXJyb3JzID0gdHJ1ZTtcbiAgfVxuXG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wYXJlbkwgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUpIHtcbiAgICB0aGlzLnBvdGVudGlhbEFycm93QXQgPSB0aGlzLnN0YXJ0O1xuICAgIHRoaXMucG90ZW50aWFsQXJyb3dJbkZvckF3YWl0ID0gZm9ySW5pdCA9PT0gXCJhd2FpdFwiO1xuICB9XG4gIHZhciBsZWZ0ID0gdGhpcy5wYXJzZU1heWJlQ29uZGl0aW9uYWwoZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gIGlmIChhZnRlckxlZnRQYXJzZSkgeyBsZWZ0ID0gYWZ0ZXJMZWZ0UGFyc2UuY2FsbCh0aGlzLCBsZWZ0LCBzdGFydFBvcywgc3RhcnRMb2MpOyB9XG4gIGlmICh0aGlzLnR5cGUuaXNBc3NpZ24pIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICBub2RlLm9wZXJhdG9yID0gdGhpcy52YWx1ZTtcbiAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmVxKVxuICAgICAgeyBsZWZ0ID0gdGhpcy50b0Fzc2lnbmFibGUobGVmdCwgZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpOyB9XG4gICAgaWYgKCFvd25EZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gICAgICByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLmRvdWJsZVByb3RvID0gLTE7XG4gICAgfVxuICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnNob3J0aGFuZEFzc2lnbiA+PSBsZWZ0LnN0YXJ0KVxuICAgICAgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnNob3J0aGFuZEFzc2lnbiA9IC0xOyB9IC8vIHJlc2V0IGJlY2F1c2Ugc2hvcnRoYW5kIGRlZmF1bHQgd2FzIHVzZWQgY29ycmVjdGx5XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lcSlcbiAgICAgIHsgdGhpcy5jaGVja0xWYWxQYXR0ZXJuKGxlZnQpOyB9XG4gICAgZWxzZVxuICAgICAgeyB0aGlzLmNoZWNrTFZhbFNpbXBsZShsZWZ0KTsgfVxuICAgIG5vZGUubGVmdCA9IGxlZnQ7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgbm9kZS5yaWdodCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmb3JJbml0KTtcbiAgICBpZiAob2xkRG91YmxlUHJvdG8gPiAtMSkgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLmRvdWJsZVByb3RvID0gb2xkRG91YmxlUHJvdG87IH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQXNzaWdubWVudEV4cHJlc3Npb25cIilcbiAgfSBlbHNlIHtcbiAgICBpZiAob3duRGVzdHJ1Y3R1cmluZ0Vycm9ycykgeyB0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTsgfVxuICB9XG4gIGlmIChvbGRQYXJlbkFzc2lnbiA+IC0xKSB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA9IG9sZFBhcmVuQXNzaWduOyB9XG4gIGlmIChvbGRUcmFpbGluZ0NvbW1hID4gLTEpIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID0gb2xkVHJhaWxpbmdDb21tYTsgfVxuICByZXR1cm4gbGVmdFxufTtcblxuLy8gUGFyc2UgYSB0ZXJuYXJ5IGNvbmRpdGlvbmFsIChgPzpgKSBvcGVyYXRvci5cblxucHAkNS5wYXJzZU1heWJlQ29uZGl0aW9uYWwgPSBmdW5jdGlvbihmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgdmFyIGV4cHIgPSB0aGlzLnBhcnNlRXhwck9wcyhmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgaWYgKHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpKSB7IHJldHVybiBleHByIH1cbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEucXVlc3Rpb24pKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgbm9kZS50ZXN0ID0gZXhwcjtcbiAgICBub2RlLmNvbnNlcXVlbnQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcbiAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbG9uKTtcbiAgICBub2RlLmFsdGVybmF0ZSA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmb3JJbml0KTtcbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQ29uZGl0aW9uYWxFeHByZXNzaW9uXCIpXG4gIH1cbiAgcmV0dXJuIGV4cHJcbn07XG5cbi8vIFN0YXJ0IHRoZSBwcmVjZWRlbmNlIHBhcnNlci5cblxucHAkNS5wYXJzZUV4cHJPcHMgPSBmdW5jdGlvbihmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgdmFyIGV4cHIgPSB0aGlzLnBhcnNlTWF5YmVVbmFyeShyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBmYWxzZSwgZmFsc2UsIGZvckluaXQpO1xuICBpZiAodGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykpIHsgcmV0dXJuIGV4cHIgfVxuICByZXR1cm4gZXhwci5zdGFydCA9PT0gc3RhcnRQb3MgJiYgZXhwci50eXBlID09PSBcIkFycm93RnVuY3Rpb25FeHByZXNzaW9uXCIgPyBleHByIDogdGhpcy5wYXJzZUV4cHJPcChleHByLCBzdGFydFBvcywgc3RhcnRMb2MsIC0xLCBmb3JJbml0KVxufTtcblxuLy8gUGFyc2UgYmluYXJ5IG9wZXJhdG9ycyB3aXRoIHRoZSBvcGVyYXRvciBwcmVjZWRlbmNlIHBhcnNpbmdcbi8vIGFsZ29yaXRobS4gYGxlZnRgIGlzIHRoZSBsZWZ0LWhhbmQgc2lkZSBvZiB0aGUgb3BlcmF0b3IuXG4vLyBgbWluUHJlY2AgcHJvdmlkZXMgY29udGV4dCB0aGF0IGFsbG93cyB0aGUgZnVuY3Rpb24gdG8gc3RvcCBhbmRcbi8vIGRlZmVyIGZ1cnRoZXIgcGFyc2VyIHRvIG9uZSBvZiBpdHMgY2FsbGVycyB3aGVuIGl0IGVuY291bnRlcnMgYW5cbi8vIG9wZXJhdG9yIHRoYXQgaGFzIGEgbG93ZXIgcHJlY2VkZW5jZSB0aGFuIHRoZSBzZXQgaXQgaXMgcGFyc2luZy5cblxucHAkNS5wYXJzZUV4cHJPcCA9IGZ1bmN0aW9uKGxlZnQsIGxlZnRTdGFydFBvcywgbGVmdFN0YXJ0TG9jLCBtaW5QcmVjLCBmb3JJbml0KSB7XG4gIHZhciBwcmVjID0gdGhpcy50eXBlLmJpbm9wO1xuICBpZiAocHJlYyAhPSBudWxsICYmICghZm9ySW5pdCB8fCB0aGlzLnR5cGUgIT09IHR5cGVzJDEuX2luKSkge1xuICAgIGlmIChwcmVjID4gbWluUHJlYykge1xuICAgICAgdmFyIGxvZ2ljYWwgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEubG9naWNhbE9SIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5sb2dpY2FsQU5EO1xuICAgICAgdmFyIGNvYWxlc2NlID0gdGhpcy50eXBlID09PSB0eXBlcyQxLmNvYWxlc2NlO1xuICAgICAgaWYgKGNvYWxlc2NlKSB7XG4gICAgICAgIC8vIEhhbmRsZSB0aGUgcHJlY2VkZW5jZSBvZiBgdHQuY29hbGVzY2VgIGFzIGVxdWFsIHRvIHRoZSByYW5nZSBvZiBsb2dpY2FsIGV4cHJlc3Npb25zLlxuICAgICAgICAvLyBJbiBvdGhlciB3b3JkcywgYG5vZGUucmlnaHRgIHNob3VsZG4ndCBjb250YWluIGxvZ2ljYWwgZXhwcmVzc2lvbnMgaW4gb3JkZXIgdG8gY2hlY2sgdGhlIG1peGVkIGVycm9yLlxuICAgICAgICBwcmVjID0gdHlwZXMkMS5sb2dpY2FsQU5ELmJpbm9wO1xuICAgICAgfVxuICAgICAgdmFyIG9wID0gdGhpcy52YWx1ZTtcbiAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICAgICAgdmFyIHJpZ2h0ID0gdGhpcy5wYXJzZUV4cHJPcCh0aGlzLnBhcnNlTWF5YmVVbmFyeShudWxsLCBmYWxzZSwgZmFsc2UsIGZvckluaXQpLCBzdGFydFBvcywgc3RhcnRMb2MsIHByZWMsIGZvckluaXQpO1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLmJ1aWxkQmluYXJ5KGxlZnRTdGFydFBvcywgbGVmdFN0YXJ0TG9jLCBsZWZ0LCByaWdodCwgb3AsIGxvZ2ljYWwgfHwgY29hbGVzY2UpO1xuICAgICAgaWYgKChsb2dpY2FsICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb2FsZXNjZSkgfHwgKGNvYWxlc2NlICYmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEubG9naWNhbE9SIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5sb2dpY2FsQU5EKSkpIHtcbiAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIFwiTG9naWNhbCBleHByZXNzaW9ucyBhbmQgY29hbGVzY2UgZXhwcmVzc2lvbnMgY2Fubm90IGJlIG1peGVkLiBXcmFwIGVpdGhlciBieSBwYXJlbnRoZXNlc1wiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnBhcnNlRXhwck9wKG5vZGUsIGxlZnRTdGFydFBvcywgbGVmdFN0YXJ0TG9jLCBtaW5QcmVjLCBmb3JJbml0KVxuICAgIH1cbiAgfVxuICByZXR1cm4gbGVmdFxufTtcblxucHAkNS5idWlsZEJpbmFyeSA9IGZ1bmN0aW9uKHN0YXJ0UG9zLCBzdGFydExvYywgbGVmdCwgcmlnaHQsIG9wLCBsb2dpY2FsKSB7XG4gIGlmIChyaWdodC50eXBlID09PSBcIlByaXZhdGVJZGVudGlmaWVyXCIpIHsgdGhpcy5yYWlzZShyaWdodC5zdGFydCwgXCJQcml2YXRlIGlkZW50aWZpZXIgY2FuIG9ubHkgYmUgbGVmdCBzaWRlIG9mIGJpbmFyeSBleHByZXNzaW9uXCIpOyB9XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICBub2RlLmxlZnQgPSBsZWZ0O1xuICBub2RlLm9wZXJhdG9yID0gb3A7XG4gIG5vZGUucmlnaHQgPSByaWdodDtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBsb2dpY2FsID8gXCJMb2dpY2FsRXhwcmVzc2lvblwiIDogXCJCaW5hcnlFeHByZXNzaW9uXCIpXG59O1xuXG4vLyBQYXJzZSB1bmFyeSBvcGVyYXRvcnMsIGJvdGggcHJlZml4IGFuZCBwb3N0Zml4LlxuXG5wcCQ1LnBhcnNlTWF5YmVVbmFyeSA9IGZ1bmN0aW9uKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHNhd1VuYXJ5LCBpbmNEZWMsIGZvckluaXQpIHtcbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jLCBleHByO1xuICBpZiAodGhpcy5pc0NvbnRleHR1YWwoXCJhd2FpdFwiKSAmJiB0aGlzLmNhbkF3YWl0KSB7XG4gICAgZXhwciA9IHRoaXMucGFyc2VBd2FpdChmb3JJbml0KTtcbiAgICBzYXdVbmFyeSA9IHRydWU7XG4gIH0gZWxzZSBpZiAodGhpcy50eXBlLnByZWZpeCkge1xuICAgIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKSwgdXBkYXRlID0gdGhpcy50eXBlID09PSB0eXBlcyQxLmluY0RlYztcbiAgICBub2RlLm9wZXJhdG9yID0gdGhpcy52YWx1ZTtcbiAgICBub2RlLnByZWZpeCA9IHRydWU7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgbm9kZS5hcmd1bWVudCA9IHRoaXMucGFyc2VNYXliZVVuYXJ5KG51bGwsIHRydWUsIHVwZGF0ZSwgZm9ySW5pdCk7XG4gICAgdGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7XG4gICAgaWYgKHVwZGF0ZSkgeyB0aGlzLmNoZWNrTFZhbFNpbXBsZShub2RlLmFyZ3VtZW50KTsgfVxuICAgIGVsc2UgaWYgKHRoaXMuc3RyaWN0ICYmIG5vZGUub3BlcmF0b3IgPT09IFwiZGVsZXRlXCIgJiYgaXNMb2NhbFZhcmlhYmxlQWNjZXNzKG5vZGUuYXJndW1lbnQpKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCJEZWxldGluZyBsb2NhbCB2YXJpYWJsZSBpbiBzdHJpY3QgbW9kZVwiKTsgfVxuICAgIGVsc2UgaWYgKG5vZGUub3BlcmF0b3IgPT09IFwiZGVsZXRlXCIgJiYgaXNQcml2YXRlRmllbGRBY2Nlc3Mobm9kZS5hcmd1bWVudCkpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIlByaXZhdGUgZmllbGRzIGNhbiBub3QgYmUgZGVsZXRlZFwiKTsgfVxuICAgIGVsc2UgeyBzYXdVbmFyeSA9IHRydWU7IH1cbiAgICBleHByID0gdGhpcy5maW5pc2hOb2RlKG5vZGUsIHVwZGF0ZSA/IFwiVXBkYXRlRXhwcmVzc2lvblwiIDogXCJVbmFyeUV4cHJlc3Npb25cIik7XG4gIH0gZWxzZSBpZiAoIXNhd1VuYXJ5ICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wcml2YXRlSWQpIHtcbiAgICBpZiAoKGZvckluaXQgfHwgdGhpcy5wcml2YXRlTmFtZVN0YWNrLmxlbmd0aCA9PT0gMCkgJiYgdGhpcy5vcHRpb25zLmNoZWNrUHJpdmF0ZUZpZWxkcykgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIGV4cHIgPSB0aGlzLnBhcnNlUHJpdmF0ZUlkZW50KCk7XG4gICAgLy8gb25seSBjb3VsZCBiZSBwcml2YXRlIGZpZWxkcyBpbiAnaW4nLCBzdWNoIGFzICN4IGluIG9ialxuICAgIGlmICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuX2luKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gIH0gZWxzZSB7XG4gICAgZXhwciA9IHRoaXMucGFyc2VFeHByU3Vic2NyaXB0cyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBmb3JJbml0KTtcbiAgICBpZiAodGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykpIHsgcmV0dXJuIGV4cHIgfVxuICAgIHdoaWxlICh0aGlzLnR5cGUucG9zdGZpeCAmJiAhdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSkge1xuICAgICAgdmFyIG5vZGUkMSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICAgIG5vZGUkMS5vcGVyYXRvciA9IHRoaXMudmFsdWU7XG4gICAgICBub2RlJDEucHJlZml4ID0gZmFsc2U7XG4gICAgICBub2RlJDEuYXJndW1lbnQgPSBleHByO1xuICAgICAgdGhpcy5jaGVja0xWYWxTaW1wbGUoZXhwcik7XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICAgIGV4cHIgPSB0aGlzLmZpbmlzaE5vZGUobm9kZSQxLCBcIlVwZGF0ZUV4cHJlc3Npb25cIik7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFpbmNEZWMgJiYgdGhpcy5lYXQodHlwZXMkMS5zdGFyc3RhcikpIHtcbiAgICBpZiAoc2F3VW5hcnkpXG4gICAgICB7IHRoaXMudW5leHBlY3RlZCh0aGlzLmxhc3RUb2tTdGFydCk7IH1cbiAgICBlbHNlXG4gICAgICB7IHJldHVybiB0aGlzLmJ1aWxkQmluYXJ5KHN0YXJ0UG9zLCBzdGFydExvYywgZXhwciwgdGhpcy5wYXJzZU1heWJlVW5hcnkobnVsbCwgZmFsc2UsIGZhbHNlLCBmb3JJbml0KSwgXCIqKlwiLCBmYWxzZSkgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBleHByXG4gIH1cbn07XG5cbmZ1bmN0aW9uIGlzTG9jYWxWYXJpYWJsZUFjY2Vzcyhub2RlKSB7XG4gIHJldHVybiAoXG4gICAgbm9kZS50eXBlID09PSBcIklkZW50aWZpZXJcIiB8fFxuICAgIG5vZGUudHlwZSA9PT0gXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiICYmIGlzTG9jYWxWYXJpYWJsZUFjY2Vzcyhub2RlLmV4cHJlc3Npb24pXG4gIClcbn1cblxuZnVuY3Rpb24gaXNQcml2YXRlRmllbGRBY2Nlc3Mobm9kZSkge1xuICByZXR1cm4gKFxuICAgIG5vZGUudHlwZSA9PT0gXCJNZW1iZXJFeHByZXNzaW9uXCIgJiYgbm9kZS5wcm9wZXJ0eS50eXBlID09PSBcIlByaXZhdGVJZGVudGlmaWVyXCIgfHxcbiAgICBub2RlLnR5cGUgPT09IFwiQ2hhaW5FeHByZXNzaW9uXCIgJiYgaXNQcml2YXRlRmllbGRBY2Nlc3Mobm9kZS5leHByZXNzaW9uKSB8fFxuICAgIG5vZGUudHlwZSA9PT0gXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiICYmIGlzUHJpdmF0ZUZpZWxkQWNjZXNzKG5vZGUuZXhwcmVzc2lvbilcbiAgKVxufVxuXG4vLyBQYXJzZSBjYWxsLCBkb3QsIGFuZCBgW11gLXN1YnNjcmlwdCBleHByZXNzaW9ucy5cblxucHAkNS5wYXJzZUV4cHJTdWJzY3JpcHRzID0gZnVuY3Rpb24ocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgZm9ySW5pdCkge1xuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gIHZhciBleHByID0gdGhpcy5wYXJzZUV4cHJBdG9tKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGZvckluaXQpO1xuICBpZiAoZXhwci50eXBlID09PSBcIkFycm93RnVuY3Rpb25FeHByZXNzaW9uXCIgJiYgdGhpcy5pbnB1dC5zbGljZSh0aGlzLmxhc3RUb2tTdGFydCwgdGhpcy5sYXN0VG9rRW5kKSAhPT0gXCIpXCIpXG4gICAgeyByZXR1cm4gZXhwciB9XG4gIHZhciByZXN1bHQgPSB0aGlzLnBhcnNlU3Vic2NyaXB0cyhleHByLCBzdGFydFBvcywgc3RhcnRMb2MsIGZhbHNlLCBmb3JJbml0KTtcbiAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMgJiYgcmVzdWx0LnR5cGUgPT09IFwiTWVtYmVyRXhwcmVzc2lvblwiKSB7XG4gICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA+PSByZXN1bHQuc3RhcnQpIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduID0gLTE7IH1cbiAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQmluZCA+PSByZXN1bHQuc3RhcnQpIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQmluZCA9IC0xOyB9XG4gICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA+PSByZXN1bHQuc3RhcnQpIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID0gLTE7IH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59O1xuXG5wcCQ1LnBhcnNlU3Vic2NyaXB0cyA9IGZ1bmN0aW9uKGJhc2UsIHN0YXJ0UG9zLCBzdGFydExvYywgbm9DYWxscywgZm9ySW5pdCkge1xuICB2YXIgbWF5YmVBc3luY0Fycm93ID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDggJiYgYmFzZS50eXBlID09PSBcIklkZW50aWZpZXJcIiAmJiBiYXNlLm5hbWUgPT09IFwiYXN5bmNcIiAmJlxuICAgICAgdGhpcy5sYXN0VG9rRW5kID09PSBiYXNlLmVuZCAmJiAhdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSAmJiBiYXNlLmVuZCAtIGJhc2Uuc3RhcnQgPT09IDUgJiZcbiAgICAgIHRoaXMucG90ZW50aWFsQXJyb3dBdCA9PT0gYmFzZS5zdGFydDtcbiAgdmFyIG9wdGlvbmFsQ2hhaW5lZCA9IGZhbHNlO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLnBhcnNlU3Vic2NyaXB0KGJhc2UsIHN0YXJ0UG9zLCBzdGFydExvYywgbm9DYWxscywgbWF5YmVBc3luY0Fycm93LCBvcHRpb25hbENoYWluZWQsIGZvckluaXQpO1xuXG4gICAgaWYgKGVsZW1lbnQub3B0aW9uYWwpIHsgb3B0aW9uYWxDaGFpbmVkID0gdHJ1ZTsgfVxuICAgIGlmIChlbGVtZW50ID09PSBiYXNlIHx8IGVsZW1lbnQudHlwZSA9PT0gXCJBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvblwiKSB7XG4gICAgICBpZiAob3B0aW9uYWxDaGFpbmVkKSB7XG4gICAgICAgIHZhciBjaGFpbk5vZGUgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgICAgIGNoYWluTm9kZS5leHByZXNzaW9uID0gZWxlbWVudDtcbiAgICAgICAgZWxlbWVudCA9IHRoaXMuZmluaXNoTm9kZShjaGFpbk5vZGUsIFwiQ2hhaW5FeHByZXNzaW9uXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGVsZW1lbnRcbiAgICB9XG5cbiAgICBiYXNlID0gZWxlbWVudDtcbiAgfVxufTtcblxucHAkNS5zaG91bGRQYXJzZUFzeW5jQXJyb3cgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICF0aGlzLmNhbkluc2VydFNlbWljb2xvbigpICYmIHRoaXMuZWF0KHR5cGVzJDEuYXJyb3cpXG59O1xuXG5wcCQ1LnBhcnNlU3Vic2NyaXB0QXN5bmNBcnJvdyA9IGZ1bmN0aW9uKHN0YXJ0UG9zLCBzdGFydExvYywgZXhwckxpc3QsIGZvckluaXQpIHtcbiAgcmV0dXJuIHRoaXMucGFyc2VBcnJvd0V4cHJlc3Npb24odGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpLCBleHByTGlzdCwgdHJ1ZSwgZm9ySW5pdClcbn07XG5cbnBwJDUucGFyc2VTdWJzY3JpcHQgPSBmdW5jdGlvbihiYXNlLCBzdGFydFBvcywgc3RhcnRMb2MsIG5vQ2FsbHMsIG1heWJlQXN5bmNBcnJvdywgb3B0aW9uYWxDaGFpbmVkLCBmb3JJbml0KSB7XG4gIHZhciBvcHRpb25hbFN1cHBvcnRlZCA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMTtcbiAgdmFyIG9wdGlvbmFsID0gb3B0aW9uYWxTdXBwb3J0ZWQgJiYgdGhpcy5lYXQodHlwZXMkMS5xdWVzdGlvbkRvdCk7XG4gIGlmIChub0NhbGxzICYmIG9wdGlvbmFsKSB7IHRoaXMucmFpc2UodGhpcy5sYXN0VG9rU3RhcnQsIFwiT3B0aW9uYWwgY2hhaW5pbmcgY2Fubm90IGFwcGVhciBpbiB0aGUgY2FsbGVlIG9mIG5ldyBleHByZXNzaW9uc1wiKTsgfVxuXG4gIHZhciBjb21wdXRlZCA9IHRoaXMuZWF0KHR5cGVzJDEuYnJhY2tldEwpO1xuICBpZiAoY29tcHV0ZWQgfHwgKG9wdGlvbmFsICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5wYXJlbkwgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLmJhY2tRdW90ZSkgfHwgdGhpcy5lYXQodHlwZXMkMS5kb3QpKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgbm9kZS5vYmplY3QgPSBiYXNlO1xuICAgIGlmIChjb21wdXRlZCkge1xuICAgICAgbm9kZS5wcm9wZXJ0eSA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNrZXRSKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wcml2YXRlSWQgJiYgYmFzZS50eXBlICE9PSBcIlN1cGVyXCIpIHtcbiAgICAgIG5vZGUucHJvcGVydHkgPSB0aGlzLnBhcnNlUHJpdmF0ZUlkZW50KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUucHJvcGVydHkgPSB0aGlzLnBhcnNlSWRlbnQodGhpcy5vcHRpb25zLmFsbG93UmVzZXJ2ZWQgIT09IFwibmV2ZXJcIik7XG4gICAgfVxuICAgIG5vZGUuY29tcHV0ZWQgPSAhIWNvbXB1dGVkO1xuICAgIGlmIChvcHRpb25hbFN1cHBvcnRlZCkge1xuICAgICAgbm9kZS5vcHRpb25hbCA9IG9wdGlvbmFsO1xuICAgIH1cbiAgICBiYXNlID0gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiTWVtYmVyRXhwcmVzc2lvblwiKTtcbiAgfSBlbHNlIGlmICghbm9DYWxscyAmJiB0aGlzLmVhdCh0eXBlcyQxLnBhcmVuTCkpIHtcbiAgICB2YXIgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyA9IG5ldyBEZXN0cnVjdHVyaW5nRXJyb3JzLCBvbGRZaWVsZFBvcyA9IHRoaXMueWllbGRQb3MsIG9sZEF3YWl0UG9zID0gdGhpcy5hd2FpdFBvcywgb2xkQXdhaXRJZGVudFBvcyA9IHRoaXMuYXdhaXRJZGVudFBvcztcbiAgICB0aGlzLnlpZWxkUG9zID0gMDtcbiAgICB0aGlzLmF3YWl0UG9zID0gMDtcbiAgICB0aGlzLmF3YWl0SWRlbnRQb3MgPSAwO1xuICAgIHZhciBleHByTGlzdCA9IHRoaXMucGFyc2VFeHByTGlzdCh0eXBlcyQxLnBhcmVuUiwgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgsIGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICBpZiAobWF5YmVBc3luY0Fycm93ICYmICFvcHRpb25hbCAmJiB0aGlzLnNob3VsZFBhcnNlQXN5bmNBcnJvdygpKSB7XG4gICAgICB0aGlzLmNoZWNrUGF0dGVybkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBmYWxzZSk7XG4gICAgICB0aGlzLmNoZWNrWWllbGRBd2FpdEluRGVmYXVsdFBhcmFtcygpO1xuICAgICAgaWYgKHRoaXMuYXdhaXRJZGVudFBvcyA+IDApXG4gICAgICAgIHsgdGhpcy5yYWlzZSh0aGlzLmF3YWl0SWRlbnRQb3MsIFwiQ2Fubm90IHVzZSAnYXdhaXQnIGFzIGlkZW50aWZpZXIgaW5zaWRlIGFuIGFzeW5jIGZ1bmN0aW9uXCIpOyB9XG4gICAgICB0aGlzLnlpZWxkUG9zID0gb2xkWWllbGRQb3M7XG4gICAgICB0aGlzLmF3YWl0UG9zID0gb2xkQXdhaXRQb3M7XG4gICAgICB0aGlzLmF3YWl0SWRlbnRQb3MgPSBvbGRBd2FpdElkZW50UG9zO1xuICAgICAgcmV0dXJuIHRoaXMucGFyc2VTdWJzY3JpcHRBc3luY0Fycm93KHN0YXJ0UG9zLCBzdGFydExvYywgZXhwckxpc3QsIGZvckluaXQpXG4gICAgfVxuICAgIHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpO1xuICAgIHRoaXMueWllbGRQb3MgPSBvbGRZaWVsZFBvcyB8fCB0aGlzLnlpZWxkUG9zO1xuICAgIHRoaXMuYXdhaXRQb3MgPSBvbGRBd2FpdFBvcyB8fCB0aGlzLmF3YWl0UG9zO1xuICAgIHRoaXMuYXdhaXRJZGVudFBvcyA9IG9sZEF3YWl0SWRlbnRQb3MgfHwgdGhpcy5hd2FpdElkZW50UG9zO1xuICAgIHZhciBub2RlJDEgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgbm9kZSQxLmNhbGxlZSA9IGJhc2U7XG4gICAgbm9kZSQxLmFyZ3VtZW50cyA9IGV4cHJMaXN0O1xuICAgIGlmIChvcHRpb25hbFN1cHBvcnRlZCkge1xuICAgICAgbm9kZSQxLm9wdGlvbmFsID0gb3B0aW9uYWw7XG4gICAgfVxuICAgIGJhc2UgPSB0aGlzLmZpbmlzaE5vZGUobm9kZSQxLCBcIkNhbGxFeHByZXNzaW9uXCIpO1xuICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5iYWNrUXVvdGUpIHtcbiAgICBpZiAob3B0aW9uYWwgfHwgb3B0aW9uYWxDaGFpbmVkKSB7XG4gICAgICB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiT3B0aW9uYWwgY2hhaW5pbmcgY2Fubm90IGFwcGVhciBpbiB0aGUgdGFnIG9mIHRhZ2dlZCB0ZW1wbGF0ZSBleHByZXNzaW9uc1wiKTtcbiAgICB9XG4gICAgdmFyIG5vZGUkMiA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICBub2RlJDIudGFnID0gYmFzZTtcbiAgICBub2RlJDIucXVhc2kgPSB0aGlzLnBhcnNlVGVtcGxhdGUoe2lzVGFnZ2VkOiB0cnVlfSk7XG4gICAgYmFzZSA9IHRoaXMuZmluaXNoTm9kZShub2RlJDIsIFwiVGFnZ2VkVGVtcGxhdGVFeHByZXNzaW9uXCIpO1xuICB9XG4gIHJldHVybiBiYXNlXG59O1xuXG4vLyBQYXJzZSBhbiBhdG9taWMgZXhwcmVzc2lvbiBcdTIwMTQgZWl0aGVyIGEgc2luZ2xlIHRva2VuIHRoYXQgaXMgYW5cbi8vIGV4cHJlc3Npb24sIGFuIGV4cHJlc3Npb24gc3RhcnRlZCBieSBhIGtleXdvcmQgbGlrZSBgZnVuY3Rpb25gIG9yXG4vLyBgbmV3YCwgb3IgYW4gZXhwcmVzc2lvbiB3cmFwcGVkIGluIHB1bmN0dWF0aW9uIGxpa2UgYCgpYCwgYFtdYCxcbi8vIG9yIGB7fWAuXG5cbnBwJDUucGFyc2VFeHByQXRvbSA9IGZ1bmN0aW9uKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGZvckluaXQsIGZvck5ldykge1xuICAvLyBJZiBhIGRpdmlzaW9uIG9wZXJhdG9yIGFwcGVhcnMgaW4gYW4gZXhwcmVzc2lvbiBwb3NpdGlvbiwgdGhlXG4gIC8vIHRva2VuaXplciBnb3QgY29uZnVzZWQsIGFuZCB3ZSBmb3JjZSBpdCB0byByZWFkIGEgcmVnZXhwIGluc3RlYWQuXG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuc2xhc2gpIHsgdGhpcy5yZWFkUmVnZXhwKCk7IH1cblxuICB2YXIgbm9kZSwgY2FuQmVBcnJvdyA9IHRoaXMucG90ZW50aWFsQXJyb3dBdCA9PT0gdGhpcy5zdGFydDtcbiAgc3dpdGNoICh0aGlzLnR5cGUpIHtcbiAgY2FzZSB0eXBlcyQxLl9zdXBlcjpcbiAgICBpZiAoIXRoaXMuYWxsb3dTdXBlcilcbiAgICAgIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIidzdXBlcicga2V5d29yZCBvdXRzaWRlIGEgbWV0aG9kXCIpOyB9XG4gICAgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wYXJlbkwgJiYgIXRoaXMuYWxsb3dEaXJlY3RTdXBlcilcbiAgICAgIHsgdGhpcy5yYWlzZShub2RlLnN0YXJ0LCBcInN1cGVyKCkgY2FsbCBvdXRzaWRlIGNvbnN0cnVjdG9yIG9mIGEgc3ViY2xhc3NcIik7IH1cbiAgICAvLyBUaGUgYHN1cGVyYCBrZXl3b3JkIGNhbiBhcHBlYXIgYXQgYmVsb3c6XG4gICAgLy8gU3VwZXJQcm9wZXJ0eTpcbiAgICAvLyAgICAgc3VwZXIgWyBFeHByZXNzaW9uIF1cbiAgICAvLyAgICAgc3VwZXIgLiBJZGVudGlmaWVyTmFtZVxuICAgIC8vIFN1cGVyQ2FsbDpcbiAgICAvLyAgICAgc3VwZXIgKCBBcmd1bWVudHMgKVxuICAgIGlmICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuZG90ICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5icmFja2V0TCAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEucGFyZW5MKVxuICAgICAgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJTdXBlclwiKVxuXG4gIGNhc2UgdHlwZXMkMS5fdGhpczpcbiAgICBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiVGhpc0V4cHJlc3Npb25cIilcblxuICBjYXNlIHR5cGVzJDEubmFtZTpcbiAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2MsIGNvbnRhaW5zRXNjID0gdGhpcy5jb250YWluc0VzYztcbiAgICB2YXIgaWQgPSB0aGlzLnBhcnNlSWRlbnQoZmFsc2UpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCAmJiAhY29udGFpbnNFc2MgJiYgaWQubmFtZSA9PT0gXCJhc3luY1wiICYmICF0aGlzLmNhbkluc2VydFNlbWljb2xvbigpICYmIHRoaXMuZWF0KHR5cGVzJDEuX2Z1bmN0aW9uKSkge1xuICAgICAgdGhpcy5vdmVycmlkZUNvbnRleHQodHlwZXMuZl9leHByKTtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlRnVuY3Rpb24odGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpLCAwLCBmYWxzZSwgdHJ1ZSwgZm9ySW5pdClcbiAgICB9XG4gICAgaWYgKGNhbkJlQXJyb3cgJiYgIXRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkpIHtcbiAgICAgIGlmICh0aGlzLmVhdCh0eXBlcyQxLmFycm93KSlcbiAgICAgICAgeyByZXR1cm4gdGhpcy5wYXJzZUFycm93RXhwcmVzc2lvbih0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyksIFtpZF0sIGZhbHNlLCBmb3JJbml0KSB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDggJiYgaWQubmFtZSA9PT0gXCJhc3luY1wiICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lICYmICFjb250YWluc0VzYyAmJlxuICAgICAgICAgICghdGhpcy5wb3RlbnRpYWxBcnJvd0luRm9yQXdhaXQgfHwgdGhpcy52YWx1ZSAhPT0gXCJvZlwiIHx8IHRoaXMuY29udGFpbnNFc2MpKSB7XG4gICAgICAgIGlkID0gdGhpcy5wYXJzZUlkZW50KGZhbHNlKTtcbiAgICAgICAgaWYgKHRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkgfHwgIXRoaXMuZWF0KHR5cGVzJDEuYXJyb3cpKVxuICAgICAgICAgIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VBcnJvd0V4cHJlc3Npb24odGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpLCBbaWRdLCB0cnVlLCBmb3JJbml0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaWRcblxuICBjYXNlIHR5cGVzJDEucmVnZXhwOlxuICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWU7XG4gICAgbm9kZSA9IHRoaXMucGFyc2VMaXRlcmFsKHZhbHVlLnZhbHVlKTtcbiAgICBub2RlLnJlZ2V4ID0ge3BhdHRlcm46IHZhbHVlLnBhdHRlcm4sIGZsYWdzOiB2YWx1ZS5mbGFnc307XG4gICAgcmV0dXJuIG5vZGVcblxuICBjYXNlIHR5cGVzJDEubnVtOiBjYXNlIHR5cGVzJDEuc3RyaW5nOlxuICAgIHJldHVybiB0aGlzLnBhcnNlTGl0ZXJhbCh0aGlzLnZhbHVlKVxuXG4gIGNhc2UgdHlwZXMkMS5fbnVsbDogY2FzZSB0eXBlcyQxLl90cnVlOiBjYXNlIHR5cGVzJDEuX2ZhbHNlOlxuICAgIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIG5vZGUudmFsdWUgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuX251bGwgPyBudWxsIDogdGhpcy50eXBlID09PSB0eXBlcyQxLl90cnVlO1xuICAgIG5vZGUucmF3ID0gdGhpcy50eXBlLmtleXdvcmQ7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkxpdGVyYWxcIilcblxuICBjYXNlIHR5cGVzJDEucGFyZW5MOlxuICAgIHZhciBzdGFydCA9IHRoaXMuc3RhcnQsIGV4cHIgPSB0aGlzLnBhcnNlUGFyZW5BbmREaXN0aW5ndWlzaEV4cHJlc3Npb24oY2FuQmVBcnJvdywgZm9ySW5pdCk7XG4gICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPCAwICYmICF0aGlzLmlzU2ltcGxlQXNzaWduVGFyZ2V0KGV4cHIpKVxuICAgICAgICB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA9IHN0YXJ0OyB9XG4gICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQmluZCA8IDApXG4gICAgICAgIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQmluZCA9IHN0YXJ0OyB9XG4gICAgfVxuICAgIHJldHVybiBleHByXG5cbiAgY2FzZSB0eXBlcyQxLmJyYWNrZXRMOlxuICAgIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIG5vZGUuZWxlbWVudHMgPSB0aGlzLnBhcnNlRXhwckxpc3QodHlwZXMkMS5icmFja2V0UiwgdHJ1ZSwgdHJ1ZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkFycmF5RXhwcmVzc2lvblwiKVxuXG4gIGNhc2UgdHlwZXMkMS5icmFjZUw6XG4gICAgdGhpcy5vdmVycmlkZUNvbnRleHQodHlwZXMuYl9leHByKTtcbiAgICByZXR1cm4gdGhpcy5wYXJzZU9iaihmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycylcblxuICBjYXNlIHR5cGVzJDEuX2Z1bmN0aW9uOlxuICAgIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIHJldHVybiB0aGlzLnBhcnNlRnVuY3Rpb24obm9kZSwgMClcblxuICBjYXNlIHR5cGVzJDEuX2NsYXNzOlxuICAgIHJldHVybiB0aGlzLnBhcnNlQ2xhc3ModGhpcy5zdGFydE5vZGUoKSwgZmFsc2UpXG5cbiAgY2FzZSB0eXBlcyQxLl9uZXc6XG4gICAgcmV0dXJuIHRoaXMucGFyc2VOZXcoKVxuXG4gIGNhc2UgdHlwZXMkMS5iYWNrUXVvdGU6XG4gICAgcmV0dXJuIHRoaXMucGFyc2VUZW1wbGF0ZSgpXG5cbiAgY2FzZSB0eXBlcyQxLl9pbXBvcnQ6XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMSkge1xuICAgICAgcmV0dXJuIHRoaXMucGFyc2VFeHBySW1wb3J0KGZvck5ldylcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudW5leHBlY3RlZCgpXG4gICAgfVxuXG4gIGRlZmF1bHQ6XG4gICAgcmV0dXJuIHRoaXMucGFyc2VFeHByQXRvbURlZmF1bHQoKVxuICB9XG59O1xuXG5wcCQ1LnBhcnNlRXhwckF0b21EZWZhdWx0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMudW5leHBlY3RlZCgpO1xufTtcblxucHAkNS5wYXJzZUV4cHJJbXBvcnQgPSBmdW5jdGlvbihmb3JOZXcpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuXG4gIC8vIENvbnN1bWUgYGltcG9ydGAgYXMgYW4gaWRlbnRpZmllciBmb3IgYGltcG9ydC5tZXRhYC5cbiAgLy8gQmVjYXVzZSBgdGhpcy5wYXJzZUlkZW50KHRydWUpYCBkb2Vzbid0IGNoZWNrIGVzY2FwZSBzZXF1ZW5jZXMsIGl0IG5lZWRzIHRoZSBjaGVjayBvZiBgdGhpcy5jb250YWluc0VzY2AuXG4gIGlmICh0aGlzLmNvbnRhaW5zRXNjKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCBcIkVzY2FwZSBzZXF1ZW5jZSBpbiBrZXl3b3JkIGltcG9ydFwiKTsgfVxuICB0aGlzLm5leHQoKTtcblxuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnBhcmVuTCAmJiAhZm9yTmV3KSB7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VEeW5hbWljSW1wb3J0KG5vZGUpXG4gIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmRvdCkge1xuICAgIHZhciBtZXRhID0gdGhpcy5zdGFydE5vZGVBdChub2RlLnN0YXJ0LCBub2RlLmxvYyAmJiBub2RlLmxvYy5zdGFydCk7XG4gICAgbWV0YS5uYW1lID0gXCJpbXBvcnRcIjtcbiAgICBub2RlLm1ldGEgPSB0aGlzLmZpbmlzaE5vZGUobWV0YSwgXCJJZGVudGlmaWVyXCIpO1xuICAgIHJldHVybiB0aGlzLnBhcnNlSW1wb3J0TWV0YShub2RlKVxuICB9IGVsc2Uge1xuICAgIHRoaXMudW5leHBlY3RlZCgpO1xuICB9XG59O1xuXG5wcCQ1LnBhcnNlRHluYW1pY0ltcG9ydCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7IC8vIHNraXAgYChgXG5cbiAgLy8gUGFyc2Ugbm9kZS5zb3VyY2UuXG4gIG5vZGUuc291cmNlID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNikge1xuICAgIGlmICghdGhpcy5lYXQodHlwZXMkMS5wYXJlblIpKSB7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgIGlmICghdGhpcy5hZnRlclRyYWlsaW5nQ29tbWEodHlwZXMkMS5wYXJlblIpKSB7XG4gICAgICAgIG5vZGUub3B0aW9ucyA9IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuICAgICAgICBpZiAoIXRoaXMuZWF0KHR5cGVzJDEucGFyZW5SKSkge1xuICAgICAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgICAgIGlmICghdGhpcy5hZnRlclRyYWlsaW5nQ29tbWEodHlwZXMkMS5wYXJlblIpKSB7XG4gICAgICAgICAgICB0aGlzLnVuZXhwZWN0ZWQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUub3B0aW9ucyA9IG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUub3B0aW9ucyA9IG51bGw7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIFZlcmlmeSBlbmRpbmcuXG4gICAgaWYgKCF0aGlzLmVhdCh0eXBlcyQxLnBhcmVuUikpIHtcbiAgICAgIHZhciBlcnJvclBvcyA9IHRoaXMuc3RhcnQ7XG4gICAgICBpZiAodGhpcy5lYXQodHlwZXMkMS5jb21tYSkgJiYgdGhpcy5lYXQodHlwZXMkMS5wYXJlblIpKSB7XG4gICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShlcnJvclBvcywgXCJUcmFpbGluZyBjb21tYSBpcyBub3QgYWxsb3dlZCBpbiBpbXBvcnQoKVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudW5leHBlY3RlZChlcnJvclBvcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkltcG9ydEV4cHJlc3Npb25cIilcbn07XG5cbnBwJDUucGFyc2VJbXBvcnRNZXRhID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTsgLy8gc2tpcCBgLmBcblxuICB2YXIgY29udGFpbnNFc2MgPSB0aGlzLmNvbnRhaW5zRXNjO1xuICBub2RlLnByb3BlcnR5ID0gdGhpcy5wYXJzZUlkZW50KHRydWUpO1xuXG4gIGlmIChub2RlLnByb3BlcnR5Lm5hbWUgIT09IFwibWV0YVwiKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUucHJvcGVydHkuc3RhcnQsIFwiVGhlIG9ubHkgdmFsaWQgbWV0YSBwcm9wZXJ0eSBmb3IgaW1wb3J0IGlzICdpbXBvcnQubWV0YSdcIik7IH1cbiAgaWYgKGNvbnRhaW5zRXNjKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiJ2ltcG9ydC5tZXRhJyBtdXN0IG5vdCBjb250YWluIGVzY2FwZWQgY2hhcmFjdGVyc1wiKTsgfVxuICBpZiAodGhpcy5vcHRpb25zLnNvdXJjZVR5cGUgIT09IFwibW9kdWxlXCIgJiYgIXRoaXMub3B0aW9ucy5hbGxvd0ltcG9ydEV4cG9ydEV2ZXJ5d2hlcmUpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCJDYW5ub3QgdXNlICdpbXBvcnQubWV0YScgb3V0c2lkZSBhIG1vZHVsZVwiKTsgfVxuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJNZXRhUHJvcGVydHlcIilcbn07XG5cbnBwJDUucGFyc2VMaXRlcmFsID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBub2RlLnZhbHVlID0gdmFsdWU7XG4gIG5vZGUucmF3ID0gdGhpcy5pbnB1dC5zbGljZSh0aGlzLnN0YXJ0LCB0aGlzLmVuZCk7XG4gIGlmIChub2RlLnJhdy5jaGFyQ29kZUF0KG5vZGUucmF3Lmxlbmd0aCAtIDEpID09PSAxMTApXG4gICAgeyBub2RlLmJpZ2ludCA9IG5vZGUudmFsdWUgIT0gbnVsbCA/IG5vZGUudmFsdWUudG9TdHJpbmcoKSA6IG5vZGUucmF3LnNsaWNlKDAsIC0xKS5yZXBsYWNlKC9fL2csIFwiXCIpOyB9XG4gIHRoaXMubmV4dCgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiTGl0ZXJhbFwiKVxufTtcblxucHAkNS5wYXJzZVBhcmVuRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuTCk7XG4gIHZhciB2YWwgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuUik7XG4gIHJldHVybiB2YWxcbn07XG5cbnBwJDUuc2hvdWxkUGFyc2VBcnJvdyA9IGZ1bmN0aW9uKGV4cHJMaXN0KSB7XG4gIHJldHVybiAhdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKVxufTtcblxucHAkNS5wYXJzZVBhcmVuQW5kRGlzdGluZ3Vpc2hFeHByZXNzaW9uID0gZnVuY3Rpb24oY2FuQmVBcnJvdywgZm9ySW5pdCkge1xuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2MsIHZhbCwgYWxsb3dUcmFpbGluZ0NvbW1hID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDg7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikge1xuICAgIHRoaXMubmV4dCgpO1xuXG4gICAgdmFyIGlubmVyU3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBpbm5lclN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgICB2YXIgZXhwckxpc3QgPSBbXSwgZmlyc3QgPSB0cnVlLCBsYXN0SXNDb21tYSA9IGZhbHNlO1xuICAgIHZhciByZWZEZXN0cnVjdHVyaW5nRXJyb3JzID0gbmV3IERlc3RydWN0dXJpbmdFcnJvcnMsIG9sZFlpZWxkUG9zID0gdGhpcy55aWVsZFBvcywgb2xkQXdhaXRQb3MgPSB0aGlzLmF3YWl0UG9zLCBzcHJlYWRTdGFydDtcbiAgICB0aGlzLnlpZWxkUG9zID0gMDtcbiAgICB0aGlzLmF3YWl0UG9zID0gMDtcbiAgICAvLyBEbyBub3Qgc2F2ZSBhd2FpdElkZW50UG9zIHRvIGFsbG93IGNoZWNraW5nIGF3YWl0cyBuZXN0ZWQgaW4gcGFyYW1ldGVyc1xuICAgIHdoaWxlICh0aGlzLnR5cGUgIT09IHR5cGVzJDEucGFyZW5SKSB7XG4gICAgICBmaXJzdCA/IGZpcnN0ID0gZmFsc2UgOiB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgIGlmIChhbGxvd1RyYWlsaW5nQ29tbWEgJiYgdGhpcy5hZnRlclRyYWlsaW5nQ29tbWEodHlwZXMkMS5wYXJlblIsIHRydWUpKSB7XG4gICAgICAgIGxhc3RJc0NvbW1hID0gdHJ1ZTtcbiAgICAgICAgYnJlYWtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmVsbGlwc2lzKSB7XG4gICAgICAgIHNwcmVhZFN0YXJ0ID0gdGhpcy5zdGFydDtcbiAgICAgICAgZXhwckxpc3QucHVzaCh0aGlzLnBhcnNlUGFyZW5JdGVtKHRoaXMucGFyc2VSZXN0QmluZGluZygpKSk7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEpIHtcbiAgICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoXG4gICAgICAgICAgICB0aGlzLnN0YXJ0LFxuICAgICAgICAgICAgXCJDb21tYSBpcyBub3QgcGVybWl0dGVkIGFmdGVyIHRoZSByZXN0IGVsZW1lbnRcIlxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4cHJMaXN0LnB1c2godGhpcy5wYXJzZU1heWJlQXNzaWduKGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0aGlzLnBhcnNlUGFyZW5JdGVtKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBpbm5lckVuZFBvcyA9IHRoaXMubGFzdFRva0VuZCwgaW5uZXJFbmRMb2MgPSB0aGlzLmxhc3RUb2tFbmRMb2M7XG4gICAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlblIpO1xuXG4gICAgaWYgKGNhbkJlQXJyb3cgJiYgdGhpcy5zaG91bGRQYXJzZUFycm93KGV4cHJMaXN0KSAmJiB0aGlzLmVhdCh0eXBlcyQxLmFycm93KSkge1xuICAgICAgdGhpcy5jaGVja1BhdHRlcm5FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgZmFsc2UpO1xuICAgICAgdGhpcy5jaGVja1lpZWxkQXdhaXRJbkRlZmF1bHRQYXJhbXMoKTtcbiAgICAgIHRoaXMueWllbGRQb3MgPSBvbGRZaWVsZFBvcztcbiAgICAgIHRoaXMuYXdhaXRQb3MgPSBvbGRBd2FpdFBvcztcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlUGFyZW5BcnJvd0xpc3Qoc3RhcnRQb3MsIHN0YXJ0TG9jLCBleHByTGlzdCwgZm9ySW5pdClcbiAgICB9XG5cbiAgICBpZiAoIWV4cHJMaXN0Lmxlbmd0aCB8fCBsYXN0SXNDb21tYSkgeyB0aGlzLnVuZXhwZWN0ZWQodGhpcy5sYXN0VG9rU3RhcnQpOyB9XG4gICAgaWYgKHNwcmVhZFN0YXJ0KSB7IHRoaXMudW5leHBlY3RlZChzcHJlYWRTdGFydCk7IH1cbiAgICB0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTtcbiAgICB0aGlzLnlpZWxkUG9zID0gb2xkWWllbGRQb3MgfHwgdGhpcy55aWVsZFBvcztcbiAgICB0aGlzLmF3YWl0UG9zID0gb2xkQXdhaXRQb3MgfHwgdGhpcy5hd2FpdFBvcztcblxuICAgIGlmIChleHByTGlzdC5sZW5ndGggPiAxKSB7XG4gICAgICB2YWwgPSB0aGlzLnN0YXJ0Tm9kZUF0KGlubmVyU3RhcnRQb3MsIGlubmVyU3RhcnRMb2MpO1xuICAgICAgdmFsLmV4cHJlc3Npb25zID0gZXhwckxpc3Q7XG4gICAgICB0aGlzLmZpbmlzaE5vZGVBdCh2YWwsIFwiU2VxdWVuY2VFeHByZXNzaW9uXCIsIGlubmVyRW5kUG9zLCBpbm5lckVuZExvYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbCA9IGV4cHJMaXN0WzBdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWwgPSB0aGlzLnBhcnNlUGFyZW5FeHByZXNzaW9uKCk7XG4gIH1cblxuICBpZiAodGhpcy5vcHRpb25zLnByZXNlcnZlUGFyZW5zKSB7XG4gICAgdmFyIHBhciA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICBwYXIuZXhwcmVzc2lvbiA9IHZhbDtcbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKHBhciwgXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB2YWxcbiAgfVxufTtcblxucHAkNS5wYXJzZVBhcmVuSXRlbSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgcmV0dXJuIGl0ZW1cbn07XG5cbnBwJDUucGFyc2VQYXJlbkFycm93TGlzdCA9IGZ1bmN0aW9uKHN0YXJ0UG9zLCBzdGFydExvYywgZXhwckxpc3QsIGZvckluaXQpIHtcbiAgcmV0dXJuIHRoaXMucGFyc2VBcnJvd0V4cHJlc3Npb24odGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpLCBleHByTGlzdCwgZmFsc2UsIGZvckluaXQpXG59O1xuXG4vLyBOZXcncyBwcmVjZWRlbmNlIGlzIHNsaWdodGx5IHRyaWNreS4gSXQgbXVzdCBhbGxvdyBpdHMgYXJndW1lbnQgdG9cbi8vIGJlIGEgYFtdYCBvciBkb3Qgc3Vic2NyaXB0IGV4cHJlc3Npb24sIGJ1dCBub3QgYSBjYWxsIFx1MjAxNCBhdCBsZWFzdCxcbi8vIG5vdCB3aXRob3V0IHdyYXBwaW5nIGl0IGluIHBhcmVudGhlc2VzLiBUaHVzLCBpdCB1c2VzIHRoZSBub0NhbGxzXG4vLyBhcmd1bWVudCB0byBwYXJzZVN1YnNjcmlwdHMgdG8gcHJldmVudCBpdCBmcm9tIGNvbnN1bWluZyB0aGVcbi8vIGFyZ3VtZW50IGxpc3QuXG5cbnZhciBlbXB0eSA9IFtdO1xuXG5wcCQ1LnBhcnNlTmV3ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNvbnRhaW5zRXNjKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCBcIkVzY2FwZSBzZXF1ZW5jZSBpbiBrZXl3b3JkIG5ld1wiKTsgfVxuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dCgpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLmRvdCkge1xuICAgIHZhciBtZXRhID0gdGhpcy5zdGFydE5vZGVBdChub2RlLnN0YXJ0LCBub2RlLmxvYyAmJiBub2RlLmxvYy5zdGFydCk7XG4gICAgbWV0YS5uYW1lID0gXCJuZXdcIjtcbiAgICBub2RlLm1ldGEgPSB0aGlzLmZpbmlzaE5vZGUobWV0YSwgXCJJZGVudGlmaWVyXCIpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIHZhciBjb250YWluc0VzYyA9IHRoaXMuY29udGFpbnNFc2M7XG4gICAgbm9kZS5wcm9wZXJ0eSA9IHRoaXMucGFyc2VJZGVudCh0cnVlKTtcbiAgICBpZiAobm9kZS5wcm9wZXJ0eS5uYW1lICE9PSBcInRhcmdldFwiKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5wcm9wZXJ0eS5zdGFydCwgXCJUaGUgb25seSB2YWxpZCBtZXRhIHByb3BlcnR5IGZvciBuZXcgaXMgJ25ldy50YXJnZXQnXCIpOyB9XG4gICAgaWYgKGNvbnRhaW5zRXNjKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCInbmV3LnRhcmdldCcgbXVzdCBub3QgY29udGFpbiBlc2NhcGVkIGNoYXJhY3RlcnNcIik7IH1cbiAgICBpZiAoIXRoaXMuYWxsb3dOZXdEb3RUYXJnZXQpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIiduZXcudGFyZ2V0JyBjYW4gb25seSBiZSB1c2VkIGluIGZ1bmN0aW9ucyBhbmQgY2xhc3Mgc3RhdGljIGJsb2NrXCIpOyB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIk1ldGFQcm9wZXJ0eVwiKVxuICB9XG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgbm9kZS5jYWxsZWUgPSB0aGlzLnBhcnNlU3Vic2NyaXB0cyh0aGlzLnBhcnNlRXhwckF0b20obnVsbCwgZmFsc2UsIHRydWUpLCBzdGFydFBvcywgc3RhcnRMb2MsIHRydWUsIGZhbHNlKTtcbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEucGFyZW5MKSkgeyBub2RlLmFyZ3VtZW50cyA9IHRoaXMucGFyc2VFeHByTGlzdCh0eXBlcyQxLnBhcmVuUiwgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgsIGZhbHNlKTsgfVxuICBlbHNlIHsgbm9kZS5hcmd1bWVudHMgPSBlbXB0eTsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiTmV3RXhwcmVzc2lvblwiKVxufTtcblxuLy8gUGFyc2UgdGVtcGxhdGUgZXhwcmVzc2lvbi5cblxucHAkNS5wYXJzZVRlbXBsYXRlRWxlbWVudCA9IGZ1bmN0aW9uKHJlZikge1xuICB2YXIgaXNUYWdnZWQgPSByZWYuaXNUYWdnZWQ7XG5cbiAgdmFyIGVsZW0gPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmludmFsaWRUZW1wbGF0ZSkge1xuICAgIGlmICghaXNUYWdnZWQpIHtcbiAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCBcIkJhZCBlc2NhcGUgc2VxdWVuY2UgaW4gdW50YWdnZWQgdGVtcGxhdGUgbGl0ZXJhbFwiKTtcbiAgICB9XG4gICAgZWxlbS52YWx1ZSA9IHtcbiAgICAgIHJhdzogdGhpcy52YWx1ZS5yZXBsYWNlKC9cXHJcXG4/L2csIFwiXFxuXCIpLFxuICAgICAgY29va2VkOiBudWxsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBlbGVtLnZhbHVlID0ge1xuICAgICAgcmF3OiB0aGlzLmlucHV0LnNsaWNlKHRoaXMuc3RhcnQsIHRoaXMuZW5kKS5yZXBsYWNlKC9cXHJcXG4/L2csIFwiXFxuXCIpLFxuICAgICAgY29va2VkOiB0aGlzLnZhbHVlXG4gICAgfTtcbiAgfVxuICB0aGlzLm5leHQoKTtcbiAgZWxlbS50YWlsID0gdGhpcy50eXBlID09PSB0eXBlcyQxLmJhY2tRdW90ZTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShlbGVtLCBcIlRlbXBsYXRlRWxlbWVudFwiKVxufTtcblxucHAkNS5wYXJzZVRlbXBsYXRlID0gZnVuY3Rpb24ocmVmKSB7XG4gIGlmICggcmVmID09PSB2b2lkIDAgKSByZWYgPSB7fTtcbiAgdmFyIGlzVGFnZ2VkID0gcmVmLmlzVGFnZ2VkOyBpZiAoIGlzVGFnZ2VkID09PSB2b2lkIDAgKSBpc1RhZ2dlZCA9IGZhbHNlO1xuXG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUuZXhwcmVzc2lvbnMgPSBbXTtcbiAgdmFyIGN1ckVsdCA9IHRoaXMucGFyc2VUZW1wbGF0ZUVsZW1lbnQoe2lzVGFnZ2VkOiBpc1RhZ2dlZH0pO1xuICBub2RlLnF1YXNpcyA9IFtjdXJFbHRdO1xuICB3aGlsZSAoIWN1ckVsdC50YWlsKSB7XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lb2YpIHsgdGhpcy5yYWlzZSh0aGlzLnBvcywgXCJVbnRlcm1pbmF0ZWQgdGVtcGxhdGUgbGl0ZXJhbFwiKTsgfVxuICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuZG9sbGFyQnJhY2VMKTtcbiAgICBub2RlLmV4cHJlc3Npb25zLnB1c2godGhpcy5wYXJzZUV4cHJlc3Npb24oKSk7XG4gICAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFjZVIpO1xuICAgIG5vZGUucXVhc2lzLnB1c2goY3VyRWx0ID0gdGhpcy5wYXJzZVRlbXBsYXRlRWxlbWVudCh7aXNUYWdnZWQ6IGlzVGFnZ2VkfSkpO1xuICB9XG4gIHRoaXMubmV4dCgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiVGVtcGxhdGVMaXRlcmFsXCIpXG59O1xuXG5wcCQ1LmlzQXN5bmNQcm9wID0gZnVuY3Rpb24ocHJvcCkge1xuICByZXR1cm4gIXByb3AuY29tcHV0ZWQgJiYgcHJvcC5rZXkudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgJiYgcHJvcC5rZXkubmFtZSA9PT0gXCJhc3luY1wiICYmXG4gICAgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5udW0gfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLnN0cmluZyB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuYnJhY2tldEwgfHwgdGhpcy50eXBlLmtleXdvcmQgfHwgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdGFyKSkgJiZcbiAgICAhbGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLmxhc3RUb2tFbmQsIHRoaXMuc3RhcnQpKVxufTtcblxuLy8gUGFyc2UgYW4gb2JqZWN0IGxpdGVyYWwgb3IgYmluZGluZyBwYXR0ZXJuLlxuXG5wcCQ1LnBhcnNlT2JqID0gZnVuY3Rpb24oaXNQYXR0ZXJuLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKSwgZmlyc3QgPSB0cnVlLCBwcm9wSGFzaCA9IHt9O1xuICBub2RlLnByb3BlcnRpZXMgPSBbXTtcbiAgdGhpcy5uZXh0KCk7XG4gIHdoaWxlICghdGhpcy5lYXQodHlwZXMkMS5icmFjZVIpKSB7XG4gICAgaWYgKCFmaXJzdCkge1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDUgJiYgdGhpcy5hZnRlclRyYWlsaW5nQ29tbWEodHlwZXMkMS5icmFjZVIpKSB7IGJyZWFrIH1cbiAgICB9IGVsc2UgeyBmaXJzdCA9IGZhbHNlOyB9XG5cbiAgICB2YXIgcHJvcCA9IHRoaXMucGFyc2VQcm9wZXJ0eShpc1BhdHRlcm4sIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgIGlmICghaXNQYXR0ZXJuKSB7IHRoaXMuY2hlY2tQcm9wQ2xhc2gocHJvcCwgcHJvcEhhc2gsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpOyB9XG4gICAgbm9kZS5wcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBpc1BhdHRlcm4gPyBcIk9iamVjdFBhdHRlcm5cIiA6IFwiT2JqZWN0RXhwcmVzc2lvblwiKVxufTtcblxucHAkNS5wYXJzZVByb3BlcnR5ID0gZnVuY3Rpb24oaXNQYXR0ZXJuLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIHZhciBwcm9wID0gdGhpcy5zdGFydE5vZGUoKSwgaXNHZW5lcmF0b3IsIGlzQXN5bmMsIHN0YXJ0UG9zLCBzdGFydExvYztcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ICYmIHRoaXMuZWF0KHR5cGVzJDEuZWxsaXBzaXMpKSB7XG4gICAgaWYgKGlzUGF0dGVybikge1xuICAgICAgcHJvcC5hcmd1bWVudCA9IHRoaXMucGFyc2VJZGVudChmYWxzZSk7XG4gICAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hKSB7XG4gICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCBcIkNvbW1hIGlzIG5vdCBwZXJtaXR0ZWQgYWZ0ZXIgdGhlIHJlc3QgZWxlbWVudFwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUocHJvcCwgXCJSZXN0RWxlbWVudFwiKVxuICAgIH1cbiAgICAvLyBQYXJzZSBhcmd1bWVudC5cbiAgICBwcm9wLmFyZ3VtZW50ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICAvLyBUbyBkaXNhbGxvdyB0cmFpbGluZyBjb21tYSB2aWEgYHRoaXMudG9Bc3NpZ25hYmxlKClgLlxuICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEgJiYgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyAmJiByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPCAwKSB7XG4gICAgICByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPSB0aGlzLnN0YXJ0O1xuICAgIH1cbiAgICAvLyBGaW5pc2hcbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKHByb3AsIFwiU3ByZWFkRWxlbWVudFwiKVxuICB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikge1xuICAgIHByb3AubWV0aG9kID0gZmFsc2U7XG4gICAgcHJvcC5zaG9ydGhhbmQgPSBmYWxzZTtcbiAgICBpZiAoaXNQYXR0ZXJuIHx8IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgICAgIHN0YXJ0UG9zID0gdGhpcy5zdGFydDtcbiAgICAgIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgICB9XG4gICAgaWYgKCFpc1BhdHRlcm4pXG4gICAgICB7IGlzR2VuZXJhdG9yID0gdGhpcy5lYXQodHlwZXMkMS5zdGFyKTsgfVxuICB9XG4gIHZhciBjb250YWluc0VzYyA9IHRoaXMuY29udGFpbnNFc2M7XG4gIHRoaXMucGFyc2VQcm9wZXJ0eU5hbWUocHJvcCk7XG4gIGlmICghaXNQYXR0ZXJuICYmICFjb250YWluc0VzYyAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCAmJiAhaXNHZW5lcmF0b3IgJiYgdGhpcy5pc0FzeW5jUHJvcChwcm9wKSkge1xuICAgIGlzQXN5bmMgPSB0cnVlO1xuICAgIGlzR2VuZXJhdG9yID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgJiYgdGhpcy5lYXQodHlwZXMkMS5zdGFyKTtcbiAgICB0aGlzLnBhcnNlUHJvcGVydHlOYW1lKHByb3ApO1xuICB9IGVsc2Uge1xuICAgIGlzQXN5bmMgPSBmYWxzZTtcbiAgfVxuICB0aGlzLnBhcnNlUHJvcGVydHlWYWx1ZShwcm9wLCBpc1BhdHRlcm4sIGlzR2VuZXJhdG9yLCBpc0FzeW5jLCBzdGFydFBvcywgc3RhcnRMb2MsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGNvbnRhaW5zRXNjKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShwcm9wLCBcIlByb3BlcnR5XCIpXG59O1xuXG5wcCQ1LnBhcnNlR2V0dGVyU2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuICB2YXIga2luZCA9IHByb3Aua2V5Lm5hbWU7XG4gIHRoaXMucGFyc2VQcm9wZXJ0eU5hbWUocHJvcCk7XG4gIHByb3AudmFsdWUgPSB0aGlzLnBhcnNlTWV0aG9kKGZhbHNlKTtcbiAgcHJvcC5raW5kID0ga2luZDtcbiAgdmFyIHBhcmFtQ291bnQgPSBwcm9wLmtpbmQgPT09IFwiZ2V0XCIgPyAwIDogMTtcbiAgaWYgKHByb3AudmFsdWUucGFyYW1zLmxlbmd0aCAhPT0gcGFyYW1Db3VudCkge1xuICAgIHZhciBzdGFydCA9IHByb3AudmFsdWUuc3RhcnQ7XG4gICAgaWYgKHByb3Aua2luZCA9PT0gXCJnZXRcIilcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHN0YXJ0LCBcImdldHRlciBzaG91bGQgaGF2ZSBubyBwYXJhbXNcIik7IH1cbiAgICBlbHNlXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShzdGFydCwgXCJzZXR0ZXIgc2hvdWxkIGhhdmUgZXhhY3RseSBvbmUgcGFyYW1cIik7IH1cbiAgfSBlbHNlIHtcbiAgICBpZiAocHJvcC5raW5kID09PSBcInNldFwiICYmIHByb3AudmFsdWUucGFyYW1zWzBdLnR5cGUgPT09IFwiUmVzdEVsZW1lbnRcIilcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHByb3AudmFsdWUucGFyYW1zWzBdLnN0YXJ0LCBcIlNldHRlciBjYW5ub3QgdXNlIHJlc3QgcGFyYW1zXCIpOyB9XG4gIH1cbn07XG5cbnBwJDUucGFyc2VQcm9wZXJ0eVZhbHVlID0gZnVuY3Rpb24ocHJvcCwgaXNQYXR0ZXJuLCBpc0dlbmVyYXRvciwgaXNBc3luYywgc3RhcnRQb3MsIHN0YXJ0TG9jLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBjb250YWluc0VzYykge1xuICBpZiAoKGlzR2VuZXJhdG9yIHx8IGlzQXN5bmMpICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb2xvbilcbiAgICB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG5cbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuY29sb24pKSB7XG4gICAgcHJvcC52YWx1ZSA9IGlzUGF0dGVybiA/IHRoaXMucGFyc2VNYXliZURlZmF1bHQodGhpcy5zdGFydCwgdGhpcy5zdGFydExvYykgOiB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgIHByb3Aua2luZCA9IFwiaW5pdFwiO1xuICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wYXJlbkwpIHtcbiAgICBpZiAoaXNQYXR0ZXJuKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgcHJvcC5tZXRob2QgPSB0cnVlO1xuICAgIHByb3AudmFsdWUgPSB0aGlzLnBhcnNlTWV0aG9kKGlzR2VuZXJhdG9yLCBpc0FzeW5jKTtcbiAgICBwcm9wLmtpbmQgPSBcImluaXRcIjtcbiAgfSBlbHNlIGlmICghaXNQYXR0ZXJuICYmICFjb250YWluc0VzYyAmJlxuICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA1ICYmICFwcm9wLmNvbXB1dGVkICYmIHByb3Aua2V5LnR5cGUgPT09IFwiSWRlbnRpZmllclwiICYmXG4gICAgICAgICAgICAgKHByb3Aua2V5Lm5hbWUgPT09IFwiZ2V0XCIgfHwgcHJvcC5rZXkubmFtZSA9PT0gXCJzZXRcIikgJiZcbiAgICAgICAgICAgICAodGhpcy50eXBlICE9PSB0eXBlcyQxLmNvbW1hICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5icmFjZVIgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLmVxKSkge1xuICAgIGlmIChpc0dlbmVyYXRvciB8fCBpc0FzeW5jKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgdGhpcy5wYXJzZUdldHRlclNldHRlcihwcm9wKTtcbiAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiAhcHJvcC5jb21wdXRlZCAmJiBwcm9wLmtleS50eXBlID09PSBcIklkZW50aWZpZXJcIikge1xuICAgIGlmIChpc0dlbmVyYXRvciB8fCBpc0FzeW5jKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgdGhpcy5jaGVja1VucmVzZXJ2ZWQocHJvcC5rZXkpO1xuICAgIGlmIChwcm9wLmtleS5uYW1lID09PSBcImF3YWl0XCIgJiYgIXRoaXMuYXdhaXRJZGVudFBvcylcbiAgICAgIHsgdGhpcy5hd2FpdElkZW50UG9zID0gc3RhcnRQb3M7IH1cbiAgICBpZiAoaXNQYXR0ZXJuKSB7XG4gICAgICBwcm9wLnZhbHVlID0gdGhpcy5wYXJzZU1heWJlRGVmYXVsdChzdGFydFBvcywgc3RhcnRMb2MsIHRoaXMuY29weU5vZGUocHJvcC5rZXkpKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lcSAmJiByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5zaG9ydGhhbmRBc3NpZ24gPCAwKVxuICAgICAgICB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuc2hvcnRoYW5kQXNzaWduID0gdGhpcy5zdGFydDsgfVxuICAgICAgcHJvcC52YWx1ZSA9IHRoaXMucGFyc2VNYXliZURlZmF1bHQoc3RhcnRQb3MsIHN0YXJ0TG9jLCB0aGlzLmNvcHlOb2RlKHByb3Aua2V5KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb3AudmFsdWUgPSB0aGlzLmNvcHlOb2RlKHByb3Aua2V5KTtcbiAgICB9XG4gICAgcHJvcC5raW5kID0gXCJpbml0XCI7XG4gICAgcHJvcC5zaG9ydGhhbmQgPSB0cnVlO1xuICB9IGVsc2UgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxufTtcblxucHAkNS5wYXJzZVByb3BlcnR5TmFtZSA9IGZ1bmN0aW9uKHByb3ApIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7XG4gICAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuYnJhY2tldEwpKSB7XG4gICAgICBwcm9wLmNvbXB1dGVkID0gdHJ1ZTtcbiAgICAgIHByb3Aua2V5ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNrZXRSKTtcbiAgICAgIHJldHVybiBwcm9wLmtleVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9wLmNvbXB1dGVkID0gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcm9wLmtleSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5udW0gfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLnN0cmluZyA/IHRoaXMucGFyc2VFeHByQXRvbSgpIDogdGhpcy5wYXJzZUlkZW50KHRoaXMub3B0aW9ucy5hbGxvd1Jlc2VydmVkICE9PSBcIm5ldmVyXCIpXG59O1xuXG4vLyBJbml0aWFsaXplIGVtcHR5IGZ1bmN0aW9uIG5vZGUuXG5cbnBwJDUuaW5pdEZ1bmN0aW9uID0gZnVuY3Rpb24obm9kZSkge1xuICBub2RlLmlkID0gbnVsbDtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7IG5vZGUuZ2VuZXJhdG9yID0gbm9kZS5leHByZXNzaW9uID0gZmFsc2U7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4KSB7IG5vZGUuYXN5bmMgPSBmYWxzZTsgfVxufTtcblxuLy8gUGFyc2Ugb2JqZWN0IG9yIGNsYXNzIG1ldGhvZC5cblxucHAkNS5wYXJzZU1ldGhvZCA9IGZ1bmN0aW9uKGlzR2VuZXJhdG9yLCBpc0FzeW5jLCBhbGxvd0RpcmVjdFN1cGVyKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKSwgb2xkWWllbGRQb3MgPSB0aGlzLnlpZWxkUG9zLCBvbGRBd2FpdFBvcyA9IHRoaXMuYXdhaXRQb3MsIG9sZEF3YWl0SWRlbnRQb3MgPSB0aGlzLmF3YWl0SWRlbnRQb3M7XG5cbiAgdGhpcy5pbml0RnVuY3Rpb24obm9kZSk7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNilcbiAgICB7IG5vZGUuZ2VuZXJhdG9yID0gaXNHZW5lcmF0b3I7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4KVxuICAgIHsgbm9kZS5hc3luYyA9ICEhaXNBc3luYzsgfVxuXG4gIHRoaXMueWllbGRQb3MgPSAwO1xuICB0aGlzLmF3YWl0UG9zID0gMDtcbiAgdGhpcy5hd2FpdElkZW50UG9zID0gMDtcbiAgdGhpcy5lbnRlclNjb3BlKGZ1bmN0aW9uRmxhZ3MoaXNBc3luYywgbm9kZS5nZW5lcmF0b3IpIHwgU0NPUEVfU1VQRVIgfCAoYWxsb3dEaXJlY3RTdXBlciA/IFNDT1BFX0RJUkVDVF9TVVBFUiA6IDApKTtcblxuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuTCk7XG4gIG5vZGUucGFyYW1zID0gdGhpcy5wYXJzZUJpbmRpbmdMaXN0KHR5cGVzJDEucGFyZW5SLCBmYWxzZSwgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgpO1xuICB0aGlzLmNoZWNrWWllbGRBd2FpdEluRGVmYXVsdFBhcmFtcygpO1xuICB0aGlzLnBhcnNlRnVuY3Rpb25Cb2R5KG5vZGUsIGZhbHNlLCB0cnVlLCBmYWxzZSk7XG5cbiAgdGhpcy55aWVsZFBvcyA9IG9sZFlpZWxkUG9zO1xuICB0aGlzLmF3YWl0UG9zID0gb2xkQXdhaXRQb3M7XG4gIHRoaXMuYXdhaXRJZGVudFBvcyA9IG9sZEF3YWl0SWRlbnRQb3M7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJGdW5jdGlvbkV4cHJlc3Npb25cIilcbn07XG5cbi8vIFBhcnNlIGFycm93IGZ1bmN0aW9uIGV4cHJlc3Npb24gd2l0aCBnaXZlbiBwYXJhbWV0ZXJzLlxuXG5wcCQ1LnBhcnNlQXJyb3dFeHByZXNzaW9uID0gZnVuY3Rpb24obm9kZSwgcGFyYW1zLCBpc0FzeW5jLCBmb3JJbml0KSB7XG4gIHZhciBvbGRZaWVsZFBvcyA9IHRoaXMueWllbGRQb3MsIG9sZEF3YWl0UG9zID0gdGhpcy5hd2FpdFBvcywgb2xkQXdhaXRJZGVudFBvcyA9IHRoaXMuYXdhaXRJZGVudFBvcztcblxuICB0aGlzLmVudGVyU2NvcGUoZnVuY3Rpb25GbGFncyhpc0FzeW5jLCBmYWxzZSkgfCBTQ09QRV9BUlJPVyk7XG4gIHRoaXMuaW5pdEZ1bmN0aW9uKG5vZGUpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgpIHsgbm9kZS5hc3luYyA9ICEhaXNBc3luYzsgfVxuXG4gIHRoaXMueWllbGRQb3MgPSAwO1xuICB0aGlzLmF3YWl0UG9zID0gMDtcbiAgdGhpcy5hd2FpdElkZW50UG9zID0gMDtcblxuICBub2RlLnBhcmFtcyA9IHRoaXMudG9Bc3NpZ25hYmxlTGlzdChwYXJhbXMsIHRydWUpO1xuICB0aGlzLnBhcnNlRnVuY3Rpb25Cb2R5KG5vZGUsIHRydWUsIGZhbHNlLCBmb3JJbml0KTtcblxuICB0aGlzLnlpZWxkUG9zID0gb2xkWWllbGRQb3M7XG4gIHRoaXMuYXdhaXRQb3MgPSBvbGRBd2FpdFBvcztcbiAgdGhpcy5hd2FpdElkZW50UG9zID0gb2xkQXdhaXRJZGVudFBvcztcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkFycm93RnVuY3Rpb25FeHByZXNzaW9uXCIpXG59O1xuXG4vLyBQYXJzZSBmdW5jdGlvbiBib2R5IGFuZCBjaGVjayBwYXJhbWV0ZXJzLlxuXG5wcCQ1LnBhcnNlRnVuY3Rpb25Cb2R5ID0gZnVuY3Rpb24obm9kZSwgaXNBcnJvd0Z1bmN0aW9uLCBpc01ldGhvZCwgZm9ySW5pdCkge1xuICB2YXIgaXNFeHByZXNzaW9uID0gaXNBcnJvd0Z1bmN0aW9uICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5icmFjZUw7XG4gIHZhciBvbGRTdHJpY3QgPSB0aGlzLnN0cmljdCwgdXNlU3RyaWN0ID0gZmFsc2U7XG5cbiAgaWYgKGlzRXhwcmVzc2lvbikge1xuICAgIG5vZGUuYm9keSA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmb3JJbml0KTtcbiAgICBub2RlLmV4cHJlc3Npb24gPSB0cnVlO1xuICAgIHRoaXMuY2hlY2tQYXJhbXMobm9kZSwgZmFsc2UpO1xuICB9IGVsc2Uge1xuICAgIHZhciBub25TaW1wbGUgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNyAmJiAhdGhpcy5pc1NpbXBsZVBhcmFtTGlzdChub2RlLnBhcmFtcyk7XG4gICAgaWYgKCFvbGRTdHJpY3QgfHwgbm9uU2ltcGxlKSB7XG4gICAgICB1c2VTdHJpY3QgPSB0aGlzLnN0cmljdERpcmVjdGl2ZSh0aGlzLmVuZCk7XG4gICAgICAvLyBJZiB0aGlzIGlzIGEgc3RyaWN0IG1vZGUgZnVuY3Rpb24sIHZlcmlmeSB0aGF0IGFyZ3VtZW50IG5hbWVzXG4gICAgICAvLyBhcmUgbm90IHJlcGVhdGVkLCBhbmQgaXQgZG9lcyBub3QgdHJ5IHRvIGJpbmQgdGhlIHdvcmRzIGBldmFsYFxuICAgICAgLy8gb3IgYGFyZ3VtZW50c2AuXG4gICAgICBpZiAodXNlU3RyaWN0ICYmIG5vblNpbXBsZSlcbiAgICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCJJbGxlZ2FsICd1c2Ugc3RyaWN0JyBkaXJlY3RpdmUgaW4gZnVuY3Rpb24gd2l0aCBub24tc2ltcGxlIHBhcmFtZXRlciBsaXN0XCIpOyB9XG4gICAgfVxuICAgIC8vIFN0YXJ0IGEgbmV3IHNjb3BlIHdpdGggcmVnYXJkIHRvIGxhYmVscyBhbmQgdGhlIGBpbkZ1bmN0aW9uYFxuICAgIC8vIGZsYWcgKHJlc3RvcmUgdGhlbSB0byB0aGVpciBvbGQgdmFsdWUgYWZ0ZXJ3YXJkcykuXG4gICAgdmFyIG9sZExhYmVscyA9IHRoaXMubGFiZWxzO1xuICAgIHRoaXMubGFiZWxzID0gW107XG4gICAgaWYgKHVzZVN0cmljdCkgeyB0aGlzLnN0cmljdCA9IHRydWU7IH1cblxuICAgIC8vIEFkZCB0aGUgcGFyYW1zIHRvIHZhckRlY2xhcmVkTmFtZXMgdG8gZW5zdXJlIHRoYXQgYW4gZXJyb3IgaXMgdGhyb3duXG4gICAgLy8gaWYgYSBsZXQvY29uc3QgZGVjbGFyYXRpb24gaW4gdGhlIGZ1bmN0aW9uIGNsYXNoZXMgd2l0aCBvbmUgb2YgdGhlIHBhcmFtcy5cbiAgICB0aGlzLmNoZWNrUGFyYW1zKG5vZGUsICFvbGRTdHJpY3QgJiYgIXVzZVN0cmljdCAmJiAhaXNBcnJvd0Z1bmN0aW9uICYmICFpc01ldGhvZCAmJiB0aGlzLmlzU2ltcGxlUGFyYW1MaXN0KG5vZGUucGFyYW1zKSk7XG4gICAgLy8gRW5zdXJlIHRoZSBmdW5jdGlvbiBuYW1lIGlzbid0IGEgZm9yYmlkZGVuIGlkZW50aWZpZXIgaW4gc3RyaWN0IG1vZGUsIGUuZy4gJ2V2YWwnXG4gICAgaWYgKHRoaXMuc3RyaWN0ICYmIG5vZGUuaWQpIHsgdGhpcy5jaGVja0xWYWxTaW1wbGUobm9kZS5pZCwgQklORF9PVVRTSURFKTsgfVxuICAgIG5vZGUuYm9keSA9IHRoaXMucGFyc2VCbG9jayhmYWxzZSwgdW5kZWZpbmVkLCB1c2VTdHJpY3QgJiYgIW9sZFN0cmljdCk7XG4gICAgbm9kZS5leHByZXNzaW9uID0gZmFsc2U7XG4gICAgdGhpcy5hZGFwdERpcmVjdGl2ZVByb2xvZ3VlKG5vZGUuYm9keS5ib2R5KTtcbiAgICB0aGlzLmxhYmVscyA9IG9sZExhYmVscztcbiAgfVxuICB0aGlzLmV4aXRTY29wZSgpO1xufTtcblxucHAkNS5pc1NpbXBsZVBhcmFtTGlzdCA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IHBhcmFtczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpXG4gICAge1xuICAgIHZhciBwYXJhbSA9IGxpc3RbaV07XG5cbiAgICBpZiAocGFyYW0udHlwZSAhPT0gXCJJZGVudGlmaWVyXCIpIHsgcmV0dXJuIGZhbHNlXG4gIH0gfVxuICByZXR1cm4gdHJ1ZVxufTtcblxuLy8gQ2hlY2tzIGZ1bmN0aW9uIHBhcmFtcyBmb3IgdmFyaW91cyBkaXNhbGxvd2VkIHBhdHRlcm5zIHN1Y2ggYXMgdXNpbmcgXCJldmFsXCJcbi8vIG9yIFwiYXJndW1lbnRzXCIgYW5kIGR1cGxpY2F0ZSBwYXJhbWV0ZXJzLlxuXG5wcCQ1LmNoZWNrUGFyYW1zID0gZnVuY3Rpb24obm9kZSwgYWxsb3dEdXBsaWNhdGVzKSB7XG4gIHZhciBuYW1lSGFzaCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gbm9kZS5wYXJhbXM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKVxuICAgIHtcbiAgICB2YXIgcGFyYW0gPSBsaXN0W2ldO1xuXG4gICAgdGhpcy5jaGVja0xWYWxJbm5lclBhdHRlcm4ocGFyYW0sIEJJTkRfVkFSLCBhbGxvd0R1cGxpY2F0ZXMgPyBudWxsIDogbmFtZUhhc2gpO1xuICB9XG59O1xuXG4vLyBQYXJzZXMgYSBjb21tYS1zZXBhcmF0ZWQgbGlzdCBvZiBleHByZXNzaW9ucywgYW5kIHJldHVybnMgdGhlbSBhc1xuLy8gYW4gYXJyYXkuIGBjbG9zZWAgaXMgdGhlIHRva2VuIHR5cGUgdGhhdCBlbmRzIHRoZSBsaXN0LCBhbmRcbi8vIGBhbGxvd0VtcHR5YCBjYW4gYmUgdHVybmVkIG9uIHRvIGFsbG93IHN1YnNlcXVlbnQgY29tbWFzIHdpdGhcbi8vIG5vdGhpbmcgaW4gYmV0d2VlbiB0aGVtIHRvIGJlIHBhcnNlZCBhcyBgbnVsbGAgKHdoaWNoIGlzIG5lZWRlZFxuLy8gZm9yIGFycmF5IGxpdGVyYWxzKS5cblxucHAkNS5wYXJzZUV4cHJMaXN0ID0gZnVuY3Rpb24oY2xvc2UsIGFsbG93VHJhaWxpbmdDb21tYSwgYWxsb3dFbXB0eSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICB2YXIgZWx0cyA9IFtdLCBmaXJzdCA9IHRydWU7XG4gIHdoaWxlICghdGhpcy5lYXQoY2xvc2UpKSB7XG4gICAgaWYgKCFmaXJzdCkge1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICBpZiAoYWxsb3dUcmFpbGluZ0NvbW1hICYmIHRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKGNsb3NlKSkgeyBicmVhayB9XG4gICAgfSBlbHNlIHsgZmlyc3QgPSBmYWxzZTsgfVxuXG4gICAgdmFyIGVsdCA9ICh2b2lkIDApO1xuICAgIGlmIChhbGxvd0VtcHR5ICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSlcbiAgICAgIHsgZWx0ID0gbnVsbDsgfVxuICAgIGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lbGxpcHNpcykge1xuICAgICAgZWx0ID0gdGhpcy5wYXJzZVNwcmVhZChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSAmJiByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPCAwKVxuICAgICAgICB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA9IHRoaXMuc3RhcnQ7IH1cbiAgICB9IGVsc2Uge1xuICAgICAgZWx0ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICB9XG4gICAgZWx0cy5wdXNoKGVsdCk7XG4gIH1cbiAgcmV0dXJuIGVsdHNcbn07XG5cbnBwJDUuY2hlY2tVbnJlc2VydmVkID0gZnVuY3Rpb24ocmVmKSB7XG4gIHZhciBzdGFydCA9IHJlZi5zdGFydDtcbiAgdmFyIGVuZCA9IHJlZi5lbmQ7XG4gIHZhciBuYW1lID0gcmVmLm5hbWU7XG5cbiAgaWYgKHRoaXMuaW5HZW5lcmF0b3IgJiYgbmFtZSA9PT0gXCJ5aWVsZFwiKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHN0YXJ0LCBcIkNhbm5vdCB1c2UgJ3lpZWxkJyBhcyBpZGVudGlmaWVyIGluc2lkZSBhIGdlbmVyYXRvclwiKTsgfVxuICBpZiAodGhpcy5pbkFzeW5jICYmIG5hbWUgPT09IFwiYXdhaXRcIilcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShzdGFydCwgXCJDYW5ub3QgdXNlICdhd2FpdCcgYXMgaWRlbnRpZmllciBpbnNpZGUgYW4gYXN5bmMgZnVuY3Rpb25cIik7IH1cbiAgaWYgKCEodGhpcy5jdXJyZW50VGhpc1Njb3BlKCkuZmxhZ3MgJiBTQ09QRV9WQVIpICYmIG5hbWUgPT09IFwiYXJndW1lbnRzXCIpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoc3RhcnQsIFwiQ2Fubm90IHVzZSAnYXJndW1lbnRzJyBpbiBjbGFzcyBmaWVsZCBpbml0aWFsaXplclwiKTsgfVxuICBpZiAodGhpcy5pbkNsYXNzU3RhdGljQmxvY2sgJiYgKG5hbWUgPT09IFwiYXJndW1lbnRzXCIgfHwgbmFtZSA9PT0gXCJhd2FpdFwiKSlcbiAgICB7IHRoaXMucmFpc2Uoc3RhcnQsIChcIkNhbm5vdCB1c2UgXCIgKyBuYW1lICsgXCIgaW4gY2xhc3Mgc3RhdGljIGluaXRpYWxpemF0aW9uIGJsb2NrXCIpKTsgfVxuICBpZiAodGhpcy5rZXl3b3Jkcy50ZXN0KG5hbWUpKVxuICAgIHsgdGhpcy5yYWlzZShzdGFydCwgKFwiVW5leHBlY3RlZCBrZXl3b3JkICdcIiArIG5hbWUgKyBcIidcIikpOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA2ICYmXG4gICAgdGhpcy5pbnB1dC5zbGljZShzdGFydCwgZW5kKS5pbmRleE9mKFwiXFxcXFwiKSAhPT0gLTEpIHsgcmV0dXJuIH1cbiAgdmFyIHJlID0gdGhpcy5zdHJpY3QgPyB0aGlzLnJlc2VydmVkV29yZHNTdHJpY3QgOiB0aGlzLnJlc2VydmVkV29yZHM7XG4gIGlmIChyZS50ZXN0KG5hbWUpKSB7XG4gICAgaWYgKCF0aGlzLmluQXN5bmMgJiYgbmFtZSA9PT0gXCJhd2FpdFwiKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoc3RhcnQsIFwiQ2Fubm90IHVzZSBrZXl3b3JkICdhd2FpdCcgb3V0c2lkZSBhbiBhc3luYyBmdW5jdGlvblwiKTsgfVxuICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShzdGFydCwgKFwiVGhlIGtleXdvcmQgJ1wiICsgbmFtZSArIFwiJyBpcyByZXNlcnZlZFwiKSk7XG4gIH1cbn07XG5cbi8vIFBhcnNlIHRoZSBuZXh0IHRva2VuIGFzIGFuIGlkZW50aWZpZXIuIElmIGBsaWJlcmFsYCBpcyB0cnVlICh1c2VkXG4vLyB3aGVuIHBhcnNpbmcgcHJvcGVydGllcyksIGl0IHdpbGwgYWxzbyBjb252ZXJ0IGtleXdvcmRzIGludG9cbi8vIGlkZW50aWZpZXJzLlxuXG5wcCQ1LnBhcnNlSWRlbnQgPSBmdW5jdGlvbihsaWJlcmFsKSB7XG4gIHZhciBub2RlID0gdGhpcy5wYXJzZUlkZW50Tm9kZSgpO1xuICB0aGlzLm5leHQoISFsaWJlcmFsKTtcbiAgdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSWRlbnRpZmllclwiKTtcbiAgaWYgKCFsaWJlcmFsKSB7XG4gICAgdGhpcy5jaGVja1VucmVzZXJ2ZWQobm9kZSk7XG4gICAgaWYgKG5vZGUubmFtZSA9PT0gXCJhd2FpdFwiICYmICF0aGlzLmF3YWl0SWRlbnRQb3MpXG4gICAgICB7IHRoaXMuYXdhaXRJZGVudFBvcyA9IG5vZGUuc3RhcnQ7IH1cbiAgfVxuICByZXR1cm4gbm9kZVxufTtcblxucHAkNS5wYXJzZUlkZW50Tm9kZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSkge1xuICAgIG5vZGUubmFtZSA9IHRoaXMudmFsdWU7XG4gIH0gZWxzZSBpZiAodGhpcy50eXBlLmtleXdvcmQpIHtcbiAgICBub2RlLm5hbWUgPSB0aGlzLnR5cGUua2V5d29yZDtcblxuICAgIC8vIFRvIGZpeCBodHRwczovL2dpdGh1Yi5jb20vYWNvcm5qcy9hY29ybi9pc3N1ZXMvNTc1XG4gICAgLy8gYGNsYXNzYCBhbmQgYGZ1bmN0aW9uYCBrZXl3b3JkcyBwdXNoIG5ldyBjb250ZXh0IGludG8gdGhpcy5jb250ZXh0LlxuICAgIC8vIEJ1dCB0aGVyZSBpcyBubyBjaGFuY2UgdG8gcG9wIHRoZSBjb250ZXh0IGlmIHRoZSBrZXl3b3JkIGlzIGNvbnN1bWVkIGFzIGFuIGlkZW50aWZpZXIgc3VjaCBhcyBhIHByb3BlcnR5IG5hbWUuXG4gICAgLy8gSWYgdGhlIHByZXZpb3VzIHRva2VuIGlzIGEgZG90LCB0aGlzIGRvZXMgbm90IGFwcGx5IGJlY2F1c2UgdGhlIGNvbnRleHQtbWFuYWdpbmcgY29kZSBhbHJlYWR5IGlnbm9yZWQgdGhlIGtleXdvcmRcbiAgICBpZiAoKG5vZGUubmFtZSA9PT0gXCJjbGFzc1wiIHx8IG5vZGUubmFtZSA9PT0gXCJmdW5jdGlvblwiKSAmJlxuICAgICAgKHRoaXMubGFzdFRva0VuZCAhPT0gdGhpcy5sYXN0VG9rU3RhcnQgKyAxIHx8IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLmxhc3RUb2tTdGFydCkgIT09IDQ2KSkge1xuICAgICAgdGhpcy5jb250ZXh0LnBvcCgpO1xuICAgIH1cbiAgICB0aGlzLnR5cGUgPSB0eXBlcyQxLm5hbWU7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy51bmV4cGVjdGVkKCk7XG4gIH1cbiAgcmV0dXJuIG5vZGVcbn07XG5cbnBwJDUucGFyc2VQcml2YXRlSWRlbnQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnByaXZhdGVJZCkge1xuICAgIG5vZGUubmFtZSA9IHRoaXMudmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy51bmV4cGVjdGVkKCk7XG4gIH1cbiAgdGhpcy5uZXh0KCk7XG4gIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlByaXZhdGVJZGVudGlmaWVyXCIpO1xuXG4gIC8vIEZvciB2YWxpZGF0aW5nIGV4aXN0ZW5jZVxuICBpZiAodGhpcy5vcHRpb25zLmNoZWNrUHJpdmF0ZUZpZWxkcykge1xuICAgIGlmICh0aGlzLnByaXZhdGVOYW1lU3RhY2subGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnJhaXNlKG5vZGUuc3RhcnQsIChcIlByaXZhdGUgZmllbGQgJyNcIiArIChub2RlLm5hbWUpICsgXCInIG11c3QgYmUgZGVjbGFyZWQgaW4gYW4gZW5jbG9zaW5nIGNsYXNzXCIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcml2YXRlTmFtZVN0YWNrW3RoaXMucHJpdmF0ZU5hbWVTdGFjay5sZW5ndGggLSAxXS51c2VkLnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5vZGVcbn07XG5cbi8vIFBhcnNlcyB5aWVsZCBleHByZXNzaW9uIGluc2lkZSBnZW5lcmF0b3IuXG5cbnBwJDUucGFyc2VZaWVsZCA9IGZ1bmN0aW9uKGZvckluaXQpIHtcbiAgaWYgKCF0aGlzLnlpZWxkUG9zKSB7IHRoaXMueWllbGRQb3MgPSB0aGlzLnN0YXJ0OyB9XG5cbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHQoKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zZW1pIHx8IHRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkgfHwgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5zdGFyICYmICF0aGlzLnR5cGUuc3RhcnRzRXhwcikpIHtcbiAgICBub2RlLmRlbGVnYXRlID0gZmFsc2U7XG4gICAgbm9kZS5hcmd1bWVudCA9IG51bGw7XG4gIH0gZWxzZSB7XG4gICAgbm9kZS5kZWxlZ2F0ZSA9IHRoaXMuZWF0KHR5cGVzJDEuc3Rhcik7XG4gICAgbm9kZS5hcmd1bWVudCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmb3JJbml0KTtcbiAgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiWWllbGRFeHByZXNzaW9uXCIpXG59O1xuXG5wcCQ1LnBhcnNlQXdhaXQgPSBmdW5jdGlvbihmb3JJbml0KSB7XG4gIGlmICghdGhpcy5hd2FpdFBvcykgeyB0aGlzLmF3YWl0UG9zID0gdGhpcy5zdGFydDsgfVxuXG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUuYXJndW1lbnQgPSB0aGlzLnBhcnNlTWF5YmVVbmFyeShudWxsLCB0cnVlLCBmYWxzZSwgZm9ySW5pdCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJBd2FpdEV4cHJlc3Npb25cIilcbn07XG5cbnZhciBwcCQ0ID0gUGFyc2VyLnByb3RvdHlwZTtcblxuLy8gVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHJhaXNlIGV4Y2VwdGlvbnMgb24gcGFyc2UgZXJyb3JzLiBJdFxuLy8gdGFrZXMgYW4gb2Zmc2V0IGludGVnZXIgKGludG8gdGhlIGN1cnJlbnQgYGlucHV0YCkgdG8gaW5kaWNhdGVcbi8vIHRoZSBsb2NhdGlvbiBvZiB0aGUgZXJyb3IsIGF0dGFjaGVzIHRoZSBwb3NpdGlvbiB0byB0aGUgZW5kXG4vLyBvZiB0aGUgZXJyb3IgbWVzc2FnZSwgYW5kIHRoZW4gcmFpc2VzIGEgYFN5bnRheEVycm9yYCB3aXRoIHRoYXRcbi8vIG1lc3NhZ2UuXG5cbnBwJDQucmFpc2UgPSBmdW5jdGlvbihwb3MsIG1lc3NhZ2UpIHtcbiAgdmFyIGxvYyA9IGdldExpbmVJbmZvKHRoaXMuaW5wdXQsIHBvcyk7XG4gIG1lc3NhZ2UgKz0gXCIgKFwiICsgbG9jLmxpbmUgKyBcIjpcIiArIGxvYy5jb2x1bW4gKyBcIilcIjtcbiAgaWYgKHRoaXMuc291cmNlRmlsZSkge1xuICAgIG1lc3NhZ2UgKz0gXCIgaW4gXCIgKyB0aGlzLnNvdXJjZUZpbGU7XG4gIH1cbiAgdmFyIGVyciA9IG5ldyBTeW50YXhFcnJvcihtZXNzYWdlKTtcbiAgZXJyLnBvcyA9IHBvczsgZXJyLmxvYyA9IGxvYzsgZXJyLnJhaXNlZEF0ID0gdGhpcy5wb3M7XG4gIHRocm93IGVyclxufTtcblxucHAkNC5yYWlzZVJlY292ZXJhYmxlID0gcHAkNC5yYWlzZTtcblxucHAkNC5jdXJQb3NpdGlvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykge1xuICAgIHJldHVybiBuZXcgUG9zaXRpb24odGhpcy5jdXJMaW5lLCB0aGlzLnBvcyAtIHRoaXMubGluZVN0YXJ0KVxuICB9XG59O1xuXG52YXIgcHAkMyA9IFBhcnNlci5wcm90b3R5cGU7XG5cbnZhciBTY29wZSA9IGZ1bmN0aW9uIFNjb3BlKGZsYWdzKSB7XG4gIHRoaXMuZmxhZ3MgPSBmbGFncztcbiAgLy8gQSBsaXN0IG9mIHZhci1kZWNsYXJlZCBuYW1lcyBpbiB0aGUgY3VycmVudCBsZXhpY2FsIHNjb3BlXG4gIHRoaXMudmFyID0gW107XG4gIC8vIEEgbGlzdCBvZiBsZXhpY2FsbHktZGVjbGFyZWQgbmFtZXMgaW4gdGhlIGN1cnJlbnQgbGV4aWNhbCBzY29wZVxuICB0aGlzLmxleGljYWwgPSBbXTtcbiAgLy8gQSBsaXN0IG9mIGxleGljYWxseS1kZWNsYXJlZCBGdW5jdGlvbkRlY2xhcmF0aW9uIG5hbWVzIGluIHRoZSBjdXJyZW50IGxleGljYWwgc2NvcGVcbiAgdGhpcy5mdW5jdGlvbnMgPSBbXTtcbn07XG5cbi8vIFRoZSBmdW5jdGlvbnMgaW4gdGhpcyBtb2R1bGUga2VlcCB0cmFjayBvZiBkZWNsYXJlZCB2YXJpYWJsZXMgaW4gdGhlIGN1cnJlbnQgc2NvcGUgaW4gb3JkZXIgdG8gZGV0ZWN0IGR1cGxpY2F0ZSB2YXJpYWJsZSBuYW1lcy5cblxucHAkMy5lbnRlclNjb3BlID0gZnVuY3Rpb24oZmxhZ3MpIHtcbiAgdGhpcy5zY29wZVN0YWNrLnB1c2gobmV3IFNjb3BlKGZsYWdzKSk7XG59O1xuXG5wcCQzLmV4aXRTY29wZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnNjb3BlU3RhY2sucG9wKCk7XG59O1xuXG4vLyBUaGUgc3BlYyBzYXlzOlxuLy8gPiBBdCB0aGUgdG9wIGxldmVsIG9mIGEgZnVuY3Rpb24sIG9yIHNjcmlwdCwgZnVuY3Rpb24gZGVjbGFyYXRpb25zIGFyZVxuLy8gPiB0cmVhdGVkIGxpa2UgdmFyIGRlY2xhcmF0aW9ucyByYXRoZXIgdGhhbiBsaWtlIGxleGljYWwgZGVjbGFyYXRpb25zLlxucHAkMy50cmVhdEZ1bmN0aW9uc0FzVmFySW5TY29wZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gIHJldHVybiAoc2NvcGUuZmxhZ3MgJiBTQ09QRV9GVU5DVElPTikgfHwgIXRoaXMuaW5Nb2R1bGUgJiYgKHNjb3BlLmZsYWdzICYgU0NPUEVfVE9QKVxufTtcblxucHAkMy5kZWNsYXJlTmFtZSA9IGZ1bmN0aW9uKG5hbWUsIGJpbmRpbmdUeXBlLCBwb3MpIHtcbiAgdmFyIHJlZGVjbGFyZWQgPSBmYWxzZTtcbiAgaWYgKGJpbmRpbmdUeXBlID09PSBCSU5EX0xFWElDQUwpIHtcbiAgICB2YXIgc2NvcGUgPSB0aGlzLmN1cnJlbnRTY29wZSgpO1xuICAgIHJlZGVjbGFyZWQgPSBzY29wZS5sZXhpY2FsLmluZGV4T2YobmFtZSkgPiAtMSB8fCBzY29wZS5mdW5jdGlvbnMuaW5kZXhPZihuYW1lKSA+IC0xIHx8IHNjb3BlLnZhci5pbmRleE9mKG5hbWUpID4gLTE7XG4gICAgc2NvcGUubGV4aWNhbC5wdXNoKG5hbWUpO1xuICAgIGlmICh0aGlzLmluTW9kdWxlICYmIChzY29wZS5mbGFncyAmIFNDT1BFX1RPUCkpXG4gICAgICB7IGRlbGV0ZSB0aGlzLnVuZGVmaW5lZEV4cG9ydHNbbmFtZV07IH1cbiAgfSBlbHNlIGlmIChiaW5kaW5nVHlwZSA9PT0gQklORF9TSU1QTEVfQ0FUQ0gpIHtcbiAgICB2YXIgc2NvcGUkMSA9IHRoaXMuY3VycmVudFNjb3BlKCk7XG4gICAgc2NvcGUkMS5sZXhpY2FsLnB1c2gobmFtZSk7XG4gIH0gZWxzZSBpZiAoYmluZGluZ1R5cGUgPT09IEJJTkRfRlVOQ1RJT04pIHtcbiAgICB2YXIgc2NvcGUkMiA9IHRoaXMuY3VycmVudFNjb3BlKCk7XG4gICAgaWYgKHRoaXMudHJlYXRGdW5jdGlvbnNBc1ZhcilcbiAgICAgIHsgcmVkZWNsYXJlZCA9IHNjb3BlJDIubGV4aWNhbC5pbmRleE9mKG5hbWUpID4gLTE7IH1cbiAgICBlbHNlXG4gICAgICB7IHJlZGVjbGFyZWQgPSBzY29wZSQyLmxleGljYWwuaW5kZXhPZihuYW1lKSA+IC0xIHx8IHNjb3BlJDIudmFyLmluZGV4T2YobmFtZSkgPiAtMTsgfVxuICAgIHNjb3BlJDIuZnVuY3Rpb25zLnB1c2gobmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMuc2NvcGVTdGFjay5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdmFyIHNjb3BlJDMgPSB0aGlzLnNjb3BlU3RhY2tbaV07XG4gICAgICBpZiAoc2NvcGUkMy5sZXhpY2FsLmluZGV4T2YobmFtZSkgPiAtMSAmJiAhKChzY29wZSQzLmZsYWdzICYgU0NPUEVfU0lNUExFX0NBVENIKSAmJiBzY29wZSQzLmxleGljYWxbMF0gPT09IG5hbWUpIHx8XG4gICAgICAgICAgIXRoaXMudHJlYXRGdW5jdGlvbnNBc1ZhckluU2NvcGUoc2NvcGUkMykgJiYgc2NvcGUkMy5mdW5jdGlvbnMuaW5kZXhPZihuYW1lKSA+IC0xKSB7XG4gICAgICAgIHJlZGVjbGFyZWQgPSB0cnVlO1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgc2NvcGUkMy52YXIucHVzaChuYW1lKTtcbiAgICAgIGlmICh0aGlzLmluTW9kdWxlICYmIChzY29wZSQzLmZsYWdzICYgU0NPUEVfVE9QKSlcbiAgICAgICAgeyBkZWxldGUgdGhpcy51bmRlZmluZWRFeHBvcnRzW25hbWVdOyB9XG4gICAgICBpZiAoc2NvcGUkMy5mbGFncyAmIFNDT1BFX1ZBUikgeyBicmVhayB9XG4gICAgfVxuICB9XG4gIGlmIChyZWRlY2xhcmVkKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShwb3MsIChcIklkZW50aWZpZXIgJ1wiICsgbmFtZSArIFwiJyBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkXCIpKTsgfVxufTtcblxucHAkMy5jaGVja0xvY2FsRXhwb3J0ID0gZnVuY3Rpb24oaWQpIHtcbiAgLy8gc2NvcGUuZnVuY3Rpb25zIG11c3QgYmUgZW1wdHkgYXMgTW9kdWxlIGNvZGUgaXMgYWx3YXlzIHN0cmljdC5cbiAgaWYgKHRoaXMuc2NvcGVTdGFja1swXS5sZXhpY2FsLmluZGV4T2YoaWQubmFtZSkgPT09IC0xICYmXG4gICAgICB0aGlzLnNjb3BlU3RhY2tbMF0udmFyLmluZGV4T2YoaWQubmFtZSkgPT09IC0xKSB7XG4gICAgdGhpcy51bmRlZmluZWRFeHBvcnRzW2lkLm5hbWVdID0gaWQ7XG4gIH1cbn07XG5cbnBwJDMuY3VycmVudFNjb3BlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnNjb3BlU3RhY2tbdGhpcy5zY29wZVN0YWNrLmxlbmd0aCAtIDFdXG59O1xuXG5wcCQzLmN1cnJlbnRWYXJTY29wZSA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBpID0gdGhpcy5zY29wZVN0YWNrLmxlbmd0aCAtIDE7OyBpLS0pIHtcbiAgICB2YXIgc2NvcGUgPSB0aGlzLnNjb3BlU3RhY2tbaV07XG4gICAgaWYgKHNjb3BlLmZsYWdzICYgKFNDT1BFX1ZBUiB8IFNDT1BFX0NMQVNTX0ZJRUxEX0lOSVQgfCBTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0spKSB7IHJldHVybiBzY29wZSB9XG4gIH1cbn07XG5cbi8vIENvdWxkIGJlIHVzZWZ1bCBmb3IgYHRoaXNgLCBgbmV3LnRhcmdldGAsIGBzdXBlcigpYCwgYHN1cGVyLnByb3BlcnR5YCwgYW5kIGBzdXBlcltwcm9wZXJ0eV1gLlxucHAkMy5jdXJyZW50VGhpc1Njb3BlID0gZnVuY3Rpb24oKSB7XG4gIGZvciAodmFyIGkgPSB0aGlzLnNjb3BlU3RhY2subGVuZ3RoIC0gMTs7IGktLSkge1xuICAgIHZhciBzY29wZSA9IHRoaXMuc2NvcGVTdGFja1tpXTtcbiAgICBpZiAoc2NvcGUuZmxhZ3MgJiAoU0NPUEVfVkFSIHwgU0NPUEVfQ0xBU1NfRklFTERfSU5JVCB8IFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSykgJiZcbiAgICAgICAgIShzY29wZS5mbGFncyAmIFNDT1BFX0FSUk9XKSkgeyByZXR1cm4gc2NvcGUgfVxuICB9XG59O1xuXG52YXIgTm9kZSA9IGZ1bmN0aW9uIE5vZGUocGFyc2VyLCBwb3MsIGxvYykge1xuICB0aGlzLnR5cGUgPSBcIlwiO1xuICB0aGlzLnN0YXJ0ID0gcG9zO1xuICB0aGlzLmVuZCA9IDA7XG4gIGlmIChwYXJzZXIub3B0aW9ucy5sb2NhdGlvbnMpXG4gICAgeyB0aGlzLmxvYyA9IG5ldyBTb3VyY2VMb2NhdGlvbihwYXJzZXIsIGxvYyk7IH1cbiAgaWYgKHBhcnNlci5vcHRpb25zLmRpcmVjdFNvdXJjZUZpbGUpXG4gICAgeyB0aGlzLnNvdXJjZUZpbGUgPSBwYXJzZXIub3B0aW9ucy5kaXJlY3RTb3VyY2VGaWxlOyB9XG4gIGlmIChwYXJzZXIub3B0aW9ucy5yYW5nZXMpXG4gICAgeyB0aGlzLnJhbmdlID0gW3BvcywgMF07IH1cbn07XG5cbi8vIFN0YXJ0IGFuIEFTVCBub2RlLCBhdHRhY2hpbmcgYSBzdGFydCBvZmZzZXQuXG5cbnZhciBwcCQyID0gUGFyc2VyLnByb3RvdHlwZTtcblxucHAkMi5zdGFydE5vZGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBOb2RlKHRoaXMsIHRoaXMuc3RhcnQsIHRoaXMuc3RhcnRMb2MpXG59O1xuXG5wcCQyLnN0YXJ0Tm9kZUF0ID0gZnVuY3Rpb24ocG9zLCBsb2MpIHtcbiAgcmV0dXJuIG5ldyBOb2RlKHRoaXMsIHBvcywgbG9jKVxufTtcblxuLy8gRmluaXNoIGFuIEFTVCBub2RlLCBhZGRpbmcgYHR5cGVgIGFuZCBgZW5kYCBwcm9wZXJ0aWVzLlxuXG5mdW5jdGlvbiBmaW5pc2hOb2RlQXQobm9kZSwgdHlwZSwgcG9zLCBsb2MpIHtcbiAgbm9kZS50eXBlID0gdHlwZTtcbiAgbm9kZS5lbmQgPSBwb3M7XG4gIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKVxuICAgIHsgbm9kZS5sb2MuZW5kID0gbG9jOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKVxuICAgIHsgbm9kZS5yYW5nZVsxXSA9IHBvczsgfVxuICByZXR1cm4gbm9kZVxufVxuXG5wcCQyLmZpbmlzaE5vZGUgPSBmdW5jdGlvbihub2RlLCB0eXBlKSB7XG4gIHJldHVybiBmaW5pc2hOb2RlQXQuY2FsbCh0aGlzLCBub2RlLCB0eXBlLCB0aGlzLmxhc3RUb2tFbmQsIHRoaXMubGFzdFRva0VuZExvYylcbn07XG5cbi8vIEZpbmlzaCBub2RlIGF0IGdpdmVuIHBvc2l0aW9uXG5cbnBwJDIuZmluaXNoTm9kZUF0ID0gZnVuY3Rpb24obm9kZSwgdHlwZSwgcG9zLCBsb2MpIHtcbiAgcmV0dXJuIGZpbmlzaE5vZGVBdC5jYWxsKHRoaXMsIG5vZGUsIHR5cGUsIHBvcywgbG9jKVxufTtcblxucHAkMi5jb3B5Tm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdmFyIG5ld05vZGUgPSBuZXcgTm9kZSh0aGlzLCBub2RlLnN0YXJ0LCB0aGlzLnN0YXJ0TG9jKTtcbiAgZm9yICh2YXIgcHJvcCBpbiBub2RlKSB7IG5ld05vZGVbcHJvcF0gPSBub2RlW3Byb3BdOyB9XG4gIHJldHVybiBuZXdOb2RlXG59O1xuXG4vLyBUaGlzIGZpbGUgd2FzIGdlbmVyYXRlZCBieSBcImJpbi9nZW5lcmF0ZS11bmljb2RlLXNjcmlwdC12YWx1ZXMuanNcIi4gRG8gbm90IG1vZGlmeSBtYW51YWxseSFcbnZhciBzY3JpcHRWYWx1ZXNBZGRlZEluVW5pY29kZSA9IFwiQmVyZiBCZXJpYV9FcmZlIEdhcmEgR2FyYXkgR3VraCBHdXJ1bmdfS2hlbWEgSHJrdCBLYXRha2FuYV9Pcl9IaXJhZ2FuYSBLYXdpIEtpcmF0X1JhaSBLcmFpIE5hZ19NdW5kYXJpIE5hZ20gT2xfT25hbCBPbmFvIFNpZGV0aWMgU2lkdCBTdW51IFN1bnV3YXIgVGFpX1lvIFRheW8gVG9kaHJpIFRvZHIgVG9sb25nX1Npa2kgVG9scyBUdWx1X1RpZ2FsYXJpIFR1dGcgVW5rbm93biBaenp6XCI7XG5cbi8vIFRoaXMgZmlsZSBjb250YWlucyBVbmljb2RlIHByb3BlcnRpZXMgZXh0cmFjdGVkIGZyb20gdGhlIEVDTUFTY3JpcHQgc3BlY2lmaWNhdGlvbi5cbi8vIFRoZSBsaXN0cyBhcmUgZXh0cmFjdGVkIGxpa2Ugc286XG4vLyAkJCgnI3RhYmxlLWJpbmFyeS11bmljb2RlLXByb3BlcnRpZXMgPiBmaWd1cmUgPiB0YWJsZSA+IHRib2R5ID4gdHIgPiB0ZDpudGgtY2hpbGQoMSkgY29kZScpLm1hcChlbCA9PiBlbC5pbm5lclRleHQpXG5cbi8vICN0YWJsZS1iaW5hcnktdW5pY29kZS1wcm9wZXJ0aWVzXG52YXIgZWNtYTlCaW5hcnlQcm9wZXJ0aWVzID0gXCJBU0NJSSBBU0NJSV9IZXhfRGlnaXQgQUhleCBBbHBoYWJldGljIEFscGhhIEFueSBBc3NpZ25lZCBCaWRpX0NvbnRyb2wgQmlkaV9DIEJpZGlfTWlycm9yZWQgQmlkaV9NIENhc2VfSWdub3JhYmxlIENJIENhc2VkIENoYW5nZXNfV2hlbl9DYXNlZm9sZGVkIENXQ0YgQ2hhbmdlc19XaGVuX0Nhc2VtYXBwZWQgQ1dDTSBDaGFuZ2VzX1doZW5fTG93ZXJjYXNlZCBDV0wgQ2hhbmdlc19XaGVuX05GS0NfQ2FzZWZvbGRlZCBDV0tDRiBDaGFuZ2VzX1doZW5fVGl0bGVjYXNlZCBDV1QgQ2hhbmdlc19XaGVuX1VwcGVyY2FzZWQgQ1dVIERhc2ggRGVmYXVsdF9JZ25vcmFibGVfQ29kZV9Qb2ludCBESSBEZXByZWNhdGVkIERlcCBEaWFjcml0aWMgRGlhIEVtb2ppIEVtb2ppX0NvbXBvbmVudCBFbW9qaV9Nb2RpZmllciBFbW9qaV9Nb2RpZmllcl9CYXNlIEVtb2ppX1ByZXNlbnRhdGlvbiBFeHRlbmRlciBFeHQgR3JhcGhlbWVfQmFzZSBHcl9CYXNlIEdyYXBoZW1lX0V4dGVuZCBHcl9FeHQgSGV4X0RpZ2l0IEhleCBJRFNfQmluYXJ5X09wZXJhdG9yIElEU0IgSURTX1RyaW5hcnlfT3BlcmF0b3IgSURTVCBJRF9Db250aW51ZSBJREMgSURfU3RhcnQgSURTIElkZW9ncmFwaGljIElkZW8gSm9pbl9Db250cm9sIEpvaW5fQyBMb2dpY2FsX09yZGVyX0V4Y2VwdGlvbiBMT0UgTG93ZXJjYXNlIExvd2VyIE1hdGggTm9uY2hhcmFjdGVyX0NvZGVfUG9pbnQgTkNoYXIgUGF0dGVybl9TeW50YXggUGF0X1N5biBQYXR0ZXJuX1doaXRlX1NwYWNlIFBhdF9XUyBRdW90YXRpb25fTWFyayBRTWFyayBSYWRpY2FsIFJlZ2lvbmFsX0luZGljYXRvciBSSSBTZW50ZW5jZV9UZXJtaW5hbCBTVGVybSBTb2Z0X0RvdHRlZCBTRCBUZXJtaW5hbF9QdW5jdHVhdGlvbiBUZXJtIFVuaWZpZWRfSWRlb2dyYXBoIFVJZGVvIFVwcGVyY2FzZSBVcHBlciBWYXJpYXRpb25fU2VsZWN0b3IgVlMgV2hpdGVfU3BhY2Ugc3BhY2UgWElEX0NvbnRpbnVlIFhJREMgWElEX1N0YXJ0IFhJRFNcIjtcbnZhciBlY21hMTBCaW5hcnlQcm9wZXJ0aWVzID0gZWNtYTlCaW5hcnlQcm9wZXJ0aWVzICsgXCIgRXh0ZW5kZWRfUGljdG9ncmFwaGljXCI7XG52YXIgZWNtYTExQmluYXJ5UHJvcGVydGllcyA9IGVjbWExMEJpbmFyeVByb3BlcnRpZXM7XG52YXIgZWNtYTEyQmluYXJ5UHJvcGVydGllcyA9IGVjbWExMUJpbmFyeVByb3BlcnRpZXMgKyBcIiBFQmFzZSBFQ29tcCBFTW9kIEVQcmVzIEV4dFBpY3RcIjtcbnZhciBlY21hMTNCaW5hcnlQcm9wZXJ0aWVzID0gZWNtYTEyQmluYXJ5UHJvcGVydGllcztcbnZhciBlY21hMTRCaW5hcnlQcm9wZXJ0aWVzID0gZWNtYTEzQmluYXJ5UHJvcGVydGllcztcblxudmFyIHVuaWNvZGVCaW5hcnlQcm9wZXJ0aWVzID0ge1xuICA5OiBlY21hOUJpbmFyeVByb3BlcnRpZXMsXG4gIDEwOiBlY21hMTBCaW5hcnlQcm9wZXJ0aWVzLFxuICAxMTogZWNtYTExQmluYXJ5UHJvcGVydGllcyxcbiAgMTI6IGVjbWExMkJpbmFyeVByb3BlcnRpZXMsXG4gIDEzOiBlY21hMTNCaW5hcnlQcm9wZXJ0aWVzLFxuICAxNDogZWNtYTE0QmluYXJ5UHJvcGVydGllc1xufTtcblxuLy8gI3RhYmxlLWJpbmFyeS11bmljb2RlLXByb3BlcnRpZXMtb2Ytc3RyaW5nc1xudmFyIGVjbWExNEJpbmFyeVByb3BlcnRpZXNPZlN0cmluZ3MgPSBcIkJhc2ljX0Vtb2ppIEVtb2ppX0tleWNhcF9TZXF1ZW5jZSBSR0lfRW1vamlfTW9kaWZpZXJfU2VxdWVuY2UgUkdJX0Vtb2ppX0ZsYWdfU2VxdWVuY2UgUkdJX0Vtb2ppX1RhZ19TZXF1ZW5jZSBSR0lfRW1vamlfWldKX1NlcXVlbmNlIFJHSV9FbW9qaVwiO1xuXG52YXIgdW5pY29kZUJpbmFyeVByb3BlcnRpZXNPZlN0cmluZ3MgPSB7XG4gIDk6IFwiXCIsXG4gIDEwOiBcIlwiLFxuICAxMTogXCJcIixcbiAgMTI6IFwiXCIsXG4gIDEzOiBcIlwiLFxuICAxNDogZWNtYTE0QmluYXJ5UHJvcGVydGllc09mU3RyaW5nc1xufTtcblxuLy8gI3RhYmxlLXVuaWNvZGUtZ2VuZXJhbC1jYXRlZ29yeS12YWx1ZXNcbnZhciB1bmljb2RlR2VuZXJhbENhdGVnb3J5VmFsdWVzID0gXCJDYXNlZF9MZXR0ZXIgTEMgQ2xvc2VfUHVuY3R1YXRpb24gUGUgQ29ubmVjdG9yX1B1bmN0dWF0aW9uIFBjIENvbnRyb2wgQ2MgY250cmwgQ3VycmVuY3lfU3ltYm9sIFNjIERhc2hfUHVuY3R1YXRpb24gUGQgRGVjaW1hbF9OdW1iZXIgTmQgZGlnaXQgRW5jbG9zaW5nX01hcmsgTWUgRmluYWxfUHVuY3R1YXRpb24gUGYgRm9ybWF0IENmIEluaXRpYWxfUHVuY3R1YXRpb24gUGkgTGV0dGVyIEwgTGV0dGVyX051bWJlciBObCBMaW5lX1NlcGFyYXRvciBabCBMb3dlcmNhc2VfTGV0dGVyIExsIE1hcmsgTSBDb21iaW5pbmdfTWFyayBNYXRoX1N5bWJvbCBTbSBNb2RpZmllcl9MZXR0ZXIgTG0gTW9kaWZpZXJfU3ltYm9sIFNrIE5vbnNwYWNpbmdfTWFyayBNbiBOdW1iZXIgTiBPcGVuX1B1bmN0dWF0aW9uIFBzIE90aGVyIEMgT3RoZXJfTGV0dGVyIExvIE90aGVyX051bWJlciBObyBPdGhlcl9QdW5jdHVhdGlvbiBQbyBPdGhlcl9TeW1ib2wgU28gUGFyYWdyYXBoX1NlcGFyYXRvciBacCBQcml2YXRlX1VzZSBDbyBQdW5jdHVhdGlvbiBQIHB1bmN0IFNlcGFyYXRvciBaIFNwYWNlX1NlcGFyYXRvciBacyBTcGFjaW5nX01hcmsgTWMgU3Vycm9nYXRlIENzIFN5bWJvbCBTIFRpdGxlY2FzZV9MZXR0ZXIgTHQgVW5hc3NpZ25lZCBDbiBVcHBlcmNhc2VfTGV0dGVyIEx1XCI7XG5cbi8vICN0YWJsZS11bmljb2RlLXNjcmlwdC12YWx1ZXNcbnZhciBlY21hOVNjcmlwdFZhbHVlcyA9IFwiQWRsYW0gQWRsbSBBaG9tIEFuYXRvbGlhbl9IaWVyb2dseXBocyBIbHV3IEFyYWJpYyBBcmFiIEFybWVuaWFuIEFybW4gQXZlc3RhbiBBdnN0IEJhbGluZXNlIEJhbGkgQmFtdW0gQmFtdSBCYXNzYV9WYWggQmFzcyBCYXRhayBCYXRrIEJlbmdhbGkgQmVuZyBCaGFpa3N1a2kgQmhrcyBCb3BvbW9mbyBCb3BvIEJyYWhtaSBCcmFoIEJyYWlsbGUgQnJhaSBCdWdpbmVzZSBCdWdpIEJ1aGlkIEJ1aGQgQ2FuYWRpYW5fQWJvcmlnaW5hbCBDYW5zIENhcmlhbiBDYXJpIENhdWNhc2lhbl9BbGJhbmlhbiBBZ2hiIENoYWttYSBDYWttIENoYW0gQ2hhbSBDaGVyb2tlZSBDaGVyIENvbW1vbiBaeXl5IENvcHRpYyBDb3B0IFFhYWMgQ3VuZWlmb3JtIFhzdXggQ3lwcmlvdCBDcHJ0IEN5cmlsbGljIEN5cmwgRGVzZXJldCBEc3J0IERldmFuYWdhcmkgRGV2YSBEdXBsb3lhbiBEdXBsIEVneXB0aWFuX0hpZXJvZ2x5cGhzIEVneXAgRWxiYXNhbiBFbGJhIEV0aGlvcGljIEV0aGkgR2VvcmdpYW4gR2VvciBHbGFnb2xpdGljIEdsYWcgR290aGljIEdvdGggR3JhbnRoYSBHcmFuIEdyZWVrIEdyZWsgR3VqYXJhdGkgR3VqciBHdXJtdWtoaSBHdXJ1IEhhbiBIYW5pIEhhbmd1bCBIYW5nIEhhbnVub28gSGFubyBIYXRyYW4gSGF0ciBIZWJyZXcgSGViciBIaXJhZ2FuYSBIaXJhIEltcGVyaWFsX0FyYW1haWMgQXJtaSBJbmhlcml0ZWQgWmluaCBRYWFpIEluc2NyaXB0aW9uYWxfUGFobGF2aSBQaGxpIEluc2NyaXB0aW9uYWxfUGFydGhpYW4gUHJ0aSBKYXZhbmVzZSBKYXZhIEthaXRoaSBLdGhpIEthbm5hZGEgS25kYSBLYXRha2FuYSBLYW5hIEtheWFoX0xpIEthbGkgS2hhcm9zaHRoaSBLaGFyIEtobWVyIEtobXIgS2hvamtpIEtob2ogS2h1ZGF3YWRpIFNpbmQgTGFvIExhb28gTGF0aW4gTGF0biBMZXBjaGEgTGVwYyBMaW1idSBMaW1iIExpbmVhcl9BIExpbmEgTGluZWFyX0IgTGluYiBMaXN1IExpc3UgTHljaWFuIEx5Y2kgTHlkaWFuIEx5ZGkgTWFoYWphbmkgTWFoaiBNYWxheWFsYW0gTWx5bSBNYW5kYWljIE1hbmQgTWFuaWNoYWVhbiBNYW5pIE1hcmNoZW4gTWFyYyBNYXNhcmFtX0dvbmRpIEdvbm0gTWVldGVpX01heWVrIE10ZWkgTWVuZGVfS2lrYWt1aSBNZW5kIE1lcm9pdGljX0N1cnNpdmUgTWVyYyBNZXJvaXRpY19IaWVyb2dseXBocyBNZXJvIE1pYW8gUGxyZCBNb2RpIE1vbmdvbGlhbiBNb25nIE1ybyBNcm9vIE11bHRhbmkgTXVsdCBNeWFubWFyIE15bXIgTmFiYXRhZWFuIE5iYXQgTmV3X1RhaV9MdWUgVGFsdSBOZXdhIE5ld2EgTmtvIE5rb28gTnVzaHUgTnNodSBPZ2hhbSBPZ2FtIE9sX0NoaWtpIE9sY2sgT2xkX0h1bmdhcmlhbiBIdW5nIE9sZF9JdGFsaWMgSXRhbCBPbGRfTm9ydGhfQXJhYmlhbiBOYXJiIE9sZF9QZXJtaWMgUGVybSBPbGRfUGVyc2lhbiBYcGVvIE9sZF9Tb3V0aF9BcmFiaWFuIFNhcmIgT2xkX1R1cmtpYyBPcmtoIE9yaXlhIE9yeWEgT3NhZ2UgT3NnZSBPc21hbnlhIE9zbWEgUGFoYXdoX0htb25nIEhtbmcgUGFsbXlyZW5lIFBhbG0gUGF1X0Npbl9IYXUgUGF1YyBQaGFnc19QYSBQaGFnIFBob2VuaWNpYW4gUGhueCBQc2FsdGVyX1BhaGxhdmkgUGhscCBSZWphbmcgUmpuZyBSdW5pYyBSdW5yIFNhbWFyaXRhbiBTYW1yIFNhdXJhc2h0cmEgU2F1ciBTaGFyYWRhIFNocmQgU2hhdmlhbiBTaGF3IFNpZGRoYW0gU2lkZCBTaWduV3JpdGluZyBTZ253IFNpbmhhbGEgU2luaCBTb3JhX1NvbXBlbmcgU29yYSBTb3lvbWJvIFNveW8gU3VuZGFuZXNlIFN1bmQgU3lsb3RpX05hZ3JpIFN5bG8gU3lyaWFjIFN5cmMgVGFnYWxvZyBUZ2xnIFRhZ2JhbndhIFRhZ2IgVGFpX0xlIFRhbGUgVGFpX1RoYW0gTGFuYSBUYWlfVmlldCBUYXZ0IFRha3JpIFRha3IgVGFtaWwgVGFtbCBUYW5ndXQgVGFuZyBUZWx1Z3UgVGVsdSBUaGFhbmEgVGhhYSBUaGFpIFRoYWkgVGliZXRhbiBUaWJ0IFRpZmluYWdoIFRmbmcgVGlyaHV0YSBUaXJoIFVnYXJpdGljIFVnYXIgVmFpIFZhaWkgV2FyYW5nX0NpdGkgV2FyYSBZaSBZaWlpIFphbmFiYXphcl9TcXVhcmUgWmFuYlwiO1xudmFyIGVjbWExMFNjcmlwdFZhbHVlcyA9IGVjbWE5U2NyaXB0VmFsdWVzICsgXCIgRG9ncmEgRG9nciBHdW5qYWxhX0dvbmRpIEdvbmcgSGFuaWZpX1JvaGluZ3lhIFJvaGcgTWFrYXNhciBNYWthIE1lZGVmYWlkcmluIE1lZGYgT2xkX1NvZ2RpYW4gU29nbyBTb2dkaWFuIFNvZ2RcIjtcbnZhciBlY21hMTFTY3JpcHRWYWx1ZXMgPSBlY21hMTBTY3JpcHRWYWx1ZXMgKyBcIiBFbHltYWljIEVseW0gTmFuZGluYWdhcmkgTmFuZCBOeWlha2VuZ19QdWFjaHVlX0htb25nIEhtbnAgV2FuY2hvIFdjaG9cIjtcbnZhciBlY21hMTJTY3JpcHRWYWx1ZXMgPSBlY21hMTFTY3JpcHRWYWx1ZXMgKyBcIiBDaG9yYXNtaWFuIENocnMgRGlhayBEaXZlc19Ba3VydSBLaGl0YW5fU21hbGxfU2NyaXB0IEtpdHMgWWV6aSBZZXppZGlcIjtcbnZhciBlY21hMTNTY3JpcHRWYWx1ZXMgPSBlY21hMTJTY3JpcHRWYWx1ZXMgKyBcIiBDeXByb19NaW5vYW4gQ3BtbiBPbGRfVXlnaHVyIE91Z3IgVGFuZ3NhIFRuc2EgVG90byBWaXRoa3VxaSBWaXRoXCI7XG52YXIgZWNtYTE0U2NyaXB0VmFsdWVzID0gZWNtYTEzU2NyaXB0VmFsdWVzICsgXCIgXCIgKyBzY3JpcHRWYWx1ZXNBZGRlZEluVW5pY29kZTtcblxudmFyIHVuaWNvZGVTY3JpcHRWYWx1ZXMgPSB7XG4gIDk6IGVjbWE5U2NyaXB0VmFsdWVzLFxuICAxMDogZWNtYTEwU2NyaXB0VmFsdWVzLFxuICAxMTogZWNtYTExU2NyaXB0VmFsdWVzLFxuICAxMjogZWNtYTEyU2NyaXB0VmFsdWVzLFxuICAxMzogZWNtYTEzU2NyaXB0VmFsdWVzLFxuICAxNDogZWNtYTE0U2NyaXB0VmFsdWVzXG59O1xuXG52YXIgZGF0YSA9IHt9O1xuZnVuY3Rpb24gYnVpbGRVbmljb2RlRGF0YShlY21hVmVyc2lvbikge1xuICB2YXIgZCA9IGRhdGFbZWNtYVZlcnNpb25dID0ge1xuICAgIGJpbmFyeTogd29yZHNSZWdleHAodW5pY29kZUJpbmFyeVByb3BlcnRpZXNbZWNtYVZlcnNpb25dICsgXCIgXCIgKyB1bmljb2RlR2VuZXJhbENhdGVnb3J5VmFsdWVzKSxcbiAgICBiaW5hcnlPZlN0cmluZ3M6IHdvcmRzUmVnZXhwKHVuaWNvZGVCaW5hcnlQcm9wZXJ0aWVzT2ZTdHJpbmdzW2VjbWFWZXJzaW9uXSksXG4gICAgbm9uQmluYXJ5OiB7XG4gICAgICBHZW5lcmFsX0NhdGVnb3J5OiB3b3Jkc1JlZ2V4cCh1bmljb2RlR2VuZXJhbENhdGVnb3J5VmFsdWVzKSxcbiAgICAgIFNjcmlwdDogd29yZHNSZWdleHAodW5pY29kZVNjcmlwdFZhbHVlc1tlY21hVmVyc2lvbl0pXG4gICAgfVxuICB9O1xuICBkLm5vbkJpbmFyeS5TY3JpcHRfRXh0ZW5zaW9ucyA9IGQubm9uQmluYXJ5LlNjcmlwdDtcblxuICBkLm5vbkJpbmFyeS5nYyA9IGQubm9uQmluYXJ5LkdlbmVyYWxfQ2F0ZWdvcnk7XG4gIGQubm9uQmluYXJ5LnNjID0gZC5ub25CaW5hcnkuU2NyaXB0O1xuICBkLm5vbkJpbmFyeS5zY3ggPSBkLm5vbkJpbmFyeS5TY3JpcHRfRXh0ZW5zaW9ucztcbn1cblxuZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBbOSwgMTAsIDExLCAxMiwgMTMsIDE0XTsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgdmFyIGVjbWFWZXJzaW9uID0gbGlzdFtpXTtcblxuICBidWlsZFVuaWNvZGVEYXRhKGVjbWFWZXJzaW9uKTtcbn1cblxudmFyIHBwJDEgPSBQYXJzZXIucHJvdG90eXBlO1xuXG4vLyBUcmFjayBkaXNqdW5jdGlvbiBzdHJ1Y3R1cmUgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBkdXBsaWNhdGVcbi8vIGNhcHR1cmUgZ3JvdXAgbmFtZSBpcyBhbGxvd2VkIGJlY2F1c2UgaXQgaXMgaW4gYSBzZXBhcmF0ZSBicmFuY2guXG52YXIgQnJhbmNoSUQgPSBmdW5jdGlvbiBCcmFuY2hJRChwYXJlbnQsIGJhc2UpIHtcbiAgLy8gUGFyZW50IGRpc2p1bmN0aW9uIGJyYW5jaFxuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgLy8gSWRlbnRpZmllcyB0aGlzIHNldCBvZiBzaWJsaW5nIGJyYW5jaGVzXG4gIHRoaXMuYmFzZSA9IGJhc2UgfHwgdGhpcztcbn07XG5cbkJyYW5jaElELnByb3RvdHlwZS5zZXBhcmF0ZWRGcm9tID0gZnVuY3Rpb24gc2VwYXJhdGVkRnJvbSAoYWx0KSB7XG4gIC8vIEEgYnJhbmNoIGlzIHNlcGFyYXRlIGZyb20gYW5vdGhlciBicmFuY2ggaWYgdGhleSBvciBhbnkgb2ZcbiAgLy8gdGhlaXIgcGFyZW50cyBhcmUgc2libGluZ3MgaW4gYSBnaXZlbiBkaXNqdW5jdGlvblxuICBmb3IgKHZhciBzZWxmID0gdGhpczsgc2VsZjsgc2VsZiA9IHNlbGYucGFyZW50KSB7XG4gICAgZm9yICh2YXIgb3RoZXIgPSBhbHQ7IG90aGVyOyBvdGhlciA9IG90aGVyLnBhcmVudCkge1xuICAgICAgaWYgKHNlbGYuYmFzZSA9PT0gb3RoZXIuYmFzZSAmJiBzZWxmICE9PSBvdGhlcikgeyByZXR1cm4gdHJ1ZSB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuQnJhbmNoSUQucHJvdG90eXBlLnNpYmxpbmcgPSBmdW5jdGlvbiBzaWJsaW5nICgpIHtcbiAgcmV0dXJuIG5ldyBCcmFuY2hJRCh0aGlzLnBhcmVudCwgdGhpcy5iYXNlKVxufTtcblxudmFyIFJlZ0V4cFZhbGlkYXRpb25TdGF0ZSA9IGZ1bmN0aW9uIFJlZ0V4cFZhbGlkYXRpb25TdGF0ZShwYXJzZXIpIHtcbiAgdGhpcy5wYXJzZXIgPSBwYXJzZXI7XG4gIHRoaXMudmFsaWRGbGFncyA9IFwiZ2ltXCIgKyAocGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiA/IFwidXlcIiA6IFwiXCIpICsgKHBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgPyBcInNcIiA6IFwiXCIpICsgKHBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDEzID8gXCJkXCIgOiBcIlwiKSArIChwYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNSA/IFwidlwiIDogXCJcIik7XG4gIHRoaXMudW5pY29kZVByb3BlcnRpZXMgPSBkYXRhW3BhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE0ID8gMTQgOiBwYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbl07XG4gIHRoaXMuc291cmNlID0gXCJcIjtcbiAgdGhpcy5mbGFncyA9IFwiXCI7XG4gIHRoaXMuc3RhcnQgPSAwO1xuICB0aGlzLnN3aXRjaFUgPSBmYWxzZTtcbiAgdGhpcy5zd2l0Y2hWID0gZmFsc2U7XG4gIHRoaXMuc3dpdGNoTiA9IGZhbHNlO1xuICB0aGlzLnBvcyA9IDA7XG4gIHRoaXMubGFzdEludFZhbHVlID0gMDtcbiAgdGhpcy5sYXN0U3RyaW5nVmFsdWUgPSBcIlwiO1xuICB0aGlzLmxhc3RBc3NlcnRpb25Jc1F1YW50aWZpYWJsZSA9IGZhbHNlO1xuICB0aGlzLm51bUNhcHR1cmluZ1BhcmVucyA9IDA7XG4gIHRoaXMubWF4QmFja1JlZmVyZW5jZSA9IDA7XG4gIHRoaXMuZ3JvdXBOYW1lcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHRoaXMuYmFja1JlZmVyZW5jZU5hbWVzID0gW107XG4gIHRoaXMuYnJhbmNoSUQgPSBudWxsO1xufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIHJlc2V0IChzdGFydCwgcGF0dGVybiwgZmxhZ3MpIHtcbiAgdmFyIHVuaWNvZGVTZXRzID0gZmxhZ3MuaW5kZXhPZihcInZcIikgIT09IC0xO1xuICB2YXIgdW5pY29kZSA9IGZsYWdzLmluZGV4T2YoXCJ1XCIpICE9PSAtMTtcbiAgdGhpcy5zdGFydCA9IHN0YXJ0IHwgMDtcbiAgdGhpcy5zb3VyY2UgPSBwYXR0ZXJuICsgXCJcIjtcbiAgdGhpcy5mbGFncyA9IGZsYWdzO1xuICBpZiAodW5pY29kZVNldHMgJiYgdGhpcy5wYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNSkge1xuICAgIHRoaXMuc3dpdGNoVSA9IHRydWU7XG4gICAgdGhpcy5zd2l0Y2hWID0gdHJ1ZTtcbiAgICB0aGlzLnN3aXRjaE4gPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuc3dpdGNoVSA9IHVuaWNvZGUgJiYgdGhpcy5wYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2O1xuICAgIHRoaXMuc3dpdGNoViA9IGZhbHNlO1xuICAgIHRoaXMuc3dpdGNoTiA9IHVuaWNvZGUgJiYgdGhpcy5wYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5O1xuICB9XG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLnJhaXNlID0gZnVuY3Rpb24gcmFpc2UgKG1lc3NhZ2UpIHtcbiAgdGhpcy5wYXJzZXIucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCAoXCJJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbjogL1wiICsgKHRoaXMuc291cmNlKSArIFwiLzogXCIgKyBtZXNzYWdlKSk7XG59O1xuXG4vLyBJZiB1IGZsYWcgaXMgZ2l2ZW4sIHRoaXMgcmV0dXJucyB0aGUgY29kZSBwb2ludCBhdCB0aGUgaW5kZXggKGl0IGNvbWJpbmVzIGEgc3Vycm9nYXRlIHBhaXIpLlxuLy8gT3RoZXJ3aXNlLCB0aGlzIHJldHVybnMgdGhlIGNvZGUgdW5pdCBvZiB0aGUgaW5kZXggKGNhbiBiZSBhIHBhcnQgb2YgYSBzdXJyb2dhdGUgcGFpcikuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLmF0ID0gZnVuY3Rpb24gYXQgKGksIGZvcmNlVSkge1xuICAgIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICB2YXIgcyA9IHRoaXMuc291cmNlO1xuICB2YXIgbCA9IHMubGVuZ3RoO1xuICBpZiAoaSA+PSBsKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgdmFyIGMgPSBzLmNoYXJDb2RlQXQoaSk7XG4gIGlmICghKGZvcmNlVSB8fCB0aGlzLnN3aXRjaFUpIHx8IGMgPD0gMHhEN0ZGIHx8IGMgPj0gMHhFMDAwIHx8IGkgKyAxID49IGwpIHtcbiAgICByZXR1cm4gY1xuICB9XG4gIHZhciBuZXh0ID0gcy5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgcmV0dXJuIG5leHQgPj0gMHhEQzAwICYmIG5leHQgPD0gMHhERkZGID8gKGMgPDwgMTApICsgbmV4dCAtIDB4MzVGREMwMCA6IGNcbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUubmV4dEluZGV4ID0gZnVuY3Rpb24gbmV4dEluZGV4IChpLCBmb3JjZVUpIHtcbiAgICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgdmFyIHMgPSB0aGlzLnNvdXJjZTtcbiAgdmFyIGwgPSBzLmxlbmd0aDtcbiAgaWYgKGkgPj0gbCkge1xuICAgIHJldHVybiBsXG4gIH1cbiAgdmFyIGMgPSBzLmNoYXJDb2RlQXQoaSksIG5leHQ7XG4gIGlmICghKGZvcmNlVSB8fCB0aGlzLnN3aXRjaFUpIHx8IGMgPD0gMHhEN0ZGIHx8IGMgPj0gMHhFMDAwIHx8IGkgKyAxID49IGwgfHxcbiAgICAgIChuZXh0ID0gcy5jaGFyQ29kZUF0KGkgKyAxKSkgPCAweERDMDAgfHwgbmV4dCA+IDB4REZGRikge1xuICAgIHJldHVybiBpICsgMVxuICB9XG4gIHJldHVybiBpICsgMlxufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5jdXJyZW50ID0gZnVuY3Rpb24gY3VycmVudCAoZm9yY2VVKSB7XG4gICAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIHJldHVybiB0aGlzLmF0KHRoaXMucG9zLCBmb3JjZVUpXG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLmxvb2thaGVhZCA9IGZ1bmN0aW9uIGxvb2thaGVhZCAoZm9yY2VVKSB7XG4gICAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIHJldHVybiB0aGlzLmF0KHRoaXMubmV4dEluZGV4KHRoaXMucG9zLCBmb3JjZVUpLCBmb3JjZVUpXG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLmFkdmFuY2UgPSBmdW5jdGlvbiBhZHZhbmNlIChmb3JjZVUpIHtcbiAgICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgdGhpcy5wb3MgPSB0aGlzLm5leHRJbmRleCh0aGlzLnBvcywgZm9yY2VVKTtcbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUuZWF0ID0gZnVuY3Rpb24gZWF0IChjaCwgZm9yY2VVKSB7XG4gICAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIGlmICh0aGlzLmN1cnJlbnQoZm9yY2VVKSA9PT0gY2gpIHtcbiAgICB0aGlzLmFkdmFuY2UoZm9yY2VVKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5lYXRDaGFycyA9IGZ1bmN0aW9uIGVhdENoYXJzIChjaHMsIGZvcmNlVSkge1xuICAgIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICB2YXIgcG9zID0gdGhpcy5wb3M7XG4gIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gY2hzOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBjaCA9IGxpc3RbaV07XG5cbiAgICAgIHZhciBjdXJyZW50ID0gdGhpcy5hdChwb3MsIGZvcmNlVSk7XG4gICAgaWYgKGN1cnJlbnQgPT09IC0xIHx8IGN1cnJlbnQgIT09IGNoKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgcG9zID0gdGhpcy5uZXh0SW5kZXgocG9zLCBmb3JjZVUpO1xuICB9XG4gIHRoaXMucG9zID0gcG9zO1xuICByZXR1cm4gdHJ1ZVxufTtcblxuLyoqXG4gKiBWYWxpZGF0ZSB0aGUgZmxhZ3MgcGFydCBvZiBhIGdpdmVuIFJlZ0V4cExpdGVyYWwuXG4gKlxuICogQHBhcmFtIHtSZWdFeHBWYWxpZGF0aW9uU3RhdGV9IHN0YXRlIFRoZSBzdGF0ZSB0byB2YWxpZGF0ZSBSZWdFeHAuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xucHAkMS52YWxpZGF0ZVJlZ0V4cEZsYWdzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHZhbGlkRmxhZ3MgPSBzdGF0ZS52YWxpZEZsYWdzO1xuICB2YXIgZmxhZ3MgPSBzdGF0ZS5mbGFncztcblxuICB2YXIgdSA9IGZhbHNlO1xuICB2YXIgdiA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZmxhZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZmxhZyA9IGZsYWdzLmNoYXJBdChpKTtcbiAgICBpZiAodmFsaWRGbGFncy5pbmRleE9mKGZsYWcpID09PSAtMSkge1xuICAgICAgdGhpcy5yYWlzZShzdGF0ZS5zdGFydCwgXCJJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbiBmbGFnXCIpO1xuICAgIH1cbiAgICBpZiAoZmxhZ3MuaW5kZXhPZihmbGFnLCBpICsgMSkgPiAtMSkge1xuICAgICAgdGhpcy5yYWlzZShzdGF0ZS5zdGFydCwgXCJEdXBsaWNhdGUgcmVndWxhciBleHByZXNzaW9uIGZsYWdcIik7XG4gICAgfVxuICAgIGlmIChmbGFnID09PSBcInVcIikgeyB1ID0gdHJ1ZTsgfVxuICAgIGlmIChmbGFnID09PSBcInZcIikgeyB2ID0gdHJ1ZTsgfVxuICB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTUgJiYgdSAmJiB2KSB7XG4gICAgdGhpcy5yYWlzZShzdGF0ZS5zdGFydCwgXCJJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbiBmbGFnXCIpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBoYXNQcm9wKG9iaikge1xuICBmb3IgKHZhciBfIGluIG9iaikgeyByZXR1cm4gdHJ1ZSB9XG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFZhbGlkYXRlIHRoZSBwYXR0ZXJuIHBhcnQgb2YgYSBnaXZlbiBSZWdFeHBMaXRlcmFsLlxuICpcbiAqIEBwYXJhbSB7UmVnRXhwVmFsaWRhdGlvblN0YXRlfSBzdGF0ZSBUaGUgc3RhdGUgdG8gdmFsaWRhdGUgUmVnRXhwLlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbnBwJDEudmFsaWRhdGVSZWdFeHBQYXR0ZXJuID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdGhpcy5yZWdleHBfcGF0dGVybihzdGF0ZSk7XG5cbiAgLy8gVGhlIGdvYWwgc3ltYm9sIGZvciB0aGUgcGFyc2UgaXMgfFBhdHRlcm5bflUsIH5OXXwuIElmIHRoZSByZXN1bHQgb2ZcbiAgLy8gcGFyc2luZyBjb250YWlucyBhIHxHcm91cE5hbWV8LCByZXBhcnNlIHdpdGggdGhlIGdvYWwgc3ltYm9sXG4gIC8vIHxQYXR0ZXJuW35VLCArTl18IGFuZCB1c2UgdGhpcyByZXN1bHQgaW5zdGVhZC4gVGhyb3cgYSAqU3ludGF4RXJyb3IqXG4gIC8vIGV4Y2VwdGlvbiBpZiBfUF8gZGlkIG5vdCBjb25mb3JtIHRvIHRoZSBncmFtbWFyLCBpZiBhbnkgZWxlbWVudHMgb2YgX1BfXG4gIC8vIHdlcmUgbm90IG1hdGNoZWQgYnkgdGhlIHBhcnNlLCBvciBpZiBhbnkgRWFybHkgRXJyb3IgY29uZGl0aW9ucyBleGlzdC5cbiAgaWYgKCFzdGF0ZS5zd2l0Y2hOICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ICYmIGhhc1Byb3Aoc3RhdGUuZ3JvdXBOYW1lcykpIHtcbiAgICBzdGF0ZS5zd2l0Y2hOID0gdHJ1ZTtcbiAgICB0aGlzLnJlZ2V4cF9wYXR0ZXJuKHN0YXRlKTtcbiAgfVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtUGF0dGVyblxucHAkMS5yZWdleHBfcGF0dGVybiA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHN0YXRlLnBvcyA9IDA7XG4gIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDA7XG4gIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSA9IFwiXCI7XG4gIHN0YXRlLmxhc3RBc3NlcnRpb25Jc1F1YW50aWZpYWJsZSA9IGZhbHNlO1xuICBzdGF0ZS5udW1DYXB0dXJpbmdQYXJlbnMgPSAwO1xuICBzdGF0ZS5tYXhCYWNrUmVmZXJlbmNlID0gMDtcbiAgc3RhdGUuZ3JvdXBOYW1lcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHN0YXRlLmJhY2tSZWZlcmVuY2VOYW1lcy5sZW5ndGggPSAwO1xuICBzdGF0ZS5icmFuY2hJRCA9IG51bGw7XG5cbiAgdGhpcy5yZWdleHBfZGlzanVuY3Rpb24oc3RhdGUpO1xuXG4gIGlmIChzdGF0ZS5wb3MgIT09IHN0YXRlLnNvdXJjZS5sZW5ndGgpIHtcbiAgICAvLyBNYWtlIHRoZSBzYW1lIG1lc3NhZ2VzIGFzIFY4LlxuICAgIGlmIChzdGF0ZS5lYXQoMHgyOSAvKiApICovKSkge1xuICAgICAgc3RhdGUucmFpc2UoXCJVbm1hdGNoZWQgJyknXCIpO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuZWF0KDB4NUQgLyogXSAqLykgfHwgc3RhdGUuZWF0KDB4N0QgLyogfSAqLykpIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiTG9uZSBxdWFudGlmaWVyIGJyYWNrZXRzXCIpO1xuICAgIH1cbiAgfVxuICBpZiAoc3RhdGUubWF4QmFja1JlZmVyZW5jZSA+IHN0YXRlLm51bUNhcHR1cmluZ1BhcmVucykge1xuICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBlc2NhcGVcIik7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBzdGF0ZS5iYWNrUmVmZXJlbmNlTmFtZXM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIG5hbWUgPSBsaXN0W2ldO1xuXG4gICAgaWYgKCFzdGF0ZS5ncm91cE5hbWVzW25hbWVdKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgbmFtZWQgY2FwdHVyZSByZWZlcmVuY2VkXCIpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtRGlzanVuY3Rpb25cbnBwJDEucmVnZXhwX2Rpc2p1bmN0aW9uID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHRyYWNrRGlzanVuY3Rpb24gPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTY7XG4gIGlmICh0cmFja0Rpc2p1bmN0aW9uKSB7IHN0YXRlLmJyYW5jaElEID0gbmV3IEJyYW5jaElEKHN0YXRlLmJyYW5jaElELCBudWxsKTsgfVxuICB0aGlzLnJlZ2V4cF9hbHRlcm5hdGl2ZShzdGF0ZSk7XG4gIHdoaWxlIChzdGF0ZS5lYXQoMHg3QyAvKiB8ICovKSkge1xuICAgIGlmICh0cmFja0Rpc2p1bmN0aW9uKSB7IHN0YXRlLmJyYW5jaElEID0gc3RhdGUuYnJhbmNoSUQuc2libGluZygpOyB9XG4gICAgdGhpcy5yZWdleHBfYWx0ZXJuYXRpdmUoc3RhdGUpO1xuICB9XG4gIGlmICh0cmFja0Rpc2p1bmN0aW9uKSB7IHN0YXRlLmJyYW5jaElEID0gc3RhdGUuYnJhbmNoSUQucGFyZW50OyB9XG5cbiAgLy8gTWFrZSB0aGUgc2FtZSBtZXNzYWdlIGFzIFY4LlxuICBpZiAodGhpcy5yZWdleHBfZWF0UXVhbnRpZmllcihzdGF0ZSwgdHJ1ZSkpIHtcbiAgICBzdGF0ZS5yYWlzZShcIk5vdGhpbmcgdG8gcmVwZWF0XCIpO1xuICB9XG4gIGlmIChzdGF0ZS5lYXQoMHg3QiAvKiB7ICovKSkge1xuICAgIHN0YXRlLnJhaXNlKFwiTG9uZSBxdWFudGlmaWVyIGJyYWNrZXRzXCIpO1xuICB9XG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1BbHRlcm5hdGl2ZVxucHAkMS5yZWdleHBfYWx0ZXJuYXRpdmUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB3aGlsZSAoc3RhdGUucG9zIDwgc3RhdGUuc291cmNlLmxlbmd0aCAmJiB0aGlzLnJlZ2V4cF9lYXRUZXJtKHN0YXRlKSkge31cbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1UZXJtXG5wcCQxLnJlZ2V4cF9lYXRUZXJtID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHRoaXMucmVnZXhwX2VhdEFzc2VydGlvbihzdGF0ZSkpIHtcbiAgICAvLyBIYW5kbGUgYFF1YW50aWZpYWJsZUFzc2VydGlvbiBRdWFudGlmaWVyYCBhbHRlcm5hdGl2ZS5cbiAgICAvLyBgc3RhdGUubGFzdEFzc2VydGlvbklzUXVhbnRpZmlhYmxlYCBpcyB0cnVlIGlmIHRoZSBsYXN0IGVhdGVuIEFzc2VydGlvblxuICAgIC8vIGlzIGEgUXVhbnRpZmlhYmxlQXNzZXJ0aW9uLlxuICAgIGlmIChzdGF0ZS5sYXN0QXNzZXJ0aW9uSXNRdWFudGlmaWFibGUgJiYgdGhpcy5yZWdleHBfZWF0UXVhbnRpZmllcihzdGF0ZSkpIHtcbiAgICAgIC8vIE1ha2UgdGhlIHNhbWUgbWVzc2FnZSBhcyBWOC5cbiAgICAgIGlmIChzdGF0ZS5zd2l0Y2hVKSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBxdWFudGlmaWVyXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaWYgKHN0YXRlLnN3aXRjaFUgPyB0aGlzLnJlZ2V4cF9lYXRBdG9tKHN0YXRlKSA6IHRoaXMucmVnZXhwX2VhdEV4dGVuZGVkQXRvbShzdGF0ZSkpIHtcbiAgICB0aGlzLnJlZ2V4cF9lYXRRdWFudGlmaWVyKHN0YXRlKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItQXNzZXJ0aW9uXG5wcCQxLnJlZ2V4cF9lYXRBc3NlcnRpb24gPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHN0YXRlLmxhc3RBc3NlcnRpb25Jc1F1YW50aWZpYWJsZSA9IGZhbHNlO1xuXG4gIC8vIF4sICRcbiAgaWYgKHN0YXRlLmVhdCgweDVFIC8qIF4gKi8pIHx8IHN0YXRlLmVhdCgweDI0IC8qICQgKi8pKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIC8vIFxcYiBcXEJcbiAgaWYgKHN0YXRlLmVhdCgweDVDIC8qIFxcICovKSkge1xuICAgIGlmIChzdGF0ZS5lYXQoMHg0MiAvKiBCICovKSB8fCBzdGF0ZS5lYXQoMHg2MiAvKiBiICovKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cblxuICAvLyBMb29rYWhlYWQgLyBMb29rYmVoaW5kXG4gIGlmIChzdGF0ZS5lYXQoMHgyOCAvKiAoICovKSAmJiBzdGF0ZS5lYXQoMHgzRiAvKiA/ICovKSkge1xuICAgIHZhciBsb29rYmVoaW5kID0gZmFsc2U7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5KSB7XG4gICAgICBsb29rYmVoaW5kID0gc3RhdGUuZWF0KDB4M0MgLyogPCAqLyk7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5lYXQoMHgzRCAvKiA9ICovKSB8fCBzdGF0ZS5lYXQoMHgyMSAvKiAhICovKSkge1xuICAgICAgdGhpcy5yZWdleHBfZGlzanVuY3Rpb24oc3RhdGUpO1xuICAgICAgaWYgKCFzdGF0ZS5lYXQoMHgyOSAvKiApICovKSkge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIlVudGVybWluYXRlZCBncm91cFwiKTtcbiAgICAgIH1cbiAgICAgIHN0YXRlLmxhc3RBc3NlcnRpb25Jc1F1YW50aWZpYWJsZSA9ICFsb29rYmVoaW5kO1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cblxuICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1RdWFudGlmaWVyXG5wcCQxLnJlZ2V4cF9lYXRRdWFudGlmaWVyID0gZnVuY3Rpb24oc3RhdGUsIG5vRXJyb3IpIHtcbiAgaWYgKCBub0Vycm9yID09PSB2b2lkIDAgKSBub0Vycm9yID0gZmFsc2U7XG5cbiAgaWYgKHRoaXMucmVnZXhwX2VhdFF1YW50aWZpZXJQcmVmaXgoc3RhdGUsIG5vRXJyb3IpKSB7XG4gICAgc3RhdGUuZWF0KDB4M0YgLyogPyAqLyk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLVF1YW50aWZpZXJQcmVmaXhcbnBwJDEucmVnZXhwX2VhdFF1YW50aWZpZXJQcmVmaXggPSBmdW5jdGlvbihzdGF0ZSwgbm9FcnJvcikge1xuICByZXR1cm4gKFxuICAgIHN0YXRlLmVhdCgweDJBIC8qICogKi8pIHx8XG4gICAgc3RhdGUuZWF0KDB4MkIgLyogKyAqLykgfHxcbiAgICBzdGF0ZS5lYXQoMHgzRiAvKiA/ICovKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdEJyYWNlZFF1YW50aWZpZXIoc3RhdGUsIG5vRXJyb3IpXG4gIClcbn07XG5wcCQxLnJlZ2V4cF9lYXRCcmFjZWRRdWFudGlmaWVyID0gZnVuY3Rpb24oc3RhdGUsIG5vRXJyb3IpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0KDB4N0IgLyogeyAqLykpIHtcbiAgICB2YXIgbWluID0gMCwgbWF4ID0gLTE7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdERlY2ltYWxEaWdpdHMoc3RhdGUpKSB7XG4gICAgICBtaW4gPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICBpZiAoc3RhdGUuZWF0KDB4MkMgLyogLCAqLykgJiYgdGhpcy5yZWdleHBfZWF0RGVjaW1hbERpZ2l0cyhzdGF0ZSkpIHtcbiAgICAgICAgbWF4ID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRlLmVhdCgweDdEIC8qIH0gKi8pKSB7XG4gICAgICAgIC8vIFN5bnRheEVycm9yIGluIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNzZWMtdGVybVxuICAgICAgICBpZiAobWF4ICE9PSAtMSAmJiBtYXggPCBtaW4gJiYgIW5vRXJyb3IpIHtcbiAgICAgICAgICBzdGF0ZS5yYWlzZShcIm51bWJlcnMgb3V0IG9mIG9yZGVyIGluIHt9IHF1YW50aWZpZXJcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHN0YXRlLnN3aXRjaFUgJiYgIW5vRXJyb3IpIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiSW5jb21wbGV0ZSBxdWFudGlmaWVyXCIpO1xuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUF0b21cbnBwJDEucmVnZXhwX2VhdEF0b20gPSBmdW5jdGlvbihzdGF0ZSkge1xuICByZXR1cm4gKFxuICAgIHRoaXMucmVnZXhwX2VhdFBhdHRlcm5DaGFyYWN0ZXJzKHN0YXRlKSB8fFxuICAgIHN0YXRlLmVhdCgweDJFIC8qIC4gKi8pIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0UmV2ZXJzZVNvbGlkdXNBdG9tRXNjYXBlKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckNsYXNzKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdFVuY2FwdHVyaW5nR3JvdXAoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q2FwdHVyaW5nR3JvdXAoc3RhdGUpXG4gIClcbn07XG5wcCQxLnJlZ2V4cF9lYXRSZXZlcnNlU29saWR1c0F0b21Fc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXQoMHg1QyAvKiBcXCAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0QXRvbUVzY2FwZShzdGF0ZSkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbnBwJDEucmVnZXhwX2VhdFVuY2FwdHVyaW5nR3JvdXAgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXQoMHgyOCAvKiAoICovKSkge1xuICAgIGlmIChzdGF0ZS5lYXQoMHgzRiAvKiA/ICovKSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNikge1xuICAgICAgICB2YXIgYWRkTW9kaWZpZXJzID0gdGhpcy5yZWdleHBfZWF0TW9kaWZpZXJzKHN0YXRlKTtcbiAgICAgICAgdmFyIGhhc0h5cGhlbiA9IHN0YXRlLmVhdCgweDJEIC8qIC0gKi8pO1xuICAgICAgICBpZiAoYWRkTW9kaWZpZXJzIHx8IGhhc0h5cGhlbikge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWRkTW9kaWZpZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbW9kaWZpZXIgPSBhZGRNb2RpZmllcnMuY2hhckF0KGkpO1xuICAgICAgICAgICAgaWYgKGFkZE1vZGlmaWVycy5pbmRleE9mKG1vZGlmaWVyLCBpICsgMSkgPiAtMSkge1xuICAgICAgICAgICAgICBzdGF0ZS5yYWlzZShcIkR1cGxpY2F0ZSByZWd1bGFyIGV4cHJlc3Npb24gbW9kaWZpZXJzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGFzSHlwaGVuKSB7XG4gICAgICAgICAgICB2YXIgcmVtb3ZlTW9kaWZpZXJzID0gdGhpcy5yZWdleHBfZWF0TW9kaWZpZXJzKHN0YXRlKTtcbiAgICAgICAgICAgIGlmICghYWRkTW9kaWZpZXJzICYmICFyZW1vdmVNb2RpZmllcnMgJiYgc3RhdGUuY3VycmVudCgpID09PSAweDNBIC8qIDogKi8pIHtcbiAgICAgICAgICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbiBtb2RpZmllcnNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpJDEgPSAwOyBpJDEgPCByZW1vdmVNb2RpZmllcnMubGVuZ3RoOyBpJDErKykge1xuICAgICAgICAgICAgICB2YXIgbW9kaWZpZXIkMSA9IHJlbW92ZU1vZGlmaWVycy5jaGFyQXQoaSQxKTtcbiAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIHJlbW92ZU1vZGlmaWVycy5pbmRleE9mKG1vZGlmaWVyJDEsIGkkMSArIDEpID4gLTEgfHxcbiAgICAgICAgICAgICAgICBhZGRNb2RpZmllcnMuaW5kZXhPZihtb2RpZmllciQxKSA+IC0xXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnJhaXNlKFwiRHVwbGljYXRlIHJlZ3VsYXIgZXhwcmVzc2lvbiBtb2RpZmllcnNcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzdGF0ZS5lYXQoMHgzQSAvKiA6ICovKSkge1xuICAgICAgICB0aGlzLnJlZ2V4cF9kaXNqdW5jdGlvbihzdGF0ZSk7XG4gICAgICAgIGlmIChzdGF0ZS5lYXQoMHgyOSAvKiApICovKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUucmFpc2UoXCJVbnRlcm1pbmF0ZWQgZ3JvdXBcIik7XG4gICAgICB9XG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbnBwJDEucmVnZXhwX2VhdENhcHR1cmluZ0dyb3VwID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmVhdCgweDI4IC8qICggKi8pKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5KSB7XG4gICAgICB0aGlzLnJlZ2V4cF9ncm91cFNwZWNpZmllcihzdGF0ZSk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5jdXJyZW50KCkgPT09IDB4M0YgLyogPyAqLykge1xuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGdyb3VwXCIpO1xuICAgIH1cbiAgICB0aGlzLnJlZ2V4cF9kaXNqdW5jdGlvbihzdGF0ZSk7XG4gICAgaWYgKHN0YXRlLmVhdCgweDI5IC8qICkgKi8pKSB7XG4gICAgICBzdGF0ZS5udW1DYXB0dXJpbmdQYXJlbnMgKz0gMTtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnJhaXNlKFwiVW50ZXJtaW5hdGVkIGdyb3VwXCIpO1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbi8vIFJlZ3VsYXJFeHByZXNzaW9uTW9kaWZpZXJzIDo6XG4vLyAgIFtlbXB0eV1cbi8vICAgUmVndWxhckV4cHJlc3Npb25Nb2RpZmllcnMgUmVndWxhckV4cHJlc3Npb25Nb2RpZmllclxucHAkMS5yZWdleHBfZWF0TW9kaWZpZXJzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIG1vZGlmaWVycyA9IFwiXCI7XG4gIHZhciBjaCA9IDA7XG4gIHdoaWxlICgoY2ggPSBzdGF0ZS5jdXJyZW50KCkpICE9PSAtMSAmJiBpc1JlZ3VsYXJFeHByZXNzaW9uTW9kaWZpZXIoY2gpKSB7XG4gICAgbW9kaWZpZXJzICs9IGNvZGVQb2ludFRvU3RyaW5nKGNoKTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gIH1cbiAgcmV0dXJuIG1vZGlmaWVyc1xufTtcbi8vIFJlZ3VsYXJFeHByZXNzaW9uTW9kaWZpZXIgOjogb25lIG9mXG4vLyAgIGBpYCBgbWAgYHNgXG5mdW5jdGlvbiBpc1JlZ3VsYXJFeHByZXNzaW9uTW9kaWZpZXIoY2gpIHtcbiAgcmV0dXJuIGNoID09PSAweDY5IC8qIGkgKi8gfHwgY2ggPT09IDB4NmQgLyogbSAqLyB8fCBjaCA9PT0gMHg3MyAvKiBzICovXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1FeHRlbmRlZEF0b21cbnBwJDEucmVnZXhwX2VhdEV4dGVuZGVkQXRvbSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHJldHVybiAoXG4gICAgc3RhdGUuZWF0KDB4MkUgLyogLiAqLykgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRSZXZlcnNlU29saWR1c0F0b21Fc2NhcGUoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyQ2xhc3Moc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0VW5jYXB0dXJpbmdHcm91cChzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDYXB0dXJpbmdHcm91cChzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRJbnZhbGlkQnJhY2VkUXVhbnRpZmllcihzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRFeHRlbmRlZFBhdHRlcm5DaGFyYWN0ZXIoc3RhdGUpXG4gIClcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1JbnZhbGlkQnJhY2VkUXVhbnRpZmllclxucHAkMS5yZWdleHBfZWF0SW52YWxpZEJyYWNlZFF1YW50aWZpZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAodGhpcy5yZWdleHBfZWF0QnJhY2VkUXVhbnRpZmllcihzdGF0ZSwgdHJ1ZSkpIHtcbiAgICBzdGF0ZS5yYWlzZShcIk5vdGhpbmcgdG8gcmVwZWF0XCIpO1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtU3ludGF4Q2hhcmFjdGVyXG5wcCQxLnJlZ2V4cF9lYXRTeW50YXhDaGFyYWN0ZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChpc1N5bnRheENoYXJhY3RlcihjaCkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaDtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5mdW5jdGlvbiBpc1N5bnRheENoYXJhY3RlcihjaCkge1xuICByZXR1cm4gKFxuICAgIGNoID09PSAweDI0IC8qICQgKi8gfHxcbiAgICBjaCA+PSAweDI4IC8qICggKi8gJiYgY2ggPD0gMHgyQiAvKiArICovIHx8XG4gICAgY2ggPT09IDB4MkUgLyogLiAqLyB8fFxuICAgIGNoID09PSAweDNGIC8qID8gKi8gfHxcbiAgICBjaCA+PSAweDVCIC8qIFsgKi8gJiYgY2ggPD0gMHg1RSAvKiBeICovIHx8XG4gICAgY2ggPj0gMHg3QiAvKiB7ICovICYmIGNoIDw9IDB4N0QgLyogfSAqL1xuICApXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLVBhdHRlcm5DaGFyYWN0ZXJcbi8vIEJ1dCBlYXQgZWFnZXIuXG5wcCQxLnJlZ2V4cF9lYXRQYXR0ZXJuQ2hhcmFjdGVycyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgdmFyIGNoID0gMDtcbiAgd2hpbGUgKChjaCA9IHN0YXRlLmN1cnJlbnQoKSkgIT09IC0xICYmICFpc1N5bnRheENoYXJhY3RlcihjaCkpIHtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLnBvcyAhPT0gc3RhcnRcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1FeHRlbmRlZFBhdHRlcm5DaGFyYWN0ZXJcbnBwJDEucmVnZXhwX2VhdEV4dGVuZGVkUGF0dGVybkNoYXJhY3RlciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKFxuICAgIGNoICE9PSAtMSAmJlxuICAgIGNoICE9PSAweDI0IC8qICQgKi8gJiZcbiAgICAhKGNoID49IDB4MjggLyogKCAqLyAmJiBjaCA8PSAweDJCIC8qICsgKi8pICYmXG4gICAgY2ggIT09IDB4MkUgLyogLiAqLyAmJlxuICAgIGNoICE9PSAweDNGIC8qID8gKi8gJiZcbiAgICBjaCAhPT0gMHg1QiAvKiBbICovICYmXG4gICAgY2ggIT09IDB4NUUgLyogXiAqLyAmJlxuICAgIGNoICE9PSAweDdDIC8qIHwgKi9cbiAgKSB7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBHcm91cFNwZWNpZmllciA6OlxuLy8gICBbZW1wdHldXG4vLyAgIGA/YCBHcm91cE5hbWVcbnBwJDEucmVnZXhwX2dyb3VwU3BlY2lmaWVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmVhdCgweDNGIC8qID8gKi8pKSB7XG4gICAgaWYgKCF0aGlzLnJlZ2V4cF9lYXRHcm91cE5hbWUoc3RhdGUpKSB7IHN0YXRlLnJhaXNlKFwiSW52YWxpZCBncm91cFwiKTsgfVxuICAgIHZhciB0cmFja0Rpc2p1bmN0aW9uID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2O1xuICAgIHZhciBrbm93biA9IHN0YXRlLmdyb3VwTmFtZXNbc3RhdGUubGFzdFN0cmluZ1ZhbHVlXTtcbiAgICBpZiAoa25vd24pIHtcbiAgICAgIGlmICh0cmFja0Rpc2p1bmN0aW9uKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsaXN0ID0ga25vd247IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgdmFyIGFsdElEID0gbGlzdFtpXTtcblxuICAgICAgICAgIGlmICghYWx0SUQuc2VwYXJhdGVkRnJvbShzdGF0ZS5icmFuY2hJRCkpXG4gICAgICAgICAgICB7IHN0YXRlLnJhaXNlKFwiRHVwbGljYXRlIGNhcHR1cmUgZ3JvdXAgbmFtZVwiKTsgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIkR1cGxpY2F0ZSBjYXB0dXJlIGdyb3VwIG5hbWVcIik7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0cmFja0Rpc2p1bmN0aW9uKSB7XG4gICAgICAoa25vd24gfHwgKHN0YXRlLmdyb3VwTmFtZXNbc3RhdGUubGFzdFN0cmluZ1ZhbHVlXSA9IFtdKSkucHVzaChzdGF0ZS5icmFuY2hJRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRlLmdyb3VwTmFtZXNbc3RhdGUubGFzdFN0cmluZ1ZhbHVlXSA9IHRydWU7XG4gICAgfVxuICB9XG59O1xuXG4vLyBHcm91cE5hbWUgOjpcbi8vICAgYDxgIFJlZ0V4cElkZW50aWZpZXJOYW1lIGA+YFxuLy8gTm90ZTogdGhpcyB1cGRhdGVzIGBzdGF0ZS5sYXN0U3RyaW5nVmFsdWVgIHByb3BlcnR5IHdpdGggdGhlIGVhdGVuIG5hbWUuXG5wcCQxLnJlZ2V4cF9lYXRHcm91cE5hbWUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgPSBcIlwiO1xuICBpZiAoc3RhdGUuZWF0KDB4M0MgLyogPCAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0UmVnRXhwSWRlbnRpZmllck5hbWUoc3RhdGUpICYmIHN0YXRlLmVhdCgweDNFIC8qID4gKi8pKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgY2FwdHVyZSBncm91cCBuYW1lXCIpO1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gUmVnRXhwSWRlbnRpZmllck5hbWUgOjpcbi8vICAgUmVnRXhwSWRlbnRpZmllclN0YXJ0XG4vLyAgIFJlZ0V4cElkZW50aWZpZXJOYW1lIFJlZ0V4cElkZW50aWZpZXJQYXJ0XG4vLyBOb3RlOiB0aGlzIHVwZGF0ZXMgYHN0YXRlLmxhc3RTdHJpbmdWYWx1ZWAgcHJvcGVydHkgd2l0aCB0aGUgZWF0ZW4gbmFtZS5cbnBwJDEucmVnZXhwX2VhdFJlZ0V4cElkZW50aWZpZXJOYW1lID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlID0gXCJcIjtcbiAgaWYgKHRoaXMucmVnZXhwX2VhdFJlZ0V4cElkZW50aWZpZXJTdGFydChzdGF0ZSkpIHtcbiAgICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgKz0gY29kZVBvaW50VG9TdHJpbmcoc3RhdGUubGFzdEludFZhbHVlKTtcbiAgICB3aGlsZSAodGhpcy5yZWdleHBfZWF0UmVnRXhwSWRlbnRpZmllclBhcnQoc3RhdGUpKSB7XG4gICAgICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgKz0gY29kZVBvaW50VG9TdHJpbmcoc3RhdGUubGFzdEludFZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIFJlZ0V4cElkZW50aWZpZXJTdGFydCA6OlxuLy8gICBVbmljb2RlSURTdGFydFxuLy8gICBgJGBcbi8vICAgYF9gXG4vLyAgIGBcXGAgUmVnRXhwVW5pY29kZUVzY2FwZVNlcXVlbmNlWytVXVxucHAkMS5yZWdleHBfZWF0UmVnRXhwSWRlbnRpZmllclN0YXJ0ID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICB2YXIgZm9yY2VVID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDExO1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KGZvcmNlVSk7XG4gIHN0YXRlLmFkdmFuY2UoZm9yY2VVKTtcblxuICBpZiAoY2ggPT09IDB4NUMgLyogXFwgKi8gJiYgdGhpcy5yZWdleHBfZWF0UmVnRXhwVW5pY29kZUVzY2FwZVNlcXVlbmNlKHN0YXRlLCBmb3JjZVUpKSB7XG4gICAgY2ggPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gIH1cbiAgaWYgKGlzUmVnRXhwSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoO1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgcmV0dXJuIGZhbHNlXG59O1xuZnVuY3Rpb24gaXNSZWdFeHBJZGVudGlmaWVyU3RhcnQoY2gpIHtcbiAgcmV0dXJuIGlzSWRlbnRpZmllclN0YXJ0KGNoLCB0cnVlKSB8fCBjaCA9PT0gMHgyNCAvKiAkICovIHx8IGNoID09PSAweDVGIC8qIF8gKi9cbn1cblxuLy8gUmVnRXhwSWRlbnRpZmllclBhcnQgOjpcbi8vICAgVW5pY29kZUlEQ29udGludWVcbi8vICAgYCRgXG4vLyAgIGBfYFxuLy8gICBgXFxgIFJlZ0V4cFVuaWNvZGVFc2NhcGVTZXF1ZW5jZVsrVV1cbi8vICAgPFpXTko+XG4vLyAgIDxaV0o+XG5wcCQxLnJlZ2V4cF9lYXRSZWdFeHBJZGVudGlmaWVyUGFydCA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgdmFyIGZvcmNlVSA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMTtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudChmb3JjZVUpO1xuICBzdGF0ZS5hZHZhbmNlKGZvcmNlVSk7XG5cbiAgaWYgKGNoID09PSAweDVDIC8qIFxcICovICYmIHRoaXMucmVnZXhwX2VhdFJlZ0V4cFVuaWNvZGVFc2NhcGVTZXF1ZW5jZShzdGF0ZSwgZm9yY2VVKSkge1xuICAgIGNoID0gc3RhdGUubGFzdEludFZhbHVlO1xuICB9XG4gIGlmIChpc1JlZ0V4cElkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoO1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgcmV0dXJuIGZhbHNlXG59O1xuZnVuY3Rpb24gaXNSZWdFeHBJZGVudGlmaWVyUGFydChjaCkge1xuICByZXR1cm4gaXNJZGVudGlmaWVyQ2hhcihjaCwgdHJ1ZSkgfHwgY2ggPT09IDB4MjQgLyogJCAqLyB8fCBjaCA9PT0gMHg1RiAvKiBfICovIHx8IGNoID09PSAweDIwMEMgLyogPFpXTko+ICovIHx8IGNoID09PSAweDIwMEQgLyogPFpXSj4gKi9cbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUF0b21Fc2NhcGVcbnBwJDEucmVnZXhwX2VhdEF0b21Fc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoXG4gICAgdGhpcy5yZWdleHBfZWF0QmFja1JlZmVyZW5jZShzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJDbGFzc0VzY2FwZShzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJFc2NhcGUoc3RhdGUpIHx8XG4gICAgKHN0YXRlLnN3aXRjaE4gJiYgdGhpcy5yZWdleHBfZWF0S0dyb3VwTmFtZShzdGF0ZSkpXG4gICkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHN0YXRlLnN3aXRjaFUpIHtcbiAgICAvLyBNYWtlIHRoZSBzYW1lIG1lc3NhZ2UgYXMgVjguXG4gICAgaWYgKHN0YXRlLmN1cnJlbnQoKSA9PT0gMHg2MyAvKiBjICovKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgdW5pY29kZSBlc2NhcGVcIik7XG4gICAgfVxuICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBlc2NhcGVcIik7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xucHAkMS5yZWdleHBfZWF0QmFja1JlZmVyZW5jZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHRoaXMucmVnZXhwX2VhdERlY2ltYWxFc2NhcGUoc3RhdGUpKSB7XG4gICAgdmFyIG4gPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgaWYgKHN0YXRlLnN3aXRjaFUpIHtcbiAgICAgIC8vIEZvciBTeW50YXhFcnJvciBpbiBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jc2VjLWF0b21lc2NhcGVcbiAgICAgIGlmIChuID4gc3RhdGUubWF4QmFja1JlZmVyZW5jZSkge1xuICAgICAgICBzdGF0ZS5tYXhCYWNrUmVmZXJlbmNlID0gbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChuIDw9IHN0YXRlLm51bUNhcHR1cmluZ1BhcmVucykge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xucHAkMS5yZWdleHBfZWF0S0dyb3VwTmFtZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5lYXQoMHg2QiAvKiBrICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRHcm91cE5hbWUoc3RhdGUpKSB7XG4gICAgICBzdGF0ZS5iYWNrUmVmZXJlbmNlTmFtZXMucHVzaChzdGF0ZS5sYXN0U3RyaW5nVmFsdWUpO1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIG5hbWVkIHJlZmVyZW5jZVwiKTtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1DaGFyYWN0ZXJFc2NhcGVcbnBwJDEucmVnZXhwX2VhdENoYXJhY3RlckVzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHJldHVybiAoXG4gICAgdGhpcy5yZWdleHBfZWF0Q29udHJvbEVzY2FwZShzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDQ29udHJvbExldHRlcihzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRaZXJvKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdEhleEVzY2FwZVNlcXVlbmNlKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdFJlZ0V4cFVuaWNvZGVFc2NhcGVTZXF1ZW5jZShzdGF0ZSwgZmFsc2UpIHx8XG4gICAgKCFzdGF0ZS5zd2l0Y2hVICYmIHRoaXMucmVnZXhwX2VhdExlZ2FjeU9jdGFsRXNjYXBlU2VxdWVuY2Uoc3RhdGUpKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdElkZW50aXR5RXNjYXBlKHN0YXRlKVxuICApXG59O1xucHAkMS5yZWdleHBfZWF0Q0NvbnRyb2xMZXR0ZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXQoMHg2MyAvKiBjICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRDb250cm9sTGV0dGVyKHN0YXRlKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xucHAkMS5yZWdleHBfZWF0WmVybyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5jdXJyZW50KCkgPT09IDB4MzAgLyogMCAqLyAmJiAhaXNEZWNpbWFsRGlnaXQoc3RhdGUubG9va2FoZWFkKCkpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMDtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUNvbnRyb2xFc2NhcGVcbnBwJDEucmVnZXhwX2VhdENvbnRyb2xFc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChjaCA9PT0gMHg3NCAvKiB0ICovKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgwOTsgLyogXFx0ICovXG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKGNoID09PSAweDZFIC8qIG4gKi8pIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDBBOyAvKiBcXG4gKi9cbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpZiAoY2ggPT09IDB4NzYgLyogdiAqLykge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MEI7IC8qIFxcdiAqL1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChjaCA9PT0gMHg2NiAvKiBmICovKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgwQzsgLyogXFxmICovXG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKGNoID09PSAweDcyIC8qIHIgKi8pIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDBEOyAvKiBcXHIgKi9cbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUNvbnRyb2xMZXR0ZXJcbnBwJDEucmVnZXhwX2VhdENvbnRyb2xMZXR0ZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChpc0NvbnRyb2xMZXR0ZXIoY2gpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2ggJSAweDIwO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbmZ1bmN0aW9uIGlzQ29udHJvbExldHRlcihjaCkge1xuICByZXR1cm4gKFxuICAgIChjaCA+PSAweDQxIC8qIEEgKi8gJiYgY2ggPD0gMHg1QSAvKiBaICovKSB8fFxuICAgIChjaCA+PSAweDYxIC8qIGEgKi8gJiYgY2ggPD0gMHg3QSAvKiB6ICovKVxuICApXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLVJlZ0V4cFVuaWNvZGVFc2NhcGVTZXF1ZW5jZVxucHAkMS5yZWdleHBfZWF0UmVnRXhwVW5pY29kZUVzY2FwZVNlcXVlbmNlID0gZnVuY3Rpb24oc3RhdGUsIGZvcmNlVSkge1xuICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICB2YXIgc3dpdGNoVSA9IGZvcmNlVSB8fCBzdGF0ZS5zd2l0Y2hVO1xuXG4gIGlmIChzdGF0ZS5lYXQoMHg3NSAvKiB1ICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRGaXhlZEhleERpZ2l0cyhzdGF0ZSwgNCkpIHtcbiAgICAgIHZhciBsZWFkID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgaWYgKHN3aXRjaFUgJiYgbGVhZCA+PSAweEQ4MDAgJiYgbGVhZCA8PSAweERCRkYpIHtcbiAgICAgICAgdmFyIGxlYWRTdXJyb2dhdGVFbmQgPSBzdGF0ZS5wb3M7XG4gICAgICAgIGlmIChzdGF0ZS5lYXQoMHg1QyAvKiBcXCAqLykgJiYgc3RhdGUuZWF0KDB4NzUgLyogdSAqLykgJiYgdGhpcy5yZWdleHBfZWF0Rml4ZWRIZXhEaWdpdHMoc3RhdGUsIDQpKSB7XG4gICAgICAgICAgdmFyIHRyYWlsID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgICAgIGlmICh0cmFpbCA+PSAweERDMDAgJiYgdHJhaWwgPD0gMHhERkZGKSB7XG4gICAgICAgICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAobGVhZCAtIDB4RDgwMCkgKiAweDQwMCArICh0cmFpbCAtIDB4REMwMCkgKyAweDEwMDAwO1xuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUucG9zID0gbGVhZFN1cnJvZ2F0ZUVuZDtcbiAgICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gbGVhZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChcbiAgICAgIHN3aXRjaFUgJiZcbiAgICAgIHN0YXRlLmVhdCgweDdCIC8qIHsgKi8pICYmXG4gICAgICB0aGlzLnJlZ2V4cF9lYXRIZXhEaWdpdHMoc3RhdGUpICYmXG4gICAgICBzdGF0ZS5lYXQoMHg3RCAvKiB9ICovKSAmJlxuICAgICAgaXNWYWxpZFVuaWNvZGUoc3RhdGUubGFzdEludFZhbHVlKVxuICAgICkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKHN3aXRjaFUpIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCB1bmljb2RlIGVzY2FwZVwiKTtcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn07XG5mdW5jdGlvbiBpc1ZhbGlkVW5pY29kZShjaCkge1xuICByZXR1cm4gY2ggPj0gMCAmJiBjaCA8PSAweDEwRkZGRlxufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItSWRlbnRpdHlFc2NhcGVcbnBwJDEucmVnZXhwX2VhdElkZW50aXR5RXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHN0YXRlLnN3aXRjaFUpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0U3ludGF4Q2hhcmFjdGVyKHN0YXRlKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKHN0YXRlLmVhdCgweDJGIC8qIC8gKi8pKSB7XG4gICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDJGOyAvKiAvICovXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGNoICE9PSAweDYzIC8qIGMgKi8gJiYgKCFzdGF0ZS5zd2l0Y2hOIHx8IGNoICE9PSAweDZCIC8qIGsgKi8pKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2g7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLURlY2ltYWxFc2NhcGVcbnBwJDEucmVnZXhwX2VhdERlY2ltYWxFc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAwO1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChjaCA+PSAweDMxIC8qIDEgKi8gJiYgY2ggPD0gMHgzOSAvKiA5ICovKSB7XG4gICAgZG8ge1xuICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gMTAgKiBzdGF0ZS5sYXN0SW50VmFsdWUgKyAoY2ggLSAweDMwIC8qIDAgKi8pO1xuICAgICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIH0gd2hpbGUgKChjaCA9IHN0YXRlLmN1cnJlbnQoKSkgPj0gMHgzMCAvKiAwICovICYmIGNoIDw9IDB4MzkgLyogOSAqLylcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gUmV0dXJuIHZhbHVlcyB1c2VkIGJ5IGNoYXJhY3RlciBzZXQgcGFyc2luZyBtZXRob2RzLCBuZWVkZWQgdG9cbi8vIGZvcmJpZCBuZWdhdGlvbiBvZiBzZXRzIHRoYXQgY2FuIG1hdGNoIHN0cmluZ3MuXG52YXIgQ2hhclNldE5vbmUgPSAwOyAvLyBOb3RoaW5nIHBhcnNlZFxudmFyIENoYXJTZXRPayA9IDE7IC8vIENvbnN0cnVjdCBwYXJzZWQsIGNhbm5vdCBjb250YWluIHN0cmluZ3NcbnZhciBDaGFyU2V0U3RyaW5nID0gMjsgLy8gQ29uc3RydWN0IHBhcnNlZCwgY2FuIGNvbnRhaW4gc3RyaW5nc1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1DaGFyYWN0ZXJDbGFzc0VzY2FwZVxucHAkMS5yZWdleHBfZWF0Q2hhcmFjdGVyQ2xhc3NFc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG5cbiAgaWYgKGlzQ2hhcmFjdGVyQ2xhc3NFc2NhcGUoY2gpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gLTE7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiBDaGFyU2V0T2tcbiAgfVxuXG4gIHZhciBuZWdhdGUgPSBmYWxzZTtcbiAgaWYgKFxuICAgIHN0YXRlLnN3aXRjaFUgJiZcbiAgICB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSAmJlxuICAgICgobmVnYXRlID0gY2ggPT09IDB4NTAgLyogUCAqLykgfHwgY2ggPT09IDB4NzAgLyogcCAqLylcbiAgKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gLTE7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHZhciByZXN1bHQ7XG4gICAgaWYgKFxuICAgICAgc3RhdGUuZWF0KDB4N0IgLyogeyAqLykgJiZcbiAgICAgIChyZXN1bHQgPSB0aGlzLnJlZ2V4cF9lYXRVbmljb2RlUHJvcGVydHlWYWx1ZUV4cHJlc3Npb24oc3RhdGUpKSAmJlxuICAgICAgc3RhdGUuZWF0KDB4N0QgLyogfSAqLylcbiAgICApIHtcbiAgICAgIGlmIChuZWdhdGUgJiYgcmVzdWx0ID09PSBDaGFyU2V0U3RyaW5nKSB7IHN0YXRlLnJhaXNlKFwiSW52YWxpZCBwcm9wZXJ0eSBuYW1lXCIpOyB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxuICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBwcm9wZXJ0eSBuYW1lXCIpO1xuICB9XG5cbiAgcmV0dXJuIENoYXJTZXROb25lXG59O1xuXG5mdW5jdGlvbiBpc0NoYXJhY3RlckNsYXNzRXNjYXBlKGNoKSB7XG4gIHJldHVybiAoXG4gICAgY2ggPT09IDB4NjQgLyogZCAqLyB8fFxuICAgIGNoID09PSAweDQ0IC8qIEQgKi8gfHxcbiAgICBjaCA9PT0gMHg3MyAvKiBzICovIHx8XG4gICAgY2ggPT09IDB4NTMgLyogUyAqLyB8fFxuICAgIGNoID09PSAweDc3IC8qIHcgKi8gfHxcbiAgICBjaCA9PT0gMHg1NyAvKiBXICovXG4gIClcbn1cblxuLy8gVW5pY29kZVByb3BlcnR5VmFsdWVFeHByZXNzaW9uIDo6XG4vLyAgIFVuaWNvZGVQcm9wZXJ0eU5hbWUgYD1gIFVuaWNvZGVQcm9wZXJ0eVZhbHVlXG4vLyAgIExvbmVVbmljb2RlUHJvcGVydHlOYW1lT3JWYWx1ZVxucHAkMS5yZWdleHBfZWF0VW5pY29kZVByb3BlcnR5VmFsdWVFeHByZXNzaW9uID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuXG4gIC8vIFVuaWNvZGVQcm9wZXJ0eU5hbWUgYD1gIFVuaWNvZGVQcm9wZXJ0eVZhbHVlXG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRVbmljb2RlUHJvcGVydHlOYW1lKHN0YXRlKSAmJiBzdGF0ZS5lYXQoMHgzRCAvKiA9ICovKSkge1xuICAgIHZhciBuYW1lID0gc3RhdGUubGFzdFN0cmluZ1ZhbHVlO1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRVbmljb2RlUHJvcGVydHlWYWx1ZShzdGF0ZSkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IHN0YXRlLmxhc3RTdHJpbmdWYWx1ZTtcbiAgICAgIHRoaXMucmVnZXhwX3ZhbGlkYXRlVW5pY29kZVByb3BlcnR5TmFtZUFuZFZhbHVlKHN0YXRlLCBuYW1lLCB2YWx1ZSk7XG4gICAgICByZXR1cm4gQ2hhclNldE9rXG4gICAgfVxuICB9XG4gIHN0YXRlLnBvcyA9IHN0YXJ0O1xuXG4gIC8vIExvbmVVbmljb2RlUHJvcGVydHlOYW1lT3JWYWx1ZVxuICBpZiAodGhpcy5yZWdleHBfZWF0TG9uZVVuaWNvZGVQcm9wZXJ0eU5hbWVPclZhbHVlKHN0YXRlKSkge1xuICAgIHZhciBuYW1lT3JWYWx1ZSA9IHN0YXRlLmxhc3RTdHJpbmdWYWx1ZTtcbiAgICByZXR1cm4gdGhpcy5yZWdleHBfdmFsaWRhdGVVbmljb2RlUHJvcGVydHlOYW1lT3JWYWx1ZShzdGF0ZSwgbmFtZU9yVmFsdWUpXG4gIH1cbiAgcmV0dXJuIENoYXJTZXROb25lXG59O1xuXG5wcCQxLnJlZ2V4cF92YWxpZGF0ZVVuaWNvZGVQcm9wZXJ0eU5hbWVBbmRWYWx1ZSA9IGZ1bmN0aW9uKHN0YXRlLCBuYW1lLCB2YWx1ZSkge1xuICBpZiAoIWhhc093bihzdGF0ZS51bmljb2RlUHJvcGVydGllcy5ub25CaW5hcnksIG5hbWUpKVxuICAgIHsgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHByb3BlcnR5IG5hbWVcIik7IH1cbiAgaWYgKCFzdGF0ZS51bmljb2RlUHJvcGVydGllcy5ub25CaW5hcnlbbmFtZV0udGVzdCh2YWx1ZSkpXG4gICAgeyBzdGF0ZS5yYWlzZShcIkludmFsaWQgcHJvcGVydHkgdmFsdWVcIik7IH1cbn07XG5cbnBwJDEucmVnZXhwX3ZhbGlkYXRlVW5pY29kZVByb3BlcnR5TmFtZU9yVmFsdWUgPSBmdW5jdGlvbihzdGF0ZSwgbmFtZU9yVmFsdWUpIHtcbiAgaWYgKHN0YXRlLnVuaWNvZGVQcm9wZXJ0aWVzLmJpbmFyeS50ZXN0KG5hbWVPclZhbHVlKSkgeyByZXR1cm4gQ2hhclNldE9rIH1cbiAgaWYgKHN0YXRlLnN3aXRjaFYgJiYgc3RhdGUudW5pY29kZVByb3BlcnRpZXMuYmluYXJ5T2ZTdHJpbmdzLnRlc3QobmFtZU9yVmFsdWUpKSB7IHJldHVybiBDaGFyU2V0U3RyaW5nIH1cbiAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHByb3BlcnR5IG5hbWVcIik7XG59O1xuXG4vLyBVbmljb2RlUHJvcGVydHlOYW1lIDo6XG4vLyAgIFVuaWNvZGVQcm9wZXJ0eU5hbWVDaGFyYWN0ZXJzXG5wcCQxLnJlZ2V4cF9lYXRVbmljb2RlUHJvcGVydHlOYW1lID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gMDtcbiAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlID0gXCJcIjtcbiAgd2hpbGUgKGlzVW5pY29kZVByb3BlcnR5TmFtZUNoYXJhY3RlcihjaCA9IHN0YXRlLmN1cnJlbnQoKSkpIHtcbiAgICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgKz0gY29kZVBvaW50VG9TdHJpbmcoY2gpO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgfVxuICByZXR1cm4gc3RhdGUubGFzdFN0cmluZ1ZhbHVlICE9PSBcIlwiXG59O1xuXG5mdW5jdGlvbiBpc1VuaWNvZGVQcm9wZXJ0eU5hbWVDaGFyYWN0ZXIoY2gpIHtcbiAgcmV0dXJuIGlzQ29udHJvbExldHRlcihjaCkgfHwgY2ggPT09IDB4NUYgLyogXyAqL1xufVxuXG4vLyBVbmljb2RlUHJvcGVydHlWYWx1ZSA6OlxuLy8gICBVbmljb2RlUHJvcGVydHlWYWx1ZUNoYXJhY3RlcnNcbnBwJDEucmVnZXhwX2VhdFVuaWNvZGVQcm9wZXJ0eVZhbHVlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gMDtcbiAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlID0gXCJcIjtcbiAgd2hpbGUgKGlzVW5pY29kZVByb3BlcnR5VmFsdWVDaGFyYWN0ZXIoY2ggPSBzdGF0ZS5jdXJyZW50KCkpKSB7XG4gICAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlICs9IGNvZGVQb2ludFRvU3RyaW5nKGNoKTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSAhPT0gXCJcIlxufTtcbmZ1bmN0aW9uIGlzVW5pY29kZVByb3BlcnR5VmFsdWVDaGFyYWN0ZXIoY2gpIHtcbiAgcmV0dXJuIGlzVW5pY29kZVByb3BlcnR5TmFtZUNoYXJhY3RlcihjaCkgfHwgaXNEZWNpbWFsRGlnaXQoY2gpXG59XG5cbi8vIExvbmVVbmljb2RlUHJvcGVydHlOYW1lT3JWYWx1ZSA6OlxuLy8gICBVbmljb2RlUHJvcGVydHlWYWx1ZUNoYXJhY3RlcnNcbnBwJDEucmVnZXhwX2VhdExvbmVVbmljb2RlUHJvcGVydHlOYW1lT3JWYWx1ZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHJldHVybiB0aGlzLnJlZ2V4cF9lYXRVbmljb2RlUHJvcGVydHlWYWx1ZShzdGF0ZSlcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUNoYXJhY3RlckNsYXNzXG5wcCQxLnJlZ2V4cF9lYXRDaGFyYWN0ZXJDbGFzcyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5lYXQoMHg1QiAvKiBbICovKSkge1xuICAgIHZhciBuZWdhdGUgPSBzdGF0ZS5lYXQoMHg1RSAvKiBeICovKTtcbiAgICB2YXIgcmVzdWx0ID0gdGhpcy5yZWdleHBfY2xhc3NDb250ZW50cyhzdGF0ZSk7XG4gICAgaWYgKCFzdGF0ZS5lYXQoMHg1RCAvKiBdICovKSlcbiAgICAgIHsgc3RhdGUucmFpc2UoXCJVbnRlcm1pbmF0ZWQgY2hhcmFjdGVyIGNsYXNzXCIpOyB9XG4gICAgaWYgKG5lZ2F0ZSAmJiByZXN1bHQgPT09IENoYXJTZXRTdHJpbmcpXG4gICAgICB7IHN0YXRlLnJhaXNlKFwiTmVnYXRlZCBjaGFyYWN0ZXIgY2xhc3MgbWF5IGNvbnRhaW4gc3RyaW5nc1wiKTsgfVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc0NvbnRlbnRzXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1DbGFzc1Jhbmdlc1xucHAkMS5yZWdleHBfY2xhc3NDb250ZW50cyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5jdXJyZW50KCkgPT09IDB4NUQgLyogXSAqLykgeyByZXR1cm4gQ2hhclNldE9rIH1cbiAgaWYgKHN0YXRlLnN3aXRjaFYpIHsgcmV0dXJuIHRoaXMucmVnZXhwX2NsYXNzU2V0RXhwcmVzc2lvbihzdGF0ZSkgfVxuICB0aGlzLnJlZ2V4cF9ub25FbXB0eUNsYXNzUmFuZ2VzKHN0YXRlKTtcbiAgcmV0dXJuIENoYXJTZXRPa1xufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtTm9uZW1wdHlDbGFzc1Jhbmdlc1xuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtTm9uZW1wdHlDbGFzc1Jhbmdlc05vRGFzaFxucHAkMS5yZWdleHBfbm9uRW1wdHlDbGFzc1JhbmdlcyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHdoaWxlICh0aGlzLnJlZ2V4cF9lYXRDbGFzc0F0b20oc3RhdGUpKSB7XG4gICAgdmFyIGxlZnQgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgaWYgKHN0YXRlLmVhdCgweDJEIC8qIC0gKi8pICYmIHRoaXMucmVnZXhwX2VhdENsYXNzQXRvbShzdGF0ZSkpIHtcbiAgICAgIHZhciByaWdodCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgIGlmIChzdGF0ZS5zd2l0Y2hVICYmIChsZWZ0ID09PSAtMSB8fCByaWdodCA9PT0gLTEpKSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBjaGFyYWN0ZXIgY2xhc3NcIik7XG4gICAgICB9XG4gICAgICBpZiAobGVmdCAhPT0gLTEgJiYgcmlnaHQgIT09IC0xICYmIGxlZnQgPiByaWdodCkge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIlJhbmdlIG91dCBvZiBvcmRlciBpbiBjaGFyYWN0ZXIgY2xhc3NcIik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1DbGFzc0F0b21cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUNsYXNzQXRvbU5vRGFzaFxucHAkMS5yZWdleHBfZWF0Q2xhc3NBdG9tID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuXG4gIGlmIChzdGF0ZS5lYXQoMHg1QyAvKiBcXCAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0Q2xhc3NFc2NhcGUoc3RhdGUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAoc3RhdGUuc3dpdGNoVSkge1xuICAgICAgLy8gTWFrZSB0aGUgc2FtZSBtZXNzYWdlIGFzIFY4LlxuICAgICAgdmFyIGNoJDEgPSBzdGF0ZS5jdXJyZW50KCk7XG4gICAgICBpZiAoY2gkMSA9PT0gMHg2MyAvKiBjICovIHx8IGlzT2N0YWxEaWdpdChjaCQxKSkge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgY2xhc3MgZXNjYXBlXCIpO1xuICAgICAgfVxuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGVzY2FwZVwiKTtcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cblxuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChjaCAhPT0gMHg1RCAvKiBdICovKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2g7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1DbGFzc0VzY2FwZVxucHAkMS5yZWdleHBfZWF0Q2xhc3NFc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG5cbiAgaWYgKHN0YXRlLmVhdCgweDYyIC8qIGIgKi8pKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgwODsgLyogPEJTPiAqL1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBpZiAoc3RhdGUuc3dpdGNoVSAmJiBzdGF0ZS5lYXQoMHgyRCAvKiAtICovKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MkQ7IC8qIC0gKi9cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaWYgKCFzdGF0ZS5zd2l0Y2hVICYmIHN0YXRlLmVhdCgweDYzIC8qIGMgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdENsYXNzQ29udHJvbExldHRlcihzdGF0ZSkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJDbGFzc0VzY2FwZShzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJFc2NhcGUoc3RhdGUpXG4gIClcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0RXhwcmVzc2lvblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NVbmlvblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NJbnRlcnNlY3Rpb25cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU3VidHJhY3Rpb25cbnBwJDEucmVnZXhwX2NsYXNzU2V0RXhwcmVzc2lvbiA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciByZXN1bHQgPSBDaGFyU2V0T2ssIHN1YlJlc3VsdDtcbiAgaWYgKHRoaXMucmVnZXhwX2VhdENsYXNzU2V0UmFuZ2Uoc3RhdGUpKSA7IGVsc2UgaWYgKHN1YlJlc3VsdCA9IHRoaXMucmVnZXhwX2VhdENsYXNzU2V0T3BlcmFuZChzdGF0ZSkpIHtcbiAgICBpZiAoc3ViUmVzdWx0ID09PSBDaGFyU2V0U3RyaW5nKSB7IHJlc3VsdCA9IENoYXJTZXRTdHJpbmc7IH1cbiAgICAvLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc0ludGVyc2VjdGlvblxuICAgIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgICB3aGlsZSAoc3RhdGUuZWF0Q2hhcnMoWzB4MjYsIDB4MjZdIC8qICYmICovKSkge1xuICAgICAgaWYgKFxuICAgICAgICBzdGF0ZS5jdXJyZW50KCkgIT09IDB4MjYgLyogJiAqLyAmJlxuICAgICAgICAoc3ViUmVzdWx0ID0gdGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRPcGVyYW5kKHN0YXRlKSlcbiAgICAgICkge1xuICAgICAgICBpZiAoc3ViUmVzdWx0ICE9PSBDaGFyU2V0U3RyaW5nKSB7IHJlc3VsdCA9IENoYXJTZXRPazsgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGNoYXJhY3RlciBpbiBjaGFyYWN0ZXIgY2xhc3NcIik7XG4gICAgfVxuICAgIGlmIChzdGFydCAhPT0gc3RhdGUucG9zKSB7IHJldHVybiByZXN1bHQgfVxuICAgIC8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU3VidHJhY3Rpb25cbiAgICB3aGlsZSAoc3RhdGUuZWF0Q2hhcnMoWzB4MkQsIDB4MkRdIC8qIC0tICovKSkge1xuICAgICAgaWYgKHRoaXMucmVnZXhwX2VhdENsYXNzU2V0T3BlcmFuZChzdGF0ZSkpIHsgY29udGludWUgfVxuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGNoYXJhY3RlciBpbiBjaGFyYWN0ZXIgY2xhc3NcIik7XG4gICAgfVxuICAgIGlmIChzdGFydCAhPT0gc3RhdGUucG9zKSB7IHJldHVybiByZXN1bHQgfVxuICB9IGVsc2Uge1xuICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBjaGFyYWN0ZXIgaW4gY2hhcmFjdGVyIGNsYXNzXCIpO1xuICB9XG4gIC8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzVW5pb25cbiAgZm9yICg7Oykge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldFJhbmdlKHN0YXRlKSkgeyBjb250aW51ZSB9XG4gICAgc3ViUmVzdWx0ID0gdGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRPcGVyYW5kKHN0YXRlKTtcbiAgICBpZiAoIXN1YlJlc3VsdCkgeyByZXR1cm4gcmVzdWx0IH1cbiAgICBpZiAoc3ViUmVzdWx0ID09PSBDaGFyU2V0U3RyaW5nKSB7IHJlc3VsdCA9IENoYXJTZXRTdHJpbmc7IH1cbiAgfVxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRSYW5nZVxucHAkMS5yZWdleHBfZWF0Q2xhc3NTZXRSYW5nZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHRoaXMucmVnZXhwX2VhdENsYXNzU2V0Q2hhcmFjdGVyKHN0YXRlKSkge1xuICAgIHZhciBsZWZ0ID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgIGlmIChzdGF0ZS5lYXQoMHgyRCAvKiAtICovKSAmJiB0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldENoYXJhY3RlcihzdGF0ZSkpIHtcbiAgICAgIHZhciByaWdodCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgIGlmIChsZWZ0ICE9PSAtMSAmJiByaWdodCAhPT0gLTEgJiYgbGVmdCA+IHJpZ2h0KSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiUmFuZ2Ugb3V0IG9mIG9yZGVyIGluIGNoYXJhY3RlciBjbGFzc1wiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRPcGVyYW5kXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc1NldE9wZXJhbmQgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAodGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRDaGFyYWN0ZXIoc3RhdGUpKSB7IHJldHVybiBDaGFyU2V0T2sgfVxuICByZXR1cm4gdGhpcy5yZWdleHBfZWF0Q2xhc3NTdHJpbmdEaXNqdW5jdGlvbihzdGF0ZSkgfHwgdGhpcy5yZWdleHBfZWF0TmVzdGVkQ2xhc3Moc3RhdGUpXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1OZXN0ZWRDbGFzc1xucHAkMS5yZWdleHBfZWF0TmVzdGVkQ2xhc3MgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXQoMHg1QiAvKiBbICovKSkge1xuICAgIHZhciBuZWdhdGUgPSBzdGF0ZS5lYXQoMHg1RSAvKiBeICovKTtcbiAgICB2YXIgcmVzdWx0ID0gdGhpcy5yZWdleHBfY2xhc3NDb250ZW50cyhzdGF0ZSk7XG4gICAgaWYgKHN0YXRlLmVhdCgweDVEIC8qIF0gKi8pKSB7XG4gICAgICBpZiAobmVnYXRlICYmIHJlc3VsdCA9PT0gQ2hhclNldFN0cmluZykge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIk5lZ2F0ZWQgY2hhcmFjdGVyIGNsYXNzIG1heSBjb250YWluIHN0cmluZ3NcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIGlmIChzdGF0ZS5lYXQoMHg1QyAvKiBcXCAqLykpIHtcbiAgICB2YXIgcmVzdWx0JDEgPSB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJDbGFzc0VzY2FwZShzdGF0ZSk7XG4gICAgaWYgKHJlc3VsdCQxKSB7XG4gICAgICByZXR1cm4gcmVzdWx0JDFcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIG51bGxcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU3RyaW5nRGlzanVuY3Rpb25cbnBwJDEucmVnZXhwX2VhdENsYXNzU3RyaW5nRGlzanVuY3Rpb24gPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXRDaGFycyhbMHg1QywgMHg3MV0gLyogXFxxICovKSkge1xuICAgIGlmIChzdGF0ZS5lYXQoMHg3QiAvKiB7ICovKSkge1xuICAgICAgdmFyIHJlc3VsdCA9IHRoaXMucmVnZXhwX2NsYXNzU3RyaW5nRGlzanVuY3Rpb25Db250ZW50cyhzdGF0ZSk7XG4gICAgICBpZiAoc3RhdGUuZWF0KDB4N0QgLyogfSAqLykpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBNYWtlIHRoZSBzYW1lIG1lc3NhZ2UgYXMgVjguXG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgZXNjYXBlXCIpO1xuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gbnVsbFxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTdHJpbmdEaXNqdW5jdGlvbkNvbnRlbnRzXG5wcCQxLnJlZ2V4cF9jbGFzc1N0cmluZ0Rpc2p1bmN0aW9uQ29udGVudHMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgcmVzdWx0ID0gdGhpcy5yZWdleHBfY2xhc3NTdHJpbmcoc3RhdGUpO1xuICB3aGlsZSAoc3RhdGUuZWF0KDB4N0MgLyogfCAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfY2xhc3NTdHJpbmcoc3RhdGUpID09PSBDaGFyU2V0U3RyaW5nKSB7IHJlc3VsdCA9IENoYXJTZXRTdHJpbmc7IH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1N0cmluZ1xuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtTm9uRW1wdHlDbGFzc1N0cmluZ1xucHAkMS5yZWdleHBfY2xhc3NTdHJpbmcgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY291bnQgPSAwO1xuICB3aGlsZSAodGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRDaGFyYWN0ZXIoc3RhdGUpKSB7IGNvdW50Kys7IH1cbiAgcmV0dXJuIGNvdW50ID09PSAxID8gQ2hhclNldE9rIDogQ2hhclNldFN0cmluZ1xufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRDaGFyYWN0ZXJcbnBwJDEucmVnZXhwX2VhdENsYXNzU2V0Q2hhcmFjdGVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0KDB4NUMgLyogXFwgKi8pKSB7XG4gICAgaWYgKFxuICAgICAgdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyRXNjYXBlKHN0YXRlKSB8fFxuICAgICAgdGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRSZXNlcnZlZFB1bmN0dWF0b3Ioc3RhdGUpXG4gICAgKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAoc3RhdGUuZWF0KDB4NjIgLyogYiAqLykpIHtcbiAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MDg7IC8qIDxCUz4gKi9cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGNoIDwgMCB8fCBjaCA9PT0gc3RhdGUubG9va2FoZWFkKCkgJiYgaXNDbGFzc1NldFJlc2VydmVkRG91YmxlUHVuY3R1YXRvckNoYXJhY3RlcihjaCkpIHsgcmV0dXJuIGZhbHNlIH1cbiAgaWYgKGlzQ2xhc3NTZXRTeW50YXhDaGFyYWN0ZXIoY2gpKSB7IHJldHVybiBmYWxzZSB9XG4gIHN0YXRlLmFkdmFuY2UoKTtcbiAgc3RhdGUubGFzdEludFZhbHVlID0gY2g7XG4gIHJldHVybiB0cnVlXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldFJlc2VydmVkRG91YmxlUHVuY3R1YXRvclxuZnVuY3Rpb24gaXNDbGFzc1NldFJlc2VydmVkRG91YmxlUHVuY3R1YXRvckNoYXJhY3RlcihjaCkge1xuICByZXR1cm4gKFxuICAgIGNoID09PSAweDIxIC8qICEgKi8gfHxcbiAgICBjaCA+PSAweDIzIC8qICMgKi8gJiYgY2ggPD0gMHgyNiAvKiAmICovIHx8XG4gICAgY2ggPj0gMHgyQSAvKiAqICovICYmIGNoIDw9IDB4MkMgLyogLCAqLyB8fFxuICAgIGNoID09PSAweDJFIC8qIC4gKi8gfHxcbiAgICBjaCA+PSAweDNBIC8qIDogKi8gJiYgY2ggPD0gMHg0MCAvKiBAICovIHx8XG4gICAgY2ggPT09IDB4NUUgLyogXiAqLyB8fFxuICAgIGNoID09PSAweDYwIC8qIGAgKi8gfHxcbiAgICBjaCA9PT0gMHg3RSAvKiB+ICovXG4gIClcbn1cblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRTeW50YXhDaGFyYWN0ZXJcbmZ1bmN0aW9uIGlzQ2xhc3NTZXRTeW50YXhDaGFyYWN0ZXIoY2gpIHtcbiAgcmV0dXJuIChcbiAgICBjaCA9PT0gMHgyOCAvKiAoICovIHx8XG4gICAgY2ggPT09IDB4MjkgLyogKSAqLyB8fFxuICAgIGNoID09PSAweDJEIC8qIC0gKi8gfHxcbiAgICBjaCA9PT0gMHgyRiAvKiAvICovIHx8XG4gICAgY2ggPj0gMHg1QiAvKiBbICovICYmIGNoIDw9IDB4NUQgLyogXSAqLyB8fFxuICAgIGNoID49IDB4N0IgLyogeyAqLyAmJiBjaCA8PSAweDdEIC8qIH0gKi9cbiAgKVxufVxuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldFJlc2VydmVkUHVuY3R1YXRvclxucHAkMS5yZWdleHBfZWF0Q2xhc3NTZXRSZXNlcnZlZFB1bmN0dWF0b3IgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChpc0NsYXNzU2V0UmVzZXJ2ZWRQdW5jdHVhdG9yKGNoKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRSZXNlcnZlZFB1bmN0dWF0b3JcbmZ1bmN0aW9uIGlzQ2xhc3NTZXRSZXNlcnZlZFB1bmN0dWF0b3IoY2gpIHtcbiAgcmV0dXJuIChcbiAgICBjaCA9PT0gMHgyMSAvKiAhICovIHx8XG4gICAgY2ggPT09IDB4MjMgLyogIyAqLyB8fFxuICAgIGNoID09PSAweDI1IC8qICUgKi8gfHxcbiAgICBjaCA9PT0gMHgyNiAvKiAmICovIHx8XG4gICAgY2ggPT09IDB4MkMgLyogLCAqLyB8fFxuICAgIGNoID09PSAweDJEIC8qIC0gKi8gfHxcbiAgICBjaCA+PSAweDNBIC8qIDogKi8gJiYgY2ggPD0gMHgzRSAvKiA+ICovIHx8XG4gICAgY2ggPT09IDB4NDAgLyogQCAqLyB8fFxuICAgIGNoID09PSAweDYwIC8qIGAgKi8gfHxcbiAgICBjaCA9PT0gMHg3RSAvKiB+ICovXG4gIClcbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUNsYXNzQ29udHJvbExldHRlclxucHAkMS5yZWdleHBfZWF0Q2xhc3NDb250cm9sTGV0dGVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpIHx8IGNoID09PSAweDVGIC8qIF8gKi8pIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaCAlIDB4MjA7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1IZXhFc2NhcGVTZXF1ZW5jZVxucHAkMS5yZWdleHBfZWF0SGV4RXNjYXBlU2VxdWVuY2UgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXQoMHg3OCAvKiB4ICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRGaXhlZEhleERpZ2l0cyhzdGF0ZSwgMikpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChzdGF0ZS5zd2l0Y2hVKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgZXNjYXBlXCIpO1xuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLURlY2ltYWxEaWdpdHNcbnBwJDEucmVnZXhwX2VhdERlY2ltYWxEaWdpdHMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHZhciBjaCA9IDA7XG4gIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDA7XG4gIHdoaWxlIChpc0RlY2ltYWxEaWdpdChjaCA9IHN0YXRlLmN1cnJlbnQoKSkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAxMCAqIHN0YXRlLmxhc3RJbnRWYWx1ZSArIChjaCAtIDB4MzAgLyogMCAqLyk7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICB9XG4gIHJldHVybiBzdGF0ZS5wb3MgIT09IHN0YXJ0XG59O1xuZnVuY3Rpb24gaXNEZWNpbWFsRGlnaXQoY2gpIHtcbiAgcmV0dXJuIGNoID49IDB4MzAgLyogMCAqLyAmJiBjaCA8PSAweDM5IC8qIDkgKi9cbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtSGV4RGlnaXRzXG5wcCQxLnJlZ2V4cF9lYXRIZXhEaWdpdHMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHZhciBjaCA9IDA7XG4gIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDA7XG4gIHdoaWxlIChpc0hleERpZ2l0KGNoID0gc3RhdGUuY3VycmVudCgpKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDE2ICogc3RhdGUubGFzdEludFZhbHVlICsgaGV4VG9JbnQoY2gpO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgfVxuICByZXR1cm4gc3RhdGUucG9zICE9PSBzdGFydFxufTtcbmZ1bmN0aW9uIGlzSGV4RGlnaXQoY2gpIHtcbiAgcmV0dXJuIChcbiAgICAoY2ggPj0gMHgzMCAvKiAwICovICYmIGNoIDw9IDB4MzkgLyogOSAqLykgfHxcbiAgICAoY2ggPj0gMHg0MSAvKiBBICovICYmIGNoIDw9IDB4NDYgLyogRiAqLykgfHxcbiAgICAoY2ggPj0gMHg2MSAvKiBhICovICYmIGNoIDw9IDB4NjYgLyogZiAqLylcbiAgKVxufVxuZnVuY3Rpb24gaGV4VG9JbnQoY2gpIHtcbiAgaWYgKGNoID49IDB4NDEgLyogQSAqLyAmJiBjaCA8PSAweDQ2IC8qIEYgKi8pIHtcbiAgICByZXR1cm4gMTAgKyAoY2ggLSAweDQxIC8qIEEgKi8pXG4gIH1cbiAgaWYgKGNoID49IDB4NjEgLyogYSAqLyAmJiBjaCA8PSAweDY2IC8qIGYgKi8pIHtcbiAgICByZXR1cm4gMTAgKyAoY2ggLSAweDYxIC8qIGEgKi8pXG4gIH1cbiAgcmV0dXJuIGNoIC0gMHgzMCAvKiAwICovXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1MZWdhY3lPY3RhbEVzY2FwZVNlcXVlbmNlXG4vLyBBbGxvd3Mgb25seSAwLTM3NyhvY3RhbCkgaS5lLiAwLTI1NShkZWNpbWFsKS5cbnBwJDEucmVnZXhwX2VhdExlZ2FjeU9jdGFsRXNjYXBlU2VxdWVuY2UgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAodGhpcy5yZWdleHBfZWF0T2N0YWxEaWdpdChzdGF0ZSkpIHtcbiAgICB2YXIgbjEgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdE9jdGFsRGlnaXQoc3RhdGUpKSB7XG4gICAgICB2YXIgbjIgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICBpZiAobjEgPD0gMyAmJiB0aGlzLnJlZ2V4cF9lYXRPY3RhbERpZ2l0KHN0YXRlKSkge1xuICAgICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBuMSAqIDY0ICsgbjIgKiA4ICsgc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gbjEgKiA4ICsgbjI7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IG4xO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtT2N0YWxEaWdpdFxucHAkMS5yZWdleHBfZWF0T2N0YWxEaWdpdCA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaCAtIDB4MzA7IC8qIDAgKi9cbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAwO1xuICByZXR1cm4gZmFsc2Vcbn07XG5mdW5jdGlvbiBpc09jdGFsRGlnaXQoY2gpIHtcbiAgcmV0dXJuIGNoID49IDB4MzAgLyogMCAqLyAmJiBjaCA8PSAweDM3IC8qIDcgKi9cbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtSGV4NERpZ2l0c1xuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtSGV4RGlnaXRcbi8vIEFuZCBIZXhEaWdpdCBIZXhEaWdpdCBpbiBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1IZXhFc2NhcGVTZXF1ZW5jZVxucHAkMS5yZWdleHBfZWF0Rml4ZWRIZXhEaWdpdHMgPSBmdW5jdGlvbihzdGF0ZSwgbGVuZ3RoKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgc3RhdGUubGFzdEludFZhbHVlID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgICBpZiAoIWlzSGV4RGlnaXQoY2gpKSB7XG4gICAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAxNiAqIHN0YXRlLmxhc3RJbnRWYWx1ZSArIGhleFRvSW50KGNoKTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gIH1cbiAgcmV0dXJuIHRydWVcbn07XG5cbi8vIE9iamVjdCB0eXBlIHVzZWQgdG8gcmVwcmVzZW50IHRva2Vucy4gTm90ZSB0aGF0IG5vcm1hbGx5LCB0b2tlbnNcbi8vIHNpbXBseSBleGlzdCBhcyBwcm9wZXJ0aWVzIG9uIHRoZSBwYXJzZXIgb2JqZWN0LiBUaGlzIGlzIG9ubHlcbi8vIHVzZWQgZm9yIHRoZSBvblRva2VuIGNhbGxiYWNrIGFuZCB0aGUgZXh0ZXJuYWwgdG9rZW5pemVyLlxuXG52YXIgVG9rZW4gPSBmdW5jdGlvbiBUb2tlbihwKSB7XG4gIHRoaXMudHlwZSA9IHAudHlwZTtcbiAgdGhpcy52YWx1ZSA9IHAudmFsdWU7XG4gIHRoaXMuc3RhcnQgPSBwLnN0YXJ0O1xuICB0aGlzLmVuZCA9IHAuZW5kO1xuICBpZiAocC5vcHRpb25zLmxvY2F0aW9ucylcbiAgICB7IHRoaXMubG9jID0gbmV3IFNvdXJjZUxvY2F0aW9uKHAsIHAuc3RhcnRMb2MsIHAuZW5kTG9jKTsgfVxuICBpZiAocC5vcHRpb25zLnJhbmdlcylcbiAgICB7IHRoaXMucmFuZ2UgPSBbcC5zdGFydCwgcC5lbmRdOyB9XG59O1xuXG4vLyAjIyBUb2tlbml6ZXJcblxudmFyIHBwID0gUGFyc2VyLnByb3RvdHlwZTtcblxuLy8gTW92ZSB0byB0aGUgbmV4dCB0b2tlblxuXG5wcC5uZXh0ID0gZnVuY3Rpb24oaWdub3JlRXNjYXBlU2VxdWVuY2VJbktleXdvcmQpIHtcbiAgaWYgKCFpZ25vcmVFc2NhcGVTZXF1ZW5jZUluS2V5d29yZCAmJiB0aGlzLnR5cGUua2V5d29yZCAmJiB0aGlzLmNvbnRhaW5zRXNjKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIFwiRXNjYXBlIHNlcXVlbmNlIGluIGtleXdvcmQgXCIgKyB0aGlzLnR5cGUua2V5d29yZCk7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5vblRva2VuKVxuICAgIHsgdGhpcy5vcHRpb25zLm9uVG9rZW4obmV3IFRva2VuKHRoaXMpKTsgfVxuXG4gIHRoaXMubGFzdFRva0VuZCA9IHRoaXMuZW5kO1xuICB0aGlzLmxhc3RUb2tTdGFydCA9IHRoaXMuc3RhcnQ7XG4gIHRoaXMubGFzdFRva0VuZExvYyA9IHRoaXMuZW5kTG9jO1xuICB0aGlzLmxhc3RUb2tTdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gIHRoaXMubmV4dFRva2VuKCk7XG59O1xuXG5wcC5nZXRUb2tlbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm5leHQoKTtcbiAgcmV0dXJuIG5ldyBUb2tlbih0aGlzKVxufTtcblxuLy8gSWYgd2UncmUgaW4gYW4gRVM2IGVudmlyb25tZW50LCBtYWtlIHBhcnNlcnMgaXRlcmFibGVcbmlmICh0eXBlb2YgU3ltYm9sICE9PSBcInVuZGVmaW5lZFwiKVxuICB7IHBwW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhpcyQxJDEgPSB0aGlzO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gdGhpcyQxJDEuZ2V0VG9rZW4oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkb25lOiB0b2tlbi50eXBlID09PSB0eXBlcyQxLmVvZixcbiAgICAgICAgICB2YWx1ZTogdG9rZW5cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTsgfVxuXG4vLyBUb2dnbGUgc3RyaWN0IG1vZGUuIFJlLXJlYWRzIHRoZSBuZXh0IG51bWJlciBvciBzdHJpbmcgdG8gcGxlYXNlXG4vLyBwZWRhbnRpYyB0ZXN0cyAoYFwidXNlIHN0cmljdFwiOyAwMTA7YCBzaG91bGQgZmFpbCkuXG5cbi8vIFJlYWQgYSBzaW5nbGUgdG9rZW4sIHVwZGF0aW5nIHRoZSBwYXJzZXIgb2JqZWN0J3MgdG9rZW4tcmVsYXRlZFxuLy8gcHJvcGVydGllcy5cblxucHAubmV4dFRva2VuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjdXJDb250ZXh0ID0gdGhpcy5jdXJDb250ZXh0KCk7XG4gIGlmICghY3VyQ29udGV4dCB8fCAhY3VyQ29udGV4dC5wcmVzZXJ2ZVNwYWNlKSB7IHRoaXMuc2tpcFNwYWNlKCk7IH1cblxuICB0aGlzLnN0YXJ0ID0gdGhpcy5wb3M7XG4gIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7IHRoaXMuc3RhcnRMb2MgPSB0aGlzLmN1clBvc2l0aW9uKCk7IH1cbiAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuZW9mKSB9XG5cbiAgaWYgKGN1ckNvbnRleHQub3ZlcnJpZGUpIHsgcmV0dXJuIGN1ckNvbnRleHQub3ZlcnJpZGUodGhpcykgfVxuICBlbHNlIHsgdGhpcy5yZWFkVG9rZW4odGhpcy5mdWxsQ2hhckNvZGVBdFBvcygpKTsgfVxufTtcblxucHAucmVhZFRva2VuID0gZnVuY3Rpb24oY29kZSkge1xuICAvLyBJZGVudGlmaWVyIG9yIGtleXdvcmQuICdcXHVYWFhYJyBzZXF1ZW5jZXMgYXJlIGFsbG93ZWQgaW5cbiAgLy8gaWRlbnRpZmllcnMsIHNvICdcXCcgYWxzbyBkaXNwYXRjaGVzIHRvIHRoYXQuXG4gIGlmIChpc0lkZW50aWZpZXJTdGFydChjb2RlLCB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikgfHwgY29kZSA9PT0gOTIgLyogJ1xcJyAqLylcbiAgICB7IHJldHVybiB0aGlzLnJlYWRXb3JkKCkgfVxuXG4gIHJldHVybiB0aGlzLmdldFRva2VuRnJvbUNvZGUoY29kZSlcbn07XG5cbnBwLmZ1bGxDaGFyQ29kZUF0ID0gZnVuY3Rpb24ocG9zKSB7XG4gIHZhciBjb2RlID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHBvcyk7XG4gIGlmIChjb2RlIDw9IDB4ZDdmZiB8fCBjb2RlID49IDB4ZGMwMCkgeyByZXR1cm4gY29kZSB9XG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHBvcyArIDEpO1xuICByZXR1cm4gbmV4dCA8PSAweGRiZmYgfHwgbmV4dCA+PSAweGUwMDAgPyBjb2RlIDogKGNvZGUgPDwgMTApICsgbmV4dCAtIDB4MzVmZGMwMFxufTtcblxucHAuZnVsbENoYXJDb2RlQXRQb3MgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZnVsbENoYXJDb2RlQXQodGhpcy5wb3MpXG59O1xuXG5wcC5za2lwQmxvY2tDb21tZW50ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzdGFydExvYyA9IHRoaXMub3B0aW9ucy5vbkNvbW1lbnQgJiYgdGhpcy5jdXJQb3NpdGlvbigpO1xuICB2YXIgc3RhcnQgPSB0aGlzLnBvcywgZW5kID0gdGhpcy5pbnB1dC5pbmRleE9mKFwiKi9cIiwgdGhpcy5wb3MgKz0gMik7XG4gIGlmIChlbmQgPT09IC0xKSB7IHRoaXMucmFpc2UodGhpcy5wb3MgLSAyLCBcIlVudGVybWluYXRlZCBjb21tZW50XCIpOyB9XG4gIHRoaXMucG9zID0gZW5kICsgMjtcbiAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHtcbiAgICBmb3IgKHZhciBuZXh0QnJlYWsgPSAodm9pZCAwKSwgcG9zID0gc3RhcnQ7IChuZXh0QnJlYWsgPSBuZXh0TGluZUJyZWFrKHRoaXMuaW5wdXQsIHBvcywgdGhpcy5wb3MpKSA+IC0xOykge1xuICAgICAgKyt0aGlzLmN1ckxpbmU7XG4gICAgICBwb3MgPSB0aGlzLmxpbmVTdGFydCA9IG5leHRCcmVhaztcbiAgICB9XG4gIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5vbkNvbW1lbnQpXG4gICAgeyB0aGlzLm9wdGlvbnMub25Db21tZW50KHRydWUsIHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQgKyAyLCBlbmQpLCBzdGFydCwgdGhpcy5wb3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydExvYywgdGhpcy5jdXJQb3NpdGlvbigpKTsgfVxufTtcblxucHAuc2tpcExpbmVDb21tZW50ID0gZnVuY3Rpb24oc3RhcnRTa2lwKSB7XG4gIHZhciBzdGFydCA9IHRoaXMucG9zO1xuICB2YXIgc3RhcnRMb2MgPSB0aGlzLm9wdGlvbnMub25Db21tZW50ICYmIHRoaXMuY3VyUG9zaXRpb24oKTtcbiAgdmFyIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICs9IHN0YXJ0U2tpcCk7XG4gIHdoaWxlICh0aGlzLnBvcyA8IHRoaXMuaW5wdXQubGVuZ3RoICYmICFpc05ld0xpbmUoY2gpKSB7XG4gICAgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQoKyt0aGlzLnBvcyk7XG4gIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5vbkNvbW1lbnQpXG4gICAgeyB0aGlzLm9wdGlvbnMub25Db21tZW50KGZhbHNlLCB0aGlzLmlucHV0LnNsaWNlKHN0YXJ0ICsgc3RhcnRTa2lwLCB0aGlzLnBvcyksIHN0YXJ0LCB0aGlzLnBvcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TG9jLCB0aGlzLmN1clBvc2l0aW9uKCkpOyB9XG59O1xuXG4vLyBDYWxsZWQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBwYXJzZSBhbmQgYWZ0ZXIgZXZlcnkgdG9rZW4uIFNraXBzXG4vLyB3aGl0ZXNwYWNlIGFuZCBjb21tZW50cywgYW5kLlxuXG5wcC5za2lwU3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgbG9vcDogd2hpbGUgKHRoaXMucG9zIDwgdGhpcy5pbnB1dC5sZW5ndGgpIHtcbiAgICB2YXIgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpO1xuICAgIHN3aXRjaCAoY2gpIHtcbiAgICBjYXNlIDMyOiBjYXNlIDE2MDogLy8gJyAnXG4gICAgICArK3RoaXMucG9zO1xuICAgICAgYnJlYWtcbiAgICBjYXNlIDEzOlxuICAgICAgaWYgKHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpID09PSAxMCkge1xuICAgICAgICArK3RoaXMucG9zO1xuICAgICAgfVxuICAgIGNhc2UgMTA6IGNhc2UgODIzMjogY2FzZSA4MjMzOlxuICAgICAgKyt0aGlzLnBvcztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7XG4gICAgICAgICsrdGhpcy5jdXJMaW5lO1xuICAgICAgICB0aGlzLmxpbmVTdGFydCA9IHRoaXMucG9zO1xuICAgICAgfVxuICAgICAgYnJlYWtcbiAgICBjYXNlIDQ3OiAvLyAnLydcbiAgICAgIHN3aXRjaCAodGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSkpIHtcbiAgICAgIGNhc2UgNDI6IC8vICcqJ1xuICAgICAgICB0aGlzLnNraXBCbG9ja0NvbW1lbnQoKTtcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDc6XG4gICAgICAgIHRoaXMuc2tpcExpbmVDb21tZW50KDIpO1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWsgbG9vcFxuICAgICAgfVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgaWYgKGNoID4gOCAmJiBjaCA8IDE0IHx8IGNoID49IDU3NjAgJiYgbm9uQVNDSUl3aGl0ZXNwYWNlLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjaCkpKSB7XG4gICAgICAgICsrdGhpcy5wb3M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhayBsb29wXG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyBDYWxsZWQgYXQgdGhlIGVuZCBvZiBldmVyeSB0b2tlbi4gU2V0cyBgZW5kYCwgYHZhbGAsIGFuZFxuLy8gbWFpbnRhaW5zIGBjb250ZXh0YCBhbmQgYGV4cHJBbGxvd2VkYCwgYW5kIHNraXBzIHRoZSBzcGFjZSBhZnRlclxuLy8gdGhlIHRva2VuLCBzbyB0aGF0IHRoZSBuZXh0IG9uZSdzIGBzdGFydGAgd2lsbCBwb2ludCBhdCB0aGVcbi8vIHJpZ2h0IHBvc2l0aW9uLlxuXG5wcC5maW5pc2hUb2tlbiA9IGZ1bmN0aW9uKHR5cGUsIHZhbCkge1xuICB0aGlzLmVuZCA9IHRoaXMucG9zO1xuICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykgeyB0aGlzLmVuZExvYyA9IHRoaXMuY3VyUG9zaXRpb24oKTsgfVxuICB2YXIgcHJldlR5cGUgPSB0aGlzLnR5cGU7XG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMudmFsdWUgPSB2YWw7XG5cbiAgdGhpcy51cGRhdGVDb250ZXh0KHByZXZUeXBlKTtcbn07XG5cbi8vICMjIyBUb2tlbiByZWFkaW5nXG5cbi8vIFRoaXMgaXMgdGhlIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIHRvIGZldGNoIHRoZSBuZXh0IHRva2VuLiBJdFxuLy8gaXMgc29tZXdoYXQgb2JzY3VyZSwgYmVjYXVzZSBpdCB3b3JrcyBpbiBjaGFyYWN0ZXIgY29kZXMgcmF0aGVyXG4vLyB0aGFuIGNoYXJhY3RlcnMsIGFuZCBiZWNhdXNlIG9wZXJhdG9yIHBhcnNpbmcgaGFzIGJlZW4gaW5saW5lZFxuLy8gaW50byBpdC5cbi8vXG4vLyBBbGwgaW4gdGhlIG5hbWUgb2Ygc3BlZWQuXG4vL1xucHAucmVhZFRva2VuX2RvdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICBpZiAobmV4dCA+PSA0OCAmJiBuZXh0IDw9IDU3KSB7IHJldHVybiB0aGlzLnJlYWROdW1iZXIodHJ1ZSkgfVxuICB2YXIgbmV4dDIgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIG5leHQgPT09IDQ2ICYmIG5leHQyID09PSA0NikgeyAvLyA0NiA9IGRvdCAnLidcbiAgICB0aGlzLnBvcyArPSAzO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuZWxsaXBzaXMpXG4gIH0gZWxzZSB7XG4gICAgKyt0aGlzLnBvcztcbiAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmRvdClcbiAgfVxufTtcblxucHAucmVhZFRva2VuX3NsYXNoID0gZnVuY3Rpb24oKSB7IC8vICcvJ1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICBpZiAodGhpcy5leHByQWxsb3dlZCkgeyArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5yZWFkUmVnZXhwKCkgfVxuICBpZiAobmV4dCA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIDIpIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5zbGFzaCwgMSlcbn07XG5cbnBwLnJlYWRUb2tlbl9tdWx0X21vZHVsb19leHAgPSBmdW5jdGlvbihjb2RlKSB7IC8vICclKidcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgdmFyIHNpemUgPSAxO1xuICB2YXIgdG9rZW50eXBlID0gY29kZSA9PT0gNDIgPyB0eXBlcyQxLnN0YXIgOiB0eXBlcyQxLm1vZHVsbztcblxuICAvLyBleHBvbmVudGlhdGlvbiBvcGVyYXRvciAqKiBhbmQgKio9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNyAmJiBjb2RlID09PSA0MiAmJiBuZXh0ID09PSA0Mikge1xuICAgICsrc2l6ZTtcbiAgICB0b2tlbnR5cGUgPSB0eXBlcyQxLnN0YXJzdGFyO1xuICAgIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKTtcbiAgfVxuXG4gIGlmIChuZXh0ID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgc2l6ZSArIDEpIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AodG9rZW50eXBlLCBzaXplKVxufTtcblxucHAucmVhZFRva2VuX3BpcGVfYW1wID0gZnVuY3Rpb24oY29kZSkgeyAvLyAnfCYnXG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIGlmIChuZXh0ID09PSBjb2RlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMikge1xuICAgICAgdmFyIG5leHQyID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMik7XG4gICAgICBpZiAobmV4dDIgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCAzKSB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaE9wKGNvZGUgPT09IDEyNCA/IHR5cGVzJDEubG9naWNhbE9SIDogdHlwZXMkMS5sb2dpY2FsQU5ELCAyKVxuICB9XG4gIGlmIChuZXh0ID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgMikgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcChjb2RlID09PSAxMjQgPyB0eXBlcyQxLmJpdHdpc2VPUiA6IHR5cGVzJDEuYml0d2lzZUFORCwgMSlcbn07XG5cbnBwLnJlYWRUb2tlbl9jYXJldCA9IGZ1bmN0aW9uKCkgeyAvLyAnXidcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgaWYgKG5leHQgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCAyKSB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYml0d2lzZVhPUiwgMSlcbn07XG5cbnBwLnJlYWRUb2tlbl9wbHVzX21pbiA9IGZ1bmN0aW9uKGNvZGUpIHsgLy8gJystJ1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICBpZiAobmV4dCA9PT0gY29kZSkge1xuICAgIGlmIChuZXh0ID09PSA0NSAmJiAhdGhpcy5pbk1vZHVsZSAmJiB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKSA9PT0gNjIgJiZcbiAgICAgICAgKHRoaXMubGFzdFRva0VuZCA9PT0gMCB8fCBsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMubGFzdFRva0VuZCwgdGhpcy5wb3MpKSkpIHtcbiAgICAgIC8vIEEgYC0tPmAgbGluZSBjb21tZW50XG4gICAgICB0aGlzLnNraXBMaW5lQ29tbWVudCgzKTtcbiAgICAgIHRoaXMuc2tpcFNwYWNlKCk7XG4gICAgICByZXR1cm4gdGhpcy5uZXh0VG9rZW4oKVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmluY0RlYywgMilcbiAgfVxuICBpZiAobmV4dCA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIDIpIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5wbHVzTWluLCAxKVxufTtcblxucHAucmVhZFRva2VuX2x0X2d0ID0gZnVuY3Rpb24oY29kZSkgeyAvLyAnPD4nXG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIHZhciBzaXplID0gMTtcbiAgaWYgKG5leHQgPT09IGNvZGUpIHtcbiAgICBzaXplID0gY29kZSA9PT0gNjIgJiYgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMikgPT09IDYyID8gMyA6IDI7XG4gICAgaWYgKHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIHNpemUpID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgc2l6ZSArIDEpIH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmJpdFNoaWZ0LCBzaXplKVxuICB9XG4gIGlmIChuZXh0ID09PSAzMyAmJiBjb2RlID09PSA2MCAmJiAhdGhpcy5pbk1vZHVsZSAmJiB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKSA9PT0gNDUgJiZcbiAgICAgIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDMpID09PSA0NSkge1xuICAgIC8vIGA8IS0tYCwgYW4gWE1MLXN0eWxlIGNvbW1lbnQgdGhhdCBzaG91bGQgYmUgaW50ZXJwcmV0ZWQgYXMgYSBsaW5lIGNvbW1lbnRcbiAgICB0aGlzLnNraXBMaW5lQ29tbWVudCg0KTtcbiAgICB0aGlzLnNraXBTcGFjZSgpO1xuICAgIHJldHVybiB0aGlzLm5leHRUb2tlbigpXG4gIH1cbiAgaWYgKG5leHQgPT09IDYxKSB7IHNpemUgPSAyOyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEucmVsYXRpb25hbCwgc2l6ZSlcbn07XG5cbnBwLnJlYWRUb2tlbl9lcV9leGNsID0gZnVuY3Rpb24oY29kZSkgeyAvLyAnPSEnXG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIGlmIChuZXh0ID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmVxdWFsaXR5LCB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKSA9PT0gNjEgPyAzIDogMikgfVxuICBpZiAoY29kZSA9PT0gNjEgJiYgbmV4dCA9PT0gNjIgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHsgLy8gJz0+J1xuICAgIHRoaXMucG9zICs9IDI7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5hcnJvdylcbiAgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcChjb2RlID09PSA2MSA/IHR5cGVzJDEuZXEgOiB0eXBlcyQxLnByZWZpeCwgMSlcbn07XG5cbnBwLnJlYWRUb2tlbl9xdWVzdGlvbiA9IGZ1bmN0aW9uKCkgeyAvLyAnPydcbiAgdmFyIGVjbWFWZXJzaW9uID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uO1xuICBpZiAoZWNtYVZlcnNpb24gPj0gMTEpIHtcbiAgICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICAgIGlmIChuZXh0ID09PSA0Nikge1xuICAgICAgdmFyIG5leHQyID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMik7XG4gICAgICBpZiAobmV4dDIgPCA0OCB8fCBuZXh0MiA+IDU3KSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEucXVlc3Rpb25Eb3QsIDIpIH1cbiAgICB9XG4gICAgaWYgKG5leHQgPT09IDYzKSB7XG4gICAgICBpZiAoZWNtYVZlcnNpb24gPj0gMTIpIHtcbiAgICAgICAgdmFyIG5leHQyJDEgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKTtcbiAgICAgICAgaWYgKG5leHQyJDEgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCAzKSB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmNvYWxlc2NlLCAyKVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLnF1ZXN0aW9uLCAxKVxufTtcblxucHAucmVhZFRva2VuX251bWJlclNpZ24gPSBmdW5jdGlvbigpIHsgLy8gJyMnXG4gIHZhciBlY21hVmVyc2lvbiA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbjtcbiAgdmFyIGNvZGUgPSAzNTsgLy8gJyMnXG4gIGlmIChlY21hVmVyc2lvbiA+PSAxMykge1xuICAgICsrdGhpcy5wb3M7XG4gICAgY29kZSA9IHRoaXMuZnVsbENoYXJDb2RlQXRQb3MoKTtcbiAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY29kZSwgdHJ1ZSkgfHwgY29kZSA9PT0gOTIgLyogJ1xcJyAqLykge1xuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5wcml2YXRlSWQsIHRoaXMucmVhZFdvcmQxKCkpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5yYWlzZSh0aGlzLnBvcywgXCJVbmV4cGVjdGVkIGNoYXJhY3RlciAnXCIgKyBjb2RlUG9pbnRUb1N0cmluZyhjb2RlKSArIFwiJ1wiKTtcbn07XG5cbnBwLmdldFRva2VuRnJvbUNvZGUgPSBmdW5jdGlvbihjb2RlKSB7XG4gIHN3aXRjaCAoY29kZSkge1xuICAvLyBUaGUgaW50ZXJwcmV0YXRpb24gb2YgYSBkb3QgZGVwZW5kcyBvbiB3aGV0aGVyIGl0IGlzIGZvbGxvd2VkXG4gIC8vIGJ5IGEgZGlnaXQgb3IgYW5vdGhlciB0d28gZG90cy5cbiAgY2FzZSA0NjogLy8gJy4nXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX2RvdCgpXG5cbiAgLy8gUHVuY3R1YXRpb24gdG9rZW5zLlxuICBjYXNlIDQwOiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLnBhcmVuTClcbiAgY2FzZSA0MTogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5wYXJlblIpXG4gIGNhc2UgNTk6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuc2VtaSlcbiAgY2FzZSA0NDogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5jb21tYSlcbiAgY2FzZSA5MTogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5icmFja2V0TClcbiAgY2FzZSA5MzogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5icmFja2V0UilcbiAgY2FzZSAxMjM6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuYnJhY2VMKVxuICBjYXNlIDEyNTogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5icmFjZVIpXG4gIGNhc2UgNTg6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuY29sb24pXG5cbiAgY2FzZSA5NjogLy8gJ2AnXG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDYpIHsgYnJlYWsgfVxuICAgICsrdGhpcy5wb3M7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5iYWNrUXVvdGUpXG5cbiAgY2FzZSA0ODogLy8gJzAnXG4gICAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgICBpZiAobmV4dCA9PT0gMTIwIHx8IG5leHQgPT09IDg4KSB7IHJldHVybiB0aGlzLnJlYWRSYWRpeE51bWJlcigxNikgfSAvLyAnMHgnLCAnMFgnIC0gaGV4IG51bWJlclxuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikge1xuICAgICAgaWYgKG5leHQgPT09IDExMSB8fCBuZXh0ID09PSA3OSkgeyByZXR1cm4gdGhpcy5yZWFkUmFkaXhOdW1iZXIoOCkgfSAvLyAnMG8nLCAnME8nIC0gb2N0YWwgbnVtYmVyXG4gICAgICBpZiAobmV4dCA9PT0gOTggfHwgbmV4dCA9PT0gNjYpIHsgcmV0dXJuIHRoaXMucmVhZFJhZGl4TnVtYmVyKDIpIH0gLy8gJzBiJywgJzBCJyAtIGJpbmFyeSBudW1iZXJcbiAgICB9XG5cbiAgLy8gQW55dGhpbmcgZWxzZSBiZWdpbm5pbmcgd2l0aCBhIGRpZ2l0IGlzIGFuIGludGVnZXIsIG9jdGFsXG4gIC8vIG51bWJlciwgb3IgZmxvYXQuXG4gIGNhc2UgNDk6IGNhc2UgNTA6IGNhc2UgNTE6IGNhc2UgNTI6IGNhc2UgNTM6IGNhc2UgNTQ6IGNhc2UgNTU6IGNhc2UgNTY6IGNhc2UgNTc6IC8vIDEtOVxuICAgIHJldHVybiB0aGlzLnJlYWROdW1iZXIoZmFsc2UpXG5cbiAgLy8gUXVvdGVzIHByb2R1Y2Ugc3RyaW5ncy5cbiAgY2FzZSAzNDogY2FzZSAzOTogLy8gJ1wiJywgXCInXCJcbiAgICByZXR1cm4gdGhpcy5yZWFkU3RyaW5nKGNvZGUpXG5cbiAgLy8gT3BlcmF0b3JzIGFyZSBwYXJzZWQgaW5saW5lIGluIHRpbnkgc3RhdGUgbWFjaGluZXMuICc9JyAoNjEpIGlzXG4gIC8vIG9mdGVuIHJlZmVycmVkIHRvLiBgZmluaXNoT3BgIHNpbXBseSBza2lwcyB0aGUgYW1vdW50IG9mXG4gIC8vIGNoYXJhY3RlcnMgaXQgaXMgZ2l2ZW4gYXMgc2Vjb25kIGFyZ3VtZW50LCBhbmQgcmV0dXJucyBhIHRva2VuXG4gIC8vIG9mIHRoZSB0eXBlIGdpdmVuIGJ5IGl0cyBmaXJzdCBhcmd1bWVudC5cbiAgY2FzZSA0NzogLy8gJy8nXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX3NsYXNoKClcblxuICBjYXNlIDM3OiBjYXNlIDQyOiAvLyAnJSonXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX211bHRfbW9kdWxvX2V4cChjb2RlKVxuXG4gIGNhc2UgMTI0OiBjYXNlIDM4OiAvLyAnfCYnXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX3BpcGVfYW1wKGNvZGUpXG5cbiAgY2FzZSA5NDogLy8gJ14nXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX2NhcmV0KClcblxuICBjYXNlIDQzOiBjYXNlIDQ1OiAvLyAnKy0nXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX3BsdXNfbWluKGNvZGUpXG5cbiAgY2FzZSA2MDogY2FzZSA2MjogLy8gJzw+J1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9sdF9ndChjb2RlKVxuXG4gIGNhc2UgNjE6IGNhc2UgMzM6IC8vICc9ISdcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fZXFfZXhjbChjb2RlKVxuXG4gIGNhc2UgNjM6IC8vICc/J1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9xdWVzdGlvbigpXG5cbiAgY2FzZSAxMjY6IC8vICd+J1xuICAgIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEucHJlZml4LCAxKVxuXG4gIGNhc2UgMzU6IC8vICcjJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9udW1iZXJTaWduKClcbiAgfVxuXG4gIHRoaXMucmFpc2UodGhpcy5wb3MsIFwiVW5leHBlY3RlZCBjaGFyYWN0ZXIgJ1wiICsgY29kZVBvaW50VG9TdHJpbmcoY29kZSkgKyBcIidcIik7XG59O1xuXG5wcC5maW5pc2hPcCA9IGZ1bmN0aW9uKHR5cGUsIHNpemUpIHtcbiAgdmFyIHN0ciA9IHRoaXMuaW5wdXQuc2xpY2UodGhpcy5wb3MsIHRoaXMucG9zICsgc2l6ZSk7XG4gIHRoaXMucG9zICs9IHNpemU7XG4gIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGUsIHN0cilcbn07XG5cbnBwLnJlYWRSZWdleHAgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGVzY2FwZWQsIGluQ2xhc3MsIHN0YXJ0ID0gdGhpcy5wb3M7XG4gIGZvciAoOzspIHtcbiAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5pbnB1dC5sZW5ndGgpIHsgdGhpcy5yYWlzZShzdGFydCwgXCJVbnRlcm1pbmF0ZWQgcmVndWxhciBleHByZXNzaW9uXCIpOyB9XG4gICAgdmFyIGNoID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgIGlmIChsaW5lQnJlYWsudGVzdChjaCkpIHsgdGhpcy5yYWlzZShzdGFydCwgXCJVbnRlcm1pbmF0ZWQgcmVndWxhciBleHByZXNzaW9uXCIpOyB9XG4gICAgaWYgKCFlc2NhcGVkKSB7XG4gICAgICBpZiAoY2ggPT09IFwiW1wiKSB7IGluQ2xhc3MgPSB0cnVlOyB9XG4gICAgICBlbHNlIGlmIChjaCA9PT0gXCJdXCIgJiYgaW5DbGFzcykgeyBpbkNsYXNzID0gZmFsc2U7IH1cbiAgICAgIGVsc2UgaWYgKGNoID09PSBcIi9cIiAmJiAhaW5DbGFzcykgeyBicmVhayB9XG4gICAgICBlc2NhcGVkID0gY2ggPT09IFwiXFxcXFwiO1xuICAgIH0gZWxzZSB7IGVzY2FwZWQgPSBmYWxzZTsgfVxuICAgICsrdGhpcy5wb3M7XG4gIH1cbiAgdmFyIHBhdHRlcm4gPSB0aGlzLmlucHV0LnNsaWNlKHN0YXJ0LCB0aGlzLnBvcyk7XG4gICsrdGhpcy5wb3M7XG4gIHZhciBmbGFnc1N0YXJ0ID0gdGhpcy5wb3M7XG4gIHZhciBmbGFncyA9IHRoaXMucmVhZFdvcmQxKCk7XG4gIGlmICh0aGlzLmNvbnRhaW5zRXNjKSB7IHRoaXMudW5leHBlY3RlZChmbGFnc1N0YXJ0KTsgfVxuXG4gIC8vIFZhbGlkYXRlIHBhdHRlcm5cbiAgdmFyIHN0YXRlID0gdGhpcy5yZWdleHBTdGF0ZSB8fCAodGhpcy5yZWdleHBTdGF0ZSA9IG5ldyBSZWdFeHBWYWxpZGF0aW9uU3RhdGUodGhpcykpO1xuICBzdGF0ZS5yZXNldChzdGFydCwgcGF0dGVybiwgZmxhZ3MpO1xuICB0aGlzLnZhbGlkYXRlUmVnRXhwRmxhZ3Moc3RhdGUpO1xuICB0aGlzLnZhbGlkYXRlUmVnRXhwUGF0dGVybihzdGF0ZSk7XG5cbiAgLy8gQ3JlYXRlIExpdGVyYWwjdmFsdWUgcHJvcGVydHkgdmFsdWUuXG4gIHZhciB2YWx1ZSA9IG51bGw7XG4gIHRyeSB7XG4gICAgdmFsdWUgPSBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIEVTVHJlZSByZXF1aXJlcyBudWxsIGlmIGl0IGZhaWxlZCB0byBpbnN0YW50aWF0ZSBSZWdFeHAgb2JqZWN0LlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9lc3RyZWUvZXN0cmVlL2Jsb2IvYTI3MDAzYWRmNGZkN2JmYWQ0NGRlOWNlZjM3MmEyZWFjZDUyN2IxYy9lczUubWQjcmVnZXhwbGl0ZXJhbFxuICB9XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5yZWdleHAsIHtwYXR0ZXJuOiBwYXR0ZXJuLCBmbGFnczogZmxhZ3MsIHZhbHVlOiB2YWx1ZX0pXG59O1xuXG4vLyBSZWFkIGFuIGludGVnZXIgaW4gdGhlIGdpdmVuIHJhZGl4LiBSZXR1cm4gbnVsbCBpZiB6ZXJvIGRpZ2l0c1xuLy8gd2VyZSByZWFkLCB0aGUgaW50ZWdlciB2YWx1ZSBvdGhlcndpc2UuIFdoZW4gYGxlbmAgaXMgZ2l2ZW4sIHRoaXNcbi8vIHdpbGwgcmV0dXJuIGBudWxsYCB1bmxlc3MgdGhlIGludGVnZXIgaGFzIGV4YWN0bHkgYGxlbmAgZGlnaXRzLlxuXG5wcC5yZWFkSW50ID0gZnVuY3Rpb24ocmFkaXgsIGxlbiwgbWF5YmVMZWdhY3lPY3RhbE51bWVyaWNMaXRlcmFsKSB7XG4gIC8vIGBsZW5gIGlzIHVzZWQgZm9yIGNoYXJhY3RlciBlc2NhcGUgc2VxdWVuY2VzLiBJbiB0aGF0IGNhc2UsIGRpc2FsbG93IHNlcGFyYXRvcnMuXG4gIHZhciBhbGxvd1NlcGFyYXRvcnMgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTIgJiYgbGVuID09PSB1bmRlZmluZWQ7XG5cbiAgLy8gYG1heWJlTGVnYWN5T2N0YWxOdW1lcmljTGl0ZXJhbGAgaXMgdHJ1ZSBpZiBpdCBkb2Vzbid0IGhhdmUgcHJlZml4ICgweCwwbywwYilcbiAgLy8gYW5kIGlzbid0IGZyYWN0aW9uIHBhcnQgbm9yIGV4cG9uZW50IHBhcnQuIEluIHRoYXQgY2FzZSwgaWYgdGhlIGZpcnN0IGRpZ2l0XG4gIC8vIGlzIHplcm8gdGhlbiBkaXNhbGxvdyBzZXBhcmF0b3JzLlxuICB2YXIgaXNMZWdhY3lPY3RhbE51bWVyaWNMaXRlcmFsID0gbWF5YmVMZWdhY3lPY3RhbE51bWVyaWNMaXRlcmFsICYmIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcykgPT09IDQ4O1xuXG4gIHZhciBzdGFydCA9IHRoaXMucG9zLCB0b3RhbCA9IDAsIGxhc3RDb2RlID0gMDtcbiAgZm9yICh2YXIgaSA9IDAsIGUgPSBsZW4gPT0gbnVsbCA/IEluZmluaXR5IDogbGVuOyBpIDwgZTsgKytpLCArK3RoaXMucG9zKSB7XG4gICAgdmFyIGNvZGUgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpLCB2YWwgPSAodm9pZCAwKTtcblxuICAgIGlmIChhbGxvd1NlcGFyYXRvcnMgJiYgY29kZSA9PT0gOTUpIHtcbiAgICAgIGlmIChpc0xlZ2FjeU9jdGFsTnVtZXJpY0xpdGVyYWwpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMucG9zLCBcIk51bWVyaWMgc2VwYXJhdG9yIGlzIG5vdCBhbGxvd2VkIGluIGxlZ2FjeSBvY3RhbCBudW1lcmljIGxpdGVyYWxzXCIpOyB9XG4gICAgICBpZiAobGFzdENvZGUgPT09IDk1KSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnBvcywgXCJOdW1lcmljIHNlcGFyYXRvciBtdXN0IGJlIGV4YWN0bHkgb25lIHVuZGVyc2NvcmVcIik7IH1cbiAgICAgIGlmIChpID09PSAwKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnBvcywgXCJOdW1lcmljIHNlcGFyYXRvciBpcyBub3QgYWxsb3dlZCBhdCB0aGUgZmlyc3Qgb2YgZGlnaXRzXCIpOyB9XG4gICAgICBsYXN0Q29kZSA9IGNvZGU7XG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGlmIChjb2RlID49IDk3KSB7IHZhbCA9IGNvZGUgLSA5NyArIDEwOyB9IC8vIGFcbiAgICBlbHNlIGlmIChjb2RlID49IDY1KSB7IHZhbCA9IGNvZGUgLSA2NSArIDEwOyB9IC8vIEFcbiAgICBlbHNlIGlmIChjb2RlID49IDQ4ICYmIGNvZGUgPD0gNTcpIHsgdmFsID0gY29kZSAtIDQ4OyB9IC8vIDAtOVxuICAgIGVsc2UgeyB2YWwgPSBJbmZpbml0eTsgfVxuICAgIGlmICh2YWwgPj0gcmFkaXgpIHsgYnJlYWsgfVxuICAgIGxhc3RDb2RlID0gY29kZTtcbiAgICB0b3RhbCA9IHRvdGFsICogcmFkaXggKyB2YWw7XG4gIH1cblxuICBpZiAoYWxsb3dTZXBhcmF0b3JzICYmIGxhc3RDb2RlID09PSA5NSkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5wb3MgLSAxLCBcIk51bWVyaWMgc2VwYXJhdG9yIGlzIG5vdCBhbGxvd2VkIGF0IHRoZSBsYXN0IG9mIGRpZ2l0c1wiKTsgfVxuICBpZiAodGhpcy5wb3MgPT09IHN0YXJ0IHx8IGxlbiAhPSBudWxsICYmIHRoaXMucG9zIC0gc3RhcnQgIT09IGxlbikgeyByZXR1cm4gbnVsbCB9XG5cbiAgcmV0dXJuIHRvdGFsXG59O1xuXG5mdW5jdGlvbiBzdHJpbmdUb051bWJlcihzdHIsIGlzTGVnYWN5T2N0YWxOdW1lcmljTGl0ZXJhbCkge1xuICBpZiAoaXNMZWdhY3lPY3RhbE51bWVyaWNMaXRlcmFsKSB7XG4gICAgcmV0dXJuIHBhcnNlSW50KHN0ciwgOClcbiAgfVxuXG4gIC8vIGBwYXJzZUZsb2F0KHZhbHVlKWAgc3RvcHMgcGFyc2luZyBhdCB0aGUgZmlyc3QgbnVtZXJpYyBzZXBhcmF0b3IgdGhlbiByZXR1cm5zIGEgd3JvbmcgdmFsdWUuXG4gIHJldHVybiBwYXJzZUZsb2F0KHN0ci5yZXBsYWNlKC9fL2csIFwiXCIpKVxufVxuXG5mdW5jdGlvbiBzdHJpbmdUb0JpZ0ludChzdHIpIHtcbiAgaWYgKHR5cGVvZiBCaWdJbnQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJldHVybiBudWxsXG4gIH1cblxuICAvLyBgQmlnSW50KHZhbHVlKWAgdGhyb3dzIHN5bnRheCBlcnJvciBpZiB0aGUgc3RyaW5nIGNvbnRhaW5zIG51bWVyaWMgc2VwYXJhdG9ycy5cbiAgcmV0dXJuIEJpZ0ludChzdHIucmVwbGFjZSgvXy9nLCBcIlwiKSlcbn1cblxucHAucmVhZFJhZGl4TnVtYmVyID0gZnVuY3Rpb24ocmFkaXgpIHtcbiAgdmFyIHN0YXJ0ID0gdGhpcy5wb3M7XG4gIHRoaXMucG9zICs9IDI7IC8vIDB4XG4gIHZhciB2YWwgPSB0aGlzLnJlYWRJbnQocmFkaXgpO1xuICBpZiAodmFsID09IG51bGwpIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0ICsgMiwgXCJFeHBlY3RlZCBudW1iZXIgaW4gcmFkaXggXCIgKyByYWRpeCk7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMSAmJiB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpID09PSAxMTApIHtcbiAgICB2YWwgPSBzdHJpbmdUb0JpZ0ludCh0aGlzLmlucHV0LnNsaWNlKHN0YXJ0LCB0aGlzLnBvcykpO1xuICAgICsrdGhpcy5wb3M7XG4gIH0gZWxzZSBpZiAoaXNJZGVudGlmaWVyU3RhcnQodGhpcy5mdWxsQ2hhckNvZGVBdFBvcygpKSkgeyB0aGlzLnJhaXNlKHRoaXMucG9zLCBcIklkZW50aWZpZXIgZGlyZWN0bHkgYWZ0ZXIgbnVtYmVyXCIpOyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEubnVtLCB2YWwpXG59O1xuXG4vLyBSZWFkIGFuIGludGVnZXIsIG9jdGFsIGludGVnZXIsIG9yIGZsb2F0aW5nLXBvaW50IG51bWJlci5cblxucHAucmVhZE51bWJlciA9IGZ1bmN0aW9uKHN0YXJ0c1dpdGhEb3QpIHtcbiAgdmFyIHN0YXJ0ID0gdGhpcy5wb3M7XG4gIGlmICghc3RhcnRzV2l0aERvdCAmJiB0aGlzLnJlYWRJbnQoMTAsIHVuZGVmaW5lZCwgdHJ1ZSkgPT09IG51bGwpIHsgdGhpcy5yYWlzZShzdGFydCwgXCJJbnZhbGlkIG51bWJlclwiKTsgfVxuICB2YXIgb2N0YWwgPSB0aGlzLnBvcyAtIHN0YXJ0ID49IDIgJiYgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHN0YXJ0KSA9PT0gNDg7XG4gIGlmIChvY3RhbCAmJiB0aGlzLnN0cmljdCkgeyB0aGlzLnJhaXNlKHN0YXJ0LCBcIkludmFsaWQgbnVtYmVyXCIpOyB9XG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKTtcbiAgaWYgKCFvY3RhbCAmJiAhc3RhcnRzV2l0aERvdCAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTEgJiYgbmV4dCA9PT0gMTEwKSB7XG4gICAgdmFyIHZhbCQxID0gc3RyaW5nVG9CaWdJbnQodGhpcy5pbnB1dC5zbGljZShzdGFydCwgdGhpcy5wb3MpKTtcbiAgICArK3RoaXMucG9zO1xuICAgIGlmIChpc0lkZW50aWZpZXJTdGFydCh0aGlzLmZ1bGxDaGFyQ29kZUF0UG9zKCkpKSB7IHRoaXMucmFpc2UodGhpcy5wb3MsIFwiSWRlbnRpZmllciBkaXJlY3RseSBhZnRlciBudW1iZXJcIik7IH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLm51bSwgdmFsJDEpXG4gIH1cbiAgaWYgKG9jdGFsICYmIC9bODldLy50ZXN0KHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQsIHRoaXMucG9zKSkpIHsgb2N0YWwgPSBmYWxzZTsgfVxuICBpZiAobmV4dCA9PT0gNDYgJiYgIW9jdGFsKSB7IC8vICcuJ1xuICAgICsrdGhpcy5wb3M7XG4gICAgdGhpcy5yZWFkSW50KDEwKTtcbiAgICBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKTtcbiAgfVxuICBpZiAoKG5leHQgPT09IDY5IHx8IG5leHQgPT09IDEwMSkgJiYgIW9jdGFsKSB7IC8vICdlRSdcbiAgICBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KCsrdGhpcy5wb3MpO1xuICAgIGlmIChuZXh0ID09PSA0MyB8fCBuZXh0ID09PSA0NSkgeyArK3RoaXMucG9zOyB9IC8vICcrLSdcbiAgICBpZiAodGhpcy5yZWFkSW50KDEwKSA9PT0gbnVsbCkgeyB0aGlzLnJhaXNlKHN0YXJ0LCBcIkludmFsaWQgbnVtYmVyXCIpOyB9XG4gIH1cbiAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KHRoaXMuZnVsbENoYXJDb2RlQXRQb3MoKSkpIHsgdGhpcy5yYWlzZSh0aGlzLnBvcywgXCJJZGVudGlmaWVyIGRpcmVjdGx5IGFmdGVyIG51bWJlclwiKTsgfVxuXG4gIHZhciB2YWwgPSBzdHJpbmdUb051bWJlcih0aGlzLmlucHV0LnNsaWNlKHN0YXJ0LCB0aGlzLnBvcyksIG9jdGFsKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5udW0sIHZhbClcbn07XG5cbi8vIFJlYWQgYSBzdHJpbmcgdmFsdWUsIGludGVycHJldGluZyBiYWNrc2xhc2gtZXNjYXBlcy5cblxucHAucmVhZENvZGVQb2ludCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpLCBjb2RlO1xuXG4gIGlmIChjaCA9PT0gMTIzKSB7IC8vICd7J1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA2KSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgdmFyIGNvZGVQb3MgPSArK3RoaXMucG9zO1xuICAgIGNvZGUgPSB0aGlzLnJlYWRIZXhDaGFyKHRoaXMuaW5wdXQuaW5kZXhPZihcIn1cIiwgdGhpcy5wb3MpIC0gdGhpcy5wb3MpO1xuICAgICsrdGhpcy5wb3M7XG4gICAgaWYgKGNvZGUgPiAweDEwRkZGRikgeyB0aGlzLmludmFsaWRTdHJpbmdUb2tlbihjb2RlUG9zLCBcIkNvZGUgcG9pbnQgb3V0IG9mIGJvdW5kc1wiKTsgfVxuICB9IGVsc2Uge1xuICAgIGNvZGUgPSB0aGlzLnJlYWRIZXhDaGFyKDQpO1xuICB9XG4gIHJldHVybiBjb2RlXG59O1xuXG5wcC5yZWFkU3RyaW5nID0gZnVuY3Rpb24ocXVvdGUpIHtcbiAgdmFyIG91dCA9IFwiXCIsIGNodW5rU3RhcnQgPSArK3RoaXMucG9zO1xuICBmb3IgKDs7KSB7XG4gICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50XCIpOyB9XG4gICAgdmFyIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKTtcbiAgICBpZiAoY2ggPT09IHF1b3RlKSB7IGJyZWFrIH1cbiAgICBpZiAoY2ggPT09IDkyKSB7IC8vICdcXCdcbiAgICAgIG91dCArPSB0aGlzLmlucHV0LnNsaWNlKGNodW5rU3RhcnQsIHRoaXMucG9zKTtcbiAgICAgIG91dCArPSB0aGlzLnJlYWRFc2NhcGVkQ2hhcihmYWxzZSk7XG4gICAgICBjaHVua1N0YXJ0ID0gdGhpcy5wb3M7XG4gICAgfSBlbHNlIGlmIChjaCA9PT0gMHgyMDI4IHx8IGNoID09PSAweDIwMjkpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCAxMCkgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudFwiKTsgfVxuICAgICAgKyt0aGlzLnBvcztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7XG4gICAgICAgIHRoaXMuY3VyTGluZSsrO1xuICAgICAgICB0aGlzLmxpbmVTdGFydCA9IHRoaXMucG9zO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaXNOZXdMaW5lKGNoKSkgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudFwiKTsgfVxuICAgICAgKyt0aGlzLnBvcztcbiAgICB9XG4gIH1cbiAgb3V0ICs9IHRoaXMuaW5wdXQuc2xpY2UoY2h1bmtTdGFydCwgdGhpcy5wb3MrKyk7XG4gIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuc3RyaW5nLCBvdXQpXG59O1xuXG4vLyBSZWFkcyB0ZW1wbGF0ZSBzdHJpbmcgdG9rZW5zLlxuXG52YXIgSU5WQUxJRF9URU1QTEFURV9FU0NBUEVfRVJST1IgPSB7fTtcblxucHAudHJ5UmVhZFRlbXBsYXRlVG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5pblRlbXBsYXRlRWxlbWVudCA9IHRydWU7XG4gIHRyeSB7XG4gICAgdGhpcy5yZWFkVG1wbFRva2VuKCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgPT09IElOVkFMSURfVEVNUExBVEVfRVNDQVBFX0VSUk9SKSB7XG4gICAgICB0aGlzLnJlYWRJbnZhbGlkVGVtcGxhdGVUb2tlbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG4gIH1cblxuICB0aGlzLmluVGVtcGxhdGVFbGVtZW50ID0gZmFsc2U7XG59O1xuXG5wcC5pbnZhbGlkU3RyaW5nVG9rZW4gPSBmdW5jdGlvbihwb3NpdGlvbiwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5pblRlbXBsYXRlRWxlbWVudCAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSkge1xuICAgIHRocm93IElOVkFMSURfVEVNUExBVEVfRVNDQVBFX0VSUk9SXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5yYWlzZShwb3NpdGlvbiwgbWVzc2FnZSk7XG4gIH1cbn07XG5cbnBwLnJlYWRUbXBsVG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIG91dCA9IFwiXCIsIGNodW5rU3RhcnQgPSB0aGlzLnBvcztcbiAgZm9yICg7Oykge1xuICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmlucHV0Lmxlbmd0aCkgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHRlbXBsYXRlXCIpOyB9XG4gICAgdmFyIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKTtcbiAgICBpZiAoY2ggPT09IDk2IHx8IGNoID09PSAzNiAmJiB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKSA9PT0gMTIzKSB7IC8vICdgJywgJyR7J1xuICAgICAgaWYgKHRoaXMucG9zID09PSB0aGlzLnN0YXJ0ICYmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEudGVtcGxhdGUgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLmludmFsaWRUZW1wbGF0ZSkpIHtcbiAgICAgICAgaWYgKGNoID09PSAzNikge1xuICAgICAgICAgIHRoaXMucG9zICs9IDI7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5kb2xsYXJCcmFjZUwpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKyt0aGlzLnBvcztcbiAgICAgICAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmJhY2tRdW90ZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb3V0ICs9IHRoaXMuaW5wdXQuc2xpY2UoY2h1bmtTdGFydCwgdGhpcy5wb3MpO1xuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS50ZW1wbGF0ZSwgb3V0KVxuICAgIH1cbiAgICBpZiAoY2ggPT09IDkyKSB7IC8vICdcXCdcbiAgICAgIG91dCArPSB0aGlzLmlucHV0LnNsaWNlKGNodW5rU3RhcnQsIHRoaXMucG9zKTtcbiAgICAgIG91dCArPSB0aGlzLnJlYWRFc2NhcGVkQ2hhcih0cnVlKTtcbiAgICAgIGNodW5rU3RhcnQgPSB0aGlzLnBvcztcbiAgICB9IGVsc2UgaWYgKGlzTmV3TGluZShjaCkpIHtcbiAgICAgIG91dCArPSB0aGlzLmlucHV0LnNsaWNlKGNodW5rU3RhcnQsIHRoaXMucG9zKTtcbiAgICAgICsrdGhpcy5wb3M7XG4gICAgICBzd2l0Y2ggKGNoKSB7XG4gICAgICBjYXNlIDEzOlxuICAgICAgICBpZiAodGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKSA9PT0gMTApIHsgKyt0aGlzLnBvczsgfVxuICAgICAgY2FzZSAxMDpcbiAgICAgICAgb3V0ICs9IFwiXFxuXCI7XG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjaCk7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykge1xuICAgICAgICArK3RoaXMuY3VyTGluZTtcbiAgICAgICAgdGhpcy5saW5lU3RhcnQgPSB0aGlzLnBvcztcbiAgICAgIH1cbiAgICAgIGNodW5rU3RhcnQgPSB0aGlzLnBvcztcbiAgICB9IGVsc2Uge1xuICAgICAgKyt0aGlzLnBvcztcbiAgICB9XG4gIH1cbn07XG5cbi8vIFJlYWRzIGEgdGVtcGxhdGUgdG9rZW4gdG8gc2VhcmNoIGZvciB0aGUgZW5kLCB3aXRob3V0IHZhbGlkYXRpbmcgYW55IGVzY2FwZSBzZXF1ZW5jZXNcbnBwLnJlYWRJbnZhbGlkVGVtcGxhdGVUb2tlbiA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKDsgdGhpcy5wb3MgPCB0aGlzLmlucHV0Lmxlbmd0aDsgdGhpcy5wb3MrKykge1xuICAgIHN3aXRjaCAodGhpcy5pbnB1dFt0aGlzLnBvc10pIHtcbiAgICBjYXNlIFwiXFxcXFwiOlxuICAgICAgKyt0aGlzLnBvcztcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiJFwiOlxuICAgICAgaWYgKHRoaXMuaW5wdXRbdGhpcy5wb3MgKyAxXSAhPT0gXCJ7XCIpIHsgYnJlYWsgfVxuICAgICAgLy8gZmFsbCB0aHJvdWdoXG4gICAgY2FzZSBcImBcIjpcbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuaW52YWxpZFRlbXBsYXRlLCB0aGlzLmlucHV0LnNsaWNlKHRoaXMuc3RhcnQsIHRoaXMucG9zKSlcblxuICAgIGNhc2UgXCJcXHJcIjpcbiAgICAgIGlmICh0aGlzLmlucHV0W3RoaXMucG9zICsgMV0gPT09IFwiXFxuXCIpIHsgKyt0aGlzLnBvczsgfVxuICAgICAgLy8gZmFsbCB0aHJvdWdoXG4gICAgY2FzZSBcIlxcblwiOiBjYXNlIFwiXFx1MjAyOFwiOiBjYXNlIFwiXFx1MjAyOVwiOlxuICAgICAgKyt0aGlzLmN1ckxpbmU7XG4gICAgICB0aGlzLmxpbmVTdGFydCA9IHRoaXMucG9zICsgMTtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJVbnRlcm1pbmF0ZWQgdGVtcGxhdGVcIik7XG59O1xuXG4vLyBVc2VkIHRvIHJlYWQgZXNjYXBlZCBjaGFyYWN0ZXJzXG5cbnBwLnJlYWRFc2NhcGVkQ2hhciA9IGZ1bmN0aW9uKGluVGVtcGxhdGUpIHtcbiAgdmFyIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KCsrdGhpcy5wb3MpO1xuICArK3RoaXMucG9zO1xuICBzd2l0Y2ggKGNoKSB7XG4gIGNhc2UgMTEwOiByZXR1cm4gXCJcXG5cIiAvLyAnbicgLT4gJ1xcbidcbiAgY2FzZSAxMTQ6IHJldHVybiBcIlxcclwiIC8vICdyJyAtPiAnXFxyJ1xuICBjYXNlIDEyMDogcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUodGhpcy5yZWFkSGV4Q2hhcigyKSkgLy8gJ3gnXG4gIGNhc2UgMTE3OiByZXR1cm4gY29kZVBvaW50VG9TdHJpbmcodGhpcy5yZWFkQ29kZVBvaW50KCkpIC8vICd1J1xuICBjYXNlIDExNjogcmV0dXJuIFwiXFx0XCIgLy8gJ3QnIC0+ICdcXHQnXG4gIGNhc2UgOTg6IHJldHVybiBcIlxcYlwiIC8vICdiJyAtPiAnXFxiJ1xuICBjYXNlIDExODogcmV0dXJuIFwiXFx1MDAwYlwiIC8vICd2JyAtPiAnXFx1MDAwYidcbiAgY2FzZSAxMDI6IHJldHVybiBcIlxcZlwiIC8vICdmJyAtPiAnXFxmJ1xuICBjYXNlIDEzOiBpZiAodGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKSA9PT0gMTApIHsgKyt0aGlzLnBvczsgfSAvLyAnXFxyXFxuJ1xuICBjYXNlIDEwOiAvLyAnIFxcbidcbiAgICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykgeyB0aGlzLmxpbmVTdGFydCA9IHRoaXMucG9zOyArK3RoaXMuY3VyTGluZTsgfVxuICAgIHJldHVybiBcIlwiXG4gIGNhc2UgNTY6XG4gIGNhc2UgNTc6XG4gICAgaWYgKHRoaXMuc3RyaWN0KSB7XG4gICAgICB0aGlzLmludmFsaWRTdHJpbmdUb2tlbihcbiAgICAgICAgdGhpcy5wb3MgLSAxLFxuICAgICAgICBcIkludmFsaWQgZXNjYXBlIHNlcXVlbmNlXCJcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChpblRlbXBsYXRlKSB7XG4gICAgICB2YXIgY29kZVBvcyA9IHRoaXMucG9zIC0gMTtcblxuICAgICAgdGhpcy5pbnZhbGlkU3RyaW5nVG9rZW4oXG4gICAgICAgIGNvZGVQb3MsXG4gICAgICAgIFwiSW52YWxpZCBlc2NhcGUgc2VxdWVuY2UgaW4gdGVtcGxhdGUgc3RyaW5nXCJcbiAgICAgICk7XG4gICAgfVxuICBkZWZhdWx0OlxuICAgIGlmIChjaCA+PSA0OCAmJiBjaCA8PSA1NSkge1xuICAgICAgdmFyIG9jdGFsU3RyID0gdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5wb3MgLSAxLCAzKS5tYXRjaCgvXlswLTddKy8pWzBdO1xuICAgICAgdmFyIG9jdGFsID0gcGFyc2VJbnQob2N0YWxTdHIsIDgpO1xuICAgICAgaWYgKG9jdGFsID4gMjU1KSB7XG4gICAgICAgIG9jdGFsU3RyID0gb2N0YWxTdHIuc2xpY2UoMCwgLTEpO1xuICAgICAgICBvY3RhbCA9IHBhcnNlSW50KG9jdGFsU3RyLCA4KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucG9zICs9IG9jdGFsU3RyLmxlbmd0aCAtIDE7XG4gICAgICBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gICAgICBpZiAoKG9jdGFsU3RyICE9PSBcIjBcIiB8fCBjaCA9PT0gNTYgfHwgY2ggPT09IDU3KSAmJiAodGhpcy5zdHJpY3QgfHwgaW5UZW1wbGF0ZSkpIHtcbiAgICAgICAgdGhpcy5pbnZhbGlkU3RyaW5nVG9rZW4oXG4gICAgICAgICAgdGhpcy5wb3MgLSAxIC0gb2N0YWxTdHIubGVuZ3RoLFxuICAgICAgICAgIGluVGVtcGxhdGVcbiAgICAgICAgICAgID8gXCJPY3RhbCBsaXRlcmFsIGluIHRlbXBsYXRlIHN0cmluZ1wiXG4gICAgICAgICAgICA6IFwiT2N0YWwgbGl0ZXJhbCBpbiBzdHJpY3QgbW9kZVwiXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShvY3RhbClcbiAgICB9XG4gICAgaWYgKGlzTmV3TGluZShjaCkpIHtcbiAgICAgIC8vIFVuaWNvZGUgbmV3IGxpbmUgY2hhcmFjdGVycyBhZnRlciBcXCBnZXQgcmVtb3ZlZCBmcm9tIG91dHB1dCBpbiBib3RoXG4gICAgICAvLyB0ZW1wbGF0ZSBsaXRlcmFscyBhbmQgc3RyaW5nc1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHsgdGhpcy5saW5lU3RhcnQgPSB0aGlzLnBvczsgKyt0aGlzLmN1ckxpbmU7IH1cbiAgICAgIHJldHVybiBcIlwiXG4gICAgfVxuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKVxuICB9XG59O1xuXG4vLyBVc2VkIHRvIHJlYWQgY2hhcmFjdGVyIGVzY2FwZSBzZXF1ZW5jZXMgKCdcXHgnLCAnXFx1JywgJ1xcVScpLlxuXG5wcC5yZWFkSGV4Q2hhciA9IGZ1bmN0aW9uKGxlbikge1xuICB2YXIgY29kZVBvcyA9IHRoaXMucG9zO1xuICB2YXIgbiA9IHRoaXMucmVhZEludCgxNiwgbGVuKTtcbiAgaWYgKG4gPT09IG51bGwpIHsgdGhpcy5pbnZhbGlkU3RyaW5nVG9rZW4oY29kZVBvcywgXCJCYWQgY2hhcmFjdGVyIGVzY2FwZSBzZXF1ZW5jZVwiKTsgfVxuICByZXR1cm4gblxufTtcblxuLy8gUmVhZCBhbiBpZGVudGlmaWVyLCBhbmQgcmV0dXJuIGl0IGFzIGEgc3RyaW5nLiBTZXRzIGB0aGlzLmNvbnRhaW5zRXNjYFxuLy8gdG8gd2hldGhlciB0aGUgd29yZCBjb250YWluZWQgYSAnXFx1JyBlc2NhcGUuXG4vL1xuLy8gSW5jcmVtZW50YWxseSBhZGRzIG9ubHkgZXNjYXBlZCBjaGFycywgYWRkaW5nIG90aGVyIGNodW5rcyBhcy1pc1xuLy8gYXMgYSBtaWNyby1vcHRpbWl6YXRpb24uXG5cbnBwLnJlYWRXb3JkMSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNvbnRhaW5zRXNjID0gZmFsc2U7XG4gIHZhciB3b3JkID0gXCJcIiwgZmlyc3QgPSB0cnVlLCBjaHVua1N0YXJ0ID0gdGhpcy5wb3M7XG4gIHZhciBhc3RyYWwgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNjtcbiAgd2hpbGUgKHRoaXMucG9zIDwgdGhpcy5pbnB1dC5sZW5ndGgpIHtcbiAgICB2YXIgY2ggPSB0aGlzLmZ1bGxDaGFyQ29kZUF0UG9zKCk7XG4gICAgaWYgKGlzSWRlbnRpZmllckNoYXIoY2gsIGFzdHJhbCkpIHtcbiAgICAgIHRoaXMucG9zICs9IGNoIDw9IDB4ZmZmZiA/IDEgOiAyO1xuICAgIH0gZWxzZSBpZiAoY2ggPT09IDkyKSB7IC8vIFwiXFxcIlxuICAgICAgdGhpcy5jb250YWluc0VzYyA9IHRydWU7XG4gICAgICB3b3JkICs9IHRoaXMuaW5wdXQuc2xpY2UoY2h1bmtTdGFydCwgdGhpcy5wb3MpO1xuICAgICAgdmFyIGVzY1N0YXJ0ID0gdGhpcy5wb3M7XG4gICAgICBpZiAodGhpcy5pbnB1dC5jaGFyQ29kZUF0KCsrdGhpcy5wb3MpICE9PSAxMTcpIC8vIFwidVwiXG4gICAgICAgIHsgdGhpcy5pbnZhbGlkU3RyaW5nVG9rZW4odGhpcy5wb3MsIFwiRXhwZWN0aW5nIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlIFxcXFx1WFhYWFwiKTsgfVxuICAgICAgKyt0aGlzLnBvcztcbiAgICAgIHZhciBlc2MgPSB0aGlzLnJlYWRDb2RlUG9pbnQoKTtcbiAgICAgIGlmICghKGZpcnN0ID8gaXNJZGVudGlmaWVyU3RhcnQgOiBpc0lkZW50aWZpZXJDaGFyKShlc2MsIGFzdHJhbCkpXG4gICAgICAgIHsgdGhpcy5pbnZhbGlkU3RyaW5nVG9rZW4oZXNjU3RhcnQsIFwiSW52YWxpZCBVbmljb2RlIGVzY2FwZVwiKTsgfVxuICAgICAgd29yZCArPSBjb2RlUG9pbnRUb1N0cmluZyhlc2MpO1xuICAgICAgY2h1bmtTdGFydCA9IHRoaXMucG9zO1xuICAgIH0gZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgICBmaXJzdCA9IGZhbHNlO1xuICB9XG4gIHJldHVybiB3b3JkICsgdGhpcy5pbnB1dC5zbGljZShjaHVua1N0YXJ0LCB0aGlzLnBvcylcbn07XG5cbi8vIFJlYWQgYW4gaWRlbnRpZmllciBvciBrZXl3b3JkIHRva2VuLiBXaWxsIGNoZWNrIGZvciByZXNlcnZlZFxuLy8gd29yZHMgd2hlbiBuZWNlc3NhcnkuXG5cbnBwLnJlYWRXb3JkID0gZnVuY3Rpb24oKSB7XG4gIHZhciB3b3JkID0gdGhpcy5yZWFkV29yZDEoKTtcbiAgdmFyIHR5cGUgPSB0eXBlcyQxLm5hbWU7XG4gIGlmICh0aGlzLmtleXdvcmRzLnRlc3Qod29yZCkpIHtcbiAgICB0eXBlID0ga2V5d29yZHNbd29yZF07XG4gIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZSwgd29yZClcbn07XG5cbi8vIEFjb3JuIGlzIGEgdGlueSwgZmFzdCBKYXZhU2NyaXB0IHBhcnNlciB3cml0dGVuIGluIEphdmFTY3JpcHQuXG4vL1xuLy8gQWNvcm4gd2FzIHdyaXR0ZW4gYnkgTWFyaWpuIEhhdmVyYmVrZSwgSW5ndmFyIFN0ZXBhbnlhbiwgYW5kXG4vLyB2YXJpb3VzIGNvbnRyaWJ1dG9ycyBhbmQgcmVsZWFzZWQgdW5kZXIgYW4gTUlUIGxpY2Vuc2UuXG4vL1xuLy8gR2l0IHJlcG9zaXRvcmllcyBmb3IgQWNvcm4gYXJlIGF2YWlsYWJsZSBhdFxuLy9cbi8vICAgICBodHRwOi8vbWFyaWpuaGF2ZXJiZWtlLm5sL2dpdC9hY29yblxuLy8gICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9hY29ybmpzL2Fjb3JuLmdpdFxuLy9cbi8vIFBsZWFzZSB1c2UgdGhlIFtnaXRodWIgYnVnIHRyYWNrZXJdW2doYnRdIHRvIHJlcG9ydCBpc3N1ZXMuXG4vL1xuLy8gW2doYnRdOiBodHRwczovL2dpdGh1Yi5jb20vYWNvcm5qcy9hY29ybi9pc3N1ZXNcblxuXG52YXIgdmVyc2lvbiA9IFwiOC4xNi4wXCI7XG5cblBhcnNlci5hY29ybiA9IHtcbiAgUGFyc2VyOiBQYXJzZXIsXG4gIHZlcnNpb246IHZlcnNpb24sXG4gIGRlZmF1bHRPcHRpb25zOiBkZWZhdWx0T3B0aW9ucyxcbiAgUG9zaXRpb246IFBvc2l0aW9uLFxuICBTb3VyY2VMb2NhdGlvbjogU291cmNlTG9jYXRpb24sXG4gIGdldExpbmVJbmZvOiBnZXRMaW5lSW5mbyxcbiAgTm9kZTogTm9kZSxcbiAgVG9rZW5UeXBlOiBUb2tlblR5cGUsXG4gIHRva1R5cGVzOiB0eXBlcyQxLFxuICBrZXl3b3JkVHlwZXM6IGtleXdvcmRzLFxuICBUb2tDb250ZXh0OiBUb2tDb250ZXh0LFxuICB0b2tDb250ZXh0czogdHlwZXMsXG4gIGlzSWRlbnRpZmllckNoYXI6IGlzSWRlbnRpZmllckNoYXIsXG4gIGlzSWRlbnRpZmllclN0YXJ0OiBpc0lkZW50aWZpZXJTdGFydCxcbiAgVG9rZW46IFRva2VuLFxuICBpc05ld0xpbmU6IGlzTmV3TGluZSxcbiAgbGluZUJyZWFrOiBsaW5lQnJlYWssXG4gIGxpbmVCcmVha0c6IGxpbmVCcmVha0csXG4gIG5vbkFTQ0lJd2hpdGVzcGFjZTogbm9uQVNDSUl3aGl0ZXNwYWNlXG59O1xuXG4vLyBUaGUgbWFpbiBleHBvcnRlZCBpbnRlcmZhY2UgKHVuZGVyIGBzZWxmLmFjb3JuYCB3aGVuIGluIHRoZVxuLy8gYnJvd3NlcikgaXMgYSBgcGFyc2VgIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBjb2RlIHN0cmluZyBhbmQgcmV0dXJuc1xuLy8gYW4gYWJzdHJhY3Qgc3ludGF4IHRyZWUgYXMgc3BlY2lmaWVkIGJ5IHRoZSBbRVNUcmVlIHNwZWNdW2VzdHJlZV0uXG4vL1xuLy8gW2VzdHJlZV06IGh0dHBzOi8vZ2l0aHViLmNvbS9lc3RyZWUvZXN0cmVlXG5cbmZ1bmN0aW9uIHBhcnNlKGlucHV0LCBvcHRpb25zKSB7XG4gIHJldHVybiBQYXJzZXIucGFyc2UoaW5wdXQsIG9wdGlvbnMpXG59XG5cbi8vIFRoaXMgZnVuY3Rpb24gdHJpZXMgdG8gcGFyc2UgYSBzaW5nbGUgZXhwcmVzc2lvbiBhdCBhIGdpdmVuXG4vLyBvZmZzZXQgaW4gYSBzdHJpbmcuIFVzZWZ1bCBmb3IgcGFyc2luZyBtaXhlZC1sYW5ndWFnZSBmb3JtYXRzXG4vLyB0aGF0IGVtYmVkIEphdmFTY3JpcHQgZXhwcmVzc2lvbnMuXG5cbmZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbkF0KGlucHV0LCBwb3MsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIFBhcnNlci5wYXJzZUV4cHJlc3Npb25BdChpbnB1dCwgcG9zLCBvcHRpb25zKVxufVxuXG4vLyBBY29ybiBpcyBvcmdhbml6ZWQgYXMgYSB0b2tlbml6ZXIgYW5kIGEgcmVjdXJzaXZlLWRlc2NlbnQgcGFyc2VyLlxuLy8gVGhlIGB0b2tlbml6ZXJgIGV4cG9ydCBwcm92aWRlcyBhbiBpbnRlcmZhY2UgdG8gdGhlIHRva2VuaXplci5cblxuZnVuY3Rpb24gdG9rZW5pemVyKGlucHV0LCBvcHRpb25zKSB7XG4gIHJldHVybiBQYXJzZXIudG9rZW5pemVyKGlucHV0LCBvcHRpb25zKVxufVxuXG5leHBvcnQgeyBOb2RlLCBQYXJzZXIsIFBvc2l0aW9uLCBTb3VyY2VMb2NhdGlvbiwgVG9rQ29udGV4dCwgVG9rZW4sIFRva2VuVHlwZSwgZGVmYXVsdE9wdGlvbnMsIGdldExpbmVJbmZvLCBpc0lkZW50aWZpZXJDaGFyLCBpc0lkZW50aWZpZXJTdGFydCwgaXNOZXdMaW5lLCBrZXl3b3JkcyBhcyBrZXl3b3JkVHlwZXMsIGxpbmVCcmVhaywgbGluZUJyZWFrRywgbm9uQVNDSUl3aGl0ZXNwYWNlLCBwYXJzZSwgcGFyc2VFeHByZXNzaW9uQXQsIHR5cGVzIGFzIHRva0NvbnRleHRzLCB0eXBlcyQxIGFzIHRva1R5cGVzLCB0b2tlbml6ZXIsIHZlcnNpb24gfTtcbiIsICJpbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJub2RlOmZzL3Byb21pc2VzXCI7XG5pbXBvcnQgdHlwZSB7UnVubmVyLEZvbGRlcixGaWxlbmFtZSxMc3RyLFBvcyxSdW5uZXJCYXNlfSBmcm9tICcuL2RhdGEuanMnXG5pbXBvcnQge3BhcnNlRXhwcmVzc2lvbkF0LCB0eXBlIE5vZGUsdHlwZSBFeHByZXNzaW9uLHR5cGUgU3ByZWFkRWxlbWVudCwgdHlwZSBQcm9wZXJ0eX0gZnJvbSBcImFjb3JuXCJcbmltcG9ydCB7XG4gIHR5cGUgczJ0LFxuICByZXNldCxcbiAgZ3JlZW4sXG4gIHBrLFxuICBnZXRfZXJyb3IsXG4gIGlzX29iamVjdCxcbiAgaXNfYXRvbSxcbiAgZGVmYXVsdF9nZXRcbn0gZnJvbSBcIkB5aWdhbC9iYXNlX3R5cGVzXCI7XG5pbnRlcmZhY2UgQWNvcm5TeW50YXhFcnJvciBleHRlbmRzIFN5bnRheEVycm9yIHtcbiAgcG9zOiBudW1iZXI7ICAgICAgICAvLyBzYW1lIGFzIHJhaXNlZEF0XG4gIHJhaXNlZEF0OiBudW1iZXI7ICAgLy8gaW5kZXggaW4gc291cmNlIHN0cmluZyB3aGVyZSBlcnJvciBvY2N1cnJlZFxuICBsb2M/OiB7XG4gICAgbGluZTogbnVtYmVyO1xuICAgIGNvbHVtbjogbnVtYmVyO1xuICB9O1xufVxuZnVuY3Rpb24gaXNfYWNvcm5fZXJyb3IoZTogdW5rbm93bik6ZSBpcyBBY29yblN5bnRheEVycm9yIHtcbiAgcmV0dXJuIChcbiAgICBlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IgJiZcbiAgICB0eXBlb2YgKGUgYXMgQWNvcm5TeW50YXhFcnJvcikucmFpc2VkQXQgPT09IFwibnVtYmVyXCJcbiAgKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBmaW5kX2Jhc2Uocm9vdDpGb2xkZXIsaWQ6c3RyaW5nKXtcbiAgZnVuY3Rpb24gZihmb2xkZXI6Rm9sZGVyKTpSdW5uZXJCYXNlfHVuZGVmaW5lZHtcbiAgICBmb3IgKGNvbnN0IGFyIG9mIFtmb2xkZXIucnVubmVycyxmb2xkZXIuZXJyb3JzLGZvbGRlci5mb2xkZXJzXSl7XG4gICAgICBjb25zdCBhbnM9YXIuZmluZCh4PT54LmlkPT09aWQpXG4gICAgICBpZiAoYW5zIT1udWxsKVxuICAgICAgICByZXR1cm4gYW5zXG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3ViZm9sZGVyIG9mIGZvbGRlci5mb2xkZXJzKXtcbiAgICAgIGNvbnN0IGFucz1mKHN1YmZvbGRlcilcbiAgICAgIGlmIChhbnMhPW51bGwpXG4gICAgICAgIHJldHVybiBhbnNcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGYocm9vdClcbn1cbmV4cG9ydCBmdW5jdGlvbiBmaW5kX3J1bm5lcihyb290OkZvbGRlcixpZDpzdHJpbmcpe1xuICBmdW5jdGlvbiBmKGZvbGRlcjpGb2xkZXIpOlJ1bm5lcnx1bmRlZmluZWR7XG4gICAgY29uc3QgYW5zPWZvbGRlci5ydW5uZXJzLmZpbmQoeD0+eC5pZD09PWlkKVxuICAgIGlmIChhbnMhPW51bGwpXG4gICAgICByZXR1cm4gYW5zXG4gICAgZm9yIChjb25zdCBzdWJmb2xkZXIgb2YgZm9sZGVyLmZvbGRlcnMpe1xuICAgICAgY29uc3QgYW5zPWYoc3ViZm9sZGVyKVxuICAgICAgaWYgKGFucyE9bnVsbClcbiAgICAgICAgcmV0dXJuIGFuc1xuICAgIH1cbiAgfVxuICByZXR1cm4gZihyb290KVxufVxuZnVuY3Rpb24gaXNfbGl0ZXJhbChhc3Q6RXhwcmVzc2lvbixsaXRlcmFsOnN0cmluZyl7XG4gIGlmIChhc3QudHlwZT09PSdMaXRlcmFsJyAmJiBhc3QudmFsdWU9PT1saXRlcmFsKVxuICAgIHJldHVybiB0cnVlXG59XG5mdW5jdGlvbiBmaW5kX3Byb3AoYXN0OkV4cHJlc3Npb24sbmFtZTpzdHJpbmcpe1xuICBpZiAoYXN0LnR5cGUhPT0nT2JqZWN0RXhwcmVzc2lvbicpXG4gICAgcmV0dXJuXG4gIC8vY29uc29sZS5sb2coYXN0KVxuICBmb3IgKGNvbnN0IHByb3Agb2YgYXN0LnByb3BlcnRpZXMpXG4gICAgaWYgKHByb3AudHlwZT09PSdQcm9wZXJ0eScgJiYgaXNfbGl0ZXJhbChwcm9wLmtleSxuYW1lKSlcbiAgICAgIHJldHVybiBwcm9wLnZhbHVlXG59XG4gY2xhc3MgQXN0RXhjZXB0aW9uIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyAgYXN0OiBOb2RlfExzdHJcbiAgKXtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSBcIkFzdEV4Y2VwdGlvblwiO1xuICB9XG59XG5mdW5jdGlvbiByZWFkX3Byb3AoYXN0OlByb3BlcnR5fFNwcmVhZEVsZW1lbnQpe1xuICAgIGlmIChcbiAgICAgIGFzdC50eXBlIT09XCJQcm9wZXJ0eVwiIHx8IFxuICAgICAgYXN0LmtleS50eXBlIT09J0xpdGVyYWwnIHx8IFxuICAgICAgYXN0LnZhbHVlLnR5cGUhPT0nTGl0ZXJhbCcgfHwgXG4gICAgICB0eXBlb2YgYXN0LmtleS52YWx1ZSAhPT0nc3RyaW5nJyB8fFxuICAgICAgdHlwZW9mIGFzdC52YWx1ZS52YWx1ZSAhPT0nc3RyaW5nJ1xuICAgIClcbiAgICAgIHRocm93ICBuZXcgQXN0RXhjZXB0aW9uKCdleHBlY3RpbmcgXCJuYW1lXCI9XCJ2YWx1ZVwiJyxhc3QpXG4gICAgcmV0dXJuIHtrZXk6YXN0LmtleS52YWx1ZSxzdHI6YXN0LnZhbHVlLnZhbHVlLC4uLnBrKGFzdCwnc3RhcnQnLCdlbmQnKX1cbn1cbmZ1bmN0aW9uIHJlYWRfcHJvcF9hbnkoYXN0OlByb3BlcnR5fFNwcmVhZEVsZW1lbnQpe1xuICBpZiAoXG4gICAgYXN0LnR5cGUhPT1cIlByb3BlcnR5XCIgfHwgXG4gICAgYXN0LmtleS50eXBlIT09J0xpdGVyYWwnIHx8IFxuICAgIHR5cGVvZiBhc3Qua2V5LnZhbHVlICE9PSdzdHJpbmcnXG4gIClcbiAgICB0aHJvdyAgbmV3IEFzdEV4Y2VwdGlvbignZXhwZWN0aW5nIFwibmFtZVwiPXZhbHVlJyxhc3QpXG4gIHJldHVybiB7XG4gICAga2V5OmFzdC5rZXkudmFsdWUsXG4gICAgdmFsdWU6YXN0LnZhbHVlXG4gIH1cbn1cbmZ1bmN0aW9uIGdldF9lcnJheV9tYW5kYXRvcnkoYXN0OkV4cHJlc3Npb24sc291cmNlX2ZpbGU6c3RyaW5nKXtcbiAgY29uc3QgYW5zOkxzdHJbXT1bXSAgXG4gIGlmIChhc3QudHlwZT09PVwiQXJyYXlFeHByZXNzaW9uXCIpe1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBhc3QuZWxlbWVudHMpe1xuICAgICAgaWYgKGVsZW09PW51bGwpXG4gICAgICAgIHRocm93IG5ldyBBc3RFeGNlcHRpb24oJ251bGwgbm90IHN1cHBvcnRlZCBoZXJlJyxhc3QpXG4gICAgICBpZiAoZWxlbS50eXBlPT09XCJTcHJlYWRFbGVtZW50XCIpXG4gICAgICAgIHRocm93IG5ldyBBc3RFeGNlcHRpb24oJ3NwcmVhZCBlbGVtZW50IG5vdCBzdXBwb3J0ZWQgaGVyZScsZWxlbSlcbiAgICAgIGlmIChlbGVtLnR5cGUhPT0nTGl0ZXJhbCcgfHwgdHlwZW9mIGVsZW0udmFsdWUhPT0nc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEFzdEV4Y2VwdGlvbignZXhwZWN0aW5nIHN0cmluZyBoZXJlJyxlbGVtKVxuICAgICAgYW5zLnB1c2goe1xuICAgICAgICBzdHI6ZWxlbS52YWx1ZSxcbiAgICAgICAgc291cmNlX2ZpbGUsXG4gICAgICAgIC4uLnBrKGVsZW0sJ3N0YXJ0JywnZW5kJylcbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBhbnNcbiAgfVxuICB0aHJvdyBuZXcgQXN0RXhjZXB0aW9uKCdleHBlY3RpbmcgYXJyYXknLGFzdClcbn1cbmZ1bmN0aW9uIGdldF9hcnJheShhc3Q6RXhwcmVzc2lvbixzb3VyY2VfZmlsZTpzdHJpbmcpOkxzdHJbXXtcbiAgaWYgKGFzdC50eXBlPT09XCJMaXRlcmFsXCIgJiYgdHlwZW9mIGFzdC52YWx1ZSA9PT1cInN0cmluZ1wiKXtcbiAgICBjb25zdCBsb2NhdGlvbj17XG4gICAgICBzdHI6YXN0LnZhbHVlLFxuICAgICAgc291cmNlX2ZpbGUsXG4gICAgICAuLi5wayhhc3QsJ3N0YXJ0JywnZW5kJylcbiAgICB9XG4gICAgcmV0dXJuIFtsb2NhdGlvbl1cbiAgfVxuICByZXR1cm4gZ2V0X2VycmF5X21hbmRhdG9yeShhc3Qsc291cmNlX2ZpbGUpXG59XG5mdW5jdGlvbiBtYWtlX3VuaXF1ZShhcjpMc3RyW11bXSk6THN0cltde1xuICBjb25zdCBhbnM6czJ0PExzdHI+PXt9XG4gIGZvciAoY29uc3QgYSBvZiBhcilcbiAgICBmb3IgKGNvbnN0IGIgb2YgYSlcbiAgICAgIGFuc1tiLnN0cl09YlxuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhbnMpXG59XG5mdW5jdGlvbiBzdHJpcF8kKGE6THN0cil7XG4gIHJldHVybiB7Li4uYSxzdHI6YS5zdHIuc2xpY2UoMSl9XG59XG5mdW5jdGlvbiByZXNvbHZlX3ZhcnModmFyczpzMnQ8THN0cltdPixhc3Q6RXhwcmVzc2lvbil7XG4gICAgZnVuY3Rpb24gcmVzb2x2ZShhOkxzdHJ8THN0cltdKXtcbiAgICAgIGNvbnN0IHZpc2l0aW5nPW5ldyBTZXQ8c3RyaW5nPlxuICAgICAgZnVuY3Rpb24gZihhOkxzdHJ8THN0cltdKTpMc3RyW117XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGEpKVxuICAgICAgICAgIHJldHVybiBtYWtlX3VuaXF1ZShhLm1hcChmKSlcbiAgICAgICAgaWYgKCFhLnN0ci5zdGFydHNXaXRoKCckJykpXG4gICAgICAgICAgcmV0dXJuIFthXVxuICAgICAgICBhPXN0cmlwXyQoYSlcbiAgICAgICAgaWYgKHZpc2l0aW5nLmhhcyhhLnN0cikpXG4gICAgICAgICAgdGhyb3cgbmV3IEFzdEV4Y2VwdGlvbihgJHthLnN0cn06Y2lyY3VsYXIgcmVmZXJlbmNlYCxhc3QpXG4gICAgICAgIHZpc2l0aW5nLmFkZChhLnN0cilcbiAgICAgICAgY29uc3QgcmVmZXJlbmNlPXZhcnNbYS5zdHJdXG4gICAgICAgIGlmIChyZWZlcmVuY2U9PW51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEFzdEV4Y2VwdGlvbihgJHthLnN0cn0gdW5kZWZpbmVkYCxhKVxuICAgICAgICBjb25zdCBhbnMyPWYocmVmZXJlbmNlKVxuICAgICAgICB2aXNpdGluZy5kZWxldGUoYS5zdHIpXG4gICAgICAgIHJldHVybiBhbnMyXG4gICAgICB9XG4gICAgICByZXR1cm4gZihhKVxuICAgIH1cbiAgICBjb25zdCBhbnM6czJ0PExzdHJbXT49e30gICAgXG4gICAgZm9yIChjb25zdCBbayx2XSBvZiBPYmplY3QuZW50cmllcyh2YXJzKSl7XG4gICAgICBjb25zdCByZXNvbHZlZD1yZXNvbHZlKHYpXG4gICAgICBhbnNba109cmVzb2x2ZWRcbiAgICB9XG4gICAgcmV0dXJuIGFuc1xufVxuaW50ZXJmYWNlIFdhdGNoZXJze1xuICB3YXRjaGVzOnMydDxMc3RyW10+LFxuICB0YWdzOlJlY29yZDxzdHJpbmcsc3RyaW5nW10+XG59XG5mdW5jdGlvbiBjb2xsZWN0X3ZhcnMoYXN0OkV4cHJlc3Npb258dW5kZWZpbmVkLHNvdXJjZV9maWxlOnN0cmluZyl7XG4gIGNvbnN0IHZhcnM6czJ0PExzdHJbXT49e31cbiAgY29uc3Qgc2NyaXB0cz1uZXcgU2V0PHN0cmluZz4gICBcbiAgLy9jb25zdCBhbnM9e3ZhcnMsc2NyaXB0c31cbiAgaWYgKGFzdD09bnVsbClcbiAgICByZXR1cm4gdmFyc1xuICBpZiAoYXN0LnR5cGUhPT0nT2JqZWN0RXhwcmVzc2lvbicpXG4gICAgcmV0dXJuIHZhcnNcbiAgZm9yIChjb25zdCBwcm9wYXN0IG9mIGFzdC5wcm9wZXJ0aWVzKXtcbiAgICBjb25zdCB7a2V5LHZhbHVlfT1yZWFkX3Byb3BfYW55KHByb3Bhc3QpXG4gICAgY29uc3QgYXI9Z2V0X2FycmF5KHZhbHVlLHNvdXJjZV9maWxlKVxuICAgIGlmICh2YXJzW2tleV0hPT11bmRlZmluZWQpXG4gICAgICB0aHJvdyBuZXcgQXN0RXhjZXB0aW9uKGBkdXBsaWNhdGUgdmFsdWU6ICR7a2V5fWAscHJvcGFzdClcbiAgICBmb3IgKGNvbnN0IHN1Ymsgb2Yga2V5LnNwbGl0KCcsJykpeyAvL3NvIG11bHRpcGxlIHNjcmlwdHMgY2FuIGVhc2lseSBoYXZlIHRoZSBzYXZlIHdhdGNoZWRcbiAgICAgIHNjcmlwdHMuYWRkKHN1YmspXG4gICAgICB2YXJzW3N1YmtdPWFyXG4gICAgfVxuICB9XG4gIHJldHVybiB2YXJzXG59XG5mdW5jdGlvbiBtYWtlX2VtcHR5X2FycmF5KCl7XG4gIHJldHVybiBbXVxufVxuZnVuY3Rpb24gcGFyc2Vfd2F0Y2hlcnMoXG4gIGFzdDogRXhwcmVzc2lvbixcbiAgc291cmNlX2ZpbGU6c3RyaW5nXG4pOldhdGNoZXJzIHsgXG4gIGNvbnN0IHNjcmlwdHNtb249ZmluZF9wcm9wKGFzdCwnc2NyaXB0c21vbicpXG4gIGlmIChzY3JpcHRzbW9uPT1udWxsKXtcbiAgICByZXR1cm4ge1xuICAgICAgd2F0Y2hlczp7fSxcbiAgICAgIHRhZ3M6e31cbiAgICB9XG4gIH1cbiAgLy9jb25zdCBhdXRvd2F0Y2g9ZmluZF9wcm9wKHNjcmlwdHNtb24sJ2F1dG93YXRjaCcpXG4gIC8vY29uc3Qgd2F0Y2g9ZmluZF9wcm9wKHNjcmlwdHNtb24sJ3dhdGNoJylcbiAgY29uc3QgdmFycz1jb2xsZWN0X3ZhcnMoc2NyaXB0c21vbixzb3VyY2VfZmlsZSlcbiAgY29uc3Qgd2F0Y2hlcz1yZXNvbHZlX3ZhcnModmFycyxhc3QpXG4gIGNvbnN0IHRhZ3M9ZnVuY3Rpb24oKXtcbiAgICBjb25zdCBhbnM6UmVjb3JkPHN0cmluZyxzdHJpbmdbXT49e31cbiAgICAvL2xvb3Agb3ZlciBhbGwgbmFtZSwgZm9yIHRob3NlIHdobyBzdGFydCB3aXRoICMsIGxvb3Agb3ZlciB0aGUgcmVzdWx0IGFuZCBhZGQgdG8gYW5zXG4gICAgZm9yIChjb25zdCBbayxhcl0gb2YgT2JqZWN0LmVudHJpZXMod2F0Y2hlcykpe1xuICAgICAgaWYgKGsuc3RhcnRzV2l0aCgnIycpKXtcbiAgICAgICAgY29uc3QgdGFnPWsuc2xpY2UoMSlcbiAgICAgICAgZm9yIChjb25zdCBzY3JpcHQgb2YgYXIpe1xuICAgICAgICAgIGRlZmF1bHRfZ2V0KGFucyxzY3JpcHQuc3RyLG1ha2VfZW1wdHlfYXJyYXkpLnB1c2godGFnKVxuICAgICAgICB9XG4gICAgICAgIC8vY29udGludWVcbiAgICAgIH1cbiAgICAgIC8qaWYgKGFyLmxlbmd0aCE9PTApe1xuICAgICAgICBkZWZhdWx0X2dldChhbnMsayxtYWtlX2VtcHR5X2FycmF5KS5wdXNoKFwid2F0Y2hhYmxlXCIpXG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgICBkZWZhdWx0X2dldChhbnMgLGssbWFrZV9lbXB0eV9hcnJheSkucHVzaChcIm5vbndhdGNoYWJsZVwiKVxuICAgICAgfSovXG4gICAgfVxuICAgIHJldHVybiBhbnNcbiAgfSgpXG4gIHJldHVybiB7XG4gICAgd2F0Y2hlcyxcbiAgICB0YWdzXG4gIH1cbn1cbmZ1bmN0aW9uIHBhcnNlX3NjcmlwdHMyKFxuICBhc3Q6IEV4cHJlc3Npb24sXG4gIHNvdXJjZV9maWxlOnN0cmluZ1xuKTogczJ0PExzdHI+IHsgXG4gIGNvbnN0IGFuczpzMnQ8THN0cj49e31cbiAgY29uc3Qgc2NyaXB0cz1maW5kX3Byb3AoYXN0LCdzY3JpcHRzJylcbiAgaWYgKHNjcmlwdHM9PW51bGwpXG4gICAgcmV0dXJuIGFuc1xuICBpZiAoc2NyaXB0cy50eXBlIT09J09iamVjdEV4cHJlc3Npb24nKVxuICAgIHJldHVybiBhbnNcbiAgZm9yIChjb25zdCBwcm9wYXN0IG9mIHNjcmlwdHMucHJvcGVydGllcyl7XG4gICAgY29uc3Qge3N0YXJ0LGVuZCxrZXksc3RyfT1yZWFkX3Byb3AocHJvcGFzdClcbiAgICBhbnNba2V5XT17c3RyLHN0YXJ0LGVuZCxzb3VyY2VfZmlsZX1cbiAgfVxuICByZXR1cm4gYW5zXG59XG5mdW5jdGlvbiBlc2NhcGVfaWQoczpzdHJpbmcpe1xuICByZXR1cm4gcy5yZXBsYWNlQWxsKC9cXFxcfDp8XFwvL2csJy0nKS5yZXBsYWNlQWxsKCcgJywnLS0nKVxufVxuZnVuY3Rpb24gc2NyaXB0c21vbl90b19ydW5uZXJzKHNvdXJjZV9maWxlOnN0cmluZyx3YXRjaGVyczpXYXRjaGVycyxzY3JpcHRzOnMydDxMc3RyPil7XG4gIGNvbnN0IGFucz1bXVxuICBmb3IgKGNvbnN0IFtuYW1lLHNjcmlwdF0gb2YgT2JqZWN0LmVudHJpZXMoc2NyaXB0cykpe1xuICAgIGlmIChzY3JpcHQ9PW51bGwpe1xuICAgICAgY29uc29sZS53YXJuKGBtaXNzaW5nIHNjcmlwdCAke25hbWV9YClcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGNvbnN0IHJ1bm5lcj1mdW5jdGlvbigpe1xuICAgICAgY29uc3Qgd29ya3NwYWNlX2ZvbGRlcj1wYXRoLmRpcm5hbWUoc291cmNlX2ZpbGUpXG4gICAgICBjb25zdCBpZD1lc2NhcGVfaWQoYCR7d29ya3NwYWNlX2ZvbGRlcn0gJHtuYW1lfWApXG4gICAgICBjb25zdCBlZmZlY3RpdmVfd2F0Y2hfcmVsPXdhdGNoZXJzLndhdGNoZXNbbmFtZV0/P1tdXG4gICAgICBjb25zdCBlZmZlY3RpdmVfd2F0Y2g6RmlsZW5hbWVbXT1lZmZlY3RpdmVfd2F0Y2hfcmVsLm1hcChyZWw9Pih7cmVsLGZ1bGw6cGF0aC5qb2luKHdvcmtzcGFjZV9mb2xkZXIscmVsLnN0cil9KSlcbiAgICAgIC8vY29uc3Qgd2F0Y2hlZF9kZWZhdWx0PXdhdGNoZXJzLmF1dG93YXRjaF9zY3JpcHRzLmluY2x1ZGVzKG5hbWUpXG4gICAgICBjb25zdCB0YWdzPXdhdGNoZXJzLnRhZ3NbbmFtZV0/P1tdXG4gICAgICBjb25zdCBhbnM6UnVubmVyPSB7XG4gICAgICAgIC8vbnR5cGU6J3J1bm5lcicsXG4gICAgICAgIHBvczogc2NyaXB0LFxuICAgICAgICBuZWVkX2N0bDp0cnVlLFxuICAgICAgICBuYW1lLFxuICAgICAgICBzY3JpcHQ6c2NyaXB0LnN0cixcbiAgICAgICAgd29ya3NwYWNlX2ZvbGRlcixcbiAgICAgICAgZWZmZWN0aXZlX3dhdGNoLFxuICAgICAgICAvL3dhdGNoZWRfZGVmYXVsdCxcbiAgICAgICAgaWQsXG4gICAgICAgIHRhZ3NcbiAgICAgICAgLy93YXRjaGVkOmZhbHNlXG4gICAgICB9IFxuICAgICAgcmV0dXJuIGFuc1xuICAgIH0oKVxuICAgIGFucy5wdXNoKHJ1bm5lcilcbiAgfVxuICByZXR1cm4gYW5zXG59ICAgXG5cbmZ1bmN0aW9uIGNhbGNfcG9zKGV4OkVycm9yKXtcbiAgaWYgKGV4IGluc3RhbmNlb2YgQXN0RXhjZXB0aW9uKVxuICAgIHJldHVybiBwayhleC5hc3QsJ3N0YXJ0JywnZW5kJylcbiAgaWYgKGlzX2Fjb3JuX2Vycm9yKGV4KSl7XG4gICAgY29uc3Qgc3RhcnQ9ZXgucG9zXG4gICAgY29uc3QgZW5kPWV4LnJhaXNlZEF0XG4gICAgcmV0dXJuIHtzdGFydCxlbmR9XG4gIH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkX3BhY2thZ2VfanNvbihcbiAgd29ya3NwYWNlX2ZvbGRlcnM6IHN0cmluZ1tdXG4pOlByb21pc2U8Rm9sZGVyPiB7XG4gIGNvbnN0IGZvbGRlcl9pbmRleDogUmVjb3JkPHN0cmluZywgRm9sZGVyPiA9IHt9OyAvL2J5IGZ1bGxfcGF0aG5hbWVcbiAgYXN5bmMgZnVuY3Rpb24gcmVhZF9vbmUod29ya3NwYWNlX2ZvbGRlcjogc3RyaW5nLG5hbWU6c3RyaW5nLHBvcz86UG9zKTpQcm9taXNlPEZvbGRlcj57XG4gICAgY29uc3QgYW5zOkZvbGRlcj0ge1xuICAgICAgICBydW5uZXJzOltdLFxuICAgICAgICBmb2xkZXJzOltdLFxuICAgICAgICBuYW1lLFxuICAgICAgICB3b3Jrc3BhY2VfZm9sZGVyLC8qbnR5cGU6J2ZvbGRlcicsKi9cbiAgICAgICAgaWQ6ZXNjYXBlX2lkKHdvcmtzcGFjZV9mb2xkZXIpLFxuICAgICAgICBwb3MsXG4gICAgICAgIG5lZWRfY3RsOnRydWUsXG4gICAgICAgIGVycm9yczpbXVxuICAgIH1cbiAgICBjb25zdCBzb3VyY2VfZmlsZSA9IHBhdGgucmVzb2x2ZShwYXRoLm5vcm1hbGl6ZSh3b3Jrc3BhY2VfZm9sZGVyKSwgXCJwYWNrYWdlLmpzb25cIik7XG4gICAgdHJ5e1xuXG4gICAgICBjb25zdCBkPSBwYXRoLnJlc29sdmUoc291cmNlX2ZpbGUpO1xuICAgICAgY29uc3QgZXhpc3RzPWZvbGRlcl9pbmRleFtkXVxuICAgICAgaWYgKGV4aXN0cyE9bnVsbCl7XG4gICAgICAgIGNvbnNvbGUud2FybihgJHtzb3VyY2VfZmlsZX06IHNraXBwaW4sIGFscmVhZHkgZG9uZWApXG4gICAgICAgIHJldHVybiBleGlzdHNcbiAgICAgIH0gICAgXG4gICAgICAvL2NvbnN0IHBrZ0pzb24gPSBhd2FpdCBcbiAgICAgIGNvbnN0IHNvdXJjZT1hd2FpdCBmcy5yZWFkRmlsZShzb3VyY2VfZmlsZSwndXRmOCcpXG4gICAgICBjb25zdCBhc3QgPSBwYXJzZUV4cHJlc3Npb25BdChzb3VyY2UsIDAsIHtcbiAgICAgICAgZWNtYVZlcnNpb246IFwibGF0ZXN0XCIsXG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKGAke2dyZWVufSR7c291cmNlX2ZpbGV9JHtyZXNldH1gKVxuICAgICAgY29uc3Qgc2NyaXB0cz1wYXJzZV9zY3JpcHRzMihhc3Qsc291cmNlX2ZpbGUpXG4gICAgICBjb25zdCB3YXRjaGVycz1wYXJzZV93YXRjaGVycyhhc3Qsc291cmNlX2ZpbGUpXG4gICAgICBhbnMucnVubmVycz1zY3JpcHRzbW9uX3RvX3J1bm5lcnMoc291cmNlX2ZpbGUsd2F0Y2hlcnMsc2NyaXB0cylcbiAgICAgIGNvbnN0IHdvcmtzcGFjZXNfYXN0PWZpbmRfcHJvcCAoYXN0LCd3b3Jrc3BhY2VzJylcbiAgICAgIGNvbnN0IHdvcmtzcGFjZXM9d29ya3NwYWNlc19hc3Q/Z2V0X2VycmF5X21hbmRhdG9yeSh3b3Jrc3BhY2VzX2FzdCxzb3VyY2VfZmlsZSk6W11cbiAgICAgIGFucy5mb2xkZXJzPVtdIFxuICAgICAge1xuICAgICAgICBjb25zdCBwcm9taXNlcz1bXVxuICAgICAgICBmb3IgKGNvbnN0IHdvcmtzcGFjZSBvZiB3b3Jrc3BhY2VzKVxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaChyZWFkX29uZShwYXRoLmpvaW4od29ya3NwYWNlX2ZvbGRlcix3b3Jrc3BhY2Uuc3RyKSx3b3Jrc3BhY2Uuc3RyLHdvcmtzcGFjZSkpXG4gICAgICAgIGZvciAoY29uc3QgcmV0IG9mIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKSlcbiAgICAgICAgICBpZiAocmV0IT1udWxsKVxuICAgICAgICAgICAgICBhbnMuZm9sZGVycy5wdXNoKHJldClcbiAgICAgIH1cbiAgICAgIHJldHVybiBhbnNcbiAgICB9Y2F0Y2goZXgpe1xuICAgICAgY29uc3QgZXhfZXJyb3I9Z2V0X2Vycm9yKGV4KVxuICAgICAgY29uc3QgcG9zOlBvcz17c291cmNlX2ZpbGUsLi4uY2FsY19wb3MoZXhfZXJyb3IpfVxuICAgICAgY29uc29sZS5sb2coe3Bvc30pXG4gICAgICBhbnMuZXJyb3JzPVt7XG4gICAgICAgICAgcG9zLFxuICAgICAgICAgIGlkOmAke2Fucy5pZH1lcnJvcmAsXG4gICAgICAgICAgbmVlZF9jdGw6ZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTpleF9lcnJvci5tZXNzYWdlXG4gIH1cbiAgICAgIF1cbiAgICAgIHJldHVybiBhbnNcbiAgICB9XG4gIH1cbiAgY29uc3QgZm9sZGVycz1bXVxuICBjb25zdCBwcm9taXNlcz1bXVxuICBmb3IgKGNvbnN0IHdvcmtzcGFjZV9mb2xkZXIgb2Ygd29ya3NwYWNlX2ZvbGRlcnMpe1xuICAgIC8vY29uc3QgZnVsbF9wYXRobmFtZT1wYXRoLnJlc29sdmUocGF0aG5hbWUpXG4gICAgcHJvbWlzZXMucHVzaChyZWFkX29uZSh3b3Jrc3BhY2VfZm9sZGVyLHBhdGguYmFzZW5hbWUod29ya3NwYWNlX2ZvbGRlcikpKVxuICB9XG4gIGZvciAoY29uc3QgcmV0IG9mIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKSlcbiAgICBpZiAocmV0IT1udWxsKVxuICAgICAgZm9sZGVycy5wdXNoKHJldClcbiAgY29uc3Qgcm9vdDpGb2xkZXI9e1xuICAgIG5hbWU6J3Jvb3QnLFxuICAgIGlkOidyb290JyxcbiAgICB3b3Jrc3BhY2VfZm9sZGVyOiAnJyxcbiAgICBmb2xkZXJzLFxuICAgIHJ1bm5lcnM6W10sLy8sXG4gICAgbmVlZF9jdGw6dHJ1ZSxcbiAgICBwb3M6dW5kZWZpbmVkLFxuICAgIGVycm9yczpbXVxuICAgIC8vbnR5cGU6J2ZvbGRlcidcbiAgfVxuICByZXR1cm4gcm9vdFxufVxuZnVuY3Rpb24gbm9fY3ljbGVzKHg6dW5rbm93bil7XG4gICBjb25zdCB3cz1uZXcgV2Vha1NldFxuICAgZnVuY3Rpb24gZih2OnVua25vd24pOnVua25vd257XG4gICAgaWYgKHR5cGVvZiB2ID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICByZXR1cm4gJzxmdW5jdGlvbj4nXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBTZXQpXG4gICAgICByZXR1cm4gWy4uLnZdLm1hcChmKVxuICAgIGlmICh2PT1udWxsfHxpc19hdG9tKHYpKVxuICAgICAgcmV0dXJuIHZcbiAgICBpZiAod3MuaGFzKHYpKVxuICAgICAgcmV0dXJuICc8Y3ljbGU+J1xuICAgIHdzLmFkZCh2KSAgICBcbiAgICBjb25zdCBhbnM9ZnVuY3Rpb24gKCl7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSlcbiAgICAgICAgcmV0dXJuIHYubWFwKGYpXG4gICAgICBpZiAoaXNfb2JqZWN0KHYpKXtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhPYmplY3QuZW50cmllcyh2KS5tYXAoKFsgaywgdl0pID0+IFtrLCBmKHYpXSkpXG4gICAgICB9XG4gICAgICByZXR1cm4gdi5jb25zdHJ1Y3Rvci5uYW1lfHxcIjx1bmtub3duIHR5cGU+XCJcbiAgICB9KClcbiAgICB3cy5kZWxldGUodilcbiAgICByZXR1cm4gYW5zXG4gICB9XG4gICByZXR1cm4gZih4KVxufVxuZXhwb3J0IGZ1bmN0aW9uIHRvX2pzb24oeDp1bmtub3duLHNraXBfa2V5czpzdHJpbmdbXT1bXSl7XG4gXG4gIGZ1bmN0aW9uIHNldF9yZXBsYWNlcihrOnN0cmluZyx2OnVua25vd24pe1xuICAgIGlmIChza2lwX2tleXMuaW5jbHVkZXMoaykpXG4gICAgICByZXR1cm4gJzxza2lwcGVkPidcbiAgICByZXR1cm4gdiBcbiAgfVxuICBjb25zdCB4Mj1ub19jeWNsZXMoeClcbiAgY29uc3QgYW5zPUpTT04uc3RyaW5naWZ5KHgyLHNldF9yZXBsYWNlciwyKS5yZXBsYWNlKC9cXFxcbi9nLCAnXFxuJyk7XG4gIHJldHVybiBhbnNcbn0iLCAiaW1wb3J0IHR5cGUge1dlYnZpZXdNZXNzYWdlfSBmcm9tICcuLi8uLi9zcmMvZXh0ZW5zaW9uLmpzJ1xuaW1wb3J0IHt2c2NvZGV9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuaW1wb3J0IHR5cGUge1J1bm5lclJlcG9ydCxSdW5uZXIsU3RhdGV9IGZyb20gJy4uLy4uL3NyYy9kYXRhLmpzJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVMb2NhdGlvbiB7XG4gIGZpbGU6IHN0cmluZztcbiAgcm93OiBudW1iZXI7XG4gIGNvbDogbnVtYmVyO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHBvc3RfbWVzc2FnZShtc2c6V2Vidmlld01lc3NhZ2Upe1xuICB2c2NvZGUucG9zdE1lc3NhZ2UobXNnKVxufVxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNfbGFzdF9ydW4ocmVwb3J0OlJ1bm5lclJlcG9ydCxydW5uZXI6UnVubmVyKXtcbiAgY29uc3QgcnVucz1yZXBvcnQucnVuc1tydW5uZXIuaWRdPz9bXVxuICByZXR1cm4gcnVucy5hdCgtMSlcbn1cbmV4cG9ydCBmdW5jdGlvbiBjYWxjX3J1bm5lcl9zdGF0dXMocmVwb3J0OlJ1bm5lclJlcG9ydCAscnVubmVyOlJ1bm5lcik6e1xuICAgIHZlcnNpb246IG51bWJlcjtcbiAgICBzdGF0ZTogU3RhdGU7XG59e1xuICBjb25zdCBsYXN0X3J1bj1jYWxjX2xhc3RfcnVuKHJlcG9ydCxydW5uZXIpXG4gIGlmIChsYXN0X3J1bj09bnVsbClcbiAgICByZXR1cm57dmVyc2lvbjowLHN0YXRlOidyZWFkeSd9XG4gIGNvbnN0IHtlbmRfdGltZSxydW5faWQ6dmVyc2lvbixleGl0X2NvZGUsc3RvcHBlZH09bGFzdF9ydW5cbiAgaWYgKGVuZF90aW1lPT1udWxsKXtcbiAgICAgIHJldHVybiB7dmVyc2lvbixzdGF0ZToncnVubmluZyd9XG4gIH1cbiAgaWYgKHN0b3BwZWQpIFxuICAgIHJldHVybiB7dmVyc2lvbixzdGF0ZTonc3RvcHBlZCd9XG5cbiAgaWYgKGV4aXRfY29kZT09PTApXG4gICAgcmV0dXJuIHt2ZXJzaW9uLHN0YXRlOidkb25lJ31cbiAgcmV0dXJuIHt2ZXJzaW9uLHN0YXRlOidlcnJvcid9XG59XG5cbiIsICI8IURPQ1RZUEUgaHRtbD5cbjxodG1sIGxhbmc9XCJlblwiPlxuXG48aGVhZD5cbiAgPG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG4gIDx0aXRsZT5TY3JpcHRzbW9uIGljb25zPC90aXRsZT5cbiAgPGxpbmsgcmVsPVwic3R5bGVzaGVldFwiIGhyZWY9XCIuL2ljb25zLmNzc1wiPlxuPC9oZWFkPlxuXG48Ym9keT5cbiAgPGJ1dHRvbiBpZD1hbmltYXRlYnV0dG9uPmFuaW1hdGU8L2J1dHRvbj5cbiAgPGRpdiBpZD1zdGF0PnN0YXQ8L2Rpdj5cbiAgPGJ1dHRvbiBpZD1hbmltYXRlYnV0dG9uX3RoZV9kb25lPmFuaW1hdGVidXR0b25fdGhlX2RvbmU8L2J1dHRvbj5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5lcnJvclxuICAgIDxzdmcgIHdpZHRoPVwiMTZweFwiIGhlaWdodD1cIjE2cHhcIiB2aWV3Qm94PVwiMCAwIDE2IDE2XCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIGZpbGw9XCJyZWRcIj5cbiAgICAgIDwhLS0gQ2lyY2xlIC0tPlxuICAgICAgPGNpcmNsZSBjeD1cIjhcIiBjeT1cIjhcIiByPVwiN1wiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIGZpbGw9XCJ0cmFuc3BhcmVudFwiIC8+XG4gICAgICA8IS0tIFggLS0+XG4gICAgICA8cGF0aCBkPVwiTTUgNSBMMTEgMTEgTTUgMTEgTDExIDVcIiAgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgZmlsbD1cInRyYW5zcGFyZW50XCJcbiAgICAgICAgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgLz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImljb25cIiBpZD1cInRoZV9kb25lXCI+ZG9uZVxuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxMDAgMTAwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICAgICAgPGNpcmNsZSBjeD1cIjUwXCIgY3k9XCI1MFwiIHI9XCI0NVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEwXCIgZmlsbD1cInRyYW5zcGFyZW50XCIgLz5cbiAgICAgIDxnICB0cmFuc2Zvcm0tb3JpZ2luPVwiNTAgNTBcIj5cbiAgICAgICAgPHBhdGggZD1cIk0zMCA1MCBMNDUgNjUgTDcwIDM1XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMTBcIiBmaWxsPVwidHJhbnNwYXJlbnRcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCJcbiAgICAgICAgICBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIC8+XG4gICAgICA8L2c+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCIgaWQ9XCJ0aGVfZG9uZVwiPmNvcHlcbjxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+PHBhdGggZD1cIk0zIDVWMTIuNzNDMi40IDEyLjM4IDIgMTEuNzQgMiAxMVY1QzIgMi43OSAzLjc5IDEgNiAxSDlDOS43NCAxIDEwLjM4IDEuNCAxMC43MyAySDZDNC4zNSAyIDMgMy4zNSAzIDVaTTExIDE1SDZDNC44OTcgMTUgNCAxNC4xMDMgNCAxM1Y1QzQgMy44OTcgNC44OTcgMyA2IDNIMTFDMTIuMTAzIDMgMTMgMy44OTcgMTMgNVYxM0MxMyAxNC4xMDMgMTIuMTAzIDE1IDExIDE1Wk0xMiA1QzEyIDQuNDQ4IDExLjU1MiA0IDExIDRINkM1LjQ0OCA0IDUgNC40NDggNSA1VjEzQzUgMTMuNTUyIDUuNDQ4IDE0IDYgMTRIMTFDMTEuNTUyIDE0IDEyIDEzLjU1MiAxMiAxM1Y1WlwiLz48L3N2Zz5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCIgaWQ9XCJ0aGVfZG9uZVwiPnN0b3BcbiAgXG48c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPjxwYXRoIGQ9XCJNMTIuNSAzLjVWMTIuNUgzLjVWMy41SDEyLjVaTTEyLjUgMkgzLjVDMi42NzIgMiAyIDIuNjcyIDIgMy41VjEyLjVDMiAxMy4zMjggMi42NzIgMTQgMy41IDE0SDEyLjVDMTMuMzI4IDE0IDE0IDEzLjMyOCAxNCAxMi41VjMuNUMxNCAyLjY3MiAxMy4zMjggMiAxMi41IDJaXCIvPjwvc3ZnPlxuICA8L2Rpdj5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCIgaWQ9XCJ0aGVfZG9uZVwiPnN0b3BwZWRcblxuPHN2ZyAgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+PHBhdGggZD1cIk0xNCAySDEwQzEwIDAuODk3IDkuMTAzIDAgOCAwQzYuODk3IDAgNiAwLjg5NyA2IDJIMkMxLjcyNCAyIDEuNSAyLjIyNCAxLjUgMi41QzEuNSAyLjc3NiAxLjcyNCAzIDIgM0gyLjU0TDMuMzQ5IDEyLjcwOEMzLjQ1NiAxMy45OTQgNC41NSAxNSA1Ljg0IDE1SDEwLjE1OUMxMS40NDkgMTUgMTIuNTQzIDEzLjk5MyAxMi42NSAxMi43MDhMMTMuNDU5IDNIMTMuOTk5QzE0LjI3NSAzIDE0LjQ5OSAyLjc3NiAxNC40OTkgMi41QzE0LjQ5OSAyLjIyNCAxNC4yNzUgMiAxMy45OTkgMkgxNFpNOCAxQzguNTUxIDEgOSAxLjQ0OSA5IDJIN0M3IDEuNDQ5IDcuNDQ5IDEgOCAxWk0xMS42NTUgMTIuNjI1QzExLjU5MSAxMy4zOTYgMTAuOTM0IDE0IDEwLjE2IDE0SDUuODQxQzUuMDY3IDE0IDQuNDEgMTMuMzk2IDQuMzQ2IDEyLjYyNUwzLjU0NCAzSDEyLjQ1OEwxMS42NTYgMTIuNjI1SDExLjY1NVpNNyA1LjVWMTEuNUM3IDExLjc3NiA2Ljc3NiAxMiA2LjUgMTJDNi4yMjQgMTIgNiAxMS43NzYgNiAxMS41VjUuNUM2IDUuMjI0IDYuMjI0IDUgNi41IDVDNi43NzYgNSA3IDUuMjI0IDcgNS41Wk0xMCA1LjVWMTEuNUMxMCAxMS43NzYgOS43NzYgMTIgOS41IDEyQzkuMjI0IDEyIDkgMTEuNzc2IDkgMTEuNVY1LjVDOSA1LjIyNCA5LjIyNCA1IDkuNSA1QzkuNzc2IDUgMTAgNS4yMjQgMTAgNS41WlwiLz48L3N2Zz5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+cmVhZHlcblxuXG4gICAgPHN2ZyB3aWR0aD1cIjY0cHhcIiBoZWlnaHQ9XCI2NHB4XCIgdmlld0JveD1cIjEwIDEwIDQ1LjAwIDQ1LjAwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHN0cm9rZS13aWR0aD1cIjNcIj5cbiAgICAgIDxwYXRoIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIGZpbGw9XCJub25lXCJcbiAgICAgICAgZD1cIk00MS43MSwxMC41OEgyOGwtNy40LDIyLjI4YS4xLjEsMCwwLDAsLjA5LjEzaDguNDlhLjEuMSwwLDAsMSwuMS4xM0wyMi43MSw1Mi43NmEuNS41LDAsMCwwLC44OC40NUw0My40MSwyNmEuMS4xLDAsMCwwLS4wOC0uMTZIMzQuNDJhLjExLjExLDAsMCwxLS4wOS0uMTVsNy40Ny0xNUEuMS4xLDAsMCwwLDQxLjcxLDEwLjU4WlwiIC8+XG4gICAgPC9zdmc+XG5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+c3ludGF4ZXJyb3JcblxuICAgIDxzdmcgd2lkdGg9XCI2NHB4XCIgaGVpZ2h0PVwiNjRweFwiIHZpZXdCb3g9XCItNCAtNCAyMi4wMCAyMi4wMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBzdHJva2Utd2lkdGg9XCIyXCI+XG4gICAgICA8cGF0aCBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBmaWxsPVwicmVkXCJcbiAgICAgICAgZD1cIk0gOCAwIEwgMCAxNiBMIDE2IDE2IHo4IDBcIiAvPlxuICAgIDwvc3ZnPlxuXG4gIDwvZGl2PlxuXG5cblxuXG5cblxuICAgPGRpdiBjbGFzcz1cImljb25cIj5ydW5uaW5nXG48c3ZnIGNsYXNzPVwicnVubmluZ2ljb25cIiB4bWxucyA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94ID0gXCIwIDAgMTAwIDEwMFwiIHByZXNlcnZlQXNwZWN0UmF0aW8gPSBcInhNaWRZTWlkXCIgd2lkdGggPSBcIjIzM1wiIGhlaWdodCA9IFwiMjMzXCIgZmlsbD1cIm5vbmVcIiB4bWxuczp4bGluayA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiPlxuICAgIDxjaXJjbGUgc3Ryb2tlLWRhc2hhcnJheSA9IFwiMTY0LjkzMzYxNDMxMzQ2NDE1IDU2Ljk3Nzg3MTQzNzgyMTM4XCIgciA9IFwiMzVcIiBzdHJva2Utd2lkdGggPSBcIjEwXCIgc3Ryb2tlID0gXCJjdXJyZW50Q29sb3JcIiBmaWxsID0gXCJub25lXCIgY3kgPSBcIjUwXCIgY3ggPSBcIjUwXCI+PC9jaXJjbGU+XG48L3N2Zz5cbjwvZGl2PlxuXG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5jaGV2cm9uLWRvd25cbiAgICA8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPlxuICAgICAgPHBhdGhcbiAgICAgICAgZD1cIk0zLjE0NjQ1IDUuNjQ2NDVDMy4zNDE3MSA1LjQ1MTE4IDMuNjU4MjkgNS40NTExOCAzLjg1MzU1IDUuNjQ2NDVMOCA5Ljc5Mjg5TDEyLjE0NjQgNS42NDY0NUMxMi4zNDE3IDUuNDUxMTggMTIuNjU4MyA1LjQ1MTE4IDEyLjg1MzYgNS42NDY0NUMxMy4wNDg4IDUuODQxNzEgMTMuMDQ4OCA2LjE1ODI5IDEyLjg1MzYgNi4zNTM1NUw4LjM1MzU1IDEwLjg1MzZDOC4xNTgyOSAxMS4wNDg4IDcuODQxNzEgMTEuMDQ4OCA3LjY0NjQ1IDEwLjg1MzZMMy4xNDY0NSA2LjM1MzU1QzIuOTUxMTggNi4xNTgyOSAyLjk1MTE4IDUuODQxNzEgMy4xNDY0NSA1LjY0NjQ1WlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+Y2hldnJvbi1yaWdodFxuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTUuNjQ2NDUgMy4xNDY0NUM1LjQ1MTE4IDMuMzQxNzEgNS40NTExOCAzLjY1ODI5IDUuNjQ2NDUgMy44NTM1NUw5Ljc5Mjg5IDhMNS42NDY0NSAxMi4xNDY0QzUuNDUxMTggMTIuMzQxNyA1LjQ1MTE4IDEyLjY1ODMgNS42NDY0NSAxMi44NTM2QzUuODQxNzEgMTMuMDQ4OCA2LjE1ODI5IDEzLjA0ODggNi4zNTM1NSAxMi44NTM2TDEwLjg1MzYgOC4zNTM1NUMxMS4wNDg4IDguMTU4MjkgMTEuMDQ4OCA3Ljg0MTcxIDEwLjg1MzYgNy42NDY0NUw2LjM1MzU1IDMuMTQ2NDVDNi4xNTgyOSAyLjk1MTE4IDUuODQxNzEgMi45NTExOCA1LjY0NjQ1IDMuMTQ2NDVaXCIgLz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5kZWJ1Z1xuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTIxLjc1IDEySDE5LjVWOUMxOS41IDguNDQ1IDE5LjM0NyA3LjkyNDUgMTkuMDgzIDcuNDc3NUwyMC43Nzk1IDUuNzgxQzIxLjA3MiA1LjQ4ODUgMjEuMDcyIDUuMDEzIDIwLjc3OTUgNC43MjA1QzIwLjQ4NyA0LjQyOCAyMC4wMTE1IDQuNDI4IDE5LjcxOSA0LjcyMDVMMTguMDIyNSA2LjQxN0MxNy41NzU1IDYuMTUzIDE3LjA1NSA2IDE2LjUgNkMxNi41IDMuNTE5IDE0LjQ4MSAxLjUgMTIgMS41QzkuNTE5IDEuNSA3LjUgMy41MTkgNy41IDZDNi45NDUgNiA2LjQyNDUgNi4xNTMgNS45Nzc1IDYuNDE3TDQuMjgxIDQuNzIwNUMzLjk4ODUgNC40MjggMy41MTMgNC40MjggMy4yMjA1IDQuNzIwNUMyLjkyOCA1LjAxMyAyLjkyOCA1LjQ4ODUgMy4yMjA1IDUuNzgxTDQuOTE3IDcuNDc3NUM0LjY1MyA3LjkyNDUgNC41IDguNDQ1IDQuNSA5VjEySDIuMjVDMS44MzYgMTIgMS41IDEyLjMzNiAxLjUgMTIuNzVDMS41IDEzLjE2NCAxLjgzNiAxMy41IDIuMjUgMTMuNUg0LjVDNC41IDE1LjI5ODUgNS4xMzYgMTYuOTUgNi4xOTUgMTguMjQ0NUwzLjU5NCAyMC44NDU1QzMuMzAxNSAyMS4xMzggMy4zMDE1IDIxLjYxMzUgMy41OTQgMjEuOTA2QzMuNzQxIDIyLjA1MyAzLjkzMyAyMi4xMjUgNC4xMjUgMjIuMTI1QzQuMzE3IDIyLjEyNSA0LjUwOSAyMi4wNTE1IDQuNjU2IDIxLjkwNkw3LjI1NyAxOS4zMDVDOC41NSAyMC4zNjQgMTAuMjAzIDIxIDEyLjAwMTUgMjFDMTMuOCAyMSAxNS40NTE1IDIwLjM2NCAxNi43NDYgMTkuMzA1TDE5LjM0NyAyMS45MDZDMTkuNDk0IDIyLjA1MyAxOS42ODYgMjIuMTI1IDE5Ljg3OCAyMi4xMjVDMjAuMDcgMjIuMTI1IDIwLjI2MiAyMi4wNTE1IDIwLjQwOSAyMS45MDZDMjAuNzAxNSAyMS42MTM1IDIwLjcwMTUgMjEuMTM4IDIwLjQwOSAyMC44NDU1TDE3LjgwOCAxOC4yNDQ1QzE4Ljg2NyAxNi45NTE1IDE5LjUwMyAxNS4yOTg1IDE5LjUwMyAxMy41SDIxLjc1M0MyMi4xNjcgMTMuNSAyMi41MDMgMTMuMTY0IDIyLjUwMyAxMi43NUMyMi41MDMgMTIuMzM2IDIyLjE2NyAxMiAyMS43NTMgMTJIMjEuNzVaTTEyIDNDMTMuNjU0NSAzIDE1IDQuMzQ1NSAxNSA2SDlDOSA0LjM0NTUgMTAuMzQ1NSAzIDEyIDNaTTE4IDEzLjVDMTggMTYuODA5IDE1LjMwOSAxOS41IDEyIDE5LjVDOC42OTEgMTkuNSA2IDE2LjgwOSA2IDEzLjVWOUM2IDguMTcyIDYuNjcyIDcuNSA3LjUgNy41SDE2LjVDMTcuMzI4IDcuNSAxOCA4LjE3MiAxOCA5VjEzLjVaTTE0Ljc4MSAxMS4wMzFMMTMuMDYyIDEyLjc1TDE0Ljc4MSAxNC40NjlDMTUuMDczNSAxNC43NjE1IDE1LjA3MzUgMTUuMjM3IDE0Ljc4MSAxNS41Mjk1QzE0LjYzNCAxNS42NzY1IDE0LjQ0MiAxNS43NDg1IDE0LjI1IDE1Ljc0ODVDMTQuMDU4IDE1Ljc0ODUgMTMuODY2IDE1LjY3NSAxMy43MTkgMTUuNTI5NUwxMiAxMy44MTA1TDEwLjI4MSAxNS41Mjk1QzEwLjEzNCAxNS42NzY1IDkuOTQyIDE1Ljc0ODUgOS43NSAxNS43NDg1QzkuNTU4IDE1Ljc0ODUgOS4zNjYgMTUuNjc1IDkuMjE5IDE1LjUyOTVDOC45MjY1IDE1LjIzNyA4LjkyNjUgMTQuNzYxNSA5LjIxOSAxNC40NjlMMTAuOTM4IDEyLjc1TDkuMjE5IDExLjAzMUM4LjkyNjUgMTAuNzM4NSA4LjkyNjUgMTAuMjYzIDkuMjE5IDkuOTcwNUM5LjUxMTUgOS42NzggOS45ODcgOS42NzggMTAuMjc5NSA5Ljk3MDVMMTEuOTk4NSAxMS42ODk1TDEzLjcxNzUgOS45NzA1QzE0LjAxIDkuNjc4IDE0LjQ4NTUgOS42NzggMTQuNzc4IDkuOTcwNUMxNS4wNzA1IDEwLjI2MyAxNS4wNzA1IDEwLjczODUgMTQuNzc4IDExLjAzMUgxNC43ODFaXCIgLz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5maWxlXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiPlxuICAgICAgPHBhdGggZmlsbD1cImN1cnJlbnRDb2xvclwiXG4gICAgICAgIGQ9XCJNMiAxLjc1QzIgLjc4NCAyLjc4NCAwIDMuNzUgMGg2LjU4NmMuNDY0IDAgLjkwOS4xODQgMS4yMzcuNTEzbDIuOTE0IDIuOTE0Yy4zMjkuMzI4LjUxMy43NzMuNTEzIDEuMjM3djkuNTg2QTEuNzUgMS43NSAwIDAgMSAxMy4yNSAxNmgtOS41QTEuNzUgMS43NSAwIDAgMSAyIDE0LjI1Wm0xLjc1LS4yNWEuMjUuMjUgMCAwIDAtLjI1LjI1djEyLjVjMCAuMTM4LjExMi4yNS4yNS4yNWg5LjVhLjI1LjI1IDAgMCAwIC4yNS0uMjVWNmgtMi43NUExLjc1IDEuNzUgMCAwIDEgOSA0LjI1VjEuNVptNi43NS4wNjJWNC4yNWMwIC4xMzguMTEyLjI1LjI1LjI1aDIuNjg4bC0uMDExLS4wMTMtMi45MTQtMi45MTQtLjAxMy0uMDExWlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+Zm9sZGVyXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIi0yIC0yIDIwIDIwXCIgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCI+XG4gICAgICA8cGF0aCBzdHJva2U9J2N1cnJlbnRDb2xvcicgZmlsbD1cInRyYW5zcGFyZW50XCJcbiAgICAgICAgZD1cIk0xLjc1IDFBMS43NSAxLjc1IDAgMCAwIDAgMi43NXYxMC41QzAgMTQuMjE2Ljc4NCAxNSAxLjc1IDE1aDEyLjVBMS43NSAxLjc1IDAgMCAwIDE2IDEzLjI1VjQuNzVBMS43NSAxLjc1IDAgMCAwIDE0LjI1IDNINy41YS4yNS4yNSAwIDAgMS0uMi0uMUw1Ljg3NSAxLjQ3NUExLjc1IDEuNzUgMCAwIDAgNC41MTggMUgxLjc1WlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gICA8ZGl2IGNsYXNzPVwiaWNvblwiPmZvbGRlcnN5bnRheGVycm9yXG48c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiLTIgLTIgMjAgMjBcIiB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIj5cbiAgPHBhdGggc3Ryb2tlPSdjdXJyZW50Q29sb3InIGZpbGw9XCJ0cmFuc3BhcmVudFwiXG4gICAgZD1cIk0xLjc1IDFBMS43NSAxLjc1IDAgMCAwIDAgMi43NXYxMC41QzAgMTQuMjE2Ljc4NCAxNSAxLjc1IDE1aDEyLjVBMS43NSAxLjc1IDAgMCAwIDE2IDEzLjI1VjQuNzVBMS43NSAxLjc1IDAgMCAwIDE0LjI1IDNINy41YS4yNS4yNSAwIDAgMS0uMi0uMUw1Ljg3NSAxLjQ3NUExLjc1IDEuNzUgMCAwIDAgNC41MTggMUgxLjc1WlwiIC8+XG4gIDxwYXRoIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIGZpbGw9XCJyZWRcIlxuICAgIGQ9XCJNIDggNS4zMzMzIEwgNCAxMy4zMzMzIEwgMTIgMTMuMzMzMyBaXCIgLz5cbjwvc3ZnPlxuXG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+cGxheVxuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTQuNzQ1MTQgMy4wNjQxNEM0LjQxMTgzIDIuODc2NjUgNCAzLjExNzUxIDQgMy40OTk5M1YxMi41MDAyQzQgMTIuODgyNiA0LjQxMTgyIDEzLjEyMzUgNC43NDUxMiAxMi45MzZMMTIuNzQ1NCA4LjQzNjAxQzEzLjA4NTIgOC4yNDQ4NiAxMy4wODUyIDcuNzU1NTkgMTIuNzQ1NCA3LjU2NDQzTDQuNzQ1MTQgMy4wNjQxNFpNMyAzLjQ5OTkzQzMgMi4zNTI2OCA0LjIzNTUgMS42MzAxMSA1LjIzNTQxIDIuMTkyNTdMMTMuMjM1NyA2LjY5Mjg2QzE0LjI1NTEgNy4yNjYzMyAxNC4yNTUxIDguNzM0MTUgMTMuMjM1NiA5LjMwNzU5TDUuMjM1MzcgMTMuODA3NkM0LjIzNTQ2IDE0LjM3IDMgMTMuNjQ3NCAzIDEyLjUwMDJWMy40OTk5M1pcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuICAgIDxkaXYgY2xhc3M9XCJpY29uXCI+cGxheS13YXRjaFxuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTQuNzQ1MTQgMy4wNjQxNEM0LjQxMTgzIDIuODc2NjUgNCAzLjExNzUxIDQgMy40OTk5M1YxMi41MDAyQzQgMTIuODgyNiA0LjQxMTgyIDEzLjEyMzUgNC43NDUxMiAxMi45MzZMMTIuNzQ1NCA4LjQzNjAxQzEzLjA4NTIgOC4yNDQ4NiAxMy4wODUyIDcuNzU1NTkgMTIuNzQ1NCA3LjU2NDQzTDQuNzQ1MTQgMy4wNjQxNFpNMyAzLjQ5OTkzQzMgMi4zNTI2OCA0LjIzNTUgMS42MzAxMSA1LjIzNTQxIDIuMTkyNTdMMTMuMjM1NyA2LjY5Mjg2QzE0LjI1NTEgNy4yNjYzMyAxNC4yNTUxIDguNzM0MTUgMTMuMjM1NiA5LjMwNzU5TDUuMjM1MzcgMTMuODA3NkM0LjIzNTQ2IDE0LjM3IDMgMTMuNjQ3NCAzIDEyLjUwMDJWMy40OTk5M1pcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+c2VsZWN0b3JfdW5kZWZpbmVkXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiPlxuICAgICAgPHBhdGggZD1cIk0gMCAwIEggMTYgViAxNiBIMCBWMFwiXG4gICAgICAgIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgZmlsbD1cIm5vbmVcIiBzdHJva2UtZGFzaGFycmF5PVwiMiw0XCIvPlxuICAgICAgPC9zdmc+XG4gIDwvZGl2PiBcblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPnNlbGVjdG9yX2ZhbHNlXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiPlxuICAgICAgPHBhdGggZD1cIk0gMCAwIEggMTYgViAxNiBIMCBWMFwiXG4gICAgICAgIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgZmlsbD1cIm5vbmVcIi8+XG4gICAgICA8L3N2Zz5cbiAgPC9kaXY+ICAgXG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5zZWxlY3Rvcl90cnVlXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIxNnB4XCIgaGVpZ2h0PVwiMTZweFwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIj5cbiAgICAgIDxwYXRoIGQ9XCJNIDAgMCBIIDE2IFYgMTYgSDAgVjBcIlxuICAgICAgICBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIGZpbGw9XCJub25lXCIvPlxuICAgICAgICA8cGF0aCBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBkPVwiTTEzLjY1NzIgMy4xMzU3M0MxMy44NTgzIDIuOTQ2NSAxNC4xNzUgMi45NTYxNCAxNC4zNjQzIDMuMTU3MjJDMTQuNTUzNSAzLjM1ODMxIDE0LjU0MzggMy42NzUgMTQuMzQyOCAzLjg2NDI1TDUuODQyNzcgMTEuODY0MkM1LjY0NTk3IDEyLjA0OTQgNS4zMzc1NiAxMi4wNDQ2IDUuMTQ2NDggMTEuODUzNUwxLjY0NjQ4IDguMzUzNTFDMS40NTEyMSA4LjE1ODI0IDEuNDUxMjEgNy44NDE3NCAxLjY0NjQ4IDcuNjQ2NDdDMS44NDE3NCA3LjQ1MTIxIDIuMTU4MjUgNy40NTEyMSAyLjM1MzUxIDcuNjQ2NDdMNS41MDk3NiAxMC44MDI3TDEzLjY1NzIgMy4xMzU3M1pcIi8+XG4gICAgICA8L3N2Zz5cbiAgPC9kaXY+ICAgXG5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+d2F0Y2hlZF9taXNzaW5nXG48c3ZnIHdpZHRoPVwiODAwcHhcIiBoZWlnaHQ9XCI4MDBweFwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiB4bWxuczpyZGY9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZlcnNpb249XCIxLjFcIiB4bWxuczpjYz1cImh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL25zI1wiIHhtbG5zOmRjPVwiaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS9cIj5cbiA8ZyB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoMCAtMTAyOC40KVwiPlxuICA8cGF0aCBkPVwibTI0IDE0YTIgMiAwIDEgMSAtNCAwIDIgMiAwIDEgMSA0IDB6XCIgdHJhbnNmb3JtPVwibWF0cml4KDEgMCAwIDEuMjUgLTEwIDEwMzEuNClcIiBmaWxsPVwiIzdmOGM4ZFwiLz5cbiAgPHBhdGggZD1cIm0xMiAxMDMwLjRjLTMuODY2IDAtNyAzLjItNyA3LjIgMCAzLjEgMy4xMjUgNS45IDQgNy44IDAuODc1IDEuOCAwIDUgMCA1bDMtMC41IDMgMC41cy0wLjg3NS0zLjIgMC01YzAuODc1LTEuOSA0LTQuNyA0LTcuOCAwLTQtMy4xMzQtNy4yLTctNy4yelwiIGZpbGw9XCIjZjM5YzEyXCIvPlxuICA8cGF0aCBkPVwibTEyIDEwMzAuNGMzLjg2NiAwIDcgMy4yIDcgNy4yIDAgMy4xLTMuMTI1IDUuOS00IDcuOC0wLjg3NSAxLjggMCA1IDAgNWwtMy0wLjV2LTE5LjV6XCIgZmlsbD1cIiNmMWM0MGZcIi8+XG4gIDxwYXRoIGQ9XCJtOSAxMDM2LjQtMSAxIDQgMTIgNC0xMi0xLTEtMSAxLTEtMS0xIDEtMS0xLTEgMS0xLTF6bTAgMSAxIDEgMC41LTAuNSAwLjUtMC41IDAuNSAwLjUgMC41IDAuNSAwLjUtMC41IDAuNS0wLjUgMC41IDAuNSAwLjUgMC41IDEtMSAwLjQzOCAwLjQtMy40MzggMTAuMy0zLjQzNzUtMTAuMyAwLjQzNzUtMC40elwiIGZpbGw9XCIjZTY3ZTIyXCIvPlxuICA8cmVjdCBoZWlnaHQ9XCI1XCIgd2lkdGg9XCI2XCIgeT1cIjEwNDUuNFwiIHg9XCI5XCIgZmlsbD1cIiNiZGMzYzdcIi8+XG4gIDxwYXRoIGQ9XCJtOSAxMDQ1LjR2NWgzdi0xaDN2LTFoLTN2LTFoM3YtMWgtM3YtMWgtM3pcIiBmaWxsPVwiIzk1YTVhNlwiLz5cbiAgPHBhdGggZD1cIm05IDEwNDYuNHYxaDN2LTFoLTN6bTAgMnYxaDN2LTFoLTN6XCIgZmlsbD1cIiM3ZjhjOGRcIi8+XG4gPC9nPlxuPC9zdmc+XG4gIDwvZGl2PlxuXG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj53YXRjaGVkX3RydWVcbiA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIjMyXCIgaGVpZ2h0PVwiMzJcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PCEtLSBJY29uIGZyb20gTWF0ZXJpYWwgU3ltYm9scyBieSBHb29nbGUgLSBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL21hdGVyaWFsLWRlc2lnbi1pY29ucy9ibG9iL21hc3Rlci9MSUNFTlNFIC0tPjxwYXRoIGZpbGw9XCJjdXJyZW50Q29sb3JcIiBkPVwibTUuODI1IDIxbDEuNjI1LTcuMDI1TDIgOS4yNWw3LjItLjYyNUwxMiAybDIuOCA2LjYyNWw3LjIuNjI1bC01LjQ1IDQuNzI1TDE4LjE3NSAyMUwxMiAxNy4yNzV6XCIvPjwvc3ZnPiBcbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+d2F0Y2hlZF9mYWxzZVxuPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIzMlwiIGhlaWdodD1cIjMyXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjwhLS0gSWNvbiBmcm9tIE1hdGVyaWFsIFN5bWJvbHMgYnkgR29vZ2xlIC0gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9tYXRlcmlhbC1kZXNpZ24taWNvbnMvYmxvYi9tYXN0ZXIvTElDRU5TRSAtLT48cGF0aCBmaWxsPVwiY3VycmVudENvbG9yXCIgZD1cIm04Ljg1IDE2LjgyNWwzLjE1LTEuOWwzLjE1IDEuOTI1bC0uODI1LTMuNmwyLjc3NS0yLjRsLTMuNjUtLjMyNWwtMS40NS0zLjRsLTEuNDUgMy4zNzVsLTMuNjUuMzI1bDIuNzc1IDIuNDI1ek01LjgyNSAyMWwxLjYyNS03LjAyNUwyIDkuMjVsNy4yLS42MjVMMTIgMmwyLjggNi42MjVsNy4yLjYyNWwtNS40NSA0LjcyNUwxOC4xNzUgMjFMMTIgMTcuMjc1ek0xMiAxMi4yNVwiLz48L3N2Zz5cbiAgPC9kaXY+XG5cbjxzY3JpcHQgc3JjPVwiLi9pY29ucy5qc1wiPjwvc2NyaXB0PlxuXG5cbiIsICJpbXBvcnQge2dldF9lcnJvcn0gZnJvbSAnQHlpZ2FsL2Jhc2VfdHlwZXMnXG5leHBvcnQgZnVuY3Rpb24gcmUoZmxhZ3MgPSBcIlwiKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksIC4uLnZhbHVlczogKHN0cmluZ3xudW1iZXIpW10pIHtcbiAgICAvLyAxLiBDb21iaW5lIHN0cmluZ3MgYW5kIGludGVycG9sYXRlZCB2YWx1ZXNcbiAgICBjb25zdCBmdWxsX3JhdyA9IHN0cmluZ3MucmF3LnJlZHVjZSgoYWNjLCBzdHIsIGkpID0+IFxuICAgICAgYWNjICsgc3RyICsgKHZhbHVlc1tpXSA/PyBcIlwiKVxuICAgICwgXCJcIik7XG5cbiAgICAvLyAyLiBDbGVhbiB0aGUgc3RyaW5nXG4gICAgY29uc3Qgbm9fY29tbWVudHMgPSBmdWxsX3Jhdy5yZXBsYWNlKC8gIy4qXFxuL2csIFwiXCIpO1xuICAgIGNvbnN0IG5vX3NwYWNlcyA9IG5vX2NvbW1lbnRzLnJlcGxhY2UoL1xccysvZywgXCJcIik7XG4gICAgdHJ5e1xuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAobm9fc3BhY2VzLCBmbGFncyk7XG4gICAgfWNhdGNoKGV4KXtcbiAgICAgIGNvbnN0IGVycj1nZXRfZXJyb3IoZXgpICAvL2NhdGNoIGFuZCByZXRocm93IHNvIGNhbiBwbGFjZSBkZWJ1Z2dlciBoZXJlIHRvIGRlYnVnIHJlZ2V4XG4gICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG4gIH07XG59XG5leHBvcnQgY29uc3QgciA9IFN0cmluZy5yYXc7XG5leHBvcnQgY29uc3QgZGlnaXRzPXJgXFxkK2BcbiIsICJpbXBvcnQge3IscmV9IGZyb20gJy4vcmVnZXhfYnVpbGRlci5qcydcbi8vIDEuIEh5cGVybGlua3MgKFNwZWNpZmljIE9TQyA4KVxuXG5cbiAgLy8gUmV0dXJuIHRoZSBhY3R1YWwgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSBwYXJhbXNcbmNvbnN0IGh5cGVybGluayA9IHJgXG4gIFxceDFiXFxdODtcbiAgW147XSpcbiAgO1xuICAoPzx1cmw+W15cXHgxYlxceDA3XSopIFxuICAoPzpcXHgxYlxcXFx8XFx4MDcpXG4gICg/PGxpbmtfdGV4dD5bXlxceDFiXFx4MDddKilcbiAgXFx4MWJcXF04OztcbiAgKD86XFx4MWJcXFxcfFxceDA3KWBcblxuLy8gMi4gU0dSIENvbG9ycyAoU3BlY2lmaWMgQ1NJICdtJylcbmNvbnN0IHNncl9jb2xvciA9IHJgXG4gIFxceDFiXFxbXG4gICg/PGNvbG9yPltcXGQ7XSopXG4gIG1gXG5cblxuLy8gMy4gQ2F0Y2gtYWxsIGZvciBvdGhlciBBTlNJIHNlcXVlbmNlcyAoQ3Vyc29yLCBFcmFzZSwgb3RoZXIgT1NDcylcbi8vIFRoaXMgbWF0Y2hlcyBhbnl0aGluZyBzdGFydGluZyB3aXRoIEVTQyBbIG9yIEVTQyBdIHRoYXQgd2Fzbid0IGNhdWdodCBhYm92ZS5cbmNvbnN0IG90aGVyX2Fuc2kgPSByYFxuICBcXHgxYlxcW1tcXHgzMC1cXHgzZl0qW1xceDIwLVxceDJmXSpbXFx4NDAtXFx4N2VdICAgIyBTdGFuZGFyZCBDU0kgKEN1cnNvciwgZXRjKVxuICBcXHgxYlxcXVteXFx4MWJcXHgwN10qICAgICAgICAgICAgICAgICAgICAgICAgICAjIEFueSBvdGhlciBPU0NcbiAgXFx4MWJbXFx4NDAtXFx4NWFcXHg1Y1xceDVlXFx4NWYsICAgICAgICAgICAgICAgICAjIEZlIEVzY2FwZSBzZXF1ZW5jZXNcbiAgXFx4MWIuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIyAyLWNoYXJhY3RlciBzZXF1ZW5jZXNcbiAgW1xceDAwLVxceDFmXSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBDb250cm9sIGNoYXJzIChUYWIsIENSLCBMRiwgZXRjKVxuYFxuXG5leHBvcnQgY29uc3QgYW5zaV9yZWdleCA9IHJlKCdnJylgXG4gICAgJHtoeXBlcmxpbmt9fFxuICAgICR7c2dyX2NvbG9yfXxcbiAgICAke290aGVyX2Fuc2l9fFxuYFxuXG50eXBlIEdyb3VwVHlwZT0ge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZztcbn0gfCB1bmRlZmluZWRcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZV9ncm91cF9pbnQoZ3JvdXBzOkdyb3VwVHlwZSxuYW1lOnN0cmluZyl7XG4gIGlmIChncm91cHM9PW51bGwpXG4gICAgcmV0dXJuIDBcbiAgY29uc3Qgc3RyPWdyb3Vwc1tuYW1lXXx8JydcbiAgcmV0dXJuIHBhcnNlSW50KHN0ciwgMTApfHwwIFxufVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlX2dyb3VwX3N0cmluZyhtYXRjaDpSZWdFeHBNYXRjaEFycmF5LG5hbWU6c3RyaW5nKXtcbiAgY29uc3Qge2dyb3Vwc309bWF0Y2hcbiAgaWYgKGdyb3Vwcz09bnVsbClcbiAgICByZXR1cm4gXG4gIHJldHVybiBncm91cHNbbmFtZV1cbi8vICByZXR1cm4gc3RyXG59XG50eXBlIGZvbnRfc3R5bGUgPSAnYm9sZCcgfCAnaXRhbGljJyB8J2ZhaW50J3wgJ3VuZGVybGluZScgfCAnYmxpbmtpbmcnIHwgJ2ludmVyc2UnIHwgJ3N0cmlrZXRocm91Z2gnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlIHtcbiAgZm9yZWdyb3VuZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBiYWNrZ3JvdW5kOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGZvbnRfc3R5bGVzOiBTZXQ8Zm9udF9zdHlsZT47XG59XG50eXBlIEFuc2lDb21tYW5kVHlwZT0nc3R5bGUnfCdpbnNlcnQnfCdzdHlsZV9pbnNlcnQnXG5pbnRlcmZhY2UgQW5zaUNvbW1hbmR7XG4gIHBvc2l0aW9uOiBudW1iZXI7XG4gIGNvbW1hbmQ6QW5zaUNvbW1hbmRUeXBlXG59XG5cbmludGVyZmFjZSBBbnNpU3R5bGVDb21tYW5kIGV4dGVuZHMgQW5zaUNvbW1hbmR7XG4gIGNvbW1hbmQ6J3N0eWxlJ1xuICBzdHlsZTpTdHlsZVxufVxuZnVuY3Rpb24gbWFrZV9jbGVhcl9zdHlsZV9jb21tYW5kKHBvc2l0aW9uOm51bWJlcik6QW5zaVN0eWxlQ29tbWFuZHtcbiAgcmV0dXJuIHtcbiAgICBjb21tYW5kOidzdHlsZScsXG4gICAgcG9zaXRpb24sXG4gICAgc3R5bGU6e1xuICAgICAgZm9yZWdyb3VuZDp1bmRlZmluZWQsXG4gICAgICBiYWNrZ3JvdW5kOnVuZGVmaW5lZCxcbiAgICAgIGZvbnRfc3R5bGVzOiBuZXcgU2V0KClcbiAgICB9XG4gIH1cbn1cbmV4cG9ydCBpbnRlcmZhY2UgQW5zaUluc2VydENvbW1hbmQgZXh0ZW5kcyBBbnNpQ29tbWFuZHtcbiAgY29tbWFuZDonaW5zZXJ0J1xuICBzdHI6c3RyaW5nXG59XG5leHBvcnQgaW50ZXJmYWNlIEFuc2lTdHlsZUluc2VydENvbW1hbmQgZXh0ZW5kcyBBbnNpQ29tbWFuZHtcbiAgY29tbWFuZDonc3R5bGVfaW5zZXJ0J1xuICBzdHI6c3RyaW5nLFxuICBzdHlsZTpTdHlsZVxufVxuZnVuY3Rpb24gaXNfc3R5bGVfY29tbWFuZChhOkFuc2lDb21tYW5kfHVuZGVmaW5lZCk6YSBpcyBBbnNpU3R5bGVDb21tYW5ke1xuICByZXR1cm4gYT8uY29tbWFuZD09PVwic3R5bGVcIlxufVxuZnVuY3Rpb24gaXNfaW5zZXJ0X2NvbW1hbmQoYTpBbnNpQ29tbWFuZHx1bmRlZmluZWQpOmEgaXMgQW5zaUluc2VydENvbW1hbmR7XG4gIHJldHVybiBhPy5jb21tYW5kPT09XCJpbnNlcnRcIlxufVxuZnVuY3Rpb24gaXNfc3R5bGVfaW5zZXJ0X2NvbW1hbmQoYTpBbnNpQ29tbWFuZHx1bmRlZmluZWQpOmEgaXMgQW5zaVN0eWxlSW5zZXJ0Q29tbWFuZHtcbiAgcmV0dXJuIGE/LmNvbW1hbmQ9PT1cInN0eWxlX2luc2VydFwiXG59XG5cbmZ1bmN0aW9uIGNoZWNrX2luc2VydHNfdmFsaWRpdHkoaW5zZXJ0czogQXJyYXk8QW5zaUluc2VydENvbW1hbmQ+KTogdm9pZCB7XG4gIGxldCBsYXN0X2VuZCA9IC0xO1xuICBmb3IgKGNvbnN0IHIgb2YgaW5zZXJ0cykge1xuICAgIGlmIChyLnBvc2l0aW9uIDw9IGxhc3RfZW5kKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVwbGFjZW1lbnRzIGNhbm5vdCBvdmVybGFwIGFuZCBtdXN0IGJlIHNvcnRlZFwiKTtcbiAgICBsYXN0X2VuZCA9IHIucG9zaXRpb247XG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tfc3R5bGVfcG9zaXRpb25zX3ZhbGlkaXR5KHN0eWxlX3Bvc2l0aW9uczogQXJyYXk8QW5zaVN0eWxlQ29tbWFuZD4pOiB2b2lkIHtcbiAgbGV0IGxhc3RfcG9zID0gLTE7XG4gIGZvciAoY29uc3QgcyBvZiBzdHlsZV9wb3NpdGlvbnMpIHtcbiAgICBpZiAocy5wb3NpdGlvbiA8IGxhc3RfcG9zKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU3R5bGUgcG9zaXRpb25zIG11c3QgYmUgc29ydGVkXCIpO1xuICAgIGxhc3RfcG9zID0gcy5wb3NpdGlvbjtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRfc3R5bGVfY3NzKHN0eWxlOiBTdHlsZXx1bmRlZmluZWQpOiBzdHJpbmcge1xuICBpZiAoc3R5bGU9PW51bGwpXG4gICAgcmV0dXJuICcnXG4gIGNvbnN0IGNzc19wYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHtmb3JlZ3JvdW5kLGJhY2tncm91bmR9PXN0eWxlO1xuXG4gIC8vIEhhbmRsZSAnaW52ZXJzZScgYnkgc3dhcHBpbmcgY29sb3JzIChkZXN0cnVjdHVyZWQgZm9yIHNpbmdsZSBzdGF0ZW1lbnQpXG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ2ludmVyc2UnKSlcbiAgICBbZm9yZWdyb3VuZCwgYmFja2dyb3VuZF0gPSBbYmFja2dyb3VuZCwgZm9yZWdyb3VuZF07XG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ2ZhaW50JykpXG4gICAgY3NzX3BhcnRzLnB1c2goYG9wYWNpdHk6LjVgKTtcbiAgaWYgKGZvcmVncm91bmQhPW51bGwpXG4gICAgY3NzX3BhcnRzLnB1c2goYGNvbG9yOiR7Zm9yZWdyb3VuZH1gKTtcbiAgaWYgKGJhY2tncm91bmQhPW51bGwpXG4gICAgY3NzX3BhcnRzLnB1c2goYGJhY2tncm91bmQtY29sb3I6JHtiYWNrZ3JvdW5kfWApO1xuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCdib2xkJykpXG4gICAgY3NzX3BhcnRzLnB1c2goYGZvbnQtd2VpZ2h0OmJvbGRgKTtcbiAgaWYgKHN0eWxlLmZvbnRfc3R5bGVzLmhhcygnaXRhbGljJykpXG4gICAgY3NzX3BhcnRzLnB1c2goYGZvbnQtc3R5bGU6aXRhbGljYCk7XG5cbiAgY29uc3QgZGVjb3JhdGlvbnM6IHN0cmluZ1tdID0gW107XG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ3VuZGVybGluZScpKVxuICAgIGRlY29yYXRpb25zLnB1c2goJ3VuZGVybGluZScpO1xuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCdzdHJpa2V0aHJvdWdoJykpXG4gICAgZGVjb3JhdGlvbnMucHVzaCgnbGluZS10aHJvdWdoJyk7XG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ2JsaW5raW5nJykpXG4gICAgZGVjb3JhdGlvbnMucHVzaCgnYmxpbmsnKTtcbiAgXG4gIGlmIChkZWNvcmF0aW9ucy5sZW5ndGggPiAwKVxuICAgIGNzc19wYXJ0cy5wdXNoKGB0ZXh0LWRlY29yYXRpb246JHtkZWNvcmF0aW9ucy5qb2luKCcgJyl9YCk7XG4gIGlmIChjc3NfcGFydHMubGVuZ3RoPT09MClcbiAgICByZXR1cm4gJydcbiAgcmV0dXJuIGBzdHlsZT0nJHtjc3NfcGFydHMubWFwKHg9PmAke3h9O2ApLmpvaW4oJycpfSdgXG59XG5mdW5jdGlvbiBpc19jbGVhcl9zdHlsZShzdHlsZTpTdHlsZSl7XG4gIHJldHVybiBzdHlsZS5iYWNrZ3JvdW5kPT1udWxsJiZzdHlsZS5mb3JlZ3JvdW5kPT1udWxsJiZzdHlsZS5mb250X3N0eWxlcy5zaXplPT09MFxufVxuXG5mdW5jdGlvbiBtZXJnZV9vbmUoYTpBbnNpQ29tbWFuZCxiOkFuc2lDb21tYW5kKTpBbnNpU3R5bGVJbnNlcnRDb21tYW5ke1xuICBpZiAoaXNfc3R5bGVfY29tbWFuZChhKSYmaXNfaW5zZXJ0X2NvbW1hbmQoYikgKXsgIFxuICAgIHJldHVybiB7XG4gICAgICBjb21tYW5kOlwic3R5bGVfaW5zZXJ0XCIsXG4gICAgICBwb3NpdGlvbjphLnBvc2l0aW9uLFxuICAgICAgc3R5bGU6YS5zdHlsZSxcbiAgICAgIHN0cjpiLnN0clxuICAgIH1cbiAgfVxuICBpZiAoaXNfc3R5bGVfY29tbWFuZChiKSYmaXNfaW5zZXJ0X2NvbW1hbmQoYSkgKXsgIFxuICAgIHJldHVybiB7XG4gICAgICBjb21tYW5kOlwic3R5bGVfaW5zZXJ0XCIsXG4gICAgICBwb3NpdGlvbjphLnBvc2l0aW9uLFxuICAgICAgc3R5bGU6Yi5zdHlsZSxcbiAgICAgIHN0cjphLnN0clxuICAgIH1cbiAgfSAgXG4gIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgYW5zaSBzdHJ1Y3R1cmVcIikgIFxufVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlX2luc2VydHMoYTpBcnJheTxBbnNpSW5zZXJ0Q29tbWFuZD4sYjpBcnJheTxBbnNpSW5zZXJ0Q29tbWFuZD4pe1xuICBjb25zdCBhbnM9Wy4uLmEsLi4uYl0udG9Tb3J0ZWQoKGEsIGIpPT5hLnBvc2l0aW9uLWIucG9zaXRpb24pIC8vdG9kbzogbWFyZ2UgZmFzdGVyIHVzaW5nIHRoZSBmYWN0IHRoYXQgYSBhbmQgYiBhcmUgc29ydGVkIGJ5IHRoZW1zZWxmLCBvciBtYXliZSB0aGF0IGF1dG9tYXRpY2x5IGZhc3RlclxuICByZXR1cm4gYW5zXG59XG5leHBvcnQgZnVuY3Rpb24gbWVyZ2UoYTpBcnJheTxBbnNpQ29tbWFuZD4sYjpBcnJheTxBbnNpQ29tbWFuZD4pe1xuICBjb25zdCBzb3J0ZWQ9Wy4uLmEsLi4uYl0udG9Tb3J0ZWQoKGEsIGIpPT5hLnBvc2l0aW9uLWIucG9zaXRpb24pIC8vdG9kbzogbWFyZ2UgZmFzdGVyIHVzaW5nIHRoZSBmYWN0IHRoYXQgYSBhbmQgYiBhcmUgc29ydGVkIGJ5IHRoZW1zZWxmLCBvciBtYXliZSB0aGF0IGF1dG9tYXRpY2x5IGZhc3RlclxuICBjb25zdCBhbnM6QXJyYXk8QW5zaUNvbW1hbmQ+PVtdXG4gIGZvciAoY29uc3QgeCBvZiBzb3J0ZWQpe1xuICAgIGNvbnN0IGxhc3RfaW5kZXg6bnVtYmVyPWFucy5sZW5ndGggLSAxXG4gICAgY29uc3QgbGFzdF9pdGVtPWFuc1tsYXN0X2luZGV4XVxuICAgIGlmKGxhc3RfaXRlbT8ucG9zaXRpb249PT14LnBvc2l0aW9uKVxuICAgICAgYW5zW2xhc3RfaW5kZXhdID0gbWVyZ2Vfb25lKGxhc3RfaXRlbSx4KVxuICAgIGVsc2VcbiAgICAgIGFucy5wdXNoKHgpXG4gIH1cbiAgcmV0dXJuIGFuc1xufVxuY29uc3QgaHRtbF9lbnRpdHlfbWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnLFxufTtcblxuXG5mdW5jdGlvbiBlc2NhcGVfaHRtbF9jaGFyKGNoYXJfdG9fZXNjYXBlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gaHRtbF9lbnRpdHlfbWFwW2NoYXJfdG9fZXNjYXBlXSA/PyBjaGFyX3RvX2VzY2FwZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZV9odG1sKHtcbiAgc3R5bGVfcG9zaXRpb25zLFxuICBpbnNlcnRzLFxuICBwbGFpbl90ZXh0XG59OiB7XG4gIGluc2VydHM6IEFycmF5PEFuc2lJbnNlcnRDb21tYW5kPlxuICBzdHlsZV9wb3NpdGlvbnM6IEFycmF5PEFuc2lTdHlsZUNvbW1hbmQ+XG4gIHBsYWluX3RleHQ6IHN0cmluZ1xufSk6IHN0cmluZ3tcbiAgY2hlY2tfaW5zZXJ0c192YWxpZGl0eShpbnNlcnRzKTtcbiAgaWYgKHN0eWxlX3Bvc2l0aW9uc1swXT8ucG9zaXRpb24hPT0wKVxuICAgIHN0eWxlX3Bvc2l0aW9ucz1bLi4uc3R5bGVfcG9zaXRpb25zXVxuICBjaGVja19zdHlsZV9wb3NpdGlvbnNfdmFsaWRpdHkoc3R5bGVfcG9zaXRpb25zKTtcbiAgY29uc3QgY29tbWFuZHM9bWVyZ2UoaW5zZXJ0cyxzdHlsZV9wb3NpdGlvbnMpXG4gIGNvbnN0IGh0bWw6c3RyaW5nW109IFtdO1xuXG4gIGxldCBjb21tYW5kX2hlYWQgPSAwO1xuICBsZXQgcHVzaGVkX3N0eWxlOlN0eWxlfHVuZGVmaW5lZFxuICBmdW5jdGlvbiBwdXNoX3N0eWxlKHN0eWxlOlN0eWxlKXtcbiAgICBpZiAocHVzaGVkX3N0eWxlIT1udWxsKXtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInN0eWxlIGFscmVheSBvcGVuXCIpXG4gICAgfSAgICBcbiAgICBodG1sLnB1c2goYDxzcGFuICR7Z2V0X3N0eWxlX2NzcyhzdHlsZSl9PmApO1xuICAgIHB1c2hlZF9zdHlsZT1zdHlsZVxuICB9XG4gIGZ1bmN0aW9uIHBvcF9zdHlsZShhbGxvd19lbXB0eTpib29sZWFuKXsgXG4gICAgaWYgKHB1c2hlZF9zdHlsZT09bnVsbCl7XG4gICAgICBpZiAoYWxsb3dfZW1wdHkpXG4gICAgICAgIHJldHVybiBtYWtlX2NsZWFyX3N0eWxlX2NvbW1hbmQoMCkuc3R5bGVcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgbnVsbCBzdHlsZVwiKVxuICAgIH1cbiAgICBjb25zdCBhbnM9cHVzaGVkX3N0eWxlXG4gICAgcHVzaGVkX3N0eWxlPXVuZGVmaW5lZFxuICAgIGh0bWwucHVzaChgPC9zcGFuPmApO1xuICAgIHJldHVybiBhbnNcbiAgfVxuICBmdW5jdGlvbiBnZXRfY29tbWFuZChwb3NpdGlvbjpudW1iZXIpe1xuICAgIGZvcig7Oyl7XG4gICAgICBjb25zdCBhbnM9Y29tbWFuZHNbY29tbWFuZF9oZWFkXVxuICAgICAgaWYgKGFucz09bnVsbClcbiAgICAgICAgcmV0dXJuIFxuICAgICAgaWYgKGFucy5wb3NpdGlvbj09PXBvc2l0aW9uKVxuICAgICAgICByZXR1cm4gYW5zXG4gICAgICBpZiAoYW5zLnBvc2l0aW9uPnBvc2l0aW9uKVxuICAgICAgICByZXR1cm5cbiAgICAgIGNvbW1hbmRfaGVhZCsrXG4gICAgfVxuICB9XG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IHBsYWluX3RleHQubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjb21tYW5kPWdldF9jb21tYW5kKGkpXG4gICAgaWYgKGlzX2luc2VydF9jb21tYW5kKGNvbW1hbmQpKXtcbiAgICAgIGNvbnN0IHN0eWxlPXBvcF9zdHlsZShpPT09MClcbiAgICAgIGh0bWwucHVzaChjb21tYW5kLnN0cilcbiAgICAgIHB1c2hfc3R5bGUoc3R5bGUpXG4gICAgfVxuICAgIGlmIChpc19zdHlsZV9jb21tYW5kKGNvbW1hbmQpKXtcbiAgICAgIHBvcF9zdHlsZShpPT09MClcbiAgICAgIHB1c2hfc3R5bGUoY29tbWFuZC5zdHlsZSlcbiAgICB9XG4gICAgaWYgKGlzX3N0eWxlX2luc2VydF9jb21tYW5kKGNvbW1hbmQpKXtcbiAgICAgIHBvcF9zdHlsZShpPT09MClcbiAgICAgIGh0bWwucHVzaChjb21tYW5kLnN0cilcbiAgICAgIHB1c2hfc3R5bGUoY29tbWFuZC5zdHlsZSkgICAgICBcbiAgICB9XG4gICAgY29uc3QgYz1wbGFpbl90ZXh0W2ldIVxuICAgIGNvbnN0IGVzY2FwZWQ9ZXNjYXBlX2h0bWxfY2hhcihjKVxuICAgIGh0bWwucHVzaChlc2NhcGVkKVxuICB9XG4gIHBvcF9zdHlsZShwbGFpbl90ZXh0Lmxlbmd0aD09PTApXG4gIGNvbnN0IGFucz1odG1sLmpvaW4oJycpXG4gIHJldHVybiBhbnNcbn1cblxuLyoqXG4gKiBNYXBzIHN0YW5kYXJkIEFOU0kgY29sb3IgY29kZXMgdG8gQ1NTIG5hbWVkIGNvbG9ycy5cbiAqL1xuZnVuY3Rpb24gZ2V0QW5zaU5hbWVkQ29sb3IoY29kZTogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3QgbWFwOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+ID0ge1xuICAgIDA6IFwiYmxhY2tcIiwgMTogXCJyZWRcIiwgMjogXCJncmVlblwiLCAzOiBcInllbGxvd1wiLCA0OiBcImJsdWVcIiwgNTogXCJtYWdlbnRhXCIsIDY6IFwiY3lhblwiLCA3OiBcIndoaXRlXCIsXG4gICAgODogXCJncmF5XCIsIDk6IFwicmVkXCIsIDEwOiBcImxpbWVcIiwgMTE6IFwieWVsbG93XCIsIDEyOiBcImJsdWVcIiwgMTM6IFwiZnVjaHNpYVwiLCAxNDogXCJhcXVhXCIsIDE1OiBcIndoaXRlXCJcbiAgfTtcbiAgcmV0dXJuIG1hcFtjb2RlXSB8fCBcIndoaXRlXCI7XG59XG5cbi8qKlxuICogQ29udmVydHMgOC1iaXQgQU5TSSAoMC0yNTUpIHRvIGEgQ1NTIGNvbG9yIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZ2V0OEJpdENvbG9yKG46IG51bWJlcik6IHN0cmluZyB7XG4gIGlmIChuIDwgMTYpIHJldHVybiBnZXRBbnNpTmFtZWRDb2xvcihuKTtcbiAgaWYgKG4gPj0gMjMyKSB7XG4gICAgY29uc3QgdiA9IChuIC0gMjMyKSAqIDEwICsgODtcbiAgICByZXR1cm4gYHJnYigke3Z9LCR7dn0sJHt2fSlgO1xuICB9XG4gIGNvbnN0IG4yID0gbiAtIDE2O1xuICBjb25zdCByID0gTWF0aC5mbG9vcihuMiAvIDM2KSAqIDUxO1xuICBjb25zdCBnID0gTWF0aC5mbG9vcigobjIgJSAzNikgLyA2KSAqIDUxO1xuICBjb25zdCBiID0gKG4yICUgNikgKiA1MTtcbiAgcmV0dXJuIGByZ2IoJHtyfSwke2d9LCR7Yn0pYDtcbn1cblxuZnVuY3Rpb24gY2xvbmVfc3R5bGUoc3R5bGU6IFN0eWxlKTogU3R5bGUge1xuICAvLyBSZXF1aXJlbWVudDogaWYgYWxsIGZvbnQgc3R5bGVzIGFyZSBub3JtYWwsIGRvbid0IHJlcG9ydCAnbm9ybWFsJ1xuICByZXR1cm4gey4uLnN0eWxlLGZvbnRfc3R5bGVzOm5ldyBTZXQoc3R5bGUuZm9udF9zdHlsZXMpfVxufVxuXG5mdW5jdGlvbiBpc19zYW1lX3N0eWxlKGE6IFN0eWxlfHVuZGVmaW5lZCwgYjogU3R5bGUpOiBib29sZWFuIHtcbiAgaWYgKGEgPT0gbnVsbClcbiAgICByZXR1cm4gZmFsc2VcbiAgaWYgKGEuZm9yZWdyb3VuZCAhPT0gYi5mb3JlZ3JvdW5kIHx8IGEuYmFja2dyb3VuZCAhPT0gYi5iYWNrZ3JvdW5kKVxuICAgIHJldHVybiBmYWxzZVxuICBpZiAoYS5mb250X3N0eWxlcy5zaXplICE9PSBiLmZvbnRfc3R5bGVzLnNpemUpXG4gICAgcmV0dXJuIGZhbHNlXG4gIGZvciAoY29uc3Qgc3R5bGUgb2YgYS5mb250X3N0eWxlcylcbiAgICBpZiAoIWIuZm9udF9zdHlsZXMuaGFzKHN0eWxlKSlcbiAgICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gdHJ1ZVxufVxuXG5mdW5jdGlvbiBhcHBseVNHUkNvZGUocGFyYW1zOiBudW1iZXJbXSwgc3R5bGU6IFN0eWxlKTogdm9pZCB7XG4gIC8vdG9kbyBnb3RvIGFuZCB2ZXJpZnkgdGhhdCBjb3JyZWN0IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQ4NDI0MjQvbGlzdC1vZi1hbnNpLWNvbG9yLWVzY2FwZS1zZXF1ZW5jZXNcbiAgbGV0IGkgPSAwO1xuICB3aGlsZSAoaSA8IHBhcmFtcy5sZW5ndGgpIHtcbiAgICBjb25zdCBjb2RlID0gcGFyYW1zW2ldITtcblxuICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICBzdHlsZS5mb3JlZ3JvdW5kID0gdW5kZWZpbmVkO1xuICAgICAgc3R5bGUuYmFja2dyb3VuZCA9IHVuZGVmaW5lZDtcbiAgICAgIHN0eWxlLmZvbnRfc3R5bGVzLmNsZWFyKCk7XG4gICAgICBpKys7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBGb250IFN0eWxlc1xuICAgIGlmIChjb2RlID09PSAxKSB7IHN0eWxlLmZvbnRfc3R5bGVzLmFkZCgnYm9sZCcpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDIpIHsgc3R5bGUuZm9udF9zdHlsZXMuYWRkKCdmYWludCcpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDMpIHsgc3R5bGUuZm9udF9zdHlsZXMuYWRkKCdpdGFsaWMnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSA0KSB7IHN0eWxlLmZvbnRfc3R5bGVzLmFkZCgndW5kZXJsaW5lJyk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gNSkgeyBzdHlsZS5mb250X3N0eWxlcy5hZGQoJ2JsaW5raW5nJyk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gNykgeyBzdHlsZS5mb250X3N0eWxlcy5hZGQoJ2ludmVyc2UnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSA5KSB7IHN0eWxlLmZvbnRfc3R5bGVzLmFkZCgnc3RyaWtldGhyb3VnaCcpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDIyKSB7IHN0eWxlLmZvbnRfc3R5bGVzLmRlbGV0ZSgnZmFpbnQnKTtzdHlsZS5mb250X3N0eWxlcy5kZWxldGUoJ2JvbGQnKTsgaSsrOyBjb250aW51ZTsgfVxuXG4gICAgLy8gRm9yZWdyb3VuZCAoU3RhbmRhcmQgJiBCcmlnaHQpXG4gICAgaWYgKGNvZGUgPj0gMzAgJiYgY29kZSA8PSAzNykgeyBzdHlsZS5mb3JlZ3JvdW5kID0gZ2V0QW5zaU5hbWVkQ29sb3IoY29kZSAtIDMwKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID49IDkwICYmIGNvZGUgPD0gOTcpIHsgc3R5bGUuZm9yZWdyb3VuZCA9IGdldEFuc2lOYW1lZENvbG9yKGNvZGUgLSA5MCArIDgpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDM5KSB7IHN0eWxlLmZvcmVncm91bmQgPSB1bmRlZmluZWQ7IGkrKzsgY29udGludWU7IH1cblxuICAgIC8vIEJhY2tncm91bmQgKFN0YW5kYXJkICYgQnJpZ2h0KVxuICAgIGlmIChjb2RlID49IDQwICYmIGNvZGUgPD0gNDcpIHsgc3R5bGUuYmFja2dyb3VuZCA9IGdldEFuc2lOYW1lZENvbG9yKGNvZGUgLSA0MCk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA+PSAxMDAgJiYgY29kZSA8PSAxMDcpIHsgc3R5bGUuYmFja2dyb3VuZCA9IGdldEFuc2lOYW1lZENvbG9yKGNvZGUgLSAxMDAgKyA4KTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSA0OSkgeyBzdHlsZS5iYWNrZ3JvdW5kID0gdW5kZWZpbmVkOyBpKys7IGNvbnRpbnVlOyB9XG5cbiAgICAvLyBFeHRlbmRlZCBDb2xvcnMgKDM4PUZHLCA0OD1CRylcbiAgICBpZiAoY29kZSA9PT0gMzggfHwgY29kZSA9PT0gNDgpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGNvZGUgPT09IDM4ID8gJ2ZvcmVncm91bmQnIDogJ2JhY2tncm91bmQnO1xuICAgICAgY29uc3QgdHlwZSA9IHBhcmFtc1tpICsgMV07XG5cbiAgICAgIGlmICh0eXBlID09PSA1KSB7IC8vIDgtYml0XG4gICAgICAgIHN0eWxlW3RhcmdldF0gPSBnZXQ4Qml0Q29sb3IocGFyYW1zW2kgKyAyXSEpO1xuICAgICAgICBpICs9IDM7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGUgPT09IDIpIHsgLy8gMjQtYml0XG4gICAgICAgIHN0eWxlW3RhcmdldF0gPSBgcmdiKCR7cGFyYW1zW2kgKyAyXX0sJHtwYXJhbXNbaSArIDNdfSwke3BhcmFtc1tpICsgNF19KWA7XG4gICAgICAgIGkgKz0gNTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaSsrO1xuICB9XG59XG5mdW5jdGlvbiBkZWR1cF9wb3NpdGlvbnMoc3R5bGVfcG9zaXRpb25zOkFycmF5PEFuc2lTdHlsZUNvbW1hbmQ+KXtcbiAgY29uc3QgYW5zPVtdXG4gIGxldCBsYXN0OkFuc2lTdHlsZUNvbW1hbmR8dW5kZWZpbmVkXG4gIGZvciAoY29uc3QgeCBvZiBzdHlsZV9wb3NpdGlvbnMpe1xuICAgIGNvbnN0IHNhbWU9aXNfc2FtZV9zdHlsZShsYXN0Py5zdHlsZSx4LnN0eWxlKVxuICAgIGxhc3Q9eFxuICAgIGlmICghc2FtZSlcbiAgICAgIGFucy5wdXNoKHgpXG4gIH1cbiAgcmV0dXJuIGFuc1xufVxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwX2Fuc2kodGV4dDogc3RyaW5nLCBzdGFydF9zdHlsZTogU3R5bGUpe1xuICBjb25zdCBzdHlsZV9wb3NpdGlvbnM6IEFycmF5PEFuc2lTdHlsZUNvbW1hbmQ+ID0gW107XG4gIGlmICghaXNfY2xlYXJfc3R5bGUoc3RhcnRfc3R5bGUpKVxuICAgIHN0eWxlX3Bvc2l0aW9ucy5wdXNoKHtcbiAgICAgICAgY29tbWFuZDonc3R5bGUnLFxuICAgICAgICBzdHlsZTpzdGFydF9zdHlsZSxcbiAgICAgICAgcG9zaXRpb246MFxuICAgIH0pXG4gIGNvbnN0IHN0cmluZ3M9W11cbiAgY29uc3QgY3VycmVudF9zdHlsZSA9IHsgLi4uc3RhcnRfc3R5bGUsIGZvbnRfc3R5bGVzOiBuZXcgU2V0KHN0YXJ0X3N0eWxlLmZvbnRfc3R5bGVzKSB9O1xuICBjb25zdCBsaW5rX2luc2VydHM6QXJyYXk8QW5zaUluc2VydENvbW1hbmQ+PVtdXG5cbiAgbGV0IGxhc3RfaW5kZXggPSAwO1xuICBsZXQgcG9zaXRpb249MFxuICBmdW5jdGlvbiBhcHBseV9jb2xvcihjb2xvcjpzdHJpbmcpe1xuICAgIGNvbnN0IHBhcmFtcyA9IGNvbG9yLnNwbGl0KCc7JykubWFwKHAgPT4gcGFyc2VJbnQocCB8fCBcIjBcIiwgMTApKTtcbiAgICBhcHBseVNHUkNvZGUocGFyYW1zLCBjdXJyZW50X3N0eWxlKTtcblxuICAgIGNvbnN0IGNsb25lZDpBbnNpU3R5bGVDb21tYW5kPXtzdHlsZTpjbG9uZV9zdHlsZShjdXJyZW50X3N0eWxlKSxwb3NpdGlvbixjb21tYW5kOidzdHlsZSd9XG4gICAgY29uc3QgbGFzdF9zdHlsZT1zdHlsZV9wb3NpdGlvbnMuYXQoLTEpXG4gICAgaWYgKGlzX3NhbWVfc3R5bGUobGFzdF9zdHlsZT8uc3R5bGUsIGNsb25lZC5zdHlsZSkpXG4gICAgICAgIHJldHVyblxuICAgIGlmIChsYXN0X3N0eWxlPy5wb3NpdGlvbj09PXBvc2l0aW9uKSB7XG4gICAgICBzdHlsZV9wb3NpdGlvbnMuc3BsaWNlKC0xLDEsY2xvbmVkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHN0eWxlX3Bvc2l0aW9ucy5wdXNoKGNsb25lZClcbiAgfVxuXG4gIGZvciAoY29uc3QgbWF0Y2ggb2YgdGV4dC5tYXRjaEFsbChhbnNpX3JlZ2V4KSl7XG4gICAgLy8gMS4gQWNjdW11bGF0ZSBwbGFpbiB0ZXh0XG4gICAgY29uc3Qge2luZGV4fT1tYXRjaFxuICAgIGNvbnN0IHNraXBfc3RyPXRleHQuc2xpY2UobGFzdF9pbmRleCwgaW5kZXgpXG4gICAgcG9zaXRpb24rPXNraXBfc3RyLmxlbmd0aFxuICAgIHN0cmluZ3MucHVzaChza2lwX3N0cilcbiAgICBcblxuICAgIGNvbnN0IHNlcXVlbmNlID0gbWF0Y2hbMF07XG4gICAgbGFzdF9pbmRleCA9IGluZGV4K3NlcXVlbmNlLmxlbmd0aFxuICAgIGNvbnN0IGNvbG9yPXBhcnNlX2dyb3VwX3N0cmluZyhtYXRjaCwnY29sb3InKVxuICAgIGlmIChjb2xvciE9bnVsbCl7XG4gICAgICBhcHBseV9jb2xvcihjb2xvcilcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGNvbnN0IHVybD1wYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ3VybCcpXG4gICAgY29uc3QgbGlua190ZXh0PXBhcnNlX2dyb3VwX3N0cmluZyhtYXRjaCwnbGlua190ZXh0JylcbiAgICBpZiAodXJsIT1udWxsICYmIGxpbmtfdGV4dCE9bnVsbCl7XG4gICAgICBsaW5rX2luc2VydHMucHVzaCh7XG4gICAgICAgIHN0cjpgPHNwYW4gZGF0YS11cmw9JHt1cmx9PiR7bGlua190ZXh0fTwvc3Bhbj5gLFxuICAgICAgICBwb3NpdGlvbixcbiAgICAgICAgY29tbWFuZDonaW5zZXJ0J1xuICAgICAgfSlcbiAgICB9XG5cbiAgfVxuICBjb25zdCBkZWR1cGVkPWRlZHVwX3Bvc2l0aW9ucyhzdHlsZV9wb3NpdGlvbnMpLy9kZWR1cF9wb3NpdGlvbnMgaXMgbmVlZGVkIGV2ZW4gdGhvb3cgd2Uga25vd2VuIG91dCBhIGZldyBhYm92ZSBcbiAgY29uc3Qgd2l0aF9wb3MwPWZ1bmN0aW9uKCl7IC8vaSB3YW50IGEgc3R5bGUgYXQgcG9zIDAgdG8gaGVscCB0aGUgbG9naWMgb2YgZ2VuZXRhdGVfaHRtbFxuICAgIGlmIChkZWR1cGVkWzBdPy5wb3NpdGlvbiE9PTApXG4gICAgICByZXR1cm4gW21ha2VfY2xlYXJfc3R5bGVfY29tbWFuZCgwKSwuLi5kZWR1cGVkXVxuICAgIHJldHVybiBkZWR1cGVkXG4gIH0oKVxuICBjb25zdCBhbnM9IHtcbiAgICBwbGFpbl90ZXh0OnN0cmluZ3Muam9pbignJykrdGV4dC5zbGljZShsYXN0X2luZGV4KSxcbiAgICBzdHlsZV9wb3NpdGlvbnM6d2l0aF9wb3MwLFxuICAgIGxpbmtfaW5zZXJ0c1xuICB9OyBcbiAgLy9jb25zb2xlLmxvZyhhbnMpXG4gIHJldHVybiBhbnNcbn1cbiIsICJpbXBvcnQge2NyZWF0ZV9lbGVtZW50LGdldF9wYXJlbnRfYnlfY2xhc3MsaGFzX2NsYXNzLHVwZGF0ZV9jaGlsZF9odG1sLEhpZ2hsaWdodEV4fSBmcm9tICcuL2RvbV91dGlscy5qcydcbmltcG9ydCB7bmx9IGZyb20gXCJAeWlnYWwvYmFzZV90eXBlc1wiXG5pbnRlcmZhY2UgX1N0YXJ0RW5ke1xuICBzdGFydDpudW1iZXJcbiAgZW5kOm51bWJlclxufVxuaW50ZXJmYWNlIE5vZGVPZmZzZXR7XG4gIG5vZGU6Tm9kZVxuICBub2RlX3BvczpudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZWFyY2hEYXRhe1xuICB0ZXJtX2VsOkhUTUxFbGVtZW50XG4gIHRlcm1fdGV4dDpIVE1MRWxlbWVudFxuICBoaWdobGlnaHQ6SGlnaGxpZ2h0RXggIFxufVxuY2xhc3MgUmFuZ2VGaW5kZXJ7XG4gIHdhbGtlclxuICBjdXJfbm9kZTpOb2RlfG51bGw9bnVsbFxuICBjdXJfbGVuZ3RoPTBcbiAgdGV4dF9oZWFkPTBcbiAgYWxsX2RvbmU9ZmFsc2VcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIGVsOkVsZW1lbnRcbiAgKXtcbiAgICB0aGlzLndhbGtlcj1kb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGVsLCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG4gICAgdGhpcy5nZXRfbmV4dF9ub2RlKClcbiAgfVxuICBnZXRfbmV4dF9ub2RlKCl7XG4gICAgdGhpcy50ZXh0X2hlYWQrPXRoaXMuY3VyX2xlbmd0aFxuICAgIHRoaXMuY3VyX25vZGU9dGhpcy53YWxrZXIubmV4dE5vZGUoKVxuICAgIGlmICh0aGlzLmN1cl9ub2RlPT1udWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic2NyaXB0c21vbjpjdXIgbm9kZSBpcyBudWxsXCIpICAgIFxuICAgIHRoaXMuY3VyX2xlbmd0aD10aGlzLmN1cl9ub2RlLnRleHRDb250ZW50Py5sZW5ndGh8fDBcbiAgfVxuICBnZXRfbm9kZV9vZmZzZXQocG9zOm51bWJlcik6Tm9kZU9mZnNldHtcbiAgICB3aGlsZSh0cnVlKXtcbiAgICAgIGlmIChwb3M+PXRoaXMudGV4dF9oZWFkJiYgcG9zPHRoaXMudGV4dF9oZWFkK3RoaXMuY3VyX2xlbmd0aCsxKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbm9kZTp0aGlzLmN1cl9ub2RlISxcbiAgICAgICAgICAgIG5vZGVfcG9zOnBvcy10aGlzLnRleHRfaGVhZFxuICAgICAgICB9XG4gICAgICB0aGlzLmdldF9uZXh0X25vZGUoKVxuICAgIH1cbiAgfVxufVxuaW50ZXJmYWNlIExpbmVSYW5nZXN7XG4gIGxpbmVfbnVtYmVyOm51bWJlclxuICByYW5nZXM6QXJyYXk8UmFuZ2U+XG4gIGxpbmVfbGVuZ3RoOm51bWJlclxufVxuXG5jbGFzcyBSZWdFeHBTZWFyY2hlcntcbiAgY2hpbGRyZW5cbiAgbGFzdF9saW5lX3JhbmdlczpMaW5lUmFuZ2VzfHVuZGVmaW5lZFxuICBsaW5lX2hlYWQ9MFxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgc2VhcmNoX2RhdGE6U2VhcmNoRGF0YSxcbiAgICBwdWJsaWMgcmVnZXg6UmVnRXhwLFxuICApe1xuICAgIHRoaXMuY2hpbGRyZW49c2VhcmNoX2RhdGEudGVybV90ZXh0LmNoaWxkcmVuXG4gICAgdGhpcy5zZWFyY2hfZGF0YS5oaWdobGlnaHQuY2xlYXIoKVxuICB9XG5cbiAgZ2V0X2xpbmVfcmFuZ2VzKGxpbmVfbnVtYmVyOm51bWJlcil7XG4gICAgY29uc3QgbGluZT1ubCh0aGlzLmNoaWxkcmVuW2xpbmVfbnVtYmVyXSlcbiAgICBjb25zdCB7dGV4dENvbnRlbnR9PWxpbmVcbiAgICBjb25zdCBsaW5lX2xlbmd0aD10ZXh0Q29udGVudC5sZW5ndGhcbiAgICBpZiAodGhpcy5sYXN0X2xpbmVfcmFuZ2VzICYmXG4gICAgICB0aGlzLmxhc3RfbGluZV9yYW5nZXMubGluZV9sZW5ndGg9PT1saW5lX2xlbmd0aCYmXG4gICAgICB0aGlzLmxhc3RfbGluZV9yYW5nZXMubGluZV9udW1iZXI9PT1saW5lX251bWJlclxuICAgIClcbiAgICAgIHJldHVybiBcbiAgICBjb25zdCByYW5nZXM9W11cbiAgICBsZXQgcmFuZ2VfZmluZGVyOlJhbmdlRmluZGVyfHVuZGVmaW5lZFxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgdGV4dENvbnRlbnQubWF0Y2hBbGwodGhpcy5yZWdleCkpe1xuICAgICAgaWYgKHJhbmdlX2ZpbmRlcj09bnVsbCkgLy8gZXJyb3IgVFMyNDQ4OiBCbG9jay1zY29wZWQgdmFyaWFibGUgJ3JhbmdlX2ZpbmRlcicgdXNlZCBiZWZvcmUgaXRzIGRlY2xhcmF0aW9uLiB3aHk/XG4gICAgICAgICAgcmFuZ2VfZmluZGVyPW5ldyBSYW5nZUZpbmRlcihsaW5lKVxuICAgICAgY29uc3QgcmFuZ2U9bmV3IFJhbmdlKClcbiAgICAgIGNvbnN0IHN0YXJ0PXJhbmdlX2ZpbmRlci5nZXRfbm9kZV9vZmZzZXQobWF0Y2guaW5kZXgpXG4gICAgICBjb25zdCBlbmQ9cmFuZ2VfZmluZGVyLmdldF9ub2RlX29mZnNldChtYXRjaC5pbmRleCttYXRjaFswXS5sZW5ndGgpXG4gICAgICByYW5nZS5zZXRTdGFydChzdGFydC5ub2RlLHN0YXJ0Lm5vZGVfcG9zKVxuICAgICAgcmFuZ2Uuc2V0RW5kKGVuZC5ub2RlLGVuZC5ub2RlX3BvcylcbiAgICAgIHJhbmdlcy5wdXNoKHJhbmdlKVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbGluZV9sZW5ndGgsXG4gICAgICByYW5nZXMsXG4gICAgICBsaW5lX251bWJlclxuICAgIH1cbiAgfVxuXG4gIGdldF9zdGFydF9saW5lKCl7XG4gICAgaWYgKHRoaXMubGFzdF9saW5lX3Jhbmdlcz09bnVsbClcbiAgICAgIHJldHVybiAwXG4gICAgcmV0dXJuIHRoaXMubGFzdF9saW5lX3Jhbmdlcy5saW5lX251bWJlclxuICB9XG4gIGFwcGx5X2N1cl9yYW5nZXMoY3VyX3JhbmdlczpMaW5lUmFuZ2VzKXtcbiAgICBpZiAodGhpcy5sYXN0X2xpbmVfcmFuZ2VzJiZ0aGlzLmxhc3RfbGluZV9yYW5nZXMubGluZV9udW1iZXI9PT1jdXJfcmFuZ2VzLmxpbmVfbnVtYmVyKXtcbiAgICAgIGZvciAoY29uc3QgcmFuZ2Ugb2YgdGhpcy5sYXN0X2xpbmVfcmFuZ2VzLnJhbmdlcyl7XG4gICAgICAgIHRoaXMuc2VhcmNoX2RhdGEuaGlnaGxpZ2h0LmRlbGV0ZShyYW5nZSlcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCByYW5nZSBvZiBjdXJfcmFuZ2VzLnJhbmdlcyl7XG4gICAgICB0aGlzLnNlYXJjaF9kYXRhLmhpZ2hsaWdodC5hZGQocmFuZ2UpXG4gICAgfVxuXG4gIH1cbiAgaXRlcj0oKT0+e1xuICAgIGZvciAobGV0IGxpbmU9dGhpcy5nZXRfc3RhcnRfbGluZSgpO2xpbmU8dGhpcy5jaGlsZHJlbi5sZW5ndGg7bGluZSsrKXtcbiAgICAgIGNvbnN0IGN1cl9yYW5nZXM9dGhpcy5nZXRfbGluZV9yYW5nZXMobGluZSlcbiAgICAgIGlmIChjdXJfcmFuZ2VzPT1udWxsKSAvL2NhY2hlZCByZXN1bHQgZGlkbnQgY2hhbmdlIC0gYWxyZWFkeSBhcHBsaWVkXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB0aGlzLmFwcGx5X2N1cl9yYW5nZXMoY3VyX3JhbmdlcylcbiAgICAgIHRoaXMubGFzdF9saW5lX3Jhbmdlcz1jdXJfcmFuZ2VzXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VfcmVnZXgoeyB0eHQsIG1hdGNoX2Nhc2UsIHdob2xlX3dvcmQsIHJlZ19leCB9OnsgXG4gIHR4dDpzdHJpbmcsIFxuICBtYXRjaF9jYXNlOmJvb2xlYW4sIFxuICB3aG9sZV93b3JkOmJvb2xlYW4sIFxuICByZWdfZXg6Ym9vbGVhbiBcbn0pIHtcbiAgICBsZXQgcGF0dGVybiA9IHR4dDtcbiAgICBpZiAodHh0PT09JycpXG4gICAgICByZXR1cm5cbiAgICBsZXQgZmxhZ3MgPSBcImdcIjtcblxuICAgIGlmICghbWF0Y2hfY2FzZSkge1xuICAgICAgICBmbGFncyArPSBcImlcIjtcbiAgICB9XG5cbiAgICBpZiAoIXJlZ19leCkge1xuICAgICAgICAvLyBFc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGZvciBhIGxpdGVyYWwgc3RyaW5nIG1hdGNoXG4gICAgICAgIHBhdHRlcm4gPSB0eHQucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICAgIH1cblxuICAgIGlmICh3aG9sZV93b3JkKSB7XG4gICAgICAgIHBhdHRlcm4gPSBgXFxcXGIke3BhdHRlcm59XFxcXGJgO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbn1cbmZ1bmN0aW9uIGdldF9yZWdleHBfc3RyaW5nKHBhdHRlcm46IFJlZ0V4cHx1bmRlZmluZWQpOiBzdHJpbmcge1xuICBpZiAocGF0dGVybj09bnVsbClcbiAgICByZXR1cm4gJ25vbmUnXG4gIGNvbnN0IHNvdXJjZSA9IHBhdHRlcm4uc291cmNlO1xuICBjb25zdCBmbGFncyA9IHBhdHRlcm4uZmxhZ3M7XG5cbiAgaWYgKGZsYWdzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gYC8ke3NvdXJjZX0vJHtmbGFnc31gO1xuICB9XG5cbiAgcmV0dXJuIGAvJHtzb3VyY2V9L2A7XG59XG5mdW5jdGlvbiB0cnVuayh4Om51bWJlcixtaW46bnVtYmVyLG1heDpudW1iZXIpe1xuICBpZiAoeD5tYXgpXG4gICAgcmV0dXJuIG1pblxuICBpZiAoeDxtaW4pXG4gICAgcmV0dXJuIG1heFxuICByZXR1cm4geFxufVxuZXhwb3J0IGNsYXNzIFRlcm1pbmFsU2VhcmNoe1xuICBmaW5kX3dpZGdldFxuICBpbnRlcnZhbF9pZFxuICByZWdleF9zZWFyY2hlcjpSZWdFeHBTZWFyY2hlcnx1bmRlZmluZWRcbiAgcmVnZXg6UmVnRXhwfHVuZGVmaW5lZFxuICBzZWxlY3Rpb249MFxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgZGF0YTpTZWFyY2hEYXRhXG4gICl7XG4gICAgICB0aGlzLmZpbmRfd2lkZ2V0PWNyZWF0ZV9lbGVtZW50KGBcbiAgICAgIDxkaXYgY2xhc3M9XCJmaW5kX3dpZGdldF9jb250YWluZXIgaGlkZGVuXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJmaW5kX3Rvb2xiYXJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmluZF9pbnB1dF93cmFwcGVyXCI+XG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImZpbmRfaW5wdXRfZmllbGRcIiBwbGFjZWhvbGRlcj1cIkZpbmRcIiBpZD1cImZpbmRfaW5wdXRcIiAvPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjdGlvbl9idXR0b25zXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpY29uX2J1dHRvblwiIHRpdGxlPVwiTWF0Y2ggQ2FzZVwiIGlkPW1hdGNoX2Nhc2U+QWE8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImljb25fYnV0dG9uXCIgdGl0bGU9XCJNYXRjaCBXaG9sZSBXb3JkXCIgaWQ9d2hvbGVfd29yZD48dT5hYjwvdT48L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImljb25fYnV0dG9uXCIgdGl0bGU9XCJVc2UgUmVndWxhciBFeHByZXNzaW9uXCIgaWQ9cmVnX2V4Pi4qPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibmF2aWdhdGlvbl9idXR0b25zXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzX2NvbnRhaW5lclwiIGlkPVwibWF0Y2hfc3RhdHVzXCI+XG4gICAgICAgICAgICAgIDAgb2YgMFxuICAgICAgICAgICAgPC9kaXY+ICAgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibmF2X2J1dHRvblwiIGlkPVwicHJldl9tYXRjaFwiIHRpdGxlPVwiUHJldmlvdXMgTWF0Y2ggKFNoaWZ0K0YzKVwiPlxuICAgICAgICAgICAgICAgJiN4MjE5MTtcbiAgICAgICAgICAgIDwvZGl2PiAgICAgICAgICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuYXZfYnV0dG9uXCIgaWQ9XCJuZXh0X21hdGNoXCIgdGl0bGU9XCJOZXh0IE1hdGNoIChGMylcIj5cbiAgICAgICAgICAgICAgICYjeDIxOTM7XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuYXZfYnV0dG9uXCIgaWQ9XCJjbG9zZV93aWRnZXRcIiB0aXRsZT1cIkNsb3NlIChFc2NhcGUpXCI+XG4gICAgICAgICAgICAgIFx1MDBEN1xuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGlkPVwicmVnZXhcIiB0aXRsZT1cIkNsb3NlIChFc2NhcGUpXCI+XG4gICAgICAgICAgICAgIGRmXG4gICAgICAgICAgICA8L2Rpdj4gICAgICAgICAgICBcbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgXG4gICAgXG4gICAgICA8L2Rpdj5gLHRoaXMuZGF0YS50ZXJtX2VsKVxuICAgICAgdGhpcy5kYXRhLnRlcm1fZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLHRoaXMub25jbGljaykgICAgXG4gICAgICB0aGlzLmRhdGEudGVybV9lbC5hZGRFdmVudExpc3RlbmVyKFwibW91cHNlZG93blwiLCAoZSkgPT4ge1xuICAvLyBUaGlzIHByZXZlbnRzIHRoZSBmb2N1cyBzaGlmdCBhbmQgc2VsZWN0aW9uIGNsZWFyXG4gICAgICAgIGNvbnN0IHt0YXJnZXR9PWVcbiAgICAgICAgaWYgKCEodGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICBjb25zdCBwYXJlbnQ9Z2V0X3BhcmVudF9ieV9jbGFzcyh0YXJnZXQsJ3Rlcm1fdGV4dCcpXG4gICAgICAgIGlmIChwYXJlbnQhPT10aGlzLmRhdGEudGVybV90ZXh0KVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5pbnB1dCgpIS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLHRoaXMudXBkYXRlX3NlYXJjaCkgICBcbiAgICAgIHRoaXMuaW5wdXQoKSEuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLHRoaXMudXBkYXRlX3NlYXJjaCkgICBcbiAgICAgIHRoaXMuaW50ZXJ2YWxfaWQ9c2V0SW50ZXJ2YWwodGhpcy5pdGVyLDIwKVxuICB9XG4gIHNob3coKXtcbiAgICB0aGlzLmZpbmRfd2lkZ2V0LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgdGhpcy5pbnB1dCgpPy5mb2N1cygpO1xuICB9XG4gIGFwcGx5X3NlbGVjdGlvbihkaWZmOm51bWJlcil7XG4gICAgdGhpcy5zZWxlY3Rpb24rPWRpZmZcbiAgICB0aGlzLnNlbGVjdGlvbj10cnVuayh0aGlzLnNlbGVjdGlvbiwxLHRoaXMuZGF0YS5oaWdobGlnaHQuc2l6ZSlcbiAgICBpZiAodGhpcy5zZWxlY3Rpb24hPT0wKVxuICAgICAgdGhpcy5kYXRhLmhpZ2hsaWdodC5zZWxlY3QodGhpcy5zZWxlY3Rpb24pICAgIFxuICB9XG4gIGNhbGNfbWF0Y2hfc3RhdHVzKCl7XG4gICAgaWYgKHRoaXMuZGF0YS5oaWdobGlnaHQuc2l6ZT09PTApe1xuICAgICAgLy90aGlzLnNlbGVjdGlvbj0xXG4gICAgICBpZiAodGhpcy5yZWdleF9zZWFyY2hlciE9bnVsbClcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPSdzZWFyY2hfZXJyb3InPk5vIFJlc3VsdHM8L2Rpdj5gXG4gICAgICByZXR1cm4gYDxkaXY+Tm8gUmVzdWx0czwvZGl2PmBcbiAgICB9XG4gICAgcmV0dXJuIGAke3RoaXMuc2VsZWN0aW9ufSBvZiAke3RoaXMuZGF0YS5oaWdobGlnaHQuc2l6ZX1gXG4gIH1cbiAgaXRlcj0oKT0+e1xuICAgIGlmICh0aGlzLnJlZ2V4X3NlYXJjaGVyKXtcbiAgICAgIHRoaXMucmVnZXhfc2VhcmNoZXIuaXRlcigpXG4gICAgICB0aGlzLmFwcGx5X3NlbGVjdGlvbigwKVxuICAgIH1cbiAgICBcbiAgICB1cGRhdGVfY2hpbGRfaHRtbCh0aGlzLmZpbmRfd2lkZ2V0LCcjbWF0Y2hfc3RhdHVzJyx0aGlzLmNhbGNfbWF0Y2hfc3RhdHVzKCkpXG4gIH1cbiAgaW5wdXQoKXtcbiAgICByZXR1cm4gdGhpcy5maW5kX3dpZGdldC5xdWVyeVNlbGVjdG9yPEhUTUxJbnB1dEVsZW1lbnQ+KCcjZmluZF9pbnB1dCcpXG4gIH1cbiAgc2VhcmNoX3Rlcm1fY2xlYXIoKXtcbiAgICBpZiAodGhpcy5yZWdleClcbiAgICAgIHRoaXMucmVnZXhfc2VhcmNoZXI9bmV3ICBSZWdFeHBTZWFyY2hlcih0aGlzLmRhdGEsdGhpcy5yZWdleCkgXG4gIH1cbiAgdXBkYXRlX3NlYXJjaD0oKT0+e1xuICAgIGNvbnN0IHR4dD10aGlzLmlucHV0KCkhLnZhbHVlXG4gICAgY29uc3QgbWF0Y2hfY2FzZT1oYXNfY2xhc3ModGhpcy5maW5kX3dpZGdldCwnI21hdGNoX2Nhc2UnLFwiY2hlY2tlZFwiKVxuICAgIGNvbnN0IHdob2xlX3dvcmQ9aGFzX2NsYXNzKHRoaXMuZmluZF93aWRnZXQsJyN3aG9sZV93b3JkJyxcImNoZWNrZWRcIilcbiAgICBjb25zdCByZWdfZXg9aGFzX2NsYXNzKHRoaXMuZmluZF93aWRnZXQsJyNyZWdfZXgnLFwiY2hlY2tlZFwiKVxuXG4gICAgY29uc3QgcmVnZXg9bWFrZV9yZWdleCh7dHh0LG1hdGNoX2Nhc2Usd2hvbGVfd29yZCxyZWdfZXh9KVxuICAgIHVwZGF0ZV9jaGlsZF9odG1sKHRoaXMuZmluZF93aWRnZXQsJyNyZWdleCcsZ2V0X3JlZ2V4cF9zdHJpbmcocmVnZXgpKVxuICAgIHRoaXMuZGF0YS5oaWdobGlnaHQuY2xlYXIoKVxuICAgIHRoaXMucmVnZXhfc2VhcmNoZXI9dW5kZWZpbmVkXG4gICAgdGhpcy5kYXRhLmhpZ2hsaWdodC5jbGVhcigpXG4gIFxuICAgIGlmIChyZWdleCE9bnVsbClcbiAgICAgIHRoaXMucmVnZXhfc2VhcmNoZXI9bmV3ICBSZWdFeHBTZWFyY2hlcih0aGlzLmRhdGEscmVnZXgpXG4gIH1cblxuICBvbmNsaWNrPShldmVudDpNb3VzZUV2ZW50KT0+e1xuICAgIGNvbnN0IHt0YXJnZXR9PWV2ZW50XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KXtcbiAgICAgIGNvbnN0IHBhcmVudD1nZXRfcGFyZW50X2J5X2NsYXNzKHRhcmdldCwndGVybV90ZXh0JylcbiAgICAgIGlmIChwYXJlbnQhPT10aGlzLmRhdGEudGVybV90ZXh0KVxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAgICBcbiAgICB9XG4gICAgaWYgKCEodGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuICAgICAgcmV0dXJuICAgIFxuICAgIGlmICh0YXJnZXQuaWQ9PT0nZmluZF9pbnB1dCcpe1xuICAgICAgdGFyZ2V0LmZvY3VzKClcbiAgICAgIHRoaXMuYXBwbHlfc2VsZWN0aW9uKDApXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0LmlkPT09J2Nsb3NlX3dpZGdldCcpe1xuICAgICAgZ2V0X3BhcmVudF9ieV9jbGFzcyh0YXJnZXQsJ2ZpbmRfd2lkZ2V0X2NvbnRhaW5lcicpPy5jbGFzc0xpc3QudG9nZ2xlKFwiaGlkZGVuXCIpO1xuICAgICAgcmV0dXJuXG4gICAgfSAgICBcbiAgICBpZiAodGFyZ2V0LmlkPT09J3ByZXZfbWF0Y2gnKXtcbiAgICAgIHRoaXMuZGF0YS50ZXJtX3RleHQuZm9jdXMoKSAvL2ZpcnN0IGZvY3VzIHRoZW4gYXBwbHkgc2VsZWN0aW9uIGRvIHRoYXQgYXBwbHlfc2VsZWN0aW9uIHdpbGwgdXNlIHNlbGVjdGlvbiByYXRoZXIgdGhhbiBzZWxlY3Rpb25faGlnaGxpZ2h0XG4gICAgICB0aGlzLmFwcGx5X3NlbGVjdGlvbigtMSlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAodGFyZ2V0LmlkPT09J25leHRfbWF0Y2gnKXtcbiAgICAgIHRoaXMuZGF0YS50ZXJtX3RleHQuZm9jdXMoKVxuICAgICAgdGhpcy5hcHBseV9zZWxlY3Rpb24oMSkgICAgIFxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgaWNvbl9idXR0b249Z2V0X3BhcmVudF9ieV9jbGFzcyh0YXJnZXQsJ2ljb25fYnV0dG9uJylcbiAgICBpZiAoaWNvbl9idXR0b24hPW51bGwpe1xuICAgICAgaWNvbl9idXR0b24uY2xhc3NMaXN0LnRvZ2dsZSgnY2hlY2tlZCcpXG4gICAgICB0aGlzLnVwZGF0ZV9zZWFyY2goKVxuICAgIH1cbiAgfVxufSIsICJcbmltcG9ydCAge3R5cGUgU3R5bGUsc3RyaXBfYW5zaSxnZW5lcmF0ZV9odG1sLHR5cGUgQW5zaUluc2VydENvbW1hbmQsIG1lcmdlX2luc2VydHN9IGZyb20gJy4vdGVybWluYWxzX2Fuc2kuanMnO1xuaW1wb3J0IHtnZXRfcGFyZW50X3dpdGhfZGF0YXNldCxjcmVhdGVfZWxlbWVudCxIaWdobGlnaHRFeH0gZnJvbSAnLi9kb21fdXRpbHMuanMnXG5pbXBvcnQge1Rlcm1pbmFsU2VhcmNoLHR5cGUgU2VhcmNoRGF0YX0gZnJvbSAnLi90ZXJtaW5hbF9zZWFyY2guanMnXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlUmFuZ2V7XG4gIHN0YXJ0Om51bWJlclxuICBlbmQ6bnVtYmVyXG4gIGRhdGFzZXQ6UmVjb3JkPHN0cmluZyxzdHJpbmc+XG59XG5leHBvcnQgaW50ZXJmYWNlIFRlcm1pbmFsTGlzdGVuZXJ7XG4gIHBhcnNlOihsaW5lX3RleHQ6c3RyaW5nLHN0YXRlOnVua25vd24pPT57XG4gICAgcGFyc2VyX3N0YXRlOnVua25vd24sXG4gICAgcmFuZ2VzOkFycmF5PFBhcnNlUmFuZ2U+IFxuICB9XG4gIGRhdGFzZXRfY2xpY2s6KGRhdGFzZXQ6UmVjb3JkPHN0cmluZyxzdHJpbmc+KT0+dm9pZFxuICBvcGVuX2xpbms6KHVybDpzdHJpbmcpPT52b2lkXG59XG50eXBlIENoYW5uZWw9J3N0ZGVycid8J3N0ZG91dCcgXG5pbnRlcmZhY2UgQ2hhbm5lbFN0YXRle1xuICBsYXN0X2xpbmU6c3RyaW5nXG4gIC8vbGFzdF9saW5lX3BsYWluOnN0cmluZ1xuICBzdGFydF9wYXJzZXJfc3RhdGU6dW5rbm93blxuICBlbmRfcGFyc2VyX3N0YXRlOnVua25vd25cbiAgc3RhcnRfc3R5bGU6U3R5bGVcbiAgZW5kX3N0eWxlOlN0eWxlXG4gIGNsYXNzX25hbWU6c3RyaW5nXG59XG5jb25zdCBjbGVhcl9zdHlsZTpTdHlsZT17XG4gIGZvcmVncm91bmQ6IHVuZGVmaW5lZCxcbiAgYmFja2dyb3VuZDogdW5kZWZpbmVkLFxuICBmb250X3N0eWxlczogbmV3IFNldCgpXG59XG5mdW5jdGlvbiBtYWtlX2NoYW5uZWxfc3RhdGVzKCk6UmVjb3JkPENoYW5uZWwsQ2hhbm5lbFN0YXRlPntcbiAgY29uc3Qgc3Rkb3V0OkNoYW5uZWxTdGF0ZT17XG4gICAgc3RhcnRfcGFyc2VyX3N0YXRlOnVuZGVmaW5lZCxcbiAgICBlbmRfcGFyc2VyX3N0YXRlOnVuZGVmaW5lZCxcbiAgICBzdGFydF9zdHlsZTpjbGVhcl9zdHlsZSxcbiAgICBjbGFzc19uYW1lOidsaW5lX3N0ZG91dCcsXG4gICAgZW5kX3N0eWxlOmNsZWFyX3N0eWxlLFxuICAgIGxhc3RfbGluZTonJyxcbiAgICAvL2xhc3RfbGluZV9wbGFpbjonJ1xuICB9XG4gIGNvbnN0IHN0ZGVycj17Li4uc3Rkb3V0LGNsYXNzX25hbWU6J2xpbmVfc3RkZXJyJ31cbiAgcmV0dXJuIHtcbiAgICBzdGRvdXQsXG4gICAgc3RkZXJyXG4gIH1cbn1cbmZ1bmN0aW9uIHJhbmdlX3RvX2luc2VydHMocmFuZ2U6UGFyc2VSYW5nZSk6QW5zaUluc2VydENvbW1hbmRbXXtcbiAgY29uc3Qge3N0YXJ0LGVuZCxkYXRhc2V0fT1yYW5nZVxuICBjb25zdCBkYXRhbWFwPU9iamVjdC5lbnRyaWVzKGRhdGFzZXQpLm1hcCgoW2ssdl0pPT5gZGF0YS0ke2t9PScke3Z9J2ApLmpvaW4oJycpXG4gIGNvbnN0IG9wZW49YDxzcGFuICR7ZGF0YW1hcH0+YFxuICBjb25zdCBjbG9zZT1gPC9zcGFuPmBcbiAgcmV0dXJuIFt7cG9zaXRpb246c3RhcnQsc3RyOm9wZW4sY29tbWFuZDonaW5zZXJ0J30se3Bvc2l0aW9uOmVuZCxzdHI6Y2xvc2UsY29tbWFuZDonaW5zZXJ0J31dXG59XG5mdW5jdGlvbiByYW5nZXNfdG9faW5zZXJ0cyhyYW5nZXM6QXJyYXk8UGFyc2VSYW5nZT4pe1xuICByZXR1cm4gcmFuZ2VzLmZsYXRNYXAocmFuZ2VfdG9faW5zZXJ0cylcbn1cbmZ1bmN0aW9uIGdldF9lbGVtZW50X2RhdGFzZXQgKGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMoT2JqZWN0LmVudHJpZXMoZWxlbWVudC5kYXRhc2V0KSkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn07XG5cbmV4cG9ydCBjbGFzcyBUZXJtaW5hbCBpbXBsZW1lbnRzIFNlYXJjaERhdGF7XG4gIGNoYW5uZWxfc3RhdGVzXG4gIHRlcm1fdGV4dFxuICB0ZXJtX2VsXG4gIHNlYXJjaFxuICBoaWdobGlnaHRcbiAgbGFzdF9jaGFubmVsXG5cbiAgLy90ZXh0X2luZGV4XG4gIGNvbnN0cnVjdG9yKFxuICAgIHBhcmVudDpIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIGxpc3RlbmVyOlRlcm1pbmFsTGlzdGVuZXIsXG4gICAgaWQ6c3RyaW5nXG4gICl7XG4gICAgdGhpcy5jaGFubmVsX3N0YXRlcz1tYWtlX2NoYW5uZWxfc3RhdGVzKClcbiAgICB0aGlzLnRlcm1fZWw9Y3JlYXRlX2VsZW1lbnQoYFxuPGRpdiBjbGFzcz10ZXJtID5cbiAgPGRpdiBjbGFzcz1cInRlcm1fdGV4dFwiIHRhYmluZGV4PVwiMFwiPjwvZGl2PlxuPC9kaXY+XG4gICAgYCxwYXJlbnQpXG4gICAgdGhpcy50ZXJtX3RleHQ9dGhpcy50ZXJtX2VsLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCcudGVybV90ZXh0JykhXG4gICAgdGhpcy50ZXJtX3RleHQuaW5uZXJIVE1MPScnXG4gICAgLy90aGlzLnRleHRfaW5kZXg9bmV3IEJpZ0ludDY0QXJyYXkoKVxuICAgIHRoaXMuaGlnaGxpZ2h0PW5ldyBIaWdobGlnaHRFeChgc2VhcmNoXyR7aWR9YCx0aGlzLnRlcm1fdGV4dClcbiAgICB0aGlzLnNlYXJjaD1uZXcgVGVybWluYWxTZWFyY2godGhpcylcbiAgICB0aGlzLnRlcm1fZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLHRoaXMub25jbGljaylcbiAgICB0aGlzLmxhc3RfY2hhbm5lbD10aGlzLmNoYW5uZWxfc3RhdGVzLnN0ZG91dFxuICB9XG5cbiAgb25jbGljaz0oZXZlbnQ6TW91c2VFdmVudCk9PntcbiAgICBjb25zdCB7dGFyZ2V0fT1ldmVudFxuICAgIGlmICghKHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSlcbiAgICAgIHJldHVybiAgICBcbiAgICBjb25zdCBwYXJlbnQ9Z2V0X3BhcmVudF93aXRoX2RhdGFzZXQodGFyZ2V0KVxuICAgIGlmIChwYXJlbnQ9PW51bGwpXG4gICAgICByZXR1cm4gIFxuICAgIGNvbnN0IGRhdGFzZXQ9Z2V0X2VsZW1lbnRfZGF0YXNldChwYXJlbnQpXG4gICAgY29uc3Qge3VybH09ZGF0YXNldFxuICAgIGlmICh1cmwhPW51bGwpXG4gICAgICB0aGlzLmxpc3RlbmVyLm9wZW5fbGluayh1cmwpXG4gICAgZWxzZVxuICAgICAgdGhpcy5saXN0ZW5lci5kYXRhc2V0X2NsaWNrKGRhdGFzZXQpXG4gIH1cbiAgYWZ0ZXJfd3JpdGUoKXtcbiAgICB0aGlzLnRlcm1fdGV4dC5xdWVyeVNlbGVjdG9yKCcuZW9mJyk/LmNsYXNzTGlzdC5yZW1vdmUoJ2VvZicpXG4gICAgdGhpcy50ZXJtX3RleHQubGFzdEVsZW1lbnRDaGlsZD8uY2xhc3NMaXN0LmFkZCgnZW9mJylcbiAgfVxuICBhcHBseV9zdHlsZXMoY2hhbm5lbF9zdGF0ZTpDaGFubmVsU3RhdGUpe1xuICAgIGNoYW5uZWxfc3RhdGUuc3RhcnRfcGFyc2VyX3N0YXRlPWNoYW5uZWxfc3RhdGUuZW5kX3BhcnNlcl9zdGF0ZVxuICAgIGNoYW5uZWxfc3RhdGUuc3RhcnRfc3R5bGU9Y2hhbm5lbF9zdGF0ZS5lbmRfc3R5bGVcbiAgICBjaGFubmVsX3N0YXRlLmVuZF9wYXJzZXJfc3RhdGU9dW5kZWZpbmVkXG4gICAgY2hhbm5lbF9zdGF0ZS5lbmRfc3R5bGU9Y2xlYXJfc3R5bGVcbiAgICBjaGFubmVsX3N0YXRlLmxhc3RfbGluZT0nJ1xuICAgIC8vL2NoYW5uZWxfc3RhdGUubGFzdF9saW5lX3BsYWluPScnXG5cbiAgfVxuICAvKmRlbF9sYXN0X2h0bWxfbGluZShjaGFubmVsX3N0YXRlOkNoYW5uZWxTdGF0ZSl7XG4gICAgY29uc3Qge2xhc3RfbGluZV9wbGFpbn09Y2hhbm5lbF9zdGF0ZVxuICAgIGNvbnN0IGxpbmVfdG9fZGVsZXRlPXRoaXMudGVybV90ZXh0LnF1ZXJ5U2VsZWN0b3IoYCYgPiA6bGFzdC1jaGlsZGApXG4gICAgaWYgKGxpbmVfdG9fZGVsZXRlPT1udWxsKXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ21pc3NtYXRjaDpsaW5lX3RvX2RlbGV0ZV9udWxsJylcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCB7dGV4dENvbnRlbnR9PWxpbmVfdG9fZGVsZXRlXG4gICAgaWYgKHRleHRDb250ZW50IT09bGFzdF9saW5lX3BsYWluKXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ21pc3NtYXRjaDp0ZXh0X2NvbnRlbnQnKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGxpbmVfdG9fZGVsZXRlLnJlbW92ZSgpXG4gIH0qL1xuICB0ZXJtX3dyaXRlKG91dHB1dDpzdHJpbmdbXSxjaGFubmVsX25hbWU6Q2hhbm5lbCl7XG4gICAgaWYgKG91dHB1dC5sZW5ndGg9PT0wKVxuICAgICAgcmV0dXJuXG4gICAgY29uc3QgY2hhbm5lbD10aGlzLmNoYW5uZWxfc3RhdGVzW2NoYW5uZWxfbmFtZV1cbiAgICBcbiAgICBpZiAodGhpcy5sYXN0X2NoYW5uZWwhPT1jaGFubmVsICYmIHRoaXMubGFzdF9jaGFubmVsLmxhc3RfbGluZSE9PScnKXsgXG4gICAgICAvL2ZvcmNpbmcgbGluZSBicmVhayB3aGVuIHN3aXRjaGluZyBjaGFubmVsc1xuICAgICAgdGhpcy5hcHBseV9zdHlsZXModGhpcy5sYXN0X2NoYW5uZWwpXG4gICAgfVxuICAgIHRoaXMubGFzdF9jaGFubmVsPWNoYW5uZWxcblxuICAgIGNvbnN0IGpvaW5lZF9saW5lcz1bY2hhbm5lbC5sYXN0X2xpbmUsLi4ub3V0cHV0XS5qb2luKCcnKS5yZXBsYWNlQWxsKCdcXHJcXG4nLCdcXG4nKVxuICAgIGNvbnN0IGxpbmVzPWpvaW5lZF9saW5lcy5zcGxpdCgnXFxuJylcbiAgICBpZiAoY2hhbm5lbC5sYXN0X2xpbmUhPT0nJylcbiAgICAgIHRoaXMudGVybV90ZXh0LnF1ZXJ5U2VsZWN0b3IoYCYgPiA6bGFzdC1jaGlsZGApPy5yZW1vdmUoKSAvL2xhdCBsaW5lIGRpZCBub3QgZW5kIGluIFxcbiBzbyB3ZSBhcmUgZ29pbmcgdG8gZGVsdGUgdGhlIGh0bWwgZm9yIGl0IGFuZCBjcnJlYXRlIGluIGFnYWluIHdpdGggbmV3IHRleHRcbi8vICAgIGNvbnN0IGxpbmVzX3RvX3JlbmRlciA9IHRoaXMubGFzdF9saW5lID09PSAnJyA/IGxpbmVzLnNsaWNlKDAsLTEpIDogbGluZXMgXG4gICAgY29uc3QgYWN1bV9odG1sPVtdXG4gICAgZm9yIChsZXQgaT0wO2k8bGluZXMubGVuZ3RoO2krKyl7XG4gICAgICBjb25zdCBsaW5lPWxpbmVzW2ldIVxuICAgICAgY29uc3Qge1xuICAgICAgICBwbGFpbl90ZXh0LFxuICAgICAgICBzdHlsZV9wb3NpdGlvbnMsXG4gICAgICAgIGxpbmtfaW5zZXJ0c1xuICAgICAgfT1zdHJpcF9hbnNpKGxpbmUsIGNoYW5uZWwuc3RhcnRfc3R5bGUpXG4gICAgICBjb25zdCBpc19sYXN0PShpPT09bGluZXMubGVuZ3RoLTEpXG4gICAgICBpZiAoaXNfbGFzdCYmbGluZT09PScnKXsgXG4gICAgICAgIC8vb3V0cHV0IHdhcyBmaW5pc2hlZCB3aXRoIFxcbiwgbm8gbmVlZCB0byBwcm9jY2VzcyBpdCwganVzdCBhcHBseSB0aGUgc3R5bGUgYW5kIGFkZCBuZXcgbGluZSB0byBzdHJpbmdzXG4gICAgICAgICAgdGhpcy5hcHBseV9zdHlsZXMoY2hhbm5lbClcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY29uc3Qge3JhbmdlcyxwYXJzZXJfc3RhdGV9PXRoaXMubGlzdGVuZXIucGFyc2UocGxhaW5fdGV4dCxjaGFubmVsLnN0YXJ0X3BhcnNlcl9zdGF0ZSlcbiAgICAgIGNoYW5uZWwuZW5kX3N0eWxlPXN0eWxlX3Bvc2l0aW9ucy5hdCgtMSkhLnN0eWxlIC8vc3RyaXBfYW5zaSBpcyBndXJhbnRpZWQgdG8gaGF2ZSBhdCBsZWFzdCBvbmUgaW4gc3R5bGUgcG9zaXRvbnMuIGkgdHJpZWQgdG8gZW5jb2RlIGl0IGluIHRzIGJ1dCB3YXMgdG9vIHZlcmJvc2UgdG8gbXkgbGlraW5nXG4gICAgICBjaGFubmVsLmVuZF9wYXJzZXJfc3RhdGU9cGFyc2VyX3N0YXRlXG4gICAgICBjaGFubmVsLmxhc3RfbGluZT1saW5lXG4gICAgICBjb25zdCByYW5nZV9pbnNlcnRzPXJhbmdlc190b19pbnNlcnRzKHJhbmdlcylcbiAgICAgIGNvbnN0IGluc2VydHM9bWVyZ2VfaW5zZXJ0cyhyYW5nZV9pbnNlcnRzLGxpbmtfaW5zZXJ0cylcbiAgICAgIGNvbnN0IGh0bWw9Z2VuZXJhdGVfaHRtbCh7c3R5bGVfcG9zaXRpb25zLGluc2VydHMscGxhaW5fdGV4dH0pXG4gICAgICBjb25zdCBicj0ocGxhaW5fdGV4dD09PScnPyc8YnI+JzonJylcbiAgICAgIGFjdW1faHRtbC5wdXNoKCBgPGRpdiBjbGFzcz1cIiR7Y2hhbm5lbC5jbGFzc19uYW1lfVwiPiR7aHRtbH0ke2JyfTwvZGl2PmApXG4gICAgICBpZiAoIWlzX2xhc3QpXG4gICAgICAgIHRoaXMuYXBwbHlfc3R5bGVzKGNoYW5uZWwpXG4gICAgfVxuXG4gICAgY29uc3QgbmV3X2h0bWw9YWN1bV9odG1sLmpvaW4oJycpXG4gICAgdGhpcy50ZXJtX3RleHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLG5ld19odG1sKVxuICB9XG4gIHNob3dfZmluZCgpe1xuICAgIHRoaXMuc2VhcmNoLnNob3coKVxuICB9XG4gXG4gIHRlcm1fY2xlYXIoKXtcbiAgICB0aGlzLnRlcm1fdGV4dC5pbm5lckhUTUw9JydcbiAgICB0aGlzLmNoYW5uZWxfc3RhdGVzPW1ha2VfY2hhbm5lbF9zdGF0ZXMoKVxuICAgIHRoaXMuc2VhcmNoLnNlYXJjaF90ZXJtX2NsZWFyKClcbiAgICAgIC8qc3Rkb3V0OntsYXN0X2xpbmU6JycsYW5jb3JlOnVuZGVmaW5lZCxzdHlsZTpjbGVhcl9zdHlsZX0sXG4gICAgICBzdGRlcnI6e2xhc3RfbGluZTonJyxhbmNvcmU6dW5kZWZpbmVkLHN0eWxlOmNsZWFyX3N0eWxlfVxuICAgIH0gICAqLyBcbiAgfVxuXG59IiwgImltcG9ydCB7cGFyc2VfZ3JvdXBfc3RyaW5nfSBmcm9tICcuL3Rlcm1pbmFsc19hbnNpLmpzJ1xuaW1wb3J0IHR5cGUge1BhcnNlUmFuZ2V9IGZyb20gJy4vdGVybWluYWwuanMnXG5pbXBvcnQge3IsZGlnaXRzLHJlIH0gZnJvbSAnLi9yZWdleF9idWlsZGVyLmpzJ1xuY29uc3Qgcm93PXJgKD88cm93PiR7ZGlnaXRzfSlgXG5jb25zdCBjb2w9cmAoPzxjb2w+JHtkaWdpdHN9KWBcbmNvbnN0IG9wdGlvbmFsX3Jvd2NvbD1yYChcbiAgICAoPzoke3Jvd30sJHtjb2x9KXxcbiAgICAoPzo6JHtyb3d9OiR7Y29sfSlcbiAgKT9gXG5jb25zdCBsaW5rc19yZWdleD1yZSgnZycpYFxuICAoPzxzb3VyY2VfZmlsZT4gICAgICAgICAgICAjIGNhcHR1cmUgZ3JvdXAgc291cmNlX2ZpbGVcbiAgICAoPzwhWy5hLXpBLVpdKVxuICAgICg/OlthLXpBLVpdOik/ICAgICAgICAgICAgICMgb3B0aW9uYWwgZHJpdmUgY2hhciBmb2xsb3dlZCBieSBjb2xvblxuICAgIFthLXpBLVowLTlfL1xcXFxALi1dKyAgICAgIyBvbmUgb3IgbW9yZSBmaWxlIG5hbWUgY2hhcmVjdGVyc1xuICAgIFsuXVxuICAgIFthLXpBLVowLTldK1xuICAgICg/IVsuXScpICAgICAgICAgICAgICAgICAgICAjZGlzYWxsb3cgZG90IGltbWVkaWF0bHkgYWZ0ZXIgdGhlIG1hdGNoXG4gIClcbiAgJHtvcHRpb25hbF9yb3djb2x9YFxuXG5cbmNvbnN0IGFuY29yX3JlZ2V4PXJlKCcnKSBgXG4gIF5cbiAgKD88c291cmNlX2ZpbGU+XG4gICAgKFthLXpBLVpdOik/XG4gICAgW2EtekEtWjAtOV9cXC0uL1xcXFxAXStcbiAgKVxuICAke29wdGlvbmFsX3Jvd2NvbH1cbiAgXFxzKiRgXG5cbmNvbnN0IHJlZl9yZWdleCA9IHJlKCcnKWBcbiAgXlxccypcbiAgJHtyb3d9XG4gIDpcbiAgJHtjb2x9XG4gICguKilcbmBcbi8vY29uc3Qgb2xkX3JlZl9yZWdleCA9IC9eXFxzKig/PHJvdz5cXGQrKTooPzxjb2w+XFxkKykoLiopL1xuLy9jb25zb2xlLmxvZyh7cmVmX3JlZ2V4LG9sZF9yZWZfcmVnZXh9KVxuZnVuY3Rpb24gbm9fbnVsbHMob2JqOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkPil7XG4gIGNvbnN0IGFuczpSZWNvcmQ8c3RyaW5nLHN0cmluZz49e31cbiAgZm9yIChjb25zdCBbayx2XSBvZiBPYmplY3QuZW50cmllcyhvYmopKVxuICAgIGlmICh2IT1udWxsKVxuICAgICAgYW5zW2tdPXZcbiAgcmV0dXJuIGFuc1xufVxuXG5cbmZ1bmN0aW9uIGNhbGNfbWF0Y2gobWF0Y2g6UmVnRXhwTWF0Y2hBcnJheSk6UGFyc2VSYW5nZXtcbiAgY29uc3QgeyBpbmRleH0gPSBtYXRjaDtcbiAgY29uc3QgdGV4dCA9IG1hdGNoWzBdO1xuICBjb25zdCBzdGFydD0gaW5kZXghXG4gIGNvbnN0IGVuZD0gaW5kZXghICsgdGV4dC5sZW5ndGhcbiAgY29uc3Qgcm93PSBwYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ3JvdycpXG4gIGNvbnN0IGNvbD0gcGFyc2VfZ3JvdXBfc3RyaW5nKG1hdGNoLCdjb2wnKVxuICBjb25zdCBzb3VyY2VfZmlsZT1wYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ3NvdXJjZV9maWxlJylcbiAgcmV0dXJuIHtzdGFydCxlbmQsZGF0YXNldDpub19udWxscyh7cm93LGNvbCxzb3VyY2VfZmlsZX0pfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlX3RvX3JhbmdlcyhpbnB1dDpzdHJpbmcscGFyc2VyX3N0YXRlOnN0cmluZ3x1bmRlZmluZWQpe1xuICBjb25zdCByYW5nZXM6UGFyc2VSYW5nZVtdPVtdXG4gIGNvbnN0IGFuY29yX21hdGNoPWlucHV0Lm1hdGNoKGFuY29yX3JlZ2V4KVxuICBpZiAoYW5jb3JfbWF0Y2ghPW51bGwpe1xuICAgIGNvbnN0IHJldD1jYWxjX21hdGNoKGFuY29yX21hdGNoKVxuICAgIHJhbmdlcy5wdXNoKHJldClcbiAgICByZXR1cm4ge3BhcnNlcl9zdGF0ZTpyZXQuZGF0YXNldC5zb3VyY2VfZmlsZSxyYW5nZXN9XG4gIH1cbiAgaWYgKHBhcnNlcl9zdGF0ZSE9bnVsbCl7XG4gICAgY29uc3QgcmVmX21hdGNoID0gaW5wdXQubWF0Y2gocmVmX3JlZ2V4KVxuICAgIGlmIChyZWZfbWF0Y2ghPT1udWxsKXtcbiAgICAgIGNvbnN0IHJhbmdlPWNhbGNfbWF0Y2gocmVmX21hdGNoKVxuICAgICAgY29uc3Qge2RhdGFzZXR9PXJhbmdlXG4gICAgICByYW5nZXMucHVzaCh7XG4gICAgICAgIC4uLmNhbGNfbWF0Y2gocmVmX21hdGNoKSwgLy9ieSB0aGVvcmFtIHdpbGwgc291cmNlX2ZpbGUgd2lsbCBiZSBlbXB0eSBzdHJpbmcgYXQgdGhpcyBsaW5lLCBvdmVycmlkZW4gYnkgdGhlIG5leHRcbiAgICAgICAgZGF0YXNldDp7Li4uZGF0YXNldCxzb3VyY2VfZmlsZTpwYXJzZXJfc3RhdGV9XG4gICAgICB9KVxuICAgICAgcmV0dXJuIHtwYXJzZXJfc3RhdGUscmFuZ2VzfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWF0Y2ggb2YgaW5wdXQubWF0Y2hBbGwobGlua3NfcmVnZXgpKXtcbiAgICAgIHBhcnNlcl9zdGF0ZT11bmRlZmluZWQgLy9pZiBmb3VuZCBsaW5rIHRoYW4gY2FuY2VsIHRoZSBhbmNvcmUgb3RoZXJ3aXplIGxldCBpdCBiZVxuICAgICAgcmFuZ2VzLnB1c2goY2FsY19tYXRjaChtYXRjaCkpXG4gIH1cbiAgcmV0dXJuIHtyYW5nZXMscGFyc2VyX3N0YXRlfVxufVxuXG5mdW5jdGlvbiBpc19zdHJpbmdfb3JfdW5kZWZpbmVkKHg6dW5rbm93bik6IHggaXMgc3RyaW5nfHVuZGVmaW5lZHtcbiAgcmV0dXJuICB0eXBlb2YgeCA9PT0gJ3N0cmluZycgfHwgeCA9PT0gdW5kZWZpbmVkO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlX2xpbmUobGluZTpzdHJpbmcscGFyc2VyX3N0YXRlOnVua25vd24pe1xuICBpZiAoIWlzX3N0cmluZ19vcl91bmRlZmluZWQocGFyc2VyX3N0YXRlKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJleHBlY3Rpbmcgc3RyaW5nIG9yIHVuZGVmaW5lZFwiKVxuICByZXR1cm4gcGFyc2VfdG9fcmFuZ2VzKGxpbmUscGFyc2VyX3N0YXRlKVxufSIsICJcbmltcG9ydCAge3R5cGUgczJ0LGRlZmF1bHRfZ2V0LCBnZXRfZXJyb3J9IGZyb20gJ0B5aWdhbC9iYXNlX3R5cGVzJ1xuaW1wb3J0IHsgVGVybWluYWwsdHlwZSBUZXJtaW5hbExpc3RlbmVyIH0gZnJvbSAnLi90ZXJtaW5hbC5qcyc7XG5pbXBvcnQge3F1ZXJ5X3NlbGVjdG9yLGNyZWF0ZV9lbGVtZW50LGdldF9wYXJlbnRfYnlfY2xhc3MsdXBkYXRlX2NoaWxkX2h0bWwsdHlwZSBDb21wb25lbnR9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuaW1wb3J0IHR5cGUgeyBGb2xkZXIsUnVubmVyLFJ1bm5lclJlcG9ydCxSZWFzb24sRmlsZW5hbWV9IGZyb20gJy4uLy4uL3NyYy9kYXRhLmpzJztcbmltcG9ydCAge3Bvc3RfbWVzc2FnZSxjYWxjX2xhc3RfcnVufSBmcm9tICcuL2NvbW1vbi5qcydcbmltcG9ydCB7cGFyc2VfbGluZX0gZnJvbSAnLi90ZXJtaW5hbHNfcGFyc2UuanMnXG5cblxuZnVuY3Rpb24gZm9ybWF0RWxhcHNlZFRpbWUobXM6IG51bWJlcix0aXRsZTpzdHJpbmcsc2hvd19tczpib29sZWFuKTogc3RyaW5nIHtcbiAgY29uc3QgdG90YWxTZWNvbmRzID0gTWF0aC5mbG9vcihtcyAvIDEwMDApO1xuICBjb25zdCBtaWxsaXNlY29uZHMgPSBtcyAlIDEwMDA7XG4gIGNvbnN0IHNlY29uZHMgPSB0b3RhbFNlY29uZHMgJSA2MDtcbiAgY29uc3QgdG90YWxNaW51dGVzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgLyA2MCk7XG4gIGNvbnN0IG1pbnV0ZXMgPSB0b3RhbE1pbnV0ZXMgJSA2MDtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsTWludXRlcyAvIDYwKTtcbiAgY29uc3QgcGFkMiA9IChuOiBudW1iZXIpID0+IG4udG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpO1xuICBjb25zdCBwYWQzID0gKG46IG51bWJlcikgPT4gbi50b1N0cmluZygpLnBhZFN0YXJ0KDMsICcwJyk7XG4gIGNvbnN0IHRpbWUgPVxuICAgIGhvdXJzID4gMFxuICAgICAgPyBgJHtwYWQyKGhvdXJzKX06JHtwYWQyKG1pbnV0ZXMpfToke3BhZDIoc2Vjb25kcyl9YFxuICAgICAgOiBgJHtwYWQyKG1pbnV0ZXMpfToke3BhZDIoc2Vjb25kcyl9YDtcbiAgY29uc3QgbXNfZGlzcGxheT1zaG93X21zP2A8c3BhbiBjbGFzcz1tcz4uJHtwYWQzKG1pbGxpc2Vjb25kcyl9PC9zcGFuPmA6JydcbiAgcmV0dXJuIGA8ZGl2IHRpdGxlPVwiJHt0aXRsZX1cIj4ke3RpbWV9JHttc19kaXNwbGF5fTwvZGl2PmA7XG59XG5mdW5jdGlvbiByZWxfY2xpY2soZXZlbnQ6TW91c2VFdmVudCx0YXJnZXQ6SFRNTEVsZW1lbnQsZWZmZWN0aXZlX3dhdGNoOkZpbGVuYW1lW10pe1xuICBjb25zdCBwYXJlbnQ9Z2V0X3BhcmVudF9ieV9jbGFzcyh0YXJnZXQsJ3JlbCcpXG4gIGlmIChwYXJlbnQ9PW51bGwpXG4gICAgcmV0dXJuIGZhbHNlXG4gIFxuICBpZiAoIWV2ZW50LmN0cmxLZXkpe1xuICAgIGNvbnN0IHt0aXRsZX09cGFyZW50XG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9vcGVuX2ZpbGVfcm93Y29sXCIsXG4gICAgICB3b3Jrc3BhY2VfZm9sZGVyOicnLFxuICAgICAgc291cmNlX2ZpbGU6dGl0bGUsXG4gICAgICByb3c6MCxcbiAgICAgIGNvbDowXG4gICAgfSlcbiAgICByZXR1cm4gdHJ1ZSAgICAgXG4gIH1cbiAgXG4gIGNvbnN0IHJlbD1lZmZlY3RpdmVfd2F0Y2guZmluZCh4PT54LnJlbC5zdHI9PT1wYXJlbnQudGV4dENvbnRlbnQpXG4gIGlmIChyZWwhPW51bGwpe1xuICAgIC8vcmVsXG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9vcGVuX2ZpbGVfcG9zXCIsXG4gICAgICBwb3M6cmVsLnJlbFxuICAgIH0pXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn0gIFxuXG5mdW5jdGlvbiBtYWtlX29uY2xpY2soZWZmZWN0aXZlX3dhdGNoOkZpbGVuYW1lW10pe1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQ6TW91c2VFdmVudCl7XG4gICAgY29uc3Qge3RhcmdldH09ZXZlbnRcbiAgICBpZiAoISh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICByZXR1cm4gICAgXG4gICAgcmVsX2NsaWNrKGV2ZW50LHRhcmdldCxlZmZlY3RpdmVfd2F0Y2gpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3Rlcm1pbmFsX2VsZW1lbnQocnVubmVyOlJ1bm5lcik6IEhUTUxFbGVtZW50IHtcbiAgY29uc3QgdGVybXNfY29udGFpbmVyPXF1ZXJ5X3NlbGVjdG9yPEhUTUxFbGVtZW50Pihkb2N1bWVudC5ib2R5LCcudGVybXNfY29udGFpbmVyJylcbiAgY29uc3Qge2lkfT1ydW5uZXJcbiAgY29uc3QgcmV0PXRlcm1zX2NvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihgIyR7aWR9YClcbiAgaWYgKHJldCE9bnVsbClcbiAgICByZXR1cm4gcmV0IC8vdG9kbyBjaGVjayB0aGF0IGl0IGlzIEhUTUxFbGVtZW50XG4gIGNvbnN0IGFucz1jcmVhdGVfZWxlbWVudCggIGBcbjxkaXYgY2xhc3M9XCJ0ZXJtX3BhbmVsXCIgaWQ9XCIke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj5cbiAgPGRpdiBjbGFzcz1cInRlcm1fdGl0bGVfYmFyXCI+XG4gICAgPGRpdiBjbGFzcz1cImljb24gdGV4dFwiPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9Y29tbWFuZHNfaWNvbnM+PC9kaXY+XG4gICAgPGRpdiBjbGFzcz10ZXJtX3RpdGxlX2R1cmF0aW9uPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9ZGJnPjwvZGl2PlxuICAgIDx0YWJsZSBjbGFzcz13YXRjaGluZz48L3RhYmxlPlxuICBcbiAgPC9kaXY+XG48L2Rpdj5cbiAgYCx0ZXJtc19jb250YWluZXIpXG4gIGFucy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsbWFrZV9vbmNsaWNrKHJ1bm5lci5lZmZlY3RpdmVfd2F0Y2gpKVxuICByZXR1cm4gYW5zO1xufVxuZnVuY3Rpb24gY2FsY19lbGFwc2VkX2h0bWwocmVwb3J0OlJ1bm5lclJlcG9ydCxydW5uZXI6UnVubmVyKXtcbiAgY29uc3QgbGFzdF9ydW49Y2FsY19sYXN0X3J1bihyZXBvcnQscnVubmVyKVxuICBpZiAobGFzdF9ydW49PW51bGwpXG4gICAgcmV0dXJuICcnXG4gIGNvbnN0IHtzdGFydF90aW1lLGVuZF90aW1lfT1sYXN0X3J1blxuICBjb25zdCBub3c9RGF0ZS5ub3coKVxuICBjb25zdCBlZmZlY3RpdmVfZW5kX3RpbWU9ZnVuY3Rpb24oKXtcbiAgICBpZiAoZW5kX3RpbWU9PW51bGwpXG4gICAgICByZXR1cm4gbm93XG4gICAgcmV0dXJuIGVuZF90aW1lXG4gIH0oKVxuICBjb25zdCB0aW1lX3NpbmNlX2VuZD1mdW5jdGlvbigpe1xuICAgIGlmIChlbmRfdGltZT09bnVsbClcbiAgICAgIHJldHVybiAnJ1xuICAgIHJldHVybiBmb3JtYXRFbGFwc2VkVGltZShub3ctZW5kX3RpbWUsXCJ0aW1lIHNpbmNlIGRvbmVcIixmYWxzZSkgLy9ub3Qgc3VyZSBpZiBwZW9wbGUgd291bGUgbGlrZSB0aGlzXG4gIH0oKVxuICBjb25zdCBuZXdfdGltZT1mb3JtYXRFbGFwc2VkVGltZShlZmZlY3RpdmVfZW5kX3RpbWUtc3RhcnRfdGltZSwncnVuIHRpbWUnLHRydWUpK3RpbWVfc2luY2VfZW5kXG4gIHJldHVybiBuZXdfdGltZVxufVxuY29uc3QgaWdub3JlX3JlYXNvbnM6UmVhc29uW109Wydpbml0aWFsJywndXNlciddXG5mdW5jdGlvbiBjYWxjX3JlYXNvbl90cihyZXBvcnQ6UnVubmVyUmVwb3J0LHJ1bm5lcjpSdW5uZXIpe1xuICBjb25zdCBsYXN0X3J1bj1jYWxjX2xhc3RfcnVuKHJlcG9ydCxydW5uZXIpXG4gIGlmIChsYXN0X3J1bj09bnVsbClcbiAgICByZXR1cm4gJydcbiAgY29uc3Qge2Z1bGxfcmVhc29ufT1sYXN0X3J1blxuICBjb25zdCB7cmVhc29uLGZ1bGxfZmlsZW5hbWV9PWZ1bGxfcmVhc29uXG4gIGlmIChpZ25vcmVfcmVhc29ucy5pbmNsdWRlcyhyZWFzb24pKVxuICAgIHJldHVybiAnJ1xuICByZXR1cm4gYDx0cj48dGQ+KCR7cmVhc29ufSk8L3RkPjx0ZD48ZGl2PjxkaXYgY2xhc3M9cmVsIHRpdGxlPSR7ZnVsbF9maWxlbmFtZX0+JHtmdWxsX2ZpbGVuYW1lfTwvZGl2PjwvZGl2PjwvdGQ+PC90cj5gXG59XG5cbmZ1bmN0aW9uIGNhbGNfd2F0Y2hpbmdfdHIocnVubmVyOlJ1bm5lcil7XG4gIGlmIChydW5uZXIuZWZmZWN0aXZlX3dhdGNoLmxlbmd0aD09PTApXG4gICAgcmV0dXJuICcnXG4gIGNvbnN0IHNlcD1gPHNwYW4gY2xhc3M9c2VwPiBcdTIwMjIgPC9zcGFuPmBcbiAgY29uc3QgcmV0PXJ1bm5lci5lZmZlY3RpdmVfd2F0Y2gubWFwKCh7cmVsLGZ1bGx9KT0+YDxkaXYgdGl0bGU9JyR7ZnVsbH0nY2xhc3M9cmVsPiR7cmVsLnN0cn08L2Rpdj5gKS5qb2luKHNlcClcbiAgcmV0dXJuIGA8dHI+PHRkPjxkaXY+PGRpdiBjbGFzcz10b2dnbGVzX2ljb25zPjwvZGl2PldhdGNoaW5nOjwvdGQ+PC9kaXY+PHRkPjxkaXY+JHtyZXR9PC9kaXY+PC90ZD48L3RyPmBcbn1cblxuY2xhc3MgVGVybWluYWxQYW5lbCBpbXBsZW1lbnRzIFRlcm1pbmFsTGlzdGVuZXJ7XG4gIGxhc3RfcnVuX2lkOm51bWJlcnx1bmRlZmluZWRcbiAgZWxcbiAgdGVybVxuICB3b3Jrc3BhY2VfZm9sZGVyXG5cbiAgY29uc3RydWN0b3IoXG4gICAgcnVubmVyOlJ1bm5lciAvL3RoaXMgaXMgbm90IHNhdmVkLCBpdCBkb2VudCBoYXZlIHRoZSBwdWJsaWMvcHJpdmF0ZSx0aGF0IGluIHB1cnB1c2UgYmVjYXN1ZSBydW5uZXIgaGNuYWdlc1xuICApe1xuICAgIHRoaXMud29ya3NwYWNlX2ZvbGRlcj1ydW5uZXIud29ya3NwYWNlX2ZvbGRlclxuICAgIHRoaXMuZWw9Y3JlYXRlX3Rlcm1pbmFsX2VsZW1lbnQocnVubmVyKVxuICAgIHRoaXMudGVybT1uZXcgVGVybWluYWwodGhpcy5lbCx0aGlzLHJ1bm5lci5pZClcbiAgICAvL3RoaXMudGVybV9jbGVhcigpXG4gIH1cbiAgc2V0X3Zpc2liaWxpdHkodmFsOmJvb2xlYW4pe1xuICAgIHRoaXMuZWwuc3R5bGUuZGlzcGxheT0odmFsKT8nZmxleCc6J25vbmUnICAgXG4gIH1cbiAgcGFyc2UobGluZV90ZXh0OnN0cmluZyxwYXJzZV9zdGF0ZTp1bmtub3duKXtcbiAgICByZXR1cm4gcGFyc2VfbGluZShsaW5lX3RleHQscGFyc2Vfc3RhdGUpXG4gIH1cbiAgb3Blbl9saW5rKHVybDogc3RyaW5nKXtcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDpcImNvbW1hbmRfb3Blbl9saW5rXCIsXG4gICAgICB1cmxcbiAgICB9KVxuICB9XG4gIGRhdGFzZXRfY2xpY2soZGF0YXNldDpSZWNvcmQ8c3RyaW5nLHN0cmluZz4pe1xuICAgIGNvbnN0IHNvdXJjZV9maWxlPWRhdGFzZXQuc291cmNlX2ZpbGVcbiAgICBpZiAoc291cmNlX2ZpbGU9PW51bGwpIC8vdG9kbzogY2hlY2sgdGhhdCBub3QgZW1wdHkgc3RyaW5nP1xuICAgICAgcmV0dXJuXG4gICAgY29uc3Qgcm93PXBhcnNlSW50KGRhdGFzZXQucm93Pz8nJywxMCl8fDBcbiAgICBjb25zdCBjb2w9cGFyc2VJbnQoZGF0YXNldC5jb2w/PycnLDEwKXx8MFxuICAgIGNvbnN0IHt3b3Jrc3BhY2VfZm9sZGVyfT10aGlzXG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9vcGVuX2ZpbGVfcm93Y29sXCIsXG4gICAgICB3b3Jrc3BhY2VfZm9sZGVyLFxuICAgICAgc291cmNlX2ZpbGUsXG4gICAgICByb3csXG4gICAgICBjb2xcbiAgICB9KSAgICAgIFxuICB9XG4gIHVwZGF0ZV90ZXJtaW5hbDIocmVwb3J0OlJ1bm5lclJlcG9ydCxydW5uZXI6UnVubmVyKXtcbiAgICAvL2NvbnN0IHRpdGxlX2Jhcj1jYWxjX3RpdGxlX2h0bWwocmVwb3J0LHJ1bm5lcilcbiAgICBjb25zdCB3YXRjaGluZz0gIGAke2NhbGNfd2F0Y2hpbmdfdHIocnVubmVyKX0gIFxuICAke2NhbGNfcmVhc29uX3RyKHJlcG9ydCxydW5uZXIpfWBcbiAgICB1cGRhdGVfY2hpbGRfaHRtbCh0aGlzLmVsLCcudGVybV90aXRsZV9iYXIgLnRlcm1fdGl0bGVfZHVyYXRpb24nLGNhbGNfZWxhcHNlZF9odG1sKHJlcG9ydCxydW5uZXIpKVxuICAgIHVwZGF0ZV9jaGlsZF9odG1sKHRoaXMuZWwsJy50ZXJtX3RpdGxlX2JhciAud2F0Y2hpbmcnLHdhdGNoaW5nKVxuXG4gICAgY29uc3QgbGFzdF9ydW49Y2FsY19sYXN0X3J1bihyZXBvcnQscnVubmVyKVxuICAgIGlmIChsYXN0X3J1bj09bnVsbClcbiAgICAgIHJldHVyblxuICAgIGNvbnN0IHtydW5faWR9PWxhc3RfcnVuXG4gICAgaWYgKHJ1bl9pZCE9PXRoaXMubGFzdF9ydW5faWQpe1xuICAgICAgdGhpcy50ZXJtLnRlcm1fY2xlYXIoKSAgICAgXG4gICAgICAvL3RoaXMucmVzZXRfbGlua19wcm92aWRlcigpIC8vbm8gbmVlZCB0byBkbyBpdCBoZXJlIGJlY2F1c2UgdGVybS5jbGVhciBpcyBub3QgZWZmZWN0aXZlIGltbWlkZWVhdGx5LiBidHRlciBkbyBpdCBvbiBtYXJrZXIgZGlzcG9zZSBcbiAgICB9XG4gICAgdGhpcy5sYXN0X3J1bl9pZD1sYXN0X3J1bi5ydW5faWRcbiAgICBpZiAobGFzdF9ydW4uc3RkZXJyLmxlbmd0aD09PTAgJiYgbGFzdF9ydW4uc3Rkb3V0Lmxlbmd0aD09PTApXG4gICAgICByZXR1cm5cblxuICAgIHRoaXMudGVybS50ZXJtX3dyaXRlKGxhc3RfcnVuLnN0ZGVycixcInN0ZGVyclwiKVxuICAgIHRoaXMudGVybS50ZXJtX3dyaXRlKGxhc3RfcnVuLnN0ZG91dCxcInN0ZG91dFwiKVxuICAgIHRoaXMudGVybS5hZnRlcl93cml0ZSgpXG4gIH1cbiAgdXBkYXRlX3Rlcm1pbmFsKHJlcG9ydDpSdW5uZXJSZXBvcnQscnVubmVyOlJ1bm5lcil7XG4gICAgdHJ5e1xuICAgICAgdGhpcy51cGRhdGVfdGVybWluYWwyKHJlcG9ydCxydW5uZXIpXG4gICAgfWNhdGNoKGV4KXtcbiAgICAgIGNvbnN0IHttZXNzYWdlfT1nZXRfZXJyb3IoZXgpXG4gICAgICB1cGRhdGVfY2hpbGRfaHRtbCh0aGlzLmVsLCcuZGJnJyxtZXNzYWdlKVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGVybWluYWxzIGltcGxlbWVudHMgQ29tcG9uZW50e1xuICB0ZXJtaW5hbHM6czJ0PFRlcm1pbmFsUGFuZWw+PXt9IFxuICB2aXNpYmxlX3BhbmVsOlRlcm1pbmFsUGFuZWx8dW5kZWZpbmVkXG4gIGdldF90ZXJtaW5hbChydW5uZXI6UnVubmVyKXtcbiAgICBjb25zdCBhbnM9ZGVmYXVsdF9nZXQodGhpcy50ZXJtaW5hbHMscnVubmVyLmlkLCgpPT4gbmV3IFRlcm1pbmFsUGFuZWwocnVubmVyKSlcbiAgICByZXR1cm4gYW5zXG4gIH1cbiAgb25faW50ZXJ2YWwoKXtcbiAgICAvL2NvbnNvbGUubG9nKCdvbl9pbnRlcnZhbCcpXG4gIH1cbiAgb25fZGF0YShkYXRhOnVua25vd24pe1xuICAgIGNvbnN0IHJlcG9ydD1kYXRhIGFzIFJ1bm5lclJlcG9ydFxuICAgIGNvbnN0IGY9KGZvbGRlcjpGb2xkZXIpPT57XG4gICAgICBmb3IgKGNvbnN0IHJ1bm5lciBvZiBmb2xkZXIucnVubmVycylcbiAgICAgICAgdGhpcy5nZXRfdGVybWluYWwocnVubmVyKS51cGRhdGVfdGVybWluYWwocmVwb3J0LHJ1bm5lcilcbiAgICAgIGZvbGRlci5mb2xkZXJzLmZvckVhY2goZikgXG4gICAgfVxuICAgIGYocmVwb3J0LnJvb3QpICAgIFxuICB9XG4gIGNvbW1hbmRfZmluZCgpe1xuICAgIHRoaXMudmlzaWJsZV9wYW5lbD8udGVybS5zaG93X2ZpbmQoKVxuICB9XG4gIHNldF9zZWxlY3RlZChpZDpzdHJpbmcpe1xuICAgIGZvciAoY29uc3QgW3BhbmVsX2lkLHBhbmVsXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRlcm1pbmFscykpe1xuICAgICAgY29uc3QgdmlzaWJsZT1wYW5lbF9pZD09PWlkXG4gICAgICBwYW5lbC5zZXRfdmlzaWJpbGl0eSh2aXNpYmxlKVxuICAgICAgaWYgKHZpc2libGUpXG4gICAgICAgIHRoaXMudmlzaWJsZV9wYW5lbD1wYW5lbFxuICAgIH1cbiAgfVxufVxuXG4iLCAiaW1wb3J0IHR5cGUge1RyZWVOb2RlfSBmcm9tICcuL3RyZWVfaW50ZXJuYWxzLmpzJ1xuaW1wb3J0IHtwb3N0X21lc3NhZ2V9IGZyb20gJy4vY29tbW9uLmpzJ1xuaW1wb3J0IHt1cGRhdGVfY2hpbGRfaHRtbCx1cGRhdGVfY2xhc3NfbmFtZSxnZXRfcGFyZW50X2J5X2NsYXNzZXMsZ2V0X3BhcmVudF9pZH0gZnJvbSAnLi9kb21fdXRpbHMuanMnXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VfaWNvbnMoaHRtbDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAvLyBQYXJzZSB0aGUgSFRNTCBzdHJpbmcgaW50byBhIERvY3VtZW50XG4gIGNvbnN0IHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcbiAgY29uc3QgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhodG1sLCAndGV4dC9odG1sJyk7XG4gIC8vIFNlbGVjdCBhbGwgZGl2cyB3aXRoIGNsYXNzIFwiaWNvblwiXG4gIGNvbnN0IGljb25zID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTERpdkVsZW1lbnQ+KCcuaWNvbicpO1xuICBpY29ucy5mb3JFYWNoKGljb24gPT4ge1xuICAgIGNvbnN0IG5hbWVFbCA9IGljb24uY2hpbGROb2Rlc1swXVxuICAgIGNvbnN0IGNvbnRlbnRFbCA9IGljb24ucXVlcnlTZWxlY3RvcjxTVkdFbGVtZW50Pignc3ZnJyk7XG4gICAgaWYgKG5hbWVFbCAmJiBjb250ZW50RWwpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBuYW1lRWwudGV4dENvbnRlbnQ/LnRyaW0oKTtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBjb250ZW50RWwub3V0ZXJIVE1MXG4gICAgICBpZiAobmFtZSE9bnVsbCkge1xuICAgICAgICByZXN1bHRbbmFtZV0gPSBjb250ZW50XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgY29uc3QgaWNvbm5hbWVzPU9iamVjdC5rZXlzKHJlc3VsdClcbiAgY29uc29sZS5sb2coe2ljb25uYW1lc30pXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmludGVyZmFjZSBJY29uVmVyc2lvbntcbiAgaWNvbjpzdHJpbmcsXG4gIHZlcnNpb246bnVtYmVyXG59XG5mdW5jdGlvbiBkZWNlbGVyYXRpbmdNYXAoeDpudW1iZXIpIHsgLy9haSBnZW5yYXRlZCBsb2xcbiAgLy8gMS4gQ29uc3RyYWluIGlucHV0IGFuZCBub3JtYWxpemUgdG8gMC4wIC0gMS4wIHJhbmdlXG4gIGNvbnN0IHQgPSBNYXRoLm1pbihNYXRoLm1heCh4IC8gMiwgMCksIDEpO1xuXG4gIC8vIDIuIEFwcGx5IFF1YWRyYXRpYyBFYXNlLU91dCBmb3JtdWxhXG4gIC8vIFRoaXMgc3RhcnRzIGZhc3QgYW5kIHNsb3dzIGRvd24gYXMgaXQgYXBwcm9hY2hlcyAxXG4gIGNvbnN0IGVhc2VPdXQgPSAxIC0gKDEgLSB0KSAqICgxIC0gdCk7XG5cbiAgLy8gMy4gTWFwIHRvIG91dHB1dCByYW5nZSAoMTAgdG8gMClcbiAgLy8gV2hlbiBlYXNlT3V0IGlzIDAsIHJlc3VsdCBpcyAxMC4gV2hlbiBlYXNlT3V0IGlzIDEsIHJlc3VsdCBpcyAwLlxuICByZXR1cm4gMTAgLSAoZWFzZU91dCAqIDEwKTtcbn1cbmZ1bmN0aW9uIGNhbGNfYm94X3NoYWRvdyhpY29uOnN0cmluZyx0aW1lT2Zmc2V0Om51bWJlcil7XG4gIGZ1bmN0aW9uIGYoY29sb3I6c3RyaW5nKXtcbiAgICBjb25zdCBweD1kZWNlbGVyYXRpbmdNYXAodGltZU9mZnNldClcbiAgICByZXR1cm4gYDBweCAwcHggJHtweH1weCAke3B4fXB4ICR7Y29sb3J9YFxuICB9XG4gIGlmIChpY29uPT09J2RvbmUnKVxuICAgIHJldHVybiBmKCdyZ2JhKDAsIDI1NSwgMCwuNSknKVxuICBpZiAoaWNvbj09PSdlcnJvcicpXG4gICAgcmV0dXJuIGYoJ3JnYmEoMjU1LCAwLCAwLCAuNSknKVxuICBpZiAoaWNvbj09PSdydW5uaW5nJylcbiAgICByZXR1cm4gZigncmdiYSgyNTUsIDE0MCwgMCwgMC41KScpXG4gIGlmIChpY29uPT09J3N0b3BwZWQnKVxuICAgIHJldHVybiBmKCdyZ2JhKDEyOCwgMCwgMTI4LCAwLjUpJylcbiAgcmV0dXJuICcnXG59XG5cblxuZXhwb3J0IGNsYXNzIEljb25zQW5pbWF0b3J7XG4gIC8vaWNvbnNcbiAgcHJpdmF0ZSBpZF9jaGFuZ2VkOlJlY29yZDxzdHJpbmcsbnVtYmVyPj17fVxuICBwcml2YXRlIGljb25fdmVyc2lvbnM6UmVjb3JkPHN0cmluZyxJY29uVmVyc2lvbj49e31cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIGljb25zOlJlY29yZDxzdHJpbmcsc3RyaW5nPixcbiAgICBwdWJsaWMgY29tbWFuZHM6c3RyaW5nW10gICAgXG4gICl7XG4gICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsdGhpcy5vbl9jbGljaylcbiAgfVxuICBnZXRfY29tbWFuZChpY29uOkhUTUxFbGVtZW50KXtcbiAgICBmb3IgKGNvbnN0IGNsYXNzTmFtZSBvZiBpY29uLmNsYXNzTGlzdClcbiAgICAgIGlmICh0aGlzLmNvbW1hbmRzLmluY2x1ZGVzKGNsYXNzTmFtZSkpXG4gICAgICAgIHJldHVybiBjbGFzc05hbWVcbiAgfVxuICBvbl9jbGljaz0oZXZ0Ok1vdXNlRXZlbnQpPT57XG4gICAgaWYgKGV2dC50YXJnZXQ9PW51bGwpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICBjb25zdCBjb21tYW5kX2ljb249Z2V0X3BhcmVudF9ieV9jbGFzc2VzKGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQsWydjb21tYW5kX2ljb24nLCd0b2dnbGVfaWNvbiddKVxuICAgIGlmIChjb21tYW5kX2ljb249PW51bGwpXG4gICAgICByZXR1cm5cbiAgICBjb25zdCBjb21tYW5kX25hbWU9dGhpcy5nZXRfY29tbWFuZChjb21tYW5kX2ljb24pXG4gICAgaWYgKGNvbW1hbmRfbmFtZT09bnVsbClcbiAgICAgIHJldHVyblxuICAgIFxuICAgIGNvbnN0IGlkPWdldF9wYXJlbnRfaWQoY29tbWFuZF9pY29uKSAvL0FyZ3VtZW50IG9mIHR5cGUgJ0hUTUxFbGVtZW50IHwgbnVsbCcgaXMgbm90IGFzc2lnbmFibGUgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ0hUTUxFbGVtZW50Jy4gd2h5XG4gICAgaWYgKGlkPT1udWxsKVxuICAgICAgcmV0dXJuXG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9jbGlja2VkXCIsXG4gICAgICBpZCxcbiAgICAgIGNvbW1hbmRfbmFtZVxuICAgIH0pICAgIFxuICAgIGV2dC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblxuICB9XG4gIHByaXZhdGUgc2V0X2ljb25fdmVyc2lvbihpZDpzdHJpbmcsaWNvbjpzdHJpbmcsdmVyc2lvbjpudW1iZXIpeyAvL2NhbGwgbXV0dXBsZSB0aW1lLCBvbmUgZm9yIGVhY2ggaWRcbiAgICBjb25zdCBleGlzdHM9dGhpcy5pY29uX3ZlcnNpb25zW2lkXVxuICAgIGlmIChleGlzdHMhPW51bGwgJiYgZXhpc3RzLmljb249PT1pY29uJiZleGlzdHMudmVyc2lvbj09PXZlcnNpb24pXG4gICAgICByZXR1cm5cbiAgICB0aGlzLmlkX2NoYW5nZWRbaWRdPURhdGUubm93KClcbiAgICB0aGlzLmljb25fdmVyc2lvbnNbaWRdPXtpY29uLHZlcnNpb259XG4gIH1cbiAgcHJpdmF0ZSBjYWxjX2ljb24oazpzdHJpbmcsdjpib29sZWFufHVuZGVmaW5lZCl7XG4gICAgaWYgKHY9PT11bmRlZmluZWQpXG4gICAgICByZXR1cm4gJydcbiAgICByZXR1cm4gdGhpcy5pY29uc1tgJHtrfV8ke3Z9YF1cbiAgfVxuICBwcml2YXRlIHVwZGF0ZV9pY29ucyh0cmVlX25vZGU6VHJlZU5vZGUpe1xuICAgIGNvbnN0IGY9KG5vZGU6VHJlZU5vZGUpPT57IFxuICAgICAgY29uc3Qge2lkLGljb24saWNvbl92ZXJzaW9ufT1ub2RlXG4gICAgICB0aGlzLnNldF9pY29uX3ZlcnNpb24oaWQsaWNvbixpY29uX3ZlcnNpb24pIC8vZm9yIHRoZSBzaWRlIGVmZmVjdCBvZiB1cGRhdGluZyBpZF9jaGFuZWRcbiAgICAgIGNvbnN0IHRvZ2dsZXM9T2JqZWN0LmVudHJpZXMobm9kZS50b2dnbGVzKS5tYXAoKFtrLHZdKT0+YDxkaXYgY2xhc3M9J3RvZ2dsZV9pY29uICR7dn0gJHtrfSc+JHt0aGlzLmNhbGNfaWNvbihrLHYpfTwvZGl2PmApLmpvaW4oJycpIFxuICAgICAgY29uc3QgY29tbWFuZHNfaWNvbnM9bm9kZS5jb21tYW5kcy5tYXAoeD0+YDxkaXYgY2xhc3M9XCJjb21tYW5kX2ljb24gJHt4fVwiIHRpdGxlPVwiJHt4fVwiPiR7dGhpcy5pY29uc1t4XX08L2Rpdj5gKS5qb2luKCcnKVxuICAgICAgY29uc3QgdG9wPWAjJHtpZH0gPiA6bm90KC5jaGlsZHJlbilgXG4gICAgICB1cGRhdGVfY2hpbGRfaHRtbChkb2N1bWVudC5ib2R5LGAke3RvcH0gLmljb246bm90KC50ZXh0KWAsdGhpcy5pY29uc1tpY29uXT8/JycpIC8vc2V0IHRoZSBzdmdcbiAgICAgIHVwZGF0ZV9jaGlsZF9odG1sKGRvY3VtZW50LmJvZHksYCR7dG9wfSAuaWNvbi50ZXh0YCxgICR7dGhpcy5pY29uc1tpY29uXT8/Jyd9Jm5ic3A7Jm5ic3A7Jm5ic3A7JHtpY29ufWApIC8vLy9zZXQgdGhlIHN2ZyArdGV4dFxuICAgICAgdXBkYXRlX2NoaWxkX2h0bWwoZG9jdW1lbnQuYm9keSxgJHt0b3B9IC50b2dnbGVzX2ljb25zYCx0b2dnbGVzKVxuICAgICAgdXBkYXRlX2NoaWxkX2h0bWwoZG9jdW1lbnQuYm9keSxgJHt0b3B9IC5jb21tYW5kc19pY29uc2AsY29tbWFuZHNfaWNvbnMpXG4gICAgICB1cGRhdGVfY2xhc3NfbmFtZShkb2N1bWVudC5ib2R5LGAke3RvcH0gLmljb24udGV4dGAsYGljb24gdGV4dCAke2ljb259YCkgXG4gICAgICB1cGRhdGVfY2xhc3NfbmFtZShkb2N1bWVudC5ib2R5LGAke3RvcH0gLmljb246bm90KC50ZXh0KWAsYGljb24gJHtpY29ufWApIFxuICAgICAgXG4gICAgICBub2RlLmNoaWxkcmVuLm1hcChmKVxuICAgIH1cbiAgICBmKHRyZWVfbm9kZSlcbiAgfVxuICBhbmltYXRlKHRyZWVfbm9kZTpUcmVlTm9kZSl7XG4gICAgLy9kbyBhIHF1ZXJ5U2VsZWN0b3JBbGwgZm9yICN7aWR9IHN2Z1xuICAgIHRoaXMudXBkYXRlX2ljb25zKHRyZWVfbm9kZSlcbiAgICBjb25zdCBub3c9RGF0ZS5ub3coKVxuICAgIGZvciAoY29uc3QgW2lkLHRpbWVdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuaWRfY2hhbmdlZCkpeyAvL2FuaW1hdGVcbiAgICAgIGNvbnN0IHNlbGVjdG9yPWAjJHtpZH0gLmljb25gICAgXG4gICAgICBjb25zdCBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8U1ZHRWxlbWVudD4oc2VsZWN0b3IpO1xuICAgICAgZm9yICggY29uc3QgZWwgb2YgZWxlbWVudHMpeyBcbiAgICAgICAgY29uc3QgdGltZU9mZnNldD0obm93LXRpbWUpLzEwMDBcbiAgICAgICAgaWYgKHRpbWVPZmZzZXQ+NClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICBjb25zdCB7aWNvbn09dGhpcy5pY29uX3ZlcnNpb25zW2lkXSFcblxuICAgICAgICBlbC5zdHlsZS5ib3hTaGFkb3c9Y2FsY19ib3hfc2hhZG93KGljb24sdGltZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCAiXG5pbXBvcnQgdHlwZSB7V2Vidmlld01lc3NhZ2V9IGZyb20gJy4uLy4uL3NyYy9leHRlbnNpb24uanMnXG5pbXBvcnQge3F1ZXJ5X3NlbGVjdG9yLGN0cmx9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuaW1wb3J0IHtUcmVlQ29udHJvbCx0eXBlIFRyZWVEYXRhUHJvdmlkZXIsdHlwZSBUcmVlTm9kZX0gZnJvbSAnLi90cmVlX2NvbnRyb2wuanMnO1xuaW1wb3J0IHR5cGUgeyBGb2xkZXIsUnVubmVyLEZvbGRlckVycm9yLFJ1bm5lclJlcG9ydH0gZnJvbSAnLi4vLi4vc3JjL2RhdGEuanMnO1xuaW1wb3J0IHtmaW5kX2Jhc2V9IGZyb20gJy4uLy4uL3NyYy9wYXJzZXIuanMnO1xuaW1wb3J0IHtwb3N0X21lc3NhZ2UsY2FsY19ydW5uZXJfc3RhdHVzfSBmcm9tICcuL2NvbW1vbi5qcydcbmltcG9ydCBJQ09OU19IVE1MIGZyb20gJy4uL3Jlc291cmNlcy9pY29ucy5odG1sJ1xuaW1wb3J0IHtUZXJtaW5hbHN9IGZyb20gJy4vdGVybWluYWxzLmpzJ1xuaW1wb3J0IHtJY29uc0FuaW1hdG9yLHBhcnNlX2ljb25zfSBmcm9tICcuL2ljb25zLmpzJ1xuXG5mdW5jdGlvbiB0aGVfY29udmVydChfcmVwb3J0OnVua25vd24pOlRyZWVOb2Rle1xuICBjb25zdCByZXBvcnQ9X3JlcG9ydCBhcyBSdW5uZXJSZXBvcnQgLy9kZWxpYmVyYXRseSBtYWtlcyBsZXNzIHN0cm9rIHR5cGVuXG4gIGZ1bmN0aW9uIGNvbnZlcnRfcnVubmVyKHJ1bm5lcjpSdW5uZXIpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge3NjcmlwdCxpZCxuYW1lLGVmZmVjdGl2ZV93YXRjaCx0YWdzfT1ydW5uZXJcbiAgICAgIGNvbnN0IHdhdGNoZWQ9ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKGVmZmVjdGl2ZV93YXRjaC5sZW5ndGg9PT0wKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICByZXR1cm4gcmVwb3J0Lm1vbml0b3JlZC5pbmNsdWRlcyhpZClcbiAgICAgIH0oKVxuICAgICAgY29uc3Qge3ZlcnNpb24sc3RhdGV9PWNhbGNfcnVubmVyX3N0YXR1cyhyZXBvcnQscnVubmVyKVxuICAgICAgLy9jb25zdCBjbGFzc05hbWU9KHdhdGNoZWQ/J3dhdGNoZWQnOnVuZGVmaW5lZFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTonaXRlbScsXG4gICAgICAgIGlkLFxuICAgICAgICBsYWJlbDpuYW1lLFxuICAgICAgICBjb21tYW5kczpbJ3BsYXknLCdzdG9wJywnY29weSddLCBcbiAgICAgICAgY2hpbGRyZW46W10sXG4gICAgICAgIGRlc2NyaXB0aW9uOnNjcmlwdCxcbiAgICAgICAgaWNvbjpzdGF0ZSxcbiAgICAgICAgaWNvbl92ZXJzaW9uOlxuICAgICAgICB2ZXJzaW9uLFxuICAgICAgICBjbGFzc05hbWU6dW5kZWZpbmVkLFxuICAgICAgICB0b2dnbGVzOiB7d2F0Y2hlZH0sXG4gICAgICAgIHRhZ3NcbiAgICAgICAgLy9kZWZhdWx0X2NoZWNrYm94X3N0YXRlOiBlZmZlY3RpdmVfd2F0Y2gubGVuZ3RoPjB8fHVuZGVmaW5lZFxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBjb252ZXJ0X2Vycm9yKHJvb3Q6Rm9sZGVyRXJyb3IpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge2lkLG1lc3NhZ2V9PXJvb3RcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6XCJpdGVtXCIsXG4gICAgICAgIGlkLFxuICAgICAgICBsYWJlbDptZXNzYWdlLFxuICAgICAgICBjaGlsZHJlbjpbXSxcbiAgICAgICAgaWNvbjpcInN5bnRheGVycm9yXCIsXG4gICAgICAgIGljb25fdmVyc2lvbjoxLFxuICAgICAgICBjb21tYW5kczpbXSxcbiAgICAgICAgY2xhc3NOYW1lOlwid2FybmluZ1wiLFxuICAgICAgICB0b2dnbGVzOiB7fSxcbiAgICAgICAgdGFnczpbXVxuICAgIH1cblxuICB9ICBcbiAgZnVuY3Rpb24gY29udmVydF9mb2xkZXIocm9vdDpGb2xkZXIpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge25hbWUsaWR9PXJvb3RcbiAgICAgIGNvbnN0IGZvbGRlcnM9cm9vdC5mb2xkZXJzLm1hcChjb252ZXJ0X2ZvbGRlcilcbiAgICAgIGNvbnN0IGl0ZW1zPXJvb3QucnVubmVycy5tYXAoY29udmVydF9ydW5uZXIpXG4gICAgICBjb25zdCBlcnJvcnM9cm9vdC5lcnJvcnMubWFwKGNvbnZlcnRfZXJyb3IpICBcbiAgICAgIGNvbnN0IGNoaWxkcmVuPVsuLi5mb2xkZXJzLC4uLml0ZW1zLC4uLmVycm9yc11cbiAgICAgIGNvbnN0IGljb249ZXJyb3JzLmxlbmd0aD09PTA/J2ZvbGRlcic6J2ZvbGRlcnN5bnRheGVycm9yJ1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2hpbGRyZW4sXG4gICAgICAgIHR5cGU6J2ZvbGRlcicsXG4gICAgICAgIGlkLGxhYmVsOm5hbWUsXG4gICAgICAgIGNvbW1hbmRzOltdLFxuICAgICAgICBpY29uLFxuICAgICAgICBpY29uX3ZlcnNpb246MCxcbiAgICAgICAgY2xhc3NOYW1lOnVuZGVmaW5lZCxcbiAgICAgICAgdG9nZ2xlczoge30sXG4gICAgICAgIHRhZ3M6W11cbiAgICAgIH1cbiAgfVxuICByZXR1cm4gY29udmVydF9mb2xkZXIocmVwb3J0LnJvb3QpXG59XG5cbmNsYXNzIFRoZVRyZWVQcm92aWRlciBpbXBsZW1lbnRzIFRyZWVEYXRhUHJvdmlkZXJ7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB0ZXJtaW5hbHM6VGVybWluYWxzKXt9XG4gIHRvZ2dsZV9vcmRlcj1bJ3dhdGNoZWQnXVxuICAvL2NvbnZlcnQ9dGhlX2NvbnZlcnRcbiAgcmVwb3J0OlJ1bm5lclJlcG9ydHx1bmRlZmluZWRcbiAgY29tbWFuZChpZDpzdHJpbmcsY29tbWFuZF9uYW1lOnN0cmluZyl7Ly9QYXJhbWV0ZXIgJ2NvbW1hbmRfbmFtZScgaW1wbGljaXRseSBoYXMgYW4gJ2FueScgdHlwZS50cyg3MDA2KSB3aHlcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDogXCJjb21tYW5kX2NsaWNrZWRcIixcbiAgICAgIGlkLFxuICAgICAgY29tbWFuZF9uYW1lXG4gICAgfSlcbiAgfVxuICAvL2ljb25zX2h0bWw9SUNPTlNfSFRNTFxuICBzZWxlY3RlZChpZDpzdHJpbmcpe1xuICAgIHRoaXMudGVybWluYWxzLnNldF9zZWxlY3RlZChpZClcbiAgICBjb25zdCBiYXNlPWZpbmRfYmFzZSh0aGlzLnJlcG9ydCEucm9vdCxpZClcbiAgICBpZiAoYmFzZT09bnVsbHx8YmFzZS5wb3M9PW51bGwpXG4gICAgICByZXR1cm5cbiAgICBpZiAoYmFzZS5uZWVkX2N0bCYmIWN0cmwucHJlc3NlZClcbiAgICAgIHJldHVyblxuICAgIGNvbnN0IHtwb3N9PWJhc2VcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDogXCJjb21tYW5kX29wZW5fZmlsZV9wb3NcIixcbiAgICAgIHBvc1xuICAgIH0pXG4gIH1cbn1cblxuZnVuY3Rpb24gc3RhcnQoKXtcbiAgY29uc29sZS5sb2coJ3N0YXJ0JylcbiAgY29uc3QgdGVybWluYWxzPW5ldyBUZXJtaW5hbHMoKVxuICAvLyAvbGV0IGJhc2VfdXJpPScnXG4gIGNvbnN0IHByb3ZpZGVyPW5ldyBUaGVUcmVlUHJvdmlkZXIodGVybWluYWxzKVxuICBjb25zdCBpY29ucz1wYXJzZV9pY29ucyhJQ09OU19IVE1MKVxuICBjb25zdCBpY29uc19hbmltYXRvcj1uZXcgSWNvbnNBbmltYXRvcihpY29ucyxbXCJ3YXRjaGVkXCIsXCJwbGF5XCIsXCJzdG9wXCJdKVxuICBjb25zdCBjb250YWluZXI6SFRNTEVsZW1lbnQ9cXVlcnlfc2VsZWN0b3IoZG9jdW1lbnQuYm9keSwnI3RoZV90cmVlJylcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCAoKSA9PiB7XG4gICAgICBwb3N0X21lc3NhZ2Uoe2NvbW1hbmQ6J3ZpZXdfZm9jdXMnLHZhbDp0cnVlfSlcbiAgICB9KTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgKCkgPT4ge1xuICAgICAgcG9zdF9tZXNzYWdlKHtjb21tYW5kOid2aWV3X2ZvY3VzJyx2YWw6ZmFsc2V9KVxuICAgIH0pOyAgXG4gIGNvbnN0IHRyZWU9bmV3IFRyZWVDb250cm9sKGNvbnRhaW5lcixwcm92aWRlcixpY29ucykgLy9ubyBlcnJvciwgd2hheVxuIFxuICBmdW5jdGlvbiBvbl9pbnRlcnZhbCgpe1xuICAgIHRyZWUub25faW50ZXJ2YWwoKVxuICAgIHRlcm1pbmFscy5vbl9pbnRlcnZhbCgpXG4gIH1cbiAgc2V0SW50ZXJ2YWwob25faW50ZXJ2YWwsMTAwKVxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsICAoZXZlbnQ6TWVzc2FnZUV2ZW50PFdlYnZpZXdNZXNzYWdlPikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XG4gICAgICBzd2l0Y2ggKG1lc3NhZ2UuY29tbWFuZCkge1xuICAgICAgICAgIGNhc2UgJ1J1bm5lclJlcG9ydCc6e1xuICAgICAgICAgICAgcHJvdmlkZXIucmVwb3J0PW1lc3NhZ2UgICAgICAgICAgICBcbiAgICAgICAgICAgIHRlcm1pbmFscy5vbl9kYXRhKG1lc3NhZ2UpXG4gICAgICAgICAgICBjb25zdCB0cmVlX25vZGU9dGhlX2NvbnZlcnQobWVzc2FnZSlcbiAgICAgICAgICAgIC8vYmFzZV91cmk9bWVzc2FnZS5iYXNlX3VyaVxuICAgICAgICAgICAgdHJlZS5vbl9kYXRhKHRyZWVfbm9kZSlcbiAgICAgICAgICAgIGljb25zX2FuaW1hdG9yLmFuaW1hdGUodHJlZV9ub2RlKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdjb21tYW5kX2ZpbmQnOntcbiAgICAgICAgICAgIHRlcm1pbmFscy5jb21tYW5kX2ZpbmQoKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICBcbiAgICAgICAgICBjYXNlICdzZXRfc2VsZWN0ZWQnOlxuICAgICAgICAgICAgLy91cGRhKGRvY3VtZW50LmJvZHksJyNzZWxlY3RlZCcsIG1lc3NhZ2Uuc2VsZWN0ZWQpXG4gICAgICAgICAgICBwcm92aWRlci5zZWxlY3RlZChtZXNzYWdlLnNlbGVjdGVkKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29uc29sZS5sb2coYHVuZXhwZWN0ZWQgbWVzc2FnZSAke21lc3NhZ2UuY29tbWFuZH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgfSk7XG59XG5zdGFydCgpXG5jb25zdCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50ZXJtc19jb250YWluZXInKTtcbmNvbnNvbGUubG9nKGVsKVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQVFPLFNBQVMsR0FBTSxPQUFnQztBQUdwRCxNQUFJLFVBQVUsUUFBUSxVQUFVLFFBQVc7QUFDekMsVUFBTSxJQUFJLE1BQU0sbUNBQW1DO0FBQUEsRUFDckQ7QUFDQSxTQUFPO0FBQ1Q7QUFnQk8sU0FBUyxVQUFVLEdBQVU7QUFDbEMsTUFBSSxhQUFhO0FBQ2YsV0FBTztBQUNULFFBQU0sTUFBTSxPQUFPLENBQUM7QUFDcEIsU0FBTyxJQUFJLE1BQU0sR0FBRztBQUN0QjtBQXFNTyxTQUFTLFlBQWUsS0FBMEIsR0FBYyxPQUFZO0FBQ2pGLFFBQU0sU0FBTyxJQUFJLENBQUM7QUFDbEIsTUFBSSxVQUFRLE1BQUs7QUFDZixRQUFJLENBQUMsSUFBRSxNQUFNO0FBQUEsRUFDZjtBQUNBLFNBQU8sSUFBSSxDQUFDO0FBQ2Q7QUF1Qk8sU0FBUyxXQUFjLEtBQVcsT0FBUTtBQUMvQyxNQUFJLElBQUksSUFBSSxLQUFLLEdBQUc7QUFDbEIsUUFBSSxPQUFPLEtBQUs7QUFBQSxFQUNsQixPQUFPO0FBQ0wsUUFBSSxJQUFJLEtBQUs7QUFBQSxFQUNmO0FBQ0Y7OztBQzFRTyxTQUFTLGVBQTBDQSxLQUFXLFVBQWdCO0FBQ2pGLFFBQU0sTUFBSUEsSUFBRyxjQUFpQixRQUFRO0FBQ3RDLE1BQUksT0FBSztBQUNQLFVBQU0sSUFBSSxNQUFNLHlDQUF5QztBQUN6RCxTQUFPO0FBQ2I7QUFDTyxTQUFT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QUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEtBQUssSUFBSSxLQUFLLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLElBQUksTUFBTSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsS0FBSyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxPQUFPLEdBQUcsTUFBTSxHQUFHLEtBQUssSUFBSSxHQUFHLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsTUFBTSxJQUFJLEtBQUssSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsTUFBTSxHQUFHLFFBQVEsR0FBRztBQUdsckMsSUFBSSw2QkFBNkIsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxLQUFLLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssS0FBSyxLQUFLLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLElBQUksR0FBRyxJQUFJLE1BQU0sR0FBRyxLQUFLLE1BQU0sSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksS0FBSyxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsS0FBSyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsTUFBTSxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksTUFBTSxPQUFPLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxNQUFNLElBQUksS0FBSyxNQUFNLEtBQUssTUFBTSxNQUFNLEdBQUcsSUFBSTtBQUd2dEUsSUFBSSwwQkFBMEI7QUFHOUIsSUFBSSwrQkFBK0I7QUFTbkMsSUFBSSxnQkFBZ0I7QUFBQSxFQUNsQixHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxH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QTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QUNDTyxTQUFTLEdBQUcsUUFBUSxJQUFJO0FBQzdCLFNBQU8sU0FBVSxZQUFrQyxRQUEyQjtBQUU1RSxVQUFNLFdBQVcsUUFBUSxJQUFJO0FBQUEsTUFBTyxDQUFDLEtBQUssS0FBSyxNQUM3QyxN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QUNILFFBQU0sT0FBSyxJQUFJLFlBQVksV0FBVSxVQUFTLEtBQUs7QUFFbkQsV0FBUyxjQUFhO0FBQ3BCLFNBQUssWUFBWTtBQUNqQixjQUFVLFlBQVk7QUFBQSxFQUN4QjtBQUNBLGNBQVksYUFBWSxHQUFHO0FBQzNCLFNBQU8saUJBQWlCLFdBQVksQ0FBQyxVQUF1QztBQUN4RSxVQUFNLFVBQVUsTUFBTTtBQUN0QixZQUFRLFFBQVEsU0FBUztBQUFBLE1BQ3JCLEtBQUssZ0JBQWU7QUFDbEIsaUJBQVMsU0FBTztBQUNoQixrQkFBVSxRQUFRLE9BQU87QUFDekIsY0FBTSxZQUFVLFlBQVksT0FBTztBQUVuQyxhQUFLLFFBQVEsU0FBUztBQUN0Qix1QkFBZSxRQUFRLFNBQVM7QUFFaEM7QUFBQSxNQUNGO0FBQUEsTUFDQSxLQUFLLGdCQUFlO0FBQ2xCLGtCQUFVLGFBQWE7QUFDdkI7QUFBQSxNQUNGO0FBQUEsTUFFQSxLQUFLO0FBRUgsaUJBQVMsU0FBUyxRQUFRLFFBQVE7QUFDbEM7QUFBQSxNQUNGO0FBQ0UsZ0JBQVEsSUFBSSxzQkFBc0IsUUFBUSxPQUFPLEVBQUU7QUFDbkQ7QUFBQSxJQUNOO0FBQUEsRUFDSixDQUFDO0FBQ0g7QUFDQSxNQUFNO0FBQ04sSUFBTSxLQUFLLFNBQVMsY0FBYyxrQkFBa0I7QUFDcEQsUUFBUSxJQUFJLEVBQUU7IiwKICAibmFtZXMiOiBbImVsIiwgImVsIiwgImVsIiwgInIiLCAiYW5zIiwgIlRva2VuVHlwZSIsICJQb3NpdGlvbiIsICJjb2wiLCAiU291cmNlTG9jYXRpb24iLCAic3RhcnQiLCAib2Zmc2V0IiwgIlBhcnNlciIsICJyZWYiLCAicGFyc2UiLCAiRGVzdHJ1Y3R1cmluZ0Vycm9ycyIsICJUb2tDb250ZXh0IiwgInJlIiwgIlNjb3BlIiwgIk5vZGUiLCAiQnJhbmNoSUQiLCAiUmVnRXhwVmFsaWRhdGlvblN0YXRlIiwgImN1cnJlbnQiLCAiVG9rZW4iLCAidmVyc2lvbiIsICJyIiwgImEiLCAiYiIsICJhbnMiLCAiZWwiLCAic3RhcnQiLCAiZGF0YSIsICJzdGFydCIsICJzdGFydCIsICJyb3ciLCAiY29sIiwgInJvdyIsICJjb2wiLCAiZGF0YSIsICJ2ZXJzaW9uIiwgImVsIiwgInZlcnNpb24iXQp9Cg==
