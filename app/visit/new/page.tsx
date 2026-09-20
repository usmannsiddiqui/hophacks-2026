import { VoiceVisit } from "@/components/voice-visit";
import { outreachAreaSchema } from "@/lib/outreach/location";
export default async function Page({searchParams}:{searchParams:Promise<{area?:string;new?:string}>}) {
  const {area,new:fresh}=await searchParams;
  const parsed=outreachAreaSchema.safeParse(area);
  return <VoiceVisit initialFresh={fresh==="1"} initialAreaId={parsed.success ? parsed.data : undefined}/>;
}
