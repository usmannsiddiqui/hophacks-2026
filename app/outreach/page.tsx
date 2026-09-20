import type { Metadata } from "next";
import OutreachMap from "./outreach-map";
export const metadata: Metadata = {title:"Where care is needed · Mashwara", description:"Explore listed healthcare access around Pasni and plan a community visit."};
export default function OutreachPage() { return <OutreachMap />; }
