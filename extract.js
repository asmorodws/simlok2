#!/usr/bin/env node

/**
 * Script: extract.js
 * Fungsi: Ekstrak struktur folder + isi file project Next.js ke JSON
 * Target khusus: folder `src`
 * Format output: project_dump.json
 */

const fs = require("fs");
const path = require("path");

// Folder root project → langsung ke folder src
const rootDir = path.join(process.cwd(), "src");

// Ekstensi file yang diambil
const allowedExt = [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".md"];

// Folder yang dilewati
const ignoredDirs = ["node_modules", ".next", ".git", "dist", "build", "out"];

// Fungsi rekursif: baca folder
function readDirRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries
    .filter((e) => !ignoredDirs.includes(e.name)) // skip folder tertentu
    .map((entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return {
          type: "directory",
          name: entry.name,
          children: readDirRecursive(fullPath),
        };
      } else {
        const ext = path.extname(entry.name);
        if (allowedExt.includes(ext)) {
          return {
            type: "file",
            name: entry.name,
            content: fs.readFileSync(fullPath, "utf8"),
          };
        }
      }
    })
    .filter(Boolean);
}

// Jalankan ekstraksi
function extractProject() {
  const structure = {
    root: "src",
    children: readDirRecursive(rootDir),
  };

  fs.writeFileSync("project_dump.json", JSON.stringify(structure, null, 2), "utf8");
  console.log("✅ Ekstraksi folder src selesai → project_dump.json");
}

// Run
extractProject();
