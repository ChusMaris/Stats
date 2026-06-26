import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Loader2, 
  History, 
  Users, 
  Shield, 
  BarChart3, 
  CalendarDays, 
  ChevronRight, 
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Target
} from 'lucide-react';
import { Categoria, Competicion, RecentCompetition, Temporada, GlobalPlayerRow, GlobalTeamRow } from '../types';
import CompetitionFilterForm from './CompetitionFilterForm';
import { fetchGlobalPlayers, fetchGlobalTeams, fetchCompeticionesByIds } from '../services/dataService';

interface LandingPageProps {
  temporadas: Temporada[];
  categorias: Categoria[];
  competiciones: Competicion[];
  loadingCompetitions: boolean;
  selectedTemporada: string;
  selectedCategoria: string;
  selectedFase: string;
  selectedCompeticion: string;
  onTemporadaChange: (val: string) => void;
  onCategoriaChange: (val: string) => void;
  onFaseChange: (val: string) => void;
  onCompeticionChange: (val: string) => void;
  recentSearches: RecentCompetition[];
  onOpenRecent: (item: RecentCompetition) => void;
  hasActiveCompetition: boolean;
}

const inferCompetitionPhase = (competitionName: string) => {
  const normalized = (competitionName || '').toLowerCase();
  if (normalized.includes('tercera fase')) return 'Tercera Fase';
  if (normalized.includes('segona fase') || normalized.includes('segunda fase')) return 'Segona Fase';
  if (normalized.includes('primera fase')) return 'Primera Fase';
  return 'Sin fase';
};

