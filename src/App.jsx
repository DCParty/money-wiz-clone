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
  AlertTriangle
} from 'lucide-react';

// --- Mock Data & Constants ---

const INITIAL_ACCOUNTS = [
  { id: 1, name: '日常錢包', type: 'cash', balance: 2500, color: 'bg-emerald-500' },
  { id: 2, name: '中國信託', type: 'bank', balance: 158000, color: 'bg-blue-600' },
  { id: 3, name: '台新 @GoGo', type: 'credit', balance: -5600, color: 'bg-rose-500' },
  { id: 4, name: '股票投資', type: 'investment', balance: 320000, color: 'bg-purple-600' },
];

const INITIAL_TRANSACTIONS = [
  { id: 1, date: '2023-10-25', time: '08:30', type: 'expense', amount: 120, category: '飲食', accountId: 1, note: '早餐三明治', tags: ['早餐', '平日'] },
  { id: 2, date: '2023-10-25', time: '09:15', type: 'expense', amount: 1280, category: '交通', accountId: 3, note: '高鐵票', tags: ['出差', '報帳'] },
  { id: 3, date: '2023-10-24', time: '18:00', type: 'income', amount: 52000, category: '薪資', accountId: 2, note: '十月份薪水', tags: ['正職'] },
  { id: 4, date: '2023-10-23', time: '14:20', type: 'expense', amount: 3500, category: '購物', accountId: 3, note: '新衣服', tags: ['週年慶'] },
  { id: 5, date: '2023-10-22', time: '10:00', type: 'transfer', amount: 10000, fromAccountId: 2, toAccountId: 4, note: '定期定額', category: '轉帳', tags: ['投資'] },
];

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

// --- Utility Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

