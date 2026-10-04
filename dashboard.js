// ================= Ayarlar: moda göre metinler =================
const MODLAR = {
  student: { rol: "Üniversite Öğrencisi", ac: "Akademik", acSub: "Dersler  Sınavlar", caSub: "Stajlar  İşler", acBaslik: "Akademik Genel Bakış",
    tur: ["Ders", "Etkinlik", "Ödev"], isim: "Ders adı", deger: "Not (0-100)", jobs: "Önerilen Stajlar", sub: "Akademik ve kariyer planlaman tek yerde." },
  work: { rol: "Çalışan", ac: "Projeler", acSub: "Projeler  Teslimler", caSub: "Hedefler  Fırsatlar", acBaslik: "Projelerim",
    tur: ["Toplantı", "Etkinlik", "Görev"], isim: "Proje adı", deger: "İlerleme (%)", jobs: "Fırsatlar & Başvurular", sub: "İşlerin, toplantıların ve hedeflerin tek yerde." },
};
const sinif = { Ders: "course", Toplantı: "course", Etkinlik: "event", Ödev: "hw", Görev: "hw" };

// ================= Yardımcılar =================
const aylar = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const renkler = ["#2a9db0","#f0b840","#2eb5d6","#8b52d6","#2fbf7f","#0f9a94","#f08c2e","#e8585a"];
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const gunEtiket = k => { const [y, m, d] = k.split("-"); return `${+d} ${aylar[+m - 1]} ${y}`; };

const now = new Date();
const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate());
const yarin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
const yarinKey = key(yarin.getFullYear(), yarin.getMonth(), yarin.getDate());

// ================= Veri =================
// Yeni kullanıcı boş başlar: hazır görev, ders, etkinlik vb. yok
function yeniVeri(mod, name) {
  return {
    mode: mod, name: name || (mod === "work" ? "Kullanıcı" : "Öğrenci"),
    events: {}, courses: [], deadlines: [], jobs: [], skills: [], tasks: [],
    links: [{ id: uid(), n: "Google Takvim", u: "https://calendar.google.com" }, { id: uid(), n: "Görevlerim", u: "#tasks" }],
  };
}
// ---- Hesaplar: her kullanıcının verisi ayrı tutulur ----
const DB_KEY = "planla-v3";
const DIZI = ["courses", "deadlines", "jobs", "skills", "tasks", "links"];
const gecerli = v => v && MODLAR[v.mode] && typeof v.name === "string" && v.events && typeof v.events === "object" && DIZI.every(k => Array.isArray(v[k]));
function dbOku() {
  try { const v = JSON.parse(localStorage.getItem(DB_KEY)); if (v && v.users && typeof v.users === "object") return v; } catch (e) {}
  return { users: {}, aktif: null };
}
let db = dbOku();          // { users: { kullaniciAdi: { ad, tur, tuz, hash, data } }, aktif }
let S = null;              // giriş yapan kişinin verisi (db.users[aktif].data ile aynı nesne)
function dbYaz() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
let kaydetZamani;
function kaydet() {
  if (!S) return;
  clearTimeout(kaydetZamani);
  kaydetZamani = setTimeout(dbYaz, 150);
}
addEventListener("pagehide", () => { if (S) dbYaz(); });

// Şifre düz yazı olarak saklanmaz; tuzla birlikte özet (hash) saklanır
async function hashle(sifre, tuz) {
  const metin = tuz + ":" + sifre;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; for (const c of metin) h = ((h << 5) + h + c.charCodeAt(0)) | 0; // yedek: güvenli bağlam yoksa
  return "x" + h;
}

let sel = todayKey;
let view = { y: now.getFullYear(), m: now.getMonth() };
let q = "";
const M = () => MODLAR[S.mode] || MODLAR.student;
const eslesir = s => s.toLowerCase().includes(q);

function bul(list, id) {
  if (list === "events") { for (const d in S.events) { const e = S.events[d].find(e => e.id === id); if (e) return e; } return null; }
  return S[list].find(e => e.id === id);
}
function sil(list, id) {
  if (list === "events") for (const d in S.events) S.events[d] = S.events[d].filter(e => e.id !== id);
  else S[list] = S[list].filter(e => e.id !== id);
}
const delBtn = (list, id) => `<button class="x" data-act="del" data-list="${list}" data-id="${id}" aria-label="Sil">×</button>`;
const ad = (list, id, field, text) => `<span data-rename data-list="${list}" data-id="${id}" data-field="${field}" title="Çift tıkla: düzenle">${esc(text)}</span>`;
const gunEvents = k => (S.events[k] || []).slice().sort((a, b) => a.time.localeCompare(b.time));

