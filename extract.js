#!/usr/bin/env node
/**
 * dump-nextjs.js
 * Ekstrak struktur & isi file kode proyek Next.js ke JSON yang mudah diproses.
 * Node.js >= 18
 *
 * Contoh:
 *   node dump-nextjs.js --root . --out project_dump.json --max-bytes 800000
 */

/**
 * dump-nextjs.js (versi CommonJS)
 */

const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");


// ---------- CLI PARSER SEDERHANA ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.startsWith("--") ? a.slice(2).split("=") : [a, true];
    return [k, v ?? true];
  })
);

const ROOT = path.resolve(args.root || ".");
const OUT = path.resolve(args.out || "project_dump.json");
const MAX_BYTES = Number(args["max-bytes"] || 0); // 0 = tanpa batas
const INCLUDE_TESTS = Boolean(args["include-tests"] || false);
const INCLUDE_STORIES = Boolean(args["include-stories"] || false);

// ---------- KONFIGURASI ----------
const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".vercel",
  ".turbo",
  ".cache",
  ".output",
  "coverage",
  "dist",
  "build",
  "out",
  ".pnpm-store",
  ".yarn",
  ".gradle",
  ".DS_Store",
]);

// Hanya file kode/konfigurasi yang relevan
const EXT_WHITELIST = new Set([
  ".ts", ".tsx", ".js", ".jsx",
  ".mjs", ".cjs",
  ".json",
  ".md", ".mdx",
  ".yml", ".yaml",
  ".css", ".scss",
  ".env.example", // contoh env (bukan rahasia)
  ".config.js", ".config.cjs", ".config.mjs", ".config.ts",
]);
const EXTRA_FILENAMES = new Set([
  "next.config.js", "next.config.mjs", "next.config.cjs", "next.config.ts",
  "tsconfig.json", "jsconfig.json",
  "package.json", "pnpm-workspace.yaml",
  "tailwind.config.js", "tailwind.config.ts",
  "postcss.config.js", "postcss.config.cjs", "postcss.config.mjs",
  ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json",
  ".prettierrc", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.json",
  ".npmrc", ".nvmrc",
]);

// Pola file yang biasanya tidak ingin diikutkan kecuali diminta
const TEST_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx|mjs|cjs)$/i,
  /\.spec\.(ts|tsx|js|jsx|mjs|cjs)$/i,
];
const STORY_PATTERNS = [/\.stories\.(ts|tsx|js|jsx|mdx)$/i];

// ---------- UTIL ----------
function isProbablyBinary(buf) {
  // Heuristik sederhana: cek karakter kontrol non-whitespace
  const text = buf.toString("utf8");
  const control = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
  return control.test(text);
}

function sha256(str) {
  return createHash("sha256").update(str).digest("hex");
}

function detectLang(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts") return "ts";
  if (ext === ".tsx") return "tsx";
  if (ext === ".js") return "js";
  if (ext === ".jsx") return "jsx";
  if (ext === ".mjs") return "mjs";
  if (ext === ".cjs") return "cjs";
  if (ext === ".json") return "json";
  if (ext === ".md") return "md";
  if (ext === ".mdx") return "mdx";
  if (ext === ".yml" || ext === ".yaml") return "yaml";
  if (ext === ".css") return "css";
  if (ext === ".scss") return "scss";
  if (filePath.endsWith("next.config.js")) return "js";
  if (filePath.endsWith("next.config.ts")) return "ts";
  return ext.replace(/^\./, "") || "txt";
}

function shouldIgnoreDir(dirName) {
  return DEFAULT_IGNORE_DIRS.has(dirName);
}

function isWhitelistedFile(filePath) {
  const base = path.basename(filePath);
  if (EXTRA_FILENAMES.has(base)) return true;

  // whitelist berbasis ekstensi (termasuk .env.example, .config.*)
  const ext = path.extname(base).toLowerCase();
  if (EXT_WHITELIST.has(ext)) return true;

  // file seperti "tailwind.config.js" sudah tercakup oleh EXTRA_FILENAMES
  // tambahkan pola config umum lain jika perlu

  // Khusus Next.js route handlers / middleware dll akan punya ekstensi ts/js juga
  return false;
}

