import { openai } from "@ai-sdk/openai";
import {
  embedMany,
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import z from "zod";
import { supabase } from "../../../lib/supabase";
import { prisma } from "../../../lib/prisma";
import { auth } from "../auth";

export const POST = async (request: Request) => {
  try {
    const session = await auth();
    const { messages }: { messages: UIMessage[] } = await request.json();

    const message = messages.at(-1);
    const filter_filename = message?.metadata?.filter_filename as
      | string
      | undefined;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `Toy are research assistent. Follow these rules strictly:
      1. For question about uploaded document use the search_documents tool
      1.1 When searching across documents, always use this filename ${filter_filename}
      2. For question about current time use the get_current_time tool
      3. For question about math use the calculate tool
      4. For question about time use the get_current_time tool
      5. Always search before answering, never guess
      6. If not sure which tool to use, use search_documents first
      `,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        get_current_time: tool({
          description: "Get current time and date",
          inputSchema: z.object({}),
          execute: async () => {
            return {
              datetime: new Date().toISOString(),
              timezone: "UTC",
            };
          },
        }),
        calculate: tool({
          description: "Perform matematical calculations",
          inputSchema: z.object({
            expression: z
              .string()
              .describe("Math expression to evaluate, e.g. `2 + 2 * 10`"),
          }),
          execute: async ({ expression }) => {
            try {
              const result = eval(expression);

              return { result, expression };
            } catch (e) {
              return {
                error: e instanceof Error ? e.message : "Unknown error",
              };
            }
          },
        }),
        search_documents: tool({
          description: "Search for information in uploaded documents",
          inputSchema: z.object({
            query: z.string().describe("Search query"),
            filter_filename: z
              .string()
              .optional()
              .describe("Filter by filename"),
          }),
          execute: async ({ query, filter_filename }) => {
            if (!query) {
              return { error: "Question can't be empty" };
            }

            const { embeddings } = await embedMany({
              model: openai.embedding("text-embedding-3-small"),
              values: [query],
            });

            const { data: docs, error } = await supabase.rpc(
              "match_documents",
              {
                query_embedding: embeddings[0],
                match_count: 5,
                filter_filename: filter_filename ?? "",
              },
            );

            console.log(
              "similarity scores:",
              docs.map((d) => d.similarity),
            );

            if (error) {
              return { error: error.message };
            }

            const context = docs.map((doc) => doc.content).join("\n\n");

            return {
              result: `Context: ${context} \n Query: ${query}`,
              found: true,
            };
          },
        }),
        get_weather_in_city: tool({
          description: "Get current weather in a city",
          inputSchema: z.object({
            city: z
              .string()
              .describe("The name of the city to get the weather for"),
          }),
          execute: async ({ city }) => {
            const response = await fetch(`https://wttr.in/${city}?format=j1`);
            const data = await response.json();

            const current = data.current_condition[0];

            return {
              city,
              temp_c: current.temp_C,
              feels_like_c: current.FeelsLikeC,
              humidity: current.humidity,
              description: current.weatherDesc[0].value,
              wind_kmph: current.windspeedKmph,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onFinish: async ({ messages: finalMessages }) => {
        const firstUserMessage = messages.find((m) => m.role === "user");
        const title =
          firstUserMessage?.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(" ")
            .slice(0, 100) ?? "Untitled chat";

        await prisma.chatSession.create({
          data: {
            userId: session?.user.id,
            title,
            messages: [...messages, ...finalMessages],
          },
        });
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
};
