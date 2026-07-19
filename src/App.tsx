import { useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  Download, 
  LogOut, 
  BookOpen, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Lock, 
  Info,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Compass,
  Check,
  Trash2,
  RefreshCw,
  ChevronDown,
  Brain,
  StickyNote,
  Activity,
  Search,
  CheckSquare,
  Calendar,
  Timer,
  Trophy,
  Flame,
  Hourglass,
  Contact,
  FolderOpen,
  CircleDollarSign,
  BarChart3,
  Settings,
  Sliders,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider } from './firebase';
import { FALLBACK_FEATURES_MAP } from './fallbackFeatures';

export interface LogItem {
  version: string;
  title: string;
  category: string;
  status: string;
  date: string;
  points: string[];
}

const DEFAULT_LOGS: LogItem[] = [];

function parseCSVText(text: string): LogItem[] {
  if (!text || !text.trim()) return [];
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  
  const versionIdx = headers.indexOf('version');
  const titleIdx = headers.indexOf('title');
  const categoryIdx = headers.indexOf('category');
  const statusIdx = headers.indexOf('status');
  const dateIdx = headers.indexOf('date');

  const pointIndices: number[] = [];
  for (let p = 1; p <= 100; p++) {
    let idx = headers.indexOf(`ponit ${p}`);
    if (idx === -1) idx = headers.indexOf(`point ${p}`);
    if (idx === -1) idx = headers.indexOf(`ponit${p}`);
    if (idx === -1) idx = headers.indexOf(`point${p}`);
    if (idx !== -1) {
      pointIndices.push(idx);
    }
  }

  const items: LogItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;

    const getVal = (idx: number) => (idx !== -1 && row[idx] !== undefined) ? row[idx].trim() : "";
    
    const rawVersion = getVal(versionIdx);
    let version = rawVersion;
    if (version && /^\d/.test(version)) {
      version = "v" + version;
    }
    const title = getVal(titleIdx);
    
    if (!version && !title) continue;

    const category = getVal(categoryIdx);
    const status = getVal(statusIdx);
    const date = getVal(dateIdx);

    const points: string[] = [];
    pointIndices.forEach(idx => {
      const val = getVal(idx);
      if (val) {
        points.push(val);
      }
    });

    items.push({
      version: version || "v1.x.x",
      title: title || "System Update",
      category: category || "General",
      status: status || "released",
      date: date || "Recent",
      points
    });
  }

  return items;
}

export interface FeatureStepRow {
  category: string;
  subCategory: string;
  steps: string[];
}

export interface ExtractedStep {
  text: string;
  imageUrl: string | null;
  sideText: string;
  bottomText: string | null;
}

function parseStepText(stepText: string): ExtractedStep {
  if (!stepText) {
    return { text: '', imageUrl: null, sideText: '', bottomText: null };
  }

  // Regex to match URLs (including Google Photos and others)
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = stepText.match(urlRegex);
  
  let imageUrl: string | null = null;
  let cleanText = stepText;

  if (match) {
    for (const url of match) {
      // Clean query parameters or trailing punctuation from the match
      const cleanUrl = url.replace(/[.,;)]+$/, '');
      const isImage = cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || 
                      cleanUrl.includes('googleusercontent.com') || 
                      cleanUrl.includes('photos.google.com') || 
                      cleanUrl.includes('photos.app.goo.gl') ||
                      cleanUrl.includes('images');
      
      if (isImage) {
        imageUrl = cleanUrl;
        cleanText = cleanText.replace(url, '').trim();
        break; // take first image URL
      }
    }
  }

  // Clean leading bullets, dashes, colons
  cleanText = cleanText.replace(/^\s*[-•:*]+\s*/, '').trim();

  // Split text into sideText and bottomText
  let sideText = cleanText;
  let bottomText: string | null = null;

  if (cleanText.length > 125) {
    // Break at first sentence end near 100 characters, if possible
    const breakIndex = cleanText.indexOf('.', 90);
    if (breakIndex !== -1 && breakIndex < 200) {
      sideText = cleanText.slice(0, breakIndex + 1).trim();
      bottomText = cleanText.slice(breakIndex + 1).trim();
    } else {
      const spaceIndex = cleanText.lastIndexOf(' ', 120);
      if (spaceIndex > 60) {
        sideText = cleanText.slice(0, spaceIndex).trim() + '...';
        bottomText = cleanText.slice(spaceIndex).trim();
      } else {
        sideText = cleanText.slice(0, 120).trim() + '...';
        bottomText = cleanText.slice(120).trim();
      }
    }
  }

  return {
    text: cleanText,
    imageUrl,
    sideText,
    bottomText: bottomText || null
  };
}

function parseFeaturesCSV(text: string): FeatureStepRow[] {
  if (!text || !text.trim()) return [];
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  
  const categoryIdx = headers.findIndex(h => h === 'category');
  const subCategoryIdx = headers.findIndex(h => h === 'sub-category' || h === 'subcategory');

  const stepIndices: number[] = [];
  for (let s = 1; s <= 24; s++) {
    const idx = headers.findIndex(h => h === `step ${s}` || h === `step${s}`);
    if (idx !== -1) {
      stepIndices.push(idx);
    }
  }

  const items: FeatureStepRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;

    const getVal = (idx: number) => (idx !== -1 && row[idx] !== undefined) ? row[idx].trim() : "";
    
    const category = getVal(categoryIdx);
    const subCategory = getVal(subCategoryIdx);
    
    if (!category) continue;

    const steps: string[] = [];
    stepIndices.forEach(idx => {
      const val = getVal(idx);
      if (val) {
        steps.push(val);
      }
    });

    items.push({
      category: category,
      subCategory: subCategory,
      steps: steps
    });
  }

  return items;
}

const getCategoryStyles = (category: string) => {
  const norm = category.toLowerCase().trim();
  if (norm.includes('bug') || norm.includes('issue') || norm.includes('fix')) {
    return 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.2)]';
  }
  if (norm.includes('new') || norm.includes('feature') || norm.includes('add')) {
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.2)]';
  }
  return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.2)]';
};

function TypewriterText({ text, delay = 0, type }: { text: string; delay?: number; type: 'released' | 'coming_soon' }) {
  const [displayedText, setDisplayedText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) {
      setDisplayedText('');
      return;
    }
    
    let isMounted = true;
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (!isMounted) return;
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 12); // Snappy, readable typewriter typing speed

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [started, text]);

  return (
    <span className="relative text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
      {!started ? (
        <span className="invisible select-none">{text}</span>
      ) : (
        <>
          <span>{displayedText}</span>
          {displayedText.length < text.length && (
            <span className={`inline-block w-[1.5px] h-3.5 ml-0.5 animate-pulse align-middle ${
              type === 'released' ? 'bg-emerald-400' : 'bg-blue-400'
            }`}></span>
          )}
        </>
      )}
    </span>
  );
}

