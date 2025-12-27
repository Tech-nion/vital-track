import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Utensils,
  Dumbbell,
  LineChart as ChartIcon,
  User as UserIcon,
  BrainCircuit,
  LogOut,
  Droplets,
  Footprints,
  Flame,
  TrendingUp,
  MessageSquare,
  Send,
  Clock,
  Loader2,
  Zap,
  X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ---------------- TYPES -----------------
interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  height: number;
  currentWeight: number;
  targetWeight: number;
  activityLevel: 'low' | 'moderate' | 'high';
  goal: 'lose' | 'maintain' | 'gain';
  stepGoal: number;
}

interface FoodLog { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; timestamp: number; }
interface ExerciseLog { id: string; type: string; caloriesBurned: number; timestamp: number; }
interface WeightLog { id: string; weight: number; timestamp: number; }
interface StepLog { id: string; steps: number; timestamp: number; }

interface User { id: string; email: string; name: string; }
interface ChatMessage { role: 'user' | 'model'; text: string; }
interface HealthStats { dailyCalorieTarget: number; }

// ---------------- MOCK SERVICES -----------------
const authService = {
  getCurrentUser: async () => null,
  logout: async () => {}
};
const supabase = { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } };

const calculateHealthStats = (profile: UserProfile): HealthStats => ({
  dailyCalorieTarget: 2000
});
const formatTimestamp = (ts: number) => new Date(ts).toLocaleDateString();
const getHealthInsights = async () => "Drink more water and maintain protein intake.";
const askHealthQuestion = async (_q: string) => "Try a balanced meal with protein, carbs, and fat.";

// ---------------- UTILITY COMPONENTS -----------------
const SideNavLink: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 p-3 rounded-xl font-bold text-sm w-full transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
    {icon} {label}
  </button>
);

