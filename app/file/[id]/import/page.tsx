import Link from "next/link";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="loading-page">
      <Link href="/file/new" className="brand">
        Mashwara
      </Link>
      <h1>Her documents belong with her story.</h1>
      <p>
        Document extraction is outside the current demo slice. The sample file
        already includes an illustrative prescription entry. No document has
        been uploaded or processed here.
      </p>
      <Link className="button secondary" href={`/file/${id}`}>
        Back to her file
      </Link>
    </main>
  );
}