// ================= Görünüm / mod =================
function goView(v) {
  document.querySelectorAll(".view").forEach(el => el.classList.toggle("on", el.id === "v-" + v));
  document.querySelectorAll("[data-view]").forEach(a => a.classList.toggle("active", a.dataset.view === v && a.tagName === "A"));
  window.scrollTo({ top: 0 });
}
function modUygula() {
  const m = M();
  document.body.dataset.mode = S.mode || "student";
  $("userRole").textContent = m.rol; $("navAc").textContent = m.ac; $("navAcSub").textContent = m.acSub;
  $("navCaSub").textContent = m.caSub; $("acTitle").textContent = m.acBaslik; $("jobsTitle").textContent = m.jobs;
  $("helloSub").textContent = m.sub;
  document.querySelector("[data-form=course] [name=n]").placeholder = m.isim;
  document.querySelector("[data-form=course] [name=g]").placeholder = m.deger;
  document.querySelectorAll("select[name=type]").forEach(s => s.innerHTML = m.tur.map(t => `<option>${t}</option>`).join(""));
}

// ================= Çizim =================
function gunListesi(el, k) {
  const l = gunEvents(k).filter(e => eslesir(e.t));
  el.innerHTML = l.length ? l.map(e =>
    `<li><span>${esc(e.time)}</span><div class="ev ${sinif[e.type] || "event"}">${ad("events", e.id, "t", e.t)}${delBtn("events", e.id)}<small>${esc(e.type)}</small></div></li>`).join("")
    : `<li class="empty">Kayıt yok. Aşağıdan ekleyebilirsin.</li>`;
}
function ciz() {
  $("hello").textContent = `Hoş Geldin, ${S.name.split(" ")[0]}! 👋`;
  $("uname").textContent = S.name;
  $("avatar").textContent = S.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  // Küçük takvim (kenar çubuğu)
  $("calTitle").textContent = `${aylar[view.m]} ${view.y}`;
  const cal = $("calendar"); cal.innerHTML = "";
  ["P","S","Ç","P","C","C","P"].forEach(g => cal.insertAdjacentHTML("beforeend", `<span class="dow">${g}</span>`));
  const bosluk = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const gunler = new Date(view.y, view.m + 1, 0).getDate();
  const onceki = new Date(view.y, view.m, 0).getDate();
  for (let i = bosluk - 1; i >= 0; i--) cal.insertAdjacentHTML("beforeend", `<span class="dim">${onceki - i}</span>`);
  for (let g = 1; g <= gunler; g++) {
    const k = key(view.y, view.m, g);
    const cls = ["d", k === todayKey && "today", k === sel && "sel", (S.events[k] || []).length && "has"].filter(Boolean).join(" ");
    cal.insertAdjacentHTML("beforeend", `<button class="${cls}" data-act="mini" data-date="${k}">${g}</button>`);
  }

  // Büyük takvim
  $("bigTitle").textContent = `${aylar[view.m]} ${view.y}`;
  let h = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map(g => `<div class="dow">${g}</div>`).join("");
  for (let i = bosluk - 1; i >= 0; i--) h += `<div class="cell dim"><span class="n">${onceki - i}</span></div>`;
  for (let g = 1; g <= gunler; g++) {
    const k = key(view.y, view.m, g), ev = gunEvents(k);
    h += `<button class="cell ${k === todayKey ? "today" : ""} ${k === sel ? "sel" : ""} ${ev.length ? "has" : ""}" data-act="big" data-date="${k}"><span class="n">${g}</span>` +
      ev.slice(0, 3).map(e => `<span class="ce ${sinif[e.type] || "event"}">${esc(e.time)} ${esc(e.t)}</span>`).join("") +
      (ev.length > 3 ? `<small>+${ev.length - 3} daha</small>` : "") + `</button>`;
  }
  for (let i = (bosluk + gunler) % 7; i && i < 7; i++) h += `<div class="cell dim"></div>`;
  $("bigGrid").innerHTML = h;

  // Günlük listeler
  $("dayTitle").textContent = gunEtiket(sel);
  gunListesi($("dayList"), sel);
  gunListesi($("timeline"), todayKey);

  // Dersler / projeler
  $("bars").innerHTML = S.courses.length ? S.courses.map((c, i) =>
    `<span title="${esc(c.n)}: ${c.g}" style="background:${renkler[i % renkler.length]};height:${Math.max(c.g, 3)}%"></span>`).join("")
    : `<div class="bars-empty">Ekleyince grafik burada görünür.</div>`;
  const ort = S.courses.length ? S.courses.reduce((t, c) => t + c.g, 0) / S.courses.length : 0;
  $("gpa").textContent = !S.courses.length ? "Henüz kayıt yok" : S.mode === "work" ? `Ortalama ilerleme: %${ort.toFixed(0)}` : `Ortalama: ${ort.toFixed(0)} / 100  (GP: ${(ort / 25).toFixed(2)})`;
  $("courses").innerHTML = S.courses.map(c =>
    `<li>${ad("courses", c.id, "n", c.n)}<input type="number" min="0" max="100" value="${c.g}" data-act="grade" data-id="${c.id}">${delBtn("courses", c.id)}</li>`).join("") || `<li class="empty">Henüz kayıt yok. Aşağıdan ekleyebilirsin.</li>`;
  $("deadlines").innerHTML = [...S.deadlines].sort((a, b) => a.d.localeCompare(b.d)).map(d =>
    `<li>${ad("deadlines", d.id, "t", d.t)}<span>${gunEtiket(d.d)}</span>${delBtn("deadlines", d.id)}</li>`).join("") || `<li class="empty">Teslim yok.</li>`;

  // Kariyer
  const durumlar = ["Beklemede", "Mülakat", "Kabul", "Red"];
  $("jobs").innerHTML = S.jobs.filter(j => eslesir(j.n)).map(j => `<li>${ad("jobs", j.id, "n", j.n)}` +
    (j.st ? `<select data-act="status" data-id="${j.id}">${durumlar.map(s => `<option ${s === j.st ? "selected" : ""}>${s}</option>`).join("")}</select>`
          : `<button class="apply" data-act="apply" data-id="${j.id}">Başvur</button>`) + delBtn("jobs", j.id) + `</li>`).join("") || `<li class="empty">Henüz kayıt yok. Aşağıdan ekleyebilirsin.</li>`;
  $("skills").innerHTML = S.skills.map((s, i) =>
    `<li>${ad("skills", s.id, "n", s.n)}<input type="range" min="0" max="100" value="${s.p}" data-act="skill" data-id="${s.id}" style="accent-color:${renkler[(i + 4) % renkler.length]}"><span class="pct">%${s.p}</span>${delBtn("skills", s.id)}</li>`).join("") || `<li class="empty">Henüz beceri yok.</li>`;

  // Yaklaşanlar
  const yakin = [];
  for (const d in S.events) if (d >= todayKey) S.events[d].forEach(e => yakin.push({ ...e, d }));
  yakin.sort((a, b) => (a.d + a.time).localeCompare(b.d + b.time));
  $("upcoming").innerHTML = yakin.slice(0, 4).map(e => `<li><span>📌 <b>${esc(e.t)}</b></span><span>${gunEtiket(e.d)}, ${esc(e.time)}</span></li>`).join("") || `<li class="empty">Yaklaşan kayıt yok.</li>`;
  $("applied").innerHTML = S.jobs.filter(j => j.st).map(j => `<li><span>🅰️ <b>${esc(j.n)}</b></span><span class="badge">${j.st}</span></li>`).join("");
  $("bell").textContent = yakin.filter(e => e.d === todayKey || e.d === yarinKey).length;

  // Bağlantılar ve görevler
  $("links").innerHTML = S.links.filter(l => eslesir(l.n)).map((l, i) => {
    const ic = l.u.startsWith("#");
    return `<a class="q c${i % 4}" href="${ic ? l.u : esc(l.u)}" ${ic ? "" : 'target="_blank" rel="noopener"'}>${esc(l.n)}${delBtn("links", l.id)}</a>`;
  }).join("");
  $("taskList").innerHTML = S.tasks.filter(t => eslesir(t.t)).map(t =>
    `<li><input type="checkbox" data-act="done" data-id="${t.id}" ${t.done ? "checked" : ""}><span class="${t.done ? "done-t" : ""}" data-rename data-list="tasks" data-id="${t.id}" data-field="t">${esc(t.t)}</span>${delBtn("tasks", t.id)}</li>`).join("") || `<li class="empty">Görev yok.</li>`;
  kaydet();
}

