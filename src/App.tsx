import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  Banknote,
  BarChart3,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Coins,
  Gift,
  HelpCircle,
  Home,
  Info,
  LockKeyhole,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

type Task = {
  id: string;
  kind: 'ad' | 'channel';
  provider?: string;
  title: string;
  description: string;
  reward: number;
  dailyLimit: number;
  completedToday: number;
  channelUrl?: string;
  duration: number;
  status: 'available' | 'completed';
};

type Wallet = {
  balance: number;
  todayEarned: number;
  totalEarned: number;
  streak: number;
};

type WithdrawalRecord = {
  id: string;
  user: string;
  amount: number;
  time: string;
};

type Locale = 'ar' | 'en';

function getBrowserLocale(): Locale {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

const locale = getBrowserLocale();
const isArabic = locale === 'ar';

const copy = {
  ar: {
    nav: { home: 'الرئيسية', tasks: 'الإعلانات', wallet: 'المحفظة', history: 'سجلات السحب', help: 'كيف تعمل؟' },
    dailyRewards: 'مكافآت USDT يومية',
    openMenu: 'فتح القائمة',
    demoMode: 'وضع العرض خارج Telegram',
    demoData: 'بيانات العرض',
    fromTelegram: 'من Telegram',
    greeting: 'صباح الخير،',
    homeTitle: 'يومك يبدأ هنا.',
    demoMessage: 'أنت في وضع العرض. افتح التطبيق من Telegram لعرض ملفك الحقيقي.',
    availableBalance: 'الرصيد المتاح',
    pointsToday: 'USDT اليوم',
    viewWallet: 'عرض المحفظة',
    dailyProgress: 'إنجاز اليوم',
    tasksCount: 'مهام',
    startSmall: 'ابدأ بمهمة صغيرة',
    allTasksDone: 'اكتملت كل مهامك',
    onTrack: 'أنت على الطريق الصحيح',
    dailyLimitClear: 'كل مهمة لها حد يومي واضح',
    todayChoices: 'اختيارات اليوم',
    simpleTasks: 'إعلانات Adsgram اليومية',
    allTasks: 'كل المهام',
    pageTasksEyebrow: 'مساحة المهام',
    pageTasksTitle: 'اختر ما يناسبك.',
    pageTasksDescription: 'مهام يومية قليلة وواضحة. لا نطلب منك أكثر مما هو مكتوب.',
    completedToday: 'مكتملة اليوم',
    resetsDaily: 'يتجدد يومياً',
    whyLimits: 'لماذا توجد حدود يومية؟',
    limitsDescription: 'حتى تبقى التجربة متوازنة وواضحة للجميع. الحد لا يعني وعداً بدخل، بل ينظم مكافآت المهام المتاحة.',
    walletEyebrow: 'محفظتك',
    walletTitle: 'اسحب أرباحك بوضوح.',
    walletDescription: 'أدخل عنوان محفظة TON واطلب السحب عندما يصل رصيدك إلى الحد الأدنى.',
    walletBalance: 'الرصيد المتاح',
    tonNetwork: 'شبكة TON',
    withdrawalTitle: 'طلب سحب جديد',
    withdrawalDescription: 'الحد الأدنى للسحب هو 1.00 USDT. تتم مراجعة الطلب قبل الإرسال.',
    amountLabel: 'مبلغ السحب بـ USDT',
    amountPlaceholder: 'مثال: 1.00 USDT',
    tonAddressLabel: 'عنوان محفظة TON',
    tonAddressPlaceholder: 'أدخل عنوان TON يبدأ بـ U أو E',
    submitWithdrawal: 'إرسال طلب السحب',
    withdrawalSuccess: 'تم تسجيل طلب السحب بـ USDT للمراجعة.',
    withdrawalMinError: 'الحد الأدنى لطلب السحب هو 1.00 USDT.',
    withdrawalBalanceError: 'المبلغ أكبر من رصيدك المتاح.',
    withdrawalAddressError: 'أدخل عنوان TON صحيحاً من 10 أحرف على الأقل.',
    historyEyebrow: 'سجل السحوبات',
    historyTitle: 'آخر عمليات السحب',
    historyDescription: 'سجلات عامة مختصرة لآخر خمسة مستخدمين سحبوا USDT.',
    withdrawalCompleted: 'تم السحب',
    today: 'اليوم',
    total: 'الإجمالي',
    streak: 'تتابع النشاط',
    days: 'أيام',
    walletNote: 'رصيدك يبدأ من 0 USDT ويزداد فقط بعد إكمال إعلان Adsgram والتحقق منه.',
    helpEyebrow: 'الوضوح أولاً',
    helpTitle: 'كيف يعمل Rewardly؟',
    helpDescription: 'مكان صغير ومفهوم للمكافآت اليومية، من دون وعود كبيرة أو خطوات غامضة.',
    helpTelegramTitle: 'ما الذي نعرفه عن حساب Telegram؟',
    helpTelegramText: 'نستخدم الاسم واسم المستخدم والصورة التي يسمح بها Telegram لعرض ملفك داخل التطبيق. لا نطلب محادثاتك أو جهات اتصالك.',
    helpLimitsTitle: 'كيف تعمل الحدود اليومية؟',
    helpLimitsText: 'كل مهمة تملك عدداً محدداً من المرات في اليوم. يظهر العدد بجانب المهمة، ويتجدد تلقائياً عند بداية يوم جديد حسب توقيت جهازك.',
    helpRulesTitle: 'متى يضاف USDT؟',
    helpRulesText: 'تضاف مكافأة USDT فقط بعد إكمال خطوة التحقق الظاهرة. كل إعلان Adsgram يعطي 0.005 أو 0.01 USDT.',
    helpNeed: 'تحتاج مساعدة؟',
    helpNeedText: 'إذا واجهت إعلاناً لا يعمل كما هو متوقع، أغلقه وحاول مرة أخرى لاحقاً. لا تتكرر المحاولة على حساب رصيدك.',
    adTask: 'إعلان Adsgram',
    adTaskDescription: 'شاهد إعلاناً قصيراً من مزود Adsgram واحصل على مكافأتك.',
    channelTask: 'تعرّف على قناة Urumfaucet',
    channelTaskDescription: 'انضم للقناة الرسمية لتصلك التحديثات.',
    secondAdTask: 'إعلان Adsgram إضافي',
    secondAdTaskDescription: 'إعلان يومي إضافي بمكافأة USDT واضحة.',
    seconds: 'ثانية',
    startNow: 'ابدأ الآن',
    openChannel: 'فتح القناة',
    completed: 'اكتملت اليوم',
    demoAdWaiting: 'جاري تجهيز إعلان Adsgram... يمكنك تأكيد المشاهدة بعد لحظات.',
    channelConfirm: 'هل أتممت الانضمام للقناة؟',
    adConfirm: 'تمت مشاهدة الإعلان التجريبي؟',
    notYet: 'ليس بعد',
    confirmAdd: 'تأكيد وإضافة',
  },
  en: {
    nav: { home: 'Home', tasks: 'Ads', wallet: 'Wallet', history: 'Withdrawals', help: 'How it works' },
    dailyRewards: 'DAILY USDT REWARDS',
    openMenu: 'Open menu',
    demoMode: 'Demo mode outside Telegram',
    demoData: 'Demo data',
    fromTelegram: 'From Telegram',
    greeting: 'Good morning,',
    homeTitle: 'Your day starts here.',
    demoMessage: 'You are in demo mode. Open the app from Telegram to show your real profile.',
    availableBalance: 'Available balance',
    pointsToday: 'USDT today',
    viewWallet: 'View wallet',
    dailyProgress: 'Today’s progress',
    tasksCount: 'tasks',
    startSmall: 'Start with a small task',
    allTasksDone: 'All tasks complete',
    onTrack: 'You are on the right track',
    dailyLimitClear: 'Every task has a clear daily limit',
    todayChoices: 'Today’s picks',
    simpleTasks: 'Daily Adsgram ads',
    allTasks: 'All tasks',
    pageTasksEyebrow: 'TASK SPACE',
    pageTasksTitle: 'Choose what fits.',
    pageTasksDescription: 'A few clear daily tasks. Nothing is hidden.',
    completedToday: 'complete today',
    resetsDaily: 'resets daily',
    whyLimits: 'Why are there daily limits?',
    limitsDescription: 'Limits keep the experience balanced and clear for everyone. They organize available rewards and do not promise income.',
    walletEyebrow: 'YOUR WALLET',
    walletTitle: 'Withdraw with clarity.',
    walletDescription: 'Enter a TON wallet address and request a withdrawal once you reach the minimum balance.',
    walletBalance: 'Available balance',
    tonNetwork: 'TON network',
    withdrawalTitle: 'New withdrawal request',
    withdrawalDescription: 'Minimum withdrawal is 1.00 USDT. Requests are reviewed before sending.',
    amountLabel: 'Withdrawal amount in USDT',
    amountPlaceholder: 'Example: 1.00 USDT',
    tonAddressLabel: 'TON wallet address',
    tonAddressPlaceholder: 'Enter a TON address starting with U or E',
    submitWithdrawal: 'Submit withdrawal',
    withdrawalSuccess: 'Your USDT withdrawal request was submitted for review.',
    withdrawalMinError: 'Minimum withdrawal is 1.00 USDT.',
    withdrawalBalanceError: 'The amount is higher than your available balance.',
    withdrawalAddressError: 'Enter a valid TON address with at least 10 characters.',
    historyEyebrow: 'WITHDRAWAL LOG',
    historyTitle: 'Latest withdrawals',
    historyDescription: 'A public snapshot of the latest five users who withdrew USDT.',
    withdrawalCompleted: 'Paid',
    today: 'Today',
    total: 'Total',
    streak: 'Activity streak',
    days: 'days',
    walletNote: 'Your balance starts at 0 USDT and only increases after completing and verifying an Adsgram ad.',
    helpEyebrow: 'CLARITY FIRST',
    helpTitle: 'How does Rewardly work?',
    helpDescription: 'A small, clear place for daily rewards without big promises or hidden steps.',
    helpTelegramTitle: 'What do we know about your Telegram account?',
    helpTelegramText: 'We use the name, username, and photo Telegram allows us to display your profile inside the app. We do not request chats or contacts.',
    helpLimitsTitle: 'How do daily limits work?',
    helpLimitsText: 'Each task has a fixed number of daily completions. The counter resets automatically at the start of a new day using your device time.',
    helpRulesTitle: 'When is USDT added?',
    helpRulesText: 'USDT is added only after the visible verification step. Each Adsgram ad gives 0.005 or 0.01 USDT.',
    helpNeed: 'Need help?',
    helpNeedText: 'If an ad does not work as expected, close it and try again later. Do not repeatedly retry at the cost of your balance.',
    adTask: 'Adsgram ad',
    adTaskDescription: 'Watch a short ad from Adsgram and receive the displayed reward.',
    channelTask: 'Discover the Urumfaucet channel',
    channelTaskDescription: 'Join the official channel for updates.',
    secondAdTask: 'Another Adsgram ad',
    secondAdTaskDescription: 'Another daily ad with a clear USDT reward.',
    seconds: 'seconds',
    startNow: 'Start now',
    openChannel: 'Open channel',
    completed: 'Complete today',
    demoAdWaiting: 'Preparing an Adsgram ad... You can confirm the view in a moment.',
    channelConfirm: 'Did you join the channel?',
    adConfirm: 'Did you watch the demo ad?',
    notYet: 'Not yet',
    confirmAdd: 'Confirm and add',
  },
}[locale];

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: { user?: TelegramUser };
        ready?: () => void;
        expand?: () => void;
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string) => void;
      };
    };
  }
}

