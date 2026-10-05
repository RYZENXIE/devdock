/* DevDock core helpers — pure functions, no DOM. Works in browsers and Node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DevLib = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Base64 (UTF-8 safe) ---------- */
  function b64encode(str, urlSafe) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    let out = btoa(bin);
    if (urlSafe) out = out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return out;
  }

  function b64decode(str) {
    let s = String(str).trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  /* ---------- JSON ---------- */
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      const out = {};
      Object.keys(v).sort().forEach((k) => { out[k] = sortKeys(v[k]); });
      return out;
    }
    return v;
  }

  /* ---------- Case conversion ---------- */
  function splitWords(s) {
    return String(s)
      .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  }

  function caseConvert(s) {
    const w = splitWords(s).map((x) => x.toLowerCase());
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    return {
      camel: w.map((x, i) => (i ? cap(x) : x)).join(""),
      pascal: w.map(cap).join(""),
      snake: w.join("_"),
      kebab: w.join("-"),
      constant: w.join("_").toUpperCase(),
      dot: w.join("."),
      title: w.map(cap).join(" "),
      sentence: cap(w.join(" ")),
      upper: String(s).toUpperCase(),
      lower: String(s).toLowerCase(),
    };
  }

  /* ---------- Colors ---------- */
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  }

  function hexToRgb(hex) {
    let h = String(hex).replace("#", "").trim();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0, s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
  }

  function parseColor(input) {
    const s = String(input).trim();
    if (!s) return null;
    if (/^#?[0-9a-f]{3}$/i.test(s) || /^#?[0-9a-f]{6}$/i.test(s)) return hexToRgb(s);
    let m = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i);
    if (m) {
      const [r, g, b] = m.slice(1, 4).map(Number);
      return r > 255 || g > 255 || b > 255 ? null : { r, g, b };
    }
    m = s.match(/^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i);
    if (m) {
      const h = Number(m[1]), sat = Number(m[2]), l = Number(m[3]);
      return sat > 100 || l > 100 ? null : hslToRgb(h, sat, l);
    }
    return null;
  }

  function luminance({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  /* ---------- JWT ---------- */
  function decodeJwt(token) {
    const parts = String(token).trim().split(".");
    if (parts.length < 2 || parts.length > 3) throw new Error("A JWT has 3 dot-separated parts");
    const parse = (p, name) => {
      try { return JSON.parse(b64decode(p)); }
      catch { throw new Error("Could not decode the " + name); }
    };
    return { header: parse(parts[0], "header"), payload: parse(parts[1], "payload"), signature: parts[2] || "" };
  }

  /* ---------- Time ---------- */
  function relativeTime(deltaSec) {
    const abs = Math.abs(deltaSec);
    const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
    for (const [name, secs] of units) {
      if (abs >= secs || name === "second") {
        const v = Math.floor(abs / secs);
        const label = v + " " + name + (v === 1 ? "" : "s");
        return deltaSec >= 0 ? "in " + label : label + " ago";
      }
    }
    return "";
  }

  /* ---------- Randomness ---------- */
  function secureInt(max, c) {
    c = c || (typeof crypto !== "undefined" ? crypto : null);
    if (!c) throw new Error("No secure random generator available");
    const lim = Math.floor(0x100000000 / max) * max; // rejection sampling: no modulo bias
    const a = new Uint32Array(1);
    do { c.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % max;
  }

  function makePassword(len, opts, randInt) {
    const sets = {
      lower: "abcdefghijklmnopqrstuvwxyz",
      upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      digits: "0123456789",
      symbols: "!@#$%^&*()-_=+[]{};:,.?/",
    };
    const chosen = Object.keys(sets)
      .filter((k) => opts[k])
      .map((k) => (opts.noAmbiguous ? sets[k].replace(/[O0Il1]/g, "") : sets[k]));
    if (!chosen.length) throw new Error("Select at least one character type");
    if (len < chosen.length) throw new Error("Length is too short for the selected types");
    const pool = chosen.join("");
    const out = chosen.map((s) => s[randInt(s.length)]); // guarantee one from each type
    while (out.length < len) out.push(pool[randInt(pool.length)]);
    for (let i = out.length - 1; i > 0; i--) { // Fisher–Yates shuffle
      const j = randInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return { password: out.join(""), entropy: len * Math.log2(pool.length) };
  }

  function uuidv4(fill) {
    const b = new Uint8Array(16);
    fill(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return [h.slice(0, 4), h.slice(4, 6), h.slice(6, 8), h.slice(8, 10), h.slice(10)].map((p) => p.join("")).join("-");
  }

  return {
    b64encode, b64decode, sortKeys, splitWords, caseConvert,
    rgbToHex, hexToRgb, rgbToHsl, hslToRgb, parseColor, contrast,
    decodeJwt, relativeTime, secureInt, makePassword, uuidv4,
  };
});
