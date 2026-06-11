#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "apps"];
/** Files that may contain the canonical native `<button>` primitive for their app/design system. */
const ALLOWED_SNIPPETS = [
  `${path.sep}components${path.sep}ui${path.sep}button.tsx`,
  // ApplyFlow local button primitive — native <button> only here (see ApplyFlowButton.tsx).
  `${path.sep}apps${path.sep}applyflow${path.sep}src${path.sep}components${path.sep}ui${path.sep}ApplyFlowButton.tsx`,
  // ApplyFlow extension (MV3) button primitive — isolated CSS, not portal Button.
  `${path.sep}apps${path.sep}applyflow-extension${path.sep}src${path.sep}components${path.sep}ExtensionButton.tsx`,
  // Interview Lab local button primitive — native <button> only here.
  `${path.sep}apps${path.sep}interview-lab${path.sep}src${path.sep}components${path.sep}ui${path.sep}InterviewLabButton.tsx`,
  `${path.sep}modules${path.sep}email${path.sep}templates${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}generated${path.sep}`,
];

function isAllowed(filePath) {
  return ALLOWED_SNIPPETS.some((snippet) => filePath.includes(snippet));
}

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scan(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue;
    if (isAllowed(fullPath)) continue;

    const content = fs.readFileSync(fullPath, "utf-8");
    if (content.includes("<button")) {
      console.error(`❌ Native <button> found: ${fullPath}`);
      process.exit(1);
    }

    const buttonTags = content.match(/<Button\b[\s\S]*?>/g) ?? [];
    for (const tag of buttonTags) {
      if (!/\bvariant\s*=/.test(tag)) {
        console.error(`❌ <Button> missing variant: ${fullPath}`);
        process.exit(1);
      }
    }
  }
}

for (const relativeDir of SCAN_DIRS) {
  const abs = path.join(ROOT, relativeDir);
  if (fs.existsSync(abs)) scan(abs);
}

console.log("✅ No native <button> found and all <Button> use variant");
