import React, { createContext, useContext, useState, useEffect } from "react";

/* ─── Types ─────────────────────────────────────────────── */
export type Language = "en" | "hi" | "kn" | "ta";

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    dashboard: "Dashboard",
    file_complaint: "File Complaint",
    my_grievances: "My Grievances",
    heatmap: "City Heatmap",
    admin: "Admin Intel",
    hero_title: "Giving every Indian a voice.",
    hero_subtitle: "AI-powered grievance resolution for 1.4 billion citizens. From your spoken word to a department's inbox in seconds.",
    file_btn: "File a Complaint →",
    heatmap_btn: "Live City Heatmap",
    search_placeholder: "Search grievances, wards, departments…",
    system_live: "System Live",
    sign_in: "Sign in",
    sign_out: "Sign out",
    speak_any_lang: "Speak in any language",
    analyse_ai: "Analyse with AI →",
    confirm_file: "Confirm & file →",
    filed_success: "Filed successfully!",
    ref_code: "Grievance ID",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    file_complaint: "शिकायत दर्ज करें",
    my_grievances: "मेरी शिकायतें",
    heatmap: "सिटी हीटमैप",
    admin: "एडमिन इंटेलिजेंस",
    hero_title: "हर भारतीय को आवाज़ देना।",
    hero_subtitle: "1.4 अरब नागरिकों के लिए AI-संचालित शिकायत निवारण। आपकी बात से लेकर विभाग के इनबॉक्स तक कुछ ही सेकंड में।",
    file_btn: "शिकायत दर्ज करें →",
    heatmap_btn: "लाइव सिटी हीटमैप",
    search_placeholder: "शिकायतें, वार्ड, विभाग खोजें…",
    system_live: "सिस्टम लाइव",
    sign_in: "साइन इन",
    sign_out: "साइन आउट",
    speak_any_lang: "किसी भी भाषा में बोलें",
    analyse_ai: "AI के साथ विश्लेषण करें →",
    confirm_file: "पुष्टि करें और फाइल करें →",
    filed_success: "सफलतापूर्वक दर्ज किया गया!",
    ref_code: "शिकायत संख्या",
  },
  kn: {
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    file_complaint: "ದೂರು ದಾಖಲಿಸಿ",
    my_grievances: "ನನ್ನ ದೂರುಗಳು",
    heatmap: "ನಗರದ ಹೀಟ್‌ಮ್ಯಾಪ್",
    admin: "ನಿರ್ವಾಹಕ ಬುದ್ಧಿವಂತಿಕೆ",
    hero_title: "ಪ್ರತಿ ಭಾರತೀಯನಿಗೂ ಧ್ವನಿ ನೀಡುವುದು.",
    hero_subtitle: "1.4 ಶತಕೋಟಿ ನಾಗರಿಕರಿಗಾಗಿ AI-ಚಾಲಿತ ದೂರು ಪರಿಹಾರ. ನಿಮ್ಮ ಮಾತಿನಿಂದ ಇಲಾಖೆಯ ಇನ್ಬಾಕ್ಸ್ ವರೆಗೆ ಸೆಕೆಂಡುಗಳಲ್ಲಿ.",
    file_btn: "ದೂರು ದಾಖಲಿಸಿ →",
    heatmap_btn: "ಲೈವ್ ಸಿಟಿ ಹೀಟ್‌ಮ್ಯಾಪ್",
    search_placeholder: "ದೂರುಗಳು, ವಾರ್ಡ್‌ಗಳು, ಇಲಾಖೆಗಳನ್ನು ಹುಡುಕಿ…",
    system_live: "ಸಿಸ್ಟಮ್ ಲೈವ್",
    sign_in: "ಸೈನ್ ಇನ್",
    sign_out: "ಸೈನ್ ಔಟ್",
    speak_any_lang: "ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ",
    analyse_ai: "AI ನೊಂದಿಗೆ ವಿಶ್ಲೇಷಿಸಿ →",
    confirm_file: "ಖಚಿತಪಡಿಸಿ ಮತ್ತು ಫೈಲ್ ಮಾಡಿ →",
    filed_success: "ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ!",
    ref_code: "ದೂರು ಸಂಖ್ಯೆ",
  },
  ta: {
    dashboard: "டாஷ்போர்டு",
    file_complaint: "புகார் அளிக்கவும்",
    my_grievances: "எனது புகார்கள்",
    heatmap: "நகர ஹீட்மேப்",
    admin: "நிர்வாக நுண்ணறிவு",
    hero_title: "ஒவ்வொரு இந்தியருக்கும் ஒரு குரல் கொடுப்பது.",
    hero_subtitle: "1.4 பில்லியன் குடிமக்களுக்கான AI-ஆல் இயங்கும் குறை தீர்க்கும் முறை. உங்கள் பேச்சிலிருந்து துறையின் இன்பாக்ஸ் வரை நொடிகளில்.",
    file_btn: "புகார் அளிக்கவும் →",
    heatmap_btn: "நேரடி நகர ஹீட்மேப்",
    search_placeholder: "புகார்கள், வார்டுகள், துறைகளைத் தேடுங்கள்…",
    system_live: "சிஸ்டம் நேரலை",
    sign_in: "உள்நுழைக",
    sign_out: "வெளியேறு",
    speak_any_lang: "எந்த மொழியிலும் பேசுங்கள்",
    analyse_ai: "AI மூலம் பகுப்பாய்வு செய்க →",
    confirm_file: "உறுதிசெய்து சமர்ப்பிக்கவும் →",
    filed_success: "வெற்றிகரமாக பதிவு செய்யப்பட்டது!",
    ref_code: "புகார் ஐடி",
  }
};

/* ─── Context ────────────────────────────────────────────── */
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("app-language") as Language) || "en";
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
    // Optional: add data attribute to body for CSS targeting if needed
    document.documentElement.lang = lang;
  };

  const t = (key: string) => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
