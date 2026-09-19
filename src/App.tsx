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
  rewardMax?: number;
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

type PublicWithdrawalRecord = {
  id: string;
  name: string;
  avatar: string;
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
    nav: { home: 'الرئيسية', tasks: 'المهمات', ads: 'الإعلانات', wallet: 'المحفظة', history: 'السجل', help: 'كيف تعمل؟' },
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
    trustVerified: 'خطوات واضحة',
    trustLimit: 'حد يومي ثابت',
    trustPrivacy: 'خصوصيتك أولاً',
    todayChoices: 'اختيارات اليوم',
    simpleTasks: 'إعلانات Adsgram اليومية',
    allTasks: 'كل المهام',
    adsToday: 'إعلانات Adsgram اليوم',
    pageTasksEyebrow: 'مساحة المهام',
    pageTasksTitle: 'اختر ما يناسبك.',
    pageTasksDescription: 'مهام يومية قليلة وواضحة. لا نطلب منك أكثر مما هو مكتوب.',
    moreTasksNote: 'مزيد من المهام ستظهر هنا.',
    adsPageEyebrow: 'إعلانات Adsgram',
    adsPageTitle: 'شاهد الإعلان واحصل على مكافأتك.',
    adsPageDescription: 'إعلان يومي واضح، مع حد أقصى ومكافأة ظاهرة قبل البدء.',
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
    myHistoryTitle: 'سجل سحوباتك',
    noUserWithdrawals: 'لا توجد لديك عمليات سحب حتى الآن.',
    publicHistoryTitle: 'آخر المستخدمين الذين سحبوا',
     publicHistoryDescription: 'ملخص عام محدود للعرض فقط، من دون بيانات معاملات خاصة.',
     transactionUnavailable: 'transaction details are unavailable in display data',
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
    adLabel: 'إعلان قصير',
    channelReward: '+0.005 USDT',
    channelTask: 'تعرّف على قناة Urumfaucet',
    channelTaskDescription: 'انضم للقناة الرسمية لتصلك التحديثات.',
    channelCardEyebrow: 'تحديثات Rewardly',
    channelCardTitle: 'انضم إلى القناة الرسمية',
    channelCardDescription: 'تابع أخبار Rewardly والتنبيهات المهمة من الرابط الرسمي فقط.',
    channelCardMeta: 'رابط Telegram الرسمي',
    joinChannel: 'انضم للقناة',
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
    policyEyebrow: 'معلومات Rewardly',
    privacyTitle: 'سياسة الخصوصية',
    privacyDescription: 'نوضح هنا ما نستخدمه من بيانات Telegram وكيف نحافظ على خصوصية حسابك.',
    privacyBlocks: [
      ['البيانات التي نستخدمها', 'نستخدم الاسم والصورة وTelegram ID الذي يسمح به Telegram لعرض حسابك وربط المكافآت بحسابك فقط. لا نطلب محادثاتك أو جهات اتصالك.'],
      ['الرصيد والسجل', 'يظهر سجل السحوبات الخاص بك داخل حسابك فقط. لا نعرض عنوان محفظتك أو أي بيانات خاصة في السجل العام.'],
      ['الشفافية', 'يمكنك معرفة سبب إضافة المكافأة وحدودها اليومية من داخل التطبيق، ولا نعد بدخل مضمون.'],
    ],
    termsTitle: 'شروط الاستخدام',
    termsDescription: 'استخدام Rewardly يعني الموافقة على هذه القواعد الأساسية.',
    termsBlocks: [
      ['الاستخدام العادل', 'يسمح بحساب واحد لكل مستخدم. يمنع استخدام الأدوات الآلية أو محاولات تكرار المشاهدة أو التلاعب بالمكافآت.'],
      ['المكافآت', 'تضاف المكافأة بعد إكمال خطوة الإعلان والتحقق منها، وقد تخضع الطلبات للمراجعة قبل السحب.'],
      ['السحب', 'يجب إدخال عنوان TON صحيح، ويطبق الحد الأدنى الظاهر في صفحة المحفظة.'],
    ],
    rewardsPolicyTitle: 'سياسة المكافآت',
    rewardsPolicyDescription: 'قواعد بسيطة تشرح متى يظهر الرصيد وكيف تعمل الحدود اليومية.',
    rewardsPolicyBlocks: [
      ['متى يضاف الرصيد؟', 'لا يزداد الرصيد بمجرد الضغط على الزر. تتم إضافة المكافأة بعد اكتمال الإعلان وظهور حالة التحقق بنجاح.'],
      ['الحد اليومي', 'إعلانات Adsgram لها حد يومي واضح قدره 10 مرات، ويظهر العداد داخل بطاقة الإعلان.'],
      ['عند فشل التحقق', 'إذا لم تكتمل المشاهدة أو لم تصل نتيجة التحقق، لا تتم إضافة مكافأة.'],
    ],
    supportTitle: 'الدعم والمساعدة',
    supportDescription: 'نريد أن تكون كل خطوة مفهومة. استخدم القناة الرسمية لمتابعة التنبيهات واطلب المساعدة عند الحاجة.',
    supportBlocks: [
      ['قبل التواصل', 'تأكد من فتح Rewardly من داخل Telegram ومن إدخال عنوان TON يبدأ بـ U أو E عند طلب السحب.'],
      ['مشاكل الإعلان', 'إذا لم يكتمل الإعلان، أغلقه وحاول لاحقاً. لا تكرر المحاولة بشكل متواصل إذا لم تظهر نتيجة التحقق.'],
      ['التحديثات', 'ننشر التنبيهات والتغييرات المهمة عبر قناة Rewardly الرسمية.'],
    ],
  },
  en: {
    nav: { home: 'Home', tasks: 'Tasks', ads: 'Ads', wallet: 'Wallet', history: 'History', help: 'How it works' },
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
    trustVerified: 'Clear steps',
    trustLimit: 'Fixed daily limit',
    trustPrivacy: 'Privacy first',
    todayChoices: 'Today’s picks',
    simpleTasks: 'Daily Adsgram ads',
    allTasks: 'All tasks',
    adsToday: 'Adsgram ads today',
    pageTasksEyebrow: 'TASK SPACE',
    pageTasksTitle: 'Choose what fits.',
    pageTasksDescription: 'A few clear daily tasks. Nothing is hidden.',
    moreTasksNote: 'More tasks will appear here.',
    adsPageEyebrow: 'ADSGRAM ADS',
    adsPageTitle: 'Watch the ad and earn your reward.',
    adsPageDescription: 'One clear daily ad, with the limit and reward shown before you start.',
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
    myHistoryTitle: 'Your withdrawal history',
    noUserWithdrawals: 'You have no withdrawals yet.',
    publicHistoryTitle: 'Latest users who withdrew',
     publicHistoryDescription: 'A limited public display with no private transaction data.',
     transactionUnavailable: 'transaction details are unavailable in display data',
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
    adLabel: 'Short ad',
    channelReward: '+0.005 USDT',
    channelTask: 'Discover the Urumfaucet channel',
    channelTaskDescription: 'Join the official channel for updates.',
    channelCardEyebrow: 'REWARDLY UPDATES',
    channelCardTitle: 'Join the official channel',
    channelCardDescription: 'Follow Rewardly news and important updates from the official Telegram link.',
    channelCardMeta: 'Official Telegram link',
    joinChannel: 'Join channel',
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
    policyEyebrow: 'REWARDLY INFORMATION',
    privacyTitle: 'Privacy policy',
    privacyDescription: 'A clear summary of the Telegram data we use and how we protect your account.',
    privacyBlocks: [
      ['Data we use', 'We use the name, photo, and Telegram ID that Telegram makes available to display your account and connect rewards to your account. We do not request chats or contacts.'],
      ['Balance and history', 'Your private withdrawal history belongs to your account only. Wallet addresses and private details are not shown in the public feed.'],
      ['Transparency', 'Reward rules and daily limits are visible inside the app. Rewardly does not promise guaranteed income.'],
    ],
    termsTitle: 'Terms of use',
    termsDescription: 'Using Rewardly means agreeing to these basic rules.',
    termsBlocks: [
      ['Fair use', 'One account per user is allowed. Automated tools, repeated view attempts, and reward manipulation are not allowed.'],
      ['Rewards', 'Rewards are added after the ad step is completed and verified. Requests may be reviewed before withdrawal.'],
      ['Withdrawals', 'Use a valid TON address and follow the minimum shown on the wallet page.'],
    ],
    rewardsPolicyTitle: 'Reward policy',
    rewardsPolicyDescription: 'Simple rules explaining when your balance changes and how daily limits work.',
    rewardsPolicyBlocks: [
      ['When does the balance change?', 'Pressing the button is not enough. A reward is added only after the ad is completed and verification succeeds.'],
      ['Daily limit', 'Adsgram ads have a clear daily limit of 10 views, shown inside the ad card.'],
      ['When verification fails', 'If the view is incomplete or no verification result arrives, no reward is added.'],
    ],
    supportTitle: 'Support',
    supportDescription: 'Every step should be understandable. Use the official channel for updates and ask for help when needed.',
    supportBlocks: [
      ['Before contacting support', 'Open Rewardly from Telegram and use a TON address that starts with U or E when requesting a withdrawal.'],
      ['Ad issues', 'If an ad does not complete, close it and try again later. Do not repeatedly retry when no verification result appears.'],
      ['Updates', 'Important changes and notices are shared through the official Rewardly Telegram channel.'],
    ],
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
const CHANNEL_URL = 'https://t.me/Urumfaucet';

const initialTasks: Task[] = [
  {
    id: 'adsgram-daily',
    kind: 'ad',
    provider: 'Adsgram',
    title: copy.adTask,
    description: copy.adTaskDescription,
    reward: 0.002,
    dailyLimit: 10,
    completedToday: 0,
    duration: 30,
    status: 'available',
  },
];

const initialWallet: Wallet = {
  balance: 0,
  todayEarned: 0,
  totalEarned: 0,
  streak: 0,
};

function faceImage(background: string, skin: string, hair: string, shirt: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${background}"/><path d="M20 96c2-19 13-29 28-29s26 10 28 29" fill="${shirt}"/><ellipse cx="48" cy="45" rx="21" ry="25" fill="${skin}"/><path d="M27 43c-1-19 8-30 22-30 16 0 25 11 21 31-4-9-11-13-20-14-8 9-14 12-23 13Z" fill="${hair}"/><circle cx="40" cy="47" r="2" fill="#26343a"/><circle cx="56" cy="47" r="2" fill="#26343a"/><path d="M42 59c4 3 8 3 12 0" fill="none" stroke="#9b5e56" stroke-width="2" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const publicWithdrawalRecords: PublicWithdrawalRecord[] = [
  { id: 'public-1', name: 'Sarah Morgan', avatar: faceImage('#d8ece9', '#f0bd91', '#59433f', '#35666b'), amount: 2.5, time: isArabic ? 'منذ 12 دقيقة' : '12 minutes ago' },
  { id: 'public-2', name: 'Omar Khalid', avatar: faceImage('#f2dfc8', '#a96d4c', '#211d22', '#c26a4a'), amount: 1.75, time: isArabic ? 'منذ 38 دقيقة' : '38 minutes ago' },
  { id: 'public-3', name: 'Lina Yusuf', avatar: faceImage('#e7e0f2', '#d79a75', '#332b3d', '#735f9d'), amount: 4, time: isArabic ? 'منذ ساعة' : '1 hour ago' },
  { id: 'public-4', name: 'Adam Rami', avatar: faceImage('#f0e4c2', '#c98962', '#49372d', '#4d6c68'), amount: 1.2, time: isArabic ? 'منذ ساعتين' : '2 hours ago' },
  { id: 'public-5', name: 'Nour Ali', avatar: faceImage('#dce8f0', '#dca17e', '#4b3039', '#a36e5f'), amount: 3.25, time: isArabic ? 'منذ 3 ساعات' : '3 hours ago' },
];

type StoredState = {
  day: string;
  tasks: Task[];
  wallet: Wallet;
  userWithdrawals?: WithdrawalRecord[];
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

function loadState(storageKey = STORAGE_KEY): { tasks: Task[]; wallet: Wallet; userWithdrawals: WithdrawalRecord[] } {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as StoredState | null;
    if (saved?.day === todayKey() && saved.tasks && saved.wallet) {
      const savedAdsgramTask = saved.tasks.find((task) => task.id === 'adsgram-daily');
      const tasks = savedAdsgramTask
        ? [{ ...initialTasks[0], ...savedAdsgramTask, dailyLimit: 10, reward: 0.002, rewardMax: undefined }]
        : initialTasks;
      return { tasks, wallet: saved.wallet, userWithdrawals: saved.userWithdrawals ?? [] };
    }
  } catch {
    // localStorage is optional in Telegram webviews.
  }
  return { tasks: initialTasks, wallet: initialWallet, userWithdrawals: [] };
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

function formatReward(task: Task) {
  return task.rewardMax
    ? `${formatNumber(task.reward, 3)}–${formatNumber(task.rewardMax, 3)} USDT`
    : formatUsdt(task.reward);
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

function openOfficialChannel() {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(CHANNEL_URL);
    return;
  }
  window.open(CHANNEL_URL, '_blank', 'noopener,noreferrer');
}

function useRewardlyState(userId: number) {
  const storageKey = `${STORAGE_KEY}-${userId}`;
  const [state, setState] = useState(() => loadState(storageKey));
  const [verification, setVerification] = useState<{ taskId: string; phase: 'waiting' } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...state, day: todayKey() }));
    } catch {
      // App remains usable if storage is blocked.
    }
  }, [state, storageKey]);

  const completeTask = (taskId: string) => {
    setState((current) => {
      const target = current.tasks.find((task) => task.id === taskId);
      if (!target || target.completedToday >= target.dailyLimit) return current;
      const reward = target.rewardMax
        ? Number((target.reward + Math.random() * (target.rewardMax - target.reward)).toFixed(3))
        : target.reward;
      return {
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? { ...task, completedToday: task.completedToday + 1, status: task.completedToday + 1 >= task.dailyLimit ? 'completed' : 'available' }
            : task,
        ),
        wallet: {
          ...current.wallet,
          balance: current.wallet.balance + reward,
          todayEarned: current.wallet.todayEarned + reward,
          totalEarned: current.wallet.totalEarned + reward,
        },
        userWithdrawals: current.userWithdrawals,
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
           userWithdrawals: [
             ...current.userWithdrawals,
             {
               id: `my-withdrawal-${Date.now()}`,
               user: isArabic ? 'أنت' : 'You',
               amount,
               time: isArabic ? 'الآن' : 'Just now',
             },
           ],
        });
  };

  const startTask = (task: Task) => {
    if (verification) return;
    if (task.completedToday >= task.dailyLimit) return;
    if (task.kind === 'channel') {
      const webApp = window.Telegram?.WebApp;
      if (task.channelUrl) {
        if (webApp?.openTelegramLink) webApp.openTelegramLink(task.channelUrl);
        else window.open(task.channelUrl, '_blank', 'noopener,noreferrer');
      }
      setVerification({ taskId: task.id, phase: 'waiting' });
      window.setTimeout(() => completeTask(task.id), 2200);
      return;
    }
    setVerification({ taskId: task.id, phase: 'waiting' });
      window.setTimeout(() => completeTask(task.id), 2000);
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
    { href: '/tasks', label: copy.nav.tasks, icon: BadgeCheck },
    { href: '/ads', label: copy.nav.ads, icon: Zap },
    { href: '/wallet', label: copy.nav.wallet, icon: WalletCards },
    { href: '/withdrawals', label: copy.nav.history, icon: Clock3 },
    { href: '/help', label: copy.nav.help, icon: CircleHelp },
  ];

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenuOnScroll = () => setMenuOpen(false);
    window.addEventListener('scroll', closeMenuOnScroll, { passive: true });
    return () => window.removeEventListener('scroll', closeMenuOnScroll);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

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
            <button type="button" aria-label={copy.openMenu} aria-expanded={menuOpen} aria-controls="mobile-nav-menu" data-testid="button-open-menu" onClick={() => setMenuOpen((open) => !open)} className="rounded-full p-2.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] sm:hidden">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/wallet" data-testid="link-avatar-header"><Avatar user={user} /></Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div id="mobile-nav-menu" className="fixed inset-x-4 top-[5rem] z-50 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl sm:hidden">
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
        <div className="mx-auto flex max-w-lg items-center justify-between gap-1">
          {navItems.map(({ href, label, icon: NavIcon }) => (
            <Link key={href} href={href} data-testid={`bottom-nav-${href === '/' ? 'home' : href.slice(1)}`} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] ${location === href ? 'font-bold text-[hsl(190_43%_20%)]' : 'text-[hsl(var(--muted-foreground))]'}`}>
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
    <div className="balance-card relative overflow-hidden rounded-[1.65rem] p-6 text-[hsl(42_38%_96%)] shadow-[0_18px_40px_hsl(190_43%_20%/.2)] sm:p-8">
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

function TaskCard({ task, onStart, verification }: { task: Task; onStart: (task: Task) => void; verification: { taskId: string; phase: 'waiting' } | null }) {
  const limitReached = task.completedToday >= task.dailyLimit;
  const active = verification?.taskId === task.id;
  const blocked = Boolean(verification && !active);
  const progress = task.dailyLimit ? Math.round((task.completedToday / task.dailyLimit) * 100) : 0;
  return (
    <div data-testid={`card-task-${task.id}`} className={`ads-task-card task-row relative overflow-hidden rounded-[1.45rem] border bg-[hsl(var(--card)/.88)] p-5 ${active ? 'border-[hsl(39_94%_62%/.75)] shadow-[0_12px_32px_hsl(39_94%_62%/.14)]' : 'border-[hsl(var(--border))]'} ${blocked ? 'opacity-60' : ''}`}>
      <div className="ads-task-glow absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[hsl(39_94%_62%/.12)] blur-3xl" />
      <div className="relative flex items-start gap-3.5">
        <div className="ads-task-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(190_43%_20%)] text-[hsl(39_94%_62%)] shadow-[0_8px_18px_hsl(190_43%_20%/.16)]">
          <Play size={19} fill="currentColor" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold tracking-[.06em] text-[hsl(34_75%_42%)]">{copy.adLabel}</span>
                {task.provider && <span className="rounded-full bg-[hsl(190_43%_20%/.1)] px-2 py-0.5 text-[10px] font-bold text-[hsl(190_43%_20%)]">{task.provider}</span>}
              </div>
              <h3 data-testid={`text-task-title-${task.id}`} className="truncate text-base font-bold text-[hsl(196_41%_17%)]">{task.title}</h3>
            </div>
            <span data-testid={`text-task-reward-${task.id}`} className="shrink-0 rounded-xl bg-[hsl(39_94%_62%/.2)] px-2.5 py-1.5 text-center font-mono text-[10px] font-bold leading-3 text-[hsl(34_75%_42%)]">+{formatReward(task)}</span>
          </div>
          <p data-testid={`text-task-description-${task.id}`} className="mt-2 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{task.description}</p>
        </div>
      </div>
      <div className="relative mt-5">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1.5"><Clock3 size={13} />{task.duration} {copy.seconds}</span>
          <span data-testid={`text-task-limit-${task.id}`} className="font-mono">{formatNumber(task.completedToday)} / {formatNumber(task.dailyLimit)} {copy.today}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(190_43%_20%/.1)]"><div className="ads-task-progress h-full rounded-full bg-[hsl(39_94%_62%)] transition-[width] duration-500" style={{ width: `${Math.max(progress, progress > 0 ? 4 : 2)}%` }} /></div>
      </div>
      <div className="relative mt-5 flex items-center justify-between gap-3">
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{copy.resetsDaily}</span>
        {active ? (
          <button type="button" disabled data-testid={`button-start-task-${task.id}`} className="flex min-h-11 cursor-wait items-center gap-2 rounded-xl bg-[hsl(39_94%_62%/.22)] px-4 text-xs font-bold text-[hsl(34_75%_42%)]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(39_94%_62%/.35)] border-t-[hsl(34_75%_42%)]" />
            <span data-testid={`status-task-verifying-${task.id}`}>{isArabic ? 'جاري التحقق' : 'Verifying'}</span>
          </button>
        ) : limitReached ? (
          <span data-testid={`status-task-completed-${task.id}`} className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-[hsl(155_39%_40%)]"><BadgeCheck size={16} />{copy.completed}</span>
        ) : (
          <button type="button" disabled={blocked} data-testid={`button-start-task-${task.id}`} onClick={() => onStart(task)} className="flex min-h-11 items-center gap-2 rounded-xl bg-[hsl(190_43%_20%)] px-4 text-xs font-bold text-[hsl(42_38%_96%)] transition hover:-translate-y-0.5 hover:bg-[hsl(190_43%_25%)] active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            {task.kind === 'ad' ? copy.startNow : copy.openChannel} <ArrowLeft size={14} />
          </button>
        )}
      </div>
      {active && (
        <div data-testid={`panel-verification-${task.id}`} className="mt-4 border-t border-[hsl(var(--border))] pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-[hsl(39_94%_62%/.12)] p-3 text-xs leading-5 text-[hsl(34_64%_34%)]">
            <div className="h-4 w-4 animate-pulse rounded-full bg-[hsl(39_94%_62%)]" />
            <span>{task.kind === 'channel' ? (isArabic ? 'جاري التحقق من الانضمام...' : 'Checking your channel join...') : copy.demoAdWaiting}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, label: copy.trustVerified },
    { icon: Clock3, label: copy.trustLimit },
    { icon: LockKeyhole, label: copy.trustPrivacy },
  ];
  return (
    <div className="trust-strip mt-3 grid gap-2 sm:grid-cols-3" aria-label={copy.helpEyebrow}>
      {items.map(({ icon: TrustIcon, label }) => (
        <div key={label} className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.62)] px-3 py-2.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
          <TrustIcon size={15} className="text-[hsl(155_39%_40%)]" />
          {label}
        </div>
      ))}
    </div>
  );
}

function ChannelJoinCard() {
  return (
    <section data-testid="card-channel-join" className="channel-card relative mt-4 flex h-[50px] items-center gap-3 overflow-hidden rounded-2xl bg-[hsl(190_43%_20%)] px-3 text-[hsl(42_38%_96%)] shadow-[0_12px_26px_hsl(190_43%_20%/.16)]">
      <div className="absolute -left-8 -top-12 h-28 w-28 rounded-full border border-[hsl(39_94%_62%/.2)]" />
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[hsl(39_94%_62%/.3)] bg-[hsl(39_94%_62%/.13)] text-[hsl(39_94%_62%)]">
        <ArrowUpLeft size={16} />
      </div>
      <div className="relative min-w-0 flex-1">
        <h3 className="truncate text-xs font-bold">{copy.channelCardTitle}</h3>
        <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[hsl(42_20%_76%)]">
          <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-[hsl(155_58%_67%)]" />{copy.channelCardMeta}</span>
          <span className="font-mono font-bold text-[hsl(39_94%_62%)]">{copy.channelReward}</span>
        </div>
      </div>
      <button type="button" data-testid="button-join-channel" onClick={openOfficialChannel} className="relative inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[hsl(39_94%_62%)] px-3 py-2 text-[10px] font-bold text-[hsl(196_41%_17%)] transition hover:bg-[hsl(39_94%_70%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(39_94%_62%)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(190_43%_20%)]">
        {copy.joinChannel}
        <ArrowLeft size={12} />
      </button>
    </section>
  );
}

function HomePage({ user, isDemo, tasks, wallet }: { user: TelegramUser; isDemo: boolean; tasks: Task[]; wallet: Wallet }) {
  const adsgramTask = tasks.find((task) => task.id === 'adsgram-daily');
  const done = adsgramTask?.completedToday ?? 0;
  const possible = adsgramTask?.dailyLimit ?? 10;
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
       <div className="mb-6">
         <div data-testid="card-telegram-profile" className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] px-4 py-3">
           <Avatar user={user} />
           <div className="min-w-0 flex-1">
             <div data-testid="text-telegram-name" className="truncate text-sm font-bold">{displayName(user)}</div>
             <div data-testid="text-telegram-username" className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">@{user.username ?? 'telegram_user'}</div>
           </div>
           <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-[hsl(155_39%_40%)]"><BadgeCheck size={15} /> {isDemo ? copy.demoData : copy.fromTelegram}</div>
         </div>
         <TrustStrip />
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
    </div>
  );
}

function TasksPage() {
  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.pageTasksEyebrow} title={copy.pageTasksTitle} description={copy.pageTasksDescription} />
      <ChannelJoinCard />
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
        <Sparkles size={15} className="shrink-0 text-[hsl(34_75%_42%)]" />
        {copy.moreTasksNote}
      </div>
    </div>
  );
}

function AdsPage({ tasks, verification, onStart }: { tasks: Task[]; verification: { taskId: string; phase: 'waiting' } | null; onStart: (task: Task) => void }) {
  const adsgramTask = tasks.find((task) => task.id === 'adsgram-daily');
  const completeCount = adsgramTask?.completedToday ?? 0;
  const dailyLimit = adsgramTask?.dailyLimit ?? 10;
  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.adsPageEyebrow} title={copy.adsPageTitle} description={copy.adsPageDescription} />
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[hsl(39_94%_62%/.36)] bg-[hsl(39_94%_62%/.1)] px-4 py-3 text-xs"><span className="flex items-center gap-2 font-semibold text-[hsl(34_64%_34%)]"><Zap size={15} /> {formatNumber(completeCount)} {isArabic ? 'من' : 'of'} {formatNumber(dailyLimit)} {copy.adsToday}</span><span className="text-[hsl(34_75%_42%)]">{copy.resetsDaily}</span></div>
      <div className="space-y-3">{tasks.filter((task) => task.kind === 'ad').map((task) => <TaskCard key={task.id} task={task} onStart={onStart} verification={verification} />)}</div>
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

function WithdrawalHistoryPage({ userWithdrawals }: { userWithdrawals: WithdrawalRecord[] }) {
  const [detailNotice, setDetailNotice] = useState<string | null>(null);
  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.historyEyebrow} title={copy.historyTitle} description={copy.historyDescription} />
      <section data-testid="card-my-withdrawal-history" className="overflow-hidden rounded-[1.65rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)]">
        <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(155_39%_46%/.12)] text-[hsl(155_39%_35%)]"><Banknote size={18} /></span>
          <div>
            <h2 className="text-sm font-bold">{copy.myHistoryTitle}</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{isArabic ? 'هذا السجل خاص بحسابك فقط.' : 'This history belongs to your account only.'}</p>
          </div>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {userWithdrawals.length === 0 ? (
            <div data-testid="status-no-user-withdrawals" className="flex items-center gap-3 px-5 py-7 text-sm text-[hsl(var(--muted-foreground))]">
              <Info size={18} className="shrink-0 text-[hsl(34_75%_42%)]" />
              {copy.noUserWithdrawals}
            </div>
          ) : userWithdrawals.map((record) => (
            <div key={record.id} data-testid={`my-withdrawal-record-${record.id}`} className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(190_43%_20%)] text-xs font-bold text-[hsl(39_94%_62%)]">US</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{record.user}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"><Clock3 size={12} />{record.time}</div>
              </div>
              <div className="text-left font-mono text-sm font-bold text-[hsl(155_39%_35%)]">-{formatUsdt(record.amount)}</div>
            </div>
          ))}
        </div>
      </section>
      <section data-testid="card-public-withdrawal-history" className="mt-5 max-w-2xl overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)]">
        <div className="border-b border-[hsl(var(--border))] px-4 py-3">
          <h2 className="text-xs font-bold">{copy.publicHistoryTitle}</h2>
          <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{copy.publicHistoryDescription}</p>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
           {publicWithdrawalRecords.map((record) => (
            <div key={record.id} data-testid={`withdrawal-record-${record.id}`} className="flex items-center gap-2.5 px-4 py-2.5">
               <img src={record.avatar} alt={record.name} data-testid={`img-public-withdrawal-avatar-${record.id}`} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[hsl(39_94%_62%/.2)]" />
              <div className="min-w-0 flex-1">
                 <div data-testid={`text-public-withdrawal-name-${record.id}`} className="truncate text-xs font-semibold">{record.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]"><Clock3 size={10} />{record.time}</div>
              </div>
              <div className="text-left">
                <div className="font-mono text-xs font-bold text-[hsl(155_39%_35%)]">+{formatUsdt(record.amount)}</div>
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] font-semibold text-[hsl(155_39%_35%)]"><BadgeCheck size={10} />{copy.withdrawalCompleted}</div>
              </div>
               <button type="button" data-testid={`button-txd-${record.id}`} title={copy.transactionUnavailable} aria-label={copy.transactionUnavailable} onClick={() => setDetailNotice(record.id)} className="rounded-lg border border-[hsl(var(--border))] px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-[hsl(34_75%_42%)] transition hover:border-[hsl(39_94%_62%)] hover:bg-[hsl(39_94%_62%/.1)]">txd</button>
            </div>
          ))}
        </div>
         {detailNotice && <div data-testid="status-transaction-unavailable" className="border-t border-[hsl(var(--border))] px-4 py-3 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">{copy.transactionUnavailable}</div>}
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
       <div className="mt-5 grid gap-2 sm:grid-cols-2">
         {[
           { href: '/privacy', label: copy.privacyTitle, icon: ShieldCheck },
           { href: '/terms', label: copy.termsTitle, icon: LockKeyhole },
           { href: '/rewards', label: copy.rewardsPolicyTitle, icon: BadgeCheck },
           { href: '/support', label: copy.supportTitle, icon: HelpCircle },
         ].map(({ href, label, icon: PolicyIcon }) => (
           <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] px-4 py-3 text-xs font-bold transition hover:-translate-y-0.5 hover:border-[hsl(39_94%_62%/.55)] hover:bg-[hsl(39_94%_62%/.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
             <span className="flex items-center gap-2"><PolicyIcon size={15} className="text-[hsl(34_75%_42%)]" />{label}</span>
             <ChevronLeft size={15} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:-translate-x-0.5" />
           </Link>
         ))}
       </div>
    </div>
  );
}

type PolicyKind = 'privacy' | 'terms' | 'rewards' | 'support';

function PolicyPage({ kind }: { kind: PolicyKind }) {
  const content = {
    privacy: { title: copy.privacyTitle, description: copy.privacyDescription, blocks: copy.privacyBlocks },
    terms: { title: copy.termsTitle, description: copy.termsDescription, blocks: copy.termsBlocks },
    rewards: { title: copy.rewardsPolicyTitle, description: copy.rewardsPolicyDescription, blocks: copy.rewardsPolicyBlocks },
    support: { title: copy.supportTitle, description: copy.supportDescription, blocks: copy.supportBlocks },
  }[kind];

  return (
    <div className="screen-enter safe-bottom">
      <PageHeading eyebrow={copy.policyEyebrow} title={content.title} description={content.description} />
      <div className="space-y-3">
        {content.blocks.map(([title, text], index) => (
          <section key={title} className="policy-card rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-5" style={{ animationDelay: `${index * 70}ms` }}>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[hsl(39_94%_62%/.16)] text-[hsl(34_75%_42%)]">{index + 1}</span>
              <div>
                <h2 className="text-sm font-bold">{title}</h2>
                <p className="mt-2 text-xs leading-7 text-[hsl(var(--muted-foreground))]">{text}</p>
              </div>
            </div>
          </section>
        ))}
      </div>
      <Link href="/help" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[hsl(34_75%_42%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
        <ArrowLeft size={14} />
        {copy.nav.help}
      </Link>
    </div>
  );
}

function RouterContent() {
  const { user, isDemo } = useMemo(getTelegramUser, []);
  const rewardly = useRewardlyState(user.id);
  const { tasks, wallet, userWithdrawals, verification, startTask, requestWithdrawal } = rewardly;
  return (
    <Shell user={user} isDemo={isDemo} wallet={wallet}>
      <Switch>
        <Route path="/">
          <HomePage user={user} isDemo={isDemo} tasks={tasks} wallet={wallet} />
        </Route>
        <Route path="/tasks">
          <TasksPage />
        </Route>
        <Route path="/ads">
          <AdsPage tasks={tasks} verification={verification} onStart={startTask} />
        </Route>
        <Route path="/wallet"><WalletPage wallet={wallet} onWithdraw={requestWithdrawal} /></Route>
        <Route path="/withdrawals"><WithdrawalHistoryPage userWithdrawals={userWithdrawals} /></Route>
        <Route path="/help"><HelpPage user={user} isDemo={isDemo} /></Route>
        <Route path="/privacy"><PolicyPage kind="privacy" /></Route>
        <Route path="/terms"><PolicyPage kind="terms" /></Route>
        <Route path="/rewards"><PolicyPage kind="rewards" /></Route>
        <Route path="/support"><PolicyPage kind="support" /></Route>
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