// ================= Olaylar =================
document.addEventListener("click", e => {
  const tab = e.target.closest("[data-tab]");
  if (tab) { sekme = tab.dataset.tab; $("authMsg").textContent = ""; return authCiz(); }
  const acc = e.target.closest("[data-acc]");
  if (acc) { sekme = "login"; $("aUser").value = db.users[acc.dataset.acc].ad; authCiz(); return $("aPass").focus(); }
  if (e.target.closest("[data-logout]")) { e.preventDefault(); return cikis(); }
  if (e.target.closest("[data-delacc]")) {
    if (confirm("Hesabın ve tüm verilerin kalıcı olarak silinecek. Devam edilsin mi?")) { delete db.users[db.aktif]; return cikis(); }
    return;
  }
  const nav = e.target.closest("[data-view]");
  if (nav) { e.preventDefault(); if (nav.hasAttribute("data-today")) { sel = todayKey; view = { y: now.getFullYear(), m: now.getMonth() }; } goView(nav.dataset.view); return ciz(); }
  const dlg = e.target.closest("[data-dlg]");
  if (dlg) {
    e.preventDefault();
    if (dlg.dataset.dlg === "settingsDlg") {
      $("setName").value = S.name;
      $("setAcc").textContent = `${db.users[db.aktif].ad} · ${S.mode === "work" ? "💼 İş" : "🎓 Öğrenci"}`;
    }
    return $(dlg.dataset.dlg).showModal();
  }
  const link = e.target.closest("a.q");
  if (link && link.getAttribute("href") === "#tasks" && !e.target.closest("[data-act]")) { e.preventDefault(); return $("tasks").showModal(); }
  const b = e.target.closest("[data-act]");
  // Tik kutusu, not kutusu, kaydırıcı ve durum listesi "change/input" olaylarıyla çalışır; tıklamayı engelleme
  if (!b || ["done", "grade", "status", "skill"].includes(b.dataset.act)) return;
  e.preventDefault();
  const { act, id, list } = b.dataset;
  if (act === "mini") { sel = b.dataset.date; const [y, m] = sel.split("-"); view = { y: +y, m: +m - 1 }; goView("cal"); }
  if (act === "big") sel = b.dataset.date;
  if (act === "del") sil(list, id);
  if (act === "apply") bul("jobs", id).st = "Beklemede";
  ciz();
});
const ayGit = d => { view.m += d; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } ciz(); };
$("prev").onclick = $("bPrev").onclick = () => ayGit(-1);
$("next").onclick = $("bNext").onclick = () => ayGit(1);
$("bToday").onclick = () => { sel = todayKey; view = { y: now.getFullYear(), m: now.getMonth() }; ciz(); };
$("closeTasks").onclick = () => $("tasks").close();
let aramaZamani;
$("q").oninput = e => { q = e.target.value.toLowerCase(); clearTimeout(aramaZamani); aramaZamani = setTimeout(ciz, 150); };
$("closeSettings").onclick = () => $("settingsDlg").close();
$("setName").onchange = e => { if (e.target.value.trim()) { S.name = e.target.value.trim(); ciz(); } };
$("reset").onclick = () => { if (confirm("Bu hesabın tüm verileri silinecek. Devam edilsin mi?")) { db.users[db.aktif].data = S = yeniVeri(S.mode, S.name); $("settingsDlg").close(); ciz(); } };

