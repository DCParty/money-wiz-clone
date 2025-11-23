import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Plus, 
  CreditCard, 
  ArrowRightLeft, 
  LayoutDashboard, 
  List, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  DollarSign,
  Menu,
  X,
  Calendar,
  Search,
  Filter,
  Tag,
  Check,
  Download,
  FileText,
  CalendarRange,
  Upload,
  FileSpreadsheet,
  File,
  Globe,
  RefreshCw,
  ArrowRight,
  Table,
  Trash2,
  AlertTriangle,
  Pencil,
  MoreVertical,
  Star,
  Bookmark,
  Info,
  Cloud,
  CloudLightning,
  Loader2,
  LogIn,
  LogOut,
  Database,
  Coins
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// --- Mock Data & Constants ---

const INITIAL_ACCOUNTS = [];
const INITIAL_TRANSACTIONS = [];
const INITIAL_TEMPLATES = [];

// Supported Currencies Configuration
const SUPPORTED_CURRENCIES = [
  { code: 'TWD', symbol: 'NT$', name: '新台幣' },
  { code: 'USD', symbol: '$', name: '美金' },
  { code: 'NZD', symbol: 'NZ$', name: '紐西蘭幣' },
  { code: 'JPY', symbol: '¥', name: '日圓' },
  { code: 'EUR', symbol: '€', name: '歐元' },
  { code: 'GBP', symbol: '£', name: '英鎊' },
  { code: 'AUD', symbol: 'A$', name: '澳幣' },
  { code: 'CNY', symbol: '¥', name: '人民幣' },
  { code: 'HKD', symbol: 'HK$', name: '港幣' },
];

// Default Exchange Rates (Based on TWD)
const DEFAULT_RATES = {
  'TWD': 1,
  'USD': 32.5,
  'NZD': 19.8,
  'JPY': 0.21,
  'EUR': 35.2,
  'GBP': 41.5,
  'AUD': 21.5,
  'CNY': 4.5,
  'HKD': 4.15
};

const CATEGORIES = {
  expense: ['飲食', '交通', '購物', '居住', '娛樂', '醫療', '教育', '其他'],
  income: ['薪資', '獎金', '投資', '兼職', '其他'],
  transfer: ['轉帳']
};

const CATEGORY_COLORS = {
  '飲食': '#F87171', '交通': '#60A5FA', '購物': '#F472B6', 
  '居住': '#34D399', '娛樂': '#A78BFA', '醫療': '#EF4444',
  '教育': '#FBBF24', '其他': '#9CA3AF',
  '薪資': '#10B981', '獎金': '#3B82F6', '投資': '#8B5CF6',
  '轉帳': '#64748B'
};

const ACCOUNT_TYPES = [
  { id: 'cash', label: '現金', icon: Wallet },
  { id: 'bank', label: '銀行', icon: CreditCard },
  { id: 'credit', label: '信用卡', icon: CreditCard },
  { id: 'investment', label: '投資', icon: TrendingUp },
];

const ACCOUNT_COLORS = [
  'bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
  'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 
  'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
  'bg-pink-500', 'bg-rose-500'
];

// --- Utility Components ---

