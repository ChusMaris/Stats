
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchTemporadas, fetchCategorias, fetchCompeticiones, fetchCompeticionDetails } from './services/dataService';
import { Temporada, Categoria, Competicion, RecentCompetition } from './types';
import CompetitionFilters from './components/CompetitionFilters';
import StatsView from './components/StatsView';
import ScoutingView from './components/ScoutingView';
import LandingPage from './components/LandingPage';
// @ts-ignore
import logoImg from './src/assets/images/fedstats_header_logo.png';
import PlayersPage from './components/PlayersPage';
import TeamsPage from './components/TeamsPage';
import LoginLandingPage from './components/LoginLandingPage';
import { supabase } from './supabaseClient';
import { Loader2, Trophy, AlertCircle, BarChart3, CalendarDays, Shield, Unlock, Users, Home, User, LogOut, LogIn } from 'lucide-react';
import { getActiveCompetition, getRecentCompetitions, setActiveCompetition, upsertRecentCompetition } from './utils/competitionStorage';

type ViewDataState = {
  matches: any[];
  realMatches: any[];
  equipos: any[];
  competicion: Competicion | null;
} | null;

const getInitialSelection = () => getActiveCompetition();

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSelection = useMemo(() => getInitialSelection(), []);

  // --- Auth & Profile States ---
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authBypassed, setAuthBypassed] = useState<boolean>(() => {
    return localStorage.getItem('catstats_bypass_auth') === 'true';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse URL parameters smoothly to toggle Google Auth requirement (?auth=false or ?login=off)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get('auth');
    const loginParam = params.get('login');
    
    let didChange = false;

    if (authParam === 'false' || loginParam === 'off') {
      localStorage.setItem('catstats_bypass_auth', 'true');
      setAuthBypassed(true);
      didChange = true;
      console.log("🔑 Google Auth desactivado por URL (?login=off / ?auth=false)");
    } else if (authParam === 'true' || loginParam === 'on') {
      localStorage.setItem('catstats_bypass_auth', 'false');
      setAuthBypassed(false);
      didChange = true;
      console.log("🔑 Google Auth activado por URL (?login=on / ?auth=true)");
    }

    if (didChange) {
      // Remove query parameters from URL without reloading
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Check database configuration (if adjustments table exists, they can toggle globally)
  const checkDatabaseAuthSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('ajustes')
        .select('valor')
        .eq('clave', 'requiere_login')
        .maybeSingle();

      if (!error && data) {
        const requiereLogin = data.valor === 'true' || data.valor === true || data.valor === '1';
        if (!requiereLogin) {
          console.log("🌐 Configuración global de base de datos activa: requiere_login = false. Desactivando Google Login.");
          setAuthBypassed(true);
          localStorage.setItem('catstats_bypass_auth', 'true');
        } else {
          console.log("🌐 Configuración global de base de datos activa: requiere_login = true.");
        }
      }
    } catch (e) {
      // Ignore if table public.ajustes doesn't exist yet
    }
  };

  // 1. Check if the app runs inside a popup to process the OAuth code/token and notify the parent
  useEffect(() => {
    const isPopup = window.opener && window.opener !== window;
    const hasHash = window.location.hash && (
      window.location.hash.includes('access_token=') || 
      window.location.hash.includes('error=')
    );

    if (isPopup && hasHash) {
      console.log("OAuth popup callback detected, notifying opener...");
      const timer = setTimeout(() => {
        try {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, window.location.origin);
          window.close();
        } catch (e) {
          console.error("Failed to notify parent window:", e);
          window.close();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // 1b. Clean hash route from URL if it's an access token or error from Supabase in the main window
  useEffect(() => {
    const isMainAndHasAuth = (location.pathname.startsWith('/access_token=') || location.pathname.startsWith('/error=')) && !(window.opener && window.opener !== window);
    if (isMainAndHasAuth) {
      console.log("Main window: detected access token route, cleaning and redirecting to root...");
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, navigate]);

  // 2. Synchronize auth profile details with the public.usuarios table
  const syncUserToDatabase = async (authUser: any) => {
    if (!authUser) return;
    try {
      console.log("👥 Intentando registrar/sincronizar usuario en public.usuarios...");
      
      const { error } = await supabase
        .from('usuarios')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          nombre: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
          avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("❌ Error de registro/UPSERT de usuario en public.usuarios:", error);
      } else {
        console.log("✅ Registro de usuario completado con éxito en public.usuarios.");
      }
    } catch (err) {
      console.error("❌ Excepción controlada al sincronizar usuario en tabla public.usuarios:", err);
    }
  };

  // 3. Check current active session
  const checkUserSession = async () => {
    try {
      // First check DB adjustments global toggle
      await checkDatabaseAuthSetting();

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Sync in background to prevent blocking authentication state and keep it non-blocking
        syncUserToDatabase(session.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  // 4. Initial session check & subscription for updates
  useEffect(() => {
    checkUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Sync in background to prevent blocking authentication state and keep it non-blocking
        syncUserToDatabase(session.user);
      } else {
        setUser(null);
      }
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 5. Parent message listener to reload user session
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        console.log("Login success notified from popup.");
        checkUserSession();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 6. Register click outside listener for User Header dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 7. Sign out helper
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setIsDropdownOpen(false);
      navigate('/');
    } catch (err: any) {
      alert("Error al cerrar sesión: " + (err.message || err));
    }
  };

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
  const [recentSearches, setRecentSearches] = useState<RecentCompetition[]>(() => getRecentCompetitions());

  const [selectedTemporada, setSelectedTemporada] = useState<string>(() => initialSelection?.temporadaId || '');
  const [selectedCategoria, setSelectedCategoria] = useState<string>(() => initialSelection?.categoriaId || '');
  const [selectedFase, setSelectedFase] = useState<string>(() => initialSelection?.fase || '');
  const [selectedCompeticion, setSelectedCompeticion] = useState<string>(() => initialSelection?.id || '');
  
  // --- UI State ---
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);

  // --- Global Data State ---
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewData, setViewData] = useState<ViewDataState>(null);

  const isLandingRoute = location.pathname === '/';
  const isStatsRoute = location.pathname === '/stats';
  const isMatchCenterRoute = location.pathname === '/match-center';
  const isPlayersRoute = location.pathname === '/players';
  const isTeamsRoute = location.pathname === '/teams';
  const shouldShowStickyShell = isStatsRoute || isMatchCenterRoute;

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
    let rafId: number | null = null;

    // Hysteresis avoids oscillation/flicker when sticky header height changes near the threshold.
    const MOBILE_ENTER_THRESHOLD = 92;
    const MOBILE_LEAVE_THRESHOLD = 36;
    const DESKTOP_ENTER_THRESHOLD = 72;
    const DESKTOP_LEAVE_THRESHOLD = 28;

    const updateScrollState = () => {
      const y = window.scrollY || 0;
      const isMobile = window.innerWidth < 768;

      const enterThreshold = isMobile ? MOBILE_ENTER_THRESHOLD : DESKTOP_ENTER_THRESHOLD;
      const leaveThreshold = isMobile ? MOBILE_LEAVE_THRESHOLD : DESKTOP_LEAVE_THRESHOLD;

      const next = isScrolledRef.current
        ? y > leaveThreshold
        : y > enterThreshold;

      if (next !== isScrolledRef.current) {
        isScrolledRef.current = next;
        setIsScrolled(next);
      }

      rafId = null;
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateScrollState);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // --- Auto-Collapse Filters when Competition Selected ---
  useEffect(() => {
    if (selectedCompeticion) {
        setIsFilterExpanded(false);
    } else {
        setIsFilterExpanded(true);
    }
  }, [selectedCompeticion]);

  // --- Update Competitions when Temp/Cat changes ---
  useEffect(() => {
    if (selectedTemporada && selectedCategoria) {
      const loadComps = async () => {
        setLoadingCompetitions(true);
        setErrorMsg(null);
        try {
          const comps = await fetchCompeticiones(selectedTemporada, selectedCategoria);
          setCompeticiones(comps);

          if (selectedCompeticion && !comps.some((comp) => String(comp.id) === selectedCompeticion)) {
            setSelectedCompeticion('');
            setViewData(null);
          }
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
    }
  }, [selectedTemporada, selectedCategoria]);

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
          const comp = details.competicion || competiciones.find(c => c.id.toString() === selectedCompeticion) || null;
          
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
    if (selectedCompeticion) {
      loadCompetitionData();
    }
  }, [selectedCompeticion, selectedCategoria, categorias]);

  useEffect(() => {
    if (!selectedCompeticion) return;
    if (!shouldShowStickyShell) return;

    const loadedCompetitionId = viewData?.competicion?.id ? String(viewData.competicion.id) : '';

    if (!viewData || loadedCompetitionId !== String(selectedCompeticion)) {
      loadCompetitionData();
    }
  }, [shouldShowStickyShell, selectedCompeticion, viewData]);



  const buildRecentCompetition = (competitionId = selectedCompeticion): RecentCompetition | null => {
    if (!competitionId || !selectedTemporada || !selectedCategoria) return null;

    const competencia = competiciones.find((item) => String(item.id) === String(competitionId));
    const temporada = temporadas.find((item) => String(item.id) === selectedTemporada);
    const categoria = categorias.find((item) => String(item.id) === selectedCategoria);

    if (!competencia || !temporada || !categoria) return null;

    return {
      id: String(competencia.id),
      nombre: competencia.nombre,
      temporadaId: String(temporada.id),
      categoriaId: String(categoria.id),
      temporadaNombre: temporada.nombre,
      categoriaNombre: categoria.nombre,
      fase: selectedFase || undefined,
      timestamp: Date.now(),
    };
  };

  const syncStoredCompetition = (item: RecentCompetition, pushToHistory: boolean) => {
    setActiveCompetition(item);

    if (pushToHistory) {
      setRecentSearches(upsertRecentCompetition(item));
      return;
    }

    setRecentSearches(getRecentCompetitions());
  };

  useEffect(() => {
    const item = buildRecentCompetition();
    if (item) {
      setActiveCompetition(item);
    }
  }, [selectedCompeticion, selectedTemporada, selectedCategoria, selectedFase, competiciones, temporadas, categorias]);

  const handleTemporadaChange = (value: string) => {
    if (value === selectedTemporada) return;
    setSelectedTemporada(value);
    setSelectedCategoria('');
    setSelectedFase('');
    setSelectedCompeticion('');
    setCompeticiones([]);
    setViewData(null);
    setIsFilterExpanded(true);
  };

  const handleCategoriaChange = (value: string) => {
    if (value === selectedCategoria) return;
    setSelectedCategoria(value);
    setSelectedFase('');
    setSelectedCompeticion('');
    setViewData(null);
    setIsFilterExpanded(true);
  };

  const handleFaseChange = (value: string) => {
    if (value === selectedFase) return;
    setSelectedFase(value);
    setSelectedCompeticion('');
    setViewData(null);
    setIsFilterExpanded(true);
  };

  const handleCompeticionChange = (value: string) => {
    setSelectedCompeticion(value);

    if (!value) {
      setViewData(null);
      return;
    }

    if (isLandingRoute) {
      const competencia = competiciones.find((item) => String(item.id) === String(value));
      const temporada = temporadas.find((item) => String(item.id) === selectedTemporada);
      const categoria = categorias.find((item) => String(item.id) === selectedCategoria);

      if (competencia && temporada && categoria) {
        const item: RecentCompetition = {
          id: String(competencia.id),
          nombre: competencia.nombre,
          temporadaId: String(temporada.id),
          categoriaId: String(categoria.id),
          temporadaNombre: temporada.nombre,
          categoriaNombre: categoria.nombre,
          fase: selectedFase || undefined,
          timestamp: Date.now(),
        };

        syncStoredCompetition(item, true);
        navigate('/stats');
      }

      return;
    }

    if (isStatsRoute || isMatchCenterRoute) {
      const item = buildRecentCompetition(value);
      if (item) {
        syncStoredCompetition(item, true);
      }
    }
  };

  const handleOpenRecentSearch = (item: RecentCompetition) => {
    setSelectedTemporada(item.temporadaId);
    setSelectedCategoria(item.categoriaId);
    setSelectedFase(item.fase || '');
    setSelectedCompeticion(item.id);
    setViewData(null);
    setIsFilterExpanded(false);
    syncStoredCompetition({ ...item, timestamp: Date.now() }, true);
    navigate('/stats');
  };

  const activeCompetitionName = viewData?.competicion?.nombre || competiciones.find(c => c.id.toString() === selectedCompeticion)?.nombre;

  const renderTopHeader = (sticky: boolean) => (
    <header className={`bg-primary text-white shadow-md transition-all duration-300 w-full h-16 flex items-center justify-between px-margin-mobile md:px-margin-desktop shrink-0 ${sticky ? '' : 'relative'}`}>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center overflow-hidden cursor-pointer select-none active:scale-95 transition-transform"
          onClick={handleSecretClick}
          title={isAdmin ? "Modo Gestión Activo" : "Haz clic para Gestión"}
        >
          <img 
            className="h-12 md:h-14 w-auto object-contain" 
            src={logoImg} 
            alt="FedStats Logo"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Desktop Navigation & User Profile Dropdown Container */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          <NavLink
            to="/"
            className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${isActive ? 'bg-white/15 text-white shadow-sm font-black border-white/10' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
          >
            <Home size={14} />
            <span>Inicio</span>
          </NavLink>
 
          <NavLink
            to="/stats"
            onClick={(e) => {
              if (!selectedCompeticion) {
                e.preventDefault();
                alert("Por favor, selecciona primero una competición.");
              }
            }}
            className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${!selectedCompeticion ? 'opacity-40 cursor-not-allowed' : isActive ? 'bg-white/15 text-white shadow-sm font-black border-white/10' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
          >
            <BarChart3 size={14} />
            <span>Estadísticas</span>
          </NavLink>
 
          <NavLink
            to="/match-center"
            onClick={(e) => {
              if (!selectedCompeticion) {
                e.preventDefault();
                alert("Por favor, selecciona primero una competición.");
              }
            }}
            className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${!selectedCompeticion ? 'opacity-40 cursor-not-allowed' : isActive ? 'bg-white/15 text-white shadow-sm font-black border-white/10' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
          >
            <CalendarDays size={14} />
            <span>Match Center</span>
          </NavLink>
 
          <NavLink
            to="/players"
            className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${isActive ? 'bg-white/15 text-white shadow-sm font-black border-white/10' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
          >
            <Users size={14} />
            <span>Jugadores</span>
          </NavLink>
 
          <NavLink
            to="/teams"
            className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${isActive ? 'bg-white/15 text-white shadow-sm font-black border-white/10' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
          >
            <Shield size={14} />
            <span>Equipos</span>
          </NavLink>
        </nav>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 p-1 hover:bg-white/10 rounded-full transition-all focus:outline-none cursor-pointer"
            aria-label="Menú de usuario"
          >
            {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
              <img
                src={user.user_metadata.avatar_url || user.user_metadata.picture}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-outline-variant shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-container border border-outline-variant flex items-center justify-center overflow-hidden">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            )}
          </button>

          {isDropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2.5 z-50 text-slate-800 animate-fade-in origin-top-right text-left"
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-extrabold text-sm text-slate-900 truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Modo Invitado'}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                  {user?.email || 'Acceso Libre'}
                </p>
              </div>
              
              <div className="p-1.5">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-neutral-50 font-bold text-xs transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={14} className="stroke-[2.5]" />
                    <span>Cerrar sesión</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      localStorage.setItem('catstats_bypass_auth', 'false');
                      setAuthBypassed(false);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-fcbq-blue hover:bg-neutral-50 font-bold text-xs transition-colors text-left cursor-pointer"
                  >
                    <LogIn size={14} className="stroke-[2.5]" />
                    <span>Iniciar sesión (Google)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  const renderBottomNav = () => {
    const isHomeActive = location.pathname === '/';
    const isStatsActive = location.pathname === '/stats';
    const isMatchesActive = location.pathname === '/match-center';
    const isPlayersActive = location.pathname === '/players';
    const isTeamsActive = location.pathname === '/teams';

    const getLinkClass = (isActive: boolean) => 
      `flex flex-col items-center justify-center transition-all flex-1 py-1 ${
        isActive 
          ? 'text-primary font-bold' 
          : 'text-on-surface-variant opacity-60 hover:bg-surface-container-low'
      }`;

    return (
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center h-16 px-base pb-safe md:hidden shadow-lg text-center">
        <Link to="/" className={getLinkClass(isHomeActive)}>
          <span className="material-symbols-outlined" style={isHomeActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>home</span>
          <span className="text-[10px] font-semibold tracking-wider">INICIO</span>
        </Link>

        <button
          onClick={() => {
            if (!selectedCompeticion) {
              alert("Selecciona primero una competición en la página de inicio.");
            } else {
              navigate('/stats');
            }
          }}
          className={`${getLinkClass(isStatsActive)} ${!selectedCompeticion ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined" style={isStatsActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>bar_chart</span>
          <span className="text-[10px] font-semibold tracking-wider">STATS</span>
        </button>

        <button
          onClick={() => {
            if (!selectedCompeticion) {
              alert("Selecciona primero una competición en la página de inicio.");
            } else {
              navigate('/match-center');
            }
          }}
          className={`${getLinkClass(isMatchesActive)} ${!selectedCompeticion ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined" style={isMatchesActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>calendar_today</span>
          <span className="text-[10px] font-semibold tracking-wider">PARTIDOS</span>
        </button>

        <Link to="/players" className={getLinkClass(isPlayersActive)}>
          <span className="material-symbols-outlined" style={isPlayersActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>group</span>
          <span className="text-[10px] font-semibold tracking-wider">JUGADORES</span>
        </Link>

        <Link to="/teams" className={getLinkClass(isTeamsActive)}>
          <span className="material-symbols-outlined" style={isTeamsActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>shield</span>
          <span className="text-[10px] font-semibold tracking-wider">EQUIPOS</span>
        </Link>
      </nav>
    );
  };

  const renderDataRoute = (route: 'stats' | 'match-center') => {
    if (isLoading && !viewData) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 size={56} className="text-fcbq-blue animate-spin mb-4" />
          <h3 className="text-2xl font-bold text-gray-800">Cargando datos...</h3>
          <p className="text-gray-500 mt-2 text-lg">Obteniendo información de la competición.</p>
        </div>
      );
    }

    if (!viewData && !isLoading && !errorMsg) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 mt-8">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
            <Trophy size={56} className="text-fcbq-blue" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Selecciona una competición</h3>
          <p className="text-gray-500 mt-2 text-lg">Usa los filtros superiores para cargar los datos.</p>
        </div>
      );
    }

    if (!viewData) {
      return null;
    }

    return (
      <div className={`animate-fade-in relative transition-opacity duration-200 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-20">
            <div className="bg-white/80 p-4 rounded-full shadow-lg border border-blue-100">
              <Loader2 size={32} className="text-fcbq-blue animate-spin" />
            </div>
          </div>
        )}

        {route === 'stats' ? (
          <StatsView viewData={viewData} selectedCompeticionId={selectedCompeticion} />
        ) : (
          <ScoutingView
            viewData={viewData}
            selectedCompeticionId={selectedCompeticion}
            onMatchAdded={loadCompetitionData}
            isAdmin={isAdmin}
          />
        )}
      </div>
    );
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 size={48} className="text-fcbq-blue animate-spin mb-4" strokeWidth={2.5} />
        <h3 className="text-lg font-bold text-slate-800">Cargando sesión...</h3>
        <p className="text-sm text-slate-400 mt-1">Verificando credenciales de acceso</p>
      </div>
    );
  }

  if (!user && !authBypassed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative">
        {errorMsg && (
          <div className="fixed top-4 left-4 right-4 z-50 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-md flex items-start gap-3 max-w-md mx-auto animate-fade-in">
             <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
             <div>
               <p className="font-bold text-red-800 text-xs">Error de acceso</p>
               <p className="text-[14px] text-red-700">{errorMsg}</p>
             </div>
          </div>
        )}
        <LoginLandingPage
          onLoginStart={() => {
            setErrorMsg(null);
          }}
          onLoginError={(msg) => {
            setErrorMsg(msg);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans text-slate-800 ${isLandingRoute ? 'bg-white' : 'bg-slate-50'}`}>
      {isLandingRoute ? (
        /* Transparent minimal header for LandingPage */
        <header className="flex justify-end items-center px-6 h-16 w-full fixed top-0 right-0 z-50 bg-transparent">
          <div className="flex items-center space-x-4 pr-2 md:pr-4 pt-4">
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-200 transition-colors focus:outline-none"
                aria-label="Menú de usuario"
              >
                {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[24px] text-slate-500">person</span>
                )}
              </button>

              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2.5 z-50 text-slate-800 animate-fade-in origin-top-right text-left"
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-extrabold text-sm text-slate-900 truncate">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Modo Invitado'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                      {user?.email || 'Acceso Libre'}
                    </p>
                  </div>
                  
                  <div className="p-1.5">
                    {user ? (
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-neutral-50 font-bold text-xs transition-colors text-left cursor-pointer"
                      >
                        <LogOut size={14} className="stroke-[2.5]" />
                        <span>Cerrar sesión</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          localStorage.setItem('catstats_bypass_auth', 'false');
                          setAuthBypassed(false);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-fcbq-blue hover:bg-neutral-50 font-bold text-xs transition-colors text-left cursor-pointer"
                      >
                        <LogIn size={14} className="stroke-[2.5]" />
                        <span>Iniciar sesión (Google)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      ) : shouldShowStickyShell ? (
        <div className="sticky top-0 z-40 bg-white shadow-md flex flex-col transition-all duration-300">
          {renderTopHeader(true)}
          <CompetitionFilters
            temporadas={temporadas}
            categorias={categorias}
            competiciones={competiciones}
            loadingCompetitions={loadingCompetitions}
            selectedTemporada={selectedTemporada}
            selectedCategoria={selectedCategoria}
            selectedFase={selectedFase}
            selectedCompeticion={selectedCompeticion}
            onTemporadaChange={handleTemporadaChange}
            onCategoriaChange={handleCategoriaChange}
            onFaseChange={handleFaseChange}
            onCompeticionChange={handleCompeticionChange}
            isScrolled={isScrolled}
            isExpanded={isFilterExpanded}
            setIsExpanded={setIsFilterExpanded}
          />
        </div>
      ) : (
        renderTopHeader(false)
      )}

      <main className={`flex-grow container mx-auto px-2 md:px-4 ${isLandingRoute ? 'py-0' : 'py-8'} pb-24 md:pb-8 relative z-10`}>
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm flex items-start gap-3">
             <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
             <div>
               <p className="font-bold text-red-800 text-base">Atención</p>
               <p className="text-sm text-red-700">{errorMsg}</p>
             </div>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                temporadas={temporadas}
                categorias={categorias}
                competiciones={competiciones}
                loadingCompetitions={loadingCompetitions}
                selectedTemporada={selectedTemporada}
                selectedCategoria={selectedCategoria}
                selectedFase={selectedFase}
                selectedCompeticion={selectedCompeticion}
                onTemporadaChange={handleTemporadaChange}
                onCategoriaChange={handleCategoriaChange}
                onFaseChange={handleFaseChange}
                onCompeticionChange={handleCompeticionChange}
                recentSearches={recentSearches}
                onOpenRecent={handleOpenRecentSearch}
                hasActiveCompetition={Boolean(selectedCompeticion)}
              />
            }
          />
          <Route path="/stats" element={renderDataRoute('stats')} />
          <Route path="/match-center" element={renderDataRoute('match-center')} />
          <Route path="/players" element={<PlayersPage activeCompetitionName={activeCompetitionName} />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/access_token=*" element={
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 text-center max-w-md mx-auto my-12 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 size={48} className="text-fcbq-blue animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Iniciando sesión segura...</h3>
              <p className="text-slate-400 mt-2 text-sm">Espere mientras procesamos su autenticación.</p>
            </div>
          } />
          <Route path="/error=*" element={
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 text-center max-w-md mx-auto my-12 flex flex-col items-center justify-center min-h-[300px]">
              <div className="inline-block p-4 bg-red-50 rounded-full mb-4">
                <AlertCircle size={48} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Error de autenticación</h3>
              <p className="text-slate-500 mt-2 text-sm">Hubo un problema al iniciar sesión con Google.</p>
              <button onClick={() => navigate('/', { replace: true })} className="mt-6 px-6 py-2 bg-fcbq-blue text-white rounded-xl hover:bg-fcbq-dark transition-colors font-semibold text-xs uppercase tracking-wider">
                Volver al inicio
              </button>
            </div>
          } />
        </Routes>
      </main>

      {!isLandingRoute && (
        <footer className="w-full bg-tertiary text-on-tertiary pt-3 pb-20 px-4 md:py-4 md:px-6 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-2 md:gap-4 mt-auto">
          <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4">
            <span className="text-xs font-black tracking-wider uppercase">FedStats</span>
            <p className="text-[10px] opacity-70">© {new Date().getFullYear()} FedStats. Datos no oficiales para uso analítico.</p>
          </div>

          <nav className="flex justify-center gap-4 text-[10px]">
            <a className="text-on-tertiary opacity-70 hover:opacity-100 transition-opacity" href="#/privacy" onClick={(e) => e.preventDefault()}>Privacidad</a>
            <a className="text-on-tertiary opacity-70 hover:opacity-100 transition-opacity" href="#/terms" onClick={(e) => e.preventDefault()}>Términos</a>
            <a className="text-on-tertiary opacity-70 hover:opacity-100 transition-opacity" href="#/contact" onClick={(e) => e.preventDefault()}>Contacto</a>
          </nav>
        </footer>
      )}
      {renderBottomNav()}
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