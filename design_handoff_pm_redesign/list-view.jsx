/* List view — "Pregled projekata" — Terminal × Brutalist */

const PROJECTS = [
  {
    id: "001",
    title: "Sertifikati stranica za SM security",
    deadline: "8. 5. 2026.",
    daysLeft: 2,
    status: "AKTIVNO",
    priority: "VISOK",
    progress: 64,
    activity: "prije 12 min",
    owner: "MK",
    ownerColor: "#C6F432",
    tasks: { done: 9, total: 14 },
  },
  {
    id: "002",
    title: "Migracija API-ja na v3 (auth + billing)",
    deadline: "22. 5. 2026.",
    daysLeft: 16,
    status: "AKTIVNO",
    priority: "KRITIČAN",
    progress: 38,
    activity: "prije 2 h",
    owner: "AN",
    ownerColor: "#FF3DAA",
    tasks: { done: 11, total: 29 },
  },
  {
    id: "003",
    title: "Redesign internal dashboard-a",
    deadline: "14. 6. 2026.",
    daysLeft: 39,
    status: "AKTIVNO",
    priority: "SREDNJI",
    progress: 21,
    activity: "prije 1 d",
    owner: "DJ",
    ownerColor: "#22D3EE",
    tasks: { done: 4, total: 19 },
  },
  {
    id: "004",
    title: "Postavljanje observability stacka",
    deadline: "1. 5. 2026.",
    daysLeft: -5,
    status: "PROBIJEN ROK",
    priority: "VISOK",
    progress: 82,
    activity: "prije 4 h",
    owner: "VS",
    ownerColor: "#F5A524",
    tasks: { done: 22, total: 27 },
  },
  {
    id: "005",
    title: "Onboarding flow — verzija 2",
    deadline: "30. 4. 2026.",
    daysLeft: -6,
    status: "ZAVRŠEN",
    priority: "SREDNJI",
    progress: 100,
    activity: "prije 6 d",
    owner: "MK",
    ownerColor: "#C6F432",
    tasks: { done: 18, total: 18 },
  },
];

const STATS = [
  { label: "UKUPNO", value: "05", tone: "neutral", delta: "+2 mj" },
  { label: "AKTIVNI", value: "03", tone: "lime", delta: "62%" },
  { label: "ZAVRŠENI", value: "01", tone: "cyan", delta: "20%" },
  { label: "PROBIJENI ROK", value: "01", tone: "magenta", delta: "20%" },
];

const TONE = {
  neutral: { fg: "#E8EAED", bar: "#2A2E33" },
  lime:    { fg: "#C6F432", bar: "#C6F432" },
  cyan:    { fg: "#22D3EE", bar: "#22D3EE" },
  magenta: { fg: "#FF3DAA", bar: "#FF3DAA" },
  amber:   { fg: "#F5A524", bar: "#F5A524" },
};

const PRIORITY_TONE = {
  "KRITIČAN": "magenta",
  "VISOK":    "amber",
  "SREDNJI":  "cyan",
  "NIZAK":    "neutral",
};

const STATUS_TONE = {
  "AKTIVNO":      "lime",
  "PROBIJEN ROK": "magenta",
  "ZAVRŠEN":      "cyan",
  "PAUZIRAN":     "neutral",
};

function Glyph({ d, size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <path d={d} />
    </svg>
  );
}

function StatCard({ s, i }) {
  const t = TONE[s.tone];
  return (
    <div style={{
      position: "relative",
      padding: "28px 28px 24px",
      borderRight: i < STATS.length - 1 ? "1px solid #1A1D21" : "none",
      display: "flex", flexDirection: "column", gap: 18,
      minHeight: 168,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
          color: "#6B7079", fontFeatureSettings: "'tnum'",
        }}>
          ▌ {s.label}
        </div>
        <div style={{
          fontSize: 10, letterSpacing: "0.08em", color: "#6B7079",
          fontVariantNumeric: "tabular-nums",
        }}>
          {s.delta}
        </div>
      </div>
      <div style={{
        fontSize: 88, lineHeight: 0.9, fontWeight: 500,
        color: t.fg, letterSpacing: "-0.04em",
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: "'tnum', 'ss01'",
      }}>
        {s.value}
      </div>
      <div style={{ display: "flex", gap: 3, height: 3 }}>
        {Array.from({ length: 12 }).map((_, k) => {
          const filled = k < (parseInt(s.value, 10) / 5) * 12;
          return (
            <div key={k} style={{
              flex: 1,
              background: filled ? t.bar : "#1A1D21",
              opacity: filled ? 1 : 1,
            }} />
          );
        })}
      </div>
    </div>
  );
}

