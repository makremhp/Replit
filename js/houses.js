const HOUSES = [
  { id: 1, key: 'fire',   name: { ar: 'قلعة النار',   en: 'Fire Castle' },    img: 'asesst/house-fire.png',   zombie: 'asesst/zombie-lava.png',        bullet: 'asesst/bullet-fire.png',   fx: 'asesst/fx-fire.png',   unlocked: true,
    perk: { type: 'coinValue', multiplier: 1.5 },
    fireCooldownMs: 560,
    perkDesc: { ar: 'تزيد قيمة كل عملة USDT تجمعها بنسبة 50%', en: 'Increases the value of every USDT coin you collect by 50%' } },
  { id: 2, key: 'light',  name: { ar: 'قلعة النور',   en: 'Light Castle' },   img: 'asesst/house-light.png',  zombie: 'asesst/zombie-skeleton.png',    bullet: 'asesst/bullet-light.png',  fx: 'asesst/fx-light.png',  unlock: { type: 'referrals', need: 15 },
    perk: { type: 'passive', amount: 0.001, intervalMs: 20000 },
    fireCooldownMs: 440,
    perkDesc: { ar: 'تنتج لك 0.001 USDT تلقائيًا كل 20 ثانية بدون أي تفاعل', en: 'Automatically generates 0.001 USDT every 20 seconds with no interaction needed' } },
  { id: 3, key: 'ice',    name: { ar: 'قلعة الجليد',  en: 'Ice Castle' },     img: 'asesst/house-ice.png',    zombie: 'asesst/zombie-alien.png',       bullet: 'asesst/bullet-ice.png',    fx: 'asesst/fx-ice.png',    unlock: { type: 'ads',       need: 50 },
    perk: { type: 'coinRate', intervalMs: 8000 },
    fireCooldownMs: 650,
    perkDesc: { ar: 'تُسرّع ظهور عملات USDT في الساحة (كل 8 ثوانٍ بدل 15)', en: 'Speeds up USDT coin spawns in the arena (every 8 seconds instead of 15)' } },
  { id: 4, key: 'nature', name: { ar: 'قلعة الطبيعة', en: 'Nature Castle' }, img: 'asesst/house-nature.png', zombie: 'asesst/zombie-orc.png',         bullet: 'asesst/bullet-nature.png', fx: 'asesst/fx-nature.png', unlock: { type: 'ads',       need: 10 },
    perk: { type: 'killBonus', chance: 0.3, amountMultiplier: 1.75 },
    fireCooldownMs: 600,
    perkDesc: { ar: 'كل زومبي تقتله، عندك فرصة 30% تحصل على USDT إضافي فورًا', en: 'Every zombie you kill gives you a 30% chance to instantly get extra USDT' } },
  { id: 5, key: 'dark',   name: { ar: 'قلعة الظلام',  en: 'Dark Castle' },    img: 'asesst/house-dark.png',   zombie: 'asesst/zombie-banshee.png',     bullet: 'asesst/bullet-dark.png',   fx: 'asesst/fx-dark.png',   unlock: { type: 'deposit',   need: 0.03 },
    perk: { type: 'coinValue', multiplier: 2.5 },
    fireCooldownMs: 720,
    perkDesc: { ar: 'تضاعف قيمة كل عملة USDT تجمعها 2.5 مرة — أقوى بيت اقتصاديًا', en: 'Multiplies the value of every USDT coin you collect by 2.5× — the strongest castle economically' } },
  { id: 6, key: 'desert', name: { ar: 'قلعة الصحراء', en: 'Desert Castle' }, img: 'asesst/house-desert.png', zombie: 'asesst/zombie-executioner.png', bullet: 'asesst/bullet-lava.png',   fx: 'asesst/fx-lava.png',   unlock: { type: 'referrals', need: 1 },
    perk: { type: 'passive', amount: 0.0015, intervalMs: 12000 },
    fireCooldownMs: 520,
    perkDesc: { ar: 'تنتج لك 0.0015 USDT تلقائيًا كل 12 ثانية بدون أي تفاعل', en: 'Automatically generates 0.0015 USDT every 12 seconds with no interaction needed' } },
];

function hName(house) { return house.name[LANG]; }
function hPerkDesc(house) { return house.perkDesc[LANG]; }

const ALL_ZOMBIE_TYPES = HOUSES.map(h => h.zombie);

const ZOMBIE_SPAWN_MS = 1900;
const ZOMBIE_SPEED = 0.012;
const TICK_MS = 60;
const FIRE_COOLDOWN_MS = 650;
const BULLET_TRAVEL_MS = 2200;
const COIN_VALUE = 0.005;
const COIN_INTERVAL_MS = 15000;
const MAX_ZOMBIES = 6;
