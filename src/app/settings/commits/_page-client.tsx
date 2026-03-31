'use client';

export default function CommitsCheatSheetPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <style>{`
        .cc-page { --bg:#0a0c0f;--surface:#111418;--surface2:#181c22;--border:#1e242d;--border2:#252c38;--accent:#e8a020;--accent2:#c97010;--text:#d4d8de;--text-dim:#6b7585;--text-bright:#f0f2f5;--green:#2ea04f;--blue:#388bfd;--red:#f85149;--purple:#bc8cff;--teal:#39c5cf; }
        .cc-page *{box-sizing:border-box;}
        .cc-wrap{background:var(--bg);color:var(--text);font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:13px;line-height:1.5;padding:32px 24px;border-radius:12px;}
        .cc-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:36px;padding-bottom:24px;border-bottom:1px solid var(--border2);}
        .cc-logo-row{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
        .cc-hexagon{width:28px;height:28px;background:var(--accent);clip-path:polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;font-family:'IBM Plex Mono',monospace;}
        .cc-brand{font-size:11px;font-weight:600;letter-spacing:0.15em;color:var(--text-dim);text-transform:uppercase;}
        .cc-h1{font-size:22px;font-weight:700;color:var(--text-bright);letter-spacing:-0.02em;margin-bottom:4px;}
        .cc-subtitle{font-size:12px;color:var(--text-dim);font-family:'IBM Plex Mono',monospace;}
        .cc-version-badge{background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:8px 14px;text-align:right;}
        .cc-version-badge .label{font-size:10px;color:var(--text-dim);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px;}
        .cc-version-badge .val{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent);font-weight:600;}
        .cc-semver-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:28px;}
        .cc-semver-card{background:var(--surface);border:1px solid var(--border2);border-radius:8px;padding:16px;position:relative;overflow:hidden;}
        .cc-semver-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;}
        .cc-semver-card.major::before{background:var(--red);}
        .cc-semver-card.minor::before{background:var(--blue);}
        .cc-semver-card.patch::before{background:var(--green);}
        .cc-semver-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.08em;margin-bottom:8px;}
        .major .cc-semver-tag{background:rgba(248,81,73,0.15);color:var(--red);}
        .minor .cc-semver-tag{background:rgba(56,139,253,0.15);color:var(--blue);}
        .patch .cc-semver-tag{background:rgba(46,160,79,0.15);color:var(--green);}
        .cc-semver-title{font-size:13px;font-weight:700;color:var(--text-bright);margin-bottom:4px;}
        .cc-semver-example{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-dim);margin-bottom:8px;}
        .cc-semver-desc{font-size:11px;color:var(--text-dim);line-height:1.6;}
        .cc-semver-triggers{margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;}
        .cc-trigger-pill{background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:1px 6px;font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--text-dim);}
        .cc-section-title{font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px;display:flex;align-items:center;gap:8px;}
        .cc-section-title::after{content:'';flex:1;height:1px;background:var(--border);}
        .cc-prefix-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px;}
        .cc-prefix-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;display:grid;grid-template-columns:auto 1fr;gap:0 14px;align-items:start;}
        .cc-prefix-tag{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;white-space:nowrap;grid-row:span 2;margin-top:1px;}
        .cc-prefix-name{font-size:12px;font-weight:600;color:var(--text-bright);}
        .cc-prefix-desc{font-size:11px;color:var(--text-dim);line-height:1.5;}
        .c-green{background:rgba(46,160,79,0.15);color:var(--green);}
        .c-red{background:rgba(248,81,73,0.15);color:var(--red);}
        .c-blue{background:rgba(56,139,253,0.15);color:var(--blue);}
        .c-purple{background:rgba(188,140,255,0.15);color:var(--purple);}
        .c-teal{background:rgba(57,197,207,0.15);color:var(--teal);}
        .c-orange{background:rgba(232,160,32,0.15);color:var(--accent);}
        .c-dim{background:rgba(107,117,133,0.15);color:var(--text-dim);}
        .cc-modules-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:28px;}
        .cc-module-chip{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:8px;}
        .cc-module-num{width:18px;height:18px;background:var(--surface2);border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;color:var(--text-dim);flex-shrink:0;}
        .cc-module-name{font-size:11px;font-weight:600;color:var(--text);line-height:1.3;}
        .cc-examples-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px;}
        .cc-example-block{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;}
        .cc-example-header{padding:8px 14px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .cc-example-header-label{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;}
        .cc-bump-badge{font-family:'IBM Plex Mono',monospace;font-size:9px;padding:1px 6px;border-radius:3px;}
        .bump-major{background:rgba(248,81,73,0.15);color:var(--red);}
        .bump-minor{background:rgba(56,139,253,0.15);color:var(--blue);}
        .bump-patch{background:rgba(46,160,79,0.15);color:var(--green);}
        .bump-none{background:rgba(107,117,133,0.12);color:var(--text-dim);}
        .cc-example-body{padding:12px 14px;}
        .cc-code-line{font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.8;color:var(--text-dim);}
        .cc-code-line .prefix{font-weight:600;}
        .cc-code-line .scope{color:var(--teal);}
        .cc-code-line .msg{color:var(--text);}
        .cc-breaking-note{background:rgba(248,81,73,0.07);border:1px solid rgba(248,81,73,0.2);border-radius:8px;padding:12px 16px;margin-bottom:28px;display:flex;gap:12px;align-items:flex-start;}
        .cc-breaking-icon{color:var(--red);font-size:16px;flex-shrink:0;margin-top:1px;}
        .cc-breaking-text{font-size:11px;color:var(--text-dim);line-height:1.7;}
        .cc-breaking-text strong{color:var(--red);font-weight:600;}
        .cc-breaking-text code{font-family:'IBM Plex Mono',monospace;background:var(--surface2);padding:1px 5px;border-radius:3px;font-size:10.5px;color:var(--accent);}
        .cc-footer{padding-top:20px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .cc-footer-note{font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--text-dim);}
        .cc-footer-rule{background:var(--surface2);border:1px solid var(--border2);border-radius:5px;padding:6px 12px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--accent);}
      `}</style>

      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Commits Cheat Sheet</h1>
          <p className="text-muted-foreground">Conventional commit discipline for OTS™ development</p>
        </div>

        <div className="cc-page">
          <div className="cc-wrap">

            {/* Header */}
            <div className="cc-header">
              <div>
                <div className="cc-logo-row">
                  <div className="cc-hexagon">H</div>
                  <span className="cc-brand">Hexa Steel® · OTS™</span>
                </div>
                <h2 className="cc-h1">Conventional Commits Cheat Sheet</h2>
                <div className="cc-subtitle">git commit discipline for the Operations Tracking System</div>
              </div>
              <div className="cc-version-badge">
                <div className="label">Format</div>
                <div className="val">type(scope): message</div>
              </div>
            </div>

            {/* Semver */}
            <div className="cc-section-title">Semantic Versioning — When to bump what</div>
            <div className="cc-semver-row">
              <div className="cc-semver-card major">
                <div className="cc-semver-tag">MAJOR</div>
                <div className="cc-semver-title">Breaking Change</div>
                <div className="cc-semver-example">v15.0.0 → v16.0.0</div>
                <div className="cc-semver-desc">Existing data contracts, DB schema, or API behavior changes in a way that requires migration or breaks current users.</div>
                <div className="cc-semver-triggers">
                  <span className="cc-trigger-pill">schema migration</span>
                  <span className="cc-trigger-pill">module removal</span>
                  <span className="cc-trigger-pill">API contract change</span>
                  <span className="cc-trigger-pill">new identity spine</span>
                </div>
              </div>
              <div className="cc-semver-card minor">
                <div className="cc-semver-tag">MINOR</div>
                <div className="cc-semver-title">New Capability</div>
                <div className="cc-semver-example">v15.1.0 → v15.2.0</div>
                <div className="cc-semver-desc">A new feature, module, workflow, page, or meaningful UI addition that doesn&apos;t break existing behavior.</div>
                <div className="cc-semver-triggers">
                  <span className="cc-trigger-pill">new module page</span>
                  <span className="cc-trigger-pill">new API endpoint</span>
                  <span className="cc-trigger-pill">new template logic</span>
                  <span className="cc-trigger-pill">new dashboard widget</span>
                </div>
              </div>
              <div className="cc-semver-card patch">
                <div className="cc-semver-tag">PATCH</div>
                <div className="cc-semver-title">Fix or Polish</div>
                <div className="cc-semver-example">v15.2.0 → v15.2.1</div>
                <div className="cc-semver-desc">Bug fixes, UI corrections, copy edits, validation fixes, performance tweaks — no new behavior.</div>
                <div className="cc-semver-triggers">
                  <span className="cc-trigger-pill">bug fix</span>
                  <span className="cc-trigger-pill">UI glitch</span>
                  <span className="cc-trigger-pill">validation fix</span>
                  <span className="cc-trigger-pill">label correction</span>
                </div>
              </div>
            </div>

            {/* Prefix Reference */}
            <div className="cc-section-title">Commit Prefixes — Full Reference</div>
            <div className="cc-prefix-grid">
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-green">feat</span>
                <div className="cc-prefix-name">Feature</div>
                <div className="cc-prefix-desc">New page, new workflow, new module section, new form, new API endpoint. Triggers minor bump.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-red">fix</span>
                <div className="cc-prefix-name">Bug Fix</div>
                <div className="cc-prefix-desc">Corrects broken behavior, wrong calculation, failed validation, or incorrect display. Triggers patch bump.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-blue">refactor</span>
                <div className="cc-prefix-name">Code Refactor</div>
                <div className="cc-prefix-desc">Internal code improvement with no behavior change. Restructuring components, cleaning up logic.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-purple">schema</span>
                <div className="cc-prefix-name">Database Schema</div>
                <div className="cc-prefix-desc">Prisma model changes, new tables, new fields, new relations, or migrations. Often triggers major bump.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-orange">ui</span>
                <div className="cc-prefix-name">UI / Visual</div>
                <div className="cc-prefix-desc">Style changes, layout adjustments, responsive fixes, spacing, color. No logic change.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-teal">perf</span>
                <div className="cc-prefix-name">Performance</div>
                <div className="cc-prefix-desc">Query optimization, caching, reduced re-renders, faster load. Behavior-identical but faster.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-dim">chore</span>
                <div className="cc-prefix-name">Maintenance</div>
                <div className="cc-prefix-desc">Dependency updates, config changes, env files, tooling. No production behavior change.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-dim">docs</span>
                <div className="cc-prefix-name">Documentation</div>
                <div className="cc-prefix-desc">README, CHANGELOG, claude.md, inline comments, JSDoc. No code change.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-red">breaking</span>
                <div className="cc-prefix-name">Breaking Change</div>
                <div className="cc-prefix-desc">Use when a feat or schema change is not backward-compatible. Always triggers major bump.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-teal">api</span>
                <div className="cc-prefix-name">API Route</div>
                <div className="cc-prefix-desc">Changes specifically to Next.js API routes — new, modified, or deprecated endpoints.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-blue">auth</span>
                <div className="cc-prefix-name">Authentication / RBAC</div>
                <div className="cc-prefix-desc">Role changes, permission rules, session handling, access control updates.</div>
              </div>
              <div className="cc-prefix-card">
                <span className="cc-prefix-tag c-orange">seed</span>
                <div className="cc-prefix-name">Seed / Init Data</div>
                <div className="cc-prefix-desc">Master data, template seeding, default records, demo projects. Database population only.</div>
              </div>
            </div>

            {/* Scope Reference */}
            <div className="cc-section-title">Scope Reference — OTS™ Module Identifiers</div>
            <div className="cc-modules-grid">
              {[
                ['01','projects'],['02','planning'],['03','procurement'],['04','production'],
                ['05','quality'],['06','dispatch'],['07','workunits'],['08','design'],
                ['09','tasks'],['10','notifications'],['11','reporting'],['12','settings'],
                ['13','auth'],['14','audit'],['15','ai'],['--','system'],
              ].map(([num, name]) => (
                <div key={name} className="cc-module-chip">
                  <div className="cc-module-num">{num}</div>
                  <div className="cc-module-name">{name}</div>
                </div>
              ))}
            </div>

            {/* Breaking change note */}
            <div className="cc-breaking-note">
              <div className="cc-breaking-icon">⚠</div>
              <div className="cc-breaking-text">
                <strong>Breaking Change Syntax:</strong> Add <code>!</code> after the type/scope, or add a <code>BREAKING CHANGE:</code> footer.<br />
                Example: <code>schema(workunits)!: add mandatory buildingId FK — requires migration 0024</code><br />
                This signals Claude Code / Windsurf to bump the <strong>MAJOR</strong> version and add a migration note to the changelog.
              </div>
            </div>

            {/* Examples */}
            <div className="cc-section-title">Real Examples — OTS™ Context</div>
            <div className="cc-examples-grid">

              <div className="cc-example-block">
                <div className="cc-example-header">
                  <span className="cc-example-header-label" style={{color:'var(--blue)'}}>Planning Module</span>
                  <span className="cc-bump-badge bump-minor">minor bump</span>
                </div>
                <div className="cc-example-body">
                  <div className="cc-code-line"><span className="prefix c-green">feat</span><span className="scope">(planning)</span><span className="msg">: add stage → activity → sub-activity hierarchy</span></div>
                  <div className="cc-code-line"><span className="prefix c-green">feat</span><span className="scope">(planning)</span><span className="msg">: implement Primavera-style Gantt view</span></div>
                  <div className="cc-code-line"><span className="prefix c-green">feat</span><span className="scope">(planning)</span><span className="msg">: add template auto-suggest on project creation</span></div>
                  <div className="cc-code-line"><span className="prefix c-red">fix</span><span className="scope">(planning)</span><span className="msg">: activity duration not saving on edit</span></div>
                  <div className="cc-code-line"><span className="prefix c-purple">schema</span><span className="scope">(planning)</span><span className="msg">: add Stage, Activity, SubActivity models</span></div>
                </div>
              </div>

              <div className="cc-example-block">
                <div className="cc-example-header">
                  <span className="cc-example-header-label" style={{color:'var(--teal)'}}>Procurement Module</span>
                  <span className="cc-bump-badge bump-minor">minor bump</span>
                </div>
                <div className="cc-example-body">
                  <div className="cc-code-line"><span className="prefix c-green">feat</span><span className="scope">(procurement)</span><span className="msg">: add material availability vs demand view</span></div>
                  <div className="cc-code-line"><span className="prefix c-green">feat</span><span className="scope">(procurement)</span><span className="msg">: add vendor delivery commitment tracking</span></div>
                  <div className="cc-code-line"><span className="prefix c-red">fix</span><span className="scope">(procurement)</span><span className="msg">: PR items not linking to production workunit</span></div>
                  <div className="cc-code-line"><span className="prefix c-orange">ui</span><span className="scope">(procurement)</span><span className="msg">: highlight shortage risk in red on supply table</span></div>
                  <div className="cc-code-line"><span className="prefix c-teal">perf</span><span className="scope">(procurement)</span><span className="msg">: cache material availability index per project</span></div>
                </div>
              </div>

              <div className="cc-example-block">
                <div className="cc-example-header">
                  <span className="cc-example-header-label" style={{color:'var(--red)'}}>Breaking / Schema</span>
                  <span className="cc-bump-badge bump-major">major bump</span>
                </div>
                <div className="cc-example-body">
                  <div className="cc-code-line"><span className="prefix c-red">breaking</span><span className="scope">(workunits)</span><span className="msg">!: rename partCode to logDesignation</span></div>
                  <div className="cc-code-line"><span className="prefix c-purple">schema</span><span className="scope">(projects)</span><span className="msg">!: add mandatory contractType enum field</span></div>
                  <div className="cc-code-line"><span className="prefix c-red">breaking</span><span className="scope">(api)</span><span className="msg">!: /tasks endpoint now requires buildingId param</span></div>
                  <div className="cc-code-line"><span className="prefix c-purple">schema</span><span className="scope">(production)</span><span className="msg">: add migration 0024 — processType normalization</span></div>
                </div>
              </div>

              <div className="cc-example-block">
                <div className="cc-example-header">
                  <span className="cc-example-header-label" style={{color:'var(--text-dim)'}}>Chores / System</span>
                  <span className="cc-bump-badge bump-none">no bump</span>
                </div>
                <div className="cc-example-body">
                  <div className="cc-code-line"><span className="prefix c-dim">chore</span><span className="scope">(system)</span><span className="msg">: update to Next.js 15.2</span></div>
                  <div className="cc-code-line"><span className="prefix c-dim">docs</span><span className="scope">(system)</span><span className="msg">: update claude.md with procurement module spec</span></div>
                  <div className="cc-code-line"><span className="prefix c-dim">chore</span><span className="scope">(auth)</span><span className="msg">: rotate JWT secret in env.production</span></div>
                  <div className="cc-code-line"><span className="prefix c-orange">seed</span><span className="scope">(planning)</span><span className="msg">: add default sub-activity templates for steel</span></div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="cc-footer">
              <div className="cc-footer-note">Hexa Steel® OTS™ · Internal Development Reference · v1.0</div>
              <div className="cc-footer-rule">type(scope): short imperative message</div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