const queryClient = new QueryClient();
const STORAGE_KEY = 'rewardly-local-state-v2';

const initialTasks: Task[] = Array.from({ length: 10 }, (_, index) => ({
  id: `adsgram-${index + 1}`,
  kind: 'ad' as const,
  provider: 'Adsgram',
  title: `${copy.adTask} ${index + 1}`,
  description: copy.adTaskDescription,
  reward: index % 2 === 0 ? 0.005 : 0.01,
  dailyLimit: 1,
  completedToday: 0,
  duration: index % 2 === 0 ? 15 : 30,
  status: 'available' as const,
}));

const initialWallet: Wallet = {
  balance: 0,
  todayEarned: 0,
  totalEarned: 0,
  streak: 0,
};

const withdrawalRecords: WithdrawalRecord[] = [
  { id: 'withdrawal-1', user: '@user_4821', amount: 2.5, time: isArabic ? 'منذ 12 دقيقة' : '12 minutes ago' },
  { id: 'withdrawal-2', user: '@reward_user', amount: 1.75, time: isArabic ? 'منذ 38 دقيقة' : '38 minutes ago' },
  { id: 'withdrawal-3', user: '@user_1904', amount: 4, time: isArabic ? 'منذ ساعة' : '1 hour ago' },
  { id: 'withdrawal-4', user: '@fast_earner', amount: 1.2, time: isArabic ? 'منذ ساعتين' : '2 hours ago' },
  { id: 'withdrawal-5', user: '@user_7350', amount: 3.25, time: isArabic ? 'منذ 3 ساعات' : '3 hours ago' },
];

