/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import SchoolCrest from './SchoolCrest.tsx';
import { 
  Lock, 
  Mail, 
  User, 
  BookOpen, 
  ArrowRight, 
  Sparkles, 
  HelpCircle,
  Clock,
  ShieldCheck,
  CheckCircle,
  EyeOff
} from 'lucide-react';

export default function AuthModal({ onGuestParentBypass }: { onGuestParentBypass: (index: string) => void }) {
  const { loginWithCredentials, signUpTeacher, error, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'principal' | 'teacher' | 'parent'>('principal');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('Pure Mathematics');
  const [parentIndexNumber, setParentIndexNumber] = useState('');

  // Flow State
  const [teacherPendingSuccess, setTeacherPendingSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();
    setLoading(true);

    try {
      if (role === 'parent') {
        const cleanIndex = parentIndexNumber.toUpperCase().trim();
        if (!cleanIndex) {
          throw new Error("Student Index Number is required to access parental records.");
        }
        onGuestParentBypass(cleanIndex);
        return;
      }

      if (isLogin) {
        // Principal or Teacher Login
        // For principal, email/username is 'admin' or email
        await loginWithCredentials(email || 'admin', password);
      } else {
        // Signup
        if (role === 'teacher') {
          if (!name || !email || !password || !subject) {
            throw new Error("All fields are mandatory to file a teacher application.");
          }
          await signUpTeacher(name, email, password, subject);
          setTeacherPendingSuccess(true);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (selectedRole: 'principal' | 'teacher' | 'parent') => {
    setRole(selectedRole);
    setFormError(null);
    clearError();
    setIsLogin(true); // Default to login on role switch
    setTeacherPendingSuccess(false);

    // Modern clean login: start with empty inputs
    setEmail('');
    setPassword('');
    setParentIndexNumber('');
  };

  return (
    <div id="auth_portal_container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] -z-10 opacity-60"></div>
      
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Aesthetic brand graphic */}
        <div className="bg-gradient-to-b from-[#4E342E] to-[#25120E] p-8 text-white flex flex-col justify-between items-center text-center relative md:max-w-xs">
          <div className="absolute inset-0 bg-[#C59B27]/10 rounded-full blur-2xl -z-10"></div>
          
          <div className="space-y-4">
            <SchoolCrest size="lg" className="mx-auto" />
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-lg leading-snug">கிளி/தருமபுரம் மத்திய கல்லூரி</h2>
              <p className="text-[9px] text-amber-200/90 uppercase tracking-widest font-mono">Kn/Tharumapuram College</p>
            </div>
          </div>

          <div className="hidden md:block pt-8 space-y-2">
            <p className="text-[11px] text-amber-100/80 font-serif leading-relaxed italic">
              "We provide high-quality primary and secondary courses to help students live exceptionally in Sri Lanka."
            </p>
            <div className="inline-flex items-center gap-1.5 text-[10px] text-[#FFEB3B] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Certified Portal Gate</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tab Form components */}
        <div className="flex-1 p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-xl font-serif font-bold text-slate-800">College Administration Portal</h1>
            <p className="text-slate-400 text-[11px] leading-snug">Verify your role clearance level to access academic databases.</p>
          </div>

          {/* Role select tabs row */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <button
              id="role_btn_principal"
              type="button"
              onClick={() => handleRoleSelect('principal')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'principal' 
                  ? 'bg-white text-[#4E342E] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Principal
            </button>
            <button
              id="role_btn_teacher"
              type="button"
              onClick={() => handleRoleSelect('teacher')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'teacher' 
                  ? 'bg-white text-[#4E342E] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Teacher
            </button>
            <button
              id="role_btn_parent"
              type="button"
              onClick={() => handleRoleSelect('parent')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'parent' 
                  ? 'bg-white text-[#4E342E] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Parent
            </button>
          </div>

          {/* Teacher pending success layout */}
          {teacherPendingSuccess && role === 'teacher' ? (
            <div className="space-y-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center animate-fade-in text-slate-700">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-slate-900 text-base">Teacher Request Registered Successfully!</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Your academic roster account registration is now listed as **Pending** in our administrative registry.
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 italic bg-white p-3 rounded-xl border border-slate-100 font-medium font-sans">
                "Please notify Principal P.Thavanesan via the administrative desk to approve your profile credentials before your first login."
              </p>
              <button
                type="button"
                onClick={() => {
                  setTeacherPendingSuccess(false);
                  setIsLogin(true);
                  setEmail('');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Return to Login Page
              </button>
            </div>
          ) : (
            /* Main Input Form */
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-500 font-sans">
              
              {/* Contextual Notice alerts */}
              {role === 'principal' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-slate-100 text-slate-700 flex items-start gap-2 text-[11px] leading-normal font-medium">
                  <Clock className="w-4 h-4 text-[#C59B27] flex-shrink-0 mt-0.5 animate-pulse" />
                  <p>
                    <strong>Administrative Registry Portal:</strong> Access is restricted to verified Principal Office credentials.
                  </p>
                </div>
              )}

               {role === 'parent' && (
                <div className="p-4 rounded-2xl bg-[#FDFCFB] border border-amber-200 text-slate-700 space-y-3 font-semibold">
                  <div className="flex items-start gap-2 text-[11px] leading-normal">
                    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-slate-700 font-bold">
                      <strong>Index-Only Login Mode:</strong> Simply enter your student's official index number below to retrieve certified scores instantly.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="auth_parent_index" className="text-[10px] text-slate-550 uppercase font-bold">Child Student Index Number *</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="auth_parent_index"
                        type="text"
                        placeholder="e.g. STU202601"
                        value={parentIndexNumber}
                        onChange={(e) => setParentIndexNumber(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] font-mono font-bold text-xs bg-slate-50 uppercase text-[#4E342E]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Input fields */}
              {(!isLogin && role === 'teacher') && (
                <div className="space-y-1">
                  <label htmlFor="auth_name">Full Administrative Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="auth_name"
                      type="text"
                      placeholder="e.g. Mrs. Tharmika Sivakumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] font-sans text-xs bg-slate-50 font-medium"
                    />
                  </div>
                </div>
              )}

              {isLogin && role === 'teacher' && (
                <div className="space-y-1">
                  <label htmlFor="auth_email">Official Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="auth_email"
                      type="email"
                      placeholder="e.g. teacher@tharumapuram.lk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] font-sans text-xs bg-slate-50 font-medium"
                    />
                  </div>
                </div>
              )}

              {role === 'principal' && (
                <div className="space-y-1">
                  <label htmlFor="auth_username">Office Registry Username *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="auth_username"
                      type="text"
                      placeholder="admin"
                      value={email || 'admin'}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] font-sans text-xs bg-slate-50 font-bold"
                    />
                  </div>
                </div>
              )}

              {role !== 'parent' && (
                <div className="space-y-1">
                  <label htmlFor="auth_pass">Secured Access Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="auth_pass"
                      type="password"
                      placeholder="Enter password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] font-sans text-xs bg-slate-50 font-bold"
                    />
                  </div>
                </div>
              )}

              {!isLogin && role === 'teacher' && (
                <>
                  <div className="space-y-1">
                    <label htmlFor="auth_signup_email">Official Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="auth_signup_email"
                        type="email"
                        placeholder="e.g. teacher@tharumapuram.lk"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] font-sans text-xs bg-slate-50 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label htmlFor="auth_subject">Specialist Syllabus Course *</label>
                    <select
                      id="auth_subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none text-slate-700 font-sans font-medium text-xs text-semibold"
                    >
                      <option value="Pure Mathematics">Pure Mathematics</option>
                      <option value="Science & Technology">Science & Technology</option>
                      <option value="English Language">English Language</option>
                      <option value="Tamil Language">Tamil Language</option>
                      <option value="Sri Lankan History">Sri Lankan History</option>
                    </select>
                  </div>
                </>
              )}

              {/* Error loggings banner */}
              {(formError || error) && (
                <p className="text-[11px] leading-relaxed text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium font-sans">
                  {formError || error}
                </p>
              )}

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white font-bold py-3 rounded-xl hover:shadow shadow-sm transition-all text-xs"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>
                      {role === 'parent' 
                        ? 'Access Parent Portal' 
                        : (isLogin ? `Log in as ${role === 'principal' ? 'Principal' : 'Teacher'}` : `Submit Teacher Application`)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Form Toggles isLogin state links */}
              {role === 'teacher' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setFormError(null);
                      clearError();
                    }}
                    className="text-[11px] text-[#4E342E] hover:underline font-bold"
                  >
                    {isLogin ? "Join Faculty? Submit a new Teacher request &rarr;" : "Already have approved credentials? Log in &larr;"}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* School System Footer */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-center text-[10px] text-slate-400 font-mono tracking-normal leading-normal pt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Certified Sri Lankan Provincial Educational Registry.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
