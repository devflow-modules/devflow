import type { Metadata } from "next";
import { ConversationsHistoryClient } from "@/components/conversations-history/ConversationsHistoryClient";

export const metadata: Metadata = {
  title: "Histórico de conversas | WhatsApp Platform",
};

export default function ConversationsPage() {
  return <ConversationsHistoryClient />;
}