type StoredState = {
  day: string;
  tasks: Task[];
  wallet: Wallet;
};

function todayKey() {
  return new Intl.DateTimeFormat('en-CA').format(new Date());
}

function getTelegramUser(): { user: TelegramUser; isDemo: boolean } {
  const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (telegramUser) return { user: telegramUser, isDemo: false };
  return {
    user: {
      id: 100021,
      first_name: isArabic ? 'زائر' : 'Guest',
      last_name: isArabic ? 'ريواردلي' : 'Rewardly',
      username: 'rewardly_guest',
      language_code: locale,
    },
    isDemo: true,
  };
}

function loadState(): { tasks: Task[]; wallet: Wallet } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredState | null;
    if (saved?.day === todayKey() && saved.tasks && saved.wallet) {
      return { tasks: saved.tasks, wallet: saved.wallet };
    }
  } catch {
    // localStorage is optional in Telegram webviews.
  }
  return { tasks: initialTasks, wallet: initialWallet };
}

function initials(user: TelegramUser) {
  return `${user.first_name.slice(0, 1)}${user.last_name?.slice(0, 1) ?? ''}`;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits, useGrouping: false }).format(value);
}

function formatUsdt(value: number) {
  return `${formatNumber(value, 3)} USDT`;
}

function displayName(user: TelegramUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ');
}

function IconBadge({ kind }: { kind: Task['kind'] }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${kind === 'ad' ? 'bg-[hsl(39_94%_62%/.22)] text-[hsl(34_64%_34%)]' : 'bg-[hsl(190_43%_20%/.1)] text-[hsl(190_43%_20%)]'}`}>
      {kind === 'ad' ? <Play size={18} fill="currentColor" strokeWidth={1.5} /> : <ArrowUpLeft size={20} strokeWidth={1.8} />}
    </span>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`relative flex items-center justify-center rounded-xl bg-[hsl(39_94%_62%)] text-[hsl(196_41%_17%)] ${small ? 'h-9 w-9' : 'h-11 w-11'}`}>
      <Coins size={small ? 18 : 22} strokeWidth={2.2} />
      <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full border-2 border-[hsl(42_38%_96%)] bg-[hsl(12_73%_65%)]" />
    </span>
  );
}

function Avatar({ user, large = false }: { user: TelegramUser; large?: boolean }) {
  return user.photo_url ? (
    <img
      src={user.photo_url}
      alt={displayName(user)}
      data-testid="img-avatar"
      className={`rounded-full object-cover ring-4 ring-[hsl(39_94%_62%/.18)] ${large ? 'h-16 w-16' : 'h-10 w-10'}`}
    />
  ) : (
    <span
      data-testid="img-avatar"
      className={`flex items-center justify-center rounded-full bg-[hsl(190_43%_20%)] font-semibold text-[hsl(39_94%_62%)] ring-4 ring-[hsl(39_94%_62%/.18)] ${large ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-sm'}`}
    >
      {initials(user)}
    </span>
  );
}

