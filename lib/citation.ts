/** Preserve labelled source strings while giving the report a usable, compact link. */
export function citationDetails(citation: string): { href: string | null; label: string } {
  const address = citation.match(/https?:\/\/[^\s<>"']+/)?.[0];
  if (!address) return { href: null, label: citation };
  try {
    const url = new URL(address);
    const host = url.hostname.replace(/^www\./, "");
    const publisher: Record<string, string> = {
      "nhs.uk": "NHS",
      "mskcc.org": "Memorial Sloan Kettering",
      "fda.gov": "FDA",
    };
    return { href: url.href, label: publisher[host] ?? host };
  } catch {
    return { href: null, label: citation };
  }
}
