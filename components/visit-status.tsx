"use client";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

import { outreachAreaNames } from "@/lib/outreach/location";
import Link from "next/link";
import { useEffect, useState } from "react";
import { decisionSummary, type VisitRecord } from "@/lib/review";
import { itemLabel } from "@/lib/display";
import { fetchJson } from "./file-provider";
import { ProductHeader } from "./product-header";
import { Section } from "./primitives";
import { ReportBubbleMap } from "./report-bubble-map";

export function VisitStatus({ id }: { id: string }) {
  const [visit,setVisit]=useState<VisitRecord|null>(null);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    let timer:ReturnType<typeof setTimeout>;
    async function refresh(){
      try{
        const next=await fetchJson<VisitRecord>(`/api/visits/${encodeURIComponent(id)}`);
        if(!active)return;
        setVisit(next);setError("");
        if(next.status==="waiting")timer=setTimeout(refresh,3000);
      }catch(cause){if(active)setError((cause as Error).message);}
    }
    void refresh();return()=>{active=false;clearTimeout(timer)};
  },[id,retry]);
  return <div className="app"><ProductHeader title="Visit follow-up"/><main className="queue-page">
    <Link className="text-link" href="/visits">← Your visits</Link>
    {error && <div className="error-box" role="alert"><p>Could not load the latest visit: {error}</p><LiquidButton className="button secondary" onClick={()=>setRetry(x=>x+1)}>Try again</LiquidButton></div>}
    {!visit && !error && <p role="status">Opening the sent report…</p>}
    {visit && <>
      <div className="page-heading"><span className="eyebrow">{visit.id}{visit.outreachAreaId ? ` · ${outreachAreaNames[visit.outreachAreaId]}` : ""}</span><h1>{visit.patient.name}</h1><p>{visit.review ? "The pharmacist’s response is ready." : "Your report has reached the pharmacist queue."}</p></div>
      {!visit.review ? <Section title="Waiting for review"><p>The person you visited does not need to wait here. Return to this page to check for a response.</p><p className="small muted">Sent {new Date(visit.createdAt).toLocaleString()}</p></Section> : <Section title="Pharmacist response" detail={decisionSummary(visit.review)}>
        <p>{visit.review.note || (visit.review.outcome==="authorised" ? "The pharmacist authorised the medicines shown below." : "Review the decisions and reasons below.")}</p>
        {visit.review.items.map(item=>{
          const medicine=visit.report.medList.find(m=>m.id===item.medId);
          return <div className="visit-report-item" key={item.medId}>
            <div className="row-between"><h3>{medicine ? itemLabel(medicine) : item.medId}</h3><strong>{item.decision==="authorised" ? "Authorised" : "Not authorised"}</strong></div>
            {medicine && <p className="urdu" lang="ur" dir="rtl">{medicine.herWords}</p>}
            {item.reason && <p>{item.reason}</p>}
          </div>;
        })}
        {visit.review.urdu && <p className="urdu voice-saved" lang="ur" dir="rtl">{visit.review.urdu}</p>}
        <p className="small muted">{visit.review.by.name}, {visit.review.by.qualification} · {visit.review.by.registration} · {new Date(visit.review.at).toLocaleString()}</p>
      </Section>}
      <details className="sent-report-details"><summary>View the report that was sent</summary>
        <Section title="The patient’s account"><p>{visit.report.english.account}</p><p className="small muted">{visit.report.english.summary}</p><details><summary>Original Urdu evidence</summary><p className="urdu" lang="ur" dir="rtl">{visit.report.reviewedUrdu}</p></details></Section>
        <ReportBubbleMap report={visit.report}/>
      </details>
      <div className="actions"><Link className="button secondary" href="/visit/new?new=1">Start another visit</Link><Link className="text-link" href="/">Explore communities</Link></div>
    </>}
  </main></div>;
}
