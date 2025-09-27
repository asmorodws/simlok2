const fs = require("fs");
const path = require("path");

const rootDir = process.cwd(); // direktori project sekarang
const outputFile = path.join(rootDir, "result.txt");
const excludeDirs = ["node_modules", ".next", ".git"]; // folder yang di-skip

// Ekstensi code yang di-izinkan
const allowedExt = [
  ".js", ".ts", ".tsx", ".jsx",
  ".json", ".md", ".css", ".scss",
  ".html", ".mjs", ".cjs"
];

function walkDir(dir, depth = 0) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (excludeDirs.includes(item.name)) continue;

    const fullPath = path.join(dir, item.name);
    const indent = "  ".repeat(depth);

    if (item.isDirectory()) {
      results.push(`${indent}[DIR] ${item.name}`);
      results = results.concat(walkDir(fullPath, depth + 1));
    } else {
      const ext = path.extname(item.name).toLowerCase();
      results.push(`${indent}[FILE] ${item.name}`);

      if (allowedExt.includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const indentedContent = content
            .split("\n")
            .map((line) => `${indent}    ${line}`)
            .join("\n");
          results.push(indentedContent);
        } catch (err) {
          results.push(`${indent}    [Gagal membaca isi file: ${err.message}]`);
        }
      } else {
        results.push(`${indent}    [File non-code, dilewati]`);
      }
    }
  }

  return results;
}

function main() {
  console.log("🔍 Mengekstrak struktur folder + isi file code...");
  const structure = walkDir(rootDir);
  fs.writeFileSync(outputFile, structure.join("\n"), "utf-8");
  console.log(`✅ Struktur & isi file code tersimpan di ${outputFile}`);
}

main();
