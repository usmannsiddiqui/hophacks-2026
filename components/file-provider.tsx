"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import type { PatientFile } from "@/lib/types";
import { demoFiles, isDemo, saveDemo } from "@/lib/demo";
import { applyFilePatch } from "@/lib/validation";

type FileContextValue = {
  file: PatientFile;
  update: (patch: Partial<PatientFile>) => Promise<PatientFile>;
  busy: boolean;
  error: string;
  demo: boolean;
};
const FileContext = createContext<FileContextValue | null>(null);
export function useFile() {
  const value = useContext(FileContext);
  if (!value) throw new Error("FileProvider is required");
  return value;
}
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Request failed. Please try again.");
  return data as T;
}
export function FileProvider({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const [file, setFile] = useState<PatientFile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const demo = isDemo(id);
  const load = useCallback(async () => {
    const next = demo
      ? demoFiles().find((f) => f.id === id)
      : await fetchJson<PatientFile>(`/api/files/${encodeURIComponent(id)}`);
    if (!next)
      throw new Error(
        "This sample file is not in this browser. Start a new sample walkthrough.",
      );
    return next;
  }, [demo, id]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void load()
        .then((f) => {
          if (active) {
            setFile(f);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("storage", refresh);
    };
  }, [load]);
  const update = async (patch: Partial<PatientFile>) => {
    setBusy(true);
    setError("");
    try {
      let next: PatientFile;
      if (demo) {
        next = applyFilePatch(await load(), patch);
        saveDemo(next);
      } else
        next = await fetchJson<PatientFile>(
          `/api/files/${encodeURIComponent(id)}`,
          { method: "PATCH", body: JSON.stringify(patch) },
        );
      setFile(next);
      return next;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  if (!file)
    return (
      <main className="loading-page">
        <Link href="/file/new" className="brand">
          Mashwara
        </Link>
        {error ? (
          <>
            <h1>We couldn’t open this file.</h1>
            <p role="alert">{error}</p>
            <Link className="button" href="/file/new">
              Start a new case
            </Link>
          </>
        ) : (
          <>
            <h1>Opening the patient file</h1>
            <div className="skeleton" />
            <div className="skeleton short" />
            <p role="status">Loading the latest saved account…</p>
          </>
        )}
      </main>
    );
  return (
    <FileContext.Provider value={{ file, update, busy, error, demo }}>
      {children}
    </FileContext.Provider>
  );
}
