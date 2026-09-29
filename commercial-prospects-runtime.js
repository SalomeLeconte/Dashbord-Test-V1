(() => {
  const state = { prospects: [], filtered: [], departments: [] };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const value = id => document.getElementById(id)?.value?.trim() || '';

  function shell() {
    return `
      <div id="commercial-prospects" class="h-full overflow-auto bg-gray-50 dark:bg-slate-900 p-4 md:p-6">
        <div class="max-w-[1600px] mx-auto space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div><div class="text-[10px] uppercase tracking-[.18em] font-black text-yellow-600">Prospection commerciale</div><h2 class="text-xl font-black text-slate-900 dark:text-white">Nouveaux prospects</h2><p class="text-xs text-slate-500 mt-1">Établissements actifs INSEE, hors clients et prospects déjà connus.</p></div>
            <div id="commercial-prospect-count" class="text-xs font-bold text-slate-500">Chargement…</div>
          </div>
          <div class="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl p-3 space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select id="cp-dept" class="top200-select !max-w-none !w-full"><option value="">Tous les départements</option></select>
              <select id="cp-activity" class="top200-select !max-w-none !w-full"><option value="">Toutes les activités</option></select>
              <select id="cp-workforce" class="top200-select !max-w-none !w-full"><option value="">Tous les effectifs</option><option value="1-9">1–9</option><option value="10-49">10–49</option><option value="50-249">50–249</option><option value="250+">250+</option></select>
              <input id="cp-search" class="top200-select !max-w-none !w-full normal-case" placeholder="Entreprise, SIREN, SIRET, commune…">
            </div>
            <details class="border-t border-gray-100 dark:border-slate-800 pt-2"><summary class="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">Filtres avancés</summary>
              <div class="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3">
                <select id="cp-city" class="top200-select !max-w-none"><option value="">Commune</option></select>
                <select id="cp-naf" class="top200-select !max-w-none"><option value="">Code NAF</option></select>
                <select id="cp-category" class="top200-select !max-w-none"><option value="">Catégorie</option></select>
                <select id="cp-age" class="top200-select !max-w-none"><option value="">Ancienneté</option><option value="lt2">&lt; 2 ans</option><option value="2-5">2–5 ans</option><option value="5-10">5–10 ans</option><option value="10+">10 ans+</option></select>
                <select id="cp-head" class="top200-select !max-w-none"><option value="">Tous établissements</option><option value="head">Siège uniquement</option><option value="secondary">Secondaire</option></select>
                <select id="cp-new" class="top200-select !max-w-none"><option value="">Toute nouveauté</option><option value="1">Aujourd’hui</option><option value="7">7 jours</option><option value="30">30 jours</option></select>
              </div>
            </details>
            <div class="flex justify-end"><select id="cp-sort" class="top200-select"><option value="recent">Plus récent</option><option value="workforce">Effectif décroissant</option><option value="name">Nom A–Z</option><option value="city">Commune</option></select></div>
          </div>
          <div class="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div class="overflow-auto"><table class="w-full text-xs"><thead class="bg-gray-50 dark:bg-slate-900 text-slate-500 uppercase"><tr><th class="text-left p-3">Entreprise</th><th class="text-left p-3">Activité</th><th class="text-left p-3">Commune</th><th class="text-left p-3">Effectif</th><th class="text-left p-3">SIRET</th><th class="p-3"></th></tr></thead><tbody id="cp-body"></tbody></table></div>
            <div id="cp-empty" class="hidden p-10 text-center text-sm text-slate-500"></div>
          </div>
        </div>
      </div>`;
  }

  function render() {
    const body = document.getElementById('cp-body');
    const empty = document.getElementById('cp-empty');
    const count = document.getElementById('commercial-prospect-count');
    if (!body) return;
    const rows = state.filtered;
    count.textContent = `${rows.length.toLocaleString('fr-FR')} prospect${rows.length > 1 ? 's' : ''}`;
    body.innerHTML = rows.slice(0, 500).map(p => `<tr class="border-t border-gray-100 dark:border-slate-800"><td class="p-3"><b>${esc(p.name)}</b><div class="text-slate-400">${esc(p.siren || '')}</div></td><td class="p-3">${esc(p.activityLabel || p.naf || '—')}</td><td class="p-3">${esc(p.city || '—')}<div class="text-slate-400">${esc(p.department || '')}</div></td><td class="p-3">${esc(p.workforceLabel || '—')}</td><td class="p-3 font-mono">${esc(p.siret || '—')}</td><td class="p-3 text-right"><button data-siret="${esc(p.siret)}" class="cp-add px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-black">Ajouter au portefeuille</button></td></tr>`).join('');
    empty.classList.toggle('hidden', rows.length > 0);
    empty.textContent = rows.length ? '' : 'Aucun nouveau prospect ne correspond aux filtres.';
  }

  function applyFilters() {
    const q = value('cp-search').toLowerCase(), dept=value('cp-dept'), activity=value('cp-activity'), city=value('cp-city'), naf=value('cp-naf'), category=value('cp-category');
    state.filtered = state.prospects.filter(p => (!dept || p.department===dept) && (!activity || p.activityGroup===activity) && (!city || p.city===city) && (!naf || p.naf===naf) && (!category || p.companyCategory===category) && (!q || [p.name,p.siren,p.siret,p.city].some(x=>String(x||'').toLowerCase().includes(q))));
    const sort=value('cp-sort');
    state.filtered.sort((a,b)=> sort==='name'?String(a.name||'').localeCompare(String(b.name||''),'fr'):sort==='city'?String(a.city||'').localeCompare(String(b.city||''),'fr'):Number(b.firstSeenAt||0)-Number(a.firstSeenAt||0));
    render();
  }

  function fillSelect(id, values) { const el=document.getElementById(id); if(!el)return; const first=el.options[0]?.outerHTML||'<option value="">Tous</option>'; el.innerHTML=first+[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fr')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(''); }

  async function loadProspects() {
    const empty=document.getElementById('cp-empty');
    try {
      const r=await fetch('/api/commercial/prospects',{credentials:'same-origin',cache:'no-store'}); const j=await r.json(); if(!r.ok)throw new Error(j.error||'Chargement impossible');
      state.prospects=Array.isArray(j.prospects)?j.prospects:[]; state.departments=Array.isArray(j.departments)?j.departments:[];
      fillSelect('cp-dept',state.departments); fillSelect('cp-activity',state.prospects.map(x=>x.activityGroup)); fillSelect('cp-city',state.prospects.map(x=>x.city)); fillSelect('cp-naf',state.prospects.map(x=>x.naf)); fillSelect('cp-category',state.prospects.map(x=>x.companyCategory)); applyFilters();
    } catch(e) { state.prospects=[];state.filtered=[];render();empty.classList.remove('hidden');empty.textContent=e.message; }
  }

  function activateCommercialTab(tab, view) {
    tab.textContent='Nouveaux prospects'; tab.title='Recherche de nouveaux prospects INSEE';
    tab.onclick=async()=>{ document.getElementById('view-table')?.classList.add('hidden');document.getElementById('view-map')?.classList.add('hidden');view.classList.remove('hidden');document.getElementById('top200-visit-controls')?.classList.add('hidden');document.getElementById('objectives-banner')?.classList.add('hidden'); if(!document.getElementById('commercial-prospects')){view.innerHTML=shell();['cp-dept','cp-activity','cp-workforce','cp-search','cp-city','cp-naf','cp-category','cp-age','cp-head','cp-new','cp-sort'].forEach(id=>document.getElementById(id)?.addEventListener(id==='cp-search'?'input':'change',applyFilters));await loadProspects();}};
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try { const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'}); if(!r.ok)return; const me=await r.json(); if(String(me.role||'').toUpperCase()!=='COMMERCIAL')return; const tab=document.getElementById('tab-top200'),view=document.getElementById('view-top200'); if(tab&&view)activateCommercialTab(tab,view); } catch(e) { console.error('Initialisation commerciale impossible.',e); }
  });
})();
