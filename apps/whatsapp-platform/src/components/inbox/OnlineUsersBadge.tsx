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
      className="df-badge-success inline-flex items-center gap-1 !px-1.5 !py-0.5 !text-[10px] !font-medium !normal-case !tracking-normal"
      title={userList.map((u) => u.name || u.userId).join(", ")}
      data-testid="inbox-online-users-badge"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full df-status-dot--ok" aria-hidden />
      {userList.length} online
    </span>
  );
}
