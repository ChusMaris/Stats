import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, ShieldAlert, BadgeCheck } from 'lucide-react';
// @ts-ignore
import logoImg from '../src/assets/images/fedstats_header_logo.png';

interface LoginLandingPageProps {
  onLoginStart: () => void;
  onLoginError: (errorMsg: string) => void;
}

const LoginLandingPage: React.FC<LoginLandingPageProps> = ({ onLoginStart, onLoginError }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    onLoginStart();
    try {
      // Construction of OAuth redirect URL
      let redirectUrl = window.location.origin + window.location.pathname;
      if (!redirectUrl.endsWith('/')) {
        redirectUrl += '/';
      }
      
      console.log('🔄 Iniciando OAuth de Google con Redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Error in Google Login init:', err);
      onLoginError(err.message || 'Error al conectar con Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 md:p-8 font-sans">
      {/* Spacer to push card down and balance layout */}
      <div className="h-4 md:h-8" />

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8 flex flex-col items-center text-center space-y-6">
        <div className="w-full bg-slate-900 rounded-2xl p-6 flex items-center justify-center shadow-inner">
          <img 
            className="w-full max-h-28 md:max-h-36 object-contain scale-105" 
            src={logoImg} 
            alt="FedStats Logo"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Acceso a la Plataforma
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Consulta estadísticas de la Federación Catalana de Baloncesto de manera sencilla y móvil.
          </p>
        </div>

        {/* Feature badges for trust/explaining */}
        <div className="w-full py-4 px-3 bg-slate-50 rounded-2xl space-y-3 text-left">
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <BadgeCheck size={16} className="text-green-500 shrink-0" />
            <span>Estadísticas detalladas de jugadores y equipos</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <BadgeCheck size={16} className="text-green-500 shrink-0" />
            <span>Filtros avanzados por temporada y categoría</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <BadgeCheck size={16} className="text-green-500 shrink-0" />
            <span>Buscador y tracking de tus favoritos</span>
          </div>
        </div>

        {/* Google Login Button conforming to Google guidelines */}
        <div className="w-full pt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl border border-slate-300 shadow-sm transition-all text-sm active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            id="google-login-btn"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-slate-500" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>{loading ? 'Iniciando conexión...' : 'Iniciar sesión con Google'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 justify-center text-[10px] text-slate-400 font-medium">
          <ShieldAlert size={12} className="stroke-[2.5]" />
          <span>Inicio de sesión seguro por Supabase Auth</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 mt-8 mb-4">
        &copy; {new Date().getFullYear()} FedStats. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default LoginLandingPage;
