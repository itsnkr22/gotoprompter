import { beforeAll, describe, expect, it } from 'vitest';
import {
  ALL_LANGUAGES,
  LANGUAGES_AUTO,
  LANGUAGES_MANUAL,
  LANGUAGE_COUNT,
  detectByScript,
  detectLanguage,
  fullDetectorReady,
  isRtlLanguage,
  languageName,
} from '../src/languages';

describe('languages', () => {
  beforeAll(async () => {
    expect(await fullDetectorReady).toBe(true);
  });

  it('exposes 65 languages in two sorted groups', () => {
    expect(LANGUAGE_COUNT).toBe(65);
    expect(ALL_LANGUAGES).toHaveLength(72);
    expect(LANGUAGES_AUTO).toHaveLength(51);
    expect(LANGUAGES_MANUAL).toHaveLength(21);
    expect(languageName('fr-FR')).toBe('French');
    expect(languageName('pt-BR')).toBe('Portuguese (Brazil)');
    expect(languageName('zz')).toBe('zz');
    expect(isRtlLanguage('ur-PK')).toBe(true);
    expect(isRtlLanguage('en-US')).toBe(false);
  });

  it('detects French with confidence and maps to fr-FR', () => {
    const r = detectLanguage('bonjour tout le monde, comment allez vous aujourd hui');
    expect(r.locale).toBe('fr-FR');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('falls back to en-US with low confidence on gibberish or empty text', () => {
    expect(detectLanguage('').locale).toBe('en-US');
    expect(detectLanguage('').confidence).toBe(0);
    const r = detectLanguage('asdf qwer zxcv');
    expect(r.locale === 'en-US' || r.confidence < 0.5).toBe(true);
  });

  // One realistic sentence per language the menu marks as auto-detected.
  const SAMPLES: Record<string, string> = {
    'en-US': 'Good morning everyone and thank you for joining the meeting today',
    'es-ES': 'Buenos días a todos y gracias por acompañarnos en la reunión de hoy',
    'de-DE': 'Guten Morgen zusammen und vielen Dank, dass Sie heute dabei sind',
    'it-IT': 'Buongiorno a tutti e grazie per essere qui con noi oggi pomeriggio',
    'pt-PT': 'Bom dia a todos e obrigado por estarem connosco na reunião de hoje',
    'nl-NL': 'Goedemorgen allemaal en bedankt dat jullie er vandaag bij zijn',
    'pl-PL': 'Dzień dobry wszystkim i dziękuję, że jesteście dzisiaj z nami',
    'tr-TR': 'Herkese günaydın ve bugün bize katıldığınız için teşekkür ederim',
    'sv-SE': 'God morgon allihopa och tack för att ni är med oss idag',
    // Danish and Norwegian are near twins: a real script's worth of text separates them.
    'da-DK':
      'Hej alle sammen. I dag vil jeg gerne fortælle jer om vores nye produkt, som vi har arbejdet på i flere måneder. Det er en glæde at kunne vise det frem.',
    'fr-FR': 'Bonjour à tous et merci de vous joindre à nous pour la réunion aujourd’hui',
    'fi-FI': 'Hyvää huomenta kaikille ja kiitos, että olette tänään mukana',
    'no-NO':
      'Hei alle sammen. I dag vil jeg gjerne fortelle dere om det nye produktet vårt, som vi har jobbet med i flere måneder. Det er en glede å kunne vise det frem.',
    'cs-CZ': 'Dobré ráno všem a děkuji, že jste se k nám dnes připojili',
    'hu-HU': 'Jó reggelt mindenkinek, és köszönöm, hogy ma velünk vannak',
    'ro-RO': 'Bună dimineața tuturor și vă mulțumesc că sunteți astăzi alături de noi',
    'sk-SK': 'Dobré ráno všetkým a ďakujem, že ste sa k nám dnes pripojili',
    'id-ID': 'Selamat pagi semuanya dan terima kasih sudah bergabung dengan kami hari ini',
    'vi-VN': 'Chào buổi sáng mọi người và cảm ơn các bạn đã tham gia cùng chúng tôi hôm nay',
    'ru-RU': 'Доброе утро всем и спасибо, что вы сегодня с нами на этой встрече',
    'uk-UA': 'Доброго ранку всім і дякую, що ви сьогодні з нами на цій зустрічі',
    'bg-BG': 'Добро утро на всички и благодаря, че сте с нас днес на тази среща',
    'sr-RS': 'Добро јутро свима и хвала што сте данас са нама на овом састанку',
    'el-GR': 'Καλημέρα σε όλους και ευχαριστώ που είστε σήμερα μαζί μας',
    'he-IL': 'בוקר טוב לכולם ותודה שהצטרפתם אלינו היום לפגישה',
    'ar-SA': 'صباح الخير للجميع وشكرا لانضمامكم إلينا في اجتماع اليوم',
    'fa-IR': 'صبح همگی بخیر و ممنون که امروز در این جلسه با ما همراه هستید، چه خبر؟ گفتگو',
    'ur-PK': 'سب کو صبح بخیر اور آج کی میٹنگ میں ہمارے ساتھ شامل ہونے کا شکریہ',
    'hi-IN': 'सभी को सुप्रभात और आज की बैठक में हमारे साथ जुड़ने के लिए धन्यवाद',
    'bn-IN': 'সবাইকে সুপ্রভাত এবং আজকের সভায় আমাদের সাথে যোগ দেওয়ার জন্য ধন্যবাদ',
    'ta-IN': 'அனைவருக்கும் காலை வணக்கம், இன்று எங்களுடன் இணைந்ததற்கு நன்றி',
    'te-IN': 'అందరికీ శుభోదయం, ఈ రోజు మాతో చేరినందుకు ధన్యవాదాలు',
    'kn-IN': 'ಎಲ್ಲರಿಗೂ ಶುಭೋದಯ, ಇಂದು ನಮ್ಮೊಂದಿಗೆ ಸೇರಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು',
    'ml-IN': 'എല്ലാവർക്കും സുപ്രഭാതം, ഇന്ന് ഞങ്ങളോടൊപ്പം ചേർന്നതിന് നന്ദി',
    'gu-IN': 'બધાને સુપ્રભાત અને આજે અમારી સાથે જોડાવા બદલ આભાર',
    'si-LK': 'සියලු දෙනාටම සුබ උදෑසනක්, අද අප හා එක්වීම ගැන ස්තූතියි',
    'th-TH': 'สวัสดีตอนเช้าทุกคน ขอบคุณที่มาร่วมประชุมกับเราในวันนี้',
    'km-KH': 'អរុណសួស្តីអ្នកទាំងអស់គ្នា សូមអរគុណដែលបានចូលរួមជាមួយយើងថ្ងៃនេះ',
    'lo-LA': 'ສະບາຍດີຕອນເຊົ້າທຸກຄົນ ຂອບໃຈທີ່ມາຮ່ວມກັບພວກເຮົາໃນມື້ນີ້',
    'ka-GE': 'დილა მშვიდობისა ყველას და მადლობა, რომ დღეს ჩვენთან ერთად ხართ',
    'hy-AM': 'Բարի լույս բոլորին և շնորհակալություն, որ այսօր մեզ հետ եք',
    'am-ET': 'እንደምን አደራችሁ ሁላችሁም ዛሬ ከእኛ ጋር ስለተገኛችሁ እናመሰግናለን',
    'ja-JP': '皆さん、おはようございます。本日はお集まりいただきありがとうございます',
    'zh-CN': '大家早上好，感谢各位今天参加我们的会议',
    'ko-KR': '여러분 좋은 아침입니다. 오늘 회의에 참석해 주셔서 감사합니다',
    'af-ZA': 'Goeiemôre almal en baie dankie dat julle vandag by ons aangesluit het',
    'et-EE': 'Tere hommikust kõigile ja aitäh, et olete täna meiega liitunud',
    'lv-LV': 'Labrīt visiem un paldies, ka šodien esat kopā ar mums šajā sanāksmē',
    'lt-LT': 'Labas rytas visiems ir ačiū, kad šiandien prisijungėte prie mūsų',
    'is-IS': 'Góðan daginn öll og takk fyrir að vera með okkur í dag á þessum fundi',
    'fil-PH': 'Magandang umaga sa inyong lahat at salamat sa pagsali sa aming pulong ngayong araw',
  };

  it.each(Object.entries(SAMPLES))('auto-detects %s', (locale, text) => {
    const r = detectLanguage(text);
    expect(r.locale).toBe(locale);
    expect(r.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('has a detection sample for every language marked AUTO', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(LANGUAGES_AUTO.map((l) => l.id).sort());
  });

  it('detectByScript settles unique writing systems and ignores Latin text', () => {
    expect(detectByScript('Γεια σας')).toBe('el');
    expect(detectByScript('こんにちは世界')).toBe('ja');
    expect(detectByScript('你好世界')).toBe('zh');
    expect(detectByScript('hello world')).toBeUndefined();
    expect(detectByScript('123 !!!')).toBeUndefined();
    // A few foreign words in an English script do not flip it.
    expect(
      detectByScript('Today we say Γεια and continue in English for the rest'),
    ).toBeUndefined();
  });

  it("prefers the reader's regional variant", () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'languages');
    Object.defineProperty(navigator, 'languages', { value: ['pt-BR', 'en'], configurable: true });
    try {
      expect(detectLanguage('Bom dia a todos e obrigado por estarem aqui hoje').locale).toBe(
        'pt-BR',
      );
      expect(detectLanguage('bonjour tout le monde, comment allez vous').locale).toBe('fr-FR');
    } finally {
      if (original) Object.defineProperty(navigator, 'languages', original);
      else delete (navigator as unknown as Record<string, unknown>)['languages'];
    }
  });
});
