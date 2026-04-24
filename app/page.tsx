"use client";
import { useState, useEffect } from "react";

type Hierarchy = {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: boolean;
};

type ApiResponse = {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: {
    total_trees: number;
    total_cycles: number;
    largest_tree_root: string;
  };
};

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

function TreeNode({ node, children, level = 0, dark }: { node: string; children: Record<string, unknown>; level?: number; dark: boolean }) {
  const keys = Object.keys(children);
  return (
    <div style={{ paddingLeft: level === 0 ? 0 : 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
        {level > 0 && <span style={{ color: dark ? "#666" : "#aaa", fontSize: 12 }}>└</span>}
        <span style={{
          fontFamily: "monospace",
          fontSize: 13,
          background: level === 0 ? (dark ? "#fff" : "#111") : (dark ? "#222" : "#f4f4f4"),
          color: level === 0 ? (dark ? "#111" : "#fff") : (dark ? "#eee" : "#111"),
          padding: "2px 8px",
          borderRadius: 4,
          fontWeight: level === 0 ? 600 : 400,
        }}>{node}</span>
      </div>
      {keys.map(k => (
        <TreeNode key={k} node={k} children={children[k] as Record<string, unknown>} level={level + 1} dark={dark} />
      ))}
    </div>
  );
}

export default function Home() {
  const dark = useDarkMode();

  const [input, setInput] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setResult(null);
    const raw = input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!raw.length) { setError("Enter at least one node."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/bfhl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: raw }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const bg = dark ? "#0b0b0b" : "#fff";
  const text = dark ? "#eee" : "#111";
  const sub = dark ? "#aaa" : "#666";
  const border = dark ? "#333" : "#ddd";
  const card = dark ? "#111" : "#f9f9f9";

  return (
    <main style={{
      maxWidth: 720,
      margin: "0 auto",
      padding: "48px 24px",
      fontFamily: "'DM Sans', sans-serif",
      background: "var(--bg)",
      color: "var(--text)"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>BFHL Node Processor</h1>
      <p style={{ color: sub, fontSize: 14, marginBottom: 32 }}>
        Enter edges like <code style={{ background: dark ? "#222" : "#f4f4f4", padding: "1px 6px", borderRadius: 4 }}>A-&gt;B</code>
      </p>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={6}
        style={{
          width: "100%",
          fontFamily: "DM Mono, monospace",
          fontSize: 13,
          padding: "12px 14px",
          border: `1.5px solid ${border}`,
          borderRadius: 8,
          background: dark ? "#111" : "#fff",
          color: text
        }}
      />

      <button
        onClick={submit}
        disabled={loading}
        style={{
          marginTop: 12,
          padding: "10px 24px",
          background: loading ? "#666" : (dark ? "#fff" : "#111"),
          color: dark ? "#111" : "#fff",
          border: "none",
          borderRadius: 7
        }}
      >
        {loading ? "Processing…" : "Submit"}
      </button>

      {result && (
        <div style={{ marginTop: 32 }}>
          <section>
            <h2 style={{ fontSize: 13, color: sub }}>Summary</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                ["Trees", result.summary.total_trees],
                ["Cycles", result.summary.total_cycles],
                ["Deepest Root", result.summary.largest_tree_root || "—"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: sub }}>{label}</div>
                  <div style={{ fontSize: 18 }}>{val}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 13, color: sub }}>Hierarchies</h2>
            {result.hierarchies.map((h, i) => (
              <div key={i} style={{ border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginTop: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  Root: {h.root} {h.has_cycle ? "(cycle)" : `(depth ${h.depth})`}
                </div>
                {!h.has_cycle && (
                  <TreeNode node={h.root} children={(h.tree as any)[h.root]} dark={dark} />
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}