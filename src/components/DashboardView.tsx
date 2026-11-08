import React, { useMemo } from 'react';
import { 
  Plus, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Paperclip, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';
import { CompanyLogo } from './CompanyLogo';

export const DashboardView: React.FC = () => {
  const {
    applications,
    setActiveScreen,
    setSelectedAppId,
    setIsNewAppModalOpen,
    setIsPostaModalOpen,
    completedTaskIds,
    toggleTaskCompleted
  } = useInternTrack();

  // Active applications
  const activeApps = useMemo(() => {
    return applications.filter(a => a.status !== 'Rifiutato');
  }, [applications]);

  // Urgent counts
  const urgentCount = useMemo(() => {
    return applications.filter(a => (a.status === 'Candidato' && !a.followDone) || (a.status === 'Da candidarmi' && a.deadline)).length;
  }, [applications]);

  // Role Breakdown
  const roleBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      'Founder Associate': 0,
      'Growth / Strategy': 0,
      'Business Dev': 0,
      'Operations': 0
    };
    applications.forEach(a => {
      const r = a.role.toLowerCase();
      if (r.includes('founder') || r.includes('chief of staff')) counts['Founder Associate']++;
      else if (r.includes('growth') || r.includes('strategy')) counts['Growth / Strategy']++;
      else if (r.includes('business') || r.includes('sales')) counts['Business Dev']++;
      else counts['Operations']++;
    });
    return counts;
  }, [applications]);

  // Country counts
  const countryStats = useMemo(() => {
    return [
      { country: 'Italia (Milano/Roma)', count: applications.filter(a => a.country === 'IT').length, trend: '+16,7%', isUp: true },
      { country: 'Germania (Monaco/Berlino)', count: applications.filter(a => a.country === 'DE').length, trend: '+3,23%', isUp: true },
      { country: 'Regno Unito & Remoto', count: applications.filter(a => a.country === 'UK' || a.workMode === 'Remoto').length, trend: '-5,44%', isUp: false },
    ];
  }, [applications]);

  // Calendar meetings (Interviews from applications)
  const upcomingMeetings = useMemo(() => {
    const list: { day: string; time: string; title: string; color: string; duration: string; appId: string }[] = [];
    applications.forEach(app => {
      app.interviews.forEach((inv, idx) => {
        if (!inv.done) {
          list.push({
            day: inv.date ? `DATA: ${inv.date.slice(5)}` : 'OGGI',
            time: inv.time || '15:00',
            title: `${app.company} · ${inv.kind}`,
            color: idx % 3 === 0 ? 'bg-emerald-500' : idx % 3 === 1 ? 'bg-[#1890ff]' : 'bg-amber-500',
            duration: `${inv.time || '15:00'} - 16:00`,
            appId: app.id
          });
        }
      });
    });

    if (list.length === 0) {
      list.push(
        { day: 'LUN 30', time: '10:00', title: 'TechScale · Screening HR', color: 'bg-emerald-500', duration: '10:00 - 10:45', appId: applications[0]?.id || '' },
        { day: 'LUN 30', time: '14:30', title: 'FinFlow · Case Study Case', color: 'bg-[#1890ff]', duration: '14:30 - 15:30', appId: applications[1]?.id || '' },
        { day: 'MAR 31', time: '16:00', title: 'VentureLab · Founder Interview', color: 'bg-amber-500', duration: '16:00 - 17:00', appId: applications[2]?.id || '' }
      );
    }
    return list;
  }, [applications]);

  // Tasks list
  const tasksList = [
    { id: 't1', title: 'Inviare follow-up per Scaleup Milano', date: 'Oggi', color: 'bg-[#1890ff]' },
    { id: 't2', title: 'Completare pitch per Founder Associate', date: 'Domani', color: 'bg-emerald-500' },
    { id: 't3', title: 'Revisionare case study su Growth Funnel', date: '30 Ott', color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          MAIN GRID: Center Area (2/3 width) + Right Rail (1/3 width)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT / CENTER CONTENT AREA (8 Cols on xl) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Top Row of 3 Stat Cards (Identical to reference screenshot) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Greeting & Active Cases */}
            <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#1890ff] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                AR
              </div>
              <div className="mt-4">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Ciao Alex
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {urgentCount} candidature richiedono attenzione
                </p>
              </div>
            </div>

            {/* Card 2: New Cases + Sparkline (Green Upward Curve) */}
            <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                    Candidature Attive
                  </span>
                  <div className="text-3xl font-bold text-slate-900 mt-1">
                    {activeApps.length}
                  </div>
                </div>
                {/* Smooth Green SVG Sparkline */}
                <div className="w-20 h-10">
                  <svg viewBox="0 0 80 40" fill="none" className="w-full h-full text-emerald-500">
                    <path
                      d="M2 30 C 20 28, 25 15, 45 18 C 60 20, 68 5, 78 4"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-50">
                <span className="text-slate-400 text-[11px]">Rispetto al mese scorso</span>
                <span className="font-bold text-emerald-600 text-xs">+14,88%</span>
              </div>
            </div>

            {/* Card 3: New Tasks + Sparkline (Red Wave Curve) */}
            <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                    Colloqui & Task
                  </span>
                  <div className="text-3xl font-bold text-slate-900 mt-1">
                    {upcomingMeetings.length + tasksList.length}
                  </div>
                </div>
                {/* Smooth Red SVG Sparkline */}
                <div className="w-20 h-10">
                  <svg viewBox="0 0 80 40" fill="none" className="w-full h-full text-[#ff4d4f]">
                    <path
                      d="M2 20 C 15 25, 25 10, 40 22 C 55 32, 65 8, 78 12"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-50">
                <span className="text-slate-400 text-[11px]">In scadenza questa settimana</span>
                <span className="font-bold text-[#ff4d4f] text-xs">-5,67%</span>
              </div>
            </div>

          </div>

          {/* Section 2: LIST OF CASES TO BE ACCEPTED (Main Table Card) */}
          <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">
                Candidature in Pipeline
              </h3>
              <button
                onClick={() => setActiveScreen('tracker')}
                className="text-xs font-semibold text-slate-400 hover:text-[#1890ff] flex items-center gap-1 transition-colors"
              >
                <span>Full list</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table identical to screenshot */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 text-[11px] font-mono">
                    <th className="py-2.5 px-3 w-8">
                      <input type="checkbox" className="rounded text-[#1890ff] focus:ring-0" />
                    </th>
                    <th className="py-2.5 px-3 font-medium">Name</th>
                    <th className="py-2.5 px-3 font-medium">Dates</th>
                    <th className="py-2.5 px-3 font-medium">Priority</th>
                    <th className="py-2.5 px-3 font-medium">Attachment</th>
                    <th className="py-2.5 px-3 font-medium text-right">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {activeApps.slice(0, 5).map((app, idx) => {
                    const isLow = app.priority === 'Bassa';
                    const isMedium = app.priority === 'Media';
                    const isHigh = app.priority === 'Alta';

                    return (
                      <tr 
                        key={app.id} 
                        onClick={() => setSelectedAppId(app.id)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded text-[#1890ff] focus:ring-0" />
                        </td>
                        
                        {/* Name (Company & Role) */}
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <CompanyLogo company={app.company} domain={app.companyDomain} url={app.url} platform={app.platform} size="xs" />
                            <div>
                              <div className="font-bold text-slate-900 hover:text-[#1890ff] transition-colors">{app.company}</div>
                              <div className="text-[11px] text-slate-400 font-normal">{app.role}</div>
                            </div>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {app.appliedAt || 'May 18, 2026 - May 25, 2026'}
                        </td>

                        {/* Priority (Outlined rounded pills like Low, Medium, High in reference) */}
                        <td className="py-3 px-3">
                          <span className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isHigh ? 'border-rose-300 text-rose-600 bg-rose-50/40' :
                            isMedium ? 'border-blue-300 text-blue-600 bg-blue-50/40' :
                            'border-emerald-300 text-emerald-600 bg-emerald-50/40'
                          }`}>
                            {app.priority}
                          </span>
                        </td>

                        {/* Attachment */}
                        <td className="py-3 px-3 text-slate-500">
                          <span className="flex items-center gap-1.5 text-[11px] hover:text-[#1890ff]">
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            <span>Requirements.doc</span>
                          </span>
                        </td>

                        {/* Assignee / Recruiter Avatar */}
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex w-6 h-6 rounded-full bg-purple-500 text-white font-bold text-[9px] items-center justify-center shadow-xs">
                            {app.company.slice(0, 2).toUpperCase()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Section 3: COMMUNICATION (Last 7 days) */}
          <div className="p-6 rounded-3xl bg-white shadow-[0_4px_20px_rgba(20,60,120,0.03)] border border-blue-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">
                Communication (Last 7 days)
              </h3>
              <button
                onClick={() => setIsPostaModalOpen(true)}
                className="text-xs font-semibold text-slate-400 hover:text-[#1890ff] flex items-center gap-1 transition-colors"
              >
                <span>See all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mark Wahlberg · Hiring Lead</h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    Abbiamo visionato il tuo profilo per il ruolo di Founder Associate e vorremmo fissare una prima call conoscitiva.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">2 days ago</span>
                  <span className="w-2 h-2 rounded-full bg-[#ff4d4f]" />
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Leonardo DiCaprio · Head of Talent</h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    Grazie per l'invio della candidatura. Il tuo background in Growth risponde perfettamente alle nostre esigenze.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">5 days ago</span>
                  <span className="w-2 h-2 rounded-full bg-[#ff4d4f]" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Bottom 2 Widgets (Breakdown & Country cases) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Case Type Breakdown (with colored dots and counts) */}
            <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">
                  Distribuzione Ruoli
                </h4>
                <span className="text-xs font-semibold text-slate-400 hover:text-[#1890ff] cursor-pointer">
                  Full Report &gt;
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1890ff]" />
                    Founder Associate
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{roleBreakdown['Founder Associate']}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff4d4f]" />
                    Growth / Strategy
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{roleBreakdown['Growth / Strategy']}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Business Development
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{roleBreakdown['Business Dev']}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Operations / Altro
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{roleBreakdown['Operations']}</span>
                </div>
              </div>
            </div>

            {/* Number of Cases (Per Country) */}
            <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">
                  Candidature per Sede
                </h4>
                <span className="text-xs font-semibold text-slate-400 hover:text-[#1890ff] cursor-pointer">
                  See all &gt;
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                {countryStats.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-slate-700 font-medium">{item.country}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">{item.count}</span>
                      <span className={`text-[11px] font-mono flex items-center font-bold ${
                        item.isUp ? 'text-emerald-600' : 'text-[#ff4d4f]'
                      }`}>
                        {item.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {item.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT RAIL (4 Cols on xl, exactly matching reference screenshot) */}
        <div className="xl:col-span-4 space-y-5">
          
          {/* Card 1: MY CALENDAR with Blue circular + button */}
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">
                My Calendar
              </h3>
              <button
                onClick={() => setActiveScreen('calendar')}
                className="w-6 h-6 rounded-full bg-[#1890ff] hover:bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-90"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-3">
              {upcomingMeetings.map((meeting, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono block">
                    {meeting.day}
                  </span>
                  <div 
                    onClick={() => meeting.appId && setSelectedAppId(meeting.appId)}
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/60 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-mono text-slate-500 font-semibold w-10">
                      {meeting.time}
                    </span>
                    <span className={`w-1 h-8 rounded-full ${meeting.color}`} />
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{meeting.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{meeting.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: LIST OF MY TASKS with Blue circular + button */}
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">
                List of My Tasks
              </h3>
              <button
                onClick={() => setIsNewAppModalOpen(true)}
                className="w-6 h-6 rounded-full bg-[#1890ff] hover:bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-90"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-2.5">
              {tasksList.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 text-xs p-1.5 rounded-xl hover:bg-white/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${task.color}`} />
                    <span className="font-semibold text-slate-800 truncate">{task.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">{task.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: TASK ASSIGNED TO OTHERS (Follow-up & Recruiter) */}
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(20,60,120,0.05),0_1px_2px_rgba(255,255,255,0.9)_inset] border border-white/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">
                Follow-up In Sospeso
              </h3>
              <button
                onClick={() => setIsPostaModalOpen(true)}
                className="w-6 h-6 rounded-full bg-[#1890ff] hover:bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-90"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-xs p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-[#ff4d4f]" />
                  <span className="font-semibold text-slate-800 truncate">Feedback colloquio tecnico</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">In attesa</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
                  <span className="font-semibold text-slate-800 truncate">Riscontro referral LinkedIn</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">Domani</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
