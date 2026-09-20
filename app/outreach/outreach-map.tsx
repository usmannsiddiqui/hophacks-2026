"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Glass } from "@samasante/liquid-glass";
import { accessColor, categories, regions, pilotBounds, planningLocations, unmappedUnits, district, ratePer10k, peoplePerListing, listingsToBenchmark, formatRate, WHO_FACILITY_BENCHMARK_PER_10K, type AccessResult, type Category, type Region } from "@/lib/outreach/regions";
import styles from "./outreach.module.css";
// Listings per 10,000 residents inside the same boundary; undefined until Google has answered.
const rateOf = (region: Region, result?: AccessResult) => result && "count" in result ? ratePer10k(result.count, region.census.population2023) : undefined;
const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(1)}%`;
const number = (value: number) => value.toLocaleString("en-US");
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
  const rate = rateOf(area, evidence);
  const people = area.census.population2023;
  // Thinnest coverage per resident first; unchecked areas sink to the bottom.
  const sorted = [...regions].sort((a,b)=>(rateOf(a,current[a.id]) ?? Infinity)-(rateOf(b,current[b.id]) ?? Infinity));
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
      const value=rateOf(settlement, results[category]?.[settlement.id]);
      const polygon = new google.maps.Polygon({map:map.current,paths:settlement.boundary,geodesic:true,fillColor:accessColor(value),fillOpacity:value===undefined?.14:.52,strokeColor:settlement.id===selected?"#035352":accessColor(value),strokeOpacity:.9,strokeWeight:settlement.id===selected?3:1,zIndex:settlement.id===selected?2:1});
      polygon.addListener("click",()=>choose(settlement.id)); overlays.push(polygon);
    }
    return()=>overlays.forEach(c=>{google.maps.event.clearInstanceListeners(c);c.setMap(null)});
  },[ready,area,selected,category,results,choose]);
  async function loadCounts(){
    if(busy.current) return;
    busy.current=true;setLoading(true);
    // One click fills both tabs, visible category first, so switching tabs never lands on an empty pane.
    const order=[category,...(Object.keys(categories) as Category[]).filter(key=>key!==category)];
    setResults({});
    for(const requested of order){
      for(const settlement of regions){
        let result: AccessResult;
        try {
          const response=await fetch("/api/outreach/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({regionId:settlement.id,category:requested})});
          const data=await response.json();
          result=response.ok && Number.isSafeInteger(data.count) && data.count>=0 ? {count:data.count,fetchedAt:data.fetchedAt} : {error:data.error || "Data unavailable. Please try again."};
        }catch{result={error:"Connection interrupted. Availability is unknown."}}
        setResults(old=>({...old,[requested]:{...old[requested],[settlement.id]:result}}));
      }
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
          <div className={styles.listHeader}><span>{regions.length} REGIONS</span><span>TEHSILS</span></div>
          <button className={styles.loadButton} disabled={loading} onClick={loadCounts}>{loading?"Checking Google listings…":hasData?"Refresh areas ↻":"Show access gaps ↗"}</button>
          <div className={styles.areaList}>{sorted.map((s,index)=>{
            const result=current[s.id]; const value=result && "count" in result?result.count:undefined; const perTenK=rateOf(s,result);
            return <button key={s.id} className={styles.areaButton} aria-pressed={selected===s.id} onClick={()=>choose(s.id)}><span className={styles.number}>{String(index+1).padStart(2,"0")}</span><span><strong>{s.name}</strong><small>{plans.includes(s.id)?"In your visit plan":result && "error" in result?"Data unavailable":value===undefined||perTenK===undefined?"Not checked yet":value===0?"None listed":`${value} listed · ${formatRate(perTenK)} per 10,000 people`}</small></span><span className={styles.dot} style={{background:accessColor(perTenK)}}/></button>;
          })}</div>
          {unmappedUnits.map(unit=><p key={unit.id} className={styles.listHint}>Not shown: {unit.name} sub-tehsil, {number(unit.census.population2023)} people. It has no boundary in the 2017 dataset, so it is not shaded.</p>)}
          <p className={styles.googleAttribution} translate="no">Listing counts: Google Maps</p>
        </aside>
        <div className={styles.mapColumn}>
          <div className={styles.mapFrame}>
            <div ref={mapElement} className={styles.map} aria-label="Map of Makran coast tehsil boundaries"/>
            {(!browserKey || mapError || !ready) && <div className={styles.mapNotice} role="status"><strong>{mapError?"Map unavailable":!browserKey?"Map setup needed":"Opening the map…"}</strong><p>{mapError || (!browserKey?"Add the Google Maps browser key to enable the map. The community list still works.":"Finding our communities along the Makran coast.")}</p></div>}
            <div className={styles.mapLabel}><GlassMaterial/>MAKRAN COAST <span>BALOCHISTAN, PAKISTAN</span></div>
          </div>
          <div className={styles.legend} aria-label="Listing rate legend">{[["#c34236","None listed"],["#de8a25",`Under ${WHO_FACILITY_BENCHMARK_PER_10K} per 10,000 people`],["#035352",`${WHO_FACILITY_BENCHMARK_PER_10K} or more per 10,000 people`],["#777d77","Not known"]].map(([color,label])=><span key={label}><i style={{background:color}}/>{label}</span>)}<small>Tehsil boundaries: <a href="https://www.geoboundaries.org/api/current/gbOpen/PAK/ADM3/">geoBoundaries</a> 2017 · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a> · <a href="/data/makran-tehsils.json" download>Download</a></small></div>
          <p className={styles.legendNote}>Rates divide Google listings by each tehsil&rsquo;s 2023 census population. {WHO_FACILITY_BENCHMARK_PER_10K} per 10,000 is the WHO service-availability benchmark for health facilities; pharmacies have no WHO target, so for them the line is a reference only.</p>
        </div>
      </div>
      <div className={styles.detail}><GlassMaterial/>
        <div className={styles.placeHeading}><h2>{area.name}</h2><p>{number(people)} people · {number(area.census.areaKm2)} km² · {Math.round(people/area.census.areaKm2)} per km² · 2023 census</p></div>
        <details className={styles.areaEvidence}><summary>Area details</summary>
          <p>{count === undefined || rate === undefined ? "Listing count not available yet." : count === 0 ? `Google lists no ${category === "medical" ? "hospital or doctor" : "pharmacy"} inside this boundary.` : `${count} ${category === "medical" ? "medical-care" : "pharmacy"} ${count === 1 ? "listing" : "listings"} inside this boundary: ${formatRate(rate)} per 10,000 people, about one for every ${number(peoplePerListing(count, people)!)} residents.`}</p>
          <p>{category === "medical" ? `The WHO service-availability benchmark is ${WHO_FACILITY_BENCHMARK_PER_10K} health facilities per 10,000 people, which would mean ${listingsToBenchmark(people)} here. Listings are not verified facilities.` : `WHO sets no pharmacy target; ${WHO_FACILITY_BENCHMARK_PER_10K} per 10,000 people (${listingsToBenchmark(people)} here) is shown as a reference only. Listings are not licensed pharmacies.`}</p>
          <p>{evidence && "fetchedAt" in evidence ? `Checked ${new Date(evidence.fetchedAt).toLocaleString()} · Google Maps` : evidence && "error" in evidence ? evidence.error : "Choose Show access gaps to check this area."}</p>
          <p>In the 2023 census, {number(area.census.disability2023)} people here ({percent(area.census.disability2023, area.census.disabilityBase2023)}) reported a lot of difficulty seeing, hearing, walking, remembering, with self-care or communicating, and {number(area.census.functionalLimitation2023)} ({percent(area.census.functionalLimitation2023, area.census.disabilityBase2023)}) reported some difficulty. District-wide: {percent(district.disability2023, district.disabilityBase2023)} and {percent(district.functionalLimitation2023, district.disabilityBase2023)}.{area.census.disabilityBase2023 !== people ? ` These shares use the census base of ${number(area.census.disabilityBase2023)} people for this unit.` : ""}</p>
          <p>{area.census.unit}, Pakistan Bureau of Statistics Census 2023 (Tables 1 and 16), drawn with the published 2017 boundary. Population, area and difficulty counts are census figures, not sickness counts; listings are Google Maps listings.</p>
        </details>
        <div className={styles.planAction}><button onClick={togglePlan}>{plans.includes(selected)?"Remove from visit plan":"Plan a visit here"}<span>↗</span></button><p role="status">{planMessage}</p></div>
      </div>
    </section>
    <footer className={styles.footer}><span>MASHWARA · مشورہ</span><span>Better care begins with listening.</span></footer>
    {browserKey && <Script id="outreach-google-maps" src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(browserKey)}&v=weekly`} onReady={()=>setReady(true)} onError={()=>setMapError("Could not load Google Maps. Check your connection and browser key.")}/>}
  </main>;
}