document.addEventListener("change", e => {
  const { act, id } = e.target.dataset;
  if (act === "grade") bul("courses", id).g = Math.min(100, Math.max(0, +e.target.value || 0));
  else if (act === "status") bul("jobs", id).st = e.target.value;
  else if (act === "done") bul("tasks", id).done = e.target.checked;
  else return;
  ciz();
});
document.addEventListener("input", e => {
  if (e.target.dataset.act !== "skill") return;
  bul("skills", e.target.dataset.id).p = +e.target.value;
  e.target.parentElement.querySelector(".pct").textContent = `%${e.target.value}`;
  kaydet();
});
function adDegistir(e) {
  const el = e.target.closest("[data-rename]");
  if (!el) return;
  const item = bul(el.dataset.list, el.dataset.id);
  const yeni = prompt("Yeni metin:", item[el.dataset.field]);
  if (yeni && yeni.trim()) { item[el.dataset.field] = yeni.trim(); ciz(); }
}
document.addEventListener("dblclick", adDegistir);
const dokunmatik = matchMedia("(pointer: coarse)");
document.addEventListener("click", e => { if (dokunmatik.matches) adDegistir(e); });
$("userBox").onclick = () => { const n = prompt("Adın:", S.name); if (n && n.trim()) { S.name = n.trim(); ciz(); } };