// Simple Donut Chart Component using SVG
const DonutChart = ({ data, formatValue }) => {
  let cumulativePercent = 0;
  
  // Calculate total for percentages
  const total = data.reduce((acc, item) => acc + item.value, 0);
  
  if (total === 0) return <div className="text-center text-slate-400 py-8">無資料</div>;

  const slices = data.map((slice, i) => {
    const percent = slice.value / total;
    const startX = Math.cos(2 * Math.PI * cumulativePercent);
    const startY = Math.sin(2 * Math.PI * cumulativePercent);
    cumulativePercent += percent;
    const endX = Math.cos(2 * Math.PI * cumulativePercent);
    const endY = Math.sin(2 * Math.PI * cumulativePercent);
    
    // If slice is 100%, make a full circle
    if (percent === 1) {
      return (
        <circle key={i} cx="0" cy="0" r="1" fill={slice.color} />
      );
    }

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
      <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
        {slices}
      </svg>
      {/* Inner White Circle for Donut effect */}
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
  const [view, setView] = useState('dashboard'); // dashboard, accounts, transactions, settings
  
  // Initialize State with LocalStorage or Default
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('wizmoney_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('wizmoney_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Mobile toggle
  const [showAddModal, setShowAddModal] = useState(false);

  // Currency State
  const [currency, setCurrency] = useState(() => localStorage.getItem('wizmoney_currency') || 'TWD');
  const [exchangeRate, setExchangeRate] = useState(() => parseFloat(localStorage.getItem('wizmoney_rate')) || 32.5);

  // Dashboard Time Range State
  const [dashboardRange, setDashboardRange] = useState('month'); // month, quarter, year, all, custom
  const [customDateRange, setCustomDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });

  // Filter State (for Transactions View)
  const [filterType, setFilterType] = useState('all'); // all, expense, income, transfer
  const [selectedTag, setSelectedTag] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Import State
  const [importStatus, setImportStatus] = useState(null); 
  const [importStep, setImportStep] = useState('idle'); // idle, column_mapping, processing
  const [csvRawData, setCsvRawData] = useState({ headers: [], rows: [] });
  const [columnMapping, setColumnMapping] = useState({}); // { 'system_field': csv_header_index }

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('wizmoney_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('wizmoney_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('wizmoney_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('wizmoney_rate', exchangeRate.toString());
  }, [exchangeRate]);


  // --- Helper Functions ---

  const formatCurrency = useCallback((amount) => {
    let value = amount;
    let locale = 'zh-TW';
    let curr = 'TWD';

    if (currency === 'USD') {
      value = amount / exchangeRate;
      locale = 'en-US';
      curr = 'USD';
    }

    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: curr, 
      minimumFractionDigits: currency === 'USD' ? 2 : 0 
    }).format(value);
  }, [currency, exchangeRate]);

  // Derived State
  const totalNetWorth = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  
  // Helper: Check if transaction falls within selected dashboard range
  const isTxInDashboardRange = (tx) => {
    const txDateStr = tx.date; // YYYY-MM-DD string
    const txDate = new Date(txDateStr);
    const now = new Date();
    const currentYear = now.getFullYear();

    if (dashboardRange === 'all') {
      return true;
    } else if (dashboardRange === 'month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === currentYear;
    } else if (dashboardRange === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const txQuarter = Math.floor(txDate.getMonth() / 3);
      return txQuarter === currentQuarter && txDate.getFullYear() === currentYear;
    } else if (dashboardRange === 'year') {
      return txDate.getFullYear() === currentYear;
    } else if (dashboardRange === 'custom') {
      return txDateStr >= customDateRange.start && txDateStr <= customDateRange.end;
    }
    return true;
  };

  // Calculate Dashboard Stats based on Range
  const dashboardStats = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (isTxInDashboardRange(t)) {
        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expense += t.amount;
      }
    });
    return { income, expense };
  }, [transactions, dashboardRange, customDateRange]);

  const categoryData = useMemo(() => {
    const data = {};
    transactions.filter(t => t.type === 'expense' && isTxInDashboardRange(t)).forEach(t => {
      const cat = t.category || '其他';
      if (!data[cat]) data[cat] = 0;
      data[cat] += t.amount;
    });
    return Object.keys(data).map(cat => ({
      label: cat,
      value: data[cat],
      color: CATEGORY_COLORS[cat] || '#ccc'
    })).sort((a, b) => b.value - a.value);
  }, [transactions, dashboardRange, customDateRange]);

  // Collect all unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set();
    transactions.forEach(tx => {
      if (tx.tags && Array.isArray(tx.tags)) {
        tx.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const typeMatch = filterType === 'all' || tx.type === filterType;
      const tagMatch = !selectedTag || (tx.tags && tx.tags.includes(selectedTag));
      return typeMatch && tagMatch;
    });
  }, [transactions, filterType, selectedTag]);

  // --- Handlers ---

  const handleAddTransaction = (newTx) => {
    const txWithId = { ...newTx, id: Date.now() };
    setTransactions([txWithId, ...transactions]);

    // Update Account Balances
    setAccounts(prevAccounts => prevAccounts.map(acc => {
      if (newTx.type === 'expense' && acc.id === parseInt(newTx.accountId)) {
        return { ...acc, balance: acc.balance - Number(newTx.amount) };
      }
      if (newTx.type === 'income' && acc.id === parseInt(newTx.accountId)) {
        return { ...acc, balance: acc.balance + Number(newTx.amount) };
      }
      if (newTx.type === 'transfer') {
        if (acc.id === parseInt(newTx.fromAccountId)) return { ...acc, balance: acc.balance - Number(newTx.amount) };
        if (acc.id === parseInt(newTx.toAccountId)) return { ...acc, balance: acc.balance + Number(newTx.amount) };
      }
      return acc;
    }));
    setShowAddModal(false);
  };

  // --- Sub-Components (Navigation) ---

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

  // --- Views ---

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
        {/* Dashboard Header & Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            財務儀表板 
            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {dashboardRange === 'custom' 
                ? `${customDateRange.start} ~ ${customDateRange.end}`
                : getRangeLabel()}
            </span>
          </h2>
          
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
              <CalendarRange size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select 
                value={dashboardRange}
                onChange={(e) => setDashboardRange(e.target.value)}
                className="pl-9 pr-8 py-1.5 bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer appearance-none hover:text-blue-600 transition-colors"
              >
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
                <input 
                  type="date" 
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                  className="w-32 py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="date" 
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                  className="w-32 py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-slate-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">淨資產總額</p>
                <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(totalNetWorth)}</h2>
                <p className="text-xs text-slate-400 mt-1">所有帳戶總和</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <Wallet size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-emerald-500">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{getRangeLabel()}收入</p>
                <h2 className="text-2xl font-bold text-emerald-600">+{formatCurrency(dashboardStats.income)}</h2>
              </div>
              <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                <TrendingUp size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-rose-500">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{getRangeLabel()}支出</p>
                <h2 className="text-2xl font-bold text-rose-600">-{formatCurrency(dashboardStats.expense)}</h2>
              </div>
              <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                <TrendingDown size={20} />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts & Recent Transactions Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-1 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <PieChart size={18} className="mr-2 text-slate-500" /> 支出分佈
              </div>
            </h3>
            <DonutChart data={categoryData} formatValue={formatCurrency} />
            <div className="mt-6 space-y-3">
              {categoryData.length > 0 ? categoryData.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-600">{cat.label}</span>
                  </div>
                  <span className="font-medium text-slate-800">{formatCurrency(cat.value)}</span>
                </div>
              )) : (
                <div className="text-center text-slate-400 text-sm">該期間無支出數據</div>
              )}
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">近期交易</h3>
              <button onClick={() => setView('transactions')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
                查看全部 <ChevronRight size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {transactions.length === 0 ? (
                 <div className="p-8 text-center text-slate-500">暫無交易記錄</div>
              ) : (
                transactions.slice(0, 6).map(tx => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const AccountsView = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-slate-800">帳戶列表</h2>
        <button className="text-sm bg-slate-200 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-300 transition">
          調整排序
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map(acc => (
          <Card key={acc.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${acc.color} flex items-center justify-center text-white shadow-lg shadow-opacity-20`}>
                <CreditCard size={20} />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                <ChevronRight size={20} />
              </div>
            </div>
            <div>
              <p className="text-slate-500 font-medium text-sm">{acc.type.toUpperCase()}</p>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5 mb-1">{acc.name}</h3>
              <p className={`text-xl font-mono font-semibold ${acc.balance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const TransactionItem = ({ tx }) => {
    const isExpense = tx.type === 'expense' || (tx.type === 'transfer' && tx.amount > 0); 
    const colorClass = tx.type === 'income' ? 'text-emerald-600' : tx.type === 'transfer' ? 'text-slate-600' : 'text-rose-600';
    const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
    const categoryName = tx.category || '其他';
    
    return (
      <div className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0
            ${CATEGORY_COLORS[categoryName] ? '' : 'bg-slate-400'}`}
            style={{ backgroundColor: CATEGORY_COLORS[categoryName] || '#94a3b8' }}
          >
            {/* Safe check to prevent crash if category is empty */}
            {categoryName.substring(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-800 text-sm">{tx.note || categoryName}</p>
              {tx.tags && tx.tags.length > 0 && (
                <div className="flex gap-1">
                  {tx.tags.map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium flex items-center">
                      <Tag size={8} className="mr-0.5" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              {tx.date} <span className="text-slate-300">|</span> {tx.time || '00:00'} • <span className="bg-slate-100 px-1.5 rounded text-slate-500">{accounts.find(a => a.id === tx.accountId)?.name || '轉帳'}</span>
            </p>
          </div>
        </div>
        <span className={`font-bold font-mono ${colorClass}`}>
          {sign}{formatCurrency(tx.amount)}
        </span>
      </div>
    );
  };

  const TransactionsView = () => (
    <div className="h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6 z-10 relative">
        <h2 className="text-2xl font-bold text-slate-800">交易明細</h2>
        <div className="flex space-x-2">
          {/* Filter Toggle */}
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2 rounded-lg transition-colors border flex items-center gap-2 text-sm font-medium
              ${isFilterOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">過濾器</span>
            {(filterType !== 'all' || selectedTag) && (
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Type Filter */}
            <div className="space-y-2 min-w-[120px]">
              <h4 className="text-xs font-bold text-slate-400 uppercase">交易類型</h4>
              <div className="flex flex-wrap gap-2">
                {['all', 'expense', 'income', 'transfer'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${filterType === t 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {t === 'all' ? '全部' : t === 'expense' ? '支出' : t === 'income' ? '收入' : '轉帳'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag Filter */}
            <div className="space-y-2 flex-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase">標籤篩選</h4>
              <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${!selectedTag
                        ? 'border-blue-500 text-blue-600 bg-blue-50' 
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    不限
                  </button>
                {allTags.length > 0 ? allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1
                      ${selectedTag === tag 
                        ? 'border-blue-500 bg-blue-500 text-white' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}
                  >
                    <Tag size={12} />
                    {tag}
                  </button>
                )) : (
                  <span className="text-sm text-slate-400 italic py-1.5">尚無標籤</span>
                )}
              </div>
            </div>
            
            {/* Clear Button */}
            <div className="flex items-end">
               <button 
                onClick={() => { setFilterType('all'); setSelectedTag(null); }}
                className="text-sm text-slate-400 hover:text-slate-600 underline decoration-dotted"
               >
                 清除條件
               </button>
            </div>
          </div>
        </div>
      )}

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p>沒有符合條件的交易</p>
              <button 
                onClick={() => { setFilterType('all'); setSelectedTag(null); }}
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                清除篩選條件
              </button>
            </div>
          ) : (
            filteredTransactions.map(tx => (
              <TransactionItem key={tx.id} tx={tx} />
            ))
          )}
        </div>
      </Card>
    </div>
  );

  const SettingsView = () => {
    const fileInputRef = useRef(null);

    const handleExportCSV = () => {
      const headers = ['ID', '日期', '時間', '類型', '金額', '類別', '帳戶', '備註', '標籤'];
      let totalIncome = 0;
      let totalExpense = 0;
      
      const rows = transactions.map(tx => {
        if (tx.type === 'income') totalIncome += tx.amount;
        if (tx.type === 'expense') totalExpense += tx.amount;

        const accountName = accounts.find(a => a.id === parseInt(tx.accountId))?.name || 
          (tx.type === 'transfer' 
            ? `轉出: ${accounts.find(a => a.id === parseInt(tx.fromAccountId))?.name} -> 轉入: ${accounts.find(a => a.id === parseInt(tx.toAccountId))?.name}` 
            : '未知');
            
        const tags = tx.tags ? tx.tags.join(';') : '';
        
        return [
          tx.id, tx.date, tx.time || '',
          tx.type === 'expense' ? '支出' : tx.type === 'income' ? '收入' : '轉帳',
          tx.amount, tx.category, accountName,
          `"${(tx.note || '').replace(/"/g, '""')}"`, tags
        ].join(',');
      });

      const netTotal = totalIncome - totalExpense;
      const summary = [
        '', `,,,總收入,${totalIncome},,,,,`, `,,,總支出,${totalExpense},,,,,`, `,,,淨結餘,${netTotal},,,,,`
      ].join('\n');

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

                // Initial parse to get headers and raw rows
                const lines = text.split('\n').filter(l => l.trim().length > 0);
                if (lines.length < 2) throw new Error("檔案內容為空或格式錯誤");

                // Simple CSV splitter considering quotes
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
                
                // Try to guess mapping
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
                setImportStep('column_mapping'); // Start Mapping Wizard
                setImportStatus(null);

            } catch (err) {
                console.error(err);
                setImportStatus({ type: 'error', message: '匯入失敗: ' + err.message });
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };
    
    const handleResetData = () => {
        if (confirm('確定要刪除所有交易與帳戶資料並重置為預設值嗎？此動作無法復原。')) {
            setTransactions(INITIAL_TRANSACTIONS);
            setAccounts(INITIAL_ACCOUNTS);
            setCurrency('TWD');
            localStorage.clear();
            alert('資料已重置');
        }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">設定</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Currency Settings */}
            <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <Globe size={20} className="mr-2 text-blue-500" /> 貨幣與匯率
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">顯示貨幣</label>
                        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                            <button 
                                onClick={() => setCurrency('TWD')}
                                className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors ${currency === 'TWD' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                TWD (新台幣)
                            </button>
                            <button 
                                onClick={() => setCurrency('USD')}
                                className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors ${currency === 'USD' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                USD (美金)
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex justify-between">
                            <span>匯率 (1 USD = ? TWD)</span>
                            <span className="text-blue-600 cursor-pointer flex items-center gap-1 hover:underline" onClick={() => setExchangeRate(32.5)}>
                                <RefreshCw size={10} /> 重置
                            </span>
                        </label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign size={16} className="text-slate-400" />
                            </div>
                            <input 
                                type="number" 
                                value={exchangeRate}
                                onChange={(e) => setExchangeRate(e.target.value)}
                                className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            當前顯示: <span className="font-mono text-slate-600">1 USD ≈ {exchangeRate} TWD</span>
                        </p>
                    </div>
                </div>
            </Card>

            {/* Import/Export Section */}
            <div className="space-y-6">
                 <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <Download size={20} className="mr-2 text-blue-500" /> 匯出資料
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="font-bold text-slate-700 text-sm">CSV 報表格式</p>
                        <p className="text-xs text-slate-500 mt-1 mb-3">通用格式，可使用 Excel、Numbers 或 Google Sheets 開啟。</p>
                        <button 
                        onClick={handleExportCSV}
                        className="w-full flex items-center justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
                        >
                        <Download size={16} className="mr-2" />
                        下載 CSV 檔案
                        </button>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <Upload size={20} className="mr-2 text-emerald-500" /> 匯入資料
                    </h3>
                    
                    {/* CSV Import */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-3">
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
                <button 
                    onClick={handleResetData}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center"
                >
                    <Trash2 size={16} className="mr-2" />
                    重置
                </button>
            </div>
        </Card>
      </div>
    );
  };

  // --- Import Mapping Modal ---
  const ColumnMappingModal = () => {
    const systemFields = [
      { key: 'date', label: '日期', required: true },
      { key: 'amount', label: '金額', required: true },
      { key: 'type', label: '類型', desc: '收入/支出/轉帳' },
      { key: 'category', label: '類別', desc: '飲食/交通等' },
      { key: 'account', label: '帳戶', desc: '錢包/銀行' },
      { key: 'note', label: '備註/說明' },
      { key: 'time', label: '時間' },
      { key: 'tags', label: '標籤' },
    ];

    const splitCSV = (str) => {
      const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
      let matches = [];
      let match;
      while ((match = regex.exec(str)) !== null) {
        matches.push(match[1] !== undefined ? match[1] : match[2]);
      }
      return matches;
    };

    const previewRow = csvRawData.rows.length > 0 ? splitCSV(csvRawData.rows[0]) : [];

    const handleMappingConfirm = () => {
      // Parse all rows using the mapping
      try {
        const parsedTransactions = [];
        
        for (let i = 0; i < csvRawData.rows.length; i++) {
           const line = csvRawData.rows[i].trim();
           if (!line || line.startsWith(',,,總')) continue;
           
           const rowData = splitCSV(line);
           const getValue = (key) => {
             const idx = columnMapping[key];
             return (idx !== undefined && idx !== -1) ? rowData[idx] : null;
           };

           const date = getValue('date') || new Date().toISOString().split('T')[0];
           const amount = parseFloat(getValue('amount'));
           if (isNaN(amount)) continue; // Skip invalid amount rows

           let type = getValue('type');
           // Normalize Type
           if (!type) type = 'expense'; // Default
           if (type === '收入' || type.toLowerCase() === 'income') type = 'income';
           else if (type === '轉帳' || type.toLowerCase() === 'transfer') type = 'transfer';
           else type = 'expense';

           const category = getValue('category') || '其他';
           const note = getValue('note');
           const tagsRaw = getValue('tags');
           const time = getValue('time');
           const accountNameRaw = getValue('account');

           // Simple Account Matching (Name Match or Default)
           let accountId = accounts[0].id;
           if (accountNameRaw) {
              const acc = accounts.find(a => a.name === accountNameRaw || a.name.includes(accountNameRaw));
              if (acc) accountId = acc.id;
           }

           parsedTransactions.push({
              id: Date.now() + i,
              date, time, type, amount, category,
              accountId,
              fromAccountId: null, toAccountId: null, // Simplified for generic import
              note: note ? note.replace(/""/g, '"') : '',
              tags: tagsRaw ? tagsRaw.split(';') : []
           });
        }

        if (parsedTransactions.length > 0) {
          setTransactions(prev => [...parsedTransactions, ...prev]);
          setImportStatus({ type: 'success', message: `成功匯入 ${parsedTransactions.length} 筆交易` });
        } else {
          setImportStatus({ type: 'error', message: '未找到有效交易資料，請檢查對應欄位' });
        }
        
      } catch(e) {
         setImportStatus({ type: 'error', message: '匯入處理錯誤: ' + e.message });
      }
      setImportStep('idle');
    };

    return (
       <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
           <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">CSV 欄位對應</h3>
            <button onClick={() => setImportStep('idle')} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
             <div className="mb-6 text-sm text-slate-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
               請將左側的系統欄位，對應到您 CSV 檔案中的正確標題。
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h4 className="font-bold text-slate-800 border-b pb-2">欄位設定</h4>
                   {systemFields.map(field => (
                     <div key={field.key} className="flex items-center justify-between">
                        <div className="flex flex-col">
                           <label className="text-sm font-bold text-slate-700">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                           </label>
                           {field.desc && <span className="text-xs text-slate-400">{field.desc}</span>}
                        </div>
                        <select 
                          className={`w-40 py-1.5 px-2 text-sm border rounded-lg focus:ring-2 outline-none ${
                             columnMapping[field.key] === -1 ? 'border-slate-200 text-slate-400' : 'border-blue-300 bg-blue-50 text-blue-700 font-medium'
                          }`}
                          value={columnMapping[field.key] !== undefined ? columnMapping[field.key] : -1}
                          onChange={(e) => setColumnMapping({...columnMapping, [field.key]: parseInt(e.target.value)})}
                        >
                           <option value="-1">-- 忽略 --</option>
                           {csvRawData.headers.map((h, idx) => (
                              <option key={idx} value={idx}>{h}</option>
                           ))}
                        </select>
                     </div>
                   ))}
                </div>

                <div className="space-y-4">
                   <h4 className="font-bold text-slate-800 border-b pb-2">第一筆資料預覽</h4>
                   <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm border border-slate-200">
                      {systemFields.map(field => {
                         const idx = columnMapping[field.key];
                         const value = (idx !== undefined && idx !== -1) ? previewRow[idx] : <span className="text-slate-300 italic">未對應</span>;
                         
                         return (
                            <div key={field.key} className="flex justify-between">
                               <span className="text-slate-500">{field.label}:</span>
                               <span className="font-mono font-medium text-slate-800 max-w-[150px] truncate">{value}</span>
                            </div>
                         )
                      })}
                   </div>
                   <p className="text-xs text-center text-slate-400 mt-2">
                      若預覽資料看起來不正確，請調整左側的對應設定。
                   </p>
                </div>
             </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex gap-3 justify-end">
             <button 
                onClick={() => setImportStep('idle')}
                className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100"
             >
                取消
             </button>
             <button 
                onClick={handleMappingConfirm}
                className="px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg"
             >
                開始匯入
             </button>
          </div>
        </div>
       </div>
    );
  };

  const AddTransactionModal = () => {
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES['expense'][0]);
    const [accountId, setAccountId] = useState(accounts[0].id);
    const [toAccountId, setToAccountId] = useState(accounts[1]?.id); // For transfer
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5)); // Default to current time HH:MM
    const [note, setNote] = useState('');
    const [tagInput, setTagInput] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!amount || Number(amount) <= 0) return;

      // Process tags: split by comma, trim, filter empty
      const tags = tagInput.split(/[,，]/).map(t => t.trim()).filter(t => t.length > 0);

      handleAddTransaction({
        date,
        time,
        type,
        amount: Number(amount),
        category: type === 'transfer' ? '轉帳' : category,
        accountId: type === 'transfer' ? null : accountId,
        fromAccountId: type === 'transfer' ? accountId : null,
        toAccountId: type === 'transfer' ? toAccountId : null,
        note,
        tags
      });
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">新增交易</h3>
            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Type Selector */}
          <div className="flex bg-slate-100 p-1 m-4 rounded-lg">
            {['expense', 'income', 'transfer'].map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setCategory(CATEGORIES[t][0]); }}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  type === t 
                  ? (t === 'expense' ? 'bg-rose-500 text-white shadow' : t === 'income' ? 'bg-emerald-500 text-white shadow' : 'bg-blue-600 text-white shadow') 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'expense' ? '支出' : t === 'income' ? '收入' : '轉帳'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">金額 (TWD)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign size={18} className="text-slate-400" />
                </div>
                <input 
                  type="number" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">日期</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">時間</label>
                <input 
                  type="time" 
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Category Row (Conditional) */}
            {type !== 'transfer' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">類別</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  {CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Account Selection */}
            {type === 'transfer' ? (
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">從帳戶</label>
                  <select 
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-center text-slate-400"><ArrowRightLeft size={16} /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">到帳戶</label>
                  <select 
                    value={toAccountId}
                    onChange={e => setToAccountId(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                  >
                    {accounts.filter(a => a.id != accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">帳戶</label>
                <select 
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

             {/* Tags Input */}
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">標籤 (用逗號分隔)</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag size={16} className="text-slate-400" />
                  </div>
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如: 早餐, 出差, 報帳"
                  />
               </div>
            </div>

            {/* Note */}
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">備註 (選填)</label>
               <textarea 
                value={note}
                onChange={e => setNote(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows="2"
              />
            </div>
          </form>
          
          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={handleSubmit}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2
                ${type === 'expense' ? 'bg-rose-500 hover:bg-rose-600' : type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              <span>確認{type === 'expense' ? '支出' : type === 'income' ? '收入' : '轉帳'}</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <div className={`fixed md:relative z-20 h-full bg-white border-r border-slate-200 w-64 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-2 font-bold text-xl text-blue-700 ${!isSidebarOpen && 'md:hidden lg:flex'}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Wallet size={18} />
            </div>
            <span className="md:hidden lg:block">WizMoney</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="px-3 space-y-1 mt-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label={<span className="md:hidden lg:inline">總覽</span>}
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
          />
          <SidebarItem 
            icon={CreditCard} 
            label={<span className="md:hidden lg:inline">帳戶</span>}
            active={view === 'accounts'} 
            onClick={() => setView('accounts')} 
          />
          <SidebarItem 
            icon={List} 
            label={<span className="md:hidden lg:inline">交易</span>}
            active={view === 'transactions'} 
            onClick={() => setView('transactions')} 
          />
          <SidebarItem 
            icon={Settings} 
            label={<span className="md:hidden lg:inline">設定</span>}
            active={view === 'settings'} 
            onClick={() => setView('settings')} 
          />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-800">WizMoney</span>
          <div className="w-6"></div> {/* Spacer */}
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto h-full">
            {view === 'dashboard' && <DashboardView />}
            {view === 'accounts' && <AccountsView />}
            {view === 'transactions' && <TransactionsView />}
            {view === 'settings' && <SettingsView />}
          </div>
        </main>

        {/* Floating Action Button for Add */}
        <div className="absolute bottom-8 right-8">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <Plus size={28} />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddTransactionModal />}
      {importStep === 'column_mapping' && <ColumnMappingModal />}
    </div>
  );
}