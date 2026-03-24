import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  GraduationCap, 
  Brain, 
  Video, 
  MessageSquare, 
  Bot, 
  Presentation, 
  Puzzle, 
  Youtube, 
  Users, 
  Calendar, 
  LogOut, 
  Clock, 
  Send, 
  Plus, 
  BookOpen,
  Trash2,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { Stream, UserProfile, ChatMessage, CommunityPost, STREAMS_SUBJECTS } from './types';
import { askGemini, generateQuiz, analyzeYouTube } from './lib/gemini';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-sm p-6', className)}>
    {children}
  </div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stream, setStream] = useState<Stream | "">("");
  const [name, setName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleRegister = async () => {
    if (!user || !stream || !name) return;
    const newProfile: UserProfile = {
      uid: user.uid,
      name,
      email: user.email || "",
      stream: stream as Stream,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error("Registration failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              BacBoost AI
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Baccalaureate Companion</h2>
          <p className="text-slate-500 mb-8 text-sm">Your AI-powered study partner for the Algerian Bac.</p>
          <Button onClick={handleLogin} className="w-full py-6 text-lg">
            Sign in with Google
          </Button>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <h2 className="text-xl font-bold mb-6 text-center">Complete Your Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Study Stream</label>
              <select 
                value={stream} 
                onChange={(e) => setStream(e.target.value as Stream)}
                className="w-full h-10 rounded-full border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Stream</option>
                <option value="Science">علوم تجريبية (Science)</option>
                <option value="Mathematics">رياضيات (Mathematics)</option>
                <option value="TechnicalMath">تقني رياضي (Technical Math)</option>
                <option value="Management">تسيير واقتصاد</option>
                <option value="Literature">آداب وفلسفة</option>
                <option value="Languages">لغات أجنبية</option>
              </select>
            </div>
            <Button onClick={handleRegister} disabled={!stream || !name} className="w-full mt-4">
              Finish Setup
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Brain className="h-7 w-7 text-blue-600" />
            BacBoost AI
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {profile.stream}
            </div>
            <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <Countdown />
            </div>
            <Button variant="ghost" onClick={handleLogout} className="p-2">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-6 no-scrollbar">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BookOpen className="h-4 w-4" />} label="Subjects" />
          <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={<Video className="h-4 w-4" />} label="Live" />
          <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Bot className="h-4 w-4" />} label="AI Assistant" />
          <TabButton active={activeTab === 'teacher'} onClick={() => setActiveTab('teacher')} icon={<Presentation className="h-4 w-4" />} label="Virtual Teacher" />
          <TabButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} icon={<Puzzle className="h-4 w-4" />} label="AI Quiz" />
          <TabButton active={activeTab === 'youtube'} onClick={() => setActiveTab('youtube')} icon={<Youtube className="h-4 w-4" />} label="YouTube" />
          <TabButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} icon={<Users className="h-4 w-4" />} label="Community" />
          <TabButton active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} icon={<Calendar className="h-4 w-4" />} label="Planner" />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard profile={profile} />}
            {activeTab === 'live' && <LiveClassroom />}
            {activeTab === 'chat' && <Chat profile={profile} />}
            {activeTab === 'ai' && <AIAssistant />}
            {activeTab === 'teacher' && <VirtualTeacher profile={profile} />}
            {activeTab === 'quiz' && <QuizGenerator profile={profile} />}
            {activeTab === 'youtube' && <YouTubeAnalyzer />}
            {activeTab === 'community' && <Community profile={profile} />}
            {activeTab === 'planner' && <Planner profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Sub-components ---

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
        active ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Countdown() {
  const [days, setDays] = useState(0);
  useEffect(() => {
    const examDate = new Date(2026, 5, 1); // June 1 2026
    const update = () => {
      const diff = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      setDays(diff > 0 ? diff : 0);
    };
    update();
    const interval = setInterval(update, 3600000);
    return () => clearInterval(interval);
  }, []);
  return <span>{days} Days to Bac</span>;
}

function Dashboard({ profile }: { profile: UserProfile }) {
  const subjects = STREAMS_SUBJECTS[profile.stream] || [];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subj) => (
        <Card key={subj} className="hover:border-blue-200 transition-all cursor-pointer group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold mb-1">{subj}</h3>
          <p className="text-sm text-slate-500">Lessons, exercises & AI tutoring</p>
        </Card>
      ))}
    </div>
  );
}

