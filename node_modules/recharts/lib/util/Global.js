"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Global = void 0;
var parseIsSsrByDefault = () => !(typeof window !== 'undefined' && window.document && window.document.createElement && window.setTimeout);
var Global = exports.Global = {
  isSsr: parseIsSsrByDefault(),
  get: key => {
    return Global[key];
  },
  set: (key, value) => {
    if (typeof key === 'string') {
      Global[key] = value;
    } else {
      var keys = Object.keys(key);
      if (keys && keys.length) {
        keys.forEach(k => {
          Global[k] = key[k];
        });
      }
    }
  }
};