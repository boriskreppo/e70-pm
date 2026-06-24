/* Detail view — single project — Terminal × Brutalist */

const TASKS = [
  { id: "T-01", title: "Audit postojećih SSL certifikata", status: "DONE",       owner: "MK", due: "2.5.", priority: "VISOK" },
  { id: "T-02", title: "Pripremiti CSR za sm-security.ba", status: "DONE",       owner: "MK", due: "3.5.", priority: "VISOK" },
  { id: "T-03", title: "Validirati domain ownership (DNS)",  status: "DONE",     owner: "AN", due: "4.5.", priority: "SREDNJI" },
  { id: "T-04", title: "Generisati Let's Encrypt wildcard",  status: "IN PROGRESS", owner: "MK", due: "7.5.", priority: "VISOK" },
  { id: "T-05", title: "Konfigurisati nginx reverse proxy",  status: "IN PROGRESS", owner: "DJ", due: "7.5.", priority: "KRITIČAN" },
  { id: "T-06", title: "Postaviti auto-renewal cron",        status: "TODO",     owner: "MK", due: "8.5.", priority: "VISOK" },
  { id: "T-07", title: "Penetration test endpoint-a",        status: "TODO",     owner: "VS", due: "8.5.", priority: "KRITIČAN" },
  { id: "T-08", title: "Dokumentacija + handover",           status: "TODO",     owner: "AN", due: "8.5.", priority: "NIZAK" },
];

const TIMELINE = [
  { time: "16:32", actor: "MK", action: "spojio commit", target: "feat: nginx ssl config", tone: "lime" },
  { time: "15:14", actor: "DJ", action: "promijenio status", target: "T-05 → IN PROGRESS", tone: "cyan" },
  { time: "11:08", actor: "AN", action: "dodao komentar na", target: "T-03", tone: "neutral" },
  { time: "09:42", actor: "MK", action: "zatvorio", target: "T-03", tone: "lime" },
  { time: "yesterday", actor: "VS", action: "prepravio prioritet", target: "T-07 → KRITIČAN", tone: "magenta" },
  { time: "yesterday", actor: "MK", action: "kreirao", target: "T-07, T-08", tone: "neutral" },
];

const TEAM = [
  { initials: "MK", name: "Mihad K.",    role: "Lead",      color: "#C6F432" },
  { initials: "AN", name: "Adi N.",      role: "Backend",   color: "#FF3DAA" },
  { initials: "DJ", name: "Dženan J.",   role: "Infra",     color: "#22D3EE" },
  { initials: "VS", name: "Vedad S.",    role: "Security",  color: "#F5A524" },
];

const D_TONE = {
  neutral: { fg: "#E8EAED", bg: "#1A1D21" },
  lime:    { fg: "#C6F432", bg: "#C6F4321F" },
  cyan:    { fg: "#22D3EE", bg: "#22D3EE1F" },
  magenta: { fg: "#FF3DAA", bg: "#FF3DAA1F" },
  amber:   { fg: "#F5A524", bg: "#F5A5241F" },
};

const D_PRI = {
  "KRITIČAN": "magenta",
  "VISOK":    "amber",
  "SREDNJI":  "cyan",
  "NIZAK":    "neutral",
};

const D_TASK_STATUS = {
  "DONE":        { tone: "lime",    glyph: "✓" },
  "IN PROGRESS": { tone: "cyan",    glyph: "◐" },
  "TODO":        { tone: "neutral", glyph: "○" },
  "BLOCKED":     { tone: "magenta", glyph: "✕" },
};

function DGlyph({ d, size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <path d={d} />
    </svg>
  );
}

function MetaCell({ label, value, tone = "neutral", mono = false }) {
  const t = D_TONE[tone];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "20px 24px", flex: 1 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", color: "#6B7079",
      }}>
        ▌ {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
        color: t.fg,
        fontVariantNumeric: "tabular-nums",
        fontFamily: mono ? "'Geist Mono', ui-monospace, monospace" : "inherit",
      }}>
        {value}
      </div>
    </div>
  );
}

