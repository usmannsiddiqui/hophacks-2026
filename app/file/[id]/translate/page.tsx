import { FileProvider } from "@/components/file-provider";
import { TranslateView } from "@/components/conversation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  return (
    <FileProvider key={id} id={id}>
      <TranslateView questionId={q} />
    </FileProvider>
  );
}
