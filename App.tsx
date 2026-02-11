import React, { useState, useEffect, useMemo } from 'react';
import { fetchTemporadas, fetchCategorias, fetchCompeticiones, fetchCompeticionDetails, fetchTeamStats } from './services/dataService';
import { Temporada, Categoria, Competicion } from './types';
import Standings from './components/Standings';
import TeamStats from './components/TeamStats';
import { Loader2, Trophy, AlertCircle, ChevronDown } from 'lucide-react';

const App: React.FC = () => {
  // --- State for Selection ---
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [competiciones, setCompeticiones] = useState<Competicion[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [selectedTemporada, setSelectedTemporada] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [selectedFase, setSelectedFase] = useState<string>('');
  const [selectedCompeticion, setSelectedCompeticion] = useState<string>('');

  // --- State for Data View ---
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewData, setViewData] = useState<{
    matches: any[],
    equipos: any[],
    competicion: Competicion | null
  } | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<number | string | null>(null);
  const [teamDetails, setTeamDetails] = useState<{
    matches: any[],
    plantilla: any[],
    stats: any[],
    movements: any[]
  } | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // --- UI State ---
  const [isScrolled, setIsScrolled] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const temps = await fetchTemporadas();
        const cats = await fetchCategorias();
        setTemporadas(temps);
        setCategorias(cats);
      } catch (error) {
        console.error("Error loading filters", error);
        setErrorMsg("Error cargando los filtros iniciales. Por favor recarga la página.");
      }
    };
    loadFilters();
  }, []);

  // --- Scroll Listener for Header ---
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Update Competitions when Temp/Cat changes ---
  useEffect(() => {
    if (selectedTemporada && selectedCategoria) {
      const loadComps = async () => {
        setLoadingCompetitions(true);
        setCompeticiones([]);
        setSelectedFase('');
        setSelectedCompeticion('');
        setErrorMsg(null);
        try {
          const comps = await fetchCompeticiones(selectedTemporada, selectedCategoria);
          setCompeticiones(comps);
        } catch (error) {
          console.error("Error loading competitions", error);
          setErrorMsg("Error cargando las competiciones.");
        } finally {
          setLoadingCompetitions(false);
        }
      };
      loadComps();
    } else {
      setCompeticiones([]);
      setSelectedFase('');
      setSelectedCompeticion('');
    }
  }, [selectedTemporada, selectedCategoria]);

  // --- Derived State: Filtered Competitions by Phase ---
  const filteredCompeticiones = useMemo(() => {
    if (!selectedFase) return competiciones;
    return competiciones.filter(c => 
      c.nombre.toLowerCase().includes(selectedFase.toLowerCase())
    );
  }, [competiciones, selectedFase]);

  // Reset competition if it's no longer in the filtered list
  useEffect(() => {
    if (selectedCompeticion && !filteredCompeticiones.find(c => c.id.toString() === selectedCompeticion)) {
      setSelectedCompeticion('');
    }
  }, [filteredCompeticiones, selectedCompeticion]);

  // --- Auto Search when Competition Changes ---
  useEffect(() => {
    const loadCompetitionData = async () => {
        if (!selectedCompeticion) {
            setViewData(null);
            return;
        }
        
        setIsLoading(true);
        setErrorMsg(null);
        setSelectedTeamId(null);
        setTeamDetails(null);
        
        try {
          const details = await fetchCompeticionDetails(selectedCompeticion);
          const comp = competiciones.find(c => c.id.toString() === selectedCompeticion) || null;
          
          const categoryInfo = categorias.find(c => c.id.toString() === selectedCategoria);
          const compWithCategory = comp ? { 
              ...comp, 
              categorias: categoryInfo 
          } : null;

          setViewData({
            matches: details.partidos,
            equipos: details.equipos,
            competicion: compWithCategory
          });
          
          if (details.equipos.length === 0) {
            setErrorMsg("No se han encontrado equipos ni partidos para esta competición.");
          }

        } catch (error: any) {
          console.error("Error fetching competition details", error);
          setErrorMsg(`Error al cargar los datos: ${error.message || 'Inténtalo de nuevo.'}`);
        } finally {
          setIsLoading(false);
        }
    };

    if (selectedCompeticion && competiciones.length > 0) {
        loadCompetitionData();
    }
  }, [selectedCompeticion, competiciones, selectedCategoria, categorias]);

  // --- Team Selection Action ---
  const handleTeamSelect = async (teamId: number | string) => {
    if (teamId === selectedTeamId) return;
    setSelectedTeamId(teamId);
    setLoadingTeam(true);
    try {
        const compId = viewData?.competicion?.id || selectedCompeticion;
        const details = await fetchTeamStats(compId, teamId);
        setTeamDetails(details);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingTeam(false);
    }
  };

  const activeCategoryName = categorias.find(c => c.id.toString() === selectedCategoria)?.nombre;
  const activeCompetitionName = competiciones.find(c => c.id.toString() === selectedCompeticion)?.nombre;
  
  const selectedTeamData = selectedTeamId && viewData 
    ? viewData.equipos.find(e => e.id === selectedTeamId) 
    : null;
  const teamLogoUrl = selectedTeamData?.clubs?.logo_url;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      
      {/* Navbar */}
      <header className={`bg-fcbq-blue text-white shadow-md sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-4'}`}>
        <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
                <div 
                  className={`bg-white rounded-full flex items-center justify-center text-fcbq-blue font-bold border-2 border-fcbq-accent transition-all duration-300 overflow-hidden ${isScrolled ? 'w-9 h-9 text-lg' : 'w-11 h-11 text-xl'}`}
                >
                    {teamLogoUrl ? (
                      <img 
                        src={teamLogoUrl} 
                        alt="Team Logo" 
                        className="w-full h-full object-contain rounded-full p-0.5" 
                      />
                    ) : (
                      <span className={isScrolled ? 'text-lg' : 'text-xl'}>B</span>
                    )}
                </div>
                
                <div className="flex flex-col justify-center">
                    {isScrolled && activeCompetitionName ? (
                         <div className="animate-fade-in leading-tight">
                            <span className="text-xs md:text-sm text-blue-200 uppercase font-semibold block tracking-wider">
                                {activeCategoryName}
                            </span>
                            <h1 className="text-lg md:text-xl font-bold truncate max-w-[250px] md:max-w-md">
                                {activeCompetitionName}
                            </h1>
                         </div>
                    ) : (
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight animate-fade-in">Brafa Stats</h1>
                    )}
                </div>
            </div>
        </div>
      </header>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm py-6">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 items-end">
                {/* Temporada */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Temporada</label>
                    <div className="relative">
                        <select 
                            value={selectedTemporada}
                            onChange={(e) => setSelectedTemporada(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-gray-700 text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium"
                        >
                            <option value="" disabled>SELECCIONAR...</option>
                            {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Categoría */}
                <div className="lg:col-span-3">
                    <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Categoría</label>
                    <div className="relative">
                        <select 
                            value={selectedCategoria}
                            onChange={(e) => setSelectedCategoria(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-gray-700 text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium"
                        >
                            <option value="" disabled>SELECCIONAR CATEGORÍA</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Fase */}
                <div className="lg:col-span-3">
                    <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Fase</label>
                    <div className="relative">
                        <select 
                            value={selectedFase}
                            onChange={(e) => setSelectedFase(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-gray-700 text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium disabled:opacity-50"
                            disabled={!selectedCategoria}
                        >
                            <option value="">TODAS LAS FASES</option>
                            <option value="Primera Fase">PRIMERA FASE</option>
                            <option value="Segona Fase">SEGONA FASE</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Competición */}
                <div className="lg:col-span-4">
                    <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Competición</label>
                    <div className="relative">
                        <select 
                            value={selectedCompeticion}
                            onChange={(e) => setSelectedCompeticion(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-gray-700 text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium disabled:bg-gray-100 disabled:text-gray-400"
                            disabled={loadingCompetitions || !selectedTemporada || !selectedCategoria}
                        >
                            <option value="" disabled>
                                {loadingCompetitions ? 'CARGANDO...' : (!selectedTemporada || !selectedCategoria ? 'SELECCIONA FILTROS ANTERIORES' : 'SELECCIONAR COMPETICIÓN')}
                            </option>
                            {!loadingCompetitions && filteredCompeticiones.length === 0 && selectedCategoria && <option value="" disabled>SIN RESULTADOS</option>}
                            {filteredCompeticiones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                            {loadingCompetitions ? (
                                <Loader2 size={16} className="animate-spin text-gray-400" />
                            ) : (
                                <ChevronDown className="text-gray-400" size={16} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 relative z-10">
        
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm flex items-start gap-3">
             <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
             <div>
               <p className="font-bold text-red-800 text-base">Atención</p>
               <p className="text-sm text-red-700">{errorMsg}</p>
             </div>
          </div>
        )}

        {isLoading && !viewData && (
             <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 size={56} className="text-fcbq-blue animate-spin mb-4" />
                <h3 className="text-2xl font-bold text-gray-800">Cargando datos...</h3>
                <p className="text-gray-500 mt-2 text-lg">Obteniendo clasificación y partidos.</p>
             </div>
        )}

        {!viewData && !isLoading && !errorMsg && (
             <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 mt-8">
                <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
                    <Trophy size={56} className="text-fcbq-blue" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Selecciona una competición</h3>
                <p className="text-gray-500 mt-2 text-lg">Usa los filtros superiores para ver los datos.</p>
             </div>
        )}

        {viewData && (
            <div className={`space-y-8 animate-fade-in ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2 mb-4 mt-4">
                    <div className="h-8 w-2 bg-fcbq-accent rounded-full"></div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{viewData.competicion?.nombre}</h2>
                </div>

                <section>
                    <div className="flex justify-between items-end mb-4 ml-1">
                      <h3 className="text-xl font-semibold text-gray-600">Clasificación</h3>
                    </div>
                    {viewData.equipos.length > 0 ? (
                        <Standings 
                            equipos={viewData.equipos} 
                            partidos={viewData.matches}
                            esMini={viewData.competicion?.categorias?.es_mini || false}
                            onSelectTeam={handleTeamSelect}
                            selectedTeamId={selectedTeamId}
                        />
                    ) : (
                        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500 text-lg">
                            No hay equipos registrados en esta competición.
                        </div>
                    )}
                    <p className="text-sm text-gray-400 mt-2 italic">* Haz click en un equipo para ver estadísticas detalladas.</p>
                </section>

                {selectedTeamId && (
                    <section id="team-details" className="scroll-mt-24">
                         <div className="flex items-center justify-between mb-4 mt-12 border-b pb-2">
                             <div>
                                <h3 className="text-2xl font-bold text-fcbq-blue">
                                    {viewData.equipos.find(e => e.id === selectedTeamId)?.nombre_especifico}
                                </h3>
                                <p className="text-base text-gray-500">Estadísticas detalladas</p>
                             </div>
                             {loadingTeam && <Loader2 className="animate-spin text-fcbq-blue" size={24} />}
                         </div>

                         {teamDetails ? (
                             <TeamStats 
                                equipoId={selectedTeamId}
                                matches={teamDetails.matches}
                                plantilla={teamDetails.plantilla}
                                stats={teamDetails.stats}
                                movements={teamDetails.movements}
                                esMini={viewData.competicion?.categorias?.es_mini || false}
                             />
                         ) : (
                            !loadingTeam && <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed text-lg">Selecciona un equipo para ver datos.</div>
                         )}
                    </section>
                )}
            </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-10 text-center text-base">
        <p>&copy; {new Date().getFullYear()} Brafa Stats. Datos no oficiales para uso analítico.</p>
      </footer>
    </div>
  );
};

export default App;