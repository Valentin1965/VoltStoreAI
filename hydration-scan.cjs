const fs = require("fs");
const path = require("path");

const ROOT = ".";

const PATTERNS = [
  { name: "Date constructor", regex: /new Date\s*\(/g },
  { name: "Date.now()", regex: /Date\.now\s*\(/g },
  { name: "Math.random()", regex: /Math\.random\s*\(/g },
  { name: "performance.now()", regex: /performance\.now\s*\(/g },
  { name: "UUID / nanoid", regex: /(uuid|nanoid)\s*\(/gi },
  { name: "window usage", regex: /window\./g },
  { name: "document usage", regex: /document\./g },
  { name: "localStorage usage", regex: /localStorage\./g },
  { name: "navigator usage", regex: /navigator\./g },
  { name: "toLocaleString (timezone risk)", regex: /toLocaleString\s*\(/g },
  { name: "toLocaleDateString", regex: /toLocaleDateString\s*\(/g },
  { name: "Intl.DateTimeFormat", regex: /Intl\.DateTimeFormat/g },
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  PATTERNS.forEach((pattern) => {
    if (pattern.regex.test(content)) {
      console.log(`⚠ ${pattern.name}`);
      console.log(`   ${filePath}`);
    }
  });
}

function walk(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(full)) scanFile(full);
  });
}

console.log("🔍 Hydration Risk Scan Started\n");
walk(ROOT);
console.log("\n✅ Scan Finished");
