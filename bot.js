const {
  HOUSES,
  initDatabase,
  readState,
  collectCoin,
  setActiveHouse,
  setTonAddress,
  ensureTelegramUser,
  getTelegramClient,
  createWithdrawal,
  listUserWithdrawals,
  listPendingWithdrawals,
  reviewWithdrawal,
  stats,
} = require('./database');

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiBase = token ? `https://api.telegram.org/bot${token}` : '';
const adminIds = new Set(String(process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(value => value.trim()).filter(Boolean));
const appUrl = process.env.PUBLIC_APP_URL || '';
let running = true;

function isAdmin(userId) {
  return adminIds.has(String(userId));
}

function keyboard() {
  return {
    inline_keyboard: [
      [{ text: '💰 الرصيد', callback_data: 'menu_balance' }, { text: '🏠 البيوت', callback_data: 'menu_houses' }],
      [{ text: '🪙 اجمع الآن', callback_data: 'menu_collect' }, { text: '👥 الإحالات', callback_data: 'menu_referral' }],
      [{ text: '💎 المحفظة', callback_data: 'menu_wallet' }, { text: '📤 السحب', callback_data: 'menu_withdraw' }],
      ...(appUrl ? [[{ text: '🌐 افتح التطبيق', url: appUrl }]] : []),
    ],
  };
}

async function telegram(method, body = {}) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  const response = await fetch(apiBase + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram API error: ${response.status}`);
  return result.result;
}

async function send(chatId, text, extra = {}) {
  return telegram('sendMessage', { chat_id: chatId, text, ...extra });
}

function stateText(state) {
  return [
    `💰 رصيدك: ${state.balance.toFixed(6)} USDT`,
    `🏠 البيت الحالي: #${state.activeHouseId}`,
    `👥 الإحالات: ${state.progress.referrals}`,
    `📺 الإعلانات: ${state.progress.ads}`,
    `💎 الإيداع: ${state.progress.deposit.toFixed(4)}`,
    `🔓 البيوت المفتوحة: ${state.unlockedHouses.join(', ')}`,
    state.tonAddress ? `👛 المحفظة: ${state.tonAddress}` : '👛 المحفظة: غير مضافة',
  ].join('\n');
}

function housesText(state) {
  return Object.entries(HOUSES).map(([id, house]) => {
    const unlocked = state.unlockedHouses.includes(Number(id));
    const requirement = house.unlock ? ` — يحتاج ${house.unlock[1]} ${house.unlock[0]}` : ' — مفتوح';
    return `#${id} ${unlocked ? '✅' : '🔒'} | ${house.coinValue} كل ${house.coinIntervalMs / 1000}ث${requirement}`;
  }).join('\n');
}

function helpText() {
  return [
    '🤖 أوامر البوت:',
    '/start — إنشاء حساب أو فتح القائمة',
    '/balance — عرض الرصيد والتقدم',
    '/houses — عرض البيوت المتاحة',
    '/house 1 — اختيار بيت مفتوح',
    '/collect — جمع عملة من البيت الحالي',
    '/wallet ADDRESS — حفظ عنوان TON',
    '/withdraw — إنشاء طلب سحب للمراجعة',
    '/history — سجل طلبات السحب',
    '/referral — رابط الإحالة الخاص بك',
    '/help — عرض المساعدة',
    '',
    'ملاحظة: طلبات السحب لا ترسل الأموال تلقائيًا؛ تظهر للمشرف للمراجعة أولًا.',
  ].join('\n');
}

async function userClient(message, payload = '') {
  const identity = await ensureTelegramUser(message.from, payload);
  return identity.clientId;
}

