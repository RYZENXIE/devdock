const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../lib.js");

test("base64 round-trips unicode and emoji", () => {
  const s = "Namaste 🙏 – नमस्ते";
  assert.equal(L.b64decode(L.b64encode(s)), s);
});

test("base64 known value and url-safe variant", () => {
  assert.equal(L.b64encode("hello"), "aGVsbG8=");
  assert.equal(L.b64encode("???>>>", true), "Pz8_Pj4-");
  assert.equal(L.b64decode("Pz8_Pj4-"), "???>>>");
});

test("base64 decode rejects garbage", () => {
  assert.throws(() => L.b64decode("%%%"));
});

test("sortKeys sorts nested objects but keeps array order", () => {
  const out = JSON.stringify(L.sortKeys({ b: 1, a: { d: 1, c: [3, 1, 2] } }));
  assert.equal(out, '{"a":{"c":[3,1,2],"d":1},"b":1}');
});

test("splitWords handles camel, acronyms, separators", () => {
  assert.deepEqual(L.splitWords("helloWorld_fooBar baz-qux"), ["hello", "World", "foo", "Bar", "baz", "qux"]);
  assert.deepEqual(L.splitWords("XMLHttpRequest"), ["XML", "Http", "Request"]);
});

test("caseConvert produces every style", () => {
  const c = L.caseConvert("hello big_world-example");
  assert.equal(c.camel, "helloBigWorldExample");
  assert.equal(c.pascal, "HelloBigWorldExample");
  assert.equal(c.snake, "hello_big_world_example");
  assert.equal(c.kebab, "hello-big-world-example");
  assert.equal(c.constant, "HELLO_BIG_WORLD_EXAMPLE");
  assert.equal(c.dot, "hello.big.world.example");
  assert.equal(c.title, "Hello Big World Example");
  assert.equal(c.sentence, "Hello big world example");
});

test("color conversions", () => {
  assert.deepEqual(L.hexToRgb("#fff"), { r: 255, g: 255, b: 255 });
  assert.deepEqual(L.hexToRgb("7c5cff"), { r: 124, g: 92, b: 255 });
  assert.equal(L.hexToRgb("nope"), null);
  assert.equal(L.rgbToHex(124, 92, 255), "#7c5cff");
  assert.deepEqual(L.hslToRgb(0, 100, 50), { r: 255, g: 0, b: 0 });
  const hsl = L.rgbToHsl(124, 92, 255);
  assert.ok(Math.abs(hsl.h - 252) <= 1 && hsl.s === 100 && hsl.l === 68);
});

test("parseColor accepts hex, rgb() and hsl()", () => {
  assert.deepEqual(L.parseColor("#0f0"), { r: 0, g: 255, b: 0 });
  assert.deepEqual(L.parseColor("rgb(10, 20, 30)"), { r: 10, g: 20, b: 30 });
  assert.deepEqual(L.parseColor("hsl(120, 100%, 50%)"), { r: 0, g: 255, b: 0 });
  assert.equal(L.parseColor("rgb(300, 0, 0)"), null);
  assert.equal(L.parseColor("not a color"), null);
});

test("contrast ratio black on white is 21", () => {
  const ratio = L.contrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 21) < 0.01);
});

test("decodeJwt reads header and payload", () => {
  const h = L.b64encode(JSON.stringify({ alg: "HS256", typ: "JWT" }), true);
  const p = L.b64encode(JSON.stringify({ sub: "42", name: "Jane" }), true);
  const out = L.decodeJwt(`${h}.${p}.sig`);
  assert.equal(out.header.alg, "HS256");
  assert.equal(out.payload.name, "Jane");
  assert.equal(out.signature, "sig");
  assert.throws(() => L.decodeJwt("only-one-part"));
});

test("relativeTime wording", () => {
  assert.equal(L.relativeTime(-90), "1 minute ago");
  assert.equal(L.relativeTime(7200), "in 2 hours");
  assert.equal(L.relativeTime(0), "in 0 seconds");
});

test("makePassword respects length and character classes", () => {
  let c = 0;
  const rng = (m) => (c++ * 7 + 3) % m;
  const { password, entropy } = L.makePassword(24, { lower: true, upper: true, digits: true, symbols: true }, rng);
  assert.equal(password.length, 24);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^a-zA-Z0-9]/);
  assert.ok(entropy > 100);
});

test("makePassword can exclude ambiguous characters and validates input", () => {
  const rng = (m) => Math.floor(Math.random() * m);
  for (let i = 0; i < 50; i++) {
    const { password } = L.makePassword(40, { lower: true, upper: true, digits: true, noAmbiguous: true }, rng);
    assert.doesNotMatch(password, /[O0Il1]/);
  }
  assert.throws(() => L.makePassword(10, {}, rng));
  assert.throws(() => L.makePassword(2, { lower: true, upper: true, digits: true }, rng));
});

test("uuidv4 has correct version/variant bits and format", () => {
  const id = L.uuidv4((b) => b.fill(255));
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("secureInt stays in range", () => {
  const fake = { getRandomValues: (a) => { a[0] = 4294967295; return a; } };
  for (let i = 0; i < 20; i++) {
    const n = L.secureInt(10, { getRandomValues: (a) => { a[0] = Math.floor(Math.random() * 4294967296); return a; } });
    assert.ok(n >= 0 && n < 10);
  }
  assert.ok(fake);
});