const Card = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className} ${onClick ? 'cursor-pointer' : ''}`}
  >
    {children}
  </div>
);

// Donut Chart
const DonutChart = ({ data, formatValue }) => {
  let cumulativePercent = 0;
  const total = data.reduce((acc, item) => acc + item.value, 0);
  
  if (total === 0) return <div className="text-center text-slate-400 py-8">無資料</div>;

  const slices = data.map((slice, i) => {
    const percent = slice.value / total;
    const startX = Math.cos(2 * Math.PI * cumulativePercent);
    const startY = Math.sin(2 * Math.PI * cumulativePercent);
    cumulativePercent += percent;
    const endX = Math.cos(2 * Math.PI * cumulativePercent);
    const endY = Math.sin(2 * Math.PI * cumulativePercent);
    
    if (percent === 1) return <circle key={i} cx="0" cy="0" r="1" fill={slice.color} />;

    const largeArcFlag = percent > 0.5 ? 1 : 0;
    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(' ');

    return <path key={i} d={pathData} fill={slice.color} />;
  });

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">{slices}</svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
          <span className="text-xs text-slate-400">總支出</span>
          <span className="text-lg font-bold text-slate-700">{formatValue(total)}</span>
        </div>
      </div>
    </div>
  );
};

// --- Main Application Component ---

export default function MoneyWizApp() {
  const [view, setView] = useState('dashboard');
  
  // --- Data State ---
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [templates, setTemplates] = useState([]);

  // --- UI State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  
  // --- Settings State ---
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('wizmoney_currency') || 'TWD');
  const [rates, setRates] = useState(() => {
    const savedRates = localStorage.getItem('wizmoney_rates');
    return savedRates ? JSON.parse(savedRates) : DEFAULT_RATES;
  });
  
  const [dashboardRange, setDashboardRange] = useState('month');
  const [customDateRange, setCustomDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });

  // --- Filter & Search State ---
  const [filterType, setFilterType] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // New Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false); // New Search UI State

  // --- Import State ---
  const [importStatus, setImportStatus] = useState(null); 
  const [importStep, setImportStep] = useState('idle'); 
  const [csvRawData, setCsvRawData] = useState({ headers: [], rows: [] });
  const [columnMapping, setColumnMapping] = useState({});

  // --- Firebase State ---
  const [firebaseConfigStr, setFirebaseConfigStr] = useState(() => localStorage.getItem('wizmoney_firebase_config') || '');
  const [configError, setConfigError] = useState(''); // Error state for parsing
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // --- Initialization ---

  // 1. Initialize Firebase if config exists
  useEffect(() => {
    if (firebaseConfigStr && firebaseConfigStr.trim().length > 0) {
      try {
        let cleanConfig = firebaseConfigStr.trim();
        if (cleanConfig.includes('=')) {
            cleanConfig = cleanConfig.substring(cleanConfig.indexOf('=') + 1).trim();
        }
        if (cleanConfig.endsWith(';')) {
            cleanConfig = cleanConfig.slice(0, -1);
        }
        const config = (new Function("return " + cleanConfig))();
        const app = initializeApp(config);
        setAuth(getAuth(app));
        setDb(getFirestore(app));
        setIsFirebaseReady(true);
        setConfigError(''); 
      } catch (e) {
        console.error("Firebase Init Error:", e);
        setConfigError('設定格式錯誤，請確保複製完整的 const firebaseConfig = { ... }; 內容');
        setIsFirebaseReady(false);
        loadFromLocalStorage();
      }
    } else {
        setIsFirebaseReady(false);
        setConfigError('');
        loadFromLocalStorage();
    }
  }, [firebaseConfigStr]);

  // 2. Listen for Auth State Changes
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        loadFromLocalStorage(); 
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // 3. Real-time Database Sync (Firestore)
  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.transactions) setTransactions(data.transactions);
            if (data.accounts) setAccounts(data.accounts);
            if (data.templates) setTemplates(data.templates);
            if (data.rates) setRates(data.rates); 
        }
    }, (error) => console.error("Sync Error:", error));
    return () => unsubscribe();
  }, [user, db]);

  const loadFromLocalStorage = () => {
    const txs = localStorage.getItem('wizmoney_transactions');
    const accs = localStorage.getItem('wizmoney_accounts');
    const tpls = localStorage.getItem('wizmoney_templates');
    setTransactions(txs ? JSON.parse(txs) : INITIAL_TRANSACTIONS);
    setAccounts(accs ? JSON.parse(accs) : INITIAL_ACCOUNTS);
    setTemplates(tpls ? JSON.parse(tpls) : INITIAL_TEMPLATES);
  };

  const saveData = (newTxs, newAccs, newTpls, newRates) => {
      const currentTxs = newTxs || transactions;
      const currentAccs = newAccs || accounts;
      const currentTpls = newTpls || templates;
      const currentRates = newRates || rates;

      if (newTxs) setTransactions(newTxs);
      if (newAccs) setAccounts(newAccs);
      if (newTpls) setTemplates(newTpls);
      if (newRates) setRates(newRates);

      localStorage.setItem('wizmoney_transactions', JSON.stringify(currentTxs));
      localStorage.setItem('wizmoney_accounts', JSON.stringify(currentAccs));
      localStorage.setItem('wizmoney_templates', JSON.stringify(currentTpls));
      localStorage.setItem('wizmoney_rates', JSON.stringify(currentRates));

      if (user && db) {
          const docRef = doc(db, "users", user.uid);
          setDoc(docRef, {
              transactions: currentTxs,
              accounts: currentAccs,
              templates: currentTpls,
              rates: currentRates,
              lastUpdated: new Date().toISOString()
          }, { merge: true }).catch(e => console.error("Cloud Save Error:", e));
      }
  };

  useEffect(() => {
    localStorage.setItem('wizmoney_currency', displayCurrency);
    localStorage.setItem('wizmoney_firebase_config', firebaseConfigStr);
  }, [displayCurrency, firebaseConfigStr]);


  // --- Helper Functions ---

  const formatCurrency = useCallback((amount, currencyCode = displayCurrency) => {
    return new Intl.NumberFormat('zh-TW', { 
      style: 'currency', 
      currency: currencyCode,
      minimumFractionDigits: (currencyCode === 'TWD' || currencyCode === 'JPY') ? 0 : 2
    }).format(amount);
  }, [displayCurrency]);

  const convertAmount = useCallback((amount, fromCurrency) => {
    if (fromCurrency === displayCurrency) return amount;
    const rateToTWD = rates[fromCurrency] || 1;
    const amountInTWD = amount * rateToTWD;
    const rateFromTWD = rates[displayCurrency] || 1;
    return amountInTWD / rateFromTWD;
  }, [displayCurrency, rates]);

  const totalNetWorth = useMemo(() => {
    return accounts.reduce((acc, curr) => {
      const accCurrency = curr.currency || 'TWD'; 
      const val = convertAmount(curr.balance, accCurrency);
      return acc + val;
    }, 0);
  }, [accounts, convertAmount]);
  
  const isTxInDashboardRange = (tx) => {
    const txDateStr = tx.date;
    const txDate = new Date(txDateStr);
    const now = new Date();
    const currentYear = now.getFullYear();

    if (dashboardRange === 'all') return true;
    if (dashboardRange === 'month') return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === currentYear;
    if (dashboardRange === 'quarter') return Math.floor(now.getMonth() / 3) === Math.floor(txDate.getMonth() / 3) && txDate.getFullYear() === currentYear;
    if (dashboardRange === 'year') return txDate.getFullYear() === currentYear;
    if (dashboardRange === 'custom') return txDateStr >= customDateRange.start && txDateStr <= customDateRange.end;
    return true;
  };

  const dashboardStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (isTxInDashboardRange(t)) {
        const acc = accounts.find(a => a.id === t.accountId);
        const txCurrency = acc ? (acc.currency || 'TWD') : 'TWD';
        const convertedAmount = convertAmount(t.amount, txCurrency);

        if (t.type === 'income') income += convertedAmount;
        if (t.type === 'expense') expense += convertedAmount;
      }
    });
    return { income, expense };
  }, [transactions, dashboardRange, customDateRange, accounts, convertAmount]);

  const categoryData = useMemo(() => {
    const data = {};
    transactions.filter(t => t.type === 'expense' && isTxInDashboardRange(t)).forEach(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      const txCurrency = acc ? (acc.currency || 'TWD') : 'TWD';
      const convertedAmount = convertAmount(t.amount, txCurrency);

      const cat = t.category || '其他';
      if (!data[cat]) data[cat] = 0;
      data[cat] += convertedAmount;
    });
    return Object.keys(data).map(cat => ({
      label: cat,
      value: data[cat],
      color: CATEGORY_COLORS[cat] || '#ccc'
    })).sort((a, b) => b.value - a.value);
  }, [transactions, dashboardRange, customDateRange, accounts, convertAmount]);

  const allTags = useMemo(() => {
    const tags = new Set();
    transactions.forEach(tx => {
      if (tx.tags && Array.isArray(tx.tags)) tx.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [transactions]);

  const getFilteredTransactions = (accId = null) => {
    return transactions.filter(tx => {
      // Filter Logic
      const typeMatch = filterType === 'all' || tx.type === filterType;
      const tagMatch = !selectedTag || (tx.tags && tx.tags.includes(selectedTag));
      let accountMatch = true;
      if (accId) accountMatch = tx.accountId === accId || tx.fromAccountId === accId || tx.toAccountId === accId;
      
      // Search Logic
      const query = searchQuery.toLowerCase();
      const noteMatch = (tx.note || '').toLowerCase().includes(query);
      const categoryMatch = (tx.category || '').toLowerCase().includes(query);
      const amountMatch = tx.amount.toString().includes(query);
      const searchMatch = !searchQuery || noteMatch || categoryMatch || amountMatch;

      return typeMatch && tagMatch && accountMatch && searchMatch;
    });
  };

  // --- Handlers ---

  const handleAuthLogin = async () => {
      if (!auth) return alert("請先在下方貼上 Firebase Config 並確認已連線");
      const provider = new GoogleAuthProvider();
      try {
          await signInWithPopup(auth, provider);
      } catch (error) {
          alert("登入失敗: " + error.message);
      }
  };

  const handleAuthLogout = () => { if(auth) signOut(auth); };

  const applyTransactionToBalances = (currentAccounts, tx, multiplier = 1) => {
    return currentAccounts.map(acc => {
      let newBalance = acc.balance;
      if (tx.type === 'expense' && acc.id === parseInt(tx.accountId)) {
        newBalance -= Number(tx.amount) * multiplier;
      } else if (tx.type === 'income' && acc.id === parseInt(tx.accountId)) {
        newBalance += Number(tx.amount) * multiplier;
      } else if (tx.type === 'transfer') {
        if (acc.id === parseInt(tx.fromAccountId)) newBalance -= Number(tx.amount) * multiplier;
        if (acc.id === parseInt(tx.toAccountId)) {
            newBalance += Number(tx.amount) * multiplier;
        }
      }
      return { ...acc, balance: newBalance };
    });
  };

  const handleAddTransaction = (newTx, saveAsTemplate = false, templateName = '') => {
    const txWithId = { ...newTx, id: Date.now() };
    const newTxs = [txWithId, ...transactions];
    const newAccs = applyTransactionToBalances(accounts, newTx, 1);
    let newTpls = templates;
    
    if (saveAsTemplate) {
      newTpls = [...templates, {
        id: Date.now().toString(),
        name: templateName || newTx.note || '未命名樣板',
        ...newTx
      }];
    }
    saveData(newTxs, newAccs, newTpls, null);
    setShowAddModal(false);
  };

  const handleUpdateTransaction = (updatedTx) => {
    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) return;
    let tempAccounts = applyTransactionToBalances(accounts, oldTx, -1);
    tempAccounts = applyTransactionToBalances(tempAccounts, updatedTx, 1);
    const newTxs = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    saveData(newTxs, tempAccounts, null, null);
    setShowAddModal(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (txId) => {
    if (!confirm('確定要刪除這筆交易嗎？帳戶餘額將會自動還原。')) return;
    const txToDelete = transactions.find(t => t.id === txId);
    if (!txToDelete) return;
    const newAccs = applyTransactionToBalances(accounts, txToDelete, -1);
    const newTxs = transactions.filter(t => t.id !== txId);
    saveData(newTxs, newAccs, null, null);
  };

  const handleSaveAccount = (accountData) => {
    let newAccs;
    if (editingAccount) {
      newAccs = accounts.map(acc => 
        acc.id === editingAccount.id ? { ...acc, ...accountData, id: editingAccount.id } : acc
      );
    } else {
      newAccs = [{ ...accountData, id: Date.now(), balance: parseFloat(accountData.balance) }, ...accounts];
    }
    saveData(null, newAccs, null, null);
    setShowAccountModal(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (accountId) => {
    if (!confirm('確定要刪除此帳戶嗎？相關的交易紀錄將會保留，但會顯示為「未知帳戶」。')) return;
    const newAccs = accounts.filter(acc => acc.id !== accountId);
    saveData(null, newAccs, null, null);
    if (selectedAccount?.id === accountId) setSelectedAccount(null);
  };

  const handleDeleteTemplate = (templateId) => {
    if (!confirm('確定要刪除此樣板嗎？')) return;
    const newTpls = templates.filter(t => t.id !== templateId);
    saveData(null, null, newTpls, null);
  };

  const handleResetData = () => {
    if (confirm('確定要重置所有資料嗎？如果在登入狀態下，雲端資料也會被清空。')) {
        saveData([], [], [], DEFAULT_RATES);
        localStorage.removeItem('wizmoney_currency');
        setDisplayCurrency('TWD');
        alert('資料已重置');
    }
  };

  const openEditModal = (tx) => { setEditingTransaction(tx); setShowAddModal(true); };
  const closeAddModal = () => { setShowAddModal(false); setEditingTransaction(null); };

  // --- UI Components ---

  const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1
        ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const DashboardView = () => {
    const getRangeLabel = () => {
      switch(dashboardRange) {
        case 'all': return '全部';
        case 'month': return '本月';
        case 'quarter': return '本季';
        case 'year': return '本年';
        case 'custom': return '自訂期間';
        default: return '期間';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            財務儀表板 
            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {dashboardRange === 'custom' ? `${customDateRange.start} ~ ${customDateRange.end}` : getRangeLabel()}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
              <CalendarRange size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select value={dashboardRange} onChange={(e) => setDashboardRange(e.target.value)} className="pl-9 pr-8 py-1.5 bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer appearance-none hover:text-blue-600 transition-colors">
                <option value="month">本月</option>
                <option value="quarter">本季</option>
                <option value="year">本年</option>
                <option value="all">全部</option>
                <option value="custom">自訂範圍</option>
              </select>
              <ChevronRight size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
            </div>
            {dashboardRange === 'custom' && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-200 animate-in fade-in zoom-in duration-200">
                <input type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})} className="w-32 py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <span className="text-slate-400">-</span>
                <input type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})} className="w-32 py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-slate-50">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">淨資產總額 ({displayCurrency})</p>
              <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(totalNetWorth)}</h2>
              <p className="text-xs text-slate-400 mt-1">所有帳戶折合</p>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-emerald-500">
             <div>
              <p className="text-slate-500 text-sm font-medium mb-1">{getRangeLabel()}收入 ({displayCurrency})</p>
              <h2 className="text-2xl font-bold text-emerald-600">+{formatCurrency(dashboardStats.income)}</h2>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-rose-500">
             <div>
              <p className="text-slate-500 text-sm font-medium mb-1">{getRangeLabel()}支出 ({displayCurrency})</p>
              <h2 className="text-2xl font-bold text-rose-600">-{formatCurrency(dashboardStats.expense)}</h2>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><PieChart size={18} className="mr-2 text-slate-500" /> 支出分佈</h3>
            <DonutChart data={categoryData} formatValue={formatCurrency} />
            <div className="mt-6 space-y-3">
              {categoryData.length > 0 ? categoryData.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: cat.color }}></span><span className="text-slate-600">{cat.label}</span></div>
                  <span className="font-medium text-slate-800">{formatCurrency(cat.value)}</span>
                </div>
              )) : <div className="text-center text-slate-400 text-sm">該期間無支出數據</div>}
            </div>
          </Card>

          <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">近期交易</h3>
              <button onClick={() => setView('transactions')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">查看全部 <ChevronRight size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {transactions.length === 0 ? <div className="p-8 text-center text-slate-500">暫無交易記錄</div> : transactions.slice(0, 6).map(tx => <TransactionItem key={tx.id} tx={tx} />)}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const AccountsView = () => {
    if (selectedAccount) {
      const accountTxs = getFilteredTransactions(selectedAccount.id);
      return (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setSelectedAccount(null)} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-bold"><ChevronLeft size={20} className="mr-1" /> 返回列表</button>
            <div className="flex space-x-2">
              <button onClick={() => { setEditingAccount(selectedAccount); setShowAccountModal(true); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Pencil size={20} /></button>
              <button onClick={() => handleDeleteAccount(selectedAccount.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={20} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
             <div className={`p-6 rounded-2xl text-white shadow-lg ${selectedAccount.color} flex flex-col justify-between relative overflow-hidden col-span-1`}>
                <div className="relative z-10">
                  <p className="text-white/80 font-medium mb-1">{ACCOUNT_TYPES.find(t => t.id === selectedAccount.type)?.label} ({selectedAccount.currency || 'TWD'})</p>
                  <h2 className="text-3xl font-bold mb-2">{selectedAccount.name}</h2>
                  <p className="text-4xl font-mono font-bold tracking-tight opacity-100">
                      {formatCurrency(selectedAccount.balance, selectedAccount.currency || 'TWD')}
                  </p>
                </div>
                <div className="absolute -right-4 -bottom-4 text-white/20"><Wallet size={120} /></div>
             </div>
             <Card className="col-span-2 flex flex-col p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">交易紀錄</h3></div>
                <div className="flex-1 overflow-y-auto">
                   {accountTxs.length > 0 ? accountTxs.map(tx => <TransactionItem key={tx.id} tx={tx} />) : <div className="p-12 text-center text-slate-400">此帳戶尚無交易</div>}
                </div>
             </Card>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-slate-800">帳戶列表</h2>
          <button onClick={() => { setEditingAccount(null); setShowAccountModal(true); }} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"><Plus size={18} className="mr-1" /> 新增帳戶</button>
        </div>
        {accounts.length === 0 ? <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400"><Wallet size={48} className="mx-auto mb-4 opacity-50" /><p className="text-lg font-bold text-slate-600">尚無帳戶</p><button onClick={() => { setEditingAccount(null); setShowAccountModal(true); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg mt-4">建立帳戶</button></div> : 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{accounts.map(acc => (
                <Card key={acc.id} onClick={() => setSelectedAccount(acc)} className="p-5 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${acc.color}`}></div>
                <div className="flex items-center justify-between mb-4 pl-2">
                    <div className={`w-10 h-10 rounded-lg ${acc.color} bg-opacity-10 flex items-center justify-center text-${acc.color.replace('bg-', '')}`}>
                    {(() => { const TypeIcon = ACCOUNT_TYPES.find(t => t.id === acc.type)?.icon || CreditCard; return <TypeIcon size={20} className="text-slate-600" />; })()}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"><ChevronRight size={20} /></div>
                </div>
                <div className="pl-2">
                    <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">{ACCOUNT_TYPES.find(t => t.id === acc.type)?.label} • {acc.currency || 'TWD'}</p>
                    <h3 className="text-lg font-bold text-slate-800 mt-0.5 mb-1">{acc.name}</h3>
                    <p className={`text-xl font-mono font-semibold ${acc.balance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {formatCurrency(acc.balance, acc.currency || 'TWD')}
                    </p>
                </div>
                </Card>
            ))}</div>
        }
      </div>
    );
  };

  const TransactionItem = ({ tx }) => {
    const colorClass = tx.type === 'income' ? 'text-emerald-600' : tx.type === 'transfer' ? 'text-slate-600' : 'text-rose-600';
    const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
    const categoryName = tx.category || '其他';
    const acc = accounts.find(a => a.id === tx.accountId);
    const txCurrency = acc ? (acc.currency || 'TWD') : 'TWD';
    
    return (
      <div className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0 ${CATEGORY_COLORS[categoryName] ? '' : 'bg-slate-400'}`} style={{ backgroundColor: CATEGORY_COLORS[categoryName] || '#94a3b8' }}>{categoryName.substring(0, 1)}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-slate-800 text-sm">{tx.note || categoryName}</p>{tx.tags && tx.tags.map((tag, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">{tag}</span>)}</div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">{tx.date} | {tx.time} • {acc?.name || '轉帳'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <span className={`font-bold font-mono ${colorClass}`}>{sign}{formatCurrency(tx.amount, txCurrency)}</span>
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEditModal(tx); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Pencil size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteTransaction(tx.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
            </div>
        </div>
      </div>
    );
  };

  const TransactionsView = () => (
    <div className="h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6 z-10 relative">
        <h2 className="text-2xl font-bold text-slate-800">交易明細</h2>
        <div className="flex space-x-2">
           <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-2 rounded-lg transition-colors border flex items-center gap-2 text-sm font-medium ${isSearchOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Search size={18} /></button>
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`p-2 rounded-lg transition-colors border flex items-center gap-2 text-sm font-medium ${isFilterOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Filter size={18} /><span className="hidden sm:inline">過濾器</span>{(filterType !== 'all' || selectedTag) && <span className="w-2 h-2 rounded-full bg-red-500"></span>}</button>
        </div>
      </div>
      
      {/* Search Bar */}
      {isSearchOpen && (
        <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
             <div className="relative">
                 <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                 <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋備註、分類或金額..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                 />
                 {searchQuery && (
                     <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                         <X size={14} />
                     </button>
                 )}
             </div>
        </div>
      )}

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="space-y-2 min-w-[120px]">
              <h4 className="text-xs font-bold text-slate-400 uppercase">交易類型</h4>
              <div className="flex flex-wrap gap-2">{['all', 'expense', 'income', 'transfer'].map(t => <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t === 'all' ? '全部' : t === 'expense' ? '支出' : t === 'income' ? '收入' : '轉帳'}</button>)}</div>
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase">標籤篩選</h4>
              <div className="flex flex-wrap gap-2"><button onClick={() => setSelectedTag(null)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${!selectedTag ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>不限</button>{allTags.map(tag => <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? null : tag)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1 ${selectedTag === tag ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}><Tag size={12} />{tag}</button>)}</div>
            </div>
            <div className="flex items-end"><button onClick={() => { setFilterType('all'); setSelectedTag(null); }} className="text-sm text-slate-400 hover:text-slate-600 underline decoration-dotted">清除條件</button></div>
          </div>
        </div>
      )}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-0">
          {getFilteredTransactions(null).length === 0 ? <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400"><Search size={48} className="mb-4 opacity-20" /><p>沒有符合條件的交易</p></div> : getFilteredTransactions(null).map(tx => <TransactionItem key={tx.id} tx={tx} />)}
        </div>
      </Card>
    </div>
  );

  const SettingsView = () => {
    const fileInputRef = useRef(null);
    const handleExportCSV = () => {
      const headers = ['ID', '日期', '時間', '類型', '金額', '幣別', '類別', '帳戶', '備註', '標籤'];
      let totalIncome = 0;
      let totalExpense = 0;
      const rows = transactions.map(tx => {
        const acc = accounts.find(a => a.id === parseInt(tx.accountId));
        const txCur = acc ? (acc.currency || 'TWD') : 'TWD';
        const displayAmount = convertAmount(tx.amount, txCur); 
        if (tx.type === 'income') totalIncome += displayAmount;
        if (tx.type === 'expense') totalExpense += displayAmount;
        
        const accountName = acc?.name || (tx.type === 'transfer' ? `轉出: ${accounts.find(a => a.id === parseInt(tx.fromAccountId))?.name} -> 轉入: ${accounts.find(a => a.id === parseInt(tx.toAccountId))?.name}` : '未知');
        const tags = tx.tags ? tx.tags.join(';') : '';
        return [tx.id, tx.date, tx.time || '', tx.type === 'expense' ? '支出' : tx.type === 'income' ? '收入' : '轉帳', tx.amount, txCur, tx.category, accountName, `"${(tx.note || '').replace(/"/g, '""')}"`, tags].join(',');
      });
      const netTotal = totalIncome - totalExpense;
      const summary = ['', `,,,總收入(折合${displayCurrency}),${totalIncome.toFixed(2)},,,,,`, `,,,總支出(折合${displayCurrency}),${totalExpense.toFixed(2)},,,,,`, `,,,淨結餘(折合${displayCurrency}),${netTotal.toFixed(2)},,,,,`].join('\n');
      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n') + summary;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wizmoney_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    const handleImportCSV = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) text = text.substr(1);

                const lines = text.split('\n').filter(l => l.trim().length > 0);
                if (lines.length < 2) throw new Error("檔案內容為空或格式錯誤");

                const splitCSV = (str) => {
                  const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
                  let matches = [];
                  let match;
                  while ((match = regex.exec(str)) !== null) {
                    matches.push(match[1] !== undefined ? match[1] : match[2]);
                  }
                  return matches;
                };

                const headers = splitCSV(lines[0]);
                const initialMapping = {};
                const lowerHeaders = headers.map(h => h.toLowerCase());
                const findHeader = (keywords) => lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));

                initialMapping['date'] = findHeader(['date', '日期']);
                initialMapping['time'] = findHeader(['time', '時間']);
                initialMapping['type'] = findHeader(['type', '類型', '收支']);
                initialMapping['amount'] = findHeader(['amount', '金額', 'price', 'cost']);
                initialMapping['category'] = findHeader(['category', '類別', '分類']);
                initialMapping['account'] = findHeader(['account', '帳戶', 'bank', 'wallet']);
                initialMapping['note'] = findHeader(['note', '備註', '說明', 'description', 'desc']);
                initialMapping['tags'] = findHeader(['tag', '標籤']);

                setCsvRawData({ headers, rows: lines.slice(1) });
                setColumnMapping(initialMapping);
                setImportStep('column_mapping'); 
                setImportStatus(null);

            } catch (err) {
                console.error(err);
                setImportStatus({ type: 'error', message: '匯入失敗: ' + err.message });
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">設定</h2>
        
        {/* Firebase Config Section */}
        <Card className="p-6 border-orange-100">
            <h3 className="text-lg font-bold text-orange-700 mb-4 flex items-center">
                <Cloud size={20} className="mr-2" /> Firebase 雲端同步 (推薦)
            </h3>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-orange-700 uppercase">Firebase Config</label>
                        {isFirebaseReady ? 
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center font-bold"><Check size={12} className="mr-1"/> 已連線</span> : 
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">未連線</span>
                        }
                    </div>
                    <textarea 
                        rows="4"
                        value={firebaseConfigStr}
                        onChange={(e) => setFirebaseConfigStr(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-slate-600 text-xs font-mono focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                        placeholder={`貼上 Firebase SDK 設定，例如:\nconst firebaseConfig = {\n  apiKey: "...",\n  ...\n};`}
                    />
                    <p className="text-xs text-orange-600/70 mt-2 flex items-center gap-1">
                        <Info size={12} /> 請至 Firebase Console → Project Settings → General → 複製 SDK config
                    </p>
                    {configError && <p className="text-xs text-red-500 font-bold">{configError}</p>}
                </div>
                
                {isFirebaseReady && (
                    <div className="flex items-center justify-between pt-2 border-t border-orange-200">
                        <div className="flex items-center gap-3">
                            {user ? (
                                <>
                                    <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-orange-300" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{user.displayName}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                </>
                            ) : (
                                <span className="text-sm text-slate-500">尚未登入</span>
                            )}
                        </div>
                        {user ? (
                            <button onClick={handleAuthLogout} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 text-slate-700 flex items-center">
                                <LogOut size={16} className="mr-2" /> 登出
                            </button>
                        ) : (
                            <button onClick={handleAuthLogin} className="px-4 py-2 bg-orange-600 rounded-lg text-sm font-bold hover:bg-orange-700 text-white flex items-center shadow-sm">
                                <LogIn size={16} className="mr-2" /> 使用 Google 登入
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Card>

        {/* Template Management - CONFIRMED VISIBLE */}
        <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <Bookmark size={20} className="mr-2 text-yellow-500" /> 常用樣板管理
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
               {templates.length === 0 ? (
                   <div className="text-center text-slate-400 text-sm py-4">目前沒有儲存的樣板</div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                       {templates.map(t => (
                           <div key={t.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                               <div>
                                   <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                                   <p className="text-xs text-slate-500 mt-0.5">{t.category} • {formatCurrency(t.amount, accounts.find(a => a.id === t.accountId)?.currency || 'TWD')}</p>
                               </div>
                               <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                           </div>
                       ))}
                   </div>
               )}
            </div>
        </Card>

        {/* Currency Rates Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Globe size={20} className="mr-2 text-blue-500" /> 總覽顯示貨幣與匯率</h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">主顯示貨幣 (用於儀表板總計)</label>
                        <select 
                            value={displayCurrency} 
                            onChange={(e) => setDisplayCurrency(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {SUPPORTED_CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase flex justify-between">
                            <span>匯率設定 (相對於 TWD)</span>
                            <button onClick={() => setRates(DEFAULT_RATES)} className="text-blue-600 flex items-center gap-1 hover:underline text-xs"><RefreshCw size={10} /> 重置預設</button>
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {SUPPORTED_CURRENCIES.filter(c => c.code !== 'TWD').map(c => (
                                <div key={c.code} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                                    <span className="text-sm font-mono text-slate-600">1 {c.code} ≈</span>
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="number" 
                                            value={rates[c.code]}
                                            onChange={(e) => setRates({...rates, [c.code]: parseFloat(e.target.value)})}
                                            className="w-16 text-right p-1 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                        <span className="text-xs text-slate-400">TWD</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
            <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Download size={20} className="mr-2 text-blue-500" /> 匯出資料</h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="font-bold text-slate-700 text-sm">CSV 報表格式</p>
                    <p className="text-xs text-slate-500 mt-1 mb-3">通用格式，可使用 Excel、Numbers 或 Google Sheets 開啟。</p>
                    <button onClick={handleExportCSV} className="w-full flex items-center justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"><Download size={16} className="mr-2" /> 下載 CSV 檔案</button>
                </div>
            
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="font-bold text-slate-700 text-sm">匯入 CSV 檔案</p>
                            <p className="text-xs text-slate-500 mt-0.5">支援自訂欄位對應</p>
                        </div>
                        <FileText size={18} className="text-slate-400" />
                    </div>
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <Upload size={16} className="mr-2" />
                        選擇 CSV 檔案
                    </button>
                </div>

                {importStatus && (
                    <div className={`mt-4 p-3 rounded-lg text-xs font-medium flex items-center
                        ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {importStatus.type === 'success' ? <Check size={14} className="mr-1.5" /> : <X size={14} className="mr-1.5" />}
                        {importStatus.message}
                    </div>
                )}
            </Card>
        </div>

        <Card className="p-6 border-red-100">
            <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center">
                <AlertTriangle size={20} className="mr-2" /> 危險區域
            </h3>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center justify-between">
                <div>
                    <p className="font-bold text-red-700 text-sm">重置所有資料</p>
                    <p className="text-xs text-red-500 mt-0.5">清除所有交易紀錄並恢復預設值</p>
                </div>
                <button onClick={handleResetData} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center"><Trash2 size={16} className="mr-2" /> 重置</button>
            </div>
        </Card>
      </div>
    );
  };

  const AccountModal = () => {
    const initialData = editingAccount || {
      name: '',
      type: 'cash',
      balance: '',
      color: ACCOUNT_COLORS[0],
      currency: 'TWD' // Default currency
    };

    const [name, setName] = useState(initialData.name);
    const [type, setType] = useState(initialData.type);
    const [balance, setBalance] = useState(initialData.balance);
    const [color, setColor] = useState(initialData.color);
    const [accCurrency, setAccCurrency] = useState(initialData.currency || 'TWD');

    const handleSubmit = () => {
      if (!name || balance === '') return;
      handleSaveAccount({ name, type, balance: Number(balance), color, currency: accCurrency });
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">{editingAccount ? '編輯帳戶' : '新增帳戶'}</h3>
            <button onClick={() => { setShowAccountModal(false); setEditingAccount(null); }} className="text-slate-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto">
            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">帳戶名稱</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如：薪資轉帳戶" autoFocus /></div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">帳戶類型</label>
              <div className="grid grid-cols-2 gap-2">{ACCOUNT_TYPES.map(t => <button key={t.id} onClick={() => setType(t.id)} className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all ${type === t.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><t.icon size={16} />{t.label}</button>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">幣別</label>
                    <select value={accCurrency} onChange={(e) => setAccCurrency(e.target.value)} className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{editingAccount ? '目前餘額' : '初始餘額'}</label>
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400 text-xs">{accCurrency}</span></div><input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="block w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" /></div>
                </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">代表顏色</label>
              <div className="flex flex-wrap gap-2">{ACCOUNT_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${c} ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`} />)}</div>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100"><button onClick={handleSubmit} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-transform active:scale-95">{editingAccount ? '儲存變更' : '建立帳戶'}</button></div>
        </div>
      </div>
    );
  };

  const AddTransactionModal = () => {
    const defaultAccountId = accounts.length > 0 ? accounts[0].id : '';
    const defaultToAccountId = accounts.length > 1 ? accounts[1].id : (accounts.length > 0 ? accounts[0].id : '');

    const initialData = editingTransaction || {
      type: 'expense',
      amount: '',
      category: CATEGORIES['expense'][0],
      accountId: defaultAccountId,
      toAccountId: defaultToAccountId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      note: '',
      tags: []
    };

    const [type, setType] = useState(initialData.type);
    const [amount, setAmount] = useState(initialData.amount);
    const [category, setCategory] = useState(initialData.category);
    const [accountId, setAccountId] = useState(initialData.accountId);
    const [toAccountId, setToAccountId] = useState(initialData.toAccountId || defaultToAccountId); 
    const [date, setDate] = useState(initialData.date);
    const [time, setTime] = useState(initialData.time || new Date().toTimeString().slice(0, 5));
    const [note, setNote] = useState(initialData.note);
    const [tagInput, setTagInput] = useState(initialData.tags ? initialData.tags.join(', ') : '');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // Get selected account currency symbol
    const currentAcc = accounts.find(a => a.id === parseInt(accountId));
    const currentCurrency = currentAcc ? (currentAcc.currency || 'TWD') : 'TWD';

    const fillFormFromTemplate = (tpl) => {
        setType(tpl.type); setAmount(tpl.amount); setCategory(tpl.category);
        if (accounts.some(a => a.id === tpl.accountId)) setAccountId(tpl.accountId);
        if (tpl.toAccountId && accounts.some(a => a.id === tpl.toAccountId)) setToAccountId(tpl.toAccountId);
        setNote(tpl.note || ''); setTagInput(tpl.tags ? tpl.tags.join(', ') : '');
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!amount || Number(amount) <= 0) return;
      if (!accountId) return;

      const tags = tagInput.split(/[,，]/).map(t => t.trim()).filter(t => t.length > 0);
      const transactionData = {
        id: editingTransaction ? editingTransaction.id : null,
        date, time, type, amount: Number(amount),
        category: type === 'transfer' ? '轉帳' : category,
        accountId: type === 'transfer' ? null : accountId,
        fromAccountId: type === 'transfer' ? accountId : null,
        toAccountId: type === 'transfer' ? toAccountId : null,
        note, tags
      };

      if (editingTransaction) handleUpdateTransaction(transactionData);
      else handleAddTransaction(transactionData, saveAsTemplate, templateName);
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">{editingTransaction ? '編輯交易' : '新增交易'}</h3>
            <button onClick={closeAddModal} className="text-slate-400 hover:text-white"><X size={24} /></button>
          </div>

          {accounts.length === 0 ? (
              <div className="p-8 text-center">
                  <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
                  <h4 className="font-bold text-slate-800 mb-2">尚未建立帳戶</h4>
                  <p className="text-sm text-slate-500 mb-6">請先建立至少一個帳戶才能開始記帳。</p>
                  <button onClick={() => { closeAddModal(); setShowAccountModal(true); setEditingAccount(null); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium">立即建立帳戶</button>
              </div>
          ) : (
            <>
                {!editingTransaction && templates.length > 0 && (
                    <div className="px-4 pt-3 pb-1 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-400 mb-2 flex items-center"><Star size={12} className="mr-1 text-yellow-500" /> 快速帶入樣板</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{templates.map(t => <button key={t.id} onClick={() => fillFormFromTemplate(t)} className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95">{t.name}</button>)}</div>
                    </div>
                )}
                <div className="flex bg-slate-100 p-1 m-4 rounded-lg">{['expense', 'income', 'transfer'].map(t => <button key={t} onClick={() => { setType(t); setCategory(CATEGORIES[t][0]); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${type === t ? (t === 'expense' ? 'bg-rose-500 text-white shadow' : t === 'income' ? 'bg-emerald-500 text-white shadow' : 'bg-blue-600 text-white shadow') : 'text-slate-500 hover:text-slate-700'}`}>{t === 'expense' ? '支出' : t === 'income' ? '收入' : '轉帳'}</button>)}</div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                    <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">金額 ({currentCurrency})</label>
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400 text-sm font-bold">{currentCurrency}</span></div><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="block w-full pl-12 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="0.00" autoFocus /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">日期</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">時間</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    </div>
                    {type !== 'transfer' && (<div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">類別</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">{CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}</select></div>)}
                    {type === 'transfer' ? (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">從帳戶</label><select value={accountId} onChange={e => setAccountId(e.target.value)} className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700">{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                        <div className="flex justify-center text-slate-400"><ArrowRightLeft size={16} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">到帳戶</label><select value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700">{accounts.filter(a => a.id != accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    </div>
                    ) : (<div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">帳戶</label><select value={accountId} onChange={e => setAccountId(e.target.value)} className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>)}
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">標籤 (用逗號分隔)</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Tag size={16} className="text-slate-400" /></div><input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 早餐, 出差, 報帳" /></div></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">備註 (選填)</label><textarea value={note} onChange={e => setNote(e.target.value)} className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows="2" /></div>
                    {!editingTransaction && (
                        <div className="pt-2 border-t border-slate-100">
                            <label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" /><span className="text-sm font-medium text-slate-700">加入常用樣板</span></label>
                            {saveAsTemplate && (<div className="animate-in slide-in-from-top-2 duration-200"><input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="輸入樣板名稱 (例如: 房租, Netflix)" className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" /></div>)}
                        </div>
                    )}
                </form>
                <div className="p-4 border-t border-slate-100"><button onClick={handleSubmit} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2 ${type === 'expense' ? 'bg-rose-500 hover:bg-rose-600' : type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}><span>{editingTransaction ? '儲存修改' : `確認${type === 'expense' ? '支出' : type === 'income' ? '收入' : '轉帳'}`}</span><ChevronRight size={18} /></button></div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed md:relative z-20 h-full bg-white border-r border-slate-200 w-64 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-2 font-bold text-xl text-blue-700 ${!isSidebarOpen && 'md:hidden lg:flex'}`}><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Wallet size={18} /></div><span className="md:hidden lg:block">WizMoney</span></div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24} /></button>
        </div>
        <nav className="px-3 space-y-1 mt-2">
          <SidebarItem icon={LayoutDashboard} label={<span className="md:hidden lg:inline">總覽</span>} active={view === 'dashboard'} onClick={() => { setView('dashboard'); setSelectedAccount(null); }} />
          <SidebarItem icon={CreditCard} label={<span className="md:hidden lg:inline">帳戶</span>} active={view === 'accounts'} onClick={() => { setView('accounts'); setSelectedAccount(null); }} />
          <SidebarItem icon={List} label={<span className="md:hidden lg:inline">交易</span>} active={view === 'transactions'} onClick={() => { setView('transactions'); setSelectedAccount(null); }} />
          <SidebarItem icon={Settings} label={<span className="md:hidden lg:inline">設定</span>} active={view === 'settings'} onClick={() => { setView('settings'); setSelectedAccount(null); }} />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600"><Menu size={24} /></button>
          <span className="font-bold text-slate-800">WizMoney</span>
          <div className="w-6"></div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto h-full">
            {view === 'dashboard' && <DashboardView />}
            {view === 'accounts' && <AccountsView />}
            {view === 'transactions' && <TransactionsView />}
            {view === 'settings' && <SettingsView />}
          </div>
        </main>
        <div className="absolute bottom-8 right-8">
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"><Plus size={28} /></button>
        </div>
      </div>

      {showAddModal && <AddTransactionModal />}
      {showAccountModal && <AccountModal />}
      {importStep === 'column_mapping' && <ColumnMappingModal />}
    </div>
  );
}