async function handleUserCommand(message, command, args, payload = '') {
  const clientId = await userClient(message, payload);
  const chatId = message.chat.id;
  if (command === 'start') {
    await send(chatId, 'أهلًا بك في Six Houses 👋\n\n' + (identityWelcome(message) || 'تم تجهيز حسابك.') + '\n\nاختر من القائمة:', { reply_markup: keyboard() });
    return;
  }
  if (command === 'help') return send(chatId, helpText(), { reply_markup: keyboard() });
  if (command === 'balance') return send(chatId, stateText(await readState(clientId)), { reply_markup: keyboard() });
  if (command === 'houses') {
    const state = await readState(clientId);
    return send(chatId, '🏠 البيوت\n\n' + housesText(state) + '\n\nاستخدم /house رقم لاختيار بيت مفتوح.', { reply_markup: keyboard() });
  }
  if (command === 'house') {
    const state = await setActiveHouse(clientId, args[0]);
    return send(chatId, `تم اختيار البيت #${state.activeHouseId} ✅`, { reply_markup: keyboard() });
  }
  if (command === 'collect') {
    const before = await readState(clientId);
    const state = await collectCoin(clientId, before.activeHouseId);
    return send(chatId, `تمت إضافة ${state.earnedSinceLastSync.toFixed(6)} USDT ✅\n\n${stateText(state)}`, { reply_markup: keyboard() });
  }
  if (command === 'wallet') {
    if (!args[0]) return send(chatId, 'أرسل العنوان بهذا الشكل:\n/wallet UQ...');
    const state = await setTonAddress(clientId, args[0]);
    return send(chatId, `تم حفظ محفظة TON ✅\n${state.tonAddress}`, { reply_markup: keyboard() });
  }
  if (command === 'withdraw') {
    const withdrawal = await createWithdrawal(clientId);
    return send(chatId, `تم إنشاء طلب السحب #${withdrawal.id} بمبلغ ${Number(withdrawal.amount).toFixed(6)} USDT.\nسيتم مراجعته من الإدارة قبل التحويل.`, { reply_markup: keyboard() });
  }
  if (command === 'history') {
    const rows = await listUserWithdrawals(clientId);
    if (!rows.length) return send(chatId, 'لا توجد طلبات سحب حتى الآن.', { reply_markup: keyboard() });
    return send(chatId, rows.map(row => `#${row.id} — ${Number(row.amount).toFixed(6)} USDT — ${row.status}`).join('\n'), { reply_markup: keyboard() });
  }
  if (command === 'referral') {
    const link = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'YOUR_BOT'}?start=ref_${message.from.id}`;
    return send(chatId, `رابط الإحالة الخاص بك:\n${link}\n\nكل مستخدم جديد يدخل من الرابط يزيد عدد إحالاتك.`, { reply_markup: keyboard() });
  }
  if (command === 'admin' || command === 'stats') {
    if (!isAdmin(message.from.id)) return send(chatId, 'هذا الأمر مخصص للإدارة فقط.');
    const summary = await stats();
    return send(chatId, `📊 الإحصائيات\nالمستخدمون: ${summary.users}\nإجمالي الأرصدة: ${summary.balance} USDT\nالإحالات: ${summary.referrals}\nطلبات السحب المعلقة: ${summary.pending_withdrawals}`);
  }
  if (command === 'pending') {
    if (!isAdmin(message.from.id)) return send(chatId, 'هذا الأمر مخصص للإدارة فقط.');
    const rows = await listPendingWithdrawals();
    if (!rows.length) return send(chatId, 'لا توجد طلبات سحب معلقة.');
    return send(chatId, rows.map(row => `#${row.id} — ${Number(row.amount).toFixed(6)} USDT — ${row.ton_address}\n/approve ${row.id} أو /reject ${row.id}`).join('\n\n'));
  }
  if (command === 'approve' || command === 'reject') {
    if (!isAdmin(message.from.id)) return send(chatId, 'هذا الأمر مخصص للإدارة فقط.');
    const status = command === 'approve' ? 'approved' : 'rejected';
    const reviewed = await reviewWithdrawal(args[0], status, message.from.id);
    return send(chatId, `تم ${status === 'approved' ? 'اعتماد' : 'رفض'} طلب السحب #${reviewed.id}.`);
  }
  return send(chatId, helpText(), { reply_markup: keyboard() });
}

function identityWelcome(message) {
  return message.from.first_name ? `مرحبًا ${message.from.first_name}!` : 'مرحبًا بك!';
}

async function handleCallback(callback) {
  const chatId = callback.message.chat.id;
  await telegram('answerCallbackQuery', { callback_query_id: callback.id });
  const clientId = await getTelegramClient(callback.from.id);
  if (callback.data === 'menu_balance') return send(chatId, stateText(await readState(clientId)), { reply_markup: keyboard() });
  if (callback.data === 'menu_houses') {
    const state = await readState(clientId);
    return send(chatId, '🏠 البيوت\n\n' + housesText(state), { reply_markup: keyboard() });
  }
  if (callback.data === 'menu_collect') {
    const before = await readState(clientId);
    const state = await collectCoin(clientId, before.activeHouseId);
    return send(chatId, `تمت إضافة ${state.earnedSinceLastSync.toFixed(6)} USDT ✅`, { reply_markup: keyboard() });
  }
  if (callback.data === 'menu_referral') return send(chatId, `رابط الإحالة:\nhttps://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'YOUR_BOT'}?start=ref_${callback.from.id}`, { reply_markup: keyboard() });
  if (callback.data === 'menu_wallet') return send(chatId, 'لعرض أو تحديث المحفظة استخدم:\n/wallet UQ...', { reply_markup: keyboard() });
  if (callback.data === 'menu_withdraw') return send(chatId, 'تأكد من إضافة محفظتك ثم استخدم /withdraw لإنشاء طلب سحب.', { reply_markup: keyboard() });
}

async function handleUpdate(update) {
  if (update.callback_query) return handleCallback(update.callback_query);
  const message = update.message;
  if (!message || !message.from || !message.chat) return;
  const text = String(message.text || '').trim();
  if (!text) return send(message.chat.id, helpText(), { reply_markup: keyboard() });
  const match = text.match(/^\/(\w+)(?:@\S+)?(?:\s+(.+))?$/);
  if (!match) return send(message.chat.id, helpText(), { reply_markup: keyboard() });
  const command = match[1].toLowerCase();
  const argsText = (match[2] || '').trim();
  const args = argsText ? argsText.split(/\s+/) : [];
  const payload = command === 'start' ? args[0] || '' : '';
  try {
    await handleUserCommand(message, command, args, payload);
  } catch (error) {
    console.error('Telegram update error:', error);
    await send(message.chat.id, `تعذر تنفيذ الأمر: ${error.message}`);
  }
}

async function startTelegramBot() {
  if (!token) {
    console.log('Telegram bot disabled: TELEGRAM_BOT_TOKEN is not set.');
    return;
  }
  await initDatabase();
  await telegram('setMyCommands', { commands: [
    { command: 'start', description: 'بدء البوت' },
    { command: 'balance', description: 'عرض الرصيد' },
    { command: 'houses', description: 'عرض البيوت' },
    { command: 'collect', description: 'جمع عملة' },
    { command: 'wallet', description: 'حفظ محفظة TON' },
    { command: 'withdraw', description: 'طلب سحب' },
    { command: 'history', description: 'سجل السحب' },
    { command: 'referral', description: 'رابط الإحالة' },
    { command: 'help', description: 'المساعدة' },
  ] });
  console.log('Telegram bot polling started.');
  let offset = 0;
  while (running) {
    try {
      const updates = await telegram('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      console.error('Telegram polling error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

function stopTelegramBot() {
  running = false;
}

module.exports = { startTelegramBot, stopTelegramBot };

if (require.main === module) {
  startTelegramBot().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