function PriorityChip({ p }) {
  const tone = TONE[PRIORITY_TONE[p]];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 8px",
      border: `1px solid ${tone.fg}33`,
      background: `${tone.fg}0F`,
      color: tone.fg,
      fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
      fontVariantNumeric: "tabular-nums",
    }}>
      <span style={{ width: 5, height: 5, background: tone.fg, borderRadius: "50%" }} />
      {p}
    </div>
  );
}

function StatusChip({ s }) {
  const tone = TONE[STATUS_TONE[s]];
  const pulse = s === "AKTIVNO";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
      color: tone.fg,
    }}>
      <span style={{
        width: 6, height: 6, background: tone.fg, borderRadius: "50%",
        boxShadow: pulse ? `0 0 0 0 ${tone.fg}` : "none",
        animation: pulse ? "pulse 1.6s ease-out infinite" : "none",
      }} />
      {s}
    </div>
  );
}

function ProgressBar({ value, tone = "lime" }) {
  const t = TONE[tone];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        flex: 1, height: 2, background: "#1A1D21", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, width: `${value}%`,
          background: t.fg,
        }} />
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: t.fg, minWidth: 32, textAlign: "right",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}%
      </div>
    </div>
  );
}

function ProjectRow({ p }) {
  const overdue = p.daysLeft < 0;
  const done = p.status === "ZAVRŠEN";
  const progressTone = done ? "cyan" : overdue ? "magenta" : "lime";

  return (
    <div className="proj-row" style={{
      display: "grid",
      gridTemplateColumns: "60px 1fr 180px 140px 160px 140px 32px",
      alignItems: "center",
      gap: 24,
      padding: "22px 28px",
      borderTop: "1px solid #16191D",
      cursor: "pointer",
      position: "relative",
      transition: "background 0.15s ease",
    }}>
      {/* ID */}
      <div style={{
        fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
        color: "#4A4F57", fontVariantNumeric: "tabular-nums",
      }}>
        №{p.id}
      </div>

      {/* Title + status */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div style={{
          fontSize: 17, fontWeight: 500, color: "#F5F6F7",
          letterSpacing: "-0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {p.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <StatusChip s={p.status} />
          <span style={{ color: "#2A2E33" }}>·</span>
          <div style={{ fontSize: 10, color: "#6B7079", letterSpacing: "0.08em",
            fontVariantNumeric: "tabular-nums" }}>
            {p.tasks.done}/{p.tasks.total} TASK
          </div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar value={p.progress} tone={progressTone} />

      {/* Priority */}
      <div><PriorityChip p={p.priority} /></div>

      {/* Deadline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: overdue ? "#FF3DAA" : "#E8EAED",
          fontVariantNumeric: "tabular-nums",
        }}>
          {p.deadline}
        </div>
        <div style={{
          fontSize: 10, letterSpacing: "0.08em",
          color: overdue ? "#FF3DAA" : "#6B7079",
          fontVariantNumeric: "tabular-nums",
        }}>
          {overdue ? `KAŠNJENJE ${Math.abs(p.daysLeft)}d` : `OSTALO ${p.daysLeft}d`}
        </div>
      </div>

      {/* Activity / owner */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: p.ownerColor + "1F",
          border: `1px solid ${p.ownerColor}66`,
          color: p.ownerColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
        }}>{p.owner}</div>
        <div style={{
          fontSize: 11, color: "#6B7079", letterSpacing: "0.04em",
        }}>{p.activity}</div>
      </div>

      {/* Chevron */}
      <div style={{ color: "#4A4F57", display: "flex", justifyContent: "flex-end" }}>
        <Glyph d="M6 3l5 5-5 5" size={14} />
      </div>
    </div>
  );
}

function ListView() {
  return (
    <div style={{
      width: 1280,
      background: "#0A0B0D",
      color: "#E8EAED",
      fontFamily: "'Geist', system-ui, sans-serif",
      minHeight: 880,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(#11141700 0, #11141700 calc(100% - 1px), #14171A 100%), linear-gradient(90deg, #11141700 0, #11141700 calc(100% - 1px), #14171A 100%)",
        backgroundSize: "80px 80px",
        opacity: 0.5,
        pointerEvents: "none",
      }} />

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 28px",
        borderBottom: "1px solid #16191D",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 28, height: 28,
            background: "#C6F432",
            color: "#0A0B0D",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14, letterSpacing: "-0.04em",
          }}>e7</div>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.16em",
            color: "#6B7079",
          }}>
            INTERNAL <span style={{ color: "#2A2E33", margin: "0 8px" }}>/</span> PROJECT MANAGEMENT
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 600, letterSpacing: "0.16em",
            color: "#C6F432",
            padding: "3px 8px",
            border: "1px solid #C6F43233",
            background: "#C6F4320F",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", background: "#C6F432",
              animation: "pulse 1.6s ease-out infinite",
            }} />
            LIVE
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: "#6B7079", letterSpacing: "0.08em" }}>
          <div style={{ fontVariantNumeric: "tabular-nums" }}>06.05.2026 — 16:42</div>
          <span style={{ color: "#2A2E33" }}>·</span>
          <div>v2.4.1</div>
          <span style={{ color: "#2A2E33" }}>·</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "#C6F4321F", border: "1px solid #C6F43266",
              color: "#C6F432",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 600,
            }}>MK</div>
            mihad@e70
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        padding: "56px 28px 40px",
        position: "relative",
        borderBottom: "1px solid #16191D",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.16em",
          color: "#6B7079", marginBottom: 18,
        }}>
          /pregled · sistem operativan · 5 zapisa
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
          <h1 style={{
            margin: 0,
            fontSize: 96, fontWeight: 600, letterSpacing: "-0.05em",
            lineHeight: 0.95, color: "#F5F6F7",
          }}>
            Pregled<br />
            <span style={{ color: "#C6F432" }}>projekata.</span>
          </h1>
          <div style={{
            display: "flex", flexDirection: "column", gap: 10,
            alignItems: "flex-end",
            paddingBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: "#6B7079", letterSpacing: "0.1em" }}>
              POSLJEDNJA SINKRONIZACIJA · 16:41:58
            </div>
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 22px",
              background: "#C6F432",
              color: "#0A0B0D",
              border: "none",
              fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
              fontFamily: "inherit",
              cursor: "pointer",
            }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>+</span>
              Novi projekat
              <span style={{
                marginLeft: 8, paddingLeft: 10,
                borderLeft: "1px solid #0A0B0D33",
                fontSize: 10, fontWeight: 600, opacity: 0.65,
                letterSpacing: "0.08em",
              }}>⌘ N</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderBottom: "1px solid #16191D",
        position: "relative",
      }}>
        {STATS.map((s, i) => <StatCard key={s.label} s={s} i={i} />)}
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 28px",
        borderBottom: "1px solid #16191D",
        gap: 24,
      }}>
        <div style={{
          flex: 1, maxWidth: 460,
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px",
          background: "#0F1114",
          border: "1px solid #1A1D21",
        }}>
          <Glyph d="M7 12a5 5 0 100-10 5 5 0 000 10zM14 14l-3.5-3.5" size={14} />
          <input
            placeholder="Pretraži projekte, ID, vlasnika..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#E8EAED", fontSize: 13, fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
          />
          <span style={{
            fontSize: 10, color: "#4A4F57", letterSpacing: "0.08em",
            border: "1px solid #1A1D21", padding: "2px 6px",
          }}>⌘ K</span>
        </div>

        <div style={{ display: "flex", gap: 0, border: "1px solid #1A1D21" }}>
          {["SVE · 5", "AKTIVNI · 3", "ZAVRŠENI · 1", "PROBIJENI · 1"].map((t, i) => (
            <button key={t} style={{
              padding: "9px 14px",
              background: i === 0 ? "#C6F432" : "transparent",
              color: i === 0 ? "#0A0B0D" : "#6B7079",
              border: "none",
              borderLeft: i > 0 ? "1px solid #1A1D21" : "none",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              fontFamily: "inherit", cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 0, border: "1px solid #1A1D21" }}>
          {["LISTA", "KANBAN", "GANTT"].map((t, i) => (
            <button key={t} style={{
              padding: "9px 14px",
              background: i === 0 ? "#1A1D21" : "transparent",
              color: i === 0 ? "#F5F6F7" : "#6B7079",
              border: "none",
              borderLeft: i > 0 ? "1px solid #1A1D21" : "none",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              fontFamily: "inherit", cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "60px 1fr 180px 140px 160px 140px 32px",
        gap: 24,
        padding: "12px 28px",
        fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
        color: "#4A4F57",
      }}>
        <div>ID</div>
        <div>PROJEKAT</div>
        <div>NAPREDAK</div>
        <div>PRIORITET</div>
        <div>ROK</div>
        <div>AKTIVNOST</div>
        <div></div>
      </div>

      {/* Rows */}
      <div>
        {PROJECTS.map(p => <ProjectRow key={p.id} p={p} />)}
      </div>

      {/* Footer status bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        borderTop: "1px solid #16191D",
        marginTop: 32,
        fontSize: 10, letterSpacing: "0.12em", color: "#4A4F57",
        fontVariantNumeric: "tabular-nums",
      }}>
        <div style={{ display: "flex", gap: 18 }}>
          <span style={{ color: "#C6F432" }}>● CONNECTED</span>
          <span>LATENCY 12ms</span>
          <span>SYNC OK</span>
        </div>
        <div>e70 / pm · build 2026.05.06</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 currentColor; }
          70%  { box-shadow: 0 0 0 6px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .proj-row:hover {
          background: #0F1114;
        }
      `}</style>
    </div>
  );
}

window.ListView = ListView;
