import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
];

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith('en') ? 'en' : 'fr';

  const toggle = () => {
    const next = current === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const next = LANGS.find(l => l.code !== current)!;

  return (
    <button
      onClick={toggle}
      title={`Passer en ${next.label}`}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 ${className}`}
    >
      <span>{next.flag}</span>
      <span>{next.label}</span>
    </button>
  );
}
