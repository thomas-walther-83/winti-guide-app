import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ────────────────────────────────────────────────────────
// Ersetze diese Werte mit deinen eigenen aus supabase.com → Project Settings → API
const SUPABASE_URL  = "https://DEINE-PROJECT-ID.supabase.co";
const SUPABASE_ANON = "DEIN-ANON-PUBLIC-KEY";

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      "Prefer": opts.prefer || "return=representation",
    },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
};

const api = {
  // Existing
  getListings:    () => sb("listings?order=category,name&select=*"),
  getEvents:      () => sb("events?order=event_date&select=*"),
  getAds:         () => sb("ads?order=created_at&select=*"),
  addListing:     (d) => sb("listings", { method:"POST", body:JSON.stringify(d) }),
  addEvent:       (d) => sb("events",   { method:"POST", body:JSON.stringify(d) }),
  addAd:          (d) => sb("ads",      { method:"POST", body:JSON.stringify(d) }),
  updateListing:  (id, d) => sb(`listings?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d) }),
  updateEvent:    (id, d) => sb(`events?id=eq.${id}`,   { method:"PATCH", body:JSON.stringify(d) }),
  deleteListing:  (id) => sb(`listings?id=eq.${id}`, { method:"DELETE", prefer:"" }),
  deleteEvent:    (id) => sb(`events?id=eq.${id}`,   { method:"DELETE", prefer:"" }),
  deleteAd:       (id) => sb(`ads?id=eq.${id}`,      { method:"DELETE", prefer:"" }),

  // Partners
  getPartners:    () => sb("partners?order=created_at.desc&select=*"),
  updatePartner:  (id, d) => sb(`partners?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d) }),
  deletePartner:  (id) => sb(`partners?id=eq.${id}`, { method:"DELETE", prefer:"" }),

  // Partner Ads
  getPartnerAds:  () => sb("partner_ads?order=created_at.desc&select=*,partners(company_name)"),
  updatePartnerAd:(id, d) => sb(`partner_ads?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d) }),
  deletePartnerAd:(id) => sb(`partner_ads?id=eq.${id}`, { method:"DELETE", prefer:"" }),

  // Invoices
  getInvoices:    () => sb("partner_invoices?order=due_date.desc&select=*,partners(company_name)"),
  updateInvoice:  (id, d) => sb(`partner_invoices?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d) }),
};

const CATS = ["restaurants","cafes","bars","hotels","sightseeing","kultur","geschaefte","sport","touren"];
const EVT_CATS = ["festival","musik","kultur","markt","theater","tour","kulinarik","sport"];
const CAT_LABELS = { restaurants:"🍽️ Restaurants", cafes:"☕ Cafés", bars:"🍸 Bars", hotels:"🏨 Hotels", sightseeing:"🏛️ Sightseeing", kultur:"🎨 Kultur", geschaefte:"🛍️ Geschäfte", sport:"🏊 Sport", touren:"🗺️ Touren" };
const EVT_LABELS = { festival:"🎪 Festival", musik:"🎵 Musik", kultur:"🎨 Kultur", markt:"🛍️ Markt", theater:"🎭 Theater", tour:"🗺️ Tour", kulinarik:"🍷 Kulinarik", sport:"🏅 Sport" };
const PARTNER_TIER_LABELS = { starter:"Starter", pro:"Pro", premium:"Premium" };
const PARTNER_STATUS_COLORS = { pending:"#fef3c7", active:"#dcfce7", suspended:"#fee2e2" };
const PARTNER_STATUS_TEXT   = { pending:"#92400e", active:"#16a34a", suspended:"#dc2626" };
const INVOICE_STATUS_COLORS = { draft:"#f3f4f6", sent:"#dbeafe", paid:"#dcfce7", overdue:"#fee2e2", void:"#f3f4f6" };
const INVOICE_STATUS_TEXT   = { draft:"#374151", sent:"#1d4ed8", paid:"#16a34a", overdue:"#dc2626", void:"#9ca3af" };

// ─── EMPTY FORMS ────────────────────────────────────────────────────────────
const emptyListing = { category:"restaurants", sub_type:"", name:"", address:"", hours:"", phone:"", website:"", stars:"", desc:"", is_premium:false, is_active:true };
const emptyEvent   = { title:"", cat:"festival", location:"", event_date:"", event_time:"", price:"", desc:"", url:"", is_active:true };
const emptyAd      = { title:"", subtitle:"", cta_label:"Mehr erfahren", cta_url:"", position:"banner", is_active:true };