function useRewardlyState() {
  const [state, setState] = useState(loadState);
  const [verification, setVerification] = useState<{ taskId: string; phase: 'waiting' | 'ready' } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, day: todayKey() }));
    } catch {
      // App remains usable if storage is blocked.
    }
  }, [state]);

  const completeTask = (taskId: string) => {
    setState((current) => {
      const target = current.tasks.find((task) => task.id === taskId);
      if (!target || target.completedToday >= target.dailyLimit) return current;
      return {
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? { ...task, completedToday: task.completedToday + 1, status: task.completedToday + 1 >= task.dailyLimit ? 'completed' : 'available' }
            : task,
        ),
        wallet: {
          ...current.wallet,
          balance: current.wallet.balance + target.reward,
          todayEarned: current.wallet.todayEarned + target.reward,
          totalEarned: current.wallet.totalEarned + target.reward,
        },
      };
    });
    setVerification(null);
  };

  const requestWithdrawal = (amount: number) => {
    setState((current) => current.wallet.balance < amount
      ? current
      : {
          ...current,
          wallet: {
            ...current.wallet,
            balance: current.wallet.balance - amount,
          },
        });
  };

  const startTask = (task: Task) => {
    if (task.completedToday >= task.dailyLimit) return;
    if (task.kind === 'channel') {
      const webApp = window.Telegram?.WebApp;
      if (task.channelUrl) {
        if (webApp?.openTelegramLink) webApp.openTelegramLink(task.channelUrl);
        else window.open(task.channelUrl, '_blank', 'noopener,noreferrer');
      }
      setVerification({ taskId: task.id, phase: 'waiting' });
      window.setTimeout(() => setVerification((current) => current?.taskId === task.id ? { taskId: task.id, phase: 'ready' } : current), 2200);
      return;
    }
    setVerification({ taskId: task.id, phase: 'waiting' });
    window.setTimeout(() => setVerification((current) => current?.taskId === task.id ? { taskId: task.id, phase: 'ready' } : current), 1600);
  };

  return { ...state, verification, setVerification, startTask, completeTask, requestWithdrawal };
}

