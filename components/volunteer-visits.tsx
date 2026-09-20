"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { sentVisitIds } from "@/lib/sent-visits";
import type { VisitRecord } from "@/lib/review";
import { fetchJson } from "./file-provider";
import { ProductHeader } from "./product-header";
import { Section } from "./primitives";
const subscribe = () => () => {};

export function VolunteerVisits() {
  const client=useSyncExternalStore(subscribe,()=>true,()=>false);
  return <div className="app"><ProductHeader title="Your visits"/><main className="queue-page">
    <div className="page-heading"><h1>Keep the conversation going.</h1><p>Reopen the visits you sent from this browser and see the pharmacist’s response.</p></div>
    <div className="actions"><Link className="button" href="/visit/new">Start or continue a visit</Link><Link className="text-link" href="/">Back to the access map</Link></div>
    {client ? <VisitList/> : <p role="status">Opening your visits…</p>}
  </main></div>;
}
function VisitList() {
  const [state,setState]=useState<{visits:VisitRecord[];failed:string[];loaded:boolean;error:string}>({visits:[],failed:[],loaded:false,error:""});
  useEffect(()=>{
    let active=true;
    async function load() {
      try {
        const ids=sentVisitIds(localStorage);
        const results=await Promise.allSettled(ids.map(id=>fetchJson<VisitRecord>(`/api/visits/${encodeURIComponent(id)}`)));
        if(!active)return;
        const visits=results.flatMap(result=>result.status==="fulfilled"?[result.value]:[]).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
        setState({visits,failed:ids.filter((_,i)=>results[i].status==="rejected"),loaded:true,error:""});
      } catch { if(active)setState({visits:[],failed:[],loaded:true,error:"This browser could not read your saved visit links."}); }
    }
    void load();
    const timer=setInterval(load,10000);
    return()=>{active=false;clearInterval(timer)};
  },[]);
  return <Section title="Sent visits" detail={`${state.visits.length} visits`}>
    {!state.loaded && <p role="status">Checking for responses…</p>}
    {state.error && <p role="alert" className="error-box">{state.error}</p>}
    {state.loaded && !state.visits.length && !state.failed.length && !state.error && <div className="empty-state"><h3>No visits sent yet.</h3><p>Your visit will appear here after you send its report to a pharmacist.</p></div>}
    {state.visits.map(visit=><Link className="queue-row" key={visit.id} href={`/visit/${encodeURIComponent(visit.id)}`}>
      <div className="row-between"><h3>{visit.patient.name}</h3><span>{visit.review ? "Response ready" : "Waiting for review"}</span></div>
      <p className="small muted">{visit.id} · {new Date(visit.createdAt).toLocaleString()}</p>
    </Link>)}
    {state.failed.map(id=><p className="error-box" key={id}>Could not load {id}. <Link className="text-link" href={`/visit/${encodeURIComponent(id)}`}>Try opening this visit</Link></p>)}
  </Section>;
}
