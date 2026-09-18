import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Gift,
  Info,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';

type Activity = {
  id: string;
  title: string;
  description: string;
  reward: number;
  duration: string;
  icon: 'survey' | 'spark' | 'read';
};

type Withdrawal = {
  id: string;
  amount: number;
  method: string;
  destination: string;
  date: string;
  status: 'processing' | 'complete';
};

type RewardlyContextValue = {
  balance: number;
  completedActivityIds: string[];
  withdrawals: Withdrawal[];
  completeActivity: (activity: Activity) => void;
  requestWithdrawal: (amount: number, method: string, destination: string) => void;
};

const initialActivities: Activity[] = [
  {
    id: 'survey',
    title: 'استبيان قصير عن تجربة المستخدم',
    description: 'شارك رأيك في ثلاث أسئلة واضحة. لا توجد إجابات صحيحة أو خاطئة.',
    reward: 0.85,
    duration: 'دقيقتان',
    icon: 'survey',
  },
  {
    id: 'feature',
    title: 'جرّب تحديثاً جديداً',
    description: 'تعرّف على ميزة بسيطة وسجّل انطباعك عنها.',
    reward: 0.45,
    duration: 'دقيقة واحدة',
    icon: 'spark',
  },
  {
    id: 'community',
    title: 'اقرأ ملاحظة من المجتمع',
    description: 'محتوى خفيف يساعدنا على تحسين التجربة للجميع.',
    reward: 0.25,
    duration: '30 ثانية',
    icon: 'read',
  },
];

const initialWithdrawals: Withdrawal[] = [
  { id: 'w-1', amount: 12.5, method: 'محفظة رقمية', destination: '•••• 4821', date: '18 مايو 2024', status: 'complete' },
  { id: 'w-2', amount: 8.25, method: 'تحويل بنكي', destination: '•••• 1076', date: '04 مايو 2024', status: 'complete' },
  { id: 'w-3', amount: 5, method: 'محفظة رقمية', destination: '•••• 9304', date: '27 أبريل 2024', status: 'complete' },
];

const RewardlyContext = createContext<RewardlyContextValue | null>(null);

function useRewardly() {
  const value = useContext(RewardlyContext);
  if (!value) throw new Error('Rewardly context is unavailable');
  return value;
}

function formatAmount(amount: number) {
  return amount.toFixed(2);
}

