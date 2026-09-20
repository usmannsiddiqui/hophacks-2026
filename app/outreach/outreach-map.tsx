"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Glass } from "@samasante/liquid-glass";
import { accessColor, categories, regions, pilotBounds, planningLocations, type AccessResult, type Category } from "@/lib/outreach/regions";
import styles from "./outreach.module.css";
function GlassMaterial() { return <Glass aria-hidden="true" className={styles.glassMaterial} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",borderRadius:"inherit",background:"rgba(243,232,188,.24)"}} optics={{frost:8,strength:.012,dispersion:.08,brightness:.02}} />; }
const PLAN_KEY = "mashwara-outreach-plans-v1";
const subscribe = (fn: () => void) => {window.addEventListener("storage",fn);window.addEventListener("outreach-plan",fn);return()=>{window.removeEventListener("storage",fn);window.removeEventListener("outreach-plan",fn)}};
const getPlans = () => {try{return localStorage.getItem(PLAN_KEY) || "[]"}catch{return "[]"}};
const getServerPlans = () => "[]";
const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export default function OutreachMap() {
  const [category,setCategory] = useState<Category>("medical");
  const [selected,setSelected] = useState<string>(regions[0].id);
  const [results,setResults] = useState<Partial<Record<Category,Record<string,AccessResult>>>>({});
  const [loading,setLoading] = useState(false);
  const [ready,setReady] = useState(false);
  const [mapError,setMapError] = useState("");
  const [planMessage,setPlanMessage] = useState("");
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const busy = useRef(false);
  const rawPlans = useSyncExternalStore(subscribe,getPlans,getServerPlans);
  const plans: string[] = useMemo(()=>{try{const value=JSON.parse(rawPlans);return Array.isArray(value)?value.filter(id=>planningLocations.some(s=>s.id===id)):[]}catch{return []}},[rawPlans]);
  const area = regions.find(s=>s.id===selected)!;
  const current = results[category] || {};
  const evidence = current[selected];
  const count = evidence && "count" in evidence ? evidence.count : undefined;
  const sorted = [...regions].sort((a,b)=>{
    const first=current[a.id], second=current[b.id];
    return (first && "count" in first ? first.count : Infinity)-(second && "count" in second ? second.count : Infinity);
  });
  const choose = useCallback((id: string)=>{setSelected(id);setPlanMessage("");const region=regions.find(r=>r.id===id);if(region)map.current?.fitBounds(region.bounds,40);},[]);
  useEffect(()=>{
    const scope=window as typeof window & {gm_authFailure?:()=>void};
    scope.gm_authFailure=()=>setMapError("The map key was rejected. Check that this preview address is allowed in Google Cloud.");
    return()=>{delete scope.gm_authFailure};
  },[]);
  useEffect(()=>{
    if (!ready || !mapElement.current || map.current) return;
    map.current = new google.maps.Map(mapElement.current,{
      center:{lat:25.32,lng:63.44},zoom:11,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,
      gestureHandling:"cooperative",clickableIcons:false,
      styles:[{featureType:"landscape",stylers:[{color:"#eee6cd"}]},{featureType:"water",stylers:[{color:"#b4d0c3"}]},{featureType:"poi",stylers:[{visibility:"off"}]},{featureType:"road",elementType:"geometry",stylers:[{color:"#faf2d9"}]},{featureType:"administrative",elementType:"labels.text.fill",stylers:[{color:"#425d51"}]}]
    });
    map.current.fitBounds(pilotBounds,32);
  },[ready]);
  useEffect(()=>{
    if (!ready || !map.current) return;
    const overlays: google.maps.Polygon[]=[];
    for(const settlement of regions){
      const result=results[category]?.[settlement.id];
      const value=result && "count" in result ? result.count : undefined;
      const polygon = new google.maps.Polygon({map:map.current,paths:settlement.boundary,geodesic:true,fillColor:accessColor(value),fillOpacity:value===undefined?.14:.52,strokeColor:settlement.id===selected?"#035352":accessColor(value),strokeOpacity:.9,strokeWeight:settlement.id===selected?3:1,zIndex:settlement.id===selected?2:1});
      polygon.addListener("click",()=>choose(settlement.id)); overlays.push(polygon);
    }
    return()=>overlays.forEach(c=>{google.maps.event.clearInstanceListeners(c);c.setMap(null)});
  },[ready,area,selected,category,results,choose]);
  async function loadCounts(){
    if(busy.current) return;
    busy.current=true;setLoading(true);
    const requested=category;
    setResults(old=>({...old,[requested]:{}}));
    for(const settlement of regions){
      let result: AccessResult;
      try {
        const response=await fetch("/api/outreach/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({regionId:settlement.id,category:requested})});
        const data=await response.json();
        result=response.ok && Number.isSafeInteger(data.count) && data.count>=0 ? {count:data.count,fetchedAt:data.fetchedAt} : {error:data.error || "Data unavailable. Please try again."};
      }catch{result={error:"Connection interrupted. Availability is unknown."}}
      setResults(old=>({...old,[requested]:{...old[requested],[settlement.id]:result}}));
    }
    busy.current=false;setLoading(false);
  }
  function togglePlan(){
    const exists=plans.includes(selected);
    try{
      localStorage.setItem(PLAN_KEY,JSON.stringify(exists?plans.filter(id=>id!==selected):[...plans,selected]));
      window.dispatchEvent(new Event("outreach-plan"));
      setPlanMessage(exists?"Removed from your visit plan.":`${area.name} added to your visit plan on this device.`);
    }catch{setPlanMessage("This browser could not save your plan. Please allow local storage.")}
  }
  const hasData=Object.keys(current).length>0;
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>MASHWARA <span lang="ur" dir="rtl">مشورہ</span></Link>
      <nav aria-label="Main navigation"><Link href="/visits">Your visits</Link><Link href="/visit/new?new=1">New visit ↗</Link><Link href="/pharmacist">Pharmacist console</Link></nav>
    </header>
    <section className={styles.intro}>
      <h1>Care starts with showing up.</h1>
    </section>
    <figure className={styles.villageHero}>
      <Image src="/images/community-village.png" alt="An older man and a young volunteer talking beneath a leafy tree in a Pakistani village courtyard." width={1456} height={816} priority sizes="(max-width: 620px) 100vw, 90vw" />
    </figure>
    <section id="access-map" className={styles.workspace} aria-label="Healthcare access explorer"><GlassMaterial/>
      <div className={styles.toolbar}><div><h2>Potential access gaps</h2><p>Pasni & the Makran coast, Balochistan</p></div><div className={styles.tabs} aria-label="Listing category"><GlassMaterial/>{(Object.keys(categories) as Category[]).map(key=><button key={key} aria-pressed={category===key} disabled={loading} onClick={()=>setCategory(key)}>{categories[key]}</button>)}</div></div>
      <div className={styles.explorer}>
        <aside className={styles.sidebar}>
          <div className={styles.listHeader}><span>4 REGIONS</span><span>TEHSILS</span></div>
          <button className={styles.loadButton} disabled={loading} onClick={loadCounts}>{loading?"Checking Google listings…":hasData?"Refresh areas ↻":"Show access gaps ↗"}</button>
          <div className={styles.areaList}>{sorted.map((s,index)=>{
            const result=current[s.id]; const value=result && "count" in result?result.count:undefined;
            return <button key={s.id} className={styles.areaButton} aria-pressed={selected===s.id} onClick={()=>choose(s.id)}><span className={styles.number}>{String(index+1).padStart(2,"0")}</span><span><strong>{s.name}</strong><small>{plans.includes(s.id)?"In your visit plan":result && "error" in result?"Data unavailable":value===undefined?"Not checked yet":value===0?"No places listed":`${value} ${value===1?"place":"places"} listed`}</small></span><span className={styles.dot} style={{background:accessColor(value)}}/></button>;
          })}</div>
          <p className={styles.googleAttribution} translate="no">Listing counts: Google Maps</p>
        </aside>
        <div className={styles.mapColumn}>
          <div className={styles.mapFrame}>
            <div ref={mapElement} className={styles.map} aria-label="Map of Makran coast tehsil boundaries"/>
            {(!browserKey || mapError || !ready) && <div className={styles.mapNotice} role="status"><strong>{mapError?"Map unavailable":!browserKey?"Map setup needed":"Opening the map…"}</strong><p>{mapError || (!browserKey?"Add the Google Maps browser key to enable the map. The community list still works.":"Finding our communities along the Makran coast.")}</p></div>}
            <div className={styles.mapLabel}><GlassMaterial/>MAKRAN COAST <span>BALOCHISTAN, PAKISTAN</span></div>
          </div>
          <div className={styles.legend} aria-label="Listing count legend">{[["#c34236","0 listed"],["#de8a25","1–2 listed"],["#035352","3+ listed"],["#777d77","Not known"]].map(([color,label])=><span key={label}><i style={{background:color}}/>{label}</span>)}<small>Tehsil boundaries: <a href="https://www.geoboundaries.org/api/current/gbOpen/PAK/ADM3/">geoBoundaries</a> 2017 · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a> · <a href="/data/makran-tehsils.json" download>Download</a></small></div>
        </div>
      </div>
      <div className={styles.detail}><GlassMaterial/>
        <div className={styles.placeHeading}><h2>{area.name}</h2></div>
        <details className={styles.areaEvidence}><summary>Area details</summary><p>{count === undefined ? "Listing count not available yet." : `${count} ${category === "medical" ? "medical-care listings" : "pharmacies listed"} in this shaded area.`}</p><p>{evidence && "fetchedAt" in evidence ? `Checked ${new Date(evidence.fetchedAt).toLocaleString()} · Google Maps` : evidence && "error" in evidence ? evidence.error : "Choose Show access gaps to check this area."}</p><p>{area.name} tehsil, using the published 2017 boundary. Regions differ in size; counts are not adjusted for area or population.</p></details>
        <div className={styles.planAction}><button onClick={togglePlan}>{plans.includes(selected)?"Remove from visit plan":"Plan a visit here"}<span>↗</span></button><p role="status">{planMessage}</p></div>
      </div>
    </section>
    <footer className={styles.footer}><span>MASHWARA · مشورہ</span><span>Better care begins with listening.</span></footer>
    {browserKey && <Script id="outreach-google-maps" src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(browserKey)}&v=weekly`} onReady={()=>setReady(true)} onError={()=>setMapError("Could not load Google Maps. Check your connection and browser key.")}/>}
  </main>;
}
