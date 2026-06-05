/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import SchoolCrest from './components/SchoolCrest.tsx';
import AuthModal from './components/AuthModal.tsx';
import PrincipalDashboard from './components/PrincipalDashboard.tsx';
import TeacherDashboard from './components/TeacherDashboard.tsx';
import ParentPortal from './components/ParentPortal.tsx';
import { LogOut, GraduationCap, Clock, ShieldCheck, UserCircle, LogIn } from 'lucide-react';

function AppContent() {
  const { user, logoutUser, loading } = useAuth();
  
  // High usability: allows parent to view transcripts directly without account logs
  const [guestParentIndex, setGuestParentIndex] = useState<string | null>(null);

  // Live timer for institutional exact record tracking (local clock sync)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatLocalTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getDayGreeting = () => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'காலை வணக்கம் | Good Morning';
    if (hours < 17) return 'மதிய வணக்கம் | Good Afternoon';
    return 'மாலை வணக்கம் | Good Evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-700">
        <SchoolCrest size="lg" className="animate-pulse" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 border-4 border-[#C59B27] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-mono text-slate-400 mt-2">SYS_INIT: Booting college databases...</p>
        </div>
      </div>
    );
  }

  // Authentication Gate: if no active profile AND not in guest parent bypass mode
  if (!user && !guestParentIndex) {
    return (
      <AuthModal 
        onGuestParentBypass={(index: string) => {
          setGuestParentIndex(index);
        }} 
      />
    );
  }

  return (
    <div id="full_page_application_layout" className="min-h-screen bg-[#fafbfc] text-slate-850 flex flex-col">
      {/* Premium Header Rail */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo & Institution Brand Names block */}
          <div className="flex items-center gap-3">
            <SchoolCrest size="sm" className="hidden sm:block" />
            <div className="space-y-0.5">
              <h1 id="app_brand_tamil_title" className="text-sm sm:text-base font-bold text-slate-900 leading-none Tamil-Font">
                கிளி/தருமபுரம் மத்திய கல்லூரி
              </h1>
              <h2 id="app_brand_english_title" className="text-xs sm:text-sm font-serif font-semibold text-[#4E342E] leading-none">
                Kn/Tharumapuram Central College
              </h2>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono hidden md:block">
                Northern Province, Kilinochchi Education office
              </p>
            </div>
          </div>

          {/* Clock timer display (Northern Sri Lanka UTC +05:30) */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-mono font-medium text-slate-500">
            <Clock className="w-4 h-4 text-[#C59B27]" />
            <span>UTC +05:30: <strong>{formatLocalTime()}</strong></span>
          </div>

          {/* User Controls and Profile Dropdown context */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-1.5 pr-3 rounded-full">
                <div className="w-8 h-8 rounded-full bg-amber-100/60 text-[#4E342E] font-bold text-xs flex items-center justify-center border border-white">
                  {user.name.charAt(0)}
                </div>
                
                <div className="text-left font-sans hidden sm:block">
                  <p id="nav_user_name" className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
                  <span id="nav_user_role" className="text-[9px] font-mono uppercase text-[#4E342E] font-extrabold tracking-wider mt-0.5 block leading-none">
                    {user.role} Privilege
                  </span>
                </div>

                <button
                  id="btn_app_logout"
                  onClick={logoutUser}
                  title="Verify Log out"
                  className="p-1 px-2 text-slate-400 hover:text-[#4E342E] hover:bg-amber-50/50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* If Parent Portal Bypass is active (non-logged-in guest) */
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-amber-800 text-[10px] font-mono font-bold uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" /> Guest Parent Lookup
                </div>
                
                <button
                  id="btn_exit_parent_bypass"
                  onClick={() => setGuestParentIndex(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Teacher / Admin Login</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Greeting Ribbon Banner */}
      <div className="bg-slate-900 px-4 py-2 text-center text-[10px] sm:text-xs font-serif text-slate-300 border-b border-slate-800">
        🍃 {getDayGreeting()} — "வாழ்வாங்கு வாழக் கல்வி" | Education to Live Exceptionally.
      </div>

      {/* Main Core Content Renders */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Render Guest Parent bypass view directly */}
        {guestParentIndex && !user && (
          <ParentPortal initialIndex={guestParentIndex} />
        )}

        {/* Render standard logged-in dashboards */}
        {user && (
          <>
            {user.role === 'principal' && <PrincipalDashboard />}
            {user.role === 'teacher' && <TeacherDashboard />}
            {user.role === 'parent' && <ParentPortal />}
          </>
        )}

      </main>

      {/* Footer institutional information */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-[10px] sm:text-xs text-slate-400 font-mono tracking-wide mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Kn/Tharumapuram Central College, Kilinochchi. All Rights Reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-[#C59B27] cursor-pointer">Education Ministry Rules</span>
            <span>•</span>
            <span className="hover:text-[#C59B27] cursor-pointer">Registry Registry Database Verification</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
