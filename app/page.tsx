"use client";

import { useChat } from "@ai-sdk/react";
import { useState, FormEvent, ChangeEvent, useEffect, useRef } from "react";
import { prisma } from "../lib/prisma";

export default function Home() {
  const [context, setContext] = useState("");
  const [isUploading, toggleUploading] = useState(false);
  const [uploadingResult, setUploadingResult] = useState("");
  const chatSessionInitialized = useRef(false);

  const { messages, sendMessage, status } = useChat();

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/ingest", {
        method: "GET",
      });

      const data = await res.json();

      console.log({ response: data });
    };

    fetchData();
  }, []);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    toggleUploading(true);
    setUploadingResult("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/ingest", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      setUploadingResult(data.message);
    } else {
      setUploadingResult(`Failed to upload: ${data.message}`);
    }

    toggleUploading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!chatSessionInitialized.current) {
      chatSessionInitialized.current = true;

      await fetch("/api/chat_session", {
        method: "POST",
        data: {
          title: context,
        },
      });
    }

    sendMessage({
      text: context,
      metadata: {
        filter_filename: "",
      },
    });
    setContext("");
  };

  const isLoading = status === "streaming";

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {uploadingResult && <p>UploadingResult: {uploadingResult}</p>}

      <div>
        <label htmlFor="file">
          {isUploading ? "Uploading" : "set file button"}
          <input
            type="file"
            id="file"
            hidden
            onChange={handleFileUpload}
            accept="pdf"
          />
        </label>
      </div>

      <main className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-24 space-y-3">
            <p className="text-4xl">🔬</p>
            <p className="text-zinc-400">
              Ask me anything — I can calculate, check time, and search
              documents
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                "What time is it?",
                "Calculate 15% of 2847",
                "What is 123 * 456?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setContext(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-violet-500 hover:text-violet-400 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {(messages as UIMessage[]).map((m) => (
          <div key={m.id} className="space-y-2">
            {m.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-violet-600 text-white px-4 py-2.5 rounded-2xl rounded-br-none text-sm">
                  {m.parts.map((p: any) => p?.text ?? "").join("")}
                </div>
              </div>
            )}

            {m.role === "assistant" && (
              <div className="space-y-2">
                {m.parts.map((part: any, i: number) => {
                  if (part.type === "step-start") return null;

                  if (part.type === "text" && part.text) {
                    return (
                      <div key={i} className="flex justify-start">
                        <div className="max-w-[80%] bg-zinc-800 border border-zinc-700 px-4 py-2.5 rounded-2xl rounded-bl-none text-sm text-zinc-100">
                          {part.text}
                        </div>
                      </div>
                    );
                  }

                  if (part.type?.startsWith("tool-")) {
                    const toolName = part.type.replace("tool-", "");
                    const isDone = part.state === "output-available";

                    return (
                      <div key={i} className="flex justify-start">
                        <div className="max-w-[80%] bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-xs space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-violet-400 font-mono">
                              ⚡ {toolName}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                isDone
                                  ? "bg-emerald-900 text-emerald-400"
                                  : "bg-zinc-800 text-zinc-500 animate-pulse"
                              }`}
                            >
                              {isDone ? "done" : "running..."}
                            </span>
                          </div>

                          {Object.keys(part.input || {}).length > 0 && (
                            <div className="text-zinc-500">
                              <span className="text-zinc-600">in: </span>
                              <span className="font-mono text-zinc-400">
                                {JSON.stringify(part.input)}
                              </span>
                            </div>
                          )}

                          {isDone && (
                            <div className="text-zinc-500">
                              <span className="text-zinc-600">out: </span>
                              <span className="font-mono text-emerald-400">
                                {JSON.stringify(part.output)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        ))}
        {/*<pre>{JSON.stringify(messages, null, 4)}</pre>*/}
        <div className="border-t border-zinc-800 px-4 py-4">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex gap-3"
          >
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ask the agent..."
              disabled={isLoading}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !context.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
            >
              {isLoading ? "..." : "➤"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
