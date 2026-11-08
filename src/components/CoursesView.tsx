import React, { useState } from 'react';
import { 
  GraduationCap, 
  ExternalLink, 
  Star, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Bookmark,
  Calendar,
  Layers
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';
import { Course } from '../types/internTrack';

export const CoursesView: React.FC = () => {
  const { 
    courses, 
    toggleCourseFavorite, 
    updateCourseStatus, 
    addCourse, 
    showToast 
  } = useInternTrack();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New course state
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('Coursera');
  const [newCategory, setNewCategory] = useState<Course['category']>('Business');
  const [newLevel, setNewLevel] = useState<Course['level']>('Intermedio');
  const [newDuration, setNewDuration] = useState('12 ore');
  const [newUrl, setNewUrl] = useState('');

  const filteredCourses = courses.filter(c => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'favorites') return c.favorite;
    return c.category === filterCategory;
  });

  const activeCourses = filteredCourses.filter(c => c.status !== 'Completato');
  const completedCourses = filteredCourses.filter(c => c.status === 'Completato');

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addCourse({
      title: newTitle.trim(),
      platform: newPlatform,
      category: newCategory,
      level: newLevel,
      duration: newDuration,
      status: 'In corso',
      favorite: false,
      url: newUrl.trim() || undefined,
      remind: '2026-11-05',
    });
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewUrl('');
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: 300 }}>
            Corsi & Competenze
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Programma di studio mirato per Founder Associate, Growth & Venture Building
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuovo corso</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CATEGORY FILTER CHIPS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full font-medium transition-all ${
            filterCategory === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-white/70'
          }`}
        >
          Tutti ({courses.length})
        </button>
        <button
          onClick={() => setFilterCategory('favorites')}
          className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1 ${
            filterCategory === 'favorites'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-white/70'
          }`}
        >
          <Star className="w-3 h-3 fill-current" />
          <span>Preferiti ({courses.filter(c => c.favorite).length})</span>
        </button>
        {['Excel', 'Dati', 'Business', 'AI'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full font-medium transition-all ${
              filterCategory === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-white/70'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CORSI IN CORSO
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          In corso e da iniziare ({activeCourses.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeCourses.map(course => (
            <div
              key={course.id}
              className="p-5 rounded-[28px] bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                    {course.category} · {course.level}
                  </span>
                  <button
                    onClick={() => toggleCourseFavorite(course.id)}
                    className="text-slate-300 hover:text-amber-500"
                  >
                    <Star className={`w-4 h-4 ${course.favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                  {course.title}
                </h3>

                <p className="text-xs text-slate-500 mb-2 font-medium">
                  {course.platform} · {course.duration}
                </p>

                {course.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl mb-3">
                    {course.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-slate-400">
                  {course.remind ? `Promemoria: ${course.remind.slice(5)}` : course.status}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateCourseStatus(course.id, 'Completato')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-medium text-[11px]"
                  >
                    Segna completato
                  </button>
                  {course.url && (
                    <a href={course.url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-blue-500">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CORSI COMPLETATI
          ───────────────────────────────────────────────────────────── */}
      {completedCourses.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Certificati e completati ({completedCourses.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedCourses.map(course => (
              <div
                key={course.id}
                className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs flex items-center justify-between text-xs opacity-85"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{course.title}</h4>
                    <p className="text-[11px] text-slate-500">{course.platform} · {course.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateCourseStatus(course.id, 'In corso')}
                  className="text-xs text-slate-400 hover:text-blue-500"
                >
                  Riapri
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nuovo Corso */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Aggiungi nuovo corso
            </h3>
            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Titolo corso *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Venture Capital Analyst & Deal Sourcing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Piattaforma</label>
                  <input
                    type="text"
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                  >
                    <option value="Business">Business</option>
                    <option value="Excel">Excel / Modellazione</option>
                    <option value="Dati">Dati / Python</option>
                    <option value="AI">AI</option>
                    <option value="Soft skills">Soft skills</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium"
                >
                  Salva corso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
