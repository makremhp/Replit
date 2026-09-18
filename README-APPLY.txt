Rewardly Telegram - آخر الملفات المعدلة
========================================

انسخ الملفات داخل مشروعك القديم مع الحفاظ على نفس المسارات:
- src/App.tsx
- src/index.css
- index.html
- vite.config.ts
- vercel.json

التحديثات الموجودة:
- العربية أو الإنجليزية حسب لغة متصفح المستخدم.
- الأرقام غربية دائماً مثل 5262 وليس ٥٢٦٢.
- رابط القناة: https://t.me/Urumfaucet
- صفحة سحب TON بعنوان المحفظة، الحد الأدنى 1.00 USD، والتحقق من الرصيد والعنوان.

ملف vercel-root.json يستخدم فقط إذا كان مشروع Vercel يشير إلى جذر monorepo الحالي.
إذا كان مشروعك القديم عبارة عن مجلد Replit-main مستقل، استخدم vercel.json وضع Root Directory على مجلد المشروع نفسه.

إعدادات Vercel للمشروع الحالي المستقل:
- Root Directory: مجلد المشروع نفسه
- Build Command: npm run build
- Output Directory: dist/public

ملف `vercel.json` يحتوي على rewrite إلى `index.html` حتى تعمل مسارات
`/wallet` و`/tasks` و`/help` عند فتحها مباشرة ولا تظهر صفحة 404.

ملاحظة:
التحقق الحقيقي من عضوية القناة ومكافآت Adsgram يحتاج Telegram Bot Token وAdsgram Placement ID على الخادم.