function LiveClassroom() {
  const [code, setCode] = useState("");
  return (
    <Card className="max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Video className="h-6 w-6 text-blue-600" />
        Live Classroom
      </h3>
      <p className="text-slate-500 mb-6">Join a live session or create a new one to study with others.</p>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter class code (e.g. BAC123)" className="flex-1" />
        <Button onClick={() => alert(`Joining class ${code}...`)}>Join</Button>
        <Button variant="secondary" onClick={() => alert(`Created class: ${Math.random().toString(36).substring(7).toUpperCase()}`)}>Create</Button>
      </div>
      <div className="bg-blue-50/50 rounded-3xl p-12 text-center border border-blue-100 border-dashed">
        <Video className="h-12 w-12 text-blue-300 mx-auto mb-4" />
        <p className="text-blue-700 font-medium">No active session</p>
        <p className="text-blue-500 text-sm mt-1">Camera, screen share & real-time chat will appear here.</p>
      </div>
    </Card>
  );
}

function Chat({ profile }: { profile: UserProfile }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
        .filter(m => m.stream === profile.stream);
      setMessages(msgs);
    });
    return unsubscribe;
  }, [profile.stream]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    try {
      await addDoc(collection(db, 'chats'), {
        senderId: profile.uid,
        senderName: profile.name,
        text,
        stream: profile.stream,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Chat failed", error);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto h-[600px] flex flex-col p-0 overflow-hidden">
      <div className="p-4 border-bottom border-slate-100 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          {profile.stream} Chat
        </h3>
        <span className="text-xs text-slate-400">Students online</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex flex-col', msg.senderId === profile.uid ? 'items-end' : 'items-start')}>
            <span className="text-[10px] font-bold text-slate-400 mb-1 px-2">{msg.senderName}</span>
            <div className={cn(
              'max-w-[80%] px-4 py-2 rounded-2xl text-sm',
              msg.senderId === profile.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..." 
        />
        <Button onClick={sendMessage} className="aspect-square p-0 w-10 h-10">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function AIAssistant() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);
    try {
      const response = await askGemini(userText);
      setMessages(prev => [...prev, { role: 'ai', text: response || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to AI." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto h-[600px] flex flex-col p-0 overflow-hidden">
      <div className="p-4 border-bottom border-slate-100">
        <h3 className="font-bold flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          AI Study Assistant
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        <div className="bg-purple-50 text-purple-700 p-4 rounded-2xl text-sm border border-purple-100">
          👋 Hi! I can help you with Mathematics, Physics, Arabic, or any other Bac subject. Ask me a question or for a lesson summary.
        </div>
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[90%] px-5 py-3 rounded-3xl text-sm shadow-sm',
              msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
            )}>
              <Markdown className="prose prose-sm max-w-none prose-slate">{msg.text}</Markdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 px-5 py-3 rounded-3xl rounded-tl-none flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask anything about your subjects..." 
          disabled={loading}
        />
        <Button onClick={ask} disabled={loading} className="bg-purple-600 hover:bg-purple-700 aspect-square p-0 w-10 h-10">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function VirtualTeacher({ profile }: { profile: UserProfile }) {
  const [subject, setSubject] = useState(STREAMS_SUBJECTS[profile.stream][0]);
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const prompt = `Explain the topic "${topic}" in the subject "${subject}" for the Algerian Baccalaureate. 
      Provide a clear explanation, key formulas or concepts, and 2 practice exercises with solutions. 
      Use Arabic for explanation and French for scientific terms if needed.`;
      const res = await askGemini(prompt, "You are a professional teacher for the Algerian Baccalaureate.");
      setOutput(res || "");
    } catch {
      setOutput("Failed to generate lesson.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Presentation className="h-6 w-6 text-blue-600" />
        Virtual Teacher
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Subject</label>
          <select 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-10 rounded-full border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STREAMS_SUBJECTS[profile.stream].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Lesson Topic</label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Limits, Derivatives, History of Algeria..." />
        </div>
      </div>
      <Button onClick={generate} disabled={loading || !topic} className="w-full py-6">
        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
        Generate Lesson & Exercises
      </Button>
      {output && (
        <div className="mt-8 bg-slate-50 rounded-3xl p-8 border border-slate-100">
          <Markdown className="prose prose-slate max-w-none">{output}</Markdown>
        </div>
      )}
    </Card>
  );
}

interface QuizQuestion {
  type: 'MCQ' | 'Short' | 'Problem';
  text: string;
  options?: string[];
  correct: string;
  explanation: string;
}

function QuizGenerator({ profile }: { profile: UserProfile }) {
  const [subject, setSubject] = useState(STREAMS_SUBJECTS[profile.stream][0]);
  const [chapter, setChapter] = useState("");
  const [quiz, setQuiz] = useState<{ title: string; questions: QuizQuestion[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState<number[]>([]);

  const generate = async () => {
    if (!chapter.trim()) return;
    setLoading(true);
    setQuiz(null);
    setShowAnswers([]);
    try {
      const res = await generateQuiz(subject, chapter);
      setQuiz(res);
    } catch {
      // Error handled by setting quiz to null
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Puzzle className="h-6 w-6 text-orange-500" />
        Smart Quiz Generator
      </h3>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <select 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)}
          className="h-10 rounded-full border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STREAMS_SUBJECTS[profile.stream].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Chapter name..." className="flex-1" />
        <Button onClick={generate} disabled={loading || !chapter} className="bg-orange-500 hover:bg-orange-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
        </Button>
      </div>

      {quiz && (
        <div className="space-y-8">
          <h4 className="text-lg font-bold text-center border-b border-slate-100 pb-4">{quiz.title}</h4>
          {quiz.questions.map((q: QuizQuestion, i: number) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <p className="font-semibold">{q.text}</p>
              </div>
              {q.type === 'MCQ' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                  {q.options.map((opt: string) => (
                    <label key={opt} className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-200 cursor-pointer transition-all">
                      <input type="radio" name={`q${i}`} className="text-orange-500 focus:ring-orange-500" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type !== 'MCQ' && (
                <div className="pl-8">
                  <Input placeholder="Type your answer..." />
                </div>
              )}
              <div className="pl-8">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAnswers(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                  className="text-xs"
                >
                  {showAnswers.includes(i) ? 'Hide Explanation' : 'Show Correct Answer'}
                </Button>
                {showAnswers.includes(i) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-4 bg-green-50 rounded-2xl border border-green-100 text-sm text-green-800"
                  >
                    <p className="font-bold mb-1">Correct Answer: {q.correct}</p>
                    <p className="opacity-80">{q.explanation}</p>
                  </motion.div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function YouTubeAnalyzer() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await analyzeYouTube(url);
      setResult(res || "");
    } catch {
      setResult("Failed to analyze video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Youtube className="h-6 w-6 text-red-600" />
        YouTube Lesson Analyzer
      </h3>
      <p className="text-slate-500 mb-6 text-sm">Paste a link to an educational video to get a summary and review questions.</p>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste YouTube link here..." className="flex-1" />
        <Button onClick={analyze} disabled={loading || !url} className="bg-red-600 hover:bg-red-700">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
        </Button>
      </div>
      {result && (
        <div className="bg-red-50/30 rounded-3xl p-8 border border-red-100">
          <Markdown className="prose prose-slate max-w-none">{result}</Markdown>
        </div>
      )}
    </Card>
  );
}

function Community({ profile }: { profile: UserProfile }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const q = query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost)));
    });
    return unsubscribe;
  }, []);

  const addPost = async () => {
    if (!text.trim()) return;
    const content = text;
    setText("");
    try {
      await addDoc(collection(db, 'community'), {
        authorId: profile.uid,
        authorName: profile.name,
        text: content,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Error logged to console in production if needed
    }
  };

  const deletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'community', id));
    } catch {
      // Error logged to console in production if needed
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-4">Share a Question or Note</h3>
        <textarea 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind? Ask for help or share resources..."
          className="w-full h-24 rounded-2xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
        />
        <div className="flex justify-end">
          <Button onClick={addPost} disabled={!text.trim()}>Post to Community</Button>
        </div>
      </Card>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                  {post.authorName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold">{post.authorName}</p>
                  <p className="text-[10px] text-slate-400">
                    {post.createdAt?.seconds ? formatDistanceToNow(post.createdAt.toDate()) + ' ago' : 'Just now'}
                  </p>
                </div>
              </div>
              {post.authorId === profile.uid && (
                <Button variant="danger" onClick={() => post.id && deletePost(post.id)} className="p-2 h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Planner({ profile }: { profile: UserProfile }) {
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const prompt = `Generate a weekly study schedule for an Algerian Baccalaureate student in the "${profile.stream}" stream. 
      The exam is in June 2026. Prioritize the main subjects for this stream. 
      Format the response as a clear table or list. Answer in Arabic.`;
      const res = await askGemini(prompt, "You are an expert academic advisor.");
      setPlan(res || "");
    } catch {
      setPlan("Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.stream]);

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-green-600" />
          Smart Study Planner
        </h3>
        <Button variant="secondary" onClick={generatePlan} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Plan'}
        </Button>
      </div>
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Generating your personalized schedule...</p>
        </div>
      ) : (
        <div className="bg-green-50/30 rounded-3xl p-8 border border-green-100">
          <Markdown className="prose prose-green max-w-none">{plan}</Markdown>
        </div>
      )}
    </Card>
  );
}
