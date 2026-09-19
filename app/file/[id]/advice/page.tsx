import { FileProvider } from "@/components/file-provider";
import { AdviceView } from "@/components/advice-report";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <FileProvider key={id} id={id}>
      <AdviceView />
    </FileProvider>
  );
}
