import React from 'react';
import { formatDay, toISODate, type PlanSession, type SearchPlan } from '../searchPlan';

export type RicProgress = Record<string, { done?: boolean; found?: Record<string, number>; off?: Record<string, boolean> }>;

interface Props {
  active: boolean;
  plan: SearchPlan;
  progress: RicProgress;
  setProgress: React.Dispatch<React.SetStateAction<RicProgress>>;
  mode: 'day' | 'all';
  setMode: (m: 'day' | 'all') => void;
  day: string | null;
  setDay: (d: string | null) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  countryFilter: string;
  setCountryFilter: (v: string) => void;
  positions: Array<{ id: string; name: string }>;
  countries: Array<{ key: string; label: string }>;
  onAddApplication: () => void;
  onOpenSettings: () => void;
  showToast: (m: string) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function SearchPlanView(p: Props) {
  const { plan, progress, setProgress } = p;
  const today = toISODate(new Date());
  const byDate = new Map(plan.days.map((d) => [d.date, d]));
  const upcoming = plan.days.find((d) => d.date >= today);
  const shownDate = p.day || (byDate.has(today) ? today : upcoming?.date || null);
  const shown = shownDate ? byDate.get(shownDate) : undefined;
  const isToday = shownDate === today;

  const matches = (s: PlanSession) =>
    (p.roleFilter === 'all' || s.positionId === p.roleFilter) && (p.countryFilter === 'all' || s.countryKey === p.countryFilter);
  const sessions = (shown?.sessions || []).filter(matches);
  const remaining = sessions.filter((s) => !progress[s.id]?.done).length;
  const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

  const toggleDone = (s: PlanSession) => {
    const was = !!progress[s.id]?.done;
    setProgress((prev) => ({ ...prev, [s.id]: { ...prev[s.id], done: !was } }));
    p.showToast(was ? 'Sessione riaperta' : `✓ Sessione completata: ${s.positionName} · ${s.countryLabel}`);
  };
  const setFound = (s: PlanSession, platformId: string, n: number) =>
    setProgress((prev) => ({ ...prev, [s.id]: { ...prev[s.id], found: { ...(prev[s.id]?.found || {}), [platformId]: n } } }));
  const setOff = (s: PlanSession, platformId: string, off: boolean) =>
    setProgress((prev) => ({ ...prev, [s.id]: { ...prev[s.id], off: { ...(prev[s.id]?.off || {}), [platformId]: off } } }));

  const filters = (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', marginBottom: '14px', alignItems: 'center' }}>
      <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>Filtra sessioni:</span>
      <select value={p.roleFilter} onChange={(e) => p.setRoleFilter(e.target.value)} style={{ height: '30px', borderRadius: '10px', fontSize: '12px', padding: '0 8px' }} aria-label="Filtra per ruolo">
        <option value="all">Tutti i ruoli</option>
        {p.positions.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <select value={p.countryFilter} onChange={(e) => p.setCountryFilter(e.target.value)} style={{ height: '30px', borderRadius: '10px', fontSize: '12px', padding: '0 8px' }} aria-label="Filtra per paese">
        <option value="all">Tutti i paesi</option>
        {p.countries.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  let body: React.ReactNode;
  if (plan.total === 0) {
    body = (
      <div style={{ padding: '18px 4px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
        Il piano non contiene sessioni. Controlla in <b>Impostazioni → Profilo di ricerca</b> che ci siano almeno un ruolo e una città attivi, e che il periodo del piano e i giorni operativi siano validi.
        <div style={{ marginTop: '12px' }}>
          <button className="btn pri sm" onClick={p.onOpenSettings}>Apri il profilo di ricerca</button>
        </div>
      </div>
    );
  } else if (p.mode === 'all') {
    body = (
      <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {plan.days.map((d) => {
          const list = d.sessions.filter(matches);
          if (list.length === 0) return null;
          const done = list.filter((s) => progress[s.id]?.done).length;
          return (
            <div key={d.date} className="sbox" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', opacity: d.date < today ? 0.7 : 1 }}>
              <div style={{ minWidth: '150px' }}>
                <b>{cap(formatDay(d.date))}</b>
                {d.date === today && <span className="st applied" style={{ marginLeft: '8px' }}>Oggi</span>}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {list.length} {list.length === 1 ? 'sessione' : 'sessioni'} · ~{list.reduce((s, x) => s + x.minutes, 0)} min · {done}/{list.length} fatte
              </span>
              <span className="sp"></span>
              <button className="btn sm" onClick={() => { p.setDay(d.date); p.setMode('day'); }}>Apri giornata</button>
            </div>
          );
        })}
      </div>
    );
  } else if (!shown) {
    body = <div style={{ padding: '18px 4px', fontSize: '13px', color: 'var(--muted)' }}>Il piano è terminato: nessuna giornata successiva a oggi. Allunga il periodo in Impostazioni → Profilo di ricerca.</div>;
  } else {
    body = (
      <>
        {!isToday && !p.day && (
          <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>Oggi non è un giorno operativo: ecco la prossima giornata di ricerca.</div>
        )}
        {filters}
        {sessions.length === 0 && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Nessuna sessione corrisponde ai filtri scelti.</div>}
        <div className="ses">
          {sessions.map((s) => {
            const st = progress[s.id] || {};
            return (
              <div key={s.id} className="sbox" style={{ opacity: st.done ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                  <h4>
                    {s.positionName} · {s.countryLabel} <span className="ex">~{s.minutes} min</span>
                  </h4>
                  {st.done && <span className="st applied">✓ Completata</span>}
                </div>
                <p>
                  {s.cities.slice(0, 6).join(', ')}
                  {s.cities.length > 6 ? ` e altre ${s.cities.length - 6}` : ''}
                </p>
                <code>{s.query}</code>
                {s.localTerms && <p style={{ marginTop: '6px' }}>Termini locali: {s.localTerms}</p>}
                <div style={{ marginTop: '10px' }}>
                  {s.platforms.length === 0 && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Nessuna piattaforma attiva per questo paese.</span>}
                  {s.platforms.map((pl) => (
                    <label className="plr" key={pl.id}>
                      <input type="checkbox" checked={!st.off?.[pl.id]} onChange={(e) => setOff(s, pl.id, !e.target.checked)} />
                      <b style={{ minWidth: '80px' }}>{pl.name}</b>
                      <span style={{ color: 'var(--muted)' }}>{pl.minutes} min</span>
                      <span className="sp"></span>
                      <input
                        type="number"
                        min={0}
                        value={st.found?.[pl.id] ?? 0}
                        onChange={(e) => setFound(s, pl.id, Math.max(0, Number(e.target.value) || 0))}
                        aria-label={`Posizioni trovate su ${pl.name}`}
                      />
                      <button className="btn sm" onClick={() => window.open(pl.url, '_blank')}>Apri ricerca</button>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button className="btn pri sm" onClick={() => toggleDone(s)}>{st.done ? 'Annulla completamento' : '✓ Fatta'}</button>
                  <button className="btn sm" onClick={p.onAddApplication}>+ Aggiungi al Tracker</button>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <section className={`view ${p.active ? 'on' : ''}`} id="v-ric" aria-label="Piano di ricerca">
      <article className="card">
        <div className="hd" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0 }}>
              Piano di ricerca · {p.mode === 'all' ? 'tutte le sessioni' : isToday ? 'oggi' : shownDate ? formatDay(shownDate) : ''}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Generato dal tuo profilo di ricerca: ruoli, paesi, piattaforme e minuti al giorno. Il progresso si salva da solo.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {(p.mode === 'all' ? plan.total > 0 : sessions.length > 0) && (
              <span className="count">
                {p.mode === 'all'
                  ? `${plan.total} sessioni in ${plan.days.length} giornate`
                  : `${remaining} da fare su ${sessions.length} · ~${minutes} min`}
              </span>
            )}
            <button className="btn sm" onClick={p.onOpenSettings}>Modifica piano</button>
            <button className="btn pri sm" onClick={p.onAddApplication}>+ Nuova candidatura</button>
          </div>
        </div>
        {plan.total > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button className={`fchip ${p.mode === 'day' ? 'active' : ''}`} onClick={() => { p.setMode('day'); p.setDay(null); }}>
              {isToday || !p.day ? 'Oggi' : 'Giornata'}
            </button>
            <button className={`fchip ${p.mode === 'all' ? 'active' : ''}`} onClick={() => p.setMode('all')}>
              Tutte le sessioni ({plan.total})
            </button>
          </div>
        )}
        {p.mode === 'all' && plan.total > 0 && filters}
        {body}
      </article>
    </section>
  );
}
