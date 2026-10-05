/* DevDock — offline developer toolbox. Vanilla JS, zero dependencies. */
(() => {
  "use strict";

  const L = window.DevLib;
  const $ = (s, r = document) => r.querySelector(s);
  const Q = (root) => (s) => root.querySelector(s);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  };
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const MOD = isMac ? "⌘" : "Ctrl";
  const REPO = "https://github.com/YOUR-USERNAME/devdock";

  /* =========================================================
     UI helpers
     ========================================================= */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1500);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied ✓");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("Copied ✓"); } catch { toast("Copy failed"); }
      ta.remove();
    }
  }

  // One delegated handler for every copy button
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy], [data-copy-val]");
    if (!b) return;
    if (b.dataset.copyVal !== undefined) { copyText(b.dataset.copyVal); return; }
    const root = b.closest(".tool") || document;
    const t = root.querySelector(b.dataset.copy);
    if (t) copyText("value" in t ? t.value : t.textContent);
  });

  function status(el, kind, msg) {
    el.className = "status" + (kind ? " " + kind : "");
    el.textContent = msg || "";
  }

  function seg(root, onChange) {
    const buttons = [...root.querySelectorAll("button")];
    let val = (buttons.find((b) => b.classList.contains("on")) || buttons[0]).dataset.v;
    buttons.forEach((b) => b.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.toggle("on", x === b));
      val = b.dataset.v;
      onChange(val);
    }));
    return () => val;
  }

  function kv(box, rows) {
    box.textContent = "";
    rows.forEach(([k, v]) => {
      const row = document.createElement("div");
      row.className = "row";
      const ke = document.createElement("span"); ke.className = "k"; ke.textContent = k;
      const ve = document.createElement("code"); ve.className = "v"; ve.textContent = v;
      const b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = "Copy"; b.dataset.copyVal = v;
      row.append(ke, ve, b);
      box.appendChild(row);
    });
  }

  const sizeLabel = (n) => (n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB");
  const toHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

  /* =========================================================
     Tools — add yours by pushing an object to this array
     { id, name, icon, desc, keywords, mount(root) -> optional cleanup fn }
     ========================================================= */
  const TOOLS = [];

  /* ---------- JSON ---------- */
  TOOLS.push({
    id: "json", name: "JSON Formatter", icon: "{ }", desc: "Format, minify & validate JSON", keywords: "pretty print beautify lint parse",
    mount(r) {
      r.innerHTML = `
        <div class="split">
          <div class="pane"><div class="pane-h"><span>Input</span><button class="chip" id="sample">Sample</button><button class="chip" id="clear">Clear</button></div>
            <textarea id="in" spellcheck="false" placeholder="Paste JSON here…"></textarea></div>
          <div class="pane"><div class="pane-h"><span>Output</span><button class="chip" data-copy="#out">Copy</button></div>
            <textarea id="out" readonly spellcheck="false"></textarea></div>
        </div>
        <div class="bar">
          <button class="btn primary" id="fmt">Format</button><button class="btn" id="min">Minify</button>
          <label class="inline">Indent <select id="ind"><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tab</option></select></label>
          <label class="inline"><input type="checkbox" id="sort"> Sort keys</label>
          <span class="status" id="st"></span>
        </div>`;
      const q = Q(r);
      let minify = false;
      function run() {
        const src = q("#in").value;
        if (!src.trim()) { q("#out").value = ""; status(q("#st"), "", ""); return; }
        try {
          let v = JSON.parse(src);
          if (q("#sort").checked) v = L.sortKeys(v);
          const ind = q("#ind").value === "tab" ? "\t" : Number(q("#ind").value);
          q("#out").value = minify ? JSON.stringify(v) : JSON.stringify(v, null, ind);
          status(q("#st"), "ok", "✓ Valid JSON · " + sizeLabel(new Blob([q("#out").value]).size));
        } catch (e) {
          q("#out").value = "";
          status(q("#st"), "err", "✗ " + e.message);
        }
      }
      q("#fmt").addEventListener("click", () => { minify = false; run(); });
      q("#min").addEventListener("click", () => { minify = true; run(); });
      ["#in", "#ind", "#sort"].forEach((s) => q(s).addEventListener("input", run));
      q("#clear").addEventListener("click", () => { q("#in").value = ""; run(); q("#in").focus(); });
      q("#sample").addEventListener("click", () => {
        q("#in").value = '{"name":"DevDock","tools":11,"offline":true,"tags":["json","jwt","regex"],"author":{"name":"You","stars":9999}}';
        run();
      });
      q("#in").focus();
    },
  });

  /* ---------- Base64 ---------- */
  TOOLS.push({
    id: "base64", name: "Base64 Encode / Decode", icon: "64", desc: "UTF-8 safe, with URL-safe mode", keywords: "encode decode atob btoa",
    mount(r) {
      r.innerHTML = `
        <div class="bar"><div class="seg" id="mode"><button data-v="encode" class="on">Encode</button><button data-v="decode">Decode</button></div>
          <label class="inline"><input type="checkbox" id="safe"> URL-safe</label><span class="status" id="st"></span></div>
        <div class="split">
          <div class="pane"><div class="pane-h"><span>Input</span><button class="chip" id="swap">⇄ Swap</button></div>
            <textarea id="in" spellcheck="false" placeholder="Type or paste text…"></textarea></div>
          <div class="pane"><div class="pane-h"><span>Output</span><button class="chip" data-copy="#out">Copy</button></div>
            <textarea id="out" readonly spellcheck="false"></textarea></div>
        </div>`;
      const q = Q(r);
      const mode = seg(q("#mode"), run);
      function run() {
        const src = q("#in").value;
        if (!src) { q("#out").value = ""; status(q("#st"), "", ""); return; }
        try {
          q("#out").value = mode() === "encode" ? L.b64encode(src, q("#safe").checked) : L.b64decode(src);
          status(q("#st"), "ok", "✓ Done");
        } catch {
          q("#out").value = "";
          status(q("#st"), "err", "✗ Not valid Base64 (or not valid UTF-8 text)");
        }
      }
      q("#in").addEventListener("input", run);
      q("#safe").addEventListener("change", run);
      q("#swap").addEventListener("click", () => {
        const o = q("#out").value;
        if (!o) return;
        q("#in").value = o;
        q("#mode button:not(.on)").click();
      });
      q("#in").focus();
    },
  });

  /* ---------- URL ---------- */
  TOOLS.push({
    id: "url", name: "URL Encode / Decode", icon: "%20", desc: "Percent-encode text or whole URLs", keywords: "uri component escape query string",
    mount(r) {
      r.innerHTML = `
        <div class="bar"><div class="seg" id="mode"><button data-v="encode" class="on">Encode</button><button data-v="decode">Decode</button></div>
          <label class="inline"><input type="checkbox" id="full"> Keep URL structure (<code>: / ? #</code>)</label><span class="status" id="st"></span></div>
        <div class="split">
          <div class="pane"><div class="pane-h"><span>Input</span></div><textarea id="in" class="short" spellcheck="false" placeholder="hello world & café"></textarea></div>
          <div class="pane"><div class="pane-h"><span>Output</span><button class="chip" data-copy="#out">Copy</button></div><textarea id="out" class="short" readonly></textarea></div>
        </div>`;
      const q = Q(r);
      const mode = seg(q("#mode"), run);
      function run() {
        const src = q("#in").value;
        if (!src) { q("#out").value = ""; status(q("#st"), "", ""); return; }
        try {
          const full = q("#full").checked;
          q("#out").value = mode() === "encode" ? (full ? encodeURI(src) : encodeURIComponent(src)) : (full ? decodeURI(src) : decodeURIComponent(src));
          status(q("#st"), "ok", "✓ Done");
        } catch {
          q("#out").value = "";
          status(q("#st"), "err", "✗ Malformed URL escape sequence");
        }
      }
      q("#in").addEventListener("input", run);
      q("#full").addEventListener("change", run);
      q("#in").focus();
    },
  });

  /* ---------- JWT ---------- */
  TOOLS.push({
    id: "jwt", name: "JWT Decoder", icon: "JWT", desc: "Inspect header, payload & expiry", keywords: "json web token bearer auth claims",
    mount(r) {
      r.innerHTML = `
        <div class="pane"><div class="pane-h"><span>Encoded token</span><button class="chip" id="sample">Sample</button></div>
          <textarea id="in" class="short" spellcheck="false" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"></textarea></div>
        <div class="bar"><span class="badge" id="badge"></span><span class="status" id="st"></span></div>
        <div class="split">
          <div class="pane"><div class="pane-h"><span>Header</span><button class="chip" data-copy="#h">Copy</button></div><textarea id="h" class="short" readonly></textarea></div>
          <div class="pane"><div class="pane-h"><span>Payload</span><button class="chip" data-copy="#p">Copy</button></div><textarea id="p" class="short" readonly></textarea></div>
        </div>
        <div class="pane"><div class="pane-h"><span>Time claims</span></div><div id="claims" class="kv"></div></div>
        <p class="note">🔒 Decoded locally in your browser. The signature is <b>not verified</b> — never trust a token just because it decodes.</p>`;
      const q = Q(r);
      function run() {
        const src = q("#in").value.trim();
        const badge = q("#badge");
        badge.className = "badge"; badge.textContent = "";
        q("#claims").textContent = "";
        if (!src) { q("#h").value = q("#p").value = ""; status(q("#st"), "", ""); return; }
        try {
          const { header, payload } = L.decodeJwt(src);
          q("#h").value = JSON.stringify(header, null, 2);
          q("#p").value = JSON.stringify(payload, null, 2);
          status(q("#st"), "ok", "✓ Decoded");
          const now = Date.now() / 1000;
          const rows = [];
          [["iat", "Issued at"], ["nbf", "Not before"], ["exp", "Expires"]].forEach(([key, label]) => {
            if (typeof payload[key] === "number") {
              rows.push([label, new Date(payload[key] * 1000).toLocaleString() + "  (" + L.relativeTime(payload[key] - now) + ")"]);
            }
          });
          kv(q("#claims"), rows);
          if (typeof payload.exp === "number") {
            const expired = payload.exp < now;
            badge.className = "badge " + (expired ? "err" : "ok");
            badge.textContent = expired ? "Expired" : "Not expired";
          }
        } catch (e) {
          q("#h").value = q("#p").value = "";
          status(q("#st"), "err", "✗ " + e.message);
        }
      }
      q("#in").addEventListener("input", run);
      q("#sample").addEventListener("click", () => {
        const now = Math.floor(Date.now() / 1000);
        const h = L.b64encode(JSON.stringify({ alg: "HS256", typ: "JWT" }), true);
        const p = L.b64encode(JSON.stringify({ sub: "1234567890", name: "Jane Dev", admin: true, iat: now, exp: now + 3600 }), true);
        q("#in").value = `${h}.${p}.c2lnbmF0dXJl`;
        run();
      });
      q("#in").focus();
    },
  });

  /* ---------- Hash ---------- */
  TOOLS.push({
    id: "hash", name: "Hash Generator", icon: "#", desc: "SHA-1 / 256 / 384 / 512 for text & files", keywords: "sha checksum digest crypto file",
    mount(r) {
      r.innerHTML = `
        <div class="pane"><div class="pane-h"><span>Text</span><label class="chip">📁 Hash a file<input type="file" id="file" hidden></label></div>
          <textarea id="in" class="short" spellcheck="false" placeholder="Type text, or choose a file…"></textarea></div>
        <div class="bar"><span class="status" id="st"></span></div>
        <div id="rows" class="kv"></div>`;
      const q = Q(r);
      const ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
      let token = 0;
      async function compute(buf, label) {
        const mine = ++token;
        if (!(window.crypto && crypto.subtle)) {
          status(q("#st"), "err", "✗ Web Crypto needs https:// or localhost");
          return;
        }
        const digests = await Promise.all(ALGOS.map((a) => crypto.subtle.digest(a, buf)));
        if (mine !== token) return; // a newer request superseded this one
        kv(q("#rows"), ALGOS.map((a, i) => [a, toHex(digests[i])]));
        status(q("#st"), "ok", "✓ " + label);
      }
      function fromText() {
        const v = q("#in").value;
        if (!v) { token++; q("#rows").textContent = ""; status(q("#st"), "", ""); return; }
        compute(new TextEncoder().encode(v), "Hashed " + sizeLabel(new Blob([v]).size) + " of text");
      }
      q("#in").addEventListener("input", fromText);
      q("#file").addEventListener("change", async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        q("#in").value = "";
        status(q("#st"), "", "Hashing " + f.name + "…");
        compute(await f.arrayBuffer(), f.name + " · " + sizeLabel(f.size));
      });
      q("#in").focus();
    },
  });

  /* ---------- UUID ---------- */
  TOOLS.push({
    id: "uuid", name: "UUID Generator", icon: "ID", desc: "Cryptographically secure v4 UUIDs", keywords: "guid unique identifier random",
    mount(r) {
      r.innerHTML = `
        <div class="bar">
          <label class="inline">Count <input type="number" id="n" class="inp" min="1" max="100" value="5"></label>
          <label class="inline"><input type="checkbox" id="up"> Uppercase</label>
          <label class="inline"><input type="checkbox" id="nd"> No hyphens</label>
          <button class="btn primary" id="go">Generate</button><button class="btn" data-copy="#out">Copy all</button>
        </div>
        <textarea id="out" class="tall" readonly spellcheck="false"></textarea>
        <p class="note">UUID v4 generated with the browser's secure random generator (<code>crypto.getRandomValues</code>).</p>`;
      const q = Q(r);
      function gen() {
        const n = Math.min(100, Math.max(1, parseInt(q("#n").value, 10) || 1));
        const ids = Array.from({ length: n }, () => {
          let id = L.uuidv4((b) => crypto.getRandomValues(b));
          if (q("#nd").checked) id = id.replace(/-/g, "");
          return q("#up").checked ? id.toUpperCase() : id;
        });
        q("#out").value = ids.join("\n");
      }
      q("#go").addEventListener("click", gen);
      ["#up", "#nd", "#n"].forEach((s) => q(s).addEventListener("change", gen));
      gen();
    },
  });

  /* ---------- Password ---------- */
  TOOLS.push({
    id: "password", name: "Password Generator", icon: "***", desc: "Strong random passwords with entropy meter", keywords: "secure random strength generator passphrase",
    mount(r) {
      r.innerHTML = `
        <div class="pwbox"><code class="pw" id="pw"></code><button class="btn" data-copy="#pw">Copy</button><button class="btn primary" id="go">↻ New</button></div>
        <div class="meter"><div id="bar"></div></div><div class="status" id="st"></div>
        <div class="opts">
          <label class="inline wide">Length <b id="lv">20</b><input type="range" id="len" min="8" max="64" value="20"></label>
          <label class="inline"><input type="checkbox" id="lower" checked> a–z</label>
          <label class="inline"><input type="checkbox" id="upper" checked> A–Z</label>
          <label class="inline"><input type="checkbox" id="digits" checked> 0–9</label>
          <label class="inline"><input type="checkbox" id="symbols" checked> !@#$</label>
          <label class="inline"><input type="checkbox" id="amb"> Avoid look-alikes (O0Il1)</label>
        </div>
        <p class="note">Generated locally with rejection sampling on <code>crypto.getRandomValues</code> — no modulo bias, nothing is stored or sent.</p>`;
      const q = Q(r);
      function gen() {
        q("#lv").textContent = q("#len").value;
        try {
          const { password, entropy } = L.makePassword(Number(q("#len").value), {
            lower: q("#lower").checked, upper: q("#upper").checked, digits: q("#digits").checked,
            symbols: q("#symbols").checked, noAmbiguous: q("#amb").checked,
          }, (n) => L.secureInt(n));
          const [label, kind] = entropy < 40 ? ["Weak", "err"] : entropy < 60 ? ["Fair", "warn"] : entropy < 90 ? ["Strong", "ok"] : ["Excellent", "ok"];
          q("#pw").textContent = password;
          q("#bar").style.width = Math.min(100, (entropy / 128) * 100) + "%";
          q("#bar").className = kind;
          status(q("#st"), kind, `${label} · ${Math.round(entropy)} bits of entropy`);
        } catch (e) {
          q("#pw").textContent = "";
          q("#bar").style.width = "0";
          status(q("#st"), "err", "✗ " + e.message);
        }
      }
      r.querySelectorAll("input").forEach((i) => { i.addEventListener("input", gen); i.addEventListener("change", gen); });
      q("#go").addEventListener("click", gen);
      gen();
    },
  });

  /* ---------- Timestamp ---------- */
  TOOLS.push({
    id: "timestamp", name: "Unix Timestamp", icon: "⏱", desc: "Convert epoch ↔ human dates", keywords: "epoch time date unix seconds milliseconds iso",
    mount(r) {
      r.innerHTML = `
        <div class="now"><div><span class="k">Current Unix time (seconds)</span><div class="big" id="now">0</div></div><button class="btn" data-copy="#now">Copy</button></div>
        <div class="split">
          <div class="pane"><div class="pane-h"><span>Timestamp → Date</span><button class="chip" id="usenow">Use now</button></div>
            <input type="text" id="ts" class="inp mono" placeholder="1700000000 or 1700000000000" inputmode="numeric" spellcheck="false">
            <div class="status" id="st1"></div><div id="out1" class="kv"></div></div>
          <div class="pane"><div class="pane-h"><span>Date → Timestamp</span></div>
            <input type="datetime-local" id="dt" class="inp" step="1">
            <div id="out2" class="kv"></div></div>
        </div>`;
      const q = Q(r);
      const tick = () => { q("#now").textContent = Math.floor(Date.now() / 1000); };
      tick();
      const timer = setInterval(tick, 1000);

      function fromTs() {
        const raw = q("#ts").value.trim();
        q("#out1").textContent = "";
        if (!raw) { status(q("#st1"), "", ""); return; }
        const n = Number(raw);
        if (!Number.isFinite(n)) { status(q("#st1"), "err", "✗ Enter a number"); return; }
        const isSec = Math.abs(n) < 1e11;
        const ms = isSec ? n * 1000 : n;
        const d = new Date(ms);
        if (isNaN(d.getTime())) { status(q("#st1"), "err", "✗ Out of range"); return; }
        status(q("#st1"), "ok", "Detected " + (isSec ? "seconds" : "milliseconds"));
        kv(q("#out1"), [
          ["ISO 8601", d.toISOString()],
          ["UTC", d.toUTCString()],
          ["Local", d.toString()],
          ["Relative", L.relativeTime((ms - Date.now()) / 1000)],
        ]);
      }
      function fromDt() {
        const v = q("#dt").value;
        q("#out2").textContent = "";
        if (!v) return;
        const d = new Date(v);
        if (isNaN(d.getTime())) return;
        kv(q("#out2"), [
          ["Unix (s)", String(Math.floor(d.getTime() / 1000))],
          ["Unix (ms)", String(d.getTime())],
          ["ISO 8601 (UTC)", d.toISOString()],
        ]);
      }
      q("#ts").addEventListener("input", fromTs);
      q("#dt").addEventListener("input", fromDt);
      q("#usenow").addEventListener("click", () => { q("#ts").value = Math.floor(Date.now() / 1000); fromTs(); });
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      q("#dt").value = d.toISOString().slice(0, 19);
      fromDt();
      return () => clearInterval(timer);
    },
  });

  /* ---------- Color ---------- */
  TOOLS.push({
    id: "color", name: "Color Converter", icon: "🎨", desc: "HEX ↔ RGB ↔ HSL with contrast check", keywords: "hex rgb hsl picker wcag accessibility css",
    mount(r) {
      r.innerHTML = `
        <div class="colorgrid">
          <div class="swatch-big" id="sw"></div>
          <div class="colorin">
            <div class="line"><input type="text" id="in" class="inp mono" value="#7c5cff" spellcheck="false" placeholder="#7c5cff · rgb(124,92,255) · hsl(252,100%,68%)"><input type="color" id="pick" value="#7c5cff" aria-label="Color picker"></div>
            <div class="status" id="st"></div>
            <div id="rows" class="kv"></div>
            <div class="pane-h"><span>Contrast (WCAG)</span></div>
            <div id="wcag" class="wcag"></div>
          </div>
        </div>`;
      const q = Q(r);
      function render(rgb) {
        const hex = L.rgbToHex(rgb.r, rgb.g, rgb.b);
        const hsl = L.rgbToHsl(rgb.r, rgb.g, rgb.b);
        q("#sw").style.background = hex;
        kv(q("#rows"), [
          ["HEX", hex],
          ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
          ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
          ["Tailwind", `bg-[${hex}]`],
        ]);
        const w = q("#wcag");
        w.textContent = "";
        [["White text", { r: 255, g: 255, b: 255 }, "#fff"], ["Black text", { r: 0, g: 0, b: 0 }, "#000"]].forEach(([label, fg, css]) => {
          const ratio = L.contrast(rgb, fg);
          const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail";
          const d = document.createElement("div");
          d.className = "wc";
          d.style.background = hex;
          d.style.color = css;
          d.textContent = `${label} · ${ratio.toFixed(2)}:1 · ${grade}`;
          w.appendChild(d);
        });
        return hex;
      }
      function fromText() {
        const rgb = L.parseColor(q("#in").value);
        if (!rgb) { status(q("#st"), "err", "✗ Try #7c5cff, rgb(124, 92, 255) or hsl(252, 100%, 68%)"); return; }
        status(q("#st"), "", "");
        q("#pick").value = render(rgb);
      }
      q("#in").addEventListener("input", fromText);
      q("#pick").addEventListener("input", () => { q("#in").value = q("#pick").value; fromText(); });
      fromText();
    },
  });

  /* ---------- Regex ---------- */
  TOOLS.push({
    id: "regex", name: "Regex Tester", icon: ".*", desc: "Live matches, groups & highlighting", keywords: "regular expression pattern match test groups",
    mount(r) {
      r.innerHTML = `
        <div class="pane"><div class="pane-h"><span>Pattern</span></div>
          <div class="rx"><span>/</span><input id="pat" class="inp mono" spellcheck="false" placeholder="e.g. (\\d+)-(\\d+)"><span>/</span><input id="flags" class="inp mono flags" value="gi" maxlength="6" spellcheck="false" aria-label="Flags"></div>
          <div class="status" id="st"></div></div>
        <div class="split">
          <div class="pane"><div class="pane-h"><span>Test string</span></div><textarea id="txt" spellcheck="false"></textarea></div>
          <div class="pane"><div class="pane-h"><span>Matches <b id="cnt"></b></span></div><div class="hl" id="hl"></div></div>
        </div>
        <div class="pane"><div class="pane-h"><span>Match details</span></div><div id="groups" class="kv"></div></div>`;
      const q = Q(r);
      q("#pat").value = String.raw`(\w+)@(\w+)\.\w+`;
      q("#txt").value = "Reach us at hello@devdock.io or support@example.com.\nNot an email: nope@ and @nope.";
      function run() {
        const hl = q("#hl");
        hl.textContent = "";
        q("#groups").textContent = "";
        q("#cnt").textContent = "";
        const pat = q("#pat").value;
        const txt = q("#txt").value;
        if (!pat) { hl.textContent = txt; status(q("#st"), "", ""); return; }
        let re;
        try {
          const f = q("#flags").value;
          re = new RegExp(pat, f.includes("g") ? f : f + "g");
        } catch (e) {
          hl.textContent = txt;
          status(q("#st"), "err", "✗ " + e.message);
          return;
        }
        const matches = [];
        for (const m of txt.matchAll(re)) { matches.push(m); if (matches.length >= 1000) break; }
        status(q("#st"), matches.length ? "ok" : "warn", matches.length ? "✓ Valid pattern" : "No matches");
        q("#cnt").textContent = matches.length ? "(" + matches.length + ")" : "";
        let pos = 0;
        matches.forEach((m) => {
          if (!m[0]) return; // skip zero-length matches
          if (m.index > pos) hl.appendChild(document.createTextNode(txt.slice(pos, m.index)));
          const mark = document.createElement("mark");
          mark.textContent = m[0];
          hl.appendChild(mark);
          pos = m.index + m[0].length;
        });
        hl.appendChild(document.createTextNode(txt.slice(pos)));
        const rows = [];
        matches.slice(0, 40).forEach((m, i) => {
          rows.push([`#${i + 1} @ ${m.index}`, m[0] === "" ? "(empty match)" : m[0]]);
          for (let g = 1; g < m.length; g++) rows.push([`   ↳ group ${g}`, m[g] === undefined ? "undefined" : m[g]]);
        });
        kv(q("#groups"), rows);
      }
      ["#pat", "#flags", "#txt"].forEach((s) => q(s).addEventListener("input", run));
      run();
    },
  });

  /* ---------- Case converter ---------- */
  TOOLS.push({
    id: "case", name: "Case Converter", icon: "Aa", desc: "camelCase, snake_case, kebab-case & more", keywords: "camel snake kebab pascal constant title slug naming",
    mount(r) {
      r.innerHTML = `
        <div class="pane"><div class="pane-h"><span>Text</span></div>
          <textarea id="in" class="short" spellcheck="false" placeholder="hello big_world-example"></textarea></div>
        <div id="rows" class="kv"></div>`;
      const q = Q(r);
      const LABELS = [["camel", "camelCase"], ["pascal", "PascalCase"], ["snake", "snake_case"], ["kebab", "kebab-case"], ["constant", "CONSTANT_CASE"],
        ["dot", "dot.case"], ["title", "Title Case"], ["sentence", "Sentence case"], ["upper", "UPPER CASE"], ["lower", "lower case"]];
      function run() {
        const v = q("#in").value;
        if (!v.trim()) { q("#rows").textContent = ""; return; }
        const c = L.caseConvert(v);
        kv(q("#rows"), LABELS.map(([k, label]) => [label, c[k]]));
      }
      q("#in").addEventListener("input", run);
      q("#in").value = "devDock makes_developers-happy";
      run();
      q("#in").focus();
    },
  });

  /* =========================================================
     Router, navigation & home
     ========================================================= */
  const view = $("#view");
  let cleanup = null;

  function buildNav() {
    const ul = $("#navList");
    TOOLS.forEach((t) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "item"; a.href = "#" + t.id; a.dataset.id = t.id;
      const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = t.icon;
      const nm = document.createElement("span"); nm.textContent = t.name;
      a.append(ic, nm); li.appendChild(a); ul.appendChild(li);
    });
  }

  function setActive(id) {
    document.querySelectorAll("#navList a").forEach((a) => a.classList.toggle("active", a.dataset.id === id));
  }

  function renderHome() {
    const w = document.createElement("section");
    w.className = "home";
    w.innerHTML = `
      <div class="hero">
        <span class="pill">100% offline · no tracking · open source</span>
        <h1>Every dev tool you need.<br><span class="grad">One tab. Zero servers.</span></h1>
        <p>${TOOLS.length} fast, private utilities for everyday development. Your data never leaves the browser.</p>
        <div class="cta">
          <button class="btn primary" id="homeSearch">🔍 Search tools <kbd data-kbd>${MOD} K</kbd></button>
          <a class="btn" href="${REPO}" target="_blank" rel="noopener">⭐ Star on GitHub</a>
        </div>
      </div>
      <div class="cards" id="cards"></div>`;
    view.appendChild(w);
    const cards = $("#cards", w);
    TOOLS.forEach((t) => {
      const a = document.createElement("a");
      a.className = "card"; a.href = "#" + t.id;
      const ic = document.createElement("span"); ic.className = "tool-ic"; ic.textContent = t.icon;
      const h = document.createElement("h3"); h.textContent = t.name;
      const p = document.createElement("p"); p.textContent = t.desc;
      a.append(ic, h, p); cards.appendChild(a);
    });
    $("#homeSearch", w).addEventListener("click", openPalette);
  }

  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    document.body.classList.remove("nav-open");
    view.textContent = "";
    const id = location.hash.slice(1);
    const tool = TOOLS.find((t) => t.id === id);
    if (!tool) {
      renderHome();
      setActive(null);
      document.title = "DevDock — Offline Developer Toolbox";
      window.scrollTo(0, 0);
      return;
    }
    const wrap = document.createElement("section");
    wrap.className = "tool";
    const head = document.createElement("header");
    head.className = "tool-h";
    const ic = document.createElement("span"); ic.className = "tool-ic"; ic.textContent = tool.icon;
    const txt = document.createElement("div");
    const h1 = document.createElement("h1"); h1.textContent = tool.name;
    const p = document.createElement("p"); p.textContent = tool.desc;
    txt.append(h1, p); head.append(ic, txt);
    const body = document.createElement("div");
    body.className = "tool-body";
    wrap.append(head, body);
    view.appendChild(wrap);
    cleanup = tool.mount(body) || null;
    setActive(id);
    document.title = tool.name + " · DevDock";
    window.scrollTo(0, 0);
  }

  /* =========================================================
     Command palette (Ctrl/⌘ + K)
     ========================================================= */
  const pal = { box: $("#palette"), input: $("#palInput"), list: $("#palList"), items: [], idx: 0 };

  function palSelect(i) {
    pal.idx = i;
    [...pal.list.children].forEach((li, n) => li.classList.toggle("on", n === i));
    const cur = pal.list.children[i];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
  }

  function palRender() {
    const words = pal.input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    pal.items = TOOLS.filter((t) => {
      const hay = (t.name + " " + t.desc + " " + t.keywords + " " + t.id).toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    pal.list.textContent = "";
    if (!pal.items.length) {
      const li = document.createElement("li");
      li.className = "none"; li.textContent = "No tools match";
      pal.list.appendChild(li);
      return;
    }
    pal.items.forEach((t, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = t.icon;
      const col = document.createElement("div");
      const name = document.createElement("div"); name.className = "t"; name.textContent = t.name;
      const desc = document.createElement("div"); desc.className = "d"; desc.textContent = t.desc;
      col.append(name, desc); li.append(ic, col);
      li.addEventListener("click", () => palGo(t));
      li.addEventListener("mousemove", () => { if (pal.idx !== i) palSelect(i); });
      pal.list.appendChild(li);
    });
    palSelect(0);
  }

  function openPalette() {
    pal.box.hidden = false;
    pal.input.value = "";
    palRender();
    pal.input.focus();
  }
  function closePalette() { pal.box.hidden = true; }
  function palGo(t) { closePalette(); location.hash = t.id; }

  pal.input.addEventListener("input", palRender);
  pal.input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (pal.items.length) palSelect((pal.idx + 1) % pal.items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (pal.items.length) palSelect((pal.idx - 1 + pal.items.length) % pal.items.length); }
    else if (e.key === "Enter") { e.preventDefault(); if (pal.items[pal.idx]) palGo(pal.items[pal.idx]); }
  });
  pal.box.addEventListener("mousedown", (e) => { if (e.target === pal.box) closePalette(); });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      pal.box.hidden ? openPalette() : closePalette();
    } else if (e.key === "Escape" && !pal.box.hidden) {
      closePalette();
    } else if (e.key === "/" && !typing && pal.box.hidden) {
      e.preventDefault();
      openPalette();
    }
  });

  /* =========================================================
     Chrome: theme, mobile nav, kbd labels, service worker
     ========================================================= */
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("dd.theme", next);
  });
  $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $("#paletteBtn").addEventListener("click", openPalette);
  document.querySelectorAll("[data-kbd]").forEach((k) => { k.textContent = MOD + " K"; });
  $(".nav-foot a").href = REPO;
  $(".star").href = REPO;

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is optional */ });
  }

  buildNav();
  window.addEventListener("hashchange", route);
  route();
})();
