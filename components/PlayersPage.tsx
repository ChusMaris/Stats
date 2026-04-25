import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, ChevronDown, ChevronUp, Filter, FilterX, History, Loader2, RotateCcw, Search, SlidersHorizontal, Star, StarOff, X } from 'lucide-react';
import { fetchCategorias, fetchCompeticionesByFilters, fetchEquipos, fetchGlobalPlayers, fetchTemporadas } from '../services/dataService';
import { Categoria, GlobalPlayerFilters, GlobalPlayerRow, Temporada } from '../types';
import { getPlayerFavorites, togglePlayerFavorite } from '../utils/playerFavoritesStorage';

type SortKey = 'dorsal' | 'nombre' | 'partidosJugados' | 'ppg' | 'mpg' | 'ppm' | 'fpg' | 't1Pct' | 't2Made' | 't3Made';

interface PlayersPageProps {
  activeCompetitionName?: string;
}

const PAGE_SIZE = 20;

const getCurrentSeasonName = (date: Date) => {
  const month = date.getMonth() + 1;
  const baseYear = month >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  const endYearShort = String(baseYear + 1).slice(-2);
  return `${baseYear}/${endYearShort}`;
};

const findCurrentSeasonId = (temporadas: Temporada[]) => {
  const expected = getCurrentSeasonName(new Date());
  const expectedNormalized = expected.toLowerCase();

  const exact = temporadas.find((season) => String(season.nombre).toLowerCase() === expectedNormalized);
  if (exact) return String(exact.id);

  const fuzzy = temporadas.find((season) => {
    const name = String(season.nombre || '').toLowerCase();
    return name.includes(expected.split('/')[0]) && name.includes(expected.split('/')[1]);
  });

  return fuzzy ? String(fuzzy.id) : '';
};

const toNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const PlayersPage: React.FC<PlayersPageProps> = () => {
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [competiciones, setCompeticiones] = useState<Array<{ nombre: string }>>([]);
  const [equipos, setEquipos] = useState<Array<{ id: string; nombre: string }>>([]);

  const [filters, setFilters] = useState<GlobalPlayerFilters>({
    temporadaId: '',
    categoriaId: '',
    fase: '',
    competicionNombre: '',
    equipoNombre: '',
    nombreJugador: '',
    dorsal: '',
  });

  const [players, setPlayers] = useState<GlobalPlayerRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getPlayerFavorites());
  const [ignoreFavorites, setIgnoreFavorites] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'ppg', direction: 'desc' });
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'limit' || key === 'offset' || key === 'playerIds') return false;
      return value !== '';
    }).length;
  }, [filters]);

  useEffect(() => {
    const loadBaseFilters = async () => {
      try {
        const [loadedTemporadas, loadedCategorias, loadedEquipos] = await Promise.all([
          fetchTemporadas(),
          fetchCategorias(),
          fetchEquipos(),
        ]);

        setTemporadas(loadedTemporadas);
        setCategorias(loadedCategorias);
        setEquipos(
          loadedEquipos.map((team) => ({
            id: String(team.id),
            nombre: team.nombre_especifico || 'Equipo',
          }))
        );

        if (favoriteIds.length === 0) {
          const seasonId = findCurrentSeasonId(loadedTemporadas);
          if (seasonId) {
            setFilters((previous) => ({ ...previous, temporadaId: seasonId }));
          }
        }
      } catch (error) {
        console.error(error);
        setErrorMsg('No se pudieron cargar los filtros base de jugadores.');
      } finally {
        setIsReady(true);
      }
    };

    loadBaseFilters();
  }, [favoriteIds.length]);

  useEffect(() => {
    const loadCompetitions = async () => {
      try {
        const results = await fetchCompeticionesByFilters({
          temporadaId: filters.temporadaId,
          categoriaId: filters.categoriaId,
          fase: filters.fase,
        });

        const dedupeByName = new Map<string, { nombre: string }>();
        for (const competition of results) {
          const normalized = normalizeText(competition.nombre);
          if (!dedupeByName.has(normalized)) {
            dedupeByName.set(normalized, { nombre: competition.nombre });
          }
        }

        const options = Array.from(dedupeByName.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        setCompeticiones(options);

        if (filters.competicionNombre && !options.some((option) => option.nombre === filters.competicionNombre)) {
          setFilters((previous) => ({ ...previous, competicionNombre: '' }));
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadCompetitions();
  }, [filters.temporadaId, filters.categoriaId, filters.fase, filters.competicionNombre]);

  useEffect(() => {
    if (!isReady) return;
    setPage(0);
    setHasMore(true);
    setPlayers([]);
  }, [filtersKey, favoriteIds, isReady]);

  useEffect(() => {
    if (!isReady) return;

    const loadPage = async () => {
      const isFirstPage = page === 0;
      if (isFirstPage) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setErrorMsg(null);

      try {
        const hasAnyFilter = Boolean(
          filters.temporadaId ||
          filters.categoriaId ||
          filters.fase ||
          filters.competicionNombre ||
          filters.equipoNombre ||
          filters.nombreJugador ||
          filters.dorsal
        );

        let queryFilters: GlobalPlayerFilters | null = null;

        if (!hasAnyFilter) {
          if (favoriteIds.length > 0) {
            queryFilters = {
              playerIds: favoriteIds,
              limit: PAGE_SIZE,
              offset: page * PAGE_SIZE,
            };
          } else if (filters.temporadaId) {
            queryFilters = {
              temporadaId: filters.temporadaId,
              limit: PAGE_SIZE,
              offset: page * PAGE_SIZE,
            };
          }
        } else {
          queryFilters = {
            ...filters,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          };
        }

        if (!queryFilters) {
          setPlayers([]);
          setHasMore(false);
          return;
        }

        const nextPageRows = await fetchGlobalPlayers(queryFilters);

        setPlayers((previous) => {
          if (isFirstPage) return nextPageRows;

          const seen = new Set(previous.map((row) => String(row.jugadorId)));
          const merged = [...previous];
          for (const row of nextPageRows) {
            if (!seen.has(String(row.jugadorId))) {
              merged.push(row);
              seen.add(String(row.jugadorId));
            }
          }
          return merged;
        });

        setHasMore(nextPageRows.length === PAGE_SIZE);
      } catch (error) {
        console.error(error);
        setErrorMsg('No se pudieron cargar los jugadores para esos filtros.');
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    loadPage();
  }, [favoriteIds, filters, isReady, page]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (!target.isIntersecting) return;
        if (isLoading || isLoadingMore || !hasMore) return;
        setPage((previous) => previous + 1);
      },
      {
        root: null,
        rootMargin: '180px',
        threshold: 0,
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore]);

  const sortedPlayers = useMemo(() => {
    const getCellValue = (player: GlobalPlayerRow, key: SortKey) => {
      if (key === 'dorsal') return toNumber(player.dorsal);
      if (key === 't2Made') return player.totalTiros2Anotados / Math.max(1, player.partidosJugados);
      if (key === 't3Made') return player.totalTiros3Anotados / Math.max(1, player.partidosJugados);
      const value = player[key as keyof GlobalPlayerRow];
      if (typeof value === 'number') return value;
      return String(value || '').toLowerCase();
    };

    return [...players].sort((left, right) => {
      if (!ignoreFavorites) {
        const leftFavorite = favoriteIds.includes(String(left.jugadorId));
        const rightFavorite = favoriteIds.includes(String(right.jugadorId));
        if (leftFavorite !== rightFavorite) {
          return leftFavorite ? -1 : 1;
        }
      }

      const leftValue = getCellValue(left, sortConfig.key);
      const rightValue = getCellValue(right, sortConfig.key);

      if (leftValue < rightValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (leftValue > rightValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [favoriteIds, ignoreFavorites, players, sortConfig]);

  const visiblePlayers = useMemo(() => {
    if (!onlyFavorites) return sortedPlayers;
    return sortedPlayers.filter((player) => favoriteIds.includes(String(player.jugadorId)));
  }, [favoriteIds, onlyFavorites, sortedPlayers]);

  const updateFilter = (patch: Partial<GlobalPlayerFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const clearFilters = () => {
    setFilters({
      temporadaId: favoriteIds.length > 0 ? '' : filters.temporadaId,
      categoriaId: '',
      fase: '',
      competicionNombre: '',
      equipoNombre: '',
      nombreJugador: '',
      dorsal: '',
    });
    setOnlyFavorites(false);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const renderSortHeader = (label: string, key: SortKey, align: 'left' | 'center' = 'center') => (
    <th
      onClick={() => handleSort(key)}
      className={`px-3 py-2 cursor-pointer select-none text-[10px] font-bold uppercase tracking-wide text-slate-400 ${align === 'center' ? 'text-center' : 'text-left'}`}
    >
      <div className={`inline-flex items-center gap-1 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span className={sortConfig.key === key ? 'text-fcbq-blue' : ''}>{label}</span>
        <ArrowDownUp size={12} className={sortConfig.key === key ? 'text-fcbq-blue' : 'text-slate-300'} />
      </div>
    </th>
  );

  return (
    <div className="animate-fade-in space-y-5 md:space-y-6">
      {/* Search Bar & Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={filters.nombreJugador || ''}
            onChange={(event) => updateFilter({ nombreJugador: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-base shadow-sm focus:border-fcbq-blue focus:ring-2 focus:ring-fcbq-blue/10 transition-all"
            placeholder="Buscar por nombre de jugador..."
          />
        </div>
        <button
          onClick={() => setIsFiltersVisible(!isFiltersVisible)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-semibold transition-all shadow-sm ${
            isFiltersVisible || activeFiltersCount > 1 
              ? 'bg-fcbq-blue border-fcbq-blue text-white' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal size={18} />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className={`ml-1 flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
              isFiltersVisible || activeFiltersCount > 1 ? 'bg-white text-fcbq-blue' : 'bg-fcbq-blue text-white'
            }`}>
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {isFiltersVisible && (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4 overflow-hidden transition-all duration-300 origin-top max-h-[1000px] opacity-100">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-2">
            <Filter size={14} />
            Filtros avanzados
          </h3>
          <button onClick={() => setIsFiltersVisible(false)} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Temporada</label>
            <select
              value={filters.temporadaId || ''}
              onChange={(event) => updateFilter({ temporadaId: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="">Todas</option>
              {temporadas.map((season) => (
                <option key={season.id} value={season.id}>{season.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Categoría</label>
            <select
              value={filters.categoriaId || ''}
              onChange={(event) => updateFilter({ categoriaId: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="">Todas</option>
              {categorias.map((category) => (
                <option key={category.id} value={category.id}>{category.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Fase</label>
            <select
              value={filters.fase || ''}
              onChange={(event) => updateFilter({ fase: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="">Todas</option>
              <option value="Primera Fase">Primera Fase</option>
              <option value="Segona Fase">Segona Fase</option>
              <option value="Tercera Fase">Tercera Fase</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Competición</label>
            <select
              value={filters.competicionNombre || ''}
              onChange={(event) => updateFilter({ competicionNombre: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="">Todas</option>
              {competiciones.map((competition) => (
                <option key={competition.nombre} value={competition.nombre}>{competition.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Equipo</label>
            <select
              value={filters.equipoNombre || ''}
              onChange={(event) => updateFilter({ equipoNombre: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="">Todos</option>
              {equipos.map((team) => (
                <option key={team.id} value={team.nombre}>{team.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Nº jugador</label>
            <input
              value={filters.dorsal || ''}
              onChange={(event) => updateFilter({ dorsal: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              placeholder="Dorsal"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(event) => setOnlyFavorites(event.target.checked)}
                className="w-4 h-4 rounded text-fcbq-blue border-slate-300 focus:ring-fcbq-blue/20"
              />
              <span className="text-sm font-medium text-slate-700">Ver mis favoritos</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={ignoreFavorites}
                onChange={(event) => setIgnoreFavorites(event.target.checked)}
                className="w-4 h-4 rounded text-fcbq-blue border-slate-300 focus:ring-fcbq-blue/20"
              />
              <span className="text-sm font-medium text-slate-700">Ignorar favoritos al ordenar</span>
            </label>
          </div>

          <button
            onClick={() => {
              clearFilters();
              setIsFiltersVisible(false);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-100 text-red-600 text-sm font-bold hover:bg-red-50 transition-all uppercase tracking-wider"
          >
            <RotateCcw size={16} />
            Limpiar filtros
          </button>
        </div>
      </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
            <Search size={16} className="text-fcbq-blue" />
            {isLoading ? 'Buscando jugadores...' : `${visiblePlayers.length} jugadores`}
          </p>
          <p className="text-[11px] uppercase font-bold tracking-wide text-slate-400">{onlyFavorites ? 'Solo favoritos' : 'Favoritos primero'}</p>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-fcbq-blue" />
            Cargando datos de jugadores...
          </div>
        ) : visiblePlayers.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            {onlyFavorites ? 'No hay favoritos para estos filtros.' : 'No hay jugadores para estos filtros.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-slate-100 bg-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-center text-[10px] uppercase font-bold tracking-wide text-slate-400">Fav</th>
                    {renderSortHeader('#', 'dorsal')}
                    {renderSortHeader('Jugador', 'nombre', 'left')}
                    {renderSortHeader('PJ', 'partidosJugados')}
                    {renderSortHeader('PPG', 'ppg')}
                    {renderSortHeader('MPG', 'mpg')}
                    {renderSortHeader('PPM', 'ppm')}
                    {renderSortHeader('FPG', 'fpg')}
                    {renderSortHeader('%T1', 't1Pct')}
                    {renderSortHeader('T2/g', 't2Made')}
                    {renderSortHeader('T3/g', 't3Made')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePlayers.map((player) => {
                    const isFavorite = favoriteIds.includes(String(player.jugadorId));
                    const isExpanded = expandedPlayerId === String(player.jugadorId);

                    return (
                      <React.Fragment key={player.jugadorId}>
                        <tr 
                          onClick={() => setExpandedPlayerId(isExpanded ? null : String(player.jugadorId))}
                          className={`transition-colors cursor-pointer border-l-4 ${isExpanded ? 'bg-slate-50 border-fcbq-blue' : 'hover:bg-slate-50/80 border-transparent'}`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFavoriteIds(togglePlayerFavorite(player.jugadorId));
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100"
                              aria-label={isFavorite ? 'Quitar favorito' : 'Marcar favorito'}
                            >
                              {isFavorite ? <Star size={16} className="text-amber-500 fill-amber-500" /> : <StarOff size={16} className="text-slate-300" />}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-sm text-slate-500 font-bold">{player.dorsal}</td>
                          <td className="px-3 py-2.5 text-left min-w-[240px]">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                                {player.fotoUrl ? (
                                  <img src={player.fotoUrl} alt={player.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 font-bold">J</div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                  {player.nombre}
                                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                </p>
                                {player.equipos.length > 0 && (
                                  <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                                    {player.equipos.slice(0, 2).map((team) => team.nombre).join(' · ')}
                                    {player.equipos.length > 2 ? ` +${player.equipos.length - 2}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-sm text-slate-600 font-medium">{player.partidosJugados}</td>
                          <td className="px-3 py-2.5 text-center text-sm font-bold text-fcbq-blue bg-fcbq-blue/5">{player.ppg.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-slate-600">{player.mpg.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-slate-600">{player.ppm.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-slate-600">{player.fpg.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-slate-600 font-medium">{player.t1Pct.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-center text-sm text-slate-600 font-medium">{(player.totalTiros2Anotados / Math.max(1, player.partidosJugados)).toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-slate-600 font-medium">{(player.totalTiros3Anotados / Math.max(1, player.partidosJugados)).toFixed(1)}</td>
                        </tr>
                        {isExpanded && player.desglose && player.desglose.length > 0 && (
                          <>
                            <tr className="bg-slate-50/80 border-l-4 border-fcbq-blue">
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 inline-flex items-center gap-2">
                                <History size={12} className="text-fcbq-blue" />
                                Desglose por temporada y categoria
                              </td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                            </tr>
                            {player.desglose.map((d, idx) => (
                              <tr key={`${player.jugadorId}-desglose-${idx}`} className="bg-slate-50/60 border-l-4 border-fcbq-blue/60">
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 text-left min-w-[240px]">
                                  <div className="text-xs font-semibold text-slate-700">{d.temporada}</div>
                                  <div className="text-[11px] text-slate-500">{d.categoria}</div>
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-slate-600">{d.partidosJugados}</td>
                                <td className="px-3 py-2 text-center text-xs font-bold text-fcbq-blue">{Number(d.ppg ?? 0).toFixed(1)}</td>
                                <td className="px-3 py-2 text-center text-xs text-slate-600">{Number(d.mpg ?? 0).toFixed(1)}</td>
                                <td className="px-3 py-2 text-center text-xs text-slate-600">{Number(d.ppm ?? 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-center text-xs text-slate-600">{Number(d.fpg ?? 0).toFixed(1)}</td>
                                <td className="px-3 py-2 text-center text-xs text-slate-600">{Number(d.t1Pct ?? 0).toFixed(1)}%</td>
                                <td className="px-3 py-2 text-center text-xs text-slate-600">{Number(d.t2Made ?? 0).toFixed(1)}</td>
                                <td className="px-3 py-2 text-center text-xs text-slate-600">{Number(d.t3Made ?? 0).toFixed(1)}</td>
                              </tr>
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div ref={sentinelRef} className="h-10 flex items-center justify-center text-xs text-slate-400">
              {isLoadingMore && <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando más...</span>}
              {!hasMore && <span>No hay más jugadores</span>}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default PlayersPage;
