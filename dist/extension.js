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

// node_modules/lodash.clonedeep/index.js
var require_lodash = __commonJS({
  "node_modules/lodash.clonedeep/index.js"(exports, module) {
    var LARGE_ARRAY_SIZE = 200;
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reFlags = /\w*$/;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var cloneableTags = {};
    cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
    cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
    var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    function addMapEntry(map, pair) {
      map.set(pair[0], pair[1]);
      return map;
    }
    function addSetEntry(set, value) {
      set.add(value);
      return set;
    }
    function arrayEach(array, iteratee) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (iteratee(array[index], index, array) === false) {
          break;
        }
      }
      return array;
    }
    function arrayPush(array, values) {
      var index = -1, length = values.length, offset = array.length;
      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }
    function arrayReduce(array, iteratee, accumulator, initAccum) {
      var index = -1, length = array ? array.length : 0;
      if (initAccum && length) {
        accumulator = array[++index];
      }
      while (++index < length) {
        accumulator = iteratee(accumulator, array[index], index, array);
      }
      return accumulator;
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    function mapToArray(map) {
      var index = -1, result = Array(map.size);
      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Buffer2 = moduleExports ? root.Buffer : void 0;
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var getPrototype = overArg(Object.getPrototypeOf, Object);
    var objectCreate = Object.create;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var nativeGetSymbols = Object.getOwnPropertySymbols;
    var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map2 = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set2 = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map2);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set2);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    function Hash(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
    }
    function hashDelete(key) {
      return this.has(key) && delete this.__data__[key];
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map2 || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      return getMapData(this, key)["delete"](key);
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      getMapData(this, key).set(key, value);
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function Stack(entries) {
      this.__data__ = new ListCache(entries);
    }
    function stackClear() {
      this.__data__ = new ListCache();
    }
    function stackDelete(key) {
      return this.__data__["delete"](key);
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var cache = this.__data__;
      if (cache instanceof ListCache) {
        var pairs = cache.__data__;
        if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          return this;
        }
        cache = this.__data__ = new MapCache(pairs);
      }
      cache.set(key, value);
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assignValue(object, key, value) {
      var objValue = object[key];
      if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) {
        object[key] = value;
      }
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    function baseAssign(object, source) {
      return object && copyObject(source, keys(source), object);
    }
    function baseClone(value, isDeep, isFull, customizer, key, object, stack) {
      var result;
      if (customizer) {
        result = object ? customizer(value, key, object, stack) : customizer(value);
      }
      if (result !== void 0) {
        return result;
      }
      if (!isObject(value)) {
        return value;
      }
      var isArr = isArray(value);
      if (isArr) {
        result = initCloneArray(value);
        if (!isDeep) {
          return copyArray(value, result);
        }
      } else {
        var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
        if (isBuffer(value)) {
          return cloneBuffer(value, isDeep);
        }
        if (tag == objectTag || tag == argsTag || isFunc && !object) {
          if (isHostObject(value)) {
            return object ? value : {};
          }
          result = initCloneObject(isFunc ? {} : value);
          if (!isDeep) {
            return copySymbols(value, baseAssign(result, value));
          }
        } else {
          if (!cloneableTags[tag]) {
            return object ? value : {};
          }
          result = initCloneByTag(value, tag, baseClone, isDeep);
        }
      }
      stack || (stack = new Stack());
      var stacked = stack.get(value);
      if (stacked) {
        return stacked;
      }
      stack.set(value, result);
      if (!isArr) {
        var props = isFull ? getAllKeys(value) : keys(value);
      }
      arrayEach(props || value, function(subValue, key2) {
        if (props) {
          key2 = subValue;
          subValue = value[key2];
        }
        assignValue(result, key2, baseClone(subValue, isDeep, isFull, customizer, key2, value, stack));
      });
      return result;
    }
    function baseCreate(proto) {
      return isObject(proto) ? objectCreate(proto) : {};
    }
    function baseGetAllKeys(object, keysFunc, symbolsFunc) {
      var result = keysFunc(object);
      return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
    }
    function baseGetTag(value) {
      return objectToString.call(value);
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function cloneBuffer(buffer, isDeep) {
      if (isDeep) {
        return buffer.slice();
      }
      var result = new buffer.constructor(buffer.length);
      buffer.copy(result);
      return result;
    }
    function cloneArrayBuffer(arrayBuffer) {
      var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
      new Uint8Array2(result).set(new Uint8Array2(arrayBuffer));
      return result;
    }
    function cloneDataView(dataView, isDeep) {
      var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
      return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
    }
    function cloneMap(map, isDeep, cloneFunc) {
      var array = isDeep ? cloneFunc(mapToArray(map), true) : mapToArray(map);
      return arrayReduce(array, addMapEntry, new map.constructor());
    }
    function cloneRegExp(regexp) {
      var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
      result.lastIndex = regexp.lastIndex;
      return result;
    }
    function cloneSet(set, isDeep, cloneFunc) {
      var array = isDeep ? cloneFunc(setToArray(set), true) : setToArray(set);
      return arrayReduce(array, addSetEntry, new set.constructor());
    }
    function cloneSymbol(symbol) {
      return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
    }
    function cloneTypedArray(typedArray, isDeep) {
      var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
      return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
    }
    function copyArray(source, array) {
      var index = -1, length = source.length;
      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }
    function copyObject(source, props, object, customizer) {
      object || (object = {});
      var index = -1, length = props.length;
      while (++index < length) {
        var key = props[index];
        var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
        assignValue(object, key, newValue === void 0 ? source[key] : newValue);
      }
      return object;
    }
    function copySymbols(source, object) {
      return copyObject(source, getSymbols(source), object);
    }
    function getAllKeys(object) {
      return baseGetAllKeys(object, keys, getSymbols);
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    var getSymbols = nativeGetSymbols ? overArg(nativeGetSymbols, Object) : stubArray;
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = objectToString.call(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : void 0;
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function initCloneArray(array) {
      var length = array.length, result = array.constructor(length);
      if (length && typeof array[0] == "string" && hasOwnProperty.call(array, "index")) {
        result.index = array.index;
        result.input = array.input;
      }
      return result;
    }
    function initCloneObject(object) {
      return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
    }
    function initCloneByTag(object, tag, cloneFunc, isDeep) {
      var Ctor = object.constructor;
      switch (tag) {
        case arrayBufferTag:
          return cloneArrayBuffer(object);
        case boolTag:
        case dateTag:
          return new Ctor(+object);
        case dataViewTag:
          return cloneDataView(object, isDeep);
        case float32Tag:
        case float64Tag:
        case int8Tag:
        case int16Tag:
        case int32Tag:
        case uint8Tag:
        case uint8ClampedTag:
        case uint16Tag:
        case uint32Tag:
          return cloneTypedArray(object, isDeep);
        case mapTag:
          return cloneMap(object, isDeep, cloneFunc);
        case numberTag:
        case stringTag:
          return new Ctor(object);
        case regexpTag:
          return cloneRegExp(object);
        case setTag:
          return cloneSet(object, isDeep, cloneFunc);
        case symbolTag:
          return cloneSymbol(object);
      }
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function cloneDeep2(value) {
      return baseClone(value, true, true);
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    var isBuffer = nativeIsBuffer || stubFalse;
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function stubArray() {
      return [];
    }
    function stubFalse() {
      return false;
    }
    module.exports = cloneDeep2;
  }
});

// src/extension.ts
import * as path3 from "node:path";

// src/monitor.ts
var import_lodash = __toESM(require_lodash(), 1);
import * as path from "node:path";
import { spawn } from "@homebridge/node-pty-prebuilt-multiarch";

// node_modules/@yigal/base_types/src/index.ts
var green = "\x1B[40m\x1B[32m";
var reset = "\x1B[0m";
function get_error(x) {
  if (x instanceof Error)
    return x;
  const str = String(x);
  return new Error(str);
}
function is_object(value) {
  if (value == null) return false;
  if (typeof value !== "object" && typeof value !== "function") return false;
  if (Array.isArray(value)) return false;
  if (value instanceof Set) return false;
  if (value instanceof Map) return false;
  return true;
}
async function get_node() {
  if (typeof window !== "undefined") {
    throw new Error("getFileContents() requires Node.js");
  }
  const path4 = await import("node:path");
  const fs2 = await import("node:fs/promises");
  return { fs: fs2, path: path4 };
}
async function mkdir_write_file(filePath, data) {
  const { path: path4, fs: fs2 } = await get_node();
  const directory = path4.dirname(filePath);
  try {
    await fs2.mkdir(directory, { recursive: true });
    await fs2.writeFile(filePath, data);
    console.log(`File '${filePath}' has been written successfully.`);
  } catch (err) {
    console.error("Error writing file", err);
  }
}
async function read_json_object(filename, object_type) {
  const { fs: fs2 } = await get_node();
  try {
    const data = await fs2.readFile(filename, "utf-8");
    const ans = JSON.parse(data);
    if (!is_object(ans))
      throw `not a valid ${object_type}`;
    return ans;
  } catch (ex) {
    console.warn(`${filename}:${get_error(ex)}.message`);
    return void 0;
  }
}
function is_string_array(a) {
  if (!Array.isArray(a))
    return false;
  for (const x of a)
    if (typeof x !== "string")
      return false;
  return true;
}
async function sleep(ms) {
  return await new Promise((resolve2) => {
    setTimeout(() => resolve2(void 0), ms);
  });
}

// src/monitor.ts
function is_ready_to_start(runner) {
  if (runner.runs.length === 0)
    return true;
  return runner.runs.at(-1)?.end_time != null;
}
function keep_only_last(arr) {
  if (arr.length > 1) {
    arr.splice(0, arr.length - 1);
  }
}
function extract_base(folder) {
  const { full_pathname } = folder;
  const runners = [];
  for (const runner of folder.runners) {
    const copy = (0, import_lodash.default)(runner);
    runners.push(copy);
    for (const run of runner.runs) {
      if (run.output.length !== 0) {
        console.log(`runner ${runner.name} ${JSON.stringify(run.output)}`);
        run.output = [];
      }
    }
    keep_only_last(runner.runs);
  }
  const folders2 = folder.folders.map(extract_base);
  return { ...folder, folders: folders2, runners };
}
function is_valid_watch(a) {
  if (a == null)
    return true;
  return is_string_array(a);
}
function is_valid_watcher(a) {
  if (typeof a === "string" || is_string_array(a))
    return true;
  if (!is_object(a))
    return "expecting object";
  if (!is_valid_watch(a.watch)) {
    return "watch: expecting  array of strings";
  }
  for (const k of Object.keys(a))
    if (!["watch", "env", "filter", "pre"].includes(k))
      return `${k}:invalid key`;
  return true;
}
function is_non_watcher(k) {
  return ["autorun", "$watch"].includes(k);
}
function is_config2(a) {
  if (!is_object(a))
    return false;
  const { $watch } = a;
  if (!is_valid_watch($watch)) {
    console.log("watch: must be string or array of string");
    return false;
  }
  for (const [k, v] of Object.entries(a)) {
    if (is_non_watcher(k))
      continue;
    const valid_watcher = is_valid_watcher(v);
    if (valid_watcher !== true) {
      console.log(`${k}: invalid watcher:${valid_watcher}`);
      return false;
    }
  }
  return true;
}
function parse_config(filename, pkgJson) {
  if (pkgJson == null)
    return {};
  const { scriptsmon } = pkgJson;
  if (scriptsmon == null)
    return {};
  const ans = is_config2(scriptsmon);
  if (ans)
    return scriptsmon;
  console.warn(ans);
  return {};
}
function parse_scripts(pkgJson) {
  if (pkgJson == null)
    return {};
  const { scripts } = pkgJson;
  if (scripts == null)
    return {};
  return scripts;
}
function normalize_watch(a) {
  if (a == null)
    return [];
  return a;
}
function make_runner_ctrl() {
  const ipty = {};
  return { ipty };
}
async function stop({
  runner_ctrl,
  runner
}) {
  let was_stopped = false;
  while (true) {
    if (is_ready_to_start(runner)) {
      return Promise.resolve();
    }
    if (!was_stopped) {
      was_stopped = true;
      console.log(`stopping runner ${runner.name}...`);
      runner_ctrl.ipty[runner.id].kill();
    }
    await sleep(10);
  }
}
async function run_runner({
  //this is not async function on purpuse
  runner,
  reason,
  runner_ctrl
}) {
  await stop({ runner_ctrl, runner });
  void new Promise((resolve2, _reject) => {
    const { script, full_pathname, runs } = runner;
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    const shellArgs = process.platform === "win32" ? ["/c", script] : ["-c", script];
    const child = spawn(shell, shellArgs, {
      // name: 'xterm-color',
      cols: 200,
      useConpty: false,
      cwd: full_pathname,
      env: { ...process.env, FORCE_COLOR: "3" }
    });
    if (child === null)
      return;
    runner_ctrl.ipty[runner.id] = child;
    const run_id = (function() {
      if (runs.length === 0)
        return 0;
      return runs.at(-1).run_id + 1;
    })();
    const run = {
      start_time: Date.now(),
      end_time: void 0,
      //initialy is undefined then changes to number and stops changing
      reason,
      output: [],
      Err: void 0,
      //initialy is undefined then maybe changes to error and stop changing
      exit_code: void 0,
      stopped: void 0,
      run_id
    };
    runner.runs.push(run);
    const dataDisposable = child.onData((data) => {
      run.output.push(data);
    });
    const exitDisposable = child.onExit(({ exitCode, signal }) => {
      dataDisposable.dispose();
      exitDisposable.dispose();
      console.log({ exitCode, signal });
      const new_state = exitCode === 0 ? "done" : "error";
      run.end_time = Date.now();
      run.exit_code = exitCode;
      if (signal != null)
        run.stopped = true;
      resolve2(null);
    });
  });
}
function scriptsmon_to_runners(pkgPath, watchers, scripts) {
  const $watch = normalize_watch(watchers.$watch);
  const autorun = normalize_watch(watchers.autorun);
  const ans = [];
  for (const [name, script] of Object.entries(scripts)) {
    if (is_non_watcher(name))
      continue;
    const watcher = (function() {
      const v = watchers[name];
      if (v == null || is_string_array(v)) {
        return { watch: normalize_watch(v) };
      }
      return v;
    })();
    if (script == null) {
      console.warn(`missing script ${name}`);
      continue;
    }
    const runner = (function() {
      const full_pathname = path.dirname(pkgPath);
      const id = `${full_pathname} ${name}`.replaceAll(/\\|:/g, "-").replaceAll(" ", "--");
      const ans2 = {
        type: "runner",
        name,
        script,
        full_pathname,
        watcher: {
          watch: [...normalize_watch($watch), ...normalize_watch(watcher.watch)]
        },
        autorun: autorun.includes(name),
        //state:'ready',
        id,
        //version:0,
        runs: [],
        watched: false
      };
      return ans2;
    })();
    ans.push(runner);
  }
  return ans;
}
async function read_package_json(full_pathnames) {
  const folder_index = {};
  async function f(full_pathname, name) {
    const pkgPath = path.resolve(path.normalize(full_pathname), "package.json");
    const d = path.resolve(full_pathname);
    const exists = folder_index[d];
    if (exists != null) {
      console.warn(`${pkgPath}: skippin, already done`);
      return exists;
    }
    const pkgJson = await read_json_object(pkgPath, "package.json");
    if (pkgJson == null)
      return null;
    console.warn(`${green}${pkgPath}${reset}`);
    const scriptsmon = parse_config(pkgPath, pkgJson);
    const scripts = parse_scripts(pkgJson);
    const runners = scriptsmon_to_runners(pkgPath, scriptsmon, scripts);
    const { workspaces } = pkgJson;
    const folders3 = [];
    if (is_string_array(workspaces))
      for (const workspace2 of workspaces) {
        const ret = await f(path.join(full_pathname, workspace2), workspace2);
        if (ret != null)
          folders3.push(ret);
      }
    const ans = { runners, folders: folders3, name, full_pathname, scriptsmon, type: "folder", id: full_pathname };
    return ans;
  }
  const folders2 = [];
  for (const pathname of full_pathnames) {
    const full_pathname = path.resolve(pathname);
    const ret = await f(full_pathname, path.basename(full_pathname));
    if (ret != null)
      folders2.push(ret);
  }
  const root = {
    name: "root",
    id: "root",
    full_pathname: "",
    folders: folders2,
    runners: [],
    scriptsmon: {},
    type: "folder"
  };
  await mkdir_write_file("c:\\yigal\\generated\\packages.json", JSON.stringify(root, null, 2));
  return root;
}

// src/extension.ts
import * as vscode from "vscode";

// src/vscode_utils.ts
import * as path2 from "node:path";
import * as fs from "node:fs";
import {
  Uri,
  window as window2
} from "vscode";
function getWebviewContent(context, webview) {
  const htmlPath = path2.join(context.extensionPath, "client", "resources", "index.html");
  let html = fs.readFileSync(htmlPath, "utf-8");
  const base = webview.asWebviewUri(
    Uri.joinPath(context.extensionUri, "client", "resources")
  ).toString() + "/";
  html = html.replaceAll("./", base);
  return html;
}
function define_webview({ context, id, html, f }) {
  console.log("define_webview");
  const provider = {
    resolveWebviewView(webviewView, webview_context) {
      console.log("resolveWebviewView");
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          Uri.file(path2.join(context.extensionPath, "client/resources"))
        ]
      };
      webviewView.webview.html = getWebviewContent(context, webviewView.webview);
      if (f)
        void f(webviewView, context);
    }
  };
  const reg = window2.registerWebviewViewProvider(
    id,
    provider
  );
  const ans = context.subscriptions.push(reg);
  console.log(ans);
}

// src/extension.ts
async function open_file(pos) {
  try {
    const file = path3.join(pos.full_pathname, pos.file);
    const document = await vscode.workspace.openTextDocument(file);
    const editor = await vscode.window.showTextDocument(document, {
      preview: false
    });
    const position = new vscode.Position(
      Math.max(0, pos.row - 1),
      Math.max(0, pos.col - 1)
    );
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to open file: ${pos.file}`
    );
  }
}
function post_message(view, msg) {
  view.postMessage(msg);
}
function find_runner(root, id) {
  function f(folder) {
    const ans = folder.runners.find((x) => x.id === id);
    if (ans != null)
      return ans;
    for (const subfolder of folder.folders) {
      const ans2 = f(subfolder);
      if (ans2 != null)
        return ans2;
    }
  }
  return f(root);
}
var folders = ["c:\\yigal\\scriptsmon", "c:\\yigal\\million_try3"];
var the_loop = async function(view, context) {
  const root = await read_package_json(folders);
  const runner_ctrl = make_runner_ctrl();
  function send_report(root_folder) {
    const root2 = extract_base(root_folder);
    post_message(view.webview, {
      command: "RunnerReport",
      root: root2,
      base_uri: view.webview.asWebviewUri(context.extensionUri).toString()
    });
  }
  setInterval(() => {
    send_report(root);
  }, 100);
  view.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "command_link_clicked": {
          void open_file(message);
          break;
        }
        case "command_clicked": {
          const runner = find_runner(root, message.id);
          if (runner == null)
            throw new Error(`runner not found:${message.id}`);
          void run_runner({ runner, runner_ctrl, reason: "user" });
          break;
        }
      }
    },
    void 0,
    context.subscriptions
  );
};
function activate(context) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
  define_webview({ context, id: "Scriptsmon.webview", html: "client/resources/index.html", f: the_loop });
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event, null, 2));
  });
}
function deactivate() {
}
export {
  activate,
  deactivate,
  open_file
};
//# sourceMappingURL=extension.js.map
