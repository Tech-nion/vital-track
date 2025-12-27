
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Utensils, 
  Dumbbell, 
  LineChart as ChartIcon, 
  User as UserIcon, 
  Plus, 
  TrendingUp, 
  Flame, 
  Target,
  ChevronRight,
  BrainCircuit,
  Settings,
  MessageSquare,
  Send,
  AlertCircle,
  X,
  Footprints,
  LogOut,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Droplets,
  Clock,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { 
  UserProfile, 
  Gender, 
  ActivityLevel, 
  Goal, 
  FoodLog, 
  ExerciseLog, 
  WeightLog, 
  StepLog,
  HealthStats,
  User
} from './types';
import { calculateHealthStats, formatTimestamp } from './utils/calculations';
import { getHealthInsights, askHealthQuestion } from './geminiService';
import { authService, supabase } from './authService';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "New User",
  age: 28,
  gender: Gender.MALE,
  height: 180,
  currentWeight: 85,
  targetWeight: 78,
  activityLevel: ActivityLevel.MODERATE,
  goal: Goal.LOSE_WEIGHT,
  stepGoal: 10000
};

const DEFAULT_PROMPTS = [
  "What are good sources of fiber?",
  "Suggest a quick post-workout meal.",
  "Is my current macro split okay for muscle gain?",
  "How much water should I drink today?"
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Data state
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [waterCount, setWaterCount] = useState<number>(0);
  const [customPrompts, setCustomPrompts] = useState<string[]>(DEFAULT_PROMPTS);

  // UI state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'trends' | 'chat' | 'profile'>('dashboard');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Native Mobile Setup
  useEffect(() => {
    const setupNative = async () => {
      try {
        const { StatusBar, Style } = await import('https://esm.sh/@capacitor/status-bar@^6.0.0');
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        await StatusBar.setStyle({ style: Style.Light });
      } catch (e) {}
    };
    setupNative();
  }, []);

  // Authentication Setup
  useEffect(() => {
    const checkSession = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        loadUserData(user.id);
      }
      setIsAuthChecking(false);
    };

    checkSession();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 'User',
          };
          setCurrentUser(user);
          loadUserData(user.id);
        } else {
          setCurrentUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const loadUserData = (userId: string) => {
    const p = localStorage.getItem(`vt_profile_${userId}`);
    const f = localStorage.getItem(`vt_food_${userId}`);
    const e = localStorage.getItem(`vt_exercise_${userId}`);
    const w = localStorage.getItem(`vt_weight_${userId}`);
    const s = localStorage.getItem(`vt_steps_${userId}`);
    const h = localStorage.getItem(`vt_water_${userId}`);
    const cp = localStorage.getItem(`vt_custom_prompts_${userId}`);

    if (p) setProfile(JSON.parse(p));
    if (f) setFoodLogs(JSON.parse(f));
    if (e) setExerciseLogs(JSON.parse(e));
    if (w) setWeightLogs(JSON.parse(w));
    if (s) setStepLogs(JSON.parse(s));
    if (h) setWaterCount(Number(h));
    if (cp) setCustomPrompts(JSON.parse(cp));
  };

  // Data Persistence per User
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`vt_profile_${currentUser.id}`, JSON.stringify(profile));
      localStorage.setItem(`vt_food_${currentUser.id}`, JSON.stringify(foodLogs));
      localStorage.setItem(`vt_exercise_${currentUser.id}`, JSON.stringify(exerciseLogs));
      localStorage.setItem(`vt_weight_${currentUser.id}`, JSON.stringify(weightLogs));
      localStorage.setItem(`vt_steps_${currentUser.id}`, JSON.stringify(stepLogs));
      localStorage.setItem(`vt_water_${currentUser.id}`, waterCount.toString());
      localStorage.setItem(`vt_custom_prompts_${currentUser.id}`, JSON.stringify(customPrompts));
    }
  }, [profile, foodLogs, exerciseLogs, weightLogs, stepLogs, waterCount, customPrompts, currentUser]);

  const stats: HealthStats = useMemo(() => calculateHealthStats(profile), [profile]);

  const dailyTotals = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const todayFood = foodLogs.filter(f => new Date(f.timestamp).setHours(0,0,0,0) === today);
    const todayExercise = exerciseLogs.filter(e => new Date(e.timestamp).setHours(0,0,0,0) === today);
    const todaySteps = stepLogs.filter(s => new Date(s.timestamp).setHours(0,0,0,0) === today);

    return {
      caloriesIn: todayFood.reduce((sum, f) => sum + f.calories, 0),
      protein: todayFood.reduce((sum, f) => sum + f.protein, 0),
      carbs: todayFood.reduce((sum, f) => sum + f.carbs, 0),
      fat: todayFood.reduce((sum, f) => sum + f.fat, 0),
      caloriesOut: todayExercise.reduce((sum, e) => sum + e.caloriesBurned, 0),
      steps: todaySteps.reduce((sum, s) => sum + s.steps, 0),
      recentActivities: [...todayFood, ...todayExercise].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3)
    };
  }, [foodLogs, exerciseLogs, stepLogs]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const fetchInsights = async () => {
    setIsInsightLoading(true);
    const insight = await getHealthInsights(profile, stats, foodLogs.slice(0, 5), exerciseLogs.slice(0, 5), dailyTotals.steps);
    setAiInsight(insight || null);
    setIsInsightLoading(false);
  };

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || userInput;
    if (!messageToSend.trim() || isChatLoading) return;
    if (!customMessage) setUserInput('');
    const newHistory: ChatMessage[] = [...chatMessages, { role: 'user', text: messageToSend }];
    setChatMessages(newHistory);
    setIsChatLoading(true);
    const answer = await askHealthQuestion(messageToSend, profile, stats, dailyTotals, chatMessages);
    setChatMessages([...newHistory, { role: 'model', text: answer || "I'm sorry, I couldn't process that." }]);
    setIsChatLoading(false);
  };

  const handleAddFood = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newFood: FoodLog = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      calories: Number(formData.get('calories')),
      protein: Number(formData.get('protein')),
      carbs: Number(formData.get('carbs')),
      fat: Number(formData.get('fat')),
      timestamp: Date.now(),
    };
    setFoodLogs([newFood, ...foodLogs]);
    e.currentTarget.reset();
  };

  const handleAddWeight = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const weight = Number(formData.get('weight'));
    const newLog: WeightLog = {
      id: Math.random().toString(36).substr(2, 9),
      weight,
      timestamp: Date.now(),
    };
    setWeightLogs([...weightLogs, newLog]);
    setProfile(prev => ({ ...prev, currentWeight: weight }));
    e.currentTarget.reset();
  };

  const handleAddSteps = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const steps = Number(formData.get('steps'));
    const newLog: StepLog = {
      id: Math.random().toString(36).substr(2, 9),
      steps,
      timestamp: Date.now(),
    };
    setStepLogs([...stepLogs, newLog]);
    e.currentTarget.reset();
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onLogin={(user) => {
      setCurrentUser(user);
      loadUserData(user.id);
      setProfile(prev => ({ ...prev, name: user.name }));
    }} />;
  }

  const macroData = [
    { name: 'Protein', value: dailyTotals.protein, color: '#3b82f6' },
    { name: 'Carbs', value: dailyTotals.carbs, color: '#22c55e' },
    { name: 'Fat', value: dailyTotals.fat, color: '#eab308' },
  ].filter(d => d.value > 0);

  const calorieRemaining = stats.dailyCalorieTarget - dailyTotals.caloriesIn + dailyTotals.caloriesOut;
  const calorieProgress = (dailyTotals.caloriesIn - dailyTotals.caloriesOut) / stats.dailyCalorieTarget * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Sidebar Navigation - Desktop */}
      <nav className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 p-8 space-y-8 fixed h-full z-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <Activity size={28} />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">VitalTrack</span>
        </div>
        
        <div className="space-y-1">
          <SideNavLink active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity size={20} />} label="Dashboard" />
          <SideNavLink active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Utensils size={20} />} label="Logging" />
          <SideNavLink active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} icon={<ChartIcon size={20} />} label="Analysis" />
          <SideNavLink active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<BrainCircuit size={20} />} label="Vital Assistant" />
          <SideNavLink active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={20} />} label="My Profile" />
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 p-4 md:p-10 max-w-6xl mx-auto w-full">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Greeting Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-black text-slate-900">Today's Summary</h1>
                <p className="text-slate-500 font-medium">Tracking your journey to {profile.targetWeight}kg</p>
              </div>
              <button onClick={fetchInsights} disabled={isInsightLoading} className="hidden md:flex bg-white border border-slate-200 hover:border-indigo-200 p-3 rounded-2xl items-center gap-2 text-sm font-bold shadow-sm transition-all text-slate-700">
                <BrainCircuit size={20} className="text-indigo-600" />
                {isInsightLoading ? 'Analyzing...' : 'Get AI Tip'}
              </button>
            </div>

            {/* AI Insight Highlight */}
            {aiInsight && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Zap size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">AI HEALTH INSIGHT</span>
                    <div className="h-1 w-1 bg-white/40 rounded-full" />
                    <span className="text-[10px] text-white/60 font-medium">UPDATED JUST NOW</span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none font-medium leading-relaxed whitespace-pre-line">
                    {aiInsight}
                  </div>
                </div>
              </div>
            )}

            {/* Main Progress Ring / Hero Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                      <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={552.9} strokeDashoffset={552.9 - (552.9 * Math.min(100, Math.max(0, calorieProgress))) / 100} strokeLinecap="round" className="text-indigo-600 transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-4xl font-black text-slate-900">{Math.abs(calorieRemaining)}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{calorieRemaining >= 0 ? 'KCAL LEFT' : 'KCAL OVER'}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-6 w-full">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1 text-orange-600">
                          <Flame size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Intake</span>
                        </div>
                        <p className="text-xl font-black text-slate-800">{dailyTotals.caloriesIn}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1 text-blue-600">
                          <Zap size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Burned</span>
                        </div>
                        <p className="text-xl font-black text-slate-800">{dailyTotals.caloriesOut}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 px-1">MACRONUTRIENT SPLIT</p>
                      <div className="flex gap-2 h-4 w-full rounded-full overflow-hidden bg-slate-100">
                        <div style={{ width: `${(dailyTotals.protein * 4 / (dailyTotals.caloriesIn || 1)) * 100}%` }} className="bg-blue-500 h-full" />
                        <div style={{ width: `${(dailyTotals.carbs * 4 / (dailyTotals.caloriesIn || 1)) * 100}%` }} className="bg-emerald-500 h-full" />
                        <div style={{ width: `${(dailyTotals.fat * 9 / (dailyTotals.caloriesIn || 1)) * 100}%` }} className="bg-amber-500 h-full" />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 uppercase tracking-tighter">
                        <span className="text-blue-600">P: {dailyTotals.protein}g</span>
                        <span className="text-emerald-600">C: {dailyTotals.carbs}g</span>
                        <span className="text-amber-600">F: {dailyTotals.fat}g</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Water & Quick Stats */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Droplets size={20} />
                      <span className="font-black text-sm uppercase tracking-widest">Hydration</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{waterCount} / 8 Cups</span>
                  </div>
                  <div className="flex gap-2 justify-between">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((cup) => (
                      <button 
                        key={cup} 
                        onClick={() => setWaterCount(cup <= waterCount ? cup - 1 : cup)}
                        className={`flex-1 h-10 rounded-xl border-2 transition-all ${cup <= waterCount ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-100 hover:border-indigo-200 text-slate-200'}`}
                      >
                        <Droplets size={14} className="mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Footprints size={20} />
                      <span className="font-black text-sm uppercase tracking-widest">Movement</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{Math.round((dailyTotals.steps / profile.stepGoal) * 100)}%</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mb-2">{dailyTotals.steps.toLocaleString()}</p>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (dailyTotals.steps / profile.stepGoal) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold">DAILY GOAL: {profile.stepGoal.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Scroll Bar */}
            <div className="space-y-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Quick Actions</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                <QuickActionButton onClick={() => setActiveTab('logs')} color="bg-orange-50 text-orange-600" icon={<Utensils size={20} />} label="Log Meal" />
                <QuickActionButton onClick={() => setActiveTab('logs')} color="bg-emerald-50 text-emerald-600" icon={<Footprints size={20} />} label="Track Steps" />
                <QuickActionButton onClick={() => setActiveTab('logs')} color="bg-blue-50 text-blue-600" icon={<TrendingUp size={20} />} label="Add Weight" />
                <QuickActionButton onClick={() => setActiveTab('chat')} color="bg-indigo-50 text-indigo-600" icon={<MessageSquare size={20} />} label="Ask AI" />
              </div>
            </div>

            {/* Charts and Feed Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900">Weight Trends</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-500 uppercase">Last 30 Days</span>
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weightLogs.slice(-10).map(w => ({ date: formatTimestamp(w.timestamp), weight: w.weight }))}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                        <YAxis hide domain={['dataMin-2', 'dataMax+2']} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                        <Area type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorWeight)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-slate-900">Today's Activity</h3>
                  <button onClick={() => setActiveTab('logs')} className="text-indigo-600 text-xs font-bold hover:underline">View All</button>
                </div>
                <div className="space-y-6">
                  {dailyTotals.recentActivities.length > 0 ? (
                    dailyTotals.recentActivities.map((item: any, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="relative flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg ${item.calories ? 'bg-orange-500' : 'bg-blue-500'}`}>
                            {item.calories ? <Utensils size={18} /> : <Dumbbell size={18} />}
                          </div>
                          {i !== dailyTotals.recentActivities.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-2" />}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-slate-800 text-sm">{item.name || item.type}</p>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {item.calories ? `${item.calories} kcal` : `${item.caloriesBurned} kcal burned`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 space-y-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <Clock size={32} />
                      </div>
                      <p className="text-xs font-bold text-slate-400">Nothing logged today yet.</p>
                      <button onClick={() => setActiveTab('logs')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full">Start Logging</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 h-[calc(100vh-8rem)] md:h-[calc(100vh-14rem)] bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                      <BrainCircuit size={20} />
                   </div>
                   <div>
                      <h2 className="font-black text-slate-900 leading-none">Vital Assistant</h2>
                      <p className="text-xs text-emerald-500 font-bold flex items-center gap-1 mt-1">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                         Always Online
                      </p>
                   </div>
                </div>
                <button onClick={() => setChatMessages([])} className="text-slate-400 hover:text-red-500 transition-colors">
                   <X size={20} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {chatMessages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
                      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
                         <MessageSquare size={40} />
                      </div>
                      <h3 className="text-xl font-black text-slate-800">Your AI Wellness Coach</h3>
                      <p className="text-slate-500 text-sm font-medium">Ask me about your nutrition, workout ideas, or why you're feeling tired today.</p>
                   </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-5 py-3 rounded-2xl shadow-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                   <div className="flex justify-start">
                      <div className="bg-slate-100 px-5 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                         <Loader2 className="animate-spin text-indigo-600" size={16} />
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thinking...</span>
                      </div>
                   </div>
                )}
                <div ref={chatEndRef} />
             </div>
             
             <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                   {customPrompts.map((p, i) => (
                     <button key={i} onClick={() => handleSendMessage(p)} className="flex-shrink-0 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm">
                       {p}
                     </button>
                   ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                   <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Type a message..." className="w-full pl-6 pr-14 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-lg shadow-indigo-100/20 font-medium transition-all" />
                   <button type="submit" disabled={!userInput.trim() || isChatLoading} className="absolute right-2.5 top-2.5 bottom-2.5 aspect-square bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:bg-slate-200 transition-all"><Send size={20} /></button>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'logs' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <LogCard title="Log Nutrition" icon={<Utensils className="text-orange-500" size={24}/>}>
                  <form onSubmit={handleAddFood} className="space-y-4 mt-4">
                    <input name="name" required placeholder="What did you eat?" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
                    <div className="grid grid-cols-2 gap-3">
                      <input name="calories" type="number" required placeholder="Calories" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
                      <input name="protein" type="number" placeholder="Protein (g)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-100 transition-all uppercase tracking-widest text-xs">Add to Journal</button>
                  </form>
                </LogCard>

                <LogCard title="Track Activity" icon={<Footprints className="text-emerald-500" size={24}/>}>
                  <form onSubmit={handleAddSteps} className="space-y-4 mt-4">
                    <input name="steps" type="number" required placeholder="Total Step Count" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest text-xs">Update Steps</button>
                  </form>
                </LogCard>

                <LogCard title="Body Weight" icon={<TrendingUp className="text-blue-500" size={24}/>}>
                  <form onSubmit={handleAddWeight} className="space-y-4 mt-4">
                    <input name="weight" type="number" step="0.1" required placeholder="Current Weight (kg)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 transition-all uppercase tracking-widest text-xs">Save Update</button>
                  </form>
                </LogCard>
              </div>
           </div>
        )}

        {activeTab === 'profile' && (
           <div className="max-w-2xl bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in duration-500">
              <div className="flex items-center gap-6 mb-10">
                 <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-4xl font-black shadow-inner">
                    {currentUser.name.charAt(0)}
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900">{profile.name}</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Health Profile Settings</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <ProfileField label="Full Name" value={profile.name} onChange={v => setProfile({...profile, name: v})} />
                 <ProfileField label="Age" type="number" value={profile.age.toString()} onChange={v => setProfile({...profile, age: Number(v)})} />
                 <ProfileField label="Height (cm)" type="number" value={profile.height.toString()} onChange={v => setProfile({...profile, height: Number(v)})} />
                 <ProfileField label="Step Goal" type="number" value={profile.stepGoal.toString()} onChange={v => setProfile({...profile, stepGoal: Number(v)})} />
                 <ProfileField label="Target Weight (kg)" type="number" value={profile.targetWeight.toString()} onChange={v => setProfile({...profile, targetWeight: Number(v)})} />
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Goal</label>
                    <select 
                      value={profile.goal} 
                      onChange={e => setProfile({...profile, goal: e.target.value as Goal})}
                      className="w-full px-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value={Goal.LOSE_WEIGHT}>Lose Weight</option>
                       <option value={Goal.MAINTAIN}>Maintain Health</option>
                       <option value={Goal.GAIN_MUSCLE}>Gain Muscle</option>
                    </select>
                 </div>
              </div>

              <div className="mt-10 p-6 bg-slate-900 rounded-3xl text-white">
                 <h4 className="font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-indigo-400" /> Calculated Targets</h4>
                 <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Daily Cal</p>
                       <p className="text-xl font-black">{stats.dailyCalorieTarget}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Your BMI</p>
                       <p className="text-xl font-black">{stats.bmi}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">BMR</p>
                       <p className="text-xl font-black">{stats.bmr}</p>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200 px-8 pt-4 pb-8 flex items-center justify-between z-50">
        <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity size={24} />} />
        <MobileNavButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Plus size={24} />} />
        <div className="relative -top-10">
           <button onClick={() => setActiveTab('chat')} className={`w-16 h-16 rounded-[1.5rem] shadow-2xl shadow-indigo-300 flex items-center justify-center border-4 border-white ${activeTab === 'chat' ? 'bg-indigo-700' : 'bg-indigo-600 text-white'}`}>
             <BrainCircuit size={32} />
           </button>
        </div>
        <MobileNavButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} icon={<ChartIcon size={24} />} />
        <MobileNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={24} />} />
      </nav>
    </div>
  );
};

// Sub-components
const SideNavLink: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>
    <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</span>
    {label}
  </button>
);

const MobileNavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button onClick={onClick} className={`p-2 transition-all ${active ? 'text-indigo-600' : 'text-slate-300'}`}>
    {icon}
  </button>
);

const QuickActionButton: React.FC<{ onClick: () => void, color: string, icon: React.ReactNode, label: string }> = ({ onClick, color, icon, label }) => (
  <button onClick={onClick} className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-3xl ${color} shadow-sm active:scale-95 transition-all font-black text-xs uppercase tracking-widest`}>
    {icon}
    {label}
  </button>
);

const LogCard: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
    <div className="flex items-center gap-4 mb-2">
      <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      <h3 className="text-xl font-black text-slate-800">{title}</h3>
    </div>
    {children}
  </div>
);

const ProfileField: React.FC<{ label: string, value: string, type?: string, onChange: (v: string) => void }> = ({ label, value, type = "text", onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700" />
  </div>
);

// Reuse the same AuthView from existing files but ensured to keep imports and structure
const AuthView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = isLogin 
      ? await authService.login(email, password)
      : await authService.register(email, password, name);

    setIsLoading(false);
    if (typeof result === 'string') {
      setError(result);
    } else {
      onLogin(result);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] mx-auto flex items-center justify-center shadow-xl shadow-indigo-100 mb-6">
            <Activity size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">VitalTrack</h1>
          <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-xs">Modern Health Hub</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-in fade-in">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-50 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Email</label>
            <div className="relative">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@gmail.com" className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-50 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Password</label>
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-50 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 mt-8 active:scale-95 disabled:opacity-50">
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : (isLogin ? 'Sign In' : 'Join VitalTrack')}
            {!isLoading && <ArrowRight size={24} />}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
            {isLogin ? "New here? Create account" : "Have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
