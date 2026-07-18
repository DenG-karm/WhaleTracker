import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import tr from './locales/tr/translation.json';
import en from './locales/en/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            tr: { translation: tr },
            en: { translation: en },
        },
        fallbackLng: 'tr',
        defaultNS: 'translation',
        // Tarayıcı dili algılama öncelik sırası:
        // 1) localStorage'a kaydedilen tercih
        // 2) Tarayıcı navigator.language
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'wt_language',
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false, // React zaten XSS escape yapıyor
        },
        // Kaynaklar belleğe yüklendiği için senkron başlatma — ilk render'da
        // t() boş string dönmemesi için kritik:
        initImmediate: false,
        react: {
            useSuspense: false,
        },
    });

export default i18n;
