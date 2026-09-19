import { FileProvider } from "@/components/file-provider";
import { Findings } from "@/components/file-views";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <FileProvider key={id} id={id}>
      <Findings />
    </FileProvider>
  );
}
