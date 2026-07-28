import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const skillsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(skillsRoot, "../..");
const requiredSections = [
  "## Objetivo",
  "## Gatilhos de uso",
  "## Entradas obrigatórias",
  "## Fluxo operacional",
  "## Guardrails",
  "## Stop conditions",
  "## Validações",
  "## Formato da entrega",
];
const errors = [];
const names = new Set();

function displayPath(path) {
  return relative(process.cwd(), path).split(sep).join("/");
}

function validateLinks(path, content) {
  const links = content.matchAll(/\[[^\]]*]\(([^)]+)\)/g);

  for (const [, rawTarget] of links) {
    const target = rawTarget.trim().replace(/^<|>$/g, "");
    if (!target || /^(?:[a-z]+:|#)/i.test(target)) continue;

    const fileTarget = decodeURIComponent(target.split("#", 1)[0]);
    if (!existsSync(resolve(dirname(path), fileTarget))) {
      errors.push(`${displayPath(path)}: link inválido: ${target}`);
    }
  }
}

function validateLegacyReferences(directory) {
  const ignoredDirectories = new Set([".git", ".next", "coverage", "dist", "node_modules"]);

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        validateLegacyReferences(join(directory, entry.name));
      }
      continue;
    }

    if (!entry.name.endsWith(".md") && !entry.name.endsWith(".mdc")) continue;

    const path = join(directory, entry.name);
    const content = readFileSync(path, "utf8");
    const legacyReference =
      /(?:\.cursor\/skills\/|(?:\.\.\/)+skills\/|\.\/skills\/)[a-z0-9-]+\.md\b/g;

    for (const match of content.matchAll(legacyReference)) {
      errors.push(`${displayPath(path)}: referência legada: ${match[0]}`);
    }
  }
}

const rootMarkdownFiles = readdirSync(skillsRoot).filter((entry) => entry.endsWith(".md"));
for (const file of rootMarkdownFiles) {
  if (file !== "README.md") {
    errors.push(`${displayPath(join(skillsRoot, file))}: skill no formato legado`);
  }
}

const skillDirectories = readdirSync(skillsRoot)
  .map((entry) => join(skillsRoot, entry))
  .filter((path) => statSync(path).isDirectory())
  .sort();

for (const directory of skillDirectories) {
  const path = join(directory, "SKILL.md");
  if (!existsSync(path)) {
    errors.push(`${displayPath(directory)}: SKILL.md ausente`);
    continue;
  }

  const content = readFileSync(path, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    errors.push(`${displayPath(path)}: frontmatter ausente ou inválido`);
    continue;
  }

  const metadata = frontmatter[1];
  const name = metadata.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = metadata.match(/^description:\s*(?:>-\s*)?$/m);
  const keys = [...metadata.matchAll(/^([A-Za-z][\w-]*):/gm)].map((match) => match[1]);

  if (!name || !/^[a-z0-9-]{1,64}$/.test(name)) {
    errors.push(`${displayPath(path)}: name inválido`);
  } else {
    if (name !== directory.split(/[\\/]/).at(-1)) {
      errors.push(`${displayPath(path)}: name não coincide com o diretório`);
    }
    if (names.has(name)) errors.push(`${displayPath(path)}: name duplicado: ${name}`);
    names.add(name);
  }

  if (!description) errors.push(`${displayPath(path)}: description deve usar bloco >-`);
  if (keys.join(",") !== "name,description") {
    errors.push(`${displayPath(path)}: frontmatter deve conter apenas name e description`);
  }

  let previousIndex = -1;
  for (const section of requiredSections) {
    const index = content.indexOf(section);
    if (index === -1) {
      errors.push(`${displayPath(path)}: seção ausente: ${section}`);
    } else if (index < previousIndex) {
      errors.push(`${displayPath(path)}: seção fora de ordem: ${section}`);
    }
    previousIndex = index;
  }

  validateLinks(path, content);
}

const readmePath = join(skillsRoot, "README.md");
if (!existsSync(readmePath)) {
  errors.push(`${displayPath(readmePath)}: catálogo ausente`);
} else {
  validateLinks(readmePath, readFileSync(readmePath, "utf8"));
}

validateLegacyReferences(repositoryRoot);

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`OK: ${skillDirectories.length} skills validadas.`);
}