function StartupScreen() {
  return (
    <div className="startup" dir="rtl" data-testid="startup-screen">
      <div className="startup-card">
        <div className="startup-mark" aria-hidden="true">R</div>
        <h1>Rewardly</h1>
        <p>مساحتك الهادئة للتقدّم الواضح</p>
        <div className="startup-lines" aria-label="جار التحميل">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

function Brand({ mobile = false }: { mobile?: boolean }) {
  return (
    <Link href="/" className={`brand ${mobile ? 'mobile-brand' : ''}`} data-testid="link-brand">
      <span className="brand-mark" aria-hidden="true">R</span>
      <span>
        <span className="brand-name">Rewardly</span>
        {!mobile && <span className="brand-caption">clear rewards</span>}
      </span>
    </Link>
  );
}

const navItems = [
  { href: '/', label: 'نظرة عامة', icon: CircleDollarSign, testId: 'link-nav-home' },
  { href: '/earn', label: 'اكسب اختيارياً', icon: Gift, testId: 'link-nav-earn' },
  { href: '/wallet', label: 'المحفظة', icon: WalletCards, testId: 'link-nav-wallet' },
  { href: '/proofs', label: 'إثباتات السحب', icon: FileCheck2, testId: 'link-nav-proofs' },
];

function Navigation({ bottom = false }: { bottom?: boolean }) {
  const [location] = useLocation();
  return (
    <nav className={bottom ? 'bottom-nav' : 'rail-nav'} aria-label="التنقل الرئيسي">
      {navItems.map(({ href, label, icon: Icon, testId }) => {
        const active = href === '/' ? location === '/' : location.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${bottom ? 'bottom-link' : 'nav-link'} ${active ? 'active' : ''}`}
            data-testid={testId}
            aria-current={active ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame app-noise" dir="rtl">
      <div className="app-shell">
        <aside className="desktop-rail">
          <Brand />
          <Navigation />
          <div className="rail-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <strong>واضح من البداية</strong>
            <p>الأنشطة اختيارية. لا نطلب النقر على الإعلانات، ووظائف المحفظة متاحة دائماً.</p>
          </div>
        </aside>
        <div className="main-column">
          <header className="topbar">
            <Brand mobile />
            <span className="telegram-pill"><Sparkles size={14} aria-hidden="true" /> Telegram Mini App</span>
            <span className="user-pill" data-testid="text-user-profile"><span className="user-avatar">م</span><span>مرحباً، مازن</span></span>
          </header>
          <main>{children}</main>
          <Navigation bottom />
        </div>
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
    </div>
  );
}

function Home() {
  const { balance } = useRewardly();
  return (
    <div className="page" data-testid="page-home">
      <PageHeader
        eyebrow="مساء الخير يا مازن"
        title="تقدّمك، في مكان واحد."
        subtitle="رصيد واضح، خطوات اختيارية، وسجل يمكن مراجعته في أي وقت. لا وعود كبيرة؛ فقط تفاصيل صريحة."
      />
      <div className="hero-grid">
        <section className="balance-card" data-testid="card-balance-overview">
          <div className="balance-top">
            <span className="balance-label">الرصيد المتاح الآن</span>
            <span className="balance-icon"><CircleDollarSign size={18} aria-hidden="true" /></span>
          </div>
          <div className="balance-amount" data-testid="text-balance-home">{formatAmount(balance)}</div>
          <div className="balance-currency">دولار أمريكي</div>
          <div className="balance-bottom">
            <span>الحد الأدنى للسحب 5.00 USD</span>
            <strong>جاهز للسحب</strong>
          </div>
        </section>
        <div className="quick-stack">
          <Link href="/earn" className="quick-card" data-testid="link-quick-earn">
            <span className="quick-card-main"><span className="quick-icon"><Gift size={18} aria-hidden="true" /></span><span><strong>نشاط اختياري</strong><span>أضف إلى رصيدك بهدوء</span></span></span>
            <ChevronLeft size={16} aria-hidden="true" />
          </Link>
          <Link href="/wallet" className="quick-card" data-testid="link-quick-wallet">
            <span className="quick-card-main"><span className="quick-icon coral"><Banknote size={18} aria-hidden="true" /></span><span><strong>اطلب سحباً</strong><span>من 5.00 USD فأكثر</span></span></span>
            <ChevronLeft size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="trust-strip" data-testid="status-transparency">
        <LockKeyhole size={17} aria-hidden="true" />
        <p><strong>تجربة بلا ضغط:</strong> يمكنك استخدام رصيدك ومحفظتك وإثباتات السحب دون إكمال أي نشاط إضافي.</p>
      </div>
      <div className="section-heading"><h2>كيف يعمل Rewardly؟</h2><p>ثلاث خطوات بسيطة</p></div>
      <div className="steps">
        <div className="step" data-testid="step-one"><span className="step-index">01</span><div><h3>راجع رصيدك</h3><p>تعرف على المتاح قبل اتخاذ أي قرار.</p></div></div>
        <div className="step" data-testid="step-two"><span className="step-index">02</span><div><h3>اختر إن رغبت</h3><p>الأنشطة المقترحة اختيارية ومحدودة.</p></div></div>
        <div className="step" data-testid="step-three"><span className="step-index">03</span><div><h3>اسحب بوضوح</h3><p>أرسل طلبك وتابع حالته من المحفظة.</p></div></div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: Activity['icon'] }) {
  if (type === 'survey') return <FileCheck2 size={20} aria-hidden="true" />;
  if (type === 'spark') return <Sparkles size={20} aria-hidden="true" />;
  return <Info size={20} aria-hidden="true" />;
}

function Earn() {
  const { balance, completedActivityIds, completeActivity } = useRewardly();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const startActivity = (activity: Activity) => {
    if (completedActivityIds.includes(activity.id) || busyId) return;
    setBusyId(activity.id);
    window.setTimeout(() => {
      completeActivity(activity);
      setBusyId(null);
      setNotice(`تمت إضافة ${formatAmount(activity.reward)} USD إلى رصيدك.`);
    }, 700);
  };

  return (
    <div className="page" data-testid="page-earn">
      <PageHeader
        eyebrow="مساحة اختيارية"
        title="أضف شيئاً، إن رغبت."
        subtitle="أنشطة قصيرة ومحدودة تساعدك على التقدم. لا نطلب مشاهدة إعلان أو النقر عليه للحصول على مكافأة."
      />
      <div className="earn-top" data-testid="card-earn-summary">
        <div><strong data-testid="text-earn-balance">{formatAmount(balance)}</strong><span>رصيدك الحالي · USD</span></div>
        <div className="earn-rule" />
        <div><strong>{completedActivityIds.length} / {initialActivities.length}</strong><span>أنشطة مكتملة اليوم</span></div>
      </div>
      {notice && <div className="form-success" style={{ marginTop: 12 }} data-testid="status-activity-success"><Check size={16} aria-hidden="true" /><span>{notice}</span></div>}
      <div className="section-heading"><h2>المتاح الآن</h2><p>لا يوجد التزام يومي</p></div>
      <div className="activity-list">
        {initialActivities.map((activity) => {
          const complete = completedActivityIds.includes(activity.id);
          const busy = busyId === activity.id;
          return (
            <article className="activity-card" key={activity.id} data-testid={`card-activity-${activity.id}`}>
              <span className="activity-icon"><ActivityIcon type={activity.icon} /></span>
              <div className="activity-copy">
                <h3>{activity.title}</h3>
                <p>{activity.description}</p>
                <div className="activity-meta"><span className="reward-tag">+{formatAmount(activity.reward)} USD</span><span>·</span><span>{activity.duration}</span></div>
              </div>
              {busy ? <span className="loading-lines" data-testid={`loading-activity-${activity.id}`} /> : (
                <button
                  type="button"
                  className={complete ? 'subtle-button' : 'primary-button'}
                  disabled={complete}
                  onClick={() => startActivity(activity)}
                  data-testid={`button-start-activity-${activity.id}`}
                >
                  {complete ? <><Check size={14} aria-hidden="true" /> مكتمل</> : 'بدء النشاط'}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="trust-strip" style={{ marginTop: 15 }} data-testid="status-earn-policy">
        <ShieldCheck size={17} aria-hidden="true" />
        <p>المكافآت تقديرية حسب النشاط المتاح، وليست دخلاً مضموناً. يمكنك مغادرة هذه الصفحة دون أن يتغير شيء.</p>
      </div>
    </div>
  );
}

function Wallet() {
  const { balance, withdrawals, requestWithdrawal } = useRewardly();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('محفظة رقمية');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitWithdrawal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 5) {
      setError('الحد الأدنى لطلب السحب هو 5.00 USD.');
      setSuccess('');
      return;
    }
    if (numericAmount > balance) {
      setError('المبلغ أكبر من رصيدك المتاح حالياً.');
      setSuccess('');
      return;
    }
    if (destination.trim().length < 4) {
      setError('أدخل معرّفاً أو آخر أربعة أرقام للوجهة.');
      setSuccess('');
      return;
    }
    requestWithdrawal(numericAmount, method, destination.trim());
    setSuccess(`تم تسجيل طلب سحب بقيمة ${formatAmount(numericAmount)} USD للمراجعة.`);
    setAmount('');
    setDestination('');
    setError('');
  };

  return (
    <div className="page" data-testid="page-wallet">
      <PageHeader
        eyebrow="المحفظة"
        title="أموالك، بتفاصيلها."
        subtitle="راجع المتاح، أرسل طلب سحب، وتابع كل حركة من سجل واحد بدون مفاجآت."
      />
      <div className="wallet-grid">
        <section className="wallet-panel">
          <h2>طلب سحب جديد</h2>
          <p>تتم مراجعة الطلبات يدوياً قبل الإرسال. الحد الأدنى 5.00 USD.</p>
          {success && <div className="form-success" data-testid="status-withdrawal-success"><Check size={16} aria-hidden="true" /><span>{success}</span></div>}
          <form onSubmit={submitWithdrawal} data-testid="form-withdrawal">
            <div className="form-field">
              <label htmlFor="withdrawal-amount">المبلغ بالدولار</label>
              <input id="withdrawal-amount" type="number" min="5" step="0.01" placeholder="مثال: 5.00" value={amount} onChange={(event) => setAmount(event.target.value)} data-testid="input-withdrawal-amount" />
              <span className="form-hint">المتاح الآن: {formatAmount(balance)} USD</span>
            </div>
            <div className="form-field">
              <label>طريقة الاستلام</label>
              <div className="method-row">
                <button type="button" className={`method-option ${method === 'محفظة رقمية' ? 'selected' : ''}`} onClick={() => setMethod('محفظة رقمية')} data-testid="button-method-digital"><strong>محفظة رقمية</strong><span>تحويل سريع</span></button>
                <button type="button" className={`method-option ${method === 'تحويل بنكي' ? 'selected' : ''}`} onClick={() => setMethod('تحويل بنكي')} data-testid="button-method-bank"><strong>تحويل بنكي</strong><span>قد يستغرق وقتاً أطول</span></button>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="withdrawal-destination">المعرّف أو آخر أربعة أرقام</label>
              <input id="withdrawal-destination" type="text" placeholder="مثال: 4821" value={destination} onChange={(event) => setDestination(event.target.value)} data-testid="input-withdrawal-destination" />
            </div>
            {error && <p className="form-error" role="alert" data-testid="status-withdrawal-error">{error}</p>}
            <button type="submit" className="primary-button" style={{ width: '100%', marginTop: 18 }} data-testid="button-submit-withdrawal">إرسال طلب السحب <ArrowLeft size={15} aria-hidden="true" /></button>
          </form>
        </section>
        <section className="wallet-panel" data-testid="card-transaction-history">
          <h2>آخر الحركات</h2>
          <p>سجل مبسّط للرصيد والسحوبات السابقة.</p>
          <div className="transaction-list">
            <div className="transaction-row">
              <div className="transaction-main"><span className="transaction-icon"><Sparkles size={15} aria-hidden="true" /></span><span><strong>مكافآت الأنشطة</strong><span>هذا الشهر</span></span></div>
              <span className="transaction-amount positive">+3.40 USD</span>
            </div>
            {withdrawals.slice(0, 3).map((withdrawal) => (
              <div className="transaction-row" key={withdrawal.id} data-testid={`row-transaction-${withdrawal.id}`}>
                <div className="transaction-main"><span className="transaction-icon"><Banknote size={15} aria-hidden="true" /></span><span><strong>طلب سحب</strong><span>{withdrawal.date}</span></span></div>
                <span className={`transaction-amount ${withdrawal.status === 'processing' ? 'pending' : ''}`}>-{formatAmount(withdrawal.amount)} USD</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="trust-strip" style={{ marginTop: 15 }} data-testid="status-wallet-security">
        <LockKeyhole size={17} aria-hidden="true" />
        <p>نخفي بيانات الوجهة في السجل العام. إثباتات السحب المنشورة لا تحتوي على أسماء أو معرّفات شخصية.</p>
      </div>
    </div>
  );
}

function Proofs() {
  const { withdrawals } = useRewardly();
  const [filter, setFilter] = useState<'all' | 'complete' | 'processing'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const proofs = useMemo(() => withdrawals.filter((item) => filter === 'all' || item.status === filter), [filter, withdrawals]);
  const filterOptions = [
    { value: 'all' as const, label: 'الكل' },
    { value: 'complete' as const, label: 'تم الإرسال' },
    { value: 'processing' as const, label: 'قيد المراجعة' },
  ];

  return (
    <div className="page" data-testid="page-proofs">
      <PageHeader
        eyebrow="صفحة الشفافية"
        title="إثباتات السحب."
        subtitle="تأكيدات مجهّلة لطلبات وصلت إلى مرحلة الإرسال. هذه ليست وعوداً، بل سجل لما حدث فعلاً."
      />
      <div className="proof-intro" data-testid="status-proofs-anonymized">
        <BadgeCheck size={18} aria-hidden="true" />
        <div><strong>كل الأمثلة هنا مجهّلة</strong><p>نخفي الأسماء والوجهات ونكتفي بالمبلغ والحالة والتاريخ حتى تبقى الصورة مفيدة ومحترمة للخصوصية.</p></div>
      </div>
      <div className="filter-row" role="tablist" aria-label="تصفية الإثباتات">
        {filterOptions.map((option) => (
          <button type="button" role="tab" aria-selected={filter === option.value} className={`filter-chip ${filter === option.value ? 'active' : ''}`} onClick={() => setFilter(option.value)} key={option.value} data-testid={`button-filter-${option.value}`}>{option.label}</button>
        ))}
      </div>
      <div className="proof-list">
        {proofs.map((proof) => {
          const isExpanded = expanded === proof.id;
          return (
            <article className="proof-row" key={proof.id} data-testid={`card-proof-${proof.id}`}>
              <button type="button" className="proof-main" onClick={() => setExpanded(isExpanded ? null : proof.id)} aria-expanded={isExpanded} data-testid={`button-expand-proof-${proof.id}`}>
                <span className="proof-person"><span className="proof-initial">مـ</span><span><strong>مستخدم مجهّل</strong><span>{proof.method} · {proof.destination}</span></span></span>
                <span className="proof-right"><span className="proof-amount"><strong>{formatAmount(proof.amount)} USD</strong><span>{proof.date}</span></span><span className={`status ${proof.status === 'complete' ? 'complete' : 'process'}`}>{proof.status === 'complete' ? 'تم الإرسال' : 'قيد المراجعة'}</span></span>
              </button>
              {isExpanded && <div className="proof-detail" data-testid={`detail-proof-${proof.id}`}>رقم التحقق: <span>RL-{proof.id.replace('w-', '')}-24</span> · آخر تحديث: <span>{proof.date}</span><br />تم إخفاء بيانات صاحب الطلب والوجهة حفاظاً على الخصوصية.</div>}
            </article>
          );
        })}
        {proofs.length === 0 && <div className="empty-state" data-testid="empty-proofs">لا توجد إثباتات بهذه التصفية حالياً.</div>}
      </div>
      <div className="trust-strip" style={{ marginTop: 15 }} data-testid="status-proof-note">
        <Info size={17} aria-hidden="true" />
        <p>المدة والحالة قد تختلف حسب طريقة الاستلام. Rewardly لا يضمن مبلغاً أو وقتاً ثابتاً لأي مستخدم.</p>
      </div>
    </div>
  );
}

function AppContent() {
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState(18.75);
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>([]);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1150);
    return () => window.clearTimeout(timer);
  }, []);

  const value = useMemo<RewardlyContextValue>(() => ({
    balance,
    completedActivityIds,
    withdrawals,
    completeActivity: (activity) => {
      setCompletedActivityIds((current) => current.includes(activity.id) ? current : [...current, activity.id]);
      setBalance((current) => current + activity.reward);
    },
    requestWithdrawal: (amount, method, destination) => {
      setBalance((current) => current - amount);
      setWithdrawals((current) => [{
        id: `w-${Date.now()}`,
        amount,
        method,
        destination: `•••• ${destination.slice(-4)}`,
        date: 'اليوم',
        status: 'processing',
      }, ...current]);
    },
  }), [balance, completedActivityIds, withdrawals]);

  if (!ready) return <StartupScreen />;

  return (
    <RewardlyContext.Provider value={value}>
      <AppShell>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/earn" component={Earn} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/proofs" component={Proofs} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RewardlyContext.Provider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AppContent />
      </WouterRouter>
    </ErrorBoundary>
  );
}

export default App;