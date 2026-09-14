const HOUSES = [
  {
    id: 1,
    key: 'fire',
    name: { ar: 'قلعة النار', en: 'Fire Castle' },
    img: 'asesst/house-fire.png',
    unlocked: true,
    coinMultiplier: 0.20,
    perkDesc: { ar: 'زيادة 20% على أرباح جمع العملات', en: '20% bonus on collected coins' },
  },
  {
    id: 2,
    key: 'light',
    name: { ar: 'قلعة النور', en: 'Light Castle' },
    img: 'asesst/house-light.png',
    unlock: { type: 'referrals', need: 3 },
    coinMultiplier: 0.35,
    perkDesc: { ar: 'زيادة 35% على أرباح جمع العملات', en: '35% bonus on collected coins' },
  },
  {
    id: 3,
    key: 'ice',
    name: { ar: 'قلعة الجليد', en: 'Ice Castle' },
    img: 'asesst/house-ice.png',
    unlock: { type: 'referrals', need: 15 },
    coinMultiplier: 0.50,
    perkDesc: { ar: 'زيادة 50% على أرباح جمع العملات', en: '50% bonus on collected coins' },
  },
  {
    id: 4,
    key: 'nature',
    name: { ar: 'قلعة الطبيعة', en: 'Nature Castle' },
    img: 'asesst/house-nature.png',
    unlock: { type: 'referrals', need: 45 },
    production: 0.0001,
    perkDesc: { ar: 'إنتاج 0.0001 دولار كل دقيقتين', en: 'Produces $0.0001 every two minutes' },
  },
  {
    id: 5,
    key: 'dark',
    name: { ar: 'قلعة الظلام', en: 'Dark Castle' },
    img: 'asesst/house-dark.png',
    unlock: { type: 'ads', need: 50 },
    production: 0.0002,
    perkDesc: { ar: 'إنتاج 0.0002 دولار كل دقيقتين', en: 'Produces $0.0002 every two minutes' },
  },
  {
    id: 6,
    key: 'desert',
    name: { ar: 'قلعة الصحراء', en: 'Desert Castle' },
    img: 'asesst/house-desert.png',
    unlock: { type: 'referrals', need: 3 },
    coinMultiplier: 0.80,
    perkDesc: { ar: 'زيادة 80% على أرباح جمع العملات', en: '80% bonus on collected coins' },
  },
];

function hName(house) { return house.name[LANG]; }
function hPerkDesc(house) { return house.perkDesc[LANG]; }
