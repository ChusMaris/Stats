import React, { useEffect, useState } from 'react';
import { fetchDeletedCompetitions, restoreCompetition, hardDeleteCompetition } from '../services/dataService';
import { Competicion } from '../types';
import { supabase } from '../supabaseClient';
import { Loader2, RotateCcw, Trash2, ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';

interface TrashPageProps {
  isAdmin?: boolean;
}

const TrashPage: React.FC<TrashPageProps> = ({ isAdmin }) => {
  const [items, setItems] = useState<Competicion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDeletedCompetitions();
      setItems(data || []);
    } catch (e) {
      console.error('Error loading trash', e);
      alert('Error cargando la papelera');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDeletedAt = (value?: string | null) => {
    if (!value) return 'Fecha no disponible';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Papelera</h2>
              <p className="text-slate-600 mt-1">Acceso restringido. Activa el modo superuser con 5 clics en el logo.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleRestore = async (id: string | number) => {
    if (restoringId || purgingId) return;
    if (!confirm('Restaurar competición seleccionada?')) return;
    try {
      setRestoringId(String(id));
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      await restoreCompetition(id, currentUserId);
      await load();
      alert('Competición restaurada');
    } catch (e: any) {
      console.error(e);
      alert('Error restaurando competición: ' + (e.message || e));
    } finally {
      setRestoringId(null);
    }
  };

  const handlePurge = async (id: string | number) => {
    if (restoringId || purgingId) return;
    if (!confirm('Borrar permanentemente esta competición? Esta acción es irreversible.')) return;
    try {
      setPurgingId(String(id));
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      await hardDeleteCompetition(id, currentUserId);
      await load();
      alert('Competición purgada permanentemente');
    } catch (e: any) {
      console.error(e);
      alert('Error purgando competición: ' + (e.message || e));
    } finally {
      setPurgingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-6">
      <div className="mb-4 md:mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Papelera de competiciones</h2>
          <p className="text-slate-600 mt-1 text-sm md:text-base">Gestiona competiciones eliminadas: restaura o elimina definitivamente.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {items.length} elemento{items.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={load}
            disabled={loading || Boolean(restoringId || purgingId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-amber-800 text-xs md:text-sm flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>
          Purgar elimina datos de forma permanente. Restaurar recupera competición y datos relacionados marcados para borrado.
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                <Trash2 size={20} className="text-slate-500" />
              </div>
              <p className="font-bold text-slate-800">No hay competiciones en la papelera</p>
              <p className="text-slate-500 text-sm mt-1">Cuando elimines una competición, aparecerá aquí para restaurarla o purgarla.</p>
            </div>
          )}

          {items.map((c) => {
            const isRestoring = restoringId === String(c.id);
            const isPurging = purgingId === String(c.id);
            const isBusy = isRestoring || isPurging;

            return (
              <article key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-slate-900 truncate">{c.nombre}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                        Eliminado: {formatDeletedAt(c.deleted_at)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-lg border border-slate-200 text-slate-500 font-medium">
                        ID: {String(c.id)}
                      </span>
                    </div>

                    {isBusy && (
                      <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <Loader2 size={12} className="animate-spin" />
                        <span>{isRestoring ? 'Restaurando competición y datos relacionados...' : 'Purgando competición y datos relacionados...'}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(c.id)}
                      disabled={Boolean(restoringId || purgingId)}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 text-xs font-bold"
                    >
                      {isRestoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                      {isRestoring ? 'Restaurando...' : 'Restaurar'}
                    </button>
                    <button
                      onClick={() => handlePurge(c.id)}
                      disabled={Boolean(restoringId || purgingId)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 text-xs font-bold"
                    >
                      {isPurging ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      {isPurging ? 'Purgando...' : 'Purgar'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrashPage;