const LandingPage: React.FC<LandingPageProps> = ({
  temporadas,
  categorias,
  competiciones,
  loadingCompetitions,
  selectedTemporada,
  selectedCategoria,
  selectedFase,
  selectedCompeticion,
  onTemporadaChange,
  onCategoriaChange,
  onFaseChange,
  onCompeticionChange,
  recentSearches,
  onOpenRecent,
}) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);

  // Search overlay state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  
  // Track user-saved search queries for dynamic suggestions
  const [userQueries, setUserQueries] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('fedstats_user_queries_v1');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save query to localStorage history and update state
  const saveSearchQueryToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const stored = localStorage.getItem('fedstats_user_queries_v1');
      let queries: string[] = stored ? JSON.parse(stored) : [];
      
      // Move to front if exists
      queries = queries.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      queries.unshift(trimmed);
      
      // Keep up to 10 items
      const updated = queries.slice(0, 10);
      localStorage.setItem('fedstats_user_queries_v1', JSON.stringify(updated));
      setUserQueries(updated);
    } catch (e) {
      console.error('Error saving search query:', e);
    }
  };

  // Build highly realistic, dynamic suggestions based on real DB values (competiciones, categorias) & user search history
  const dynamicSuggestions = useMemo(() => {
    if (userQueries.length > 0) {
      return userQueries.slice(0, 6);
    }

    // Default high-quality dynamic suggestions from real DB data
    const suggestions: string[] = [];

    // Add up to 2 categories if available
    if (categorias && categorias.length > 0) {
      categorias.slice(0, 2).forEach(c => {
        if (c.nombre) suggestions.push(c.nombre);
      });
    }

    // Add up to 2 competitions if available
    if (competiciones && competiciones.length > 0) {
      competiciones.slice(0, 2).forEach(comp => {
        if (comp.nombre) suggestions.push(comp.nombre);
      });
    }

    // Fill in standard highly realistic defaults
    const defaults = ['Sènior A', 'FC Barcelona', 'Joventut', 'Cadet', 'Copa Catalunya'];
    for (const d of defaults) {
      if (suggestions.length < 6 && !suggestions.includes(d)) {
        suggestions.push(d);
      }
    }

    return suggestions.slice(0, 6);
  }, [userQueries, categorias, competiciones]);

  // Grouped search results
  const [searchResults, setSearchResults] = useState<{
    players: GlobalPlayerRow[];
    teams: GlobalTeamRow[];
    competitions: Competicion[];
  }>({
    players: [],
    teams: [],
    competitions: [],
  });

  // Handle outside clicks for overlay/dropdown
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Debounced real-time predictive search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults({ players: [], teams: [], competitions: [] });
      setIsLoadingResults(false);
      return;
    }

    setIsLoadingResults(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const term = searchQuery.trim();
        const termLower = term.toLowerCase();

        // 1. Check local data for category, phase, or competition matches
        const matchedCategory = categorias.find(cat => 
          cat.nombre.toLowerCase().includes(termLower)
        );

        const phaseNames = ["Primera Fase", "Segona Fase", "Segunda Fase", "Tercera Fase"];
        const matchedPhase = phaseNames.find(p => 
          p.toLowerCase().includes(termLower) || termLower.includes(p.toLowerCase())
        );

        const matchingComps = competiciones.filter(comp => 
          comp.nombre.toLowerCase().includes(termLower)
        ).slice(0, 5);

        // 2. Prepare promises for parallel fetch
        const playersPromise = fetchGlobalPlayers({ nombreJugador: term, limit: 5 });
        const teamsByNamePromise = fetchGlobalTeams({ clubNombre: term, limit: 10 });
        
        const teamsByCategoryPromise = matchedCategory 
          ? fetchGlobalTeams({ categoriaId: String(matchedCategory.id), limit: 10 })
          : Promise.resolve([]);

        const teamsByPhasePromise = matchedPhase
          ? fetchGlobalTeams({ fase: matchedPhase, limit: 10 })
          : Promise.resolve([]);

        const teamsByCompPromise = (matchingComps.length > 0)
          ? fetchGlobalTeams({ competicionNombre: matchingComps[0].nombre, limit: 10 })
          : Promise.resolve([]);

        // 3. Resolve all promises together
        const [
          playersList,
          teamsByName,
          teamsByCategory,
          teamsByPhase,
          teamsByComp
        ] = await Promise.all([
          playersPromise,
          teamsByNamePromise,
          teamsByCategoryPromise,
          teamsByPhasePromise,
          teamsByCompPromise
        ]);

        // 4. Annotate each team with its matching context so the user understands the match
        const annotatedTeamsByName = (teamsByName || []).map(t => ({
          ...t,
          searchContext: 'coincidencia de nombre'
        }));

        const annotatedTeamsByCategory = (teamsByCategory || []).map(t => ({
          ...t,
          searchContext: `Categoría: ${matchedCategory?.nombre}`
        }));

        const annotatedTeamsByPhase = (teamsByPhase || []).map(t => ({
          ...t,
          searchContext: `Fase: ${matchedPhase}`
        }));

        const annotatedTeamsByComp = (teamsByComp || []).map(t => ({
          ...t,
          searchContext: `Competición: ${matchingComps[0]?.nombre}`
        }));

        const allTeamsRaw = [
          ...annotatedTeamsByName,
          ...annotatedTeamsByCategory,
          ...annotatedTeamsByPhase,
          ...annotatedTeamsByComp
        ];

        // Deduplicate merged teams list by clubId, keeping the most relevant search context
        const seenClubIds = new Set<string>();
        const uniqueTeams: GlobalTeamRow[] = [];
        
        for (const t of allTeamsRaw) {
          if (!t || !t.clubId) continue;
          if (!seenClubIds.has(t.clubId)) {
            seenClubIds.add(t.clubId);
            uniqueTeams.push(t);
          } else {
            const existingIndex = uniqueTeams.findIndex(existing => existing.clubId === t.clubId);
            if (existingIndex !== -1 && (!uniqueTeams[existingIndex].searchContext || uniqueTeams[existingIndex].searchContext === 'coincidencia de nombre')) {
              uniqueTeams[existingIndex] = {
                ...uniqueTeams[existingIndex],
                searchContext: t.searchContext
              };
            }
          }
        }

        // Extract any competitions from the matching players' teams and matching teams/clubs to also display them
        const associatedCompsSet = new Set<string>();
        if (playersList && playersList.length > 0) {
          for (const player of playersList) {
            if (player.equipos && player.equipos.length > 0) {
              for (const eq of player.equipos) {
                if (eq.competicionId) {
                  associatedCompsSet.add(String(eq.competicionId));
                }
              }
            }
          }
        }

        if (uniqueTeams && uniqueTeams.length > 0) {
          for (const team of uniqueTeams) {
            if (team.equipos && team.equipos.length > 0) {
              for (const eq of team.equipos) {
                if (eq.competicionId) {
                  associatedCompsSet.add(String(eq.competicionId));
                }
              }
            }
          }
        }

        const associatedCompetitions = associatedCompsSet.size > 0
          ? await fetchCompeticionesByIds(Array.from(associatedCompsSet))
          : [];

        const mergedComps = [...matchingComps];
        for (const aComp of associatedCompetitions) {
          if (!mergedComps.some(c => String(c.id) === String(aComp.id))) {
            mergedComps.push(aComp);
          }
        }

        // Sort by Category name, then by Competition name
        mergedComps.sort((a, b) => {
          const catA = a.categorias?.nombre || categorias.find(c => String(c.id) === String(a.categoria_id))?.nombre || '';
          const catB = b.categorias?.nombre || categorias.find(c => String(c.id) === String(b.categoria_id))?.nombre || '';
          const catCompare = catA.localeCompare(catB, 'es', { sensitivity: 'base' });
          if (catCompare !== 0) return catCompare;
          return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        });

        setSearchResults({
          players: playersList || [],
          teams: uniqueTeams,
          competitions: mergedComps
        });
      } catch (error) {
        console.error('Error fetching predictive search results:', error);
      } finally {
        setIsLoadingResults(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, competiciones, categorias]);

  // Handle focus on search bar
  const handleInputFocus = () => {
    setIsSearchFocused(true);
    // Autofocus the input in the overlay once opened
    setTimeout(() => {
      overlayInputRef.current?.focus();
    }, 50);
  };

  // Close search overlay
  const handleCloseSearch = () => {
    setIsSearchFocused(false);
    setSearchQuery('');
    setSearchResults({ players: [], teams: [], competitions: [] });
  };

  // Handle enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      saveSearchQueryToHistory(q);
      navigate(`/players?search=${encodeURIComponent(q)}`);
      handleCloseSearch();
    }
  };

  // Selection handlers
  const handleSelectPlayer = (player: GlobalPlayerRow) => {
    saveSearchQueryToHistory(player.nombre);
    navigate(`/players?search=${encodeURIComponent(player.nombre)}`);
    handleCloseSearch();
  };

  const handleSelectTeam = (team: GlobalTeamRow) => {
    saveSearchQueryToHistory(team.nombre);
    navigate(`/teams?search=${encodeURIComponent(team.nombre)}`);
    handleCloseSearch();
  };

  const handleSelectCompetition = (comp: Competicion) => {
    saveSearchQueryToHistory(comp.nombre);
    // Lookup corresponding season & category
    const compSeason = temporadas.find(s => s.id === comp.temporada_id);
    const compCategory = categorias.find(c => c.id === comp.categoria_id);
    
    if (compSeason) onTemporadaChange(String(compSeason.id));
    if (compCategory) onCategoriaChange(String(compCategory.id));
    
    const inferredFase = inferCompetitionPhase(comp.nombre);
    onFaseChange(inferredFase);
    onCompeticionChange(String(comp.id));
    
    // Auto-save search inside history and navigate
    const recentItem: RecentCompetition = {
      id: String(comp.id),
      nombre: comp.nombre,
      temporadaId: String(comp.temporada_id),
      categoriaId: String(comp.categoria_id),
      temporadaNombre: compSeason?.nombre || 'Temporada',
      categoriaNombre: compCategory?.nombre || 'Categoría',
      fase: inferredFase !== 'Sin fase' ? inferredFase : undefined,
      timestamp: Date.now()
    };
    
    // Invoke recent click logic to load stats correctly
    onOpenRecent(recentItem);
  };

  const hasResults = searchResults.players.length > 0 || searchResults.teams.length > 0 || searchResults.competitions.length > 0;

  return (
    <div className="flex flex-col items-center px-4 max-w-3xl mx-auto w-full mt-[10vh] md:mt-[15vh] space-y-8 pb-20 md:pb-8 animate-fade-in text-center">
      
      {/* Centered Branding Logo */}
      <div className="flex flex-col items-center space-y-2 select-none">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtRYxMJFRsY35mqSEtx2i9IFgE2_PBriyKi0BBjdYB_US6LJrclwnLGRvFJO1m7qvTeIFtQEGNDKZm3Q156ruhEf9W9zjnwkxTg1wxOtcd5BTzZZOcdz2RpyEJpC7jlAa1oeH4bDFimSOMzT_sIIRLz3aBGDhNoYdn5YMwlrF8cRdFLJrhG3eOdtlr31PMRcDudrkb_1nA3rORyo55tkY0bsFyANIz9wW4nPhMlJy_ws0otbXWfMCCFuT_y35BXHoM-CzB2zlZ7fY" 
          alt="FedStats Logo" 
          className="w-full max-w-[200px] h-auto object-contain transition-transform hover:scale-105 duration-300" 
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Central Google-style Search Bar */}
      <section className="w-full max-w-2xl text-left" ref={searchContainerRef}>
        <div className="relative group cursor-pointer" onClick={handleInputFocus}>
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#727782] group-hover:text-primary transition-colors">search</span>
          </div>
          <input
            ref={searchInputRef}
            readOnly
            className="w-full h-14 pl-14 pr-6 bg-white border border-[#c2c6d2] hover:shadow-md focus:shadow-lg rounded-full text-[18px] focus:ring-0 focus:border-[#c2c6d2]/30 outline-none transition-all cursor-pointer text-slate-800 placeholder-slate-400 font-medium"
            placeholder="Buscar jugadores, equipos..."
            type="text"
          />
        </div>
        
        {/* Recientes Chips below Search Bar */}
        <div className="mt-8 flex flex-col items-center justify-center space-y-3">
          <span className="text-[12px] font-bold text-[#727782] uppercase tracking-widest w-full text-center">
            BÚSQUEDAS RECIENTES
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
            {recentSearches.length > 0 ? (
              recentSearches.slice(0, 4).map((item) => (
                <button
                  key={`${item.id}-${item.timestamp}`}
                  onClick={() => onOpenRecent(item)}
                  className="inline-flex items-center px-4 py-2 bg-slate-100/85 border border-slate-200/40 rounded-full text-xs font-semibold text-slate-600 hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  {item.nombre}
                  <span className="material-symbols-outlined text-[14px] ml-1.5 opacity-60">history</span>
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate('/teams?search=Senior%20A');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-slate-100/85 border border-slate-200/40 rounded-full text-xs font-semibold text-slate-600 hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  Senior A 24-25
                  <span className="material-symbols-outlined text-[14px] ml-1.5 opacity-60">history</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/players?search=Pau%20Gasol');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-slate-100/85 border border-slate-200/40 rounded-full text-xs font-semibold text-slate-600 hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  Pau Gasol
                  <span className="material-symbols-outlined text-[14px] ml-1.5 opacity-60">history</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/teams?search=FC%20Barcelona');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-slate-100/85 border border-slate-200/40 rounded-full text-xs font-semibold text-slate-600 hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  FC Barcelona
                  <span className="material-symbols-outlined text-[14px] ml-1.5 opacity-60">history</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Search Overlay (Modal UI) */}
      {isSearchFocused && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col p-4 md:p-8 animate-fade-in">
          {/* Main Search Panel Container */}
          <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] mt-4 md:mt-8 border border-slate-100">
            
            {/* Search Input Bar inside Modal */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="text-slate-400 shrink-0 w-5 h-5" />
              <input
                ref={overlayInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none text-slate-800 text-lg focus:ring-0 outline-none placeholder-slate-400 py-1"
                placeholder="Escribe para buscar..."
                type="text"
                autoFocus
              />
              {isLoadingResults ? (
                <Loader2 className="animate-spin text-primary w-5 h-5 shrink-0" />
              ) : searchQuery ? (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors shrink-0 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              ) : null}
              <button 
                onClick={handleCloseSearch}
                className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-all shrink-0 cursor-pointer border border-slate-200"
              >
                Cerrar
              </button>
            </div>

            {/* Suggestions / Results Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar min-h-[300px]">
              
              {/* State A: Input is empty, show guides / recent searches */}
              {!searchQuery && (
                <div className="space-y-6 text-left">
                  {recentSearches.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <History size={14} className="text-slate-400" />
                        Historial Reciente
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recentSearches.map((item) => (
                          <button
                            key={`${item.id}-${item.timestamp}`}
                            onClick={() => onOpenRecent(item)}
                            className="flex items-center justify-between p-3 border border-slate-100 hover:border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50 hover:shadow-sm text-left transition-all group cursor-pointer"
                          >
                            <div className="truncate pr-2">
                              <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-primary transition-colors">{item.nombre}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.temporadaNombre} • {item.categoriaNombre}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3 text-slate-400">
                        <Sparkles size={20} />
                      </span>
                      <p className="font-semibold text-slate-800 text-sm">Prueba a buscar jugadores o clubes</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Introduce el nombre de un jugador como "Pau", un club como "FCB", o una categoría de liga para ver coincidencias al instante.
                      </p>
                    </div>
                  )}

                   {/* Smart Search Templates */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-slate-400" />
                        {userQueries.length > 0 ? 'Búsquedas Recientes' : 'Sugerencias de Búsqueda'}
                      </h4>
                      {userQueries.length > 0 && (
                        <button
                          onClick={() => {
                            try {
                              localStorage.removeItem('fedstats_user_queries_v1');
                              setUserQueries([]);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          Borrar historial
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dynamicSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setSearchQuery(suggestion)}
                          className="px-3.5 py-1.5 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* State B: User has entered a query, show real-time grouped results */}
              {searchQuery && (
                <div className="space-y-6 text-left">
                  
                  {/* Loader Placeholder */}
                  {isLoadingResults && !hasResults && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Loader2 size={32} className="animate-spin text-primary mb-3" />
                      <p className="text-sm font-medium text-slate-500">Buscando en la base de datos...</p>
                    </div>
                  )}

                  {/* No Coincidences */}
                  {!isLoadingResults && !hasResults && (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
                      <p className="font-semibold text-slate-800">No se encontraron resultados para "{searchQuery}"</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Revisa la ortografía o intenta buscar un término más genérico. Pulsa Enter para una búsqueda global.
                      </p>
                      <button
                        onClick={() => navigate(`/players?search=${encodeURIComponent(searchQuery.trim())}`)}
                        className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        Ver en resultados globales <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  {/* 1. JUGADORES Results */}
                  {searchResults.players.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-1">
                        <Users size={14} className="text-slate-400" />
                        JUGADORES
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                        {searchResults.players.map((player) => (
                          <button
                            key={player.jugadorId}
                            onClick={() => handleSelectPlayer(player)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-fixed/50 border border-slate-200 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                                {player.fotoUrl ? (
                                  <img 
                                    className="w-full h-full object-cover" 
                                    src={player.fotoUrl} 
                                    alt={player.nombre} 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span>{player.nombre.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{player.nombre}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {player.equipos?.[0]?.nombre || 'Sin equipo'} {player.dorsal ? `• Dorsal ${player.dorsal}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                              Ver Ficha
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. EQUIPOS / CLUBS Results */}
                  {searchResults.teams.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-1">
                        <Shield size={14} className="text-slate-400" />
                        EQUIPOS Y CLUBS
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                        {searchResults.teams.map((team) => (
                          <button
                            key={team.clubId}
                            onClick={() => handleSelectTeam(team)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-secondary-fixed/50 border border-slate-200 flex items-center justify-center text-secondary font-bold text-xs shrink-0 overflow-hidden">
                                {team.logoUrl ? (
                                  <img 
                                    className="w-full h-full object-contain p-1" 
                                    src={team.logoUrl} 
                                    alt={team.nombre} 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <Shield size={16} />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{team.nombre}</p>
                                <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span>{team.equipos?.length ? `${team.equipos.length} equipos federados` : 'Club Deportivo'}</span>
                                  {team.searchContext && team.searchContext !== 'coincidencia de nombre' && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-md text-[10px]">{team.searchContext}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. COMPETICIONES Results */}
                  {searchResults.competitions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-1">
                        <Award size={14} className="text-slate-400" />
                        COMPETICIONES
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                        {searchResults.competitions.map((comp) => (
                          <button
                            key={comp.id}
                            onClick={() => handleSelectCompetition(comp)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                                <Award size={18} />
                              </div>
                              <div className="truncate pr-2">
                                <p className="font-bold text-slate-800 text-sm truncate group-hover:text-primary transition-colors">{comp.nombre}</p>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                  {categorias.find(c => c.id === comp.categoria_id)?.nombre || 'Categoría'} • {temporadas.find(t => t.id === comp.temporada_id)?.nombre || 'Temporada'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 px-2.5 py-0.5 bg-amber-500/15 rounded-full shrink-0">
                              Clasificación
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prompt to do global search */}
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => navigate(`/players?search=${encodeURIComponent(searchQuery.trim())}`)}
                      className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      Búsqueda global para "{searchQuery}" <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
