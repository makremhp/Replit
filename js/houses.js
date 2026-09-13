const HOUSES = [
  { id: 1, key: 'fire',   name: { ar: 'قلعة النار',   en: 'Fire Castle' },    img: 'asesst/house-fire.png',   unlocked: true,
    coinValue: 0.00005, coinIntervalMs: 15000,
    perkDesc: { ar: 'تعدّن عملة بقيمة 0.00005 USDT — البيت الأساسي', en: 'Mines a 0.00005 USDT coin — the basic house' } },
  { id: 2, key: 'light',  name: { ar: 'قلعة النور',   en: 'Light Castle' },   img: 'asesst/house-light.png',  unlock: { type: 'referrals', need: 15 },
    coinValue: 0.00006, coinIntervalMs: 13000,
    perkDesc: { ar: 'تعدّن 0.00006 USDT كل 13 ثانية', en: 'Mines 0.00006 USDT every 13 seconds' } },
  { id: 3, key: 'ice',    name: { ar: 'قلعة الجليد',  en: 'Ice Castle' },     img: 'asesst/house-ice.png',    unlock: { type: 'ads',       need: 50 },
    coinValue: 0.00007, coinIntervalMs: 11000,
    perkDesc: { ar: 'تعدّن 0.00007 USDT كل 11 ثانية', en: 'Mines 0.00007 USDT every 11 seconds' } },
  { id: 4, key: 'nature', name: { ar: 'قلعة الطبيعة', en: 'Nature Castle' }, img: 'asesst/house-nature.png', unlock: { type: 'ads',       need: 10 },
    coinValue: 0.00008, coinIntervalMs: 10000,
    perkDesc: { ar: 'تعدّن 0.00008 USDT كل 10 ثوانٍ', en: 'Mines 0.00008 USDT every 10 seconds' } },
  { id: 5, key: 'dark',   name: { ar: 'قلعة الظلام',  en: 'Dark Castle' },    img: 'asesst/house-dark.png',   unlock: { type: 'deposit',   need: 0.03 },
    coinValue: 0.00010, coinIntervalMs: 9000,
    perkDesc: { ar: 'تعدّن 0.00010 USDT كل 9 ثوانٍ', en: 'Mines 0.00010 USDT every 9 seconds' } },
  { id: 6, key: 'desert', name: { ar: 'قلعة الصحراء', en: 'Desert Castle' }, img: 'asesst/house-desert.png', unlock: { type: 'referrals', need: 1 },
    coinValue: 0.00009, coinIntervalMs: 8000,
    perkDesc: { ar: 'تعدّن 0.00009 USDT كل 8 ثوانٍ', en: 'Mines 0.00009 USDT every 8 seconds' } },
];

function hName(house) { return house.name[LANG]; }
function hPerkDesc(house) { return house.perkDesc[LANG]; }