import { FileProvider } from "@/components/file-provider";
import { RecordingView } from "@/components/conversation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <FileProvider key={id} id={id}>
      <RecordingView />
    </FileProvider>
  );
}
