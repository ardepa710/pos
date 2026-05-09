/**
 * Regenerates the CSS variable block in src/app/globals.css from design-tokens.ts.
 * Run: npx tsx scripts/generate-tokens.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { generateGlobalCSS } from "../src/lib/design-tokens";

const GLOBALS_PATH = join(__dirname, "../src/app/globals.css");

const current = readFileSync(GLOBALS_PATH, "utf8");

// Find the section from the start of the comment to the closing } of .dark
const startMarker = "/* ── Design tokens";
const endMarker = "/* ── Base styles";

const startIdx = current.indexOf(startMarker);
const endIdx = current.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find marker sections in globals.css");
  process.exit(1);
}

const before = current.slice(0, startIdx);
const after = current.slice(endIdx);

const updated = before + generateGlobalCSS() + "\n\n" + after;
writeFileSync(GLOBALS_PATH, updated, "utf8");
console.log("✅ globals.css CSS variables regenerated from design-tokens.ts");
