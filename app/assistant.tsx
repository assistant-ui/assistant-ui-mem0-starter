"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

const useUserId = () => {
  const [userId, setUserId] = useState<string>("");

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

export const Assistant = () => {
  const userId = useUserId();
  const runtime = useChatRuntime({
    api: "/api/chat",
    body: { userId },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