function TaskRow({ t, idx }) {
  const status = D_TASK_STATUS[t.status];
  const sTone = D_TONE[status.tone];
  const pTone = D_TONE[D_PRI[t.priority]];
  const done = t.status === "DONE";

  return (
    <div className="task-row" style={{
      display: "grid",
      gridTemplateColumns: "32px 80px 1fr 130px 90px 70px 110px",
      alignItems: "center",
      gap: 16,
      padding: "14px 20px",
      borderTop: "1px solid #16191D",
      cursor: "pointer",
    }}>
      <div style={{
        width: 22, height: 22, border: `1.5px solid ${sTone.fg}`,
        background: done ? sTone.fg : "transparent",
        color: done ? "#0A0B0D" : sTone.fg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, lineHeight: 1,
      }}>{done ? "✓" : ""}</div>

      <div style={{
        fontSize: 11, color: "#4A4F57", letterSpacing: "0.06em",
        fontVariantNumeric: "tabular-nums",
      }}>{t.id}</div>

      <div style={{
        fontSize: 14, fontWeight: 500,
        color: done ? "#6B7079" : "#E8EAED",
        textDecoration: done ? "line-through" : "none",
        textDecorationColor: "#4A4F57",
        letterSpacing: "-0.005em",
      }}>{t.title}</div>

      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
        color: sTone.fg,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ width: 5, height: 5, background: sTone.fg, borderRadius: "50%" }} />
        {t.status}
      </div>

      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
        color: pTone.fg,
      }}>{t.priority}</div>

      <div style={{
        fontSize: 12, color: "#6B7079", fontVariantNumeric: "tabular-nums",
      }}>{t.due}</div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end",
      }}>
        {(() => {
          const member = TEAM.find(m => m.initials === t.owner);
          return (
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: (member?.color || "#fff") + "1F",
              border: `1px solid ${member?.color || "#fff"}66`,
              color: member?.color || "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 600,
            }}>{t.owner}</div>
          );
        })()}
      </div>
    </div>
  );
}

function MiniBar({ value, max, tone }) {
  return (
    <div style={{ height: 4, background: "#1A1D21", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0, width: `${(value / max) * 100}%`,
        background: tone,
      }} />
    </div>
  );
}