export default function AdminPanel() {
  const [tab, setTab]             = useState("listings");
  const [listings, setListings]   = useState([]);
  const [events, setEvents]       = useState([]);
  const [ads, setAds]             = useState([]);
  const [partners, setPartners]   = useState([]);
  const [partnerAds, setPartnerAds] = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(emptyListing);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch]       = useState("");
  const [configured, setConfigured] = useState(
    SUPABASE_URL !== "https://DEINE-PROJECT-ID.supabase.co"
  );

  const notify = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const [l, e, a, p, pa, inv] = await Promise.all([
        api.getListings(), api.getEvents(), api.getAds(),
        api.getPartners(), api.getPartnerAds(), api.getInvoices(),
      ]);
      setListings(l || []); setEvents(e || []); setAds(a || []);
      setPartners(p || []); setPartnerAds(pa || []); setInvoices(inv || []);
    } catch(err) { notify("Fehler beim Laden: " + err.message, false); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [configured]);

  const openNew = () => {
    setEditItem(null);
    setForm(tab === "listings" ? emptyListing : tab === "events" ? emptyEvent : emptyAd);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setShowForm(true);
  };

  const save = async () => {
    setLoading(true);
    try {
      if (tab === "listings") {
        editItem ? await api.updateListing(editItem.id, form) : await api.addListing(form);
      } else if (tab === "events") {
        editItem ? await api.updateEvent(editItem.id, form) : await api.addEvent(form);
      } else {
        editItem ? null : await api.addAd(form);
      }
      notify(editItem ? "Aktualisiert ✓" : "Gespeichert ✓");
      setShowForm(false); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
    setLoading(false);
  };

  const del = async (id) => {
    if (!window.confirm("Wirklich löschen?")) return;
    try {
      if (tab === "listings") await api.deleteListing(id);
      else if (tab === "events") await api.deleteEvent(id);
      else if (tab === "ads") await api.deleteAd(id);
      else if (tab === "partners") await api.deletePartner(id);
      else if (tab === "partner_ads") await api.deletePartnerAd(id);
      notify("Gelöscht ✓"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  const toggle = async (item) => {
    try {
      if (tab === "listings")
        await api.updateListing(item.id, { is_active: !item.is_active });
      else if (tab === "events")
        await api.updateEvent(item.id, { is_active: !item.is_active });
      notify(item.is_active ? "Deaktiviert" : "Aktiviert"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  const togglePartnerStatus = async (partner) => {
    const next = partner.status === "active" ? "suspended" : "active";
    try {
      await api.updatePartner(partner.id, { status: next });
      notify(next === "active" ? "Partner aktiviert ✓" : "Partner suspendiert"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  const approvePartner = async (partner) => {
    try {
      await api.updatePartner(partner.id, { status: "active" });
      notify("Partner freigeschalten ✓"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  const togglePartnerAd = async (ad) => {
    try {
      await api.updatePartnerAd(ad.id, { is_active: !ad.is_active });
      notify(ad.is_active ? "Anzeige deaktiviert" : "Anzeige aktiviert ✓"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  const markInvoicePaid = async (invoice) => {
    if (!window.confirm("Rechnung als bezahlt markieren?")) return;
    try {
      await api.updateInvoice(invoice.id, { status: "paid", paid_at: new Date().toISOString() });
      notify("Rechnung als bezahlt markiert ✓"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  // Filter listings
  const displayListings = listings.filter(l =>
    (filterCat === "all" || l.category === filterCat) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.address||"").toLowerCase().includes(search.toLowerCase()))
  );
  const displayEvents = events.filter(e =>
    (!search || e.title.toLowerCase().includes(search.toLowerCase()))
  );
  const displayPartners = partners.filter(p =>
    (!search || p.company_name.toLowerCase().includes(search.toLowerCase()) || (p.contact_email||"").toLowerCase().includes(search.toLowerCase()))
  );
  const displayPartnerAds = partnerAds.filter(a =>
    (!search || a.title.toLowerCase().includes(search.toLowerCase()))
  );
  const displayInvoices = invoices.filter(i =>
    (!search || (i.partners?.company_name||"").toLowerCase().includes(search.toLowerCase()))
  );

  const pendingPartners = partners.filter(p => p.status === "pending").length;
  const pendingAds      = partnerAds.filter(a => !a.is_active).length;
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;

  // ── Not configured screen ──
  if (!configured) return (
    <div style={s.setup}>
      <div style={s.setupCard}>
        <div style={s.setupIcon}>⚙️</div>
        <div style={s.setupTitle}>Supabase konfigurieren</div>
        <div style={s.setupText}>Ersetze im Code die zwei Variablen oben mit deinen echten Supabase-Zugangsdaten:</div>
        <div style={s.code}>
          <div>1. Gehe zu <strong>supabase.com</strong></div>
          <div>2. Neues Projekt erstellen: <strong>winti-guide</strong></div>
          <div>3. SQL Editor → Schema einfügen & ausführen</div>
          <div>4. Settings → API → Project URL & anon key kopieren</div>
          <div style={{marginTop:12, color:"#CC0000"}}>const SUPABASE_URL = "https://xxx.supabase.co"</div>
          <div style={{color:"#CC0000"}}>const SUPABASE_ANON = "eyJ..."</div>
        </div>
        <button style={s.setupBtn} onClick={() => setConfigured(true)}>
          Ich habe es konfiguriert →
        </button>
      </div>
    </div>
  );

  return (
    <div style={s.shell}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>🦁</div>
          <div>
            <div style={s.headerTitle}>Winti Guide</div>
            <div style={s.headerSub}>Admin Panel</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.stats}>
            <span style={s.stat}><strong>{listings.length}</strong> Einträge</span>
            <span style={s.stat}><strong>{events.length}</strong> Events</span>
            <span style={s.stat}><strong>{partners.length}</strong> Partner</span>
          </div>
          {(pendingPartners > 0 || pendingAds > 0 || overdueInvoices > 0) && (
            <div style={s.alertBadges}>
              {pendingPartners > 0 && <span style={s.alertBadge}>⏳ {pendingPartners} Partner</span>}
              {pendingAds > 0 && <span style={s.alertBadge}>📢 {pendingAds} Anzeigen</span>}
              {overdueInvoices > 0 && <span style={{...s.alertBadge, background:"#fee2e2", color:"#dc2626"}}>💸 {overdueInvoices} überfällig</span>}
            </div>
          )}
          {["listings","events","ads"].includes(tab) && (
            <button style={s.addBtn} onClick={openNew}>+ Neu</button>
          )}
          <button style={s.refreshBtn} onClick={load} disabled={loading}>{loading ? "⟳" : "↻"}</button>
        </div>
      </div>

      {/* ── TOAST ── */}
      {msg && (
        <div style={{ ...s.toast, background: msg.ok ? "#16a34a" : "#dc2626" }}>
          {msg.text}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={s.tabs}>
        {[
          ["listings","🏠 Einträge"],
          ["events","📅 Events"],
          ["ads","📢 Anzeigen"],
          ["partners", pendingPartners > 0 ? `🤝 Partner (${pendingPartners})` : "🤝 Partner"],
          ["partner_ads", pendingAds > 0 ? `🖼️ Partner-Ads (${pendingAds})` : "🖼️ Partner-Ads"],
          ["invoices", overdueInvoices > 0 ? `💸 Rechnungen (${overdueInvoices}!)` : "💸 Rechnungen"],
        ].map(([id,lbl]) => (
          <button key={id} onClick={() => { setTab(id); setSearch(""); setFilterCat("all"); }}
            style={{ ...s.tabBtn, ...(tab===id ? s.tabActive : {}), ...(id==="invoices" && overdueInvoices > 0 ? {color:"#dc2626"} : {}) }}>{lbl}
          </button>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div style={s.toolbar}>
        <input style={s.searchInput} placeholder="Suchen…" value={search}
          onChange={e => setSearch(e.target.value)}/>
        {tab === "listings" && (
          <select style={s.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">Alle Kategorien</option>
            {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
        )}
      </div>

      {/* ── TABLE: LISTINGS ── */}
      {tab === "listings" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Kategorie","Name","Adresse","Öffnungszeiten","Premium","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayListings.length === 0 && (
                <tr><td colSpan={7} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Einträge"}
                </td></tr>
              )}
              {displayListings.map(item => (
                <tr key={item.id} style={{ ...s.tr, opacity: item.is_active ? 1 : 0.45 }}>
                  <td style={s.td}><span style={s.catChip}>{CAT_LABELS[item.category] || item.category}</span></td>
                  <td style={{ ...s.td, fontWeight:600 }}>
                    {item.name}
                    {item.sub_type && <div style={s.subLabel}>{item.sub_type}</div>}
                  </td>
                  <td style={s.td}>{item.address || "–"}</td>
                  <td style={{ ...s.td, fontSize:12, color:"#666" }}>{item.hours || "–"}</td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    {item.is_premium ? <span style={s.premBadge}>⭐ Premium</span> : "–"}
                  </td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <button onClick={() => toggle(item)} style={{ ...s.statusBtn, background: item.is_active ? "#dcfce7" : "#fee2e2", color: item.is_active ? "#16a34a" : "#dc2626" }}>
                      {item.is_active ? "✓ Aktiv" : "✗ Inaktiv"}
                    </button>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    <button style={s.editBtn} onClick={() => openEdit(item)}>Bearbeiten</button>
                    <button style={s.delBtn}  onClick={() => del(item.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TABLE: EVENTS ── */}
      {tab === "events" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Datum","Titel","Kategorie","Ort","Zeit","Preis","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayEvents.length === 0 && (
                <tr><td colSpan={8} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Events"}
                </td></tr>
              )}
              {displayEvents.map(ev => (
                <tr key={ev.id} style={{ ...s.tr, opacity: ev.is_active ? 1 : 0.45 }}>
                  <td style={{ ...s.td, fontWeight:600, whiteSpace:"nowrap" }}>
                    {new Date(ev.event_date).toLocaleDateString("de-CH")}
                  </td>
                  <td style={{ ...s.td, fontWeight:600 }}>{ev.title}</td>
                  <td style={s.td}><span style={s.catChip}>{EVT_LABELS[ev.cat] || ev.cat}</span></td>
                  <td style={s.td}>{ev.location || "–"}</td>
                  <td style={s.td}>{ev.event_time || "–"}</td>
                  <td style={s.td}>{ev.price || "–"}</td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <button onClick={() => toggle(ev)} style={{ ...s.statusBtn, background: ev.is_active ? "#dcfce7" : "#fee2e2", color: ev.is_active ? "#16a34a" : "#dc2626" }}>
                      {ev.is_active ? "✓ Aktiv" : "✗ Inaktiv"}
                    </button>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    <button style={s.editBtn} onClick={() => openEdit(ev)}>Bearbeiten</button>
                    <button style={s.delBtn}  onClick={() => del(ev.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TABLE: ADS ── */}
      {tab === "ads" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Titel","Untertitel","CTA","Position","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Anzeigen"}
                </td></tr>
              )}
              {ads.map(ad => (
                <tr key={ad.id} style={s.tr}>
                  <td style={{ ...s.td, fontWeight:600 }}>{ad.title}</td>
                  <td style={s.td}>{ad.subtitle || "–"}</td>
                  <td style={s.td}>{ad.cta_label}</td>
                  <td style={s.td}><span style={s.catChip}>{ad.position}</span></td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <span style={{ ...s.statusBtn, background: ad.is_active ? "#dcfce7" : "#fee2e2", color: ad.is_active ? "#16a34a" : "#dc2626" }}>
                      {ad.is_active ? "✓ Aktiv" : "✗ Inaktiv"}
                    </span>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    <button style={s.delBtn} onClick={() => del(ad.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TABLE: PARTNERS ── */}
      {tab === "partners" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Firma","Kategorie","E-Mail","Tier","Status","Erstellt","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayPartners.length === 0 && (
                <tr><td colSpan={7} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Partner"}
                </td></tr>
              )}
              {displayPartners.map(p => (
                <tr key={p.id} style={s.tr}>
                  <td style={{ ...s.td, fontWeight:600 }}>{p.company_name}</td>
                  <td style={s.td}>{p.category || "–"}</td>
                  <td style={s.td}>{p.contact_email}</td>
                  <td style={s.td}><span style={{...s.catChip}}>{PARTNER_TIER_LABELS[p.tier] || p.tier}</span></td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <span style={{ ...s.statusBtn, background: PARTNER_STATUS_COLORS[p.status] || "#f3f4f6", color: PARTNER_STATUS_TEXT[p.status] || "#374151" }}>
                      {p.status === "pending" ? "⏳ Ausstehend" : p.status === "active" ? "✓ Aktiv" : "✗ Suspendiert"}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontSize:12, color:"#666" }}>
                    {new Date(p.created_at).toLocaleDateString("de-CH")}
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    {p.status === "pending" && (
                      <button style={{...s.editBtn, background:"#dcfce7", color:"#16a34a"}} onClick={() => approvePartner(p)}>✓ Freischalten</button>
                    )}
                    {p.status === "active" && (
                      <button style={{...s.editBtn, background:"#fee2e2", color:"#dc2626"}} onClick={() => togglePartnerStatus(p)}>Suspendieren</button>
                    )}
                    {p.status === "suspended" && (
                      <button style={s.editBtn} onClick={() => togglePartnerStatus(p)}>Reaktivieren</button>
                    )}
                    <button style={s.delBtn} onClick={() => del(p.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TABLE: PARTNER ADS ── */}
      {tab === "partner_ads" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Partner","Titel","Position","Laufzeit","Statistiken","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayPartnerAds.length === 0 && (
                <tr><td colSpan={7} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Partner-Anzeigen"}
                </td></tr>
              )}
              {displayPartnerAds.map(ad => (
                <tr key={ad.id} style={s.tr}>
                  <td style={{ ...s.td, fontSize:12 }}>{ad.partners?.company_name || "–"}</td>
                  <td style={{ ...s.td, fontWeight:600 }}>
                    {ad.title}
                    {ad.subtitle && <div style={s.subLabel}>{ad.subtitle}</div>}
                  </td>
                  <td style={s.td}><span style={s.catChip}>{ad.position}</span></td>
                  <td style={{ ...s.td, fontSize:12, color:"#666" }}>
                    {ad.starts_at ? new Date(ad.starts_at).toLocaleDateString("de-CH") : "–"}
                    {ad.ends_at && <> – {new Date(ad.ends_at).toLocaleDateString("de-CH")}</>}
                  </td>
                  <td style={{ ...s.td, fontSize:12 }}>
                    👁 {ad.impressions||0} · 🖱 {ad.clicks||0}
                  </td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <button onClick={() => togglePartnerAd(ad)}
                      style={{ ...s.statusBtn, background: ad.is_active ? "#dcfce7" : "#fef3c7", color: ad.is_active ? "#16a34a" : "#92400e" }}>
                      {ad.is_active ? "✓ Aktiv" : "⏳ Ausstehend"}
                    </button>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    {!ad.is_active && (
                      <button style={{...s.editBtn, background:"#dcfce7", color:"#16a34a"}} onClick={() => togglePartnerAd(ad)}>✓ Freischalten</button>
                    )}
                    <button style={s.delBtn} onClick={() => del(ad.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TABLE: INVOICES ── */}
      {tab === "invoices" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Partner","Betrag (CHF)","Fällig am","Bezahlt am","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayInvoices.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Rechnungen"}
                </td></tr>
              )}
              {displayInvoices.map(inv => (
                <tr key={inv.id} style={s.tr}>
                  <td style={s.td}>{inv.partners?.company_name || "–"}</td>
                  <td style={{ ...s.td, fontWeight:700, fontSize:15 }}>
                    {Number(inv.amount_chf).toFixed(2)}
                  </td>
                  <td style={{ ...s.td, fontWeight: inv.status === "overdue" ? 700 : 400, color: inv.status === "overdue" ? "#dc2626" : "#374151" }}>
                    {new Date(inv.due_date).toLocaleDateString("de-CH")}
                  </td>
                  <td style={{ ...s.td, fontSize:12, color:"#666" }}>
                    {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("de-CH") : "–"}
                  </td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <span style={{ ...s.statusBtn, background: INVOICE_STATUS_COLORS[inv.status] || "#f3f4f6", color: INVOICE_STATUS_TEXT[inv.status] || "#374151" }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    {inv.status !== "paid" && inv.status !== "void" && (
                      <button style={{...s.editBtn, background:"#dcfce7", color:"#16a34a"}} onClick={() => markInvoicePaid(inv)}>✓ Als bezahlt markieren</button>
                    )}
                    {inv.invoice_pdf_url && (
                      <a href={inv.invoice_pdf_url} target="_blank" rel="noreferrer" style={{...s.editBtn, textDecoration:"none", display:"inline-block"}}>📄 PDF</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>
                {editItem ? "Bearbeiten" : "Neu erstellen"} – {tab === "listings" ? "Eintrag" : tab === "events" ? "Event" : "Anzeige"}
              </span>
              <button style={s.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div style={s.modalBody}>
              {/* LISTING FORM */}
              {tab === "listings" && (<>
                <Row label="Kategorie*">
                  <select style={s.input} value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
                    {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </Row>
                <Row label="Typ / Unterart"><input style={s.input} placeholder="z.B. Schweizer Küche, Freibad…" value={form.sub_type||""} onChange={e=>setForm({...form,sub_type:e.target.value})}/></Row>
                <Row label="Name*"><input style={s.input} placeholder="Name des Betriebs" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Row>
                <Row label="Adresse"><input style={s.input} placeholder="Strasse Nr, PLZ Ort" value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></Row>
                <Row label="Öffnungszeiten"><input style={s.input} placeholder="Mo–Fr 09:00–18:00" value={form.hours||""} onChange={e=>setForm({...form,hours:e.target.value})}/></Row>
                <Row label="Telefon"><input style={s.input} placeholder="+41 52 XXX XX XX" value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></Row>
                <Row label="Website"><input style={s.input} placeholder="www.beispiel.ch" value={form.website||""} onChange={e=>setForm({...form,website:e.target.value})}/></Row>
                <Row label="Sterne (Hotels)"><input style={s.input} placeholder="3" value={form.stars||""} onChange={e=>setForm({...form,stars:e.target.value})}/></Row>
                <Row label="Beschreibung"><textarea style={{...s.input,height:80,resize:"vertical"}} placeholder="Kurze Beschreibung…" value={form.desc||""} onChange={e=>setForm({...form,desc:e.target.value})}/></Row>
                <Row label="Premium-Eintrag">
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={form.is_premium||false} onChange={e=>setForm({...form,is_premium:e.target.checked})}/>
                    <span>Ja – hervorgehoben in der App</span>
                  </label>
                </Row>
              </>)}

              {/* EVENT FORM */}
              {tab === "events" && (<>
                <Row label="Titel*"><input style={s.input} placeholder="Eventname" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></Row>
                <Row label="Kategorie*">
                  <select style={s.input} value={form.cat||"festival"} onChange={e=>setForm({...form,cat:e.target.value})}>
                    {EVT_CATS.map(c => <option key={c} value={c}>{EVT_LABELS[c]}</option>)}
                  </select>
                </Row>
                <Row label="Datum*"><input style={s.input} type="date" value={form.event_date||""} onChange={e=>setForm({...form,event_date:e.target.value})}/></Row>
                <Row label="Uhrzeit"><input style={s.input} placeholder="19:00" value={form.event_time||""} onChange={e=>setForm({...form,event_time:e.target.value})}/></Row>
                <Row label="Ort"><input style={s.input} placeholder="Stadtpark, Kaserne…" value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})}/></Row>
                <Row label="Preis"><input style={s.input} placeholder="Gratis / CHF 20" value={form.price||""} onChange={e=>setForm({...form,price:e.target.value})}/></Row>
                <Row label="Beschreibung"><textarea style={{...s.input,height:80,resize:"vertical"}} value={form.desc||""} onChange={e=>setForm({...form,desc:e.target.value})}/></Row>
                <Row label="URL / Tickets"><input style={s.input} placeholder="https://…" value={form.url||""} onChange={e=>setForm({...form,url:e.target.value})}/></Row>
              </>)}

              {/* AD FORM */}
              {tab === "ads" && (<>
                <Row label="Titel*"><input style={s.input} placeholder="Hotel Wartmann ⭐⭐⭐⭐" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></Row>
                <Row label="Untertitel"><input style={s.input} placeholder="Frühbucherrabatt 10%…" value={form.subtitle||""} onChange={e=>setForm({...form,subtitle:e.target.value})}/></Row>
                <Row label="Button-Text"><input style={s.input} value={form.cta_label||""} onChange={e=>setForm({...form,cta_label:e.target.value})}/></Row>
                <Row label="URL"><input style={s.input} placeholder="https://…" value={form.cta_url||""} onChange={e=>setForm({...form,cta_url:e.target.value})}/></Row>
                <Row label="Position">
                  <select style={s.input} value={form.position||"banner"} onChange={e=>setForm({...form,position:e.target.value})}>
                    <option value="banner">Banner (oben)</option>
                    <option value="inline">Inline (zwischen Einträgen)</option>
                  </select>
                </Row>
              </>)}
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowForm(false)}>Abbrechen</button>
              <button style={s.saveBtn} onClick={save} disabled={loading}>
                {loading ? "Speichert…" : editItem ? "Aktualisieren" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ label, children }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#555", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</label>
    {children}
  </div>
);

const s = {
  shell:{ minHeight:"100vh", background:"#f8f7f5", fontFamily:"system-ui, -apple-system, sans-serif" },
  header:{ background:"#8B0000", color:"#fff", padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 },
  headerLeft:{ display:"flex", alignItems:"center", gap:14 },
  logo:{ fontSize:28, background:"#fff", borderRadius:10, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" },
  headerTitle:{ fontSize:18, fontWeight:700 }, headerSub:{ fontSize:12, opacity:0.65 },
  headerRight:{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
  stats:{ display:"flex", gap:12 },
  stat:{ fontSize:13, background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"4px 12px" },
  alertBadges:{ display:"flex", gap:8 },
  alertBadge:{ fontSize:12, background:"#fef3c7", color:"#92400e", borderRadius:20, padding:"4px 10px", fontWeight:600 },
  addBtn:{ background:"#fff", color:"#8B0000", border:"none", borderRadius:8, padding:"8px 18px", fontSize:14, fontWeight:700, cursor:"pointer" },
  refreshBtn:{ background:"rgba(255,255,255,0.2)", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:16, cursor:"pointer" },
  toast:{ position:"fixed", top:16, right:16, color:"#fff", padding:"12px 20px", borderRadius:10, fontWeight:600, zIndex:9999, fontSize:14, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" },
  tabs:{ display:"flex", gap:0, borderBottom:"2px solid #e5e7eb", background:"#fff", padding:"0 24px", overflowX:"auto" },
  tabBtn:{ padding:"14px 16px", fontSize:13, fontWeight:600, border:"none", background:"none", cursor:"pointer", color:"#6b7280", borderBottom:"2px solid transparent", marginBottom:"-2px", whiteSpace:"nowrap" },
  tabActive:{ color:"#8B0000", borderBottomColor:"#8B0000" },
  toolbar:{ display:"flex", gap:12, padding:"16px 24px 8px", alignItems:"center" },
  searchInput:{ flex:1, border:"1.5px solid #e5e7eb", borderRadius:8, padding:"9px 14px", fontSize:14, outline:"none", maxWidth:300 },
  select:{ border:"1.5px solid #e5e7eb", borderRadius:8, padding:"9px 14px", fontSize:14, cursor:"pointer", outline:"none" },
  tableWrap:{ overflowX:"auto", padding:"0 24px 24px" },
  table:{ width:"100%", borderCollapse:"collapse", background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" },
  th:{ textAlign:"left", padding:"12px 16px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280", background:"#f9fafb", borderBottom:"1px solid #e5e7eb" },
  tr:{ borderBottom:"1px solid #f3f4f6", transition:"background 0.1s" },
  td:{ padding:"13px 16px", fontSize:13, color:"#374151", verticalAlign:"middle" },
  catChip:{ background:"#f3f4f6", color:"#374151", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" },
  subLabel:{ fontSize:11, color:"#9ca3af", marginTop:2 },
  premBadge:{ background:"#fef3c7", color:"#92400e", borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:600 },
  statusBtn:{ border:"none", borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer" },
  editBtn:{ background:"#f3f4f6", color:"#374151", border:"none", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", marginRight:6 },
  delBtn:{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modal:{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
  modalHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 22px", borderBottom:"1px solid #e5e7eb" },
  modalTitle:{ fontSize:16, fontWeight:700, color:"#111" },
  modalClose:{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#9ca3af", padding:4 },
  modalBody:{ overflowY:"auto", padding:"20px 22px" },
  modalFooter:{ display:"flex", justifyContent:"flex-end", gap:10, padding:"16px 22px", borderTop:"1px solid #e5e7eb" },
  input:{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:8, padding:"9px 13px", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  checkLabel:{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:"#374151", cursor:"pointer" },
  cancelBtn:{ background:"#f3f4f6", color:"#374151", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer" },
  saveBtn:{ background:"#8B0000", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer" },
  setup:{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8f7f5" },
  setupCard:{ background:"#fff", borderRadius:16, padding:40, maxWidth:480, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", textAlign:"center" },
  setupIcon:{ fontSize:48, marginBottom:16 },
  setupTitle:{ fontSize:22, fontWeight:700, marginBottom:10, color:"#111" },
  setupText:{ color:"#6b7280", fontSize:14, lineHeight:1.6, marginBottom:20 },
  code:{ background:"#f8f7f5", borderRadius:10, padding:16, fontSize:13, textAlign:"left", lineHeight:2, marginBottom:24 },
  setupBtn:{ background:"#8B0000", color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:15, fontWeight:700, cursor:"pointer" },
};

// ─── SUPABASE CONFIG ────────────────────────────────────────────────────────
// Ersetze diese Werte mit deinen eigenen aus supabase.com → Project Settings → API
const SUPABASE_URL  = "https://DEINE-PROJECT-ID.supabase.co";
const SUPABASE_ANON = "DEIN-ANON-PUBLIC-KEY";

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      "Prefer": opts.prefer || "return=representation",
    },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
};

const api = {
  getListings: () => sb("listings?order=category,name&select=*"),
  getEvents:   () => sb("events?order=event_date&select=*"),
  getAds:      () => sb("ads?order=created_at&select=*"),
  addListing:  (d) => sb("listings", { method:"POST", body:JSON.stringify(d) }),
  addEvent:    (d) => sb("events",   { method:"POST", body:JSON.stringify(d) }),
  addAd:       (d) => sb("ads",      { method:"POST", body:JSON.stringify(d) }),
  updateListing: (id, d) => sb(`listings?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d) }),
  updateEvent:   (id, d) => sb(`events?id=eq.${id}`,   { method:"PATCH", body:JSON.stringify(d) }),
  deleteListing: (id) => sb(`listings?id=eq.${id}`, { method:"DELETE", prefer:"" }),
  deleteEvent:   (id) => sb(`events?id=eq.${id}`,   { method:"DELETE", prefer:"" }),
  deleteAd:      (id) => sb(`ads?id=eq.${id}`,      { method:"DELETE", prefer:"" }),
};

const CATS = ["restaurants","cafes","bars","hotels","sightseeing","kultur","geschaefte","sport","touren"];
const EVT_CATS = ["festival","musik","kultur","markt","theater","tour","kulinarik","sport"];
const CAT_LABELS = { restaurants:"🍽️ Restaurants", cafes:"☕ Cafés", bars:"🍸 Bars", hotels:"🏨 Hotels", sightseeing:"🏛️ Sightseeing", kultur:"🎨 Kultur", geschaefte:"🛍️ Geschäfte", sport:"🏊 Sport", touren:"🗺️ Touren" };
const EVT_LABELS = { festival:"🎪 Festival", musik:"🎵 Musik", kultur:"🎨 Kultur", markt:"🛍️ Markt", theater:"🎭 Theater", tour:"🗺️ Tour", kulinarik:"🍷 Kulinarik", sport:"🏅 Sport" };

// ─── EMPTY FORMS ────────────────────────────────────────────────────────────
const emptyListing = { category:"restaurants", sub_type:"", name:"", address:"", hours:"", phone:"", website:"", stars:"", desc:"", is_premium:false, is_active:true };
const emptyEvent   = { title:"", cat:"festival", location:"", event_date:"", event_time:"", price:"", desc:"", url:"", is_active:true };
const emptyAd      = { title:"", subtitle:"", cta_label:"Mehr erfahren", cta_url:"", position:"banner", is_active:true };

export default function AdminPanel() {
  const [tab, setTab]             = useState("listings");
  const [listings, setListings]   = useState([]);
  const [events, setEvents]       = useState([]);
  const [ads, setAds]             = useState([]);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(emptyListing);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch]       = useState("");
  const [configured, setConfigured] = useState(
    SUPABASE_URL !== "https://DEINE-PROJECT-ID.supabase.co"
  );

  const notify = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const [l, e, a] = await Promise.all([api.getListings(), api.getEvents(), api.getAds()]);
      setListings(l || []); setEvents(e || []); setAds(a || []);
    } catch(err) { notify("Fehler beim Laden: " + err.message, false); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [configured]);

  const openNew = () => {
    setEditItem(null);
    setForm(tab === "listings" ? emptyListing : tab === "events" ? emptyEvent : emptyAd);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setShowForm(true);
  };

  const save = async () => {
    setLoading(true);
    try {
      if (tab === "listings") {
        editItem ? await api.updateListing(editItem.id, form) : await api.addListing(form);
      } else if (tab === "events") {
        editItem ? await api.updateEvent(editItem.id, form) : await api.addEvent(form);
      } else {
        editItem ? null : await api.addAd(form);
      }
      notify(editItem ? "Aktualisiert ✓" : "Gespeichert ✓");
      setShowForm(false); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
    setLoading(false);
  };

  const del = async (id) => {
    if (!window.confirm("Wirklich löschen?")) return;
    try {
      tab === "listings" ? await api.deleteListing(id)
        : tab === "events" ? await api.deleteEvent(id)
        : await api.deleteAd(id);
      notify("Gelöscht ✓"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  const toggle = async (item) => {
    try {
      tab === "listings"
        ? await api.updateListing(item.id, { is_active: !item.is_active })
        : await api.updateEvent(item.id, { is_active: !item.is_active });
      notify(item.is_active ? "Deaktiviert" : "Aktiviert"); load();
    } catch(err) { notify("Fehler: " + err.message, false); }
  };

  // Filter listings
  const displayListings = listings.filter(l =>
    (filterCat === "all" || l.category === filterCat) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.address||"").toLowerCase().includes(search.toLowerCase()))
  );

  const displayEvents = events.filter(e =>
    (!search || e.title.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Not configured screen ──
  if (!configured) return (
    <div style={s.setup}>
      <div style={s.setupCard}>
        <div style={s.setupIcon}>⚙️</div>
        <div style={s.setupTitle}>Supabase konfigurieren</div>
        <div style={s.setupText}>Ersetze im Code die zwei Variablen oben mit deinen echten Supabase-Zugangsdaten:</div>
        <div style={s.code}>
          <div>1. Gehe zu <strong>supabase.com</strong></div>
          <div>2. Neues Projekt erstellen: <strong>winti-guide</strong></div>
          <div>3. SQL Editor → Schema einfügen & ausführen</div>
          <div>4. Settings → API → Project URL & anon key kopieren</div>
          <div style={{marginTop:12, color:"#CC0000"}}>const SUPABASE_URL = "https://xxx.supabase.co"</div>
          <div style={{color:"#CC0000"}}>const SUPABASE_ANON = "eyJ..."</div>
        </div>
        <button style={s.setupBtn} onClick={() => setConfigured(true)}>
          Ich habe es konfiguriert →
        </button>
      </div>
    </div>
  );

  return (
    <div style={s.shell}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>🦁</div>
          <div>
            <div style={s.headerTitle}>Winti Guide</div>
            <div style={s.headerSub}>Admin Panel</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.stats}>
            <span style={s.stat}><strong>{listings.length}</strong> Einträge</span>
            <span style={s.stat}><strong>{events.length}</strong> Events</span>
            <span style={s.stat}><strong>{ads.length}</strong> Anzeigen</span>
          </div>
          <button style={s.addBtn} onClick={openNew}>+ Neu</button>
          <button style={s.refreshBtn} onClick={load} disabled={loading}>{loading ? "⟳" : "↻"}</button>
        </div>
      </div>

      {/* ── TOAST ── */}
      {msg && (
        <div style={{ ...s.toast, background: msg.ok ? "#16a34a" : "#dc2626" }}>
          {msg.text}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={s.tabs}>
        {[["listings","🏠 Einträge"],["events","📅 Events"],["ads","📢 Anzeigen"]].map(([id,lbl]) => (
          <button key={id} onClick={() => { setTab(id); setSearch(""); setFilterCat("all"); }}
            style={{ ...s.tabBtn, ...(tab===id ? s.tabActive : {}) }}>{lbl}
          </button>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div style={s.toolbar}>
        <input style={s.searchInput} placeholder="Suchen…" value={search}
          onChange={e => setSearch(e.target.value)}/>
        {tab === "listings" && (
          <select style={s.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">Alle Kategorien</option>
            {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
        )}
      </div>

      {/* ── TABLE: LISTINGS ── */}
      {tab === "listings" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Kategorie","Name","Adresse","Öffnungszeiten","Premium","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayListings.length === 0 && (
                <tr><td colSpan={7} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Einträge"}
                </td></tr>
              )}
              {displayListings.map(item => (
                <tr key={item.id} style={{ ...s.tr, opacity: item.is_active ? 1 : 0.45 }}>
                  <td style={s.td}><span style={s.catChip}>{CAT_LABELS[item.category] || item.category}</span></td>
                  <td style={{ ...s.td, fontWeight:600 }}>
                    {item.name}
                    {item.sub_type && <div style={s.subLabel}>{item.sub_type}</div>}
                  </td>
                  <td style={s.td}>{item.address || "–"}</td>
                  <td style={{ ...s.td, fontSize:12, color:"#666" }}>{item.hours || "–"}</td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    {item.is_premium ? <span style={s.premBadge}>⭐ Premium</span> : "–"}
                  </td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <button onClick={() => toggle(item)} style={{ ...s.statusBtn, background: item.is_active ? "#dcfce7" : "#fee2e2", color: item.is_active ? "#16a34a" : "#dc2626" }}>
                      {item.is_active ? "✓ Aktiv" : "✗ Inaktiv"}
                    </button>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    <button style={s.editBtn} onClick={() => openEdit(item)}>Bearbeiten</button>
                    <button style={s.delBtn}  onClick={() => del(item.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TABLE: EVENTS ── */}
      {tab === "events" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Datum","Titel","Kategorie","Ort","Zeit","Preis","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayEvents.length === 0 && (
                <tr><td colSpan={8} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Events"}
                </td></tr>
              )}
              {displayEvents.map(ev => (
                <tr key={ev.id} style={{ ...s.tr, opacity: ev.is_active ? 1 : 0.45 }}>
                  <td style={{ ...s.td, fontWeight:600, whiteSpace:"nowrap" }}>
                    {new Date(ev.event_date).toLocaleDateString("de-CH")}
                  </td>
                  <td style={{ ...s.td, fontWeight:600 }}>{ev.title}</td>
                  <td style={s.td}><span style={s.catChip}>{EVT_LABELS[ev.cat] || ev.cat}</span></td>
                  <td style={s.td}>{ev.location || "–"}</td>
                  <td style={s.td}>{ev.event_time || "–"}</td>
                  <td style={s.td}>{ev.price || "–"}</td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <button onClick={() => toggle(ev)} style={{ ...s.statusBtn, background: ev.is_active ? "#dcfce7" : "#fee2e2", color: ev.is_active ? "#16a34a" : "#dc2626" }}>
                      {ev.is_active ? "✓ Aktiv" : "✗ Inaktiv"}
                    </button>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    <button style={s.editBtn} onClick={() => openEdit(ev)}>Bearbeiten</button>
                    <button style={s.delBtn}  onClick={() => del(ev.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TABLE: ADS ── */}
      {tab === "ads" && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Titel","Untertitel","CTA","Position","Status","Aktionen"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:32 }}>
                  {loading ? "Lädt…" : "Keine Anzeigen"}
                </td></tr>
              )}
              {ads.map(ad => (
                <tr key={ad.id} style={s.tr}>
                  <td style={{ ...s.td, fontWeight:600 }}>{ad.title}</td>
                  <td style={s.td}>{ad.subtitle || "–"}</td>
                  <td style={s.td}>{ad.cta_label}</td>
                  <td style={s.td}><span style={s.catChip}>{ad.position}</span></td>
                  <td style={{ ...s.td, textAlign:"center" }}>
                    <span style={{ ...s.statusBtn, background: ad.is_active ? "#dcfce7" : "#fee2e2", color: ad.is_active ? "#16a34a" : "#dc2626" }}>
                      {ad.is_active ? "✓ Aktiv" : "✗ Inaktiv"}
                    </span>
                  </td>
                  <td style={{ ...s.td, whiteSpace:"nowrap" }}>
                    <button style={s.delBtn} onClick={() => del(ad.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>
                {editItem ? "Bearbeiten" : "Neu erstellen"} – {tab === "listings" ? "Eintrag" : tab === "events" ? "Event" : "Anzeige"}
              </span>
              <button style={s.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div style={s.modalBody}>
              {/* LISTING FORM */}
              {tab === "listings" && (<>
                <Row label="Kategorie*">
                  <select style={s.input} value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
                    {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </Row>
                <Row label="Typ / Unterart"><input style={s.input} placeholder="z.B. Schweizer Küche, Freibad…" value={form.sub_type||""} onChange={e=>setForm({...form,sub_type:e.target.value})}/></Row>
                <Row label="Name*"><input style={s.input} placeholder="Name des Betriebs" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Row>
                <Row label="Adresse"><input style={s.input} placeholder="Strasse Nr, PLZ Ort" value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></Row>
                <Row label="Öffnungszeiten"><input style={s.input} placeholder="Mo–Fr 09:00–18:00" value={form.hours||""} onChange={e=>setForm({...form,hours:e.target.value})}/></Row>
                <Row label="Telefon"><input style={s.input} placeholder="+41 52 XXX XX XX" value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></Row>
                <Row label="Website"><input style={s.input} placeholder="www.beispiel.ch" value={form.website||""} onChange={e=>setForm({...form,website:e.target.value})}/></Row>
                <Row label="Sterne (Hotels)"><input style={s.input} placeholder="3" value={form.stars||""} onChange={e=>setForm({...form,stars:e.target.value})}/></Row>
                <Row label="Beschreibung"><textarea style={{...s.input,height:80,resize:"vertical"}} placeholder="Kurze Beschreibung…" value={form.desc||""} onChange={e=>setForm({...form,desc:e.target.value})}/></Row>
                <Row label="Premium-Eintrag">
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={form.is_premium||false} onChange={e=>setForm({...form,is_premium:e.target.checked})}/>
                    <span>Ja – hervorgehoben in der App</span>
                  </label>
                </Row>
              </>)}

              {/* EVENT FORM */}
              {tab === "events" && (<>
                <Row label="Titel*"><input style={s.input} placeholder="Eventname" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></Row>
                <Row label="Kategorie*">
                  <select style={s.input} value={form.cat||"festival"} onChange={e=>setForm({...form,cat:e.target.value})}>
                    {EVT_CATS.map(c => <option key={c} value={c}>{EVT_LABELS[c]}</option>)}
                  </select>
                </Row>
                <Row label="Datum*"><input style={s.input} type="date" value={form.event_date||""} onChange={e=>setForm({...form,event_date:e.target.value})}/></Row>
                <Row label="Uhrzeit"><input style={s.input} placeholder="19:00" value={form.event_time||""} onChange={e=>setForm({...form,event_time:e.target.value})}/></Row>
                <Row label="Ort"><input style={s.input} placeholder="Stadtpark, Kaserne…" value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})}/></Row>
                <Row label="Preis"><input style={s.input} placeholder="Gratis / CHF 20" value={form.price||""} onChange={e=>setForm({...form,price:e.target.value})}/></Row>
                <Row label="Beschreibung"><textarea style={{...s.input,height:80,resize:"vertical"}} value={form.desc||""} onChange={e=>setForm({...form,desc:e.target.value})}/></Row>
                <Row label="URL / Tickets"><input style={s.input} placeholder="https://…" value={form.url||""} onChange={e=>setForm({...form,url:e.target.value})}/></Row>
              </>)}

              {/* AD FORM */}
              {tab === "ads" && (<>
                <Row label="Titel*"><input style={s.input} placeholder="Hotel Wartmann ⭐⭐⭐⭐" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></Row>
                <Row label="Untertitel"><input style={s.input} placeholder="Frühbucherrabatt 10%…" value={form.subtitle||""} onChange={e=>setForm({...form,subtitle:e.target.value})}/></Row>
                <Row label="Button-Text"><input style={s.input} value={form.cta_label||""} onChange={e=>setForm({...form,cta_label:e.target.value})}/></Row>
                <Row label="URL"><input style={s.input} placeholder="https://…" value={form.cta_url||""} onChange={e=>setForm({...form,cta_url:e.target.value})}/></Row>
                <Row label="Position">
                  <select style={s.input} value={form.position||"banner"} onChange={e=>setForm({...form,position:e.target.value})}>
                    <option value="banner">Banner (oben)</option>
                    <option value="inline">Inline (zwischen Einträgen)</option>
                  </select>
                </Row>
              </>)}
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowForm(false)}>Abbrechen</button>
              <button style={s.saveBtn} onClick={save} disabled={loading}>
                {loading ? "Speichert…" : editItem ? "Aktualisieren" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ label, children }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#555", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</label>
    {children}
  </div>
);

const s = {
  shell:{ minHeight:"100vh", background:"#f8f7f5", fontFamily:"system-ui, -apple-system, sans-serif" },
  header:{ background:"#8B0000", color:"#fff", padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 },
  headerLeft:{ display:"flex", alignItems:"center", gap:14 },
  logo:{ fontSize:28, background:"#fff", borderRadius:10, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" },
  headerTitle:{ fontSize:18, fontWeight:700 }, headerSub:{ fontSize:12, opacity:0.65 },
  headerRight:{ display:"flex", alignItems:"center", gap:10 },
  stats:{ display:"flex", gap:12 },
  stat:{ fontSize:13, background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"4px 12px" },
  addBtn:{ background:"#fff", color:"#8B0000", border:"none", borderRadius:8, padding:"8px 18px", fontSize:14, fontWeight:700, cursor:"pointer" },
  refreshBtn:{ background:"rgba(255,255,255,0.2)", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:16, cursor:"pointer" },
  toast:{ position:"fixed", top:16, right:16, color:"#fff", padding:"12px 20px", borderRadius:10, fontWeight:600, zIndex:9999, fontSize:14, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" },
  tabs:{ display:"flex", gap:0, borderBottom:"2px solid #e5e7eb", background:"#fff", padding:"0 24px" },
  tabBtn:{ padding:"14px 20px", fontSize:14, fontWeight:600, border:"none", background:"none", cursor:"pointer", color:"#6b7280", borderBottom:"2px solid transparent", marginBottom:"-2px" },
  tabActive:{ color:"#8B0000", borderBottomColor:"#8B0000" },
  toolbar:{ display:"flex", gap:12, padding:"16px 24px 8px", alignItems:"center" },
  searchInput:{ flex:1, border:"1.5px solid #e5e7eb", borderRadius:8, padding:"9px 14px", fontSize:14, outline:"none", maxWidth:300 },
  select:{ border:"1.5px solid #e5e7eb", borderRadius:8, padding:"9px 14px", fontSize:14, cursor:"pointer", outline:"none" },
  tableWrap:{ overflowX:"auto", padding:"0 24px 24px" },
  table:{ width:"100%", borderCollapse:"collapse", background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" },
  th:{ textAlign:"left", padding:"12px 16px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280", background:"#f9fafb", borderBottom:"1px solid #e5e7eb" },
  tr:{ borderBottom:"1px solid #f3f4f6", transition:"background 0.1s" },
  td:{ padding:"13px 16px", fontSize:13, color:"#374151", verticalAlign:"middle" },
  catChip:{ background:"#f3f4f6", color:"#374151", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" },
  subLabel:{ fontSize:11, color:"#9ca3af", marginTop:2 },
  premBadge:{ background:"#fef3c7", color:"#92400e", borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:600 },
  statusBtn:{ border:"none", borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer" },
  editBtn:{ background:"#f3f4f6", color:"#374151", border:"none", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", marginRight:6 },
  delBtn:{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modal:{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
  modalHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 22px", borderBottom:"1px solid #e5e7eb" },
  modalTitle:{ fontSize:16, fontWeight:700, color:"#111" },
  modalClose:{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#9ca3af", padding:4 },
  modalBody:{ overflowY:"auto", padding:"20px 22px" },
  modalFooter:{ display:"flex", justifyContent:"flex-end", gap:10, padding:"16px 22px", borderTop:"1px solid #e5e7eb" },
  input:{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:8, padding:"9px 13px", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  checkLabel:{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:"#374151", cursor:"pointer" },
  cancelBtn:{ background:"#f3f4f6", color:"#374151", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer" },
  saveBtn:{ background:"#8B0000", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer" },
  setup:{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8f7f5" },
  setupCard:{ background:"#fff", borderRadius:16, padding:40, maxWidth:480, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", textAlign:"center" },
  setupIcon:{ fontSize:48, marginBottom:16 },
  setupTitle:{ fontSize:22, fontWeight:700, marginBottom:10, color:"#111" },
  setupText:{ color:"#6b7280", fontSize:14, lineHeight:1.6, marginBottom:20 },
  code:{ background:"#f8f7f5", borderRadius:10, padding:16, fontSize:13, textAlign:"left", lineHeight:2, marginBottom:24 },
  setupBtn:{ background:"#8B0000", color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:15, fontWeight:700, cursor:"pointer" },
};
