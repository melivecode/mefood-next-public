import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import thTranslation from './locales/th/translation.json'
import enTranslation from './locales/en/translation.json'

const resources = {
  th: {
    translation: thTranslation
  },
  en: {
    translation: enTranslation
  }
}

// Get saved language from localStorage or default to Thai
const getSavedLanguage = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('i18nextLng')
    if (saved === 'th' || saved === 'en') {
      return saved
    }
  }
  return 'th' // Default to Thai
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(), // Use saved language or default
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    }
  })

export default i18n