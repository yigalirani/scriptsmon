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

// ../../base_types/src/index.ts
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
var RegExpSearcher = class {
  constructor(search_data, regex) {
    this.search_data = search_data;
    this.regex = regex;
    this.children = search_data.term_el.children;
  }
  text_head = 0;
  line = 0;
  children;
  walker;
  walker_offset = 0;
  advance_line(text_pos) {
    const { children, search_data: { lines, term_plain_text } } = this;
    while (true) {
      const next_line_pos = lines[this.line + 1] ?? term_plain_text.length;
      if (next_line_pos > text_pos) {
        if (this.walker == null) {
          const cur_line_node = children[this.line];
          this.walker = document.createTreeWalker(cur_line_node, NodeFilter.SHOW_TEXT);
          this.text_head = lines[this.line];
        }
        return;
      }
      this.walker = void 0;
      if (this.line < lines.length)
        this.line++;
    }
  }
  get_node_offset(text_pos) {
    this.advance_line(text_pos);
    if (this.walker == null)
      throw new Error("walker is null");
    while (this.walker.nextNode()) {
      const node = this.walker.currentNode;
      const string = node.textContent ?? "";
      const { length } = string;
      this.text_head += length;
      if (text_pos >= this.text_head - length && text_pos < this.text_head)
        return {
          node,
          node_pos: text_pos - this.text_head - length
        };
    }
    throw new Error("should not get here");
  }
  iter = () => {
    while (true) {
      const { lastIndex } = this.regex;
      const m = this.regex.exec(this.search_data.term_plain_text);
      if (m == null) {
        this.regex.lastIndex = lastIndex;
        return;
      }
      const start2 = this.get_node_offset(m.index);
      const end = this.get_node_offset(m.index + m[0].length);
      const range = new Range();
      range.setStart(start2.node, start2.node_pos);
      range.setEnd(end.node, end.node_pos);
      this.search_data.highlight.add(range);
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
              <div class="arrow_up"></div>
            </div>             
            <div class="nav_button" id="next_match" title="Next Match (F3)">
              <div class="arrow_down"></div>
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
    this.input().addEventListener("change", this.update_search);
    this.input().addEventListener("input", this.update_search);
    this.interval_id = setInterval(this.iter, 200);
  }
  find_widget;
  interval_id;
  regex_searcher;
  regex;
  show() {
    this.find_widget.classList.remove("hidden");
    this.input()?.focus();
  }
  iter = () => {
    this.regex_searcher?.iter();
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
    if (regex != null)
      this.regex_searcher = new RegExpSearcher(this.data, regex);
  };
  onclick = (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement))
      return;
    if (target.id === "close_widget") {
      get_parent_by_class(target, "find_widget_container")?.classList.toggle("hidden");
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
    last_line: "",
    last_line_plain: ""
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
    this.strings = [];
    this.lines = [];
    this.channel_states = make_channel_states();
    this.term_el = create_element(`
<div class=term>
  <div class="term_text"></div>
</div>
    `, parent);
    this.term_text = this.term_el.querySelector(".term_text");
    this.term_text.innerHTML = "";
    this.term_plain_text = "";
    this.highlight = this.make_highlight(id);
    this.search = new TerminalSearch(this);
    this.term_el.addEventListener("click", this.onclick);
  }
  channel_states;
  term_text;
  term_el;
  search;
  highlight;
  term_plain_text = "";
  lines;
  last_write_channel = "stdout";
  strings;
  make_highlight(id) {
    const highlight_name = `search_${id}`;
    const highlight = new Highlight();
    const dynamic_sheet = new CSSStyleSheet();
    document.adoptedStyleSheets.push(dynamic_sheet);
    dynamic_sheet.insertRule(`::highlight(${highlight_name}) { background-color: red; }`);
    CSS.highlights.set(highlight_name, highlight);
    return highlight;
  }
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
    const joined_strings = this.strings.join("");
    let acum = this.term_plain_text.length;
    for (const str of joined_strings.split("\n")) {
      acum += str.length;
      this.lines.push(acum);
    }
    this.term_plain_text = [this.term_plain_text, joined_strings].join("");
    console.log(this.term_plain_text);
    console.log(this.lines);
  }
  flush_channel(channel_state, append_nl) {
    if (channel_state.last_line === "")
      return;
    if (append_nl)
      this.strings.push("\n");
    channel_state.start_parser_state = channel_state.end_parser_state;
    channel_state.start_style = channel_state.end_style;
    channel_state.end_parser_state = void 0;
    channel_state.end_parser_state = clear_style;
    channel_state.last_line = "";
    channel_state.last_line_plain = "";
  }
  del_last_html_line(channel_state) {
    const { last_line, last_line_plain } = channel_state;
    if (last_line === "")
      return;
    const line_to_delete = this.term_text.querySelector(`& > :last-child`);
    if (line_to_delete == null) {
      console.error("missmatch:line_to_delete_null");
      return;
    }
    const { textContent } = line_to_delete;
    if (textContent !== last_line_plain) {
      console.error("missmatch:text_content");
      return;
    }
    line_to_delete.remove();
  }
  term_write(output, channel) {
    if (output.length === 0)
      return;
    const channel_state = this.channel_states[channel];
    if (this.last_write_channel !== channel) {
      this.flush_channel(this.channel_states[this.last_write_channel], true);
    }
    this.last_write_channel = channel;
    const joined_lines = [channel_state.last_line, ...output].join("").replaceAll("\r\n", "\n");
    const lines = joined_lines.split("\n");
    this.del_last_html_line(channel_state);
    const acum_html = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const {
        plain_text,
        style_positions,
        link_inserts
      } = strip_ansi(line, channel_state.start_style);
      this.strings.push(plain_text);
      const is_last = i === lines.length - 1;
      if (is_last) {
        if (line === "") {
          this.flush_channel(channel_state, false);
          break;
        }
      }
      const { ranges, parser_state } = this.listener.parse(plain_text, channel_state.start_parser_state);
      channel_state.end_style = style_positions.at(-1).style;
      channel_state.end_parser_state = parser_state;
      channel_state.last_line = line;
      channel_state.last_line_plain = plain_text;
      const range_inserts = ranges_to_inserts(ranges);
      const inserts = merge_inserts(range_inserts, link_inserts);
      const html = generate_html({ style_positions, inserts, plain_text });
      const br = plain_text === "" ? "<br>" : "";
      acum_html.push(`<div class="${channel_state.class_name}">${html}${br}</div>`);
      if (!is_last)
        this.flush_channel(channel_state, true);
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
    this.strings = [];
    this.term_plain_text = "";
    this.lines = [];
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2RvbV91dGlscy50cyIsICIuLi8uLi8uLi8uLi9iYXNlX3R5cGVzL3NyYy9pbmRleC50cyIsICIuLi8uLi9zcmMvdHJlZV9pbnRlcm5hbHMudHMiLCAiLi4vLi4vc3JjL3RyZWVfY29udHJvbC50cyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvYWNvcm4vZGlzdC9hY29ybi5tanMiLCAiLi4vLi4vLi4vc3JjL3BhcnNlci50cyIsICIuLi8uLi9zcmMvY29tbW9uLnRzIiwgIi4uL2ljb25zLmh0bWwiLCAiLi4vLi4vc3JjL3JlZ2V4X2J1aWxkZXIudHMiLCAiLi4vLi4vc3JjL3Rlcm1pbmFsc19hbnNpLnRzIiwgIi4uLy4uL3NyYy90ZXJtaW5hbF9zZWFyY2gudHMiLCAiLi4vLi4vc3JjL3Rlcm1pbmFsLnRzIiwgIi4uLy4uL3NyYy90ZXJtaW5hbHNfcGFyc2UudHMiLCAiLi4vLi4vc3JjL3Rlcm1pbmFscy50cyIsICIuLi8uLi9zcmMvaWNvbnMudHMiLCAiLi4vLi4vc3JjL2luZGV4LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgdHlwZSB7IHMydH0gZnJvbSAnQHlpZ2FsL2Jhc2VfdHlwZXMnXG5cbmV4cG9ydCBmdW5jdGlvbiBxdWVyeV9zZWxlY3RvcjxUIGV4dGVuZHMgRWxlbWVudD1FbGVtZW50PihlbDpFbGVtZW50LHNlbGVjdG9yOnN0cmluZyl7IC8vIDM6MzIgIHdhcm5pbmcgIFR5cGUgcGFyYW1ldGVyIFQgaXMgdXNlZCBvbmx5IG9uY2UgaW4gdGhlIGZ1bmN0aW9uIHNpZ25hdHVyZSAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtcGFyYW1ldGVycyB3aHk/XG4gICAgY29uc3QgYW5zPWVsLnF1ZXJ5U2VsZWN0b3I8VD4oc2VsZWN0b3IpO1xuICAgIGlmIChhbnM9PW51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NlbGVjdG9yIG5vdCBmb3VuZCBvciBub3QgZXhwZWN0ZWQgdHlwZScpICBcbiAgICAgIHJldHVybiBhbnNcbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVfZWxlbWVudChodG1sOnN0cmluZyxwYXJlbnQ/OkhUTUxFbGVtZW50KXtcbiAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGVtcGxhdGVcIilcbiAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbC50cmltKClcbiAgY29uc3QgYW5zID0gdGVtcGxhdGUuY29udGVudC5maXJzdEVsZW1lbnRDaGlsZCBhcyBIVE1MRWxlbWVudDtcbiAgaWYgKHBhcmVudCE9bnVsbClcbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoYW5zKVxuICByZXR1cm4gYW5zXG59XG5leHBvcnQgZnVuY3Rpb24gZGl2cyh2YWxzOnMydDxzdHJpbmd8dW5kZWZpbmVkPil7XG4gIGNvbnN0IGFucz1bXVxuICBmb3IgKGNvbnN0IFtrLHZdIG9mIE9iamVjdC5lbnRyaWVzKHZhbHMpKVxuICAgIGlmICh2IT1udWxsJiZ2IT09JycpXG4gICAgICBhbnMucHVzaChgPGRpdiBjbGFzcz1cIiR7a31cIj4ke3Z9PC9kaXY+YClcbiAgcmV0dXJuIGFucy5qb2luKCcnKVxufVxuZXhwb3J0IGZ1bmN0aW9uIGdldF9wYXJlbnRfYnlfZGF0YV9hdHRpYnV0ZShlbDpIVE1MRWxlbWVudHxudWxsLGtleTpzdHJpbmcpe1xuICBpZiAoZWw9PW51bGwpXG4gICAgcmV0dXJuIG51bGxcbiAgbGV0IGFuczpIVE1MRWxlbWVudHxudWxsPWVsXG4gIHdoaWxlKGFucyE9bnVsbCl7XG4gICAgY29uc3Qge2RhdGFzZXR9PWFuc1xuICAgIGlmIChrZXkgaW4gZGF0YXNldClcbiAgICAgIHJldHVybiBhbnNcbiAgICBhbnM9YW5zLnBhcmVudEVsZW1lbnRcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuZXhwb3J0IGZ1bmN0aW9uIGdldF9wYXJlbnRfd2l0aF9kYXRhc2V0KGVsOkhUTUxFbGVtZW50fG51bGwpe1xuICBpZiAoZWw9PW51bGwpXG4gICAgcmV0dXJuIG51bGxcbiAgbGV0IGFuczpIVE1MRWxlbWVudHxudWxsPWVsXG4gIHdoaWxlKGFucyE9bnVsbCl7XG4gICAgaWYgKE9iamVjdC5lbnRyaWVzKGFucy5kYXRhc2V0KS5sZW5ndGghPT0wKVxuICAgICAgcmV0dXJuIGFuc1xuICAgIGFucz1hbnMucGFyZW50RWxlbWVudFxuICB9XG4gIHJldHVybiBudWxsXG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0X3BhcmVudF9ieV9jbGFzcyhlbDpFbGVtZW50fG51bGwsY2xhc3NOYW1lOnN0cmluZyl7XG4gIGlmIChlbD09bnVsbClcbiAgICByZXR1cm4gbnVsbFxuICBsZXQgYW5zOkVsZW1lbnR8bnVsbD1lbFxuICB3aGlsZShhbnMhPW51bGwpe1xuICAgIGlmIChhbnMuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSkpXG4gICAgICByZXR1cm4gYW5zIGFzIEhUTUxFbGVtZW50XG4gICAgYW5zPWFucy5wYXJlbnRFbGVtZW50XG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cbmZ1bmN0aW9uIGhhc19jbGFzc2VzKGVsOiBIVE1MRWxlbWVudCB8IG51bGwsY2xhc3NlczpzdHJpbmdbXSl7XG4gIGlmIChlbD09bnVsbClcbiAgICByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIGNsYXNzZXMuc29tZShjID0+IGVsLmNsYXNzTGlzdC5jb250YWlucyhjKSlcbn1cbmV4cG9ydCBmdW5jdGlvbiBoYXNfY2xhc3MocGFyZW50OiBIVE1MRWxlbWVudCxzZWxlY3RvcjpzdHJpbmcsYzpzdHJpbmcpe1xuICBjb25zdCBlbD1wYXJlbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcilcbiAgaWYgKGVsPT1udWxsKVxuICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGMpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRfcGFyZW50X2J5X2NsYXNzZXMoXG4gIGVsOiBIVE1MRWxlbWVudCxcbiAgY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXVxuKTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICBsZXQgYW5zOiBIVE1MRWxlbWVudCB8IG51bGwgPSBlbDtcblxuICB3aGlsZSAoYW5zICE9PSBudWxsKSB7XG4gICAgaWYgKGhhc19jbGFzc2VzKGFucyxjbGFzc2VzKSlcbiAgICAgIHJldHVybiBhbnM7XG4gICAgYW5zID0gYW5zLnBhcmVudEVsZW1lbnQ7XG4gIH0gXG4gIHJldHVybiBudWxsO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldF9wYXJlbnRfaWQoIC8vbG9vcHMgb3ZlciBwYXJlbnRzIHVudGlsIGZpcnN0IHdpdGggaWRcbiAgZWw6IEhUTUxFbGVtZW50XG4pOiBzdHJpbmd8dW5kZWZpbmVke1xuICBsZXQgYW5zPWVsLnBhcmVudEVsZW1lbnRcblxuICB3aGlsZSAoYW5zICE9PSBudWxsKSB7XG4gICAgY29uc3QgaWQ9YW5zLmdldEF0dHJpYnV0ZSgnaWQnKVxuICAgIGlmIChpZCE9bnVsbClcbiAgICAgIHJldHVybiBpZFxuICAgIGFucyA9IGFucy5wYXJlbnRFbGVtZW50O1xuICB9IFxufVxuZnVuY3Rpb24gc2V0dGVyX2NhY2hlKHNldHRlcjooZWw6SFRNTEVsZW1lbnQsdmFsdWU6c3RyaW5nKT0+dm9pZCl7XG4gIGNvbnN0IGVsX3RvX2h0bWw9IG5ldyBXZWFrTWFwPEhUTUxFbGVtZW50LHN0cmluZz4oKVxuICByZXR1cm4gZnVuY3Rpb24oZWw6SFRNTEVsZW1lbnQsc2VsZWN0b3I6c3RyaW5nLHZhbHVlOnN0cmluZyl7IFxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWwucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oc2VsZWN0b3IpKXtcbiAgICAgIGNvbnN0IGV4aXN0cz1lbF90b19odG1sLmdldChjaGlsZClcbiAgICAgIGlmIChleGlzdHM9PT12YWx1ZSlcbiAgICAgICAgY29udGludWVcbiAgICAgIGVsX3RvX2h0bWwuc2V0KGNoaWxkLHZhbHVlKVxuICAgICAgc2V0dGVyKGNoaWxkLHZhbHVlKSAgXG4gICAgfSBcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgdXBkYXRlX2NoaWxkX2h0bWw9c2V0dGVyX2NhY2hlKChlbDpIVE1MRWxlbWVudCx2YWx1ZTpzdHJpbmcpPT57ZWwuaW5uZXJIVE1MPXZhbHVlfSlcbmV4cG9ydCBjb25zdCB1cGRhdGVfY2xhc3NfbmFtZT1zZXR0ZXJfY2FjaGUoKGVsOkhUTUxFbGVtZW50LHZhbHVlOnN0cmluZyk9PnsgZWwuY2xhc3NOYW1lPXZhbHVlfSlcblxuZXhwb3J0IGNsYXNzIEN0cmxUcmFja2Vye1xuICBwcmVzc2VkID0gZmFsc2U7XG4gIGNvbnN0cnVjdG9yKCl7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChlKSA9PiB7XG4gICAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XG4gICAgICAgIHRoaXMucHJlc3NlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIChlKSA9PiB7XG4gICAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XG4gICAgICAgIHRoaXMucHJlc3NlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pOyAgICBcbiAgfVxufVxuaW50ZXJmYWNlIFZTQ29kZUFwaSB7XG4gIHBvc3RNZXNzYWdlKG1lc3NhZ2U6IHVua25vd24pOiB2b2lkO1xuICBnZXRTdGF0ZSgpOiB1bmtub3duO1xuICBzZXRTdGF0ZShzdGF0ZTogdW5rbm93bik6IHZvaWQ7XG59XG5kZWNsYXJlIGZ1bmN0aW9uIGFjcXVpcmVWc0NvZGVBcGkoKTogVlNDb2RlQXBpO1xuZXhwb3J0IGNvbnN0IHZzY29kZSA9IGFjcXVpcmVWc0NvZGVBcGkoKTtcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9uZW50e1xuICBvbl9pbnRlcnZhbDooKT0+dm9pZFxuICBvbl9kYXRhOihkYXRhOnVua25vd24pPT52b2lkXG59XG5leHBvcnQgY29uc3QgY3RybD1uZXcgQ3RybFRyYWNrZXIoKVxuZXhwb3J0IGNvbnN0IHJlID0gKGZsYWdzPzogc3RyaW5nKSA9PiAgLy90b2RvOiBtb3ZlIGl0IHRvIHNvbWUgZ2VuZXJpYyBsaWIgbGlrZSB0aGUgYmFzZV90eXBlcy4gYWxyZWFkeSBvYnNvbGV0ZVxuICAoc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksIC4uLnZhbHVlczogdW5rbm93bltdKTogUmVnRXhwID0+IHtcbiAgICBjb25zdCByYXcgPSBTdHJpbmcucmF3KHsgcmF3OiBzdHJpbmdzIH0sIC4uLnZhbHVlcyk7XG4gICAgY29uc3Qgc2FuaXRpemVkID0gcmF3LnJlcGxhY2UoLyMuKiQvZ20sICcnKS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICByZXR1cm4gbmV3IFJlZ0V4cChzYW5pdGl6ZWQsIGZsYWdzKTtcbiAgfTtcbiIsICJleHBvcnQgdHlwZSBzMnQ8VD4gPSBSZWNvcmQ8c3RyaW5nLCBUPlxuZXhwb3J0IHR5cGUgczJ1ID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbmV4cG9ydCB0eXBlIHAydSA9IFJlY29yZDxQcm9wZXJ0eUtleSwgdW5rbm93bj4gXG5leHBvcnQgY29uc3QgZ3JlZW49J1xceDFiWzQwbVxceDFiWzMybSdcbmV4cG9ydCBjb25zdCByZWQ9J1xceDFiWzQwbVxceDFiWzMxbSdcbmV4cG9ydCBjb25zdCB5ZWxsb3c9J1xceDFiWzQwbVxceDFiWzMzbSdcblxuZXhwb3J0IGNvbnN0IHJlc2V0PSdcXHgxYlswbSdcbmV4cG9ydCBmdW5jdGlvbiBubDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQpOiBUIHtcbiAgLy90b2RvOmNoZWNrIG9ubHkgYWN0aXZlIG9uIGRlYnVnIG1vZGVcbiAgLy9yZXR1cm4gdmFsdWVcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZCcpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5leHBvcnQgdHlwZSBLZXkgPSBudW1iZXIgfCBzdHJpbmcgLy9zaG91bGQgaSB1c2UgcHJvcGVyeWtleSBmb3IgdGhpcz9cbmV4cG9ydCB0eXBlIEF0b20gPSBudW1iZXIgfCBzdHJpbmcgfCBib29sZWFuIFxuZXhwb3J0IGZ1bmN0aW9uIGlzX2F0b20oeDogdW5rbm93bik6IHggaXMgQXRvbSB7XG4gIGlmICh4ID09IG51bGwpIHJldHVybiBmYWxzZVxuICByZXR1cm4gWydudW1iZXInLCAnc3RyaW5nJywgJ2Jvb2xlYW4nXS5pbmNsdWRlcyh0eXBlb2YgeClcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc19rZXkoeDogdW5rbm93bik6IHggaXMgS2V5IHtcbiAgaWYgKHggPT0gbnVsbCkgcmV0dXJuIGZhbHNlXG4gIHJldHVybiBbJ251bWJlcicsICdzdHJpbmcnXS5pbmNsdWRlcyh0eXBlb2YgeClcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc19hdG9tX2V4KHY6IHVua25vd24sIHBsYWNlOiBzdHJpbmcsIGsgPSAnJyk6IHYgaXMgQXRvbSB7XG4gIGlmIChpc19hdG9tKHYpKSByZXR1cm4gdHJ1ZVxuICBjb25zb2xlLndhcm4oJ25vbi1hdG9tJywgcGxhY2UsIGssIHYpXG4gIHJldHVybiBmYWxzZVxufVxuZXhwb3J0IGZ1bmN0aW9uIGdldF9lcnJvcih4OnVua25vd24pe1xuICBpZiAoeCBpbnN0YW5jZW9mIEVycm9yKVxuICAgIHJldHVybiB4XG4gIGNvbnN0IHN0ciA9IFN0cmluZyh4KVxuICByZXR1cm4gbmV3IEVycm9yKHN0cilcbn1cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1wYXJhbWV0ZXJzXG5leHBvcnQgZnVuY3Rpb24gaXNfb2JqZWN0PFQgZXh0ZW5kcyBvYmplY3Q9czJ1Pih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFR7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gIFxuICAvLyBBY2NlcHQgb2JqZWN0cyBhbmQgZnVuY3Rpb25zXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuICBcbiAgLy8gRXhjbHVkZSBrbm93biBub24tb2JqZWN0IHR5cGVzXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBTZXQpIHJldHVybiBmYWxzZTtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgTWFwKSByZXR1cm4gZmFsc2U7XG4gIFxuICByZXR1cm4gdHJ1ZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBoYXNfa2V5KG9iajogdW5rbm93biwgazogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICghaXNfb2JqZWN0KG9iaikpIHJldHVybiBmYWxzZVxuICByZXR1cm4gayBpbiBvYmpcbn1cbmV4cG9ydCBmdW5jdGlvbiogb2JqZWN0c19vbmx5KGFyOnVua25vd25bXSl7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBhcilcbiAgICBpZiAoaXNfb2JqZWN0KGl0ZW0pKVxuICAgICAgeWllbGQgaXRlbVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzX2tleXMob2JqOiB1bmtub3duLCBrZXlzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICBpZiAoIWlzX29iamVjdChvYmopKSByZXR1cm4gZmFsc2VcbiAgZm9yIChjb25zdCBrIG9mIGtleXMpIGlmIChrIGluIGtleXMpIHJldHVybiB0cnVlXG4gIHJldHVybiBmYWxzZVxufSBcbmV4cG9ydCB0eXBlIHN0cnNldCA9IFNldDxzdHJpbmc+XG5leHBvcnQgdHlwZSBzMm51bSA9IFJlY29yZDxzdHJpbmcsIG51bWJlcj5cbmV4cG9ydCB0eXBlIHMycyA9IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbmV4cG9ydCB0eXBlIG51bTJudW0gPSBSZWNvcmQ8bnVtYmVyLCBudW1iZXI+XG5cbmV4cG9ydCBmdW5jdGlvbiBwazxULCBLIGV4dGVuZHMga2V5b2YgVD4ob2JqOiBUIHwgdW5kZWZpbmVkLCAuLi5rZXlzOiBLW10pOiBQaWNrPFQsIEs+IHtcbiAgY29uc3QgcmV0OiBSZWNvcmQ8UHJvcGVydHlLZXksdW5rbm93bj4gPSB7fSBcbiAga2V5cy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICByZXRba2V5XSA9IG9iaj8uW2tleV1cbiAgfSlcbiAgcmV0dXJuIHJldCBhcyBQaWNrPFQsIEs+IFxufVxuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2U8VD12b2lkPih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByb21pc2U8VD4geyAvLy90cygyNjc3KVxuICBpZiAoIWlzX29iamVjdCh2YWx1ZSkpXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgY29uc3QgYW5zPXR5cGVvZiAodmFsdWUudGhlbik9PT0nZnVuY3Rpb24nXG4gIHJldHVybiBhbnNcbn1cbmV4cG9ydCB0eXBlIE1heWJlUHJvbWlzZTxUPj1UfFByb21pc2U8VD5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlX21heWJlX3Byb21pc2U8VD4oYTpNYXliZVByb21pc2U8VD4pe1xuICBpZiAoaXNfcHJvbWlzZShhKSlcbiAgICByZXR1cm4gYXdhaXQgYVxuICByZXR1cm4gYVxufVxuICAgICAgXG5leHBvcnQgaW50ZXJmYWNlIFRlc3R7XG4gIGs/OnN0cmluZyxcbiAgdj86QXRvbSxcbiAgZjooKT0+TWF5YmVQcm9taXNlPEF0b20+XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5fdGVzdHMoLi4udGVzdHM6IFRlc3RbXSkge1xuICBsZXQgcGFzc2VkID0gMFxuICBsZXQgZmFpbGVkID0gMFxuICBcbiAgZm9yIChjb25zdCB7ayx2LGZ9IG9mIHRlc3RzKSB7XG4gICAgY29uc3QgZWs9ZnVuY3Rpb24oKXtcbiAgICAgIGlmIChrIT1udWxsKVxuICAgICAgICByZXR1cm4ga1xuICAgICAgY29uc3QgZnN0cj1TdHJpbmcoZilcbiAgICAgIHtcbiAgICAgICAgY29uc3QgbWF0Y2g9ZnN0ci5tYXRjaCgvKFxcKFxcKSA9PiApKC4qKS8pXG4gICAgICAgIGlmIChtYXRjaD8ubGVuZ3RoPT09MylcbiAgICAgICAgICByZXR1cm4gbWF0Y2hbMl1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgY29uc3QgbWF0Y2g9ZnN0ci5tYXRjaCgvZnVuY3Rpb25cXHMoXFx3KykvKVxuICAgICAgICBpZiAobWF0Y2g/Lmxlbmd0aD09PTIpXG4gICAgICAgICAgcmV0dXJuIG1hdGNoWzFdICAgICAgXG4gICAgICB9XG4gICAgICByZXR1cm4gJ2Z1bmN0aW9uJ1xuICAgIH0oKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXQ9ZigpXG4gICAgICBjb25zdCBlZmZlY3RpdmVfdj12Pz90cnVlXG4gICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IHJlc29sdmVfbWF5YmVfcHJvbWlzZShyZXQpXG4gICAgICBpZiAocmVzb2x2ZWQ9PT1lZmZlY3RpdmVfdil7XG4gICAgICAgIGNvbnNvbGUubG9nKGBcdTI3MDUgJHtla306ICR7Z3JlZW59JHtlZmZlY3RpdmVfdn0ke3Jlc2V0fWApXG4gICAgICAgIHBhc3NlZCsrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBcdTI3NEMgJHtla306ZXhwZWN0ZWQgJHt5ZWxsb3d9JHtlZmZlY3RpdmVfdn0ke3Jlc2V0fSwgZ290ICR7cmVkfSR7cmVzb2x2ZWR9JHtyZXNldH1gKVxuICAgICAgICBmYWlsZWQrK1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgXHVEODNEXHVEQ0E1ICR7ZWt9IHRocmV3IGFuIGVycm9yOmAsIGVycilcbiAgICAgIGZhaWxlZCsrXG4gICAgfVxuICB9XG4gIGlmIChmYWlsZWQ9PT0wKVxuICAgIGNvbnNvbGUubG9nKGBcXG5TdW1tYXJ5OiAgYWxsICR7cGFzc2VkfSBwYXNzZWRgKSAgXG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhgXFxuU3VtbWFyeTogICR7ZmFpbGVkfSBmYWlsZWQsICR7cGFzc2VkfSBwYXNzZWRgKSAgXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbW1vblByZWZpeChwYXRoczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBpZiAocGF0aHMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJcIjtcbiAgaWYgKHBhdGhzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHBhdGhzWzBdO1xuXG4gIC8vIFNwbGl0IGVhY2ggcGF0aCBpbnRvIHBhcnRzIChlLmcuLCBieSBcIi9cIiBvciBcIlxcXFxcIilcbiAgY29uc3Qgc3BsaXRQYXRocyA9IHBhdGhzLm1hcChwID0+IHAuc3BsaXQoL1tcXFxcL10rLykpO1xuXG4gIGNvbnN0IGNvbW1vblBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBmaXJzdCA9IHNwbGl0UGF0aHNbMF07XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaXJzdC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhcnQgPSBmaXJzdFtpXTtcbiAgICBpZiAoc3BsaXRQYXRocy5ldmVyeShwID0+IHBbaV0gPT09IHBhcnQpKSB7XG4gICAgICBjb21tb25QYXJ0cy5wdXNoKHBhcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvLyBKb2luIGJhY2sgd2l0aCBcIi9cIiAob3IgdXNlIHBhdGguam9pbiBmb3IgcGxhdGZvcm0tc3BlY2lmaWMgYmVoYXZpb3IpXG4gIHJldHVybiBjb21tb25QYXJ0cy5qb2luKFwiL1wiKTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiBnZXRfbm9kZSgpe1xuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcImdldEZpbGVDb250ZW50cygpIHJlcXVpcmVzIE5vZGUuanNcIik7XG4gIH1cbiAgY29uc3QgcGF0aCA9IGF3YWl0IGltcG9ydChcIm5vZGU6cGF0aFwiKTtcbiAgY29uc3QgZnMgPSBhd2FpdCBpbXBvcnQoXCJub2RlOmZzL3Byb21pc2VzXCIpO1xuICByZXR1cm4ge2ZzLHBhdGh9ICBcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBta2Rpcl93cml0ZV9maWxlKGZpbGVQYXRoOnN0cmluZyxkYXRhOnN0cmluZyxjYWNoZT1mYWxzZSl7XG4gIGNvbnN0IHtwYXRoLGZzfT1hd2FpdCBnZXRfbm9kZSgpXG4gIGNvbnN0IGRpcmVjdG9yeT1wYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xuICB0cnl7XG4gICAgYXdhaXQgZnMubWtkaXIoZGlyZWN0b3J5LHtyZWN1cnNpdmU6dHJ1ZX0pO1xuICAgIGlmIChjYWNoZSl7XG4gICAgICBjb25zdCBleGlzdHM9YXdhaXQgcmVhZF9maWxlKGZpbGVQYXRoKTtcbiAgICAgIGlmIChleGlzdHM9PT1kYXRhKVxuICAgICAgICByZXR1cm5cbiAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblxuICAgIGF3YWl0IGZzLndyaXRlRmlsZShmaWxlUGF0aCxkYXRhKTtcbiAgICBjb25zb2xlLmxvZyhgRmlsZSAnJHtmaWxlUGF0aH0nIGhhcyBiZWVuIHdyaXR0ZW4gc3VjY2Vzc2Z1bGx5LmApO1xuICB9IGNhdGNoIChlcnIpe1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHdyaXRpbmcgZmlsZScsZXJyKVxuICB9XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZF9maWxlKGZpbGVuYW1lOnN0cmluZyl7XG4gIGNvbnN0IHtmc309YXdhaXQgZ2V0X25vZGUoKSAgXG4gIHRyeXtcbiAgICBjb25zdCBhbnM9YXdhaXQgZnMucmVhZEZpbGUoZmlsZW5hbWUpXG4gICAgcmV0dXJuIGFucy50b1N0cmluZygpXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkX2pzb25fb2JqZWN0KGZpbGVuYW1lOnN0cmluZyxvYmplY3RfdHlwZTpzdHJpbmcpe1xuICBjb25zdCB7ZnN9PWF3YWl0IGdldF9ub2RlKClcbiAgdHJ5e1xuICAgIGNvbnN0IGRhdGE9YXdhaXQgZnMucmVhZEZpbGUoZmlsZW5hbWUsIFwidXRmLThcIik7XG4gICAgY29uc3QgYW5zPUpTT04ucGFyc2UoZGF0YSkgYXMgdW5rbm93blxuICAgIGlmICghaXNfb2JqZWN0KGFucykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vdCBhIHZhbGlkICR7b2JqZWN0X3R5cGV9YClcbiAgICByZXR1cm4gYW5zXG4gIH1jYXRjaChleDp1bmtub3duKXtcbiAgICBjb25zb2xlLndhcm4oYCR7ZmlsZW5hbWV9OiR7Z2V0X2Vycm9yKGV4KX0ubWVzc2FnZWApXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5leHBvcnQgZnVuY3Rpb24gaXNfc3RyaW5nX2FycmF5KGE6dW5rbm93bik6YSBpcyBzdHJpbmdbXXtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGEpKVxuICAgIHJldHVybiBmYWxzZVxuICBmb3IgKGNvbnN0IHggb2YgYSlcbiAgICBpZiAodHlwZW9mIHghPT0nc3RyaW5nJylcbiAgICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gdHJ1ZSAgXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzbGVlcChtczogbnVtYmVyKSB7XG4gIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZSh1bmRlZmluZWQpLCBtcyk7XG4gIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VfYXJyYXk8VD4oKTpBcnJheTxUPntcbiAgcmV0dXJuIFtdXG59XG5leHBvcnQgZnVuY3Rpb24gbWFrZV9zZXQ8VD4oKXtcbiAgcmV0dXJuIG5ldyBTZXQ8VD5cbn1cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0X2dldDxUPihvYmo6UmVjb3JkPFByb3BlcnR5S2V5LFQ+LGs6UHJvcGVydHlLZXksbWFrZXI6KCk9PlQpe1xuICBjb25zdCBleGlzdHM9b2JqW2tdXG4gIGlmIChleGlzdHM9PW51bGwpe1xuICAgIG9ialtrXT1tYWtlcigpIFxuICB9XG4gIHJldHVybiBvYmpba11cbn1cbmV4cG9ydCBjbGFzcyBSZXBlYXRlcntcbiAgaXNfcnVubmluZz10cnVlXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBkZWxheT0yMDApe1xuICB9XG4gIHByaXZhdGUgbG9vcD1hc3luYyAoZjooKT0+TWF5YmVQcm9taXNlPHZvaWQ+KT0+e1xuICAgIHdoaWxlICh0aGlzLmlzX3J1bm5pbmcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGYoKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yOlwiLCBlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIHdhaXQgYmVmb3JlIG5leHQgcnVuXG4gICAgICBhd2FpdCBzbGVlcCh0aGlzLmRlbGF5KVxuICAgIH0gICAgXG4gIH1cbiAgYXN5bmMgcmVwZWF0KGY6KCk9Pk1heWJlUHJvbWlzZTx2b2lkPil7ICBcbiAgICBhd2FpdCBmKCk7XG4gICAgdm9pZCB0aGlzLmxvb3AoZilcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHRvZ2dsZV9zZXQ8VD4oc2V0OlNldDxUPix2YWx1ZTpUKXtcbiAgaWYgKHNldC5oYXModmFsdWUpKSB7XG4gICAgc2V0LmRlbGV0ZSh2YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgc2V0LmFkZCh2YWx1ZSk7XG4gIH1cbn0iLCAiaW1wb3J0ICB0eXBlIHsgTWF5YmVQcm9taXNlfSBmcm9tICdAeWlnYWwvYmFzZV90eXBlcydcbmltcG9ydCB7Z2V0X3BhcmVudF9ieV9jbGFzc30gZnJvbSAnLi9kb21fdXRpbHMuanMnXG5leHBvcnQgaW50ZXJmYWNlIFRyZWVOb2Rle1xuICB0eXBlICAgICAgICAgICAgICAgICAgIDogJ2l0ZW0nfCdmb2xkZXInICAgLy9pcyB0aGlzIG5lZWRlZD9cbiAgbGFiZWwgICAgICAgICAgICAgICAgICA6IHN0cmluZyxcbiAgaWQgICAgICAgICAgICAgICAgICAgICA6IHN0cmluZztcbiAgaWNvbiAgICAgICAgICAgICAgICAgICA6IHN0cmluZ1xuICBjbGFzc05hbWUgICAgICAgICAgICAgIDogc3RyaW5nfHVuZGVmaW5lZFxuICBkZXNjcmlwdGlvbiAgICAgICAgICAgPzogc3RyaW5nXG4gIGNvbW1hbmRzICAgICAgICAgICAgICAgOiBzdHJpbmdbXSAgICAgICAgICAvL2hhcmQgY29kZGVkIGNvbW1tYW5kOiBjaGVja2JveCBjbGlja2VkXG4gIGNoaWxkcmVuICAgICAgICAgICAgICAgOiBUcmVlTm9kZVtdXG4gIGljb25fdmVyc2lvbiAgICAgICAgICAgOiBudW1iZXIsXG4gIHRvZ2dsZXMgICAgICAgICAgICAgICAgOiBSZWNvcmQ8c3RyaW5nLGJvb2xlYW58dW5kZWZpbmVkPlxuICB0YWdzOiAgICAgICAgICAgICAgICAgIHN0cmluZ1tdXG4gIC8vY2hlY2tib3hfc3RhdGUgICAgICAgICA6IGJvb2xlYW58dW5kZWZpbmVkXG4gIC8vZGVmYXVsdF9jaGVja2JveF9zdGF0ZSA6IGJvb2xlYW58dW5kZWZpbmVkXG59XG5leHBvcnQgaW50ZXJmYWNlIFRyZWVEYXRhUHJvdmlkZXJ7XG4gIHRvZ2dsZV9vcmRlcjpBcnJheTxzdHJpbmc+XG4gIC8vY29udmVydDogKHJvb3Q6dW5rbm93bik9PlRyZWVOb2RlXG4gIGNvbW1hbmQ6KGlkOnN0cmluZyxjb21tYW5kX25hbWU6c3RyaW5nKT0+TWF5YmVQcm9taXNlPHZvaWQ+XG4gIHNlbGVjdGVkOihpZDpzdHJpbmcpPT5NYXliZVByb21pc2U8dm9pZD5cbiAgLy9pY29uc19odG1sOnN0cmluZ1xufVxuXG5mdW5jdGlvbiBnZXRfcHJldl9zZWxlY3RlZChzZWxlY3RlZDpIVE1MRWxlbWVudCl7XG4gIGlmIChzZWxlY3RlZD09bnVsbClcbiAgICByZXR1cm4gbnVsbCAvLyBpIGxpa2UgdW5kZWZpbmVkIGJldHRlciBidXQgd2FudCB0byBoYXZlIHRoZSBcbiAgbGV0IGN1cjpDaGlsZE5vZGV8bnVsbD1zZWxlY3RlZFxuICB3aGlsZShjdXIhPW51bGwpe1xuICAgIGN1cj1jdXIucHJldmlvdXNTaWJsaW5nXG4gICAgaWYgKGN1ciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KVxuICAgICAgcmV0dXJuIGN1clxuICB9XG4gIHJldHVybiBudWxsXG59XG5mdW5jdGlvbiBnZXRfbmV4dF9zZWxlY3RlZChzZWxlY3RlZDpIVE1MRWxlbWVudCl7XG4gIGlmIChzZWxlY3RlZD09bnVsbClcbiAgICByZXR1cm4gbnVsbCAvLyBpIGxpa2UgdW5kZWZpbmVkIGJldHRlciBidXQgd2FudCB0byBoYXZlIHRoZSBcbiAgbGV0IGN1cjpDaGlsZE5vZGV8bnVsbD1zZWxlY3RlZFxuICB3aGlsZShjdXIhPW51bGwpe1xuICAgIGN1cj1jdXIubmV4dFNpYmxpbmdcbiAgICBpZiAoY3VyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpXG4gICAgICByZXR1cm4gY3VyXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cbi8qZnVuY3Rpb24gaW5kZXhfZm9sZGVyKHJvb3Q6VHJlZU5vZGUpe1xuICBjb25zdCBhbnM6czJ0PFRyZWVOb2RlPj17fVxuICBmdW5jdGlvbiBmKG5vZGU6VHJlZU5vZGUpe1xuICAgIGFuc1tub2RlLmlkXT1ub2RlXG4gICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKGYpXG4gIH1cbiAgZihyb290KVxuICByZXR1cm4gYW5zXG59Ki9cbmZ1bmN0aW9uIGNhbGNfc3VtbWFyeShub2RlOlRyZWVOb2RlKTpzdHJpbmd7XG4gIGNvbnN0IGlnbm9yZT1bJ2ljb25fdmVyc2lvbicsJ2ljb24nLCd0b2dnbGVzJywnY2xhc3NOYW1lJ11cbiAgZnVuY3Rpb24gcmVwbGFjZXIoazpzdHJpbmcsdjp1bmtub3duKXtcbiAgICBpZiAoaWdub3JlLmluY2x1ZGVzKGspKVxuICAgICAgcmV0dXJuICcnXG4gICAgcmV0dXJuIHZcbiAgfVxuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobm9kZSxyZXBsYWNlciwyKS8vXHUyNkEwIEVycm9yIChUUzI3NjkpXG59XG5leHBvcnQgZnVuY3Rpb24gbmVlZF9mdWxsX3JlbmRlcihyb290OlRyZWVOb2RlLG9sZF9yb290OlRyZWVOb2RlfHVuZGVmaW5lZCl7XG4gIGlmIChvbGRfcm9vdD09bnVsbClcbiAgICByZXR1cm4gdHJ1ZVxuICBjb25zdCBzdW1tYXJ5PWNhbGNfc3VtbWFyeShyb290KVxuICBjb25zdCBvbGRfc3VtbWFyeT1jYWxjX3N1bW1hcnkob2xkX3Jvb3QpXG4gIHJldHVybiAob2xkX3N1bW1hcnkhPT1zdW1tYXJ5KVxufVxuZnVuY3Rpb24gZ2V0X2NoaWxkcmVuKHNlbGVjdGVkOkhUTUxFbGVtZW50KXtcbiAgaWYgKHNlbGVjdGVkLmNsYXNzTGlzdC5jb250YWlucygnY29sbGFwc2VkJykpXG4gICAgcmV0dXJuIG51bGxcbiAgY29uc3QgYW5zPSBzZWxlY3RlZC5xdWVyeVNlbGVjdG9yKCcuY2hpbGRyZW4nKS8vYnkgdGhvZXJubSBpcyBhbiBIVE1MRWxlbWVudFxuICBpZiAoYW5zIT1udWxsKVxuICAgIHJldHVybiBhbnMgYXMgSFRNTEVsZW1lbnQgXG5cbn1cbmZ1bmN0aW9uIGdldExhc3RFbGVtZW50Q2hpbGQocGFyZW50OiBIVE1MRWxlbWVudCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gIC8vIEl0ZXJhdGUgYmFja3dhcmRzIHRocm91Z2ggY2hpbGQgbm9kZXNcbiAgZm9yIChsZXQgaSA9IHBhcmVudC5jaGlsZE5vZGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgY29uc3Qgbm9kZSA9IHBhcmVudC5jaGlsZE5vZGVzW2ldO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbmZ1bmN0aW9uIGdldEZpcnN0RWxlbWVudENoaWxkKHBhcmVudDogSFRNTEVsZW1lbnQpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICBmb3IgKGxldCBpID0gMDtpPHBhcmVudC5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgbm9kZSA9IHBhcmVudC5jaGlsZE5vZGVzW2ldO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbmZ1bmN0aW9uIGdldF9sYXN0X3Zpc2libGUoc2VsZWN0ZWQ6SFRNTEVsZW1lbnQpe1xuICBjb25zdCBjaGlsZHJlbl9kaXY9Z2V0X2NoaWxkcmVuKHNlbGVjdGVkKVxuICBpZiAoY2hpbGRyZW5fZGl2PT1udWxsKVxuICAgIHJldHVybiBzZWxlY3RlZFxuICBjb25zdCBsYXN0X2NoaWxkPWdldExhc3RFbGVtZW50Q2hpbGQoY2hpbGRyZW5fZGl2KVxuICBpZiAobGFzdF9jaGlsZD09bnVsbClcbiAgICByZXR1cm4gc2VsZWN0ZWRcbiAgcmV0dXJuIGdldF9sYXN0X3Zpc2libGUobGFzdF9jaGlsZClcbn1cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50X2Zvcl91cF9hcnJvdyhzZWxlY3RlZDpIVE1MRWxlbWVudCl7XG4gIGNvbnN0IGFucz1nZXRfcHJldl9zZWxlY3RlZChzZWxlY3RlZClcbiAgaWYgKGFucz09bnVsbClcbiAgICByZXR1cm4gZ2V0X3BhcmVudF9ieV9jbGFzcyhzZWxlY3RlZC5wYXJlbnRFbGVtZW50LCd0cmVlX2ZvbGRlcicpXG4gIHJldHVybiBnZXRfbGFzdF92aXNpYmxlKGFucylcbn1cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50X2Zvcl9kb3duX2Fycm93KHNlbGVjdGVkOkhUTUxFbGVtZW50KXtcbiAgY29uc3QgY2hpbGRyZW5fZGl2PWdldF9jaGlsZHJlbihzZWxlY3RlZClcbiAgaWYgKGNoaWxkcmVuX2RpdiE9bnVsbCl7XG4gICAgY29uc3QgZmlyc3Q9Z2V0Rmlyc3RFbGVtZW50Q2hpbGQoY2hpbGRyZW5fZGl2KVxuICAgIGlmIChmaXJzdCE9PW51bGwpXG4gICAgICByZXR1cm4gZmlyc3RcbiAgfVxuICBjb25zdCBhbnM9Z2V0X25leHRfc2VsZWN0ZWQoc2VsZWN0ZWQpXG4gIGlmIChhbnMhPW51bGwpXG4gICAgcmV0dXJuIGFuc1xuICBsZXQgY3VyPXNlbGVjdGVkXG4gIHdoaWxlKHRydWUpe1xuICAgIGNvbnN0IHBhcmVudD1nZXRfcGFyZW50X2J5X2NsYXNzKGN1ci5wYXJlbnRFbGVtZW50LCd0cmVlX2ZvbGRlcicpXG4gICAgaWYgKCEocGFyZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuICAgICAgcmV0dXJuIG51bGxcbiAgICBjb25zdCBhbnM9Z2V0X25leHRfc2VsZWN0ZWQocGFyZW50KVxuICAgIGlmIChhbnMhPW51bGwpXG4gICAgICByZXR1cm4gYW5zXG4gICAgY3VyPXBhcmVudFxuICB9XG59IiwgImltcG9ydCAgeyB0eXBlIHMycyx0b2dnbGVfc2V0fSBmcm9tICdAeWlnYWwvYmFzZV90eXBlcydcbmltcG9ydCB7Z2V0X3BhcmVudF9ieV9jbGFzcyxjcmVhdGVfZWxlbWVudCxkaXZzLHVwZGF0ZV9jbGFzc19uYW1lLHVwZGF0ZV9jaGlsZF9odG1sfSBmcm9tICcuL2RvbV91dGlscy5qcydcbmltcG9ydCB7XG4gIHR5cGUgVHJlZU5vZGUsXG4gIHR5cGUgVHJlZURhdGFQcm92aWRlcixcbiAgZWxlbWVudF9mb3JfdXBfYXJyb3csXG4gIGVsZW1lbnRfZm9yX2Rvd25fYXJyb3csXG4gIG5lZWRfZnVsbF9yZW5kZXJcbn1mcm9tICcuL3RyZWVfaW50ZXJuYWxzLmpzJ1xuZXhwb3J0IHR5cGUge1RyZWVEYXRhUHJvdmlkZXIsVHJlZU5vZGV9XG5leHBvcnQgY2xhc3MgVHJlZUNvbnRyb2x7XG4gIC8vcHJpdmF0ZSByb290OnVua25vd25cbiAgcHJpdmF0ZSBjb2xsYXBzZWQ9bmV3IFNldDxzdHJpbmc+KClcbiAgcHJpdmF0ZSBzZWxlY3RlZF9pZD0nJ1xuICBwcml2YXRlIGNvbnZlcnRlZDpUcmVlTm9kZXx1bmRlZmluZWRcbiAgcHJpdmF0ZSBjYWxjX25vZGVfY2xhc3Mobm9kZTpUcmVlTm9kZSl7XG4gICAgY29uc3Qge2lkLHR5cGUsdG9nZ2xlc309bm9kZSAgICBcbiAgICBjb25zdCBhbnM9bmV3IFNldDxzdHJpbmc+KFtgdHJlZV8ke3R5cGV9YF0pXG4gICAgZm9yIChjb25zdCBrIG9mIHRoaXMucHJvdmlkZXIudG9nZ2xlX29yZGVyKXsgLy9sZWF2aW5nIGl0IGhlcmUgYmVjYXVzZSBpIG15IHdhbnQgdG8gY2hhbmdlIHRoZSBzdHlsaW5nIG9mIHRoZSB0cmVlIGxpbmUgYmFzZWQgb24gd2F0Y2ggc3RhdGUuIGJ1dCBjYW5jbGVkIHRoZSBjc3MgdGhhdCBzdXBwb3J0cyBpdFxuICAgICAgY29uc3QgY2xzPWAke2t9XyR7dG9nZ2xlc1trXX1gXG4gICAgICBhbnMuYWRkKGNscylcbiAgICB9IFxuICAgIGlmICh0aGlzLnNlbGVjdGVkX2lkPT09aWQpXG4gICAgICBhbnMuYWRkKCdzZWxlY3RlZCcpXG4gICAgaWYgKHRoaXMuY29sbGFwc2VkLmhhcyhpZCkpXG4gICAgICBhbnMuYWRkKCdjb2xsYXBzZWQnKVxuICAgIHJldHVybiBbLi4uYW5zXS5qb2luKCcgJylcbiAgfVxuICBvbl9pbnRlcnZhbCgpe1xuICAgIGNvbnN0IGY9KGE6VHJlZU5vZGUpPT57XG4gICAgICBjb25zdCB7aWQsY2hpbGRyZW59PWFcbiAgICAgIGNvbnN0IG5ld19jbGFzcz10aGlzLmNhbGNfbm9kZV9jbGFzcyhhKVxuICAgICAgdXBkYXRlX2NsYXNzX25hbWUodGhpcy5wYXJlbnQsYCMke2lkfWAsbmV3X2NsYXNzKVxuICAgICAgY2hpbGRyZW4ubWFwKGYpXG4gICAgfVxuICAgIGlmICh0aGlzLmNvbnZlcnRlZClcbiAgICAgIGYodGhpcy5jb252ZXJ0ZWQpXG4gICAgZm9yIChjb25zdCB0b2dnbGUgb2YgIHRoaXMucHJvdmlkZXIudG9nZ2xlX29yZGVyKXtcbiAgICAgIGZvciAoY29uc3Qgc3RhdGUgb2YgW3RydWUsZmFsc2UsdW5kZWZpbmVkXSl7XG4gICAgICAgIGNvbnN0IHNlbGVjdG9yPWAuJHt0b2dnbGV9XyR7c3RhdGV9Pi5sYWJlbF9yb3cgIyR7dG9nZ2xlfS50b2dnbGVfaWNvbmBcbiAgICAgICAgY29uc3QgaWNvbl9uYW1lPWAke3RvZ2dsZX1fJHtzdGF0ZX1gXG4gICAgICAgIHVwZGF0ZV9jaGlsZF9odG1sKHRoaXMucGFyZW50LHNlbGVjdG9yLHRoaXMuaWNvbnNbaWNvbl9uYW1lXT8/JycpXG4gICAgICB9XG4gICAgfVxuICAgIC8vdXBkYXRlX2NoaWxkX2h0bWwodGhpcy5wYXJlbnQsXCIubGFiZWxfcm93IC50cmVlX2NoZWNrYm94XCIsY2hlY2tfc3ZnKVxuICAgIC8vdXBkYXRlX2NoaWxkX2h0bWwodGhpcy5wYXJlbnQsXCIuY2hrX3VuY2hlY2tlZD4ubGFiZWxfcm93IC50cmVlX2NoZWNrYm94XCIsJycpXG4gIH1cbiAgLy9jb2xsYXBzZWRfc2V0OlNldDxzdHJpbmc+PW5ldyBTZXQoKVxuICBwcml2YXRlIGNyZWF0ZV9ub2RlX2VsZW1lbnQobm9kZTpUcmVlTm9kZSxtYXJnaW46bnVtYmVyLHBhcmVudD86SFRNTEVsZW1lbnQpe1xuICAgIC8vY29uc3Qge2ljb25zfT10aGlzXG4gICAgY29uc3Qge3R5cGUsaWQsZGVzY3JpcHRpb24sbGFiZWwsdGFnc309bm9kZVxuICAgIGNvbnN0IGNoaWxkcmVuPSh0eXBlPT09J2ZvbGRlcicpP2A8ZGl2IGNsYXNzPWNoaWxkcmVuPjwvZGl2PmA6JydcbiAgICAvL2NvbnN0ICBjb21tYW5kc19pY29ucz1jb21tYW5kcy5tYXAoeD0+YDxkaXYgY2xhc3M9Y29tbWFuZF9pY29uIGlkPSR7eH0+JHtpY29uc1t4XX08L2Rpdj5gKS5qb2luKCcnKVxuICAgIGNvbnN0IG5vZGVfY2xhc3M9dGhpcy5jYWxjX25vZGVfY2xhc3Mobm9kZSlcbiAgICBjb25zdCB2dGFncz10YWdzLm1hcCh4PT5gPGRpdiBjbGFzcz10YWc+JHt4fTwvZGl2PmApLmpvaW4oJycpXG4gICAgY29uc3QgYW5zPSBjcmVhdGVfZWxlbWVudChgIFxuICA8ZGl2ICBjbGFzcz1cIiR7bm9kZV9jbGFzc31cIiBpZD1cIiR7aWR9XCIgPlxuICAgIDxkaXYgIGNsYXNzPVwibGFiZWxfcm93XCI+XG4gICAgICA8ZGl2IGNsYXNzPXRvZ2dsZXNfaWNvbnM+PC9kaXY+XG4gICAgICA8ZGl2ICBjbGFzcz1zaGlmdGVyIHN0eWxlPSdtYXJnaW4tbGVmdDoke21hcmdpbn1weCc+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJpY29uXCI+IDwvZGl2PlxuICAgICAgICAke2RpdnMoe2xhYmVsLHZ0YWdzLGRlc2NyaXB0aW9ufSl9XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9Y29tbWFuZHNfaWNvbnM+PC9kaXY+XG4gICAgPC9kaXY+XG4gICAgJHtjaGlsZHJlbn1cbiAgPC9kaXY+YCxwYXJlbnQpIFxuICAgIHJldHVybiBhbnNcbiAgfVxuICAvL29uX3NlbGVjdGVkX2NoYW5nZWQ6KGE6c3RyaW5nKT0+TWF5YmVQcm9taXNlPHZvaWQ+PShhOnN0cmluZyk9PnVuZGVmaW5lZFxuICBwcml2YXRlIGFzeW5jIHNldF9zZWxlY3RlZChpZDpzdHJpbmcpe1xuICAgIHRoaXMuc2VsZWN0ZWRfaWQ9aWRcbiAgICBhd2FpdCB0aGlzLnByb3ZpZGVyLnNlbGVjdGVkKGlkKVxuICB9XG5cblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHBhcmVudDpIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIHByb3ZpZGVyOlRyZWVEYXRhUHJvdmlkZXIsXG4gICAgcHJpdmF0ZSBpY29uczpzMnNcbiAgKXtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLChldnQpPT57XG4gICAgICBpZiAoIShldnQudGFyZ2V0IGluc3RhbmNlb2YgRWxlbWVudCkpXG4gICAgICAgIHJldHVyblxuICAgICAgcGFyZW50LnRhYkluZGV4ID0gMDtcbiAgICAgIHBhcmVudC5mb2N1cygpO1xuICAgICAgY29uc3QgY2xpY2tlZD1nZXRfcGFyZW50X2J5X2NsYXNzKGV2dC50YXJnZXQsJ2xhYmVsX3JvdycpPy5wYXJlbnRFbGVtZW50XG4gICAgICBpZiAoY2xpY2tlZD09bnVsbClcbiAgICAgICAgcmV0dXJuXG4gICAgICBjb25zdCB7aWR9PWNsaWNrZWRcbiAgICAgIGlmIChjbGlja2VkLmNsYXNzTGlzdC5jb250YWlucygndHJlZV9mb2xkZXInKSkgLy9pZiBjbGlja2VkIGNvbW1hbmQgdGhhbiBkb24gIGNoYW5nZSBjb2xscGFzZWQgc3RhdHVzIGJlY2F1c2UgZHVhbCBhY3Rpb24gaXMgYW5ub2luZ1xuICAgICAgICB0b2dnbGVfc2V0KHRoaXMuY29sbGFwc2VkLGlkKVxuICAgICAgdm9pZCB0aGlzLnNldF9zZWxlY3RlZChpZClcbiAgICB9KVxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywoZXZ0KT0+e1xuICAgICAgaWYgKCEoZXZ0LnRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSlcbiAgICAgICAgcmV0dXJuXG4gICAgICBldnQucHJldmVudERlZmF1bHQoKTsgLy8gc3RvcHMgZGVmYXVsdCBicm93c2VyIGFjdGlvblxuICAgICAgY29uc29sZS5sb2coZXZ0LmtleSlcbiAgICAgIGNvbnN0IHNlbGVjdGVkPXBhcmVudC5xdWVyeVNlbGVjdG9yKCcuc2VsZWN0ZWQnKVxuICAgICAgaWYgKCEoc2VsZWN0ZWQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICAgIHJldHVyblxuICAgICAgc3dpdGNoKGV2dC5rZXkpe1xuICAgICAgICBjYXNlICdBcnJvd1VwJzp7XG4gICAgICAgICAgY29uc3QgcHJldj1lbGVtZW50X2Zvcl91cF9hcnJvdyhzZWxlY3RlZClcbiAgICAgICAgICBpZiAoISAocHJldiBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIHZvaWQgdGhpcy5zZXRfc2VsZWN0ZWQocHJldi5pZCkgICAgICAgICBcbiAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAnQXJyb3dEb3duJzp7XG4gICAgICAgICAgY29uc3QgcHJldj1lbGVtZW50X2Zvcl9kb3duX2Fycm93KHNlbGVjdGVkKVxuICAgICAgICAgIGlmIChwcmV2PT1udWxsKVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgdm9pZCB0aGlzLnNldF9zZWxlY3RlZChwcmV2LmlkKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAnQXJyb3dSaWdodCc6XG4gICAgICAgICAgdGhpcy5jb2xsYXBzZWQuZGVsZXRlKHRoaXMuc2VsZWN0ZWRfaWQpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnQXJyb3dMZWZ0JzpcbiAgICAgICAgICB0aGlzLmNvbGxhcHNlZC5hZGQodGhpcy5zZWxlY3RlZF9pZClcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdFbnRlcic6ICAgICAgICAgIFxuICAgICAgICBjYXNlICcgJzpcbiAgICAgICAgICB0b2dnbGVfc2V0KHRoaXMuY29sbGFwc2VkLHRoaXMuc2VsZWN0ZWRfaWQpXG4gICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9KSAgICBcbiAgfVxuICBwcml2YXRlIGNyZWF0ZV9ub2RlKHBhcmVudDpIVE1MRWxlbWVudCxub2RlOlRyZWVOb2RlLGRlcHRoOm51bWJlcil7IC8vdG9kbzogY29tcGFyZSB0byBsYXN0IGJ5IGlkIHRvIGFkZCBjaGFuZ2UgYW5pbWF0aW9uP1xuICAgIGNvbnN0IGNoaWxkcmVuX2VsPSgoKT0+e1xuICAgICAgaWYgKGRlcHRoPT09MClcbiAgICAgICAgcmV0dXJuIGNyZWF0ZV9lbGVtZW50KCc8ZGl2IGNsYXNzPWNoaWxkcmVuPjwvZGl2PicscGFyZW50KVxuICAgICAgY29uc3QgbmV3X3BhcmVudD10aGlzLmNyZWF0ZV9ub2RlX2VsZW1lbnQobm9kZSxkZXB0aCoyMCsxNisxNixwYXJlbnQpXG4gICAgICByZXR1cm4gbmV3X3BhcmVudC5xdWVyeVNlbGVjdG9yKCcuY2hpbGRyZW4nKSAvL3JldHVybiB2YWx1ZSBtaWdodCBiZSBudWxsIGZvciBpdGVtIG5vZGUgIFxuICAgIH0pKClcbiAgICBpZiAoY2hpbGRyZW5fZWw9PW51bGwpe1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGZvciAoY29uc3QgeCBvZiBub2RlLmNoaWxkcmVuKXtcbiAgICAgIHRoaXMuY3JlYXRlX25vZGUoY2hpbGRyZW5fZWwgYXMgSFRNTEVsZW1lbnQseCxkZXB0aCsxKVxuICAgIH1cbiAgfVxuICBwcml2YXRlIGJpZ19yZW5kZXIoY29udmVydGVkOlRyZWVOb2RlKXtcbiAgICB0aGlzLnBhcmVudC5pbm5lckhUTUwgPSAnJztcbiAgICB0aGlzLmNyZWF0ZV9ub2RlKHRoaXMucGFyZW50LGNvbnZlcnRlZCwwKSAvL3RvZG8gcGFzcyB0aGUgbGFzdCBjb252ZXJ0ZWQgc28gY2FuIGRvIGNoYW5nZS9jYXRlIGFuaW1hdGlvbiAgICBcbiAgfVxuICBvbl9kYXRhKGNvbnZlcnRlZDpUcmVlTm9kZSl7XG4gICAgLy9jb25zdCBjb252ZXJ0ZWQ9dGhpcy5wcm92aWRlci5jb252ZXJ0KHJvb3QpXG4gICAgLy90aGlzLnJvb3Q9cm9vdFxuICAgIGlmIChuZWVkX2Z1bGxfcmVuZGVyKGNvbnZlcnRlZCx0aGlzLmNvbnZlcnRlZCkpXG4gICAgICB0aGlzLmJpZ19yZW5kZXIoY29udmVydGVkKVxuICAgIHRoaXMuY29udmVydGVkPWNvbnZlcnRlZFxuICB9XG59IiwgIi8vIFRoaXMgZmlsZSB3YXMgZ2VuZXJhdGVkLiBEbyBub3QgbW9kaWZ5IG1hbnVhbGx5IVxudmFyIGFzdHJhbElkZW50aWZpZXJDb2RlcyA9IFs1MDksIDAsIDIyNywgMCwgMTUwLCA0LCAyOTQsIDksIDEzNjgsIDIsIDIsIDEsIDYsIDMsIDQxLCAyLCA1LCAwLCAxNjYsIDEsIDU3NCwgMywgOSwgOSwgNywgOSwgMzIsIDQsIDMxOCwgMSwgNzgsIDUsIDcxLCAxMCwgNTAsIDMsIDEyMywgMiwgNTQsIDE0LCAzMiwgMTAsIDMsIDEsIDExLCAzLCA0NiwgMTAsIDgsIDAsIDQ2LCA5LCA3LCAyLCAzNywgMTMsIDIsIDksIDYsIDEsIDQ1LCAwLCAxMywgMiwgNDksIDEzLCA5LCAzLCAyLCAxMSwgODMsIDExLCA3LCAwLCAzLCAwLCAxNTgsIDExLCA2LCA5LCA3LCAzLCA1NiwgMSwgMiwgNiwgMywgMSwgMywgMiwgMTAsIDAsIDExLCAxLCAzLCA2LCA0LCA0LCA2OCwgOCwgMiwgMCwgMywgMCwgMiwgMywgMiwgNCwgMiwgMCwgMTUsIDEsIDgzLCAxNywgMTAsIDksIDUsIDAsIDgyLCAxOSwgMTMsIDksIDIxNCwgNiwgMywgOCwgMjgsIDEsIDgzLCAxNiwgMTYsIDksIDgyLCAxMiwgOSwgOSwgNywgMTksIDU4LCAxNCwgNSwgOSwgMjQzLCAxNCwgMTY2LCA5LCA3MSwgNSwgMiwgMSwgMywgMywgMiwgMCwgMiwgMSwgMTMsIDksIDEyMCwgNiwgMywgNiwgNCwgMCwgMjksIDksIDQxLCA2LCAyLCAzLCA5LCAwLCAxMCwgMTAsIDQ3LCAxNSwgMTk5LCA3LCAxMzcsIDksIDU0LCA3LCAyLCA3LCAxNywgOSwgNTcsIDIxLCAyLCAxMywgMTIzLCA1LCA0LCAwLCAyLCAxLCAyLCA2LCAyLCAwLCA5LCA5LCA0OSwgNCwgMiwgMSwgMiwgNCwgOSwgOSwgNTUsIDksIDI2NiwgMywgMTAsIDEsIDIsIDAsIDQ5LCA2LCA0LCA0LCAxNCwgMTAsIDUzNTAsIDAsIDcsIDE0LCAxMTQ2NSwgMjcsIDIzNDMsIDksIDg3LCA5LCAzOSwgNCwgNjAsIDYsIDI2LCA5LCA1MzUsIDksIDQ3MCwgMCwgMiwgNTQsIDgsIDMsIDgyLCAwLCAxMiwgMSwgMTk2MjgsIDEsIDQxNzgsIDksIDUxOSwgNDUsIDMsIDIyLCA1NDMsIDQsIDQsIDUsIDksIDcsIDMsIDYsIDMxLCAzLCAxNDksIDIsIDE0MTgsIDQ5LCA1MTMsIDU0LCA1LCA0OSwgOSwgMCwgMTUsIDAsIDIzLCA0LCAyLCAxNCwgMTM2MSwgNiwgMiwgMTYsIDMsIDYsIDIsIDEsIDIsIDQsIDEwMSwgMCwgMTYxLCA2LCAxMCwgOSwgMzU3LCAwLCA2MiwgMTMsIDQ5OSwgMTMsIDI0NSwgMSwgMiwgOSwgMjMzLCAwLCAzLCAwLCA4LCAxLCA2LCAwLCA0NzUsIDYsIDExMCwgNiwgNiwgOSwgNDc1OSwgOSwgNzg3NzE5LCAyMzldO1xuXG4vLyBUaGlzIGZpbGUgd2FzIGdlbmVyYXRlZC4gRG8gbm90IG1vZGlmeSBtYW51YWxseSFcbnZhciBhc3RyYWxJZGVudGlmaWVyU3RhcnRDb2RlcyA9IFswLCAxMSwgMiwgMjUsIDIsIDE4LCAyLCAxLCAyLCAxNCwgMywgMTMsIDM1LCAxMjIsIDcwLCA1MiwgMjY4LCAyOCwgNCwgNDgsIDQ4LCAzMSwgMTQsIDI5LCA2LCAzNywgMTEsIDI5LCAzLCAzNSwgNSwgNywgMiwgNCwgNDMsIDE1NywgMTksIDM1LCA1LCAzNSwgNSwgMzksIDksIDUxLCAxMywgMTAsIDIsIDE0LCAyLCA2LCAyLCAxLCAyLCAxMCwgMiwgMTQsIDIsIDYsIDIsIDEsIDQsIDUxLCAxMywgMzEwLCAxMCwgMjEsIDExLCA3LCAyNSwgNSwgMiwgNDEsIDIsIDgsIDcwLCA1LCAzLCAwLCAyLCA0MywgMiwgMSwgNCwgMCwgMywgMjIsIDExLCAyMiwgMTAsIDMwLCA2NiwgMTgsIDIsIDEsIDExLCAyMSwgMTEsIDI1LCA3LCAyNSwgMzksIDU1LCA3LCAxLCA2NSwgMCwgMTYsIDMsIDIsIDIsIDIsIDI4LCA0MywgMjgsIDQsIDI4LCAzNiwgNywgMiwgMjcsIDI4LCA1MywgMTEsIDIxLCAxMSwgMTgsIDE0LCAxNywgMTExLCA3MiwgNTYsIDUwLCAxNCwgNTAsIDE0LCAzNSwgMzksIDI3LCAxMCwgMjIsIDI1MSwgNDEsIDcsIDEsIDE3LCA1LCA1NywgMjgsIDExLCAwLCA5LCAyMSwgNDMsIDE3LCA0NywgMjAsIDI4LCAyMiwgMTMsIDUyLCA1OCwgMSwgMywgMCwgMTQsIDQ0LCAzMywgMjQsIDI3LCAzNSwgMzAsIDAsIDMsIDAsIDksIDM0LCA0LCAwLCAxMywgNDcsIDE1LCAzLCAyMiwgMCwgMiwgMCwgMzYsIDE3LCAyLCAyNCwgMjAsIDEsIDY0LCA2LCAyLCAwLCAyLCAzLCAyLCAxNCwgMiwgOSwgOCwgNDYsIDM5LCA3LCAzLCAxLCAzLCAyMSwgMiwgNiwgMiwgMSwgMiwgNCwgNCwgMCwgMTksIDAsIDEzLCA0LCAzMSwgOSwgMiwgMCwgMywgMCwgMiwgMzcsIDIsIDAsIDI2LCAwLCAyLCAwLCA0NSwgNTIsIDE5LCAzLCAyMSwgMiwgMzEsIDQ3LCAyMSwgMSwgMiwgMCwgMTg1LCA0NiwgNDIsIDMsIDM3LCA0NywgMjEsIDAsIDYwLCA0MiwgMTQsIDAsIDcyLCAyNiwgMzgsIDYsIDE4NiwgNDMsIDExNywgNjMsIDMyLCA3LCAzLCAwLCAzLCA3LCAyLCAxLCAyLCAyMywgMTYsIDAsIDIsIDAsIDk1LCA3LCAzLCAzOCwgMTcsIDAsIDIsIDAsIDI5LCAwLCAxMSwgMzksIDgsIDAsIDIyLCAwLCAxMiwgNDUsIDIwLCAwLCAxOSwgNzIsIDIwMCwgMzIsIDMyLCA4LCAyLCAzNiwgMTgsIDAsIDUwLCAyOSwgMTEzLCA2LCAyLCAxLCAyLCAzNywgMjIsIDAsIDI2LCA1LCAyLCAxLCAyLCAzMSwgMTUsIDAsIDI0LCA0MywgMjYxLCAxOCwgMTYsIDAsIDIsIDEyLCAyLCAzMywgMTI1LCAwLCA4MCwgOTIxLCAxMDMsIDExMCwgMTgsIDE5NSwgMjYzNywgOTYsIDE2LCAxMDcxLCAxOCwgNSwgMjYsIDM5OTQsIDYsIDU4MiwgNjg0MiwgMjksIDE3NjMsIDU2OCwgOCwgMzAsIDE4LCA3OCwgMTgsIDI5LCAxOSwgNDcsIDE3LCAzLCAzMiwgMjAsIDYsIDE4LCA0MzMsIDQ0LCAyMTIsIDYzLCAzMywgMjQsIDMsIDI0LCA0NSwgNzQsIDYsIDAsIDY3LCAxMiwgNjUsIDEsIDIsIDAsIDE1LCA0LCAxMCwgNzM4MSwgNDIsIDMxLCA5OCwgMTE0LCA4NzAyLCAzLCAyLCA2LCAyLCAxLCAyLCAyOTAsIDE2LCAwLCAzMCwgMiwgMywgMCwgMTUsIDMsIDksIDM5NSwgMjMwOSwgMTA2LCA2LCAxMiwgNCwgOCwgOCwgOSwgNTk5MSwgODQsIDIsIDcwLCAyLCAxLCAzLCAwLCAzLCAxLCAzLCAzLCAyLCAxMSwgMiwgMCwgMiwgNiwgMiwgNjQsIDIsIDMsIDMsIDcsIDIsIDYsIDIsIDI3LCAyLCAzLCAyLCA0LCAyLCAwLCA0LCA2LCAyLCAzMzksIDMsIDI0LCAyLCAyNCwgMiwgMzAsIDIsIDI0LCAyLCAzMCwgMiwgMjQsIDIsIDMwLCAyLCAyNCwgMiwgMzAsIDIsIDI0LCAyLCA3LCAxODQ1LCAzMCwgNywgNSwgMjYyLCA2MSwgMTQ3LCA0NCwgMTEsIDYsIDE3LCAwLCAzMjIsIDI5LCAxOSwgNDMsIDQ4NSwgMjcsIDIyOSwgMjksIDMsIDAsIDIwOCwgMzAsIDIsIDIsIDIsIDEsIDIsIDYsIDMsIDQsIDEwLCAxLCAyMjUsIDYsIDIsIDMsIDIsIDEsIDIsIDE0LCAyLCAxOTYsIDYwLCA2NywgOCwgMCwgMTIwNSwgMywgMiwgMjYsIDIsIDEsIDIsIDAsIDMsIDAsIDIsIDksIDIsIDMsIDIsIDAsIDIsIDAsIDcsIDAsIDUsIDAsIDIsIDAsIDIsIDAsIDIsIDIsIDIsIDEsIDIsIDAsIDMsIDAsIDIsIDAsIDIsIDAsIDIsIDAsIDIsIDAsIDIsIDEsIDIsIDAsIDMsIDMsIDIsIDYsIDIsIDMsIDIsIDMsIDIsIDAsIDIsIDksIDIsIDE2LCA2LCAyLCAyLCA0LCAyLCAxNiwgNDQyMSwgNDI3MTksIDMzLCA0MzgxLCAzLCA1NzczLCAzLCA3NDcyLCAxNiwgNjIxLCAyNDY3LCA1NDEsIDE1MDcsIDQ5MzgsIDYsIDg0ODldO1xuXG4vLyBUaGlzIGZpbGUgd2FzIGdlbmVyYXRlZC4gRG8gbm90IG1vZGlmeSBtYW51YWxseSFcbnZhciBub25BU0NJSWlkZW50aWZpZXJDaGFycyA9IFwiXFx1MjAwY1xcdTIwMGRcXHhiN1xcdTAzMDAtXFx1MDM2ZlxcdTAzODdcXHUwNDgzLVxcdTA0ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNjEwLVxcdTA2MWFcXHUwNjRiLVxcdTA2NjlcXHUwNjcwXFx1MDZkNi1cXHUwNmRjXFx1MDZkZi1cXHUwNmU0XFx1MDZlN1xcdTA2ZThcXHUwNmVhLVxcdTA2ZWRcXHUwNmYwLVxcdTA2ZjlcXHUwNzExXFx1MDczMC1cXHUwNzRhXFx1MDdhNi1cXHUwN2IwXFx1MDdjMC1cXHUwN2M5XFx1MDdlYi1cXHUwN2YzXFx1MDdmZFxcdTA4MTYtXFx1MDgxOVxcdTA4MWItXFx1MDgyM1xcdTA4MjUtXFx1MDgyN1xcdTA4MjktXFx1MDgyZFxcdTA4NTktXFx1MDg1YlxcdTA4OTctXFx1MDg5ZlxcdTA4Y2EtXFx1MDhlMVxcdTA4ZTMtXFx1MDkwM1xcdTA5M2EtXFx1MDkzY1xcdTA5M2UtXFx1MDk0ZlxcdTA5NTEtXFx1MDk1N1xcdTA5NjJcXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk4MS1cXHUwOTgzXFx1MDliY1xcdTA5YmUtXFx1MDljNFxcdTA5YzdcXHUwOWM4XFx1MDljYi1cXHUwOWNkXFx1MDlkN1xcdTA5ZTJcXHUwOWUzXFx1MDllNi1cXHUwOWVmXFx1MDlmZVxcdTBhMDEtXFx1MGEwM1xcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTY2LVxcdTBhNzFcXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGFiY1xcdTBhYmUtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZTJcXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGFmYS1cXHUwYWZmXFx1MGIwMS1cXHUwYjAzXFx1MGIzY1xcdTBiM2UtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NS1cXHUwYjU3XFx1MGI2MlxcdTBiNjNcXHUwYjY2LVxcdTBiNmZcXHUwYjgyXFx1MGJiZS1cXHUwYmMyXFx1MGJjNi1cXHUwYmM4XFx1MGJjYS1cXHUwYmNkXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDAtXFx1MGMwNFxcdTBjM2NcXHUwYzNlLVxcdTBjNDRcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNjJcXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MS1cXHUwYzgzXFx1MGNiY1xcdTBjYmUtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNlMlxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwY2YzXFx1MGQwMC1cXHUwZDAzXFx1MGQzYlxcdTBkM2NcXHUwZDNlLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGRcXHUwZDU3XFx1MGQ2MlxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDgxLVxcdTBkODNcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZTYtXFx1MGRlZlxcdTBkZjJcXHUwZGYzXFx1MGUzMVxcdTBlMzQtXFx1MGUzYVxcdTBlNDctXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlYjFcXHUwZWI0LVxcdTBlYmNcXHUwZWM4LVxcdTBlY2VcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2VcXHUwZjNmXFx1MGY3MS1cXHUwZjg0XFx1MGY4NlxcdTBmODdcXHUwZjhkLVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAyYi1cXHUxMDNlXFx1MTA0MC1cXHUxMDQ5XFx1MTA1Ni1cXHUxMDU5XFx1MTA1ZS1cXHUxMDYwXFx1MTA2Mi1cXHUxMDY0XFx1MTA2Ny1cXHUxMDZkXFx1MTA3MS1cXHUxMDc0XFx1MTA4Mi1cXHUxMDhkXFx1MTA4Zi1cXHUxMDlkXFx1MTM1ZC1cXHUxMzVmXFx1MTM2OS1cXHUxMzcxXFx1MTcxMi1cXHUxNzE1XFx1MTczMi1cXHUxNzM0XFx1MTc1MlxcdTE3NTNcXHUxNzcyXFx1MTc3M1xcdTE3YjQtXFx1MTdkM1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODBmLVxcdTE4MTlcXHUxOGE5XFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk0Ni1cXHUxOTRmXFx1MTlkMC1cXHUxOWRhXFx1MWExNy1cXHUxYTFiXFx1MWE1NS1cXHUxYTVlXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWFiMC1cXHUxYWJkXFx1MWFiZi1cXHUxYWRkXFx1MWFlMC1cXHUxYWViXFx1MWIwMC1cXHUxYjA0XFx1MWIzNC1cXHUxYjQ0XFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYjgyXFx1MWJhMS1cXHUxYmFkXFx1MWJiMC1cXHUxYmI5XFx1MWJlNi1cXHUxYmYzXFx1MWMyNC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM1MC1cXHUxYzU5XFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2U4XFx1MWNlZFxcdTFjZjRcXHUxY2Y3LVxcdTFjZjlcXHUxZGMwLVxcdTFkZmZcXHUyMDBjXFx1MjAwZFxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyY2VmLVxcdTJjZjFcXHUyZDdmXFx1MmRlMC1cXHUyZGZmXFx1MzAyYS1cXHUzMDJmXFx1MzA5OVxcdTMwOWFcXHUzMGZiXFx1YTYyMC1cXHVhNjI5XFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2OWVcXHVhNjlmXFx1YTZmMFxcdWE2ZjFcXHVhODAyXFx1YTgwNlxcdWE4MGJcXHVhODIzLVxcdWE4MjdcXHVhODJjXFx1YTg4MFxcdWE4ODFcXHVhOGI0LVxcdWE4YzVcXHVhOGQwLVxcdWE4ZDlcXHVhOGUwLVxcdWE4ZjFcXHVhOGZmLVxcdWE5MDlcXHVhOTI2LVxcdWE5MmRcXHVhOTQ3LVxcdWE5NTNcXHVhOTgwLVxcdWE5ODNcXHVhOWIzLVxcdWE5YzBcXHVhOWQwLVxcdWE5ZDlcXHVhOWU1XFx1YTlmMC1cXHVhOWY5XFx1YWEyOS1cXHVhYTM2XFx1YWE0M1xcdWFhNGNcXHVhYTRkXFx1YWE1MC1cXHVhYTU5XFx1YWE3Yi1cXHVhYTdkXFx1YWFiMFxcdWFhYjItXFx1YWFiNFxcdWFhYjdcXHVhYWI4XFx1YWFiZVxcdWFhYmZcXHVhYWMxXFx1YWFlYi1cXHVhYWVmXFx1YWFmNVxcdWFhZjZcXHVhYmUzLVxcdWFiZWFcXHVhYmVjXFx1YWJlZFxcdWFiZjAtXFx1YWJmOVxcdWZiMWVcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMmZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZmMTAtXFx1ZmYxOVxcdWZmM2ZcXHVmZjY1XCI7XG5cbi8vIFRoaXMgZmlsZSB3YXMgZ2VuZXJhdGVkLiBEbyBub3QgbW9kaWZ5IG1hbnVhbGx5IVxudmFyIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0Q2hhcnMgPSBcIlxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDg3MC1cXHUwODg3XFx1MDg4OS1cXHUwODhmXFx1MDhhMC1cXHUwOGM5XFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNWNcXHUwYzVkXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGMtXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA0LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODYtXFx1MGU4YVxcdTBlOGMtXFx1MGVhM1xcdTBlYTVcXHUwZWE3LVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcxMVxcdTE3MWYtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGNcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4YVxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmM1xcdTFjZjVcXHUxY2Y2XFx1MWNmYVxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiZlxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiZlxcdTRlMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2RjXFx1YTdmMS1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2OVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY1wiO1xuXG4vLyBUaGVzZSBhcmUgYSBydW4tbGVuZ3RoIGFuZCBvZmZzZXQgZW5jb2RlZCByZXByZXNlbnRhdGlvbiBvZiB0aGVcbi8vID4weGZmZmYgY29kZSBwb2ludHMgdGhhdCBhcmUgYSB2YWxpZCBwYXJ0IG9mIGlkZW50aWZpZXJzLiBUaGVcbi8vIG9mZnNldCBzdGFydHMgYXQgMHgxMDAwMCwgYW5kIGVhY2ggcGFpciBvZiBudW1iZXJzIHJlcHJlc2VudHMgYW5cbi8vIG9mZnNldCB0byB0aGUgbmV4dCByYW5nZSwgYW5kIHRoZW4gYSBzaXplIG9mIHRoZSByYW5nZS5cblxuLy8gUmVzZXJ2ZWQgd29yZCBsaXN0cyBmb3IgdmFyaW91cyBkaWFsZWN0cyBvZiB0aGUgbGFuZ3VhZ2VcblxudmFyIHJlc2VydmVkV29yZHMgPSB7XG4gIDM6IFwiYWJzdHJhY3QgYm9vbGVhbiBieXRlIGNoYXIgY2xhc3MgZG91YmxlIGVudW0gZXhwb3J0IGV4dGVuZHMgZmluYWwgZmxvYXQgZ290byBpbXBsZW1lbnRzIGltcG9ydCBpbnQgaW50ZXJmYWNlIGxvbmcgbmF0aXZlIHBhY2thZ2UgcHJpdmF0ZSBwcm90ZWN0ZWQgcHVibGljIHNob3J0IHN0YXRpYyBzdXBlciBzeW5jaHJvbml6ZWQgdGhyb3dzIHRyYW5zaWVudCB2b2xhdGlsZVwiLFxuICA1OiBcImNsYXNzIGVudW0gZXh0ZW5kcyBzdXBlciBjb25zdCBleHBvcnQgaW1wb3J0XCIsXG4gIDY6IFwiZW51bVwiLFxuICBzdHJpY3Q6IFwiaW1wbGVtZW50cyBpbnRlcmZhY2UgbGV0IHBhY2thZ2UgcHJpdmF0ZSBwcm90ZWN0ZWQgcHVibGljIHN0YXRpYyB5aWVsZFwiLFxuICBzdHJpY3RCaW5kOiBcImV2YWwgYXJndW1lbnRzXCJcbn07XG5cbi8vIEFuZCB0aGUga2V5d29yZHNcblxudmFyIGVjbWE1QW5kTGVzc0tleXdvcmRzID0gXCJicmVhayBjYXNlIGNhdGNoIGNvbnRpbnVlIGRlYnVnZ2VyIGRlZmF1bHQgZG8gZWxzZSBmaW5hbGx5IGZvciBmdW5jdGlvbiBpZiByZXR1cm4gc3dpdGNoIHRocm93IHRyeSB2YXIgd2hpbGUgd2l0aCBudWxsIHRydWUgZmFsc2UgaW5zdGFuY2VvZiB0eXBlb2Ygdm9pZCBkZWxldGUgbmV3IGluIHRoaXNcIjtcblxudmFyIGtleXdvcmRzJDEgPSB7XG4gIDU6IGVjbWE1QW5kTGVzc0tleXdvcmRzLFxuICBcIjVtb2R1bGVcIjogZWNtYTVBbmRMZXNzS2V5d29yZHMgKyBcIiBleHBvcnQgaW1wb3J0XCIsXG4gIDY6IGVjbWE1QW5kTGVzc0tleXdvcmRzICsgXCIgY29uc3QgY2xhc3MgZXh0ZW5kcyBleHBvcnQgaW1wb3J0IHN1cGVyXCJcbn07XG5cbnZhciBrZXl3b3JkUmVsYXRpb25hbE9wZXJhdG9yID0gL15pbihzdGFuY2VvZik/JC87XG5cbi8vICMjIENoYXJhY3RlciBjYXRlZ29yaWVzXG5cbnZhciBub25BU0NJSWlkZW50aWZpZXJTdGFydCA9IG5ldyBSZWdFeHAoXCJbXCIgKyBub25BU0NJSWlkZW50aWZpZXJTdGFydENoYXJzICsgXCJdXCIpO1xudmFyIG5vbkFTQ0lJaWRlbnRpZmllciA9IG5ldyBSZWdFeHAoXCJbXCIgKyBub25BU0NJSWlkZW50aWZpZXJTdGFydENoYXJzICsgbm9uQVNDSUlpZGVudGlmaWVyQ2hhcnMgKyBcIl1cIik7XG5cbi8vIFRoaXMgaGFzIGEgY29tcGxleGl0eSBsaW5lYXIgdG8gdGhlIHZhbHVlIG9mIHRoZSBjb2RlLiBUaGVcbi8vIGFzc3VtcHRpb24gaXMgdGhhdCBsb29raW5nIHVwIGFzdHJhbCBpZGVudGlmaWVyIGNoYXJhY3RlcnMgaXNcbi8vIHJhcmUuXG5mdW5jdGlvbiBpc0luQXN0cmFsU2V0KGNvZGUsIHNldCkge1xuICB2YXIgcG9zID0gMHgxMDAwMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZXQubGVuZ3RoOyBpICs9IDIpIHtcbiAgICBwb3MgKz0gc2V0W2ldO1xuICAgIGlmIChwb3MgPiBjb2RlKSB7IHJldHVybiBmYWxzZSB9XG4gICAgcG9zICs9IHNldFtpICsgMV07XG4gICAgaWYgKHBvcyA+PSBjb2RlKSB7IHJldHVybiB0cnVlIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLy8gVGVzdCB3aGV0aGVyIGEgZ2l2ZW4gY2hhcmFjdGVyIGNvZGUgc3RhcnRzIGFuIGlkZW50aWZpZXIuXG5cbmZ1bmN0aW9uIGlzSWRlbnRpZmllclN0YXJ0KGNvZGUsIGFzdHJhbCkge1xuICBpZiAoY29kZSA8IDY1KSB7IHJldHVybiBjb2RlID09PSAzNiB9XG4gIGlmIChjb2RlIDwgOTEpIHsgcmV0dXJuIHRydWUgfVxuICBpZiAoY29kZSA8IDk3KSB7IHJldHVybiBjb2RlID09PSA5NSB9XG4gIGlmIChjb2RlIDwgMTIzKSB7IHJldHVybiB0cnVlIH1cbiAgaWYgKGNvZGUgPD0gMHhmZmZmKSB7IHJldHVybiBjb2RlID49IDB4YWEgJiYgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnQudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpKSB9XG4gIGlmIChhc3RyYWwgPT09IGZhbHNlKSB7IHJldHVybiBmYWxzZSB9XG4gIHJldHVybiBpc0luQXN0cmFsU2V0KGNvZGUsIGFzdHJhbElkZW50aWZpZXJTdGFydENvZGVzKVxufVxuXG4vLyBUZXN0IHdoZXRoZXIgYSBnaXZlbiBjaGFyYWN0ZXIgaXMgcGFydCBvZiBhbiBpZGVudGlmaWVyLlxuXG5mdW5jdGlvbiBpc0lkZW50aWZpZXJDaGFyKGNvZGUsIGFzdHJhbCkge1xuICBpZiAoY29kZSA8IDQ4KSB7IHJldHVybiBjb2RlID09PSAzNiB9XG4gIGlmIChjb2RlIDwgNTgpIHsgcmV0dXJuIHRydWUgfVxuICBpZiAoY29kZSA8IDY1KSB7IHJldHVybiBmYWxzZSB9XG4gIGlmIChjb2RlIDwgOTEpIHsgcmV0dXJuIHRydWUgfVxuICBpZiAoY29kZSA8IDk3KSB7IHJldHVybiBjb2RlID09PSA5NSB9XG4gIGlmIChjb2RlIDwgMTIzKSB7IHJldHVybiB0cnVlIH1cbiAgaWYgKGNvZGUgPD0gMHhmZmZmKSB7IHJldHVybiBjb2RlID49IDB4YWEgJiYgbm9uQVNDSUlpZGVudGlmaWVyLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSkgfVxuICBpZiAoYXN0cmFsID09PSBmYWxzZSkgeyByZXR1cm4gZmFsc2UgfVxuICByZXR1cm4gaXNJbkFzdHJhbFNldChjb2RlLCBhc3RyYWxJZGVudGlmaWVyU3RhcnRDb2RlcykgfHwgaXNJbkFzdHJhbFNldChjb2RlLCBhc3RyYWxJZGVudGlmaWVyQ29kZXMpXG59XG5cbi8vICMjIFRva2VuIHR5cGVzXG5cbi8vIFRoZSBhc3NpZ25tZW50IG9mIGZpbmUtZ3JhaW5lZCwgaW5mb3JtYXRpb24tY2FycnlpbmcgdHlwZSBvYmplY3RzXG4vLyBhbGxvd3MgdGhlIHRva2VuaXplciB0byBzdG9yZSB0aGUgaW5mb3JtYXRpb24gaXQgaGFzIGFib3V0IGFcbi8vIHRva2VuIGluIGEgd2F5IHRoYXQgaXMgdmVyeSBjaGVhcCBmb3IgdGhlIHBhcnNlciB0byBsb29rIHVwLlxuXG4vLyBBbGwgdG9rZW4gdHlwZSB2YXJpYWJsZXMgc3RhcnQgd2l0aCBhbiB1bmRlcnNjb3JlLCB0byBtYWtlIHRoZW1cbi8vIGVhc3kgdG8gcmVjb2duaXplLlxuXG4vLyBUaGUgYGJlZm9yZUV4cHJgIHByb3BlcnR5IGlzIHVzZWQgdG8gZGlzYW1iaWd1YXRlIGJldHdlZW4gcmVndWxhclxuLy8gZXhwcmVzc2lvbnMgYW5kIGRpdmlzaW9ucy4gSXQgaXMgc2V0IG9uIGFsbCB0b2tlbiB0eXBlcyB0aGF0IGNhblxuLy8gYmUgZm9sbG93ZWQgYnkgYW4gZXhwcmVzc2lvbiAodGh1cywgYSBzbGFzaCBhZnRlciB0aGVtIHdvdWxkIGJlIGFcbi8vIHJlZ3VsYXIgZXhwcmVzc2lvbikuXG4vL1xuLy8gVGhlIGBzdGFydHNFeHByYCBwcm9wZXJ0eSBpcyB1c2VkIHRvIGNoZWNrIGlmIHRoZSB0b2tlbiBlbmRzIGFcbi8vIGB5aWVsZGAgZXhwcmVzc2lvbi4gSXQgaXMgc2V0IG9uIGFsbCB0b2tlbiB0eXBlcyB0aGF0IGVpdGhlciBjYW5cbi8vIGRpcmVjdGx5IHN0YXJ0IGFuIGV4cHJlc3Npb24gKGxpa2UgYSBxdW90YXRpb24gbWFyaykgb3IgY2FuXG4vLyBjb250aW51ZSBhbiBleHByZXNzaW9uIChsaWtlIHRoZSBib2R5IG9mIGEgc3RyaW5nKS5cbi8vXG4vLyBgaXNMb29wYCBtYXJrcyBhIGtleXdvcmQgYXMgc3RhcnRpbmcgYSBsb29wLCB3aGljaCBpcyBpbXBvcnRhbnRcbi8vIHRvIGtub3cgd2hlbiBwYXJzaW5nIGEgbGFiZWwsIGluIG9yZGVyIHRvIGFsbG93IG9yIGRpc2FsbG93XG4vLyBjb250aW51ZSBqdW1wcyB0byB0aGF0IGxhYmVsLlxuXG52YXIgVG9rZW5UeXBlID0gZnVuY3Rpb24gVG9rZW5UeXBlKGxhYmVsLCBjb25mKSB7XG4gIGlmICggY29uZiA9PT0gdm9pZCAwICkgY29uZiA9IHt9O1xuXG4gIHRoaXMubGFiZWwgPSBsYWJlbDtcbiAgdGhpcy5rZXl3b3JkID0gY29uZi5rZXl3b3JkO1xuICB0aGlzLmJlZm9yZUV4cHIgPSAhIWNvbmYuYmVmb3JlRXhwcjtcbiAgdGhpcy5zdGFydHNFeHByID0gISFjb25mLnN0YXJ0c0V4cHI7XG4gIHRoaXMuaXNMb29wID0gISFjb25mLmlzTG9vcDtcbiAgdGhpcy5pc0Fzc2lnbiA9ICEhY29uZi5pc0Fzc2lnbjtcbiAgdGhpcy5wcmVmaXggPSAhIWNvbmYucHJlZml4O1xuICB0aGlzLnBvc3RmaXggPSAhIWNvbmYucG9zdGZpeDtcbiAgdGhpcy5iaW5vcCA9IGNvbmYuYmlub3AgfHwgbnVsbDtcbiAgdGhpcy51cGRhdGVDb250ZXh0ID0gbnVsbDtcbn07XG5cbmZ1bmN0aW9uIGJpbm9wKG5hbWUsIHByZWMpIHtcbiAgcmV0dXJuIG5ldyBUb2tlblR5cGUobmFtZSwge2JlZm9yZUV4cHI6IHRydWUsIGJpbm9wOiBwcmVjfSlcbn1cbnZhciBiZWZvcmVFeHByID0ge2JlZm9yZUV4cHI6IHRydWV9LCBzdGFydHNFeHByID0ge3N0YXJ0c0V4cHI6IHRydWV9O1xuXG4vLyBNYXAga2V5d29yZCBuYW1lcyB0byB0b2tlbiB0eXBlcy5cblxudmFyIGtleXdvcmRzID0ge307XG5cbi8vIFN1Y2NpbmN0IGRlZmluaXRpb25zIG9mIGtleXdvcmQgdG9rZW4gdHlwZXNcbmZ1bmN0aW9uIGt3KG5hbWUsIG9wdGlvbnMpIHtcbiAgaWYgKCBvcHRpb25zID09PSB2b2lkIDAgKSBvcHRpb25zID0ge307XG5cbiAgb3B0aW9ucy5rZXl3b3JkID0gbmFtZTtcbiAgcmV0dXJuIGtleXdvcmRzW25hbWVdID0gbmV3IFRva2VuVHlwZShuYW1lLCBvcHRpb25zKVxufVxuXG52YXIgdHlwZXMkMSA9IHtcbiAgbnVtOiBuZXcgVG9rZW5UeXBlKFwibnVtXCIsIHN0YXJ0c0V4cHIpLFxuICByZWdleHA6IG5ldyBUb2tlblR5cGUoXCJyZWdleHBcIiwgc3RhcnRzRXhwciksXG4gIHN0cmluZzogbmV3IFRva2VuVHlwZShcInN0cmluZ1wiLCBzdGFydHNFeHByKSxcbiAgbmFtZTogbmV3IFRva2VuVHlwZShcIm5hbWVcIiwgc3RhcnRzRXhwciksXG4gIHByaXZhdGVJZDogbmV3IFRva2VuVHlwZShcInByaXZhdGVJZFwiLCBzdGFydHNFeHByKSxcbiAgZW9mOiBuZXcgVG9rZW5UeXBlKFwiZW9mXCIpLFxuXG4gIC8vIFB1bmN0dWF0aW9uIHRva2VuIHR5cGVzLlxuICBicmFja2V0TDogbmV3IFRva2VuVHlwZShcIltcIiwge2JlZm9yZUV4cHI6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgYnJhY2tldFI6IG5ldyBUb2tlblR5cGUoXCJdXCIpLFxuICBicmFjZUw6IG5ldyBUb2tlblR5cGUoXCJ7XCIsIHtiZWZvcmVFeHByOiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIGJyYWNlUjogbmV3IFRva2VuVHlwZShcIn1cIiksXG4gIHBhcmVuTDogbmV3IFRva2VuVHlwZShcIihcIiwge2JlZm9yZUV4cHI6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgcGFyZW5SOiBuZXcgVG9rZW5UeXBlKFwiKVwiKSxcbiAgY29tbWE6IG5ldyBUb2tlblR5cGUoXCIsXCIsIGJlZm9yZUV4cHIpLFxuICBzZW1pOiBuZXcgVG9rZW5UeXBlKFwiO1wiLCBiZWZvcmVFeHByKSxcbiAgY29sb246IG5ldyBUb2tlblR5cGUoXCI6XCIsIGJlZm9yZUV4cHIpLFxuICBkb3Q6IG5ldyBUb2tlblR5cGUoXCIuXCIpLFxuICBxdWVzdGlvbjogbmV3IFRva2VuVHlwZShcIj9cIiwgYmVmb3JlRXhwciksXG4gIHF1ZXN0aW9uRG90OiBuZXcgVG9rZW5UeXBlKFwiPy5cIiksXG4gIGFycm93OiBuZXcgVG9rZW5UeXBlKFwiPT5cIiwgYmVmb3JlRXhwciksXG4gIHRlbXBsYXRlOiBuZXcgVG9rZW5UeXBlKFwidGVtcGxhdGVcIiksXG4gIGludmFsaWRUZW1wbGF0ZTogbmV3IFRva2VuVHlwZShcImludmFsaWRUZW1wbGF0ZVwiKSxcbiAgZWxsaXBzaXM6IG5ldyBUb2tlblR5cGUoXCIuLi5cIiwgYmVmb3JlRXhwciksXG4gIGJhY2tRdW90ZTogbmV3IFRva2VuVHlwZShcImBcIiwgc3RhcnRzRXhwciksXG4gIGRvbGxhckJyYWNlTDogbmV3IFRva2VuVHlwZShcIiR7XCIsIHtiZWZvcmVFeHByOiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG5cbiAgLy8gT3BlcmF0b3JzLiBUaGVzZSBjYXJyeSBzZXZlcmFsIGtpbmRzIG9mIHByb3BlcnRpZXMgdG8gaGVscCB0aGVcbiAgLy8gcGFyc2VyIHVzZSB0aGVtIHByb3Blcmx5ICh0aGUgcHJlc2VuY2Ugb2YgdGhlc2UgcHJvcGVydGllcyBpc1xuICAvLyB3aGF0IGNhdGVnb3JpemVzIHRoZW0gYXMgb3BlcmF0b3JzKS5cbiAgLy9cbiAgLy8gYGJpbm9wYCwgd2hlbiBwcmVzZW50LCBzcGVjaWZpZXMgdGhhdCB0aGlzIG9wZXJhdG9yIGlzIGEgYmluYXJ5XG4gIC8vIG9wZXJhdG9yLCBhbmQgd2lsbCByZWZlciB0byBpdHMgcHJlY2VkZW5jZS5cbiAgLy9cbiAgLy8gYHByZWZpeGAgYW5kIGBwb3N0Zml4YCBtYXJrIHRoZSBvcGVyYXRvciBhcyBhIHByZWZpeCBvciBwb3N0Zml4XG4gIC8vIHVuYXJ5IG9wZXJhdG9yLlxuICAvL1xuICAvLyBgaXNBc3NpZ25gIG1hcmtzIGFsbCBvZiBgPWAsIGArPWAsIGAtPWAgZXRjZXRlcmEsIHdoaWNoIGFjdCBhc1xuICAvLyBiaW5hcnkgb3BlcmF0b3JzIHdpdGggYSB2ZXJ5IGxvdyBwcmVjZWRlbmNlLCB0aGF0IHNob3VsZCByZXN1bHRcbiAgLy8gaW4gQXNzaWdubWVudEV4cHJlc3Npb24gbm9kZXMuXG5cbiAgZXE6IG5ldyBUb2tlblR5cGUoXCI9XCIsIHtiZWZvcmVFeHByOiB0cnVlLCBpc0Fzc2lnbjogdHJ1ZX0pLFxuICBhc3NpZ246IG5ldyBUb2tlblR5cGUoXCJfPVwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgaXNBc3NpZ246IHRydWV9KSxcbiAgaW5jRGVjOiBuZXcgVG9rZW5UeXBlKFwiKysvLS1cIiwge3ByZWZpeDogdHJ1ZSwgcG9zdGZpeDogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBwcmVmaXg6IG5ldyBUb2tlblR5cGUoXCIhL35cIiwge2JlZm9yZUV4cHI6IHRydWUsIHByZWZpeDogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBsb2dpY2FsT1I6IGJpbm9wKFwifHxcIiwgMSksXG4gIGxvZ2ljYWxBTkQ6IGJpbm9wKFwiJiZcIiwgMiksXG4gIGJpdHdpc2VPUjogYmlub3AoXCJ8XCIsIDMpLFxuICBiaXR3aXNlWE9SOiBiaW5vcChcIl5cIiwgNCksXG4gIGJpdHdpc2VBTkQ6IGJpbm9wKFwiJlwiLCA1KSxcbiAgZXF1YWxpdHk6IGJpbm9wKFwiPT0vIT0vPT09LyE9PVwiLCA2KSxcbiAgcmVsYXRpb25hbDogYmlub3AoXCI8Lz4vPD0vPj1cIiwgNyksXG4gIGJpdFNoaWZ0OiBiaW5vcChcIjw8Lz4+Lz4+PlwiLCA4KSxcbiAgcGx1c01pbjogbmV3IFRva2VuVHlwZShcIisvLVwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgYmlub3A6IDksIHByZWZpeDogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBtb2R1bG86IGJpbm9wKFwiJVwiLCAxMCksXG4gIHN0YXI6IGJpbm9wKFwiKlwiLCAxMCksXG4gIHNsYXNoOiBiaW5vcChcIi9cIiwgMTApLFxuICBzdGFyc3RhcjogbmV3IFRva2VuVHlwZShcIioqXCIsIHtiZWZvcmVFeHByOiB0cnVlfSksXG4gIGNvYWxlc2NlOiBiaW5vcChcIj8/XCIsIDEpLFxuXG4gIC8vIEtleXdvcmQgdG9rZW4gdHlwZXMuXG4gIF9icmVhazoga3coXCJicmVha1wiKSxcbiAgX2Nhc2U6IGt3KFwiY2FzZVwiLCBiZWZvcmVFeHByKSxcbiAgX2NhdGNoOiBrdyhcImNhdGNoXCIpLFxuICBfY29udGludWU6IGt3KFwiY29udGludWVcIiksXG4gIF9kZWJ1Z2dlcjoga3coXCJkZWJ1Z2dlclwiKSxcbiAgX2RlZmF1bHQ6IGt3KFwiZGVmYXVsdFwiLCBiZWZvcmVFeHByKSxcbiAgX2RvOiBrdyhcImRvXCIsIHtpc0xvb3A6IHRydWUsIGJlZm9yZUV4cHI6IHRydWV9KSxcbiAgX2Vsc2U6IGt3KFwiZWxzZVwiLCBiZWZvcmVFeHByKSxcbiAgX2ZpbmFsbHk6IGt3KFwiZmluYWxseVwiKSxcbiAgX2Zvcjoga3coXCJmb3JcIiwge2lzTG9vcDogdHJ1ZX0pLFxuICBfZnVuY3Rpb246IGt3KFwiZnVuY3Rpb25cIiwgc3RhcnRzRXhwciksXG4gIF9pZjoga3coXCJpZlwiKSxcbiAgX3JldHVybjoga3coXCJyZXR1cm5cIiwgYmVmb3JlRXhwciksXG4gIF9zd2l0Y2g6IGt3KFwic3dpdGNoXCIpLFxuICBfdGhyb3c6IGt3KFwidGhyb3dcIiwgYmVmb3JlRXhwciksXG4gIF90cnk6IGt3KFwidHJ5XCIpLFxuICBfdmFyOiBrdyhcInZhclwiKSxcbiAgX2NvbnN0OiBrdyhcImNvbnN0XCIpLFxuICBfd2hpbGU6IGt3KFwid2hpbGVcIiwge2lzTG9vcDogdHJ1ZX0pLFxuICBfd2l0aDoga3coXCJ3aXRoXCIpLFxuICBfbmV3OiBrdyhcIm5ld1wiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBfdGhpczoga3coXCJ0aGlzXCIsIHN0YXJ0c0V4cHIpLFxuICBfc3VwZXI6IGt3KFwic3VwZXJcIiwgc3RhcnRzRXhwciksXG4gIF9jbGFzczoga3coXCJjbGFzc1wiLCBzdGFydHNFeHByKSxcbiAgX2V4dGVuZHM6IGt3KFwiZXh0ZW5kc1wiLCBiZWZvcmVFeHByKSxcbiAgX2V4cG9ydDoga3coXCJleHBvcnRcIiksXG4gIF9pbXBvcnQ6IGt3KFwiaW1wb3J0XCIsIHN0YXJ0c0V4cHIpLFxuICBfbnVsbDoga3coXCJudWxsXCIsIHN0YXJ0c0V4cHIpLFxuICBfdHJ1ZToga3coXCJ0cnVlXCIsIHN0YXJ0c0V4cHIpLFxuICBfZmFsc2U6IGt3KFwiZmFsc2VcIiwgc3RhcnRzRXhwciksXG4gIF9pbjoga3coXCJpblwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgYmlub3A6IDd9KSxcbiAgX2luc3RhbmNlb2Y6IGt3KFwiaW5zdGFuY2VvZlwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgYmlub3A6IDd9KSxcbiAgX3R5cGVvZjoga3coXCJ0eXBlb2ZcIiwge2JlZm9yZUV4cHI6IHRydWUsIHByZWZpeDogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBfdm9pZDoga3coXCJ2b2lkXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBwcmVmaXg6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgX2RlbGV0ZToga3coXCJkZWxldGVcIiwge2JlZm9yZUV4cHI6IHRydWUsIHByZWZpeDogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pXG59O1xuXG4vLyBNYXRjaGVzIGEgd2hvbGUgbGluZSBicmVhayAod2hlcmUgQ1JMRiBpcyBjb25zaWRlcmVkIGEgc2luZ2xlXG4vLyBsaW5lIGJyZWFrKS4gVXNlZCB0byBjb3VudCBsaW5lcy5cblxudmFyIGxpbmVCcmVhayA9IC9cXHJcXG4/fFxcbnxcXHUyMDI4fFxcdTIwMjkvO1xudmFyIGxpbmVCcmVha0cgPSBuZXcgUmVnRXhwKGxpbmVCcmVhay5zb3VyY2UsIFwiZ1wiKTtcblxuZnVuY3Rpb24gaXNOZXdMaW5lKGNvZGUpIHtcbiAgcmV0dXJuIGNvZGUgPT09IDEwIHx8IGNvZGUgPT09IDEzIHx8IGNvZGUgPT09IDB4MjAyOCB8fCBjb2RlID09PSAweDIwMjlcbn1cblxuZnVuY3Rpb24gbmV4dExpbmVCcmVhayhjb2RlLCBmcm9tLCBlbmQpIHtcbiAgaWYgKCBlbmQgPT09IHZvaWQgMCApIGVuZCA9IGNvZGUubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSBmcm9tOyBpIDwgZW5kOyBpKyspIHtcbiAgICB2YXIgbmV4dCA9IGNvZGUuY2hhckNvZGVBdChpKTtcbiAgICBpZiAoaXNOZXdMaW5lKG5leHQpKVxuICAgICAgeyByZXR1cm4gaSA8IGVuZCAtIDEgJiYgbmV4dCA9PT0gMTMgJiYgY29kZS5jaGFyQ29kZUF0KGkgKyAxKSA9PT0gMTAgPyBpICsgMiA6IGkgKyAxIH1cbiAgfVxuICByZXR1cm4gLTFcbn1cblxudmFyIG5vbkFTQ0lJd2hpdGVzcGFjZSA9IC9bXFx1MTY4MFxcdTIwMDAtXFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdWZlZmZdLztcblxudmFyIHNraXBXaGl0ZVNwYWNlID0gLyg/Olxcc3xcXC9cXC8uKnxcXC9cXCpbXl0qP1xcKlxcLykqL2c7XG5cbnZhciByZWYgPSBPYmplY3QucHJvdG90eXBlO1xudmFyIGhhc093blByb3BlcnR5ID0gcmVmLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gcmVmLnRvU3RyaW5nO1xuXG52YXIgaGFzT3duID0gT2JqZWN0Lmhhc093biB8fCAoZnVuY3Rpb24gKG9iaiwgcHJvcE5hbWUpIHsgcmV0dXJuIChcbiAgaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3BOYW1lKVxuKTsgfSk7XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCAoZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gKFxuICB0b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIlxuKTsgfSk7XG5cbnZhciByZWdleHBDYWNoZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbmZ1bmN0aW9uIHdvcmRzUmVnZXhwKHdvcmRzKSB7XG4gIHJldHVybiByZWdleHBDYWNoZVt3b3Jkc10gfHwgKHJlZ2V4cENhY2hlW3dvcmRzXSA9IG5ldyBSZWdFeHAoXCJeKD86XCIgKyB3b3Jkcy5yZXBsYWNlKC8gL2csIFwifFwiKSArIFwiKSRcIikpXG59XG5cbmZ1bmN0aW9uIGNvZGVQb2ludFRvU3RyaW5nKGNvZGUpIHtcbiAgLy8gVVRGLTE2IERlY29kaW5nXG4gIGlmIChjb2RlIDw9IDB4RkZGRikgeyByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSB9XG4gIGNvZGUgLT0gMHgxMDAwMDtcbiAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoKGNvZGUgPj4gMTApICsgMHhEODAwLCAoY29kZSAmIDEwMjMpICsgMHhEQzAwKVxufVxuXG52YXIgbG9uZVN1cnJvZ2F0ZSA9IC8oPzpbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkvO1xuXG4vLyBUaGVzZSBhcmUgdXNlZCB3aGVuIGBvcHRpb25zLmxvY2F0aW9uc2AgaXMgb24sIGZvciB0aGVcbi8vIGBzdGFydExvY2AgYW5kIGBlbmRMb2NgIHByb3BlcnRpZXMuXG5cbnZhciBQb3NpdGlvbiA9IGZ1bmN0aW9uIFBvc2l0aW9uKGxpbmUsIGNvbCkge1xuICB0aGlzLmxpbmUgPSBsaW5lO1xuICB0aGlzLmNvbHVtbiA9IGNvbDtcbn07XG5cblBvc2l0aW9uLnByb3RvdHlwZS5vZmZzZXQgPSBmdW5jdGlvbiBvZmZzZXQgKG4pIHtcbiAgcmV0dXJuIG5ldyBQb3NpdGlvbih0aGlzLmxpbmUsIHRoaXMuY29sdW1uICsgbilcbn07XG5cbnZhciBTb3VyY2VMb2NhdGlvbiA9IGZ1bmN0aW9uIFNvdXJjZUxvY2F0aW9uKHAsIHN0YXJ0LCBlbmQpIHtcbiAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICB0aGlzLmVuZCA9IGVuZDtcbiAgaWYgKHAuc291cmNlRmlsZSAhPT0gbnVsbCkgeyB0aGlzLnNvdXJjZSA9IHAuc291cmNlRmlsZTsgfVxufTtcblxuLy8gVGhlIGBnZXRMaW5lSW5mb2AgZnVuY3Rpb24gaXMgbW9zdGx5IHVzZWZ1bCB3aGVuIHRoZVxuLy8gYGxvY2F0aW9uc2Agb3B0aW9uIGlzIG9mZiAoZm9yIHBlcmZvcm1hbmNlIHJlYXNvbnMpIGFuZCB5b3Vcbi8vIHdhbnQgdG8gZmluZCB0aGUgbGluZS9jb2x1bW4gcG9zaXRpb24gZm9yIGEgZ2l2ZW4gY2hhcmFjdGVyXG4vLyBvZmZzZXQuIGBpbnB1dGAgc2hvdWxkIGJlIHRoZSBjb2RlIHN0cmluZyB0aGF0IHRoZSBvZmZzZXQgcmVmZXJzXG4vLyBpbnRvLlxuXG5mdW5jdGlvbiBnZXRMaW5lSW5mbyhpbnB1dCwgb2Zmc2V0KSB7XG4gIGZvciAodmFyIGxpbmUgPSAxLCBjdXIgPSAwOzspIHtcbiAgICB2YXIgbmV4dEJyZWFrID0gbmV4dExpbmVCcmVhayhpbnB1dCwgY3VyLCBvZmZzZXQpO1xuICAgIGlmIChuZXh0QnJlYWsgPCAwKSB7IHJldHVybiBuZXcgUG9zaXRpb24obGluZSwgb2Zmc2V0IC0gY3VyKSB9XG4gICAgKytsaW5lO1xuICAgIGN1ciA9IG5leHRCcmVhaztcbiAgfVxufVxuXG4vLyBBIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGdpdmVuIHRvIGNvbmZpZ3VyZSB0aGUgcGFyc2VyIHByb2Nlc3MuXG4vLyBUaGVzZSBvcHRpb25zIGFyZSByZWNvZ25pemVkIChvbmx5IGBlY21hVmVyc2lvbmAgaXMgcmVxdWlyZWQpOlxuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIC8vIGBlY21hVmVyc2lvbmAgaW5kaWNhdGVzIHRoZSBFQ01BU2NyaXB0IHZlcnNpb24gdG8gcGFyc2UuIE11c3QgYmVcbiAgLy8gZWl0aGVyIDMsIDUsIDYgKG9yIDIwMTUpLCA3ICgyMDE2KSwgOCAoMjAxNyksIDkgKDIwMTgpLCAxMFxuICAvLyAoMjAxOSksIDExICgyMDIwKSwgMTIgKDIwMjEpLCAxMyAoMjAyMiksIDE0ICgyMDIzKSwgb3IgYFwibGF0ZXN0XCJgXG4gIC8vICh0aGUgbGF0ZXN0IHZlcnNpb24gdGhlIGxpYnJhcnkgc3VwcG9ydHMpLiBUaGlzIGluZmx1ZW5jZXNcbiAgLy8gc3VwcG9ydCBmb3Igc3RyaWN0IG1vZGUsIHRoZSBzZXQgb2YgcmVzZXJ2ZWQgd29yZHMsIGFuZCBzdXBwb3J0XG4gIC8vIGZvciBuZXcgc3ludGF4IGZlYXR1cmVzLlxuICBlY21hVmVyc2lvbjogbnVsbCxcbiAgLy8gYHNvdXJjZVR5cGVgIGluZGljYXRlcyB0aGUgbW9kZSB0aGUgY29kZSBzaG91bGQgYmUgcGFyc2VkIGluLlxuICAvLyBDYW4gYmUgZWl0aGVyIGBcInNjcmlwdFwiYCwgYFwibW9kdWxlXCJgIG9yIGBcImNvbW1vbmpzXCJgLiBUaGlzIGluZmx1ZW5jZXMgZ2xvYmFsXG4gIC8vIHN0cmljdCBtb2RlIGFuZCBwYXJzaW5nIG9mIGBpbXBvcnRgIGFuZCBgZXhwb3J0YCBkZWNsYXJhdGlvbnMuXG4gIHNvdXJjZVR5cGU6IFwic2NyaXB0XCIsXG4gIC8vIGBvbkluc2VydGVkU2VtaWNvbG9uYCBjYW4gYmUgYSBjYWxsYmFjayB0aGF0IHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgLy8gYSBzZW1pY29sb24gaXMgYXV0b21hdGljYWxseSBpbnNlcnRlZC4gSXQgd2lsbCBiZSBwYXNzZWQgdGhlXG4gIC8vIHBvc2l0aW9uIG9mIHRoZSBpbnNlcnRlZCBzZW1pY29sb24gYXMgYW4gb2Zmc2V0LCBhbmQgaWZcbiAgLy8gYGxvY2F0aW9uc2AgaXMgZW5hYmxlZCwgaXQgaXMgZ2l2ZW4gdGhlIGxvY2F0aW9uIGFzIGEgYHtsaW5lLFxuICAvLyBjb2x1bW59YCBvYmplY3QgYXMgc2Vjb25kIGFyZ3VtZW50LlxuICBvbkluc2VydGVkU2VtaWNvbG9uOiBudWxsLFxuICAvLyBgb25UcmFpbGluZ0NvbW1hYCBpcyBzaW1pbGFyIHRvIGBvbkluc2VydGVkU2VtaWNvbG9uYCwgYnV0IGZvclxuICAvLyB0cmFpbGluZyBjb21tYXMuXG4gIG9uVHJhaWxpbmdDb21tYTogbnVsbCxcbiAgLy8gQnkgZGVmYXVsdCwgcmVzZXJ2ZWQgd29yZHMgYXJlIG9ubHkgZW5mb3JjZWQgaWYgZWNtYVZlcnNpb24gPj0gNS5cbiAgLy8gU2V0IGBhbGxvd1Jlc2VydmVkYCB0byBhIGJvb2xlYW4gdmFsdWUgdG8gZXhwbGljaXRseSB0dXJuIHRoaXMgb25cbiAgLy8gYW4gb2ZmLiBXaGVuIHRoaXMgb3B0aW9uIGhhcyB0aGUgdmFsdWUgXCJuZXZlclwiLCByZXNlcnZlZCB3b3Jkc1xuICAvLyBhbmQga2V5d29yZHMgY2FuIGFsc28gbm90IGJlIHVzZWQgYXMgcHJvcGVydHkgbmFtZXMuXG4gIGFsbG93UmVzZXJ2ZWQ6IG51bGwsXG4gIC8vIFdoZW4gZW5hYmxlZCwgYSByZXR1cm4gYXQgdGhlIHRvcCBsZXZlbCBpcyBub3QgY29uc2lkZXJlZCBhblxuICAvLyBlcnJvci5cbiAgYWxsb3dSZXR1cm5PdXRzaWRlRnVuY3Rpb246IGZhbHNlLFxuICAvLyBXaGVuIGVuYWJsZWQsIGltcG9ydC9leHBvcnQgc3RhdGVtZW50cyBhcmUgbm90IGNvbnN0cmFpbmVkIHRvXG4gIC8vIGFwcGVhcmluZyBhdCB0aGUgdG9wIG9mIHRoZSBwcm9ncmFtLCBhbmQgYW4gaW1wb3J0Lm1ldGEgZXhwcmVzc2lvblxuICAvLyBpbiBhIHNjcmlwdCBpc24ndCBjb25zaWRlcmVkIGFuIGVycm9yLlxuICBhbGxvd0ltcG9ydEV4cG9ydEV2ZXJ5d2hlcmU6IGZhbHNlLFxuICAvLyBCeSBkZWZhdWx0LCBhd2FpdCBpZGVudGlmaWVycyBhcmUgYWxsb3dlZCB0byBhcHBlYXIgYXQgdGhlIHRvcC1sZXZlbCBzY29wZSBvbmx5IGlmIGVjbWFWZXJzaW9uID49IDIwMjIuXG4gIC8vIFdoZW4gZW5hYmxlZCwgYXdhaXQgaWRlbnRpZmllcnMgYXJlIGFsbG93ZWQgdG8gYXBwZWFyIGF0IHRoZSB0b3AtbGV2ZWwgc2NvcGUsXG4gIC8vIGJ1dCB0aGV5IGFyZSBzdGlsbCBub3QgYWxsb3dlZCBpbiBub24tYXN5bmMgZnVuY3Rpb25zLlxuICBhbGxvd0F3YWl0T3V0c2lkZUZ1bmN0aW9uOiBudWxsLFxuICAvLyBXaGVuIGVuYWJsZWQsIHN1cGVyIGlkZW50aWZpZXJzIGFyZSBub3QgY29uc3RyYWluZWQgdG9cbiAgLy8gYXBwZWFyaW5nIGluIG1ldGhvZHMgYW5kIGRvIG5vdCByYWlzZSBhbiBlcnJvciB3aGVuIHRoZXkgYXBwZWFyIGVsc2V3aGVyZS5cbiAgYWxsb3dTdXBlck91dHNpZGVNZXRob2Q6IG51bGwsXG4gIC8vIFdoZW4gZW5hYmxlZCwgaGFzaGJhbmcgZGlyZWN0aXZlIGluIHRoZSBiZWdpbm5pbmcgb2YgZmlsZSBpc1xuICAvLyBhbGxvd2VkIGFuZCB0cmVhdGVkIGFzIGEgbGluZSBjb21tZW50LiBFbmFibGVkIGJ5IGRlZmF1bHQgd2hlblxuICAvLyBgZWNtYVZlcnNpb25gID49IDIwMjMuXG4gIGFsbG93SGFzaEJhbmc6IGZhbHNlLFxuICAvLyBCeSBkZWZhdWx0LCB0aGUgcGFyc2VyIHdpbGwgdmVyaWZ5IHRoYXQgcHJpdmF0ZSBwcm9wZXJ0aWVzIGFyZVxuICAvLyBvbmx5IHVzZWQgaW4gcGxhY2VzIHdoZXJlIHRoZXkgYXJlIHZhbGlkIGFuZCBoYXZlIGJlZW4gZGVjbGFyZWQuXG4gIC8vIFNldCB0aGlzIHRvIGZhbHNlIHRvIHR1cm4gc3VjaCBjaGVja3Mgb2ZmLlxuICBjaGVja1ByaXZhdGVGaWVsZHM6IHRydWUsXG4gIC8vIFdoZW4gYGxvY2F0aW9uc2AgaXMgb24sIGBsb2NgIHByb3BlcnRpZXMgaG9sZGluZyBvYmplY3RzIHdpdGhcbiAgLy8gYHN0YXJ0YCBhbmQgYGVuZGAgcHJvcGVydGllcyBpbiBge2xpbmUsIGNvbHVtbn1gIGZvcm0gKHdpdGhcbiAgLy8gbGluZSBiZWluZyAxLWJhc2VkIGFuZCBjb2x1bW4gMC1iYXNlZCkgd2lsbCBiZSBhdHRhY2hlZCB0byB0aGVcbiAgLy8gbm9kZXMuXG4gIGxvY2F0aW9uczogZmFsc2UsXG4gIC8vIEEgZnVuY3Rpb24gY2FuIGJlIHBhc3NlZCBhcyBgb25Ub2tlbmAgb3B0aW9uLCB3aGljaCB3aWxsXG4gIC8vIGNhdXNlIEFjb3JuIHRvIGNhbGwgdGhhdCBmdW5jdGlvbiB3aXRoIG9iamVjdCBpbiB0aGUgc2FtZVxuICAvLyBmb3JtYXQgYXMgdG9rZW5zIHJldHVybmVkIGZyb20gYHRva2VuaXplcigpLmdldFRva2VuKClgLiBOb3RlXG4gIC8vIHRoYXQgeW91IGFyZSBub3QgYWxsb3dlZCB0byBjYWxsIHRoZSBwYXJzZXIgZnJvbSB0aGVcbiAgLy8gY2FsbGJhY2tcdTIwMTR0aGF0IHdpbGwgY29ycnVwdCBpdHMgaW50ZXJuYWwgc3RhdGUuXG4gIG9uVG9rZW46IG51bGwsXG4gIC8vIEEgZnVuY3Rpb24gY2FuIGJlIHBhc3NlZCBhcyBgb25Db21tZW50YCBvcHRpb24sIHdoaWNoIHdpbGxcbiAgLy8gY2F1c2UgQWNvcm4gdG8gY2FsbCB0aGF0IGZ1bmN0aW9uIHdpdGggYChibG9jaywgdGV4dCwgc3RhcnQsXG4gIC8vIGVuZClgIHBhcmFtZXRlcnMgd2hlbmV2ZXIgYSBjb21tZW50IGlzIHNraXBwZWQuIGBibG9ja2AgaXMgYVxuICAvLyBib29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0aGlzIGlzIGEgYmxvY2sgKGAvKiAqL2ApIGNvbW1lbnQsXG4gIC8vIGB0ZXh0YCBpcyB0aGUgY29udGVudCBvZiB0aGUgY29tbWVudCwgYW5kIGBzdGFydGAgYW5kIGBlbmRgIGFyZVxuICAvLyBjaGFyYWN0ZXIgb2Zmc2V0cyB0aGF0IGRlbm90ZSB0aGUgc3RhcnQgYW5kIGVuZCBvZiB0aGUgY29tbWVudC5cbiAgLy8gV2hlbiB0aGUgYGxvY2F0aW9uc2Agb3B0aW9uIGlzIG9uLCB0d28gbW9yZSBwYXJhbWV0ZXJzIGFyZVxuICAvLyBwYXNzZWQsIHRoZSBmdWxsIGB7bGluZSwgY29sdW1ufWAgbG9jYXRpb25zIG9mIHRoZSBzdGFydCBhbmRcbiAgLy8gZW5kIG9mIHRoZSBjb21tZW50cy4gTm90ZSB0aGF0IHlvdSBhcmUgbm90IGFsbG93ZWQgdG8gY2FsbCB0aGVcbiAgLy8gcGFyc2VyIGZyb20gdGhlIGNhbGxiYWNrXHUyMDE0dGhhdCB3aWxsIGNvcnJ1cHQgaXRzIGludGVybmFsIHN0YXRlLlxuICAvLyBXaGVuIHRoaXMgb3B0aW9uIGhhcyBhbiBhcnJheSBhcyB2YWx1ZSwgb2JqZWN0cyByZXByZXNlbnRpbmcgdGhlXG4gIC8vIGNvbW1lbnRzIGFyZSBwdXNoZWQgdG8gaXQuXG4gIG9uQ29tbWVudDogbnVsbCxcbiAgLy8gTm9kZXMgaGF2ZSB0aGVpciBzdGFydCBhbmQgZW5kIGNoYXJhY3RlcnMgb2Zmc2V0cyByZWNvcmRlZCBpblxuICAvLyBgc3RhcnRgIGFuZCBgZW5kYCBwcm9wZXJ0aWVzIChkaXJlY3RseSBvbiB0aGUgbm9kZSwgcmF0aGVyIHRoYW5cbiAgLy8gdGhlIGBsb2NgIG9iamVjdCwgd2hpY2ggaG9sZHMgbGluZS9jb2x1bW4gZGF0YS4gVG8gYWxzbyBhZGQgYVxuICAvLyBbc2VtaS1zdGFuZGFyZGl6ZWRdW3JhbmdlXSBgcmFuZ2VgIHByb3BlcnR5IGhvbGRpbmcgYSBgW3N0YXJ0LFxuICAvLyBlbmRdYCBhcnJheSB3aXRoIHRoZSBzYW1lIG51bWJlcnMsIHNldCB0aGUgYHJhbmdlc2Agb3B0aW9uIHRvXG4gIC8vIGB0cnVlYC5cbiAgLy9cbiAgLy8gW3JhbmdlXTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NzQ1Njc4XG4gIHJhbmdlczogZmFsc2UsXG4gIC8vIEl0IGlzIHBvc3NpYmxlIHRvIHBhcnNlIG11bHRpcGxlIGZpbGVzIGludG8gYSBzaW5nbGUgQVNUIGJ5XG4gIC8vIHBhc3NpbmcgdGhlIHRyZWUgcHJvZHVjZWQgYnkgcGFyc2luZyB0aGUgZmlyc3QgZmlsZSBhc1xuICAvLyBgcHJvZ3JhbWAgb3B0aW9uIGluIHN1YnNlcXVlbnQgcGFyc2VzLiBUaGlzIHdpbGwgYWRkIHRoZVxuICAvLyB0b3BsZXZlbCBmb3JtcyBvZiB0aGUgcGFyc2VkIGZpbGUgdG8gdGhlIGBQcm9ncmFtYCAodG9wKSBub2RlXG4gIC8vIG9mIGFuIGV4aXN0aW5nIHBhcnNlIHRyZWUuXG4gIHByb2dyYW06IG51bGwsXG4gIC8vIFdoZW4gYGxvY2F0aW9uc2AgaXMgb24sIHlvdSBjYW4gcGFzcyB0aGlzIHRvIHJlY29yZCB0aGUgc291cmNlXG4gIC8vIGZpbGUgaW4gZXZlcnkgbm9kZSdzIGBsb2NgIG9iamVjdC5cbiAgc291cmNlRmlsZTogbnVsbCxcbiAgLy8gVGhpcyB2YWx1ZSwgaWYgZ2l2ZW4sIGlzIHN0b3JlZCBpbiBldmVyeSBub2RlLCB3aGV0aGVyXG4gIC8vIGBsb2NhdGlvbnNgIGlzIG9uIG9yIG9mZi5cbiAgZGlyZWN0U291cmNlRmlsZTogbnVsbCxcbiAgLy8gV2hlbiBlbmFibGVkLCBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb25zIGFyZSByZXByZXNlbnRlZCBieVxuICAvLyAobm9uLXN0YW5kYXJkKSBQYXJlbnRoZXNpemVkRXhwcmVzc2lvbiBub2Rlc1xuICBwcmVzZXJ2ZVBhcmVuczogZmFsc2Vcbn07XG5cbi8vIEludGVycHJldCBhbmQgZGVmYXVsdCBhbiBvcHRpb25zIG9iamVjdFxuXG52YXIgd2FybmVkQWJvdXRFY21hVmVyc2lvbiA9IGZhbHNlO1xuXG5mdW5jdGlvbiBnZXRPcHRpb25zKG9wdHMpIHtcbiAgdmFyIG9wdGlvbnMgPSB7fTtcblxuICBmb3IgKHZhciBvcHQgaW4gZGVmYXVsdE9wdGlvbnMpXG4gICAgeyBvcHRpb25zW29wdF0gPSBvcHRzICYmIGhhc093bihvcHRzLCBvcHQpID8gb3B0c1tvcHRdIDogZGVmYXVsdE9wdGlvbnNbb3B0XTsgfVxuXG4gIGlmIChvcHRpb25zLmVjbWFWZXJzaW9uID09PSBcImxhdGVzdFwiKSB7XG4gICAgb3B0aW9ucy5lY21hVmVyc2lvbiA9IDFlODtcbiAgfSBlbHNlIGlmIChvcHRpb25zLmVjbWFWZXJzaW9uID09IG51bGwpIHtcbiAgICBpZiAoIXdhcm5lZEFib3V0RWNtYVZlcnNpb24gJiYgdHlwZW9mIGNvbnNvbGUgPT09IFwib2JqZWN0XCIgJiYgY29uc29sZS53YXJuKSB7XG4gICAgICB3YXJuZWRBYm91dEVjbWFWZXJzaW9uID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUud2FybihcIlNpbmNlIEFjb3JuIDguMC4wLCBvcHRpb25zLmVjbWFWZXJzaW9uIGlzIHJlcXVpcmVkLlxcbkRlZmF1bHRpbmcgdG8gMjAyMCwgYnV0IHRoaXMgd2lsbCBzdG9wIHdvcmtpbmcgaW4gdGhlIGZ1dHVyZS5cIik7XG4gICAgfVxuICAgIG9wdGlvbnMuZWNtYVZlcnNpb24gPSAxMTtcbiAgfSBlbHNlIGlmIChvcHRpb25zLmVjbWFWZXJzaW9uID49IDIwMTUpIHtcbiAgICBvcHRpb25zLmVjbWFWZXJzaW9uIC09IDIwMDk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5hbGxvd1Jlc2VydmVkID09IG51bGwpXG4gICAgeyBvcHRpb25zLmFsbG93UmVzZXJ2ZWQgPSBvcHRpb25zLmVjbWFWZXJzaW9uIDwgNTsgfVxuXG4gIGlmICghb3B0cyB8fCBvcHRzLmFsbG93SGFzaEJhbmcgPT0gbnVsbClcbiAgICB7IG9wdGlvbnMuYWxsb3dIYXNoQmFuZyA9IG9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTQ7IH1cblxuICBpZiAoaXNBcnJheShvcHRpb25zLm9uVG9rZW4pKSB7XG4gICAgdmFyIHRva2VucyA9IG9wdGlvbnMub25Ub2tlbjtcbiAgICBvcHRpb25zLm9uVG9rZW4gPSBmdW5jdGlvbiAodG9rZW4pIHsgcmV0dXJuIHRva2Vucy5wdXNoKHRva2VuKTsgfTtcbiAgfVxuICBpZiAoaXNBcnJheShvcHRpb25zLm9uQ29tbWVudCkpXG4gICAgeyBvcHRpb25zLm9uQ29tbWVudCA9IHB1c2hDb21tZW50KG9wdGlvbnMsIG9wdGlvbnMub25Db21tZW50KTsgfVxuXG4gIGlmIChvcHRpb25zLnNvdXJjZVR5cGUgPT09IFwiY29tbW9uanNcIiAmJiBvcHRpb25zLmFsbG93QXdhaXRPdXRzaWRlRnVuY3Rpb24pXG4gICAgeyB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgdXNlIGFsbG93QXdhaXRPdXRzaWRlRnVuY3Rpb24gd2l0aCBzb3VyY2VUeXBlOiBjb21tb25qc1wiKSB9XG5cbiAgcmV0dXJuIG9wdGlvbnNcbn1cblxuZnVuY3Rpb24gcHVzaENvbW1lbnQob3B0aW9ucywgYXJyYXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGJsb2NrLCB0ZXh0LCBzdGFydCwgZW5kLCBzdGFydExvYywgZW5kTG9jKSB7XG4gICAgdmFyIGNvbW1lbnQgPSB7XG4gICAgICB0eXBlOiBibG9jayA/IFwiQmxvY2tcIiA6IFwiTGluZVwiLFxuICAgICAgdmFsdWU6IHRleHQsXG4gICAgICBzdGFydDogc3RhcnQsXG4gICAgICBlbmQ6IGVuZFxuICAgIH07XG4gICAgaWYgKG9wdGlvbnMubG9jYXRpb25zKVxuICAgICAgeyBjb21tZW50LmxvYyA9IG5ldyBTb3VyY2VMb2NhdGlvbih0aGlzLCBzdGFydExvYywgZW5kTG9jKTsgfVxuICAgIGlmIChvcHRpb25zLnJhbmdlcylcbiAgICAgIHsgY29tbWVudC5yYW5nZSA9IFtzdGFydCwgZW5kXTsgfVxuICAgIGFycmF5LnB1c2goY29tbWVudCk7XG4gIH1cbn1cblxuLy8gRWFjaCBzY29wZSBnZXRzIGEgYml0c2V0IHRoYXQgbWF5IGNvbnRhaW4gdGhlc2UgZmxhZ3NcbnZhclxuICAgIFNDT1BFX1RPUCA9IDEsXG4gICAgU0NPUEVfRlVOQ1RJT04gPSAyLFxuICAgIFNDT1BFX0FTWU5DID0gNCxcbiAgICBTQ09QRV9HRU5FUkFUT1IgPSA4LFxuICAgIFNDT1BFX0FSUk9XID0gMTYsXG4gICAgU0NPUEVfU0lNUExFX0NBVENIID0gMzIsXG4gICAgU0NPUEVfU1VQRVIgPSA2NCxcbiAgICBTQ09QRV9ESVJFQ1RfU1VQRVIgPSAxMjgsXG4gICAgU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLID0gMjU2LFxuICAgIFNDT1BFX0NMQVNTX0ZJRUxEX0lOSVQgPSA1MTIsXG4gICAgU0NPUEVfU1dJVENIID0gMTAyNCxcbiAgICBTQ09QRV9WQVIgPSBTQ09QRV9UT1AgfCBTQ09QRV9GVU5DVElPTiB8IFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSztcblxuZnVuY3Rpb24gZnVuY3Rpb25GbGFncyhhc3luYywgZ2VuZXJhdG9yKSB7XG4gIHJldHVybiBTQ09QRV9GVU5DVElPTiB8IChhc3luYyA/IFNDT1BFX0FTWU5DIDogMCkgfCAoZ2VuZXJhdG9yID8gU0NPUEVfR0VORVJBVE9SIDogMClcbn1cblxuLy8gVXNlZCBpbiBjaGVja0xWYWwqIGFuZCBkZWNsYXJlTmFtZSB0byBkZXRlcm1pbmUgdGhlIHR5cGUgb2YgYSBiaW5kaW5nXG52YXJcbiAgICBCSU5EX05PTkUgPSAwLCAvLyBOb3QgYSBiaW5kaW5nXG4gICAgQklORF9WQVIgPSAxLCAvLyBWYXItc3R5bGUgYmluZGluZ1xuICAgIEJJTkRfTEVYSUNBTCA9IDIsIC8vIExldC0gb3IgY29uc3Qtc3R5bGUgYmluZGluZ1xuICAgIEJJTkRfRlVOQ1RJT04gPSAzLCAvLyBGdW5jdGlvbiBkZWNsYXJhdGlvblxuICAgIEJJTkRfU0lNUExFX0NBVENIID0gNCwgLy8gU2ltcGxlIChpZGVudGlmaWVyIHBhdHRlcm4pIGNhdGNoIGJpbmRpbmdcbiAgICBCSU5EX09VVFNJREUgPSA1OyAvLyBTcGVjaWFsIGNhc2UgZm9yIGZ1bmN0aW9uIG5hbWVzIGFzIGJvdW5kIGluc2lkZSB0aGUgZnVuY3Rpb25cblxudmFyIFBhcnNlciA9IGZ1bmN0aW9uIFBhcnNlcihvcHRpb25zLCBpbnB1dCwgc3RhcnRQb3MpIHtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyA9IGdldE9wdGlvbnMob3B0aW9ucyk7XG4gIHRoaXMuc291cmNlRmlsZSA9IG9wdGlvbnMuc291cmNlRmlsZTtcbiAgdGhpcy5rZXl3b3JkcyA9IHdvcmRzUmVnZXhwKGtleXdvcmRzJDFbb3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ID8gNiA6IG9wdGlvbnMuc291cmNlVHlwZSA9PT0gXCJtb2R1bGVcIiA/IFwiNW1vZHVsZVwiIDogNV0pO1xuICB2YXIgcmVzZXJ2ZWQgPSBcIlwiO1xuICBpZiAob3B0aW9ucy5hbGxvd1Jlc2VydmVkICE9PSB0cnVlKSB7XG4gICAgcmVzZXJ2ZWQgPSByZXNlcnZlZFdvcmRzW29wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiA/IDYgOiBvcHRpb25zLmVjbWFWZXJzaW9uID09PSA1ID8gNSA6IDNdO1xuICAgIGlmIChvcHRpb25zLnNvdXJjZVR5cGUgPT09IFwibW9kdWxlXCIpIHsgcmVzZXJ2ZWQgKz0gXCIgYXdhaXRcIjsgfVxuICB9XG4gIHRoaXMucmVzZXJ2ZWRXb3JkcyA9IHdvcmRzUmVnZXhwKHJlc2VydmVkKTtcbiAgdmFyIHJlc2VydmVkU3RyaWN0ID0gKHJlc2VydmVkID8gcmVzZXJ2ZWQgKyBcIiBcIiA6IFwiXCIpICsgcmVzZXJ2ZWRXb3Jkcy5zdHJpY3Q7XG4gIHRoaXMucmVzZXJ2ZWRXb3Jkc1N0cmljdCA9IHdvcmRzUmVnZXhwKHJlc2VydmVkU3RyaWN0KTtcbiAgdGhpcy5yZXNlcnZlZFdvcmRzU3RyaWN0QmluZCA9IHdvcmRzUmVnZXhwKHJlc2VydmVkU3RyaWN0ICsgXCIgXCIgKyByZXNlcnZlZFdvcmRzLnN0cmljdEJpbmQpO1xuICB0aGlzLmlucHV0ID0gU3RyaW5nKGlucHV0KTtcblxuICAvLyBVc2VkIHRvIHNpZ25hbCB0byBjYWxsZXJzIG9mIGByZWFkV29yZDFgIHdoZXRoZXIgdGhlIHdvcmRcbiAgLy8gY29udGFpbmVkIGFueSBlc2NhcGUgc2VxdWVuY2VzLiBUaGlzIGlzIG5lZWRlZCBiZWNhdXNlIHdvcmRzIHdpdGhcbiAgLy8gZXNjYXBlIHNlcXVlbmNlcyBtdXN0IG5vdCBiZSBpbnRlcnByZXRlZCBhcyBrZXl3b3Jkcy5cbiAgdGhpcy5jb250YWluc0VzYyA9IGZhbHNlO1xuXG4gIC8vIFNldCB1cCB0b2tlbiBzdGF0ZVxuXG4gIC8vIFRoZSBjdXJyZW50IHBvc2l0aW9uIG9mIHRoZSB0b2tlbml6ZXIgaW4gdGhlIGlucHV0LlxuICBpZiAoc3RhcnRQb3MpIHtcbiAgICB0aGlzLnBvcyA9IHN0YXJ0UG9zO1xuICAgIHRoaXMubGluZVN0YXJ0ID0gdGhpcy5pbnB1dC5sYXN0SW5kZXhPZihcIlxcblwiLCBzdGFydFBvcyAtIDEpICsgMTtcbiAgICB0aGlzLmN1ckxpbmUgPSB0aGlzLmlucHV0LnNsaWNlKDAsIHRoaXMubGluZVN0YXJ0KS5zcGxpdChsaW5lQnJlYWspLmxlbmd0aDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBvcyA9IHRoaXMubGluZVN0YXJ0ID0gMDtcbiAgICB0aGlzLmN1ckxpbmUgPSAxO1xuICB9XG5cbiAgLy8gUHJvcGVydGllcyBvZiB0aGUgY3VycmVudCB0b2tlbjpcbiAgLy8gSXRzIHR5cGVcbiAgdGhpcy50eXBlID0gdHlwZXMkMS5lb2Y7XG4gIC8vIEZvciB0b2tlbnMgdGhhdCBpbmNsdWRlIG1vcmUgaW5mb3JtYXRpb24gdGhhbiB0aGVpciB0eXBlLCB0aGUgdmFsdWVcbiAgdGhpcy52YWx1ZSA9IG51bGw7XG4gIC8vIEl0cyBzdGFydCBhbmQgZW5kIG9mZnNldFxuICB0aGlzLnN0YXJ0ID0gdGhpcy5lbmQgPSB0aGlzLnBvcztcbiAgLy8gQW5kLCBpZiBsb2NhdGlvbnMgYXJlIHVzZWQsIHRoZSB7bGluZSwgY29sdW1ufSBvYmplY3RcbiAgLy8gY29ycmVzcG9uZGluZyB0byB0aG9zZSBvZmZzZXRzXG4gIHRoaXMuc3RhcnRMb2MgPSB0aGlzLmVuZExvYyA9IHRoaXMuY3VyUG9zaXRpb24oKTtcblxuICAvLyBQb3NpdGlvbiBpbmZvcm1hdGlvbiBmb3IgdGhlIHByZXZpb3VzIHRva2VuXG4gIHRoaXMubGFzdFRva0VuZExvYyA9IHRoaXMubGFzdFRva1N0YXJ0TG9jID0gbnVsbDtcbiAgdGhpcy5sYXN0VG9rU3RhcnQgPSB0aGlzLmxhc3RUb2tFbmQgPSB0aGlzLnBvcztcblxuICAvLyBUaGUgY29udGV4dCBzdGFjayBpcyB1c2VkIHRvIHN1cGVyZmljaWFsbHkgdHJhY2sgc3ludGFjdGljXG4gIC8vIGNvbnRleHQgdG8gcHJlZGljdCB3aGV0aGVyIGEgcmVndWxhciBleHByZXNzaW9uIGlzIGFsbG93ZWQgaW4gYVxuICAvLyBnaXZlbiBwb3NpdGlvbi5cbiAgdGhpcy5jb250ZXh0ID0gdGhpcy5pbml0aWFsQ29udGV4dCgpO1xuICB0aGlzLmV4cHJBbGxvd2VkID0gdHJ1ZTtcblxuICAvLyBGaWd1cmUgb3V0IGlmIGl0J3MgYSBtb2R1bGUgY29kZS5cbiAgdGhpcy5pbk1vZHVsZSA9IG9wdGlvbnMuc291cmNlVHlwZSA9PT0gXCJtb2R1bGVcIjtcbiAgdGhpcy5zdHJpY3QgPSB0aGlzLmluTW9kdWxlIHx8IHRoaXMuc3RyaWN0RGlyZWN0aXZlKHRoaXMucG9zKTtcblxuICAvLyBVc2VkIHRvIHNpZ25pZnkgdGhlIHN0YXJ0IG9mIGEgcG90ZW50aWFsIGFycm93IGZ1bmN0aW9uXG4gIHRoaXMucG90ZW50aWFsQXJyb3dBdCA9IC0xO1xuICB0aGlzLnBvdGVudGlhbEFycm93SW5Gb3JBd2FpdCA9IGZhbHNlO1xuXG4gIC8vIFBvc2l0aW9ucyB0byBkZWxheWVkLWNoZWNrIHRoYXQgeWllbGQvYXdhaXQgZG9lcyBub3QgZXhpc3QgaW4gZGVmYXVsdCBwYXJhbWV0ZXJzLlxuICB0aGlzLnlpZWxkUG9zID0gdGhpcy5hd2FpdFBvcyA9IHRoaXMuYXdhaXRJZGVudFBvcyA9IDA7XG4gIC8vIExhYmVscyBpbiBzY29wZS5cbiAgdGhpcy5sYWJlbHMgPSBbXTtcbiAgLy8gVGh1cy1mYXIgdW5kZWZpbmVkIGV4cG9ydHMuXG4gIHRoaXMudW5kZWZpbmVkRXhwb3J0cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLy8gSWYgZW5hYmxlZCwgc2tpcCBsZWFkaW5nIGhhc2hiYW5nIGxpbmUuXG4gIGlmICh0aGlzLnBvcyA9PT0gMCAmJiBvcHRpb25zLmFsbG93SGFzaEJhbmcgJiYgdGhpcy5pbnB1dC5zbGljZSgwLCAyKSA9PT0gXCIjIVwiKVxuICAgIHsgdGhpcy5za2lwTGluZUNvbW1lbnQoMik7IH1cblxuICAvLyBTY29wZSB0cmFja2luZyBmb3IgZHVwbGljYXRlIHZhcmlhYmxlIG5hbWVzIChzZWUgc2NvcGUuanMpXG4gIHRoaXMuc2NvcGVTdGFjayA9IFtdO1xuICB0aGlzLmVudGVyU2NvcGUoXG4gICAgdGhpcy5vcHRpb25zLnNvdXJjZVR5cGUgPT09IFwiY29tbW9uanNcIlxuICAgICAgLy8gSW4gY29tbW9uanMsIHRoZSB0b3AtbGV2ZWwgc2NvcGUgYmVoYXZlcyBsaWtlIGEgZnVuY3Rpb24gc2NvcGVcbiAgICAgID8gU0NPUEVfRlVOQ1RJT05cbiAgICAgIDogU0NPUEVfVE9QXG4gICk7XG5cbiAgLy8gRm9yIFJlZ0V4cCB2YWxpZGF0aW9uXG4gIHRoaXMucmVnZXhwU3RhdGUgPSBudWxsO1xuXG4gIC8vIFRoZSBzdGFjayBvZiBwcml2YXRlIG5hbWVzLlxuICAvLyBFYWNoIGVsZW1lbnQgaGFzIHR3byBwcm9wZXJ0aWVzOiAnZGVjbGFyZWQnIGFuZCAndXNlZCcuXG4gIC8vIFdoZW4gaXQgZXhpdGVkIGZyb20gdGhlIG91dGVybW9zdCBjbGFzcyBkZWZpbml0aW9uLCBhbGwgdXNlZCBwcml2YXRlIG5hbWVzIG11c3QgYmUgZGVjbGFyZWQuXG4gIHRoaXMucHJpdmF0ZU5hbWVTdGFjayA9IFtdO1xufTtcblxudmFyIHByb3RvdHlwZUFjY2Vzc29ycyA9IHsgaW5GdW5jdGlvbjogeyBjb25maWd1cmFibGU6IHRydWUgfSxpbkdlbmVyYXRvcjogeyBjb25maWd1cmFibGU6IHRydWUgfSxpbkFzeW5jOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGNhbkF3YWl0OiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGFsbG93UmV0dXJuOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGFsbG93U3VwZXI6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0sYWxsb3dEaXJlY3RTdXBlcjogeyBjb25maWd1cmFibGU6IHRydWUgfSx0cmVhdEZ1bmN0aW9uc0FzVmFyOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGFsbG93TmV3RG90VGFyZ2V0OiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGFsbG93VXNpbmc6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0saW5DbGFzc1N0YXRpY0Jsb2NrOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH07XG5cblBhcnNlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZSAoKSB7XG4gIHZhciBub2RlID0gdGhpcy5vcHRpb25zLnByb2dyYW0gfHwgdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0VG9rZW4oKTtcbiAgcmV0dXJuIHRoaXMucGFyc2VUb3BMZXZlbChub2RlKVxufTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmluRnVuY3Rpb24uZ2V0ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gKHRoaXMuY3VycmVudFZhclNjb3BlKCkuZmxhZ3MgJiBTQ09QRV9GVU5DVElPTikgPiAwIH07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5pbkdlbmVyYXRvci5nZXQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAodGhpcy5jdXJyZW50VmFyU2NvcGUoKS5mbGFncyAmIFNDT1BFX0dFTkVSQVRPUikgPiAwIH07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5pbkFzeW5jLmdldCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICh0aGlzLmN1cnJlbnRWYXJTY29wZSgpLmZsYWdzICYgU0NPUEVfQVNZTkMpID4gMCB9O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuY2FuQXdhaXQuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gdGhpcy5zY29wZVN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIHJlZiA9IHRoaXMuc2NvcGVTdGFja1tpXTtcbiAgICAgIHZhciBmbGFncyA9IHJlZi5mbGFncztcbiAgICBpZiAoZmxhZ3MgJiAoU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLIHwgU0NPUEVfQ0xBU1NfRklFTERfSU5JVCkpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICBpZiAoZmxhZ3MgJiBTQ09QRV9GVU5DVElPTikgeyByZXR1cm4gKGZsYWdzICYgU0NPUEVfQVNZTkMpID4gMCB9XG4gIH1cbiAgcmV0dXJuICh0aGlzLmluTW9kdWxlICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMykgfHwgdGhpcy5vcHRpb25zLmFsbG93QXdhaXRPdXRzaWRlRnVuY3Rpb25cbn07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5hbGxvd1JldHVybi5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmluRnVuY3Rpb24pIHsgcmV0dXJuIHRydWUgfVxuICBpZiAodGhpcy5vcHRpb25zLmFsbG93UmV0dXJuT3V0c2lkZUZ1bmN0aW9uICYmIHRoaXMuY3VycmVudFZhclNjb3BlKCkuZmxhZ3MgJiBTQ09QRV9UT1ApIHsgcmV0dXJuIHRydWUgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5hbGxvd1N1cGVyLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlZiA9IHRoaXMuY3VycmVudFRoaXNTY29wZSgpO1xuICAgIHZhciBmbGFncyA9IHJlZi5mbGFncztcbiAgcmV0dXJuIChmbGFncyAmIFNDT1BFX1NVUEVSKSA+IDAgfHwgdGhpcy5vcHRpb25zLmFsbG93U3VwZXJPdXRzaWRlTWV0aG9kXG59O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuYWxsb3dEaXJlY3RTdXBlci5nZXQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAodGhpcy5jdXJyZW50VGhpc1Njb3BlKCkuZmxhZ3MgJiBTQ09QRV9ESVJFQ1RfU1VQRVIpID4gMCB9O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMudHJlYXRGdW5jdGlvbnNBc1Zhci5nZXQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLnRyZWF0RnVuY3Rpb25zQXNWYXJJblNjb3BlKHRoaXMuY3VycmVudFNjb3BlKCkpIH07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5hbGxvd05ld0RvdFRhcmdldC5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGkgPSB0aGlzLnNjb3BlU3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgcmVmID0gdGhpcy5zY29wZVN0YWNrW2ldO1xuICAgICAgdmFyIGZsYWdzID0gcmVmLmZsYWdzO1xuICAgIGlmIChmbGFncyAmIChTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0sgfCBTQ09QRV9DTEFTU19GSUVMRF9JTklUKSB8fFxuICAgICAgICAoKGZsYWdzICYgU0NPUEVfRlVOQ1RJT04pICYmICEoZmxhZ3MgJiBTQ09QRV9BUlJPVykpKSB7IHJldHVybiB0cnVlIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5hbGxvd1VzaW5nLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlZiA9IHRoaXMuY3VycmVudFNjb3BlKCk7XG4gICAgdmFyIGZsYWdzID0gcmVmLmZsYWdzO1xuICBpZiAoZmxhZ3MgJiBTQ09QRV9TV0lUQ0gpIHsgcmV0dXJuIGZhbHNlIH1cbiAgaWYgKCF0aGlzLmluTW9kdWxlICYmIGZsYWdzICYgU0NPUEVfVE9QKSB7IHJldHVybiBmYWxzZSB9XG4gIHJldHVybiB0cnVlXG59O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuaW5DbGFzc1N0YXRpY0Jsb2NrLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICh0aGlzLmN1cnJlbnRWYXJTY29wZSgpLmZsYWdzICYgU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLKSA+IDBcbn07XG5cblBhcnNlci5leHRlbmQgPSBmdW5jdGlvbiBleHRlbmQgKCkge1xuICAgIHZhciBwbHVnaW5zID0gW10sIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgd2hpbGUgKCBsZW4tLSApIHBsdWdpbnNbIGxlbiBdID0gYXJndW1lbnRzWyBsZW4gXTtcblxuICB2YXIgY2xzID0gdGhpcztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7IGNscyA9IHBsdWdpbnNbaV0oY2xzKTsgfVxuICByZXR1cm4gY2xzXG59O1xuXG5QYXJzZXIucGFyc2UgPSBmdW5jdGlvbiBwYXJzZSAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyB0aGlzKG9wdGlvbnMsIGlucHV0KS5wYXJzZSgpXG59O1xuXG5QYXJzZXIucGFyc2VFeHByZXNzaW9uQXQgPSBmdW5jdGlvbiBwYXJzZUV4cHJlc3Npb25BdCAoaW5wdXQsIHBvcywgb3B0aW9ucykge1xuICB2YXIgcGFyc2VyID0gbmV3IHRoaXMob3B0aW9ucywgaW5wdXQsIHBvcyk7XG4gIHBhcnNlci5uZXh0VG9rZW4oKTtcbiAgcmV0dXJuIHBhcnNlci5wYXJzZUV4cHJlc3Npb24oKVxufTtcblxuUGFyc2VyLnRva2VuaXplciA9IGZ1bmN0aW9uIHRva2VuaXplciAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyB0aGlzKG9wdGlvbnMsIGlucHV0KVxufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoIFBhcnNlci5wcm90b3R5cGUsIHByb3RvdHlwZUFjY2Vzc29ycyApO1xuXG52YXIgcHAkOSA9IFBhcnNlci5wcm90b3R5cGU7XG5cbi8vICMjIFBhcnNlciB1dGlsaXRpZXNcblxudmFyIGxpdGVyYWwgPSAvXig/OicoKD86XFxcXFteXXxbXidcXFxcXSkqPyknfFwiKCg/OlxcXFxbXl18W15cIlxcXFxdKSo/KVwiKS87XG5wcCQ5LnN0cmljdERpcmVjdGl2ZSA9IGZ1bmN0aW9uKHN0YXJ0KSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA1KSB7IHJldHVybiBmYWxzZSB9XG4gIGZvciAoOzspIHtcbiAgICAvLyBUcnkgdG8gZmluZCBzdHJpbmcgbGl0ZXJhbC5cbiAgICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSBzdGFydDtcbiAgICBzdGFydCArPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpWzBdLmxlbmd0aDtcbiAgICB2YXIgbWF0Y2ggPSBsaXRlcmFsLmV4ZWModGhpcy5pbnB1dC5zbGljZShzdGFydCkpO1xuICAgIGlmICghbWF0Y2gpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICBpZiAoKG1hdGNoWzFdIHx8IG1hdGNoWzJdKSA9PT0gXCJ1c2Ugc3RyaWN0XCIpIHtcbiAgICAgIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHN0YXJ0ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgdmFyIHNwYWNlQWZ0ZXIgPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpLCBlbmQgPSBzcGFjZUFmdGVyLmluZGV4ICsgc3BhY2VBZnRlclswXS5sZW5ndGg7XG4gICAgICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckF0KGVuZCk7XG4gICAgICByZXR1cm4gbmV4dCA9PT0gXCI7XCIgfHwgbmV4dCA9PT0gXCJ9XCIgfHxcbiAgICAgICAgKGxpbmVCcmVhay50ZXN0KHNwYWNlQWZ0ZXJbMF0pICYmXG4gICAgICAgICAhKC9bKGAuWytcXC0vKiU8Pj0sP14mXS8udGVzdChuZXh0KSB8fCBuZXh0ID09PSBcIiFcIiAmJiB0aGlzLmlucHV0LmNoYXJBdChlbmQgKyAxKSA9PT0gXCI9XCIpKVxuICAgIH1cbiAgICBzdGFydCArPSBtYXRjaFswXS5sZW5ndGg7XG5cbiAgICAvLyBTa2lwIHNlbWljb2xvbiwgaWYgYW55LlxuICAgIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgIHN0YXJ0ICs9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dClbMF0ubGVuZ3RoO1xuICAgIGlmICh0aGlzLmlucHV0W3N0YXJ0XSA9PT0gXCI7XCIpXG4gICAgICB7IHN0YXJ0Kys7IH1cbiAgfVxufTtcblxuLy8gUHJlZGljYXRlIHRoYXQgdGVzdHMgd2hldGhlciB0aGUgbmV4dCB0b2tlbiBpcyBvZiB0aGUgZ2l2ZW5cbi8vIHR5cGUsIGFuZCBpZiB5ZXMsIGNvbnN1bWVzIGl0IGFzIGEgc2lkZSBlZmZlY3QuXG5cbnBwJDkuZWF0ID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlKSB7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufTtcblxuLy8gVGVzdHMgd2hldGhlciBwYXJzZWQgdG9rZW4gaXMgYSBjb250ZXh0dWFsIGtleXdvcmQuXG5cbnBwJDkuaXNDb250ZXh0dWFsID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gdGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUgJiYgdGhpcy52YWx1ZSA9PT0gbmFtZSAmJiAhdGhpcy5jb250YWluc0VzY1xufTtcblxuLy8gQ29uc3VtZXMgY29udGV4dHVhbCBrZXl3b3JkIGlmIHBvc3NpYmxlLlxuXG5wcCQ5LmVhdENvbnRleHR1YWwgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmICghdGhpcy5pc0NvbnRleHR1YWwobmFtZSkpIHsgcmV0dXJuIGZhbHNlIH1cbiAgdGhpcy5uZXh0KCk7XG4gIHJldHVybiB0cnVlXG59O1xuXG4vLyBBc3NlcnRzIHRoYXQgZm9sbG93aW5nIHRva2VuIGlzIGdpdmVuIGNvbnRleHR1YWwga2V5d29yZC5cblxucHAkOS5leHBlY3RDb250ZXh0dWFsID0gZnVuY3Rpb24obmFtZSkge1xuICBpZiAoIXRoaXMuZWF0Q29udGV4dHVhbChuYW1lKSkgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxufTtcblxuLy8gVGVzdCB3aGV0aGVyIGEgc2VtaWNvbG9uIGNhbiBiZSBpbnNlcnRlZCBhdCB0aGUgY3VycmVudCBwb3NpdGlvbi5cblxucHAkOS5jYW5JbnNlcnRTZW1pY29sb24gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lb2YgfHxcbiAgICB0aGlzLnR5cGUgPT09IHR5cGVzJDEuYnJhY2VSIHx8XG4gICAgbGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLmxhc3RUb2tFbmQsIHRoaXMuc3RhcnQpKVxufTtcblxucHAkOS5pbnNlcnRTZW1pY29sb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm9uSW5zZXJ0ZWRTZW1pY29sb24pXG4gICAgICB7IHRoaXMub3B0aW9ucy5vbkluc2VydGVkU2VtaWNvbG9uKHRoaXMubGFzdFRva0VuZCwgdGhpcy5sYXN0VG9rRW5kTG9jKTsgfVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn07XG5cbi8vIENvbnN1bWUgYSBzZW1pY29sb24sIG9yLCBmYWlsaW5nIHRoYXQsIHNlZSBpZiB3ZSBhcmUgYWxsb3dlZCB0b1xuLy8gcHJldGVuZCB0aGF0IHRoZXJlIGlzIGEgc2VtaWNvbG9uIGF0IHRoaXMgcG9zaXRpb24uXG5cbnBwJDkuc2VtaWNvbG9uID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5lYXQodHlwZXMkMS5zZW1pKSAmJiAhdGhpcy5pbnNlcnRTZW1pY29sb24oKSkgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxufTtcblxucHAkOS5hZnRlclRyYWlsaW5nQ29tbWEgPSBmdW5jdGlvbih0b2tUeXBlLCBub3ROZXh0KSB7XG4gIGlmICh0aGlzLnR5cGUgPT09IHRva1R5cGUpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm9uVHJhaWxpbmdDb21tYSlcbiAgICAgIHsgdGhpcy5vcHRpb25zLm9uVHJhaWxpbmdDb21tYSh0aGlzLmxhc3RUb2tTdGFydCwgdGhpcy5sYXN0VG9rU3RhcnRMb2MpOyB9XG4gICAgaWYgKCFub3ROZXh0KVxuICAgICAgeyB0aGlzLm5leHQoKTsgfVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn07XG5cbi8vIEV4cGVjdCBhIHRva2VuIG9mIGEgZ2l2ZW4gdHlwZS4gSWYgZm91bmQsIGNvbnN1bWUgaXQsIG90aGVyd2lzZSxcbi8vIHJhaXNlIGFuIHVuZXhwZWN0ZWQgdG9rZW4gZXJyb3IuXG5cbnBwJDkuZXhwZWN0ID0gZnVuY3Rpb24odHlwZSkge1xuICB0aGlzLmVhdCh0eXBlKSB8fCB0aGlzLnVuZXhwZWN0ZWQoKTtcbn07XG5cbi8vIFJhaXNlIGFuIHVuZXhwZWN0ZWQgdG9rZW4gZXJyb3IuXG5cbnBwJDkudW5leHBlY3RlZCA9IGZ1bmN0aW9uKHBvcykge1xuICB0aGlzLnJhaXNlKHBvcyAhPSBudWxsID8gcG9zIDogdGhpcy5zdGFydCwgXCJVbmV4cGVjdGVkIHRva2VuXCIpO1xufTtcblxudmFyIERlc3RydWN0dXJpbmdFcnJvcnMgPSBmdW5jdGlvbiBEZXN0cnVjdHVyaW5nRXJyb3JzKCkge1xuICB0aGlzLnNob3J0aGFuZEFzc2lnbiA9XG4gIHRoaXMudHJhaWxpbmdDb21tYSA9XG4gIHRoaXMucGFyZW50aGVzaXplZEFzc2lnbiA9XG4gIHRoaXMucGFyZW50aGVzaXplZEJpbmQgPVxuICB0aGlzLmRvdWJsZVByb3RvID1cbiAgICAtMTtcbn07XG5cbnBwJDkuY2hlY2tQYXR0ZXJuRXJyb3JzID0gZnVuY3Rpb24ocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgaXNBc3NpZ24pIHtcbiAgaWYgKCFyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7IHJldHVybiB9XG4gIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPiAtMSlcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEsIFwiQ29tbWEgaXMgbm90IHBlcm1pdHRlZCBhZnRlciB0aGUgcmVzdCBlbGVtZW50XCIpOyB9XG4gIHZhciBwYXJlbnMgPSBpc0Fzc2lnbiA/IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA6IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEJpbmQ7XG4gIGlmIChwYXJlbnMgPiAtMSkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUocGFyZW5zLCBpc0Fzc2lnbiA/IFwiQXNzaWduaW5nIHRvIHJ2YWx1ZVwiIDogXCJQYXJlbnRoZXNpemVkIHBhdHRlcm5cIik7IH1cbn07XG5cbnBwJDkuY2hlY2tFeHByZXNzaW9uRXJyb3JzID0gZnVuY3Rpb24ocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgYW5kVGhyb3cpIHtcbiAgaWYgKCFyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7IHJldHVybiBmYWxzZSB9XG4gIHZhciBzaG9ydGhhbmRBc3NpZ24gPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnNob3J0aGFuZEFzc2lnbjtcbiAgdmFyIGRvdWJsZVByb3RvID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5kb3VibGVQcm90bztcbiAgaWYgKCFhbmRUaHJvdykgeyByZXR1cm4gc2hvcnRoYW5kQXNzaWduID49IDAgfHwgZG91YmxlUHJvdG8gPj0gMCB9XG4gIGlmIChzaG9ydGhhbmRBc3NpZ24gPj0gMClcbiAgICB7IHRoaXMucmFpc2Uoc2hvcnRoYW5kQXNzaWduLCBcIlNob3J0aGFuZCBwcm9wZXJ0eSBhc3NpZ25tZW50cyBhcmUgdmFsaWQgb25seSBpbiBkZXN0cnVjdHVyaW5nIHBhdHRlcm5zXCIpOyB9XG4gIGlmIChkb3VibGVQcm90byA+PSAwKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGRvdWJsZVByb3RvLCBcIlJlZGVmaW5pdGlvbiBvZiBfX3Byb3RvX18gcHJvcGVydHlcIik7IH1cbn07XG5cbnBwJDkuY2hlY2tZaWVsZEF3YWl0SW5EZWZhdWx0UGFyYW1zID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnlpZWxkUG9zICYmICghdGhpcy5hd2FpdFBvcyB8fCB0aGlzLnlpZWxkUG9zIDwgdGhpcy5hd2FpdFBvcykpXG4gICAgeyB0aGlzLnJhaXNlKHRoaXMueWllbGRQb3MsIFwiWWllbGQgZXhwcmVzc2lvbiBjYW5ub3QgYmUgYSBkZWZhdWx0IHZhbHVlXCIpOyB9XG4gIGlmICh0aGlzLmF3YWl0UG9zKVxuICAgIHsgdGhpcy5yYWlzZSh0aGlzLmF3YWl0UG9zLCBcIkF3YWl0IGV4cHJlc3Npb24gY2Fubm90IGJlIGEgZGVmYXVsdCB2YWx1ZVwiKTsgfVxufTtcblxucHAkOS5pc1NpbXBsZUFzc2lnblRhcmdldCA9IGZ1bmN0aW9uKGV4cHIpIHtcbiAgaWYgKGV4cHIudHlwZSA9PT0gXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiKVxuICAgIHsgcmV0dXJuIHRoaXMuaXNTaW1wbGVBc3NpZ25UYXJnZXQoZXhwci5leHByZXNzaW9uKSB9XG4gIHJldHVybiBleHByLnR5cGUgPT09IFwiSWRlbnRpZmllclwiIHx8IGV4cHIudHlwZSA9PT0gXCJNZW1iZXJFeHByZXNzaW9uXCJcbn07XG5cbnZhciBwcCQ4ID0gUGFyc2VyLnByb3RvdHlwZTtcblxuLy8gIyMjIFN0YXRlbWVudCBwYXJzaW5nXG5cbi8vIFBhcnNlIGEgcHJvZ3JhbS4gSW5pdGlhbGl6ZXMgdGhlIHBhcnNlciwgcmVhZHMgYW55IG51bWJlciBvZlxuLy8gc3RhdGVtZW50cywgYW5kIHdyYXBzIHRoZW0gaW4gYSBQcm9ncmFtIG5vZGUuICBPcHRpb25hbGx5IHRha2VzIGFcbi8vIGBwcm9ncmFtYCBhcmd1bWVudC4gIElmIHByZXNlbnQsIHRoZSBzdGF0ZW1lbnRzIHdpbGwgYmUgYXBwZW5kZWRcbi8vIHRvIGl0cyBib2R5IGluc3RlYWQgb2YgY3JlYXRpbmcgYSBuZXcgbm9kZS5cblxucHAkOC5wYXJzZVRvcExldmVsID0gZnVuY3Rpb24obm9kZSkge1xuICB2YXIgZXhwb3J0cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmICghbm9kZS5ib2R5KSB7IG5vZGUuYm9keSA9IFtdOyB9XG4gIHdoaWxlICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuZW9mKSB7XG4gICAgdmFyIHN0bXQgPSB0aGlzLnBhcnNlU3RhdGVtZW50KG51bGwsIHRydWUsIGV4cG9ydHMpO1xuICAgIG5vZGUuYm9keS5wdXNoKHN0bXQpO1xuICB9XG4gIGlmICh0aGlzLmluTW9kdWxlKVxuICAgIHsgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBPYmplY3Qua2V5cyh0aGlzLnVuZGVmaW5lZEV4cG9ydHMpOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSlcbiAgICAgIHtcbiAgICAgICAgdmFyIG5hbWUgPSBsaXN0W2ldO1xuXG4gICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnVuZGVmaW5lZEV4cG9ydHNbbmFtZV0uc3RhcnQsIChcIkV4cG9ydCAnXCIgKyBuYW1lICsgXCInIGlzIG5vdCBkZWZpbmVkXCIpKTtcbiAgICAgIH0gfVxuICB0aGlzLmFkYXB0RGlyZWN0aXZlUHJvbG9ndWUobm9kZS5ib2R5KTtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUuc291cmNlVHlwZSA9IHRoaXMub3B0aW9ucy5zb3VyY2VUeXBlID09PSBcImNvbW1vbmpzXCIgPyBcInNjcmlwdFwiIDogdGhpcy5vcHRpb25zLnNvdXJjZVR5cGU7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJQcm9ncmFtXCIpXG59O1xuXG52YXIgbG9vcExhYmVsID0ge2tpbmQ6IFwibG9vcFwifSwgc3dpdGNoTGFiZWwgPSB7a2luZDogXCJzd2l0Y2hcIn07XG5cbnBwJDguaXNMZXQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA2IHx8ICF0aGlzLmlzQ29udGV4dHVhbChcImxldFwiKSkgeyByZXR1cm4gZmFsc2UgfVxuICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSB0aGlzLnBvcztcbiAgdmFyIHNraXAgPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpO1xuICB2YXIgbmV4dCA9IHRoaXMucG9zICsgc2tpcFswXS5sZW5ndGgsIG5leHRDaCA9IHRoaXMuZnVsbENoYXJDb2RlQXQobmV4dCk7XG4gIC8vIEZvciBhbWJpZ3VvdXMgY2FzZXMsIGRldGVybWluZSBpZiBhIExleGljYWxEZWNsYXJhdGlvbiAob3Igb25seSBhXG4gIC8vIFN0YXRlbWVudCkgaXMgYWxsb3dlZCBoZXJlLiBJZiBjb250ZXh0IGlzIG5vdCBlbXB0eSB0aGVuIG9ubHkgYSBTdGF0ZW1lbnRcbiAgLy8gaXMgYWxsb3dlZC4gSG93ZXZlciwgYGxldCBbYCBpcyBhbiBleHBsaWNpdCBuZWdhdGl2ZSBsb29rYWhlYWQgZm9yXG4gIC8vIEV4cHJlc3Npb25TdGF0ZW1lbnQsIHNvIHNwZWNpYWwtY2FzZSBpdCBmaXJzdC5cbiAgaWYgKG5leHRDaCA9PT0gOTEgfHwgbmV4dENoID09PSA5MikgeyByZXR1cm4gdHJ1ZSB9IC8vICdbJywgJ1xcJ1xuICBpZiAoY29udGV4dCkgeyByZXR1cm4gZmFsc2UgfVxuXG4gIGlmIChuZXh0Q2ggPT09IDEyMykgeyByZXR1cm4gdHJ1ZSB9IC8vICd7J1xuICBpZiAoaXNJZGVudGlmaWVyU3RhcnQobmV4dENoKSkge1xuICAgIHZhciBzdGFydCA9IG5leHQ7XG4gICAgZG8geyBuZXh0ICs9IG5leHRDaCA8PSAweGZmZmYgPyAxIDogMjsgfVxuICAgIHdoaWxlIChpc0lkZW50aWZpZXJDaGFyKG5leHRDaCA9IHRoaXMuZnVsbENoYXJDb2RlQXQobmV4dCkpKVxuICAgIGlmIChuZXh0Q2ggPT09IDkyKSB7IHJldHVybiB0cnVlIH1cbiAgICB2YXIgaWRlbnQgPSB0aGlzLmlucHV0LnNsaWNlKHN0YXJ0LCBuZXh0KTtcbiAgICBpZiAoIWtleXdvcmRSZWxhdGlvbmFsT3BlcmF0b3IudGVzdChpZGVudCkpIHsgcmV0dXJuIHRydWUgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gY2hlY2sgJ2FzeW5jIFtubyBMaW5lVGVybWluYXRvciBoZXJlXSBmdW5jdGlvbidcbi8vIC0gJ2FzeW5jIC8qZm9vKi8gZnVuY3Rpb24nIGlzIE9LLlxuLy8gLSAnYXN5bmMgLypcXG4qLyBmdW5jdGlvbicgaXMgaW52YWxpZC5cbnBwJDguaXNBc3luY0Z1bmN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA4IHx8ICF0aGlzLmlzQ29udGV4dHVhbChcImFzeW5jXCIpKVxuICAgIHsgcmV0dXJuIGZhbHNlIH1cblxuICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSB0aGlzLnBvcztcbiAgdmFyIHNraXAgPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpO1xuICB2YXIgbmV4dCA9IHRoaXMucG9zICsgc2tpcFswXS5sZW5ndGgsIGFmdGVyO1xuICByZXR1cm4gIWxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5wb3MsIG5leHQpKSAmJlxuICAgIHRoaXMuaW5wdXQuc2xpY2UobmV4dCwgbmV4dCArIDgpID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAobmV4dCArIDggPT09IHRoaXMuaW5wdXQubGVuZ3RoIHx8XG4gICAgICEoaXNJZGVudGlmaWVyQ2hhcihhZnRlciA9IHRoaXMuZnVsbENoYXJDb2RlQXQobmV4dCArIDgpKSB8fCBhZnRlciA9PT0gOTIgLyogJ1xcJyAqLykpXG59O1xuXG5wcCQ4LmlzVXNpbmdLZXl3b3JkID0gZnVuY3Rpb24oaXNBd2FpdFVzaW5nLCBpc0Zvcikge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgMTcgfHwgIXRoaXMuaXNDb250ZXh0dWFsKGlzQXdhaXRVc2luZyA/IFwiYXdhaXRcIiA6IFwidXNpbmdcIikpXG4gICAgeyByZXR1cm4gZmFsc2UgfVxuXG4gIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHRoaXMucG9zO1xuICB2YXIgc2tpcCA9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dCk7XG4gIHZhciBuZXh0ID0gdGhpcy5wb3MgKyBza2lwWzBdLmxlbmd0aDtcblxuICBpZiAobGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLnBvcywgbmV4dCkpKSB7IHJldHVybiBmYWxzZSB9XG5cbiAgaWYgKGlzQXdhaXRVc2luZykge1xuICAgIHZhciB1c2luZ0VuZFBvcyA9IG5leHQgKyA1IC8qIHVzaW5nICovLCBhZnRlcjtcbiAgICBpZiAodGhpcy5pbnB1dC5zbGljZShuZXh0LCB1c2luZ0VuZFBvcykgIT09IFwidXNpbmdcIiB8fFxuICAgICAgdXNpbmdFbmRQb3MgPT09IHRoaXMuaW5wdXQubGVuZ3RoIHx8XG4gICAgICBpc0lkZW50aWZpZXJDaGFyKGFmdGVyID0gdGhpcy5mdWxsQ2hhckNvZGVBdCh1c2luZ0VuZFBvcykpIHx8XG4gICAgICBhZnRlciA9PT0gOTIgLyogJ1xcJyAqL1xuICAgICkgeyByZXR1cm4gZmFsc2UgfVxuXG4gICAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gdXNpbmdFbmRQb3M7XG4gICAgdmFyIHNraXBBZnRlclVzaW5nID0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KTtcbiAgICBuZXh0ID0gdXNpbmdFbmRQb3MgKyBza2lwQWZ0ZXJVc2luZ1swXS5sZW5ndGg7XG4gICAgaWYgKHNraXBBZnRlclVzaW5nICYmIGxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodXNpbmdFbmRQb3MsIG5leHQpKSkgeyByZXR1cm4gZmFsc2UgfVxuICB9XG5cbiAgdmFyIGNoID0gdGhpcy5mdWxsQ2hhckNvZGVBdChuZXh0KTtcbiAgaWYgKCFpc0lkZW50aWZpZXJTdGFydChjaCkgJiYgY2ggIT09IDkyIC8qICdcXCcgKi8pIHsgcmV0dXJuIGZhbHNlIH1cbiAgdmFyIGlkU3RhcnQgPSBuZXh0O1xuICBkbyB7IG5leHQgKz0gY2ggPD0gMHhmZmZmID8gMSA6IDI7IH1cbiAgd2hpbGUgKGlzSWRlbnRpZmllckNoYXIoY2ggPSB0aGlzLmZ1bGxDaGFyQ29kZUF0KG5leHQpKSlcbiAgaWYgKGNoID09PSA5MikgeyByZXR1cm4gdHJ1ZSB9XG4gIHZhciBpZCA9IHRoaXMuaW5wdXQuc2xpY2UoaWRTdGFydCwgbmV4dCk7XG4gIGlmIChrZXl3b3JkUmVsYXRpb25hbE9wZXJhdG9yLnRlc3QoaWQpIHx8IGlzRm9yICYmIGlkID09PSBcIm9mXCIpIHsgcmV0dXJuIGZhbHNlIH1cbiAgcmV0dXJuIHRydWVcbn07XG5cbnBwJDguaXNBd2FpdFVzaW5nID0gZnVuY3Rpb24oaXNGb3IpIHtcbiAgcmV0dXJuIHRoaXMuaXNVc2luZ0tleXdvcmQodHJ1ZSwgaXNGb3IpXG59O1xuXG5wcCQ4LmlzVXNpbmcgPSBmdW5jdGlvbihpc0Zvcikge1xuICByZXR1cm4gdGhpcy5pc1VzaW5nS2V5d29yZChmYWxzZSwgaXNGb3IpXG59O1xuXG4vLyBQYXJzZSBhIHNpbmdsZSBzdGF0ZW1lbnQuXG4vL1xuLy8gSWYgZXhwZWN0aW5nIGEgc3RhdGVtZW50IGFuZCBmaW5kaW5nIGEgc2xhc2ggb3BlcmF0b3IsIHBhcnNlIGFcbi8vIHJlZ3VsYXIgZXhwcmVzc2lvbiBsaXRlcmFsLiBUaGlzIGlzIHRvIGhhbmRsZSBjYXNlcyBsaWtlXG4vLyBgaWYgKGZvbykgL2JsYWgvLmV4ZWMoZm9vKWAsIHdoZXJlIGxvb2tpbmcgYXQgdGhlIHByZXZpb3VzIHRva2VuXG4vLyBkb2VzIG5vdCBoZWxwLlxuXG5wcCQ4LnBhcnNlU3RhdGVtZW50ID0gZnVuY3Rpb24oY29udGV4dCwgdG9wTGV2ZWwsIGV4cG9ydHMpIHtcbiAgdmFyIHN0YXJ0dHlwZSA9IHRoaXMudHlwZSwgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCksIGtpbmQ7XG5cbiAgaWYgKHRoaXMuaXNMZXQoY29udGV4dCkpIHtcbiAgICBzdGFydHR5cGUgPSB0eXBlcyQxLl92YXI7XG4gICAga2luZCA9IFwibGV0XCI7XG4gIH1cblxuICAvLyBNb3N0IHR5cGVzIG9mIHN0YXRlbWVudHMgYXJlIHJlY29nbml6ZWQgYnkgdGhlIGtleXdvcmQgdGhleVxuICAvLyBzdGFydCB3aXRoLiBNYW55IGFyZSB0cml2aWFsIHRvIHBhcnNlLCBzb21lIHJlcXVpcmUgYSBiaXQgb2ZcbiAgLy8gY29tcGxleGl0eS5cblxuICBzd2l0Y2ggKHN0YXJ0dHlwZSkge1xuICBjYXNlIHR5cGVzJDEuX2JyZWFrOiBjYXNlIHR5cGVzJDEuX2NvbnRpbnVlOiByZXR1cm4gdGhpcy5wYXJzZUJyZWFrQ29udGludWVTdGF0ZW1lbnQobm9kZSwgc3RhcnR0eXBlLmtleXdvcmQpXG4gIGNhc2UgdHlwZXMkMS5fZGVidWdnZXI6IHJldHVybiB0aGlzLnBhcnNlRGVidWdnZXJTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl9kbzogcmV0dXJuIHRoaXMucGFyc2VEb1N0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX2ZvcjogcmV0dXJuIHRoaXMucGFyc2VGb3JTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl9mdW5jdGlvbjpcbiAgICAvLyBGdW5jdGlvbiBhcyBzb2xlIGJvZHkgb2YgZWl0aGVyIGFuIGlmIHN0YXRlbWVudCBvciBhIGxhYmVsZWQgc3RhdGVtZW50XG4gICAgLy8gd29ya3MsIGJ1dCBub3Qgd2hlbiBpdCBpcyBwYXJ0IG9mIGEgbGFiZWxlZCBzdGF0ZW1lbnQgdGhhdCBpcyB0aGUgc29sZVxuICAgIC8vIGJvZHkgb2YgYW4gaWYgc3RhdGVtZW50LlxuICAgIGlmICgoY29udGV4dCAmJiAodGhpcy5zdHJpY3QgfHwgY29udGV4dCAhPT0gXCJpZlwiICYmIGNvbnRleHQgIT09IFwibGFiZWxcIikpICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGdW5jdGlvblN0YXRlbWVudChub2RlLCBmYWxzZSwgIWNvbnRleHQpXG4gIGNhc2UgdHlwZXMkMS5fY2xhc3M6XG4gICAgaWYgKGNvbnRleHQpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICByZXR1cm4gdGhpcy5wYXJzZUNsYXNzKG5vZGUsIHRydWUpXG4gIGNhc2UgdHlwZXMkMS5faWY6IHJldHVybiB0aGlzLnBhcnNlSWZTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl9yZXR1cm46IHJldHVybiB0aGlzLnBhcnNlUmV0dXJuU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fc3dpdGNoOiByZXR1cm4gdGhpcy5wYXJzZVN3aXRjaFN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX3Rocm93OiByZXR1cm4gdGhpcy5wYXJzZVRocm93U3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fdHJ5OiByZXR1cm4gdGhpcy5wYXJzZVRyeVN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX2NvbnN0OiBjYXNlIHR5cGVzJDEuX3ZhcjpcbiAgICBraW5kID0ga2luZCB8fCB0aGlzLnZhbHVlO1xuICAgIGlmIChjb250ZXh0ICYmIGtpbmQgIT09IFwidmFyXCIpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICByZXR1cm4gdGhpcy5wYXJzZVZhclN0YXRlbWVudChub2RlLCBraW5kKVxuICBjYXNlIHR5cGVzJDEuX3doaWxlOiByZXR1cm4gdGhpcy5wYXJzZVdoaWxlU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fd2l0aDogcmV0dXJuIHRoaXMucGFyc2VXaXRoU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5icmFjZUw6IHJldHVybiB0aGlzLnBhcnNlQmxvY2sodHJ1ZSwgbm9kZSlcbiAgY2FzZSB0eXBlcyQxLnNlbWk6IHJldHVybiB0aGlzLnBhcnNlRW1wdHlTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl9leHBvcnQ6XG4gIGNhc2UgdHlwZXMkMS5faW1wb3J0OlxuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPiAxMCAmJiBzdGFydHR5cGUgPT09IHR5cGVzJDEuX2ltcG9ydCkge1xuICAgICAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gdGhpcy5wb3M7XG4gICAgICB2YXIgc2tpcCA9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dCk7XG4gICAgICB2YXIgbmV4dCA9IHRoaXMucG9zICsgc2tpcFswXS5sZW5ndGgsIG5leHRDaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdChuZXh0KTtcbiAgICAgIGlmIChuZXh0Q2ggPT09IDQwIHx8IG5leHRDaCA9PT0gNDYpIC8vICcoJyBvciAnLidcbiAgICAgICAgeyByZXR1cm4gdGhpcy5wYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQobm9kZSwgdGhpcy5wYXJzZUV4cHJlc3Npb24oKSkgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmFsbG93SW1wb3J0RXhwb3J0RXZlcnl3aGVyZSkge1xuICAgICAgaWYgKCF0b3BMZXZlbClcbiAgICAgICAgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiJ2ltcG9ydCcgYW5kICdleHBvcnQnIG1heSBvbmx5IGFwcGVhciBhdCB0aGUgdG9wIGxldmVsXCIpOyB9XG4gICAgICBpZiAoIXRoaXMuaW5Nb2R1bGUpXG4gICAgICAgIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIidpbXBvcnQnIGFuZCAnZXhwb3J0JyBtYXkgYXBwZWFyIG9ubHkgd2l0aCAnc291cmNlVHlwZTogbW9kdWxlJ1wiKTsgfVxuICAgIH1cbiAgICByZXR1cm4gc3RhcnR0eXBlID09PSB0eXBlcyQxLl9pbXBvcnQgPyB0aGlzLnBhcnNlSW1wb3J0KG5vZGUpIDogdGhpcy5wYXJzZUV4cG9ydChub2RlLCBleHBvcnRzKVxuXG4gICAgLy8gSWYgdGhlIHN0YXRlbWVudCBkb2VzIG5vdCBzdGFydCB3aXRoIGEgc3RhdGVtZW50IGtleXdvcmQgb3IgYVxuICAgIC8vIGJyYWNlLCBpdCdzIGFuIEV4cHJlc3Npb25TdGF0ZW1lbnQgb3IgTGFiZWxlZFN0YXRlbWVudC4gV2VcbiAgICAvLyBzaW1wbHkgc3RhcnQgcGFyc2luZyBhbiBleHByZXNzaW9uLCBhbmQgYWZ0ZXJ3YXJkcywgaWYgdGhlXG4gICAgLy8gbmV4dCB0b2tlbiBpcyBhIGNvbG9uIGFuZCB0aGUgZXhwcmVzc2lvbiB3YXMgYSBzaW1wbGVcbiAgICAvLyBJZGVudGlmaWVyIG5vZGUsIHdlIHN3aXRjaCB0byBpbnRlcnByZXRpbmcgaXQgYXMgYSBsYWJlbC5cbiAgZGVmYXVsdDpcbiAgICBpZiAodGhpcy5pc0FzeW5jRnVuY3Rpb24oKSkge1xuICAgICAgaWYgKGNvbnRleHQpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgcmV0dXJuIHRoaXMucGFyc2VGdW5jdGlvblN0YXRlbWVudChub2RlLCB0cnVlLCAhY29udGV4dClcbiAgICB9XG5cbiAgICB2YXIgdXNpbmdLaW5kID0gdGhpcy5pc0F3YWl0VXNpbmcoZmFsc2UpID8gXCJhd2FpdCB1c2luZ1wiIDogdGhpcy5pc1VzaW5nKGZhbHNlKSA/IFwidXNpbmdcIiA6IG51bGw7XG4gICAgaWYgKHVzaW5nS2luZCkge1xuICAgICAgaWYgKCF0aGlzLmFsbG93VXNpbmcpIHtcbiAgICAgICAgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIlVzaW5nIGRlY2xhcmF0aW9uIGNhbm5vdCBhcHBlYXIgaW4gdGhlIHRvcCBsZXZlbCB3aGVuIHNvdXJjZSB0eXBlIGlzIGBzY3JpcHRgIG9yIGluIHRoZSBiYXJlIGNhc2Ugc3RhdGVtZW50XCIpO1xuICAgICAgfVxuICAgICAgaWYgKHVzaW5nS2luZCA9PT0gXCJhd2FpdCB1c2luZ1wiKSB7XG4gICAgICAgIGlmICghdGhpcy5jYW5Bd2FpdCkge1xuICAgICAgICAgIHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJBd2FpdCB1c2luZyBjYW5ub3QgYXBwZWFyIG91dHNpZGUgb2YgYXN5bmMgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICB9XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICAgIHRoaXMucGFyc2VWYXIobm9kZSwgZmFsc2UsIHVzaW5nS2luZCk7XG4gICAgICB0aGlzLnNlbWljb2xvbigpO1xuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlZhcmlhYmxlRGVjbGFyYXRpb25cIilcbiAgICB9XG5cbiAgICB2YXIgbWF5YmVOYW1lID0gdGhpcy52YWx1ZSwgZXhwciA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gICAgaWYgKHN0YXJ0dHlwZSA9PT0gdHlwZXMkMS5uYW1lICYmIGV4cHIudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgJiYgdGhpcy5lYXQodHlwZXMkMS5jb2xvbikpXG4gICAgICB7IHJldHVybiB0aGlzLnBhcnNlTGFiZWxlZFN0YXRlbWVudChub2RlLCBtYXliZU5hbWUsIGV4cHIsIGNvbnRleHQpIH1cbiAgICBlbHNlIHsgcmV0dXJuIHRoaXMucGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KG5vZGUsIGV4cHIpIH1cbiAgfVxufTtcblxucHAkOC5wYXJzZUJyZWFrQ29udGludWVTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlLCBrZXl3b3JkKSB7XG4gIHZhciBpc0JyZWFrID0ga2V5d29yZCA9PT0gXCJicmVha1wiO1xuICB0aGlzLm5leHQoKTtcbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuc2VtaSkgfHwgdGhpcy5pbnNlcnRTZW1pY29sb24oKSkgeyBub2RlLmxhYmVsID0gbnVsbDsgfVxuICBlbHNlIGlmICh0aGlzLnR5cGUgIT09IHR5cGVzJDEubmFtZSkgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICBlbHNlIHtcbiAgICBub2RlLmxhYmVsID0gdGhpcy5wYXJzZUlkZW50KCk7XG4gICAgdGhpcy5zZW1pY29sb24oKTtcbiAgfVxuXG4gIC8vIFZlcmlmeSB0aGF0IHRoZXJlIGlzIGFuIGFjdHVhbCBkZXN0aW5hdGlvbiB0byBicmVhayBvclxuICAvLyBjb250aW51ZSB0by5cbiAgdmFyIGkgPSAwO1xuICBmb3IgKDsgaSA8IHRoaXMubGFiZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGxhYiA9IHRoaXMubGFiZWxzW2ldO1xuICAgIGlmIChub2RlLmxhYmVsID09IG51bGwgfHwgbGFiLm5hbWUgPT09IG5vZGUubGFiZWwubmFtZSkge1xuICAgICAgaWYgKGxhYi5raW5kICE9IG51bGwgJiYgKGlzQnJlYWsgfHwgbGFiLmtpbmQgPT09IFwibG9vcFwiKSkgeyBicmVhayB9XG4gICAgICBpZiAobm9kZS5sYWJlbCAmJiBpc0JyZWFrKSB7IGJyZWFrIH1cbiAgICB9XG4gIH1cbiAgaWYgKGkgPT09IHRoaXMubGFiZWxzLmxlbmd0aCkgeyB0aGlzLnJhaXNlKG5vZGUuc3RhcnQsIFwiVW5zeW50YWN0aWMgXCIgKyBrZXl3b3JkKTsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIGlzQnJlYWsgPyBcIkJyZWFrU3RhdGVtZW50XCIgOiBcIkNvbnRpbnVlU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlRGVidWdnZXJTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICB0aGlzLnNlbWljb2xvbigpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRGVidWdnZXJTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VEb1N0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIHRoaXMubGFiZWxzLnB1c2gobG9vcExhYmVsKTtcbiAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudChcImRvXCIpO1xuICB0aGlzLmxhYmVscy5wb3AoKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5fd2hpbGUpO1xuICBub2RlLnRlc3QgPSB0aGlzLnBhcnNlUGFyZW5FeHByZXNzaW9uKCk7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNilcbiAgICB7IHRoaXMuZWF0KHR5cGVzJDEuc2VtaSk7IH1cbiAgZWxzZVxuICAgIHsgdGhpcy5zZW1pY29sb24oKTsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRG9XaGlsZVN0YXRlbWVudFwiKVxufTtcblxuLy8gRGlzYW1iaWd1YXRpbmcgYmV0d2VlbiBhIGBmb3JgIGFuZCBhIGBmb3JgL2BpbmAgb3IgYGZvcmAvYG9mYFxuLy8gbG9vcCBpcyBub24tdHJpdmlhbC4gQmFzaWNhbGx5LCB3ZSBoYXZlIHRvIHBhcnNlIHRoZSBpbml0IGB2YXJgXG4vLyBzdGF0ZW1lbnQgb3IgZXhwcmVzc2lvbiwgZGlzYWxsb3dpbmcgdGhlIGBpbmAgb3BlcmF0b3IgKHNlZVxuLy8gdGhlIHNlY29uZCBwYXJhbWV0ZXIgdG8gYHBhcnNlRXhwcmVzc2lvbmApLCBhbmQgdGhlbiBjaGVja1xuLy8gd2hldGhlciB0aGUgbmV4dCB0b2tlbiBpcyBgaW5gIG9yIGBvZmAuIFdoZW4gdGhlcmUgaXMgbm8gaW5pdFxuLy8gcGFydCAoc2VtaWNvbG9uIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBvcGVuaW5nIHBhcmVudGhlc2lzKSwgaXRcbi8vIGlzIGEgcmVndWxhciBgZm9yYCBsb29wLlxuXG5wcCQ4LnBhcnNlRm9yU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgdmFyIGF3YWl0QXQgPSAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgJiYgdGhpcy5jYW5Bd2FpdCAmJiB0aGlzLmVhdENvbnRleHR1YWwoXCJhd2FpdFwiKSkgPyB0aGlzLmxhc3RUb2tTdGFydCA6IC0xO1xuICB0aGlzLmxhYmVscy5wdXNoKGxvb3BMYWJlbCk7XG4gIHRoaXMuZW50ZXJTY29wZSgwKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlbkwpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnNlbWkpIHtcbiAgICBpZiAoYXdhaXRBdCA+IC0xKSB7IHRoaXMudW5leHBlY3RlZChhd2FpdEF0KTsgfVxuICAgIHJldHVybiB0aGlzLnBhcnNlRm9yKG5vZGUsIG51bGwpXG4gIH1cbiAgdmFyIGlzTGV0ID0gdGhpcy5pc0xldCgpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl92YXIgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLl9jb25zdCB8fCBpc0xldCkge1xuICAgIHZhciBpbml0JDEgPSB0aGlzLnN0YXJ0Tm9kZSgpLCBraW5kID0gaXNMZXQgPyBcImxldFwiIDogdGhpcy52YWx1ZTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICB0aGlzLnBhcnNlVmFyKGluaXQkMSwgdHJ1ZSwga2luZCk7XG4gICAgdGhpcy5maW5pc2hOb2RlKGluaXQkMSwgXCJWYXJpYWJsZURlY2xhcmF0aW9uXCIpO1xuICAgIHJldHVybiB0aGlzLnBhcnNlRm9yQWZ0ZXJJbml0KG5vZGUsIGluaXQkMSwgYXdhaXRBdClcbiAgfVxuICB2YXIgc3RhcnRzV2l0aExldCA9IHRoaXMuaXNDb250ZXh0dWFsKFwibGV0XCIpLCBpc0Zvck9mID0gZmFsc2U7XG5cbiAgdmFyIHVzaW5nS2luZCA9IHRoaXMuaXNVc2luZyh0cnVlKSA/IFwidXNpbmdcIiA6IHRoaXMuaXNBd2FpdFVzaW5nKHRydWUpID8gXCJhd2FpdCB1c2luZ1wiIDogbnVsbDtcbiAgaWYgKHVzaW5nS2luZCkge1xuICAgIHZhciBpbml0JDIgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIGlmICh1c2luZ0tpbmQgPT09IFwiYXdhaXQgdXNpbmdcIikge1xuICAgICAgaWYgKCF0aGlzLmNhbkF3YWl0KSB7XG4gICAgICAgIHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJBd2FpdCB1c2luZyBjYW5ub3QgYXBwZWFyIG91dHNpZGUgb2YgYXN5bmMgZnVuY3Rpb25cIik7XG4gICAgICB9XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICB9XG4gICAgdGhpcy5wYXJzZVZhcihpbml0JDIsIHRydWUsIHVzaW5nS2luZCk7XG4gICAgdGhpcy5maW5pc2hOb2RlKGluaXQkMiwgXCJWYXJpYWJsZURlY2xhcmF0aW9uXCIpO1xuICAgIHJldHVybiB0aGlzLnBhcnNlRm9yQWZ0ZXJJbml0KG5vZGUsIGluaXQkMiwgYXdhaXRBdClcbiAgfVxuICB2YXIgY29udGFpbnNFc2MgPSB0aGlzLmNvbnRhaW5zRXNjO1xuICB2YXIgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyA9IG5ldyBEZXN0cnVjdHVyaW5nRXJyb3JzO1xuICB2YXIgaW5pdFBvcyA9IHRoaXMuc3RhcnQ7XG4gIHZhciBpbml0ID0gYXdhaXRBdCA+IC0xXG4gICAgPyB0aGlzLnBhcnNlRXhwclN1YnNjcmlwdHMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgXCJhd2FpdFwiKVxuICAgIDogdGhpcy5wYXJzZUV4cHJlc3Npb24odHJ1ZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2luIHx8IChpc0Zvck9mID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgdGhpcy5pc0NvbnRleHR1YWwoXCJvZlwiKSkpIHtcbiAgICBpZiAoYXdhaXRBdCA+IC0xKSB7IC8vIGltcGxpZXMgYGVjbWFWZXJzaW9uID49IDlgIChzZWUgZGVjbGFyYXRpb24gb2YgYXdhaXRBdClcbiAgICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2luKSB7IHRoaXMudW5leHBlY3RlZChhd2FpdEF0KTsgfVxuICAgICAgbm9kZS5hd2FpdCA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChpc0Zvck9mICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4KSB7XG4gICAgICBpZiAoaW5pdC5zdGFydCA9PT0gaW5pdFBvcyAmJiAhY29udGFpbnNFc2MgJiYgaW5pdC50eXBlID09PSBcIklkZW50aWZpZXJcIiAmJiBpbml0Lm5hbWUgPT09IFwiYXN5bmNcIikgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgICAgZWxzZSBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkpIHsgbm9kZS5hd2FpdCA9IGZhbHNlOyB9XG4gICAgfVxuICAgIGlmIChzdGFydHNXaXRoTGV0ICYmIGlzRm9yT2YpIHsgdGhpcy5yYWlzZShpbml0LnN0YXJ0LCBcIlRoZSBsZWZ0LWhhbmQgc2lkZSBvZiBhIGZvci1vZiBsb29wIG1heSBub3Qgc3RhcnQgd2l0aCAnbGV0Jy5cIik7IH1cbiAgICB0aGlzLnRvQXNzaWduYWJsZShpbml0LCBmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgdGhpcy5jaGVja0xWYWxQYXR0ZXJuKGluaXQpO1xuICAgIHJldHVybiB0aGlzLnBhcnNlRm9ySW4obm9kZSwgaW5pdClcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTtcbiAgfVxuICBpZiAoYXdhaXRBdCA+IC0xKSB7IHRoaXMudW5leHBlY3RlZChhd2FpdEF0KTsgfVxuICByZXR1cm4gdGhpcy5wYXJzZUZvcihub2RlLCBpbml0KVxufTtcblxuLy8gSGVscGVyIG1ldGhvZCB0byBwYXJzZSBmb3IgbG9vcCBhZnRlciB2YXJpYWJsZSBpbml0aWFsaXphdGlvblxucHAkOC5wYXJzZUZvckFmdGVySW5pdCA9IGZ1bmN0aW9uKG5vZGUsIGluaXQsIGF3YWl0QXQpIHtcbiAgaWYgKCh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2luIHx8ICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiB0aGlzLmlzQ29udGV4dHVhbChcIm9mXCIpKSkgJiYgaW5pdC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5KSB7XG4gICAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9pbikge1xuICAgICAgICBpZiAoYXdhaXRBdCA+IC0xKSB7IHRoaXMudW5leHBlY3RlZChhd2FpdEF0KTsgfVxuICAgICAgfSBlbHNlIHsgbm9kZS5hd2FpdCA9IGF3YWl0QXQgPiAtMTsgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wYXJzZUZvckluKG5vZGUsIGluaXQpXG4gIH1cbiAgaWYgKGF3YWl0QXQgPiAtMSkgeyB0aGlzLnVuZXhwZWN0ZWQoYXdhaXRBdCk7IH1cbiAgcmV0dXJuIHRoaXMucGFyc2VGb3Iobm9kZSwgaW5pdClcbn07XG5cbnBwJDgucGFyc2VGdW5jdGlvblN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUsIGlzQXN5bmMsIGRlY2xhcmF0aW9uUG9zaXRpb24pIHtcbiAgdGhpcy5uZXh0KCk7XG4gIHJldHVybiB0aGlzLnBhcnNlRnVuY3Rpb24obm9kZSwgRlVOQ19TVEFURU1FTlQgfCAoZGVjbGFyYXRpb25Qb3NpdGlvbiA/IDAgOiBGVU5DX0hBTkdJTkdfU1RBVEVNRU5UKSwgZmFsc2UsIGlzQXN5bmMpXG59O1xuXG5wcCQ4LnBhcnNlSWZTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLnRlc3QgPSB0aGlzLnBhcnNlUGFyZW5FeHByZXNzaW9uKCk7XG4gIC8vIGFsbG93IGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyBpbiBicmFuY2hlcywgYnV0IG9ubHkgaW4gbm9uLXN0cmljdCBtb2RlXG4gIG5vZGUuY29uc2VxdWVudCA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoXCJpZlwiKTtcbiAgbm9kZS5hbHRlcm5hdGUgPSB0aGlzLmVhdCh0eXBlcyQxLl9lbHNlKSA/IHRoaXMucGFyc2VTdGF0ZW1lbnQoXCJpZlwiKSA6IG51bGw7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJZlN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZVJldHVyblN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgaWYgKCF0aGlzLmFsbG93UmV0dXJuKVxuICAgIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIidyZXR1cm4nIG91dHNpZGUgb2YgZnVuY3Rpb25cIik7IH1cbiAgdGhpcy5uZXh0KCk7XG5cbiAgLy8gSW4gYHJldHVybmAgKGFuZCBgYnJlYWtgL2Bjb250aW51ZWApLCB0aGUga2V5d29yZHMgd2l0aFxuICAvLyBvcHRpb25hbCBhcmd1bWVudHMsIHdlIGVhZ2VybHkgbG9vayBmb3IgYSBzZW1pY29sb24gb3IgdGhlXG4gIC8vIHBvc3NpYmlsaXR5IHRvIGluc2VydCBvbmUuXG5cbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuc2VtaSkgfHwgdGhpcy5pbnNlcnRTZW1pY29sb24oKSkgeyBub2RlLmFyZ3VtZW50ID0gbnVsbDsgfVxuICBlbHNlIHsgbm9kZS5hcmd1bWVudCA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7IHRoaXMuc2VtaWNvbG9uKCk7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlJldHVyblN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZVN3aXRjaFN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUuZGlzY3JpbWluYW50ID0gdGhpcy5wYXJzZVBhcmVuRXhwcmVzc2lvbigpO1xuICBub2RlLmNhc2VzID0gW107XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2VMKTtcbiAgdGhpcy5sYWJlbHMucHVzaChzd2l0Y2hMYWJlbCk7XG4gIHRoaXMuZW50ZXJTY29wZShTQ09QRV9TV0lUQ0gpO1xuXG4gIC8vIFN0YXRlbWVudHMgdW5kZXIgbXVzdCBiZSBncm91cGVkIChieSBsYWJlbCkgaW4gU3dpdGNoQ2FzZVxuICAvLyBub2Rlcy4gYGN1cmAgaXMgdXNlZCB0byBrZWVwIHRoZSBub2RlIHRoYXQgd2UgYXJlIGN1cnJlbnRseVxuICAvLyBhZGRpbmcgc3RhdGVtZW50cyB0by5cblxuICB2YXIgY3VyO1xuICBmb3IgKHZhciBzYXdEZWZhdWx0ID0gZmFsc2U7IHRoaXMudHlwZSAhPT0gdHlwZXMkMS5icmFjZVI7KSB7XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fY2FzZSB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2RlZmF1bHQpIHtcbiAgICAgIHZhciBpc0Nhc2UgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2Nhc2U7XG4gICAgICBpZiAoY3VyKSB7IHRoaXMuZmluaXNoTm9kZShjdXIsIFwiU3dpdGNoQ2FzZVwiKTsgfVxuICAgICAgbm9kZS5jYXNlcy5wdXNoKGN1ciA9IHRoaXMuc3RhcnROb2RlKCkpO1xuICAgICAgY3VyLmNvbnNlcXVlbnQgPSBbXTtcbiAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgaWYgKGlzQ2FzZSkge1xuICAgICAgICBjdXIudGVzdCA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc2F3RGVmYXVsdCkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5sYXN0VG9rU3RhcnQsIFwiTXVsdGlwbGUgZGVmYXVsdCBjbGF1c2VzXCIpOyB9XG4gICAgICAgIHNhd0RlZmF1bHQgPSB0cnVlO1xuICAgICAgICBjdXIudGVzdCA9IG51bGw7XG4gICAgICB9XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbG9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFjdXIpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICAgIGN1ci5jb25zZXF1ZW50LnB1c2godGhpcy5wYXJzZVN0YXRlbWVudChudWxsKSk7XG4gICAgfVxuICB9XG4gIHRoaXMuZXhpdFNjb3BlKCk7XG4gIGlmIChjdXIpIHsgdGhpcy5maW5pc2hOb2RlKGN1ciwgXCJTd2l0Y2hDYXNlXCIpOyB9XG4gIHRoaXMubmV4dCgpOyAvLyBDbG9zaW5nIGJyYWNlXG4gIHRoaXMubGFiZWxzLnBvcCgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiU3dpdGNoU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlVGhyb3dTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICBpZiAobGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLmxhc3RUb2tFbmQsIHRoaXMuc3RhcnQpKSlcbiAgICB7IHRoaXMucmFpc2UodGhpcy5sYXN0VG9rRW5kLCBcIklsbGVnYWwgbmV3bGluZSBhZnRlciB0aHJvd1wiKTsgfVxuICBub2RlLmFyZ3VtZW50ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgdGhpcy5zZW1pY29sb24oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlRocm93U3RhdGVtZW50XCIpXG59O1xuXG4vLyBSZXVzZWQgZW1wdHkgYXJyYXkgYWRkZWQgZm9yIG5vZGUgZmllbGRzIHRoYXQgYXJlIGFsd2F5cyBlbXB0eS5cblxudmFyIGVtcHR5JDEgPSBbXTtcblxucHAkOC5wYXJzZUNhdGNoQ2xhdXNlUGFyYW0gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhcmFtID0gdGhpcy5wYXJzZUJpbmRpbmdBdG9tKCk7XG4gIHZhciBzaW1wbGUgPSBwYXJhbS50eXBlID09PSBcIklkZW50aWZpZXJcIjtcbiAgdGhpcy5lbnRlclNjb3BlKHNpbXBsZSA/IFNDT1BFX1NJTVBMRV9DQVRDSCA6IDApO1xuICB0aGlzLmNoZWNrTFZhbFBhdHRlcm4ocGFyYW0sIHNpbXBsZSA/IEJJTkRfU0lNUExFX0NBVENIIDogQklORF9MRVhJQ0FMKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlblIpO1xuXG4gIHJldHVybiBwYXJhbVxufTtcblxucHAkOC5wYXJzZVRyeVN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUuYmxvY2sgPSB0aGlzLnBhcnNlQmxvY2soKTtcbiAgbm9kZS5oYW5kbGVyID0gbnVsbDtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fY2F0Y2gpIHtcbiAgICB2YXIgY2xhdXNlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICBpZiAodGhpcy5lYXQodHlwZXMkMS5wYXJlbkwpKSB7XG4gICAgICBjbGF1c2UucGFyYW0gPSB0aGlzLnBhcnNlQ2F0Y2hDbGF1c2VQYXJhbSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgMTApIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICAgIGNsYXVzZS5wYXJhbSA9IG51bGw7XG4gICAgICB0aGlzLmVudGVyU2NvcGUoMCk7XG4gICAgfVxuICAgIGNsYXVzZS5ib2R5ID0gdGhpcy5wYXJzZUJsb2NrKGZhbHNlKTtcbiAgICB0aGlzLmV4aXRTY29wZSgpO1xuICAgIG5vZGUuaGFuZGxlciA9IHRoaXMuZmluaXNoTm9kZShjbGF1c2UsIFwiQ2F0Y2hDbGF1c2VcIik7XG4gIH1cbiAgbm9kZS5maW5hbGl6ZXIgPSB0aGlzLmVhdCh0eXBlcyQxLl9maW5hbGx5KSA/IHRoaXMucGFyc2VCbG9jaygpIDogbnVsbDtcbiAgaWYgKCFub2RlLmhhbmRsZXIgJiYgIW5vZGUuZmluYWxpemVyKVxuICAgIHsgdGhpcy5yYWlzZShub2RlLnN0YXJ0LCBcIk1pc3NpbmcgY2F0Y2ggb3IgZmluYWxseSBjbGF1c2VcIik7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlRyeVN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZVZhclN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUsIGtpbmQsIGFsbG93TWlzc2luZ0luaXRpYWxpemVyKSB7XG4gIHRoaXMubmV4dCgpO1xuICB0aGlzLnBhcnNlVmFyKG5vZGUsIGZhbHNlLCBraW5kLCBhbGxvd01pc3NpbmdJbml0aWFsaXplcik7XG4gIHRoaXMuc2VtaWNvbG9uKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJWYXJpYWJsZURlY2xhcmF0aW9uXCIpXG59O1xuXG5wcCQ4LnBhcnNlV2hpbGVTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLnRlc3QgPSB0aGlzLnBhcnNlUGFyZW5FeHByZXNzaW9uKCk7XG4gIHRoaXMubGFiZWxzLnB1c2gobG9vcExhYmVsKTtcbiAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudChcIndoaWxlXCIpO1xuICB0aGlzLmxhYmVscy5wb3AoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIldoaWxlU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlV2l0aFN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgaWYgKHRoaXMuc3RyaWN0KSB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCInd2l0aCcgaW4gc3RyaWN0IG1vZGVcIik7IH1cbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUub2JqZWN0ID0gdGhpcy5wYXJzZVBhcmVuRXhwcmVzc2lvbigpO1xuICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KFwid2l0aFwiKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIldpdGhTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VFbXB0eVN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJFbXB0eVN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZUxhYmVsZWRTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlLCBtYXliZU5hbWUsIGV4cHIsIGNvbnRleHQpIHtcbiAgZm9yICh2YXIgaSQxID0gMCwgbGlzdCA9IHRoaXMubGFiZWxzOyBpJDEgPCBsaXN0Lmxlbmd0aDsgaSQxICs9IDEpXG4gICAge1xuICAgIHZhciBsYWJlbCA9IGxpc3RbaSQxXTtcblxuICAgIGlmIChsYWJlbC5uYW1lID09PSBtYXliZU5hbWUpXG4gICAgICB7IHRoaXMucmFpc2UoZXhwci5zdGFydCwgXCJMYWJlbCAnXCIgKyBtYXliZU5hbWUgKyBcIicgaXMgYWxyZWFkeSBkZWNsYXJlZFwiKTtcbiAgfSB9XG4gIHZhciBraW5kID0gdGhpcy50eXBlLmlzTG9vcCA/IFwibG9vcFwiIDogdGhpcy50eXBlID09PSB0eXBlcyQxLl9zd2l0Y2ggPyBcInN3aXRjaFwiIDogbnVsbDtcbiAgZm9yICh2YXIgaSA9IHRoaXMubGFiZWxzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhYmVsJDEgPSB0aGlzLmxhYmVsc1tpXTtcbiAgICBpZiAobGFiZWwkMS5zdGF0ZW1lbnRTdGFydCA9PT0gbm9kZS5zdGFydCkge1xuICAgICAgLy8gVXBkYXRlIGluZm9ybWF0aW9uIGFib3V0IHByZXZpb3VzIGxhYmVscyBvbiB0aGlzIG5vZGVcbiAgICAgIGxhYmVsJDEuc3RhdGVtZW50U3RhcnQgPSB0aGlzLnN0YXJ0O1xuICAgICAgbGFiZWwkMS5raW5kID0ga2luZDtcbiAgICB9IGVsc2UgeyBicmVhayB9XG4gIH1cbiAgdGhpcy5sYWJlbHMucHVzaCh7bmFtZTogbWF5YmVOYW1lLCBraW5kOiBraW5kLCBzdGF0ZW1lbnRTdGFydDogdGhpcy5zdGFydH0pO1xuICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KGNvbnRleHQgPyBjb250ZXh0LmluZGV4T2YoXCJsYWJlbFwiKSA9PT0gLTEgPyBjb250ZXh0ICsgXCJsYWJlbFwiIDogY29udGV4dCA6IFwibGFiZWxcIik7XG4gIHRoaXMubGFiZWxzLnBvcCgpO1xuICBub2RlLmxhYmVsID0gZXhwcjtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkxhYmVsZWRTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VFeHByZXNzaW9uU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSwgZXhwcikge1xuICBub2RlLmV4cHJlc3Npb24gPSBleHByO1xuICB0aGlzLnNlbWljb2xvbigpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRXhwcmVzc2lvblN0YXRlbWVudFwiKVxufTtcblxuLy8gUGFyc2UgYSBzZW1pY29sb24tZW5jbG9zZWQgYmxvY2sgb2Ygc3RhdGVtZW50cywgaGFuZGxpbmcgYFwidXNlXG4vLyBzdHJpY3RcImAgZGVjbGFyYXRpb25zIHdoZW4gYGFsbG93U3RyaWN0YCBpcyB0cnVlICh1c2VkIGZvclxuLy8gZnVuY3Rpb24gYm9kaWVzKS5cblxucHAkOC5wYXJzZUJsb2NrID0gZnVuY3Rpb24oY3JlYXRlTmV3TGV4aWNhbFNjb3BlLCBub2RlLCBleGl0U3RyaWN0KSB7XG4gIGlmICggY3JlYXRlTmV3TGV4aWNhbFNjb3BlID09PSB2b2lkIDAgKSBjcmVhdGVOZXdMZXhpY2FsU2NvcGUgPSB0cnVlO1xuICBpZiAoIG5vZGUgPT09IHZvaWQgMCApIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuXG4gIG5vZGUuYm9keSA9IFtdO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNlTCk7XG4gIGlmIChjcmVhdGVOZXdMZXhpY2FsU2NvcGUpIHsgdGhpcy5lbnRlclNjb3BlKDApOyB9XG4gIHdoaWxlICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuYnJhY2VSKSB7XG4gICAgdmFyIHN0bXQgPSB0aGlzLnBhcnNlU3RhdGVtZW50KG51bGwpO1xuICAgIG5vZGUuYm9keS5wdXNoKHN0bXQpO1xuICB9XG4gIGlmIChleGl0U3RyaWN0KSB7IHRoaXMuc3RyaWN0ID0gZmFsc2U7IH1cbiAgdGhpcy5uZXh0KCk7XG4gIGlmIChjcmVhdGVOZXdMZXhpY2FsU2NvcGUpIHsgdGhpcy5leGl0U2NvcGUoKTsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQmxvY2tTdGF0ZW1lbnRcIilcbn07XG5cbi8vIFBhcnNlIGEgcmVndWxhciBgZm9yYCBsb29wLiBUaGUgZGlzYW1iaWd1YXRpb24gY29kZSBpblxuLy8gYHBhcnNlU3RhdGVtZW50YCB3aWxsIGFscmVhZHkgaGF2ZSBwYXJzZWQgdGhlIGluaXQgc3RhdGVtZW50IG9yXG4vLyBleHByZXNzaW9uLlxuXG5wcCQ4LnBhcnNlRm9yID0gZnVuY3Rpb24obm9kZSwgaW5pdCkge1xuICBub2RlLmluaXQgPSBpbml0O1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnNlbWkpO1xuICBub2RlLnRlc3QgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc2VtaSA/IG51bGwgOiB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLnNlbWkpO1xuICBub2RlLnVwZGF0ZSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wYXJlblIgPyBudWxsIDogdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlblIpO1xuICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KFwiZm9yXCIpO1xuICB0aGlzLmV4aXRTY29wZSgpO1xuICB0aGlzLmxhYmVscy5wb3AoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkZvclN0YXRlbWVudFwiKVxufTtcblxuLy8gUGFyc2UgYSBgZm9yYC9gaW5gIGFuZCBgZm9yYC9gb2ZgIGxvb3AsIHdoaWNoIGFyZSBhbG1vc3Rcbi8vIHNhbWUgZnJvbSBwYXJzZXIncyBwZXJzcGVjdGl2ZS5cblxucHAkOC5wYXJzZUZvckluID0gZnVuY3Rpb24obm9kZSwgaW5pdCkge1xuICB2YXIgaXNGb3JJbiA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5faW47XG4gIHRoaXMubmV4dCgpO1xuXG4gIGlmIChcbiAgICBpbml0LnR5cGUgPT09IFwiVmFyaWFibGVEZWNsYXJhdGlvblwiICYmXG4gICAgaW5pdC5kZWNsYXJhdGlvbnNbMF0uaW5pdCAhPSBudWxsICYmXG4gICAgKFxuICAgICAgIWlzRm9ySW4gfHxcbiAgICAgIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDggfHxcbiAgICAgIHRoaXMuc3RyaWN0IHx8XG4gICAgICBpbml0LmtpbmQgIT09IFwidmFyXCIgfHxcbiAgICAgIGluaXQuZGVjbGFyYXRpb25zWzBdLmlkLnR5cGUgIT09IFwiSWRlbnRpZmllclwiXG4gICAgKVxuICApIHtcbiAgICB0aGlzLnJhaXNlKFxuICAgICAgaW5pdC5zdGFydCxcbiAgICAgICgoaXNGb3JJbiA/IFwiZm9yLWluXCIgOiBcImZvci1vZlwiKSArIFwiIGxvb3AgdmFyaWFibGUgZGVjbGFyYXRpb24gbWF5IG5vdCBoYXZlIGFuIGluaXRpYWxpemVyXCIpXG4gICAgKTtcbiAgfVxuICBub2RlLmxlZnQgPSBpbml0O1xuICBub2RlLnJpZ2h0ID0gaXNGb3JJbiA/IHRoaXMucGFyc2VFeHByZXNzaW9uKCkgOiB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlblIpO1xuICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KFwiZm9yXCIpO1xuICB0aGlzLmV4aXRTY29wZSgpO1xuICB0aGlzLmxhYmVscy5wb3AoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBpc0ZvckluID8gXCJGb3JJblN0YXRlbWVudFwiIDogXCJGb3JPZlN0YXRlbWVudFwiKVxufTtcblxuLy8gUGFyc2UgYSBsaXN0IG9mIHZhcmlhYmxlIGRlY2xhcmF0aW9ucy5cblxucHAkOC5wYXJzZVZhciA9IGZ1bmN0aW9uKG5vZGUsIGlzRm9yLCBraW5kLCBhbGxvd01pc3NpbmdJbml0aWFsaXplcikge1xuICBub2RlLmRlY2xhcmF0aW9ucyA9IFtdO1xuICBub2RlLmtpbmQgPSBraW5kO1xuICBmb3IgKDs7KSB7XG4gICAgdmFyIGRlY2wgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMucGFyc2VWYXJJZChkZWNsLCBraW5kKTtcbiAgICBpZiAodGhpcy5lYXQodHlwZXMkMS5lcSkpIHtcbiAgICAgIGRlY2wuaW5pdCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihpc0Zvcik7XG4gICAgfSBlbHNlIGlmICghYWxsb3dNaXNzaW5nSW5pdGlhbGl6ZXIgJiYga2luZCA9PT0gXCJjb25zdFwiICYmICEodGhpcy50eXBlID09PSB0eXBlcyQxLl9pbiB8fCAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgdGhpcy5pc0NvbnRleHR1YWwoXCJvZlwiKSkpKSB7XG4gICAgICB0aGlzLnVuZXhwZWN0ZWQoKTtcbiAgICB9IGVsc2UgaWYgKCFhbGxvd01pc3NpbmdJbml0aWFsaXplciAmJiAoa2luZCA9PT0gXCJ1c2luZ1wiIHx8IGtpbmQgPT09IFwiYXdhaXQgdXNpbmdcIikgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE3ICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5faW4gJiYgIXRoaXMuaXNDb250ZXh0dWFsKFwib2ZcIikpIHtcbiAgICAgIHRoaXMucmFpc2UodGhpcy5sYXN0VG9rRW5kLCAoXCJNaXNzaW5nIGluaXRpYWxpemVyIGluIFwiICsga2luZCArIFwiIGRlY2xhcmF0aW9uXCIpKTtcbiAgICB9IGVsc2UgaWYgKCFhbGxvd01pc3NpbmdJbml0aWFsaXplciAmJiBkZWNsLmlkLnR5cGUgIT09IFwiSWRlbnRpZmllclwiICYmICEoaXNGb3IgJiYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5faW4gfHwgdGhpcy5pc0NvbnRleHR1YWwoXCJvZlwiKSkpKSB7XG4gICAgICB0aGlzLnJhaXNlKHRoaXMubGFzdFRva0VuZCwgXCJDb21wbGV4IGJpbmRpbmcgcGF0dGVybnMgcmVxdWlyZSBhbiBpbml0aWFsaXphdGlvbiB2YWx1ZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVjbC5pbml0ID0gbnVsbDtcbiAgICB9XG4gICAgbm9kZS5kZWNsYXJhdGlvbnMucHVzaCh0aGlzLmZpbmlzaE5vZGUoZGVjbCwgXCJWYXJpYWJsZURlY2xhcmF0b3JcIikpO1xuICAgIGlmICghdGhpcy5lYXQodHlwZXMkMS5jb21tYSkpIHsgYnJlYWsgfVxuICB9XG4gIHJldHVybiBub2RlXG59O1xuXG5wcCQ4LnBhcnNlVmFySWQgPSBmdW5jdGlvbihkZWNsLCBraW5kKSB7XG4gIGRlY2wuaWQgPSBraW5kID09PSBcInVzaW5nXCIgfHwga2luZCA9PT0gXCJhd2FpdCB1c2luZ1wiXG4gICAgPyB0aGlzLnBhcnNlSWRlbnQoKVxuICAgIDogdGhpcy5wYXJzZUJpbmRpbmdBdG9tKCk7XG5cbiAgdGhpcy5jaGVja0xWYWxQYXR0ZXJuKGRlY2wuaWQsIGtpbmQgPT09IFwidmFyXCIgPyBCSU5EX1ZBUiA6IEJJTkRfTEVYSUNBTCwgZmFsc2UpO1xufTtcblxudmFyIEZVTkNfU1RBVEVNRU5UID0gMSwgRlVOQ19IQU5HSU5HX1NUQVRFTUVOVCA9IDIsIEZVTkNfTlVMTEFCTEVfSUQgPSA0O1xuXG4vLyBQYXJzZSBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIG9yIGxpdGVyYWwgKGRlcGVuZGluZyBvbiB0aGVcbi8vIGBzdGF0ZW1lbnQgJiBGVU5DX1NUQVRFTUVOVGApLlxuXG4vLyBSZW1vdmUgYGFsbG93RXhwcmVzc2lvbkJvZHlgIGZvciA3LjAuMCwgYXMgaXQgaXMgb25seSBjYWxsZWQgd2l0aCBmYWxzZVxucHAkOC5wYXJzZUZ1bmN0aW9uID0gZnVuY3Rpb24obm9kZSwgc3RhdGVtZW50LCBhbGxvd0V4cHJlc3Npb25Cb2R5LCBpc0FzeW5jLCBmb3JJbml0KSB7XG4gIHRoaXMuaW5pdEZ1bmN0aW9uKG5vZGUpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgfHwgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgIWlzQXN5bmMpIHtcbiAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnN0YXIgJiYgKHN0YXRlbWVudCAmIEZVTkNfSEFOR0lOR19TVEFURU1FTlQpKVxuICAgICAgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIG5vZGUuZ2VuZXJhdG9yID0gdGhpcy5lYXQodHlwZXMkMS5zdGFyKTtcbiAgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgpXG4gICAgeyBub2RlLmFzeW5jID0gISFpc0FzeW5jOyB9XG5cbiAgaWYgKHN0YXRlbWVudCAmIEZVTkNfU1RBVEVNRU5UKSB7XG4gICAgbm9kZS5pZCA9IChzdGF0ZW1lbnQgJiBGVU5DX05VTExBQkxFX0lEKSAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEubmFtZSA/IG51bGwgOiB0aGlzLnBhcnNlSWRlbnQoKTtcbiAgICBpZiAobm9kZS5pZCAmJiAhKHN0YXRlbWVudCAmIEZVTkNfSEFOR0lOR19TVEFURU1FTlQpKVxuICAgICAgLy8gSWYgaXQgaXMgYSByZWd1bGFyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGluIHNsb3BweSBtb2RlLCB0aGVuIGl0IGlzXG4gICAgICAvLyBzdWJqZWN0IHRvIEFubmV4IEIgc2VtYW50aWNzIChCSU5EX0ZVTkNUSU9OKS4gT3RoZXJ3aXNlLCB0aGUgYmluZGluZ1xuICAgICAgLy8gbW9kZSBkZXBlbmRzIG9uIHByb3BlcnRpZXMgb2YgdGhlIGN1cnJlbnQgc2NvcGUgKHNlZVxuICAgICAgLy8gdHJlYXRGdW5jdGlvbnNBc1ZhcikuXG4gICAgICB7IHRoaXMuY2hlY2tMVmFsU2ltcGxlKG5vZGUuaWQsICh0aGlzLnN0cmljdCB8fCBub2RlLmdlbmVyYXRvciB8fCBub2RlLmFzeW5jKSA/IHRoaXMudHJlYXRGdW5jdGlvbnNBc1ZhciA/IEJJTkRfVkFSIDogQklORF9MRVhJQ0FMIDogQklORF9GVU5DVElPTik7IH1cbiAgfVxuXG4gIHZhciBvbGRZaWVsZFBvcyA9IHRoaXMueWllbGRQb3MsIG9sZEF3YWl0UG9zID0gdGhpcy5hd2FpdFBvcywgb2xkQXdhaXRJZGVudFBvcyA9IHRoaXMuYXdhaXRJZGVudFBvcztcbiAgdGhpcy55aWVsZFBvcyA9IDA7XG4gIHRoaXMuYXdhaXRQb3MgPSAwO1xuICB0aGlzLmF3YWl0SWRlbnRQb3MgPSAwO1xuICB0aGlzLmVudGVyU2NvcGUoZnVuY3Rpb25GbGFncyhub2RlLmFzeW5jLCBub2RlLmdlbmVyYXRvcikpO1xuXG4gIGlmICghKHN0YXRlbWVudCAmIEZVTkNfU1RBVEVNRU5UKSlcbiAgICB7IG5vZGUuaWQgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSA/IHRoaXMucGFyc2VJZGVudCgpIDogbnVsbDsgfVxuXG4gIHRoaXMucGFyc2VGdW5jdGlvblBhcmFtcyhub2RlKTtcbiAgdGhpcy5wYXJzZUZ1bmN0aW9uQm9keShub2RlLCBhbGxvd0V4cHJlc3Npb25Cb2R5LCBmYWxzZSwgZm9ySW5pdCk7XG5cbiAgdGhpcy55aWVsZFBvcyA9IG9sZFlpZWxkUG9zO1xuICB0aGlzLmF3YWl0UG9zID0gb2xkQXdhaXRQb3M7XG4gIHRoaXMuYXdhaXRJZGVudFBvcyA9IG9sZEF3YWl0SWRlbnRQb3M7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgKHN0YXRlbWVudCAmIEZVTkNfU1RBVEVNRU5UKSA/IFwiRnVuY3Rpb25EZWNsYXJhdGlvblwiIDogXCJGdW5jdGlvbkV4cHJlc3Npb25cIilcbn07XG5cbnBwJDgucGFyc2VGdW5jdGlvblBhcmFtcyA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlbkwpO1xuICBub2RlLnBhcmFtcyA9IHRoaXMucGFyc2VCaW5kaW5nTGlzdCh0eXBlcyQxLnBhcmVuUiwgZmFsc2UsIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4KTtcbiAgdGhpcy5jaGVja1lpZWxkQXdhaXRJbkRlZmF1bHRQYXJhbXMoKTtcbn07XG5cbi8vIFBhcnNlIGEgY2xhc3MgZGVjbGFyYXRpb24gb3IgbGl0ZXJhbCAoZGVwZW5kaW5nIG9uIHRoZVxuLy8gYGlzU3RhdGVtZW50YCBwYXJhbWV0ZXIpLlxuXG5wcCQ4LnBhcnNlQ2xhc3MgPSBmdW5jdGlvbihub2RlLCBpc1N0YXRlbWVudCkge1xuICB0aGlzLm5leHQoKTtcblxuICAvLyBlY21hLTI2MiAxNC42IENsYXNzIERlZmluaXRpb25zXG4gIC8vIEEgY2xhc3MgZGVmaW5pdGlvbiBpcyBhbHdheXMgc3RyaWN0IG1vZGUgY29kZS5cbiAgdmFyIG9sZFN0cmljdCA9IHRoaXMuc3RyaWN0O1xuICB0aGlzLnN0cmljdCA9IHRydWU7XG5cbiAgdGhpcy5wYXJzZUNsYXNzSWQobm9kZSwgaXNTdGF0ZW1lbnQpO1xuICB0aGlzLnBhcnNlQ2xhc3NTdXBlcihub2RlKTtcbiAgdmFyIHByaXZhdGVOYW1lTWFwID0gdGhpcy5lbnRlckNsYXNzQm9keSgpO1xuICB2YXIgY2xhc3NCb2R5ID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdmFyIGhhZENvbnN0cnVjdG9yID0gZmFsc2U7XG4gIGNsYXNzQm9keS5ib2R5ID0gW107XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2VMKTtcbiAgd2hpbGUgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5icmFjZVIpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMucGFyc2VDbGFzc0VsZW1lbnQobm9kZS5zdXBlckNsYXNzICE9PSBudWxsKTtcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgY2xhc3NCb2R5LmJvZHkucHVzaChlbGVtZW50KTtcbiAgICAgIGlmIChlbGVtZW50LnR5cGUgPT09IFwiTWV0aG9kRGVmaW5pdGlvblwiICYmIGVsZW1lbnQua2luZCA9PT0gXCJjb25zdHJ1Y3RvclwiKSB7XG4gICAgICAgIGlmIChoYWRDb25zdHJ1Y3RvcikgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZWxlbWVudC5zdGFydCwgXCJEdXBsaWNhdGUgY29uc3RydWN0b3IgaW4gdGhlIHNhbWUgY2xhc3NcIik7IH1cbiAgICAgICAgaGFkQ29uc3RydWN0b3IgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmtleSAmJiBlbGVtZW50LmtleS50eXBlID09PSBcIlByaXZhdGVJZGVudGlmaWVyXCIgJiYgaXNQcml2YXRlTmFtZUNvbmZsaWN0ZWQocHJpdmF0ZU5hbWVNYXAsIGVsZW1lbnQpKSB7XG4gICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShlbGVtZW50LmtleS5zdGFydCwgKFwiSWRlbnRpZmllciAnI1wiICsgKGVsZW1lbnQua2V5Lm5hbWUpICsgXCInIGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWRcIikpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICB0aGlzLnN0cmljdCA9IG9sZFN0cmljdDtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUuYm9keSA9IHRoaXMuZmluaXNoTm9kZShjbGFzc0JvZHksIFwiQ2xhc3NCb2R5XCIpO1xuICB0aGlzLmV4aXRDbGFzc0JvZHkoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBpc1N0YXRlbWVudCA/IFwiQ2xhc3NEZWNsYXJhdGlvblwiIDogXCJDbGFzc0V4cHJlc3Npb25cIilcbn07XG5cbnBwJDgucGFyc2VDbGFzc0VsZW1lbnQgPSBmdW5jdGlvbihjb25zdHJ1Y3RvckFsbG93c1N1cGVyKSB7XG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLnNlbWkpKSB7IHJldHVybiBudWxsIH1cblxuICB2YXIgZWNtYVZlcnNpb24gPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb247XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdmFyIGtleU5hbWUgPSBcIlwiO1xuICB2YXIgaXNHZW5lcmF0b3IgPSBmYWxzZTtcbiAgdmFyIGlzQXN5bmMgPSBmYWxzZTtcbiAgdmFyIGtpbmQgPSBcIm1ldGhvZFwiO1xuICB2YXIgaXNTdGF0aWMgPSBmYWxzZTtcblxuICBpZiAodGhpcy5lYXRDb250ZXh0dWFsKFwic3RhdGljXCIpKSB7XG4gICAgLy8gUGFyc2Ugc3RhdGljIGluaXQgYmxvY2tcbiAgICBpZiAoZWNtYVZlcnNpb24gPj0gMTMgJiYgdGhpcy5lYXQodHlwZXMkMS5icmFjZUwpKSB7XG4gICAgICB0aGlzLnBhcnNlQ2xhc3NTdGF0aWNCbG9jayhub2RlKTtcbiAgICAgIHJldHVybiBub2RlXG4gICAgfVxuICAgIGlmICh0aGlzLmlzQ2xhc3NFbGVtZW50TmFtZVN0YXJ0KCkgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLnN0YXIpIHtcbiAgICAgIGlzU3RhdGljID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5TmFtZSA9IFwic3RhdGljXCI7XG4gICAgfVxuICB9XG4gIG5vZGUuc3RhdGljID0gaXNTdGF0aWM7XG4gIGlmICgha2V5TmFtZSAmJiBlY21hVmVyc2lvbiA+PSA4ICYmIHRoaXMuZWF0Q29udGV4dHVhbChcImFzeW5jXCIpKSB7XG4gICAgaWYgKCh0aGlzLmlzQ2xhc3NFbGVtZW50TmFtZVN0YXJ0KCkgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLnN0YXIpICYmICF0aGlzLmNhbkluc2VydFNlbWljb2xvbigpKSB7XG4gICAgICBpc0FzeW5jID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5TmFtZSA9IFwiYXN5bmNcIjtcbiAgICB9XG4gIH1cbiAgaWYgKCFrZXlOYW1lICYmIChlY21hVmVyc2lvbiA+PSA5IHx8ICFpc0FzeW5jKSAmJiB0aGlzLmVhdCh0eXBlcyQxLnN0YXIpKSB7XG4gICAgaXNHZW5lcmF0b3IgPSB0cnVlO1xuICB9XG4gIGlmICgha2V5TmFtZSAmJiAhaXNBc3luYyAmJiAhaXNHZW5lcmF0b3IpIHtcbiAgICB2YXIgbGFzdFZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICBpZiAodGhpcy5lYXRDb250ZXh0dWFsKFwiZ2V0XCIpIHx8IHRoaXMuZWF0Q29udGV4dHVhbChcInNldFwiKSkge1xuICAgICAgaWYgKHRoaXMuaXNDbGFzc0VsZW1lbnROYW1lU3RhcnQoKSkge1xuICAgICAgICBraW5kID0gbGFzdFZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAga2V5TmFtZSA9IGxhc3RWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBQYXJzZSBlbGVtZW50IG5hbWVcbiAgaWYgKGtleU5hbWUpIHtcbiAgICAvLyAnYXN5bmMnLCAnZ2V0JywgJ3NldCcsIG9yICdzdGF0aWMnIHdlcmUgbm90IGEga2V5d29yZCBjb250ZXh0dWFsbHkuXG4gICAgLy8gVGhlIGxhc3QgdG9rZW4gaXMgYW55IG9mIHRob3NlLiBNYWtlIGl0IHRoZSBlbGVtZW50IG5hbWUuXG4gICAgbm9kZS5jb21wdXRlZCA9IGZhbHNlO1xuICAgIG5vZGUua2V5ID0gdGhpcy5zdGFydE5vZGVBdCh0aGlzLmxhc3RUb2tTdGFydCwgdGhpcy5sYXN0VG9rU3RhcnRMb2MpO1xuICAgIG5vZGUua2V5Lm5hbWUgPSBrZXlOYW1lO1xuICAgIHRoaXMuZmluaXNoTm9kZShub2RlLmtleSwgXCJJZGVudGlmaWVyXCIpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFyc2VDbGFzc0VsZW1lbnROYW1lKG5vZGUpO1xuICB9XG5cbiAgLy8gUGFyc2UgZWxlbWVudCB2YWx1ZVxuICBpZiAoZWNtYVZlcnNpb24gPCAxMyB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEucGFyZW5MIHx8IGtpbmQgIT09IFwibWV0aG9kXCIgfHwgaXNHZW5lcmF0b3IgfHwgaXNBc3luYykge1xuICAgIHZhciBpc0NvbnN0cnVjdG9yID0gIW5vZGUuc3RhdGljICYmIGNoZWNrS2V5TmFtZShub2RlLCBcImNvbnN0cnVjdG9yXCIpO1xuICAgIHZhciBhbGxvd3NEaXJlY3RTdXBlciA9IGlzQ29uc3RydWN0b3IgJiYgY29uc3RydWN0b3JBbGxvd3NTdXBlcjtcbiAgICAvLyBDb3VsZG4ndCBtb3ZlIHRoaXMgY2hlY2sgaW50byB0aGUgJ3BhcnNlQ2xhc3NNZXRob2QnIG1ldGhvZCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eS5cbiAgICBpZiAoaXNDb25zdHJ1Y3RvciAmJiBraW5kICE9PSBcIm1ldGhvZFwiKSB7IHRoaXMucmFpc2Uobm9kZS5rZXkuc3RhcnQsIFwiQ29uc3RydWN0b3IgY2FuJ3QgaGF2ZSBnZXQvc2V0IG1vZGlmaWVyXCIpOyB9XG4gICAgbm9kZS5raW5kID0gaXNDb25zdHJ1Y3RvciA/IFwiY29uc3RydWN0b3JcIiA6IGtpbmQ7XG4gICAgdGhpcy5wYXJzZUNsYXNzTWV0aG9kKG5vZGUsIGlzR2VuZXJhdG9yLCBpc0FzeW5jLCBhbGxvd3NEaXJlY3RTdXBlcik7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJzZUNsYXNzRmllbGQobm9kZSk7XG4gIH1cblxuICByZXR1cm4gbm9kZVxufTtcblxucHAkOC5pc0NsYXNzRWxlbWVudE5hbWVTdGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKFxuICAgIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lIHx8XG4gICAgdGhpcy50eXBlID09PSB0eXBlcyQxLnByaXZhdGVJZCB8fFxuICAgIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5udW0gfHxcbiAgICB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RyaW5nIHx8XG4gICAgdGhpcy50eXBlID09PSB0eXBlcyQxLmJyYWNrZXRMIHx8XG4gICAgdGhpcy50eXBlLmtleXdvcmRcbiAgKVxufTtcblxucHAkOC5wYXJzZUNsYXNzRWxlbWVudE5hbWUgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEucHJpdmF0ZUlkKSB7XG4gICAgaWYgKHRoaXMudmFsdWUgPT09IFwiY29uc3RydWN0b3JcIikge1xuICAgICAgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIkNsYXNzZXMgY2FuJ3QgaGF2ZSBhbiBlbGVtZW50IG5hbWVkICcjY29uc3RydWN0b3InXCIpO1xuICAgIH1cbiAgICBlbGVtZW50LmNvbXB1dGVkID0gZmFsc2U7XG4gICAgZWxlbWVudC5rZXkgPSB0aGlzLnBhcnNlUHJpdmF0ZUlkZW50KCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJzZVByb3BlcnR5TmFtZShlbGVtZW50KTtcbiAgfVxufTtcblxucHAkOC5wYXJzZUNsYXNzTWV0aG9kID0gZnVuY3Rpb24obWV0aG9kLCBpc0dlbmVyYXRvciwgaXNBc3luYywgYWxsb3dzRGlyZWN0U3VwZXIpIHtcbiAgLy8gQ2hlY2sga2V5IGFuZCBmbGFnc1xuICB2YXIga2V5ID0gbWV0aG9kLmtleTtcbiAgaWYgKG1ldGhvZC5raW5kID09PSBcImNvbnN0cnVjdG9yXCIpIHtcbiAgICBpZiAoaXNHZW5lcmF0b3IpIHsgdGhpcy5yYWlzZShrZXkuc3RhcnQsIFwiQ29uc3RydWN0b3IgY2FuJ3QgYmUgYSBnZW5lcmF0b3JcIik7IH1cbiAgICBpZiAoaXNBc3luYykgeyB0aGlzLnJhaXNlKGtleS5zdGFydCwgXCJDb25zdHJ1Y3RvciBjYW4ndCBiZSBhbiBhc3luYyBtZXRob2RcIik7IH1cbiAgfSBlbHNlIGlmIChtZXRob2Quc3RhdGljICYmIGNoZWNrS2V5TmFtZShtZXRob2QsIFwicHJvdG90eXBlXCIpKSB7XG4gICAgdGhpcy5yYWlzZShrZXkuc3RhcnQsIFwiQ2xhc3NlcyBtYXkgbm90IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgbmFtZWQgcHJvdG90eXBlXCIpO1xuICB9XG5cbiAgLy8gUGFyc2UgdmFsdWVcbiAgdmFyIHZhbHVlID0gbWV0aG9kLnZhbHVlID0gdGhpcy5wYXJzZU1ldGhvZChpc0dlbmVyYXRvciwgaXNBc3luYywgYWxsb3dzRGlyZWN0U3VwZXIpO1xuXG4gIC8vIENoZWNrIHZhbHVlXG4gIGlmIChtZXRob2Qua2luZCA9PT0gXCJnZXRcIiAmJiB2YWx1ZS5wYXJhbXMubGVuZ3RoICE9PSAwKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHZhbHVlLnN0YXJ0LCBcImdldHRlciBzaG91bGQgaGF2ZSBubyBwYXJhbXNcIik7IH1cbiAgaWYgKG1ldGhvZC5raW5kID09PSBcInNldFwiICYmIHZhbHVlLnBhcmFtcy5sZW5ndGggIT09IDEpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodmFsdWUuc3RhcnQsIFwic2V0dGVyIHNob3VsZCBoYXZlIGV4YWN0bHkgb25lIHBhcmFtXCIpOyB9XG4gIGlmIChtZXRob2Qua2luZCA9PT0gXCJzZXRcIiAmJiB2YWx1ZS5wYXJhbXNbMF0udHlwZSA9PT0gXCJSZXN0RWxlbWVudFwiKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHZhbHVlLnBhcmFtc1swXS5zdGFydCwgXCJTZXR0ZXIgY2Fubm90IHVzZSByZXN0IHBhcmFtc1wiKTsgfVxuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobWV0aG9kLCBcIk1ldGhvZERlZmluaXRpb25cIilcbn07XG5cbnBwJDgucGFyc2VDbGFzc0ZpZWxkID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgaWYgKGNoZWNrS2V5TmFtZShmaWVsZCwgXCJjb25zdHJ1Y3RvclwiKSkge1xuICAgIHRoaXMucmFpc2UoZmllbGQua2V5LnN0YXJ0LCBcIkNsYXNzZXMgY2FuJ3QgaGF2ZSBhIGZpZWxkIG5hbWVkICdjb25zdHJ1Y3RvcidcIik7XG4gIH0gZWxzZSBpZiAoZmllbGQuc3RhdGljICYmIGNoZWNrS2V5TmFtZShmaWVsZCwgXCJwcm90b3R5cGVcIikpIHtcbiAgICB0aGlzLnJhaXNlKGZpZWxkLmtleS5zdGFydCwgXCJDbGFzc2VzIGNhbid0IGhhdmUgYSBzdGF0aWMgZmllbGQgbmFtZWQgJ3Byb3RvdHlwZSdcIik7XG4gIH1cblxuICBpZiAodGhpcy5lYXQodHlwZXMkMS5lcSkpIHtcbiAgICAvLyBUbyByYWlzZSBTeW50YXhFcnJvciBpZiAnYXJndW1lbnRzJyBleGlzdHMgaW4gdGhlIGluaXRpYWxpemVyLlxuICAgIHRoaXMuZW50ZXJTY29wZShTQ09QRV9DTEFTU19GSUVMRF9JTklUIHwgU0NPUEVfU1VQRVIpO1xuICAgIGZpZWxkLnZhbHVlID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG4gICAgdGhpcy5leGl0U2NvcGUoKTtcbiAgfSBlbHNlIHtcbiAgICBmaWVsZC52YWx1ZSA9IG51bGw7XG4gIH1cbiAgdGhpcy5zZW1pY29sb24oKTtcblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKGZpZWxkLCBcIlByb3BlcnR5RGVmaW5pdGlvblwiKVxufTtcblxucHAkOC5wYXJzZUNsYXNzU3RhdGljQmxvY2sgPSBmdW5jdGlvbihub2RlKSB7XG4gIG5vZGUuYm9keSA9IFtdO1xuXG4gIHZhciBvbGRMYWJlbHMgPSB0aGlzLmxhYmVscztcbiAgdGhpcy5sYWJlbHMgPSBbXTtcbiAgdGhpcy5lbnRlclNjb3BlKFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSyB8IFNDT1BFX1NVUEVSKTtcbiAgd2hpbGUgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5icmFjZVIpIHtcbiAgICB2YXIgc3RtdCA9IHRoaXMucGFyc2VTdGF0ZW1lbnQobnVsbCk7XG4gICAgbm9kZS5ib2R5LnB1c2goc3RtdCk7XG4gIH1cbiAgdGhpcy5uZXh0KCk7XG4gIHRoaXMuZXhpdFNjb3BlKCk7XG4gIHRoaXMubGFiZWxzID0gb2xkTGFiZWxzO1xuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJTdGF0aWNCbG9ja1wiKVxufTtcblxucHAkOC5wYXJzZUNsYXNzSWQgPSBmdW5jdGlvbihub2RlLCBpc1N0YXRlbWVudCkge1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUpIHtcbiAgICBub2RlLmlkID0gdGhpcy5wYXJzZUlkZW50KCk7XG4gICAgaWYgKGlzU3RhdGVtZW50KVxuICAgICAgeyB0aGlzLmNoZWNrTFZhbFNpbXBsZShub2RlLmlkLCBCSU5EX0xFWElDQUwsIGZhbHNlKTsgfVxuICB9IGVsc2Uge1xuICAgIGlmIChpc1N0YXRlbWVudCA9PT0gdHJ1ZSlcbiAgICAgIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICBub2RlLmlkID0gbnVsbDtcbiAgfVxufTtcblxucHAkOC5wYXJzZUNsYXNzU3VwZXIgPSBmdW5jdGlvbihub2RlKSB7XG4gIG5vZGUuc3VwZXJDbGFzcyA9IHRoaXMuZWF0KHR5cGVzJDEuX2V4dGVuZHMpID8gdGhpcy5wYXJzZUV4cHJTdWJzY3JpcHRzKG51bGwsIGZhbHNlKSA6IG51bGw7XG59O1xuXG5wcCQ4LmVudGVyQ2xhc3NCb2R5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBlbGVtZW50ID0ge2RlY2xhcmVkOiBPYmplY3QuY3JlYXRlKG51bGwpLCB1c2VkOiBbXX07XG4gIHRoaXMucHJpdmF0ZU5hbWVTdGFjay5wdXNoKGVsZW1lbnQpO1xuICByZXR1cm4gZWxlbWVudC5kZWNsYXJlZFxufTtcblxucHAkOC5leGl0Q2xhc3NCb2R5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZWYgPSB0aGlzLnByaXZhdGVOYW1lU3RhY2sucG9wKCk7XG4gIHZhciBkZWNsYXJlZCA9IHJlZi5kZWNsYXJlZDtcbiAgdmFyIHVzZWQgPSByZWYudXNlZDtcbiAgaWYgKCF0aGlzLm9wdGlvbnMuY2hlY2tQcml2YXRlRmllbGRzKSB7IHJldHVybiB9XG4gIHZhciBsZW4gPSB0aGlzLnByaXZhdGVOYW1lU3RhY2subGVuZ3RoO1xuICB2YXIgcGFyZW50ID0gbGVuID09PSAwID8gbnVsbCA6IHRoaXMucHJpdmF0ZU5hbWVTdGFja1tsZW4gLSAxXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2VkLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGlkID0gdXNlZFtpXTtcbiAgICBpZiAoIWhhc093bihkZWNsYXJlZCwgaWQubmFtZSkpIHtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50LnVzZWQucHVzaChpZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoaWQuc3RhcnQsIChcIlByaXZhdGUgZmllbGQgJyNcIiArIChpZC5uYW1lKSArIFwiJyBtdXN0IGJlIGRlY2xhcmVkIGluIGFuIGVuY2xvc2luZyBjbGFzc1wiKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBpc1ByaXZhdGVOYW1lQ29uZmxpY3RlZChwcml2YXRlTmFtZU1hcCwgZWxlbWVudCkge1xuICB2YXIgbmFtZSA9IGVsZW1lbnQua2V5Lm5hbWU7XG4gIHZhciBjdXJyID0gcHJpdmF0ZU5hbWVNYXBbbmFtZV07XG5cbiAgdmFyIG5leHQgPSBcInRydWVcIjtcbiAgaWYgKGVsZW1lbnQudHlwZSA9PT0gXCJNZXRob2REZWZpbml0aW9uXCIgJiYgKGVsZW1lbnQua2luZCA9PT0gXCJnZXRcIiB8fCBlbGVtZW50LmtpbmQgPT09IFwic2V0XCIpKSB7XG4gICAgbmV4dCA9IChlbGVtZW50LnN0YXRpYyA/IFwic1wiIDogXCJpXCIpICsgZWxlbWVudC5raW5kO1xuICB9XG5cbiAgLy8gYGNsYXNzIHsgZ2V0ICNhKCl7fTsgc3RhdGljIHNldCAjYShfKXt9IH1gIGlzIGFsc28gY29uZmxpY3QuXG4gIGlmIChcbiAgICBjdXJyID09PSBcImlnZXRcIiAmJiBuZXh0ID09PSBcImlzZXRcIiB8fFxuICAgIGN1cnIgPT09IFwiaXNldFwiICYmIG5leHQgPT09IFwiaWdldFwiIHx8XG4gICAgY3VyciA9PT0gXCJzZ2V0XCIgJiYgbmV4dCA9PT0gXCJzc2V0XCIgfHxcbiAgICBjdXJyID09PSBcInNzZXRcIiAmJiBuZXh0ID09PSBcInNnZXRcIlxuICApIHtcbiAgICBwcml2YXRlTmFtZU1hcFtuYW1lXSA9IFwidHJ1ZVwiO1xuICAgIHJldHVybiBmYWxzZVxuICB9IGVsc2UgaWYgKCFjdXJyKSB7XG4gICAgcHJpdmF0ZU5hbWVNYXBbbmFtZV0gPSBuZXh0O1xuICAgIHJldHVybiBmYWxzZVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tLZXlOYW1lKG5vZGUsIG5hbWUpIHtcbiAgdmFyIGNvbXB1dGVkID0gbm9kZS5jb21wdXRlZDtcbiAgdmFyIGtleSA9IG5vZGUua2V5O1xuICByZXR1cm4gIWNvbXB1dGVkICYmIChcbiAgICBrZXkudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgJiYga2V5Lm5hbWUgPT09IG5hbWUgfHxcbiAgICBrZXkudHlwZSA9PT0gXCJMaXRlcmFsXCIgJiYga2V5LnZhbHVlID09PSBuYW1lXG4gIClcbn1cblxuLy8gUGFyc2VzIG1vZHVsZSBleHBvcnQgZGVjbGFyYXRpb24uXG5cbnBwJDgucGFyc2VFeHBvcnRBbGxEZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKG5vZGUsIGV4cG9ydHMpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMSkge1xuICAgIGlmICh0aGlzLmVhdENvbnRleHR1YWwoXCJhc1wiKSkge1xuICAgICAgbm9kZS5leHBvcnRlZCA9IHRoaXMucGFyc2VNb2R1bGVFeHBvcnROYW1lKCk7XG4gICAgICB0aGlzLmNoZWNrRXhwb3J0KGV4cG9ydHMsIG5vZGUuZXhwb3J0ZWQsIHRoaXMubGFzdFRva1N0YXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5leHBvcnRlZCA9IG51bGw7XG4gICAgfVxuICB9XG4gIHRoaXMuZXhwZWN0Q29udGV4dHVhbChcImZyb21cIik7XG4gIGlmICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuc3RyaW5nKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gIG5vZGUuc291cmNlID0gdGhpcy5wYXJzZUV4cHJBdG9tKCk7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTYpXG4gICAgeyBub2RlLmF0dHJpYnV0ZXMgPSB0aGlzLnBhcnNlV2l0aENsYXVzZSgpOyB9XG4gIHRoaXMuc2VtaWNvbG9uKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJFeHBvcnRBbGxEZWNsYXJhdGlvblwiKVxufTtcblxucHAkOC5wYXJzZUV4cG9ydCA9IGZ1bmN0aW9uKG5vZGUsIGV4cG9ydHMpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIC8vIGV4cG9ydCAqIGZyb20gJy4uLidcbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuc3RhcikpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUV4cG9ydEFsbERlY2xhcmF0aW9uKG5vZGUsIGV4cG9ydHMpXG4gIH1cbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuX2RlZmF1bHQpKSB7IC8vIGV4cG9ydCBkZWZhdWx0IC4uLlxuICAgIHRoaXMuY2hlY2tFeHBvcnQoZXhwb3J0cywgXCJkZWZhdWx0XCIsIHRoaXMubGFzdFRva1N0YXJ0KTtcbiAgICBub2RlLmRlY2xhcmF0aW9uID0gdGhpcy5wYXJzZUV4cG9ydERlZmF1bHREZWNsYXJhdGlvbigpO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJFeHBvcnREZWZhdWx0RGVjbGFyYXRpb25cIilcbiAgfVxuICAvLyBleHBvcnQgdmFyfGNvbnN0fGxldHxmdW5jdGlvbnxjbGFzcyAuLi5cbiAgaWYgKHRoaXMuc2hvdWxkUGFyc2VFeHBvcnRTdGF0ZW1lbnQoKSkge1xuICAgIG5vZGUuZGVjbGFyYXRpb24gPSB0aGlzLnBhcnNlRXhwb3J0RGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKG5vZGUuZGVjbGFyYXRpb24udHlwZSA9PT0gXCJWYXJpYWJsZURlY2xhcmF0aW9uXCIpXG4gICAgICB7IHRoaXMuY2hlY2tWYXJpYWJsZUV4cG9ydChleHBvcnRzLCBub2RlLmRlY2xhcmF0aW9uLmRlY2xhcmF0aW9ucyk7IH1cbiAgICBlbHNlXG4gICAgICB7IHRoaXMuY2hlY2tFeHBvcnQoZXhwb3J0cywgbm9kZS5kZWNsYXJhdGlvbi5pZCwgbm9kZS5kZWNsYXJhdGlvbi5pZC5zdGFydCk7IH1cbiAgICBub2RlLnNwZWNpZmllcnMgPSBbXTtcbiAgICBub2RlLnNvdXJjZSA9IG51bGw7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNilcbiAgICAgIHsgbm9kZS5hdHRyaWJ1dGVzID0gW107IH1cbiAgfSBlbHNlIHsgLy8gZXhwb3J0IHsgeCwgeSBhcyB6IH0gW2Zyb20gJy4uLiddXG4gICAgbm9kZS5kZWNsYXJhdGlvbiA9IG51bGw7XG4gICAgbm9kZS5zcGVjaWZpZXJzID0gdGhpcy5wYXJzZUV4cG9ydFNwZWNpZmllcnMoZXhwb3J0cyk7XG4gICAgaWYgKHRoaXMuZWF0Q29udGV4dHVhbChcImZyb21cIikpIHtcbiAgICAgIGlmICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuc3RyaW5nKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgICBub2RlLnNvdXJjZSA9IHRoaXMucGFyc2VFeHByQXRvbSgpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNilcbiAgICAgICAgeyBub2RlLmF0dHJpYnV0ZXMgPSB0aGlzLnBhcnNlV2l0aENsYXVzZSgpOyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gbm9kZS5zcGVjaWZpZXJzOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAvLyBjaGVjayBmb3Iga2V5d29yZHMgdXNlZCBhcyBsb2NhbCBuYW1lc1xuICAgICAgICB2YXIgc3BlYyA9IGxpc3RbaV07XG5cbiAgICAgICAgdGhpcy5jaGVja1VucmVzZXJ2ZWQoc3BlYy5sb2NhbCk7XG4gICAgICAgIC8vIGNoZWNrIGlmIGV4cG9ydCBpcyBkZWZpbmVkXG4gICAgICAgIHRoaXMuY2hlY2tMb2NhbEV4cG9ydChzcGVjLmxvY2FsKTtcblxuICAgICAgICBpZiAoc3BlYy5sb2NhbC50eXBlID09PSBcIkxpdGVyYWxcIikge1xuICAgICAgICAgIHRoaXMucmFpc2Uoc3BlYy5sb2NhbC5zdGFydCwgXCJBIHN0cmluZyBsaXRlcmFsIGNhbm5vdCBiZSB1c2VkIGFzIGFuIGV4cG9ydGVkIGJpbmRpbmcgd2l0aG91dCBgZnJvbWAuXCIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIG5vZGUuc291cmNlID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTYpXG4gICAgICAgIHsgbm9kZS5hdHRyaWJ1dGVzID0gW107IH1cbiAgICB9XG4gICAgdGhpcy5zZW1pY29sb24oKTtcbiAgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRXhwb3J0TmFtZWREZWNsYXJhdGlvblwiKVxufTtcblxucHAkOC5wYXJzZUV4cG9ydERlY2xhcmF0aW9uID0gZnVuY3Rpb24obm9kZSkge1xuICByZXR1cm4gdGhpcy5wYXJzZVN0YXRlbWVudChudWxsKVxufTtcblxucHAkOC5wYXJzZUV4cG9ydERlZmF1bHREZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaXNBc3luYztcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fZnVuY3Rpb24gfHwgKGlzQXN5bmMgPSB0aGlzLmlzQXN5bmNGdW5jdGlvbigpKSkge1xuICAgIHZhciBmTm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgaWYgKGlzQXN5bmMpIHsgdGhpcy5uZXh0KCk7IH1cbiAgICByZXR1cm4gdGhpcy5wYXJzZUZ1bmN0aW9uKGZOb2RlLCBGVU5DX1NUQVRFTUVOVCB8IEZVTkNfTlVMTEFCTEVfSUQsIGZhbHNlLCBpc0FzeW5jKVxuICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fY2xhc3MpIHtcbiAgICB2YXIgY05vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHJldHVybiB0aGlzLnBhcnNlQ2xhc3MoY05vZGUsIFwibnVsbGFibGVJRFwiKVxuICB9IGVsc2Uge1xuICAgIHZhciBkZWNsYXJhdGlvbiA9IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuICAgIHRoaXMuc2VtaWNvbG9uKCk7XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uXG4gIH1cbn07XG5cbnBwJDguY2hlY2tFeHBvcnQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBwb3MpIHtcbiAgaWYgKCFleHBvcnRzKSB7IHJldHVybiB9XG4gIGlmICh0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIilcbiAgICB7IG5hbWUgPSBuYW1lLnR5cGUgPT09IFwiSWRlbnRpZmllclwiID8gbmFtZS5uYW1lIDogbmFtZS52YWx1ZTsgfVxuICBpZiAoaGFzT3duKGV4cG9ydHMsIG5hbWUpKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHBvcywgXCJEdXBsaWNhdGUgZXhwb3J0ICdcIiArIG5hbWUgKyBcIidcIik7IH1cbiAgZXhwb3J0c1tuYW1lXSA9IHRydWU7XG59O1xuXG5wcCQ4LmNoZWNrUGF0dGVybkV4cG9ydCA9IGZ1bmN0aW9uKGV4cG9ydHMsIHBhdCkge1xuICB2YXIgdHlwZSA9IHBhdC50eXBlO1xuICBpZiAodHlwZSA9PT0gXCJJZGVudGlmaWVyXCIpXG4gICAgeyB0aGlzLmNoZWNrRXhwb3J0KGV4cG9ydHMsIHBhdCwgcGF0LnN0YXJ0KTsgfVxuICBlbHNlIGlmICh0eXBlID09PSBcIk9iamVjdFBhdHRlcm5cIilcbiAgICB7IGZvciAodmFyIGkgPSAwLCBsaXN0ID0gcGF0LnByb3BlcnRpZXM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKVxuICAgICAge1xuICAgICAgICB2YXIgcHJvcCA9IGxpc3RbaV07XG5cbiAgICAgICAgdGhpcy5jaGVja1BhdHRlcm5FeHBvcnQoZXhwb3J0cywgcHJvcCk7XG4gICAgICB9IH1cbiAgZWxzZSBpZiAodHlwZSA9PT0gXCJBcnJheVBhdHRlcm5cIilcbiAgICB7IGZvciAodmFyIGkkMSA9IDAsIGxpc3QkMSA9IHBhdC5lbGVtZW50czsgaSQxIDwgbGlzdCQxLmxlbmd0aDsgaSQxICs9IDEpIHtcbiAgICAgIHZhciBlbHQgPSBsaXN0JDFbaSQxXTtcblxuICAgICAgICBpZiAoZWx0KSB7IHRoaXMuY2hlY2tQYXR0ZXJuRXhwb3J0KGV4cG9ydHMsIGVsdCk7IH1cbiAgICB9IH1cbiAgZWxzZSBpZiAodHlwZSA9PT0gXCJQcm9wZXJ0eVwiKVxuICAgIHsgdGhpcy5jaGVja1BhdHRlcm5FeHBvcnQoZXhwb3J0cywgcGF0LnZhbHVlKTsgfVxuICBlbHNlIGlmICh0eXBlID09PSBcIkFzc2lnbm1lbnRQYXR0ZXJuXCIpXG4gICAgeyB0aGlzLmNoZWNrUGF0dGVybkV4cG9ydChleHBvcnRzLCBwYXQubGVmdCk7IH1cbiAgZWxzZSBpZiAodHlwZSA9PT0gXCJSZXN0RWxlbWVudFwiKVxuICAgIHsgdGhpcy5jaGVja1BhdHRlcm5FeHBvcnQoZXhwb3J0cywgcGF0LmFyZ3VtZW50KTsgfVxufTtcblxucHAkOC5jaGVja1ZhcmlhYmxlRXhwb3J0ID0gZnVuY3Rpb24oZXhwb3J0cywgZGVjbHMpIHtcbiAgaWYgKCFleHBvcnRzKSB7IHJldHVybiB9XG4gIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gZGVjbHM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKVxuICAgIHtcbiAgICB2YXIgZGVjbCA9IGxpc3RbaV07XG5cbiAgICB0aGlzLmNoZWNrUGF0dGVybkV4cG9ydChleHBvcnRzLCBkZWNsLmlkKTtcbiAgfVxufTtcblxucHAkOC5zaG91bGRQYXJzZUV4cG9ydFN0YXRlbWVudCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50eXBlLmtleXdvcmQgPT09IFwidmFyXCIgfHxcbiAgICB0aGlzLnR5cGUua2V5d29yZCA9PT0gXCJjb25zdFwiIHx8XG4gICAgdGhpcy50eXBlLmtleXdvcmQgPT09IFwiY2xhc3NcIiB8fFxuICAgIHRoaXMudHlwZS5rZXl3b3JkID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICB0aGlzLmlzTGV0KCkgfHxcbiAgICB0aGlzLmlzQXN5bmNGdW5jdGlvbigpXG59O1xuXG4vLyBQYXJzZXMgYSBjb21tYS1zZXBhcmF0ZWQgbGlzdCBvZiBtb2R1bGUgZXhwb3J0cy5cblxucHAkOC5wYXJzZUV4cG9ydFNwZWNpZmllciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBub2RlLmxvY2FsID0gdGhpcy5wYXJzZU1vZHVsZUV4cG9ydE5hbWUoKTtcblxuICBub2RlLmV4cG9ydGVkID0gdGhpcy5lYXRDb250ZXh0dWFsKFwiYXNcIikgPyB0aGlzLnBhcnNlTW9kdWxlRXhwb3J0TmFtZSgpIDogbm9kZS5sb2NhbDtcbiAgdGhpcy5jaGVja0V4cG9ydChcbiAgICBleHBvcnRzLFxuICAgIG5vZGUuZXhwb3J0ZWQsXG4gICAgbm9kZS5leHBvcnRlZC5zdGFydFxuICApO1xuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJFeHBvcnRTcGVjaWZpZXJcIilcbn07XG5cbnBwJDgucGFyc2VFeHBvcnRTcGVjaWZpZXJzID0gZnVuY3Rpb24oZXhwb3J0cykge1xuICB2YXIgbm9kZXMgPSBbXSwgZmlyc3QgPSB0cnVlO1xuICAvLyBleHBvcnQgeyB4LCB5IGFzIHogfSBbZnJvbSAnLi4uJ11cbiAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFjZUwpO1xuICB3aGlsZSAoIXRoaXMuZWF0KHR5cGVzJDEuYnJhY2VSKSkge1xuICAgIGlmICghZmlyc3QpIHtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgaWYgKHRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKHR5cGVzJDEuYnJhY2VSKSkgeyBicmVhayB9XG4gICAgfSBlbHNlIHsgZmlyc3QgPSBmYWxzZTsgfVxuXG4gICAgbm9kZXMucHVzaCh0aGlzLnBhcnNlRXhwb3J0U3BlY2lmaWVyKGV4cG9ydHMpKTtcbiAgfVxuICByZXR1cm4gbm9kZXNcbn07XG5cbi8vIFBhcnNlcyBpbXBvcnQgZGVjbGFyYXRpb24uXG5cbnBwJDgucGFyc2VJbXBvcnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuXG4gIC8vIGltcG9ydCAnLi4uJ1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnN0cmluZykge1xuICAgIG5vZGUuc3BlY2lmaWVycyA9IGVtcHR5JDE7XG4gICAgbm9kZS5zb3VyY2UgPSB0aGlzLnBhcnNlRXhwckF0b20oKTtcbiAgfSBlbHNlIHtcbiAgICBub2RlLnNwZWNpZmllcnMgPSB0aGlzLnBhcnNlSW1wb3J0U3BlY2lmaWVycygpO1xuICAgIHRoaXMuZXhwZWN0Q29udGV4dHVhbChcImZyb21cIik7XG4gICAgbm9kZS5zb3VyY2UgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RyaW5nID8gdGhpcy5wYXJzZUV4cHJBdG9tKCkgOiB0aGlzLnVuZXhwZWN0ZWQoKTtcbiAgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2KVxuICAgIHsgbm9kZS5hdHRyaWJ1dGVzID0gdGhpcy5wYXJzZVdpdGhDbGF1c2UoKTsgfVxuICB0aGlzLnNlbWljb2xvbigpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSW1wb3J0RGVjbGFyYXRpb25cIilcbn07XG5cbi8vIFBhcnNlcyBhIGNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIG1vZHVsZSBpbXBvcnRzLlxuXG5wcCQ4LnBhcnNlSW1wb3J0U3BlY2lmaWVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgbm9kZS5pbXBvcnRlZCA9IHRoaXMucGFyc2VNb2R1bGVFeHBvcnROYW1lKCk7XG5cbiAgaWYgKHRoaXMuZWF0Q29udGV4dHVhbChcImFzXCIpKSB7XG4gICAgbm9kZS5sb2NhbCA9IHRoaXMucGFyc2VJZGVudCgpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuY2hlY2tVbnJlc2VydmVkKG5vZGUuaW1wb3J0ZWQpO1xuICAgIG5vZGUubG9jYWwgPSBub2RlLmltcG9ydGVkO1xuICB9XG4gIHRoaXMuY2hlY2tMVmFsU2ltcGxlKG5vZGUubG9jYWwsIEJJTkRfTEVYSUNBTCk7XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkltcG9ydFNwZWNpZmllclwiKVxufTtcblxucHAkOC5wYXJzZUltcG9ydERlZmF1bHRTcGVjaWZpZXIgPSBmdW5jdGlvbigpIHtcbiAgLy8gaW1wb3J0IGRlZmF1bHRPYmosIHsgeCwgeSBhcyB6IH0gZnJvbSAnLi4uJ1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIG5vZGUubG9jYWwgPSB0aGlzLnBhcnNlSWRlbnQoKTtcbiAgdGhpcy5jaGVja0xWYWxTaW1wbGUobm9kZS5sb2NhbCwgQklORF9MRVhJQ0FMKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkltcG9ydERlZmF1bHRTcGVjaWZpZXJcIilcbn07XG5cbnBwJDgucGFyc2VJbXBvcnROYW1lc3BhY2VTcGVjaWZpZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHQoKTtcbiAgdGhpcy5leHBlY3RDb250ZXh0dWFsKFwiYXNcIik7XG4gIG5vZGUubG9jYWwgPSB0aGlzLnBhcnNlSWRlbnQoKTtcbiAgdGhpcy5jaGVja0xWYWxTaW1wbGUobm9kZS5sb2NhbCwgQklORF9MRVhJQ0FMKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkltcG9ydE5hbWVzcGFjZVNwZWNpZmllclwiKVxufTtcblxucHAkOC5wYXJzZUltcG9ydFNwZWNpZmllcnMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGVzID0gW10sIGZpcnN0ID0gdHJ1ZTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lKSB7XG4gICAgbm9kZXMucHVzaCh0aGlzLnBhcnNlSW1wb3J0RGVmYXVsdFNwZWNpZmllcigpKTtcbiAgICBpZiAoIXRoaXMuZWF0KHR5cGVzJDEuY29tbWEpKSB7IHJldHVybiBub2RlcyB9XG4gIH1cbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdGFyKSB7XG4gICAgbm9kZXMucHVzaCh0aGlzLnBhcnNlSW1wb3J0TmFtZXNwYWNlU3BlY2lmaWVyKCkpO1xuICAgIHJldHVybiBub2Rlc1xuICB9XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2VMKTtcbiAgd2hpbGUgKCF0aGlzLmVhdCh0eXBlcyQxLmJyYWNlUikpIHtcbiAgICBpZiAoIWZpcnN0KSB7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgIGlmICh0aGlzLmFmdGVyVHJhaWxpbmdDb21tYSh0eXBlcyQxLmJyYWNlUikpIHsgYnJlYWsgfVxuICAgIH0gZWxzZSB7IGZpcnN0ID0gZmFsc2U7IH1cblxuICAgIG5vZGVzLnB1c2godGhpcy5wYXJzZUltcG9ydFNwZWNpZmllcigpKTtcbiAgfVxuICByZXR1cm4gbm9kZXNcbn07XG5cbnBwJDgucGFyc2VXaXRoQ2xhdXNlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IFtdO1xuICBpZiAoIXRoaXMuZWF0KHR5cGVzJDEuX3dpdGgpKSB7XG4gICAgcmV0dXJuIG5vZGVzXG4gIH1cbiAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFjZUwpO1xuICB2YXIgYXR0cmlidXRlS2V5cyA9IHt9O1xuICB2YXIgZmlyc3QgPSB0cnVlO1xuICB3aGlsZSAoIXRoaXMuZWF0KHR5cGVzJDEuYnJhY2VSKSkge1xuICAgIGlmICghZmlyc3QpIHtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgaWYgKHRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKHR5cGVzJDEuYnJhY2VSKSkgeyBicmVhayB9XG4gICAgfSBlbHNlIHsgZmlyc3QgPSBmYWxzZTsgfVxuXG4gICAgdmFyIGF0dHIgPSB0aGlzLnBhcnNlSW1wb3J0QXR0cmlidXRlKCk7XG4gICAgdmFyIGtleU5hbWUgPSBhdHRyLmtleS50eXBlID09PSBcIklkZW50aWZpZXJcIiA/IGF0dHIua2V5Lm5hbWUgOiBhdHRyLmtleS52YWx1ZTtcbiAgICBpZiAoaGFzT3duKGF0dHJpYnV0ZUtleXMsIGtleU5hbWUpKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoYXR0ci5rZXkuc3RhcnQsIFwiRHVwbGljYXRlIGF0dHJpYnV0ZSBrZXkgJ1wiICsga2V5TmFtZSArIFwiJ1wiKTsgfVxuICAgIGF0dHJpYnV0ZUtleXNba2V5TmFtZV0gPSB0cnVlO1xuICAgIG5vZGVzLnB1c2goYXR0cik7XG4gIH1cbiAgcmV0dXJuIG5vZGVzXG59O1xuXG5wcCQ4LnBhcnNlSW1wb3J0QXR0cmlidXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgbm9kZS5rZXkgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RyaW5nID8gdGhpcy5wYXJzZUV4cHJBdG9tKCkgOiB0aGlzLnBhcnNlSWRlbnQodGhpcy5vcHRpb25zLmFsbG93UmVzZXJ2ZWQgIT09IFwibmV2ZXJcIik7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29sb24pO1xuICBpZiAodGhpcy50eXBlICE9PSB0eXBlcyQxLnN0cmluZykge1xuICAgIHRoaXMudW5leHBlY3RlZCgpO1xuICB9XG4gIG5vZGUudmFsdWUgPSB0aGlzLnBhcnNlRXhwckF0b20oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkltcG9ydEF0dHJpYnV0ZVwiKVxufTtcblxucHAkOC5wYXJzZU1vZHVsZUV4cG9ydE5hbWUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMyAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RyaW5nKSB7XG4gICAgdmFyIHN0cmluZ0xpdGVyYWwgPSB0aGlzLnBhcnNlTGl0ZXJhbCh0aGlzLnZhbHVlKTtcbiAgICBpZiAobG9uZVN1cnJvZ2F0ZS50ZXN0KHN0cmluZ0xpdGVyYWwudmFsdWUpKSB7XG4gICAgICB0aGlzLnJhaXNlKHN0cmluZ0xpdGVyYWwuc3RhcnQsIFwiQW4gZXhwb3J0IG5hbWUgY2Fubm90IGluY2x1ZGUgYSBsb25lIHN1cnJvZ2F0ZS5cIik7XG4gICAgfVxuICAgIHJldHVybiBzdHJpbmdMaXRlcmFsXG4gIH1cbiAgcmV0dXJuIHRoaXMucGFyc2VJZGVudCh0cnVlKVxufTtcblxuLy8gU2V0IGBFeHByZXNzaW9uU3RhdGVtZW50I2RpcmVjdGl2ZWAgcHJvcGVydHkgZm9yIGRpcmVjdGl2ZSBwcm9sb2d1ZXMuXG5wcCQ4LmFkYXB0RGlyZWN0aXZlUHJvbG9ndWUgPSBmdW5jdGlvbihzdGF0ZW1lbnRzKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGVtZW50cy5sZW5ndGggJiYgdGhpcy5pc0RpcmVjdGl2ZUNhbmRpZGF0ZShzdGF0ZW1lbnRzW2ldKTsgKytpKSB7XG4gICAgc3RhdGVtZW50c1tpXS5kaXJlY3RpdmUgPSBzdGF0ZW1lbnRzW2ldLmV4cHJlc3Npb24ucmF3LnNsaWNlKDEsIC0xKTtcbiAgfVxufTtcbnBwJDguaXNEaXJlY3RpdmVDYW5kaWRhdGUgPSBmdW5jdGlvbihzdGF0ZW1lbnQpIHtcbiAgcmV0dXJuIChcbiAgICB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNSAmJlxuICAgIHN0YXRlbWVudC50eXBlID09PSBcIkV4cHJlc3Npb25TdGF0ZW1lbnRcIiAmJlxuICAgIHN0YXRlbWVudC5leHByZXNzaW9uLnR5cGUgPT09IFwiTGl0ZXJhbFwiICYmXG4gICAgdHlwZW9mIHN0YXRlbWVudC5leHByZXNzaW9uLnZhbHVlID09PSBcInN0cmluZ1wiICYmXG4gICAgLy8gUmVqZWN0IHBhcmVudGhlc2l6ZWQgc3RyaW5ncy5cbiAgICAodGhpcy5pbnB1dFtzdGF0ZW1lbnQuc3RhcnRdID09PSBcIlxcXCJcIiB8fCB0aGlzLmlucHV0W3N0YXRlbWVudC5zdGFydF0gPT09IFwiJ1wiKVxuICApXG59O1xuXG52YXIgcHAkNyA9IFBhcnNlci5wcm90b3R5cGU7XG5cbi8vIENvbnZlcnQgZXhpc3RpbmcgZXhwcmVzc2lvbiBhdG9tIHRvIGFzc2lnbmFibGUgcGF0dGVyblxuLy8gaWYgcG9zc2libGUuXG5cbnBwJDcudG9Bc3NpZ25hYmxlID0gZnVuY3Rpb24obm9kZSwgaXNCaW5kaW5nLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiBub2RlKSB7XG4gICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICBjYXNlIFwiSWRlbnRpZmllclwiOlxuICAgICAgaWYgKHRoaXMuaW5Bc3luYyAmJiBub2RlLm5hbWUgPT09IFwiYXdhaXRcIilcbiAgICAgICAgeyB0aGlzLnJhaXNlKG5vZGUuc3RhcnQsIFwiQ2Fubm90IHVzZSAnYXdhaXQnIGFzIGlkZW50aWZpZXIgaW5zaWRlIGFuIGFzeW5jIGZ1bmN0aW9uXCIpOyB9XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIk9iamVjdFBhdHRlcm5cIjpcbiAgICBjYXNlIFwiQXJyYXlQYXR0ZXJuXCI6XG4gICAgY2FzZSBcIkFzc2lnbm1lbnRQYXR0ZXJuXCI6XG4gICAgY2FzZSBcIlJlc3RFbGVtZW50XCI6XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIk9iamVjdEV4cHJlc3Npb25cIjpcbiAgICAgIG5vZGUudHlwZSA9IFwiT2JqZWN0UGF0dGVyblwiO1xuICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHsgdGhpcy5jaGVja1BhdHRlcm5FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7IH1cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gbm9kZS5wcm9wZXJ0aWVzOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICB2YXIgcHJvcCA9IGxpc3RbaV07XG5cbiAgICAgIHRoaXMudG9Bc3NpZ25hYmxlKHByb3AsIGlzQmluZGluZyk7XG4gICAgICAgIC8vIEVhcmx5IGVycm9yOlxuICAgICAgICAvLyAgIEFzc2lnbm1lbnRSZXN0UHJvcGVydHlbWWllbGQsIEF3YWl0XSA6XG4gICAgICAgIC8vICAgICBgLi4uYCBEZXN0cnVjdHVyaW5nQXNzaWdubWVudFRhcmdldFtZaWVsZCwgQXdhaXRdXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgSXQgaXMgYSBTeW50YXggRXJyb3IgaWYgfERlc3RydWN0dXJpbmdBc3NpZ25tZW50VGFyZ2V0fCBpcyBhbiB8QXJyYXlMaXRlcmFsfCBvciBhbiB8T2JqZWN0TGl0ZXJhbHwuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBwcm9wLnR5cGUgPT09IFwiUmVzdEVsZW1lbnRcIiAmJlxuICAgICAgICAgIChwcm9wLmFyZ3VtZW50LnR5cGUgPT09IFwiQXJyYXlQYXR0ZXJuXCIgfHwgcHJvcC5hcmd1bWVudC50eXBlID09PSBcIk9iamVjdFBhdHRlcm5cIilcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5yYWlzZShwcm9wLmFyZ3VtZW50LnN0YXJ0LCBcIlVuZXhwZWN0ZWQgdG9rZW5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiUHJvcGVydHlcIjpcbiAgICAgIC8vIEFzc2lnbm1lbnRQcm9wZXJ0eSBoYXMgdHlwZSA9PT0gXCJQcm9wZXJ0eVwiXG4gICAgICBpZiAobm9kZS5raW5kICE9PSBcImluaXRcIikgeyB0aGlzLnJhaXNlKG5vZGUua2V5LnN0YXJ0LCBcIk9iamVjdCBwYXR0ZXJuIGNhbid0IGNvbnRhaW4gZ2V0dGVyIG9yIHNldHRlclwiKTsgfVxuICAgICAgdGhpcy50b0Fzc2lnbmFibGUobm9kZS52YWx1ZSwgaXNCaW5kaW5nKTtcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiQXJyYXlFeHByZXNzaW9uXCI6XG4gICAgICBub2RlLnR5cGUgPSBcIkFycmF5UGF0dGVyblwiO1xuICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHsgdGhpcy5jaGVja1BhdHRlcm5FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7IH1cbiAgICAgIHRoaXMudG9Bc3NpZ25hYmxlTGlzdChub2RlLmVsZW1lbnRzLCBpc0JpbmRpbmcpO1xuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJTcHJlYWRFbGVtZW50XCI6XG4gICAgICBub2RlLnR5cGUgPSBcIlJlc3RFbGVtZW50XCI7XG4gICAgICB0aGlzLnRvQXNzaWduYWJsZShub2RlLmFyZ3VtZW50LCBpc0JpbmRpbmcpO1xuICAgICAgaWYgKG5vZGUuYXJndW1lbnQudHlwZSA9PT0gXCJBc3NpZ25tZW50UGF0dGVyblwiKVxuICAgICAgICB7IHRoaXMucmFpc2Uobm9kZS5hcmd1bWVudC5zdGFydCwgXCJSZXN0IGVsZW1lbnRzIGNhbm5vdCBoYXZlIGEgZGVmYXVsdCB2YWx1ZVwiKTsgfVxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJBc3NpZ25tZW50RXhwcmVzc2lvblwiOlxuICAgICAgaWYgKG5vZGUub3BlcmF0b3IgIT09IFwiPVwiKSB7IHRoaXMucmFpc2Uobm9kZS5sZWZ0LmVuZCwgXCJPbmx5ICc9JyBvcGVyYXRvciBjYW4gYmUgdXNlZCBmb3Igc3BlY2lmeWluZyBkZWZhdWx0IHZhbHVlLlwiKTsgfVxuICAgICAgbm9kZS50eXBlID0gXCJBc3NpZ25tZW50UGF0dGVyblwiO1xuICAgICAgZGVsZXRlIG5vZGUub3BlcmF0b3I7XG4gICAgICB0aGlzLnRvQXNzaWduYWJsZShub2RlLmxlZnQsIGlzQmluZGluZyk7XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uXCI6XG4gICAgICB0aGlzLnRvQXNzaWduYWJsZShub2RlLmV4cHJlc3Npb24sIGlzQmluZGluZywgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIkNoYWluRXhwcmVzc2lvblwiOlxuICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiT3B0aW9uYWwgY2hhaW5pbmcgY2Fubm90IGFwcGVhciBpbiBsZWZ0LWhhbmQgc2lkZVwiKTtcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiTWVtYmVyRXhwcmVzc2lvblwiOlxuICAgICAgaWYgKCFpc0JpbmRpbmcpIHsgYnJlYWsgfVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMucmFpc2Uobm9kZS5zdGFydCwgXCJBc3NpZ25pbmcgdG8gcnZhbHVlXCIpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7IHRoaXMuY2hlY2tQYXR0ZXJuRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpOyB9XG4gIHJldHVybiBub2RlXG59O1xuXG4vLyBDb252ZXJ0IGxpc3Qgb2YgZXhwcmVzc2lvbiBhdG9tcyB0byBiaW5kaW5nIGxpc3QuXG5cbnBwJDcudG9Bc3NpZ25hYmxlTGlzdCA9IGZ1bmN0aW9uKGV4cHJMaXN0LCBpc0JpbmRpbmcpIHtcbiAgdmFyIGVuZCA9IGV4cHJMaXN0Lmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbmQ7IGkrKykge1xuICAgIHZhciBlbHQgPSBleHByTGlzdFtpXTtcbiAgICBpZiAoZWx0KSB7IHRoaXMudG9Bc3NpZ25hYmxlKGVsdCwgaXNCaW5kaW5nKTsgfVxuICB9XG4gIGlmIChlbmQpIHtcbiAgICB2YXIgbGFzdCA9IGV4cHJMaXN0W2VuZCAtIDFdO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPT09IDYgJiYgaXNCaW5kaW5nICYmIGxhc3QgJiYgbGFzdC50eXBlID09PSBcIlJlc3RFbGVtZW50XCIgJiYgbGFzdC5hcmd1bWVudC50eXBlICE9PSBcIklkZW50aWZpZXJcIilcbiAgICAgIHsgdGhpcy51bmV4cGVjdGVkKGxhc3QuYXJndW1lbnQuc3RhcnQpOyB9XG4gIH1cbiAgcmV0dXJuIGV4cHJMaXN0XG59O1xuXG4vLyBQYXJzZXMgc3ByZWFkIGVsZW1lbnQuXG5cbnBwJDcucGFyc2VTcHJlYWQgPSBmdW5jdGlvbihyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0KCk7XG4gIG5vZGUuYXJndW1lbnQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiU3ByZWFkRWxlbWVudFwiKVxufTtcblxucHAkNy5wYXJzZVJlc3RCaW5kaW5nID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0KCk7XG5cbiAgLy8gUmVzdEVsZW1lbnQgaW5zaWRlIG9mIGEgZnVuY3Rpb24gcGFyYW1ldGVyIG11c3QgYmUgYW4gaWRlbnRpZmllclxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID09PSA2ICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5uYW1lKVxuICAgIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cblxuICBub2RlLmFyZ3VtZW50ID0gdGhpcy5wYXJzZUJpbmRpbmdBdG9tKCk7XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlJlc3RFbGVtZW50XCIpXG59O1xuXG4vLyBQYXJzZXMgbHZhbHVlIChhc3NpZ25hYmxlKSBhdG9tLlxuXG5wcCQ3LnBhcnNlQmluZGluZ0F0b20gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7XG4gICAgc3dpdGNoICh0aGlzLnR5cGUpIHtcbiAgICBjYXNlIHR5cGVzJDEuYnJhY2tldEw6XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICAgIG5vZGUuZWxlbWVudHMgPSB0aGlzLnBhcnNlQmluZGluZ0xpc3QodHlwZXMkMS5icmFja2V0UiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQXJyYXlQYXR0ZXJuXCIpXG5cbiAgICBjYXNlIHR5cGVzJDEuYnJhY2VMOlxuICAgICAgcmV0dXJuIHRoaXMucGFyc2VPYmoodHJ1ZSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXMucGFyc2VJZGVudCgpXG59O1xuXG5wcCQ3LnBhcnNlQmluZGluZ0xpc3QgPSBmdW5jdGlvbihjbG9zZSwgYWxsb3dFbXB0eSwgYWxsb3dUcmFpbGluZ0NvbW1hLCBhbGxvd01vZGlmaWVycykge1xuICB2YXIgZWx0cyA9IFtdLCBmaXJzdCA9IHRydWU7XG4gIHdoaWxlICghdGhpcy5lYXQoY2xvc2UpKSB7XG4gICAgaWYgKGZpcnN0KSB7IGZpcnN0ID0gZmFsc2U7IH1cbiAgICBlbHNlIHsgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7IH1cbiAgICBpZiAoYWxsb3dFbXB0eSAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEpIHtcbiAgICAgIGVsdHMucHVzaChudWxsKTtcbiAgICB9IGVsc2UgaWYgKGFsbG93VHJhaWxpbmdDb21tYSAmJiB0aGlzLmFmdGVyVHJhaWxpbmdDb21tYShjbG9zZSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfSBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZWxsaXBzaXMpIHtcbiAgICAgIHZhciByZXN0ID0gdGhpcy5wYXJzZVJlc3RCaW5kaW5nKCk7XG4gICAgICB0aGlzLnBhcnNlQmluZGluZ0xpc3RJdGVtKHJlc3QpO1xuICAgICAgZWx0cy5wdXNoKHJlc3QpO1xuICAgICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgXCJDb21tYSBpcyBub3QgcGVybWl0dGVkIGFmdGVyIHRoZSByZXN0IGVsZW1lbnRcIik7IH1cbiAgICAgIHRoaXMuZXhwZWN0KGNsb3NlKTtcbiAgICAgIGJyZWFrXG4gICAgfSBlbHNlIHtcbiAgICAgIGVsdHMucHVzaCh0aGlzLnBhcnNlQXNzaWduYWJsZUxpc3RJdGVtKGFsbG93TW9kaWZpZXJzKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBlbHRzXG59O1xuXG5wcCQ3LnBhcnNlQXNzaWduYWJsZUxpc3RJdGVtID0gZnVuY3Rpb24oYWxsb3dNb2RpZmllcnMpIHtcbiAgdmFyIGVsZW0gPSB0aGlzLnBhcnNlTWF5YmVEZWZhdWx0KHRoaXMuc3RhcnQsIHRoaXMuc3RhcnRMb2MpO1xuICB0aGlzLnBhcnNlQmluZGluZ0xpc3RJdGVtKGVsZW0pO1xuICByZXR1cm4gZWxlbVxufTtcblxucHAkNy5wYXJzZUJpbmRpbmdMaXN0SXRlbSA9IGZ1bmN0aW9uKHBhcmFtKSB7XG4gIHJldHVybiBwYXJhbVxufTtcblxuLy8gUGFyc2VzIGFzc2lnbm1lbnQgcGF0dGVybiBhcm91bmQgZ2l2ZW4gYXRvbSBpZiBwb3NzaWJsZS5cblxucHAkNy5wYXJzZU1heWJlRGVmYXVsdCA9IGZ1bmN0aW9uKHN0YXJ0UG9zLCBzdGFydExvYywgbGVmdCkge1xuICBsZWZ0ID0gbGVmdCB8fCB0aGlzLnBhcnNlQmluZGluZ0F0b20oKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDYgfHwgIXRoaXMuZWF0KHR5cGVzJDEuZXEpKSB7IHJldHVybiBsZWZ0IH1cbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gIG5vZGUubGVmdCA9IGxlZnQ7XG4gIG5vZGUucmlnaHQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkFzc2lnbm1lbnRQYXR0ZXJuXCIpXG59O1xuXG4vLyBUaGUgZm9sbG93aW5nIHRocmVlIGZ1bmN0aW9ucyBhbGwgdmVyaWZ5IHRoYXQgYSBub2RlIGlzIGFuIGx2YWx1ZSBcdTIwMTRcbi8vIHNvbWV0aGluZyB0aGF0IGNhbiBiZSBib3VuZCwgb3IgYXNzaWduZWQgdG8uIEluIG9yZGVyIHRvIGRvIHNvLCB0aGV5IHBlcmZvcm1cbi8vIGEgdmFyaWV0eSBvZiBjaGVja3M6XG4vL1xuLy8gLSBDaGVjayB0aGF0IG5vbmUgb2YgdGhlIGJvdW5kL2Fzc2lnbmVkLXRvIGlkZW50aWZpZXJzIGFyZSByZXNlcnZlZCB3b3Jkcy5cbi8vIC0gUmVjb3JkIG5hbWUgZGVjbGFyYXRpb25zIGZvciBiaW5kaW5ncyBpbiB0aGUgYXBwcm9wcmlhdGUgc2NvcGUuXG4vLyAtIENoZWNrIGR1cGxpY2F0ZSBhcmd1bWVudCBuYW1lcywgaWYgY2hlY2tDbGFzaGVzIGlzIHNldC5cbi8vXG4vLyBJZiBhIGNvbXBsZXggYmluZGluZyBwYXR0ZXJuIGlzIGVuY291bnRlcmVkIChlLmcuLCBvYmplY3QgYW5kIGFycmF5XG4vLyBkZXN0cnVjdHVyaW5nKSwgdGhlIGVudGlyZSBwYXR0ZXJuIGlzIHJlY3Vyc2l2ZWx5IGNoZWNrZWQuXG4vL1xuLy8gVGhlcmUgYXJlIHRocmVlIHZlcnNpb25zIG9mIGNoZWNrTFZhbCooKSBhcHByb3ByaWF0ZSBmb3IgZGlmZmVyZW50XG4vLyBjaXJjdW1zdGFuY2VzOlxuLy9cbi8vIC0gY2hlY2tMVmFsU2ltcGxlKCkgc2hhbGwgYmUgdXNlZCBpZiB0aGUgc3ludGFjdGljIGNvbnN0cnVjdCBzdXBwb3J0c1xuLy8gICBub3RoaW5nIG90aGVyIHRoYW4gaWRlbnRpZmllcnMgYW5kIG1lbWJlciBleHByZXNzaW9ucy4gUGFyZW50aGVzaXplZFxuLy8gICBleHByZXNzaW9ucyBhcmUgYWxzbyBjb3JyZWN0bHkgaGFuZGxlZC4gVGhpcyBpcyBnZW5lcmFsbHkgYXBwcm9wcmlhdGUgZm9yXG4vLyAgIGNvbnN0cnVjdHMgZm9yIHdoaWNoIHRoZSBzcGVjIHNheXNcbi8vXG4vLyAgID4gSXQgaXMgYSBTeW50YXggRXJyb3IgaWYgQXNzaWdubWVudFRhcmdldFR5cGUgb2YgW3RoZSBwcm9kdWN0aW9uXSBpcyBub3Rcbi8vICAgPiBzaW1wbGUuXG4vL1xuLy8gICBJdCBpcyBhbHNvIGFwcHJvcHJpYXRlIGZvciBjaGVja2luZyBpZiBhbiBpZGVudGlmaWVyIGlzIHZhbGlkIGFuZCBub3Rcbi8vICAgZGVmaW5lZCBlbHNld2hlcmUsIGxpa2UgaW1wb3J0IGRlY2xhcmF0aW9ucyBvciBmdW5jdGlvbi9jbGFzcyBpZGVudGlmaWVycy5cbi8vXG4vLyAgIEV4YW1wbGVzIHdoZXJlIHRoaXMgaXMgdXNlZCBpbmNsdWRlOlxuLy8gICAgIGEgKz0gXHUyMDI2O1xuLy8gICAgIGltcG9ydCBhIGZyb20gJ1x1MjAyNic7XG4vLyAgIHdoZXJlIGEgaXMgdGhlIG5vZGUgdG8gYmUgY2hlY2tlZC5cbi8vXG4vLyAtIGNoZWNrTFZhbFBhdHRlcm4oKSBzaGFsbCBiZSB1c2VkIGlmIHRoZSBzeW50YWN0aWMgY29uc3RydWN0IHN1cHBvcnRzXG4vLyAgIGFueXRoaW5nIGNoZWNrTFZhbFNpbXBsZSgpIHN1cHBvcnRzLCBhcyB3ZWxsIGFzIG9iamVjdCBhbmQgYXJyYXlcbi8vICAgZGVzdHJ1Y3R1cmluZyBwYXR0ZXJucy4gVGhpcyBpcyBnZW5lcmFsbHkgYXBwcm9wcmlhdGUgZm9yIGNvbnN0cnVjdHMgZm9yXG4vLyAgIHdoaWNoIHRoZSBzcGVjIHNheXNcbi8vXG4vLyAgID4gSXQgaXMgYSBTeW50YXggRXJyb3IgaWYgW3RoZSBwcm9kdWN0aW9uXSBpcyBuZWl0aGVyIGFuIE9iamVjdExpdGVyYWwgbm9yXG4vLyAgID4gYW4gQXJyYXlMaXRlcmFsIGFuZCBBc3NpZ25tZW50VGFyZ2V0VHlwZSBvZiBbdGhlIHByb2R1Y3Rpb25dIGlzIG5vdFxuLy8gICA+IHNpbXBsZS5cbi8vXG4vLyAgIEV4YW1wbGVzIHdoZXJlIHRoaXMgaXMgdXNlZCBpbmNsdWRlOlxuLy8gICAgIChhID0gXHUyMDI2KTtcbi8vICAgICBjb25zdCBhID0gXHUyMDI2O1xuLy8gICAgIHRyeSB7IFx1MjAyNiB9IGNhdGNoIChhKSB7IFx1MjAyNiB9XG4vLyAgIHdoZXJlIGEgaXMgdGhlIG5vZGUgdG8gYmUgY2hlY2tlZC5cbi8vXG4vLyAtIGNoZWNrTFZhbElubmVyUGF0dGVybigpIHNoYWxsIGJlIHVzZWQgaWYgdGhlIHN5bnRhY3RpYyBjb25zdHJ1Y3Qgc3VwcG9ydHNcbi8vICAgYW55dGhpbmcgY2hlY2tMVmFsUGF0dGVybigpIHN1cHBvcnRzLCBhcyB3ZWxsIGFzIGRlZmF1bHQgYXNzaWdubWVudFxuLy8gICBwYXR0ZXJucywgcmVzdCBlbGVtZW50cywgYW5kIG90aGVyIGNvbnN0cnVjdHMgdGhhdCBtYXkgYXBwZWFyIHdpdGhpbiBhblxuLy8gICBvYmplY3Qgb3IgYXJyYXkgZGVzdHJ1Y3R1cmluZyBwYXR0ZXJuLlxuLy9cbi8vICAgQXMgYSBzcGVjaWFsIGNhc2UsIGZ1bmN0aW9uIHBhcmFtZXRlcnMgYWxzbyB1c2UgY2hlY2tMVmFsSW5uZXJQYXR0ZXJuKCksXG4vLyAgIGFzIHRoZXkgYWxzbyBzdXBwb3J0IGRlZmF1bHRzIGFuZCByZXN0IGNvbnN0cnVjdHMuXG4vL1xuLy8gVGhlc2UgZnVuY3Rpb25zIGRlbGliZXJhdGVseSBzdXBwb3J0IGJvdGggYXNzaWdubWVudCBhbmQgYmluZGluZyBjb25zdHJ1Y3RzLFxuLy8gYXMgdGhlIGxvZ2ljIGZvciBib3RoIGlzIGV4Y2VlZGluZ2x5IHNpbWlsYXIuIElmIHRoZSBub2RlIGlzIHRoZSB0YXJnZXQgb2Zcbi8vIGFuIGFzc2lnbm1lbnQsIHRoZW4gYmluZGluZ1R5cGUgc2hvdWxkIGJlIHNldCB0byBCSU5EX05PTkUuIE90aGVyd2lzZSwgaXRcbi8vIHNob3VsZCBiZSBzZXQgdG8gdGhlIGFwcHJvcHJpYXRlIEJJTkRfKiBjb25zdGFudCwgbGlrZSBCSU5EX1ZBUiBvclxuLy8gQklORF9MRVhJQ0FMLlxuLy9cbi8vIElmIHRoZSBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCBhIG5vbi1CSU5EX05PTkUgYmluZGluZ1R5cGUsIHRoZW5cbi8vIGFkZGl0aW9uYWxseSBhIGNoZWNrQ2xhc2hlcyBvYmplY3QgbWF5IGJlIHNwZWNpZmllZCB0byBhbGxvdyBjaGVja2luZyBmb3Jcbi8vIGR1cGxpY2F0ZSBhcmd1bWVudCBuYW1lcy4gY2hlY2tDbGFzaGVzIGlzIGlnbm9yZWQgaWYgdGhlIHByb3ZpZGVkIGNvbnN0cnVjdFxuLy8gaXMgYW4gYXNzaWdubWVudCAoaS5lLiwgYmluZGluZ1R5cGUgaXMgQklORF9OT05FKS5cblxucHAkNy5jaGVja0xWYWxTaW1wbGUgPSBmdW5jdGlvbihleHByLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKSB7XG4gIGlmICggYmluZGluZ1R5cGUgPT09IHZvaWQgMCApIGJpbmRpbmdUeXBlID0gQklORF9OT05FO1xuXG4gIHZhciBpc0JpbmQgPSBiaW5kaW5nVHlwZSAhPT0gQklORF9OT05FO1xuXG4gIHN3aXRjaCAoZXhwci50eXBlKSB7XG4gIGNhc2UgXCJJZGVudGlmaWVyXCI6XG4gICAgaWYgKHRoaXMuc3RyaWN0ICYmIHRoaXMucmVzZXJ2ZWRXb3Jkc1N0cmljdEJpbmQudGVzdChleHByLm5hbWUpKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZXhwci5zdGFydCwgKGlzQmluZCA/IFwiQmluZGluZyBcIiA6IFwiQXNzaWduaW5nIHRvIFwiKSArIGV4cHIubmFtZSArIFwiIGluIHN0cmljdCBtb2RlXCIpOyB9XG4gICAgaWYgKGlzQmluZCkge1xuICAgICAgaWYgKGJpbmRpbmdUeXBlID09PSBCSU5EX0xFWElDQUwgJiYgZXhwci5uYW1lID09PSBcImxldFwiKVxuICAgICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShleHByLnN0YXJ0LCBcImxldCBpcyBkaXNhbGxvd2VkIGFzIGEgbGV4aWNhbGx5IGJvdW5kIG5hbWVcIik7IH1cbiAgICAgIGlmIChjaGVja0NsYXNoZXMpIHtcbiAgICAgICAgaWYgKGhhc093bihjaGVja0NsYXNoZXMsIGV4cHIubmFtZSkpXG4gICAgICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZXhwci5zdGFydCwgXCJBcmd1bWVudCBuYW1lIGNsYXNoXCIpOyB9XG4gICAgICAgIGNoZWNrQ2xhc2hlc1tleHByLm5hbWVdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChiaW5kaW5nVHlwZSAhPT0gQklORF9PVVRTSURFKSB7IHRoaXMuZGVjbGFyZU5hbWUoZXhwci5uYW1lLCBiaW5kaW5nVHlwZSwgZXhwci5zdGFydCk7IH1cbiAgICB9XG4gICAgYnJlYWtcblxuICBjYXNlIFwiQ2hhaW5FeHByZXNzaW9uXCI6XG4gICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGV4cHIuc3RhcnQsIFwiT3B0aW9uYWwgY2hhaW5pbmcgY2Fubm90IGFwcGVhciBpbiBsZWZ0LWhhbmQgc2lkZVwiKTtcbiAgICBicmVha1xuXG4gIGNhc2UgXCJNZW1iZXJFeHByZXNzaW9uXCI6XG4gICAgaWYgKGlzQmluZCkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZXhwci5zdGFydCwgXCJCaW5kaW5nIG1lbWJlciBleHByZXNzaW9uXCIpOyB9XG4gICAgYnJlYWtcblxuICBjYXNlIFwiUGFyZW50aGVzaXplZEV4cHJlc3Npb25cIjpcbiAgICBpZiAoaXNCaW5kKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShleHByLnN0YXJ0LCBcIkJpbmRpbmcgcGFyZW50aGVzaXplZCBleHByZXNzaW9uXCIpOyB9XG4gICAgcmV0dXJuIHRoaXMuY2hlY2tMVmFsU2ltcGxlKGV4cHIuZXhwcmVzc2lvbiwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcylcblxuICBkZWZhdWx0OlxuICAgIHRoaXMucmFpc2UoZXhwci5zdGFydCwgKGlzQmluZCA/IFwiQmluZGluZ1wiIDogXCJBc3NpZ25pbmcgdG9cIikgKyBcIiBydmFsdWVcIik7XG4gIH1cbn07XG5cbnBwJDcuY2hlY2tMVmFsUGF0dGVybiA9IGZ1bmN0aW9uKGV4cHIsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpIHtcbiAgaWYgKCBiaW5kaW5nVHlwZSA9PT0gdm9pZCAwICkgYmluZGluZ1R5cGUgPSBCSU5EX05PTkU7XG5cbiAgc3dpdGNoIChleHByLnR5cGUpIHtcbiAgY2FzZSBcIk9iamVjdFBhdHRlcm5cIjpcbiAgICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IGV4cHIucHJvcGVydGllczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBwcm9wID0gbGlzdFtpXTtcblxuICAgIHRoaXMuY2hlY2tMVmFsSW5uZXJQYXR0ZXJuKHByb3AsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpO1xuICAgIH1cbiAgICBicmVha1xuXG4gIGNhc2UgXCJBcnJheVBhdHRlcm5cIjpcbiAgICBmb3IgKHZhciBpJDEgPSAwLCBsaXN0JDEgPSBleHByLmVsZW1lbnRzOyBpJDEgPCBsaXN0JDEubGVuZ3RoOyBpJDEgKz0gMSkge1xuICAgICAgdmFyIGVsZW0gPSBsaXN0JDFbaSQxXTtcblxuICAgIGlmIChlbGVtKSB7IHRoaXMuY2hlY2tMVmFsSW5uZXJQYXR0ZXJuKGVsZW0sIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpOyB9XG4gICAgfVxuICAgIGJyZWFrXG5cbiAgZGVmYXVsdDpcbiAgICB0aGlzLmNoZWNrTFZhbFNpbXBsZShleHByLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKTtcbiAgfVxufTtcblxucHAkNy5jaGVja0xWYWxJbm5lclBhdHRlcm4gPSBmdW5jdGlvbihleHByLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKSB7XG4gIGlmICggYmluZGluZ1R5cGUgPT09IHZvaWQgMCApIGJpbmRpbmdUeXBlID0gQklORF9OT05FO1xuXG4gIHN3aXRjaCAoZXhwci50eXBlKSB7XG4gIGNhc2UgXCJQcm9wZXJ0eVwiOlxuICAgIC8vIEFzc2lnbm1lbnRQcm9wZXJ0eSBoYXMgdHlwZSA9PT0gXCJQcm9wZXJ0eVwiXG4gICAgdGhpcy5jaGVja0xWYWxJbm5lclBhdHRlcm4oZXhwci52YWx1ZSwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcyk7XG4gICAgYnJlYWtcblxuICBjYXNlIFwiQXNzaWdubWVudFBhdHRlcm5cIjpcbiAgICB0aGlzLmNoZWNrTFZhbFBhdHRlcm4oZXhwci5sZWZ0LCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKTtcbiAgICBicmVha1xuXG4gIGNhc2UgXCJSZXN0RWxlbWVudFwiOlxuICAgIHRoaXMuY2hlY2tMVmFsUGF0dGVybihleHByLmFyZ3VtZW50LCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKTtcbiAgICBicmVha1xuXG4gIGRlZmF1bHQ6XG4gICAgdGhpcy5jaGVja0xWYWxQYXR0ZXJuKGV4cHIsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpO1xuICB9XG59O1xuXG4vLyBUaGUgYWxnb3JpdGhtIHVzZWQgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSByZWdleHAgY2FuIGFwcGVhciBhdCBhXG4vLyBnaXZlbiBwb2ludCBpbiB0aGUgcHJvZ3JhbSBpcyBsb29zZWx5IGJhc2VkIG9uIHN3ZWV0LmpzJyBhcHByb2FjaC5cbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9zd2VldC5qcy93aWtpL2Rlc2lnblxuXG5cbnZhciBUb2tDb250ZXh0ID0gZnVuY3Rpb24gVG9rQ29udGV4dCh0b2tlbiwgaXNFeHByLCBwcmVzZXJ2ZVNwYWNlLCBvdmVycmlkZSwgZ2VuZXJhdG9yKSB7XG4gIHRoaXMudG9rZW4gPSB0b2tlbjtcbiAgdGhpcy5pc0V4cHIgPSAhIWlzRXhwcjtcbiAgdGhpcy5wcmVzZXJ2ZVNwYWNlID0gISFwcmVzZXJ2ZVNwYWNlO1xuICB0aGlzLm92ZXJyaWRlID0gb3ZlcnJpZGU7XG4gIHRoaXMuZ2VuZXJhdG9yID0gISFnZW5lcmF0b3I7XG59O1xuXG52YXIgdHlwZXMgPSB7XG4gIGJfc3RhdDogbmV3IFRva0NvbnRleHQoXCJ7XCIsIGZhbHNlKSxcbiAgYl9leHByOiBuZXcgVG9rQ29udGV4dChcIntcIiwgdHJ1ZSksXG4gIGJfdG1wbDogbmV3IFRva0NvbnRleHQoXCIke1wiLCBmYWxzZSksXG4gIHBfc3RhdDogbmV3IFRva0NvbnRleHQoXCIoXCIsIGZhbHNlKSxcbiAgcF9leHByOiBuZXcgVG9rQ29udGV4dChcIihcIiwgdHJ1ZSksXG4gIHFfdG1wbDogbmV3IFRva0NvbnRleHQoXCJgXCIsIHRydWUsIHRydWUsIGZ1bmN0aW9uIChwKSB7IHJldHVybiBwLnRyeVJlYWRUZW1wbGF0ZVRva2VuKCk7IH0pLFxuICBmX3N0YXQ6IG5ldyBUb2tDb250ZXh0KFwiZnVuY3Rpb25cIiwgZmFsc2UpLFxuICBmX2V4cHI6IG5ldyBUb2tDb250ZXh0KFwiZnVuY3Rpb25cIiwgdHJ1ZSksXG4gIGZfZXhwcl9nZW46IG5ldyBUb2tDb250ZXh0KFwiZnVuY3Rpb25cIiwgdHJ1ZSwgZmFsc2UsIG51bGwsIHRydWUpLFxuICBmX2dlbjogbmV3IFRva0NvbnRleHQoXCJmdW5jdGlvblwiLCBmYWxzZSwgZmFsc2UsIG51bGwsIHRydWUpXG59O1xuXG52YXIgcHAkNiA9IFBhcnNlci5wcm90b3R5cGU7XG5cbnBwJDYuaW5pdGlhbENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFt0eXBlcy5iX3N0YXRdXG59O1xuXG5wcCQ2LmN1ckNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV1cbn07XG5cbnBwJDYuYnJhY2VJc0Jsb2NrID0gZnVuY3Rpb24ocHJldlR5cGUpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMuY3VyQ29udGV4dCgpO1xuICBpZiAocGFyZW50ID09PSB0eXBlcy5mX2V4cHIgfHwgcGFyZW50ID09PSB0eXBlcy5mX3N0YXQpXG4gICAgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmIChwcmV2VHlwZSA9PT0gdHlwZXMkMS5jb2xvbiAmJiAocGFyZW50ID09PSB0eXBlcy5iX3N0YXQgfHwgcGFyZW50ID09PSB0eXBlcy5iX2V4cHIpKVxuICAgIHsgcmV0dXJuICFwYXJlbnQuaXNFeHByIH1cblxuICAvLyBUaGUgY2hlY2sgZm9yIGB0dC5uYW1lICYmIGV4cHJBbGxvd2VkYCBkZXRlY3RzIHdoZXRoZXIgd2UgYXJlXG4gIC8vIGFmdGVyIGEgYHlpZWxkYCBvciBgb2ZgIGNvbnN0cnVjdC4gU2VlIHRoZSBgdXBkYXRlQ29udGV4dGAgZm9yXG4gIC8vIGB0dC5uYW1lYC5cbiAgaWYgKHByZXZUeXBlID09PSB0eXBlcyQxLl9yZXR1cm4gfHwgcHJldlR5cGUgPT09IHR5cGVzJDEubmFtZSAmJiB0aGlzLmV4cHJBbGxvd2VkKVxuICAgIHsgcmV0dXJuIGxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5sYXN0VG9rRW5kLCB0aGlzLnN0YXJ0KSkgfVxuICBpZiAocHJldlR5cGUgPT09IHR5cGVzJDEuX2Vsc2UgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuc2VtaSB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5lb2YgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEucGFyZW5SIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLmFycm93KVxuICAgIHsgcmV0dXJuIHRydWUgfVxuICBpZiAocHJldlR5cGUgPT09IHR5cGVzJDEuYnJhY2VMKVxuICAgIHsgcmV0dXJuIHBhcmVudCA9PT0gdHlwZXMuYl9zdGF0IH1cbiAgaWYgKHByZXZUeXBlID09PSB0eXBlcyQxLl92YXIgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuX2NvbnN0IHx8IHByZXZUeXBlID09PSB0eXBlcyQxLm5hbWUpXG4gICAgeyByZXR1cm4gZmFsc2UgfVxuICByZXR1cm4gIXRoaXMuZXhwckFsbG93ZWRcbn07XG5cbnBwJDYuaW5HZW5lcmF0b3JDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIGZvciAodmFyIGkgPSB0aGlzLmNvbnRleHQubGVuZ3RoIC0gMTsgaSA+PSAxOyBpLS0pIHtcbiAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dFtpXTtcbiAgICBpZiAoY29udGV4dC50b2tlbiA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgeyByZXR1cm4gY29udGV4dC5nZW5lcmF0b3IgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxucHAkNi51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24ocHJldlR5cGUpIHtcbiAgdmFyIHVwZGF0ZSwgdHlwZSA9IHRoaXMudHlwZTtcbiAgaWYgKHR5cGUua2V5d29yZCAmJiBwcmV2VHlwZSA9PT0gdHlwZXMkMS5kb3QpXG4gICAgeyB0aGlzLmV4cHJBbGxvd2VkID0gZmFsc2U7IH1cbiAgZWxzZSBpZiAodXBkYXRlID0gdHlwZS51cGRhdGVDb250ZXh0KVxuICAgIHsgdXBkYXRlLmNhbGwodGhpcywgcHJldlR5cGUpOyB9XG4gIGVsc2VcbiAgICB7IHRoaXMuZXhwckFsbG93ZWQgPSB0eXBlLmJlZm9yZUV4cHI7IH1cbn07XG5cbi8vIFVzZWQgdG8gaGFuZGxlIGVkZ2UgY2FzZXMgd2hlbiB0b2tlbiBjb250ZXh0IGNvdWxkIG5vdCBiZSBpbmZlcnJlZCBjb3JyZWN0bHkgZHVyaW5nIHRva2VuaXphdGlvbiBwaGFzZVxuXG5wcCQ2Lm92ZXJyaWRlQ29udGV4dCA9IGZ1bmN0aW9uKHRva2VuQ3R4KSB7XG4gIGlmICh0aGlzLmN1ckNvbnRleHQoKSAhPT0gdG9rZW5DdHgpIHtcbiAgICB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdID0gdG9rZW5DdHg7XG4gIH1cbn07XG5cbi8vIFRva2VuLXNwZWNpZmljIGNvbnRleHQgdXBkYXRlIGNvZGVcblxudHlwZXMkMS5wYXJlblIudXBkYXRlQ29udGV4dCA9IHR5cGVzJDEuYnJhY2VSLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY29udGV4dC5sZW5ndGggPT09IDEpIHtcbiAgICB0aGlzLmV4cHJBbGxvd2VkID0gdHJ1ZTtcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgb3V0ID0gdGhpcy5jb250ZXh0LnBvcCgpO1xuICBpZiAob3V0ID09PSB0eXBlcy5iX3N0YXQgJiYgdGhpcy5jdXJDb250ZXh0KCkudG9rZW4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgIG91dCA9IHRoaXMuY29udGV4dC5wb3AoKTtcbiAgfVxuICB0aGlzLmV4cHJBbGxvd2VkID0gIW91dC5pc0V4cHI7XG59O1xuXG50eXBlcyQxLmJyYWNlTC51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24ocHJldlR5cGUpIHtcbiAgdGhpcy5jb250ZXh0LnB1c2godGhpcy5icmFjZUlzQmxvY2socHJldlR5cGUpID8gdHlwZXMuYl9zdGF0IDogdHlwZXMuYl9leHByKTtcbiAgdGhpcy5leHByQWxsb3dlZCA9IHRydWU7XG59O1xuXG50eXBlcyQxLmRvbGxhckJyYWNlTC51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY29udGV4dC5wdXNoKHR5cGVzLmJfdG1wbCk7XG4gIHRoaXMuZXhwckFsbG93ZWQgPSB0cnVlO1xufTtcblxudHlwZXMkMS5wYXJlbkwudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKHByZXZUeXBlKSB7XG4gIHZhciBzdGF0ZW1lbnRQYXJlbnMgPSBwcmV2VHlwZSA9PT0gdHlwZXMkMS5faWYgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuX2ZvciB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5fd2l0aCB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5fd2hpbGU7XG4gIHRoaXMuY29udGV4dC5wdXNoKHN0YXRlbWVudFBhcmVucyA/IHR5cGVzLnBfc3RhdCA6IHR5cGVzLnBfZXhwcik7XG4gIHRoaXMuZXhwckFsbG93ZWQgPSB0cnVlO1xufTtcblxudHlwZXMkMS5pbmNEZWMudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAvLyB0b2tFeHByQWxsb3dlZCBzdGF5cyB1bmNoYW5nZWRcbn07XG5cbnR5cGVzJDEuX2Z1bmN0aW9uLnVwZGF0ZUNvbnRleHQgPSB0eXBlcyQxLl9jbGFzcy51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24ocHJldlR5cGUpIHtcbiAgaWYgKHByZXZUeXBlLmJlZm9yZUV4cHIgJiYgcHJldlR5cGUgIT09IHR5cGVzJDEuX2Vsc2UgJiZcbiAgICAgICEocHJldlR5cGUgPT09IHR5cGVzJDEuc2VtaSAmJiB0aGlzLmN1ckNvbnRleHQoKSAhPT0gdHlwZXMucF9zdGF0KSAmJlxuICAgICAgIShwcmV2VHlwZSA9PT0gdHlwZXMkMS5fcmV0dXJuICYmIGxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5sYXN0VG9rRW5kLCB0aGlzLnN0YXJ0KSkpICYmXG4gICAgICAhKChwcmV2VHlwZSA9PT0gdHlwZXMkMS5jb2xvbiB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5icmFjZUwpICYmIHRoaXMuY3VyQ29udGV4dCgpID09PSB0eXBlcy5iX3N0YXQpKVxuICAgIHsgdGhpcy5jb250ZXh0LnB1c2godHlwZXMuZl9leHByKTsgfVxuICBlbHNlXG4gICAgeyB0aGlzLmNvbnRleHQucHVzaCh0eXBlcy5mX3N0YXQpOyB9XG4gIHRoaXMuZXhwckFsbG93ZWQgPSBmYWxzZTtcbn07XG5cbnR5cGVzJDEuY29sb24udXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jdXJDb250ZXh0KCkudG9rZW4gPT09IFwiZnVuY3Rpb25cIikgeyB0aGlzLmNvbnRleHQucG9wKCk7IH1cbiAgdGhpcy5leHByQWxsb3dlZCA9IHRydWU7XG59O1xuXG50eXBlcyQxLmJhY2tRdW90ZS51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmN1ckNvbnRleHQoKSA9PT0gdHlwZXMucV90bXBsKVxuICAgIHsgdGhpcy5jb250ZXh0LnBvcCgpOyB9XG4gIGVsc2VcbiAgICB7IHRoaXMuY29udGV4dC5wdXNoKHR5cGVzLnFfdG1wbCk7IH1cbiAgdGhpcy5leHByQWxsb3dlZCA9IGZhbHNlO1xufTtcblxudHlwZXMkMS5zdGFyLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbihwcmV2VHlwZSkge1xuICBpZiAocHJldlR5cGUgPT09IHR5cGVzJDEuX2Z1bmN0aW9uKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDE7XG4gICAgaWYgKHRoaXMuY29udGV4dFtpbmRleF0gPT09IHR5cGVzLmZfZXhwcilcbiAgICAgIHsgdGhpcy5jb250ZXh0W2luZGV4XSA9IHR5cGVzLmZfZXhwcl9nZW47IH1cbiAgICBlbHNlXG4gICAgICB7IHRoaXMuY29udGV4dFtpbmRleF0gPSB0eXBlcy5mX2dlbjsgfVxuICB9XG4gIHRoaXMuZXhwckFsbG93ZWQgPSB0cnVlO1xufTtcblxudHlwZXMkMS5uYW1lLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbihwcmV2VHlwZSkge1xuICB2YXIgYWxsb3dlZCA9IGZhbHNlO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgcHJldlR5cGUgIT09IHR5cGVzJDEuZG90KSB7XG4gICAgaWYgKHRoaXMudmFsdWUgPT09IFwib2ZcIiAmJiAhdGhpcy5leHByQWxsb3dlZCB8fFxuICAgICAgICB0aGlzLnZhbHVlID09PSBcInlpZWxkXCIgJiYgdGhpcy5pbkdlbmVyYXRvckNvbnRleHQoKSlcbiAgICAgIHsgYWxsb3dlZCA9IHRydWU7IH1cbiAgfVxuICB0aGlzLmV4cHJBbGxvd2VkID0gYWxsb3dlZDtcbn07XG5cbi8vIEEgcmVjdXJzaXZlIGRlc2NlbnQgcGFyc2VyIG9wZXJhdGVzIGJ5IGRlZmluaW5nIGZ1bmN0aW9ucyBmb3IgYWxsXG4vLyBzeW50YWN0aWMgZWxlbWVudHMsIGFuZCByZWN1cnNpdmVseSBjYWxsaW5nIHRob3NlLCBlYWNoIGZ1bmN0aW9uXG4vLyBhZHZhbmNpbmcgdGhlIGlucHV0IHN0cmVhbSBhbmQgcmV0dXJuaW5nIGFuIEFTVCBub2RlLiBQcmVjZWRlbmNlXG4vLyBvZiBjb25zdHJ1Y3RzIChmb3IgZXhhbXBsZSwgdGhlIGZhY3QgdGhhdCBgIXhbMV1gIG1lYW5zIGAhKHhbMV0pYFxuLy8gaW5zdGVhZCBvZiBgKCF4KVsxXWAgaXMgaGFuZGxlZCBieSB0aGUgZmFjdCB0aGF0IHRoZSBwYXJzZXJcbi8vIGZ1bmN0aW9uIHRoYXQgcGFyc2VzIHVuYXJ5IHByZWZpeCBvcGVyYXRvcnMgaXMgY2FsbGVkIGZpcnN0LCBhbmRcbi8vIGluIHR1cm4gY2FsbHMgdGhlIGZ1bmN0aW9uIHRoYXQgcGFyc2VzIGBbXWAgc3Vic2NyaXB0cyBcdTIwMTQgdGhhdFxuLy8gd2F5LCBpdCdsbCByZWNlaXZlIHRoZSBub2RlIGZvciBgeFsxXWAgYWxyZWFkeSBwYXJzZWQsIGFuZCB3cmFwc1xuLy8gKnRoYXQqIGluIHRoZSB1bmFyeSBvcGVyYXRvciBub2RlLlxuLy9cbi8vIEFjb3JuIHVzZXMgYW4gW29wZXJhdG9yIHByZWNlZGVuY2UgcGFyc2VyXVtvcHBdIHRvIGhhbmRsZSBiaW5hcnlcbi8vIG9wZXJhdG9yIHByZWNlZGVuY2UsIGJlY2F1c2UgaXQgaXMgbXVjaCBtb3JlIGNvbXBhY3QgdGhhbiB1c2luZ1xuLy8gdGhlIHRlY2huaXF1ZSBvdXRsaW5lZCBhYm92ZSwgd2hpY2ggdXNlcyBkaWZmZXJlbnQsIG5lc3Rpbmdcbi8vIGZ1bmN0aW9ucyB0byBzcGVjaWZ5IHByZWNlZGVuY2UsIGZvciBhbGwgb2YgdGhlIHRlbiBiaW5hcnlcbi8vIHByZWNlZGVuY2UgbGV2ZWxzIHRoYXQgSmF2YVNjcmlwdCBkZWZpbmVzLlxuLy9cbi8vIFtvcHBdOiBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL09wZXJhdG9yLXByZWNlZGVuY2VfcGFyc2VyXG5cblxudmFyIHBwJDUgPSBQYXJzZXIucHJvdG90eXBlO1xuXG4vLyBDaGVjayBpZiBwcm9wZXJ0eSBuYW1lIGNsYXNoZXMgd2l0aCBhbHJlYWR5IGFkZGVkLlxuLy8gT2JqZWN0L2NsYXNzIGdldHRlcnMgYW5kIHNldHRlcnMgYXJlIG5vdCBhbGxvd2VkIHRvIGNsYXNoIFx1MjAxNFxuLy8gZWl0aGVyIHdpdGggZWFjaCBvdGhlciBvciB3aXRoIGFuIGluaXQgcHJvcGVydHkgXHUyMDE0IGFuZCBpblxuLy8gc3RyaWN0IG1vZGUsIGluaXQgcHJvcGVydGllcyBhcmUgYWxzbyBub3QgYWxsb3dlZCB0byBiZSByZXBlYXRlZC5cblxucHAkNS5jaGVja1Byb3BDbGFzaCA9IGZ1bmN0aW9uKHByb3AsIHByb3BIYXNoLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSAmJiBwcm9wLnR5cGUgPT09IFwiU3ByZWFkRWxlbWVudFwiKVxuICAgIHsgcmV0dXJuIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIChwcm9wLmNvbXB1dGVkIHx8IHByb3AubWV0aG9kIHx8IHByb3Auc2hvcnRoYW5kKSlcbiAgICB7IHJldHVybiB9XG4gIHZhciBrZXkgPSBwcm9wLmtleTtcbiAgdmFyIG5hbWU7XG4gIHN3aXRjaCAoa2V5LnR5cGUpIHtcbiAgY2FzZSBcIklkZW50aWZpZXJcIjogbmFtZSA9IGtleS5uYW1lOyBicmVha1xuICBjYXNlIFwiTGl0ZXJhbFwiOiBuYW1lID0gU3RyaW5nKGtleS52YWx1ZSk7IGJyZWFrXG4gIGRlZmF1bHQ6IHJldHVyblxuICB9XG4gIHZhciBraW5kID0gcHJvcC5raW5kO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHtcbiAgICBpZiAobmFtZSA9PT0gXCJfX3Byb3RvX19cIiAmJiBraW5kID09PSBcImluaXRcIikge1xuICAgICAgaWYgKHByb3BIYXNoLnByb3RvKSB7XG4gICAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gICAgICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuZG91YmxlUHJvdG8gPCAwKSB7XG4gICAgICAgICAgICByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLmRvdWJsZVByb3RvID0ga2V5LnN0YXJ0O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoa2V5LnN0YXJ0LCBcIlJlZGVmaW5pdGlvbiBvZiBfX3Byb3RvX18gcHJvcGVydHlcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHByb3BIYXNoLnByb3RvID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cbiAgbmFtZSA9IFwiJFwiICsgbmFtZTtcbiAgdmFyIG90aGVyID0gcHJvcEhhc2hbbmFtZV07XG4gIGlmIChvdGhlcikge1xuICAgIHZhciByZWRlZmluaXRpb247XG4gICAgaWYgKGtpbmQgPT09IFwiaW5pdFwiKSB7XG4gICAgICByZWRlZmluaXRpb24gPSB0aGlzLnN0cmljdCAmJiBvdGhlci5pbml0IHx8IG90aGVyLmdldCB8fCBvdGhlci5zZXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZGVmaW5pdGlvbiA9IG90aGVyLmluaXQgfHwgb3RoZXJba2luZF07XG4gICAgfVxuICAgIGlmIChyZWRlZmluaXRpb24pXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShrZXkuc3RhcnQsIFwiUmVkZWZpbml0aW9uIG9mIHByb3BlcnR5XCIpOyB9XG4gIH0gZWxzZSB7XG4gICAgb3RoZXIgPSBwcm9wSGFzaFtuYW1lXSA9IHtcbiAgICAgIGluaXQ6IGZhbHNlLFxuICAgICAgZ2V0OiBmYWxzZSxcbiAgICAgIHNldDogZmFsc2VcbiAgICB9O1xuICB9XG4gIG90aGVyW2tpbmRdID0gdHJ1ZTtcbn07XG5cbi8vICMjIyBFeHByZXNzaW9uIHBhcnNpbmdcblxuLy8gVGhlc2UgbmVzdCwgZnJvbSB0aGUgbW9zdCBnZW5lcmFsIGV4cHJlc3Npb24gdHlwZSBhdCB0aGUgdG9wIHRvXG4vLyAnYXRvbWljJywgbm9uZGl2aXNpYmxlIGV4cHJlc3Npb24gdHlwZXMgYXQgdGhlIGJvdHRvbS4gTW9zdCBvZlxuLy8gdGhlIGZ1bmN0aW9ucyB3aWxsIHNpbXBseSBsZXQgdGhlIGZ1bmN0aW9uKHMpIGJlbG93IHRoZW0gcGFyc2UsXG4vLyBhbmQsICppZiogdGhlIHN5bnRhY3RpYyBjb25zdHJ1Y3QgdGhleSBoYW5kbGUgaXMgcHJlc2VudCwgd3JhcFxuLy8gdGhlIEFTVCBub2RlIHRoYXQgdGhlIGlubmVyIHBhcnNlciBnYXZlIHRoZW0gaW4gYW5vdGhlciBub2RlLlxuXG4vLyBQYXJzZSBhIGZ1bGwgZXhwcmVzc2lvbi4gVGhlIG9wdGlvbmFsIGFyZ3VtZW50cyBhcmUgdXNlZCB0b1xuLy8gZm9yYmlkIHRoZSBgaW5gIG9wZXJhdG9yIChpbiBmb3IgbG9vcHMgaW5pdGFsaXphdGlvbiBleHByZXNzaW9ucylcbi8vIGFuZCBwcm92aWRlIHJlZmVyZW5jZSBmb3Igc3RvcmluZyAnPScgb3BlcmF0b3IgaW5zaWRlIHNob3J0aGFuZFxuLy8gcHJvcGVydHkgYXNzaWdubWVudCBpbiBjb250ZXh0cyB3aGVyZSBib3RoIG9iamVjdCBleHByZXNzaW9uXG4vLyBhbmQgb2JqZWN0IHBhdHRlcm4gbWlnaHQgYXBwZWFyIChzbyBpdCdzIHBvc3NpYmxlIHRvIHJhaXNlXG4vLyBkZWxheWVkIHN5bnRheCBlcnJvciBhdCBjb3JyZWN0IHBvc2l0aW9uKS5cblxucHAkNS5wYXJzZUV4cHJlc3Npb24gPSBmdW5jdGlvbihmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgdmFyIGV4cHIgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICBub2RlLmV4cHJlc3Npb25zID0gW2V4cHJdO1xuICAgIHdoaWxlICh0aGlzLmVhdCh0eXBlcyQxLmNvbW1hKSkgeyBub2RlLmV4cHJlc3Npb25zLnB1c2godGhpcy5wYXJzZU1heWJlQXNzaWduKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpKTsgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJTZXF1ZW5jZUV4cHJlc3Npb25cIilcbiAgfVxuICByZXR1cm4gZXhwclxufTtcblxuLy8gUGFyc2UgYW4gYXNzaWdubWVudCBleHByZXNzaW9uLiBUaGlzIGluY2x1ZGVzIGFwcGxpY2F0aW9ucyBvZlxuLy8gb3BlcmF0b3JzIGxpa2UgYCs9YC5cblxucHAkNS5wYXJzZU1heWJlQXNzaWduID0gZnVuY3Rpb24oZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgYWZ0ZXJMZWZ0UGFyc2UpIHtcbiAgaWYgKHRoaXMuaXNDb250ZXh0dWFsKFwieWllbGRcIikpIHtcbiAgICBpZiAodGhpcy5pbkdlbmVyYXRvcikgeyByZXR1cm4gdGhpcy5wYXJzZVlpZWxkKGZvckluaXQpIH1cbiAgICAvLyBUaGUgdG9rZW5pemVyIHdpbGwgYXNzdW1lIGFuIGV4cHJlc3Npb24gaXMgYWxsb3dlZCBhZnRlclxuICAgIC8vIGB5aWVsZGAsIGJ1dCB0aGlzIGlzbid0IHRoYXQga2luZCBvZiB5aWVsZFxuICAgIGVsc2UgeyB0aGlzLmV4cHJBbGxvd2VkID0gZmFsc2U7IH1cbiAgfVxuXG4gIHZhciBvd25EZXN0cnVjdHVyaW5nRXJyb3JzID0gZmFsc2UsIG9sZFBhcmVuQXNzaWduID0gLTEsIG9sZFRyYWlsaW5nQ29tbWEgPSAtMSwgb2xkRG91YmxlUHJvdG8gPSAtMTtcbiAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgICBvbGRQYXJlbkFzc2lnbiA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbjtcbiAgICBvbGRUcmFpbGluZ0NvbW1hID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hO1xuICAgIG9sZERvdWJsZVByb3RvID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5kb3VibGVQcm90bztcbiAgICByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPSAtMTtcbiAgfSBlbHNlIHtcbiAgICByZWZEZXN0cnVjdHVyaW5nRXJyb3JzID0gbmV3IERlc3RydWN0dXJpbmdFcnJvcnM7XG4gICAgb3duRGVzdHJ1Y3R1cmluZ0Vycm9ycyA9IHRydWU7XG4gIH1cblxuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEucGFyZW5MIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lKSB7XG4gICAgdGhpcy5wb3RlbnRpYWxBcnJvd0F0ID0gdGhpcy5zdGFydDtcbiAgICB0aGlzLnBvdGVudGlhbEFycm93SW5Gb3JBd2FpdCA9IGZvckluaXQgPT09IFwiYXdhaXRcIjtcbiAgfVxuICB2YXIgbGVmdCA9IHRoaXMucGFyc2VNYXliZUNvbmRpdGlvbmFsKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICBpZiAoYWZ0ZXJMZWZ0UGFyc2UpIHsgbGVmdCA9IGFmdGVyTGVmdFBhcnNlLmNhbGwodGhpcywgbGVmdCwgc3RhcnRQb3MsIHN0YXJ0TG9jKTsgfVxuICBpZiAodGhpcy50eXBlLmlzQXNzaWduKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgbm9kZS5vcGVyYXRvciA9IHRoaXMudmFsdWU7XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lcSlcbiAgICAgIHsgbGVmdCA9IHRoaXMudG9Bc3NpZ25hYmxlKGxlZnQsIGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTsgfVxuICAgIGlmICghb3duRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICAgICAgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5kb3VibGVQcm90byA9IC0xO1xuICAgIH1cbiAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5zaG9ydGhhbmRBc3NpZ24gPj0gbGVmdC5zdGFydClcbiAgICAgIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5zaG9ydGhhbmRBc3NpZ24gPSAtMTsgfSAvLyByZXNldCBiZWNhdXNlIHNob3J0aGFuZCBkZWZhdWx0IHdhcyB1c2VkIGNvcnJlY3RseVxuICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZXEpXG4gICAgICB7IHRoaXMuY2hlY2tMVmFsUGF0dGVybihsZWZ0KTsgfVxuICAgIGVsc2VcbiAgICAgIHsgdGhpcy5jaGVja0xWYWxTaW1wbGUobGVmdCk7IH1cbiAgICBub2RlLmxlZnQgPSBsZWZ0O1xuICAgIHRoaXMubmV4dCgpO1xuICAgIG5vZGUucmlnaHQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZm9ySW5pdCk7XG4gICAgaWYgKG9sZERvdWJsZVByb3RvID4gLTEpIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5kb3VibGVQcm90byA9IG9sZERvdWJsZVByb3RvOyB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkFzc2lnbm1lbnRFeHByZXNzaW9uXCIpXG4gIH0gZWxzZSB7XG4gICAgaWYgKG93bkRlc3RydWN0dXJpbmdFcnJvcnMpIHsgdGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7IH1cbiAgfVxuICBpZiAob2xkUGFyZW5Bc3NpZ24gPiAtMSkgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPSBvbGRQYXJlbkFzc2lnbjsgfVxuICBpZiAob2xkVHJhaWxpbmdDb21tYSA+IC0xKSB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA9IG9sZFRyYWlsaW5nQ29tbWE7IH1cbiAgcmV0dXJuIGxlZnRcbn07XG5cbi8vIFBhcnNlIGEgdGVybmFyeSBjb25kaXRpb25hbCAoYD86YCkgb3BlcmF0b3IuXG5cbnBwJDUucGFyc2VNYXliZUNvbmRpdGlvbmFsID0gZnVuY3Rpb24oZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gIHZhciBleHByID0gdGhpcy5wYXJzZUV4cHJPcHMoZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gIGlmICh0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSkgeyByZXR1cm4gZXhwciB9XG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLnF1ZXN0aW9uKSkge1xuICAgIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgIG5vZGUudGVzdCA9IGV4cHI7XG4gICAgbm9kZS5jb25zZXF1ZW50ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG4gICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb2xvbik7XG4gICAgbm9kZS5hbHRlcm5hdGUgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZm9ySW5pdCk7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkNvbmRpdGlvbmFsRXhwcmVzc2lvblwiKVxuICB9XG4gIHJldHVybiBleHByXG59O1xuXG4vLyBTdGFydCB0aGUgcHJlY2VkZW5jZSBwYXJzZXIuXG5cbnBwJDUucGFyc2VFeHByT3BzID0gZnVuY3Rpb24oZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gIHZhciBleHByID0gdGhpcy5wYXJzZU1heWJlVW5hcnkocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgZmFsc2UsIGZhbHNlLCBmb3JJbml0KTtcbiAgaWYgKHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpKSB7IHJldHVybiBleHByIH1cbiAgcmV0dXJuIGV4cHIuc3RhcnQgPT09IHN0YXJ0UG9zICYmIGV4cHIudHlwZSA9PT0gXCJBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvblwiID8gZXhwciA6IHRoaXMucGFyc2VFeHByT3AoZXhwciwgc3RhcnRQb3MsIHN0YXJ0TG9jLCAtMSwgZm9ySW5pdClcbn07XG5cbi8vIFBhcnNlIGJpbmFyeSBvcGVyYXRvcnMgd2l0aCB0aGUgb3BlcmF0b3IgcHJlY2VkZW5jZSBwYXJzaW5nXG4vLyBhbGdvcml0aG0uIGBsZWZ0YCBpcyB0aGUgbGVmdC1oYW5kIHNpZGUgb2YgdGhlIG9wZXJhdG9yLlxuLy8gYG1pblByZWNgIHByb3ZpZGVzIGNvbnRleHQgdGhhdCBhbGxvd3MgdGhlIGZ1bmN0aW9uIHRvIHN0b3AgYW5kXG4vLyBkZWZlciBmdXJ0aGVyIHBhcnNlciB0byBvbmUgb2YgaXRzIGNhbGxlcnMgd2hlbiBpdCBlbmNvdW50ZXJzIGFuXG4vLyBvcGVyYXRvciB0aGF0IGhhcyBhIGxvd2VyIHByZWNlZGVuY2UgdGhhbiB0aGUgc2V0IGl0IGlzIHBhcnNpbmcuXG5cbnBwJDUucGFyc2VFeHByT3AgPSBmdW5jdGlvbihsZWZ0LCBsZWZ0U3RhcnRQb3MsIGxlZnRTdGFydExvYywgbWluUHJlYywgZm9ySW5pdCkge1xuICB2YXIgcHJlYyA9IHRoaXMudHlwZS5iaW5vcDtcbiAgaWYgKHByZWMgIT0gbnVsbCAmJiAoIWZvckluaXQgfHwgdGhpcy50eXBlICE9PSB0eXBlcyQxLl9pbikpIHtcbiAgICBpZiAocHJlYyA+IG1pblByZWMpIHtcbiAgICAgIHZhciBsb2dpY2FsID0gdGhpcy50eXBlID09PSB0eXBlcyQxLmxvZ2ljYWxPUiB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEubG9naWNhbEFORDtcbiAgICAgIHZhciBjb2FsZXNjZSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb2FsZXNjZTtcbiAgICAgIGlmIChjb2FsZXNjZSkge1xuICAgICAgICAvLyBIYW5kbGUgdGhlIHByZWNlZGVuY2Ugb2YgYHR0LmNvYWxlc2NlYCBhcyBlcXVhbCB0byB0aGUgcmFuZ2Ugb2YgbG9naWNhbCBleHByZXNzaW9ucy5cbiAgICAgICAgLy8gSW4gb3RoZXIgd29yZHMsIGBub2RlLnJpZ2h0YCBzaG91bGRuJ3QgY29udGFpbiBsb2dpY2FsIGV4cHJlc3Npb25zIGluIG9yZGVyIHRvIGNoZWNrIHRoZSBtaXhlZCBlcnJvci5cbiAgICAgICAgcHJlYyA9IHR5cGVzJDEubG9naWNhbEFORC5iaW5vcDtcbiAgICAgIH1cbiAgICAgIHZhciBvcCA9IHRoaXMudmFsdWU7XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICAgIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgICAgIHZhciByaWdodCA9IHRoaXMucGFyc2VFeHByT3AodGhpcy5wYXJzZU1heWJlVW5hcnkobnVsbCwgZmFsc2UsIGZhbHNlLCBmb3JJbml0KSwgc3RhcnRQb3MsIHN0YXJ0TG9jLCBwcmVjLCBmb3JJbml0KTtcbiAgICAgIHZhciBub2RlID0gdGhpcy5idWlsZEJpbmFyeShsZWZ0U3RhcnRQb3MsIGxlZnRTdGFydExvYywgbGVmdCwgcmlnaHQsIG9wLCBsb2dpY2FsIHx8IGNvYWxlc2NlKTtcbiAgICAgIGlmICgobG9naWNhbCAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29hbGVzY2UpIHx8IChjb2FsZXNjZSAmJiAodGhpcy50eXBlID09PSB0eXBlcyQxLmxvZ2ljYWxPUiB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEubG9naWNhbEFORCkpKSB7XG4gICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCBcIkxvZ2ljYWwgZXhwcmVzc2lvbnMgYW5kIGNvYWxlc2NlIGV4cHJlc3Npb25zIGNhbm5vdCBiZSBtaXhlZC4gV3JhcCBlaXRoZXIgYnkgcGFyZW50aGVzZXNcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZUV4cHJPcChub2RlLCBsZWZ0U3RhcnRQb3MsIGxlZnRTdGFydExvYywgbWluUHJlYywgZm9ySW5pdClcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxlZnRcbn07XG5cbnBwJDUuYnVpbGRCaW5hcnkgPSBmdW5jdGlvbihzdGFydFBvcywgc3RhcnRMb2MsIGxlZnQsIHJpZ2h0LCBvcCwgbG9naWNhbCkge1xuICBpZiAocmlnaHQudHlwZSA9PT0gXCJQcml2YXRlSWRlbnRpZmllclwiKSB7IHRoaXMucmFpc2UocmlnaHQuc3RhcnQsIFwiUHJpdmF0ZSBpZGVudGlmaWVyIGNhbiBvbmx5IGJlIGxlZnQgc2lkZSBvZiBiaW5hcnkgZXhwcmVzc2lvblwiKTsgfVxuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgbm9kZS5sZWZ0ID0gbGVmdDtcbiAgbm9kZS5vcGVyYXRvciA9IG9wO1xuICBub2RlLnJpZ2h0ID0gcmlnaHQ7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgbG9naWNhbCA/IFwiTG9naWNhbEV4cHJlc3Npb25cIiA6IFwiQmluYXJ5RXhwcmVzc2lvblwiKVxufTtcblxuLy8gUGFyc2UgdW5hcnkgb3BlcmF0b3JzLCBib3RoIHByZWZpeCBhbmQgcG9zdGZpeC5cblxucHAkNS5wYXJzZU1heWJlVW5hcnkgPSBmdW5jdGlvbihyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBzYXdVbmFyeSwgaW5jRGVjLCBmb3JJbml0KSB7XG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYywgZXhwcjtcbiAgaWYgKHRoaXMuaXNDb250ZXh0dWFsKFwiYXdhaXRcIikgJiYgdGhpcy5jYW5Bd2FpdCkge1xuICAgIGV4cHIgPSB0aGlzLnBhcnNlQXdhaXQoZm9ySW5pdCk7XG4gICAgc2F3VW5hcnkgPSB0cnVlO1xuICB9IGVsc2UgaWYgKHRoaXMudHlwZS5wcmVmaXgpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCksIHVwZGF0ZSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5pbmNEZWM7XG4gICAgbm9kZS5vcGVyYXRvciA9IHRoaXMudmFsdWU7XG4gICAgbm9kZS5wcmVmaXggPSB0cnVlO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIG5vZGUuYXJndW1lbnQgPSB0aGlzLnBhcnNlTWF5YmVVbmFyeShudWxsLCB0cnVlLCB1cGRhdGUsIGZvckluaXQpO1xuICAgIHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpO1xuICAgIGlmICh1cGRhdGUpIHsgdGhpcy5jaGVja0xWYWxTaW1wbGUobm9kZS5hcmd1bWVudCk7IH1cbiAgICBlbHNlIGlmICh0aGlzLnN0cmljdCAmJiBub2RlLm9wZXJhdG9yID09PSBcImRlbGV0ZVwiICYmIGlzTG9jYWxWYXJpYWJsZUFjY2Vzcyhub2RlLmFyZ3VtZW50KSlcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiRGVsZXRpbmcgbG9jYWwgdmFyaWFibGUgaW4gc3RyaWN0IG1vZGVcIik7IH1cbiAgICBlbHNlIGlmIChub2RlLm9wZXJhdG9yID09PSBcImRlbGV0ZVwiICYmIGlzUHJpdmF0ZUZpZWxkQWNjZXNzKG5vZGUuYXJndW1lbnQpKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCJQcml2YXRlIGZpZWxkcyBjYW4gbm90IGJlIGRlbGV0ZWRcIik7IH1cbiAgICBlbHNlIHsgc2F3VW5hcnkgPSB0cnVlOyB9XG4gICAgZXhwciA9IHRoaXMuZmluaXNoTm9kZShub2RlLCB1cGRhdGUgPyBcIlVwZGF0ZUV4cHJlc3Npb25cIiA6IFwiVW5hcnlFeHByZXNzaW9uXCIpO1xuICB9IGVsc2UgaWYgKCFzYXdVbmFyeSAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEucHJpdmF0ZUlkKSB7XG4gICAgaWYgKChmb3JJbml0IHx8IHRoaXMucHJpdmF0ZU5hbWVTdGFjay5sZW5ndGggPT09IDApICYmIHRoaXMub3B0aW9ucy5jaGVja1ByaXZhdGVGaWVsZHMpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICBleHByID0gdGhpcy5wYXJzZVByaXZhdGVJZGVudCgpO1xuICAgIC8vIG9ubHkgY291bGQgYmUgcHJpdmF0ZSBmaWVsZHMgaW4gJ2luJywgc3VjaCBhcyAjeCBpbiBvYmpcbiAgICBpZiAodGhpcy50eXBlICE9PSB0eXBlcyQxLl9pbikgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICB9IGVsc2Uge1xuICAgIGV4cHIgPSB0aGlzLnBhcnNlRXhwclN1YnNjcmlwdHMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgZm9ySW5pdCk7XG4gICAgaWYgKHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpKSB7IHJldHVybiBleHByIH1cbiAgICB3aGlsZSAodGhpcy50eXBlLnBvc3RmaXggJiYgIXRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkpIHtcbiAgICAgIHZhciBub2RlJDEgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgICBub2RlJDEub3BlcmF0b3IgPSB0aGlzLnZhbHVlO1xuICAgICAgbm9kZSQxLnByZWZpeCA9IGZhbHNlO1xuICAgICAgbm9kZSQxLmFyZ3VtZW50ID0gZXhwcjtcbiAgICAgIHRoaXMuY2hlY2tMVmFsU2ltcGxlKGV4cHIpO1xuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICBleHByID0gdGhpcy5maW5pc2hOb2RlKG5vZGUkMSwgXCJVcGRhdGVFeHByZXNzaW9uXCIpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghaW5jRGVjICYmIHRoaXMuZWF0KHR5cGVzJDEuc3RhcnN0YXIpKSB7XG4gICAgaWYgKHNhd1VuYXJ5KVxuICAgICAgeyB0aGlzLnVuZXhwZWN0ZWQodGhpcy5sYXN0VG9rU3RhcnQpOyB9XG4gICAgZWxzZVxuICAgICAgeyByZXR1cm4gdGhpcy5idWlsZEJpbmFyeShzdGFydFBvcywgc3RhcnRMb2MsIGV4cHIsIHRoaXMucGFyc2VNYXliZVVuYXJ5KG51bGwsIGZhbHNlLCBmYWxzZSwgZm9ySW5pdCksIFwiKipcIiwgZmFsc2UpIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZXhwclxuICB9XG59O1xuXG5mdW5jdGlvbiBpc0xvY2FsVmFyaWFibGVBY2Nlc3Mobm9kZSkge1xuICByZXR1cm4gKFxuICAgIG5vZGUudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgfHxcbiAgICBub2RlLnR5cGUgPT09IFwiUGFyZW50aGVzaXplZEV4cHJlc3Npb25cIiAmJiBpc0xvY2FsVmFyaWFibGVBY2Nlc3Mobm9kZS5leHByZXNzaW9uKVxuICApXG59XG5cbmZ1bmN0aW9uIGlzUHJpdmF0ZUZpZWxkQWNjZXNzKG5vZGUpIHtcbiAgcmV0dXJuIChcbiAgICBub2RlLnR5cGUgPT09IFwiTWVtYmVyRXhwcmVzc2lvblwiICYmIG5vZGUucHJvcGVydHkudHlwZSA9PT0gXCJQcml2YXRlSWRlbnRpZmllclwiIHx8XG4gICAgbm9kZS50eXBlID09PSBcIkNoYWluRXhwcmVzc2lvblwiICYmIGlzUHJpdmF0ZUZpZWxkQWNjZXNzKG5vZGUuZXhwcmVzc2lvbikgfHxcbiAgICBub2RlLnR5cGUgPT09IFwiUGFyZW50aGVzaXplZEV4cHJlc3Npb25cIiAmJiBpc1ByaXZhdGVGaWVsZEFjY2Vzcyhub2RlLmV4cHJlc3Npb24pXG4gIClcbn1cblxuLy8gUGFyc2UgY2FsbCwgZG90LCBhbmQgYFtdYC1zdWJzY3JpcHQgZXhwcmVzc2lvbnMuXG5cbnBwJDUucGFyc2VFeHByU3Vic2NyaXB0cyA9IGZ1bmN0aW9uKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGZvckluaXQpIHtcbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICB2YXIgZXhwciA9IHRoaXMucGFyc2VFeHByQXRvbShyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBmb3JJbml0KTtcbiAgaWYgKGV4cHIudHlwZSA9PT0gXCJBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvblwiICYmIHRoaXMuaW5wdXQuc2xpY2UodGhpcy5sYXN0VG9rU3RhcnQsIHRoaXMubGFzdFRva0VuZCkgIT09IFwiKVwiKVxuICAgIHsgcmV0dXJuIGV4cHIgfVxuICB2YXIgcmVzdWx0ID0gdGhpcy5wYXJzZVN1YnNjcmlwdHMoZXhwciwgc3RhcnRQb3MsIHN0YXJ0TG9jLCBmYWxzZSwgZm9ySW5pdCk7XG4gIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzICYmIHJlc3VsdC50eXBlID09PSBcIk1lbWJlckV4cHJlc3Npb25cIikge1xuICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPj0gcmVzdWx0LnN0YXJ0KSB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA9IC0xOyB9XG4gICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEJpbmQgPj0gcmVzdWx0LnN0YXJ0KSB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEJpbmQgPSAtMTsgfVxuICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPj0gcmVzdWx0LnN0YXJ0KSB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA9IC0xOyB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufTtcblxucHAkNS5wYXJzZVN1YnNjcmlwdHMgPSBmdW5jdGlvbihiYXNlLCBzdGFydFBvcywgc3RhcnRMb2MsIG5vQ2FsbHMsIGZvckluaXQpIHtcbiAgdmFyIG1heWJlQXN5bmNBcnJvdyA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4ICYmIGJhc2UudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgJiYgYmFzZS5uYW1lID09PSBcImFzeW5jXCIgJiZcbiAgICAgIHRoaXMubGFzdFRva0VuZCA9PT0gYmFzZS5lbmQgJiYgIXRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkgJiYgYmFzZS5lbmQgLSBiYXNlLnN0YXJ0ID09PSA1ICYmXG4gICAgICB0aGlzLnBvdGVudGlhbEFycm93QXQgPT09IGJhc2Uuc3RhcnQ7XG4gIHZhciBvcHRpb25hbENoYWluZWQgPSBmYWxzZTtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5wYXJzZVN1YnNjcmlwdChiYXNlLCBzdGFydFBvcywgc3RhcnRMb2MsIG5vQ2FsbHMsIG1heWJlQXN5bmNBcnJvdywgb3B0aW9uYWxDaGFpbmVkLCBmb3JJbml0KTtcblxuICAgIGlmIChlbGVtZW50Lm9wdGlvbmFsKSB7IG9wdGlvbmFsQ2hhaW5lZCA9IHRydWU7IH1cbiAgICBpZiAoZWxlbWVudCA9PT0gYmFzZSB8fCBlbGVtZW50LnR5cGUgPT09IFwiQXJyb3dGdW5jdGlvbkV4cHJlc3Npb25cIikge1xuICAgICAgaWYgKG9wdGlvbmFsQ2hhaW5lZCkge1xuICAgICAgICB2YXIgY2hhaW5Ob2RlID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgICAgICBjaGFpbk5vZGUuZXhwcmVzc2lvbiA9IGVsZW1lbnQ7XG4gICAgICAgIGVsZW1lbnQgPSB0aGlzLmZpbmlzaE5vZGUoY2hhaW5Ob2RlLCBcIkNoYWluRXhwcmVzc2lvblwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbGVtZW50XG4gICAgfVxuXG4gICAgYmFzZSA9IGVsZW1lbnQ7XG4gIH1cbn07XG5cbnBwJDUuc2hvdWxkUGFyc2VBc3luY0Fycm93ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAhdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSAmJiB0aGlzLmVhdCh0eXBlcyQxLmFycm93KVxufTtcblxucHAkNS5wYXJzZVN1YnNjcmlwdEFzeW5jQXJyb3cgPSBmdW5jdGlvbihzdGFydFBvcywgc3RhcnRMb2MsIGV4cHJMaXN0LCBmb3JJbml0KSB7XG4gIHJldHVybiB0aGlzLnBhcnNlQXJyb3dFeHByZXNzaW9uKHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKSwgZXhwckxpc3QsIHRydWUsIGZvckluaXQpXG59O1xuXG5wcCQ1LnBhcnNlU3Vic2NyaXB0ID0gZnVuY3Rpb24oYmFzZSwgc3RhcnRQb3MsIHN0YXJ0TG9jLCBub0NhbGxzLCBtYXliZUFzeW5jQXJyb3csIG9wdGlvbmFsQ2hhaW5lZCwgZm9ySW5pdCkge1xuICB2YXIgb3B0aW9uYWxTdXBwb3J0ZWQgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTE7XG4gIHZhciBvcHRpb25hbCA9IG9wdGlvbmFsU3VwcG9ydGVkICYmIHRoaXMuZWF0KHR5cGVzJDEucXVlc3Rpb25Eb3QpO1xuICBpZiAobm9DYWxscyAmJiBvcHRpb25hbCkgeyB0aGlzLnJhaXNlKHRoaXMubGFzdFRva1N0YXJ0LCBcIk9wdGlvbmFsIGNoYWluaW5nIGNhbm5vdCBhcHBlYXIgaW4gdGhlIGNhbGxlZSBvZiBuZXcgZXhwcmVzc2lvbnNcIik7IH1cblxuICB2YXIgY29tcHV0ZWQgPSB0aGlzLmVhdCh0eXBlcyQxLmJyYWNrZXRMKTtcbiAgaWYgKGNvbXB1dGVkIHx8IChvcHRpb25hbCAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEucGFyZW5MICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5iYWNrUXVvdGUpIHx8IHRoaXMuZWF0KHR5cGVzJDEuZG90KSkge1xuICAgIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgIG5vZGUub2JqZWN0ID0gYmFzZTtcbiAgICBpZiAoY29tcHV0ZWQpIHtcbiAgICAgIG5vZGUucHJvcGVydHkgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFja2V0Uik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEucHJpdmF0ZUlkICYmIGJhc2UudHlwZSAhPT0gXCJTdXBlclwiKSB7XG4gICAgICBub2RlLnByb3BlcnR5ID0gdGhpcy5wYXJzZVByaXZhdGVJZGVudCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLnByb3BlcnR5ID0gdGhpcy5wYXJzZUlkZW50KHRoaXMub3B0aW9ucy5hbGxvd1Jlc2VydmVkICE9PSBcIm5ldmVyXCIpO1xuICAgIH1cbiAgICBub2RlLmNvbXB1dGVkID0gISFjb21wdXRlZDtcbiAgICBpZiAob3B0aW9uYWxTdXBwb3J0ZWQpIHtcbiAgICAgIG5vZGUub3B0aW9uYWwgPSBvcHRpb25hbDtcbiAgICB9XG4gICAgYmFzZSA9IHRoaXMuZmluaXNoTm9kZShub2RlLCBcIk1lbWJlckV4cHJlc3Npb25cIik7XG4gIH0gZWxzZSBpZiAoIW5vQ2FsbHMgJiYgdGhpcy5lYXQodHlwZXMkMS5wYXJlbkwpKSB7XG4gICAgdmFyIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMgPSBuZXcgRGVzdHJ1Y3R1cmluZ0Vycm9ycywgb2xkWWllbGRQb3MgPSB0aGlzLnlpZWxkUG9zLCBvbGRBd2FpdFBvcyA9IHRoaXMuYXdhaXRQb3MsIG9sZEF3YWl0SWRlbnRQb3MgPSB0aGlzLmF3YWl0SWRlbnRQb3M7XG4gICAgdGhpcy55aWVsZFBvcyA9IDA7XG4gICAgdGhpcy5hd2FpdFBvcyA9IDA7XG4gICAgdGhpcy5hd2FpdElkZW50UG9zID0gMDtcbiAgICB2YXIgZXhwckxpc3QgPSB0aGlzLnBhcnNlRXhwckxpc3QodHlwZXMkMS5wYXJlblIsIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4LCBmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgaWYgKG1heWJlQXN5bmNBcnJvdyAmJiAhb3B0aW9uYWwgJiYgdGhpcy5zaG91bGRQYXJzZUFzeW5jQXJyb3coKSkge1xuICAgICAgdGhpcy5jaGVja1BhdHRlcm5FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgZmFsc2UpO1xuICAgICAgdGhpcy5jaGVja1lpZWxkQXdhaXRJbkRlZmF1bHRQYXJhbXMoKTtcbiAgICAgIGlmICh0aGlzLmF3YWl0SWRlbnRQb3MgPiAwKVxuICAgICAgICB7IHRoaXMucmFpc2UodGhpcy5hd2FpdElkZW50UG9zLCBcIkNhbm5vdCB1c2UgJ2F3YWl0JyBhcyBpZGVudGlmaWVyIGluc2lkZSBhbiBhc3luYyBmdW5jdGlvblwiKTsgfVxuICAgICAgdGhpcy55aWVsZFBvcyA9IG9sZFlpZWxkUG9zO1xuICAgICAgdGhpcy5hd2FpdFBvcyA9IG9sZEF3YWl0UG9zO1xuICAgICAgdGhpcy5hd2FpdElkZW50UG9zID0gb2xkQXdhaXRJZGVudFBvcztcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlU3Vic2NyaXB0QXN5bmNBcnJvdyhzdGFydFBvcywgc3RhcnRMb2MsIGV4cHJMaXN0LCBmb3JJbml0KVxuICAgIH1cbiAgICB0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTtcbiAgICB0aGlzLnlpZWxkUG9zID0gb2xkWWllbGRQb3MgfHwgdGhpcy55aWVsZFBvcztcbiAgICB0aGlzLmF3YWl0UG9zID0gb2xkQXdhaXRQb3MgfHwgdGhpcy5hd2FpdFBvcztcbiAgICB0aGlzLmF3YWl0SWRlbnRQb3MgPSBvbGRBd2FpdElkZW50UG9zIHx8IHRoaXMuYXdhaXRJZGVudFBvcztcbiAgICB2YXIgbm9kZSQxID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgIG5vZGUkMS5jYWxsZWUgPSBiYXNlO1xuICAgIG5vZGUkMS5hcmd1bWVudHMgPSBleHByTGlzdDtcbiAgICBpZiAob3B0aW9uYWxTdXBwb3J0ZWQpIHtcbiAgICAgIG5vZGUkMS5vcHRpb25hbCA9IG9wdGlvbmFsO1xuICAgIH1cbiAgICBiYXNlID0gdGhpcy5maW5pc2hOb2RlKG5vZGUkMSwgXCJDYWxsRXhwcmVzc2lvblwiKTtcbiAgfSBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuYmFja1F1b3RlKSB7XG4gICAgaWYgKG9wdGlvbmFsIHx8IG9wdGlvbmFsQ2hhaW5lZCkge1xuICAgICAgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIk9wdGlvbmFsIGNoYWluaW5nIGNhbm5vdCBhcHBlYXIgaW4gdGhlIHRhZyBvZiB0YWdnZWQgdGVtcGxhdGUgZXhwcmVzc2lvbnNcIik7XG4gICAgfVxuICAgIHZhciBub2RlJDIgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgbm9kZSQyLnRhZyA9IGJhc2U7XG4gICAgbm9kZSQyLnF1YXNpID0gdGhpcy5wYXJzZVRlbXBsYXRlKHtpc1RhZ2dlZDogdHJ1ZX0pO1xuICAgIGJhc2UgPSB0aGlzLmZpbmlzaE5vZGUobm9kZSQyLCBcIlRhZ2dlZFRlbXBsYXRlRXhwcmVzc2lvblwiKTtcbiAgfVxuICByZXR1cm4gYmFzZVxufTtcblxuLy8gUGFyc2UgYW4gYXRvbWljIGV4cHJlc3Npb24gXHUyMDE0IGVpdGhlciBhIHNpbmdsZSB0b2tlbiB0aGF0IGlzIGFuXG4vLyBleHByZXNzaW9uLCBhbiBleHByZXNzaW9uIHN0YXJ0ZWQgYnkgYSBrZXl3b3JkIGxpa2UgYGZ1bmN0aW9uYCBvclxuLy8gYG5ld2AsIG9yIGFuIGV4cHJlc3Npb24gd3JhcHBlZCBpbiBwdW5jdHVhdGlvbiBsaWtlIGAoKWAsIGBbXWAsXG4vLyBvciBge31gLlxuXG5wcCQ1LnBhcnNlRXhwckF0b20gPSBmdW5jdGlvbihyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBmb3JJbml0LCBmb3JOZXcpIHtcbiAgLy8gSWYgYSBkaXZpc2lvbiBvcGVyYXRvciBhcHBlYXJzIGluIGFuIGV4cHJlc3Npb24gcG9zaXRpb24sIHRoZVxuICAvLyB0b2tlbml6ZXIgZ290IGNvbmZ1c2VkLCBhbmQgd2UgZm9yY2UgaXQgdG8gcmVhZCBhIHJlZ2V4cCBpbnN0ZWFkLlxuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnNsYXNoKSB7IHRoaXMucmVhZFJlZ2V4cCgpOyB9XG5cbiAgdmFyIG5vZGUsIGNhbkJlQXJyb3cgPSB0aGlzLnBvdGVudGlhbEFycm93QXQgPT09IHRoaXMuc3RhcnQ7XG4gIHN3aXRjaCAodGhpcy50eXBlKSB7XG4gIGNhc2UgdHlwZXMkMS5fc3VwZXI6XG4gICAgaWYgKCF0aGlzLmFsbG93U3VwZXIpXG4gICAgICB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCInc3VwZXInIGtleXdvcmQgb3V0c2lkZSBhIG1ldGhvZFwiKTsgfVxuICAgIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEucGFyZW5MICYmICF0aGlzLmFsbG93RGlyZWN0U3VwZXIpXG4gICAgICB7IHRoaXMucmFpc2Uobm9kZS5zdGFydCwgXCJzdXBlcigpIGNhbGwgb3V0c2lkZSBjb25zdHJ1Y3RvciBvZiBhIHN1YmNsYXNzXCIpOyB9XG4gICAgLy8gVGhlIGBzdXBlcmAga2V5d29yZCBjYW4gYXBwZWFyIGF0IGJlbG93OlxuICAgIC8vIFN1cGVyUHJvcGVydHk6XG4gICAgLy8gICAgIHN1cGVyIFsgRXhwcmVzc2lvbiBdXG4gICAgLy8gICAgIHN1cGVyIC4gSWRlbnRpZmllck5hbWVcbiAgICAvLyBTdXBlckNhbGw6XG4gICAgLy8gICAgIHN1cGVyICggQXJndW1lbnRzIClcbiAgICBpZiAodGhpcy50eXBlICE9PSB0eXBlcyQxLmRvdCAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEuYnJhY2tldEwgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLnBhcmVuTClcbiAgICAgIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiU3VwZXJcIilcblxuICBjYXNlIHR5cGVzJDEuX3RoaXM6XG4gICAgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlRoaXNFeHByZXNzaW9uXCIpXG5cbiAgY2FzZSB0eXBlcyQxLm5hbWU6XG4gICAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jLCBjb250YWluc0VzYyA9IHRoaXMuY29udGFpbnNFc2M7XG4gICAgdmFyIGlkID0gdGhpcy5wYXJzZUlkZW50KGZhbHNlKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDggJiYgIWNvbnRhaW5zRXNjICYmIGlkLm5hbWUgPT09IFwiYXN5bmNcIiAmJiAhdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSAmJiB0aGlzLmVhdCh0eXBlcyQxLl9mdW5jdGlvbikpIHtcbiAgICAgIHRoaXMub3ZlcnJpZGVDb250ZXh0KHR5cGVzLmZfZXhwcik7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZUZ1bmN0aW9uKHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKSwgMCwgZmFsc2UsIHRydWUsIGZvckluaXQpXG4gICAgfVxuICAgIGlmIChjYW5CZUFycm93ICYmICF0aGlzLmNhbkluc2VydFNlbWljb2xvbigpKSB7XG4gICAgICBpZiAodGhpcy5lYXQodHlwZXMkMS5hcnJvdykpXG4gICAgICAgIHsgcmV0dXJuIHRoaXMucGFyc2VBcnJvd0V4cHJlc3Npb24odGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpLCBbaWRdLCBmYWxzZSwgZm9ySW5pdCkgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4ICYmIGlkLm5hbWUgPT09IFwiYXN5bmNcIiAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSAmJiAhY29udGFpbnNFc2MgJiZcbiAgICAgICAgICAoIXRoaXMucG90ZW50aWFsQXJyb3dJbkZvckF3YWl0IHx8IHRoaXMudmFsdWUgIT09IFwib2ZcIiB8fCB0aGlzLmNvbnRhaW5zRXNjKSkge1xuICAgICAgICBpZCA9IHRoaXMucGFyc2VJZGVudChmYWxzZSk7XG4gICAgICAgIGlmICh0aGlzLmNhbkluc2VydFNlbWljb2xvbigpIHx8ICF0aGlzLmVhdCh0eXBlcyQxLmFycm93KSlcbiAgICAgICAgICB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlQXJyb3dFeHByZXNzaW9uKHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKSwgW2lkXSwgdHJ1ZSwgZm9ySW5pdClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGlkXG5cbiAgY2FzZSB0eXBlcyQxLnJlZ2V4cDpcbiAgICB2YXIgdmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgIG5vZGUgPSB0aGlzLnBhcnNlTGl0ZXJhbCh2YWx1ZS52YWx1ZSk7XG4gICAgbm9kZS5yZWdleCA9IHtwYXR0ZXJuOiB2YWx1ZS5wYXR0ZXJuLCBmbGFnczogdmFsdWUuZmxhZ3N9O1xuICAgIHJldHVybiBub2RlXG5cbiAgY2FzZSB0eXBlcyQxLm51bTogY2FzZSB0eXBlcyQxLnN0cmluZzpcbiAgICByZXR1cm4gdGhpcy5wYXJzZUxpdGVyYWwodGhpcy52YWx1ZSlcblxuICBjYXNlIHR5cGVzJDEuX251bGw6IGNhc2UgdHlwZXMkMS5fdHJ1ZTogY2FzZSB0eXBlcyQxLl9mYWxzZTpcbiAgICBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICBub2RlLnZhbHVlID0gdGhpcy50eXBlID09PSB0eXBlcyQxLl9udWxsID8gbnVsbCA6IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fdHJ1ZTtcbiAgICBub2RlLnJhdyA9IHRoaXMudHlwZS5rZXl3b3JkO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJMaXRlcmFsXCIpXG5cbiAgY2FzZSB0eXBlcyQxLnBhcmVuTDpcbiAgICB2YXIgc3RhcnQgPSB0aGlzLnN0YXJ0LCBleHByID0gdGhpcy5wYXJzZVBhcmVuQW5kRGlzdGluZ3Vpc2hFeHByZXNzaW9uKGNhbkJlQXJyb3csIGZvckluaXQpO1xuICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduIDwgMCAmJiAhdGhpcy5pc1NpbXBsZUFzc2lnblRhcmdldChleHByKSlcbiAgICAgICAgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPSBzdGFydDsgfVxuICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEJpbmQgPCAwKVxuICAgICAgICB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEJpbmQgPSBzdGFydDsgfVxuICAgIH1cbiAgICByZXR1cm4gZXhwclxuXG4gIGNhc2UgdHlwZXMkMS5icmFja2V0TDpcbiAgICBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICBub2RlLmVsZW1lbnRzID0gdGhpcy5wYXJzZUV4cHJMaXN0KHR5cGVzJDEuYnJhY2tldFIsIHRydWUsIHRydWUsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJBcnJheUV4cHJlc3Npb25cIilcblxuICBjYXNlIHR5cGVzJDEuYnJhY2VMOlxuICAgIHRoaXMub3ZlcnJpZGVDb250ZXh0KHR5cGVzLmJfZXhwcik7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VPYmooZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpXG5cbiAgY2FzZSB0eXBlcyQxLl9mdW5jdGlvbjpcbiAgICBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUZ1bmN0aW9uKG5vZGUsIDApXG5cbiAgY2FzZSB0eXBlcyQxLl9jbGFzczpcbiAgICByZXR1cm4gdGhpcy5wYXJzZUNsYXNzKHRoaXMuc3RhcnROb2RlKCksIGZhbHNlKVxuXG4gIGNhc2UgdHlwZXMkMS5fbmV3OlxuICAgIHJldHVybiB0aGlzLnBhcnNlTmV3KClcblxuICBjYXNlIHR5cGVzJDEuYmFja1F1b3RlOlxuICAgIHJldHVybiB0aGlzLnBhcnNlVGVtcGxhdGUoKVxuXG4gIGNhc2UgdHlwZXMkMS5faW1wb3J0OlxuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTEpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlRXhwckltcG9ydChmb3JOZXcpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnVuZXhwZWN0ZWQoKVxuICAgIH1cblxuICBkZWZhdWx0OlxuICAgIHJldHVybiB0aGlzLnBhcnNlRXhwckF0b21EZWZhdWx0KClcbiAgfVxufTtcblxucHAkNS5wYXJzZUV4cHJBdG9tRGVmYXVsdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnVuZXhwZWN0ZWQoKTtcbn07XG5cbnBwJDUucGFyc2VFeHBySW1wb3J0ID0gZnVuY3Rpb24oZm9yTmV3KSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcblxuICAvLyBDb25zdW1lIGBpbXBvcnRgIGFzIGFuIGlkZW50aWZpZXIgZm9yIGBpbXBvcnQubWV0YWAuXG4gIC8vIEJlY2F1c2UgYHRoaXMucGFyc2VJZGVudCh0cnVlKWAgZG9lc24ndCBjaGVjayBlc2NhcGUgc2VxdWVuY2VzLCBpdCBuZWVkcyB0aGUgY2hlY2sgb2YgYHRoaXMuY29udGFpbnNFc2NgLlxuICBpZiAodGhpcy5jb250YWluc0VzYykgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgXCJFc2NhcGUgc2VxdWVuY2UgaW4ga2V5d29yZCBpbXBvcnRcIik7IH1cbiAgdGhpcy5uZXh0KCk7XG5cbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wYXJlbkwgJiYgIWZvck5ldykge1xuICAgIHJldHVybiB0aGlzLnBhcnNlRHluYW1pY0ltcG9ydChub2RlKVxuICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5kb3QpIHtcbiAgICB2YXIgbWV0YSA9IHRoaXMuc3RhcnROb2RlQXQobm9kZS5zdGFydCwgbm9kZS5sb2MgJiYgbm9kZS5sb2Muc3RhcnQpO1xuICAgIG1ldGEubmFtZSA9IFwiaW1wb3J0XCI7XG4gICAgbm9kZS5tZXRhID0gdGhpcy5maW5pc2hOb2RlKG1ldGEsIFwiSWRlbnRpZmllclwiKTtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUltcG9ydE1ldGEobm9kZSlcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnVuZXhwZWN0ZWQoKTtcbiAgfVxufTtcblxucHAkNS5wYXJzZUR5bmFtaWNJbXBvcnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpOyAvLyBza2lwIGAoYFxuXG4gIC8vIFBhcnNlIG5vZGUuc291cmNlLlxuICBub2RlLnNvdXJjZSA9IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuXG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTYpIHtcbiAgICBpZiAoIXRoaXMuZWF0KHR5cGVzJDEucGFyZW5SKSkge1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICBpZiAoIXRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKHR5cGVzJDEucGFyZW5SKSkge1xuICAgICAgICBub2RlLm9wdGlvbnMgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcbiAgICAgICAgaWYgKCF0aGlzLmVhdCh0eXBlcyQxLnBhcmVuUikpIHtcbiAgICAgICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgICAgICBpZiAoIXRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKHR5cGVzJDEucGFyZW5SKSkge1xuICAgICAgICAgICAgdGhpcy51bmV4cGVjdGVkKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlLm9wdGlvbnMgPSBudWxsO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLm9wdGlvbnMgPSBudWxsO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBWZXJpZnkgZW5kaW5nLlxuICAgIGlmICghdGhpcy5lYXQodHlwZXMkMS5wYXJlblIpKSB7XG4gICAgICB2YXIgZXJyb3JQb3MgPSB0aGlzLnN0YXJ0O1xuICAgICAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuY29tbWEpICYmIHRoaXMuZWF0KHR5cGVzJDEucGFyZW5SKSkge1xuICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZXJyb3JQb3MsIFwiVHJhaWxpbmcgY29tbWEgaXMgbm90IGFsbG93ZWQgaW4gaW1wb3J0KClcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVuZXhwZWN0ZWQoZXJyb3JQb3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJbXBvcnRFeHByZXNzaW9uXCIpXG59O1xuXG5wcCQ1LnBhcnNlSW1wb3J0TWV0YSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7IC8vIHNraXAgYC5gXG5cbiAgdmFyIGNvbnRhaW5zRXNjID0gdGhpcy5jb250YWluc0VzYztcbiAgbm9kZS5wcm9wZXJ0eSA9IHRoaXMucGFyc2VJZGVudCh0cnVlKTtcblxuICBpZiAobm9kZS5wcm9wZXJ0eS5uYW1lICE9PSBcIm1ldGFcIilcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnByb3BlcnR5LnN0YXJ0LCBcIlRoZSBvbmx5IHZhbGlkIG1ldGEgcHJvcGVydHkgZm9yIGltcG9ydCBpcyAnaW1wb3J0Lm1ldGEnXCIpOyB9XG4gIGlmIChjb250YWluc0VzYylcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIidpbXBvcnQubWV0YScgbXVzdCBub3QgY29udGFpbiBlc2NhcGVkIGNoYXJhY3RlcnNcIik7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5zb3VyY2VUeXBlICE9PSBcIm1vZHVsZVwiICYmICF0aGlzLm9wdGlvbnMuYWxsb3dJbXBvcnRFeHBvcnRFdmVyeXdoZXJlKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiQ2Fubm90IHVzZSAnaW1wb3J0Lm1ldGEnIG91dHNpZGUgYSBtb2R1bGVcIik7IH1cblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiTWV0YVByb3BlcnR5XCIpXG59O1xuXG5wcCQ1LnBhcnNlTGl0ZXJhbCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgbm9kZS52YWx1ZSA9IHZhbHVlO1xuICBub2RlLnJhdyA9IHRoaXMuaW5wdXQuc2xpY2UodGhpcy5zdGFydCwgdGhpcy5lbmQpO1xuICBpZiAobm9kZS5yYXcuY2hhckNvZGVBdChub2RlLnJhdy5sZW5ndGggLSAxKSA9PT0gMTEwKVxuICAgIHsgbm9kZS5iaWdpbnQgPSBub2RlLnZhbHVlICE9IG51bGwgPyBub2RlLnZhbHVlLnRvU3RyaW5nKCkgOiBub2RlLnJhdy5zbGljZSgwLCAtMSkucmVwbGFjZSgvXy9nLCBcIlwiKTsgfVxuICB0aGlzLm5leHQoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkxpdGVyYWxcIilcbn07XG5cbnBwJDUucGFyc2VQYXJlbkV4cHJlc3Npb24gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlbkwpO1xuICB2YXIgdmFsID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlblIpO1xuICByZXR1cm4gdmFsXG59O1xuXG5wcCQ1LnNob3VsZFBhcnNlQXJyb3cgPSBmdW5jdGlvbihleHByTGlzdCkge1xuICByZXR1cm4gIXRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKClcbn07XG5cbnBwJDUucGFyc2VQYXJlbkFuZERpc3Rpbmd1aXNoRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKGNhbkJlQXJyb3csIGZvckluaXQpIHtcbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jLCB2YWwsIGFsbG93VHJhaWxpbmdDb21tYSA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4O1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHtcbiAgICB0aGlzLm5leHQoKTtcblxuICAgIHZhciBpbm5lclN0YXJ0UG9zID0gdGhpcy5zdGFydCwgaW5uZXJTdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gICAgdmFyIGV4cHJMaXN0ID0gW10sIGZpcnN0ID0gdHJ1ZSwgbGFzdElzQ29tbWEgPSBmYWxzZTtcbiAgICB2YXIgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyA9IG5ldyBEZXN0cnVjdHVyaW5nRXJyb3JzLCBvbGRZaWVsZFBvcyA9IHRoaXMueWllbGRQb3MsIG9sZEF3YWl0UG9zID0gdGhpcy5hd2FpdFBvcywgc3ByZWFkU3RhcnQ7XG4gICAgdGhpcy55aWVsZFBvcyA9IDA7XG4gICAgdGhpcy5hd2FpdFBvcyA9IDA7XG4gICAgLy8gRG8gbm90IHNhdmUgYXdhaXRJZGVudFBvcyB0byBhbGxvdyBjaGVja2luZyBhd2FpdHMgbmVzdGVkIGluIHBhcmFtZXRlcnNcbiAgICB3aGlsZSAodGhpcy50eXBlICE9PSB0eXBlcyQxLnBhcmVuUikge1xuICAgICAgZmlyc3QgPyBmaXJzdCA9IGZhbHNlIDogdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICBpZiAoYWxsb3dUcmFpbGluZ0NvbW1hICYmIHRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKHR5cGVzJDEucGFyZW5SLCB0cnVlKSkge1xuICAgICAgICBsYXN0SXNDb21tYSA9IHRydWU7XG4gICAgICAgIGJyZWFrXG4gICAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5lbGxpcHNpcykge1xuICAgICAgICBzcHJlYWRTdGFydCA9IHRoaXMuc3RhcnQ7XG4gICAgICAgIGV4cHJMaXN0LnB1c2godGhpcy5wYXJzZVBhcmVuSXRlbSh0aGlzLnBhcnNlUmVzdEJpbmRpbmcoKSkpO1xuICAgICAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hKSB7XG4gICAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKFxuICAgICAgICAgICAgdGhpcy5zdGFydCxcbiAgICAgICAgICAgIFwiQ29tbWEgaXMgbm90IHBlcm1pdHRlZCBhZnRlciB0aGUgcmVzdCBlbGVtZW50XCJcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleHByTGlzdC5wdXNoKHRoaXMucGFyc2VNYXliZUFzc2lnbihmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdGhpcy5wYXJzZVBhcmVuSXRlbSkpO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgaW5uZXJFbmRQb3MgPSB0aGlzLmxhc3RUb2tFbmQsIGlubmVyRW5kTG9jID0gdGhpcy5sYXN0VG9rRW5kTG9jO1xuICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5SKTtcblxuICAgIGlmIChjYW5CZUFycm93ICYmIHRoaXMuc2hvdWxkUGFyc2VBcnJvdyhleHByTGlzdCkgJiYgdGhpcy5lYXQodHlwZXMkMS5hcnJvdykpIHtcbiAgICAgIHRoaXMuY2hlY2tQYXR0ZXJuRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGZhbHNlKTtcbiAgICAgIHRoaXMuY2hlY2tZaWVsZEF3YWl0SW5EZWZhdWx0UGFyYW1zKCk7XG4gICAgICB0aGlzLnlpZWxkUG9zID0gb2xkWWllbGRQb3M7XG4gICAgICB0aGlzLmF3YWl0UG9zID0gb2xkQXdhaXRQb3M7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZVBhcmVuQXJyb3dMaXN0KHN0YXJ0UG9zLCBzdGFydExvYywgZXhwckxpc3QsIGZvckluaXQpXG4gICAgfVxuXG4gICAgaWYgKCFleHByTGlzdC5sZW5ndGggfHwgbGFzdElzQ29tbWEpIHsgdGhpcy51bmV4cGVjdGVkKHRoaXMubGFzdFRva1N0YXJ0KTsgfVxuICAgIGlmIChzcHJlYWRTdGFydCkgeyB0aGlzLnVuZXhwZWN0ZWQoc3ByZWFkU3RhcnQpOyB9XG4gICAgdGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7XG4gICAgdGhpcy55aWVsZFBvcyA9IG9sZFlpZWxkUG9zIHx8IHRoaXMueWllbGRQb3M7XG4gICAgdGhpcy5hd2FpdFBvcyA9IG9sZEF3YWl0UG9zIHx8IHRoaXMuYXdhaXRQb3M7XG5cbiAgICBpZiAoZXhwckxpc3QubGVuZ3RoID4gMSkge1xuICAgICAgdmFsID0gdGhpcy5zdGFydE5vZGVBdChpbm5lclN0YXJ0UG9zLCBpbm5lclN0YXJ0TG9jKTtcbiAgICAgIHZhbC5leHByZXNzaW9ucyA9IGV4cHJMaXN0O1xuICAgICAgdGhpcy5maW5pc2hOb2RlQXQodmFsLCBcIlNlcXVlbmNlRXhwcmVzc2lvblwiLCBpbm5lckVuZFBvcywgaW5uZXJFbmRMb2MpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWwgPSBleHByTGlzdFswXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gdGhpcy5wYXJzZVBhcmVuRXhwcmVzc2lvbigpO1xuICB9XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5wcmVzZXJ2ZVBhcmVucykge1xuICAgIHZhciBwYXIgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgcGFyLmV4cHJlc3Npb24gPSB2YWw7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShwYXIsIFwiUGFyZW50aGVzaXplZEV4cHJlc3Npb25cIilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsXG4gIH1cbn07XG5cbnBwJDUucGFyc2VQYXJlbkl0ZW0gPSBmdW5jdGlvbihpdGVtKSB7XG4gIHJldHVybiBpdGVtXG59O1xuXG5wcCQ1LnBhcnNlUGFyZW5BcnJvd0xpc3QgPSBmdW5jdGlvbihzdGFydFBvcywgc3RhcnRMb2MsIGV4cHJMaXN0LCBmb3JJbml0KSB7XG4gIHJldHVybiB0aGlzLnBhcnNlQXJyb3dFeHByZXNzaW9uKHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKSwgZXhwckxpc3QsIGZhbHNlLCBmb3JJbml0KVxufTtcblxuLy8gTmV3J3MgcHJlY2VkZW5jZSBpcyBzbGlnaHRseSB0cmlja3kuIEl0IG11c3QgYWxsb3cgaXRzIGFyZ3VtZW50IHRvXG4vLyBiZSBhIGBbXWAgb3IgZG90IHN1YnNjcmlwdCBleHByZXNzaW9uLCBidXQgbm90IGEgY2FsbCBcdTIwMTQgYXQgbGVhc3QsXG4vLyBub3Qgd2l0aG91dCB3cmFwcGluZyBpdCBpbiBwYXJlbnRoZXNlcy4gVGh1cywgaXQgdXNlcyB0aGUgbm9DYWxsc1xuLy8gYXJndW1lbnQgdG8gcGFyc2VTdWJzY3JpcHRzIHRvIHByZXZlbnQgaXQgZnJvbSBjb25zdW1pbmcgdGhlXG4vLyBhcmd1bWVudCBsaXN0LlxuXG52YXIgZW1wdHkgPSBbXTtcblxucHAkNS5wYXJzZU5ldyA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jb250YWluc0VzYykgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgXCJFc2NhcGUgc2VxdWVuY2UgaW4ga2V5d29yZCBuZXdcIik7IH1cbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHQoKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5kb3QpIHtcbiAgICB2YXIgbWV0YSA9IHRoaXMuc3RhcnROb2RlQXQobm9kZS5zdGFydCwgbm9kZS5sb2MgJiYgbm9kZS5sb2Muc3RhcnQpO1xuICAgIG1ldGEubmFtZSA9IFwibmV3XCI7XG4gICAgbm9kZS5tZXRhID0gdGhpcy5maW5pc2hOb2RlKG1ldGEsIFwiSWRlbnRpZmllclwiKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICB2YXIgY29udGFpbnNFc2MgPSB0aGlzLmNvbnRhaW5zRXNjO1xuICAgIG5vZGUucHJvcGVydHkgPSB0aGlzLnBhcnNlSWRlbnQodHJ1ZSk7XG4gICAgaWYgKG5vZGUucHJvcGVydHkubmFtZSAhPT0gXCJ0YXJnZXRcIilcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUucHJvcGVydHkuc3RhcnQsIFwiVGhlIG9ubHkgdmFsaWQgbWV0YSBwcm9wZXJ0eSBmb3IgbmV3IGlzICduZXcudGFyZ2V0J1wiKTsgfVxuICAgIGlmIChjb250YWluc0VzYylcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiJ25ldy50YXJnZXQnIG11c3Qgbm90IGNvbnRhaW4gZXNjYXBlZCBjaGFyYWN0ZXJzXCIpOyB9XG4gICAgaWYgKCF0aGlzLmFsbG93TmV3RG90VGFyZ2V0KVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCInbmV3LnRhcmdldCcgY2FuIG9ubHkgYmUgdXNlZCBpbiBmdW5jdGlvbnMgYW5kIGNsYXNzIHN0YXRpYyBibG9ja1wiKTsgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJNZXRhUHJvcGVydHlcIilcbiAgfVxuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gIG5vZGUuY2FsbGVlID0gdGhpcy5wYXJzZVN1YnNjcmlwdHModGhpcy5wYXJzZUV4cHJBdG9tKG51bGwsIGZhbHNlLCB0cnVlKSwgc3RhcnRQb3MsIHN0YXJ0TG9jLCB0cnVlLCBmYWxzZSk7XG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLnBhcmVuTCkpIHsgbm9kZS5hcmd1bWVudHMgPSB0aGlzLnBhcnNlRXhwckxpc3QodHlwZXMkMS5wYXJlblIsIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4LCBmYWxzZSk7IH1cbiAgZWxzZSB7IG5vZGUuYXJndW1lbnRzID0gZW1wdHk7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIk5ld0V4cHJlc3Npb25cIilcbn07XG5cbi8vIFBhcnNlIHRlbXBsYXRlIGV4cHJlc3Npb24uXG5cbnBwJDUucGFyc2VUZW1wbGF0ZUVsZW1lbnQgPSBmdW5jdGlvbihyZWYpIHtcbiAgdmFyIGlzVGFnZ2VkID0gcmVmLmlzVGFnZ2VkO1xuXG4gIHZhciBlbGVtID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5pbnZhbGlkVGVtcGxhdGUpIHtcbiAgICBpZiAoIWlzVGFnZ2VkKSB7XG4gICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgXCJCYWQgZXNjYXBlIHNlcXVlbmNlIGluIHVudGFnZ2VkIHRlbXBsYXRlIGxpdGVyYWxcIik7XG4gICAgfVxuICAgIGVsZW0udmFsdWUgPSB7XG4gICAgICByYXc6IHRoaXMudmFsdWUucmVwbGFjZSgvXFxyXFxuPy9nLCBcIlxcblwiKSxcbiAgICAgIGNvb2tlZDogbnVsbFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgZWxlbS52YWx1ZSA9IHtcbiAgICAgIHJhdzogdGhpcy5pbnB1dC5zbGljZSh0aGlzLnN0YXJ0LCB0aGlzLmVuZCkucmVwbGFjZSgvXFxyXFxuPy9nLCBcIlxcblwiKSxcbiAgICAgIGNvb2tlZDogdGhpcy52YWx1ZVxuICAgIH07XG4gIH1cbiAgdGhpcy5uZXh0KCk7XG4gIGVsZW0udGFpbCA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5iYWNrUXVvdGU7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUoZWxlbSwgXCJUZW1wbGF0ZUVsZW1lbnRcIilcbn07XG5cbnBwJDUucGFyc2VUZW1wbGF0ZSA9IGZ1bmN0aW9uKHJlZikge1xuICBpZiAoIHJlZiA9PT0gdm9pZCAwICkgcmVmID0ge307XG4gIHZhciBpc1RhZ2dlZCA9IHJlZi5pc1RhZ2dlZDsgaWYgKCBpc1RhZ2dlZCA9PT0gdm9pZCAwICkgaXNUYWdnZWQgPSBmYWxzZTtcblxuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLmV4cHJlc3Npb25zID0gW107XG4gIHZhciBjdXJFbHQgPSB0aGlzLnBhcnNlVGVtcGxhdGVFbGVtZW50KHtpc1RhZ2dlZDogaXNUYWdnZWR9KTtcbiAgbm9kZS5xdWFzaXMgPSBbY3VyRWx0XTtcbiAgd2hpbGUgKCFjdXJFbHQudGFpbCkge1xuICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZW9mKSB7IHRoaXMucmFpc2UodGhpcy5wb3MsIFwiVW50ZXJtaW5hdGVkIHRlbXBsYXRlIGxpdGVyYWxcIik7IH1cbiAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmRvbGxhckJyYWNlTCk7XG4gICAgbm9kZS5leHByZXNzaW9ucy5wdXNoKHRoaXMucGFyc2VFeHByZXNzaW9uKCkpO1xuICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2VSKTtcbiAgICBub2RlLnF1YXNpcy5wdXNoKGN1ckVsdCA9IHRoaXMucGFyc2VUZW1wbGF0ZUVsZW1lbnQoe2lzVGFnZ2VkOiBpc1RhZ2dlZH0pKTtcbiAgfVxuICB0aGlzLm5leHQoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlRlbXBsYXRlTGl0ZXJhbFwiKVxufTtcblxucHAkNS5pc0FzeW5jUHJvcCA9IGZ1bmN0aW9uKHByb3ApIHtcbiAgcmV0dXJuICFwcm9wLmNvbXB1dGVkICYmIHByb3Aua2V5LnR5cGUgPT09IFwiSWRlbnRpZmllclwiICYmIHByb3Aua2V5Lm5hbWUgPT09IFwiYXN5bmNcIiAmJlxuICAgICh0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEubnVtIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdHJpbmcgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLmJyYWNrZXRMIHx8IHRoaXMudHlwZS5rZXl3b3JkIHx8ICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RhcikpICYmXG4gICAgIWxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5sYXN0VG9rRW5kLCB0aGlzLnN0YXJ0KSlcbn07XG5cbi8vIFBhcnNlIGFuIG9iamVjdCBsaXRlcmFsIG9yIGJpbmRpbmcgcGF0dGVybi5cblxucHAkNS5wYXJzZU9iaiA9IGZ1bmN0aW9uKGlzUGF0dGVybiwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCksIGZpcnN0ID0gdHJ1ZSwgcHJvcEhhc2ggPSB7fTtcbiAgbm9kZS5wcm9wZXJ0aWVzID0gW107XG4gIHRoaXMubmV4dCgpO1xuICB3aGlsZSAoIXRoaXMuZWF0KHR5cGVzJDEuYnJhY2VSKSkge1xuICAgIGlmICghZmlyc3QpIHtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA1ICYmIHRoaXMuYWZ0ZXJUcmFpbGluZ0NvbW1hKHR5cGVzJDEuYnJhY2VSKSkgeyBicmVhayB9XG4gICAgfSBlbHNlIHsgZmlyc3QgPSBmYWxzZTsgfVxuXG4gICAgdmFyIHByb3AgPSB0aGlzLnBhcnNlUHJvcGVydHkoaXNQYXR0ZXJuLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICBpZiAoIWlzUGF0dGVybikgeyB0aGlzLmNoZWNrUHJvcENsYXNoKHByb3AsIHByb3BIYXNoLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTsgfVxuICAgIG5vZGUucHJvcGVydGllcy5wdXNoKHByb3ApO1xuICB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgaXNQYXR0ZXJuID8gXCJPYmplY3RQYXR0ZXJuXCIgOiBcIk9iamVjdEV4cHJlc3Npb25cIilcbn07XG5cbnBwJDUucGFyc2VQcm9wZXJ0eSA9IGZ1bmN0aW9uKGlzUGF0dGVybiwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICB2YXIgcHJvcCA9IHRoaXMuc3RhcnROb2RlKCksIGlzR2VuZXJhdG9yLCBpc0FzeW5jLCBzdGFydFBvcywgc3RhcnRMb2M7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSAmJiB0aGlzLmVhdCh0eXBlcyQxLmVsbGlwc2lzKSkge1xuICAgIGlmIChpc1BhdHRlcm4pIHtcbiAgICAgIHByb3AuYXJndW1lbnQgPSB0aGlzLnBhcnNlSWRlbnQoZmFsc2UpO1xuICAgICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSkge1xuICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgXCJDb21tYSBpcyBub3QgcGVybWl0dGVkIGFmdGVyIHRoZSByZXN0IGVsZW1lbnRcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKHByb3AsIFwiUmVzdEVsZW1lbnRcIilcbiAgICB9XG4gICAgLy8gUGFyc2UgYXJndW1lbnQuXG4gICAgcHJvcC5hcmd1bWVudCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgLy8gVG8gZGlzYWxsb3cgdHJhaWxpbmcgY29tbWEgdmlhIGB0aGlzLnRvQXNzaWduYWJsZSgpYC5cbiAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hICYmIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMgJiYgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hIDwgMCkge1xuICAgICAgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID0gdGhpcy5zdGFydDtcbiAgICB9XG4gICAgLy8gRmluaXNoXG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShwcm9wLCBcIlNwcmVhZEVsZW1lbnRcIilcbiAgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHtcbiAgICBwcm9wLm1ldGhvZCA9IGZhbHNlO1xuICAgIHByb3Auc2hvcnRoYW5kID0gZmFsc2U7XG4gICAgaWYgKGlzUGF0dGVybiB8fCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gICAgICBzdGFydFBvcyA9IHRoaXMuc3RhcnQ7XG4gICAgICBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gICAgfVxuICAgIGlmICghaXNQYXR0ZXJuKVxuICAgICAgeyBpc0dlbmVyYXRvciA9IHRoaXMuZWF0KHR5cGVzJDEuc3Rhcik7IH1cbiAgfVxuICB2YXIgY29udGFpbnNFc2MgPSB0aGlzLmNvbnRhaW5zRXNjO1xuICB0aGlzLnBhcnNlUHJvcGVydHlOYW1lKHByb3ApO1xuICBpZiAoIWlzUGF0dGVybiAmJiAhY29udGFpbnNFc2MgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDggJiYgIWlzR2VuZXJhdG9yICYmIHRoaXMuaXNBc3luY1Byb3AocHJvcCkpIHtcbiAgICBpc0FzeW5jID0gdHJ1ZTtcbiAgICBpc0dlbmVyYXRvciA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ICYmIHRoaXMuZWF0KHR5cGVzJDEuc3Rhcik7XG4gICAgdGhpcy5wYXJzZVByb3BlcnR5TmFtZShwcm9wKTtcbiAgfSBlbHNlIHtcbiAgICBpc0FzeW5jID0gZmFsc2U7XG4gIH1cbiAgdGhpcy5wYXJzZVByb3BlcnR5VmFsdWUocHJvcCwgaXNQYXR0ZXJuLCBpc0dlbmVyYXRvciwgaXNBc3luYywgc3RhcnRQb3MsIHN0YXJ0TG9jLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBjb250YWluc0VzYyk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUocHJvcCwgXCJQcm9wZXJ0eVwiKVxufTtcblxucHAkNS5wYXJzZUdldHRlclNldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcbiAgdmFyIGtpbmQgPSBwcm9wLmtleS5uYW1lO1xuICB0aGlzLnBhcnNlUHJvcGVydHlOYW1lKHByb3ApO1xuICBwcm9wLnZhbHVlID0gdGhpcy5wYXJzZU1ldGhvZChmYWxzZSk7XG4gIHByb3Aua2luZCA9IGtpbmQ7XG4gIHZhciBwYXJhbUNvdW50ID0gcHJvcC5raW5kID09PSBcImdldFwiID8gMCA6IDE7XG4gIGlmIChwcm9wLnZhbHVlLnBhcmFtcy5sZW5ndGggIT09IHBhcmFtQ291bnQpIHtcbiAgICB2YXIgc3RhcnQgPSBwcm9wLnZhbHVlLnN0YXJ0O1xuICAgIGlmIChwcm9wLmtpbmQgPT09IFwiZ2V0XCIpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShzdGFydCwgXCJnZXR0ZXIgc2hvdWxkIGhhdmUgbm8gcGFyYW1zXCIpOyB9XG4gICAgZWxzZVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoc3RhcnQsIFwic2V0dGVyIHNob3VsZCBoYXZlIGV4YWN0bHkgb25lIHBhcmFtXCIpOyB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKHByb3Aua2luZCA9PT0gXCJzZXRcIiAmJiBwcm9wLnZhbHVlLnBhcmFtc1swXS50eXBlID09PSBcIlJlc3RFbGVtZW50XCIpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShwcm9wLnZhbHVlLnBhcmFtc1swXS5zdGFydCwgXCJTZXR0ZXIgY2Fubm90IHVzZSByZXN0IHBhcmFtc1wiKTsgfVxuICB9XG59O1xuXG5wcCQ1LnBhcnNlUHJvcGVydHlWYWx1ZSA9IGZ1bmN0aW9uKHByb3AsIGlzUGF0dGVybiwgaXNHZW5lcmF0b3IsIGlzQXN5bmMsIHN0YXJ0UG9zLCBzdGFydExvYywgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgY29udGFpbnNFc2MpIHtcbiAgaWYgKChpc0dlbmVyYXRvciB8fCBpc0FzeW5jKSAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29sb24pXG4gICAgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuXG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLmNvbG9uKSkge1xuICAgIHByb3AudmFsdWUgPSBpc1BhdHRlcm4gPyB0aGlzLnBhcnNlTWF5YmVEZWZhdWx0KHRoaXMuc3RhcnQsIHRoaXMuc3RhcnRMb2MpIDogdGhpcy5wYXJzZU1heWJlQXNzaWduKGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICBwcm9wLmtpbmQgPSBcImluaXRcIjtcbiAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEucGFyZW5MKSB7XG4gICAgaWYgKGlzUGF0dGVybikgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHByb3AubWV0aG9kID0gdHJ1ZTtcbiAgICBwcm9wLnZhbHVlID0gdGhpcy5wYXJzZU1ldGhvZChpc0dlbmVyYXRvciwgaXNBc3luYyk7XG4gICAgcHJvcC5raW5kID0gXCJpbml0XCI7XG4gIH0gZWxzZSBpZiAoIWlzUGF0dGVybiAmJiAhY29udGFpbnNFc2MgJiZcbiAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNSAmJiAhcHJvcC5jb21wdXRlZCAmJiBwcm9wLmtleS50eXBlID09PSBcIklkZW50aWZpZXJcIiAmJlxuICAgICAgICAgICAgIChwcm9wLmtleS5uYW1lID09PSBcImdldFwiIHx8IHByb3Aua2V5Lm5hbWUgPT09IFwic2V0XCIpICYmXG4gICAgICAgICAgICAgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5jb21tYSAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEuYnJhY2VSICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5lcSkpIHtcbiAgICBpZiAoaXNHZW5lcmF0b3IgfHwgaXNBc3luYykgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHRoaXMucGFyc2VHZXR0ZXJTZXR0ZXIocHJvcCk7XG4gIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgIXByb3AuY29tcHV0ZWQgJiYgcHJvcC5rZXkudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIpIHtcbiAgICBpZiAoaXNHZW5lcmF0b3IgfHwgaXNBc3luYykgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHRoaXMuY2hlY2tVbnJlc2VydmVkKHByb3Aua2V5KTtcbiAgICBpZiAocHJvcC5rZXkubmFtZSA9PT0gXCJhd2FpdFwiICYmICF0aGlzLmF3YWl0SWRlbnRQb3MpXG4gICAgICB7IHRoaXMuYXdhaXRJZGVudFBvcyA9IHN0YXJ0UG9zOyB9XG4gICAgaWYgKGlzUGF0dGVybikge1xuICAgICAgcHJvcC52YWx1ZSA9IHRoaXMucGFyc2VNYXliZURlZmF1bHQoc3RhcnRQb3MsIHN0YXJ0TG9jLCB0aGlzLmNvcHlOb2RlKHByb3Aua2V5KSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZXEgJiYgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuc2hvcnRoYW5kQXNzaWduIDwgMClcbiAgICAgICAgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnNob3J0aGFuZEFzc2lnbiA9IHRoaXMuc3RhcnQ7IH1cbiAgICAgIHByb3AudmFsdWUgPSB0aGlzLnBhcnNlTWF5YmVEZWZhdWx0KHN0YXJ0UG9zLCBzdGFydExvYywgdGhpcy5jb3B5Tm9kZShwcm9wLmtleSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9wLnZhbHVlID0gdGhpcy5jb3B5Tm9kZShwcm9wLmtleSk7XG4gICAgfVxuICAgIHByb3Aua2luZCA9IFwiaW5pdFwiO1xuICAgIHByb3Auc2hvcnRoYW5kID0gdHJ1ZTtcbiAgfSBlbHNlIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbn07XG5cbnBwJDUucGFyc2VQcm9wZXJ0eU5hbWUgPSBmdW5jdGlvbihwcm9wKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikge1xuICAgIGlmICh0aGlzLmVhdCh0eXBlcyQxLmJyYWNrZXRMKSkge1xuICAgICAgcHJvcC5jb21wdXRlZCA9IHRydWU7XG4gICAgICBwcm9wLmtleSA9IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFja2V0Uik7XG4gICAgICByZXR1cm4gcHJvcC5rZXlcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvcC5jb21wdXRlZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHJvcC5rZXkgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEubnVtIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdHJpbmcgPyB0aGlzLnBhcnNlRXhwckF0b20oKSA6IHRoaXMucGFyc2VJZGVudCh0aGlzLm9wdGlvbnMuYWxsb3dSZXNlcnZlZCAhPT0gXCJuZXZlclwiKVxufTtcblxuLy8gSW5pdGlhbGl6ZSBlbXB0eSBmdW5jdGlvbiBub2RlLlxuXG5wcCQ1LmluaXRGdW5jdGlvbiA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgbm9kZS5pZCA9IG51bGw7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikgeyBub2RlLmdlbmVyYXRvciA9IG5vZGUuZXhwcmVzc2lvbiA9IGZhbHNlOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCkgeyBub2RlLmFzeW5jID0gZmFsc2U7IH1cbn07XG5cbi8vIFBhcnNlIG9iamVjdCBvciBjbGFzcyBtZXRob2QuXG5cbnBwJDUucGFyc2VNZXRob2QgPSBmdW5jdGlvbihpc0dlbmVyYXRvciwgaXNBc3luYywgYWxsb3dEaXJlY3RTdXBlcikge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCksIG9sZFlpZWxkUG9zID0gdGhpcy55aWVsZFBvcywgb2xkQXdhaXRQb3MgPSB0aGlzLmF3YWl0UG9zLCBvbGRBd2FpdElkZW50UG9zID0gdGhpcy5hd2FpdElkZW50UG9zO1xuXG4gIHRoaXMuaW5pdEZ1bmN0aW9uKG5vZGUpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpXG4gICAgeyBub2RlLmdlbmVyYXRvciA9IGlzR2VuZXJhdG9yOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOClcbiAgICB7IG5vZGUuYXN5bmMgPSAhIWlzQXN5bmM7IH1cblxuICB0aGlzLnlpZWxkUG9zID0gMDtcbiAgdGhpcy5hd2FpdFBvcyA9IDA7XG4gIHRoaXMuYXdhaXRJZGVudFBvcyA9IDA7XG4gIHRoaXMuZW50ZXJTY29wZShmdW5jdGlvbkZsYWdzKGlzQXN5bmMsIG5vZGUuZ2VuZXJhdG9yKSB8IFNDT1BFX1NVUEVSIHwgKGFsbG93RGlyZWN0U3VwZXIgPyBTQ09QRV9ESVJFQ1RfU1VQRVIgOiAwKSk7XG5cbiAgdGhpcy5leHBlY3QodHlwZXMkMS5wYXJlbkwpO1xuICBub2RlLnBhcmFtcyA9IHRoaXMucGFyc2VCaW5kaW5nTGlzdCh0eXBlcyQxLnBhcmVuUiwgZmFsc2UsIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4KTtcbiAgdGhpcy5jaGVja1lpZWxkQXdhaXRJbkRlZmF1bHRQYXJhbXMoKTtcbiAgdGhpcy5wYXJzZUZ1bmN0aW9uQm9keShub2RlLCBmYWxzZSwgdHJ1ZSwgZmFsc2UpO1xuXG4gIHRoaXMueWllbGRQb3MgPSBvbGRZaWVsZFBvcztcbiAgdGhpcy5hd2FpdFBvcyA9IG9sZEF3YWl0UG9zO1xuICB0aGlzLmF3YWl0SWRlbnRQb3MgPSBvbGRBd2FpdElkZW50UG9zO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRnVuY3Rpb25FeHByZXNzaW9uXCIpXG59O1xuXG4vLyBQYXJzZSBhcnJvdyBmdW5jdGlvbiBleHByZXNzaW9uIHdpdGggZ2l2ZW4gcGFyYW1ldGVycy5cblxucHAkNS5wYXJzZUFycm93RXhwcmVzc2lvbiA9IGZ1bmN0aW9uKG5vZGUsIHBhcmFtcywgaXNBc3luYywgZm9ySW5pdCkge1xuICB2YXIgb2xkWWllbGRQb3MgPSB0aGlzLnlpZWxkUG9zLCBvbGRBd2FpdFBvcyA9IHRoaXMuYXdhaXRQb3MsIG9sZEF3YWl0SWRlbnRQb3MgPSB0aGlzLmF3YWl0SWRlbnRQb3M7XG5cbiAgdGhpcy5lbnRlclNjb3BlKGZ1bmN0aW9uRmxhZ3MoaXNBc3luYywgZmFsc2UpIHwgU0NPUEVfQVJST1cpO1xuICB0aGlzLmluaXRGdW5jdGlvbihub2RlKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4KSB7IG5vZGUuYXN5bmMgPSAhIWlzQXN5bmM7IH1cblxuICB0aGlzLnlpZWxkUG9zID0gMDtcbiAgdGhpcy5hd2FpdFBvcyA9IDA7XG4gIHRoaXMuYXdhaXRJZGVudFBvcyA9IDA7XG5cbiAgbm9kZS5wYXJhbXMgPSB0aGlzLnRvQXNzaWduYWJsZUxpc3QocGFyYW1zLCB0cnVlKTtcbiAgdGhpcy5wYXJzZUZ1bmN0aW9uQm9keShub2RlLCB0cnVlLCBmYWxzZSwgZm9ySW5pdCk7XG5cbiAgdGhpcy55aWVsZFBvcyA9IG9sZFlpZWxkUG9zO1xuICB0aGlzLmF3YWl0UG9zID0gb2xkQXdhaXRQb3M7XG4gIHRoaXMuYXdhaXRJZGVudFBvcyA9IG9sZEF3YWl0SWRlbnRQb3M7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvblwiKVxufTtcblxuLy8gUGFyc2UgZnVuY3Rpb24gYm9keSBhbmQgY2hlY2sgcGFyYW1ldGVycy5cblxucHAkNS5wYXJzZUZ1bmN0aW9uQm9keSA9IGZ1bmN0aW9uKG5vZGUsIGlzQXJyb3dGdW5jdGlvbiwgaXNNZXRob2QsIGZvckluaXQpIHtcbiAgdmFyIGlzRXhwcmVzc2lvbiA9IGlzQXJyb3dGdW5jdGlvbiAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEuYnJhY2VMO1xuICB2YXIgb2xkU3RyaWN0ID0gdGhpcy5zdHJpY3QsIHVzZVN0cmljdCA9IGZhbHNlO1xuXG4gIGlmIChpc0V4cHJlc3Npb24pIHtcbiAgICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZm9ySW5pdCk7XG4gICAgbm9kZS5leHByZXNzaW9uID0gdHJ1ZTtcbiAgICB0aGlzLmNoZWNrUGFyYW1zKG5vZGUsIGZhbHNlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbm9uU2ltcGxlID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDcgJiYgIXRoaXMuaXNTaW1wbGVQYXJhbUxpc3Qobm9kZS5wYXJhbXMpO1xuICAgIGlmICghb2xkU3RyaWN0IHx8IG5vblNpbXBsZSkge1xuICAgICAgdXNlU3RyaWN0ID0gdGhpcy5zdHJpY3REaXJlY3RpdmUodGhpcy5lbmQpO1xuICAgICAgLy8gSWYgdGhpcyBpcyBhIHN0cmljdCBtb2RlIGZ1bmN0aW9uLCB2ZXJpZnkgdGhhdCBhcmd1bWVudCBuYW1lc1xuICAgICAgLy8gYXJlIG5vdCByZXBlYXRlZCwgYW5kIGl0IGRvZXMgbm90IHRyeSB0byBiaW5kIHRoZSB3b3JkcyBgZXZhbGBcbiAgICAgIC8vIG9yIGBhcmd1bWVudHNgLlxuICAgICAgaWYgKHVzZVN0cmljdCAmJiBub25TaW1wbGUpXG4gICAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiSWxsZWdhbCAndXNlIHN0cmljdCcgZGlyZWN0aXZlIGluIGZ1bmN0aW9uIHdpdGggbm9uLXNpbXBsZSBwYXJhbWV0ZXIgbGlzdFwiKTsgfVxuICAgIH1cbiAgICAvLyBTdGFydCBhIG5ldyBzY29wZSB3aXRoIHJlZ2FyZCB0byBsYWJlbHMgYW5kIHRoZSBgaW5GdW5jdGlvbmBcbiAgICAvLyBmbGFnIChyZXN0b3JlIHRoZW0gdG8gdGhlaXIgb2xkIHZhbHVlIGFmdGVyd2FyZHMpLlxuICAgIHZhciBvbGRMYWJlbHMgPSB0aGlzLmxhYmVscztcbiAgICB0aGlzLmxhYmVscyA9IFtdO1xuICAgIGlmICh1c2VTdHJpY3QpIHsgdGhpcy5zdHJpY3QgPSB0cnVlOyB9XG5cbiAgICAvLyBBZGQgdGhlIHBhcmFtcyB0byB2YXJEZWNsYXJlZE5hbWVzIHRvIGVuc3VyZSB0aGF0IGFuIGVycm9yIGlzIHRocm93blxuICAgIC8vIGlmIGEgbGV0L2NvbnN0IGRlY2xhcmF0aW9uIGluIHRoZSBmdW5jdGlvbiBjbGFzaGVzIHdpdGggb25lIG9mIHRoZSBwYXJhbXMuXG4gICAgdGhpcy5jaGVja1BhcmFtcyhub2RlLCAhb2xkU3RyaWN0ICYmICF1c2VTdHJpY3QgJiYgIWlzQXJyb3dGdW5jdGlvbiAmJiAhaXNNZXRob2QgJiYgdGhpcy5pc1NpbXBsZVBhcmFtTGlzdChub2RlLnBhcmFtcykpO1xuICAgIC8vIEVuc3VyZSB0aGUgZnVuY3Rpb24gbmFtZSBpc24ndCBhIGZvcmJpZGRlbiBpZGVudGlmaWVyIGluIHN0cmljdCBtb2RlLCBlLmcuICdldmFsJ1xuICAgIGlmICh0aGlzLnN0cmljdCAmJiBub2RlLmlkKSB7IHRoaXMuY2hlY2tMVmFsU2ltcGxlKG5vZGUuaWQsIEJJTkRfT1VUU0lERSk7IH1cbiAgICBub2RlLmJvZHkgPSB0aGlzLnBhcnNlQmxvY2soZmFsc2UsIHVuZGVmaW5lZCwgdXNlU3RyaWN0ICYmICFvbGRTdHJpY3QpO1xuICAgIG5vZGUuZXhwcmVzc2lvbiA9IGZhbHNlO1xuICAgIHRoaXMuYWRhcHREaXJlY3RpdmVQcm9sb2d1ZShub2RlLmJvZHkuYm9keSk7XG4gICAgdGhpcy5sYWJlbHMgPSBvbGRMYWJlbHM7XG4gIH1cbiAgdGhpcy5leGl0U2NvcGUoKTtcbn07XG5cbnBwJDUuaXNTaW1wbGVQYXJhbUxpc3QgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBwYXJhbXM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKVxuICAgIHtcbiAgICB2YXIgcGFyYW0gPSBsaXN0W2ldO1xuXG4gICAgaWYgKHBhcmFtLnR5cGUgIT09IFwiSWRlbnRpZmllclwiKSB7IHJldHVybiBmYWxzZVxuICB9IH1cbiAgcmV0dXJuIHRydWVcbn07XG5cbi8vIENoZWNrcyBmdW5jdGlvbiBwYXJhbXMgZm9yIHZhcmlvdXMgZGlzYWxsb3dlZCBwYXR0ZXJucyBzdWNoIGFzIHVzaW5nIFwiZXZhbFwiXG4vLyBvciBcImFyZ3VtZW50c1wiIGFuZCBkdXBsaWNhdGUgcGFyYW1ldGVycy5cblxucHAkNS5jaGVja1BhcmFtcyA9IGZ1bmN0aW9uKG5vZGUsIGFsbG93RHVwbGljYXRlcykge1xuICB2YXIgbmFtZUhhc2ggPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IG5vZGUucGFyYW1zOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSlcbiAgICB7XG4gICAgdmFyIHBhcmFtID0gbGlzdFtpXTtcblxuICAgIHRoaXMuY2hlY2tMVmFsSW5uZXJQYXR0ZXJuKHBhcmFtLCBCSU5EX1ZBUiwgYWxsb3dEdXBsaWNhdGVzID8gbnVsbCA6IG5hbWVIYXNoKTtcbiAgfVxufTtcblxuLy8gUGFyc2VzIGEgY29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgZXhwcmVzc2lvbnMsIGFuZCByZXR1cm5zIHRoZW0gYXNcbi8vIGFuIGFycmF5LiBgY2xvc2VgIGlzIHRoZSB0b2tlbiB0eXBlIHRoYXQgZW5kcyB0aGUgbGlzdCwgYW5kXG4vLyBgYWxsb3dFbXB0eWAgY2FuIGJlIHR1cm5lZCBvbiB0byBhbGxvdyBzdWJzZXF1ZW50IGNvbW1hcyB3aXRoXG4vLyBub3RoaW5nIGluIGJldHdlZW4gdGhlbSB0byBiZSBwYXJzZWQgYXMgYG51bGxgICh3aGljaCBpcyBuZWVkZWRcbi8vIGZvciBhcnJheSBsaXRlcmFscykuXG5cbnBwJDUucGFyc2VFeHByTGlzdCA9IGZ1bmN0aW9uKGNsb3NlLCBhbGxvd1RyYWlsaW5nQ29tbWEsIGFsbG93RW1wdHksIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgdmFyIGVsdHMgPSBbXSwgZmlyc3QgPSB0cnVlO1xuICB3aGlsZSAoIXRoaXMuZWF0KGNsb3NlKSkge1xuICAgIGlmICghZmlyc3QpIHtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgaWYgKGFsbG93VHJhaWxpbmdDb21tYSAmJiB0aGlzLmFmdGVyVHJhaWxpbmdDb21tYShjbG9zZSkpIHsgYnJlYWsgfVxuICAgIH0gZWxzZSB7IGZpcnN0ID0gZmFsc2U7IH1cblxuICAgIHZhciBlbHQgPSAodm9pZCAwKTtcbiAgICBpZiAoYWxsb3dFbXB0eSAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEpXG4gICAgICB7IGVsdCA9IG51bGw7IH1cbiAgICBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZWxsaXBzaXMpIHtcbiAgICAgIGVsdCA9IHRoaXMucGFyc2VTcHJlYWQocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEgJiYgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hIDwgMClcbiAgICAgICAgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPSB0aGlzLnN0YXJ0OyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsdCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbihmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgfVxuICAgIGVsdHMucHVzaChlbHQpO1xuICB9XG4gIHJldHVybiBlbHRzXG59O1xuXG5wcCQ1LmNoZWNrVW5yZXNlcnZlZCA9IGZ1bmN0aW9uKHJlZikge1xuICB2YXIgc3RhcnQgPSByZWYuc3RhcnQ7XG4gIHZhciBlbmQgPSByZWYuZW5kO1xuICB2YXIgbmFtZSA9IHJlZi5uYW1lO1xuXG4gIGlmICh0aGlzLmluR2VuZXJhdG9yICYmIG5hbWUgPT09IFwieWllbGRcIilcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShzdGFydCwgXCJDYW5ub3QgdXNlICd5aWVsZCcgYXMgaWRlbnRpZmllciBpbnNpZGUgYSBnZW5lcmF0b3JcIik7IH1cbiAgaWYgKHRoaXMuaW5Bc3luYyAmJiBuYW1lID09PSBcImF3YWl0XCIpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoc3RhcnQsIFwiQ2Fubm90IHVzZSAnYXdhaXQnIGFzIGlkZW50aWZpZXIgaW5zaWRlIGFuIGFzeW5jIGZ1bmN0aW9uXCIpOyB9XG4gIGlmICghKHRoaXMuY3VycmVudFRoaXNTY29wZSgpLmZsYWdzICYgU0NPUEVfVkFSKSAmJiBuYW1lID09PSBcImFyZ3VtZW50c1wiKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHN0YXJ0LCBcIkNhbm5vdCB1c2UgJ2FyZ3VtZW50cycgaW4gY2xhc3MgZmllbGQgaW5pdGlhbGl6ZXJcIik7IH1cbiAgaWYgKHRoaXMuaW5DbGFzc1N0YXRpY0Jsb2NrICYmIChuYW1lID09PSBcImFyZ3VtZW50c1wiIHx8IG5hbWUgPT09IFwiYXdhaXRcIikpXG4gICAgeyB0aGlzLnJhaXNlKHN0YXJ0LCAoXCJDYW5ub3QgdXNlIFwiICsgbmFtZSArIFwiIGluIGNsYXNzIHN0YXRpYyBpbml0aWFsaXphdGlvbiBibG9ja1wiKSk7IH1cbiAgaWYgKHRoaXMua2V5d29yZHMudGVzdChuYW1lKSlcbiAgICB7IHRoaXMucmFpc2Uoc3RhcnQsIChcIlVuZXhwZWN0ZWQga2V5d29yZCAnXCIgKyBuYW1lICsgXCInXCIpKTsgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgNiAmJlxuICAgIHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQsIGVuZCkuaW5kZXhPZihcIlxcXFxcIikgIT09IC0xKSB7IHJldHVybiB9XG4gIHZhciByZSA9IHRoaXMuc3RyaWN0ID8gdGhpcy5yZXNlcnZlZFdvcmRzU3RyaWN0IDogdGhpcy5yZXNlcnZlZFdvcmRzO1xuICBpZiAocmUudGVzdChuYW1lKSkge1xuICAgIGlmICghdGhpcy5pbkFzeW5jICYmIG5hbWUgPT09IFwiYXdhaXRcIilcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHN0YXJ0LCBcIkNhbm5vdCB1c2Uga2V5d29yZCAnYXdhaXQnIG91dHNpZGUgYW4gYXN5bmMgZnVuY3Rpb25cIik7IH1cbiAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoc3RhcnQsIChcIlRoZSBrZXl3b3JkICdcIiArIG5hbWUgKyBcIicgaXMgcmVzZXJ2ZWRcIikpO1xuICB9XG59O1xuXG4vLyBQYXJzZSB0aGUgbmV4dCB0b2tlbiBhcyBhbiBpZGVudGlmaWVyLiBJZiBgbGliZXJhbGAgaXMgdHJ1ZSAodXNlZFxuLy8gd2hlbiBwYXJzaW5nIHByb3BlcnRpZXMpLCBpdCB3aWxsIGFsc28gY29udmVydCBrZXl3b3JkcyBpbnRvXG4vLyBpZGVudGlmaWVycy5cblxucHAkNS5wYXJzZUlkZW50ID0gZnVuY3Rpb24obGliZXJhbCkge1xuICB2YXIgbm9kZSA9IHRoaXMucGFyc2VJZGVudE5vZGUoKTtcbiAgdGhpcy5uZXh0KCEhbGliZXJhbCk7XG4gIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIklkZW50aWZpZXJcIik7XG4gIGlmICghbGliZXJhbCkge1xuICAgIHRoaXMuY2hlY2tVbnJlc2VydmVkKG5vZGUpO1xuICAgIGlmIChub2RlLm5hbWUgPT09IFwiYXdhaXRcIiAmJiAhdGhpcy5hd2FpdElkZW50UG9zKVxuICAgICAgeyB0aGlzLmF3YWl0SWRlbnRQb3MgPSBub2RlLnN0YXJ0OyB9XG4gIH1cbiAgcmV0dXJuIG5vZGVcbn07XG5cbnBwJDUucGFyc2VJZGVudE5vZGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUpIHtcbiAgICBub2RlLm5hbWUgPSB0aGlzLnZhbHVlO1xuICB9IGVsc2UgaWYgKHRoaXMudHlwZS5rZXl3b3JkKSB7XG4gICAgbm9kZS5uYW1lID0gdGhpcy50eXBlLmtleXdvcmQ7XG5cbiAgICAvLyBUbyBmaXggaHR0cHM6Ly9naXRodWIuY29tL2Fjb3JuanMvYWNvcm4vaXNzdWVzLzU3NVxuICAgIC8vIGBjbGFzc2AgYW5kIGBmdW5jdGlvbmAga2V5d29yZHMgcHVzaCBuZXcgY29udGV4dCBpbnRvIHRoaXMuY29udGV4dC5cbiAgICAvLyBCdXQgdGhlcmUgaXMgbm8gY2hhbmNlIHRvIHBvcCB0aGUgY29udGV4dCBpZiB0aGUga2V5d29yZCBpcyBjb25zdW1lZCBhcyBhbiBpZGVudGlmaWVyIHN1Y2ggYXMgYSBwcm9wZXJ0eSBuYW1lLlxuICAgIC8vIElmIHRoZSBwcmV2aW91cyB0b2tlbiBpcyBhIGRvdCwgdGhpcyBkb2VzIG5vdCBhcHBseSBiZWNhdXNlIHRoZSBjb250ZXh0LW1hbmFnaW5nIGNvZGUgYWxyZWFkeSBpZ25vcmVkIHRoZSBrZXl3b3JkXG4gICAgaWYgKChub2RlLm5hbWUgPT09IFwiY2xhc3NcIiB8fCBub2RlLm5hbWUgPT09IFwiZnVuY3Rpb25cIikgJiZcbiAgICAgICh0aGlzLmxhc3RUb2tFbmQgIT09IHRoaXMubGFzdFRva1N0YXJ0ICsgMSB8fCB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5sYXN0VG9rU3RhcnQpICE9PSA0NikpIHtcbiAgICAgIHRoaXMuY29udGV4dC5wb3AoKTtcbiAgICB9XG4gICAgdGhpcy50eXBlID0gdHlwZXMkMS5uYW1lO1xuICB9IGVsc2Uge1xuICAgIHRoaXMudW5leHBlY3RlZCgpO1xuICB9XG4gIHJldHVybiBub2RlXG59O1xuXG5wcCQ1LnBhcnNlUHJpdmF0ZUlkZW50ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wcml2YXRlSWQpIHtcbiAgICBub2RlLm5hbWUgPSB0aGlzLnZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMudW5leHBlY3RlZCgpO1xuICB9XG4gIHRoaXMubmV4dCgpO1xuICB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJQcml2YXRlSWRlbnRpZmllclwiKTtcblxuICAvLyBGb3IgdmFsaWRhdGluZyBleGlzdGVuY2VcbiAgaWYgKHRoaXMub3B0aW9ucy5jaGVja1ByaXZhdGVGaWVsZHMpIHtcbiAgICBpZiAodGhpcy5wcml2YXRlTmFtZVN0YWNrLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5yYWlzZShub2RlLnN0YXJ0LCAoXCJQcml2YXRlIGZpZWxkICcjXCIgKyAobm9kZS5uYW1lKSArIFwiJyBtdXN0IGJlIGRlY2xhcmVkIGluIGFuIGVuY2xvc2luZyBjbGFzc1wiKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHJpdmF0ZU5hbWVTdGFja1t0aGlzLnByaXZhdGVOYW1lU3RhY2subGVuZ3RoIC0gMV0udXNlZC5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBub2RlXG59O1xuXG4vLyBQYXJzZXMgeWllbGQgZXhwcmVzc2lvbiBpbnNpZGUgZ2VuZXJhdG9yLlxuXG5wcCQ1LnBhcnNlWWllbGQgPSBmdW5jdGlvbihmb3JJbml0KSB7XG4gIGlmICghdGhpcy55aWVsZFBvcykgeyB0aGlzLnlpZWxkUG9zID0gdGhpcy5zdGFydDsgfVxuXG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0KCk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuc2VtaSB8fCB0aGlzLmNhbkluc2VydFNlbWljb2xvbigpIHx8ICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuc3RhciAmJiAhdGhpcy50eXBlLnN0YXJ0c0V4cHIpKSB7XG4gICAgbm9kZS5kZWxlZ2F0ZSA9IGZhbHNlO1xuICAgIG5vZGUuYXJndW1lbnQgPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIG5vZGUuZGVsZWdhdGUgPSB0aGlzLmVhdCh0eXBlcyQxLnN0YXIpO1xuICAgIG5vZGUuYXJndW1lbnQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZm9ySW5pdCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIllpZWxkRXhwcmVzc2lvblwiKVxufTtcblxucHAkNS5wYXJzZUF3YWl0ID0gZnVuY3Rpb24oZm9ySW5pdCkge1xuICBpZiAoIXRoaXMuYXdhaXRQb3MpIHsgdGhpcy5hd2FpdFBvcyA9IHRoaXMuc3RhcnQ7IH1cblxuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLmFyZ3VtZW50ID0gdGhpcy5wYXJzZU1heWJlVW5hcnkobnVsbCwgdHJ1ZSwgZmFsc2UsIGZvckluaXQpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQXdhaXRFeHByZXNzaW9uXCIpXG59O1xuXG52YXIgcHAkNCA9IFBhcnNlci5wcm90b3R5cGU7XG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byByYWlzZSBleGNlcHRpb25zIG9uIHBhcnNlIGVycm9ycy4gSXRcbi8vIHRha2VzIGFuIG9mZnNldCBpbnRlZ2VyIChpbnRvIHRoZSBjdXJyZW50IGBpbnB1dGApIHRvIGluZGljYXRlXG4vLyB0aGUgbG9jYXRpb24gb2YgdGhlIGVycm9yLCBhdHRhY2hlcyB0aGUgcG9zaXRpb24gdG8gdGhlIGVuZFxuLy8gb2YgdGhlIGVycm9yIG1lc3NhZ2UsIGFuZCB0aGVuIHJhaXNlcyBhIGBTeW50YXhFcnJvcmAgd2l0aCB0aGF0XG4vLyBtZXNzYWdlLlxuXG5wcCQ0LnJhaXNlID0gZnVuY3Rpb24ocG9zLCBtZXNzYWdlKSB7XG4gIHZhciBsb2MgPSBnZXRMaW5lSW5mbyh0aGlzLmlucHV0LCBwb3MpO1xuICBtZXNzYWdlICs9IFwiIChcIiArIGxvYy5saW5lICsgXCI6XCIgKyBsb2MuY29sdW1uICsgXCIpXCI7XG4gIGlmICh0aGlzLnNvdXJjZUZpbGUpIHtcbiAgICBtZXNzYWdlICs9IFwiIGluIFwiICsgdGhpcy5zb3VyY2VGaWxlO1xuICB9XG4gIHZhciBlcnIgPSBuZXcgU3ludGF4RXJyb3IobWVzc2FnZSk7XG4gIGVyci5wb3MgPSBwb3M7IGVyci5sb2MgPSBsb2M7IGVyci5yYWlzZWRBdCA9IHRoaXMucG9zO1xuICB0aHJvdyBlcnJcbn07XG5cbnBwJDQucmFpc2VSZWNvdmVyYWJsZSA9IHBwJDQucmFpc2U7XG5cbnBwJDQuY3VyUG9zaXRpb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHRoaXMuY3VyTGluZSwgdGhpcy5wb3MgLSB0aGlzLmxpbmVTdGFydClcbiAgfVxufTtcblxudmFyIHBwJDMgPSBQYXJzZXIucHJvdG90eXBlO1xuXG52YXIgU2NvcGUgPSBmdW5jdGlvbiBTY29wZShmbGFncykge1xuICB0aGlzLmZsYWdzID0gZmxhZ3M7XG4gIC8vIEEgbGlzdCBvZiB2YXItZGVjbGFyZWQgbmFtZXMgaW4gdGhlIGN1cnJlbnQgbGV4aWNhbCBzY29wZVxuICB0aGlzLnZhciA9IFtdO1xuICAvLyBBIGxpc3Qgb2YgbGV4aWNhbGx5LWRlY2xhcmVkIG5hbWVzIGluIHRoZSBjdXJyZW50IGxleGljYWwgc2NvcGVcbiAgdGhpcy5sZXhpY2FsID0gW107XG4gIC8vIEEgbGlzdCBvZiBsZXhpY2FsbHktZGVjbGFyZWQgRnVuY3Rpb25EZWNsYXJhdGlvbiBuYW1lcyBpbiB0aGUgY3VycmVudCBsZXhpY2FsIHNjb3BlXG4gIHRoaXMuZnVuY3Rpb25zID0gW107XG59O1xuXG4vLyBUaGUgZnVuY3Rpb25zIGluIHRoaXMgbW9kdWxlIGtlZXAgdHJhY2sgb2YgZGVjbGFyZWQgdmFyaWFibGVzIGluIHRoZSBjdXJyZW50IHNjb3BlIGluIG9yZGVyIHRvIGRldGVjdCBkdXBsaWNhdGUgdmFyaWFibGUgbmFtZXMuXG5cbnBwJDMuZW50ZXJTY29wZSA9IGZ1bmN0aW9uKGZsYWdzKSB7XG4gIHRoaXMuc2NvcGVTdGFjay5wdXNoKG5ldyBTY29wZShmbGFncykpO1xufTtcblxucHAkMy5leGl0U2NvcGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zY29wZVN0YWNrLnBvcCgpO1xufTtcblxuLy8gVGhlIHNwZWMgc2F5czpcbi8vID4gQXQgdGhlIHRvcCBsZXZlbCBvZiBhIGZ1bmN0aW9uLCBvciBzY3JpcHQsIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyBhcmVcbi8vID4gdHJlYXRlZCBsaWtlIHZhciBkZWNsYXJhdGlvbnMgcmF0aGVyIHRoYW4gbGlrZSBsZXhpY2FsIGRlY2xhcmF0aW9ucy5cbnBwJDMudHJlYXRGdW5jdGlvbnNBc1ZhckluU2NvcGUgPSBmdW5jdGlvbihzY29wZSkge1xuICByZXR1cm4gKHNjb3BlLmZsYWdzICYgU0NPUEVfRlVOQ1RJT04pIHx8ICF0aGlzLmluTW9kdWxlICYmIChzY29wZS5mbGFncyAmIFNDT1BFX1RPUClcbn07XG5cbnBwJDMuZGVjbGFyZU5hbWUgPSBmdW5jdGlvbihuYW1lLCBiaW5kaW5nVHlwZSwgcG9zKSB7XG4gIHZhciByZWRlY2xhcmVkID0gZmFsc2U7XG4gIGlmIChiaW5kaW5nVHlwZSA9PT0gQklORF9MRVhJQ0FMKSB7XG4gICAgdmFyIHNjb3BlID0gdGhpcy5jdXJyZW50U2NvcGUoKTtcbiAgICByZWRlY2xhcmVkID0gc2NvcGUubGV4aWNhbC5pbmRleE9mKG5hbWUpID4gLTEgfHwgc2NvcGUuZnVuY3Rpb25zLmluZGV4T2YobmFtZSkgPiAtMSB8fCBzY29wZS52YXIuaW5kZXhPZihuYW1lKSA+IC0xO1xuICAgIHNjb3BlLmxleGljYWwucHVzaChuYW1lKTtcbiAgICBpZiAodGhpcy5pbk1vZHVsZSAmJiAoc2NvcGUuZmxhZ3MgJiBTQ09QRV9UT1ApKVxuICAgICAgeyBkZWxldGUgdGhpcy51bmRlZmluZWRFeHBvcnRzW25hbWVdOyB9XG4gIH0gZWxzZSBpZiAoYmluZGluZ1R5cGUgPT09IEJJTkRfU0lNUExFX0NBVENIKSB7XG4gICAgdmFyIHNjb3BlJDEgPSB0aGlzLmN1cnJlbnRTY29wZSgpO1xuICAgIHNjb3BlJDEubGV4aWNhbC5wdXNoKG5hbWUpO1xuICB9IGVsc2UgaWYgKGJpbmRpbmdUeXBlID09PSBCSU5EX0ZVTkNUSU9OKSB7XG4gICAgdmFyIHNjb3BlJDIgPSB0aGlzLmN1cnJlbnRTY29wZSgpO1xuICAgIGlmICh0aGlzLnRyZWF0RnVuY3Rpb25zQXNWYXIpXG4gICAgICB7IHJlZGVjbGFyZWQgPSBzY29wZSQyLmxleGljYWwuaW5kZXhPZihuYW1lKSA+IC0xOyB9XG4gICAgZWxzZVxuICAgICAgeyByZWRlY2xhcmVkID0gc2NvcGUkMi5sZXhpY2FsLmluZGV4T2YobmFtZSkgPiAtMSB8fCBzY29wZSQyLnZhci5pbmRleE9mKG5hbWUpID4gLTE7IH1cbiAgICBzY29wZSQyLmZ1bmN0aW9ucy5wdXNoKG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSB0aGlzLnNjb3BlU3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBzY29wZSQzID0gdGhpcy5zY29wZVN0YWNrW2ldO1xuICAgICAgaWYgKHNjb3BlJDMubGV4aWNhbC5pbmRleE9mKG5hbWUpID4gLTEgJiYgISgoc2NvcGUkMy5mbGFncyAmIFNDT1BFX1NJTVBMRV9DQVRDSCkgJiYgc2NvcGUkMy5sZXhpY2FsWzBdID09PSBuYW1lKSB8fFxuICAgICAgICAgICF0aGlzLnRyZWF0RnVuY3Rpb25zQXNWYXJJblNjb3BlKHNjb3BlJDMpICYmIHNjb3BlJDMuZnVuY3Rpb25zLmluZGV4T2YobmFtZSkgPiAtMSkge1xuICAgICAgICByZWRlY2xhcmVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIHNjb3BlJDMudmFyLnB1c2gobmFtZSk7XG4gICAgICBpZiAodGhpcy5pbk1vZHVsZSAmJiAoc2NvcGUkMy5mbGFncyAmIFNDT1BFX1RPUCkpXG4gICAgICAgIHsgZGVsZXRlIHRoaXMudW5kZWZpbmVkRXhwb3J0c1tuYW1lXTsgfVxuICAgICAgaWYgKHNjb3BlJDMuZmxhZ3MgJiBTQ09QRV9WQVIpIHsgYnJlYWsgfVxuICAgIH1cbiAgfVxuICBpZiAocmVkZWNsYXJlZCkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUocG9zLCAoXCJJZGVudGlmaWVyICdcIiArIG5hbWUgKyBcIicgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZFwiKSk7IH1cbn07XG5cbnBwJDMuY2hlY2tMb2NhbEV4cG9ydCA9IGZ1bmN0aW9uKGlkKSB7XG4gIC8vIHNjb3BlLmZ1bmN0aW9ucyBtdXN0IGJlIGVtcHR5IGFzIE1vZHVsZSBjb2RlIGlzIGFsd2F5cyBzdHJpY3QuXG4gIGlmICh0aGlzLnNjb3BlU3RhY2tbMF0ubGV4aWNhbC5pbmRleE9mKGlkLm5hbWUpID09PSAtMSAmJlxuICAgICAgdGhpcy5zY29wZVN0YWNrWzBdLnZhci5pbmRleE9mKGlkLm5hbWUpID09PSAtMSkge1xuICAgIHRoaXMudW5kZWZpbmVkRXhwb3J0c1tpZC5uYW1lXSA9IGlkO1xuICB9XG59O1xuXG5wcCQzLmN1cnJlbnRTY29wZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zY29wZVN0YWNrW3RoaXMuc2NvcGVTdGFjay5sZW5ndGggLSAxXVxufTtcblxucHAkMy5jdXJyZW50VmFyU2NvcGUgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IHRoaXMuc2NvcGVTdGFjay5sZW5ndGggLSAxOzsgaS0tKSB7XG4gICAgdmFyIHNjb3BlID0gdGhpcy5zY29wZVN0YWNrW2ldO1xuICAgIGlmIChzY29wZS5mbGFncyAmIChTQ09QRV9WQVIgfCBTQ09QRV9DTEFTU19GSUVMRF9JTklUIHwgU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLKSkgeyByZXR1cm4gc2NvcGUgfVxuICB9XG59O1xuXG4vLyBDb3VsZCBiZSB1c2VmdWwgZm9yIGB0aGlzYCwgYG5ldy50YXJnZXRgLCBgc3VwZXIoKWAsIGBzdXBlci5wcm9wZXJ0eWAsIGFuZCBgc3VwZXJbcHJvcGVydHldYC5cbnBwJDMuY3VycmVudFRoaXNTY29wZSA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBpID0gdGhpcy5zY29wZVN0YWNrLmxlbmd0aCAtIDE7OyBpLS0pIHtcbiAgICB2YXIgc2NvcGUgPSB0aGlzLnNjb3BlU3RhY2tbaV07XG4gICAgaWYgKHNjb3BlLmZsYWdzICYgKFNDT1BFX1ZBUiB8IFNDT1BFX0NMQVNTX0ZJRUxEX0lOSVQgfCBTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0spICYmXG4gICAgICAgICEoc2NvcGUuZmxhZ3MgJiBTQ09QRV9BUlJPVykpIHsgcmV0dXJuIHNjb3BlIH1cbiAgfVxufTtcblxudmFyIE5vZGUgPSBmdW5jdGlvbiBOb2RlKHBhcnNlciwgcG9zLCBsb2MpIHtcbiAgdGhpcy50eXBlID0gXCJcIjtcbiAgdGhpcy5zdGFydCA9IHBvcztcbiAgdGhpcy5lbmQgPSAwO1xuICBpZiAocGFyc2VyLm9wdGlvbnMubG9jYXRpb25zKVxuICAgIHsgdGhpcy5sb2MgPSBuZXcgU291cmNlTG9jYXRpb24ocGFyc2VyLCBsb2MpOyB9XG4gIGlmIChwYXJzZXIub3B0aW9ucy5kaXJlY3RTb3VyY2VGaWxlKVxuICAgIHsgdGhpcy5zb3VyY2VGaWxlID0gcGFyc2VyLm9wdGlvbnMuZGlyZWN0U291cmNlRmlsZTsgfVxuICBpZiAocGFyc2VyLm9wdGlvbnMucmFuZ2VzKVxuICAgIHsgdGhpcy5yYW5nZSA9IFtwb3MsIDBdOyB9XG59O1xuXG4vLyBTdGFydCBhbiBBU1Qgbm9kZSwgYXR0YWNoaW5nIGEgc3RhcnQgb2Zmc2V0LlxuXG52YXIgcHAkMiA9IFBhcnNlci5wcm90b3R5cGU7XG5cbnBwJDIuc3RhcnROb2RlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgTm9kZSh0aGlzLCB0aGlzLnN0YXJ0LCB0aGlzLnN0YXJ0TG9jKVxufTtcblxucHAkMi5zdGFydE5vZGVBdCA9IGZ1bmN0aW9uKHBvcywgbG9jKSB7XG4gIHJldHVybiBuZXcgTm9kZSh0aGlzLCBwb3MsIGxvYylcbn07XG5cbi8vIEZpbmlzaCBhbiBBU1Qgbm9kZSwgYWRkaW5nIGB0eXBlYCBhbmQgYGVuZGAgcHJvcGVydGllcy5cblxuZnVuY3Rpb24gZmluaXNoTm9kZUF0KG5vZGUsIHR5cGUsIHBvcywgbG9jKSB7XG4gIG5vZGUudHlwZSA9IHR5cGU7XG4gIG5vZGUuZW5kID0gcG9zO1xuICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucylcbiAgICB7IG5vZGUubG9jLmVuZCA9IGxvYzsgfVxuICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcylcbiAgICB7IG5vZGUucmFuZ2VbMV0gPSBwb3M7IH1cbiAgcmV0dXJuIG5vZGVcbn1cblxucHAkMi5maW5pc2hOb2RlID0gZnVuY3Rpb24obm9kZSwgdHlwZSkge1xuICByZXR1cm4gZmluaXNoTm9kZUF0LmNhbGwodGhpcywgbm9kZSwgdHlwZSwgdGhpcy5sYXN0VG9rRW5kLCB0aGlzLmxhc3RUb2tFbmRMb2MpXG59O1xuXG4vLyBGaW5pc2ggbm9kZSBhdCBnaXZlbiBwb3NpdGlvblxuXG5wcCQyLmZpbmlzaE5vZGVBdCA9IGZ1bmN0aW9uKG5vZGUsIHR5cGUsIHBvcywgbG9jKSB7XG4gIHJldHVybiBmaW5pc2hOb2RlQXQuY2FsbCh0aGlzLCBub2RlLCB0eXBlLCBwb3MsIGxvYylcbn07XG5cbnBwJDIuY29weU5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gIHZhciBuZXdOb2RlID0gbmV3IE5vZGUodGhpcywgbm9kZS5zdGFydCwgdGhpcy5zdGFydExvYyk7XG4gIGZvciAodmFyIHByb3AgaW4gbm9kZSkgeyBuZXdOb2RlW3Byb3BdID0gbm9kZVtwcm9wXTsgfVxuICByZXR1cm4gbmV3Tm9kZVxufTtcblxuLy8gVGhpcyBmaWxlIHdhcyBnZW5lcmF0ZWQgYnkgXCJiaW4vZ2VuZXJhdGUtdW5pY29kZS1zY3JpcHQtdmFsdWVzLmpzXCIuIERvIG5vdCBtb2RpZnkgbWFudWFsbHkhXG52YXIgc2NyaXB0VmFsdWVzQWRkZWRJblVuaWNvZGUgPSBcIkJlcmYgQmVyaWFfRXJmZSBHYXJhIEdhcmF5IEd1a2ggR3VydW5nX0toZW1hIEhya3QgS2F0YWthbmFfT3JfSGlyYWdhbmEgS2F3aSBLaXJhdF9SYWkgS3JhaSBOYWdfTXVuZGFyaSBOYWdtIE9sX09uYWwgT25hbyBTaWRldGljIFNpZHQgU3VudSBTdW51d2FyIFRhaV9ZbyBUYXlvIFRvZGhyaSBUb2RyIFRvbG9uZ19TaWtpIFRvbHMgVHVsdV9UaWdhbGFyaSBUdXRnIFVua25vd24gWnp6elwiO1xuXG4vLyBUaGlzIGZpbGUgY29udGFpbnMgVW5pY29kZSBwcm9wZXJ0aWVzIGV4dHJhY3RlZCBmcm9tIHRoZSBFQ01BU2NyaXB0IHNwZWNpZmljYXRpb24uXG4vLyBUaGUgbGlzdHMgYXJlIGV4dHJhY3RlZCBsaWtlIHNvOlxuLy8gJCQoJyN0YWJsZS1iaW5hcnktdW5pY29kZS1wcm9wZXJ0aWVzID4gZmlndXJlID4gdGFibGUgPiB0Ym9keSA+IHRyID4gdGQ6bnRoLWNoaWxkKDEpIGNvZGUnKS5tYXAoZWwgPT4gZWwuaW5uZXJUZXh0KVxuXG4vLyAjdGFibGUtYmluYXJ5LXVuaWNvZGUtcHJvcGVydGllc1xudmFyIGVjbWE5QmluYXJ5UHJvcGVydGllcyA9IFwiQVNDSUkgQVNDSUlfSGV4X0RpZ2l0IEFIZXggQWxwaGFiZXRpYyBBbHBoYSBBbnkgQXNzaWduZWQgQmlkaV9Db250cm9sIEJpZGlfQyBCaWRpX01pcnJvcmVkIEJpZGlfTSBDYXNlX0lnbm9yYWJsZSBDSSBDYXNlZCBDaGFuZ2VzX1doZW5fQ2FzZWZvbGRlZCBDV0NGIENoYW5nZXNfV2hlbl9DYXNlbWFwcGVkIENXQ00gQ2hhbmdlc19XaGVuX0xvd2VyY2FzZWQgQ1dMIENoYW5nZXNfV2hlbl9ORktDX0Nhc2Vmb2xkZWQgQ1dLQ0YgQ2hhbmdlc19XaGVuX1RpdGxlY2FzZWQgQ1dUIENoYW5nZXNfV2hlbl9VcHBlcmNhc2VkIENXVSBEYXNoIERlZmF1bHRfSWdub3JhYmxlX0NvZGVfUG9pbnQgREkgRGVwcmVjYXRlZCBEZXAgRGlhY3JpdGljIERpYSBFbW9qaSBFbW9qaV9Db21wb25lbnQgRW1vamlfTW9kaWZpZXIgRW1vamlfTW9kaWZpZXJfQmFzZSBFbW9qaV9QcmVzZW50YXRpb24gRXh0ZW5kZXIgRXh0IEdyYXBoZW1lX0Jhc2UgR3JfQmFzZSBHcmFwaGVtZV9FeHRlbmQgR3JfRXh0IEhleF9EaWdpdCBIZXggSURTX0JpbmFyeV9PcGVyYXRvciBJRFNCIElEU19UcmluYXJ5X09wZXJhdG9yIElEU1QgSURfQ29udGludWUgSURDIElEX1N0YXJ0IElEUyBJZGVvZ3JhcGhpYyBJZGVvIEpvaW5fQ29udHJvbCBKb2luX0MgTG9naWNhbF9PcmRlcl9FeGNlcHRpb24gTE9FIExvd2VyY2FzZSBMb3dlciBNYXRoIE5vbmNoYXJhY3Rlcl9Db2RlX1BvaW50IE5DaGFyIFBhdHRlcm5fU3ludGF4IFBhdF9TeW4gUGF0dGVybl9XaGl0ZV9TcGFjZSBQYXRfV1MgUXVvdGF0aW9uX01hcmsgUU1hcmsgUmFkaWNhbCBSZWdpb25hbF9JbmRpY2F0b3IgUkkgU2VudGVuY2VfVGVybWluYWwgU1Rlcm0gU29mdF9Eb3R0ZWQgU0QgVGVybWluYWxfUHVuY3R1YXRpb24gVGVybSBVbmlmaWVkX0lkZW9ncmFwaCBVSWRlbyBVcHBlcmNhc2UgVXBwZXIgVmFyaWF0aW9uX1NlbGVjdG9yIFZTIFdoaXRlX1NwYWNlIHNwYWNlIFhJRF9Db250aW51ZSBYSURDIFhJRF9TdGFydCBYSURTXCI7XG52YXIgZWNtYTEwQmluYXJ5UHJvcGVydGllcyA9IGVjbWE5QmluYXJ5UHJvcGVydGllcyArIFwiIEV4dGVuZGVkX1BpY3RvZ3JhcGhpY1wiO1xudmFyIGVjbWExMUJpbmFyeVByb3BlcnRpZXMgPSBlY21hMTBCaW5hcnlQcm9wZXJ0aWVzO1xudmFyIGVjbWExMkJpbmFyeVByb3BlcnRpZXMgPSBlY21hMTFCaW5hcnlQcm9wZXJ0aWVzICsgXCIgRUJhc2UgRUNvbXAgRU1vZCBFUHJlcyBFeHRQaWN0XCI7XG52YXIgZWNtYTEzQmluYXJ5UHJvcGVydGllcyA9IGVjbWExMkJpbmFyeVByb3BlcnRpZXM7XG52YXIgZWNtYTE0QmluYXJ5UHJvcGVydGllcyA9IGVjbWExM0JpbmFyeVByb3BlcnRpZXM7XG5cbnZhciB1bmljb2RlQmluYXJ5UHJvcGVydGllcyA9IHtcbiAgOTogZWNtYTlCaW5hcnlQcm9wZXJ0aWVzLFxuICAxMDogZWNtYTEwQmluYXJ5UHJvcGVydGllcyxcbiAgMTE6IGVjbWExMUJpbmFyeVByb3BlcnRpZXMsXG4gIDEyOiBlY21hMTJCaW5hcnlQcm9wZXJ0aWVzLFxuICAxMzogZWNtYTEzQmluYXJ5UHJvcGVydGllcyxcbiAgMTQ6IGVjbWExNEJpbmFyeVByb3BlcnRpZXNcbn07XG5cbi8vICN0YWJsZS1iaW5hcnktdW5pY29kZS1wcm9wZXJ0aWVzLW9mLXN0cmluZ3NcbnZhciBlY21hMTRCaW5hcnlQcm9wZXJ0aWVzT2ZTdHJpbmdzID0gXCJCYXNpY19FbW9qaSBFbW9qaV9LZXljYXBfU2VxdWVuY2UgUkdJX0Vtb2ppX01vZGlmaWVyX1NlcXVlbmNlIFJHSV9FbW9qaV9GbGFnX1NlcXVlbmNlIFJHSV9FbW9qaV9UYWdfU2VxdWVuY2UgUkdJX0Vtb2ppX1pXSl9TZXF1ZW5jZSBSR0lfRW1vamlcIjtcblxudmFyIHVuaWNvZGVCaW5hcnlQcm9wZXJ0aWVzT2ZTdHJpbmdzID0ge1xuICA5OiBcIlwiLFxuICAxMDogXCJcIixcbiAgMTE6IFwiXCIsXG4gIDEyOiBcIlwiLFxuICAxMzogXCJcIixcbiAgMTQ6IGVjbWExNEJpbmFyeVByb3BlcnRpZXNPZlN0cmluZ3Ncbn07XG5cbi8vICN0YWJsZS11bmljb2RlLWdlbmVyYWwtY2F0ZWdvcnktdmFsdWVzXG52YXIgdW5pY29kZUdlbmVyYWxDYXRlZ29yeVZhbHVlcyA9IFwiQ2FzZWRfTGV0dGVyIExDIENsb3NlX1B1bmN0dWF0aW9uIFBlIENvbm5lY3Rvcl9QdW5jdHVhdGlvbiBQYyBDb250cm9sIENjIGNudHJsIEN1cnJlbmN5X1N5bWJvbCBTYyBEYXNoX1B1bmN0dWF0aW9uIFBkIERlY2ltYWxfTnVtYmVyIE5kIGRpZ2l0IEVuY2xvc2luZ19NYXJrIE1lIEZpbmFsX1B1bmN0dWF0aW9uIFBmIEZvcm1hdCBDZiBJbml0aWFsX1B1bmN0dWF0aW9uIFBpIExldHRlciBMIExldHRlcl9OdW1iZXIgTmwgTGluZV9TZXBhcmF0b3IgWmwgTG93ZXJjYXNlX0xldHRlciBMbCBNYXJrIE0gQ29tYmluaW5nX01hcmsgTWF0aF9TeW1ib2wgU20gTW9kaWZpZXJfTGV0dGVyIExtIE1vZGlmaWVyX1N5bWJvbCBTayBOb25zcGFjaW5nX01hcmsgTW4gTnVtYmVyIE4gT3Blbl9QdW5jdHVhdGlvbiBQcyBPdGhlciBDIE90aGVyX0xldHRlciBMbyBPdGhlcl9OdW1iZXIgTm8gT3RoZXJfUHVuY3R1YXRpb24gUG8gT3RoZXJfU3ltYm9sIFNvIFBhcmFncmFwaF9TZXBhcmF0b3IgWnAgUHJpdmF0ZV9Vc2UgQ28gUHVuY3R1YXRpb24gUCBwdW5jdCBTZXBhcmF0b3IgWiBTcGFjZV9TZXBhcmF0b3IgWnMgU3BhY2luZ19NYXJrIE1jIFN1cnJvZ2F0ZSBDcyBTeW1ib2wgUyBUaXRsZWNhc2VfTGV0dGVyIEx0IFVuYXNzaWduZWQgQ24gVXBwZXJjYXNlX0xldHRlciBMdVwiO1xuXG4vLyAjdGFibGUtdW5pY29kZS1zY3JpcHQtdmFsdWVzXG52YXIgZWNtYTlTY3JpcHRWYWx1ZXMgPSBcIkFkbGFtIEFkbG0gQWhvbSBBbmF0b2xpYW5fSGllcm9nbHlwaHMgSGx1dyBBcmFiaWMgQXJhYiBBcm1lbmlhbiBBcm1uIEF2ZXN0YW4gQXZzdCBCYWxpbmVzZSBCYWxpIEJhbXVtIEJhbXUgQmFzc2FfVmFoIEJhc3MgQmF0YWsgQmF0ayBCZW5nYWxpIEJlbmcgQmhhaWtzdWtpIEJoa3MgQm9wb21vZm8gQm9wbyBCcmFobWkgQnJhaCBCcmFpbGxlIEJyYWkgQnVnaW5lc2UgQnVnaSBCdWhpZCBCdWhkIENhbmFkaWFuX0Fib3JpZ2luYWwgQ2FucyBDYXJpYW4gQ2FyaSBDYXVjYXNpYW5fQWxiYW5pYW4gQWdoYiBDaGFrbWEgQ2FrbSBDaGFtIENoYW0gQ2hlcm9rZWUgQ2hlciBDb21tb24gWnl5eSBDb3B0aWMgQ29wdCBRYWFjIEN1bmVpZm9ybSBYc3V4IEN5cHJpb3QgQ3BydCBDeXJpbGxpYyBDeXJsIERlc2VyZXQgRHNydCBEZXZhbmFnYXJpIERldmEgRHVwbG95YW4gRHVwbCBFZ3lwdGlhbl9IaWVyb2dseXBocyBFZ3lwIEVsYmFzYW4gRWxiYSBFdGhpb3BpYyBFdGhpIEdlb3JnaWFuIEdlb3IgR2xhZ29saXRpYyBHbGFnIEdvdGhpYyBHb3RoIEdyYW50aGEgR3JhbiBHcmVlayBHcmVrIEd1amFyYXRpIEd1anIgR3VybXVraGkgR3VydSBIYW4gSGFuaSBIYW5ndWwgSGFuZyBIYW51bm9vIEhhbm8gSGF0cmFuIEhhdHIgSGVicmV3IEhlYnIgSGlyYWdhbmEgSGlyYSBJbXBlcmlhbF9BcmFtYWljIEFybWkgSW5oZXJpdGVkIFppbmggUWFhaSBJbnNjcmlwdGlvbmFsX1BhaGxhdmkgUGhsaSBJbnNjcmlwdGlvbmFsX1BhcnRoaWFuIFBydGkgSmF2YW5lc2UgSmF2YSBLYWl0aGkgS3RoaSBLYW5uYWRhIEtuZGEgS2F0YWthbmEgS2FuYSBLYXlhaF9MaSBLYWxpIEtoYXJvc2h0aGkgS2hhciBLaG1lciBLaG1yIEtob2praSBLaG9qIEtodWRhd2FkaSBTaW5kIExhbyBMYW9vIExhdGluIExhdG4gTGVwY2hhIExlcGMgTGltYnUgTGltYiBMaW5lYXJfQSBMaW5hIExpbmVhcl9CIExpbmIgTGlzdSBMaXN1IEx5Y2lhbiBMeWNpIEx5ZGlhbiBMeWRpIE1haGFqYW5pIE1haGogTWFsYXlhbGFtIE1seW0gTWFuZGFpYyBNYW5kIE1hbmljaGFlYW4gTWFuaSBNYXJjaGVuIE1hcmMgTWFzYXJhbV9Hb25kaSBHb25tIE1lZXRlaV9NYXllayBNdGVpIE1lbmRlX0tpa2FrdWkgTWVuZCBNZXJvaXRpY19DdXJzaXZlIE1lcmMgTWVyb2l0aWNfSGllcm9nbHlwaHMgTWVybyBNaWFvIFBscmQgTW9kaSBNb25nb2xpYW4gTW9uZyBNcm8gTXJvbyBNdWx0YW5pIE11bHQgTXlhbm1hciBNeW1yIE5hYmF0YWVhbiBOYmF0IE5ld19UYWlfTHVlIFRhbHUgTmV3YSBOZXdhIE5rbyBOa29vIE51c2h1IE5zaHUgT2doYW0gT2dhbSBPbF9DaGlraSBPbGNrIE9sZF9IdW5nYXJpYW4gSHVuZyBPbGRfSXRhbGljIEl0YWwgT2xkX05vcnRoX0FyYWJpYW4gTmFyYiBPbGRfUGVybWljIFBlcm0gT2xkX1BlcnNpYW4gWHBlbyBPbGRfU291dGhfQXJhYmlhbiBTYXJiIE9sZF9UdXJraWMgT3JraCBPcml5YSBPcnlhIE9zYWdlIE9zZ2UgT3NtYW55YSBPc21hIFBhaGF3aF9IbW9uZyBIbW5nIFBhbG15cmVuZSBQYWxtIFBhdV9DaW5fSGF1IFBhdWMgUGhhZ3NfUGEgUGhhZyBQaG9lbmljaWFuIFBobnggUHNhbHRlcl9QYWhsYXZpIFBobHAgUmVqYW5nIFJqbmcgUnVuaWMgUnVuciBTYW1hcml0YW4gU2FtciBTYXVyYXNodHJhIFNhdXIgU2hhcmFkYSBTaHJkIFNoYXZpYW4gU2hhdyBTaWRkaGFtIFNpZGQgU2lnbldyaXRpbmcgU2dudyBTaW5oYWxhIFNpbmggU29yYV9Tb21wZW5nIFNvcmEgU295b21ibyBTb3lvIFN1bmRhbmVzZSBTdW5kIFN5bG90aV9OYWdyaSBTeWxvIFN5cmlhYyBTeXJjIFRhZ2Fsb2cgVGdsZyBUYWdiYW53YSBUYWdiIFRhaV9MZSBUYWxlIFRhaV9UaGFtIExhbmEgVGFpX1ZpZXQgVGF2dCBUYWtyaSBUYWtyIFRhbWlsIFRhbWwgVGFuZ3V0IFRhbmcgVGVsdWd1IFRlbHUgVGhhYW5hIFRoYWEgVGhhaSBUaGFpIFRpYmV0YW4gVGlidCBUaWZpbmFnaCBUZm5nIFRpcmh1dGEgVGlyaCBVZ2FyaXRpYyBVZ2FyIFZhaSBWYWlpIFdhcmFuZ19DaXRpIFdhcmEgWWkgWWlpaSBaYW5hYmF6YXJfU3F1YXJlIFphbmJcIjtcbnZhciBlY21hMTBTY3JpcHRWYWx1ZXMgPSBlY21hOVNjcmlwdFZhbHVlcyArIFwiIERvZ3JhIERvZ3IgR3VuamFsYV9Hb25kaSBHb25nIEhhbmlmaV9Sb2hpbmd5YSBSb2hnIE1ha2FzYXIgTWFrYSBNZWRlZmFpZHJpbiBNZWRmIE9sZF9Tb2dkaWFuIFNvZ28gU29nZGlhbiBTb2dkXCI7XG52YXIgZWNtYTExU2NyaXB0VmFsdWVzID0gZWNtYTEwU2NyaXB0VmFsdWVzICsgXCIgRWx5bWFpYyBFbHltIE5hbmRpbmFnYXJpIE5hbmQgTnlpYWtlbmdfUHVhY2h1ZV9IbW9uZyBIbW5wIFdhbmNobyBXY2hvXCI7XG52YXIgZWNtYTEyU2NyaXB0VmFsdWVzID0gZWNtYTExU2NyaXB0VmFsdWVzICsgXCIgQ2hvcmFzbWlhbiBDaHJzIERpYWsgRGl2ZXNfQWt1cnUgS2hpdGFuX1NtYWxsX1NjcmlwdCBLaXRzIFllemkgWWV6aWRpXCI7XG52YXIgZWNtYTEzU2NyaXB0VmFsdWVzID0gZWNtYTEyU2NyaXB0VmFsdWVzICsgXCIgQ3lwcm9fTWlub2FuIENwbW4gT2xkX1V5Z2h1ciBPdWdyIFRhbmdzYSBUbnNhIFRvdG8gVml0aGt1cWkgVml0aFwiO1xudmFyIGVjbWExNFNjcmlwdFZhbHVlcyA9IGVjbWExM1NjcmlwdFZhbHVlcyArIFwiIFwiICsgc2NyaXB0VmFsdWVzQWRkZWRJblVuaWNvZGU7XG5cbnZhciB1bmljb2RlU2NyaXB0VmFsdWVzID0ge1xuICA5OiBlY21hOVNjcmlwdFZhbHVlcyxcbiAgMTA6IGVjbWExMFNjcmlwdFZhbHVlcyxcbiAgMTE6IGVjbWExMVNjcmlwdFZhbHVlcyxcbiAgMTI6IGVjbWExMlNjcmlwdFZhbHVlcyxcbiAgMTM6IGVjbWExM1NjcmlwdFZhbHVlcyxcbiAgMTQ6IGVjbWExNFNjcmlwdFZhbHVlc1xufTtcblxudmFyIGRhdGEgPSB7fTtcbmZ1bmN0aW9uIGJ1aWxkVW5pY29kZURhdGEoZWNtYVZlcnNpb24pIHtcbiAgdmFyIGQgPSBkYXRhW2VjbWFWZXJzaW9uXSA9IHtcbiAgICBiaW5hcnk6IHdvcmRzUmVnZXhwKHVuaWNvZGVCaW5hcnlQcm9wZXJ0aWVzW2VjbWFWZXJzaW9uXSArIFwiIFwiICsgdW5pY29kZUdlbmVyYWxDYXRlZ29yeVZhbHVlcyksXG4gICAgYmluYXJ5T2ZTdHJpbmdzOiB3b3Jkc1JlZ2V4cCh1bmljb2RlQmluYXJ5UHJvcGVydGllc09mU3RyaW5nc1tlY21hVmVyc2lvbl0pLFxuICAgIG5vbkJpbmFyeToge1xuICAgICAgR2VuZXJhbF9DYXRlZ29yeTogd29yZHNSZWdleHAodW5pY29kZUdlbmVyYWxDYXRlZ29yeVZhbHVlcyksXG4gICAgICBTY3JpcHQ6IHdvcmRzUmVnZXhwKHVuaWNvZGVTY3JpcHRWYWx1ZXNbZWNtYVZlcnNpb25dKVxuICAgIH1cbiAgfTtcbiAgZC5ub25CaW5hcnkuU2NyaXB0X0V4dGVuc2lvbnMgPSBkLm5vbkJpbmFyeS5TY3JpcHQ7XG5cbiAgZC5ub25CaW5hcnkuZ2MgPSBkLm5vbkJpbmFyeS5HZW5lcmFsX0NhdGVnb3J5O1xuICBkLm5vbkJpbmFyeS5zYyA9IGQubm9uQmluYXJ5LlNjcmlwdDtcbiAgZC5ub25CaW5hcnkuc2N4ID0gZC5ub25CaW5hcnkuU2NyaXB0X0V4dGVuc2lvbnM7XG59XG5cbmZvciAodmFyIGkgPSAwLCBsaXN0ID0gWzksIDEwLCAxMSwgMTIsIDEzLCAxNF07IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG4gIHZhciBlY21hVmVyc2lvbiA9IGxpc3RbaV07XG5cbiAgYnVpbGRVbmljb2RlRGF0YShlY21hVmVyc2lvbik7XG59XG5cbnZhciBwcCQxID0gUGFyc2VyLnByb3RvdHlwZTtcblxuLy8gVHJhY2sgZGlzanVuY3Rpb24gc3RydWN0dXJlIHRvIGRldGVybWluZSB3aGV0aGVyIGEgZHVwbGljYXRlXG4vLyBjYXB0dXJlIGdyb3VwIG5hbWUgaXMgYWxsb3dlZCBiZWNhdXNlIGl0IGlzIGluIGEgc2VwYXJhdGUgYnJhbmNoLlxudmFyIEJyYW5jaElEID0gZnVuY3Rpb24gQnJhbmNoSUQocGFyZW50LCBiYXNlKSB7XG4gIC8vIFBhcmVudCBkaXNqdW5jdGlvbiBicmFuY2hcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIC8vIElkZW50aWZpZXMgdGhpcyBzZXQgb2Ygc2libGluZyBicmFuY2hlc1xuICB0aGlzLmJhc2UgPSBiYXNlIHx8IHRoaXM7XG59O1xuXG5CcmFuY2hJRC5wcm90b3R5cGUuc2VwYXJhdGVkRnJvbSA9IGZ1bmN0aW9uIHNlcGFyYXRlZEZyb20gKGFsdCkge1xuICAvLyBBIGJyYW5jaCBpcyBzZXBhcmF0ZSBmcm9tIGFub3RoZXIgYnJhbmNoIGlmIHRoZXkgb3IgYW55IG9mXG4gIC8vIHRoZWlyIHBhcmVudHMgYXJlIHNpYmxpbmdzIGluIGEgZ2l2ZW4gZGlzanVuY3Rpb25cbiAgZm9yICh2YXIgc2VsZiA9IHRoaXM7IHNlbGY7IHNlbGYgPSBzZWxmLnBhcmVudCkge1xuICAgIGZvciAodmFyIG90aGVyID0gYWx0OyBvdGhlcjsgb3RoZXIgPSBvdGhlci5wYXJlbnQpIHtcbiAgICAgIGlmIChzZWxmLmJhc2UgPT09IG90aGVyLmJhc2UgJiYgc2VsZiAhPT0gb3RoZXIpIHsgcmV0dXJuIHRydWUgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbkJyYW5jaElELnByb3RvdHlwZS5zaWJsaW5nID0gZnVuY3Rpb24gc2libGluZyAoKSB7XG4gIHJldHVybiBuZXcgQnJhbmNoSUQodGhpcy5wYXJlbnQsIHRoaXMuYmFzZSlcbn07XG5cbnZhciBSZWdFeHBWYWxpZGF0aW9uU3RhdGUgPSBmdW5jdGlvbiBSZWdFeHBWYWxpZGF0aW9uU3RhdGUocGFyc2VyKSB7XG4gIHRoaXMucGFyc2VyID0gcGFyc2VyO1xuICB0aGlzLnZhbGlkRmxhZ3MgPSBcImdpbVwiICsgKHBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgPyBcInV5XCIgOiBcIlwiKSArIChwYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ID8gXCJzXCIgOiBcIlwiKSArIChwYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMyA/IFwiZFwiIDogXCJcIikgKyAocGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTUgPyBcInZcIiA6IFwiXCIpO1xuICB0aGlzLnVuaWNvZGVQcm9wZXJ0aWVzID0gZGF0YVtwYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNCA/IDE0IDogcGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb25dO1xuICB0aGlzLnNvdXJjZSA9IFwiXCI7XG4gIHRoaXMuZmxhZ3MgPSBcIlwiO1xuICB0aGlzLnN0YXJ0ID0gMDtcbiAgdGhpcy5zd2l0Y2hVID0gZmFsc2U7XG4gIHRoaXMuc3dpdGNoViA9IGZhbHNlO1xuICB0aGlzLnN3aXRjaE4gPSBmYWxzZTtcbiAgdGhpcy5wb3MgPSAwO1xuICB0aGlzLmxhc3RJbnRWYWx1ZSA9IDA7XG4gIHRoaXMubGFzdFN0cmluZ1ZhbHVlID0gXCJcIjtcbiAgdGhpcy5sYXN0QXNzZXJ0aW9uSXNRdWFudGlmaWFibGUgPSBmYWxzZTtcbiAgdGhpcy5udW1DYXB0dXJpbmdQYXJlbnMgPSAwO1xuICB0aGlzLm1heEJhY2tSZWZlcmVuY2UgPSAwO1xuICB0aGlzLmdyb3VwTmFtZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB0aGlzLmJhY2tSZWZlcmVuY2VOYW1lcyA9IFtdO1xuICB0aGlzLmJyYW5jaElEID0gbnVsbDtcbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldCAoc3RhcnQsIHBhdHRlcm4sIGZsYWdzKSB7XG4gIHZhciB1bmljb2RlU2V0cyA9IGZsYWdzLmluZGV4T2YoXCJ2XCIpICE9PSAtMTtcbiAgdmFyIHVuaWNvZGUgPSBmbGFncy5pbmRleE9mKFwidVwiKSAhPT0gLTE7XG4gIHRoaXMuc3RhcnQgPSBzdGFydCB8IDA7XG4gIHRoaXMuc291cmNlID0gcGF0dGVybiArIFwiXCI7XG4gIHRoaXMuZmxhZ3MgPSBmbGFncztcbiAgaWYgKHVuaWNvZGVTZXRzICYmIHRoaXMucGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTUpIHtcbiAgICB0aGlzLnN3aXRjaFUgPSB0cnVlO1xuICAgIHRoaXMuc3dpdGNoViA9IHRydWU7XG4gICAgdGhpcy5zd2l0Y2hOID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnN3aXRjaFUgPSB1bmljb2RlICYmIHRoaXMucGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNjtcbiAgICB0aGlzLnN3aXRjaFYgPSBmYWxzZTtcbiAgICB0aGlzLnN3aXRjaE4gPSB1bmljb2RlICYmIHRoaXMucGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOTtcbiAgfVxufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5yYWlzZSA9IGZ1bmN0aW9uIHJhaXNlIChtZXNzYWdlKSB7XG4gIHRoaXMucGFyc2VyLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgKFwiSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb246IC9cIiArICh0aGlzLnNvdXJjZSkgKyBcIi86IFwiICsgbWVzc2FnZSkpO1xufTtcblxuLy8gSWYgdSBmbGFnIGlzIGdpdmVuLCB0aGlzIHJldHVybnMgdGhlIGNvZGUgcG9pbnQgYXQgdGhlIGluZGV4IChpdCBjb21iaW5lcyBhIHN1cnJvZ2F0ZSBwYWlyKS5cbi8vIE90aGVyd2lzZSwgdGhpcyByZXR1cm5zIHRoZSBjb2RlIHVuaXQgb2YgdGhlIGluZGV4IChjYW4gYmUgYSBwYXJ0IG9mIGEgc3Vycm9nYXRlIHBhaXIpLlxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5hdCA9IGZ1bmN0aW9uIGF0IChpLCBmb3JjZVUpIHtcbiAgICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgdmFyIHMgPSB0aGlzLnNvdXJjZTtcbiAgdmFyIGwgPSBzLmxlbmd0aDtcbiAgaWYgKGkgPj0gbCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIHZhciBjID0gcy5jaGFyQ29kZUF0KGkpO1xuICBpZiAoIShmb3JjZVUgfHwgdGhpcy5zd2l0Y2hVKSB8fCBjIDw9IDB4RDdGRiB8fCBjID49IDB4RTAwMCB8fCBpICsgMSA+PSBsKSB7XG4gICAgcmV0dXJuIGNcbiAgfVxuICB2YXIgbmV4dCA9IHMuY2hhckNvZGVBdChpICsgMSk7XG4gIHJldHVybiBuZXh0ID49IDB4REMwMCAmJiBuZXh0IDw9IDB4REZGRiA/IChjIDw8IDEwKSArIG5leHQgLSAweDM1RkRDMDAgOiBjXG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLm5leHRJbmRleCA9IGZ1bmN0aW9uIG5leHRJbmRleCAoaSwgZm9yY2VVKSB7XG4gICAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIHZhciBzID0gdGhpcy5zb3VyY2U7XG4gIHZhciBsID0gcy5sZW5ndGg7XG4gIGlmIChpID49IGwpIHtcbiAgICByZXR1cm4gbFxuICB9XG4gIHZhciBjID0gcy5jaGFyQ29kZUF0KGkpLCBuZXh0O1xuICBpZiAoIShmb3JjZVUgfHwgdGhpcy5zd2l0Y2hVKSB8fCBjIDw9IDB4RDdGRiB8fCBjID49IDB4RTAwMCB8fCBpICsgMSA+PSBsIHx8XG4gICAgICAobmV4dCA9IHMuY2hhckNvZGVBdChpICsgMSkpIDwgMHhEQzAwIHx8IG5leHQgPiAweERGRkYpIHtcbiAgICByZXR1cm4gaSArIDFcbiAgfVxuICByZXR1cm4gaSArIDJcbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUuY3VycmVudCA9IGZ1bmN0aW9uIGN1cnJlbnQgKGZvcmNlVSkge1xuICAgIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICByZXR1cm4gdGhpcy5hdCh0aGlzLnBvcywgZm9yY2VVKVxufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5sb29rYWhlYWQgPSBmdW5jdGlvbiBsb29rYWhlYWQgKGZvcmNlVSkge1xuICAgIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICByZXR1cm4gdGhpcy5hdCh0aGlzLm5leHRJbmRleCh0aGlzLnBvcywgZm9yY2VVKSwgZm9yY2VVKVxufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5hZHZhbmNlID0gZnVuY3Rpb24gYWR2YW5jZSAoZm9yY2VVKSB7XG4gICAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIHRoaXMucG9zID0gdGhpcy5uZXh0SW5kZXgodGhpcy5wb3MsIGZvcmNlVSk7XG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLmVhdCA9IGZ1bmN0aW9uIGVhdCAoY2gsIGZvcmNlVSkge1xuICAgIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICBpZiAodGhpcy5jdXJyZW50KGZvcmNlVSkgPT09IGNoKSB7XG4gICAgdGhpcy5hZHZhbmNlKGZvcmNlVSk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUuZWF0Q2hhcnMgPSBmdW5jdGlvbiBlYXRDaGFycyAoY2hzLCBmb3JjZVUpIHtcbiAgICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgdmFyIHBvcyA9IHRoaXMucG9zO1xuICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IGNoczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgY2ggPSBsaXN0W2ldO1xuXG4gICAgICB2YXIgY3VycmVudCA9IHRoaXMuYXQocG9zLCBmb3JjZVUpO1xuICAgIGlmIChjdXJyZW50ID09PSAtMSB8fCBjdXJyZW50ICE9PSBjaCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHBvcyA9IHRoaXMubmV4dEluZGV4KHBvcywgZm9yY2VVKTtcbiAgfVxuICB0aGlzLnBvcyA9IHBvcztcbiAgcmV0dXJuIHRydWVcbn07XG5cbi8qKlxuICogVmFsaWRhdGUgdGhlIGZsYWdzIHBhcnQgb2YgYSBnaXZlbiBSZWdFeHBMaXRlcmFsLlxuICpcbiAqIEBwYXJhbSB7UmVnRXhwVmFsaWRhdGlvblN0YXRlfSBzdGF0ZSBUaGUgc3RhdGUgdG8gdmFsaWRhdGUgUmVnRXhwLlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbnBwJDEudmFsaWRhdGVSZWdFeHBGbGFncyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciB2YWxpZEZsYWdzID0gc3RhdGUudmFsaWRGbGFncztcbiAgdmFyIGZsYWdzID0gc3RhdGUuZmxhZ3M7XG5cbiAgdmFyIHUgPSBmYWxzZTtcbiAgdmFyIHYgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGZsYWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGZsYWcgPSBmbGFncy5jaGFyQXQoaSk7XG4gICAgaWYgKHZhbGlkRmxhZ3MuaW5kZXhPZihmbGFnKSA9PT0gLTEpIHtcbiAgICAgIHRoaXMucmFpc2Uoc3RhdGUuc3RhcnQsIFwiSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24gZmxhZ1wiKTtcbiAgICB9XG4gICAgaWYgKGZsYWdzLmluZGV4T2YoZmxhZywgaSArIDEpID4gLTEpIHtcbiAgICAgIHRoaXMucmFpc2Uoc3RhdGUuc3RhcnQsIFwiRHVwbGljYXRlIHJlZ3VsYXIgZXhwcmVzc2lvbiBmbGFnXCIpO1xuICAgIH1cbiAgICBpZiAoZmxhZyA9PT0gXCJ1XCIpIHsgdSA9IHRydWU7IH1cbiAgICBpZiAoZmxhZyA9PT0gXCJ2XCIpIHsgdiA9IHRydWU7IH1cbiAgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE1ICYmIHUgJiYgdikge1xuICAgIHRoaXMucmFpc2Uoc3RhdGUuc3RhcnQsIFwiSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24gZmxhZ1wiKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gaGFzUHJvcChvYmopIHtcbiAgZm9yICh2YXIgXyBpbiBvYmopIHsgcmV0dXJuIHRydWUgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSB0aGUgcGF0dGVybiBwYXJ0IG9mIGEgZ2l2ZW4gUmVnRXhwTGl0ZXJhbC5cbiAqXG4gKiBAcGFyYW0ge1JlZ0V4cFZhbGlkYXRpb25TdGF0ZX0gc3RhdGUgVGhlIHN0YXRlIHRvIHZhbGlkYXRlIFJlZ0V4cC5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5wcCQxLnZhbGlkYXRlUmVnRXhwUGF0dGVybiA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHRoaXMucmVnZXhwX3BhdHRlcm4oc3RhdGUpO1xuXG4gIC8vIFRoZSBnb2FsIHN5bWJvbCBmb3IgdGhlIHBhcnNlIGlzIHxQYXR0ZXJuW35VLCB+Tl18LiBJZiB0aGUgcmVzdWx0IG9mXG4gIC8vIHBhcnNpbmcgY29udGFpbnMgYSB8R3JvdXBOYW1lfCwgcmVwYXJzZSB3aXRoIHRoZSBnb2FsIHN5bWJvbFxuICAvLyB8UGF0dGVyblt+VSwgK05dfCBhbmQgdXNlIHRoaXMgcmVzdWx0IGluc3RlYWQuIFRocm93IGEgKlN5bnRheEVycm9yKlxuICAvLyBleGNlcHRpb24gaWYgX1BfIGRpZCBub3QgY29uZm9ybSB0byB0aGUgZ3JhbW1hciwgaWYgYW55IGVsZW1lbnRzIG9mIF9QX1xuICAvLyB3ZXJlIG5vdCBtYXRjaGVkIGJ5IHRoZSBwYXJzZSwgb3IgaWYgYW55IEVhcmx5IEVycm9yIGNvbmRpdGlvbnMgZXhpc3QuXG4gIGlmICghc3RhdGUuc3dpdGNoTiAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSAmJiBoYXNQcm9wKHN0YXRlLmdyb3VwTmFtZXMpKSB7XG4gICAgc3RhdGUuc3dpdGNoTiA9IHRydWU7XG4gICAgdGhpcy5yZWdleHBfcGF0dGVybihzdGF0ZSk7XG4gIH1cbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLVBhdHRlcm5cbnBwJDEucmVnZXhwX3BhdHRlcm4gPSBmdW5jdGlvbihzdGF0ZSkge1xuICBzdGF0ZS5wb3MgPSAwO1xuICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAwO1xuICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgPSBcIlwiO1xuICBzdGF0ZS5sYXN0QXNzZXJ0aW9uSXNRdWFudGlmaWFibGUgPSBmYWxzZTtcbiAgc3RhdGUubnVtQ2FwdHVyaW5nUGFyZW5zID0gMDtcbiAgc3RhdGUubWF4QmFja1JlZmVyZW5jZSA9IDA7XG4gIHN0YXRlLmdyb3VwTmFtZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBzdGF0ZS5iYWNrUmVmZXJlbmNlTmFtZXMubGVuZ3RoID0gMDtcbiAgc3RhdGUuYnJhbmNoSUQgPSBudWxsO1xuXG4gIHRoaXMucmVnZXhwX2Rpc2p1bmN0aW9uKHN0YXRlKTtcblxuICBpZiAoc3RhdGUucG9zICE9PSBzdGF0ZS5zb3VyY2UubGVuZ3RoKSB7XG4gICAgLy8gTWFrZSB0aGUgc2FtZSBtZXNzYWdlcyBhcyBWOC5cbiAgICBpZiAoc3RhdGUuZWF0KDB4MjkgLyogKSAqLykpIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiVW5tYXRjaGVkICcpJ1wiKTtcbiAgICB9XG4gICAgaWYgKHN0YXRlLmVhdCgweDVEIC8qIF0gKi8pIHx8IHN0YXRlLmVhdCgweDdEIC8qIH0gKi8pKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIkxvbmUgcXVhbnRpZmllciBicmFja2V0c1wiKTtcbiAgICB9XG4gIH1cbiAgaWYgKHN0YXRlLm1heEJhY2tSZWZlcmVuY2UgPiBzdGF0ZS5udW1DYXB0dXJpbmdQYXJlbnMpIHtcbiAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgZXNjYXBlXCIpO1xuICB9XG4gIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gc3RhdGUuYmFja1JlZmVyZW5jZU5hbWVzOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBuYW1lID0gbGlzdFtpXTtcblxuICAgIGlmICghc3RhdGUuZ3JvdXBOYW1lc1tuYW1lXSkge1xuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIG5hbWVkIGNhcHR1cmUgcmVmZXJlbmNlZFwiKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLURpc2p1bmN0aW9uXG5wcCQxLnJlZ2V4cF9kaXNqdW5jdGlvbiA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciB0cmFja0Rpc2p1bmN0aW9uID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2O1xuICBpZiAodHJhY2tEaXNqdW5jdGlvbikgeyBzdGF0ZS5icmFuY2hJRCA9IG5ldyBCcmFuY2hJRChzdGF0ZS5icmFuY2hJRCwgbnVsbCk7IH1cbiAgdGhpcy5yZWdleHBfYWx0ZXJuYXRpdmUoc3RhdGUpO1xuICB3aGlsZSAoc3RhdGUuZWF0KDB4N0MgLyogfCAqLykpIHtcbiAgICBpZiAodHJhY2tEaXNqdW5jdGlvbikgeyBzdGF0ZS5icmFuY2hJRCA9IHN0YXRlLmJyYW5jaElELnNpYmxpbmcoKTsgfVxuICAgIHRoaXMucmVnZXhwX2FsdGVybmF0aXZlKHN0YXRlKTtcbiAgfVxuICBpZiAodHJhY2tEaXNqdW5jdGlvbikgeyBzdGF0ZS5icmFuY2hJRCA9IHN0YXRlLmJyYW5jaElELnBhcmVudDsgfVxuXG4gIC8vIE1ha2UgdGhlIHNhbWUgbWVzc2FnZSBhcyBWOC5cbiAgaWYgKHRoaXMucmVnZXhwX2VhdFF1YW50aWZpZXIoc3RhdGUsIHRydWUpKSB7XG4gICAgc3RhdGUucmFpc2UoXCJOb3RoaW5nIHRvIHJlcGVhdFwiKTtcbiAgfVxuICBpZiAoc3RhdGUuZWF0KDB4N0IgLyogeyAqLykpIHtcbiAgICBzdGF0ZS5yYWlzZShcIkxvbmUgcXVhbnRpZmllciBicmFja2V0c1wiKTtcbiAgfVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQWx0ZXJuYXRpdmVcbnBwJDEucmVnZXhwX2FsdGVybmF0aXZlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgd2hpbGUgKHN0YXRlLnBvcyA8IHN0YXRlLnNvdXJjZS5sZW5ndGggJiYgdGhpcy5yZWdleHBfZWF0VGVybShzdGF0ZSkpIHt9XG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItVGVybVxucHAkMS5yZWdleHBfZWF0VGVybSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRBc3NlcnRpb24oc3RhdGUpKSB7XG4gICAgLy8gSGFuZGxlIGBRdWFudGlmaWFibGVBc3NlcnRpb24gUXVhbnRpZmllcmAgYWx0ZXJuYXRpdmUuXG4gICAgLy8gYHN0YXRlLmxhc3RBc3NlcnRpb25Jc1F1YW50aWZpYWJsZWAgaXMgdHJ1ZSBpZiB0aGUgbGFzdCBlYXRlbiBBc3NlcnRpb25cbiAgICAvLyBpcyBhIFF1YW50aWZpYWJsZUFzc2VydGlvbi5cbiAgICBpZiAoc3RhdGUubGFzdEFzc2VydGlvbklzUXVhbnRpZmlhYmxlICYmIHRoaXMucmVnZXhwX2VhdFF1YW50aWZpZXIoc3RhdGUpKSB7XG4gICAgICAvLyBNYWtlIHRoZSBzYW1lIG1lc3NhZ2UgYXMgVjguXG4gICAgICBpZiAoc3RhdGUuc3dpdGNoVSkge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgcXVhbnRpZmllclwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIGlmIChzdGF0ZS5zd2l0Y2hVID8gdGhpcy5yZWdleHBfZWF0QXRvbShzdGF0ZSkgOiB0aGlzLnJlZ2V4cF9lYXRFeHRlbmRlZEF0b20oc3RhdGUpKSB7XG4gICAgdGhpcy5yZWdleHBfZWF0UXVhbnRpZmllcihzdGF0ZSk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUFzc2VydGlvblxucHAkMS5yZWdleHBfZWF0QXNzZXJ0aW9uID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBzdGF0ZS5sYXN0QXNzZXJ0aW9uSXNRdWFudGlmaWFibGUgPSBmYWxzZTtcblxuICAvLyBeLCAkXG4gIGlmIChzdGF0ZS5lYXQoMHg1RSAvKiBeICovKSB8fCBzdGF0ZS5lYXQoMHgyNCAvKiAkICovKSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICAvLyBcXGIgXFxCXG4gIGlmIChzdGF0ZS5lYXQoMHg1QyAvKiBcXCAqLykpIHtcbiAgICBpZiAoc3RhdGUuZWF0KDB4NDIgLyogQiAqLykgfHwgc3RhdGUuZWF0KDB4NjIgLyogYiAqLykpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG5cbiAgLy8gTG9va2FoZWFkIC8gTG9va2JlaGluZFxuICBpZiAoc3RhdGUuZWF0KDB4MjggLyogKCAqLykgJiYgc3RhdGUuZWF0KDB4M0YgLyogPyAqLykpIHtcbiAgICB2YXIgbG9va2JlaGluZCA9IGZhbHNlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSkge1xuICAgICAgbG9va2JlaGluZCA9IHN0YXRlLmVhdCgweDNDIC8qIDwgKi8pO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuZWF0KDB4M0QgLyogPSAqLykgfHwgc3RhdGUuZWF0KDB4MjEgLyogISAqLykpIHtcbiAgICAgIHRoaXMucmVnZXhwX2Rpc2p1bmN0aW9uKHN0YXRlKTtcbiAgICAgIGlmICghc3RhdGUuZWF0KDB4MjkgLyogKSAqLykpIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJVbnRlcm1pbmF0ZWQgZ3JvdXBcIik7XG4gICAgICB9XG4gICAgICBzdGF0ZS5sYXN0QXNzZXJ0aW9uSXNRdWFudGlmaWFibGUgPSAhbG9va2JlaGluZDtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG5cbiAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtUXVhbnRpZmllclxucHAkMS5yZWdleHBfZWF0UXVhbnRpZmllciA9IGZ1bmN0aW9uKHN0YXRlLCBub0Vycm9yKSB7XG4gIGlmICggbm9FcnJvciA9PT0gdm9pZCAwICkgbm9FcnJvciA9IGZhbHNlO1xuXG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRRdWFudGlmaWVyUHJlZml4KHN0YXRlLCBub0Vycm9yKSkge1xuICAgIHN0YXRlLmVhdCgweDNGIC8qID8gKi8pO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1RdWFudGlmaWVyUHJlZml4XG5wcCQxLnJlZ2V4cF9lYXRRdWFudGlmaWVyUHJlZml4ID0gZnVuY3Rpb24oc3RhdGUsIG5vRXJyb3IpIHtcbiAgcmV0dXJuIChcbiAgICBzdGF0ZS5lYXQoMHgyQSAvKiAqICovKSB8fFxuICAgIHN0YXRlLmVhdCgweDJCIC8qICsgKi8pIHx8XG4gICAgc3RhdGUuZWF0KDB4M0YgLyogPyAqLykgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRCcmFjZWRRdWFudGlmaWVyKHN0YXRlLCBub0Vycm9yKVxuICApXG59O1xucHAkMS5yZWdleHBfZWF0QnJhY2VkUXVhbnRpZmllciA9IGZ1bmN0aW9uKHN0YXRlLCBub0Vycm9yKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdCgweDdCIC8qIHsgKi8pKSB7XG4gICAgdmFyIG1pbiA9IDAsIG1heCA9IC0xO1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXREZWNpbWFsRGlnaXRzKHN0YXRlKSkge1xuICAgICAgbWluID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgaWYgKHN0YXRlLmVhdCgweDJDIC8qICwgKi8pICYmIHRoaXMucmVnZXhwX2VhdERlY2ltYWxEaWdpdHMoc3RhdGUpKSB7XG4gICAgICAgIG1heCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0ZS5lYXQoMHg3RCAvKiB9ICovKSkge1xuICAgICAgICAvLyBTeW50YXhFcnJvciBpbiBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jc2VjLXRlcm1cbiAgICAgICAgaWYgKG1heCAhPT0gLTEgJiYgbWF4IDwgbWluICYmICFub0Vycm9yKSB7XG4gICAgICAgICAgc3RhdGUucmFpc2UoXCJudW1iZXJzIG91dCBvZiBvcmRlciBpbiB7fSBxdWFudGlmaWVyXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChzdGF0ZS5zd2l0Y2hVICYmICFub0Vycm9yKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIkluY29tcGxldGUgcXVhbnRpZmllclwiKTtcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1BdG9tXG5wcCQxLnJlZ2V4cF9lYXRBdG9tID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgcmV0dXJuIChcbiAgICB0aGlzLnJlZ2V4cF9lYXRQYXR0ZXJuQ2hhcmFjdGVycyhzdGF0ZSkgfHxcbiAgICBzdGF0ZS5lYXQoMHgyRSAvKiAuICovKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdFJldmVyc2VTb2xpZHVzQXRvbUVzY2FwZShzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJDbGFzcyhzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRVbmNhcHR1cmluZ0dyb3VwKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENhcHR1cmluZ0dyb3VwKHN0YXRlKVxuICApXG59O1xucHAkMS5yZWdleHBfZWF0UmV2ZXJzZVNvbGlkdXNBdG9tRXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0KDB4NUMgLyogXFwgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdEF0b21Fc2NhcGUoc3RhdGUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5wcCQxLnJlZ2V4cF9lYXRVbmNhcHR1cmluZ0dyb3VwID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0KDB4MjggLyogKCAqLykpIHtcbiAgICBpZiAoc3RhdGUuZWF0KDB4M0YgLyogPyAqLykpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTYpIHtcbiAgICAgICAgdmFyIGFkZE1vZGlmaWVycyA9IHRoaXMucmVnZXhwX2VhdE1vZGlmaWVycyhzdGF0ZSk7XG4gICAgICAgIHZhciBoYXNIeXBoZW4gPSBzdGF0ZS5lYXQoMHgyRCAvKiAtICovKTtcbiAgICAgICAgaWYgKGFkZE1vZGlmaWVycyB8fCBoYXNIeXBoZW4pIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFkZE1vZGlmaWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0gYWRkTW9kaWZpZXJzLmNoYXJBdChpKTtcbiAgICAgICAgICAgIGlmIChhZGRNb2RpZmllcnMuaW5kZXhPZihtb2RpZmllciwgaSArIDEpID4gLTEpIHtcbiAgICAgICAgICAgICAgc3RhdGUucmFpc2UoXCJEdXBsaWNhdGUgcmVndWxhciBleHByZXNzaW9uIG1vZGlmaWVyc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGhhc0h5cGhlbikge1xuICAgICAgICAgICAgdmFyIHJlbW92ZU1vZGlmaWVycyA9IHRoaXMucmVnZXhwX2VhdE1vZGlmaWVycyhzdGF0ZSk7XG4gICAgICAgICAgICBpZiAoIWFkZE1vZGlmaWVycyAmJiAhcmVtb3ZlTW9kaWZpZXJzICYmIHN0YXRlLmN1cnJlbnQoKSA9PT0gMHgzQSAvKiA6ICovKSB7XG4gICAgICAgICAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24gbW9kaWZpZXJzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaSQxID0gMDsgaSQxIDwgcmVtb3ZlTW9kaWZpZXJzLmxlbmd0aDsgaSQxKyspIHtcbiAgICAgICAgICAgICAgdmFyIG1vZGlmaWVyJDEgPSByZW1vdmVNb2RpZmllcnMuY2hhckF0KGkkMSk7XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICByZW1vdmVNb2RpZmllcnMuaW5kZXhPZihtb2RpZmllciQxLCBpJDEgKyAxKSA+IC0xIHx8XG4gICAgICAgICAgICAgICAgYWRkTW9kaWZpZXJzLmluZGV4T2YobW9kaWZpZXIkMSkgPiAtMVxuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5yYWlzZShcIkR1cGxpY2F0ZSByZWd1bGFyIGV4cHJlc3Npb24gbW9kaWZpZXJzXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGUuZWF0KDB4M0EgLyogOiAqLykpIHtcbiAgICAgICAgdGhpcy5yZWdleHBfZGlzanVuY3Rpb24oc3RhdGUpO1xuICAgICAgICBpZiAoc3RhdGUuZWF0KDB4MjkgLyogKSAqLykpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiVW50ZXJtaW5hdGVkIGdyb3VwXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5wcCQxLnJlZ2V4cF9lYXRDYXB0dXJpbmdHcm91cCA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5lYXQoMHgyOCAvKiAoICovKSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSkge1xuICAgICAgdGhpcy5yZWdleHBfZ3JvdXBTcGVjaWZpZXIoc3RhdGUpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUuY3VycmVudCgpID09PSAweDNGIC8qID8gKi8pIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBncm91cFwiKTtcbiAgICB9XG4gICAgdGhpcy5yZWdleHBfZGlzanVuY3Rpb24oc3RhdGUpO1xuICAgIGlmIChzdGF0ZS5lYXQoMHgyOSAvKiApICovKSkge1xuICAgICAgc3RhdGUubnVtQ2FwdHVyaW5nUGFyZW5zICs9IDE7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5yYWlzZShcIlVudGVybWluYXRlZCBncm91cFwiKTtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG4vLyBSZWd1bGFyRXhwcmVzc2lvbk1vZGlmaWVycyA6OlxuLy8gICBbZW1wdHldXG4vLyAgIFJlZ3VsYXJFeHByZXNzaW9uTW9kaWZpZXJzIFJlZ3VsYXJFeHByZXNzaW9uTW9kaWZpZXJcbnBwJDEucmVnZXhwX2VhdE1vZGlmaWVycyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBtb2RpZmllcnMgPSBcIlwiO1xuICB2YXIgY2ggPSAwO1xuICB3aGlsZSAoKGNoID0gc3RhdGUuY3VycmVudCgpKSAhPT0gLTEgJiYgaXNSZWd1bGFyRXhwcmVzc2lvbk1vZGlmaWVyKGNoKSkge1xuICAgIG1vZGlmaWVycyArPSBjb2RlUG9pbnRUb1N0cmluZyhjaCk7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICB9XG4gIHJldHVybiBtb2RpZmllcnNcbn07XG4vLyBSZWd1bGFyRXhwcmVzc2lvbk1vZGlmaWVyIDo6IG9uZSBvZlxuLy8gICBgaWAgYG1gIGBzYFxuZnVuY3Rpb24gaXNSZWd1bGFyRXhwcmVzc2lvbk1vZGlmaWVyKGNoKSB7XG4gIHJldHVybiBjaCA9PT0gMHg2OSAvKiBpICovIHx8IGNoID09PSAweDZkIC8qIG0gKi8gfHwgY2ggPT09IDB4NzMgLyogcyAqL1xufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItRXh0ZW5kZWRBdG9tXG5wcCQxLnJlZ2V4cF9lYXRFeHRlbmRlZEF0b20gPSBmdW5jdGlvbihzdGF0ZSkge1xuICByZXR1cm4gKFxuICAgIHN0YXRlLmVhdCgweDJFIC8qIC4gKi8pIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0UmV2ZXJzZVNvbGlkdXNBdG9tRXNjYXBlKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckNsYXNzKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdFVuY2FwdHVyaW5nR3JvdXAoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q2FwdHVyaW5nR3JvdXAoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0SW52YWxpZEJyYWNlZFF1YW50aWZpZXIoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0RXh0ZW5kZWRQYXR0ZXJuQ2hhcmFjdGVyKHN0YXRlKVxuICApXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItSW52YWxpZEJyYWNlZFF1YW50aWZpZXJcbnBwJDEucmVnZXhwX2VhdEludmFsaWRCcmFjZWRRdWFudGlmaWVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHRoaXMucmVnZXhwX2VhdEJyYWNlZFF1YW50aWZpZXIoc3RhdGUsIHRydWUpKSB7XG4gICAgc3RhdGUucmFpc2UoXCJOb3RoaW5nIHRvIHJlcGVhdFwiKTtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLVN5bnRheENoYXJhY3RlclxucHAkMS5yZWdleHBfZWF0U3ludGF4Q2hhcmFjdGVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoaXNTeW50YXhDaGFyYWN0ZXIoY2gpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2g7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuZnVuY3Rpb24gaXNTeW50YXhDaGFyYWN0ZXIoY2gpIHtcbiAgcmV0dXJuIChcbiAgICBjaCA9PT0gMHgyNCAvKiAkICovIHx8XG4gICAgY2ggPj0gMHgyOCAvKiAoICovICYmIGNoIDw9IDB4MkIgLyogKyAqLyB8fFxuICAgIGNoID09PSAweDJFIC8qIC4gKi8gfHxcbiAgICBjaCA9PT0gMHgzRiAvKiA/ICovIHx8XG4gICAgY2ggPj0gMHg1QiAvKiBbICovICYmIGNoIDw9IDB4NUUgLyogXiAqLyB8fFxuICAgIGNoID49IDB4N0IgLyogeyAqLyAmJiBjaCA8PSAweDdEIC8qIH0gKi9cbiAgKVxufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1QYXR0ZXJuQ2hhcmFjdGVyXG4vLyBCdXQgZWF0IGVhZ2VyLlxucHAkMS5yZWdleHBfZWF0UGF0dGVybkNoYXJhY3RlcnMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHZhciBjaCA9IDA7XG4gIHdoaWxlICgoY2ggPSBzdGF0ZS5jdXJyZW50KCkpICE9PSAtMSAmJiAhaXNTeW50YXhDaGFyYWN0ZXIoY2gpKSB7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICB9XG4gIHJldHVybiBzdGF0ZS5wb3MgIT09IHN0YXJ0XG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItRXh0ZW5kZWRQYXR0ZXJuQ2hhcmFjdGVyXG5wcCQxLnJlZ2V4cF9lYXRFeHRlbmRlZFBhdHRlcm5DaGFyYWN0ZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChcbiAgICBjaCAhPT0gLTEgJiZcbiAgICBjaCAhPT0gMHgyNCAvKiAkICovICYmXG4gICAgIShjaCA+PSAweDI4IC8qICggKi8gJiYgY2ggPD0gMHgyQiAvKiArICovKSAmJlxuICAgIGNoICE9PSAweDJFIC8qIC4gKi8gJiZcbiAgICBjaCAhPT0gMHgzRiAvKiA/ICovICYmXG4gICAgY2ggIT09IDB4NUIgLyogWyAqLyAmJlxuICAgIGNoICE9PSAweDVFIC8qIF4gKi8gJiZcbiAgICBjaCAhPT0gMHg3QyAvKiB8ICovXG4gICkge1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gR3JvdXBTcGVjaWZpZXIgOjpcbi8vICAgW2VtcHR5XVxuLy8gICBgP2AgR3JvdXBOYW1lXG5wcCQxLnJlZ2V4cF9ncm91cFNwZWNpZmllciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5lYXQoMHgzRiAvKiA/ICovKSkge1xuICAgIGlmICghdGhpcy5yZWdleHBfZWF0R3JvdXBOYW1lKHN0YXRlKSkgeyBzdGF0ZS5yYWlzZShcIkludmFsaWQgZ3JvdXBcIik7IH1cbiAgICB2YXIgdHJhY2tEaXNqdW5jdGlvbiA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNjtcbiAgICB2YXIga25vd24gPSBzdGF0ZS5ncm91cE5hbWVzW3N0YXRlLmxhc3RTdHJpbmdWYWx1ZV07XG4gICAgaWYgKGtub3duKSB7XG4gICAgICBpZiAodHJhY2tEaXNqdW5jdGlvbikge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IGtub3duOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIHZhciBhbHRJRCA9IGxpc3RbaV07XG5cbiAgICAgICAgICBpZiAoIWFsdElELnNlcGFyYXRlZEZyb20oc3RhdGUuYnJhbmNoSUQpKVxuICAgICAgICAgICAgeyBzdGF0ZS5yYWlzZShcIkR1cGxpY2F0ZSBjYXB0dXJlIGdyb3VwIG5hbWVcIik7IH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJEdXBsaWNhdGUgY2FwdHVyZSBncm91cCBuYW1lXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHJhY2tEaXNqdW5jdGlvbikge1xuICAgICAgKGtub3duIHx8IChzdGF0ZS5ncm91cE5hbWVzW3N0YXRlLmxhc3RTdHJpbmdWYWx1ZV0gPSBbXSkpLnB1c2goc3RhdGUuYnJhbmNoSUQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5ncm91cE5hbWVzW3N0YXRlLmxhc3RTdHJpbmdWYWx1ZV0gPSB0cnVlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gR3JvdXBOYW1lIDo6XG4vLyAgIGA8YCBSZWdFeHBJZGVudGlmaWVyTmFtZSBgPmBcbi8vIE5vdGU6IHRoaXMgdXBkYXRlcyBgc3RhdGUubGFzdFN0cmluZ1ZhbHVlYCBwcm9wZXJ0eSB3aXRoIHRoZSBlYXRlbiBuYW1lLlxucHAkMS5yZWdleHBfZWF0R3JvdXBOYW1lID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlID0gXCJcIjtcbiAgaWYgKHN0YXRlLmVhdCgweDNDIC8qIDwgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdFJlZ0V4cElkZW50aWZpZXJOYW1lKHN0YXRlKSAmJiBzdGF0ZS5lYXQoMHgzRSAvKiA+ICovKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGNhcHR1cmUgZ3JvdXAgbmFtZVwiKTtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIFJlZ0V4cElkZW50aWZpZXJOYW1lIDo6XG4vLyAgIFJlZ0V4cElkZW50aWZpZXJTdGFydFxuLy8gICBSZWdFeHBJZGVudGlmaWVyTmFtZSBSZWdFeHBJZGVudGlmaWVyUGFydFxuLy8gTm90ZTogdGhpcyB1cGRhdGVzIGBzdGF0ZS5sYXN0U3RyaW5nVmFsdWVgIHByb3BlcnR5IHdpdGggdGhlIGVhdGVuIG5hbWUuXG5wcCQxLnJlZ2V4cF9lYXRSZWdFeHBJZGVudGlmaWVyTmFtZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSA9IFwiXCI7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRSZWdFeHBJZGVudGlmaWVyU3RhcnQoc3RhdGUpKSB7XG4gICAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlICs9IGNvZGVQb2ludFRvU3RyaW5nKHN0YXRlLmxhc3RJbnRWYWx1ZSk7XG4gICAgd2hpbGUgKHRoaXMucmVnZXhwX2VhdFJlZ0V4cElkZW50aWZpZXJQYXJ0KHN0YXRlKSkge1xuICAgICAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlICs9IGNvZGVQb2ludFRvU3RyaW5nKHN0YXRlLmxhc3RJbnRWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBSZWdFeHBJZGVudGlmaWVyU3RhcnQgOjpcbi8vICAgVW5pY29kZUlEU3RhcnRcbi8vICAgYCRgXG4vLyAgIGBfYFxuLy8gICBgXFxgIFJlZ0V4cFVuaWNvZGVFc2NhcGVTZXF1ZW5jZVsrVV1cbnBwJDEucmVnZXhwX2VhdFJlZ0V4cElkZW50aWZpZXJTdGFydCA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgdmFyIGZvcmNlVSA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMTtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudChmb3JjZVUpO1xuICBzdGF0ZS5hZHZhbmNlKGZvcmNlVSk7XG5cbiAgaWYgKGNoID09PSAweDVDIC8qIFxcICovICYmIHRoaXMucmVnZXhwX2VhdFJlZ0V4cFVuaWNvZGVFc2NhcGVTZXF1ZW5jZShzdGF0ZSwgZm9yY2VVKSkge1xuICAgIGNoID0gc3RhdGUubGFzdEludFZhbHVlO1xuICB9XG4gIGlmIChpc1JlZ0V4cElkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaDtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIHJldHVybiBmYWxzZVxufTtcbmZ1bmN0aW9uIGlzUmVnRXhwSWRlbnRpZmllclN0YXJ0KGNoKSB7XG4gIHJldHVybiBpc0lkZW50aWZpZXJTdGFydChjaCwgdHJ1ZSkgfHwgY2ggPT09IDB4MjQgLyogJCAqLyB8fCBjaCA9PT0gMHg1RiAvKiBfICovXG59XG5cbi8vIFJlZ0V4cElkZW50aWZpZXJQYXJ0IDo6XG4vLyAgIFVuaWNvZGVJRENvbnRpbnVlXG4vLyAgIGAkYFxuLy8gICBgX2Bcbi8vICAgYFxcYCBSZWdFeHBVbmljb2RlRXNjYXBlU2VxdWVuY2VbK1VdXG4vLyAgIDxaV05KPlxuLy8gICA8WldKPlxucHAkMS5yZWdleHBfZWF0UmVnRXhwSWRlbnRpZmllclBhcnQgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHZhciBmb3JjZVUgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTE7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoZm9yY2VVKTtcbiAgc3RhdGUuYWR2YW5jZShmb3JjZVUpO1xuXG4gIGlmIChjaCA9PT0gMHg1QyAvKiBcXCAqLyAmJiB0aGlzLnJlZ2V4cF9lYXRSZWdFeHBVbmljb2RlRXNjYXBlU2VxdWVuY2Uoc3RhdGUsIGZvcmNlVSkpIHtcbiAgICBjaCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgfVxuICBpZiAoaXNSZWdFeHBJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaDtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIHJldHVybiBmYWxzZVxufTtcbmZ1bmN0aW9uIGlzUmVnRXhwSWRlbnRpZmllclBhcnQoY2gpIHtcbiAgcmV0dXJuIGlzSWRlbnRpZmllckNoYXIoY2gsIHRydWUpIHx8IGNoID09PSAweDI0IC8qICQgKi8gfHwgY2ggPT09IDB4NUYgLyogXyAqLyB8fCBjaCA9PT0gMHgyMDBDIC8qIDxaV05KPiAqLyB8fCBjaCA9PT0gMHgyMDBEIC8qIDxaV0o+ICovXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1BdG9tRXNjYXBlXG5wcCQxLnJlZ2V4cF9lYXRBdG9tRXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKFxuICAgIHRoaXMucmVnZXhwX2VhdEJhY2tSZWZlcmVuY2Uoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyQ2xhc3NFc2NhcGUoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyRXNjYXBlKHN0YXRlKSB8fFxuICAgIChzdGF0ZS5zd2l0Y2hOICYmIHRoaXMucmVnZXhwX2VhdEtHcm91cE5hbWUoc3RhdGUpKVxuICApIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChzdGF0ZS5zd2l0Y2hVKSB7XG4gICAgLy8gTWFrZSB0aGUgc2FtZSBtZXNzYWdlIGFzIFY4LlxuICAgIGlmIChzdGF0ZS5jdXJyZW50KCkgPT09IDB4NjMgLyogYyAqLykge1xuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHVuaWNvZGUgZXNjYXBlXCIpO1xuICAgIH1cbiAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgZXNjYXBlXCIpO1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbnBwJDEucmVnZXhwX2VhdEJhY2tSZWZlcmVuY2UgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXREZWNpbWFsRXNjYXBlKHN0YXRlKSkge1xuICAgIHZhciBuID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgIGlmIChzdGF0ZS5zd2l0Y2hVKSB7XG4gICAgICAvLyBGb3IgU3ludGF4RXJyb3IgaW4gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3NlYy1hdG9tZXNjYXBlXG4gICAgICBpZiAobiA+IHN0YXRlLm1heEJhY2tSZWZlcmVuY2UpIHtcbiAgICAgICAgc3RhdGUubWF4QmFja1JlZmVyZW5jZSA9IG47XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAobiA8PSBzdGF0ZS5udW1DYXB0dXJpbmdQYXJlbnMpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbnBwJDEucmVnZXhwX2VhdEtHcm91cE5hbWUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoc3RhdGUuZWF0KDB4NkIgLyogayAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0R3JvdXBOYW1lKHN0YXRlKSkge1xuICAgICAgc3RhdGUuYmFja1JlZmVyZW5jZU5hbWVzLnB1c2goc3RhdGUubGFzdFN0cmluZ1ZhbHVlKTtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBuYW1lZCByZWZlcmVuY2VcIik7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItQ2hhcmFjdGVyRXNjYXBlXG5wcCQxLnJlZ2V4cF9lYXRDaGFyYWN0ZXJFc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICByZXR1cm4gKFxuICAgIHRoaXMucmVnZXhwX2VhdENvbnRyb2xFc2NhcGUoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q0NvbnRyb2xMZXR0ZXIoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0WmVybyhzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRIZXhFc2NhcGVTZXF1ZW5jZShzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRSZWdFeHBVbmljb2RlRXNjYXBlU2VxdWVuY2Uoc3RhdGUsIGZhbHNlKSB8fFxuICAgICghc3RhdGUuc3dpdGNoVSAmJiB0aGlzLnJlZ2V4cF9lYXRMZWdhY3lPY3RhbEVzY2FwZVNlcXVlbmNlKHN0YXRlKSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRJZGVudGl0eUVzY2FwZShzdGF0ZSlcbiAgKVxufTtcbnBwJDEucmVnZXhwX2VhdENDb250cm9sTGV0dGVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0KDB4NjMgLyogYyAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0Q29udHJvbExldHRlcihzdGF0ZSkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbnBwJDEucmVnZXhwX2VhdFplcm8gPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoc3RhdGUuY3VycmVudCgpID09PSAweDMwIC8qIDAgKi8gJiYgIWlzRGVjaW1hbERpZ2l0KHN0YXRlLmxvb2thaGVhZCgpKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDA7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1Db250cm9sRXNjYXBlXG5wcCQxLnJlZ2V4cF9lYXRDb250cm9sRXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoY2ggPT09IDB4NzQgLyogdCAqLykge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MDk7IC8qIFxcdCAqL1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChjaCA9PT0gMHg2RSAvKiBuICovKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgwQTsgLyogXFxuICovXG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKGNoID09PSAweDc2IC8qIHYgKi8pIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDBCOyAvKiBcXHYgKi9cbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpZiAoY2ggPT09IDB4NjYgLyogZiAqLykge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MEM7IC8qIFxcZiAqL1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChjaCA9PT0gMHg3MiAvKiByICovKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgwRDsgLyogXFxyICovXG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1Db250cm9sTGV0dGVyXG5wcCQxLnJlZ2V4cF9lYXRDb250cm9sTGV0dGVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoaXNDb250cm9sTGV0dGVyKGNoKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoICUgMHgyMDtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5mdW5jdGlvbiBpc0NvbnRyb2xMZXR0ZXIoY2gpIHtcbiAgcmV0dXJuIChcbiAgICAoY2ggPj0gMHg0MSAvKiBBICovICYmIGNoIDw9IDB4NUEgLyogWiAqLykgfHxcbiAgICAoY2ggPj0gMHg2MSAvKiBhICovICYmIGNoIDw9IDB4N0EgLyogeiAqLylcbiAgKVxufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1SZWdFeHBVbmljb2RlRXNjYXBlU2VxdWVuY2VcbnBwJDEucmVnZXhwX2VhdFJlZ0V4cFVuaWNvZGVFc2NhcGVTZXF1ZW5jZSA9IGZ1bmN0aW9uKHN0YXRlLCBmb3JjZVUpIHtcbiAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgdmFyIHN3aXRjaFUgPSBmb3JjZVUgfHwgc3RhdGUuc3dpdGNoVTtcblxuICBpZiAoc3RhdGUuZWF0KDB4NzUgLyogdSAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0Rml4ZWRIZXhEaWdpdHMoc3RhdGUsIDQpKSB7XG4gICAgICB2YXIgbGVhZCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgIGlmIChzd2l0Y2hVICYmIGxlYWQgPj0gMHhEODAwICYmIGxlYWQgPD0gMHhEQkZGKSB7XG4gICAgICAgIHZhciBsZWFkU3Vycm9nYXRlRW5kID0gc3RhdGUucG9zO1xuICAgICAgICBpZiAoc3RhdGUuZWF0KDB4NUMgLyogXFwgKi8pICYmIHN0YXRlLmVhdCgweDc1IC8qIHUgKi8pICYmIHRoaXMucmVnZXhwX2VhdEZpeGVkSGV4RGlnaXRzKHN0YXRlLCA0KSkge1xuICAgICAgICAgIHZhciB0cmFpbCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgICAgICBpZiAodHJhaWwgPj0gMHhEQzAwICYmIHRyYWlsIDw9IDB4REZGRikge1xuICAgICAgICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gKGxlYWQgLSAweEQ4MDApICogMHg0MDAgKyAodHJhaWwgLSAweERDMDApICsgMHgxMDAwMDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLnBvcyA9IGxlYWRTdXJyb2dhdGVFbmQ7XG4gICAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGxlYWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAoXG4gICAgICBzd2l0Y2hVICYmXG4gICAgICBzdGF0ZS5lYXQoMHg3QiAvKiB7ICovKSAmJlxuICAgICAgdGhpcy5yZWdleHBfZWF0SGV4RGlnaXRzKHN0YXRlKSAmJlxuICAgICAgc3RhdGUuZWF0KDB4N0QgLyogfSAqLykgJiZcbiAgICAgIGlzVmFsaWRVbmljb2RlKHN0YXRlLmxhc3RJbnRWYWx1ZSlcbiAgICApIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChzd2l0Y2hVKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgdW5pY29kZSBlc2NhcGVcIik7XG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59O1xuZnVuY3Rpb24gaXNWYWxpZFVuaWNvZGUoY2gpIHtcbiAgcmV0dXJuIGNoID49IDAgJiYgY2ggPD0gMHgxMEZGRkZcbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUlkZW50aXR5RXNjYXBlXG5wcCQxLnJlZ2V4cF9lYXRJZGVudGl0eUVzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5zd2l0Y2hVKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdFN5bnRheENoYXJhY3RlcihzdGF0ZSkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChzdGF0ZS5lYXQoMHgyRiAvKiAvICovKSkge1xuICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgyRjsgLyogLyAqL1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChjaCAhPT0gMHg2MyAvKiBjICovICYmICghc3RhdGUuc3dpdGNoTiB8fCBjaCAhPT0gMHg2QiAvKiBrICovKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1EZWNpbWFsRXNjYXBlXG5wcCQxLnJlZ2V4cF9lYXREZWNpbWFsRXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgc3RhdGUubGFzdEludFZhbHVlID0gMDtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoY2ggPj0gMHgzMSAvKiAxICovICYmIGNoIDw9IDB4MzkgLyogOSAqLykge1xuICAgIGRvIHtcbiAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDEwICogc3RhdGUubGFzdEludFZhbHVlICsgKGNoIC0gMHgzMCAvKiAwICovKTtcbiAgICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICB9IHdoaWxlICgoY2ggPSBzdGF0ZS5jdXJyZW50KCkpID49IDB4MzAgLyogMCAqLyAmJiBjaCA8PSAweDM5IC8qIDkgKi8pXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIFJldHVybiB2YWx1ZXMgdXNlZCBieSBjaGFyYWN0ZXIgc2V0IHBhcnNpbmcgbWV0aG9kcywgbmVlZGVkIHRvXG4vLyBmb3JiaWQgbmVnYXRpb24gb2Ygc2V0cyB0aGF0IGNhbiBtYXRjaCBzdHJpbmdzLlxudmFyIENoYXJTZXROb25lID0gMDsgLy8gTm90aGluZyBwYXJzZWRcbnZhciBDaGFyU2V0T2sgPSAxOyAvLyBDb25zdHJ1Y3QgcGFyc2VkLCBjYW5ub3QgY29udGFpbiBzdHJpbmdzXG52YXIgQ2hhclNldFN0cmluZyA9IDI7IC8vIENvbnN0cnVjdCBwYXJzZWQsIGNhbiBjb250YWluIHN0cmluZ3NcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQ2hhcmFjdGVyQ2xhc3NFc2NhcGVcbnBwJDEucmVnZXhwX2VhdENoYXJhY3RlckNsYXNzRXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuXG4gIGlmIChpc0NoYXJhY3RlckNsYXNzRXNjYXBlKGNoKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IC0xO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gQ2hhclNldE9rXG4gIH1cblxuICB2YXIgbmVnYXRlID0gZmFsc2U7XG4gIGlmIChcbiAgICBzdGF0ZS5zd2l0Y2hVICYmXG4gICAgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgJiZcbiAgICAoKG5lZ2F0ZSA9IGNoID09PSAweDUwIC8qIFAgKi8pIHx8IGNoID09PSAweDcwIC8qIHAgKi8pXG4gICkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IC0xO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmIChcbiAgICAgIHN0YXRlLmVhdCgweDdCIC8qIHsgKi8pICYmXG4gICAgICAocmVzdWx0ID0gdGhpcy5yZWdleHBfZWF0VW5pY29kZVByb3BlcnR5VmFsdWVFeHByZXNzaW9uKHN0YXRlKSkgJiZcbiAgICAgIHN0YXRlLmVhdCgweDdEIC8qIH0gKi8pXG4gICAgKSB7XG4gICAgICBpZiAobmVnYXRlICYmIHJlc3VsdCA9PT0gQ2hhclNldFN0cmluZykgeyBzdGF0ZS5yYWlzZShcIkludmFsaWQgcHJvcGVydHkgbmFtZVwiKTsgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cbiAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgcHJvcGVydHkgbmFtZVwiKTtcbiAgfVxuXG4gIHJldHVybiBDaGFyU2V0Tm9uZVxufTtcblxuZnVuY3Rpb24gaXNDaGFyYWN0ZXJDbGFzc0VzY2FwZShjaCkge1xuICByZXR1cm4gKFxuICAgIGNoID09PSAweDY0IC8qIGQgKi8gfHxcbiAgICBjaCA9PT0gMHg0NCAvKiBEICovIHx8XG4gICAgY2ggPT09IDB4NzMgLyogcyAqLyB8fFxuICAgIGNoID09PSAweDUzIC8qIFMgKi8gfHxcbiAgICBjaCA9PT0gMHg3NyAvKiB3ICovIHx8XG4gICAgY2ggPT09IDB4NTcgLyogVyAqL1xuICApXG59XG5cbi8vIFVuaWNvZGVQcm9wZXJ0eVZhbHVlRXhwcmVzc2lvbiA6OlxuLy8gICBVbmljb2RlUHJvcGVydHlOYW1lIGA9YCBVbmljb2RlUHJvcGVydHlWYWx1ZVxuLy8gICBMb25lVW5pY29kZVByb3BlcnR5TmFtZU9yVmFsdWVcbnBwJDEucmVnZXhwX2VhdFVuaWNvZGVQcm9wZXJ0eVZhbHVlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcblxuICAvLyBVbmljb2RlUHJvcGVydHlOYW1lIGA9YCBVbmljb2RlUHJvcGVydHlWYWx1ZVxuICBpZiAodGhpcy5yZWdleHBfZWF0VW5pY29kZVByb3BlcnR5TmFtZShzdGF0ZSkgJiYgc3RhdGUuZWF0KDB4M0QgLyogPSAqLykpIHtcbiAgICB2YXIgbmFtZSA9IHN0YXRlLmxhc3RTdHJpbmdWYWx1ZTtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0VW5pY29kZVByb3BlcnR5VmFsdWUoc3RhdGUpKSB7XG4gICAgICB2YXIgdmFsdWUgPSBzdGF0ZS5sYXN0U3RyaW5nVmFsdWU7XG4gICAgICB0aGlzLnJlZ2V4cF92YWxpZGF0ZVVuaWNvZGVQcm9wZXJ0eU5hbWVBbmRWYWx1ZShzdGF0ZSwgbmFtZSwgdmFsdWUpO1xuICAgICAgcmV0dXJuIENoYXJTZXRPa1xuICAgIH1cbiAgfVxuICBzdGF0ZS5wb3MgPSBzdGFydDtcblxuICAvLyBMb25lVW5pY29kZVByb3BlcnR5TmFtZU9yVmFsdWVcbiAgaWYgKHRoaXMucmVnZXhwX2VhdExvbmVVbmljb2RlUHJvcGVydHlOYW1lT3JWYWx1ZShzdGF0ZSkpIHtcbiAgICB2YXIgbmFtZU9yVmFsdWUgPSBzdGF0ZS5sYXN0U3RyaW5nVmFsdWU7XG4gICAgcmV0dXJuIHRoaXMucmVnZXhwX3ZhbGlkYXRlVW5pY29kZVByb3BlcnR5TmFtZU9yVmFsdWUoc3RhdGUsIG5hbWVPclZhbHVlKVxuICB9XG4gIHJldHVybiBDaGFyU2V0Tm9uZVxufTtcblxucHAkMS5yZWdleHBfdmFsaWRhdGVVbmljb2RlUHJvcGVydHlOYW1lQW5kVmFsdWUgPSBmdW5jdGlvbihzdGF0ZSwgbmFtZSwgdmFsdWUpIHtcbiAgaWYgKCFoYXNPd24oc3RhdGUudW5pY29kZVByb3BlcnRpZXMubm9uQmluYXJ5LCBuYW1lKSlcbiAgICB7IHN0YXRlLnJhaXNlKFwiSW52YWxpZCBwcm9wZXJ0eSBuYW1lXCIpOyB9XG4gIGlmICghc3RhdGUudW5pY29kZVByb3BlcnRpZXMubm9uQmluYXJ5W25hbWVdLnRlc3QodmFsdWUpKVxuICAgIHsgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHByb3BlcnR5IHZhbHVlXCIpOyB9XG59O1xuXG5wcCQxLnJlZ2V4cF92YWxpZGF0ZVVuaWNvZGVQcm9wZXJ0eU5hbWVPclZhbHVlID0gZnVuY3Rpb24oc3RhdGUsIG5hbWVPclZhbHVlKSB7XG4gIGlmIChzdGF0ZS51bmljb2RlUHJvcGVydGllcy5iaW5hcnkudGVzdChuYW1lT3JWYWx1ZSkpIHsgcmV0dXJuIENoYXJTZXRPayB9XG4gIGlmIChzdGF0ZS5zd2l0Y2hWICYmIHN0YXRlLnVuaWNvZGVQcm9wZXJ0aWVzLmJpbmFyeU9mU3RyaW5ncy50ZXN0KG5hbWVPclZhbHVlKSkgeyByZXR1cm4gQ2hhclNldFN0cmluZyB9XG4gIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBwcm9wZXJ0eSBuYW1lXCIpO1xufTtcblxuLy8gVW5pY29kZVByb3BlcnR5TmFtZSA6OlxuLy8gICBVbmljb2RlUHJvcGVydHlOYW1lQ2hhcmFjdGVyc1xucHAkMS5yZWdleHBfZWF0VW5pY29kZVByb3BlcnR5TmFtZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IDA7XG4gIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSA9IFwiXCI7XG4gIHdoaWxlIChpc1VuaWNvZGVQcm9wZXJ0eU5hbWVDaGFyYWN0ZXIoY2ggPSBzdGF0ZS5jdXJyZW50KCkpKSB7XG4gICAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlICs9IGNvZGVQb2ludFRvU3RyaW5nKGNoKTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSAhPT0gXCJcIlxufTtcblxuZnVuY3Rpb24gaXNVbmljb2RlUHJvcGVydHlOYW1lQ2hhcmFjdGVyKGNoKSB7XG4gIHJldHVybiBpc0NvbnRyb2xMZXR0ZXIoY2gpIHx8IGNoID09PSAweDVGIC8qIF8gKi9cbn1cblxuLy8gVW5pY29kZVByb3BlcnR5VmFsdWUgOjpcbi8vICAgVW5pY29kZVByb3BlcnR5VmFsdWVDaGFyYWN0ZXJzXG5wcCQxLnJlZ2V4cF9lYXRVbmljb2RlUHJvcGVydHlWYWx1ZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IDA7XG4gIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSA9IFwiXCI7XG4gIHdoaWxlIChpc1VuaWNvZGVQcm9wZXJ0eVZhbHVlQ2hhcmFjdGVyKGNoID0gc3RhdGUuY3VycmVudCgpKSkge1xuICAgIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSArPSBjb2RlUG9pbnRUb1N0cmluZyhjaCk7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICB9XG4gIHJldHVybiBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgIT09IFwiXCJcbn07XG5mdW5jdGlvbiBpc1VuaWNvZGVQcm9wZXJ0eVZhbHVlQ2hhcmFjdGVyKGNoKSB7XG4gIHJldHVybiBpc1VuaWNvZGVQcm9wZXJ0eU5hbWVDaGFyYWN0ZXIoY2gpIHx8IGlzRGVjaW1hbERpZ2l0KGNoKVxufVxuXG4vLyBMb25lVW5pY29kZVByb3BlcnR5TmFtZU9yVmFsdWUgOjpcbi8vICAgVW5pY29kZVByb3BlcnR5VmFsdWVDaGFyYWN0ZXJzXG5wcCQxLnJlZ2V4cF9lYXRMb25lVW5pY29kZVByb3BlcnR5TmFtZU9yVmFsdWUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICByZXR1cm4gdGhpcy5yZWdleHBfZWF0VW5pY29kZVByb3BlcnR5VmFsdWUoc3RhdGUpXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1DaGFyYWN0ZXJDbGFzc1xucHAkMS5yZWdleHBfZWF0Q2hhcmFjdGVyQ2xhc3MgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoc3RhdGUuZWF0KDB4NUIgLyogWyAqLykpIHtcbiAgICB2YXIgbmVnYXRlID0gc3RhdGUuZWF0KDB4NUUgLyogXiAqLyk7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXMucmVnZXhwX2NsYXNzQ29udGVudHMoc3RhdGUpO1xuICAgIGlmICghc3RhdGUuZWF0KDB4NUQgLyogXSAqLykpXG4gICAgICB7IHN0YXRlLnJhaXNlKFwiVW50ZXJtaW5hdGVkIGNoYXJhY3RlciBjbGFzc1wiKTsgfVxuICAgIGlmIChuZWdhdGUgJiYgcmVzdWx0ID09PSBDaGFyU2V0U3RyaW5nKVxuICAgICAgeyBzdGF0ZS5yYWlzZShcIk5lZ2F0ZWQgY2hhcmFjdGVyIGNsYXNzIG1heSBjb250YWluIHN0cmluZ3NcIik7IH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NDb250ZW50c1xuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQ2xhc3NSYW5nZXNcbnBwJDEucmVnZXhwX2NsYXNzQ29udGVudHMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoc3RhdGUuY3VycmVudCgpID09PSAweDVEIC8qIF0gKi8pIHsgcmV0dXJuIENoYXJTZXRPayB9XG4gIGlmIChzdGF0ZS5zd2l0Y2hWKSB7IHJldHVybiB0aGlzLnJlZ2V4cF9jbGFzc1NldEV4cHJlc3Npb24oc3RhdGUpIH1cbiAgdGhpcy5yZWdleHBfbm9uRW1wdHlDbGFzc1JhbmdlcyhzdGF0ZSk7XG4gIHJldHVybiBDaGFyU2V0T2tcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLU5vbmVtcHR5Q2xhc3NSYW5nZXNcbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLU5vbmVtcHR5Q2xhc3NSYW5nZXNOb0Rhc2hcbnBwJDEucmVnZXhwX25vbkVtcHR5Q2xhc3NSYW5nZXMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB3aGlsZSAodGhpcy5yZWdleHBfZWF0Q2xhc3NBdG9tKHN0YXRlKSkge1xuICAgIHZhciBsZWZ0ID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgIGlmIChzdGF0ZS5lYXQoMHgyRCAvKiAtICovKSAmJiB0aGlzLnJlZ2V4cF9lYXRDbGFzc0F0b20oc3RhdGUpKSB7XG4gICAgICB2YXIgcmlnaHQgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICBpZiAoc3RhdGUuc3dpdGNoVSAmJiAobGVmdCA9PT0gLTEgfHwgcmlnaHQgPT09IC0xKSkge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgY2hhcmFjdGVyIGNsYXNzXCIpO1xuICAgICAgfVxuICAgICAgaWYgKGxlZnQgIT09IC0xICYmIHJpZ2h0ICE9PSAtMSAmJiBsZWZ0ID4gcmlnaHQpIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJSYW5nZSBvdXQgb2Ygb3JkZXIgaW4gY2hhcmFjdGVyIGNsYXNzXCIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQ2xhc3NBdG9tXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1DbGFzc0F0b21Ob0Rhc2hcbnBwJDEucmVnZXhwX2VhdENsYXNzQXRvbSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcblxuICBpZiAoc3RhdGUuZWF0KDB4NUMgLyogXFwgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdENsYXNzRXNjYXBlKHN0YXRlKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKHN0YXRlLnN3aXRjaFUpIHtcbiAgICAgIC8vIE1ha2UgdGhlIHNhbWUgbWVzc2FnZSBhcyBWOC5cbiAgICAgIHZhciBjaCQxID0gc3RhdGUuY3VycmVudCgpO1xuICAgICAgaWYgKGNoJDEgPT09IDB4NjMgLyogYyAqLyB8fCBpc09jdGFsRGlnaXQoY2gkMSkpIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGNsYXNzIGVzY2FwZVwiKTtcbiAgICAgIH1cbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBlc2NhcGVcIik7XG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG5cbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoY2ggIT09IDB4NUQgLyogXSAqLykge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItQ2xhc3NFc2NhcGVcbnBwJDEucmVnZXhwX2VhdENsYXNzRXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuXG4gIGlmIChzdGF0ZS5lYXQoMHg2MiAvKiBiICovKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MDg7IC8qIDxCUz4gKi9cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaWYgKHN0YXRlLnN3aXRjaFUgJiYgc3RhdGUuZWF0KDB4MkQgLyogLSAqLykpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDJEOyAvKiAtICovXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIGlmICghc3RhdGUuc3dpdGNoVSAmJiBzdGF0ZS5lYXQoMHg2MyAvKiBjICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRDbGFzc0NvbnRyb2xMZXR0ZXIoc3RhdGUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuXG4gIHJldHVybiAoXG4gICAgdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyQ2xhc3NFc2NhcGUoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyRXNjYXBlKHN0YXRlKVxuICApXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldEV4cHJlc3Npb25cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzVW5pb25cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzSW50ZXJzZWN0aW9uXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1N1YnRyYWN0aW9uXG5wcCQxLnJlZ2V4cF9jbGFzc1NldEV4cHJlc3Npb24gPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgcmVzdWx0ID0gQ2hhclNldE9rLCBzdWJSZXN1bHQ7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldFJhbmdlKHN0YXRlKSkgOyBlbHNlIGlmIChzdWJSZXN1bHQgPSB0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldE9wZXJhbmQoc3RhdGUpKSB7XG4gICAgaWYgKHN1YlJlc3VsdCA9PT0gQ2hhclNldFN0cmluZykgeyByZXN1bHQgPSBDaGFyU2V0U3RyaW5nOyB9XG4gICAgLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NJbnRlcnNlY3Rpb25cbiAgICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gICAgd2hpbGUgKHN0YXRlLmVhdENoYXJzKFsweDI2LCAweDI2XSAvKiAmJiAqLykpIHtcbiAgICAgIGlmIChcbiAgICAgICAgc3RhdGUuY3VycmVudCgpICE9PSAweDI2IC8qICYgKi8gJiZcbiAgICAgICAgKHN1YlJlc3VsdCA9IHRoaXMucmVnZXhwX2VhdENsYXNzU2V0T3BlcmFuZChzdGF0ZSkpXG4gICAgICApIHtcbiAgICAgICAgaWYgKHN1YlJlc3VsdCAhPT0gQ2hhclNldFN0cmluZykgeyByZXN1bHQgPSBDaGFyU2V0T2s7IH1cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBjaGFyYWN0ZXIgaW4gY2hhcmFjdGVyIGNsYXNzXCIpO1xuICAgIH1cbiAgICBpZiAoc3RhcnQgIT09IHN0YXRlLnBvcykgeyByZXR1cm4gcmVzdWx0IH1cbiAgICAvLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1N1YnRyYWN0aW9uXG4gICAgd2hpbGUgKHN0YXRlLmVhdENoYXJzKFsweDJELCAweDJEXSAvKiAtLSAqLykpIHtcbiAgICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldE9wZXJhbmQoc3RhdGUpKSB7IGNvbnRpbnVlIH1cbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBjaGFyYWN0ZXIgaW4gY2hhcmFjdGVyIGNsYXNzXCIpO1xuICAgIH1cbiAgICBpZiAoc3RhcnQgIT09IHN0YXRlLnBvcykgeyByZXR1cm4gcmVzdWx0IH1cbiAgfSBlbHNlIHtcbiAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgY2hhcmFjdGVyIGluIGNoYXJhY3RlciBjbGFzc1wiKTtcbiAgfVxuICAvLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1VuaW9uXG4gIGZvciAoOzspIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRSYW5nZShzdGF0ZSkpIHsgY29udGludWUgfVxuICAgIHN1YlJlc3VsdCA9IHRoaXMucmVnZXhwX2VhdENsYXNzU2V0T3BlcmFuZChzdGF0ZSk7XG4gICAgaWYgKCFzdWJSZXN1bHQpIHsgcmV0dXJuIHJlc3VsdCB9XG4gICAgaWYgKHN1YlJlc3VsdCA9PT0gQ2hhclNldFN0cmluZykgeyByZXN1bHQgPSBDaGFyU2V0U3RyaW5nOyB9XG4gIH1cbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0UmFuZ2VcbnBwJDEucmVnZXhwX2VhdENsYXNzU2V0UmFuZ2UgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldENoYXJhY3RlcihzdGF0ZSkpIHtcbiAgICB2YXIgbGVmdCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICBpZiAoc3RhdGUuZWF0KDB4MkQgLyogLSAqLykgJiYgdGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRDaGFyYWN0ZXIoc3RhdGUpKSB7XG4gICAgICB2YXIgcmlnaHQgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICBpZiAobGVmdCAhPT0gLTEgJiYgcmlnaHQgIT09IC0xICYmIGxlZnQgPiByaWdodCkge1xuICAgICAgICBzdGF0ZS5yYWlzZShcIlJhbmdlIG91dCBvZiBvcmRlciBpbiBjaGFyYWN0ZXIgY2xhc3NcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0T3BlcmFuZFxucHAkMS5yZWdleHBfZWF0Q2xhc3NTZXRPcGVyYW5kID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHRoaXMucmVnZXhwX2VhdENsYXNzU2V0Q2hhcmFjdGVyKHN0YXRlKSkgeyByZXR1cm4gQ2hhclNldE9rIH1cbiAgcmV0dXJuIHRoaXMucmVnZXhwX2VhdENsYXNzU3RyaW5nRGlzanVuY3Rpb24oc3RhdGUpIHx8IHRoaXMucmVnZXhwX2VhdE5lc3RlZENsYXNzKHN0YXRlKVxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtTmVzdGVkQ2xhc3NcbnBwJDEucmVnZXhwX2VhdE5lc3RlZENsYXNzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0KDB4NUIgLyogWyAqLykpIHtcbiAgICB2YXIgbmVnYXRlID0gc3RhdGUuZWF0KDB4NUUgLyogXiAqLyk7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXMucmVnZXhwX2NsYXNzQ29udGVudHMoc3RhdGUpO1xuICAgIGlmIChzdGF0ZS5lYXQoMHg1RCAvKiBdICovKSkge1xuICAgICAgaWYgKG5lZ2F0ZSAmJiByZXN1bHQgPT09IENoYXJTZXRTdHJpbmcpIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJOZWdhdGVkIGNoYXJhY3RlciBjbGFzcyBtYXkgY29udGFpbiBzdHJpbmdzXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICBpZiAoc3RhdGUuZWF0KDB4NUMgLyogXFwgKi8pKSB7XG4gICAgdmFyIHJlc3VsdCQxID0gdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyQ2xhc3NFc2NhcGUoc3RhdGUpO1xuICAgIGlmIChyZXN1bHQkMSkge1xuICAgICAgcmV0dXJuIHJlc3VsdCQxXG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBudWxsXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1N0cmluZ0Rpc2p1bmN0aW9uXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc1N0cmluZ0Rpc2p1bmN0aW9uID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0Q2hhcnMoWzB4NUMsIDB4NzFdIC8qIFxccSAqLykpIHtcbiAgICBpZiAoc3RhdGUuZWF0KDB4N0IgLyogeyAqLykpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0aGlzLnJlZ2V4cF9jbGFzc1N0cmluZ0Rpc2p1bmN0aW9uQ29udGVudHMoc3RhdGUpO1xuICAgICAgaWYgKHN0YXRlLmVhdCgweDdEIC8qIH0gKi8pKSB7XG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTWFrZSB0aGUgc2FtZSBtZXNzYWdlIGFzIFY4LlxuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGVzY2FwZVwiKTtcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIG51bGxcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU3RyaW5nRGlzanVuY3Rpb25Db250ZW50c1xucHAkMS5yZWdleHBfY2xhc3NTdHJpbmdEaXNqdW5jdGlvbkNvbnRlbnRzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHJlc3VsdCA9IHRoaXMucmVnZXhwX2NsYXNzU3RyaW5nKHN0YXRlKTtcbiAgd2hpbGUgKHN0YXRlLmVhdCgweDdDIC8qIHwgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2NsYXNzU3RyaW5nKHN0YXRlKSA9PT0gQ2hhclNldFN0cmluZykgeyByZXN1bHQgPSBDaGFyU2V0U3RyaW5nOyB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTdHJpbmdcbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLU5vbkVtcHR5Q2xhc3NTdHJpbmdcbnBwJDEucmVnZXhwX2NsYXNzU3RyaW5nID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNvdW50ID0gMDtcbiAgd2hpbGUgKHRoaXMucmVnZXhwX2VhdENsYXNzU2V0Q2hhcmFjdGVyKHN0YXRlKSkgeyBjb3VudCsrOyB9XG4gIHJldHVybiBjb3VudCA9PT0gMSA/IENoYXJTZXRPayA6IENoYXJTZXRTdHJpbmdcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0Q2hhcmFjdGVyXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc1NldENoYXJhY3RlciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdCgweDVDIC8qIFxcICovKSkge1xuICAgIGlmIChcbiAgICAgIHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckVzY2FwZShzdGF0ZSkgfHxcbiAgICAgIHRoaXMucmVnZXhwX2VhdENsYXNzU2V0UmVzZXJ2ZWRQdW5jdHVhdG9yKHN0YXRlKVxuICAgICkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKHN0YXRlLmVhdCgweDYyIC8qIGIgKi8pKSB7XG4gICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDA4OyAvKiA8QlM+ICovXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChjaCA8IDAgfHwgY2ggPT09IHN0YXRlLmxvb2thaGVhZCgpICYmIGlzQ2xhc3NTZXRSZXNlcnZlZERvdWJsZVB1bmN0dWF0b3JDaGFyYWN0ZXIoY2gpKSB7IHJldHVybiBmYWxzZSB9XG4gIGlmIChpc0NsYXNzU2V0U3ludGF4Q2hhcmFjdGVyKGNoKSkgeyByZXR1cm4gZmFsc2UgfVxuICBzdGF0ZS5hZHZhbmNlKCk7XG4gIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoO1xuICByZXR1cm4gdHJ1ZVxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRSZXNlcnZlZERvdWJsZVB1bmN0dWF0b3JcbmZ1bmN0aW9uIGlzQ2xhc3NTZXRSZXNlcnZlZERvdWJsZVB1bmN0dWF0b3JDaGFyYWN0ZXIoY2gpIHtcbiAgcmV0dXJuIChcbiAgICBjaCA9PT0gMHgyMSAvKiAhICovIHx8XG4gICAgY2ggPj0gMHgyMyAvKiAjICovICYmIGNoIDw9IDB4MjYgLyogJiAqLyB8fFxuICAgIGNoID49IDB4MkEgLyogKiAqLyAmJiBjaCA8PSAweDJDIC8qICwgKi8gfHxcbiAgICBjaCA9PT0gMHgyRSAvKiAuICovIHx8XG4gICAgY2ggPj0gMHgzQSAvKiA6ICovICYmIGNoIDw9IDB4NDAgLyogQCAqLyB8fFxuICAgIGNoID09PSAweDVFIC8qIF4gKi8gfHxcbiAgICBjaCA9PT0gMHg2MCAvKiBgICovIHx8XG4gICAgY2ggPT09IDB4N0UgLyogfiAqL1xuICApXG59XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0U3ludGF4Q2hhcmFjdGVyXG5mdW5jdGlvbiBpc0NsYXNzU2V0U3ludGF4Q2hhcmFjdGVyKGNoKSB7XG4gIHJldHVybiAoXG4gICAgY2ggPT09IDB4MjggLyogKCAqLyB8fFxuICAgIGNoID09PSAweDI5IC8qICkgKi8gfHxcbiAgICBjaCA9PT0gMHgyRCAvKiAtICovIHx8XG4gICAgY2ggPT09IDB4MkYgLyogLyAqLyB8fFxuICAgIGNoID49IDB4NUIgLyogWyAqLyAmJiBjaCA8PSAweDVEIC8qIF0gKi8gfHxcbiAgICBjaCA+PSAweDdCIC8qIHsgKi8gJiYgY2ggPD0gMHg3RCAvKiB9ICovXG4gIClcbn1cblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRSZXNlcnZlZFB1bmN0dWF0b3JcbnBwJDEucmVnZXhwX2VhdENsYXNzU2V0UmVzZXJ2ZWRQdW5jdHVhdG9yID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoaXNDbGFzc1NldFJlc2VydmVkUHVuY3R1YXRvcihjaCkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaDtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0UmVzZXJ2ZWRQdW5jdHVhdG9yXG5mdW5jdGlvbiBpc0NsYXNzU2V0UmVzZXJ2ZWRQdW5jdHVhdG9yKGNoKSB7XG4gIHJldHVybiAoXG4gICAgY2ggPT09IDB4MjEgLyogISAqLyB8fFxuICAgIGNoID09PSAweDIzIC8qICMgKi8gfHxcbiAgICBjaCA9PT0gMHgyNSAvKiAlICovIHx8XG4gICAgY2ggPT09IDB4MjYgLyogJiAqLyB8fFxuICAgIGNoID09PSAweDJDIC8qICwgKi8gfHxcbiAgICBjaCA9PT0gMHgyRCAvKiAtICovIHx8XG4gICAgY2ggPj0gMHgzQSAvKiA6ICovICYmIGNoIDw9IDB4M0UgLyogPiAqLyB8fFxuICAgIGNoID09PSAweDQwIC8qIEAgKi8gfHxcbiAgICBjaCA9PT0gMHg2MCAvKiBgICovIHx8XG4gICAgY2ggPT09IDB4N0UgLyogfiAqL1xuICApXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1DbGFzc0NvbnRyb2xMZXR0ZXJcbnBwJDEucmVnZXhwX2VhdENsYXNzQ29udHJvbExldHRlciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGlzRGVjaW1hbERpZ2l0KGNoKSB8fCBjaCA9PT0gMHg1RiAvKiBfICovKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2ggJSAweDIwO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtSGV4RXNjYXBlU2VxdWVuY2VcbnBwJDEucmVnZXhwX2VhdEhleEVzY2FwZVNlcXVlbmNlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAoc3RhdGUuZWF0KDB4NzggLyogeCAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0Rml4ZWRIZXhEaWdpdHMoc3RhdGUsIDIpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAoc3RhdGUuc3dpdGNoVSkge1xuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGVzY2FwZVwiKTtcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1EZWNpbWFsRGlnaXRzXG5wcCQxLnJlZ2V4cF9lYXREZWNpbWFsRGlnaXRzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICB2YXIgY2ggPSAwO1xuICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAwO1xuICB3aGlsZSAoaXNEZWNpbWFsRGlnaXQoY2ggPSBzdGF0ZS5jdXJyZW50KCkpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMTAgKiBzdGF0ZS5sYXN0SW50VmFsdWUgKyAoY2ggLSAweDMwIC8qIDAgKi8pO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgfVxuICByZXR1cm4gc3RhdGUucG9zICE9PSBzdGFydFxufTtcbmZ1bmN0aW9uIGlzRGVjaW1hbERpZ2l0KGNoKSB7XG4gIHJldHVybiBjaCA+PSAweDMwIC8qIDAgKi8gJiYgY2ggPD0gMHgzOSAvKiA5ICovXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUhleERpZ2l0c1xucHAkMS5yZWdleHBfZWF0SGV4RGlnaXRzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICB2YXIgY2ggPSAwO1xuICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAwO1xuICB3aGlsZSAoaXNIZXhEaWdpdChjaCA9IHN0YXRlLmN1cnJlbnQoKSkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAxNiAqIHN0YXRlLmxhc3RJbnRWYWx1ZSArIGhleFRvSW50KGNoKTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLnBvcyAhPT0gc3RhcnRcbn07XG5mdW5jdGlvbiBpc0hleERpZ2l0KGNoKSB7XG4gIHJldHVybiAoXG4gICAgKGNoID49IDB4MzAgLyogMCAqLyAmJiBjaCA8PSAweDM5IC8qIDkgKi8pIHx8XG4gICAgKGNoID49IDB4NDEgLyogQSAqLyAmJiBjaCA8PSAweDQ2IC8qIEYgKi8pIHx8XG4gICAgKGNoID49IDB4NjEgLyogYSAqLyAmJiBjaCA8PSAweDY2IC8qIGYgKi8pXG4gIClcbn1cbmZ1bmN0aW9uIGhleFRvSW50KGNoKSB7XG4gIGlmIChjaCA+PSAweDQxIC8qIEEgKi8gJiYgY2ggPD0gMHg0NiAvKiBGICovKSB7XG4gICAgcmV0dXJuIDEwICsgKGNoIC0gMHg0MSAvKiBBICovKVxuICB9XG4gIGlmIChjaCA+PSAweDYxIC8qIGEgKi8gJiYgY2ggPD0gMHg2NiAvKiBmICovKSB7XG4gICAgcmV0dXJuIDEwICsgKGNoIC0gMHg2MSAvKiBhICovKVxuICB9XG4gIHJldHVybiBjaCAtIDB4MzAgLyogMCAqL1xufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItTGVnYWN5T2N0YWxFc2NhcGVTZXF1ZW5jZVxuLy8gQWxsb3dzIG9ubHkgMC0zNzcob2N0YWwpIGkuZS4gMC0yNTUoZGVjaW1hbCkuXG5wcCQxLnJlZ2V4cF9lYXRMZWdhY3lPY3RhbEVzY2FwZVNlcXVlbmNlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHRoaXMucmVnZXhwX2VhdE9jdGFsRGlnaXQoc3RhdGUpKSB7XG4gICAgdmFyIG4xID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRPY3RhbERpZ2l0KHN0YXRlKSkge1xuICAgICAgdmFyIG4yID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgaWYgKG4xIDw9IDMgJiYgdGhpcy5yZWdleHBfZWF0T2N0YWxEaWdpdChzdGF0ZSkpIHtcbiAgICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gbjEgKiA2NCArIG4yICogOCArIHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IG4xICogOCArIG4yO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBuMTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLU9jdGFsRGlnaXRcbnBwJDEucmVnZXhwX2VhdE9jdGFsRGlnaXQgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChpc09jdGFsRGlnaXQoY2gpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2ggLSAweDMwOyAvKiAwICovXG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgc3RhdGUubGFzdEludFZhbHVlID0gMDtcbiAgcmV0dXJuIGZhbHNlXG59O1xuZnVuY3Rpb24gaXNPY3RhbERpZ2l0KGNoKSB7XG4gIHJldHVybiBjaCA+PSAweDMwIC8qIDAgKi8gJiYgY2ggPD0gMHgzNyAvKiA3ICovXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUhleDREaWdpdHNcbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUhleERpZ2l0XG4vLyBBbmQgSGV4RGlnaXQgSGV4RGlnaXQgaW4gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtSGV4RXNjYXBlU2VxdWVuY2VcbnBwJDEucmVnZXhwX2VhdEZpeGVkSGV4RGlnaXRzID0gZnVuY3Rpb24oc3RhdGUsIGxlbmd0aCkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gICAgaWYgKCFpc0hleERpZ2l0KGNoKSkge1xuICAgICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMTYgKiBzdGF0ZS5sYXN0SW50VmFsdWUgKyBoZXhUb0ludChjaCk7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICB9XG4gIHJldHVybiB0cnVlXG59O1xuXG4vLyBPYmplY3QgdHlwZSB1c2VkIHRvIHJlcHJlc2VudCB0b2tlbnMuIE5vdGUgdGhhdCBub3JtYWxseSwgdG9rZW5zXG4vLyBzaW1wbHkgZXhpc3QgYXMgcHJvcGVydGllcyBvbiB0aGUgcGFyc2VyIG9iamVjdC4gVGhpcyBpcyBvbmx5XG4vLyB1c2VkIGZvciB0aGUgb25Ub2tlbiBjYWxsYmFjayBhbmQgdGhlIGV4dGVybmFsIHRva2VuaXplci5cblxudmFyIFRva2VuID0gZnVuY3Rpb24gVG9rZW4ocCkge1xuICB0aGlzLnR5cGUgPSBwLnR5cGU7XG4gIHRoaXMudmFsdWUgPSBwLnZhbHVlO1xuICB0aGlzLnN0YXJ0ID0gcC5zdGFydDtcbiAgdGhpcy5lbmQgPSBwLmVuZDtcbiAgaWYgKHAub3B0aW9ucy5sb2NhdGlvbnMpXG4gICAgeyB0aGlzLmxvYyA9IG5ldyBTb3VyY2VMb2NhdGlvbihwLCBwLnN0YXJ0TG9jLCBwLmVuZExvYyk7IH1cbiAgaWYgKHAub3B0aW9ucy5yYW5nZXMpXG4gICAgeyB0aGlzLnJhbmdlID0gW3Auc3RhcnQsIHAuZW5kXTsgfVxufTtcblxuLy8gIyMgVG9rZW5pemVyXG5cbnZhciBwcCA9IFBhcnNlci5wcm90b3R5cGU7XG5cbi8vIE1vdmUgdG8gdGhlIG5leHQgdG9rZW5cblxucHAubmV4dCA9IGZ1bmN0aW9uKGlnbm9yZUVzY2FwZVNlcXVlbmNlSW5LZXl3b3JkKSB7XG4gIGlmICghaWdub3JlRXNjYXBlU2VxdWVuY2VJbktleXdvcmQgJiYgdGhpcy50eXBlLmtleXdvcmQgJiYgdGhpcy5jb250YWluc0VzYylcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnN0YXJ0LCBcIkVzY2FwZSBzZXF1ZW5jZSBpbiBrZXl3b3JkIFwiICsgdGhpcy50eXBlLmtleXdvcmQpOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMub25Ub2tlbilcbiAgICB7IHRoaXMub3B0aW9ucy5vblRva2VuKG5ldyBUb2tlbih0aGlzKSk7IH1cblxuICB0aGlzLmxhc3RUb2tFbmQgPSB0aGlzLmVuZDtcbiAgdGhpcy5sYXN0VG9rU3RhcnQgPSB0aGlzLnN0YXJ0O1xuICB0aGlzLmxhc3RUb2tFbmRMb2MgPSB0aGlzLmVuZExvYztcbiAgdGhpcy5sYXN0VG9rU3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICB0aGlzLm5leHRUb2tlbigpO1xufTtcblxucHAuZ2V0VG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIHJldHVybiBuZXcgVG9rZW4odGhpcylcbn07XG5cbi8vIElmIHdlJ3JlIGluIGFuIEVTNiBlbnZpcm9ubWVudCwgbWFrZSBwYXJzZXJzIGl0ZXJhYmxlXG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gXCJ1bmRlZmluZWRcIilcbiAgeyBwcFtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoaXMkMSQxID0gdGhpcztcblxuICAgIHJldHVybiB7XG4gICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IHRoaXMkMSQxLmdldFRva2VuKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZG9uZTogdG9rZW4udHlwZSA9PT0gdHlwZXMkMS5lb2YsXG4gICAgICAgICAgdmFsdWU6IHRva2VuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07IH1cblxuLy8gVG9nZ2xlIHN0cmljdCBtb2RlLiBSZS1yZWFkcyB0aGUgbmV4dCBudW1iZXIgb3Igc3RyaW5nIHRvIHBsZWFzZVxuLy8gcGVkYW50aWMgdGVzdHMgKGBcInVzZSBzdHJpY3RcIjsgMDEwO2Agc2hvdWxkIGZhaWwpLlxuXG4vLyBSZWFkIGEgc2luZ2xlIHRva2VuLCB1cGRhdGluZyB0aGUgcGFyc2VyIG9iamVjdCdzIHRva2VuLXJlbGF0ZWRcbi8vIHByb3BlcnRpZXMuXG5cbnBwLm5leHRUb2tlbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY3VyQ29udGV4dCA9IHRoaXMuY3VyQ29udGV4dCgpO1xuICBpZiAoIWN1ckNvbnRleHQgfHwgIWN1ckNvbnRleHQucHJlc2VydmVTcGFjZSkgeyB0aGlzLnNraXBTcGFjZSgpOyB9XG5cbiAgdGhpcy5zdGFydCA9IHRoaXMucG9zO1xuICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykgeyB0aGlzLnN0YXJ0TG9jID0gdGhpcy5jdXJQb3NpdGlvbigpOyB9XG4gIGlmICh0aGlzLnBvcyA+PSB0aGlzLmlucHV0Lmxlbmd0aCkgeyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmVvZikgfVxuXG4gIGlmIChjdXJDb250ZXh0Lm92ZXJyaWRlKSB7IHJldHVybiBjdXJDb250ZXh0Lm92ZXJyaWRlKHRoaXMpIH1cbiAgZWxzZSB7IHRoaXMucmVhZFRva2VuKHRoaXMuZnVsbENoYXJDb2RlQXRQb3MoKSk7IH1cbn07XG5cbnBwLnJlYWRUb2tlbiA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgLy8gSWRlbnRpZmllciBvciBrZXl3b3JkLiAnXFx1WFhYWCcgc2VxdWVuY2VzIGFyZSBhbGxvd2VkIGluXG4gIC8vIGlkZW50aWZpZXJzLCBzbyAnXFwnIGFsc28gZGlzcGF0Y2hlcyB0byB0aGF0LlxuICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY29kZSwgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHx8IGNvZGUgPT09IDkyIC8qICdcXCcgKi8pXG4gICAgeyByZXR1cm4gdGhpcy5yZWFkV29yZCgpIH1cblxuICByZXR1cm4gdGhpcy5nZXRUb2tlbkZyb21Db2RlKGNvZGUpXG59O1xuXG5wcC5mdWxsQ2hhckNvZGVBdCA9IGZ1bmN0aW9uKHBvcykge1xuICB2YXIgY29kZSA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdChwb3MpO1xuICBpZiAoY29kZSA8PSAweGQ3ZmYgfHwgY29kZSA+PSAweGRjMDApIHsgcmV0dXJuIGNvZGUgfVxuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdChwb3MgKyAxKTtcbiAgcmV0dXJuIG5leHQgPD0gMHhkYmZmIHx8IG5leHQgPj0gMHhlMDAwID8gY29kZSA6IChjb2RlIDw8IDEwKSArIG5leHQgLSAweDM1ZmRjMDBcbn07XG5cbnBwLmZ1bGxDaGFyQ29kZUF0UG9zID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZ1bGxDaGFyQ29kZUF0KHRoaXMucG9zKVxufTtcblxucHAuc2tpcEJsb2NrQ29tbWVudCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc3RhcnRMb2MgPSB0aGlzLm9wdGlvbnMub25Db21tZW50ICYmIHRoaXMuY3VyUG9zaXRpb24oKTtcbiAgdmFyIHN0YXJ0ID0gdGhpcy5wb3MsIGVuZCA9IHRoaXMuaW5wdXQuaW5kZXhPZihcIiovXCIsIHRoaXMucG9zICs9IDIpO1xuICBpZiAoZW5kID09PSAtMSkgeyB0aGlzLnJhaXNlKHRoaXMucG9zIC0gMiwgXCJVbnRlcm1pbmF0ZWQgY29tbWVudFwiKTsgfVxuICB0aGlzLnBvcyA9IGVuZCArIDI7XG4gIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7XG4gICAgZm9yICh2YXIgbmV4dEJyZWFrID0gKHZvaWQgMCksIHBvcyA9IHN0YXJ0OyAobmV4dEJyZWFrID0gbmV4dExpbmVCcmVhayh0aGlzLmlucHV0LCBwb3MsIHRoaXMucG9zKSkgPiAtMTspIHtcbiAgICAgICsrdGhpcy5jdXJMaW5lO1xuICAgICAgcG9zID0gdGhpcy5saW5lU3RhcnQgPSBuZXh0QnJlYWs7XG4gICAgfVxuICB9XG4gIGlmICh0aGlzLm9wdGlvbnMub25Db21tZW50KVxuICAgIHsgdGhpcy5vcHRpb25zLm9uQ29tbWVudCh0cnVlLCB0aGlzLmlucHV0LnNsaWNlKHN0YXJ0ICsgMiwgZW5kKSwgc3RhcnQsIHRoaXMucG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMb2MsIHRoaXMuY3VyUG9zaXRpb24oKSk7IH1cbn07XG5cbnBwLnNraXBMaW5lQ29tbWVudCA9IGZ1bmN0aW9uKHN0YXJ0U2tpcCkge1xuICB2YXIgc3RhcnQgPSB0aGlzLnBvcztcbiAgdmFyIHN0YXJ0TG9jID0gdGhpcy5vcHRpb25zLm9uQ29tbWVudCAmJiB0aGlzLmN1clBvc2l0aW9uKCk7XG4gIHZhciBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArPSBzdGFydFNraXApO1xuICB3aGlsZSAodGhpcy5wb3MgPCB0aGlzLmlucHV0Lmxlbmd0aCAmJiAhaXNOZXdMaW5lKGNoKSkge1xuICAgIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KCsrdGhpcy5wb3MpO1xuICB9XG4gIGlmICh0aGlzLm9wdGlvbnMub25Db21tZW50KVxuICAgIHsgdGhpcy5vcHRpb25zLm9uQ29tbWVudChmYWxzZSwgdGhpcy5pbnB1dC5zbGljZShzdGFydCArIHN0YXJ0U2tpcCwgdGhpcy5wb3MpLCBzdGFydCwgdGhpcy5wb3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydExvYywgdGhpcy5jdXJQb3NpdGlvbigpKTsgfVxufTtcblxuLy8gQ2FsbGVkIGF0IHRoZSBzdGFydCBvZiB0aGUgcGFyc2UgYW5kIGFmdGVyIGV2ZXJ5IHRva2VuLiBTa2lwc1xuLy8gd2hpdGVzcGFjZSBhbmQgY29tbWVudHMsIGFuZC5cblxucHAuc2tpcFNwYWNlID0gZnVuY3Rpb24oKSB7XG4gIGxvb3A6IHdoaWxlICh0aGlzLnBvcyA8IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgdmFyIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKTtcbiAgICBzd2l0Y2ggKGNoKSB7XG4gICAgY2FzZSAzMjogY2FzZSAxNjA6IC8vICcgJ1xuICAgICAgKyt0aGlzLnBvcztcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAxMzpcbiAgICAgIGlmICh0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKSA9PT0gMTApIHtcbiAgICAgICAgKyt0aGlzLnBvcztcbiAgICAgIH1cbiAgICBjYXNlIDEwOiBjYXNlIDgyMzI6IGNhc2UgODIzMzpcbiAgICAgICsrdGhpcy5wb3M7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykge1xuICAgICAgICArK3RoaXMuY3VyTGluZTtcbiAgICAgICAgdGhpcy5saW5lU3RhcnQgPSB0aGlzLnBvcztcbiAgICAgIH1cbiAgICAgIGJyZWFrXG4gICAgY2FzZSA0NzogLy8gJy8nXG4gICAgICBzd2l0Y2ggKHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpKSB7XG4gICAgICBjYXNlIDQyOiAvLyAnKidcbiAgICAgICAgdGhpcy5za2lwQmxvY2tDb21tZW50KCk7XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ3OlxuICAgICAgICB0aGlzLnNraXBMaW5lQ29tbWVudCgyKTtcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrIGxvb3BcbiAgICAgIH1cbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIGlmIChjaCA+IDggJiYgY2ggPCAxNCB8fCBjaCA+PSA1NzYwICYmIG5vbkFTQ0lJd2hpdGVzcGFjZS50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoY2gpKSkge1xuICAgICAgICArK3RoaXMucG9zO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWsgbG9vcFxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLy8gQ2FsbGVkIGF0IHRoZSBlbmQgb2YgZXZlcnkgdG9rZW4uIFNldHMgYGVuZGAsIGB2YWxgLCBhbmRcbi8vIG1haW50YWlucyBgY29udGV4dGAgYW5kIGBleHByQWxsb3dlZGAsIGFuZCBza2lwcyB0aGUgc3BhY2UgYWZ0ZXJcbi8vIHRoZSB0b2tlbiwgc28gdGhhdCB0aGUgbmV4dCBvbmUncyBgc3RhcnRgIHdpbGwgcG9pbnQgYXQgdGhlXG4vLyByaWdodCBwb3NpdGlvbi5cblxucHAuZmluaXNoVG9rZW4gPSBmdW5jdGlvbih0eXBlLCB2YWwpIHtcbiAgdGhpcy5lbmQgPSB0aGlzLnBvcztcbiAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHsgdGhpcy5lbmRMb2MgPSB0aGlzLmN1clBvc2l0aW9uKCk7IH1cbiAgdmFyIHByZXZUeXBlID0gdGhpcy50eXBlO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLnZhbHVlID0gdmFsO1xuXG4gIHRoaXMudXBkYXRlQ29udGV4dChwcmV2VHlwZSk7XG59O1xuXG4vLyAjIyMgVG9rZW4gcmVhZGluZ1xuXG4vLyBUaGlzIGlzIHRoZSBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCB0byBmZXRjaCB0aGUgbmV4dCB0b2tlbi4gSXRcbi8vIGlzIHNvbWV3aGF0IG9ic2N1cmUsIGJlY2F1c2UgaXQgd29ya3MgaW4gY2hhcmFjdGVyIGNvZGVzIHJhdGhlclxuLy8gdGhhbiBjaGFyYWN0ZXJzLCBhbmQgYmVjYXVzZSBvcGVyYXRvciBwYXJzaW5nIGhhcyBiZWVuIGlubGluZWRcbi8vIGludG8gaXQuXG4vL1xuLy8gQWxsIGluIHRoZSBuYW1lIG9mIHNwZWVkLlxuLy9cbnBwLnJlYWRUb2tlbl9kb3QgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgaWYgKG5leHQgPj0gNDggJiYgbmV4dCA8PSA1NykgeyByZXR1cm4gdGhpcy5yZWFkTnVtYmVyKHRydWUpIH1cbiAgdmFyIG5leHQyID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMik7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiBuZXh0ID09PSA0NiAmJiBuZXh0MiA9PT0gNDYpIHsgLy8gNDYgPSBkb3QgJy4nXG4gICAgdGhpcy5wb3MgKz0gMztcbiAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmVsbGlwc2lzKVxuICB9IGVsc2Uge1xuICAgICsrdGhpcy5wb3M7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5kb3QpXG4gIH1cbn07XG5cbnBwLnJlYWRUb2tlbl9zbGFzaCA9IGZ1bmN0aW9uKCkgeyAvLyAnLydcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgaWYgKHRoaXMuZXhwckFsbG93ZWQpIHsgKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMucmVhZFJlZ2V4cCgpIH1cbiAgaWYgKG5leHQgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCAyKSB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuc2xhc2gsIDEpXG59O1xuXG5wcC5yZWFkVG9rZW5fbXVsdF9tb2R1bG9fZXhwID0gZnVuY3Rpb24oY29kZSkgeyAvLyAnJSonXG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIHZhciBzaXplID0gMTtcbiAgdmFyIHRva2VudHlwZSA9IGNvZGUgPT09IDQyID8gdHlwZXMkMS5zdGFyIDogdHlwZXMkMS5tb2R1bG87XG5cbiAgLy8gZXhwb25lbnRpYXRpb24gb3BlcmF0b3IgKiogYW5kICoqPVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDcgJiYgY29kZSA9PT0gNDIgJiYgbmV4dCA9PT0gNDIpIHtcbiAgICArK3NpemU7XG4gICAgdG9rZW50eXBlID0gdHlwZXMkMS5zdGFyc3RhcjtcbiAgICBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMik7XG4gIH1cblxuICBpZiAobmV4dCA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIHNpemUgKyAxKSB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKHRva2VudHlwZSwgc2l6ZSlcbn07XG5cbnBwLnJlYWRUb2tlbl9waXBlX2FtcCA9IGZ1bmN0aW9uKGNvZGUpIHsgLy8gJ3wmJ1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICBpZiAobmV4dCA9PT0gY29kZSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTIpIHtcbiAgICAgIHZhciBuZXh0MiA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpO1xuICAgICAgaWYgKG5leHQyID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgMykgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hPcChjb2RlID09PSAxMjQgPyB0eXBlcyQxLmxvZ2ljYWxPUiA6IHR5cGVzJDEubG9naWNhbEFORCwgMilcbiAgfVxuICBpZiAobmV4dCA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIDIpIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AoY29kZSA9PT0gMTI0ID8gdHlwZXMkMS5iaXR3aXNlT1IgOiB0eXBlcyQxLmJpdHdpc2VBTkQsIDEpXG59O1xuXG5wcC5yZWFkVG9rZW5fY2FyZXQgPSBmdW5jdGlvbigpIHsgLy8gJ14nXG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIGlmIChuZXh0ID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgMikgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmJpdHdpc2VYT1IsIDEpXG59O1xuXG5wcC5yZWFkVG9rZW5fcGx1c19taW4gPSBmdW5jdGlvbihjb2RlKSB7IC8vICcrLSdcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgaWYgKG5leHQgPT09IGNvZGUpIHtcbiAgICBpZiAobmV4dCA9PT0gNDUgJiYgIXRoaXMuaW5Nb2R1bGUgJiYgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMikgPT09IDYyICYmXG4gICAgICAgICh0aGlzLmxhc3RUb2tFbmQgPT09IDAgfHwgbGluZUJyZWFrLnRlc3QodGhpcy5pbnB1dC5zbGljZSh0aGlzLmxhc3RUb2tFbmQsIHRoaXMucG9zKSkpKSB7XG4gICAgICAvLyBBIGAtLT5gIGxpbmUgY29tbWVudFxuICAgICAgdGhpcy5za2lwTGluZUNvbW1lbnQoMyk7XG4gICAgICB0aGlzLnNraXBTcGFjZSgpO1xuICAgICAgcmV0dXJuIHRoaXMubmV4dFRva2VuKClcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5pbmNEZWMsIDIpXG4gIH1cbiAgaWYgKG5leHQgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCAyKSB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEucGx1c01pbiwgMSlcbn07XG5cbnBwLnJlYWRUb2tlbl9sdF9ndCA9IGZ1bmN0aW9uKGNvZGUpIHsgLy8gJzw+J1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICB2YXIgc2l6ZSA9IDE7XG4gIGlmIChuZXh0ID09PSBjb2RlKSB7XG4gICAgc2l6ZSA9IGNvZGUgPT09IDYyICYmIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpID09PSA2MiA/IDMgOiAyO1xuICAgIGlmICh0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyBzaXplKSA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIHNpemUgKyAxKSB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5iaXRTaGlmdCwgc2l6ZSlcbiAgfVxuICBpZiAobmV4dCA9PT0gMzMgJiYgY29kZSA9PT0gNjAgJiYgIXRoaXMuaW5Nb2R1bGUgJiYgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMikgPT09IDQ1ICYmXG4gICAgICB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAzKSA9PT0gNDUpIHtcbiAgICAvLyBgPCEtLWAsIGFuIFhNTC1zdHlsZSBjb21tZW50IHRoYXQgc2hvdWxkIGJlIGludGVycHJldGVkIGFzIGEgbGluZSBjb21tZW50XG4gICAgdGhpcy5za2lwTGluZUNvbW1lbnQoNCk7XG4gICAgdGhpcy5za2lwU3BhY2UoKTtcbiAgICByZXR1cm4gdGhpcy5uZXh0VG9rZW4oKVxuICB9XG4gIGlmIChuZXh0ID09PSA2MSkgeyBzaXplID0gMjsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLnJlbGF0aW9uYWwsIHNpemUpXG59O1xuXG5wcC5yZWFkVG9rZW5fZXFfZXhjbCA9IGZ1bmN0aW9uKGNvZGUpIHsgLy8gJz0hJ1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICBpZiAobmV4dCA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5lcXVhbGl0eSwgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMikgPT09IDYxID8gMyA6IDIpIH1cbiAgaWYgKGNvZGUgPT09IDYxICYmIG5leHQgPT09IDYyICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7IC8vICc9PidcbiAgICB0aGlzLnBvcyArPSAyO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuYXJyb3cpXG4gIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AoY29kZSA9PT0gNjEgPyB0eXBlcyQxLmVxIDogdHlwZXMkMS5wcmVmaXgsIDEpXG59O1xuXG5wcC5yZWFkVG9rZW5fcXVlc3Rpb24gPSBmdW5jdGlvbigpIHsgLy8gJz8nXG4gIHZhciBlY21hVmVyc2lvbiA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbjtcbiAgaWYgKGVjbWFWZXJzaW9uID49IDExKSB7XG4gICAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgICBpZiAobmV4dCA9PT0gNDYpIHtcbiAgICAgIHZhciBuZXh0MiA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpO1xuICAgICAgaWYgKG5leHQyIDwgNDggfHwgbmV4dDIgPiA1NykgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLnF1ZXN0aW9uRG90LCAyKSB9XG4gICAgfVxuICAgIGlmIChuZXh0ID09PSA2Mykge1xuICAgICAgaWYgKGVjbWFWZXJzaW9uID49IDEyKSB7XG4gICAgICAgIHZhciBuZXh0MiQxID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMik7XG4gICAgICAgIGlmIChuZXh0MiQxID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgMykgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5jb2FsZXNjZSwgMilcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5xdWVzdGlvbiwgMSlcbn07XG5cbnBwLnJlYWRUb2tlbl9udW1iZXJTaWduID0gZnVuY3Rpb24oKSB7IC8vICcjJ1xuICB2YXIgZWNtYVZlcnNpb24gPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb247XG4gIHZhciBjb2RlID0gMzU7IC8vICcjJ1xuICBpZiAoZWNtYVZlcnNpb24gPj0gMTMpIHtcbiAgICArK3RoaXMucG9zO1xuICAgIGNvZGUgPSB0aGlzLmZ1bGxDaGFyQ29kZUF0UG9zKCk7XG4gICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNvZGUsIHRydWUpIHx8IGNvZGUgPT09IDkyIC8qICdcXCcgKi8pIHtcbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEucHJpdmF0ZUlkLCB0aGlzLnJlYWRXb3JkMSgpKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMucmFpc2UodGhpcy5wb3MsIFwiVW5leHBlY3RlZCBjaGFyYWN0ZXIgJ1wiICsgY29kZVBvaW50VG9TdHJpbmcoY29kZSkgKyBcIidcIik7XG59O1xuXG5wcC5nZXRUb2tlbkZyb21Db2RlID0gZnVuY3Rpb24oY29kZSkge1xuICBzd2l0Y2ggKGNvZGUpIHtcbiAgLy8gVGhlIGludGVycHJldGF0aW9uIG9mIGEgZG90IGRlcGVuZHMgb24gd2hldGhlciBpdCBpcyBmb2xsb3dlZFxuICAvLyBieSBhIGRpZ2l0IG9yIGFub3RoZXIgdHdvIGRvdHMuXG4gIGNhc2UgNDY6IC8vICcuJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9kb3QoKVxuXG4gIC8vIFB1bmN0dWF0aW9uIHRva2Vucy5cbiAgY2FzZSA0MDogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5wYXJlbkwpXG4gIGNhc2UgNDE6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEucGFyZW5SKVxuICBjYXNlIDU5OiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLnNlbWkpXG4gIGNhc2UgNDQ6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuY29tbWEpXG4gIGNhc2UgOTE6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuYnJhY2tldEwpXG4gIGNhc2UgOTM6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuYnJhY2tldFIpXG4gIGNhc2UgMTIzOiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmJyYWNlTClcbiAgY2FzZSAxMjU6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuYnJhY2VSKVxuICBjYXNlIDU4OiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmNvbG9uKVxuXG4gIGNhc2UgOTY6IC8vICdgJ1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA2KSB7IGJyZWFrIH1cbiAgICArK3RoaXMucG9zO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuYmFja1F1b3RlKVxuXG4gIGNhc2UgNDg6IC8vICcwJ1xuICAgIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gICAgaWYgKG5leHQgPT09IDEyMCB8fCBuZXh0ID09PSA4OCkgeyByZXR1cm4gdGhpcy5yZWFkUmFkaXhOdW1iZXIoMTYpIH0gLy8gJzB4JywgJzBYJyAtIGhleCBudW1iZXJcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHtcbiAgICAgIGlmIChuZXh0ID09PSAxMTEgfHwgbmV4dCA9PT0gNzkpIHsgcmV0dXJuIHRoaXMucmVhZFJhZGl4TnVtYmVyKDgpIH0gLy8gJzBvJywgJzBPJyAtIG9jdGFsIG51bWJlclxuICAgICAgaWYgKG5leHQgPT09IDk4IHx8IG5leHQgPT09IDY2KSB7IHJldHVybiB0aGlzLnJlYWRSYWRpeE51bWJlcigyKSB9IC8vICcwYicsICcwQicgLSBiaW5hcnkgbnVtYmVyXG4gICAgfVxuXG4gIC8vIEFueXRoaW5nIGVsc2UgYmVnaW5uaW5nIHdpdGggYSBkaWdpdCBpcyBhbiBpbnRlZ2VyLCBvY3RhbFxuICAvLyBudW1iZXIsIG9yIGZsb2F0LlxuICBjYXNlIDQ5OiBjYXNlIDUwOiBjYXNlIDUxOiBjYXNlIDUyOiBjYXNlIDUzOiBjYXNlIDU0OiBjYXNlIDU1OiBjYXNlIDU2OiBjYXNlIDU3OiAvLyAxLTlcbiAgICByZXR1cm4gdGhpcy5yZWFkTnVtYmVyKGZhbHNlKVxuXG4gIC8vIFF1b3RlcyBwcm9kdWNlIHN0cmluZ3MuXG4gIGNhc2UgMzQ6IGNhc2UgMzk6IC8vICdcIicsIFwiJ1wiXG4gICAgcmV0dXJuIHRoaXMucmVhZFN0cmluZyhjb2RlKVxuXG4gIC8vIE9wZXJhdG9ycyBhcmUgcGFyc2VkIGlubGluZSBpbiB0aW55IHN0YXRlIG1hY2hpbmVzLiAnPScgKDYxKSBpc1xuICAvLyBvZnRlbiByZWZlcnJlZCB0by4gYGZpbmlzaE9wYCBzaW1wbHkgc2tpcHMgdGhlIGFtb3VudCBvZlxuICAvLyBjaGFyYWN0ZXJzIGl0IGlzIGdpdmVuIGFzIHNlY29uZCBhcmd1bWVudCwgYW5kIHJldHVybnMgYSB0b2tlblxuICAvLyBvZiB0aGUgdHlwZSBnaXZlbiBieSBpdHMgZmlyc3QgYXJndW1lbnQuXG4gIGNhc2UgNDc6IC8vICcvJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9zbGFzaCgpXG5cbiAgY2FzZSAzNzogY2FzZSA0MjogLy8gJyUqJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9tdWx0X21vZHVsb19leHAoY29kZSlcblxuICBjYXNlIDEyNDogY2FzZSAzODogLy8gJ3wmJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9waXBlX2FtcChjb2RlKVxuXG4gIGNhc2UgOTQ6IC8vICdeJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9jYXJldCgpXG5cbiAgY2FzZSA0MzogY2FzZSA0NTogLy8gJystJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9wbHVzX21pbihjb2RlKVxuXG4gIGNhc2UgNjA6IGNhc2UgNjI6IC8vICc8PidcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fbHRfZ3QoY29kZSlcblxuICBjYXNlIDYxOiBjYXNlIDMzOiAvLyAnPSEnXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX2VxX2V4Y2woY29kZSlcblxuICBjYXNlIDYzOiAvLyAnPydcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fcXVlc3Rpb24oKVxuXG4gIGNhc2UgMTI2OiAvLyAnfidcbiAgICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLnByZWZpeCwgMSlcblxuICBjYXNlIDM1OiAvLyAnIydcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fbnVtYmVyU2lnbigpXG4gIH1cblxuICB0aGlzLnJhaXNlKHRoaXMucG9zLCBcIlVuZXhwZWN0ZWQgY2hhcmFjdGVyICdcIiArIGNvZGVQb2ludFRvU3RyaW5nKGNvZGUpICsgXCInXCIpO1xufTtcblxucHAuZmluaXNoT3AgPSBmdW5jdGlvbih0eXBlLCBzaXplKSB7XG4gIHZhciBzdHIgPSB0aGlzLmlucHV0LnNsaWNlKHRoaXMucG9zLCB0aGlzLnBvcyArIHNpemUpO1xuICB0aGlzLnBvcyArPSBzaXplO1xuICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlLCBzdHIpXG59O1xuXG5wcC5yZWFkUmVnZXhwID0gZnVuY3Rpb24oKSB7XG4gIHZhciBlc2NhcGVkLCBpbkNsYXNzLCBzdGFydCA9IHRoaXMucG9zO1xuICBmb3IgKDs7KSB7XG4gICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7IHRoaXMucmFpc2Uoc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgfVxuICAgIHZhciBjaCA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICBpZiAobGluZUJyZWFrLnRlc3QoY2gpKSB7IHRoaXMucmFpc2Uoc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTsgfVxuICAgIGlmICghZXNjYXBlZCkge1xuICAgICAgaWYgKGNoID09PSBcIltcIikgeyBpbkNsYXNzID0gdHJ1ZTsgfVxuICAgICAgZWxzZSBpZiAoY2ggPT09IFwiXVwiICYmIGluQ2xhc3MpIHsgaW5DbGFzcyA9IGZhbHNlOyB9XG4gICAgICBlbHNlIGlmIChjaCA9PT0gXCIvXCIgJiYgIWluQ2xhc3MpIHsgYnJlYWsgfVxuICAgICAgZXNjYXBlZCA9IGNoID09PSBcIlxcXFxcIjtcbiAgICB9IGVsc2UgeyBlc2NhcGVkID0gZmFsc2U7IH1cbiAgICArK3RoaXMucG9zO1xuICB9XG4gIHZhciBwYXR0ZXJuID0gdGhpcy5pbnB1dC5zbGljZShzdGFydCwgdGhpcy5wb3MpO1xuICArK3RoaXMucG9zO1xuICB2YXIgZmxhZ3NTdGFydCA9IHRoaXMucG9zO1xuICB2YXIgZmxhZ3MgPSB0aGlzLnJlYWRXb3JkMSgpO1xuICBpZiAodGhpcy5jb250YWluc0VzYykgeyB0aGlzLnVuZXhwZWN0ZWQoZmxhZ3NTdGFydCk7IH1cblxuICAvLyBWYWxpZGF0ZSBwYXR0ZXJuXG4gIHZhciBzdGF0ZSA9IHRoaXMucmVnZXhwU3RhdGUgfHwgKHRoaXMucmVnZXhwU3RhdGUgPSBuZXcgUmVnRXhwVmFsaWRhdGlvblN0YXRlKHRoaXMpKTtcbiAgc3RhdGUucmVzZXQoc3RhcnQsIHBhdHRlcm4sIGZsYWdzKTtcbiAgdGhpcy52YWxpZGF0ZVJlZ0V4cEZsYWdzKHN0YXRlKTtcbiAgdGhpcy52YWxpZGF0ZVJlZ0V4cFBhdHRlcm4oc3RhdGUpO1xuXG4gIC8vIENyZWF0ZSBMaXRlcmFsI3ZhbHVlIHByb3BlcnR5IHZhbHVlLlxuICB2YXIgdmFsdWUgPSBudWxsO1xuICB0cnkge1xuICAgIHZhbHVlID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBFU1RyZWUgcmVxdWlyZXMgbnVsbCBpZiBpdCBmYWlsZWQgdG8gaW5zdGFudGlhdGUgUmVnRXhwIG9iamVjdC5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZXN0cmVlL2VzdHJlZS9ibG9iL2EyNzAwM2FkZjRmZDdiZmFkNDRkZTljZWYzNzJhMmVhY2Q1MjdiMWMvZXM1Lm1kI3JlZ2V4cGxpdGVyYWxcbiAgfVxuXG4gIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEucmVnZXhwLCB7cGF0dGVybjogcGF0dGVybiwgZmxhZ3M6IGZsYWdzLCB2YWx1ZTogdmFsdWV9KVxufTtcblxuLy8gUmVhZCBhbiBpbnRlZ2VyIGluIHRoZSBnaXZlbiByYWRpeC4gUmV0dXJuIG51bGwgaWYgemVybyBkaWdpdHNcbi8vIHdlcmUgcmVhZCwgdGhlIGludGVnZXIgdmFsdWUgb3RoZXJ3aXNlLiBXaGVuIGBsZW5gIGlzIGdpdmVuLCB0aGlzXG4vLyB3aWxsIHJldHVybiBgbnVsbGAgdW5sZXNzIHRoZSBpbnRlZ2VyIGhhcyBleGFjdGx5IGBsZW5gIGRpZ2l0cy5cblxucHAucmVhZEludCA9IGZ1bmN0aW9uKHJhZGl4LCBsZW4sIG1heWJlTGVnYWN5T2N0YWxOdW1lcmljTGl0ZXJhbCkge1xuICAvLyBgbGVuYCBpcyB1c2VkIGZvciBjaGFyYWN0ZXIgZXNjYXBlIHNlcXVlbmNlcy4gSW4gdGhhdCBjYXNlLCBkaXNhbGxvdyBzZXBhcmF0b3JzLlxuICB2YXIgYWxsb3dTZXBhcmF0b3JzID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDEyICYmIGxlbiA9PT0gdW5kZWZpbmVkO1xuXG4gIC8vIGBtYXliZUxlZ2FjeU9jdGFsTnVtZXJpY0xpdGVyYWxgIGlzIHRydWUgaWYgaXQgZG9lc24ndCBoYXZlIHByZWZpeCAoMHgsMG8sMGIpXG4gIC8vIGFuZCBpc24ndCBmcmFjdGlvbiBwYXJ0IG5vciBleHBvbmVudCBwYXJ0LiBJbiB0aGF0IGNhc2UsIGlmIHRoZSBmaXJzdCBkaWdpdFxuICAvLyBpcyB6ZXJvIHRoZW4gZGlzYWxsb3cgc2VwYXJhdG9ycy5cbiAgdmFyIGlzTGVnYWN5T2N0YWxOdW1lcmljTGl0ZXJhbCA9IG1heWJlTGVnYWN5T2N0YWxOdW1lcmljTGl0ZXJhbCAmJiB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpID09PSA0ODtcblxuICB2YXIgc3RhcnQgPSB0aGlzLnBvcywgdG90YWwgPSAwLCBsYXN0Q29kZSA9IDA7XG4gIGZvciAodmFyIGkgPSAwLCBlID0gbGVuID09IG51bGwgPyBJbmZpbml0eSA6IGxlbjsgaSA8IGU7ICsraSwgKyt0aGlzLnBvcykge1xuICAgIHZhciBjb2RlID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKSwgdmFsID0gKHZvaWQgMCk7XG5cbiAgICBpZiAoYWxsb3dTZXBhcmF0b3JzICYmIGNvZGUgPT09IDk1KSB7XG4gICAgICBpZiAoaXNMZWdhY3lPY3RhbE51bWVyaWNMaXRlcmFsKSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnBvcywgXCJOdW1lcmljIHNlcGFyYXRvciBpcyBub3QgYWxsb3dlZCBpbiBsZWdhY3kgb2N0YWwgbnVtZXJpYyBsaXRlcmFsc1wiKTsgfVxuICAgICAgaWYgKGxhc3RDb2RlID09PSA5NSkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5wb3MsIFwiTnVtZXJpYyBzZXBhcmF0b3IgbXVzdCBiZSBleGFjdGx5IG9uZSB1bmRlcnNjb3JlXCIpOyB9XG4gICAgICBpZiAoaSA9PT0gMCkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5wb3MsIFwiTnVtZXJpYyBzZXBhcmF0b3IgaXMgbm90IGFsbG93ZWQgYXQgdGhlIGZpcnN0IG9mIGRpZ2l0c1wiKTsgfVxuICAgICAgbGFzdENvZGUgPSBjb2RlO1xuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICBpZiAoY29kZSA+PSA5NykgeyB2YWwgPSBjb2RlIC0gOTcgKyAxMDsgfSAvLyBhXG4gICAgZWxzZSBpZiAoY29kZSA+PSA2NSkgeyB2YWwgPSBjb2RlIC0gNjUgKyAxMDsgfSAvLyBBXG4gICAgZWxzZSBpZiAoY29kZSA+PSA0OCAmJiBjb2RlIDw9IDU3KSB7IHZhbCA9IGNvZGUgLSA0ODsgfSAvLyAwLTlcbiAgICBlbHNlIHsgdmFsID0gSW5maW5pdHk7IH1cbiAgICBpZiAodmFsID49IHJhZGl4KSB7IGJyZWFrIH1cbiAgICBsYXN0Q29kZSA9IGNvZGU7XG4gICAgdG90YWwgPSB0b3RhbCAqIHJhZGl4ICsgdmFsO1xuICB9XG5cbiAgaWYgKGFsbG93U2VwYXJhdG9ycyAmJiBsYXN0Q29kZSA9PT0gOTUpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMucG9zIC0gMSwgXCJOdW1lcmljIHNlcGFyYXRvciBpcyBub3QgYWxsb3dlZCBhdCB0aGUgbGFzdCBvZiBkaWdpdHNcIik7IH1cbiAgaWYgKHRoaXMucG9zID09PSBzdGFydCB8fCBsZW4gIT0gbnVsbCAmJiB0aGlzLnBvcyAtIHN0YXJ0ICE9PSBsZW4pIHsgcmV0dXJuIG51bGwgfVxuXG4gIHJldHVybiB0b3RhbFxufTtcblxuZnVuY3Rpb24gc3RyaW5nVG9OdW1iZXIoc3RyLCBpc0xlZ2FjeU9jdGFsTnVtZXJpY0xpdGVyYWwpIHtcbiAgaWYgKGlzTGVnYWN5T2N0YWxOdW1lcmljTGl0ZXJhbCkge1xuICAgIHJldHVybiBwYXJzZUludChzdHIsIDgpXG4gIH1cblxuICAvLyBgcGFyc2VGbG9hdCh2YWx1ZSlgIHN0b3BzIHBhcnNpbmcgYXQgdGhlIGZpcnN0IG51bWVyaWMgc2VwYXJhdG9yIHRoZW4gcmV0dXJucyBhIHdyb25nIHZhbHVlLlxuICByZXR1cm4gcGFyc2VGbG9hdChzdHIucmVwbGFjZSgvXy9nLCBcIlwiKSlcbn1cblxuZnVuY3Rpb24gc3RyaW5nVG9CaWdJbnQoc3RyKSB7XG4gIGlmICh0eXBlb2YgQmlnSW50ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLy8gYEJpZ0ludCh2YWx1ZSlgIHRocm93cyBzeW50YXggZXJyb3IgaWYgdGhlIHN0cmluZyBjb250YWlucyBudW1lcmljIHNlcGFyYXRvcnMuXG4gIHJldHVybiBCaWdJbnQoc3RyLnJlcGxhY2UoL18vZywgXCJcIikpXG59XG5cbnBwLnJlYWRSYWRpeE51bWJlciA9IGZ1bmN0aW9uKHJhZGl4KSB7XG4gIHZhciBzdGFydCA9IHRoaXMucG9zO1xuICB0aGlzLnBvcyArPSAyOyAvLyAweFxuICB2YXIgdmFsID0gdGhpcy5yZWFkSW50KHJhZGl4KTtcbiAgaWYgKHZhbCA9PSBudWxsKSB7IHRoaXMucmFpc2UodGhpcy5zdGFydCArIDIsIFwiRXhwZWN0ZWQgbnVtYmVyIGluIHJhZGl4IFwiICsgcmFkaXgpOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTEgJiYgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKSA9PT0gMTEwKSB7XG4gICAgdmFsID0gc3RyaW5nVG9CaWdJbnQodGhpcy5pbnB1dC5zbGljZShzdGFydCwgdGhpcy5wb3MpKTtcbiAgICArK3RoaXMucG9zO1xuICB9IGVsc2UgaWYgKGlzSWRlbnRpZmllclN0YXJ0KHRoaXMuZnVsbENoYXJDb2RlQXRQb3MoKSkpIHsgdGhpcy5yYWlzZSh0aGlzLnBvcywgXCJJZGVudGlmaWVyIGRpcmVjdGx5IGFmdGVyIG51bWJlclwiKTsgfVxuICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLm51bSwgdmFsKVxufTtcblxuLy8gUmVhZCBhbiBpbnRlZ2VyLCBvY3RhbCBpbnRlZ2VyLCBvciBmbG9hdGluZy1wb2ludCBudW1iZXIuXG5cbnBwLnJlYWROdW1iZXIgPSBmdW5jdGlvbihzdGFydHNXaXRoRG90KSB7XG4gIHZhciBzdGFydCA9IHRoaXMucG9zO1xuICBpZiAoIXN0YXJ0c1dpdGhEb3QgJiYgdGhpcy5yZWFkSW50KDEwLCB1bmRlZmluZWQsIHRydWUpID09PSBudWxsKSB7IHRoaXMucmFpc2Uoc3RhcnQsIFwiSW52YWxpZCBudW1iZXJcIik7IH1cbiAgdmFyIG9jdGFsID0gdGhpcy5wb3MgLSBzdGFydCA+PSAyICYmIHRoaXMuaW5wdXQuY2hhckNvZGVBdChzdGFydCkgPT09IDQ4O1xuICBpZiAob2N0YWwgJiYgdGhpcy5zdHJpY3QpIHsgdGhpcy5yYWlzZShzdGFydCwgXCJJbnZhbGlkIG51bWJlclwiKTsgfVxuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gIGlmICghb2N0YWwgJiYgIXN0YXJ0c1dpdGhEb3QgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDExICYmIG5leHQgPT09IDExMCkge1xuICAgIHZhciB2YWwkMSA9IHN0cmluZ1RvQmlnSW50KHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQsIHRoaXMucG9zKSk7XG4gICAgKyt0aGlzLnBvcztcbiAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQodGhpcy5mdWxsQ2hhckNvZGVBdFBvcygpKSkgeyB0aGlzLnJhaXNlKHRoaXMucG9zLCBcIklkZW50aWZpZXIgZGlyZWN0bHkgYWZ0ZXIgbnVtYmVyXCIpOyB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5udW0sIHZhbCQxKVxuICB9XG4gIGlmIChvY3RhbCAmJiAvWzg5XS8udGVzdCh0aGlzLmlucHV0LnNsaWNlKHN0YXJ0LCB0aGlzLnBvcykpKSB7IG9jdGFsID0gZmFsc2U7IH1cbiAgaWYgKG5leHQgPT09IDQ2ICYmICFvY3RhbCkgeyAvLyAnLidcbiAgICArK3RoaXMucG9zO1xuICAgIHRoaXMucmVhZEludCgxMCk7XG4gICAgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gIH1cbiAgaWYgKChuZXh0ID09PSA2OSB8fCBuZXh0ID09PSAxMDEpICYmICFvY3RhbCkgeyAvLyAnZUUnXG4gICAgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCgrK3RoaXMucG9zKTtcbiAgICBpZiAobmV4dCA9PT0gNDMgfHwgbmV4dCA9PT0gNDUpIHsgKyt0aGlzLnBvczsgfSAvLyAnKy0nXG4gICAgaWYgKHRoaXMucmVhZEludCgxMCkgPT09IG51bGwpIHsgdGhpcy5yYWlzZShzdGFydCwgXCJJbnZhbGlkIG51bWJlclwiKTsgfVxuICB9XG4gIGlmIChpc0lkZW50aWZpZXJTdGFydCh0aGlzLmZ1bGxDaGFyQ29kZUF0UG9zKCkpKSB7IHRoaXMucmFpc2UodGhpcy5wb3MsIFwiSWRlbnRpZmllciBkaXJlY3RseSBhZnRlciBudW1iZXJcIik7IH1cblxuICB2YXIgdmFsID0gc3RyaW5nVG9OdW1iZXIodGhpcy5pbnB1dC5zbGljZShzdGFydCwgdGhpcy5wb3MpLCBvY3RhbCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEubnVtLCB2YWwpXG59O1xuXG4vLyBSZWFkIGEgc3RyaW5nIHZhbHVlLCBpbnRlcnByZXRpbmcgYmFja3NsYXNoLWVzY2FwZXMuXG5cbnBwLnJlYWRDb2RlUG9pbnQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKSwgY29kZTtcblxuICBpZiAoY2ggPT09IDEyMykgeyAvLyAneydcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgNikgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHZhciBjb2RlUG9zID0gKyt0aGlzLnBvcztcbiAgICBjb2RlID0gdGhpcy5yZWFkSGV4Q2hhcih0aGlzLmlucHV0LmluZGV4T2YoXCJ9XCIsIHRoaXMucG9zKSAtIHRoaXMucG9zKTtcbiAgICArK3RoaXMucG9zO1xuICAgIGlmIChjb2RlID4gMHgxMEZGRkYpIHsgdGhpcy5pbnZhbGlkU3RyaW5nVG9rZW4oY29kZVBvcywgXCJDb2RlIHBvaW50IG91dCBvZiBib3VuZHNcIik7IH1cbiAgfSBlbHNlIHtcbiAgICBjb2RlID0gdGhpcy5yZWFkSGV4Q2hhcig0KTtcbiAgfVxuICByZXR1cm4gY29kZVxufTtcblxucHAucmVhZFN0cmluZyA9IGZ1bmN0aW9uKHF1b3RlKSB7XG4gIHZhciBvdXQgPSBcIlwiLCBjaHVua1N0YXJ0ID0gKyt0aGlzLnBvcztcbiAgZm9yICg7Oykge1xuICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmlucHV0Lmxlbmd0aCkgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudFwiKTsgfVxuICAgIHZhciBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gICAgaWYgKGNoID09PSBxdW90ZSkgeyBicmVhayB9XG4gICAgaWYgKGNoID09PSA5MikgeyAvLyAnXFwnXG4gICAgICBvdXQgKz0gdGhpcy5pbnB1dC5zbGljZShjaHVua1N0YXJ0LCB0aGlzLnBvcyk7XG4gICAgICBvdXQgKz0gdGhpcy5yZWFkRXNjYXBlZENoYXIoZmFsc2UpO1xuICAgICAgY2h1bmtTdGFydCA9IHRoaXMucG9zO1xuICAgIH0gZWxzZSBpZiAoY2ggPT09IDB4MjAyOCB8fCBjaCA9PT0gMHgyMDI5KSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgMTApIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIlVudGVybWluYXRlZCBzdHJpbmcgY29uc3RhbnRcIik7IH1cbiAgICAgICsrdGhpcy5wb3M7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykge1xuICAgICAgICB0aGlzLmN1ckxpbmUrKztcbiAgICAgICAgdGhpcy5saW5lU3RhcnQgPSB0aGlzLnBvcztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGlzTmV3TGluZShjaCkpIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIlVudGVybWluYXRlZCBzdHJpbmcgY29uc3RhbnRcIik7IH1cbiAgICAgICsrdGhpcy5wb3M7XG4gICAgfVxuICB9XG4gIG91dCArPSB0aGlzLmlucHV0LnNsaWNlKGNodW5rU3RhcnQsIHRoaXMucG9zKyspO1xuICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLnN0cmluZywgb3V0KVxufTtcblxuLy8gUmVhZHMgdGVtcGxhdGUgc3RyaW5nIHRva2Vucy5cblxudmFyIElOVkFMSURfVEVNUExBVEVfRVNDQVBFX0VSUk9SID0ge307XG5cbnBwLnRyeVJlYWRUZW1wbGF0ZVRva2VuID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuaW5UZW1wbGF0ZUVsZW1lbnQgPSB0cnVlO1xuICB0cnkge1xuICAgIHRoaXMucmVhZFRtcGxUb2tlbigpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyID09PSBJTlZBTElEX1RFTVBMQVRFX0VTQ0FQRV9FUlJPUikge1xuICAgICAgdGhpcy5yZWFkSW52YWxpZFRlbXBsYXRlVG9rZW4oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZXJyXG4gICAgfVxuICB9XG5cbiAgdGhpcy5pblRlbXBsYXRlRWxlbWVudCA9IGZhbHNlO1xufTtcblxucHAuaW52YWxpZFN0cmluZ1Rva2VuID0gZnVuY3Rpb24ocG9zaXRpb24sIG1lc3NhZ2UpIHtcbiAgaWYgKHRoaXMuaW5UZW1wbGF0ZUVsZW1lbnQgJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkpIHtcbiAgICB0aHJvdyBJTlZBTElEX1RFTVBMQVRFX0VTQ0FQRV9FUlJPUlxuICB9IGVsc2Uge1xuICAgIHRoaXMucmFpc2UocG9zaXRpb24sIG1lc3NhZ2UpO1xuICB9XG59O1xuXG5wcC5yZWFkVG1wbFRva2VuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBvdXQgPSBcIlwiLCBjaHVua1N0YXJ0ID0gdGhpcy5wb3M7XG4gIGZvciAoOzspIHtcbiAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5pbnB1dC5sZW5ndGgpIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIlVudGVybWluYXRlZCB0ZW1wbGF0ZVwiKTsgfVxuICAgIHZhciBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gICAgaWYgKGNoID09PSA5NiB8fCBjaCA9PT0gMzYgJiYgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSkgPT09IDEyMykgeyAvLyAnYCcsICckeydcbiAgICAgIGlmICh0aGlzLnBvcyA9PT0gdGhpcy5zdGFydCAmJiAodGhpcy50eXBlID09PSB0eXBlcyQxLnRlbXBsYXRlIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5pbnZhbGlkVGVtcGxhdGUpKSB7XG4gICAgICAgIGlmIChjaCA9PT0gMzYpIHtcbiAgICAgICAgICB0aGlzLnBvcyArPSAyO1xuICAgICAgICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuZG9sbGFyQnJhY2VMKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICsrdGhpcy5wb3M7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5iYWNrUXVvdGUpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG91dCArPSB0aGlzLmlucHV0LnNsaWNlKGNodW5rU3RhcnQsIHRoaXMucG9zKTtcbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEudGVtcGxhdGUsIG91dClcbiAgICB9XG4gICAgaWYgKGNoID09PSA5MikgeyAvLyAnXFwnXG4gICAgICBvdXQgKz0gdGhpcy5pbnB1dC5zbGljZShjaHVua1N0YXJ0LCB0aGlzLnBvcyk7XG4gICAgICBvdXQgKz0gdGhpcy5yZWFkRXNjYXBlZENoYXIodHJ1ZSk7XG4gICAgICBjaHVua1N0YXJ0ID0gdGhpcy5wb3M7XG4gICAgfSBlbHNlIGlmIChpc05ld0xpbmUoY2gpKSB7XG4gICAgICBvdXQgKz0gdGhpcy5pbnB1dC5zbGljZShjaHVua1N0YXJ0LCB0aGlzLnBvcyk7XG4gICAgICArK3RoaXMucG9zO1xuICAgICAgc3dpdGNoIChjaCkge1xuICAgICAgY2FzZSAxMzpcbiAgICAgICAgaWYgKHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcykgPT09IDEwKSB7ICsrdGhpcy5wb3M7IH1cbiAgICAgIGNhc2UgMTA6XG4gICAgICAgIG91dCArPSBcIlxcblwiO1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgb3V0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2gpO1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHtcbiAgICAgICAgKyt0aGlzLmN1ckxpbmU7XG4gICAgICAgIHRoaXMubGluZVN0YXJ0ID0gdGhpcy5wb3M7XG4gICAgICB9XG4gICAgICBjaHVua1N0YXJ0ID0gdGhpcy5wb3M7XG4gICAgfSBlbHNlIHtcbiAgICAgICsrdGhpcy5wb3M7XG4gICAgfVxuICB9XG59O1xuXG4vLyBSZWFkcyBhIHRlbXBsYXRlIHRva2VuIHRvIHNlYXJjaCBmb3IgdGhlIGVuZCwgd2l0aG91dCB2YWxpZGF0aW5nIGFueSBlc2NhcGUgc2VxdWVuY2VzXG5wcC5yZWFkSW52YWxpZFRlbXBsYXRlVG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgZm9yICg7IHRoaXMucG9zIDwgdGhpcy5pbnB1dC5sZW5ndGg7IHRoaXMucG9zKyspIHtcbiAgICBzd2l0Y2ggKHRoaXMuaW5wdXRbdGhpcy5wb3NdKSB7XG4gICAgY2FzZSBcIlxcXFxcIjpcbiAgICAgICsrdGhpcy5wb3M7XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIiRcIjpcbiAgICAgIGlmICh0aGlzLmlucHV0W3RoaXMucG9zICsgMV0gIT09IFwie1wiKSB7IGJyZWFrIH1cbiAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgIGNhc2UgXCJgXCI6XG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmludmFsaWRUZW1wbGF0ZSwgdGhpcy5pbnB1dC5zbGljZSh0aGlzLnN0YXJ0LCB0aGlzLnBvcykpXG5cbiAgICBjYXNlIFwiXFxyXCI6XG4gICAgICBpZiAodGhpcy5pbnB1dFt0aGlzLnBvcyArIDFdID09PSBcIlxcblwiKSB7ICsrdGhpcy5wb3M7IH1cbiAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgIGNhc2UgXCJcXG5cIjogY2FzZSBcIlxcdTIwMjhcIjogY2FzZSBcIlxcdTIwMjlcIjpcbiAgICAgICsrdGhpcy5jdXJMaW5lO1xuICAgICAgdGhpcy5saW5lU3RhcnQgPSB0aGlzLnBvcyArIDE7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHRlbXBsYXRlXCIpO1xufTtcblxuLy8gVXNlZCB0byByZWFkIGVzY2FwZWQgY2hhcmFjdGVyc1xuXG5wcC5yZWFkRXNjYXBlZENoYXIgPSBmdW5jdGlvbihpblRlbXBsYXRlKSB7XG4gIHZhciBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCgrK3RoaXMucG9zKTtcbiAgKyt0aGlzLnBvcztcbiAgc3dpdGNoIChjaCkge1xuICBjYXNlIDExMDogcmV0dXJuIFwiXFxuXCIgLy8gJ24nIC0+ICdcXG4nXG4gIGNhc2UgMTE0OiByZXR1cm4gXCJcXHJcIiAvLyAncicgLT4gJ1xccidcbiAgY2FzZSAxMjA6IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKHRoaXMucmVhZEhleENoYXIoMikpIC8vICd4J1xuICBjYXNlIDExNzogcmV0dXJuIGNvZGVQb2ludFRvU3RyaW5nKHRoaXMucmVhZENvZGVQb2ludCgpKSAvLyAndSdcbiAgY2FzZSAxMTY6IHJldHVybiBcIlxcdFwiIC8vICd0JyAtPiAnXFx0J1xuICBjYXNlIDk4OiByZXR1cm4gXCJcXGJcIiAvLyAnYicgLT4gJ1xcYidcbiAgY2FzZSAxMTg6IHJldHVybiBcIlxcdTAwMGJcIiAvLyAndicgLT4gJ1xcdTAwMGInXG4gIGNhc2UgMTAyOiByZXR1cm4gXCJcXGZcIiAvLyAnZicgLT4gJ1xcZidcbiAgY2FzZSAxMzogaWYgKHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcykgPT09IDEwKSB7ICsrdGhpcy5wb3M7IH0gLy8gJ1xcclxcbidcbiAgY2FzZSAxMDogLy8gJyBcXG4nXG4gICAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHsgdGhpcy5saW5lU3RhcnQgPSB0aGlzLnBvczsgKyt0aGlzLmN1ckxpbmU7IH1cbiAgICByZXR1cm4gXCJcIlxuICBjYXNlIDU2OlxuICBjYXNlIDU3OlxuICAgIGlmICh0aGlzLnN0cmljdCkge1xuICAgICAgdGhpcy5pbnZhbGlkU3RyaW5nVG9rZW4oXG4gICAgICAgIHRoaXMucG9zIC0gMSxcbiAgICAgICAgXCJJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZVwiXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoaW5UZW1wbGF0ZSkge1xuICAgICAgdmFyIGNvZGVQb3MgPSB0aGlzLnBvcyAtIDE7XG5cbiAgICAgIHRoaXMuaW52YWxpZFN0cmluZ1Rva2VuKFxuICAgICAgICBjb2RlUG9zLFxuICAgICAgICBcIkludmFsaWQgZXNjYXBlIHNlcXVlbmNlIGluIHRlbXBsYXRlIHN0cmluZ1wiXG4gICAgICApO1xuICAgIH1cbiAgZGVmYXVsdDpcbiAgICBpZiAoY2ggPj0gNDggJiYgY2ggPD0gNTUpIHtcbiAgICAgIHZhciBvY3RhbFN0ciA9IHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMucG9zIC0gMSwgMykubWF0Y2goL15bMC03XSsvKVswXTtcbiAgICAgIHZhciBvY3RhbCA9IHBhcnNlSW50KG9jdGFsU3RyLCA4KTtcbiAgICAgIGlmIChvY3RhbCA+IDI1NSkge1xuICAgICAgICBvY3RhbFN0ciA9IG9jdGFsU3RyLnNsaWNlKDAsIC0xKTtcbiAgICAgICAgb2N0YWwgPSBwYXJzZUludChvY3RhbFN0ciwgOCk7XG4gICAgICB9XG4gICAgICB0aGlzLnBvcyArPSBvY3RhbFN0ci5sZW5ndGggLSAxO1xuICAgICAgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpO1xuICAgICAgaWYgKChvY3RhbFN0ciAhPT0gXCIwXCIgfHwgY2ggPT09IDU2IHx8IGNoID09PSA1NykgJiYgKHRoaXMuc3RyaWN0IHx8IGluVGVtcGxhdGUpKSB7XG4gICAgICAgIHRoaXMuaW52YWxpZFN0cmluZ1Rva2VuKFxuICAgICAgICAgIHRoaXMucG9zIC0gMSAtIG9jdGFsU3RyLmxlbmd0aCxcbiAgICAgICAgICBpblRlbXBsYXRlXG4gICAgICAgICAgICA/IFwiT2N0YWwgbGl0ZXJhbCBpbiB0ZW1wbGF0ZSBzdHJpbmdcIlxuICAgICAgICAgICAgOiBcIk9jdGFsIGxpdGVyYWwgaW4gc3RyaWN0IG1vZGVcIlxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUob2N0YWwpXG4gICAgfVxuICAgIGlmIChpc05ld0xpbmUoY2gpKSB7XG4gICAgICAvLyBVbmljb2RlIG5ldyBsaW5lIGNoYXJhY3RlcnMgYWZ0ZXIgXFwgZ2V0IHJlbW92ZWQgZnJvbSBvdXRwdXQgaW4gYm90aFxuICAgICAgLy8gdGVtcGxhdGUgbGl0ZXJhbHMgYW5kIHN0cmluZ3NcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7IHRoaXMubGluZVN0YXJ0ID0gdGhpcy5wb3M7ICsrdGhpcy5jdXJMaW5lOyB9XG4gICAgICByZXR1cm4gXCJcIlxuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjaClcbiAgfVxufTtcblxuLy8gVXNlZCB0byByZWFkIGNoYXJhY3RlciBlc2NhcGUgc2VxdWVuY2VzICgnXFx4JywgJ1xcdScsICdcXFUnKS5cblxucHAucmVhZEhleENoYXIgPSBmdW5jdGlvbihsZW4pIHtcbiAgdmFyIGNvZGVQb3MgPSB0aGlzLnBvcztcbiAgdmFyIG4gPSB0aGlzLnJlYWRJbnQoMTYsIGxlbik7XG4gIGlmIChuID09PSBudWxsKSB7IHRoaXMuaW52YWxpZFN0cmluZ1Rva2VuKGNvZGVQb3MsIFwiQmFkIGNoYXJhY3RlciBlc2NhcGUgc2VxdWVuY2VcIik7IH1cbiAgcmV0dXJuIG5cbn07XG5cbi8vIFJlYWQgYW4gaWRlbnRpZmllciwgYW5kIHJldHVybiBpdCBhcyBhIHN0cmluZy4gU2V0cyBgdGhpcy5jb250YWluc0VzY2Bcbi8vIHRvIHdoZXRoZXIgdGhlIHdvcmQgY29udGFpbmVkIGEgJ1xcdScgZXNjYXBlLlxuLy9cbi8vIEluY3JlbWVudGFsbHkgYWRkcyBvbmx5IGVzY2FwZWQgY2hhcnMsIGFkZGluZyBvdGhlciBjaHVua3MgYXMtaXNcbi8vIGFzIGEgbWljcm8tb3B0aW1pemF0aW9uLlxuXG5wcC5yZWFkV29yZDEgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jb250YWluc0VzYyA9IGZhbHNlO1xuICB2YXIgd29yZCA9IFwiXCIsIGZpcnN0ID0gdHJ1ZSwgY2h1bmtTdGFydCA9IHRoaXMucG9zO1xuICB2YXIgYXN0cmFsID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDY7XG4gIHdoaWxlICh0aGlzLnBvcyA8IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgdmFyIGNoID0gdGhpcy5mdWxsQ2hhckNvZGVBdFBvcygpO1xuICAgIGlmIChpc0lkZW50aWZpZXJDaGFyKGNoLCBhc3RyYWwpKSB7XG4gICAgICB0aGlzLnBvcyArPSBjaCA8PSAweGZmZmYgPyAxIDogMjtcbiAgICB9IGVsc2UgaWYgKGNoID09PSA5MikgeyAvLyBcIlxcXCJcbiAgICAgIHRoaXMuY29udGFpbnNFc2MgPSB0cnVlO1xuICAgICAgd29yZCArPSB0aGlzLmlucHV0LnNsaWNlKGNodW5rU3RhcnQsIHRoaXMucG9zKTtcbiAgICAgIHZhciBlc2NTdGFydCA9IHRoaXMucG9zO1xuICAgICAgaWYgKHRoaXMuaW5wdXQuY2hhckNvZGVBdCgrK3RoaXMucG9zKSAhPT0gMTE3KSAvLyBcInVcIlxuICAgICAgICB7IHRoaXMuaW52YWxpZFN0cmluZ1Rva2VuKHRoaXMucG9zLCBcIkV4cGVjdGluZyBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZSBcXFxcdVhYWFhcIik7IH1cbiAgICAgICsrdGhpcy5wb3M7XG4gICAgICB2YXIgZXNjID0gdGhpcy5yZWFkQ29kZVBvaW50KCk7XG4gICAgICBpZiAoIShmaXJzdCA/IGlzSWRlbnRpZmllclN0YXJ0IDogaXNJZGVudGlmaWVyQ2hhcikoZXNjLCBhc3RyYWwpKVxuICAgICAgICB7IHRoaXMuaW52YWxpZFN0cmluZ1Rva2VuKGVzY1N0YXJ0LCBcIkludmFsaWQgVW5pY29kZSBlc2NhcGVcIik7IH1cbiAgICAgIHdvcmQgKz0gY29kZVBvaW50VG9TdHJpbmcoZXNjKTtcbiAgICAgIGNodW5rU3RhcnQgPSB0aGlzLnBvcztcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgZmlyc3QgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gd29yZCArIHRoaXMuaW5wdXQuc2xpY2UoY2h1bmtTdGFydCwgdGhpcy5wb3MpXG59O1xuXG4vLyBSZWFkIGFuIGlkZW50aWZpZXIgb3Iga2V5d29yZCB0b2tlbi4gV2lsbCBjaGVjayBmb3IgcmVzZXJ2ZWRcbi8vIHdvcmRzIHdoZW4gbmVjZXNzYXJ5LlxuXG5wcC5yZWFkV29yZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgd29yZCA9IHRoaXMucmVhZFdvcmQxKCk7XG4gIHZhciB0eXBlID0gdHlwZXMkMS5uYW1lO1xuICBpZiAodGhpcy5rZXl3b3Jkcy50ZXN0KHdvcmQpKSB7XG4gICAgdHlwZSA9IGtleXdvcmRzW3dvcmRdO1xuICB9XG4gIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGUsIHdvcmQpXG59O1xuXG4vLyBBY29ybiBpcyBhIHRpbnksIGZhc3QgSmF2YVNjcmlwdCBwYXJzZXIgd3JpdHRlbiBpbiBKYXZhU2NyaXB0LlxuLy9cbi8vIEFjb3JuIHdhcyB3cml0dGVuIGJ5IE1hcmlqbiBIYXZlcmJla2UsIEluZ3ZhciBTdGVwYW55YW4sIGFuZFxuLy8gdmFyaW91cyBjb250cmlidXRvcnMgYW5kIHJlbGVhc2VkIHVuZGVyIGFuIE1JVCBsaWNlbnNlLlxuLy9cbi8vIEdpdCByZXBvc2l0b3JpZXMgZm9yIEFjb3JuIGFyZSBhdmFpbGFibGUgYXRcbi8vXG4vLyAgICAgaHR0cDovL21hcmlqbmhhdmVyYmVrZS5ubC9naXQvYWNvcm5cbi8vICAgICBodHRwczovL2dpdGh1Yi5jb20vYWNvcm5qcy9hY29ybi5naXRcbi8vXG4vLyBQbGVhc2UgdXNlIHRoZSBbZ2l0aHViIGJ1ZyB0cmFja2VyXVtnaGJ0XSB0byByZXBvcnQgaXNzdWVzLlxuLy9cbi8vIFtnaGJ0XTogaHR0cHM6Ly9naXRodWIuY29tL2Fjb3JuanMvYWNvcm4vaXNzdWVzXG5cblxudmFyIHZlcnNpb24gPSBcIjguMTYuMFwiO1xuXG5QYXJzZXIuYWNvcm4gPSB7XG4gIFBhcnNlcjogUGFyc2VyLFxuICB2ZXJzaW9uOiB2ZXJzaW9uLFxuICBkZWZhdWx0T3B0aW9uczogZGVmYXVsdE9wdGlvbnMsXG4gIFBvc2l0aW9uOiBQb3NpdGlvbixcbiAgU291cmNlTG9jYXRpb246IFNvdXJjZUxvY2F0aW9uLFxuICBnZXRMaW5lSW5mbzogZ2V0TGluZUluZm8sXG4gIE5vZGU6IE5vZGUsXG4gIFRva2VuVHlwZTogVG9rZW5UeXBlLFxuICB0b2tUeXBlczogdHlwZXMkMSxcbiAga2V5d29yZFR5cGVzOiBrZXl3b3JkcyxcbiAgVG9rQ29udGV4dDogVG9rQ29udGV4dCxcbiAgdG9rQ29udGV4dHM6IHR5cGVzLFxuICBpc0lkZW50aWZpZXJDaGFyOiBpc0lkZW50aWZpZXJDaGFyLFxuICBpc0lkZW50aWZpZXJTdGFydDogaXNJZGVudGlmaWVyU3RhcnQsXG4gIFRva2VuOiBUb2tlbixcbiAgaXNOZXdMaW5lOiBpc05ld0xpbmUsXG4gIGxpbmVCcmVhazogbGluZUJyZWFrLFxuICBsaW5lQnJlYWtHOiBsaW5lQnJlYWtHLFxuICBub25BU0NJSXdoaXRlc3BhY2U6IG5vbkFTQ0lJd2hpdGVzcGFjZVxufTtcblxuLy8gVGhlIG1haW4gZXhwb3J0ZWQgaW50ZXJmYWNlICh1bmRlciBgc2VsZi5hY29ybmAgd2hlbiBpbiB0aGVcbi8vIGJyb3dzZXIpIGlzIGEgYHBhcnNlYCBmdW5jdGlvbiB0aGF0IHRha2VzIGEgY29kZSBzdHJpbmcgYW5kIHJldHVybnNcbi8vIGFuIGFic3RyYWN0IHN5bnRheCB0cmVlIGFzIHNwZWNpZmllZCBieSB0aGUgW0VTVHJlZSBzcGVjXVtlc3RyZWVdLlxuLy9cbi8vIFtlc3RyZWVdOiBodHRwczovL2dpdGh1Yi5jb20vZXN0cmVlL2VzdHJlZVxuXG5mdW5jdGlvbiBwYXJzZShpbnB1dCwgb3B0aW9ucykge1xuICByZXR1cm4gUGFyc2VyLnBhcnNlKGlucHV0LCBvcHRpb25zKVxufVxuXG4vLyBUaGlzIGZ1bmN0aW9uIHRyaWVzIHRvIHBhcnNlIGEgc2luZ2xlIGV4cHJlc3Npb24gYXQgYSBnaXZlblxuLy8gb2Zmc2V0IGluIGEgc3RyaW5nLiBVc2VmdWwgZm9yIHBhcnNpbmcgbWl4ZWQtbGFuZ3VhZ2UgZm9ybWF0c1xuLy8gdGhhdCBlbWJlZCBKYXZhU2NyaXB0IGV4cHJlc3Npb25zLlxuXG5mdW5jdGlvbiBwYXJzZUV4cHJlc3Npb25BdChpbnB1dCwgcG9zLCBvcHRpb25zKSB7XG4gIHJldHVybiBQYXJzZXIucGFyc2VFeHByZXNzaW9uQXQoaW5wdXQsIHBvcywgb3B0aW9ucylcbn1cblxuLy8gQWNvcm4gaXMgb3JnYW5pemVkIGFzIGEgdG9rZW5pemVyIGFuZCBhIHJlY3Vyc2l2ZS1kZXNjZW50IHBhcnNlci5cbi8vIFRoZSBgdG9rZW5pemVyYCBleHBvcnQgcHJvdmlkZXMgYW4gaW50ZXJmYWNlIHRvIHRoZSB0b2tlbml6ZXIuXG5cbmZ1bmN0aW9uIHRva2VuaXplcihpbnB1dCwgb3B0aW9ucykge1xuICByZXR1cm4gUGFyc2VyLnRva2VuaXplcihpbnB1dCwgb3B0aW9ucylcbn1cblxuZXhwb3J0IHsgTm9kZSwgUGFyc2VyLCBQb3NpdGlvbiwgU291cmNlTG9jYXRpb24sIFRva0NvbnRleHQsIFRva2VuLCBUb2tlblR5cGUsIGRlZmF1bHRPcHRpb25zLCBnZXRMaW5lSW5mbywgaXNJZGVudGlmaWVyQ2hhciwgaXNJZGVudGlmaWVyU3RhcnQsIGlzTmV3TGluZSwga2V5d29yZHMgYXMga2V5d29yZFR5cGVzLCBsaW5lQnJlYWssIGxpbmVCcmVha0csIG5vbkFTQ0lJd2hpdGVzcGFjZSwgcGFyc2UsIHBhcnNlRXhwcmVzc2lvbkF0LCB0eXBlcyBhcyB0b2tDb250ZXh0cywgdHlwZXMkMSBhcyB0b2tUeXBlcywgdG9rZW5pemVyLCB2ZXJzaW9uIH07XG4iLCAiaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwibm9kZTpmcy9wcm9taXNlc1wiO1xuaW1wb3J0IHR5cGUge1J1bm5lcixGb2xkZXIsRmlsZW5hbWUsTHN0cixQb3MsUnVubmVyQmFzZX0gZnJvbSAnLi9kYXRhLmpzJ1xuaW1wb3J0IHtwYXJzZUV4cHJlc3Npb25BdCwgdHlwZSBOb2RlLHR5cGUgRXhwcmVzc2lvbix0eXBlIFNwcmVhZEVsZW1lbnQsIHR5cGUgUHJvcGVydHl9IGZyb20gXCJhY29yblwiXG5pbXBvcnQge1xuICB0eXBlIHMydCxcbiAgcmVzZXQsXG4gIGdyZWVuLFxuICBwayxcbiAgZ2V0X2Vycm9yLFxuICBpc19vYmplY3QsXG4gIGlzX2F0b20sXG4gIGRlZmF1bHRfZ2V0XG59IGZyb20gXCJAeWlnYWwvYmFzZV90eXBlc1wiO1xuaW50ZXJmYWNlIEFjb3JuU3ludGF4RXJyb3IgZXh0ZW5kcyBTeW50YXhFcnJvciB7XG4gIHBvczogbnVtYmVyOyAgICAgICAgLy8gc2FtZSBhcyByYWlzZWRBdFxuICByYWlzZWRBdDogbnVtYmVyOyAgIC8vIGluZGV4IGluIHNvdXJjZSBzdHJpbmcgd2hlcmUgZXJyb3Igb2NjdXJyZWRcbiAgbG9jPzoge1xuICAgIGxpbmU6IG51bWJlcjtcbiAgICBjb2x1bW46IG51bWJlcjtcbiAgfTtcbn1cbmZ1bmN0aW9uIGlzX2Fjb3JuX2Vycm9yKGU6IHVua25vd24pOmUgaXMgQWNvcm5TeW50YXhFcnJvciB7XG4gIHJldHVybiAoXG4gICAgZSBpbnN0YW5jZW9mIFN5bnRheEVycm9yICYmXG4gICAgdHlwZW9mIChlIGFzIEFjb3JuU3ludGF4RXJyb3IpLnJhaXNlZEF0ID09PSBcIm51bWJlclwiXG4gICk7XG59XG5leHBvcnQgZnVuY3Rpb24gZmluZF9iYXNlKHJvb3Q6Rm9sZGVyLGlkOnN0cmluZyl7XG4gIGZ1bmN0aW9uIGYoZm9sZGVyOkZvbGRlcik6UnVubmVyQmFzZXx1bmRlZmluZWR7XG4gICAgZm9yIChjb25zdCBhciBvZiBbZm9sZGVyLnJ1bm5lcnMsZm9sZGVyLmVycm9ycyxmb2xkZXIuZm9sZGVyc10pe1xuICAgICAgY29uc3QgYW5zPWFyLmZpbmQoeD0+eC5pZD09PWlkKVxuICAgICAgaWYgKGFucyE9bnVsbClcbiAgICAgICAgcmV0dXJuIGFuc1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHN1YmZvbGRlciBvZiBmb2xkZXIuZm9sZGVycyl7XG4gICAgICBjb25zdCBhbnM9ZihzdWJmb2xkZXIpXG4gICAgICBpZiAoYW5zIT1udWxsKVxuICAgICAgICByZXR1cm4gYW5zXG4gICAgfVxuICB9XG4gIHJldHVybiBmKHJvb3QpXG59XG5leHBvcnQgZnVuY3Rpb24gZmluZF9ydW5uZXIocm9vdDpGb2xkZXIsaWQ6c3RyaW5nKXtcbiAgZnVuY3Rpb24gZihmb2xkZXI6Rm9sZGVyKTpSdW5uZXJ8dW5kZWZpbmVke1xuICAgIGNvbnN0IGFucz1mb2xkZXIucnVubmVycy5maW5kKHg9PnguaWQ9PT1pZClcbiAgICBpZiAoYW5zIT1udWxsKVxuICAgICAgcmV0dXJuIGFuc1xuICAgIGZvciAoY29uc3Qgc3ViZm9sZGVyIG9mIGZvbGRlci5mb2xkZXJzKXtcbiAgICAgIGNvbnN0IGFucz1mKHN1YmZvbGRlcilcbiAgICAgIGlmIChhbnMhPW51bGwpXG4gICAgICAgIHJldHVybiBhbnNcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGYocm9vdClcbn1cbmZ1bmN0aW9uIGlzX2xpdGVyYWwoYXN0OkV4cHJlc3Npb24sbGl0ZXJhbDpzdHJpbmcpe1xuICBpZiAoYXN0LnR5cGU9PT0nTGl0ZXJhbCcgJiYgYXN0LnZhbHVlPT09bGl0ZXJhbClcbiAgICByZXR1cm4gdHJ1ZVxufVxuZnVuY3Rpb24gZmluZF9wcm9wKGFzdDpFeHByZXNzaW9uLG5hbWU6c3RyaW5nKXtcbiAgaWYgKGFzdC50eXBlIT09J09iamVjdEV4cHJlc3Npb24nKVxuICAgIHJldHVyblxuICAvL2NvbnNvbGUubG9nKGFzdClcbiAgZm9yIChjb25zdCBwcm9wIG9mIGFzdC5wcm9wZXJ0aWVzKVxuICAgIGlmIChwcm9wLnR5cGU9PT0nUHJvcGVydHknICYmIGlzX2xpdGVyYWwocHJvcC5rZXksbmFtZSkpXG4gICAgICByZXR1cm4gcHJvcC52YWx1ZVxufVxuIGNsYXNzIEFzdEV4Y2VwdGlvbiBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgIGFzdDogTm9kZXxMc3RyXG4gICl7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gXCJBc3RFeGNlcHRpb25cIjtcbiAgfVxufVxuZnVuY3Rpb24gcmVhZF9wcm9wKGFzdDpQcm9wZXJ0eXxTcHJlYWRFbGVtZW50KXtcbiAgICBpZiAoXG4gICAgICBhc3QudHlwZSE9PVwiUHJvcGVydHlcIiB8fCBcbiAgICAgIGFzdC5rZXkudHlwZSE9PSdMaXRlcmFsJyB8fCBcbiAgICAgIGFzdC52YWx1ZS50eXBlIT09J0xpdGVyYWwnIHx8IFxuICAgICAgdHlwZW9mIGFzdC5rZXkudmFsdWUgIT09J3N0cmluZycgfHxcbiAgICAgIHR5cGVvZiBhc3QudmFsdWUudmFsdWUgIT09J3N0cmluZydcbiAgICApXG4gICAgICB0aHJvdyAgbmV3IEFzdEV4Y2VwdGlvbignZXhwZWN0aW5nIFwibmFtZVwiPVwidmFsdWVcIicsYXN0KVxuICAgIHJldHVybiB7a2V5OmFzdC5rZXkudmFsdWUsc3RyOmFzdC52YWx1ZS52YWx1ZSwuLi5wayhhc3QsJ3N0YXJ0JywnZW5kJyl9XG59XG5mdW5jdGlvbiByZWFkX3Byb3BfYW55KGFzdDpQcm9wZXJ0eXxTcHJlYWRFbGVtZW50KXtcbiAgaWYgKFxuICAgIGFzdC50eXBlIT09XCJQcm9wZXJ0eVwiIHx8IFxuICAgIGFzdC5rZXkudHlwZSE9PSdMaXRlcmFsJyB8fCBcbiAgICB0eXBlb2YgYXN0LmtleS52YWx1ZSAhPT0nc3RyaW5nJ1xuICApXG4gICAgdGhyb3cgIG5ldyBBc3RFeGNlcHRpb24oJ2V4cGVjdGluZyBcIm5hbWVcIj12YWx1ZScsYXN0KVxuICByZXR1cm4ge1xuICAgIGtleTphc3Qua2V5LnZhbHVlLFxuICAgIHZhbHVlOmFzdC52YWx1ZVxuICB9XG59XG5mdW5jdGlvbiBnZXRfZXJyYXlfbWFuZGF0b3J5KGFzdDpFeHByZXNzaW9uLHNvdXJjZV9maWxlOnN0cmluZyl7XG4gIGNvbnN0IGFuczpMc3RyW109W10gIFxuICBpZiAoYXN0LnR5cGU9PT1cIkFycmF5RXhwcmVzc2lvblwiKXtcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgYXN0LmVsZW1lbnRzKXtcbiAgICAgIGlmIChlbGVtPT1udWxsKVxuICAgICAgICB0aHJvdyBuZXcgQXN0RXhjZXB0aW9uKCdudWxsIG5vdCBzdXBwb3J0ZWQgaGVyZScsYXN0KVxuICAgICAgaWYgKGVsZW0udHlwZT09PVwiU3ByZWFkRWxlbWVudFwiKVxuICAgICAgICB0aHJvdyBuZXcgQXN0RXhjZXB0aW9uKCdzcHJlYWQgZWxlbWVudCBub3Qgc3VwcG9ydGVkIGhlcmUnLGVsZW0pXG4gICAgICBpZiAoZWxlbS50eXBlIT09J0xpdGVyYWwnIHx8IHR5cGVvZiBlbGVtLnZhbHVlIT09J3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBBc3RFeGNlcHRpb24oJ2V4cGVjdGluZyBzdHJpbmcgaGVyZScsZWxlbSlcbiAgICAgIGFucy5wdXNoKHtcbiAgICAgICAgc3RyOmVsZW0udmFsdWUsXG4gICAgICAgIHNvdXJjZV9maWxlLFxuICAgICAgICAuLi5wayhlbGVtLCdzdGFydCcsJ2VuZCcpXG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gYW5zXG4gIH1cbiAgdGhyb3cgbmV3IEFzdEV4Y2VwdGlvbignZXhwZWN0aW5nIGFycmF5Jyxhc3QpXG59XG5mdW5jdGlvbiBnZXRfYXJyYXkoYXN0OkV4cHJlc3Npb24sc291cmNlX2ZpbGU6c3RyaW5nKTpMc3RyW117XG4gIGlmIChhc3QudHlwZT09PVwiTGl0ZXJhbFwiICYmIHR5cGVvZiBhc3QudmFsdWUgPT09XCJzdHJpbmdcIil7XG4gICAgY29uc3QgbG9jYXRpb249e1xuICAgICAgc3RyOmFzdC52YWx1ZSxcbiAgICAgIHNvdXJjZV9maWxlLFxuICAgICAgLi4ucGsoYXN0LCdzdGFydCcsJ2VuZCcpXG4gICAgfVxuICAgIHJldHVybiBbbG9jYXRpb25dXG4gIH1cbiAgcmV0dXJuIGdldF9lcnJheV9tYW5kYXRvcnkoYXN0LHNvdXJjZV9maWxlKVxufVxuZnVuY3Rpb24gbWFrZV91bmlxdWUoYXI6THN0cltdW10pOkxzdHJbXXtcbiAgY29uc3QgYW5zOnMydDxMc3RyPj17fVxuICBmb3IgKGNvbnN0IGEgb2YgYXIpXG4gICAgZm9yIChjb25zdCBiIG9mIGEpXG4gICAgICBhbnNbYi5zdHJdPWJcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYW5zKVxufVxuZnVuY3Rpb24gc3RyaXBfJChhOkxzdHIpe1xuICByZXR1cm4gey4uLmEsc3RyOmEuc3RyLnNsaWNlKDEpfVxufVxuZnVuY3Rpb24gcmVzb2x2ZV92YXJzKHZhcnM6czJ0PExzdHJbXT4sYXN0OkV4cHJlc3Npb24pe1xuICAgIGZ1bmN0aW9uIHJlc29sdmUoYTpMc3RyfExzdHJbXSl7XG4gICAgICBjb25zdCB2aXNpdGluZz1uZXcgU2V0PHN0cmluZz5cbiAgICAgIGZ1bmN0aW9uIGYoYTpMc3RyfExzdHJbXSk6THN0cltde1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhKSlcbiAgICAgICAgICByZXR1cm4gbWFrZV91bmlxdWUoYS5tYXAoZikpXG4gICAgICAgIGlmICghYS5zdHIuc3RhcnRzV2l0aCgnJCcpKVxuICAgICAgICAgIHJldHVybiBbYV1cbiAgICAgICAgYT1zdHJpcF8kKGEpXG4gICAgICAgIGlmICh2aXNpdGluZy5oYXMoYS5zdHIpKVxuICAgICAgICAgIHRocm93IG5ldyBBc3RFeGNlcHRpb24oYCR7YS5zdHJ9OmNpcmN1bGFyIHJlZmVyZW5jZWAsYXN0KVxuICAgICAgICB2aXNpdGluZy5hZGQoYS5zdHIpXG4gICAgICAgIGNvbnN0IHJlZmVyZW5jZT12YXJzW2Euc3RyXVxuICAgICAgICBpZiAocmVmZXJlbmNlPT1udWxsKVxuICAgICAgICAgIHRocm93IG5ldyBBc3RFeGNlcHRpb24oYCR7YS5zdHJ9IHVuZGVmaW5lZGAsYSlcbiAgICAgICAgY29uc3QgYW5zMj1mKHJlZmVyZW5jZSlcbiAgICAgICAgdmlzaXRpbmcuZGVsZXRlKGEuc3RyKVxuICAgICAgICByZXR1cm4gYW5zMlxuICAgICAgfVxuICAgICAgcmV0dXJuIGYoYSlcbiAgICB9XG4gICAgY29uc3QgYW5zOnMydDxMc3RyW10+PXt9ICAgIFxuICAgIGZvciAoY29uc3QgW2ssdl0gb2YgT2JqZWN0LmVudHJpZXModmFycykpe1xuICAgICAgY29uc3QgcmVzb2x2ZWQ9cmVzb2x2ZSh2KVxuICAgICAgYW5zW2tdPXJlc29sdmVkXG4gICAgfVxuICAgIHJldHVybiBhbnNcbn1cbmludGVyZmFjZSBXYXRjaGVyc3tcbiAgd2F0Y2hlczpzMnQ8THN0cltdPixcbiAgdGFnczpSZWNvcmQ8c3RyaW5nLHN0cmluZ1tdPlxufVxuZnVuY3Rpb24gY29sbGVjdF92YXJzKGFzdDpFeHByZXNzaW9ufHVuZGVmaW5lZCxzb3VyY2VfZmlsZTpzdHJpbmcpe1xuICBjb25zdCB2YXJzOnMydDxMc3RyW10+PXt9XG4gIGNvbnN0IHNjcmlwdHM9bmV3IFNldDxzdHJpbmc+ICAgXG4gIC8vY29uc3QgYW5zPXt2YXJzLHNjcmlwdHN9XG4gIGlmIChhc3Q9PW51bGwpXG4gICAgcmV0dXJuIHZhcnNcbiAgaWYgKGFzdC50eXBlIT09J09iamVjdEV4cHJlc3Npb24nKVxuICAgIHJldHVybiB2YXJzXG4gIGZvciAoY29uc3QgcHJvcGFzdCBvZiBhc3QucHJvcGVydGllcyl7XG4gICAgY29uc3Qge2tleSx2YWx1ZX09cmVhZF9wcm9wX2FueShwcm9wYXN0KVxuICAgIGNvbnN0IGFyPWdldF9hcnJheSh2YWx1ZSxzb3VyY2VfZmlsZSlcbiAgICBpZiAodmFyc1trZXldIT09dW5kZWZpbmVkKVxuICAgICAgdGhyb3cgbmV3IEFzdEV4Y2VwdGlvbihgZHVwbGljYXRlIHZhbHVlOiAke2tleX1gLHByb3Bhc3QpXG4gICAgZm9yIChjb25zdCBzdWJrIG9mIGtleS5zcGxpdCgnLCcpKXsgLy9zbyBtdWx0aXBsZSBzY3JpcHRzIGNhbiBlYXNpbHkgaGF2ZSB0aGUgc2F2ZSB3YXRjaGVkXG4gICAgICBzY3JpcHRzLmFkZChzdWJrKVxuICAgICAgdmFyc1tzdWJrXT1hclxuICAgIH1cbiAgfVxuICByZXR1cm4gdmFyc1xufVxuZnVuY3Rpb24gbWFrZV9lbXB0eV9hcnJheSgpe1xuICByZXR1cm4gW11cbn1cbmZ1bmN0aW9uIHBhcnNlX3dhdGNoZXJzKFxuICBhc3Q6IEV4cHJlc3Npb24sXG4gIHNvdXJjZV9maWxlOnN0cmluZ1xuKTpXYXRjaGVycyB7IFxuICBjb25zdCBzY3JpcHRzbW9uPWZpbmRfcHJvcChhc3QsJ3NjcmlwdHNtb24nKVxuICBpZiAoc2NyaXB0c21vbj09bnVsbCl7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdhdGNoZXM6e30sXG4gICAgICB0YWdzOnt9XG4gICAgfVxuICB9XG4gIC8vY29uc3QgYXV0b3dhdGNoPWZpbmRfcHJvcChzY3JpcHRzbW9uLCdhdXRvd2F0Y2gnKVxuICAvL2NvbnN0IHdhdGNoPWZpbmRfcHJvcChzY3JpcHRzbW9uLCd3YXRjaCcpXG4gIGNvbnN0IHZhcnM9Y29sbGVjdF92YXJzKHNjcmlwdHNtb24sc291cmNlX2ZpbGUpXG4gIGNvbnN0IHdhdGNoZXM9cmVzb2x2ZV92YXJzKHZhcnMsYXN0KVxuICBjb25zdCB0YWdzPWZ1bmN0aW9uKCl7XG4gICAgY29uc3QgYW5zOlJlY29yZDxzdHJpbmcsc3RyaW5nW10+PXt9XG4gICAgLy9sb29wIG92ZXIgYWxsIG5hbWUsIGZvciB0aG9zZSB3aG8gc3RhcnQgd2l0aCAjLCBsb29wIG92ZXIgdGhlIHJlc3VsdCBhbmQgYWRkIHRvIGFuc1xuICAgIGZvciAoY29uc3QgW2ssYXJdIG9mIE9iamVjdC5lbnRyaWVzKHdhdGNoZXMpKXtcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoJyMnKSl7XG4gICAgICAgIGNvbnN0IHRhZz1rLnNsaWNlKDEpXG4gICAgICAgIGZvciAoY29uc3Qgc2NyaXB0IG9mIGFyKXtcbiAgICAgICAgICBkZWZhdWx0X2dldChhbnMsc2NyaXB0LnN0cixtYWtlX2VtcHR5X2FycmF5KS5wdXNoKHRhZylcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnRpbnVlXG4gICAgICB9XG4gICAgICAvKmlmIChhci5sZW5ndGghPT0wKXtcbiAgICAgICAgZGVmYXVsdF9nZXQoYW5zLGssbWFrZV9lbXB0eV9hcnJheSkucHVzaChcIndhdGNoYWJsZVwiKVxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgZGVmYXVsdF9nZXQoYW5zICxrLG1ha2VfZW1wdHlfYXJyYXkpLnB1c2goXCJub253YXRjaGFibGVcIilcbiAgICAgIH0qL1xuICAgIH1cbiAgICByZXR1cm4gYW5zXG4gIH0oKVxuICByZXR1cm4ge1xuICAgIHdhdGNoZXMsXG4gICAgdGFnc1xuICB9XG59XG5mdW5jdGlvbiBwYXJzZV9zY3JpcHRzMihcbiAgYXN0OiBFeHByZXNzaW9uLFxuICBzb3VyY2VfZmlsZTpzdHJpbmdcbik6IHMydDxMc3RyPiB7IFxuICBjb25zdCBhbnM6czJ0PExzdHI+PXt9XG4gIGNvbnN0IHNjcmlwdHM9ZmluZF9wcm9wKGFzdCwnc2NyaXB0cycpXG4gIGlmIChzY3JpcHRzPT1udWxsKVxuICAgIHJldHVybiBhbnNcbiAgaWYgKHNjcmlwdHMudHlwZSE9PSdPYmplY3RFeHByZXNzaW9uJylcbiAgICByZXR1cm4gYW5zXG4gIGZvciAoY29uc3QgcHJvcGFzdCBvZiBzY3JpcHRzLnByb3BlcnRpZXMpe1xuICAgIGNvbnN0IHtzdGFydCxlbmQsa2V5LHN0cn09cmVhZF9wcm9wKHByb3Bhc3QpXG4gICAgYW5zW2tleV09e3N0cixzdGFydCxlbmQsc291cmNlX2ZpbGV9XG4gIH1cbiAgcmV0dXJuIGFuc1xufVxuZnVuY3Rpb24gZXNjYXBlX2lkKHM6c3RyaW5nKXtcbiAgcmV0dXJuIHMucmVwbGFjZUFsbCgvXFxcXHw6fFxcLy9nLCctJykucmVwbGFjZUFsbCgnICcsJy0tJylcbn1cbmZ1bmN0aW9uIHNjcmlwdHNtb25fdG9fcnVubmVycyhzb3VyY2VfZmlsZTpzdHJpbmcsd2F0Y2hlcnM6V2F0Y2hlcnMsc2NyaXB0czpzMnQ8THN0cj4pe1xuICBjb25zdCBhbnM9W11cbiAgZm9yIChjb25zdCBbbmFtZSxzY3JpcHRdIG9mIE9iamVjdC5lbnRyaWVzKHNjcmlwdHMpKXtcbiAgICBpZiAoc2NyaXB0PT1udWxsKXtcbiAgICAgIGNvbnNvbGUud2FybihgbWlzc2luZyBzY3JpcHQgJHtuYW1lfWApXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBjb25zdCBydW5uZXI9ZnVuY3Rpb24oKXtcbiAgICAgIGNvbnN0IHdvcmtzcGFjZV9mb2xkZXI9cGF0aC5kaXJuYW1lKHNvdXJjZV9maWxlKVxuICAgICAgY29uc3QgaWQ9ZXNjYXBlX2lkKGAke3dvcmtzcGFjZV9mb2xkZXJ9ICR7bmFtZX1gKVxuICAgICAgY29uc3QgZWZmZWN0aXZlX3dhdGNoX3JlbD13YXRjaGVycy53YXRjaGVzW25hbWVdPz9bXVxuICAgICAgY29uc3QgZWZmZWN0aXZlX3dhdGNoOkZpbGVuYW1lW109ZWZmZWN0aXZlX3dhdGNoX3JlbC5tYXAocmVsPT4oe3JlbCxmdWxsOnBhdGguam9pbih3b3Jrc3BhY2VfZm9sZGVyLHJlbC5zdHIpfSkpXG4gICAgICAvL2NvbnN0IHdhdGNoZWRfZGVmYXVsdD13YXRjaGVycy5hdXRvd2F0Y2hfc2NyaXB0cy5pbmNsdWRlcyhuYW1lKVxuICAgICAgY29uc3QgdGFncz13YXRjaGVycy50YWdzW25hbWVdPz9bXVxuICAgICAgY29uc3QgYW5zOlJ1bm5lcj0ge1xuICAgICAgICAvL250eXBlOidydW5uZXInLFxuICAgICAgICBwb3M6IHNjcmlwdCxcbiAgICAgICAgbmVlZF9jdGw6dHJ1ZSxcbiAgICAgICAgbmFtZSxcbiAgICAgICAgc2NyaXB0OnNjcmlwdC5zdHIsXG4gICAgICAgIHdvcmtzcGFjZV9mb2xkZXIsXG4gICAgICAgIGVmZmVjdGl2ZV93YXRjaCxcbiAgICAgICAgLy93YXRjaGVkX2RlZmF1bHQsXG4gICAgICAgIGlkLFxuICAgICAgICB0YWdzXG4gICAgICAgIC8vd2F0Y2hlZDpmYWxzZVxuICAgICAgfSBcbiAgICAgIHJldHVybiBhbnNcbiAgICB9KClcbiAgICBhbnMucHVzaChydW5uZXIpXG4gIH1cbiAgcmV0dXJuIGFuc1xufSAgIFxuXG5mdW5jdGlvbiBjYWxjX3BvcyhleDpFcnJvcil7XG4gIGlmIChleCBpbnN0YW5jZW9mIEFzdEV4Y2VwdGlvbilcbiAgICByZXR1cm4gcGsoZXguYXN0LCdzdGFydCcsJ2VuZCcpXG4gIGlmIChpc19hY29ybl9lcnJvcihleCkpe1xuICAgIGNvbnN0IHN0YXJ0PWV4LnBvc1xuICAgIGNvbnN0IGVuZD1leC5yYWlzZWRBdFxuICAgIHJldHVybiB7c3RhcnQsZW5kfVxuICB9XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZF9wYWNrYWdlX2pzb24oXG4gIHdvcmtzcGFjZV9mb2xkZXJzOiBzdHJpbmdbXVxuKTpQcm9taXNlPEZvbGRlcj4ge1xuICBjb25zdCBmb2xkZXJfaW5kZXg6IFJlY29yZDxzdHJpbmcsIEZvbGRlcj4gPSB7fTsgLy9ieSBmdWxsX3BhdGhuYW1lXG4gIGFzeW5jIGZ1bmN0aW9uIHJlYWRfb25lKHdvcmtzcGFjZV9mb2xkZXI6IHN0cmluZyxuYW1lOnN0cmluZyxwb3M/OlBvcyk6UHJvbWlzZTxGb2xkZXI+e1xuICAgIGNvbnN0IGFuczpGb2xkZXI9IHtcbiAgICAgICAgcnVubmVyczpbXSxcbiAgICAgICAgZm9sZGVyczpbXSxcbiAgICAgICAgbmFtZSxcbiAgICAgICAgd29ya3NwYWNlX2ZvbGRlciwvKm50eXBlOidmb2xkZXInLCovXG4gICAgICAgIGlkOmVzY2FwZV9pZCh3b3Jrc3BhY2VfZm9sZGVyKSxcbiAgICAgICAgcG9zLFxuICAgICAgICBuZWVkX2N0bDp0cnVlLFxuICAgICAgICBlcnJvcnM6W11cbiAgICB9XG4gICAgY29uc3Qgc291cmNlX2ZpbGUgPSBwYXRoLnJlc29sdmUocGF0aC5ub3JtYWxpemUod29ya3NwYWNlX2ZvbGRlciksIFwicGFja2FnZS5qc29uXCIpO1xuICAgIHRyeXtcblxuICAgICAgY29uc3QgZD0gcGF0aC5yZXNvbHZlKHNvdXJjZV9maWxlKTtcbiAgICAgIGNvbnN0IGV4aXN0cz1mb2xkZXJfaW5kZXhbZF1cbiAgICAgIGlmIChleGlzdHMhPW51bGwpe1xuICAgICAgICBjb25zb2xlLndhcm4oYCR7c291cmNlX2ZpbGV9OiBza2lwcGluLCBhbHJlYWR5IGRvbmVgKVxuICAgICAgICByZXR1cm4gZXhpc3RzXG4gICAgICB9ICAgIFxuICAgICAgLy9jb25zdCBwa2dKc29uID0gYXdhaXQgXG4gICAgICBjb25zdCBzb3VyY2U9YXdhaXQgZnMucmVhZEZpbGUoc291cmNlX2ZpbGUsJ3V0ZjgnKVxuICAgICAgY29uc3QgYXN0ID0gcGFyc2VFeHByZXNzaW9uQXQoc291cmNlLCAwLCB7XG4gICAgICAgIGVjbWFWZXJzaW9uOiBcImxhdGVzdFwiLFxuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZyhgJHtncmVlbn0ke3NvdXJjZV9maWxlfSR7cmVzZXR9YClcbiAgICAgIGNvbnN0IHNjcmlwdHM9cGFyc2Vfc2NyaXB0czIoYXN0LHNvdXJjZV9maWxlKVxuICAgICAgY29uc3Qgd2F0Y2hlcnM9cGFyc2Vfd2F0Y2hlcnMoYXN0LHNvdXJjZV9maWxlKVxuICAgICAgYW5zLnJ1bm5lcnM9c2NyaXB0c21vbl90b19ydW5uZXJzKHNvdXJjZV9maWxlLHdhdGNoZXJzLHNjcmlwdHMpXG4gICAgICBjb25zdCB3b3Jrc3BhY2VzX2FzdD1maW5kX3Byb3AgKGFzdCwnd29ya3NwYWNlcycpXG4gICAgICBjb25zdCB3b3Jrc3BhY2VzPXdvcmtzcGFjZXNfYXN0P2dldF9lcnJheV9tYW5kYXRvcnkod29ya3NwYWNlc19hc3Qsc291cmNlX2ZpbGUpOltdXG4gICAgICBhbnMuZm9sZGVycz1bXSBcbiAgICAgIHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM9W11cbiAgICAgICAgZm9yIChjb25zdCB3b3Jrc3BhY2Ugb2Ygd29ya3NwYWNlcylcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2gocmVhZF9vbmUocGF0aC5qb2luKHdvcmtzcGFjZV9mb2xkZXIsd29ya3NwYWNlLnN0ciksd29ya3NwYWNlLnN0cix3b3Jrc3BhY2UpKVxuICAgICAgICBmb3IgKGNvbnN0IHJldCBvZiBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcykpXG4gICAgICAgICAgaWYgKHJldCE9bnVsbClcbiAgICAgICAgICAgICAgYW5zLmZvbGRlcnMucHVzaChyZXQpXG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zXG4gICAgfWNhdGNoKGV4KXtcbiAgICAgIGNvbnN0IGV4X2Vycm9yPWdldF9lcnJvcihleClcbiAgICAgIGNvbnN0IHBvczpQb3M9e3NvdXJjZV9maWxlLC4uLmNhbGNfcG9zKGV4X2Vycm9yKX1cbiAgICAgIGNvbnNvbGUubG9nKHtwb3N9KVxuICAgICAgYW5zLmVycm9ycz1be1xuICAgICAgICAgIHBvcyxcbiAgICAgICAgICBpZDpgJHthbnMuaWR9ZXJyb3JgLFxuICAgICAgICAgIG5lZWRfY3RsOmZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ZXhfZXJyb3IubWVzc2FnZVxuICB9XG4gICAgICBdXG4gICAgICByZXR1cm4gYW5zXG4gICAgfVxuICB9XG4gIGNvbnN0IGZvbGRlcnM9W11cbiAgY29uc3QgcHJvbWlzZXM9W11cbiAgZm9yIChjb25zdCB3b3Jrc3BhY2VfZm9sZGVyIG9mIHdvcmtzcGFjZV9mb2xkZXJzKXtcbiAgICAvL2NvbnN0IGZ1bGxfcGF0aG5hbWU9cGF0aC5yZXNvbHZlKHBhdGhuYW1lKVxuICAgIHByb21pc2VzLnB1c2gocmVhZF9vbmUod29ya3NwYWNlX2ZvbGRlcixwYXRoLmJhc2VuYW1lKHdvcmtzcGFjZV9mb2xkZXIpKSlcbiAgfVxuICBmb3IgKGNvbnN0IHJldCBvZiBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcykpXG4gICAgaWYgKHJldCE9bnVsbClcbiAgICAgIGZvbGRlcnMucHVzaChyZXQpXG4gIGNvbnN0IHJvb3Q6Rm9sZGVyPXtcbiAgICBuYW1lOidyb290JyxcbiAgICBpZDoncm9vdCcsXG4gICAgd29ya3NwYWNlX2ZvbGRlcjogJycsXG4gICAgZm9sZGVycyxcbiAgICBydW5uZXJzOltdLC8vLFxuICAgIG5lZWRfY3RsOnRydWUsXG4gICAgcG9zOnVuZGVmaW5lZCxcbiAgICBlcnJvcnM6W11cbiAgICAvL250eXBlOidmb2xkZXInXG4gIH1cbiAgcmV0dXJuIHJvb3Rcbn1cbmZ1bmN0aW9uIG5vX2N5Y2xlcyh4OnVua25vd24pe1xuICAgY29uc3Qgd3M9bmV3IFdlYWtTZXRcbiAgIGZ1bmN0aW9uIGYodjp1bmtub3duKTp1bmtub3due1xuICAgIGlmICh0eXBlb2YgdiA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgcmV0dXJuICc8ZnVuY3Rpb24+J1xuICAgIGlmICh2IGluc3RhbmNlb2YgU2V0KVxuICAgICAgcmV0dXJuIFsuLi52XS5tYXAoZilcbiAgICBpZiAodj09bnVsbHx8aXNfYXRvbSh2KSlcbiAgICAgIHJldHVybiB2XG4gICAgaWYgKHdzLmhhcyh2KSlcbiAgICAgIHJldHVybiAnPGN5Y2xlPidcbiAgICB3cy5hZGQodikgICAgXG4gICAgY29uc3QgYW5zPWZ1bmN0aW9uICgpe1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodikpXG4gICAgICAgIHJldHVybiB2Lm1hcChmKVxuICAgICAgaWYgKGlzX29iamVjdCh2KSl7XG4gICAgICAgIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMoT2JqZWN0LmVudHJpZXModikubWFwKChbIGssIHZdKSA9PiBbaywgZih2KV0pKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHYuY29uc3RydWN0b3IubmFtZXx8XCI8dW5rbm93biB0eXBlPlwiXG4gICAgfSgpXG4gICAgd3MuZGVsZXRlKHYpXG4gICAgcmV0dXJuIGFuc1xuICAgfVxuICAgcmV0dXJuIGYoeClcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b19qc29uKHg6dW5rbm93bixza2lwX2tleXM6c3RyaW5nW109W10pe1xuIFxuICBmdW5jdGlvbiBzZXRfcmVwbGFjZXIoazpzdHJpbmcsdjp1bmtub3duKXtcbiAgICBpZiAoc2tpcF9rZXlzLmluY2x1ZGVzKGspKVxuICAgICAgcmV0dXJuICc8c2tpcHBlZD4nXG4gICAgcmV0dXJuIHYgXG4gIH1cbiAgY29uc3QgeDI9bm9fY3ljbGVzKHgpXG4gIGNvbnN0IGFucz1KU09OLnN0cmluZ2lmeSh4MixzZXRfcmVwbGFjZXIsMikucmVwbGFjZSgvXFxcXG4vZywgJ1xcbicpO1xuICByZXR1cm4gYW5zXG59IiwgImltcG9ydCB0eXBlIHtXZWJ2aWV3TWVzc2FnZX0gZnJvbSAnLi4vLi4vc3JjL2V4dGVuc2lvbi5qcydcbmltcG9ydCB7dnNjb2RlfSBmcm9tICcuL2RvbV91dGlscy5qcydcbmltcG9ydCB0eXBlIHtSdW5uZXJSZXBvcnQsUnVubmVyLFN0YXRlfSBmcm9tICcuLi8uLi9zcmMvZGF0YS5qcyc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBGaWxlTG9jYXRpb24ge1xuICBmaWxlOiBzdHJpbmc7XG4gIHJvdzogbnVtYmVyO1xuICBjb2w6IG51bWJlcjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwb3N0X21lc3NhZ2UobXNnOldlYnZpZXdNZXNzYWdlKXtcbiAgdnNjb2RlLnBvc3RNZXNzYWdlKG1zZylcbn1cbmV4cG9ydCBmdW5jdGlvbiBjYWxjX2xhc3RfcnVuKHJlcG9ydDpSdW5uZXJSZXBvcnQscnVubmVyOlJ1bm5lcil7XG4gIGNvbnN0IHJ1bnM9cmVwb3J0LnJ1bnNbcnVubmVyLmlkXT8/W11cbiAgcmV0dXJuIHJ1bnMuYXQoLTEpXG59XG5leHBvcnQgZnVuY3Rpb24gY2FsY19ydW5uZXJfc3RhdHVzKHJlcG9ydDpSdW5uZXJSZXBvcnQgLHJ1bm5lcjpSdW5uZXIpOntcbiAgICB2ZXJzaW9uOiBudW1iZXI7XG4gICAgc3RhdGU6IFN0YXRlO1xufXtcbiAgY29uc3QgbGFzdF9ydW49Y2FsY19sYXN0X3J1bihyZXBvcnQscnVubmVyKVxuICBpZiAobGFzdF9ydW49PW51bGwpXG4gICAgcmV0dXJue3ZlcnNpb246MCxzdGF0ZToncmVhZHknfVxuICBjb25zdCB7ZW5kX3RpbWUscnVuX2lkOnZlcnNpb24sZXhpdF9jb2RlLHN0b3BwZWR9PWxhc3RfcnVuXG4gIGlmIChlbmRfdGltZT09bnVsbCl7XG4gICAgICByZXR1cm4ge3ZlcnNpb24sc3RhdGU6J3J1bm5pbmcnfVxuICB9XG4gIGlmIChzdG9wcGVkKSBcbiAgICByZXR1cm4ge3ZlcnNpb24sc3RhdGU6J3N0b3BwZWQnfVxuXG4gIGlmIChleGl0X2NvZGU9PT0wKVxuICAgIHJldHVybiB7dmVyc2lvbixzdGF0ZTonZG9uZSd9XG4gIHJldHVybiB7dmVyc2lvbixzdGF0ZTonZXJyb3InfVxufVxuXG4iLCAiPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cblxuPGhlYWQ+XG4gIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuICA8dGl0bGU+U2NyaXB0c21vbiBpY29uczwvdGl0bGU+XG4gIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiBocmVmPVwiLi9pY29ucy5jc3NcIj5cbjwvaGVhZD5cblxuPGJvZHk+XG4gIDxidXR0b24gaWQ9YW5pbWF0ZWJ1dHRvbj5hbmltYXRlPC9idXR0b24+XG4gIDxkaXYgaWQ9c3RhdD5zdGF0PC9kaXY+XG4gIDxidXR0b24gaWQ9YW5pbWF0ZWJ1dHRvbl90aGVfZG9uZT5hbmltYXRlYnV0dG9uX3RoZV9kb25lPC9idXR0b24+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+ZXJyb3JcbiAgICA8c3ZnICB3aWR0aD1cIjE2cHhcIiBoZWlnaHQ9XCIxNnB4XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwicmVkXCI+XG4gICAgICA8IS0tIENpcmNsZSAtLT5cbiAgICAgIDxjaXJjbGUgY3g9XCI4XCIgY3k9XCI4XCIgcj1cIjdcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBmaWxsPVwidHJhbnNwYXJlbnRcIiAvPlxuICAgICAgPCEtLSBYIC0tPlxuICAgICAgPHBhdGggZD1cIk01IDUgTDExIDExIE01IDExIEwxMSA1XCIgIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIGZpbGw9XCJ0cmFuc3BhcmVudFwiXG4gICAgICAgIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCIgaWQ9XCJ0aGVfZG9uZVwiPmRvbmVcbiAgICA8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgIDxjaXJjbGUgY3g9XCI1MFwiIGN5PVwiNTBcIiByPVwiNDVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxMFwiIGZpbGw9XCJ0cmFuc3BhcmVudFwiIC8+XG4gICAgICA8ZyAgdHJhbnNmb3JtLW9yaWdpbj1cIjUwIDUwXCI+XG4gICAgICAgIDxwYXRoIGQ9XCJNMzAgNTAgTDQ1IDY1IEw3MCAzNVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEwXCIgZmlsbD1cInRyYW5zcGFyZW50XCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiXG4gICAgICAgICAgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiAvPlxuICAgICAgPC9nPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiIGlkPVwidGhlX2RvbmVcIj5jb3B5XG48c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPjxwYXRoIGQ9XCJNMyA1VjEyLjczQzIuNCAxMi4zOCAyIDExLjc0IDIgMTFWNUMyIDIuNzkgMy43OSAxIDYgMUg5QzkuNzQgMSAxMC4zOCAxLjQgMTAuNzMgMkg2QzQuMzUgMiAzIDMuMzUgMyA1Wk0xMSAxNUg2QzQuODk3IDE1IDQgMTQuMTAzIDQgMTNWNUM0IDMuODk3IDQuODk3IDMgNiAzSDExQzEyLjEwMyAzIDEzIDMuODk3IDEzIDVWMTNDMTMgMTQuMTAzIDEyLjEwMyAxNSAxMSAxNVpNMTIgNUMxMiA0LjQ0OCAxMS41NTIgNCAxMSA0SDZDNS40NDggNCA1IDQuNDQ4IDUgNVYxM0M1IDEzLjU1MiA1LjQ0OCAxNCA2IDE0SDExQzExLjU1MiAxNCAxMiAxMy41NTIgMTIgMTNWNVpcIi8+PC9zdmc+XG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiaWNvblwiIGlkPVwidGhlX2RvbmVcIj5zdG9wXG4gIFxuPHN2ZyB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIiB2aWV3Qm94PVwiMCAwIDE2IDE2XCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIGZpbGw9XCJjdXJyZW50Q29sb3JcIj48cGF0aCBkPVwiTTEyLjUgMy41VjEyLjVIMy41VjMuNUgxMi41Wk0xMi41IDJIMy41QzIuNjcyIDIgMiAyLjY3MiAyIDMuNVYxMi41QzIgMTMuMzI4IDIuNjcyIDE0IDMuNSAxNEgxMi41QzEzLjMyOCAxNCAxNCAxMy4zMjggMTQgMTIuNVYzLjVDMTQgMi42NzIgMTMuMzI4IDIgMTIuNSAyWlwiLz48L3N2Zz5cbiAgPC9kaXY+XG5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiIGlkPVwidGhlX2RvbmVcIj5zdG9wcGVkXG5cbjxzdmcgIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPjxwYXRoIGQ9XCJNMTQgMkgxMEMxMCAwLjg5NyA5LjEwMyAwIDggMEM2Ljg5NyAwIDYgMC44OTcgNiAySDJDMS43MjQgMiAxLjUgMi4yMjQgMS41IDIuNUMxLjUgMi43NzYgMS43MjQgMyAyIDNIMi41NEwzLjM0OSAxMi43MDhDMy40NTYgMTMuOTk0IDQuNTUgMTUgNS44NCAxNUgxMC4xNTlDMTEuNDQ5IDE1IDEyLjU0MyAxMy45OTMgMTIuNjUgMTIuNzA4TDEzLjQ1OSAzSDEzLjk5OUMxNC4yNzUgMyAxNC40OTkgMi43NzYgMTQuNDk5IDIuNUMxNC40OTkgMi4yMjQgMTQuMjc1IDIgMTMuOTk5IDJIMTRaTTggMUM4LjU1MSAxIDkgMS40NDkgOSAySDdDNyAxLjQ0OSA3LjQ0OSAxIDggMVpNMTEuNjU1IDEyLjYyNUMxMS41OTEgMTMuMzk2IDEwLjkzNCAxNCAxMC4xNiAxNEg1Ljg0MUM1LjA2NyAxNCA0LjQxIDEzLjM5NiA0LjM0NiAxMi42MjVMMy41NDQgM0gxMi40NThMMTEuNjU2IDEyLjYyNUgxMS42NTVaTTcgNS41VjExLjVDNyAxMS43NzYgNi43NzYgMTIgNi41IDEyQzYuMjI0IDEyIDYgMTEuNzc2IDYgMTEuNVY1LjVDNiA1LjIyNCA2LjIyNCA1IDYuNSA1QzYuNzc2IDUgNyA1LjIyNCA3IDUuNVpNMTAgNS41VjExLjVDMTAgMTEuNzc2IDkuNzc2IDEyIDkuNSAxMkM5LjIyNCAxMiA5IDExLjc3NiA5IDExLjVWNS41QzkgNS4yMjQgOS4yMjQgNSA5LjUgNUM5Ljc3NiA1IDEwIDUuMjI0IDEwIDUuNVpcIi8+PC9zdmc+XG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPnJlYWR5XG5cblxuICAgIDxzdmcgd2lkdGg9XCI2NHB4XCIgaGVpZ2h0PVwiNjRweFwiIHZpZXdCb3g9XCIxMCAxMCA0NS4wMCA0NS4wMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBzdHJva2Utd2lkdGg9XCIzXCI+XG4gICAgICA8cGF0aCBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBmaWxsPVwibm9uZVwiXG4gICAgICAgIGQ9XCJNNDEuNzEsMTAuNThIMjhsLTcuNCwyMi4yOGEuMS4xLDAsMCwwLC4wOS4xM2g4LjQ5YS4xLjEsMCwwLDEsLjEuMTNMMjIuNzEsNTIuNzZhLjUuNSwwLDAsMCwuODguNDVMNDMuNDEsMjZhLjEuMSwwLDAsMC0uMDgtLjE2SDM0LjQyYS4xMS4xMSwwLDAsMS0uMDktLjE1bDcuNDctMTVBLjEuMSwwLDAsMCw0MS43MSwxMC41OFpcIiAvPlxuICAgIDwvc3ZnPlxuXG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPnN5bnRheGVycm9yXG5cbiAgICA8c3ZnIHdpZHRoPVwiNjRweFwiIGhlaWdodD1cIjY0cHhcIiB2aWV3Qm94PVwiLTQgLTQgMjIuMDAgMjIuMDBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgc3Ryb2tlLXdpZHRoPVwiMlwiPlxuICAgICAgPHBhdGggc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgZmlsbD1cInJlZFwiXG4gICAgICAgIGQ9XCJNIDggMCBMIDAgMTYgTCAxNiAxNiB6OCAwXCIgLz5cbiAgICA8L3N2Zz5cblxuICA8L2Rpdj5cblxuXG5cblxuXG5cbiAgIDxkaXYgY2xhc3M9XCJpY29uXCI+cnVubmluZ1xuPHN2ZyBjbGFzcz1cInJ1bm5pbmdpY29uXCIgeG1sbnMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveCA9IFwiMCAwIDEwMCAxMDBcIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvID0gXCJ4TWlkWU1pZFwiIHdpZHRoID0gXCIyMzNcIiBoZWlnaHQgPSBcIjIzM1wiIGZpbGw9XCJub25lXCIgeG1sbnM6eGxpbmsgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIj5cbiAgICA8Y2lyY2xlIHN0cm9rZS1kYXNoYXJyYXkgPSBcIjE2NC45MzM2MTQzMTM0NjQxNSA1Ni45Nzc4NzE0Mzc4MjEzOFwiIHIgPSBcIjM1XCIgc3Ryb2tlLXdpZHRoID0gXCIxMFwiIHN0cm9rZSA9IFwiY3VycmVudENvbG9yXCIgZmlsbCA9IFwibm9uZVwiIGN5ID0gXCI1MFwiIGN4ID0gXCI1MFwiPjwvY2lyY2xlPlxuPC9zdmc+XG48L2Rpdj5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+Y2hldnJvbi1kb3duXG4gICAgPHN2ZyB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIiB2aWV3Qm94PVwiMCAwIDE2IDE2XCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIGZpbGw9XCJjdXJyZW50Q29sb3JcIj5cbiAgICAgIDxwYXRoXG4gICAgICAgIGQ9XCJNMy4xNDY0NSA1LjY0NjQ1QzMuMzQxNzEgNS40NTExOCAzLjY1ODI5IDUuNDUxMTggMy44NTM1NSA1LjY0NjQ1TDggOS43OTI4OUwxMi4xNDY0IDUuNjQ2NDVDMTIuMzQxNyA1LjQ1MTE4IDEyLjY1ODMgNS40NTExOCAxMi44NTM2IDUuNjQ2NDVDMTMuMDQ4OCA1Ljg0MTcxIDEzLjA0ODggNi4xNTgyOSAxMi44NTM2IDYuMzUzNTVMOC4zNTM1NSAxMC44NTM2QzguMTU4MjkgMTEuMDQ4OCA3Ljg0MTcxIDExLjA0ODggNy42NDY0NSAxMC44NTM2TDMuMTQ2NDUgNi4zNTM1NUMyLjk1MTE4IDYuMTU4MjkgMi45NTExOCA1Ljg0MTcxIDMuMTQ2NDUgNS42NDY0NVpcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPmNoZXZyb24tcmlnaHRcbiAgICA8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPlxuICAgICAgPHBhdGhcbiAgICAgICAgZD1cIk01LjY0NjQ1IDMuMTQ2NDVDNS40NTExOCAzLjM0MTcxIDUuNDUxMTggMy42NTgyOSA1LjY0NjQ1IDMuODUzNTVMOS43OTI4OSA4TDUuNjQ2NDUgMTIuMTQ2NEM1LjQ1MTE4IDEyLjM0MTcgNS40NTExOCAxMi42NTgzIDUuNjQ2NDUgMTIuODUzNkM1Ljg0MTcxIDEzLjA0ODggNi4xNTgyOSAxMy4wNDg4IDYuMzUzNTUgMTIuODUzNkwxMC44NTM2IDguMzUzNTVDMTEuMDQ4OCA4LjE1ODI5IDExLjA0ODggNy44NDE3MSAxMC44NTM2IDcuNjQ2NDVMNi4zNTM1NSAzLjE0NjQ1QzYuMTU4MjkgMi45NTExOCA1Ljg0MTcxIDIuOTUxMTggNS42NDY0NSAzLjE0NjQ1WlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+ZGVidWdcbiAgICA8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPlxuICAgICAgPHBhdGhcbiAgICAgICAgZD1cIk0yMS43NSAxMkgxOS41VjlDMTkuNSA4LjQ0NSAxOS4zNDcgNy45MjQ1IDE5LjA4MyA3LjQ3NzVMMjAuNzc5NSA1Ljc4MUMyMS4wNzIgNS40ODg1IDIxLjA3MiA1LjAxMyAyMC43Nzk1IDQuNzIwNUMyMC40ODcgNC40MjggMjAuMDExNSA0LjQyOCAxOS43MTkgNC43MjA1TDE4LjAyMjUgNi40MTdDMTcuNTc1NSA2LjE1MyAxNy4wNTUgNiAxNi41IDZDMTYuNSAzLjUxOSAxNC40ODEgMS41IDEyIDEuNUM5LjUxOSAxLjUgNy41IDMuNTE5IDcuNSA2QzYuOTQ1IDYgNi40MjQ1IDYuMTUzIDUuOTc3NSA2LjQxN0w0LjI4MSA0LjcyMDVDMy45ODg1IDQuNDI4IDMuNTEzIDQuNDI4IDMuMjIwNSA0LjcyMDVDMi45MjggNS4wMTMgMi45MjggNS40ODg1IDMuMjIwNSA1Ljc4MUw0LjkxNyA3LjQ3NzVDNC42NTMgNy45MjQ1IDQuNSA4LjQ0NSA0LjUgOVYxMkgyLjI1QzEuODM2IDEyIDEuNSAxMi4zMzYgMS41IDEyLjc1QzEuNSAxMy4xNjQgMS44MzYgMTMuNSAyLjI1IDEzLjVINC41QzQuNSAxNS4yOTg1IDUuMTM2IDE2Ljk1IDYuMTk1IDE4LjI0NDVMMy41OTQgMjAuODQ1NUMzLjMwMTUgMjEuMTM4IDMuMzAxNSAyMS42MTM1IDMuNTk0IDIxLjkwNkMzLjc0MSAyMi4wNTMgMy45MzMgMjIuMTI1IDQuMTI1IDIyLjEyNUM0LjMxNyAyMi4xMjUgNC41MDkgMjIuMDUxNSA0LjY1NiAyMS45MDZMNy4yNTcgMTkuMzA1QzguNTUgMjAuMzY0IDEwLjIwMyAyMSAxMi4wMDE1IDIxQzEzLjggMjEgMTUuNDUxNSAyMC4zNjQgMTYuNzQ2IDE5LjMwNUwxOS4zNDcgMjEuOTA2QzE5LjQ5NCAyMi4wNTMgMTkuNjg2IDIyLjEyNSAxOS44NzggMjIuMTI1QzIwLjA3IDIyLjEyNSAyMC4yNjIgMjIuMDUxNSAyMC40MDkgMjEuOTA2QzIwLjcwMTUgMjEuNjEzNSAyMC43MDE1IDIxLjEzOCAyMC40MDkgMjAuODQ1NUwxNy44MDggMTguMjQ0NUMxOC44NjcgMTYuOTUxNSAxOS41MDMgMTUuMjk4NSAxOS41MDMgMTMuNUgyMS43NTNDMjIuMTY3IDEzLjUgMjIuNTAzIDEzLjE2NCAyMi41MDMgMTIuNzVDMjIuNTAzIDEyLjMzNiAyMi4xNjcgMTIgMjEuNzUzIDEySDIxLjc1Wk0xMiAzQzEzLjY1NDUgMyAxNSA0LjM0NTUgMTUgNkg5QzkgNC4zNDU1IDEwLjM0NTUgMyAxMiAzWk0xOCAxMy41QzE4IDE2LjgwOSAxNS4zMDkgMTkuNSAxMiAxOS41QzguNjkxIDE5LjUgNiAxNi44MDkgNiAxMy41VjlDNiA4LjE3MiA2LjY3MiA3LjUgNy41IDcuNUgxNi41QzE3LjMyOCA3LjUgMTggOC4xNzIgMTggOVYxMy41Wk0xNC43ODEgMTEuMDMxTDEzLjA2MiAxMi43NUwxNC43ODEgMTQuNDY5QzE1LjA3MzUgMTQuNzYxNSAxNS4wNzM1IDE1LjIzNyAxNC43ODEgMTUuNTI5NUMxNC42MzQgMTUuNjc2NSAxNC40NDIgMTUuNzQ4NSAxNC4yNSAxNS43NDg1QzE0LjA1OCAxNS43NDg1IDEzLjg2NiAxNS42NzUgMTMuNzE5IDE1LjUyOTVMMTIgMTMuODEwNUwxMC4yODEgMTUuNTI5NUMxMC4xMzQgMTUuNjc2NSA5Ljk0MiAxNS43NDg1IDkuNzUgMTUuNzQ4NUM5LjU1OCAxNS43NDg1IDkuMzY2IDE1LjY3NSA5LjIxOSAxNS41Mjk1QzguOTI2NSAxNS4yMzcgOC45MjY1IDE0Ljc2MTUgOS4yMTkgMTQuNDY5TDEwLjkzOCAxMi43NUw5LjIxOSAxMS4wMzFDOC45MjY1IDEwLjczODUgOC45MjY1IDEwLjI2MyA5LjIxOSA5Ljk3MDVDOS41MTE1IDkuNjc4IDkuOTg3IDkuNjc4IDEwLjI3OTUgOS45NzA1TDExLjk5ODUgMTEuNjg5NUwxMy43MTc1IDkuOTcwNUMxNC4wMSA5LjY3OCAxNC40ODU1IDkuNjc4IDE0Ljc3OCA5Ljk3MDVDMTUuMDcwNSAxMC4yNjMgMTUuMDcwNSAxMC43Mzg1IDE0Ljc3OCAxMS4wMzFIMTQuNzgxWlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+ZmlsZVxuICAgIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIj5cbiAgICAgIDxwYXRoIGZpbGw9XCJjdXJyZW50Q29sb3JcIlxuICAgICAgICBkPVwiTTIgMS43NUMyIC43ODQgMi43ODQgMCAzLjc1IDBoNi41ODZjLjQ2NCAwIC45MDkuMTg0IDEuMjM3LjUxM2wyLjkxNCAyLjkxNGMuMzI5LjMyOC41MTMuNzczLjUxMyAxLjIzN3Y5LjU4NkExLjc1IDEuNzUgMCAwIDEgMTMuMjUgMTZoLTkuNUExLjc1IDEuNzUgMCAwIDEgMiAxNC4yNVptMS43NS0uMjVhLjI1LjI1IDAgMCAwLS4yNS4yNXYxMi41YzAgLjEzOC4xMTIuMjUuMjUuMjVoOS41YS4yNS4yNSAwIDAgMCAuMjUtLjI1VjZoLTIuNzVBMS43NSAxLjc1IDAgMCAxIDkgNC4yNVYxLjVabTYuNzUuMDYyVjQuMjVjMCAuMTM4LjExMi4yNS4yNS4yNWgyLjY4OGwtLjAxMS0uMDEzLTIuOTE0LTIuOTE0LS4wMTMtLjAxMVpcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPmZvbGRlclxuICAgIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCItMiAtMiAyMCAyMFwiIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiPlxuICAgICAgPHBhdGggc3Ryb2tlPSdjdXJyZW50Q29sb3InIGZpbGw9XCJ0cmFuc3BhcmVudFwiXG4gICAgICAgIGQ9XCJNMS43NSAxQTEuNzUgMS43NSAwIDAgMCAwIDIuNzV2MTAuNUMwIDE0LjIxNi43ODQgMTUgMS43NSAxNWgxMi41QTEuNzUgMS43NSAwIDAgMCAxNiAxMy4yNVY0Ljc1QTEuNzUgMS43NSAwIDAgMCAxNC4yNSAzSDcuNWEuMjUuMjUgMCAwIDEtLjItLjFMNS44NzUgMS40NzVBMS43NSAxLjc1IDAgMCAwIDQuNTE4IDFIMS43NVpcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuICAgPGRpdiBjbGFzcz1cImljb25cIj5mb2xkZXJzeW50YXhlcnJvclxuPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIi0yIC0yIDIwIDIwXCIgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCI+XG4gIDxwYXRoIHN0cm9rZT0nY3VycmVudENvbG9yJyBmaWxsPVwidHJhbnNwYXJlbnRcIlxuICAgIGQ9XCJNMS43NSAxQTEuNzUgMS43NSAwIDAgMCAwIDIuNzV2MTAuNUMwIDE0LjIxNi43ODQgMTUgMS43NSAxNWgxMi41QTEuNzUgMS43NSAwIDAgMCAxNiAxMy4yNVY0Ljc1QTEuNzUgMS43NSAwIDAgMCAxNC4yNSAzSDcuNWEuMjUuMjUgMCAwIDEtLjItLjFMNS44NzUgMS40NzVBMS43NSAxLjc1IDAgMCAwIDQuNTE4IDFIMS43NVpcIiAvPlxuICA8cGF0aCBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBmaWxsPVwicmVkXCJcbiAgICBkPVwiTSA4IDUuMzMzMyBMIDQgMTMuMzMzMyBMIDEyIDEzLjMzMzMgWlwiIC8+XG48L3N2Zz5cblxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPnBsYXlcbiAgICA8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPlxuICAgICAgPHBhdGhcbiAgICAgICAgZD1cIk00Ljc0NTE0IDMuMDY0MTRDNC40MTE4MyAyLjg3NjY1IDQgMy4xMTc1MSA0IDMuNDk5OTNWMTIuNTAwMkM0IDEyLjg4MjYgNC40MTE4MiAxMy4xMjM1IDQuNzQ1MTIgMTIuOTM2TDEyLjc0NTQgOC40MzYwMUMxMy4wODUyIDguMjQ0ODYgMTMuMDg1MiA3Ljc1NTU5IDEyLjc0NTQgNy41NjQ0M0w0Ljc0NTE0IDMuMDY0MTRaTTMgMy40OTk5M0MzIDIuMzUyNjggNC4yMzU1IDEuNjMwMTEgNS4yMzU0MSAyLjE5MjU3TDEzLjIzNTcgNi42OTI4NkMxNC4yNTUxIDcuMjY2MzMgMTQuMjU1MSA4LjczNDE1IDEzLjIzNTYgOS4zMDc1OUw1LjIzNTM3IDEzLjgwNzZDNC4yMzU0NiAxNC4zNyAzIDEzLjY0NzQgMyAxMi41MDAyVjMuNDk5OTNaXCIgLz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cbiAgICA8ZGl2IGNsYXNzPVwiaWNvblwiPnBsYXktd2F0Y2hcbiAgICA8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPlxuICAgICAgPHBhdGhcbiAgICAgICAgZD1cIk00Ljc0NTE0IDMuMDY0MTRDNC40MTE4MyAyLjg3NjY1IDQgMy4xMTc1MSA0IDMuNDk5OTNWMTIuNTAwMkM0IDEyLjg4MjYgNC40MTE4MiAxMy4xMjM1IDQuNzQ1MTIgMTIuOTM2TDEyLjc0NTQgOC40MzYwMUMxMy4wODUyIDguMjQ0ODYgMTMuMDg1MiA3Ljc1NTU5IDEyLjc0NTQgNy41NjQ0M0w0Ljc0NTE0IDMuMDY0MTRaTTMgMy40OTk5M0MzIDIuMzUyNjggNC4yMzU1IDEuNjMwMTEgNS4yMzU0MSAyLjE5MjU3TDEzLjIzNTcgNi42OTI4NkMxNC4yNTUxIDcuMjY2MzMgMTQuMjU1MSA4LjczNDE1IDEzLjIzNTYgOS4zMDc1OUw1LjIzNTM3IDEzLjgwNzZDNC4yMzU0NiAxNC4zNyAzIDEzLjY0NzQgMyAxMi41MDAyVjMuNDk5OTNaXCIgLz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPnNlbGVjdG9yX3VuZGVmaW5lZFxuICAgIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIj5cbiAgICAgIDxwYXRoIGQ9XCJNIDAgMCBIIDE2IFYgMTYgSDAgVjBcIlxuICAgICAgICBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlLWRhc2hhcnJheT1cIjIsNFwiLz5cbiAgICAgIDwvc3ZnPlxuICA8L2Rpdj4gXG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5zZWxlY3Rvcl9mYWxzZVxuICAgIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIj5cbiAgICAgIDxwYXRoIGQ9XCJNIDAgMCBIIDE2IFYgMTYgSDAgVjBcIlxuICAgICAgICBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIGZpbGw9XCJub25lXCIvPlxuICAgICAgPC9zdmc+XG4gIDwvZGl2PiAgIFxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+c2VsZWN0b3JfdHJ1ZVxuICAgIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHdpZHRoPVwiMTZweFwiIGhlaWdodD1cIjE2cHhcIiB2aWV3Qm94PVwiMCAwIDE2IDE2XCI+XG4gICAgICA8cGF0aCBkPVwiTSAwIDAgSCAxNiBWIDE2IEgwIFYwXCJcbiAgICAgICAgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBmaWxsPVwibm9uZVwiLz5cbiAgICAgICAgPHBhdGggc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgZD1cIk0xMy42NTcyIDMuMTM1NzNDMTMuODU4MyAyLjk0NjUgMTQuMTc1IDIuOTU2MTQgMTQuMzY0MyAzLjE1NzIyQzE0LjU1MzUgMy4zNTgzMSAxNC41NDM4IDMuNjc1IDE0LjM0MjggMy44NjQyNUw1Ljg0Mjc3IDExLjg2NDJDNS42NDU5NyAxMi4wNDk0IDUuMzM3NTYgMTIuMDQ0NiA1LjE0NjQ4IDExLjg1MzVMMS42NDY0OCA4LjM1MzUxQzEuNDUxMjEgOC4xNTgyNCAxLjQ1MTIxIDcuODQxNzQgMS42NDY0OCA3LjY0NjQ3QzEuODQxNzQgNy40NTEyMSAyLjE1ODI1IDcuNDUxMjEgMi4zNTM1MSA3LjY0NjQ3TDUuNTA5NzYgMTAuODAyN0wxMy42NTcyIDMuMTM1NzNaXCIvPlxuICAgICAgPC9zdmc+XG4gIDwvZGl2PiAgIFxuXG5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPndhdGNoZWRfbWlzc2luZ1xuPHN2ZyB3aWR0aD1cIjgwMHB4XCIgaGVpZ2h0PVwiODAwcHhcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgeG1sbnM6cmRmPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zI1wiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2ZXJzaW9uPVwiMS4xXCIgeG1sbnM6Y2M9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyNcIiB4bWxuczpkYz1cImh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvXCI+XG4gPGcgdHJhbnNmb3JtPVwidHJhbnNsYXRlKDAgLTEwMjguNClcIj5cbiAgPHBhdGggZD1cIm0yNCAxNGEyIDIgMCAxIDEgLTQgMCAyIDIgMCAxIDEgNCAwelwiIHRyYW5zZm9ybT1cIm1hdHJpeCgxIDAgMCAxLjI1IC0xMCAxMDMxLjQpXCIgZmlsbD1cIiM3ZjhjOGRcIi8+XG4gIDxwYXRoIGQ9XCJtMTIgMTAzMC40Yy0zLjg2NiAwLTcgMy4yLTcgNy4yIDAgMy4xIDMuMTI1IDUuOSA0IDcuOCAwLjg3NSAxLjggMCA1IDAgNWwzLTAuNSAzIDAuNXMtMC44NzUtMy4yIDAtNWMwLjg3NS0xLjkgNC00LjcgNC03LjggMC00LTMuMTM0LTcuMi03LTcuMnpcIiBmaWxsPVwiI2YzOWMxMlwiLz5cbiAgPHBhdGggZD1cIm0xMiAxMDMwLjRjMy44NjYgMCA3IDMuMiA3IDcuMiAwIDMuMS0zLjEyNSA1LjktNCA3LjgtMC44NzUgMS44IDAgNSAwIDVsLTMtMC41di0xOS41elwiIGZpbGw9XCIjZjFjNDBmXCIvPlxuICA8cGF0aCBkPVwibTkgMTAzNi40LTEgMSA0IDEyIDQtMTItMS0xLTEgMS0xLTEtMSAxLTEtMS0xIDEtMS0xem0wIDEgMSAxIDAuNS0wLjUgMC41LTAuNSAwLjUgMC41IDAuNSAwLjUgMC41LTAuNSAwLjUtMC41IDAuNSAwLjUgMC41IDAuNSAxLTEgMC40MzggMC40LTMuNDM4IDEwLjMtMy40Mzc1LTEwLjMgMC40Mzc1LTAuNHpcIiBmaWxsPVwiI2U2N2UyMlwiLz5cbiAgPHJlY3QgaGVpZ2h0PVwiNVwiIHdpZHRoPVwiNlwiIHk9XCIxMDQ1LjRcIiB4PVwiOVwiIGZpbGw9XCIjYmRjM2M3XCIvPlxuICA8cGF0aCBkPVwibTkgMTA0NS40djVoM3YtMWgzdi0xaC0zdi0xaDN2LTFoLTN2LTFoLTN6XCIgZmlsbD1cIiM5NWE1YTZcIi8+XG4gIDxwYXRoIGQ9XCJtOSAxMDQ2LjR2MWgzdi0xaC0zem0wIDJ2MWgzdi0xaC0zelwiIGZpbGw9XCIjN2Y4YzhkXCIvPlxuIDwvZz5cbjwvc3ZnPlxuICA8L2Rpdj5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+d2F0Y2hlZF90cnVlXG4gPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIzMlwiIGhlaWdodD1cIjMyXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjwhLS0gSWNvbiBmcm9tIE1hdGVyaWFsIFN5bWJvbHMgYnkgR29vZ2xlIC0gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9tYXRlcmlhbC1kZXNpZ24taWNvbnMvYmxvYi9tYXN0ZXIvTElDRU5TRSAtLT48cGF0aCBmaWxsPVwiY3VycmVudENvbG9yXCIgZD1cIm01LjgyNSAyMWwxLjYyNS03LjAyNUwyIDkuMjVsNy4yLS42MjVMMTIgMmwyLjggNi42MjVsNy4yLjYyNWwtNS40NSA0LjcyNUwxOC4xNzUgMjFMMTIgMTcuMjc1elwiLz48L3N2Zz4gXG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPndhdGNoZWRfZmFsc2VcbjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHdpZHRoPVwiMzJcIiBoZWlnaHQ9XCIzMlwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48IS0tIEljb24gZnJvbSBNYXRlcmlhbCBTeW1ib2xzIGJ5IEdvb2dsZSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvbWF0ZXJpYWwtZGVzaWduLWljb25zL2Jsb2IvbWFzdGVyL0xJQ0VOU0UgLS0+PHBhdGggZmlsbD1cImN1cnJlbnRDb2xvclwiIGQ9XCJtOC44NSAxNi44MjVsMy4xNS0xLjlsMy4xNSAxLjkyNWwtLjgyNS0zLjZsMi43NzUtMi40bC0zLjY1LS4zMjVsLTEuNDUtMy40bC0xLjQ1IDMuMzc1bC0zLjY1LjMyNWwyLjc3NSAyLjQyNXpNNS44MjUgMjFsMS42MjUtNy4wMjVMMiA5LjI1bDcuMi0uNjI1TDEyIDJsMi44IDYuNjI1bDcuMi42MjVsLTUuNDUgNC43MjVMMTguMTc1IDIxTDEyIDE3LjI3NXpNMTIgMTIuMjVcIi8+PC9zdmc+XG4gIDwvZGl2PlxuXG48c2NyaXB0IHNyYz1cIi4vaWNvbnMuanNcIj48L3NjcmlwdD5cblxuXG4iLCAiaW1wb3J0IHtnZXRfZXJyb3J9IGZyb20gJ0B5aWdhbC9iYXNlX3R5cGVzJ1xuZXhwb3J0IGZ1bmN0aW9uIHJlKGZsYWdzID0gXCJcIikge1xuICByZXR1cm4gZnVuY3Rpb24gKHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IGFueVtdKSB7XG4gICAgLy8gMS4gQ29tYmluZSBzdHJpbmdzIGFuZCBpbnRlcnBvbGF0ZWQgdmFsdWVzXG4gICAgY29uc3QgZnVsbF9yYXcgPSBzdHJpbmdzLnJhdy5yZWR1Y2UoKGFjYywgc3RyLCBpKSA9PiBcbiAgICAgIGFjYyArIHN0ciArICh2YWx1ZXNbaV0gPz8gXCJcIilcbiAgICAsIFwiXCIpO1xuXG4gICAgLy8gMi4gQ2xlYW4gdGhlIHN0cmluZ1xuICAgIGNvbnN0IG5vX2NvbW1lbnRzID0gZnVsbF9yYXcucmVwbGFjZSgvICMuKlxcbi9nLCBcIlwiKTtcbiAgICBjb25zdCBub19zcGFjZXMgPSBub19jb21tZW50cy5yZXBsYWNlKC9cXHMrL2csIFwiXCIpO1xuICAgIHRyeXtcbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKG5vX3NwYWNlcywgZmxhZ3MpO1xuICAgIH1jYXRjaChleCl7XG4gICAgICBjb25zdCBlcnI9Z2V0X2Vycm9yKGV4KSAgLy9jYXRjaCBhbmQgcmV0aHJvdyBzbyBjYW4gcGxhY2UgZGVidWdnZXIgaGVyZSB0byBkZWJ1ZyByZWdleFxuICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgdGhyb3cgZXJyXG4gICAgfVxuICB9O1xufVxuZXhwb3J0IGNvbnN0IHIgPSBTdHJpbmcucmF3O1xuZXhwb3J0IGNvbnN0IGRpZ2l0cz1yYFxcZCtgXG4iLCAiaW1wb3J0IHtyLHJlfSBmcm9tICcuL3JlZ2V4X2J1aWxkZXIuanMnXG4vLyAxLiBIeXBlcmxpbmtzIChTcGVjaWZpYyBPU0MgOClcblxuXG4gIC8vIFJldHVybiB0aGUgYWN0dWFsIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgcGFyYW1zXG5jb25zdCBoeXBlcmxpbmsgPSByYFxuICBcXHgxYlxcXTg7XG4gIFteO10qXG4gIDtcbiAgKD88dXJsPlteXFx4MWJcXHgwN10qKSBcbiAgKD86XFx4MWJcXFxcfFxceDA3KVxuICAoPzxsaW5rX3RleHQ+W15cXHgxYlxceDA3XSopXG4gIFxceDFiXFxdODs7XG4gICg/OlxceDFiXFxcXHxcXHgwNylgXG5cbi8vIDIuIFNHUiBDb2xvcnMgKFNwZWNpZmljIENTSSAnbScpXG5jb25zdCBzZ3JfY29sb3IgPSByYFxuICBcXHgxYlxcW1xuICAoPzxjb2xvcj5bXFxkO10qKVxuICBtYFxuXG5cbi8vIDMuIENhdGNoLWFsbCBmb3Igb3RoZXIgQU5TSSBzZXF1ZW5jZXMgKEN1cnNvciwgRXJhc2UsIG90aGVyIE9TQ3MpXG4vLyBUaGlzIG1hdGNoZXMgYW55dGhpbmcgc3RhcnRpbmcgd2l0aCBFU0MgWyBvciBFU0MgXSB0aGF0IHdhc24ndCBjYXVnaHQgYWJvdmUuXG5jb25zdCBvdGhlcl9hbnNpID0gcmBcbiAgXFx4MWJcXFtbXFx4MzAtXFx4M2ZdKltcXHgyMC1cXHgyZl0qW1xceDQwLVxceDdlXSAgICMgU3RhbmRhcmQgQ1NJIChDdXJzb3IsIGV0YylcbiAgXFx4MWJcXF1bXlxceDFiXFx4MDddKiAgICAgICAgICAgICAgICAgICAgICAgICAgIyBBbnkgb3RoZXIgT1NDXG4gIFxceDFiW1xceDQwLVxceDVhXFx4NWNcXHg1ZVxceDVmLCAgICAgICAgICAgICAgICAgIyBGZSBFc2NhcGUgc2VxdWVuY2VzXG4gIFxceDFiLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgMi1jaGFyYWN0ZXIgc2VxdWVuY2VzXG4gIFtcXHgwMC1cXHgxZl0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgQ29udHJvbCBjaGFycyAoVGFiLCBDUiwgTEYsIGV0YylcbmBcblxuZXhwb3J0IGNvbnN0IGFuc2lfcmVnZXggPSByZSgnZycpYFxuICAgICR7aHlwZXJsaW5rfXxcbiAgICAke3Nncl9jb2xvcn18XG4gICAgJHtvdGhlcl9hbnNpfXxcbmBcblxudHlwZSBHcm91cFR5cGU9IHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG59IHwgdW5kZWZpbmVkXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VfZ3JvdXBfaW50KGdyb3VwczpHcm91cFR5cGUsbmFtZTpzdHJpbmcpe1xuICBpZiAoZ3JvdXBzPT1udWxsKVxuICAgIHJldHVybiAwXG4gIGNvbnN0IHN0cj1ncm91cHNbbmFtZV18fCcnXG4gIHJldHVybiBwYXJzZUludChzdHIsIDEwKXx8MCBcbn1cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZV9ncm91cF9zdHJpbmcobWF0Y2g6UmVnRXhwTWF0Y2hBcnJheSxuYW1lOnN0cmluZyl7XG4gIGNvbnN0IHtncm91cHN9PW1hdGNoXG4gIGlmIChncm91cHM9PW51bGwpXG4gICAgcmV0dXJuIFxuICByZXR1cm4gZ3JvdXBzW25hbWVdXG4vLyAgcmV0dXJuIHN0clxufVxudHlwZSBmb250X3N0eWxlID0gJ2JvbGQnIHwgJ2l0YWxpYycgfCdmYWludCd8ICd1bmRlcmxpbmUnIHwgJ2JsaW5raW5nJyB8ICdpbnZlcnNlJyB8ICdzdHJpa2V0aHJvdWdoJztcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsZSB7XG4gIGZvcmVncm91bmQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgYmFja2dyb3VuZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBmb250X3N0eWxlczogU2V0PGZvbnRfc3R5bGU+O1xufVxudHlwZSBBbnNpQ29tbWFuZFR5cGU9J3N0eWxlJ3wnaW5zZXJ0J3wnc3R5bGVfaW5zZXJ0J1xuaW50ZXJmYWNlIEFuc2lDb21tYW5ke1xuICBwb3NpdGlvbjogbnVtYmVyO1xuICBjb21tYW5kOkFuc2lDb21tYW5kVHlwZVxufVxuXG5pbnRlcmZhY2UgQW5zaVN0eWxlQ29tbWFuZCBleHRlbmRzIEFuc2lDb21tYW5ke1xuICBjb21tYW5kOidzdHlsZSdcbiAgc3R5bGU6U3R5bGVcbn1cbmZ1bmN0aW9uIG1ha2VfY2xlYXJfc3R5bGVfY29tbWFuZChwb3NpdGlvbjpudW1iZXIpOkFuc2lTdHlsZUNvbW1hbmR7XG4gIHJldHVybiB7XG4gICAgY29tbWFuZDonc3R5bGUnLFxuICAgIHBvc2l0aW9uLFxuICAgIHN0eWxlOntcbiAgICAgIGZvcmVncm91bmQ6dW5kZWZpbmVkLFxuICAgICAgYmFja2dyb3VuZDp1bmRlZmluZWQsXG4gICAgICBmb250X3N0eWxlczogbmV3IFNldCgpXG4gICAgfVxuICB9XG59XG5leHBvcnQgaW50ZXJmYWNlIEFuc2lJbnNlcnRDb21tYW5kIGV4dGVuZHMgQW5zaUNvbW1hbmR7XG4gIGNvbW1hbmQ6J2luc2VydCdcbiAgc3RyOnN0cmluZ1xufVxuZXhwb3J0IGludGVyZmFjZSBBbnNpU3R5bGVJbnNlcnRDb21tYW5kIGV4dGVuZHMgQW5zaUNvbW1hbmR7XG4gIGNvbW1hbmQ6J3N0eWxlX2luc2VydCdcbiAgc3RyOnN0cmluZyxcbiAgc3R5bGU6U3R5bGVcbn1cbmZ1bmN0aW9uIGlzX3N0eWxlX2NvbW1hbmQoYTpBbnNpQ29tbWFuZHx1bmRlZmluZWQpOmEgaXMgQW5zaVN0eWxlQ29tbWFuZHtcbiAgcmV0dXJuIGE/LmNvbW1hbmQ9PT1cInN0eWxlXCJcbn1cbmZ1bmN0aW9uIGlzX2luc2VydF9jb21tYW5kKGE6QW5zaUNvbW1hbmR8dW5kZWZpbmVkKTphIGlzIEFuc2lJbnNlcnRDb21tYW5ke1xuICByZXR1cm4gYT8uY29tbWFuZD09PVwiaW5zZXJ0XCJcbn1cbmZ1bmN0aW9uIGlzX3N0eWxlX2luc2VydF9jb21tYW5kKGE6QW5zaUNvbW1hbmR8dW5kZWZpbmVkKTphIGlzIEFuc2lTdHlsZUluc2VydENvbW1hbmR7XG4gIHJldHVybiBhPy5jb21tYW5kPT09XCJzdHlsZV9pbnNlcnRcIlxufVxuXG5mdW5jdGlvbiBjaGVja19pbnNlcnRzX3ZhbGlkaXR5KGluc2VydHM6IEFycmF5PEFuc2lJbnNlcnRDb21tYW5kPik6IHZvaWQge1xuICBsZXQgbGFzdF9lbmQgPSAtMTtcbiAgZm9yIChjb25zdCByIG9mIGluc2VydHMpIHtcbiAgICBpZiAoci5wb3NpdGlvbiA8PSBsYXN0X2VuZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlJlcGxhY2VtZW50cyBjYW5ub3Qgb3ZlcmxhcCBhbmQgbXVzdCBiZSBzb3J0ZWRcIik7XG4gICAgbGFzdF9lbmQgPSByLnBvc2l0aW9uO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrX3N0eWxlX3Bvc2l0aW9uc192YWxpZGl0eShzdHlsZV9wb3NpdGlvbnM6IEFycmF5PEFuc2lTdHlsZUNvbW1hbmQ+KTogdm9pZCB7XG4gIGxldCBsYXN0X3BvcyA9IC0xO1xuICBmb3IgKGNvbnN0IHMgb2Ygc3R5bGVfcG9zaXRpb25zKSB7XG4gICAgaWYgKHMucG9zaXRpb24gPCBsYXN0X3BvcylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlN0eWxlIHBvc2l0aW9ucyBtdXN0IGJlIHNvcnRlZFwiKTtcbiAgICBsYXN0X3BvcyA9IHMucG9zaXRpb247XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0X3N0eWxlX2NzcyhzdHlsZTogU3R5bGV8dW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgaWYgKHN0eWxlPT1udWxsKVxuICAgIHJldHVybiAnJ1xuICBjb25zdCBjc3NfcGFydHM6IHN0cmluZ1tdID0gW107XG4gIGxldCB7Zm9yZWdyb3VuZCxiYWNrZ3JvdW5kfT1zdHlsZTtcblxuICAvLyBIYW5kbGUgJ2ludmVyc2UnIGJ5IHN3YXBwaW5nIGNvbG9ycyAoZGVzdHJ1Y3R1cmVkIGZvciBzaW5nbGUgc3RhdGVtZW50KVxuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCdpbnZlcnNlJykpXG4gICAgW2ZvcmVncm91bmQsIGJhY2tncm91bmRdID0gW2JhY2tncm91bmQsIGZvcmVncm91bmRdO1xuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCdmYWludCcpKVxuICAgIGNzc19wYXJ0cy5wdXNoKGBvcGFjaXR5Oi41YCk7XG4gIGlmIChmb3JlZ3JvdW5kIT1udWxsKVxuICAgIGNzc19wYXJ0cy5wdXNoKGBjb2xvcjoke2ZvcmVncm91bmR9YCk7XG4gIGlmIChiYWNrZ3JvdW5kIT1udWxsKVxuICAgIGNzc19wYXJ0cy5wdXNoKGBiYWNrZ3JvdW5kLWNvbG9yOiR7YmFja2dyb3VuZH1gKTtcbiAgaWYgKHN0eWxlLmZvbnRfc3R5bGVzLmhhcygnYm9sZCcpKVxuICAgIGNzc19wYXJ0cy5wdXNoKGBmb250LXdlaWdodDpib2xkYCk7XG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ2l0YWxpYycpKVxuICAgIGNzc19wYXJ0cy5wdXNoKGBmb250LXN0eWxlOml0YWxpY2ApO1xuXG4gIGNvbnN0IGRlY29yYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCd1bmRlcmxpbmUnKSlcbiAgICBkZWNvcmF0aW9ucy5wdXNoKCd1bmRlcmxpbmUnKTtcbiAgaWYgKHN0eWxlLmZvbnRfc3R5bGVzLmhhcygnc3RyaWtldGhyb3VnaCcpKVxuICAgIGRlY29yYXRpb25zLnB1c2goJ2xpbmUtdGhyb3VnaCcpO1xuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCdibGlua2luZycpKVxuICAgIGRlY29yYXRpb25zLnB1c2goJ2JsaW5rJyk7XG4gIFxuICBpZiAoZGVjb3JhdGlvbnMubGVuZ3RoID4gMClcbiAgICBjc3NfcGFydHMucHVzaChgdGV4dC1kZWNvcmF0aW9uOiR7ZGVjb3JhdGlvbnMuam9pbignICcpfWApO1xuICBpZiAoY3NzX3BhcnRzLmxlbmd0aD09PTApXG4gICAgcmV0dXJuICcnXG4gIHJldHVybiBgc3R5bGU9JyR7Y3NzX3BhcnRzLm1hcCh4PT5gJHt4fTtgKS5qb2luKCcnKX0nYFxufVxuZnVuY3Rpb24gaXNfY2xlYXJfc3R5bGUoc3R5bGU6U3R5bGUpe1xuICByZXR1cm4gc3R5bGUuYmFja2dyb3VuZD09bnVsbCYmc3R5bGUuZm9yZWdyb3VuZD09bnVsbCYmc3R5bGUuZm9udF9zdHlsZXMuc2l6ZT09PTBcbn1cblxuZnVuY3Rpb24gbWVyZ2Vfb25lKGE6QW5zaUNvbW1hbmQsYjpBbnNpQ29tbWFuZCk6QW5zaVN0eWxlSW5zZXJ0Q29tbWFuZHtcbiAgaWYgKGlzX3N0eWxlX2NvbW1hbmQoYSkmJmlzX2luc2VydF9jb21tYW5kKGIpICl7ICBcbiAgICByZXR1cm4ge1xuICAgICAgY29tbWFuZDpcInN0eWxlX2luc2VydFwiLFxuICAgICAgcG9zaXRpb246YS5wb3NpdGlvbixcbiAgICAgIHN0eWxlOmEuc3R5bGUsXG4gICAgICBzdHI6Yi5zdHJcbiAgICB9XG4gIH1cbiAgaWYgKGlzX3N0eWxlX2NvbW1hbmQoYikmJmlzX2luc2VydF9jb21tYW5kKGEpICl7ICBcbiAgICByZXR1cm4ge1xuICAgICAgY29tbWFuZDpcInN0eWxlX2luc2VydFwiLFxuICAgICAgcG9zaXRpb246YS5wb3NpdGlvbixcbiAgICAgIHN0eWxlOmIuc3R5bGUsXG4gICAgICBzdHI6YS5zdHJcbiAgICB9XG4gIH0gIFxuICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIGFuc2kgc3RydWN0dXJlXCIpICBcbn1cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZV9pbnNlcnRzKGE6QXJyYXk8QW5zaUluc2VydENvbW1hbmQ+LGI6QXJyYXk8QW5zaUluc2VydENvbW1hbmQ+KXtcbiAgY29uc3QgYW5zPVsuLi5hLC4uLmJdLnRvU29ydGVkKChhLCBiKT0+YS5wb3NpdGlvbi1iLnBvc2l0aW9uKSAvL3RvZG86IG1hcmdlIGZhc3RlciB1c2luZyB0aGUgZmFjdCB0aGF0IGEgYW5kIGIgYXJlIHNvcnRlZCBieSB0aGVtc2VsZiwgb3IgbWF5YmUgdGhhdCBhdXRvbWF0aWNseSBmYXN0ZXJcbiAgcmV0dXJuIGFuc1xufVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlKGE6QXJyYXk8QW5zaUNvbW1hbmQ+LGI6QXJyYXk8QW5zaUNvbW1hbmQ+KXtcbiAgY29uc3Qgc29ydGVkPVsuLi5hLC4uLmJdLnRvU29ydGVkKChhLCBiKT0+YS5wb3NpdGlvbi1iLnBvc2l0aW9uKSAvL3RvZG86IG1hcmdlIGZhc3RlciB1c2luZyB0aGUgZmFjdCB0aGF0IGEgYW5kIGIgYXJlIHNvcnRlZCBieSB0aGVtc2VsZiwgb3IgbWF5YmUgdGhhdCBhdXRvbWF0aWNseSBmYXN0ZXJcbiAgY29uc3QgYW5zOkFycmF5PEFuc2lDb21tYW5kPj1bXVxuICBmb3IgKGNvbnN0IHggb2Ygc29ydGVkKXtcbiAgICBjb25zdCBsYXN0X2luZGV4Om51bWJlcj1hbnMubGVuZ3RoIC0gMVxuICAgIGNvbnN0IGxhc3RfaXRlbT1hbnNbbGFzdF9pbmRleF1cbiAgICBpZihsYXN0X2l0ZW0/LnBvc2l0aW9uPT09eC5wb3NpdGlvbilcbiAgICAgIGFuc1tsYXN0X2luZGV4XSA9IG1lcmdlX29uZShsYXN0X2l0ZW0seClcbiAgICBlbHNlXG4gICAgICBhbnMucHVzaCh4KVxuICB9XG4gIHJldHVybiBhbnNcbn1cbmNvbnN0IGh0bWxfZW50aXR5X21hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICBcIidcIjogJyYjMzk7Jyxcbn07XG5cblxuZnVuY3Rpb24gZXNjYXBlX2h0bWxfY2hhcihjaGFyX3RvX2VzY2FwZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGh0bWxfZW50aXR5X21hcFtjaGFyX3RvX2VzY2FwZV0gPz8gY2hhcl90b19lc2NhcGU7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVfaHRtbCh7XG4gIHN0eWxlX3Bvc2l0aW9ucyxcbiAgaW5zZXJ0cyxcbiAgcGxhaW5fdGV4dFxufToge1xuICBpbnNlcnRzOiBBcnJheTxBbnNpSW5zZXJ0Q29tbWFuZD5cbiAgc3R5bGVfcG9zaXRpb25zOiBBcnJheTxBbnNpU3R5bGVDb21tYW5kPlxuICBwbGFpbl90ZXh0OiBzdHJpbmdcbn0pOiBzdHJpbmd7XG4gIGNoZWNrX2luc2VydHNfdmFsaWRpdHkoaW5zZXJ0cyk7XG4gIGlmIChzdHlsZV9wb3NpdGlvbnNbMF0/LnBvc2l0aW9uIT09MClcbiAgICBzdHlsZV9wb3NpdGlvbnM9Wy4uLnN0eWxlX3Bvc2l0aW9uc11cbiAgY2hlY2tfc3R5bGVfcG9zaXRpb25zX3ZhbGlkaXR5KHN0eWxlX3Bvc2l0aW9ucyk7XG4gIGNvbnN0IGNvbW1hbmRzPW1lcmdlKGluc2VydHMsc3R5bGVfcG9zaXRpb25zKVxuICBjb25zdCBodG1sOnN0cmluZ1tdPSBbXTtcblxuICBsZXQgY29tbWFuZF9oZWFkID0gMDtcbiAgbGV0IHB1c2hlZF9zdHlsZTpTdHlsZXx1bmRlZmluZWRcbiAgZnVuY3Rpb24gcHVzaF9zdHlsZShzdHlsZTpTdHlsZSl7XG4gICAgaWYgKHB1c2hlZF9zdHlsZSE9bnVsbCl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJzdHlsZSBhbHJlYXkgb3BlblwiKVxuICAgIH0gICAgXG4gICAgaHRtbC5wdXNoKGA8c3BhbiAke2dldF9zdHlsZV9jc3Moc3R5bGUpfT5gKTtcbiAgICBwdXNoZWRfc3R5bGU9c3R5bGVcbiAgfVxuICBmdW5jdGlvbiBwb3Bfc3R5bGUoYWxsb3dfZW1wdHk6Ym9vbGVhbil7IFxuICAgIGlmIChwdXNoZWRfc3R5bGU9PW51bGwpe1xuICAgICAgaWYgKGFsbG93X2VtcHR5KVxuICAgICAgICByZXR1cm4gbWFrZV9jbGVhcl9zdHlsZV9jb21tYW5kKDApLnN0eWxlXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIG51bGwgc3R5bGVcIilcbiAgICB9XG4gICAgY29uc3QgYW5zPXB1c2hlZF9zdHlsZVxuICAgIHB1c2hlZF9zdHlsZT11bmRlZmluZWRcbiAgICBodG1sLnB1c2goYDwvc3Bhbj5gKTtcbiAgICByZXR1cm4gYW5zXG4gIH1cbiAgZnVuY3Rpb24gZ2V0X2NvbW1hbmQocG9zaXRpb246bnVtYmVyKXtcbiAgICBmb3IoOzspe1xuICAgICAgY29uc3QgYW5zPWNvbW1hbmRzW2NvbW1hbmRfaGVhZF1cbiAgICAgIGlmIChhbnM9PW51bGwpXG4gICAgICAgIHJldHVybiBcbiAgICAgIGlmIChhbnMucG9zaXRpb249PT1wb3NpdGlvbilcbiAgICAgICAgcmV0dXJuIGFuc1xuICAgICAgaWYgKGFucy5wb3NpdGlvbj5wb3NpdGlvbilcbiAgICAgICAgcmV0dXJuXG4gICAgICBjb21tYW5kX2hlYWQrK1xuICAgIH1cbiAgfVxuICBmb3IgKGxldCBpID0gMDsgaSA8PSBwbGFpbl90ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY29tbWFuZD1nZXRfY29tbWFuZChpKVxuICAgIGlmIChpc19pbnNlcnRfY29tbWFuZChjb21tYW5kKSl7XG4gICAgICBjb25zdCBzdHlsZT1wb3Bfc3R5bGUoaT09PTApXG4gICAgICBodG1sLnB1c2goY29tbWFuZC5zdHIpXG4gICAgICBwdXNoX3N0eWxlKHN0eWxlKVxuICAgIH1cbiAgICBpZiAoaXNfc3R5bGVfY29tbWFuZChjb21tYW5kKSl7XG4gICAgICBwb3Bfc3R5bGUoaT09PTApXG4gICAgICBwdXNoX3N0eWxlKGNvbW1hbmQuc3R5bGUpXG4gICAgfVxuICAgIGlmIChpc19zdHlsZV9pbnNlcnRfY29tbWFuZChjb21tYW5kKSl7XG4gICAgICBwb3Bfc3R5bGUoaT09PTApXG4gICAgICBodG1sLnB1c2goY29tbWFuZC5zdHIpXG4gICAgICBwdXNoX3N0eWxlKGNvbW1hbmQuc3R5bGUpICAgICAgXG4gICAgfVxuICAgIGNvbnN0IGM9cGxhaW5fdGV4dFtpXSFcbiAgICBjb25zdCBlc2NhcGVkPWVzY2FwZV9odG1sX2NoYXIoYylcbiAgICBodG1sLnB1c2goZXNjYXBlZClcbiAgfVxuICBwb3Bfc3R5bGUocGxhaW5fdGV4dC5sZW5ndGg9PT0wKVxuICBjb25zdCBhbnM9aHRtbC5qb2luKCcnKVxuICByZXR1cm4gYW5zXG59XG5cbi8qKlxuICogTWFwcyBzdGFuZGFyZCBBTlNJIGNvbG9yIGNvZGVzIHRvIENTUyBuYW1lZCBjb2xvcnMuXG4gKi9cbmZ1bmN0aW9uIGdldEFuc2lOYW1lZENvbG9yKGNvZGU6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IG1hcDogUmVjb3JkPG51bWJlciwgc3RyaW5nPiA9IHtcbiAgICAwOiBcImJsYWNrXCIsIDE6IFwicmVkXCIsIDI6IFwiZ3JlZW5cIiwgMzogXCJ5ZWxsb3dcIiwgNDogXCJibHVlXCIsIDU6IFwibWFnZW50YVwiLCA2OiBcImN5YW5cIiwgNzogXCJ3aGl0ZVwiLFxuICAgIDg6IFwiZ3JheVwiLCA5OiBcInJlZFwiLCAxMDogXCJsaW1lXCIsIDExOiBcInllbGxvd1wiLCAxMjogXCJibHVlXCIsIDEzOiBcImZ1Y2hzaWFcIiwgMTQ6IFwiYXF1YVwiLCAxNTogXCJ3aGl0ZVwiXG4gIH07XG4gIHJldHVybiBtYXBbY29kZV0gfHwgXCJ3aGl0ZVwiO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIDgtYml0IEFOU0kgKDAtMjU1KSB0byBhIENTUyBjb2xvciBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGdldDhCaXRDb2xvcihuOiBudW1iZXIpOiBzdHJpbmcge1xuICBpZiAobiA8IDE2KSByZXR1cm4gZ2V0QW5zaU5hbWVkQ29sb3Iobik7XG4gIGlmIChuID49IDIzMikge1xuICAgIGNvbnN0IHYgPSAobiAtIDIzMikgKiAxMCArIDg7XG4gICAgcmV0dXJuIGByZ2IoJHt2fSwke3Z9LCR7dn0pYDtcbiAgfVxuICBjb25zdCBuMiA9IG4gLSAxNjtcbiAgY29uc3QgciA9IE1hdGguZmxvb3IobjIgLyAzNikgKiA1MTtcbiAgY29uc3QgZyA9IE1hdGguZmxvb3IoKG4yICUgMzYpIC8gNikgKiA1MTtcbiAgY29uc3QgYiA9IChuMiAlIDYpICogNTE7XG4gIHJldHVybiBgcmdiKCR7cn0sJHtnfSwke2J9KWA7XG59XG5cbmZ1bmN0aW9uIGNsb25lX3N0eWxlKHN0eWxlOiBTdHlsZSk6IFN0eWxlIHtcbiAgLy8gUmVxdWlyZW1lbnQ6IGlmIGFsbCBmb250IHN0eWxlcyBhcmUgbm9ybWFsLCBkb24ndCByZXBvcnQgJ25vcm1hbCdcbiAgcmV0dXJuIHsuLi5zdHlsZSxmb250X3N0eWxlczpuZXcgU2V0KHN0eWxlLmZvbnRfc3R5bGVzKX1cbn1cblxuZnVuY3Rpb24gaXNfc2FtZV9zdHlsZShhOiBTdHlsZXx1bmRlZmluZWQsIGI6IFN0eWxlKTogYm9vbGVhbiB7XG4gIGlmIChhID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlXG4gIGlmIChhLmZvcmVncm91bmQgIT09IGIuZm9yZWdyb3VuZCB8fCBhLmJhY2tncm91bmQgIT09IGIuYmFja2dyb3VuZClcbiAgICByZXR1cm4gZmFsc2VcbiAgaWYgKGEuZm9udF9zdHlsZXMuc2l6ZSAhPT0gYi5mb250X3N0eWxlcy5zaXplKVxuICAgIHJldHVybiBmYWxzZVxuICBmb3IgKGNvbnN0IHN0eWxlIG9mIGEuZm9udF9zdHlsZXMpXG4gICAgaWYgKCFiLmZvbnRfc3R5bGVzLmhhcyhzdHlsZSkpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIHRydWVcbn1cblxuZnVuY3Rpb24gYXBwbHlTR1JDb2RlKHBhcmFtczogbnVtYmVyW10sIHN0eWxlOiBTdHlsZSk6IHZvaWQge1xuICAvL3RvZG8gZ290byBhbmQgdmVyaWZ5IHRoYXQgY29ycmVjdCBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80ODQyNDI0L2xpc3Qtb2YtYW5zaS1jb2xvci1lc2NhcGUtc2VxdWVuY2VzXG4gIGxldCBpID0gMDtcbiAgd2hpbGUgKGkgPCBwYXJhbXMubGVuZ3RoKSB7XG4gICAgY29uc3QgY29kZSA9IHBhcmFtc1tpXSE7XG5cbiAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgc3R5bGUuZm9yZWdyb3VuZCA9IHVuZGVmaW5lZDtcbiAgICAgIHN0eWxlLmJhY2tncm91bmQgPSB1bmRlZmluZWQ7XG4gICAgICBzdHlsZS5mb250X3N0eWxlcy5jbGVhcigpO1xuICAgICAgaSsrO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gRm9udCBTdHlsZXNcbiAgICBpZiAoY29kZSA9PT0gMSkgeyBzdHlsZS5mb250X3N0eWxlcy5hZGQoJ2JvbGQnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSAyKSB7IHN0eWxlLmZvbnRfc3R5bGVzLmFkZCgnZmFpbnQnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSAzKSB7IHN0eWxlLmZvbnRfc3R5bGVzLmFkZCgnaXRhbGljJyk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gNCkgeyBzdHlsZS5mb250X3N0eWxlcy5hZGQoJ3VuZGVybGluZScpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDUpIHsgc3R5bGUuZm9udF9zdHlsZXMuYWRkKCdibGlua2luZycpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDcpIHsgc3R5bGUuZm9udF9zdHlsZXMuYWRkKCdpbnZlcnNlJyk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gOSkgeyBzdHlsZS5mb250X3N0eWxlcy5hZGQoJ3N0cmlrZXRocm91Z2gnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSAyMikgeyBzdHlsZS5mb250X3N0eWxlcy5kZWxldGUoJ2ZhaW50Jyk7c3R5bGUuZm9udF9zdHlsZXMuZGVsZXRlKCdib2xkJyk7IGkrKzsgY29udGludWU7IH1cblxuICAgIC8vIEZvcmVncm91bmQgKFN0YW5kYXJkICYgQnJpZ2h0KVxuICAgIGlmIChjb2RlID49IDMwICYmIGNvZGUgPD0gMzcpIHsgc3R5bGUuZm9yZWdyb3VuZCA9IGdldEFuc2lOYW1lZENvbG9yKGNvZGUgLSAzMCk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA+PSA5MCAmJiBjb2RlIDw9IDk3KSB7IHN0eWxlLmZvcmVncm91bmQgPSBnZXRBbnNpTmFtZWRDb2xvcihjb2RlIC0gOTAgKyA4KTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSAzOSkgeyBzdHlsZS5mb3JlZ3JvdW5kID0gdW5kZWZpbmVkOyBpKys7IGNvbnRpbnVlOyB9XG5cbiAgICAvLyBCYWNrZ3JvdW5kIChTdGFuZGFyZCAmIEJyaWdodClcbiAgICBpZiAoY29kZSA+PSA0MCAmJiBjb2RlIDw9IDQ3KSB7IHN0eWxlLmJhY2tncm91bmQgPSBnZXRBbnNpTmFtZWRDb2xvcihjb2RlIC0gNDApOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPj0gMTAwICYmIGNvZGUgPD0gMTA3KSB7IHN0eWxlLmJhY2tncm91bmQgPSBnZXRBbnNpTmFtZWRDb2xvcihjb2RlIC0gMTAwICsgOCk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gNDkpIHsgc3R5bGUuYmFja2dyb3VuZCA9IHVuZGVmaW5lZDsgaSsrOyBjb250aW51ZTsgfVxuXG4gICAgLy8gRXh0ZW5kZWQgQ29sb3JzICgzOD1GRywgNDg9QkcpXG4gICAgaWYgKGNvZGUgPT09IDM4IHx8IGNvZGUgPT09IDQ4KSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBjb2RlID09PSAzOCA/ICdmb3JlZ3JvdW5kJyA6ICdiYWNrZ3JvdW5kJztcbiAgICAgIGNvbnN0IHR5cGUgPSBwYXJhbXNbaSArIDFdO1xuXG4gICAgICBpZiAodHlwZSA9PT0gNSkgeyAvLyA4LWJpdFxuICAgICAgICBzdHlsZVt0YXJnZXRdID0gZ2V0OEJpdENvbG9yKHBhcmFtc1tpICsgMl0hKTtcbiAgICAgICAgaSArPSAzO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlID09PSAyKSB7IC8vIDI0LWJpdFxuICAgICAgICBzdHlsZVt0YXJnZXRdID0gYHJnYigke3BhcmFtc1tpICsgMl19LCR7cGFyYW1zW2kgKyAzXX0sJHtwYXJhbXNbaSArIDRdfSlgO1xuICAgICAgICBpICs9IDU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGkrKztcbiAgfVxufVxuZnVuY3Rpb24gZGVkdXBfcG9zaXRpb25zKHN0eWxlX3Bvc2l0aW9uczpBcnJheTxBbnNpU3R5bGVDb21tYW5kPil7XG4gIGNvbnN0IGFucz1bXVxuICBsZXQgbGFzdDpBbnNpU3R5bGVDb21tYW5kfHVuZGVmaW5lZFxuICBmb3IgKGNvbnN0IHggb2Ygc3R5bGVfcG9zaXRpb25zKXtcbiAgICBjb25zdCBzYW1lPWlzX3NhbWVfc3R5bGUobGFzdD8uc3R5bGUseC5zdHlsZSlcbiAgICBsYXN0PXhcbiAgICBpZiAoIXNhbWUpXG4gICAgICBhbnMucHVzaCh4KVxuICB9XG4gIHJldHVybiBhbnNcbn1cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcF9hbnNpKHRleHQ6IHN0cmluZywgc3RhcnRfc3R5bGU6IFN0eWxlKXtcbiAgY29uc3Qgc3R5bGVfcG9zaXRpb25zOiBBcnJheTxBbnNpU3R5bGVDb21tYW5kPiA9IFtdO1xuICBpZiAoIWlzX2NsZWFyX3N0eWxlKHN0YXJ0X3N0eWxlKSlcbiAgICBzdHlsZV9wb3NpdGlvbnMucHVzaCh7XG4gICAgICAgIGNvbW1hbmQ6J3N0eWxlJyxcbiAgICAgICAgc3R5bGU6c3RhcnRfc3R5bGUsXG4gICAgICAgIHBvc2l0aW9uOjBcbiAgICB9KVxuICBjb25zdCBzdHJpbmdzPVtdXG4gIGNvbnN0IGN1cnJlbnRfc3R5bGUgPSB7IC4uLnN0YXJ0X3N0eWxlLCBmb250X3N0eWxlczogbmV3IFNldChzdGFydF9zdHlsZS5mb250X3N0eWxlcykgfTtcbiAgY29uc3QgbGlua19pbnNlcnRzOkFycmF5PEFuc2lJbnNlcnRDb21tYW5kPj1bXVxuXG4gIGxldCBsYXN0X2luZGV4ID0gMDtcbiAgbGV0IHBvc2l0aW9uPTBcbiAgZnVuY3Rpb24gYXBwbHlfY29sb3IoY29sb3I6c3RyaW5nKXtcbiAgICBjb25zdCBwYXJhbXMgPSBjb2xvci5zcGxpdCgnOycpLm1hcChwID0+IHBhcnNlSW50KHAgfHwgXCIwXCIsIDEwKSk7XG4gICAgYXBwbHlTR1JDb2RlKHBhcmFtcywgY3VycmVudF9zdHlsZSk7XG5cbiAgICBjb25zdCBjbG9uZWQ6QW5zaVN0eWxlQ29tbWFuZD17c3R5bGU6Y2xvbmVfc3R5bGUoY3VycmVudF9zdHlsZSkscG9zaXRpb24sY29tbWFuZDonc3R5bGUnfVxuICAgIGNvbnN0IGxhc3Rfc3R5bGU9c3R5bGVfcG9zaXRpb25zLmF0KC0xKVxuICAgIGlmIChpc19zYW1lX3N0eWxlKGxhc3Rfc3R5bGU/LnN0eWxlLCBjbG9uZWQuc3R5bGUpKVxuICAgICAgICByZXR1cm5cbiAgICBpZiAobGFzdF9zdHlsZT8ucG9zaXRpb249PT1wb3NpdGlvbikge1xuICAgICAgc3R5bGVfcG9zaXRpb25zLnNwbGljZSgtMSwxLGNsb25lZClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBzdHlsZV9wb3NpdGlvbnMucHVzaChjbG9uZWQpXG4gIH1cblxuICBmb3IgKGNvbnN0IG1hdGNoIG9mIHRleHQubWF0Y2hBbGwoYW5zaV9yZWdleCkpe1xuICAgIC8vIDEuIEFjY3VtdWxhdGUgcGxhaW4gdGV4dFxuICAgIGNvbnN0IHtpbmRleH09bWF0Y2hcbiAgICBjb25zdCBza2lwX3N0cj10ZXh0LnNsaWNlKGxhc3RfaW5kZXgsIGluZGV4KVxuICAgIHBvc2l0aW9uKz1za2lwX3N0ci5sZW5ndGhcbiAgICBzdHJpbmdzLnB1c2goc2tpcF9zdHIpXG4gICAgXG5cbiAgICBjb25zdCBzZXF1ZW5jZSA9IG1hdGNoWzBdO1xuICAgIGxhc3RfaW5kZXggPSBpbmRleCtzZXF1ZW5jZS5sZW5ndGhcbiAgICBjb25zdCBjb2xvcj1wYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ2NvbG9yJylcbiAgICBpZiAoY29sb3IhPW51bGwpe1xuICAgICAgYXBwbHlfY29sb3IoY29sb3IpXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBjb25zdCB1cmw9cGFyc2VfZ3JvdXBfc3RyaW5nKG1hdGNoLCd1cmwnKVxuICAgIGNvbnN0IGxpbmtfdGV4dD1wYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ2xpbmtfdGV4dCcpXG4gICAgaWYgKHVybCE9bnVsbCAmJiBsaW5rX3RleHQhPW51bGwpe1xuICAgICAgbGlua19pbnNlcnRzLnB1c2goe1xuICAgICAgICBzdHI6YDxzcGFuIGRhdGEtdXJsPSR7dXJsfT4ke2xpbmtfdGV4dH08L3NwYW4+YCxcbiAgICAgICAgcG9zaXRpb24sXG4gICAgICAgIGNvbW1hbmQ6J2luc2VydCdcbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cbiAgY29uc3QgZGVkdXBlZD1kZWR1cF9wb3NpdGlvbnMoc3R5bGVfcG9zaXRpb25zKS8vZGVkdXBfcG9zaXRpb25zIGlzIG5lZWRlZCBldmVuIHRob293IHdlIGtub3dlbiBvdXQgYSBmZXcgYWJvdmUgXG4gIGNvbnN0IHdpdGhfcG9zMD1mdW5jdGlvbigpeyAvL2kgd2FudCBhIHN0eWxlIGF0IHBvcyAwIHRvIGhlbHAgdGhlIGxvZ2ljIG9mIGdlbmV0YXRlX2h0bWxcbiAgICBpZiAoZGVkdXBlZFswXT8ucG9zaXRpb24hPT0wKVxuICAgICAgcmV0dXJuIFttYWtlX2NsZWFyX3N0eWxlX2NvbW1hbmQoMCksLi4uZGVkdXBlZF1cbiAgICByZXR1cm4gZGVkdXBlZFxuICB9KClcbiAgY29uc3QgYW5zPSB7XG4gICAgcGxhaW5fdGV4dDpzdHJpbmdzLmpvaW4oJycpK3RleHQuc2xpY2UobGFzdF9pbmRleCksXG4gICAgc3R5bGVfcG9zaXRpb25zOndpdGhfcG9zMCxcbiAgICBsaW5rX2luc2VydHNcbiAgfTsgXG4gIC8vY29uc29sZS5sb2coYW5zKVxuICByZXR1cm4gYW5zXG59XG4iLCAiaW1wb3J0IHtjcmVhdGVfZWxlbWVudCxnZXRfcGFyZW50X2J5X2NsYXNzLGhhc19jbGFzcyx1cGRhdGVfY2hpbGRfaHRtbH0gZnJvbSAnLi9kb21fdXRpbHMuanMnXG5cbmludGVyZmFjZSBfU3RhcnRFbmR7XG4gIHN0YXJ0Om51bWJlclxuICBlbmQ6bnVtYmVyXG59XG5pbnRlcmZhY2UgTm9kZU9mZnNldHtcbiAgbm9kZTpOb2RlXG4gIG5vZGVfcG9zOm51bWJlclxufVxuZXhwb3J0IGludGVyZmFjZSBTZWFyY2hEYXRhe1xuICB0ZXJtX2VsOkhUTUxFbGVtZW50XG4gIHRlcm1fdGV4dDpIVE1MRWxlbWVudFxuICBoaWdobGlnaHQ6SGlnaGxpZ2h0ICBcbiAgdGVybV9wbGFpbl90ZXh0OnN0cmluZ1xuICBsaW5lczpBcnJheTxudW1iZXI+XG4gIC8vbmV3X2xpbmVfcG9zOkJpZ0ludDY0QXJyYXlcbn1cbmNsYXNzIFJlZ0V4cFNlYXJjaGVye1xuICB0ZXh0X2hlYWQ9MFxuICBsaW5lPTBcbiAgY2hpbGRyZW5cbiAgd2Fsa2VyOlRyZWVXYWxrZXJ8dW5kZWZpbmVkXG4gIHdhbGtlcl9vZmZzZXQ9MFxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgc2VhcmNoX2RhdGE6U2VhcmNoRGF0YSxcbiAgICBwdWJsaWMgcmVnZXg6UmVnRXhwLFxuICApe1xuICAgIHRoaXMuY2hpbGRyZW49c2VhcmNoX2RhdGEudGVybV9lbC5jaGlsZHJlblxuICB9XG4gIGFkdmFuY2VfbGluZSh0ZXh0X3BvczpudW1iZXIpe1xuICAgIGNvbnN0IHtjaGlsZHJlbixzZWFyY2hfZGF0YTp7bGluZXMsdGVybV9wbGFpbl90ZXh0fX09dGhpc1xuICAgIHdoaWxlKHRydWUpe1xuICAgICAgY29uc3QgbmV4dF9saW5lX3Bvcz1saW5lc1t0aGlzLmxpbmUrMV0/P3Rlcm1fcGxhaW5fdGV4dC5sZW5ndGhcbiAgICAgIGlmIChuZXh0X2xpbmVfcG9zPnRleHRfcG9zKXtcbiAgICAgICAgaWYgKHRoaXMud2Fsa2VyPT1udWxsKXtcbiAgICAgICAgICBjb25zdCBjdXJfbGluZV9ub2RlPWNoaWxkcmVuW3RoaXMubGluZV0hXG4gICAgICAgICAgdGhpcy53YWxrZXI9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihjdXJfbGluZV9ub2RlLCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG4gICAgICAgICAgdGhpcy50ZXh0X2hlYWQ9bGluZXNbdGhpcy5saW5lXSFcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHRoaXMud2Fsa2VyPXVuZGVmaW5lZFxuICAgICAgaWYgKHRoaXMubGluZTxsaW5lcy5sZW5ndGgpXG4gICAgICAgIHRoaXMubGluZSsrXG4gICAgfVxuICB9XG4gIGdldF9ub2RlX29mZnNldCh0ZXh0X3BvczpudW1iZXIpOk5vZGVPZmZzZXR7XG4gICAgdGhpcy5hZHZhbmNlX2xpbmUodGV4dF9wb3MpXG4gICAgaWYgKHRoaXMud2Fsa2VyPT1udWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCd3YWxrZXIgaXMgbnVsbCcpXG4gICAgd2hpbGUgKHRoaXMud2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLndhbGtlci5jdXJyZW50Tm9kZTtcbiAgICAgIGNvbnN0IHN0cmluZz1ub2RlLnRleHRDb250ZW50Pz8nJ1xuICAgICAgY29uc3Qge2xlbmd0aH09c3RyaW5nXG4gICAgICB0aGlzLnRleHRfaGVhZCs9bGVuZ3RoXG4gICAgICBpZiAodGV4dF9wb3M+PXRoaXMudGV4dF9oZWFkLWxlbmd0aCYmIHRleHRfcG9zIDx0aGlzLnRleHRfaGVhZClcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIG5vZGVfcG9zOnRleHRfcG9zLXRoaXMudGV4dF9oZWFkLWxlbmd0aFxuICAgICAgICB9IFxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJzaG91bGQgbm90IGdldCBoZXJlXCIpXG4gIH1cbiAgaXRlcj0oKT0+e1xuICAgIC8qaWYgKHRoaXMudGV4dF9oZWFkPT09dGhpcy5zZWFyY2hfZGF0YS50ZXJtX3BsYWluX3RleHQubGVuZ3RoKVxuICAgICAgcmV0dXJuKi9cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3Qge2xhc3RJbmRleH09dGhpcy5yZWdleFxuICAgICAgY29uc3QgbSA9IHRoaXMucmVnZXguZXhlYyh0aGlzLnNlYXJjaF9kYXRhLnRlcm1fcGxhaW5fdGV4dClcbiAgICAgIGlmIChtPT1udWxsKXtcbiAgICAgICAgdGhpcy5yZWdleC5sYXN0SW5kZXg9bGFzdEluZGV4IC8vIG1hdGNoIGNhdXNlcyByZWRleC5sYXN0aW5kZXggdG8gcmVzZXQgLSBsZXQgcHV0IGl0IGJhY2tcbiAgICAgICAgcmV0dXJuXG4gICAgICB9ICAgIFxuICAgICAgY29uc3Qgc3RhcnQ9dGhpcy5nZXRfbm9kZV9vZmZzZXQobS5pbmRleClcbiAgICAgIGNvbnN0IGVuZD10aGlzLmdldF9ub2RlX29mZnNldChtLmluZGV4ICsgbVswXS5sZW5ndGgpXG4gICAgICBjb25zdCByYW5nZSA9IG5ldyBSYW5nZSgpO1xuICAgICAgcmFuZ2Uuc2V0U3RhcnQoc3RhcnQubm9kZSxzdGFydC5ub2RlX3BvcylcbiAgICAgIHJhbmdlLnNldEVuZChlbmQubm9kZSxlbmQubm9kZV9wb3MpXG4gICAgICB0aGlzLnNlYXJjaF9kYXRhLmhpZ2hsaWdodC5hZGQocmFuZ2UpXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VfcmVnZXgoeyB0eHQsIG1hdGNoX2Nhc2UsIHdob2xlX3dvcmQsIHJlZ19leCB9OnsgXG4gIHR4dDpzdHJpbmcsIFxuICBtYXRjaF9jYXNlOmJvb2xlYW4sIFxuICB3aG9sZV93b3JkOmJvb2xlYW4sIFxuICByZWdfZXg6Ym9vbGVhbiBcbn0pIHtcbiAgICBsZXQgcGF0dGVybiA9IHR4dDtcbiAgICBpZiAodHh0PT09JycpXG4gICAgICByZXR1cm5cbiAgICBsZXQgZmxhZ3MgPSBcImdcIjtcblxuICAgIGlmICghbWF0Y2hfY2FzZSkge1xuICAgICAgICBmbGFncyArPSBcImlcIjtcbiAgICB9XG5cbiAgICBpZiAoIXJlZ19leCkge1xuICAgICAgICAvLyBFc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGZvciBhIGxpdGVyYWwgc3RyaW5nIG1hdGNoXG4gICAgICAgIHBhdHRlcm4gPSB0eHQucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICAgIH1cblxuICAgIGlmICh3aG9sZV93b3JkKSB7XG4gICAgICAgIHBhdHRlcm4gPSBgXFxcXGIke3BhdHRlcm59XFxcXGJgO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbn1cbmZ1bmN0aW9uIGdldF9yZWdleHBfc3RyaW5nKHBhdHRlcm46IFJlZ0V4cHx1bmRlZmluZWQpOiBzdHJpbmcge1xuICBpZiAocGF0dGVybj09bnVsbClcbiAgICByZXR1cm4gJ25vbmUnXG4gIGNvbnN0IHNvdXJjZSA9IHBhdHRlcm4uc291cmNlO1xuICBjb25zdCBmbGFncyA9IHBhdHRlcm4uZmxhZ3M7XG5cbiAgaWYgKGZsYWdzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gYC8ke3NvdXJjZX0vJHtmbGFnc31gO1xuICB9XG5cbiAgcmV0dXJuIGAvJHtzb3VyY2V9L2A7XG59XG5cblxuXG5leHBvcnQgY2xhc3MgVGVybWluYWxTZWFyY2h7XG4gIGZpbmRfd2lkZ2V0XG4gIGludGVydmFsX2lkXG4gIHJlZ2V4X3NlYXJjaGVyOlJlZ0V4cFNlYXJjaGVyfHVuZGVmaW5lZFxuICByZWdleDpSZWdFeHB8dW5kZWZpbmVkXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgZGF0YTpTZWFyY2hEYXRhXG4gICl7XG4gICAgICB0aGlzLmZpbmRfd2lkZ2V0PWNyZWF0ZV9lbGVtZW50KGBcbiAgICAgIDxkaXYgY2xhc3M9XCJmaW5kX3dpZGdldF9jb250YWluZXIgaGlkZGVuXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJmaW5kX3Rvb2xiYXJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmluZF9pbnB1dF93cmFwcGVyXCI+XG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImZpbmRfaW5wdXRfZmllbGRcIiBwbGFjZWhvbGRlcj1cIkZpbmRcIiBpZD1cImZpbmRfaW5wdXRcIiAvPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjdGlvbl9idXR0b25zXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpY29uX2J1dHRvblwiIHRpdGxlPVwiTWF0Y2ggQ2FzZVwiIGlkPW1hdGNoX2Nhc2U+QWE8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImljb25fYnV0dG9uXCIgdGl0bGU9XCJNYXRjaCBXaG9sZSBXb3JkXCIgaWQ9d2hvbGVfd29yZD48dT5hYjwvdT48L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImljb25fYnV0dG9uXCIgdGl0bGU9XCJVc2UgUmVndWxhciBFeHByZXNzaW9uXCIgaWQ9cmVnX2V4Pi4qPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibmF2aWdhdGlvbl9idXR0b25zXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzX2NvbnRhaW5lclwiIGlkPVwibWF0Y2hfc3RhdHVzXCI+XG4gICAgICAgICAgICAgIDAgb2YgMFxuICAgICAgICAgICAgPC9kaXY+ICAgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibmF2X2J1dHRvblwiIGlkPVwicHJldl9tYXRjaFwiIHRpdGxlPVwiUHJldmlvdXMgTWF0Y2ggKFNoaWZ0K0YzKVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYXJyb3dfdXBcIj48L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PiAgICAgICAgICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuYXZfYnV0dG9uXCIgaWQ9XCJuZXh0X21hdGNoXCIgdGl0bGU9XCJOZXh0IE1hdGNoIChGMylcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFycm93X2Rvd25cIj48L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5hdl9idXR0b25cIiBpZD1cImNsb3NlX3dpZGdldFwiIHRpdGxlPVwiQ2xvc2UgKEVzY2FwZSlcIj5cbiAgICAgICAgICAgICAgXHUwMEQ3XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgaWQ9XCJyZWdleFwiIHRpdGxlPVwiQ2xvc2UgKEVzY2FwZSlcIj5cbiAgICAgICAgICAgICAgZGZcbiAgICAgICAgICAgIDwvZGl2PiAgICAgICAgICAgIFxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICBcbiAgICBcbiAgICAgIDwvZGl2PmAsdGhpcy5kYXRhLnRlcm1fZWwpXG4gICAgICB0aGlzLmRhdGEudGVybV9lbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsdGhpcy5vbmNsaWNrKSAgICBcbiAgICAgIHRoaXMuaW5wdXQoKSEuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJyx0aGlzLnVwZGF0ZV9zZWFyY2gpICAgXG4gICAgICB0aGlzLmlucHV0KCkhLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0Jyx0aGlzLnVwZGF0ZV9zZWFyY2gpICAgXG4gICAgICB0aGlzLmludGVydmFsX2lkPXNldEludGVydmFsKHRoaXMuaXRlciwyMDApXG4gIH1cbiAgc2hvdygpe1xuICAgIHRoaXMuZmluZF93aWRnZXQuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICB0aGlzLmlucHV0KCk/LmZvY3VzKCk7XG4gIH1cbiAgaXRlcj0oKT0+e1xuICAgIHRoaXMucmVnZXhfc2VhcmNoZXI/Lml0ZXIoKVxuICB9XG4gIGlucHV0KCl7XG4gICAgcmV0dXJuIHRoaXMuZmluZF93aWRnZXQucXVlcnlTZWxlY3RvcjxIVE1MSW5wdXRFbGVtZW50PignI2ZpbmRfaW5wdXQnKVxuICB9XG4gIHNlYXJjaF90ZXJtX2NsZWFyKCl7XG4gICAgaWYgKHRoaXMucmVnZXgpXG4gICAgICB0aGlzLnJlZ2V4X3NlYXJjaGVyPW5ldyAgUmVnRXhwU2VhcmNoZXIodGhpcy5kYXRhLHRoaXMucmVnZXgpIFxuICB9XG4gIHVwZGF0ZV9zZWFyY2g9KCk9PntcbiAgICBjb25zdCB0eHQ9dGhpcy5pbnB1dCgpIS52YWx1ZVxuICAgIGNvbnN0IG1hdGNoX2Nhc2U9aGFzX2NsYXNzKHRoaXMuZmluZF93aWRnZXQsJyNtYXRjaF9jYXNlJyxcImNoZWNrZWRcIilcbiAgICBjb25zdCB3aG9sZV93b3JkPWhhc19jbGFzcyh0aGlzLmZpbmRfd2lkZ2V0LCcjd2hvbGVfd29yZCcsXCJjaGVja2VkXCIpXG4gICAgY29uc3QgcmVnX2V4PWhhc19jbGFzcyh0aGlzLmZpbmRfd2lkZ2V0LCcjcmVnX2V4JyxcImNoZWNrZWRcIilcblxuICAgIGNvbnN0IHJlZ2V4PW1ha2VfcmVnZXgoe3R4dCxtYXRjaF9jYXNlLHdob2xlX3dvcmQscmVnX2V4fSlcbiAgICB1cGRhdGVfY2hpbGRfaHRtbCh0aGlzLmZpbmRfd2lkZ2V0LCcjcmVnZXgnLGdldF9yZWdleHBfc3RyaW5nKHJlZ2V4KSlcbiAgICB0aGlzLmRhdGEuaGlnaGxpZ2h0LmNsZWFyKClcbiAgICB0aGlzLnJlZ2V4X3NlYXJjaGVyPXVuZGVmaW5lZFxuICAgIGlmIChyZWdleCE9bnVsbClcbiAgICAgIHRoaXMucmVnZXhfc2VhcmNoZXI9bmV3ICBSZWdFeHBTZWFyY2hlcih0aGlzLmRhdGEscmVnZXgpXG4gIH1cbiAgb25jbGljaz0oZXZlbnQ6TW91c2VFdmVudCk9PntcbiAgICBjb25zdCB7dGFyZ2V0fT1ldmVudFxuICAgIGlmICghKHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSlcbiAgICAgIHJldHVybiAgICBcbiAgICBpZiAodGFyZ2V0LmlkPT09J2Nsb3NlX3dpZGdldCcpe1xuICAgICAgZ2V0X3BhcmVudF9ieV9jbGFzcyh0YXJnZXQsJ2ZpbmRfd2lkZ2V0X2NvbnRhaW5lcicpPy5jbGFzc0xpc3QudG9nZ2xlKFwiaGlkZGVuXCIpO1xuICAgICAgcmV0dXJuXG4gICAgfSAgICBcbiAgICBjb25zdCBpY29uX2J1dHRvbj1nZXRfcGFyZW50X2J5X2NsYXNzKHRhcmdldCwnaWNvbl9idXR0b24nKVxuICAgIGlmIChpY29uX2J1dHRvbiE9bnVsbCl7XG4gICAgICBpY29uX2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdjaGVja2VkJylcbiAgICAgIHRoaXMudXBkYXRlX3NlYXJjaCgpXG4gICAgfVxuICB9XG59IiwgIlxuaW1wb3J0ICB7dHlwZSBTdHlsZSxzdHJpcF9hbnNpLGdlbmVyYXRlX2h0bWwsdHlwZSBBbnNpSW5zZXJ0Q29tbWFuZCwgbWVyZ2VfaW5zZXJ0c30gZnJvbSAnLi90ZXJtaW5hbHNfYW5zaS5qcyc7XG5pbXBvcnQge2dldF9wYXJlbnRfd2l0aF9kYXRhc2V0LGNyZWF0ZV9lbGVtZW50fSBmcm9tICcuL2RvbV91dGlscy5qcydcbmltcG9ydCB7VGVybWluYWxTZWFyY2gsdHlwZSBTZWFyY2hEYXRhfSBmcm9tICcuL3Rlcm1pbmFsX3NlYXJjaC5qcydcbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VSYW5nZXtcbiAgc3RhcnQ6bnVtYmVyXG4gIGVuZDpudW1iZXJcbiAgZGF0YXNldDpSZWNvcmQ8c3RyaW5nLHN0cmluZz5cbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGVybWluYWxMaXN0ZW5lcntcbiAgcGFyc2U6KGxpbmVfdGV4dDpzdHJpbmcsc3RhdGU6dW5rbm93bik9PntcbiAgICBwYXJzZXJfc3RhdGU6dW5rbm93bixcbiAgICByYW5nZXM6QXJyYXk8UGFyc2VSYW5nZT4gXG4gIH1cbiAgZGF0YXNldF9jbGljazooZGF0YXNldDpSZWNvcmQ8c3RyaW5nLHN0cmluZz4pPT52b2lkXG4gIG9wZW5fbGluazoodXJsOnN0cmluZyk9PnZvaWRcbn1cbnR5cGUgQ2hhbm5lbD0nc3RkZXJyJ3wnc3Rkb3V0JyBcbmludGVyZmFjZSBDaGFubmVsU3RhdGV7XG4gIGxhc3RfbGluZTpzdHJpbmdcbiAgbGFzdF9saW5lX3BsYWluOnN0cmluZ1xuICBzdGFydF9wYXJzZXJfc3RhdGU6dW5rbm93blxuICBlbmRfcGFyc2VyX3N0YXRlOnVua25vd25cbiAgc3RhcnRfc3R5bGU6U3R5bGVcbiAgZW5kX3N0eWxlOlN0eWxlXG4gIGNsYXNzX25hbWU6c3RyaW5nXG59XG5jb25zdCBjbGVhcl9zdHlsZTpTdHlsZT17XG4gIGZvcmVncm91bmQ6IHVuZGVmaW5lZCxcbiAgYmFja2dyb3VuZDogdW5kZWZpbmVkLFxuICBmb250X3N0eWxlczogbmV3IFNldCgpXG59XG5mdW5jdGlvbiBtYWtlX2NoYW5uZWxfc3RhdGVzKCk6UmVjb3JkPENoYW5uZWwsQ2hhbm5lbFN0YXRlPntcbiAgY29uc3Qgc3Rkb3V0OkNoYW5uZWxTdGF0ZT17XG4gICAgc3RhcnRfcGFyc2VyX3N0YXRlOnVuZGVmaW5lZCxcbiAgICBlbmRfcGFyc2VyX3N0YXRlOnVuZGVmaW5lZCxcbiAgICBzdGFydF9zdHlsZTpjbGVhcl9zdHlsZSxcbiAgICBjbGFzc19uYW1lOidsaW5lX3N0ZG91dCcsXG4gICAgZW5kX3N0eWxlOmNsZWFyX3N0eWxlLFxuICAgIGxhc3RfbGluZTonJyxcbiAgICBsYXN0X2xpbmVfcGxhaW46JydcbiAgfVxuICBjb25zdCBzdGRlcnI9ey4uLnN0ZG91dCxjbGFzc19uYW1lOidsaW5lX3N0ZGVycid9XG4gIHJldHVybiB7XG4gICAgc3Rkb3V0LFxuICAgIHN0ZGVyclxuICB9XG59XG5mdW5jdGlvbiByYW5nZV90b19pbnNlcnRzKHJhbmdlOlBhcnNlUmFuZ2UpOkFuc2lJbnNlcnRDb21tYW5kW117XG4gIGNvbnN0IHtzdGFydCxlbmQsZGF0YXNldH09cmFuZ2VcbiAgY29uc3QgZGF0YW1hcD1PYmplY3QuZW50cmllcyhkYXRhc2V0KS5tYXAoKFtrLHZdKT0+YGRhdGEtJHtrfT0nJHt2fSdgKS5qb2luKCcnKVxuICBjb25zdCBvcGVuPWA8c3BhbiAke2RhdGFtYXB9PmBcbiAgY29uc3QgY2xvc2U9YDwvc3Bhbj5gXG4gIHJldHVybiBbe3Bvc2l0aW9uOnN0YXJ0LHN0cjpvcGVuLGNvbW1hbmQ6J2luc2VydCd9LHtwb3NpdGlvbjplbmQsc3RyOmNsb3NlLGNvbW1hbmQ6J2luc2VydCd9XVxufVxuZnVuY3Rpb24gcmFuZ2VzX3RvX2luc2VydHMocmFuZ2VzOkFycmF5PFBhcnNlUmFuZ2U+KXtcbiAgcmV0dXJuIHJhbmdlcy5mbGF0TWFwKHJhbmdlX3RvX2luc2VydHMpXG59XG5mdW5jdGlvbiBnZXRfZWxlbWVudF9kYXRhc2V0IChlbGVtZW50OiBIVE1MRWxlbWVudCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKE9iamVjdC5lbnRyaWVzKGVsZW1lbnQuZGF0YXNldCkpIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59O1xuXG5leHBvcnQgY2xhc3MgVGVybWluYWwgaW1wbGVtZW50cyBTZWFyY2hEYXRhe1xuICBjaGFubmVsX3N0YXRlc1xuICB0ZXJtX3RleHRcbiAgdGVybV9lbFxuICBzZWFyY2hcbiAgaGlnaGxpZ2h0XG4gIHRlcm1fcGxhaW5fdGV4dD0nJ1xuICBsaW5lczpBcnJheTxudW1iZXI+XG4gIGxhc3Rfd3JpdGVfY2hhbm5lbDpDaGFubmVsPVwic3Rkb3V0XCJcbiAgc3RyaW5nczpzdHJpbmdbXVxuICAvL3RleHRfaW5kZXhcbiAgY29uc3RydWN0b3IoXG4gICAgcGFyZW50OkhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgbGlzdGVuZXI6VGVybWluYWxMaXN0ZW5lcixcbiAgICBpZDpzdHJpbmdcbiAgKXtcbiAgICB0aGlzLnN0cmluZ3M9W11cbiAgICB0aGlzLmxpbmVzPVtdXG4gICAgdGhpcy5jaGFubmVsX3N0YXRlcz1tYWtlX2NoYW5uZWxfc3RhdGVzKClcbiAgICB0aGlzLnRlcm1fZWw9Y3JlYXRlX2VsZW1lbnQoYFxuPGRpdiBjbGFzcz10ZXJtPlxuICA8ZGl2IGNsYXNzPVwidGVybV90ZXh0XCI+PC9kaXY+XG48L2Rpdj5cbiAgICBgLHBhcmVudClcbiAgICB0aGlzLnRlcm1fdGV4dD10aGlzLnRlcm1fZWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJy50ZXJtX3RleHQnKSFcbiAgICB0aGlzLnRlcm1fdGV4dC5pbm5lckhUTUw9JydcbiAgICAvL3RoaXMudGV4dF9pbmRleD1uZXcgQmlnSW50NjRBcnJheSgpXG4gICAgdGhpcy50ZXJtX3BsYWluX3RleHQ9JydcbiAgICB0aGlzLmhpZ2hsaWdodD10aGlzLm1ha2VfaGlnaGxpZ2h0KGlkKVxuICAgIHRoaXMuc2VhcmNoPW5ldyBUZXJtaW5hbFNlYXJjaCh0aGlzKVxuICAgIHRoaXMudGVybV9lbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsdGhpcy5vbmNsaWNrKVxuICB9XG4gIG1ha2VfaGlnaGxpZ2h0KGlkOnN0cmluZyl7XG4gICAgY29uc3QgaGlnaGxpZ2h0X25hbWU9YHNlYXJjaF8ke2lkfWBcbiAgICBjb25zdCBoaWdobGlnaHQ9bmV3IEhpZ2hsaWdodCgpXG4gICAgY29uc3QgZHluYW1pY19zaGVldCA9IG5ldyBDU1NTdHlsZVNoZWV0KCk7XG4gICAgZG9jdW1lbnQuYWRvcHRlZFN0eWxlU2hlZXRzLnB1c2goZHluYW1pY19zaGVldCk7ICAgIFxuICAgIGR5bmFtaWNfc2hlZXQuaW5zZXJ0UnVsZShgOjpoaWdobGlnaHQoJHtoaWdobGlnaHRfbmFtZX0pIHsgYmFja2dyb3VuZC1jb2xvcjogcmVkOyB9YCk7XG4gICAgQ1NTLmhpZ2hsaWdodHMuc2V0KGhpZ2hsaWdodF9uYW1lLCBoaWdobGlnaHQpOyAgICAgXG4gICAgcmV0dXJuIGhpZ2hsaWdodCAgIFxuICB9XG4gIG9uY2xpY2s9KGV2ZW50Ok1vdXNlRXZlbnQpPT57XG4gICAgY29uc3Qge3RhcmdldH09ZXZlbnRcbiAgICBpZiAoISh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICByZXR1cm4gICAgXG4gICAgY29uc3QgcGFyZW50PWdldF9wYXJlbnRfd2l0aF9kYXRhc2V0KHRhcmdldClcbiAgICBpZiAocGFyZW50PT1udWxsKVxuICAgICAgcmV0dXJuICBcbiAgICBjb25zdCBkYXRhc2V0PWdldF9lbGVtZW50X2RhdGFzZXQocGFyZW50KVxuICAgIGNvbnN0IHt1cmx9PWRhdGFzZXRcbiAgICBpZiAodXJsIT1udWxsKVxuICAgICAgdGhpcy5saXN0ZW5lci5vcGVuX2xpbmsodXJsKVxuICAgIGVsc2VcbiAgICAgIHRoaXMubGlzdGVuZXIuZGF0YXNldF9jbGljayhkYXRhc2V0KVxuICB9XG4gIGFmdGVyX3dyaXRlKCl7XG4gICAgdGhpcy50ZXJtX3RleHQucXVlcnlTZWxlY3RvcignLmVvZicpPy5jbGFzc0xpc3QucmVtb3ZlKCdlb2YnKVxuICAgIHRoaXMudGVybV90ZXh0Lmxhc3RFbGVtZW50Q2hpbGQ/LmNsYXNzTGlzdC5hZGQoJ2VvZicpXG4gICAgY29uc3Qgam9pbmVkX3N0cmluZ3M9dGhpcy5zdHJpbmdzLmpvaW4oJycpXG4gICAgbGV0IGFjdW09dGhpcy50ZXJtX3BsYWluX3RleHQubGVuZ3RoXG4gICAgZm9yIChjb25zdCBzdHIgb2Ygam9pbmVkX3N0cmluZ3Muc3BsaXQoJ1xcbicpKXtcbiAgICAgIGFjdW0rPXN0ci5sZW5ndGhcbiAgICAgIHRoaXMubGluZXMucHVzaChhY3VtKVxuICAgIH1cbiAgICB0aGlzLnRlcm1fcGxhaW5fdGV4dD1bdGhpcy50ZXJtX3BsYWluX3RleHQsam9pbmVkX3N0cmluZ3NdLmpvaW4oJycpXG4gICAgY29uc29sZS5sb2codGhpcy50ZXJtX3BsYWluX3RleHQpXG4gICAgY29uc29sZS5sb2codGhpcy5saW5lcylcblxuICB9XG4gIGZsdXNoX2NoYW5uZWwoY2hhbm5lbF9zdGF0ZTpDaGFubmVsU3RhdGUsYXBwZW5kX25sOmJvb2xlYW4pe1xuICAgIGlmIChjaGFubmVsX3N0YXRlLmxhc3RfbGluZT09PScnKSAvL2FsbCBmbHVzaGVkIGFscmVhZHlcbiAgICAgIHJldHVyblxuICAgIGlmIChhcHBlbmRfbmwpXG4gICAgICB0aGlzLnN0cmluZ3MucHVzaCgnXFxuJylcbiAgICBjaGFubmVsX3N0YXRlLnN0YXJ0X3BhcnNlcl9zdGF0ZT1jaGFubmVsX3N0YXRlLmVuZF9wYXJzZXJfc3RhdGVcbiAgICBjaGFubmVsX3N0YXRlLnN0YXJ0X3N0eWxlPWNoYW5uZWxfc3RhdGUuZW5kX3N0eWxlXG4gICAgY2hhbm5lbF9zdGF0ZS5lbmRfcGFyc2VyX3N0YXRlPXVuZGVmaW5lZFxuICAgIGNoYW5uZWxfc3RhdGUuZW5kX3BhcnNlcl9zdGF0ZT1jbGVhcl9zdHlsZVxuICAgIGNoYW5uZWxfc3RhdGUubGFzdF9saW5lPScnXG4gICAgY2hhbm5lbF9zdGF0ZS5sYXN0X2xpbmVfcGxhaW49JydcblxuICB9XG4gIGRlbF9sYXN0X2h0bWxfbGluZShjaGFubmVsX3N0YXRlOkNoYW5uZWxTdGF0ZSl7XG4gICAgY29uc3Qge2xhc3RfbGluZSxsYXN0X2xpbmVfcGxhaW59PWNoYW5uZWxfc3RhdGVcbiAgICBpZiAobGFzdF9saW5lPT09JycpXG4gICAgICByZXR1cm5cbiAgICBjb25zdCBsaW5lX3RvX2RlbGV0ZT10aGlzLnRlcm1fdGV4dC5xdWVyeVNlbGVjdG9yKGAmID4gOmxhc3QtY2hpbGRgKVxuICAgIGlmIChsaW5lX3RvX2RlbGV0ZT09bnVsbCl7XG4gICAgICBjb25zb2xlLmVycm9yKCdtaXNzbWF0Y2g6bGluZV90b19kZWxldGVfbnVsbCcpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3Qge3RleHRDb250ZW50fT1saW5lX3RvX2RlbGV0ZVxuICAgIGlmICh0ZXh0Q29udGVudCE9PWxhc3RfbGluZV9wbGFpbil7XG4gICAgICBjb25zb2xlLmVycm9yKCdtaXNzbWF0Y2g6dGV4dF9jb250ZW50JylcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBsaW5lX3RvX2RlbGV0ZS5yZW1vdmUoKVxuICB9XG4gIHRlcm1fd3JpdGUob3V0cHV0OnN0cmluZ1tdLGNoYW5uZWw6Q2hhbm5lbCl7XG4gICAgaWYgKG91dHB1dC5sZW5ndGg9PT0wKVxuICAgICAgcmV0dXJuXG4gICAgY29uc3QgY2hhbm5lbF9zdGF0ZT10aGlzLmNoYW5uZWxfc3RhdGVzW2NoYW5uZWxdXG4gICAgXG4gICAgaWYgKHRoaXMubGFzdF93cml0ZV9jaGFubmVsIT09Y2hhbm5lbCl7IC8vZm9yY2luZyBsaW5lIGJyZWFrIHdoZW4gc3dpdGNoaW5nIGNoYW5uZWxzXG4gICAgICB0aGlzLmZsdXNoX2NoYW5uZWwodGhpcy5jaGFubmVsX3N0YXRlc1t0aGlzLmxhc3Rfd3JpdGVfY2hhbm5lbF0sdHJ1ZSlcbiAgICB9XG4gICAgdGhpcy5sYXN0X3dyaXRlX2NoYW5uZWw9Y2hhbm5lbFxuXG4gICAgY29uc3Qgam9pbmVkX2xpbmVzPVtjaGFubmVsX3N0YXRlLmxhc3RfbGluZSwuLi5vdXRwdXRdLmpvaW4oJycpLnJlcGxhY2VBbGwoJ1xcclxcbicsJ1xcbicpXG4gICAgY29uc3QgbGluZXM9am9pbmVkX2xpbmVzLnNwbGl0KCdcXG4nKVxuICAgIHRoaXMuZGVsX2xhc3RfaHRtbF9saW5lKGNoYW5uZWxfc3RhdGUpXG4vLyAgICBjb25zdCBsaW5lc190b19yZW5kZXIgPSB0aGlzLmxhc3RfbGluZSA9PT0gJycgPyBsaW5lcy5zbGljZSgwLC0xKSA6IGxpbmVzIFxuICAgIGNvbnN0IGFjdW1faHRtbD1bXVxuICAgIGZvciAobGV0IGk9MDtpPGxpbmVzLmxlbmd0aDtpKyspe1xuICAgICAgY29uc3QgbGluZT1saW5lc1tpXSFcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcGxhaW5fdGV4dCxcbiAgICAgICAgc3R5bGVfcG9zaXRpb25zLFxuICAgICAgICBsaW5rX2luc2VydHNcbiAgICAgIH09c3RyaXBfYW5zaShsaW5lLCBjaGFubmVsX3N0YXRlLnN0YXJ0X3N0eWxlKVxuICAgICAgdGhpcy5zdHJpbmdzLnB1c2gocGxhaW5fdGV4dClcbiAgICAgIGNvbnN0IGlzX2xhc3Q9KGk9PT1saW5lcy5sZW5ndGgtMSlcbiAgICAgIGlmIChpc19sYXN0KXtcbiAgICAgICAgaWYgKGxpbmU9PT0nJyl7XG4gICAgICAgICAgdGhpcy5mbHVzaF9jaGFubmVsKGNoYW5uZWxfc3RhdGUsZmFsc2UpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3Qge3JhbmdlcyxwYXJzZXJfc3RhdGV9PXRoaXMubGlzdGVuZXIucGFyc2UocGxhaW5fdGV4dCxjaGFubmVsX3N0YXRlLnN0YXJ0X3BhcnNlcl9zdGF0ZSlcbiAgICAgIGNoYW5uZWxfc3RhdGUuZW5kX3N0eWxlPXN0eWxlX3Bvc2l0aW9ucy5hdCgtMSkhLnN0eWxlIC8vc3RyaXBfYW5zaSBpcyBndXJhbnRpZWQgdG8gaGF2ZSBhdCBsZWFzdCBvbmUgaW4gc3R5bGUgcG9zaXRvbnMuIGkgdHJpZWQgdG8gZW5jb2RlIGl0IGluIHRzIGJ1dCB3YXMgdG9vIHZlcmJvc2UgdG8gbXkgbGlraW5nXG4gICAgICBjaGFubmVsX3N0YXRlLmVuZF9wYXJzZXJfc3RhdGU9cGFyc2VyX3N0YXRlXG4gICAgICBjaGFubmVsX3N0YXRlLmxhc3RfbGluZT1saW5lXG4gICAgICBjaGFubmVsX3N0YXRlLmxhc3RfbGluZV9wbGFpbj1wbGFpbl90ZXh0XG4gICAgICBjb25zdCByYW5nZV9pbnNlcnRzPXJhbmdlc190b19pbnNlcnRzKHJhbmdlcylcbiAgICAgIGNvbnN0IGluc2VydHM9bWVyZ2VfaW5zZXJ0cyhyYW5nZV9pbnNlcnRzLGxpbmtfaW5zZXJ0cylcbiAgICAgIGNvbnN0IGh0bWw9Z2VuZXJhdGVfaHRtbCh7c3R5bGVfcG9zaXRpb25zLGluc2VydHMscGxhaW5fdGV4dH0pXG4gICAgICBjb25zdCBicj0ocGxhaW5fdGV4dD09PScnPyc8YnI+JzonJylcbiAgICAgIGFjdW1faHRtbC5wdXNoKCBgPGRpdiBjbGFzcz1cIiR7Y2hhbm5lbF9zdGF0ZS5jbGFzc19uYW1lfVwiPiR7aHRtbH0ke2JyfTwvZGl2PmApXG4gICAgICBpZiAoIWlzX2xhc3QpXG4gICAgICAgIHRoaXMuZmx1c2hfY2hhbm5lbChjaGFubmVsX3N0YXRlLHRydWUpXG4gICAgfVxuXG4gICAgY29uc3QgbmV3X2h0bWw9YWN1bV9odG1sLmpvaW4oJycpXG4gICAgdGhpcy50ZXJtX3RleHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLG5ld19odG1sKVxuICB9XG4gIHNob3dfZmluZCgpe1xuICAgIHRoaXMuc2VhcmNoLnNob3coKVxuICB9XG4gXG4gIHRlcm1fY2xlYXIoKXtcbiAgICB0aGlzLnRlcm1fdGV4dC5pbm5lckhUTUw9JydcbiAgICB0aGlzLmNoYW5uZWxfc3RhdGVzPW1ha2VfY2hhbm5lbF9zdGF0ZXMoKVxuICAgIHRoaXMuc2VhcmNoLnNlYXJjaF90ZXJtX2NsZWFyKClcbiAgICB0aGlzLnN0cmluZ3M9W11cbiAgICB0aGlzLnRlcm1fcGxhaW5fdGV4dD0nJ1xuICAgIHRoaXMubGluZXM9W11cbiAgICAgIC8qc3Rkb3V0OntsYXN0X2xpbmU6JycsYW5jb3JlOnVuZGVmaW5lZCxzdHlsZTpjbGVhcl9zdHlsZX0sXG4gICAgICBzdGRlcnI6e2xhc3RfbGluZTonJyxhbmNvcmU6dW5kZWZpbmVkLHN0eWxlOmNsZWFyX3N0eWxlfVxuICAgIH0gICAqLyBcbiAgfVxuXG59IiwgImltcG9ydCB7cGFyc2VfZ3JvdXBfc3RyaW5nfSBmcm9tICcuL3Rlcm1pbmFsc19hbnNpLmpzJ1xuaW1wb3J0IHR5cGUge1BhcnNlUmFuZ2V9IGZyb20gJy4vdGVybWluYWwuanMnXG5pbXBvcnQge3IsZGlnaXRzLHJlIH0gZnJvbSAnLi9yZWdleF9idWlsZGVyLmpzJ1xuY29uc3Qgcm93PXJgKD88cm93PiR7ZGlnaXRzfSlgXG5jb25zdCBjb2w9cmAoPzxjb2w+JHtkaWdpdHN9KWBcbmNvbnN0IG9wdGlvbmFsX3Jvd2NvbD1yYChcbiAgICAoPzoke3Jvd30sJHtjb2x9KXxcbiAgICAoPzo6JHtyb3d9OiR7Y29sfSlcbiAgKT9gXG5jb25zdCBsaW5rc19yZWdleD1yZSgnZycpYFxuICAoPzxzb3VyY2VfZmlsZT4gICAgICAgICAgICAjIGNhcHR1cmUgZ3JvdXAgc291cmNlX2ZpbGVcbiAgICAoPzwhWy5hLXpBLVpdKVxuICAgICg/OlthLXpBLVpdOik/ICAgICAgICAgICAgICMgb3B0aW9uYWwgZHJpdmUgY2hhciBmb2xsb3dlZCBieSBjb2xvblxuICAgIFthLXpBLVowLTlfL1xcXFxALi1dKyAgICAgIyBvbmUgb3IgbW9yZSBmaWxlIG5hbWUgY2hhcmVjdGVyc1xuICAgIFsuXVxuICAgIFthLXpBLVowLTldK1xuICAgICg/IVsuXScpICAgICAgICAgICAgICAgICAgICAjZGlzYWxsb3cgZG90IGltbWVkaWF0bHkgYWZ0ZXIgdGhlIG1hdGNoXG4gIClcbiAgJHtvcHRpb25hbF9yb3djb2x9YFxuXG5cbmNvbnN0IGFuY29yX3JlZ2V4PXJlKCcnKSBgXG4gIF5cbiAgKD88c291cmNlX2ZpbGU+XG4gICAgKFthLXpBLVpdOik/XG4gICAgW2EtekEtWjAtOV9cXC0uL1xcXFxAXStcbiAgKVxuICAke29wdGlvbmFsX3Jvd2NvbH1cbiAgXFxzKiRgXG5cbmNvbnN0IHJlZl9yZWdleCA9IHJlKCcnKWBcbiAgXlxccypcbiAgJHtyb3d9XG4gIDpcbiAgJHtjb2x9XG4gICguKilcbmBcbi8vY29uc3Qgb2xkX3JlZl9yZWdleCA9IC9eXFxzKig/PHJvdz5cXGQrKTooPzxjb2w+XFxkKykoLiopL1xuLy9jb25zb2xlLmxvZyh7cmVmX3JlZ2V4LG9sZF9yZWZfcmVnZXh9KVxuZnVuY3Rpb24gbm9fbnVsbHMob2JqOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkPil7XG4gIGNvbnN0IGFuczpSZWNvcmQ8c3RyaW5nLHN0cmluZz49e31cbiAgZm9yIChjb25zdCBbayx2XSBvZiBPYmplY3QuZW50cmllcyhvYmopKVxuICAgIGlmICh2IT1udWxsKVxuICAgICAgYW5zW2tdPXZcbiAgcmV0dXJuIGFuc1xufVxuXG5cbmZ1bmN0aW9uIGNhbGNfbWF0Y2gobWF0Y2g6UmVnRXhwTWF0Y2hBcnJheSk6UGFyc2VSYW5nZXtcbiAgY29uc3QgeyBpbmRleH0gPSBtYXRjaDtcbiAgY29uc3QgdGV4dCA9IG1hdGNoWzBdO1xuICBjb25zdCBzdGFydD0gaW5kZXghXG4gIGNvbnN0IGVuZD0gaW5kZXghICsgdGV4dC5sZW5ndGhcbiAgY29uc3Qgcm93PSBwYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ3JvdycpXG4gIGNvbnN0IGNvbD0gcGFyc2VfZ3JvdXBfc3RyaW5nKG1hdGNoLCdjb2wnKVxuICBjb25zdCBzb3VyY2VfZmlsZT1wYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ3NvdXJjZV9maWxlJylcbiAgcmV0dXJuIHtzdGFydCxlbmQsZGF0YXNldDpub19udWxscyh7cm93LGNvbCxzb3VyY2VfZmlsZX0pfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlX3RvX3JhbmdlcyhpbnB1dDpzdHJpbmcscGFyc2VyX3N0YXRlOnN0cmluZ3x1bmRlZmluZWQpe1xuICBjb25zdCByYW5nZXM6UGFyc2VSYW5nZVtdPVtdXG4gIGNvbnN0IGFuY29yX21hdGNoPWlucHV0Lm1hdGNoKGFuY29yX3JlZ2V4KVxuICBpZiAoYW5jb3JfbWF0Y2ghPW51bGwpe1xuICAgIGNvbnN0IHJldD1jYWxjX21hdGNoKGFuY29yX21hdGNoKVxuICAgIHJhbmdlcy5wdXNoKHJldClcbiAgICByZXR1cm4ge3BhcnNlcl9zdGF0ZTpyZXQuZGF0YXNldC5zb3VyY2VfZmlsZSxyYW5nZXN9XG4gIH1cbiAgaWYgKHBhcnNlcl9zdGF0ZSE9bnVsbCl7XG4gICAgY29uc3QgcmVmX21hdGNoID0gaW5wdXQubWF0Y2gocmVmX3JlZ2V4KVxuICAgIGlmIChyZWZfbWF0Y2ghPT1udWxsKXtcbiAgICAgIGNvbnN0IHJhbmdlPWNhbGNfbWF0Y2gocmVmX21hdGNoKVxuICAgICAgY29uc3Qge2RhdGFzZXR9PXJhbmdlXG4gICAgICByYW5nZXMucHVzaCh7XG4gICAgICAgIC4uLmNhbGNfbWF0Y2gocmVmX21hdGNoKSwgLy9ieSB0aGVvcmFtIHdpbGwgc291cmNlX2ZpbGUgd2lsbCBiZSBlbXB0eSBzdHJpbmcgYXQgdGhpcyBsaW5lLCBvdmVycmlkZW4gYnkgdGhlIG5leHRcbiAgICAgICAgZGF0YXNldDp7Li4uZGF0YXNldCxzb3VyY2VfZmlsZTpwYXJzZXJfc3RhdGV9XG4gICAgICB9KVxuICAgICAgcmV0dXJuIHtwYXJzZXJfc3RhdGUscmFuZ2VzfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWF0Y2ggb2YgaW5wdXQubWF0Y2hBbGwobGlua3NfcmVnZXgpKXtcbiAgICAgIHBhcnNlcl9zdGF0ZT11bmRlZmluZWQgLy9pZiBmb3VuZCBsaW5rIHRoYW4gY2FuY2VsIHRoZSBhbmNvcmUgb3RoZXJ3aXplIGxldCBpdCBiZVxuICAgICAgcmFuZ2VzLnB1c2goY2FsY19tYXRjaChtYXRjaCkpXG4gIH1cbiAgcmV0dXJuIHtyYW5nZXMscGFyc2VyX3N0YXRlfVxufVxuXG5mdW5jdGlvbiBpc19zdHJpbmdfb3JfdW5kZWZpbmVkKHg6dW5rbm93bik6IHggaXMgc3RyaW5nfHVuZGVmaW5lZHtcbiAgcmV0dXJuICB0eXBlb2YgeCA9PT0gJ3N0cmluZycgfHwgeCA9PT0gdW5kZWZpbmVkO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlX2xpbmUobGluZTpzdHJpbmcscGFyc2VyX3N0YXRlOnVua25vd24pe1xuICBpZiAoIWlzX3N0cmluZ19vcl91bmRlZmluZWQocGFyc2VyX3N0YXRlKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJleHBlY3Rpbmcgc3RyaW5nIG9yIHVuZGVmaW5lZFwiKVxuICByZXR1cm4gcGFyc2VfdG9fcmFuZ2VzKGxpbmUscGFyc2VyX3N0YXRlKVxufSIsICJcbmltcG9ydCAge3R5cGUgczJ0LGRlZmF1bHRfZ2V0LCBnZXRfZXJyb3J9IGZyb20gJ0B5aWdhbC9iYXNlX3R5cGVzJ1xuaW1wb3J0IHsgVGVybWluYWwsdHlwZSBUZXJtaW5hbExpc3RlbmVyIH0gZnJvbSAnLi90ZXJtaW5hbC5qcyc7XG5pbXBvcnQge3F1ZXJ5X3NlbGVjdG9yLGNyZWF0ZV9lbGVtZW50LGdldF9wYXJlbnRfYnlfY2xhc3MsdXBkYXRlX2NoaWxkX2h0bWwsdHlwZSBDb21wb25lbnR9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuaW1wb3J0IHR5cGUgeyBGb2xkZXIsUnVubmVyLFJ1bm5lclJlcG9ydCxSZWFzb24sRmlsZW5hbWV9IGZyb20gJy4uLy4uL3NyYy9kYXRhLmpzJztcbmltcG9ydCAge3Bvc3RfbWVzc2FnZSxjYWxjX2xhc3RfcnVufSBmcm9tICcuL2NvbW1vbi5qcydcbmltcG9ydCB7cGFyc2VfbGluZX0gZnJvbSAnLi90ZXJtaW5hbHNfcGFyc2UuanMnXG5cblxuZnVuY3Rpb24gZm9ybWF0RWxhcHNlZFRpbWUobXM6IG51bWJlcix0aXRsZTpzdHJpbmcsc2hvd19tczpib29sZWFuKTogc3RyaW5nIHtcbiAgY29uc3QgdG90YWxTZWNvbmRzID0gTWF0aC5mbG9vcihtcyAvIDEwMDApO1xuICBjb25zdCBtaWxsaXNlY29uZHMgPSBtcyAlIDEwMDA7XG4gIGNvbnN0IHNlY29uZHMgPSB0b3RhbFNlY29uZHMgJSA2MDtcbiAgY29uc3QgdG90YWxNaW51dGVzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgLyA2MCk7XG4gIGNvbnN0IG1pbnV0ZXMgPSB0b3RhbE1pbnV0ZXMgJSA2MDtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsTWludXRlcyAvIDYwKTtcbiAgY29uc3QgcGFkMiA9IChuOiBudW1iZXIpID0+IG4udG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpO1xuICBjb25zdCBwYWQzID0gKG46IG51bWJlcikgPT4gbi50b1N0cmluZygpLnBhZFN0YXJ0KDMsICcwJyk7XG4gIGNvbnN0IHRpbWUgPVxuICAgIGhvdXJzID4gMFxuICAgICAgPyBgJHtwYWQyKGhvdXJzKX06JHtwYWQyKG1pbnV0ZXMpfToke3BhZDIoc2Vjb25kcyl9YFxuICAgICAgOiBgJHtwYWQyKG1pbnV0ZXMpfToke3BhZDIoc2Vjb25kcyl9YDtcbiAgY29uc3QgbXNfZGlzcGxheT1zaG93X21zP2A8c3BhbiBjbGFzcz1tcz4uJHtwYWQzKG1pbGxpc2Vjb25kcyl9PC9zcGFuPmA6JydcbiAgcmV0dXJuIGA8ZGl2IHRpdGxlPVwiJHt0aXRsZX1cIj4ke3RpbWV9JHttc19kaXNwbGF5fTwvZGl2PmA7XG59XG5mdW5jdGlvbiByZWxfY2xpY2soZXZlbnQ6TW91c2VFdmVudCx0YXJnZXQ6SFRNTEVsZW1lbnQsZWZmZWN0aXZlX3dhdGNoOkZpbGVuYW1lW10pe1xuICBjb25zdCBwYXJlbnQ9Z2V0X3BhcmVudF9ieV9jbGFzcyh0YXJnZXQsJ3JlbCcpXG4gIGlmIChwYXJlbnQ9PW51bGwpXG4gICAgcmV0dXJuIGZhbHNlXG4gIFxuICBpZiAoIWV2ZW50LmN0cmxLZXkpe1xuICAgIGNvbnN0IHt0aXRsZX09cGFyZW50XG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9vcGVuX2ZpbGVfcm93Y29sXCIsXG4gICAgICB3b3Jrc3BhY2VfZm9sZGVyOicnLFxuICAgICAgc291cmNlX2ZpbGU6dGl0bGUsXG4gICAgICByb3c6MCxcbiAgICAgIGNvbDowXG4gICAgfSlcbiAgICByZXR1cm4gdHJ1ZSAgICAgXG4gIH1cbiAgXG4gIGNvbnN0IHJlbD1lZmZlY3RpdmVfd2F0Y2guZmluZCh4PT54LnJlbC5zdHI9PT1wYXJlbnQudGV4dENvbnRlbnQpXG4gIGlmIChyZWwhPW51bGwpe1xuICAgIC8vcmVsXG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9vcGVuX2ZpbGVfcG9zXCIsXG4gICAgICBwb3M6cmVsLnJlbFxuICAgIH0pXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn0gIFxuXG5mdW5jdGlvbiBtYWtlX29uY2xpY2soZWZmZWN0aXZlX3dhdGNoOkZpbGVuYW1lW10pe1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQ6TW91c2VFdmVudCl7XG4gICAgY29uc3Qge3RhcmdldH09ZXZlbnRcbiAgICBpZiAoISh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICByZXR1cm4gICAgXG4gICAgcmVsX2NsaWNrKGV2ZW50LHRhcmdldCxlZmZlY3RpdmVfd2F0Y2gpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3Rlcm1pbmFsX2VsZW1lbnQocnVubmVyOlJ1bm5lcik6IEhUTUxFbGVtZW50IHtcbiAgY29uc3QgdGVybXNfY29udGFpbmVyPXF1ZXJ5X3NlbGVjdG9yPEhUTUxFbGVtZW50Pihkb2N1bWVudC5ib2R5LCcudGVybXNfY29udGFpbmVyJylcbiAgY29uc3Qge2lkfT1ydW5uZXJcbiAgY29uc3QgcmV0PXRlcm1zX2NvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihgIyR7aWR9YClcbiAgaWYgKHJldCE9bnVsbClcbiAgICByZXR1cm4gcmV0IC8vdG9kbyBjaGVjayB0aGF0IGl0IGlzIEhUTUxFbGVtZW50XG4gIGNvbnN0IGFucz1jcmVhdGVfZWxlbWVudCggIGBcbjxkaXYgY2xhc3M9XCJ0ZXJtX3BhbmVsXCIgaWQ9XCIke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj5cbiAgPGRpdiBjbGFzcz1cInRlcm1fdGl0bGVfYmFyXCI+XG4gICAgPGRpdiBjbGFzcz1cImljb24gdGV4dFwiPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9Y29tbWFuZHNfaWNvbnM+PC9kaXY+XG4gICAgPGRpdiBjbGFzcz10ZXJtX3RpdGxlX2R1cmF0aW9uPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9ZGJnPjwvZGl2PlxuICAgIDx0YWJsZSBjbGFzcz13YXRjaGluZz48L3RhYmxlPlxuICBcbiAgPC9kaXY+XG48L2Rpdj5cbiAgYCx0ZXJtc19jb250YWluZXIpXG4gIGFucy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsbWFrZV9vbmNsaWNrKHJ1bm5lci5lZmZlY3RpdmVfd2F0Y2gpKVxuICByZXR1cm4gYW5zO1xufVxuZnVuY3Rpb24gY2FsY19lbGFwc2VkX2h0bWwocmVwb3J0OlJ1bm5lclJlcG9ydCxydW5uZXI6UnVubmVyKXtcbiAgY29uc3QgbGFzdF9ydW49Y2FsY19sYXN0X3J1bihyZXBvcnQscnVubmVyKVxuICBpZiAobGFzdF9ydW49PW51bGwpXG4gICAgcmV0dXJuICcnXG4gIGNvbnN0IHtzdGFydF90aW1lLGVuZF90aW1lfT1sYXN0X3J1blxuICBjb25zdCBub3c9RGF0ZS5ub3coKVxuICBjb25zdCBlZmZlY3RpdmVfZW5kX3RpbWU9ZnVuY3Rpb24oKXtcbiAgICBpZiAoZW5kX3RpbWU9PW51bGwpXG4gICAgICByZXR1cm4gbm93XG4gICAgcmV0dXJuIGVuZF90aW1lXG4gIH0oKVxuICBjb25zdCB0aW1lX3NpbmNlX2VuZD1mdW5jdGlvbigpe1xuICAgIGlmIChlbmRfdGltZT09bnVsbClcbiAgICAgIHJldHVybiAnJ1xuICAgIHJldHVybiBmb3JtYXRFbGFwc2VkVGltZShub3ctZW5kX3RpbWUsXCJ0aW1lIHNpbmNlIGRvbmVcIixmYWxzZSkgLy9ub3Qgc3VyZSBpZiBwZW9wbGUgd291bGUgbGlrZSB0aGlzXG4gIH0oKVxuICBjb25zdCBuZXdfdGltZT1mb3JtYXRFbGFwc2VkVGltZShlZmZlY3RpdmVfZW5kX3RpbWUtc3RhcnRfdGltZSwncnVuIHRpbWUnLHRydWUpK3RpbWVfc2luY2VfZW5kXG4gIHJldHVybiBuZXdfdGltZVxufVxuY29uc3QgaWdub3JlX3JlYXNvbnM6UmVhc29uW109Wydpbml0aWFsJywndXNlciddXG5mdW5jdGlvbiBjYWxjX3JlYXNvbl90cihyZXBvcnQ6UnVubmVyUmVwb3J0LHJ1bm5lcjpSdW5uZXIpe1xuICBjb25zdCBsYXN0X3J1bj1jYWxjX2xhc3RfcnVuKHJlcG9ydCxydW5uZXIpXG4gIGlmIChsYXN0X3J1bj09bnVsbClcbiAgICByZXR1cm4gJydcbiAgY29uc3Qge2Z1bGxfcmVhc29ufT1sYXN0X3J1blxuICBjb25zdCB7cmVhc29uLGZ1bGxfZmlsZW5hbWV9PWZ1bGxfcmVhc29uXG4gIGlmIChpZ25vcmVfcmVhc29ucy5pbmNsdWRlcyhyZWFzb24pKVxuICAgIHJldHVybiAnJ1xuICByZXR1cm4gYDx0cj48dGQ+KCR7cmVhc29ufSk8L3RkPjx0ZD48ZGl2PjxkaXYgY2xhc3M9cmVsIHRpdGxlPSR7ZnVsbF9maWxlbmFtZX0+JHtmdWxsX2ZpbGVuYW1lfTwvZGl2PjwvZGl2PjwvdGQ+PC90cj5gXG59XG5cbmZ1bmN0aW9uIGNhbGNfd2F0Y2hpbmdfdHIocnVubmVyOlJ1bm5lcil7XG4gIGlmIChydW5uZXIuZWZmZWN0aXZlX3dhdGNoLmxlbmd0aD09PTApXG4gICAgcmV0dXJuICcnXG4gIGNvbnN0IHNlcD1gPHNwYW4gY2xhc3M9c2VwPiBcdTIwMjIgPC9zcGFuPmBcbiAgY29uc3QgcmV0PXJ1bm5lci5lZmZlY3RpdmVfd2F0Y2gubWFwKCh7cmVsLGZ1bGx9KT0+YDxkaXYgdGl0bGU9JyR7ZnVsbH0nY2xhc3M9cmVsPiR7cmVsLnN0cn08L2Rpdj5gKS5qb2luKHNlcClcbiAgcmV0dXJuIGA8dHI+PHRkPjxkaXY+PGRpdiBjbGFzcz10b2dnbGVzX2ljb25zPjwvZGl2PldhdGNoaW5nOjwvdGQ+PC9kaXY+PHRkPjxkaXY+JHtyZXR9PC9kaXY+PC90ZD48L3RyPmBcbn1cblxuY2xhc3MgVGVybWluYWxQYW5lbCBpbXBsZW1lbnRzIFRlcm1pbmFsTGlzdGVuZXJ7XG4gIGxhc3RfcnVuX2lkOm51bWJlcnx1bmRlZmluZWRcbiAgZWxcbiAgdGVybVxuICB3b3Jrc3BhY2VfZm9sZGVyXG5cbiAgY29uc3RydWN0b3IoXG4gICAgcnVubmVyOlJ1bm5lciAvL3RoaXMgaXMgbm90IHNhdmVkLCBpdCBkb2VudCBoYXZlIHRoZSBwdWJsaWMvcHJpdmF0ZSx0aGF0IGluIHB1cnB1c2UgYmVjYXN1ZSBydW5uZXIgaGNuYWdlc1xuICApe1xuICAgIHRoaXMud29ya3NwYWNlX2ZvbGRlcj1ydW5uZXIud29ya3NwYWNlX2ZvbGRlclxuICAgIHRoaXMuZWw9Y3JlYXRlX3Rlcm1pbmFsX2VsZW1lbnQocnVubmVyKVxuICAgIHRoaXMudGVybT1uZXcgVGVybWluYWwodGhpcy5lbCx0aGlzLHJ1bm5lci5pZClcbiAgICAvL3RoaXMudGVybV9jbGVhcigpXG4gIH1cbiAgc2V0X3Zpc2liaWxpdHkodmFsOmJvb2xlYW4pe1xuICAgIHRoaXMuZWwuc3R5bGUuZGlzcGxheT0odmFsKT8nZmxleCc6J25vbmUnICAgXG4gIH1cbiAgcGFyc2UobGluZV90ZXh0OnN0cmluZyxwYXJzZV9zdGF0ZTp1bmtub3duKXtcbiAgICByZXR1cm4gcGFyc2VfbGluZShsaW5lX3RleHQscGFyc2Vfc3RhdGUpXG4gIH1cbiAgb3Blbl9saW5rKHVybDogc3RyaW5nKXtcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDpcImNvbW1hbmRfb3Blbl9saW5rXCIsXG4gICAgICB1cmxcbiAgICB9KVxuICB9XG4gIGRhdGFzZXRfY2xpY2soZGF0YXNldDpSZWNvcmQ8c3RyaW5nLHN0cmluZz4pe1xuICAgIGNvbnN0IHNvdXJjZV9maWxlPWRhdGFzZXQuc291cmNlX2ZpbGVcbiAgICBpZiAoc291cmNlX2ZpbGU9PW51bGwpIC8vdG9kbzogY2hlY2sgdGhhdCBub3QgZW1wdHkgc3RyaW5nP1xuICAgICAgcmV0dXJuXG4gICAgY29uc3Qgcm93PXBhcnNlSW50KGRhdGFzZXQucm93Pz8nJywxMCl8fDBcbiAgICBjb25zdCBjb2w9cGFyc2VJbnQoZGF0YXNldC5jb2w/PycnLDEwKXx8MFxuICAgIGNvbnN0IHt3b3Jrc3BhY2VfZm9sZGVyfT10aGlzXG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9vcGVuX2ZpbGVfcm93Y29sXCIsXG4gICAgICB3b3Jrc3BhY2VfZm9sZGVyLFxuICAgICAgc291cmNlX2ZpbGUsXG4gICAgICByb3csXG4gICAgICBjb2xcbiAgICB9KSAgICAgIFxuICB9XG4gIHVwZGF0ZV90ZXJtaW5hbDIocmVwb3J0OlJ1bm5lclJlcG9ydCxydW5uZXI6UnVubmVyKXtcbiAgICAvL2NvbnN0IHRpdGxlX2Jhcj1jYWxjX3RpdGxlX2h0bWwocmVwb3J0LHJ1bm5lcilcbiAgICBjb25zdCB3YXRjaGluZz0gIGAke2NhbGNfd2F0Y2hpbmdfdHIocnVubmVyKX0gIFxuICAke2NhbGNfcmVhc29uX3RyKHJlcG9ydCxydW5uZXIpfWBcbiAgICB1cGRhdGVfY2hpbGRfaHRtbCh0aGlzLmVsLCcudGVybV90aXRsZV9iYXIgLnRlcm1fdGl0bGVfZHVyYXRpb24nLGNhbGNfZWxhcHNlZF9odG1sKHJlcG9ydCxydW5uZXIpKVxuICAgIHVwZGF0ZV9jaGlsZF9odG1sKHRoaXMuZWwsJy50ZXJtX3RpdGxlX2JhciAud2F0Y2hpbmcnLHdhdGNoaW5nKVxuXG4gICAgY29uc3QgbGFzdF9ydW49Y2FsY19sYXN0X3J1bihyZXBvcnQscnVubmVyKVxuICAgIGlmIChsYXN0X3J1bj09bnVsbClcbiAgICAgIHJldHVyblxuICAgIGNvbnN0IHtydW5faWR9PWxhc3RfcnVuXG4gICAgaWYgKHJ1bl9pZCE9PXRoaXMubGFzdF9ydW5faWQpe1xuICAgICAgdGhpcy50ZXJtLnRlcm1fY2xlYXIoKSAgICAgXG4gICAgICAvL3RoaXMucmVzZXRfbGlua19wcm92aWRlcigpIC8vbm8gbmVlZCB0byBkbyBpdCBoZXJlIGJlY2F1c2UgdGVybS5jbGVhciBpcyBub3QgZWZmZWN0aXZlIGltbWlkZWVhdGx5LiBidHRlciBkbyBpdCBvbiBtYXJrZXIgZGlzcG9zZSBcbiAgICB9XG4gICAgdGhpcy5sYXN0X3J1bl9pZD1sYXN0X3J1bi5ydW5faWRcbiAgICBpZiAobGFzdF9ydW4uc3RkZXJyLmxlbmd0aD09PTAgJiYgbGFzdF9ydW4uc3Rkb3V0Lmxlbmd0aD09PTApXG4gICAgICByZXR1cm5cblxuICAgIHRoaXMudGVybS50ZXJtX3dyaXRlKGxhc3RfcnVuLnN0ZGVycixcInN0ZGVyclwiKVxuICAgIHRoaXMudGVybS50ZXJtX3dyaXRlKGxhc3RfcnVuLnN0ZG91dCxcInN0ZG91dFwiKVxuICAgIHRoaXMudGVybS5hZnRlcl93cml0ZSgpXG4gIH1cbiAgdXBkYXRlX3Rlcm1pbmFsKHJlcG9ydDpSdW5uZXJSZXBvcnQscnVubmVyOlJ1bm5lcil7XG4gICAgdHJ5e1xuICAgICAgdGhpcy51cGRhdGVfdGVybWluYWwyKHJlcG9ydCxydW5uZXIpXG4gICAgfWNhdGNoKGV4KXtcbiAgICAgIGNvbnN0IHttZXNzYWdlfT1nZXRfZXJyb3IoZXgpXG4gICAgICB1cGRhdGVfY2hpbGRfaHRtbCh0aGlzLmVsLCcuZGJnJyxtZXNzYWdlKVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGVybWluYWxzIGltcGxlbWVudHMgQ29tcG9uZW50e1xuICB0ZXJtaW5hbHM6czJ0PFRlcm1pbmFsUGFuZWw+PXt9IFxuICB2aXNpYmxlX3BhbmVsOlRlcm1pbmFsUGFuZWx8dW5kZWZpbmVkXG4gIGdldF90ZXJtaW5hbChydW5uZXI6UnVubmVyKXtcbiAgICBjb25zdCBhbnM9ZGVmYXVsdF9nZXQodGhpcy50ZXJtaW5hbHMscnVubmVyLmlkLCgpPT4gbmV3IFRlcm1pbmFsUGFuZWwocnVubmVyKSlcbiAgICByZXR1cm4gYW5zXG4gIH1cbiAgb25faW50ZXJ2YWwoKXtcbiAgICAvL2NvbnNvbGUubG9nKCdvbl9pbnRlcnZhbCcpXG4gIH1cbiAgb25fZGF0YShkYXRhOnVua25vd24pe1xuICAgIGNvbnN0IHJlcG9ydD1kYXRhIGFzIFJ1bm5lclJlcG9ydFxuICAgIGNvbnN0IGY9KGZvbGRlcjpGb2xkZXIpPT57XG4gICAgICBmb3IgKGNvbnN0IHJ1bm5lciBvZiBmb2xkZXIucnVubmVycylcbiAgICAgICAgdGhpcy5nZXRfdGVybWluYWwocnVubmVyKS51cGRhdGVfdGVybWluYWwocmVwb3J0LHJ1bm5lcilcbiAgICAgIGZvbGRlci5mb2xkZXJzLmZvckVhY2goZikgXG4gICAgfVxuICAgIGYocmVwb3J0LnJvb3QpICAgIFxuICB9XG4gIGNvbW1hbmRfZmluZCgpe1xuICAgIHRoaXMudmlzaWJsZV9wYW5lbD8udGVybS5zaG93X2ZpbmQoKVxuICB9XG4gIHNldF9zZWxlY3RlZChpZDpzdHJpbmcpe1xuICAgIGZvciAoY29uc3QgW3BhbmVsX2lkLHBhbmVsXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRlcm1pbmFscykpe1xuICAgICAgY29uc3QgdmlzaWJsZT1wYW5lbF9pZD09PWlkXG4gICAgICBwYW5lbC5zZXRfdmlzaWJpbGl0eSh2aXNpYmxlKVxuICAgICAgaWYgKHZpc2libGUpXG4gICAgICAgIHRoaXMudmlzaWJsZV9wYW5lbD1wYW5lbFxuICAgIH1cbiAgfVxufVxuXG4iLCAiaW1wb3J0IHR5cGUge1RyZWVOb2RlfSBmcm9tICcuL3RyZWVfaW50ZXJuYWxzLmpzJ1xuaW1wb3J0IHtwb3N0X21lc3NhZ2V9IGZyb20gJy4vY29tbW9uLmpzJ1xuaW1wb3J0IHt1cGRhdGVfY2hpbGRfaHRtbCx1cGRhdGVfY2xhc3NfbmFtZSxnZXRfcGFyZW50X2J5X2NsYXNzZXMsZ2V0X3BhcmVudF9pZH0gZnJvbSAnLi9kb21fdXRpbHMuanMnXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VfaWNvbnMoaHRtbDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAvLyBQYXJzZSB0aGUgSFRNTCBzdHJpbmcgaW50byBhIERvY3VtZW50XG4gIGNvbnN0IHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcbiAgY29uc3QgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhodG1sLCAndGV4dC9odG1sJyk7XG4gIC8vIFNlbGVjdCBhbGwgZGl2cyB3aXRoIGNsYXNzIFwiaWNvblwiXG4gIGNvbnN0IGljb25zID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTERpdkVsZW1lbnQ+KCcuaWNvbicpO1xuICBpY29ucy5mb3JFYWNoKGljb24gPT4ge1xuICAgIGNvbnN0IG5hbWVFbCA9IGljb24uY2hpbGROb2Rlc1swXVxuICAgIGNvbnN0IGNvbnRlbnRFbCA9IGljb24ucXVlcnlTZWxlY3RvcjxTVkdFbGVtZW50Pignc3ZnJyk7XG4gICAgaWYgKG5hbWVFbCAmJiBjb250ZW50RWwpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBuYW1lRWwudGV4dENvbnRlbnQ/LnRyaW0oKTtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBjb250ZW50RWwub3V0ZXJIVE1MXG4gICAgICBpZiAobmFtZSE9bnVsbCkge1xuICAgICAgICByZXN1bHRbbmFtZV0gPSBjb250ZW50XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgY29uc3QgaWNvbm5hbWVzPU9iamVjdC5rZXlzKHJlc3VsdClcbiAgY29uc29sZS5sb2coe2ljb25uYW1lc30pXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmludGVyZmFjZSBJY29uVmVyc2lvbntcbiAgaWNvbjpzdHJpbmcsXG4gIHZlcnNpb246bnVtYmVyXG59XG5mdW5jdGlvbiBkZWNlbGVyYXRpbmdNYXAoeDpudW1iZXIpIHsgLy9haSBnZW5yYXRlZCBsb2xcbiAgLy8gMS4gQ29uc3RyYWluIGlucHV0IGFuZCBub3JtYWxpemUgdG8gMC4wIC0gMS4wIHJhbmdlXG4gIGNvbnN0IHQgPSBNYXRoLm1pbihNYXRoLm1heCh4IC8gMiwgMCksIDEpO1xuXG4gIC8vIDIuIEFwcGx5IFF1YWRyYXRpYyBFYXNlLU91dCBmb3JtdWxhXG4gIC8vIFRoaXMgc3RhcnRzIGZhc3QgYW5kIHNsb3dzIGRvd24gYXMgaXQgYXBwcm9hY2hlcyAxXG4gIGNvbnN0IGVhc2VPdXQgPSAxIC0gKDEgLSB0KSAqICgxIC0gdCk7XG5cbiAgLy8gMy4gTWFwIHRvIG91dHB1dCByYW5nZSAoMTAgdG8gMClcbiAgLy8gV2hlbiBlYXNlT3V0IGlzIDAsIHJlc3VsdCBpcyAxMC4gV2hlbiBlYXNlT3V0IGlzIDEsIHJlc3VsdCBpcyAwLlxuICByZXR1cm4gMTAgLSAoZWFzZU91dCAqIDEwKTtcbn1cbmZ1bmN0aW9uIGNhbGNfYm94X3NoYWRvdyhpY29uOnN0cmluZyx0aW1lT2Zmc2V0Om51bWJlcil7XG4gIGZ1bmN0aW9uIGYoY29sb3I6c3RyaW5nKXtcbiAgICBjb25zdCBweD1kZWNlbGVyYXRpbmdNYXAodGltZU9mZnNldClcbiAgICByZXR1cm4gYDBweCAwcHggJHtweH1weCAke3B4fXB4ICR7Y29sb3J9YFxuICB9XG4gIGlmIChpY29uPT09J2RvbmUnKVxuICAgIHJldHVybiBmKCdyZ2JhKDAsIDI1NSwgMCwuNSknKVxuICBpZiAoaWNvbj09PSdlcnJvcicpXG4gICAgcmV0dXJuIGYoJ3JnYmEoMjU1LCAwLCAwLCAuNSknKVxuICBpZiAoaWNvbj09PSdydW5uaW5nJylcbiAgICByZXR1cm4gZigncmdiYSgyNTUsIDE0MCwgMCwgMC41KScpXG4gIGlmIChpY29uPT09J3N0b3BwZWQnKVxuICAgIHJldHVybiBmKCdyZ2JhKDEyOCwgMCwgMTI4LCAwLjUpJylcbiAgcmV0dXJuICcnXG59XG5cblxuZXhwb3J0IGNsYXNzIEljb25zQW5pbWF0b3J7XG4gIC8vaWNvbnNcbiAgcHJpdmF0ZSBpZF9jaGFuZ2VkOlJlY29yZDxzdHJpbmcsbnVtYmVyPj17fVxuICBwcml2YXRlIGljb25fdmVyc2lvbnM6UmVjb3JkPHN0cmluZyxJY29uVmVyc2lvbj49e31cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIGljb25zOlJlY29yZDxzdHJpbmcsc3RyaW5nPixcbiAgICBwdWJsaWMgY29tbWFuZHM6c3RyaW5nW10gICAgXG4gICl7XG4gICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsdGhpcy5vbl9jbGljaylcbiAgfVxuICBnZXRfY29tbWFuZChpY29uOkhUTUxFbGVtZW50KXtcbiAgICBmb3IgKGNvbnN0IGNsYXNzTmFtZSBvZiBpY29uLmNsYXNzTGlzdClcbiAgICAgIGlmICh0aGlzLmNvbW1hbmRzLmluY2x1ZGVzKGNsYXNzTmFtZSkpXG4gICAgICAgIHJldHVybiBjbGFzc05hbWVcbiAgfVxuICBvbl9jbGljaz0oZXZ0Ok1vdXNlRXZlbnQpPT57XG4gICAgaWYgKGV2dC50YXJnZXQ9PW51bGwpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICBjb25zdCBjb21tYW5kX2ljb249Z2V0X3BhcmVudF9ieV9jbGFzc2VzKGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQsWydjb21tYW5kX2ljb24nLCd0b2dnbGVfaWNvbiddKVxuICAgIGlmIChjb21tYW5kX2ljb249PW51bGwpXG4gICAgICByZXR1cm5cbiAgICBjb25zdCBjb21tYW5kX25hbWU9dGhpcy5nZXRfY29tbWFuZChjb21tYW5kX2ljb24pXG4gICAgaWYgKGNvbW1hbmRfbmFtZT09bnVsbClcbiAgICAgIHJldHVyblxuICAgIFxuICAgIGNvbnN0IGlkPWdldF9wYXJlbnRfaWQoY29tbWFuZF9pY29uKSAvL0FyZ3VtZW50IG9mIHR5cGUgJ0hUTUxFbGVtZW50IHwgbnVsbCcgaXMgbm90IGFzc2lnbmFibGUgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ0hUTUxFbGVtZW50Jy4gd2h5XG4gICAgaWYgKGlkPT1udWxsKVxuICAgICAgcmV0dXJuXG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9jbGlja2VkXCIsXG4gICAgICBpZCxcbiAgICAgIGNvbW1hbmRfbmFtZVxuICAgIH0pICAgIFxuICAgIGV2dC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblxuICB9XG4gIHByaXZhdGUgc2V0X2ljb25fdmVyc2lvbihpZDpzdHJpbmcsaWNvbjpzdHJpbmcsdmVyc2lvbjpudW1iZXIpeyAvL2NhbGwgbXV0dXBsZSB0aW1lLCBvbmUgZm9yIGVhY2ggaWRcbiAgICBjb25zdCBleGlzdHM9dGhpcy5pY29uX3ZlcnNpb25zW2lkXVxuICAgIGlmIChleGlzdHMhPW51bGwgJiYgZXhpc3RzLmljb249PT1pY29uJiZleGlzdHMudmVyc2lvbj09PXZlcnNpb24pXG4gICAgICByZXR1cm5cbiAgICB0aGlzLmlkX2NoYW5nZWRbaWRdPURhdGUubm93KClcbiAgICB0aGlzLmljb25fdmVyc2lvbnNbaWRdPXtpY29uLHZlcnNpb259XG4gIH1cbiAgcHJpdmF0ZSBjYWxjX2ljb24oazpzdHJpbmcsdjpib29sZWFufHVuZGVmaW5lZCl7XG4gICAgaWYgKHY9PT11bmRlZmluZWQpXG4gICAgICByZXR1cm4gJydcbiAgICByZXR1cm4gdGhpcy5pY29uc1tgJHtrfV8ke3Z9YF1cbiAgfVxuICBwcml2YXRlIHVwZGF0ZV9pY29ucyh0cmVlX25vZGU6VHJlZU5vZGUpe1xuICAgIGNvbnN0IGY9KG5vZGU6VHJlZU5vZGUpPT57IFxuICAgICAgY29uc3Qge2lkLGljb24saWNvbl92ZXJzaW9ufT1ub2RlXG4gICAgICB0aGlzLnNldF9pY29uX3ZlcnNpb24oaWQsaWNvbixpY29uX3ZlcnNpb24pIC8vZm9yIHRoZSBzaWRlIGVmZmVjdCBvZiB1cGRhdGluZyBpZF9jaGFuZWRcbiAgICAgIGNvbnN0IHRvZ2dsZXM9T2JqZWN0LmVudHJpZXMobm9kZS50b2dnbGVzKS5tYXAoKFtrLHZdKT0+YDxkaXYgY2xhc3M9J3RvZ2dsZV9pY29uICR7dn0gJHtrfSc+JHt0aGlzLmNhbGNfaWNvbihrLHYpfTwvZGl2PmApLmpvaW4oJycpIFxuICAgICAgY29uc3QgY29tbWFuZHNfaWNvbnM9bm9kZS5jb21tYW5kcy5tYXAoeD0+YDxkaXYgY2xhc3M9XCJjb21tYW5kX2ljb24gJHt4fVwiIHRpdGxlPVwiJHt4fVwiPiR7dGhpcy5pY29uc1t4XX08L2Rpdj5gKS5qb2luKCcnKVxuICAgICAgY29uc3QgdG9wPWAjJHtpZH0gPiA6bm90KC5jaGlsZHJlbilgXG4gICAgICB1cGRhdGVfY2hpbGRfaHRtbChkb2N1bWVudC5ib2R5LGAke3RvcH0gLmljb246bm90KC50ZXh0KWAsdGhpcy5pY29uc1tpY29uXT8/JycpIC8vc2V0IHRoZSBzdmdcbiAgICAgIHVwZGF0ZV9jaGlsZF9odG1sKGRvY3VtZW50LmJvZHksYCR7dG9wfSAuaWNvbi50ZXh0YCxgICR7dGhpcy5pY29uc1tpY29uXT8/Jyd9Jm5ic3A7Jm5ic3A7Jm5ic3A7JHtpY29ufWApIC8vLy9zZXQgdGhlIHN2ZyArdGV4dFxuICAgICAgdXBkYXRlX2NoaWxkX2h0bWwoZG9jdW1lbnQuYm9keSxgJHt0b3B9IC50b2dnbGVzX2ljb25zYCx0b2dnbGVzKVxuICAgICAgdXBkYXRlX2NoaWxkX2h0bWwoZG9jdW1lbnQuYm9keSxgJHt0b3B9IC5jb21tYW5kc19pY29uc2AsY29tbWFuZHNfaWNvbnMpXG4gICAgICB1cGRhdGVfY2xhc3NfbmFtZShkb2N1bWVudC5ib2R5LGAke3RvcH0gLmljb24udGV4dGAsYGljb24gdGV4dCAke2ljb259YCkgXG4gICAgICB1cGRhdGVfY2xhc3NfbmFtZShkb2N1bWVudC5ib2R5LGAke3RvcH0gLmljb246bm90KC50ZXh0KWAsYGljb24gJHtpY29ufWApIFxuICAgICAgXG4gICAgICBub2RlLmNoaWxkcmVuLm1hcChmKVxuICAgIH1cbiAgICBmKHRyZWVfbm9kZSlcbiAgfVxuICBhbmltYXRlKHRyZWVfbm9kZTpUcmVlTm9kZSl7XG4gICAgLy9kbyBhIHF1ZXJ5U2VsZWN0b3JBbGwgZm9yICN7aWR9IHN2Z1xuICAgIHRoaXMudXBkYXRlX2ljb25zKHRyZWVfbm9kZSlcbiAgICBjb25zdCBub3c9RGF0ZS5ub3coKVxuICAgIGZvciAoY29uc3QgW2lkLHRpbWVdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuaWRfY2hhbmdlZCkpeyAvL2FuaW1hdGVcbiAgICAgIGNvbnN0IHNlbGVjdG9yPWAjJHtpZH0gLmljb25gICAgXG4gICAgICBjb25zdCBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8U1ZHRWxlbWVudD4oc2VsZWN0b3IpO1xuICAgICAgZm9yICggY29uc3QgZWwgb2YgZWxlbWVudHMpeyBcbiAgICAgICAgY29uc3QgdGltZU9mZnNldD0obm93LXRpbWUpLzEwMDBcbiAgICAgICAgaWYgKHRpbWVPZmZzZXQ+NClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICBjb25zdCB7aWNvbn09dGhpcy5pY29uX3ZlcnNpb25zW2lkXSFcblxuICAgICAgICBlbC5zdHlsZS5ib3hTaGFkb3c9Y2FsY19ib3hfc2hhZG93KGljb24sdGltZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCAiXG5pbXBvcnQgdHlwZSB7V2Vidmlld01lc3NhZ2V9IGZyb20gJy4uLy4uL3NyYy9leHRlbnNpb24uanMnXG5pbXBvcnQge3F1ZXJ5X3NlbGVjdG9yLGN0cmx9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuaW1wb3J0IHtUcmVlQ29udHJvbCx0eXBlIFRyZWVEYXRhUHJvdmlkZXIsdHlwZSBUcmVlTm9kZX0gZnJvbSAnLi90cmVlX2NvbnRyb2wuanMnO1xuaW1wb3J0IHR5cGUgeyBGb2xkZXIsUnVubmVyLEZvbGRlckVycm9yLFJ1bm5lclJlcG9ydH0gZnJvbSAnLi4vLi4vc3JjL2RhdGEuanMnO1xuaW1wb3J0IHtmaW5kX2Jhc2V9IGZyb20gJy4uLy4uL3NyYy9wYXJzZXIuanMnO1xuaW1wb3J0IHtwb3N0X21lc3NhZ2UsY2FsY19ydW5uZXJfc3RhdHVzfSBmcm9tICcuL2NvbW1vbi5qcydcbmltcG9ydCBJQ09OU19IVE1MIGZyb20gJy4uL3Jlc291cmNlcy9pY29ucy5odG1sJ1xuaW1wb3J0IHtUZXJtaW5hbHN9IGZyb20gJy4vdGVybWluYWxzLmpzJ1xuaW1wb3J0IHtJY29uc0FuaW1hdG9yLHBhcnNlX2ljb25zfSBmcm9tICcuL2ljb25zLmpzJ1xuXG5mdW5jdGlvbiB0aGVfY29udmVydChfcmVwb3J0OnVua25vd24pOlRyZWVOb2Rle1xuICBjb25zdCByZXBvcnQ9X3JlcG9ydCBhcyBSdW5uZXJSZXBvcnQgLy9kZWxpYmVyYXRseSBtYWtlcyBsZXNzIHN0cm9rIHR5cGVuXG4gIGZ1bmN0aW9uIGNvbnZlcnRfcnVubmVyKHJ1bm5lcjpSdW5uZXIpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge3NjcmlwdCxpZCxuYW1lLGVmZmVjdGl2ZV93YXRjaCx0YWdzfT1ydW5uZXJcbiAgICAgIGNvbnN0IHdhdGNoZWQ9ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKGVmZmVjdGl2ZV93YXRjaC5sZW5ndGg9PT0wKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICByZXR1cm4gcmVwb3J0Lm1vbml0b3JlZC5pbmNsdWRlcyhpZClcbiAgICAgIH0oKVxuICAgICAgY29uc3Qge3ZlcnNpb24sc3RhdGV9PWNhbGNfcnVubmVyX3N0YXR1cyhyZXBvcnQscnVubmVyKVxuICAgICAgLy9jb25zdCBjbGFzc05hbWU9KHdhdGNoZWQ/J3dhdGNoZWQnOnVuZGVmaW5lZFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTonaXRlbScsXG4gICAgICAgIGlkLFxuICAgICAgICBsYWJlbDpuYW1lLFxuICAgICAgICBjb21tYW5kczpbJ3BsYXknLCdzdG9wJywnY29weSddLCBcbiAgICAgICAgY2hpbGRyZW46W10sXG4gICAgICAgIGRlc2NyaXB0aW9uOnNjcmlwdCxcbiAgICAgICAgaWNvbjpzdGF0ZSxcbiAgICAgICAgaWNvbl92ZXJzaW9uOlxuICAgICAgICB2ZXJzaW9uLFxuICAgICAgICBjbGFzc05hbWU6dW5kZWZpbmVkLFxuICAgICAgICB0b2dnbGVzOiB7d2F0Y2hlZH0sXG4gICAgICAgIHRhZ3NcbiAgICAgICAgLy9kZWZhdWx0X2NoZWNrYm94X3N0YXRlOiBlZmZlY3RpdmVfd2F0Y2gubGVuZ3RoPjB8fHVuZGVmaW5lZFxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBjb252ZXJ0X2Vycm9yKHJvb3Q6Rm9sZGVyRXJyb3IpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge2lkLG1lc3NhZ2V9PXJvb3RcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6XCJpdGVtXCIsXG4gICAgICAgIGlkLFxuICAgICAgICBsYWJlbDptZXNzYWdlLFxuICAgICAgICBjaGlsZHJlbjpbXSxcbiAgICAgICAgaWNvbjpcInN5bnRheGVycm9yXCIsXG4gICAgICAgIGljb25fdmVyc2lvbjoxLFxuICAgICAgICBjb21tYW5kczpbXSxcbiAgICAgICAgY2xhc3NOYW1lOlwid2FybmluZ1wiLFxuICAgICAgICB0b2dnbGVzOiB7fSxcbiAgICAgICAgdGFnczpbXVxuICAgIH1cblxuICB9ICBcbiAgZnVuY3Rpb24gY29udmVydF9mb2xkZXIocm9vdDpGb2xkZXIpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge25hbWUsaWR9PXJvb3RcbiAgICAgIGNvbnN0IGZvbGRlcnM9cm9vdC5mb2xkZXJzLm1hcChjb252ZXJ0X2ZvbGRlcilcbiAgICAgIGNvbnN0IGl0ZW1zPXJvb3QucnVubmVycy5tYXAoY29udmVydF9ydW5uZXIpXG4gICAgICBjb25zdCBlcnJvcnM9cm9vdC5lcnJvcnMubWFwKGNvbnZlcnRfZXJyb3IpICBcbiAgICAgIGNvbnN0IGNoaWxkcmVuPVsuLi5mb2xkZXJzLC4uLml0ZW1zLC4uLmVycm9yc11cbiAgICAgIGNvbnN0IGljb249ZXJyb3JzLmxlbmd0aD09PTA/J2ZvbGRlcic6J2ZvbGRlcnN5bnRheGVycm9yJ1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2hpbGRyZW4sXG4gICAgICAgIHR5cGU6J2ZvbGRlcicsXG4gICAgICAgIGlkLGxhYmVsOm5hbWUsXG4gICAgICAgIGNvbW1hbmRzOltdLFxuICAgICAgICBpY29uLFxuICAgICAgICBpY29uX3ZlcnNpb246MCxcbiAgICAgICAgY2xhc3NOYW1lOnVuZGVmaW5lZCxcbiAgICAgICAgdG9nZ2xlczoge30sXG4gICAgICAgIHRhZ3M6W11cbiAgICAgIH1cbiAgfVxuICByZXR1cm4gY29udmVydF9mb2xkZXIocmVwb3J0LnJvb3QpXG59XG5cbmNsYXNzIFRoZVRyZWVQcm92aWRlciBpbXBsZW1lbnRzIFRyZWVEYXRhUHJvdmlkZXJ7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB0ZXJtaW5hbHM6VGVybWluYWxzKXt9XG4gIHRvZ2dsZV9vcmRlcj1bJ3dhdGNoZWQnXVxuICAvL2NvbnZlcnQ9dGhlX2NvbnZlcnRcbiAgcmVwb3J0OlJ1bm5lclJlcG9ydHx1bmRlZmluZWRcbiAgY29tbWFuZChpZDpzdHJpbmcsY29tbWFuZF9uYW1lOnN0cmluZyl7Ly9QYXJhbWV0ZXIgJ2NvbW1hbmRfbmFtZScgaW1wbGljaXRseSBoYXMgYW4gJ2FueScgdHlwZS50cyg3MDA2KSB3aHlcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDogXCJjb21tYW5kX2NsaWNrZWRcIixcbiAgICAgIGlkLFxuICAgICAgY29tbWFuZF9uYW1lXG4gICAgfSlcbiAgfVxuICAvL2ljb25zX2h0bWw9SUNPTlNfSFRNTFxuICBzZWxlY3RlZChpZDpzdHJpbmcpe1xuICAgIHRoaXMudGVybWluYWxzLnNldF9zZWxlY3RlZChpZClcbiAgICBjb25zdCBiYXNlPWZpbmRfYmFzZSh0aGlzLnJlcG9ydCEucm9vdCxpZClcbiAgICBpZiAoYmFzZT09bnVsbHx8YmFzZS5wb3M9PW51bGwpXG4gICAgICByZXR1cm5cbiAgICBpZiAoYmFzZS5uZWVkX2N0bCYmIWN0cmwucHJlc3NlZClcbiAgICAgIHJldHVyblxuICAgIGNvbnN0IHtwb3N9PWJhc2VcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDogXCJjb21tYW5kX29wZW5fZmlsZV9wb3NcIixcbiAgICAgIHBvc1xuICAgIH0pXG4gIH1cbn1cblxuZnVuY3Rpb24gc3RhcnQoKXtcbiAgY29uc29sZS5sb2coJ3N0YXJ0JylcbiAgY29uc3QgdGVybWluYWxzPW5ldyBUZXJtaW5hbHMoKVxuICAvLyAvbGV0IGJhc2VfdXJpPScnXG4gIGNvbnN0IHByb3ZpZGVyPW5ldyBUaGVUcmVlUHJvdmlkZXIodGVybWluYWxzKVxuICBjb25zdCBpY29ucz1wYXJzZV9pY29ucyhJQ09OU19IVE1MKVxuICBjb25zdCBpY29uc19hbmltYXRvcj1uZXcgSWNvbnNBbmltYXRvcihpY29ucyxbXCJ3YXRjaGVkXCIsXCJwbGF5XCIsXCJzdG9wXCJdKVxuICBjb25zdCBjb250YWluZXI6SFRNTEVsZW1lbnQ9cXVlcnlfc2VsZWN0b3IoZG9jdW1lbnQuYm9keSwnI3RoZV90cmVlJylcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCAoKSA9PiB7XG4gICAgICBwb3N0X21lc3NhZ2Uoe2NvbW1hbmQ6J3ZpZXdfZm9jdXMnLHZhbDp0cnVlfSlcbiAgICB9KTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgKCkgPT4ge1xuICAgICAgcG9zdF9tZXNzYWdlKHtjb21tYW5kOid2aWV3X2ZvY3VzJyx2YWw6ZmFsc2V9KVxuICAgIH0pOyAgXG4gIGNvbnN0IHRyZWU9bmV3IFRyZWVDb250cm9sKGNvbnRhaW5lcixwcm92aWRlcixpY29ucykgLy9ubyBlcnJvciwgd2hheVxuIFxuICBmdW5jdGlvbiBvbl9pbnRlcnZhbCgpe1xuICAgIHRyZWUub25faW50ZXJ2YWwoKVxuICAgIHRlcm1pbmFscy5vbl9pbnRlcnZhbCgpXG4gIH1cbiAgc2V0SW50ZXJ2YWwob25faW50ZXJ2YWwsMTAwKVxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsICAoZXZlbnQ6TWVzc2FnZUV2ZW50PFdlYnZpZXdNZXNzYWdlPikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XG4gICAgICBzd2l0Y2ggKG1lc3NhZ2UuY29tbWFuZCkge1xuICAgICAgICAgIGNhc2UgJ1J1bm5lclJlcG9ydCc6e1xuICAgICAgICAgICAgcHJvdmlkZXIucmVwb3J0PW1lc3NhZ2UgICAgICAgICAgICBcbiAgICAgICAgICAgIHRlcm1pbmFscy5vbl9kYXRhKG1lc3NhZ2UpXG4gICAgICAgICAgICBjb25zdCB0cmVlX25vZGU9dGhlX2NvbnZlcnQobWVzc2FnZSlcbiAgICAgICAgICAgIC8vYmFzZV91cmk9bWVzc2FnZS5iYXNlX3VyaVxuICAgICAgICAgICAgdHJlZS5vbl9kYXRhKHRyZWVfbm9kZSlcbiAgICAgICAgICAgIGljb25zX2FuaW1hdG9yLmFuaW1hdGUodHJlZV9ub2RlKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdjb21tYW5kX2ZpbmQnOntcbiAgICAgICAgICAgIHRlcm1pbmFscy5jb21tYW5kX2ZpbmQoKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICBcbiAgICAgICAgICBjYXNlICdzZXRfc2VsZWN0ZWQnOlxuICAgICAgICAgICAgLy91cGRhKGRvY3VtZW50LmJvZHksJyNzZWxlY3RlZCcsIG1lc3NhZ2Uuc2VsZWN0ZWQpXG4gICAgICAgICAgICBwcm92aWRlci5zZWxlY3RlZChtZXNzYWdlLnNlbGVjdGVkKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29uc29sZS5sb2coYHVuZXhwZWN0ZWQgbWVzc2FnZSAke21lc3NhZ2UuY29tbWFuZH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgfSk7XG59XG5zdGFydCgpXG5jb25zdCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50ZXJtc19jb250YWluZXInKTtcbmNvbnNvbGUubG9nKGVsKVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUVPLFNBQVMsZUFBMENBLEtBQVcsVUFBZ0I7QUFDakYsUUFBTSxNQUFJQSxJQUFHLGNBQWlCLFFBQVE7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LEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxLQUFLLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksS0FBSyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsSUFBSSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsT0FBTyxHQUFHLE1BQU0sR0FBRyxLQUFLLElBQUksR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLE1BQU0sSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxJQUFJLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLE1BQU0sR0FBRyxRQUFRLEdBQUc7QUFHbHJDLElBQUksNkJBQTZCLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsS0FBSyxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLEtBQUssS0FBSyxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxJQUFJLEdBQUcsSUFBSSxNQUFNLEdBQUcsS0FBSyxNQUFNLElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxLQUFLLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEtBQUssTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLE1BQU0sSUFBSSxHQUFHLEdBQUcsS0FBSyxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxHQUFHLEdBQUcsS0FBSyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcs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QUEsVUFBUSxPQUFNLE9BQU07QUFDOUIsU0FBTyxFQUFDLFNBQUFBLFVBQVEsT0FBTSxRQUFPO0FBQy9COzs7QUNsQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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LGlCQUFTLFNBQVMsUUFBUSxRQUFRO0FBQ2xDO0FBQUEsTUFDRjtBQUNFLGdCQUFRLElBQUksc0JBQXNCLFFBQVEsT0FBTyxFQUFFO0FBQ25EO0FBQUEsSUFDTjtBQUFBLEVBQ0osQ0FBQztBQUNIO0FBQ0EsTUFBTTtBQUNOLElBQU0sS0FBSyxTQUFTLGNBQWMsa0JBQWtCO0FBQ3BELFFBQVEsSUFBSSxFQUFFOyIsCiAgIm5hbWVzIjogWyJlbCIsICJlbCIsICJhbnMiLCAiVG9rZW5UeXBlIiwgIlBvc2l0aW9uIiwgImNvbCIsICJTb3VyY2VMb2NhdGlvbiIsICJzdGFydCIsICJvZmZzZXQiLCAiUGFyc2VyIiwgInJlZiIsICJwYXJzZSIsICJEZXN0cnVjdHVyaW5nRXJyb3JzIiwgIlRva0NvbnRleHQiLCAicmUiLCAiU2NvcGUiLCAiTm9kZSIsICJCcmFuY2hJRCIsICJSZWdFeHBWYWxpZGF0aW9uU3RhdGUiLCAiY3VycmVudCIsICJUb2tlbiIsICJ2ZXJzaW9uIiwgInIiLCAiYSIsICJiIiwgImFucyIsICJzdGFydCIsICJkYXRhIiwgInN0YXJ0IiwgInN0YXJ0IiwgInJvdyIsICJjb2wiLCAicm93IiwgImNvbCIsICJkYXRhIiwgInZlcnNpb24iLCAiZWwiLCAidmVyc2lvbiJdCn0K
