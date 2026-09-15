// Slowdates demo frontend — a thin client over the API that walks the brief's
// five screens. No framework, no build step.

const api = {
  async get(path) { return json(await fetch(path)); },
  async post(path, body) {
    return json(await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }));
  },
};
async function json(res) {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
  return res.status === 204 ? null : res.json();
}

const state = {
  me: null,          // active user object
  users: [],
  matches: [],
  activeMatch: null,
  proposal: null,
  screen: "pick",    // pick | feed | proposal | confirmed | feedback
};

const app = document.getElementById("app");
const STEPS = [
  ["pick", "1 · Perfil"],
  ["feed", "2 · Matches"],
  ["proposal", "3 · Propuesta"],
  ["confirmed", "4 · Confirmación"],
  ["feedback", "5 · Feedback"],
];

function renderSteps() {
  const order = STEPS.map(s => s[0]);
  const idx = order.indexOf(state.screen);
  document.getElementById("steps").innerHTML = STEPS.map((s, i) => {
    const cls = i === idx ? "active" : i < idx ? "done" : "";
    return `<span class="step ${cls}">${s[1]}</span>`;
  }).join("");
}

function otherId(m) { return m.user_a_id === state.me.id ? m.user_b_id : m.user_a_id; }
function userName(id) { const u = state.users.find(u => u.id === id); return u ? u.name : `#${id}`; }
function fmtDate(iso) {
  return new Date(iso).toLocaleString("es-ES",
    { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

async function boot() {
  try {
    const health = await api.get("/health");
    document.getElementById("engine-badge").textContent = `motor: ${health.compatibility_engine}`;
  } catch { /* ignore */ }
  state.users = await api.get("/users");
  render();
}

function render() {
  renderSteps();
  document.getElementById("whoami").textContent =
    state.me ? `Activo: ${state.me.name}` : "Sin usuario activo";
  ({ pick: screenPick, feed: screenFeed, proposal: screenProposal,
     confirmed: screenConfirmed, feedback: screenFeedback }[state.screen])();
}

// Screen 1 — pick a demo profile (stands in for onboarding).
function screenPick() {
  app.innerHTML = `
    <h2>¿Quién eres?</h2>
    <p class="sub">Elige un perfil sembrado para recorrer el flujo. En la app real
      esto es el cuestionario de gustos y disponibilidad.</p>
    <div class="card">
      <div class="row">
        <select id="user-select">
          ${state.users.map(u => `<option value="${u.id}">${u.name} · ${u.city || ""}</option>`).join("")}
        </select>
        <button class="primary" id="go">Entrar</button>
      </div>
    </div>
    ${state.users.map(u => profileCard(u)).join("")}
  `;
  document.getElementById("go").onclick = async () => {
    const id = Number(document.getElementById("user-select").value);
    state.me = state.users.find(u => u.id === id);
    await loadMatches();
    state.screen = "feed";
    render();
  };
}

function profileCard(u) {
  const p = u.preferences || {};
  return `<div class="card">
    <div class="row spread">
      <span class="name">${u.name}</span>
      <span class="muted">${(p.budget || "").toUpperCase()} · ${u.city || ""}</span>
    </div>
    <div class="chips">${(p.interests || []).map(i => `<span class="chip">${i}</span>`).join("")}</div>
  </div>`;
}

async function loadMatches() {
  await api.post(`/users/${state.me.id}/generate-matches`);
  state.matches = await api.get(`/matches?user_id=${state.me.id}`);
}

// Screen 2 — match feed with visible compatibility score.
function screenFeed() {
  const pending = state.matches.filter(m => m.status !== "expired");
  app.innerHTML = `
    <h2>Tus matches</h2>
    <p class="sub">El Motor de Compatibilidad puntuó a cada persona de tu radio.
      Acepta a alguien; si la otra parte también acepta, la IA planifica la cita.</p>
    ${pending.length ? pending.map(matchCard).join("") :
      `<div class="notice warn">Sin matches por encima del umbral. Prueba con otro perfil.</div>`}
  `;
  pending.forEach(m => {
    const el = document.getElementById(`accept-${m.id}`);
    if (el) el.onclick = () => decideMatch(m, true);
    const pass = document.getElementById(`pass-${m.id}`);
    if (pass) pass.onclick = () => decideMatch(m, false);
  });
}

function matchCard(m) {
  const pct = Math.round(m.compatibility_score * 100);
  const oid = otherId(m);
  const mineIsA = m.user_a_id === state.me.id;
  const iAccepted = mineIsA ? m.accepted_by_a : m.accepted_by_b;
  const shared = new Set((m.shared_interests || []).map(s => s.toLowerCase()));
  const other = state.users.find(u => u.id === oid);
  const interests = (other?.preferences?.interests) || m.shared_interests || [];
  return `<div class="card">
    <div class="row spread">
      <div class="row">
        <div class="score-ring" style="--p:${pct}"><i>${pct}%</i></div>
        <div>
          <div class="big">${userName(oid)}</div>
          <div class="muted">${m.suggested_date_category || "cita sugerida"}</div>
        </div>
      </div>
      <div class="row">
        <button class="ghost" id="pass-${m.id}" ${m.status !== "pending" ? "disabled" : ""}>Pasar</button>
        <button class="primary" id="accept-${m.id}" ${iAccepted ? "disabled" : ""}>
          ${iAccepted ? "Aceptado ✓" : "Aceptar"}</button>
      </div>
    </div>
    <div class="chips">
      ${interests.map(i => `<span class="chip ${shared.has(i.toLowerCase()) ? "shared" : ""}">${i}</span>`).join("")}
    </div>
    <div class="why">${m.reasoning || ""}</div>
  </div>`;
}

async function decideMatch(m, accept) {
  const res = await api.post(`/matches/${m.id}/decision`, { user_id: state.me.id, accept });
  await loadMatches();
  if (accept && res.proposal) {
    state.activeMatch = m;
    state.proposal = res.proposal;
    state.screen = "proposal";
  } else if (accept && res.status === "accepted") {
    // Match accepted but not plannable (e.g. no shared schedule).
    state.activeMatch = m;
    state.proposal = null;
    state.screen = "proposal";
  }
  render();
}

// Screen 3 — the AI's date proposal.
function screenProposal() {
  const p = state.proposal;
  if (!p) {
    app.innerHTML = `
      <h2>Match aceptado</h2>
      <div class="notice warn">La IA aún no encontró un plan (sin horarios en común
        o sin lugares en la zona). Vuelve a intentarlo más tarde.</div>
      <button class="ghost" id="back">← Volver a matches</button>`;
    document.getElementById("back").onclick = () => { state.screen = "feed"; render(); };
    return;
  }
  const mineIsA = state.activeMatch.user_a_id === state.me.id;
  const iAccepted = mineIsA ? p.accepted_by_a : p.accepted_by_b;
  app.innerHTML = `
    <h2>Propuesta de cita</h2>
    <p class="sub">El Motor de Planificación eligió lugar y hora por ustedes.
      Sin negociar por chat: aceptas o pides alternativa.</p>
    <div class="card">
      <div class="plan-venue">${p.venue_name}</div>
      <div class="muted">${p.venue_address || ""}</div>
      <div class="plan-when">🗓 ${fmtDate(p.datetime_utc)}</div>
      <div class="why">${p.why}</div>
      ${p.alternative ? `<div class="notice">Alternativa: <b>${p.alternative.venue}</b>
        — ${p.alternative.reasoning || ""}</div>` : ""}
      <div class="row" style="margin-top:10px">
        <button class="primary" id="accept" ${iAccepted ? "disabled" : ""}>
          ${iAccepted ? "Aceptado ✓ (esperando a la otra parte)" : "Aceptar plan"}</button>
        <button class="ghost" id="alt">Pedir alternativa</button>
      </div>
    </div>
    <button class="link" id="sim">simular que la otra persona acepta →</button>
  `;
  document.getElementById("accept").onclick = () => decideProposal("accept", state.me.id);
  document.getElementById("alt").onclick = () => decideProposal("request_alternative", state.me.id);
  document.getElementById("sim").onclick = () =>
    decideProposal("accept", otherId(state.activeMatch));
}

async function decideProposal(action, userId) {
  const res = await api.post(`/proposals/${state.proposal.id}/decision`,
    { user_id: userId, action });
  if (res.new_proposal) {
    state.proposal = res.new_proposal;
    render();
    return;
  }
  // Refresh proposal state.
  state.proposal = await api.get(`/proposals/${state.proposal.id}`);
  if (res.checkin_enabled) { state.screen = "confirmed"; }
  render();
}

// Screen 4 — confirmation + safe check-in.
function screenConfirmed() {
  const p = state.proposal;
  app.innerHTML = `
    <h2>¡Cita confirmada!</h2>
    <div class="notice ok">Ambos aceptaron. Check-in seguro activado.</div>
    <div class="card">
      <div class="plan-venue">${p.venue_name}</div>
      <div class="plan-when">🗓 ${fmtDate(p.datetime_utc)}</div>
      <div class="row" style="margin-top:10px">
        <button id="checkin">📍 Hacer check-in seguro</button>
        <button class="primary" id="tofeedback">Ya fui a la cita →</button>
      </div>
    </div>
  `;
  document.getElementById("checkin").onclick = (e) =>
    e.target.textContent = "✓ Check-in registrado";
  document.getElementById("tofeedback").onclick = () => { state.screen = "feedback"; render(); };
}

// Screen 5 — post-date feedback.
function screenFeedback() {
  app.innerHTML = `
    <h2>¿Qué tal la cita?</h2>
    <p class="sub">Una señal simple que alimenta el modelo para mejorar futuras sugerencias.</p>
    <div class="card">
      <div class="row"><span>¿Asististe?</span>
        <button data-att="1" class="primary at">Sí</button>
        <button data-att="0" class="at ghost">No</button></div>
      <div class="row" style="margin-top:12px"><span>¿Quieres una segunda cita?</span>
        <button data-sec="1" class="primary sec">Sí</button>
        <button data-sec="0" class="sec ghost">No</button></div>
      <div class="row" style="margin-top:16px"><button class="primary" id="send">Enviar feedback</button></div>
    </div>
    <div id="fb-out"></div>
  `;
  let attended = true, second = true;
  const mark = (sel, attr, set) => document.querySelectorAll(sel).forEach(b =>
    b.onclick = () => { set(b.dataset[attr] === "1");
      document.querySelectorAll(sel).forEach(x => x.className = x.dataset[attr] === b.dataset[attr] ? "primary" : "ghost");
    });
  mark(".at", "att", v => attended = v);
  mark(".sec", "sec", v => second = v);
  document.getElementById("send").onclick = async () => {
    await api.post(`/proposals/${state.proposal.id}/feedback`,
      { user_id: state.me.id, attended, wants_second_date: second });
    const m = await api.get("/metrics");
    document.getElementById("fb-out").innerHTML = `
      <div class="notice ok">¡Gracias! Métricas del MVP actualizadas.</div>
      <div class="kpi-grid">
        <div class="kpi"><b>${m.confirmed_dates}</b>citas confirmadas</div>
        <div class="kpi"><b>${Math.round(m.match_to_confirmed_rate*100)}%</b>match → cita</div>
        <div class="kpi"><b>${Math.round(m.second_date_rate*100)}%</b>quieren 2ª cita</div>
      </div>`;
  };
}

document.getElementById("reset-btn").onclick = () => {
  state.me = null; state.matches = []; state.proposal = null;
  state.activeMatch = null; state.screen = "pick"; render();
};

boot();
