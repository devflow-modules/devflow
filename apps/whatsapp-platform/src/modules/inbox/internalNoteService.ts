/**
 * Notas internas por thread — visíveis à equipa, não enviadas ao WhatsApp.
 */

import { prisma } from "@/lib/prisma";
import { logAction } from "./auditService";

export type InternalNoteDto = {
  id: string;
  body: string;
  userId: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listInternalNotes(
  tenantId: string,
  threadId: string
): Promise<InternalNoteDto[]> {
  const rows = await prisma.waInboxInternalNote.findMany({
    where: { tenantId, threadId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    userId: r.userId,
    authorName: r.user?.name ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createInternalNote(
  tenantId: string,
  threadId: string,
  userId: string,
  body: string
): Promise<InternalNoteDto | null> {
  const text = body.trim();
  if (!text) return null;
  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { id: true },
  });
  if (!thread) return null;
  const row = await prisma.waInboxInternalNote.create({
    data: { tenantId, threadId, userId, body: text },
    include: { user: { select: { name: true } } },
  });
  await logAction(tenantId, threadId, userId, "internal_note_create", {
    noteId: row.id,
    preview: text.slice(0, 120),
  });
  return {
    id: row.id,
    body: row.body,
    userId: row.userId,
    authorName: row.user?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteInternalNote(
  tenantId: string,
  threadId: string,
  noteId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.waInboxInternalNote.findFirst({
    where: { id: noteId, tenantId, threadId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.waInboxInternalNote.delete({
    where: { id: noteId },
  });
  await logAction(tenantId, threadId, userId, "internal_note_delete", { noteId });
  return true;
}
