"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { useEffect, useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";
import { DefaultChatTransport } from "ai";

const useUserId = () => {
  // null = loading, string = loaded
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let id = Cookies.get("userId");
    if (!id) {
      id = uuidv4();
      Cookies.set("userId", id, { expires: 365 });
    }
    setUserId(id);
  }, []);

  return userId;
};

// Separate component that only renders when userId is ready
const AssistantInner = ({ userId }: { userId: string }) => {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { userId },
      }),
    [userId]
  );

  const runtime = useChatRuntime({ transport });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};

export const Assistant = () => {
  const userId = useUserId();

  // Don't render until userId is loaded to prevent race conditions
  if (!userId) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <AssistantInner userId={userId} />;
};
