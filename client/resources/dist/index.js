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
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name)) {
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

// ../node_modules/ansi-regex/index.js
function ansiRegex({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const osc = `(?:\\u001B\\][\\s\\S]*?${ST})`;
  const csi = "[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]";
  const pattern = `${osc}|${csi}`;
  return new RegExp(pattern, onlyFirst ? void 0 : "g");
}

// src/terminals_ansi.ts
var ansi_regex = ansiRegex();
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
    html.push(c);
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
  const strings = [];
  const current_style = { ...start_style, font_styles: new Set(start_style.font_styles) };
  const link_inserts = [];
  let last_index = 0;
  let position = 0;
  for (const match of text.matchAll(ansi_regex)) {
    const { index } = match;
    const skip_str = text.slice(last_index, index);
    position += skip_str.length;
    strings.push(skip_str);
    const sequence = match[0];
    last_index = index + sequence.length;
    if (!sequence.startsWith("\x1B[") || !sequence.endsWith("m")) {
      continue;
    }
    const params = sequence.slice(2, -1).split(";").map((p) => parseInt(p || "0", 10));
    applySGRCode(params, current_style);
    const cloned = { style: clone_style(current_style), position, command: "style" };
    const last_style = style_positions.at(-1);
    if (is_same_style(last_style?.style, cloned.style))
      continue;
    if (last_style?.position === position) {
      style_positions.splice(-1, 1, cloned);
      continue;
    }
    style_positions.push(cloned);
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

// src/terminal.ts
var clear_style = {
  foreground: void 0,
  background: void 0,
  font_styles: /* @__PURE__ */ new Set()
};
function make_channel_states() {
  return {
    stdout: { last_line: "", parser_state: void 0, style: clear_style },
    stderr: { last_line: "", parser_state: void 0, style: clear_style }
  };
}
function range_to_inserts(range) {
  const { start: start2, end, values } = range;
  const datamap = Object.entries(values).map(([k, v]) => `data-${k}='${v}'`).join("");
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
  constructor(term_el, listener) {
    this.term_el = term_el;
    this.listener = listener;
    this.channel_states = make_channel_states();
    this.term_el.innerHTML = "";
    this.term_el.addEventListener("click", this.onclick);
  }
  channel_states;
  onclick = (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement))
      return;
    const parent = get_parent_with_dataset(target);
    if (parent == null)
      return;
    const dataset = get_element_dataset(parent);
    this.listener.link_click(dataset);
  };
  line_to_html = (x, state, line_class) => {
    const {
      plain_text,
      style_positions,
      link_inserts
    } = strip_ansi(x, state.style);
    state.style = style_positions.at(-1).style;
    const { ranges, parser_state } = this.listener.parse(plain_text, state.parser_state);
    state.parser_state = parser_state;
    const range_inserts = ranges_to_inserts(ranges);
    const inserts = merge_inserts(range_inserts, link_inserts);
    const html = generate_html({ style_positions, inserts, plain_text });
    const br = plain_text === "" ? "<br>" : "";
    return `<div class="${line_class}">${html}${br}</div>`;
  };
  after_write() {
    this.term_el.querySelector(".eof")?.classList.remove("eof");
    this.term_el.lastElementChild?.classList.add("eof");
  }
  term_write(output, channel) {
    if (output.length === 0)
      return;
    const channel_state = this.channel_states[channel];
    const line_class = `line_${channel}`;
    const joined_lines = [channel_state.last_line, ...output].join("").replaceAll("\r\n", "\n");
    const lines = joined_lines.split("\n");
    if (channel_state.last_line !== "")
      this.term_el.querySelector(`.${line_class}:last-child`)?.remove();
    channel_state.last_line = lines.at(-1) || "";
    const lines_to_render = channel_state.last_line === "" ? lines.slice(0, -1) : lines;
    const new_html = lines_to_render.map((x) => this.line_to_html(x, channel_state, line_class)).join("");
    this.term_el.insertAdjacentHTML("beforeend", new_html);
  }
  term_clear() {
    this.term_el.innerHTML = "";
    this.channel_states = make_channel_states();
  }
};

// src/terminals_parse.ts
function capture(name) {
  return function(...content) {
    return `(?<${name}>${content.join("")})`;
  };
}
function neg_lookahead(...pat) {
  return `(?!${pat.join("")})`;
}
function neg_lookbehind(...pat) {
  return `(?<!${pat.join("")})`;
}
function seq(...pat) {
  return pat.join("");
}
function group(...pat) {
  return `(${pat.join("")})`;
}
function or(...pat) {
  return `(${pat.join("|")})`;
}
function make_re(flags) {
  return function(...pat) {
    return new RegExp(pat.join(""), flags);
  };
}
var r = String.raw;
var digits = r`\d+`;
var row = capture("row")(digits);
var col = capture("col")(digits);
var optional_rowcol = seq(
  or(
    group(r`\(`, row, ",", col, r`\)`),
    group(":", row, ":", col)
  ),
  "?"
);
var links_regex = make_re("g")(
  capture("source_file")(
    // capture group source_file
    neg_lookbehind(`[.a-zA-Z]`),
    `([a-zA-Z]:)?`,
    //optional drive char followed by colon
    r`[a-zA-Z0-9_/\\@.-]+`,
    //one or more file name charecters
    `[.]`,
    `[a-zA-Z0-9]+`,
    neg_lookahead("[.]")
    //disallow dot immediatly after the match
  ),
  optional_rowcol
);
var ancor_regex = make_re("")(
  "^",
  capture("source_file")(
    "([a-zA-Z]:)?",
    r`[a-zA-Z0-9_\-./\\@]+`
  ),
  optional_rowcol,
  r`\s*$`
);
var ref_regex = make_re("")(
  r`^\s*`,
  row,
  ":",
  col,
  `(.*)`
);
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
  return { start: start2, end, values: no_nulls({ row: row2, col: col2, source_file }) };
}
function parse_to_ranges(input, parser_state) {
  const ranges = [];
  const ancor_match = input.match(ancor_regex);
  if (ancor_match != null) {
    const ret = calc_match(ancor_match);
    ranges.push(ret);
    return { parser_state: ret.values.source_file, ranges };
  }
  if (parser_state != null) {
    const ref_match = input.match(ref_regex);
    if (ref_match !== null) {
      const range = calc_match(ref_match);
      const { values } = range;
      ranges.push({
        ...calc_match(ref_match),
        //by theoram will source_file will be empty string at this line, overriden by the next
        values: { ...values, source_file: parser_state }
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
  <div class=term></div>
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
    this.term = new Terminal(query_selector(this.el, ".term"), this);
  }
  set_visibility(val) {
    this.el.style.display = val ? "flex" : "none";
  }
  parse(line_text, parse_state) {
    return parse_line(line_text, parse_state);
  }
  link_click(values) {
    const source_file = values.source_file;
    if (source_file == null)
      return;
    const row2 = parseInt(values.row ?? "", 10) || 0;
    const col2 = parseInt(values.col ?? "", 10) || 0;
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
  set_selected(id) {
    for (const [panel_id, panel] of Object.entries(this.terminals)) {
      panel.set_visibility(panel_id === id);
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
      const commands_icons = node.commands.map((x) => `<div class="command_icon ${x}">${this.icons[x]}</div>`).join("");
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
      commands: ["play", "stop"],
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
  const tree = new TreeControl(query_selector(document.body, "#the_tree"), provider, icons);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2RvbV91dGlscy50cyIsICIuLi8uLi8uLi8uLi9iYXNlX3R5cGVzL3NyYy9pbmRleC50cyIsICIuLi8uLi9zcmMvdHJlZV9pbnRlcm5hbHMudHMiLCAiLi4vLi4vc3JjL3RyZWVfY29udHJvbC50cyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvYWNvcm4vZGlzdC9hY29ybi5tanMiLCAiLi4vLi4vLi4vc3JjL3BhcnNlci50cyIsICIuLi8uLi9zcmMvY29tbW9uLnRzIiwgIi4uL2ljb25zLmh0bWwiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Fuc2ktcmVnZXgvaW5kZXguanMiLCAiLi4vLi4vc3JjL3Rlcm1pbmFsc19hbnNpLnRzIiwgIi4uLy4uL3NyYy90ZXJtaW5hbC50cyIsICIuLi8uLi9zcmMvdGVybWluYWxzX3BhcnNlLnRzIiwgIi4uLy4uL3NyYy90ZXJtaW5hbHMudHMiLCAiLi4vLi4vc3JjL2ljb25zLnRzIiwgIi4uLy4uL3NyYy9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHR5cGUgeyBzMnR9IGZyb20gJ0B5aWdhbC9iYXNlX3R5cGVzJ1xuXG5leHBvcnQgZnVuY3Rpb24gcXVlcnlfc2VsZWN0b3I8VCBleHRlbmRzIEVsZW1lbnQ9RWxlbWVudD4oZWw6RWxlbWVudCxzZWxlY3RvcjpzdHJpbmcpeyAvLyAzOjMyICB3YXJuaW5nICBUeXBlIHBhcmFtZXRlciBUIGlzIHVzZWQgb25seSBvbmNlIGluIHRoZSBmdW5jdGlvbiBzaWduYXR1cmUgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS10eXBlLXBhcmFtZXRlcnMgd2h5P1xuICAgIGNvbnN0IGFucz1lbC5xdWVyeVNlbGVjdG9yPFQ+KHNlbGVjdG9yKTtcbiAgICBpZiAoYW5zPT1udWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzZWxlY3RvciBub3QgZm91bmQgb3Igbm90IGV4cGVjdGVkIHR5cGUnKSAgXG4gICAgcmV0dXJuIGFuc1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9lbGVtZW50KGh0bWw6c3RyaW5nLHBhcmVudD86SFRNTEVsZW1lbnQpe1xuICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZW1wbGF0ZVwiKVxuICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sLnRyaW0oKVxuICBjb25zdCBhbnMgPSB0ZW1wbGF0ZS5jb250ZW50LmZpcnN0RWxlbWVudENoaWxkIGFzIEhUTUxFbGVtZW50O1xuICBpZiAocGFyZW50IT1udWxsKVxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChhbnMpXG4gIHJldHVybiBhbnNcbn1cbmV4cG9ydCBmdW5jdGlvbiBkaXZzKHZhbHM6czJ0PHN0cmluZ3x1bmRlZmluZWQ+KXtcbiAgY29uc3QgYW5zPVtdXG4gIGZvciAoY29uc3QgW2ssdl0gb2YgT2JqZWN0LmVudHJpZXModmFscykpXG4gICAgaWYgKHYhPW51bGwmJnYhPT0nJylcbiAgICAgIGFucy5wdXNoKGA8ZGl2IGNsYXNzPVwiJHtrfVwiPiR7dn08L2Rpdj5gKVxuICByZXR1cm4gYW5zLmpvaW4oJycpXG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0X3BhcmVudF9ieV9kYXRhX2F0dGlidXRlKGVsOkhUTUxFbGVtZW50fG51bGwsa2V5OnN0cmluZyl7XG4gIGlmIChlbD09bnVsbClcbiAgICByZXR1cm4gbnVsbFxuICBsZXQgYW5zOkhUTUxFbGVtZW50fG51bGw9ZWxcbiAgd2hpbGUoYW5zIT1udWxsKXtcbiAgICBjb25zdCB7ZGF0YXNldH09YW5zXG4gICAgaWYgKGtleSBpbiBkYXRhc2V0KVxuICAgICAgcmV0dXJuIGFuc1xuICAgIGFucz1hbnMucGFyZW50RWxlbWVudFxuICB9XG4gIHJldHVybiBudWxsXG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0X3BhcmVudF93aXRoX2RhdGFzZXQoZWw6SFRNTEVsZW1lbnR8bnVsbCl7XG4gIGlmIChlbD09bnVsbClcbiAgICByZXR1cm4gbnVsbFxuICBsZXQgYW5zOkhUTUxFbGVtZW50fG51bGw9ZWxcbiAgd2hpbGUoYW5zIT1udWxsKXtcbiAgICBpZiAoT2JqZWN0LmVudHJpZXMoYW5zLmRhdGFzZXQpLmxlbmd0aCE9PTApXG4gICAgICByZXR1cm4gYW5zXG4gICAgYW5zPWFucy5wYXJlbnRFbGVtZW50XG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRfcGFyZW50X2J5X2NsYXNzKGVsOkVsZW1lbnR8bnVsbCxjbGFzc05hbWU6c3RyaW5nKXtcbiAgaWYgKGVsPT1udWxsKVxuICAgIHJldHVybiBudWxsXG4gIGxldCBhbnM6RWxlbWVudHxudWxsPWVsXG4gIHdoaWxlKGFucyE9bnVsbCl7XG4gICAgaWYgKGFucy5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSlcbiAgICAgIHJldHVybiBhbnMgYXMgSFRNTEVsZW1lbnRcbiAgICBhbnM9YW5zLnBhcmVudEVsZW1lbnRcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuZnVuY3Rpb24gaGFzX2NsYXNzZXMoZWw6IEhUTUxFbGVtZW50IHwgbnVsbCxjbGFzc2VzOnN0cmluZ1tdKXtcbiAgaWYgKGVsPT1udWxsKVxuICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gY2xhc3Nlcy5zb21lKGMgPT4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGMpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0X3BhcmVudF9ieV9jbGFzc2VzKFxuICBlbDogSFRNTEVsZW1lbnQsXG4gIGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW11cbik6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5pc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgbGV0IGFuczogSFRNTEVsZW1lbnQgfCBudWxsID0gZWw7XG5cbiAgd2hpbGUgKGFucyAhPT0gbnVsbCkge1xuICAgIGlmIChoYXNfY2xhc3NlcyhhbnMsY2xhc3NlcykpXG4gICAgICByZXR1cm4gYW5zO1xuICAgIGFucyA9IGFucy5wYXJlbnRFbGVtZW50O1xuICB9IFxuICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRfcGFyZW50X2lkKCAvL2xvb3BzIG92ZXIgcGFyZW50cyB1bnRpbCBmaXJzdCB3aXRoIGlkXG4gIGVsOiBIVE1MRWxlbWVudFxuKTogc3RyaW5nfHVuZGVmaW5lZHtcbiAgbGV0IGFucz1lbC5wYXJlbnRFbGVtZW50XG5cbiAgd2hpbGUgKGFucyAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGlkPWFucy5nZXRBdHRyaWJ1dGUoJ2lkJylcbiAgICBpZiAoaWQhPW51bGwpXG4gICAgICByZXR1cm4gaWRcbiAgICBhbnMgPSBhbnMucGFyZW50RWxlbWVudDtcbiAgfSBcbn1cbmZ1bmN0aW9uIHNldHRlcl9jYWNoZShzZXR0ZXI6KGVsOkhUTUxFbGVtZW50LHZhbHVlOnN0cmluZyk9PnZvaWQpe1xuICBjb25zdCBlbF90b19odG1sPSBuZXcgV2Vha01hcDxIVE1MRWxlbWVudCxzdHJpbmc+KClcbiAgcmV0dXJuIGZ1bmN0aW9uKGVsOkhUTUxFbGVtZW50LHNlbGVjdG9yOnN0cmluZyx2YWx1ZTpzdHJpbmcpeyBcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KHNlbGVjdG9yKSl7XG4gICAgICBjb25zdCBleGlzdHM9ZWxfdG9faHRtbC5nZXQoY2hpbGQpXG4gICAgICBpZiAoZXhpc3RzPT09dmFsdWUpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICBlbF90b19odG1sLnNldChjaGlsZCx2YWx1ZSlcbiAgICAgIHNldHRlcihjaGlsZCx2YWx1ZSkgIFxuICAgIH0gXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IHVwZGF0ZV9jaGlsZF9odG1sPXNldHRlcl9jYWNoZSgoZWw6SFRNTEVsZW1lbnQsdmFsdWU6c3RyaW5nKT0+e2VsLmlubmVySFRNTD12YWx1ZX0pXG5leHBvcnQgY29uc3QgdXBkYXRlX2NsYXNzX25hbWU9c2V0dGVyX2NhY2hlKChlbDpIVE1MRWxlbWVudCx2YWx1ZTpzdHJpbmcpPT57IGVsLmNsYXNzTmFtZT12YWx1ZX0pXG5cbmV4cG9ydCBjbGFzcyBDdHJsVHJhY2tlcntcbiAgcHJlc3NlZCA9IGZhbHNlO1xuICBjb25zdHJ1Y3Rvcigpe1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSBcIkNvbnRyb2xcIikge1xuICAgICAgICB0aGlzLnByZXNzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSBcIkNvbnRyb2xcIikge1xuICAgICAgICB0aGlzLnByZXNzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTsgICAgXG4gIH1cbn1cbmludGVyZmFjZSBWU0NvZGVBcGkge1xuICBwb3N0TWVzc2FnZShtZXNzYWdlOiB1bmtub3duKTogdm9pZDtcbiAgZ2V0U3RhdGUoKTogdW5rbm93bjtcbiAgc2V0U3RhdGUoc3RhdGU6IHVua25vd24pOiB2b2lkO1xufVxuZGVjbGFyZSBmdW5jdGlvbiBhY3F1aXJlVnNDb2RlQXBpKCk6IFZTQ29kZUFwaTtcbmV4cG9ydCBjb25zdCB2c2NvZGUgPSBhY3F1aXJlVnNDb2RlQXBpKCk7XG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudHtcbiAgb25faW50ZXJ2YWw6KCk9PnZvaWRcbiAgb25fZGF0YTooZGF0YTp1bmtub3duKT0+dm9pZFxufVxuZXhwb3J0IGNvbnN0IGN0cmw9bmV3IEN0cmxUcmFja2VyKClcbmV4cG9ydCBjb25zdCByZSA9IChmbGFncz86IHN0cmluZykgPT4gIC8vdG9kbzogbW92ZSBpdCB0byBzb21lIGdlbmVyaWMgbGliIGxpa2UgdGhlIGJhc2VfdHlwZXMuIGFscmVhZHkgb2Jzb2xldGVcbiAgKHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IHVua25vd25bXSk6IFJlZ0V4cCA9PiB7XG4gICAgY29uc3QgcmF3ID0gU3RyaW5nLnJhdyh7IHJhdzogc3RyaW5ncyB9LCAuLi52YWx1ZXMpO1xuICAgIGNvbnN0IHNhbml0aXplZCA9IHJhdy5yZXBsYWNlKC8jLiokL2dtLCAnJykucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoc2FuaXRpemVkLCBmbGFncyk7XG4gIH07XG4iLCAiZXhwb3J0IHR5cGUgczJ0PFQ+ID0gUmVjb3JkPHN0cmluZywgVD5cbmV4cG9ydCB0eXBlIHMydSA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG5leHBvcnQgdHlwZSBwMnUgPSBSZWNvcmQ8UHJvcGVydHlLZXksIHVua25vd24+IFxuZXhwb3J0IGNvbnN0IGdyZWVuPSdcXHgxYls0MG1cXHgxYlszMm0nXG5leHBvcnQgY29uc3QgcmVkPSdcXHgxYls0MG1cXHgxYlszMW0nXG5leHBvcnQgY29uc3QgeWVsbG93PSdcXHgxYls0MG1cXHgxYlszM20nXG5cbmV4cG9ydCBjb25zdCByZXNldD0nXFx4MWJbMG0nXG5leHBvcnQgZnVuY3Rpb24gbmw8VD4odmFsdWU6IFQgfCBudWxsIHwgdW5kZWZpbmVkKTogVCB7XG4gIC8vdG9kbzpjaGVjayBvbmx5IGFjdGl2ZSBvbiBkZWJ1ZyBtb2RlXG4gIC8vcmV0dXJuIHZhbHVlXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgbnVsbCBvciB1bmRlZmluZWQnKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuZXhwb3J0IHR5cGUgS2V5ID0gbnVtYmVyIHwgc3RyaW5nIC8vc2hvdWxkIGkgdXNlIHByb3BlcnlrZXkgZm9yIHRoaXM/XG5leHBvcnQgdHlwZSBBdG9tID0gbnVtYmVyIHwgc3RyaW5nIHwgYm9vbGVhbiBcbmV4cG9ydCBmdW5jdGlvbiBpc19hdG9tKHg6IHVua25vd24pOiB4IGlzIEF0b20ge1xuICBpZiAoeCA9PSBudWxsKSByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIFsnbnVtYmVyJywgJ3N0cmluZycsICdib29sZWFuJ10uaW5jbHVkZXModHlwZW9mIHgpXG59XG5leHBvcnQgZnVuY3Rpb24gaXNfa2V5KHg6IHVua25vd24pOiB4IGlzIEtleSB7XG4gIGlmICh4ID09IG51bGwpIHJldHVybiBmYWxzZVxuICByZXR1cm4gWydudW1iZXInLCAnc3RyaW5nJ10uaW5jbHVkZXModHlwZW9mIHgpXG59XG5leHBvcnQgZnVuY3Rpb24gaXNfYXRvbV9leCh2OiB1bmtub3duLCBwbGFjZTogc3RyaW5nLCBrID0gJycpOiB2IGlzIEF0b20ge1xuICBpZiAoaXNfYXRvbSh2KSkgcmV0dXJuIHRydWVcbiAgY29uc29sZS53YXJuKCdub24tYXRvbScsIHBsYWNlLCBrLCB2KVxuICByZXR1cm4gZmFsc2Vcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRfZXJyb3IoeDp1bmtub3duKXtcbiAgaWYgKHggaW5zdGFuY2VvZiBFcnJvcilcbiAgICByZXR1cm4geFxuICBjb25zdCBzdHIgPSBTdHJpbmcoeClcbiAgcmV0dXJuIG5ldyBFcnJvcihzdHIpXG59XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtcGFyYW1ldGVyc1xuZXhwb3J0IGZ1bmN0aW9uIGlzX29iamVjdDxUIGV4dGVuZHMgb2JqZWN0PXMydT4odmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBUe1xuICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICBcbiAgLy8gQWNjZXB0IG9iamVjdHMgYW5kIGZ1bmN0aW9uc1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcbiAgXG4gIC8vIEV4Y2x1ZGUga25vd24gbm9uLW9iamVjdCB0eXBlc1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgU2V0KSByZXR1cm4gZmFsc2U7XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE1hcCkgcmV0dXJuIGZhbHNlO1xuICBcbiAgcmV0dXJuIHRydWU7XG59XG5leHBvcnQgZnVuY3Rpb24gaGFzX2tleShvYmo6IHVua25vd24sIGs6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAoIWlzX29iamVjdChvYmopKSByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIGsgaW4gb2JqXG59XG5leHBvcnQgZnVuY3Rpb24qIG9iamVjdHNfb25seShhcjp1bmtub3duW10pe1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXIpXG4gICAgaWYgKGlzX29iamVjdChpdGVtKSlcbiAgICAgIHlpZWxkIGl0ZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc19rZXlzKG9iajogdW5rbm93biwga2V5czogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgaWYgKCFpc19vYmplY3Qob2JqKSkgcmV0dXJuIGZhbHNlXG4gIGZvciAoY29uc3QgayBvZiBrZXlzKSBpZiAoayBpbiBrZXlzKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gZmFsc2Vcbn0gXG5leHBvcnQgdHlwZSBzdHJzZXQgPSBTZXQ8c3RyaW5nPlxuZXhwb3J0IHR5cGUgczJudW0gPSBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+XG5leHBvcnQgdHlwZSBzMnMgPSBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG5leHBvcnQgdHlwZSBudW0ybnVtID0gUmVjb3JkPG51bWJlciwgbnVtYmVyPlxuXG5leHBvcnQgZnVuY3Rpb24gcGs8VCwgSyBleHRlbmRzIGtleW9mIFQ+KG9iajogVCB8IHVuZGVmaW5lZCwgLi4ua2V5czogS1tdKTogUGljazxULCBLPiB7XG4gIGNvbnN0IHJldDogUmVjb3JkPFByb3BlcnR5S2V5LHVua25vd24+ID0ge30gXG4gIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgcmV0W2tleV0gPSBvYmo/LltrZXldXG4gIH0pXG4gIHJldHVybiByZXQgYXMgUGljazxULCBLPiBcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc19wcm9taXNlPFQ9dm9pZD4odmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcm9taXNlPFQ+IHsgLy8vdHMoMjY3NylcbiAgaWYgKCFpc19vYmplY3QodmFsdWUpKVxuICAgIHJldHVybiBmYWxzZVxuXG4gIGNvbnN0IGFucz10eXBlb2YgKHZhbHVlLnRoZW4pPT09J2Z1bmN0aW9uJ1xuICByZXR1cm4gYW5zXG59XG5leHBvcnQgdHlwZSBNYXliZVByb21pc2U8VD49VHxQcm9taXNlPFQ+XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZV9tYXliZV9wcm9taXNlPFQ+KGE6TWF5YmVQcm9taXNlPFQ+KXtcbiAgaWYgKGlzX3Byb21pc2UoYSkpXG4gICAgcmV0dXJuIGF3YWl0IGFcbiAgcmV0dXJuIGFcbn1cbiAgICAgIFxuZXhwb3J0IGludGVyZmFjZSBUZXN0e1xuICBrPzpzdHJpbmcsXG4gIHY/OkF0b20sXG4gIGY6KCk9Pk1heWJlUHJvbWlzZTxBdG9tPlxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuX3Rlc3RzKC4uLnRlc3RzOiBUZXN0W10pIHtcbiAgbGV0IHBhc3NlZCA9IDBcbiAgbGV0IGZhaWxlZCA9IDBcbiAgXG4gIGZvciAoY29uc3Qge2ssdixmfSBvZiB0ZXN0cykge1xuICAgIGNvbnN0IGVrPWZ1bmN0aW9uKCl7XG4gICAgICBpZiAoayE9bnVsbClcbiAgICAgICAgcmV0dXJuIGtcbiAgICAgIGNvbnN0IGZzdHI9U3RyaW5nKGYpXG4gICAgICB7XG4gICAgICAgIGNvbnN0IG1hdGNoPWZzdHIubWF0Y2goLyhcXChcXCkgPT4gKSguKikvKVxuICAgICAgICBpZiAobWF0Y2g/Lmxlbmd0aD09PTMpXG4gICAgICAgICAgcmV0dXJuIG1hdGNoWzJdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGNvbnN0IG1hdGNoPWZzdHIubWF0Y2goL2Z1bmN0aW9uXFxzKFxcdyspLylcbiAgICAgICAgaWYgKG1hdGNoPy5sZW5ndGg9PT0yKVxuICAgICAgICAgIHJldHVybiBtYXRjaFsxXSAgICAgIFxuICAgICAgfVxuICAgICAgcmV0dXJuICdmdW5jdGlvbidcbiAgICB9KClcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmV0PWYoKVxuICAgICAgY29uc3QgZWZmZWN0aXZlX3Y9dj8/dHJ1ZVxuICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCByZXNvbHZlX21heWJlX3Byb21pc2UocmV0KVxuICAgICAgaWYgKHJlc29sdmVkPT09ZWZmZWN0aXZlX3Ype1xuICAgICAgICBjb25zb2xlLmxvZyhgXHUyNzA1ICR7ZWt9OiAke2dyZWVufSR7ZWZmZWN0aXZlX3Z9JHtyZXNldH1gKVxuICAgICAgICBwYXNzZWQrK1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgXHUyNzRDICR7ZWt9OmV4cGVjdGVkICR7eWVsbG93fSR7ZWZmZWN0aXZlX3Z9JHtyZXNldH0sIGdvdCAke3JlZH0ke3Jlc29sdmVkfSR7cmVzZXR9YClcbiAgICAgICAgZmFpbGVkKytcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFx1RDgzRFx1RENBNSAke2VrfSB0aHJldyBhbiBlcnJvcjpgLCBlcnIpXG4gICAgICBmYWlsZWQrK1xuICAgIH1cbiAgfVxuICBpZiAoZmFpbGVkPT09MClcbiAgICBjb25zb2xlLmxvZyhgXFxuU3VtbWFyeTogIGFsbCAke3Bhc3NlZH0gcGFzc2VkYCkgIFxuICBlbHNlXG4gICAgY29uc29sZS5sb2coYFxcblN1bW1hcnk6ICAke2ZhaWxlZH0gZmFpbGVkLCAke3Bhc3NlZH0gcGFzc2VkYCkgIFxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb21tb25QcmVmaXgocGF0aHM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgaWYgKHBhdGhzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwiXCI7XG4gIGlmIChwYXRocy5sZW5ndGggPT09IDEpIHJldHVybiBwYXRoc1swXTtcblxuICAvLyBTcGxpdCBlYWNoIHBhdGggaW50byBwYXJ0cyAoZS5nLiwgYnkgXCIvXCIgb3IgXCJcXFxcXCIpXG4gIGNvbnN0IHNwbGl0UGF0aHMgPSBwYXRocy5tYXAocCA9PiBwLnNwbGl0KC9bXFxcXC9dKy8pKTtcblxuICBjb25zdCBjb21tb25QYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZmlyc3QgPSBzcGxpdFBhdGhzWzBdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZmlyc3QubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwYXJ0ID0gZmlyc3RbaV07XG4gICAgaWYgKHNwbGl0UGF0aHMuZXZlcnkocCA9PiBwW2ldID09PSBwYXJ0KSkge1xuICAgICAgY29tbW9uUGFydHMucHVzaChwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy8gSm9pbiBiYWNrIHdpdGggXCIvXCIgKG9yIHVzZSBwYXRoLmpvaW4gZm9yIHBsYXRmb3JtLXNwZWNpZmljIGJlaGF2aW9yKVxuICByZXR1cm4gY29tbW9uUGFydHMuam9pbihcIi9cIik7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gZ2V0X25vZGUoKXtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJnZXRGaWxlQ29udGVudHMoKSByZXF1aXJlcyBOb2RlLmpzXCIpO1xuICB9XG4gIGNvbnN0IHBhdGggPSBhd2FpdCBpbXBvcnQoXCJub2RlOnBhdGhcIik7XG4gIGNvbnN0IGZzID0gYXdhaXQgaW1wb3J0KFwibm9kZTpmcy9wcm9taXNlc1wiKTtcbiAgcmV0dXJuIHtmcyxwYXRofSAgXG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWtkaXJfd3JpdGVfZmlsZShmaWxlUGF0aDpzdHJpbmcsZGF0YTpzdHJpbmcsY2FjaGU9ZmFsc2Upe1xuICBjb25zdCB7cGF0aCxmc309YXdhaXQgZ2V0X25vZGUoKVxuICBjb25zdCBkaXJlY3Rvcnk9cGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgdHJ5e1xuICAgIGF3YWl0IGZzLm1rZGlyKGRpcmVjdG9yeSx7cmVjdXJzaXZlOnRydWV9KTtcbiAgICBpZiAoY2FjaGUpe1xuICAgICAgY29uc3QgZXhpc3RzPWF3YWl0IHJlYWRfZmlsZShmaWxlUGF0aCk7XG4gICAgICBpZiAoZXhpc3RzPT09ZGF0YSlcbiAgICAgICAgcmV0dXJuXG4gICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5cbiAgICBhd2FpdCBmcy53cml0ZUZpbGUoZmlsZVBhdGgsZGF0YSk7XG4gICAgY29uc29sZS5sb2coYEZpbGUgJyR7ZmlsZVBhdGh9JyBoYXMgYmVlbiB3cml0dGVuIHN1Y2Nlc3NmdWxseS5gKTtcbiAgfSBjYXRjaCAoZXJyKXtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB3cml0aW5nIGZpbGUnLGVycilcbiAgfVxufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRfZmlsZShmaWxlbmFtZTpzdHJpbmcpe1xuICBjb25zdCB7ZnN9PWF3YWl0IGdldF9ub2RlKCkgIFxuICB0cnl7XG4gICAgY29uc3QgYW5zPWF3YWl0IGZzLnJlYWRGaWxlKGZpbGVuYW1lKVxuICAgIHJldHVybiBhbnMudG9TdHJpbmcoKVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZF9qc29uX29iamVjdChmaWxlbmFtZTpzdHJpbmcsb2JqZWN0X3R5cGU6c3RyaW5nKXtcbiAgY29uc3Qge2ZzfT1hd2FpdCBnZXRfbm9kZSgpXG4gIHRyeXtcbiAgICBjb25zdCBkYXRhPWF3YWl0IGZzLnJlYWRGaWxlKGZpbGVuYW1lLCBcInV0Zi04XCIpO1xuICAgIGNvbnN0IGFucz1KU09OLnBhcnNlKGRhdGEpIGFzIHVua25vd25cbiAgICBpZiAoIWlzX29iamVjdChhbnMpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBub3QgYSB2YWxpZCAke29iamVjdF90eXBlfWApXG4gICAgcmV0dXJuIGFuc1xuICB9Y2F0Y2goZXg6dW5rbm93bil7XG4gICAgY29uc29sZS53YXJuKGAke2ZpbGVuYW1lfToke2dldF9lcnJvcihleCl9Lm1lc3NhZ2VgKVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIGlzX3N0cmluZ19hcnJheShhOnVua25vd24pOmEgaXMgc3RyaW5nW117XG4gIGlmICghQXJyYXkuaXNBcnJheShhKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgZm9yIChjb25zdCB4IG9mIGEpXG4gICAgaWYgKHR5cGVvZiB4IT09J3N0cmluZycpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIHRydWUgIFxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcikge1xuICByZXR1cm4gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUodW5kZWZpbmVkKSwgbXMpO1xuICB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBtYWtlX2FycmF5PFQ+KCk6QXJyYXk8VD57XG4gIHJldHVybiBbXVxufVxuZXhwb3J0IGZ1bmN0aW9uIG1ha2Vfc2V0PFQ+KCl7XG4gIHJldHVybiBuZXcgU2V0PFQ+XG59XG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdF9nZXQ8VD4ob2JqOlJlY29yZDxQcm9wZXJ0eUtleSxUPixrOlByb3BlcnR5S2V5LG1ha2VyOigpPT5UKXtcbiAgY29uc3QgZXhpc3RzPW9ialtrXVxuICBpZiAoZXhpc3RzPT1udWxsKXtcbiAgICBvYmpba109bWFrZXIoKSBcbiAgfVxuICByZXR1cm4gb2JqW2tdXG59XG5leHBvcnQgY2xhc3MgUmVwZWF0ZXJ7XG4gIGlzX3J1bm5pbmc9dHJ1ZVxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZGVsYXk9MjAwKXtcbiAgfVxuICBwcml2YXRlIGxvb3A9YXN5bmMgKGY6KCk9Pk1heWJlUHJvbWlzZTx2b2lkPik9PntcbiAgICB3aGlsZSAodGhpcy5pc19ydW5uaW5nKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmKCk7XG4gICAgICAgIC8vY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjpcIiwgZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICAvLyB3YWl0IGJlZm9yZSBuZXh0IHJ1blxuICAgICAgYXdhaXQgc2xlZXAodGhpcy5kZWxheSlcbiAgICB9ICAgIFxuICB9XG4gIGFzeW5jIHJlcGVhdChmOigpPT5NYXliZVByb21pc2U8dm9pZD4peyAgXG4gICAgYXdhaXQgZigpO1xuICAgIHZvaWQgdGhpcy5sb29wKGYpXG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiB0b2dnbGVfc2V0PFQ+KHNldDpTZXQ8VD4sdmFsdWU6VCl7XG4gIGlmIChzZXQuaGFzKHZhbHVlKSkge1xuICAgIHNldC5kZWxldGUodmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIHNldC5hZGQodmFsdWUpO1xuICB9XG59IiwgImltcG9ydCAgdHlwZSB7IE1heWJlUHJvbWlzZX0gZnJvbSAnQHlpZ2FsL2Jhc2VfdHlwZXMnXG5pbXBvcnQge2dldF9wYXJlbnRfYnlfY2xhc3N9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuZXhwb3J0IGludGVyZmFjZSBUcmVlTm9kZXtcbiAgdHlwZSAgICAgICAgICAgICAgICAgICA6ICdpdGVtJ3wnZm9sZGVyJyAgIC8vaXMgdGhpcyBuZWVkZWQ/XG4gIGxhYmVsICAgICAgICAgICAgICAgICAgOiBzdHJpbmcsXG4gIGlkICAgICAgICAgICAgICAgICAgICAgOiBzdHJpbmc7XG4gIGljb24gICAgICAgICAgICAgICAgICAgOiBzdHJpbmdcbiAgY2xhc3NOYW1lICAgICAgICAgICAgICA6IHN0cmluZ3x1bmRlZmluZWRcbiAgZGVzY3JpcHRpb24gICAgICAgICAgID86IHN0cmluZ1xuICBjb21tYW5kcyAgICAgICAgICAgICAgIDogc3RyaW5nW10gICAgICAgICAgLy9oYXJkIGNvZGRlZCBjb21tbWFuZDogY2hlY2tib3ggY2xpY2tlZFxuICBjaGlsZHJlbiAgICAgICAgICAgICAgIDogVHJlZU5vZGVbXVxuICBpY29uX3ZlcnNpb24gICAgICAgICAgIDogbnVtYmVyLFxuICB0b2dnbGVzICAgICAgICAgICAgICAgIDogUmVjb3JkPHN0cmluZyxib29sZWFufHVuZGVmaW5lZD5cbiAgdGFnczogICAgICAgICAgICAgICAgICBzdHJpbmdbXVxuICAvL2NoZWNrYm94X3N0YXRlICAgICAgICAgOiBib29sZWFufHVuZGVmaW5lZFxuICAvL2RlZmF1bHRfY2hlY2tib3hfc3RhdGUgOiBib29sZWFufHVuZGVmaW5lZFxufVxuZXhwb3J0IGludGVyZmFjZSBUcmVlRGF0YVByb3ZpZGVye1xuICB0b2dnbGVfb3JkZXI6QXJyYXk8c3RyaW5nPlxuICAvL2NvbnZlcnQ6IChyb290OnVua25vd24pPT5UcmVlTm9kZVxuICBjb21tYW5kOihpZDpzdHJpbmcsY29tbWFuZF9uYW1lOnN0cmluZyk9Pk1heWJlUHJvbWlzZTx2b2lkPlxuICBzZWxlY3RlZDooaWQ6c3RyaW5nKT0+TWF5YmVQcm9taXNlPHZvaWQ+XG4gIC8vaWNvbnNfaHRtbDpzdHJpbmdcbn1cblxuZnVuY3Rpb24gZ2V0X3ByZXZfc2VsZWN0ZWQoc2VsZWN0ZWQ6SFRNTEVsZW1lbnQpe1xuICBpZiAoc2VsZWN0ZWQ9PW51bGwpXG4gICAgcmV0dXJuIG51bGwgLy8gaSBsaWtlIHVuZGVmaW5lZCBiZXR0ZXIgYnV0IHdhbnQgdG8gaGF2ZSB0aGUgXG4gIGxldCBjdXI6Q2hpbGROb2RlfG51bGw9c2VsZWN0ZWRcbiAgd2hpbGUoY3VyIT1udWxsKXtcbiAgICBjdXI9Y3VyLnByZXZpb3VzU2libGluZ1xuICAgIGlmIChjdXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcbiAgICAgIHJldHVybiBjdXJcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuZnVuY3Rpb24gZ2V0X25leHRfc2VsZWN0ZWQoc2VsZWN0ZWQ6SFRNTEVsZW1lbnQpe1xuICBpZiAoc2VsZWN0ZWQ9PW51bGwpXG4gICAgcmV0dXJuIG51bGwgLy8gaSBsaWtlIHVuZGVmaW5lZCBiZXR0ZXIgYnV0IHdhbnQgdG8gaGF2ZSB0aGUgXG4gIGxldCBjdXI6Q2hpbGROb2RlfG51bGw9c2VsZWN0ZWRcbiAgd2hpbGUoY3VyIT1udWxsKXtcbiAgICBjdXI9Y3VyLm5leHRTaWJsaW5nXG4gICAgaWYgKGN1ciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KVxuICAgICAgcmV0dXJuIGN1clxuICB9XG4gIHJldHVybiBudWxsXG59XG4vKmZ1bmN0aW9uIGluZGV4X2ZvbGRlcihyb290OlRyZWVOb2RlKXtcbiAgY29uc3QgYW5zOnMydDxUcmVlTm9kZT49e31cbiAgZnVuY3Rpb24gZihub2RlOlRyZWVOb2RlKXtcbiAgICBhbnNbbm9kZS5pZF09bm9kZVxuICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmKVxuICB9XG4gIGYocm9vdClcbiAgcmV0dXJuIGFuc1xufSovXG5mdW5jdGlvbiBjYWxjX3N1bW1hcnkobm9kZTpUcmVlTm9kZSk6c3RyaW5ne1xuICBjb25zdCBpZ25vcmU9WydpY29uX3ZlcnNpb24nLCdpY29uJywndG9nZ2xlcycsJ2NsYXNzTmFtZSddXG4gIGZ1bmN0aW9uIHJlcGxhY2VyKGs6c3RyaW5nLHY6dW5rbm93bil7XG4gICAgaWYgKGlnbm9yZS5pbmNsdWRlcyhrKSlcbiAgICAgIHJldHVybiAnJ1xuICAgIHJldHVybiB2XG4gIH1cbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5vZGUscmVwbGFjZXIsMikvL1x1MjZBMCBFcnJvciAoVFMyNzY5KVxufVxuZXhwb3J0IGZ1bmN0aW9uIG5lZWRfZnVsbF9yZW5kZXIocm9vdDpUcmVlTm9kZSxvbGRfcm9vdDpUcmVlTm9kZXx1bmRlZmluZWQpe1xuICBpZiAob2xkX3Jvb3Q9PW51bGwpXG4gICAgcmV0dXJuIHRydWVcbiAgY29uc3Qgc3VtbWFyeT1jYWxjX3N1bW1hcnkocm9vdClcbiAgY29uc3Qgb2xkX3N1bW1hcnk9Y2FsY19zdW1tYXJ5KG9sZF9yb290KVxuICByZXR1cm4gKG9sZF9zdW1tYXJ5IT09c3VtbWFyeSlcbn1cbmZ1bmN0aW9uIGdldF9jaGlsZHJlbihzZWxlY3RlZDpIVE1MRWxlbWVudCl7XG4gIGlmIChzZWxlY3RlZC5jbGFzc0xpc3QuY29udGFpbnMoJ2NvbGxhcHNlZCcpKVxuICAgIHJldHVybiBudWxsXG4gIGNvbnN0IGFucz0gc2VsZWN0ZWQucXVlcnlTZWxlY3RvcignLmNoaWxkcmVuJykvL2J5IHRob2Vybm0gaXMgYW4gSFRNTEVsZW1lbnRcbiAgaWYgKGFucyE9bnVsbClcbiAgICByZXR1cm4gYW5zIGFzIEhUTUxFbGVtZW50IFxuXG59XG5mdW5jdGlvbiBnZXRMYXN0RWxlbWVudENoaWxkKHBhcmVudDogSFRNTEVsZW1lbnQpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAvLyBJdGVyYXRlIGJhY2t3YXJkcyB0aHJvdWdoIGNoaWxkIG5vZGVzXG4gIGZvciAobGV0IGkgPSBwYXJlbnQuY2hpbGROb2Rlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IG5vZGUgPSBwYXJlbnQuY2hpbGROb2Rlc1tpXTtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5mdW5jdGlvbiBnZXRGaXJzdEVsZW1lbnRDaGlsZChwYXJlbnQ6IEhUTUxFbGVtZW50KTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgZm9yIChsZXQgaSA9IDA7aTxwYXJlbnQuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IG5vZGUgPSBwYXJlbnQuY2hpbGROb2Rlc1tpXTtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5mdW5jdGlvbiBnZXRfbGFzdF92aXNpYmxlKHNlbGVjdGVkOkhUTUxFbGVtZW50KXtcbiAgY29uc3QgY2hpbGRyZW5fZGl2PWdldF9jaGlsZHJlbihzZWxlY3RlZClcbiAgaWYgKGNoaWxkcmVuX2Rpdj09bnVsbClcbiAgICByZXR1cm4gc2VsZWN0ZWRcbiAgY29uc3QgbGFzdF9jaGlsZD1nZXRMYXN0RWxlbWVudENoaWxkKGNoaWxkcmVuX2RpdilcbiAgaWYgKGxhc3RfY2hpbGQ9PW51bGwpXG4gICAgcmV0dXJuIHNlbGVjdGVkXG4gIHJldHVybiBnZXRfbGFzdF92aXNpYmxlKGxhc3RfY2hpbGQpXG59XG5leHBvcnQgZnVuY3Rpb24gZWxlbWVudF9mb3JfdXBfYXJyb3coc2VsZWN0ZWQ6SFRNTEVsZW1lbnQpe1xuICBjb25zdCBhbnM9Z2V0X3ByZXZfc2VsZWN0ZWQoc2VsZWN0ZWQpXG4gIGlmIChhbnM9PW51bGwpXG4gICAgcmV0dXJuIGdldF9wYXJlbnRfYnlfY2xhc3Moc2VsZWN0ZWQucGFyZW50RWxlbWVudCwndHJlZV9mb2xkZXInKVxuICByZXR1cm4gZ2V0X2xhc3RfdmlzaWJsZShhbnMpXG59XG5leHBvcnQgZnVuY3Rpb24gZWxlbWVudF9mb3JfZG93bl9hcnJvdyhzZWxlY3RlZDpIVE1MRWxlbWVudCl7XG4gIGNvbnN0IGNoaWxkcmVuX2Rpdj1nZXRfY2hpbGRyZW4oc2VsZWN0ZWQpXG4gIGlmIChjaGlsZHJlbl9kaXYhPW51bGwpe1xuICAgIGNvbnN0IGZpcnN0PWdldEZpcnN0RWxlbWVudENoaWxkKGNoaWxkcmVuX2RpdilcbiAgICBpZiAoZmlyc3QhPT1udWxsKVxuICAgICAgcmV0dXJuIGZpcnN0XG4gIH1cbiAgY29uc3QgYW5zPWdldF9uZXh0X3NlbGVjdGVkKHNlbGVjdGVkKVxuICBpZiAoYW5zIT1udWxsKVxuICAgIHJldHVybiBhbnNcbiAgbGV0IGN1cj1zZWxlY3RlZFxuICB3aGlsZSh0cnVlKXtcbiAgICBjb25zdCBwYXJlbnQ9Z2V0X3BhcmVudF9ieV9jbGFzcyhjdXIucGFyZW50RWxlbWVudCwndHJlZV9mb2xkZXInKVxuICAgIGlmICghKHBhcmVudCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSlcbiAgICAgIHJldHVybiBudWxsXG4gICAgY29uc3QgYW5zPWdldF9uZXh0X3NlbGVjdGVkKHBhcmVudClcbiAgICBpZiAoYW5zIT1udWxsKVxuICAgICAgcmV0dXJuIGFuc1xuICAgIGN1cj1wYXJlbnRcbiAgfVxufSIsICJpbXBvcnQgIHsgdHlwZSBzMnMsdG9nZ2xlX3NldH0gZnJvbSAnQHlpZ2FsL2Jhc2VfdHlwZXMnXG5pbXBvcnQge2dldF9wYXJlbnRfYnlfY2xhc3MsY3JlYXRlX2VsZW1lbnQsZGl2cyx1cGRhdGVfY2xhc3NfbmFtZSx1cGRhdGVfY2hpbGRfaHRtbH0gZnJvbSAnLi9kb21fdXRpbHMuanMnXG5pbXBvcnQge1xuICB0eXBlIFRyZWVOb2RlLFxuICB0eXBlIFRyZWVEYXRhUHJvdmlkZXIsXG4gIGVsZW1lbnRfZm9yX3VwX2Fycm93LFxuICBlbGVtZW50X2Zvcl9kb3duX2Fycm93LFxuICBuZWVkX2Z1bGxfcmVuZGVyXG59ZnJvbSAnLi90cmVlX2ludGVybmFscy5qcydcbmV4cG9ydCB0eXBlIHtUcmVlRGF0YVByb3ZpZGVyLFRyZWVOb2RlfVxuZXhwb3J0IGNsYXNzIFRyZWVDb250cm9se1xuICAvL3ByaXZhdGUgcm9vdDp1bmtub3duXG4gIHByaXZhdGUgY29sbGFwc2VkPW5ldyBTZXQ8c3RyaW5nPigpXG4gIHByaXZhdGUgc2VsZWN0ZWRfaWQ9JydcbiAgcHJpdmF0ZSBjb252ZXJ0ZWQ6VHJlZU5vZGV8dW5kZWZpbmVkXG4gIHByaXZhdGUgY2FsY19ub2RlX2NsYXNzKG5vZGU6VHJlZU5vZGUpe1xuICAgIGNvbnN0IHtpZCx0eXBlLHRvZ2dsZXN9PW5vZGUgICAgXG4gICAgY29uc3QgYW5zPW5ldyBTZXQ8c3RyaW5nPihbYHRyZWVfJHt0eXBlfWBdKVxuICAgIGZvciAoY29uc3QgayBvZiB0aGlzLnByb3ZpZGVyLnRvZ2dsZV9vcmRlcil7IC8vbGVhdmluZyBpdCBoZXJlIGJlY2F1c2UgaSBteSB3YW50IHRvIGNoYW5nZSB0aGUgc3R5bGluZyBvZiB0aGUgdHJlZSBsaW5lIGJhc2VkIG9uIHdhdGNoIHN0YXRlLiBidXQgY2FuY2xlZCB0aGUgY3NzIHRoYXQgc3VwcG9ydHMgaXRcbiAgICAgIGNvbnN0IGNscz1gJHtrfV8ke3RvZ2dsZXNba119YFxuICAgICAgYW5zLmFkZChjbHMpXG4gICAgfSBcbiAgICBpZiAodGhpcy5zZWxlY3RlZF9pZD09PWlkKVxuICAgICAgYW5zLmFkZCgnc2VsZWN0ZWQnKVxuICAgIGlmICh0aGlzLmNvbGxhcHNlZC5oYXMoaWQpKVxuICAgICAgYW5zLmFkZCgnY29sbGFwc2VkJylcbiAgICByZXR1cm4gWy4uLmFuc10uam9pbignICcpXG4gIH1cbiAgb25faW50ZXJ2YWwoKXtcbiAgICBjb25zdCBmPShhOlRyZWVOb2RlKT0+e1xuICAgICAgY29uc3Qge2lkLGNoaWxkcmVufT1hXG4gICAgICBjb25zdCBuZXdfY2xhc3M9dGhpcy5jYWxjX25vZGVfY2xhc3MoYSlcbiAgICAgIHVwZGF0ZV9jbGFzc19uYW1lKHRoaXMucGFyZW50LGAjJHtpZH1gLG5ld19jbGFzcylcbiAgICAgIGNoaWxkcmVuLm1hcChmKVxuICAgIH1cbiAgICBpZiAodGhpcy5jb252ZXJ0ZWQpXG4gICAgICBmKHRoaXMuY29udmVydGVkKVxuICAgIGZvciAoY29uc3QgdG9nZ2xlIG9mICB0aGlzLnByb3ZpZGVyLnRvZ2dsZV9vcmRlcil7XG4gICAgICBmb3IgKGNvbnN0IHN0YXRlIG9mIFt0cnVlLGZhbHNlLHVuZGVmaW5lZF0pe1xuICAgICAgICBjb25zdCBzZWxlY3Rvcj1gLiR7dG9nZ2xlfV8ke3N0YXRlfT4ubGFiZWxfcm93ICMke3RvZ2dsZX0udG9nZ2xlX2ljb25gXG4gICAgICAgIGNvbnN0IGljb25fbmFtZT1gJHt0b2dnbGV9XyR7c3RhdGV9YFxuICAgICAgICB1cGRhdGVfY2hpbGRfaHRtbCh0aGlzLnBhcmVudCxzZWxlY3Rvcix0aGlzLmljb25zW2ljb25fbmFtZV0/PycnKVxuICAgICAgfVxuICAgIH1cbiAgICAvL3VwZGF0ZV9jaGlsZF9odG1sKHRoaXMucGFyZW50LFwiLmxhYmVsX3JvdyAudHJlZV9jaGVja2JveFwiLGNoZWNrX3N2ZylcbiAgICAvL3VwZGF0ZV9jaGlsZF9odG1sKHRoaXMucGFyZW50LFwiLmNoa191bmNoZWNrZWQ+LmxhYmVsX3JvdyAudHJlZV9jaGVja2JveFwiLCcnKVxuICB9XG4gIC8vY29sbGFwc2VkX3NldDpTZXQ8c3RyaW5nPj1uZXcgU2V0KClcbiAgcHJpdmF0ZSBjcmVhdGVfbm9kZV9lbGVtZW50KG5vZGU6VHJlZU5vZGUsbWFyZ2luOm51bWJlcixwYXJlbnQ/OkhUTUxFbGVtZW50KXtcbiAgICAvL2NvbnN0IHtpY29uc309dGhpc1xuICAgIGNvbnN0IHt0eXBlLGlkLGRlc2NyaXB0aW9uLGxhYmVsLHRhZ3N9PW5vZGVcbiAgICBjb25zdCBjaGlsZHJlbj0odHlwZT09PSdmb2xkZXInKT9gPGRpdiBjbGFzcz1jaGlsZHJlbj48L2Rpdj5gOicnXG4gICAgLy9jb25zdCAgY29tbWFuZHNfaWNvbnM9Y29tbWFuZHMubWFwKHg9PmA8ZGl2IGNsYXNzPWNvbW1hbmRfaWNvbiBpZD0ke3h9PiR7aWNvbnNbeF19PC9kaXY+YCkuam9pbignJylcbiAgICBjb25zdCBub2RlX2NsYXNzPXRoaXMuY2FsY19ub2RlX2NsYXNzKG5vZGUpXG4gICAgY29uc3QgdnRhZ3M9dGFncy5tYXAoeD0+YDxkaXYgY2xhc3M9dGFnPiR7eH08L2Rpdj5gKS5qb2luKCcnKVxuICAgIGNvbnN0IGFucz0gY3JlYXRlX2VsZW1lbnQoYCBcbiAgPGRpdiAgY2xhc3M9XCIke25vZGVfY2xhc3N9XCIgaWQ9XCIke2lkfVwiID5cbiAgICA8ZGl2ICBjbGFzcz1cImxhYmVsX3Jvd1wiPlxuICAgICAgPGRpdiBjbGFzcz10b2dnbGVzX2ljb25zPjwvZGl2PlxuICAgICAgPGRpdiAgY2xhc3M9c2hpZnRlciBzdHlsZT0nbWFyZ2luLWxlZnQ6JHttYXJnaW59cHgnPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiaWNvblwiPiA8L2Rpdj5cbiAgICAgICAgJHtkaXZzKHtsYWJlbCx2dGFncyxkZXNjcmlwdGlvbn0pfVxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPWNvbW1hbmRzX2ljb25zPjwvZGl2PlxuICAgIDwvZGl2PlxuICAgICR7Y2hpbGRyZW59XG4gIDwvZGl2PmAscGFyZW50KSBcbiAgICByZXR1cm4gYW5zXG4gIH1cbiAgLy9vbl9zZWxlY3RlZF9jaGFuZ2VkOihhOnN0cmluZyk9Pk1heWJlUHJvbWlzZTx2b2lkPj0oYTpzdHJpbmcpPT51bmRlZmluZWRcbiAgcHJpdmF0ZSBhc3luYyBzZXRfc2VsZWN0ZWQoaWQ6c3RyaW5nKXtcbiAgICB0aGlzLnNlbGVjdGVkX2lkPWlkXG4gICAgYXdhaXQgdGhpcy5wcm92aWRlci5zZWxlY3RlZChpZClcbiAgfVxuXG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBwYXJlbnQ6SFRNTEVsZW1lbnQsXG4gICAgcHJpdmF0ZSBwcm92aWRlcjpUcmVlRGF0YVByb3ZpZGVyLFxuICAgIHByaXZhdGUgaWNvbnM6czJzXG4gICl7XG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywoZXZ0KT0+e1xuICAgICAgaWYgKCEoZXZ0LnRhcmdldCBpbnN0YW5jZW9mIEVsZW1lbnQpKVxuICAgICAgICByZXR1cm5cbiAgICAgIHBhcmVudC50YWJJbmRleCA9IDA7XG4gICAgICBwYXJlbnQuZm9jdXMoKTtcbiAgICAgIGNvbnN0IGNsaWNrZWQ9Z2V0X3BhcmVudF9ieV9jbGFzcyhldnQudGFyZ2V0LCdsYWJlbF9yb3cnKT8ucGFyZW50RWxlbWVudFxuICAgICAgaWYgKGNsaWNrZWQ9PW51bGwpXG4gICAgICAgIHJldHVyblxuICAgICAgY29uc3Qge2lkfT1jbGlja2VkXG4gICAgICBpZiAoY2xpY2tlZC5jbGFzc0xpc3QuY29udGFpbnMoJ3RyZWVfZm9sZGVyJykpIC8vaWYgY2xpY2tlZCBjb21tYW5kIHRoYW4gZG9uICBjaGFuZ2UgY29sbHBhc2VkIHN0YXR1cyBiZWNhdXNlIGR1YWwgYWN0aW9uIGlzIGFubm9pbmdcbiAgICAgICAgdG9nZ2xlX3NldCh0aGlzLmNvbGxhcHNlZCxpZClcbiAgICAgIHZvaWQgdGhpcy5zZXRfc2VsZWN0ZWQoaWQpXG4gICAgfSlcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsKGV2dCk9PntcbiAgICAgIGlmICghKGV2dC50YXJnZXQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICAgIHJldHVyblxuICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7IC8vIHN0b3BzIGRlZmF1bHQgYnJvd3NlciBhY3Rpb25cbiAgICAgIGNvbnNvbGUubG9nKGV2dC5rZXkpXG4gICAgICBjb25zdCBzZWxlY3RlZD1wYXJlbnQucXVlcnlTZWxlY3RvcignLnNlbGVjdGVkJylcbiAgICAgIGlmICghKHNlbGVjdGVkIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuICAgICAgICByZXR1cm5cbiAgICAgIHN3aXRjaChldnQua2V5KXtcbiAgICAgICAgY2FzZSAnQXJyb3dVcCc6e1xuICAgICAgICAgIGNvbnN0IHByZXY9ZWxlbWVudF9mb3JfdXBfYXJyb3coc2VsZWN0ZWQpXG4gICAgICAgICAgaWYgKCEgKHByZXYgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB2b2lkIHRoaXMuc2V0X3NlbGVjdGVkKHByZXYuaWQpICAgICAgICAgXG4gICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ0Fycm93RG93bic6e1xuICAgICAgICAgIGNvbnN0IHByZXY9ZWxlbWVudF9mb3JfZG93bl9hcnJvdyhzZWxlY3RlZClcbiAgICAgICAgICBpZiAocHJldj09bnVsbClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIHZvaWQgdGhpcy5zZXRfc2VsZWN0ZWQocHJldi5pZClcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ0Fycm93UmlnaHQnOlxuICAgICAgICAgIHRoaXMuY29sbGFwc2VkLmRlbGV0ZSh0aGlzLnNlbGVjdGVkX2lkKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ0Fycm93TGVmdCc6XG4gICAgICAgICAgdGhpcy5jb2xsYXBzZWQuYWRkKHRoaXMuc2VsZWN0ZWRfaWQpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnRW50ZXInOiAgICAgICAgICBcbiAgICAgICAgY2FzZSAnICc6XG4gICAgICAgICAgdG9nZ2xlX3NldCh0aGlzLmNvbGxhcHNlZCx0aGlzLnNlbGVjdGVkX2lkKVxuICAgICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfSkgICAgXG4gIH1cbiAgcHJpdmF0ZSBjcmVhdGVfbm9kZShwYXJlbnQ6SFRNTEVsZW1lbnQsbm9kZTpUcmVlTm9kZSxkZXB0aDpudW1iZXIpeyAvL3RvZG86IGNvbXBhcmUgdG8gbGFzdCBieSBpZCB0byBhZGQgY2hhbmdlIGFuaW1hdGlvbj9cbiAgICBjb25zdCBjaGlsZHJlbl9lbD0oKCk9PntcbiAgICAgIGlmIChkZXB0aD09PTApXG4gICAgICAgIHJldHVybiBjcmVhdGVfZWxlbWVudCgnPGRpdiBjbGFzcz1jaGlsZHJlbj48L2Rpdj4nLHBhcmVudClcbiAgICAgIGNvbnN0IG5ld19wYXJlbnQ9dGhpcy5jcmVhdGVfbm9kZV9lbGVtZW50KG5vZGUsZGVwdGgqMjArMTYrMTYscGFyZW50KVxuICAgICAgcmV0dXJuIG5ld19wYXJlbnQucXVlcnlTZWxlY3RvcignLmNoaWxkcmVuJykgLy9yZXR1cm4gdmFsdWUgbWlnaHQgYmUgbnVsbCBmb3IgaXRlbSBub2RlICBcbiAgICB9KSgpXG4gICAgaWYgKGNoaWxkcmVuX2VsPT1udWxsKXtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHggb2Ygbm9kZS5jaGlsZHJlbil7XG4gICAgICB0aGlzLmNyZWF0ZV9ub2RlKGNoaWxkcmVuX2VsIGFzIEhUTUxFbGVtZW50LHgsZGVwdGgrMSlcbiAgICB9XG4gIH1cbiAgcHJpdmF0ZSBiaWdfcmVuZGVyKGNvbnZlcnRlZDpUcmVlTm9kZSl7XG4gICAgdGhpcy5wYXJlbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgdGhpcy5jcmVhdGVfbm9kZSh0aGlzLnBhcmVudCxjb252ZXJ0ZWQsMCkgLy90b2RvIHBhc3MgdGhlIGxhc3QgY29udmVydGVkIHNvIGNhbiBkbyBjaGFuZ2UvY2F0ZSBhbmltYXRpb24gICAgXG4gIH1cbiAgb25fZGF0YShjb252ZXJ0ZWQ6VHJlZU5vZGUpe1xuICAgIC8vY29uc3QgY29udmVydGVkPXRoaXMucHJvdmlkZXIuY29udmVydChyb290KVxuICAgIC8vdGhpcy5yb290PXJvb3RcbiAgICBpZiAobmVlZF9mdWxsX3JlbmRlcihjb252ZXJ0ZWQsdGhpcy5jb252ZXJ0ZWQpKVxuICAgICAgdGhpcy5iaWdfcmVuZGVyKGNvbnZlcnRlZClcbiAgICB0aGlzLmNvbnZlcnRlZD1jb252ZXJ0ZWRcbiAgfVxufSIsICIvLyBUaGlzIGZpbGUgd2FzIGdlbmVyYXRlZC4gRG8gbm90IG1vZGlmeSBtYW51YWxseSFcbnZhciBhc3RyYWxJZGVudGlmaWVyQ29kZXMgPSBbNTA5LCAwLCAyMjcsIDAsIDE1MCwgNCwgMjk0LCA5LCAxMzY4LCAyLCAyLCAxLCA2LCAzLCA0MSwgMiwgNSwgMCwgMTY2LCAxLCA1NzQsIDMsIDksIDksIDcsIDksIDMyLCA0LCAzMTgsIDEsIDc4LCA1LCA3MSwgMTAsIDUwLCAzLCAxMjMsIDIsIDU0LCAxNCwgMzIsIDEwLCAzLCAxLCAxMSwgMywgNDYsIDEwLCA4LCAwLCA0NiwgOSwgNywgMiwgMzcsIDEzLCAyLCA5LCA2LCAxLCA0NSwgMCwgMTMsIDIsIDQ5LCAxMywgOSwgMywgMiwgMTEsIDgzLCAxMSwgNywgMCwgMywgMCwgMTU4LCAxMSwgNiwgOSwgNywgMywgNTYsIDEsIDIsIDYsIDMsIDEsIDMsIDIsIDEwLCAwLCAxMSwgMSwgMywgNiwgNCwgNCwgNjgsIDgsIDIsIDAsIDMsIDAsIDIsIDMsIDIsIDQsIDIsIDAsIDE1LCAxLCA4MywgMTcsIDEwLCA5LCA1LCAwLCA4MiwgMTksIDEzLCA5LCAyMTQsIDYsIDMsIDgsIDI4LCAxLCA4MywgMTYsIDE2LCA5LCA4MiwgMTIsIDksIDksIDcsIDE5LCA1OCwgMTQsIDUsIDksIDI0MywgMTQsIDE2NiwgOSwgNzEsIDUsIDIsIDEsIDMsIDMsIDIsIDAsIDIsIDEsIDEzLCA5LCAxMjAsIDYsIDMsIDYsIDQsIDAsIDI5LCA5LCA0MSwgNiwgMiwgMywgOSwgMCwgMTAsIDEwLCA0NywgMTUsIDE5OSwgNywgMTM3LCA5LCA1NCwgNywgMiwgNywgMTcsIDksIDU3LCAyMSwgMiwgMTMsIDEyMywgNSwgNCwgMCwgMiwgMSwgMiwgNiwgMiwgMCwgOSwgOSwgNDksIDQsIDIsIDEsIDIsIDQsIDksIDksIDU1LCA5LCAyNjYsIDMsIDEwLCAxLCAyLCAwLCA0OSwgNiwgNCwgNCwgMTQsIDEwLCA1MzUwLCAwLCA3LCAxNCwgMTE0NjUsIDI3LCAyMzQzLCA5LCA4NywgOSwgMzksIDQsIDYwLCA2LCAyNiwgOSwgNTM1LCA5LCA0NzAsIDAsIDIsIDU0LCA4LCAzLCA4MiwgMCwgMTIsIDEsIDE5NjI4LCAxLCA0MTc4LCA5LCA1MTksIDQ1LCAzLCAyMiwgNTQzLCA0LCA0LCA1LCA5LCA3LCAzLCA2LCAzMSwgMywgMTQ5LCAyLCAxNDE4LCA0OSwgNTEzLCA1NCwgNSwgNDksIDksIDAsIDE1LCAwLCAyMywgNCwgMiwgMTQsIDEzNjEsIDYsIDIsIDE2LCAzLCA2LCAyLCAxLCAyLCA0LCAxMDEsIDAsIDE2MSwgNiwgMTAsIDksIDM1NywgMCwgNjIsIDEzLCA0OTksIDEzLCAyNDUsIDEsIDIsIDksIDIzMywgMCwgMywgMCwgOCwgMSwgNiwgMCwgNDc1LCA2LCAxMTAsIDYsIDYsIDksIDQ3NTksIDksIDc4NzcxOSwgMjM5XTtcblxuLy8gVGhpcyBmaWxlIHdhcyBnZW5lcmF0ZWQuIERvIG5vdCBtb2RpZnkgbWFudWFsbHkhXG52YXIgYXN0cmFsSWRlbnRpZmllclN0YXJ0Q29kZXMgPSBbMCwgMTEsIDIsIDI1LCAyLCAxOCwgMiwgMSwgMiwgMTQsIDMsIDEzLCAzNSwgMTIyLCA3MCwgNTIsIDI2OCwgMjgsIDQsIDQ4LCA0OCwgMzEsIDE0LCAyOSwgNiwgMzcsIDExLCAyOSwgMywgMzUsIDUsIDcsIDIsIDQsIDQzLCAxNTcsIDE5LCAzNSwgNSwgMzUsIDUsIDM5LCA5LCA1MSwgMTMsIDEwLCAyLCAxNCwgMiwgNiwgMiwgMSwgMiwgMTAsIDIsIDE0LCAyLCA2LCAyLCAxLCA0LCA1MSwgMTMsIDMxMCwgMTAsIDIxLCAxMSwgNywgMjUsIDUsIDIsIDQxLCAyLCA4LCA3MCwgNSwgMywgMCwgMiwgNDMsIDIsIDEsIDQsIDAsIDMsIDIyLCAxMSwgMjIsIDEwLCAzMCwgNjYsIDE4LCAyLCAxLCAxMSwgMjEsIDExLCAyNSwgNywgMjUsIDM5LCA1NSwgNywgMSwgNjUsIDAsIDE2LCAzLCAyLCAyLCAyLCAyOCwgNDMsIDI4LCA0LCAyOCwgMzYsIDcsIDIsIDI3LCAyOCwgNTMsIDExLCAyMSwgMTEsIDE4LCAxNCwgMTcsIDExMSwgNzIsIDU2LCA1MCwgMTQsIDUwLCAxNCwgMzUsIDM5LCAyNywgMTAsIDIyLCAyNTEsIDQxLCA3LCAxLCAxNywgNSwgNTcsIDI4LCAxMSwgMCwgOSwgMjEsIDQzLCAxNywgNDcsIDIwLCAyOCwgMjIsIDEzLCA1MiwgNTgsIDEsIDMsIDAsIDE0LCA0NCwgMzMsIDI0LCAyNywgMzUsIDMwLCAwLCAzLCAwLCA5LCAzNCwgNCwgMCwgMTMsIDQ3LCAxNSwgMywgMjIsIDAsIDIsIDAsIDM2LCAxNywgMiwgMjQsIDIwLCAxLCA2NCwgNiwgMiwgMCwgMiwgMywgMiwgMTQsIDIsIDksIDgsIDQ2LCAzOSwgNywgMywgMSwgMywgMjEsIDIsIDYsIDIsIDEsIDIsIDQsIDQsIDAsIDE5LCAwLCAxMywgNCwgMzEsIDksIDIsIDAsIDMsIDAsIDIsIDM3LCAyLCAwLCAyNiwgMCwgMiwgMCwgNDUsIDUyLCAxOSwgMywgMjEsIDIsIDMxLCA0NywgMjEsIDEsIDIsIDAsIDE4NSwgNDYsIDQyLCAzLCAzNywgNDcsIDIxLCAwLCA2MCwgNDIsIDE0LCAwLCA3MiwgMjYsIDM4LCA2LCAxODYsIDQzLCAxMTcsIDYzLCAzMiwgNywgMywgMCwgMywgNywgMiwgMSwgMiwgMjMsIDE2LCAwLCAyLCAwLCA5NSwgNywgMywgMzgsIDE3LCAwLCAyLCAwLCAyOSwgMCwgMTEsIDM5LCA4LCAwLCAyMiwgMCwgMTIsIDQ1LCAyMCwgMCwgMTksIDcyLCAyMDAsIDMyLCAzMiwgOCwgMiwgMzYsIDE4LCAwLCA1MCwgMjksIDExMywgNiwgMiwgMSwgMiwgMzcsIDIyLCAwLCAyNiwgNSwgMiwgMSwgMiwgMzEsIDE1LCAwLCAyNCwgNDMsIDI2MSwgMTgsIDE2LCAwLCAyLCAxMiwgMiwgMzMsIDEyNSwgMCwgODAsIDkyMSwgMTAzLCAxMTAsIDE4LCAxOTUsIDI2MzcsIDk2LCAxNiwgMTA3MSwgMTgsIDUsIDI2LCAzOTk0LCA2LCA1ODIsIDY4NDIsIDI5LCAxNzYzLCA1NjgsIDgsIDMwLCAxOCwgNzgsIDE4LCAyOSwgMTksIDQ3LCAxNywgMywgMzIsIDIwLCA2LCAxOCwgNDMzLCA0NCwgMjEyLCA2MywgMzMsIDI0LCAzLCAyNCwgNDUsIDc0LCA2LCAwLCA2NywgMTIsIDY1LCAxLCAyLCAwLCAxNSwgNCwgMTAsIDczODEsIDQyLCAzMSwgOTgsIDExNCwgODcwMiwgMywgMiwgNiwgMiwgMSwgMiwgMjkwLCAxNiwgMCwgMzAsIDIsIDMsIDAsIDE1LCAzLCA5LCAzOTUsIDIzMDksIDEwNiwgNiwgMTIsIDQsIDgsIDgsIDksIDU5OTEsIDg0LCAyLCA3MCwgMiwgMSwgMywgMCwgMywgMSwgMywgMywgMiwgMTEsIDIsIDAsIDIsIDYsIDIsIDY0LCAyLCAzLCAzLCA3LCAyLCA2LCAyLCAyNywgMiwgMywgMiwgNCwgMiwgMCwgNCwgNiwgMiwgMzM5LCAzLCAyNCwgMiwgMjQsIDIsIDMwLCAyLCAyNCwgMiwgMzAsIDIsIDI0LCAyLCAzMCwgMiwgMjQsIDIsIDMwLCAyLCAyNCwgMiwgNywgMTg0NSwgMzAsIDcsIDUsIDI2MiwgNjEsIDE0NywgNDQsIDExLCA2LCAxNywgMCwgMzIyLCAyOSwgMTksIDQzLCA0ODUsIDI3LCAyMjksIDI5LCAzLCAwLCAyMDgsIDMwLCAyLCAyLCAyLCAxLCAyLCA2LCAzLCA0LCAxMCwgMSwgMjI1LCA2LCAyLCAzLCAyLCAxLCAyLCAxNCwgMiwgMTk2LCA2MCwgNjcsIDgsIDAsIDEyMDUsIDMsIDIsIDI2LCAyLCAxLCAyLCAwLCAzLCAwLCAyLCA5LCAyLCAzLCAyLCAwLCAyLCAwLCA3LCAwLCA1LCAwLCAyLCAwLCAyLCAwLCAyLCAyLCAyLCAxLCAyLCAwLCAzLCAwLCAyLCAwLCAyLCAwLCAyLCAwLCAyLCAwLCAyLCAxLCAyLCAwLCAzLCAzLCAyLCA2LCAyLCAzLCAyLCAzLCAyLCAwLCAyLCA5LCAyLCAxNiwgNiwgMiwgMiwgNCwgMiwgMTYsIDQ0MjEsIDQyNzE5LCAzMywgNDM4MSwgMywgNTc3MywgMywgNzQ3MiwgMTYsIDYyMSwgMjQ2NywgNTQxLCAxNTA3LCA0OTM4LCA2LCA4NDg5XTtcblxuLy8gVGhpcyBmaWxlIHdhcyBnZW5lcmF0ZWQuIERvIG5vdCBtb2RpZnkgbWFudWFsbHkhXG52YXIgbm9uQVNDSUlpZGVudGlmaWVyQ2hhcnMgPSBcIlxcdTIwMGNcXHUyMDBkXFx4YjdcXHUwMzAwLVxcdTAzNmZcXHUwMzg3XFx1MDQ4My1cXHUwNDg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDYxMC1cXHUwNjFhXFx1MDY0Yi1cXHUwNjY5XFx1MDY3MFxcdTA2ZDYtXFx1MDZkY1xcdTA2ZGYtXFx1MDZlNFxcdTA2ZTdcXHUwNmU4XFx1MDZlYS1cXHUwNmVkXFx1MDZmMC1cXHUwNmY5XFx1MDcxMVxcdTA3MzAtXFx1MDc0YVxcdTA3YTYtXFx1MDdiMFxcdTA3YzAtXFx1MDdjOVxcdTA3ZWItXFx1MDdmM1xcdTA3ZmRcXHUwODE2LVxcdTA4MTlcXHUwODFiLVxcdTA4MjNcXHUwODI1LVxcdTA4MjdcXHUwODI5LVxcdTA4MmRcXHUwODU5LVxcdTA4NWJcXHUwODk3LVxcdTA4OWZcXHUwOGNhLVxcdTA4ZTFcXHUwOGUzLVxcdTA5MDNcXHUwOTNhLVxcdTA5M2NcXHUwOTNlLVxcdTA5NGZcXHUwOTUxLVxcdTA5NTdcXHUwOTYyXFx1MDk2M1xcdTA5NjYtXFx1MDk2ZlxcdTA5ODEtXFx1MDk4M1xcdTA5YmNcXHUwOWJlLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5Y2ItXFx1MDljZFxcdTA5ZDdcXHUwOWUyXFx1MDllM1xcdTA5ZTYtXFx1MDllZlxcdTA5ZmVcXHUwYTAxLVxcdTBhMDNcXHUwYTNjXFx1MGEzZS1cXHUwYTQyXFx1MGE0N1xcdTBhNDhcXHUwYTRiLVxcdTBhNGRcXHUwYTUxXFx1MGE2Ni1cXHUwYTcxXFx1MGE3NVxcdTBhODEtXFx1MGE4M1xcdTBhYmNcXHUwYWJlLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWUyXFx1MGFlM1xcdTBhZTYtXFx1MGFlZlxcdTBhZmEtXFx1MGFmZlxcdTBiMDEtXFx1MGIwM1xcdTBiM2NcXHUwYjNlLVxcdTBiNDRcXHUwYjQ3XFx1MGI0OFxcdTBiNGItXFx1MGI0ZFxcdTBiNTUtXFx1MGI1N1xcdTBiNjJcXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI4MlxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAwLVxcdTBjMDRcXHUwYzNjXFx1MGMzZS1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzYyXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODEtXFx1MGM4M1xcdTBjYmNcXHUwY2JlLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZTJcXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGNmM1xcdTBkMDAtXFx1MGQwM1xcdTBkM2JcXHUwZDNjXFx1MGQzZS1cXHUwZDQ0XFx1MGQ0Ni1cXHUwZDQ4XFx1MGQ0YS1cXHUwZDRkXFx1MGQ1N1xcdTBkNjJcXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ4MS1cXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGU2LVxcdTBkZWZcXHUwZGYyXFx1MGRmM1xcdTBlMzFcXHUwZTM0LVxcdTBlM2FcXHUwZTQ3LVxcdTBlNGVcXHUwZTUwLVxcdTBlNTlcXHUwZWIxXFx1MGViNC1cXHUwZWJjXFx1MGVjOC1cXHUwZWNlXFx1MGVkMC1cXHUwZWQ5XFx1MGYxOFxcdTBmMTlcXHUwZjIwLVxcdTBmMjlcXHUwZjM1XFx1MGYzN1xcdTBmMzlcXHUwZjNlXFx1MGYzZlxcdTBmNzEtXFx1MGY4NFxcdTBmODZcXHUwZjg3XFx1MGY4ZC1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMmItXFx1MTAzZVxcdTEwNDAtXFx1MTA0OVxcdTEwNTYtXFx1MTA1OVxcdTEwNWUtXFx1MTA2MFxcdTEwNjItXFx1MTA2NFxcdTEwNjctXFx1MTA2ZFxcdTEwNzEtXFx1MTA3NFxcdTEwODItXFx1MTA4ZFxcdTEwOGYtXFx1MTA5ZFxcdTEzNWQtXFx1MTM1ZlxcdTEzNjktXFx1MTM3MVxcdTE3MTItXFx1MTcxNVxcdTE3MzItXFx1MTczNFxcdTE3NTJcXHUxNzUzXFx1MTc3MlxcdTE3NzNcXHUxN2I0LVxcdTE3ZDNcXHUxN2RkXFx1MTdlMC1cXHUxN2U5XFx1MTgwYi1cXHUxODBkXFx1MTgwZi1cXHUxODE5XFx1MThhOVxcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk0ZlxcdTE5ZDAtXFx1MTlkYVxcdTFhMTctXFx1MWExYlxcdTFhNTUtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYjAtXFx1MWFiZFxcdTFhYmYtXFx1MWFkZFxcdTFhZTAtXFx1MWFlYlxcdTFiMDAtXFx1MWIwNFxcdTFiMzQtXFx1MWI0NFxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiODAtXFx1MWI4MlxcdTFiYTEtXFx1MWJhZFxcdTFiYjAtXFx1MWJiOVxcdTFiZTYtXFx1MWJmM1xcdTFjMjQtXFx1MWMzN1xcdTFjNDAtXFx1MWM0OVxcdTFjNTAtXFx1MWM1OVxcdTFjZDAtXFx1MWNkMlxcdTFjZDQtXFx1MWNlOFxcdTFjZWRcXHUxY2Y0XFx1MWNmNy1cXHUxY2Y5XFx1MWRjMC1cXHUxZGZmXFx1MjAwY1xcdTIwMGRcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MmNlZi1cXHUyY2YxXFx1MmQ3ZlxcdTJkZTAtXFx1MmRmZlxcdTMwMmEtXFx1MzAyZlxcdTMwOTlcXHUzMDlhXFx1MzBmYlxcdWE2MjAtXFx1YTYyOVxcdWE2NmZcXHVhNjc0LVxcdWE2N2RcXHVhNjllXFx1YTY5ZlxcdWE2ZjBcXHVhNmYxXFx1YTgwMlxcdWE4MDZcXHVhODBiXFx1YTgyMy1cXHVhODI3XFx1YTgyY1xcdWE4ODBcXHVhODgxXFx1YThiNC1cXHVhOGM1XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGYxXFx1YThmZi1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTk0Ny1cXHVhOTUzXFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YTlkMC1cXHVhOWQ5XFx1YTllNVxcdWE5ZjAtXFx1YTlmOVxcdWFhMjktXFx1YWEzNlxcdWFhNDNcXHVhYTRjXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2ItXFx1YWE3ZFxcdWFhYjBcXHVhYWIyLVxcdWFhYjRcXHVhYWI3XFx1YWFiOFxcdWFhYmVcXHVhYWJmXFx1YWFjMVxcdWFhZWItXFx1YWFlZlxcdWFhZjVcXHVhYWY2XFx1YWJlMy1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVmYjFlXFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTJmXFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmXFx1ZmY2NVwiO1xuXG4vLyBUaGlzIGZpbGUgd2FzIGdlbmVyYXRlZC4gRG8gbm90IG1vZGlmeSBtYW51YWxseSFcbnZhciBub25BU0NJSWlkZW50aWZpZXJTdGFydENoYXJzID0gXCJcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4NzAtXFx1MDg4N1xcdTA4ODktXFx1MDg4ZlxcdTA4YTAtXFx1MDhjOVxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzVjXFx1MGM1ZFxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RjLVxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNC1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg2LVxcdTBlOGFcXHUwZThjLVxcdTBlYTNcXHUwZWE1XFx1MGVhNy1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MTFcXHUxNzFmLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRjXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjOGFcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjNcXHUxY2Y1XFx1MWNmNlxcdTFjZmFcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmZcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYmZcXHU0ZTAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdkY1xcdWE3ZjEtXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjlcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcIjtcblxuLy8gVGhlc2UgYXJlIGEgcnVuLWxlbmd0aCBhbmQgb2Zmc2V0IGVuY29kZWQgcmVwcmVzZW50YXRpb24gb2YgdGhlXG4vLyA+MHhmZmZmIGNvZGUgcG9pbnRzIHRoYXQgYXJlIGEgdmFsaWQgcGFydCBvZiBpZGVudGlmaWVycy4gVGhlXG4vLyBvZmZzZXQgc3RhcnRzIGF0IDB4MTAwMDAsIGFuZCBlYWNoIHBhaXIgb2YgbnVtYmVycyByZXByZXNlbnRzIGFuXG4vLyBvZmZzZXQgdG8gdGhlIG5leHQgcmFuZ2UsIGFuZCB0aGVuIGEgc2l6ZSBvZiB0aGUgcmFuZ2UuXG5cbi8vIFJlc2VydmVkIHdvcmQgbGlzdHMgZm9yIHZhcmlvdXMgZGlhbGVjdHMgb2YgdGhlIGxhbmd1YWdlXG5cbnZhciByZXNlcnZlZFdvcmRzID0ge1xuICAzOiBcImFic3RyYWN0IGJvb2xlYW4gYnl0ZSBjaGFyIGNsYXNzIGRvdWJsZSBlbnVtIGV4cG9ydCBleHRlbmRzIGZpbmFsIGZsb2F0IGdvdG8gaW1wbGVtZW50cyBpbXBvcnQgaW50IGludGVyZmFjZSBsb25nIG5hdGl2ZSBwYWNrYWdlIHByaXZhdGUgcHJvdGVjdGVkIHB1YmxpYyBzaG9ydCBzdGF0aWMgc3VwZXIgc3luY2hyb25pemVkIHRocm93cyB0cmFuc2llbnQgdm9sYXRpbGVcIixcbiAgNTogXCJjbGFzcyBlbnVtIGV4dGVuZHMgc3VwZXIgY29uc3QgZXhwb3J0IGltcG9ydFwiLFxuICA2OiBcImVudW1cIixcbiAgc3RyaWN0OiBcImltcGxlbWVudHMgaW50ZXJmYWNlIGxldCBwYWNrYWdlIHByaXZhdGUgcHJvdGVjdGVkIHB1YmxpYyBzdGF0aWMgeWllbGRcIixcbiAgc3RyaWN0QmluZDogXCJldmFsIGFyZ3VtZW50c1wiXG59O1xuXG4vLyBBbmQgdGhlIGtleXdvcmRzXG5cbnZhciBlY21hNUFuZExlc3NLZXl3b3JkcyA9IFwiYnJlYWsgY2FzZSBjYXRjaCBjb250aW51ZSBkZWJ1Z2dlciBkZWZhdWx0IGRvIGVsc2UgZmluYWxseSBmb3IgZnVuY3Rpb24gaWYgcmV0dXJuIHN3aXRjaCB0aHJvdyB0cnkgdmFyIHdoaWxlIHdpdGggbnVsbCB0cnVlIGZhbHNlIGluc3RhbmNlb2YgdHlwZW9mIHZvaWQgZGVsZXRlIG5ldyBpbiB0aGlzXCI7XG5cbnZhciBrZXl3b3JkcyQxID0ge1xuICA1OiBlY21hNUFuZExlc3NLZXl3b3JkcyxcbiAgXCI1bW9kdWxlXCI6IGVjbWE1QW5kTGVzc0tleXdvcmRzICsgXCIgZXhwb3J0IGltcG9ydFwiLFxuICA2OiBlY21hNUFuZExlc3NLZXl3b3JkcyArIFwiIGNvbnN0IGNsYXNzIGV4dGVuZHMgZXhwb3J0IGltcG9ydCBzdXBlclwiXG59O1xuXG52YXIga2V5d29yZFJlbGF0aW9uYWxPcGVyYXRvciA9IC9eaW4oc3RhbmNlb2YpPyQvO1xuXG4vLyAjIyBDaGFyYWN0ZXIgY2F0ZWdvcmllc1xuXG52YXIgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnQgPSBuZXcgUmVnRXhwKFwiW1wiICsgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyArIFwiXVwiKTtcbnZhciBub25BU0NJSWlkZW50aWZpZXIgPSBuZXcgUmVnRXhwKFwiW1wiICsgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyArIG5vbkFTQ0lJaWRlbnRpZmllckNoYXJzICsgXCJdXCIpO1xuXG4vLyBUaGlzIGhhcyBhIGNvbXBsZXhpdHkgbGluZWFyIHRvIHRoZSB2YWx1ZSBvZiB0aGUgY29kZS4gVGhlXG4vLyBhc3N1bXB0aW9uIGlzIHRoYXQgbG9va2luZyB1cCBhc3RyYWwgaWRlbnRpZmllciBjaGFyYWN0ZXJzIGlzXG4vLyByYXJlLlxuZnVuY3Rpb24gaXNJbkFzdHJhbFNldChjb2RlLCBzZXQpIHtcbiAgdmFyIHBvcyA9IDB4MTAwMDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2V0Lmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcG9zICs9IHNldFtpXTtcbiAgICBpZiAocG9zID4gY29kZSkgeyByZXR1cm4gZmFsc2UgfVxuICAgIHBvcyArPSBzZXRbaSArIDFdO1xuICAgIGlmIChwb3MgPj0gY29kZSkgeyByZXR1cm4gdHJ1ZSB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8vIFRlc3Qgd2hldGhlciBhIGdpdmVuIGNoYXJhY3RlciBjb2RlIHN0YXJ0cyBhbiBpZGVudGlmaWVyLlxuXG5mdW5jdGlvbiBpc0lkZW50aWZpZXJTdGFydChjb2RlLCBhc3RyYWwpIHtcbiAgaWYgKGNvZGUgPCA2NSkgeyByZXR1cm4gY29kZSA9PT0gMzYgfVxuICBpZiAoY29kZSA8IDkxKSB7IHJldHVybiB0cnVlIH1cbiAgaWYgKGNvZGUgPCA5NykgeyByZXR1cm4gY29kZSA9PT0gOTUgfVxuICBpZiAoY29kZSA8IDEyMykgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmIChjb2RlIDw9IDB4ZmZmZikgeyByZXR1cm4gY29kZSA+PSAweGFhICYmIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0LnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSkgfVxuICBpZiAoYXN0cmFsID09PSBmYWxzZSkgeyByZXR1cm4gZmFsc2UgfVxuICByZXR1cm4gaXNJbkFzdHJhbFNldChjb2RlLCBhc3RyYWxJZGVudGlmaWVyU3RhcnRDb2Rlcylcbn1cblxuLy8gVGVzdCB3aGV0aGVyIGEgZ2l2ZW4gY2hhcmFjdGVyIGlzIHBhcnQgb2YgYW4gaWRlbnRpZmllci5cblxuZnVuY3Rpb24gaXNJZGVudGlmaWVyQ2hhcihjb2RlLCBhc3RyYWwpIHtcbiAgaWYgKGNvZGUgPCA0OCkgeyByZXR1cm4gY29kZSA9PT0gMzYgfVxuICBpZiAoY29kZSA8IDU4KSB7IHJldHVybiB0cnVlIH1cbiAgaWYgKGNvZGUgPCA2NSkgeyByZXR1cm4gZmFsc2UgfVxuICBpZiAoY29kZSA8IDkxKSB7IHJldHVybiB0cnVlIH1cbiAgaWYgKGNvZGUgPCA5NykgeyByZXR1cm4gY29kZSA9PT0gOTUgfVxuICBpZiAoY29kZSA8IDEyMykgeyByZXR1cm4gdHJ1ZSB9XG4gIGlmIChjb2RlIDw9IDB4ZmZmZikgeyByZXR1cm4gY29kZSA+PSAweGFhICYmIG5vbkFTQ0lJaWRlbnRpZmllci50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkpIH1cbiAgaWYgKGFzdHJhbCA9PT0gZmFsc2UpIHsgcmV0dXJuIGZhbHNlIH1cbiAgcmV0dXJuIGlzSW5Bc3RyYWxTZXQoY29kZSwgYXN0cmFsSWRlbnRpZmllclN0YXJ0Q29kZXMpIHx8IGlzSW5Bc3RyYWxTZXQoY29kZSwgYXN0cmFsSWRlbnRpZmllckNvZGVzKVxufVxuXG4vLyAjIyBUb2tlbiB0eXBlc1xuXG4vLyBUaGUgYXNzaWdubWVudCBvZiBmaW5lLWdyYWluZWQsIGluZm9ybWF0aW9uLWNhcnJ5aW5nIHR5cGUgb2JqZWN0c1xuLy8gYWxsb3dzIHRoZSB0b2tlbml6ZXIgdG8gc3RvcmUgdGhlIGluZm9ybWF0aW9uIGl0IGhhcyBhYm91dCBhXG4vLyB0b2tlbiBpbiBhIHdheSB0aGF0IGlzIHZlcnkgY2hlYXAgZm9yIHRoZSBwYXJzZXIgdG8gbG9vayB1cC5cblxuLy8gQWxsIHRva2VuIHR5cGUgdmFyaWFibGVzIHN0YXJ0IHdpdGggYW4gdW5kZXJzY29yZSwgdG8gbWFrZSB0aGVtXG4vLyBlYXN5IHRvIHJlY29nbml6ZS5cblxuLy8gVGhlIGBiZWZvcmVFeHByYCBwcm9wZXJ0eSBpcyB1c2VkIHRvIGRpc2FtYmlndWF0ZSBiZXR3ZWVuIHJlZ3VsYXJcbi8vIGV4cHJlc3Npb25zIGFuZCBkaXZpc2lvbnMuIEl0IGlzIHNldCBvbiBhbGwgdG9rZW4gdHlwZXMgdGhhdCBjYW5cbi8vIGJlIGZvbGxvd2VkIGJ5IGFuIGV4cHJlc3Npb24gKHRodXMsIGEgc2xhc2ggYWZ0ZXIgdGhlbSB3b3VsZCBiZSBhXG4vLyByZWd1bGFyIGV4cHJlc3Npb24pLlxuLy9cbi8vIFRoZSBgc3RhcnRzRXhwcmAgcHJvcGVydHkgaXMgdXNlZCB0byBjaGVjayBpZiB0aGUgdG9rZW4gZW5kcyBhXG4vLyBgeWllbGRgIGV4cHJlc3Npb24uIEl0IGlzIHNldCBvbiBhbGwgdG9rZW4gdHlwZXMgdGhhdCBlaXRoZXIgY2FuXG4vLyBkaXJlY3RseSBzdGFydCBhbiBleHByZXNzaW9uIChsaWtlIGEgcXVvdGF0aW9uIG1hcmspIG9yIGNhblxuLy8gY29udGludWUgYW4gZXhwcmVzc2lvbiAobGlrZSB0aGUgYm9keSBvZiBhIHN0cmluZykuXG4vL1xuLy8gYGlzTG9vcGAgbWFya3MgYSBrZXl3b3JkIGFzIHN0YXJ0aW5nIGEgbG9vcCwgd2hpY2ggaXMgaW1wb3J0YW50XG4vLyB0byBrbm93IHdoZW4gcGFyc2luZyBhIGxhYmVsLCBpbiBvcmRlciB0byBhbGxvdyBvciBkaXNhbGxvd1xuLy8gY29udGludWUganVtcHMgdG8gdGhhdCBsYWJlbC5cblxudmFyIFRva2VuVHlwZSA9IGZ1bmN0aW9uIFRva2VuVHlwZShsYWJlbCwgY29uZikge1xuICBpZiAoIGNvbmYgPT09IHZvaWQgMCApIGNvbmYgPSB7fTtcblxuICB0aGlzLmxhYmVsID0gbGFiZWw7XG4gIHRoaXMua2V5d29yZCA9IGNvbmYua2V5d29yZDtcbiAgdGhpcy5iZWZvcmVFeHByID0gISFjb25mLmJlZm9yZUV4cHI7XG4gIHRoaXMuc3RhcnRzRXhwciA9ICEhY29uZi5zdGFydHNFeHByO1xuICB0aGlzLmlzTG9vcCA9ICEhY29uZi5pc0xvb3A7XG4gIHRoaXMuaXNBc3NpZ24gPSAhIWNvbmYuaXNBc3NpZ247XG4gIHRoaXMucHJlZml4ID0gISFjb25mLnByZWZpeDtcbiAgdGhpcy5wb3N0Zml4ID0gISFjb25mLnBvc3RmaXg7XG4gIHRoaXMuYmlub3AgPSBjb25mLmJpbm9wIHx8IG51bGw7XG4gIHRoaXMudXBkYXRlQ29udGV4dCA9IG51bGw7XG59O1xuXG5mdW5jdGlvbiBiaW5vcChuYW1lLCBwcmVjKSB7XG4gIHJldHVybiBuZXcgVG9rZW5UeXBlKG5hbWUsIHtiZWZvcmVFeHByOiB0cnVlLCBiaW5vcDogcHJlY30pXG59XG52YXIgYmVmb3JlRXhwciA9IHtiZWZvcmVFeHByOiB0cnVlfSwgc3RhcnRzRXhwciA9IHtzdGFydHNFeHByOiB0cnVlfTtcblxuLy8gTWFwIGtleXdvcmQgbmFtZXMgdG8gdG9rZW4gdHlwZXMuXG5cbnZhciBrZXl3b3JkcyA9IHt9O1xuXG4vLyBTdWNjaW5jdCBkZWZpbml0aW9ucyBvZiBrZXl3b3JkIHRva2VuIHR5cGVzXG5mdW5jdGlvbiBrdyhuYW1lLCBvcHRpb25zKSB7XG4gIGlmICggb3B0aW9ucyA9PT0gdm9pZCAwICkgb3B0aW9ucyA9IHt9O1xuXG4gIG9wdGlvbnMua2V5d29yZCA9IG5hbWU7XG4gIHJldHVybiBrZXl3b3Jkc1tuYW1lXSA9IG5ldyBUb2tlblR5cGUobmFtZSwgb3B0aW9ucylcbn1cblxudmFyIHR5cGVzJDEgPSB7XG4gIG51bTogbmV3IFRva2VuVHlwZShcIm51bVwiLCBzdGFydHNFeHByKSxcbiAgcmVnZXhwOiBuZXcgVG9rZW5UeXBlKFwicmVnZXhwXCIsIHN0YXJ0c0V4cHIpLFxuICBzdHJpbmc6IG5ldyBUb2tlblR5cGUoXCJzdHJpbmdcIiwgc3RhcnRzRXhwciksXG4gIG5hbWU6IG5ldyBUb2tlblR5cGUoXCJuYW1lXCIsIHN0YXJ0c0V4cHIpLFxuICBwcml2YXRlSWQ6IG5ldyBUb2tlblR5cGUoXCJwcml2YXRlSWRcIiwgc3RhcnRzRXhwciksXG4gIGVvZjogbmV3IFRva2VuVHlwZShcImVvZlwiKSxcblxuICAvLyBQdW5jdHVhdGlvbiB0b2tlbiB0eXBlcy5cbiAgYnJhY2tldEw6IG5ldyBUb2tlblR5cGUoXCJbXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIGJyYWNrZXRSOiBuZXcgVG9rZW5UeXBlKFwiXVwiKSxcbiAgYnJhY2VMOiBuZXcgVG9rZW5UeXBlKFwie1wiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuICBicmFjZVI6IG5ldyBUb2tlblR5cGUoXCJ9XCIpLFxuICBwYXJlbkw6IG5ldyBUb2tlblR5cGUoXCIoXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIHBhcmVuUjogbmV3IFRva2VuVHlwZShcIilcIiksXG4gIGNvbW1hOiBuZXcgVG9rZW5UeXBlKFwiLFwiLCBiZWZvcmVFeHByKSxcbiAgc2VtaTogbmV3IFRva2VuVHlwZShcIjtcIiwgYmVmb3JlRXhwciksXG4gIGNvbG9uOiBuZXcgVG9rZW5UeXBlKFwiOlwiLCBiZWZvcmVFeHByKSxcbiAgZG90OiBuZXcgVG9rZW5UeXBlKFwiLlwiKSxcbiAgcXVlc3Rpb246IG5ldyBUb2tlblR5cGUoXCI/XCIsIGJlZm9yZUV4cHIpLFxuICBxdWVzdGlvbkRvdDogbmV3IFRva2VuVHlwZShcIj8uXCIpLFxuICBhcnJvdzogbmV3IFRva2VuVHlwZShcIj0+XCIsIGJlZm9yZUV4cHIpLFxuICB0ZW1wbGF0ZTogbmV3IFRva2VuVHlwZShcInRlbXBsYXRlXCIpLFxuICBpbnZhbGlkVGVtcGxhdGU6IG5ldyBUb2tlblR5cGUoXCJpbnZhbGlkVGVtcGxhdGVcIiksXG4gIGVsbGlwc2lzOiBuZXcgVG9rZW5UeXBlKFwiLi4uXCIsIGJlZm9yZUV4cHIpLFxuICBiYWNrUXVvdGU6IG5ldyBUb2tlblR5cGUoXCJgXCIsIHN0YXJ0c0V4cHIpLFxuICBkb2xsYXJCcmFjZUw6IG5ldyBUb2tlblR5cGUoXCIke1wiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgc3RhcnRzRXhwcjogdHJ1ZX0pLFxuXG4gIC8vIE9wZXJhdG9ycy4gVGhlc2UgY2Fycnkgc2V2ZXJhbCBraW5kcyBvZiBwcm9wZXJ0aWVzIHRvIGhlbHAgdGhlXG4gIC8vIHBhcnNlciB1c2UgdGhlbSBwcm9wZXJseSAodGhlIHByZXNlbmNlIG9mIHRoZXNlIHByb3BlcnRpZXMgaXNcbiAgLy8gd2hhdCBjYXRlZ29yaXplcyB0aGVtIGFzIG9wZXJhdG9ycykuXG4gIC8vXG4gIC8vIGBiaW5vcGAsIHdoZW4gcHJlc2VudCwgc3BlY2lmaWVzIHRoYXQgdGhpcyBvcGVyYXRvciBpcyBhIGJpbmFyeVxuICAvLyBvcGVyYXRvciwgYW5kIHdpbGwgcmVmZXIgdG8gaXRzIHByZWNlZGVuY2UuXG4gIC8vXG4gIC8vIGBwcmVmaXhgIGFuZCBgcG9zdGZpeGAgbWFyayB0aGUgb3BlcmF0b3IgYXMgYSBwcmVmaXggb3IgcG9zdGZpeFxuICAvLyB1bmFyeSBvcGVyYXRvci5cbiAgLy9cbiAgLy8gYGlzQXNzaWduYCBtYXJrcyBhbGwgb2YgYD1gLCBgKz1gLCBgLT1gIGV0Y2V0ZXJhLCB3aGljaCBhY3QgYXNcbiAgLy8gYmluYXJ5IG9wZXJhdG9ycyB3aXRoIGEgdmVyeSBsb3cgcHJlY2VkZW5jZSwgdGhhdCBzaG91bGQgcmVzdWx0XG4gIC8vIGluIEFzc2lnbm1lbnRFeHByZXNzaW9uIG5vZGVzLlxuXG4gIGVxOiBuZXcgVG9rZW5UeXBlKFwiPVwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgaXNBc3NpZ246IHRydWV9KSxcbiAgYXNzaWduOiBuZXcgVG9rZW5UeXBlKFwiXz1cIiwge2JlZm9yZUV4cHI6IHRydWUsIGlzQXNzaWduOiB0cnVlfSksXG4gIGluY0RlYzogbmV3IFRva2VuVHlwZShcIisrLy0tXCIsIHtwcmVmaXg6IHRydWUsIHBvc3RmaXg6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgcHJlZml4OiBuZXcgVG9rZW5UeXBlKFwiIS9+XCIsIHtiZWZvcmVFeHByOiB0cnVlLCBwcmVmaXg6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgbG9naWNhbE9SOiBiaW5vcChcInx8XCIsIDEpLFxuICBsb2dpY2FsQU5EOiBiaW5vcChcIiYmXCIsIDIpLFxuICBiaXR3aXNlT1I6IGJpbm9wKFwifFwiLCAzKSxcbiAgYml0d2lzZVhPUjogYmlub3AoXCJeXCIsIDQpLFxuICBiaXR3aXNlQU5EOiBiaW5vcChcIiZcIiwgNSksXG4gIGVxdWFsaXR5OiBiaW5vcChcIj09LyE9Lz09PS8hPT1cIiwgNiksXG4gIHJlbGF0aW9uYWw6IGJpbm9wKFwiPC8+Lzw9Lz49XCIsIDcpLFxuICBiaXRTaGlmdDogYmlub3AoXCI8PC8+Pi8+Pj5cIiwgOCksXG4gIHBsdXNNaW46IG5ldyBUb2tlblR5cGUoXCIrLy1cIiwge2JlZm9yZUV4cHI6IHRydWUsIGJpbm9wOiA5LCBwcmVmaXg6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgbW9kdWxvOiBiaW5vcChcIiVcIiwgMTApLFxuICBzdGFyOiBiaW5vcChcIipcIiwgMTApLFxuICBzbGFzaDogYmlub3AoXCIvXCIsIDEwKSxcbiAgc3RhcnN0YXI6IG5ldyBUb2tlblR5cGUoXCIqKlwiLCB7YmVmb3JlRXhwcjogdHJ1ZX0pLFxuICBjb2FsZXNjZTogYmlub3AoXCI/P1wiLCAxKSxcblxuICAvLyBLZXl3b3JkIHRva2VuIHR5cGVzLlxuICBfYnJlYWs6IGt3KFwiYnJlYWtcIiksXG4gIF9jYXNlOiBrdyhcImNhc2VcIiwgYmVmb3JlRXhwciksXG4gIF9jYXRjaDoga3coXCJjYXRjaFwiKSxcbiAgX2NvbnRpbnVlOiBrdyhcImNvbnRpbnVlXCIpLFxuICBfZGVidWdnZXI6IGt3KFwiZGVidWdnZXJcIiksXG4gIF9kZWZhdWx0OiBrdyhcImRlZmF1bHRcIiwgYmVmb3JlRXhwciksXG4gIF9kbzoga3coXCJkb1wiLCB7aXNMb29wOiB0cnVlLCBiZWZvcmVFeHByOiB0cnVlfSksXG4gIF9lbHNlOiBrdyhcImVsc2VcIiwgYmVmb3JlRXhwciksXG4gIF9maW5hbGx5OiBrdyhcImZpbmFsbHlcIiksXG4gIF9mb3I6IGt3KFwiZm9yXCIsIHtpc0xvb3A6IHRydWV9KSxcbiAgX2Z1bmN0aW9uOiBrdyhcImZ1bmN0aW9uXCIsIHN0YXJ0c0V4cHIpLFxuICBfaWY6IGt3KFwiaWZcIiksXG4gIF9yZXR1cm46IGt3KFwicmV0dXJuXCIsIGJlZm9yZUV4cHIpLFxuICBfc3dpdGNoOiBrdyhcInN3aXRjaFwiKSxcbiAgX3Rocm93OiBrdyhcInRocm93XCIsIGJlZm9yZUV4cHIpLFxuICBfdHJ5OiBrdyhcInRyeVwiKSxcbiAgX3Zhcjoga3coXCJ2YXJcIiksXG4gIF9jb25zdDoga3coXCJjb25zdFwiKSxcbiAgX3doaWxlOiBrdyhcIndoaWxlXCIsIHtpc0xvb3A6IHRydWV9KSxcbiAgX3dpdGg6IGt3KFwid2l0aFwiKSxcbiAgX25ldzoga3coXCJuZXdcIiwge2JlZm9yZUV4cHI6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgX3RoaXM6IGt3KFwidGhpc1wiLCBzdGFydHNFeHByKSxcbiAgX3N1cGVyOiBrdyhcInN1cGVyXCIsIHN0YXJ0c0V4cHIpLFxuICBfY2xhc3M6IGt3KFwiY2xhc3NcIiwgc3RhcnRzRXhwciksXG4gIF9leHRlbmRzOiBrdyhcImV4dGVuZHNcIiwgYmVmb3JlRXhwciksXG4gIF9leHBvcnQ6IGt3KFwiZXhwb3J0XCIpLFxuICBfaW1wb3J0OiBrdyhcImltcG9ydFwiLCBzdGFydHNFeHByKSxcbiAgX251bGw6IGt3KFwibnVsbFwiLCBzdGFydHNFeHByKSxcbiAgX3RydWU6IGt3KFwidHJ1ZVwiLCBzdGFydHNFeHByKSxcbiAgX2ZhbHNlOiBrdyhcImZhbHNlXCIsIHN0YXJ0c0V4cHIpLFxuICBfaW46IGt3KFwiaW5cIiwge2JlZm9yZUV4cHI6IHRydWUsIGJpbm9wOiA3fSksXG4gIF9pbnN0YW5jZW9mOiBrdyhcImluc3RhbmNlb2ZcIiwge2JlZm9yZUV4cHI6IHRydWUsIGJpbm9wOiA3fSksXG4gIF90eXBlb2Y6IGt3KFwidHlwZW9mXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBwcmVmaXg6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KSxcbiAgX3ZvaWQ6IGt3KFwidm9pZFwiLCB7YmVmb3JlRXhwcjogdHJ1ZSwgcHJlZml4OiB0cnVlLCBzdGFydHNFeHByOiB0cnVlfSksXG4gIF9kZWxldGU6IGt3KFwiZGVsZXRlXCIsIHtiZWZvcmVFeHByOiB0cnVlLCBwcmVmaXg6IHRydWUsIHN0YXJ0c0V4cHI6IHRydWV9KVxufTtcblxuLy8gTWF0Y2hlcyBhIHdob2xlIGxpbmUgYnJlYWsgKHdoZXJlIENSTEYgaXMgY29uc2lkZXJlZCBhIHNpbmdsZVxuLy8gbGluZSBicmVhaykuIFVzZWQgdG8gY291bnQgbGluZXMuXG5cbnZhciBsaW5lQnJlYWsgPSAvXFxyXFxuP3xcXG58XFx1MjAyOHxcXHUyMDI5LztcbnZhciBsaW5lQnJlYWtHID0gbmV3IFJlZ0V4cChsaW5lQnJlYWsuc291cmNlLCBcImdcIik7XG5cbmZ1bmN0aW9uIGlzTmV3TGluZShjb2RlKSB7XG4gIHJldHVybiBjb2RlID09PSAxMCB8fCBjb2RlID09PSAxMyB8fCBjb2RlID09PSAweDIwMjggfHwgY29kZSA9PT0gMHgyMDI5XG59XG5cbmZ1bmN0aW9uIG5leHRMaW5lQnJlYWsoY29kZSwgZnJvbSwgZW5kKSB7XG4gIGlmICggZW5kID09PSB2b2lkIDAgKSBlbmQgPSBjb2RlLmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gZnJvbTsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdmFyIG5leHQgPSBjb2RlLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYgKGlzTmV3TGluZShuZXh0KSlcbiAgICAgIHsgcmV0dXJuIGkgPCBlbmQgLSAxICYmIG5leHQgPT09IDEzICYmIGNvZGUuY2hhckNvZGVBdChpICsgMSkgPT09IDEwID8gaSArIDIgOiBpICsgMSB9XG4gIH1cbiAgcmV0dXJuIC0xXG59XG5cbnZhciBub25BU0NJSXdoaXRlc3BhY2UgPSAvW1xcdTE2ODBcXHUyMDAwLVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmXS87XG5cbnZhciBza2lwV2hpdGVTcGFjZSA9IC8oPzpcXHN8XFwvXFwvLip8XFwvXFwqW15dKj9cXCpcXC8pKi9nO1xuXG52YXIgcmVmID0gT2JqZWN0LnByb3RvdHlwZTtcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IHJlZi5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IHJlZi50b1N0cmluZztcblxudmFyIGhhc093biA9IE9iamVjdC5oYXNPd24gfHwgKGZ1bmN0aW9uIChvYmosIHByb3BOYW1lKSB7IHJldHVybiAoXG4gIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wTmFtZSlcbik7IH0pO1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgKGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIChcbiAgdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCJcbik7IH0pO1xuXG52YXIgcmVnZXhwQ2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG5mdW5jdGlvbiB3b3Jkc1JlZ2V4cCh3b3Jkcykge1xuICByZXR1cm4gcmVnZXhwQ2FjaGVbd29yZHNdIHx8IChyZWdleHBDYWNoZVt3b3Jkc10gPSBuZXcgUmVnRXhwKFwiXig/OlwiICsgd29yZHMucmVwbGFjZSgvIC9nLCBcInxcIikgKyBcIikkXCIpKVxufVxuXG5mdW5jdGlvbiBjb2RlUG9pbnRUb1N0cmluZyhjb2RlKSB7XG4gIC8vIFVURi0xNiBEZWNvZGluZ1xuICBpZiAoY29kZSA8PSAweEZGRkYpIHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkgfVxuICBjb2RlIC09IDB4MTAwMDA7XG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKChjb2RlID4+IDEwKSArIDB4RDgwMCwgKGNvZGUgJiAxMDIzKSArIDB4REMwMClcbn1cblxudmFyIGxvbmVTdXJyb2dhdGUgPSAvKD86W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pLztcblxuLy8gVGhlc2UgYXJlIHVzZWQgd2hlbiBgb3B0aW9ucy5sb2NhdGlvbnNgIGlzIG9uLCBmb3IgdGhlXG4vLyBgc3RhcnRMb2NgIGFuZCBgZW5kTG9jYCBwcm9wZXJ0aWVzLlxuXG52YXIgUG9zaXRpb24gPSBmdW5jdGlvbiBQb3NpdGlvbihsaW5lLCBjb2wpIHtcbiAgdGhpcy5saW5lID0gbGluZTtcbiAgdGhpcy5jb2x1bW4gPSBjb2w7XG59O1xuXG5Qb3NpdGlvbi5wcm90b3R5cGUub2Zmc2V0ID0gZnVuY3Rpb24gb2Zmc2V0IChuKSB7XG4gIHJldHVybiBuZXcgUG9zaXRpb24odGhpcy5saW5lLCB0aGlzLmNvbHVtbiArIG4pXG59O1xuXG52YXIgU291cmNlTG9jYXRpb24gPSBmdW5jdGlvbiBTb3VyY2VMb2NhdGlvbihwLCBzdGFydCwgZW5kKSB7XG4gIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgdGhpcy5lbmQgPSBlbmQ7XG4gIGlmIChwLnNvdXJjZUZpbGUgIT09IG51bGwpIHsgdGhpcy5zb3VyY2UgPSBwLnNvdXJjZUZpbGU7IH1cbn07XG5cbi8vIFRoZSBgZ2V0TGluZUluZm9gIGZ1bmN0aW9uIGlzIG1vc3RseSB1c2VmdWwgd2hlbiB0aGVcbi8vIGBsb2NhdGlvbnNgIG9wdGlvbiBpcyBvZmYgKGZvciBwZXJmb3JtYW5jZSByZWFzb25zKSBhbmQgeW91XG4vLyB3YW50IHRvIGZpbmQgdGhlIGxpbmUvY29sdW1uIHBvc2l0aW9uIGZvciBhIGdpdmVuIGNoYXJhY3RlclxuLy8gb2Zmc2V0LiBgaW5wdXRgIHNob3VsZCBiZSB0aGUgY29kZSBzdHJpbmcgdGhhdCB0aGUgb2Zmc2V0IHJlZmVyc1xuLy8gaW50by5cblxuZnVuY3Rpb24gZ2V0TGluZUluZm8oaW5wdXQsIG9mZnNldCkge1xuICBmb3IgKHZhciBsaW5lID0gMSwgY3VyID0gMDs7KSB7XG4gICAgdmFyIG5leHRCcmVhayA9IG5leHRMaW5lQnJlYWsoaW5wdXQsIGN1ciwgb2Zmc2V0KTtcbiAgICBpZiAobmV4dEJyZWFrIDwgMCkgeyByZXR1cm4gbmV3IFBvc2l0aW9uKGxpbmUsIG9mZnNldCAtIGN1cikgfVxuICAgICsrbGluZTtcbiAgICBjdXIgPSBuZXh0QnJlYWs7XG4gIH1cbn1cblxuLy8gQSBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBnaXZlbiB0byBjb25maWd1cmUgdGhlIHBhcnNlciBwcm9jZXNzLlxuLy8gVGhlc2Ugb3B0aW9ucyBhcmUgcmVjb2duaXplZCAob25seSBgZWNtYVZlcnNpb25gIGlzIHJlcXVpcmVkKTpcblxudmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAvLyBgZWNtYVZlcnNpb25gIGluZGljYXRlcyB0aGUgRUNNQVNjcmlwdCB2ZXJzaW9uIHRvIHBhcnNlLiBNdXN0IGJlXG4gIC8vIGVpdGhlciAzLCA1LCA2IChvciAyMDE1KSwgNyAoMjAxNiksIDggKDIwMTcpLCA5ICgyMDE4KSwgMTBcbiAgLy8gKDIwMTkpLCAxMSAoMjAyMCksIDEyICgyMDIxKSwgMTMgKDIwMjIpLCAxNCAoMjAyMyksIG9yIGBcImxhdGVzdFwiYFxuICAvLyAodGhlIGxhdGVzdCB2ZXJzaW9uIHRoZSBsaWJyYXJ5IHN1cHBvcnRzKS4gVGhpcyBpbmZsdWVuY2VzXG4gIC8vIHN1cHBvcnQgZm9yIHN0cmljdCBtb2RlLCB0aGUgc2V0IG9mIHJlc2VydmVkIHdvcmRzLCBhbmQgc3VwcG9ydFxuICAvLyBmb3IgbmV3IHN5bnRheCBmZWF0dXJlcy5cbiAgZWNtYVZlcnNpb246IG51bGwsXG4gIC8vIGBzb3VyY2VUeXBlYCBpbmRpY2F0ZXMgdGhlIG1vZGUgdGhlIGNvZGUgc2hvdWxkIGJlIHBhcnNlZCBpbi5cbiAgLy8gQ2FuIGJlIGVpdGhlciBgXCJzY3JpcHRcImAsIGBcIm1vZHVsZVwiYCBvciBgXCJjb21tb25qc1wiYC4gVGhpcyBpbmZsdWVuY2VzIGdsb2JhbFxuICAvLyBzdHJpY3QgbW9kZSBhbmQgcGFyc2luZyBvZiBgaW1wb3J0YCBhbmQgYGV4cG9ydGAgZGVjbGFyYXRpb25zLlxuICBzb3VyY2VUeXBlOiBcInNjcmlwdFwiLFxuICAvLyBgb25JbnNlcnRlZFNlbWljb2xvbmAgY2FuIGJlIGEgY2FsbGJhY2sgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gIC8vIGEgc2VtaWNvbG9uIGlzIGF1dG9tYXRpY2FsbHkgaW5zZXJ0ZWQuIEl0IHdpbGwgYmUgcGFzc2VkIHRoZVxuICAvLyBwb3NpdGlvbiBvZiB0aGUgaW5zZXJ0ZWQgc2VtaWNvbG9uIGFzIGFuIG9mZnNldCwgYW5kIGlmXG4gIC8vIGBsb2NhdGlvbnNgIGlzIGVuYWJsZWQsIGl0IGlzIGdpdmVuIHRoZSBsb2NhdGlvbiBhcyBhIGB7bGluZSxcbiAgLy8gY29sdW1ufWAgb2JqZWN0IGFzIHNlY29uZCBhcmd1bWVudC5cbiAgb25JbnNlcnRlZFNlbWljb2xvbjogbnVsbCxcbiAgLy8gYG9uVHJhaWxpbmdDb21tYWAgaXMgc2ltaWxhciB0byBgb25JbnNlcnRlZFNlbWljb2xvbmAsIGJ1dCBmb3JcbiAgLy8gdHJhaWxpbmcgY29tbWFzLlxuICBvblRyYWlsaW5nQ29tbWE6IG51bGwsXG4gIC8vIEJ5IGRlZmF1bHQsIHJlc2VydmVkIHdvcmRzIGFyZSBvbmx5IGVuZm9yY2VkIGlmIGVjbWFWZXJzaW9uID49IDUuXG4gIC8vIFNldCBgYWxsb3dSZXNlcnZlZGAgdG8gYSBib29sZWFuIHZhbHVlIHRvIGV4cGxpY2l0bHkgdHVybiB0aGlzIG9uXG4gIC8vIGFuIG9mZi4gV2hlbiB0aGlzIG9wdGlvbiBoYXMgdGhlIHZhbHVlIFwibmV2ZXJcIiwgcmVzZXJ2ZWQgd29yZHNcbiAgLy8gYW5kIGtleXdvcmRzIGNhbiBhbHNvIG5vdCBiZSB1c2VkIGFzIHByb3BlcnR5IG5hbWVzLlxuICBhbGxvd1Jlc2VydmVkOiBudWxsLFxuICAvLyBXaGVuIGVuYWJsZWQsIGEgcmV0dXJuIGF0IHRoZSB0b3AgbGV2ZWwgaXMgbm90IGNvbnNpZGVyZWQgYW5cbiAgLy8gZXJyb3IuXG4gIGFsbG93UmV0dXJuT3V0c2lkZUZ1bmN0aW9uOiBmYWxzZSxcbiAgLy8gV2hlbiBlbmFibGVkLCBpbXBvcnQvZXhwb3J0IHN0YXRlbWVudHMgYXJlIG5vdCBjb25zdHJhaW5lZCB0b1xuICAvLyBhcHBlYXJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgcHJvZ3JhbSwgYW5kIGFuIGltcG9ydC5tZXRhIGV4cHJlc3Npb25cbiAgLy8gaW4gYSBzY3JpcHQgaXNuJ3QgY29uc2lkZXJlZCBhbiBlcnJvci5cbiAgYWxsb3dJbXBvcnRFeHBvcnRFdmVyeXdoZXJlOiBmYWxzZSxcbiAgLy8gQnkgZGVmYXVsdCwgYXdhaXQgaWRlbnRpZmllcnMgYXJlIGFsbG93ZWQgdG8gYXBwZWFyIGF0IHRoZSB0b3AtbGV2ZWwgc2NvcGUgb25seSBpZiBlY21hVmVyc2lvbiA+PSAyMDIyLlxuICAvLyBXaGVuIGVuYWJsZWQsIGF3YWl0IGlkZW50aWZpZXJzIGFyZSBhbGxvd2VkIHRvIGFwcGVhciBhdCB0aGUgdG9wLWxldmVsIHNjb3BlLFxuICAvLyBidXQgdGhleSBhcmUgc3RpbGwgbm90IGFsbG93ZWQgaW4gbm9uLWFzeW5jIGZ1bmN0aW9ucy5cbiAgYWxsb3dBd2FpdE91dHNpZGVGdW5jdGlvbjogbnVsbCxcbiAgLy8gV2hlbiBlbmFibGVkLCBzdXBlciBpZGVudGlmaWVycyBhcmUgbm90IGNvbnN0cmFpbmVkIHRvXG4gIC8vIGFwcGVhcmluZyBpbiBtZXRob2RzIGFuZCBkbyBub3QgcmFpc2UgYW4gZXJyb3Igd2hlbiB0aGV5IGFwcGVhciBlbHNld2hlcmUuXG4gIGFsbG93U3VwZXJPdXRzaWRlTWV0aG9kOiBudWxsLFxuICAvLyBXaGVuIGVuYWJsZWQsIGhhc2hiYW5nIGRpcmVjdGl2ZSBpbiB0aGUgYmVnaW5uaW5nIG9mIGZpbGUgaXNcbiAgLy8gYWxsb3dlZCBhbmQgdHJlYXRlZCBhcyBhIGxpbmUgY29tbWVudC4gRW5hYmxlZCBieSBkZWZhdWx0IHdoZW5cbiAgLy8gYGVjbWFWZXJzaW9uYCA+PSAyMDIzLlxuICBhbGxvd0hhc2hCYW5nOiBmYWxzZSxcbiAgLy8gQnkgZGVmYXVsdCwgdGhlIHBhcnNlciB3aWxsIHZlcmlmeSB0aGF0IHByaXZhdGUgcHJvcGVydGllcyBhcmVcbiAgLy8gb25seSB1c2VkIGluIHBsYWNlcyB3aGVyZSB0aGV5IGFyZSB2YWxpZCBhbmQgaGF2ZSBiZWVuIGRlY2xhcmVkLlxuICAvLyBTZXQgdGhpcyB0byBmYWxzZSB0byB0dXJuIHN1Y2ggY2hlY2tzIG9mZi5cbiAgY2hlY2tQcml2YXRlRmllbGRzOiB0cnVlLFxuICAvLyBXaGVuIGBsb2NhdGlvbnNgIGlzIG9uLCBgbG9jYCBwcm9wZXJ0aWVzIGhvbGRpbmcgb2JqZWN0cyB3aXRoXG4gIC8vIGBzdGFydGAgYW5kIGBlbmRgIHByb3BlcnRpZXMgaW4gYHtsaW5lLCBjb2x1bW59YCBmb3JtICh3aXRoXG4gIC8vIGxpbmUgYmVpbmcgMS1iYXNlZCBhbmQgY29sdW1uIDAtYmFzZWQpIHdpbGwgYmUgYXR0YWNoZWQgdG8gdGhlXG4gIC8vIG5vZGVzLlxuICBsb2NhdGlvbnM6IGZhbHNlLFxuICAvLyBBIGZ1bmN0aW9uIGNhbiBiZSBwYXNzZWQgYXMgYG9uVG9rZW5gIG9wdGlvbiwgd2hpY2ggd2lsbFxuICAvLyBjYXVzZSBBY29ybiB0byBjYWxsIHRoYXQgZnVuY3Rpb24gd2l0aCBvYmplY3QgaW4gdGhlIHNhbWVcbiAgLy8gZm9ybWF0IGFzIHRva2VucyByZXR1cm5lZCBmcm9tIGB0b2tlbml6ZXIoKS5nZXRUb2tlbigpYC4gTm90ZVxuICAvLyB0aGF0IHlvdSBhcmUgbm90IGFsbG93ZWQgdG8gY2FsbCB0aGUgcGFyc2VyIGZyb20gdGhlXG4gIC8vIGNhbGxiYWNrXHUyMDE0dGhhdCB3aWxsIGNvcnJ1cHQgaXRzIGludGVybmFsIHN0YXRlLlxuICBvblRva2VuOiBudWxsLFxuICAvLyBBIGZ1bmN0aW9uIGNhbiBiZSBwYXNzZWQgYXMgYG9uQ29tbWVudGAgb3B0aW9uLCB3aGljaCB3aWxsXG4gIC8vIGNhdXNlIEFjb3JuIHRvIGNhbGwgdGhhdCBmdW5jdGlvbiB3aXRoIGAoYmxvY2ssIHRleHQsIHN0YXJ0LFxuICAvLyBlbmQpYCBwYXJhbWV0ZXJzIHdoZW5ldmVyIGEgY29tbWVudCBpcyBza2lwcGVkLiBgYmxvY2tgIGlzIGFcbiAgLy8gYm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdGhpcyBpcyBhIGJsb2NrIChgLyogKi9gKSBjb21tZW50LFxuICAvLyBgdGV4dGAgaXMgdGhlIGNvbnRlbnQgb2YgdGhlIGNvbW1lbnQsIGFuZCBgc3RhcnRgIGFuZCBgZW5kYCBhcmVcbiAgLy8gY2hhcmFjdGVyIG9mZnNldHMgdGhhdCBkZW5vdGUgdGhlIHN0YXJ0IGFuZCBlbmQgb2YgdGhlIGNvbW1lbnQuXG4gIC8vIFdoZW4gdGhlIGBsb2NhdGlvbnNgIG9wdGlvbiBpcyBvbiwgdHdvIG1vcmUgcGFyYW1ldGVycyBhcmVcbiAgLy8gcGFzc2VkLCB0aGUgZnVsbCBge2xpbmUsIGNvbHVtbn1gIGxvY2F0aW9ucyBvZiB0aGUgc3RhcnQgYW5kXG4gIC8vIGVuZCBvZiB0aGUgY29tbWVudHMuIE5vdGUgdGhhdCB5b3UgYXJlIG5vdCBhbGxvd2VkIHRvIGNhbGwgdGhlXG4gIC8vIHBhcnNlciBmcm9tIHRoZSBjYWxsYmFja1x1MjAxNHRoYXQgd2lsbCBjb3JydXB0IGl0cyBpbnRlcm5hbCBzdGF0ZS5cbiAgLy8gV2hlbiB0aGlzIG9wdGlvbiBoYXMgYW4gYXJyYXkgYXMgdmFsdWUsIG9iamVjdHMgcmVwcmVzZW50aW5nIHRoZVxuICAvLyBjb21tZW50cyBhcmUgcHVzaGVkIHRvIGl0LlxuICBvbkNvbW1lbnQ6IG51bGwsXG4gIC8vIE5vZGVzIGhhdmUgdGhlaXIgc3RhcnQgYW5kIGVuZCBjaGFyYWN0ZXJzIG9mZnNldHMgcmVjb3JkZWQgaW5cbiAgLy8gYHN0YXJ0YCBhbmQgYGVuZGAgcHJvcGVydGllcyAoZGlyZWN0bHkgb24gdGhlIG5vZGUsIHJhdGhlciB0aGFuXG4gIC8vIHRoZSBgbG9jYCBvYmplY3QsIHdoaWNoIGhvbGRzIGxpbmUvY29sdW1uIGRhdGEuIFRvIGFsc28gYWRkIGFcbiAgLy8gW3NlbWktc3RhbmRhcmRpemVkXVtyYW5nZV0gYHJhbmdlYCBwcm9wZXJ0eSBob2xkaW5nIGEgYFtzdGFydCxcbiAgLy8gZW5kXWAgYXJyYXkgd2l0aCB0aGUgc2FtZSBudW1iZXJzLCBzZXQgdGhlIGByYW5nZXNgIG9wdGlvbiB0b1xuICAvLyBgdHJ1ZWAuXG4gIC8vXG4gIC8vIFtyYW5nZV06IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTc0NTY3OFxuICByYW5nZXM6IGZhbHNlLFxuICAvLyBJdCBpcyBwb3NzaWJsZSB0byBwYXJzZSBtdWx0aXBsZSBmaWxlcyBpbnRvIGEgc2luZ2xlIEFTVCBieVxuICAvLyBwYXNzaW5nIHRoZSB0cmVlIHByb2R1Y2VkIGJ5IHBhcnNpbmcgdGhlIGZpcnN0IGZpbGUgYXNcbiAgLy8gYHByb2dyYW1gIG9wdGlvbiBpbiBzdWJzZXF1ZW50IHBhcnNlcy4gVGhpcyB3aWxsIGFkZCB0aGVcbiAgLy8gdG9wbGV2ZWwgZm9ybXMgb2YgdGhlIHBhcnNlZCBmaWxlIHRvIHRoZSBgUHJvZ3JhbWAgKHRvcCkgbm9kZVxuICAvLyBvZiBhbiBleGlzdGluZyBwYXJzZSB0cmVlLlxuICBwcm9ncmFtOiBudWxsLFxuICAvLyBXaGVuIGBsb2NhdGlvbnNgIGlzIG9uLCB5b3UgY2FuIHBhc3MgdGhpcyB0byByZWNvcmQgdGhlIHNvdXJjZVxuICAvLyBmaWxlIGluIGV2ZXJ5IG5vZGUncyBgbG9jYCBvYmplY3QuXG4gIHNvdXJjZUZpbGU6IG51bGwsXG4gIC8vIFRoaXMgdmFsdWUsIGlmIGdpdmVuLCBpcyBzdG9yZWQgaW4gZXZlcnkgbm9kZSwgd2hldGhlclxuICAvLyBgbG9jYXRpb25zYCBpcyBvbiBvciBvZmYuXG4gIGRpcmVjdFNvdXJjZUZpbGU6IG51bGwsXG4gIC8vIFdoZW4gZW5hYmxlZCwgcGFyZW50aGVzaXplZCBleHByZXNzaW9ucyBhcmUgcmVwcmVzZW50ZWQgYnlcbiAgLy8gKG5vbi1zdGFuZGFyZCkgUGFyZW50aGVzaXplZEV4cHJlc3Npb24gbm9kZXNcbiAgcHJlc2VydmVQYXJlbnM6IGZhbHNlXG59O1xuXG4vLyBJbnRlcnByZXQgYW5kIGRlZmF1bHQgYW4gb3B0aW9ucyBvYmplY3RcblxudmFyIHdhcm5lZEFib3V0RWNtYVZlcnNpb24gPSBmYWxzZTtcblxuZnVuY3Rpb24gZ2V0T3B0aW9ucyhvcHRzKSB7XG4gIHZhciBvcHRpb25zID0ge307XG5cbiAgZm9yICh2YXIgb3B0IGluIGRlZmF1bHRPcHRpb25zKVxuICAgIHsgb3B0aW9uc1tvcHRdID0gb3B0cyAmJiBoYXNPd24ob3B0cywgb3B0KSA/IG9wdHNbb3B0XSA6IGRlZmF1bHRPcHRpb25zW29wdF07IH1cblxuICBpZiAob3B0aW9ucy5lY21hVmVyc2lvbiA9PT0gXCJsYXRlc3RcIikge1xuICAgIG9wdGlvbnMuZWNtYVZlcnNpb24gPSAxZTg7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5lY21hVmVyc2lvbiA9PSBudWxsKSB7XG4gICAgaWYgKCF3YXJuZWRBYm91dEVjbWFWZXJzaW9uICYmIHR5cGVvZiBjb25zb2xlID09PSBcIm9iamVjdFwiICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgd2FybmVkQWJvdXRFY21hVmVyc2lvbiA9IHRydWU7XG4gICAgICBjb25zb2xlLndhcm4oXCJTaW5jZSBBY29ybiA4LjAuMCwgb3B0aW9ucy5lY21hVmVyc2lvbiBpcyByZXF1aXJlZC5cXG5EZWZhdWx0aW5nIHRvIDIwMjAsIGJ1dCB0aGlzIHdpbGwgc3RvcCB3b3JraW5nIGluIHRoZSBmdXR1cmUuXCIpO1xuICAgIH1cbiAgICBvcHRpb25zLmVjbWFWZXJzaW9uID0gMTE7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5lY21hVmVyc2lvbiA+PSAyMDE1KSB7XG4gICAgb3B0aW9ucy5lY21hVmVyc2lvbiAtPSAyMDA5O1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuYWxsb3dSZXNlcnZlZCA9PSBudWxsKVxuICAgIHsgb3B0aW9ucy5hbGxvd1Jlc2VydmVkID0gb3B0aW9ucy5lY21hVmVyc2lvbiA8IDU7IH1cblxuICBpZiAoIW9wdHMgfHwgb3B0cy5hbGxvd0hhc2hCYW5nID09IG51bGwpXG4gICAgeyBvcHRpb25zLmFsbG93SGFzaEJhbmcgPSBvcHRpb25zLmVjbWFWZXJzaW9uID49IDE0OyB9XG5cbiAgaWYgKGlzQXJyYXkob3B0aW9ucy5vblRva2VuKSkge1xuICAgIHZhciB0b2tlbnMgPSBvcHRpb25zLm9uVG9rZW47XG4gICAgb3B0aW9ucy5vblRva2VuID0gZnVuY3Rpb24gKHRva2VuKSB7IHJldHVybiB0b2tlbnMucHVzaCh0b2tlbik7IH07XG4gIH1cbiAgaWYgKGlzQXJyYXkob3B0aW9ucy5vbkNvbW1lbnQpKVxuICAgIHsgb3B0aW9ucy5vbkNvbW1lbnQgPSBwdXNoQ29tbWVudChvcHRpb25zLCBvcHRpb25zLm9uQ29tbWVudCk7IH1cblxuICBpZiAob3B0aW9ucy5zb3VyY2VUeXBlID09PSBcImNvbW1vbmpzXCIgJiYgb3B0aW9ucy5hbGxvd0F3YWl0T3V0c2lkZUZ1bmN0aW9uKVxuICAgIHsgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHVzZSBhbGxvd0F3YWl0T3V0c2lkZUZ1bmN0aW9uIHdpdGggc291cmNlVHlwZTogY29tbW9uanNcIikgfVxuXG4gIHJldHVybiBvcHRpb25zXG59XG5cbmZ1bmN0aW9uIHB1c2hDb21tZW50KG9wdGlvbnMsIGFycmF5KSB7XG4gIHJldHVybiBmdW5jdGlvbihibG9jaywgdGV4dCwgc3RhcnQsIGVuZCwgc3RhcnRMb2MsIGVuZExvYykge1xuICAgIHZhciBjb21tZW50ID0ge1xuICAgICAgdHlwZTogYmxvY2sgPyBcIkJsb2NrXCIgOiBcIkxpbmVcIixcbiAgICAgIHZhbHVlOiB0ZXh0LFxuICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgZW5kOiBlbmRcbiAgICB9O1xuICAgIGlmIChvcHRpb25zLmxvY2F0aW9ucylcbiAgICAgIHsgY29tbWVudC5sb2MgPSBuZXcgU291cmNlTG9jYXRpb24odGhpcywgc3RhcnRMb2MsIGVuZExvYyk7IH1cbiAgICBpZiAob3B0aW9ucy5yYW5nZXMpXG4gICAgICB7IGNvbW1lbnQucmFuZ2UgPSBbc3RhcnQsIGVuZF07IH1cbiAgICBhcnJheS5wdXNoKGNvbW1lbnQpO1xuICB9XG59XG5cbi8vIEVhY2ggc2NvcGUgZ2V0cyBhIGJpdHNldCB0aGF0IG1heSBjb250YWluIHRoZXNlIGZsYWdzXG52YXJcbiAgICBTQ09QRV9UT1AgPSAxLFxuICAgIFNDT1BFX0ZVTkNUSU9OID0gMixcbiAgICBTQ09QRV9BU1lOQyA9IDQsXG4gICAgU0NPUEVfR0VORVJBVE9SID0gOCxcbiAgICBTQ09QRV9BUlJPVyA9IDE2LFxuICAgIFNDT1BFX1NJTVBMRV9DQVRDSCA9IDMyLFxuICAgIFNDT1BFX1NVUEVSID0gNjQsXG4gICAgU0NPUEVfRElSRUNUX1NVUEVSID0gMTI4LFxuICAgIFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSyA9IDI1NixcbiAgICBTQ09QRV9DTEFTU19GSUVMRF9JTklUID0gNTEyLFxuICAgIFNDT1BFX1NXSVRDSCA9IDEwMjQsXG4gICAgU0NPUEVfVkFSID0gU0NPUEVfVE9QIHwgU0NPUEVfRlVOQ1RJT04gfCBTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0s7XG5cbmZ1bmN0aW9uIGZ1bmN0aW9uRmxhZ3MoYXN5bmMsIGdlbmVyYXRvcikge1xuICByZXR1cm4gU0NPUEVfRlVOQ1RJT04gfCAoYXN5bmMgPyBTQ09QRV9BU1lOQyA6IDApIHwgKGdlbmVyYXRvciA/IFNDT1BFX0dFTkVSQVRPUiA6IDApXG59XG5cbi8vIFVzZWQgaW4gY2hlY2tMVmFsKiBhbmQgZGVjbGFyZU5hbWUgdG8gZGV0ZXJtaW5lIHRoZSB0eXBlIG9mIGEgYmluZGluZ1xudmFyXG4gICAgQklORF9OT05FID0gMCwgLy8gTm90IGEgYmluZGluZ1xuICAgIEJJTkRfVkFSID0gMSwgLy8gVmFyLXN0eWxlIGJpbmRpbmdcbiAgICBCSU5EX0xFWElDQUwgPSAyLCAvLyBMZXQtIG9yIGNvbnN0LXN0eWxlIGJpbmRpbmdcbiAgICBCSU5EX0ZVTkNUSU9OID0gMywgLy8gRnVuY3Rpb24gZGVjbGFyYXRpb25cbiAgICBCSU5EX1NJTVBMRV9DQVRDSCA9IDQsIC8vIFNpbXBsZSAoaWRlbnRpZmllciBwYXR0ZXJuKSBjYXRjaCBiaW5kaW5nXG4gICAgQklORF9PVVRTSURFID0gNTsgLy8gU3BlY2lhbCBjYXNlIGZvciBmdW5jdGlvbiBuYW1lcyBhcyBib3VuZCBpbnNpZGUgdGhlIGZ1bmN0aW9uXG5cbnZhciBQYXJzZXIgPSBmdW5jdGlvbiBQYXJzZXIob3B0aW9ucywgaW5wdXQsIHN0YXJ0UG9zKSB7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgPSBnZXRPcHRpb25zKG9wdGlvbnMpO1xuICB0aGlzLnNvdXJjZUZpbGUgPSBvcHRpb25zLnNvdXJjZUZpbGU7XG4gIHRoaXMua2V5d29yZHMgPSB3b3Jkc1JlZ2V4cChrZXl3b3JkcyQxW29wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiA/IDYgOiBvcHRpb25zLnNvdXJjZVR5cGUgPT09IFwibW9kdWxlXCIgPyBcIjVtb2R1bGVcIiA6IDVdKTtcbiAgdmFyIHJlc2VydmVkID0gXCJcIjtcbiAgaWYgKG9wdGlvbnMuYWxsb3dSZXNlcnZlZCAhPT0gdHJ1ZSkge1xuICAgIHJlc2VydmVkID0gcmVzZXJ2ZWRXb3Jkc1tvcHRpb25zLmVjbWFWZXJzaW9uID49IDYgPyA2IDogb3B0aW9ucy5lY21hVmVyc2lvbiA9PT0gNSA/IDUgOiAzXTtcbiAgICBpZiAob3B0aW9ucy5zb3VyY2VUeXBlID09PSBcIm1vZHVsZVwiKSB7IHJlc2VydmVkICs9IFwiIGF3YWl0XCI7IH1cbiAgfVxuICB0aGlzLnJlc2VydmVkV29yZHMgPSB3b3Jkc1JlZ2V4cChyZXNlcnZlZCk7XG4gIHZhciByZXNlcnZlZFN0cmljdCA9IChyZXNlcnZlZCA/IHJlc2VydmVkICsgXCIgXCIgOiBcIlwiKSArIHJlc2VydmVkV29yZHMuc3RyaWN0O1xuICB0aGlzLnJlc2VydmVkV29yZHNTdHJpY3QgPSB3b3Jkc1JlZ2V4cChyZXNlcnZlZFN0cmljdCk7XG4gIHRoaXMucmVzZXJ2ZWRXb3Jkc1N0cmljdEJpbmQgPSB3b3Jkc1JlZ2V4cChyZXNlcnZlZFN0cmljdCArIFwiIFwiICsgcmVzZXJ2ZWRXb3Jkcy5zdHJpY3RCaW5kKTtcbiAgdGhpcy5pbnB1dCA9IFN0cmluZyhpbnB1dCk7XG5cbiAgLy8gVXNlZCB0byBzaWduYWwgdG8gY2FsbGVycyBvZiBgcmVhZFdvcmQxYCB3aGV0aGVyIHRoZSB3b3JkXG4gIC8vIGNvbnRhaW5lZCBhbnkgZXNjYXBlIHNlcXVlbmNlcy4gVGhpcyBpcyBuZWVkZWQgYmVjYXVzZSB3b3JkcyB3aXRoXG4gIC8vIGVzY2FwZSBzZXF1ZW5jZXMgbXVzdCBub3QgYmUgaW50ZXJwcmV0ZWQgYXMga2V5d29yZHMuXG4gIHRoaXMuY29udGFpbnNFc2MgPSBmYWxzZTtcblxuICAvLyBTZXQgdXAgdG9rZW4gc3RhdGVcblxuICAvLyBUaGUgY3VycmVudCBwb3NpdGlvbiBvZiB0aGUgdG9rZW5pemVyIGluIHRoZSBpbnB1dC5cbiAgaWYgKHN0YXJ0UG9zKSB7XG4gICAgdGhpcy5wb3MgPSBzdGFydFBvcztcbiAgICB0aGlzLmxpbmVTdGFydCA9IHRoaXMuaW5wdXQubGFzdEluZGV4T2YoXCJcXG5cIiwgc3RhcnRQb3MgLSAxKSArIDE7XG4gICAgdGhpcy5jdXJMaW5lID0gdGhpcy5pbnB1dC5zbGljZSgwLCB0aGlzLmxpbmVTdGFydCkuc3BsaXQobGluZUJyZWFrKS5sZW5ndGg7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wb3MgPSB0aGlzLmxpbmVTdGFydCA9IDA7XG4gICAgdGhpcy5jdXJMaW5lID0gMTtcbiAgfVxuXG4gIC8vIFByb3BlcnRpZXMgb2YgdGhlIGN1cnJlbnQgdG9rZW46XG4gIC8vIEl0cyB0eXBlXG4gIHRoaXMudHlwZSA9IHR5cGVzJDEuZW9mO1xuICAvLyBGb3IgdG9rZW5zIHRoYXQgaW5jbHVkZSBtb3JlIGluZm9ybWF0aW9uIHRoYW4gdGhlaXIgdHlwZSwgdGhlIHZhbHVlXG4gIHRoaXMudmFsdWUgPSBudWxsO1xuICAvLyBJdHMgc3RhcnQgYW5kIGVuZCBvZmZzZXRcbiAgdGhpcy5zdGFydCA9IHRoaXMuZW5kID0gdGhpcy5wb3M7XG4gIC8vIEFuZCwgaWYgbG9jYXRpb25zIGFyZSB1c2VkLCB0aGUge2xpbmUsIGNvbHVtbn0gb2JqZWN0XG4gIC8vIGNvcnJlc3BvbmRpbmcgdG8gdGhvc2Ugb2Zmc2V0c1xuICB0aGlzLnN0YXJ0TG9jID0gdGhpcy5lbmRMb2MgPSB0aGlzLmN1clBvc2l0aW9uKCk7XG5cbiAgLy8gUG9zaXRpb24gaW5mb3JtYXRpb24gZm9yIHRoZSBwcmV2aW91cyB0b2tlblxuICB0aGlzLmxhc3RUb2tFbmRMb2MgPSB0aGlzLmxhc3RUb2tTdGFydExvYyA9IG51bGw7XG4gIHRoaXMubGFzdFRva1N0YXJ0ID0gdGhpcy5sYXN0VG9rRW5kID0gdGhpcy5wb3M7XG5cbiAgLy8gVGhlIGNvbnRleHQgc3RhY2sgaXMgdXNlZCB0byBzdXBlcmZpY2lhbGx5IHRyYWNrIHN5bnRhY3RpY1xuICAvLyBjb250ZXh0IHRvIHByZWRpY3Qgd2hldGhlciBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBpcyBhbGxvd2VkIGluIGFcbiAgLy8gZ2l2ZW4gcG9zaXRpb24uXG4gIHRoaXMuY29udGV4dCA9IHRoaXMuaW5pdGlhbENvbnRleHQoKTtcbiAgdGhpcy5leHByQWxsb3dlZCA9IHRydWU7XG5cbiAgLy8gRmlndXJlIG91dCBpZiBpdCdzIGEgbW9kdWxlIGNvZGUuXG4gIHRoaXMuaW5Nb2R1bGUgPSBvcHRpb25zLnNvdXJjZVR5cGUgPT09IFwibW9kdWxlXCI7XG4gIHRoaXMuc3RyaWN0ID0gdGhpcy5pbk1vZHVsZSB8fCB0aGlzLnN0cmljdERpcmVjdGl2ZSh0aGlzLnBvcyk7XG5cbiAgLy8gVXNlZCB0byBzaWduaWZ5IHRoZSBzdGFydCBvZiBhIHBvdGVudGlhbCBhcnJvdyBmdW5jdGlvblxuICB0aGlzLnBvdGVudGlhbEFycm93QXQgPSAtMTtcbiAgdGhpcy5wb3RlbnRpYWxBcnJvd0luRm9yQXdhaXQgPSBmYWxzZTtcblxuICAvLyBQb3NpdGlvbnMgdG8gZGVsYXllZC1jaGVjayB0aGF0IHlpZWxkL2F3YWl0IGRvZXMgbm90IGV4aXN0IGluIGRlZmF1bHQgcGFyYW1ldGVycy5cbiAgdGhpcy55aWVsZFBvcyA9IHRoaXMuYXdhaXRQb3MgPSB0aGlzLmF3YWl0SWRlbnRQb3MgPSAwO1xuICAvLyBMYWJlbHMgaW4gc2NvcGUuXG4gIHRoaXMubGFiZWxzID0gW107XG4gIC8vIFRodXMtZmFyIHVuZGVmaW5lZCBleHBvcnRzLlxuICB0aGlzLnVuZGVmaW5lZEV4cG9ydHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8vIElmIGVuYWJsZWQsIHNraXAgbGVhZGluZyBoYXNoYmFuZyBsaW5lLlxuICBpZiAodGhpcy5wb3MgPT09IDAgJiYgb3B0aW9ucy5hbGxvd0hhc2hCYW5nICYmIHRoaXMuaW5wdXQuc2xpY2UoMCwgMikgPT09IFwiIyFcIilcbiAgICB7IHRoaXMuc2tpcExpbmVDb21tZW50KDIpOyB9XG5cbiAgLy8gU2NvcGUgdHJhY2tpbmcgZm9yIGR1cGxpY2F0ZSB2YXJpYWJsZSBuYW1lcyAoc2VlIHNjb3BlLmpzKVxuICB0aGlzLnNjb3BlU3RhY2sgPSBbXTtcbiAgdGhpcy5lbnRlclNjb3BlKFxuICAgIHRoaXMub3B0aW9ucy5zb3VyY2VUeXBlID09PSBcImNvbW1vbmpzXCJcbiAgICAgIC8vIEluIGNvbW1vbmpzLCB0aGUgdG9wLWxldmVsIHNjb3BlIGJlaGF2ZXMgbGlrZSBhIGZ1bmN0aW9uIHNjb3BlXG4gICAgICA/IFNDT1BFX0ZVTkNUSU9OXG4gICAgICA6IFNDT1BFX1RPUFxuICApO1xuXG4gIC8vIEZvciBSZWdFeHAgdmFsaWRhdGlvblxuICB0aGlzLnJlZ2V4cFN0YXRlID0gbnVsbDtcblxuICAvLyBUaGUgc3RhY2sgb2YgcHJpdmF0ZSBuYW1lcy5cbiAgLy8gRWFjaCBlbGVtZW50IGhhcyB0d28gcHJvcGVydGllczogJ2RlY2xhcmVkJyBhbmQgJ3VzZWQnLlxuICAvLyBXaGVuIGl0IGV4aXRlZCBmcm9tIHRoZSBvdXRlcm1vc3QgY2xhc3MgZGVmaW5pdGlvbiwgYWxsIHVzZWQgcHJpdmF0ZSBuYW1lcyBtdXN0IGJlIGRlY2xhcmVkLlxuICB0aGlzLnByaXZhdGVOYW1lU3RhY2sgPSBbXTtcbn07XG5cbnZhciBwcm90b3R5cGVBY2Nlc3NvcnMgPSB7IGluRnVuY3Rpb246IHsgY29uZmlndXJhYmxlOiB0cnVlIH0saW5HZW5lcmF0b3I6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0saW5Bc3luYzogeyBjb25maWd1cmFibGU6IHRydWUgfSxjYW5Bd2FpdDogeyBjb25maWd1cmFibGU6IHRydWUgfSxhbGxvd1JldHVybjogeyBjb25maWd1cmFibGU6IHRydWUgfSxhbGxvd1N1cGVyOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGFsbG93RGlyZWN0U3VwZXI6IHsgY29uZmlndXJhYmxlOiB0cnVlIH0sdHJlYXRGdW5jdGlvbnNBc1ZhcjogeyBjb25maWd1cmFibGU6IHRydWUgfSxhbGxvd05ld0RvdFRhcmdldDogeyBjb25maWd1cmFibGU6IHRydWUgfSxhbGxvd1VzaW5nOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LGluQ2xhc3NTdGF0aWNCbG9jazogeyBjb25maWd1cmFibGU6IHRydWUgfSB9O1xuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKCkge1xuICB2YXIgbm9kZSA9IHRoaXMub3B0aW9ucy5wcm9ncmFtIHx8IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dFRva2VuKCk7XG4gIHJldHVybiB0aGlzLnBhcnNlVG9wTGV2ZWwobm9kZSlcbn07XG5cbnByb3RvdHlwZUFjY2Vzc29ycy5pbkZ1bmN0aW9uLmdldCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICh0aGlzLmN1cnJlbnRWYXJTY29wZSgpLmZsYWdzICYgU0NPUEVfRlVOQ1RJT04pID4gMCB9O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuaW5HZW5lcmF0b3IuZ2V0ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gKHRoaXMuY3VycmVudFZhclNjb3BlKCkuZmxhZ3MgJiBTQ09QRV9HRU5FUkFUT1IpID4gMCB9O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuaW5Bc3luYy5nZXQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAodGhpcy5jdXJyZW50VmFyU2NvcGUoKS5mbGFncyAmIFNDT1BFX0FTWU5DKSA+IDAgfTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmNhbkF3YWl0LmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgaSA9IHRoaXMuc2NvcGVTdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciByZWYgPSB0aGlzLnNjb3BlU3RhY2tbaV07XG4gICAgICB2YXIgZmxhZ3MgPSByZWYuZmxhZ3M7XG4gICAgaWYgKGZsYWdzICYgKFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSyB8IFNDT1BFX0NMQVNTX0ZJRUxEX0lOSVQpKSB7IHJldHVybiBmYWxzZSB9XG4gICAgaWYgKGZsYWdzICYgU0NPUEVfRlVOQ1RJT04pIHsgcmV0dXJuIChmbGFncyAmIFNDT1BFX0FTWU5DKSA+IDAgfVxuICB9XG4gIHJldHVybiAodGhpcy5pbk1vZHVsZSAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTMpIHx8IHRoaXMub3B0aW9ucy5hbGxvd0F3YWl0T3V0c2lkZUZ1bmN0aW9uXG59O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuYWxsb3dSZXR1cm4uZ2V0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5pbkZ1bmN0aW9uKSB7IHJldHVybiB0cnVlIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5hbGxvd1JldHVybk91dHNpZGVGdW5jdGlvbiAmJiB0aGlzLmN1cnJlbnRWYXJTY29wZSgpLmZsYWdzICYgU0NPUEVfVE9QKSB7IHJldHVybiB0cnVlIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuYWxsb3dTdXBlci5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZWYgPSB0aGlzLmN1cnJlbnRUaGlzU2NvcGUoKTtcbiAgICB2YXIgZmxhZ3MgPSByZWYuZmxhZ3M7XG4gIHJldHVybiAoZmxhZ3MgJiBTQ09QRV9TVVBFUikgPiAwIHx8IHRoaXMub3B0aW9ucy5hbGxvd1N1cGVyT3V0c2lkZU1ldGhvZFxufTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmFsbG93RGlyZWN0U3VwZXIuZ2V0ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gKHRoaXMuY3VycmVudFRoaXNTY29wZSgpLmZsYWdzICYgU0NPUEVfRElSRUNUX1NVUEVSKSA+IDAgfTtcblxucHJvdG90eXBlQWNjZXNzb3JzLnRyZWF0RnVuY3Rpb25zQXNWYXIuZ2V0ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy50cmVhdEZ1bmN0aW9uc0FzVmFySW5TY29wZSh0aGlzLmN1cnJlbnRTY29wZSgpKSB9O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuYWxsb3dOZXdEb3RUYXJnZXQuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gdGhpcy5zY29wZVN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIHJlZiA9IHRoaXMuc2NvcGVTdGFja1tpXTtcbiAgICAgIHZhciBmbGFncyA9IHJlZi5mbGFncztcbiAgICBpZiAoZmxhZ3MgJiAoU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLIHwgU0NPUEVfQ0xBU1NfRklFTERfSU5JVCkgfHxcbiAgICAgICAgKChmbGFncyAmIFNDT1BFX0ZVTkNUSU9OKSAmJiAhKGZsYWdzICYgU0NPUEVfQVJST1cpKSkgeyByZXR1cm4gdHJ1ZSB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG5wcm90b3R5cGVBY2Nlc3NvcnMuYWxsb3dVc2luZy5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZWYgPSB0aGlzLmN1cnJlbnRTY29wZSgpO1xuICAgIHZhciBmbGFncyA9IHJlZi5mbGFncztcbiAgaWYgKGZsYWdzICYgU0NPUEVfU1dJVENIKSB7IHJldHVybiBmYWxzZSB9XG4gIGlmICghdGhpcy5pbk1vZHVsZSAmJiBmbGFncyAmIFNDT1BFX1RPUCkgeyByZXR1cm4gZmFsc2UgfVxuICByZXR1cm4gdHJ1ZVxufTtcblxucHJvdG90eXBlQWNjZXNzb3JzLmluQ2xhc3NTdGF0aWNCbG9jay5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAodGhpcy5jdXJyZW50VmFyU2NvcGUoKS5mbGFncyAmIFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSykgPiAwXG59O1xuXG5QYXJzZXIuZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kICgpIHtcbiAgICB2YXIgcGx1Z2lucyA9IFtdLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHdoaWxlICggbGVuLS0gKSBwbHVnaW5zWyBsZW4gXSA9IGFyZ3VtZW50c1sgbGVuIF07XG5cbiAgdmFyIGNscyA9IHRoaXM7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykgeyBjbHMgPSBwbHVnaW5zW2ldKGNscyk7IH1cbiAgcmV0dXJuIGNsc1xufTtcblxuUGFyc2VyLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKGlucHV0LCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgdGhpcyhvcHRpb25zLCBpbnB1dCkucGFyc2UoKVxufTtcblxuUGFyc2VyLnBhcnNlRXhwcmVzc2lvbkF0ID0gZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uQXQgKGlucHV0LCBwb3MsIG9wdGlvbnMpIHtcbiAgdmFyIHBhcnNlciA9IG5ldyB0aGlzKG9wdGlvbnMsIGlucHV0LCBwb3MpO1xuICBwYXJzZXIubmV4dFRva2VuKCk7XG4gIHJldHVybiBwYXJzZXIucGFyc2VFeHByZXNzaW9uKClcbn07XG5cblBhcnNlci50b2tlbml6ZXIgPSBmdW5jdGlvbiB0b2tlbml6ZXIgKGlucHV0LCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgdGhpcyhvcHRpb25zLCBpbnB1dClcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKCBQYXJzZXIucHJvdG90eXBlLCBwcm90b3R5cGVBY2Nlc3NvcnMgKTtcblxudmFyIHBwJDkgPSBQYXJzZXIucHJvdG90eXBlO1xuXG4vLyAjIyBQYXJzZXIgdXRpbGl0aWVzXG5cbnZhciBsaXRlcmFsID0gL14oPzonKCg/OlxcXFxbXl18W14nXFxcXF0pKj8pJ3xcIigoPzpcXFxcW15dfFteXCJcXFxcXSkqPylcIikvO1xucHAkOS5zdHJpY3REaXJlY3RpdmUgPSBmdW5jdGlvbihzdGFydCkge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgNSkgeyByZXR1cm4gZmFsc2UgfVxuICBmb3IgKDs7KSB7XG4gICAgLy8gVHJ5IHRvIGZpbmQgc3RyaW5nIGxpdGVyYWwuXG4gICAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gc3RhcnQ7XG4gICAgc3RhcnQgKz0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KVswXS5sZW5ndGg7XG4gICAgdmFyIG1hdGNoID0gbGl0ZXJhbC5leGVjKHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQpKTtcbiAgICBpZiAoIW1hdGNoKSB7IHJldHVybiBmYWxzZSB9XG4gICAgaWYgKChtYXRjaFsxXSB8fCBtYXRjaFsyXSkgPT09IFwidXNlIHN0cmljdFwiKSB7XG4gICAgICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSBzdGFydCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIHZhciBzcGFjZUFmdGVyID0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KSwgZW5kID0gc3BhY2VBZnRlci5pbmRleCArIHNwYWNlQWZ0ZXJbMF0ubGVuZ3RoO1xuICAgICAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJBdChlbmQpO1xuICAgICAgcmV0dXJuIG5leHQgPT09IFwiO1wiIHx8IG5leHQgPT09IFwifVwiIHx8XG4gICAgICAgIChsaW5lQnJlYWsudGVzdChzcGFjZUFmdGVyWzBdKSAmJlxuICAgICAgICAgISgvWyhgLlsrXFwtLyolPD49LD9eJl0vLnRlc3QobmV4dCkgfHwgbmV4dCA9PT0gXCIhXCIgJiYgdGhpcy5pbnB1dC5jaGFyQXQoZW5kICsgMSkgPT09IFwiPVwiKSlcbiAgICB9XG4gICAgc3RhcnQgKz0gbWF0Y2hbMF0ubGVuZ3RoO1xuXG4gICAgLy8gU2tpcCBzZW1pY29sb24sIGlmIGFueS5cbiAgICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSBzdGFydDtcbiAgICBzdGFydCArPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpWzBdLmxlbmd0aDtcbiAgICBpZiAodGhpcy5pbnB1dFtzdGFydF0gPT09IFwiO1wiKVxuICAgICAgeyBzdGFydCsrOyB9XG4gIH1cbn07XG5cbi8vIFByZWRpY2F0ZSB0aGF0IHRlc3RzIHdoZXRoZXIgdGhlIG5leHQgdG9rZW4gaXMgb2YgdGhlIGdpdmVuXG4vLyB0eXBlLCBhbmQgaWYgeWVzLCBjb25zdW1lcyBpdCBhcyBhIHNpZGUgZWZmZWN0LlxuXG5wcCQ5LmVhdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZSkge1xuICAgIHRoaXMubmV4dCgpO1xuICAgIHJldHVybiB0cnVlXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn07XG5cbi8vIFRlc3RzIHdoZXRoZXIgcGFyc2VkIHRva2VuIGlzIGEgY29udGV4dHVhbCBrZXl3b3JkLlxuXG5wcCQ5LmlzQ29udGV4dHVhbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lICYmIHRoaXMudmFsdWUgPT09IG5hbWUgJiYgIXRoaXMuY29udGFpbnNFc2Ncbn07XG5cbi8vIENvbnN1bWVzIGNvbnRleHR1YWwga2V5d29yZCBpZiBwb3NzaWJsZS5cblxucHAkOS5lYXRDb250ZXh0dWFsID0gZnVuY3Rpb24obmFtZSkge1xuICBpZiAoIXRoaXMuaXNDb250ZXh0dWFsKG5hbWUpKSB7IHJldHVybiBmYWxzZSB9XG4gIHRoaXMubmV4dCgpO1xuICByZXR1cm4gdHJ1ZVxufTtcblxuLy8gQXNzZXJ0cyB0aGF0IGZvbGxvd2luZyB0b2tlbiBpcyBnaXZlbiBjb250ZXh0dWFsIGtleXdvcmQuXG5cbnBwJDkuZXhwZWN0Q29udGV4dHVhbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKCF0aGlzLmVhdENvbnRleHR1YWwobmFtZSkpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbn07XG5cbi8vIFRlc3Qgd2hldGhlciBhIHNlbWljb2xvbiBjYW4gYmUgaW5zZXJ0ZWQgYXQgdGhlIGN1cnJlbnQgcG9zaXRpb24uXG5cbnBwJDkuY2FuSW5zZXJ0U2VtaWNvbG9uID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuZW9mIHx8XG4gICAgdGhpcy50eXBlID09PSB0eXBlcyQxLmJyYWNlUiB8fFxuICAgIGxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5sYXN0VG9rRW5kLCB0aGlzLnN0YXJ0KSlcbn07XG5cbnBwJDkuaW5zZXJ0U2VtaWNvbG9uID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNhbkluc2VydFNlbWljb2xvbigpKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vbkluc2VydGVkU2VtaWNvbG9uKVxuICAgICAgeyB0aGlzLm9wdGlvbnMub25JbnNlcnRlZFNlbWljb2xvbih0aGlzLmxhc3RUb2tFbmQsIHRoaXMubGFzdFRva0VuZExvYyk7IH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59O1xuXG4vLyBDb25zdW1lIGEgc2VtaWNvbG9uLCBvciwgZmFpbGluZyB0aGF0LCBzZWUgaWYgd2UgYXJlIGFsbG93ZWQgdG9cbi8vIHByZXRlbmQgdGhhdCB0aGVyZSBpcyBhIHNlbWljb2xvbiBhdCB0aGlzIHBvc2l0aW9uLlxuXG5wcCQ5LnNlbWljb2xvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuZWF0KHR5cGVzJDEuc2VtaSkgJiYgIXRoaXMuaW5zZXJ0U2VtaWNvbG9uKCkpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbn07XG5cbnBwJDkuYWZ0ZXJUcmFpbGluZ0NvbW1hID0gZnVuY3Rpb24odG9rVHlwZSwgbm90TmV4dCkge1xuICBpZiAodGhpcy50eXBlID09PSB0b2tUeXBlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vblRyYWlsaW5nQ29tbWEpXG4gICAgICB7IHRoaXMub3B0aW9ucy5vblRyYWlsaW5nQ29tbWEodGhpcy5sYXN0VG9rU3RhcnQsIHRoaXMubGFzdFRva1N0YXJ0TG9jKTsgfVxuICAgIGlmICghbm90TmV4dClcbiAgICAgIHsgdGhpcy5uZXh0KCk7IH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59O1xuXG4vLyBFeHBlY3QgYSB0b2tlbiBvZiBhIGdpdmVuIHR5cGUuIElmIGZvdW5kLCBjb25zdW1lIGl0LCBvdGhlcndpc2UsXG4vLyByYWlzZSBhbiB1bmV4cGVjdGVkIHRva2VuIGVycm9yLlxuXG5wcCQ5LmV4cGVjdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdGhpcy5lYXQodHlwZSkgfHwgdGhpcy51bmV4cGVjdGVkKCk7XG59O1xuXG4vLyBSYWlzZSBhbiB1bmV4cGVjdGVkIHRva2VuIGVycm9yLlxuXG5wcCQ5LnVuZXhwZWN0ZWQgPSBmdW5jdGlvbihwb3MpIHtcbiAgdGhpcy5yYWlzZShwb3MgIT0gbnVsbCA/IHBvcyA6IHRoaXMuc3RhcnQsIFwiVW5leHBlY3RlZCB0b2tlblwiKTtcbn07XG5cbnZhciBEZXN0cnVjdHVyaW5nRXJyb3JzID0gZnVuY3Rpb24gRGVzdHJ1Y3R1cmluZ0Vycm9ycygpIHtcbiAgdGhpcy5zaG9ydGhhbmRBc3NpZ24gPVxuICB0aGlzLnRyYWlsaW5nQ29tbWEgPVxuICB0aGlzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPVxuICB0aGlzLnBhcmVudGhlc2l6ZWRCaW5kID1cbiAgdGhpcy5kb3VibGVQcm90byA9XG4gICAgLTE7XG59O1xuXG5wcCQ5LmNoZWNrUGF0dGVybkVycm9ycyA9IGZ1bmN0aW9uKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGlzQXNzaWduKSB7XG4gIGlmICghcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykgeyByZXR1cm4gfVxuICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID4gLTEpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hLCBcIkNvbW1hIGlzIG5vdCBwZXJtaXR0ZWQgYWZ0ZXIgdGhlIHJlc3QgZWxlbWVudFwiKTsgfVxuICB2YXIgcGFyZW5zID0gaXNBc3NpZ24gPyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gOiByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRCaW5kO1xuICBpZiAocGFyZW5zID4gLTEpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHBhcmVucywgaXNBc3NpZ24gPyBcIkFzc2lnbmluZyB0byBydmFsdWVcIiA6IFwiUGFyZW50aGVzaXplZCBwYXR0ZXJuXCIpOyB9XG59O1xuXG5wcCQ5LmNoZWNrRXhwcmVzc2lvbkVycm9ycyA9IGZ1bmN0aW9uKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGFuZFRocm93KSB7XG4gIGlmICghcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykgeyByZXR1cm4gZmFsc2UgfVxuICB2YXIgc2hvcnRoYW5kQXNzaWduID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5zaG9ydGhhbmRBc3NpZ247XG4gIHZhciBkb3VibGVQcm90byA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuZG91YmxlUHJvdG87XG4gIGlmICghYW5kVGhyb3cpIHsgcmV0dXJuIHNob3J0aGFuZEFzc2lnbiA+PSAwIHx8IGRvdWJsZVByb3RvID49IDAgfVxuICBpZiAoc2hvcnRoYW5kQXNzaWduID49IDApXG4gICAgeyB0aGlzLnJhaXNlKHNob3J0aGFuZEFzc2lnbiwgXCJTaG9ydGhhbmQgcHJvcGVydHkgYXNzaWdubWVudHMgYXJlIHZhbGlkIG9ubHkgaW4gZGVzdHJ1Y3R1cmluZyBwYXR0ZXJuc1wiKTsgfVxuICBpZiAoZG91YmxlUHJvdG8gPj0gMClcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShkb3VibGVQcm90bywgXCJSZWRlZmluaXRpb24gb2YgX19wcm90b19fIHByb3BlcnR5XCIpOyB9XG59O1xuXG5wcCQ5LmNoZWNrWWllbGRBd2FpdEluRGVmYXVsdFBhcmFtcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy55aWVsZFBvcyAmJiAoIXRoaXMuYXdhaXRQb3MgfHwgdGhpcy55aWVsZFBvcyA8IHRoaXMuYXdhaXRQb3MpKVxuICAgIHsgdGhpcy5yYWlzZSh0aGlzLnlpZWxkUG9zLCBcIllpZWxkIGV4cHJlc3Npb24gY2Fubm90IGJlIGEgZGVmYXVsdCB2YWx1ZVwiKTsgfVxuICBpZiAodGhpcy5hd2FpdFBvcylcbiAgICB7IHRoaXMucmFpc2UodGhpcy5hd2FpdFBvcywgXCJBd2FpdCBleHByZXNzaW9uIGNhbm5vdCBiZSBhIGRlZmF1bHQgdmFsdWVcIik7IH1cbn07XG5cbnBwJDkuaXNTaW1wbGVBc3NpZ25UYXJnZXQgPSBmdW5jdGlvbihleHByKSB7XG4gIGlmIChleHByLnR5cGUgPT09IFwiUGFyZW50aGVzaXplZEV4cHJlc3Npb25cIilcbiAgICB7IHJldHVybiB0aGlzLmlzU2ltcGxlQXNzaWduVGFyZ2V0KGV4cHIuZXhwcmVzc2lvbikgfVxuICByZXR1cm4gZXhwci50eXBlID09PSBcIklkZW50aWZpZXJcIiB8fCBleHByLnR5cGUgPT09IFwiTWVtYmVyRXhwcmVzc2lvblwiXG59O1xuXG52YXIgcHAkOCA9IFBhcnNlci5wcm90b3R5cGU7XG5cbi8vICMjIyBTdGF0ZW1lbnQgcGFyc2luZ1xuXG4vLyBQYXJzZSBhIHByb2dyYW0uIEluaXRpYWxpemVzIHRoZSBwYXJzZXIsIHJlYWRzIGFueSBudW1iZXIgb2Zcbi8vIHN0YXRlbWVudHMsIGFuZCB3cmFwcyB0aGVtIGluIGEgUHJvZ3JhbSBub2RlLiAgT3B0aW9uYWxseSB0YWtlcyBhXG4vLyBgcHJvZ3JhbWAgYXJndW1lbnQuICBJZiBwcmVzZW50LCB0aGUgc3RhdGVtZW50cyB3aWxsIGJlIGFwcGVuZGVkXG4vLyB0byBpdHMgYm9keSBpbnN0ZWFkIG9mIGNyZWF0aW5nIGEgbmV3IG5vZGUuXG5cbnBwJDgucGFyc2VUb3BMZXZlbCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdmFyIGV4cG9ydHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBpZiAoIW5vZGUuYm9keSkgeyBub2RlLmJvZHkgPSBbXTsgfVxuICB3aGlsZSAodGhpcy50eXBlICE9PSB0eXBlcyQxLmVvZikge1xuICAgIHZhciBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudChudWxsLCB0cnVlLCBleHBvcnRzKTtcbiAgICBub2RlLmJvZHkucHVzaChzdG10KTtcbiAgfVxuICBpZiAodGhpcy5pbk1vZHVsZSlcbiAgICB7IGZvciAodmFyIGkgPSAwLCBsaXN0ID0gT2JqZWN0LmtleXModGhpcy51bmRlZmluZWRFeHBvcnRzKTsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpXG4gICAgICB7XG4gICAgICAgIHZhciBuYW1lID0gbGlzdFtpXTtcblxuICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy51bmRlZmluZWRFeHBvcnRzW25hbWVdLnN0YXJ0LCAoXCJFeHBvcnQgJ1wiICsgbmFtZSArIFwiJyBpcyBub3QgZGVmaW5lZFwiKSk7XG4gICAgICB9IH1cbiAgdGhpcy5hZGFwdERpcmVjdGl2ZVByb2xvZ3VlKG5vZGUuYm9keSk7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLnNvdXJjZVR5cGUgPSB0aGlzLm9wdGlvbnMuc291cmNlVHlwZSA9PT0gXCJjb21tb25qc1wiID8gXCJzY3JpcHRcIiA6IHRoaXMub3B0aW9ucy5zb3VyY2VUeXBlO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiUHJvZ3JhbVwiKVxufTtcblxudmFyIGxvb3BMYWJlbCA9IHtraW5kOiBcImxvb3BcIn0sIHN3aXRjaExhYmVsID0ge2tpbmQ6IFwic3dpdGNoXCJ9O1xuXG5wcCQ4LmlzTGV0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgNiB8fCAhdGhpcy5pc0NvbnRleHR1YWwoXCJsZXRcIikpIHsgcmV0dXJuIGZhbHNlIH1cbiAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gdGhpcy5wb3M7XG4gIHZhciBza2lwID0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KTtcbiAgdmFyIG5leHQgPSB0aGlzLnBvcyArIHNraXBbMF0ubGVuZ3RoLCBuZXh0Q2ggPSB0aGlzLmZ1bGxDaGFyQ29kZUF0KG5leHQpO1xuICAvLyBGb3IgYW1iaWd1b3VzIGNhc2VzLCBkZXRlcm1pbmUgaWYgYSBMZXhpY2FsRGVjbGFyYXRpb24gKG9yIG9ubHkgYVxuICAvLyBTdGF0ZW1lbnQpIGlzIGFsbG93ZWQgaGVyZS4gSWYgY29udGV4dCBpcyBub3QgZW1wdHkgdGhlbiBvbmx5IGEgU3RhdGVtZW50XG4gIC8vIGlzIGFsbG93ZWQuIEhvd2V2ZXIsIGBsZXQgW2AgaXMgYW4gZXhwbGljaXQgbmVnYXRpdmUgbG9va2FoZWFkIGZvclxuICAvLyBFeHByZXNzaW9uU3RhdGVtZW50LCBzbyBzcGVjaWFsLWNhc2UgaXQgZmlyc3QuXG4gIGlmIChuZXh0Q2ggPT09IDkxIHx8IG5leHRDaCA9PT0gOTIpIHsgcmV0dXJuIHRydWUgfSAvLyAnWycsICdcXCdcbiAgaWYgKGNvbnRleHQpIHsgcmV0dXJuIGZhbHNlIH1cblxuICBpZiAobmV4dENoID09PSAxMjMpIHsgcmV0dXJuIHRydWUgfSAvLyAneydcbiAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KG5leHRDaCkpIHtcbiAgICB2YXIgc3RhcnQgPSBuZXh0O1xuICAgIGRvIHsgbmV4dCArPSBuZXh0Q2ggPD0gMHhmZmZmID8gMSA6IDI7IH1cbiAgICB3aGlsZSAoaXNJZGVudGlmaWVyQ2hhcihuZXh0Q2ggPSB0aGlzLmZ1bGxDaGFyQ29kZUF0KG5leHQpKSlcbiAgICBpZiAobmV4dENoID09PSA5MikgeyByZXR1cm4gdHJ1ZSB9XG4gICAgdmFyIGlkZW50ID0gdGhpcy5pbnB1dC5zbGljZShzdGFydCwgbmV4dCk7XG4gICAgaWYgKCFrZXl3b3JkUmVsYXRpb25hbE9wZXJhdG9yLnRlc3QoaWRlbnQpKSB7IHJldHVybiB0cnVlIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGNoZWNrICdhc3luYyBbbm8gTGluZVRlcm1pbmF0b3IgaGVyZV0gZnVuY3Rpb24nXG4vLyAtICdhc3luYyAvKmZvbyovIGZ1bmN0aW9uJyBpcyBPSy5cbi8vIC0gJ2FzeW5jIC8qXFxuKi8gZnVuY3Rpb24nIGlzIGludmFsaWQuXG5wcCQ4LmlzQXN5bmNGdW5jdGlvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgOCB8fCAhdGhpcy5pc0NvbnRleHR1YWwoXCJhc3luY1wiKSlcbiAgICB7IHJldHVybiBmYWxzZSB9XG5cbiAgc2tpcFdoaXRlU3BhY2UubGFzdEluZGV4ID0gdGhpcy5wb3M7XG4gIHZhciBza2lwID0gc2tpcFdoaXRlU3BhY2UuZXhlYyh0aGlzLmlucHV0KTtcbiAgdmFyIG5leHQgPSB0aGlzLnBvcyArIHNraXBbMF0ubGVuZ3RoLCBhZnRlcjtcbiAgcmV0dXJuICFsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMucG9zLCBuZXh0KSkgJiZcbiAgICB0aGlzLmlucHV0LnNsaWNlKG5leHQsIG5leHQgKyA4KSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgKG5leHQgKyA4ID09PSB0aGlzLmlucHV0Lmxlbmd0aCB8fFxuICAgICAhKGlzSWRlbnRpZmllckNoYXIoYWZ0ZXIgPSB0aGlzLmZ1bGxDaGFyQ29kZUF0KG5leHQgKyA4KSkgfHwgYWZ0ZXIgPT09IDkyIC8qICdcXCcgKi8pKVxufTtcblxucHAkOC5pc1VzaW5nS2V5d29yZCA9IGZ1bmN0aW9uKGlzQXdhaXRVc2luZywgaXNGb3IpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDE3IHx8ICF0aGlzLmlzQ29udGV4dHVhbChpc0F3YWl0VXNpbmcgPyBcImF3YWl0XCIgOiBcInVzaW5nXCIpKVxuICAgIHsgcmV0dXJuIGZhbHNlIH1cblxuICBza2lwV2hpdGVTcGFjZS5sYXN0SW5kZXggPSB0aGlzLnBvcztcbiAgdmFyIHNraXAgPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpO1xuICB2YXIgbmV4dCA9IHRoaXMucG9zICsgc2tpcFswXS5sZW5ndGg7XG5cbiAgaWYgKGxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5wb3MsIG5leHQpKSkgeyByZXR1cm4gZmFsc2UgfVxuXG4gIGlmIChpc0F3YWl0VXNpbmcpIHtcbiAgICB2YXIgdXNpbmdFbmRQb3MgPSBuZXh0ICsgNSAvKiB1c2luZyAqLywgYWZ0ZXI7XG4gICAgaWYgKHRoaXMuaW5wdXQuc2xpY2UobmV4dCwgdXNpbmdFbmRQb3MpICE9PSBcInVzaW5nXCIgfHxcbiAgICAgIHVzaW5nRW5kUG9zID09PSB0aGlzLmlucHV0Lmxlbmd0aCB8fFxuICAgICAgaXNJZGVudGlmaWVyQ2hhcihhZnRlciA9IHRoaXMuZnVsbENoYXJDb2RlQXQodXNpbmdFbmRQb3MpKSB8fFxuICAgICAgYWZ0ZXIgPT09IDkyIC8qICdcXCcgKi9cbiAgICApIHsgcmV0dXJuIGZhbHNlIH1cblxuICAgIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHVzaW5nRW5kUG9zO1xuICAgIHZhciBza2lwQWZ0ZXJVc2luZyA9IHNraXBXaGl0ZVNwYWNlLmV4ZWModGhpcy5pbnB1dCk7XG4gICAgbmV4dCA9IHVzaW5nRW5kUG9zICsgc2tpcEFmdGVyVXNpbmdbMF0ubGVuZ3RoO1xuICAgIGlmIChza2lwQWZ0ZXJVc2luZyAmJiBsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHVzaW5nRW5kUG9zLCBuZXh0KSkpIHsgcmV0dXJuIGZhbHNlIH1cbiAgfVxuXG4gIHZhciBjaCA9IHRoaXMuZnVsbENoYXJDb2RlQXQobmV4dCk7XG4gIGlmICghaXNJZGVudGlmaWVyU3RhcnQoY2gpICYmIGNoICE9PSA5MiAvKiAnXFwnICovKSB7IHJldHVybiBmYWxzZSB9XG4gIHZhciBpZFN0YXJ0ID0gbmV4dDtcbiAgZG8geyBuZXh0ICs9IGNoIDw9IDB4ZmZmZiA/IDEgOiAyOyB9XG4gIHdoaWxlIChpc0lkZW50aWZpZXJDaGFyKGNoID0gdGhpcy5mdWxsQ2hhckNvZGVBdChuZXh0KSkpXG4gIGlmIChjaCA9PT0gOTIpIHsgcmV0dXJuIHRydWUgfVxuICB2YXIgaWQgPSB0aGlzLmlucHV0LnNsaWNlKGlkU3RhcnQsIG5leHQpO1xuICBpZiAoa2V5d29yZFJlbGF0aW9uYWxPcGVyYXRvci50ZXN0KGlkKSB8fCBpc0ZvciAmJiBpZCA9PT0gXCJvZlwiKSB7IHJldHVybiBmYWxzZSB9XG4gIHJldHVybiB0cnVlXG59O1xuXG5wcCQ4LmlzQXdhaXRVc2luZyA9IGZ1bmN0aW9uKGlzRm9yKSB7XG4gIHJldHVybiB0aGlzLmlzVXNpbmdLZXl3b3JkKHRydWUsIGlzRm9yKVxufTtcblxucHAkOC5pc1VzaW5nID0gZnVuY3Rpb24oaXNGb3IpIHtcbiAgcmV0dXJuIHRoaXMuaXNVc2luZ0tleXdvcmQoZmFsc2UsIGlzRm9yKVxufTtcblxuLy8gUGFyc2UgYSBzaW5nbGUgc3RhdGVtZW50LlxuLy9cbi8vIElmIGV4cGVjdGluZyBhIHN0YXRlbWVudCBhbmQgZmluZGluZyBhIHNsYXNoIG9wZXJhdG9yLCBwYXJzZSBhXG4vLyByZWd1bGFyIGV4cHJlc3Npb24gbGl0ZXJhbC4gVGhpcyBpcyB0byBoYW5kbGUgY2FzZXMgbGlrZVxuLy8gYGlmIChmb28pIC9ibGFoLy5leGVjKGZvbylgLCB3aGVyZSBsb29raW5nIGF0IHRoZSBwcmV2aW91cyB0b2tlblxuLy8gZG9lcyBub3QgaGVscC5cblxucHAkOC5wYXJzZVN0YXRlbWVudCA9IGZ1bmN0aW9uKGNvbnRleHQsIHRvcExldmVsLCBleHBvcnRzKSB7XG4gIHZhciBzdGFydHR5cGUgPSB0aGlzLnR5cGUsIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpLCBraW5kO1xuXG4gIGlmICh0aGlzLmlzTGV0KGNvbnRleHQpKSB7XG4gICAgc3RhcnR0eXBlID0gdHlwZXMkMS5fdmFyO1xuICAgIGtpbmQgPSBcImxldFwiO1xuICB9XG5cbiAgLy8gTW9zdCB0eXBlcyBvZiBzdGF0ZW1lbnRzIGFyZSByZWNvZ25pemVkIGJ5IHRoZSBrZXl3b3JkIHRoZXlcbiAgLy8gc3RhcnQgd2l0aC4gTWFueSBhcmUgdHJpdmlhbCB0byBwYXJzZSwgc29tZSByZXF1aXJlIGEgYml0IG9mXG4gIC8vIGNvbXBsZXhpdHkuXG5cbiAgc3dpdGNoIChzdGFydHR5cGUpIHtcbiAgY2FzZSB0eXBlcyQxLl9icmVhazogY2FzZSB0eXBlcyQxLl9jb250aW51ZTogcmV0dXJuIHRoaXMucGFyc2VCcmVha0NvbnRpbnVlU3RhdGVtZW50KG5vZGUsIHN0YXJ0dHlwZS5rZXl3b3JkKVxuICBjYXNlIHR5cGVzJDEuX2RlYnVnZ2VyOiByZXR1cm4gdGhpcy5wYXJzZURlYnVnZ2VyU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fZG86IHJldHVybiB0aGlzLnBhcnNlRG9TdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl9mb3I6IHJldHVybiB0aGlzLnBhcnNlRm9yU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fZnVuY3Rpb246XG4gICAgLy8gRnVuY3Rpb24gYXMgc29sZSBib2R5IG9mIGVpdGhlciBhbiBpZiBzdGF0ZW1lbnQgb3IgYSBsYWJlbGVkIHN0YXRlbWVudFxuICAgIC8vIHdvcmtzLCBidXQgbm90IHdoZW4gaXQgaXMgcGFydCBvZiBhIGxhYmVsZWQgc3RhdGVtZW50IHRoYXQgaXMgdGhlIHNvbGVcbiAgICAvLyBib2R5IG9mIGFuIGlmIHN0YXRlbWVudC5cbiAgICBpZiAoKGNvbnRleHQgJiYgKHRoaXMuc3RyaWN0IHx8IGNvbnRleHQgIT09IFwiaWZcIiAmJiBjb250ZXh0ICE9PSBcImxhYmVsXCIpKSAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgIHJldHVybiB0aGlzLnBhcnNlRnVuY3Rpb25TdGF0ZW1lbnQobm9kZSwgZmFsc2UsICFjb250ZXh0KVxuICBjYXNlIHR5cGVzJDEuX2NsYXNzOlxuICAgIGlmIChjb250ZXh0KSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgcmV0dXJuIHRoaXMucGFyc2VDbGFzcyhub2RlLCB0cnVlKVxuICBjYXNlIHR5cGVzJDEuX2lmOiByZXR1cm4gdGhpcy5wYXJzZUlmU3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fcmV0dXJuOiByZXR1cm4gdGhpcy5wYXJzZVJldHVyblN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX3N3aXRjaDogcmV0dXJuIHRoaXMucGFyc2VTd2l0Y2hTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl90aHJvdzogcmV0dXJuIHRoaXMucGFyc2VUaHJvd1N0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX3RyeTogcmV0dXJuIHRoaXMucGFyc2VUcnlTdGF0ZW1lbnQobm9kZSlcbiAgY2FzZSB0eXBlcyQxLl9jb25zdDogY2FzZSB0eXBlcyQxLl92YXI6XG4gICAga2luZCA9IGtpbmQgfHwgdGhpcy52YWx1ZTtcbiAgICBpZiAoY29udGV4dCAmJiBraW5kICE9PSBcInZhclwiKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgcmV0dXJuIHRoaXMucGFyc2VWYXJTdGF0ZW1lbnQobm9kZSwga2luZClcbiAgY2FzZSB0eXBlcyQxLl93aGlsZTogcmV0dXJuIHRoaXMucGFyc2VXaGlsZVN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuX3dpdGg6IHJldHVybiB0aGlzLnBhcnNlV2l0aFN0YXRlbWVudChub2RlKVxuICBjYXNlIHR5cGVzJDEuYnJhY2VMOiByZXR1cm4gdGhpcy5wYXJzZUJsb2NrKHRydWUsIG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5zZW1pOiByZXR1cm4gdGhpcy5wYXJzZUVtcHR5U3RhdGVtZW50KG5vZGUpXG4gIGNhc2UgdHlwZXMkMS5fZXhwb3J0OlxuICBjYXNlIHR5cGVzJDEuX2ltcG9ydDpcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID4gMTAgJiYgc3RhcnR0eXBlID09PSB0eXBlcyQxLl9pbXBvcnQpIHtcbiAgICAgIHNraXBXaGl0ZVNwYWNlLmxhc3RJbmRleCA9IHRoaXMucG9zO1xuICAgICAgdmFyIHNraXAgPSBza2lwV2hpdGVTcGFjZS5leGVjKHRoaXMuaW5wdXQpO1xuICAgICAgdmFyIG5leHQgPSB0aGlzLnBvcyArIHNraXBbMF0ubGVuZ3RoLCBuZXh0Q2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQobmV4dCk7XG4gICAgICBpZiAobmV4dENoID09PSA0MCB8fCBuZXh0Q2ggPT09IDQ2KSAvLyAnKCcgb3IgJy4nXG4gICAgICAgIHsgcmV0dXJuIHRoaXMucGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KG5vZGUsIHRoaXMucGFyc2VFeHByZXNzaW9uKCkpIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5hbGxvd0ltcG9ydEV4cG9ydEV2ZXJ5d2hlcmUpIHtcbiAgICAgIGlmICghdG9wTGV2ZWwpXG4gICAgICAgIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIidpbXBvcnQnIGFuZCAnZXhwb3J0JyBtYXkgb25seSBhcHBlYXIgYXQgdGhlIHRvcCBsZXZlbFwiKTsgfVxuICAgICAgaWYgKCF0aGlzLmluTW9kdWxlKVxuICAgICAgICB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCInaW1wb3J0JyBhbmQgJ2V4cG9ydCcgbWF5IGFwcGVhciBvbmx5IHdpdGggJ3NvdXJjZVR5cGU6IG1vZHVsZSdcIik7IH1cbiAgICB9XG4gICAgcmV0dXJuIHN0YXJ0dHlwZSA9PT0gdHlwZXMkMS5faW1wb3J0ID8gdGhpcy5wYXJzZUltcG9ydChub2RlKSA6IHRoaXMucGFyc2VFeHBvcnQobm9kZSwgZXhwb3J0cylcblxuICAgIC8vIElmIHRoZSBzdGF0ZW1lbnQgZG9lcyBub3Qgc3RhcnQgd2l0aCBhIHN0YXRlbWVudCBrZXl3b3JkIG9yIGFcbiAgICAvLyBicmFjZSwgaXQncyBhbiBFeHByZXNzaW9uU3RhdGVtZW50IG9yIExhYmVsZWRTdGF0ZW1lbnQuIFdlXG4gICAgLy8gc2ltcGx5IHN0YXJ0IHBhcnNpbmcgYW4gZXhwcmVzc2lvbiwgYW5kIGFmdGVyd2FyZHMsIGlmIHRoZVxuICAgIC8vIG5leHQgdG9rZW4gaXMgYSBjb2xvbiBhbmQgdGhlIGV4cHJlc3Npb24gd2FzIGEgc2ltcGxlXG4gICAgLy8gSWRlbnRpZmllciBub2RlLCB3ZSBzd2l0Y2ggdG8gaW50ZXJwcmV0aW5nIGl0IGFzIGEgbGFiZWwuXG4gIGRlZmF1bHQ6XG4gICAgaWYgKHRoaXMuaXNBc3luY0Z1bmN0aW9uKCkpIHtcbiAgICAgIGlmIChjb250ZXh0KSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlRnVuY3Rpb25TdGF0ZW1lbnQobm9kZSwgdHJ1ZSwgIWNvbnRleHQpXG4gICAgfVxuXG4gICAgdmFyIHVzaW5nS2luZCA9IHRoaXMuaXNBd2FpdFVzaW5nKGZhbHNlKSA/IFwiYXdhaXQgdXNpbmdcIiA6IHRoaXMuaXNVc2luZyhmYWxzZSkgPyBcInVzaW5nXCIgOiBudWxsO1xuICAgIGlmICh1c2luZ0tpbmQpIHtcbiAgICAgIGlmICghdGhpcy5hbGxvd1VzaW5nKSB7XG4gICAgICAgIHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJVc2luZyBkZWNsYXJhdGlvbiBjYW5ub3QgYXBwZWFyIGluIHRoZSB0b3AgbGV2ZWwgd2hlbiBzb3VyY2UgdHlwZSBpcyBgc2NyaXB0YCBvciBpbiB0aGUgYmFyZSBjYXNlIHN0YXRlbWVudFwiKTtcbiAgICAgIH1cbiAgICAgIGlmICh1c2luZ0tpbmQgPT09IFwiYXdhaXQgdXNpbmdcIikge1xuICAgICAgICBpZiAoIXRoaXMuY2FuQXdhaXQpIHtcbiAgICAgICAgICB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiQXdhaXQgdXNpbmcgY2Fubm90IGFwcGVhciBvdXRzaWRlIG9mIGFzeW5jIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICB0aGlzLnBhcnNlVmFyKG5vZGUsIGZhbHNlLCB1c2luZ0tpbmQpO1xuICAgICAgdGhpcy5zZW1pY29sb24oKTtcbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJWYXJpYWJsZURlY2xhcmF0aW9uXCIpXG4gICAgfVxuXG4gICAgdmFyIG1heWJlTmFtZSA9IHRoaXMudmFsdWUsIGV4cHIgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgIGlmIChzdGFydHR5cGUgPT09IHR5cGVzJDEubmFtZSAmJiBleHByLnR5cGUgPT09IFwiSWRlbnRpZmllclwiICYmIHRoaXMuZWF0KHR5cGVzJDEuY29sb24pKVxuICAgICAgeyByZXR1cm4gdGhpcy5wYXJzZUxhYmVsZWRTdGF0ZW1lbnQobm9kZSwgbWF5YmVOYW1lLCBleHByLCBjb250ZXh0KSB9XG4gICAgZWxzZSB7IHJldHVybiB0aGlzLnBhcnNlRXhwcmVzc2lvblN0YXRlbWVudChub2RlLCBleHByKSB9XG4gIH1cbn07XG5cbnBwJDgucGFyc2VCcmVha0NvbnRpbnVlU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSwga2V5d29yZCkge1xuICB2YXIgaXNCcmVhayA9IGtleXdvcmQgPT09IFwiYnJlYWtcIjtcbiAgdGhpcy5uZXh0KCk7XG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLnNlbWkpIHx8IHRoaXMuaW5zZXJ0U2VtaWNvbG9uKCkpIHsgbm9kZS5sYWJlbCA9IG51bGw7IH1cbiAgZWxzZSBpZiAodGhpcy50eXBlICE9PSB0eXBlcyQxLm5hbWUpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgZWxzZSB7XG4gICAgbm9kZS5sYWJlbCA9IHRoaXMucGFyc2VJZGVudCgpO1xuICAgIHRoaXMuc2VtaWNvbG9uKCk7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhhdCB0aGVyZSBpcyBhbiBhY3R1YWwgZGVzdGluYXRpb24gdG8gYnJlYWsgb3JcbiAgLy8gY29udGludWUgdG8uXG4gIHZhciBpID0gMDtcbiAgZm9yICg7IGkgPCB0aGlzLmxhYmVscy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBsYWIgPSB0aGlzLmxhYmVsc1tpXTtcbiAgICBpZiAobm9kZS5sYWJlbCA9PSBudWxsIHx8IGxhYi5uYW1lID09PSBub2RlLmxhYmVsLm5hbWUpIHtcbiAgICAgIGlmIChsYWIua2luZCAhPSBudWxsICYmIChpc0JyZWFrIHx8IGxhYi5raW5kID09PSBcImxvb3BcIikpIHsgYnJlYWsgfVxuICAgICAgaWYgKG5vZGUubGFiZWwgJiYgaXNCcmVhaykgeyBicmVhayB9XG4gICAgfVxuICB9XG4gIGlmIChpID09PSB0aGlzLmxhYmVscy5sZW5ndGgpIHsgdGhpcy5yYWlzZShub2RlLnN0YXJ0LCBcIlVuc3ludGFjdGljIFwiICsga2V5d29yZCk7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBpc0JyZWFrID8gXCJCcmVha1N0YXRlbWVudFwiIDogXCJDb250aW51ZVN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZURlYnVnZ2VyU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgdGhpcy5zZW1pY29sb24oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkRlYnVnZ2VyU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlRG9TdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICB0aGlzLmxhYmVscy5wdXNoKGxvb3BMYWJlbCk7XG4gIG5vZGUuYm9keSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoXCJkb1wiKTtcbiAgdGhpcy5sYWJlbHMucG9wKCk7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuX3doaWxlKTtcbiAgbm9kZS50ZXN0ID0gdGhpcy5wYXJzZVBhcmVuRXhwcmVzc2lvbigpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpXG4gICAgeyB0aGlzLmVhdCh0eXBlcyQxLnNlbWkpOyB9XG4gIGVsc2VcbiAgICB7IHRoaXMuc2VtaWNvbG9uKCk7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkRvV2hpbGVTdGF0ZW1lbnRcIilcbn07XG5cbi8vIERpc2FtYmlndWF0aW5nIGJldHdlZW4gYSBgZm9yYCBhbmQgYSBgZm9yYC9gaW5gIG9yIGBmb3JgL2BvZmBcbi8vIGxvb3AgaXMgbm9uLXRyaXZpYWwuIEJhc2ljYWxseSwgd2UgaGF2ZSB0byBwYXJzZSB0aGUgaW5pdCBgdmFyYFxuLy8gc3RhdGVtZW50IG9yIGV4cHJlc3Npb24sIGRpc2FsbG93aW5nIHRoZSBgaW5gIG9wZXJhdG9yIChzZWVcbi8vIHRoZSBzZWNvbmQgcGFyYW1ldGVyIHRvIGBwYXJzZUV4cHJlc3Npb25gKSwgYW5kIHRoZW4gY2hlY2tcbi8vIHdoZXRoZXIgdGhlIG5leHQgdG9rZW4gaXMgYGluYCBvciBgb2ZgLiBXaGVuIHRoZXJlIGlzIG5vIGluaXRcbi8vIHBhcnQgKHNlbWljb2xvbiBpbW1lZGlhdGVseSBhZnRlciB0aGUgb3BlbmluZyBwYXJlbnRoZXNpcyksIGl0XG4vLyBpcyBhIHJlZ3VsYXIgYGZvcmAgbG9vcC5cblxucHAkOC5wYXJzZUZvclN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdGhpcy5uZXh0KCk7XG4gIHZhciBhd2FpdEF0ID0gKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ICYmIHRoaXMuY2FuQXdhaXQgJiYgdGhpcy5lYXRDb250ZXh0dWFsKFwiYXdhaXRcIikpID8gdGhpcy5sYXN0VG9rU3RhcnQgOiAtMTtcbiAgdGhpcy5sYWJlbHMucHVzaChsb29wTGFiZWwpO1xuICB0aGlzLmVudGVyU2NvcGUoMCk7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5MKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zZW1pKSB7XG4gICAgaWYgKGF3YWl0QXQgPiAtMSkgeyB0aGlzLnVuZXhwZWN0ZWQoYXdhaXRBdCk7IH1cbiAgICByZXR1cm4gdGhpcy5wYXJzZUZvcihub2RlLCBudWxsKVxuICB9XG4gIHZhciBpc0xldCA9IHRoaXMuaXNMZXQoKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fdmFyIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fY29uc3QgfHwgaXNMZXQpIHtcbiAgICB2YXIgaW5pdCQxID0gdGhpcy5zdGFydE5vZGUoKSwga2luZCA9IGlzTGV0ID8gXCJsZXRcIiA6IHRoaXMudmFsdWU7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgdGhpcy5wYXJzZVZhcihpbml0JDEsIHRydWUsIGtpbmQpO1xuICAgIHRoaXMuZmluaXNoTm9kZShpbml0JDEsIFwiVmFyaWFibGVEZWNsYXJhdGlvblwiKTtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUZvckFmdGVySW5pdChub2RlLCBpbml0JDEsIGF3YWl0QXQpXG4gIH1cbiAgdmFyIHN0YXJ0c1dpdGhMZXQgPSB0aGlzLmlzQ29udGV4dHVhbChcImxldFwiKSwgaXNGb3JPZiA9IGZhbHNlO1xuXG4gIHZhciB1c2luZ0tpbmQgPSB0aGlzLmlzVXNpbmcodHJ1ZSkgPyBcInVzaW5nXCIgOiB0aGlzLmlzQXdhaXRVc2luZyh0cnVlKSA/IFwiYXdhaXQgdXNpbmdcIiA6IG51bGw7XG4gIGlmICh1c2luZ0tpbmQpIHtcbiAgICB2YXIgaW5pdCQyID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICBpZiAodXNpbmdLaW5kID09PSBcImF3YWl0IHVzaW5nXCIpIHtcbiAgICAgIGlmICghdGhpcy5jYW5Bd2FpdCkge1xuICAgICAgICB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiQXdhaXQgdXNpbmcgY2Fubm90IGFwcGVhciBvdXRzaWRlIG9mIGFzeW5jIGZ1bmN0aW9uXCIpO1xuICAgICAgfVxuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgfVxuICAgIHRoaXMucGFyc2VWYXIoaW5pdCQyLCB0cnVlLCB1c2luZ0tpbmQpO1xuICAgIHRoaXMuZmluaXNoTm9kZShpbml0JDIsIFwiVmFyaWFibGVEZWNsYXJhdGlvblwiKTtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUZvckFmdGVySW5pdChub2RlLCBpbml0JDIsIGF3YWl0QXQpXG4gIH1cbiAgdmFyIGNvbnRhaW5zRXNjID0gdGhpcy5jb250YWluc0VzYztcbiAgdmFyIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMgPSBuZXcgRGVzdHJ1Y3R1cmluZ0Vycm9ycztcbiAgdmFyIGluaXRQb3MgPSB0aGlzLnN0YXJ0O1xuICB2YXIgaW5pdCA9IGF3YWl0QXQgPiAtMVxuICAgID8gdGhpcy5wYXJzZUV4cHJTdWJzY3JpcHRzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIFwiYXdhaXRcIilcbiAgICA6IHRoaXMucGFyc2VFeHByZXNzaW9uKHRydWUsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9pbiB8fCAoaXNGb3JPZiA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIHRoaXMuaXNDb250ZXh0dWFsKFwib2ZcIikpKSB7XG4gICAgaWYgKGF3YWl0QXQgPiAtMSkgeyAvLyBpbXBsaWVzIGBlY21hVmVyc2lvbiA+PSA5YCAoc2VlIGRlY2xhcmF0aW9uIG9mIGF3YWl0QXQpXG4gICAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLl9pbikgeyB0aGlzLnVuZXhwZWN0ZWQoYXdhaXRBdCk7IH1cbiAgICAgIG5vZGUuYXdhaXQgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoaXNGb3JPZiAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCkge1xuICAgICAgaWYgKGluaXQuc3RhcnQgPT09IGluaXRQb3MgJiYgIWNvbnRhaW5zRXNjICYmIGluaXQudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgJiYgaW5pdC5uYW1lID09PSBcImFzeW5jXCIpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICAgIGVsc2UgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5KSB7IG5vZGUuYXdhaXQgPSBmYWxzZTsgfVxuICAgIH1cbiAgICBpZiAoc3RhcnRzV2l0aExldCAmJiBpc0Zvck9mKSB7IHRoaXMucmFpc2UoaW5pdC5zdGFydCwgXCJUaGUgbGVmdC1oYW5kIHNpZGUgb2YgYSBmb3Itb2YgbG9vcCBtYXkgbm90IHN0YXJ0IHdpdGggJ2xldCcuXCIpOyB9XG4gICAgdGhpcy50b0Fzc2lnbmFibGUoaW5pdCwgZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgIHRoaXMuY2hlY2tMVmFsUGF0dGVybihpbml0KTtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUZvckluKG5vZGUsIGluaXQpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7XG4gIH1cbiAgaWYgKGF3YWl0QXQgPiAtMSkgeyB0aGlzLnVuZXhwZWN0ZWQoYXdhaXRBdCk7IH1cbiAgcmV0dXJuIHRoaXMucGFyc2VGb3Iobm9kZSwgaW5pdClcbn07XG5cbi8vIEhlbHBlciBtZXRob2QgdG8gcGFyc2UgZm9yIGxvb3AgYWZ0ZXIgdmFyaWFibGUgaW5pdGlhbGl6YXRpb25cbnBwJDgucGFyc2VGb3JBZnRlckluaXQgPSBmdW5jdGlvbihub2RlLCBpbml0LCBhd2FpdEF0KSB7XG4gIGlmICgodGhpcy50eXBlID09PSB0eXBlcyQxLl9pbiB8fCAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgdGhpcy5pc0NvbnRleHR1YWwoXCJvZlwiKSkpICYmIGluaXQuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSkge1xuICAgICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5faW4pIHtcbiAgICAgICAgaWYgKGF3YWl0QXQgPiAtMSkgeyB0aGlzLnVuZXhwZWN0ZWQoYXdhaXRBdCk7IH1cbiAgICAgIH0gZWxzZSB7IG5vZGUuYXdhaXQgPSBhd2FpdEF0ID4gLTE7IH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGb3JJbihub2RlLCBpbml0KVxuICB9XG4gIGlmIChhd2FpdEF0ID4gLTEpIHsgdGhpcy51bmV4cGVjdGVkKGF3YWl0QXQpOyB9XG4gIHJldHVybiB0aGlzLnBhcnNlRm9yKG5vZGUsIGluaXQpXG59O1xuXG5wcCQ4LnBhcnNlRnVuY3Rpb25TdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlLCBpc0FzeW5jLCBkZWNsYXJhdGlvblBvc2l0aW9uKSB7XG4gIHRoaXMubmV4dCgpO1xuICByZXR1cm4gdGhpcy5wYXJzZUZ1bmN0aW9uKG5vZGUsIEZVTkNfU1RBVEVNRU5UIHwgKGRlY2xhcmF0aW9uUG9zaXRpb24gPyAwIDogRlVOQ19IQU5HSU5HX1NUQVRFTUVOVCksIGZhbHNlLCBpc0FzeW5jKVxufTtcblxucHAkOC5wYXJzZUlmU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS50ZXN0ID0gdGhpcy5wYXJzZVBhcmVuRXhwcmVzc2lvbigpO1xuICAvLyBhbGxvdyBmdW5jdGlvbiBkZWNsYXJhdGlvbnMgaW4gYnJhbmNoZXMsIGJ1dCBvbmx5IGluIG5vbi1zdHJpY3QgbW9kZVxuICBub2RlLmNvbnNlcXVlbnQgPSB0aGlzLnBhcnNlU3RhdGVtZW50KFwiaWZcIik7XG4gIG5vZGUuYWx0ZXJuYXRlID0gdGhpcy5lYXQodHlwZXMkMS5fZWxzZSkgPyB0aGlzLnBhcnNlU3RhdGVtZW50KFwiaWZcIikgOiBudWxsO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSWZTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VSZXR1cm5TdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIGlmICghdGhpcy5hbGxvd1JldHVybilcbiAgICB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCIncmV0dXJuJyBvdXRzaWRlIG9mIGZ1bmN0aW9uXCIpOyB9XG4gIHRoaXMubmV4dCgpO1xuXG4gIC8vIEluIGByZXR1cm5gIChhbmQgYGJyZWFrYC9gY29udGludWVgKSwgdGhlIGtleXdvcmRzIHdpdGhcbiAgLy8gb3B0aW9uYWwgYXJndW1lbnRzLCB3ZSBlYWdlcmx5IGxvb2sgZm9yIGEgc2VtaWNvbG9uIG9yIHRoZVxuICAvLyBwb3NzaWJpbGl0eSB0byBpbnNlcnQgb25lLlxuXG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLnNlbWkpIHx8IHRoaXMuaW5zZXJ0U2VtaWNvbG9uKCkpIHsgbm9kZS5hcmd1bWVudCA9IG51bGw7IH1cbiAgZWxzZSB7IG5vZGUuYXJndW1lbnQgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpOyB0aGlzLnNlbWljb2xvbigpOyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJSZXR1cm5TdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VTd2l0Y2hTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLmRpc2NyaW1pbmFudCA9IHRoaXMucGFyc2VQYXJlbkV4cHJlc3Npb24oKTtcbiAgbm9kZS5jYXNlcyA9IFtdO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNlTCk7XG4gIHRoaXMubGFiZWxzLnB1c2goc3dpdGNoTGFiZWwpO1xuICB0aGlzLmVudGVyU2NvcGUoU0NPUEVfU1dJVENIKTtcblxuICAvLyBTdGF0ZW1lbnRzIHVuZGVyIG11c3QgYmUgZ3JvdXBlZCAoYnkgbGFiZWwpIGluIFN3aXRjaENhc2VcbiAgLy8gbm9kZXMuIGBjdXJgIGlzIHVzZWQgdG8ga2VlcCB0aGUgbm9kZSB0aGF0IHdlIGFyZSBjdXJyZW50bHlcbiAgLy8gYWRkaW5nIHN0YXRlbWVudHMgdG8uXG5cbiAgdmFyIGN1cjtcbiAgZm9yICh2YXIgc2F3RGVmYXVsdCA9IGZhbHNlOyB0aGlzLnR5cGUgIT09IHR5cGVzJDEuYnJhY2VSOykge1xuICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2Nhc2UgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLl9kZWZhdWx0KSB7XG4gICAgICB2YXIgaXNDYXNlID0gdGhpcy50eXBlID09PSB0eXBlcyQxLl9jYXNlO1xuICAgICAgaWYgKGN1cikgeyB0aGlzLmZpbmlzaE5vZGUoY3VyLCBcIlN3aXRjaENhc2VcIik7IH1cbiAgICAgIG5vZGUuY2FzZXMucHVzaChjdXIgPSB0aGlzLnN0YXJ0Tm9kZSgpKTtcbiAgICAgIGN1ci5jb25zZXF1ZW50ID0gW107XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICAgIGlmIChpc0Nhc2UpIHtcbiAgICAgICAgY3VyLnRlc3QgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHNhd0RlZmF1bHQpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMubGFzdFRva1N0YXJ0LCBcIk11bHRpcGxlIGRlZmF1bHQgY2xhdXNlc1wiKTsgfVxuICAgICAgICBzYXdEZWZhdWx0ID0gdHJ1ZTtcbiAgICAgICAgY3VyLnRlc3QgPSBudWxsO1xuICAgICAgfVxuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb2xvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghY3VyKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgICBjdXIuY29uc2VxdWVudC5wdXNoKHRoaXMucGFyc2VTdGF0ZW1lbnQobnVsbCkpO1xuICAgIH1cbiAgfVxuICB0aGlzLmV4aXRTY29wZSgpO1xuICBpZiAoY3VyKSB7IHRoaXMuZmluaXNoTm9kZShjdXIsIFwiU3dpdGNoQ2FzZVwiKTsgfVxuICB0aGlzLm5leHQoKTsgLy8gQ2xvc2luZyBicmFjZVxuICB0aGlzLmxhYmVscy5wb3AoKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlN3aXRjaFN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZVRocm93U3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgaWYgKGxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5sYXN0VG9rRW5kLCB0aGlzLnN0YXJ0KSkpXG4gICAgeyB0aGlzLnJhaXNlKHRoaXMubGFzdFRva0VuZCwgXCJJbGxlZ2FsIG5ld2xpbmUgYWZ0ZXIgdGhyb3dcIik7IH1cbiAgbm9kZS5hcmd1bWVudCA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gIHRoaXMuc2VtaWNvbG9uKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJUaHJvd1N0YXRlbWVudFwiKVxufTtcblxuLy8gUmV1c2VkIGVtcHR5IGFycmF5IGFkZGVkIGZvciBub2RlIGZpZWxkcyB0aGF0IGFyZSBhbHdheXMgZW1wdHkuXG5cbnZhciBlbXB0eSQxID0gW107XG5cbnBwJDgucGFyc2VDYXRjaENsYXVzZVBhcmFtID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXJhbSA9IHRoaXMucGFyc2VCaW5kaW5nQXRvbSgpO1xuICB2YXIgc2ltcGxlID0gcGFyYW0udHlwZSA9PT0gXCJJZGVudGlmaWVyXCI7XG4gIHRoaXMuZW50ZXJTY29wZShzaW1wbGUgPyBTQ09QRV9TSU1QTEVfQ0FUQ0ggOiAwKTtcbiAgdGhpcy5jaGVja0xWYWxQYXR0ZXJuKHBhcmFtLCBzaW1wbGUgPyBCSU5EX1NJTVBMRV9DQVRDSCA6IEJJTkRfTEVYSUNBTCk7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5SKTtcblxuICByZXR1cm4gcGFyYW1cbn07XG5cbnBwJDgucGFyc2VUcnlTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLmJsb2NrID0gdGhpcy5wYXJzZUJsb2NrKCk7XG4gIG5vZGUuaGFuZGxlciA9IG51bGw7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2NhdGNoKSB7XG4gICAgdmFyIGNsYXVzZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgaWYgKHRoaXMuZWF0KHR5cGVzJDEucGFyZW5MKSkge1xuICAgICAgY2xhdXNlLnBhcmFtID0gdGhpcy5wYXJzZUNhdGNoQ2xhdXNlUGFyYW0oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDEwKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgICBjbGF1c2UucGFyYW0gPSBudWxsO1xuICAgICAgdGhpcy5lbnRlclNjb3BlKDApO1xuICAgIH1cbiAgICBjbGF1c2UuYm9keSA9IHRoaXMucGFyc2VCbG9jayhmYWxzZSk7XG4gICAgdGhpcy5leGl0U2NvcGUoKTtcbiAgICBub2RlLmhhbmRsZXIgPSB0aGlzLmZpbmlzaE5vZGUoY2xhdXNlLCBcIkNhdGNoQ2xhdXNlXCIpO1xuICB9XG4gIG5vZGUuZmluYWxpemVyID0gdGhpcy5lYXQodHlwZXMkMS5fZmluYWxseSkgPyB0aGlzLnBhcnNlQmxvY2soKSA6IG51bGw7XG4gIGlmICghbm9kZS5oYW5kbGVyICYmICFub2RlLmZpbmFsaXplcilcbiAgICB7IHRoaXMucmFpc2Uobm9kZS5zdGFydCwgXCJNaXNzaW5nIGNhdGNoIG9yIGZpbmFsbHkgY2xhdXNlXCIpOyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJUcnlTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VWYXJTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlLCBraW5kLCBhbGxvd01pc3NpbmdJbml0aWFsaXplcikge1xuICB0aGlzLm5leHQoKTtcbiAgdGhpcy5wYXJzZVZhcihub2RlLCBmYWxzZSwga2luZCwgYWxsb3dNaXNzaW5nSW5pdGlhbGl6ZXIpO1xuICB0aGlzLnNlbWljb2xvbigpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiVmFyaWFibGVEZWNsYXJhdGlvblwiKVxufTtcblxucHAkOC5wYXJzZVdoaWxlU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS50ZXN0ID0gdGhpcy5wYXJzZVBhcmVuRXhwcmVzc2lvbigpO1xuICB0aGlzLmxhYmVscy5wdXNoKGxvb3BMYWJlbCk7XG4gIG5vZGUuYm9keSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoXCJ3aGlsZVwiKTtcbiAgdGhpcy5sYWJlbHMucG9wKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJXaGlsZVN0YXRlbWVudFwiKVxufTtcblxucHAkOC5wYXJzZVdpdGhTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIGlmICh0aGlzLnN0cmljdCkgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiJ3dpdGgnIGluIHN0cmljdCBtb2RlXCIpOyB9XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLm9iamVjdCA9IHRoaXMucGFyc2VQYXJlbkV4cHJlc3Npb24oKTtcbiAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudChcIndpdGhcIik7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJXaXRoU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlRW1wdHlTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRW1wdHlTdGF0ZW1lbnRcIilcbn07XG5cbnBwJDgucGFyc2VMYWJlbGVkU3RhdGVtZW50ID0gZnVuY3Rpb24obm9kZSwgbWF5YmVOYW1lLCBleHByLCBjb250ZXh0KSB7XG4gIGZvciAodmFyIGkkMSA9IDAsIGxpc3QgPSB0aGlzLmxhYmVsczsgaSQxIDwgbGlzdC5sZW5ndGg7IGkkMSArPSAxKVxuICAgIHtcbiAgICB2YXIgbGFiZWwgPSBsaXN0W2kkMV07XG5cbiAgICBpZiAobGFiZWwubmFtZSA9PT0gbWF5YmVOYW1lKVxuICAgICAgeyB0aGlzLnJhaXNlKGV4cHIuc3RhcnQsIFwiTGFiZWwgJ1wiICsgbWF5YmVOYW1lICsgXCInIGlzIGFscmVhZHkgZGVjbGFyZWRcIik7XG4gIH0gfVxuICB2YXIga2luZCA9IHRoaXMudHlwZS5pc0xvb3AgPyBcImxvb3BcIiA6IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fc3dpdGNoID8gXCJzd2l0Y2hcIiA6IG51bGw7XG4gIGZvciAodmFyIGkgPSB0aGlzLmxhYmVscy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYWJlbCQxID0gdGhpcy5sYWJlbHNbaV07XG4gICAgaWYgKGxhYmVsJDEuc3RhdGVtZW50U3RhcnQgPT09IG5vZGUuc3RhcnQpIHtcbiAgICAgIC8vIFVwZGF0ZSBpbmZvcm1hdGlvbiBhYm91dCBwcmV2aW91cyBsYWJlbHMgb24gdGhpcyBub2RlXG4gICAgICBsYWJlbCQxLnN0YXRlbWVudFN0YXJ0ID0gdGhpcy5zdGFydDtcbiAgICAgIGxhYmVsJDEua2luZCA9IGtpbmQ7XG4gICAgfSBlbHNlIHsgYnJlYWsgfVxuICB9XG4gIHRoaXMubGFiZWxzLnB1c2goe25hbWU6IG1heWJlTmFtZSwga2luZDoga2luZCwgc3RhdGVtZW50U3RhcnQ6IHRoaXMuc3RhcnR9KTtcbiAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudChjb250ZXh0ID8gY29udGV4dC5pbmRleE9mKFwibGFiZWxcIikgPT09IC0xID8gY29udGV4dCArIFwibGFiZWxcIiA6IGNvbnRleHQgOiBcImxhYmVsXCIpO1xuICB0aGlzLmxhYmVscy5wb3AoKTtcbiAgbm9kZS5sYWJlbCA9IGV4cHI7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJMYWJlbGVkU3RhdGVtZW50XCIpXG59O1xuXG5wcCQ4LnBhcnNlRXhwcmVzc2lvblN0YXRlbWVudCA9IGZ1bmN0aW9uKG5vZGUsIGV4cHIpIHtcbiAgbm9kZS5leHByZXNzaW9uID0gZXhwcjtcbiAgdGhpcy5zZW1pY29sb24oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkV4cHJlc3Npb25TdGF0ZW1lbnRcIilcbn07XG5cbi8vIFBhcnNlIGEgc2VtaWNvbG9uLWVuY2xvc2VkIGJsb2NrIG9mIHN0YXRlbWVudHMsIGhhbmRsaW5nIGBcInVzZVxuLy8gc3RyaWN0XCJgIGRlY2xhcmF0aW9ucyB3aGVuIGBhbGxvd1N0cmljdGAgaXMgdHJ1ZSAodXNlZCBmb3Jcbi8vIGZ1bmN0aW9uIGJvZGllcykuXG5cbnBwJDgucGFyc2VCbG9jayA9IGZ1bmN0aW9uKGNyZWF0ZU5ld0xleGljYWxTY29wZSwgbm9kZSwgZXhpdFN0cmljdCkge1xuICBpZiAoIGNyZWF0ZU5ld0xleGljYWxTY29wZSA9PT0gdm9pZCAwICkgY3JlYXRlTmV3TGV4aWNhbFNjb3BlID0gdHJ1ZTtcbiAgaWYgKCBub2RlID09PSB2b2lkIDAgKSBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcblxuICBub2RlLmJvZHkgPSBbXTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5icmFjZUwpO1xuICBpZiAoY3JlYXRlTmV3TGV4aWNhbFNjb3BlKSB7IHRoaXMuZW50ZXJTY29wZSgwKTsgfVxuICB3aGlsZSAodGhpcy50eXBlICE9PSB0eXBlcyQxLmJyYWNlUikge1xuICAgIHZhciBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudChudWxsKTtcbiAgICBub2RlLmJvZHkucHVzaChzdG10KTtcbiAgfVxuICBpZiAoZXhpdFN0cmljdCkgeyB0aGlzLnN0cmljdCA9IGZhbHNlOyB9XG4gIHRoaXMubmV4dCgpO1xuICBpZiAoY3JlYXRlTmV3TGV4aWNhbFNjb3BlKSB7IHRoaXMuZXhpdFNjb3BlKCk7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkJsb2NrU3RhdGVtZW50XCIpXG59O1xuXG4vLyBQYXJzZSBhIHJlZ3VsYXIgYGZvcmAgbG9vcC4gVGhlIGRpc2FtYmlndWF0aW9uIGNvZGUgaW5cbi8vIGBwYXJzZVN0YXRlbWVudGAgd2lsbCBhbHJlYWR5IGhhdmUgcGFyc2VkIHRoZSBpbml0IHN0YXRlbWVudCBvclxuLy8gZXhwcmVzc2lvbi5cblxucHAkOC5wYXJzZUZvciA9IGZ1bmN0aW9uKG5vZGUsIGluaXQpIHtcbiAgbm9kZS5pbml0ID0gaW5pdDtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5zZW1pKTtcbiAgbm9kZS50ZXN0ID0gdGhpcy50eXBlID09PSB0eXBlcyQxLnNlbWkgPyBudWxsIDogdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgdGhpcy5leHBlY3QodHlwZXMkMS5zZW1pKTtcbiAgbm9kZS51cGRhdGUgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEucGFyZW5SID8gbnVsbCA6IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5SKTtcbiAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudChcImZvclwiKTtcbiAgdGhpcy5leGl0U2NvcGUoKTtcbiAgdGhpcy5sYWJlbHMucG9wKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJGb3JTdGF0ZW1lbnRcIilcbn07XG5cbi8vIFBhcnNlIGEgYGZvcmAvYGluYCBhbmQgYGZvcmAvYG9mYCBsb29wLCB3aGljaCBhcmUgYWxtb3N0XG4vLyBzYW1lIGZyb20gcGFyc2VyJ3MgcGVyc3BlY3RpdmUuXG5cbnBwJDgucGFyc2VGb3JJbiA9IGZ1bmN0aW9uKG5vZGUsIGluaXQpIHtcbiAgdmFyIGlzRm9ySW4gPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2luO1xuICB0aGlzLm5leHQoKTtcblxuICBpZiAoXG4gICAgaW5pdC50eXBlID09PSBcIlZhcmlhYmxlRGVjbGFyYXRpb25cIiAmJlxuICAgIGluaXQuZGVjbGFyYXRpb25zWzBdLmluaXQgIT0gbnVsbCAmJlxuICAgIChcbiAgICAgICFpc0ZvckluIHx8XG4gICAgICB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA4IHx8XG4gICAgICB0aGlzLnN0cmljdCB8fFxuICAgICAgaW5pdC5raW5kICE9PSBcInZhclwiIHx8XG4gICAgICBpbml0LmRlY2xhcmF0aW9uc1swXS5pZC50eXBlICE9PSBcIklkZW50aWZpZXJcIlxuICAgIClcbiAgKSB7XG4gICAgdGhpcy5yYWlzZShcbiAgICAgIGluaXQuc3RhcnQsXG4gICAgICAoKGlzRm9ySW4gPyBcImZvci1pblwiIDogXCJmb3Itb2ZcIikgKyBcIiBsb29wIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG1heSBub3QgaGF2ZSBhbiBpbml0aWFsaXplclwiKVxuICAgICk7XG4gIH1cbiAgbm9kZS5sZWZ0ID0gaW5pdDtcbiAgbm9kZS5yaWdodCA9IGlzRm9ySW4gPyB0aGlzLnBhcnNlRXhwcmVzc2lvbigpIDogdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5SKTtcbiAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudChcImZvclwiKTtcbiAgdGhpcy5leGl0U2NvcGUoKTtcbiAgdGhpcy5sYWJlbHMucG9wKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgaXNGb3JJbiA/IFwiRm9ySW5TdGF0ZW1lbnRcIiA6IFwiRm9yT2ZTdGF0ZW1lbnRcIilcbn07XG5cbi8vIFBhcnNlIGEgbGlzdCBvZiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMuXG5cbnBwJDgucGFyc2VWYXIgPSBmdW5jdGlvbihub2RlLCBpc0Zvciwga2luZCwgYWxsb3dNaXNzaW5nSW5pdGlhbGl6ZXIpIHtcbiAgbm9kZS5kZWNsYXJhdGlvbnMgPSBbXTtcbiAgbm9kZS5raW5kID0ga2luZDtcbiAgZm9yICg7Oykge1xuICAgIHZhciBkZWNsID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLnBhcnNlVmFySWQoZGVjbCwga2luZCk7XG4gICAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuZXEpKSB7XG4gICAgICBkZWNsLmluaXQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oaXNGb3IpO1xuICAgIH0gZWxzZSBpZiAoIWFsbG93TWlzc2luZ0luaXRpYWxpemVyICYmIGtpbmQgPT09IFwiY29uc3RcIiAmJiAhKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5faW4gfHwgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIHRoaXMuaXNDb250ZXh0dWFsKFwib2ZcIikpKSkge1xuICAgICAgdGhpcy51bmV4cGVjdGVkKCk7XG4gICAgfSBlbHNlIGlmICghYWxsb3dNaXNzaW5nSW5pdGlhbGl6ZXIgJiYgKGtpbmQgPT09IFwidXNpbmdcIiB8fCBraW5kID09PSBcImF3YWl0IHVzaW5nXCIpICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNyAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEuX2luICYmICF0aGlzLmlzQ29udGV4dHVhbChcIm9mXCIpKSB7XG4gICAgICB0aGlzLnJhaXNlKHRoaXMubGFzdFRva0VuZCwgKFwiTWlzc2luZyBpbml0aWFsaXplciBpbiBcIiArIGtpbmQgKyBcIiBkZWNsYXJhdGlvblwiKSk7XG4gICAgfSBlbHNlIGlmICghYWxsb3dNaXNzaW5nSW5pdGlhbGl6ZXIgJiYgZGVjbC5pZC50eXBlICE9PSBcIklkZW50aWZpZXJcIiAmJiAhKGlzRm9yICYmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2luIHx8IHRoaXMuaXNDb250ZXh0dWFsKFwib2ZcIikpKSkge1xuICAgICAgdGhpcy5yYWlzZSh0aGlzLmxhc3RUb2tFbmQsIFwiQ29tcGxleCBiaW5kaW5nIHBhdHRlcm5zIHJlcXVpcmUgYW4gaW5pdGlhbGl6YXRpb24gdmFsdWVcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlY2wuaW5pdCA9IG51bGw7XG4gICAgfVxuICAgIG5vZGUuZGVjbGFyYXRpb25zLnB1c2godGhpcy5maW5pc2hOb2RlKGRlY2wsIFwiVmFyaWFibGVEZWNsYXJhdG9yXCIpKTtcbiAgICBpZiAoIXRoaXMuZWF0KHR5cGVzJDEuY29tbWEpKSB7IGJyZWFrIH1cbiAgfVxuICByZXR1cm4gbm9kZVxufTtcblxucHAkOC5wYXJzZVZhcklkID0gZnVuY3Rpb24oZGVjbCwga2luZCkge1xuICBkZWNsLmlkID0ga2luZCA9PT0gXCJ1c2luZ1wiIHx8IGtpbmQgPT09IFwiYXdhaXQgdXNpbmdcIlxuICAgID8gdGhpcy5wYXJzZUlkZW50KClcbiAgICA6IHRoaXMucGFyc2VCaW5kaW5nQXRvbSgpO1xuXG4gIHRoaXMuY2hlY2tMVmFsUGF0dGVybihkZWNsLmlkLCBraW5kID09PSBcInZhclwiID8gQklORF9WQVIgOiBCSU5EX0xFWElDQUwsIGZhbHNlKTtcbn07XG5cbnZhciBGVU5DX1NUQVRFTUVOVCA9IDEsIEZVTkNfSEFOR0lOR19TVEFURU1FTlQgPSAyLCBGVU5DX05VTExBQkxFX0lEID0gNDtcblxuLy8gUGFyc2UgYSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvciBsaXRlcmFsIChkZXBlbmRpbmcgb24gdGhlXG4vLyBgc3RhdGVtZW50ICYgRlVOQ19TVEFURU1FTlRgKS5cblxuLy8gUmVtb3ZlIGBhbGxvd0V4cHJlc3Npb25Cb2R5YCBmb3IgNy4wLjAsIGFzIGl0IGlzIG9ubHkgY2FsbGVkIHdpdGggZmFsc2VcbnBwJDgucGFyc2VGdW5jdGlvbiA9IGZ1bmN0aW9uKG5vZGUsIHN0YXRlbWVudCwgYWxsb3dFeHByZXNzaW9uQm9keSwgaXNBc3luYywgZm9ySW5pdCkge1xuICB0aGlzLmluaXRGdW5jdGlvbihub2RlKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5IHx8IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmICFpc0FzeW5jKSB7XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdGFyICYmIChzdGF0ZW1lbnQgJiBGVU5DX0hBTkdJTkdfU1RBVEVNRU5UKSlcbiAgICAgIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICBub2RlLmdlbmVyYXRvciA9IHRoaXMuZWF0KHR5cGVzJDEuc3Rhcik7XG4gIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4KVxuICAgIHsgbm9kZS5hc3luYyA9ICEhaXNBc3luYzsgfVxuXG4gIGlmIChzdGF0ZW1lbnQgJiBGVU5DX1NUQVRFTUVOVCkge1xuICAgIG5vZGUuaWQgPSAoc3RhdGVtZW50ICYgRlVOQ19OVUxMQUJMRV9JRCkgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLm5hbWUgPyBudWxsIDogdGhpcy5wYXJzZUlkZW50KCk7XG4gICAgaWYgKG5vZGUuaWQgJiYgIShzdGF0ZW1lbnQgJiBGVU5DX0hBTkdJTkdfU1RBVEVNRU5UKSlcbiAgICAgIC8vIElmIGl0IGlzIGEgcmVndWxhciBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpbiBzbG9wcHkgbW9kZSwgdGhlbiBpdCBpc1xuICAgICAgLy8gc3ViamVjdCB0byBBbm5leCBCIHNlbWFudGljcyAoQklORF9GVU5DVElPTikuIE90aGVyd2lzZSwgdGhlIGJpbmRpbmdcbiAgICAgIC8vIG1vZGUgZGVwZW5kcyBvbiBwcm9wZXJ0aWVzIG9mIHRoZSBjdXJyZW50IHNjb3BlIChzZWVcbiAgICAgIC8vIHRyZWF0RnVuY3Rpb25zQXNWYXIpLlxuICAgICAgeyB0aGlzLmNoZWNrTFZhbFNpbXBsZShub2RlLmlkLCAodGhpcy5zdHJpY3QgfHwgbm9kZS5nZW5lcmF0b3IgfHwgbm9kZS5hc3luYykgPyB0aGlzLnRyZWF0RnVuY3Rpb25zQXNWYXIgPyBCSU5EX1ZBUiA6IEJJTkRfTEVYSUNBTCA6IEJJTkRfRlVOQ1RJT04pOyB9XG4gIH1cblxuICB2YXIgb2xkWWllbGRQb3MgPSB0aGlzLnlpZWxkUG9zLCBvbGRBd2FpdFBvcyA9IHRoaXMuYXdhaXRQb3MsIG9sZEF3YWl0SWRlbnRQb3MgPSB0aGlzLmF3YWl0SWRlbnRQb3M7XG4gIHRoaXMueWllbGRQb3MgPSAwO1xuICB0aGlzLmF3YWl0UG9zID0gMDtcbiAgdGhpcy5hd2FpdElkZW50UG9zID0gMDtcbiAgdGhpcy5lbnRlclNjb3BlKGZ1bmN0aW9uRmxhZ3Mobm9kZS5hc3luYywgbm9kZS5nZW5lcmF0b3IpKTtcblxuICBpZiAoIShzdGF0ZW1lbnQgJiBGVU5DX1NUQVRFTUVOVCkpXG4gICAgeyBub2RlLmlkID0gdGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUgPyB0aGlzLnBhcnNlSWRlbnQoKSA6IG51bGw7IH1cblxuICB0aGlzLnBhcnNlRnVuY3Rpb25QYXJhbXMobm9kZSk7XG4gIHRoaXMucGFyc2VGdW5jdGlvbkJvZHkobm9kZSwgYWxsb3dFeHByZXNzaW9uQm9keSwgZmFsc2UsIGZvckluaXQpO1xuXG4gIHRoaXMueWllbGRQb3MgPSBvbGRZaWVsZFBvcztcbiAgdGhpcy5hd2FpdFBvcyA9IG9sZEF3YWl0UG9zO1xuICB0aGlzLmF3YWl0SWRlbnRQb3MgPSBvbGRBd2FpdElkZW50UG9zO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIChzdGF0ZW1lbnQgJiBGVU5DX1NUQVRFTUVOVCkgPyBcIkZ1bmN0aW9uRGVjbGFyYXRpb25cIiA6IFwiRnVuY3Rpb25FeHByZXNzaW9uXCIpXG59O1xuXG5wcCQ4LnBhcnNlRnVuY3Rpb25QYXJhbXMgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5MKTtcbiAgbm9kZS5wYXJhbXMgPSB0aGlzLnBhcnNlQmluZGluZ0xpc3QodHlwZXMkMS5wYXJlblIsIGZhbHNlLCB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCk7XG4gIHRoaXMuY2hlY2tZaWVsZEF3YWl0SW5EZWZhdWx0UGFyYW1zKCk7XG59O1xuXG4vLyBQYXJzZSBhIGNsYXNzIGRlY2xhcmF0aW9uIG9yIGxpdGVyYWwgKGRlcGVuZGluZyBvbiB0aGVcbi8vIGBpc1N0YXRlbWVudGAgcGFyYW1ldGVyKS5cblxucHAkOC5wYXJzZUNsYXNzID0gZnVuY3Rpb24obm9kZSwgaXNTdGF0ZW1lbnQpIHtcbiAgdGhpcy5uZXh0KCk7XG5cbiAgLy8gZWNtYS0yNjIgMTQuNiBDbGFzcyBEZWZpbml0aW9uc1xuICAvLyBBIGNsYXNzIGRlZmluaXRpb24gaXMgYWx3YXlzIHN0cmljdCBtb2RlIGNvZGUuXG4gIHZhciBvbGRTdHJpY3QgPSB0aGlzLnN0cmljdDtcbiAgdGhpcy5zdHJpY3QgPSB0cnVlO1xuXG4gIHRoaXMucGFyc2VDbGFzc0lkKG5vZGUsIGlzU3RhdGVtZW50KTtcbiAgdGhpcy5wYXJzZUNsYXNzU3VwZXIobm9kZSk7XG4gIHZhciBwcml2YXRlTmFtZU1hcCA9IHRoaXMuZW50ZXJDbGFzc0JvZHkoKTtcbiAgdmFyIGNsYXNzQm9keSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHZhciBoYWRDb25zdHJ1Y3RvciA9IGZhbHNlO1xuICBjbGFzc0JvZHkuYm9keSA9IFtdO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNlTCk7XG4gIHdoaWxlICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuYnJhY2VSKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLnBhcnNlQ2xhc3NFbGVtZW50KG5vZGUuc3VwZXJDbGFzcyAhPT0gbnVsbCk7XG4gICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgIGNsYXNzQm9keS5ib2R5LnB1c2goZWxlbWVudCk7XG4gICAgICBpZiAoZWxlbWVudC50eXBlID09PSBcIk1ldGhvZERlZmluaXRpb25cIiAmJiBlbGVtZW50LmtpbmQgPT09IFwiY29uc3RydWN0b3JcIikge1xuICAgICAgICBpZiAoaGFkQ29uc3RydWN0b3IpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGVsZW1lbnQuc3RhcnQsIFwiRHVwbGljYXRlIGNvbnN0cnVjdG9yIGluIHRoZSBzYW1lIGNsYXNzXCIpOyB9XG4gICAgICAgIGhhZENvbnN0cnVjdG9yID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5rZXkgJiYgZWxlbWVudC5rZXkudHlwZSA9PT0gXCJQcml2YXRlSWRlbnRpZmllclwiICYmIGlzUHJpdmF0ZU5hbWVDb25mbGljdGVkKHByaXZhdGVOYW1lTWFwLCBlbGVtZW50KSkge1xuICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZWxlbWVudC5rZXkuc3RhcnQsIChcIklkZW50aWZpZXIgJyNcIiArIChlbGVtZW50LmtleS5uYW1lKSArIFwiJyBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkXCIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgdGhpcy5zdHJpY3QgPSBvbGRTdHJpY3Q7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLmJvZHkgPSB0aGlzLmZpbmlzaE5vZGUoY2xhc3NCb2R5LCBcIkNsYXNzQm9keVwiKTtcbiAgdGhpcy5leGl0Q2xhc3NCb2R5KCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgaXNTdGF0ZW1lbnQgPyBcIkNsYXNzRGVjbGFyYXRpb25cIiA6IFwiQ2xhc3NFeHByZXNzaW9uXCIpXG59O1xuXG5wcCQ4LnBhcnNlQ2xhc3NFbGVtZW50ID0gZnVuY3Rpb24oY29uc3RydWN0b3JBbGxvd3NTdXBlcikge1xuICBpZiAodGhpcy5lYXQodHlwZXMkMS5zZW1pKSkgeyByZXR1cm4gbnVsbCB9XG5cbiAgdmFyIGVjbWFWZXJzaW9uID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uO1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHZhciBrZXlOYW1lID0gXCJcIjtcbiAgdmFyIGlzR2VuZXJhdG9yID0gZmFsc2U7XG4gIHZhciBpc0FzeW5jID0gZmFsc2U7XG4gIHZhciBraW5kID0gXCJtZXRob2RcIjtcbiAgdmFyIGlzU3RhdGljID0gZmFsc2U7XG5cbiAgaWYgKHRoaXMuZWF0Q29udGV4dHVhbChcInN0YXRpY1wiKSkge1xuICAgIC8vIFBhcnNlIHN0YXRpYyBpbml0IGJsb2NrXG4gICAgaWYgKGVjbWFWZXJzaW9uID49IDEzICYmIHRoaXMuZWF0KHR5cGVzJDEuYnJhY2VMKSkge1xuICAgICAgdGhpcy5wYXJzZUNsYXNzU3RhdGljQmxvY2sobm9kZSk7XG4gICAgICByZXR1cm4gbm9kZVxuICAgIH1cbiAgICBpZiAodGhpcy5pc0NsYXNzRWxlbWVudE5hbWVTdGFydCgpIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdGFyKSB7XG4gICAgICBpc1N0YXRpYyA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtleU5hbWUgPSBcInN0YXRpY1wiO1xuICAgIH1cbiAgfVxuICBub2RlLnN0YXRpYyA9IGlzU3RhdGljO1xuICBpZiAoIWtleU5hbWUgJiYgZWNtYVZlcnNpb24gPj0gOCAmJiB0aGlzLmVhdENvbnRleHR1YWwoXCJhc3luY1wiKSkge1xuICAgIGlmICgodGhpcy5pc0NsYXNzRWxlbWVudE5hbWVTdGFydCgpIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdGFyKSAmJiAhdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSkge1xuICAgICAgaXNBc3luYyA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtleU5hbWUgPSBcImFzeW5jXCI7XG4gICAgfVxuICB9XG4gIGlmICgha2V5TmFtZSAmJiAoZWNtYVZlcnNpb24gPj0gOSB8fCAhaXNBc3luYykgJiYgdGhpcy5lYXQodHlwZXMkMS5zdGFyKSkge1xuICAgIGlzR2VuZXJhdG9yID0gdHJ1ZTtcbiAgfVxuICBpZiAoIWtleU5hbWUgJiYgIWlzQXN5bmMgJiYgIWlzR2VuZXJhdG9yKSB7XG4gICAgdmFyIGxhc3RWYWx1ZSA9IHRoaXMudmFsdWU7XG4gICAgaWYgKHRoaXMuZWF0Q29udGV4dHVhbChcImdldFwiKSB8fCB0aGlzLmVhdENvbnRleHR1YWwoXCJzZXRcIikpIHtcbiAgICAgIGlmICh0aGlzLmlzQ2xhc3NFbGVtZW50TmFtZVN0YXJ0KCkpIHtcbiAgICAgICAga2luZCA9IGxhc3RWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtleU5hbWUgPSBsYXN0VmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2UgZWxlbWVudCBuYW1lXG4gIGlmIChrZXlOYW1lKSB7XG4gICAgLy8gJ2FzeW5jJywgJ2dldCcsICdzZXQnLCBvciAnc3RhdGljJyB3ZXJlIG5vdCBhIGtleXdvcmQgY29udGV4dHVhbGx5LlxuICAgIC8vIFRoZSBsYXN0IHRva2VuIGlzIGFueSBvZiB0aG9zZS4gTWFrZSBpdCB0aGUgZWxlbWVudCBuYW1lLlxuICAgIG5vZGUuY29tcHV0ZWQgPSBmYWxzZTtcbiAgICBub2RlLmtleSA9IHRoaXMuc3RhcnROb2RlQXQodGhpcy5sYXN0VG9rU3RhcnQsIHRoaXMubGFzdFRva1N0YXJ0TG9jKTtcbiAgICBub2RlLmtleS5uYW1lID0ga2V5TmFtZTtcbiAgICB0aGlzLmZpbmlzaE5vZGUobm9kZS5rZXksIFwiSWRlbnRpZmllclwiKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnNlQ2xhc3NFbGVtZW50TmFtZShub2RlKTtcbiAgfVxuXG4gIC8vIFBhcnNlIGVsZW1lbnQgdmFsdWVcbiAgaWYgKGVjbWFWZXJzaW9uIDwgMTMgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLnBhcmVuTCB8fCBraW5kICE9PSBcIm1ldGhvZFwiIHx8IGlzR2VuZXJhdG9yIHx8IGlzQXN5bmMpIHtcbiAgICB2YXIgaXNDb25zdHJ1Y3RvciA9ICFub2RlLnN0YXRpYyAmJiBjaGVja0tleU5hbWUobm9kZSwgXCJjb25zdHJ1Y3RvclwiKTtcbiAgICB2YXIgYWxsb3dzRGlyZWN0U3VwZXIgPSBpc0NvbnN0cnVjdG9yICYmIGNvbnN0cnVjdG9yQWxsb3dzU3VwZXI7XG4gICAgLy8gQ291bGRuJ3QgbW92ZSB0aGlzIGNoZWNrIGludG8gdGhlICdwYXJzZUNsYXNzTWV0aG9kJyBtZXRob2QgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkuXG4gICAgaWYgKGlzQ29uc3RydWN0b3IgJiYga2luZCAhPT0gXCJtZXRob2RcIikgeyB0aGlzLnJhaXNlKG5vZGUua2V5LnN0YXJ0LCBcIkNvbnN0cnVjdG9yIGNhbid0IGhhdmUgZ2V0L3NldCBtb2RpZmllclwiKTsgfVxuICAgIG5vZGUua2luZCA9IGlzQ29uc3RydWN0b3IgPyBcImNvbnN0cnVjdG9yXCIgOiBraW5kO1xuICAgIHRoaXMucGFyc2VDbGFzc01ldGhvZChub2RlLCBpc0dlbmVyYXRvciwgaXNBc3luYywgYWxsb3dzRGlyZWN0U3VwZXIpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFyc2VDbGFzc0ZpZWxkKG5vZGUpO1xuICB9XG5cbiAgcmV0dXJuIG5vZGVcbn07XG5cbnBwJDguaXNDbGFzc0VsZW1lbnROYW1lU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIChcbiAgICB0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSB8fFxuICAgIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5wcml2YXRlSWQgfHxcbiAgICB0aGlzLnR5cGUgPT09IHR5cGVzJDEubnVtIHx8XG4gICAgdGhpcy50eXBlID09PSB0eXBlcyQxLnN0cmluZyB8fFxuICAgIHRoaXMudHlwZSA9PT0gdHlwZXMkMS5icmFja2V0TCB8fFxuICAgIHRoaXMudHlwZS5rZXl3b3JkXG4gIClcbn07XG5cbnBwJDgucGFyc2VDbGFzc0VsZW1lbnROYW1lID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnByaXZhdGVJZCkge1xuICAgIGlmICh0aGlzLnZhbHVlID09PSBcImNvbnN0cnVjdG9yXCIpIHtcbiAgICAgIHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJDbGFzc2VzIGNhbid0IGhhdmUgYW4gZWxlbWVudCBuYW1lZCAnI2NvbnN0cnVjdG9yJ1wiKTtcbiAgICB9XG4gICAgZWxlbWVudC5jb21wdXRlZCA9IGZhbHNlO1xuICAgIGVsZW1lbnQua2V5ID0gdGhpcy5wYXJzZVByaXZhdGVJZGVudCgpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFyc2VQcm9wZXJ0eU5hbWUoZWxlbWVudCk7XG4gIH1cbn07XG5cbnBwJDgucGFyc2VDbGFzc01ldGhvZCA9IGZ1bmN0aW9uKG1ldGhvZCwgaXNHZW5lcmF0b3IsIGlzQXN5bmMsIGFsbG93c0RpcmVjdFN1cGVyKSB7XG4gIC8vIENoZWNrIGtleSBhbmQgZmxhZ3NcbiAgdmFyIGtleSA9IG1ldGhvZC5rZXk7XG4gIGlmIChtZXRob2Qua2luZCA9PT0gXCJjb25zdHJ1Y3RvclwiKSB7XG4gICAgaWYgKGlzR2VuZXJhdG9yKSB7IHRoaXMucmFpc2Uoa2V5LnN0YXJ0LCBcIkNvbnN0cnVjdG9yIGNhbid0IGJlIGEgZ2VuZXJhdG9yXCIpOyB9XG4gICAgaWYgKGlzQXN5bmMpIHsgdGhpcy5yYWlzZShrZXkuc3RhcnQsIFwiQ29uc3RydWN0b3IgY2FuJ3QgYmUgYW4gYXN5bmMgbWV0aG9kXCIpOyB9XG4gIH0gZWxzZSBpZiAobWV0aG9kLnN0YXRpYyAmJiBjaGVja0tleU5hbWUobWV0aG9kLCBcInByb3RvdHlwZVwiKSkge1xuICAgIHRoaXMucmFpc2Uoa2V5LnN0YXJ0LCBcIkNsYXNzZXMgbWF5IG5vdCBoYXZlIGEgc3RhdGljIHByb3BlcnR5IG5hbWVkIHByb3RvdHlwZVwiKTtcbiAgfVxuXG4gIC8vIFBhcnNlIHZhbHVlXG4gIHZhciB2YWx1ZSA9IG1ldGhvZC52YWx1ZSA9IHRoaXMucGFyc2VNZXRob2QoaXNHZW5lcmF0b3IsIGlzQXN5bmMsIGFsbG93c0RpcmVjdFN1cGVyKTtcblxuICAvLyBDaGVjayB2YWx1ZVxuICBpZiAobWV0aG9kLmtpbmQgPT09IFwiZ2V0XCIgJiYgdmFsdWUucGFyYW1zLmxlbmd0aCAhPT0gMClcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh2YWx1ZS5zdGFydCwgXCJnZXR0ZXIgc2hvdWxkIGhhdmUgbm8gcGFyYW1zXCIpOyB9XG4gIGlmIChtZXRob2Qua2luZCA9PT0gXCJzZXRcIiAmJiB2YWx1ZS5wYXJhbXMubGVuZ3RoICE9PSAxKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHZhbHVlLnN0YXJ0LCBcInNldHRlciBzaG91bGQgaGF2ZSBleGFjdGx5IG9uZSBwYXJhbVwiKTsgfVxuICBpZiAobWV0aG9kLmtpbmQgPT09IFwic2V0XCIgJiYgdmFsdWUucGFyYW1zWzBdLnR5cGUgPT09IFwiUmVzdEVsZW1lbnRcIilcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh2YWx1ZS5wYXJhbXNbMF0uc3RhcnQsIFwiU2V0dGVyIGNhbm5vdCB1c2UgcmVzdCBwYXJhbXNcIik7IH1cblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG1ldGhvZCwgXCJNZXRob2REZWZpbml0aW9uXCIpXG59O1xuXG5wcCQ4LnBhcnNlQ2xhc3NGaWVsZCA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gIGlmIChjaGVja0tleU5hbWUoZmllbGQsIFwiY29uc3RydWN0b3JcIikpIHtcbiAgICB0aGlzLnJhaXNlKGZpZWxkLmtleS5zdGFydCwgXCJDbGFzc2VzIGNhbid0IGhhdmUgYSBmaWVsZCBuYW1lZCAnY29uc3RydWN0b3InXCIpO1xuICB9IGVsc2UgaWYgKGZpZWxkLnN0YXRpYyAmJiBjaGVja0tleU5hbWUoZmllbGQsIFwicHJvdG90eXBlXCIpKSB7XG4gICAgdGhpcy5yYWlzZShmaWVsZC5rZXkuc3RhcnQsIFwiQ2xhc3NlcyBjYW4ndCBoYXZlIGEgc3RhdGljIGZpZWxkIG5hbWVkICdwcm90b3R5cGUnXCIpO1xuICB9XG5cbiAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuZXEpKSB7XG4gICAgLy8gVG8gcmFpc2UgU3ludGF4RXJyb3IgaWYgJ2FyZ3VtZW50cycgZXhpc3RzIGluIHRoZSBpbml0aWFsaXplci5cbiAgICB0aGlzLmVudGVyU2NvcGUoU0NPUEVfQ0xBU1NfRklFTERfSU5JVCB8IFNDT1BFX1NVUEVSKTtcbiAgICBmaWVsZC52YWx1ZSA9IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuICAgIHRoaXMuZXhpdFNjb3BlKCk7XG4gIH0gZWxzZSB7XG4gICAgZmllbGQudmFsdWUgPSBudWxsO1xuICB9XG4gIHRoaXMuc2VtaWNvbG9uKCk7XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShmaWVsZCwgXCJQcm9wZXJ0eURlZmluaXRpb25cIilcbn07XG5cbnBwJDgucGFyc2VDbGFzc1N0YXRpY0Jsb2NrID0gZnVuY3Rpb24obm9kZSkge1xuICBub2RlLmJvZHkgPSBbXTtcblxuICB2YXIgb2xkTGFiZWxzID0gdGhpcy5sYWJlbHM7XG4gIHRoaXMubGFiZWxzID0gW107XG4gIHRoaXMuZW50ZXJTY29wZShTQ09QRV9DTEFTU19TVEFUSUNfQkxPQ0sgfCBTQ09QRV9TVVBFUik7XG4gIHdoaWxlICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuYnJhY2VSKSB7XG4gICAgdmFyIHN0bXQgPSB0aGlzLnBhcnNlU3RhdGVtZW50KG51bGwpO1xuICAgIG5vZGUuYm9keS5wdXNoKHN0bXQpO1xuICB9XG4gIHRoaXMubmV4dCgpO1xuICB0aGlzLmV4aXRTY29wZSgpO1xuICB0aGlzLmxhYmVscyA9IG9sZExhYmVscztcblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiU3RhdGljQmxvY2tcIilcbn07XG5cbnBwJDgucGFyc2VDbGFzc0lkID0gZnVuY3Rpb24obm9kZSwgaXNTdGF0ZW1lbnQpIHtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lKSB7XG4gICAgbm9kZS5pZCA9IHRoaXMucGFyc2VJZGVudCgpO1xuICAgIGlmIChpc1N0YXRlbWVudClcbiAgICAgIHsgdGhpcy5jaGVja0xWYWxTaW1wbGUobm9kZS5pZCwgQklORF9MRVhJQ0FMLCBmYWxzZSk7IH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoaXNTdGF0ZW1lbnQgPT09IHRydWUpXG4gICAgICB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgbm9kZS5pZCA9IG51bGw7XG4gIH1cbn07XG5cbnBwJDgucGFyc2VDbGFzc1N1cGVyID0gZnVuY3Rpb24obm9kZSkge1xuICBub2RlLnN1cGVyQ2xhc3MgPSB0aGlzLmVhdCh0eXBlcyQxLl9leHRlbmRzKSA/IHRoaXMucGFyc2VFeHByU3Vic2NyaXB0cyhudWxsLCBmYWxzZSkgOiBudWxsO1xufTtcblxucHAkOC5lbnRlckNsYXNzQm9keSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZWxlbWVudCA9IHtkZWNsYXJlZDogT2JqZWN0LmNyZWF0ZShudWxsKSwgdXNlZDogW119O1xuICB0aGlzLnByaXZhdGVOYW1lU3RhY2sucHVzaChlbGVtZW50KTtcbiAgcmV0dXJuIGVsZW1lbnQuZGVjbGFyZWRcbn07XG5cbnBwJDguZXhpdENsYXNzQm9keSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVmID0gdGhpcy5wcml2YXRlTmFtZVN0YWNrLnBvcCgpO1xuICB2YXIgZGVjbGFyZWQgPSByZWYuZGVjbGFyZWQ7XG4gIHZhciB1c2VkID0gcmVmLnVzZWQ7XG4gIGlmICghdGhpcy5vcHRpb25zLmNoZWNrUHJpdmF0ZUZpZWxkcykgeyByZXR1cm4gfVxuICB2YXIgbGVuID0gdGhpcy5wcml2YXRlTmFtZVN0YWNrLmxlbmd0aDtcbiAgdmFyIHBhcmVudCA9IGxlbiA9PT0gMCA/IG51bGwgOiB0aGlzLnByaXZhdGVOYW1lU3RhY2tbbGVuIC0gMV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlZC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpZCA9IHVzZWRbaV07XG4gICAgaWYgKCFoYXNPd24oZGVjbGFyZWQsIGlkLm5hbWUpKSB7XG4gICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIHBhcmVudC51c2VkLnB1c2goaWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGlkLnN0YXJ0LCAoXCJQcml2YXRlIGZpZWxkICcjXCIgKyAoaWQubmFtZSkgKyBcIicgbXVzdCBiZSBkZWNsYXJlZCBpbiBhbiBlbmNsb3NpbmcgY2xhc3NcIikpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gaXNQcml2YXRlTmFtZUNvbmZsaWN0ZWQocHJpdmF0ZU5hbWVNYXAsIGVsZW1lbnQpIHtcbiAgdmFyIG5hbWUgPSBlbGVtZW50LmtleS5uYW1lO1xuICB2YXIgY3VyciA9IHByaXZhdGVOYW1lTWFwW25hbWVdO1xuXG4gIHZhciBuZXh0ID0gXCJ0cnVlXCI7XG4gIGlmIChlbGVtZW50LnR5cGUgPT09IFwiTWV0aG9kRGVmaW5pdGlvblwiICYmIChlbGVtZW50LmtpbmQgPT09IFwiZ2V0XCIgfHwgZWxlbWVudC5raW5kID09PSBcInNldFwiKSkge1xuICAgIG5leHQgPSAoZWxlbWVudC5zdGF0aWMgPyBcInNcIiA6IFwiaVwiKSArIGVsZW1lbnQua2luZDtcbiAgfVxuXG4gIC8vIGBjbGFzcyB7IGdldCAjYSgpe307IHN0YXRpYyBzZXQgI2EoXyl7fSB9YCBpcyBhbHNvIGNvbmZsaWN0LlxuICBpZiAoXG4gICAgY3VyciA9PT0gXCJpZ2V0XCIgJiYgbmV4dCA9PT0gXCJpc2V0XCIgfHxcbiAgICBjdXJyID09PSBcImlzZXRcIiAmJiBuZXh0ID09PSBcImlnZXRcIiB8fFxuICAgIGN1cnIgPT09IFwic2dldFwiICYmIG5leHQgPT09IFwic3NldFwiIHx8XG4gICAgY3VyciA9PT0gXCJzc2V0XCIgJiYgbmV4dCA9PT0gXCJzZ2V0XCJcbiAgKSB7XG4gICAgcHJpdmF0ZU5hbWVNYXBbbmFtZV0gPSBcInRydWVcIjtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSBlbHNlIGlmICghY3Vycikge1xuICAgIHByaXZhdGVOYW1lTWFwW25hbWVdID0gbmV4dDtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrS2V5TmFtZShub2RlLCBuYW1lKSB7XG4gIHZhciBjb21wdXRlZCA9IG5vZGUuY29tcHV0ZWQ7XG4gIHZhciBrZXkgPSBub2RlLmtleTtcbiAgcmV0dXJuICFjb21wdXRlZCAmJiAoXG4gICAga2V5LnR5cGUgPT09IFwiSWRlbnRpZmllclwiICYmIGtleS5uYW1lID09PSBuYW1lIHx8XG4gICAga2V5LnR5cGUgPT09IFwiTGl0ZXJhbFwiICYmIGtleS52YWx1ZSA9PT0gbmFtZVxuICApXG59XG5cbi8vIFBhcnNlcyBtb2R1bGUgZXhwb3J0IGRlY2xhcmF0aW9uLlxuXG5wcCQ4LnBhcnNlRXhwb3J0QWxsRGVjbGFyYXRpb24gPSBmdW5jdGlvbihub2RlLCBleHBvcnRzKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTEpIHtcbiAgICBpZiAodGhpcy5lYXRDb250ZXh0dWFsKFwiYXNcIikpIHtcbiAgICAgIG5vZGUuZXhwb3J0ZWQgPSB0aGlzLnBhcnNlTW9kdWxlRXhwb3J0TmFtZSgpO1xuICAgICAgdGhpcy5jaGVja0V4cG9ydChleHBvcnRzLCBub2RlLmV4cG9ydGVkLCB0aGlzLmxhc3RUb2tTdGFydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuZXhwb3J0ZWQgPSBudWxsO1xuICAgIH1cbiAgfVxuICB0aGlzLmV4cGVjdENvbnRleHR1YWwoXCJmcm9tXCIpO1xuICBpZiAodGhpcy50eXBlICE9PSB0eXBlcyQxLnN0cmluZykgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICBub2RlLnNvdXJjZSA9IHRoaXMucGFyc2VFeHByQXRvbSgpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2KVxuICAgIHsgbm9kZS5hdHRyaWJ1dGVzID0gdGhpcy5wYXJzZVdpdGhDbGF1c2UoKTsgfVxuICB0aGlzLnNlbWljb2xvbigpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRXhwb3J0QWxsRGVjbGFyYXRpb25cIilcbn07XG5cbnBwJDgucGFyc2VFeHBvcnQgPSBmdW5jdGlvbihub2RlLCBleHBvcnRzKSB7XG4gIHRoaXMubmV4dCgpO1xuICAvLyBleHBvcnQgKiBmcm9tICcuLi4nXG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLnN0YXIpKSB7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VFeHBvcnRBbGxEZWNsYXJhdGlvbihub2RlLCBleHBvcnRzKVxuICB9XG4gIGlmICh0aGlzLmVhdCh0eXBlcyQxLl9kZWZhdWx0KSkgeyAvLyBleHBvcnQgZGVmYXVsdCAuLi5cbiAgICB0aGlzLmNoZWNrRXhwb3J0KGV4cG9ydHMsIFwiZGVmYXVsdFwiLCB0aGlzLmxhc3RUb2tTdGFydCk7XG4gICAgbm9kZS5kZWNsYXJhdGlvbiA9IHRoaXMucGFyc2VFeHBvcnREZWZhdWx0RGVjbGFyYXRpb24oKTtcbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRXhwb3J0RGVmYXVsdERlY2xhcmF0aW9uXCIpXG4gIH1cbiAgLy8gZXhwb3J0IHZhcnxjb25zdHxsZXR8ZnVuY3Rpb258Y2xhc3MgLi4uXG4gIGlmICh0aGlzLnNob3VsZFBhcnNlRXhwb3J0U3RhdGVtZW50KCkpIHtcbiAgICBub2RlLmRlY2xhcmF0aW9uID0gdGhpcy5wYXJzZUV4cG9ydERlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmIChub2RlLmRlY2xhcmF0aW9uLnR5cGUgPT09IFwiVmFyaWFibGVEZWNsYXJhdGlvblwiKVxuICAgICAgeyB0aGlzLmNoZWNrVmFyaWFibGVFeHBvcnQoZXhwb3J0cywgbm9kZS5kZWNsYXJhdGlvbi5kZWNsYXJhdGlvbnMpOyB9XG4gICAgZWxzZVxuICAgICAgeyB0aGlzLmNoZWNrRXhwb3J0KGV4cG9ydHMsIG5vZGUuZGVjbGFyYXRpb24uaWQsIG5vZGUuZGVjbGFyYXRpb24uaWQuc3RhcnQpOyB9XG4gICAgbm9kZS5zcGVjaWZpZXJzID0gW107XG4gICAgbm9kZS5zb3VyY2UgPSBudWxsO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTYpXG4gICAgICB7IG5vZGUuYXR0cmlidXRlcyA9IFtdOyB9XG4gIH0gZWxzZSB7IC8vIGV4cG9ydCB7IHgsIHkgYXMgeiB9IFtmcm9tICcuLi4nXVxuICAgIG5vZGUuZGVjbGFyYXRpb24gPSBudWxsO1xuICAgIG5vZGUuc3BlY2lmaWVycyA9IHRoaXMucGFyc2VFeHBvcnRTcGVjaWZpZXJzKGV4cG9ydHMpO1xuICAgIGlmICh0aGlzLmVhdENvbnRleHR1YWwoXCJmcm9tXCIpKSB7XG4gICAgICBpZiAodGhpcy50eXBlICE9PSB0eXBlcyQxLnN0cmluZykgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgICAgbm9kZS5zb3VyY2UgPSB0aGlzLnBhcnNlRXhwckF0b20oKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTYpXG4gICAgICAgIHsgbm9kZS5hdHRyaWJ1dGVzID0gdGhpcy5wYXJzZVdpdGhDbGF1c2UoKTsgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IG5vZGUuc3BlY2lmaWVyczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgLy8gY2hlY2sgZm9yIGtleXdvcmRzIHVzZWQgYXMgbG9jYWwgbmFtZXNcbiAgICAgICAgdmFyIHNwZWMgPSBsaXN0W2ldO1xuXG4gICAgICAgIHRoaXMuY2hlY2tVbnJlc2VydmVkKHNwZWMubG9jYWwpO1xuICAgICAgICAvLyBjaGVjayBpZiBleHBvcnQgaXMgZGVmaW5lZFxuICAgICAgICB0aGlzLmNoZWNrTG9jYWxFeHBvcnQoc3BlYy5sb2NhbCk7XG5cbiAgICAgICAgaWYgKHNwZWMubG9jYWwudHlwZSA9PT0gXCJMaXRlcmFsXCIpIHtcbiAgICAgICAgICB0aGlzLnJhaXNlKHNwZWMubG9jYWwuc3RhcnQsIFwiQSBzdHJpbmcgbGl0ZXJhbCBjYW5ub3QgYmUgdXNlZCBhcyBhbiBleHBvcnRlZCBiaW5kaW5nIHdpdGhvdXQgYGZyb21gLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBub2RlLnNvdXJjZSA9IG51bGw7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2KVxuICAgICAgICB7IG5vZGUuYXR0cmlidXRlcyA9IFtdOyB9XG4gICAgfVxuICAgIHRoaXMuc2VtaWNvbG9uKCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkV4cG9ydE5hbWVkRGVjbGFyYXRpb25cIilcbn07XG5cbnBwJDgucGFyc2VFeHBvcnREZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgcmV0dXJuIHRoaXMucGFyc2VTdGF0ZW1lbnQobnVsbClcbn07XG5cbnBwJDgucGFyc2VFeHBvcnREZWZhdWx0RGVjbGFyYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGlzQXN5bmM7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2Z1bmN0aW9uIHx8IChpc0FzeW5jID0gdGhpcy5pc0FzeW5jRnVuY3Rpb24oKSkpIHtcbiAgICB2YXIgZk5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIGlmIChpc0FzeW5jKSB7IHRoaXMubmV4dCgpOyB9XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGdW5jdGlvbihmTm9kZSwgRlVOQ19TVEFURU1FTlQgfCBGVU5DX05VTExBQkxFX0lELCBmYWxzZSwgaXNBc3luYylcbiAgfSBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuX2NsYXNzKSB7XG4gICAgdmFyIGNOb2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUNsYXNzKGNOb2RlLCBcIm51bGxhYmxlSURcIilcbiAgfSBlbHNlIHtcbiAgICB2YXIgZGVjbGFyYXRpb24gPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcbiAgICB0aGlzLnNlbWljb2xvbigpO1xuICAgIHJldHVybiBkZWNsYXJhdGlvblxuICB9XG59O1xuXG5wcCQ4LmNoZWNrRXhwb3J0ID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgcG9zKSB7XG4gIGlmICghZXhwb3J0cykgeyByZXR1cm4gfVxuICBpZiAodHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIpXG4gICAgeyBuYW1lID0gbmFtZS50eXBlID09PSBcIklkZW50aWZpZXJcIiA/IG5hbWUubmFtZSA6IG5hbWUudmFsdWU7IH1cbiAgaWYgKGhhc093bihleHBvcnRzLCBuYW1lKSlcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShwb3MsIFwiRHVwbGljYXRlIGV4cG9ydCAnXCIgKyBuYW1lICsgXCInXCIpOyB9XG4gIGV4cG9ydHNbbmFtZV0gPSB0cnVlO1xufTtcblxucHAkOC5jaGVja1BhdHRlcm5FeHBvcnQgPSBmdW5jdGlvbihleHBvcnRzLCBwYXQpIHtcbiAgdmFyIHR5cGUgPSBwYXQudHlwZTtcbiAgaWYgKHR5cGUgPT09IFwiSWRlbnRpZmllclwiKVxuICAgIHsgdGhpcy5jaGVja0V4cG9ydChleHBvcnRzLCBwYXQsIHBhdC5zdGFydCk7IH1cbiAgZWxzZSBpZiAodHlwZSA9PT0gXCJPYmplY3RQYXR0ZXJuXCIpXG4gICAgeyBmb3IgKHZhciBpID0gMCwgbGlzdCA9IHBhdC5wcm9wZXJ0aWVzOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSlcbiAgICAgIHtcbiAgICAgICAgdmFyIHByb3AgPSBsaXN0W2ldO1xuXG4gICAgICAgIHRoaXMuY2hlY2tQYXR0ZXJuRXhwb3J0KGV4cG9ydHMsIHByb3ApO1xuICAgICAgfSB9XG4gIGVsc2UgaWYgKHR5cGUgPT09IFwiQXJyYXlQYXR0ZXJuXCIpXG4gICAgeyBmb3IgKHZhciBpJDEgPSAwLCBsaXN0JDEgPSBwYXQuZWxlbWVudHM7IGkkMSA8IGxpc3QkMS5sZW5ndGg7IGkkMSArPSAxKSB7XG4gICAgICB2YXIgZWx0ID0gbGlzdCQxW2kkMV07XG5cbiAgICAgICAgaWYgKGVsdCkgeyB0aGlzLmNoZWNrUGF0dGVybkV4cG9ydChleHBvcnRzLCBlbHQpOyB9XG4gICAgfSB9XG4gIGVsc2UgaWYgKHR5cGUgPT09IFwiUHJvcGVydHlcIilcbiAgICB7IHRoaXMuY2hlY2tQYXR0ZXJuRXhwb3J0KGV4cG9ydHMsIHBhdC52YWx1ZSk7IH1cbiAgZWxzZSBpZiAodHlwZSA9PT0gXCJBc3NpZ25tZW50UGF0dGVyblwiKVxuICAgIHsgdGhpcy5jaGVja1BhdHRlcm5FeHBvcnQoZXhwb3J0cywgcGF0LmxlZnQpOyB9XG4gIGVsc2UgaWYgKHR5cGUgPT09IFwiUmVzdEVsZW1lbnRcIilcbiAgICB7IHRoaXMuY2hlY2tQYXR0ZXJuRXhwb3J0KGV4cG9ydHMsIHBhdC5hcmd1bWVudCk7IH1cbn07XG5cbnBwJDguY2hlY2tWYXJpYWJsZUV4cG9ydCA9IGZ1bmN0aW9uKGV4cG9ydHMsIGRlY2xzKSB7XG4gIGlmICghZXhwb3J0cykgeyByZXR1cm4gfVxuICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IGRlY2xzOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSlcbiAgICB7XG4gICAgdmFyIGRlY2wgPSBsaXN0W2ldO1xuXG4gICAgdGhpcy5jaGVja1BhdHRlcm5FeHBvcnQoZXhwb3J0cywgZGVjbC5pZCk7XG4gIH1cbn07XG5cbnBwJDguc2hvdWxkUGFyc2VFeHBvcnRTdGF0ZW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudHlwZS5rZXl3b3JkID09PSBcInZhclwiIHx8XG4gICAgdGhpcy50eXBlLmtleXdvcmQgPT09IFwiY29uc3RcIiB8fFxuICAgIHRoaXMudHlwZS5rZXl3b3JkID09PSBcImNsYXNzXCIgfHxcbiAgICB0aGlzLnR5cGUua2V5d29yZCA9PT0gXCJmdW5jdGlvblwiIHx8XG4gICAgdGhpcy5pc0xldCgpIHx8XG4gICAgdGhpcy5pc0FzeW5jRnVuY3Rpb24oKVxufTtcblxuLy8gUGFyc2VzIGEgY29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgbW9kdWxlIGV4cG9ydHMuXG5cbnBwJDgucGFyc2VFeHBvcnRTcGVjaWZpZXIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgbm9kZS5sb2NhbCA9IHRoaXMucGFyc2VNb2R1bGVFeHBvcnROYW1lKCk7XG5cbiAgbm9kZS5leHBvcnRlZCA9IHRoaXMuZWF0Q29udGV4dHVhbChcImFzXCIpID8gdGhpcy5wYXJzZU1vZHVsZUV4cG9ydE5hbWUoKSA6IG5vZGUubG9jYWw7XG4gIHRoaXMuY2hlY2tFeHBvcnQoXG4gICAgZXhwb3J0cyxcbiAgICBub2RlLmV4cG9ydGVkLFxuICAgIG5vZGUuZXhwb3J0ZWQuc3RhcnRcbiAgKTtcblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiRXhwb3J0U3BlY2lmaWVyXCIpXG59O1xuXG5wcCQ4LnBhcnNlRXhwb3J0U3BlY2lmaWVycyA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiAgdmFyIG5vZGVzID0gW10sIGZpcnN0ID0gdHJ1ZTtcbiAgLy8gZXhwb3J0IHsgeCwgeSBhcyB6IH0gW2Zyb20gJy4uLiddXG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2VMKTtcbiAgd2hpbGUgKCF0aGlzLmVhdCh0eXBlcyQxLmJyYWNlUikpIHtcbiAgICBpZiAoIWZpcnN0KSB7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgIGlmICh0aGlzLmFmdGVyVHJhaWxpbmdDb21tYSh0eXBlcyQxLmJyYWNlUikpIHsgYnJlYWsgfVxuICAgIH0gZWxzZSB7IGZpcnN0ID0gZmFsc2U7IH1cblxuICAgIG5vZGVzLnB1c2godGhpcy5wYXJzZUV4cG9ydFNwZWNpZmllcihleHBvcnRzKSk7XG4gIH1cbiAgcmV0dXJuIG5vZGVzXG59O1xuXG4vLyBQYXJzZXMgaW1wb3J0IGRlY2xhcmF0aW9uLlxuXG5wcCQ4LnBhcnNlSW1wb3J0ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTtcblxuICAvLyBpbXBvcnQgJy4uLidcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zdHJpbmcpIHtcbiAgICBub2RlLnNwZWNpZmllcnMgPSBlbXB0eSQxO1xuICAgIG5vZGUuc291cmNlID0gdGhpcy5wYXJzZUV4cHJBdG9tKCk7XG4gIH0gZWxzZSB7XG4gICAgbm9kZS5zcGVjaWZpZXJzID0gdGhpcy5wYXJzZUltcG9ydFNwZWNpZmllcnMoKTtcbiAgICB0aGlzLmV4cGVjdENvbnRleHR1YWwoXCJmcm9tXCIpO1xuICAgIG5vZGUuc291cmNlID0gdGhpcy50eXBlID09PSB0eXBlcyQxLnN0cmluZyA/IHRoaXMucGFyc2VFeHByQXRvbSgpIDogdGhpcy51bmV4cGVjdGVkKCk7XG4gIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNilcbiAgICB7IG5vZGUuYXR0cmlidXRlcyA9IHRoaXMucGFyc2VXaXRoQ2xhdXNlKCk7IH1cbiAgdGhpcy5zZW1pY29sb24oKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkltcG9ydERlY2xhcmF0aW9uXCIpXG59O1xuXG4vLyBQYXJzZXMgYSBjb21tYS1zZXBhcmF0ZWQgbGlzdCBvZiBtb2R1bGUgaW1wb3J0cy5cblxucHAkOC5wYXJzZUltcG9ydFNwZWNpZmllciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIG5vZGUuaW1wb3J0ZWQgPSB0aGlzLnBhcnNlTW9kdWxlRXhwb3J0TmFtZSgpO1xuXG4gIGlmICh0aGlzLmVhdENvbnRleHR1YWwoXCJhc1wiKSkge1xuICAgIG5vZGUubG9jYWwgPSB0aGlzLnBhcnNlSWRlbnQoKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmNoZWNrVW5yZXNlcnZlZChub2RlLmltcG9ydGVkKTtcbiAgICBub2RlLmxvY2FsID0gbm9kZS5pbXBvcnRlZDtcbiAgfVxuICB0aGlzLmNoZWNrTFZhbFNpbXBsZShub2RlLmxvY2FsLCBCSU5EX0xFWElDQUwpO1xuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJbXBvcnRTcGVjaWZpZXJcIilcbn07XG5cbnBwJDgucGFyc2VJbXBvcnREZWZhdWx0U3BlY2lmaWVyID0gZnVuY3Rpb24oKSB7XG4gIC8vIGltcG9ydCBkZWZhdWx0T2JqLCB7IHgsIHkgYXMgeiB9IGZyb20gJy4uLidcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICBub2RlLmxvY2FsID0gdGhpcy5wYXJzZUlkZW50KCk7XG4gIHRoaXMuY2hlY2tMVmFsU2ltcGxlKG5vZGUubG9jYWwsIEJJTkRfTEVYSUNBTCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJbXBvcnREZWZhdWx0U3BlY2lmaWVyXCIpXG59O1xuXG5wcCQ4LnBhcnNlSW1wb3J0TmFtZXNwYWNlU3BlY2lmaWVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0KCk7XG4gIHRoaXMuZXhwZWN0Q29udGV4dHVhbChcImFzXCIpO1xuICBub2RlLmxvY2FsID0gdGhpcy5wYXJzZUlkZW50KCk7XG4gIHRoaXMuY2hlY2tMVmFsU2ltcGxlKG5vZGUubG9jYWwsIEJJTkRfTEVYSUNBTCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJbXBvcnROYW1lc3BhY2VTcGVjaWZpZXJcIilcbn07XG5cbnBwJDgucGFyc2VJbXBvcnRTcGVjaWZpZXJzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IFtdLCBmaXJzdCA9IHRydWU7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSkge1xuICAgIG5vZGVzLnB1c2godGhpcy5wYXJzZUltcG9ydERlZmF1bHRTcGVjaWZpZXIoKSk7XG4gICAgaWYgKCF0aGlzLmVhdCh0eXBlcyQxLmNvbW1hKSkgeyByZXR1cm4gbm9kZXMgfVxuICB9XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3Rhcikge1xuICAgIG5vZGVzLnB1c2godGhpcy5wYXJzZUltcG9ydE5hbWVzcGFjZVNwZWNpZmllcigpKTtcbiAgICByZXR1cm4gbm9kZXNcbiAgfVxuICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNlTCk7XG4gIHdoaWxlICghdGhpcy5lYXQodHlwZXMkMS5icmFjZVIpKSB7XG4gICAgaWYgKCFmaXJzdCkge1xuICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICBpZiAodGhpcy5hZnRlclRyYWlsaW5nQ29tbWEodHlwZXMkMS5icmFjZVIpKSB7IGJyZWFrIH1cbiAgICB9IGVsc2UgeyBmaXJzdCA9IGZhbHNlOyB9XG5cbiAgICBub2Rlcy5wdXNoKHRoaXMucGFyc2VJbXBvcnRTcGVjaWZpZXIoKSk7XG4gIH1cbiAgcmV0dXJuIG5vZGVzXG59O1xuXG5wcCQ4LnBhcnNlV2l0aENsYXVzZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZXMgPSBbXTtcbiAgaWYgKCF0aGlzLmVhdCh0eXBlcyQxLl93aXRoKSkge1xuICAgIHJldHVybiBub2Rlc1xuICB9XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2VMKTtcbiAgdmFyIGF0dHJpYnV0ZUtleXMgPSB7fTtcbiAgdmFyIGZpcnN0ID0gdHJ1ZTtcbiAgd2hpbGUgKCF0aGlzLmVhdCh0eXBlcyQxLmJyYWNlUikpIHtcbiAgICBpZiAoIWZpcnN0KSB7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgIGlmICh0aGlzLmFmdGVyVHJhaWxpbmdDb21tYSh0eXBlcyQxLmJyYWNlUikpIHsgYnJlYWsgfVxuICAgIH0gZWxzZSB7IGZpcnN0ID0gZmFsc2U7IH1cblxuICAgIHZhciBhdHRyID0gdGhpcy5wYXJzZUltcG9ydEF0dHJpYnV0ZSgpO1xuICAgIHZhciBrZXlOYW1lID0gYXR0ci5rZXkudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgPyBhdHRyLmtleS5uYW1lIDogYXR0ci5rZXkudmFsdWU7XG4gICAgaWYgKGhhc093bihhdHRyaWJ1dGVLZXlzLCBrZXlOYW1lKSlcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGF0dHIua2V5LnN0YXJ0LCBcIkR1cGxpY2F0ZSBhdHRyaWJ1dGUga2V5ICdcIiArIGtleU5hbWUgKyBcIidcIik7IH1cbiAgICBhdHRyaWJ1dGVLZXlzW2tleU5hbWVdID0gdHJ1ZTtcbiAgICBub2Rlcy5wdXNoKGF0dHIpO1xuICB9XG4gIHJldHVybiBub2Rlc1xufTtcblxucHAkOC5wYXJzZUltcG9ydEF0dHJpYnV0ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIG5vZGUua2V5ID0gdGhpcy50eXBlID09PSB0eXBlcyQxLnN0cmluZyA/IHRoaXMucGFyc2VFeHByQXRvbSgpIDogdGhpcy5wYXJzZUlkZW50KHRoaXMub3B0aW9ucy5hbGxvd1Jlc2VydmVkICE9PSBcIm5ldmVyXCIpO1xuICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbG9uKTtcbiAgaWYgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5zdHJpbmcpIHtcbiAgICB0aGlzLnVuZXhwZWN0ZWQoKTtcbiAgfVxuICBub2RlLnZhbHVlID0gdGhpcy5wYXJzZUV4cHJBdG9tKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJbXBvcnRBdHRyaWJ1dGVcIilcbn07XG5cbnBwJDgucGFyc2VNb2R1bGVFeHBvcnROYW1lID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTMgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLnN0cmluZykge1xuICAgIHZhciBzdHJpbmdMaXRlcmFsID0gdGhpcy5wYXJzZUxpdGVyYWwodGhpcy52YWx1ZSk7XG4gICAgaWYgKGxvbmVTdXJyb2dhdGUudGVzdChzdHJpbmdMaXRlcmFsLnZhbHVlKSkge1xuICAgICAgdGhpcy5yYWlzZShzdHJpbmdMaXRlcmFsLnN0YXJ0LCBcIkFuIGV4cG9ydCBuYW1lIGNhbm5vdCBpbmNsdWRlIGEgbG9uZSBzdXJyb2dhdGUuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyaW5nTGl0ZXJhbFxuICB9XG4gIHJldHVybiB0aGlzLnBhcnNlSWRlbnQodHJ1ZSlcbn07XG5cbi8vIFNldCBgRXhwcmVzc2lvblN0YXRlbWVudCNkaXJlY3RpdmVgIHByb3BlcnR5IGZvciBkaXJlY3RpdmUgcHJvbG9ndWVzLlxucHAkOC5hZGFwdERpcmVjdGl2ZVByb2xvZ3VlID0gZnVuY3Rpb24oc3RhdGVtZW50cykge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlbWVudHMubGVuZ3RoICYmIHRoaXMuaXNEaXJlY3RpdmVDYW5kaWRhdGUoc3RhdGVtZW50c1tpXSk7ICsraSkge1xuICAgIHN0YXRlbWVudHNbaV0uZGlyZWN0aXZlID0gc3RhdGVtZW50c1tpXS5leHByZXNzaW9uLnJhdy5zbGljZSgxLCAtMSk7XG4gIH1cbn07XG5wcCQ4LmlzRGlyZWN0aXZlQ2FuZGlkYXRlID0gZnVuY3Rpb24oc3RhdGVtZW50KSB7XG4gIHJldHVybiAoXG4gICAgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDUgJiZcbiAgICBzdGF0ZW1lbnQudHlwZSA9PT0gXCJFeHByZXNzaW9uU3RhdGVtZW50XCIgJiZcbiAgICBzdGF0ZW1lbnQuZXhwcmVzc2lvbi50eXBlID09PSBcIkxpdGVyYWxcIiAmJlxuICAgIHR5cGVvZiBzdGF0ZW1lbnQuZXhwcmVzc2lvbi52YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgIC8vIFJlamVjdCBwYXJlbnRoZXNpemVkIHN0cmluZ3MuXG4gICAgKHRoaXMuaW5wdXRbc3RhdGVtZW50LnN0YXJ0XSA9PT0gXCJcXFwiXCIgfHwgdGhpcy5pbnB1dFtzdGF0ZW1lbnQuc3RhcnRdID09PSBcIidcIilcbiAgKVxufTtcblxudmFyIHBwJDcgPSBQYXJzZXIucHJvdG90eXBlO1xuXG4vLyBDb252ZXJ0IGV4aXN0aW5nIGV4cHJlc3Npb24gYXRvbSB0byBhc3NpZ25hYmxlIHBhdHRlcm5cbi8vIGlmIHBvc3NpYmxlLlxuXG5wcCQ3LnRvQXNzaWduYWJsZSA9IGZ1bmN0aW9uKG5vZGUsIGlzQmluZGluZywgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgbm9kZSkge1xuICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgY2FzZSBcIklkZW50aWZpZXJcIjpcbiAgICAgIGlmICh0aGlzLmluQXN5bmMgJiYgbm9kZS5uYW1lID09PSBcImF3YWl0XCIpXG4gICAgICAgIHsgdGhpcy5yYWlzZShub2RlLnN0YXJ0LCBcIkNhbm5vdCB1c2UgJ2F3YWl0JyBhcyBpZGVudGlmaWVyIGluc2lkZSBhbiBhc3luYyBmdW5jdGlvblwiKTsgfVxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJPYmplY3RQYXR0ZXJuXCI6XG4gICAgY2FzZSBcIkFycmF5UGF0dGVyblwiOlxuICAgIGNhc2UgXCJBc3NpZ25tZW50UGF0dGVyblwiOlxuICAgIGNhc2UgXCJSZXN0RWxlbWVudFwiOlxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJPYmplY3RFeHByZXNzaW9uXCI6XG4gICAgICBub2RlLnR5cGUgPSBcIk9iamVjdFBhdHRlcm5cIjtcbiAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7IHRoaXMuY2hlY2tQYXR0ZXJuRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpOyB9XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IG5vZGUucHJvcGVydGllczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgdmFyIHByb3AgPSBsaXN0W2ldO1xuXG4gICAgICB0aGlzLnRvQXNzaWduYWJsZShwcm9wLCBpc0JpbmRpbmcpO1xuICAgICAgICAvLyBFYXJseSBlcnJvcjpcbiAgICAgICAgLy8gICBBc3NpZ25tZW50UmVzdFByb3BlcnR5W1lpZWxkLCBBd2FpdF0gOlxuICAgICAgICAvLyAgICAgYC4uLmAgRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXRbWWllbGQsIEF3YWl0XVxuICAgICAgICAvL1xuICAgICAgICAvLyAgIEl0IGlzIGEgU3ludGF4IEVycm9yIGlmIHxEZXN0cnVjdHVyaW5nQXNzaWdubWVudFRhcmdldHwgaXMgYW4gfEFycmF5TGl0ZXJhbHwgb3IgYW4gfE9iamVjdExpdGVyYWx8LlxuICAgICAgICBpZiAoXG4gICAgICAgICAgcHJvcC50eXBlID09PSBcIlJlc3RFbGVtZW50XCIgJiZcbiAgICAgICAgICAocHJvcC5hcmd1bWVudC50eXBlID09PSBcIkFycmF5UGF0dGVyblwiIHx8IHByb3AuYXJndW1lbnQudHlwZSA9PT0gXCJPYmplY3RQYXR0ZXJuXCIpXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMucmFpc2UocHJvcC5hcmd1bWVudC5zdGFydCwgXCJVbmV4cGVjdGVkIHRva2VuXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIlByb3BlcnR5XCI6XG4gICAgICAvLyBBc3NpZ25tZW50UHJvcGVydHkgaGFzIHR5cGUgPT09IFwiUHJvcGVydHlcIlxuICAgICAgaWYgKG5vZGUua2luZCAhPT0gXCJpbml0XCIpIHsgdGhpcy5yYWlzZShub2RlLmtleS5zdGFydCwgXCJPYmplY3QgcGF0dGVybiBjYW4ndCBjb250YWluIGdldHRlciBvciBzZXR0ZXJcIik7IH1cbiAgICAgIHRoaXMudG9Bc3NpZ25hYmxlKG5vZGUudmFsdWUsIGlzQmluZGluZyk7XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIkFycmF5RXhwcmVzc2lvblwiOlxuICAgICAgbm9kZS50eXBlID0gXCJBcnJheVBhdHRlcm5cIjtcbiAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7IHRoaXMuY2hlY2tQYXR0ZXJuRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpOyB9XG4gICAgICB0aGlzLnRvQXNzaWduYWJsZUxpc3Qobm9kZS5lbGVtZW50cywgaXNCaW5kaW5nKTtcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiU3ByZWFkRWxlbWVudFwiOlxuICAgICAgbm9kZS50eXBlID0gXCJSZXN0RWxlbWVudFwiO1xuICAgICAgdGhpcy50b0Fzc2lnbmFibGUobm9kZS5hcmd1bWVudCwgaXNCaW5kaW5nKTtcbiAgICAgIGlmIChub2RlLmFyZ3VtZW50LnR5cGUgPT09IFwiQXNzaWdubWVudFBhdHRlcm5cIilcbiAgICAgICAgeyB0aGlzLnJhaXNlKG5vZGUuYXJndW1lbnQuc3RhcnQsIFwiUmVzdCBlbGVtZW50cyBjYW5ub3QgaGF2ZSBhIGRlZmF1bHQgdmFsdWVcIik7IH1cbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiQXNzaWdubWVudEV4cHJlc3Npb25cIjpcbiAgICAgIGlmIChub2RlLm9wZXJhdG9yICE9PSBcIj1cIikgeyB0aGlzLnJhaXNlKG5vZGUubGVmdC5lbmQsIFwiT25seSAnPScgb3BlcmF0b3IgY2FuIGJlIHVzZWQgZm9yIHNwZWNpZnlpbmcgZGVmYXVsdCB2YWx1ZS5cIik7IH1cbiAgICAgIG5vZGUudHlwZSA9IFwiQXNzaWdubWVudFBhdHRlcm5cIjtcbiAgICAgIGRlbGV0ZSBub2RlLm9wZXJhdG9yO1xuICAgICAgdGhpcy50b0Fzc2lnbmFibGUobm9kZS5sZWZ0LCBpc0JpbmRpbmcpO1xuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJQYXJlbnRoZXNpemVkRXhwcmVzc2lvblwiOlxuICAgICAgdGhpcy50b0Fzc2lnbmFibGUobm9kZS5leHByZXNzaW9uLCBpc0JpbmRpbmcsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJDaGFpbkV4cHJlc3Npb25cIjpcbiAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIk9wdGlvbmFsIGNoYWluaW5nIGNhbm5vdCBhcHBlYXIgaW4gbGVmdC1oYW5kIHNpZGVcIik7XG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIk1lbWJlckV4cHJlc3Npb25cIjpcbiAgICAgIGlmICghaXNCaW5kaW5nKSB7IGJyZWFrIH1cblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLnJhaXNlKG5vZGUuc3RhcnQsIFwiQXNzaWduaW5nIHRvIHJ2YWx1ZVwiKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykgeyB0aGlzLmNoZWNrUGF0dGVybkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTsgfVxuICByZXR1cm4gbm9kZVxufTtcblxuLy8gQ29udmVydCBsaXN0IG9mIGV4cHJlc3Npb24gYXRvbXMgdG8gYmluZGluZyBsaXN0LlxuXG5wcCQ3LnRvQXNzaWduYWJsZUxpc3QgPSBmdW5jdGlvbihleHByTGlzdCwgaXNCaW5kaW5nKSB7XG4gIHZhciBlbmQgPSBleHByTGlzdC5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZW5kOyBpKyspIHtcbiAgICB2YXIgZWx0ID0gZXhwckxpc3RbaV07XG4gICAgaWYgKGVsdCkgeyB0aGlzLnRvQXNzaWduYWJsZShlbHQsIGlzQmluZGluZyk7IH1cbiAgfVxuICBpZiAoZW5kKSB7XG4gICAgdmFyIGxhc3QgPSBleHByTGlzdFtlbmQgLSAxXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID09PSA2ICYmIGlzQmluZGluZyAmJiBsYXN0ICYmIGxhc3QudHlwZSA9PT0gXCJSZXN0RWxlbWVudFwiICYmIGxhc3QuYXJndW1lbnQudHlwZSAhPT0gXCJJZGVudGlmaWVyXCIpXG4gICAgICB7IHRoaXMudW5leHBlY3RlZChsYXN0LmFyZ3VtZW50LnN0YXJ0KTsgfVxuICB9XG4gIHJldHVybiBleHByTGlzdFxufTtcblxuLy8gUGFyc2VzIHNwcmVhZCBlbGVtZW50LlxuXG5wcCQ3LnBhcnNlU3ByZWFkID0gZnVuY3Rpb24ocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dCgpO1xuICBub2RlLmFyZ3VtZW50ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlNwcmVhZEVsZW1lbnRcIilcbn07XG5cbnBwJDcucGFyc2VSZXN0QmluZGluZyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dCgpO1xuXG4gIC8vIFJlc3RFbGVtZW50IGluc2lkZSBvZiBhIGZ1bmN0aW9uIHBhcmFtZXRlciBtdXN0IGJlIGFuIGlkZW50aWZpZXJcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA9PT0gNiAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEubmFtZSlcbiAgICB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG5cbiAgbm9kZS5hcmd1bWVudCA9IHRoaXMucGFyc2VCaW5kaW5nQXRvbSgpO1xuXG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJSZXN0RWxlbWVudFwiKVxufTtcblxuLy8gUGFyc2VzIGx2YWx1ZSAoYXNzaWduYWJsZSkgYXRvbS5cblxucHAkNy5wYXJzZUJpbmRpbmdBdG9tID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikge1xuICAgIHN3aXRjaCAodGhpcy50eXBlKSB7XG4gICAgY2FzZSB0eXBlcyQxLmJyYWNrZXRMOlxuICAgICAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICBub2RlLmVsZW1lbnRzID0gdGhpcy5wYXJzZUJpbmRpbmdMaXN0KHR5cGVzJDEuYnJhY2tldFIsIHRydWUsIHRydWUpO1xuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkFycmF5UGF0dGVyblwiKVxuXG4gICAgY2FzZSB0eXBlcyQxLmJyYWNlTDpcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlT2JqKHRydWUpXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzLnBhcnNlSWRlbnQoKVxufTtcblxucHAkNy5wYXJzZUJpbmRpbmdMaXN0ID0gZnVuY3Rpb24oY2xvc2UsIGFsbG93RW1wdHksIGFsbG93VHJhaWxpbmdDb21tYSwgYWxsb3dNb2RpZmllcnMpIHtcbiAgdmFyIGVsdHMgPSBbXSwgZmlyc3QgPSB0cnVlO1xuICB3aGlsZSAoIXRoaXMuZWF0KGNsb3NlKSkge1xuICAgIGlmIChmaXJzdCkgeyBmaXJzdCA9IGZhbHNlOyB9XG4gICAgZWxzZSB7IHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpOyB9XG4gICAgaWYgKGFsbG93RW1wdHkgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hKSB7XG4gICAgICBlbHRzLnB1c2gobnVsbCk7XG4gICAgfSBlbHNlIGlmIChhbGxvd1RyYWlsaW5nQ29tbWEgJiYgdGhpcy5hZnRlclRyYWlsaW5nQ29tbWEoY2xvc2UpKSB7XG4gICAgICBicmVha1xuICAgIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmVsbGlwc2lzKSB7XG4gICAgICB2YXIgcmVzdCA9IHRoaXMucGFyc2VSZXN0QmluZGluZygpO1xuICAgICAgdGhpcy5wYXJzZUJpbmRpbmdMaXN0SXRlbShyZXN0KTtcbiAgICAgIGVsdHMucHVzaChyZXN0KTtcbiAgICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIFwiQ29tbWEgaXMgbm90IHBlcm1pdHRlZCBhZnRlciB0aGUgcmVzdCBlbGVtZW50XCIpOyB9XG4gICAgICB0aGlzLmV4cGVjdChjbG9zZSk7XG4gICAgICBicmVha1xuICAgIH0gZWxzZSB7XG4gICAgICBlbHRzLnB1c2godGhpcy5wYXJzZUFzc2lnbmFibGVMaXN0SXRlbShhbGxvd01vZGlmaWVycykpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZWx0c1xufTtcblxucHAkNy5wYXJzZUFzc2lnbmFibGVMaXN0SXRlbSA9IGZ1bmN0aW9uKGFsbG93TW9kaWZpZXJzKSB7XG4gIHZhciBlbGVtID0gdGhpcy5wYXJzZU1heWJlRGVmYXVsdCh0aGlzLnN0YXJ0LCB0aGlzLnN0YXJ0TG9jKTtcbiAgdGhpcy5wYXJzZUJpbmRpbmdMaXN0SXRlbShlbGVtKTtcbiAgcmV0dXJuIGVsZW1cbn07XG5cbnBwJDcucGFyc2VCaW5kaW5nTGlzdEl0ZW0gPSBmdW5jdGlvbihwYXJhbSkge1xuICByZXR1cm4gcGFyYW1cbn07XG5cbi8vIFBhcnNlcyBhc3NpZ25tZW50IHBhdHRlcm4gYXJvdW5kIGdpdmVuIGF0b20gaWYgcG9zc2libGUuXG5cbnBwJDcucGFyc2VNYXliZURlZmF1bHQgPSBmdW5jdGlvbihzdGFydFBvcywgc3RhcnRMb2MsIGxlZnQpIHtcbiAgbGVmdCA9IGxlZnQgfHwgdGhpcy5wYXJzZUJpbmRpbmdBdG9tKCk7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPCA2IHx8ICF0aGlzLmVhdCh0eXBlcyQxLmVxKSkgeyByZXR1cm4gbGVmdCB9XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICBub2RlLmxlZnQgPSBsZWZ0O1xuICBub2RlLnJpZ2h0ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJBc3NpZ25tZW50UGF0dGVyblwiKVxufTtcblxuLy8gVGhlIGZvbGxvd2luZyB0aHJlZSBmdW5jdGlvbnMgYWxsIHZlcmlmeSB0aGF0IGEgbm9kZSBpcyBhbiBsdmFsdWUgXHUyMDE0XG4vLyBzb21ldGhpbmcgdGhhdCBjYW4gYmUgYm91bmQsIG9yIGFzc2lnbmVkIHRvLiBJbiBvcmRlciB0byBkbyBzbywgdGhleSBwZXJmb3JtXG4vLyBhIHZhcmlldHkgb2YgY2hlY2tzOlxuLy9cbi8vIC0gQ2hlY2sgdGhhdCBub25lIG9mIHRoZSBib3VuZC9hc3NpZ25lZC10byBpZGVudGlmaWVycyBhcmUgcmVzZXJ2ZWQgd29yZHMuXG4vLyAtIFJlY29yZCBuYW1lIGRlY2xhcmF0aW9ucyBmb3IgYmluZGluZ3MgaW4gdGhlIGFwcHJvcHJpYXRlIHNjb3BlLlxuLy8gLSBDaGVjayBkdXBsaWNhdGUgYXJndW1lbnQgbmFtZXMsIGlmIGNoZWNrQ2xhc2hlcyBpcyBzZXQuXG4vL1xuLy8gSWYgYSBjb21wbGV4IGJpbmRpbmcgcGF0dGVybiBpcyBlbmNvdW50ZXJlZCAoZS5nLiwgb2JqZWN0IGFuZCBhcnJheVxuLy8gZGVzdHJ1Y3R1cmluZyksIHRoZSBlbnRpcmUgcGF0dGVybiBpcyByZWN1cnNpdmVseSBjaGVja2VkLlxuLy9cbi8vIFRoZXJlIGFyZSB0aHJlZSB2ZXJzaW9ucyBvZiBjaGVja0xWYWwqKCkgYXBwcm9wcmlhdGUgZm9yIGRpZmZlcmVudFxuLy8gY2lyY3Vtc3RhbmNlczpcbi8vXG4vLyAtIGNoZWNrTFZhbFNpbXBsZSgpIHNoYWxsIGJlIHVzZWQgaWYgdGhlIHN5bnRhY3RpYyBjb25zdHJ1Y3Qgc3VwcG9ydHNcbi8vICAgbm90aGluZyBvdGhlciB0aGFuIGlkZW50aWZpZXJzIGFuZCBtZW1iZXIgZXhwcmVzc2lvbnMuIFBhcmVudGhlc2l6ZWRcbi8vICAgZXhwcmVzc2lvbnMgYXJlIGFsc28gY29ycmVjdGx5IGhhbmRsZWQuIFRoaXMgaXMgZ2VuZXJhbGx5IGFwcHJvcHJpYXRlIGZvclxuLy8gICBjb25zdHJ1Y3RzIGZvciB3aGljaCB0aGUgc3BlYyBzYXlzXG4vL1xuLy8gICA+IEl0IGlzIGEgU3ludGF4IEVycm9yIGlmIEFzc2lnbm1lbnRUYXJnZXRUeXBlIG9mIFt0aGUgcHJvZHVjdGlvbl0gaXMgbm90XG4vLyAgID4gc2ltcGxlLlxuLy9cbi8vICAgSXQgaXMgYWxzbyBhcHByb3ByaWF0ZSBmb3IgY2hlY2tpbmcgaWYgYW4gaWRlbnRpZmllciBpcyB2YWxpZCBhbmQgbm90XG4vLyAgIGRlZmluZWQgZWxzZXdoZXJlLCBsaWtlIGltcG9ydCBkZWNsYXJhdGlvbnMgb3IgZnVuY3Rpb24vY2xhc3MgaWRlbnRpZmllcnMuXG4vL1xuLy8gICBFeGFtcGxlcyB3aGVyZSB0aGlzIGlzIHVzZWQgaW5jbHVkZTpcbi8vICAgICBhICs9IFx1MjAyNjtcbi8vICAgICBpbXBvcnQgYSBmcm9tICdcdTIwMjYnO1xuLy8gICB3aGVyZSBhIGlzIHRoZSBub2RlIHRvIGJlIGNoZWNrZWQuXG4vL1xuLy8gLSBjaGVja0xWYWxQYXR0ZXJuKCkgc2hhbGwgYmUgdXNlZCBpZiB0aGUgc3ludGFjdGljIGNvbnN0cnVjdCBzdXBwb3J0c1xuLy8gICBhbnl0aGluZyBjaGVja0xWYWxTaW1wbGUoKSBzdXBwb3J0cywgYXMgd2VsbCBhcyBvYmplY3QgYW5kIGFycmF5XG4vLyAgIGRlc3RydWN0dXJpbmcgcGF0dGVybnMuIFRoaXMgaXMgZ2VuZXJhbGx5IGFwcHJvcHJpYXRlIGZvciBjb25zdHJ1Y3RzIGZvclxuLy8gICB3aGljaCB0aGUgc3BlYyBzYXlzXG4vL1xuLy8gICA+IEl0IGlzIGEgU3ludGF4IEVycm9yIGlmIFt0aGUgcHJvZHVjdGlvbl0gaXMgbmVpdGhlciBhbiBPYmplY3RMaXRlcmFsIG5vclxuLy8gICA+IGFuIEFycmF5TGl0ZXJhbCBhbmQgQXNzaWdubWVudFRhcmdldFR5cGUgb2YgW3RoZSBwcm9kdWN0aW9uXSBpcyBub3Rcbi8vICAgPiBzaW1wbGUuXG4vL1xuLy8gICBFeGFtcGxlcyB3aGVyZSB0aGlzIGlzIHVzZWQgaW5jbHVkZTpcbi8vICAgICAoYSA9IFx1MjAyNik7XG4vLyAgICAgY29uc3QgYSA9IFx1MjAyNjtcbi8vICAgICB0cnkgeyBcdTIwMjYgfSBjYXRjaCAoYSkgeyBcdTIwMjYgfVxuLy8gICB3aGVyZSBhIGlzIHRoZSBub2RlIHRvIGJlIGNoZWNrZWQuXG4vL1xuLy8gLSBjaGVja0xWYWxJbm5lclBhdHRlcm4oKSBzaGFsbCBiZSB1c2VkIGlmIHRoZSBzeW50YWN0aWMgY29uc3RydWN0IHN1cHBvcnRzXG4vLyAgIGFueXRoaW5nIGNoZWNrTFZhbFBhdHRlcm4oKSBzdXBwb3J0cywgYXMgd2VsbCBhcyBkZWZhdWx0IGFzc2lnbm1lbnRcbi8vICAgcGF0dGVybnMsIHJlc3QgZWxlbWVudHMsIGFuZCBvdGhlciBjb25zdHJ1Y3RzIHRoYXQgbWF5IGFwcGVhciB3aXRoaW4gYW5cbi8vICAgb2JqZWN0IG9yIGFycmF5IGRlc3RydWN0dXJpbmcgcGF0dGVybi5cbi8vXG4vLyAgIEFzIGEgc3BlY2lhbCBjYXNlLCBmdW5jdGlvbiBwYXJhbWV0ZXJzIGFsc28gdXNlIGNoZWNrTFZhbElubmVyUGF0dGVybigpLFxuLy8gICBhcyB0aGV5IGFsc28gc3VwcG9ydCBkZWZhdWx0cyBhbmQgcmVzdCBjb25zdHJ1Y3RzLlxuLy9cbi8vIFRoZXNlIGZ1bmN0aW9ucyBkZWxpYmVyYXRlbHkgc3VwcG9ydCBib3RoIGFzc2lnbm1lbnQgYW5kIGJpbmRpbmcgY29uc3RydWN0cyxcbi8vIGFzIHRoZSBsb2dpYyBmb3IgYm90aCBpcyBleGNlZWRpbmdseSBzaW1pbGFyLiBJZiB0aGUgbm9kZSBpcyB0aGUgdGFyZ2V0IG9mXG4vLyBhbiBhc3NpZ25tZW50LCB0aGVuIGJpbmRpbmdUeXBlIHNob3VsZCBiZSBzZXQgdG8gQklORF9OT05FLiBPdGhlcndpc2UsIGl0XG4vLyBzaG91bGQgYmUgc2V0IHRvIHRoZSBhcHByb3ByaWF0ZSBCSU5EXyogY29uc3RhbnQsIGxpa2UgQklORF9WQVIgb3Jcbi8vIEJJTkRfTEVYSUNBTC5cbi8vXG4vLyBJZiB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggYSBub24tQklORF9OT05FIGJpbmRpbmdUeXBlLCB0aGVuXG4vLyBhZGRpdGlvbmFsbHkgYSBjaGVja0NsYXNoZXMgb2JqZWN0IG1heSBiZSBzcGVjaWZpZWQgdG8gYWxsb3cgY2hlY2tpbmcgZm9yXG4vLyBkdXBsaWNhdGUgYXJndW1lbnQgbmFtZXMuIGNoZWNrQ2xhc2hlcyBpcyBpZ25vcmVkIGlmIHRoZSBwcm92aWRlZCBjb25zdHJ1Y3Rcbi8vIGlzIGFuIGFzc2lnbm1lbnQgKGkuZS4sIGJpbmRpbmdUeXBlIGlzIEJJTkRfTk9ORSkuXG5cbnBwJDcuY2hlY2tMVmFsU2ltcGxlID0gZnVuY3Rpb24oZXhwciwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcykge1xuICBpZiAoIGJpbmRpbmdUeXBlID09PSB2b2lkIDAgKSBiaW5kaW5nVHlwZSA9IEJJTkRfTk9ORTtcblxuICB2YXIgaXNCaW5kID0gYmluZGluZ1R5cGUgIT09IEJJTkRfTk9ORTtcblxuICBzd2l0Y2ggKGV4cHIudHlwZSkge1xuICBjYXNlIFwiSWRlbnRpZmllclwiOlxuICAgIGlmICh0aGlzLnN0cmljdCAmJiB0aGlzLnJlc2VydmVkV29yZHNTdHJpY3RCaW5kLnRlc3QoZXhwci5uYW1lKSlcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGV4cHIuc3RhcnQsIChpc0JpbmQgPyBcIkJpbmRpbmcgXCIgOiBcIkFzc2lnbmluZyB0byBcIikgKyBleHByLm5hbWUgKyBcIiBpbiBzdHJpY3QgbW9kZVwiKTsgfVxuICAgIGlmIChpc0JpbmQpIHtcbiAgICAgIGlmIChiaW5kaW5nVHlwZSA9PT0gQklORF9MRVhJQ0FMICYmIGV4cHIubmFtZSA9PT0gXCJsZXRcIilcbiAgICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZXhwci5zdGFydCwgXCJsZXQgaXMgZGlzYWxsb3dlZCBhcyBhIGxleGljYWxseSBib3VuZCBuYW1lXCIpOyB9XG4gICAgICBpZiAoY2hlY2tDbGFzaGVzKSB7XG4gICAgICAgIGlmIChoYXNPd24oY2hlY2tDbGFzaGVzLCBleHByLm5hbWUpKVxuICAgICAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGV4cHIuc3RhcnQsIFwiQXJndW1lbnQgbmFtZSBjbGFzaFwiKTsgfVxuICAgICAgICBjaGVja0NsYXNoZXNbZXhwci5uYW1lXSA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoYmluZGluZ1R5cGUgIT09IEJJTkRfT1VUU0lERSkgeyB0aGlzLmRlY2xhcmVOYW1lKGV4cHIubmFtZSwgYmluZGluZ1R5cGUsIGV4cHIuc3RhcnQpOyB9XG4gICAgfVxuICAgIGJyZWFrXG5cbiAgY2FzZSBcIkNoYWluRXhwcmVzc2lvblwiOlxuICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShleHByLnN0YXJ0LCBcIk9wdGlvbmFsIGNoYWluaW5nIGNhbm5vdCBhcHBlYXIgaW4gbGVmdC1oYW5kIHNpZGVcIik7XG4gICAgYnJlYWtcblxuICBjYXNlIFwiTWVtYmVyRXhwcmVzc2lvblwiOlxuICAgIGlmIChpc0JpbmQpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGV4cHIuc3RhcnQsIFwiQmluZGluZyBtZW1iZXIgZXhwcmVzc2lvblwiKTsgfVxuICAgIGJyZWFrXG5cbiAgY2FzZSBcIlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uXCI6XG4gICAgaWYgKGlzQmluZCkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoZXhwci5zdGFydCwgXCJCaW5kaW5nIHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvblwiKTsgfVxuICAgIHJldHVybiB0aGlzLmNoZWNrTFZhbFNpbXBsZShleHByLmV4cHJlc3Npb24sIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpXG5cbiAgZGVmYXVsdDpcbiAgICB0aGlzLnJhaXNlKGV4cHIuc3RhcnQsIChpc0JpbmQgPyBcIkJpbmRpbmdcIiA6IFwiQXNzaWduaW5nIHRvXCIpICsgXCIgcnZhbHVlXCIpO1xuICB9XG59O1xuXG5wcCQ3LmNoZWNrTFZhbFBhdHRlcm4gPSBmdW5jdGlvbihleHByLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKSB7XG4gIGlmICggYmluZGluZ1R5cGUgPT09IHZvaWQgMCApIGJpbmRpbmdUeXBlID0gQklORF9OT05FO1xuXG4gIHN3aXRjaCAoZXhwci50eXBlKSB7XG4gIGNhc2UgXCJPYmplY3RQYXR0ZXJuXCI6XG4gICAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBleHByLnByb3BlcnRpZXM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB2YXIgcHJvcCA9IGxpc3RbaV07XG5cbiAgICB0aGlzLmNoZWNrTFZhbElubmVyUGF0dGVybihwcm9wLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKTtcbiAgICB9XG4gICAgYnJlYWtcblxuICBjYXNlIFwiQXJyYXlQYXR0ZXJuXCI6XG4gICAgZm9yICh2YXIgaSQxID0gMCwgbGlzdCQxID0gZXhwci5lbGVtZW50czsgaSQxIDwgbGlzdCQxLmxlbmd0aDsgaSQxICs9IDEpIHtcbiAgICAgIHZhciBlbGVtID0gbGlzdCQxW2kkMV07XG5cbiAgICBpZiAoZWxlbSkgeyB0aGlzLmNoZWNrTFZhbElubmVyUGF0dGVybihlbGVtLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKTsgfVxuICAgIH1cbiAgICBicmVha1xuXG4gIGRlZmF1bHQ6XG4gICAgdGhpcy5jaGVja0xWYWxTaW1wbGUoZXhwciwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcyk7XG4gIH1cbn07XG5cbnBwJDcuY2hlY2tMVmFsSW5uZXJQYXR0ZXJuID0gZnVuY3Rpb24oZXhwciwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcykge1xuICBpZiAoIGJpbmRpbmdUeXBlID09PSB2b2lkIDAgKSBiaW5kaW5nVHlwZSA9IEJJTkRfTk9ORTtcblxuICBzd2l0Y2ggKGV4cHIudHlwZSkge1xuICBjYXNlIFwiUHJvcGVydHlcIjpcbiAgICAvLyBBc3NpZ25tZW50UHJvcGVydHkgaGFzIHR5cGUgPT09IFwiUHJvcGVydHlcIlxuICAgIHRoaXMuY2hlY2tMVmFsSW5uZXJQYXR0ZXJuKGV4cHIudmFsdWUsIGJpbmRpbmdUeXBlLCBjaGVja0NsYXNoZXMpO1xuICAgIGJyZWFrXG5cbiAgY2FzZSBcIkFzc2lnbm1lbnRQYXR0ZXJuXCI6XG4gICAgdGhpcy5jaGVja0xWYWxQYXR0ZXJuKGV4cHIubGVmdCwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcyk7XG4gICAgYnJlYWtcblxuICBjYXNlIFwiUmVzdEVsZW1lbnRcIjpcbiAgICB0aGlzLmNoZWNrTFZhbFBhdHRlcm4oZXhwci5hcmd1bWVudCwgYmluZGluZ1R5cGUsIGNoZWNrQ2xhc2hlcyk7XG4gICAgYnJlYWtcblxuICBkZWZhdWx0OlxuICAgIHRoaXMuY2hlY2tMVmFsUGF0dGVybihleHByLCBiaW5kaW5nVHlwZSwgY2hlY2tDbGFzaGVzKTtcbiAgfVxufTtcblxuLy8gVGhlIGFsZ29yaXRobSB1c2VkIHRvIGRldGVybWluZSB3aGV0aGVyIGEgcmVnZXhwIGNhbiBhcHBlYXIgYXQgYVxuLy8gZ2l2ZW4gcG9pbnQgaW4gdGhlIHByb2dyYW0gaXMgbG9vc2VseSBiYXNlZCBvbiBzd2VldC5qcycgYXBwcm9hY2guXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvc3dlZXQuanMvd2lraS9kZXNpZ25cblxuXG52YXIgVG9rQ29udGV4dCA9IGZ1bmN0aW9uIFRva0NvbnRleHQodG9rZW4sIGlzRXhwciwgcHJlc2VydmVTcGFjZSwgb3ZlcnJpZGUsIGdlbmVyYXRvcikge1xuICB0aGlzLnRva2VuID0gdG9rZW47XG4gIHRoaXMuaXNFeHByID0gISFpc0V4cHI7XG4gIHRoaXMucHJlc2VydmVTcGFjZSA9ICEhcHJlc2VydmVTcGFjZTtcbiAgdGhpcy5vdmVycmlkZSA9IG92ZXJyaWRlO1xuICB0aGlzLmdlbmVyYXRvciA9ICEhZ2VuZXJhdG9yO1xufTtcblxudmFyIHR5cGVzID0ge1xuICBiX3N0YXQ6IG5ldyBUb2tDb250ZXh0KFwie1wiLCBmYWxzZSksXG4gIGJfZXhwcjogbmV3IFRva0NvbnRleHQoXCJ7XCIsIHRydWUpLFxuICBiX3RtcGw6IG5ldyBUb2tDb250ZXh0KFwiJHtcIiwgZmFsc2UpLFxuICBwX3N0YXQ6IG5ldyBUb2tDb250ZXh0KFwiKFwiLCBmYWxzZSksXG4gIHBfZXhwcjogbmV3IFRva0NvbnRleHQoXCIoXCIsIHRydWUpLFxuICBxX3RtcGw6IG5ldyBUb2tDb250ZXh0KFwiYFwiLCB0cnVlLCB0cnVlLCBmdW5jdGlvbiAocCkgeyByZXR1cm4gcC50cnlSZWFkVGVtcGxhdGVUb2tlbigpOyB9KSxcbiAgZl9zdGF0OiBuZXcgVG9rQ29udGV4dChcImZ1bmN0aW9uXCIsIGZhbHNlKSxcbiAgZl9leHByOiBuZXcgVG9rQ29udGV4dChcImZ1bmN0aW9uXCIsIHRydWUpLFxuICBmX2V4cHJfZ2VuOiBuZXcgVG9rQ29udGV4dChcImZ1bmN0aW9uXCIsIHRydWUsIGZhbHNlLCBudWxsLCB0cnVlKSxcbiAgZl9nZW46IG5ldyBUb2tDb250ZXh0KFwiZnVuY3Rpb25cIiwgZmFsc2UsIGZhbHNlLCBudWxsLCB0cnVlKVxufTtcblxudmFyIHBwJDYgPSBQYXJzZXIucHJvdG90eXBlO1xuXG5wcCQ2LmluaXRpYWxDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbdHlwZXMuYl9zdGF0XVxufTtcblxucHAkNi5jdXJDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdXG59O1xuXG5wcCQ2LmJyYWNlSXNCbG9jayA9IGZ1bmN0aW9uKHByZXZUeXBlKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLmN1ckNvbnRleHQoKTtcbiAgaWYgKHBhcmVudCA9PT0gdHlwZXMuZl9leHByIHx8IHBhcmVudCA9PT0gdHlwZXMuZl9zdGF0KVxuICAgIHsgcmV0dXJuIHRydWUgfVxuICBpZiAocHJldlR5cGUgPT09IHR5cGVzJDEuY29sb24gJiYgKHBhcmVudCA9PT0gdHlwZXMuYl9zdGF0IHx8IHBhcmVudCA9PT0gdHlwZXMuYl9leHByKSlcbiAgICB7IHJldHVybiAhcGFyZW50LmlzRXhwciB9XG5cbiAgLy8gVGhlIGNoZWNrIGZvciBgdHQubmFtZSAmJiBleHByQWxsb3dlZGAgZGV0ZWN0cyB3aGV0aGVyIHdlIGFyZVxuICAvLyBhZnRlciBhIGB5aWVsZGAgb3IgYG9mYCBjb25zdHJ1Y3QuIFNlZSB0aGUgYHVwZGF0ZUNvbnRleHRgIGZvclxuICAvLyBgdHQubmFtZWAuXG4gIGlmIChwcmV2VHlwZSA9PT0gdHlwZXMkMS5fcmV0dXJuIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLm5hbWUgJiYgdGhpcy5leHByQWxsb3dlZClcbiAgICB7IHJldHVybiBsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMubGFzdFRva0VuZCwgdGhpcy5zdGFydCkpIH1cbiAgaWYgKHByZXZUeXBlID09PSB0eXBlcyQxLl9lbHNlIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLnNlbWkgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuZW9mIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLnBhcmVuUiB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5hcnJvdylcbiAgICB7IHJldHVybiB0cnVlIH1cbiAgaWYgKHByZXZUeXBlID09PSB0eXBlcyQxLmJyYWNlTClcbiAgICB7IHJldHVybiBwYXJlbnQgPT09IHR5cGVzLmJfc3RhdCB9XG4gIGlmIChwcmV2VHlwZSA9PT0gdHlwZXMkMS5fdmFyIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLl9jb25zdCB8fCBwcmV2VHlwZSA9PT0gdHlwZXMkMS5uYW1lKVxuICAgIHsgcmV0dXJuIGZhbHNlIH1cbiAgcmV0dXJuICF0aGlzLmV4cHJBbGxvd2VkXG59O1xuXG5wcCQ2LmluR2VuZXJhdG9yQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBpID0gdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDE7IGkgPj0gMTsgaS0tKSB7XG4gICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHRbaV07XG4gICAgaWYgKGNvbnRleHQudG9rZW4gPT09IFwiZnVuY3Rpb25cIilcbiAgICAgIHsgcmV0dXJuIGNvbnRleHQuZ2VuZXJhdG9yIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbnBwJDYudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKHByZXZUeXBlKSB7XG4gIHZhciB1cGRhdGUsIHR5cGUgPSB0aGlzLnR5cGU7XG4gIGlmICh0eXBlLmtleXdvcmQgJiYgcHJldlR5cGUgPT09IHR5cGVzJDEuZG90KVxuICAgIHsgdGhpcy5leHByQWxsb3dlZCA9IGZhbHNlOyB9XG4gIGVsc2UgaWYgKHVwZGF0ZSA9IHR5cGUudXBkYXRlQ29udGV4dClcbiAgICB7IHVwZGF0ZS5jYWxsKHRoaXMsIHByZXZUeXBlKTsgfVxuICBlbHNlXG4gICAgeyB0aGlzLmV4cHJBbGxvd2VkID0gdHlwZS5iZWZvcmVFeHByOyB9XG59O1xuXG4vLyBVc2VkIHRvIGhhbmRsZSBlZGdlIGNhc2VzIHdoZW4gdG9rZW4gY29udGV4dCBjb3VsZCBub3QgYmUgaW5mZXJyZWQgY29ycmVjdGx5IGR1cmluZyB0b2tlbml6YXRpb24gcGhhc2VcblxucHAkNi5vdmVycmlkZUNvbnRleHQgPSBmdW5jdGlvbih0b2tlbkN0eCkge1xuICBpZiAodGhpcy5jdXJDb250ZXh0KCkgIT09IHRva2VuQ3R4KSB7XG4gICAgdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXSA9IHRva2VuQ3R4O1xuICB9XG59O1xuXG4vLyBUb2tlbi1zcGVjaWZpYyBjb250ZXh0IHVwZGF0ZSBjb2RlXG5cbnR5cGVzJDEucGFyZW5SLnVwZGF0ZUNvbnRleHQgPSB0eXBlcyQxLmJyYWNlUi51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNvbnRleHQubGVuZ3RoID09PSAxKSB7XG4gICAgdGhpcy5leHByQWxsb3dlZCA9IHRydWU7XG4gICAgcmV0dXJuXG4gIH1cbiAgdmFyIG91dCA9IHRoaXMuY29udGV4dC5wb3AoKTtcbiAgaWYgKG91dCA9PT0gdHlwZXMuYl9zdGF0ICYmIHRoaXMuY3VyQ29udGV4dCgpLnRva2VuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBvdXQgPSB0aGlzLmNvbnRleHQucG9wKCk7XG4gIH1cbiAgdGhpcy5leHByQWxsb3dlZCA9ICFvdXQuaXNFeHByO1xufTtcblxudHlwZXMkMS5icmFjZUwudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKHByZXZUeXBlKSB7XG4gIHRoaXMuY29udGV4dC5wdXNoKHRoaXMuYnJhY2VJc0Jsb2NrKHByZXZUeXBlKSA/IHR5cGVzLmJfc3RhdCA6IHR5cGVzLmJfZXhwcik7XG4gIHRoaXMuZXhwckFsbG93ZWQgPSB0cnVlO1xufTtcblxudHlwZXMkMS5kb2xsYXJCcmFjZUwudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNvbnRleHQucHVzaCh0eXBlcy5iX3RtcGwpO1xuICB0aGlzLmV4cHJBbGxvd2VkID0gdHJ1ZTtcbn07XG5cbnR5cGVzJDEucGFyZW5MLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbihwcmV2VHlwZSkge1xuICB2YXIgc3RhdGVtZW50UGFyZW5zID0gcHJldlR5cGUgPT09IHR5cGVzJDEuX2lmIHx8IHByZXZUeXBlID09PSB0eXBlcyQxLl9mb3IgfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuX3dpdGggfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuX3doaWxlO1xuICB0aGlzLmNvbnRleHQucHVzaChzdGF0ZW1lbnRQYXJlbnMgPyB0eXBlcy5wX3N0YXQgOiB0eXBlcy5wX2V4cHIpO1xuICB0aGlzLmV4cHJBbGxvd2VkID0gdHJ1ZTtcbn07XG5cbnR5cGVzJDEuaW5jRGVjLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgLy8gdG9rRXhwckFsbG93ZWQgc3RheXMgdW5jaGFuZ2VkXG59O1xuXG50eXBlcyQxLl9mdW5jdGlvbi51cGRhdGVDb250ZXh0ID0gdHlwZXMkMS5fY2xhc3MudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKHByZXZUeXBlKSB7XG4gIGlmIChwcmV2VHlwZS5iZWZvcmVFeHByICYmIHByZXZUeXBlICE9PSB0eXBlcyQxLl9lbHNlICYmXG4gICAgICAhKHByZXZUeXBlID09PSB0eXBlcyQxLnNlbWkgJiYgdGhpcy5jdXJDb250ZXh0KCkgIT09IHR5cGVzLnBfc3RhdCkgJiZcbiAgICAgICEocHJldlR5cGUgPT09IHR5cGVzJDEuX3JldHVybiAmJiBsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMubGFzdFRva0VuZCwgdGhpcy5zdGFydCkpKSAmJlxuICAgICAgISgocHJldlR5cGUgPT09IHR5cGVzJDEuY29sb24gfHwgcHJldlR5cGUgPT09IHR5cGVzJDEuYnJhY2VMKSAmJiB0aGlzLmN1ckNvbnRleHQoKSA9PT0gdHlwZXMuYl9zdGF0KSlcbiAgICB7IHRoaXMuY29udGV4dC5wdXNoKHR5cGVzLmZfZXhwcik7IH1cbiAgZWxzZVxuICAgIHsgdGhpcy5jb250ZXh0LnB1c2godHlwZXMuZl9zdGF0KTsgfVxuICB0aGlzLmV4cHJBbGxvd2VkID0gZmFsc2U7XG59O1xuXG50eXBlcyQxLmNvbG9uLnVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY3VyQ29udGV4dCgpLnRva2VuID09PSBcImZ1bmN0aW9uXCIpIHsgdGhpcy5jb250ZXh0LnBvcCgpOyB9XG4gIHRoaXMuZXhwckFsbG93ZWQgPSB0cnVlO1xufTtcblxudHlwZXMkMS5iYWNrUXVvdGUudXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jdXJDb250ZXh0KCkgPT09IHR5cGVzLnFfdG1wbClcbiAgICB7IHRoaXMuY29udGV4dC5wb3AoKTsgfVxuICBlbHNlXG4gICAgeyB0aGlzLmNvbnRleHQucHVzaCh0eXBlcy5xX3RtcGwpOyB9XG4gIHRoaXMuZXhwckFsbG93ZWQgPSBmYWxzZTtcbn07XG5cbnR5cGVzJDEuc3Rhci51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24ocHJldlR5cGUpIHtcbiAgaWYgKHByZXZUeXBlID09PSB0eXBlcyQxLl9mdW5jdGlvbikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuY29udGV4dC5sZW5ndGggLSAxO1xuICAgIGlmICh0aGlzLmNvbnRleHRbaW5kZXhdID09PSB0eXBlcy5mX2V4cHIpXG4gICAgICB7IHRoaXMuY29udGV4dFtpbmRleF0gPSB0eXBlcy5mX2V4cHJfZ2VuOyB9XG4gICAgZWxzZVxuICAgICAgeyB0aGlzLmNvbnRleHRbaW5kZXhdID0gdHlwZXMuZl9nZW47IH1cbiAgfVxuICB0aGlzLmV4cHJBbGxvd2VkID0gdHJ1ZTtcbn07XG5cbnR5cGVzJDEubmFtZS51cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24ocHJldlR5cGUpIHtcbiAgdmFyIGFsbG93ZWQgPSBmYWxzZTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmIHByZXZUeXBlICE9PSB0eXBlcyQxLmRvdCkge1xuICAgIGlmICh0aGlzLnZhbHVlID09PSBcIm9mXCIgJiYgIXRoaXMuZXhwckFsbG93ZWQgfHxcbiAgICAgICAgdGhpcy52YWx1ZSA9PT0gXCJ5aWVsZFwiICYmIHRoaXMuaW5HZW5lcmF0b3JDb250ZXh0KCkpXG4gICAgICB7IGFsbG93ZWQgPSB0cnVlOyB9XG4gIH1cbiAgdGhpcy5leHByQWxsb3dlZCA9IGFsbG93ZWQ7XG59O1xuXG4vLyBBIHJlY3Vyc2l2ZSBkZXNjZW50IHBhcnNlciBvcGVyYXRlcyBieSBkZWZpbmluZyBmdW5jdGlvbnMgZm9yIGFsbFxuLy8gc3ludGFjdGljIGVsZW1lbnRzLCBhbmQgcmVjdXJzaXZlbHkgY2FsbGluZyB0aG9zZSwgZWFjaCBmdW5jdGlvblxuLy8gYWR2YW5jaW5nIHRoZSBpbnB1dCBzdHJlYW0gYW5kIHJldHVybmluZyBhbiBBU1Qgbm9kZS4gUHJlY2VkZW5jZVxuLy8gb2YgY29uc3RydWN0cyAoZm9yIGV4YW1wbGUsIHRoZSBmYWN0IHRoYXQgYCF4WzFdYCBtZWFucyBgISh4WzFdKWBcbi8vIGluc3RlYWQgb2YgYCgheClbMV1gIGlzIGhhbmRsZWQgYnkgdGhlIGZhY3QgdGhhdCB0aGUgcGFyc2VyXG4vLyBmdW5jdGlvbiB0aGF0IHBhcnNlcyB1bmFyeSBwcmVmaXggb3BlcmF0b3JzIGlzIGNhbGxlZCBmaXJzdCwgYW5kXG4vLyBpbiB0dXJuIGNhbGxzIHRoZSBmdW5jdGlvbiB0aGF0IHBhcnNlcyBgW11gIHN1YnNjcmlwdHMgXHUyMDE0IHRoYXRcbi8vIHdheSwgaXQnbGwgcmVjZWl2ZSB0aGUgbm9kZSBmb3IgYHhbMV1gIGFscmVhZHkgcGFyc2VkLCBhbmQgd3JhcHNcbi8vICp0aGF0KiBpbiB0aGUgdW5hcnkgb3BlcmF0b3Igbm9kZS5cbi8vXG4vLyBBY29ybiB1c2VzIGFuIFtvcGVyYXRvciBwcmVjZWRlbmNlIHBhcnNlcl1bb3BwXSB0byBoYW5kbGUgYmluYXJ5XG4vLyBvcGVyYXRvciBwcmVjZWRlbmNlLCBiZWNhdXNlIGl0IGlzIG11Y2ggbW9yZSBjb21wYWN0IHRoYW4gdXNpbmdcbi8vIHRoZSB0ZWNobmlxdWUgb3V0bGluZWQgYWJvdmUsIHdoaWNoIHVzZXMgZGlmZmVyZW50LCBuZXN0aW5nXG4vLyBmdW5jdGlvbnMgdG8gc3BlY2lmeSBwcmVjZWRlbmNlLCBmb3IgYWxsIG9mIHRoZSB0ZW4gYmluYXJ5XG4vLyBwcmVjZWRlbmNlIGxldmVscyB0aGF0IEphdmFTY3JpcHQgZGVmaW5lcy5cbi8vXG4vLyBbb3BwXTogaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9PcGVyYXRvci1wcmVjZWRlbmNlX3BhcnNlclxuXG5cbnZhciBwcCQ1ID0gUGFyc2VyLnByb3RvdHlwZTtcblxuLy8gQ2hlY2sgaWYgcHJvcGVydHkgbmFtZSBjbGFzaGVzIHdpdGggYWxyZWFkeSBhZGRlZC5cbi8vIE9iamVjdC9jbGFzcyBnZXR0ZXJzIGFuZCBzZXR0ZXJzIGFyZSBub3QgYWxsb3dlZCB0byBjbGFzaCBcdTIwMTRcbi8vIGVpdGhlciB3aXRoIGVhY2ggb3RoZXIgb3Igd2l0aCBhbiBpbml0IHByb3BlcnR5IFx1MjAxNCBhbmQgaW5cbi8vIHN0cmljdCBtb2RlLCBpbml0IHByb3BlcnRpZXMgYXJlIGFsc28gbm90IGFsbG93ZWQgdG8gYmUgcmVwZWF0ZWQuXG5cbnBwJDUuY2hlY2tQcm9wQ2xhc2ggPSBmdW5jdGlvbihwcm9wLCBwcm9wSGFzaCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgJiYgcHJvcC50eXBlID09PSBcIlNwcmVhZEVsZW1lbnRcIilcbiAgICB7IHJldHVybiB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiAocHJvcC5jb21wdXRlZCB8fCBwcm9wLm1ldGhvZCB8fCBwcm9wLnNob3J0aGFuZCkpXG4gICAgeyByZXR1cm4gfVxuICB2YXIga2V5ID0gcHJvcC5rZXk7XG4gIHZhciBuYW1lO1xuICBzd2l0Y2ggKGtleS50eXBlKSB7XG4gIGNhc2UgXCJJZGVudGlmaWVyXCI6IG5hbWUgPSBrZXkubmFtZTsgYnJlYWtcbiAgY2FzZSBcIkxpdGVyYWxcIjogbmFtZSA9IFN0cmluZyhrZXkudmFsdWUpOyBicmVha1xuICBkZWZhdWx0OiByZXR1cm5cbiAgfVxuICB2YXIga2luZCA9IHByb3Aua2luZDtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7XG4gICAgaWYgKG5hbWUgPT09IFwiX19wcm90b19fXCIgJiYga2luZCA9PT0gXCJpbml0XCIpIHtcbiAgICAgIGlmIChwcm9wSGFzaC5wcm90bykge1xuICAgICAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICAgICAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLmRvdWJsZVByb3RvIDwgMCkge1xuICAgICAgICAgICAgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5kb3VibGVQcm90byA9IGtleS5zdGFydDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGtleS5zdGFydCwgXCJSZWRlZmluaXRpb24gb2YgX19wcm90b19fIHByb3BlcnR5XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBwcm9wSGFzaC5wcm90byA9IHRydWU7XG4gICAgfVxuICAgIHJldHVyblxuICB9XG4gIG5hbWUgPSBcIiRcIiArIG5hbWU7XG4gIHZhciBvdGhlciA9IHByb3BIYXNoW25hbWVdO1xuICBpZiAob3RoZXIpIHtcbiAgICB2YXIgcmVkZWZpbml0aW9uO1xuICAgIGlmIChraW5kID09PSBcImluaXRcIikge1xuICAgICAgcmVkZWZpbml0aW9uID0gdGhpcy5zdHJpY3QgJiYgb3RoZXIuaW5pdCB8fCBvdGhlci5nZXQgfHwgb3RoZXIuc2V0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZWRlZmluaXRpb24gPSBvdGhlci5pbml0IHx8IG90aGVyW2tpbmRdO1xuICAgIH1cbiAgICBpZiAocmVkZWZpbml0aW9uKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoa2V5LnN0YXJ0LCBcIlJlZGVmaW5pdGlvbiBvZiBwcm9wZXJ0eVwiKTsgfVxuICB9IGVsc2Uge1xuICAgIG90aGVyID0gcHJvcEhhc2hbbmFtZV0gPSB7XG4gICAgICBpbml0OiBmYWxzZSxcbiAgICAgIGdldDogZmFsc2UsXG4gICAgICBzZXQ6IGZhbHNlXG4gICAgfTtcbiAgfVxuICBvdGhlcltraW5kXSA9IHRydWU7XG59O1xuXG4vLyAjIyMgRXhwcmVzc2lvbiBwYXJzaW5nXG5cbi8vIFRoZXNlIG5lc3QsIGZyb20gdGhlIG1vc3QgZ2VuZXJhbCBleHByZXNzaW9uIHR5cGUgYXQgdGhlIHRvcCB0b1xuLy8gJ2F0b21pYycsIG5vbmRpdmlzaWJsZSBleHByZXNzaW9uIHR5cGVzIGF0IHRoZSBib3R0b20uIE1vc3Qgb2Zcbi8vIHRoZSBmdW5jdGlvbnMgd2lsbCBzaW1wbHkgbGV0IHRoZSBmdW5jdGlvbihzKSBiZWxvdyB0aGVtIHBhcnNlLFxuLy8gYW5kLCAqaWYqIHRoZSBzeW50YWN0aWMgY29uc3RydWN0IHRoZXkgaGFuZGxlIGlzIHByZXNlbnQsIHdyYXBcbi8vIHRoZSBBU1Qgbm9kZSB0aGF0IHRoZSBpbm5lciBwYXJzZXIgZ2F2ZSB0aGVtIGluIGFub3RoZXIgbm9kZS5cblxuLy8gUGFyc2UgYSBmdWxsIGV4cHJlc3Npb24uIFRoZSBvcHRpb25hbCBhcmd1bWVudHMgYXJlIHVzZWQgdG9cbi8vIGZvcmJpZCB0aGUgYGluYCBvcGVyYXRvciAoaW4gZm9yIGxvb3BzIGluaXRhbGl6YXRpb24gZXhwcmVzc2lvbnMpXG4vLyBhbmQgcHJvdmlkZSByZWZlcmVuY2UgZm9yIHN0b3JpbmcgJz0nIG9wZXJhdG9yIGluc2lkZSBzaG9ydGhhbmRcbi8vIHByb3BlcnR5IGFzc2lnbm1lbnQgaW4gY29udGV4dHMgd2hlcmUgYm90aCBvYmplY3QgZXhwcmVzc2lvblxuLy8gYW5kIG9iamVjdCBwYXR0ZXJuIG1pZ2h0IGFwcGVhciAoc28gaXQncyBwb3NzaWJsZSB0byByYWlzZVxuLy8gZGVsYXllZCBzeW50YXggZXJyb3IgYXQgY29ycmVjdCBwb3NpdGlvbikuXG5cbnBwJDUucGFyc2VFeHByZXNzaW9uID0gZnVuY3Rpb24oZm9ySW5pdCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gIHZhciBleHByID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gICAgbm9kZS5leHByZXNzaW9ucyA9IFtleHByXTtcbiAgICB3aGlsZSAodGhpcy5lYXQodHlwZXMkMS5jb21tYSkpIHsgbm9kZS5leHByZXNzaW9ucy5wdXNoKHRoaXMucGFyc2VNYXliZUFzc2lnbihmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSk7IH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiU2VxdWVuY2VFeHByZXNzaW9uXCIpXG4gIH1cbiAgcmV0dXJuIGV4cHJcbn07XG5cbi8vIFBhcnNlIGFuIGFzc2lnbm1lbnQgZXhwcmVzc2lvbi4gVGhpcyBpbmNsdWRlcyBhcHBsaWNhdGlvbnMgb2Zcbi8vIG9wZXJhdG9ycyBsaWtlIGArPWAuXG5cbnBwJDUucGFyc2VNYXliZUFzc2lnbiA9IGZ1bmN0aW9uKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGFmdGVyTGVmdFBhcnNlKSB7XG4gIGlmICh0aGlzLmlzQ29udGV4dHVhbChcInlpZWxkXCIpKSB7XG4gICAgaWYgKHRoaXMuaW5HZW5lcmF0b3IpIHsgcmV0dXJuIHRoaXMucGFyc2VZaWVsZChmb3JJbml0KSB9XG4gICAgLy8gVGhlIHRva2VuaXplciB3aWxsIGFzc3VtZSBhbiBleHByZXNzaW9uIGlzIGFsbG93ZWQgYWZ0ZXJcbiAgICAvLyBgeWllbGRgLCBidXQgdGhpcyBpc24ndCB0aGF0IGtpbmQgb2YgeWllbGRcbiAgICBlbHNlIHsgdGhpcy5leHByQWxsb3dlZCA9IGZhbHNlOyB9XG4gIH1cblxuICB2YXIgb3duRGVzdHJ1Y3R1cmluZ0Vycm9ycyA9IGZhbHNlLCBvbGRQYXJlbkFzc2lnbiA9IC0xLCBvbGRUcmFpbGluZ0NvbW1hID0gLTEsIG9sZERvdWJsZVByb3RvID0gLTE7XG4gIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gICAgb2xkUGFyZW5Bc3NpZ24gPSByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ247XG4gICAgb2xkVHJhaWxpbmdDb21tYSA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYTtcbiAgICBvbGREb3VibGVQcm90byA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuZG91YmxlUHJvdG87XG4gICAgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduID0gcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID0gLTE7XG4gIH0gZWxzZSB7XG4gICAgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyA9IG5ldyBEZXN0cnVjdHVyaW5nRXJyb3JzO1xuICAgIG93bkRlc3RydWN0dXJpbmdFcnJvcnMgPSB0cnVlO1xuICB9XG5cbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnBhcmVuTCB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEubmFtZSkge1xuICAgIHRoaXMucG90ZW50aWFsQXJyb3dBdCA9IHRoaXMuc3RhcnQ7XG4gICAgdGhpcy5wb3RlbnRpYWxBcnJvd0luRm9yQXdhaXQgPSBmb3JJbml0ID09PSBcImF3YWl0XCI7XG4gIH1cbiAgdmFyIGxlZnQgPSB0aGlzLnBhcnNlTWF5YmVDb25kaXRpb25hbChmb3JJbml0LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgaWYgKGFmdGVyTGVmdFBhcnNlKSB7IGxlZnQgPSBhZnRlckxlZnRQYXJzZS5jYWxsKHRoaXMsIGxlZnQsIHN0YXJ0UG9zLCBzdGFydExvYyk7IH1cbiAgaWYgKHRoaXMudHlwZS5pc0Fzc2lnbikge1xuICAgIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgIG5vZGUub3BlcmF0b3IgPSB0aGlzLnZhbHVlO1xuICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZXEpXG4gICAgICB7IGxlZnQgPSB0aGlzLnRvQXNzaWduYWJsZShsZWZ0LCBmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7IH1cbiAgICBpZiAoIW93bkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgICAgIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA9IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuZG91YmxlUHJvdG8gPSAtMTtcbiAgICB9XG4gICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuc2hvcnRoYW5kQXNzaWduID49IGxlZnQuc3RhcnQpXG4gICAgICB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuc2hvcnRoYW5kQXNzaWduID0gLTE7IH0gLy8gcmVzZXQgYmVjYXVzZSBzaG9ydGhhbmQgZGVmYXVsdCB3YXMgdXNlZCBjb3JyZWN0bHlcbiAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmVxKVxuICAgICAgeyB0aGlzLmNoZWNrTFZhbFBhdHRlcm4obGVmdCk7IH1cbiAgICBlbHNlXG4gICAgICB7IHRoaXMuY2hlY2tMVmFsU2ltcGxlKGxlZnQpOyB9XG4gICAgbm9kZS5sZWZ0ID0gbGVmdDtcbiAgICB0aGlzLm5leHQoKTtcbiAgICBub2RlLnJpZ2h0ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZvckluaXQpO1xuICAgIGlmIChvbGREb3VibGVQcm90byA+IC0xKSB7IHJlZkRlc3RydWN0dXJpbmdFcnJvcnMuZG91YmxlUHJvdG8gPSBvbGREb3VibGVQcm90bzsgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJBc3NpZ25tZW50RXhwcmVzc2lvblwiKVxuICB9IGVsc2Uge1xuICAgIGlmIChvd25EZXN0cnVjdHVyaW5nRXJyb3JzKSB7IHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpOyB9XG4gIH1cbiAgaWYgKG9sZFBhcmVuQXNzaWduID4gLTEpIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduID0gb2xkUGFyZW5Bc3NpZ247IH1cbiAgaWYgKG9sZFRyYWlsaW5nQ29tbWEgPiAtMSkgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPSBvbGRUcmFpbGluZ0NvbW1hOyB9XG4gIHJldHVybiBsZWZ0XG59O1xuXG4vLyBQYXJzZSBhIHRlcm5hcnkgY29uZGl0aW9uYWwgKGA/OmApIG9wZXJhdG9yLlxuXG5wcCQ1LnBhcnNlTWF5YmVDb25kaXRpb25hbCA9IGZ1bmN0aW9uKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICB2YXIgZXhwciA9IHRoaXMucGFyc2VFeHByT3BzKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICBpZiAodGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykpIHsgcmV0dXJuIGV4cHIgfVxuICBpZiAodGhpcy5lYXQodHlwZXMkMS5xdWVzdGlvbikpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICBub2RlLnRlc3QgPSBleHByO1xuICAgIG5vZGUuY29uc2VxdWVudCA9IHRoaXMucGFyc2VNYXliZUFzc2lnbigpO1xuICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29sb24pO1xuICAgIG5vZGUuYWx0ZXJuYXRlID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZvckluaXQpO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJDb25kaXRpb25hbEV4cHJlc3Npb25cIilcbiAgfVxuICByZXR1cm4gZXhwclxufTtcblxuLy8gU3RhcnQgdGhlIHByZWNlZGVuY2UgcGFyc2VyLlxuXG5wcCQ1LnBhcnNlRXhwck9wcyA9IGZ1bmN0aW9uKGZvckluaXQsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICB2YXIgZXhwciA9IHRoaXMucGFyc2VNYXliZVVuYXJ5KHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGZhbHNlLCBmYWxzZSwgZm9ySW5pdCk7XG4gIGlmICh0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSkgeyByZXR1cm4gZXhwciB9XG4gIHJldHVybiBleHByLnN0YXJ0ID09PSBzdGFydFBvcyAmJiBleHByLnR5cGUgPT09IFwiQXJyb3dGdW5jdGlvbkV4cHJlc3Npb25cIiA/IGV4cHIgOiB0aGlzLnBhcnNlRXhwck9wKGV4cHIsIHN0YXJ0UG9zLCBzdGFydExvYywgLTEsIGZvckluaXQpXG59O1xuXG4vLyBQYXJzZSBiaW5hcnkgb3BlcmF0b3JzIHdpdGggdGhlIG9wZXJhdG9yIHByZWNlZGVuY2UgcGFyc2luZ1xuLy8gYWxnb3JpdGhtLiBgbGVmdGAgaXMgdGhlIGxlZnQtaGFuZCBzaWRlIG9mIHRoZSBvcGVyYXRvci5cbi8vIGBtaW5QcmVjYCBwcm92aWRlcyBjb250ZXh0IHRoYXQgYWxsb3dzIHRoZSBmdW5jdGlvbiB0byBzdG9wIGFuZFxuLy8gZGVmZXIgZnVydGhlciBwYXJzZXIgdG8gb25lIG9mIGl0cyBjYWxsZXJzIHdoZW4gaXQgZW5jb3VudGVycyBhblxuLy8gb3BlcmF0b3IgdGhhdCBoYXMgYSBsb3dlciBwcmVjZWRlbmNlIHRoYW4gdGhlIHNldCBpdCBpcyBwYXJzaW5nLlxuXG5wcCQ1LnBhcnNlRXhwck9wID0gZnVuY3Rpb24obGVmdCwgbGVmdFN0YXJ0UG9zLCBsZWZ0U3RhcnRMb2MsIG1pblByZWMsIGZvckluaXQpIHtcbiAgdmFyIHByZWMgPSB0aGlzLnR5cGUuYmlub3A7XG4gIGlmIChwcmVjICE9IG51bGwgJiYgKCFmb3JJbml0IHx8IHRoaXMudHlwZSAhPT0gdHlwZXMkMS5faW4pKSB7XG4gICAgaWYgKHByZWMgPiBtaW5QcmVjKSB7XG4gICAgICB2YXIgbG9naWNhbCA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5sb2dpY2FsT1IgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLmxvZ2ljYWxBTkQ7XG4gICAgICB2YXIgY29hbGVzY2UgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29hbGVzY2U7XG4gICAgICBpZiAoY29hbGVzY2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIHRoZSBwcmVjZWRlbmNlIG9mIGB0dC5jb2FsZXNjZWAgYXMgZXF1YWwgdG8gdGhlIHJhbmdlIG9mIGxvZ2ljYWwgZXhwcmVzc2lvbnMuXG4gICAgICAgIC8vIEluIG90aGVyIHdvcmRzLCBgbm9kZS5yaWdodGAgc2hvdWxkbid0IGNvbnRhaW4gbG9naWNhbCBleHByZXNzaW9ucyBpbiBvcmRlciB0byBjaGVjayB0aGUgbWl4ZWQgZXJyb3IuXG4gICAgICAgIHByZWMgPSB0eXBlcyQxLmxvZ2ljYWxBTkQuYmlub3A7XG4gICAgICB9XG4gICAgICB2YXIgb3AgPSB0aGlzLnZhbHVlO1xuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2M7XG4gICAgICB2YXIgcmlnaHQgPSB0aGlzLnBhcnNlRXhwck9wKHRoaXMucGFyc2VNYXliZVVuYXJ5KG51bGwsIGZhbHNlLCBmYWxzZSwgZm9ySW5pdCksIHN0YXJ0UG9zLCBzdGFydExvYywgcHJlYywgZm9ySW5pdCk7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuYnVpbGRCaW5hcnkobGVmdFN0YXJ0UG9zLCBsZWZ0U3RhcnRMb2MsIGxlZnQsIHJpZ2h0LCBvcCwgbG9naWNhbCB8fCBjb2FsZXNjZSk7XG4gICAgICBpZiAoKGxvZ2ljYWwgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLmNvYWxlc2NlKSB8fCAoY29hbGVzY2UgJiYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5sb2dpY2FsT1IgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLmxvZ2ljYWxBTkQpKSkge1xuICAgICAgICB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgXCJMb2dpY2FsIGV4cHJlc3Npb25zIGFuZCBjb2FsZXNjZSBleHByZXNzaW9ucyBjYW5ub3QgYmUgbWl4ZWQuIFdyYXAgZWl0aGVyIGJ5IHBhcmVudGhlc2VzXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucGFyc2VFeHByT3Aobm9kZSwgbGVmdFN0YXJ0UG9zLCBsZWZ0U3RhcnRMb2MsIG1pblByZWMsIGZvckluaXQpXG4gICAgfVxuICB9XG4gIHJldHVybiBsZWZ0XG59O1xuXG5wcCQ1LmJ1aWxkQmluYXJ5ID0gZnVuY3Rpb24oc3RhcnRQb3MsIHN0YXJ0TG9jLCBsZWZ0LCByaWdodCwgb3AsIGxvZ2ljYWwpIHtcbiAgaWYgKHJpZ2h0LnR5cGUgPT09IFwiUHJpdmF0ZUlkZW50aWZpZXJcIikgeyB0aGlzLnJhaXNlKHJpZ2h0LnN0YXJ0LCBcIlByaXZhdGUgaWRlbnRpZmllciBjYW4gb25seSBiZSBsZWZ0IHNpZGUgb2YgYmluYXJ5IGV4cHJlc3Npb25cIik7IH1cbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyk7XG4gIG5vZGUubGVmdCA9IGxlZnQ7XG4gIG5vZGUub3BlcmF0b3IgPSBvcDtcbiAgbm9kZS5yaWdodCA9IHJpZ2h0O1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIGxvZ2ljYWwgPyBcIkxvZ2ljYWxFeHByZXNzaW9uXCIgOiBcIkJpbmFyeUV4cHJlc3Npb25cIilcbn07XG5cbi8vIFBhcnNlIHVuYXJ5IG9wZXJhdG9ycywgYm90aCBwcmVmaXggYW5kIHBvc3RmaXguXG5cbnBwJDUucGFyc2VNYXliZVVuYXJ5ID0gZnVuY3Rpb24ocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgc2F3VW5hcnksIGluY0RlYywgZm9ySW5pdCkge1xuICB2YXIgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0LCBzdGFydExvYyA9IHRoaXMuc3RhcnRMb2MsIGV4cHI7XG4gIGlmICh0aGlzLmlzQ29udGV4dHVhbChcImF3YWl0XCIpICYmIHRoaXMuY2FuQXdhaXQpIHtcbiAgICBleHByID0gdGhpcy5wYXJzZUF3YWl0KGZvckluaXQpO1xuICAgIHNhd1VuYXJ5ID0gdHJ1ZTtcbiAgfSBlbHNlIGlmICh0aGlzLnR5cGUucHJlZml4KSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpLCB1cGRhdGUgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuaW5jRGVjO1xuICAgIG5vZGUub3BlcmF0b3IgPSB0aGlzLnZhbHVlO1xuICAgIG5vZGUucHJlZml4ID0gdHJ1ZTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICBub2RlLmFyZ3VtZW50ID0gdGhpcy5wYXJzZU1heWJlVW5hcnkobnVsbCwgdHJ1ZSwgdXBkYXRlLCBmb3JJbml0KTtcbiAgICB0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCB0cnVlKTtcbiAgICBpZiAodXBkYXRlKSB7IHRoaXMuY2hlY2tMVmFsU2ltcGxlKG5vZGUuYXJndW1lbnQpOyB9XG4gICAgZWxzZSBpZiAodGhpcy5zdHJpY3QgJiYgbm9kZS5vcGVyYXRvciA9PT0gXCJkZWxldGVcIiAmJiBpc0xvY2FsVmFyaWFibGVBY2Nlc3Mobm9kZS5hcmd1bWVudCkpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIkRlbGV0aW5nIGxvY2FsIHZhcmlhYmxlIGluIHN0cmljdCBtb2RlXCIpOyB9XG4gICAgZWxzZSBpZiAobm9kZS5vcGVyYXRvciA9PT0gXCJkZWxldGVcIiAmJiBpc1ByaXZhdGVGaWVsZEFjY2Vzcyhub2RlLmFyZ3VtZW50KSlcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiUHJpdmF0ZSBmaWVsZHMgY2FuIG5vdCBiZSBkZWxldGVkXCIpOyB9XG4gICAgZWxzZSB7IHNhd1VuYXJ5ID0gdHJ1ZTsgfVxuICAgIGV4cHIgPSB0aGlzLmZpbmlzaE5vZGUobm9kZSwgdXBkYXRlID8gXCJVcGRhdGVFeHByZXNzaW9uXCIgOiBcIlVuYXJ5RXhwcmVzc2lvblwiKTtcbiAgfSBlbHNlIGlmICghc2F3VW5hcnkgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLnByaXZhdGVJZCkge1xuICAgIGlmICgoZm9ySW5pdCB8fCB0aGlzLnByaXZhdGVOYW1lU3RhY2subGVuZ3RoID09PSAwKSAmJiB0aGlzLm9wdGlvbnMuY2hlY2tQcml2YXRlRmllbGRzKSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgZXhwciA9IHRoaXMucGFyc2VQcml2YXRlSWRlbnQoKTtcbiAgICAvLyBvbmx5IGNvdWxkIGJlIHByaXZhdGUgZmllbGRzIGluICdpbicsIHN1Y2ggYXMgI3ggaW4gb2JqXG4gICAgaWYgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5faW4pIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgfSBlbHNlIHtcbiAgICBleHByID0gdGhpcy5wYXJzZUV4cHJTdWJzY3JpcHRzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGZvckluaXQpO1xuICAgIGlmICh0aGlzLmNoZWNrRXhwcmVzc2lvbkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSkgeyByZXR1cm4gZXhwciB9XG4gICAgd2hpbGUgKHRoaXMudHlwZS5wb3N0Zml4ICYmICF0aGlzLmNhbkluc2VydFNlbWljb2xvbigpKSB7XG4gICAgICB2YXIgbm9kZSQxID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgICAgbm9kZSQxLm9wZXJhdG9yID0gdGhpcy52YWx1ZTtcbiAgICAgIG5vZGUkMS5wcmVmaXggPSBmYWxzZTtcbiAgICAgIG5vZGUkMS5hcmd1bWVudCA9IGV4cHI7XG4gICAgICB0aGlzLmNoZWNrTFZhbFNpbXBsZShleHByKTtcbiAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgZXhwciA9IHRoaXMuZmluaXNoTm9kZShub2RlJDEsIFwiVXBkYXRlRXhwcmVzc2lvblwiKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWluY0RlYyAmJiB0aGlzLmVhdCh0eXBlcyQxLnN0YXJzdGFyKSkge1xuICAgIGlmIChzYXdVbmFyeSlcbiAgICAgIHsgdGhpcy51bmV4cGVjdGVkKHRoaXMubGFzdFRva1N0YXJ0KTsgfVxuICAgIGVsc2VcbiAgICAgIHsgcmV0dXJuIHRoaXMuYnVpbGRCaW5hcnkoc3RhcnRQb3MsIHN0YXJ0TG9jLCBleHByLCB0aGlzLnBhcnNlTWF5YmVVbmFyeShudWxsLCBmYWxzZSwgZmFsc2UsIGZvckluaXQpLCBcIioqXCIsIGZhbHNlKSB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGV4cHJcbiAgfVxufTtcblxuZnVuY3Rpb24gaXNMb2NhbFZhcmlhYmxlQWNjZXNzKG5vZGUpIHtcbiAgcmV0dXJuIChcbiAgICBub2RlLnR5cGUgPT09IFwiSWRlbnRpZmllclwiIHx8XG4gICAgbm9kZS50eXBlID09PSBcIlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uXCIgJiYgaXNMb2NhbFZhcmlhYmxlQWNjZXNzKG5vZGUuZXhwcmVzc2lvbilcbiAgKVxufVxuXG5mdW5jdGlvbiBpc1ByaXZhdGVGaWVsZEFjY2Vzcyhub2RlKSB7XG4gIHJldHVybiAoXG4gICAgbm9kZS50eXBlID09PSBcIk1lbWJlckV4cHJlc3Npb25cIiAmJiBub2RlLnByb3BlcnR5LnR5cGUgPT09IFwiUHJpdmF0ZUlkZW50aWZpZXJcIiB8fFxuICAgIG5vZGUudHlwZSA9PT0gXCJDaGFpbkV4cHJlc3Npb25cIiAmJiBpc1ByaXZhdGVGaWVsZEFjY2Vzcyhub2RlLmV4cHJlc3Npb24pIHx8XG4gICAgbm9kZS50eXBlID09PSBcIlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uXCIgJiYgaXNQcml2YXRlRmllbGRBY2Nlc3Mobm9kZS5leHByZXNzaW9uKVxuICApXG59XG5cbi8vIFBhcnNlIGNhbGwsIGRvdCwgYW5kIGBbXWAtc3Vic2NyaXB0IGV4cHJlc3Npb25zLlxuXG5wcCQ1LnBhcnNlRXhwclN1YnNjcmlwdHMgPSBmdW5jdGlvbihyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBmb3JJbml0KSB7XG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgdmFyIGV4cHIgPSB0aGlzLnBhcnNlRXhwckF0b20ocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgZm9ySW5pdCk7XG4gIGlmIChleHByLnR5cGUgPT09IFwiQXJyb3dGdW5jdGlvbkV4cHJlc3Npb25cIiAmJiB0aGlzLmlucHV0LnNsaWNlKHRoaXMubGFzdFRva1N0YXJ0LCB0aGlzLmxhc3RUb2tFbmQpICE9PSBcIilcIilcbiAgICB7IHJldHVybiBleHByIH1cbiAgdmFyIHJlc3VsdCA9IHRoaXMucGFyc2VTdWJzY3JpcHRzKGV4cHIsIHN0YXJ0UG9zLCBzdGFydExvYywgZmFsc2UsIGZvckluaXQpO1xuICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyAmJiByZXN1bHQudHlwZSA9PT0gXCJNZW1iZXJFeHByZXNzaW9uXCIpIHtcbiAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduID49IHJlc3VsdC5zdGFydCkgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRBc3NpZ24gPSAtMTsgfVxuICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRCaW5kID49IHJlc3VsdC5zdGFydCkgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRCaW5kID0gLTE7IH1cbiAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID49IHJlc3VsdC5zdGFydCkgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnRyYWlsaW5nQ29tbWEgPSAtMTsgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn07XG5cbnBwJDUucGFyc2VTdWJzY3JpcHRzID0gZnVuY3Rpb24oYmFzZSwgc3RhcnRQb3MsIHN0YXJ0TG9jLCBub0NhbGxzLCBmb3JJbml0KSB7XG4gIHZhciBtYXliZUFzeW5jQXJyb3cgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCAmJiBiYXNlLnR5cGUgPT09IFwiSWRlbnRpZmllclwiICYmIGJhc2UubmFtZSA9PT0gXCJhc3luY1wiICYmXG4gICAgICB0aGlzLmxhc3RUb2tFbmQgPT09IGJhc2UuZW5kICYmICF0aGlzLmNhbkluc2VydFNlbWljb2xvbigpICYmIGJhc2UuZW5kIC0gYmFzZS5zdGFydCA9PT0gNSAmJlxuICAgICAgdGhpcy5wb3RlbnRpYWxBcnJvd0F0ID09PSBiYXNlLnN0YXJ0O1xuICB2YXIgb3B0aW9uYWxDaGFpbmVkID0gZmFsc2U7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMucGFyc2VTdWJzY3JpcHQoYmFzZSwgc3RhcnRQb3MsIHN0YXJ0TG9jLCBub0NhbGxzLCBtYXliZUFzeW5jQXJyb3csIG9wdGlvbmFsQ2hhaW5lZCwgZm9ySW5pdCk7XG5cbiAgICBpZiAoZWxlbWVudC5vcHRpb25hbCkgeyBvcHRpb25hbENoYWluZWQgPSB0cnVlOyB9XG4gICAgaWYgKGVsZW1lbnQgPT09IGJhc2UgfHwgZWxlbWVudC50eXBlID09PSBcIkFycm93RnVuY3Rpb25FeHByZXNzaW9uXCIpIHtcbiAgICAgIGlmIChvcHRpb25hbENoYWluZWQpIHtcbiAgICAgICAgdmFyIGNoYWluTm9kZSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICAgICAgY2hhaW5Ob2RlLmV4cHJlc3Npb24gPSBlbGVtZW50O1xuICAgICAgICBlbGVtZW50ID0gdGhpcy5maW5pc2hOb2RlKGNoYWluTm9kZSwgXCJDaGFpbkV4cHJlc3Npb25cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZWxlbWVudFxuICAgIH1cblxuICAgIGJhc2UgPSBlbGVtZW50O1xuICB9XG59O1xuXG5wcCQ1LnNob3VsZFBhcnNlQXN5bmNBcnJvdyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkgJiYgdGhpcy5lYXQodHlwZXMkMS5hcnJvdylcbn07XG5cbnBwJDUucGFyc2VTdWJzY3JpcHRBc3luY0Fycm93ID0gZnVuY3Rpb24oc3RhcnRQb3MsIHN0YXJ0TG9jLCBleHByTGlzdCwgZm9ySW5pdCkge1xuICByZXR1cm4gdGhpcy5wYXJzZUFycm93RXhwcmVzc2lvbih0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyksIGV4cHJMaXN0LCB0cnVlLCBmb3JJbml0KVxufTtcblxucHAkNS5wYXJzZVN1YnNjcmlwdCA9IGZ1bmN0aW9uKGJhc2UsIHN0YXJ0UG9zLCBzdGFydExvYywgbm9DYWxscywgbWF5YmVBc3luY0Fycm93LCBvcHRpb25hbENoYWluZWQsIGZvckluaXQpIHtcbiAgdmFyIG9wdGlvbmFsU3VwcG9ydGVkID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDExO1xuICB2YXIgb3B0aW9uYWwgPSBvcHRpb25hbFN1cHBvcnRlZCAmJiB0aGlzLmVhdCh0eXBlcyQxLnF1ZXN0aW9uRG90KTtcbiAgaWYgKG5vQ2FsbHMgJiYgb3B0aW9uYWwpIHsgdGhpcy5yYWlzZSh0aGlzLmxhc3RUb2tTdGFydCwgXCJPcHRpb25hbCBjaGFpbmluZyBjYW5ub3QgYXBwZWFyIGluIHRoZSBjYWxsZWUgb2YgbmV3IGV4cHJlc3Npb25zXCIpOyB9XG5cbiAgdmFyIGNvbXB1dGVkID0gdGhpcy5lYXQodHlwZXMkMS5icmFja2V0TCk7XG4gIGlmIChjb21wdXRlZCB8fCAob3B0aW9uYWwgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLnBhcmVuTCAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEuYmFja1F1b3RlKSB8fCB0aGlzLmVhdCh0eXBlcyQxLmRvdCkpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICBub2RlLm9iamVjdCA9IGJhc2U7XG4gICAgaWYgKGNvbXB1dGVkKSB7XG4gICAgICBub2RlLnByb3BlcnR5ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2tldFIpO1xuICAgIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnByaXZhdGVJZCAmJiBiYXNlLnR5cGUgIT09IFwiU3VwZXJcIikge1xuICAgICAgbm9kZS5wcm9wZXJ0eSA9IHRoaXMucGFyc2VQcml2YXRlSWRlbnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5wcm9wZXJ0eSA9IHRoaXMucGFyc2VJZGVudCh0aGlzLm9wdGlvbnMuYWxsb3dSZXNlcnZlZCAhPT0gXCJuZXZlclwiKTtcbiAgICB9XG4gICAgbm9kZS5jb21wdXRlZCA9ICEhY29tcHV0ZWQ7XG4gICAgaWYgKG9wdGlvbmFsU3VwcG9ydGVkKSB7XG4gICAgICBub2RlLm9wdGlvbmFsID0gb3B0aW9uYWw7XG4gICAgfVxuICAgIGJhc2UgPSB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJNZW1iZXJFeHByZXNzaW9uXCIpO1xuICB9IGVsc2UgaWYgKCFub0NhbGxzICYmIHRoaXMuZWF0KHR5cGVzJDEucGFyZW5MKSkge1xuICAgIHZhciByZWZEZXN0cnVjdHVyaW5nRXJyb3JzID0gbmV3IERlc3RydWN0dXJpbmdFcnJvcnMsIG9sZFlpZWxkUG9zID0gdGhpcy55aWVsZFBvcywgb2xkQXdhaXRQb3MgPSB0aGlzLmF3YWl0UG9zLCBvbGRBd2FpdElkZW50UG9zID0gdGhpcy5hd2FpdElkZW50UG9zO1xuICAgIHRoaXMueWllbGRQb3MgPSAwO1xuICAgIHRoaXMuYXdhaXRQb3MgPSAwO1xuICAgIHRoaXMuYXdhaXRJZGVudFBvcyA9IDA7XG4gICAgdmFyIGV4cHJMaXN0ID0gdGhpcy5wYXJzZUV4cHJMaXN0KHR5cGVzJDEucGFyZW5SLCB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCwgZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgIGlmIChtYXliZUFzeW5jQXJyb3cgJiYgIW9wdGlvbmFsICYmIHRoaXMuc2hvdWxkUGFyc2VBc3luY0Fycm93KCkpIHtcbiAgICAgIHRoaXMuY2hlY2tQYXR0ZXJuRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGZhbHNlKTtcbiAgICAgIHRoaXMuY2hlY2tZaWVsZEF3YWl0SW5EZWZhdWx0UGFyYW1zKCk7XG4gICAgICBpZiAodGhpcy5hd2FpdElkZW50UG9zID4gMClcbiAgICAgICAgeyB0aGlzLnJhaXNlKHRoaXMuYXdhaXRJZGVudFBvcywgXCJDYW5ub3QgdXNlICdhd2FpdCcgYXMgaWRlbnRpZmllciBpbnNpZGUgYW4gYXN5bmMgZnVuY3Rpb25cIik7IH1cbiAgICAgIHRoaXMueWllbGRQb3MgPSBvbGRZaWVsZFBvcztcbiAgICAgIHRoaXMuYXdhaXRQb3MgPSBvbGRBd2FpdFBvcztcbiAgICAgIHRoaXMuYXdhaXRJZGVudFBvcyA9IG9sZEF3YWl0SWRlbnRQb3M7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZVN1YnNjcmlwdEFzeW5jQXJyb3coc3RhcnRQb3MsIHN0YXJ0TG9jLCBleHByTGlzdCwgZm9ySW5pdClcbiAgICB9XG4gICAgdGhpcy5jaGVja0V4cHJlc3Npb25FcnJvcnMocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgdHJ1ZSk7XG4gICAgdGhpcy55aWVsZFBvcyA9IG9sZFlpZWxkUG9zIHx8IHRoaXMueWllbGRQb3M7XG4gICAgdGhpcy5hd2FpdFBvcyA9IG9sZEF3YWl0UG9zIHx8IHRoaXMuYXdhaXRQb3M7XG4gICAgdGhpcy5hd2FpdElkZW50UG9zID0gb2xkQXdhaXRJZGVudFBvcyB8fCB0aGlzLmF3YWl0SWRlbnRQb3M7XG4gICAgdmFyIG5vZGUkMSA9IHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKTtcbiAgICBub2RlJDEuY2FsbGVlID0gYmFzZTtcbiAgICBub2RlJDEuYXJndW1lbnRzID0gZXhwckxpc3Q7XG4gICAgaWYgKG9wdGlvbmFsU3VwcG9ydGVkKSB7XG4gICAgICBub2RlJDEub3B0aW9uYWwgPSBvcHRpb25hbDtcbiAgICB9XG4gICAgYmFzZSA9IHRoaXMuZmluaXNoTm9kZShub2RlJDEsIFwiQ2FsbEV4cHJlc3Npb25cIik7XG4gIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmJhY2tRdW90ZSkge1xuICAgIGlmIChvcHRpb25hbCB8fCBvcHRpb25hbENoYWluZWQpIHtcbiAgICAgIHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJPcHRpb25hbCBjaGFpbmluZyBjYW5ub3QgYXBwZWFyIGluIHRoZSB0YWcgb2YgdGFnZ2VkIHRlbXBsYXRlIGV4cHJlc3Npb25zXCIpO1xuICAgIH1cbiAgICB2YXIgbm9kZSQyID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgIG5vZGUkMi50YWcgPSBiYXNlO1xuICAgIG5vZGUkMi5xdWFzaSA9IHRoaXMucGFyc2VUZW1wbGF0ZSh7aXNUYWdnZWQ6IHRydWV9KTtcbiAgICBiYXNlID0gdGhpcy5maW5pc2hOb2RlKG5vZGUkMiwgXCJUYWdnZWRUZW1wbGF0ZUV4cHJlc3Npb25cIik7XG4gIH1cbiAgcmV0dXJuIGJhc2Vcbn07XG5cbi8vIFBhcnNlIGFuIGF0b21pYyBleHByZXNzaW9uIFx1MjAxNCBlaXRoZXIgYSBzaW5nbGUgdG9rZW4gdGhhdCBpcyBhblxuLy8gZXhwcmVzc2lvbiwgYW4gZXhwcmVzc2lvbiBzdGFydGVkIGJ5IGEga2V5d29yZCBsaWtlIGBmdW5jdGlvbmAgb3Jcbi8vIGBuZXdgLCBvciBhbiBleHByZXNzaW9uIHdyYXBwZWQgaW4gcHVuY3R1YXRpb24gbGlrZSBgKClgLCBgW11gLFxuLy8gb3IgYHt9YC5cblxucHAkNS5wYXJzZUV4cHJBdG9tID0gZnVuY3Rpb24ocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgZm9ySW5pdCwgZm9yTmV3KSB7XG4gIC8vIElmIGEgZGl2aXNpb24gb3BlcmF0b3IgYXBwZWFycyBpbiBhbiBleHByZXNzaW9uIHBvc2l0aW9uLCB0aGVcbiAgLy8gdG9rZW5pemVyIGdvdCBjb25mdXNlZCwgYW5kIHdlIGZvcmNlIGl0IHRvIHJlYWQgYSByZWdleHAgaW5zdGVhZC5cbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5zbGFzaCkgeyB0aGlzLnJlYWRSZWdleHAoKTsgfVxuXG4gIHZhciBub2RlLCBjYW5CZUFycm93ID0gdGhpcy5wb3RlbnRpYWxBcnJvd0F0ID09PSB0aGlzLnN0YXJ0O1xuICBzd2l0Y2ggKHRoaXMudHlwZSkge1xuICBjYXNlIHR5cGVzJDEuX3N1cGVyOlxuICAgIGlmICghdGhpcy5hbGxvd1N1cGVyKVxuICAgICAgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQsIFwiJ3N1cGVyJyBrZXl3b3JkIG91dHNpZGUgYSBtZXRob2RcIik7IH1cbiAgICBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgICB0aGlzLm5leHQoKTtcbiAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnBhcmVuTCAmJiAhdGhpcy5hbGxvd0RpcmVjdFN1cGVyKVxuICAgICAgeyB0aGlzLnJhaXNlKG5vZGUuc3RhcnQsIFwic3VwZXIoKSBjYWxsIG91dHNpZGUgY29uc3RydWN0b3Igb2YgYSBzdWJjbGFzc1wiKTsgfVxuICAgIC8vIFRoZSBgc3VwZXJgIGtleXdvcmQgY2FuIGFwcGVhciBhdCBiZWxvdzpcbiAgICAvLyBTdXBlclByb3BlcnR5OlxuICAgIC8vICAgICBzdXBlciBbIEV4cHJlc3Npb24gXVxuICAgIC8vICAgICBzdXBlciAuIElkZW50aWZpZXJOYW1lXG4gICAgLy8gU3VwZXJDYWxsOlxuICAgIC8vICAgICBzdXBlciAoIEFyZ3VtZW50cyApXG4gICAgaWYgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5kb3QgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLmJyYWNrZXRMICYmIHRoaXMudHlwZSAhPT0gdHlwZXMkMS5wYXJlbkwpXG4gICAgICB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIlN1cGVyXCIpXG5cbiAgY2FzZSB0eXBlcyQxLl90aGlzOlxuICAgIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICAgIHRoaXMubmV4dCgpO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJUaGlzRXhwcmVzc2lvblwiKVxuXG4gIGNhc2UgdHlwZXMkMS5uYW1lOlxuICAgIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYywgY29udGFpbnNFc2MgPSB0aGlzLmNvbnRhaW5zRXNjO1xuICAgIHZhciBpZCA9IHRoaXMucGFyc2VJZGVudChmYWxzZSk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4ICYmICFjb250YWluc0VzYyAmJiBpZC5uYW1lID09PSBcImFzeW5jXCIgJiYgIXRoaXMuY2FuSW5zZXJ0U2VtaWNvbG9uKCkgJiYgdGhpcy5lYXQodHlwZXMkMS5fZnVuY3Rpb24pKSB7XG4gICAgICB0aGlzLm92ZXJyaWRlQ29udGV4dCh0eXBlcy5mX2V4cHIpO1xuICAgICAgcmV0dXJuIHRoaXMucGFyc2VGdW5jdGlvbih0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyksIDAsIGZhbHNlLCB0cnVlLCBmb3JJbml0KVxuICAgIH1cbiAgICBpZiAoY2FuQmVBcnJvdyAmJiAhdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSkge1xuICAgICAgaWYgKHRoaXMuZWF0KHR5cGVzJDEuYXJyb3cpKVxuICAgICAgICB7IHJldHVybiB0aGlzLnBhcnNlQXJyb3dFeHByZXNzaW9uKHRoaXMuc3RhcnROb2RlQXQoc3RhcnRQb3MsIHN0YXJ0TG9jKSwgW2lkXSwgZmFsc2UsIGZvckluaXQpIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCAmJiBpZC5uYW1lID09PSBcImFzeW5jXCIgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUgJiYgIWNvbnRhaW5zRXNjICYmXG4gICAgICAgICAgKCF0aGlzLnBvdGVudGlhbEFycm93SW5Gb3JBd2FpdCB8fCB0aGlzLnZhbHVlICE9PSBcIm9mXCIgfHwgdGhpcy5jb250YWluc0VzYykpIHtcbiAgICAgICAgaWQgPSB0aGlzLnBhcnNlSWRlbnQoZmFsc2UpO1xuICAgICAgICBpZiAodGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSB8fCAhdGhpcy5lYXQodHlwZXMkMS5hcnJvdykpXG4gICAgICAgICAgeyB0aGlzLnVuZXhwZWN0ZWQoKTsgfVxuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUFycm93RXhwcmVzc2lvbih0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyksIFtpZF0sIHRydWUsIGZvckluaXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpZFxuXG4gIGNhc2UgdHlwZXMkMS5yZWdleHA6XG4gICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICBub2RlID0gdGhpcy5wYXJzZUxpdGVyYWwodmFsdWUudmFsdWUpO1xuICAgIG5vZGUucmVnZXggPSB7cGF0dGVybjogdmFsdWUucGF0dGVybiwgZmxhZ3M6IHZhbHVlLmZsYWdzfTtcbiAgICByZXR1cm4gbm9kZVxuXG4gIGNhc2UgdHlwZXMkMS5udW06IGNhc2UgdHlwZXMkMS5zdHJpbmc6XG4gICAgcmV0dXJuIHRoaXMucGFyc2VMaXRlcmFsKHRoaXMudmFsdWUpXG5cbiAgY2FzZSB0eXBlcyQxLl9udWxsOiBjYXNlIHR5cGVzJDEuX3RydWU6IGNhc2UgdHlwZXMkMS5fZmFsc2U6XG4gICAgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgbm9kZS52YWx1ZSA9IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5fbnVsbCA/IG51bGwgOiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuX3RydWU7XG4gICAgbm9kZS5yYXcgPSB0aGlzLnR5cGUua2V5d29yZDtcbiAgICB0aGlzLm5leHQoKTtcbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiTGl0ZXJhbFwiKVxuXG4gIGNhc2UgdHlwZXMkMS5wYXJlbkw6XG4gICAgdmFyIHN0YXJ0ID0gdGhpcy5zdGFydCwgZXhwciA9IHRoaXMucGFyc2VQYXJlbkFuZERpc3Rpbmd1aXNoRXhwcmVzc2lvbihjYW5CZUFycm93LCBmb3JJbml0KTtcbiAgICBpZiAocmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMucGFyZW50aGVzaXplZEFzc2lnbiA8IDAgJiYgIXRoaXMuaXNTaW1wbGVBc3NpZ25UYXJnZXQoZXhwcikpXG4gICAgICAgIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5wYXJlbnRoZXNpemVkQXNzaWduID0gc3RhcnQ7IH1cbiAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRCaW5kIDwgMClcbiAgICAgICAgeyByZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnBhcmVudGhlc2l6ZWRCaW5kID0gc3RhcnQ7IH1cbiAgICB9XG4gICAgcmV0dXJuIGV4cHJcblxuICBjYXNlIHR5cGVzJDEuYnJhY2tldEw6XG4gICAgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgbm9kZS5lbGVtZW50cyA9IHRoaXMucGFyc2VFeHByTGlzdCh0eXBlcyQxLmJyYWNrZXRSLCB0cnVlLCB0cnVlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKTtcbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQXJyYXlFeHByZXNzaW9uXCIpXG5cbiAgY2FzZSB0eXBlcyQxLmJyYWNlTDpcbiAgICB0aGlzLm92ZXJyaWRlQ29udGV4dCh0eXBlcy5iX2V4cHIpO1xuICAgIHJldHVybiB0aGlzLnBhcnNlT2JqKGZhbHNlLCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKVxuXG4gIGNhc2UgdHlwZXMkMS5fZnVuY3Rpb246XG4gICAgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VGdW5jdGlvbihub2RlLCAwKVxuXG4gIGNhc2UgdHlwZXMkMS5fY2xhc3M6XG4gICAgcmV0dXJuIHRoaXMucGFyc2VDbGFzcyh0aGlzLnN0YXJ0Tm9kZSgpLCBmYWxzZSlcblxuICBjYXNlIHR5cGVzJDEuX25ldzpcbiAgICByZXR1cm4gdGhpcy5wYXJzZU5ldygpXG5cbiAgY2FzZSB0eXBlcyQxLmJhY2tRdW90ZTpcbiAgICByZXR1cm4gdGhpcy5wYXJzZVRlbXBsYXRlKClcblxuICBjYXNlIHR5cGVzJDEuX2ltcG9ydDpcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDExKSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZUV4cHJJbXBvcnQoZm9yTmV3KVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy51bmV4cGVjdGVkKClcbiAgICB9XG5cbiAgZGVmYXVsdDpcbiAgICByZXR1cm4gdGhpcy5wYXJzZUV4cHJBdG9tRGVmYXVsdCgpXG4gIH1cbn07XG5cbnBwJDUucGFyc2VFeHByQXRvbURlZmF1bHQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy51bmV4cGVjdGVkKCk7XG59O1xuXG5wcCQ1LnBhcnNlRXhwckltcG9ydCA9IGZ1bmN0aW9uKGZvck5ldykge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG5cbiAgLy8gQ29uc3VtZSBgaW1wb3J0YCBhcyBhbiBpZGVudGlmaWVyIGZvciBgaW1wb3J0Lm1ldGFgLlxuICAvLyBCZWNhdXNlIGB0aGlzLnBhcnNlSWRlbnQodHJ1ZSlgIGRvZXNuJ3QgY2hlY2sgZXNjYXBlIHNlcXVlbmNlcywgaXQgbmVlZHMgdGhlIGNoZWNrIG9mIGB0aGlzLmNvbnRhaW5zRXNjYC5cbiAgaWYgKHRoaXMuY29udGFpbnNFc2MpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIFwiRXNjYXBlIHNlcXVlbmNlIGluIGtleXdvcmQgaW1wb3J0XCIpOyB9XG4gIHRoaXMubmV4dCgpO1xuXG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEucGFyZW5MICYmICFmb3JOZXcpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJzZUR5bmFtaWNJbXBvcnQobm9kZSlcbiAgfSBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZG90KSB7XG4gICAgdmFyIG1ldGEgPSB0aGlzLnN0YXJ0Tm9kZUF0KG5vZGUuc3RhcnQsIG5vZGUubG9jICYmIG5vZGUubG9jLnN0YXJ0KTtcbiAgICBtZXRhLm5hbWUgPSBcImltcG9ydFwiO1xuICAgIG5vZGUubWV0YSA9IHRoaXMuZmluaXNoTm9kZShtZXRhLCBcIklkZW50aWZpZXJcIik7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VJbXBvcnRNZXRhKG5vZGUpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy51bmV4cGVjdGVkKCk7XG4gIH1cbn07XG5cbnBwJDUucGFyc2VEeW5hbWljSW1wb3J0ID0gZnVuY3Rpb24obm9kZSkge1xuICB0aGlzLm5leHQoKTsgLy8gc2tpcCBgKGBcblxuICAvLyBQYXJzZSBub2RlLnNvdXJjZS5cbiAgbm9kZS5zb3VyY2UgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcblxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2KSB7XG4gICAgaWYgKCF0aGlzLmVhdCh0eXBlcyQxLnBhcmVuUikpIHtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgaWYgKCF0aGlzLmFmdGVyVHJhaWxpbmdDb21tYSh0eXBlcyQxLnBhcmVuUikpIHtcbiAgICAgICAgbm9kZS5vcHRpb25zID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKCk7XG4gICAgICAgIGlmICghdGhpcy5lYXQodHlwZXMkMS5wYXJlblIpKSB7XG4gICAgICAgICAgdGhpcy5leHBlY3QodHlwZXMkMS5jb21tYSk7XG4gICAgICAgICAgaWYgKCF0aGlzLmFmdGVyVHJhaWxpbmdDb21tYSh0eXBlcyQxLnBhcmVuUikpIHtcbiAgICAgICAgICAgIHRoaXMudW5leHBlY3RlZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZS5vcHRpb25zID0gbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5vcHRpb25zID0gbnVsbDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gVmVyaWZ5IGVuZGluZy5cbiAgICBpZiAoIXRoaXMuZWF0KHR5cGVzJDEucGFyZW5SKSkge1xuICAgICAgdmFyIGVycm9yUG9zID0gdGhpcy5zdGFydDtcbiAgICAgIGlmICh0aGlzLmVhdCh0eXBlcyQxLmNvbW1hKSAmJiB0aGlzLmVhdCh0eXBlcyQxLnBhcmVuUikpIHtcbiAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKGVycm9yUG9zLCBcIlRyYWlsaW5nIGNvbW1hIGlzIG5vdCBhbGxvd2VkIGluIGltcG9ydCgpXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51bmV4cGVjdGVkKGVycm9yUG9zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiSW1wb3J0RXhwcmVzc2lvblwiKVxufTtcblxucHAkNS5wYXJzZUltcG9ydE1ldGEgPSBmdW5jdGlvbihub2RlKSB7XG4gIHRoaXMubmV4dCgpOyAvLyBza2lwIGAuYFxuXG4gIHZhciBjb250YWluc0VzYyA9IHRoaXMuY29udGFpbnNFc2M7XG4gIG5vZGUucHJvcGVydHkgPSB0aGlzLnBhcnNlSWRlbnQodHJ1ZSk7XG5cbiAgaWYgKG5vZGUucHJvcGVydHkubmFtZSAhPT0gXCJtZXRhXCIpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5wcm9wZXJ0eS5zdGFydCwgXCJUaGUgb25seSB2YWxpZCBtZXRhIHByb3BlcnR5IGZvciBpbXBvcnQgaXMgJ2ltcG9ydC5tZXRhJ1wiKTsgfVxuICBpZiAoY29udGFpbnNFc2MpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUobm9kZS5zdGFydCwgXCInaW1wb3J0Lm1ldGEnIG11c3Qgbm90IGNvbnRhaW4gZXNjYXBlZCBjaGFyYWN0ZXJzXCIpOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuc291cmNlVHlwZSAhPT0gXCJtb2R1bGVcIiAmJiAhdGhpcy5vcHRpb25zLmFsbG93SW1wb3J0RXhwb3J0RXZlcnl3aGVyZSlcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIkNhbm5vdCB1c2UgJ2ltcG9ydC5tZXRhJyBvdXRzaWRlIGEgbW9kdWxlXCIpOyB9XG5cbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIk1ldGFQcm9wZXJ0eVwiKVxufTtcblxucHAkNS5wYXJzZUxpdGVyYWwgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIG5vZGUudmFsdWUgPSB2YWx1ZTtcbiAgbm9kZS5yYXcgPSB0aGlzLmlucHV0LnNsaWNlKHRoaXMuc3RhcnQsIHRoaXMuZW5kKTtcbiAgaWYgKG5vZGUucmF3LmNoYXJDb2RlQXQobm9kZS5yYXcubGVuZ3RoIC0gMSkgPT09IDExMClcbiAgICB7IG5vZGUuYmlnaW50ID0gbm9kZS52YWx1ZSAhPSBudWxsID8gbm9kZS52YWx1ZS50b1N0cmluZygpIDogbm9kZS5yYXcuc2xpY2UoMCwgLTEpLnJlcGxhY2UoL18vZywgXCJcIik7IH1cbiAgdGhpcy5uZXh0KCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJMaXRlcmFsXCIpXG59O1xuXG5wcCQ1LnBhcnNlUGFyZW5FeHByZXNzaW9uID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5MKTtcbiAgdmFyIHZhbCA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5SKTtcbiAgcmV0dXJuIHZhbFxufTtcblxucHAkNS5zaG91bGRQYXJzZUFycm93ID0gZnVuY3Rpb24oZXhwckxpc3QpIHtcbiAgcmV0dXJuICF0aGlzLmNhbkluc2VydFNlbWljb2xvbigpXG59O1xuXG5wcCQ1LnBhcnNlUGFyZW5BbmREaXN0aW5ndWlzaEV4cHJlc3Npb24gPSBmdW5jdGlvbihjYW5CZUFycm93LCBmb3JJbml0KSB7XG4gIHZhciBzdGFydFBvcyA9IHRoaXMuc3RhcnQsIHN0YXJ0TG9jID0gdGhpcy5zdGFydExvYywgdmFsLCBhbGxvd1RyYWlsaW5nQ29tbWEgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gODtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7XG4gICAgdGhpcy5uZXh0KCk7XG5cbiAgICB2YXIgaW5uZXJTdGFydFBvcyA9IHRoaXMuc3RhcnQsIGlubmVyU3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICAgIHZhciBleHByTGlzdCA9IFtdLCBmaXJzdCA9IHRydWUsIGxhc3RJc0NvbW1hID0gZmFsc2U7XG4gICAgdmFyIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMgPSBuZXcgRGVzdHJ1Y3R1cmluZ0Vycm9ycywgb2xkWWllbGRQb3MgPSB0aGlzLnlpZWxkUG9zLCBvbGRBd2FpdFBvcyA9IHRoaXMuYXdhaXRQb3MsIHNwcmVhZFN0YXJ0O1xuICAgIHRoaXMueWllbGRQb3MgPSAwO1xuICAgIHRoaXMuYXdhaXRQb3MgPSAwO1xuICAgIC8vIERvIG5vdCBzYXZlIGF3YWl0SWRlbnRQb3MgdG8gYWxsb3cgY2hlY2tpbmcgYXdhaXRzIG5lc3RlZCBpbiBwYXJhbWV0ZXJzXG4gICAgd2hpbGUgKHRoaXMudHlwZSAhPT0gdHlwZXMkMS5wYXJlblIpIHtcbiAgICAgIGZpcnN0ID8gZmlyc3QgPSBmYWxzZSA6IHRoaXMuZXhwZWN0KHR5cGVzJDEuY29tbWEpO1xuICAgICAgaWYgKGFsbG93VHJhaWxpbmdDb21tYSAmJiB0aGlzLmFmdGVyVHJhaWxpbmdDb21tYSh0eXBlcyQxLnBhcmVuUiwgdHJ1ZSkpIHtcbiAgICAgICAgbGFzdElzQ29tbWEgPSB0cnVlO1xuICAgICAgICBicmVha1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuZWxsaXBzaXMpIHtcbiAgICAgICAgc3ByZWFkU3RhcnQgPSB0aGlzLnN0YXJ0O1xuICAgICAgICBleHByTGlzdC5wdXNoKHRoaXMucGFyc2VQYXJlbkl0ZW0odGhpcy5wYXJzZVJlc3RCaW5kaW5nKCkpKTtcbiAgICAgICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSkge1xuICAgICAgICAgIHRoaXMucmFpc2VSZWNvdmVyYWJsZShcbiAgICAgICAgICAgIHRoaXMuc3RhcnQsXG4gICAgICAgICAgICBcIkNvbW1hIGlzIG5vdCBwZXJtaXR0ZWQgYWZ0ZXIgdGhlIHJlc3QgZWxlbWVudFwiXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhwckxpc3QucHVzaCh0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRoaXMucGFyc2VQYXJlbkl0ZW0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGlubmVyRW5kUG9zID0gdGhpcy5sYXN0VG9rRW5kLCBpbm5lckVuZExvYyA9IHRoaXMubGFzdFRva0VuZExvYztcbiAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLnBhcmVuUik7XG5cbiAgICBpZiAoY2FuQmVBcnJvdyAmJiB0aGlzLnNob3VsZFBhcnNlQXJyb3coZXhwckxpc3QpICYmIHRoaXMuZWF0KHR5cGVzJDEuYXJyb3cpKSB7XG4gICAgICB0aGlzLmNoZWNrUGF0dGVybkVycm9ycyhyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLCBmYWxzZSk7XG4gICAgICB0aGlzLmNoZWNrWWllbGRBd2FpdEluRGVmYXVsdFBhcmFtcygpO1xuICAgICAgdGhpcy55aWVsZFBvcyA9IG9sZFlpZWxkUG9zO1xuICAgICAgdGhpcy5hd2FpdFBvcyA9IG9sZEF3YWl0UG9zO1xuICAgICAgcmV0dXJuIHRoaXMucGFyc2VQYXJlbkFycm93TGlzdChzdGFydFBvcywgc3RhcnRMb2MsIGV4cHJMaXN0LCBmb3JJbml0KVxuICAgIH1cblxuICAgIGlmICghZXhwckxpc3QubGVuZ3RoIHx8IGxhc3RJc0NvbW1hKSB7IHRoaXMudW5leHBlY3RlZCh0aGlzLmxhc3RUb2tTdGFydCk7IH1cbiAgICBpZiAoc3ByZWFkU3RhcnQpIHsgdGhpcy51bmV4cGVjdGVkKHNwcmVhZFN0YXJ0KTsgfVxuICAgIHRoaXMuY2hlY2tFeHByZXNzaW9uRXJyb3JzKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIHRydWUpO1xuICAgIHRoaXMueWllbGRQb3MgPSBvbGRZaWVsZFBvcyB8fCB0aGlzLnlpZWxkUG9zO1xuICAgIHRoaXMuYXdhaXRQb3MgPSBvbGRBd2FpdFBvcyB8fCB0aGlzLmF3YWl0UG9zO1xuXG4gICAgaWYgKGV4cHJMaXN0Lmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhbCA9IHRoaXMuc3RhcnROb2RlQXQoaW5uZXJTdGFydFBvcywgaW5uZXJTdGFydExvYyk7XG4gICAgICB2YWwuZXhwcmVzc2lvbnMgPSBleHByTGlzdDtcbiAgICAgIHRoaXMuZmluaXNoTm9kZUF0KHZhbCwgXCJTZXF1ZW5jZUV4cHJlc3Npb25cIiwgaW5uZXJFbmRQb3MsIGlubmVyRW5kTG9jKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsID0gZXhwckxpc3RbMF07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhbCA9IHRoaXMucGFyc2VQYXJlbkV4cHJlc3Npb24oKTtcbiAgfVxuXG4gIGlmICh0aGlzLm9wdGlvbnMucHJlc2VydmVQYXJlbnMpIHtcbiAgICB2YXIgcGFyID0gdGhpcy5zdGFydE5vZGVBdChzdGFydFBvcywgc3RhcnRMb2MpO1xuICAgIHBhci5leHByZXNzaW9uID0gdmFsO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUocGFyLCBcIlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uXCIpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHZhbFxuICB9XG59O1xuXG5wcCQ1LnBhcnNlUGFyZW5JdGVtID0gZnVuY3Rpb24oaXRlbSkge1xuICByZXR1cm4gaXRlbVxufTtcblxucHAkNS5wYXJzZVBhcmVuQXJyb3dMaXN0ID0gZnVuY3Rpb24oc3RhcnRQb3MsIHN0YXJ0TG9jLCBleHByTGlzdCwgZm9ySW5pdCkge1xuICByZXR1cm4gdGhpcy5wYXJzZUFycm93RXhwcmVzc2lvbih0aGlzLnN0YXJ0Tm9kZUF0KHN0YXJ0UG9zLCBzdGFydExvYyksIGV4cHJMaXN0LCBmYWxzZSwgZm9ySW5pdClcbn07XG5cbi8vIE5ldydzIHByZWNlZGVuY2UgaXMgc2xpZ2h0bHkgdHJpY2t5LiBJdCBtdXN0IGFsbG93IGl0cyBhcmd1bWVudCB0b1xuLy8gYmUgYSBgW11gIG9yIGRvdCBzdWJzY3JpcHQgZXhwcmVzc2lvbiwgYnV0IG5vdCBhIGNhbGwgXHUyMDE0IGF0IGxlYXN0LFxuLy8gbm90IHdpdGhvdXQgd3JhcHBpbmcgaXQgaW4gcGFyZW50aGVzZXMuIFRodXMsIGl0IHVzZXMgdGhlIG5vQ2FsbHNcbi8vIGFyZ3VtZW50IHRvIHBhcnNlU3Vic2NyaXB0cyB0byBwcmV2ZW50IGl0IGZyb20gY29uc3VtaW5nIHRoZVxuLy8gYXJndW1lbnQgbGlzdC5cblxudmFyIGVtcHR5ID0gW107XG5cbnBwJDUucGFyc2VOZXcgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY29udGFpbnNFc2MpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIFwiRXNjYXBlIHNlcXVlbmNlIGluIGtleXdvcmQgbmV3XCIpOyB9XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgdGhpcy5uZXh0KCk7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNiAmJiB0aGlzLnR5cGUgPT09IHR5cGVzJDEuZG90KSB7XG4gICAgdmFyIG1ldGEgPSB0aGlzLnN0YXJ0Tm9kZUF0KG5vZGUuc3RhcnQsIG5vZGUubG9jICYmIG5vZGUubG9jLnN0YXJ0KTtcbiAgICBtZXRhLm5hbWUgPSBcIm5ld1wiO1xuICAgIG5vZGUubWV0YSA9IHRoaXMuZmluaXNoTm9kZShtZXRhLCBcIklkZW50aWZpZXJcIik7XG4gICAgdGhpcy5uZXh0KCk7XG4gICAgdmFyIGNvbnRhaW5zRXNjID0gdGhpcy5jb250YWluc0VzYztcbiAgICBub2RlLnByb3BlcnR5ID0gdGhpcy5wYXJzZUlkZW50KHRydWUpO1xuICAgIGlmIChub2RlLnByb3BlcnR5Lm5hbWUgIT09IFwidGFyZ2V0XCIpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnByb3BlcnR5LnN0YXJ0LCBcIlRoZSBvbmx5IHZhbGlkIG1ldGEgcHJvcGVydHkgZm9yIG5ldyBpcyAnbmV3LnRhcmdldCdcIik7IH1cbiAgICBpZiAoY29udGFpbnNFc2MpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIiduZXcudGFyZ2V0JyBtdXN0IG5vdCBjb250YWluIGVzY2FwZWQgY2hhcmFjdGVyc1wiKTsgfVxuICAgIGlmICghdGhpcy5hbGxvd05ld0RvdFRhcmdldClcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKG5vZGUuc3RhcnQsIFwiJ25ldy50YXJnZXQnIGNhbiBvbmx5IGJlIHVzZWQgaW4gZnVuY3Rpb25zIGFuZCBjbGFzcyBzdGF0aWMgYmxvY2tcIik7IH1cbiAgICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiTWV0YVByb3BlcnR5XCIpXG4gIH1cbiAgdmFyIHN0YXJ0UG9zID0gdGhpcy5zdGFydCwgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICBub2RlLmNhbGxlZSA9IHRoaXMucGFyc2VTdWJzY3JpcHRzKHRoaXMucGFyc2VFeHByQXRvbShudWxsLCBmYWxzZSwgdHJ1ZSksIHN0YXJ0UG9zLCBzdGFydExvYywgdHJ1ZSwgZmFsc2UpO1xuICBpZiAodGhpcy5lYXQodHlwZXMkMS5wYXJlbkwpKSB7IG5vZGUuYXJndW1lbnRzID0gdGhpcy5wYXJzZUV4cHJMaXN0KHR5cGVzJDEucGFyZW5SLCB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCwgZmFsc2UpOyB9XG4gIGVsc2UgeyBub2RlLmFyZ3VtZW50cyA9IGVtcHR5OyB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJOZXdFeHByZXNzaW9uXCIpXG59O1xuXG4vLyBQYXJzZSB0ZW1wbGF0ZSBleHByZXNzaW9uLlxuXG5wcCQ1LnBhcnNlVGVtcGxhdGVFbGVtZW50ID0gZnVuY3Rpb24ocmVmKSB7XG4gIHZhciBpc1RhZ2dlZCA9IHJlZi5pc1RhZ2dlZDtcblxuICB2YXIgZWxlbSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuaW52YWxpZFRlbXBsYXRlKSB7XG4gICAgaWYgKCFpc1RhZ2dlZCkge1xuICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIFwiQmFkIGVzY2FwZSBzZXF1ZW5jZSBpbiB1bnRhZ2dlZCB0ZW1wbGF0ZSBsaXRlcmFsXCIpO1xuICAgIH1cbiAgICBlbGVtLnZhbHVlID0ge1xuICAgICAgcmF3OiB0aGlzLnZhbHVlLnJlcGxhY2UoL1xcclxcbj8vZywgXCJcXG5cIiksXG4gICAgICBjb29rZWQ6IG51bGxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGVsZW0udmFsdWUgPSB7XG4gICAgICByYXc6IHRoaXMuaW5wdXQuc2xpY2UodGhpcy5zdGFydCwgdGhpcy5lbmQpLnJlcGxhY2UoL1xcclxcbj8vZywgXCJcXG5cIiksXG4gICAgICBjb29rZWQ6IHRoaXMudmFsdWVcbiAgICB9O1xuICB9XG4gIHRoaXMubmV4dCgpO1xuICBlbGVtLnRhaWwgPSB0aGlzLnR5cGUgPT09IHR5cGVzJDEuYmFja1F1b3RlO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKGVsZW0sIFwiVGVtcGxhdGVFbGVtZW50XCIpXG59O1xuXG5wcCQ1LnBhcnNlVGVtcGxhdGUgPSBmdW5jdGlvbihyZWYpIHtcbiAgaWYgKCByZWYgPT09IHZvaWQgMCApIHJlZiA9IHt9O1xuICB2YXIgaXNUYWdnZWQgPSByZWYuaXNUYWdnZWQ7IGlmICggaXNUYWdnZWQgPT09IHZvaWQgMCApIGlzVGFnZ2VkID0gZmFsc2U7XG5cbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5leHByZXNzaW9ucyA9IFtdO1xuICB2YXIgY3VyRWx0ID0gdGhpcy5wYXJzZVRlbXBsYXRlRWxlbWVudCh7aXNUYWdnZWQ6IGlzVGFnZ2VkfSk7XG4gIG5vZGUucXVhc2lzID0gW2N1ckVsdF07XG4gIHdoaWxlICghY3VyRWx0LnRhaWwpIHtcbiAgICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmVvZikgeyB0aGlzLnJhaXNlKHRoaXMucG9zLCBcIlVudGVybWluYXRlZCB0ZW1wbGF0ZSBsaXRlcmFsXCIpOyB9XG4gICAgdGhpcy5leHBlY3QodHlwZXMkMS5kb2xsYXJCcmFjZUwpO1xuICAgIG5vZGUuZXhwcmVzc2lvbnMucHVzaCh0aGlzLnBhcnNlRXhwcmVzc2lvbigpKTtcbiAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmJyYWNlUik7XG4gICAgbm9kZS5xdWFzaXMucHVzaChjdXJFbHQgPSB0aGlzLnBhcnNlVGVtcGxhdGVFbGVtZW50KHtpc1RhZ2dlZDogaXNUYWdnZWR9KSk7XG4gIH1cbiAgdGhpcy5uZXh0KCk7XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJUZW1wbGF0ZUxpdGVyYWxcIilcbn07XG5cbnBwJDUuaXNBc3luY1Byb3AgPSBmdW5jdGlvbihwcm9wKSB7XG4gIHJldHVybiAhcHJvcC5jb21wdXRlZCAmJiBwcm9wLmtleS50eXBlID09PSBcIklkZW50aWZpZXJcIiAmJiBwcm9wLmtleS5uYW1lID09PSBcImFzeW5jXCIgJiZcbiAgICAodGhpcy50eXBlID09PSB0eXBlcyQxLm5hbWUgfHwgdGhpcy50eXBlID09PSB0eXBlcyQxLm51bSB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RyaW5nIHx8IHRoaXMudHlwZSA9PT0gdHlwZXMkMS5icmFja2V0TCB8fCB0aGlzLnR5cGUua2V5d29yZCB8fCAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLnN0YXIpKSAmJlxuICAgICFsaW5lQnJlYWsudGVzdCh0aGlzLmlucHV0LnNsaWNlKHRoaXMubGFzdFRva0VuZCwgdGhpcy5zdGFydCkpXG59O1xuXG4vLyBQYXJzZSBhbiBvYmplY3QgbGl0ZXJhbCBvciBiaW5kaW5nIHBhdHRlcm4uXG5cbnBwJDUucGFyc2VPYmogPSBmdW5jdGlvbihpc1BhdHRlcm4sIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpLCBmaXJzdCA9IHRydWUsIHByb3BIYXNoID0ge307XG4gIG5vZGUucHJvcGVydGllcyA9IFtdO1xuICB0aGlzLm5leHQoKTtcbiAgd2hpbGUgKCF0aGlzLmVhdCh0eXBlcyQxLmJyYWNlUikpIHtcbiAgICBpZiAoIWZpcnN0KSB7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNSAmJiB0aGlzLmFmdGVyVHJhaWxpbmdDb21tYSh0eXBlcyQxLmJyYWNlUikpIHsgYnJlYWsgfVxuICAgIH0gZWxzZSB7IGZpcnN0ID0gZmFsc2U7IH1cblxuICAgIHZhciBwcm9wID0gdGhpcy5wYXJzZVByb3BlcnR5KGlzUGF0dGVybiwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgaWYgKCFpc1BhdHRlcm4pIHsgdGhpcy5jaGVja1Byb3BDbGFzaChwcm9wLCBwcm9wSGFzaCwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7IH1cbiAgICBub2RlLnByb3BlcnRpZXMucHVzaChwcm9wKTtcbiAgfVxuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIGlzUGF0dGVybiA/IFwiT2JqZWN0UGF0dGVyblwiIDogXCJPYmplY3RFeHByZXNzaW9uXCIpXG59O1xuXG5wcCQ1LnBhcnNlUHJvcGVydHkgPSBmdW5jdGlvbihpc1BhdHRlcm4sIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgdmFyIHByb3AgPSB0aGlzLnN0YXJ0Tm9kZSgpLCBpc0dlbmVyYXRvciwgaXNBc3luYywgc3RhcnRQb3MsIHN0YXJ0TG9jO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgJiYgdGhpcy5lYXQodHlwZXMkMS5lbGxpcHNpcykpIHtcbiAgICBpZiAoaXNQYXR0ZXJuKSB7XG4gICAgICBwcm9wLmFyZ3VtZW50ID0gdGhpcy5wYXJzZUlkZW50KGZhbHNlKTtcbiAgICAgIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEuY29tbWEpIHtcbiAgICAgICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIFwiQ29tbWEgaXMgbm90IHBlcm1pdHRlZCBhZnRlciB0aGUgcmVzdCBlbGVtZW50XCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShwcm9wLCBcIlJlc3RFbGVtZW50XCIpXG4gICAgfVxuICAgIC8vIFBhcnNlIGFyZ3VtZW50LlxuICAgIHByb3AuYXJndW1lbnQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgIC8vIFRvIGRpc2FsbG93IHRyYWlsaW5nIGNvbW1hIHZpYSBgdGhpcy50b0Fzc2lnbmFibGUoKWAuXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5jb21tYSAmJiByZWZEZXN0cnVjdHVyaW5nRXJyb3JzICYmIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA8IDApIHtcbiAgICAgIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA9IHRoaXMuc3RhcnQ7XG4gICAgfVxuICAgIC8vIEZpbmlzaFxuICAgIHJldHVybiB0aGlzLmZpbmlzaE5vZGUocHJvcCwgXCJTcHJlYWRFbGVtZW50XCIpXG4gIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7XG4gICAgcHJvcC5tZXRob2QgPSBmYWxzZTtcbiAgICBwcm9wLnNob3J0aGFuZCA9IGZhbHNlO1xuICAgIGlmIChpc1BhdHRlcm4gfHwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycykge1xuICAgICAgc3RhcnRQb3MgPSB0aGlzLnN0YXJ0O1xuICAgICAgc3RhcnRMb2MgPSB0aGlzLnN0YXJ0TG9jO1xuICAgIH1cbiAgICBpZiAoIWlzUGF0dGVybilcbiAgICAgIHsgaXNHZW5lcmF0b3IgPSB0aGlzLmVhdCh0eXBlcyQxLnN0YXIpOyB9XG4gIH1cbiAgdmFyIGNvbnRhaW5zRXNjID0gdGhpcy5jb250YWluc0VzYztcbiAgdGhpcy5wYXJzZVByb3BlcnR5TmFtZShwcm9wKTtcbiAgaWYgKCFpc1BhdHRlcm4gJiYgIWNvbnRhaW5zRXNjICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA4ICYmICFpc0dlbmVyYXRvciAmJiB0aGlzLmlzQXN5bmNQcm9wKHByb3ApKSB7XG4gICAgaXNBc3luYyA9IHRydWU7XG4gICAgaXNHZW5lcmF0b3IgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSAmJiB0aGlzLmVhdCh0eXBlcyQxLnN0YXIpO1xuICAgIHRoaXMucGFyc2VQcm9wZXJ0eU5hbWUocHJvcCk7XG4gIH0gZWxzZSB7XG4gICAgaXNBc3luYyA9IGZhbHNlO1xuICB9XG4gIHRoaXMucGFyc2VQcm9wZXJ0eVZhbHVlKHByb3AsIGlzUGF0dGVybiwgaXNHZW5lcmF0b3IsIGlzQXN5bmMsIHN0YXJ0UG9zLCBzdGFydExvYywgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycywgY29udGFpbnNFc2MpO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKHByb3AsIFwiUHJvcGVydHlcIilcbn07XG5cbnBwJDUucGFyc2VHZXR0ZXJTZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG4gIHZhciBraW5kID0gcHJvcC5rZXkubmFtZTtcbiAgdGhpcy5wYXJzZVByb3BlcnR5TmFtZShwcm9wKTtcbiAgcHJvcC52YWx1ZSA9IHRoaXMucGFyc2VNZXRob2QoZmFsc2UpO1xuICBwcm9wLmtpbmQgPSBraW5kO1xuICB2YXIgcGFyYW1Db3VudCA9IHByb3Aua2luZCA9PT0gXCJnZXRcIiA/IDAgOiAxO1xuICBpZiAocHJvcC52YWx1ZS5wYXJhbXMubGVuZ3RoICE9PSBwYXJhbUNvdW50KSB7XG4gICAgdmFyIHN0YXJ0ID0gcHJvcC52YWx1ZS5zdGFydDtcbiAgICBpZiAocHJvcC5raW5kID09PSBcImdldFwiKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoc3RhcnQsIFwiZ2V0dGVyIHNob3VsZCBoYXZlIG5vIHBhcmFtc1wiKTsgfVxuICAgIGVsc2VcbiAgICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHN0YXJ0LCBcInNldHRlciBzaG91bGQgaGF2ZSBleGFjdGx5IG9uZSBwYXJhbVwiKTsgfVxuICB9IGVsc2Uge1xuICAgIGlmIChwcm9wLmtpbmQgPT09IFwic2V0XCIgJiYgcHJvcC52YWx1ZS5wYXJhbXNbMF0udHlwZSA9PT0gXCJSZXN0RWxlbWVudFwiKVxuICAgICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUocHJvcC52YWx1ZS5wYXJhbXNbMF0uc3RhcnQsIFwiU2V0dGVyIGNhbm5vdCB1c2UgcmVzdCBwYXJhbXNcIik7IH1cbiAgfVxufTtcblxucHAkNS5wYXJzZVByb3BlcnR5VmFsdWUgPSBmdW5jdGlvbihwcm9wLCBpc1BhdHRlcm4sIGlzR2VuZXJhdG9yLCBpc0FzeW5jLCBzdGFydFBvcywgc3RhcnRMb2MsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMsIGNvbnRhaW5zRXNjKSB7XG4gIGlmICgoaXNHZW5lcmF0b3IgfHwgaXNBc3luYykgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLmNvbG9uKVxuICAgIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cblxuICBpZiAodGhpcy5lYXQodHlwZXMkMS5jb2xvbikpIHtcbiAgICBwcm9wLnZhbHVlID0gaXNQYXR0ZXJuID8gdGhpcy5wYXJzZU1heWJlRGVmYXVsdCh0aGlzLnN0YXJ0LCB0aGlzLnN0YXJ0TG9jKSA6IHRoaXMucGFyc2VNYXliZUFzc2lnbihmYWxzZSwgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycyk7XG4gICAgcHJvcC5raW5kID0gXCJpbml0XCI7XG4gIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLnBhcmVuTCkge1xuICAgIGlmIChpc1BhdHRlcm4pIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICBwcm9wLm1ldGhvZCA9IHRydWU7XG4gICAgcHJvcC52YWx1ZSA9IHRoaXMucGFyc2VNZXRob2QoaXNHZW5lcmF0b3IsIGlzQXN5bmMpO1xuICAgIHByb3Aua2luZCA9IFwiaW5pdFwiO1xuICB9IGVsc2UgaWYgKCFpc1BhdHRlcm4gJiYgIWNvbnRhaW5zRXNjICYmXG4gICAgICAgICAgICAgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDUgJiYgIXByb3AuY29tcHV0ZWQgJiYgcHJvcC5rZXkudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIgJiZcbiAgICAgICAgICAgICAocHJvcC5rZXkubmFtZSA9PT0gXCJnZXRcIiB8fCBwcm9wLmtleS5uYW1lID09PSBcInNldFwiKSAmJlxuICAgICAgICAgICAgICh0aGlzLnR5cGUgIT09IHR5cGVzJDEuY29tbWEgJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLmJyYWNlUiAmJiB0aGlzLnR5cGUgIT09IHR5cGVzJDEuZXEpKSB7XG4gICAgaWYgKGlzR2VuZXJhdG9yIHx8IGlzQXN5bmMpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICB0aGlzLnBhcnNlR2V0dGVyU2V0dGVyKHByb3ApO1xuICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ICYmICFwcm9wLmNvbXB1dGVkICYmIHByb3Aua2V5LnR5cGUgPT09IFwiSWRlbnRpZmllclwiKSB7XG4gICAgaWYgKGlzR2VuZXJhdG9yIHx8IGlzQXN5bmMpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICB0aGlzLmNoZWNrVW5yZXNlcnZlZChwcm9wLmtleSk7XG4gICAgaWYgKHByb3Aua2V5Lm5hbWUgPT09IFwiYXdhaXRcIiAmJiAhdGhpcy5hd2FpdElkZW50UG9zKVxuICAgICAgeyB0aGlzLmF3YWl0SWRlbnRQb3MgPSBzdGFydFBvczsgfVxuICAgIGlmIChpc1BhdHRlcm4pIHtcbiAgICAgIHByb3AudmFsdWUgPSB0aGlzLnBhcnNlTWF5YmVEZWZhdWx0KHN0YXJ0UG9zLCBzdGFydExvYywgdGhpcy5jb3B5Tm9kZShwcm9wLmtleSkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmVxICYmIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpIHtcbiAgICAgIGlmIChyZWZEZXN0cnVjdHVyaW5nRXJyb3JzLnNob3J0aGFuZEFzc2lnbiA8IDApXG4gICAgICAgIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy5zaG9ydGhhbmRBc3NpZ24gPSB0aGlzLnN0YXJ0OyB9XG4gICAgICBwcm9wLnZhbHVlID0gdGhpcy5wYXJzZU1heWJlRGVmYXVsdChzdGFydFBvcywgc3RhcnRMb2MsIHRoaXMuY29weU5vZGUocHJvcC5rZXkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvcC52YWx1ZSA9IHRoaXMuY29weU5vZGUocHJvcC5rZXkpO1xuICAgIH1cbiAgICBwcm9wLmtpbmQgPSBcImluaXRcIjtcbiAgICBwcm9wLnNob3J0aGFuZCA9IHRydWU7XG4gIH0gZWxzZSB7IHRoaXMudW5leHBlY3RlZCgpOyB9XG59O1xuXG5wcCQ1LnBhcnNlUHJvcGVydHlOYW1lID0gZnVuY3Rpb24ocHJvcCkge1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHtcbiAgICBpZiAodGhpcy5lYXQodHlwZXMkMS5icmFja2V0TCkpIHtcbiAgICAgIHByb3AuY29tcHV0ZWQgPSB0cnVlO1xuICAgICAgcHJvcC5rZXkgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oKTtcbiAgICAgIHRoaXMuZXhwZWN0KHR5cGVzJDEuYnJhY2tldFIpO1xuICAgICAgcmV0dXJuIHByb3Aua2V5XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb3AuY29tcHV0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHByb3Aua2V5ID0gdGhpcy50eXBlID09PSB0eXBlcyQxLm51bSB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuc3RyaW5nID8gdGhpcy5wYXJzZUV4cHJBdG9tKCkgOiB0aGlzLnBhcnNlSWRlbnQodGhpcy5vcHRpb25zLmFsbG93UmVzZXJ2ZWQgIT09IFwibmV2ZXJcIilcbn07XG5cbi8vIEluaXRpYWxpemUgZW1wdHkgZnVuY3Rpb24gbm9kZS5cblxucHAkNS5pbml0RnVuY3Rpb24gPSBmdW5jdGlvbihub2RlKSB7XG4gIG5vZGUuaWQgPSBudWxsO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYpIHsgbm9kZS5nZW5lcmF0b3IgPSBub2RlLmV4cHJlc3Npb24gPSBmYWxzZTsgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgpIHsgbm9kZS5hc3luYyA9IGZhbHNlOyB9XG59O1xuXG4vLyBQYXJzZSBvYmplY3Qgb3IgY2xhc3MgbWV0aG9kLlxuXG5wcCQ1LnBhcnNlTWV0aG9kID0gZnVuY3Rpb24oaXNHZW5lcmF0b3IsIGlzQXN5bmMsIGFsbG93RGlyZWN0U3VwZXIpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpLCBvbGRZaWVsZFBvcyA9IHRoaXMueWllbGRQb3MsIG9sZEF3YWl0UG9zID0gdGhpcy5hd2FpdFBvcywgb2xkQXdhaXRJZGVudFBvcyA9IHRoaXMuYXdhaXRJZGVudFBvcztcblxuICB0aGlzLmluaXRGdW5jdGlvbihub2RlKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KVxuICAgIHsgbm9kZS5nZW5lcmF0b3IgPSBpc0dlbmVyYXRvcjsgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDgpXG4gICAgeyBub2RlLmFzeW5jID0gISFpc0FzeW5jOyB9XG5cbiAgdGhpcy55aWVsZFBvcyA9IDA7XG4gIHRoaXMuYXdhaXRQb3MgPSAwO1xuICB0aGlzLmF3YWl0SWRlbnRQb3MgPSAwO1xuICB0aGlzLmVudGVyU2NvcGUoZnVuY3Rpb25GbGFncyhpc0FzeW5jLCBub2RlLmdlbmVyYXRvcikgfCBTQ09QRV9TVVBFUiB8IChhbGxvd0RpcmVjdFN1cGVyID8gU0NPUEVfRElSRUNUX1NVUEVSIDogMCkpO1xuXG4gIHRoaXMuZXhwZWN0KHR5cGVzJDEucGFyZW5MKTtcbiAgbm9kZS5wYXJhbXMgPSB0aGlzLnBhcnNlQmluZGluZ0xpc3QodHlwZXMkMS5wYXJlblIsIGZhbHNlLCB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCk7XG4gIHRoaXMuY2hlY2tZaWVsZEF3YWl0SW5EZWZhdWx0UGFyYW1zKCk7XG4gIHRoaXMucGFyc2VGdW5jdGlvbkJvZHkobm9kZSwgZmFsc2UsIHRydWUsIGZhbHNlKTtcblxuICB0aGlzLnlpZWxkUG9zID0gb2xkWWllbGRQb3M7XG4gIHRoaXMuYXdhaXRQb3MgPSBvbGRBd2FpdFBvcztcbiAgdGhpcy5hd2FpdElkZW50UG9zID0gb2xkQXdhaXRJZGVudFBvcztcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkZ1bmN0aW9uRXhwcmVzc2lvblwiKVxufTtcblxuLy8gUGFyc2UgYXJyb3cgZnVuY3Rpb24gZXhwcmVzc2lvbiB3aXRoIGdpdmVuIHBhcmFtZXRlcnMuXG5cbnBwJDUucGFyc2VBcnJvd0V4cHJlc3Npb24gPSBmdW5jdGlvbihub2RlLCBwYXJhbXMsIGlzQXN5bmMsIGZvckluaXQpIHtcbiAgdmFyIG9sZFlpZWxkUG9zID0gdGhpcy55aWVsZFBvcywgb2xkQXdhaXRQb3MgPSB0aGlzLmF3YWl0UG9zLCBvbGRBd2FpdElkZW50UG9zID0gdGhpcy5hd2FpdElkZW50UG9zO1xuXG4gIHRoaXMuZW50ZXJTY29wZShmdW5jdGlvbkZsYWdzKGlzQXN5bmMsIGZhbHNlKSB8IFNDT1BFX0FSUk9XKTtcbiAgdGhpcy5pbml0RnVuY3Rpb24obm9kZSk7XG4gIGlmICh0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOCkgeyBub2RlLmFzeW5jID0gISFpc0FzeW5jOyB9XG5cbiAgdGhpcy55aWVsZFBvcyA9IDA7XG4gIHRoaXMuYXdhaXRQb3MgPSAwO1xuICB0aGlzLmF3YWl0SWRlbnRQb3MgPSAwO1xuXG4gIG5vZGUucGFyYW1zID0gdGhpcy50b0Fzc2lnbmFibGVMaXN0KHBhcmFtcywgdHJ1ZSk7XG4gIHRoaXMucGFyc2VGdW5jdGlvbkJvZHkobm9kZSwgdHJ1ZSwgZmFsc2UsIGZvckluaXQpO1xuXG4gIHRoaXMueWllbGRQb3MgPSBvbGRZaWVsZFBvcztcbiAgdGhpcy5hd2FpdFBvcyA9IG9sZEF3YWl0UG9zO1xuICB0aGlzLmF3YWl0SWRlbnRQb3MgPSBvbGRBd2FpdElkZW50UG9zO1xuICByZXR1cm4gdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiQXJyb3dGdW5jdGlvbkV4cHJlc3Npb25cIilcbn07XG5cbi8vIFBhcnNlIGZ1bmN0aW9uIGJvZHkgYW5kIGNoZWNrIHBhcmFtZXRlcnMuXG5cbnBwJDUucGFyc2VGdW5jdGlvbkJvZHkgPSBmdW5jdGlvbihub2RlLCBpc0Fycm93RnVuY3Rpb24sIGlzTWV0aG9kLCBmb3JJbml0KSB7XG4gIHZhciBpc0V4cHJlc3Npb24gPSBpc0Fycm93RnVuY3Rpb24gJiYgdGhpcy50eXBlICE9PSB0eXBlcyQxLmJyYWNlTDtcbiAgdmFyIG9sZFN0cmljdCA9IHRoaXMuc3RyaWN0LCB1c2VTdHJpY3QgPSBmYWxzZTtcblxuICBpZiAoaXNFeHByZXNzaW9uKSB7XG4gICAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZvckluaXQpO1xuICAgIG5vZGUuZXhwcmVzc2lvbiA9IHRydWU7XG4gICAgdGhpcy5jaGVja1BhcmFtcyhub2RlLCBmYWxzZSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG5vblNpbXBsZSA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA3ICYmICF0aGlzLmlzU2ltcGxlUGFyYW1MaXN0KG5vZGUucGFyYW1zKTtcbiAgICBpZiAoIW9sZFN0cmljdCB8fCBub25TaW1wbGUpIHtcbiAgICAgIHVzZVN0cmljdCA9IHRoaXMuc3RyaWN0RGlyZWN0aXZlKHRoaXMuZW5kKTtcbiAgICAgIC8vIElmIHRoaXMgaXMgYSBzdHJpY3QgbW9kZSBmdW5jdGlvbiwgdmVyaWZ5IHRoYXQgYXJndW1lbnQgbmFtZXNcbiAgICAgIC8vIGFyZSBub3QgcmVwZWF0ZWQsIGFuZCBpdCBkb2VzIG5vdCB0cnkgdG8gYmluZCB0aGUgd29yZHMgYGV2YWxgXG4gICAgICAvLyBvciBgYXJndW1lbnRzYC5cbiAgICAgIGlmICh1c2VTdHJpY3QgJiYgbm9uU2ltcGxlKVxuICAgICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShub2RlLnN0YXJ0LCBcIklsbGVnYWwgJ3VzZSBzdHJpY3QnIGRpcmVjdGl2ZSBpbiBmdW5jdGlvbiB3aXRoIG5vbi1zaW1wbGUgcGFyYW1ldGVyIGxpc3RcIik7IH1cbiAgICB9XG4gICAgLy8gU3RhcnQgYSBuZXcgc2NvcGUgd2l0aCByZWdhcmQgdG8gbGFiZWxzIGFuZCB0aGUgYGluRnVuY3Rpb25gXG4gICAgLy8gZmxhZyAocmVzdG9yZSB0aGVtIHRvIHRoZWlyIG9sZCB2YWx1ZSBhZnRlcndhcmRzKS5cbiAgICB2YXIgb2xkTGFiZWxzID0gdGhpcy5sYWJlbHM7XG4gICAgdGhpcy5sYWJlbHMgPSBbXTtcbiAgICBpZiAodXNlU3RyaWN0KSB7IHRoaXMuc3RyaWN0ID0gdHJ1ZTsgfVxuXG4gICAgLy8gQWRkIHRoZSBwYXJhbXMgdG8gdmFyRGVjbGFyZWROYW1lcyB0byBlbnN1cmUgdGhhdCBhbiBlcnJvciBpcyB0aHJvd25cbiAgICAvLyBpZiBhIGxldC9jb25zdCBkZWNsYXJhdGlvbiBpbiB0aGUgZnVuY3Rpb24gY2xhc2hlcyB3aXRoIG9uZSBvZiB0aGUgcGFyYW1zLlxuICAgIHRoaXMuY2hlY2tQYXJhbXMobm9kZSwgIW9sZFN0cmljdCAmJiAhdXNlU3RyaWN0ICYmICFpc0Fycm93RnVuY3Rpb24gJiYgIWlzTWV0aG9kICYmIHRoaXMuaXNTaW1wbGVQYXJhbUxpc3Qobm9kZS5wYXJhbXMpKTtcbiAgICAvLyBFbnN1cmUgdGhlIGZ1bmN0aW9uIG5hbWUgaXNuJ3QgYSBmb3JiaWRkZW4gaWRlbnRpZmllciBpbiBzdHJpY3QgbW9kZSwgZS5nLiAnZXZhbCdcbiAgICBpZiAodGhpcy5zdHJpY3QgJiYgbm9kZS5pZCkgeyB0aGlzLmNoZWNrTFZhbFNpbXBsZShub2RlLmlkLCBCSU5EX09VVFNJREUpOyB9XG4gICAgbm9kZS5ib2R5ID0gdGhpcy5wYXJzZUJsb2NrKGZhbHNlLCB1bmRlZmluZWQsIHVzZVN0cmljdCAmJiAhb2xkU3RyaWN0KTtcbiAgICBub2RlLmV4cHJlc3Npb24gPSBmYWxzZTtcbiAgICB0aGlzLmFkYXB0RGlyZWN0aXZlUHJvbG9ndWUobm9kZS5ib2R5LmJvZHkpO1xuICAgIHRoaXMubGFiZWxzID0gb2xkTGFiZWxzO1xuICB9XG4gIHRoaXMuZXhpdFNjb3BlKCk7XG59O1xuXG5wcCQ1LmlzU2ltcGxlUGFyYW1MaXN0ID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsaXN0ID0gcGFyYW1zOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSlcbiAgICB7XG4gICAgdmFyIHBhcmFtID0gbGlzdFtpXTtcblxuICAgIGlmIChwYXJhbS50eXBlICE9PSBcIklkZW50aWZpZXJcIikgeyByZXR1cm4gZmFsc2VcbiAgfSB9XG4gIHJldHVybiB0cnVlXG59O1xuXG4vLyBDaGVja3MgZnVuY3Rpb24gcGFyYW1zIGZvciB2YXJpb3VzIGRpc2FsbG93ZWQgcGF0dGVybnMgc3VjaCBhcyB1c2luZyBcImV2YWxcIlxuLy8gb3IgXCJhcmd1bWVudHNcIiBhbmQgZHVwbGljYXRlIHBhcmFtZXRlcnMuXG5cbnBwJDUuY2hlY2tQYXJhbXMgPSBmdW5jdGlvbihub2RlLCBhbGxvd0R1cGxpY2F0ZXMpIHtcbiAgdmFyIG5hbWVIYXNoID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBub2RlLnBhcmFtczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpXG4gICAge1xuICAgIHZhciBwYXJhbSA9IGxpc3RbaV07XG5cbiAgICB0aGlzLmNoZWNrTFZhbElubmVyUGF0dGVybihwYXJhbSwgQklORF9WQVIsIGFsbG93RHVwbGljYXRlcyA/IG51bGwgOiBuYW1lSGFzaCk7XG4gIH1cbn07XG5cbi8vIFBhcnNlcyBhIGNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIGV4cHJlc3Npb25zLCBhbmQgcmV0dXJucyB0aGVtIGFzXG4vLyBhbiBhcnJheS4gYGNsb3NlYCBpcyB0aGUgdG9rZW4gdHlwZSB0aGF0IGVuZHMgdGhlIGxpc3QsIGFuZFxuLy8gYGFsbG93RW1wdHlgIGNhbiBiZSB0dXJuZWQgb24gdG8gYWxsb3cgc3Vic2VxdWVudCBjb21tYXMgd2l0aFxuLy8gbm90aGluZyBpbiBiZXR3ZWVuIHRoZW0gdG8gYmUgcGFyc2VkIGFzIGBudWxsYCAod2hpY2ggaXMgbmVlZGVkXG4vLyBmb3IgYXJyYXkgbGl0ZXJhbHMpLlxuXG5wcCQ1LnBhcnNlRXhwckxpc3QgPSBmdW5jdGlvbihjbG9zZSwgYWxsb3dUcmFpbGluZ0NvbW1hLCBhbGxvd0VtcHR5LCByZWZEZXN0cnVjdHVyaW5nRXJyb3JzKSB7XG4gIHZhciBlbHRzID0gW10sIGZpcnN0ID0gdHJ1ZTtcbiAgd2hpbGUgKCF0aGlzLmVhdChjbG9zZSkpIHtcbiAgICBpZiAoIWZpcnN0KSB7XG4gICAgICB0aGlzLmV4cGVjdCh0eXBlcyQxLmNvbW1hKTtcbiAgICAgIGlmIChhbGxvd1RyYWlsaW5nQ29tbWEgJiYgdGhpcy5hZnRlclRyYWlsaW5nQ29tbWEoY2xvc2UpKSB7IGJyZWFrIH1cbiAgICB9IGVsc2UgeyBmaXJzdCA9IGZhbHNlOyB9XG5cbiAgICB2YXIgZWx0ID0gKHZvaWQgMCk7XG4gICAgaWYgKGFsbG93RW1wdHkgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hKVxuICAgICAgeyBlbHQgPSBudWxsOyB9XG4gICAgZWxzZSBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLmVsbGlwc2lzKSB7XG4gICAgICBlbHQgPSB0aGlzLnBhcnNlU3ByZWFkKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgICAgaWYgKHJlZkRlc3RydWN0dXJpbmdFcnJvcnMgJiYgdGhpcy50eXBlID09PSB0eXBlcyQxLmNvbW1hICYmIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMudHJhaWxpbmdDb21tYSA8IDApXG4gICAgICAgIHsgcmVmRGVzdHJ1Y3R1cmluZ0Vycm9ycy50cmFpbGluZ0NvbW1hID0gdGhpcy5zdGFydDsgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbHQgPSB0aGlzLnBhcnNlTWF5YmVBc3NpZ24oZmFsc2UsIHJlZkRlc3RydWN0dXJpbmdFcnJvcnMpO1xuICAgIH1cbiAgICBlbHRzLnB1c2goZWx0KTtcbiAgfVxuICByZXR1cm4gZWx0c1xufTtcblxucHAkNS5jaGVja1VucmVzZXJ2ZWQgPSBmdW5jdGlvbihyZWYpIHtcbiAgdmFyIHN0YXJ0ID0gcmVmLnN0YXJ0O1xuICB2YXIgZW5kID0gcmVmLmVuZDtcbiAgdmFyIG5hbWUgPSByZWYubmFtZTtcblxuICBpZiAodGhpcy5pbkdlbmVyYXRvciAmJiBuYW1lID09PSBcInlpZWxkXCIpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUoc3RhcnQsIFwiQ2Fubm90IHVzZSAneWllbGQnIGFzIGlkZW50aWZpZXIgaW5zaWRlIGEgZ2VuZXJhdG9yXCIpOyB9XG4gIGlmICh0aGlzLmluQXN5bmMgJiYgbmFtZSA9PT0gXCJhd2FpdFwiKVxuICAgIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHN0YXJ0LCBcIkNhbm5vdCB1c2UgJ2F3YWl0JyBhcyBpZGVudGlmaWVyIGluc2lkZSBhbiBhc3luYyBmdW5jdGlvblwiKTsgfVxuICBpZiAoISh0aGlzLmN1cnJlbnRUaGlzU2NvcGUoKS5mbGFncyAmIFNDT1BFX1ZBUikgJiYgbmFtZSA9PT0gXCJhcmd1bWVudHNcIilcbiAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShzdGFydCwgXCJDYW5ub3QgdXNlICdhcmd1bWVudHMnIGluIGNsYXNzIGZpZWxkIGluaXRpYWxpemVyXCIpOyB9XG4gIGlmICh0aGlzLmluQ2xhc3NTdGF0aWNCbG9jayAmJiAobmFtZSA9PT0gXCJhcmd1bWVudHNcIiB8fCBuYW1lID09PSBcImF3YWl0XCIpKVxuICAgIHsgdGhpcy5yYWlzZShzdGFydCwgKFwiQ2Fubm90IHVzZSBcIiArIG5hbWUgKyBcIiBpbiBjbGFzcyBzdGF0aWMgaW5pdGlhbGl6YXRpb24gYmxvY2tcIikpOyB9XG4gIGlmICh0aGlzLmtleXdvcmRzLnRlc3QobmFtZSkpXG4gICAgeyB0aGlzLnJhaXNlKHN0YXJ0LCAoXCJVbmV4cGVjdGVkIGtleXdvcmQgJ1wiICsgbmFtZSArIFwiJ1wiKSk7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDYgJiZcbiAgICB0aGlzLmlucHV0LnNsaWNlKHN0YXJ0LCBlbmQpLmluZGV4T2YoXCJcXFxcXCIpICE9PSAtMSkgeyByZXR1cm4gfVxuICB2YXIgcmUgPSB0aGlzLnN0cmljdCA/IHRoaXMucmVzZXJ2ZWRXb3Jkc1N0cmljdCA6IHRoaXMucmVzZXJ2ZWRXb3JkcztcbiAgaWYgKHJlLnRlc3QobmFtZSkpIHtcbiAgICBpZiAoIXRoaXMuaW5Bc3luYyAmJiBuYW1lID09PSBcImF3YWl0XCIpXG4gICAgICB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZShzdGFydCwgXCJDYW5ub3QgdXNlIGtleXdvcmQgJ2F3YWl0JyBvdXRzaWRlIGFuIGFzeW5jIGZ1bmN0aW9uXCIpOyB9XG4gICAgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHN0YXJ0LCAoXCJUaGUga2V5d29yZCAnXCIgKyBuYW1lICsgXCInIGlzIHJlc2VydmVkXCIpKTtcbiAgfVxufTtcblxuLy8gUGFyc2UgdGhlIG5leHQgdG9rZW4gYXMgYW4gaWRlbnRpZmllci4gSWYgYGxpYmVyYWxgIGlzIHRydWUgKHVzZWRcbi8vIHdoZW4gcGFyc2luZyBwcm9wZXJ0aWVzKSwgaXQgd2lsbCBhbHNvIGNvbnZlcnQga2V5d29yZHMgaW50b1xuLy8gaWRlbnRpZmllcnMuXG5cbnBwJDUucGFyc2VJZGVudCA9IGZ1bmN0aW9uKGxpYmVyYWwpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLnBhcnNlSWRlbnROb2RlKCk7XG4gIHRoaXMubmV4dCghIWxpYmVyYWwpO1xuICB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJJZGVudGlmaWVyXCIpO1xuICBpZiAoIWxpYmVyYWwpIHtcbiAgICB0aGlzLmNoZWNrVW5yZXNlcnZlZChub2RlKTtcbiAgICBpZiAobm9kZS5uYW1lID09PSBcImF3YWl0XCIgJiYgIXRoaXMuYXdhaXRJZGVudFBvcylcbiAgICAgIHsgdGhpcy5hd2FpdElkZW50UG9zID0gbm9kZS5zdGFydDsgfVxuICB9XG4gIHJldHVybiBub2RlXG59O1xuXG5wcCQ1LnBhcnNlSWRlbnROb2RlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlID0gdGhpcy5zdGFydE5vZGUoKTtcbiAgaWYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS5uYW1lKSB7XG4gICAgbm9kZS5uYW1lID0gdGhpcy52YWx1ZTtcbiAgfSBlbHNlIGlmICh0aGlzLnR5cGUua2V5d29yZCkge1xuICAgIG5vZGUubmFtZSA9IHRoaXMudHlwZS5rZXl3b3JkO1xuXG4gICAgLy8gVG8gZml4IGh0dHBzOi8vZ2l0aHViLmNvbS9hY29ybmpzL2Fjb3JuL2lzc3Vlcy81NzVcbiAgICAvLyBgY2xhc3NgIGFuZCBgZnVuY3Rpb25gIGtleXdvcmRzIHB1c2ggbmV3IGNvbnRleHQgaW50byB0aGlzLmNvbnRleHQuXG4gICAgLy8gQnV0IHRoZXJlIGlzIG5vIGNoYW5jZSB0byBwb3AgdGhlIGNvbnRleHQgaWYgdGhlIGtleXdvcmQgaXMgY29uc3VtZWQgYXMgYW4gaWRlbnRpZmllciBzdWNoIGFzIGEgcHJvcGVydHkgbmFtZS5cbiAgICAvLyBJZiB0aGUgcHJldmlvdXMgdG9rZW4gaXMgYSBkb3QsIHRoaXMgZG9lcyBub3QgYXBwbHkgYmVjYXVzZSB0aGUgY29udGV4dC1tYW5hZ2luZyBjb2RlIGFscmVhZHkgaWdub3JlZCB0aGUga2V5d29yZFxuICAgIGlmICgobm9kZS5uYW1lID09PSBcImNsYXNzXCIgfHwgbm9kZS5uYW1lID09PSBcImZ1bmN0aW9uXCIpICYmXG4gICAgICAodGhpcy5sYXN0VG9rRW5kICE9PSB0aGlzLmxhc3RUb2tTdGFydCArIDEgfHwgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMubGFzdFRva1N0YXJ0KSAhPT0gNDYpKSB7XG4gICAgICB0aGlzLmNvbnRleHQucG9wKCk7XG4gICAgfVxuICAgIHRoaXMudHlwZSA9IHR5cGVzJDEubmFtZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnVuZXhwZWN0ZWQoKTtcbiAgfVxuICByZXR1cm4gbm9kZVxufTtcblxucHAkNS5wYXJzZVByaXZhdGVJZGVudCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIGlmICh0aGlzLnR5cGUgPT09IHR5cGVzJDEucHJpdmF0ZUlkKSB7XG4gICAgbm9kZS5uYW1lID0gdGhpcy52YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnVuZXhwZWN0ZWQoKTtcbiAgfVxuICB0aGlzLm5leHQoKTtcbiAgdGhpcy5maW5pc2hOb2RlKG5vZGUsIFwiUHJpdmF0ZUlkZW50aWZpZXJcIik7XG5cbiAgLy8gRm9yIHZhbGlkYXRpbmcgZXhpc3RlbmNlXG4gIGlmICh0aGlzLm9wdGlvbnMuY2hlY2tQcml2YXRlRmllbGRzKSB7XG4gICAgaWYgKHRoaXMucHJpdmF0ZU5hbWVTdGFjay5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMucmFpc2Uobm9kZS5zdGFydCwgKFwiUHJpdmF0ZSBmaWVsZCAnI1wiICsgKG5vZGUubmFtZSkgKyBcIicgbXVzdCBiZSBkZWNsYXJlZCBpbiBhbiBlbmNsb3NpbmcgY2xhc3NcIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnByaXZhdGVOYW1lU3RhY2tbdGhpcy5wcml2YXRlTmFtZVN0YWNrLmxlbmd0aCAtIDFdLnVzZWQucHVzaChub2RlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbm9kZVxufTtcblxuLy8gUGFyc2VzIHlpZWxkIGV4cHJlc3Npb24gaW5zaWRlIGdlbmVyYXRvci5cblxucHAkNS5wYXJzZVlpZWxkID0gZnVuY3Rpb24oZm9ySW5pdCkge1xuICBpZiAoIXRoaXMueWllbGRQb3MpIHsgdGhpcy55aWVsZFBvcyA9IHRoaXMuc3RhcnQ7IH1cblxuICB2YXIgbm9kZSA9IHRoaXMuc3RhcnROb2RlKCk7XG4gIHRoaXMubmV4dCgpO1xuICBpZiAodGhpcy50eXBlID09PSB0eXBlcyQxLnNlbWkgfHwgdGhpcy5jYW5JbnNlcnRTZW1pY29sb24oKSB8fCAodGhpcy50eXBlICE9PSB0eXBlcyQxLnN0YXIgJiYgIXRoaXMudHlwZS5zdGFydHNFeHByKSkge1xuICAgIG5vZGUuZGVsZWdhdGUgPSBmYWxzZTtcbiAgICBub2RlLmFyZ3VtZW50ID0gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICBub2RlLmRlbGVnYXRlID0gdGhpcy5lYXQodHlwZXMkMS5zdGFyKTtcbiAgICBub2RlLmFyZ3VtZW50ID0gdGhpcy5wYXJzZU1heWJlQXNzaWduKGZvckluaXQpO1xuICB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE5vZGUobm9kZSwgXCJZaWVsZEV4cHJlc3Npb25cIilcbn07XG5cbnBwJDUucGFyc2VBd2FpdCA9IGZ1bmN0aW9uKGZvckluaXQpIHtcbiAgaWYgKCF0aGlzLmF3YWl0UG9zKSB7IHRoaXMuYXdhaXRQb3MgPSB0aGlzLnN0YXJ0OyB9XG5cbiAgdmFyIG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSgpO1xuICB0aGlzLm5leHQoKTtcbiAgbm9kZS5hcmd1bWVudCA9IHRoaXMucGFyc2VNYXliZVVuYXJ5KG51bGwsIHRydWUsIGZhbHNlLCBmb3JJbml0KTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoTm9kZShub2RlLCBcIkF3YWl0RXhwcmVzc2lvblwiKVxufTtcblxudmFyIHBwJDQgPSBQYXJzZXIucHJvdG90eXBlO1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gcmFpc2UgZXhjZXB0aW9ucyBvbiBwYXJzZSBlcnJvcnMuIEl0XG4vLyB0YWtlcyBhbiBvZmZzZXQgaW50ZWdlciAoaW50byB0aGUgY3VycmVudCBgaW5wdXRgKSB0byBpbmRpY2F0ZVxuLy8gdGhlIGxvY2F0aW9uIG9mIHRoZSBlcnJvciwgYXR0YWNoZXMgdGhlIHBvc2l0aW9uIHRvIHRoZSBlbmRcbi8vIG9mIHRoZSBlcnJvciBtZXNzYWdlLCBhbmQgdGhlbiByYWlzZXMgYSBgU3ludGF4RXJyb3JgIHdpdGggdGhhdFxuLy8gbWVzc2FnZS5cblxucHAkNC5yYWlzZSA9IGZ1bmN0aW9uKHBvcywgbWVzc2FnZSkge1xuICB2YXIgbG9jID0gZ2V0TGluZUluZm8odGhpcy5pbnB1dCwgcG9zKTtcbiAgbWVzc2FnZSArPSBcIiAoXCIgKyBsb2MubGluZSArIFwiOlwiICsgbG9jLmNvbHVtbiArIFwiKVwiO1xuICBpZiAodGhpcy5zb3VyY2VGaWxlKSB7XG4gICAgbWVzc2FnZSArPSBcIiBpbiBcIiArIHRoaXMuc291cmNlRmlsZTtcbiAgfVxuICB2YXIgZXJyID0gbmV3IFN5bnRheEVycm9yKG1lc3NhZ2UpO1xuICBlcnIucG9zID0gcG9zOyBlcnIubG9jID0gbG9jOyBlcnIucmFpc2VkQXQgPSB0aGlzLnBvcztcbiAgdGhyb3cgZXJyXG59O1xuXG5wcCQ0LnJhaXNlUmVjb3ZlcmFibGUgPSBwcCQ0LnJhaXNlO1xuXG5wcCQ0LmN1clBvc2l0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbih0aGlzLmN1ckxpbmUsIHRoaXMucG9zIC0gdGhpcy5saW5lU3RhcnQpXG4gIH1cbn07XG5cbnZhciBwcCQzID0gUGFyc2VyLnByb3RvdHlwZTtcblxudmFyIFNjb3BlID0gZnVuY3Rpb24gU2NvcGUoZmxhZ3MpIHtcbiAgdGhpcy5mbGFncyA9IGZsYWdzO1xuICAvLyBBIGxpc3Qgb2YgdmFyLWRlY2xhcmVkIG5hbWVzIGluIHRoZSBjdXJyZW50IGxleGljYWwgc2NvcGVcbiAgdGhpcy52YXIgPSBbXTtcbiAgLy8gQSBsaXN0IG9mIGxleGljYWxseS1kZWNsYXJlZCBuYW1lcyBpbiB0aGUgY3VycmVudCBsZXhpY2FsIHNjb3BlXG4gIHRoaXMubGV4aWNhbCA9IFtdO1xuICAvLyBBIGxpc3Qgb2YgbGV4aWNhbGx5LWRlY2xhcmVkIEZ1bmN0aW9uRGVjbGFyYXRpb24gbmFtZXMgaW4gdGhlIGN1cnJlbnQgbGV4aWNhbCBzY29wZVxuICB0aGlzLmZ1bmN0aW9ucyA9IFtdO1xufTtcblxuLy8gVGhlIGZ1bmN0aW9ucyBpbiB0aGlzIG1vZHVsZSBrZWVwIHRyYWNrIG9mIGRlY2xhcmVkIHZhcmlhYmxlcyBpbiB0aGUgY3VycmVudCBzY29wZSBpbiBvcmRlciB0byBkZXRlY3QgZHVwbGljYXRlIHZhcmlhYmxlIG5hbWVzLlxuXG5wcCQzLmVudGVyU2NvcGUgPSBmdW5jdGlvbihmbGFncykge1xuICB0aGlzLnNjb3BlU3RhY2sucHVzaChuZXcgU2NvcGUoZmxhZ3MpKTtcbn07XG5cbnBwJDMuZXhpdFNjb3BlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc2NvcGVTdGFjay5wb3AoKTtcbn07XG5cbi8vIFRoZSBzcGVjIHNheXM6XG4vLyA+IEF0IHRoZSB0b3AgbGV2ZWwgb2YgYSBmdW5jdGlvbiwgb3Igc2NyaXB0LCBmdW5jdGlvbiBkZWNsYXJhdGlvbnMgYXJlXG4vLyA+IHRyZWF0ZWQgbGlrZSB2YXIgZGVjbGFyYXRpb25zIHJhdGhlciB0aGFuIGxpa2UgbGV4aWNhbCBkZWNsYXJhdGlvbnMuXG5wcCQzLnRyZWF0RnVuY3Rpb25zQXNWYXJJblNjb3BlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgcmV0dXJuIChzY29wZS5mbGFncyAmIFNDT1BFX0ZVTkNUSU9OKSB8fCAhdGhpcy5pbk1vZHVsZSAmJiAoc2NvcGUuZmxhZ3MgJiBTQ09QRV9UT1ApXG59O1xuXG5wcCQzLmRlY2xhcmVOYW1lID0gZnVuY3Rpb24obmFtZSwgYmluZGluZ1R5cGUsIHBvcykge1xuICB2YXIgcmVkZWNsYXJlZCA9IGZhbHNlO1xuICBpZiAoYmluZGluZ1R5cGUgPT09IEJJTkRfTEVYSUNBTCkge1xuICAgIHZhciBzY29wZSA9IHRoaXMuY3VycmVudFNjb3BlKCk7XG4gICAgcmVkZWNsYXJlZCA9IHNjb3BlLmxleGljYWwuaW5kZXhPZihuYW1lKSA+IC0xIHx8IHNjb3BlLmZ1bmN0aW9ucy5pbmRleE9mKG5hbWUpID4gLTEgfHwgc2NvcGUudmFyLmluZGV4T2YobmFtZSkgPiAtMTtcbiAgICBzY29wZS5sZXhpY2FsLnB1c2gobmFtZSk7XG4gICAgaWYgKHRoaXMuaW5Nb2R1bGUgJiYgKHNjb3BlLmZsYWdzICYgU0NPUEVfVE9QKSlcbiAgICAgIHsgZGVsZXRlIHRoaXMudW5kZWZpbmVkRXhwb3J0c1tuYW1lXTsgfVxuICB9IGVsc2UgaWYgKGJpbmRpbmdUeXBlID09PSBCSU5EX1NJTVBMRV9DQVRDSCkge1xuICAgIHZhciBzY29wZSQxID0gdGhpcy5jdXJyZW50U2NvcGUoKTtcbiAgICBzY29wZSQxLmxleGljYWwucHVzaChuYW1lKTtcbiAgfSBlbHNlIGlmIChiaW5kaW5nVHlwZSA9PT0gQklORF9GVU5DVElPTikge1xuICAgIHZhciBzY29wZSQyID0gdGhpcy5jdXJyZW50U2NvcGUoKTtcbiAgICBpZiAodGhpcy50cmVhdEZ1bmN0aW9uc0FzVmFyKVxuICAgICAgeyByZWRlY2xhcmVkID0gc2NvcGUkMi5sZXhpY2FsLmluZGV4T2YobmFtZSkgPiAtMTsgfVxuICAgIGVsc2VcbiAgICAgIHsgcmVkZWNsYXJlZCA9IHNjb3BlJDIubGV4aWNhbC5pbmRleE9mKG5hbWUpID4gLTEgfHwgc2NvcGUkMi52YXIuaW5kZXhPZihuYW1lKSA+IC0xOyB9XG4gICAgc2NvcGUkMi5mdW5jdGlvbnMucHVzaChuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gdGhpcy5zY29wZVN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB2YXIgc2NvcGUkMyA9IHRoaXMuc2NvcGVTdGFja1tpXTtcbiAgICAgIGlmIChzY29wZSQzLmxleGljYWwuaW5kZXhPZihuYW1lKSA+IC0xICYmICEoKHNjb3BlJDMuZmxhZ3MgJiBTQ09QRV9TSU1QTEVfQ0FUQ0gpICYmIHNjb3BlJDMubGV4aWNhbFswXSA9PT0gbmFtZSkgfHxcbiAgICAgICAgICAhdGhpcy50cmVhdEZ1bmN0aW9uc0FzVmFySW5TY29wZShzY29wZSQzKSAmJiBzY29wZSQzLmZ1bmN0aW9ucy5pbmRleE9mKG5hbWUpID4gLTEpIHtcbiAgICAgICAgcmVkZWNsYXJlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBzY29wZSQzLnZhci5wdXNoKG5hbWUpO1xuICAgICAgaWYgKHRoaXMuaW5Nb2R1bGUgJiYgKHNjb3BlJDMuZmxhZ3MgJiBTQ09QRV9UT1ApKVxuICAgICAgICB7IGRlbGV0ZSB0aGlzLnVuZGVmaW5lZEV4cG9ydHNbbmFtZV07IH1cbiAgICAgIGlmIChzY29wZSQzLmZsYWdzICYgU0NPUEVfVkFSKSB7IGJyZWFrIH1cbiAgICB9XG4gIH1cbiAgaWYgKHJlZGVjbGFyZWQpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHBvcywgKFwiSWRlbnRpZmllciAnXCIgKyBuYW1lICsgXCInIGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWRcIikpOyB9XG59O1xuXG5wcCQzLmNoZWNrTG9jYWxFeHBvcnQgPSBmdW5jdGlvbihpZCkge1xuICAvLyBzY29wZS5mdW5jdGlvbnMgbXVzdCBiZSBlbXB0eSBhcyBNb2R1bGUgY29kZSBpcyBhbHdheXMgc3RyaWN0LlxuICBpZiAodGhpcy5zY29wZVN0YWNrWzBdLmxleGljYWwuaW5kZXhPZihpZC5uYW1lKSA9PT0gLTEgJiZcbiAgICAgIHRoaXMuc2NvcGVTdGFja1swXS52YXIuaW5kZXhPZihpZC5uYW1lKSA9PT0gLTEpIHtcbiAgICB0aGlzLnVuZGVmaW5lZEV4cG9ydHNbaWQubmFtZV0gPSBpZDtcbiAgfVxufTtcblxucHAkMy5jdXJyZW50U2NvcGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc2NvcGVTdGFja1t0aGlzLnNjb3BlU3RhY2subGVuZ3RoIC0gMV1cbn07XG5cbnBwJDMuY3VycmVudFZhclNjb3BlID0gZnVuY3Rpb24oKSB7XG4gIGZvciAodmFyIGkgPSB0aGlzLnNjb3BlU3RhY2subGVuZ3RoIC0gMTs7IGktLSkge1xuICAgIHZhciBzY29wZSA9IHRoaXMuc2NvcGVTdGFja1tpXTtcbiAgICBpZiAoc2NvcGUuZmxhZ3MgJiAoU0NPUEVfVkFSIHwgU0NPUEVfQ0xBU1NfRklFTERfSU5JVCB8IFNDT1BFX0NMQVNTX1NUQVRJQ19CTE9DSykpIHsgcmV0dXJuIHNjb3BlIH1cbiAgfVxufTtcblxuLy8gQ291bGQgYmUgdXNlZnVsIGZvciBgdGhpc2AsIGBuZXcudGFyZ2V0YCwgYHN1cGVyKClgLCBgc3VwZXIucHJvcGVydHlgLCBhbmQgYHN1cGVyW3Byb3BlcnR5XWAuXG5wcCQzLmN1cnJlbnRUaGlzU2NvcGUgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IHRoaXMuc2NvcGVTdGFjay5sZW5ndGggLSAxOzsgaS0tKSB7XG4gICAgdmFyIHNjb3BlID0gdGhpcy5zY29wZVN0YWNrW2ldO1xuICAgIGlmIChzY29wZS5mbGFncyAmIChTQ09QRV9WQVIgfCBTQ09QRV9DTEFTU19GSUVMRF9JTklUIHwgU0NPUEVfQ0xBU1NfU1RBVElDX0JMT0NLKSAmJlxuICAgICAgICAhKHNjb3BlLmZsYWdzICYgU0NPUEVfQVJST1cpKSB7IHJldHVybiBzY29wZSB9XG4gIH1cbn07XG5cbnZhciBOb2RlID0gZnVuY3Rpb24gTm9kZShwYXJzZXIsIHBvcywgbG9jKSB7XG4gIHRoaXMudHlwZSA9IFwiXCI7XG4gIHRoaXMuc3RhcnQgPSBwb3M7XG4gIHRoaXMuZW5kID0gMDtcbiAgaWYgKHBhcnNlci5vcHRpb25zLmxvY2F0aW9ucylcbiAgICB7IHRoaXMubG9jID0gbmV3IFNvdXJjZUxvY2F0aW9uKHBhcnNlciwgbG9jKTsgfVxuICBpZiAocGFyc2VyLm9wdGlvbnMuZGlyZWN0U291cmNlRmlsZSlcbiAgICB7IHRoaXMuc291cmNlRmlsZSA9IHBhcnNlci5vcHRpb25zLmRpcmVjdFNvdXJjZUZpbGU7IH1cbiAgaWYgKHBhcnNlci5vcHRpb25zLnJhbmdlcylcbiAgICB7IHRoaXMucmFuZ2UgPSBbcG9zLCAwXTsgfVxufTtcblxuLy8gU3RhcnQgYW4gQVNUIG5vZGUsIGF0dGFjaGluZyBhIHN0YXJ0IG9mZnNldC5cblxudmFyIHBwJDIgPSBQYXJzZXIucHJvdG90eXBlO1xuXG5wcCQyLnN0YXJ0Tm9kZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IE5vZGUodGhpcywgdGhpcy5zdGFydCwgdGhpcy5zdGFydExvYylcbn07XG5cbnBwJDIuc3RhcnROb2RlQXQgPSBmdW5jdGlvbihwb3MsIGxvYykge1xuICByZXR1cm4gbmV3IE5vZGUodGhpcywgcG9zLCBsb2MpXG59O1xuXG4vLyBGaW5pc2ggYW4gQVNUIG5vZGUsIGFkZGluZyBgdHlwZWAgYW5kIGBlbmRgIHByb3BlcnRpZXMuXG5cbmZ1bmN0aW9uIGZpbmlzaE5vZGVBdChub2RlLCB0eXBlLCBwb3MsIGxvYykge1xuICBub2RlLnR5cGUgPSB0eXBlO1xuICBub2RlLmVuZCA9IHBvcztcbiAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpXG4gICAgeyBub2RlLmxvYy5lbmQgPSBsb2M7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpXG4gICAgeyBub2RlLnJhbmdlWzFdID0gcG9zOyB9XG4gIHJldHVybiBub2RlXG59XG5cbnBwJDIuZmluaXNoTm9kZSA9IGZ1bmN0aW9uKG5vZGUsIHR5cGUpIHtcbiAgcmV0dXJuIGZpbmlzaE5vZGVBdC5jYWxsKHRoaXMsIG5vZGUsIHR5cGUsIHRoaXMubGFzdFRva0VuZCwgdGhpcy5sYXN0VG9rRW5kTG9jKVxufTtcblxuLy8gRmluaXNoIG5vZGUgYXQgZ2l2ZW4gcG9zaXRpb25cblxucHAkMi5maW5pc2hOb2RlQXQgPSBmdW5jdGlvbihub2RlLCB0eXBlLCBwb3MsIGxvYykge1xuICByZXR1cm4gZmluaXNoTm9kZUF0LmNhbGwodGhpcywgbm9kZSwgdHlwZSwgcG9zLCBsb2MpXG59O1xuXG5wcCQyLmNvcHlOb2RlID0gZnVuY3Rpb24obm9kZSkge1xuICB2YXIgbmV3Tm9kZSA9IG5ldyBOb2RlKHRoaXMsIG5vZGUuc3RhcnQsIHRoaXMuc3RhcnRMb2MpO1xuICBmb3IgKHZhciBwcm9wIGluIG5vZGUpIHsgbmV3Tm9kZVtwcm9wXSA9IG5vZGVbcHJvcF07IH1cbiAgcmV0dXJuIG5ld05vZGVcbn07XG5cbi8vIFRoaXMgZmlsZSB3YXMgZ2VuZXJhdGVkIGJ5IFwiYmluL2dlbmVyYXRlLXVuaWNvZGUtc2NyaXB0LXZhbHVlcy5qc1wiLiBEbyBub3QgbW9kaWZ5IG1hbnVhbGx5IVxudmFyIHNjcmlwdFZhbHVlc0FkZGVkSW5Vbmljb2RlID0gXCJCZXJmIEJlcmlhX0VyZmUgR2FyYSBHYXJheSBHdWtoIEd1cnVuZ19LaGVtYSBIcmt0IEthdGFrYW5hX09yX0hpcmFnYW5hIEthd2kgS2lyYXRfUmFpIEtyYWkgTmFnX011bmRhcmkgTmFnbSBPbF9PbmFsIE9uYW8gU2lkZXRpYyBTaWR0IFN1bnUgU3VudXdhciBUYWlfWW8gVGF5byBUb2RocmkgVG9kciBUb2xvbmdfU2lraSBUb2xzIFR1bHVfVGlnYWxhcmkgVHV0ZyBVbmtub3duIFp6enpcIjtcblxuLy8gVGhpcyBmaWxlIGNvbnRhaW5zIFVuaWNvZGUgcHJvcGVydGllcyBleHRyYWN0ZWQgZnJvbSB0aGUgRUNNQVNjcmlwdCBzcGVjaWZpY2F0aW9uLlxuLy8gVGhlIGxpc3RzIGFyZSBleHRyYWN0ZWQgbGlrZSBzbzpcbi8vICQkKCcjdGFibGUtYmluYXJ5LXVuaWNvZGUtcHJvcGVydGllcyA+IGZpZ3VyZSA+IHRhYmxlID4gdGJvZHkgPiB0ciA+IHRkOm50aC1jaGlsZCgxKSBjb2RlJykubWFwKGVsID0+IGVsLmlubmVyVGV4dClcblxuLy8gI3RhYmxlLWJpbmFyeS11bmljb2RlLXByb3BlcnRpZXNcbnZhciBlY21hOUJpbmFyeVByb3BlcnRpZXMgPSBcIkFTQ0lJIEFTQ0lJX0hleF9EaWdpdCBBSGV4IEFscGhhYmV0aWMgQWxwaGEgQW55IEFzc2lnbmVkIEJpZGlfQ29udHJvbCBCaWRpX0MgQmlkaV9NaXJyb3JlZCBCaWRpX00gQ2FzZV9JZ25vcmFibGUgQ0kgQ2FzZWQgQ2hhbmdlc19XaGVuX0Nhc2Vmb2xkZWQgQ1dDRiBDaGFuZ2VzX1doZW5fQ2FzZW1hcHBlZCBDV0NNIENoYW5nZXNfV2hlbl9Mb3dlcmNhc2VkIENXTCBDaGFuZ2VzX1doZW5fTkZLQ19DYXNlZm9sZGVkIENXS0NGIENoYW5nZXNfV2hlbl9UaXRsZWNhc2VkIENXVCBDaGFuZ2VzX1doZW5fVXBwZXJjYXNlZCBDV1UgRGFzaCBEZWZhdWx0X0lnbm9yYWJsZV9Db2RlX1BvaW50IERJIERlcHJlY2F0ZWQgRGVwIERpYWNyaXRpYyBEaWEgRW1vamkgRW1vamlfQ29tcG9uZW50IEVtb2ppX01vZGlmaWVyIEVtb2ppX01vZGlmaWVyX0Jhc2UgRW1vamlfUHJlc2VudGF0aW9uIEV4dGVuZGVyIEV4dCBHcmFwaGVtZV9CYXNlIEdyX0Jhc2UgR3JhcGhlbWVfRXh0ZW5kIEdyX0V4dCBIZXhfRGlnaXQgSGV4IElEU19CaW5hcnlfT3BlcmF0b3IgSURTQiBJRFNfVHJpbmFyeV9PcGVyYXRvciBJRFNUIElEX0NvbnRpbnVlIElEQyBJRF9TdGFydCBJRFMgSWRlb2dyYXBoaWMgSWRlbyBKb2luX0NvbnRyb2wgSm9pbl9DIExvZ2ljYWxfT3JkZXJfRXhjZXB0aW9uIExPRSBMb3dlcmNhc2UgTG93ZXIgTWF0aCBOb25jaGFyYWN0ZXJfQ29kZV9Qb2ludCBOQ2hhciBQYXR0ZXJuX1N5bnRheCBQYXRfU3luIFBhdHRlcm5fV2hpdGVfU3BhY2UgUGF0X1dTIFF1b3RhdGlvbl9NYXJrIFFNYXJrIFJhZGljYWwgUmVnaW9uYWxfSW5kaWNhdG9yIFJJIFNlbnRlbmNlX1Rlcm1pbmFsIFNUZXJtIFNvZnRfRG90dGVkIFNEIFRlcm1pbmFsX1B1bmN0dWF0aW9uIFRlcm0gVW5pZmllZF9JZGVvZ3JhcGggVUlkZW8gVXBwZXJjYXNlIFVwcGVyIFZhcmlhdGlvbl9TZWxlY3RvciBWUyBXaGl0ZV9TcGFjZSBzcGFjZSBYSURfQ29udGludWUgWElEQyBYSURfU3RhcnQgWElEU1wiO1xudmFyIGVjbWExMEJpbmFyeVByb3BlcnRpZXMgPSBlY21hOUJpbmFyeVByb3BlcnRpZXMgKyBcIiBFeHRlbmRlZF9QaWN0b2dyYXBoaWNcIjtcbnZhciBlY21hMTFCaW5hcnlQcm9wZXJ0aWVzID0gZWNtYTEwQmluYXJ5UHJvcGVydGllcztcbnZhciBlY21hMTJCaW5hcnlQcm9wZXJ0aWVzID0gZWNtYTExQmluYXJ5UHJvcGVydGllcyArIFwiIEVCYXNlIEVDb21wIEVNb2QgRVByZXMgRXh0UGljdFwiO1xudmFyIGVjbWExM0JpbmFyeVByb3BlcnRpZXMgPSBlY21hMTJCaW5hcnlQcm9wZXJ0aWVzO1xudmFyIGVjbWExNEJpbmFyeVByb3BlcnRpZXMgPSBlY21hMTNCaW5hcnlQcm9wZXJ0aWVzO1xuXG52YXIgdW5pY29kZUJpbmFyeVByb3BlcnRpZXMgPSB7XG4gIDk6IGVjbWE5QmluYXJ5UHJvcGVydGllcyxcbiAgMTA6IGVjbWExMEJpbmFyeVByb3BlcnRpZXMsXG4gIDExOiBlY21hMTFCaW5hcnlQcm9wZXJ0aWVzLFxuICAxMjogZWNtYTEyQmluYXJ5UHJvcGVydGllcyxcbiAgMTM6IGVjbWExM0JpbmFyeVByb3BlcnRpZXMsXG4gIDE0OiBlY21hMTRCaW5hcnlQcm9wZXJ0aWVzXG59O1xuXG4vLyAjdGFibGUtYmluYXJ5LXVuaWNvZGUtcHJvcGVydGllcy1vZi1zdHJpbmdzXG52YXIgZWNtYTE0QmluYXJ5UHJvcGVydGllc09mU3RyaW5ncyA9IFwiQmFzaWNfRW1vamkgRW1vamlfS2V5Y2FwX1NlcXVlbmNlIFJHSV9FbW9qaV9Nb2RpZmllcl9TZXF1ZW5jZSBSR0lfRW1vamlfRmxhZ19TZXF1ZW5jZSBSR0lfRW1vamlfVGFnX1NlcXVlbmNlIFJHSV9FbW9qaV9aV0pfU2VxdWVuY2UgUkdJX0Vtb2ppXCI7XG5cbnZhciB1bmljb2RlQmluYXJ5UHJvcGVydGllc09mU3RyaW5ncyA9IHtcbiAgOTogXCJcIixcbiAgMTA6IFwiXCIsXG4gIDExOiBcIlwiLFxuICAxMjogXCJcIixcbiAgMTM6IFwiXCIsXG4gIDE0OiBlY21hMTRCaW5hcnlQcm9wZXJ0aWVzT2ZTdHJpbmdzXG59O1xuXG4vLyAjdGFibGUtdW5pY29kZS1nZW5lcmFsLWNhdGVnb3J5LXZhbHVlc1xudmFyIHVuaWNvZGVHZW5lcmFsQ2F0ZWdvcnlWYWx1ZXMgPSBcIkNhc2VkX0xldHRlciBMQyBDbG9zZV9QdW5jdHVhdGlvbiBQZSBDb25uZWN0b3JfUHVuY3R1YXRpb24gUGMgQ29udHJvbCBDYyBjbnRybCBDdXJyZW5jeV9TeW1ib2wgU2MgRGFzaF9QdW5jdHVhdGlvbiBQZCBEZWNpbWFsX051bWJlciBOZCBkaWdpdCBFbmNsb3NpbmdfTWFyayBNZSBGaW5hbF9QdW5jdHVhdGlvbiBQZiBGb3JtYXQgQ2YgSW5pdGlhbF9QdW5jdHVhdGlvbiBQaSBMZXR0ZXIgTCBMZXR0ZXJfTnVtYmVyIE5sIExpbmVfU2VwYXJhdG9yIFpsIExvd2VyY2FzZV9MZXR0ZXIgTGwgTWFyayBNIENvbWJpbmluZ19NYXJrIE1hdGhfU3ltYm9sIFNtIE1vZGlmaWVyX0xldHRlciBMbSBNb2RpZmllcl9TeW1ib2wgU2sgTm9uc3BhY2luZ19NYXJrIE1uIE51bWJlciBOIE9wZW5fUHVuY3R1YXRpb24gUHMgT3RoZXIgQyBPdGhlcl9MZXR0ZXIgTG8gT3RoZXJfTnVtYmVyIE5vIE90aGVyX1B1bmN0dWF0aW9uIFBvIE90aGVyX1N5bWJvbCBTbyBQYXJhZ3JhcGhfU2VwYXJhdG9yIFpwIFByaXZhdGVfVXNlIENvIFB1bmN0dWF0aW9uIFAgcHVuY3QgU2VwYXJhdG9yIFogU3BhY2VfU2VwYXJhdG9yIFpzIFNwYWNpbmdfTWFyayBNYyBTdXJyb2dhdGUgQ3MgU3ltYm9sIFMgVGl0bGVjYXNlX0xldHRlciBMdCBVbmFzc2lnbmVkIENuIFVwcGVyY2FzZV9MZXR0ZXIgTHVcIjtcblxuLy8gI3RhYmxlLXVuaWNvZGUtc2NyaXB0LXZhbHVlc1xudmFyIGVjbWE5U2NyaXB0VmFsdWVzID0gXCJBZGxhbSBBZGxtIEFob20gQW5hdG9saWFuX0hpZXJvZ2x5cGhzIEhsdXcgQXJhYmljIEFyYWIgQXJtZW5pYW4gQXJtbiBBdmVzdGFuIEF2c3QgQmFsaW5lc2UgQmFsaSBCYW11bSBCYW11IEJhc3NhX1ZhaCBCYXNzIEJhdGFrIEJhdGsgQmVuZ2FsaSBCZW5nIEJoYWlrc3VraSBCaGtzIEJvcG9tb2ZvIEJvcG8gQnJhaG1pIEJyYWggQnJhaWxsZSBCcmFpIEJ1Z2luZXNlIEJ1Z2kgQnVoaWQgQnVoZCBDYW5hZGlhbl9BYm9yaWdpbmFsIENhbnMgQ2FyaWFuIENhcmkgQ2F1Y2FzaWFuX0FsYmFuaWFuIEFnaGIgQ2hha21hIENha20gQ2hhbSBDaGFtIENoZXJva2VlIENoZXIgQ29tbW9uIFp5eXkgQ29wdGljIENvcHQgUWFhYyBDdW5laWZvcm0gWHN1eCBDeXByaW90IENwcnQgQ3lyaWxsaWMgQ3lybCBEZXNlcmV0IERzcnQgRGV2YW5hZ2FyaSBEZXZhIER1cGxveWFuIER1cGwgRWd5cHRpYW5fSGllcm9nbHlwaHMgRWd5cCBFbGJhc2FuIEVsYmEgRXRoaW9waWMgRXRoaSBHZW9yZ2lhbiBHZW9yIEdsYWdvbGl0aWMgR2xhZyBHb3RoaWMgR290aCBHcmFudGhhIEdyYW4gR3JlZWsgR3JlayBHdWphcmF0aSBHdWpyIEd1cm11a2hpIEd1cnUgSGFuIEhhbmkgSGFuZ3VsIEhhbmcgSGFudW5vbyBIYW5vIEhhdHJhbiBIYXRyIEhlYnJldyBIZWJyIEhpcmFnYW5hIEhpcmEgSW1wZXJpYWxfQXJhbWFpYyBBcm1pIEluaGVyaXRlZCBaaW5oIFFhYWkgSW5zY3JpcHRpb25hbF9QYWhsYXZpIFBobGkgSW5zY3JpcHRpb25hbF9QYXJ0aGlhbiBQcnRpIEphdmFuZXNlIEphdmEgS2FpdGhpIEt0aGkgS2FubmFkYSBLbmRhIEthdGFrYW5hIEthbmEgS2F5YWhfTGkgS2FsaSBLaGFyb3NodGhpIEtoYXIgS2htZXIgS2htciBLaG9qa2kgS2hvaiBLaHVkYXdhZGkgU2luZCBMYW8gTGFvbyBMYXRpbiBMYXRuIExlcGNoYSBMZXBjIExpbWJ1IExpbWIgTGluZWFyX0EgTGluYSBMaW5lYXJfQiBMaW5iIExpc3UgTGlzdSBMeWNpYW4gTHljaSBMeWRpYW4gTHlkaSBNYWhhamFuaSBNYWhqIE1hbGF5YWxhbSBNbHltIE1hbmRhaWMgTWFuZCBNYW5pY2hhZWFuIE1hbmkgTWFyY2hlbiBNYXJjIE1hc2FyYW1fR29uZGkgR29ubSBNZWV0ZWlfTWF5ZWsgTXRlaSBNZW5kZV9LaWtha3VpIE1lbmQgTWVyb2l0aWNfQ3Vyc2l2ZSBNZXJjIE1lcm9pdGljX0hpZXJvZ2x5cGhzIE1lcm8gTWlhbyBQbHJkIE1vZGkgTW9uZ29saWFuIE1vbmcgTXJvIE1yb28gTXVsdGFuaSBNdWx0IE15YW5tYXIgTXltciBOYWJhdGFlYW4gTmJhdCBOZXdfVGFpX0x1ZSBUYWx1IE5ld2EgTmV3YSBOa28gTmtvbyBOdXNodSBOc2h1IE9naGFtIE9nYW0gT2xfQ2hpa2kgT2xjayBPbGRfSHVuZ2FyaWFuIEh1bmcgT2xkX0l0YWxpYyBJdGFsIE9sZF9Ob3J0aF9BcmFiaWFuIE5hcmIgT2xkX1Blcm1pYyBQZXJtIE9sZF9QZXJzaWFuIFhwZW8gT2xkX1NvdXRoX0FyYWJpYW4gU2FyYiBPbGRfVHVya2ljIE9ya2ggT3JpeWEgT3J5YSBPc2FnZSBPc2dlIE9zbWFueWEgT3NtYSBQYWhhd2hfSG1vbmcgSG1uZyBQYWxteXJlbmUgUGFsbSBQYXVfQ2luX0hhdSBQYXVjIFBoYWdzX1BhIFBoYWcgUGhvZW5pY2lhbiBQaG54IFBzYWx0ZXJfUGFobGF2aSBQaGxwIFJlamFuZyBSam5nIFJ1bmljIFJ1bnIgU2FtYXJpdGFuIFNhbXIgU2F1cmFzaHRyYSBTYXVyIFNoYXJhZGEgU2hyZCBTaGF2aWFuIFNoYXcgU2lkZGhhbSBTaWRkIFNpZ25Xcml0aW5nIFNnbncgU2luaGFsYSBTaW5oIFNvcmFfU29tcGVuZyBTb3JhIFNveW9tYm8gU295byBTdW5kYW5lc2UgU3VuZCBTeWxvdGlfTmFncmkgU3lsbyBTeXJpYWMgU3lyYyBUYWdhbG9nIFRnbGcgVGFnYmFud2EgVGFnYiBUYWlfTGUgVGFsZSBUYWlfVGhhbSBMYW5hIFRhaV9WaWV0IFRhdnQgVGFrcmkgVGFrciBUYW1pbCBUYW1sIFRhbmd1dCBUYW5nIFRlbHVndSBUZWx1IFRoYWFuYSBUaGFhIFRoYWkgVGhhaSBUaWJldGFuIFRpYnQgVGlmaW5hZ2ggVGZuZyBUaXJodXRhIFRpcmggVWdhcml0aWMgVWdhciBWYWkgVmFpaSBXYXJhbmdfQ2l0aSBXYXJhIFlpIFlpaWkgWmFuYWJhemFyX1NxdWFyZSBaYW5iXCI7XG52YXIgZWNtYTEwU2NyaXB0VmFsdWVzID0gZWNtYTlTY3JpcHRWYWx1ZXMgKyBcIiBEb2dyYSBEb2dyIEd1bmphbGFfR29uZGkgR29uZyBIYW5pZmlfUm9oaW5neWEgUm9oZyBNYWthc2FyIE1ha2EgTWVkZWZhaWRyaW4gTWVkZiBPbGRfU29nZGlhbiBTb2dvIFNvZ2RpYW4gU29nZFwiO1xudmFyIGVjbWExMVNjcmlwdFZhbHVlcyA9IGVjbWExMFNjcmlwdFZhbHVlcyArIFwiIEVseW1haWMgRWx5bSBOYW5kaW5hZ2FyaSBOYW5kIE55aWFrZW5nX1B1YWNodWVfSG1vbmcgSG1ucCBXYW5jaG8gV2Nob1wiO1xudmFyIGVjbWExMlNjcmlwdFZhbHVlcyA9IGVjbWExMVNjcmlwdFZhbHVlcyArIFwiIENob3Jhc21pYW4gQ2hycyBEaWFrIERpdmVzX0FrdXJ1IEtoaXRhbl9TbWFsbF9TY3JpcHQgS2l0cyBZZXppIFllemlkaVwiO1xudmFyIGVjbWExM1NjcmlwdFZhbHVlcyA9IGVjbWExMlNjcmlwdFZhbHVlcyArIFwiIEN5cHJvX01pbm9hbiBDcG1uIE9sZF9VeWdodXIgT3VnciBUYW5nc2EgVG5zYSBUb3RvIFZpdGhrdXFpIFZpdGhcIjtcbnZhciBlY21hMTRTY3JpcHRWYWx1ZXMgPSBlY21hMTNTY3JpcHRWYWx1ZXMgKyBcIiBcIiArIHNjcmlwdFZhbHVlc0FkZGVkSW5Vbmljb2RlO1xuXG52YXIgdW5pY29kZVNjcmlwdFZhbHVlcyA9IHtcbiAgOTogZWNtYTlTY3JpcHRWYWx1ZXMsXG4gIDEwOiBlY21hMTBTY3JpcHRWYWx1ZXMsXG4gIDExOiBlY21hMTFTY3JpcHRWYWx1ZXMsXG4gIDEyOiBlY21hMTJTY3JpcHRWYWx1ZXMsXG4gIDEzOiBlY21hMTNTY3JpcHRWYWx1ZXMsXG4gIDE0OiBlY21hMTRTY3JpcHRWYWx1ZXNcbn07XG5cbnZhciBkYXRhID0ge307XG5mdW5jdGlvbiBidWlsZFVuaWNvZGVEYXRhKGVjbWFWZXJzaW9uKSB7XG4gIHZhciBkID0gZGF0YVtlY21hVmVyc2lvbl0gPSB7XG4gICAgYmluYXJ5OiB3b3Jkc1JlZ2V4cCh1bmljb2RlQmluYXJ5UHJvcGVydGllc1tlY21hVmVyc2lvbl0gKyBcIiBcIiArIHVuaWNvZGVHZW5lcmFsQ2F0ZWdvcnlWYWx1ZXMpLFxuICAgIGJpbmFyeU9mU3RyaW5nczogd29yZHNSZWdleHAodW5pY29kZUJpbmFyeVByb3BlcnRpZXNPZlN0cmluZ3NbZWNtYVZlcnNpb25dKSxcbiAgICBub25CaW5hcnk6IHtcbiAgICAgIEdlbmVyYWxfQ2F0ZWdvcnk6IHdvcmRzUmVnZXhwKHVuaWNvZGVHZW5lcmFsQ2F0ZWdvcnlWYWx1ZXMpLFxuICAgICAgU2NyaXB0OiB3b3Jkc1JlZ2V4cCh1bmljb2RlU2NyaXB0VmFsdWVzW2VjbWFWZXJzaW9uXSlcbiAgICB9XG4gIH07XG4gIGQubm9uQmluYXJ5LlNjcmlwdF9FeHRlbnNpb25zID0gZC5ub25CaW5hcnkuU2NyaXB0O1xuXG4gIGQubm9uQmluYXJ5LmdjID0gZC5ub25CaW5hcnkuR2VuZXJhbF9DYXRlZ29yeTtcbiAgZC5ub25CaW5hcnkuc2MgPSBkLm5vbkJpbmFyeS5TY3JpcHQ7XG4gIGQubm9uQmluYXJ5LnNjeCA9IGQubm9uQmluYXJ5LlNjcmlwdF9FeHRlbnNpb25zO1xufVxuXG5mb3IgKHZhciBpID0gMCwgbGlzdCA9IFs5LCAxMCwgMTEsIDEyLCAxMywgMTRdOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gMSkge1xuICB2YXIgZWNtYVZlcnNpb24gPSBsaXN0W2ldO1xuXG4gIGJ1aWxkVW5pY29kZURhdGEoZWNtYVZlcnNpb24pO1xufVxuXG52YXIgcHAkMSA9IFBhcnNlci5wcm90b3R5cGU7XG5cbi8vIFRyYWNrIGRpc2p1bmN0aW9uIHN0cnVjdHVyZSB0byBkZXRlcm1pbmUgd2hldGhlciBhIGR1cGxpY2F0ZVxuLy8gY2FwdHVyZSBncm91cCBuYW1lIGlzIGFsbG93ZWQgYmVjYXVzZSBpdCBpcyBpbiBhIHNlcGFyYXRlIGJyYW5jaC5cbnZhciBCcmFuY2hJRCA9IGZ1bmN0aW9uIEJyYW5jaElEKHBhcmVudCwgYmFzZSkge1xuICAvLyBQYXJlbnQgZGlzanVuY3Rpb24gYnJhbmNoXG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAvLyBJZGVudGlmaWVzIHRoaXMgc2V0IG9mIHNpYmxpbmcgYnJhbmNoZXNcbiAgdGhpcy5iYXNlID0gYmFzZSB8fCB0aGlzO1xufTtcblxuQnJhbmNoSUQucHJvdG90eXBlLnNlcGFyYXRlZEZyb20gPSBmdW5jdGlvbiBzZXBhcmF0ZWRGcm9tIChhbHQpIHtcbiAgLy8gQSBicmFuY2ggaXMgc2VwYXJhdGUgZnJvbSBhbm90aGVyIGJyYW5jaCBpZiB0aGV5IG9yIGFueSBvZlxuICAvLyB0aGVpciBwYXJlbnRzIGFyZSBzaWJsaW5ncyBpbiBhIGdpdmVuIGRpc2p1bmN0aW9uXG4gIGZvciAodmFyIHNlbGYgPSB0aGlzOyBzZWxmOyBzZWxmID0gc2VsZi5wYXJlbnQpIHtcbiAgICBmb3IgKHZhciBvdGhlciA9IGFsdDsgb3RoZXI7IG90aGVyID0gb3RoZXIucGFyZW50KSB7XG4gICAgICBpZiAoc2VsZi5iYXNlID09PSBvdGhlci5iYXNlICYmIHNlbGYgIT09IG90aGVyKSB7IHJldHVybiB0cnVlIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG5CcmFuY2hJRC5wcm90b3R5cGUuc2libGluZyA9IGZ1bmN0aW9uIHNpYmxpbmcgKCkge1xuICByZXR1cm4gbmV3IEJyYW5jaElEKHRoaXMucGFyZW50LCB0aGlzLmJhc2UpXG59O1xuXG52YXIgUmVnRXhwVmFsaWRhdGlvblN0YXRlID0gZnVuY3Rpb24gUmVnRXhwVmFsaWRhdGlvblN0YXRlKHBhcnNlcikge1xuICB0aGlzLnBhcnNlciA9IHBhcnNlcjtcbiAgdGhpcy52YWxpZEZsYWdzID0gXCJnaW1cIiArIChwYXJzZXIub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2ID8gXCJ1eVwiIDogXCJcIikgKyAocGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gOSA/IFwic1wiIDogXCJcIikgKyAocGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTMgPyBcImRcIiA6IFwiXCIpICsgKHBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE1ID8gXCJ2XCIgOiBcIlwiKTtcbiAgdGhpcy51bmljb2RlUHJvcGVydGllcyA9IGRhdGFbcGFyc2VyLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTQgPyAxNCA6IHBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uXTtcbiAgdGhpcy5zb3VyY2UgPSBcIlwiO1xuICB0aGlzLmZsYWdzID0gXCJcIjtcbiAgdGhpcy5zdGFydCA9IDA7XG4gIHRoaXMuc3dpdGNoVSA9IGZhbHNlO1xuICB0aGlzLnN3aXRjaFYgPSBmYWxzZTtcbiAgdGhpcy5zd2l0Y2hOID0gZmFsc2U7XG4gIHRoaXMucG9zID0gMDtcbiAgdGhpcy5sYXN0SW50VmFsdWUgPSAwO1xuICB0aGlzLmxhc3RTdHJpbmdWYWx1ZSA9IFwiXCI7XG4gIHRoaXMubGFzdEFzc2VydGlvbklzUXVhbnRpZmlhYmxlID0gZmFsc2U7XG4gIHRoaXMubnVtQ2FwdHVyaW5nUGFyZW5zID0gMDtcbiAgdGhpcy5tYXhCYWNrUmVmZXJlbmNlID0gMDtcbiAgdGhpcy5ncm91cE5hbWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdGhpcy5iYWNrUmVmZXJlbmNlTmFtZXMgPSBbXTtcbiAgdGhpcy5icmFuY2hJRCA9IG51bGw7XG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gcmVzZXQgKHN0YXJ0LCBwYXR0ZXJuLCBmbGFncykge1xuICB2YXIgdW5pY29kZVNldHMgPSBmbGFncy5pbmRleE9mKFwidlwiKSAhPT0gLTE7XG4gIHZhciB1bmljb2RlID0gZmxhZ3MuaW5kZXhPZihcInVcIikgIT09IC0xO1xuICB0aGlzLnN0YXJ0ID0gc3RhcnQgfCAwO1xuICB0aGlzLnNvdXJjZSA9IHBhdHRlcm4gKyBcIlwiO1xuICB0aGlzLmZsYWdzID0gZmxhZ3M7XG4gIGlmICh1bmljb2RlU2V0cyAmJiB0aGlzLnBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE1KSB7XG4gICAgdGhpcy5zd2l0Y2hVID0gdHJ1ZTtcbiAgICB0aGlzLnN3aXRjaFYgPSB0cnVlO1xuICAgIHRoaXMuc3dpdGNoTiA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zd2l0Y2hVID0gdW5pY29kZSAmJiB0aGlzLnBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDY7XG4gICAgdGhpcy5zd2l0Y2hWID0gZmFsc2U7XG4gICAgdGhpcy5zd2l0Y2hOID0gdW5pY29kZSAmJiB0aGlzLnBhcnNlci5vcHRpb25zLmVjbWFWZXJzaW9uID49IDk7XG4gIH1cbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUucmFpc2UgPSBmdW5jdGlvbiByYWlzZSAobWVzc2FnZSkge1xuICB0aGlzLnBhcnNlci5yYWlzZVJlY292ZXJhYmxlKHRoaXMuc3RhcnQsIChcIkludmFsaWQgcmVndWxhciBleHByZXNzaW9uOiAvXCIgKyAodGhpcy5zb3VyY2UpICsgXCIvOiBcIiArIG1lc3NhZ2UpKTtcbn07XG5cbi8vIElmIHUgZmxhZyBpcyBnaXZlbiwgdGhpcyByZXR1cm5zIHRoZSBjb2RlIHBvaW50IGF0IHRoZSBpbmRleCAoaXQgY29tYmluZXMgYSBzdXJyb2dhdGUgcGFpcikuXG4vLyBPdGhlcndpc2UsIHRoaXMgcmV0dXJucyB0aGUgY29kZSB1bml0IG9mIHRoZSBpbmRleCAoY2FuIGJlIGEgcGFydCBvZiBhIHN1cnJvZ2F0ZSBwYWlyKS5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUuYXQgPSBmdW5jdGlvbiBhdCAoaSwgZm9yY2VVKSB7XG4gICAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIHZhciBzID0gdGhpcy5zb3VyY2U7XG4gIHZhciBsID0gcy5sZW5ndGg7XG4gIGlmIChpID49IGwpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICB2YXIgYyA9IHMuY2hhckNvZGVBdChpKTtcbiAgaWYgKCEoZm9yY2VVIHx8IHRoaXMuc3dpdGNoVSkgfHwgYyA8PSAweEQ3RkYgfHwgYyA+PSAweEUwMDAgfHwgaSArIDEgPj0gbCkge1xuICAgIHJldHVybiBjXG4gIH1cbiAgdmFyIG5leHQgPSBzLmNoYXJDb2RlQXQoaSArIDEpO1xuICByZXR1cm4gbmV4dCA+PSAweERDMDAgJiYgbmV4dCA8PSAweERGRkYgPyAoYyA8PCAxMCkgKyBuZXh0IC0gMHgzNUZEQzAwIDogY1xufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5uZXh0SW5kZXggPSBmdW5jdGlvbiBuZXh0SW5kZXggKGksIGZvcmNlVSkge1xuICAgIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICB2YXIgcyA9IHRoaXMuc291cmNlO1xuICB2YXIgbCA9IHMubGVuZ3RoO1xuICBpZiAoaSA+PSBsKSB7XG4gICAgcmV0dXJuIGxcbiAgfVxuICB2YXIgYyA9IHMuY2hhckNvZGVBdChpKSwgbmV4dDtcbiAgaWYgKCEoZm9yY2VVIHx8IHRoaXMuc3dpdGNoVSkgfHwgYyA8PSAweEQ3RkYgfHwgYyA+PSAweEUwMDAgfHwgaSArIDEgPj0gbCB8fFxuICAgICAgKG5leHQgPSBzLmNoYXJDb2RlQXQoaSArIDEpKSA8IDB4REMwMCB8fCBuZXh0ID4gMHhERkZGKSB7XG4gICAgcmV0dXJuIGkgKyAxXG4gIH1cbiAgcmV0dXJuIGkgKyAyXG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLmN1cnJlbnQgPSBmdW5jdGlvbiBjdXJyZW50IChmb3JjZVUpIHtcbiAgICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgcmV0dXJuIHRoaXMuYXQodGhpcy5wb3MsIGZvcmNlVSlcbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUubG9va2FoZWFkID0gZnVuY3Rpb24gbG9va2FoZWFkIChmb3JjZVUpIHtcbiAgICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgcmV0dXJuIHRoaXMuYXQodGhpcy5uZXh0SW5kZXgodGhpcy5wb3MsIGZvcmNlVSksIGZvcmNlVSlcbn07XG5cblJlZ0V4cFZhbGlkYXRpb25TdGF0ZS5wcm90b3R5cGUuYWR2YW5jZSA9IGZ1bmN0aW9uIGFkdmFuY2UgKGZvcmNlVSkge1xuICAgIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICB0aGlzLnBvcyA9IHRoaXMubmV4dEluZGV4KHRoaXMucG9zLCBmb3JjZVUpO1xufTtcblxuUmVnRXhwVmFsaWRhdGlvblN0YXRlLnByb3RvdHlwZS5lYXQgPSBmdW5jdGlvbiBlYXQgKGNoLCBmb3JjZVUpIHtcbiAgICBpZiAoIGZvcmNlVSA9PT0gdm9pZCAwICkgZm9yY2VVID0gZmFsc2U7XG5cbiAgaWYgKHRoaXMuY3VycmVudChmb3JjZVUpID09PSBjaCkge1xuICAgIHRoaXMuYWR2YW5jZShmb3JjZVUpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG5SZWdFeHBWYWxpZGF0aW9uU3RhdGUucHJvdG90eXBlLmVhdENoYXJzID0gZnVuY3Rpb24gZWF0Q2hhcnMgKGNocywgZm9yY2VVKSB7XG4gICAgaWYgKCBmb3JjZVUgPT09IHZvaWQgMCApIGZvcmNlVSA9IGZhbHNlO1xuXG4gIHZhciBwb3MgPSB0aGlzLnBvcztcbiAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBjaHM7IGkgPCBsaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIGNoID0gbGlzdFtpXTtcblxuICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLmF0KHBvcywgZm9yY2VVKTtcbiAgICBpZiAoY3VycmVudCA9PT0gLTEgfHwgY3VycmVudCAhPT0gY2gpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICBwb3MgPSB0aGlzLm5leHRJbmRleChwb3MsIGZvcmNlVSk7XG4gIH1cbiAgdGhpcy5wb3MgPSBwb3M7XG4gIHJldHVybiB0cnVlXG59O1xuXG4vKipcbiAqIFZhbGlkYXRlIHRoZSBmbGFncyBwYXJ0IG9mIGEgZ2l2ZW4gUmVnRXhwTGl0ZXJhbC5cbiAqXG4gKiBAcGFyYW0ge1JlZ0V4cFZhbGlkYXRpb25TdGF0ZX0gc3RhdGUgVGhlIHN0YXRlIHRvIHZhbGlkYXRlIFJlZ0V4cC5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5wcCQxLnZhbGlkYXRlUmVnRXhwRmxhZ3MgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgdmFsaWRGbGFncyA9IHN0YXRlLnZhbGlkRmxhZ3M7XG4gIHZhciBmbGFncyA9IHN0YXRlLmZsYWdzO1xuXG4gIHZhciB1ID0gZmFsc2U7XG4gIHZhciB2ID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmbGFncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBmbGFnID0gZmxhZ3MuY2hhckF0KGkpO1xuICAgIGlmICh2YWxpZEZsYWdzLmluZGV4T2YoZmxhZykgPT09IC0xKSB7XG4gICAgICB0aGlzLnJhaXNlKHN0YXRlLnN0YXJ0LCBcIkludmFsaWQgcmVndWxhciBleHByZXNzaW9uIGZsYWdcIik7XG4gICAgfVxuICAgIGlmIChmbGFncy5pbmRleE9mKGZsYWcsIGkgKyAxKSA+IC0xKSB7XG4gICAgICB0aGlzLnJhaXNlKHN0YXRlLnN0YXJ0LCBcIkR1cGxpY2F0ZSByZWd1bGFyIGV4cHJlc3Npb24gZmxhZ1wiKTtcbiAgICB9XG4gICAgaWYgKGZsYWcgPT09IFwidVwiKSB7IHUgPSB0cnVlOyB9XG4gICAgaWYgKGZsYWcgPT09IFwidlwiKSB7IHYgPSB0cnVlOyB9XG4gIH1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNSAmJiB1ICYmIHYpIHtcbiAgICB0aGlzLnJhaXNlKHN0YXRlLnN0YXJ0LCBcIkludmFsaWQgcmVndWxhciBleHByZXNzaW9uIGZsYWdcIik7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGhhc1Byb3Aob2JqKSB7XG4gIGZvciAodmFyIF8gaW4gb2JqKSB7IHJldHVybiB0cnVlIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogVmFsaWRhdGUgdGhlIHBhdHRlcm4gcGFydCBvZiBhIGdpdmVuIFJlZ0V4cExpdGVyYWwuXG4gKlxuICogQHBhcmFtIHtSZWdFeHBWYWxpZGF0aW9uU3RhdGV9IHN0YXRlIFRoZSBzdGF0ZSB0byB2YWxpZGF0ZSBSZWdFeHAuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xucHAkMS52YWxpZGF0ZVJlZ0V4cFBhdHRlcm4gPSBmdW5jdGlvbihzdGF0ZSkge1xuICB0aGlzLnJlZ2V4cF9wYXR0ZXJuKHN0YXRlKTtcblxuICAvLyBUaGUgZ29hbCBzeW1ib2wgZm9yIHRoZSBwYXJzZSBpcyB8UGF0dGVyblt+VSwgfk5dfC4gSWYgdGhlIHJlc3VsdCBvZlxuICAvLyBwYXJzaW5nIGNvbnRhaW5zIGEgfEdyb3VwTmFtZXwsIHJlcGFyc2Ugd2l0aCB0aGUgZ29hbCBzeW1ib2xcbiAgLy8gfFBhdHRlcm5bflUsICtOXXwgYW5kIHVzZSB0aGlzIHJlc3VsdCBpbnN0ZWFkLiBUaHJvdyBhICpTeW50YXhFcnJvcipcbiAgLy8gZXhjZXB0aW9uIGlmIF9QXyBkaWQgbm90IGNvbmZvcm0gdG8gdGhlIGdyYW1tYXIsIGlmIGFueSBlbGVtZW50cyBvZiBfUF9cbiAgLy8gd2VyZSBub3QgbWF0Y2hlZCBieSB0aGUgcGFyc2UsIG9yIGlmIGFueSBFYXJseSBFcnJvciBjb25kaXRpb25zIGV4aXN0LlxuICBpZiAoIXN0YXRlLnN3aXRjaE4gJiYgdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkgJiYgaGFzUHJvcChzdGF0ZS5ncm91cE5hbWVzKSkge1xuICAgIHN0YXRlLnN3aXRjaE4gPSB0cnVlO1xuICAgIHRoaXMucmVnZXhwX3BhdHRlcm4oc3RhdGUpO1xuICB9XG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1QYXR0ZXJuXG5wcCQxLnJlZ2V4cF9wYXR0ZXJuID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgc3RhdGUucG9zID0gMDtcbiAgc3RhdGUubGFzdEludFZhbHVlID0gMDtcbiAgc3RhdGUubGFzdFN0cmluZ1ZhbHVlID0gXCJcIjtcbiAgc3RhdGUubGFzdEFzc2VydGlvbklzUXVhbnRpZmlhYmxlID0gZmFsc2U7XG4gIHN0YXRlLm51bUNhcHR1cmluZ1BhcmVucyA9IDA7XG4gIHN0YXRlLm1heEJhY2tSZWZlcmVuY2UgPSAwO1xuICBzdGF0ZS5ncm91cE5hbWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgc3RhdGUuYmFja1JlZmVyZW5jZU5hbWVzLmxlbmd0aCA9IDA7XG4gIHN0YXRlLmJyYW5jaElEID0gbnVsbDtcblxuICB0aGlzLnJlZ2V4cF9kaXNqdW5jdGlvbihzdGF0ZSk7XG5cbiAgaWYgKHN0YXRlLnBvcyAhPT0gc3RhdGUuc291cmNlLmxlbmd0aCkge1xuICAgIC8vIE1ha2UgdGhlIHNhbWUgbWVzc2FnZXMgYXMgVjguXG4gICAgaWYgKHN0YXRlLmVhdCgweDI5IC8qICkgKi8pKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIlVubWF0Y2hlZCAnKSdcIik7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5lYXQoMHg1RCAvKiBdICovKSB8fCBzdGF0ZS5lYXQoMHg3RCAvKiB9ICovKSkge1xuICAgICAgc3RhdGUucmFpc2UoXCJMb25lIHF1YW50aWZpZXIgYnJhY2tldHNcIik7XG4gICAgfVxuICB9XG4gIGlmIChzdGF0ZS5tYXhCYWNrUmVmZXJlbmNlID4gc3RhdGUubnVtQ2FwdHVyaW5nUGFyZW5zKSB7XG4gICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGVzY2FwZVwiKTtcbiAgfVxuICBmb3IgKHZhciBpID0gMCwgbGlzdCA9IHN0YXRlLmJhY2tSZWZlcmVuY2VOYW1lczsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgbmFtZSA9IGxpc3RbaV07XG5cbiAgICBpZiAoIXN0YXRlLmdyb3VwTmFtZXNbbmFtZV0pIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBuYW1lZCBjYXB0dXJlIHJlZmVyZW5jZWRcIik7XG4gICAgfVxuICB9XG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1EaXNqdW5jdGlvblxucHAkMS5yZWdleHBfZGlzanVuY3Rpb24gPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgdHJhY2tEaXNqdW5jdGlvbiA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxNjtcbiAgaWYgKHRyYWNrRGlzanVuY3Rpb24pIHsgc3RhdGUuYnJhbmNoSUQgPSBuZXcgQnJhbmNoSUQoc3RhdGUuYnJhbmNoSUQsIG51bGwpOyB9XG4gIHRoaXMucmVnZXhwX2FsdGVybmF0aXZlKHN0YXRlKTtcbiAgd2hpbGUgKHN0YXRlLmVhdCgweDdDIC8qIHwgKi8pKSB7XG4gICAgaWYgKHRyYWNrRGlzanVuY3Rpb24pIHsgc3RhdGUuYnJhbmNoSUQgPSBzdGF0ZS5icmFuY2hJRC5zaWJsaW5nKCk7IH1cbiAgICB0aGlzLnJlZ2V4cF9hbHRlcm5hdGl2ZShzdGF0ZSk7XG4gIH1cbiAgaWYgKHRyYWNrRGlzanVuY3Rpb24pIHsgc3RhdGUuYnJhbmNoSUQgPSBzdGF0ZS5icmFuY2hJRC5wYXJlbnQ7IH1cblxuICAvLyBNYWtlIHRoZSBzYW1lIG1lc3NhZ2UgYXMgVjguXG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRRdWFudGlmaWVyKHN0YXRlLCB0cnVlKSkge1xuICAgIHN0YXRlLnJhaXNlKFwiTm90aGluZyB0byByZXBlYXRcIik7XG4gIH1cbiAgaWYgKHN0YXRlLmVhdCgweDdCIC8qIHsgKi8pKSB7XG4gICAgc3RhdGUucmFpc2UoXCJMb25lIHF1YW50aWZpZXIgYnJhY2tldHNcIik7XG4gIH1cbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUFsdGVybmF0aXZlXG5wcCQxLnJlZ2V4cF9hbHRlcm5hdGl2ZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHdoaWxlIChzdGF0ZS5wb3MgPCBzdGF0ZS5zb3VyY2UubGVuZ3RoICYmIHRoaXMucmVnZXhwX2VhdFRlcm0oc3RhdGUpKSB7fVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLVRlcm1cbnBwJDEucmVnZXhwX2VhdFRlcm0gPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAodGhpcy5yZWdleHBfZWF0QXNzZXJ0aW9uKHN0YXRlKSkge1xuICAgIC8vIEhhbmRsZSBgUXVhbnRpZmlhYmxlQXNzZXJ0aW9uIFF1YW50aWZpZXJgIGFsdGVybmF0aXZlLlxuICAgIC8vIGBzdGF0ZS5sYXN0QXNzZXJ0aW9uSXNRdWFudGlmaWFibGVgIGlzIHRydWUgaWYgdGhlIGxhc3QgZWF0ZW4gQXNzZXJ0aW9uXG4gICAgLy8gaXMgYSBRdWFudGlmaWFibGVBc3NlcnRpb24uXG4gICAgaWYgKHN0YXRlLmxhc3RBc3NlcnRpb25Jc1F1YW50aWZpYWJsZSAmJiB0aGlzLnJlZ2V4cF9lYXRRdWFudGlmaWVyKHN0YXRlKSkge1xuICAgICAgLy8gTWFrZSB0aGUgc2FtZSBtZXNzYWdlIGFzIFY4LlxuICAgICAgaWYgKHN0YXRlLnN3aXRjaFUpIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHF1YW50aWZpZXJcIik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBpZiAoc3RhdGUuc3dpdGNoVSA/IHRoaXMucmVnZXhwX2VhdEF0b20oc3RhdGUpIDogdGhpcy5yZWdleHBfZWF0RXh0ZW5kZWRBdG9tKHN0YXRlKSkge1xuICAgIHRoaXMucmVnZXhwX2VhdFF1YW50aWZpZXIoc3RhdGUpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1Bc3NlcnRpb25cbnBwJDEucmVnZXhwX2VhdEFzc2VydGlvbiA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgc3RhdGUubGFzdEFzc2VydGlvbklzUXVhbnRpZmlhYmxlID0gZmFsc2U7XG5cbiAgLy8gXiwgJFxuICBpZiAoc3RhdGUuZWF0KDB4NUUgLyogXiAqLykgfHwgc3RhdGUuZWF0KDB4MjQgLyogJCAqLykpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgLy8gXFxiIFxcQlxuICBpZiAoc3RhdGUuZWF0KDB4NUMgLyogXFwgKi8pKSB7XG4gICAgaWYgKHN0YXRlLmVhdCgweDQyIC8qIEIgKi8pIHx8IHN0YXRlLmVhdCgweDYyIC8qIGIgKi8pKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuXG4gIC8vIExvb2thaGVhZCAvIExvb2tiZWhpbmRcbiAgaWYgKHN0YXRlLmVhdCgweDI4IC8qICggKi8pICYmIHN0YXRlLmVhdCgweDNGIC8qID8gKi8pKSB7XG4gICAgdmFyIGxvb2tiZWhpbmQgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkpIHtcbiAgICAgIGxvb2tiZWhpbmQgPSBzdGF0ZS5lYXQoMHgzQyAvKiA8ICovKTtcbiAgICB9XG4gICAgaWYgKHN0YXRlLmVhdCgweDNEIC8qID0gKi8pIHx8IHN0YXRlLmVhdCgweDIxIC8qICEgKi8pKSB7XG4gICAgICB0aGlzLnJlZ2V4cF9kaXNqdW5jdGlvbihzdGF0ZSk7XG4gICAgICBpZiAoIXN0YXRlLmVhdCgweDI5IC8qICkgKi8pKSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiVW50ZXJtaW5hdGVkIGdyb3VwXCIpO1xuICAgICAgfVxuICAgICAgc3RhdGUubGFzdEFzc2VydGlvbklzUXVhbnRpZmlhYmxlID0gIWxvb2tiZWhpbmQ7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLVF1YW50aWZpZXJcbnBwJDEucmVnZXhwX2VhdFF1YW50aWZpZXIgPSBmdW5jdGlvbihzdGF0ZSwgbm9FcnJvcikge1xuICBpZiAoIG5vRXJyb3IgPT09IHZvaWQgMCApIG5vRXJyb3IgPSBmYWxzZTtcblxuICBpZiAodGhpcy5yZWdleHBfZWF0UXVhbnRpZmllclByZWZpeChzdGF0ZSwgbm9FcnJvcikpIHtcbiAgICBzdGF0ZS5lYXQoMHgzRiAvKiA/ICovKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtUXVhbnRpZmllclByZWZpeFxucHAkMS5yZWdleHBfZWF0UXVhbnRpZmllclByZWZpeCA9IGZ1bmN0aW9uKHN0YXRlLCBub0Vycm9yKSB7XG4gIHJldHVybiAoXG4gICAgc3RhdGUuZWF0KDB4MkEgLyogKiAqLykgfHxcbiAgICBzdGF0ZS5lYXQoMHgyQiAvKiArICovKSB8fFxuICAgIHN0YXRlLmVhdCgweDNGIC8qID8gKi8pIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0QnJhY2VkUXVhbnRpZmllcihzdGF0ZSwgbm9FcnJvcilcbiAgKVxufTtcbnBwJDEucmVnZXhwX2VhdEJyYWNlZFF1YW50aWZpZXIgPSBmdW5jdGlvbihzdGF0ZSwgbm9FcnJvcikge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXQoMHg3QiAvKiB7ICovKSkge1xuICAgIHZhciBtaW4gPSAwLCBtYXggPSAtMTtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0RGVjaW1hbERpZ2l0cyhzdGF0ZSkpIHtcbiAgICAgIG1pbiA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgIGlmIChzdGF0ZS5lYXQoMHgyQyAvKiAsICovKSAmJiB0aGlzLnJlZ2V4cF9lYXREZWNpbWFsRGlnaXRzKHN0YXRlKSkge1xuICAgICAgICBtYXggPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGUuZWF0KDB4N0QgLyogfSAqLykpIHtcbiAgICAgICAgLy8gU3ludGF4RXJyb3IgaW4gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3NlYy10ZXJtXG4gICAgICAgIGlmIChtYXggIT09IC0xICYmIG1heCA8IG1pbiAmJiAhbm9FcnJvcikge1xuICAgICAgICAgIHN0YXRlLnJhaXNlKFwibnVtYmVycyBvdXQgb2Ygb3JkZXIgaW4ge30gcXVhbnRpZmllclwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc3RhdGUuc3dpdGNoVSAmJiAhbm9FcnJvcikge1xuICAgICAgc3RhdGUucmFpc2UoXCJJbmNvbXBsZXRlIHF1YW50aWZpZXJcIik7XG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQXRvbVxucHAkMS5yZWdleHBfZWF0QXRvbSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHJldHVybiAoXG4gICAgdGhpcy5yZWdleHBfZWF0UGF0dGVybkNoYXJhY3RlcnMoc3RhdGUpIHx8XG4gICAgc3RhdGUuZWF0KDB4MkUgLyogLiAqLykgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRSZXZlcnNlU29saWR1c0F0b21Fc2NhcGUoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0Q2hhcmFjdGVyQ2xhc3Moc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0VW5jYXB0dXJpbmdHcm91cChzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDYXB0dXJpbmdHcm91cChzdGF0ZSlcbiAgKVxufTtcbnBwJDEucmVnZXhwX2VhdFJldmVyc2VTb2xpZHVzQXRvbUVzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdCgweDVDIC8qIFxcICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRBdG9tRXNjYXBlKHN0YXRlKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xucHAkMS5yZWdleHBfZWF0VW5jYXB0dXJpbmdHcm91cCA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdCgweDI4IC8qICggKi8pKSB7XG4gICAgaWYgKHN0YXRlLmVhdCgweDNGIC8qID8gKi8pKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDE2KSB7XG4gICAgICAgIHZhciBhZGRNb2RpZmllcnMgPSB0aGlzLnJlZ2V4cF9lYXRNb2RpZmllcnMoc3RhdGUpO1xuICAgICAgICB2YXIgaGFzSHlwaGVuID0gc3RhdGUuZWF0KDB4MkQgLyogLSAqLyk7XG4gICAgICAgIGlmIChhZGRNb2RpZmllcnMgfHwgaGFzSHlwaGVuKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhZGRNb2RpZmllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtb2RpZmllciA9IGFkZE1vZGlmaWVycy5jaGFyQXQoaSk7XG4gICAgICAgICAgICBpZiAoYWRkTW9kaWZpZXJzLmluZGV4T2YobW9kaWZpZXIsIGkgKyAxKSA+IC0xKSB7XG4gICAgICAgICAgICAgIHN0YXRlLnJhaXNlKFwiRHVwbGljYXRlIHJlZ3VsYXIgZXhwcmVzc2lvbiBtb2RpZmllcnNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChoYXNIeXBoZW4pIHtcbiAgICAgICAgICAgIHZhciByZW1vdmVNb2RpZmllcnMgPSB0aGlzLnJlZ2V4cF9lYXRNb2RpZmllcnMoc3RhdGUpO1xuICAgICAgICAgICAgaWYgKCFhZGRNb2RpZmllcnMgJiYgIXJlbW92ZU1vZGlmaWVycyAmJiBzdGF0ZS5jdXJyZW50KCkgPT09IDB4M0EgLyogOiAqLykge1xuICAgICAgICAgICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgcmVndWxhciBleHByZXNzaW9uIG1vZGlmaWVyc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGkkMSA9IDA7IGkkMSA8IHJlbW92ZU1vZGlmaWVycy5sZW5ndGg7IGkkMSsrKSB7XG4gICAgICAgICAgICAgIHZhciBtb2RpZmllciQxID0gcmVtb3ZlTW9kaWZpZXJzLmNoYXJBdChpJDEpO1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgcmVtb3ZlTW9kaWZpZXJzLmluZGV4T2YobW9kaWZpZXIkMSwgaSQxICsgMSkgPiAtMSB8fFxuICAgICAgICAgICAgICAgIGFkZE1vZGlmaWVycy5pbmRleE9mKG1vZGlmaWVyJDEpID4gLTFcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUucmFpc2UoXCJEdXBsaWNhdGUgcmVndWxhciBleHByZXNzaW9uIG1vZGlmaWVyc1wiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN0YXRlLmVhdCgweDNBIC8qIDogKi8pKSB7XG4gICAgICAgIHRoaXMucmVnZXhwX2Rpc2p1bmN0aW9uKHN0YXRlKTtcbiAgICAgICAgaWYgKHN0YXRlLmVhdCgweDI5IC8qICkgKi8pKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5yYWlzZShcIlVudGVybWluYXRlZCBncm91cFwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xucHAkMS5yZWdleHBfZWF0Q2FwdHVyaW5nR3JvdXAgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoc3RhdGUuZWF0KDB4MjggLyogKCAqLykpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDkpIHtcbiAgICAgIHRoaXMucmVnZXhwX2dyb3VwU3BlY2lmaWVyKHN0YXRlKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmN1cnJlbnQoKSA9PT0gMHgzRiAvKiA/ICovKSB7XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgZ3JvdXBcIik7XG4gICAgfVxuICAgIHRoaXMucmVnZXhwX2Rpc2p1bmN0aW9uKHN0YXRlKTtcbiAgICBpZiAoc3RhdGUuZWF0KDB4MjkgLyogKSAqLykpIHtcbiAgICAgIHN0YXRlLm51bUNhcHR1cmluZ1BhcmVucyArPSAxO1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucmFpc2UoXCJVbnRlcm1pbmF0ZWQgZ3JvdXBcIik7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuLy8gUmVndWxhckV4cHJlc3Npb25Nb2RpZmllcnMgOjpcbi8vICAgW2VtcHR5XVxuLy8gICBSZWd1bGFyRXhwcmVzc2lvbk1vZGlmaWVycyBSZWd1bGFyRXhwcmVzc2lvbk1vZGlmaWVyXG5wcCQxLnJlZ2V4cF9lYXRNb2RpZmllcnMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgbW9kaWZpZXJzID0gXCJcIjtcbiAgdmFyIGNoID0gMDtcbiAgd2hpbGUgKChjaCA9IHN0YXRlLmN1cnJlbnQoKSkgIT09IC0xICYmIGlzUmVndWxhckV4cHJlc3Npb25Nb2RpZmllcihjaCkpIHtcbiAgICBtb2RpZmllcnMgKz0gY29kZVBvaW50VG9TdHJpbmcoY2gpO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgfVxuICByZXR1cm4gbW9kaWZpZXJzXG59O1xuLy8gUmVndWxhckV4cHJlc3Npb25Nb2RpZmllciA6OiBvbmUgb2Zcbi8vICAgYGlgIGBtYCBgc2BcbmZ1bmN0aW9uIGlzUmVndWxhckV4cHJlc3Npb25Nb2RpZmllcihjaCkge1xuICByZXR1cm4gY2ggPT09IDB4NjkgLyogaSAqLyB8fCBjaCA9PT0gMHg2ZCAvKiBtICovIHx8IGNoID09PSAweDczIC8qIHMgKi9cbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUV4dGVuZGVkQXRvbVxucHAkMS5yZWdleHBfZWF0RXh0ZW5kZWRBdG9tID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgcmV0dXJuIChcbiAgICBzdGF0ZS5lYXQoMHgyRSAvKiAuICovKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdFJldmVyc2VTb2xpZHVzQXRvbUVzY2FwZShzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJDbGFzcyhzdGF0ZSkgfHxcbiAgICB0aGlzLnJlZ2V4cF9lYXRVbmNhcHR1cmluZ0dyb3VwKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENhcHR1cmluZ0dyb3VwKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdEludmFsaWRCcmFjZWRRdWFudGlmaWVyKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdEV4dGVuZGVkUGF0dGVybkNoYXJhY3RlcihzdGF0ZSlcbiAgKVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUludmFsaWRCcmFjZWRRdWFudGlmaWVyXG5wcCQxLnJlZ2V4cF9lYXRJbnZhbGlkQnJhY2VkUXVhbnRpZmllciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRCcmFjZWRRdWFudGlmaWVyKHN0YXRlLCB0cnVlKSkge1xuICAgIHN0YXRlLnJhaXNlKFwiTm90aGluZyB0byByZXBlYXRcIik7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1TeW50YXhDaGFyYWN0ZXJcbnBwJDEucmVnZXhwX2VhdFN5bnRheENoYXJhY3RlciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGlzU3ludGF4Q2hhcmFjdGVyKGNoKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcbmZ1bmN0aW9uIGlzU3ludGF4Q2hhcmFjdGVyKGNoKSB7XG4gIHJldHVybiAoXG4gICAgY2ggPT09IDB4MjQgLyogJCAqLyB8fFxuICAgIGNoID49IDB4MjggLyogKCAqLyAmJiBjaCA8PSAweDJCIC8qICsgKi8gfHxcbiAgICBjaCA9PT0gMHgyRSAvKiAuICovIHx8XG4gICAgY2ggPT09IDB4M0YgLyogPyAqLyB8fFxuICAgIGNoID49IDB4NUIgLyogWyAqLyAmJiBjaCA8PSAweDVFIC8qIF4gKi8gfHxcbiAgICBjaCA+PSAweDdCIC8qIHsgKi8gJiYgY2ggPD0gMHg3RCAvKiB9ICovXG4gIClcbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtUGF0dGVybkNoYXJhY3RlclxuLy8gQnV0IGVhdCBlYWdlci5cbnBwJDEucmVnZXhwX2VhdFBhdHRlcm5DaGFyYWN0ZXJzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICB2YXIgY2ggPSAwO1xuICB3aGlsZSAoKGNoID0gc3RhdGUuY3VycmVudCgpKSAhPT0gLTEgJiYgIWlzU3ludGF4Q2hhcmFjdGVyKGNoKSkge1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgfVxuICByZXR1cm4gc3RhdGUucG9zICE9PSBzdGFydFxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUV4dGVuZGVkUGF0dGVybkNoYXJhY3RlclxucHAkMS5yZWdleHBfZWF0RXh0ZW5kZWRQYXR0ZXJuQ2hhcmFjdGVyID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoXG4gICAgY2ggIT09IC0xICYmXG4gICAgY2ggIT09IDB4MjQgLyogJCAqLyAmJlxuICAgICEoY2ggPj0gMHgyOCAvKiAoICovICYmIGNoIDw9IDB4MkIgLyogKyAqLykgJiZcbiAgICBjaCAhPT0gMHgyRSAvKiAuICovICYmXG4gICAgY2ggIT09IDB4M0YgLyogPyAqLyAmJlxuICAgIGNoICE9PSAweDVCIC8qIFsgKi8gJiZcbiAgICBjaCAhPT0gMHg1RSAvKiBeICovICYmXG4gICAgY2ggIT09IDB4N0MgLyogfCAqL1xuICApIHtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIEdyb3VwU3BlY2lmaWVyIDo6XG4vLyAgIFtlbXB0eV1cbi8vICAgYD9gIEdyb3VwTmFtZVxucHAkMS5yZWdleHBfZ3JvdXBTcGVjaWZpZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoc3RhdGUuZWF0KDB4M0YgLyogPyAqLykpIHtcbiAgICBpZiAoIXRoaXMucmVnZXhwX2VhdEdyb3VwTmFtZShzdGF0ZSkpIHsgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGdyb3VwXCIpOyB9XG4gICAgdmFyIHRyYWNrRGlzanVuY3Rpb24gPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTY7XG4gICAgdmFyIGtub3duID0gc3RhdGUuZ3JvdXBOYW1lc1tzdGF0ZS5sYXN0U3RyaW5nVmFsdWVdO1xuICAgIGlmIChrbm93bikge1xuICAgICAgaWYgKHRyYWNrRGlzanVuY3Rpb24pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxpc3QgPSBrbm93bjsgaSA8IGxpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICB2YXIgYWx0SUQgPSBsaXN0W2ldO1xuXG4gICAgICAgICAgaWYgKCFhbHRJRC5zZXBhcmF0ZWRGcm9tKHN0YXRlLmJyYW5jaElEKSlcbiAgICAgICAgICAgIHsgc3RhdGUucmFpc2UoXCJEdXBsaWNhdGUgY2FwdHVyZSBncm91cCBuYW1lXCIpOyB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiRHVwbGljYXRlIGNhcHR1cmUgZ3JvdXAgbmFtZVwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRyYWNrRGlzanVuY3Rpb24pIHtcbiAgICAgIChrbm93biB8fCAoc3RhdGUuZ3JvdXBOYW1lc1tzdGF0ZS5sYXN0U3RyaW5nVmFsdWVdID0gW10pKS5wdXNoKHN0YXRlLmJyYW5jaElEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdGUuZ3JvdXBOYW1lc1tzdGF0ZS5sYXN0U3RyaW5nVmFsdWVdID0gdHJ1ZTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIEdyb3VwTmFtZSA6OlxuLy8gICBgPGAgUmVnRXhwSWRlbnRpZmllck5hbWUgYD5gXG4vLyBOb3RlOiB0aGlzIHVwZGF0ZXMgYHN0YXRlLmxhc3RTdHJpbmdWYWx1ZWAgcHJvcGVydHkgd2l0aCB0aGUgZWF0ZW4gbmFtZS5cbnBwJDEucmVnZXhwX2VhdEdyb3VwTmFtZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSA9IFwiXCI7XG4gIGlmIChzdGF0ZS5lYXQoMHgzQyAvKiA8ICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRSZWdFeHBJZGVudGlmaWVyTmFtZShzdGF0ZSkgJiYgc3RhdGUuZWF0KDB4M0UgLyogPiAqLykpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBjYXB0dXJlIGdyb3VwIG5hbWVcIik7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBSZWdFeHBJZGVudGlmaWVyTmFtZSA6OlxuLy8gICBSZWdFeHBJZGVudGlmaWVyU3RhcnRcbi8vICAgUmVnRXhwSWRlbnRpZmllck5hbWUgUmVnRXhwSWRlbnRpZmllclBhcnRcbi8vIE5vdGU6IHRoaXMgdXBkYXRlcyBgc3RhdGUubGFzdFN0cmluZ1ZhbHVlYCBwcm9wZXJ0eSB3aXRoIHRoZSBlYXRlbiBuYW1lLlxucHAkMS5yZWdleHBfZWF0UmVnRXhwSWRlbnRpZmllck5hbWUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgPSBcIlwiO1xuICBpZiAodGhpcy5yZWdleHBfZWF0UmVnRXhwSWRlbnRpZmllclN0YXJ0KHN0YXRlKSkge1xuICAgIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSArPSBjb2RlUG9pbnRUb1N0cmluZyhzdGF0ZS5sYXN0SW50VmFsdWUpO1xuICAgIHdoaWxlICh0aGlzLnJlZ2V4cF9lYXRSZWdFeHBJZGVudGlmaWVyUGFydChzdGF0ZSkpIHtcbiAgICAgIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSArPSBjb2RlUG9pbnRUb1N0cmluZyhzdGF0ZS5sYXN0SW50VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gUmVnRXhwSWRlbnRpZmllclN0YXJ0IDo6XG4vLyAgIFVuaWNvZGVJRFN0YXJ0XG4vLyAgIGAkYFxuLy8gICBgX2Bcbi8vICAgYFxcYCBSZWdFeHBVbmljb2RlRXNjYXBlU2VxdWVuY2VbK1VdXG5wcCQxLnJlZ2V4cF9lYXRSZWdFeHBJZGVudGlmaWVyU3RhcnQgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHZhciBmb3JjZVUgPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gMTE7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoZm9yY2VVKTtcbiAgc3RhdGUuYWR2YW5jZShmb3JjZVUpO1xuXG4gIGlmIChjaCA9PT0gMHg1QyAvKiBcXCAqLyAmJiB0aGlzLnJlZ2V4cF9lYXRSZWdFeHBVbmljb2RlRXNjYXBlU2VxdWVuY2Uoc3RhdGUsIGZvcmNlVSkpIHtcbiAgICBjaCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgfVxuICBpZiAoaXNSZWdFeHBJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2g7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICByZXR1cm4gZmFsc2Vcbn07XG5mdW5jdGlvbiBpc1JlZ0V4cElkZW50aWZpZXJTdGFydChjaCkge1xuICByZXR1cm4gaXNJZGVudGlmaWVyU3RhcnQoY2gsIHRydWUpIHx8IGNoID09PSAweDI0IC8qICQgKi8gfHwgY2ggPT09IDB4NUYgLyogXyAqL1xufVxuXG4vLyBSZWdFeHBJZGVudGlmaWVyUGFydCA6OlxuLy8gICBVbmljb2RlSURDb250aW51ZVxuLy8gICBgJGBcbi8vICAgYF9gXG4vLyAgIGBcXGAgUmVnRXhwVW5pY29kZUVzY2FwZVNlcXVlbmNlWytVXVxuLy8gICA8WldOSj5cbi8vICAgPFpXSj5cbnBwJDEucmVnZXhwX2VhdFJlZ0V4cElkZW50aWZpZXJQYXJ0ID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICB2YXIgZm9yY2VVID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDExO1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KGZvcmNlVSk7XG4gIHN0YXRlLmFkdmFuY2UoZm9yY2VVKTtcblxuICBpZiAoY2ggPT09IDB4NUMgLyogXFwgKi8gJiYgdGhpcy5yZWdleHBfZWF0UmVnRXhwVW5pY29kZUVzY2FwZVNlcXVlbmNlKHN0YXRlLCBmb3JjZVUpKSB7XG4gICAgY2ggPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gIH1cbiAgaWYgKGlzUmVnRXhwSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2g7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICByZXR1cm4gZmFsc2Vcbn07XG5mdW5jdGlvbiBpc1JlZ0V4cElkZW50aWZpZXJQYXJ0KGNoKSB7XG4gIHJldHVybiBpc0lkZW50aWZpZXJDaGFyKGNoLCB0cnVlKSB8fCBjaCA9PT0gMHgyNCAvKiAkICovIHx8IGNoID09PSAweDVGIC8qIF8gKi8gfHwgY2ggPT09IDB4MjAwQyAvKiA8WldOSj4gKi8gfHwgY2ggPT09IDB4MjAwRCAvKiA8WldKPiAqL1xufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItQXRvbUVzY2FwZVxucHAkMS5yZWdleHBfZWF0QXRvbUVzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmIChcbiAgICB0aGlzLnJlZ2V4cF9lYXRCYWNrUmVmZXJlbmNlKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckNsYXNzRXNjYXBlKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckVzY2FwZShzdGF0ZSkgfHxcbiAgICAoc3RhdGUuc3dpdGNoTiAmJiB0aGlzLnJlZ2V4cF9lYXRLR3JvdXBOYW1lKHN0YXRlKSlcbiAgKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpZiAoc3RhdGUuc3dpdGNoVSkge1xuICAgIC8vIE1ha2UgdGhlIHNhbWUgbWVzc2FnZSBhcyBWOC5cbiAgICBpZiAoc3RhdGUuY3VycmVudCgpID09PSAweDYzIC8qIGMgKi8pIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCB1bmljb2RlIGVzY2FwZVwiKTtcbiAgICB9XG4gICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGVzY2FwZVwiKTtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5wcCQxLnJlZ2V4cF9lYXRCYWNrUmVmZXJlbmNlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAodGhpcy5yZWdleHBfZWF0RGVjaW1hbEVzY2FwZShzdGF0ZSkpIHtcbiAgICB2YXIgbiA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICBpZiAoc3RhdGUuc3dpdGNoVSkge1xuICAgICAgLy8gRm9yIFN5bnRheEVycm9yIGluIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNzZWMtYXRvbWVzY2FwZVxuICAgICAgaWYgKG4gPiBzdGF0ZS5tYXhCYWNrUmVmZXJlbmNlKSB7XG4gICAgICAgIHN0YXRlLm1heEJhY2tSZWZlcmVuY2UgPSBuO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKG4gPD0gc3RhdGUubnVtQ2FwdHVyaW5nUGFyZW5zKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5wcCQxLnJlZ2V4cF9lYXRLR3JvdXBOYW1lID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmVhdCgweDZCIC8qIGsgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdEdyb3VwTmFtZShzdGF0ZSkpIHtcbiAgICAgIHN0YXRlLmJhY2tSZWZlcmVuY2VOYW1lcy5wdXNoKHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSk7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgbmFtZWQgcmVmZXJlbmNlXCIpO1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUNoYXJhY3RlckVzY2FwZVxucHAkMS5yZWdleHBfZWF0Q2hhcmFjdGVyRXNjYXBlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgcmV0dXJuIChcbiAgICB0aGlzLnJlZ2V4cF9lYXRDb250cm9sRXNjYXBlKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENDb250cm9sTGV0dGVyKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdFplcm8oc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0SGV4RXNjYXBlU2VxdWVuY2Uoc3RhdGUpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0UmVnRXhwVW5pY29kZUVzY2FwZVNlcXVlbmNlKHN0YXRlLCBmYWxzZSkgfHxcbiAgICAoIXN0YXRlLnN3aXRjaFUgJiYgdGhpcy5yZWdleHBfZWF0TGVnYWN5T2N0YWxFc2NhcGVTZXF1ZW5jZShzdGF0ZSkpIHx8XG4gICAgdGhpcy5yZWdleHBfZWF0SWRlbnRpdHlFc2NhcGUoc3RhdGUpXG4gIClcbn07XG5wcCQxLnJlZ2V4cF9lYXRDQ29udHJvbExldHRlciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdCgweDYzIC8qIGMgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdENvbnRyb2xMZXR0ZXIoc3RhdGUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5wcCQxLnJlZ2V4cF9lYXRaZXJvID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmN1cnJlbnQoKSA9PT0gMHgzMCAvKiAwICovICYmICFpc0RlY2ltYWxEaWdpdChzdGF0ZS5sb29rYWhlYWQoKSkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAwO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQ29udHJvbEVzY2FwZVxucHAkMS5yZWdleHBfZWF0Q29udHJvbEVzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGNoID09PSAweDc0IC8qIHQgKi8pIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDA5OyAvKiBcXHQgKi9cbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpZiAoY2ggPT09IDB4NkUgLyogbiAqLykge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MEE7IC8qIFxcbiAqL1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChjaCA9PT0gMHg3NiAvKiB2ICovKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgwQjsgLyogXFx2ICovXG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKGNoID09PSAweDY2IC8qIGYgKi8pIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDBDOyAvKiBcXGYgKi9cbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpZiAoY2ggPT09IDB4NzIgLyogciAqLykge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MEQ7IC8qIFxcciAqL1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQ29udHJvbExldHRlclxucHAkMS5yZWdleHBfZWF0Q29udHJvbExldHRlciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGlzQ29udHJvbExldHRlcihjaCkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaCAlIDB4MjA7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuZnVuY3Rpb24gaXNDb250cm9sTGV0dGVyKGNoKSB7XG4gIHJldHVybiAoXG4gICAgKGNoID49IDB4NDEgLyogQSAqLyAmJiBjaCA8PSAweDVBIC8qIFogKi8pIHx8XG4gICAgKGNoID49IDB4NjEgLyogYSAqLyAmJiBjaCA8PSAweDdBIC8qIHogKi8pXG4gIClcbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtUmVnRXhwVW5pY29kZUVzY2FwZVNlcXVlbmNlXG5wcCQxLnJlZ2V4cF9lYXRSZWdFeHBVbmljb2RlRXNjYXBlU2VxdWVuY2UgPSBmdW5jdGlvbihzdGF0ZSwgZm9yY2VVKSB7XG4gIGlmICggZm9yY2VVID09PSB2b2lkIDAgKSBmb3JjZVUgPSBmYWxzZTtcblxuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIHZhciBzd2l0Y2hVID0gZm9yY2VVIHx8IHN0YXRlLnN3aXRjaFU7XG5cbiAgaWYgKHN0YXRlLmVhdCgweDc1IC8qIHUgKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdEZpeGVkSGV4RGlnaXRzKHN0YXRlLCA0KSkge1xuICAgICAgdmFyIGxlYWQgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICBpZiAoc3dpdGNoVSAmJiBsZWFkID49IDB4RDgwMCAmJiBsZWFkIDw9IDB4REJGRikge1xuICAgICAgICB2YXIgbGVhZFN1cnJvZ2F0ZUVuZCA9IHN0YXRlLnBvcztcbiAgICAgICAgaWYgKHN0YXRlLmVhdCgweDVDIC8qIFxcICovKSAmJiBzdGF0ZS5lYXQoMHg3NSAvKiB1ICovKSAmJiB0aGlzLnJlZ2V4cF9lYXRGaXhlZEhleERpZ2l0cyhzdGF0ZSwgNCkpIHtcbiAgICAgICAgICB2YXIgdHJhaWwgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICAgICAgaWYgKHRyYWlsID49IDB4REMwMCAmJiB0cmFpbCA8PSAweERGRkYpIHtcbiAgICAgICAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IChsZWFkIC0gMHhEODAwKSAqIDB4NDAwICsgKHRyYWlsIC0gMHhEQzAwKSArIDB4MTAwMDA7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5wb3MgPSBsZWFkU3Vycm9nYXRlRW5kO1xuICAgICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBsZWFkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKFxuICAgICAgc3dpdGNoVSAmJlxuICAgICAgc3RhdGUuZWF0KDB4N0IgLyogeyAqLykgJiZcbiAgICAgIHRoaXMucmVnZXhwX2VhdEhleERpZ2l0cyhzdGF0ZSkgJiZcbiAgICAgIHN0YXRlLmVhdCgweDdEIC8qIH0gKi8pICYmXG4gICAgICBpc1ZhbGlkVW5pY29kZShzdGF0ZS5sYXN0SW50VmFsdWUpXG4gICAgKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAoc3dpdGNoVSkge1xuICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHVuaWNvZGUgZXNjYXBlXCIpO1xuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufTtcbmZ1bmN0aW9uIGlzVmFsaWRVbmljb2RlKGNoKSB7XG4gIHJldHVybiBjaCA+PSAwICYmIGNoIDw9IDB4MTBGRkZGXG59XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLWFubmV4Qi1JZGVudGl0eUVzY2FwZVxucHAkMS5yZWdleHBfZWF0SWRlbnRpdHlFc2NhcGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBpZiAoc3RhdGUuc3dpdGNoVSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRTeW50YXhDaGFyYWN0ZXIoc3RhdGUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAoc3RhdGUuZWF0KDB4MkYgLyogLyAqLykpIHtcbiAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDB4MkY7IC8qIC8gKi9cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoY2ggIT09IDB4NjMgLyogYyAqLyAmJiAoIXN0YXRlLnN3aXRjaE4gfHwgY2ggIT09IDB4NkIgLyogayAqLykpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaDtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtRGVjaW1hbEVzY2FwZVxucHAkMS5yZWdleHBfZWF0RGVjaW1hbEVzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDA7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGNoID49IDB4MzEgLyogMSAqLyAmJiBjaCA8PSAweDM5IC8qIDkgKi8pIHtcbiAgICBkbyB7XG4gICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAxMCAqIHN0YXRlLmxhc3RJbnRWYWx1ZSArIChjaCAtIDB4MzAgLyogMCAqLyk7XG4gICAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgfSB3aGlsZSAoKGNoID0gc3RhdGUuY3VycmVudCgpKSA+PSAweDMwIC8qIDAgKi8gJiYgY2ggPD0gMHgzOSAvKiA5ICovKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBSZXR1cm4gdmFsdWVzIHVzZWQgYnkgY2hhcmFjdGVyIHNldCBwYXJzaW5nIG1ldGhvZHMsIG5lZWRlZCB0b1xuLy8gZm9yYmlkIG5lZ2F0aW9uIG9mIHNldHMgdGhhdCBjYW4gbWF0Y2ggc3RyaW5ncy5cbnZhciBDaGFyU2V0Tm9uZSA9IDA7IC8vIE5vdGhpbmcgcGFyc2VkXG52YXIgQ2hhclNldE9rID0gMTsgLy8gQ29uc3RydWN0IHBhcnNlZCwgY2Fubm90IGNvbnRhaW4gc3RyaW5nc1xudmFyIENoYXJTZXRTdHJpbmcgPSAyOyAvLyBDb25zdHJ1Y3QgcGFyc2VkLCBjYW4gY29udGFpbiBzdHJpbmdzXG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUNoYXJhY3RlckNsYXNzRXNjYXBlXG5wcCQxLnJlZ2V4cF9lYXRDaGFyYWN0ZXJDbGFzc0VzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcblxuICBpZiAoaXNDaGFyYWN0ZXJDbGFzc0VzY2FwZShjaCkpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAtMTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIENoYXJTZXRPa1xuICB9XG5cbiAgdmFyIG5lZ2F0ZSA9IGZhbHNlO1xuICBpZiAoXG4gICAgc3RhdGUuc3dpdGNoVSAmJlxuICAgIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5ICYmXG4gICAgKChuZWdhdGUgPSBjaCA9PT0gMHg1MCAvKiBQICovKSB8fCBjaCA9PT0gMHg3MCAvKiBwICovKVxuICApIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAtMTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBpZiAoXG4gICAgICBzdGF0ZS5lYXQoMHg3QiAvKiB7ICovKSAmJlxuICAgICAgKHJlc3VsdCA9IHRoaXMucmVnZXhwX2VhdFVuaWNvZGVQcm9wZXJ0eVZhbHVlRXhwcmVzc2lvbihzdGF0ZSkpICYmXG4gICAgICBzdGF0ZS5lYXQoMHg3RCAvKiB9ICovKVxuICAgICkge1xuICAgICAgaWYgKG5lZ2F0ZSAmJiByZXN1bHQgPT09IENoYXJTZXRTdHJpbmcpIHsgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHByb3BlcnR5IG5hbWVcIik7IH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG4gICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIHByb3BlcnR5IG5hbWVcIik7XG4gIH1cblxuICByZXR1cm4gQ2hhclNldE5vbmVcbn07XG5cbmZ1bmN0aW9uIGlzQ2hhcmFjdGVyQ2xhc3NFc2NhcGUoY2gpIHtcbiAgcmV0dXJuIChcbiAgICBjaCA9PT0gMHg2NCAvKiBkICovIHx8XG4gICAgY2ggPT09IDB4NDQgLyogRCAqLyB8fFxuICAgIGNoID09PSAweDczIC8qIHMgKi8gfHxcbiAgICBjaCA9PT0gMHg1MyAvKiBTICovIHx8XG4gICAgY2ggPT09IDB4NzcgLyogdyAqLyB8fFxuICAgIGNoID09PSAweDU3IC8qIFcgKi9cbiAgKVxufVxuXG4vLyBVbmljb2RlUHJvcGVydHlWYWx1ZUV4cHJlc3Npb24gOjpcbi8vICAgVW5pY29kZVByb3BlcnR5TmFtZSBgPWAgVW5pY29kZVByb3BlcnR5VmFsdWVcbi8vICAgTG9uZVVuaWNvZGVQcm9wZXJ0eU5hbWVPclZhbHVlXG5wcCQxLnJlZ2V4cF9lYXRVbmljb2RlUHJvcGVydHlWYWx1ZUV4cHJlc3Npb24gPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG5cbiAgLy8gVW5pY29kZVByb3BlcnR5TmFtZSBgPWAgVW5pY29kZVByb3BlcnR5VmFsdWVcbiAgaWYgKHRoaXMucmVnZXhwX2VhdFVuaWNvZGVQcm9wZXJ0eU5hbWUoc3RhdGUpICYmIHN0YXRlLmVhdCgweDNEIC8qID0gKi8pKSB7XG4gICAgdmFyIG5hbWUgPSBzdGF0ZS5sYXN0U3RyaW5nVmFsdWU7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdFVuaWNvZGVQcm9wZXJ0eVZhbHVlKHN0YXRlKSkge1xuICAgICAgdmFyIHZhbHVlID0gc3RhdGUubGFzdFN0cmluZ1ZhbHVlO1xuICAgICAgdGhpcy5yZWdleHBfdmFsaWRhdGVVbmljb2RlUHJvcGVydHlOYW1lQW5kVmFsdWUoc3RhdGUsIG5hbWUsIHZhbHVlKTtcbiAgICAgIHJldHVybiBDaGFyU2V0T2tcbiAgICB9XG4gIH1cbiAgc3RhdGUucG9zID0gc3RhcnQ7XG5cbiAgLy8gTG9uZVVuaWNvZGVQcm9wZXJ0eU5hbWVPclZhbHVlXG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRMb25lVW5pY29kZVByb3BlcnR5TmFtZU9yVmFsdWUoc3RhdGUpKSB7XG4gICAgdmFyIG5hbWVPclZhbHVlID0gc3RhdGUubGFzdFN0cmluZ1ZhbHVlO1xuICAgIHJldHVybiB0aGlzLnJlZ2V4cF92YWxpZGF0ZVVuaWNvZGVQcm9wZXJ0eU5hbWVPclZhbHVlKHN0YXRlLCBuYW1lT3JWYWx1ZSlcbiAgfVxuICByZXR1cm4gQ2hhclNldE5vbmVcbn07XG5cbnBwJDEucmVnZXhwX3ZhbGlkYXRlVW5pY29kZVByb3BlcnR5TmFtZUFuZFZhbHVlID0gZnVuY3Rpb24oc3RhdGUsIG5hbWUsIHZhbHVlKSB7XG4gIGlmICghaGFzT3duKHN0YXRlLnVuaWNvZGVQcm9wZXJ0aWVzLm5vbkJpbmFyeSwgbmFtZSkpXG4gICAgeyBzdGF0ZS5yYWlzZShcIkludmFsaWQgcHJvcGVydHkgbmFtZVwiKTsgfVxuICBpZiAoIXN0YXRlLnVuaWNvZGVQcm9wZXJ0aWVzLm5vbkJpbmFyeVtuYW1lXS50ZXN0KHZhbHVlKSlcbiAgICB7IHN0YXRlLnJhaXNlKFwiSW52YWxpZCBwcm9wZXJ0eSB2YWx1ZVwiKTsgfVxufTtcblxucHAkMS5yZWdleHBfdmFsaWRhdGVVbmljb2RlUHJvcGVydHlOYW1lT3JWYWx1ZSA9IGZ1bmN0aW9uKHN0YXRlLCBuYW1lT3JWYWx1ZSkge1xuICBpZiAoc3RhdGUudW5pY29kZVByb3BlcnRpZXMuYmluYXJ5LnRlc3QobmFtZU9yVmFsdWUpKSB7IHJldHVybiBDaGFyU2V0T2sgfVxuICBpZiAoc3RhdGUuc3dpdGNoViAmJiBzdGF0ZS51bmljb2RlUHJvcGVydGllcy5iaW5hcnlPZlN0cmluZ3MudGVzdChuYW1lT3JWYWx1ZSkpIHsgcmV0dXJuIENoYXJTZXRTdHJpbmcgfVxuICBzdGF0ZS5yYWlzZShcIkludmFsaWQgcHJvcGVydHkgbmFtZVwiKTtcbn07XG5cbi8vIFVuaWNvZGVQcm9wZXJ0eU5hbWUgOjpcbi8vICAgVW5pY29kZVByb3BlcnR5TmFtZUNoYXJhY3RlcnNcbnBwJDEucmVnZXhwX2VhdFVuaWNvZGVQcm9wZXJ0eU5hbWUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSAwO1xuICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgPSBcIlwiO1xuICB3aGlsZSAoaXNVbmljb2RlUHJvcGVydHlOYW1lQ2hhcmFjdGVyKGNoID0gc3RhdGUuY3VycmVudCgpKSkge1xuICAgIHN0YXRlLmxhc3RTdHJpbmdWYWx1ZSArPSBjb2RlUG9pbnRUb1N0cmluZyhjaCk7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICB9XG4gIHJldHVybiBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgIT09IFwiXCJcbn07XG5cbmZ1bmN0aW9uIGlzVW5pY29kZVByb3BlcnR5TmFtZUNoYXJhY3RlcihjaCkge1xuICByZXR1cm4gaXNDb250cm9sTGV0dGVyKGNoKSB8fCBjaCA9PT0gMHg1RiAvKiBfICovXG59XG5cbi8vIFVuaWNvZGVQcm9wZXJ0eVZhbHVlIDo6XG4vLyAgIFVuaWNvZGVQcm9wZXJ0eVZhbHVlQ2hhcmFjdGVyc1xucHAkMS5yZWdleHBfZWF0VW5pY29kZVByb3BlcnR5VmFsdWUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSAwO1xuICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgPSBcIlwiO1xuICB3aGlsZSAoaXNVbmljb2RlUHJvcGVydHlWYWx1ZUNoYXJhY3RlcihjaCA9IHN0YXRlLmN1cnJlbnQoKSkpIHtcbiAgICBzdGF0ZS5sYXN0U3RyaW5nVmFsdWUgKz0gY29kZVBvaW50VG9TdHJpbmcoY2gpO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgfVxuICByZXR1cm4gc3RhdGUubGFzdFN0cmluZ1ZhbHVlICE9PSBcIlwiXG59O1xuZnVuY3Rpb24gaXNVbmljb2RlUHJvcGVydHlWYWx1ZUNoYXJhY3RlcihjaCkge1xuICByZXR1cm4gaXNVbmljb2RlUHJvcGVydHlOYW1lQ2hhcmFjdGVyKGNoKSB8fCBpc0RlY2ltYWxEaWdpdChjaClcbn1cblxuLy8gTG9uZVVuaWNvZGVQcm9wZXJ0eU5hbWVPclZhbHVlIDo6XG4vLyAgIFVuaWNvZGVQcm9wZXJ0eVZhbHVlQ2hhcmFjdGVyc1xucHAkMS5yZWdleHBfZWF0TG9uZVVuaWNvZGVQcm9wZXJ0eU5hbWVPclZhbHVlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgcmV0dXJuIHRoaXMucmVnZXhwX2VhdFVuaWNvZGVQcm9wZXJ0eVZhbHVlKHN0YXRlKVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQ2hhcmFjdGVyQ2xhc3NcbnBwJDEucmVnZXhwX2VhdENoYXJhY3RlckNsYXNzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmVhdCgweDVCIC8qIFsgKi8pKSB7XG4gICAgdmFyIG5lZ2F0ZSA9IHN0YXRlLmVhdCgweDVFIC8qIF4gKi8pO1xuICAgIHZhciByZXN1bHQgPSB0aGlzLnJlZ2V4cF9jbGFzc0NvbnRlbnRzKHN0YXRlKTtcbiAgICBpZiAoIXN0YXRlLmVhdCgweDVEIC8qIF0gKi8pKVxuICAgICAgeyBzdGF0ZS5yYWlzZShcIlVudGVybWluYXRlZCBjaGFyYWN0ZXIgY2xhc3NcIik7IH1cbiAgICBpZiAobmVnYXRlICYmIHJlc3VsdCA9PT0gQ2hhclNldFN0cmluZylcbiAgICAgIHsgc3RhdGUucmFpc2UoXCJOZWdhdGVkIGNoYXJhY3RlciBjbGFzcyBtYXkgY29udGFpbiBzdHJpbmdzXCIpOyB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzQ29udGVudHNcbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUNsYXNzUmFuZ2VzXG5wcCQxLnJlZ2V4cF9jbGFzc0NvbnRlbnRzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmN1cnJlbnQoKSA9PT0gMHg1RCAvKiBdICovKSB7IHJldHVybiBDaGFyU2V0T2sgfVxuICBpZiAoc3RhdGUuc3dpdGNoVikgeyByZXR1cm4gdGhpcy5yZWdleHBfY2xhc3NTZXRFeHByZXNzaW9uKHN0YXRlKSB9XG4gIHRoaXMucmVnZXhwX25vbkVtcHR5Q2xhc3NSYW5nZXMoc3RhdGUpO1xuICByZXR1cm4gQ2hhclNldE9rXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1Ob25lbXB0eUNsYXNzUmFuZ2VzXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1Ob25lbXB0eUNsYXNzUmFuZ2VzTm9EYXNoXG5wcCQxLnJlZ2V4cF9ub25FbXB0eUNsYXNzUmFuZ2VzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgd2hpbGUgKHRoaXMucmVnZXhwX2VhdENsYXNzQXRvbShzdGF0ZSkpIHtcbiAgICB2YXIgbGVmdCA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICBpZiAoc3RhdGUuZWF0KDB4MkQgLyogLSAqLykgJiYgdGhpcy5yZWdleHBfZWF0Q2xhc3NBdG9tKHN0YXRlKSkge1xuICAgICAgdmFyIHJpZ2h0ID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgaWYgKHN0YXRlLnN3aXRjaFUgJiYgKGxlZnQgPT09IC0xIHx8IHJpZ2h0ID09PSAtMSkpIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGNoYXJhY3RlciBjbGFzc1wiKTtcbiAgICAgIH1cbiAgICAgIGlmIChsZWZ0ICE9PSAtMSAmJiByaWdodCAhPT0gLTEgJiYgbGVmdCA+IHJpZ2h0KSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiUmFuZ2Ugb3V0IG9mIG9yZGVyIGluIGNoYXJhY3RlciBjbGFzc1wiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUNsYXNzQXRvbVxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtQ2xhc3NBdG9tTm9EYXNoXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc0F0b20gPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG5cbiAgaWYgKHN0YXRlLmVhdCgweDVDIC8qIFxcICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9lYXRDbGFzc0VzY2FwZShzdGF0ZSkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChzdGF0ZS5zd2l0Y2hVKSB7XG4gICAgICAvLyBNYWtlIHRoZSBzYW1lIG1lc3NhZ2UgYXMgVjguXG4gICAgICB2YXIgY2gkMSA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgICAgIGlmIChjaCQxID09PSAweDYzIC8qIGMgKi8gfHwgaXNPY3RhbERpZ2l0KGNoJDEpKSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBjbGFzcyBlc2NhcGVcIik7XG4gICAgICB9XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgZXNjYXBlXCIpO1xuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuXG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGNoICE9PSAweDVEIC8qIF0gKi8pIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaDtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUNsYXNzRXNjYXBlXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc0VzY2FwZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcblxuICBpZiAoc3RhdGUuZWF0KDB4NjIgLyogYiAqLykpIHtcbiAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAweDA4OyAvKiA8QlM+ICovXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIGlmIChzdGF0ZS5zd2l0Y2hVICYmIHN0YXRlLmVhdCgweDJEIC8qIC0gKi8pKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgyRDsgLyogLSAqL1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBpZiAoIXN0YXRlLnN3aXRjaFUgJiYgc3RhdGUuZWF0KDB4NjMgLyogYyAqLykpIHtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0Q2xhc3NDb250cm9sTGV0dGVyKHN0YXRlKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cblxuICByZXR1cm4gKFxuICAgIHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckNsYXNzRXNjYXBlKHN0YXRlKSB8fFxuICAgIHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckVzY2FwZShzdGF0ZSlcbiAgKVxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTZXRFeHByZXNzaW9uXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1VuaW9uXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc0ludGVyc2VjdGlvblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTdWJ0cmFjdGlvblxucHAkMS5yZWdleHBfY2xhc3NTZXRFeHByZXNzaW9uID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHJlc3VsdCA9IENoYXJTZXRPaywgc3ViUmVzdWx0O1xuICBpZiAodGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRSYW5nZShzdGF0ZSkpIDsgZWxzZSBpZiAoc3ViUmVzdWx0ID0gdGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRPcGVyYW5kKHN0YXRlKSkge1xuICAgIGlmIChzdWJSZXN1bHQgPT09IENoYXJTZXRTdHJpbmcpIHsgcmVzdWx0ID0gQ2hhclNldFN0cmluZzsgfVxuICAgIC8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzSW50ZXJzZWN0aW9uXG4gICAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICAgIHdoaWxlIChzdGF0ZS5lYXRDaGFycyhbMHgyNiwgMHgyNl0gLyogJiYgKi8pKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHN0YXRlLmN1cnJlbnQoKSAhPT0gMHgyNiAvKiAmICovICYmXG4gICAgICAgIChzdWJSZXN1bHQgPSB0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldE9wZXJhbmQoc3RhdGUpKVxuICAgICAgKSB7XG4gICAgICAgIGlmIChzdWJSZXN1bHQgIT09IENoYXJTZXRTdHJpbmcpIHsgcmVzdWx0ID0gQ2hhclNldE9rOyB9XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgY2hhcmFjdGVyIGluIGNoYXJhY3RlciBjbGFzc1wiKTtcbiAgICB9XG4gICAgaWYgKHN0YXJ0ICE9PSBzdGF0ZS5wb3MpIHsgcmV0dXJuIHJlc3VsdCB9XG4gICAgLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTdWJ0cmFjdGlvblxuICAgIHdoaWxlIChzdGF0ZS5lYXRDaGFycyhbMHgyRCwgMHgyRF0gLyogLS0gKi8pKSB7XG4gICAgICBpZiAodGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRPcGVyYW5kKHN0YXRlKSkgeyBjb250aW51ZSB9XG4gICAgICBzdGF0ZS5yYWlzZShcIkludmFsaWQgY2hhcmFjdGVyIGluIGNoYXJhY3RlciBjbGFzc1wiKTtcbiAgICB9XG4gICAgaWYgKHN0YXJ0ICE9PSBzdGF0ZS5wb3MpIHsgcmV0dXJuIHJlc3VsdCB9XG4gIH0gZWxzZSB7XG4gICAgc3RhdGUucmFpc2UoXCJJbnZhbGlkIGNoYXJhY3RlciBpbiBjaGFyYWN0ZXIgY2xhc3NcIik7XG4gIH1cbiAgLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NVbmlvblxuICBmb3IgKDs7KSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdENsYXNzU2V0UmFuZ2Uoc3RhdGUpKSB7IGNvbnRpbnVlIH1cbiAgICBzdWJSZXN1bHQgPSB0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldE9wZXJhbmQoc3RhdGUpO1xuICAgIGlmICghc3ViUmVzdWx0KSB7IHJldHVybiByZXN1bHQgfVxuICAgIGlmIChzdWJSZXN1bHQgPT09IENoYXJTZXRTdHJpbmcpIHsgcmVzdWx0ID0gQ2hhclNldFN0cmluZzsgfVxuICB9XG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldFJhbmdlXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc1NldFJhbmdlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBpZiAodGhpcy5yZWdleHBfZWF0Q2xhc3NTZXRDaGFyYWN0ZXIoc3RhdGUpKSB7XG4gICAgdmFyIGxlZnQgPSBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgaWYgKHN0YXRlLmVhdCgweDJEIC8qIC0gKi8pICYmIHRoaXMucmVnZXhwX2VhdENsYXNzU2V0Q2hhcmFjdGVyKHN0YXRlKSkge1xuICAgICAgdmFyIHJpZ2h0ID0gc3RhdGUubGFzdEludFZhbHVlO1xuICAgICAgaWYgKGxlZnQgIT09IC0xICYmIHJpZ2h0ICE9PSAtMSAmJiBsZWZ0ID4gcmlnaHQpIHtcbiAgICAgICAgc3RhdGUucmFpc2UoXCJSYW5nZSBvdXQgb2Ygb3JkZXIgaW4gY2hhcmFjdGVyIGNsYXNzXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldE9wZXJhbmRcbnBwJDEucmVnZXhwX2VhdENsYXNzU2V0T3BlcmFuZCA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldENoYXJhY3RlcihzdGF0ZSkpIHsgcmV0dXJuIENoYXJTZXRPayB9XG4gIHJldHVybiB0aGlzLnJlZ2V4cF9lYXRDbGFzc1N0cmluZ0Rpc2p1bmN0aW9uKHN0YXRlKSB8fCB0aGlzLnJlZ2V4cF9lYXROZXN0ZWRDbGFzcyhzdGF0ZSlcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLU5lc3RlZENsYXNzXG5wcCQxLnJlZ2V4cF9lYXROZXN0ZWRDbGFzcyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdCgweDVCIC8qIFsgKi8pKSB7XG4gICAgdmFyIG5lZ2F0ZSA9IHN0YXRlLmVhdCgweDVFIC8qIF4gKi8pO1xuICAgIHZhciByZXN1bHQgPSB0aGlzLnJlZ2V4cF9jbGFzc0NvbnRlbnRzKHN0YXRlKTtcbiAgICBpZiAoc3RhdGUuZWF0KDB4NUQgLyogXSAqLykpIHtcbiAgICAgIGlmIChuZWdhdGUgJiYgcmVzdWx0ID09PSBDaGFyU2V0U3RyaW5nKSB7XG4gICAgICAgIHN0YXRlLnJhaXNlKFwiTmVnYXRlZCBjaGFyYWN0ZXIgY2xhc3MgbWF5IGNvbnRhaW4gc3RyaW5nc1wiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gIH1cbiAgaWYgKHN0YXRlLmVhdCgweDVDIC8qIFxcICovKSkge1xuICAgIHZhciByZXN1bHQkMSA9IHRoaXMucmVnZXhwX2VhdENoYXJhY3RlckNsYXNzRXNjYXBlKHN0YXRlKTtcbiAgICBpZiAocmVzdWx0JDEpIHtcbiAgICAgIHJldHVybiByZXN1bHQkMVxuICAgIH1cbiAgICBzdGF0ZS5wb3MgPSBzdGFydDtcbiAgfVxuICByZXR1cm4gbnVsbFxufTtcblxuLy8gaHR0cHM6Ly90YzM5LmVzL2VjbWEyNjIvI3Byb2QtQ2xhc3NTdHJpbmdEaXNqdW5jdGlvblxucHAkMS5yZWdleHBfZWF0Q2xhc3NTdHJpbmdEaXNqdW5jdGlvbiA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdENoYXJzKFsweDVDLCAweDcxXSAvKiBcXHEgKi8pKSB7XG4gICAgaWYgKHN0YXRlLmVhdCgweDdCIC8qIHsgKi8pKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdGhpcy5yZWdleHBfY2xhc3NTdHJpbmdEaXNqdW5jdGlvbkNvbnRlbnRzKHN0YXRlKTtcbiAgICAgIGlmIChzdGF0ZS5lYXQoMHg3RCAvKiB9ICovKSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE1ha2UgdGhlIHNhbWUgbWVzc2FnZSBhcyBWOC5cbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBlc2NhcGVcIik7XG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBudWxsXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1N0cmluZ0Rpc2p1bmN0aW9uQ29udGVudHNcbnBwJDEucmVnZXhwX2NsYXNzU3RyaW5nRGlzanVuY3Rpb25Db250ZW50cyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciByZXN1bHQgPSB0aGlzLnJlZ2V4cF9jbGFzc1N0cmluZyhzdGF0ZSk7XG4gIHdoaWxlIChzdGF0ZS5lYXQoMHg3QyAvKiB8ICovKSkge1xuICAgIGlmICh0aGlzLnJlZ2V4cF9jbGFzc1N0cmluZyhzdGF0ZSkgPT09IENoYXJTZXRTdHJpbmcpIHsgcmVzdWx0ID0gQ2hhclNldFN0cmluZzsgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU3RyaW5nXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1Ob25FbXB0eUNsYXNzU3RyaW5nXG5wcCQxLnJlZ2V4cF9jbGFzc1N0cmluZyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjb3VudCA9IDA7XG4gIHdoaWxlICh0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldENoYXJhY3RlcihzdGF0ZSkpIHsgY291bnQrKzsgfVxuICByZXR1cm4gY291bnQgPT09IDEgPyBDaGFyU2V0T2sgOiBDaGFyU2V0U3RyaW5nXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldENoYXJhY3RlclxucHAkMS5yZWdleHBfZWF0Q2xhc3NTZXRDaGFyYWN0ZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgc3RhcnQgPSBzdGF0ZS5wb3M7XG4gIGlmIChzdGF0ZS5lYXQoMHg1QyAvKiBcXCAqLykpIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnJlZ2V4cF9lYXRDaGFyYWN0ZXJFc2NhcGUoc3RhdGUpIHx8XG4gICAgICB0aGlzLnJlZ2V4cF9lYXRDbGFzc1NldFJlc2VydmVkUHVuY3R1YXRvcihzdGF0ZSlcbiAgICApIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIGlmIChzdGF0ZS5lYXQoMHg2MiAvKiBiICovKSkge1xuICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gMHgwODsgLyogPEJTPiAqL1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgc3RhdGUucG9zID0gc3RhcnQ7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoY2ggPCAwIHx8IGNoID09PSBzdGF0ZS5sb29rYWhlYWQoKSAmJiBpc0NsYXNzU2V0UmVzZXJ2ZWREb3VibGVQdW5jdHVhdG9yQ2hhcmFjdGVyKGNoKSkgeyByZXR1cm4gZmFsc2UgfVxuICBpZiAoaXNDbGFzc1NldFN5bnRheENoYXJhY3RlcihjaCkpIHsgcmV0dXJuIGZhbHNlIH1cbiAgc3RhdGUuYWR2YW5jZSgpO1xuICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBjaDtcbiAgcmV0dXJuIHRydWVcbn07XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0UmVzZXJ2ZWREb3VibGVQdW5jdHVhdG9yXG5mdW5jdGlvbiBpc0NsYXNzU2V0UmVzZXJ2ZWREb3VibGVQdW5jdHVhdG9yQ2hhcmFjdGVyKGNoKSB7XG4gIHJldHVybiAoXG4gICAgY2ggPT09IDB4MjEgLyogISAqLyB8fFxuICAgIGNoID49IDB4MjMgLyogIyAqLyAmJiBjaCA8PSAweDI2IC8qICYgKi8gfHxcbiAgICBjaCA+PSAweDJBIC8qICogKi8gJiYgY2ggPD0gMHgyQyAvKiAsICovIHx8XG4gICAgY2ggPT09IDB4MkUgLyogLiAqLyB8fFxuICAgIGNoID49IDB4M0EgLyogOiAqLyAmJiBjaCA8PSAweDQwIC8qIEAgKi8gfHxcbiAgICBjaCA9PT0gMHg1RSAvKiBeICovIHx8XG4gICAgY2ggPT09IDB4NjAgLyogYCAqLyB8fFxuICAgIGNoID09PSAweDdFIC8qIH4gKi9cbiAgKVxufVxuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldFN5bnRheENoYXJhY3RlclxuZnVuY3Rpb24gaXNDbGFzc1NldFN5bnRheENoYXJhY3RlcihjaCkge1xuICByZXR1cm4gKFxuICAgIGNoID09PSAweDI4IC8qICggKi8gfHxcbiAgICBjaCA9PT0gMHgyOSAvKiApICovIHx8XG4gICAgY2ggPT09IDB4MkQgLyogLSAqLyB8fFxuICAgIGNoID09PSAweDJGIC8qIC8gKi8gfHxcbiAgICBjaCA+PSAweDVCIC8qIFsgKi8gJiYgY2ggPD0gMHg1RCAvKiBdICovIHx8XG4gICAgY2ggPj0gMHg3QiAvKiB7ICovICYmIGNoIDw9IDB4N0QgLyogfSAqL1xuICApXG59XG5cbi8vIGh0dHBzOi8vdGMzOS5lcy9lY21hMjYyLyNwcm9kLUNsYXNzU2V0UmVzZXJ2ZWRQdW5jdHVhdG9yXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc1NldFJlc2VydmVkUHVuY3R1YXRvciA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBjaCA9IHN0YXRlLmN1cnJlbnQoKTtcbiAgaWYgKGlzQ2xhc3NTZXRSZXNlcnZlZFB1bmN0dWF0b3IoY2gpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gY2g7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3RjMzkuZXMvZWNtYTI2Mi8jcHJvZC1DbGFzc1NldFJlc2VydmVkUHVuY3R1YXRvclxuZnVuY3Rpb24gaXNDbGFzc1NldFJlc2VydmVkUHVuY3R1YXRvcihjaCkge1xuICByZXR1cm4gKFxuICAgIGNoID09PSAweDIxIC8qICEgKi8gfHxcbiAgICBjaCA9PT0gMHgyMyAvKiAjICovIHx8XG4gICAgY2ggPT09IDB4MjUgLyogJSAqLyB8fFxuICAgIGNoID09PSAweDI2IC8qICYgKi8gfHxcbiAgICBjaCA9PT0gMHgyQyAvKiAsICovIHx8XG4gICAgY2ggPT09IDB4MkQgLyogLSAqLyB8fFxuICAgIGNoID49IDB4M0EgLyogOiAqLyAmJiBjaCA8PSAweDNFIC8qID4gKi8gfHxcbiAgICBjaCA9PT0gMHg0MCAvKiBAICovIHx8XG4gICAgY2ggPT09IDB4NjAgLyogYCAqLyB8fFxuICAgIGNoID09PSAweDdFIC8qIH4gKi9cbiAgKVxufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1hbm5leEItQ2xhc3NDb250cm9sTGV0dGVyXG5wcCQxLnJlZ2V4cF9lYXRDbGFzc0NvbnRyb2xMZXR0ZXIgPSBmdW5jdGlvbihzdGF0ZSkge1xuICB2YXIgY2ggPSBzdGF0ZS5jdXJyZW50KCk7XG4gIGlmIChpc0RlY2ltYWxEaWdpdChjaCkgfHwgY2ggPT09IDB4NUYgLyogXyAqLykge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoICUgMHgyMDtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn07XG5cbi8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUhleEVzY2FwZVNlcXVlbmNlXG5wcCQxLnJlZ2V4cF9lYXRIZXhFc2NhcGVTZXF1ZW5jZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgaWYgKHN0YXRlLmVhdCgweDc4IC8qIHggKi8pKSB7XG4gICAgaWYgKHRoaXMucmVnZXhwX2VhdEZpeGVkSGV4RGlnaXRzKHN0YXRlLCAyKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKHN0YXRlLnN3aXRjaFUpIHtcbiAgICAgIHN0YXRlLnJhaXNlKFwiSW52YWxpZCBlc2NhcGVcIik7XG4gICAgfVxuICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICB9XG4gIHJldHVybiBmYWxzZVxufTtcblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtRGVjaW1hbERpZ2l0c1xucHAkMS5yZWdleHBfZWF0RGVjaW1hbERpZ2l0cyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgdmFyIGNoID0gMDtcbiAgc3RhdGUubGFzdEludFZhbHVlID0gMDtcbiAgd2hpbGUgKGlzRGVjaW1hbERpZ2l0KGNoID0gc3RhdGUuY3VycmVudCgpKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDEwICogc3RhdGUubGFzdEludFZhbHVlICsgKGNoIC0gMHgzMCAvKiAwICovKTtcbiAgICBzdGF0ZS5hZHZhbmNlKCk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLnBvcyAhPT0gc3RhcnRcbn07XG5mdW5jdGlvbiBpc0RlY2ltYWxEaWdpdChjaCkge1xuICByZXR1cm4gY2ggPj0gMHgzMCAvKiAwICovICYmIGNoIDw9IDB4MzkgLyogOSAqL1xufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1IZXhEaWdpdHNcbnBwJDEucmVnZXhwX2VhdEhleERpZ2l0cyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHZhciBzdGFydCA9IHN0YXRlLnBvcztcbiAgdmFyIGNoID0gMDtcbiAgc3RhdGUubGFzdEludFZhbHVlID0gMDtcbiAgd2hpbGUgKGlzSGV4RGlnaXQoY2ggPSBzdGF0ZS5jdXJyZW50KCkpKSB7XG4gICAgc3RhdGUubGFzdEludFZhbHVlID0gMTYgKiBzdGF0ZS5sYXN0SW50VmFsdWUgKyBoZXhUb0ludChjaCk7XG4gICAgc3RhdGUuYWR2YW5jZSgpO1xuICB9XG4gIHJldHVybiBzdGF0ZS5wb3MgIT09IHN0YXJ0XG59O1xuZnVuY3Rpb24gaXNIZXhEaWdpdChjaCkge1xuICByZXR1cm4gKFxuICAgIChjaCA+PSAweDMwIC8qIDAgKi8gJiYgY2ggPD0gMHgzOSAvKiA5ICovKSB8fFxuICAgIChjaCA+PSAweDQxIC8qIEEgKi8gJiYgY2ggPD0gMHg0NiAvKiBGICovKSB8fFxuICAgIChjaCA+PSAweDYxIC8qIGEgKi8gJiYgY2ggPD0gMHg2NiAvKiBmICovKVxuICApXG59XG5mdW5jdGlvbiBoZXhUb0ludChjaCkge1xuICBpZiAoY2ggPj0gMHg0MSAvKiBBICovICYmIGNoIDw9IDB4NDYgLyogRiAqLykge1xuICAgIHJldHVybiAxMCArIChjaCAtIDB4NDEgLyogQSAqLylcbiAgfVxuICBpZiAoY2ggPj0gMHg2MSAvKiBhICovICYmIGNoIDw9IDB4NjYgLyogZiAqLykge1xuICAgIHJldHVybiAxMCArIChjaCAtIDB4NjEgLyogYSAqLylcbiAgfVxuICByZXR1cm4gY2ggLSAweDMwIC8qIDAgKi9cbn1cblxuLy8gaHR0cHM6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi84LjAvI3Byb2QtYW5uZXhCLUxlZ2FjeU9jdGFsRXNjYXBlU2VxdWVuY2Vcbi8vIEFsbG93cyBvbmx5IDAtMzc3KG9jdGFsKSBpLmUuIDAtMjU1KGRlY2ltYWwpLlxucHAkMS5yZWdleHBfZWF0TGVnYWN5T2N0YWxFc2NhcGVTZXF1ZW5jZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIGlmICh0aGlzLnJlZ2V4cF9lYXRPY3RhbERpZ2l0KHN0YXRlKSkge1xuICAgIHZhciBuMSA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICBpZiAodGhpcy5yZWdleHBfZWF0T2N0YWxEaWdpdChzdGF0ZSkpIHtcbiAgICAgIHZhciBuMiA9IHN0YXRlLmxhc3RJbnRWYWx1ZTtcbiAgICAgIGlmIChuMSA8PSAzICYmIHRoaXMucmVnZXhwX2VhdE9jdGFsRGlnaXQoc3RhdGUpKSB7XG4gICAgICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IG4xICogNjQgKyBuMiAqIDggKyBzdGF0ZS5sYXN0SW50VmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5sYXN0SW50VmFsdWUgPSBuMSAqIDggKyBuMjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdGUubGFzdEludFZhbHVlID0gbjE7XG4gICAgfVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59O1xuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1PY3RhbERpZ2l0XG5wcCQxLnJlZ2V4cF9lYXRPY3RhbERpZ2l0ID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IGNoIC0gMHgzMDsgLyogMCAqL1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDA7XG4gIHJldHVybiBmYWxzZVxufTtcbmZ1bmN0aW9uIGlzT2N0YWxEaWdpdChjaCkge1xuICByZXR1cm4gY2ggPj0gMHgzMCAvKiAwICovICYmIGNoIDw9IDB4MzcgLyogNyAqL1xufVxuXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1IZXg0RGlnaXRzXG4vLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzguMC8jcHJvZC1IZXhEaWdpdFxuLy8gQW5kIEhleERpZ2l0IEhleERpZ2l0IGluIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOC4wLyNwcm9kLUhleEVzY2FwZVNlcXVlbmNlXG5wcCQxLnJlZ2V4cF9lYXRGaXhlZEhleERpZ2l0cyA9IGZ1bmN0aW9uKHN0YXRlLCBsZW5ndGgpIHtcbiAgdmFyIHN0YXJ0ID0gc3RhdGUucG9zO1xuICBzdGF0ZS5sYXN0SW50VmFsdWUgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGNoID0gc3RhdGUuY3VycmVudCgpO1xuICAgIGlmICghaXNIZXhEaWdpdChjaCkpIHtcbiAgICAgIHN0YXRlLnBvcyA9IHN0YXJ0O1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHN0YXRlLmxhc3RJbnRWYWx1ZSA9IDE2ICogc3RhdGUubGFzdEludFZhbHVlICsgaGV4VG9JbnQoY2gpO1xuICAgIHN0YXRlLmFkdmFuY2UoKTtcbiAgfVxuICByZXR1cm4gdHJ1ZVxufTtcblxuLy8gT2JqZWN0IHR5cGUgdXNlZCB0byByZXByZXNlbnQgdG9rZW5zLiBOb3RlIHRoYXQgbm9ybWFsbHksIHRva2Vuc1xuLy8gc2ltcGx5IGV4aXN0IGFzIHByb3BlcnRpZXMgb24gdGhlIHBhcnNlciBvYmplY3QuIFRoaXMgaXMgb25seVxuLy8gdXNlZCBmb3IgdGhlIG9uVG9rZW4gY2FsbGJhY2sgYW5kIHRoZSBleHRlcm5hbCB0b2tlbml6ZXIuXG5cbnZhciBUb2tlbiA9IGZ1bmN0aW9uIFRva2VuKHApIHtcbiAgdGhpcy50eXBlID0gcC50eXBlO1xuICB0aGlzLnZhbHVlID0gcC52YWx1ZTtcbiAgdGhpcy5zdGFydCA9IHAuc3RhcnQ7XG4gIHRoaXMuZW5kID0gcC5lbmQ7XG4gIGlmIChwLm9wdGlvbnMubG9jYXRpb25zKVxuICAgIHsgdGhpcy5sb2MgPSBuZXcgU291cmNlTG9jYXRpb24ocCwgcC5zdGFydExvYywgcC5lbmRMb2MpOyB9XG4gIGlmIChwLm9wdGlvbnMucmFuZ2VzKVxuICAgIHsgdGhpcy5yYW5nZSA9IFtwLnN0YXJ0LCBwLmVuZF07IH1cbn07XG5cbi8vICMjIFRva2VuaXplclxuXG52YXIgcHAgPSBQYXJzZXIucHJvdG90eXBlO1xuXG4vLyBNb3ZlIHRvIHRoZSBuZXh0IHRva2VuXG5cbnBwLm5leHQgPSBmdW5jdGlvbihpZ25vcmVFc2NhcGVTZXF1ZW5jZUluS2V5d29yZCkge1xuICBpZiAoIWlnbm9yZUVzY2FwZVNlcXVlbmNlSW5LZXl3b3JkICYmIHRoaXMudHlwZS5rZXl3b3JkICYmIHRoaXMuY29udGFpbnNFc2MpXG4gICAgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5zdGFydCwgXCJFc2NhcGUgc2VxdWVuY2UgaW4ga2V5d29yZCBcIiArIHRoaXMudHlwZS5rZXl3b3JkKTsgfVxuICBpZiAodGhpcy5vcHRpb25zLm9uVG9rZW4pXG4gICAgeyB0aGlzLm9wdGlvbnMub25Ub2tlbihuZXcgVG9rZW4odGhpcykpOyB9XG5cbiAgdGhpcy5sYXN0VG9rRW5kID0gdGhpcy5lbmQ7XG4gIHRoaXMubGFzdFRva1N0YXJ0ID0gdGhpcy5zdGFydDtcbiAgdGhpcy5sYXN0VG9rRW5kTG9jID0gdGhpcy5lbmRMb2M7XG4gIHRoaXMubGFzdFRva1N0YXJ0TG9jID0gdGhpcy5zdGFydExvYztcbiAgdGhpcy5uZXh0VG9rZW4oKTtcbn07XG5cbnBwLmdldFRva2VuID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMubmV4dCgpO1xuICByZXR1cm4gbmV3IFRva2VuKHRoaXMpXG59O1xuXG4vLyBJZiB3ZSdyZSBpbiBhbiBFUzYgZW52aXJvbm1lbnQsIG1ha2UgcGFyc2VycyBpdGVyYWJsZVxuaWYgKHR5cGVvZiBTeW1ib2wgIT09IFwidW5kZWZpbmVkXCIpXG4gIHsgcHBbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGlzJDEkMSA9IHRoaXM7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSB0aGlzJDEkMS5nZXRUb2tlbigpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRvbmU6IHRva2VuLnR5cGUgPT09IHR5cGVzJDEuZW9mLFxuICAgICAgICAgIHZhbHVlOiB0b2tlblxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9OyB9XG5cbi8vIFRvZ2dsZSBzdHJpY3QgbW9kZS4gUmUtcmVhZHMgdGhlIG5leHQgbnVtYmVyIG9yIHN0cmluZyB0byBwbGVhc2Vcbi8vIHBlZGFudGljIHRlc3RzIChgXCJ1c2Ugc3RyaWN0XCI7IDAxMDtgIHNob3VsZCBmYWlsKS5cblxuLy8gUmVhZCBhIHNpbmdsZSB0b2tlbiwgdXBkYXRpbmcgdGhlIHBhcnNlciBvYmplY3QncyB0b2tlbi1yZWxhdGVkXG4vLyBwcm9wZXJ0aWVzLlxuXG5wcC5uZXh0VG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGN1ckNvbnRleHQgPSB0aGlzLmN1ckNvbnRleHQoKTtcbiAgaWYgKCFjdXJDb250ZXh0IHx8ICFjdXJDb250ZXh0LnByZXNlcnZlU3BhY2UpIHsgdGhpcy5za2lwU3BhY2UoKTsgfVxuXG4gIHRoaXMuc3RhcnQgPSB0aGlzLnBvcztcbiAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHsgdGhpcy5zdGFydExvYyA9IHRoaXMuY3VyUG9zaXRpb24oKTsgfVxuICBpZiAodGhpcy5wb3MgPj0gdGhpcy5pbnB1dC5sZW5ndGgpIHsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5lb2YpIH1cblxuICBpZiAoY3VyQ29udGV4dC5vdmVycmlkZSkgeyByZXR1cm4gY3VyQ29udGV4dC5vdmVycmlkZSh0aGlzKSB9XG4gIGVsc2UgeyB0aGlzLnJlYWRUb2tlbih0aGlzLmZ1bGxDaGFyQ29kZUF0UG9zKCkpOyB9XG59O1xuXG5wcC5yZWFkVG9rZW4gPSBmdW5jdGlvbihjb2RlKSB7XG4gIC8vIElkZW50aWZpZXIgb3Iga2V5d29yZC4gJ1xcdVhYWFgnIHNlcXVlbmNlcyBhcmUgYWxsb3dlZCBpblxuICAvLyBpZGVudGlmaWVycywgc28gJ1xcJyBhbHNvIGRpc3BhdGNoZXMgdG8gdGhhdC5cbiAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNvZGUsIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB8fCBjb2RlID09PSA5MiAvKiAnXFwnICovKVxuICAgIHsgcmV0dXJuIHRoaXMucmVhZFdvcmQoKSB9XG5cbiAgcmV0dXJuIHRoaXMuZ2V0VG9rZW5Gcm9tQ29kZShjb2RlKVxufTtcblxucHAuZnVsbENoYXJDb2RlQXQgPSBmdW5jdGlvbihwb3MpIHtcbiAgdmFyIGNvZGUgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQocG9zKTtcbiAgaWYgKGNvZGUgPD0gMHhkN2ZmIHx8IGNvZGUgPj0gMHhkYzAwKSB7IHJldHVybiBjb2RlIH1cbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQocG9zICsgMSk7XG4gIHJldHVybiBuZXh0IDw9IDB4ZGJmZiB8fCBuZXh0ID49IDB4ZTAwMCA/IGNvZGUgOiAoY29kZSA8PCAxMCkgKyBuZXh0IC0gMHgzNWZkYzAwXG59O1xuXG5wcC5mdWxsQ2hhckNvZGVBdFBvcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5mdWxsQ2hhckNvZGVBdCh0aGlzLnBvcylcbn07XG5cbnBwLnNraXBCbG9ja0NvbW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHN0YXJ0TG9jID0gdGhpcy5vcHRpb25zLm9uQ29tbWVudCAmJiB0aGlzLmN1clBvc2l0aW9uKCk7XG4gIHZhciBzdGFydCA9IHRoaXMucG9zLCBlbmQgPSB0aGlzLmlucHV0LmluZGV4T2YoXCIqL1wiLCB0aGlzLnBvcyArPSAyKTtcbiAgaWYgKGVuZCA9PT0gLTEpIHsgdGhpcy5yYWlzZSh0aGlzLnBvcyAtIDIsIFwiVW50ZXJtaW5hdGVkIGNvbW1lbnRcIik7IH1cbiAgdGhpcy5wb3MgPSBlbmQgKyAyO1xuICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykge1xuICAgIGZvciAodmFyIG5leHRCcmVhayA9ICh2b2lkIDApLCBwb3MgPSBzdGFydDsgKG5leHRCcmVhayA9IG5leHRMaW5lQnJlYWsodGhpcy5pbnB1dCwgcG9zLCB0aGlzLnBvcykpID4gLTE7KSB7XG4gICAgICArK3RoaXMuY3VyTGluZTtcbiAgICAgIHBvcyA9IHRoaXMubGluZVN0YXJ0ID0gbmV4dEJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAodGhpcy5vcHRpb25zLm9uQ29tbWVudClcbiAgICB7IHRoaXMub3B0aW9ucy5vbkNvbW1lbnQodHJ1ZSwgdGhpcy5pbnB1dC5zbGljZShzdGFydCArIDIsIGVuZCksIHN0YXJ0LCB0aGlzLnBvcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TG9jLCB0aGlzLmN1clBvc2l0aW9uKCkpOyB9XG59O1xuXG5wcC5za2lwTGluZUNvbW1lbnQgPSBmdW5jdGlvbihzdGFydFNraXApIHtcbiAgdmFyIHN0YXJ0ID0gdGhpcy5wb3M7XG4gIHZhciBzdGFydExvYyA9IHRoaXMub3B0aW9ucy5vbkNvbW1lbnQgJiYgdGhpcy5jdXJQb3NpdGlvbigpO1xuICB2YXIgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKz0gc3RhcnRTa2lwKTtcbiAgd2hpbGUgKHRoaXMucG9zIDwgdGhpcy5pbnB1dC5sZW5ndGggJiYgIWlzTmV3TGluZShjaCkpIHtcbiAgICBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCgrK3RoaXMucG9zKTtcbiAgfVxuICBpZiAodGhpcy5vcHRpb25zLm9uQ29tbWVudClcbiAgICB7IHRoaXMub3B0aW9ucy5vbkNvbW1lbnQoZmFsc2UsIHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQgKyBzdGFydFNraXAsIHRoaXMucG9zKSwgc3RhcnQsIHRoaXMucG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMb2MsIHRoaXMuY3VyUG9zaXRpb24oKSk7IH1cbn07XG5cbi8vIENhbGxlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIHBhcnNlIGFuZCBhZnRlciBldmVyeSB0b2tlbi4gU2tpcHNcbi8vIHdoaXRlc3BhY2UgYW5kIGNvbW1lbnRzLCBhbmQuXG5cbnBwLnNraXBTcGFjZSA9IGZ1bmN0aW9uKCkge1xuICBsb29wOiB3aGlsZSAodGhpcy5wb3MgPCB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgIHZhciBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gICAgc3dpdGNoIChjaCkge1xuICAgIGNhc2UgMzI6IGNhc2UgMTYwOiAvLyAnICdcbiAgICAgICsrdGhpcy5wb3M7XG4gICAgICBicmVha1xuICAgIGNhc2UgMTM6XG4gICAgICBpZiAodGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSkgPT09IDEwKSB7XG4gICAgICAgICsrdGhpcy5wb3M7XG4gICAgICB9XG4gICAgY2FzZSAxMDogY2FzZSA4MjMyOiBjYXNlIDgyMzM6XG4gICAgICArK3RoaXMucG9zO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHtcbiAgICAgICAgKyt0aGlzLmN1ckxpbmU7XG4gICAgICAgIHRoaXMubGluZVN0YXJ0ID0gdGhpcy5wb3M7XG4gICAgICB9XG4gICAgICBicmVha1xuICAgIGNhc2UgNDc6IC8vICcvJ1xuICAgICAgc3dpdGNoICh0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKSkge1xuICAgICAgY2FzZSA0MjogLy8gJyonXG4gICAgICAgIHRoaXMuc2tpcEJsb2NrQ29tbWVudCgpO1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0NzpcbiAgICAgICAgdGhpcy5za2lwTGluZUNvbW1lbnQoMik7XG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhayBsb29wXG4gICAgICB9XG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICBpZiAoY2ggPiA4ICYmIGNoIDwgMTQgfHwgY2ggPj0gNTc2MCAmJiBub25BU0NJSXdoaXRlc3BhY2UudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKSkpIHtcbiAgICAgICAgKyt0aGlzLnBvcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrIGxvb3BcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8vIENhbGxlZCBhdCB0aGUgZW5kIG9mIGV2ZXJ5IHRva2VuLiBTZXRzIGBlbmRgLCBgdmFsYCwgYW5kXG4vLyBtYWludGFpbnMgYGNvbnRleHRgIGFuZCBgZXhwckFsbG93ZWRgLCBhbmQgc2tpcHMgdGhlIHNwYWNlIGFmdGVyXG4vLyB0aGUgdG9rZW4sIHNvIHRoYXQgdGhlIG5leHQgb25lJ3MgYHN0YXJ0YCB3aWxsIHBvaW50IGF0IHRoZVxuLy8gcmlnaHQgcG9zaXRpb24uXG5cbnBwLmZpbmlzaFRva2VuID0gZnVuY3Rpb24odHlwZSwgdmFsKSB7XG4gIHRoaXMuZW5kID0gdGhpcy5wb3M7XG4gIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7IHRoaXMuZW5kTG9jID0gdGhpcy5jdXJQb3NpdGlvbigpOyB9XG4gIHZhciBwcmV2VHlwZSA9IHRoaXMudHlwZTtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbDtcblxuICB0aGlzLnVwZGF0ZUNvbnRleHQocHJldlR5cGUpO1xufTtcblxuLy8gIyMjIFRva2VuIHJlYWRpbmdcblxuLy8gVGhpcyBpcyB0aGUgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgdG8gZmV0Y2ggdGhlIG5leHQgdG9rZW4uIEl0XG4vLyBpcyBzb21ld2hhdCBvYnNjdXJlLCBiZWNhdXNlIGl0IHdvcmtzIGluIGNoYXJhY3RlciBjb2RlcyByYXRoZXJcbi8vIHRoYW4gY2hhcmFjdGVycywgYW5kIGJlY2F1c2Ugb3BlcmF0b3IgcGFyc2luZyBoYXMgYmVlbiBpbmxpbmVkXG4vLyBpbnRvIGl0LlxuLy9cbi8vIEFsbCBpbiB0aGUgbmFtZSBvZiBzcGVlZC5cbi8vXG5wcC5yZWFkVG9rZW5fZG90ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIGlmIChuZXh0ID49IDQ4ICYmIG5leHQgPD0gNTcpIHsgcmV0dXJuIHRoaXMucmVhZE51bWJlcih0cnVlKSB9XG4gIHZhciBuZXh0MiA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpO1xuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgbmV4dCA9PT0gNDYgJiYgbmV4dDIgPT09IDQ2KSB7IC8vIDQ2ID0gZG90ICcuJ1xuICAgIHRoaXMucG9zICs9IDM7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5lbGxpcHNpcylcbiAgfSBlbHNlIHtcbiAgICArK3RoaXMucG9zO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuZG90KVxuICB9XG59O1xuXG5wcC5yZWFkVG9rZW5fc2xhc2ggPSBmdW5jdGlvbigpIHsgLy8gJy8nXG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIGlmICh0aGlzLmV4cHJBbGxvd2VkKSB7ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLnJlYWRSZWdleHAoKSB9XG4gIGlmIChuZXh0ID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgMikgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLnNsYXNoLCAxKVxufTtcblxucHAucmVhZFRva2VuX211bHRfbW9kdWxvX2V4cCA9IGZ1bmN0aW9uKGNvZGUpIHsgLy8gJyUqJ1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICB2YXIgc2l6ZSA9IDE7XG4gIHZhciB0b2tlbnR5cGUgPSBjb2RlID09PSA0MiA/IHR5cGVzJDEuc3RhciA6IHR5cGVzJDEubW9kdWxvO1xuXG4gIC8vIGV4cG9uZW50aWF0aW9uIG9wZXJhdG9yICoqIGFuZCAqKj1cbiAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA3ICYmIGNvZGUgPT09IDQyICYmIG5leHQgPT09IDQyKSB7XG4gICAgKytzaXplO1xuICAgIHRva2VudHlwZSA9IHR5cGVzJDEuc3RhcnN0YXI7XG4gICAgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpO1xuICB9XG5cbiAgaWYgKG5leHQgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCBzaXplICsgMSkgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcCh0b2tlbnR5cGUsIHNpemUpXG59O1xuXG5wcC5yZWFkVG9rZW5fcGlwZV9hbXAgPSBmdW5jdGlvbihjb2RlKSB7IC8vICd8JidcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgaWYgKG5leHQgPT09IGNvZGUpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDEyKSB7XG4gICAgICB2YXIgbmV4dDIgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKTtcbiAgICAgIGlmIChuZXh0MiA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIDMpIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoT3AoY29kZSA9PT0gMTI0ID8gdHlwZXMkMS5sb2dpY2FsT1IgOiB0eXBlcyQxLmxvZ2ljYWxBTkQsIDIpXG4gIH1cbiAgaWYgKG5leHQgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCAyKSB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKGNvZGUgPT09IDEyNCA/IHR5cGVzJDEuYml0d2lzZU9SIDogdHlwZXMkMS5iaXR3aXNlQU5ELCAxKVxufTtcblxucHAucmVhZFRva2VuX2NhcmV0ID0gZnVuY3Rpb24oKSB7IC8vICdeJ1xuICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICBpZiAobmV4dCA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIDIpIH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5iaXR3aXNlWE9SLCAxKVxufTtcblxucHAucmVhZFRva2VuX3BsdXNfbWluID0gZnVuY3Rpb24oY29kZSkgeyAvLyAnKy0nXG4gIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gIGlmIChuZXh0ID09PSBjb2RlKSB7XG4gICAgaWYgKG5leHQgPT09IDQ1ICYmICF0aGlzLmluTW9kdWxlICYmIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpID09PSA2MiAmJlxuICAgICAgICAodGhpcy5sYXN0VG9rRW5kID09PSAwIHx8IGxpbmVCcmVhay50ZXN0KHRoaXMuaW5wdXQuc2xpY2UodGhpcy5sYXN0VG9rRW5kLCB0aGlzLnBvcykpKSkge1xuICAgICAgLy8gQSBgLS0+YCBsaW5lIGNvbW1lbnRcbiAgICAgIHRoaXMuc2tpcExpbmVDb21tZW50KDMpO1xuICAgICAgdGhpcy5za2lwU3BhY2UoKTtcbiAgICAgIHJldHVybiB0aGlzLm5leHRUb2tlbigpXG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuaW5jRGVjLCAyKVxuICB9XG4gIGlmIChuZXh0ID09PSA2MSkgeyByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLmFzc2lnbiwgMikgfVxuICByZXR1cm4gdGhpcy5maW5pc2hPcCh0eXBlcyQxLnBsdXNNaW4sIDEpXG59O1xuXG5wcC5yZWFkVG9rZW5fbHRfZ3QgPSBmdW5jdGlvbihjb2RlKSB7IC8vICc8PidcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgdmFyIHNpemUgPSAxO1xuICBpZiAobmV4dCA9PT0gY29kZSkge1xuICAgIHNpemUgPSBjb2RlID09PSA2MiAmJiB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKSA9PT0gNjIgPyAzIDogMjtcbiAgICBpZiAodGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgc2l6ZSkgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYXNzaWduLCBzaXplICsgMSkgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuYml0U2hpZnQsIHNpemUpXG4gIH1cbiAgaWYgKG5leHQgPT09IDMzICYmIGNvZGUgPT09IDYwICYmICF0aGlzLmluTW9kdWxlICYmIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpID09PSA0NSAmJlxuICAgICAgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMykgPT09IDQ1KSB7XG4gICAgLy8gYDwhLS1gLCBhbiBYTUwtc3R5bGUgY29tbWVudCB0aGF0IHNob3VsZCBiZSBpbnRlcnByZXRlZCBhcyBhIGxpbmUgY29tbWVudFxuICAgIHRoaXMuc2tpcExpbmVDb21tZW50KDQpO1xuICAgIHRoaXMuc2tpcFNwYWNlKCk7XG4gICAgcmV0dXJuIHRoaXMubmV4dFRva2VuKClcbiAgfVxuICBpZiAobmV4dCA9PT0gNjEpIHsgc2l6ZSA9IDI7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5yZWxhdGlvbmFsLCBzaXplKVxufTtcblxucHAucmVhZFRva2VuX2VxX2V4Y2wgPSBmdW5jdGlvbihjb2RlKSB7IC8vICc9ISdcbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgaWYgKG5leHQgPT09IDYxKSB7IHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuZXF1YWxpdHksIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpID09PSA2MSA/IDMgOiAyKSB9XG4gIGlmIChjb2RlID09PSA2MSAmJiBuZXh0ID09PSA2MiAmJiB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb24gPj0gNikgeyAvLyAnPT4nXG4gICAgdGhpcy5wb3MgKz0gMjtcbiAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmFycm93KVxuICB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKGNvZGUgPT09IDYxID8gdHlwZXMkMS5lcSA6IHR5cGVzJDEucHJlZml4LCAxKVxufTtcblxucHAucmVhZFRva2VuX3F1ZXN0aW9uID0gZnVuY3Rpb24oKSB7IC8vICc/J1xuICB2YXIgZWNtYVZlcnNpb24gPSB0aGlzLm9wdGlvbnMuZWNtYVZlcnNpb247XG4gIGlmIChlY21hVmVyc2lvbiA+PSAxMSkge1xuICAgIHZhciBuZXh0ID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zICsgMSk7XG4gICAgaWYgKG5leHQgPT09IDQ2KSB7XG4gICAgICB2YXIgbmV4dDIgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MgKyAyKTtcbiAgICAgIGlmIChuZXh0MiA8IDQ4IHx8IG5leHQyID4gNTcpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5xdWVzdGlvbkRvdCwgMikgfVxuICAgIH1cbiAgICBpZiAobmV4dCA9PT0gNjMpIHtcbiAgICAgIGlmIChlY21hVmVyc2lvbiA+PSAxMikge1xuICAgICAgICB2YXIgbmV4dDIkMSA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDIpO1xuICAgICAgICBpZiAobmV4dDIkMSA9PT0gNjEpIHsgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5hc3NpZ24sIDMpIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEuY29hbGVzY2UsIDIpXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzLmZpbmlzaE9wKHR5cGVzJDEucXVlc3Rpb24sIDEpXG59O1xuXG5wcC5yZWFkVG9rZW5fbnVtYmVyU2lnbiA9IGZ1bmN0aW9uKCkgeyAvLyAnIydcbiAgdmFyIGVjbWFWZXJzaW9uID0gdGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uO1xuICB2YXIgY29kZSA9IDM1OyAvLyAnIydcbiAgaWYgKGVjbWFWZXJzaW9uID49IDEzKSB7XG4gICAgKyt0aGlzLnBvcztcbiAgICBjb2RlID0gdGhpcy5mdWxsQ2hhckNvZGVBdFBvcygpO1xuICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjb2RlLCB0cnVlKSB8fCBjb2RlID09PSA5MiAvKiAnXFwnICovKSB7XG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLnByaXZhdGVJZCwgdGhpcy5yZWFkV29yZDEoKSlcbiAgICB9XG4gIH1cblxuICB0aGlzLnJhaXNlKHRoaXMucG9zLCBcIlVuZXhwZWN0ZWQgY2hhcmFjdGVyICdcIiArIGNvZGVQb2ludFRvU3RyaW5nKGNvZGUpICsgXCInXCIpO1xufTtcblxucHAuZ2V0VG9rZW5Gcm9tQ29kZSA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgc3dpdGNoIChjb2RlKSB7XG4gIC8vIFRoZSBpbnRlcnByZXRhdGlvbiBvZiBhIGRvdCBkZXBlbmRzIG9uIHdoZXRoZXIgaXQgaXMgZm9sbG93ZWRcbiAgLy8gYnkgYSBkaWdpdCBvciBhbm90aGVyIHR3byBkb3RzLlxuICBjYXNlIDQ2OiAvLyAnLidcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fZG90KClcblxuICAvLyBQdW5jdHVhdGlvbiB0b2tlbnMuXG4gIGNhc2UgNDA6ICsrdGhpcy5wb3M7IHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEucGFyZW5MKVxuICBjYXNlIDQxOiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLnBhcmVuUilcbiAgY2FzZSA1OTogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5zZW1pKVxuICBjYXNlIDQ0OiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmNvbW1hKVxuICBjYXNlIDkxOiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmJyYWNrZXRMKVxuICBjYXNlIDkzOiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmJyYWNrZXRSKVxuICBjYXNlIDEyMzogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5icmFjZUwpXG4gIGNhc2UgMTI1OiArK3RoaXMucG9zOyByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmJyYWNlUilcbiAgY2FzZSA1ODogKyt0aGlzLnBvczsgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5jb2xvbilcblxuICBjYXNlIDk2OiAvLyAnYCdcbiAgICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uIDwgNikgeyBicmVhayB9XG4gICAgKyt0aGlzLnBvcztcbiAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmJhY2tRdW90ZSlcblxuICBjYXNlIDQ4OiAvLyAnMCdcbiAgICB2YXIgbmV4dCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuICAgIGlmIChuZXh0ID09PSAxMjAgfHwgbmV4dCA9PT0gODgpIHsgcmV0dXJuIHRoaXMucmVhZFJhZGl4TnVtYmVyKDE2KSB9IC8vICcweCcsICcwWCcgLSBoZXggbnVtYmVyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2KSB7XG4gICAgICBpZiAobmV4dCA9PT0gMTExIHx8IG5leHQgPT09IDc5KSB7IHJldHVybiB0aGlzLnJlYWRSYWRpeE51bWJlcig4KSB9IC8vICcwbycsICcwTycgLSBvY3RhbCBudW1iZXJcbiAgICAgIGlmIChuZXh0ID09PSA5OCB8fCBuZXh0ID09PSA2NikgeyByZXR1cm4gdGhpcy5yZWFkUmFkaXhOdW1iZXIoMikgfSAvLyAnMGInLCAnMEInIC0gYmluYXJ5IG51bWJlclxuICAgIH1cblxuICAvLyBBbnl0aGluZyBlbHNlIGJlZ2lubmluZyB3aXRoIGEgZGlnaXQgaXMgYW4gaW50ZWdlciwgb2N0YWxcbiAgLy8gbnVtYmVyLCBvciBmbG9hdC5cbiAgY2FzZSA0OTogY2FzZSA1MDogY2FzZSA1MTogY2FzZSA1MjogY2FzZSA1MzogY2FzZSA1NDogY2FzZSA1NTogY2FzZSA1NjogY2FzZSA1NzogLy8gMS05XG4gICAgcmV0dXJuIHRoaXMucmVhZE51bWJlcihmYWxzZSlcblxuICAvLyBRdW90ZXMgcHJvZHVjZSBzdHJpbmdzLlxuICBjYXNlIDM0OiBjYXNlIDM5OiAvLyAnXCInLCBcIidcIlxuICAgIHJldHVybiB0aGlzLnJlYWRTdHJpbmcoY29kZSlcblxuICAvLyBPcGVyYXRvcnMgYXJlIHBhcnNlZCBpbmxpbmUgaW4gdGlueSBzdGF0ZSBtYWNoaW5lcy4gJz0nICg2MSkgaXNcbiAgLy8gb2Z0ZW4gcmVmZXJyZWQgdG8uIGBmaW5pc2hPcGAgc2ltcGx5IHNraXBzIHRoZSBhbW91bnQgb2ZcbiAgLy8gY2hhcmFjdGVycyBpdCBpcyBnaXZlbiBhcyBzZWNvbmQgYXJndW1lbnQsIGFuZCByZXR1cm5zIGEgdG9rZW5cbiAgLy8gb2YgdGhlIHR5cGUgZ2l2ZW4gYnkgaXRzIGZpcnN0IGFyZ3VtZW50LlxuICBjYXNlIDQ3OiAvLyAnLydcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fc2xhc2goKVxuXG4gIGNhc2UgMzc6IGNhc2UgNDI6IC8vICclKidcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fbXVsdF9tb2R1bG9fZXhwKGNvZGUpXG5cbiAgY2FzZSAxMjQ6IGNhc2UgMzg6IC8vICd8JidcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fcGlwZV9hbXAoY29kZSlcblxuICBjYXNlIDk0OiAvLyAnXidcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fY2FyZXQoKVxuXG4gIGNhc2UgNDM6IGNhc2UgNDU6IC8vICcrLSdcbiAgICByZXR1cm4gdGhpcy5yZWFkVG9rZW5fcGx1c19taW4oY29kZSlcblxuICBjYXNlIDYwOiBjYXNlIDYyOiAvLyAnPD4nXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX2x0X2d0KGNvZGUpXG5cbiAgY2FzZSA2MTogY2FzZSAzMzogLy8gJz0hJ1xuICAgIHJldHVybiB0aGlzLnJlYWRUb2tlbl9lcV9leGNsKGNvZGUpXG5cbiAgY2FzZSA2MzogLy8gJz8nXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX3F1ZXN0aW9uKClcblxuICBjYXNlIDEyNjogLy8gJ34nXG4gICAgcmV0dXJuIHRoaXMuZmluaXNoT3AodHlwZXMkMS5wcmVmaXgsIDEpXG5cbiAgY2FzZSAzNTogLy8gJyMnXG4gICAgcmV0dXJuIHRoaXMucmVhZFRva2VuX251bWJlclNpZ24oKVxuICB9XG5cbiAgdGhpcy5yYWlzZSh0aGlzLnBvcywgXCJVbmV4cGVjdGVkIGNoYXJhY3RlciAnXCIgKyBjb2RlUG9pbnRUb1N0cmluZyhjb2RlKSArIFwiJ1wiKTtcbn07XG5cbnBwLmZpbmlzaE9wID0gZnVuY3Rpb24odHlwZSwgc2l6ZSkge1xuICB2YXIgc3RyID0gdGhpcy5pbnB1dC5zbGljZSh0aGlzLnBvcywgdGhpcy5wb3MgKyBzaXplKTtcbiAgdGhpcy5wb3MgKz0gc2l6ZTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZSwgc3RyKVxufTtcblxucHAucmVhZFJlZ2V4cCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZXNjYXBlZCwgaW5DbGFzcywgc3RhcnQgPSB0aGlzLnBvcztcbiAgZm9yICg7Oykge1xuICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmlucHV0Lmxlbmd0aCkgeyB0aGlzLnJhaXNlKHN0YXJ0LCBcIlVudGVybWluYXRlZCByZWd1bGFyIGV4cHJlc3Npb25cIik7IH1cbiAgICB2YXIgY2ggPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgaWYgKGxpbmVCcmVhay50ZXN0KGNoKSkgeyB0aGlzLnJhaXNlKHN0YXJ0LCBcIlVudGVybWluYXRlZCByZWd1bGFyIGV4cHJlc3Npb25cIik7IH1cbiAgICBpZiAoIWVzY2FwZWQpIHtcbiAgICAgIGlmIChjaCA9PT0gXCJbXCIpIHsgaW5DbGFzcyA9IHRydWU7IH1cbiAgICAgIGVsc2UgaWYgKGNoID09PSBcIl1cIiAmJiBpbkNsYXNzKSB7IGluQ2xhc3MgPSBmYWxzZTsgfVxuICAgICAgZWxzZSBpZiAoY2ggPT09IFwiL1wiICYmICFpbkNsYXNzKSB7IGJyZWFrIH1cbiAgICAgIGVzY2FwZWQgPSBjaCA9PT0gXCJcXFxcXCI7XG4gICAgfSBlbHNlIHsgZXNjYXBlZCA9IGZhbHNlOyB9XG4gICAgKyt0aGlzLnBvcztcbiAgfVxuICB2YXIgcGF0dGVybiA9IHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQsIHRoaXMucG9zKTtcbiAgKyt0aGlzLnBvcztcbiAgdmFyIGZsYWdzU3RhcnQgPSB0aGlzLnBvcztcbiAgdmFyIGZsYWdzID0gdGhpcy5yZWFkV29yZDEoKTtcbiAgaWYgKHRoaXMuY29udGFpbnNFc2MpIHsgdGhpcy51bmV4cGVjdGVkKGZsYWdzU3RhcnQpOyB9XG5cbiAgLy8gVmFsaWRhdGUgcGF0dGVyblxuICB2YXIgc3RhdGUgPSB0aGlzLnJlZ2V4cFN0YXRlIHx8ICh0aGlzLnJlZ2V4cFN0YXRlID0gbmV3IFJlZ0V4cFZhbGlkYXRpb25TdGF0ZSh0aGlzKSk7XG4gIHN0YXRlLnJlc2V0KHN0YXJ0LCBwYXR0ZXJuLCBmbGFncyk7XG4gIHRoaXMudmFsaWRhdGVSZWdFeHBGbGFncyhzdGF0ZSk7XG4gIHRoaXMudmFsaWRhdGVSZWdFeHBQYXR0ZXJuKHN0YXRlKTtcblxuICAvLyBDcmVhdGUgTGl0ZXJhbCN2YWx1ZSBwcm9wZXJ0eSB2YWx1ZS5cbiAgdmFyIHZhbHVlID0gbnVsbDtcbiAgdHJ5IHtcbiAgICB2YWx1ZSA9IG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gRVNUcmVlIHJlcXVpcmVzIG51bGwgaWYgaXQgZmFpbGVkIHRvIGluc3RhbnRpYXRlIFJlZ0V4cCBvYmplY3QuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2VzdHJlZS9lc3RyZWUvYmxvYi9hMjcwMDNhZGY0ZmQ3YmZhZDQ0ZGU5Y2VmMzcyYTJlYWNkNTI3YjFjL2VzNS5tZCNyZWdleHBsaXRlcmFsXG4gIH1cblxuICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLnJlZ2V4cCwge3BhdHRlcm46IHBhdHRlcm4sIGZsYWdzOiBmbGFncywgdmFsdWU6IHZhbHVlfSlcbn07XG5cbi8vIFJlYWQgYW4gaW50ZWdlciBpbiB0aGUgZ2l2ZW4gcmFkaXguIFJldHVybiBudWxsIGlmIHplcm8gZGlnaXRzXG4vLyB3ZXJlIHJlYWQsIHRoZSBpbnRlZ2VyIHZhbHVlIG90aGVyd2lzZS4gV2hlbiBgbGVuYCBpcyBnaXZlbiwgdGhpc1xuLy8gd2lsbCByZXR1cm4gYG51bGxgIHVubGVzcyB0aGUgaW50ZWdlciBoYXMgZXhhY3RseSBgbGVuYCBkaWdpdHMuXG5cbnBwLnJlYWRJbnQgPSBmdW5jdGlvbihyYWRpeCwgbGVuLCBtYXliZUxlZ2FjeU9jdGFsTnVtZXJpY0xpdGVyYWwpIHtcbiAgLy8gYGxlbmAgaXMgdXNlZCBmb3IgY2hhcmFjdGVyIGVzY2FwZSBzZXF1ZW5jZXMuIEluIHRoYXQgY2FzZSwgZGlzYWxsb3cgc2VwYXJhdG9ycy5cbiAgdmFyIGFsbG93U2VwYXJhdG9ycyA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMiAmJiBsZW4gPT09IHVuZGVmaW5lZDtcblxuICAvLyBgbWF5YmVMZWdhY3lPY3RhbE51bWVyaWNMaXRlcmFsYCBpcyB0cnVlIGlmIGl0IGRvZXNuJ3QgaGF2ZSBwcmVmaXggKDB4LDBvLDBiKVxuICAvLyBhbmQgaXNuJ3QgZnJhY3Rpb24gcGFydCBub3IgZXhwb25lbnQgcGFydC4gSW4gdGhhdCBjYXNlLCBpZiB0aGUgZmlyc3QgZGlnaXRcbiAgLy8gaXMgemVybyB0aGVuIGRpc2FsbG93IHNlcGFyYXRvcnMuXG4gIHZhciBpc0xlZ2FjeU9jdGFsTnVtZXJpY0xpdGVyYWwgPSBtYXliZUxlZ2FjeU9jdGFsTnVtZXJpY0xpdGVyYWwgJiYgdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKSA9PT0gNDg7XG5cbiAgdmFyIHN0YXJ0ID0gdGhpcy5wb3MsIHRvdGFsID0gMCwgbGFzdENvZGUgPSAwO1xuICBmb3IgKHZhciBpID0gMCwgZSA9IGxlbiA9PSBudWxsID8gSW5maW5pdHkgOiBsZW47IGkgPCBlOyArK2ksICsrdGhpcy5wb3MpIHtcbiAgICB2YXIgY29kZSA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyksIHZhbCA9ICh2b2lkIDApO1xuXG4gICAgaWYgKGFsbG93U2VwYXJhdG9ycyAmJiBjb2RlID09PSA5NSkge1xuICAgICAgaWYgKGlzTGVnYWN5T2N0YWxOdW1lcmljTGl0ZXJhbCkgeyB0aGlzLnJhaXNlUmVjb3ZlcmFibGUodGhpcy5wb3MsIFwiTnVtZXJpYyBzZXBhcmF0b3IgaXMgbm90IGFsbG93ZWQgaW4gbGVnYWN5IG9jdGFsIG51bWVyaWMgbGl0ZXJhbHNcIik7IH1cbiAgICAgIGlmIChsYXN0Q29kZSA9PT0gOTUpIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMucG9zLCBcIk51bWVyaWMgc2VwYXJhdG9yIG11c3QgYmUgZXhhY3RseSBvbmUgdW5kZXJzY29yZVwiKTsgfVxuICAgICAgaWYgKGkgPT09IDApIHsgdGhpcy5yYWlzZVJlY292ZXJhYmxlKHRoaXMucG9zLCBcIk51bWVyaWMgc2VwYXJhdG9yIGlzIG5vdCBhbGxvd2VkIGF0IHRoZSBmaXJzdCBvZiBkaWdpdHNcIik7IH1cbiAgICAgIGxhc3RDb2RlID0gY29kZTtcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgaWYgKGNvZGUgPj0gOTcpIHsgdmFsID0gY29kZSAtIDk3ICsgMTA7IH0gLy8gYVxuICAgIGVsc2UgaWYgKGNvZGUgPj0gNjUpIHsgdmFsID0gY29kZSAtIDY1ICsgMTA7IH0gLy8gQVxuICAgIGVsc2UgaWYgKGNvZGUgPj0gNDggJiYgY29kZSA8PSA1NykgeyB2YWwgPSBjb2RlIC0gNDg7IH0gLy8gMC05XG4gICAgZWxzZSB7IHZhbCA9IEluZmluaXR5OyB9XG4gICAgaWYgKHZhbCA+PSByYWRpeCkgeyBicmVhayB9XG4gICAgbGFzdENvZGUgPSBjb2RlO1xuICAgIHRvdGFsID0gdG90YWwgKiByYWRpeCArIHZhbDtcbiAgfVxuXG4gIGlmIChhbGxvd1NlcGFyYXRvcnMgJiYgbGFzdENvZGUgPT09IDk1KSB7IHRoaXMucmFpc2VSZWNvdmVyYWJsZSh0aGlzLnBvcyAtIDEsIFwiTnVtZXJpYyBzZXBhcmF0b3IgaXMgbm90IGFsbG93ZWQgYXQgdGhlIGxhc3Qgb2YgZGlnaXRzXCIpOyB9XG4gIGlmICh0aGlzLnBvcyA9PT0gc3RhcnQgfHwgbGVuICE9IG51bGwgJiYgdGhpcy5wb3MgLSBzdGFydCAhPT0gbGVuKSB7IHJldHVybiBudWxsIH1cblxuICByZXR1cm4gdG90YWxcbn07XG5cbmZ1bmN0aW9uIHN0cmluZ1RvTnVtYmVyKHN0ciwgaXNMZWdhY3lPY3RhbE51bWVyaWNMaXRlcmFsKSB7XG4gIGlmIChpc0xlZ2FjeU9jdGFsTnVtZXJpY0xpdGVyYWwpIHtcbiAgICByZXR1cm4gcGFyc2VJbnQoc3RyLCA4KVxuICB9XG5cbiAgLy8gYHBhcnNlRmxvYXQodmFsdWUpYCBzdG9wcyBwYXJzaW5nIGF0IHRoZSBmaXJzdCBudW1lcmljIHNlcGFyYXRvciB0aGVuIHJldHVybnMgYSB3cm9uZyB2YWx1ZS5cbiAgcmV0dXJuIHBhcnNlRmxvYXQoc3RyLnJlcGxhY2UoL18vZywgXCJcIikpXG59XG5cbmZ1bmN0aW9uIHN0cmluZ1RvQmlnSW50KHN0cikge1xuICBpZiAodHlwZW9mIEJpZ0ludCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8vIGBCaWdJbnQodmFsdWUpYCB0aHJvd3Mgc3ludGF4IGVycm9yIGlmIHRoZSBzdHJpbmcgY29udGFpbnMgbnVtZXJpYyBzZXBhcmF0b3JzLlxuICByZXR1cm4gQmlnSW50KHN0ci5yZXBsYWNlKC9fL2csIFwiXCIpKVxufVxuXG5wcC5yZWFkUmFkaXhOdW1iZXIgPSBmdW5jdGlvbihyYWRpeCkge1xuICB2YXIgc3RhcnQgPSB0aGlzLnBvcztcbiAgdGhpcy5wb3MgKz0gMjsgLy8gMHhcbiAgdmFyIHZhbCA9IHRoaXMucmVhZEludChyYWRpeCk7XG4gIGlmICh2YWwgPT0gbnVsbCkgeyB0aGlzLnJhaXNlKHRoaXMuc3RhcnQgKyAyLCBcIkV4cGVjdGVkIG51bWJlciBpbiByYWRpeCBcIiArIHJhZGl4KTsgfVxuICBpZiAodGhpcy5vcHRpb25zLmVjbWFWZXJzaW9uID49IDExICYmIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcykgPT09IDExMCkge1xuICAgIHZhbCA9IHN0cmluZ1RvQmlnSW50KHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQsIHRoaXMucG9zKSk7XG4gICAgKyt0aGlzLnBvcztcbiAgfSBlbHNlIGlmIChpc0lkZW50aWZpZXJTdGFydCh0aGlzLmZ1bGxDaGFyQ29kZUF0UG9zKCkpKSB7IHRoaXMucmFpc2UodGhpcy5wb3MsIFwiSWRlbnRpZmllciBkaXJlY3RseSBhZnRlciBudW1iZXJcIik7IH1cbiAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5udW0sIHZhbClcbn07XG5cbi8vIFJlYWQgYW4gaW50ZWdlciwgb2N0YWwgaW50ZWdlciwgb3IgZmxvYXRpbmctcG9pbnQgbnVtYmVyLlxuXG5wcC5yZWFkTnVtYmVyID0gZnVuY3Rpb24oc3RhcnRzV2l0aERvdCkge1xuICB2YXIgc3RhcnQgPSB0aGlzLnBvcztcbiAgaWYgKCFzdGFydHNXaXRoRG90ICYmIHRoaXMucmVhZEludCgxMCwgdW5kZWZpbmVkLCB0cnVlKSA9PT0gbnVsbCkgeyB0aGlzLnJhaXNlKHN0YXJ0LCBcIkludmFsaWQgbnVtYmVyXCIpOyB9XG4gIHZhciBvY3RhbCA9IHRoaXMucG9zIC0gc3RhcnQgPj0gMiAmJiB0aGlzLmlucHV0LmNoYXJDb2RlQXQoc3RhcnQpID09PSA0ODtcbiAgaWYgKG9jdGFsICYmIHRoaXMuc3RyaWN0KSB7IHRoaXMucmFpc2Uoc3RhcnQsIFwiSW52YWxpZCBudW1iZXJcIik7IH1cbiAgdmFyIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpO1xuICBpZiAoIW9jdGFsICYmICFzdGFydHNXaXRoRG90ICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSAxMSAmJiBuZXh0ID09PSAxMTApIHtcbiAgICB2YXIgdmFsJDEgPSBzdHJpbmdUb0JpZ0ludCh0aGlzLmlucHV0LnNsaWNlKHN0YXJ0LCB0aGlzLnBvcykpO1xuICAgICsrdGhpcy5wb3M7XG4gICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KHRoaXMuZnVsbENoYXJDb2RlQXRQb3MoKSkpIHsgdGhpcy5yYWlzZSh0aGlzLnBvcywgXCJJZGVudGlmaWVyIGRpcmVjdGx5IGFmdGVyIG51bWJlclwiKTsgfVxuICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEubnVtLCB2YWwkMSlcbiAgfVxuICBpZiAob2N0YWwgJiYgL1s4OV0vLnRlc3QodGhpcy5pbnB1dC5zbGljZShzdGFydCwgdGhpcy5wb3MpKSkgeyBvY3RhbCA9IGZhbHNlOyB9XG4gIGlmIChuZXh0ID09PSA0NiAmJiAhb2N0YWwpIHsgLy8gJy4nXG4gICAgKyt0aGlzLnBvcztcbiAgICB0aGlzLnJlYWRJbnQoMTApO1xuICAgIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpO1xuICB9XG4gIGlmICgobmV4dCA9PT0gNjkgfHwgbmV4dCA9PT0gMTAxKSAmJiAhb2N0YWwpIHsgLy8gJ2VFJ1xuICAgIG5leHQgPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQoKyt0aGlzLnBvcyk7XG4gICAgaWYgKG5leHQgPT09IDQzIHx8IG5leHQgPT09IDQ1KSB7ICsrdGhpcy5wb3M7IH0gLy8gJystJ1xuICAgIGlmICh0aGlzLnJlYWRJbnQoMTApID09PSBudWxsKSB7IHRoaXMucmFpc2Uoc3RhcnQsIFwiSW52YWxpZCBudW1iZXJcIik7IH1cbiAgfVxuICBpZiAoaXNJZGVudGlmaWVyU3RhcnQodGhpcy5mdWxsQ2hhckNvZGVBdFBvcygpKSkgeyB0aGlzLnJhaXNlKHRoaXMucG9zLCBcIklkZW50aWZpZXIgZGlyZWN0bHkgYWZ0ZXIgbnVtYmVyXCIpOyB9XG5cbiAgdmFyIHZhbCA9IHN0cmluZ1RvTnVtYmVyKHRoaXMuaW5wdXQuc2xpY2Uoc3RhcnQsIHRoaXMucG9zKSwgb2N0YWwpO1xuICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLm51bSwgdmFsKVxufTtcblxuLy8gUmVhZCBhIHN0cmluZyB2YWx1ZSwgaW50ZXJwcmV0aW5nIGJhY2tzbGFzaC1lc2NhcGVzLlxuXG5wcC5yZWFkQ29kZVBvaW50ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjaCA9IHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyksIGNvZGU7XG5cbiAgaWYgKGNoID09PSAxMjMpIHsgLy8gJ3snXG4gICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDYpIHsgdGhpcy51bmV4cGVjdGVkKCk7IH1cbiAgICB2YXIgY29kZVBvcyA9ICsrdGhpcy5wb3M7XG4gICAgY29kZSA9IHRoaXMucmVhZEhleENoYXIodGhpcy5pbnB1dC5pbmRleE9mKFwifVwiLCB0aGlzLnBvcykgLSB0aGlzLnBvcyk7XG4gICAgKyt0aGlzLnBvcztcbiAgICBpZiAoY29kZSA+IDB4MTBGRkZGKSB7IHRoaXMuaW52YWxpZFN0cmluZ1Rva2VuKGNvZGVQb3MsIFwiQ29kZSBwb2ludCBvdXQgb2YgYm91bmRzXCIpOyB9XG4gIH0gZWxzZSB7XG4gICAgY29kZSA9IHRoaXMucmVhZEhleENoYXIoNCk7XG4gIH1cbiAgcmV0dXJuIGNvZGVcbn07XG5cbnBwLnJlYWRTdHJpbmcgPSBmdW5jdGlvbihxdW90ZSkge1xuICB2YXIgb3V0ID0gXCJcIiwgY2h1bmtTdGFydCA9ICsrdGhpcy5wb3M7XG4gIGZvciAoOzspIHtcbiAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5pbnB1dC5sZW5ndGgpIHsgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIlVudGVybWluYXRlZCBzdHJpbmcgY29uc3RhbnRcIik7IH1cbiAgICB2YXIgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpO1xuICAgIGlmIChjaCA9PT0gcXVvdGUpIHsgYnJlYWsgfVxuICAgIGlmIChjaCA9PT0gOTIpIHsgLy8gJ1xcJ1xuICAgICAgb3V0ICs9IHRoaXMuaW5wdXQuc2xpY2UoY2h1bmtTdGFydCwgdGhpcy5wb3MpO1xuICAgICAgb3V0ICs9IHRoaXMucmVhZEVzY2FwZWRDaGFyKGZhbHNlKTtcbiAgICAgIGNodW5rU3RhcnQgPSB0aGlzLnBvcztcbiAgICB9IGVsc2UgaWYgKGNoID09PSAweDIwMjggfHwgY2ggPT09IDB4MjAyOSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA8IDEwKSB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50XCIpOyB9XG4gICAgICArK3RoaXMucG9zO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2NhdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jdXJMaW5lKys7XG4gICAgICAgIHRoaXMubGluZVN0YXJ0ID0gdGhpcy5wb3M7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpc05ld0xpbmUoY2gpKSB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50XCIpOyB9XG4gICAgICArK3RoaXMucG9zO1xuICAgIH1cbiAgfVxuICBvdXQgKz0gdGhpcy5pbnB1dC5zbGljZShjaHVua1N0YXJ0LCB0aGlzLnBvcysrKTtcbiAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5zdHJpbmcsIG91dClcbn07XG5cbi8vIFJlYWRzIHRlbXBsYXRlIHN0cmluZyB0b2tlbnMuXG5cbnZhciBJTlZBTElEX1RFTVBMQVRFX0VTQ0FQRV9FUlJPUiA9IHt9O1xuXG5wcC50cnlSZWFkVGVtcGxhdGVUb2tlbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmluVGVtcGxhdGVFbGVtZW50ID0gdHJ1ZTtcbiAgdHJ5IHtcbiAgICB0aGlzLnJlYWRUbXBsVG9rZW4oKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciA9PT0gSU5WQUxJRF9URU1QTEFURV9FU0NBUEVfRVJST1IpIHtcbiAgICAgIHRoaXMucmVhZEludmFsaWRUZW1wbGF0ZVRva2VuKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGVyclxuICAgIH1cbiAgfVxuXG4gIHRoaXMuaW5UZW1wbGF0ZUVsZW1lbnQgPSBmYWxzZTtcbn07XG5cbnBwLmludmFsaWRTdHJpbmdUb2tlbiA9IGZ1bmN0aW9uKHBvc2l0aW9uLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLmluVGVtcGxhdGVFbGVtZW50ICYmIHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA5KSB7XG4gICAgdGhyb3cgSU5WQUxJRF9URU1QTEFURV9FU0NBUEVfRVJST1JcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnJhaXNlKHBvc2l0aW9uLCBtZXNzYWdlKTtcbiAgfVxufTtcblxucHAucmVhZFRtcGxUb2tlbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgb3V0ID0gXCJcIiwgY2h1bmtTdGFydCA9IHRoaXMucG9zO1xuICBmb3IgKDs7KSB7XG4gICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7IHRoaXMucmFpc2UodGhpcy5zdGFydCwgXCJVbnRlcm1pbmF0ZWQgdGVtcGxhdGVcIik7IH1cbiAgICB2YXIgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpO1xuICAgIGlmIChjaCA9PT0gOTYgfHwgY2ggPT09IDM2ICYmIHRoaXMuaW5wdXQuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpID09PSAxMjMpIHsgLy8gJ2AnLCAnJHsnXG4gICAgICBpZiAodGhpcy5wb3MgPT09IHRoaXMuc3RhcnQgJiYgKHRoaXMudHlwZSA9PT0gdHlwZXMkMS50ZW1wbGF0ZSB8fCB0aGlzLnR5cGUgPT09IHR5cGVzJDEuaW52YWxpZFRlbXBsYXRlKSkge1xuICAgICAgICBpZiAoY2ggPT09IDM2KSB7XG4gICAgICAgICAgdGhpcy5wb3MgKz0gMjtcbiAgICAgICAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLmRvbGxhckJyYWNlTClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICArK3RoaXMucG9zO1xuICAgICAgICAgIHJldHVybiB0aGlzLmZpbmlzaFRva2VuKHR5cGVzJDEuYmFja1F1b3RlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvdXQgKz0gdGhpcy5pbnB1dC5zbGljZShjaHVua1N0YXJ0LCB0aGlzLnBvcyk7XG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlcyQxLnRlbXBsYXRlLCBvdXQpXG4gICAgfVxuICAgIGlmIChjaCA9PT0gOTIpIHsgLy8gJ1xcJ1xuICAgICAgb3V0ICs9IHRoaXMuaW5wdXQuc2xpY2UoY2h1bmtTdGFydCwgdGhpcy5wb3MpO1xuICAgICAgb3V0ICs9IHRoaXMucmVhZEVzY2FwZWRDaGFyKHRydWUpO1xuICAgICAgY2h1bmtTdGFydCA9IHRoaXMucG9zO1xuICAgIH0gZWxzZSBpZiAoaXNOZXdMaW5lKGNoKSkge1xuICAgICAgb3V0ICs9IHRoaXMuaW5wdXQuc2xpY2UoY2h1bmtTdGFydCwgdGhpcy5wb3MpO1xuICAgICAgKyt0aGlzLnBvcztcbiAgICAgIHN3aXRjaCAoY2gpIHtcbiAgICAgIGNhc2UgMTM6XG4gICAgICAgIGlmICh0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpID09PSAxMCkgeyArK3RoaXMucG9zOyB9XG4gICAgICBjYXNlIDEwOlxuICAgICAgICBvdXQgKz0gXCJcXG5cIjtcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG91dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKTtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7XG4gICAgICAgICsrdGhpcy5jdXJMaW5lO1xuICAgICAgICB0aGlzLmxpbmVTdGFydCA9IHRoaXMucG9zO1xuICAgICAgfVxuICAgICAgY2h1bmtTdGFydCA9IHRoaXMucG9zO1xuICAgIH0gZWxzZSB7XG4gICAgICArK3RoaXMucG9zO1xuICAgIH1cbiAgfVxufTtcblxuLy8gUmVhZHMgYSB0ZW1wbGF0ZSB0b2tlbiB0byBzZWFyY2ggZm9yIHRoZSBlbmQsIHdpdGhvdXQgdmFsaWRhdGluZyBhbnkgZXNjYXBlIHNlcXVlbmNlc1xucHAucmVhZEludmFsaWRUZW1wbGF0ZVRva2VuID0gZnVuY3Rpb24oKSB7XG4gIGZvciAoOyB0aGlzLnBvcyA8IHRoaXMuaW5wdXQubGVuZ3RoOyB0aGlzLnBvcysrKSB7XG4gICAgc3dpdGNoICh0aGlzLmlucHV0W3RoaXMucG9zXSkge1xuICAgIGNhc2UgXCJcXFxcXCI6XG4gICAgICArK3RoaXMucG9zO1xuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCIkXCI6XG4gICAgICBpZiAodGhpcy5pbnB1dFt0aGlzLnBvcyArIDFdICE9PSBcIntcIikgeyBicmVhayB9XG4gICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICBjYXNlIFwiYFwiOlxuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoVG9rZW4odHlwZXMkMS5pbnZhbGlkVGVtcGxhdGUsIHRoaXMuaW5wdXQuc2xpY2UodGhpcy5zdGFydCwgdGhpcy5wb3MpKVxuXG4gICAgY2FzZSBcIlxcclwiOlxuICAgICAgaWYgKHRoaXMuaW5wdXRbdGhpcy5wb3MgKyAxXSA9PT0gXCJcXG5cIikgeyArK3RoaXMucG9zOyB9XG4gICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICBjYXNlIFwiXFxuXCI6IGNhc2UgXCJcXHUyMDI4XCI6IGNhc2UgXCJcXHUyMDI5XCI6XG4gICAgICArK3RoaXMuY3VyTGluZTtcbiAgICAgIHRoaXMubGluZVN0YXJ0ID0gdGhpcy5wb3MgKyAxO1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgdGhpcy5yYWlzZSh0aGlzLnN0YXJ0LCBcIlVudGVybWluYXRlZCB0ZW1wbGF0ZVwiKTtcbn07XG5cbi8vIFVzZWQgdG8gcmVhZCBlc2NhcGVkIGNoYXJhY3RlcnNcblxucHAucmVhZEVzY2FwZWRDaGFyID0gZnVuY3Rpb24oaW5UZW1wbGF0ZSkge1xuICB2YXIgY2ggPSB0aGlzLmlucHV0LmNoYXJDb2RlQXQoKyt0aGlzLnBvcyk7XG4gICsrdGhpcy5wb3M7XG4gIHN3aXRjaCAoY2gpIHtcbiAgY2FzZSAxMTA6IHJldHVybiBcIlxcblwiIC8vICduJyAtPiAnXFxuJ1xuICBjYXNlIDExNDogcmV0dXJuIFwiXFxyXCIgLy8gJ3InIC0+ICdcXHInXG4gIGNhc2UgMTIwOiByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSh0aGlzLnJlYWRIZXhDaGFyKDIpKSAvLyAneCdcbiAgY2FzZSAxMTc6IHJldHVybiBjb2RlUG9pbnRUb1N0cmluZyh0aGlzLnJlYWRDb2RlUG9pbnQoKSkgLy8gJ3UnXG4gIGNhc2UgMTE2OiByZXR1cm4gXCJcXHRcIiAvLyAndCcgLT4gJ1xcdCdcbiAgY2FzZSA5ODogcmV0dXJuIFwiXFxiXCIgLy8gJ2InIC0+ICdcXGInXG4gIGNhc2UgMTE4OiByZXR1cm4gXCJcXHUwMDBiXCIgLy8gJ3YnIC0+ICdcXHUwMDBiJ1xuICBjYXNlIDEwMjogcmV0dXJuIFwiXFxmXCIgLy8gJ2YnIC0+ICdcXGYnXG4gIGNhc2UgMTM6IGlmICh0aGlzLmlucHV0LmNoYXJDb2RlQXQodGhpcy5wb3MpID09PSAxMCkgeyArK3RoaXMucG9zOyB9IC8vICdcXHJcXG4nXG4gIGNhc2UgMTA6IC8vICcgXFxuJ1xuICAgIGlmICh0aGlzLm9wdGlvbnMubG9jYXRpb25zKSB7IHRoaXMubGluZVN0YXJ0ID0gdGhpcy5wb3M7ICsrdGhpcy5jdXJMaW5lOyB9XG4gICAgcmV0dXJuIFwiXCJcbiAgY2FzZSA1NjpcbiAgY2FzZSA1NzpcbiAgICBpZiAodGhpcy5zdHJpY3QpIHtcbiAgICAgIHRoaXMuaW52YWxpZFN0cmluZ1Rva2VuKFxuICAgICAgICB0aGlzLnBvcyAtIDEsXG4gICAgICAgIFwiSW52YWxpZCBlc2NhcGUgc2VxdWVuY2VcIlxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGluVGVtcGxhdGUpIHtcbiAgICAgIHZhciBjb2RlUG9zID0gdGhpcy5wb3MgLSAxO1xuXG4gICAgICB0aGlzLmludmFsaWRTdHJpbmdUb2tlbihcbiAgICAgICAgY29kZVBvcyxcbiAgICAgICAgXCJJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZSBpbiB0ZW1wbGF0ZSBzdHJpbmdcIlxuICAgICAgKTtcbiAgICB9XG4gIGRlZmF1bHQ6XG4gICAgaWYgKGNoID49IDQ4ICYmIGNoIDw9IDU1KSB7XG4gICAgICB2YXIgb2N0YWxTdHIgPSB0aGlzLmlucHV0LnN1YnN0cih0aGlzLnBvcyAtIDEsIDMpLm1hdGNoKC9eWzAtN10rLylbMF07XG4gICAgICB2YXIgb2N0YWwgPSBwYXJzZUludChvY3RhbFN0ciwgOCk7XG4gICAgICBpZiAob2N0YWwgPiAyNTUpIHtcbiAgICAgICAgb2N0YWxTdHIgPSBvY3RhbFN0ci5zbGljZSgwLCAtMSk7XG4gICAgICAgIG9jdGFsID0gcGFyc2VJbnQob2N0YWxTdHIsIDgpO1xuICAgICAgfVxuICAgICAgdGhpcy5wb3MgKz0gb2N0YWxTdHIubGVuZ3RoIC0gMTtcbiAgICAgIGNoID0gdGhpcy5pbnB1dC5jaGFyQ29kZUF0KHRoaXMucG9zKTtcbiAgICAgIGlmICgob2N0YWxTdHIgIT09IFwiMFwiIHx8IGNoID09PSA1NiB8fCBjaCA9PT0gNTcpICYmICh0aGlzLnN0cmljdCB8fCBpblRlbXBsYXRlKSkge1xuICAgICAgICB0aGlzLmludmFsaWRTdHJpbmdUb2tlbihcbiAgICAgICAgICB0aGlzLnBvcyAtIDEgLSBvY3RhbFN0ci5sZW5ndGgsXG4gICAgICAgICAgaW5UZW1wbGF0ZVxuICAgICAgICAgICAgPyBcIk9jdGFsIGxpdGVyYWwgaW4gdGVtcGxhdGUgc3RyaW5nXCJcbiAgICAgICAgICAgIDogXCJPY3RhbCBsaXRlcmFsIGluIHN0cmljdCBtb2RlXCJcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKG9jdGFsKVxuICAgIH1cbiAgICBpZiAoaXNOZXdMaW5lKGNoKSkge1xuICAgICAgLy8gVW5pY29kZSBuZXcgbGluZSBjaGFyYWN0ZXJzIGFmdGVyIFxcIGdldCByZW1vdmVkIGZyb20gb3V0cHV0IGluIGJvdGhcbiAgICAgIC8vIHRlbXBsYXRlIGxpdGVyYWxzIGFuZCBzdHJpbmdzXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvY2F0aW9ucykgeyB0aGlzLmxpbmVTdGFydCA9IHRoaXMucG9zOyArK3RoaXMuY3VyTGluZTsgfVxuICAgICAgcmV0dXJuIFwiXCJcbiAgICB9XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY2gpXG4gIH1cbn07XG5cbi8vIFVzZWQgdG8gcmVhZCBjaGFyYWN0ZXIgZXNjYXBlIHNlcXVlbmNlcyAoJ1xceCcsICdcXHUnLCAnXFxVJykuXG5cbnBwLnJlYWRIZXhDaGFyID0gZnVuY3Rpb24obGVuKSB7XG4gIHZhciBjb2RlUG9zID0gdGhpcy5wb3M7XG4gIHZhciBuID0gdGhpcy5yZWFkSW50KDE2LCBsZW4pO1xuICBpZiAobiA9PT0gbnVsbCkgeyB0aGlzLmludmFsaWRTdHJpbmdUb2tlbihjb2RlUG9zLCBcIkJhZCBjaGFyYWN0ZXIgZXNjYXBlIHNlcXVlbmNlXCIpOyB9XG4gIHJldHVybiBuXG59O1xuXG4vLyBSZWFkIGFuIGlkZW50aWZpZXIsIGFuZCByZXR1cm4gaXQgYXMgYSBzdHJpbmcuIFNldHMgYHRoaXMuY29udGFpbnNFc2NgXG4vLyB0byB3aGV0aGVyIHRoZSB3b3JkIGNvbnRhaW5lZCBhICdcXHUnIGVzY2FwZS5cbi8vXG4vLyBJbmNyZW1lbnRhbGx5IGFkZHMgb25seSBlc2NhcGVkIGNoYXJzLCBhZGRpbmcgb3RoZXIgY2h1bmtzIGFzLWlzXG4vLyBhcyBhIG1pY3JvLW9wdGltaXphdGlvbi5cblxucHAucmVhZFdvcmQxID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY29udGFpbnNFc2MgPSBmYWxzZTtcbiAgdmFyIHdvcmQgPSBcIlwiLCBmaXJzdCA9IHRydWUsIGNodW5rU3RhcnQgPSB0aGlzLnBvcztcbiAgdmFyIGFzdHJhbCA9IHRoaXMub3B0aW9ucy5lY21hVmVyc2lvbiA+PSA2O1xuICB3aGlsZSAodGhpcy5wb3MgPCB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgIHZhciBjaCA9IHRoaXMuZnVsbENoYXJDb2RlQXRQb3MoKTtcbiAgICBpZiAoaXNJZGVudGlmaWVyQ2hhcihjaCwgYXN0cmFsKSkge1xuICAgICAgdGhpcy5wb3MgKz0gY2ggPD0gMHhmZmZmID8gMSA6IDI7XG4gICAgfSBlbHNlIGlmIChjaCA9PT0gOTIpIHsgLy8gXCJcXFwiXG4gICAgICB0aGlzLmNvbnRhaW5zRXNjID0gdHJ1ZTtcbiAgICAgIHdvcmQgKz0gdGhpcy5pbnB1dC5zbGljZShjaHVua1N0YXJ0LCB0aGlzLnBvcyk7XG4gICAgICB2YXIgZXNjU3RhcnQgPSB0aGlzLnBvcztcbiAgICAgIGlmICh0aGlzLmlucHV0LmNoYXJDb2RlQXQoKyt0aGlzLnBvcykgIT09IDExNykgLy8gXCJ1XCJcbiAgICAgICAgeyB0aGlzLmludmFsaWRTdHJpbmdUb2tlbih0aGlzLnBvcywgXCJFeHBlY3RpbmcgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UgXFxcXHVYWFhYXCIpOyB9XG4gICAgICArK3RoaXMucG9zO1xuICAgICAgdmFyIGVzYyA9IHRoaXMucmVhZENvZGVQb2ludCgpO1xuICAgICAgaWYgKCEoZmlyc3QgPyBpc0lkZW50aWZpZXJTdGFydCA6IGlzSWRlbnRpZmllckNoYXIpKGVzYywgYXN0cmFsKSlcbiAgICAgICAgeyB0aGlzLmludmFsaWRTdHJpbmdUb2tlbihlc2NTdGFydCwgXCJJbnZhbGlkIFVuaWNvZGUgZXNjYXBlXCIpOyB9XG4gICAgICB3b3JkICs9IGNvZGVQb2ludFRvU3RyaW5nKGVzYyk7XG4gICAgICBjaHVua1N0YXJ0ID0gdGhpcy5wb3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGZpcnN0ID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHdvcmQgKyB0aGlzLmlucHV0LnNsaWNlKGNodW5rU3RhcnQsIHRoaXMucG9zKVxufTtcblxuLy8gUmVhZCBhbiBpZGVudGlmaWVyIG9yIGtleXdvcmQgdG9rZW4uIFdpbGwgY2hlY2sgZm9yIHJlc2VydmVkXG4vLyB3b3JkcyB3aGVuIG5lY2Vzc2FyeS5cblxucHAucmVhZFdvcmQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHdvcmQgPSB0aGlzLnJlYWRXb3JkMSgpO1xuICB2YXIgdHlwZSA9IHR5cGVzJDEubmFtZTtcbiAgaWYgKHRoaXMua2V5d29yZHMudGVzdCh3b3JkKSkge1xuICAgIHR5cGUgPSBrZXl3b3Jkc1t3b3JkXTtcbiAgfVxuICByZXR1cm4gdGhpcy5maW5pc2hUb2tlbih0eXBlLCB3b3JkKVxufTtcblxuLy8gQWNvcm4gaXMgYSB0aW55LCBmYXN0IEphdmFTY3JpcHQgcGFyc2VyIHdyaXR0ZW4gaW4gSmF2YVNjcmlwdC5cbi8vXG4vLyBBY29ybiB3YXMgd3JpdHRlbiBieSBNYXJpam4gSGF2ZXJiZWtlLCBJbmd2YXIgU3RlcGFueWFuLCBhbmRcbi8vIHZhcmlvdXMgY29udHJpYnV0b3JzIGFuZCByZWxlYXNlZCB1bmRlciBhbiBNSVQgbGljZW5zZS5cbi8vXG4vLyBHaXQgcmVwb3NpdG9yaWVzIGZvciBBY29ybiBhcmUgYXZhaWxhYmxlIGF0XG4vL1xuLy8gICAgIGh0dHA6Ly9tYXJpam5oYXZlcmJla2UubmwvZ2l0L2Fjb3JuXG4vLyAgICAgaHR0cHM6Ly9naXRodWIuY29tL2Fjb3JuanMvYWNvcm4uZ2l0XG4vL1xuLy8gUGxlYXNlIHVzZSB0aGUgW2dpdGh1YiBidWcgdHJhY2tlcl1bZ2hidF0gdG8gcmVwb3J0IGlzc3Vlcy5cbi8vXG4vLyBbZ2hidF06IGh0dHBzOi8vZ2l0aHViLmNvbS9hY29ybmpzL2Fjb3JuL2lzc3Vlc1xuXG5cbnZhciB2ZXJzaW9uID0gXCI4LjE2LjBcIjtcblxuUGFyc2VyLmFjb3JuID0ge1xuICBQYXJzZXI6IFBhcnNlcixcbiAgdmVyc2lvbjogdmVyc2lvbixcbiAgZGVmYXVsdE9wdGlvbnM6IGRlZmF1bHRPcHRpb25zLFxuICBQb3NpdGlvbjogUG9zaXRpb24sXG4gIFNvdXJjZUxvY2F0aW9uOiBTb3VyY2VMb2NhdGlvbixcbiAgZ2V0TGluZUluZm86IGdldExpbmVJbmZvLFxuICBOb2RlOiBOb2RlLFxuICBUb2tlblR5cGU6IFRva2VuVHlwZSxcbiAgdG9rVHlwZXM6IHR5cGVzJDEsXG4gIGtleXdvcmRUeXBlczoga2V5d29yZHMsXG4gIFRva0NvbnRleHQ6IFRva0NvbnRleHQsXG4gIHRva0NvbnRleHRzOiB0eXBlcyxcbiAgaXNJZGVudGlmaWVyQ2hhcjogaXNJZGVudGlmaWVyQ2hhcixcbiAgaXNJZGVudGlmaWVyU3RhcnQ6IGlzSWRlbnRpZmllclN0YXJ0LFxuICBUb2tlbjogVG9rZW4sXG4gIGlzTmV3TGluZTogaXNOZXdMaW5lLFxuICBsaW5lQnJlYWs6IGxpbmVCcmVhayxcbiAgbGluZUJyZWFrRzogbGluZUJyZWFrRyxcbiAgbm9uQVNDSUl3aGl0ZXNwYWNlOiBub25BU0NJSXdoaXRlc3BhY2Vcbn07XG5cbi8vIFRoZSBtYWluIGV4cG9ydGVkIGludGVyZmFjZSAodW5kZXIgYHNlbGYuYWNvcm5gIHdoZW4gaW4gdGhlXG4vLyBicm93c2VyKSBpcyBhIGBwYXJzZWAgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIGNvZGUgc3RyaW5nIGFuZCByZXR1cm5zXG4vLyBhbiBhYnN0cmFjdCBzeW50YXggdHJlZSBhcyBzcGVjaWZpZWQgYnkgdGhlIFtFU1RyZWUgc3BlY11bZXN0cmVlXS5cbi8vXG4vLyBbZXN0cmVlXTogaHR0cHM6Ly9naXRodWIuY29tL2VzdHJlZS9lc3RyZWVcblxuZnVuY3Rpb24gcGFyc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIFBhcnNlci5wYXJzZShpbnB1dCwgb3B0aW9ucylcbn1cblxuLy8gVGhpcyBmdW5jdGlvbiB0cmllcyB0byBwYXJzZSBhIHNpbmdsZSBleHByZXNzaW9uIGF0IGEgZ2l2ZW5cbi8vIG9mZnNldCBpbiBhIHN0cmluZy4gVXNlZnVsIGZvciBwYXJzaW5nIG1peGVkLWxhbmd1YWdlIGZvcm1hdHNcbi8vIHRoYXQgZW1iZWQgSmF2YVNjcmlwdCBleHByZXNzaW9ucy5cblxuZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uQXQoaW5wdXQsIHBvcywgb3B0aW9ucykge1xuICByZXR1cm4gUGFyc2VyLnBhcnNlRXhwcmVzc2lvbkF0KGlucHV0LCBwb3MsIG9wdGlvbnMpXG59XG5cbi8vIEFjb3JuIGlzIG9yZ2FuaXplZCBhcyBhIHRva2VuaXplciBhbmQgYSByZWN1cnNpdmUtZGVzY2VudCBwYXJzZXIuXG4vLyBUaGUgYHRva2VuaXplcmAgZXhwb3J0IHByb3ZpZGVzIGFuIGludGVyZmFjZSB0byB0aGUgdG9rZW5pemVyLlxuXG5mdW5jdGlvbiB0b2tlbml6ZXIoaW5wdXQsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIFBhcnNlci50b2tlbml6ZXIoaW5wdXQsIG9wdGlvbnMpXG59XG5cbmV4cG9ydCB7IE5vZGUsIFBhcnNlciwgUG9zaXRpb24sIFNvdXJjZUxvY2F0aW9uLCBUb2tDb250ZXh0LCBUb2tlbiwgVG9rZW5UeXBlLCBkZWZhdWx0T3B0aW9ucywgZ2V0TGluZUluZm8sIGlzSWRlbnRpZmllckNoYXIsIGlzSWRlbnRpZmllclN0YXJ0LCBpc05ld0xpbmUsIGtleXdvcmRzIGFzIGtleXdvcmRUeXBlcywgbGluZUJyZWFrLCBsaW5lQnJlYWtHLCBub25BU0NJSXdoaXRlc3BhY2UsIHBhcnNlLCBwYXJzZUV4cHJlc3Npb25BdCwgdHlwZXMgYXMgdG9rQ29udGV4dHMsIHR5cGVzJDEgYXMgdG9rVHlwZXMsIHRva2VuaXplciwgdmVyc2lvbiB9O1xuIiwgImltcG9ydCAqIGFzIHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcIm5vZGU6ZnMvcHJvbWlzZXNcIjtcbmltcG9ydCB0eXBlIHtSdW5uZXIsRm9sZGVyLEZpbGVuYW1lLExzdHIsUG9zLFJ1bm5lckJhc2V9IGZyb20gJy4vZGF0YS5qcydcbmltcG9ydCB7cGFyc2VFeHByZXNzaW9uQXQsIHR5cGUgTm9kZSx0eXBlIEV4cHJlc3Npb24sdHlwZSBTcHJlYWRFbGVtZW50LCB0eXBlIFByb3BlcnR5fSBmcm9tIFwiYWNvcm5cIlxuaW1wb3J0IHtcbiAgdHlwZSBzMnQsXG4gIHJlc2V0LFxuICBncmVlbixcbiAgcGssXG4gIGdldF9lcnJvcixcbiAgaXNfb2JqZWN0LFxuICBpc19hdG9tLFxuICBkZWZhdWx0X2dldFxufSBmcm9tIFwiQHlpZ2FsL2Jhc2VfdHlwZXNcIjtcbmludGVyZmFjZSBBY29yblN5bnRheEVycm9yIGV4dGVuZHMgU3ludGF4RXJyb3Ige1xuICBwb3M6IG51bWJlcjsgICAgICAgIC8vIHNhbWUgYXMgcmFpc2VkQXRcbiAgcmFpc2VkQXQ6IG51bWJlcjsgICAvLyBpbmRleCBpbiBzb3VyY2Ugc3RyaW5nIHdoZXJlIGVycm9yIG9jY3VycmVkXG4gIGxvYz86IHtcbiAgICBsaW5lOiBudW1iZXI7XG4gICAgY29sdW1uOiBudW1iZXI7XG4gIH07XG59XG5mdW5jdGlvbiBpc19hY29ybl9lcnJvcihlOiB1bmtub3duKTplIGlzIEFjb3JuU3ludGF4RXJyb3Ige1xuICByZXR1cm4gKFxuICAgIGUgaW5zdGFuY2VvZiBTeW50YXhFcnJvciAmJlxuICAgIHR5cGVvZiAoZSBhcyBBY29yblN5bnRheEVycm9yKS5yYWlzZWRBdCA9PT0gXCJudW1iZXJcIlxuICApO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRfYmFzZShyb290OkZvbGRlcixpZDpzdHJpbmcpe1xuICBmdW5jdGlvbiBmKGZvbGRlcjpGb2xkZXIpOlJ1bm5lckJhc2V8dW5kZWZpbmVke1xuICAgIGZvciAoY29uc3QgYXIgb2YgW2ZvbGRlci5ydW5uZXJzLGZvbGRlci5lcnJvcnMsZm9sZGVyLmZvbGRlcnNdKXtcbiAgICAgIGNvbnN0IGFucz1hci5maW5kKHg9PnguaWQ9PT1pZClcbiAgICAgIGlmIChhbnMhPW51bGwpXG4gICAgICAgIHJldHVybiBhbnNcbiAgICB9XG4gICAgZm9yIChjb25zdCBzdWJmb2xkZXIgb2YgZm9sZGVyLmZvbGRlcnMpe1xuICAgICAgY29uc3QgYW5zPWYoc3ViZm9sZGVyKVxuICAgICAgaWYgKGFucyE9bnVsbClcbiAgICAgICAgcmV0dXJuIGFuc1xuICAgIH1cbiAgfVxuICByZXR1cm4gZihyb290KVxufVxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRfcnVubmVyKHJvb3Q6Rm9sZGVyLGlkOnN0cmluZyl7XG4gIGZ1bmN0aW9uIGYoZm9sZGVyOkZvbGRlcik6UnVubmVyfHVuZGVmaW5lZHtcbiAgICBjb25zdCBhbnM9Zm9sZGVyLnJ1bm5lcnMuZmluZCh4PT54LmlkPT09aWQpXG4gICAgaWYgKGFucyE9bnVsbClcbiAgICAgIHJldHVybiBhbnNcbiAgICBmb3IgKGNvbnN0IHN1YmZvbGRlciBvZiBmb2xkZXIuZm9sZGVycyl7XG4gICAgICBjb25zdCBhbnM9ZihzdWJmb2xkZXIpXG4gICAgICBpZiAoYW5zIT1udWxsKVxuICAgICAgICByZXR1cm4gYW5zXG4gICAgfVxuICB9XG4gIHJldHVybiBmKHJvb3QpXG59XG5mdW5jdGlvbiBpc19saXRlcmFsKGFzdDpFeHByZXNzaW9uLGxpdGVyYWw6c3RyaW5nKXtcbiAgaWYgKGFzdC50eXBlPT09J0xpdGVyYWwnICYmIGFzdC52YWx1ZT09PWxpdGVyYWwpXG4gICAgcmV0dXJuIHRydWVcbn1cbmZ1bmN0aW9uIGZpbmRfcHJvcChhc3Q6RXhwcmVzc2lvbixuYW1lOnN0cmluZyl7XG4gIGlmIChhc3QudHlwZSE9PSdPYmplY3RFeHByZXNzaW9uJylcbiAgICByZXR1cm5cbiAgLy9jb25zb2xlLmxvZyhhc3QpXG4gIGZvciAoY29uc3QgcHJvcCBvZiBhc3QucHJvcGVydGllcylcbiAgICBpZiAocHJvcC50eXBlPT09J1Byb3BlcnR5JyAmJiBpc19saXRlcmFsKHByb3Aua2V5LG5hbWUpKVxuICAgICAgcmV0dXJuIHByb3AudmFsdWVcbn1cbiBjbGFzcyBBc3RFeGNlcHRpb24gZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljICBhc3Q6IE5vZGV8THN0clxuICApe1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9IFwiQXN0RXhjZXB0aW9uXCI7XG4gIH1cbn1cbmZ1bmN0aW9uIHJlYWRfcHJvcChhc3Q6UHJvcGVydHl8U3ByZWFkRWxlbWVudCl7XG4gICAgaWYgKFxuICAgICAgYXN0LnR5cGUhPT1cIlByb3BlcnR5XCIgfHwgXG4gICAgICBhc3Qua2V5LnR5cGUhPT0nTGl0ZXJhbCcgfHwgXG4gICAgICBhc3QudmFsdWUudHlwZSE9PSdMaXRlcmFsJyB8fCBcbiAgICAgIHR5cGVvZiBhc3Qua2V5LnZhbHVlICE9PSdzdHJpbmcnIHx8XG4gICAgICB0eXBlb2YgYXN0LnZhbHVlLnZhbHVlICE9PSdzdHJpbmcnXG4gICAgKVxuICAgICAgdGhyb3cgIG5ldyBBc3RFeGNlcHRpb24oJ2V4cGVjdGluZyBcIm5hbWVcIj1cInZhbHVlXCInLGFzdClcbiAgICByZXR1cm4ge2tleTphc3Qua2V5LnZhbHVlLHN0cjphc3QudmFsdWUudmFsdWUsLi4ucGsoYXN0LCdzdGFydCcsJ2VuZCcpfVxufVxuZnVuY3Rpb24gcmVhZF9wcm9wX2FueShhc3Q6UHJvcGVydHl8U3ByZWFkRWxlbWVudCl7XG4gIGlmIChcbiAgICBhc3QudHlwZSE9PVwiUHJvcGVydHlcIiB8fCBcbiAgICBhc3Qua2V5LnR5cGUhPT0nTGl0ZXJhbCcgfHwgXG4gICAgdHlwZW9mIGFzdC5rZXkudmFsdWUgIT09J3N0cmluZydcbiAgKVxuICAgIHRocm93ICBuZXcgQXN0RXhjZXB0aW9uKCdleHBlY3RpbmcgXCJuYW1lXCI9dmFsdWUnLGFzdClcbiAgcmV0dXJuIHtcbiAgICBrZXk6YXN0LmtleS52YWx1ZSxcbiAgICB2YWx1ZTphc3QudmFsdWVcbiAgfVxufVxuZnVuY3Rpb24gZ2V0X2VycmF5X21hbmRhdG9yeShhc3Q6RXhwcmVzc2lvbixzb3VyY2VfZmlsZTpzdHJpbmcpe1xuICBjb25zdCBhbnM6THN0cltdPVtdICBcbiAgaWYgKGFzdC50eXBlPT09XCJBcnJheUV4cHJlc3Npb25cIil7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGFzdC5lbGVtZW50cyl7XG4gICAgICBpZiAoZWxlbT09bnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEFzdEV4Y2VwdGlvbignbnVsbCBub3Qgc3VwcG9ydGVkIGhlcmUnLGFzdClcbiAgICAgIGlmIChlbGVtLnR5cGU9PT1cIlNwcmVhZEVsZW1lbnRcIilcbiAgICAgICAgdGhyb3cgbmV3IEFzdEV4Y2VwdGlvbignc3ByZWFkIGVsZW1lbnQgbm90IHN1cHBvcnRlZCBoZXJlJyxlbGVtKVxuICAgICAgaWYgKGVsZW0udHlwZSE9PSdMaXRlcmFsJyB8fCB0eXBlb2YgZWxlbS52YWx1ZSE9PSdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgQXN0RXhjZXB0aW9uKCdleHBlY3Rpbmcgc3RyaW5nIGhlcmUnLGVsZW0pXG4gICAgICBhbnMucHVzaCh7XG4gICAgICAgIHN0cjplbGVtLnZhbHVlLFxuICAgICAgICBzb3VyY2VfZmlsZSxcbiAgICAgICAgLi4ucGsoZWxlbSwnc3RhcnQnLCdlbmQnKVxuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIGFuc1xuICB9XG4gIHRocm93IG5ldyBBc3RFeGNlcHRpb24oJ2V4cGVjdGluZyBhcnJheScsYXN0KVxufVxuZnVuY3Rpb24gZ2V0X2FycmF5KGFzdDpFeHByZXNzaW9uLHNvdXJjZV9maWxlOnN0cmluZyk6THN0cltde1xuICBpZiAoYXN0LnR5cGU9PT1cIkxpdGVyYWxcIiAmJiB0eXBlb2YgYXN0LnZhbHVlID09PVwic3RyaW5nXCIpe1xuICAgIGNvbnN0IGxvY2F0aW9uPXtcbiAgICAgIHN0cjphc3QudmFsdWUsXG4gICAgICBzb3VyY2VfZmlsZSxcbiAgICAgIC4uLnBrKGFzdCwnc3RhcnQnLCdlbmQnKVxuICAgIH1cbiAgICByZXR1cm4gW2xvY2F0aW9uXVxuICB9XG4gIHJldHVybiBnZXRfZXJyYXlfbWFuZGF0b3J5KGFzdCxzb3VyY2VfZmlsZSlcbn1cbmZ1bmN0aW9uIG1ha2VfdW5pcXVlKGFyOkxzdHJbXVtdKTpMc3RyW117XG4gIGNvbnN0IGFuczpzMnQ8THN0cj49e31cbiAgZm9yIChjb25zdCBhIG9mIGFyKVxuICAgIGZvciAoY29uc3QgYiBvZiBhKVxuICAgICAgYW5zW2Iuc3RyXT1iXG4gIHJldHVybiBPYmplY3QudmFsdWVzKGFucylcbn1cbmZ1bmN0aW9uIHN0cmlwXyQoYTpMc3RyKXtcbiAgcmV0dXJuIHsuLi5hLHN0cjphLnN0ci5zbGljZSgxKX1cbn1cbmZ1bmN0aW9uIHJlc29sdmVfdmFycyh2YXJzOnMydDxMc3RyW10+LGFzdDpFeHByZXNzaW9uKXtcbiAgICBmdW5jdGlvbiByZXNvbHZlKGE6THN0cnxMc3RyW10pe1xuICAgICAgY29uc3QgdmlzaXRpbmc9bmV3IFNldDxzdHJpbmc+XG4gICAgICBmdW5jdGlvbiBmKGE6THN0cnxMc3RyW10pOkxzdHJbXXtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYSkpXG4gICAgICAgICAgcmV0dXJuIG1ha2VfdW5pcXVlKGEubWFwKGYpKVxuICAgICAgICBpZiAoIWEuc3RyLnN0YXJ0c1dpdGgoJyQnKSlcbiAgICAgICAgICByZXR1cm4gW2FdXG4gICAgICAgIGE9c3RyaXBfJChhKVxuICAgICAgICBpZiAodmlzaXRpbmcuaGFzKGEuc3RyKSlcbiAgICAgICAgICB0aHJvdyBuZXcgQXN0RXhjZXB0aW9uKGAke2Euc3RyfTpjaXJjdWxhciByZWZlcmVuY2VgLGFzdClcbiAgICAgICAgdmlzaXRpbmcuYWRkKGEuc3RyKVxuICAgICAgICBjb25zdCByZWZlcmVuY2U9dmFyc1thLnN0cl1cbiAgICAgICAgaWYgKHJlZmVyZW5jZT09bnVsbClcbiAgICAgICAgICB0aHJvdyBuZXcgQXN0RXhjZXB0aW9uKGAke2Euc3RyfSB1bmRlZmluZWRgLGEpXG4gICAgICAgIGNvbnN0IGFuczI9ZihyZWZlcmVuY2UpXG4gICAgICAgIHZpc2l0aW5nLmRlbGV0ZShhLnN0cilcbiAgICAgICAgcmV0dXJuIGFuczJcbiAgICAgIH1cbiAgICAgIHJldHVybiBmKGEpXG4gICAgfVxuICAgIGNvbnN0IGFuczpzMnQ8THN0cltdPj17fSAgICBcbiAgICBmb3IgKGNvbnN0IFtrLHZdIG9mIE9iamVjdC5lbnRyaWVzKHZhcnMpKXtcbiAgICAgIGNvbnN0IHJlc29sdmVkPXJlc29sdmUodilcbiAgICAgIGFuc1trXT1yZXNvbHZlZFxuICAgIH1cbiAgICByZXR1cm4gYW5zXG59XG5pbnRlcmZhY2UgV2F0Y2hlcnN7XG4gIHdhdGNoZXM6czJ0PExzdHJbXT4sXG4gIHRhZ3M6UmVjb3JkPHN0cmluZyxzdHJpbmdbXT5cbn1cbmZ1bmN0aW9uIGNvbGxlY3RfdmFycyhhc3Q6RXhwcmVzc2lvbnx1bmRlZmluZWQsc291cmNlX2ZpbGU6c3RyaW5nKXtcbiAgY29uc3QgdmFyczpzMnQ8THN0cltdPj17fVxuICBjb25zdCBzY3JpcHRzPW5ldyBTZXQ8c3RyaW5nPiAgIFxuICAvL2NvbnN0IGFucz17dmFycyxzY3JpcHRzfVxuICBpZiAoYXN0PT1udWxsKVxuICAgIHJldHVybiB2YXJzXG4gIGlmIChhc3QudHlwZSE9PSdPYmplY3RFeHByZXNzaW9uJylcbiAgICByZXR1cm4gdmFyc1xuICBmb3IgKGNvbnN0IHByb3Bhc3Qgb2YgYXN0LnByb3BlcnRpZXMpe1xuICAgIGNvbnN0IHtrZXksdmFsdWV9PXJlYWRfcHJvcF9hbnkocHJvcGFzdClcbiAgICBjb25zdCBhcj1nZXRfYXJyYXkodmFsdWUsc291cmNlX2ZpbGUpXG4gICAgaWYgKHZhcnNba2V5XSE9PXVuZGVmaW5lZClcbiAgICAgIHRocm93IG5ldyBBc3RFeGNlcHRpb24oYGR1cGxpY2F0ZSB2YWx1ZTogJHtrZXl9YCxwcm9wYXN0KVxuICAgIGZvciAoY29uc3Qgc3ViayBvZiBrZXkuc3BsaXQoJywnKSl7IC8vc28gbXVsdGlwbGUgc2NyaXB0cyBjYW4gZWFzaWx5IGhhdmUgdGhlIHNhdmUgd2F0Y2hlZFxuICAgICAgc2NyaXB0cy5hZGQoc3ViaylcbiAgICAgIHZhcnNbc3Via109YXJcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhcnNcbn1cbmZ1bmN0aW9uIG1ha2VfZW1wdHlfYXJyYXkoKXtcbiAgcmV0dXJuIFtdXG59XG5mdW5jdGlvbiBwYXJzZV93YXRjaGVycyhcbiAgYXN0OiBFeHByZXNzaW9uLFxuICBzb3VyY2VfZmlsZTpzdHJpbmdcbik6V2F0Y2hlcnMgeyBcbiAgY29uc3Qgc2NyaXB0c21vbj1maW5kX3Byb3AoYXN0LCdzY3JpcHRzbW9uJylcbiAgaWYgKHNjcmlwdHNtb249PW51bGwpe1xuICAgIHJldHVybiB7XG4gICAgICB3YXRjaGVzOnt9LFxuICAgICAgdGFnczp7fVxuICAgIH1cbiAgfVxuICAvL2NvbnN0IGF1dG93YXRjaD1maW5kX3Byb3Aoc2NyaXB0c21vbiwnYXV0b3dhdGNoJylcbiAgLy9jb25zdCB3YXRjaD1maW5kX3Byb3Aoc2NyaXB0c21vbiwnd2F0Y2gnKVxuICBjb25zdCB2YXJzPWNvbGxlY3RfdmFycyhzY3JpcHRzbW9uLHNvdXJjZV9maWxlKVxuICBjb25zdCB3YXRjaGVzPXJlc29sdmVfdmFycyh2YXJzLGFzdClcbiAgY29uc3QgdGFncz1mdW5jdGlvbigpe1xuICAgIGNvbnN0IGFuczpSZWNvcmQ8c3RyaW5nLHN0cmluZ1tdPj17fVxuICAgIC8vbG9vcCBvdmVyIGFsbCBuYW1lLCBmb3IgdGhvc2Ugd2hvIHN0YXJ0IHdpdGggIywgbG9vcCBvdmVyIHRoZSByZXN1bHQgYW5kIGFkZCB0byBhbnNcbiAgICBmb3IgKGNvbnN0IFtrLGFyXSBvZiBPYmplY3QuZW50cmllcyh3YXRjaGVzKSl7XG4gICAgICBpZiAoay5zdGFydHNXaXRoKCcjJykpe1xuICAgICAgICBjb25zdCB0YWc9ay5zbGljZSgxKVxuICAgICAgICBmb3IgKGNvbnN0IHNjcmlwdCBvZiBhcil7XG4gICAgICAgICAgZGVmYXVsdF9nZXQoYW5zLHNjcmlwdC5zdHIsbWFrZV9lbXB0eV9hcnJheSkucHVzaCh0YWcpXG4gICAgICAgIH1cbiAgICAgICAgLy9jb250aW51ZVxuICAgICAgfVxuICAgICAgLyppZiAoYXIubGVuZ3RoIT09MCl7XG4gICAgICAgIGRlZmF1bHRfZ2V0KGFucyxrLG1ha2VfZW1wdHlfYXJyYXkpLnB1c2goXCJ3YXRjaGFibGVcIilcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIGRlZmF1bHRfZ2V0KGFucyAsayxtYWtlX2VtcHR5X2FycmF5KS5wdXNoKFwibm9ud2F0Y2hhYmxlXCIpXG4gICAgICB9Ki9cbiAgICB9XG4gICAgcmV0dXJuIGFuc1xuICB9KClcbiAgcmV0dXJuIHtcbiAgICB3YXRjaGVzLFxuICAgIHRhZ3NcbiAgfVxufVxuZnVuY3Rpb24gcGFyc2Vfc2NyaXB0czIoXG4gIGFzdDogRXhwcmVzc2lvbixcbiAgc291cmNlX2ZpbGU6c3RyaW5nXG4pOiBzMnQ8THN0cj4geyBcbiAgY29uc3QgYW5zOnMydDxMc3RyPj17fVxuICBjb25zdCBzY3JpcHRzPWZpbmRfcHJvcChhc3QsJ3NjcmlwdHMnKVxuICBpZiAoc2NyaXB0cz09bnVsbClcbiAgICByZXR1cm4gYW5zXG4gIGlmIChzY3JpcHRzLnR5cGUhPT0nT2JqZWN0RXhwcmVzc2lvbicpXG4gICAgcmV0dXJuIGFuc1xuICBmb3IgKGNvbnN0IHByb3Bhc3Qgb2Ygc2NyaXB0cy5wcm9wZXJ0aWVzKXtcbiAgICBjb25zdCB7c3RhcnQsZW5kLGtleSxzdHJ9PXJlYWRfcHJvcChwcm9wYXN0KVxuICAgIGFuc1trZXldPXtzdHIsc3RhcnQsZW5kLHNvdXJjZV9maWxlfVxuICB9XG4gIHJldHVybiBhbnNcbn1cbmZ1bmN0aW9uIGVzY2FwZV9pZChzOnN0cmluZyl7XG4gIHJldHVybiBzLnJlcGxhY2VBbGwoL1xcXFx8OnxcXC8vZywnLScpLnJlcGxhY2VBbGwoJyAnLCctLScpXG59XG5mdW5jdGlvbiBzY3JpcHRzbW9uX3RvX3J1bm5lcnMoc291cmNlX2ZpbGU6c3RyaW5nLHdhdGNoZXJzOldhdGNoZXJzLHNjcmlwdHM6czJ0PExzdHI+KXtcbiAgY29uc3QgYW5zPVtdXG4gIGZvciAoY29uc3QgW25hbWUsc2NyaXB0XSBvZiBPYmplY3QuZW50cmllcyhzY3JpcHRzKSl7XG4gICAgaWYgKHNjcmlwdD09bnVsbCl7XG4gICAgICBjb25zb2xlLndhcm4oYG1pc3Npbmcgc2NyaXB0ICR7bmFtZX1gKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgY29uc3QgcnVubmVyPWZ1bmN0aW9uKCl7XG4gICAgICBjb25zdCB3b3Jrc3BhY2VfZm9sZGVyPXBhdGguZGlybmFtZShzb3VyY2VfZmlsZSlcbiAgICAgIGNvbnN0IGlkPWVzY2FwZV9pZChgJHt3b3Jrc3BhY2VfZm9sZGVyfSAke25hbWV9YClcbiAgICAgIGNvbnN0IGVmZmVjdGl2ZV93YXRjaF9yZWw9d2F0Y2hlcnMud2F0Y2hlc1tuYW1lXT8/W11cbiAgICAgIGNvbnN0IGVmZmVjdGl2ZV93YXRjaDpGaWxlbmFtZVtdPWVmZmVjdGl2ZV93YXRjaF9yZWwubWFwKHJlbD0+KHtyZWwsZnVsbDpwYXRoLmpvaW4od29ya3NwYWNlX2ZvbGRlcixyZWwuc3RyKX0pKVxuICAgICAgLy9jb25zdCB3YXRjaGVkX2RlZmF1bHQ9d2F0Y2hlcnMuYXV0b3dhdGNoX3NjcmlwdHMuaW5jbHVkZXMobmFtZSlcbiAgICAgIGNvbnN0IHRhZ3M9d2F0Y2hlcnMudGFnc1tuYW1lXT8/W11cbiAgICAgIGNvbnN0IGFuczpSdW5uZXI9IHtcbiAgICAgICAgLy9udHlwZToncnVubmVyJyxcbiAgICAgICAgcG9zOiBzY3JpcHQsXG4gICAgICAgIG5lZWRfY3RsOnRydWUsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNjcmlwdDpzY3JpcHQuc3RyLFxuICAgICAgICB3b3Jrc3BhY2VfZm9sZGVyLFxuICAgICAgICBlZmZlY3RpdmVfd2F0Y2gsXG4gICAgICAgIC8vd2F0Y2hlZF9kZWZhdWx0LFxuICAgICAgICBpZCxcbiAgICAgICAgdGFnc1xuICAgICAgICAvL3dhdGNoZWQ6ZmFsc2VcbiAgICAgIH0gXG4gICAgICByZXR1cm4gYW5zXG4gICAgfSgpXG4gICAgYW5zLnB1c2gocnVubmVyKVxuICB9XG4gIHJldHVybiBhbnNcbn0gICBcblxuZnVuY3Rpb24gY2FsY19wb3MoZXg6RXJyb3Ipe1xuICBpZiAoZXggaW5zdGFuY2VvZiBBc3RFeGNlcHRpb24pXG4gICAgcmV0dXJuIHBrKGV4LmFzdCwnc3RhcnQnLCdlbmQnKVxuICBpZiAoaXNfYWNvcm5fZXJyb3IoZXgpKXtcbiAgICBjb25zdCBzdGFydD1leC5wb3NcbiAgICBjb25zdCBlbmQ9ZXgucmFpc2VkQXRcbiAgICByZXR1cm4ge3N0YXJ0LGVuZH1cbiAgfVxufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRfcGFja2FnZV9qc29uKFxuICB3b3Jrc3BhY2VfZm9sZGVyczogc3RyaW5nW11cbik6UHJvbWlzZTxGb2xkZXI+IHtcbiAgY29uc3QgZm9sZGVyX2luZGV4OiBSZWNvcmQ8c3RyaW5nLCBGb2xkZXI+ID0ge307IC8vYnkgZnVsbF9wYXRobmFtZVxuICBhc3luYyBmdW5jdGlvbiByZWFkX29uZSh3b3Jrc3BhY2VfZm9sZGVyOiBzdHJpbmcsbmFtZTpzdHJpbmcscG9zPzpQb3MpOlByb21pc2U8Rm9sZGVyPntcbiAgICBjb25zdCBhbnM6Rm9sZGVyPSB7XG4gICAgICAgIHJ1bm5lcnM6W10sXG4gICAgICAgIGZvbGRlcnM6W10sXG4gICAgICAgIG5hbWUsXG4gICAgICAgIHdvcmtzcGFjZV9mb2xkZXIsLypudHlwZTonZm9sZGVyJywqL1xuICAgICAgICBpZDplc2NhcGVfaWQod29ya3NwYWNlX2ZvbGRlciksXG4gICAgICAgIHBvcyxcbiAgICAgICAgbmVlZF9jdGw6dHJ1ZSxcbiAgICAgICAgZXJyb3JzOltdXG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZV9maWxlID0gcGF0aC5yZXNvbHZlKHBhdGgubm9ybWFsaXplKHdvcmtzcGFjZV9mb2xkZXIpLCBcInBhY2thZ2UuanNvblwiKTtcbiAgICB0cnl7XG5cbiAgICAgIGNvbnN0IGQ9IHBhdGgucmVzb2x2ZShzb3VyY2VfZmlsZSk7XG4gICAgICBjb25zdCBleGlzdHM9Zm9sZGVyX2luZGV4W2RdXG4gICAgICBpZiAoZXhpc3RzIT1udWxsKXtcbiAgICAgICAgY29uc29sZS53YXJuKGAke3NvdXJjZV9maWxlfTogc2tpcHBpbiwgYWxyZWFkeSBkb25lYClcbiAgICAgICAgcmV0dXJuIGV4aXN0c1xuICAgICAgfSAgICBcbiAgICAgIC8vY29uc3QgcGtnSnNvbiA9IGF3YWl0IFxuICAgICAgY29uc3Qgc291cmNlPWF3YWl0IGZzLnJlYWRGaWxlKHNvdXJjZV9maWxlLCd1dGY4JylcbiAgICAgIGNvbnN0IGFzdCA9IHBhcnNlRXhwcmVzc2lvbkF0KHNvdXJjZSwgMCwge1xuICAgICAgICBlY21hVmVyc2lvbjogXCJsYXRlc3RcIixcbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coYCR7Z3JlZW59JHtzb3VyY2VfZmlsZX0ke3Jlc2V0fWApXG4gICAgICBjb25zdCBzY3JpcHRzPXBhcnNlX3NjcmlwdHMyKGFzdCxzb3VyY2VfZmlsZSlcbiAgICAgIGNvbnN0IHdhdGNoZXJzPXBhcnNlX3dhdGNoZXJzKGFzdCxzb3VyY2VfZmlsZSlcbiAgICAgIGFucy5ydW5uZXJzPXNjcmlwdHNtb25fdG9fcnVubmVycyhzb3VyY2VfZmlsZSx3YXRjaGVycyxzY3JpcHRzKVxuICAgICAgY29uc3Qgd29ya3NwYWNlc19hc3Q9ZmluZF9wcm9wIChhc3QsJ3dvcmtzcGFjZXMnKVxuICAgICAgY29uc3Qgd29ya3NwYWNlcz13b3Jrc3BhY2VzX2FzdD9nZXRfZXJyYXlfbWFuZGF0b3J5KHdvcmtzcGFjZXNfYXN0LHNvdXJjZV9maWxlKTpbXVxuICAgICAgYW5zLmZvbGRlcnM9W10gXG4gICAgICB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzPVtdXG4gICAgICAgIGZvciAoY29uc3Qgd29ya3NwYWNlIG9mIHdvcmtzcGFjZXMpXG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHJlYWRfb25lKHBhdGguam9pbih3b3Jrc3BhY2VfZm9sZGVyLHdvcmtzcGFjZS5zdHIpLHdvcmtzcGFjZS5zdHIsd29ya3NwYWNlKSlcbiAgICAgICAgZm9yIChjb25zdCByZXQgb2YgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpKVxuICAgICAgICAgIGlmIChyZXQhPW51bGwpXG4gICAgICAgICAgICAgIGFucy5mb2xkZXJzLnB1c2gocmV0KVxuICAgICAgfVxuICAgICAgcmV0dXJuIGFuc1xuICAgIH1jYXRjaChleCl7XG4gICAgICBjb25zdCBleF9lcnJvcj1nZXRfZXJyb3IoZXgpXG4gICAgICBjb25zdCBwb3M6UG9zPXtzb3VyY2VfZmlsZSwuLi5jYWxjX3BvcyhleF9lcnJvcil9XG4gICAgICBjb25zb2xlLmxvZyh7cG9zfSlcbiAgICAgIGFucy5lcnJvcnM9W3tcbiAgICAgICAgICBwb3MsXG4gICAgICAgICAgaWQ6YCR7YW5zLmlkfWVycm9yYCxcbiAgICAgICAgICBuZWVkX2N0bDpmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOmV4X2Vycm9yLm1lc3NhZ2VcbiAgfVxuICAgICAgXVxuICAgICAgcmV0dXJuIGFuc1xuICAgIH1cbiAgfVxuICBjb25zdCBmb2xkZXJzPVtdXG4gIGNvbnN0IHByb21pc2VzPVtdXG4gIGZvciAoY29uc3Qgd29ya3NwYWNlX2ZvbGRlciBvZiB3b3Jrc3BhY2VfZm9sZGVycyl7XG4gICAgLy9jb25zdCBmdWxsX3BhdGhuYW1lPXBhdGgucmVzb2x2ZShwYXRobmFtZSlcbiAgICBwcm9taXNlcy5wdXNoKHJlYWRfb25lKHdvcmtzcGFjZV9mb2xkZXIscGF0aC5iYXNlbmFtZSh3b3Jrc3BhY2VfZm9sZGVyKSkpXG4gIH1cbiAgZm9yIChjb25zdCByZXQgb2YgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpKVxuICAgIGlmIChyZXQhPW51bGwpXG4gICAgICBmb2xkZXJzLnB1c2gocmV0KVxuICBjb25zdCByb290OkZvbGRlcj17XG4gICAgbmFtZToncm9vdCcsXG4gICAgaWQ6J3Jvb3QnLFxuICAgIHdvcmtzcGFjZV9mb2xkZXI6ICcnLFxuICAgIGZvbGRlcnMsXG4gICAgcnVubmVyczpbXSwvLyxcbiAgICBuZWVkX2N0bDp0cnVlLFxuICAgIHBvczp1bmRlZmluZWQsXG4gICAgZXJyb3JzOltdXG4gICAgLy9udHlwZTonZm9sZGVyJ1xuICB9XG4gIHJldHVybiByb290XG59XG5mdW5jdGlvbiBub19jeWNsZXMoeDp1bmtub3duKXtcbiAgIGNvbnN0IHdzPW5ldyBXZWFrU2V0XG4gICBmdW5jdGlvbiBmKHY6dW5rbm93bik6dW5rbm93bntcbiAgICBpZiAodHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgIHJldHVybiAnPGZ1bmN0aW9uPidcbiAgICBpZiAodiBpbnN0YW5jZW9mIFNldClcbiAgICAgIHJldHVybiBbLi4udl0ubWFwKGYpXG4gICAgaWYgKHY9PW51bGx8fGlzX2F0b20odikpXG4gICAgICByZXR1cm4gdlxuICAgIGlmICh3cy5oYXModikpXG4gICAgICByZXR1cm4gJzxjeWNsZT4nXG4gICAgd3MuYWRkKHYpICAgIFxuICAgIGNvbnN0IGFucz1mdW5jdGlvbiAoKXtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKVxuICAgICAgICByZXR1cm4gdi5tYXAoZilcbiAgICAgIGlmIChpc19vYmplY3Qodikpe1xuICAgICAgICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKE9iamVjdC5lbnRyaWVzKHYpLm1hcCgoWyBrLCB2XSkgPT4gW2ssIGYodildKSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB2LmNvbnN0cnVjdG9yLm5hbWV8fFwiPHVua25vd24gdHlwZT5cIlxuICAgIH0oKVxuICAgIHdzLmRlbGV0ZSh2KVxuICAgIHJldHVybiBhbnNcbiAgIH1cbiAgIHJldHVybiBmKHgpXG59XG5leHBvcnQgZnVuY3Rpb24gdG9fanNvbih4OnVua25vd24sc2tpcF9rZXlzOnN0cmluZ1tdPVtdKXtcbiBcbiAgZnVuY3Rpb24gc2V0X3JlcGxhY2VyKGs6c3RyaW5nLHY6dW5rbm93bil7XG4gICAgaWYgKHNraXBfa2V5cy5pbmNsdWRlcyhrKSlcbiAgICAgIHJldHVybiAnPHNraXBwZWQ+J1xuICAgIHJldHVybiB2IFxuICB9XG4gIGNvbnN0IHgyPW5vX2N5Y2xlcyh4KVxuICBjb25zdCBhbnM9SlNPTi5zdHJpbmdpZnkoeDIsc2V0X3JlcGxhY2VyLDIpLnJlcGxhY2UoL1xcXFxuL2csICdcXG4nKTtcbiAgcmV0dXJuIGFuc1xufSIsICJpbXBvcnQgdHlwZSB7V2Vidmlld01lc3NhZ2V9IGZyb20gJy4uLy4uL3NyYy9leHRlbnNpb24uanMnXG5pbXBvcnQge3ZzY29kZX0gZnJvbSAnLi9kb21fdXRpbHMuanMnXG5pbXBvcnQgdHlwZSB7UnVubmVyUmVwb3J0LFJ1bm5lcixTdGF0ZX0gZnJvbSAnLi4vLi4vc3JjL2RhdGEuanMnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZUxvY2F0aW9uIHtcbiAgZmlsZTogc3RyaW5nO1xuICByb3c6IG51bWJlcjtcbiAgY29sOiBudW1iZXI7XG59XG5leHBvcnQgZnVuY3Rpb24gcG9zdF9tZXNzYWdlKG1zZzpXZWJ2aWV3TWVzc2FnZSl7XG4gIHZzY29kZS5wb3N0TWVzc2FnZShtc2cpXG59XG5leHBvcnQgZnVuY3Rpb24gY2FsY19sYXN0X3J1bihyZXBvcnQ6UnVubmVyUmVwb3J0LHJ1bm5lcjpSdW5uZXIpe1xuICBjb25zdCBydW5zPXJlcG9ydC5ydW5zW3J1bm5lci5pZF0/P1tdXG4gIHJldHVybiBydW5zLmF0KC0xKVxufVxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNfcnVubmVyX3N0YXR1cyhyZXBvcnQ6UnVubmVyUmVwb3J0ICxydW5uZXI6UnVubmVyKTp7XG4gICAgdmVyc2lvbjogbnVtYmVyO1xuICAgIHN0YXRlOiBTdGF0ZTtcbn17XG4gIGNvbnN0IGxhc3RfcnVuPWNhbGNfbGFzdF9ydW4ocmVwb3J0LHJ1bm5lcilcbiAgaWYgKGxhc3RfcnVuPT1udWxsKVxuICAgIHJldHVybnt2ZXJzaW9uOjAsc3RhdGU6J3JlYWR5J31cbiAgY29uc3Qge2VuZF90aW1lLHJ1bl9pZDp2ZXJzaW9uLGV4aXRfY29kZSxzdG9wcGVkfT1sYXN0X3J1blxuICBpZiAoZW5kX3RpbWU9PW51bGwpe1xuICAgICAgcmV0dXJuIHt2ZXJzaW9uLHN0YXRlOidydW5uaW5nJ31cbiAgfVxuICBpZiAoc3RvcHBlZCkgXG4gICAgcmV0dXJuIHt2ZXJzaW9uLHN0YXRlOidzdG9wcGVkJ31cblxuICBpZiAoZXhpdF9jb2RlPT09MClcbiAgICByZXR1cm4ge3ZlcnNpb24sc3RhdGU6J2RvbmUnfVxuICByZXR1cm4ge3ZlcnNpb24sc3RhdGU6J2Vycm9yJ31cbn1cblxuIiwgIjwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG5cbjxoZWFkPlxuICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgPHRpdGxlPlNjcmlwdHNtb24gaWNvbnM8L3RpdGxlPlxuICA8bGluayByZWw9XCJzdHlsZXNoZWV0XCIgaHJlZj1cIi4vaWNvbnMuY3NzXCI+XG48L2hlYWQ+XG5cbjxib2R5PlxuICA8YnV0dG9uIGlkPWFuaW1hdGVidXR0b24+YW5pbWF0ZTwvYnV0dG9uPlxuICA8ZGl2IGlkPXN0YXQ+c3RhdDwvZGl2PlxuICA8YnV0dG9uIGlkPWFuaW1hdGVidXR0b25fdGhlX2RvbmU+YW5pbWF0ZWJ1dHRvbl90aGVfZG9uZTwvYnV0dG9uPlxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPmVycm9yXG4gICAgPHN2ZyAgd2lkdGg9XCIxNnB4XCIgaGVpZ2h0PVwiMTZweFwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cInJlZFwiPlxuICAgICAgPCEtLSBDaXJjbGUgLS0+XG4gICAgICA8Y2lyY2xlIGN4PVwiOFwiIGN5PVwiOFwiIHI9XCI3XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgZmlsbD1cInRyYW5zcGFyZW50XCIgLz5cbiAgICAgIDwhLS0gWCAtLT5cbiAgICAgIDxwYXRoIGQ9XCJNNSA1IEwxMSAxMSBNNSAxMSBMMTEgNVwiICBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBmaWxsPVwidHJhbnNwYXJlbnRcIlxuICAgICAgICBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiIGlkPVwidGhlX2RvbmVcIj5kb25lXG4gICAgPHN2ZyB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gICAgICA8Y2lyY2xlIGN4PVwiNTBcIiBjeT1cIjUwXCIgcj1cIjQ1XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMTBcIiBmaWxsPVwidHJhbnNwYXJlbnRcIiAvPlxuICAgICAgPGcgIHRyYW5zZm9ybS1vcmlnaW49XCI1MCA1MFwiPlxuICAgICAgICA8cGF0aCBkPVwiTTMwIDUwIEw0NSA2NSBMNzAgMzVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxMFwiIGZpbGw9XCJ0cmFuc3BhcmVudFwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIlxuICAgICAgICAgIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgLz5cbiAgICAgIDwvZz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCIgaWQ9XCJ0aGVfZG9uZVwiPnN0b3BcbiAgXG48c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPjxwYXRoIGQ9XCJNMTIuNSAzLjVWMTIuNUgzLjVWMy41SDEyLjVaTTEyLjUgMkgzLjVDMi42NzIgMiAyIDIuNjcyIDIgMy41VjEyLjVDMiAxMy4zMjggMi42NzIgMTQgMy41IDE0SDEyLjVDMTMuMzI4IDE0IDE0IDEzLjMyOCAxNCAxMi41VjMuNUMxNCAyLjY3MiAxMy4zMjggMiAxMi41IDJaXCIvPjwvc3ZnPlxuICA8L2Rpdj5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCIgaWQ9XCJ0aGVfZG9uZVwiPnN0b3BwZWRcblxuPHN2ZyAgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+PHBhdGggZD1cIk0xNCAySDEwQzEwIDAuODk3IDkuMTAzIDAgOCAwQzYuODk3IDAgNiAwLjg5NyA2IDJIMkMxLjcyNCAyIDEuNSAyLjIyNCAxLjUgMi41QzEuNSAyLjc3NiAxLjcyNCAzIDIgM0gyLjU0TDMuMzQ5IDEyLjcwOEMzLjQ1NiAxMy45OTQgNC41NSAxNSA1Ljg0IDE1SDEwLjE1OUMxMS40NDkgMTUgMTIuNTQzIDEzLjk5MyAxMi42NSAxMi43MDhMMTMuNDU5IDNIMTMuOTk5QzE0LjI3NSAzIDE0LjQ5OSAyLjc3NiAxNC40OTkgMi41QzE0LjQ5OSAyLjIyNCAxNC4yNzUgMiAxMy45OTkgMkgxNFpNOCAxQzguNTUxIDEgOSAxLjQ0OSA5IDJIN0M3IDEuNDQ5IDcuNDQ5IDEgOCAxWk0xMS42NTUgMTIuNjI1QzExLjU5MSAxMy4zOTYgMTAuOTM0IDE0IDEwLjE2IDE0SDUuODQxQzUuMDY3IDE0IDQuNDEgMTMuMzk2IDQuMzQ2IDEyLjYyNUwzLjU0NCAzSDEyLjQ1OEwxMS42NTYgMTIuNjI1SDExLjY1NVpNNyA1LjVWMTEuNUM3IDExLjc3NiA2Ljc3NiAxMiA2LjUgMTJDNi4yMjQgMTIgNiAxMS43NzYgNiAxMS41VjUuNUM2IDUuMjI0IDYuMjI0IDUgNi41IDVDNi43NzYgNSA3IDUuMjI0IDcgNS41Wk0xMCA1LjVWMTEuNUMxMCAxMS43NzYgOS43NzYgMTIgOS41IDEyQzkuMjI0IDEyIDkgMTEuNzc2IDkgMTEuNVY1LjVDOSA1LjIyNCA5LjIyNCA1IDkuNSA1QzkuNzc2IDUgMTAgNS4yMjQgMTAgNS41WlwiLz48L3N2Zz5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+cmVhZHlcblxuXG4gICAgPHN2ZyB3aWR0aD1cIjY0cHhcIiBoZWlnaHQ9XCI2NHB4XCIgdmlld0JveD1cIjEwIDEwIDQ1LjAwIDQ1LjAwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHN0cm9rZS13aWR0aD1cIjNcIj5cbiAgICAgIDxwYXRoIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIGZpbGw9XCJub25lXCJcbiAgICAgICAgZD1cIk00MS43MSwxMC41OEgyOGwtNy40LDIyLjI4YS4xLjEsMCwwLDAsLjA5LjEzaDguNDlhLjEuMSwwLDAsMSwuMS4xM0wyMi43MSw1Mi43NmEuNS41LDAsMCwwLC44OC40NUw0My40MSwyNmEuMS4xLDAsMCwwLS4wOC0uMTZIMzQuNDJhLjExLjExLDAsMCwxLS4wOS0uMTVsNy40Ny0xNUEuMS4xLDAsMCwwLDQxLjcxLDEwLjU4WlwiIC8+XG4gICAgPC9zdmc+XG5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+c3ludGF4ZXJyb3JcblxuICAgIDxzdmcgd2lkdGg9XCI2NHB4XCIgaGVpZ2h0PVwiNjRweFwiIHZpZXdCb3g9XCItNCAtNCAyMi4wMCAyMi4wMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBzdHJva2Utd2lkdGg9XCIyXCI+XG4gICAgICA8cGF0aCBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBmaWxsPVwicmVkXCJcbiAgICAgICAgZD1cIk0gOCAwIEwgMCAxNiBMIDE2IDE2IHo4IDBcIiAvPlxuICAgIDwvc3ZnPlxuXG4gIDwvZGl2PlxuXG5cblxuXG5cblxuICAgPGRpdiBjbGFzcz1cImljb25cIj5ydW5uaW5nXG48c3ZnIGNsYXNzPVwicnVubmluZ2ljb25cIiB4bWxucyA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94ID0gXCIwIDAgMTAwIDEwMFwiIHByZXNlcnZlQXNwZWN0UmF0aW8gPSBcInhNaWRZTWlkXCIgd2lkdGggPSBcIjIzM1wiIGhlaWdodCA9IFwiMjMzXCIgZmlsbD1cIm5vbmVcIiB4bWxuczp4bGluayA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiPlxuICAgIDxjaXJjbGUgc3Ryb2tlLWRhc2hhcnJheSA9IFwiMTY0LjkzMzYxNDMxMzQ2NDE1IDU2Ljk3Nzg3MTQzNzgyMTM4XCIgciA9IFwiMzVcIiBzdHJva2Utd2lkdGggPSBcIjEwXCIgc3Ryb2tlID0gXCJjdXJyZW50Q29sb3JcIiBmaWxsID0gXCJub25lXCIgY3kgPSBcIjUwXCIgY3ggPSBcIjUwXCI+PC9jaXJjbGU+XG48L3N2Zz5cbjwvZGl2PlxuXG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5jaGV2cm9uLWRvd25cbiAgICA8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPlxuICAgICAgPHBhdGhcbiAgICAgICAgZD1cIk0zLjE0NjQ1IDUuNjQ2NDVDMy4zNDE3MSA1LjQ1MTE4IDMuNjU4MjkgNS40NTExOCAzLjg1MzU1IDUuNjQ2NDVMOCA5Ljc5Mjg5TDEyLjE0NjQgNS42NDY0NUMxMi4zNDE3IDUuNDUxMTggMTIuNjU4MyA1LjQ1MTE4IDEyLjg1MzYgNS42NDY0NUMxMy4wNDg4IDUuODQxNzEgMTMuMDQ4OCA2LjE1ODI5IDEyLjg1MzYgNi4zNTM1NUw4LjM1MzU1IDEwLjg1MzZDOC4xNTgyOSAxMS4wNDg4IDcuODQxNzEgMTEuMDQ4OCA3LjY0NjQ1IDEwLjg1MzZMMy4xNDY0NSA2LjM1MzU1QzIuOTUxMTggNi4xNTgyOSAyLjk1MTE4IDUuODQxNzEgMy4xNDY0NSA1LjY0NjQ1WlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+Y2hldnJvbi1yaWdodFxuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTUuNjQ2NDUgMy4xNDY0NUM1LjQ1MTE4IDMuMzQxNzEgNS40NTExOCAzLjY1ODI5IDUuNjQ2NDUgMy44NTM1NUw5Ljc5Mjg5IDhMNS42NDY0NSAxMi4xNDY0QzUuNDUxMTggMTIuMzQxNyA1LjQ1MTE4IDEyLjY1ODMgNS42NDY0NSAxMi44NTM2QzUuODQxNzEgMTMuMDQ4OCA2LjE1ODI5IDEzLjA0ODggNi4zNTM1NSAxMi44NTM2TDEwLjg1MzYgOC4zNTM1NUMxMS4wNDg4IDguMTU4MjkgMTEuMDQ4OCA3Ljg0MTcxIDEwLjg1MzYgNy42NDY0NUw2LjM1MzU1IDMuMTQ2NDVDNi4xNTgyOSAyLjk1MTE4IDUuODQxNzEgMi45NTExOCA1LjY0NjQ1IDMuMTQ2NDVaXCIgLz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5kZWJ1Z1xuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTIxLjc1IDEySDE5LjVWOUMxOS41IDguNDQ1IDE5LjM0NyA3LjkyNDUgMTkuMDgzIDcuNDc3NUwyMC43Nzk1IDUuNzgxQzIxLjA3MiA1LjQ4ODUgMjEuMDcyIDUuMDEzIDIwLjc3OTUgNC43MjA1QzIwLjQ4NyA0LjQyOCAyMC4wMTE1IDQuNDI4IDE5LjcxOSA0LjcyMDVMMTguMDIyNSA2LjQxN0MxNy41NzU1IDYuMTUzIDE3LjA1NSA2IDE2LjUgNkMxNi41IDMuNTE5IDE0LjQ4MSAxLjUgMTIgMS41QzkuNTE5IDEuNSA3LjUgMy41MTkgNy41IDZDNi45NDUgNiA2LjQyNDUgNi4xNTMgNS45Nzc1IDYuNDE3TDQuMjgxIDQuNzIwNUMzLjk4ODUgNC40MjggMy41MTMgNC40MjggMy4yMjA1IDQuNzIwNUMyLjkyOCA1LjAxMyAyLjkyOCA1LjQ4ODUgMy4yMjA1IDUuNzgxTDQuOTE3IDcuNDc3NUM0LjY1MyA3LjkyNDUgNC41IDguNDQ1IDQuNSA5VjEySDIuMjVDMS44MzYgMTIgMS41IDEyLjMzNiAxLjUgMTIuNzVDMS41IDEzLjE2NCAxLjgzNiAxMy41IDIuMjUgMTMuNUg0LjVDNC41IDE1LjI5ODUgNS4xMzYgMTYuOTUgNi4xOTUgMTguMjQ0NUwzLjU5NCAyMC44NDU1QzMuMzAxNSAyMS4xMzggMy4zMDE1IDIxLjYxMzUgMy41OTQgMjEuOTA2QzMuNzQxIDIyLjA1MyAzLjkzMyAyMi4xMjUgNC4xMjUgMjIuMTI1QzQuMzE3IDIyLjEyNSA0LjUwOSAyMi4wNTE1IDQuNjU2IDIxLjkwNkw3LjI1NyAxOS4zMDVDOC41NSAyMC4zNjQgMTAuMjAzIDIxIDEyLjAwMTUgMjFDMTMuOCAyMSAxNS40NTE1IDIwLjM2NCAxNi43NDYgMTkuMzA1TDE5LjM0NyAyMS45MDZDMTkuNDk0IDIyLjA1MyAxOS42ODYgMjIuMTI1IDE5Ljg3OCAyMi4xMjVDMjAuMDcgMjIuMTI1IDIwLjI2MiAyMi4wNTE1IDIwLjQwOSAyMS45MDZDMjAuNzAxNSAyMS42MTM1IDIwLjcwMTUgMjEuMTM4IDIwLjQwOSAyMC44NDU1TDE3LjgwOCAxOC4yNDQ1QzE4Ljg2NyAxNi45NTE1IDE5LjUwMyAxNS4yOTg1IDE5LjUwMyAxMy41SDIxLjc1M0MyMi4xNjcgMTMuNSAyMi41MDMgMTMuMTY0IDIyLjUwMyAxMi43NUMyMi41MDMgMTIuMzM2IDIyLjE2NyAxMiAyMS43NTMgMTJIMjEuNzVaTTEyIDNDMTMuNjU0NSAzIDE1IDQuMzQ1NSAxNSA2SDlDOSA0LjM0NTUgMTAuMzQ1NSAzIDEyIDNaTTE4IDEzLjVDMTggMTYuODA5IDE1LjMwOSAxOS41IDEyIDE5LjVDOC42OTEgMTkuNSA2IDE2LjgwOSA2IDEzLjVWOUM2IDguMTcyIDYuNjcyIDcuNSA3LjUgNy41SDE2LjVDMTcuMzI4IDcuNSAxOCA4LjE3MiAxOCA5VjEzLjVaTTE0Ljc4MSAxMS4wMzFMMTMuMDYyIDEyLjc1TDE0Ljc4MSAxNC40NjlDMTUuMDczNSAxNC43NjE1IDE1LjA3MzUgMTUuMjM3IDE0Ljc4MSAxNS41Mjk1QzE0LjYzNCAxNS42NzY1IDE0LjQ0MiAxNS43NDg1IDE0LjI1IDE1Ljc0ODVDMTQuMDU4IDE1Ljc0ODUgMTMuODY2IDE1LjY3NSAxMy43MTkgMTUuNTI5NUwxMiAxMy44MTA1TDEwLjI4MSAxNS41Mjk1QzEwLjEzNCAxNS42NzY1IDkuOTQyIDE1Ljc0ODUgOS43NSAxNS43NDg1QzkuNTU4IDE1Ljc0ODUgOS4zNjYgMTUuNjc1IDkuMjE5IDE1LjUyOTVDOC45MjY1IDE1LjIzNyA4LjkyNjUgMTQuNzYxNSA5LjIxOSAxNC40NjlMMTAuOTM4IDEyLjc1TDkuMjE5IDExLjAzMUM4LjkyNjUgMTAuNzM4NSA4LjkyNjUgMTAuMjYzIDkuMjE5IDkuOTcwNUM5LjUxMTUgOS42NzggOS45ODcgOS42NzggMTAuMjc5NSA5Ljk3MDVMMTEuOTk4NSAxMS42ODk1TDEzLjcxNzUgOS45NzA1QzE0LjAxIDkuNjc4IDE0LjQ4NTUgOS42NzggMTQuNzc4IDkuOTcwNUMxNS4wNzA1IDEwLjI2MyAxNS4wNzA1IDEwLjczODUgMTQuNzc4IDExLjAzMUgxNC43ODFaXCIgLz5cbiAgICA8L3N2Zz5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5maWxlXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiPlxuICAgICAgPHBhdGggZmlsbD1cImN1cnJlbnRDb2xvclwiXG4gICAgICAgIGQ9XCJNMiAxLjc1QzIgLjc4NCAyLjc4NCAwIDMuNzUgMGg2LjU4NmMuNDY0IDAgLjkwOS4xODQgMS4yMzcuNTEzbDIuOTE0IDIuOTE0Yy4zMjkuMzI4LjUxMy43NzMuNTEzIDEuMjM3djkuNTg2QTEuNzUgMS43NSAwIDAgMSAxMy4yNSAxNmgtOS41QTEuNzUgMS43NSAwIDAgMSAyIDE0LjI1Wm0xLjc1LS4yNWEuMjUuMjUgMCAwIDAtLjI1LjI1djEyLjVjMCAuMTM4LjExMi4yNS4yNS4yNWg5LjVhLjI1LjI1IDAgMCAwIC4yNS0uMjVWNmgtMi43NUExLjc1IDEuNzUgMCAwIDEgOSA0LjI1VjEuNVptNi43NS4wNjJWNC4yNWMwIC4xMzguMTEyLjI1LjI1LjI1aDIuNjg4bC0uMDExLS4wMTMtMi45MTQtMi45MTQtLjAxMy0uMDExWlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+Zm9sZGVyXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIi0yIC0yIDIwIDIwXCIgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCI+XG4gICAgICA8cGF0aCBzdHJva2U9J2N1cnJlbnRDb2xvcicgZmlsbD1cInRyYW5zcGFyZW50XCJcbiAgICAgICAgZD1cIk0xLjc1IDFBMS43NSAxLjc1IDAgMCAwIDAgMi43NXYxMC41QzAgMTQuMjE2Ljc4NCAxNSAxLjc1IDE1aDEyLjVBMS43NSAxLjc1IDAgMCAwIDE2IDEzLjI1VjQuNzVBMS43NSAxLjc1IDAgMCAwIDE0LjI1IDNINy41YS4yNS4yNSAwIDAgMS0uMi0uMUw1Ljg3NSAxLjQ3NUExLjc1IDEuNzUgMCAwIDAgNC41MTggMUgxLjc1WlwiIC8+XG4gICAgPC9zdmc+XG4gIDwvZGl2PlxuXG4gICA8ZGl2IGNsYXNzPVwiaWNvblwiPmZvbGRlcnN5bnRheGVycm9yXG48c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiLTIgLTIgMjAgMjBcIiB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIj5cbiAgPHBhdGggc3Ryb2tlPSdjdXJyZW50Q29sb3InIGZpbGw9XCJ0cmFuc3BhcmVudFwiXG4gICAgZD1cIk0xLjc1IDFBMS43NSAxLjc1IDAgMCAwIDAgMi43NXYxMC41QzAgMTQuMjE2Ljc4NCAxNSAxLjc1IDE1aDEyLjVBMS43NSAxLjc1IDAgMCAwIDE2IDEzLjI1VjQuNzVBMS43NSAxLjc1IDAgMCAwIDE0LjI1IDNINy41YS4yNS4yNSAwIDAgMS0uMi0uMUw1Ljg3NSAxLjQ3NUExLjc1IDEuNzUgMCAwIDAgNC41MTggMUgxLjc1WlwiIC8+XG4gIDxwYXRoIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIGZpbGw9XCJyZWRcIlxuICAgIGQ9XCJNIDggNS4zMzMzIEwgNCAxMy4zMzMzIEwgMTIgMTMuMzMzMyBaXCIgLz5cbjwvc3ZnPlxuXG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+cGxheVxuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTQuNzQ1MTQgMy4wNjQxNEM0LjQxMTgzIDIuODc2NjUgNCAzLjExNzUxIDQgMy40OTk5M1YxMi41MDAyQzQgMTIuODgyNiA0LjQxMTgyIDEzLjEyMzUgNC43NDUxMiAxMi45MzZMMTIuNzQ1NCA4LjQzNjAxQzEzLjA4NTIgOC4yNDQ4NiAxMy4wODUyIDcuNzU1NTkgMTIuNzQ1NCA3LjU2NDQzTDQuNzQ1MTQgMy4wNjQxNFpNMyAzLjQ5OTkzQzMgMi4zNTI2OCA0LjIzNTUgMS42MzAxMSA1LjIzNTQxIDIuMTkyNTdMMTMuMjM1NyA2LjY5Mjg2QzE0LjI1NTEgNy4yNjYzMyAxNC4yNTUxIDguNzM0MTUgMTMuMjM1NiA5LjMwNzU5TDUuMjM1MzcgMTMuODA3NkM0LjIzNTQ2IDE0LjM3IDMgMTMuNjQ3NCAzIDEyLjUwMDJWMy40OTk5M1pcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuICAgIDxkaXYgY2xhc3M9XCJpY29uXCI+cGxheS13YXRjaFxuICAgIDxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwiY3VycmVudENvbG9yXCI+XG4gICAgICA8cGF0aFxuICAgICAgICBkPVwiTTQuNzQ1MTQgMy4wNjQxNEM0LjQxMTgzIDIuODc2NjUgNCAzLjExNzUxIDQgMy40OTk5M1YxMi41MDAyQzQgMTIuODgyNiA0LjQxMTgyIDEzLjEyMzUgNC43NDUxMiAxMi45MzZMMTIuNzQ1NCA4LjQzNjAxQzEzLjA4NTIgOC4yNDQ4NiAxMy4wODUyIDcuNzU1NTkgMTIuNzQ1NCA3LjU2NDQzTDQuNzQ1MTQgMy4wNjQxNFpNMyAzLjQ5OTkzQzMgMi4zNTI2OCA0LjIzNTUgMS42MzAxMSA1LjIzNTQxIDIuMTkyNTdMMTMuMjM1NyA2LjY5Mjg2QzE0LjI1NTEgNy4yNjYzMyAxNC4yNTUxIDguNzM0MTUgMTMuMjM1NiA5LjMwNzU5TDUuMjM1MzcgMTMuODA3NkM0LjIzNTQ2IDE0LjM3IDMgMTMuNjQ3NCAzIDEyLjUwMDJWMy40OTk5M1pcIiAvPlxuICAgIDwvc3ZnPlxuICA8L2Rpdj5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+c2VsZWN0b3JfdW5kZWZpbmVkXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiPlxuICAgICAgPHBhdGggZD1cIk0gMCAwIEggMTYgViAxNiBIMCBWMFwiXG4gICAgICAgIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgZmlsbD1cIm5vbmVcIiBzdHJva2UtZGFzaGFycmF5PVwiMiw0XCIvPlxuICAgICAgPC9zdmc+XG4gIDwvZGl2PiBcblxuICA8ZGl2IGNsYXNzPVwiaWNvblwiPnNlbGVjdG9yX2ZhbHNlXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiPlxuICAgICAgPHBhdGggZD1cIk0gMCAwIEggMTYgViAxNiBIMCBWMFwiXG4gICAgICAgIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgZmlsbD1cIm5vbmVcIi8+XG4gICAgICA8L3N2Zz5cbiAgPC9kaXY+ICAgXG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj5zZWxlY3Rvcl90cnVlXG4gICAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIxNnB4XCIgaGVpZ2h0PVwiMTZweFwiIHZpZXdCb3g9XCIwIDAgMTYgMTZcIj5cbiAgICAgIDxwYXRoIGQ9XCJNIDAgMCBIIDE2IFYgMTYgSDAgVjBcIlxuICAgICAgICBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIGZpbGw9XCJub25lXCIvPlxuICAgICAgICA8cGF0aCBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBkPVwiTTEzLjY1NzIgMy4xMzU3M0MxMy44NTgzIDIuOTQ2NSAxNC4xNzUgMi45NTYxNCAxNC4zNjQzIDMuMTU3MjJDMTQuNTUzNSAzLjM1ODMxIDE0LjU0MzggMy42NzUgMTQuMzQyOCAzLjg2NDI1TDUuODQyNzcgMTEuODY0MkM1LjY0NTk3IDEyLjA0OTQgNS4zMzc1NiAxMi4wNDQ2IDUuMTQ2NDggMTEuODUzNUwxLjY0NjQ4IDguMzUzNTFDMS40NTEyMSA4LjE1ODI0IDEuNDUxMjEgNy44NDE3NCAxLjY0NjQ4IDcuNjQ2NDdDMS44NDE3NCA3LjQ1MTIxIDIuMTU4MjUgNy40NTEyMSAyLjM1MzUxIDcuNjQ2NDdMNS41MDk3NiAxMC44MDI3TDEzLjY1NzIgMy4xMzU3M1pcIi8+XG4gICAgICA8L3N2Zz5cbiAgPC9kaXY+ICAgXG5cblxuXG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+d2F0Y2hlZF9taXNzaW5nXG48c3ZnIHdpZHRoPVwiODAwcHhcIiBoZWlnaHQ9XCI4MDBweFwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiB4bWxuczpyZGY9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZlcnNpb249XCIxLjFcIiB4bWxuczpjYz1cImh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL25zI1wiIHhtbG5zOmRjPVwiaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS9cIj5cbiA8ZyB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoMCAtMTAyOC40KVwiPlxuICA8cGF0aCBkPVwibTI0IDE0YTIgMiAwIDEgMSAtNCAwIDIgMiAwIDEgMSA0IDB6XCIgdHJhbnNmb3JtPVwibWF0cml4KDEgMCAwIDEuMjUgLTEwIDEwMzEuNClcIiBmaWxsPVwiIzdmOGM4ZFwiLz5cbiAgPHBhdGggZD1cIm0xMiAxMDMwLjRjLTMuODY2IDAtNyAzLjItNyA3LjIgMCAzLjEgMy4xMjUgNS45IDQgNy44IDAuODc1IDEuOCAwIDUgMCA1bDMtMC41IDMgMC41cy0wLjg3NS0zLjIgMC01YzAuODc1LTEuOSA0LTQuNyA0LTcuOCAwLTQtMy4xMzQtNy4yLTctNy4yelwiIGZpbGw9XCIjZjM5YzEyXCIvPlxuICA8cGF0aCBkPVwibTEyIDEwMzAuNGMzLjg2NiAwIDcgMy4yIDcgNy4yIDAgMy4xLTMuMTI1IDUuOS00IDcuOC0wLjg3NSAxLjggMCA1IDAgNWwtMy0wLjV2LTE5LjV6XCIgZmlsbD1cIiNmMWM0MGZcIi8+XG4gIDxwYXRoIGQ9XCJtOSAxMDM2LjQtMSAxIDQgMTIgNC0xMi0xLTEtMSAxLTEtMS0xIDEtMS0xLTEgMS0xLTF6bTAgMSAxIDEgMC41LTAuNSAwLjUtMC41IDAuNSAwLjUgMC41IDAuNSAwLjUtMC41IDAuNS0wLjUgMC41IDAuNSAwLjUgMC41IDEtMSAwLjQzOCAwLjQtMy40MzggMTAuMy0zLjQzNzUtMTAuMyAwLjQzNzUtMC40elwiIGZpbGw9XCIjZTY3ZTIyXCIvPlxuICA8cmVjdCBoZWlnaHQ9XCI1XCIgd2lkdGg9XCI2XCIgeT1cIjEwNDUuNFwiIHg9XCI5XCIgZmlsbD1cIiNiZGMzYzdcIi8+XG4gIDxwYXRoIGQ9XCJtOSAxMDQ1LjR2NWgzdi0xaDN2LTFoLTN2LTFoM3YtMWgtM3YtMWgtM3pcIiBmaWxsPVwiIzk1YTVhNlwiLz5cbiAgPHBhdGggZD1cIm05IDEwNDYuNHYxaDN2LTFoLTN6bTAgMnYxaDN2LTFoLTN6XCIgZmlsbD1cIiM3ZjhjOGRcIi8+XG4gPC9nPlxuPC9zdmc+XG4gIDwvZGl2PlxuXG5cbiAgPGRpdiBjbGFzcz1cImljb25cIj53YXRjaGVkX3RydWVcbiA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIjMyXCIgaGVpZ2h0PVwiMzJcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PCEtLSBJY29uIGZyb20gTWF0ZXJpYWwgU3ltYm9scyBieSBHb29nbGUgLSBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL21hdGVyaWFsLWRlc2lnbi1pY29ucy9ibG9iL21hc3Rlci9MSUNFTlNFIC0tPjxwYXRoIGZpbGw9XCJjdXJyZW50Q29sb3JcIiBkPVwibTUuODI1IDIxbDEuNjI1LTcuMDI1TDIgOS4yNWw3LjItLjYyNUwxMiAybDIuOCA2LjYyNWw3LjIuNjI1bC01LjQ1IDQuNzI1TDE4LjE3NSAyMUwxMiAxNy4yNzV6XCIvPjwvc3ZnPiBcbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJpY29uXCI+d2F0Y2hlZF9mYWxzZVxuPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIzMlwiIGhlaWdodD1cIjMyXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjwhLS0gSWNvbiBmcm9tIE1hdGVyaWFsIFN5bWJvbHMgYnkgR29vZ2xlIC0gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9tYXRlcmlhbC1kZXNpZ24taWNvbnMvYmxvYi9tYXN0ZXIvTElDRU5TRSAtLT48cGF0aCBmaWxsPVwiY3VycmVudENvbG9yXCIgZD1cIm04Ljg1IDE2LjgyNWwzLjE1LTEuOWwzLjE1IDEuOTI1bC0uODI1LTMuNmwyLjc3NS0yLjRsLTMuNjUtLjMyNWwtMS40NS0zLjRsLTEuNDUgMy4zNzVsLTMuNjUuMzI1bDIuNzc1IDIuNDI1ek01LjgyNSAyMWwxLjYyNS03LjAyNUwyIDkuMjVsNy4yLS42MjVMMTIgMmwyLjggNi42MjVsNy4yLjYyNWwtNS40NSA0LjcyNUwxOC4xNzUgMjFMMTIgMTcuMjc1ek0xMiAxMi4yNVwiLz48L3N2Zz5cbiAgPC9kaXY+XG5cbjxzY3JpcHQgc3JjPVwiLi9pY29ucy5qc1wiPjwvc2NyaXB0PlxuXG5cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhbnNpUmVnZXgoe29ubHlGaXJzdCA9IGZhbHNlfSA9IHt9KSB7XG5cdC8vIFZhbGlkIHN0cmluZyB0ZXJtaW5hdG9yIHNlcXVlbmNlcyBhcmUgQkVMLCBFU0NcXCwgYW5kIDB4OWNcblx0Y29uc3QgU1QgPSAnKD86XFxcXHUwMDA3fFxcXFx1MDAxQlxcXFx1MDA1Q3xcXFxcdTAwOUMpJztcblxuXHQvLyBPU0Mgc2VxdWVuY2VzIG9ubHk6IEVTQyBdIC4uLiBTVCAobm9uLWdyZWVkeSB1bnRpbCB0aGUgZmlyc3QgU1QpXG5cdGNvbnN0IG9zYyA9IGAoPzpcXFxcdTAwMUJcXFxcXVtcXFxcc1xcXFxTXSo/JHtTVH0pYDtcblxuXHQvLyBDU0kgYW5kIHJlbGF0ZWQ6IEVTQy9DMSwgb3B0aW9uYWwgaW50ZXJtZWRpYXRlcywgb3B0aW9uYWwgcGFyYW1zIChzdXBwb3J0cyA7IGFuZCA6KSB0aGVuIGZpbmFsIGJ5dGVcblx0Y29uc3QgY3NpID0gJ1tcXFxcdTAwMUJcXFxcdTAwOUJdW1tcXFxcXSgpIzs/XSooPzpcXFxcZHsxLDR9KD86Wzs6XVxcXFxkezAsNH0pKik/W1xcXFxkQS1QUi1UWmNmLW5xLXV5PT48fl0nO1xuXG5cdGNvbnN0IHBhdHRlcm4gPSBgJHtvc2N9fCR7Y3NpfWA7XG5cblx0cmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybiwgb25seUZpcnN0ID8gdW5kZWZpbmVkIDogJ2cnKTtcbn1cbiIsICJpbXBvcnQgYW5zaVJlZ2V4IGZyb20gJ2Fuc2ktcmVnZXgnO1xuaW1wb3J0IHtyZWdleH0gZnJvbSAncmVnZXgnXG5jb25zdCBhbnNpX3JlZ2V4PWFuc2lSZWdleCgpXG50eXBlIEdyb3VwVHlwZT0ge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZztcbn0gfCB1bmRlZmluZWRcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZV9ncm91cF9pbnQoZ3JvdXBzOkdyb3VwVHlwZSxuYW1lOnN0cmluZyl7XG4gIGlmIChncm91cHM9PW51bGwpXG4gICAgcmV0dXJuIDBcbiAgY29uc3Qgc3RyPWdyb3Vwc1tuYW1lXXx8JydcbiAgcmV0dXJuIHBhcnNlSW50KHN0ciwgMTApfHwwIFxufVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlX2dyb3VwX3N0cmluZyhtYXRjaDpSZWdFeHBNYXRjaEFycmF5LG5hbWU6c3RyaW5nKXtcbiAgY29uc3Qge2dyb3Vwc309bWF0Y2hcbiAgaWYgKGdyb3Vwcz09bnVsbClcbiAgICByZXR1cm4gXG4gIHJldHVybiBncm91cHNbbmFtZV1cbi8vICByZXR1cm4gc3RyXG59XG50eXBlIGZvbnRfc3R5bGUgPSAnYm9sZCcgfCAnaXRhbGljJyB8J2ZhaW50J3wgJ3VuZGVybGluZScgfCAnYmxpbmtpbmcnIHwgJ2ludmVyc2UnIHwgJ3N0cmlrZXRocm91Z2gnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlIHtcbiAgZm9yZWdyb3VuZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBiYWNrZ3JvdW5kOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGZvbnRfc3R5bGVzOiBTZXQ8Zm9udF9zdHlsZT47XG59XG50eXBlIEFuc2lDb21tYW5kVHlwZT0nc3R5bGUnfCdpbnNlcnQnfCdzdHlsZV9pbnNlcnQnXG5pbnRlcmZhY2UgQW5zaUNvbW1hbmR7XG4gIHBvc2l0aW9uOiBudW1iZXI7XG4gIGNvbW1hbmQ6QW5zaUNvbW1hbmRUeXBlXG59XG5cbmludGVyZmFjZSBBbnNpU3R5bGVDb21tYW5kIGV4dGVuZHMgQW5zaUNvbW1hbmR7XG4gIGNvbW1hbmQ6J3N0eWxlJ1xuICBzdHlsZTpTdHlsZVxufVxuZnVuY3Rpb24gbWFrZV9jbGVhcl9zdHlsZV9jb21tYW5kKHBvc2l0aW9uOm51bWJlcik6QW5zaVN0eWxlQ29tbWFuZHtcbiAgcmV0dXJuIHtcbiAgICBjb21tYW5kOidzdHlsZScsXG4gICAgcG9zaXRpb24sXG4gICAgc3R5bGU6e1xuICAgICAgZm9yZWdyb3VuZDp1bmRlZmluZWQsXG4gICAgICBiYWNrZ3JvdW5kOnVuZGVmaW5lZCxcbiAgICAgIGZvbnRfc3R5bGVzOiBuZXcgU2V0KClcbiAgICB9XG4gIH1cbn1cbmV4cG9ydCBpbnRlcmZhY2UgQW5zaUluc2VydENvbW1hbmQgZXh0ZW5kcyBBbnNpQ29tbWFuZHtcbiAgY29tbWFuZDonaW5zZXJ0J1xuICBzdHI6c3RyaW5nXG59XG5leHBvcnQgaW50ZXJmYWNlIEFuc2lTdHlsZUluc2VydENvbW1hbmQgZXh0ZW5kcyBBbnNpQ29tbWFuZHtcbiAgY29tbWFuZDonc3R5bGVfaW5zZXJ0J1xuICBzdHI6c3RyaW5nLFxuICBzdHlsZTpTdHlsZVxufVxuZnVuY3Rpb24gaXNfc3R5bGVfY29tbWFuZChhOkFuc2lDb21tYW5kfHVuZGVmaW5lZCk6YSBpcyBBbnNpU3R5bGVDb21tYW5ke1xuICByZXR1cm4gYT8uY29tbWFuZD09PVwic3R5bGVcIlxufVxuZnVuY3Rpb24gaXNfaW5zZXJ0X2NvbW1hbmQoYTpBbnNpQ29tbWFuZHx1bmRlZmluZWQpOmEgaXMgQW5zaUluc2VydENvbW1hbmR7XG4gIHJldHVybiBhPy5jb21tYW5kPT09XCJpbnNlcnRcIlxufVxuZnVuY3Rpb24gaXNfc3R5bGVfaW5zZXJ0X2NvbW1hbmQoYTpBbnNpQ29tbWFuZHx1bmRlZmluZWQpOmEgaXMgQW5zaVN0eWxlSW5zZXJ0Q29tbWFuZHtcbiAgcmV0dXJuIGE/LmNvbW1hbmQ9PT1cInN0eWxlX2luc2VydFwiXG59XG5cbmZ1bmN0aW9uIGNoZWNrX2luc2VydHNfdmFsaWRpdHkoaW5zZXJ0czogQXJyYXk8QW5zaUluc2VydENvbW1hbmQ+KTogdm9pZCB7XG4gIGxldCBsYXN0X2VuZCA9IC0xO1xuICBmb3IgKGNvbnN0IHIgb2YgaW5zZXJ0cykge1xuICAgIGlmIChyLnBvc2l0aW9uIDw9IGxhc3RfZW5kKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVwbGFjZW1lbnRzIGNhbm5vdCBvdmVybGFwIGFuZCBtdXN0IGJlIHNvcnRlZFwiKTtcbiAgICBsYXN0X2VuZCA9IHIucG9zaXRpb247XG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tfc3R5bGVfcG9zaXRpb25zX3ZhbGlkaXR5KHN0eWxlX3Bvc2l0aW9uczogQXJyYXk8QW5zaVN0eWxlQ29tbWFuZD4pOiB2b2lkIHtcbiAgbGV0IGxhc3RfcG9zID0gLTE7XG4gIGZvciAoY29uc3QgcyBvZiBzdHlsZV9wb3NpdGlvbnMpIHtcbiAgICBpZiAocy5wb3NpdGlvbiA8IGxhc3RfcG9zKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU3R5bGUgcG9zaXRpb25zIG11c3QgYmUgc29ydGVkXCIpO1xuICAgIGxhc3RfcG9zID0gcy5wb3NpdGlvbjtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRfc3R5bGVfY3NzKHN0eWxlOiBTdHlsZXx1bmRlZmluZWQpOiBzdHJpbmcge1xuICBpZiAoc3R5bGU9PW51bGwpXG4gICAgcmV0dXJuICcnXG4gIGNvbnN0IGNzc19wYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHtmb3JlZ3JvdW5kLGJhY2tncm91bmR9PXN0eWxlO1xuXG4gIC8vIEhhbmRsZSAnaW52ZXJzZScgYnkgc3dhcHBpbmcgY29sb3JzIChkZXN0cnVjdHVyZWQgZm9yIHNpbmdsZSBzdGF0ZW1lbnQpXG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ2ludmVyc2UnKSlcbiAgICBbZm9yZWdyb3VuZCwgYmFja2dyb3VuZF0gPSBbYmFja2dyb3VuZCwgZm9yZWdyb3VuZF07XG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ2ZhaW50JykpXG4gICAgY3NzX3BhcnRzLnB1c2goYG9wYWNpdHk6LjVgKTtcbiAgaWYgKGZvcmVncm91bmQhPW51bGwpXG4gICAgY3NzX3BhcnRzLnB1c2goYGNvbG9yOiR7Zm9yZWdyb3VuZH1gKTtcbiAgaWYgKGJhY2tncm91bmQhPW51bGwpXG4gICAgY3NzX3BhcnRzLnB1c2goYGJhY2tncm91bmQtY29sb3I6JHtiYWNrZ3JvdW5kfWApO1xuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCdib2xkJykpXG4gICAgY3NzX3BhcnRzLnB1c2goYGZvbnQtd2VpZ2h0OmJvbGRgKTtcbiAgaWYgKHN0eWxlLmZvbnRfc3R5bGVzLmhhcygnaXRhbGljJykpXG4gICAgY3NzX3BhcnRzLnB1c2goYGZvbnQtc3R5bGU6aXRhbGljYCk7XG5cbiAgY29uc3QgZGVjb3JhdGlvbnM6IHN0cmluZ1tdID0gW107XG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ3VuZGVybGluZScpKVxuICAgIGRlY29yYXRpb25zLnB1c2goJ3VuZGVybGluZScpO1xuICBpZiAoc3R5bGUuZm9udF9zdHlsZXMuaGFzKCdzdHJpa2V0aHJvdWdoJykpXG4gICAgZGVjb3JhdGlvbnMucHVzaCgnbGluZS10aHJvdWdoJyk7XG4gIGlmIChzdHlsZS5mb250X3N0eWxlcy5oYXMoJ2JsaW5raW5nJykpXG4gICAgZGVjb3JhdGlvbnMucHVzaCgnYmxpbmsnKTtcbiAgXG4gIGlmIChkZWNvcmF0aW9ucy5sZW5ndGggPiAwKVxuICAgIGNzc19wYXJ0cy5wdXNoKGB0ZXh0LWRlY29yYXRpb246JHtkZWNvcmF0aW9ucy5qb2luKCcgJyl9YCk7XG4gIGlmIChjc3NfcGFydHMubGVuZ3RoPT09MClcbiAgICByZXR1cm4gJydcbiAgcmV0dXJuIGBzdHlsZT0nJHtjc3NfcGFydHMubWFwKHg9PmAke3h9O2ApLmpvaW4oJycpfSdgXG59XG5mdW5jdGlvbiBpc19jbGVhcl9zdHlsZShzdHlsZTpTdHlsZSl7XG4gIHJldHVybiBzdHlsZS5iYWNrZ3JvdW5kPT1udWxsJiZzdHlsZS5mb3JlZ3JvdW5kPT1udWxsJiZzdHlsZS5mb250X3N0eWxlcy5zaXplPT09MFxufVxuXG5mdW5jdGlvbiBtZXJnZV9vbmUoYTpBbnNpQ29tbWFuZCxiOkFuc2lDb21tYW5kKTpBbnNpU3R5bGVJbnNlcnRDb21tYW5ke1xuICBpZiAoaXNfc3R5bGVfY29tbWFuZChhKSYmaXNfaW5zZXJ0X2NvbW1hbmQoYikgKXsgIFxuICAgIHJldHVybiB7XG4gICAgICBjb21tYW5kOlwic3R5bGVfaW5zZXJ0XCIsXG4gICAgICBwb3NpdGlvbjphLnBvc2l0aW9uLFxuICAgICAgc3R5bGU6YS5zdHlsZSxcbiAgICAgIHN0cjpiLnN0clxuICAgIH1cbiAgfVxuICBpZiAoaXNfc3R5bGVfY29tbWFuZChiKSYmaXNfaW5zZXJ0X2NvbW1hbmQoYSkgKXsgIFxuICAgIHJldHVybiB7XG4gICAgICBjb21tYW5kOlwic3R5bGVfaW5zZXJ0XCIsXG4gICAgICBwb3NpdGlvbjphLnBvc2l0aW9uLFxuICAgICAgc3R5bGU6Yi5zdHlsZSxcbiAgICAgIHN0cjphLnN0clxuICAgIH1cbiAgfSAgXG4gIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgYW5zaSBzdHJ1Y3R1cmVcIikgIFxufVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlX2luc2VydHMoYTpBcnJheTxBbnNpSW5zZXJ0Q29tbWFuZD4sYjpBcnJheTxBbnNpSW5zZXJ0Q29tbWFuZD4pe1xuICBjb25zdCBhbnM9Wy4uLmEsLi4uYl0udG9Tb3J0ZWQoKGEsIGIpPT5hLnBvc2l0aW9uLWIucG9zaXRpb24pIC8vdG9kbzogbWFyZ2UgZmFzdGVyIHVzaW5nIHRoZSBmYWN0IHRoYXQgYSBhbmQgYiBhcmUgc29ydGVkIGJ5IHRoZW1zZWxmLCBvciBtYXliZSB0aGF0IGF1dG9tYXRpY2x5IGZhc3RlclxuICByZXR1cm4gYW5zXG59XG5leHBvcnQgZnVuY3Rpb24gbWVyZ2UoYTpBcnJheTxBbnNpQ29tbWFuZD4sYjpBcnJheTxBbnNpQ29tbWFuZD4pe1xuICBjb25zdCBzb3J0ZWQ9Wy4uLmEsLi4uYl0udG9Tb3J0ZWQoKGEsIGIpPT5hLnBvc2l0aW9uLWIucG9zaXRpb24pIC8vdG9kbzogbWFyZ2UgZmFzdGVyIHVzaW5nIHRoZSBmYWN0IHRoYXQgYSBhbmQgYiBhcmUgc29ydGVkIGJ5IHRoZW1zZWxmLCBvciBtYXliZSB0aGF0IGF1dG9tYXRpY2x5IGZhc3RlclxuICBjb25zdCBhbnM6QXJyYXk8QW5zaUNvbW1hbmQ+PVtdXG4gIGZvciAoY29uc3QgeCBvZiBzb3J0ZWQpe1xuICAgIGNvbnN0IGxhc3RfaW5kZXg6bnVtYmVyPWFucy5sZW5ndGggLSAxXG4gICAgY29uc3QgbGFzdF9pdGVtPWFuc1tsYXN0X2luZGV4XVxuICAgIGlmKGxhc3RfaXRlbT8ucG9zaXRpb249PT14LnBvc2l0aW9uKVxuICAgICAgYW5zW2xhc3RfaW5kZXhdID0gbWVyZ2Vfb25lKGxhc3RfaXRlbSx4KVxuICAgIGVsc2VcbiAgICAgIGFucy5wdXNoKHgpXG4gIH1cbiAgcmV0dXJuIGFuc1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlX2h0bWwoe1xuICBzdHlsZV9wb3NpdGlvbnMsXG4gIGluc2VydHMsXG4gIHBsYWluX3RleHRcbn06IHtcbiAgaW5zZXJ0czogQXJyYXk8QW5zaUluc2VydENvbW1hbmQ+XG4gIHN0eWxlX3Bvc2l0aW9uczogQXJyYXk8QW5zaVN0eWxlQ29tbWFuZD5cbiAgcGxhaW5fdGV4dDogc3RyaW5nXG59KTogc3RyaW5ne1xuICBjaGVja19pbnNlcnRzX3ZhbGlkaXR5KGluc2VydHMpO1xuICBpZiAoc3R5bGVfcG9zaXRpb25zWzBdPy5wb3NpdGlvbiE9PTApXG4gICAgc3R5bGVfcG9zaXRpb25zPVsuLi5zdHlsZV9wb3NpdGlvbnNdXG4gIGNoZWNrX3N0eWxlX3Bvc2l0aW9uc192YWxpZGl0eShzdHlsZV9wb3NpdGlvbnMpO1xuICBjb25zdCBjb21tYW5kcz1tZXJnZShpbnNlcnRzLHN0eWxlX3Bvc2l0aW9ucylcbiAgY29uc3QgaHRtbDpzdHJpbmdbXT0gW107XG5cbiAgbGV0IGNvbW1hbmRfaGVhZCA9IDA7XG4gIGxldCBwdXNoZWRfc3R5bGU6U3R5bGV8dW5kZWZpbmVkXG4gIGZ1bmN0aW9uIHB1c2hfc3R5bGUoc3R5bGU6U3R5bGUpe1xuICAgIGlmIChwdXNoZWRfc3R5bGUhPW51bGwpe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic3R5bGUgYWxyZWF5IG9wZW5cIilcbiAgICB9ICAgIFxuICAgIGh0bWwucHVzaChgPHNwYW4gJHtnZXRfc3R5bGVfY3NzKHN0eWxlKX0+YCk7XG4gICAgcHVzaGVkX3N0eWxlPXN0eWxlXG4gIH1cbiAgZnVuY3Rpb24gcG9wX3N0eWxlKGFsbG93X2VtcHR5OmJvb2xlYW4peyBcbiAgICBpZiAocHVzaGVkX3N0eWxlPT1udWxsKXtcbiAgICAgIGlmIChhbGxvd19lbXB0eSlcbiAgICAgICAgcmV0dXJuIG1ha2VfY2xlYXJfc3R5bGVfY29tbWFuZCgwKS5zdHlsZVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBudWxsIHN0eWxlXCIpXG4gICAgfVxuICAgIGNvbnN0IGFucz1wdXNoZWRfc3R5bGVcbiAgICBwdXNoZWRfc3R5bGU9dW5kZWZpbmVkXG4gICAgaHRtbC5wdXNoKGA8L3NwYW4+YCk7XG4gICAgcmV0dXJuIGFuc1xuICB9XG4gIGZ1bmN0aW9uIGdldF9jb21tYW5kKHBvc2l0aW9uOm51bWJlcil7XG4gICAgZm9yKDs7KXtcbiAgICAgIGNvbnN0IGFucz1jb21tYW5kc1tjb21tYW5kX2hlYWRdXG4gICAgICBpZiAoYW5zPT1udWxsKVxuICAgICAgICByZXR1cm4gXG4gICAgICBpZiAoYW5zLnBvc2l0aW9uPT09cG9zaXRpb24pXG4gICAgICAgIHJldHVybiBhbnNcbiAgICAgIGlmIChhbnMucG9zaXRpb24+cG9zaXRpb24pXG4gICAgICAgIHJldHVyblxuICAgICAgY29tbWFuZF9oZWFkKytcbiAgICB9XG4gIH1cbiAgZm9yIChsZXQgaSA9IDA7IGkgPD0gcGxhaW5fdGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNvbW1hbmQ9Z2V0X2NvbW1hbmQoaSlcbiAgICBpZiAoaXNfaW5zZXJ0X2NvbW1hbmQoY29tbWFuZCkpe1xuICAgICAgY29uc3Qgc3R5bGU9cG9wX3N0eWxlKGk9PT0wKVxuICAgICAgaHRtbC5wdXNoKGNvbW1hbmQuc3RyKVxuICAgICAgcHVzaF9zdHlsZShzdHlsZSlcbiAgICB9XG4gICAgaWYgKGlzX3N0eWxlX2NvbW1hbmQoY29tbWFuZCkpe1xuICAgICAgcG9wX3N0eWxlKGk9PT0wKVxuICAgICAgcHVzaF9zdHlsZShjb21tYW5kLnN0eWxlKVxuICAgIH1cbiAgICBpZiAoaXNfc3R5bGVfaW5zZXJ0X2NvbW1hbmQoY29tbWFuZCkpe1xuICAgICAgcG9wX3N0eWxlKGk9PT0wKVxuICAgICAgaHRtbC5wdXNoKGNvbW1hbmQuc3RyKVxuICAgICAgcHVzaF9zdHlsZShjb21tYW5kLnN0eWxlKSAgICAgIFxuICAgIH1cbiAgICBjb25zdCBjPXBsYWluX3RleHRbaV0hXG4gICAgaHRtbC5wdXNoKGMpXG4gIH1cbiAgcG9wX3N0eWxlKHBsYWluX3RleHQubGVuZ3RoPT09MClcbiAgY29uc3QgYW5zPWh0bWwuam9pbignJylcbiAgcmV0dXJuIGFuc1xufVxuXG4vKipcbiAqIE1hcHMgc3RhbmRhcmQgQU5TSSBjb2xvciBjb2RlcyB0byBDU1MgbmFtZWQgY29sb3JzLlxuICovXG5mdW5jdGlvbiBnZXRBbnNpTmFtZWRDb2xvcihjb2RlOiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBtYXA6IFJlY29yZDxudW1iZXIsIHN0cmluZz4gPSB7XG4gICAgMDogXCJibGFja1wiLCAxOiBcInJlZFwiLCAyOiBcImdyZWVuXCIsIDM6IFwieWVsbG93XCIsIDQ6IFwiYmx1ZVwiLCA1OiBcIm1hZ2VudGFcIiwgNjogXCJjeWFuXCIsIDc6IFwid2hpdGVcIixcbiAgICA4OiBcImdyYXlcIiwgOTogXCJyZWRcIiwgMTA6IFwibGltZVwiLCAxMTogXCJ5ZWxsb3dcIiwgMTI6IFwiYmx1ZVwiLCAxMzogXCJmdWNoc2lhXCIsIDE0OiBcImFxdWFcIiwgMTU6IFwid2hpdGVcIlxuICB9O1xuICByZXR1cm4gbWFwW2NvZGVdIHx8IFwid2hpdGVcIjtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyA4LWJpdCBBTlNJICgwLTI1NSkgdG8gYSBDU1MgY29sb3Igc3RyaW5nLlxuICovXG5mdW5jdGlvbiBnZXQ4Qml0Q29sb3IobjogbnVtYmVyKTogc3RyaW5nIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuIGdldEFuc2lOYW1lZENvbG9yKG4pO1xuICBpZiAobiA+PSAyMzIpIHtcbiAgICBjb25zdCB2ID0gKG4gLSAyMzIpICogMTAgKyA4O1xuICAgIHJldHVybiBgcmdiKCR7dn0sJHt2fSwke3Z9KWA7XG4gIH1cbiAgY29uc3QgbjIgPSBuIC0gMTY7XG4gIGNvbnN0IHIgPSBNYXRoLmZsb29yKG4yIC8gMzYpICogNTE7XG4gIGNvbnN0IGcgPSBNYXRoLmZsb29yKChuMiAlIDM2KSAvIDYpICogNTE7XG4gIGNvbnN0IGIgPSAobjIgJSA2KSAqIDUxO1xuICByZXR1cm4gYHJnYigke3J9LCR7Z30sJHtifSlgO1xufVxuXG5mdW5jdGlvbiBjbG9uZV9zdHlsZShzdHlsZTogU3R5bGUpOiBTdHlsZSB7XG4gIC8vIFJlcXVpcmVtZW50OiBpZiBhbGwgZm9udCBzdHlsZXMgYXJlIG5vcm1hbCwgZG9uJ3QgcmVwb3J0ICdub3JtYWwnXG4gIHJldHVybiB7Li4uc3R5bGUsZm9udF9zdHlsZXM6bmV3IFNldChzdHlsZS5mb250X3N0eWxlcyl9XG59XG5cbmZ1bmN0aW9uIGlzX3NhbWVfc3R5bGUoYTogU3R5bGV8dW5kZWZpbmVkLCBiOiBTdHlsZSk6IGJvb2xlYW4ge1xuICBpZiAoYSA9PSBudWxsKVxuICAgIHJldHVybiBmYWxzZVxuICBpZiAoYS5mb3JlZ3JvdW5kICE9PSBiLmZvcmVncm91bmQgfHwgYS5iYWNrZ3JvdW5kICE9PSBiLmJhY2tncm91bmQpXG4gICAgcmV0dXJuIGZhbHNlXG4gIGlmIChhLmZvbnRfc3R5bGVzLnNpemUgIT09IGIuZm9udF9zdHlsZXMuc2l6ZSlcbiAgICByZXR1cm4gZmFsc2VcbiAgZm9yIChjb25zdCBzdHlsZSBvZiBhLmZvbnRfc3R5bGVzKVxuICAgIGlmICghYi5mb250X3N0eWxlcy5oYXMoc3R5bGUpKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gIHJldHVybiB0cnVlXG59XG5cbmZ1bmN0aW9uIGFwcGx5U0dSQ29kZShwYXJhbXM6IG51bWJlcltdLCBzdHlsZTogU3R5bGUpOiB2b2lkIHtcbiAgLy90b2RvIGdvdG8gYW5kIHZlcmlmeSB0aGF0IGNvcnJlY3QgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDg0MjQyNC9saXN0LW9mLWFuc2ktY29sb3ItZXNjYXBlLXNlcXVlbmNlc1xuICBsZXQgaSA9IDA7XG4gIHdoaWxlIChpIDwgcGFyYW1zLmxlbmd0aCkge1xuICAgIGNvbnN0IGNvZGUgPSBwYXJhbXNbaV0hO1xuXG4gICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgIHN0eWxlLmZvcmVncm91bmQgPSB1bmRlZmluZWQ7XG4gICAgICBzdHlsZS5iYWNrZ3JvdW5kID0gdW5kZWZpbmVkO1xuICAgICAgc3R5bGUuZm9udF9zdHlsZXMuY2xlYXIoKTtcbiAgICAgIGkrKztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIEZvbnQgU3R5bGVzXG4gICAgaWYgKGNvZGUgPT09IDEpIHsgc3R5bGUuZm9udF9zdHlsZXMuYWRkKCdib2xkJyk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gMikgeyBzdHlsZS5mb250X3N0eWxlcy5hZGQoJ2ZhaW50Jyk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gMykgeyBzdHlsZS5mb250X3N0eWxlcy5hZGQoJ2l0YWxpYycpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDQpIHsgc3R5bGUuZm9udF9zdHlsZXMuYWRkKCd1bmRlcmxpbmUnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSA1KSB7IHN0eWxlLmZvbnRfc3R5bGVzLmFkZCgnYmxpbmtpbmcnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID09PSA3KSB7IHN0eWxlLmZvbnRfc3R5bGVzLmFkZCgnaW52ZXJzZScpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDkpIHsgc3R5bGUuZm9udF9zdHlsZXMuYWRkKCdzdHJpa2V0aHJvdWdoJyk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gMjIpIHsgc3R5bGUuZm9udF9zdHlsZXMuZGVsZXRlKCdmYWludCcpO3N0eWxlLmZvbnRfc3R5bGVzLmRlbGV0ZSgnYm9sZCcpOyBpKys7IGNvbnRpbnVlOyB9XG5cbiAgICAvLyBGb3JlZ3JvdW5kIChTdGFuZGFyZCAmIEJyaWdodClcbiAgICBpZiAoY29kZSA+PSAzMCAmJiBjb2RlIDw9IDM3KSB7IHN0eWxlLmZvcmVncm91bmQgPSBnZXRBbnNpTmFtZWRDb2xvcihjb2RlIC0gMzApOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPj0gOTAgJiYgY29kZSA8PSA5NykgeyBzdHlsZS5mb3JlZ3JvdW5kID0gZ2V0QW5zaU5hbWVkQ29sb3IoY29kZSAtIDkwICsgOCk7IGkrKzsgY29udGludWU7IH1cbiAgICBpZiAoY29kZSA9PT0gMzkpIHsgc3R5bGUuZm9yZWdyb3VuZCA9IHVuZGVmaW5lZDsgaSsrOyBjb250aW51ZTsgfVxuXG4gICAgLy8gQmFja2dyb3VuZCAoU3RhbmRhcmQgJiBCcmlnaHQpXG4gICAgaWYgKGNvZGUgPj0gNDAgJiYgY29kZSA8PSA0NykgeyBzdHlsZS5iYWNrZ3JvdW5kID0gZ2V0QW5zaU5hbWVkQ29sb3IoY29kZSAtIDQwKTsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChjb2RlID49IDEwMCAmJiBjb2RlIDw9IDEwNykgeyBzdHlsZS5iYWNrZ3JvdW5kID0gZ2V0QW5zaU5hbWVkQ29sb3IoY29kZSAtIDEwMCArIDgpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGNvZGUgPT09IDQ5KSB7IHN0eWxlLmJhY2tncm91bmQgPSB1bmRlZmluZWQ7IGkrKzsgY29udGludWU7IH1cblxuICAgIC8vIEV4dGVuZGVkIENvbG9ycyAoMzg9RkcsIDQ4PUJHKVxuICAgIGlmIChjb2RlID09PSAzOCB8fCBjb2RlID09PSA0OCkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gY29kZSA9PT0gMzggPyAnZm9yZWdyb3VuZCcgOiAnYmFja2dyb3VuZCc7XG4gICAgICBjb25zdCB0eXBlID0gcGFyYW1zW2kgKyAxXTtcblxuICAgICAgaWYgKHR5cGUgPT09IDUpIHsgLy8gOC1iaXRcbiAgICAgICAgc3R5bGVbdGFyZ2V0XSA9IGdldDhCaXRDb2xvcihwYXJhbXNbaSArIDJdISk7XG4gICAgICAgIGkgKz0gMztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZSA9PT0gMikgeyAvLyAyNC1iaXRcbiAgICAgICAgc3R5bGVbdGFyZ2V0XSA9IGByZ2IoJHtwYXJhbXNbaSArIDJdfSwke3BhcmFtc1tpICsgM119LCR7cGFyYW1zW2kgKyA0XX0pYDtcbiAgICAgICAgaSArPSA1O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpKys7XG4gIH1cbn1cbmZ1bmN0aW9uIGRlZHVwX3Bvc2l0aW9ucyhzdHlsZV9wb3NpdGlvbnM6QXJyYXk8QW5zaVN0eWxlQ29tbWFuZD4pe1xuICBjb25zdCBhbnM9W11cbiAgbGV0IGxhc3Q6QW5zaVN0eWxlQ29tbWFuZHx1bmRlZmluZWRcbiAgZm9yIChjb25zdCB4IG9mIHN0eWxlX3Bvc2l0aW9ucyl7XG4gICAgY29uc3Qgc2FtZT1pc19zYW1lX3N0eWxlKGxhc3Q/LnN0eWxlLHguc3R5bGUpXG4gICAgbGFzdD14XG4gICAgaWYgKCFzYW1lKVxuICAgICAgYW5zLnB1c2goeClcbiAgfVxuICByZXR1cm4gYW5zXG59XG5leHBvcnQgZnVuY3Rpb24gc3RyaXBfYW5zaSh0ZXh0OiBzdHJpbmcsIHN0YXJ0X3N0eWxlOiBTdHlsZSl7XG4gIGNvbnN0IHN0eWxlX3Bvc2l0aW9uczogQXJyYXk8QW5zaVN0eWxlQ29tbWFuZD4gPSBbXTtcbiAgY29uc3Qgc3RyaW5ncz1bXVxuICBjb25zdCBjdXJyZW50X3N0eWxlID0geyAuLi5zdGFydF9zdHlsZSwgZm9udF9zdHlsZXM6IG5ldyBTZXQoc3RhcnRfc3R5bGUuZm9udF9zdHlsZXMpIH07XG4gIGNvbnN0IGxpbmtfaW5zZXJ0czpBcnJheTxBbnNpSW5zZXJ0Q29tbWFuZD49W11cblxuICBsZXQgbGFzdF9pbmRleCA9IDA7XG4gIGxldCBwb3NpdGlvbj0wXG5cbiAgZm9yIChjb25zdCBtYXRjaCBvZiB0ZXh0Lm1hdGNoQWxsKGFuc2lfcmVnZXgpKXtcbiAgICAvLyAxLiBBY2N1bXVsYXRlIHBsYWluIHRleHRcbiAgICBjb25zdCB7aW5kZXh9PW1hdGNoXG4gICAgY29uc3Qgc2tpcF9zdHI9dGV4dC5zbGljZShsYXN0X2luZGV4LCBpbmRleClcbiAgICBwb3NpdGlvbis9c2tpcF9zdHIubGVuZ3RoXG4gICAgc3RyaW5ncy5wdXNoKHNraXBfc3RyKVxuICAgIFxuXG4gICAgY29uc3Qgc2VxdWVuY2UgPSBtYXRjaFswXTtcbiAgICBsYXN0X2luZGV4ID0gaW5kZXgrc2VxdWVuY2UubGVuZ3RoXG4gICAgLy8gMi4gRmlsdGVyIGZvciBTR1Igb25seSAoRVNDIFsgLi4uIG0pXG4gICAgLyppZiBsaW5rIHRoYW4gY3JlYXRlIGEgcGFyc2VSYW5nZSBhbmQgcmV0dXJuIGl0LiByZW1vdmUgYWxsIGxpbmsgdGV4dCBmcm9tIHBsYWluX3RleHQqL1xuICAgIGlmICghc2VxdWVuY2Uuc3RhcnRzV2l0aCgnXFx4MWJbJykgfHwgIXNlcXVlbmNlLmVuZHNXaXRoKCdtJykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIDMuIFBhcnNlIHBhcmFtZXRlcnNcbiAgICBjb25zdCBwYXJhbXMgPSBzZXF1ZW5jZS5zbGljZSgyLCAtMSkuc3BsaXQoJzsnKS5tYXAocCA9PiBwYXJzZUludChwIHx8IFwiMFwiLCAxMCkpO1xuICAgIGFwcGx5U0dSQ29kZShwYXJhbXMsIGN1cnJlbnRfc3R5bGUpO1xuXG4gICAgLy8gNC4gQ2FwdHVyZSBzdGF0ZVxuICAgIGNvbnN0IGNsb25lZDpBbnNpU3R5bGVDb21tYW5kPXtzdHlsZTpjbG9uZV9zdHlsZShjdXJyZW50X3N0eWxlKSxwb3NpdGlvbixjb21tYW5kOidzdHlsZSd9XG4gICAgY29uc3QgbGFzdF9zdHlsZT1zdHlsZV9wb3NpdGlvbnMuYXQoLTEpXG4gICAgaWYgKGlzX3NhbWVfc3R5bGUobGFzdF9zdHlsZT8uc3R5bGUsIGNsb25lZC5zdHlsZSkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgaWYgKGxhc3Rfc3R5bGU/LnBvc2l0aW9uPT09cG9zaXRpb24pIHtcbiAgICAgIHN0eWxlX3Bvc2l0aW9ucy5zcGxpY2UoLTEsMSxjbG9uZWQpXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBzdHlsZV9wb3NpdGlvbnMucHVzaChjbG9uZWQpXG4gICAgLy9pZiAoaXNfc2FtZV9zdHlsZShzdHlsZV9wb3NpdGlvbnMuYXQoLTEpLHN0eWxlX3Bvc2l0aW9ucy5hdCgtMikpKVxuICAgIC8vY29uc29sZS5sb2coJ2FmdGVyX2J1ZycpXG4gIH1cbiAgY29uc3QgZGVkdXBlZD1kZWR1cF9wb3NpdGlvbnMoc3R5bGVfcG9zaXRpb25zKS8vZGVkdXBfcG9zaXRpb25zIGlzIG5lZWRlZCBldmVuIHRob293IHdlIGtub3dlbiBvdXQgYSBmZXcgYWJvdmUgXG4gIGNvbnN0IHdpdGhfcG9zMD1mdW5jdGlvbigpeyAvL2kgd2FudCBhIHN0eWxlIGF0IHBvcyAwIHRvIGhlbHAgdGhlIGxvZ2ljIG9mIGdlbmV0YXRlX2h0bWxcbiAgICBpZiAoZGVkdXBlZFswXT8ucG9zaXRpb24hPT0wKVxuICAgICAgcmV0dXJuIFttYWtlX2NsZWFyX3N0eWxlX2NvbW1hbmQoMCksLi4uZGVkdXBlZF1cbiAgICByZXR1cm4gZGVkdXBlZFxuICB9KClcbiAgY29uc3QgYW5zPSB7XG4gICAgcGxhaW5fdGV4dDpzdHJpbmdzLmpvaW4oJycpK3RleHQuc2xpY2UobGFzdF9pbmRleCksXG4gICAgc3R5bGVfcG9zaXRpb25zOndpdGhfcG9zMCxcbiAgICBsaW5rX2luc2VydHNcbiAgfTsgXG4gIC8vY29uc29sZS5sb2coYW5zKVxuICByZXR1cm4gYW5zXG59XG4iLCAiXG5pbXBvcnQgIHt0eXBlIFN0eWxlLHN0cmlwX2Fuc2ksZ2VuZXJhdGVfaHRtbCx0eXBlIEFuc2lJbnNlcnRDb21tYW5kLCBtZXJnZV9pbnNlcnRzfSBmcm9tICcuL3Rlcm1pbmFsc19hbnNpLmpzJztcbmltcG9ydCB7Z2V0X3BhcmVudF93aXRoX2RhdGFzZXR9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuZXhwb3J0IGludGVyZmFjZSBQYXJzZVJhbmdle1xuICBzdGFydDpudW1iZXJcbiAgZW5kOm51bWJlclxuICB2YWx1ZXM6UmVjb3JkPHN0cmluZyxzdHJpbmc+XG59XG5leHBvcnQgaW50ZXJmYWNlIFRlcm1pbmFsTGlzdGVuZXJ7XG4gIHBhcnNlOihsaW5lX3RleHQ6c3RyaW5nLHN0YXRlOnVua25vd24pPT57XG4gICAgcGFyc2VyX3N0YXRlOnVua25vd24sXG4gICAgcmFuZ2VzOkFycmF5PFBhcnNlUmFuZ2U+IFxuICB9XG4gIGxpbmtfY2xpY2s6KHZhbHVlczpSZWNvcmQ8c3RyaW5nLHN0cmluZz4pPT52b2lkXG59XG50eXBlIENoYW5uZWw9J3N0ZGVycid8J3N0ZG91dCcgXG5pbnRlcmZhY2UgQ2hhbm5lbFN0YXRle1xuICBsYXN0X2xpbmU6c3RyaW5nXG4gIHBhcnNlcl9zdGF0ZTp1bmtub3duXG4gIHN0eWxlOlN0eWxlXG59XG5jb25zdCBjbGVhcl9zdHlsZTpTdHlsZT17XG4gIGZvcmVncm91bmQ6IHVuZGVmaW5lZCxcbiAgYmFja2dyb3VuZDogdW5kZWZpbmVkLFxuICBmb250X3N0eWxlczogbmV3IFNldCgpXG59XG5mdW5jdGlvbiBtYWtlX2NoYW5uZWxfc3RhdGVzKCk6UmVjb3JkPENoYW5uZWwsQ2hhbm5lbFN0YXRlPntcbiAgcmV0dXJuIHtcbiAgICBzdGRvdXQ6e2xhc3RfbGluZTonJyxwYXJzZXJfc3RhdGU6dW5kZWZpbmVkLHN0eWxlOmNsZWFyX3N0eWxlfSxcbiAgICBzdGRlcnI6e2xhc3RfbGluZTonJyxwYXJzZXJfc3RhdGU6dW5kZWZpbmVkLHN0eWxlOmNsZWFyX3N0eWxlfVxuICB9XG59XG5mdW5jdGlvbiByYW5nZV90b19pbnNlcnRzKHJhbmdlOlBhcnNlUmFuZ2UpOkFuc2lJbnNlcnRDb21tYW5kW117XG4gIGNvbnN0IHtzdGFydCxlbmQsdmFsdWVzfT1yYW5nZVxuICBjb25zdCBkYXRhbWFwPU9iamVjdC5lbnRyaWVzKHZhbHVlcykubWFwKChbayx2XSk9PmBkYXRhLSR7a309JyR7dn0nYCkuam9pbignJylcbiAgY29uc3Qgb3Blbj1gPHNwYW4gJHtkYXRhbWFwfT5gXG4gIGNvbnN0IGNsb3NlPWA8L3NwYW4+YFxuICByZXR1cm4gW3twb3NpdGlvbjpzdGFydCxzdHI6b3Blbixjb21tYW5kOidpbnNlcnQnfSx7cG9zaXRpb246ZW5kLHN0cjpjbG9zZSxjb21tYW5kOidpbnNlcnQnfV1cbn1cbmZ1bmN0aW9uIHJhbmdlc190b19pbnNlcnRzKHJhbmdlczpBcnJheTxQYXJzZVJhbmdlPil7XG4gIHJldHVybiByYW5nZXMuZmxhdE1hcChyYW5nZV90b19pbnNlcnRzKVxufVxuZnVuY3Rpb24gZ2V0X2VsZW1lbnRfZGF0YXNldCAoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhPYmplY3QuZW50cmllcyhlbGVtZW50LmRhdGFzZXQpKSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufTtcbmV4cG9ydCBjbGFzcyBUZXJtaW5hbHtcbiAgY2hhbm5lbF9zdGF0ZXNcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSB0ZXJtX2VsOkhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgbGlzdGVuZXI6VGVybWluYWxMaXN0ZW5lclxuICApe1xuICAgIHRoaXMuY2hhbm5lbF9zdGF0ZXM9bWFrZV9jaGFubmVsX3N0YXRlcygpXG4gICAgdGhpcy50ZXJtX2VsLmlubmVySFRNTD0nJ1xuICAgIHRoaXMudGVybV9lbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsdGhpcy5vbmNsaWNrKVxuICB9XG4gIG9uY2xpY2s9KGV2ZW50Ok1vdXNlRXZlbnQpPT57XG4gICAgY29uc3Qge3RhcmdldH09ZXZlbnRcbiAgICBpZiAoISh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpXG4gICAgICByZXR1cm4gICAgXG4gICAgY29uc3QgcGFyZW50PWdldF9wYXJlbnRfd2l0aF9kYXRhc2V0KHRhcmdldClcbiAgICBpZiAocGFyZW50PT1udWxsKVxuICAgICAgcmV0dXJuICBcbiAgICBjb25zdCBkYXRhc2V0PWdldF9lbGVtZW50X2RhdGFzZXQocGFyZW50KVxuICAgIHRoaXMubGlzdGVuZXIubGlua19jbGljayhkYXRhc2V0KVxuICB9XG4gIGxpbmVfdG9faHRtbD0oeDpzdHJpbmcsc3RhdGU6Q2hhbm5lbFN0YXRlLGxpbmVfY2xhc3M6c3RyaW5nKT0+e1xuICAgIGNvbnN0IHtcbiAgICAgIHBsYWluX3RleHQsXG4gICAgICBzdHlsZV9wb3NpdGlvbnMsXG4gICAgICBsaW5rX2luc2VydHNcbiAgICB9PXN0cmlwX2Fuc2koeCwgc3RhdGUuc3R5bGUpXG4gICAgc3RhdGUuc3R5bGU9c3R5bGVfcG9zaXRpb25zLmF0KC0xKSEuc3R5bGUgLy9zdHJpcF9hbnNpIGlzIGd1cmFudGllZCB0byBoYXZlIGF0IGxlYXN0IG9uZSBpbiBzdHlsZSBwb3NpdG9ucy4gaSB0cmllZCB0byBlbmNvZGUgaXQgaW4gdHMgYnV0IHdhcyB0b28gdmVyYm9zZSB0byBteSBsaWtpbmdcbiAgICBjb25zdCB7cmFuZ2VzLHBhcnNlcl9zdGF0ZX09dGhpcy5saXN0ZW5lci5wYXJzZShwbGFpbl90ZXh0LHN0YXRlLnBhcnNlcl9zdGF0ZSlcbiAgICBzdGF0ZS5wYXJzZXJfc3RhdGU9cGFyc2VyX3N0YXRlXG4gICAgY29uc3QgcmFuZ2VfaW5zZXJ0cz1yYW5nZXNfdG9faW5zZXJ0cyhyYW5nZXMpXG4gICAgY29uc3QgaW5zZXJ0cz1tZXJnZV9pbnNlcnRzKHJhbmdlX2luc2VydHMsbGlua19pbnNlcnRzKVxuICAgIGNvbnN0IGh0bWw9Z2VuZXJhdGVfaHRtbCh7c3R5bGVfcG9zaXRpb25zLGluc2VydHMscGxhaW5fdGV4dH0pXG4gICAgY29uc3QgYnI9KHBsYWluX3RleHQ9PT0nJz8nPGJyPic6JycpXG4gICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiJHtsaW5lX2NsYXNzfVwiPiR7aHRtbH0ke2JyfTwvZGl2PmBcbiAgfVxuICBhZnRlcl93cml0ZSgpe1xuICAgIHRoaXMudGVybV9lbC5xdWVyeVNlbGVjdG9yKCcuZW9mJyk/LmNsYXNzTGlzdC5yZW1vdmUoJ2VvZicpXG4gICAgdGhpcy50ZXJtX2VsLmxhc3RFbGVtZW50Q2hpbGQ/LmNsYXNzTGlzdC5hZGQoJ2VvZicpXG4gIH1cbiAgdGVybV93cml0ZShvdXRwdXQ6c3RyaW5nW10sY2hhbm5lbDpDaGFubmVsKXtcbiAgICBpZiAob3V0cHV0Lmxlbmd0aD09PTApXG4gICAgICByZXR1cm5cbiAgICBjb25zdCBjaGFubmVsX3N0YXRlPXRoaXMuY2hhbm5lbF9zdGF0ZXNbY2hhbm5lbF1cbiAgICBjb25zdCBsaW5lX2NsYXNzPWBsaW5lXyR7Y2hhbm5lbH1gXG4gICAgY29uc3Qgam9pbmVkX2xpbmVzPVtjaGFubmVsX3N0YXRlLmxhc3RfbGluZSwuLi5vdXRwdXRdLmpvaW4oJycpLnJlcGxhY2VBbGwoJ1xcclxcbicsJ1xcbicpXG4gICAgY29uc3QgbGluZXM9am9pbmVkX2xpbmVzLnNwbGl0KCdcXG4nKVxuICBcbiAgICBpZiAoY2hhbm5lbF9zdGF0ZS5sYXN0X2xpbmUhPT0nJylcbiAgICAgIHRoaXMudGVybV9lbC5xdWVyeVNlbGVjdG9yKGAuJHtsaW5lX2NsYXNzfTpsYXN0LWNoaWxkYCk/LnJlbW92ZSgpXG4gICAgY2hhbm5lbF9zdGF0ZS5sYXN0X2xpbmU9bGluZXMuYXQoLTEpfHwnJ1xuICAgIGNvbnN0IGxpbmVzX3RvX3JlbmRlciA9IGNoYW5uZWxfc3RhdGUubGFzdF9saW5lID09PSAnJyA/IGxpbmVzLnNsaWNlKDAsLTEpIDogbGluZXNcbiAgICBjb25zdCBuZXdfaHRtbD1saW5lc190b19yZW5kZXIubWFwKHg9PnRoaXMubGluZV90b19odG1sKHgsY2hhbm5lbF9zdGF0ZSxsaW5lX2NsYXNzKSkuam9pbignJylcbiAgICB0aGlzLnRlcm1fZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLG5ld19odG1sKVxuICB9XG4gIFxuICB0ZXJtX2NsZWFyKCl7XG4gICAgdGhpcy50ZXJtX2VsLmlubmVySFRNTD0nJ1xuICAgIHRoaXMuY2hhbm5lbF9zdGF0ZXM9bWFrZV9jaGFubmVsX3N0YXRlcygpXG4gICAgICAvKnN0ZG91dDp7bGFzdF9saW5lOicnLGFuY29yZTp1bmRlZmluZWQsc3R5bGU6Y2xlYXJfc3R5bGV9LFxuICAgICAgc3RkZXJyOntsYXN0X2xpbmU6JycsYW5jb3JlOnVuZGVmaW5lZCxzdHlsZTpjbGVhcl9zdHlsZX1cbiAgICB9ICAgKi8gXG4gIH1cblxufSIsICJpbXBvcnQge3BhcnNlX2dyb3VwX3N0cmluZ30gZnJvbSAnLi90ZXJtaW5hbHNfYW5zaS5qcydcbmltcG9ydCB0eXBlIHtQYXJzZVJhbmdlfSBmcm9tICcuL3Rlcm1pbmFsLmpzJ1xuXG5mdW5jdGlvbiBjYXB0dXJlKG5hbWU6c3RyaW5nKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKC4uLmNvbnRlbnQ6c3RyaW5nW10pe1xuICAgIHJldHVybiBgKD88JHtuYW1lfT4ke2NvbnRlbnQuam9pbignJyl9KWBcbiAgfVxufVxuICAvL2NvbnN0IGxpbmtzX3JlZ2V4MiA9IHJlKCdnJylcbmZ1bmN0aW9uIG5lZ19sb29rYWhlYWQoLi4ucGF0OnN0cmluZ1tdKXtcbiAgcmV0dXJuIGAoPyEke3BhdC5qb2luKCcnKX0pYFxufVxuZnVuY3Rpb24gbmVnX2xvb2tiZWhpbmQoLi4ucGF0OnN0cmluZ1tdKXtcbiAgcmV0dXJuIGAoPzwhJHtwYXQuam9pbignJyl9KWBcbn1cbmZ1bmN0aW9uIHNlcSguLi5wYXQ6c3RyaW5nW10pe1xuICByZXR1cm4gcGF0LmpvaW4oJycpXG59XG5mdW5jdGlvbiBncm91cCguLi5wYXQ6c3RyaW5nW10pe1xuICByZXR1cm4gYCgke3BhdC5qb2luKCcnKX0pYFxufVxuZnVuY3Rpb24gb3IoLi4ucGF0OnN0cmluZ1tdKXtcbiAgcmV0dXJuIGAoJHtwYXQuam9pbignfCcpfSlgXG59XG5mdW5jdGlvbiBtYWtlX3JlKGZsYWdzOnN0cmluZyl7XG4gIHJldHVybiBmdW5jdGlvbiguLi5wYXQ6c3RyaW5nW10pe1xuICAgIHJldHVybiBuZXcgUmVnRXhwKHBhdC5qb2luKCcnKSxmbGFncylcbiAgfVxufVxuXG5jb25zdCByID0gU3RyaW5nLnJhdztcbmNvbnN0IGRpZ2l0cz1yYFxcZCtgXG5jb25zdCByb3c9Y2FwdHVyZSgncm93JykoZGlnaXRzKVxuY29uc3QgY29sPWNhcHR1cmUoJ2NvbCcpKGRpZ2l0cylcbmNvbnN0IG9wdGlvbmFsX3Jvd2NvbD1zZXEoXG4gIG9yKFxuICAgIGdyb3VwKHJgXFwoYCxyb3csJywnLGNvbCxyYFxcKWApLFxuICAgIGdyb3VwKCc6Jyxyb3csJzonLGNvbCksXG4gICksXG4gICc/J1xuKVxuY29uc3QgbGlua3NfcmVnZXg9bWFrZV9yZSgnZycpKFxuICBjYXB0dXJlKCdzb3VyY2VfZmlsZScpKCAgICAgICAgICAgIC8vIGNhcHR1cmUgZ3JvdXAgc291cmNlX2ZpbGVcbiAgICBuZWdfbG9va2JlaGluZChgWy5hLXpBLVpdYCksXG4gICAgYChbYS16QS1aXTopP2AsICAgICAgICAgICAgICAgLy9vcHRpb25hbCBkcml2ZSBjaGFyIGZvbGxvd2VkIGJ5IGNvbG9uXG4gICAgcmBbYS16QS1aMC05Xy9cXFxcQC4tXStgLCAgICAgICAgLy9vbmUgb3IgbW9yZSBmaWxlIG5hbWUgY2hhcmVjdGVyc1xuICAgIGBbLl1gLFxuICAgIGBbYS16QS1aMC05XStgLFxuICAgIG5lZ19sb29rYWhlYWQoJ1suXScpICAgICAgICAgICAgICAgICAgICAvL2Rpc2FsbG93IGRvdCBpbW1lZGlhdGx5IGFmdGVyIHRoZSBtYXRjaFxuICApLFxuICBvcHRpb25hbF9yb3djb2xcbilcblxuY29uc3QgYW5jb3JfcmVnZXg9bWFrZV9yZSgnJykoXG4gICdeJyxcbiAgY2FwdHVyZSgnc291cmNlX2ZpbGUnKShcbiAgICAnKFthLXpBLVpdOik/JyxcbiAgICByYFthLXpBLVowLTlfXFwtLi9cXFxcQF0rYCxcbiAgKSxcbiAgb3B0aW9uYWxfcm93Y29sLFxuICByYFxccyokYFxuKVxuY29uc3QgcmVmX3JlZ2V4ID0gbWFrZV9yZSgnJykoXG4gIHJgXlxccypgLFxuICByb3csXG4gICc6JyxcbiAgY29sLFxuICBgKC4qKWBcbilcbi8vY29uc3Qgb2xkX3JlZl9yZWdleCA9IC9eXFxzKig/PHJvdz5cXGQrKTooPzxjb2w+XFxkKykoLiopL1xuLy9jb25zb2xlLmxvZyh7cmVmX3JlZ2V4LG9sZF9yZWZfcmVnZXh9KVxuZnVuY3Rpb24gbm9fbnVsbHMob2JqOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkPil7XG4gIGNvbnN0IGFuczpSZWNvcmQ8c3RyaW5nLHN0cmluZz49e31cbiAgZm9yIChjb25zdCBbayx2XSBvZiBPYmplY3QuZW50cmllcyhvYmopKVxuICAgIGlmICh2IT1udWxsKVxuICAgICAgYW5zW2tdPXZcbiAgcmV0dXJuIGFuc1xufVxuXG5cbmZ1bmN0aW9uIGNhbGNfbWF0Y2gobWF0Y2g6UmVnRXhwTWF0Y2hBcnJheSk6UGFyc2VSYW5nZXtcbiAgY29uc3QgeyBpbmRleH0gPSBtYXRjaDtcbiAgY29uc3QgdGV4dCA9IG1hdGNoWzBdO1xuICBjb25zdCBzdGFydD0gaW5kZXghXG4gIGNvbnN0IGVuZD0gaW5kZXghICsgdGV4dC5sZW5ndGhcbiAgY29uc3Qgcm93PSBwYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ3JvdycpXG4gIGNvbnN0IGNvbD0gcGFyc2VfZ3JvdXBfc3RyaW5nKG1hdGNoLCdjb2wnKVxuICBjb25zdCBzb3VyY2VfZmlsZT1wYXJzZV9ncm91cF9zdHJpbmcobWF0Y2gsJ3NvdXJjZV9maWxlJylcbiAgcmV0dXJuIHtzdGFydCxlbmQsdmFsdWVzOm5vX251bGxzKHtyb3csY29sLHNvdXJjZV9maWxlfSl9XG59XG5leHBvcnQgZnVuY3Rpb24gcGFyc2VfdG9fcmFuZ2VzKGlucHV0OnN0cmluZyxwYXJzZXJfc3RhdGU6c3RyaW5nfHVuZGVmaW5lZCl7XG4gIGNvbnN0IHJhbmdlczpQYXJzZVJhbmdlW109W11cbiAgY29uc3QgYW5jb3JfbWF0Y2g9aW5wdXQubWF0Y2goYW5jb3JfcmVnZXgpXG4gIGlmIChhbmNvcl9tYXRjaCE9bnVsbCl7XG4gICAgY29uc3QgcmV0PWNhbGNfbWF0Y2goYW5jb3JfbWF0Y2gpXG4gICAgcmFuZ2VzLnB1c2gocmV0KVxuICAgIHJldHVybiB7cGFyc2VyX3N0YXRlOnJldC52YWx1ZXMuc291cmNlX2ZpbGUscmFuZ2VzfVxuICB9XG4gIGlmIChwYXJzZXJfc3RhdGUhPW51bGwpe1xuICAgIGNvbnN0IHJlZl9tYXRjaCA9IGlucHV0Lm1hdGNoKHJlZl9yZWdleClcbiAgICBpZiAocmVmX21hdGNoIT09bnVsbCl7XG4gICAgICBjb25zdCByYW5nZT1jYWxjX21hdGNoKHJlZl9tYXRjaClcbiAgICAgIGNvbnN0IHt2YWx1ZXN9PXJhbmdlXG4gICAgICByYW5nZXMucHVzaCh7XG4gICAgICAgIC4uLmNhbGNfbWF0Y2gocmVmX21hdGNoKSwgLy9ieSB0aGVvcmFtIHdpbGwgc291cmNlX2ZpbGUgd2lsbCBiZSBlbXB0eSBzdHJpbmcgYXQgdGhpcyBsaW5lLCBvdmVycmlkZW4gYnkgdGhlIG5leHRcbiAgICAgICAgdmFsdWVzOnsuLi52YWx1ZXMsc291cmNlX2ZpbGU6cGFyc2VyX3N0YXRlfVxuICAgICAgfSlcbiAgICAgIHJldHVybiB7cGFyc2VyX3N0YXRlLHJhbmdlc31cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IG1hdGNoIG9mIGlucHV0Lm1hdGNoQWxsKGxpbmtzX3JlZ2V4KSl7XG4gICAgICBwYXJzZXJfc3RhdGU9dW5kZWZpbmVkIC8vaWYgZm91bmQgbGluayB0aGFuIGNhbmNlbCB0aGUgYW5jb3JlIG90aGVyd2l6ZSBsZXQgaXQgYmVcbiAgICAgIHJhbmdlcy5wdXNoKGNhbGNfbWF0Y2gobWF0Y2gpKVxuICB9XG4gIHJldHVybiB7cmFuZ2VzLHBhcnNlcl9zdGF0ZX1cbn1cblxuZnVuY3Rpb24gaXNfc3RyaW5nX29yX3VuZGVmaW5lZCh4OnVua25vd24pOiB4IGlzIHN0cmluZ3x1bmRlZmluZWR7XG4gIHJldHVybiAgdHlwZW9mIHggPT09ICdzdHJpbmcnIHx8IHggPT09IHVuZGVmaW5lZDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZV9saW5lKGxpbmU6c3RyaW5nLHBhcnNlcl9zdGF0ZTp1bmtub3duKXtcbiAgaWYgKCFpc19zdHJpbmdfb3JfdW5kZWZpbmVkKHBhcnNlcl9zdGF0ZSkpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZXhwZWN0aW5nIHN0cmluZyBvciB1bmRlZmluZWRcIilcbiAgcmV0dXJuIHBhcnNlX3RvX3JhbmdlcyhsaW5lLHBhcnNlcl9zdGF0ZSlcbn0iLCAiXG5pbXBvcnQgIHt0eXBlIHMydCxkZWZhdWx0X2dldCwgZ2V0X2Vycm9yfSBmcm9tICdAeWlnYWwvYmFzZV90eXBlcydcbmltcG9ydCB7IFRlcm1pbmFsLHR5cGUgVGVybWluYWxMaXN0ZW5lciB9IGZyb20gJy4vdGVybWluYWwuanMnO1xuaW1wb3J0IHtxdWVyeV9zZWxlY3RvcixjcmVhdGVfZWxlbWVudCxnZXRfcGFyZW50X2J5X2NsYXNzLHVwZGF0ZV9jaGlsZF9odG1sLHR5cGUgQ29tcG9uZW50fSBmcm9tICcuL2RvbV91dGlscy5qcydcbmltcG9ydCB0eXBlIHsgRm9sZGVyLFJ1bm5lcixSdW5uZXJSZXBvcnQsUmVhc29uLEZpbGVuYW1lfSBmcm9tICcuLi8uLi9zcmMvZGF0YS5qcyc7XG5pbXBvcnQgIHtwb3N0X21lc3NhZ2UsY2FsY19sYXN0X3J1bn0gZnJvbSAnLi9jb21tb24uanMnXG5pbXBvcnQge3BhcnNlX2xpbmV9IGZyb20gJy4vdGVybWluYWxzX3BhcnNlLmpzJ1xuXG5cbmZ1bmN0aW9uIGZvcm1hdEVsYXBzZWRUaW1lKG1zOiBudW1iZXIsdGl0bGU6c3RyaW5nLHNob3dfbXM6Ym9vbGVhbik6IHN0cmluZyB7XG4gIGNvbnN0IHRvdGFsU2Vjb25kcyA9IE1hdGguZmxvb3IobXMgLyAxMDAwKTtcbiAgY29uc3QgbWlsbGlzZWNvbmRzID0gbXMgJSAxMDAwO1xuICBjb25zdCBzZWNvbmRzID0gdG90YWxTZWNvbmRzICUgNjA7XG4gIGNvbnN0IHRvdGFsTWludXRlcyA9IE1hdGguZmxvb3IodG90YWxTZWNvbmRzIC8gNjApO1xuICBjb25zdCBtaW51dGVzID0gdG90YWxNaW51dGVzICUgNjA7XG4gIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0b3RhbE1pbnV0ZXMgLyA2MCk7XG4gIGNvbnN0IHBhZDIgPSAobjogbnVtYmVyKSA9PiBuLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKTtcbiAgY29uc3QgcGFkMyA9IChuOiBudW1iZXIpID0+IG4udG9TdHJpbmcoKS5wYWRTdGFydCgzLCAnMCcpO1xuICBjb25zdCB0aW1lID1cbiAgICBob3VycyA+IDBcbiAgICAgID8gYCR7cGFkMihob3Vycyl9OiR7cGFkMihtaW51dGVzKX06JHtwYWQyKHNlY29uZHMpfWBcbiAgICAgIDogYCR7cGFkMihtaW51dGVzKX06JHtwYWQyKHNlY29uZHMpfWA7XG4gIGNvbnN0IG1zX2Rpc3BsYXk9c2hvd19tcz9gPHNwYW4gY2xhc3M9bXM+LiR7cGFkMyhtaWxsaXNlY29uZHMpfTwvc3Bhbj5gOicnXG4gIHJldHVybiBgPGRpdiB0aXRsZT1cIiR7dGl0bGV9XCI+JHt0aW1lfSR7bXNfZGlzcGxheX08L2Rpdj5gO1xufVxuZnVuY3Rpb24gcmVsX2NsaWNrKGV2ZW50Ok1vdXNlRXZlbnQsdGFyZ2V0OkhUTUxFbGVtZW50LGVmZmVjdGl2ZV93YXRjaDpGaWxlbmFtZVtdKXtcbiAgY29uc3QgcGFyZW50PWdldF9wYXJlbnRfYnlfY2xhc3ModGFyZ2V0LCdyZWwnKVxuICBpZiAocGFyZW50PT1udWxsKVxuICAgIHJldHVybiBmYWxzZVxuICBcbiAgaWYgKCFldmVudC5jdHJsS2V5KXtcbiAgICBjb25zdCB7dGl0bGV9PXBhcmVudFxuICAgIHBvc3RfbWVzc2FnZSh7XG4gICAgICBjb21tYW5kOiBcImNvbW1hbmRfb3Blbl9maWxlX3Jvd2NvbFwiLFxuICAgICAgd29ya3NwYWNlX2ZvbGRlcjonJyxcbiAgICAgIHNvdXJjZV9maWxlOnRpdGxlLFxuICAgICAgcm93OjAsXG4gICAgICBjb2w6MFxuICAgIH0pXG4gICAgcmV0dXJuIHRydWUgICAgIFxuICB9XG4gIFxuICBjb25zdCByZWw9ZWZmZWN0aXZlX3dhdGNoLmZpbmQoeD0+eC5yZWwuc3RyPT09cGFyZW50LnRleHRDb250ZW50KVxuICBpZiAocmVsIT1udWxsKXtcbiAgICAvL3JlbFxuICAgIHBvc3RfbWVzc2FnZSh7XG4gICAgICBjb21tYW5kOiBcImNvbW1hbmRfb3Blbl9maWxlX3Bvc1wiLFxuICAgICAgcG9zOnJlbC5yZWxcbiAgICB9KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59ICBcblxuZnVuY3Rpb24gbWFrZV9vbmNsaWNrKGVmZmVjdGl2ZV93YXRjaDpGaWxlbmFtZVtdKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50Ok1vdXNlRXZlbnQpe1xuICAgIGNvbnN0IHt0YXJnZXR9PWV2ZW50XG4gICAgaWYgKCEodGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuICAgICAgcmV0dXJuICAgIFxuICAgIHJlbF9jbGljayhldmVudCx0YXJnZXQsZWZmZWN0aXZlX3dhdGNoKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXJtaW5hbF9lbGVtZW50KHJ1bm5lcjpSdW5uZXIpOiBIVE1MRWxlbWVudCB7XG4gIGNvbnN0IHRlcm1zX2NvbnRhaW5lcj1xdWVyeV9zZWxlY3RvcjxIVE1MRWxlbWVudD4oZG9jdW1lbnQuYm9keSwnLnRlcm1zX2NvbnRhaW5lcicpXG4gIGNvbnN0IHtpZH09cnVubmVyXG4gIGNvbnN0IHJldD10ZXJtc19jb250YWluZXIucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oYCMke2lkfWApXG4gIGlmIChyZXQhPW51bGwpXG4gICAgcmV0dXJuIHJldCAvL3RvZG8gY2hlY2sgdGhhdCBpdCBpcyBIVE1MRWxlbWVudFxuICBjb25zdCBhbnM9Y3JlYXRlX2VsZW1lbnQoICBgXG48ZGl2IGNsYXNzPVwidGVybV9wYW5lbFwiIGlkPVwiJHtpZH1cIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+XG4gIDxkaXYgY2xhc3M9XCJ0ZXJtX3RpdGxlX2JhclwiPlxuICAgIDxkaXYgY2xhc3M9XCJpY29uIHRleHRcIj48L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPWNvbW1hbmRzX2ljb25zPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9dGVybV90aXRsZV9kdXJhdGlvbj48L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPWRiZz48L2Rpdj5cbiAgICA8dGFibGUgY2xhc3M9d2F0Y2hpbmc+PC90YWJsZT5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9dGVybT48L2Rpdj5cbjwvZGl2PlxuICBgLHRlcm1zX2NvbnRhaW5lcilcbiAgYW5zLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxtYWtlX29uY2xpY2socnVubmVyLmVmZmVjdGl2ZV93YXRjaCkpXG4gIHJldHVybiBhbnM7XG59XG5mdW5jdGlvbiBjYWxjX2VsYXBzZWRfaHRtbChyZXBvcnQ6UnVubmVyUmVwb3J0LHJ1bm5lcjpSdW5uZXIpe1xuICBjb25zdCBsYXN0X3J1bj1jYWxjX2xhc3RfcnVuKHJlcG9ydCxydW5uZXIpXG4gIGlmIChsYXN0X3J1bj09bnVsbClcbiAgICByZXR1cm4gJydcbiAgY29uc3Qge3N0YXJ0X3RpbWUsZW5kX3RpbWV9PWxhc3RfcnVuXG4gIGNvbnN0IG5vdz1EYXRlLm5vdygpXG4gIGNvbnN0IGVmZmVjdGl2ZV9lbmRfdGltZT1mdW5jdGlvbigpe1xuICAgIGlmIChlbmRfdGltZT09bnVsbClcbiAgICAgIHJldHVybiBub3dcbiAgICByZXR1cm4gZW5kX3RpbWVcbiAgfSgpXG4gIGNvbnN0IHRpbWVfc2luY2VfZW5kPWZ1bmN0aW9uKCl7XG4gICAgaWYgKGVuZF90aW1lPT1udWxsKVxuICAgICAgcmV0dXJuICcnXG4gICAgcmV0dXJuIGZvcm1hdEVsYXBzZWRUaW1lKG5vdy1lbmRfdGltZSxcInRpbWUgc2luY2UgZG9uZVwiLGZhbHNlKSAvL25vdCBzdXJlIGlmIHBlb3BsZSB3b3VsZSBsaWtlIHRoaXNcbiAgfSgpXG4gIGNvbnN0IG5ld190aW1lPWZvcm1hdEVsYXBzZWRUaW1lKGVmZmVjdGl2ZV9lbmRfdGltZS1zdGFydF90aW1lLCdydW4gdGltZScsdHJ1ZSkrdGltZV9zaW5jZV9lbmRcbiAgcmV0dXJuIG5ld190aW1lXG59XG5jb25zdCBpZ25vcmVfcmVhc29uczpSZWFzb25bXT1bJ2luaXRpYWwnLCd1c2VyJ11cbmZ1bmN0aW9uIGNhbGNfcmVhc29uX3RyKHJlcG9ydDpSdW5uZXJSZXBvcnQscnVubmVyOlJ1bm5lcil7XG4gIGNvbnN0IGxhc3RfcnVuPWNhbGNfbGFzdF9ydW4ocmVwb3J0LHJ1bm5lcilcbiAgaWYgKGxhc3RfcnVuPT1udWxsKVxuICAgIHJldHVybiAnJ1xuICBjb25zdCB7ZnVsbF9yZWFzb259PWxhc3RfcnVuXG4gIGNvbnN0IHtyZWFzb24sZnVsbF9maWxlbmFtZX09ZnVsbF9yZWFzb25cbiAgaWYgKGlnbm9yZV9yZWFzb25zLmluY2x1ZGVzKHJlYXNvbikpXG4gICAgcmV0dXJuICcnXG4gIHJldHVybiBgPHRyPjx0ZD4oJHtyZWFzb259KTwvdGQ+PHRkPjxkaXY+PGRpdiBjbGFzcz1yZWwgdGl0bGU9JHtmdWxsX2ZpbGVuYW1lfT4ke2Z1bGxfZmlsZW5hbWV9PC9kaXY+PC9kaXY+PC90ZD48L3RyPmBcbn1cblxuZnVuY3Rpb24gY2FsY193YXRjaGluZ190cihydW5uZXI6UnVubmVyKXtcbiAgaWYgKHJ1bm5lci5lZmZlY3RpdmVfd2F0Y2gubGVuZ3RoPT09MClcbiAgICByZXR1cm4gJydcbiAgY29uc3Qgc2VwPWA8c3BhbiBjbGFzcz1zZXA+IFx1MjAyMiA8L3NwYW4+YFxuICBjb25zdCByZXQ9cnVubmVyLmVmZmVjdGl2ZV93YXRjaC5tYXAoKHtyZWwsZnVsbH0pPT5gPGRpdiB0aXRsZT0nJHtmdWxsfSdjbGFzcz1yZWw+JHtyZWwuc3RyfTwvZGl2PmApLmpvaW4oc2VwKVxuICByZXR1cm4gYDx0cj48dGQ+PGRpdj48ZGl2IGNsYXNzPXRvZ2dsZXNfaWNvbnM+PC9kaXY+V2F0Y2hpbmc6PC90ZD48L2Rpdj48dGQ+PGRpdj4ke3JldH08L2Rpdj48L3RkPjwvdHI+YFxufVxuXG5jbGFzcyBUZXJtaW5hbFBhbmVsIGltcGxlbWVudHMgVGVybWluYWxMaXN0ZW5lcntcbiAgbGFzdF9ydW5faWQ6bnVtYmVyfHVuZGVmaW5lZFxuICBlbFxuICB0ZXJtXG4gIHdvcmtzcGFjZV9mb2xkZXJcblxuICBjb25zdHJ1Y3RvcihcbiAgICBydW5uZXI6UnVubmVyIC8vdGhpcyBpcyBub3Qgc2F2ZWQsIGl0IGRvZW50IGhhdmUgdGhlIHB1YmxpYy9wcml2YXRlLHRoYXQgaW4gcHVycHVzZSBiZWNhc3VlIHJ1bm5lciBoY25hZ2VzXG4gICl7XG4gICAgdGhpcy53b3Jrc3BhY2VfZm9sZGVyPXJ1bm5lci53b3Jrc3BhY2VfZm9sZGVyXG4gICAgdGhpcy5lbD1jcmVhdGVfdGVybWluYWxfZWxlbWVudChydW5uZXIpXG4gICAgdGhpcy50ZXJtPW5ldyBUZXJtaW5hbChxdWVyeV9zZWxlY3Rvcih0aGlzLmVsLCcudGVybScpLHRoaXMpXG4gICAgLy90aGlzLnRlcm1fY2xlYXIoKVxuICB9XG4gIHNldF92aXNpYmlsaXR5KHZhbDpib29sZWFuKXtcbiAgICB0aGlzLmVsLnN0eWxlLmRpc3BsYXk9KHZhbCk/J2ZsZXgnOidub25lJyAgIFxuICB9XG4gIHBhcnNlKGxpbmVfdGV4dDpzdHJpbmcscGFyc2Vfc3RhdGU6dW5rbm93bil7XG4gICAgcmV0dXJuIHBhcnNlX2xpbmUobGluZV90ZXh0LHBhcnNlX3N0YXRlKVxuICB9XG4gIGxpbmtfY2xpY2sodmFsdWVzOlJlY29yZDxzdHJpbmcsc3RyaW5nPil7XG4gICAgY29uc3Qgc291cmNlX2ZpbGU9dmFsdWVzLnNvdXJjZV9maWxlXG4gICAgaWYgKHNvdXJjZV9maWxlPT1udWxsKSAvL3RvZG86IGNoZWNrIHRoYXQgbm90IGVtcHR5IHN0cmluZz9cbiAgICAgIHJldHVyblxuICAgIGNvbnN0IHJvdz1wYXJzZUludCh2YWx1ZXMucm93Pz8nJywxMCl8fDBcbiAgICBjb25zdCBjb2w9cGFyc2VJbnQodmFsdWVzLmNvbD8/JycsMTApfHwwXG4gICAgY29uc3Qge3dvcmtzcGFjZV9mb2xkZXJ9PXRoaXNcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDogXCJjb21tYW5kX29wZW5fZmlsZV9yb3djb2xcIixcbiAgICAgIHdvcmtzcGFjZV9mb2xkZXIsXG4gICAgICBzb3VyY2VfZmlsZSxcbiAgICAgIHJvdyxcbiAgICAgIGNvbFxuICAgIH0pICAgICAgXG4gIH1cbiAgdXBkYXRlX3Rlcm1pbmFsMihyZXBvcnQ6UnVubmVyUmVwb3J0LHJ1bm5lcjpSdW5uZXIpe1xuICAgIC8vY29uc3QgdGl0bGVfYmFyPWNhbGNfdGl0bGVfaHRtbChyZXBvcnQscnVubmVyKVxuICAgIGNvbnN0IHdhdGNoaW5nPSAgYCR7Y2FsY193YXRjaGluZ190cihydW5uZXIpfSAgXG4gICR7Y2FsY19yZWFzb25fdHIocmVwb3J0LHJ1bm5lcil9YFxuICAgIHVwZGF0ZV9jaGlsZF9odG1sKHRoaXMuZWwsJy50ZXJtX3RpdGxlX2JhciAudGVybV90aXRsZV9kdXJhdGlvbicsY2FsY19lbGFwc2VkX2h0bWwocmVwb3J0LHJ1bm5lcikpXG4gICAgdXBkYXRlX2NoaWxkX2h0bWwodGhpcy5lbCwnLnRlcm1fdGl0bGVfYmFyIC53YXRjaGluZycsd2F0Y2hpbmcpXG5cbiAgICBjb25zdCBsYXN0X3J1bj1jYWxjX2xhc3RfcnVuKHJlcG9ydCxydW5uZXIpXG4gICAgaWYgKGxhc3RfcnVuPT1udWxsKVxuICAgICAgcmV0dXJuXG4gICAgY29uc3Qge3J1bl9pZH09bGFzdF9ydW5cbiAgICBpZiAocnVuX2lkIT09dGhpcy5sYXN0X3J1bl9pZCl7XG4gICAgICB0aGlzLnRlcm0udGVybV9jbGVhcigpICAgICBcbiAgICAgIC8vdGhpcy5yZXNldF9saW5rX3Byb3ZpZGVyKCkgLy9ubyBuZWVkIHRvIGRvIGl0IGhlcmUgYmVjYXVzZSB0ZXJtLmNsZWFyIGlzIG5vdCBlZmZlY3RpdmUgaW1taWRlZWF0bHkuIGJ0dGVyIGRvIGl0IG9uIG1hcmtlciBkaXNwb3NlIFxuICAgIH1cbiAgICB0aGlzLmxhc3RfcnVuX2lkPWxhc3RfcnVuLnJ1bl9pZFxuICAgIGlmIChsYXN0X3J1bi5zdGRlcnIubGVuZ3RoPT09MCAmJiBsYXN0X3J1bi5zdGRvdXQubGVuZ3RoPT09MClcbiAgICAgIHJldHVyblxuXG4gICAgdGhpcy50ZXJtLnRlcm1fd3JpdGUobGFzdF9ydW4uc3RkZXJyLFwic3RkZXJyXCIpXG4gICAgdGhpcy50ZXJtLnRlcm1fd3JpdGUobGFzdF9ydW4uc3Rkb3V0LFwic3Rkb3V0XCIpXG4gICAgdGhpcy50ZXJtLmFmdGVyX3dyaXRlKClcbiAgfVxuICB1cGRhdGVfdGVybWluYWwocmVwb3J0OlJ1bm5lclJlcG9ydCxydW5uZXI6UnVubmVyKXtcbiAgICB0cnl7XG4gICAgICB0aGlzLnVwZGF0ZV90ZXJtaW5hbDIocmVwb3J0LHJ1bm5lcilcbiAgICB9Y2F0Y2goZXgpe1xuICAgICAgY29uc3Qge21lc3NhZ2V9PWdldF9lcnJvcihleClcbiAgICAgIHVwZGF0ZV9jaGlsZF9odG1sKHRoaXMuZWwsJy5kYmcnLG1lc3NhZ2UpXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUZXJtaW5hbHMgaW1wbGVtZW50cyBDb21wb25lbnR7XG4gIHRlcm1pbmFsczpzMnQ8VGVybWluYWxQYW5lbD49e30gXG4gIGdldF90ZXJtaW5hbChydW5uZXI6UnVubmVyKXtcbiAgICBjb25zdCBhbnM9ZGVmYXVsdF9nZXQodGhpcy50ZXJtaW5hbHMscnVubmVyLmlkLCgpPT4gbmV3IFRlcm1pbmFsUGFuZWwocnVubmVyKSlcbiAgICByZXR1cm4gYW5zXG4gIH1cbiAgb25faW50ZXJ2YWwoKXtcbiAgICAvL2NvbnNvbGUubG9nKCdvbl9pbnRlcnZhbCcpXG4gIH1cbiAgb25fZGF0YShkYXRhOnVua25vd24pe1xuICAgIGNvbnN0IHJlcG9ydD1kYXRhIGFzIFJ1bm5lclJlcG9ydFxuICAgIGNvbnN0IGY9KGZvbGRlcjpGb2xkZXIpPT57XG4gICAgICBmb3IgKGNvbnN0IHJ1bm5lciBvZiBmb2xkZXIucnVubmVycylcbiAgICAgICAgdGhpcy5nZXRfdGVybWluYWwocnVubmVyKS51cGRhdGVfdGVybWluYWwocmVwb3J0LHJ1bm5lcilcbiAgICAgIGZvbGRlci5mb2xkZXJzLmZvckVhY2goZikgXG4gICAgfVxuICAgIGYocmVwb3J0LnJvb3QpICAgIFxuICB9XG4gIHNldF9zZWxlY3RlZChpZDpzdHJpbmcpe1xuICAgIGZvciAoY29uc3QgW3BhbmVsX2lkLHBhbmVsXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRlcm1pbmFscykpe1xuICAgICAgcGFuZWwuc2V0X3Zpc2liaWxpdHkocGFuZWxfaWQ9PT1pZClcbiAgICB9XG4gIH1cbn1cblxuIiwgImltcG9ydCB0eXBlIHtUcmVlTm9kZX0gZnJvbSAnLi90cmVlX2ludGVybmFscy5qcydcbmltcG9ydCB7cG9zdF9tZXNzYWdlfSBmcm9tICcuL2NvbW1vbi5qcydcbmltcG9ydCB7dXBkYXRlX2NoaWxkX2h0bWwsdXBkYXRlX2NsYXNzX25hbWUsZ2V0X3BhcmVudF9ieV9jbGFzc2VzLGdldF9wYXJlbnRfaWR9IGZyb20gJy4vZG9tX3V0aWxzLmpzJ1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlX2ljb25zKGh0bWw6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgLy8gUGFyc2UgdGhlIEhUTUwgc3RyaW5nIGludG8gYSBEb2N1bWVudFxuICBjb25zdCBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG4gIGNvbnN0IGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcoaHRtbCwgJ3RleHQvaHRtbCcpO1xuICAvLyBTZWxlY3QgYWxsIGRpdnMgd2l0aCBjbGFzcyBcImljb25cIlxuICBjb25zdCBpY29ucyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxEaXZFbGVtZW50PignLmljb24nKTtcbiAgaWNvbnMuZm9yRWFjaChpY29uID0+IHtcbiAgICBjb25zdCBuYW1lRWwgPSBpY29uLmNoaWxkTm9kZXNbMF1cbiAgICBjb25zdCBjb250ZW50RWwgPSBpY29uLnF1ZXJ5U2VsZWN0b3I8U1ZHRWxlbWVudD4oJ3N2ZycpO1xuICAgIGlmIChuYW1lRWwgJiYgY29udGVudEVsKSB7XG4gICAgICBjb25zdCBuYW1lID0gbmFtZUVsLnRleHRDb250ZW50Py50cmltKCk7XG4gICAgICBjb25zdCBjb250ZW50ID0gY29udGVudEVsLm91dGVySFRNTFxuICAgICAgaWYgKG5hbWUhPW51bGwpIHtcbiAgICAgICAgcmVzdWx0W25hbWVdID0gY29udGVudFxuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGNvbnN0IGljb25uYW1lcz1PYmplY3Qua2V5cyhyZXN1bHQpXG4gIGNvbnNvbGUubG9nKHtpY29ubmFtZXN9KVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5pbnRlcmZhY2UgSWNvblZlcnNpb257XG4gIGljb246c3RyaW5nLFxuICB2ZXJzaW9uOm51bWJlclxufVxuZnVuY3Rpb24gZGVjZWxlcmF0aW5nTWFwKHg6bnVtYmVyKSB7IC8vYWkgZ2VucmF0ZWQgbG9sXG4gIC8vIDEuIENvbnN0cmFpbiBpbnB1dCBhbmQgbm9ybWFsaXplIHRvIDAuMCAtIDEuMCByYW5nZVxuICBjb25zdCB0ID0gTWF0aC5taW4oTWF0aC5tYXgoeCAvIDIsIDApLCAxKTtcblxuICAvLyAyLiBBcHBseSBRdWFkcmF0aWMgRWFzZS1PdXQgZm9ybXVsYVxuICAvLyBUaGlzIHN0YXJ0cyBmYXN0IGFuZCBzbG93cyBkb3duIGFzIGl0IGFwcHJvYWNoZXMgMVxuICBjb25zdCBlYXNlT3V0ID0gMSAtICgxIC0gdCkgKiAoMSAtIHQpO1xuXG4gIC8vIDMuIE1hcCB0byBvdXRwdXQgcmFuZ2UgKDEwIHRvIDApXG4gIC8vIFdoZW4gZWFzZU91dCBpcyAwLCByZXN1bHQgaXMgMTAuIFdoZW4gZWFzZU91dCBpcyAxLCByZXN1bHQgaXMgMC5cbiAgcmV0dXJuIDEwIC0gKGVhc2VPdXQgKiAxMCk7XG59XG5mdW5jdGlvbiBjYWxjX2JveF9zaGFkb3coaWNvbjpzdHJpbmcsdGltZU9mZnNldDpudW1iZXIpe1xuICBmdW5jdGlvbiBmKGNvbG9yOnN0cmluZyl7XG4gICAgY29uc3QgcHg9ZGVjZWxlcmF0aW5nTWFwKHRpbWVPZmZzZXQpXG4gICAgcmV0dXJuIGAwcHggMHB4ICR7cHh9cHggJHtweH1weCAke2NvbG9yfWBcbiAgfVxuICBpZiAoaWNvbj09PSdkb25lJylcbiAgICByZXR1cm4gZigncmdiYSgwLCAyNTUsIDAsLjUpJylcbiAgaWYgKGljb249PT0nZXJyb3InKVxuICAgIHJldHVybiBmKCdyZ2JhKDI1NSwgMCwgMCwgLjUpJylcbiAgaWYgKGljb249PT0ncnVubmluZycpXG4gICAgcmV0dXJuIGYoJ3JnYmEoMjU1LCAxNDAsIDAsIDAuNSknKVxuICBpZiAoaWNvbj09PSdzdG9wcGVkJylcbiAgICByZXR1cm4gZigncmdiYSgxMjgsIDAsIDEyOCwgMC41KScpXG4gIHJldHVybiAnJ1xufVxuXG5cbmV4cG9ydCBjbGFzcyBJY29uc0FuaW1hdG9ye1xuICAvL2ljb25zXG4gIHByaXZhdGUgaWRfY2hhbmdlZDpSZWNvcmQ8c3RyaW5nLG51bWJlcj49e31cbiAgcHJpdmF0ZSBpY29uX3ZlcnNpb25zOlJlY29yZDxzdHJpbmcsSWNvblZlcnNpb24+PXt9XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBpY29uczpSZWNvcmQ8c3RyaW5nLHN0cmluZz4sXG4gICAgcHVibGljIGNvbW1hbmRzOnN0cmluZ1tdICAgIFxuICApe1xuICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLHRoaXMub25fY2xpY2spXG4gIH1cbiAgZ2V0X2NvbW1hbmQoaWNvbjpIVE1MRWxlbWVudCl7XG4gICAgZm9yIChjb25zdCBjbGFzc05hbWUgb2YgaWNvbi5jbGFzc0xpc3QpXG4gICAgICBpZiAodGhpcy5jb21tYW5kcy5pbmNsdWRlcyhjbGFzc05hbWUpKVxuICAgICAgICByZXR1cm4gY2xhc3NOYW1lXG4gIH1cbiAgb25fY2xpY2s9KGV2dDpNb3VzZUV2ZW50KT0+e1xuICAgIGlmIChldnQudGFyZ2V0PT1udWxsKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgY29uc3QgY29tbWFuZF9pY29uPWdldF9wYXJlbnRfYnlfY2xhc3NlcyhldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50LFsnY29tbWFuZF9pY29uJywndG9nZ2xlX2ljb24nXSlcbiAgICBpZiAoY29tbWFuZF9pY29uPT1udWxsKVxuICAgICAgcmV0dXJuXG4gICAgY29uc3QgY29tbWFuZF9uYW1lPXRoaXMuZ2V0X2NvbW1hbmQoY29tbWFuZF9pY29uKVxuICAgIGlmIChjb21tYW5kX25hbWU9PW51bGwpXG4gICAgICByZXR1cm5cbiAgICBcbiAgICBjb25zdCBpZD1nZXRfcGFyZW50X2lkKGNvbW1hbmRfaWNvbikgLy9Bcmd1bWVudCBvZiB0eXBlICdIVE1MRWxlbWVudCB8IG51bGwnIGlzIG5vdCBhc3NpZ25hYmxlIHRvIHBhcmFtZXRlciBvZiB0eXBlICdIVE1MRWxlbWVudCcuIHdoeVxuICAgIGlmIChpZD09bnVsbClcbiAgICAgIHJldHVyblxuICAgIHBvc3RfbWVzc2FnZSh7XG4gICAgICBjb21tYW5kOiBcImNvbW1hbmRfY2xpY2tlZFwiLFxuICAgICAgaWQsXG4gICAgICBjb21tYW5kX25hbWVcbiAgICB9KSAgICBcbiAgICBldnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cbiAgfVxuICBwcml2YXRlIHNldF9pY29uX3ZlcnNpb24oaWQ6c3RyaW5nLGljb246c3RyaW5nLHZlcnNpb246bnVtYmVyKXsgLy9jYWxsIG11dHVwbGUgdGltZSwgb25lIGZvciBlYWNoIGlkXG4gICAgY29uc3QgZXhpc3RzPXRoaXMuaWNvbl92ZXJzaW9uc1tpZF1cbiAgICBpZiAoZXhpc3RzIT1udWxsICYmIGV4aXN0cy5pY29uPT09aWNvbiYmZXhpc3RzLnZlcnNpb249PT12ZXJzaW9uKVxuICAgICAgcmV0dXJuXG4gICAgdGhpcy5pZF9jaGFuZ2VkW2lkXT1EYXRlLm5vdygpXG4gICAgdGhpcy5pY29uX3ZlcnNpb25zW2lkXT17aWNvbix2ZXJzaW9ufVxuICB9XG4gIHByaXZhdGUgY2FsY19pY29uKGs6c3RyaW5nLHY6Ym9vbGVhbnx1bmRlZmluZWQpe1xuICAgIGlmICh2PT09dW5kZWZpbmVkKVxuICAgICAgcmV0dXJuICcnXG4gICAgcmV0dXJuIHRoaXMuaWNvbnNbYCR7a31fJHt2fWBdXG4gIH1cbiAgcHJpdmF0ZSB1cGRhdGVfaWNvbnModHJlZV9ub2RlOlRyZWVOb2RlKXtcbiAgICBjb25zdCBmPShub2RlOlRyZWVOb2RlKT0+eyBcbiAgICAgIGNvbnN0IHtpZCxpY29uLGljb25fdmVyc2lvbn09bm9kZVxuICAgICAgdGhpcy5zZXRfaWNvbl92ZXJzaW9uKGlkLGljb24saWNvbl92ZXJzaW9uKSAvL2ZvciB0aGUgc2lkZSBlZmZlY3Qgb2YgdXBkYXRpbmcgaWRfY2hhbmVkXG4gICAgICBjb25zdCB0b2dnbGVzPU9iamVjdC5lbnRyaWVzKG5vZGUudG9nZ2xlcykubWFwKChbayx2XSk9PmA8ZGl2IGNsYXNzPSd0b2dnbGVfaWNvbiAke3Z9ICR7a30nPiR7dGhpcy5jYWxjX2ljb24oayx2KX08L2Rpdj5gKS5qb2luKCcnKSBcbiAgICAgIGNvbnN0IGNvbW1hbmRzX2ljb25zPW5vZGUuY29tbWFuZHMubWFwKHg9PmA8ZGl2IGNsYXNzPVwiY29tbWFuZF9pY29uICR7eH1cIj4ke3RoaXMuaWNvbnNbeF19PC9kaXY+YCkuam9pbignJylcbiAgICAgIGNvbnN0IHRvcD1gIyR7aWR9ID4gOm5vdCguY2hpbGRyZW4pYFxuICAgICAgdXBkYXRlX2NoaWxkX2h0bWwoZG9jdW1lbnQuYm9keSxgJHt0b3B9IC5pY29uOm5vdCgudGV4dClgLHRoaXMuaWNvbnNbaWNvbl0/PycnKSAvL3NldCB0aGUgc3ZnXG4gICAgICB1cGRhdGVfY2hpbGRfaHRtbChkb2N1bWVudC5ib2R5LGAke3RvcH0gLmljb24udGV4dGAsYCAke3RoaXMuaWNvbnNbaWNvbl0/PycnfSZuYnNwOyZuYnNwOyZuYnNwOyR7aWNvbn1gKSAvLy8vc2V0IHRoZSBzdmcgK3RleHRcbiAgICAgIHVwZGF0ZV9jaGlsZF9odG1sKGRvY3VtZW50LmJvZHksYCR7dG9wfSAudG9nZ2xlc19pY29uc2AsdG9nZ2xlcylcbiAgICAgIHVwZGF0ZV9jaGlsZF9odG1sKGRvY3VtZW50LmJvZHksYCR7dG9wfSAuY29tbWFuZHNfaWNvbnNgLGNvbW1hbmRzX2ljb25zKVxuICAgICAgdXBkYXRlX2NsYXNzX25hbWUoZG9jdW1lbnQuYm9keSxgJHt0b3B9IC5pY29uLnRleHRgLGBpY29uIHRleHQgJHtpY29ufWApIFxuICAgICAgdXBkYXRlX2NsYXNzX25hbWUoZG9jdW1lbnQuYm9keSxgJHt0b3B9IC5pY29uOm5vdCgudGV4dClgLGBpY29uICR7aWNvbn1gKSBcbiAgICAgIFxuICAgICAgbm9kZS5jaGlsZHJlbi5tYXAoZilcbiAgICB9XG4gICAgZih0cmVlX25vZGUpXG4gIH1cbiAgYW5pbWF0ZSh0cmVlX25vZGU6VHJlZU5vZGUpe1xuICAgIC8vZG8gYSBxdWVyeVNlbGVjdG9yQWxsIGZvciAje2lkfSBzdmdcbiAgICB0aGlzLnVwZGF0ZV9pY29ucyh0cmVlX25vZGUpXG4gICAgY29uc3Qgbm93PURhdGUubm93KClcbiAgICBmb3IgKGNvbnN0IFtpZCx0aW1lXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLmlkX2NoYW5nZWQpKXsgLy9hbmltYXRlXG4gICAgICBjb25zdCBzZWxlY3Rvcj1gIyR7aWR9IC5pY29uYCAgIFxuICAgICAgY29uc3QgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPFNWR0VsZW1lbnQ+KHNlbGVjdG9yKTtcbiAgICAgIGZvciAoIGNvbnN0IGVsIG9mIGVsZW1lbnRzKXsgXG4gICAgICAgIGNvbnN0IHRpbWVPZmZzZXQ9KG5vdy10aW1lKS8xMDAwXG4gICAgICAgIGlmICh0aW1lT2Zmc2V0PjQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgY29uc3Qge2ljb259PXRoaXMuaWNvbl92ZXJzaW9uc1tpZF0hXG5cbiAgICAgICAgZWwuc3R5bGUuYm94U2hhZG93PWNhbGNfYm94X3NoYWRvdyhpY29uLHRpbWVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICB9XG59IiwgIlxuaW1wb3J0IHR5cGUge1dlYnZpZXdNZXNzYWdlfSBmcm9tICcuLi8uLi9zcmMvZXh0ZW5zaW9uLmpzJ1xuaW1wb3J0IHtxdWVyeV9zZWxlY3RvcixjdHJsfSBmcm9tICcuL2RvbV91dGlscy5qcydcbmltcG9ydCB7VHJlZUNvbnRyb2wsdHlwZSBUcmVlRGF0YVByb3ZpZGVyLHR5cGUgVHJlZU5vZGV9IGZyb20gJy4vdHJlZV9jb250cm9sLmpzJztcbmltcG9ydCB0eXBlIHsgRm9sZGVyLFJ1bm5lcixGb2xkZXJFcnJvcixSdW5uZXJSZXBvcnR9IGZyb20gJy4uLy4uL3NyYy9kYXRhLmpzJztcbmltcG9ydCAqIGFzIHBhcnNlciBmcm9tICcuLi8uLi9zcmMvcGFyc2VyLmpzJztcbmltcG9ydCB7cG9zdF9tZXNzYWdlLGNhbGNfcnVubmVyX3N0YXR1c30gZnJvbSAnLi9jb21tb24uanMnXG5pbXBvcnQgSUNPTlNfSFRNTCBmcm9tICcuLi9yZXNvdXJjZXMvaWNvbnMuaHRtbCdcbmltcG9ydCB7VGVybWluYWxzfSBmcm9tICcuL3Rlcm1pbmFscy5qcydcbmltcG9ydCB7SWNvbnNBbmltYXRvcixwYXJzZV9pY29uc30gZnJvbSAnLi9pY29ucy5qcydcblxuZnVuY3Rpb24gdGhlX2NvbnZlcnQoX3JlcG9ydDp1bmtub3duKTpUcmVlTm9kZXtcbiAgY29uc3QgcmVwb3J0PV9yZXBvcnQgYXMgUnVubmVyUmVwb3J0IC8vZGVsaWJlcmF0bHkgbWFrZXMgbGVzcyBzdHJvayB0eXBlblxuICBmdW5jdGlvbiBjb252ZXJ0X3J1bm5lcihydW5uZXI6UnVubmVyKTpUcmVlTm9kZXtcbiAgICAgIGNvbnN0IHtzY3JpcHQsaWQsbmFtZSxlZmZlY3RpdmVfd2F0Y2gsdGFnc309cnVubmVyXG4gICAgICBjb25zdCB3YXRjaGVkPWZ1bmN0aW9uKCl7XG4gICAgICAgIGlmIChlZmZlY3RpdmVfd2F0Y2gubGVuZ3RoPT09MClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgcmV0dXJuIHJlcG9ydC5tb25pdG9yZWQuaW5jbHVkZXMoaWQpXG4gICAgICB9KClcbiAgICAgIGNvbnN0IHt2ZXJzaW9uLHN0YXRlfT1jYWxjX3J1bm5lcl9zdGF0dXMocmVwb3J0LHJ1bm5lcilcbiAgICAgIC8vY29uc3QgY2xhc3NOYW1lPSh3YXRjaGVkPyd3YXRjaGVkJzp1bmRlZmluZWRcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6J2l0ZW0nLFxuICAgICAgICBpZCxcbiAgICAgICAgbGFiZWw6bmFtZSxcbiAgICAgICAgY29tbWFuZHM6WydwbGF5Jywnc3RvcCddLCBcbiAgICAgICAgY2hpbGRyZW46W10sXG4gICAgICAgIGRlc2NyaXB0aW9uOnNjcmlwdCxcbiAgICAgICAgaWNvbjpzdGF0ZSxcbiAgICAgICAgaWNvbl92ZXJzaW9uOlxuICAgICAgICB2ZXJzaW9uLFxuICAgICAgICBjbGFzc05hbWU6dW5kZWZpbmVkLFxuICAgICAgICB0b2dnbGVzOiB7d2F0Y2hlZH0sXG4gICAgICAgIHRhZ3NcbiAgICAgICAgLy9kZWZhdWx0X2NoZWNrYm94X3N0YXRlOiBlZmZlY3RpdmVfd2F0Y2gubGVuZ3RoPjB8fHVuZGVmaW5lZFxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBjb252ZXJ0X2Vycm9yKHJvb3Q6Rm9sZGVyRXJyb3IpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge2lkLG1lc3NhZ2V9PXJvb3RcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6XCJpdGVtXCIsXG4gICAgICAgIGlkLFxuICAgICAgICBsYWJlbDptZXNzYWdlLFxuICAgICAgICBjaGlsZHJlbjpbXSxcbiAgICAgICAgaWNvbjpcInN5bnRheGVycm9yXCIsXG4gICAgICAgIGljb25fdmVyc2lvbjoxLFxuICAgICAgICBjb21tYW5kczpbXSxcbiAgICAgICAgY2xhc3NOYW1lOlwid2FybmluZ1wiLFxuICAgICAgICB0b2dnbGVzOiB7fSxcbiAgICAgICAgdGFnczpbXVxuICAgIH1cblxuICB9ICBcbiAgZnVuY3Rpb24gY29udmVydF9mb2xkZXIocm9vdDpGb2xkZXIpOlRyZWVOb2Rle1xuICAgICAgY29uc3Qge25hbWUsaWR9PXJvb3RcbiAgICAgIGNvbnN0IGZvbGRlcnM9cm9vdC5mb2xkZXJzLm1hcChjb252ZXJ0X2ZvbGRlcilcbiAgICAgIGNvbnN0IGl0ZW1zPXJvb3QucnVubmVycy5tYXAoY29udmVydF9ydW5uZXIpXG4gICAgICBjb25zdCBlcnJvcnM9cm9vdC5lcnJvcnMubWFwKGNvbnZlcnRfZXJyb3IpICBcbiAgICAgIGNvbnN0IGNoaWxkcmVuPVsuLi5mb2xkZXJzLC4uLml0ZW1zLC4uLmVycm9yc11cbiAgICAgIGNvbnN0IGljb249ZXJyb3JzLmxlbmd0aD09PTA/J2ZvbGRlcic6J2ZvbGRlcnN5bnRheGVycm9yJ1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2hpbGRyZW4sXG4gICAgICAgIHR5cGU6J2ZvbGRlcicsXG4gICAgICAgIGlkLGxhYmVsOm5hbWUsXG4gICAgICAgIGNvbW1hbmRzOltdLFxuICAgICAgICBpY29uLFxuICAgICAgICBpY29uX3ZlcnNpb246MCxcbiAgICAgICAgY2xhc3NOYW1lOnVuZGVmaW5lZCxcbiAgICAgICAgdG9nZ2xlczoge30sXG4gICAgICAgIHRhZ3M6W11cbiAgICAgIH1cbiAgfVxuICByZXR1cm4gY29udmVydF9mb2xkZXIocmVwb3J0LnJvb3QpXG59XG5cbmNsYXNzIFRoZVRyZWVQcm92aWRlciBpbXBsZW1lbnRzIFRyZWVEYXRhUHJvdmlkZXJ7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB0ZXJtaW5hbHM6VGVybWluYWxzKXt9XG4gIHRvZ2dsZV9vcmRlcj1bJ3dhdGNoZWQnXVxuICAvL2NvbnZlcnQ9dGhlX2NvbnZlcnRcbiAgcmVwb3J0OlJ1bm5lclJlcG9ydHx1bmRlZmluZWRcbiAgY29tbWFuZChpZDpzdHJpbmcsY29tbWFuZF9uYW1lOnN0cmluZyl7Ly9QYXJhbWV0ZXIgJ2NvbW1hbmRfbmFtZScgaW1wbGljaXRseSBoYXMgYW4gJ2FueScgdHlwZS50cyg3MDA2KSB3aHlcbiAgICBwb3N0X21lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDogXCJjb21tYW5kX2NsaWNrZWRcIixcbiAgICAgIGlkLFxuICAgICAgY29tbWFuZF9uYW1lXG4gICAgfSlcbiAgfVxuICAvL2ljb25zX2h0bWw9SUNPTlNfSFRNTFxuICBzZWxlY3RlZChpZDpzdHJpbmcpe1xuICAgIHRoaXMudGVybWluYWxzLnNldF9zZWxlY3RlZChpZClcbiAgICBjb25zdCBiYXNlPXBhcnNlci5maW5kX2Jhc2UodGhpcy5yZXBvcnQhLnJvb3QsaWQpXG4gICAgaWYgKGJhc2U9PW51bGx8fGJhc2UucG9zPT1udWxsKVxuICAgICAgcmV0dXJuXG4gICAgaWYgKGJhc2UubmVlZF9jdGwmJiFjdHJsLnByZXNzZWQpXG4gICAgICByZXR1cm5cbiAgICBjb25zdCB7cG9zfT1iYXNlXG4gICAgcG9zdF9tZXNzYWdlKHtcbiAgICAgIGNvbW1hbmQ6IFwiY29tbWFuZF9vcGVuX2ZpbGVfcG9zXCIsXG4gICAgICBwb3NcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIHN0YXJ0KCl7XG4gIGNvbnNvbGUubG9nKCdzdGFydCcpXG4gIGNvbnN0IHRlcm1pbmFscz1uZXcgVGVybWluYWxzKClcbiAgLy8gL2xldCBiYXNlX3VyaT0nJ1xuICBjb25zdCBwcm92aWRlcj1uZXcgVGhlVHJlZVByb3ZpZGVyKHRlcm1pbmFscylcbiAgY29uc3QgaWNvbnM9cGFyc2VfaWNvbnMoSUNPTlNfSFRNTClcbiAgY29uc3QgaWNvbnNfYW5pbWF0b3I9bmV3IEljb25zQW5pbWF0b3IoaWNvbnMsW1wid2F0Y2hlZFwiLFwicGxheVwiLFwic3RvcFwiXSlcbiAgY29uc3QgdHJlZT1uZXcgVHJlZUNvbnRyb2wocXVlcnlfc2VsZWN0b3IoZG9jdW1lbnQuYm9keSwnI3RoZV90cmVlJykscHJvdmlkZXIsaWNvbnMpIC8vbm8gZXJyb3IsIHdoYXlcbiBcbiAgZnVuY3Rpb24gb25faW50ZXJ2YWwoKXtcbiAgICB0cmVlLm9uX2ludGVydmFsKClcbiAgICB0ZXJtaW5hbHMub25faW50ZXJ2YWwoKVxuICB9XG4gIHNldEludGVydmFsKG9uX2ludGVydmFsLDEwMClcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAgKGV2ZW50Ok1lc3NhZ2VFdmVudDxXZWJ2aWV3TWVzc2FnZT4pID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldmVudC5kYXRhO1xuICAgICAgc3dpdGNoIChtZXNzYWdlLmNvbW1hbmQpIHtcbiAgICAgICAgICBjYXNlICdSdW5uZXJSZXBvcnQnOntcbiAgICAgICAgICAgIHByb3ZpZGVyLnJlcG9ydD1tZXNzYWdlICAgICAgICAgICAgXG4gICAgICAgICAgICB0ZXJtaW5hbHMub25fZGF0YShtZXNzYWdlKVxuICAgICAgICAgICAgY29uc3QgdHJlZV9ub2RlPXRoZV9jb252ZXJ0KG1lc3NhZ2UpXG4gICAgICAgICAgICAvL2Jhc2VfdXJpPW1lc3NhZ2UuYmFzZV91cmlcbiAgICAgICAgICAgIHRyZWUub25fZGF0YSh0cmVlX25vZGUpXG4gICAgICAgICAgICBpY29uc19hbmltYXRvci5hbmltYXRlKHRyZWVfbm9kZSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnc2V0X3NlbGVjdGVkJzpcbiAgICAgICAgICAgIC8vdXBkYShkb2N1bWVudC5ib2R5LCcjc2VsZWN0ZWQnLCBtZXNzYWdlLnNlbGVjdGVkKVxuICAgICAgICAgICAgcHJvdmlkZXIuc2VsZWN0ZWQobWVzc2FnZS5zZWxlY3RlZClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGB1bmV4cGVjdGVkIG1lc3NhZ2UgJHttZXNzYWdlLmNvbW1hbmR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICB9XG4gIH0pO1xufVxuc3RhcnQoKVxuY29uc3QgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGVybXNfY29udGFpbmVyJyk7XG5jb25zb2xlLmxvZyhlbClcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFFTyxTQUFTLGVBQTBDQSxLQUFXLFVBQWdCO0FBQ2pGLFFBQU0sTUFBSUEsSUFBRyxjQUFpQixRQUFRO0FBQ3RDLE1BQUksT0FBSztBQUNQLFVBQU0sSUFBSSxNQUFNLHlDQUF5QztBQUMzRCxTQUFPO0FBQ1g7QUFDTyxTQUFTLGVBQWUsTUFBWSxRQUFvQjtBQUM3RCxRQUFNLFdBQVcsU0FBUyxjQUFjLFVBQVU7QUFDbEQsV0FBUyxZQUFZLEtBQUssS0FBSztBQUMvQixRQUFNLE1BQU0sU0FBUyxRQUFRO0FBQzdCLE1BQUksVUFBUTtBQUNWLFdBQU8sWUFBWSxHQUFHO0FBQ3hCLFNBQU87QUFDVDtBQUNPLFNBQVMsS0FBSyxNQUEyQjtBQUM5QyxRQUFNLE1BQUksQ0FBQztBQUNYLGFBQVcsQ0FBQyxHQUFFLENBQUMsS0FBSyxPQUFPLFFBQVEsSUFBSTtBQUNyQyxRQUFJLEtBQUcsUUFBTSxNQUFJO0FBQ2YsVUFBSSxLQUFLLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUTtBQUMzQyxTQUFPLElBQUksS0FBSyxFQUFFO0FBQ3BCO0FBYU8sU0FBUyx3QkFBd0JDLEtBQW9CO0FBQzFELE1BQUlBLE9BQUk7QUFDTixXQUFPO0FBQ1QsTUFBSSxNQUFxQkE7QUFDekIsU0FBTSxPQUFLLE1BQUs7QUFDZCxRQUFJLE9BQU8sUUFBUSxJQUFJLE9BQU8sRUFBRSxXQUFTO0FBQ3ZDLGFBQU87QUFDVCxV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QUMzQyxXQUFLLFdBQVcsU0FBUztBQUMzQixTQUFLLFlBQVU7QUFBQSxFQUNqQjtBQUNGOzs7QUMxSkEsSUFBSSx3QkFBd0IsQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxLQUFLLEdBQUcsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxLQUFLLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEtBQUssSUFBSSxLQUFLLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLElBQUksTUFBTSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsS0FBSyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxPQUFPLEdBQUcsTUFBTSxHQUFHLEtBQUssSUFBSSxHQUFHLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsTUFBTSxJQUFJLEtBQUssSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsTUFBTSxHQUFHLFFBQVEsR0FBRztBQUdsckMsSUFBSSw2QkFBNkIsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxLQUFLLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssS0FBSyxLQUFLLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLElBQUksR0FBRyxJQUFJLE1BQU0sR0FBRyxLQUFLLE1BQU0sSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksS0FBSyxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsS0FBSyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsTUFBTSxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksTUFBTSxPQUFPLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxNQUFNLElBQUksS0FBSyxNQUFNLEtBQUssTUFBTSxNQUFNLEdBQUcsSUFBSTtBQUd2dEUsSUFBSSwwQkFBMEI7QUFHOUIsSUFBSSwrQkFBK0I7QUFTbkMsSUFBSSxnQkFBZ0I7QUFBQSxFQUNsQixHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxRQUFRO0FBQUEsRUFDUixZQUFZO0FBQ2Q7QUFJQSxJQUFJLHVCQUF1QjtBQUUzQixJQUFJLGFBQWE7QUFBQSxFQUNmLEdBQUc7QUFBQSxFQUNILFdBQVcsdUJBQXVCO0FBQUEsRUFDbEMsR0FBRyx1QkFBdUI7QUFDNUI7QUFFQSxJQUFJLDRCQUE0QjtBQUloQyxJQUFJLDBCQUEwQixJQUFJLE9BQU8sTUFBTSwrQkFBK0IsR0FBRztBQUNqRixJQUFJLHFCQUFxQixJQUFJLE9BQU8sTUFBTSwrQkFBK0IsMEJBQTBCLEdBQUc7QUFLdEcsU0FBUyxjQUFjLE1BQU0sS0FBSztBQUNoQyxNQUFJLE1BQU07QUFDVixXQUFTLElBQUksR0FBRyxJQUFJLElBQUksUUFBUSxLQUFLLEdBQUc7QUFDdEMsV0FBTyxJQUFJLENBQUM7QUFDWixRQUFJLE1BQU0sTUFBTTtBQUFFLGFBQU87QUFBQSxJQUFNO0FBQy9CLFdBQU8sSUFBSSxJQUFJLENBQUM7QUFDaEIsUUFBSSxPQUFPLE1BQU07QUFBRSxhQUFPO0FBQUEsSUFBSztBQUFBLEVBQ2pDO0FBQ0EsU0FBTztBQUNUO0FBSUEsU0FBUyxrQkFBa0IsTUFBTSxRQUFRO0FBQ3ZDLE1BQUksT0FBTyxJQUFJO0FBQUUsV0FBTyxTQUFTO0FBQUEsRUFBRztBQUNwQyxNQUFJLE9BQU8sSUFBSTtBQUFFLFdBQU87QUFBQSxFQUFLO0FBQzdCLE1BQUksT0FBTyxJQUFJO0FBQUUsV0FBTyxTQUFTO0FBQUEsRUFBRztBQUNwQyxNQUFJLE9BQU8sS0FBSztBQUFFLFdBQU87QUFBQSxFQUFLO0FBQzlCLE1BQUksUUFBUSxPQUFRO0FBQUUsV0FBTyxRQUFRLE9BQVEsd0JBQXdCLEtBQUssT0FBTyxhQUFhLElBQUksQ0FBQztBQUFBLEVBQUU7QUFDckcsTUFBSSxXQUFXLE9BQU87QUFBRSxXQUFPO0FBQUEsRUFBTTtBQUNyQyxTQUFPLGNBQWMsTUFBTSwwQkFBMEI7QUFDdkQ7QUFJQSxTQUFTLGlCQUFpQixNQUFNLFFBQVE7QUFDdEMsTUFBSSxPQUFPLElBQUk7QUFBRSxXQUFPLFNBQVM7QUFBQSxFQUFHO0FBQ3BDLE1BQUksT0FBTyxJQUFJO0FBQUUsV0FBTztBQUFBLEVBQUs7QUFDN0IsTUFBSSxPQUFPLElBQUk7QUFBRSxXQUFPO0FBQUEsRUFBTTtBQUM5QixNQUFJLE9BQU8sSUFBSTtBQUFFLFdBQU87QUFBQSxFQUFLO0FBQzdCLE1BQUksT0FBTyxJQUFJO0FBQUUsV0FBTyxTQUFTO0FBQUEsRUFBRztBQUNwQyxNQUFJLE9BQU8sS0FBSztBQUFFLFdBQU87QUFBQSxFQUFLO0FBQzlCLE1BQUksUUFBUSxPQUFRO0FBQUUsV0FBTyxRQUFRLE9BQVEsbUJBQW1CLEtBQUssT0FBTyxhQUFhLElBQUksQ0FBQztBQUFBLEVBQUU7QUFDaEcsTUFBSSxXQUFXLE9BQU87QUFBRSxXQUFPO0FBQUEsRUFBTTtBQUNyQyxTQUFPLGNBQWMsTUFBTSwwQkFBMEIsS0FBSyxjQUFjLE1BQU0scUJBQXFCO0FBQ3JHO0FBeUJBLElBQUksWUFBWSxTQUFTQyxXQUFVLE9BQU8sTUFBTTtBQUM5QyxNQUFLLFNBQVMsT0FBUyxRQUFPLENBQUM7QUFFL0IsT0FBSyxRQUFRO0FBQ2IsT0FBSyxVQUFVLEtBQUs7QUFDcEIsT0FBSyxhQUFhLENBQUMsQ0FBQyxLQUFLO0FBQ3pCLE9BQUssYUFBYSxDQUFDLENBQUMsS0FBSztBQUN6QixPQUFLLFNBQVMsQ0FBQyxDQUFDLEtBQUs7QUFDckIsT0FBSyxXQUFXLENBQUMsQ0FBQyxLQUFLO0FBQ3ZCLE9BQUssU0FBUyxDQUFDLENBQUMsS0FBSztBQUNyQixPQUFLLFVBQVUsQ0FBQyxDQUFDLEtBQUs7QUFDdEIsT0FBSyxRQUFRLEtBQUssU0FBUztBQUMzQixPQUFLLGdCQUFnQjtBQUN2QjtBQUVBLFNBQVMsTUFBTSxNQUFNLE1BQU07QUFDekIsU0FBTyxJQUFJLFVBQVUsTUFBTSxFQUFDLFlBQVksTUFBTSxPQUFPLEtBQUksQ0FBQztBQUM1RDtBQUNBLElBQUksYUFBYSxFQUFDLFlBQVksS0FBSTtBQUFsQyxJQUFxQyxhQUFhLEVBQUMsWUFBWSxLQUFJO0FBSW5FLElBQUksV0FBVyxDQUFDO0FBR2hCLFNBQVMsR0FBRyxNQUFNLFNBQVM7QUFDekIsTUFBSyxZQUFZLE9BQVMsV0FBVSxDQUFDO0FBRXJDLFVBQVEsVUFBVTtBQUNsQixTQUFPLFNBQVMsSUFBSSxJQUFJLElBQUksVUFBVSxNQUFNLE9BQU87QUFDckQ7QUFFQSxJQUFJLFVBQVU7QUFBQSxFQUNaLEtBQUssSUFBSSxVQUFVLE9BQU8sVUFBVTtBQUFBLEVBQ3BDLFFBQVEsSUFBSSxVQUFVLFVBQVUsVUFBVTtBQUFBLEVBQzFDLFFBQVEsSUFBSSxVQUFVLFVBQVUsVUFBVTtBQUFBLEVBQzFDLE1BQU0sSUFBSSxVQUFVLFFBQVEsVUFBVTtBQUFBLEVBQ3RDLFdBQVcsSUFBSSxVQUFVLGFBQWEsVUFBVTtBQUFBLEVBQ2hELEtBQUssSUFBSSxVQUFVLEtBQUs7QUFBQTtBQUFBLEVBR3hCLFVBQVUsSUFBSSxVQUFVLEtBQUssRUFBQyxZQUFZLE1BQU0sWUFBWSxLQUFJLENBQUM7QUFBQSxFQUNqRSxVQUFVLElBQUksVUFBVSxHQUFHO0FBQUEsRUFDM0IsUUFBUSxJQUFJLFVBQVUsS0FBSyxFQUFDLFlBQVksTUFBTSxZQUFZLEtBQUksQ0FBQztBQUFBLEVBQy9ELFFBQVEsSUFBSSxVQUFVLEdBQUc7QUFBQSxFQUN6QixRQUFRLElBQUksVUFBVSxLQUFLLEVBQUMsWUFBWSxNQUFNLFlBQVksS0FBSSxDQUFDO0FBQUEsRUFDL0QsUUFBUSxJQUFJLFVBQVUsR0FBRztBQUFBLEVBQ3pCLE9BQU8sSUFBSSxVQUFVLEtBQUssVUFBVTtBQUFBLEVBQ3BDLE1BQU0sSUFBSSxVQUFVLEtBQUssVUFBVTtBQUFBLEVBQ25DLE9BQU8sSUFBSSxVQUFVLEtBQUssVUFBVTtBQUFBLEVBQ3BDLEtBQUssSUFBSSxVQUFVLEdBQUc7QUFBQSxFQUN0QixVQUFVLElBQUksVUFBVSxLQUFLLFVBQVU7QUFBQSxFQUN2QyxhQUFhLElBQUksVUFBVSxJQUFJO0FBQUEsRUFDL0IsT0FBTyxJQUFJLFVBQVUsTUFBTSxVQUFVO0FBQUEsRUFDckMsVUFBVSxJQUFJLFVBQVUsVUFBVTtBQUFBLEVBQ2xDLGlCQUFpQixJQUFJLFVBQVUsaUJBQWlCO0FBQUEsRUFDaEQsVUFBVSxJQUFJLFVBQVUsT0FBTyxVQUFVO0FBQUEsRUFDekMsV0FBVyxJQUFJLFVBQVUsS0FBSyxVQUFVO0FBQUEsRUFDeEMsY0FBYyxJQUFJLFVBQVUsTUFBTSxFQUFDLFlBQVksTUFBTSxZQUFZLEtBQUksQ0FBQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFnQnRFLElBQUksSUFBSSxVQUFVLEtBQUssRUFBQyxZQUFZLE1BQU0sVUFBVSxLQUFJLENBQUM7QUFBQSxFQUN6RCxRQUFRLElBQUksVUFBVSxNQUFNLEVBQUMsWUFBWSxNQUFNLFVBQVUsS0FBSSxDQUFDO0FBQUEsRUFDOUQsUUFBUSxJQUFJLFVBQVUsU0FBUyxFQUFDLFFBQVEsTUFBTSxTQUFTLE1BQU0sWUFBWSxLQUFJLENBQUM7QUFBQSxFQUM5RSxRQUFRLElBQUksVUFBVSxPQUFPLEVBQUMsWUFBWSxNQUFNLFFBQVEsTUFBTSxZQUFZLEtBQUksQ0FBQztBQUFBLEVBQy9FLFdBQVcsTUFBTSxNQUFNLENBQUM7QUFBQSxFQUN4QixZQUFZLE1BQU0sTUFBTSxDQUFDO0FBQUEsRUFDekIsV0FBVyxNQUFNLEtBQUssQ0FBQztBQUFBLEVBQ3ZCLFlBQVksTUFBTSxLQUFLLENBQUM7QUFBQSxFQUN4QixZQUFZLE1BQU0sS0FBSyxDQUFDO0FBQUEsRUFDeEIsVUFBVSxNQUFNLGlCQUFpQixDQUFDO0FBQUEsRUFDbEMsWUFBWSxNQUFNLGFBQWEsQ0FBQztBQUFBLEVBQ2hDLFVBQVUsTUFBTSxhQUFhLENBQUM7QUFBQSxFQUM5QixTQUFTLElBQUksVUFBVSxPQUFPLEVBQUMsWUFBWSxNQUFNLE9BQU8sR0FBRyxRQUFRLE1BQU0sWUFBWSxLQUFJLENBQUM7QUFBQSxFQUMxRixRQUFRLE1BQU0sS0FBSyxFQUFFO0FBQUEsRUFDckIsTUFBTSxNQUFNLEtBQUssRUFBRTtBQUFBLEVBQ25CLE9BQU8sTUFBTSxLQUFLLEVBQUU7QUFBQSxFQUNwQixVQUFVLElBQUksVUFBVSxNQUFNLEVBQUMsWUFBWSxLQUFJLENBQUM7QUFBQSxFQUNoRCxVQUFVLE1BQU0sTUFBTSxDQUFDO0FBQUE7QUFBQSxFQUd2QixRQUFRLEdBQUcsT0FBTztBQUFBLEVBQ2xCLE9BQU8sR0FBRyxRQUFRLFVBQVU7QUFBQSxFQUM1QixRQUFRLEdBQUcsT0FBTztBQUFBLEVBQ2xCLFdBQVcsR0FBRyxVQUFVO0FBQUEsRUFDeEIsV0FBVyxHQUFHLFVBQVU7QUFBQSxFQUN4QixVQUFVLEdBQUcsV0FBVyxVQUFVO0FBQUEsRUFDbEMsS0FBSyxHQUFHLE1BQU0sRUFBQyxRQUFRLE1BQU0sWUFBWSxLQUFJLENBQUM7QUFBQSxFQUM5QyxPQUFPLEdBQUcsUUFBUSxVQUFVO0FBQUEsRUFDNUIsVUFBVSxHQUFHLFNBQVM7QUFBQSxFQUN0QixNQUFNLEdBQUcsT0FBTyxFQUFDLFFBQVEsS0FBSSxDQUFDO0FBQUEsRUFDOUIsV0FBVyxHQUFHLFlBQVksVUFBVTtBQUFBLEVBQ3BDLEtBQUssR0FBRyxJQUFJO0FBQUEsRUFDWixTQUFTLEdBQUcsVUFBVSxVQUFVO0FBQUEsRUFDaEMsU0FBUyxHQUFHLFFBQVE7QUFBQSxFQUNwQixRQUFRLEdBQUcsU0FBUyxVQUFVO0FBQUEsRUFDOUIsTUFBTSxHQUFHLEtBQUs7QUFBQSxFQUNkLE1BQU0sR0FBRyxLQUFLO0FBQUEsRUFDZCxRQUFRLEdBQUcsT0FBTztBQUFBLEVBQ2xCLFFBQVEsR0FBRyxTQUFTLEVBQUMsUUFBUSxLQUFJLENBQUM7QUFBQSxFQUNsQyxPQUFPLEdBQUcsTUFBTTtBQUFBLEVBQ2hCLE1BQU0sR0FBRyxPQUFPLEVBQUMsWUFBWSxNQUFNLFlBQVksS0FBSSxDQUFDO0FBQUEsRUFDcEQsT0FBTyxHQUFHLFFBQVEsVUFBVTtBQUFBLEVBQzVCLFFBQVEsR0FBRyxTQUFTLFVBQVU7QUFBQSxFQUM5QixRQUFRLEdBQUcsU0FBUyxVQUFVO0FBQUEsRUFDOUIsVUFBVSxHQUFHLFdBQVcsVUFBVTtBQUFBLEVBQ2xDLFNBQVMsR0FBRyxRQUFRO0FBQUEsRUFDcEIsU0FBUyxHQUFHLFVBQVUsVUFBVTtBQUFBLEVBQ2hDLE9BQU8sR0FBRyxRQUFRLFVBQVU7QUFBQSxFQUM1QixPQUFPLEdBQUcsUUFBUSxVQUFVO0FBQUEsRUFDNUIsUUFBUSxHQUFHLFNBQVMsVUFBVTtBQUFBLEVBQzlCLEtBQUssR0FBRyxNQUFNLEVBQUMsWUFBWSxNQUFNLE9BQU8sRUFBQyxDQUFDO0FBQUEsRUFDMUMsYUFBYSxHQUFHLGNBQWMsRUFBQyxZQUFZLE1BQU0sT0FBTyxFQUFDLENBQUM7QUFBQSxFQUMxRCxTQUFTLEdBQUcsVUFBVSxFQUFDLFlBQVksTUFBTSxRQUFRLE1BQU0sWUFBWSxLQUFJLENBQUM7QUFBQSxFQUN4RSxPQUFPLEdBQUcsUUFBUSxFQUFDLFlBQVksTUFBTSxRQUFRLE1BQU0sWUFBWSxLQUFJLENBQUM7QUFBQSxFQUNwRSxTQUFTLEdBQUcsVUFBVSxFQUFDLFlBQVksTUFBTSxRQUFRLE1BQU0sWUFBWSxLQUFJLENBQUM7QUFDMUU7QUFLQSxJQUFJLFlBQVk7QUFDaEIsSUFBSSxhQUFhLElBQUksT0FBTyxVQUFVLFFBQVEsR0FBRztBQUVqRCxTQUFTLFVBQVUsTUFBTTtBQUN2QixTQUFPLFNBQVMsTUFBTSxTQUFTLE1BQU0sU0FBUyxRQUFVLFNBQVM7QUFDbkU7QUFFQSxTQUFTLGNBQWMsTUFBTSxNQUFNLEtBQUs7QUFDdEMsTUFBSyxRQUFRLE9BQVMsT0FBTSxLQUFLO0FBRWpDLFdBQVMsSUFBSSxNQUFNLElBQUksS0FBSyxLQUFLO0FBQy9CLFFBQUksT0FBTyxLQUFLLFdBQVcsQ0FBQztBQUM1QixRQUFJLFVBQVUsSUFBSSxHQUNoQjtBQUFFLGFBQU8sSUFBSSxNQUFNLEtBQUssU0FBUyxNQUFNLEtBQUssV0FBVyxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxJQUFJO0FBQUEsSUFBRTtBQUFBLEVBQ3pGO0FBQ0EsU0FBTztBQUNUO0FBRUEsSUFBSSxxQkFBcUI7QUFFekIsSUFBSSxpQkFBaUI7QUFFckIsSUFBSSxNQUFNLE9BQU87QUFDakIsSUFBSSxpQkFBaUIsSUFBSTtBQUN6QixJQUFJLFdBQVcsSUFBSTtBQUVuQixJQUFJLFNBQVMsT0FBTyxXQUFXLFNBQVUsS0FBSyxVQUFVO0FBQUUsU0FDeEQsZUFBZSxLQUFLLEtBQUssUUFBUTtBQUNoQztBQUVILElBQUksVUFBVSxNQUFNLFlBQVksU0FBVSxLQUFLO0FBQUUsU0FDL0MsU0FBUyxLQUFLLEdBQUcsTUFBTTtBQUN0QjtBQUVILElBQUksY0FBYyx1QkFBTyxPQUFPLElBQUk7QUFFcEMsU0FBUyxZQUFZLE9BQU87QUFDMUIsU0FBTyxZQUFZLEtBQUssTUFBTSxZQUFZLEtBQUssSUFBSSxJQUFJLE9BQU8sU0FBUyxNQUFNLFFBQVEsTUFBTSxHQUFHLElBQUksSUFBSTtBQUN4RztBQUVBLFNBQVMsa0JBQWtCLE1BQU07QUFFL0IsTUFBSSxRQUFRLE9BQVE7QUFBRSxXQUFPLE9BQU8sYUFBYSxJQUFJO0FBQUEsRUFBRTtBQUN2RCxVQUFRO0FBQ1IsU0FBTyxPQUFPLGNBQWMsUUFBUSxNQUFNLFFBQVMsT0FBTyxRQUFRLEtBQU07QUFDMUU7QUFFQSxJQUFJLGdCQUFnQjtBQUtwQixJQUFJLFdBQVcsU0FBU0MsVUFBUyxNQUFNQyxNQUFLO0FBQzFDLE9BQUssT0FBTztBQUNaLE9BQUssU0FBU0E7QUFDaEI7QUFFQSxTQUFTLFVBQVUsU0FBUyxTQUFTLE9BQVEsR0FBRztBQUM5QyxTQUFPLElBQUksU0FBUyxLQUFLLE1BQU0sS0FBSyxTQUFTLENBQUM7QUFDaEQ7QUFFQSxJQUFJLGlCQUFpQixTQUFTQyxnQkFBZSxHQUFHQyxRQUFPLEtBQUs7QUFDMUQsT0FBSyxRQUFRQTtBQUNiLE9BQUssTUFBTTtBQUNYLE1BQUksRUFBRSxlQUFlLE1BQU07QUFBRSxTQUFLLFNBQVMsRUFBRTtBQUFBLEVBQVk7QUFDM0Q7QUFRQSxTQUFTLFlBQVksT0FBT0MsU0FBUTtBQUNsQyxXQUFTLE9BQU8sR0FBRyxNQUFNLE9BQUs7QUFDNUIsUUFBSSxZQUFZLGNBQWMsT0FBTyxLQUFLQSxPQUFNO0FBQ2hELFFBQUksWUFBWSxHQUFHO0FBQUUsYUFBTyxJQUFJLFNBQVMsTUFBTUEsVUFBUyxHQUFHO0FBQUEsSUFBRTtBQUM3RCxNQUFFO0FBQ0YsVUFBTTtBQUFBLEVBQ1I7QUFDRjtBQUtBLElBQUksaUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPbkIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSWIsWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1aLHFCQUFxQjtBQUFBO0FBQUE7QUFBQSxFQUdyQixpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS2pCLGVBQWU7QUFBQTtBQUFBO0FBQUEsRUFHZiw0QkFBNEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUk1Qiw2QkFBNkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUk3QiwyQkFBMkI7QUFBQTtBQUFBO0FBQUEsRUFHM0IseUJBQXlCO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJekIsZUFBZTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSWYsb0JBQW9CO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtwQixXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYVQsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVNYLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNUixTQUFTO0FBQUE7QUFBQTtBQUFBLEVBR1QsWUFBWTtBQUFBO0FBQUE7QUFBQSxFQUdaLGtCQUFrQjtBQUFBO0FBQUE7QUFBQSxFQUdsQixnQkFBZ0I7QUFDbEI7QUFJQSxJQUFJLHlCQUF5QjtBQUU3QixTQUFTLFdBQVcsTUFBTTtBQUN4QixNQUFJLFVBQVUsQ0FBQztBQUVmLFdBQVMsT0FBTyxnQkFDZDtBQUFFLFlBQVEsR0FBRyxJQUFJLFFBQVEsT0FBTyxNQUFNLEdBQUcsSUFBSSxLQUFLLEdBQUcsSUFBSSxlQUFlLEdBQUc7QUFBQSxFQUFHO0FBRWhGLE1BQUksUUFBUSxnQkFBZ0IsVUFBVTtBQUNwQyxZQUFRLGNBQWM7QUFBQSxFQUN4QixXQUFXLFFBQVEsZUFBZSxNQUFNO0FBQ3RDLFFBQUksQ0FBQywwQkFBMEIsT0FBTyxZQUFZLFlBQVksUUFBUSxNQUFNO0FBQzFFLCtCQUF5QjtBQUN6QixjQUFRLEtBQUssb0hBQW9IO0FBQUEsSUFDbkk7QUFDQSxZQUFRLGNBQWM7QUFBQSxFQUN4QixXQUFXLFFBQVEsZUFBZSxNQUFNO0FBQ3RDLFlBQVEsZUFBZTtBQUFBLEVBQ3pCO0FBRUEsTUFBSSxRQUFRLGlCQUFpQixNQUMzQjtBQUFFLFlBQVEsZ0JBQWdCLFFBQVEsY0FBYztBQUFBLEVBQUc7QUFFckQsTUFBSSxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsTUFDakM7QUFBRSxZQUFRLGdCQUFnQixRQUFRLGVBQWU7QUFBQSxFQUFJO0FBRXZELE1BQUksUUFBUSxRQUFRLE9BQU8sR0FBRztBQUM1QixRQUFJLFNBQVMsUUFBUTtBQUNyQixZQUFRLFVBQVUsU0FBVSxPQUFPO0FBQUUsYUFBTyxPQUFPLEtBQUssS0FBSztBQUFBLElBQUc7QUFBQSxFQUNsRTtBQUNBLE1BQUksUUFBUSxRQUFRLFNBQVMsR0FDM0I7QUFBRSxZQUFRLFlBQVksWUFBWSxTQUFTLFFBQVEsU0FBUztBQUFBLEVBQUc7QUFFakUsTUFBSSxRQUFRLGVBQWUsY0FBYyxRQUFRLDJCQUMvQztBQUFFLFVBQU0sSUFBSSxNQUFNLGdFQUFnRTtBQUFBLEVBQUU7QUFFdEYsU0FBTztBQUNUO0FBRUEsU0FBUyxZQUFZLFNBQVMsT0FBTztBQUNuQyxTQUFPLFNBQVMsT0FBTyxNQUFNRCxRQUFPLEtBQUssVUFBVSxRQUFRO0FBQ3pELFFBQUksVUFBVTtBQUFBLE1BQ1osTUFBTSxRQUFRLFVBQVU7QUFBQSxNQUN4QixPQUFPO0FBQUEsTUFDUCxPQUFPQTtBQUFBLE1BQ1A7QUFBQSxJQUNGO0FBQ0EsUUFBSSxRQUFRLFdBQ1Y7QUFBRSxjQUFRLE1BQU0sSUFBSSxlQUFlLE1BQU0sVUFBVSxNQUFNO0FBQUEsSUFBRztBQUM5RCxRQUFJLFFBQVEsUUFDVjtBQUFFLGNBQVEsUUFBUSxDQUFDQSxRQUFPLEdBQUc7QUFBQSxJQUFHO0FBQ2xDLFVBQU0sS0FBSyxPQUFPO0FBQUEsRUFDcEI7QUFDRjtBQUdBLElBQ0ksWUFBWTtBQURoQixJQUVJLGlCQUFpQjtBQUZyQixJQUdJLGNBQWM7QUFIbEIsSUFJSSxrQkFBa0I7QUFKdEIsSUFLSSxjQUFjO0FBTGxCLElBTUkscUJBQXFCO0FBTnpCLElBT0ksY0FBYztBQVBsQixJQVFJLHFCQUFxQjtBQVJ6QixJQVNJLDJCQUEyQjtBQVQvQixJQVVJLHlCQUF5QjtBQVY3QixJQVdJLGVBQWU7QUFYbkIsSUFZSSxZQUFZLFlBQVksaUJBQWlCO0FBRTdDLFNBQVMsY0FBYyxPQUFPLFdBQVc7QUFDdkMsU0FBTyxrQkFBa0IsUUFBUSxjQUFjLE1BQU0sWUFBWSxrQkFBa0I7QUFDckY7QUFHQSxJQUNJLFlBQVk7QUFEaEIsSUFFSSxXQUFXO0FBRmYsSUFHSSxlQUFlO0FBSG5CLElBSUksZ0JBQWdCO0FBSnBCLElBS0ksb0JBQW9CO0FBTHhCLElBTUksZUFBZTtBQUVuQixJQUFJLFNBQVMsU0FBU0UsUUFBTyxTQUFTLE9BQU8sVUFBVTtBQUNyRCxPQUFLLFVBQVUsVUFBVSxXQUFXLE9BQU87QUFDM0MsT0FBSyxhQUFhLFFBQVE7QUFDMUIsT0FBSyxXQUFXLFlBQVksV0FBVyxRQUFRLGVBQWUsSUFBSSxJQUFJLFFBQVEsZUFBZSxXQUFXLFlBQVksQ0FBQyxDQUFDO0FBQ3RILE1BQUksV0FBVztBQUNmLE1BQUksUUFBUSxrQkFBa0IsTUFBTTtBQUNsQyxlQUFXLGNBQWMsUUFBUSxlQUFlLElBQUksSUFBSSxRQUFRLGdCQUFnQixJQUFJLElBQUksQ0FBQztBQUN6RixRQUFJLFFBQVEsZUFBZSxVQUFVO0FBQUUsa0JBQVk7QUFBQSxJQUFVO0FBQUEsRUFDL0Q7QUFDQSxPQUFLLGdCQUFnQixZQUFZLFFBQVE7QUFDekMsTUFBSSxrQkFBa0IsV0FBVyxXQUFXLE1BQU0sTUFBTSxjQUFjO0FBQ3RFLE9BQUssc0JBQXNCLFlBQVksY0FBYztBQUNyRCxPQUFLLDBCQUEwQixZQUFZLGlCQUFpQixNQUFNLGNBQWMsVUFBVTtBQUMxRixPQUFLLFFBQVEsT0FBTyxLQUFLO0FBS3pCLE9BQUssY0FBYztBQUtuQixNQUFJLFVBQVU7QUFDWixTQUFLLE1BQU07QUFDWCxTQUFLLFlBQVksS0FBSyxNQUFNLFlBQVksTUFBTSxXQUFXLENBQUMsSUFBSTtBQUM5RCxTQUFLLFVBQVUsS0FBSyxNQUFNLE1BQU0sR0FBRyxLQUFLLFNBQVMsRUFBRSxNQUFNLFNBQVMsRUFBRTtBQUFBLEVBQ3RFLE9BQU87QUFDTCxTQUFLLE1BQU0sS0FBSyxZQUFZO0FBQzVCLFNBQUssVUFBVTtBQUFBLEVBQ2pCO0FBSUEsT0FBSyxPQUFPLFFBQVE7QUFFcEIsT0FBSyxRQUFRO0FBRWIsT0FBSyxRQUFRLEtBQUssTUFBTSxLQUFLO0FBRzdCLE9BQUssV0FBVyxLQUFLLFNBQVMsS0FBSyxZQUFZO0FBRy9DLE9BQUssZ0JBQWdCLEtBQUssa0JBQWtCO0FBQzVDLE9BQUssZUFBZSxLQUFLLGFBQWEsS0FBSztBQUszQyxPQUFLLFVBQVUsS0FBSyxlQUFlO0FBQ25DLE9BQUssY0FBYztBQUduQixPQUFLLFdBQVcsUUFBUSxlQUFlO0FBQ3ZDLE9BQUssU0FBUyxLQUFLLFlBQVksS0FBSyxnQkFBZ0IsS0FBSyxHQUFHO0FBRzVELE9BQUssbUJBQW1CO0FBQ3hCLE9BQUssMkJBQTJCO0FBR2hDLE9BQUssV0FBVyxLQUFLLFdBQVcsS0FBSyxnQkFBZ0I7QUFFckQsT0FBSyxTQUFTLENBQUM7QUFFZixPQUFLLG1CQUFtQix1QkFBTyxPQUFPLElBQUk7QUFHMUMsTUFBSSxLQUFLLFFBQVEsS0FBSyxRQUFRLGlCQUFpQixLQUFLLE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBTSxNQUN4RTtBQUFFLFNBQUssZ0JBQWdCLENBQUM7QUFBQSxFQUFHO0FBRzdCLE9BQUssYUFBYSxDQUFDO0FBQ25CLE9BQUs7QUFBQSxJQUNILEtBQUssUUFBUSxlQUFlLGFBRXhCLGlCQUNBO0FBQUEsRUFDTjtBQUdBLE9BQUssY0FBYztBQUtuQixPQUFLLG1CQUFtQixDQUFDO0FBQzNCO0FBRUEsSUFBSSxxQkFBcUIsRUFBRSxZQUFZLEVBQUUsY0FBYyxLQUFLLEdBQUUsYUFBYSxFQUFFLGNBQWMsS0FBSyxHQUFFLFNBQVMsRUFBRSxjQUFjLEtBQUssR0FBRSxVQUFVLEVBQUUsY0FBYyxLQUFLLEdBQUUsYUFBYSxFQUFFLGNBQWMsS0FBSyxHQUFFLFlBQVksRUFBRSxjQUFjLEtBQUssR0FBRSxrQkFBa0IsRUFBRSxjQUFjLEtBQUssR0FBRSxxQkFBcUIsRUFBRSxjQUFjLEtBQUssR0FBRSxtQkFBbUIsRUFBRSxjQUFjLEtBQUssR0FBRSxZQUFZLEVBQUUsY0FBYyxLQUFLLEdBQUUsb0JBQW9CLEVBQUUsY0FBYyxLQUFLLEVBQUU7QUFFdmIsT0FBTyxVQUFVLFFBQVEsU0FBUyxRQUFTO0FBQ3pDLE1BQUksT0FBTyxLQUFLLFFBQVEsV0FBVyxLQUFLLFVBQVU7QUFDbEQsT0FBSyxVQUFVO0FBQ2YsU0FBTyxLQUFLLGNBQWMsSUFBSTtBQUNoQztBQUVBLG1CQUFtQixXQUFXLE1BQU0sV0FBWTtBQUFFLFVBQVEsS0FBSyxnQkFBZ0IsRUFBRSxRQUFRLGtCQUFrQjtBQUFFO0FBRTdHLG1CQUFtQixZQUFZLE1BQU0sV0FBWTtBQUFFLFVBQVEsS0FBSyxnQkFBZ0IsRUFBRSxRQUFRLG1CQUFtQjtBQUFFO0FBRS9HLG1CQUFtQixRQUFRLE1BQU0sV0FBWTtBQUFFLFVBQVEsS0FBSyxnQkFBZ0IsRUFBRSxRQUFRLGVBQWU7QUFBRTtBQUV2RyxtQkFBbUIsU0FBUyxNQUFNLFdBQVk7QUFDNUMsV0FBUyxJQUFJLEtBQUssV0FBVyxTQUFTLEdBQUcsS0FBSyxHQUFHLEtBQUs7QUFDcEQsUUFBSUMsT0FBTSxLQUFLLFdBQVcsQ0FBQztBQUN6QixRQUFJLFFBQVFBLEtBQUk7QUFDbEIsUUFBSSxTQUFTLDJCQUEyQix5QkFBeUI7QUFBRSxhQUFPO0FBQUEsSUFBTTtBQUNoRixRQUFJLFFBQVEsZ0JBQWdCO0FBQUUsY0FBUSxRQUFRLGVBQWU7QUFBQSxJQUFFO0FBQUEsRUFDakU7QUFDQSxTQUFRLEtBQUssWUFBWSxLQUFLLFFBQVEsZUFBZSxNQUFPLEtBQUssUUFBUTtBQUMzRTtBQUVBLG1CQUFtQixZQUFZLE1BQU0sV0FBWTtBQUMvQyxNQUFJLEtBQUssWUFBWTtBQUFFLFdBQU87QUFBQSxFQUFLO0FBQ25DLE1BQUksS0FBSyxRQUFRLDhCQUE4QixLQUFLLGdCQUFnQixFQUFFLFFBQVEsV0FBVztBQUFFLFdBQU87QUFBQSxFQUFLO0FBQ3ZHLFNBQU87QUFDVDtBQUVBLG1CQUFtQixXQUFXLE1BQU0sV0FBWTtBQUM5QyxNQUFJQSxPQUFNLEtBQUssaUJBQWlCO0FBQzlCLE1BQUksUUFBUUEsS0FBSTtBQUNsQixVQUFRLFFBQVEsZUFBZSxLQUFLLEtBQUssUUFBUTtBQUNuRDtBQUVBLG1CQUFtQixpQkFBaUIsTUFBTSxXQUFZO0FBQUUsVUFBUSxLQUFLLGlCQUFpQixFQUFFLFFBQVEsc0JBQXNCO0FBQUU7QUFFeEgsbUJBQW1CLG9CQUFvQixNQUFNLFdBQVk7QUFBRSxTQUFPLEtBQUssMkJBQTJCLEtBQUssYUFBYSxDQUFDO0FBQUU7QUFFdkgsbUJBQW1CLGtCQUFrQixNQUFNLFdBQVk7QUFDckQsV0FBUyxJQUFJLEtBQUssV0FBVyxTQUFTLEdBQUcsS0FBSyxHQUFHLEtBQUs7QUFDcEQsUUFBSUEsT0FBTSxLQUFLLFdBQVcsQ0FBQztBQUN6QixRQUFJLFFBQVFBLEtBQUk7QUFDbEIsUUFBSSxTQUFTLDJCQUEyQiwyQkFDbEMsUUFBUSxrQkFBbUIsRUFBRSxRQUFRLGNBQWU7QUFBRSxhQUFPO0FBQUEsSUFBSztBQUFBLEVBQzFFO0FBQ0EsU0FBTztBQUNUO0FBRUEsbUJBQW1CLFdBQVcsTUFBTSxXQUFZO0FBQzlDLE1BQUlBLE9BQU0sS0FBSyxhQUFhO0FBQzFCLE1BQUksUUFBUUEsS0FBSTtBQUNsQixNQUFJLFFBQVEsY0FBYztBQUFFLFdBQU87QUFBQSxFQUFNO0FBQ3pDLE1BQUksQ0FBQyxLQUFLLFlBQVksUUFBUSxXQUFXO0FBQUUsV0FBTztBQUFBLEVBQU07QUFDeEQsU0FBTztBQUNUO0FBRUEsbUJBQW1CLG1CQUFtQixNQUFNLFdBQVk7QUFDdEQsVUFBUSxLQUFLLGdCQUFnQixFQUFFLFFBQVEsNEJBQTRCO0FBQ3JFO0FBRUEsT0FBTyxTQUFTLFNBQVMsU0FBVTtBQUMvQixNQUFJLFVBQVUsQ0FBQyxHQUFHLE1BQU0sVUFBVTtBQUNsQyxTQUFRLE1BQVEsU0FBUyxHQUFJLElBQUksVUFBVyxHQUFJO0FBRWxELE1BQUksTUFBTTtBQUNWLFdBQVMsSUFBSSxHQUFHLElBQUksUUFBUSxRQUFRLEtBQUs7QUFBRSxVQUFNLFFBQVEsQ0FBQyxFQUFFLEdBQUc7QUFBQSxFQUFHO0FBQ2xFLFNBQU87QUFDVDtBQUVBLE9BQU8sUUFBUSxTQUFTQyxPQUFPLE9BQU8sU0FBUztBQUM3QyxTQUFPLElBQUksS0FBSyxTQUFTLEtBQUssRUFBRSxNQUFNO0FBQ3hDO0FBRUEsT0FBTyxvQkFBb0IsU0FBUyxrQkFBbUIsT0FBTyxLQUFLLFNBQVM7QUFDMUUsTUFBSSxTQUFTLElBQUksS0FBSyxTQUFTLE9BQU8sR0FBRztBQUN6QyxTQUFPLFVBQVU7QUFDakIsU0FBTyxPQUFPLGdCQUFnQjtBQUNoQztBQUVBLE9BQU8sWUFBWSxTQUFTLFVBQVcsT0FBTyxTQUFTO0FBQ3JELFNBQU8sSUFBSSxLQUFLLFNBQVMsS0FBSztBQUNoQztBQUVBLE9BQU8saUJBQWtCLE9BQU8sV0FBVyxrQkFBbUI7QUFFOUQsSUFBSSxPQUFPLE9BQU87QUFJbEIsSUFBSSxVQUFVO0FBQ2QsS0FBSyxrQkFBa0IsU0FBU0osUUFBTztBQUNyQyxNQUFJLEtBQUssUUFBUSxjQUFjLEdBQUc7QUFBRSxXQUFPO0FBQUEsRUFBTTtBQUNqRCxhQUFTO0FBRVAsbUJBQWUsWUFBWUE7QUFDM0IsSUFBQUEsVUFBUyxlQUFlLEtBQUssS0FBSyxLQUFLLEVBQUUsQ0FBQyxFQUFFO0FBQzVDLFFBQUksUUFBUSxRQUFRLEtBQUssS0FBSyxNQUFNLE1BQU1BLE1BQUssQ0FBQztBQUNoRCxRQUFJLENBQUMsT0FBTztBQUFFLGFBQU87QUFBQSxJQUFNO0FBQzNCLFNBQUssTUFBTSxDQUFDLEtBQUssTUFBTSxDQUFDLE9BQU8sY0FBYztBQUMzQyxxQkFBZSxZQUFZQSxTQUFRLE1BQU0sQ0FBQyxFQUFFO0FBQzVDLFVBQUksYUFBYSxlQUFlLEtBQUssS0FBSyxLQUFLLEdBQUcsTUFBTSxXQUFXLFFBQVEsV0FBVyxDQUFDLEVBQUU7QUFDekYsVUFBSSxPQUFPLEtBQUssTUFBTSxPQUFPLEdBQUc7QUFDaEMsYUFBTyxTQUFTLE9BQU8sU0FBUyxPQUM3QixVQUFVLEtBQUssV0FBVyxDQUFDLENBQUMsS0FDNUIsRUFBRSxzQkFBc0IsS0FBSyxJQUFJLEtBQUssU0FBUyxPQUFPLEtBQUssTUFBTSxPQUFPLE1BQU0sQ0FBQyxNQUFNO0FBQUEsSUFDMUY7QUFDQSxJQUFBQSxVQUFTLE1BQU0sQ0FBQyxFQUFFO0FBR2xCLG1CQUFlLFlBQVlBO0FBQzNCLElBQUFBLFVBQVMsZUFBZSxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUMsRUFBRTtBQUM1QyxRQUFJLEtBQUssTUFBTUEsTUFBSyxNQUFNLEtBQ3hCO0FBQUUsTUFBQUE7QUFBQSxJQUFTO0FBQUEsRUFDZjtBQUNGO0FBS0EsS0FBSyxNQUFNLFNBQVMsTUFBTTtBQUN4QixNQUFJLEtBQUssU0FBUyxNQUFNO0FBQ3RCLFNBQUssS0FBSztBQUNWLFdBQU87QUFBQSxFQUNULE9BQU87QUFDTCxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBSUEsS0FBSyxlQUFlLFNBQVMsTUFBTTtBQUNqQyxTQUFPLEtBQUssU0FBUyxRQUFRLFFBQVEsS0FBSyxVQUFVLFFBQVEsQ0FBQyxLQUFLO0FBQ3BFO0FBSUEsS0FBSyxnQkFBZ0IsU0FBUyxNQUFNO0FBQ2xDLE1BQUksQ0FBQyxLQUFLLGFBQWEsSUFBSSxHQUFHO0FBQUUsV0FBTztBQUFBLEVBQU07QUFDN0MsT0FBSyxLQUFLO0FBQ1YsU0FBTztBQUNUO0FBSUEsS0FBSyxtQkFBbUIsU0FBUyxNQUFNO0FBQ3JDLE1BQUksQ0FBQyxLQUFLLGNBQWMsSUFBSSxHQUFHO0FBQUUsU0FBSyxXQUFXO0FBQUEsRUFBRztBQUN0RDtBQUlBLEtBQUsscUJBQXFCLFdBQVc7QUFDbkMsU0FBTyxLQUFLLFNBQVMsUUFBUSxPQUMzQixLQUFLLFNBQVMsUUFBUSxVQUN0QixVQUFVLEtBQUssS0FBSyxNQUFNLE1BQU0sS0FBSyxZQUFZLEtBQUssS0FBSyxDQUFDO0FBQ2hFO0FBRUEsS0FBSyxrQkFBa0IsV0FBVztBQUNoQyxNQUFJLEtBQUssbUJBQW1CLEdBQUc7QUFDN0IsUUFBSSxLQUFLLFFBQVEscUJBQ2Y7QUFBRSxXQUFLLFFBQVEsb0JBQW9CLEtBQUssWUFBWSxLQUFLLGFBQWE7QUFBQSxJQUFHO0FBQzNFLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFLQSxLQUFLLFlBQVksV0FBVztBQUMxQixNQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsSUFBSSxLQUFLLENBQUMsS0FBSyxnQkFBZ0IsR0FBRztBQUFFLFNBQUssV0FBVztBQUFBLEVBQUc7QUFDL0U7QUFFQSxLQUFLLHFCQUFxQixTQUFTLFNBQVMsU0FBUztBQUNuRCxNQUFJLEtBQUssU0FBUyxTQUFTO0FBQ3pCLFFBQUksS0FBSyxRQUFRLGlCQUNmO0FBQUUsV0FBSyxRQUFRLGdCQUFnQixLQUFLLGNBQWMsS0FBSyxlQUFlO0FBQUEsSUFBRztBQUMzRSxRQUFJLENBQUMsU0FDSDtBQUFFLFdBQUssS0FBSztBQUFBLElBQUc7QUFDakIsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUtBLEtBQUssU0FBUyxTQUFTLE1BQU07QUFDM0IsT0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFdBQVc7QUFDcEM7QUFJQSxLQUFLLGFBQWEsU0FBUyxLQUFLO0FBQzlCLE9BQUssTUFBTSxPQUFPLE9BQU8sTUFBTSxLQUFLLE9BQU8sa0JBQWtCO0FBQy9EO0FBRUEsSUFBSSxzQkFBc0IsU0FBU0ssdUJBQXNCO0FBQ3ZELE9BQUssa0JBQ0wsS0FBSyxnQkFDTCxLQUFLLHNCQUNMLEtBQUssb0JBQ0wsS0FBSyxjQUNIO0FBQ0o7QUFFQSxLQUFLLHFCQUFxQixTQUFTLHdCQUF3QixVQUFVO0FBQ25FLE1BQUksQ0FBQyx3QkFBd0I7QUFBRTtBQUFBLEVBQU87QUFDdEMsTUFBSSx1QkFBdUIsZ0JBQWdCLElBQ3pDO0FBQUUsU0FBSyxpQkFBaUIsdUJBQXVCLGVBQWUsK0NBQStDO0FBQUEsRUFBRztBQUNsSCxNQUFJLFNBQVMsV0FBVyx1QkFBdUIsc0JBQXNCLHVCQUF1QjtBQUM1RixNQUFJLFNBQVMsSUFBSTtBQUFFLFNBQUssaUJBQWlCLFFBQVEsV0FBVyx3QkFBd0IsdUJBQXVCO0FBQUEsRUFBRztBQUNoSDtBQUVBLEtBQUssd0JBQXdCLFNBQVMsd0JBQXdCLFVBQVU7QUFDdEUsTUFBSSxDQUFDLHdCQUF3QjtBQUFFLFdBQU87QUFBQSxFQUFNO0FBQzVDLE1BQUksa0JBQWtCLHVCQUF1QjtBQUM3QyxNQUFJLGNBQWMsdUJBQXVCO0FBQ3pDLE1BQUksQ0FBQyxVQUFVO0FBQUUsV0FBTyxtQkFBbUIsS0FBSyxlQUFlO0FBQUEsRUFBRTtBQUNqRSxNQUFJLG1CQUFtQixHQUNyQjtBQUFFLFNBQUssTUFBTSxpQkFBaUIseUVBQXlFO0FBQUEsRUFBRztBQUM1RyxNQUFJLGVBQWUsR0FDakI7QUFBRSxTQUFLLGlCQUFpQixhQUFhLG9DQUFvQztBQUFBLEVBQUc7QUFDaEY7QUFFQSxLQUFLLGlDQUFpQyxXQUFXO0FBQy9DLE1BQUksS0FBSyxhQUFhLENBQUMsS0FBSyxZQUFZLEtBQUssV0FBVyxLQUFLLFdBQzNEO0FBQUUsU0FBSyxNQUFNLEtBQUssVUFBVSw0Q0FBNEM7QUFBQSxFQUFHO0FBQzdFLE1BQUksS0FBSyxVQUNQO0FBQUUsU0FBSyxNQUFNLEtBQUssVUFBVSw0Q0FBNEM7QUFBQSxFQUFHO0FBQy9FO0FBRUEsS0FBSyx1QkFBdUIsU0FBUyxNQUFNO0FBQ3pDLE1BQUksS0FBSyxTQUFTLDJCQUNoQjtBQUFFLFdBQU8sS0FBSyxxQkFBcUIsS0FBSyxVQUFVO0FBQUEsRUFBRTtBQUN0RCxTQUFPLEtBQUssU0FBUyxnQkFBZ0IsS0FBSyxTQUFTO0FBQ3JEO0FBRUEsSUFBSSxPQUFPLE9BQU87QUFTbEIsS0FBSyxnQkFBZ0IsU0FBUyxNQUFNO0FBQ2xDLE1BQUksVUFBVSx1QkFBTyxPQUFPLElBQUk7QUFDaEMsTUFBSSxDQUFDLEtBQUssTUFBTTtBQUFFLFNBQUssT0FBTyxDQUFDO0FBQUEsRUFBRztBQUNsQyxTQUFPLEtBQUssU0FBUyxRQUFRLEtBQUs7QUFDaEMsUUFBSSxPQUFPLEtBQUssZUFBZSxNQUFNLE1BQU0sT0FBTztBQUNsRCxTQUFLLEtBQUssS0FBSyxJQUFJO0FBQUEsRUFDckI7QUFDQSxNQUFJLEtBQUssVUFDUDtBQUFFLGFBQVMsSUFBSSxHQUFHLE9BQU8sT0FBTyxLQUFLLEtBQUssZ0JBQWdCLEdBQUcsSUFBSSxLQUFLLFFBQVEsS0FBSyxHQUNqRjtBQUNFLFVBQUksT0FBTyxLQUFLLENBQUM7QUFFakIsV0FBSyxpQkFBaUIsS0FBSyxpQkFBaUIsSUFBSSxFQUFFLE9BQVEsYUFBYSxPQUFPLGtCQUFtQjtBQUFBLElBQ25HO0FBQUEsRUFBRTtBQUNOLE9BQUssdUJBQXVCLEtBQUssSUFBSTtBQUNyQyxPQUFLLEtBQUs7QUFDVixPQUFLLGFBQWEsS0FBSyxRQUFRLGVBQWUsYUFBYSxXQUFXLEtBQUssUUFBUTtBQUNuRixTQUFPLEtBQUssV0FBVyxNQUFNLFNBQVM7QUFDeEM7QUFFQSxJQUFJLFlBQVksRUFBQyxNQUFNLE9BQU07QUFBN0IsSUFBZ0MsY0FBYyxFQUFDLE1BQU0sU0FBUTtBQUU3RCxLQUFLLFFBQVEsU0FBUyxTQUFTO0FBQzdCLE1BQUksS0FBSyxRQUFRLGNBQWMsS0FBSyxDQUFDLEtBQUssYUFBYSxLQUFLLEdBQUc7QUFBRSxXQUFPO0FBQUEsRUFBTTtBQUM5RSxpQkFBZSxZQUFZLEtBQUs7QUFDaEMsTUFBSSxPQUFPLGVBQWUsS0FBSyxLQUFLLEtBQUs7QUFDekMsTUFBSSxPQUFPLEtBQUssTUFBTSxLQUFLLENBQUMsRUFBRSxRQUFRLFNBQVMsS0FBSyxlQUFlLElBQUk7QUFLdkUsTUFBSSxXQUFXLE1BQU0sV0FBVyxJQUFJO0FBQUUsV0FBTztBQUFBLEVBQUs7QUFDbEQsTUFBSSxTQUFTO0FBQUUsV0FBTztBQUFBLEVBQU07QUFFNUIsTUFBSSxXQUFXLEtBQUs7QUFBRSxXQUFPO0FBQUEsRUFBSztBQUNsQyxNQUFJLGtCQUFrQixNQUFNLEdBQUc7QUFDN0IsUUFBSUwsU0FBUTtBQUNaLE9BQUc7QUFBRSxjQUFRLFVBQVUsUUFBUyxJQUFJO0FBQUEsSUFBRyxTQUNoQyxpQkFBaUIsU0FBUyxLQUFLLGVBQWUsSUFBSSxDQUFDO0FBQzFELFFBQUksV0FBVyxJQUFJO0FBQUUsYUFBTztBQUFBLElBQUs7QUFDakMsUUFBSSxRQUFRLEtBQUssTUFBTSxNQUFNQSxRQUFPLElBQUk7QUFDeEMsUUFBSSxDQUFDLDBCQUEwQixLQUFLLEtBQUssR0FBRztBQUFFLGFBQU87QUFBQSxJQUFLO0FBQUEsRUFDNUQ7QUFDQSxTQUFPO0FBQ1Q7QUFLQSxLQUFLLGtCQUFrQixXQUFXO0FBQ2hDLE1BQUksS0FBSyxRQUFRLGNBQWMsS0FBSyxDQUFDLEtBQUssYUFBYSxPQUFPLEdBQzVEO0FBQUUsV0FBTztBQUFBLEVBQU07QUFFakIsaUJBQWUsWUFBWSxLQUFLO0FBQ2hDLE1BQUksT0FBTyxlQUFlLEtBQUssS0FBSyxLQUFLO0FBQ3pDLE1BQUksT0FBTyxLQUFLLE1BQU0sS0FBSyxDQUFDLEVBQUUsUUFBUTtBQUN0QyxTQUFPLENBQUMsVUFBVSxLQUFLLEtBQUssTUFBTSxNQUFNLEtBQUssS0FBSyxJQUFJLENBQUMsS0FDckQsS0FBSyxNQUFNLE1BQU0sTUFBTSxPQUFPLENBQUMsTUFBTSxlQUNwQyxPQUFPLE1BQU0sS0FBSyxNQUFNLFVBQ3hCLEVBQUUsaUJBQWlCLFFBQVEsS0FBSyxlQUFlLE9BQU8sQ0FBQyxDQUFDLEtBQUssVUFBVTtBQUM1RTtBQUVBLEtBQUssaUJBQWlCLFNBQVMsY0FBYyxPQUFPO0FBQ2xELE1BQUksS0FBSyxRQUFRLGNBQWMsTUFBTSxDQUFDLEtBQUssYUFBYSxlQUFlLFVBQVUsT0FBTyxHQUN0RjtBQUFFLFdBQU87QUFBQSxFQUFNO0FBRWpCLGlCQUFlLFlBQVksS0FBSztBQUNoQyxNQUFJLE9BQU8sZUFBZSxLQUFLLEtBQUssS0FBSztBQUN6QyxNQUFJLE9BQU8sS0FBSyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBRTlCLE1BQUksVUFBVSxLQUFLLEtBQUssTUFBTSxNQUFNLEtBQUssS0FBSyxJQUFJLENBQUMsR0FBRztBQUFFLFdBQU87QUFBQSxFQUFNO0FBRXJFLE1BQUksY0FBYztBQUNoQixRQUFJLGNBQWMsT0FBTyxHQUFlO0FBQ3hDLFFBQUksS0FBSyxNQUFNLE1BQU0sTUFBTSxXQUFXLE1BQU0sV0FDMUMsZ0JBQWdCLEtBQUssTUFBTSxVQUMzQixpQkFBaUIsUUFBUSxLQUFLLGVBQWUsV0FBVyxDQUFDLEtBQ3pELFVBQVUsSUFDVjtBQUFFLGFBQU87QUFBQSxJQUFNO0FBRWpCLG1CQUFlLFlBQVk7QUFDM0IsUUFBSSxpQkFBaUIsZUFBZSxLQUFLLEtBQUssS0FBSztBQUNuRCxXQUFPLGNBQWMsZUFBZSxDQUFDLEVBQUU7QUFDdkMsUUFBSSxrQkFBa0IsVUFBVSxLQUFLLEtBQUssTUFBTSxNQUFNLGFBQWEsSUFBSSxDQUFDLEdBQUc7QUFBRSxhQUFPO0FBQUEsSUFBTTtBQUFBLEVBQzVGO0FBRUEsTUFBSSxLQUFLLEtBQUssZUFBZSxJQUFJO0FBQ2pDLE1BQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLE9BQU8sSUFBYztBQUFFLFdBQU87QUFBQSxFQUFNO0FBQ2xFLE1BQUksVUFBVTtBQUNkLEtBQUc7QUFBRSxZQUFRLE1BQU0sUUFBUyxJQUFJO0FBQUEsRUFBRyxTQUM1QixpQkFBaUIsS0FBSyxLQUFLLGVBQWUsSUFBSSxDQUFDO0FBQ3RELE1BQUksT0FBTyxJQUFJO0FBQUUsV0FBTztBQUFBLEVBQUs7QUFDN0IsTUFBSSxLQUFLLEtBQUssTUFBTSxNQUFNLFNBQVMsSUFBSTtBQUN2QyxNQUFJLDBCQUEwQixLQUFLLEVBQUUsS0FBSyxTQUFTLE9BQU8sTUFBTTtBQUFFLFdBQU87QUFBQSxFQUFNO0FBQy9FLFNBQU87QUFDVDtBQUVBLEtBQUssZUFBZSxTQUFTLE9BQU87QUFDbEMsU0FBTyxLQUFLLGVBQWUsTUFBTSxLQUFLO0FBQ3hDO0FBRUEsS0FBSyxVQUFVLFNBQVMsT0FBTztBQUM3QixTQUFPLEtBQUssZUFBZSxPQUFPLEtBQUs7QUFDekM7QUFTQSxLQUFLLGlCQUFpQixTQUFTLFNBQVMsVUFBVSxTQUFTO0FBQ3pELE1BQUksWUFBWSxLQUFLLE1BQU0sT0FBTyxLQUFLLFVBQVUsR0FBRztBQUVwRCxNQUFJLEtBQUssTUFBTSxPQUFPLEdBQUc7QUFDdkIsZ0JBQVksUUFBUTtBQUNwQixXQUFPO0FBQUEsRUFDVDtBQU1BLFVBQVEsV0FBVztBQUFBLElBQ25CLEtBQUssUUFBUTtBQUFBLElBQVEsS0FBSyxRQUFRO0FBQVcsYUFBTyxLQUFLLDRCQUE0QixNQUFNLFVBQVUsT0FBTztBQUFBLElBQzVHLEtBQUssUUFBUTtBQUFXLGFBQU8sS0FBSyx1QkFBdUIsSUFBSTtBQUFBLElBQy9ELEtBQUssUUFBUTtBQUFLLGFBQU8sS0FBSyxpQkFBaUIsSUFBSTtBQUFBLElBQ25ELEtBQUssUUFBUTtBQUFNLGFBQU8sS0FBSyxrQkFBa0IsSUFBSTtBQUFBLElBQ3JELEtBQUssUUFBUTtBQUlYLFVBQUssWUFBWSxLQUFLLFVBQVUsWUFBWSxRQUFRLFlBQVksWUFBYSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQUUsYUFBSyxXQUFXO0FBQUEsTUFBRztBQUNqSSxhQUFPLEtBQUssdUJBQXVCLE1BQU0sT0FBTyxDQUFDLE9BQU87QUFBQSxJQUMxRCxLQUFLLFFBQVE7QUFDWCxVQUFJLFNBQVM7QUFBRSxhQUFLLFdBQVc7QUFBQSxNQUFHO0FBQ2xDLGFBQU8sS0FBSyxXQUFXLE1BQU0sSUFBSTtBQUFBLElBQ25DLEtBQUssUUFBUTtBQUFLLGFBQU8sS0FBSyxpQkFBaUIsSUFBSTtBQUFBLElBQ25ELEtBQUssUUFBUTtBQUFTLGFBQU8sS0FBSyxxQkFBcUIsSUFBSTtBQUFBLElBQzNELEtBQUssUUFBUTtBQUFTLGFBQU8sS0FBSyxxQkFBcUIsSUFBSTtBQUFBLElBQzNELEtBQUssUUFBUTtBQUFRLGFBQU8sS0FBSyxvQkFBb0IsSUFBSTtBQUFBLElBQ3pELEtBQUssUUFBUTtBQUFNLGFBQU8sS0FBSyxrQkFBa0IsSUFBSTtBQUFBLElBQ3JELEtBQUssUUFBUTtBQUFBLElBQVEsS0FBSyxRQUFRO0FBQ2hDLGFBQU8sUUFBUSxLQUFLO0FBQ3BCLFVBQUksV0FBVyxTQUFTLE9BQU87QUFBRSxhQUFLLFdBQVc7QUFBQSxNQUFHO0FBQ3BELGFBQU8sS0FBSyxrQkFBa0IsTUFBTSxJQUFJO0FBQUEsSUFDMUMsS0FBSyxRQUFRO0FBQVEsYUFBTyxLQUFLLG9CQUFvQixJQUFJO0FBQUEsSUFDekQsS0FBSyxRQUFRO0FBQU8sYUFBTyxLQUFLLG1CQUFtQixJQUFJO0FBQUEsSUFDdkQsS0FBSyxRQUFRO0FBQVEsYUFBTyxLQUFLLFdBQVcsTUFBTSxJQUFJO0FBQUEsSUFDdEQsS0FBSyxRQUFRO0FBQU0sYUFBTyxLQUFLLG9CQUFvQixJQUFJO0FBQUEsSUFDdkQsS0FBSyxRQUFRO0FBQUEsSUFDYixLQUFLLFFBQVE7QUFDWCxVQUFJLEtBQUssUUFBUSxjQUFjLE1BQU0sY0FBYyxRQUFRLFNBQVM7QUFDbEUsdUJBQWUsWUFBWSxLQUFLO0FBQ2hDLFlBQUksT0FBTyxlQUFlLEtBQUssS0FBSyxLQUFLO0FBQ3pDLFlBQUksT0FBTyxLQUFLLE1BQU0sS0FBSyxDQUFDLEVBQUUsUUFBUSxTQUFTLEtBQUssTUFBTSxXQUFXLElBQUk7QUFDekUsWUFBSSxXQUFXLE1BQU0sV0FBVyxJQUM5QjtBQUFFLGlCQUFPLEtBQUsseUJBQXlCLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQztBQUFBLFFBQUU7QUFBQSxNQUN6RTtBQUVBLFVBQUksQ0FBQyxLQUFLLFFBQVEsNkJBQTZCO0FBQzdDLFlBQUksQ0FBQyxVQUNIO0FBQUUsZUFBSyxNQUFNLEtBQUssT0FBTyx3REFBd0Q7QUFBQSxRQUFHO0FBQ3RGLFlBQUksQ0FBQyxLQUFLLFVBQ1I7QUFBRSxlQUFLLE1BQU0sS0FBSyxPQUFPLGlFQUFpRTtBQUFBLFFBQUc7QUFBQSxNQUNqRztBQUNBLGFBQU8sY0FBYyxRQUFRLFVBQVUsS0FBSyxZQUFZLElBQUksSUFBSSxLQUFLLFlBQVksTUFBTSxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBT2hHO0FBQ0UsVUFBSSxLQUFLLGdCQUFnQixHQUFHO0FBQzFCLFlBQUksU0FBUztBQUFFLGVBQUssV0FBVztBQUFBLFFBQUc7QUFDbEMsYUFBSyxLQUFLO0FBQ1YsZUFBTyxLQUFLLHVCQUF1QixNQUFNLE1BQU0sQ0FBQyxPQUFPO0FBQUEsTUFDekQ7QUFFQSxVQUFJLFlBQVksS0FBSyxhQUFhLEtBQUssSUFBSSxnQkFBZ0IsS0FBSyxRQUFRLEtBQUssSUFBSSxVQUFVO0FBQzNGLFVBQUksV0FBVztBQUNiLFlBQUksQ0FBQyxLQUFLLFlBQVk7QUFDcEIsZUFBSyxNQUFNLEtBQUssT0FBTyw2R0FBNkc7QUFBQSxRQUN0STtBQUNBLFlBQUksY0FBYyxlQUFlO0FBQy9CLGNBQUksQ0FBQyxLQUFLLFVBQVU7QUFDbEIsaUJBQUssTUFBTSxLQUFLLE9BQU8scURBQXFEO0FBQUEsVUFDOUU7QUFDQSxlQUFLLEtBQUs7QUFBQSxRQUNaO0FBQ0EsYUFBSyxLQUFLO0FBQ1YsYUFBSyxTQUFTLE1BQU0sT0FBTyxTQUFTO0FBQ3BDLGFBQUssVUFBVTtBQUNmLGVBQU8sS0FBSyxXQUFXLE1BQU0scUJBQXFCO0FBQUEsTUFDcEQ7QUFFQSxVQUFJLFlBQVksS0FBSyxPQUFPLE9BQU8sS0FBSyxnQkFBZ0I7QUFDeEQsVUFBSSxjQUFjLFFBQVEsUUFBUSxLQUFLLFNBQVMsZ0JBQWdCLEtBQUssSUFBSSxRQUFRLEtBQUssR0FDcEY7QUFBRSxlQUFPLEtBQUssc0JBQXNCLE1BQU0sV0FBVyxNQUFNLE9BQU87QUFBQSxNQUFFLE9BQ2pFO0FBQUUsZUFBTyxLQUFLLHlCQUF5QixNQUFNLElBQUk7QUFBQSxNQUFFO0FBQUEsRUFDMUQ7QUFDRjtBQUVBLEtBQUssOEJBQThCLFNBQVMsTUFBTSxTQUFTO0FBQ3pELE1BQUksVUFBVSxZQUFZO0FBQzFCLE9BQUssS0FBSztBQUNWLE1BQUksS0FBSyxJQUFJLFFBQVEsSUFBSSxLQUFLLEtBQUssZ0JBQWdCLEdBQUc7QUFBRSxTQUFLLFFBQVE7QUFBQSxFQUFNLFdBQ2xFLEtBQUssU0FBUyxRQUFRLE1BQU07QUFBRSxTQUFLLFdBQVc7QUFBQSxFQUFHLE9BQ3JEO0FBQ0gsU0FBSyxRQUFRLEtBQUssV0FBVztBQUM3QixTQUFLLFVBQVU7QUFBQSxFQUNqQjtBQUlBLE1BQUksSUFBSTtBQUNSLFNBQU8sSUFBSSxLQUFLLE9BQU8sUUFBUSxFQUFFLEdBQUc7QUFDbEMsUUFBSSxNQUFNLEtBQUssT0FBTyxDQUFDO0FBQ3ZCLFFBQUksS0FBSyxTQUFTLFFBQVEsSUFBSSxTQUFTLEtBQUssTUFBTSxNQUFNO0FBQ3RELFVBQUksSUFBSSxRQUFRLFNBQVMsV0FBVyxJQUFJLFNBQVMsU0FBUztBQUFFO0FBQUEsTUFBTTtBQUNsRSxVQUFJLEtBQUssU0FBUyxTQUFTO0FBQUU7QUFBQSxNQUFNO0FBQUEsSUFDckM7QUFBQSxFQUNGO0FBQ0EsTUFBSSxNQUFNLEtBQUssT0FBTyxRQUFRO0FBQUUsU0FBSyxNQUFNLEtBQUssT0FBTyxpQkFBaUIsT0FBTztBQUFBLEVBQUc7QUFDbEYsU0FBTyxLQUFLLFdBQVcsTUFBTSxVQUFVLG1CQUFtQixtQkFBbUI7QUFDL0U7QUFFQSxLQUFLLHlCQUF5QixTQUFTLE1BQU07QUFDM0MsT0FBSyxLQUFLO0FBQ1YsT0FBSyxVQUFVO0FBQ2YsU0FBTyxLQUFLLFdBQVcsTUFBTSxtQkFBbUI7QUFDbEQ7QUFFQSxLQUFLLG1CQUFtQixTQUFTLE1BQU07QUFDckMsT0FBSyxLQUFLO0FBQ1YsT0FBSyxPQUFPLEtBQUssU0FBUztBQUMxQixPQUFLLE9BQU8sS0FBSyxlQUFlLElBQUk7QUFDcEMsT0FBSyxPQUFPLElBQUk7QUFDaEIsT0FBSyxPQUFPLFFBQVEsTUFBTTtBQUMxQixPQUFLLE9BQU8sS0FBSyxxQkFBcUI7QUFDdEMsTUFBSSxLQUFLLFFBQVEsZUFBZSxHQUM5QjtBQUFFLFNBQUssSUFBSSxRQUFRLElBQUk7QUFBQSxFQUFHLE9BRTFCO0FBQUUsU0FBSyxVQUFVO0FBQUEsRUFBRztBQUN0QixTQUFPLEtBQUssV0FBVyxNQUFNLGtCQUFrQjtBQUNqRDtBQVVBLEtBQUssb0JBQW9CLFNBQVMsTUFBTTtBQUN0QyxPQUFLLEtBQUs7QUFDVixNQUFJLFVBQVcsS0FBSyxRQUFRLGVBQWUsS0FBSyxLQUFLLFlBQVksS0FBSyxjQUFjLE9BQU8sSUFBSyxLQUFLLGVBQWU7QUFDcEgsT0FBSyxPQUFPLEtBQUssU0FBUztBQUMxQixPQUFLLFdBQVcsQ0FBQztBQUNqQixPQUFLLE9BQU8sUUFBUSxNQUFNO0FBQzFCLE1BQUksS0FBSyxTQUFTLFFBQVEsTUFBTTtBQUM5QixRQUFJLFVBQVUsSUFBSTtBQUFFLFdBQUssV0FBVyxPQUFPO0FBQUEsSUFBRztBQUM5QyxXQUFPLEtBQUssU0FBUyxNQUFNLElBQUk7QUFBQSxFQUNqQztBQUNBLE1BQUksUUFBUSxLQUFLLE1BQU07QUFDdkIsTUFBSSxLQUFLLFNBQVMsUUFBUSxRQUFRLEtBQUssU0FBUyxRQUFRLFVBQVUsT0FBTztBQUN2RSxRQUFJLFNBQVMsS0FBSyxVQUFVLEdBQUcsT0FBTyxRQUFRLFFBQVEsS0FBSztBQUMzRCxTQUFLLEtBQUs7QUFDVixTQUFLLFNBQVMsUUFBUSxNQUFNLElBQUk7QUFDaEMsU0FBSyxXQUFXLFFBQVEscUJBQXFCO0FBQzdDLFdBQU8sS0FBSyxrQkFBa0IsTUFBTSxRQUFRLE9BQU87QUFBQSxFQUNyRDtBQUNBLE1BQUksZ0JBQWdCLEtBQUssYUFBYSxLQUFLLEdBQUcsVUFBVTtBQUV4RCxNQUFJLFlBQVksS0FBSyxRQUFRLElBQUksSUFBSSxVQUFVLEtBQUssYUFBYSxJQUFJLElBQUksZ0JBQWdCO0FBQ3pGLE1BQUksV0FBVztBQUNiLFFBQUksU0FBUyxLQUFLLFVBQVU7QUFDNUIsU0FBSyxLQUFLO0FBQ1YsUUFBSSxjQUFjLGVBQWU7QUFDL0IsVUFBSSxDQUFDLEtBQUssVUFBVTtBQUNsQixhQUFLLE1BQU0sS0FBSyxPQUFPLHFEQUFxRDtBQUFBLE1BQzlFO0FBQ0EsV0FBSyxLQUFLO0FBQUEsSUFDWjtBQUNBLFNBQUssU0FBUyxRQUFRLE1BQU0sU0FBUztBQUNyQyxTQUFLLFdBQVcsUUFBUSxxQkFBcUI7QUFDN0MsV0FBTyxLQUFLLGtCQUFrQixNQUFNLFFBQVEsT0FBTztBQUFBLEVBQ3JEO0FBQ0EsTUFBSSxjQUFjLEtBQUs7QUFDdkIsTUFBSSx5QkFBeUIsSUFBSTtBQUNqQyxNQUFJLFVBQVUsS0FBSztBQUNuQixNQUFJLE9BQU8sVUFBVSxLQUNqQixLQUFLLG9CQUFvQix3QkFBd0IsT0FBTyxJQUN4RCxLQUFLLGdCQUFnQixNQUFNLHNCQUFzQjtBQUNyRCxNQUFJLEtBQUssU0FBUyxRQUFRLFFBQVEsVUFBVSxLQUFLLFFBQVEsZUFBZSxLQUFLLEtBQUssYUFBYSxJQUFJLElBQUk7QUFDckcsUUFBSSxVQUFVLElBQUk7QUFDaEIsVUFBSSxLQUFLLFNBQVMsUUFBUSxLQUFLO0FBQUUsYUFBSyxXQUFXLE9BQU87QUFBQSxNQUFHO0FBQzNELFdBQUssUUFBUTtBQUFBLElBQ2YsV0FBVyxXQUFXLEtBQUssUUFBUSxlQUFlLEdBQUc7QUFDbkQsVUFBSSxLQUFLLFVBQVUsV0FBVyxDQUFDLGVBQWUsS0FBSyxTQUFTLGdCQUFnQixLQUFLLFNBQVMsU0FBUztBQUFFLGFBQUssV0FBVztBQUFBLE1BQUcsV0FDL0csS0FBSyxRQUFRLGVBQWUsR0FBRztBQUFFLGFBQUssUUFBUTtBQUFBLE1BQU87QUFBQSxJQUNoRTtBQUNBLFFBQUksaUJBQWlCLFNBQVM7QUFBRSxXQUFLLE1BQU0sS0FBSyxPQUFPLCtEQUErRDtBQUFBLElBQUc7QUFDekgsU0FBSyxhQUFhLE1BQU0sT0FBTyxzQkFBc0I7QUFDckQsU0FBSyxpQkFBaUIsSUFBSTtBQUMxQixXQUFPLEtBQUssV0FBVyxNQUFNLElBQUk7QUFBQSxFQUNuQyxPQUFPO0FBQ0wsU0FBSyxzQkFBc0Isd0JBQXdCLElBQUk7QUFBQSxFQUN6RDtBQUNBLE1BQUksVUFBVSxJQUFJO0FBQUUsU0FBSyxXQUFXLE9BQU87QUFBQSxFQUFHO0FBQzlDLFNBQU8sS0FBSyxTQUFTLE1BQU0sSUFBSTtBQUNqQztBQUdBLEtBQUssb0JBQW9CLFNBQVMsTUFBTSxNQUFNLFNBQVM7QUFDckQsT0FBSyxLQUFLLFNBQVMsUUFBUSxPQUFRLEtBQUssUUFBUSxlQUFlLEtBQUssS0FBSyxhQUFhLElBQUksTUFBTyxLQUFLLGFBQWEsV0FBVyxHQUFHO0FBQy9ILFFBQUksS0FBSyxRQUFRLGVBQWUsR0FBRztBQUNqQyxVQUFJLEtBQUssU0FBUyxRQUFRLEtBQUs7QUFDN0IsWUFBSSxVQUFVLElBQUk7QUFBRSxlQUFLLFdBQVcsT0FBTztBQUFBLFFBQUc7QUFBQSxNQUNoRCxPQUFPO0FBQUUsYUFBSyxRQUFRLFVBQVU7QUFBQSxNQUFJO0FBQUEsSUFDdEM7QUFDQSxXQUFPLEtBQUssV0FBVyxNQUFNLElBQUk7QUFBQSxFQUNuQztBQUNBLE1BQUksVUFBVSxJQUFJO0FBQUUsU0FBSyxXQUFXLE9BQU87QUFBQSxFQUFHO0FBQzlDLFNBQU8sS0FBSyxTQUFTLE1BQU0sSUFBSTtBQUNqQztBQUVBLEtBQUsseUJBQXlCLFNBQVMsTUFBTSxTQUFTLHFCQUFxQjtBQUN6RSxPQUFLLEtBQUs7QUFDVixTQUFPLEtBQUssY0FBYyxNQUFNLGtCQUFrQixzQkFBc0IsSUFBSSx5QkFBeUIsT0FBTyxPQUFPO0FBQ3JIO0FBRUEsS0FBSyxtQkFBbUIsU0FBUyxNQUFNO0FBQ3JDLE9BQUssS0FBSztBQUNWLE9BQUssT0FBTyxLQUFLLHFCQUFxQjtBQUV0QyxPQUFLLGFBQWEsS0FBSyxlQUFlLElBQUk7QUFDMUMsT0FBSyxZQUFZLEtBQUssSUFBSSxRQUFRLEtBQUssSUFBSSxLQUFLLGVBQWUsSUFBSSxJQUFJO0FBQ3ZFLFNBQU8sS0FBSyxXQUFXLE1BQU0sYUFBYTtBQUM1QztBQUVBLEtBQUssdUJBQXVCLFNBQVMsTUFBTTtBQUN6QyxNQUFJLENBQUMsS0FBSyxhQUNSO0FBQUUsU0FBSyxNQUFNLEtBQUssT0FBTyw4QkFBOEI7QUFBQSxFQUFHO0FBQzVELE9BQUssS0FBSztBQU1WLE1BQUksS0FBSyxJQUFJLFFBQVEsSUFBSSxLQUFLLEtBQUssZ0JBQWdCLEdBQUc7QUFBRSxTQUFLLFdBQVc7QUFBQSxFQUFNLE9BQ3pFO0FBQUUsU0FBSyxXQUFXLEtBQUssZ0JBQWdCO0FBQUcsU0FBSyxVQUFVO0FBQUEsRUFBRztBQUNqRSxTQUFPLEtBQUssV0FBVyxNQUFNLGlCQUFpQjtBQUNoRDtBQUVBLEtBQUssdUJBQXVCLFNBQVMsTUFBTTtBQUN6QyxPQUFLLEtBQUs7QUFDVixPQUFLLGVBQWUsS0FBSyxxQkFBcUI7QUFDOUMsT0FBSyxRQUFRLENBQUM7QUFDZCxPQUFLLE9BQU8sUUFBUSxNQUFNO0FBQzFCLE9BQUssT0FBTyxLQUFLLFdBQVc7QUFDNUIsT0FBSyxXQUFXLFlBQVk7QUFNNUIsTUFBSTtBQUNKLFdBQVMsYUFBYSxPQUFPLEtBQUssU0FBUyxRQUFRLFVBQVM7QUFDMUQsUUFBSSxLQUFLLFNBQVMsUUFBUSxTQUFTLEtBQUssU0FBUyxRQUFRLFVBQVU7QUFDakUsVUFBSSxTQUFTLEtBQUssU0FBUyxRQUFRO0FBQ25DLFVBQUksS0FBSztBQUFFLGFBQUssV0FBVyxLQUFLLFlBQVk7QUFBQSxNQUFHO0FBQy9DLFdBQUssTUFBTSxLQUFLLE1BQU0sS0FBSyxVQUFVLENBQUM7QUFDdEMsVUFBSSxhQUFhLENBQUM7QUFDbEIsV0FBSyxLQUFLO0FBQ1YsVUFBSSxRQUFRO0FBQ1YsWUFBSSxPQUFPLEtBQUssZ0JBQWdCO0FBQUEsTUFDbEMsT0FBTztBQUNMLFlBQUksWUFBWTtBQUFFLGVBQUssaUJBQWlCLEtBQUssY0FBYywwQkFBMEI7QUFBQSxRQUFHO0FBQ3hGLHFCQUFhO0FBQ2IsWUFBSSxPQUFPO0FBQUEsTUFDYjtBQUNBLFdBQUssT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUMzQixPQUFPO0FBQ0wsVUFBSSxDQUFDLEtBQUs7QUFBRSxhQUFLLFdBQVc7QUFBQSxNQUFHO0FBQy9CLFVBQUksV0FBVyxLQUFLLEtBQUssZUFBZSxJQUFJLENBQUM7QUFBQSxJQUMvQztBQUFBLEVBQ0Y7QUFDQSxPQUFLLFVBQVU7QUFDZixNQUFJLEtBQUs7QUFBRSxTQUFLLFdBQVcsS0FBSyxZQUFZO0FBQUEsRUFBRztBQUMvQyxPQUFLLEtBQUs7QUFDVixPQUFLLE9BQU8sSUFBSTtBQUNoQixTQUFPLEtBQUssV0FBVyxNQUFNLGlCQUFpQjtBQUNoRDtBQUVBLEtBQUssc0JBQXNCLFNBQVMsTUFBTTtBQUN4QyxPQUFLLEtBQUs7QUFDVixNQUFJLFVBQVUsS0FBSyxLQUFLLE1BQU0sTUFBTSxLQUFLLFlBQVksS0FBSyxLQUFLLENBQUMsR0FDOUQ7QUFBRSxTQUFLLE1BQU0sS0FBSyxZQUFZLDZCQUE2QjtBQUFBLEVBQUc7QUFDaEUsT0FBSyxXQUFXLEtBQUssZ0JBQWdCO0FBQ3JDLE9BQUssVUFBVTtBQUNmLFNBQU8sS0FBSyxXQUFXLE1BQU0sZ0JBQWdCO0FBQy9DO0FBSUEsSUFBSSxVQUFVLENBQUM7QUFFZixLQUFLLHdCQUF3QixXQUFXO0FBQ3RDLE1BQUksUUFBUSxLQUFLLGlCQUFpQjtBQUNsQyxNQUFJLFNBQVMsTUFBTSxTQUFTO0FBQzVCLE9BQUssV0FBVyxTQUFTLHFCQUFxQixDQUFDO0FBQy9DLE9BQUssaUJBQWlCLE9BQU8sU0FBUyxvQkFBb0IsWUFBWTtBQUN0RSxPQUFLLE9BQU8sUUFBUSxNQUFNO0FBRTFCLFNBQU87QUFDVDtBQUVBLEtBQUssb0JBQW9CLFNBQVMsTUFBTTtBQUN0QyxPQUFLLEtBQUs7QUFDVixPQUFLLFFBQVEsS0FBSyxXQUFXO0FBQzdCLE9BQUssVUFBVTtBQUNmLE1BQUksS0FBSyxTQUFTLFFBQVEsUUFBUTtBQUNoQyxRQUFJLFNBQVMsS0FBSyxVQUFVO0FBQzVCLFNBQUssS0FBSztBQUNWLFFBQUksS0FBSyxJQUFJLFFBQVEsTUFBTSxHQUFHO0FBQzVCLGFBQU8sUUFBUSxLQUFLLHNCQUFzQjtBQUFBLElBQzVDLE9BQU87QUFDTCxVQUFJLEtBQUssUUFBUSxjQUFjLElBQUk7QUFBRSxhQUFLLFdBQVc7QUFBQSxNQUFHO0FBQ3hELGFBQU8sUUFBUTtBQUNmLFdBQUssV0FBVyxDQUFDO0FBQUEsSUFDbkI7QUFDQSxXQUFPLE9BQU8sS0FBSyxXQUFXLEtBQUs7QUFDbkMsU0FBSyxVQUFVO0FBQ2YsU0FBSyxVQUFVLEtBQUssV0FBVyxRQUFRLGFBQWE7QUFBQSxFQUN0RDtBQUNBLE9BQUssWUFBWSxLQUFLLElBQUksUUFBUSxRQUFRLElBQUksS0FBSyxXQUFXLElBQUk7QUFDbEUsTUFBSSxDQUFDLEtBQUssV0FBVyxDQUFDLEtBQUssV0FDekI7QUFBRSxTQUFLLE1BQU0sS0FBSyxPQUFPLGlDQUFpQztBQUFBLEVBQUc7QUFDL0QsU0FBTyxLQUFLLFdBQVcsTUFBTSxjQUFjO0FBQzdDO0FBRUEsS0FBSyxvQkFBb0IsU0FBUyxNQUFNLE1BQU0seUJBQXlCO0FBQ3JFLE9BQUssS0FBSztBQUNWLE9BQUssU0FBUyxNQUFNLE9BQU8sTUFBTSx1QkFBdUI7QUFDeEQsT0FBSyxVQUFVO0FBQ2YsU0FBTyxLQUFLLFdBQVcsTUFBTSxxQkFBcUI7QUFDcEQ7QUFFQSxLQUFLLHNCQUFzQixTQUFTLE1BQU07QUFDeEMsT0FBSyxLQUFLO0FBQ1YsT0FBSyxPQUFPLEtBQUsscUJBQXFCO0FBQ3RDLE9BQUssT0FBTyxLQUFLLFNBQVM7QUFDMUIsT0FBSyxPQUFPLEtBQUssZUFBZSxPQUFPO0FBQ3ZDLE9BQUssT0FBTyxJQUFJO0FBQ2hCLFNBQU8sS0FBSyxXQUFXLE1BQU0sZ0JBQWdCO0FBQy9DO0FBRUEsS0FBSyxxQkFBcUIsU0FBUyxNQUFNO0FBQ3ZDLE1BQUksS0FBSyxRQUFRO0FBQUUsU0FBSyxNQUFNLEtBQUssT0FBTyx1QkFBdUI7QUFBQSxFQUFHO0FBQ3BFLE9BQUssS0FBSztBQUNWLE9BQUssU0FBUyxLQUFLLHFCQUFxQjtBQUN4QyxPQUFLLE9BQU8sS0FBSyxlQUFlLE1BQU07QUFDdEMsU0FBTyxLQUFLLFdBQVcsTUFBTSxlQUFlO0FBQzlDO0FBRUEsS0FBSyxzQkFBc0IsU0FBUyxNQUFNO0FBQ3hDLE9BQUssS0FBSztBQUNWLFNBQU8sS0FBSyxXQUFXLE1BQU0sZ0JBQWdCO0FBQy9DO0FBRUEsS0FBSyx3QkFBd0IsU0FBUyxNQUFNLFdBQVcsTUFBTSxTQUFTO0FBQ3BFLFdBQVMsTUFBTSxHQUFHLE9BQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxRQUFRLE9BQU8sR0FDOUQ7QUFDQSxRQUFJLFFBQVEsS0FBSyxHQUFHO0FBRXBCLFFBQUksTUFBTSxTQUFTLFdBQ2pCO0FBQUUsV0FBSyxNQUFNLEtBQUssT0FBTyxZQUFZLFlBQVksdUJBQXVCO0FBQUEsSUFDNUU7QUFBQSxFQUFFO0FBQ0YsTUFBSSxPQUFPLEtBQUssS0FBSyxTQUFTLFNBQVMsS0FBSyxTQUFTLFFBQVEsVUFBVSxXQUFXO0FBQ2xGLFdBQVMsSUFBSSxLQUFLLE9BQU8sU0FBUyxHQUFHLEtBQUssR0FBRyxLQUFLO0FBQ2hELFFBQUksVUFBVSxLQUFLLE9BQU8sQ0FBQztBQUMzQixRQUFJLFFBQVEsbUJBQW1CLEtBQUssT0FBTztBQUV6QyxjQUFRLGlCQUFpQixLQUFLO0FBQzlCLGNBQVEsT0FBTztBQUFBLElBQ2pCLE9BQU87QUFBRTtBQUFBLElBQU07QUFBQSxFQUNqQjtBQUNBLE9BQUssT0FBTyxLQUFLLEVBQUMsTUFBTSxXQUFXLE1BQVksZ0JBQWdCLEtBQUssTUFBSyxDQUFDO0FBQzFFLE9BQUssT0FBTyxLQUFLLGVBQWUsVUFBVSxRQUFRLFFBQVEsT0FBTyxNQUFNLEtBQUssVUFBVSxVQUFVLFVBQVUsT0FBTztBQUNqSCxPQUFLLE9BQU8sSUFBSTtBQUNoQixPQUFLLFFBQVE7QUFDYixTQUFPLEtBQUssV0FBVyxNQUFNLGtCQUFrQjtBQUNqRDtBQUVBLEtBQUssMkJBQTJCLFNBQVMsTUFBTSxNQUFNO0FBQ25ELE9BQUssYUFBYTtBQUNsQixPQUFLLFVBQVU7QUFDZixTQUFPLEtBQUssV0FBVyxNQUFNLHFCQUFxQjtBQUNwRDtBQU1BLEtBQUssYUFBYSxTQUFTLHVCQUF1QixNQUFNLFlBQVk7QUFDbEUsTUFBSywwQkFBMEIsT0FBUyx5QkFBd0I7QUFDaEUsTUFBSyxTQUFTLE9BQVMsUUFBTyxLQUFLLFVBQVU7QUFFN0MsT0FBSyxPQUFPLENBQUM7QUFDYixPQUFLLE9BQU8sUUFBUSxNQUFNO0FBQzFCLE1BQUksdUJBQXVCO0FBQUUsU0FBSyxXQUFXLENBQUM7QUFBQSxFQUFHO0FBQ2pELFNBQU8sS0FBSyxTQUFTLFFBQVEsUUFBUTtBQUNuQyxRQUFJLE9BQU8sS0FBSyxlQUFlLElBQUk7QUFDbkMsU0FBSyxLQUFLLEtBQUssSUFBSTtBQUFBLEVBQ3JCO0FBQ0EsTUFBSSxZQUFZO0FBQUUsU0FBSyxTQUFTO0FBQUEsRUFBTztBQUN2QyxPQUFLLEtBQUs7QUFDVixNQUFJLHVCQUF1QjtBQUFFLFNBQUssVUFBVTtBQUFBLEVBQUc7QUFDL0MsU0FBTyxLQUFLLFdBQVcsTUFBTSxnQkFBZ0I7QUFDL0M7QUFNQSxLQUFLLFdBQVcsU0FBUyxNQUFNLE1BQU07QUFDbkMsT0FBSyxPQUFPO0FBQ1osT0FBSyxPQUFPLFFBQVEsSUFBSTtBQUN4QixPQUFLLE9BQU8sS0FBSyxTQUFTLFFBQVEsT0FBTyxPQUFPLEtBQUssZ0JBQWdCO0FBQ3JFLE9BQUssT0FBTyxRQUFRLElBQUk7QUFDeEIsT0FBSyxTQUFTLEtBQUssU0FBUyxRQUFRLFNBQVMsT0FBTyxLQUFLLGdCQUFnQjtBQUN6RSxPQUFLLE9BQU8sUUFBUSxNQUFNO0FBQzFCLE9BQUssT0FBTyxLQUFLLGVBQWUsS0FBSztBQUNyQyxPQUFLLFVBQVU7QUFDZixPQUFLLE9BQU8sSUFBSTtBQUNoQixTQUFPLEtBQUssV0FBVyxNQUFNLGNBQWM7QUFDN0M7QUFLQSxLQUFLLGFBQWEsU0FBUyxNQUFNLE1BQU07QUFDckMsTUFBSSxVQUFVLEtBQUssU0FBUyxRQUFRO0FBQ3BDLE9BQUssS0FBSztBQUVWLE1BQ0UsS0FBSyxTQUFTLHlCQUNkLEtBQUssYUFBYSxDQUFDLEVBQUUsUUFBUSxTQUUzQixDQUFDLFdBQ0QsS0FBSyxRQUFRLGNBQWMsS0FDM0IsS0FBSyxVQUNMLEtBQUssU0FBUyxTQUNkLEtBQUssYUFBYSxDQUFDLEVBQUUsR0FBRyxTQUFTLGVBRW5DO0FBQ0EsU0FBSztBQUFBLE1BQ0gsS0FBSztBQUFBLE9BQ0gsVUFBVSxXQUFXLFlBQVk7QUFBQSxJQUNyQztBQUFBLEVBQ0Y7QUFDQSxPQUFLLE9BQU87QUFDWixPQUFLLFFBQVEsVUFBVSxLQUFLLGdCQUFnQixJQUFJLEtBQUssaUJBQWlCO0FBQ3RFLE9BQUssT0FBTyxRQUFRLE1BQU07QUFDMUIsT0FBSyxPQUFPLEtBQUssZUFBZSxLQUFLO0FBQ3JDLE9BQUssVUFBVTtBQUNmLE9BQUssT0FBTyxJQUFJO0FBQ2hCLFNBQU8sS0FBSyxXQUFXLE1BQU0sVUFBVSxtQkFBbUIsZ0JBQWdCO0FBQzVFO0FBSUEsS0FBSyxXQUFXLFNBQVMsTUFBTSxPQUFPLE1BQU0seUJBQXlCO0FBQ25FLE9BQUssZUFBZSxDQUFDO0FBQ3JCLE9BQUssT0FBTztBQUNaLGFBQVM7QUFDUCxRQUFJLE9BQU8sS0FBSyxVQUFVO0FBQzFCLFNBQUssV0FBVyxNQUFNLElBQUk7QUFDMUIsUUFBSSxLQUFLLElBQUksUUFBUSxFQUFFLEdBQUc7QUFDeEIsV0FBSyxPQUFPLEtBQUssaUJBQWlCLEtBQUs7QUFBQSxJQUN6QyxXQUFXLENBQUMsMkJBQTJCLFNBQVMsV0FBVyxFQUFFLEtBQUssU0FBUyxRQUFRLE9BQVEsS0FBSyxRQUFRLGVBQWUsS0FBSyxLQUFLLGFBQWEsSUFBSSxJQUFLO0FBQ3JKLFdBQUssV0FBVztBQUFBLElBQ2xCLFdBQVcsQ0FBQyw0QkFBNEIsU0FBUyxXQUFXLFNBQVMsa0JBQWtCLEtBQUssUUFBUSxlQUFlLE1BQU0sS0FBSyxTQUFTLFFBQVEsT0FBTyxDQUFDLEtBQUssYUFBYSxJQUFJLEdBQUc7QUFDOUssV0FBSyxNQUFNLEtBQUssWUFBYSw0QkFBNEIsT0FBTyxjQUFlO0FBQUEsSUFDakYsV0FBVyxDQUFDLDJCQUEyQixLQUFLLEdBQUcsU0FBUyxnQkFBZ0IsRUFBRSxVQUFVLEtBQUssU0FBUyxRQUFRLE9BQU8sS0FBSyxhQUFhLElBQUksS0FBSztBQUMxSSxXQUFLLE1BQU0sS0FBSyxZQUFZLDBEQUEwRDtBQUFBLElBQ3hGLE9BQU87QUFDTCxXQUFLLE9BQU87QUFBQSxJQUNkO0FBQ0EsU0FBSyxhQUFhLEtBQUssS0FBSyxXQUFXLE1BQU0sb0JBQW9CLENBQUM7QUFDbEUsUUFBSSxDQUFDLEtBQUssSUFBSSxRQUFRLEtBQUssR0FBRztBQUFFO0FBQUEsSUFBTTtBQUFBLEVBQ3hDO0FBQ0EsU0FBTztBQUNUO0FBRUEsS0FBSyxhQUFhLFNBQVMsTUFBTSxNQUFNO0FBQ3JDLE9BQUssS0FBSyxTQUFTLFdBQVcsU0FBUyxnQkFDbkMsS0FBSyxXQUFXLElBQ2hCLEtBQUssaUJBQWlCO0FBRTFCLE9BQUssaUJBQWlCLEtBQUssSUFBSSxTQUFTLFFBQVEsV0FBVyxjQUFjLEtBQUs7QUFDaEY7QUFFQSxJQUFJLGlCQUFpQjtBQUFyQixJQUF3Qix5QkFBeUI7QUFBakQsSUFBb0QsbUJBQW1CO0FBTXZFLEtBQUssZ0JBQWdCLFNBQVMsTUFBTSxXQUFXLHFCQUFxQixTQUFTLFNBQVM7QUFDcEYsT0FBSyxhQUFhLElBQUk7QUFDdEIsTUFBSSxLQUFLLFFBQVEsZUFBZSxLQUFLLEtBQUssUUFBUSxlQUFlLEtBQUssQ0FBQyxTQUFTO0FBQzlFLFFBQUksS0FBSyxTQUFTLFFBQVEsUUFBUyxZQUFZLHdCQUM3QztBQUFFLFdBQUssV0FBVztBQUFBLElBQUc7QUFDdkIsU0FBSyxZQUFZLEtBQUssSUFBSSxRQUFRLElBQUk7QUFBQSxFQUN4QztBQUNBLE1BQUksS0FBSyxRQUFRLGVBQWUsR0FDOUI7QUFBRSxTQUFLLFFBQVEsQ0FBQyxDQUFDO0FBQUEsRUFBUztBQUU1QixNQUFJLFlBQVksZ0JBQWdCO0FBQzlCLFNBQUssS0FBTSxZQUFZLG9CQUFxQixLQUFLLFNBQVMsUUFBUSxPQUFPLE9BQU8sS0FBSyxXQUFXO0FBQ2hHLFFBQUksS0FBSyxNQUFNLEVBQUUsWUFBWSx5QkFLM0I7QUFBRSxXQUFLLGdCQUFnQixLQUFLLElBQUssS0FBSyxVQUFVLEtBQUssYUFBYSxLQUFLLFFBQVMsS0FBSyxzQkFBc0IsV0FBVyxlQUFlLGFBQWE7QUFBQSxJQUFHO0FBQUEsRUFDeko7QUFFQSxNQUFJLGNBQWMsS0FBSyxVQUFVLGNBQWMsS0FBSyxVQUFVLG1CQUFtQixLQUFLO0FBQ3RGLE9BQUssV0FBVztBQUNoQixPQUFLLFdBQVc7QUFDaEIsT0FBSyxnQkFBZ0I7QUFDckIsT0FBSyxXQUFXLGNBQWMsS0FBSyxPQUFPLEtBQUssU0FBUyxDQUFDO0FBRXpELE1BQUksRUFBRSxZQUFZLGlCQUNoQjtBQUFFLFNBQUssS0FBSyxLQUFLLFNBQVMsUUFBUSxPQUFPLEtBQUssV0FBVyxJQUFJO0FBQUEsRUFBTTtBQUVyRSxPQUFLLG9CQUFvQixJQUFJO0FBQzdCLE9BQUssa0JBQWtCLE1BQU0scUJBQXFCLE9BQU8sT0FBTztBQUVoRSxPQUFLLFdBQVc7QUFDaEIsT0FBSyxXQUFXO0FBQ2hCLE9BQUssZ0JBQWdCO0FBQ3JCLFNBQU8sS0FBSyxXQUFXLE1BQU8sWUFBWSxpQkFBa0Isd0JBQXdCLG9CQUFvQjtBQUMxRztBQUVBLEtBQUssc0JBQXNCLFNBQVMsTUFBTTtBQUN4QyxPQUFLLE9BQU8sUUFBUSxNQUFNO0FBQzFCLE9BQUssU0FBUyxLQUFLLGlCQUFpQixRQUFRLFFBQVEsT0FBTyxLQUFLLFFBQVEsZUFBZSxDQUFDO0FBQ3hGLE9BQUssK0JBQStCO0FBQ3RDO0FBS0EsS0FBSyxhQUFhLFNBQVMsTUFBTSxhQUFhO0FBQzVDLE9BQUssS0FBSztBQUlWLE1BQUksWUFBWSxLQUFLO0FBQ3JCLE9BQUssU0FBUztBQUVkLE9BQUssYUFBYSxNQUFNLFdBQVc7QUFDbkMsT0FBSyxnQkFBZ0IsSUFBSTtBQUN6QixNQUFJLGlCQUFpQixLQUFLLGVBQWU7QUFDekMsTUFBSSxZQUFZLEtBQUssVUFBVTtBQUMvQixNQUFJLGlCQUFpQjtBQUNyQixZQUFVLE9BQU8sQ0FBQztBQUNsQixPQUFLLE9BQU8sUUFBUSxNQUFNO0FBQzFCLFNBQU8sS0FBSyxTQUFTLFFBQVEsUUFBUTtBQUNuQyxRQUFJLFVBQVUsS0FBSyxrQkFBa0IsS0FBSyxlQUFlLElBQUk7QUFDN0QsUUFBSSxTQUFTO0FBQ1gsZ0JBQVUsS0FBSyxLQUFLLE9BQU87QUFDM0IsVUFBSSxRQUFRLFNBQVMsc0JBQXNCLFFBQVEsU0FBUyxlQUFlO0FBQ3pFLFlBQUksZ0JBQWdCO0FBQUUsZUFBSyxpQkFBaUIsUUFBUSxPQUFPLHlDQUF5QztBQUFBLFFBQUc7QUFDdkcseUJBQWlCO0FBQUEsTUFDbkIsV0FBVyxRQUFRLE9BQU8sUUFBUSxJQUFJLFNBQVMsdUJBQXVCLHdCQUF3QixnQkFBZ0IsT0FBTyxHQUFHO0FBQ3RILGFBQUssaUJBQWlCLFFBQVEsSUFBSSxPQUFRLGtCQUFtQixRQUFRLElBQUksT0FBUSw2QkFBOEI7QUFBQSxNQUNqSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0EsT0FBSyxTQUFTO0FBQ2QsT0FBSyxLQUFLO0FBQ1YsT0FBSyxPQUFPLEtBQUssV0FBVyxXQUFXLFdBQVc7QUFDbEQsT0FBSyxjQUFjO0FBQ25CLFNBQU8sS0FBSyxXQUFXLE1BQU0sY0FBYyxxQkFBcUIsaUJBQWlCO0FBQ25GO0FBRUEsS0FBSyxvQkFBb0IsU0FBUyx3QkFBd0I7QUFDeEQsTUFBSSxLQUFLLElBQUksUUFBUSxJQUFJLEdBQUc7QUFBRSxXQUFPO0FBQUEsRUFBSztBQUUxQyxNQUFJLGNBQWMsS0FBSyxRQUFRO0FBQy9CLE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsTUFBSSxVQUFVO0FBQ2QsTUFBSSxjQUFjO0FBQ2xCLE1BQUksVUFBVTtBQUNkLE1BQUksT0FBTztBQUNYLE1BQUksV0FBVztBQUVmLE1BQUksS0FBSyxjQUFjLFFBQVEsR0FBRztBQUVoQyxRQUFJLGVBQWUsTUFBTSxLQUFLLElBQUksUUFBUSxNQUFNLEdBQUc7QUFDakQsV0FBSyxzQkFBc0IsSUFBSTtBQUMvQixhQUFPO0FBQUEsSUFDVDtBQUNBLFFBQUksS0FBSyx3QkFBd0IsS0FBSyxLQUFLLFNBQVMsUUFBUSxNQUFNO0FBQ2hFLGlCQUFXO0FBQUEsSUFDYixPQUFPO0FBQ0wsZ0JBQVU7QUFBQSxJQUNaO0FBQUEsRUFDRjtBQUNBLE9BQUssU0FBUztBQUNkLE1BQUksQ0FBQyxXQUFXLGVBQWUsS0FBSyxLQUFLLGNBQWMsT0FBTyxHQUFHO0FBQy9ELFNBQUssS0FBSyx3QkFBd0IsS0FBSyxLQUFLLFNBQVMsUUFBUSxTQUFTLENBQUMsS0FBSyxtQkFBbUIsR0FBRztBQUNoRyxnQkFBVTtBQUFBLElBQ1osT0FBTztBQUNMLGdCQUFVO0FBQUEsSUFDWjtBQUFBLEVBQ0Y7QUFDQSxNQUFJLENBQUMsWUFBWSxlQUFlLEtBQUssQ0FBQyxZQUFZLEtBQUssSUFBSSxRQUFRLElBQUksR0FBRztBQUN4RSxrQkFBYztBQUFBLEVBQ2hCO0FBQ0EsTUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsYUFBYTtBQUN4QyxRQUFJLFlBQVksS0FBSztBQUNyQixRQUFJLEtBQUssY0FBYyxLQUFLLEtBQUssS0FBSyxjQUFjLEtBQUssR0FBRztBQUMxRCxVQUFJLEtBQUssd0JBQXdCLEdBQUc7QUFDbEMsZUFBTztBQUFBLE1BQ1QsT0FBTztBQUNMLGtCQUFVO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBR0EsTUFBSSxTQUFTO0FBR1gsU0FBSyxXQUFXO0FBQ2hCLFNBQUssTUFBTSxLQUFLLFlBQVksS0FBSyxjQUFjLEtBQUssZUFBZTtBQUNuRSxTQUFLLElBQUksT0FBTztBQUNoQixTQUFLLFdBQVcsS0FBSyxLQUFLLFlBQVk7QUFBQSxFQUN4QyxPQUFPO0FBQ0wsU0FBSyxzQkFBc0IsSUFBSTtBQUFBLEVBQ2pDO0FBR0EsTUFBSSxjQUFjLE1BQU0sS0FBSyxTQUFTLFFBQVEsVUFBVSxTQUFTLFlBQVksZUFBZSxTQUFTO0FBQ25HLFFBQUksZ0JBQWdCLENBQUMsS0FBSyxVQUFVLGFBQWEsTUFBTSxhQUFhO0FBQ3BFLFFBQUksb0JBQW9CLGlCQUFpQjtBQUV6QyxRQUFJLGlCQUFpQixTQUFTLFVBQVU7QUFBRSxXQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8seUNBQXlDO0FBQUEsSUFBRztBQUNqSCxTQUFLLE9BQU8sZ0JBQWdCLGdCQUFnQjtBQUM1QyxTQUFLLGlCQUFpQixNQUFNLGFBQWEsU0FBUyxpQkFBaUI7QUFBQSxFQUNyRSxPQUFPO0FBQ0wsU0FBSyxnQkFBZ0IsSUFBSTtBQUFBLEVBQzNCO0FBRUEsU0FBTztBQUNUO0FBRUEsS0FBSywwQkFBMEIsV0FBVztBQUN4QyxTQUNFLEtBQUssU0FBUyxRQUFRLFFBQ3RCLEtBQUssU0FBUyxRQUFRLGFBQ3RCLEtBQUssU0FBUyxRQUFRLE9BQ3RCLEtBQUssU0FBUyxRQUFRLFVBQ3RCLEtBQUssU0FBUyxRQUFRLFlBQ3RCLEtBQUssS0FBSztBQUVkO0FBRUEsS0FBSyx3QkFBd0IsU0FBUyxTQUFTO0FBQzdDLE1BQUksS0FBSyxTQUFTLFFBQVEsV0FBVztBQUNuQyxRQUFJLEtBQUssVUFBVSxlQUFlO0FBQ2hDLFdBQUssTUFBTSxLQUFLLE9BQU8sb0RBQW9EO0FBQUEsSUFDN0U7QUFDQSxZQUFRLFdBQVc7QUFDbkIsWUFBUSxNQUFNLEtBQUssa0JBQWtCO0FBQUEsRUFDdkMsT0FBTztBQUNMLFNBQUssa0JBQWtCLE9BQU87QUFBQSxFQUNoQztBQUNGO0FBRUEsS0FBSyxtQkFBbUIsU0FBUyxRQUFRLGFBQWEsU0FBUyxtQkFBbUI7QUFFaEYsTUFBSSxNQUFNLE9BQU87QUFDakIsTUFBSSxPQUFPLFNBQVMsZUFBZTtBQUNqQyxRQUFJLGFBQWE7QUFBRSxXQUFLLE1BQU0sSUFBSSxPQUFPLGtDQUFrQztBQUFBLElBQUc7QUFDOUUsUUFBSSxTQUFTO0FBQUUsV0FBSyxNQUFNLElBQUksT0FBTyxzQ0FBc0M7QUFBQSxJQUFHO0FBQUEsRUFDaEYsV0FBVyxPQUFPLFVBQVUsYUFBYSxRQUFRLFdBQVcsR0FBRztBQUM3RCxTQUFLLE1BQU0sSUFBSSxPQUFPLHdEQUF3RDtBQUFBLEVBQ2hGO0FBR0EsTUFBSSxRQUFRLE9BQU8sUUFBUSxLQUFLLFlBQVksYUFBYSxTQUFTLGlCQUFpQjtBQUduRixNQUFJLE9BQU8sU0FBUyxTQUFTLE1BQU0sT0FBTyxXQUFXLEdBQ25EO0FBQUUsU0FBSyxpQkFBaUIsTUFBTSxPQUFPLDhCQUE4QjtBQUFBLEVBQUc7QUFDeEUsTUFBSSxPQUFPLFNBQVMsU0FBUyxNQUFNLE9BQU8sV0FBVyxHQUNuRDtBQUFFLFNBQUssaUJBQWlCLE1BQU0sT0FBTyxzQ0FBc0M7QUFBQSxFQUFHO0FBQ2hGLE1BQUksT0FBTyxTQUFTLFNBQVMsTUFBTSxPQUFPLENBQUMsRUFBRSxTQUFTLGVBQ3BEO0FBQUUsU0FBSyxpQkFBaUIsTUFBTSxPQUFPLENBQUMsRUFBRSxPQUFPLCtCQUErQjtBQUFBLEVBQUc7QUFFbkYsU0FBTyxLQUFLLFdBQVcsUUFBUSxrQkFBa0I7QUFDbkQ7QUFFQSxLQUFLLGtCQUFrQixTQUFTLE9BQU87QUFDckMsTUFBSSxhQUFhLE9BQU8sYUFBYSxHQUFHO0FBQ3RDLFNBQUssTUFBTSxNQUFNLElBQUksT0FBTyxnREFBZ0Q7QUFBQSxFQUM5RSxXQUFXLE1BQU0sVUFBVSxhQUFhLE9BQU8sV0FBVyxHQUFHO0FBQzNELFNBQUssTUFBTSxNQUFNLElBQUksT0FBTyxxREFBcUQ7QUFBQSxFQUNuRjtBQUVBLE1BQUksS0FBSyxJQUFJLFFBQVEsRUFBRSxHQUFHO0FBRXhCLFNBQUssV0FBVyx5QkFBeUIsV0FBVztBQUNwRCxVQUFNLFFBQVEsS0FBSyxpQkFBaUI7QUFDcEMsU0FBSyxVQUFVO0FBQUEsRUFDakIsT0FBTztBQUNMLFVBQU0sUUFBUTtBQUFBLEVBQ2hCO0FBQ0EsT0FBSyxVQUFVO0FBRWYsU0FBTyxLQUFLLFdBQVcsT0FBTyxvQkFBb0I7QUFDcEQ7QUFFQSxLQUFLLHdCQUF3QixTQUFTLE1BQU07QUFDMUMsT0FBSyxPQUFPLENBQUM7QUFFYixNQUFJLFlBQVksS0FBSztBQUNyQixPQUFLLFNBQVMsQ0FBQztBQUNmLE9BQUssV0FBVywyQkFBMkIsV0FBVztBQUN0RCxTQUFPLEtBQUssU0FBUyxRQUFRLFFBQVE7QUFDbkMsUUFBSSxPQUFPLEtBQUssZUFBZSxJQUFJO0FBQ25DLFNBQUssS0FBSyxLQUFLLElBQUk7QUFBQSxFQUNyQjtBQUNBLE9BQUssS0FBSztBQUNWLE9BQUssVUFBVTtBQUNmLE9BQUssU0FBUztBQUVkLFNBQU8sS0FBSyxXQUFXLE1BQU0sYUFBYTtBQUM1QztBQUVBLEtBQUssZUFBZSxTQUFTLE1BQU0sYUFBYTtBQUM5QyxNQUFJLEtBQUssU0FBUyxRQUFRLE1BQU07QUFDOUIsU0FBSyxLQUFLLEtBQUssV0FBVztBQUMxQixRQUFJLGFBQ0Y7QUFBRSxXQUFLLGdCQUFnQixLQUFLLElBQUksY0FBYyxLQUFLO0FBQUEsSUFBRztBQUFBLEVBQzFELE9BQU87QUFDTCxRQUFJLGdCQUFnQixNQUNsQjtBQUFFLFdBQUssV0FBVztBQUFBLElBQUc7QUFDdkIsU0FBSyxLQUFLO0FBQUEsRUFDWjtBQUNGO0FBRUEsS0FBSyxrQkFBa0IsU0FBUyxNQUFNO0FBQ3BDLE9BQUssYUFBYSxLQUFLLElBQUksUUFBUSxRQUFRLElBQUksS0FBSyxvQkFBb0IsTUFBTSxLQUFLLElBQUk7QUFDekY7QUFFQSxLQUFLLGlCQUFpQixXQUFXO0FBQy9CLE1BQUksVUFBVSxFQUFDLFVBQVUsdUJBQU8sT0FBTyxJQUFJLEdBQUcsTUFBTSxDQUFDLEVBQUM7QUFDdEQsT0FBSyxpQkFBaUIsS0FBSyxPQUFPO0FBQ2xDLFNBQU8sUUFBUTtBQUNqQjtBQUVBLEtBQUssZ0JBQWdCLFdBQVc7QUFDOUIsTUFBSUcsT0FBTSxLQUFLLGlCQUFpQixJQUFJO0FBQ3BDLE1BQUksV0FBV0EsS0FBSTtBQUNuQixNQUFJLE9BQU9BLEtBQUk7QUFDZixNQUFJLENBQUMsS0FBSyxRQUFRLG9CQUFvQjtBQUFFO0FBQUEsRUFBTztBQUMvQyxNQUFJLE1BQU0sS0FBSyxpQkFBaUI7QUFDaEMsTUFBSSxTQUFTLFFBQVEsSUFBSSxPQUFPLEtBQUssaUJBQWlCLE1BQU0sQ0FBQztBQUM3RCxXQUFTLElBQUksR0FBRyxJQUFJLEtBQUssUUFBUSxFQUFFLEdBQUc7QUFDcEMsUUFBSSxLQUFLLEtBQUssQ0FBQztBQUNmLFFBQUksQ0FBQyxPQUFPLFVBQVUsR0FBRyxJQUFJLEdBQUc7QUFDOUIsVUFBSSxRQUFRO0FBQ1YsZUFBTyxLQUFLLEtBQUssRUFBRTtBQUFBLE1BQ3JCLE9BQU87QUFDTCxhQUFLLGlCQUFpQixHQUFHLE9BQVEscUJBQXNCLEdBQUcsT0FBUSwwQ0FBMkM7QUFBQSxNQUMvRztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLHdCQUF3QixnQkFBZ0IsU0FBUztBQUN4RCxNQUFJLE9BQU8sUUFBUSxJQUFJO0FBQ3ZCLE1BQUksT0FBTyxlQUFlLElBQUk7QUFFOUIsTUFBSSxPQUFPO0FBQ1gsTUFBSSxRQUFRLFNBQVMsdUJBQXVCLFFBQVEsU0FBUyxTQUFTLFFBQVEsU0FBUyxRQUFRO0FBQzdGLFlBQVEsUUFBUSxTQUFTLE1BQU0sT0FBTyxRQUFRO0FBQUEsRUFDaEQ7QUFHQSxNQUNFLFNBQVMsVUFBVSxTQUFTLFVBQzVCLFNBQVMsVUFBVSxTQUFTLFVBQzVCLFNBQVMsVUFBVSxTQUFTLFVBQzVCLFNBQVMsVUFBVSxTQUFTLFFBQzVCO0FBQ0EsbUJBQWUsSUFBSSxJQUFJO0FBQ3ZCLFdBQU87QUFBQSxFQUNULFdBQVcsQ0FBQyxNQUFNO0FBQ2hCLG1CQUFlLElBQUksSUFBSTtBQUN2QixXQUFPO0FBQUEsRUFDVCxPQUFPO0FBQ0wsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLFNBQVMsYUFBYSxNQUFNLE1BQU07QUFDaEMsTUFBSSxXQUFXLEtBQUs7QUFDcEIsTUFBSSxNQUFNLEtBQUs7QUFDZixTQUFPLENBQUMsYUFDTixJQUFJLFNBQVMsZ0JBQWdCLElBQUksU0FBUyxRQUMxQyxJQUFJLFNBQVMsYUFBYSxJQUFJLFVBQVU7QUFFNUM7QUFJQSxLQUFLLDRCQUE0QixTQUFTLE1BQU0sU0FBUztBQUN2RCxNQUFJLEtBQUssUUFBUSxlQUFlLElBQUk7QUFDbEMsUUFBSSxLQUFLLGNBQWMsSUFBSSxHQUFHO0FBQzVCLFdBQUssV0FBVyxLQUFLLHNCQUFzQjtBQUMzQyxXQUFLLFlBQVksU0FBUyxLQUFLLFVBQVUsS0FBSyxZQUFZO0FBQUEsSUFDNUQsT0FBTztBQUNMLFdBQUssV0FBVztBQUFBLElBQ2xCO0FBQUEsRUFDRjtBQUNBLE9BQUssaUJBQWlCLE1BQU07QUFDNUIsTUFBSSxLQUFLLFNBQVMsUUFBUSxRQUFRO0FBQUUsU0FBSyxXQUFXO0FBQUEsRUFBRztBQUN2RCxPQUFLLFNBQVMsS0FBSyxjQUFjO0FBQ2pDLE1BQUksS0FBSyxRQUFRLGVBQWUsSUFDOUI7QUFBRSxTQUFLLGFBQWEsS0FBSyxnQkFBZ0I7QUFBQSxFQUFHO0FBQzlDLE9BQUssVUFBVTtBQUNmLFNBQU8sS0FBSyxXQUFXLE1BQU0sc0JBQXNCO0FBQ3JEO0FBRUEsS0FBSyxjQUFjLFNBQVMsTUFBTSxTQUFTO0FBQ3pDLE9BQUssS0FBSztBQUVWLE1BQUksS0FBSyxJQUFJLFFBQVEsSUFBSSxHQUFHO0FBQzFCLFdBQU8sS0FBSywwQkFBMEIsTUFBTSxPQUFPO0FBQUEsRUFDckQ7QUFDQSxNQUFJLEtBQUssSUFBSSxRQUFRLFFBQVEsR0FBRztBQUM5QixTQUFLLFlBQVksU0FBUyxXQUFXLEtBQUssWUFBWTtBQUN0RCxTQUFLLGNBQWMsS0FBSyw4QkFBOEI7QUFDdEQsV0FBTyxLQUFLLFdBQVcsTUFBTSwwQkFBMEI7QUFBQSxFQUN6RDtBQUVBLE1BQUksS0FBSywyQkFBMkIsR0FBRztBQUNyQyxTQUFLLGNBQWMsS0FBSyx1QkFBdUIsSUFBSTtBQUNuRCxRQUFJLEtBQUssWUFBWSxTQUFTLHVCQUM1QjtBQUFFLFdBQUssb0JBQW9CLFNBQVMsS0FBSyxZQUFZLFlBQVk7QUFBQSxJQUFHLE9BRXBFO0FBQUUsV0FBSyxZQUFZLFNBQVMsS0FBSyxZQUFZLElBQUksS0FBSyxZQUFZLEdBQUcsS0FBSztBQUFBLElBQUc7QUFDL0UsU0FBSyxhQUFhLENBQUM7QUFDbkIsU0FBSyxTQUFTO0FBQ2QsUUFBSSxLQUFLLFFBQVEsZUFBZSxJQUM5QjtBQUFFLFdBQUssYUFBYSxDQUFDO0FBQUEsSUFBRztBQUFBLEVBQzVCLE9BQU87QUFDTCxTQUFLLGNBQWM7QUFDbkIsU0FBSyxhQUFhLEtBQUssc0JBQXNCLE9BQU87QUFDcEQsUUFBSSxLQUFLLGNBQWMsTUFBTSxHQUFHO0FBQzlCLFVBQUksS0FBSyxTQUFTLFFBQVEsUUFBUTtBQUFFLGFBQUssV0FBVztBQUFBLE1BQUc7QUFDdkQsV0FBSyxTQUFTLEtBQUssY0FBYztBQUNqQyxVQUFJLEtBQUssUUFBUSxlQUFlLElBQzlCO0FBQUUsYUFBSyxhQUFhLEtBQUssZ0JBQWdCO0FBQUEsTUFBRztBQUFBLElBQ2hELE9BQU87QUFDTCxlQUFTLElBQUksR0FBRyxPQUFPLEtBQUssWUFBWSxJQUFJLEtBQUssUUFBUSxLQUFLLEdBQUc7QUFFL0QsWUFBSSxPQUFPLEtBQUssQ0FBQztBQUVqQixhQUFLLGdCQUFnQixLQUFLLEtBQUs7QUFFL0IsYUFBSyxpQkFBaUIsS0FBSyxLQUFLO0FBRWhDLFlBQUksS0FBSyxNQUFNLFNBQVMsV0FBVztBQUNqQyxlQUFLLE1BQU0sS0FBSyxNQUFNLE9BQU8sd0VBQXdFO0FBQUEsUUFDdkc7QUFBQSxNQUNGO0FBRUEsV0FBSyxTQUFTO0FBQ2QsVUFBSSxLQUFLLFFBQVEsZUFBZSxJQUM5QjtBQUFFLGFBQUssYUFBYSxDQUFDO0FBQUEsTUFBRztBQUFBLElBQzVCO0FBQ0EsU0FBSyxVQUFVO0FBQUEsRUFDakI7QUFDQSxTQUFPLEtBQUssV0FBVyxNQUFNLHdCQUF3QjtBQUN2RDtBQUVBLEtBQUsseUJBQXlCLFNBQVMsTUFBTTtBQUMzQyxTQUFPLEtBQUssZUFBZSxJQUFJO0FBQ2pDO0FBRUEsS0FBSyxnQ0FBZ0MsV0FBVztBQUM5QyxNQUFJO0FBQ0osTUFBSSxLQUFLLFNBQVMsUUFBUSxjQUFjLFVBQVUsS0FBSyxnQkFBZ0IsSUFBSTtBQUN6RSxRQUFJLFFBQVEsS0FBSyxVQUFVO0FBQzNCLFNBQUssS0FBSztBQUNWLFFBQUksU0FBUztBQUFFLFdBQUssS0FBSztBQUFBLElBQUc7QUFDNUIsV0FBTyxLQUFLLGNBQWMsT0FBTyxpQkFBaUIsa0JBQWtCLE9BQU8sT0FBTztBQUFBLEVBQ3BGLFdBQVcsS0FBSyxTQUFTLFFBQVEsUUFBUTtBQUN2QyxRQUFJLFFBQVEsS0FBSyxVQUFVO0FBQzNCLFdBQU8sS0FBSyxXQUFXLE9BQU8sWUFBWTtBQUFBLEVBQzVDLE9BQU87QUFDTCxRQUFJLGNBQWMsS0FBSyxpQkFBaUI7QUFDeEMsU0FBSyxVQUFVO0FBQ2YsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLEtBQUssY0FBYyxTQUFTLFNBQVMsTUFBTSxLQUFLO0FBQzlDLE1BQUksQ0FBQyxTQUFTO0FBQUU7QUFBQSxFQUFPO0FBQ3ZCLE1BQUksT0FBTyxTQUFTLFVBQ2xCO0FBQUUsV0FBTyxLQUFLLFNBQVMsZUFBZSxLQUFLLE9BQU8sS0FBSztBQUFBLEVBQU87QUFDaEUsTUFBSSxPQUFPLFNBQVMsSUFBSSxHQUN0QjtBQUFFLFNBQUssaUJBQWlCLEtBQUssdUJBQXVCLE9BQU8sR0FBRztBQUFBLEVBQUc7QUFDbkUsVUFBUSxJQUFJLElBQUk7QUFDbEI7QUFFQSxLQUFLLHFCQUFxQixTQUFTLFNBQVMsS0FBSztBQUMvQyxNQUFJLE9BQU8sSUFBSTtBQUNmLE1BQUksU0FBUyxjQUNYO0FBQUUsU0FBSyxZQUFZLFNBQVMsS0FBSyxJQUFJLEtBQUs7QUFBQSxFQUFHLFdBQ3RDLFNBQVMsaUJBQ2hCO0FBQUUsYUFBUyxJQUFJLEdBQUcsT0FBTyxJQUFJLFlBQVksSUFBSSxLQUFLLFFBQVEsS0FBSyxHQUM3RDtBQUNFLFVBQUksT0FBTyxLQUFLLENBQUM7QUFFakIsV0FBSyxtQkFBbUIsU0FBUyxJQUFJO0FBQUEsSUFDdkM7QUFBQSxFQUFFLFdBQ0csU0FBUyxnQkFDaEI7QUFBRSxhQUFTLE1BQU0sR0FBRyxTQUFTLElBQUksVUFBVSxNQUFNLE9BQU8sUUFBUSxPQUFPLEdBQUc7QUFDeEUsVUFBSSxNQUFNLE9BQU8sR0FBRztBQUVsQixVQUFJLEtBQUs7QUFBRSxhQUFLLG1CQUFtQixTQUFTLEdBQUc7QUFBQSxNQUFHO0FBQUEsSUFDdEQ7QUFBQSxFQUFFLFdBQ0ssU0FBUyxZQUNoQjtBQUFFLFNBQUssbUJBQW1CLFNBQVMsSUFBSSxLQUFLO0FBQUEsRUFBRyxXQUN4QyxTQUFTLHFCQUNoQjtBQUFFLFNBQUssbUJBQW1CLFNBQVMsSUFBSSxJQUFJO0FBQUEsRUFBRyxXQUN2QyxTQUFTLGVBQ2hCO0FBQUUsU0FBSyxtQkFBbUIsU0FBUyxJQUFJLFFBQVE7QUFBQSxFQUFHO0FBQ3REO0FBRUEsS0FBSyxzQkFBc0IsU0FBUyxTQUFTLE9BQU87QUFDbEQsTUFBSSxDQUFDLFNBQVM7QUFBRTtBQUFBLEVBQU87QUFDdkIsV0FBUyxJQUFJLEdBQUcsT0FBTyxPQUFPLElBQUksS0FBSyxRQUFRLEtBQUssR0FDbEQ7QUFDQSxRQUFJLE9BQU8sS0FBSyxDQUFDO0FBRWpCLFNBQUssbUJBQW1CLFNBQVMsS0FBSyxFQUFFO0FBQUEsRUFDMUM7QUFDRjtBQUVBLEtBQUssNkJBQTZCLFdBQVc7QUFDM0MsU0FBTyxLQUFLLEtBQUssWUFBWSxTQUMzQixLQUFLLEtBQUssWUFBWSxXQUN0QixLQUFLLEtBQUssWUFBWSxXQUN0QixLQUFLLEtBQUssWUFBWSxjQUN0QixLQUFLLE1BQU0sS0FDWCxLQUFLLGdCQUFnQjtBQUN6QjtBQUlBLEtBQUssdUJBQXVCLFNBQVMsU0FBUztBQUM1QyxNQUFJLE9BQU8sS0FBSyxVQUFVO0FBQzFCLE9BQUssUUFBUSxLQUFLLHNCQUFzQjtBQUV4QyxPQUFLLFdBQVcsS0FBSyxjQUFjLElBQUksSUFBSSxLQUFLLHNCQUFzQixJQUFJLEtBQUs7QUFDL0UsT0FBSztBQUFBLElBQ0g7QUFBQSxJQUNBLEtBQUs7QUFBQSxJQUNMLEtBQUssU0FBUztBQUFBLEVBQ2hCO0FBRUEsU0FBTyxLQUFLLFdBQVcsTUFBTSxpQkFBaUI7QUFDaEQ7QUFFQSxLQUFLLHdCQUF3QixTQUFTLFNBQVM7QUFDN0MsTUFBSSxRQUFRLENBQUMsR0FBRyxRQUFRO0FBRXhCLE9BQUssT0FBTyxRQUFRLE1BQU07QUFDMUIsU0FBTyxDQUFDLEtBQUssSUFBSSxRQUFRLE1BQU0sR0FBRztBQUNoQyxRQUFJLENBQUMsT0FBTztBQUNWLFdBQUssT0FBTyxRQUFRLEtBQUs7QUFDekIsVUFBSSxLQUFLLG1CQUFtQixRQUFRLE1BQU0sR0FBRztBQUFFO0FBQUEsTUFBTTtBQUFBLElBQ3ZELE9BQU87QUFBRSxjQUFRO0FBQUEsSUFBTztBQUV4QixVQUFNLEtBQUssS0FBSyxxQkFBcUIsT0FBTyxDQUFDO0FBQUEsRUFDL0M7QUFDQSxTQUFPO0FBQ1Q7QUFJQSxLQUFLLGNBQWMsU0FBUyxNQUFNO0FBQ2hDLE9BQUssS0FBSztBQUdWLE1BQUksS0FBSyxTQUFTLFFBQVEsUUFBUTtBQUNoQyxTQUFLLGFBQWE7QUFDbEIsU0FBSyxTQUFTLEtBQUssY0FBYztBQUFBLEVBQ25DLE9BQU87QUFDTCxTQUFLLGFBQWEsS0FBSyxzQkFBc0I7QUFDN0MsU0FBSyxpQkFBaUIsTUFBTTtBQUM1QixTQUFLLFNBQVMsS0FBSyxTQUFTLFFBQVEsU0FBUyxLQUFLLGNBQWMsSUFBSSxLQUFLLFdBQVc7QUFBQSxFQUN0RjtBQUNBLE1BQUksS0FBSyxRQUFRLGVBQWUsSUFDOUI7QUFBRSxTQUFLLGFBQWEsS0FBSyxnQkFBZ0I7QUFBQSxFQUFHO0FBQzlDLE9BQUssVUFBVTtBQUNmLFNBQU8sS0FBSyxXQUFXLE1BQU0sbUJBQW1CO0FBQ2xEO0FBSUEsS0FBSyx1QkFBdUIsV0FBVztBQUNyQyxNQUFJLE9BQU8sS0FBSyxVQUFVO0FBQzFCLE9BQUssV0FBVyxLQUFLLHNCQUFzQjtBQUUzQyxNQUFJLEtBQUssY0FBYyxJQUFJLEdBQUc7QUFDNUIsU0FBSyxRQUFRLEtBQUssV0FBVztBQUFBLEVBQy9CLE9BQU87QUFDTCxTQUFLLGdCQUFnQixLQUFLLFFBQVE7QUFDbEMsU0FBSyxRQUFRLEtBQUs7QUFBQSxFQUNwQjtBQUNBLE9BQUssZ0JBQWdCLEtBQUssT0FBTyxZQUFZO0FBRTdDLFNBQU8sS0FBSyxXQUFXLE1BQU0saUJBQWlCO0FBQ2hEO0FBRUEsS0FBSyw4QkFBOEIsV0FBVztBQUU1QyxNQUFJLE9BQU8sS0FBSyxVQUFVO0FBQzFCLE9BQUssUUFBUSxLQUFLLFdBQVc7QUFDN0IsT0FBSyxnQkFBZ0IsS0FBSyxPQUFPLFlBQVk7QUFDN0MsU0FBTyxLQUFLLFdBQVcsTUFBTSx3QkFBd0I7QUFDdkQ7QUFFQSxLQUFLLGdDQUFnQyxXQUFXO0FBQzlDLE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsT0FBSyxLQUFLO0FBQ1YsT0FBSyxpQkFBaUIsSUFBSTtBQUMxQixPQUFLLFFBQVEsS0FBSyxXQUFXO0FBQzdCLE9BQUssZ0JBQWdCLEtBQUssT0FBTyxZQUFZO0FBQzdDLFNBQU8sS0FBSyxXQUFXLE1BQU0sMEJBQTBCO0FBQ3pEO0FBRUEsS0FBSyx3QkFBd0IsV0FBVztBQUN0QyxNQUFJLFFBQVEsQ0FBQyxHQUFHLFFBQVE7QUFDeEIsTUFBSSxLQUFLLFNBQVMsUUFBUSxNQUFNO0FBQzlCLFVBQU0sS0FBSyxLQUFLLDRCQUE0QixDQUFDO0FBQzdDLFFBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxLQUFLLEdBQUc7QUFBRSxhQUFPO0FBQUEsSUFBTTtBQUFBLEVBQy9DO0FBQ0EsTUFBSSxLQUFLLFNBQVMsUUFBUSxNQUFNO0FBQzlCLFVBQU0sS0FBSyxLQUFLLDhCQUE4QixDQUFDO0FBQy9DLFdBQU87QUFBQSxFQUNUO0FBQ0EsT0FBSyxPQUFPLFFBQVEsTUFBTTtBQUMxQixTQUFPLENBQUMsS0FBSyxJQUFJLFFBQVEsTUFBTSxHQUFHO0FBQ2hDLFFBQUksQ0FBQyxPQUFPO0FBQ1YsV0FBSyxPQUFPLFFBQVEsS0FBSztBQUN6QixVQUFJLEtBQUssbUJBQW1CLFFBQVEsTUFBTSxHQUFHO0FBQUU7QUFBQSxNQUFNO0FBQUEsSUFDdkQsT0FBTztBQUFFLGNBQVE7QUFBQSxJQUFPO0FBRXhCLFVBQU0sS0FBSyxLQUFLLHFCQUFxQixDQUFDO0FBQUEsRUFDeEM7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxLQUFLLGtCQUFrQixXQUFXO0FBQ2hDLE1BQUksUUFBUSxDQUFDO0FBQ2IsTUFBSSxDQUFDLEtBQUssSUFBSSxRQUFRLEtBQUssR0FBRztBQUM1QixXQUFPO0FBQUEsRUFDVDtBQUNBLE9BQUssT0FBTyxRQUFRLE1BQU07QUFDMUIsTUFBSSxnQkFBZ0IsQ0FBQztBQUNyQixNQUFJLFFBQVE7QUFDWixTQUFPLENBQUMsS0FBSyxJQUFJLFFBQVEsTUFBTSxHQUFHO0FBQ2hDLFFBQUksQ0FBQyxPQUFPO0FBQ1YsV0FBSyxPQUFPLFFBQVEsS0FBSztBQUN6QixVQUFJLEtBQUssbUJBQW1CLFFBQVEsTUFBTSxHQUFHO0FBQUU7QUFBQSxNQUFNO0FBQUEsSUFDdkQsT0FBTztBQUFFLGNBQVE7QUFBQSxJQUFPO0FBRXhCLFFBQUksT0FBTyxLQUFLLHFCQUFxQjtBQUNyQyxRQUFJLFVBQVUsS0FBSyxJQUFJLFNBQVMsZUFBZSxLQUFLLElBQUksT0FBTyxLQUFLLElBQUk7QUFDeEUsUUFBSSxPQUFPLGVBQWUsT0FBTyxHQUMvQjtBQUFFLFdBQUssaUJBQWlCLEtBQUssSUFBSSxPQUFPLDhCQUE4QixVQUFVLEdBQUc7QUFBQSxJQUFHO0FBQ3hGLGtCQUFjLE9BQU8sSUFBSTtBQUN6QixVQUFNLEtBQUssSUFBSTtBQUFBLEVBQ2pCO0FBQ0EsU0FBTztBQUNUO0FBRUEsS0FBSyx1QkFBdUIsV0FBVztBQUNyQyxNQUFJLE9BQU8sS0FBSyxVQUFVO0FBQzFCLE9BQUssTUFBTSxLQUFLLFNBQVMsUUFBUSxTQUFTLEtBQUssY0FBYyxJQUFJLEtBQUssV0FBVyxLQUFLLFFBQVEsa0JBQWtCLE9BQU87QUFDdkgsT0FBSyxPQUFPLFFBQVEsS0FBSztBQUN6QixNQUFJLEtBQUssU0FBUyxRQUFRLFFBQVE7QUFDaEMsU0FBSyxXQUFXO0FBQUEsRUFDbEI7QUFDQSxPQUFLLFFBQVEsS0FBSyxjQUFjO0FBQ2hDLFNBQU8sS0FBSyxXQUFXLE1BQU0saUJBQWlCO0FBQ2hEO0FBRUEsS0FBSyx3QkFBd0IsV0FBVztBQUN0QyxNQUFJLEtBQUssUUFBUSxlQUFlLE1BQU0sS0FBSyxTQUFTLFFBQVEsUUFBUTtBQUNsRSxRQUFJLGdCQUFnQixLQUFLLGFBQWEsS0FBSyxLQUFLO0FBQ2hELFFBQUksY0FBYyxLQUFLLGNBQWMsS0FBSyxHQUFHO0FBQzNDLFdBQUssTUFBTSxjQUFjLE9BQU8saURBQWlEO0FBQUEsSUFDbkY7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU8sS0FBSyxXQUFXLElBQUk7QUFDN0I7QUFHQSxLQUFLLHlCQUF5QixTQUFTLFlBQVk7QUFDakQsV0FBUyxJQUFJLEdBQUcsSUFBSSxXQUFXLFVBQVUsS0FBSyxxQkFBcUIsV0FBVyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUc7QUFDdEYsZUFBVyxDQUFDLEVBQUUsWUFBWSxXQUFXLENBQUMsRUFBRSxXQUFXLElBQUksTUFBTSxHQUFHLEVBQUU7QUFBQSxFQUNwRTtBQUNGO0FBQ0EsS0FBSyx1QkFBdUIsU0FBUyxXQUFXO0FBQzlDLFNBQ0UsS0FBSyxRQUFRLGVBQWUsS0FDNUIsVUFBVSxTQUFTLHlCQUNuQixVQUFVLFdBQVcsU0FBUyxhQUM5QixPQUFPLFVBQVUsV0FBVyxVQUFVO0FBQUEsR0FFckMsS0FBSyxNQUFNLFVBQVUsS0FBSyxNQUFNLE9BQVEsS0FBSyxNQUFNLFVBQVUsS0FBSyxNQUFNO0FBRTdFO0FBRUEsSUFBSSxPQUFPLE9BQU87QUFLbEIsS0FBSyxlQUFlLFNBQVMsTUFBTSxXQUFXLHdCQUF3QjtBQUNwRSxNQUFJLEtBQUssUUFBUSxlQUFlLEtBQUssTUFBTTtBQUN6QyxZQUFRLEtBQUssTUFBTTtBQUFBLE1BQ25CLEtBQUs7QUFDSCxZQUFJLEtBQUssV0FBVyxLQUFLLFNBQVMsU0FDaEM7QUFBRSxlQUFLLE1BQU0sS0FBSyxPQUFPLDJEQUEyRDtBQUFBLFFBQUc7QUFDekY7QUFBQSxNQUVGLEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFDSDtBQUFBLE1BRUYsS0FBSztBQUNILGFBQUssT0FBTztBQUNaLFlBQUksd0JBQXdCO0FBQUUsZUFBSyxtQkFBbUIsd0JBQXdCLElBQUk7QUFBQSxRQUFHO0FBQ3JGLGlCQUFTLElBQUksR0FBRyxPQUFPLEtBQUssWUFBWSxJQUFJLEtBQUssUUFBUSxLQUFLLEdBQUc7QUFDL0QsY0FBSSxPQUFPLEtBQUssQ0FBQztBQUVuQixlQUFLLGFBQWEsTUFBTSxTQUFTO0FBTS9CLGNBQ0UsS0FBSyxTQUFTLGtCQUNiLEtBQUssU0FBUyxTQUFTLGtCQUFrQixLQUFLLFNBQVMsU0FBUyxrQkFDakU7QUFDQSxpQkFBSyxNQUFNLEtBQUssU0FBUyxPQUFPLGtCQUFrQjtBQUFBLFVBQ3BEO0FBQUEsUUFDRjtBQUNBO0FBQUEsTUFFRixLQUFLO0FBRUgsWUFBSSxLQUFLLFNBQVMsUUFBUTtBQUFFLGVBQUssTUFBTSxLQUFLLElBQUksT0FBTywrQ0FBK0M7QUFBQSxRQUFHO0FBQ3pHLGFBQUssYUFBYSxLQUFLLE9BQU8sU0FBUztBQUN2QztBQUFBLE1BRUYsS0FBSztBQUNILGFBQUssT0FBTztBQUNaLFlBQUksd0JBQXdCO0FBQUUsZUFBSyxtQkFBbUIsd0JBQXdCLElBQUk7QUFBQSxRQUFHO0FBQ3JGLGFBQUssaUJBQWlCLEtBQUssVUFBVSxTQUFTO0FBQzlDO0FBQUEsTUFFRixLQUFLO0FBQ0gsYUFBSyxPQUFPO0FBQ1osYUFBSyxhQUFhLEtBQUssVUFBVSxTQUFTO0FBQzFDLFlBQUksS0FBSyxTQUFTLFNBQVMscUJBQ3pCO0FBQUUsZUFBSyxNQUFNLEtBQUssU0FBUyxPQUFPLDJDQUEyQztBQUFBLFFBQUc7QUFDbEY7QUFBQSxNQUVGLEtBQUs7QUFDSCxZQUFJLEtBQUssYUFBYSxLQUFLO0FBQUUsZUFBSyxNQUFNLEtBQUssS0FBSyxLQUFLLDZEQUE2RDtBQUFBLFFBQUc7QUFDdkgsYUFBSyxPQUFPO0FBQ1osZUFBTyxLQUFLO0FBQ1osYUFBSyxhQUFhLEtBQUssTUFBTSxTQUFTO0FBQ3RDO0FBQUEsTUFFRixLQUFLO0FBQ0gsYUFBSyxhQUFhLEtBQUssWUFBWSxXQUFXLHNCQUFzQjtBQUNwRTtBQUFBLE1BRUYsS0FBSztBQUNILGFBQUssaUJBQWlCLEtBQUssT0FBTyxtREFBbUQ7QUFDckY7QUFBQSxNQUVGLEtBQUs7QUFDSCxZQUFJLENBQUMsV0FBVztBQUFFO0FBQUEsUUFBTTtBQUFBLE1BRTFCO0FBQ0UsYUFBSyxNQUFNLEtBQUssT0FBTyxxQkFBcUI7QUFBQSxJQUM5QztBQUFBLEVBQ0YsV0FBVyx3QkFBd0I7QUFBRSxTQUFLLG1CQUFtQix3QkFBd0IsSUFBSTtBQUFBLEVBQUc7QUFDNUYsU0FBTztBQUNUO0FBSUEsS0FBSyxtQkFBbUIsU0FBUyxVQUFVLFdBQVc7QUFDcEQsTUFBSSxNQUFNLFNBQVM7QUFDbkIsV0FBUyxJQUFJLEdBQUcsSUFBSSxLQUFLLEtBQUs7QUFDNUIsUUFBSSxNQUFNLFNBQVMsQ0FBQztBQUNwQixRQUFJLEtBQUs7QUFBRSxXQUFLLGFBQWEsS0FBSyxTQUFTO0FBQUEsSUFBRztBQUFBLEVBQ2hEO0FBQ0EsTUFBSSxLQUFLO0FBQ1AsUUFBSSxPQUFPLFNBQVMsTUFBTSxDQUFDO0FBQzNCLFFBQUksS0FBSyxRQUFRLGdCQUFnQixLQUFLLGFBQWEsUUFBUSxLQUFLLFNBQVMsaUJBQWlCLEtBQUssU0FBUyxTQUFTLGNBQy9HO0FBQUUsV0FBSyxXQUFXLEtBQUssU0FBUyxLQUFLO0FBQUEsSUFBRztBQUFBLEVBQzVDO0FBQ0EsU0FBTztBQUNUO0FBSUEsS0FBSyxjQUFjLFNBQVMsd0JBQXdCO0FBQ2xELE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsT0FBSyxLQUFLO0FBQ1YsT0FBSyxXQUFXLEtBQUssaUJBQWlCLE9BQU8sc0JBQXNCO0FBQ25FLFNBQU8sS0FBSyxXQUFXLE1BQU0sZUFBZTtBQUM5QztBQUVBLEtBQUssbUJBQW1CLFdBQVc7QUFDakMsTUFBSSxPQUFPLEtBQUssVUFBVTtBQUMxQixPQUFLLEtBQUs7QUFHVixNQUFJLEtBQUssUUFBUSxnQkFBZ0IsS0FBSyxLQUFLLFNBQVMsUUFBUSxNQUMxRDtBQUFFLFNBQUssV0FBVztBQUFBLEVBQUc7QUFFdkIsT0FBSyxXQUFXLEtBQUssaUJBQWlCO0FBRXRDLFNBQU8sS0FBSyxXQUFXLE1BQU0sYUFBYTtBQUM1QztBQUlBLEtBQUssbUJBQW1CLFdBQVc7QUFDakMsTUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQ2pDLFlBQVEsS0FBSyxNQUFNO0FBQUEsTUFDbkIsS0FBSyxRQUFRO0FBQ1gsWUFBSSxPQUFPLEtBQUssVUFBVTtBQUMxQixhQUFLLEtBQUs7QUFDVixhQUFLLFdBQVcsS0FBSyxpQkFBaUIsUUFBUSxVQUFVLE1BQU0sSUFBSTtBQUNsRSxlQUFPLEtBQUssV0FBVyxNQUFNLGNBQWM7QUFBQSxNQUU3QyxLQUFLLFFBQVE7QUFDWCxlQUFPLEtBQUssU0FBUyxJQUFJO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQ0EsU0FBTyxLQUFLLFdBQVc7QUFDekI7QUFFQSxLQUFLLG1CQUFtQixTQUFTLE9BQU8sWUFBWSxvQkFBb0IsZ0JBQWdCO0FBQ3RGLE1BQUksT0FBTyxDQUFDLEdBQUcsUUFBUTtBQUN2QixTQUFPLENBQUMsS0FBSyxJQUFJLEtBQUssR0FBRztBQUN2QixRQUFJLE9BQU87QUFBRSxjQUFRO0FBQUEsSUFBTyxPQUN2QjtBQUFFLFdBQUssT0FBTyxRQUFRLEtBQUs7QUFBQSxJQUFHO0FBQ25DLFFBQUksY0FBYyxLQUFLLFNBQVMsUUFBUSxPQUFPO0FBQzdDLFdBQUssS0FBSyxJQUFJO0FBQUEsSUFDaEIsV0FBVyxzQkFBc0IsS0FBSyxtQkFBbUIsS0FBSyxHQUFHO0FBQy9EO0FBQUEsSUFDRixXQUFXLEtBQUssU0FBUyxRQUFRLFVBQVU7QUFDekMsVUFBSSxPQUFPLEtBQUssaUJBQWlCO0FBQ2pDLFdBQUsscUJBQXFCLElBQUk7QUFDOUIsV0FBSyxLQUFLLElBQUk7QUFDZCxVQUFJLEtBQUssU0FBUyxRQUFRLE9BQU87QUFBRSxhQUFLLGlCQUFpQixLQUFLLE9BQU8sK0NBQStDO0FBQUEsTUFBRztBQUN2SCxXQUFLLE9BQU8sS0FBSztBQUNqQjtBQUFBLElBQ0YsT0FBTztBQUNMLFdBQUssS0FBSyxLQUFLLHdCQUF3QixjQUFjLENBQUM7QUFBQSxJQUN4RDtBQUFBLEVBQ0Y7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxLQUFLLDBCQUEwQixTQUFTLGdCQUFnQjtBQUN0RCxNQUFJLE9BQU8sS0FBSyxrQkFBa0IsS0FBSyxPQUFPLEtBQUssUUFBUTtBQUMzRCxPQUFLLHFCQUFxQixJQUFJO0FBQzlCLFNBQU87QUFDVDtBQUVBLEtBQUssdUJBQXVCLFNBQVMsT0FBTztBQUMxQyxTQUFPO0FBQ1Q7QUFJQSxLQUFLLG9CQUFvQixTQUFTLFVBQVUsVUFBVSxNQUFNO0FBQzFELFNBQU8sUUFBUSxLQUFLLGlCQUFpQjtBQUNyQyxNQUFJLEtBQUssUUFBUSxjQUFjLEtBQUssQ0FBQyxLQUFLLElBQUksUUFBUSxFQUFFLEdBQUc7QUFBRSxXQUFPO0FBQUEsRUFBSztBQUN6RSxNQUFJLE9BQU8sS0FBSyxZQUFZLFVBQVUsUUFBUTtBQUM5QyxPQUFLLE9BQU87QUFDWixPQUFLLFFBQVEsS0FBSyxpQkFBaUI7QUFDbkMsU0FBTyxLQUFLLFdBQVcsTUFBTSxtQkFBbUI7QUFDbEQ7QUFrRUEsS0FBSyxrQkFBa0IsU0FBUyxNQUFNLGFBQWEsY0FBYztBQUMvRCxNQUFLLGdCQUFnQixPQUFTLGVBQWM7QUFFNUMsTUFBSSxTQUFTLGdCQUFnQjtBQUU3QixVQUFRLEtBQUssTUFBTTtBQUFBLElBQ25CLEtBQUs7QUFDSCxVQUFJLEtBQUssVUFBVSxLQUFLLHdCQUF3QixLQUFLLEtBQUssSUFBSSxHQUM1RDtBQUFFLGFBQUssaUJBQWlCLEtBQUssUUFBUSxTQUFTLGFBQWEsbUJBQW1CLEtBQUssT0FBTyxpQkFBaUI7QUFBQSxNQUFHO0FBQ2hILFVBQUksUUFBUTtBQUNWLFlBQUksZ0JBQWdCLGdCQUFnQixLQUFLLFNBQVMsT0FDaEQ7QUFBRSxlQUFLLGlCQUFpQixLQUFLLE9BQU8sNkNBQTZDO0FBQUEsUUFBRztBQUN0RixZQUFJLGNBQWM7QUFDaEIsY0FBSSxPQUFPLGNBQWMsS0FBSyxJQUFJLEdBQ2hDO0FBQUUsaUJBQUssaUJBQWlCLEtBQUssT0FBTyxxQkFBcUI7QUFBQSxVQUFHO0FBQzlELHVCQUFhLEtBQUssSUFBSSxJQUFJO0FBQUEsUUFDNUI7QUFDQSxZQUFJLGdCQUFnQixjQUFjO0FBQUUsZUFBSyxZQUFZLEtBQUssTUFBTSxhQUFhLEtBQUssS0FBSztBQUFBLFFBQUc7QUFBQSxNQUM1RjtBQUNBO0FBQUEsSUFFRixLQUFLO0FBQ0gsV0FBSyxpQkFBaUIsS0FBSyxPQUFPLG1EQUFtRDtBQUNyRjtBQUFBLElBRUYsS0FBSztBQUNILFVBQUksUUFBUTtBQUFFLGFBQUssaUJBQWlCLEtBQUssT0FBTywyQkFBMkI7QUFBQSxNQUFHO0FBQzlFO0FBQUEsSUFFRixLQUFLO0FBQ0gsVUFBSSxRQUFRO0FBQUUsYUFBSyxpQkFBaUIsS0FBSyxPQUFPLGtDQUFrQztBQUFBLE1BQUc7QUFDckYsYUFBTyxLQUFLLGdCQUFnQixLQUFLLFlBQVksYUFBYSxZQUFZO0FBQUEsSUFFeEU7QUFDRSxXQUFLLE1BQU0sS0FBSyxRQUFRLFNBQVMsWUFBWSxrQkFBa0IsU0FBUztBQUFBLEVBQzFFO0FBQ0Y7QUFFQSxLQUFLLG1CQUFtQixTQUFTLE1BQU0sYUFBYSxjQUFjO0FBQ2hFLE1BQUssZ0JBQWdCLE9BQVMsZUFBYztBQUU1QyxVQUFRLEtBQUssTUFBTTtBQUFBLElBQ25CLEtBQUs7QUFDSCxlQUFTLElBQUksR0FBRyxPQUFPLEtBQUssWUFBWSxJQUFJLEtBQUssUUFBUSxLQUFLLEdBQUc7QUFDL0QsWUFBSSxPQUFPLEtBQUssQ0FBQztBQUVuQixhQUFLLHNCQUFzQixNQUFNLGFBQWEsWUFBWTtBQUFBLE1BQzFEO0FBQ0E7QUFBQSxJQUVGLEtBQUs7QUFDSCxlQUFTLE1BQU0sR0FBRyxTQUFTLEtBQUssVUFBVSxNQUFNLE9BQU8sUUFBUSxPQUFPLEdBQUc7QUFDdkUsWUFBSSxPQUFPLE9BQU8sR0FBRztBQUV2QixZQUFJLE1BQU07QUFBRSxlQUFLLHNCQUFzQixNQUFNLGFBQWEsWUFBWTtBQUFBLFFBQUc7QUFBQSxNQUN6RTtBQUNBO0FBQUEsSUFFRjtBQUNFLFdBQUssZ0JBQWdCLE1BQU0sYUFBYSxZQUFZO0FBQUEsRUFDdEQ7QUFDRjtBQUVBLEtBQUssd0JBQXdCLFNBQVMsTUFBTSxhQUFhLGNBQWM7QUFDckUsTUFBSyxnQkFBZ0IsT0FBUyxlQUFjO0FBRTVDLFVBQVEsS0FBSyxNQUFNO0FBQUEsSUFDbkIsS0FBSztBQUVILFdBQUssc0JBQXNCLEtBQUssT0FBTyxhQUFhLFlBQVk7QUFDaEU7QUFBQSxJQUVGLEtBQUs7QUFDSCxXQUFLLGlCQUFpQixLQUFLLE1BQU0sYUFBYSxZQUFZO0FBQzFEO0FBQUEsSUFFRixLQUFLO0FBQ0gsV0FBSyxpQkFBaUIsS0FBSyxVQUFVLGFBQWEsWUFBWTtBQUM5RDtBQUFBLElBRUY7QUFDRSxXQUFLLGlCQUFpQixNQUFNLGFBQWEsWUFBWTtBQUFBLEVBQ3ZEO0FBQ0Y7QUFPQSxJQUFJLGFBQWEsU0FBU0csWUFBVyxPQUFPLFFBQVEsZUFBZSxVQUFVLFdBQVc7QUFDdEYsT0FBSyxRQUFRO0FBQ2IsT0FBSyxTQUFTLENBQUMsQ0FBQztBQUNoQixPQUFLLGdCQUFnQixDQUFDLENBQUM7QUFDdkIsT0FBSyxXQUFXO0FBQ2hCLE9BQUssWUFBWSxDQUFDLENBQUM7QUFDckI7QUFFQSxJQUFJLFFBQVE7QUFBQSxFQUNWLFFBQVEsSUFBSSxXQUFXLEtBQUssS0FBSztBQUFBLEVBQ2pDLFFBQVEsSUFBSSxXQUFXLEtBQUssSUFBSTtBQUFBLEVBQ2hDLFFBQVEsSUFBSSxXQUFXLE1BQU0sS0FBSztBQUFBLEVBQ2xDLFFBQVEsSUFBSSxXQUFXLEtBQUssS0FBSztBQUFBLEVBQ2pDLFFBQVEsSUFBSSxXQUFXLEtBQUssSUFBSTtBQUFBLEVBQ2hDLFFBQVEsSUFBSSxXQUFXLEtBQUssTUFBTSxNQUFNLFNBQVUsR0FBRztBQUFFLFdBQU8sRUFBRSxxQkFBcUI7QUFBQSxFQUFHLENBQUM7QUFBQSxFQUN6RixRQUFRLElBQUksV0FBVyxZQUFZLEtBQUs7QUFBQSxFQUN4QyxRQUFRLElBQUksV0FBVyxZQUFZLElBQUk7QUFBQSxFQUN2QyxZQUFZLElBQUksV0FBVyxZQUFZLE1BQU0sT0FBTyxNQUFNLElBQUk7QUFBQSxFQUM5RCxPQUFPLElBQUksV0FBVyxZQUFZLE9BQU8sT0FBTyxNQUFNLElBQUk7QUFDNUQ7QUFFQSxJQUFJLE9BQU8sT0FBTztBQUVsQixLQUFLLGlCQUFpQixXQUFXO0FBQy9CLFNBQU8sQ0FBQyxNQUFNLE1BQU07QUFDdEI7QUFFQSxLQUFLLGFBQWEsV0FBVztBQUMzQixTQUFPLEtBQUssUUFBUSxLQUFLLFFBQVEsU0FBUyxDQUFDO0FBQzdDO0FBRUEsS0FBSyxlQUFlLFNBQVMsVUFBVTtBQUNyQyxNQUFJLFNBQVMsS0FBSyxXQUFXO0FBQzdCLE1BQUksV0FBVyxNQUFNLFVBQVUsV0FBVyxNQUFNLFFBQzlDO0FBQUUsV0FBTztBQUFBLEVBQUs7QUFDaEIsTUFBSSxhQUFhLFFBQVEsVUFBVSxXQUFXLE1BQU0sVUFBVSxXQUFXLE1BQU0sU0FDN0U7QUFBRSxXQUFPLENBQUMsT0FBTztBQUFBLEVBQU87QUFLMUIsTUFBSSxhQUFhLFFBQVEsV0FBVyxhQUFhLFFBQVEsUUFBUSxLQUFLLGFBQ3BFO0FBQUUsV0FBTyxVQUFVLEtBQUssS0FBSyxNQUFNLE1BQU0sS0FBSyxZQUFZLEtBQUssS0FBSyxDQUFDO0FBQUEsRUFBRTtBQUN6RSxNQUFJLGFBQWEsUUFBUSxTQUFTLGFBQWEsUUFBUSxRQUFRLGFBQWEsUUFBUSxPQUFPLGFBQWEsUUFBUSxVQUFVLGFBQWEsUUFBUSxPQUM3STtBQUFFLFdBQU87QUFBQSxFQUFLO0FBQ2hCLE1BQUksYUFBYSxRQUFRLFFBQ3ZCO0FBQUUsV0FBTyxXQUFXLE1BQU07QUFBQSxFQUFPO0FBQ25DLE1BQUksYUFBYSxRQUFRLFFBQVEsYUFBYSxRQUFRLFVBQVUsYUFBYSxRQUFRLE1BQ25GO0FBQUUsV0FBTztBQUFBLEVBQU07QUFDakIsU0FBTyxDQUFDLEtBQUs7QUFDZjtBQUVBLEtBQUsscUJBQXFCLFdBQVc7QUFDbkMsV0FBUyxJQUFJLEtBQUssUUFBUSxTQUFTLEdBQUcsS0FBSyxHQUFHLEtBQUs7QUFDakQsUUFBSSxVQUFVLEtBQUssUUFBUSxDQUFDO0FBQzVCLFFBQUksUUFBUSxVQUFVLFlBQ3BCO0FBQUUsYUFBTyxRQUFRO0FBQUEsSUFBVTtBQUFBLEVBQy9CO0FBQ0EsU0FBTztBQUNUO0FBRUEsS0FBSyxnQkFBZ0IsU0FBUyxVQUFVO0FBQ3RDLE1BQUksUUFBUSxPQUFPLEtBQUs7QUFDeEIsTUFBSSxLQUFLLFdBQVcsYUFBYSxRQUFRLEtBQ3ZDO0FBQUUsU0FBSyxjQUFjO0FBQUEsRUFBTyxXQUNyQixTQUFTLEtBQUssZUFDckI7QUFBRSxXQUFPLEtBQUssTUFBTSxRQUFRO0FBQUEsRUFBRyxPQUUvQjtBQUFFLFNBQUssY0FBYyxLQUFLO0FBQUEsRUFBWTtBQUMxQztBQUlBLEtBQUssa0JBQWtCLFNBQVMsVUFBVTtBQUN4QyxNQUFJLEtBQUssV0FBVyxNQUFNLFVBQVU7QUFDbEMsU0FBSyxRQUFRLEtBQUssUUFBUSxTQUFTLENBQUMsSUFBSTtBQUFBLEVBQzFDO0FBQ0Y7QUFJQSxRQUFRLE9BQU8sZ0JBQWdCLFFBQVEsT0FBTyxnQkFBZ0IsV0FBVztBQUN2RSxNQUFJLEtBQUssUUFBUSxXQUFXLEdBQUc7QUFDN0IsU0FBSyxjQUFjO0FBQ25CO0FBQUEsRUFDRjtBQUNBLE1BQUksTUFBTSxLQUFLLFFBQVEsSUFBSTtBQUMzQixNQUFJLFFBQVEsTUFBTSxVQUFVLEtBQUssV0FBVyxFQUFFLFVBQVUsWUFBWTtBQUNsRSxVQUFNLEtBQUssUUFBUSxJQUFJO0FBQUEsRUFDekI7QUFDQSxPQUFLLGNBQWMsQ0FBQyxJQUFJO0FBQzFCO0FBRUEsUUFBUSxPQUFPLGdCQUFnQixTQUFTLFVBQVU7QUFDaEQsT0FBSyxRQUFRLEtBQUssS0FBSyxhQUFhLFFBQVEsSUFBSSxNQUFNLFNBQVMsTUFBTSxNQUFNO0FBQzNFLE9BQUssY0FBYztBQUNyQjtBQUVBLFFBQVEsYUFBYSxnQkFBZ0IsV0FBVztBQUM5QyxPQUFLLFFBQVEsS0FBSyxNQUFNLE1BQU07QUFDOUIsT0FBSyxjQUFjO0FBQ3JCO0FBRUEsUUFBUSxPQUFPLGdCQUFnQixTQUFTLFVBQVU7QUFDaEQsTUFBSSxrQkFBa0IsYUFBYSxRQUFRLE9BQU8sYUFBYSxRQUFRLFFBQVEsYUFBYSxRQUFRLFNBQVMsYUFBYSxRQUFRO0FBQ2xJLE9BQUssUUFBUSxLQUFLLGtCQUFrQixNQUFNLFNBQVMsTUFBTSxNQUFNO0FBQy9ELE9BQUssY0FBYztBQUNyQjtBQUVBLFFBQVEsT0FBTyxnQkFBZ0IsV0FBVztBQUUxQztBQUVBLFFBQVEsVUFBVSxnQkFBZ0IsUUFBUSxPQUFPLGdCQUFnQixTQUFTLFVBQVU7QUFDbEYsTUFBSSxTQUFTLGNBQWMsYUFBYSxRQUFRLFNBQzVDLEVBQUUsYUFBYSxRQUFRLFFBQVEsS0FBSyxXQUFXLE1BQU0sTUFBTSxXQUMzRCxFQUFFLGFBQWEsUUFBUSxXQUFXLFVBQVUsS0FBSyxLQUFLLE1BQU0sTUFBTSxLQUFLLFlBQVksS0FBSyxLQUFLLENBQUMsTUFDOUYsR0FBRyxhQUFhLFFBQVEsU0FBUyxhQUFhLFFBQVEsV0FBVyxLQUFLLFdBQVcsTUFBTSxNQUFNLFNBQy9GO0FBQUUsU0FBSyxRQUFRLEtBQUssTUFBTSxNQUFNO0FBQUEsRUFBRyxPQUVuQztBQUFFLFNBQUssUUFBUSxLQUFLLE1BQU0sTUFBTTtBQUFBLEVBQUc7QUFDckMsT0FBSyxjQUFjO0FBQ3JCO0FBRUEsUUFBUSxNQUFNLGdCQUFnQixXQUFXO0FBQ3ZDLE1BQUksS0FBSyxXQUFXLEVBQUUsVUFBVSxZQUFZO0FBQUUsU0FBSyxRQUFRLElBQUk7QUFBQSxFQUFHO0FBQ2xFLE9BQUssY0FBYztBQUNyQjtBQUVBLFFBQVEsVUFBVSxnQkFBZ0IsV0FBVztBQUMzQyxNQUFJLEtBQUssV0FBVyxNQUFNLE1BQU0sUUFDOUI7QUFBRSxTQUFLLFFBQVEsSUFBSTtBQUFBLEVBQUcsT0FFdEI7QUFBRSxTQUFLLFFBQVEsS0FBSyxNQUFNLE1BQU07QUFBQSxFQUFHO0FBQ3JDLE9BQUssY0FBYztBQUNyQjtBQUVBLFFBQVEsS0FBSyxnQkFBZ0IsU0FBUyxVQUFVO0FBQzlDLE1BQUksYUFBYSxRQUFRLFdBQVc7QUFDbEMsUUFBSSxRQUFRLEtBQUssUUFBUSxTQUFTO0FBQ2xDLFFBQUksS0FBSyxRQUFRLEtBQUssTUFBTSxNQUFNLFFBQ2hDO0FBQUUsV0FBSyxRQUFRLEtBQUssSUFBSSxNQUFNO0FBQUEsSUFBWSxPQUUxQztBQUFFLFdBQUssUUFBUSxLQUFLLElBQUksTUFBTTtBQUFBLElBQU87QUFBQSxFQUN6QztBQUNBLE9BQUssY0FBYztBQUNyQjtBQUVBLFFBQVEsS0FBSyxnQkFBZ0IsU0FBUyxVQUFVO0FBQzlDLE1BQUksVUFBVTtBQUNkLE1BQUksS0FBSyxRQUFRLGVBQWUsS0FBSyxhQUFhLFFBQVEsS0FBSztBQUM3RCxRQUFJLEtBQUssVUFBVSxRQUFRLENBQUMsS0FBSyxlQUM3QixLQUFLLFVBQVUsV0FBVyxLQUFLLG1CQUFtQixHQUNwRDtBQUFFLGdCQUFVO0FBQUEsSUFBTTtBQUFBLEVBQ3RCO0FBQ0EsT0FBSyxjQUFjO0FBQ3JCO0FBcUJBLElBQUksT0FBTyxPQUFPO0FBT2xCLEtBQUssaUJBQWlCLFNBQVMsTUFBTSxVQUFVLHdCQUF3QjtBQUNyRSxNQUFJLEtBQUssUUFBUSxlQUFlLEtBQUssS0FBSyxTQUFTLGlCQUNqRDtBQUFFO0FBQUEsRUFBTztBQUNYLE1BQUksS0FBSyxRQUFRLGVBQWUsTUFBTSxLQUFLLFlBQVksS0FBSyxVQUFVLEtBQUssWUFDekU7QUFBRTtBQUFBLEVBQU87QUFDWCxNQUFJLE1BQU0sS0FBSztBQUNmLE1BQUk7QUFDSixVQUFRLElBQUksTUFBTTtBQUFBLElBQ2xCLEtBQUs7QUFBYyxhQUFPLElBQUk7QUFBTTtBQUFBLElBQ3BDLEtBQUs7QUFBVyxhQUFPLE9BQU8sSUFBSSxLQUFLO0FBQUc7QUFBQSxJQUMxQztBQUFTO0FBQUEsRUFDVDtBQUNBLE1BQUksT0FBTyxLQUFLO0FBQ2hCLE1BQUksS0FBSyxRQUFRLGVBQWUsR0FBRztBQUNqQyxRQUFJLFNBQVMsZUFBZSxTQUFTLFFBQVE7QUFDM0MsVUFBSSxTQUFTLE9BQU87QUFDbEIsWUFBSSx3QkFBd0I7QUFDMUIsY0FBSSx1QkFBdUIsY0FBYyxHQUFHO0FBQzFDLG1DQUF1QixjQUFjLElBQUk7QUFBQSxVQUMzQztBQUFBLFFBQ0YsT0FBTztBQUNMLGVBQUssaUJBQWlCLElBQUksT0FBTyxvQ0FBb0M7QUFBQSxRQUN2RTtBQUFBLE1BQ0Y7QUFDQSxlQUFTLFFBQVE7QUFBQSxJQUNuQjtBQUNBO0FBQUEsRUFDRjtBQUNBLFNBQU8sTUFBTTtBQUNiLE1BQUksUUFBUSxTQUFTLElBQUk7QUFDekIsTUFBSSxPQUFPO0FBQ1QsUUFBSTtBQUNKLFFBQUksU0FBUyxRQUFRO0FBQ25CLHFCQUFlLEtBQUssVUFBVSxNQUFNLFFBQVEsTUFBTSxPQUFPLE1BQU07QUFBQSxJQUNqRSxPQUFPO0FBQ0wscUJBQWUsTUFBTSxRQUFRLE1BQU0sSUFBSTtBQUFBLElBQ3pDO0FBQ0EsUUFBSSxjQUNGO0FBQUUsV0FBSyxpQkFBaUIsSUFBSSxPQUFPLDBCQUEwQjtBQUFBLElBQUc7QUFBQSxFQUNwRSxPQUFPO0FBQ0wsWUFBUSxTQUFTLElBQUksSUFBSTtBQUFBLE1BQ3ZCLE1BQU07QUFBQSxNQUNOLEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFBQSxJQUNQO0FBQUEsRUFDRjtBQUNBLFFBQU0sSUFBSSxJQUFJO0FBQ2hCO0FBaUJBLEtBQUssa0JBQWtCLFNBQVMsU0FBUyx3QkFBd0I7QUFDL0QsTUFBSSxXQUFXLEtBQUssT0FBTyxXQUFXLEtBQUs7QUFDM0MsTUFBSSxPQUFPLEtBQUssaUJBQWlCLFNBQVMsc0JBQXNCO0FBQ2hFLE1BQUksS0FBSyxTQUFTLFFBQVEsT0FBTztBQUMvQixRQUFJLE9BQU8sS0FBSyxZQUFZLFVBQVUsUUFBUTtBQUM5QyxTQUFLLGNBQWMsQ0FBQyxJQUFJO0FBQ3hCLFdBQU8sS0FBSyxJQUFJLFFBQVEsS0FBSyxHQUFHO0FBQUUsV0FBSyxZQUFZLEtBQUssS0FBSyxpQkFBaUIsU0FBUyxzQkFBc0IsQ0FBQztBQUFBLElBQUc7QUFDakgsV0FBTyxLQUFLLFdBQVcsTUFBTSxvQkFBb0I7QUFBQSxFQUNuRDtBQUNBLFNBQU87QUFDVDtBQUtBLEtBQUssbUJBQW1CLFNBQVMsU0FBUyx3QkFBd0IsZ0JBQWdCO0FBQ2hGLE1BQUksS0FBSyxhQUFhLE9BQU8sR0FBRztBQUM5QixRQUFJLEtBQUssYUFBYTtBQUFFLGFBQU8sS0FBSyxXQUFXLE9BQU87QUFBQSxJQUFFLE9BR25EO0FBQUUsV0FBSyxjQUFjO0FBQUEsSUFBTztBQUFBLEVBQ25DO0FBRUEsTUFBSSx5QkFBeUIsT0FBTyxpQkFBaUIsSUFBSSxtQkFBbUIsSUFBSSxpQkFBaUI7QUFDakcsTUFBSSx3QkFBd0I7QUFDMUIscUJBQWlCLHVCQUF1QjtBQUN4Qyx1QkFBbUIsdUJBQXVCO0FBQzFDLHFCQUFpQix1QkFBdUI7QUFDeEMsMkJBQXVCLHNCQUFzQix1QkFBdUIsZ0JBQWdCO0FBQUEsRUFDdEYsT0FBTztBQUNMLDZCQUF5QixJQUFJO0FBQzdCLDZCQUF5QjtBQUFBLEVBQzNCO0FBRUEsTUFBSSxXQUFXLEtBQUssT0FBTyxXQUFXLEtBQUs7QUFDM0MsTUFBSSxLQUFLLFNBQVMsUUFBUSxVQUFVLEtBQUssU0FBUyxRQUFRLE1BQU07QUFDOUQsU0FBSyxtQkFBbUIsS0FBSztBQUM3QixTQUFLLDJCQUEyQixZQUFZO0FBQUEsRUFDOUM7QUFDQSxNQUFJLE9BQU8sS0FBSyxzQkFBc0IsU0FBUyxzQkFBc0I7QUFDckUsTUFBSSxnQkFBZ0I7QUFBRSxXQUFPLGVBQWUsS0FBSyxNQUFNLE1BQU0sVUFBVSxRQUFRO0FBQUEsRUFBRztBQUNsRixNQUFJLEtBQUssS0FBSyxVQUFVO0FBQ3RCLFFBQUksT0FBTyxLQUFLLFlBQVksVUFBVSxRQUFRO0FBQzlDLFNBQUssV0FBVyxLQUFLO0FBQ3JCLFFBQUksS0FBSyxTQUFTLFFBQVEsSUFDeEI7QUFBRSxhQUFPLEtBQUssYUFBYSxNQUFNLE9BQU8sc0JBQXNCO0FBQUEsSUFBRztBQUNuRSxRQUFJLENBQUMsd0JBQXdCO0FBQzNCLDZCQUF1QixzQkFBc0IsdUJBQXVCLGdCQUFnQix1QkFBdUIsY0FBYztBQUFBLElBQzNIO0FBQ0EsUUFBSSx1QkFBdUIsbUJBQW1CLEtBQUssT0FDakQ7QUFBRSw2QkFBdUIsa0JBQWtCO0FBQUEsSUFBSTtBQUNqRCxRQUFJLEtBQUssU0FBUyxRQUFRLElBQ3hCO0FBQUUsV0FBSyxpQkFBaUIsSUFBSTtBQUFBLElBQUcsT0FFL0I7QUFBRSxXQUFLLGdCQUFnQixJQUFJO0FBQUEsSUFBRztBQUNoQyxTQUFLLE9BQU87QUFDWixTQUFLLEtBQUs7QUFDVixTQUFLLFFBQVEsS0FBSyxpQkFBaUIsT0FBTztBQUMxQyxRQUFJLGlCQUFpQixJQUFJO0FBQUUsNkJBQXVCLGNBQWM7QUFBQSxJQUFnQjtBQUNoRixXQUFPLEtBQUssV0FBVyxNQUFNLHNCQUFzQjtBQUFBLEVBQ3JELE9BQU87QUFDTCxRQUFJLHdCQUF3QjtBQUFFLFdBQUssc0JBQXNCLHdCQUF3QixJQUFJO0FBQUEsSUFBRztBQUFBLEVBQzFGO0FBQ0EsTUFBSSxpQkFBaUIsSUFBSTtBQUFFLDJCQUF1QixzQkFBc0I7QUFBQSxFQUFnQjtBQUN4RixNQUFJLG1CQUFtQixJQUFJO0FBQUUsMkJBQXVCLGdCQUFnQjtBQUFBLEVBQWtCO0FBQ3RGLFNBQU87QUFDVDtBQUlBLEtBQUssd0JBQXdCLFNBQVMsU0FBUyx3QkFBd0I7QUFDckUsTUFBSSxXQUFXLEtBQUssT0FBTyxXQUFXLEtBQUs7QUFDM0MsTUFBSSxPQUFPLEtBQUssYUFBYSxTQUFTLHNCQUFzQjtBQUM1RCxNQUFJLEtBQUssc0JBQXNCLHNCQUFzQixHQUFHO0FBQUUsV0FBTztBQUFBLEVBQUs7QUFDdEUsTUFBSSxLQUFLLElBQUksUUFBUSxRQUFRLEdBQUc7QUFDOUIsUUFBSSxPQUFPLEtBQUssWUFBWSxVQUFVLFFBQVE7QUFDOUMsU0FBSyxPQUFPO0FBQ1osU0FBSyxhQUFhLEtBQUssaUJBQWlCO0FBQ3hDLFNBQUssT0FBTyxRQUFRLEtBQUs7QUFDekIsU0FBSyxZQUFZLEtBQUssaUJBQWlCLE9BQU87QUFDOUMsV0FBTyxLQUFLLFdBQVcsTUFBTSx1QkFBdUI7QUFBQSxFQUN0RDtBQUNBLFNBQU87QUFDVDtBQUlBLEtBQUssZUFBZSxTQUFTLFNBQVMsd0JBQXdCO0FBQzVELE1BQUksV0FBVyxLQUFLLE9BQU8sV0FBVyxLQUFLO0FBQzNDLE1BQUksT0FBTyxLQUFLLGdCQUFnQix3QkFBd0IsT0FBTyxPQUFPLE9BQU87QUFDN0UsTUFBSSxLQUFLLHNCQUFzQixzQkFBc0IsR0FBRztBQUFFLFdBQU87QUFBQSxFQUFLO0FBQ3RFLFNBQU8sS0FBSyxVQUFVLFlBQVksS0FBSyxTQUFTLDRCQUE0QixPQUFPLEtBQUssWUFBWSxNQUFNLFVBQVUsVUFBVSxJQUFJLE9BQU87QUFDM0k7QUFRQSxLQUFLLGNBQWMsU0FBUyxNQUFNLGNBQWMsY0FBYyxTQUFTLFNBQVM7QUFDOUUsTUFBSSxPQUFPLEtBQUssS0FBSztBQUNyQixNQUFJLFFBQVEsU0FBUyxDQUFDLFdBQVcsS0FBSyxTQUFTLFFBQVEsTUFBTTtBQUMzRCxRQUFJLE9BQU8sU0FBUztBQUNsQixVQUFJLFVBQVUsS0FBSyxTQUFTLFFBQVEsYUFBYSxLQUFLLFNBQVMsUUFBUTtBQUN2RSxVQUFJLFdBQVcsS0FBSyxTQUFTLFFBQVE7QUFDckMsVUFBSSxVQUFVO0FBR1osZUFBTyxRQUFRLFdBQVc7QUFBQSxNQUM1QjtBQUNBLFVBQUksS0FBSyxLQUFLO0FBQ2QsV0FBSyxLQUFLO0FBQ1YsVUFBSSxXQUFXLEtBQUssT0FBTyxXQUFXLEtBQUs7QUFDM0MsVUFBSSxRQUFRLEtBQUssWUFBWSxLQUFLLGdCQUFnQixNQUFNLE9BQU8sT0FBTyxPQUFPLEdBQUcsVUFBVSxVQUFVLE1BQU0sT0FBTztBQUNqSCxVQUFJLE9BQU8sS0FBSyxZQUFZLGNBQWMsY0FBYyxNQUFNLE9BQU8sSUFBSSxXQUFXLFFBQVE7QUFDNUYsVUFBSyxXQUFXLEtBQUssU0FBUyxRQUFRLFlBQWMsYUFBYSxLQUFLLFNBQVMsUUFBUSxhQUFhLEtBQUssU0FBUyxRQUFRLGFBQWM7QUFDdEksYUFBSyxpQkFBaUIsS0FBSyxPQUFPLDBGQUEwRjtBQUFBLE1BQzlIO0FBQ0EsYUFBTyxLQUFLLFlBQVksTUFBTSxjQUFjLGNBQWMsU0FBUyxPQUFPO0FBQUEsSUFDNUU7QUFBQSxFQUNGO0FBQ0EsU0FBTztBQUNUO0FBRUEsS0FBSyxjQUFjLFNBQVMsVUFBVSxVQUFVLE1BQU0sT0FBTyxJQUFJLFNBQVM7QUFDeEUsTUFBSSxNQUFNLFNBQVMscUJBQXFCO0FBQUUsU0FBSyxNQUFNLE1BQU0sT0FBTywrREFBK0Q7QUFBQSxFQUFHO0FBQ3BJLE1BQUksT0FBTyxLQUFLLFlBQVksVUFBVSxRQUFRO0FBQzlDLE9BQUssT0FBTztBQUNaLE9BQUssV0FBVztBQUNoQixPQUFLLFFBQVE7QUFDYixTQUFPLEtBQUssV0FBVyxNQUFNLFVBQVUsc0JBQXNCLGtCQUFrQjtBQUNqRjtBQUlBLEtBQUssa0JBQWtCLFNBQVMsd0JBQXdCLFVBQVUsUUFBUSxTQUFTO0FBQ2pGLE1BQUksV0FBVyxLQUFLLE9BQU8sV0FBVyxLQUFLLFVBQVU7QUFDckQsTUFBSSxLQUFLLGFBQWEsT0FBTyxLQUFLLEtBQUssVUFBVTtBQUMvQyxXQUFPLEtBQUssV0FBVyxPQUFPO0FBQzlCLGVBQVc7QUFBQSxFQUNiLFdBQVcsS0FBSyxLQUFLLFFBQVE7QUFDM0IsUUFBSSxPQUFPLEtBQUssVUFBVSxHQUFHLFNBQVMsS0FBSyxTQUFTLFFBQVE7QUFDNUQsU0FBSyxXQUFXLEtBQUs7QUFDckIsU0FBSyxTQUFTO0FBQ2QsU0FBSyxLQUFLO0FBQ1YsU0FBSyxXQUFXLEtBQUssZ0JBQWdCLE1BQU0sTUFBTSxRQUFRLE9BQU87QUFDaEUsU0FBSyxzQkFBc0Isd0JBQXdCLElBQUk7QUFDdkQsUUFBSSxRQUFRO0FBQUUsV0FBSyxnQkFBZ0IsS0FBSyxRQUFRO0FBQUEsSUFBRyxXQUMxQyxLQUFLLFVBQVUsS0FBSyxhQUFhLFlBQVksc0JBQXNCLEtBQUssUUFBUSxHQUN2RjtBQUFFLFdBQUssaUJBQWlCLEtBQUssT0FBTyx3Q0FBd0M7QUFBQSxJQUFHLFdBQ3hFLEtBQUssYUFBYSxZQUFZLHFCQUFxQixLQUFLLFFBQVEsR0FDdkU7QUFBRSxXQUFLLGlCQUFpQixLQUFLLE9BQU8sbUNBQW1DO0FBQUEsSUFBRyxPQUN2RTtBQUFFLGlCQUFXO0FBQUEsSUFBTTtBQUN4QixXQUFPLEtBQUssV0FBVyxNQUFNLFNBQVMscUJBQXFCLGlCQUFpQjtBQUFBLEVBQzlFLFdBQVcsQ0FBQyxZQUFZLEtBQUssU0FBUyxRQUFRLFdBQVc7QUFDdkQsU0FBSyxXQUFXLEtBQUssaUJBQWlCLFdBQVcsTUFBTSxLQUFLLFFBQVEsb0JBQW9CO0FBQUUsV0FBSyxXQUFXO0FBQUEsSUFBRztBQUM3RyxXQUFPLEtBQUssa0JBQWtCO0FBRTlCLFFBQUksS0FBSyxTQUFTLFFBQVEsS0FBSztBQUFFLFdBQUssV0FBVztBQUFBLElBQUc7QUFBQSxFQUN0RCxPQUFPO0FBQ0wsV0FBTyxLQUFLLG9CQUFvQix3QkFBd0IsT0FBTztBQUMvRCxRQUFJLEtBQUssc0JBQXNCLHNCQUFzQixHQUFHO0FBQUUsYUFBTztBQUFBLElBQUs7QUFDdEUsV0FBTyxLQUFLLEtBQUssV0FBVyxDQUFDLEtBQUssbUJBQW1CLEdBQUc7QUFDdEQsVUFBSSxTQUFTLEtBQUssWUFBWSxVQUFVLFFBQVE7QUFDaEQsYUFBTyxXQUFXLEtBQUs7QUFDdkIsYUFBTyxTQUFTO0FBQ2hCLGFBQU8sV0FBVztBQUNsQixXQUFLLGdCQUFnQixJQUFJO0FBQ3pCLFdBQUssS0FBSztBQUNWLGFBQU8sS0FBSyxXQUFXLFFBQVEsa0JBQWtCO0FBQUEsSUFDbkQ7QUFBQSxFQUNGO0FBRUEsTUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLFFBQVEsUUFBUSxHQUFHO0FBQ3pDLFFBQUksVUFDRjtBQUFFLFdBQUssV0FBVyxLQUFLLFlBQVk7QUFBQSxJQUFHLE9BRXRDO0FBQUUsYUFBTyxLQUFLLFlBQVksVUFBVSxVQUFVLE1BQU0sS0FBSyxnQkFBZ0IsTUFBTSxPQUFPLE9BQU8sT0FBTyxHQUFHLE1BQU0sS0FBSztBQUFBLElBQUU7QUFBQSxFQUN4SCxPQUFPO0FBQ0wsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLFNBQVMsc0JBQXNCLE1BQU07QUFDbkMsU0FDRSxLQUFLLFNBQVMsZ0JBQ2QsS0FBSyxTQUFTLDZCQUE2QixzQkFBc0IsS0FBSyxVQUFVO0FBRXBGO0FBRUEsU0FBUyxxQkFBcUIsTUFBTTtBQUNsQyxTQUNFLEtBQUssU0FBUyxzQkFBc0IsS0FBSyxTQUFTLFNBQVMsdUJBQzNELEtBQUssU0FBUyxxQkFBcUIscUJBQXFCLEtBQUssVUFBVSxLQUN2RSxLQUFLLFNBQVMsNkJBQTZCLHFCQUFxQixLQUFLLFVBQVU7QUFFbkY7QUFJQSxLQUFLLHNCQUFzQixTQUFTLHdCQUF3QixTQUFTO0FBQ25FLE1BQUksV0FBVyxLQUFLLE9BQU8sV0FBVyxLQUFLO0FBQzNDLE1BQUksT0FBTyxLQUFLLGNBQWMsd0JBQXdCLE9BQU87QUFDN0QsTUFBSSxLQUFLLFNBQVMsNkJBQTZCLEtBQUssTUFBTSxNQUFNLEtBQUssY0FBYyxLQUFLLFVBQVUsTUFBTSxLQUN0RztBQUFFLFdBQU87QUFBQSxFQUFLO0FBQ2hCLE1BQUksU0FBUyxLQUFLLGdCQUFnQixNQUFNLFVBQVUsVUFBVSxPQUFPLE9BQU87QUFDMUUsTUFBSSwwQkFBMEIsT0FBTyxTQUFTLG9CQUFvQjtBQUNoRSxRQUFJLHVCQUF1Qix1QkFBdUIsT0FBTyxPQUFPO0FBQUUsNkJBQXVCLHNCQUFzQjtBQUFBLElBQUk7QUFDbkgsUUFBSSx1QkFBdUIscUJBQXFCLE9BQU8sT0FBTztBQUFFLDZCQUF1QixvQkFBb0I7QUFBQSxJQUFJO0FBQy9HLFFBQUksdUJBQXVCLGlCQUFpQixPQUFPLE9BQU87QUFBRSw2QkFBdUIsZ0JBQWdCO0FBQUEsSUFBSTtBQUFBLEVBQ3pHO0FBQ0EsU0FBTztBQUNUO0FBRUEsS0FBSyxrQkFBa0IsU0FBUyxNQUFNLFVBQVUsVUFBVSxTQUFTLFNBQVM7QUFDMUUsTUFBSSxrQkFBa0IsS0FBSyxRQUFRLGVBQWUsS0FBSyxLQUFLLFNBQVMsZ0JBQWdCLEtBQUssU0FBUyxXQUMvRixLQUFLLGVBQWUsS0FBSyxPQUFPLENBQUMsS0FBSyxtQkFBbUIsS0FBSyxLQUFLLE1BQU0sS0FBSyxVQUFVLEtBQ3hGLEtBQUsscUJBQXFCLEtBQUs7QUFDbkMsTUFBSSxrQkFBa0I7QUFFdEIsU0FBTyxNQUFNO0FBQ1gsUUFBSSxVQUFVLEtBQUssZUFBZSxNQUFNLFVBQVUsVUFBVSxTQUFTLGlCQUFpQixpQkFBaUIsT0FBTztBQUU5RyxRQUFJLFFBQVEsVUFBVTtBQUFFLHdCQUFrQjtBQUFBLElBQU07QUFDaEQsUUFBSSxZQUFZLFFBQVEsUUFBUSxTQUFTLDJCQUEyQjtBQUNsRSxVQUFJLGlCQUFpQjtBQUNuQixZQUFJLFlBQVksS0FBSyxZQUFZLFVBQVUsUUFBUTtBQUNuRCxrQkFBVSxhQUFhO0FBQ3ZCLGtCQUFVLEtBQUssV0FBVyxXQUFXLGlCQUFpQjtBQUFBLE1BQ3hEO0FBQ0EsYUFBTztBQUFBLElBQ1Q7QUFFQSxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsS0FBSyx3QkFBd0IsV0FBVztBQUN0QyxTQUFPLENBQUMsS0FBSyxtQkFBbUIsS0FBSyxLQUFLLElBQUksUUFBUSxLQUFLO0FBQzdEO0FBRUEsS0FBSywyQkFBMkIsU0FBUyxVQUFVLFVBQVUsVUFBVSxTQUFTO0FBQzlFLFNBQU8sS0FBSyxxQkFBcUIsS0FBSyxZQUFZLFVBQVUsUUFBUSxHQUFHLFVBQVUsTUFBTSxPQUFPO0FBQ2hHO0FBRUEsS0FBSyxpQkFBaUIsU0FBUyxNQUFNLFVBQVUsVUFBVSxTQUFTLGlCQUFpQixpQkFBaUIsU0FBUztBQUMzRyxNQUFJLG9CQUFvQixLQUFLLFFBQVEsZUFBZTtBQUNwRCxNQUFJLFdBQVcscUJBQXFCLEtBQUssSUFBSSxRQUFRLFdBQVc7QUFDaEUsTUFBSSxXQUFXLFVBQVU7QUFBRSxTQUFLLE1BQU0sS0FBSyxjQUFjLGtFQUFrRTtBQUFBLEVBQUc7QUFFOUgsTUFBSSxXQUFXLEtBQUssSUFBSSxRQUFRLFFBQVE7QUFDeEMsTUFBSSxZQUFhLFlBQVksS0FBSyxTQUFTLFFBQVEsVUFBVSxLQUFLLFNBQVMsUUFBUSxhQUFjLEtBQUssSUFBSSxRQUFRLEdBQUcsR0FBRztBQUN0SCxRQUFJLE9BQU8sS0FBSyxZQUFZLFVBQVUsUUFBUTtBQUM5QyxTQUFLLFNBQVM7QUFDZCxRQUFJLFVBQVU7QUFDWixXQUFLLFdBQVcsS0FBSyxnQkFBZ0I7QUFDckMsV0FBSyxPQUFPLFFBQVEsUUFBUTtBQUFBLElBQzlCLFdBQVcsS0FBSyxTQUFTLFFBQVEsYUFBYSxLQUFLLFNBQVMsU0FBUztBQUNuRSxXQUFLLFdBQVcsS0FBSyxrQkFBa0I7QUFBQSxJQUN6QyxPQUFPO0FBQ0wsV0FBSyxXQUFXLEtBQUssV0FBVyxLQUFLLFFBQVEsa0JBQWtCLE9BQU87QUFBQSxJQUN4RTtBQUNBLFNBQUssV0FBVyxDQUFDLENBQUM7QUFDbEIsUUFBSSxtQkFBbUI7QUFDckIsV0FBSyxXQUFXO0FBQUEsSUFDbEI7QUFDQSxXQUFPLEtBQUssV0FBVyxNQUFNLGtCQUFrQjtBQUFBLEVBQ2pELFdBQVcsQ0FBQyxXQUFXLEtBQUssSUFBSSxRQUFRLE1BQU0sR0FBRztBQUMvQyxRQUFJLHlCQUF5QixJQUFJLHVCQUFxQixjQUFjLEtBQUssVUFBVSxjQUFjLEtBQUssVUFBVSxtQkFBbUIsS0FBSztBQUN4SSxTQUFLLFdBQVc7QUFDaEIsU0FBSyxXQUFXO0FBQ2hCLFNBQUssZ0JBQWdCO0FBQ3JCLFFBQUksV0FBVyxLQUFLLGNBQWMsUUFBUSxRQUFRLEtBQUssUUFBUSxlQUFlLEdBQUcsT0FBTyxzQkFBc0I7QUFDOUcsUUFBSSxtQkFBbUIsQ0FBQyxZQUFZLEtBQUssc0JBQXNCLEdBQUc7QUFDaEUsV0FBSyxtQkFBbUIsd0JBQXdCLEtBQUs7QUFDckQsV0FBSywrQkFBK0I7QUFDcEMsVUFBSSxLQUFLLGdCQUFnQixHQUN2QjtBQUFFLGFBQUssTUFBTSxLQUFLLGVBQWUsMkRBQTJEO0FBQUEsTUFBRztBQUNqRyxXQUFLLFdBQVc7QUFDaEIsV0FBSyxXQUFXO0FBQ2hCLFdBQUssZ0JBQWdCO0FBQ3JCLGFBQU8sS0FBSyx5QkFBeUIsVUFBVSxVQUFVLFVBQVUsT0FBTztBQUFBLElBQzVFO0FBQ0EsU0FBSyxzQkFBc0Isd0JBQXdCLElBQUk7QUFDdkQsU0FBSyxXQUFXLGVBQWUsS0FBSztBQUNwQyxTQUFLLFdBQVcsZUFBZSxLQUFLO0FBQ3BDLFNBQUssZ0JBQWdCLG9CQUFvQixLQUFLO0FBQzlDLFFBQUksU0FBUyxLQUFLLFlBQVksVUFBVSxRQUFRO0FBQ2hELFdBQU8sU0FBUztBQUNoQixXQUFPLFlBQVk7QUFDbkIsUUFBSSxtQkFBbUI7QUFDckIsYUFBTyxXQUFXO0FBQUEsSUFDcEI7QUFDQSxXQUFPLEtBQUssV0FBVyxRQUFRLGdCQUFnQjtBQUFBLEVBQ2pELFdBQVcsS0FBSyxTQUFTLFFBQVEsV0FBVztBQUMxQyxRQUFJLFlBQVksaUJBQWlCO0FBQy9CLFdBQUssTUFBTSxLQUFLLE9BQU8sMkVBQTJFO0FBQUEsSUFDcEc7QUFDQSxRQUFJLFNBQVMsS0FBSyxZQUFZLFVBQVUsUUFBUTtBQUNoRCxXQUFPLE1BQU07QUFDYixXQUFPLFFBQVEsS0FBSyxjQUFjLEVBQUMsVUFBVSxLQUFJLENBQUM7QUFDbEQsV0FBTyxLQUFLLFdBQVcsUUFBUSwwQkFBMEI7QUFBQSxFQUMzRDtBQUNBLFNBQU87QUFDVDtBQU9BLEtBQUssZ0JBQWdCLFNBQVMsd0JBQXdCLFNBQVMsUUFBUTtBQUdyRSxNQUFJLEtBQUssU0FBUyxRQUFRLE9BQU87QUFBRSxTQUFLLFdBQVc7QUFBQSxFQUFHO0FBRXRELE1BQUksTUFBTSxhQUFhLEtBQUsscUJBQXFCLEtBQUs7QUFDdEQsVUFBUSxLQUFLLE1BQU07QUFBQSxJQUNuQixLQUFLLFFBQVE7QUFDWCxVQUFJLENBQUMsS0FBSyxZQUNSO0FBQUUsYUFBSyxNQUFNLEtBQUssT0FBTyxrQ0FBa0M7QUFBQSxNQUFHO0FBQ2hFLGFBQU8sS0FBSyxVQUFVO0FBQ3RCLFdBQUssS0FBSztBQUNWLFVBQUksS0FBSyxTQUFTLFFBQVEsVUFBVSxDQUFDLEtBQUssa0JBQ3hDO0FBQUUsYUFBSyxNQUFNLEtBQUssT0FBTyxnREFBZ0Q7QUFBQSxNQUFHO0FBTzlFLFVBQUksS0FBSyxTQUFTLFFBQVEsT0FBTyxLQUFLLFNBQVMsUUFBUSxZQUFZLEtBQUssU0FBUyxRQUFRLFFBQ3ZGO0FBQUUsYUFBSyxXQUFXO0FBQUEsTUFBRztBQUN2QixhQUFPLEtBQUssV0FBVyxNQUFNLE9BQU87QUFBQSxJQUV0QyxLQUFLLFFBQVE7QUFDWCxhQUFPLEtBQUssVUFBVTtBQUN0QixXQUFLLEtBQUs7QUFDVixhQUFPLEtBQUssV0FBVyxNQUFNLGdCQUFnQjtBQUFBLElBRS9DLEtBQUssUUFBUTtBQUNYLFVBQUksV0FBVyxLQUFLLE9BQU8sV0FBVyxLQUFLLFVBQVUsY0FBYyxLQUFLO0FBQ3hFLFVBQUksS0FBSyxLQUFLLFdBQVcsS0FBSztBQUM5QixVQUFJLEtBQUssUUFBUSxlQUFlLEtBQUssQ0FBQyxlQUFlLEdBQUcsU0FBUyxXQUFXLENBQUMsS0FBSyxtQkFBbUIsS0FBSyxLQUFLLElBQUksUUFBUSxTQUFTLEdBQUc7QUFDckksYUFBSyxnQkFBZ0IsTUFBTSxNQUFNO0FBQ2pDLGVBQU8sS0FBSyxjQUFjLEtBQUssWUFBWSxVQUFVLFFBQVEsR0FBRyxHQUFHLE9BQU8sTUFBTSxPQUFPO0FBQUEsTUFDekY7QUFDQSxVQUFJLGNBQWMsQ0FBQyxLQUFLLG1CQUFtQixHQUFHO0FBQzVDLFlBQUksS0FBSyxJQUFJLFFBQVEsS0FBSyxHQUN4QjtBQUFFLGlCQUFPLEtBQUsscUJBQXFCLEtBQUssWUFBWSxVQUFVLFFBQVEsR0FBRyxDQUFDLEVBQUUsR0FBRyxPQUFPLE9BQU87QUFBQSxRQUFFO0FBQ2pHLFlBQUksS0FBSyxRQUFRLGVBQWUsS0FBSyxHQUFHLFNBQVMsV0FBVyxLQUFLLFNBQVMsUUFBUSxRQUFRLENBQUMsZ0JBQ3RGLENBQUMsS0FBSyw0QkFBNEIsS0FBSyxVQUFVLFFBQVEsS0FBSyxjQUFjO0FBQy9FLGVBQUssS0FBSyxXQUFXLEtBQUs7QUFDMUIsY0FBSSxLQUFLLG1CQUFtQixLQUFLLENBQUMsS0FBSyxJQUFJLFFBQVEsS0FBSyxHQUN0RDtBQUFFLGlCQUFLLFdBQVc7QUFBQSxVQUFHO0FBQ3ZCLGlCQUFPLEtBQUsscUJBQXFCLEtBQUssWUFBWSxVQUFVLFFBQVEsR0FBRyxDQUFDLEVBQUUsR0FBRyxNQUFNLE9BQU87QUFBQSxRQUM1RjtBQUFBLE1BQ0Y7QUFDQSxhQUFPO0FBQUEsSUFFVCxLQUFLLFFBQVE7QUFDWCxVQUFJLFFBQVEsS0FBSztBQUNqQixhQUFPLEtBQUssYUFBYSxNQUFNLEtBQUs7QUFDcEMsV0FBSyxRQUFRLEVBQUMsU0FBUyxNQUFNLFNBQVMsT0FBTyxNQUFNLE1BQUs7QUFDeEQsYUFBTztBQUFBLElBRVQsS0FBSyxRQUFRO0FBQUEsSUFBSyxLQUFLLFFBQVE7QUFDN0IsYUFBTyxLQUFLLGFBQWEsS0FBSyxLQUFLO0FBQUEsSUFFckMsS0FBSyxRQUFRO0FBQUEsSUFBTyxLQUFLLFFBQVE7QUFBQSxJQUFPLEtBQUssUUFBUTtBQUNuRCxhQUFPLEtBQUssVUFBVTtBQUN0QixXQUFLLFFBQVEsS0FBSyxTQUFTLFFBQVEsUUFBUSxPQUFPLEtBQUssU0FBUyxRQUFRO0FBQ3hFLFdBQUssTUFBTSxLQUFLLEtBQUs7QUFDckIsV0FBSyxLQUFLO0FBQ1YsYUFBTyxLQUFLLFdBQVcsTUFBTSxTQUFTO0FBQUEsSUFFeEMsS0FBSyxRQUFRO0FBQ1gsVUFBSU4sU0FBUSxLQUFLLE9BQU8sT0FBTyxLQUFLLG1DQUFtQyxZQUFZLE9BQU87QUFDMUYsVUFBSSx3QkFBd0I7QUFDMUIsWUFBSSx1QkFBdUIsc0JBQXNCLEtBQUssQ0FBQyxLQUFLLHFCQUFxQixJQUFJLEdBQ25GO0FBQUUsaUNBQXVCLHNCQUFzQkE7QUFBQSxRQUFPO0FBQ3hELFlBQUksdUJBQXVCLG9CQUFvQixHQUM3QztBQUFFLGlDQUF1QixvQkFBb0JBO0FBQUEsUUFBTztBQUFBLE1BQ3hEO0FBQ0EsYUFBTztBQUFBLElBRVQsS0FBSyxRQUFRO0FBQ1gsYUFBTyxLQUFLLFVBQVU7QUFDdEIsV0FBSyxLQUFLO0FBQ1YsV0FBSyxXQUFXLEtBQUssY0FBYyxRQUFRLFVBQVUsTUFBTSxNQUFNLHNCQUFzQjtBQUN2RixhQUFPLEtBQUssV0FBVyxNQUFNLGlCQUFpQjtBQUFBLElBRWhELEtBQUssUUFBUTtBQUNYLFdBQUssZ0JBQWdCLE1BQU0sTUFBTTtBQUNqQyxhQUFPLEtBQUssU0FBUyxPQUFPLHNCQUFzQjtBQUFBLElBRXBELEtBQUssUUFBUTtBQUNYLGFBQU8sS0FBSyxVQUFVO0FBQ3RCLFdBQUssS0FBSztBQUNWLGFBQU8sS0FBSyxjQUFjLE1BQU0sQ0FBQztBQUFBLElBRW5DLEtBQUssUUFBUTtBQUNYLGFBQU8sS0FBSyxXQUFXLEtBQUssVUFBVSxHQUFHLEtBQUs7QUFBQSxJQUVoRCxLQUFLLFFBQVE7QUFDWCxhQUFPLEtBQUssU0FBUztBQUFBLElBRXZCLEtBQUssUUFBUTtBQUNYLGFBQU8sS0FBSyxjQUFjO0FBQUEsSUFFNUIsS0FBSyxRQUFRO0FBQ1gsVUFBSSxLQUFLLFFBQVEsZUFBZSxJQUFJO0FBQ2xDLGVBQU8sS0FBSyxnQkFBZ0IsTUFBTTtBQUFBLE1BQ3BDLE9BQU87QUFDTCxlQUFPLEtBQUssV0FBVztBQUFBLE1BQ3pCO0FBQUEsSUFFRjtBQUNFLGFBQU8sS0FBSyxxQkFBcUI7QUFBQSxFQUNuQztBQUNGO0FBRUEsS0FBSyx1QkFBdUIsV0FBVztBQUNyQyxPQUFLLFdBQVc7QUFDbEI7QUFFQSxLQUFLLGtCQUFrQixTQUFTLFFBQVE7QUFDdEMsTUFBSSxPQUFPLEtBQUssVUFBVTtBQUkxQixNQUFJLEtBQUssYUFBYTtBQUFFLFNBQUssaUJBQWlCLEtBQUssT0FBTyxtQ0FBbUM7QUFBQSxFQUFHO0FBQ2hHLE9BQUssS0FBSztBQUVWLE1BQUksS0FBSyxTQUFTLFFBQVEsVUFBVSxDQUFDLFFBQVE7QUFDM0MsV0FBTyxLQUFLLG1CQUFtQixJQUFJO0FBQUEsRUFDckMsV0FBVyxLQUFLLFNBQVMsUUFBUSxLQUFLO0FBQ3BDLFFBQUksT0FBTyxLQUFLLFlBQVksS0FBSyxPQUFPLEtBQUssT0FBTyxLQUFLLElBQUksS0FBSztBQUNsRSxTQUFLLE9BQU87QUFDWixTQUFLLE9BQU8sS0FBSyxXQUFXLE1BQU0sWUFBWTtBQUM5QyxXQUFPLEtBQUssZ0JBQWdCLElBQUk7QUFBQSxFQUNsQyxPQUFPO0FBQ0wsU0FBSyxXQUFXO0FBQUEsRUFDbEI7QUFDRjtBQUVBLEtBQUsscUJBQXFCLFNBQVMsTUFBTTtBQUN2QyxPQUFLLEtBQUs7QUFHVixPQUFLLFNBQVMsS0FBSyxpQkFBaUI7QUFFcEMsTUFBSSxLQUFLLFFBQVEsZUFBZSxJQUFJO0FBQ2xDLFFBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxNQUFNLEdBQUc7QUFDN0IsV0FBSyxPQUFPLFFBQVEsS0FBSztBQUN6QixVQUFJLENBQUMsS0FBSyxtQkFBbUIsUUFBUSxNQUFNLEdBQUc7QUFDNUMsYUFBSyxVQUFVLEtBQUssaUJBQWlCO0FBQ3JDLFlBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxNQUFNLEdBQUc7QUFDN0IsZUFBSyxPQUFPLFFBQVEsS0FBSztBQUN6QixjQUFJLENBQUMsS0FBSyxtQkFBbUIsUUFBUSxNQUFNLEdBQUc7QUFDNUMsaUJBQUssV0FBVztBQUFBLFVBQ2xCO0FBQUEsUUFDRjtBQUFBLE1BQ0YsT0FBTztBQUNMLGFBQUssVUFBVTtBQUFBLE1BQ2pCO0FBQUEsSUFDRixPQUFPO0FBQ0wsV0FBSyxVQUFVO0FBQUEsSUFDakI7QUFBQSxFQUNGLE9BQU87QUFFTCxRQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsTUFBTSxHQUFHO0FBQzdCLFVBQUksV0FBVyxLQUFLO0FBQ3BCLFVBQUksS0FBSyxJQUFJLFFBQVEsS0FBSyxLQUFLLEtBQUssSUFBSSxRQUFRLE1BQU0sR0FBRztBQUN2RCxhQUFLLGlCQUFpQixVQUFVLDJDQUEyQztBQUFBLE1BQzdFLE9BQU87QUFDTCxhQUFLLFdBQVcsUUFBUTtBQUFBLE1BQzFCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxTQUFPLEtBQUssV0FBVyxNQUFNLGtCQUFrQjtBQUNqRDtBQUVBLEtBQUssa0JBQWtCLFNBQVMsTUFBTTtBQUNwQyxPQUFLLEtBQUs7QUFFVixNQUFJLGNBQWMsS0FBSztBQUN2QixPQUFLLFdBQVcsS0FBSyxXQUFXLElBQUk7QUFFcEMsTUFBSSxLQUFLLFNBQVMsU0FBUyxRQUN6QjtBQUFFLFNBQUssaUJBQWlCLEtBQUssU0FBUyxPQUFPLDBEQUEwRDtBQUFBLEVBQUc7QUFDNUcsTUFBSSxhQUNGO0FBQUUsU0FBSyxpQkFBaUIsS0FBSyxPQUFPLG1EQUFtRDtBQUFBLEVBQUc7QUFDNUYsTUFBSSxLQUFLLFFBQVEsZUFBZSxZQUFZLENBQUMsS0FBSyxRQUFRLDZCQUN4RDtBQUFFLFNBQUssaUJBQWlCLEtBQUssT0FBTywyQ0FBMkM7QUFBQSxFQUFHO0FBRXBGLFNBQU8sS0FBSyxXQUFXLE1BQU0sY0FBYztBQUM3QztBQUVBLEtBQUssZUFBZSxTQUFTLE9BQU87QUFDbEMsTUFBSSxPQUFPLEtBQUssVUFBVTtBQUMxQixPQUFLLFFBQVE7QUFDYixPQUFLLE1BQU0sS0FBSyxNQUFNLE1BQU0sS0FBSyxPQUFPLEtBQUssR0FBRztBQUNoRCxNQUFJLEtBQUssSUFBSSxXQUFXLEtBQUssSUFBSSxTQUFTLENBQUMsTUFBTSxLQUMvQztBQUFFLFNBQUssU0FBUyxLQUFLLFNBQVMsT0FBTyxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssSUFBSSxNQUFNLEdBQUcsRUFBRSxFQUFFLFFBQVEsTUFBTSxFQUFFO0FBQUEsRUFBRztBQUN4RyxPQUFLLEtBQUs7QUFDVixTQUFPLEtBQUssV0FBVyxNQUFNLFNBQVM7QUFDeEM7QUFFQSxLQUFLLHVCQUF1QixXQUFXO0FBQ3JDLE9BQUssT0FBTyxRQUFRLE1BQU07QUFDMUIsTUFBSSxNQUFNLEtBQUssZ0JBQWdCO0FBQy9CLE9BQUssT0FBTyxRQUFRLE1BQU07QUFDMUIsU0FBTztBQUNUO0FBRUEsS0FBSyxtQkFBbUIsU0FBUyxVQUFVO0FBQ3pDLFNBQU8sQ0FBQyxLQUFLLG1CQUFtQjtBQUNsQztBQUVBLEtBQUsscUNBQXFDLFNBQVMsWUFBWSxTQUFTO0FBQ3RFLE1BQUksV0FBVyxLQUFLLE9BQU8sV0FBVyxLQUFLLFVBQVUsS0FBSyxxQkFBcUIsS0FBSyxRQUFRLGVBQWU7QUFDM0csTUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQ2pDLFNBQUssS0FBSztBQUVWLFFBQUksZ0JBQWdCLEtBQUssT0FBTyxnQkFBZ0IsS0FBSztBQUNyRCxRQUFJLFdBQVcsQ0FBQyxHQUFHLFFBQVEsTUFBTSxjQUFjO0FBQy9DLFFBQUkseUJBQXlCLElBQUksdUJBQXFCLGNBQWMsS0FBSyxVQUFVLGNBQWMsS0FBSyxVQUFVO0FBQ2hILFNBQUssV0FBVztBQUNoQixTQUFLLFdBQVc7QUFFaEIsV0FBTyxLQUFLLFNBQVMsUUFBUSxRQUFRO0FBQ25DLGNBQVEsUUFBUSxRQUFRLEtBQUssT0FBTyxRQUFRLEtBQUs7QUFDakQsVUFBSSxzQkFBc0IsS0FBSyxtQkFBbUIsUUFBUSxRQUFRLElBQUksR0FBRztBQUN2RSxzQkFBYztBQUNkO0FBQUEsTUFDRixXQUFXLEtBQUssU0FBUyxRQUFRLFVBQVU7QUFDekMsc0JBQWMsS0FBSztBQUNuQixpQkFBUyxLQUFLLEtBQUssZUFBZSxLQUFLLGlCQUFpQixDQUFDLENBQUM7QUFDMUQsWUFBSSxLQUFLLFNBQVMsUUFBUSxPQUFPO0FBQy9CLGVBQUs7QUFBQSxZQUNILEtBQUs7QUFBQSxZQUNMO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFDQTtBQUFBLE1BQ0YsT0FBTztBQUNMLGlCQUFTLEtBQUssS0FBSyxpQkFBaUIsT0FBTyx3QkFBd0IsS0FBSyxjQUFjLENBQUM7QUFBQSxNQUN6RjtBQUFBLElBQ0Y7QUFDQSxRQUFJLGNBQWMsS0FBSyxZQUFZLGNBQWMsS0FBSztBQUN0RCxTQUFLLE9BQU8sUUFBUSxNQUFNO0FBRTFCLFFBQUksY0FBYyxLQUFLLGlCQUFpQixRQUFRLEtBQUssS0FBSyxJQUFJLFFBQVEsS0FBSyxHQUFHO0FBQzVFLFdBQUssbUJBQW1CLHdCQUF3QixLQUFLO0FBQ3JELFdBQUssK0JBQStCO0FBQ3BDLFdBQUssV0FBVztBQUNoQixXQUFLLFdBQVc7QUFDaEIsYUFBTyxLQUFLLG9CQUFvQixVQUFVLFVBQVUsVUFBVSxPQUFPO0FBQUEsSUFDdkU7QUFFQSxRQUFJLENBQUMsU0FBUyxVQUFVLGFBQWE7QUFBRSxXQUFLLFdBQVcsS0FBSyxZQUFZO0FBQUEsSUFBRztBQUMzRSxRQUFJLGFBQWE7QUFBRSxXQUFLLFdBQVcsV0FBVztBQUFBLElBQUc7QUFDakQsU0FBSyxzQkFBc0Isd0JBQXdCLElBQUk7QUFDdkQsU0FBSyxXQUFXLGVBQWUsS0FBSztBQUNwQyxTQUFLLFdBQVcsZUFBZSxLQUFLO0FBRXBDLFFBQUksU0FBUyxTQUFTLEdBQUc7QUFDdkIsWUFBTSxLQUFLLFlBQVksZUFBZSxhQUFhO0FBQ25ELFVBQUksY0FBYztBQUNsQixXQUFLLGFBQWEsS0FBSyxzQkFBc0IsYUFBYSxXQUFXO0FBQUEsSUFDdkUsT0FBTztBQUNMLFlBQU0sU0FBUyxDQUFDO0FBQUEsSUFDbEI7QUFBQSxFQUNGLE9BQU87QUFDTCxVQUFNLEtBQUsscUJBQXFCO0FBQUEsRUFDbEM7QUFFQSxNQUFJLEtBQUssUUFBUSxnQkFBZ0I7QUFDL0IsUUFBSSxNQUFNLEtBQUssWUFBWSxVQUFVLFFBQVE7QUFDN0MsUUFBSSxhQUFhO0FBQ2pCLFdBQU8sS0FBSyxXQUFXLEtBQUsseUJBQXlCO0FBQUEsRUFDdkQsT0FBTztBQUNMLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSxLQUFLLGlCQUFpQixTQUFTLE1BQU07QUFDbkMsU0FBTztBQUNUO0FBRUEsS0FBSyxzQkFBc0IsU0FBUyxVQUFVLFVBQVUsVUFBVSxTQUFTO0FBQ3pFLFNBQU8sS0FBSyxxQkFBcUIsS0FBSyxZQUFZLFVBQVUsUUFBUSxHQUFHLFVBQVUsT0FBTyxPQUFPO0FBQ2pHO0FBUUEsSUFBSSxRQUFRLENBQUM7QUFFYixLQUFLLFdBQVcsV0FBVztBQUN6QixNQUFJLEtBQUssYUFBYTtBQUFFLFNBQUssaUJBQWlCLEtBQUssT0FBTyxnQ0FBZ0M7QUFBQSxFQUFHO0FBQzdGLE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsT0FBSyxLQUFLO0FBQ1YsTUFBSSxLQUFLLFFBQVEsZUFBZSxLQUFLLEtBQUssU0FBUyxRQUFRLEtBQUs7QUFDOUQsUUFBSSxPQUFPLEtBQUssWUFBWSxLQUFLLE9BQU8sS0FBSyxPQUFPLEtBQUssSUFBSSxLQUFLO0FBQ2xFLFNBQUssT0FBTztBQUNaLFNBQUssT0FBTyxLQUFLLFdBQVcsTUFBTSxZQUFZO0FBQzlDLFNBQUssS0FBSztBQUNWLFFBQUksY0FBYyxLQUFLO0FBQ3ZCLFNBQUssV0FBVyxLQUFLLFdBQVcsSUFBSTtBQUNwQyxRQUFJLEtBQUssU0FBUyxTQUFTLFVBQ3pCO0FBQUUsV0FBSyxpQkFBaUIsS0FBSyxTQUFTLE9BQU8sc0RBQXNEO0FBQUEsSUFBRztBQUN4RyxRQUFJLGFBQ0Y7QUFBRSxXQUFLLGlCQUFpQixLQUFLLE9BQU8sa0RBQWtEO0FBQUEsSUFBRztBQUMzRixRQUFJLENBQUMsS0FBSyxtQkFDUjtBQUFFLFdBQUssaUJBQWlCLEtBQUssT0FBTyxtRUFBbUU7QUFBQSxJQUFHO0FBQzVHLFdBQU8sS0FBSyxXQUFXLE1BQU0sY0FBYztBQUFBLEVBQzdDO0FBQ0EsTUFBSSxXQUFXLEtBQUssT0FBTyxXQUFXLEtBQUs7QUFDM0MsT0FBSyxTQUFTLEtBQUssZ0JBQWdCLEtBQUssY0FBYyxNQUFNLE9BQU8sSUFBSSxHQUFHLFVBQVUsVUFBVSxNQUFNLEtBQUs7QUFDekcsTUFBSSxLQUFLLElBQUksUUFBUSxNQUFNLEdBQUc7QUFBRSxTQUFLLFlBQVksS0FBSyxjQUFjLFFBQVEsUUFBUSxLQUFLLFFBQVEsZUFBZSxHQUFHLEtBQUs7QUFBQSxFQUFHLE9BQ3RIO0FBQUUsU0FBSyxZQUFZO0FBQUEsRUFBTztBQUMvQixTQUFPLEtBQUssV0FBVyxNQUFNLGVBQWU7QUFDOUM7QUFJQSxLQUFLLHVCQUF1QixTQUFTRyxNQUFLO0FBQ3hDLE1BQUksV0FBV0EsS0FBSTtBQUVuQixNQUFJLE9BQU8sS0FBSyxVQUFVO0FBQzFCLE1BQUksS0FBSyxTQUFTLFFBQVEsaUJBQWlCO0FBQ3pDLFFBQUksQ0FBQyxVQUFVO0FBQ2IsV0FBSyxpQkFBaUIsS0FBSyxPQUFPLGtEQUFrRDtBQUFBLElBQ3RGO0FBQ0EsU0FBSyxRQUFRO0FBQUEsTUFDWCxLQUFLLEtBQUssTUFBTSxRQUFRLFVBQVUsSUFBSTtBQUFBLE1BQ3RDLFFBQVE7QUFBQSxJQUNWO0FBQUEsRUFDRixPQUFPO0FBQ0wsU0FBSyxRQUFRO0FBQUEsTUFDWCxLQUFLLEtBQUssTUFBTSxNQUFNLEtBQUssT0FBTyxLQUFLLEdBQUcsRUFBRSxRQUFRLFVBQVUsSUFBSTtBQUFBLE1BQ2xFLFFBQVEsS0FBSztBQUFBLElBQ2Y7QUFBQSxFQUNGO0FBQ0EsT0FBSyxLQUFLO0FBQ1YsT0FBSyxPQUFPLEtBQUssU0FBUyxRQUFRO0FBQ2xDLFNBQU8sS0FBSyxXQUFXLE1BQU0saUJBQWlCO0FBQ2hEO0FBRUEsS0FBSyxnQkFBZ0IsU0FBU0EsTUFBSztBQUNqQyxNQUFLQSxTQUFRLE9BQVMsQ0FBQUEsT0FBTSxDQUFDO0FBQzdCLE1BQUksV0FBV0EsS0FBSTtBQUFVLE1BQUssYUFBYSxPQUFTLFlBQVc7QUFFbkUsTUFBSSxPQUFPLEtBQUssVUFBVTtBQUMxQixPQUFLLEtBQUs7QUFDVixPQUFLLGNBQWMsQ0FBQztBQUNwQixNQUFJLFNBQVMsS0FBSyxxQkFBcUIsRUFBQyxTQUFrQixDQUFDO0FBQzNELE9BQUssU0FBUyxDQUFDLE1BQU07QUFDckIsU0FBTyxDQUFDLE9BQU8sTUFBTTtBQUNuQixRQUFJLEtBQUssU0FBUyxRQUFRLEtBQUs7QUFBRSxXQUFLLE1BQU0sS0FBSyxLQUFLLCtCQUErQjtBQUFBLElBQUc7QUFDeEYsU0FBSyxPQUFPLFFBQVEsWUFBWTtBQUNoQyxTQUFLLFlBQVksS0FBSyxLQUFLLGdCQUFnQixDQUFDO0FBQzVDLFNBQUssT0FBTyxRQUFRLE1BQU07QUFDMUIsU0FBSyxPQUFPLEtBQUssU0FBUyxLQUFLLHFCQUFxQixFQUFDLFNBQWtCLENBQUMsQ0FBQztBQUFBLEVBQzNFO0FBQ0EsT0FBSyxLQUFLO0FBQ1YsU0FBTyxLQUFLLFdBQVcsTUFBTSxpQkFBaUI7QUFDaEQ7QUFFQSxLQUFLLGNBQWMsU0FBUyxNQUFNO0FBQ2hDLFNBQU8sQ0FBQyxLQUFLLFlBQVksS0FBSyxJQUFJLFNBQVMsZ0JBQWdCLEtBQUssSUFBSSxTQUFTLFlBQzFFLEtBQUssU0FBUyxRQUFRLFFBQVEsS0FBSyxTQUFTLFFBQVEsT0FBTyxLQUFLLFNBQVMsUUFBUSxVQUFVLEtBQUssU0FBUyxRQUFRLFlBQVksS0FBSyxLQUFLLFdBQVksS0FBSyxRQUFRLGVBQWUsS0FBSyxLQUFLLFNBQVMsUUFBUSxTQUMzTSxDQUFDLFVBQVUsS0FBSyxLQUFLLE1BQU0sTUFBTSxLQUFLLFlBQVksS0FBSyxLQUFLLENBQUM7QUFDakU7QUFJQSxLQUFLLFdBQVcsU0FBUyxXQUFXLHdCQUF3QjtBQUMxRCxNQUFJLE9BQU8sS0FBSyxVQUFVLEdBQUcsUUFBUSxNQUFNLFdBQVcsQ0FBQztBQUN2RCxPQUFLLGFBQWEsQ0FBQztBQUNuQixPQUFLLEtBQUs7QUFDVixTQUFPLENBQUMsS0FBSyxJQUFJLFFBQVEsTUFBTSxHQUFHO0FBQ2hDLFFBQUksQ0FBQyxPQUFPO0FBQ1YsV0FBSyxPQUFPLFFBQVEsS0FBSztBQUN6QixVQUFJLEtBQUssUUFBUSxlQUFlLEtBQUssS0FBSyxtQkFBbUIsUUFBUSxNQUFNLEdBQUc7QUFBRTtBQUFBLE1BQU07QUFBQSxJQUN4RixPQUFPO0FBQUUsY0FBUTtBQUFBLElBQU87QUFFeEIsUUFBSSxPQUFPLEtBQUssY0FBYyxXQUFXLHNCQUFzQjtBQUMvRCxRQUFJLENBQUMsV0FBVztBQUFFLFdBQUssZUFBZSxNQUFNLFVBQVUsc0JBQXNCO0FBQUEsSUFBRztBQUMvRSxTQUFLLFdBQVcsS0FBSyxJQUFJO0FBQUEsRUFDM0I7QUFDQSxTQUFPLEtBQUssV0FBVyxNQUFNLFlBQVksa0JBQWtCLGtCQUFrQjtBQUMvRTtBQUVBLEtBQUssZ0JBQWdCLFNBQVMsV0FBVyx3QkFBd0I7QUFDL0QsTUFBSSxPQUFPLEtBQUssVUFBVSxHQUFHLGFBQWEsU0FBUyxVQUFVO0FBQzdELE1BQUksS0FBSyxRQUFRLGVBQWUsS0FBSyxLQUFLLElBQUksUUFBUSxRQUFRLEdBQUc7QUFDL0QsUUFBSSxXQUFXO0FBQ2IsV0FBSyxXQUFXLEtBQUssV0FBVyxLQUFLO0FBQ3JDLFVBQUksS0FBSyxTQUFTLFFBQVEsT0FBTztBQUMvQixhQUFLLGlCQUFpQixLQUFLLE9BQU8sK0NBQStDO0FBQUEsTUFDbkY7QUFDQSxhQUFPLEtBQUssV0FBVyxNQUFNLGFBQWE7QUFBQSxJQUM1QztBQUVBLFNBQUssV0FBVyxLQUFLLGlCQUFpQixPQUFPLHNCQUFzQjtBQUVuRSxRQUFJLEtBQUssU0FBUyxRQUFRLFNBQVMsMEJBQTBCLHVCQUF1QixnQkFBZ0IsR0FBRztBQUNyRyw2QkFBdUIsZ0JBQWdCLEtBQUs7QUFBQSxJQUM5QztBQUVBLFdBQU8sS0FBSyxXQUFXLE1BQU0sZUFBZTtBQUFBLEVBQzlDO0FBQ0EsTUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQ2pDLFNBQUssU0FBUztBQUNkLFNBQUssWUFBWTtBQUNqQixRQUFJLGFBQWEsd0JBQXdCO0FBQ3ZDLGlCQUFXLEtBQUs7QUFDaEIsaUJBQVcsS0FBSztBQUFBLElBQ2xCO0FBQ0EsUUFBSSxDQUFDLFdBQ0g7QUFBRSxvQkFBYyxLQUFLLElBQUksUUFBUSxJQUFJO0FBQUEsSUFBRztBQUFBLEVBQzVDO0FBQ0EsTUFBSSxjQUFjLEtBQUs7QUFDdkIsT0FBSyxrQkFBa0IsSUFBSTtBQUMzQixNQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsS0FBSyxRQUFRLGVBQWUsS0FBSyxDQUFDLGVBQWUsS0FBSyxZQUFZLElBQUksR0FBRztBQUN6RyxjQUFVO0FBQ1Ysa0JBQWMsS0FBSyxRQUFRLGVBQWUsS0FBSyxLQUFLLElBQUksUUFBUSxJQUFJO0FBQ3BFLFNBQUssa0JBQWtCLElBQUk7QUFBQSxFQUM3QixPQUFPO0FBQ0wsY0FBVTtBQUFBLEVBQ1o7QUFDQSxPQUFLLG1CQUFtQixNQUFNLFdBQVcsYUFBYSxTQUFTLFVBQVUsVUFBVSx3QkFBd0IsV0FBVztBQUN0SCxTQUFPLEtBQUssV0FBVyxNQUFNLFVBQVU7QUFDekM7QUFFQSxLQUFLLG9CQUFvQixTQUFTLE1BQU07QUFDdEMsTUFBSSxPQUFPLEtBQUssSUFBSTtBQUNwQixPQUFLLGtCQUFrQixJQUFJO0FBQzNCLE9BQUssUUFBUSxLQUFLLFlBQVksS0FBSztBQUNuQyxPQUFLLE9BQU87QUFDWixNQUFJLGFBQWEsS0FBSyxTQUFTLFFBQVEsSUFBSTtBQUMzQyxNQUFJLEtBQUssTUFBTSxPQUFPLFdBQVcsWUFBWTtBQUMzQyxRQUFJSCxTQUFRLEtBQUssTUFBTTtBQUN2QixRQUFJLEtBQUssU0FBUyxPQUNoQjtBQUFFLFdBQUssaUJBQWlCQSxRQUFPLDhCQUE4QjtBQUFBLElBQUcsT0FFaEU7QUFBRSxXQUFLLGlCQUFpQkEsUUFBTyxzQ0FBc0M7QUFBQSxJQUFHO0FBQUEsRUFDNUUsT0FBTztBQUNMLFFBQUksS0FBSyxTQUFTLFNBQVMsS0FBSyxNQUFNLE9BQU8sQ0FBQyxFQUFFLFNBQVMsZUFDdkQ7QUFBRSxXQUFLLGlCQUFpQixLQUFLLE1BQU0sT0FBTyxDQUFDLEVBQUUsT0FBTywrQkFBK0I7QUFBQSxJQUFHO0FBQUEsRUFDMUY7QUFDRjtBQUVBLEtBQUsscUJBQXFCLFNBQVMsTUFBTSxXQUFXLGFBQWEsU0FBUyxVQUFVLFVBQVUsd0JBQXdCLGFBQWE7QUFDakksT0FBSyxlQUFlLFlBQVksS0FBSyxTQUFTLFFBQVEsT0FDcEQ7QUFBRSxTQUFLLFdBQVc7QUFBQSxFQUFHO0FBRXZCLE1BQUksS0FBSyxJQUFJLFFBQVEsS0FBSyxHQUFHO0FBQzNCLFNBQUssUUFBUSxZQUFZLEtBQUssa0JBQWtCLEtBQUssT0FBTyxLQUFLLFFBQVEsSUFBSSxLQUFLLGlCQUFpQixPQUFPLHNCQUFzQjtBQUNoSSxTQUFLLE9BQU87QUFBQSxFQUNkLFdBQVcsS0FBSyxRQUFRLGVBQWUsS0FBSyxLQUFLLFNBQVMsUUFBUSxRQUFRO0FBQ3hFLFFBQUksV0FBVztBQUFFLFdBQUssV0FBVztBQUFBLElBQUc7QUFDcEMsU0FBSyxTQUFTO0FBQ2QsU0FBSyxRQUFRLEtBQUssWUFBWSxhQUFhLE9BQU87QUFDbEQsU0FBSyxPQUFPO0FBQUEsRUFDZCxXQUFXLENBQUMsYUFBYSxDQUFDLGVBQ2YsS0FBSyxRQUFRLGVBQWUsS0FBSyxDQUFDLEtBQUssWUFBWSxLQUFLLElBQUksU0FBUyxpQkFDcEUsS0FBSyxJQUFJLFNBQVMsU0FBUyxLQUFLLElBQUksU0FBUyxXQUM3QyxLQUFLLFNBQVMsUUFBUSxTQUFTLEtBQUssU0FBUyxRQUFRLFVBQVUsS0FBSyxTQUFTLFFBQVEsS0FBSztBQUNwRyxRQUFJLGVBQWUsU0FBUztBQUFFLFdBQUssV0FBVztBQUFBLElBQUc7QUFDakQsU0FBSyxrQkFBa0IsSUFBSTtBQUFBLEVBQzdCLFdBQVcsS0FBSyxRQUFRLGVBQWUsS0FBSyxDQUFDLEtBQUssWUFBWSxLQUFLLElBQUksU0FBUyxjQUFjO0FBQzVGLFFBQUksZUFBZSxTQUFTO0FBQUUsV0FBSyxXQUFXO0FBQUEsSUFBRztBQUNqRCxTQUFLLGdCQUFnQixLQUFLLEdBQUc7QUFDN0IsUUFBSSxLQUFLLElBQUksU0FBUyxXQUFXLENBQUMsS0FBSyxlQUNyQztBQUFFLFdBQUssZ0JBQWdCO0FBQUEsSUFBVTtBQUNuQyxRQUFJLFdBQVc7QUFDYixXQUFLLFFBQVEsS0FBSyxrQkFBa0IsVUFBVSxVQUFVLEtBQUssU0FBUyxLQUFLLEdBQUcsQ0FBQztBQUFBLElBQ2pGLFdBQVcsS0FBSyxTQUFTLFFBQVEsTUFBTSx3QkFBd0I7QUFDN0QsVUFBSSx1QkFBdUIsa0JBQWtCLEdBQzNDO0FBQUUsK0JBQXVCLGtCQUFrQixLQUFLO0FBQUEsTUFBTztBQUN6RCxXQUFLLFFBQVEsS0FBSyxrQkFBa0IsVUFBVSxVQUFVLEtBQUssU0FBUyxLQUFLLEdBQUcsQ0FBQztBQUFBLElBQ2pGLE9BQU87QUFDTCxXQUFLLFFBQVEsS0FBSyxTQUFTLEtBQUssR0FBRztBQUFBLElBQ3JDO0FBQ0EsU0FBSyxPQUFPO0FBQ1osU0FBSyxZQUFZO0FBQUEsRUFDbkIsT0FBTztBQUFFLFNBQUssV0FBVztBQUFBLEVBQUc7QUFDOUI7QUFFQSxLQUFLLG9CQUFvQixTQUFTLE1BQU07QUFDdEMsTUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQ2pDLFFBQUksS0FBSyxJQUFJLFFBQVEsUUFBUSxHQUFHO0FBQzlCLFdBQUssV0FBVztBQUNoQixXQUFLLE1BQU0sS0FBSyxpQkFBaUI7QUFDakMsV0FBSyxPQUFPLFFBQVEsUUFBUTtBQUM1QixhQUFPLEtBQUs7QUFBQSxJQUNkLE9BQU87QUFDTCxXQUFLLFdBQVc7QUFBQSxJQUNsQjtBQUFBLEVBQ0Y7QUFDQSxTQUFPLEtBQUssTUFBTSxLQUFLLFNBQVMsUUFBUSxPQUFPLEtBQUssU0FBUyxRQUFRLFNBQVMsS0FBSyxjQUFjLElBQUksS0FBSyxXQUFXLEtBQUssUUFBUSxrQkFBa0IsT0FBTztBQUM3SjtBQUlBLEtBQUssZUFBZSxTQUFTLE1BQU07QUFDakMsT0FBSyxLQUFLO0FBQ1YsTUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQUUsU0FBSyxZQUFZLEtBQUssYUFBYTtBQUFBLEVBQU87QUFDL0UsTUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQUUsU0FBSyxRQUFRO0FBQUEsRUFBTztBQUMzRDtBQUlBLEtBQUssY0FBYyxTQUFTLGFBQWEsU0FBUyxrQkFBa0I7QUFDbEUsTUFBSSxPQUFPLEtBQUssVUFBVSxHQUFHLGNBQWMsS0FBSyxVQUFVLGNBQWMsS0FBSyxVQUFVLG1CQUFtQixLQUFLO0FBRS9HLE9BQUssYUFBYSxJQUFJO0FBQ3RCLE1BQUksS0FBSyxRQUFRLGVBQWUsR0FDOUI7QUFBRSxTQUFLLFlBQVk7QUFBQSxFQUFhO0FBQ2xDLE1BQUksS0FBSyxRQUFRLGVBQWUsR0FDOUI7QUFBRSxTQUFLLFFBQVEsQ0FBQyxDQUFDO0FBQUEsRUFBUztBQUU1QixPQUFLLFdBQVc7QUFDaEIsT0FBSyxXQUFXO0FBQ2hCLE9BQUssZ0JBQWdCO0FBQ3JCLE9BQUssV0FBVyxjQUFjLFNBQVMsS0FBSyxTQUFTLElBQUksZUFBZSxtQkFBbUIscUJBQXFCLEVBQUU7QUFFbEgsT0FBSyxPQUFPLFFBQVEsTUFBTTtBQUMxQixPQUFLLFNBQVMsS0FBSyxpQkFBaUIsUUFBUSxRQUFRLE9BQU8sS0FBSyxRQUFRLGVBQWUsQ0FBQztBQUN4RixPQUFLLCtCQUErQjtBQUNwQyxPQUFLLGtCQUFrQixNQUFNLE9BQU8sTUFBTSxLQUFLO0FBRS9DLE9BQUssV0FBVztBQUNoQixPQUFLLFdBQVc7QUFDaEIsT0FBSyxnQkFBZ0I7QUFDckIsU0FBTyxLQUFLLFdBQVcsTUFBTSxvQkFBb0I7QUFDbkQ7QUFJQSxLQUFLLHVCQUF1QixTQUFTLE1BQU0sUUFBUSxTQUFTLFNBQVM7QUFDbkUsTUFBSSxjQUFjLEtBQUssVUFBVSxjQUFjLEtBQUssVUFBVSxtQkFBbUIsS0FBSztBQUV0RixPQUFLLFdBQVcsY0FBYyxTQUFTLEtBQUssSUFBSSxXQUFXO0FBQzNELE9BQUssYUFBYSxJQUFJO0FBQ3RCLE1BQUksS0FBSyxRQUFRLGVBQWUsR0FBRztBQUFFLFNBQUssUUFBUSxDQUFDLENBQUM7QUFBQSxFQUFTO0FBRTdELE9BQUssV0FBVztBQUNoQixPQUFLLFdBQVc7QUFDaEIsT0FBSyxnQkFBZ0I7QUFFckIsT0FBSyxTQUFTLEtBQUssaUJBQWlCLFFBQVEsSUFBSTtBQUNoRCxPQUFLLGtCQUFrQixNQUFNLE1BQU0sT0FBTyxPQUFPO0FBRWpELE9BQUssV0FBVztBQUNoQixPQUFLLFdBQVc7QUFDaEIsT0FBSyxnQkFBZ0I7QUFDckIsU0FBTyxLQUFLLFdBQVcsTUFBTSx5QkFBeUI7QUFDeEQ7QUFJQSxLQUFLLG9CQUFvQixTQUFTLE1BQU0saUJBQWlCLFVBQVUsU0FBUztBQUMxRSxNQUFJLGVBQWUsbUJBQW1CLEtBQUssU0FBUyxRQUFRO0FBQzVELE1BQUksWUFBWSxLQUFLLFFBQVEsWUFBWTtBQUV6QyxNQUFJLGNBQWM7QUFDaEIsU0FBSyxPQUFPLEtBQUssaUJBQWlCLE9BQU87QUFDekMsU0FBSyxhQUFhO0FBQ2xCLFNBQUssWUFBWSxNQUFNLEtBQUs7QUFBQSxFQUM5QixPQUFPO0FBQ0wsUUFBSSxZQUFZLEtBQUssUUFBUSxlQUFlLEtBQUssQ0FBQyxLQUFLLGtCQUFrQixLQUFLLE1BQU07QUFDcEYsUUFBSSxDQUFDLGFBQWEsV0FBVztBQUMzQixrQkFBWSxLQUFLLGdCQUFnQixLQUFLLEdBQUc7QUFJekMsVUFBSSxhQUFhLFdBQ2Y7QUFBRSxhQUFLLGlCQUFpQixLQUFLLE9BQU8sMkVBQTJFO0FBQUEsTUFBRztBQUFBLElBQ3RIO0FBR0EsUUFBSSxZQUFZLEtBQUs7QUFDckIsU0FBSyxTQUFTLENBQUM7QUFDZixRQUFJLFdBQVc7QUFBRSxXQUFLLFNBQVM7QUFBQSxJQUFNO0FBSXJDLFNBQUssWUFBWSxNQUFNLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEtBQUssa0JBQWtCLEtBQUssTUFBTSxDQUFDO0FBRXZILFFBQUksS0FBSyxVQUFVLEtBQUssSUFBSTtBQUFFLFdBQUssZ0JBQWdCLEtBQUssSUFBSSxZQUFZO0FBQUEsSUFBRztBQUMzRSxTQUFLLE9BQU8sS0FBSyxXQUFXLE9BQU8sUUFBVyxhQUFhLENBQUMsU0FBUztBQUNyRSxTQUFLLGFBQWE7QUFDbEIsU0FBSyx1QkFBdUIsS0FBSyxLQUFLLElBQUk7QUFDMUMsU0FBSyxTQUFTO0FBQUEsRUFDaEI7QUFDQSxPQUFLLFVBQVU7QUFDakI7QUFFQSxLQUFLLG9CQUFvQixTQUFTLFFBQVE7QUFDeEMsV0FBUyxJQUFJLEdBQUcsT0FBTyxRQUFRLElBQUksS0FBSyxRQUFRLEtBQUssR0FDbkQ7QUFDQSxRQUFJLFFBQVEsS0FBSyxDQUFDO0FBRWxCLFFBQUksTUFBTSxTQUFTLGNBQWM7QUFBRSxhQUFPO0FBQUEsSUFDNUM7QUFBQSxFQUFFO0FBQ0YsU0FBTztBQUNUO0FBS0EsS0FBSyxjQUFjLFNBQVMsTUFBTSxpQkFBaUI7QUFDakQsTUFBSSxXQUFXLHVCQUFPLE9BQU8sSUFBSTtBQUNqQyxXQUFTLElBQUksR0FBRyxPQUFPLEtBQUssUUFBUSxJQUFJLEtBQUssUUFBUSxLQUFLLEdBQ3hEO0FBQ0EsUUFBSSxRQUFRLEtBQUssQ0FBQztBQUVsQixTQUFLLHNCQUFzQixPQUFPLFVBQVUsa0JBQWtCLE9BQU8sUUFBUTtBQUFBLEVBQy9FO0FBQ0Y7QUFRQSxLQUFLLGdCQUFnQixTQUFTLE9BQU8sb0JBQW9CLFlBQVksd0JBQXdCO0FBQzNGLE1BQUksT0FBTyxDQUFDLEdBQUcsUUFBUTtBQUN2QixTQUFPLENBQUMsS0FBSyxJQUFJLEtBQUssR0FBRztBQUN2QixRQUFJLENBQUMsT0FBTztBQUNWLFdBQUssT0FBTyxRQUFRLEtBQUs7QUFDekIsVUFBSSxzQkFBc0IsS0FBSyxtQkFBbUIsS0FBSyxHQUFHO0FBQUU7QUFBQSxNQUFNO0FBQUEsSUFDcEUsT0FBTztBQUFFLGNBQVE7QUFBQSxJQUFPO0FBRXhCLFFBQUksTUFBTztBQUNYLFFBQUksY0FBYyxLQUFLLFNBQVMsUUFBUSxPQUN0QztBQUFFLFlBQU07QUFBQSxJQUFNLFdBQ1AsS0FBSyxTQUFTLFFBQVEsVUFBVTtBQUN2QyxZQUFNLEtBQUssWUFBWSxzQkFBc0I7QUFDN0MsVUFBSSwwQkFBMEIsS0FBSyxTQUFTLFFBQVEsU0FBUyx1QkFBdUIsZ0JBQWdCLEdBQ2xHO0FBQUUsK0JBQXVCLGdCQUFnQixLQUFLO0FBQUEsTUFBTztBQUFBLElBQ3pELE9BQU87QUFDTCxZQUFNLEtBQUssaUJBQWlCLE9BQU8sc0JBQXNCO0FBQUEsSUFDM0Q7QUFDQSxTQUFLLEtBQUssR0FBRztBQUFBLEVBQ2Y7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxLQUFLLGtCQUFrQixTQUFTRyxNQUFLO0FBQ25DLE1BQUlILFNBQVFHLEtBQUk7QUFDaEIsTUFBSSxNQUFNQSxLQUFJO0FBQ2QsTUFBSSxPQUFPQSxLQUFJO0FBRWYsTUFBSSxLQUFLLGVBQWUsU0FBUyxTQUMvQjtBQUFFLFNBQUssaUJBQWlCSCxRQUFPLHFEQUFxRDtBQUFBLEVBQUc7QUFDekYsTUFBSSxLQUFLLFdBQVcsU0FBUyxTQUMzQjtBQUFFLFNBQUssaUJBQWlCQSxRQUFPLDJEQUEyRDtBQUFBLEVBQUc7QUFDL0YsTUFBSSxFQUFFLEtBQUssaUJBQWlCLEVBQUUsUUFBUSxjQUFjLFNBQVMsYUFDM0Q7QUFBRSxTQUFLLGlCQUFpQkEsUUFBTyxtREFBbUQ7QUFBQSxFQUFHO0FBQ3ZGLE1BQUksS0FBSyx1QkFBdUIsU0FBUyxlQUFlLFNBQVMsVUFDL0Q7QUFBRSxTQUFLLE1BQU1BLFFBQVEsZ0JBQWdCLE9BQU8sdUNBQXdDO0FBQUEsRUFBRztBQUN6RixNQUFJLEtBQUssU0FBUyxLQUFLLElBQUksR0FDekI7QUFBRSxTQUFLLE1BQU1BLFFBQVEseUJBQXlCLE9BQU8sR0FBSTtBQUFBLEVBQUc7QUFDOUQsTUFBSSxLQUFLLFFBQVEsY0FBYyxLQUM3QixLQUFLLE1BQU0sTUFBTUEsUUFBTyxHQUFHLEVBQUUsUUFBUSxJQUFJLE1BQU0sSUFBSTtBQUFFO0FBQUEsRUFBTztBQUM5RCxNQUFJLEtBQUssS0FBSyxTQUFTLEtBQUssc0JBQXNCLEtBQUs7QUFDdkQsTUFBSSxHQUFHLEtBQUssSUFBSSxHQUFHO0FBQ2pCLFFBQUksQ0FBQyxLQUFLLFdBQVcsU0FBUyxTQUM1QjtBQUFFLFdBQUssaUJBQWlCQSxRQUFPLHNEQUFzRDtBQUFBLElBQUc7QUFDMUYsU0FBSyxpQkFBaUJBLFFBQVEsa0JBQWtCLE9BQU8sZUFBZ0I7QUFBQSxFQUN6RTtBQUNGO0FBTUEsS0FBSyxhQUFhLFNBQVMsU0FBUztBQUNsQyxNQUFJLE9BQU8sS0FBSyxlQUFlO0FBQy9CLE9BQUssS0FBSyxDQUFDLENBQUMsT0FBTztBQUNuQixPQUFLLFdBQVcsTUFBTSxZQUFZO0FBQ2xDLE1BQUksQ0FBQyxTQUFTO0FBQ1osU0FBSyxnQkFBZ0IsSUFBSTtBQUN6QixRQUFJLEtBQUssU0FBUyxXQUFXLENBQUMsS0FBSyxlQUNqQztBQUFFLFdBQUssZ0JBQWdCLEtBQUs7QUFBQSxJQUFPO0FBQUEsRUFDdkM7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxLQUFLLGlCQUFpQixXQUFXO0FBQy9CLE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsTUFBSSxLQUFLLFNBQVMsUUFBUSxNQUFNO0FBQzlCLFNBQUssT0FBTyxLQUFLO0FBQUEsRUFDbkIsV0FBVyxLQUFLLEtBQUssU0FBUztBQUM1QixTQUFLLE9BQU8sS0FBSyxLQUFLO0FBTXRCLFNBQUssS0FBSyxTQUFTLFdBQVcsS0FBSyxTQUFTLGdCQUN6QyxLQUFLLGVBQWUsS0FBSyxlQUFlLEtBQUssS0FBSyxNQUFNLFdBQVcsS0FBSyxZQUFZLE1BQU0sS0FBSztBQUNoRyxXQUFLLFFBQVEsSUFBSTtBQUFBLElBQ25CO0FBQ0EsU0FBSyxPQUFPLFFBQVE7QUFBQSxFQUN0QixPQUFPO0FBQ0wsU0FBSyxXQUFXO0FBQUEsRUFDbEI7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxLQUFLLG9CQUFvQixXQUFXO0FBQ2xDLE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsTUFBSSxLQUFLLFNBQVMsUUFBUSxXQUFXO0FBQ25DLFNBQUssT0FBTyxLQUFLO0FBQUEsRUFDbkIsT0FBTztBQUNMLFNBQUssV0FBVztBQUFBLEVBQ2xCO0FBQ0EsT0FBSyxLQUFLO0FBQ1YsT0FBSyxXQUFXLE1BQU0sbUJBQW1CO0FBR3pDLE1BQUksS0FBSyxRQUFRLG9CQUFvQjtBQUNuQyxRQUFJLEtBQUssaUJBQWlCLFdBQVcsR0FBRztBQUN0QyxXQUFLLE1BQU0sS0FBSyxPQUFRLHFCQUFzQixLQUFLLE9BQVEsMENBQTJDO0FBQUEsSUFDeEcsT0FBTztBQUNMLFdBQUssaUJBQWlCLEtBQUssaUJBQWlCLFNBQVMsQ0FBQyxFQUFFLEtBQUssS0FBSyxJQUFJO0FBQUEsSUFDeEU7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUNUO0FBSUEsS0FBSyxhQUFhLFNBQVMsU0FBUztBQUNsQyxNQUFJLENBQUMsS0FBSyxVQUFVO0FBQUUsU0FBSyxXQUFXLEtBQUs7QUFBQSxFQUFPO0FBRWxELE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsT0FBSyxLQUFLO0FBQ1YsTUFBSSxLQUFLLFNBQVMsUUFBUSxRQUFRLEtBQUssbUJBQW1CLEtBQU0sS0FBSyxTQUFTLFFBQVEsUUFBUSxDQUFDLEtBQUssS0FBSyxZQUFhO0FBQ3BILFNBQUssV0FBVztBQUNoQixTQUFLLFdBQVc7QUFBQSxFQUNsQixPQUFPO0FBQ0wsU0FBSyxXQUFXLEtBQUssSUFBSSxRQUFRLElBQUk7QUFDckMsU0FBSyxXQUFXLEtBQUssaUJBQWlCLE9BQU87QUFBQSxFQUMvQztBQUNBLFNBQU8sS0FBSyxXQUFXLE1BQU0saUJBQWlCO0FBQ2hEO0FBRUEsS0FBSyxhQUFhLFNBQVMsU0FBUztBQUNsQyxNQUFJLENBQUMsS0FBSyxVQUFVO0FBQUUsU0FBSyxXQUFXLEtBQUs7QUFBQSxFQUFPO0FBRWxELE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsT0FBSyxLQUFLO0FBQ1YsT0FBSyxXQUFXLEtBQUssZ0JBQWdCLE1BQU0sTUFBTSxPQUFPLE9BQU87QUFDL0QsU0FBTyxLQUFLLFdBQVcsTUFBTSxpQkFBaUI7QUFDaEQ7QUFFQSxJQUFJLE9BQU8sT0FBTztBQVFsQixLQUFLLFFBQVEsU0FBUyxLQUFLLFNBQVM7QUFDbEMsTUFBSSxNQUFNLFlBQVksS0FBSyxPQUFPLEdBQUc7QUFDckMsYUFBVyxPQUFPLElBQUksT0FBTyxNQUFNLElBQUksU0FBUztBQUNoRCxNQUFJLEtBQUssWUFBWTtBQUNuQixlQUFXLFNBQVMsS0FBSztBQUFBLEVBQzNCO0FBQ0EsTUFBSSxNQUFNLElBQUksWUFBWSxPQUFPO0FBQ2pDLE1BQUksTUFBTTtBQUFLLE1BQUksTUFBTTtBQUFLLE1BQUksV0FBVyxLQUFLO0FBQ2xELFFBQU07QUFDUjtBQUVBLEtBQUssbUJBQW1CLEtBQUs7QUFFN0IsS0FBSyxjQUFjLFdBQVc7QUFDNUIsTUFBSSxLQUFLLFFBQVEsV0FBVztBQUMxQixXQUFPLElBQUksU0FBUyxLQUFLLFNBQVMsS0FBSyxNQUFNLEtBQUssU0FBUztBQUFBLEVBQzdEO0FBQ0Y7QUFFQSxJQUFJLE9BQU8sT0FBTztBQUVsQixJQUFJLFFBQVEsU0FBU08sT0FBTSxPQUFPO0FBQ2hDLE9BQUssUUFBUTtBQUViLE9BQUssTUFBTSxDQUFDO0FBRVosT0FBSyxVQUFVLENBQUM7QUFFaEIsT0FBSyxZQUFZLENBQUM7QUFDcEI7QUFJQSxLQUFLLGFBQWEsU0FBUyxPQUFPO0FBQ2hDLE9BQUssV0FBVyxLQUFLLElBQUksTUFBTSxLQUFLLENBQUM7QUFDdkM7QUFFQSxLQUFLLFlBQVksV0FBVztBQUMxQixPQUFLLFdBQVcsSUFBSTtBQUN0QjtBQUtBLEtBQUssNkJBQTZCLFNBQVMsT0FBTztBQUNoRCxTQUFRLE1BQU0sUUFBUSxrQkFBbUIsQ0FBQyxLQUFLLFlBQWEsTUFBTSxRQUFRO0FBQzVFO0FBRUEsS0FBSyxjQUFjLFNBQVMsTUFBTSxhQUFhLEtBQUs7QUFDbEQsTUFBSSxhQUFhO0FBQ2pCLE1BQUksZ0JBQWdCLGNBQWM7QUFDaEMsUUFBSSxRQUFRLEtBQUssYUFBYTtBQUM5QixpQkFBYSxNQUFNLFFBQVEsUUFBUSxJQUFJLElBQUksTUFBTSxNQUFNLFVBQVUsUUFBUSxJQUFJLElBQUksTUFBTSxNQUFNLElBQUksUUFBUSxJQUFJLElBQUk7QUFDakgsVUFBTSxRQUFRLEtBQUssSUFBSTtBQUN2QixRQUFJLEtBQUssWUFBYSxNQUFNLFFBQVEsV0FDbEM7QUFBRSxhQUFPLEtBQUssaUJBQWlCLElBQUk7QUFBQSxJQUFHO0FBQUEsRUFDMUMsV0FBVyxnQkFBZ0IsbUJBQW1CO0FBQzVDLFFBQUksVUFBVSxLQUFLLGFBQWE7QUFDaEMsWUFBUSxRQUFRLEtBQUssSUFBSTtBQUFBLEVBQzNCLFdBQVcsZ0JBQWdCLGVBQWU7QUFDeEMsUUFBSSxVQUFVLEtBQUssYUFBYTtBQUNoQyxRQUFJLEtBQUsscUJBQ1A7QUFBRSxtQkFBYSxRQUFRLFFBQVEsUUFBUSxJQUFJLElBQUk7QUFBQSxJQUFJLE9BRW5EO0FBQUUsbUJBQWEsUUFBUSxRQUFRLFFBQVEsSUFBSSxJQUFJLE1BQU0sUUFBUSxJQUFJLFFBQVEsSUFBSSxJQUFJO0FBQUEsSUFBSTtBQUN2RixZQUFRLFVBQVUsS0FBSyxJQUFJO0FBQUEsRUFDN0IsT0FBTztBQUNMLGFBQVMsSUFBSSxLQUFLLFdBQVcsU0FBUyxHQUFHLEtBQUssR0FBRyxFQUFFLEdBQUc7QUFDcEQsVUFBSSxVQUFVLEtBQUssV0FBVyxDQUFDO0FBQy9CLFVBQUksUUFBUSxRQUFRLFFBQVEsSUFBSSxJQUFJLE1BQU0sRUFBRyxRQUFRLFFBQVEsc0JBQXVCLFFBQVEsUUFBUSxDQUFDLE1BQU0sU0FDdkcsQ0FBQyxLQUFLLDJCQUEyQixPQUFPLEtBQUssUUFBUSxVQUFVLFFBQVEsSUFBSSxJQUFJLElBQUk7QUFDckYscUJBQWE7QUFDYjtBQUFBLE1BQ0Y7QUFDQSxjQUFRLElBQUksS0FBSyxJQUFJO0FBQ3JCLFVBQUksS0FBSyxZQUFhLFFBQVEsUUFBUSxXQUNwQztBQUFFLGVBQU8sS0FBSyxpQkFBaUIsSUFBSTtBQUFBLE1BQUc7QUFDeEMsVUFBSSxRQUFRLFFBQVEsV0FBVztBQUFFO0FBQUEsTUFBTTtBQUFBLElBQ3pDO0FBQUEsRUFDRjtBQUNBLE1BQUksWUFBWTtBQUFFLFNBQUssaUJBQWlCLEtBQU0saUJBQWlCLE9BQU8sNkJBQThCO0FBQUEsRUFBRztBQUN6RztBQUVBLEtBQUssbUJBQW1CLFNBQVMsSUFBSTtBQUVuQyxNQUFJLEtBQUssV0FBVyxDQUFDLEVBQUUsUUFBUSxRQUFRLEdBQUcsSUFBSSxNQUFNLE1BQ2hELEtBQUssV0FBVyxDQUFDLEVBQUUsSUFBSSxRQUFRLEdBQUcsSUFBSSxNQUFNLElBQUk7QUFDbEQsU0FBSyxpQkFBaUIsR0FBRyxJQUFJLElBQUk7QUFBQSxFQUNuQztBQUNGO0FBRUEsS0FBSyxlQUFlLFdBQVc7QUFDN0IsU0FBTyxLQUFLLFdBQVcsS0FBSyxXQUFXLFNBQVMsQ0FBQztBQUNuRDtBQUVBLEtBQUssa0JBQWtCLFdBQVc7QUFDaEMsV0FBUyxJQUFJLEtBQUssV0FBVyxTQUFTLEtBQUksS0FBSztBQUM3QyxRQUFJLFFBQVEsS0FBSyxXQUFXLENBQUM7QUFDN0IsUUFBSSxNQUFNLFNBQVMsWUFBWSx5QkFBeUIsMkJBQTJCO0FBQUUsYUFBTztBQUFBLElBQU07QUFBQSxFQUNwRztBQUNGO0FBR0EsS0FBSyxtQkFBbUIsV0FBVztBQUNqQyxXQUFTLElBQUksS0FBSyxXQUFXLFNBQVMsS0FBSSxLQUFLO0FBQzdDLFFBQUksUUFBUSxLQUFLLFdBQVcsQ0FBQztBQUM3QixRQUFJLE1BQU0sU0FBUyxZQUFZLHlCQUF5Qiw2QkFDcEQsRUFBRSxNQUFNLFFBQVEsY0FBYztBQUFFLGFBQU87QUFBQSxJQUFNO0FBQUEsRUFDbkQ7QUFDRjtBQUVBLElBQUksT0FBTyxTQUFTQyxNQUFLLFFBQVEsS0FBSyxLQUFLO0FBQ3pDLE9BQUssT0FBTztBQUNaLE9BQUssUUFBUTtBQUNiLE9BQUssTUFBTTtBQUNYLE1BQUksT0FBTyxRQUFRLFdBQ2pCO0FBQUUsU0FBSyxNQUFNLElBQUksZUFBZSxRQUFRLEdBQUc7QUFBQSxFQUFHO0FBQ2hELE1BQUksT0FBTyxRQUFRLGtCQUNqQjtBQUFFLFNBQUssYUFBYSxPQUFPLFFBQVE7QUFBQSxFQUFrQjtBQUN2RCxNQUFJLE9BQU8sUUFBUSxRQUNqQjtBQUFFLFNBQUssUUFBUSxDQUFDLEtBQUssQ0FBQztBQUFBLEVBQUc7QUFDN0I7QUFJQSxJQUFJLE9BQU8sT0FBTztBQUVsQixLQUFLLFlBQVksV0FBVztBQUMxQixTQUFPLElBQUksS0FBSyxNQUFNLEtBQUssT0FBTyxLQUFLLFFBQVE7QUFDakQ7QUFFQSxLQUFLLGNBQWMsU0FBUyxLQUFLLEtBQUs7QUFDcEMsU0FBTyxJQUFJLEtBQUssTUFBTSxLQUFLLEdBQUc7QUFDaEM7QUFJQSxTQUFTLGFBQWEsTUFBTSxNQUFNLEtBQUssS0FBSztBQUMxQyxPQUFLLE9BQU87QUFDWixPQUFLLE1BQU07QUFDWCxNQUFJLEtBQUssUUFBUSxXQUNmO0FBQUUsU0FBSyxJQUFJLE1BQU07QUFBQSxFQUFLO0FBQ3hCLE1BQUksS0FBSyxRQUFRLFFBQ2Y7QUFBRSxTQUFLLE1BQU0sQ0FBQyxJQUFJO0FBQUEsRUFBSztBQUN6QixTQUFPO0FBQ1Q7QUFFQSxLQUFLLGFBQWEsU0FBUyxNQUFNLE1BQU07QUFDckMsU0FBTyxhQUFhLEtBQUssTUFBTSxNQUFNLE1BQU0sS0FBSyxZQUFZLEtBQUssYUFBYTtBQUNoRjtBQUlBLEtBQUssZUFBZSxTQUFTLE1BQU0sTUFBTSxLQUFLLEtBQUs7QUFDakQsU0FBTyxhQUFhLEtBQUssTUFBTSxNQUFNLE1BQU0sS0FBSyxHQUFHO0FBQ3JEO0FBRUEsS0FBSyxXQUFXLFNBQVMsTUFBTTtBQUM3QixNQUFJLFVBQVUsSUFBSSxLQUFLLE1BQU0sS0FBSyxPQUFPLEtBQUssUUFBUTtBQUN0RCxXQUFTLFFBQVEsTUFBTTtBQUFFLFlBQVEsSUFBSSxJQUFJLEtBQUssSUFBSTtBQUFBLEVBQUc7QUFDckQsU0FBTztBQUNUO0FBR0EsSUFBSSw2QkFBNkI7QUFPakMsSUFBSSx3QkFBd0I7QUFDNUIsSUFBSSx5QkFBeUIsd0JBQXdCO0FBQ3JELElBQUkseUJBQXlCO0FBQzdCLElBQUkseUJBQXlCLHlCQUF5QjtBQUN0RCxJQUFJLHlCQUF5QjtBQUM3QixJQUFJLHlCQUF5QjtBQUU3QixJQUFJLDBCQUEwQjtBQUFBLEVBQzVCLEdBQUc7QUFBQSxFQUNILElBQUk7QUFBQSxFQUNKLElBQUk7QUFBQSxFQUNKLElBQUk7QUFBQSxFQUNKLElBQUk7QUFBQSxFQUNKLElBQUk7QUFDTjtBQUdBLElBQUksa0NBQWtDO0FBRXRDLElBQUksbUNBQW1DO0FBQUEsRUFDckMsR0FBRztBQUFBLEVBQ0gsSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUNOO0FBR0EsSUFBSSwrQkFBK0I7QUFHbkMsSUFBSSxvQkFBb0I7QUFDeEIsSUFBSSxxQkFBcUIsb0JBQW9CO0FBQzdDLElBQUkscUJBQXFCLHFCQUFxQjtBQUM5QyxJQUFJLHFCQUFxQixxQkFBcUI7QUFDOUMsSUFBSSxxQkFBcUIscUJBQXFCO0FBQzlDLElBQUkscUJBQXFCLHFCQUFxQixNQUFNO0FBRXBELElBQUksc0JBQXNCO0FBQUEsRUFDeEIsR0FBRztBQUFBLEVBQ0gsSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUFBLEVBQ0osSUFBSTtBQUNOO0FBRUEsSUFBSSxPQUFPLENBQUM7QUFDWixTQUFTLGlCQUFpQixhQUFhO0FBQ3JDLE1BQUksSUFBSSxLQUFLLFdBQVcsSUFBSTtBQUFBLElBQzFCLFFBQVEsWUFBWSx3QkFBd0IsV0FBVyxJQUFJLE1BQU0sNEJBQTRCO0FBQUEsSUFDN0YsaUJBQWlCLFlBQVksaUNBQWlDLFdBQVcsQ0FBQztBQUFBLElBQzFFLFdBQVc7QUFBQSxNQUNULGtCQUFrQixZQUFZLDRCQUE0QjtBQUFBLE1BQzFELFFBQVEsWUFBWSxvQkFBb0IsV0FBVyxDQUFDO0FBQUEsSUFDdEQ7QUFBQSxFQUNGO0FBQ0EsSUFBRSxVQUFVLG9CQUFvQixFQUFFLFVBQVU7QUFFNUMsSUFBRSxVQUFVLEtBQUssRUFBRSxVQUFVO0FBQzdCLElBQUUsVUFBVSxLQUFLLEVBQUUsVUFBVTtBQUM3QixJQUFFLFVBQVUsTUFBTSxFQUFFLFVBQVU7QUFDaEM7QUFFQSxLQUFTLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLEtBQUssUUFBUSxLQUFLLEdBQUc7QUFDbkUsZ0JBQWMsS0FBSyxDQUFDO0FBRXhCLG1CQUFpQixXQUFXO0FBQzlCO0FBSE07QUFERztBQUFPO0FBTWhCLElBQUksT0FBTyxPQUFPO0FBSWxCLElBQUksV0FBVyxTQUFTQyxVQUFTLFFBQVEsTUFBTTtBQUU3QyxPQUFLLFNBQVM7QUFFZCxPQUFLLE9BQU8sUUFBUTtBQUN0QjtBQUVBLFNBQVMsVUFBVSxnQkFBZ0IsU0FBUyxjQUFlLEtBQUs7QUFHOUQsV0FBUyxPQUFPLE1BQU0sTUFBTSxPQUFPLEtBQUssUUFBUTtBQUM5QyxhQUFTLFFBQVEsS0FBSyxPQUFPLFFBQVEsTUFBTSxRQUFRO0FBQ2pELFVBQUksS0FBSyxTQUFTLE1BQU0sUUFBUSxTQUFTLE9BQU87QUFBRSxlQUFPO0FBQUEsTUFBSztBQUFBLElBQ2hFO0FBQUEsRUFDRjtBQUNBLFNBQU87QUFDVDtBQUVBLFNBQVMsVUFBVSxVQUFVLFNBQVMsVUFBVztBQUMvQyxTQUFPLElBQUksU0FBUyxLQUFLLFFBQVEsS0FBSyxJQUFJO0FBQzVDO0FBRUEsSUFBSSx3QkFBd0IsU0FBU0MsdUJBQXNCLFFBQVE7QUFDakUsT0FBSyxTQUFTO0FBQ2QsT0FBSyxhQUFhLFNBQVMsT0FBTyxRQUFRLGVBQWUsSUFBSSxPQUFPLE9BQU8sT0FBTyxRQUFRLGVBQWUsSUFBSSxNQUFNLE9BQU8sT0FBTyxRQUFRLGVBQWUsS0FBSyxNQUFNLE9BQU8sT0FBTyxRQUFRLGVBQWUsS0FBSyxNQUFNO0FBQ25OLE9BQUssb0JBQW9CLEtBQUssT0FBTyxRQUFRLGVBQWUsS0FBSyxLQUFLLE9BQU8sUUFBUSxXQUFXO0FBQ2hHLE9BQUssU0FBUztBQUNkLE9BQUssUUFBUTtBQUNiLE9BQUssUUFBUTtBQUNiLE9BQUssVUFBVTtBQUNmLE9BQUssVUFBVTtBQUNmLE9BQUssVUFBVTtBQUNmLE9BQUssTUFBTTtBQUNYLE9BQUssZUFBZTtBQUNwQixPQUFLLGtCQUFrQjtBQUN2QixPQUFLLDhCQUE4QjtBQUNuQyxPQUFLLHFCQUFxQjtBQUMxQixPQUFLLG1CQUFtQjtBQUN4QixPQUFLLGFBQWEsdUJBQU8sT0FBTyxJQUFJO0FBQ3BDLE9BQUsscUJBQXFCLENBQUM7QUFDM0IsT0FBSyxXQUFXO0FBQ2xCO0FBRUEsc0JBQXNCLFVBQVUsUUFBUSxTQUFTLE1BQU9WLFFBQU8sU0FBUyxPQUFPO0FBQzdFLE1BQUksY0FBYyxNQUFNLFFBQVEsR0FBRyxNQUFNO0FBQ3pDLE1BQUksVUFBVSxNQUFNLFFBQVEsR0FBRyxNQUFNO0FBQ3JDLE9BQUssUUFBUUEsU0FBUTtBQUNyQixPQUFLLFNBQVMsVUFBVTtBQUN4QixPQUFLLFFBQVE7QUFDYixNQUFJLGVBQWUsS0FBSyxPQUFPLFFBQVEsZUFBZSxJQUFJO0FBQ3hELFNBQUssVUFBVTtBQUNmLFNBQUssVUFBVTtBQUNmLFNBQUssVUFBVTtBQUFBLEVBQ2pCLE9BQU87QUFDTCxTQUFLLFVBQVUsV0FBVyxLQUFLLE9BQU8sUUFBUSxlQUFlO0FBQzdELFNBQUssVUFBVTtBQUNmLFNBQUssVUFBVSxXQUFXLEtBQUssT0FBTyxRQUFRLGVBQWU7QUFBQSxFQUMvRDtBQUNGO0FBRUEsc0JBQXNCLFVBQVUsUUFBUSxTQUFTLE1BQU8sU0FBUztBQUMvRCxPQUFLLE9BQU8saUJBQWlCLEtBQUssT0FBUSxrQ0FBbUMsS0FBSyxTQUFVLFFBQVEsT0FBUTtBQUM5RztBQUlBLHNCQUFzQixVQUFVLEtBQUssU0FBUyxHQUFJLEdBQUcsUUFBUTtBQUN6RCxNQUFLLFdBQVcsT0FBUyxVQUFTO0FBRXBDLE1BQUksSUFBSSxLQUFLO0FBQ2IsTUFBSSxJQUFJLEVBQUU7QUFDVixNQUFJLEtBQUssR0FBRztBQUNWLFdBQU87QUFBQSxFQUNUO0FBQ0EsTUFBSSxJQUFJLEVBQUUsV0FBVyxDQUFDO0FBQ3RCLE1BQUksRUFBRSxVQUFVLEtBQUssWUFBWSxLQUFLLFNBQVUsS0FBSyxTQUFVLElBQUksS0FBSyxHQUFHO0FBQ3pFLFdBQU87QUFBQSxFQUNUO0FBQ0EsTUFBSSxPQUFPLEVBQUUsV0FBVyxJQUFJLENBQUM7QUFDN0IsU0FBTyxRQUFRLFNBQVUsUUFBUSxTQUFVLEtBQUssTUFBTSxPQUFPLFdBQVk7QUFDM0U7QUFFQSxzQkFBc0IsVUFBVSxZQUFZLFNBQVMsVUFBVyxHQUFHLFFBQVE7QUFDdkUsTUFBSyxXQUFXLE9BQVMsVUFBUztBQUVwQyxNQUFJLElBQUksS0FBSztBQUNiLE1BQUksSUFBSSxFQUFFO0FBQ1YsTUFBSSxLQUFLLEdBQUc7QUFDVixXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksSUFBSSxFQUFFLFdBQVcsQ0FBQyxHQUFHO0FBQ3pCLE1BQUksRUFBRSxVQUFVLEtBQUssWUFBWSxLQUFLLFNBQVUsS0FBSyxTQUFVLElBQUksS0FBSyxNQUNuRSxPQUFPLEVBQUUsV0FBVyxJQUFJLENBQUMsS0FBSyxTQUFVLE9BQU8sT0FBUTtBQUMxRCxXQUFPLElBQUk7QUFBQSxFQUNiO0FBQ0EsU0FBTyxJQUFJO0FBQ2I7QUFFQSxzQkFBc0IsVUFBVSxVQUFVLFNBQVMsUUFBUyxRQUFRO0FBQ2hFLE1BQUssV0FBVyxPQUFTLFVBQVM7QUFFcEMsU0FBTyxLQUFLLEdBQUcsS0FBSyxLQUFLLE1BQU07QUFDakM7QUFFQSxzQkFBc0IsVUFBVSxZQUFZLFNBQVMsVUFBVyxRQUFRO0FBQ3BFLE1BQUssV0FBVyxPQUFTLFVBQVM7QUFFcEMsU0FBTyxLQUFLLEdBQUcsS0FBSyxVQUFVLEtBQUssS0FBSyxNQUFNLEdBQUcsTUFBTTtBQUN6RDtBQUVBLHNCQUFzQixVQUFVLFVBQVUsU0FBUyxRQUFTLFFBQVE7QUFDaEUsTUFBSyxXQUFXLE9BQVMsVUFBUztBQUVwQyxPQUFLLE1BQU0sS0FBSyxVQUFVLEtBQUssS0FBSyxNQUFNO0FBQzVDO0FBRUEsc0JBQXNCLFVBQVUsTUFBTSxTQUFTLElBQUssSUFBSSxRQUFRO0FBQzVELE1BQUssV0FBVyxPQUFTLFVBQVM7QUFFcEMsTUFBSSxLQUFLLFFBQVEsTUFBTSxNQUFNLElBQUk7QUFDL0IsU0FBSyxRQUFRLE1BQU07QUFDbkIsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxzQkFBc0IsVUFBVSxXQUFXLFNBQVMsU0FBVSxLQUFLLFFBQVE7QUFDdkUsTUFBSyxXQUFXLE9BQVMsVUFBUztBQUVwQyxNQUFJLE1BQU0sS0FBSztBQUNmLFdBQVMsSUFBSSxHQUFHLE9BQU8sS0FBSyxJQUFJLEtBQUssUUFBUSxLQUFLLEdBQUc7QUFDbkQsUUFBSSxLQUFLLEtBQUssQ0FBQztBQUViLFFBQUlXLFdBQVUsS0FBSyxHQUFHLEtBQUssTUFBTTtBQUNuQyxRQUFJQSxhQUFZLE1BQU1BLGFBQVksSUFBSTtBQUNwQyxhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sS0FBSyxVQUFVLEtBQUssTUFBTTtBQUFBLEVBQ2xDO0FBQ0EsT0FBSyxNQUFNO0FBQ1gsU0FBTztBQUNUO0FBUUEsS0FBSyxzQkFBc0IsU0FBUyxPQUFPO0FBQ3pDLE1BQUksYUFBYSxNQUFNO0FBQ3ZCLE1BQUksUUFBUSxNQUFNO0FBRWxCLE1BQUksSUFBSTtBQUNSLE1BQUksSUFBSTtBQUVSLFdBQVMsSUFBSSxHQUFHLElBQUksTUFBTSxRQUFRLEtBQUs7QUFDckMsUUFBSSxPQUFPLE1BQU0sT0FBTyxDQUFDO0FBQ3pCLFFBQUksV0FBVyxRQUFRLElBQUksTUFBTSxJQUFJO0FBQ25DLFdBQUssTUFBTSxNQUFNLE9BQU8saUNBQWlDO0FBQUEsSUFDM0Q7QUFDQSxRQUFJLE1BQU0sUUFBUSxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUk7QUFDbkMsV0FBSyxNQUFNLE1BQU0sT0FBTyxtQ0FBbUM7QUFBQSxJQUM3RDtBQUNBLFFBQUksU0FBUyxLQUFLO0FBQUUsVUFBSTtBQUFBLElBQU07QUFDOUIsUUFBSSxTQUFTLEtBQUs7QUFBRSxVQUFJO0FBQUEsSUFBTTtBQUFBLEVBQ2hDO0FBQ0EsTUFBSSxLQUFLLFFBQVEsZUFBZSxNQUFNLEtBQUssR0FBRztBQUM1QyxTQUFLLE1BQU0sTUFBTSxPQUFPLGlDQUFpQztBQUFBLEVBQzNEO0FBQ0Y7QUFFQSxTQUFTLFFBQVEsS0FBSztBQUNwQixXQUFTLEtBQUssS0FBSztBQUFFLFdBQU87QUFBQSxFQUFLO0FBQ2pDLFNBQU87QUFDVDtBQVFBLEtBQUssd0JBQXdCLFNBQVMsT0FBTztBQUMzQyxPQUFLLGVBQWUsS0FBSztBQU96QixNQUFJLENBQUMsTUFBTSxXQUFXLEtBQUssUUFBUSxlQUFlLEtBQUssUUFBUSxNQUFNLFVBQVUsR0FBRztBQUNoRixVQUFNLFVBQVU7QUFDaEIsU0FBSyxlQUFlLEtBQUs7QUFBQSxFQUMzQjtBQUNGO0FBR0EsS0FBSyxpQkFBaUIsU0FBUyxPQUFPO0FBQ3BDLFFBQU0sTUFBTTtBQUNaLFFBQU0sZUFBZTtBQUNyQixRQUFNLGtCQUFrQjtBQUN4QixRQUFNLDhCQUE4QjtBQUNwQyxRQUFNLHFCQUFxQjtBQUMzQixRQUFNLG1CQUFtQjtBQUN6QixRQUFNLGFBQWEsdUJBQU8sT0FBTyxJQUFJO0FBQ3JDLFFBQU0sbUJBQW1CLFNBQVM7QUFDbEMsUUFBTSxXQUFXO0FBRWpCLE9BQUssbUJBQW1CLEtBQUs7QUFFN0IsTUFBSSxNQUFNLFFBQVEsTUFBTSxPQUFPLFFBQVE7QUFFckMsUUFBSSxNQUFNO0FBQUEsTUFBSTtBQUFBO0FBQUEsSUFBWSxHQUFHO0FBQzNCLFlBQU0sTUFBTSxlQUFlO0FBQUEsSUFDN0I7QUFDQSxRQUFJLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZLEtBQUssTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksR0FBRztBQUN0RCxZQUFNLE1BQU0sMEJBQTBCO0FBQUEsSUFDeEM7QUFBQSxFQUNGO0FBQ0EsTUFBSSxNQUFNLG1CQUFtQixNQUFNLG9CQUFvQjtBQUNyRCxVQUFNLE1BQU0sZ0JBQWdCO0FBQUEsRUFDOUI7QUFDQSxXQUFTLElBQUksR0FBRyxPQUFPLE1BQU0sb0JBQW9CLElBQUksS0FBSyxRQUFRLEtBQUssR0FBRztBQUN4RSxRQUFJLE9BQU8sS0FBSyxDQUFDO0FBRWpCLFFBQUksQ0FBQyxNQUFNLFdBQVcsSUFBSSxHQUFHO0FBQzNCLFlBQU0sTUFBTSxrQ0FBa0M7QUFBQSxJQUNoRDtBQUFBLEVBQ0Y7QUFDRjtBQUdBLEtBQUsscUJBQXFCLFNBQVMsT0FBTztBQUN4QyxNQUFJLG1CQUFtQixLQUFLLFFBQVEsZUFBZTtBQUNuRCxNQUFJLGtCQUFrQjtBQUFFLFVBQU0sV0FBVyxJQUFJLFNBQVMsTUFBTSxVQUFVLElBQUk7QUFBQSxFQUFHO0FBQzdFLE9BQUssbUJBQW1CLEtBQUs7QUFDN0IsU0FBTyxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQzlCLFFBQUksa0JBQWtCO0FBQUUsWUFBTSxXQUFXLE1BQU0sU0FBUyxRQUFRO0FBQUEsSUFBRztBQUNuRSxTQUFLLG1CQUFtQixLQUFLO0FBQUEsRUFDL0I7QUFDQSxNQUFJLGtCQUFrQjtBQUFFLFVBQU0sV0FBVyxNQUFNLFNBQVM7QUFBQSxFQUFRO0FBR2hFLE1BQUksS0FBSyxxQkFBcUIsT0FBTyxJQUFJLEdBQUc7QUFDMUMsVUFBTSxNQUFNLG1CQUFtQjtBQUFBLEVBQ2pDO0FBQ0EsTUFBSSxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQzNCLFVBQU0sTUFBTSwwQkFBMEI7QUFBQSxFQUN4QztBQUNGO0FBR0EsS0FBSyxxQkFBcUIsU0FBUyxPQUFPO0FBQ3hDLFNBQU8sTUFBTSxNQUFNLE1BQU0sT0FBTyxVQUFVLEtBQUssZUFBZSxLQUFLLEdBQUc7QUFBQSxFQUFDO0FBQ3pFO0FBR0EsS0FBSyxpQkFBaUIsU0FBUyxPQUFPO0FBQ3BDLE1BQUksS0FBSyxvQkFBb0IsS0FBSyxHQUFHO0FBSW5DLFFBQUksTUFBTSwrQkFBK0IsS0FBSyxxQkFBcUIsS0FBSyxHQUFHO0FBRXpFLFVBQUksTUFBTSxTQUFTO0FBQ2pCLGNBQU0sTUFBTSxvQkFBb0I7QUFBQSxNQUNsQztBQUFBLElBQ0Y7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksTUFBTSxVQUFVLEtBQUssZUFBZSxLQUFLLElBQUksS0FBSyx1QkFBdUIsS0FBSyxHQUFHO0FBQ25GLFNBQUsscUJBQXFCLEtBQUs7QUFDL0IsV0FBTztBQUFBLEVBQ1Q7QUFFQSxTQUFPO0FBQ1Q7QUFHQSxLQUFLLHNCQUFzQixTQUFTLE9BQU87QUFDekMsTUFBSVgsU0FBUSxNQUFNO0FBQ2xCLFFBQU0sOEJBQThCO0FBR3BDLE1BQUksTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksS0FBSyxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQ3RELFdBQU87QUFBQSxFQUNUO0FBR0EsTUFBSSxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQzNCLFFBQUksTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksS0FBSyxNQUFNO0FBQUEsTUFBSTtBQUFBO0FBQUEsSUFBWSxHQUFHO0FBQ3RELGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTSxNQUFNQTtBQUFBLEVBQ2Q7QUFHQSxNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEtBQUssTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksR0FBRztBQUN0RCxRQUFJLGFBQWE7QUFDakIsUUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQ2pDLG1CQUFhLE1BQU07QUFBQSxRQUFJO0FBQUE7QUFBQSxNQUFZO0FBQUEsSUFDckM7QUFDQSxRQUFJLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZLEtBQUssTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksR0FBRztBQUN0RCxXQUFLLG1CQUFtQixLQUFLO0FBQzdCLFVBQUksQ0FBQyxNQUFNO0FBQUEsUUFBSTtBQUFBO0FBQUEsTUFBWSxHQUFHO0FBQzVCLGNBQU0sTUFBTSxvQkFBb0I7QUFBQSxNQUNsQztBQUNBLFlBQU0sOEJBQThCLENBQUM7QUFDckMsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBRUEsUUFBTSxNQUFNQTtBQUNaLFNBQU87QUFDVDtBQUdBLEtBQUssdUJBQXVCLFNBQVMsT0FBTyxTQUFTO0FBQ25ELE1BQUssWUFBWSxPQUFTLFdBQVU7QUFFcEMsTUFBSSxLQUFLLDJCQUEyQixPQUFPLE9BQU8sR0FBRztBQUNuRCxVQUFNO0FBQUEsTUFBSTtBQUFBO0FBQUEsSUFBWTtBQUN0QixXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUdBLEtBQUssNkJBQTZCLFNBQVMsT0FBTyxTQUFTO0FBQ3pELFNBQ0UsTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksS0FDdEIsTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksS0FDdEIsTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksS0FDdEIsS0FBSywyQkFBMkIsT0FBTyxPQUFPO0FBRWxEO0FBQ0EsS0FBSyw2QkFBNkIsU0FBUyxPQUFPLFNBQVM7QUFDekQsTUFBSUEsU0FBUSxNQUFNO0FBQ2xCLE1BQUksTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksR0FBRztBQUMzQixRQUFJLE1BQU0sR0FBRyxNQUFNO0FBQ25CLFFBQUksS0FBSyx3QkFBd0IsS0FBSyxHQUFHO0FBQ3ZDLFlBQU0sTUFBTTtBQUNaLFVBQUksTUFBTTtBQUFBLFFBQUk7QUFBQTtBQUFBLE1BQVksS0FBSyxLQUFLLHdCQUF3QixLQUFLLEdBQUc7QUFDbEUsY0FBTSxNQUFNO0FBQUEsTUFDZDtBQUNBLFVBQUksTUFBTTtBQUFBLFFBQUk7QUFBQTtBQUFBLE1BQVksR0FBRztBQUUzQixZQUFJLFFBQVEsTUFBTSxNQUFNLE9BQU8sQ0FBQyxTQUFTO0FBQ3ZDLGdCQUFNLE1BQU0sdUNBQXVDO0FBQUEsUUFDckQ7QUFDQSxlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFDQSxRQUFJLE1BQU0sV0FBVyxDQUFDLFNBQVM7QUFDN0IsWUFBTSxNQUFNLHVCQUF1QjtBQUFBLElBQ3JDO0FBQ0EsVUFBTSxNQUFNQTtBQUFBLEVBQ2Q7QUFDQSxTQUFPO0FBQ1Q7QUFHQSxLQUFLLGlCQUFpQixTQUFTLE9BQU87QUFDcEMsU0FDRSxLQUFLLDRCQUE0QixLQUFLLEtBQ3RDLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEtBQ3RCLEtBQUssbUNBQW1DLEtBQUssS0FDN0MsS0FBSyx5QkFBeUIsS0FBSyxLQUNuQyxLQUFLLDJCQUEyQixLQUFLLEtBQ3JDLEtBQUsseUJBQXlCLEtBQUs7QUFFdkM7QUFDQSxLQUFLLHFDQUFxQyxTQUFTLE9BQU87QUFDeEQsTUFBSUEsU0FBUSxNQUFNO0FBQ2xCLE1BQUksTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksR0FBRztBQUMzQixRQUFJLEtBQUsscUJBQXFCLEtBQUssR0FBRztBQUNwQyxhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sTUFBTUE7QUFBQSxFQUNkO0FBQ0EsU0FBTztBQUNUO0FBQ0EsS0FBSyw2QkFBNkIsU0FBUyxPQUFPO0FBQ2hELE1BQUlBLFNBQVEsTUFBTTtBQUNsQixNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxNQUFNO0FBQUEsTUFBSTtBQUFBO0FBQUEsSUFBWSxHQUFHO0FBQzNCLFVBQUksS0FBSyxRQUFRLGVBQWUsSUFBSTtBQUNsQyxZQUFJLGVBQWUsS0FBSyxvQkFBb0IsS0FBSztBQUNqRCxZQUFJLFlBQVksTUFBTTtBQUFBLFVBQUk7QUFBQTtBQUFBLFFBQVk7QUFDdEMsWUFBSSxnQkFBZ0IsV0FBVztBQUM3QixtQkFBUyxJQUFJLEdBQUcsSUFBSSxhQUFhLFFBQVEsS0FBSztBQUM1QyxnQkFBSSxXQUFXLGFBQWEsT0FBTyxDQUFDO0FBQ3BDLGdCQUFJLGFBQWEsUUFBUSxVQUFVLElBQUksQ0FBQyxJQUFJLElBQUk7QUFDOUMsb0JBQU0sTUFBTSx3Q0FBd0M7QUFBQSxZQUN0RDtBQUFBLFVBQ0Y7QUFDQSxjQUFJLFdBQVc7QUFDYixnQkFBSSxrQkFBa0IsS0FBSyxvQkFBb0IsS0FBSztBQUNwRCxnQkFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixNQUFNLFFBQVEsTUFBTSxJQUFjO0FBQ3pFLG9CQUFNLE1BQU0sc0NBQXNDO0FBQUEsWUFDcEQ7QUFDQSxxQkFBUyxNQUFNLEdBQUcsTUFBTSxnQkFBZ0IsUUFBUSxPQUFPO0FBQ3JELGtCQUFJLGFBQWEsZ0JBQWdCLE9BQU8sR0FBRztBQUMzQyxrQkFDRSxnQkFBZ0IsUUFBUSxZQUFZLE1BQU0sQ0FBQyxJQUFJLE1BQy9DLGFBQWEsUUFBUSxVQUFVLElBQUksSUFDbkM7QUFDQSxzQkFBTSxNQUFNLHdDQUF3QztBQUFBLGNBQ3REO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUNBLFVBQUksTUFBTTtBQUFBLFFBQUk7QUFBQTtBQUFBLE1BQVksR0FBRztBQUMzQixhQUFLLG1CQUFtQixLQUFLO0FBQzdCLFlBQUksTUFBTTtBQUFBLFVBQUk7QUFBQTtBQUFBLFFBQVksR0FBRztBQUMzQixpQkFBTztBQUFBLFFBQ1Q7QUFDQSxjQUFNLE1BQU0sb0JBQW9CO0FBQUEsTUFDbEM7QUFBQSxJQUNGO0FBQ0EsVUFBTSxNQUFNQTtBQUFBLEVBQ2Q7QUFDQSxTQUFPO0FBQ1Q7QUFDQSxLQUFLLDJCQUEyQixTQUFTLE9BQU87QUFDOUMsTUFBSSxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQzNCLFFBQUksS0FBSyxRQUFRLGVBQWUsR0FBRztBQUNqQyxXQUFLLHNCQUFzQixLQUFLO0FBQUEsSUFDbEMsV0FBVyxNQUFNLFFBQVEsTUFBTSxJQUFjO0FBQzNDLFlBQU0sTUFBTSxlQUFlO0FBQUEsSUFDN0I7QUFDQSxTQUFLLG1CQUFtQixLQUFLO0FBQzdCLFFBQUksTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksR0FBRztBQUMzQixZQUFNLHNCQUFzQjtBQUM1QixhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sTUFBTSxvQkFBb0I7QUFBQSxFQUNsQztBQUNBLFNBQU87QUFDVDtBQUlBLEtBQUssc0JBQXNCLFNBQVMsT0FBTztBQUN6QyxNQUFJLFlBQVk7QUFDaEIsTUFBSSxLQUFLO0FBQ1QsVUFBUSxLQUFLLE1BQU0sUUFBUSxPQUFPLE1BQU0sNEJBQTRCLEVBQUUsR0FBRztBQUN2RSxpQkFBYSxrQkFBa0IsRUFBRTtBQUNqQyxVQUFNLFFBQVE7QUFBQSxFQUNoQjtBQUNBLFNBQU87QUFDVDtBQUdBLFNBQVMsNEJBQTRCLElBQUk7QUFDdkMsU0FBTyxPQUFPLE9BQWdCLE9BQU8sT0FBZ0IsT0FBTztBQUM5RDtBQUdBLEtBQUsseUJBQXlCLFNBQVMsT0FBTztBQUM1QyxTQUNFLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEtBQ3RCLEtBQUssbUNBQW1DLEtBQUssS0FDN0MsS0FBSyx5QkFBeUIsS0FBSyxLQUNuQyxLQUFLLDJCQUEyQixLQUFLLEtBQ3JDLEtBQUsseUJBQXlCLEtBQUssS0FDbkMsS0FBSyxrQ0FBa0MsS0FBSyxLQUM1QyxLQUFLLG1DQUFtQyxLQUFLO0FBRWpEO0FBR0EsS0FBSyxvQ0FBb0MsU0FBUyxPQUFPO0FBQ3ZELE1BQUksS0FBSywyQkFBMkIsT0FBTyxJQUFJLEdBQUc7QUFDaEQsVUFBTSxNQUFNLG1CQUFtQjtBQUFBLEVBQ2pDO0FBQ0EsU0FBTztBQUNUO0FBR0EsS0FBSyw0QkFBNEIsU0FBUyxPQUFPO0FBQy9DLE1BQUksS0FBSyxNQUFNLFFBQVE7QUFDdkIsTUFBSSxrQkFBa0IsRUFBRSxHQUFHO0FBQ3pCLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUNBLFNBQVMsa0JBQWtCLElBQUk7QUFDN0IsU0FDRSxPQUFPLE1BQ1AsTUFBTSxNQUFnQixNQUFNLE1BQzVCLE9BQU8sTUFDUCxPQUFPLE1BQ1AsTUFBTSxNQUFnQixNQUFNLE1BQzVCLE1BQU0sT0FBZ0IsTUFBTTtBQUVoQztBQUlBLEtBQUssOEJBQThCLFNBQVMsT0FBTztBQUNqRCxNQUFJQSxTQUFRLE1BQU07QUFDbEIsTUFBSSxLQUFLO0FBQ1QsVUFBUSxLQUFLLE1BQU0sUUFBUSxPQUFPLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxHQUFHO0FBQzlELFVBQU0sUUFBUTtBQUFBLEVBQ2hCO0FBQ0EsU0FBTyxNQUFNLFFBQVFBO0FBQ3ZCO0FBR0EsS0FBSyxxQ0FBcUMsU0FBUyxPQUFPO0FBQ3hELE1BQUksS0FBSyxNQUFNLFFBQVE7QUFDdkIsTUFDRSxPQUFPLE1BQ1AsT0FBTyxNQUNQLEVBQUUsTUFBTSxNQUFnQixNQUFNLE9BQzlCLE9BQU8sTUFDUCxPQUFPLE1BQ1AsT0FBTyxNQUNQLE9BQU8sTUFDUCxPQUFPLEtBQ1A7QUFDQSxVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUtBLEtBQUssd0JBQXdCLFNBQVMsT0FBTztBQUMzQyxNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxDQUFDLEtBQUssb0JBQW9CLEtBQUssR0FBRztBQUFFLFlBQU0sTUFBTSxlQUFlO0FBQUEsSUFBRztBQUN0RSxRQUFJLG1CQUFtQixLQUFLLFFBQVEsZUFBZTtBQUNuRCxRQUFJLFFBQVEsTUFBTSxXQUFXLE1BQU0sZUFBZTtBQUNsRCxRQUFJLE9BQU87QUFDVCxVQUFJLGtCQUFrQjtBQUNwQixpQkFBUyxJQUFJLEdBQUcsT0FBTyxPQUFPLElBQUksS0FBSyxRQUFRLEtBQUssR0FBRztBQUNyRCxjQUFJLFFBQVEsS0FBSyxDQUFDO0FBRWxCLGNBQUksQ0FBQyxNQUFNLGNBQWMsTUFBTSxRQUFRLEdBQ3JDO0FBQUUsa0JBQU0sTUFBTSw4QkFBOEI7QUFBQSxVQUFHO0FBQUEsUUFDbkQ7QUFBQSxNQUNGLE9BQU87QUFDTCxjQUFNLE1BQU0sOEJBQThCO0FBQUEsTUFDNUM7QUFBQSxJQUNGO0FBQ0EsUUFBSSxrQkFBa0I7QUFDcEIsT0FBQyxVQUFVLE1BQU0sV0FBVyxNQUFNLGVBQWUsSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLFFBQVE7QUFBQSxJQUMvRSxPQUFPO0FBQ0wsWUFBTSxXQUFXLE1BQU0sZUFBZSxJQUFJO0FBQUEsSUFDNUM7QUFBQSxFQUNGO0FBQ0Y7QUFLQSxLQUFLLHNCQUFzQixTQUFTLE9BQU87QUFDekMsUUFBTSxrQkFBa0I7QUFDeEIsTUFBSSxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQzNCLFFBQUksS0FBSywrQkFBK0IsS0FBSyxLQUFLLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZLEdBQUc7QUFDekUsYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLE1BQU0sNEJBQTRCO0FBQUEsRUFDMUM7QUFDQSxTQUFPO0FBQ1Q7QUFNQSxLQUFLLGlDQUFpQyxTQUFTLE9BQU87QUFDcEQsUUFBTSxrQkFBa0I7QUFDeEIsTUFBSSxLQUFLLGdDQUFnQyxLQUFLLEdBQUc7QUFDL0MsVUFBTSxtQkFBbUIsa0JBQWtCLE1BQU0sWUFBWTtBQUM3RCxXQUFPLEtBQUssK0JBQStCLEtBQUssR0FBRztBQUNqRCxZQUFNLG1CQUFtQixrQkFBa0IsTUFBTSxZQUFZO0FBQUEsSUFDL0Q7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQU9BLEtBQUssa0NBQWtDLFNBQVMsT0FBTztBQUNyRCxNQUFJQSxTQUFRLE1BQU07QUFDbEIsTUFBSSxTQUFTLEtBQUssUUFBUSxlQUFlO0FBQ3pDLE1BQUksS0FBSyxNQUFNLFFBQVEsTUFBTTtBQUM3QixRQUFNLFFBQVEsTUFBTTtBQUVwQixNQUFJLE9BQU8sTUFBZ0IsS0FBSyxzQ0FBc0MsT0FBTyxNQUFNLEdBQUc7QUFDcEYsU0FBSyxNQUFNO0FBQUEsRUFDYjtBQUNBLE1BQUksd0JBQXdCLEVBQUUsR0FBRztBQUMvQixVQUFNLGVBQWU7QUFDckIsV0FBTztBQUFBLEVBQ1Q7QUFFQSxRQUFNLE1BQU1BO0FBQ1osU0FBTztBQUNUO0FBQ0EsU0FBUyx3QkFBd0IsSUFBSTtBQUNuQyxTQUFPLGtCQUFrQixJQUFJLElBQUksS0FBSyxPQUFPLE1BQWdCLE9BQU87QUFDdEU7QUFTQSxLQUFLLGlDQUFpQyxTQUFTLE9BQU87QUFDcEQsTUFBSUEsU0FBUSxNQUFNO0FBQ2xCLE1BQUksU0FBUyxLQUFLLFFBQVEsZUFBZTtBQUN6QyxNQUFJLEtBQUssTUFBTSxRQUFRLE1BQU07QUFDN0IsUUFBTSxRQUFRLE1BQU07QUFFcEIsTUFBSSxPQUFPLE1BQWdCLEtBQUssc0NBQXNDLE9BQU8sTUFBTSxHQUFHO0FBQ3BGLFNBQUssTUFBTTtBQUFBLEVBQ2I7QUFDQSxNQUFJLHVCQUF1QixFQUFFLEdBQUc7QUFDOUIsVUFBTSxlQUFlO0FBQ3JCLFdBQU87QUFBQSxFQUNUO0FBRUEsUUFBTSxNQUFNQTtBQUNaLFNBQU87QUFDVDtBQUNBLFNBQVMsdUJBQXVCLElBQUk7QUFDbEMsU0FBTyxpQkFBaUIsSUFBSSxJQUFJLEtBQUssT0FBTyxNQUFnQixPQUFPLE1BQWdCLE9BQU8sUUFBdUIsT0FBTztBQUMxSDtBQUdBLEtBQUssdUJBQXVCLFNBQVMsT0FBTztBQUMxQyxNQUNFLEtBQUssd0JBQXdCLEtBQUssS0FDbEMsS0FBSywrQkFBK0IsS0FBSyxLQUN6QyxLQUFLLDBCQUEwQixLQUFLLEtBQ25DLE1BQU0sV0FBVyxLQUFLLHFCQUFxQixLQUFLLEdBQ2pEO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFDQSxNQUFJLE1BQU0sU0FBUztBQUVqQixRQUFJLE1BQU0sUUFBUSxNQUFNLElBQWM7QUFDcEMsWUFBTSxNQUFNLHdCQUF3QjtBQUFBLElBQ3RDO0FBQ0EsVUFBTSxNQUFNLGdCQUFnQjtBQUFBLEVBQzlCO0FBQ0EsU0FBTztBQUNUO0FBQ0EsS0FBSywwQkFBMEIsU0FBUyxPQUFPO0FBQzdDLE1BQUlBLFNBQVEsTUFBTTtBQUNsQixNQUFJLEtBQUssd0JBQXdCLEtBQUssR0FBRztBQUN2QyxRQUFJLElBQUksTUFBTTtBQUNkLFFBQUksTUFBTSxTQUFTO0FBRWpCLFVBQUksSUFBSSxNQUFNLGtCQUFrQjtBQUM5QixjQUFNLG1CQUFtQjtBQUFBLE1BQzNCO0FBQ0EsYUFBTztBQUFBLElBQ1Q7QUFDQSxRQUFJLEtBQUssTUFBTSxvQkFBb0I7QUFDakMsYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLE1BQU1BO0FBQUEsRUFDZDtBQUNBLFNBQU87QUFDVDtBQUNBLEtBQUssdUJBQXVCLFNBQVMsT0FBTztBQUMxQyxNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxLQUFLLG9CQUFvQixLQUFLLEdBQUc7QUFDbkMsWUFBTSxtQkFBbUIsS0FBSyxNQUFNLGVBQWU7QUFDbkQsYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLE1BQU0seUJBQXlCO0FBQUEsRUFDdkM7QUFDQSxTQUFPO0FBQ1Q7QUFHQSxLQUFLLDRCQUE0QixTQUFTLE9BQU87QUFDL0MsU0FDRSxLQUFLLHdCQUF3QixLQUFLLEtBQ2xDLEtBQUsseUJBQXlCLEtBQUssS0FDbkMsS0FBSyxlQUFlLEtBQUssS0FDekIsS0FBSyw0QkFBNEIsS0FBSyxLQUN0QyxLQUFLLHNDQUFzQyxPQUFPLEtBQUssS0FDdEQsQ0FBQyxNQUFNLFdBQVcsS0FBSyxvQ0FBb0MsS0FBSyxLQUNqRSxLQUFLLHlCQUF5QixLQUFLO0FBRXZDO0FBQ0EsS0FBSywyQkFBMkIsU0FBUyxPQUFPO0FBQzlDLE1BQUlBLFNBQVEsTUFBTTtBQUNsQixNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxLQUFLLHdCQUF3QixLQUFLLEdBQUc7QUFDdkMsYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLE1BQU1BO0FBQUEsRUFDZDtBQUNBLFNBQU87QUFDVDtBQUNBLEtBQUssaUJBQWlCLFNBQVMsT0FBTztBQUNwQyxNQUFJLE1BQU0sUUFBUSxNQUFNLE1BQWdCLENBQUMsZUFBZSxNQUFNLFVBQVUsQ0FBQyxHQUFHO0FBQzFFLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUdBLEtBQUssMEJBQTBCLFNBQVMsT0FBTztBQUM3QyxNQUFJLEtBQUssTUFBTSxRQUFRO0FBQ3ZCLE1BQUksT0FBTyxLQUFjO0FBQ3ZCLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksT0FBTyxLQUFjO0FBQ3ZCLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksT0FBTyxLQUFjO0FBQ3ZCLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksT0FBTyxLQUFjO0FBQ3ZCLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksT0FBTyxLQUFjO0FBQ3ZCLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUdBLEtBQUssMEJBQTBCLFNBQVMsT0FBTztBQUM3QyxNQUFJLEtBQUssTUFBTSxRQUFRO0FBQ3ZCLE1BQUksZ0JBQWdCLEVBQUUsR0FBRztBQUN2QixVQUFNLGVBQWUsS0FBSztBQUMxQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUNBLFNBQVMsZ0JBQWdCLElBQUk7QUFDM0IsU0FDRyxNQUFNLE1BQWdCLE1BQU0sTUFDNUIsTUFBTSxNQUFnQixNQUFNO0FBRWpDO0FBR0EsS0FBSyx3Q0FBd0MsU0FBUyxPQUFPLFFBQVE7QUFDbkUsTUFBSyxXQUFXLE9BQVMsVUFBUztBQUVsQyxNQUFJQSxTQUFRLE1BQU07QUFDbEIsTUFBSSxVQUFVLFVBQVUsTUFBTTtBQUU5QixNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxLQUFLLHlCQUF5QixPQUFPLENBQUMsR0FBRztBQUMzQyxVQUFJLE9BQU8sTUFBTTtBQUNqQixVQUFJLFdBQVcsUUFBUSxTQUFVLFFBQVEsT0FBUTtBQUMvQyxZQUFJLG1CQUFtQixNQUFNO0FBQzdCLFlBQUksTUFBTTtBQUFBLFVBQUk7QUFBQTtBQUFBLFFBQVksS0FBSyxNQUFNO0FBQUEsVUFBSTtBQUFBO0FBQUEsUUFBWSxLQUFLLEtBQUsseUJBQXlCLE9BQU8sQ0FBQyxHQUFHO0FBQ2pHLGNBQUksUUFBUSxNQUFNO0FBQ2xCLGNBQUksU0FBUyxTQUFVLFNBQVMsT0FBUTtBQUN0QyxrQkFBTSxnQkFBZ0IsT0FBTyxTQUFVLFFBQVMsUUFBUSxTQUFVO0FBQ2xFLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFDQSxjQUFNLE1BQU07QUFDWixjQUFNLGVBQWU7QUFBQSxNQUN2QjtBQUNBLGFBQU87QUFBQSxJQUNUO0FBQ0EsUUFDRSxXQUNBLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZLEtBQ3RCLEtBQUssb0JBQW9CLEtBQUssS0FDOUIsTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksS0FDdEIsZUFBZSxNQUFNLFlBQVksR0FDakM7QUFDQSxhQUFPO0FBQUEsSUFDVDtBQUNBLFFBQUksU0FBUztBQUNYLFlBQU0sTUFBTSx3QkFBd0I7QUFBQSxJQUN0QztBQUNBLFVBQU0sTUFBTUE7QUFBQSxFQUNkO0FBRUEsU0FBTztBQUNUO0FBQ0EsU0FBUyxlQUFlLElBQUk7QUFDMUIsU0FBTyxNQUFNLEtBQUssTUFBTTtBQUMxQjtBQUdBLEtBQUssMkJBQTJCLFNBQVMsT0FBTztBQUM5QyxNQUFJLE1BQU0sU0FBUztBQUNqQixRQUFJLEtBQUssMEJBQTBCLEtBQUssR0FBRztBQUN6QyxhQUFPO0FBQUEsSUFDVDtBQUNBLFFBQUksTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksR0FBRztBQUMzQixZQUFNLGVBQWU7QUFDckIsYUFBTztBQUFBLElBQ1Q7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksS0FBSyxNQUFNLFFBQVE7QUFDdkIsTUFBSSxPQUFPLE9BQWlCLENBQUMsTUFBTSxXQUFXLE9BQU8sTUFBZTtBQUNsRSxVQUFNLGVBQWU7QUFDckIsVUFBTSxRQUFRO0FBQ2QsV0FBTztBQUFBLEVBQ1Q7QUFFQSxTQUFPO0FBQ1Q7QUFHQSxLQUFLLDBCQUEwQixTQUFTLE9BQU87QUFDN0MsUUFBTSxlQUFlO0FBQ3JCLE1BQUksS0FBSyxNQUFNLFFBQVE7QUFDdkIsTUFBSSxNQUFNLE1BQWdCLE1BQU0sSUFBYztBQUM1QyxPQUFHO0FBQ0QsWUFBTSxlQUFlLEtBQUssTUFBTSxnQkFBZ0IsS0FBSztBQUNyRCxZQUFNLFFBQVE7QUFBQSxJQUNoQixVQUFVLEtBQUssTUFBTSxRQUFRLE1BQU0sTUFBZ0IsTUFBTTtBQUN6RCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQUlBLElBQUksY0FBYztBQUNsQixJQUFJLFlBQVk7QUFDaEIsSUFBSSxnQkFBZ0I7QUFHcEIsS0FBSyxpQ0FBaUMsU0FBUyxPQUFPO0FBQ3BELE1BQUksS0FBSyxNQUFNLFFBQVE7QUFFdkIsTUFBSSx1QkFBdUIsRUFBRSxHQUFHO0FBQzlCLFVBQU0sZUFBZTtBQUNyQixVQUFNLFFBQVE7QUFDZCxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksU0FBUztBQUNiLE1BQ0UsTUFBTSxXQUNOLEtBQUssUUFBUSxlQUFlLE9BQzFCLFNBQVMsT0FBTyxPQUFpQixPQUFPLE1BQzFDO0FBQ0EsVUFBTSxlQUFlO0FBQ3JCLFVBQU0sUUFBUTtBQUNkLFFBQUk7QUFDSixRQUNFLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZLE1BQ3JCLFNBQVMsS0FBSyx5Q0FBeUMsS0FBSyxNQUM3RCxNQUFNO0FBQUEsTUFBSTtBQUFBO0FBQUEsSUFBWSxHQUN0QjtBQUNBLFVBQUksVUFBVSxXQUFXLGVBQWU7QUFBRSxjQUFNLE1BQU0sdUJBQXVCO0FBQUEsTUFBRztBQUNoRixhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sTUFBTSx1QkFBdUI7QUFBQSxFQUNyQztBQUVBLFNBQU87QUFDVDtBQUVBLFNBQVMsdUJBQXVCLElBQUk7QUFDbEMsU0FDRSxPQUFPLE9BQ1AsT0FBTyxNQUNQLE9BQU8sT0FDUCxPQUFPLE1BQ1AsT0FBTyxPQUNQLE9BQU87QUFFWDtBQUtBLEtBQUssMkNBQTJDLFNBQVMsT0FBTztBQUM5RCxNQUFJQSxTQUFRLE1BQU07QUFHbEIsTUFBSSxLQUFLLDhCQUE4QixLQUFLLEtBQUssTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksR0FBRztBQUN4RSxRQUFJLE9BQU8sTUFBTTtBQUNqQixRQUFJLEtBQUssK0JBQStCLEtBQUssR0FBRztBQUM5QyxVQUFJLFFBQVEsTUFBTTtBQUNsQixXQUFLLDJDQUEyQyxPQUFPLE1BQU0sS0FBSztBQUNsRSxhQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFDQSxRQUFNLE1BQU1BO0FBR1osTUFBSSxLQUFLLHlDQUF5QyxLQUFLLEdBQUc7QUFDeEQsUUFBSSxjQUFjLE1BQU07QUFDeEIsV0FBTyxLQUFLLDBDQUEwQyxPQUFPLFdBQVc7QUFBQSxFQUMxRTtBQUNBLFNBQU87QUFDVDtBQUVBLEtBQUssNkNBQTZDLFNBQVMsT0FBTyxNQUFNLE9BQU87QUFDN0UsTUFBSSxDQUFDLE9BQU8sTUFBTSxrQkFBa0IsV0FBVyxJQUFJLEdBQ2pEO0FBQUUsVUFBTSxNQUFNLHVCQUF1QjtBQUFBLEVBQUc7QUFDMUMsTUFBSSxDQUFDLE1BQU0sa0JBQWtCLFVBQVUsSUFBSSxFQUFFLEtBQUssS0FBSyxHQUNyRDtBQUFFLFVBQU0sTUFBTSx3QkFBd0I7QUFBQSxFQUFHO0FBQzdDO0FBRUEsS0FBSyw0Q0FBNEMsU0FBUyxPQUFPLGFBQWE7QUFDNUUsTUFBSSxNQUFNLGtCQUFrQixPQUFPLEtBQUssV0FBVyxHQUFHO0FBQUUsV0FBTztBQUFBLEVBQVU7QUFDekUsTUFBSSxNQUFNLFdBQVcsTUFBTSxrQkFBa0IsZ0JBQWdCLEtBQUssV0FBVyxHQUFHO0FBQUUsV0FBTztBQUFBLEVBQWM7QUFDdkcsUUFBTSxNQUFNLHVCQUF1QjtBQUNyQztBQUlBLEtBQUssZ0NBQWdDLFNBQVMsT0FBTztBQUNuRCxNQUFJLEtBQUs7QUFDVCxRQUFNLGtCQUFrQjtBQUN4QixTQUFPLCtCQUErQixLQUFLLE1BQU0sUUFBUSxDQUFDLEdBQUc7QUFDM0QsVUFBTSxtQkFBbUIsa0JBQWtCLEVBQUU7QUFDN0MsVUFBTSxRQUFRO0FBQUEsRUFDaEI7QUFDQSxTQUFPLE1BQU0sb0JBQW9CO0FBQ25DO0FBRUEsU0FBUywrQkFBK0IsSUFBSTtBQUMxQyxTQUFPLGdCQUFnQixFQUFFLEtBQUssT0FBTztBQUN2QztBQUlBLEtBQUssaUNBQWlDLFNBQVMsT0FBTztBQUNwRCxNQUFJLEtBQUs7QUFDVCxRQUFNLGtCQUFrQjtBQUN4QixTQUFPLGdDQUFnQyxLQUFLLE1BQU0sUUFBUSxDQUFDLEdBQUc7QUFDNUQsVUFBTSxtQkFBbUIsa0JBQWtCLEVBQUU7QUFDN0MsVUFBTSxRQUFRO0FBQUEsRUFDaEI7QUFDQSxTQUFPLE1BQU0sb0JBQW9CO0FBQ25DO0FBQ0EsU0FBUyxnQ0FBZ0MsSUFBSTtBQUMzQyxTQUFPLCtCQUErQixFQUFFLEtBQUssZUFBZSxFQUFFO0FBQ2hFO0FBSUEsS0FBSywyQ0FBMkMsU0FBUyxPQUFPO0FBQzlELFNBQU8sS0FBSywrQkFBK0IsS0FBSztBQUNsRDtBQUdBLEtBQUssMkJBQTJCLFNBQVMsT0FBTztBQUM5QyxNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxTQUFTLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZO0FBQ25DLFFBQUksU0FBUyxLQUFLLHFCQUFxQixLQUFLO0FBQzVDLFFBQUksQ0FBQyxNQUFNO0FBQUEsTUFBSTtBQUFBO0FBQUEsSUFBWSxHQUN6QjtBQUFFLFlBQU0sTUFBTSw4QkFBOEI7QUFBQSxJQUFHO0FBQ2pELFFBQUksVUFBVSxXQUFXLGVBQ3ZCO0FBQUUsWUFBTSxNQUFNLDZDQUE2QztBQUFBLElBQUc7QUFDaEUsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7QUFJQSxLQUFLLHVCQUF1QixTQUFTLE9BQU87QUFDMUMsTUFBSSxNQUFNLFFBQVEsTUFBTSxJQUFjO0FBQUUsV0FBTztBQUFBLEVBQVU7QUFDekQsTUFBSSxNQUFNLFNBQVM7QUFBRSxXQUFPLEtBQUssMEJBQTBCLEtBQUs7QUFBQSxFQUFFO0FBQ2xFLE9BQUssMkJBQTJCLEtBQUs7QUFDckMsU0FBTztBQUNUO0FBSUEsS0FBSyw2QkFBNkIsU0FBUyxPQUFPO0FBQ2hELFNBQU8sS0FBSyxvQkFBb0IsS0FBSyxHQUFHO0FBQ3RDLFFBQUksT0FBTyxNQUFNO0FBQ2pCLFFBQUksTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksS0FBSyxLQUFLLG9CQUFvQixLQUFLLEdBQUc7QUFDOUQsVUFBSSxRQUFRLE1BQU07QUFDbEIsVUFBSSxNQUFNLFlBQVksU0FBUyxNQUFNLFVBQVUsS0FBSztBQUNsRCxjQUFNLE1BQU0seUJBQXlCO0FBQUEsTUFDdkM7QUFDQSxVQUFJLFNBQVMsTUFBTSxVQUFVLE1BQU0sT0FBTyxPQUFPO0FBQy9DLGNBQU0sTUFBTSx1Q0FBdUM7QUFBQSxNQUNyRDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFJQSxLQUFLLHNCQUFzQixTQUFTLE9BQU87QUFDekMsTUFBSUEsU0FBUSxNQUFNO0FBRWxCLE1BQUksTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksR0FBRztBQUMzQixRQUFJLEtBQUssc0JBQXNCLEtBQUssR0FBRztBQUNyQyxhQUFPO0FBQUEsSUFDVDtBQUNBLFFBQUksTUFBTSxTQUFTO0FBRWpCLFVBQUksT0FBTyxNQUFNLFFBQVE7QUFDekIsVUFBSSxTQUFTLE1BQWdCLGFBQWEsSUFBSSxHQUFHO0FBQy9DLGNBQU0sTUFBTSxzQkFBc0I7QUFBQSxNQUNwQztBQUNBLFlBQU0sTUFBTSxnQkFBZ0I7QUFBQSxJQUM5QjtBQUNBLFVBQU0sTUFBTUE7QUFBQSxFQUNkO0FBRUEsTUFBSSxLQUFLLE1BQU0sUUFBUTtBQUN2QixNQUFJLE9BQU8sSUFBYztBQUN2QixVQUFNLGVBQWU7QUFDckIsVUFBTSxRQUFRO0FBQ2QsV0FBTztBQUFBLEVBQ1Q7QUFFQSxTQUFPO0FBQ1Q7QUFHQSxLQUFLLHdCQUF3QixTQUFTLE9BQU87QUFDM0MsTUFBSUEsU0FBUSxNQUFNO0FBRWxCLE1BQUksTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksR0FBRztBQUMzQixVQUFNLGVBQWU7QUFDckIsV0FBTztBQUFBLEVBQ1Q7QUFFQSxNQUFJLE1BQU0sV0FBVyxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQzVDLFVBQU0sZUFBZTtBQUNyQixXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksQ0FBQyxNQUFNLFdBQVcsTUFBTTtBQUFBLElBQUk7QUFBQTtBQUFBLEVBQVksR0FBRztBQUM3QyxRQUFJLEtBQUssNkJBQTZCLEtBQUssR0FBRztBQUM1QyxhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sTUFBTUE7QUFBQSxFQUNkO0FBRUEsU0FDRSxLQUFLLCtCQUErQixLQUFLLEtBQ3pDLEtBQUssMEJBQTBCLEtBQUs7QUFFeEM7QUFNQSxLQUFLLDRCQUE0QixTQUFTLE9BQU87QUFDL0MsTUFBSSxTQUFTLFdBQVc7QUFDeEIsTUFBSSxLQUFLLHdCQUF3QixLQUFLLEVBQUc7QUFBQSxXQUFXLFlBQVksS0FBSywwQkFBMEIsS0FBSyxHQUFHO0FBQ3JHLFFBQUksY0FBYyxlQUFlO0FBQUUsZUFBUztBQUFBLElBQWU7QUFFM0QsUUFBSUEsU0FBUSxNQUFNO0FBQ2xCLFdBQU8sTUFBTTtBQUFBLE1BQVMsQ0FBQyxJQUFNLEVBQUk7QUFBQTtBQUFBLElBQVUsR0FBRztBQUM1QyxVQUNFLE1BQU0sUUFBUSxNQUFNLE9BQ25CLFlBQVksS0FBSywwQkFBMEIsS0FBSyxJQUNqRDtBQUNBLFlBQUksY0FBYyxlQUFlO0FBQUUsbUJBQVM7QUFBQSxRQUFXO0FBQ3ZEO0FBQUEsTUFDRjtBQUNBLFlBQU0sTUFBTSxzQ0FBc0M7QUFBQSxJQUNwRDtBQUNBLFFBQUlBLFdBQVUsTUFBTSxLQUFLO0FBQUUsYUFBTztBQUFBLElBQU87QUFFekMsV0FBTyxNQUFNO0FBQUEsTUFBUyxDQUFDLElBQU0sRUFBSTtBQUFBO0FBQUEsSUFBVSxHQUFHO0FBQzVDLFVBQUksS0FBSywwQkFBMEIsS0FBSyxHQUFHO0FBQUU7QUFBQSxNQUFTO0FBQ3RELFlBQU0sTUFBTSxzQ0FBc0M7QUFBQSxJQUNwRDtBQUNBLFFBQUlBLFdBQVUsTUFBTSxLQUFLO0FBQUUsYUFBTztBQUFBLElBQU87QUFBQSxFQUMzQyxPQUFPO0FBQ0wsVUFBTSxNQUFNLHNDQUFzQztBQUFBLEVBQ3BEO0FBRUEsYUFBUztBQUNQLFFBQUksS0FBSyx3QkFBd0IsS0FBSyxHQUFHO0FBQUU7QUFBQSxJQUFTO0FBQ3BELGdCQUFZLEtBQUssMEJBQTBCLEtBQUs7QUFDaEQsUUFBSSxDQUFDLFdBQVc7QUFBRSxhQUFPO0FBQUEsSUFBTztBQUNoQyxRQUFJLGNBQWMsZUFBZTtBQUFFLGVBQVM7QUFBQSxJQUFlO0FBQUEsRUFDN0Q7QUFDRjtBQUdBLEtBQUssMEJBQTBCLFNBQVMsT0FBTztBQUM3QyxNQUFJQSxTQUFRLE1BQU07QUFDbEIsTUFBSSxLQUFLLDRCQUE0QixLQUFLLEdBQUc7QUFDM0MsUUFBSSxPQUFPLE1BQU07QUFDakIsUUFBSSxNQUFNO0FBQUEsTUFBSTtBQUFBO0FBQUEsSUFBWSxLQUFLLEtBQUssNEJBQTRCLEtBQUssR0FBRztBQUN0RSxVQUFJLFFBQVEsTUFBTTtBQUNsQixVQUFJLFNBQVMsTUFBTSxVQUFVLE1BQU0sT0FBTyxPQUFPO0FBQy9DLGNBQU0sTUFBTSx1Q0FBdUM7QUFBQSxNQUNyRDtBQUNBLGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTSxNQUFNQTtBQUFBLEVBQ2Q7QUFDQSxTQUFPO0FBQ1Q7QUFHQSxLQUFLLDRCQUE0QixTQUFTLE9BQU87QUFDL0MsTUFBSSxLQUFLLDRCQUE0QixLQUFLLEdBQUc7QUFBRSxXQUFPO0FBQUEsRUFBVTtBQUNoRSxTQUFPLEtBQUssaUNBQWlDLEtBQUssS0FBSyxLQUFLLHNCQUFzQixLQUFLO0FBQ3pGO0FBR0EsS0FBSyx3QkFBd0IsU0FBUyxPQUFPO0FBQzNDLE1BQUlBLFNBQVEsTUFBTTtBQUNsQixNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxTQUFTLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZO0FBQ25DLFFBQUksU0FBUyxLQUFLLHFCQUFxQixLQUFLO0FBQzVDLFFBQUksTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksR0FBRztBQUMzQixVQUFJLFVBQVUsV0FBVyxlQUFlO0FBQ3RDLGNBQU0sTUFBTSw2Q0FBNkM7QUFBQSxNQUMzRDtBQUNBLGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTSxNQUFNQTtBQUFBLEVBQ2Q7QUFDQSxNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxXQUFXLEtBQUssK0JBQStCLEtBQUs7QUFDeEQsUUFBSSxVQUFVO0FBQ1osYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLE1BQU1BO0FBQUEsRUFDZDtBQUNBLFNBQU87QUFDVDtBQUdBLEtBQUssbUNBQW1DLFNBQVMsT0FBTztBQUN0RCxNQUFJQSxTQUFRLE1BQU07QUFDbEIsTUFBSSxNQUFNO0FBQUEsSUFBUyxDQUFDLElBQU0sR0FBSTtBQUFBO0FBQUEsRUFBVSxHQUFHO0FBQ3pDLFFBQUksTUFBTTtBQUFBLE1BQUk7QUFBQTtBQUFBLElBQVksR0FBRztBQUMzQixVQUFJLFNBQVMsS0FBSyxzQ0FBc0MsS0FBSztBQUM3RCxVQUFJLE1BQU07QUFBQSxRQUFJO0FBQUE7QUFBQSxNQUFZLEdBQUc7QUFDM0IsZUFBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGLE9BQU87QUFFTCxZQUFNLE1BQU0sZ0JBQWdCO0FBQUEsSUFDOUI7QUFDQSxVQUFNLE1BQU1BO0FBQUEsRUFDZDtBQUNBLFNBQU87QUFDVDtBQUdBLEtBQUssd0NBQXdDLFNBQVMsT0FBTztBQUMzRCxNQUFJLFNBQVMsS0FBSyxtQkFBbUIsS0FBSztBQUMxQyxTQUFPLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDOUIsUUFBSSxLQUFLLG1CQUFtQixLQUFLLE1BQU0sZUFBZTtBQUFFLGVBQVM7QUFBQSxJQUFlO0FBQUEsRUFDbEY7QUFDQSxTQUFPO0FBQ1Q7QUFJQSxLQUFLLHFCQUFxQixTQUFTLE9BQU87QUFDeEMsTUFBSSxRQUFRO0FBQ1osU0FBTyxLQUFLLDRCQUE0QixLQUFLLEdBQUc7QUFBRTtBQUFBLEVBQVM7QUFDM0QsU0FBTyxVQUFVLElBQUksWUFBWTtBQUNuQztBQUdBLEtBQUssOEJBQThCLFNBQVMsT0FBTztBQUNqRCxNQUFJQSxTQUFRLE1BQU07QUFDbEIsTUFBSSxNQUFNO0FBQUEsSUFBSTtBQUFBO0FBQUEsRUFBWSxHQUFHO0FBQzNCLFFBQ0UsS0FBSywwQkFBMEIsS0FBSyxLQUNwQyxLQUFLLHFDQUFxQyxLQUFLLEdBQy9DO0FBQ0EsYUFBTztBQUFBLElBQ1Q7QUFDQSxRQUFJLE1BQU07QUFBQSxNQUFJO0FBQUE7QUFBQSxJQUFZLEdBQUc7QUFDM0IsWUFBTSxlQUFlO0FBQ3JCLGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTSxNQUFNQTtBQUNaLFdBQU87QUFBQSxFQUNUO0FBQ0EsTUFBSSxLQUFLLE1BQU0sUUFBUTtBQUN2QixNQUFJLEtBQUssS0FBSyxPQUFPLE1BQU0sVUFBVSxLQUFLLDRDQUE0QyxFQUFFLEdBQUc7QUFBRSxXQUFPO0FBQUEsRUFBTTtBQUMxRyxNQUFJLDBCQUEwQixFQUFFLEdBQUc7QUFBRSxXQUFPO0FBQUEsRUFBTTtBQUNsRCxRQUFNLFFBQVE7QUFDZCxRQUFNLGVBQWU7QUFDckIsU0FBTztBQUNUO0FBR0EsU0FBUyw0Q0FBNEMsSUFBSTtBQUN2RCxTQUNFLE9BQU8sTUFDUCxNQUFNLE1BQWdCLE1BQU0sTUFDNUIsTUFBTSxNQUFnQixNQUFNLE1BQzVCLE9BQU8sTUFDUCxNQUFNLE1BQWdCLE1BQU0sTUFDNUIsT0FBTyxNQUNQLE9BQU8sTUFDUCxPQUFPO0FBRVg7QUFHQSxTQUFTLDBCQUEwQixJQUFJO0FBQ3JDLFNBQ0UsT0FBTyxNQUNQLE9BQU8sTUFDUCxPQUFPLE1BQ1AsT0FBTyxNQUNQLE1BQU0sTUFBZ0IsTUFBTSxNQUM1QixNQUFNLE9BQWdCLE1BQU07QUFFaEM7QUFHQSxLQUFLLHVDQUF1QyxTQUFTLE9BQU87QUFDMUQsTUFBSSxLQUFLLE1BQU0sUUFBUTtBQUN2QixNQUFJLDZCQUE2QixFQUFFLEdBQUc7QUFDcEMsVUFBTSxlQUFlO0FBQ3JCLFVBQU0sUUFBUTtBQUNkLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTztBQUNUO0FBR0EsU0FBUyw2QkFBNkIsSUFBSTtBQUN4QyxTQUNFLE9BQU8sTUFDUCxPQUFPLE1BQ1AsT0FBTyxNQUNQLE9BQU8sTUFDUCxPQUFPLE1BQ1AsT0FBTyxNQUNQLE1BQU0sTUFBZ0IsTUFBTSxNQUM1QixPQUFPLE1BQ1AsT0FBTyxNQUNQLE9BQU87QUFFWDtBQUdBLEtBQUssK0JBQStCLFNBQVMsT0FBTztBQUNsRCxNQUFJLEtBQUssTUFBTSxRQUFRO0FBQ3ZCLE1BQUksZUFBZSxFQUFFLEtBQUssT0FBTyxJQUFjO0FBQzdDLFVBQU0sZUFBZSxLQUFLO0FBQzFCLFVBQU0sUUFBUTtBQUNkLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTztBQUNUO0FBR0EsS0FBSyw4QkFBOEIsU0FBUyxPQUFPO0FBQ2pELE1BQUlBLFNBQVEsTUFBTTtBQUNsQixNQUFJLE1BQU07QUFBQSxJQUFJO0FBQUE7QUFBQSxFQUFZLEdBQUc7QUFDM0IsUUFBSSxLQUFLLHlCQUF5QixPQUFPLENBQUMsR0FBRztBQUMzQyxhQUFPO0FBQUEsSUFDVDtBQUNBLFFBQUksTUFBTSxTQUFTO0FBQ2pCLFlBQU0sTUFBTSxnQkFBZ0I7QUFBQSxJQUM5QjtBQUNBLFVBQU0sTUFBTUE7QUFBQSxFQUNkO0FBQ0EsU0FBTztBQUNUO0FBR0EsS0FBSywwQkFBMEIsU0FBUyxPQUFPO0FBQzdDLE1BQUlBLFNBQVEsTUFBTTtBQUNsQixNQUFJLEtBQUs7QUFDVCxRQUFNLGVBQWU7QUFDckIsU0FBTyxlQUFlLEtBQUssTUFBTSxRQUFRLENBQUMsR0FBRztBQUMzQyxVQUFNLGVBQWUsS0FBSyxNQUFNLGdCQUFnQixLQUFLO0FBQ3JELFVBQU0sUUFBUTtBQUFBLEVBQ2hCO0FBQ0EsU0FBTyxNQUFNLFFBQVFBO0FBQ3ZCO0FBQ0EsU0FBUyxlQUFlLElBQUk7QUFDMUIsU0FBTyxNQUFNLE1BQWdCLE1BQU07QUFDckM7QUFHQSxLQUFLLHNCQUFzQixTQUFTLE9BQU87QUFDekMsTUFBSUEsU0FBUSxNQUFNO0FBQ2xCLE1BQUksS0FBSztBQUNULFFBQU0sZUFBZTtBQUNyQixTQUFPLFdBQVcsS0FBSyxNQUFNLFFBQVEsQ0FBQyxHQUFHO0FBQ3ZDLFVBQU0sZUFBZSxLQUFLLE1BQU0sZUFBZSxTQUFTLEVBQUU7QUFDMUQsVUFBTSxRQUFRO0FBQUEsRUFDaEI7QUFDQSxTQUFPLE1BQU0sUUFBUUE7QUFDdkI7QUFDQSxTQUFTLFdBQVcsSUFBSTtBQUN0QixTQUNHLE1BQU0sTUFBZ0IsTUFBTSxNQUM1QixNQUFNLE1BQWdCLE1BQU0sTUFDNUIsTUFBTSxNQUFnQixNQUFNO0FBRWpDO0FBQ0EsU0FBUyxTQUFTLElBQUk7QUFDcEIsTUFBSSxNQUFNLE1BQWdCLE1BQU0sSUFBYztBQUM1QyxXQUFPLE1BQU0sS0FBSztBQUFBLEVBQ3BCO0FBQ0EsTUFBSSxNQUFNLE1BQWdCLE1BQU0sS0FBYztBQUM1QyxXQUFPLE1BQU0sS0FBSztBQUFBLEVBQ3BCO0FBQ0EsU0FBTyxLQUFLO0FBQ2Q7QUFJQSxLQUFLLHNDQUFzQyxTQUFTLE9BQU87QUFDekQsTUFBSSxLQUFLLHFCQUFxQixLQUFLLEdBQUc7QUFDcEMsUUFBSSxLQUFLLE1BQU07QUFDZixRQUFJLEtBQUsscUJBQXFCLEtBQUssR0FBRztBQUNwQyxVQUFJLEtBQUssTUFBTTtBQUNmLFVBQUksTUFBTSxLQUFLLEtBQUsscUJBQXFCLEtBQUssR0FBRztBQUMvQyxjQUFNLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSSxNQUFNO0FBQUEsTUFDaEQsT0FBTztBQUNMLGNBQU0sZUFBZSxLQUFLLElBQUk7QUFBQSxNQUNoQztBQUFBLElBQ0YsT0FBTztBQUNMLFlBQU0sZUFBZTtBQUFBLElBQ3ZCO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7QUFHQSxLQUFLLHVCQUF1QixTQUFTLE9BQU87QUFDMUMsTUFBSSxLQUFLLE1BQU0sUUFBUTtBQUN2QixNQUFJLGFBQWEsRUFBRSxHQUFHO0FBQ3BCLFVBQU0sZUFBZSxLQUFLO0FBQzFCLFVBQU0sUUFBUTtBQUNkLFdBQU87QUFBQSxFQUNUO0FBQ0EsUUFBTSxlQUFlO0FBQ3JCLFNBQU87QUFDVDtBQUNBLFNBQVMsYUFBYSxJQUFJO0FBQ3hCLFNBQU8sTUFBTSxNQUFnQixNQUFNO0FBQ3JDO0FBS0EsS0FBSywyQkFBMkIsU0FBUyxPQUFPLFFBQVE7QUFDdEQsTUFBSUEsU0FBUSxNQUFNO0FBQ2xCLFFBQU0sZUFBZTtBQUNyQixXQUFTLElBQUksR0FBRyxJQUFJLFFBQVEsRUFBRSxHQUFHO0FBQy9CLFFBQUksS0FBSyxNQUFNLFFBQVE7QUFDdkIsUUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHO0FBQ25CLFlBQU0sTUFBTUE7QUFDWixhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sZUFBZSxLQUFLLE1BQU0sZUFBZSxTQUFTLEVBQUU7QUFDMUQsVUFBTSxRQUFRO0FBQUEsRUFDaEI7QUFDQSxTQUFPO0FBQ1Q7QUFNQSxJQUFJLFFBQVEsU0FBU1ksT0FBTSxHQUFHO0FBQzVCLE9BQUssT0FBTyxFQUFFO0FBQ2QsT0FBSyxRQUFRLEVBQUU7QUFDZixPQUFLLFFBQVEsRUFBRTtBQUNmLE9BQUssTUFBTSxFQUFFO0FBQ2IsTUFBSSxFQUFFLFFBQVEsV0FDWjtBQUFFLFNBQUssTUFBTSxJQUFJLGVBQWUsR0FBRyxFQUFFLFVBQVUsRUFBRSxNQUFNO0FBQUEsRUFBRztBQUM1RCxNQUFJLEVBQUUsUUFBUSxRQUNaO0FBQUUsU0FBSyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRztBQUFBLEVBQUc7QUFDckM7QUFJQSxJQUFJLEtBQUssT0FBTztBQUloQixHQUFHLE9BQU8sU0FBUywrQkFBK0I7QUFDaEQsTUFBSSxDQUFDLGlDQUFpQyxLQUFLLEtBQUssV0FBVyxLQUFLLGFBQzlEO0FBQUUsU0FBSyxpQkFBaUIsS0FBSyxPQUFPLGdDQUFnQyxLQUFLLEtBQUssT0FBTztBQUFBLEVBQUc7QUFDMUYsTUFBSSxLQUFLLFFBQVEsU0FDZjtBQUFFLFNBQUssUUFBUSxRQUFRLElBQUksTUFBTSxJQUFJLENBQUM7QUFBQSxFQUFHO0FBRTNDLE9BQUssYUFBYSxLQUFLO0FBQ3ZCLE9BQUssZUFBZSxLQUFLO0FBQ3pCLE9BQUssZ0JBQWdCLEtBQUs7QUFDMUIsT0FBSyxrQkFBa0IsS0FBSztBQUM1QixPQUFLLFVBQVU7QUFDakI7QUFFQSxHQUFHLFdBQVcsV0FBVztBQUN2QixPQUFLLEtBQUs7QUFDVixTQUFPLElBQUksTUFBTSxJQUFJO0FBQ3ZCO0FBR0EsSUFBSSxPQUFPLFdBQVcsYUFDcEI7QUFBRSxLQUFHLE9BQU8sUUFBUSxJQUFJLFdBQVc7QUFDakMsUUFBSSxXQUFXO0FBRWYsV0FBTztBQUFBLE1BQ0wsTUFBTSxXQUFZO0FBQ2hCLFlBQUksUUFBUSxTQUFTLFNBQVM7QUFDOUIsZUFBTztBQUFBLFVBQ0wsTUFBTSxNQUFNLFNBQVMsUUFBUTtBQUFBLFVBQzdCLE9BQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUc7QUFRTCxHQUFHLFlBQVksV0FBVztBQUN4QixNQUFJLGFBQWEsS0FBSyxXQUFXO0FBQ2pDLE1BQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxlQUFlO0FBQUUsU0FBSyxVQUFVO0FBQUEsRUFBRztBQUVsRSxPQUFLLFFBQVEsS0FBSztBQUNsQixNQUFJLEtBQUssUUFBUSxXQUFXO0FBQUUsU0FBSyxXQUFXLEtBQUssWUFBWTtBQUFBLEVBQUc7QUFDbEUsTUFBSSxLQUFLLE9BQU8sS0FBSyxNQUFNLFFBQVE7QUFBRSxXQUFPLEtBQUssWUFBWSxRQUFRLEdBQUc7QUFBQSxFQUFFO0FBRTFFLE1BQUksV0FBVyxVQUFVO0FBQUUsV0FBTyxXQUFXLFNBQVMsSUFBSTtBQUFBLEVBQUUsT0FDdkQ7QUFBRSxTQUFLLFVBQVUsS0FBSyxrQkFBa0IsQ0FBQztBQUFBLEVBQUc7QUFDbkQ7QUFFQSxHQUFHLFlBQVksU0FBUyxNQUFNO0FBRzVCLE1BQUksa0JBQWtCLE1BQU0sS0FBSyxRQUFRLGVBQWUsQ0FBQyxLQUFLLFNBQVMsSUFDckU7QUFBRSxXQUFPLEtBQUssU0FBUztBQUFBLEVBQUU7QUFFM0IsU0FBTyxLQUFLLGlCQUFpQixJQUFJO0FBQ25DO0FBRUEsR0FBRyxpQkFBaUIsU0FBUyxLQUFLO0FBQ2hDLE1BQUksT0FBTyxLQUFLLE1BQU0sV0FBVyxHQUFHO0FBQ3BDLE1BQUksUUFBUSxTQUFVLFFBQVEsT0FBUTtBQUFFLFdBQU87QUFBQSxFQUFLO0FBQ3BELE1BQUksT0FBTyxLQUFLLE1BQU0sV0FBVyxNQUFNLENBQUM7QUFDeEMsU0FBTyxRQUFRLFNBQVUsUUFBUSxRQUFTLFFBQVEsUUFBUSxNQUFNLE9BQU87QUFDekU7QUFFQSxHQUFHLG9CQUFvQixXQUFXO0FBQ2hDLFNBQU8sS0FBSyxlQUFlLEtBQUssR0FBRztBQUNyQztBQUVBLEdBQUcsbUJBQW1CLFdBQVc7QUFDL0IsTUFBSSxXQUFXLEtBQUssUUFBUSxhQUFhLEtBQUssWUFBWTtBQUMxRCxNQUFJWixTQUFRLEtBQUssS0FBSyxNQUFNLEtBQUssTUFBTSxRQUFRLE1BQU0sS0FBSyxPQUFPLENBQUM7QUFDbEUsTUFBSSxRQUFRLElBQUk7QUFBRSxTQUFLLE1BQU0sS0FBSyxNQUFNLEdBQUcsc0JBQXNCO0FBQUEsRUFBRztBQUNwRSxPQUFLLE1BQU0sTUFBTTtBQUNqQixNQUFJLEtBQUssUUFBUSxXQUFXO0FBQzFCLGFBQVMsWUFBYSxRQUFTLE1BQU1BLFNBQVEsWUFBWSxjQUFjLEtBQUssT0FBTyxLQUFLLEtBQUssR0FBRyxLQUFLLE1BQUs7QUFDeEcsUUFBRSxLQUFLO0FBQ1AsWUFBTSxLQUFLLFlBQVk7QUFBQSxJQUN6QjtBQUFBLEVBQ0Y7QUFDQSxNQUFJLEtBQUssUUFBUSxXQUNmO0FBQUUsU0FBSyxRQUFRO0FBQUEsTUFBVTtBQUFBLE1BQU0sS0FBSyxNQUFNLE1BQU1BLFNBQVEsR0FBRyxHQUFHO0FBQUEsTUFBR0E7QUFBQSxNQUFPLEtBQUs7QUFBQSxNQUN0RDtBQUFBLE1BQVUsS0FBSyxZQUFZO0FBQUEsSUFBQztBQUFBLEVBQUc7QUFDMUQ7QUFFQSxHQUFHLGtCQUFrQixTQUFTLFdBQVc7QUFDdkMsTUFBSUEsU0FBUSxLQUFLO0FBQ2pCLE1BQUksV0FBVyxLQUFLLFFBQVEsYUFBYSxLQUFLLFlBQVk7QUFDMUQsTUFBSSxLQUFLLEtBQUssTUFBTSxXQUFXLEtBQUssT0FBTyxTQUFTO0FBQ3BELFNBQU8sS0FBSyxNQUFNLEtBQUssTUFBTSxVQUFVLENBQUMsVUFBVSxFQUFFLEdBQUc7QUFDckQsU0FBSyxLQUFLLE1BQU0sV0FBVyxFQUFFLEtBQUssR0FBRztBQUFBLEVBQ3ZDO0FBQ0EsTUFBSSxLQUFLLFFBQVEsV0FDZjtBQUFFLFNBQUssUUFBUTtBQUFBLE1BQVU7QUFBQSxNQUFPLEtBQUssTUFBTSxNQUFNQSxTQUFRLFdBQVcsS0FBSyxHQUFHO0FBQUEsTUFBR0E7QUFBQSxNQUFPLEtBQUs7QUFBQSxNQUNwRTtBQUFBLE1BQVUsS0FBSyxZQUFZO0FBQUEsSUFBQztBQUFBLEVBQUc7QUFDMUQ7QUFLQSxHQUFHLFlBQVksV0FBVztBQUN4QixPQUFNLFFBQU8sS0FBSyxNQUFNLEtBQUssTUFBTSxRQUFRO0FBQ3pDLFFBQUksS0FBSyxLQUFLLE1BQU0sV0FBVyxLQUFLLEdBQUc7QUFDdkMsWUFBUSxJQUFJO0FBQUEsTUFDWixLQUFLO0FBQUEsTUFBSSxLQUFLO0FBQ1osVUFBRSxLQUFLO0FBQ1A7QUFBQSxNQUNGLEtBQUs7QUFDSCxZQUFJLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDLE1BQU0sSUFBSTtBQUM5QyxZQUFFLEtBQUs7QUFBQSxRQUNUO0FBQUEsTUFDRixLQUFLO0FBQUEsTUFBSSxLQUFLO0FBQUEsTUFBTSxLQUFLO0FBQ3ZCLFVBQUUsS0FBSztBQUNQLFlBQUksS0FBSyxRQUFRLFdBQVc7QUFDMUIsWUFBRSxLQUFLO0FBQ1AsZUFBSyxZQUFZLEtBQUs7QUFBQSxRQUN4QjtBQUNBO0FBQUEsTUFDRixLQUFLO0FBQ0gsZ0JBQVEsS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUMsR0FBRztBQUFBLFVBQzdDLEtBQUs7QUFDSCxpQkFBSyxpQkFBaUI7QUFDdEI7QUFBQSxVQUNGLEtBQUs7QUFDSCxpQkFBSyxnQkFBZ0IsQ0FBQztBQUN0QjtBQUFBLFVBQ0Y7QUFDRSxrQkFBTTtBQUFBLFFBQ1I7QUFDQTtBQUFBLE1BQ0Y7QUFDRSxZQUFJLEtBQUssS0FBSyxLQUFLLE1BQU0sTUFBTSxRQUFRLG1CQUFtQixLQUFLLE9BQU8sYUFBYSxFQUFFLENBQUMsR0FBRztBQUN2RixZQUFFLEtBQUs7QUFBQSxRQUNULE9BQU87QUFDTCxnQkFBTTtBQUFBLFFBQ1I7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBT0EsR0FBRyxjQUFjLFNBQVMsTUFBTSxLQUFLO0FBQ25DLE9BQUssTUFBTSxLQUFLO0FBQ2hCLE1BQUksS0FBSyxRQUFRLFdBQVc7QUFBRSxTQUFLLFNBQVMsS0FBSyxZQUFZO0FBQUEsRUFBRztBQUNoRSxNQUFJLFdBQVcsS0FBSztBQUNwQixPQUFLLE9BQU87QUFDWixPQUFLLFFBQVE7QUFFYixPQUFLLGNBQWMsUUFBUTtBQUM3QjtBQVdBLEdBQUcsZ0JBQWdCLFdBQVc7QUFDNUIsTUFBSSxPQUFPLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDO0FBQzdDLE1BQUksUUFBUSxNQUFNLFFBQVEsSUFBSTtBQUFFLFdBQU8sS0FBSyxXQUFXLElBQUk7QUFBQSxFQUFFO0FBQzdELE1BQUksUUFBUSxLQUFLLE1BQU0sV0FBVyxLQUFLLE1BQU0sQ0FBQztBQUM5QyxNQUFJLEtBQUssUUFBUSxlQUFlLEtBQUssU0FBUyxNQUFNLFVBQVUsSUFBSTtBQUNoRSxTQUFLLE9BQU87QUFDWixXQUFPLEtBQUssWUFBWSxRQUFRLFFBQVE7QUFBQSxFQUMxQyxPQUFPO0FBQ0wsTUFBRSxLQUFLO0FBQ1AsV0FBTyxLQUFLLFlBQVksUUFBUSxHQUFHO0FBQUEsRUFDckM7QUFDRjtBQUVBLEdBQUcsa0JBQWtCLFdBQVc7QUFDOUIsTUFBSSxPQUFPLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDO0FBQzdDLE1BQUksS0FBSyxhQUFhO0FBQUUsTUFBRSxLQUFLO0FBQUssV0FBTyxLQUFLLFdBQVc7QUFBQSxFQUFFO0FBQzdELE1BQUksU0FBUyxJQUFJO0FBQUUsV0FBTyxLQUFLLFNBQVMsUUFBUSxRQUFRLENBQUM7QUFBQSxFQUFFO0FBQzNELFNBQU8sS0FBSyxTQUFTLFFBQVEsT0FBTyxDQUFDO0FBQ3ZDO0FBRUEsR0FBRyw0QkFBNEIsU0FBUyxNQUFNO0FBQzVDLE1BQUksT0FBTyxLQUFLLE1BQU0sV0FBVyxLQUFLLE1BQU0sQ0FBQztBQUM3QyxNQUFJLE9BQU87QUFDWCxNQUFJLFlBQVksU0FBUyxLQUFLLFFBQVEsT0FBTyxRQUFRO0FBR3JELE1BQUksS0FBSyxRQUFRLGVBQWUsS0FBSyxTQUFTLE1BQU0sU0FBUyxJQUFJO0FBQy9ELE1BQUU7QUFDRixnQkFBWSxRQUFRO0FBQ3BCLFdBQU8sS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUM7QUFBQSxFQUMzQztBQUVBLE1BQUksU0FBUyxJQUFJO0FBQUUsV0FBTyxLQUFLLFNBQVMsUUFBUSxRQUFRLE9BQU8sQ0FBQztBQUFBLEVBQUU7QUFDbEUsU0FBTyxLQUFLLFNBQVMsV0FBVyxJQUFJO0FBQ3RDO0FBRUEsR0FBRyxxQkFBcUIsU0FBUyxNQUFNO0FBQ3JDLE1BQUksT0FBTyxLQUFLLE1BQU0sV0FBVyxLQUFLLE1BQU0sQ0FBQztBQUM3QyxNQUFJLFNBQVMsTUFBTTtBQUNqQixRQUFJLEtBQUssUUFBUSxlQUFlLElBQUk7QUFDbEMsVUFBSSxRQUFRLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDO0FBQzlDLFVBQUksVUFBVSxJQUFJO0FBQUUsZUFBTyxLQUFLLFNBQVMsUUFBUSxRQUFRLENBQUM7QUFBQSxNQUFFO0FBQUEsSUFDOUQ7QUFDQSxXQUFPLEtBQUssU0FBUyxTQUFTLE1BQU0sUUFBUSxZQUFZLFFBQVEsWUFBWSxDQUFDO0FBQUEsRUFDL0U7QUFDQSxNQUFJLFNBQVMsSUFBSTtBQUFFLFdBQU8sS0FBSyxTQUFTLFFBQVEsUUFBUSxDQUFDO0FBQUEsRUFBRTtBQUMzRCxTQUFPLEtBQUssU0FBUyxTQUFTLE1BQU0sUUFBUSxZQUFZLFFBQVEsWUFBWSxDQUFDO0FBQy9FO0FBRUEsR0FBRyxrQkFBa0IsV0FBVztBQUM5QixNQUFJLE9BQU8sS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUM7QUFDN0MsTUFBSSxTQUFTLElBQUk7QUFBRSxXQUFPLEtBQUssU0FBUyxRQUFRLFFBQVEsQ0FBQztBQUFBLEVBQUU7QUFDM0QsU0FBTyxLQUFLLFNBQVMsUUFBUSxZQUFZLENBQUM7QUFDNUM7QUFFQSxHQUFHLHFCQUFxQixTQUFTLE1BQU07QUFDckMsTUFBSSxPQUFPLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDO0FBQzdDLE1BQUksU0FBUyxNQUFNO0FBQ2pCLFFBQUksU0FBUyxNQUFNLENBQUMsS0FBSyxZQUFZLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDLE1BQU0sT0FDeEUsS0FBSyxlQUFlLEtBQUssVUFBVSxLQUFLLEtBQUssTUFBTSxNQUFNLEtBQUssWUFBWSxLQUFLLEdBQUcsQ0FBQyxJQUFJO0FBRTFGLFdBQUssZ0JBQWdCLENBQUM7QUFDdEIsV0FBSyxVQUFVO0FBQ2YsYUFBTyxLQUFLLFVBQVU7QUFBQSxJQUN4QjtBQUNBLFdBQU8sS0FBSyxTQUFTLFFBQVEsUUFBUSxDQUFDO0FBQUEsRUFDeEM7QUFDQSxNQUFJLFNBQVMsSUFBSTtBQUFFLFdBQU8sS0FBSyxTQUFTLFFBQVEsUUFBUSxDQUFDO0FBQUEsRUFBRTtBQUMzRCxTQUFPLEtBQUssU0FBUyxRQUFRLFNBQVMsQ0FBQztBQUN6QztBQUVBLEdBQUcsa0JBQWtCLFNBQVMsTUFBTTtBQUNsQyxNQUFJLE9BQU8sS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUM7QUFDN0MsTUFBSSxPQUFPO0FBQ1gsTUFBSSxTQUFTLE1BQU07QUFDakIsV0FBTyxTQUFTLE1BQU0sS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUMsTUFBTSxLQUFLLElBQUk7QUFDdkUsUUFBSSxLQUFLLE1BQU0sV0FBVyxLQUFLLE1BQU0sSUFBSSxNQUFNLElBQUk7QUFBRSxhQUFPLEtBQUssU0FBUyxRQUFRLFFBQVEsT0FBTyxDQUFDO0FBQUEsSUFBRTtBQUNwRyxXQUFPLEtBQUssU0FBUyxRQUFRLFVBQVUsSUFBSTtBQUFBLEVBQzdDO0FBQ0EsTUFBSSxTQUFTLE1BQU0sU0FBUyxNQUFNLENBQUMsS0FBSyxZQUFZLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDLE1BQU0sTUFDeEYsS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUMsTUFBTSxJQUFJO0FBRTlDLFNBQUssZ0JBQWdCLENBQUM7QUFDdEIsU0FBSyxVQUFVO0FBQ2YsV0FBTyxLQUFLLFVBQVU7QUFBQSxFQUN4QjtBQUNBLE1BQUksU0FBUyxJQUFJO0FBQUUsV0FBTztBQUFBLEVBQUc7QUFDN0IsU0FBTyxLQUFLLFNBQVMsUUFBUSxZQUFZLElBQUk7QUFDL0M7QUFFQSxHQUFHLG9CQUFvQixTQUFTLE1BQU07QUFDcEMsTUFBSSxPQUFPLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDO0FBQzdDLE1BQUksU0FBUyxJQUFJO0FBQUUsV0FBTyxLQUFLLFNBQVMsUUFBUSxVQUFVLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUM7QUFBQSxFQUFFO0FBQzlHLE1BQUksU0FBUyxNQUFNLFNBQVMsTUFBTSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQy9ELFNBQUssT0FBTztBQUNaLFdBQU8sS0FBSyxZQUFZLFFBQVEsS0FBSztBQUFBLEVBQ3ZDO0FBQ0EsU0FBTyxLQUFLLFNBQVMsU0FBUyxLQUFLLFFBQVEsS0FBSyxRQUFRLFFBQVEsQ0FBQztBQUNuRTtBQUVBLEdBQUcscUJBQXFCLFdBQVc7QUFDakMsTUFBSSxjQUFjLEtBQUssUUFBUTtBQUMvQixNQUFJLGVBQWUsSUFBSTtBQUNyQixRQUFJLE9BQU8sS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUM7QUFDN0MsUUFBSSxTQUFTLElBQUk7QUFDZixVQUFJLFFBQVEsS0FBSyxNQUFNLFdBQVcsS0FBSyxNQUFNLENBQUM7QUFDOUMsVUFBSSxRQUFRLE1BQU0sUUFBUSxJQUFJO0FBQUUsZUFBTyxLQUFLLFNBQVMsUUFBUSxhQUFhLENBQUM7QUFBQSxNQUFFO0FBQUEsSUFDL0U7QUFDQSxRQUFJLFNBQVMsSUFBSTtBQUNmLFVBQUksZUFBZSxJQUFJO0FBQ3JCLFlBQUksVUFBVSxLQUFLLE1BQU0sV0FBVyxLQUFLLE1BQU0sQ0FBQztBQUNoRCxZQUFJLFlBQVksSUFBSTtBQUFFLGlCQUFPLEtBQUssU0FBUyxRQUFRLFFBQVEsQ0FBQztBQUFBLFFBQUU7QUFBQSxNQUNoRTtBQUNBLGFBQU8sS0FBSyxTQUFTLFFBQVEsVUFBVSxDQUFDO0FBQUEsSUFDMUM7QUFBQSxFQUNGO0FBQ0EsU0FBTyxLQUFLLFNBQVMsUUFBUSxVQUFVLENBQUM7QUFDMUM7QUFFQSxHQUFHLHVCQUF1QixXQUFXO0FBQ25DLE1BQUksY0FBYyxLQUFLLFFBQVE7QUFDL0IsTUFBSSxPQUFPO0FBQ1gsTUFBSSxlQUFlLElBQUk7QUFDckIsTUFBRSxLQUFLO0FBQ1AsV0FBTyxLQUFLLGtCQUFrQjtBQUM5QixRQUFJLGtCQUFrQixNQUFNLElBQUksS0FBSyxTQUFTLElBQWM7QUFDMUQsYUFBTyxLQUFLLFlBQVksUUFBUSxXQUFXLEtBQUssVUFBVSxDQUFDO0FBQUEsSUFDN0Q7QUFBQSxFQUNGO0FBRUEsT0FBSyxNQUFNLEtBQUssS0FBSywyQkFBMkIsa0JBQWtCLElBQUksSUFBSSxHQUFHO0FBQy9FO0FBRUEsR0FBRyxtQkFBbUIsU0FBUyxNQUFNO0FBQ25DLFVBQVEsTUFBTTtBQUFBO0FBQUE7QUFBQSxJQUdkLEtBQUs7QUFDSCxhQUFPLEtBQUssY0FBYztBQUFBO0FBQUEsSUFHNUIsS0FBSztBQUFJLFFBQUUsS0FBSztBQUFLLGFBQU8sS0FBSyxZQUFZLFFBQVEsTUFBTTtBQUFBLElBQzNELEtBQUs7QUFBSSxRQUFFLEtBQUs7QUFBSyxhQUFPLEtBQUssWUFBWSxRQUFRLE1BQU07QUFBQSxJQUMzRCxLQUFLO0FBQUksUUFBRSxLQUFLO0FBQUssYUFBTyxLQUFLLFlBQVksUUFBUSxJQUFJO0FBQUEsSUFDekQsS0FBSztBQUFJLFFBQUUsS0FBSztBQUFLLGFBQU8sS0FBSyxZQUFZLFFBQVEsS0FBSztBQUFBLElBQzFELEtBQUs7QUFBSSxRQUFFLEtBQUs7QUFBSyxhQUFPLEtBQUssWUFBWSxRQUFRLFFBQVE7QUFBQSxJQUM3RCxLQUFLO0FBQUksUUFBRSxLQUFLO0FBQUssYUFBTyxLQUFLLFlBQVksUUFBUSxRQUFRO0FBQUEsSUFDN0QsS0FBSztBQUFLLFFBQUUsS0FBSztBQUFLLGFBQU8sS0FBSyxZQUFZLFFBQVEsTUFBTTtBQUFBLElBQzVELEtBQUs7QUFBSyxRQUFFLEtBQUs7QUFBSyxhQUFPLEtBQUssWUFBWSxRQUFRLE1BQU07QUFBQSxJQUM1RCxLQUFLO0FBQUksUUFBRSxLQUFLO0FBQUssYUFBTyxLQUFLLFlBQVksUUFBUSxLQUFLO0FBQUEsSUFFMUQsS0FBSztBQUNILFVBQUksS0FBSyxRQUFRLGNBQWMsR0FBRztBQUFFO0FBQUEsTUFBTTtBQUMxQyxRQUFFLEtBQUs7QUFDUCxhQUFPLEtBQUssWUFBWSxRQUFRLFNBQVM7QUFBQSxJQUUzQyxLQUFLO0FBQ0gsVUFBSSxPQUFPLEtBQUssTUFBTSxXQUFXLEtBQUssTUFBTSxDQUFDO0FBQzdDLFVBQUksU0FBUyxPQUFPLFNBQVMsSUFBSTtBQUFFLGVBQU8sS0FBSyxnQkFBZ0IsRUFBRTtBQUFBLE1BQUU7QUFDbkUsVUFBSSxLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQ2pDLFlBQUksU0FBUyxPQUFPLFNBQVMsSUFBSTtBQUFFLGlCQUFPLEtBQUssZ0JBQWdCLENBQUM7QUFBQSxRQUFFO0FBQ2xFLFlBQUksU0FBUyxNQUFNLFNBQVMsSUFBSTtBQUFFLGlCQUFPLEtBQUssZ0JBQWdCLENBQUM7QUFBQSxRQUFFO0FBQUEsTUFDbkU7QUFBQTtBQUFBO0FBQUEsSUFJRixLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQzNFLGFBQU8sS0FBSyxXQUFXLEtBQUs7QUFBQTtBQUFBLElBRzlCLEtBQUs7QUFBQSxJQUFJLEtBQUs7QUFDWixhQUFPLEtBQUssV0FBVyxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU03QixLQUFLO0FBQ0gsYUFBTyxLQUFLLGdCQUFnQjtBQUFBLElBRTlCLEtBQUs7QUFBQSxJQUFJLEtBQUs7QUFDWixhQUFPLEtBQUssMEJBQTBCLElBQUk7QUFBQSxJQUU1QyxLQUFLO0FBQUEsSUFBSyxLQUFLO0FBQ2IsYUFBTyxLQUFLLG1CQUFtQixJQUFJO0FBQUEsSUFFckMsS0FBSztBQUNILGFBQU8sS0FBSyxnQkFBZ0I7QUFBQSxJQUU5QixLQUFLO0FBQUEsSUFBSSxLQUFLO0FBQ1osYUFBTyxLQUFLLG1CQUFtQixJQUFJO0FBQUEsSUFFckMsS0FBSztBQUFBLElBQUksS0FBSztBQUNaLGFBQU8sS0FBSyxnQkFBZ0IsSUFBSTtBQUFBLElBRWxDLEtBQUs7QUFBQSxJQUFJLEtBQUs7QUFDWixhQUFPLEtBQUssa0JBQWtCLElBQUk7QUFBQSxJQUVwQyxLQUFLO0FBQ0gsYUFBTyxLQUFLLG1CQUFtQjtBQUFBLElBRWpDLEtBQUs7QUFDSCxhQUFPLEtBQUssU0FBUyxRQUFRLFFBQVEsQ0FBQztBQUFBLElBRXhDLEtBQUs7QUFDSCxhQUFPLEtBQUsscUJBQXFCO0FBQUEsRUFDbkM7QUFFQSxPQUFLLE1BQU0sS0FBSyxLQUFLLDJCQUEyQixrQkFBa0IsSUFBSSxJQUFJLEdBQUc7QUFDL0U7QUFFQSxHQUFHLFdBQVcsU0FBUyxNQUFNLE1BQU07QUFDakMsTUFBSSxNQUFNLEtBQUssTUFBTSxNQUFNLEtBQUssS0FBSyxLQUFLLE1BQU0sSUFBSTtBQUNwRCxPQUFLLE9BQU87QUFDWixTQUFPLEtBQUssWUFBWSxNQUFNLEdBQUc7QUFDbkM7QUFFQSxHQUFHLGFBQWEsV0FBVztBQUN6QixNQUFJLFNBQVMsU0FBU0EsU0FBUSxLQUFLO0FBQ25DLGFBQVM7QUFDUCxRQUFJLEtBQUssT0FBTyxLQUFLLE1BQU0sUUFBUTtBQUFFLFdBQUssTUFBTUEsUUFBTyxpQ0FBaUM7QUFBQSxJQUFHO0FBQzNGLFFBQUksS0FBSyxLQUFLLE1BQU0sT0FBTyxLQUFLLEdBQUc7QUFDbkMsUUFBSSxVQUFVLEtBQUssRUFBRSxHQUFHO0FBQUUsV0FBSyxNQUFNQSxRQUFPLGlDQUFpQztBQUFBLElBQUc7QUFDaEYsUUFBSSxDQUFDLFNBQVM7QUFDWixVQUFJLE9BQU8sS0FBSztBQUFFLGtCQUFVO0FBQUEsTUFBTSxXQUN6QixPQUFPLE9BQU8sU0FBUztBQUFFLGtCQUFVO0FBQUEsTUFBTyxXQUMxQyxPQUFPLE9BQU8sQ0FBQyxTQUFTO0FBQUU7QUFBQSxNQUFNO0FBQ3pDLGdCQUFVLE9BQU87QUFBQSxJQUNuQixPQUFPO0FBQUUsZ0JBQVU7QUFBQSxJQUFPO0FBQzFCLE1BQUUsS0FBSztBQUFBLEVBQ1Q7QUFDQSxNQUFJLFVBQVUsS0FBSyxNQUFNLE1BQU1BLFFBQU8sS0FBSyxHQUFHO0FBQzlDLElBQUUsS0FBSztBQUNQLE1BQUksYUFBYSxLQUFLO0FBQ3RCLE1BQUksUUFBUSxLQUFLLFVBQVU7QUFDM0IsTUFBSSxLQUFLLGFBQWE7QUFBRSxTQUFLLFdBQVcsVUFBVTtBQUFBLEVBQUc7QUFHckQsTUFBSSxRQUFRLEtBQUssZ0JBQWdCLEtBQUssY0FBYyxJQUFJLHNCQUFzQixJQUFJO0FBQ2xGLFFBQU0sTUFBTUEsUUFBTyxTQUFTLEtBQUs7QUFDakMsT0FBSyxvQkFBb0IsS0FBSztBQUM5QixPQUFLLHNCQUFzQixLQUFLO0FBR2hDLE1BQUksUUFBUTtBQUNaLE1BQUk7QUFDRixZQUFRLElBQUksT0FBTyxTQUFTLEtBQUs7QUFBQSxFQUNuQyxTQUFTLEdBQUc7QUFBQSxFQUdaO0FBRUEsU0FBTyxLQUFLLFlBQVksUUFBUSxRQUFRLEVBQUMsU0FBa0IsT0FBYyxNQUFZLENBQUM7QUFDeEY7QUFNQSxHQUFHLFVBQVUsU0FBUyxPQUFPLEtBQUssZ0NBQWdDO0FBRWhFLE1BQUksa0JBQWtCLEtBQUssUUFBUSxlQUFlLE1BQU0sUUFBUTtBQUtoRSxNQUFJLDhCQUE4QixrQ0FBa0MsS0FBSyxNQUFNLFdBQVcsS0FBSyxHQUFHLE1BQU07QUFFeEcsTUFBSUEsU0FBUSxLQUFLLEtBQUssUUFBUSxHQUFHLFdBQVc7QUFDNUMsV0FBUyxJQUFJLEdBQUcsSUFBSSxPQUFPLE9BQU8sV0FBVyxLQUFLLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEtBQUs7QUFDeEUsUUFBSSxPQUFPLEtBQUssTUFBTSxXQUFXLEtBQUssR0FBRyxHQUFHLE1BQU87QUFFbkQsUUFBSSxtQkFBbUIsU0FBUyxJQUFJO0FBQ2xDLFVBQUksNkJBQTZCO0FBQUUsYUFBSyxpQkFBaUIsS0FBSyxLQUFLLG1FQUFtRTtBQUFBLE1BQUc7QUFDekksVUFBSSxhQUFhLElBQUk7QUFBRSxhQUFLLGlCQUFpQixLQUFLLEtBQUssa0RBQWtEO0FBQUEsTUFBRztBQUM1RyxVQUFJLE1BQU0sR0FBRztBQUFFLGFBQUssaUJBQWlCLEtBQUssS0FBSyx5REFBeUQ7QUFBQSxNQUFHO0FBQzNHLGlCQUFXO0FBQ1g7QUFBQSxJQUNGO0FBRUEsUUFBSSxRQUFRLElBQUk7QUFBRSxZQUFNLE9BQU8sS0FBSztBQUFBLElBQUksV0FDL0IsUUFBUSxJQUFJO0FBQUUsWUFBTSxPQUFPLEtBQUs7QUFBQSxJQUFJLFdBQ3BDLFFBQVEsTUFBTSxRQUFRLElBQUk7QUFBRSxZQUFNLE9BQU87QUFBQSxJQUFJLE9BQ2pEO0FBQUUsWUFBTTtBQUFBLElBQVU7QUFDdkIsUUFBSSxPQUFPLE9BQU87QUFBRTtBQUFBLElBQU07QUFDMUIsZUFBVztBQUNYLFlBQVEsUUFBUSxRQUFRO0FBQUEsRUFDMUI7QUFFQSxNQUFJLG1CQUFtQixhQUFhLElBQUk7QUFBRSxTQUFLLGlCQUFpQixLQUFLLE1BQU0sR0FBRyx3REFBd0Q7QUFBQSxFQUFHO0FBQ3pJLE1BQUksS0FBSyxRQUFRQSxVQUFTLE9BQU8sUUFBUSxLQUFLLE1BQU1BLFdBQVUsS0FBSztBQUFFLFdBQU87QUFBQSxFQUFLO0FBRWpGLFNBQU87QUFDVDtBQUVBLFNBQVMsZUFBZSxLQUFLLDZCQUE2QjtBQUN4RCxNQUFJLDZCQUE2QjtBQUMvQixXQUFPLFNBQVMsS0FBSyxDQUFDO0FBQUEsRUFDeEI7QUFHQSxTQUFPLFdBQVcsSUFBSSxRQUFRLE1BQU0sRUFBRSxDQUFDO0FBQ3pDO0FBRUEsU0FBUyxlQUFlLEtBQUs7QUFDM0IsTUFBSSxPQUFPLFdBQVcsWUFBWTtBQUNoQyxXQUFPO0FBQUEsRUFDVDtBQUdBLFNBQU8sT0FBTyxJQUFJLFFBQVEsTUFBTSxFQUFFLENBQUM7QUFDckM7QUFFQSxHQUFHLGtCQUFrQixTQUFTLE9BQU87QUFDbkMsTUFBSUEsU0FBUSxLQUFLO0FBQ2pCLE9BQUssT0FBTztBQUNaLE1BQUksTUFBTSxLQUFLLFFBQVEsS0FBSztBQUM1QixNQUFJLE9BQU8sTUFBTTtBQUFFLFNBQUssTUFBTSxLQUFLLFFBQVEsR0FBRyw4QkFBOEIsS0FBSztBQUFBLEVBQUc7QUFDcEYsTUFBSSxLQUFLLFFBQVEsZUFBZSxNQUFNLEtBQUssTUFBTSxXQUFXLEtBQUssR0FBRyxNQUFNLEtBQUs7QUFDN0UsVUFBTSxlQUFlLEtBQUssTUFBTSxNQUFNQSxRQUFPLEtBQUssR0FBRyxDQUFDO0FBQ3RELE1BQUUsS0FBSztBQUFBLEVBQ1QsV0FBVyxrQkFBa0IsS0FBSyxrQkFBa0IsQ0FBQyxHQUFHO0FBQUUsU0FBSyxNQUFNLEtBQUssS0FBSyxrQ0FBa0M7QUFBQSxFQUFHO0FBQ3BILFNBQU8sS0FBSyxZQUFZLFFBQVEsS0FBSyxHQUFHO0FBQzFDO0FBSUEsR0FBRyxhQUFhLFNBQVMsZUFBZTtBQUN0QyxNQUFJQSxTQUFRLEtBQUs7QUFDakIsTUFBSSxDQUFDLGlCQUFpQixLQUFLLFFBQVEsSUFBSSxRQUFXLElBQUksTUFBTSxNQUFNO0FBQUUsU0FBSyxNQUFNQSxRQUFPLGdCQUFnQjtBQUFBLEVBQUc7QUFDekcsTUFBSSxRQUFRLEtBQUssTUFBTUEsVUFBUyxLQUFLLEtBQUssTUFBTSxXQUFXQSxNQUFLLE1BQU07QUFDdEUsTUFBSSxTQUFTLEtBQUssUUFBUTtBQUFFLFNBQUssTUFBTUEsUUFBTyxnQkFBZ0I7QUFBQSxFQUFHO0FBQ2pFLE1BQUksT0FBTyxLQUFLLE1BQU0sV0FBVyxLQUFLLEdBQUc7QUFDekMsTUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsS0FBSyxRQUFRLGVBQWUsTUFBTSxTQUFTLEtBQUs7QUFDOUUsUUFBSSxRQUFRLGVBQWUsS0FBSyxNQUFNLE1BQU1BLFFBQU8sS0FBSyxHQUFHLENBQUM7QUFDNUQsTUFBRSxLQUFLO0FBQ1AsUUFBSSxrQkFBa0IsS0FBSyxrQkFBa0IsQ0FBQyxHQUFHO0FBQUUsV0FBSyxNQUFNLEtBQUssS0FBSyxrQ0FBa0M7QUFBQSxJQUFHO0FBQzdHLFdBQU8sS0FBSyxZQUFZLFFBQVEsS0FBSyxLQUFLO0FBQUEsRUFDNUM7QUFDQSxNQUFJLFNBQVMsT0FBTyxLQUFLLEtBQUssTUFBTSxNQUFNQSxRQUFPLEtBQUssR0FBRyxDQUFDLEdBQUc7QUFBRSxZQUFRO0FBQUEsRUFBTztBQUM5RSxNQUFJLFNBQVMsTUFBTSxDQUFDLE9BQU87QUFDekIsTUFBRSxLQUFLO0FBQ1AsU0FBSyxRQUFRLEVBQUU7QUFDZixXQUFPLEtBQUssTUFBTSxXQUFXLEtBQUssR0FBRztBQUFBLEVBQ3ZDO0FBQ0EsT0FBSyxTQUFTLE1BQU0sU0FBUyxRQUFRLENBQUMsT0FBTztBQUMzQyxXQUFPLEtBQUssTUFBTSxXQUFXLEVBQUUsS0FBSyxHQUFHO0FBQ3ZDLFFBQUksU0FBUyxNQUFNLFNBQVMsSUFBSTtBQUFFLFFBQUUsS0FBSztBQUFBLElBQUs7QUFDOUMsUUFBSSxLQUFLLFFBQVEsRUFBRSxNQUFNLE1BQU07QUFBRSxXQUFLLE1BQU1BLFFBQU8sZ0JBQWdCO0FBQUEsSUFBRztBQUFBLEVBQ3hFO0FBQ0EsTUFBSSxrQkFBa0IsS0FBSyxrQkFBa0IsQ0FBQyxHQUFHO0FBQUUsU0FBSyxNQUFNLEtBQUssS0FBSyxrQ0FBa0M7QUFBQSxFQUFHO0FBRTdHLE1BQUksTUFBTSxlQUFlLEtBQUssTUFBTSxNQUFNQSxRQUFPLEtBQUssR0FBRyxHQUFHLEtBQUs7QUFDakUsU0FBTyxLQUFLLFlBQVksUUFBUSxLQUFLLEdBQUc7QUFDMUM7QUFJQSxHQUFHLGdCQUFnQixXQUFXO0FBQzVCLE1BQUksS0FBSyxLQUFLLE1BQU0sV0FBVyxLQUFLLEdBQUcsR0FBRztBQUUxQyxNQUFJLE9BQU8sS0FBSztBQUNkLFFBQUksS0FBSyxRQUFRLGNBQWMsR0FBRztBQUFFLFdBQUssV0FBVztBQUFBLElBQUc7QUFDdkQsUUFBSSxVQUFVLEVBQUUsS0FBSztBQUNyQixXQUFPLEtBQUssWUFBWSxLQUFLLE1BQU0sUUFBUSxLQUFLLEtBQUssR0FBRyxJQUFJLEtBQUssR0FBRztBQUNwRSxNQUFFLEtBQUs7QUFDUCxRQUFJLE9BQU8sU0FBVTtBQUFFLFdBQUssbUJBQW1CLFNBQVMsMEJBQTBCO0FBQUEsSUFBRztBQUFBLEVBQ3ZGLE9BQU87QUFDTCxXQUFPLEtBQUssWUFBWSxDQUFDO0FBQUEsRUFDM0I7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxHQUFHLGFBQWEsU0FBUyxPQUFPO0FBQzlCLE1BQUksTUFBTSxJQUFJLGFBQWEsRUFBRSxLQUFLO0FBQ2xDLGFBQVM7QUFDUCxRQUFJLEtBQUssT0FBTyxLQUFLLE1BQU0sUUFBUTtBQUFFLFdBQUssTUFBTSxLQUFLLE9BQU8sOEJBQThCO0FBQUEsSUFBRztBQUM3RixRQUFJLEtBQUssS0FBSyxNQUFNLFdBQVcsS0FBSyxHQUFHO0FBQ3ZDLFFBQUksT0FBTyxPQUFPO0FBQUU7QUFBQSxJQUFNO0FBQzFCLFFBQUksT0FBTyxJQUFJO0FBQ2IsYUFBTyxLQUFLLE1BQU0sTUFBTSxZQUFZLEtBQUssR0FBRztBQUM1QyxhQUFPLEtBQUssZ0JBQWdCLEtBQUs7QUFDakMsbUJBQWEsS0FBSztBQUFBLElBQ3BCLFdBQVcsT0FBTyxRQUFVLE9BQU8sTUFBUTtBQUN6QyxVQUFJLEtBQUssUUFBUSxjQUFjLElBQUk7QUFBRSxhQUFLLE1BQU0sS0FBSyxPQUFPLDhCQUE4QjtBQUFBLE1BQUc7QUFDN0YsUUFBRSxLQUFLO0FBQ1AsVUFBSSxLQUFLLFFBQVEsV0FBVztBQUMxQixhQUFLO0FBQ0wsYUFBSyxZQUFZLEtBQUs7QUFBQSxNQUN4QjtBQUFBLElBQ0YsT0FBTztBQUNMLFVBQUksVUFBVSxFQUFFLEdBQUc7QUFBRSxhQUFLLE1BQU0sS0FBSyxPQUFPLDhCQUE4QjtBQUFBLE1BQUc7QUFDN0UsUUFBRSxLQUFLO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFDQSxTQUFPLEtBQUssTUFBTSxNQUFNLFlBQVksS0FBSyxLQUFLO0FBQzlDLFNBQU8sS0FBSyxZQUFZLFFBQVEsUUFBUSxHQUFHO0FBQzdDO0FBSUEsSUFBSSxnQ0FBZ0MsQ0FBQztBQUVyQyxHQUFHLHVCQUF1QixXQUFXO0FBQ25DLE9BQUssb0JBQW9CO0FBQ3pCLE1BQUk7QUFDRixTQUFLLGNBQWM7QUFBQSxFQUNyQixTQUFTLEtBQUs7QUFDWixRQUFJLFFBQVEsK0JBQStCO0FBQ3pDLFdBQUsseUJBQXlCO0FBQUEsSUFDaEMsT0FBTztBQUNMLFlBQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUVBLE9BQUssb0JBQW9CO0FBQzNCO0FBRUEsR0FBRyxxQkFBcUIsU0FBUyxVQUFVLFNBQVM7QUFDbEQsTUFBSSxLQUFLLHFCQUFxQixLQUFLLFFBQVEsZUFBZSxHQUFHO0FBQzNELFVBQU07QUFBQSxFQUNSLE9BQU87QUFDTCxTQUFLLE1BQU0sVUFBVSxPQUFPO0FBQUEsRUFDOUI7QUFDRjtBQUVBLEdBQUcsZ0JBQWdCLFdBQVc7QUFDNUIsTUFBSSxNQUFNLElBQUksYUFBYSxLQUFLO0FBQ2hDLGFBQVM7QUFDUCxRQUFJLEtBQUssT0FBTyxLQUFLLE1BQU0sUUFBUTtBQUFFLFdBQUssTUFBTSxLQUFLLE9BQU8sdUJBQXVCO0FBQUEsSUFBRztBQUN0RixRQUFJLEtBQUssS0FBSyxNQUFNLFdBQVcsS0FBSyxHQUFHO0FBQ3ZDLFFBQUksT0FBTyxNQUFNLE9BQU8sTUFBTSxLQUFLLE1BQU0sV0FBVyxLQUFLLE1BQU0sQ0FBQyxNQUFNLEtBQUs7QUFDekUsVUFBSSxLQUFLLFFBQVEsS0FBSyxVQUFVLEtBQUssU0FBUyxRQUFRLFlBQVksS0FBSyxTQUFTLFFBQVEsa0JBQWtCO0FBQ3hHLFlBQUksT0FBTyxJQUFJO0FBQ2IsZUFBSyxPQUFPO0FBQ1osaUJBQU8sS0FBSyxZQUFZLFFBQVEsWUFBWTtBQUFBLFFBQzlDLE9BQU87QUFDTCxZQUFFLEtBQUs7QUFDUCxpQkFBTyxLQUFLLFlBQVksUUFBUSxTQUFTO0FBQUEsUUFDM0M7QUFBQSxNQUNGO0FBQ0EsYUFBTyxLQUFLLE1BQU0sTUFBTSxZQUFZLEtBQUssR0FBRztBQUM1QyxhQUFPLEtBQUssWUFBWSxRQUFRLFVBQVUsR0FBRztBQUFBLElBQy9DO0FBQ0EsUUFBSSxPQUFPLElBQUk7QUFDYixhQUFPLEtBQUssTUFBTSxNQUFNLFlBQVksS0FBSyxHQUFHO0FBQzVDLGFBQU8sS0FBSyxnQkFBZ0IsSUFBSTtBQUNoQyxtQkFBYSxLQUFLO0FBQUEsSUFDcEIsV0FBVyxVQUFVLEVBQUUsR0FBRztBQUN4QixhQUFPLEtBQUssTUFBTSxNQUFNLFlBQVksS0FBSyxHQUFHO0FBQzVDLFFBQUUsS0FBSztBQUNQLGNBQVEsSUFBSTtBQUFBLFFBQ1osS0FBSztBQUNILGNBQUksS0FBSyxNQUFNLFdBQVcsS0FBSyxHQUFHLE1BQU0sSUFBSTtBQUFFLGNBQUUsS0FBSztBQUFBLFVBQUs7QUFBQSxRQUM1RCxLQUFLO0FBQ0gsaUJBQU87QUFDUDtBQUFBLFFBQ0Y7QUFDRSxpQkFBTyxPQUFPLGFBQWEsRUFBRTtBQUM3QjtBQUFBLE1BQ0Y7QUFDQSxVQUFJLEtBQUssUUFBUSxXQUFXO0FBQzFCLFVBQUUsS0FBSztBQUNQLGFBQUssWUFBWSxLQUFLO0FBQUEsTUFDeEI7QUFDQSxtQkFBYSxLQUFLO0FBQUEsSUFDcEIsT0FBTztBQUNMLFFBQUUsS0FBSztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQ0Y7QUFHQSxHQUFHLDJCQUEyQixXQUFXO0FBQ3ZDLFNBQU8sS0FBSyxNQUFNLEtBQUssTUFBTSxRQUFRLEtBQUssT0FBTztBQUMvQyxZQUFRLEtBQUssTUFBTSxLQUFLLEdBQUcsR0FBRztBQUFBLE1BQzlCLEtBQUs7QUFDSCxVQUFFLEtBQUs7QUFDUDtBQUFBLE1BRUYsS0FBSztBQUNILFlBQUksS0FBSyxNQUFNLEtBQUssTUFBTSxDQUFDLE1BQU0sS0FBSztBQUFFO0FBQUEsUUFBTTtBQUFBO0FBQUEsTUFFaEQsS0FBSztBQUNILGVBQU8sS0FBSyxZQUFZLFFBQVEsaUJBQWlCLEtBQUssTUFBTSxNQUFNLEtBQUssT0FBTyxLQUFLLEdBQUcsQ0FBQztBQUFBLE1BRXpGLEtBQUs7QUFDSCxZQUFJLEtBQUssTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNLE1BQU07QUFBRSxZQUFFLEtBQUs7QUFBQSxRQUFLO0FBQUE7QUFBQSxNQUV2RCxLQUFLO0FBQUEsTUFBTSxLQUFLO0FBQUEsTUFBVSxLQUFLO0FBQzdCLFVBQUUsS0FBSztBQUNQLGFBQUssWUFBWSxLQUFLLE1BQU07QUFDNUI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNBLE9BQUssTUFBTSxLQUFLLE9BQU8sdUJBQXVCO0FBQ2hEO0FBSUEsR0FBRyxrQkFBa0IsU0FBUyxZQUFZO0FBQ3hDLE1BQUksS0FBSyxLQUFLLE1BQU0sV0FBVyxFQUFFLEtBQUssR0FBRztBQUN6QyxJQUFFLEtBQUs7QUFDUCxVQUFRLElBQUk7QUFBQSxJQUNaLEtBQUs7QUFBSyxhQUFPO0FBQUE7QUFBQSxJQUNqQixLQUFLO0FBQUssYUFBTztBQUFBO0FBQUEsSUFDakIsS0FBSztBQUFLLGFBQU8sT0FBTyxhQUFhLEtBQUssWUFBWSxDQUFDLENBQUM7QUFBQTtBQUFBLElBQ3hELEtBQUs7QUFBSyxhQUFPLGtCQUFrQixLQUFLLGNBQWMsQ0FBQztBQUFBO0FBQUEsSUFDdkQsS0FBSztBQUFLLGFBQU87QUFBQTtBQUFBLElBQ2pCLEtBQUs7QUFBSSxhQUFPO0FBQUE7QUFBQSxJQUNoQixLQUFLO0FBQUssYUFBTztBQUFBO0FBQUEsSUFDakIsS0FBSztBQUFLLGFBQU87QUFBQTtBQUFBLElBQ2pCLEtBQUs7QUFBSSxVQUFJLEtBQUssTUFBTSxXQUFXLEtBQUssR0FBRyxNQUFNLElBQUk7QUFBRSxVQUFFLEtBQUs7QUFBQSxNQUFLO0FBQUE7QUFBQSxJQUNuRSxLQUFLO0FBQ0gsVUFBSSxLQUFLLFFBQVEsV0FBVztBQUFFLGFBQUssWUFBWSxLQUFLO0FBQUssVUFBRSxLQUFLO0FBQUEsTUFBUztBQUN6RSxhQUFPO0FBQUEsSUFDVCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQ0gsVUFBSSxLQUFLLFFBQVE7QUFDZixhQUFLO0FBQUEsVUFDSCxLQUFLLE1BQU07QUFBQSxVQUNYO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFDQSxVQUFJLFlBQVk7QUFDZCxZQUFJLFVBQVUsS0FBSyxNQUFNO0FBRXpCLGFBQUs7QUFBQSxVQUNIO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNFLFVBQUksTUFBTSxNQUFNLE1BQU0sSUFBSTtBQUN4QixZQUFJLFdBQVcsS0FBSyxNQUFNLE9BQU8sS0FBSyxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sU0FBUyxFQUFFLENBQUM7QUFDcEUsWUFBSSxRQUFRLFNBQVMsVUFBVSxDQUFDO0FBQ2hDLFlBQUksUUFBUSxLQUFLO0FBQ2YscUJBQVcsU0FBUyxNQUFNLEdBQUcsRUFBRTtBQUMvQixrQkFBUSxTQUFTLFVBQVUsQ0FBQztBQUFBLFFBQzlCO0FBQ0EsYUFBSyxPQUFPLFNBQVMsU0FBUztBQUM5QixhQUFLLEtBQUssTUFBTSxXQUFXLEtBQUssR0FBRztBQUNuQyxhQUFLLGFBQWEsT0FBTyxPQUFPLE1BQU0sT0FBTyxRQUFRLEtBQUssVUFBVSxhQUFhO0FBQy9FLGVBQUs7QUFBQSxZQUNILEtBQUssTUFBTSxJQUFJLFNBQVM7QUFBQSxZQUN4QixhQUNJLHFDQUNBO0FBQUEsVUFDTjtBQUFBLFFBQ0Y7QUFDQSxlQUFPLE9BQU8sYUFBYSxLQUFLO0FBQUEsTUFDbEM7QUFDQSxVQUFJLFVBQVUsRUFBRSxHQUFHO0FBR2pCLFlBQUksS0FBSyxRQUFRLFdBQVc7QUFBRSxlQUFLLFlBQVksS0FBSztBQUFLLFlBQUUsS0FBSztBQUFBLFFBQVM7QUFDekUsZUFBTztBQUFBLE1BQ1Q7QUFDQSxhQUFPLE9BQU8sYUFBYSxFQUFFO0FBQUEsRUFDL0I7QUFDRjtBQUlBLEdBQUcsY0FBYyxTQUFTLEtBQUs7QUFDN0IsTUFBSSxVQUFVLEtBQUs7QUFDbkIsTUFBSSxJQUFJLEtBQUssUUFBUSxJQUFJLEdBQUc7QUFDNUIsTUFBSSxNQUFNLE1BQU07QUFBRSxTQUFLLG1CQUFtQixTQUFTLCtCQUErQjtBQUFBLEVBQUc7QUFDckYsU0FBTztBQUNUO0FBUUEsR0FBRyxZQUFZLFdBQVc7QUFDeEIsT0FBSyxjQUFjO0FBQ25CLE1BQUksT0FBTyxJQUFJLFFBQVEsTUFBTSxhQUFhLEtBQUs7QUFDL0MsTUFBSSxTQUFTLEtBQUssUUFBUSxlQUFlO0FBQ3pDLFNBQU8sS0FBSyxNQUFNLEtBQUssTUFBTSxRQUFRO0FBQ25DLFFBQUksS0FBSyxLQUFLLGtCQUFrQjtBQUNoQyxRQUFJLGlCQUFpQixJQUFJLE1BQU0sR0FBRztBQUNoQyxXQUFLLE9BQU8sTUFBTSxRQUFTLElBQUk7QUFBQSxJQUNqQyxXQUFXLE9BQU8sSUFBSTtBQUNwQixXQUFLLGNBQWM7QUFDbkIsY0FBUSxLQUFLLE1BQU0sTUFBTSxZQUFZLEtBQUssR0FBRztBQUM3QyxVQUFJLFdBQVcsS0FBSztBQUNwQixVQUFJLEtBQUssTUFBTSxXQUFXLEVBQUUsS0FBSyxHQUFHLE1BQU0sS0FDeEM7QUFBRSxhQUFLLG1CQUFtQixLQUFLLEtBQUssMkNBQTJDO0FBQUEsTUFBRztBQUNwRixRQUFFLEtBQUs7QUFDUCxVQUFJLE1BQU0sS0FBSyxjQUFjO0FBQzdCLFVBQUksRUFBRSxRQUFRLG9CQUFvQixrQkFBa0IsS0FBSyxNQUFNLEdBQzdEO0FBQUUsYUFBSyxtQkFBbUIsVUFBVSx3QkFBd0I7QUFBQSxNQUFHO0FBQ2pFLGNBQVEsa0JBQWtCLEdBQUc7QUFDN0IsbUJBQWEsS0FBSztBQUFBLElBQ3BCLE9BQU87QUFDTDtBQUFBLElBQ0Y7QUFDQSxZQUFRO0FBQUEsRUFDVjtBQUNBLFNBQU8sT0FBTyxLQUFLLE1BQU0sTUFBTSxZQUFZLEtBQUssR0FBRztBQUNyRDtBQUtBLEdBQUcsV0FBVyxXQUFXO0FBQ3ZCLE1BQUksT0FBTyxLQUFLLFVBQVU7QUFDMUIsTUFBSSxPQUFPLFFBQVE7QUFDbkIsTUFBSSxLQUFLLFNBQVMsS0FBSyxJQUFJLEdBQUc7QUFDNUIsV0FBTyxTQUFTLElBQUk7QUFBQSxFQUN0QjtBQUNBLFNBQU8sS0FBSyxZQUFZLE1BQU0sSUFBSTtBQUNwQztBQWlCQSxJQUFJLFVBQVU7QUFFZCxPQUFPLFFBQVE7QUFBQSxFQUNiO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0EsVUFBVTtBQUFBLEVBQ1YsY0FBYztBQUFBLEVBQ2Q7QUFBQSxFQUNBLGFBQWE7QUFBQSxFQUNiO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7OztBQ2xrTU8sU0FBUyxVQUFVLE1BQVksSUFBVTtBQUM5QyxXQUFTLEVBQUUsUUFBbUM7QUFDNUMsZUFBVyxNQUFNLENBQUMsT0FBTyxTQUFRLE9BQU8sUUFBTyxPQUFPLE9BQU8sR0FBRTtBQUM3RCxZQUFNLE1BQUksR0FBRyxLQUFLLE9BQUcsRUFBRSxPQUFLLEVBQUU7QUFDOUIsVUFBSSxPQUFLO0FBQ1AsZUFBTztBQUFBLElBQ1g7QUFDQSxlQUFXLGFBQWEsT0FBTyxTQUFRO0FBQ3JDLFlBQU0sTUFBSSxFQUFFLFNBQVM7QUFDckIsVUFBSSxPQUFLO0FBQ1AsZUFBTztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQ0EsU0FBTyxFQUFFLElBQUk7QUFDZjs7O0FDaENPLFNBQVMsYUFBYSxLQUFtQjtBQUM5QyxTQUFPLFlBQVksR0FBRztBQUN4QjtBQUNPLFNBQVMsY0FBYyxRQUFvQixRQUFjO0FBQzlELFFBQU0sT0FBSyxPQUFPLEtBQUssT0FBTyxFQUFFLEtBQUcsQ0FBQztBQUNwQyxTQUFPLEtBQUssR0FBRyxFQUFFO0FBQ25CO0FBQ08sU0FBUyxtQkFBbUIsUUFBcUIsUUFHdkQ7QUFDQyxRQUFNLFdBQVMsY0FBYyxRQUFPLE1BQU07QUFDMUMsTUFBSSxZQUFVO0FBQ1osV0FBTSxFQUFDLFNBQVEsR0FBRSxPQUFNLFFBQU87QUFDaEMsUUFBTSxFQUFDLFVBQVMsUUFBT2EsVUFBUSxXQUFVLFFBQU8sSUFBRTtBQUNsRCxNQUFJLFlBQVUsTUFBSztBQUNmLFdBQU8sRUFBQyxTQUFBQSxVQUFRLE9BQU0sVUFBUztBQUFBLEVBQ25DO0FBQ0EsTUFBSTtBQUNGLFdBQU8sRUFBQyxTQUFBQSxVQUFRLE9BQU0sVUFBUztBQUVqQyxNQUFJLGNBQVk7QUFDZCxXQUFPLEVBQUMsU0FBQUEsVUFBUSxPQUFNLE9BQU07QUFDOUIsU0FBTyxFQUFDLFNBQUFBLFVBQVEsT0FBTSxRQUFPO0FBQy9COzs7QUNsQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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QUU7QUFDbkQ7QUFBQSxJQUNOO0FBQUEsRUFDSixDQUFDO0FBQ0g7QUFDQSxNQUFNO0FBQ04sSUFBTSxLQUFLLFNBQVMsY0FBYyxrQkFBa0I7QUFDcEQsUUFBUSxJQUFJLEVBQUU7IiwKICAibmFtZXMiOiBbImVsIiwgImVsIiwgImFucyIsICJUb2tlblR5cGUiLCAiUG9zaXRpb24iLCAiY29sIiwgIlNvdXJjZUxvY2F0aW9uIiwgInN0YXJ0IiwgIm9mZnNldCIsICJQYXJzZXIiLCAicmVmIiwgInBhcnNlIiwgIkRlc3RydWN0dXJpbmdFcnJvcnMiLCAiVG9rQ29udGV4dCIsICJTY29wZSIsICJOb2RlIiwgIkJyYW5jaElEIiwgIlJlZ0V4cFZhbGlkYXRpb25TdGF0ZSIsICJjdXJyZW50IiwgIlRva2VuIiwgInZlcnNpb24iLCAiciIsICJhIiwgImIiLCAiYW5zIiwgInIiLCAic3RhcnQiLCAic3RhcnQiLCAicm93IiwgImNvbCIsICJyb3ciLCAiY29sIiwgImRhdGEiLCAidmVyc2lvbiIsICJlbCIsICJ2ZXJzaW9uIl0KfQo=
