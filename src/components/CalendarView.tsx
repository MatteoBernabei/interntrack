import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  Check, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

export const CalendarView: React.FC = () => {
  const { 
    applications, 
    careerSites, 
    courses, 
    setSelectedAppId,
    settings,
    updateSettings,
    showToast
  } = useInternTrack();

  const [calendarMode, setCalendarMode] = useState<'mese' | 'settimana'>('mese');
  const [currentMonth, setCurrentMonth] = useState('Ottobre 2026');

  // Quick new task modal
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDate, setQuickTaskDate] = useState('2026-10-28');

  // Aggregate all events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Array<{ type: 'interview' | 'deadline' | 'site' | 'course'; title: string; subtitle: string; time?: string; appId?: string; color: string }>> = {};

    const addEvt = (d: string, item: any) => {
      if (!map[d]) map[d] = [];
      map[d].push(item);
    };

    // 1. Interviews
    applications.forEach(app => {
      app.interviews.forEach(inv => {
        if (inv.date) {
          addEvt(inv.date, {
            type: 'interview',
            title: `Colloquio ${app.company}`,
            subtitle: `${inv.kind} · ${inv.topic || 'Incontro'}`,
            time: inv.time || '15:00',
            appId: app.id,
            color: 'bg-orange-500 text-white'
          });
        }
      });

      // 2. Deadlines
      if (app.deadline) {
        addEvt(app.deadline, {
          type: 'deadline',
          title: `Scadenza: ${app.company}`,
          subtitle: `${app.role}`,
          appId: app.id,
          color: 'bg-red-500 text-white'
        });
      }
    });

    // 3. Career Sites check
    careerSites.forEach(site => {
      if (site.next) {
        addEvt(site.next, {
          type: 'site',
          title: `Sito: ${site.company}`,
          subtitle: `Controllo periodico`,
          color: 'bg-blue-600 text-white'
        });
      }
    });

    // 4. Courses reminder
    courses.forEach(c => {
      if (c.remind) {
        addEvt(c.remind, {
          type: 'course',
          title: `Studio: ${c.title}`,
          subtitle: c.platform,
          color: 'bg-indigo-600 text-white'
        });
      }
    });

    return map;
  }, [applications, careerSites, courses]);

  // Days matrix for October 2026 (Starts on Thursday, Oct 1)
  const calendarDays = useMemo(() => {
    const days = [];
    // 3 empty slots for Mon-Wed (Sep 28-30)
    for (let i = 28; i <= 30; i++) {
      days.push({ dayNumber: i, dateStr: `2026-09-${i}`, isCurrentMonth: false });
    }
    // 31 days in October 2026
    for (let i = 1; i <= 31; i++) {
      const dStr = `2026-10-${String(i).padStart(2, '0')}`;
      days.push({ 
        dayNumber: i, 
        dateStr: dStr, 
        isCurrentMonth: true,
        isToday: dStr === '2026-10-28'
      });
    }
    // 4 days of November to fill 5 rows (35 slots)
    for (let i = 1; i <= 4; i++) {
      days.push({ dayNumber: i, dateStr: `2026-11-0${i}`, isCurrentMonth: false });
    }
    return days;
  }, []);

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle) return;
    showToast(`Attività "${quickTaskTitle}" aggiunta per il ${quickTaskDate}`, 'success');
    setQuickTaskTitle('');
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: 300 }}>
            Calendario & Scadenze
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Colloqui, scadenze candidature e impegni in sola lettura
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="p-1 rounded-full bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border border-white/60 dark:border-white/10 flex items-center shadow-xs">
            <button
              onClick={() => setCalendarMode('mese')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                calendarMode === 'mese' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mese
            </button>
            <button
              onClick={() => setCalendarMode('settimana')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                calendarMode === 'settimana' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Settimana
            </button>
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <button className="p-1 hover:text-blue-500"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <span>{currentMonth}</span>
            <button className="p-1 hover:text-blue-500"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. GOOGLE CALENDAR OVERLAY BAR (READ-ONLY TOGGLE)
          ───────────────────────────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Google Calendar (account sincronizzato):
          </span>
          <span className="text-slate-500">
            {settings.showGoogleCalendar ? '3 impegni accademici e personali sincronizzati in sola lettura' : 'Non visualizzato'}
          </span>
        </div>

        <button
          onClick={() => updateSettings({ showGoogleCalendar: !settings.showGoogleCalendar })}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            settings.showGoogleCalendar 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
              : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
          }`}
        >
          {settings.showGoogleCalendar ? 'Sincronizzazione attiva' : 'Mostra impegni'}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CALENDAR GRID
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-[28px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.06)] overflow-hidden p-4 sm:p-6">
        
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 text-center text-xs font-mono font-semibold text-slate-400">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mer</div>
          <div>Gio</div>
          <div>Ven</div>
          <div>Sab</div>
          <div>Dom</div>
        </div>

        {/* Calendar Day Slots */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((slot, idx) => {
            const evts = eventsByDate[slot.dateStr] || [];
            return (
              <div
                key={idx}
                className={`min-h-[105px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                  slot.isCurrentMonth
                    ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                    : 'bg-transparent border-transparent opacity-30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono ${
                      slot.isToday
                        ? 'w-6 h-6 rounded-full bg-red-500 text-white font-bold flex items-center justify-center shadow-xs'
                        : slot.isCurrentMonth
                        ? 'font-medium text-slate-700 dark:text-slate-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {slot.dayNumber}
                  </span>
                  {evts.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {evts.length}
                    </span>
                  )}
                </div>

                {/* Event Pills inside Day */}
                <div className="space-y-1 overflow-hidden">
                  {evts.slice(0, 2).map((ev, i) => (
                    <div
                      key={i}
                      onClick={() => { if (ev.appId) setSelectedAppId(ev.appId); }}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-medium truncate cursor-pointer transition-all hover:scale-[1.02] ${ev.color}`}
                      title={`${ev.title} - ${ev.subtitle}`}
                    >
                      {ev.time ? `${ev.time} ` : ''}{ev.title}
                    </div>
                  ))}
                  {evts.length > 2 && (
                    <span className="text-[10px] text-slate-400 font-medium block text-center">
                      +{evts.length - 2} altri
                    </span>
                  )}
                </div>

                {/* Empty placeholder */}
                {evts.length === 0 && <div className="h-4" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. QUICK ADD TASK ROW
          ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs">
        <form onSubmit={handleAddQuickTask} className="flex flex-col sm:flex-row items-center gap-3 text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
            Aggiungi promemoria rapido:
          </span>
          <input
            type="text"
            required
            placeholder="Es. Inviare aggiornamento a Giulia (Bending Spoons)"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            className="flex-1 w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          <input
            type="date"
            value={quickTaskDate}
            onChange={(e) => setQuickTaskDate(e.target.value)}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shrink-0"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0"
          >
            Aggiungi al calendario
          </button>
        </form>
      </div>

    </div>
  );
};
