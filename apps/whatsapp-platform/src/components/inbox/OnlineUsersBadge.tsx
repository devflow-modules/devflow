"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOnlineUsers } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";

export function OnlineUsersBadge() {
  const { data: users } = useQuery({
    queryKey: INBOX_QK.presence,
    queryFn: fetchOnlineUsers,
    placeholderData: [],
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
  const userList = users ?? [];

  if (userList.length === 0) return null;

  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
      title={userList.map((u) => u.name || u.userId).join(", ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {userList.length} {userList.length === 1 ? "online" : "online"}
    </span>
  );
}
