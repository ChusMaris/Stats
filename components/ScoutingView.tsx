
import React, { useState, useEffect } from 'react';
import CalendarView from './CalendarView';
import CalendarAdmin from './CalendarAdmin';
import { CalendarDays, Settings2 } from 'lucide-react';
import { Competicion } from '../types';

interface ScoutingViewProps {
    viewData: {
      matches: any[],
      realMatches: any[],
      equipos: any[],
      competicion: Competicion | null
    };
    selectedCompeticionId: string;
    onMatchAdded: () => void;
    isAdmin: boolean;
}

const ScoutingView: React.FC<ScoutingViewProps> = ({ viewData, selectedCompeticionId, onMatchAdded, isAdmin }) => {
  const [subTab, setSubTab] = useState<'calendar' | 'admin'>('calendar');

  // If user is not admin but somehow on 'admin' tab (e.g. toggled off), reset to calendar
  useEffect(() => {
    if (!isAdmin && subTab === 'admin') {
        setSubTab('calendar');
    }
  }, [isAdmin, subTab]);

  return (
    <div className="animate-fade-in">
        {/* Only show the Tab Switcher if ADMIN is active. 
            If not admin, the user just sees the Calendar (Scouting) view directly. */}
        {isAdmin && (
            <div className="flex justify-center mb-6">
                <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                    <button 
                        onClick={() => setSubTab('calendar')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${subTab === 'calendar' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CalendarDays size={18} />
                        Scouting & Calendario
                    </button>
                    
                    <button 
                        onClick={() => setSubTab('admin')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${subTab === 'admin' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Settings2 size={18} />
                        Gestión de Partidos
                    </button>
                </div>
            </div>
        )}

        {subTab === 'calendar' && (
             <CalendarView 
                matches={viewData.matches} 
                competicionId={viewData.competicion?.id || selectedCompeticionId}
                equipos={viewData.equipos}
            />
        )}

        {subTab === 'admin' && isAdmin && (
            <CalendarAdmin 
                equipos={viewData.equipos} 
                competicionId={viewData.competicion?.id || selectedCompeticionId} 
                matches={viewData.matches}
                onMatchAdded={onMatchAdded}
            />
        )}
    </div>
  );
};

export default ScoutingView;
