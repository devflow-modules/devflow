import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const coreDist = path.join(root, "packages/applyflow-core/dist/index.js");
const { importOpportunityPipeline, markOutreachSent } = await import(pathToFileURL(coreDist).href);

const pipelinePath = path.join(root, "apps/applyflow/private/opportunity-pipeline.local.json");
const outPath = path.join(root, ".tmp/applyflow-pipeline-browser-seed.json");

const raw = JSON.parse(fs.readFileSync(pipelinePath, "utf8"));
const result = importOpportunityPipeline(raw, { now: new Date("2026-10-07T16:00:00.000Z") });
if (!result.ok) {
  console.error(result);
  process.exit(1);
}

const now = new Date("2026-10-07T16:05:00.000Z");
const markSentNames = new Set(["Gal Gordon", "Mateus Nunes", "Isabela Marcon"]);
const contacts = result.contacts.map((contact) => {
  if (!markSentNames.has(contact.name) || !contact.messageContent) return contact;
  return markOutreachSent(contact, { content: contact.messageContent }, now).contact;
});

const payload = {
  jobs: {
    version: 1,
    savedAt: now.toISOString(),
    jobs: result.jobs,
  },
  contacts: {
    version: 1,
    savedAt: now.toISOString(),
    contacts,
    interactions: contacts
      .filter((contact) => contact.sentAt)
      .map((contact) => ({
        id: `interaction-${contact.id}-sent`,
        contactId: contact.id,
        jobId: contact.jobId,
        type: "message",
        channel: contact.channel ?? "linkedin",
        occurredAt: contact.sentAt,
        content: contact.messageContent,
      })),
  },
  summary: {
    jobs: result.jobs.length,
    contacts: contacts.length,
    sent: contacts.filter((contact) => contact.status === "SENT").length,
    ready: contacts.filter((contact) => contact.status === "MESSAGE_PREPARED").length,
    sentNames: contacts.filter((contact) => contact.status === "SENT").map((contact) => contact.name),
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(JSON.stringify(payload.summary, null, 2));
console.log("wrote", outPath);
