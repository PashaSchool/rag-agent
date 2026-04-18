import { supabase } from "../../lib/supabase";

export default async function ToolsPage() {
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, metadata");

  if (error) {
    return <p>Error</p>;
  }

  return (
    <main className="p-8">
      <h1 className="text-xl font-bold">Ingested documents</h1>
      <pre>{JSON.stringify(docs, null, 4)}</pre>
    </main>
  );
}
