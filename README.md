<div align="center">

# ⌘ DevDock

### Every dev tool you need. One tab. Zero servers.

11 fast, private developer utilities that run **entirely in your browser** and work **offline**.
No ads. No tracking. No dependencies. No build step.

[![Live Demo](https://img.shields.io/badge/▶_live_demo-7c5cff?style=for-the-badge)](https://YOUR-USERNAME.github.io/devdock/)
[![CI](https://img.shields.io/github/actions/workflow/status/YOUR-USERNAME/devdock/ci.yml?style=for-the-badge&label=tests)](https://github.com/YOUR-USERNAME/devdock/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-22d3ee?style=for-the-badge)](LICENSE)
![Dependencies](https://img.shields.io/badge/dependencies-0-34d399?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-installable-fbbf24?style=for-the-badge)

<!-- 👉 Add a screenshot or GIF here — it is the single biggest boost to stars:
![DevDock demo](docs/demo.gif)
-->

**If DevDock saves you a Google search, please consider giving it a ⭐ — it really helps!**

</div>

---

## ✨ Why DevDock?

Most online "dev tools" sites are slow, ad-filled, and send whatever you paste to a server.
DevDock is the opposite:

| | DevDock | Typical online tools |
|---|:---:|:---:|
| Works offline | ✅ | ❌ |
| Your data stays in the browser | ✅ | ❓ |
| No ads / trackers | ✅ | ❌ |
| Keyboard-first (`Ctrl+K`) | ✅ | ❌ |
| Installable app (PWA) | ✅ | ❌ |
| Open source & hackable | ✅ | ❌ |

## 🧰 Tools

| Tool | What it does |
|---|---|
| **{ } JSON Formatter** | Format, minify, validate, sort keys, custom indent |
| **64 Base64** | UTF-8 safe encode/decode, URL-safe mode, one-click swap |
| **%20 URL Encode/Decode** | `encodeURIComponent` or whole-URL mode |
| **JWT Decoder** | Header, payload, `iat`/`nbf`/`exp` with expiry badge |
| **# Hash Generator** | SHA-1/256/384/512 for text **and files** (Web Crypto) |
| **ID UUID Generator** | Secure v4 UUIDs, bulk, uppercase, no-hyphen |
| **\*\*\* Password Generator** | Unbiased CSPRNG, entropy meter, avoid look-alikes |
| **⏱ Unix Timestamp** | Epoch ↔ date, auto-detects seconds vs milliseconds |
| **🎨 Color Converter** | HEX ↔ RGB ↔ HSL, picker, WCAG contrast check |
| **.\* Regex Tester** | Live highlighting, capture groups, flags |
| **Aa Case Converter** | camel, Pascal, snake, kebab, CONSTANT, Title and more |

## ⌨️ Keyboard shortcuts

| Keys | Action |
|---|---|
| `Ctrl` / `⌘` + `K` | Open the command palette |
| `/` | Open the command palette (when not typing) |
| `↑` `↓` `Enter` | Navigate and open a tool |
| `Esc` | Close the palette |

## 🚀 Run it

```bash
git clone https://github.com/YOUR-USERNAME/devdock.git
cd devdock
python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000
```

No `npm install`. No bundler. It is plain HTML, CSS and JavaScript.

Run the tests (Node 18+):

```bash
npm test
```

## 🌐 Deploy free on GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The included workflow publishes your site automatically.

## 🧩 Add your own tool in ~20 lines

Every tool is just an object in the `TOOLS` array in [`app.js`](app.js):

```js
TOOLS.push({
  id: "reverse",
  name: "Reverse Text",
  icon: "↔",
  desc: "Reverse any string",
  keywords: "flip mirror backwards",
  mount(root) {
    root.innerHTML = `
      <textarea id="in" class="short" placeholder="Type something…"></textarea>
      <textarea id="out" class="short" readonly></textarea>
      <button class="btn" data-copy="#out">Copy</button>`;
    const q = (s) => root.querySelector(s);
    q("#in").addEventListener("input", () => {
      q("#out").value = [...q("#in").value].reverse().join("");
    });
  },
});
```

It automatically appears in the sidebar, on the home page and in the `Ctrl+K` palette.
Pure logic lives in [`lib.js`](lib.js) so it can be unit-tested in Node — see [`tests/`](tests).

## 🔒 Privacy

DevDock has no backend. Nothing you paste is uploaded, logged or stored on a server.
The only thing saved locally is your theme choice (`localStorage`).

## 🛣️ Roadmap

- [ ] Diff checker
- [ ] YAML ↔ JSON converter
- [ ] Cron expression explainer
- [ ] QR code generator
- [ ] Markdown preview
- [ ] Share a tool's state via URL

Have a tool idea? [Open an issue](https://github.com/YOUR-USERNAME/devdock/issues/new?template=tool_request.md) — or send a PR!

## 🤝 Contributing

PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues: any item in the roadmap above.

## 📄 License

[MIT](LICENSE) — free for personal and commercial use.

<div align="center">

**Made something useful? Tell a friend, and drop a ⭐ on the repo.**

</div>
