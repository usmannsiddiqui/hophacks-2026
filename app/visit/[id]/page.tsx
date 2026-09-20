import { VisitStatus } from "@/components/visit-status";
export default async function Page({params}:{params:Promise<{id:string}>}) { const {id}=await params; return <VisitStatus id={id}/>; }
