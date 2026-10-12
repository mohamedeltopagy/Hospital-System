const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

// 1. Files with basic symbol replacements
const filesToReplaceSymbols = [
    'client/src/pages/clinic-detail.tsx',
    'client/src/pages/laboratory.tsx',
    'client/src/pages/pharmacy.tsx',
    'client/src/pages/treatment-plans.tsx',
    'server/storage.ts',
    'server/routes.ts'
];

for (const f of filesToReplaceSymbols) {
    replaceInFile(path.join(dir, f), [
        ['SAR', 'EGP'],
        ['ر.س', 'ج.م'],
        ['Saudi Riyals', 'Egyptian Pounds'],
        ['Saudi Riyal', 'Egyptian Pound']
    ]);
}

// 2. payments.tsx is special, needs more careful replacement
const paymentsPath = path.join(dir, 'client/src/pages/payments.tsx');
if (fs.existsSync(paymentsPath)) {
    let content = fs.readFileSync(paymentsPath, 'utf-8');
    
    // Replace the currencies dictionary
    const oldDict = `const CURRENCIES: Record<string, { code: string; nameAr: string; nameEn: string; symbol: string; rate: number; flag: string }> = {
  SAR: { code: "SAR", nameAr: "الريال السعودي", nameEn: "Saudi Riyal", symbol: "ر.س", rate: 1.0, flag: "🇸🇦" },
  EGP: { code: "EGP", nameAr: "الجنيه المصري", nameEn: "Egyptian Pound", symbol: "ج.م", rate: 13.25, flag: "🇪🇬" },
  USD: { code: "USD", nameAr: "الدولار الأمريكي", nameEn: "US Dollar", symbol: "$", rate: 0.266, flag: "🇺🇸" },
  EUR: { code: "EUR", nameAr: "اليورو الأوروبي", nameEn: "Euro", symbol: "€", rate: 0.245, flag: "🇪🇺" },
  AED: { code: "AED", nameAr: "الدرهم الإماراتي", nameEn: "UAE Dirham", symbol: "د.إ", rate: 0.978, flag: "🇦🇪" },
  KWD: { code: "KWD", nameAr: "الدينار الكويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك", rate: 0.082, flag: "🇰🇼" },
};`;
    
    const newDict = `const CURRENCIES: Record<string, { code: string; nameAr: string; nameEn: string; symbol: string; rate: number; flag: string }> = {
  EGP: { code: "EGP", nameAr: "الجنيه المصري", nameEn: "Egyptian Pound", symbol: "ج.م", rate: 1.0, flag: "🇪🇬" },
  SAR: { code: "SAR", nameAr: "الريال السعودي", nameEn: "Saudi Riyal", symbol: "ر.س", rate: 0.0754, flag: "🇸🇦" },
  USD: { code: "USD", nameAr: "الدولار الأمريكي", nameEn: "US Dollar", symbol: "$", rate: 0.02, flag: "🇺🇸" },
  EUR: { code: "EUR", nameAr: "اليورو الأوروبي", nameEn: "Euro", symbol: "€", rate: 0.0185, flag: "🇪🇺" },
  AED: { code: "AED", nameAr: "الدرهم الإماراتي", nameEn: "UAE Dirham", symbol: "د.إ", rate: 0.0738, flag: "🇦🇪" },
  KWD: { code: "KWD", nameAr: "الدينار الكويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك", rate: 0.0062, flag: "🇰🇼" },
};`;

    content = content.replace(oldDict, newDict);
    content = content.replace(/useState\("SAR"\)/g, 'useState("EGP")');
    content = content.replace(/CURRENCIES\.SAR/g, 'CURRENCIES.EGP');
    content = content.replace(/amountInSAR/g, 'amountInBase');
    content = content.replace(/1 SAR/g, '1 EGP');
    content = content.replace(/\.00 SAR/g, '.00 EGP');
    content = content.replace(/!== "SAR"/g, '!== "EGP"');
    
    fs.writeFileSync(paymentsPath, content, 'utf-8');
    console.log("Updated payments.tsx");
}
