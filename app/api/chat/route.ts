/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { addMemories, getMemories } from "@mem0/vercel-ai-provider";
import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";

export const maxDuration = 30;

const retrieveMemories = (memories: any) => {
  if (memories.length === 0) return "";
  const systemPrompt =
    "These are the memories I have stored. Give more weightage to the question by users and try to answer that first. You have to modify your answer based on the memories I have provided. If the memories are irrelevant you can ignore them. Also don't reply to this section of the prompt, or the memories, they are only for your reference. The System prompt starts after text System Message: \n\n";
  const memoriesText = memories
    .map((memory: any) => {
      return `Memory: ${memory.memory}\n\n`;
    })
    .join("\n\n");

  return `System Message: ${systemPrompt} ${memoriesText}`;
};

// Extract text content from messages for mem0
const extractTextFromMessages = (messages: UIMessage[]): string => {
  return messages
    .map((m) => {
      if (Array.isArray(m.parts)) {
        return m.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join(" ");
      }
      return "";
    })
    .join("\n");
};

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
    userId,
  } = (await req.json()) as {
    messages: UIMessage[];
    system?: string;
    tools?: Parameters<typeof frontendTools>[0];
    userId: string;
  };

  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "userId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Convert UIMessages to model messages for streamText
  const modelMessages = await convertToModelMessages(messages);

  // Extract text for mem0 (it expects string or LanguageModelV2Prompt)
  const textPrompt = extractTextFromMessages(messages);

  const memories = await getMemories(textPrompt, { user_id: userId });
  const mem0Instructions = retrieveMemories(memories);

  // addMemories expects LanguageModelV2Prompt, use modelMessages with type cast
  const addMemoriesTask = addMemories(modelMessages as any, { user_id: userId });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Write memories as v6 custom data part (type: "data-{name}" pattern)
      if (memories.length > 0) {
        writer.write({
          type: "data-mem0-get",
          data: memories,
        });
      }

      const result = streamText({
        model: openai("gpt-4o"),
        messages: modelMessages,
        system: [system, mem0Instructions].filter(Boolean).join("\n"),
        tools: tools ? (frontendTools(tools) as any) : undefined,
      });

      writer.merge(result.toUIMessageStream());

      // Add memories after stream completes
      const newMemories = await addMemoriesTask;
      if (newMemories.length > 0) {
        writer.write({
          type: "data-mem0-update",
          data: newMemories,
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