function matchesAny(filePath, patterns) {
  return patterns.some((re) => re.test(filePath));
}

// ---------- WALKER ----------
async function* walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const res = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (shouldIgnoreDir(ent.name)) continue;
      yield* walk(res);
    } else if (ent.isFile()) {
      yield res;
    }
  }
}

// ---------- MAIN ----------
async function run() {
  const start = Date.now();

  const files = [];
  let totalBytes = 0;

  for await (const absPath of walk(ROOT)) {
    const relPath = path.relative(ROOT, absPath);

    // Saring file non-whitelist, tapi izinkan source code umum
    const ext = path.extname(absPath).toLowerCase();

    const looksLikeCode =
      [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".mdx", ".yml", ".yaml", ".css", ".scss"].includes(ext) ||
      EXTRA_FILENAMES.has(path.basename(absPath)) ||
      isWhitelistedFile(absPath);

    if (!looksLikeCode) continue;

    // Skip test/spec jika tidak diminta
    if (!INCLUDE_TESTS && matchesAny(relPath, TEST_PATTERNS)) continue;

    // Skip storybook jika tidak diminta
    if (!INCLUDE_STORIES && matchesAny(relPath, STORY_PATTERNS)) continue;

    // Hindari file .env asli (kecuali .env.example)
    const base = path.basename(absPath).toLowerCase();
    if (base === ".env" || base.startsWith(".env.")) continue;

    // Baca isi
    const buf = await fs.promises.readFile(absPath);
    // Skip binary
    if (isProbablyBinary(buf)) continue;

    const content = buf.toString("utf8");
    const size = Buffer.byteLength(content, "utf8");

    // Batas total ukuran output (jika diset)
    if (MAX_BYTES > 0 && totalBytes + size > MAX_BYTES) {
      // Jika melebihi, simpan versi terpotong agar tetap terindeks
      const allowance = Math.max(0, MAX_BYTES - totalBytes);
      const truncated = content.slice(0, allowance);
      files.push({
        path: relPath,
        lang: detectLang(relPath),
        size,
        lines: content.split("\n").length,
        hash: sha256(content),
        truncated: true,
        content: truncated,
      });
      totalBytes += allowance;
      break; // stop setelah batas tercapai
    } else {
      files.push({
        path: relPath,
        lang: detectLang(relPath),
        size,
        lines: content.split("\n").length,
        hash: sha256(content),
        truncated: false,
        content,
      });
      totalBytes += size;
    }
  }

  // Meta + heuristik Next.js
  const meta = {
    root: ROOT,
    generated_at_iso: new Date().toISOString(),
    total_files: files.length,
    total_bytes: totalBytes,
    options: {
      include_tests: INCLUDE_TESTS,
      include_stories: INCLUDE_STORIES,
      max_bytes: MAX_BYTES,
    },
    nextjs_hints: detectNextHints(files.map((f) => f.path)),
  };

  const payload = { meta, files };

  await fs.promises.writeFile(OUT, JSON.stringify(payload, null, 2), "utf8");

  console.log(
    `✅ Dump selesai: ${OUT}\n` +
      `   Files: ${files.length}\n` +
      `   Bytes: ${totalBytes}\n` +
      `   Waktu: ${((Date.now() - start) / 1000).toFixed(2)}s`
  );
}

function detectNextHints(paths) {
  const hasAppDir = paths.some((p) => p.split(path.sep).includes("app"));
  const hasPagesDir = paths.some((p) => p.split(path.sep).includes("pages"));
  const hasMiddleware = paths.some((p) => /(^|\/)middleware\.(t|j)s$/.test(p));
  const hasRouteHandlers = paths.some((p) => /(^|\/)route\.(t|j)s$/.test(p));
  const hasLayout = paths.some((p) => /(^|\/)layout\.(t|j)sx?$/.test(p));
  const hasPage = paths.some((p) => /(^|\/)page\.(t|j)sx?$/.test(p));
  return {
    hasAppDir,
    hasPagesDir,
    hasMiddleware,
    hasRouteHandlers,
    hasLayout,
    hasPage,
  };
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
