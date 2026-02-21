import { useMessage } from "@assistant-ui/react";
import { FC, useMemo } from "react";
import MemoryIndicator, { Memory } from "./memory-indicator";

type RetrievedMemory = {
  id: string;
  memory: string;
  user_id: string;
  categories: readonly string[];
  created_at: string;
  updated_at: string;
  score: number;
};

type NewMemory = {
  id?: string;
  memory?: string;
  data?: {
    memory: string;
  };
  event?: "ADD" | "DELETE";
  // For async response
  message?: string;
  status?: string;
};

// DataMessagePart from assistant-ui: type: "data" with name field
type DataMessagePart<T = unknown> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
};

type Mem0GetDataPart = DataMessagePart<readonly RetrievedMemory[]> & {
  readonly name: "mem0-get";
};

type Mem0UpdateDataPart = DataMessagePart<readonly NewMemory[]> & {
  readonly name: "mem0-update";
};

const isMem0GetPart = (p: unknown): p is Mem0GetDataPart =>
  typeof p === "object" &&
  p != null &&
  "type" in p &&
  p.type === "data" &&
  "name" in p &&
  p.name === "mem0-get" &&
  "data" in p;

const isMem0UpdatePart = (p: unknown): p is Mem0UpdateDataPart =>
  typeof p === "object" &&
  p != null &&
  "type" in p &&
  p.type === "data" &&
  "name" in p &&
  p.name === "mem0-update" &&
  "data" in p;

const useMemories = (): Memory[] => {
  const content = useMessage((m) => m.content);

  return useMemo(() => {
    if (!content || !Array.isArray(content)) return [];

    const memories: Memory[] = [];

    for (const part of content) {
      if (isMem0GetPart(part)) {
        for (const m of part.data) {
          memories.push({
            event: "GET",
            id: m.id,
            memory: m.memory,
            score: m.score,
          });
        }
      } else if (isMem0UpdatePart(part)) {
        for (const m of part.data) {
          // Skip async pending responses
          if (m.status === "PENDING") continue;

          const memoryText = m.memory ?? m.data?.memory ?? "";
          if (!memoryText) continue;

          memories.push({
            event: m.event ?? "ADD",
            id: m.id ?? "",
            memory: memoryText,
            score: 1,
          });
        }
      }
    }

    return memories;
  }, [content]);
};

export const MemoryUI: FC = () => {
  const memories = useMemories();

  return (
    <div className="flex mb-1">
      <MemoryIndicator memories={memories} />
    </div>
  );
};