document.addEventListener("submit", e => {
  e.preventDefault();
  if (!e.target.dataset.form || !S) return;
  const f = e.target, v = Object.fromEntries(new FormData(f)), id = uid();
  switch (f.dataset.form) {
    case "ev": { const k = f.dataset.day === "today" ? todayKey : sel; (S.events[k] = S.events[k] || []).push({ id, t: v.t.trim(), time: v.time, type: v.type }); break; }
    case "course": S.courses.push({ id, n: v.n.trim(), g: Math.min(100, Math.max(0, +v.g)) }); break;
    case "deadline": S.deadlines.push({ id, t: v.t.trim(), d: v.d }); break;
    case "job": S.jobs.push({ id, n: v.n.trim(), st: "" }); break;
    case "skill": S.skills.push({ id, n: v.n.trim(), p: 50 }); break;
    case "task": S.tasks.push({ id, t: v.t.trim(), done: false }); break;
    case "link": S.links.push({ id, n: v.n.trim(), u: /^https?:\/\//.test(v.u) ? v.u.trim() : "https://" + v.u.trim() }); break;
  }
  f.reset();
  ciz();
});

document.addEventListener("click", e => { if (e.target.tagName === "DIALOG") e.target.close(); });
document.addEventListener("visibilitychange", () => {
  const d = new Date();
  if (!document.hidden && key(d.getFullYear(), d.getMonth(), d.getDate()) !== todayKey) location.reload();
});

// ================= Giriş / çıkış =================
let sekme = "login";
function authCiz() {
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("cur", b.dataset.tab === sekme));
  $("regOnly").hidden = sekme !== "reg";
  $("authBtn").textContent = sekme === "reg" ? "Hesap oluştur" : "Giriş yap";
  $("aPass").autocomplete = sekme === "reg" ? "new-password" : "current-password";
  const ids = Object.keys(db.users);
  $("accList").innerHTML = ids.length ? `<p class="lbl">Bu cihazdaki hesaplar</p><div class="acc">` +
    ids.map(id => `<button type="button" data-acc="${esc(id)}">${db.users[id].tur === "work" ? "💼" : "🎓"} ${esc(db.users[id].ad)}</button>`).join("") + `</div>` : "";
}
$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const ad = $("aUser").value.trim(), id = ad.toLowerCase(), sifre = $("aPass").value, msg = t => ($("authMsg").textContent = t);
  if (!ad || sifre.length < 4) return msg("Kullanıcı adını yaz, şifre en az 4 karakter olsun.");
  if (sekme === "reg") {
    if (db.users[id]) return msg("Bu kullanıcı adı zaten var. Giriş yapmayı dene.");
    const tur = document.querySelector("input[name=tur]:checked").value, tuz = uid() + uid();
    db.users[id] = { ad, tur, tuz, hash: await hashle(sifre, tuz), data: yeniVeri(tur, ad) };
  } else {
    const h = db.users[id];
    if (!h || h.hash !== await hashle(sifre, h.tuz)) return msg("Kullanıcı adı veya şifre yanlış.");
  }
  db.aktif = id; dbYaz(); msg(""); $("aPass").value = ""; basla();
});
function basla() { // giriş yapan kişinin ekranını aç
  const h = db.users[db.aktif];
  if (!gecerli(h.data)) h.data = yeniVeri(h.tur, h.ad);
  S = h.data; sel = todayKey; view = { y: now.getFullYear(), m: now.getMonth() }; q = ""; $("q").value = "";
  $("auth").hidden = true; modUygula(); goView("home"); ciz();
}
function cikis() { // verileri kaydet, oturumu kapat, giriş ekranına dön
  clearTimeout(kaydetZamani); db.aktif = null; dbYaz(); S = null; location.reload();
}

// ================= Başlangıç =================
authCiz();
if (db.aktif && db.users[db.aktif]) basla(); else $("auth").hidden = false;
