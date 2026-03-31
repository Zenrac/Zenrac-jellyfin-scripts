const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const JS_DIR = path.join(process.cwd(), "js");
const CSS_DIR = path.join(process.cwd(), "css");
const OUTPUT = path.join(process.cwd(), "combined.min.js");

(async () => {
  const files = fs.readdirSync(JS_DIR)
    .filter(f => f.endsWith(".js") && !f.endsWith(".min.js") && f !== "all.js")
    .sort();
  const cssEntries = fs.existsSync(CSS_DIR)
    ? fs.readdirSync(CSS_DIR)
      .filter(f => f.endsWith(".css"))
      .sort()
      .map(file => ({
        id: `minified-css-${path.basename(file, ".css")}`,
        css: fs.readFileSync(path.join(CSS_DIR, file), "utf8")
      }))
    : [];

  if (files.length === 0) {
    console.error("No JS files found.");
    process.exit(1);
  }

  let combined = "";
  if (cssEntries.length > 0) {
    const cssLoaderCode = `
(() => {
  if (!document.head) return;
  const entries = ${JSON.stringify(cssEntries)};
  entries.forEach(entry => {
    if (document.getElementById(entry.id)) return;
    const style = document.createElement("style");
    style.id = entry.id;
    style.textContent = entry.css;
    document.head.appendChild(style);
  });
})();
`;
    const cssLoaderMinified = await minify(cssLoaderCode, { compress: true, mangle: true });
    combined += cssLoaderMinified.code + "\n";
  }

  for (const file of files) {
    const code = fs.readFileSync(path.join(JS_DIR, file), "utf8");
    // Isolate each script scope so top-level const/let declarations
    // don't collide when files are concatenated into one bundle.
    const wrappedCode = `(()=>{\n${code}\n})();`;
    const result = await minify(wrappedCode, { compress: true, mangle: true });
    combined += result.code + "\n";
  }

  fs.writeFileSync(OUTPUT, combined);
  console.log("Done:", OUTPUT);
})();
