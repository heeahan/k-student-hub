import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ko: { translation: { today: '오늘', community: '커뮤니티', ask: '공식정보', profile: '내 정보' } },
  en: { translation: { today: 'Today', community: 'Community', ask: 'Ask', profile: 'Profile' } },
  zh: { translation: { today: '今天', community: '社区', ask: '官方信息', profile: '我的' } },
  vi: { translation: { today: 'Hôm nay', community: 'Cộng đồng', ask: 'Thông tin', profile: 'Cá nhân' } },
  ja: { translation: { today: '今日', community: 'コミュニティ', ask: '公式情報', profile: 'マイページ' } },
};

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources,
    lng: Localization.getLocales()[0]?.languageCode ?? 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