function DetailView() {
  const tasksDone = TASKS.filter(t => t.status === "DONE").length;
  const tasksIP   = TASKS.filter(t => t.status === "IN PROGRESS").length;
  const tasksTodo = TASKS.filter(t => t.status === "TODO").length;
  const progress = Math.round((tasksDone / TASKS.length) * 100);

  return (
    <div style={{
      width: 1280,
      background: "#0A0B0D",
      color: "#E8EAED",
      fontFamily: "'Geist', system-ui, sans-serif",
      minHeight: 1280,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 28px",
        borderBottom: "1px solid #16191D",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 28, height: 28, background: "#C6F432", color: "#0A0B0D",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14, letterSpacing: "-0.04em",
          }}>e7</div>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", color: "#6B7079",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span>INTERNAL</span>
            <span style={{ color: "#2A2E33" }}>/</span>
            <span>PM</span>
            <span style={{ color: "#2A2E33" }}>/</span>
            <span style={{ color: "#E8EAED" }}>№001</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{
            padding: "8px 14px", background: "transparent", color: "#6B7079",
            border: "1px solid #1A1D21", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.1em", fontFamily: "inherit", cursor: "pointer",
          }}>← NAZAD</button>
          <button style={{
            padding: "8px 14px", background: "transparent", color: "#6B7079",
            border: "1px solid #1A1D21", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.1em", fontFamily: "inherit", cursor: "pointer",
          }}>UREDI · ⌘E</button>
          <button style={{
            padding: "8px 14px", background: "#C6F432", color: "#0A0B0D",
            border: "none", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.1em", fontFamily: "inherit", cursor: "pointer",
          }}>OZNAČI ZAVRŠENO</button>
        </div>
      </div>

      {/* Project header */}
      <div style={{
        padding: "48px 28px 36px",
        borderBottom: "1px solid #16191D",
        position: "relative",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.14em",
          color: "#6B7079", marginBottom: 22,
        }}>
          <span style={{ color: "#4A4F57" }}>№001</span>
          <span style={{ color: "#2A2E33" }}>·</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "#C6F432",
          }}>
            <span style={{
              width: 6, height: 6, background: "#C6F432", borderRadius: "50%",
              animation: "pulse 1.6s ease-out infinite",
            }} />
            AKTIVNO
          </span>
          <span style={{ color: "#2A2E33" }}>·</span>
          <span style={{
            padding: "3px 8px", border: "1px solid #F5A52433",
            background: "#F5A5240F", color: "#F5A524",
          }}>● VISOK PRIORITET</span>
          <span style={{ color: "#2A2E33" }}>·</span>
          <span>SECURITY · INFRA</span>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 64, fontWeight: 600, letterSpacing: "-0.04em",
          lineHeight: 1.0, color: "#F5F6F7",
          maxWidth: 900,
        }}>
          Sertifikati stranica<br />
          za <span style={{ color: "#C6F432" }}>SM&nbsp;security</span>.
        </h1>

        <p style={{
          marginTop: 24, marginBottom: 0,
          fontSize: 16, lineHeight: 1.55, color: "#9AA0A8",
          maxWidth: 720, fontWeight: 400,
        }}>
          Implementacija wildcard SSL certifikata kroz Let's Encrypt za sve poddomene
          sm-security.ba uz auto-renewal i monitoring expiracije. Penetration test
          mora biti završen prije produkcije.
        </p>
      </div>

      {/* Meta strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        borderBottom: "1px solid #16191D",
        background: "#0C0E11",
      }}>
        <MetaCell label="ROK" value="08.05.2026" tone="amber" mono />
        <MetaCell label="OSTALO" value="2 dana" tone="amber" />
        <MetaCell label="NAPREDAK" value={`${progress}%`} tone="lime" />
        <MetaCell label="TASKOVI" value={`${tasksDone} / ${TASKS.length}`} tone="neutral" />
        <MetaCell label="BUDŽET" value="74%" tone="cyan" />
      </div>

      {/* Two-col content */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
      }}>
        {/* Left: tasks + progress chart */}
        <div style={{ borderRight: "1px solid #16191D" }}>
          {/* Progress visualization */}
          <div style={{ padding: "32px 28px", borderBottom: "1px solid #16191D" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              marginBottom: 20,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "#6B7079",
              }}>▌ NAPREDAK</div>
              <div style={{
                display: "flex", gap: 24,
                fontSize: 11, color: "#6B7079", letterSpacing: "0.1em",
              }}>
                <span><span style={{ color: "#C6F432" }}>●</span> ZAVRŠENO {tasksDone}</span>
                <span><span style={{ color: "#22D3EE" }}>●</span> U TOKU {tasksIP}</span>
                <span><span style={{ color: "#4A4F57" }}>●</span> ČEKA {tasksTodo}</span>
              </div>
            </div>

            {/* segmented stacked bar */}
            <div style={{
              display: "flex", gap: 2, height: 8, marginBottom: 24,
            }}>
              {TASKS.map(t => {
                const c = D_TASK_STATUS[t.status].tone;
                return <div key={t.id} style={{ flex: 1, background: D_TONE[c].fg }} />;
              })}
            </div>

            {/* burndown sparkline */}
            <div style={{ position: "relative", height: 100 }}>
              <svg width="100%" height="100" viewBox="0 0 800 100" preserveAspectRatio="none">
                {/* grid */}
                {[0, 25, 50, 75, 100].map(y => (
                  <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="#16191D" strokeWidth="1" />
                ))}
                {/* ideal */}
                <line x1="0" y1="10" x2="800" y2="90" stroke="#2A2E33" strokeWidth="1" strokeDasharray="3 3" />
                {/* actual */}
                <polyline
                  points="0,15 100,22 200,28 300,42 400,50 500,52 600,58 700,68 800,72"
                  fill="none" stroke="#C6F432" strokeWidth="2"
                />
                {/* projection */}
                <polyline
                  points="800,72 880,90"
                  fill="none" stroke="#C6F432" strokeWidth="2" strokeDasharray="4 4" opacity="0.5"
                />
                {/* dots */}
                {[[0,15],[100,22],[200,28],[300,42],[400,50],[500,52],[600,58],[700,68],[800,72]].map(([x,y], i) => (
                  <circle key={i} cx={x} cy={y} r="3" fill="#0A0B0D" stroke="#C6F432" strokeWidth="1.5" />
                ))}
              </svg>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 10, color: "#4A4F57", letterSpacing: "0.1em",
              marginTop: 8, fontVariantNumeric: "tabular-nums",
            }}>
              <span>1.5</span><span>2.5</span><span>3.5</span><span>4.5</span><span>5.5</span><span>6.5</span><span>7.5</span><span>8.5</span><span style={{ color: "#C6F432" }}>DEADLINE</span>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "20px 28px 12px",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "#6B7079",
              }}>▌ TASKOVI · {TASKS.length}</div>
              <button style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                color: "#C6F432", background: "transparent", border: "none",
                fontFamily: "inherit", cursor: "pointer",
              }}>+ DODAJ TASK</button>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "32px 80px 1fr 130px 90px 70px 110px",
              gap: 16,
              padding: "8px 20px",
              fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", color: "#4A4F57",
            }}>
              <div></div>
              <div>ID</div>
              <div>OPIS</div>
              <div>STATUS</div>
              <div>PRIORITET</div>
              <div>ROK</div>
              <div style={{ textAlign: "right" }}>VLASNIK</div>
            </div>
            {TASKS.map((t, i) => <TaskRow key={t.id} t={t} idx={i} />)}
          </div>
        </div>

        {/* Right: sidebar */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Team */}
          <div style={{ padding: "28px", borderBottom: "1px solid #16191D" }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "#6B7079",
              marginBottom: 18,
            }}>▌ TIM · {TEAM.length}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {TEAM.map(m => (
                <div key={m.initials} style={{
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: m.color + "1F",
                    border: `1px solid ${m.color}66`,
                    color: m.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600,
                  }}>{m.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#E8EAED", fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: "#6B7079", letterSpacing: "0.1em", marginTop: 2 }}>
                      {m.role.toUpperCase()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, color: "#4A4F57", letterSpacing: "0.1em",
                  }}>{Math.floor(Math.random() * 5) + 1} TASK</div>
                </div>
              ))}
            </div>
          </div>

          {/* Repo / links */}
          <div style={{ padding: "28px", borderBottom: "1px solid #16191D" }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "#6B7079",
              marginBottom: 16,
            }}>▌ POVEZANO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "git/sm-sec/ssl-config", meta: "main · 12 commits" },
                { label: "linear/SEC-142",         meta: "epic · 8 issues" },
                { label: "figma/ssl-monitoring",   meta: "5 frames" },
              ].map((l, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid #1A1D21",
                  background: "#0F1114",
                  cursor: "pointer",
                }}>
                  <div>
                    <div style={{
                      fontSize: 12, color: "#E8EAED", fontWeight: 500,
                      fontFamily: "'Geist Mono', ui-monospace, monospace",
                    }}>{l.label}</div>
                    <div style={{ fontSize: 10, color: "#6B7079", marginTop: 2, letterSpacing: "0.04em" }}>{l.meta}</div>
                  </div>
                  <div style={{ color: "#4A4F57" }}>↗</div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div style={{ padding: "28px", flex: 1 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "#6B7079",
              marginBottom: 18,
            }}>▌ AKTIVNOST</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
              {/* vertical line */}
              <div style={{
                position: "absolute", left: 11, top: 8, bottom: 8,
                width: 1, background: "#16191D",
              }} />
              {TIMELINE.map((e, i) => {
                const t = D_TONE[e.tone];
                const member = TEAM.find(m => m.initials === e.actor);
                return (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr",
                    gap: 12, alignItems: "flex-start",
                    position: "relative",
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "#0A0B0D",
                      border: `1px solid ${t.fg}66`,
                      color: t.fg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 600,
                      zIndex: 1,
                    }}>{e.actor}</div>
                    <div>
                      <div style={{ fontSize: 12, color: "#E8EAED", lineHeight: 1.45 }}>
                        <span style={{ color: member?.color || "#E8EAED", fontWeight: 500 }}>{member?.name?.split(" ")[0] || e.actor}</span>
                        <span style={{ color: "#6B7079" }}> {e.action} </span>
                        <span style={{
                          color: t.fg, fontFamily: "'Geist Mono', ui-monospace, monospace",
                          fontSize: 11,
                        }}>{e.target}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#4A4F57", marginTop: 3, letterSpacing: "0.06em" }}>
                        {e.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer status bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        borderTop: "1px solid #16191D",
        fontSize: 10, letterSpacing: "0.12em", color: "#4A4F57",
        fontVariantNumeric: "tabular-nums",
      }}>
        <div style={{ display: "flex", gap: 18 }}>
          <span style={{ color: "#C6F432" }}>● CONNECTED</span>
          <span>№001 · LOCKED BY MK</span>
          <span>AUTOSAVE 16:42</span>
        </div>
        <div>e70 / pm · build 2026.05.06</div>
      </div>

      <style>{`
        .task-row:hover { background: #0F1114; }
      `}</style>
    </div>
  );
}

window.DetailView = DetailView;
