import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { supabase } from "../../../lib/supabase";
import { PDFParse } from "pdf-parse";

function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk.trim());
    i += chunkSize - overlap;
  }

  return chunks;
}

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!(file instanceof File)) {
      return Response.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = new PDFParse({ data: buffer });
    const { text } = await parsed.getText();

    await parsed.destroy();

    const chunks = chunkText(text);

    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks,
    });

    const rows = chunks.map((content, index) => ({
      content,
      embedding: embeddings[index],
      metadata: { filename: file.name },
    }));

    const { error } = await supabase.from("documents").insert(rows);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      chunks: chunks.length,
    });
  } catch (error) {
    console.error("Failed [ingest]: ", { error });
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 },
    );
  }
};

export const GET = async () => {
  const { data, error } = await supabase
    .from("documents")
    .select("metadata->>filename");

  const listOfFiles = new Set((data ?? []).map((d) => d.filename));

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    message: "hey man",
    data: [...listOfFiles.values()],
  });
};
