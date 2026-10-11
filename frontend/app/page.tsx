"use client";

import { useEffect, useState } from "react";

type ApiStatus = "checking" | "online" | "offline";

export default function Home() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiUrl}/health/ready`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        return response.json();
      })
      .then(() => setApiStatus("online"))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setApiStatus("offline");
      });

    return () => controller.abort();
  }, [apiUrl]);

  return (
    <main className="page">
      <section className="card" aria-labelledby="page-title">
        <p className="eyebrow">NEXT.JS + FASTAPI + POSTGRESQL</p>
        <h1 id="page-title">Bunk24 Gallery</h1>
        <p className="intro">
          Your full-stack starter is ready. Build your gallery experience here.
        </p>
        <div className="status" role="status" aria-live="polite">
          <span
            className={`status-dot status-dot-${apiStatus}`}
            aria-hidden="true"
          />
          {apiStatus === "checking" && "Checking API and database…"}
          {apiStatus === "online" && "API and database are connected"}
          {apiStatus === "offline" && "API or database is unavailable"}
        </div>
        <div className="links">
          <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">
            API documentation
          </a>
          <a href={`${apiUrl}/health/ready`} target="_blank" rel="noreferrer">
            Readiness endpoint
          </a>
        </div>
      </section>
    </main>
  );
}
