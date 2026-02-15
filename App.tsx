
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { fetchTemporadas, fetchCategorias, fetchCompeticiones, fetchCompeticionDetails } from './services/dataService';
import { Temporada, Categoria, Competicion } from './types';
import CompetitionFilters from './components/CompetitionFilters';
import StatsView from './components/StatsView';
import ScoutingView from './components/ScoutingView';
import { Loader2, Trophy, AlertCircle, BarChart3, CalendarDays, Lock, Unlock } from 'lucide-react';

const AppContent: React.FC = () => {
  const location = useLocation();

  // --- Admin / Secret Mode Logic ---
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('brafa_admin_mode') === 'true';
  });
  
  const clickCounter = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSecretClick = () => {
    clickCounter.current += 1;

    // Clear existing timer to reset the window of opportunity
    if (clickTimer.current) clearTimeout(clickTimer.current);

    // Set a timeout to reset counter if user stops clicking
    clickTimer.current = setTimeout(() => {
        clickCounter.current = 0;
    }, 1000); // 1 second to keep clicking

    // Trigger at 5 clicks
    if (clickCounter.current === 5) {
        const newState = !isAdmin;
        setIsAdmin(newState);
        localStorage.setItem('brafa_admin_mode', String(newState));
        
        // Visual feedback could be a toast, for now alert is simple and effective for this requirement
        alert(newState ? "🔓 MODO GESTIÓN ACTIVADO" : "🔒 MODO GESTIÓN DESACTIVADO");
        clickCounter.current = 0;
    }
  };

  // --- Global State for Selection ---
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [competiciones, setCompeticiones] = useState<Competicion[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [selectedTemporada, setSelectedTemporada] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [selectedFase, setSelectedFase] = useState<string>('');
  const [selectedCompeticion, setSelectedCompeticion] = useState<string>('');

  // --- Global Data State ---
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewData, setViewData] = useState<{
    matches: any[],
    realMatches: any[],
    equipos: any[],
    competicion: Competicion | null
  } | null>(null);

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

  // --- Scroll Listener ---
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

  // --- Filter Competiciones logic moved to CompetitionFilters component visually, 
  // but we reset selectedCompeticion here if it becomes invalid due to filter changes ---
  useEffect(() => {
     // Optional: If Phase changes, we might want to verify selectedCompeticion is still valid
     // But simpler is to let user re-select if needed or keep it if it matches.
     // Current logic in App handles resets.
  }, [selectedFase]);

  // --- Fetch Data when Competition Changes ---
  const loadCompetitionData = async () => {
        if (!selectedCompeticion) {
            setViewData(null);
            return;
        }
        
        setIsLoading(true);
        setErrorMsg(null);
        
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
            realMatches: details.realMatches,
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

  useEffect(() => {
    if (selectedCompeticion && competiciones.length > 0) {
        loadCompetitionData();
    }
  }, [selectedCompeticion, competiciones, selectedCategoria, categorias]);


  const activeCategoryName = categorias.find(c => c.id.toString() === selectedCategoria)?.nombre;
  const activeCompetitionName = competiciones.find(c => c.id.toString() === selectedCompeticion)?.nombre;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      
      {/* Navbar */}
      <header className={`bg-fcbq-blue text-white shadow-md sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
        <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
                {/* LOGO AREA - CLICK HERE 5 TIMES FOR ADMIN */}
                <div 
                    className="flex items-center gap-3 overflow-hidden cursor-pointer select-none active:opacity-80"
                    onClick={handleSecretClick}
                >
                    <div 
                      className={`bg-white rounded-full flex items-center justify-center text-fcbq-blue font-bold border-2 transition-all duration-300 overflow-hidden ${isAdmin ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'border-fcbq-accent'} ${isScrolled ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'}`}
                    >
                        <span className={isScrolled ? 'text-base' : 'text-xl'}>B</span>
                    </div>
                    
                    <div className="flex flex-col justify-center">
                        {isScrolled && activeCompetitionName ? (
                             <div className="animate-fade-in leading-tight">
                                <span className="text-[10px] md:text-xs text-blue-200 uppercase font-semibold block tracking-wider">
                                    {activeCategoryName}
                                </span>
                                <h1 className="text-base md:text-lg font-bold truncate max-w-[200px] md:max-w-md">
                                    {activeCompetitionName}
                                </h1>
                             </div>
                        ) : (
                            <h1 className="text-lg md:text-2xl font-bold tracking-tight animate-fade-in flex items-center gap-2">
                                Brafa Stats
                                {isAdmin && <Unlock size={14} className="text-green-400 opacity-70" />}
                            </h1>
                        )}
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex items-center gap-1 md:gap-2">
                    <NavLink 
                        to="/" 
                        className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${isActive ? 'bg-white text-fcbq-blue shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
                    >
                        <BarChart3 size={18} />
                        <span className="hidden md:inline">Estadísticas</span>
                    </NavLink>
                    
                    <NavLink 
                        to="/match-center" 
                        className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${isActive ? 'bg-white text-fcbq-blue shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
                    >
                        <CalendarDays size={18} />
                        <span className="hidden md:inline">Match Center</span>
                    </NavLink>
                </nav>
            </div>
        </div>
      </header>

      {/* Global Filter Section - Now handles the Title in collapsed mode */}
      <CompetitionFilters 
          temporadas={temporadas}
          categorias={categorias}
          competiciones={competiciones}
          loadingCompetitions={loadingCompetitions}
          selectedTemporada={selectedTemporada}
          selectedCategoria={selectedCategoria}
          selectedFase={selectedFase}
          selectedCompeticion={selectedCompeticion}
          onTemporadaChange={setSelectedTemporada}
          onCategoriaChange={setSelectedCategoria}
          onFaseChange={setSelectedFase}
          onCompeticionChange={setSelectedCompeticion}
          isScrolled={isScrolled}
      />

      {/* Main Content Area */}
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

        {/* Show loader ONLY if we don't have data yet (initial load) */}
        {isLoading && !viewData && (
             <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 size={56} className="text-fcbq-blue animate-spin mb-4" />
                <h3 className="text-2xl font-bold text-gray-800">Cargando datos...</h3>
                <p className="text-gray-500 mt-2 text-lg">Obteniendo información de la competición.</p>
             </div>
        )}

        {!viewData && !isLoading && !errorMsg && (
             <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 mt-8">
                <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
                    <Trophy size={56} className="text-fcbq-blue" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Selecciona una competición</h3>
                <p className="text-gray-500 mt-2 text-lg">Usa los filtros superiores para cargar los datos.</p>
             </div>
        )}

        {/* Routes Rendered Here - KEEP MOUNTED even if refreshing (loading=true but viewData exists) */}
        {viewData && (
            <div className={`animate-fade-in relative transition-opacity duration-200 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                {/* Overlay Loader for Refreshing Data */}
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-start justify-center pt-20">
                        <div className="bg-white/80 p-4 rounded-full shadow-lg border border-blue-100">
                             <Loader2 size={32} className="text-fcbq-blue animate-spin" />
                        </div>
                    </div>
                )}

                {/* Title Header Removed here - now in CompetitionFilters */}

                <Routes>
                    <Route path="/" element={<StatsView viewData={viewData} selectedCompeticionId={selectedCompeticion} />} />
                    <Route 
                        path="/match-center" 
                        element={
                            <ScoutingView 
                                viewData={viewData} 
                                selectedCompeticionId={selectedCompeticion} 
                                onMatchAdded={loadCompetitionData}
                                isAdmin={isAdmin}
                            />
                        } 
                    />
                </Routes>
            </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-10 text-center text-base">
        <p>&copy; {new Date().getFullYear()} Brafa Stats. Datos no oficiales para uso analítico.</p>
        <p className="text-[10px] text-slate-700 mt-2">
            {isAdmin 
                ? "Modo Gestión Activo. Haz clic 5 veces en el logo para salir." 
                : "Haz clic 5 veces en el logo para gestión."}
        </p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
        <AppContent />
    </Router>
  );
};

export default App;
