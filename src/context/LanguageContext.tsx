import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  th: {}, // default is Thai so if key missing it's just the key (actually we fallback to key)
  en: {
    'ตะกร้า': 'Cart',
    'ตะกร้าว่างเปล่า': 'Cart is empty',
    'เมนูทั้งหมด': 'All Menu',
    'ไม่มีรายการอาหาร': 'Cart is empty',
    'ยอดรวม': 'Total',
    'ชำระเงิน': 'Checkout',
    'ยังไม่มีสินค้าในตะกร้า': 'No items in your cart',
    'สั่งเมนูตามใจฉัน': 'Custom Order',
    'ให้ทางร้านอัปเดตราคาให้ตามจริง': 'Let the shop calculate your price',
    'ค้นหาเมนูที่ชอบ... (เช่น ต้มยำ, เย็นตาโฟ)': 'Search favorite menu...',
    'ทั้งหมด': 'All',
    'ค่าจัดส่ง': 'Delivery Fee',
    'ยอดสุทธิ': 'Grand Total',
    'โปรดระบุหมายเหตุถ้ามี...': 'Add special instructions (optional)...',
    'ตัวเลือกเพิ่มเติม': 'Options',
    'เผ็ด': 'Spicy',
    'ยอดนิยม': 'Popular',
    'หมด': 'Out of stock',
    'เพิ่ม': 'Add',
    'เพิ่มแล้ว': 'Added',
    'รายการสินค้า': 'Items',
    'ชื่อเมนูที่ต้องการสั่ง...': 'What do you want to order?',
    'โปรดอธิบายเมนูที่ต้องการสั่งให้ชัดเจน': 'Please describe your custom order clearly',
    'เช่น ขอเพิ่มกุ้ง 3 ตัว, ไม่เผ็ด ฯลฯ': 'e.g., Add 3 shrimps, No spice, etc.',
    'ราคาจะถูกประเมินโดยร้านค้าภายหลัง': 'Price will be determined by the staff',
    'ยกเลิก': 'Cancel',
    'ยืนยันการตั้งชื่อ': 'Confirm Order',
    'ระบุชื่อเมนู': 'Specify Menu',
    'หมายเหตุการสั่ง': 'Note',
    'ราคา': 'Price',
    'เลือก': 'Select',
    'รับกลับบ้าน': 'Takeaway',
    'จัดส่ง': 'Delivery',
    'ทานที่ร้าน': 'Dine In',
  }
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('th');

  useEffect(() => {
    const savedLang = localStorage.getItem('yumdash_lang') as Language;
    if (savedLang === 'th' || savedLang === 'en') {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('yumdash_lang', lang);
  };

  const t = (key: string) => {
    if (language === 'th') return key; // native
    return translations.en[key] || key; // fallback to key if un-translated
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