function LogCard({ log, type, index }: { log: LogItem; type: 'released' | 'coming_soon'; index: number; key?: any }) {
  const [visibleCount, setVisibleCount] = useState(5);
  const totalPoints = log.points.length;
  const visiblePoints = log.points.slice(0, visibleCount);
  const remaining = totalPoints - visibleCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }}
      className={`neon-depth-card p-6 rounded-3xl border-t relative overflow-hidden flex flex-col group hover:border-white/10 ${
        type === 'released' ? 'border-emerald-500/20' : 'border-blue-500/20'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/40 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className={`px-4 py-2.5 rounded-2xl border font-mono tracking-wider shrink-0 flex flex-col items-center justify-center min-w-[85px] relative overflow-hidden shadow-lg ${
          type === 'released' 
            ? 'bg-zinc-950/80 text-emerald-400 border-emerald-500/30 shadow-[inset_0_1px_12px_rgba(16,185,129,0.05),0_10px_20px_-10px_rgba(16,185,129,0.15)]' 
            : 'bg-zinc-950/80 text-blue-400 border-blue-500/30 shadow-[inset_0_1px_12px_rgba(59,130,246,0.05),0_10px_20px_-10px_rgba(59,130,246,0.15)]'
        }`}>
          <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${
            type === 'released' ? 'from-transparent via-emerald-400 to-transparent' : 'from-transparent via-blue-400 to-transparent'
          }`}></div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-extrabold mb-0.5 select-none">VER</span>
          <span className="text-xl font-black font-mono tracking-tighter leading-none">{log.version}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-display font-extrabold text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all duration-300">
            {log.title}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {type === 'released' ? (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1 shrink-0 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Released
              </span>
            ) : (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest flex items-center gap-1 shrink-0 select-none">
                <Lock className="w-3 h-3 text-blue-400" />
                Comming Soon
              </span>
            )}
            {log.category && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-extrabold uppercase tracking-widest shrink-0 select-none ${getCategoryStyles(log.category)}`}>
                {log.category}
              </span>
            )}
            {log.date && (
              <span className="text-[10px] text-gray-400 font-mono bg-zinc-900/60 border border-white/5 px-2 py-0.5 rounded-full shrink-0 select-none">
                {log.date}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {totalPoints > 0 && (
        <div className="space-y-3 relative z-10 mt-2 flex-1">
          {visiblePoints.map((pt, pIdx) => (
            <div key={pIdx} className="flex gap-3 items-start p-3 bg-zinc-900/20 rounded-xl border border-white/5 hover:bg-zinc-900/40 transition">
              <div className={`p-1 rounded-lg mt-0.5 shrink-0 border ${
                type === 'released' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {type === 'released' ? (
                  <Check className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <TypewriterText text={pt} delay={pIdx * 200 + 400} type={type} />
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="mt-4 flex justify-center relative z-10">
          <button
            onClick={() => setVisibleCount(prev => prev + 5)}
            className={`w-full py-2 px-4 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer hover:shadow-lg ${
              type === 'released'
                ? 'bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                : 'bg-blue-500/5 hover:bg-blue-500/15 border-blue-500/20 text-blue-400 hover:text-blue-300'
            }`}
          >
            <span>Show More ({remaining} remaining)</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [versionId, setVersionId] = useState<string>('v1.0.27');
  const [blogsOpen, setBlogsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'features' | 'android' | 'windows'>('features');
  
  const [logs, setLogs] = useState<LogItem[]>(DEFAULT_LOGS);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Features guide state
  const [features, setFeatures] = useState<FeatureStepRow[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState<boolean>(true);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Helper to detect "coming soon" vs "released" log status
  const isComingSoonVal = (status: string) => {
    if (!status) return false;
    const norm = status.toLowerCase().replace(/\s+/g, '');
    return norm.includes('coming') || norm.includes('comming') || norm.includes('soon') || norm.includes('future') || norm.includes('roadmap');
  };

  // Helper to compare two version strings in descending order (highest/latest first)
  const compareVersions = (a: string, b: string) => {
    const cleanA = a.toLowerCase().replace(/^v/, '');
    const cleanB = b.toLowerCase().replace(/^v/, '');
    
    const partsA = cleanA.split(/[.-]/).map(p => parseInt(p, 10));
    const partsB = cleanB.split(/[.-]/).map(p => parseInt(p, 10));
    
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const valA = isNaN(partsA[i]) ? 0 : partsA[i];
      const valB = isNaN(partsB[i]) ? 0 : partsB[i];
      if (valA !== valB) {
        return valB - valA; // Descending
      }
    }
    return cleanB.localeCompare(cleanA);
  };

  const releasedLogs = logs
    .filter(item => !isComingSoonVal(item.status))
    .sort((a, b) => compareVersions(a.version, b.version));

  const comingSoonLogs = logs
    .filter(item => isComingSoonVal(item.status))
    .sort((a, b) => compareVersions(a.version, b.version));

  // Find the log that matches versionId, or default to the newest released log
  const matchedLog = releasedLogs.find(
    l => l.version.toLowerCase() === versionId.toLowerCase() || 
         l.version.toLowerCase().replace(/^v/, '') === versionId.toLowerCase().replace(/^v/, '')
  ) || releasedLogs[0];

  // Fetch verified users list and download link dynamically with polling
  useEffect(() => {
    const fetchConfigAndVersion = () => {
      // Fetch download URL
      fetch('https://lifeosca.asia-southeast1.firebasedatabase.app/UPDATE_CONFIG/Full_Apk_Url.json')
        .then(res => res.json())
        .then(url => {
          if (url) {
            setDownloadUrl(url);
          } else {
            setDownloadUrl('https://github.com/cabharathikrishna-a11y/tEST/releases/download/v1.0.27/app-release.apk');
          }
        })
        .catch(err => {
          console.error('Error fetching download link:', err);
          setDownloadUrl('https://github.com/cabharathikrishna-a11y/tEST/releases/download/v1.0.27/app-release.apk');
        });

      // Fetch Version ID
      fetch('https://lifeosca.asia-southeast1.firebasedatabase.app/versionId.json')
        .then(res => res.json())
        .then(version => {
          if (version) {
            const cleanVersion = typeof version === 'string' ? version.replace(/^"|"$/g, '') : String(version);
            setVersionId(cleanVersion.startsWith('v') ? cleanVersion : `v${cleanVersion}`);
          }
        })
        .catch(err => {
          console.error('Error fetching version ID:', err);
        });
    };

    fetchConfigAndVersion();
    const interval = setInterval(fetchConfigAndVersion, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Google Sheet update logs dynamically with background polling
  useEffect(() => {
    const loadLogs = async (isFirstLoad = false) => {
      try {
        if (isFirstLoad) {
          setLogsLoading(true);
        }
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSll3VFo2NZZ041zBMjWekx7EQFSemxqyBSjjBEqCbnEgsR93GPsL2AnaaMxarRGjmZPN_U4L7_5F9W/pub?output=csv');
        if (!response.ok) {
          throw new Error('Failed to fetch developer log spreadsheet');
        }
        const csvText = await response.text();
        const parsed = parseCSVText(csvText);
        if (parsed && parsed.length > 0) {
          setLogs(parsed);
          setLogsError(null);
        } else {
          setLogs(DEFAULT_LOGS);
        }
      } catch (err: any) {
        console.error('Error loading dev logs:', err);
        setLogsError(err.message || 'Failed to fetch logs');
      } finally {
        if (isFirstLoad) {
          setLogsLoading(false);
        }
      }
    };

    loadLogs(true);
    const interval = setInterval(() => loadLogs(false), 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Google Sheet features / how-to-use guide dynamically with background polling
  useEffect(() => {
    const loadFeatures = async (isFirstLoad = false) => {
      try {
        if (isFirstLoad) {
          setFeaturesLoading(true);
        }
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSll3VFo2NZZ041zBMjWekx7EQFSemxqyBSjjBEqCbnEgsR93GPsL2AnaaMxarRGjmZPN_U4L7_5F9W/pub?output=csv&gid=1207041086');
        if (!response.ok) {
          throw new Error('Failed to fetch features spreadsheet');
        }
        const csvText = await response.text();
        const parsed = parseFeaturesCSV(csvText);
        if (parsed && parsed.length > 0) {
          setFeatures(parsed);
          setFeaturesError(null);
        }
      } catch (err: any) {
        console.error('Error loading features:', err);
        setFeaturesError(err.message || 'Failed to fetch features sheet');
      } finally {
        if (isFirstLoad) {
          setFeaturesLoading(false);
        }
      }
    };

    loadFeatures(true);
    const interval = setInterval(() => loadFeatures(false), 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, []);

  // Monitor Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Login Handler
  const handleLogin = async () => {
    setErrorMessage('');
    setIsAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMessage('The login popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      } else {
        setErrorMessage(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setDownloadStarted(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Download Trigger Handler
  const triggerDownload = () => {
    if (!downloadUrl) return;
    
    // Open download in a new tab
    window.open(downloadUrl, '_blank');
    
    // Immediately transition current tab to Thank You state
    setDownloadStarted(true);
  };

  // Windows Download Handler (downloads BOTH the APK and LD Player 9 installer)
  const handleWindowsDownload = () => {
    const apkUrl = downloadUrl || 'https://github.com/cabharathikrishna-a11y/tEST/releases/download/v1.0.27/app-release.apk';
    const ldPlayerUrl = 'https://res.ldrescdn.com/download/LDPlayer9.exe?n=LDPlayer9_ens_1552109_ld.exe';

    // Open APK download in a new tab
    window.open(apkUrl, '_blank');

    // Redirect current tab to the LD Player installer download URL
    window.location.href = ldPlayerUrl;

    // Transition current tab to Thank You state
    setDownloadStarted(true);
  };

  // SVG representation of the uploaded "LIFE OS" logo (enhanced with 3D layers, bevel, and active glossy shimmer)
  const LifeOSLogo = ({ className = "w-24 h-24" }: { className?: string }) => {
    // Determine dynamic font sizes and rounded corners based on logo size to keep text perfectly proportioned
    const isSmall = className.includes("w-10") || className.includes("w-8") || className.includes("w-12");
    const isMedium = className.includes("w-16") || className.includes("w-14") || className.includes("w-20");
    
    let roundedClass = "rounded-[24px]";
    let lifeTextSize = "text-[20px]";
    let osTextSize = "text-[24px]";
    let textGap = "gap-0.5";
    
    if (isSmall) {
      roundedClass = "rounded-xl";
      lifeTextSize = "text-[9px]";
      osTextSize = "text-[11px]";
      textGap = "gap-0";
    } else if (isMedium) {
      roundedClass = "rounded-2xl";
      lifeTextSize = "text-[13px]";
      osTextSize = "text-[16px]";
      textGap = "gap-0.5";
    }
    
    return (
      <div 
        className={`${className} ${roundedClass} relative flex flex-col items-center justify-center bg-gradient-to-b from-zinc-800 via-neutral-950 to-black border border-white/10 shadow-[0_12px_24px_rgba(30,58,138,0.3),_inset_0_1.5px_3px_rgba(255,255,255,0.15),_inset_0_-1.5px_8px_rgba(0,0,0,0.9)] overflow-hidden group/logo shrink-0`}
        style={{ animation: 'float-gentle 4s ease-in-out infinite' }}
      >
        <div className="absolute inset-0 bg-radial-at-t from-blue-500/25 via-transparent to-transparent"></div>
        
        {/* Light sweep animation */}
        <div className="absolute inset-y-0 -inset-x-12 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-12 translate-x-[-150%] group-hover/logo:animate-[sweep_1.8s_infinite]"></div>
        
        {/* Glossy overlay reflection */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>
        
        <div className={`relative z-10 flex flex-col items-center justify-center font-display leading-none select-none ${textGap}`}>
          <span 
            className={`${lifeTextSize} font-extrabold tracking-tight text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] bg-clip-text text-transparent bg-gradient-to-b from-blue-300 via-blue-400 to-blue-600`}
            style={{ textShadow: '0 0.5px 0 #93c5fd, 0 1px 0 #3b82f6, 0 1.5px 3px rgba(0,0,0,0.5)' }}
          >
            LIFE
          </span>
          <span 
            className={`${osTextSize} font-black tracking-widest text-blue-500 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]`}
            style={{ textShadow: '0 0.5px 0 #1e3a8a, 0 1px 2px rgba(0,0,0,0.6)' }}
          >
            OS
          </span>
        </div>
      </div>
    );
  };

  // 3D representation of green Android Symbol
  const AndroidLogo = ({ className = "w-14 h-14", iconOnly = false }: { className?: string; iconOnly?: boolean }) => {
    if (iconOnly) {
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path 
            fill="#3DDC84"
            d="M16.63 12.3c.4 0 .73-.33.73-.73 0-.4-.33-.73-.73-.73-.4 0-.73.33-.73.73 0 .4.33.73.73.73zm-9.26 0c.4 0 .73-.33.73-.73 0-.4-.33-.73-.73-.73-.4 0-.73.33-.73.73 0 .4.33.73.73.73zm9.52-3.15l1.63-2.82c.1-.17.04-.39-.13-.49-.17-.1-.39-.04-.49.13l-1.66 2.87C15.22 8.35 13.67 8 12 8s-3.22.35-4.6 1.02L5.74 6.15c-.1-.17-.32-.23-.49-.13-.17.1-.23.32-.13.49l1.63 2.82C4.1 10.51 2.2 13.29 2 16.57h20c-.2-3.28-2.1-6.06-4.75-7.42z"
          />
          <circle cx="16.63" cy="11.57" r="0.75" fill="#ffffff" />
          <circle cx="7.37" cy="11.57" r="0.75" fill="#ffffff" />
        </svg>
      );
    }
    return (
      <div className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-emerald-950 to-zinc-950 rounded-[18px] border border-emerald-500/30 shadow-[0_8px_16px_rgba(16,185,129,0.2),_inset_0_1.5px_3px_rgba(255,255,255,0.1),_inset_0_-1.5px_8px_rgba(0,0,0,0.8)] overflow-hidden group/android`}>
        {/* Glow aura */}
        <div className="absolute inset-0 bg-radial-at-t from-emerald-500/20 via-transparent to-transparent"></div>
        
        {/* 3D Glass shine reflection */}
        <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t-[18px]"></div>
        
        {/* Dynamic light streak */}
        <div className="absolute -inset-y-12 -inset-x-6 w-3 bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-12 translate-x-[-150%] group-hover/android:animate-[sweep_1.5s_infinite]"></div>
        
        {/* 3D-effect Android SVG */}
        <div className="relative z-10 flex items-center justify-center transform group-hover/android:scale-110 group-hover/android:rotate-3 transition-transform duration-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
          <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="android3dGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a7f3d0" />
                <stop offset="40%" stopColor="#3DDC84" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <filter id="android3dShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="0.8" floodColor="#064e3b" floodOpacity="1" />
              </filter>
            </defs>
            <path 
              fill="url(#android3dGrad)"
              filter="url(#android3dShadow)"
              d="M16.63 12.3c.4 0 .73-.33.73-.73 0-.4-.33-.73-.73-.73-.4 0-.73.33-.73.73 0 .4.33.73.73.73zm-9.26 0c.4 0 .73-.33.73-.73 0-.4-.33-.73-.73-.73-.4 0-.73.33-.73.73 0 .4.33.73.73.73zm9.52-3.15l1.63-2.82c.1-.17.04-.39-.13-.49-.17-.1-.39-.04-.49.13l-1.66 2.87C15.22 8.35 13.67 8 12 8s-3.22.35-4.6 1.02L5.74 6.15c-.1-.17-.32-.23-.49-.13-.17.1-.23.32-.13.49l1.63 2.82C4.1 10.51 2.2 13.29 2 16.57h20c-.2-3.28-2.1-6.06-4.75-7.42z"
            />
            {/* Highlighted white eyes for Android robot face */}
            <circle cx="16.63" cy="11.57" r="0.75" fill="#ffffff" />
            <circle cx="7.37" cy="11.57" r="0.75" fill="#ffffff" />
          </svg>
        </div>
      </div>
    );
  };

  // 3D representation of blue Windows Symbol
  const WindowsLogo = ({ className = "w-14 h-14", iconOnly = false }: { className?: string; iconOnly?: boolean }) => {
    if (iconOnly) {
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="#00A4EF" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.102zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z" />
        </svg>
      );
    }
    return (
      <div className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-blue-950 to-zinc-950 rounded-[18px] border border-blue-500/30 shadow-[0_8px_16px_rgba(59,130,246,0.2),_inset_0_1.5px_3px_rgba(255,255,255,0.1),_inset_0_-1.5px_8px_rgba(0,0,0,0.8)] overflow-hidden group/windows`}>
        {/* Glow aura */}
        <div className="absolute inset-0 bg-radial-at-t from-blue-500/20 via-transparent to-transparent"></div>
        
        {/* 3D Glass shine reflection */}
        <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t-[18px]"></div>
        
        {/* Dynamic light streak */}
        <div className="absolute -inset-y-12 -inset-x-6 w-3 bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-12 translate-x-[-150%] group-hover/windows:animate-[sweep_1.5s_infinite]"></div>
        
        {/* 3D-effect Windows SVG */}
        <div className="relative z-10 flex items-center justify-center transform group-hover/windows:scale-110 group-hover/windows:rotate-3 transition-transform duration-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
          <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="windows3dGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="40%" stopColor="#00A4EF" />
                <stop offset="100%" stopColor="#1e40af" />
              </linearGradient>
              <filter id="windows3dShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="0.8" floodColor="#1e3a8a" floodOpacity="1" />
              </filter>
            </defs>
            <path 
              fill="url(#windows3dGrad)"
              filter="url(#windows3dShadow)"
              d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.102zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z"
            />
          </svg>
        </div>
      </div>
    );
  };

  // Render Loader screen
  if (isAuthLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-950/30 rounded-full blur-[100px] -z-10"></div>
        
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="mb-8"
        >
          <LifeOSLogo className="w-28 h-28" />
        </motion.div>
        
        <div className="flex items-center gap-3 text-blue-400 font-mono text-sm bg-blue-950/30 px-4 py-2 rounded-full border border-blue-900/40">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{isVerifying ? 'Verifying Credentials...' : 'Loading portal...'}</span>
        </div>
      </div>
    );
  }

  // Render Login screen (Not authenticated or verified check failed)
  const showLoginScreen = true; // Toggle to true to re-enable sign-in gate
  if (showLoginScreen && (!user || !isVerified)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-950/30 rounded-full blur-[100px] -z-10"></div>
        
        <div className="w-full max-w-md z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
          >
            {/* Gloss border decoration */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

            <div className="flex flex-col items-center text-center">
              <LifeOSLogo className="w-24 h-24 mb-6" />
              
              <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white mb-2 uppercase">
                LIFE OS PORTAL
              </h1>
              <p className="text-gray-400 text-sm max-w-xs mb-8">
                Welcome to the official download center. Please sign in with your authorized Google Account.
              </p>

              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full bg-red-950/20 border border-red-900/30 rounded-2xl p-4 mb-6 text-left"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium text-xs font-mono uppercase tracking-wider mb-1">Access Restricted</p>
                      <p className="text-red-200 text-sm leading-relaxed font-sans">{errorMessage}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Login Button */}
              <button
                onClick={() => handleLogin()}
                className="w-full bg-white text-gray-900 font-bold hover:bg-gray-100 px-6 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm tracking-wide"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.962 5.962 0 018 12.56a5.962 5.962 0 015.99-5.96 5.86 5.86 0 014.113 1.638l3.12-3.12A9.97 9.97 0 0013.99 2 9.99 9.99 0 004 12c0 5.523 4.477 10 9.99 10 5.53 0 10.01-4.477 10.01-10 0-.585-.05-1.17-.15-1.715H12.24z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="mt-8 pt-6 border-t border-white/5 w-full flex flex-col gap-2 items-center text-[11px] text-gray-500 font-mono">
                <div className="flex items-center gap-1.5 text-blue-500">
                  <Lock className="w-3.5 h-3.5" />
                  <span>SECURE VERIFICATION IN USE</span>
                </div>
                <span>Requires pre-authorized whitelist entry</span>
              </div>
            </div>
          </motion.div>

          {/* Iframe Fallback Assistance */}
          <div className="mt-4 text-center">
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-blue-400/80 hover:text-blue-300 underline underline-offset-4 inline-flex items-center gap-1 hover:gap-1.5 transition-all"
            >
              <span>If popup fails, open in a new tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Render Thank You screen
  if (downloadStarted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-950/30 rounded-full blur-[100px] -z-10"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-zinc-900/50 border border-white/5 p-8 rounded-[32px] text-center shadow-2xl relative backdrop-blur-xl"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
          
          <div className="w-20 h-20 bg-emerald-950/20 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>

          <h2 className="text-3xl font-display font-bold text-white mb-3">Thank You!</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            Your <span className="text-blue-400 font-semibold">Life OS</span> application download has successfully initiated in a new tab.
          </p>

          <div className="bg-zinc-950 rounded-2xl p-4 border border-white/5 text-left text-xs text-gray-400 space-y-3 font-sans mb-8">
            <p className="font-semibold text-gray-200 uppercase tracking-wide font-mono text-[10px]">What to do next:</p>
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold font-mono">1.</span>
              <span>Confirm the `.apk` download in your downloads folder.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold font-mono">2.</span>
              <span>You can safely **close the download tab** that was just opened.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold font-mono">3.</span>
              <span>On Android, open the APK file and select "Install" (enable install from unknown sources if prompted).</span>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold font-mono">4.</span>
              <span>On Windows, open **LD Player**, click "Install APK" in the toolbar, and select this downloaded file.</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setDownloadStarted(false)}
              className="shining-button-3d w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide"
            >
              Back to Portal
            </button>
            
            <button
              onClick={triggerDownload}
              className="text-xs text-gray-400 hover:text-white underline underline-offset-4 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <span>Download didn't start? Click here to retry</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render main Dashboard (Authenticated and Whitelisted)
  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-[#020205] text-gray-200 font-sans relative overflow-y-auto md:overflow-hidden flex flex-col justify-between">
      {/* 3D Digital Grid Backplate */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 95%)'
        }}
      ></div>

      {/* Advanced Animated Atmospheric Glow Gradients */}
      <div 
        className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-600/10 to-indigo-600/5 rounded-full blur-[130px] -z-10"
        style={{ animation: 'float-gentle 14s ease-in-out infinite' }}
      ></div>
      <div 
        className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/5 to-blue-900/10 rounded-full blur-[120px] -z-10"
        style={{ animation: 'float-reverse 18s ease-in-out infinite' }}
      ></div>
      <div 
        className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/5 rounded-full blur-[150px] -z-10"
        style={{ animation: 'pulse-slow 8s ease-in-out infinite' }}
      ></div>

      {/* Header Bar */}
      <header className="z-20 bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 px-6 md:px-10 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between w-full">
          {/* Left: Logo & App Name */}
          <div className="flex items-center gap-3">
            <LifeOSLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
            <div className="flex flex-col items-start">
              <span className="font-display font-black text-blue-500 text-base sm:text-lg tracking-wider leading-none uppercase select-none">LIFE OS</span>
              {user && (
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 select-none uppercase tracking-widest font-extrabold mt-1.5 scale-90 origin-left">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  Authorized
                </span>
              )}
            </div>
          </div>

          {/* Right Column: User profile details & logout */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest leading-none mb-1 font-mono">AUTHORIZED USER</span>
                  <span className="text-xs font-semibold text-white leading-none font-mono">{user.email}</span>
                </div>
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-blue-500/40 p-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border border-blue-500/40 p-0.5">
                    <div className="w-full h-full bg-zinc-850 rounded-full flex items-center justify-center text-xs font-bold text-blue-450">
                      U
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleLogout}
                  className="bg-zinc-900 border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-400 p-2 rounded-xl transition duration-200 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 bg-blue-950/25 border border-blue-900/30 px-3 py-1.5 rounded-xl select-none">
                <ShieldCheck className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-xs font-mono text-blue-300">GUEST APPROVED</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-4 flex-1 flex flex-col justify-center gap-6 w-full md:min-h-0 md:overflow-hidden overflow-visible">
        {/* Core Showcase Hero */}
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-1"
          >
            <LifeOSLogo className="w-16 h-16 mx-auto" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Everything in One Place.
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            Welcome to the Life OS Hub. Access the latest APK releases and Windows application configurations directly from our secure storage.
          </p>
        </div>

        {/* Download Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full relative z-10">
          {/* ANDROID DEVICE BOX */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="neon-depth-card p-5 rounded-[24px] flex flex-col items-center gap-4 transition-all duration-300 relative overflow-hidden text-center justify-between group/card border-t border-emerald-500/20"
          >
            {/* Ambient card back glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/10 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
            
            <div className="text-[#3DDC84] drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center transform group-hover/card:scale-105 transition-transform duration-300">
              <AndroidLogo />
            </div>
            
            <div className="space-y-0.5">
              <h3 className="text-xl font-display font-extrabold text-white tracking-tight uppercase group-hover/card:text-emerald-400 transition-colors">
                Life OS Mobile
              </h3>
              <p className="text-[10px] text-emerald-400/80 font-mono tracking-widest uppercase">{versionId} Release &bull; 50MB</p>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              This app has these features: Tasks, Habits, Calendar, Focus Timer, Notes, Countdown, etc. features available.
            </p>

            <button
              onClick={triggerDownload}
              className="shining-button-3d w-full py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white rounded-xl font-black flex items-center justify-center gap-2 cursor-pointer text-xs tracking-widest uppercase"
            >
              <span>DOWNLOAD</span>
            </button>
          </motion.div>

          {/* WINDOWS EMULATOR BOX */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="neon-depth-card p-5 rounded-[24px] flex flex-col items-center gap-4 transition-all duration-300 relative overflow-hidden text-center justify-between group/card border-t border-blue-500/20"
          >
            {/* Ambient card back glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950/10 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>

            <div className="text-[#00A4EF] drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center transform group-hover/card:scale-105 transition-transform duration-300">
              <WindowsLogo />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-xl font-display font-extrabold text-white tracking-tight uppercase group-hover/card:text-blue-400 transition-colors">
                LIFE OS WINDOWS
              </h3>
              <p className="text-[10px] text-blue-400/80 font-mono tracking-widest uppercase">{versionId} Optimized &bull; 1GB</p>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              This application has these features: Tasks, Habits, Calendar, Focus Timer, Notes, Countdown, etc. features available. This program will run by using LD Player.
            </p>

            <button
              onClick={handleWindowsDownload}
              className="shining-button-3d w-full py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white rounded-xl font-black flex items-center justify-center gap-2 cursor-pointer text-xs tracking-widest uppercase"
            >
              <span>DOWNLOAD</span>
            </button>
          </motion.div>
        </div>

        {/* Release Notes snippet */}
        <div className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-lg uppercase tracking-wider border border-blue-500/20">
              Latest Update
            </div>
            <div className="text-xs font-black text-white font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
              {versionId}
            </div>
          </div>
          <div className="hidden sm:block h-4 w-px bg-white/15 shrink-0"></div>
          <div className="flex-1 text-[11px] sm:text-xs text-gray-400 leading-normal flex flex-col sm:flex-row sm:items-center sm:gap-3 overflow-hidden">
            {logsLoading && logs.length === 0 ? (
              <span className="text-gray-450 font-mono text-[10px] flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                Syncing with release database...
              </span>
            ) : matchedLog ? (
              <>
                <span className="text-emerald-400 font-bold shrink-0 mr-1">{matchedLog.title}</span>
                {matchedLog.points && matchedLog.points.length > 0 ? (
                  matchedLog.points.slice(0, 2).map((pt, pIdx) => (
                    <span key={pIdx} className="text-gray-300 font-medium truncate max-w-[280px] sm:max-w-none">
                      &bull; {pt}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 italic">No release notes logged for this version.</span>
                )}
              </>
            ) : (
              <>
                <span className="text-white font-medium">&bull; Optimized memory usage for Focus Timer.</span>
                <span className="text-gray-500 sm:text-gray-400">&bull; Fixed database synchronization bugs.</span>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer with Blogs & Guide Buttons */}
      <footer className="py-4 flex flex-col items-center justify-center gap-3 mt-auto relative z-10 select-none">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4">
          <button
            onClick={() => setBlogsOpen(true)}
            className="shining-button-3d-secondary w-full sm:w-auto px-6 py-2 bg-zinc-900 border border-white/10 text-gray-300 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-zinc-800 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dev Logs & Project Blog</span>
          </button>
          
          <button
            onClick={() => setGuideOpen(true)}
            className="shining-button-3d-secondary w-full sm:w-auto px-6 py-2 bg-zinc-900 border border-white/10 text-gray-300 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-zinc-800 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>How to use the app</span>
          </button>
        </div>
        <p className="text-[9px] text-gray-600 uppercase tracking-widest text-center px-4">
          Restricted Access Site &bull; Contact: <span className="text-blue-800 font-semibold">cabharathikrishna@gmail.com</span>
        </p>
      </footer>

      {/* Dev Logs & Project Blog - Adaptive New Page Overlay */}
      <AnimatePresence>
        {blogsOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 bg-[#020205] z-50 overflow-y-auto md:overflow-hidden flex flex-col font-sans text-gray-200"
          >
            {/* Ambient background glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-950/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,#0a0a14_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none"></div>

            {/* Navigation Header Bar */}
            <header className="z-20 bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 px-6 md:px-10 py-3.5">
              <div className="max-w-5xl mx-auto flex items-center justify-between w-full">
                {/* Left: Logo & Main Subheading */}
                <div className="flex items-center gap-3">
                  <LifeOSLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="font-display font-black text-blue-500 text-base sm:text-lg tracking-wider leading-none uppercase select-none">LIFE OS</span>
                    <span className="text-[8px] sm:text-[9px] font-mono text-gray-400 tracking-[0.12em] mt-1.5 uppercase font-semibold whitespace-nowrap select-none">DEV LOGS & RELEASE PORTAL</span>
                  </div>
                </div>

                {/* Right: Authorized badge & Close button */}
                <div className="flex items-center gap-4">
                  {user && (
                    <span className="hidden sm:flex text-[9px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1 rounded-full items-center gap-1.5 select-none uppercase tracking-widest font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Authorized
                    </span>
                  )}
                  <button
                    onClick={() => setBlogsOpen(false)}
                    className="shining-button-3d shining-button-3d-continuous bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <span>CLOSE</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-6 z-10 min-h-0 md:h-[calc(100vh-80px)]">
              {logsLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400 font-mono text-sm">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span>Syncing with release database...</span>
                </div>
              ) : (
                (() => {
                  return (
                    <div className={comingSoonLogs.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-8 h-full min-h-0" : "max-w-3xl mx-auto h-full min-h-0"}>
                      
                      {/* LEFT SIDE: VERSION INFO & IMPLEMENTED FEATURES */}
                      <div className="flex flex-col h-full min-h-0">
                        {/* 3D Fancy Released Logo Header */}
                        <div className="heading-3d-container shrink-0 mb-4">
                          <div className="heading-3d-card border-t-2 border-emerald-500/40 bg-zinc-950/70 p-4 rounded-2xl flex items-center justify-between border border-white/5 relative overflow-hidden select-none group">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                            
                            <div className="flex items-center gap-3.5 relative z-10">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="logo-3d-fancy-released font-black font-display text-xl sm:text-2xl tracking-widest uppercase italic text-emerald-400 leading-none">
                                  RELEASED
                                </h3>
                                <p className="text-[9px] font-mono text-emerald-400/60 uppercase tracking-widest mt-1.5">Production Build Logs</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 relative z-10 font-mono bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                              <span className="text-[10px] text-gray-300 font-extrabold uppercase tracking-widest">{releasedLogs.length} Ver</span>
                            </div>
                          </div>
                        </div>

                        {/* Released Logs list */}
                        <div className="flex-1 space-y-6 md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-12">
                          {releasedLogs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 font-mono text-xs">
                              No released versions logged yet.
                            </div>
                          ) : (
                            releasedLogs.map((log, index) => (
                              <LogCard key={index} log={log} type="released" index={index} />
                            ))
                          )}
                        </div>
                      </div>

                      {/* RIGHT SIDE: FUTURE ROADMAP & COMING SOON */}
                      {comingSoonLogs.length > 0 && (
                        <div className="flex flex-col h-full min-h-0">
                          {/* 3D Fancy Coming Soon Logo Header */}
                          <div className="heading-3d-container shrink-0 mb-4">
                            <div className="heading-3d-card border-t-2 border-blue-500/40 bg-zinc-950/70 p-4 rounded-2xl flex items-center justify-between border border-white/5 relative overflow-hidden select-none group">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                              
                              <div className="flex items-center gap-3.5 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                  <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="logo-3d-fancy-comingsoon font-black font-display text-xl sm:text-2xl tracking-widest uppercase italic text-blue-400 leading-none">
                                    COMING SOON
                                  </h3>
                                  <p className="text-[9px] font-mono text-blue-400/60 uppercase tracking-widest mt-1.5">Development Roadmap</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 relative z-10 font-mono bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                <span className="text-[10px] text-gray-300 font-extrabold uppercase tracking-widest">{comingSoonLogs.length} Roadmap</span>
                              </div>
                            </div>
                          </div>

                          {/* Coming Soon Logs list */}
                          <div className="flex-1 space-y-6 md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-12">
                            {comingSoonLogs.map((log, index) => (
                              <LogCard key={index} log={log} type="coming_soon" index={index} />
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How to use the app - Adaptive New Page Overlay */}
      <AnimatePresence>
        {guideOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 bg-[#020205] z-50 overflow-y-auto md:overflow-hidden flex flex-col font-sans text-gray-200"
          >
            {/* Ambient background glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-950/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,#0a0a14_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none"></div>

            {/* Navigation Header Bar */}
            <header className="z-20 bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 px-6 md:px-10 py-3.5">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LifeOSLogo className="w-8 h-8" />
                  <div>
                    <span className="font-display font-bold text-blue-500 text-base tracking-tight block leading-none">LIFE OS</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mt-1 block">USER MANUAL & GUIDE</span>
                  </div>
                </div>

                <button
                  onClick={() => setGuideOpen(false)}
                  className="shining-button-3d shining-button-3d-continuous bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <span>CLOSE</span>
                </button>
              </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-6 z-10 min-h-0 md:h-[calc(100vh-80px)] flex flex-col gap-6">
              
              {/* 3D Title Header */}
              <div className="heading-3d-container shrink-0">
                <div className="heading-3d-card border-t-2 border-blue-500/40 bg-zinc-950/70 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between border border-white/5 relative overflow-hidden select-none group gap-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                  
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="logo-3d-fancy-comingsoon font-black font-display text-xl sm:text-2xl tracking-widest uppercase italic text-blue-400 leading-none">
                        LIFE OS MANUAL
                      </h3>
                      <p className="text-[9px] font-mono text-blue-400/60 uppercase tracking-widest mt-1.5">How to install & use the applications</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 relative z-10 font-mono bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-300 font-extrabold uppercase tracking-widest">Active System Guide</span>
                  </div>
                </div>
              </div>

              {/* Bento Grid Tabs */}
              <div className="grid grid-cols-3 gap-3 md:gap-4 shrink-0 select-none">
                <button
                  onClick={() => setActiveGuideTab('features')}
                  className={`p-3 md:p-4 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2.5 cursor-pointer text-center md:text-left ${
                    activeGuideTab === 'features'
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
                      : 'bg-zinc-950/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/40 text-gray-400'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${activeGuideTab === 'features' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-900 text-gray-500'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black tracking-wider uppercase">Features</div>
                    <div className="hidden md:block text-[9px] font-mono text-gray-500 mt-0.5 truncate animate-pulse">What Life OS offers</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveGuideTab('android')}
                  className={`p-3 md:p-4 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2.5 cursor-pointer text-center md:text-left ${
                    activeGuideTab === 'android'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                      : 'bg-zinc-950/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/40 text-gray-400'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${activeGuideTab === 'android' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-gray-500'}`}>
                    <AndroidLogo iconOnly={true} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black tracking-wider uppercase">Android APK</div>
                    <div className="hidden md:block text-[9px] font-mono text-gray-500 mt-0.5 truncate">How to install APK</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveGuideTab('windows')}
                  className={`p-3 md:p-4 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2.5 cursor-pointer text-center md:text-left ${
                    activeGuideTab === 'windows'
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
                      : 'bg-zinc-950/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/40 text-gray-400'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${activeGuideTab === 'windows' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-900 text-gray-500'}`}>
                    <WindowsLogo iconOnly={true} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black tracking-wider uppercase">Windows Setup</div>
                    <div className="hidden md:block text-[9px] font-mono text-gray-500 mt-0.5 truncate">Setup on LD Player</div>
                  </div>
                </button>
              </div>

              {/* Dynamic Panel view */}
              <div className="flex-1 md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-12">
                
                {/* 1. FEATURES TAB */}
                {activeGuideTab === 'features' && (
                  <div>
                    {selectedCategory === null ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-5"
                      >
                        {[
                          {
                            title: "Deepa AI",
                            desc: "An AI-powered cognitive companion integrated directly into Life OS to help analyze thoughts, generate summaries, and answer any complex queries.",
                            icon: <Brain className="w-4 h-4 text-emerald-400" />,
                            color: "from-emerald-500/20 to-teal-500/5 border-emerald-500/25 text-emerald-400",
                            badge: "Cognitive Companion"
                          },
                          {
                            title: "Keep Notes",
                            desc: "Quick-access scratchpad to capture fleeting thoughts, draft documents, and structure ideas with fully searchable fast indexing.",
                            icon: <StickyNote className="w-4 h-4 text-yellow-400" />,
                            color: "from-yellow-500/20 to-amber-500/5 border-yellow-500/25 text-yellow-400",
                            badge: "Ideation Board"
                          },
                          {
                            title: "Health",
                            desc: "Track physical and mental wellness. Monitor daily water intake, log sleep cycles, record workouts, and view overall vitality trends.",
                            icon: <Activity className="w-4 h-4 text-red-400" />,
                            color: "from-red-500/20 to-rose-500/5 border-red-500/25 text-red-400",
                            badge: "Vitality Track"
                          },
                          {
                            title: "Search",
                            desc: "A universal instant search system spanning across all databases. Retrieve any note, task, contact, or logged event in milliseconds.",
                            icon: <Search className="w-4 h-4 text-blue-400" />,
                            color: "from-blue-500/20 to-cyan-500/5 border-blue-500/25 text-blue-400",
                            badge: "Omni Index"
                          },
                          {
                            title: "Tasks",
                            desc: "High-octane task management engine with checklists, status categories, smart priorities, subtasks, and real-time completion tracking.",
                            icon: <CheckSquare className="w-4 h-4 text-indigo-400" />,
                            color: "from-indigo-500/20 to-violet-500/5 border-indigo-500/25 text-indigo-400",
                            badge: "Action Center"
                          },
                          {
                            title: "Calendar",
                            desc: "Beautiful scheduling hub mapping out all of your time-sensitive logs, upcoming deadlines, and custom daily itineraries.",
                            icon: <Calendar className="w-4 h-4 text-purple-400" />,
                            color: "from-purple-500/20 to-fuchsia-500/5 border-purple-500/25 text-purple-400",
                            badge: "Agenda Planner"
                          },
                          {
                            title: "Timer",
                            desc: "An advanced customizable focus tool combining traditional Pomodoro intervals, countdown limits, and professional stopwatches.",
                            icon: <Timer className="w-4 h-4 text-orange-400" />,
                            color: "from-orange-500/20 to-amber-500/5 border-orange-500/25 text-orange-400",
                            badge: "Focus Engine"
                          },
                          {
                            title: "Arena",
                            desc: "A highly engaging gamified interface. Earn experience points (XP) for completed habits and maintain your daily multiplier streak.",
                            icon: <Trophy className="w-4 h-4 text-amber-400" />,
                            color: "from-amber-500/20 to-yellow-500/5 border-amber-500/25 text-amber-400",
                            badge: "Gamified XP"
                          },
                          {
                            title: "Habits",
                            desc: "A powerful routine builder with long-term streak calculations, completion logs, and dynamic charts to track behavioral consistency.",
                            icon: <Flame className="w-4 h-4 text-emerald-400" />,
                            color: "from-emerald-500/20 to-green-500/5 border-emerald-500/25 text-emerald-400",
                            badge: "Consistency Engine"
                          },
                          {
                            title: "Countdown",
                            desc: "Build anticipation for key lifetime events. Track active days, hours, and seconds remaining with ambient visual countdown widgets.",
                            icon: <Hourglass className="w-4 h-4 text-rose-400" />,
                            color: "from-rose-500/20 to-pink-500/5 border-rose-500/25 text-rose-400",
                            badge: "Milestones"
                          },
                          {
                            title: "Journal",
                            desc: "Daily journaling tool to log self-reflections, mood ratings, and personal discoveries with full markdown support.",
                            icon: <BookOpen className="w-4 h-4 text-sky-400" />,
                            color: "from-sky-500/20 to-blue-500/5 border-sky-500/25 text-sky-400",
                            badge: "Self-Reflection"
                          },
                          {
                            title: "Contacts",
                            desc: "A lightweight CRM to manage your personal network. Store addresses, phone numbers, emails, and log historical communication history.",
                            icon: <Contact className="w-4 h-4 text-teal-400" />,
                            color: "from-teal-500/20 to-emerald-500/5 border-teal-500/25 text-teal-400",
                            badge: "Personal CRM"
                          },
                          {
                            title: "File Explorer",
                            desc: "Browse and preview uploaded file attachments, custom documents, images, and audio assets inside your offline workspace storage.",
                            icon: <FolderOpen className="w-4 h-4 text-blue-400" />,
                            color: "from-blue-500/20 to-indigo-500/5 border-blue-500/25 text-blue-400",
                            badge: "Workspace Vault"
                          },
                          {
                            title: "Finances",
                            desc: "Robust personal ledger to manage daily expense logs, visualize budget breakdowns, and analyze periodic savings trends.",
                            icon: <CircleDollarSign className="w-4 h-4 text-emerald-400" />,
                            color: "from-emerald-500/20 to-green-500/5 border-emerald-500/25 text-emerald-400",
                            badge: "Personal Ledger"
                          },
                          {
                            title: "Analytics",
                            desc: "Comprehensive central dashboard gathering all metrics. View productivity trends, streak correlations, and financial charts.",
                            icon: <BarChart3 className="w-4 h-4 text-violet-400" />,
                            color: "from-violet-500/20 to-purple-500/5 border-violet-500/25 text-violet-400",
                            badge: "Unified Metrics"
                          },
                          {
                            title: "Settings",
                            desc: "Complete terminal console to configure application modules, adjust layouts, reorder dashboard tabs, and manage database backups.",
                            icon: <Settings className="w-4 h-4 text-gray-400" />,
                            color: "from-gray-500/20 to-zinc-500/5 border-gray-500/25 text-gray-400",
                            badge: "Terminal Panel"
                          }
                        ].map((feat, idx) => {
                          return (
                            <button 
                              key={idx}
                              onClick={() => {
                                const normTitle = feat.title.trim();
                                setSelectedCategory(normTitle);
                                setSelectedSubCategory(null);
                              }}
                              className="bg-zinc-950/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between text-left group hover:border-blue-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer w-full select-none"
                            >
                              <div className={`absolute inset-0 bg-gradient-to-br ${feat.color.split(' ')[0]} ${feat.color.split(' ')[1]} pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity`}></div>
                              
                              <div className="flex items-start justify-between relative z-10 mb-4 w-full">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-950 border border-white/10 ${feat.color.split(' ')[3]}`}>
                                    {feat.icon}
                                  </div>
                                  <h4 className="text-base font-extrabold text-white tracking-tight group-hover:text-blue-300 transition-colors">{feat.title}</h4>
                                </div>
                                <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded-full text-gray-400 uppercase tracking-widest">{feat.badge}</span>
                              </div>

                              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed relative z-10 font-sans w-full">{feat.desc}</p>
                              
                              <div className="mt-5 flex items-center gap-1.5 text-[10px] font-mono text-blue-400/60 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                                <span>EXPLORE WALKTHROUGH</span>
                                <ChevronRight className="w-3 h-3" />
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    ) : selectedSubCategory === null ? (
                      /* 2. SUB-CATEGORIES GRID VIEW (PAGE 2) */
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        {/* Detail Header */}
                        <div className="bg-zinc-950/60 border border-white/5 rounded-3xl p-5 relative overflow-hidden select-none animate-fade-in">
                          <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_50%)"></div>
                          
                          <button
                            onClick={() => {
                              setSelectedCategory(null);
                              setSelectedSubCategory(null);
                            }}
                            className="text-xs font-mono text-gray-500 hover:text-white flex items-center gap-1.5 mb-4 group cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            <span>Back to Features Grid</span>
                          </button>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h4 className="text-2xl font-black font-display text-white tracking-wide flex items-center gap-2.5">
                                <span className="text-blue-400">{selectedCategory}</span>
                                <span className="text-xs font-mono font-bold bg-blue-500/15 border border-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full uppercase tracking-widest h-fit">Walkthroughs</span>
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl font-sans leading-relaxed">
                                Select a walkthrough workflow below to view step-by-step instructions.
                              </p>
                            </div>

                            {featuresLoading && (
                              <div className="flex items-center gap-2 font-mono text-[10px] text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Syncing guides...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* List of subcategories as similar buttons */}
                        {(() => {
                          const sheetMatches = features.filter(f => f.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim());
                          
                          let subCategoriesList: { subCategory: string; steps: string[] }[] = [];
                          
                          if (sheetMatches.length > 0) {
                            subCategoriesList = sheetMatches.map(row => ({
                              subCategory: row.subCategory.trim() || "Overview",
                              steps: row.steps
                            }));
                          } else {
                            subCategoriesList = FALLBACK_FEATURES_MAP[selectedCategory] || [
                              {
                                subCategory: "Overview",
                                steps: [
                                  `Welcome to ${selectedCategory}.`,
                                  "We are currently updating our interactive user manuals for this feature.",
                                  "Check back soon as we continuously synchronize live guides from our cloud database!"
                                ]
                              }
                            ];
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {subCategoriesList.map((sc, scIdx) => {
                                const stepCount = sc.steps ? sc.steps.length : 0;
                                
                                // Color schemes matching the app's professional style
                                const colorSchemes = [
                                  "from-blue-500/20 to-cyan-500/5 border-blue-500/25 text-blue-400",
                                  "from-emerald-500/20 to-teal-500/5 border-emerald-500/25 text-emerald-400",
                                  "from-indigo-500/20 to-violet-500/5 border-indigo-500/25 text-indigo-400",
                                  "from-amber-500/20 to-yellow-500/5 border-amber-500/25 text-amber-400",
                                  "from-red-500/20 to-rose-500/5 border-red-500/25 text-red-400",
                                  "from-purple-500/20 to-fuchsia-500/5 border-purple-500/25 text-purple-400",
                                ];
                                const scheme = colorSchemes[scIdx % colorSchemes.length];

                                return (
                                  <button
                                    key={scIdx}
                                    onClick={() => setSelectedSubCategory(sc.subCategory)}
                                    className="bg-zinc-950/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between text-left group hover:border-blue-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer w-full select-none"
                                  >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${scheme.split(' ')[0]} ${scheme.split(' ')[1]} pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity`}></div>
                                    
                                    <div className="flex items-start justify-between relative z-10 mb-4 w-full">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-950 border border-white/10 ${scheme.split(' ')[3]}`}>
                                          <Compass className="w-4 h-4" />
                                        </div>
                                        <h4 className="text-base font-extrabold text-white tracking-tight group-hover:text-blue-300 transition-colors">{sc.subCategory}</h4>
                                      </div>
                                      <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-gray-400 uppercase tracking-widest">
                                        {stepCount} {stepCount === 1 ? 'Step' : 'Steps'}
                                      </span>
                                    </div>

                                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed relative z-10 font-sans w-full">
                                      Interactive walkthrough guiding you step-by-step through the {sc.subCategory.toLowerCase()} workflows in Life OS.
                                    </p>

                                    <div className="mt-5 flex items-center gap-1.5 text-[10px] font-mono text-blue-400/60 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                                      <span>START WALKTHROUGH</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </motion.div>
                    ) : (
                      /* 3. STEP BY STEP DETAILED WALKTHROUGH VIEW (PAGE 3) */
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        {/* Detail Header */}
                        <div className="bg-zinc-950/60 border border-white/5 rounded-3xl p-5 relative overflow-hidden select-none animate-fade-in">
                          <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_50%)"></div>
                          
                          <button
                            onClick={() => {
                              setSelectedSubCategory(null);
                            }}
                            className="text-xs font-mono text-gray-500 hover:text-white flex items-center gap-1.5 mb-4 group cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            <span>Back to {selectedCategory} Guides</span>
                          </button>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="text-[10px] font-mono text-blue-400 font-bold tracking-widest uppercase mb-1">{selectedCategory} Walkthrough</div>
                              <h4 className="text-2xl font-black font-display text-white tracking-wide flex items-center gap-2.5">
                                <span>{selectedSubCategory}</span>
                                <span className="text-xs font-mono font-bold bg-blue-500/15 border border-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full uppercase tracking-widest h-fit">Active</span>
                              </h4>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedCategory(null);
                                setSelectedSubCategory(null);
                              }}
                              className="text-[10px] font-mono text-gray-500 hover:text-white border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl bg-zinc-950/40 cursor-pointer self-start sm:self-auto transition-colors"
                            >
                              Close & View All Features
                            </button>
                          </div>
                        </div>

                        {/* Walkthrough list */}
                        {(() => {
                          const sheetMatches = features.filter(f => f.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim());
                          
                          let subCategoriesList: { subCategory: string; steps: string[] }[] = [];
                          
                          if (sheetMatches.length > 0) {
                            subCategoriesList = sheetMatches.map(row => ({
                              subCategory: row.subCategory.trim() || "Overview",
                              steps: row.steps
                            }));
                          } else {
                            subCategoriesList = FALLBACK_FEATURES_MAP[selectedCategory] || [];
                          }

                          const activeSub = subCategoriesList.find(s => s.subCategory.toLowerCase() === selectedSubCategory.toLowerCase()) || subCategoriesList[0];

                          return (
                            <div className="space-y-6 animate-fade-in">
                              {activeSub && activeSub.steps && activeSub.steps.length > 0 ? (
                                activeSub.steps.map((rawStep, stepIdx) => {
                                  const parsed = parseStepText(rawStep);
                                  
                                  if (parsed.imageUrl) {
                                    // Alternating alignment layout
                                    // Photo left when index is even, photo right when index is odd
                                    const isPhotoLeft = stepIdx % 2 === 0;
                                    
                                    return (
                                      <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: stepIdx * 0.05 }}
                                        key={stepIdx}
                                        className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 hover:border-blue-500/20 transition-all duration-300 shadow-xl relative overflow-hidden"
                                      >
                                        <div className={`flex flex-col ${isPhotoLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 items-start`}>
                                          {/* Photo container */}
                                          <div className="w-full md:w-1/2 shrink-0">
                                            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                              <img 
                                                src={parsed.imageUrl} 
                                                alt={`Step ${stepIdx + 1} screenshot`}
                                                referrerPolicy="no-referrer"
                                                className="w-full h-auto max-h-[320px] object-cover rounded-2xl group-hover:scale-[1.03] transition-transform duration-500"
                                                onError={(e) => {
                                                  // Hide image on error or show custom fallback nicely
                                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                                }}
                                              />
                                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                              
                                              <a 
                                                href={parsed.imageUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="absolute bottom-3 right-3 bg-black/80 hover:bg-blue-600 text-[10px] font-mono font-bold text-white px-2.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                <span>Open Photo</span>
                                              </a>
                                            </div>
                                          </div>

                                          {/* Side Text */}
                                          <div className="flex-1 space-y-3.5 self-center w-full">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-mono font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-xl h-fit shadow-sm">
                                                STEP {String(stepIdx + 1).padStart(2, '0')}
                                              </span>
                                            </div>
                                            <p className="text-sm sm:text-base text-gray-200 font-medium leading-relaxed font-sans">
                                              {parsed.sideText}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Bottom Text underneath the photo/text layout if text was long */}
                                        {parsed.bottomText && (
                                          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans border-t border-white/5 pt-4 mt-4">
                                            {parsed.bottomText}
                                          </p>
                                        )}
                                      </motion.div>
                                    );
                                  } else {
                                    // Text-only layout
                                    return (
                                      <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: stepIdx * 0.05 }}
                                        key={stepIdx}
                                        className="flex gap-5 p-5 rounded-3xl bg-zinc-950/40 border border-white/5 hover:border-blue-500/20 hover:bg-zinc-950/80 transition-all duration-300 shadow-lg"
                                      >
                                        <div className="text-xs font-mono font-black text-blue-400 shrink-0 bg-blue-500/10 px-3 py-1.5 rounded-xl h-fit border border-blue-500/20 select-none shadow-sm">
                                          {String(stepIdx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-sans font-medium">{parsed.text}</p>
                                        </div>
                                      </motion.div>
                                    );
                                  }
                                })
                              ) : (
                                <div className="text-center py-12 text-gray-500 font-mono text-xs">
                                  No walkthrough steps defined for this subcategory yet.
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* 2. ANDROID APK TAB */}
                {activeGuideTab === 'android' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-3xl mx-auto space-y-6"
                  >
                    <div className="bg-zinc-950/60 border border-emerald-500/10 rounded-2xl p-5 relative overflow-hidden select-none">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                      <div className="flex items-center gap-3 mb-4">
                        <AndroidLogo iconOnly={true} />
                        <h4 className="text-base font-extrabold text-white">Android Walkthrough</h4>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Setting up Life OS on your mobile device is straightforward. Follow the walkthrough steps below to download and launch the app securely on any compatible Android smartphone or tablet.
                      </p>
                    </div>

                    <div className="space-y-4 font-sans">
                      {[
                        {
                          num: "01",
                          title: "Fetch the .APK Package",
                          desc: "Tap the green Android card's Download button on the Portal home screen. This safely downloads the latest release binary file of Life OS directly from our certified storage bucket."
                        },
                        {
                          num: "02",
                          title: "Authorize Installation",
                          desc: "Android security blocks sideloads by default. Go to your system Settings > Apps & Notifications > Special app access > Install unknown apps (or toggle 'Allow from this source' for your browser or File Explorer)."
                        },
                        {
                          num: "03",
                          title: "Launch & Install",
                          desc: "Open your device's downloads folder or File Manager, locate the downloaded .apk file (usually named app-release.apk), and select it. Tap Install when prompted."
                        },
                        {
                          num: "04",
                          title: "Google Authorized Access",
                          desc: "Open Life OS from your launcher drawer. When prompted, complete your authorized login with your whitelisted Google Account to begin syncing."
                        }
                      ].map((step, sIdx) => (
                        <div key={sIdx} className="flex gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-white/5 hover:border-emerald-500/20 hover:bg-zinc-950/80 transition-all duration-300">
                          <div className="text-sm font-mono font-black text-emerald-400 shrink-0 bg-emerald-500/10 px-2.5 py-1 rounded-xl h-fit border border-emerald-500/20 select-none">
                            {step.num}
                          </div>
                          <div>
                            <h5 className="text-sm font-extrabold text-white mb-1">{step.title}</h5>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 3. WINDOWS SETUP TAB */}
                {activeGuideTab === 'windows' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-3xl mx-auto space-y-6"
                  >
                    <div className="bg-zinc-950/60 border border-blue-500/10 rounded-2xl p-5 relative overflow-hidden select-none">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                      <div className="flex items-center gap-3 mb-4">
                        <WindowsLogo iconOnly={true} />
                        <h4 className="text-base font-extrabold text-white">Windows Emulator Setup</h4>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Experience desktop productivity with high performance. Follow the guide to install our optimized Android APK inside the lightweight LD Player emulator on any Windows PC.
                      </p>
                    </div>

                    <div className="space-y-4 font-sans">
                      {[
                        {
                          num: "01",
                          title: "Initiate Unified Download",
                          desc: "Click Download on the Windows card. The portal triggers an automatic download of both the app's current .apk and the optimized LD Player offline setup loader in parallel."
                        },
                        {
                          num: "02",
                          title: "Install the Emulator",
                          desc: "Open the downloaded LDPlayer9.exe installer on your computer. Follow the steps to install it on your primary drive for smooth performance."
                        },
                        {
                          num: "03",
                          title: "Load the APK File",
                          desc: "Launch LD Player. Drag the downloaded app-release.apk file and drop it directly onto the emulator screen. The emulator instantly installs the app and places its icon on the launcher desktop."
                        },
                        {
                          num: "04",
                          title: "Log in & Configure Keyboard",
                          desc: "Click on Life OS in the emulator. Log in with your authorized Google Account. Use keyboard mapping shortcuts in LD Player to toggle calendar or habit inputs at lightning speeds."
                        }
                      ].map((step, sIdx) => (
                        <div key={sIdx} className="flex gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-white/5 hover:border-blue-500/20 hover:bg-zinc-950/80 transition-all duration-300">
                          <div className="text-sm font-mono font-black text-blue-400 shrink-0 bg-blue-500/10 px-2.5 py-1 rounded-xl h-fit border border-blue-500/20 select-none">
                            {step.num}
                          </div>
                          <div>
                            <h5 className="text-sm font-extrabold text-white mb-1">{step.title}</h5>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
