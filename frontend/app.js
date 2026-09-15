// Slowdates demo frontend — a thin client over the API that walks the brief's
// concepts: AI-built profile, value-driven compatibility, no chat, and the
// gendered date-acceptance flow. No framework, no build step.

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
  picks: new Set(),  // proposer's chosen slots (screen 3)
  screen: "pick",    // pick | feed | proposal | confirmed | feedback
};

const app = document.getElementById("app");
const STEPS = [
  ["pick", "1 · Perfil IA"],
  ["feed", "2 · Compatibilidad"],
  ["proposal", "3 · Acuerdo de cita"],
  ["confirmed", "4 · Confirmada"],
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
function userById(id) { return state.users.find(u => u.id === id); }
function userName(id) { const u = userById(id); return u ? u.name : `#${id}`; }
function fmtDate(iso) {
  return new Date(iso).toLocaleString("es-ES",
    { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
function esc(s) { return String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

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
    state.me ? `Activo: ${state.me.name} (${genderLabel(state.me.gender)})` : "Sin usuario activo";
  ({ pick: screenPick, feed: screenFeed, proposal: screenProposal,
     confirmed: screenConfirmed, feedback: screenFeedback }[state.screen])();
}

function genderLabel(g) { return g === "male" ? "él" : g === "female" ? "ella" : "—"; }

// --------------------------------------------------------------------------- //
// Screen 1 — pick a demo profile; show the AI-built deep profile.
// --------------------------------------------------------------------------- //
function screenPick() {
  app.innerHTML = `
    <h2>¿Quién eres?</h2>
    <p class="sub">Elige un perfil sembrado. En la app real, la IA construye este
      perfil profundo a partir de tus respuestas de onboarding: personalidad,
      valores, ambiciones, estilo de vida y tipo de relación.</p>
    <div class="card">
      <div class="row">
        <select id="user-select">
          ${state.users.map(u => `<option value="${u.id}">${esc(u.name)} · ${genderLabel(u.gender)} · ${esc(u.city || "")}</option>`).join("")}
        </select>
        <button class="primary" id="go">Entrar</button>
      </div>
    </div>
    ${state.users.map(profileCard).join("")}
  `;
  document.getElementById("go").onclick = async () => {
    const id = Number(document.getElementById("user-select").value);
    state.me = userById(id);
    await loadMatches();
    state.screen = "feed";
    render();
  };
}

function profileCard(u) {
  const p = u.preferences || {};
  return `<div class="card">
    <div class="row spread">
      <span class="name">${esc(u.name)} <span class="muted">· ${genderLabel(u.gender)}</span></span>
      <span class="muted">${esc((p.budget || "").toUpperCase())} · ${esc(u.city || "")}</span>
    </div>
    <div class="ai-summary">🤖 ${esc(p.ai_summary || "Perfil en construcción")}</div>
    <div class="trait-row">${(p.personality_traits || []).map(t => `<span class="trait">${esc(t)}</span>`).join("")}</div>
    <div class="mini-grid">
      ${miniList("Valores", p.values)}
      ${miniList("Ambiciones", p.ambitions)}
      ${miniList("Intereses", p.interests)}
      ${miniList("Favoritos ★", p.favorite_venues)}
    </div>
  </div>`;
}

function miniList(label, items) {
  if (!items || !items.length) return "";
  return `<div class="mini"><b>${label}</b><div class="chips">${items.map(i => `<span class="chip">${esc(i)}</span>`).join("")}</div></div>`;
}

async function loadMatches() {
  await api.post(`/users/${state.me.id}/generate-matches`);
  state.matches = await api.get(`/matches?user_id=${state.me.id}`);
}

// --------------------------------------------------------------------------- //
// Screen 2 — value-driven compatibility feed.
// --------------------------------------------------------------------------- //
function screenFeed() {
  const pending = state.matches.filter(m => m.status !== "expired");
  app.innerHTML = `
    <h2>Tu compatibilidad</h2>
    <p class="sub">La IA no puntúa por hobbies: pesa valores, objetivos de vida,
      personalidad y estilo de comunicación. Si ambos aceptáis, planifica la cita.</p>
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
  const other = userById(oid) || {};
  const op = other.preferences || {};
  const mineIsA = m.user_a_id === state.me.id;
  const iAccepted = mineIsA ? m.accepted_by_a : m.accepted_by_b;
  const bd = m.breakdown || {};
  return `<div class="card">
    <div class="row spread">
      <div class="row">
        <div class="score-ring" style="--p:${pct}"><i>${pct}%</i></div>
        <div>
          <div class="big">${esc(userName(oid))} <span class="muted">· ${genderLabel(other.gender)}</span></div>
          <div class="muted">${esc(m.suggested_date_category || "cita sugerida")}</div>
        </div>
      </div>
      <div class="row">
        <button class="ghost" id="pass-${m.id}" ${m.status !== "pending" ? "disabled" : ""}>Pasar</button>
        <button class="primary" id="accept-${m.id}" ${iAccepted ? "disabled" : ""}>
          ${iAccepted ? "Aceptado ✓" : "Quiero conocerle"}</button>
      </div>
    </div>
    <div class="ai-summary">🤖 ${esc(op.ai_summary || "")}</div>
    ${bars(bd)}
    ${m.shared_values && m.shared_values.length ? `<div class="mini"><b>Valores en común</b>
      <div class="chips">${m.shared_values.map(v => `<span class="chip shared">${esc(v)}</span>`).join("")}</div></div>` : ""}
    <div class="why">${esc(m.reasoning || "")}</div>
  </div>`;
}

const DIM_LABELS = {
  values: "Valores", ambitions: "Objetivos", personality: "Personalidad",
  communication: "Comunicación", lifestyle: "Estilo de vida", interests: "Intereses",
};
function bars(bd) {
  const keys = Object.keys(DIM_LABELS).filter(k => k in bd);
  if (!keys.length) return "";
  return `<div class="bars">${keys.map(k => {
    const v = Math.round((bd[k] || 0) * 100);
    return `<div class="bar-row"><span>${DIM_LABELS[k]}</span>
      <div class="bar"><i style="width:${v}%"></i></div><span class="pct">${v}%</span></div>`;
  }).join("")}</div>`;
}

async function decideMatch(m, accept) {
  const res = await api.post(`/matches/${m.id}/decision`, { user_id: state.me.id, accept });
  await loadMatches();
  if (accept && (res.proposal || res.status === "accepted")) {
    state.activeMatch = state.matches.find(x => x.id === m.id) || m;
    state.proposal = res.proposal || null;
    state.picks = new Set();
    state.screen = "proposal";
  }
  render();
}

// --------------------------------------------------------------------------- //
// Screen 3 — the gendered date-acceptance flow (brief §5).
// --------------------------------------------------------------------------- //
function screenProposal() {
  const p = state.proposal;
  if (!p) {
    app.innerHTML = `
      <h2>Interés mutuo</h2>
      <div class="notice warn">La IA aún no encontró un plan (sin horarios en común
        o sin lugares en la zona). Vuelve a intentarlo más tarde.</div>
      <button class="ghost" id="back">← Volver</button>`;
    document.getElementById("back").onclick = () => { state.screen = "feed"; render(); };
    return;
  }
  const iAmProposer = state.me.id === p.proposer_id;
  const proposerName = userName(p.proposer_id);
  const responderName = userName(p.responder_id);
  const flowNote = p.flow_type === "hetero"
    ? `La propuesta llega primero a <b>${esc(proposerName)}</b> (él); elige 3 horarios y luego <b>${esc(responderName)}</b> (ella) decide.`
    : `La propuesta llega primero a <b>${esc(proposerName)}</b>; elige 3 horarios y luego responde <b>${esc(responderName)}</b>.`;

  const header = `
    <h2>Acuerdo de cita</h2>
    <p class="sub">${flowNote} Sin negociar por chat.</p>
    ${venueBlock(p)}
    <div class="flow-state">Estado: <b>${statusLabel(p.status)}</b></div>
  `;

  let body = "";
  if (p.status === "awaiting_proposer") {
    body = iAmProposer ? proposerPicker(p) : waitingFor(proposerName, "elija 3 horarios", p.proposer_id, "propose");
  } else if (p.status === "awaiting_responder") {
    body = !iAmProposer ? responderPicker(p) : waitingFor(responderName, "elija o contraproponga", p.responder_id, "respond");
  } else if (p.status === "counter_proposed") {
    body = iAmProposer ? counterView(p) : waitingFor(proposerName, "acepte tu contrapropuesta", p.proposer_id, "counter");
  } else if (p.status === "confirmed") {
    state.screen = "confirmed"; render(); return;
  } else if (p.status === "rejected") {
    body = `<div class="notice warn">Propuesta descartada. ${state._replan || "Buscando otra opción…"}</div>
            <button class="ghost" id="back">← Volver a matches</button>`;
  }

  app.innerHTML = header + body;
  wireProposal(p, iAmProposer);
}

function venueBlock(p) {
  return `<div class="card plan">
    <div class="plan-venue">${esc(p.venue_name)}</div>
    <div class="muted">${esc(p.venue_address || "")}</div>
    <div class="meet">📍 Punto de encuentro: ${esc(p.meeting_point || "")}</div>
    <div class="why">${esc(p.why || "")}</div>
    ${p.alternative ? `<div class="notice">Alternativa de la IA: <b>${esc(p.alternative.venue)}</b> — ${esc(p.alternative.reasoning || "")}</div>` : ""}
  </div>`;
}

function statusLabel(s) {
  return {
    awaiting_proposer: "esperando que él elija horarios",
    awaiting_responder: "esperando que ella responda",
    counter_proposed: "contrapropuesta en revisión",
    confirmed: "confirmada",
    rejected: "descartada",
  }[s] || s;
}

function proposerPicker(p) {
  const slots = p.candidate_slots || [];
  return `<div class="card">
    <h3>Elige hasta 3 horarios</h3>
    <p class="sub">La IA propuso el lugar. Tú marcas los horarios que te van bien.</p>
    <div class="slot-list">
      ${slots.map((s, i) => `<label class="slot"><input type="checkbox" data-slot="${s}" ${i < 3 ? "checked" : ""}/> ${esc(fmtDate(s))}</label>`).join("")}
    </div>
    <div class="row" style="margin-top:12px">
      <button class="primary" id="send-slots">Enviar mis 3 opciones</button>
      <button class="ghost" id="decline-slots">No me interesa</button>
    </div>
  </div>`;
}

function responderPicker(p) {
  const opts = p.time_options || [];
  const cand = p.candidate_slots || [];
  return `<div class="card">
    <h3>Elige una opción o contrapropón</h3>
    <p class="sub">${esc(userName(p.proposer_id))} propuso estos horarios:</p>
    <div class="slot-list">
      ${opts.map(s => `<label class="slot"><input type="radio" name="pick" data-opt="${s}"/> ${esc(fmtDate(s))}</label>`).join("")}
    </div>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="select-opt">Elegir esta opción</button>
      <button class="ghost" id="reject-opt">Ninguna me va</button>
    </div>
    <hr/>
    <h3>… o contrapropón otro horario</h3>
    <div class="row">
      <select id="counter-slot">
        ${cand.map(s => `<option value="${s}">${esc(fmtDate(s))}</option>`).join("")}
      </select>
      <button class="ghost" id="send-counter">Contraproponer</button>
    </div>
  </div>`;
}

function counterView(p) {
  return `<div class="card">
    <h3>Contrapropuesta recibida</h3>
    <div class="plan-when">🗓 ${esc(fmtDate(p.counter_datetime))}</div>
    <p class="sub">${esc(userName(p.responder_id))} propone este horario en su lugar.</p>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="accept-counter">Acepto este horario</button>
      <button class="ghost" id="decline-counter">Prefiero mis opciones</button>
    </div>
  </div>`;
}

function waitingFor(name, what, actAsId, kind) {
  return `<div class="card">
    <div class="notice">Esperando a que <b>${esc(name)}</b> ${what}.</div>
    <button class="link" id="sim" data-act="${actAsId}" data-kind="${kind}">actuar como ${esc(name)} para la demo →</button>
  </div>`;
}

function wireProposal(p, iAmProposer) {
  const back = document.getElementById("back");
  if (back) back.onclick = () => { state.screen = "feed"; render(); };

  const sendSlots = document.getElementById("send-slots");
  if (sendSlots) sendSlots.onclick = () => sendProposerSlots(p, state.me.id, true);
  const declineSlots = document.getElementById("decline-slots");
  if (declineSlots) declineSlots.onclick = () => sendProposerSlots(p, state.me.id, false);

  const selectOpt = document.getElementById("select-opt");
  if (selectOpt) selectOpt.onclick = () => {
    const el = document.querySelector('input[name="pick"]:checked');
    if (!el) return alert("Elige una opción");
    respond(p, state.me.id, "select", el.dataset.opt);
  };
  const rejectOpt = document.getElementById("reject-opt");
  if (rejectOpt) rejectOpt.onclick = () => respond(p, state.me.id, "reject", null);
  const sendCounter = document.getElementById("send-counter");
  if (sendCounter) sendCounter.onclick = () =>
    respond(p, state.me.id, "counter", document.getElementById("counter-slot").value);

  const acceptCounter = document.getElementById("accept-counter");
  if (acceptCounter) acceptCounter.onclick = () => decideCounter(p, state.me.id, true);
  const declineCounter = document.getElementById("decline-counter");
  if (declineCounter) declineCounter.onclick = () => decideCounter(p, state.me.id, false);

  // Demo helper: act as the other person for whichever step is pending.
  const sim = document.getElementById("sim");
  if (sim) sim.onclick = () => simulateOther(p, Number(sim.dataset.act), sim.dataset.kind);
}

async function sendProposerSlots(p, userId, accept) {
  const slots = accept
    ? [...document.querySelectorAll('input[data-slot]:checked')].map(el => el.dataset.slot).slice(0, 3)
    : [];
  const res = await api.post(`/proposals/${p.id}/slots`, { user_id: userId, accept, slots });
  afterProposalAction(res);
}

async function respond(p, userId, action, dt) {
  const res = await api.post(`/proposals/${p.id}/respond`,
    { user_id: userId, action, chosen_datetime: dt });
  afterProposalAction(res);
}

async function decideCounter(p, userId, accept) {
  const res = await api.post(`/proposals/${p.id}/counter`, { user_id: userId, accept });
  afterProposalAction(res);
}

// Walk the pending step automatically, acting as the other person.
async function simulateOther(p, actId, kind) {
  if (kind === "propose") {
    await sendProposerSlots(p, actId, true);
  } else if (kind === "respond") {
    const fresh = await api.get(`/proposals/${p.id}`);
    const opt = (fresh.time_options || [])[0];
    await respond(fresh, actId, "select", opt);
  } else if (kind === "counter") {
    await decideCounter(p, actId, true);
  }
}

function afterProposalAction(res) {
  if (res.new_proposal) {
    state._replan = "La IA generó otra propuesta.";
    state.proposal = res.new_proposal;
  } else if (res.proposal) {
    state.proposal = res.proposal;
  }
  if (res.confirmed) state.screen = "confirmed";
  render();
}

// --------------------------------------------------------------------------- //
// Screen 4 — confirmation + safe check-in.
// --------------------------------------------------------------------------- //
function screenConfirmed() {
  const p = state.proposal;
  app.innerHTML = `
    <h2>¡Cita confirmada!</h2>
    <div class="notice ok">Acuerdo cerrado sin una sola línea de chat.</div>
    <div class="card plan">
      <div class="plan-venue">${esc(p.venue_name)}</div>
      <div class="muted">${esc(p.venue_address || "")}</div>
      <div class="plan-when">🗓 ${esc(fmtDate(p.selected_datetime))}</div>
      <div class="meet">📍 ${esc(p.meeting_point || "")}</div>
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

// --------------------------------------------------------------------------- //
// Screen 5 — post-date feedback.
// --------------------------------------------------------------------------- //
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
  state.activeMatch = null; state.picks = new Set(); state.screen = "pick"; render();
};

boot();
