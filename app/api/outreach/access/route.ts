import "server-only";
import { createAccessService } from "@/lib/outreach/access";
export const runtime = "nodejs";
const service = createAccessService({key:process.env.GOOGLE_PLACES_AGGREGATE_API_KEY});
export async function POST(request: Request) {
  const headers = {"Cache-Control":"no-store"};
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({error:"Use the map on this website."},{status:403,headers});
  if (Number(request.headers.get("content-length")) > 1024) return Response.json({error:"Request too large."},{status:413,headers});
  let body: unknown;
  try { const text = await request.text(); if (text.length > 1024) throw Error(); body = JSON.parse(text); }
  catch { return Response.json({error:"Invalid request."},{status:400,headers}); }
  const result = await service(body);
  return Response.json(result.body,{status:result.status,headers});
}
