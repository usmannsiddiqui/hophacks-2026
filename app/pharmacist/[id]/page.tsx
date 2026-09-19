import { FileProvider } from "@/components/file-provider";
import { PharmacistReview } from "@/components/pharmacist";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FileProvider key={id} id={id}>
      <PharmacistReview />
    </FileProvider>
  );
}