const QuickActionButton: React.FC<{ color: string; icon: React.ReactNode; label: string; onClick: () => void }> = ({ color, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm ${color} flex-shrink-0`}>
    {icon} {label}
  </button>
);

const AuthView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => (
  <div className="min-h-screen flex items-center justify-center">
    <button onClick={() => onLogin({ id: '1', name: 'Demo User', email: 'demo@test.com' })} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">Login Demo</button>
  </div>
);

const LogsView: React.FC<any> = ({ onAddFood, onAddWeight, onAddSteps }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold">Logging</h2>
    <form onSubmit={onAddFood} className="space-y-2">
      <input name="name" placeholder="Food Name" className="border p-2 rounded" />
      <input name="calories" placeholder="Calories" type="number" className="border p-2 rounded" />
      <input name="protein" placeholder="Protein" type="number" className="border p-2 rounded" />
      <input name="carbs" placeholder="Carbs" type="number" className="border p-2 rounded" />
      <input name="fat" placeholder="Fat" type="number" className="border p-2 rounded" />
      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Add Food</button>
    </form>
    <form onSubmit={onAddWeight} className="space-y-2">
      <input name="weight" placeholder="Weight" type="number" className="border p-2 rounded" />
      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Add Weight</button>
    </form>
    <form onSubmit={onAddSteps} className="space-y-2">
      <input name="steps" placeholder="Steps" type="number" className="border p-2 rounded" />
      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Add Steps</button>
    </form>
  </div>
);

const TrendsView: React.FC<any> = ({ weightLogs }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold">Trends</h2>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={weightLogs.map((w: any) => ({ date: formatTimestamp(w.timestamp), weight: w.weight }))}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="weight" stroke="#6366f1" fill="#6366f1" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const ProfileView: React.FC<any> = ({ profile, onUpdateProfile }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold">Profile</h2>
    <input value={profile.name} onChange={e => onUpdateProfile({ ...profile, name: e.target.value })} className="border p-2 rounded" />
  </div>
);

// ---------------- MAIN APP -----------------
const DEFAULT_PROFILE: UserProfile = {
  name: "New User",
  age: 28,
  gender: 'male',
  height: 180,
  currentWeight: 85,
  targetWeight: 78,
  activityLevel: 'moderate',
  goal: 'lose',
  stepGoal: 10000
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [waterCount, setWaterCount] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'trends' | 'chat' | 'profile'>('dashboard');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stats: HealthStats = useMemo(() => calculateHealthStats(profile), [profile]);
  const calorieProgress = 50; // Placeholder

  useEffect(() => {
    setIsAuthChecking(false);
  }, []);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    setChatMessages([...chatMessages, { role: 'user', text: userInput }]);
    setUserInput('');
    setIsChatLoading(true);
    const answer = await askHealthQuestion(userInput);
    setChatMessages(prev => [...prev, { role: 'model', text: answer }]);
    setIsChatLoading(false);
  };

  const handleLogout = () => setCurrentUser(null);

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10" /></div>;
  }

  if (!currentUser) return <AuthView onLogin={user => setCurrentUser(user)} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <nav className="hidden md:flex flex-col w-72 bg-white border-r p-6 space-y-6 fixed h-full">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={28} />
          <span className="text-2xl font-black">VitalTrack</span>
        </div>
        <SideNavLink active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<Activity size={20} />} label="Dashboard" />
        <SideNavLink active={activeTab==='logs'} onClick={()=>setActiveTab('logs')} icon={<Utensils size={20} />} label="Logging" />
        <SideNavLink active={activeTab==='trends'} onClick={()=>setActiveTab('trends')} icon={<ChartIcon size={20} />} label="Analysis" />
        <SideNavLink active={activeTab==='chat'} onClick={()=>setActiveTab('chat')} icon={<BrainCircuit size={20} />} label="Vital Assistant" />
        <SideNavLink active={activeTab==='profile'} onClick={()=>setActiveTab('profile')} icon={<UserIcon size={20} />} label="Profile" />
        <button onClick={handleLogout} className="mt-auto text-red-500 font-bold flex items-center gap-2"><LogOut size={18} />Logout</button>
      </nav>

      <main className="flex-1 md:ml-72 p-6 space-y-6">
        {activeTab==='dashboard' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow">Daily Calories: {stats.dailyCalorieTarget}</div>
            <div className="bg-white p-6 rounded-xl shadow">Water Intake: {waterCount} cups</div>
            <div className="bg-white p-6 rounded-xl shadow">Step Progress: {Math.min(stepLogs.reduce((a,b)=>a+b.steps,0), profile.stepGoal)} / {profile.stepGoal}</div>
          </div>
        )}

        {activeTab==='chat' && (
          <div className="flex flex-col h-[80vh] border p-4 rounded-lg bg-white">
            <div className="flex-1 overflow-y-auto space-y-2">
              {chatMessages.map((msg,i)=>(
                <div key={i} className={msg.role==='user' ? 'text-right' : 'text-left'}>
                  <span className={`inline-block px-4 py-2 rounded-lg ${msg.role==='user'?'bg-indigo-600 text-white':'bg-slate-100 text-slate-800'}`}>{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
              {isChatLoading && <div className="text-center text-gray-500">AI is typing...</div>}
            </div>
            <form onSubmit={e=>{e.preventDefault(); handleSendMessage();}} className="flex gap-2 mt-2">
              <input className="flex-1 border p-2 rounded" value={userInput} onChange={e=>setUserInput(e.target.value)} placeholder="Ask AI..." />
              <button className="bg-indigo-600 text-white px-4 py-2 rounded"><Send size={16} /></button>
            </form>
          </div>
        )}

        {activeTab==='logs' && <LogsView onAddFood={(e:any)=>{e.preventDefault(); console.log('food added');}} onAddWeight={()=>{}} onAddSteps={()=>{}} />}
        {activeTab==='trends' && <TrendsView weightLogs={weightLogs} />}
        {activeTab==='profile' && <ProfileView profile={profile} onUpdateProfile={setProfile} />}
      </main>
    </div>
  );
};

export default App;