function Shell({
  children,
  user,
  isDemo,
  wallet,
}: {
  children: ReactNode;
  user: TelegramUser;
  isDemo: boolean;
  wallet: Wallet;
}) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { href: '/', label: copy.nav.home, icon: Home },
    { href: '/tasks', label: copy.nav.tasks, icon: Zap },
    { href: '/wallet', label: copy.nav.wallet, icon: WalletCards },
    { href: '/withdrawals', label: copy.nav.history, icon: Clock3 },
    { href: '/help', label: copy.nav.help, icon: CircleHelp },
  ];

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="app-shell text-[hsl(var(--foreground))]">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border)/.75)] bg-[hsl(42_38%_96%/.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
            <BrandMark small />
            <div className="leading-none">
              <div className="text-base font-bold tracking-tight">Rewardly</div>
              <div className="mt-1 text-[10px] font-medium tracking-[.12em] text-[hsl(var(--muted-foreground))]">{copy.dailyRewards}</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/wallet" data-testid="link-balance-header" className="hidden items-center gap-2 rounded-full bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold shadow-[0_3px_16px_hsl(190_43%_20%/.06)] sm:flex">
              <Coins size={14} className="text-[hsl(34_75%_42%)]" />
              <span data-testid="text-header-balance" className="font-mono">{formatUsdt(wallet.balance)}</span>
            </Link>
            <Link href="/withdrawals" aria-label={copy.nav.history} data-testid="link-withdrawal-history-header" className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] px-3 py-2 text-xs font-bold text-[hsl(34_75%_42%)] transition hover:bg-[hsl(39_94%_62%/.16)]">
              <Clock3 size={15} />
              <span className="hidden sm:inline">{copy.nav.history}</span>
            </Link>
            <button type="button" aria-label={copy.openMenu} data-testid="button-open-menu" onClick={() => setMenuOpen((open) => !open)} className="rounded-full p-2.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] sm:hidden">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/wallet" data-testid="link-avatar-header"><Avatar user={user} /></Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-4 top-[5rem] z-50 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl sm:hidden">
          {navItems.map(({ href, label, icon: NavIcon }) => (
            <Link key={href} href={href} data-testid={`mobile-nav-${label}`} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${location === href ? 'bg-[hsl(var(--muted))] font-bold text-[hsl(190_43%_20%)]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              <NavIcon size={18} />
              {label}
            </Link>
          ))}
        </div>
      )}

      <div className="mx-auto flex max-w-5xl">
        <aside className="hidden w-56 shrink-0 px-5 pt-8 sm:block">
          <div className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-4">
            <Avatar user={user} large />
            <div data-testid="text-sidebar-name" className="mt-3 truncate font-bold">{displayName(user)}</div>
            <div data-testid="text-sidebar-username" className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">@{user.username ?? 'telegram_user'}</div>
            {isDemo && <div data-testid="status-demo-mode" className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-[hsl(34_75%_42%)]"><Info size={12} /> {copy.demoMode}</div>}
          </div>
          <nav aria-label={copy.nav.home} className="space-y-1">
            {navItems.map(({ href, label, icon: NavIcon }) => (
              <Link key={href} href={href} data-testid={`nav-${href === '/' ? 'home' : href.slice(1)}`} className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition ${location === href ? 'bg-[hsl(190_43%_20%)] font-semibold text-[hsl(42_38%_96%)] shadow-[0_8px_20px_hsl(190_43%_20%/.15)]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`}>
                <span className="flex items-center gap-3"><NavIcon size={17} />{label}</span>
                {location === href && <ChevronLeft size={15} />}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-5 pt-7 sm:px-8 sm:pt-10">{children}</main>
      </div>

      <nav className="nav-safe fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--border)/.8)] bg-[hsl(42_38%_96%/.94)] px-3 pt-2 backdrop-blur-xl sm:hidden" aria-label={copy.nav.home}>
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {navItems.map(({ href, label, icon: NavIcon }) => (
            <Link key={href} href={href} data-testid={`bottom-nav-${href === '/' ? 'home' : href.slice(1)}`} className={`flex min-w-[4.3rem] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] ${location === href ? 'font-bold text-[hsl(190_43%_20%)]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              <NavIcon size={19} strokeWidth={location === href ? 2.4 : 1.8} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[.08em] text-[hsl(34_75%_42%)]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(12_73%_65%)]" />{eyebrow}</div>
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(196_41%_17%)] sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-lg text-sm leading-7 text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function BalanceCard({ wallet }: { wallet: Wallet }) {
  return (
    <div className="relative overflow-hidden rounded-[1.65rem] bg-[hsl(190_43%_20%)] p-6 text-[hsl(42_38%_96%)] shadow-[0_18px_40px_hsl(190_43%_20%/.18)] sm:p-8">
      <div className="absolute -left-10 -top-14 h-48 w-48 rounded-full border border-[hsl(39_94%_62%/.22)]" />
      <div className="absolute -left-1 top-[-5.5rem] h-48 w-48 rounded-full border border-[hsl(39_94%_62%/.14)]" />
      <div className="absolute bottom-0 right-0 h-40 w-40 translate-x-16 translate-y-16 rounded-full bg-[hsl(12_73%_65%/.16)] blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[hsl(42_20%_76%)]"><Coins size={15} className="text-[hsl(39_94%_62%)]" />{copy.availableBalance}</div>
          <div data-testid="text-wallet-balance" className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tracking-[-.07em] sm:text-5xl">{formatNumber(wallet.balance, 3)}</span>
            <span className="text-sm text-[hsl(42_20%_76%)]">USDT</span>
          </div>
        </div>
        <div className="balance-orbit flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(39_94%_62%/.32)] bg-[hsl(39_94%_62%/.13)]"><Gift size={23} className="text-[hsl(39_94%_62%)]" /></div>
      </div>
      <div className="relative mt-8 flex items-center justify-between border-t border-[hsl(42_38%_96%/.13)] pt-4 text-xs">
        <span className="text-[hsl(42_20%_76%)]">+{formatUsdt(wallet.todayEarned)} · {copy.today}</span>
        <Link href="/wallet" data-testid="link-view-wallet" className="flex items-center gap-1.5 font-semibold text-[hsl(39_94%_62%)]">{copy.viewWallet} <ChevronLeft size={14} /></Link>
      </div>
    </div>
  );
}

function TaskCard({ task, onStart, verification, onVerify, onCancel }: { task: Task; onStart: (task: Task) => void; verification: { taskId: string; phase: 'waiting' | 'ready' } | null; onVerify: () => void; onCancel: () => void }) {
  const limitReached = task.completedToday >= task.dailyLimit;
  const active = verification?.taskId === task.id;
  return (
    <div data-testid={`card-task-${task.id}`} className={`task-row rounded-2xl border bg-[hsl(var(--card)/.82)] p-4 ${active ? 'border-[hsl(39_94%_62%/.7)] shadow-[0_8px_25px_hsl(39_94%_62%/.12)]' : 'border-[hsl(var(--border))]'}`}>
      <div className="flex items-start gap-3">
        <IconBadge kind={task.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h3 data-testid={`text-task-title-${task.id}`} className="font-bold text-[hsl(196_41%_17%)]">{task.title}</h3>
                {task.provider && <span className="rounded-full bg-[hsl(190_43%_20%/.1)] px-2 py-0.5 text-[10px] font-bold text-[hsl(190_43%_20%)]">{task.provider}</span>}
              </div>
              <p data-testid={`text-task-description-${task.id}`} className="mt-1 text-xs leading-6 text-[hsl(var(--muted-foreground))]">{task.description}</p>
            </div>
            <span data-testid={`text-task-reward-${task.id}`} className="shrink-0 rounded-full bg-[hsl(39_94%_62%/.2)] px-2.5 py-1 font-mono text-xs font-bold text-[hsl(34_75%_42%)]">+{formatUsdt(task.reward)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1"><Clock3 size={13} />{task.duration} {copy.seconds}</span>
              <span className="text-[hsl(var(--border))]">•</span>
              <span data-testid={`text-task-limit-${task.id}`}>{formatNumber(task.completedToday)} / {formatNumber(task.dailyLimit)} {copy.today}</span>
            </div>
            {limitReached ? (
              <span data-testid={`status-task-completed-${task.id}`} className="flex items-center gap-1.5 text-xs font-bold text-[hsl(155_39%_40%)]"><BadgeCheck size={16} />{copy.completed}</span>
            ) : (
              <button type="button" data-testid={`button-start-task-${task.id}`} onClick={() => onStart(task)} className="flex items-center gap-1.5 rounded-xl bg-[hsl(190_43%_20%)] px-3.5 py-2 text-xs font-bold text-[hsl(42_38%_96%)] transition hover:-translate-y-0.5 hover:bg-[hsl(190_43%_25%)] active:translate-y-0">
                {task.kind === 'ad' ? copy.startNow : copy.openChannel} <ArrowLeft size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      {active && (
        <div data-testid={`panel-verification-${task.id}`} className="mt-4 border-t border-[hsl(var(--border))] pt-4">
          {task.kind === 'ad' && verification.phase === 'waiting' ? (
            <div className="flex items-center gap-3 rounded-xl bg-[hsl(39_94%_62%/.12)] p-3 text-xs leading-5 text-[hsl(34_64%_34%)]">
              <div className="h-4 w-4 animate-pulse rounded-full bg-[hsl(39_94%_62%)]" />
              <span>{copy.demoAdWaiting}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[hsl(155_39%_46%/.1)] p-3">
               <span className="text-xs font-medium leading-5 text-[hsl(155_39%_35%)]">{task.kind === 'channel' ? copy.channelConfirm : copy.adConfirm}</span>
              <div className="flex gap-2">
                 <button type="button" data-testid={`button-cancel-task-${task.id}`} onClick={onCancel} className="rounded-lg px-2.5 py-1.5 text-xs text-[hsl(var(--muted-foreground))]">{copy.notYet}</button>
                  <button type="button" data-testid={`button-verify-task-${task.id}`} onClick={onVerify} className="rounded-lg bg-[hsl(155_39%_40%)] px-3 py-1.5 text-xs font-bold text-white">{copy.confirmAdd} {formatUsdt(task.reward)}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HomePage({ user, isDemo, tasks, wallet, verification, onStart, onVerify, onCancel }: { user: TelegramUser; isDemo: boolean; tasks: Task[]; wallet: Wallet; verification: { taskId: string; phase: 'waiting' | 'ready' } | null; onStart: (task: Task) => void; onVerify: () => void; onCancel: () => void }) {
  const done = tasks.reduce((sum, task) => sum + task.completedToday, 0);
  const possible = tasks.reduce((sum, task) => sum + task.dailyLimit, 0);
  const completion = possible ? Math.round((done / possible) * 100) : 0;
  return (
    <div className="screen-enter safe-bottom">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
        <div className="mb-2 text-xs font-bold text-[hsl(34_75%_42%)]">{copy.greeting} {user.first_name}</div>
        <h1 data-testid="text-home-title" className="text-3xl font-bold tracking-tight text-[hsl(196_41%_17%)] sm:text-4xl">{copy.homeTitle}</h1>
        {isDemo && <p data-testid="status-demo-banner" className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{copy.demoMessage}</p>}
        </div>
        <div className="hidden rounded-2xl bg-[hsl(12_73%_65%/.12)] p-3 text-[hsl(12_73%_65%)] sm:block"><Sparkles size={22} /></div>
      </div>
      <div data-testid="card-telegram-profile" className="mb-5 flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] px-4 py-3">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <div data-testid="text-telegram-name" className="truncate text-sm font-bold">{displayName(user)}</div>
          <div data-testid="text-telegram-username" className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">@{user.username ?? 'telegram_user'}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[hsl(155_39%_40%)]"><BadgeCheck size={15} /> {isDemo ? copy.demoData : copy.fromTelegram}</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
        <div className="rise-in"><BalanceCard wallet={wallet} /></div>
        <div className="rise-in delay-1 rounded-[1.65rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <div><div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{copy.dailyProgress}</div><div data-testid="text-daily-progress" className="mt-2 text-2xl font-bold">{formatNumber(done)} <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">{isArabic ? 'من' : 'of'} {formatNumber(possible)} {copy.tasksCount}</span></div></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(12_73%_65%/.13)] text-[hsl(12_73%_65%)]"><BarChart3 size={19} /></div>
          </div>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div data-testid="progress-daily" className="progress-sweep h-full rounded-full bg-[hsl(12_73%_65%)]" style={{ width: `${Math.max(completion, 3)}%` }} /></div>
          <div className="mt-3 flex justify-between text-[11px] text-[hsl(var(--muted-foreground))]"><span>{completion === 0 ? copy.startSmall : completion === 100 ? copy.allTasksDone : copy.onTrack}</span><span data-testid="text-daily-percentage" className="font-mono">{formatNumber(completion)}%</span></div>
          <div className="mt-6 flex items-center gap-2 border-t border-[hsl(var(--border))] pt-4 text-xs text-[hsl(var(--muted-foreground))]"><ShieldCheck size={15} className="text-[hsl(155_39%_40%)]" /> {copy.dailyLimitClear}</div>
        </div>
      </div>
       <div className="mt-10 flex items-end justify-between"><div><div className="mb-2 text-xs font-bold tracking-[.08em] text-[hsl(34_75%_42%)]">{copy.todayChoices}</div><h2 className="text-2xl font-bold text-[hsl(196_41%_17%)]">{copy.simpleTasks}</h2></div><Link href="/tasks" data-testid="link-all-tasks" className="flex items-center gap-1 text-xs font-bold text-[hsl(34_75%_42%)]">{copy.allTasks} <ChevronLeft size={15} /></Link></div>
      <div className="mt-4 space-y-3">
        {tasks.slice(0, 2).map((task) => <TaskCard key={task.id} task={task} onStart={onStart} verification={verification} onVerify={onVerify} onCancel={onCancel} />)}
      </div>
    </div>
  );
}

function TasksPage({ tasks, verification, onStart, onVerify, onCancel }: { tasks: Task[]; verification: { taskId: string; phase: 'waiting' | 'ready' } | null; onStart: (task: Task) => void; onVerify: () => void; onCancel: () => void }) {
  const completeCount = tasks.filter((task) => task.completedToday >= task.dailyLimit).length;
  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.pageTasksEyebrow} title={copy.pageTasksTitle} description={copy.pageTasksDescription} />
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[hsl(39_94%_62%/.36)] bg-[hsl(39_94%_62%/.1)] px-4 py-3 text-xs"><span className="flex items-center gap-2 font-semibold text-[hsl(34_64%_34%)]"><Zap size={15} /> {formatNumber(completeCount)} {isArabic ? 'من' : 'of'} {formatNumber(tasks.length)} {copy.completedToday}</span><span className="text-[hsl(34_75%_42%)]">{copy.resetsDaily}</span></div>
      <div className="space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} onStart={onStart} verification={verification} onVerify={onVerify} onCancel={onCancel} />)}</div>
       <div data-testid="status-task-rules" className="mt-7 flex gap-3 rounded-2xl bg-[hsl(190_43%_20%)] p-5 text-[hsl(42_38%_96%)]"><LockKeyhole className="mt-0.5 shrink-0 text-[hsl(39_94%_62%)]" size={18} /><div><div className="text-sm font-bold">{copy.whyLimits}</div><p className="mt-1 text-xs leading-6 text-[hsl(42_20%_76%)]">{copy.limitsDescription}</p></div></div>
    </div>
  );
}

function WalletPage({ wallet, onWithdraw }: { wallet: Wallet; onWithdraw: (amount: number) => void }) {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitWithdrawal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 1) {
      setError(copy.withdrawalMinError);
      setSuccess('');
      return;
    }
    if (numericAmount > wallet.balance) {
      setError(copy.withdrawalBalanceError);
      setSuccess('');
      return;
    }
    if (address.trim().length < 10 || !/^[UE]/i.test(address.trim())) {
      setError(copy.withdrawalAddressError);
      setSuccess('');
      return;
    }
    onWithdraw(numericAmount);
    setAmount('');
    setAddress('');
    setError('');
    setSuccess(copy.withdrawalSuccess);
  };

  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.walletEyebrow} title={copy.walletTitle} description={copy.walletDescription} />
      <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[1.65rem] bg-[hsl(190_43%_20%)] p-7 text-[hsl(42_38%_96%)] shadow-[0_18px_40px_hsl(190_43%_20%/.16)] sm:p-9">
          <div className="flex items-center gap-2 text-sm text-[hsl(42_20%_76%)]"><WalletCards size={17} className="text-[hsl(39_94%_62%)]" />{copy.walletBalance}</div>
           <div data-testid="text-wallet-page-balance" className="mt-5 font-mono text-5xl font-bold tracking-[-.08em]">{formatNumber(wallet.balance, 3)} <span className="font-sans text-sm font-normal tracking-normal text-[hsl(42_20%_76%)]">USDT</span></div>
           <div className="mt-8 flex items-center gap-2 text-xs text-[hsl(42_20%_76%)]"><Coins size={15} className="text-[hsl(39_94%_62%)]" />{copy.tonNetwork} · USDT</div>
        </section>
        <section className="rounded-[1.65rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.76)] p-6 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-bold">{copy.withdrawalTitle}</h2><p className="mt-1 text-xs leading-6 text-[hsl(var(--muted-foreground))]">{copy.withdrawalDescription}</p></div>
            <Banknote size={22} className="text-[hsl(34_75%_42%)]" />
          </div>
          {success && <div data-testid="status-withdrawal-success" className="mb-4 rounded-xl bg-[hsl(155_39%_46%/.12)] p-3 text-xs font-semibold leading-6 text-[hsl(155_39%_32%)]">{success}</div>}
          <form onSubmit={submitWithdrawal} data-testid="form-withdrawal" className="space-y-4">
            <label className="block text-xs font-semibold">
              <span className="mb-2 block">{copy.amountLabel}</span>
              <input data-testid="input-withdrawal-amount" type="number" min="1" step="0.01" placeholder={copy.amountPlaceholder} value={amount} onChange={(event) => setAmount(event.target.value)} className="h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 font-mono text-sm outline-none transition focus:border-[hsl(39_94%_62%)]" />
               <span className="mt-1.5 block text-[11px] font-normal text-[hsl(var(--muted-foreground))]">{copy.walletBalance}: {formatUsdt(wallet.balance)}</span>
            </label>
            <label className="block text-xs font-semibold">
              <span className="mb-2 block">{copy.tonAddressLabel}</span>
              <input data-testid="input-ton-address" type="text" dir="ltr" autoComplete="off" placeholder={copy.tonAddressPlaceholder} value={address} onChange={(event) => setAddress(event.target.value)} className="h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-left text-sm outline-none transition focus:border-[hsl(39_94%_62%)]" />
            </label>
            {error && <p data-testid="status-withdrawal-error" role="alert" className="rounded-xl bg-[hsl(12_73%_65%/.12)] p-3 text-xs font-semibold leading-6 text-[hsl(12_66%_42%)]">{error}</p>}
            <button type="submit" data-testid="button-submit-withdrawal" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(39_94%_62%)] px-4 text-sm font-bold text-[hsl(196_41%_17%)] transition hover:bg-[hsl(39_94%_68%)]"><Banknote size={17} />{copy.submitWithdrawal}</button>
          </form>
        </section>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
         <div data-testid="stat-today-earned" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] p-5"><div className="text-xs text-[hsl(var(--muted-foreground))]">{copy.today}</div><div className="mt-3 font-mono text-2xl font-bold text-[hsl(34_75%_42%)]">+{formatUsdt(wallet.todayEarned)}</div></div>
         <div data-testid="stat-total-earned" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] p-5"><div className="text-xs text-[hsl(var(--muted-foreground))]">{copy.total}</div><div className="mt-3 font-mono text-2xl font-bold text-[hsl(196_41%_17%)]">{formatUsdt(wallet.totalEarned)}</div></div>
        <div data-testid="stat-streak" className="col-span-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] p-5 sm:col-span-1"><div className="text-xs text-[hsl(var(--muted-foreground))]">{copy.streak}</div><div className="mt-3 flex items-center gap-2 font-mono text-2xl font-bold text-[hsl(12_73%_65%)]">{formatNumber(wallet.streak)} <span className="font-sans text-xs font-normal text-[hsl(var(--muted-foreground))]">{copy.days}</span></div></div>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] p-4 text-xs leading-6 text-[hsl(var(--muted-foreground))]"><ShieldCheck size={18} className="shrink-0 text-[hsl(155_39%_40%)]" /><span>{copy.walletNote}</span></div>
    </div>
  );
}

function WithdrawalHistoryPage() {
  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.historyEyebrow} title={copy.historyTitle} description={copy.historyDescription} />
      <section className="overflow-hidden rounded-[1.65rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)]">
        <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(155_39%_46%/.12)] text-[hsl(155_39%_35%)]"><Banknote size={18} /></span>
          <div>
            <h2 className="text-sm font-bold">{copy.nav.history}</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{isArabic ? 'خمسة سجلات وهمية للعرض' : 'Five sample records for display'}</p>
          </div>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {withdrawalRecords.map((record) => (
            <div key={record.id} data-testid={`withdrawal-record-${record.id}`} className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(190_43%_20%)] text-xs font-bold text-[hsl(39_94%_62%)]">
                {record.user.replace('@', '').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{record.user}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"><Clock3 size={12} />{record.time}</div>
              </div>
              <div className="text-left">
                <div className="font-mono text-sm font-bold text-[hsl(155_39%_35%)]">+{formatUsdt(record.amount)}</div>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-[hsl(155_39%_35%)]"><BadgeCheck size={12} />{copy.withdrawalCompleted}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HelpPage({ user, isDemo }: { user: TelegramUser; isDemo: boolean }) {
  const [open, setOpen] = useState<string | null>('telegram');
  const items = [
    { id: 'telegram', icon: ShieldCheck, title: copy.helpTelegramTitle, text: copy.helpTelegramText },
    { id: 'limits', icon: Clock3, title: copy.helpLimitsTitle, text: copy.helpLimitsText },
    { id: 'rules', icon: BadgeCheck, title: copy.helpRulesTitle, text: copy.helpRulesText },
  ];
  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.helpEyebrow} title={copy.helpTitle} description={copy.helpDescription} />
      {isDemo && <div data-testid="status-help-demo" className="mb-5 flex gap-3 rounded-2xl border border-[hsl(39_94%_62%/.4)] bg-[hsl(39_94%_62%/.1)] p-4 text-xs leading-6 text-[hsl(34_64%_34%)]"><Info size={17} className="mt-1 shrink-0" />{copy.demoMessage}</div>}
      <div className="space-y-3">
        {items.map(({ id, icon: ItemIcon, title, text }) => {
          const isOpen = open === id;
          return <div key={id} className={`rounded-2xl border bg-[hsl(var(--card)/.72)] transition ${isOpen ? 'border-[hsl(39_94%_62%/.55)]' : 'border-[hsl(var(--border))]'}`}>
            <button type="button" data-testid={`button-help-${id}`} onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-center gap-3 p-5 text-right"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(190_43%_20%/.1)] text-[hsl(190_43%_20%)]"><ItemIcon size={17} /></span><span className="flex-1 text-sm font-bold">{title}</span><ChevronLeft size={17} className={`transition-transform ${isOpen ? '-rotate-90' : ''}`} /></button>
            {isOpen && <p data-testid={`text-help-answer-${id}`} className="px-5 pb-5 pr-[4.25rem] text-xs leading-7 text-[hsl(var(--muted-foreground))]">{text}</p>}
          </div>;
        })}
      </div>
       <div className="mt-8 rounded-2xl bg-[hsl(12_73%_65%/.1)] p-5"><div className="flex items-center gap-2 text-sm font-bold text-[hsl(12_66%_45%)]"><HelpCircle size={18} /> {copy.helpNeed}</div><p className="mt-2 text-xs leading-6 text-[hsl(var(--muted-foreground))]">{copy.helpNeedText}</p></div>
    </div>
  );
}

function RouterContent() {
  const { user, isDemo } = useMemo(getTelegramUser, []);
  const rewardly = useRewardlyState();
  const { tasks, wallet, verification, startTask, completeTask, setVerification, requestWithdrawal } = rewardly;
  const verifyActive = () => {
    if (verification) completeTask(verification.taskId);
  };
  return (
    <Shell user={user} isDemo={isDemo} wallet={wallet}>
      <Switch>
        <Route path="/">
          <HomePage user={user} isDemo={isDemo} tasks={tasks} wallet={wallet} verification={verification} onStart={startTask} onVerify={verifyActive} onCancel={() => setVerification(null)} />
        </Route>
        <Route path="/tasks">
          <TasksPage tasks={tasks} verification={verification} onStart={startTask} onVerify={verifyActive} onCancel={() => setVerification(null)} />
        </Route>
        <Route path="/wallet"><WalletPage wallet={wallet} onWithdraw={requestWithdrawal} /></Route>
        <Route path="/withdrawals"><WithdrawalHistoryPage /></Route>
        <Route path="/help"><HelpPage user={user} isDemo={isDemo} /></Route>
        <Route>
          <div className="py-20 text-center"><h1 className="text-3xl font-bold">{locale === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}</h1><Link href="/" data-testid="link-not-found-home" className="mt-5 inline-flex rounded-xl bg-[hsl(190_43%_20%)] px-5 py-3 text-sm font-bold text-white">{copy.nav.home}</Link></div>
        </Route>
      </Switch>
    </Shell>
  );
}

function App() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
    document.documentElement.lang = locale;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ErrorBoundary>
            <RouterContent />
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;