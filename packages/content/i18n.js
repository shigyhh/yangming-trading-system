export const defaultLocale = "zh-CN";

export const supportedLocales = [
  {
    code: "zh-CN",
    label: "简体中文",
    nativeLabel: "简体中文",
    direction: "ltr",
    rollout: "core-ready",
    note: "当前主语言，世界观与功能文案优先维护。"
  },
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    direction: "ltr",
    rollout: "foundation",
    note: "Core worldview ready; feature copy can be expanded later."
  },
  {
    code: "zh-TW",
    label: "繁体中文",
    nativeLabel: "繁體中文",
    direction: "ltr",
    rollout: "foundation",
    note: "核心世界觀已打底，功能文案可後續補齊。"
  },
  {
    code: "ja",
    label: "日语",
    nativeLabel: "日本語",
    direction: "ltr",
    rollout: "foundation",
    note: "中核となる世界観を先に整え、機能文言は段階的に補います。"
  },
  {
    code: "ko",
    label: "韩语",
    nativeLabel: "한국어",
    direction: "ltr",
    rollout: "foundation",
    note: "핵심 세계관을 먼저 정리하고, 기능 문구는 이후 보완합니다."
  },
  {
    code: "es",
    label: "西班牙语",
    nativeLabel: "Español",
    direction: "ltr",
    rollout: "foundation",
    note: "La visión central está preparada; los textos de producto se ampliarán después."
  }
];

export const localeBundles = {
  "zh-CN": {
    locale: "zh-CN",
    version: "2026-06-sprint15",
    common: {
      productName: "阳明心学交易系统",
      sprintName: "Sprint15 多语言基础架构",
      routes: {
        assessment: "交易人格测评",
        report: "结果报告卡",
        training: "七日训练",
        retest: "复测变化",
        userCenter: "观心档案",
        globalReflection: "全球照见层"
      }
    },
    coreWorldview: {
      title: "以交易照人心",
      positioning: "通过交易行为、情绪触发与念头模式，照见自己的交易人格。",
      principle: "系统记录的是反应模式，不给行情结论。",
      trainingLoop: "照见、觉察、训练、复盘，再复测。",
      compliance: "本系统仅用于交易认知、行为训练与风险教育；不构成投资建议。",
      translationPolicy: "核心世界观先人工翻译，功能文案可后续补。",
      glossary: {
        observeHeart: "照见此心",
        awareness: "觉察",
        train: "训练",
        review: "复盘",
        unity: "知行合一",
        practiceInAction: "事上练心"
      }
    },
    globalReflection: {
      title: "全球照见层",
      subtitle: "不比较，不评判，只共同照见交易时最先浮上的那一念。",
      voteTitle: "今日一念投票",
      mirrorTitle: "匿名人格镜像",
      scrollTitle: "全球修行长卷"
    }
  },
  en: {
    locale: "en",
    version: "2026-06-sprint15",
    common: {
      productName: "Yangming Mind Trading System",
      sprintName: "Sprint 15 Multilingual Foundation",
      routes: {
        assessment: "Trading Personality Reflection",
        report: "Result Card",
        training: "Seven-Day Practice",
        retest: "Retest Changes",
        userCenter: "Reflection Archive",
        globalReflection: "Global Reflection Layer"
      }
    },
    coreWorldview: {
      title: "Let trading reveal the mind",
      positioning: "The system reflects trading personality through behavior, emotional triggers, and recurring thoughts.",
      principle: "It records reaction patterns, not market conclusions.",
      trainingLoop: "Reflect, notice, train, review, then retest.",
      compliance: "This system is for trading cognition, behavior training, and risk education only; it is not investment advice.",
      translationPolicy: "Core worldview is translated by hand first; feature copy can be expanded later.",
      glossary: {
        observeHeart: "Reflect the mind",
        awareness: "Awareness",
        train: "Practice",
        review: "Review",
        unity: "Unity of knowing and doing",
        practiceInAction: "Practice in action"
      }
    },
    globalReflection: {
      title: "Global Reflection Layer",
      subtitle: "No comparison, no judgment, only shared awareness of the first reaction that appears.",
      voteTitle: "Today’s First Thought",
      mirrorTitle: "Anonymous Personality Mirror",
      scrollTitle: "Global Practice Scroll"
    }
  },
  "zh-TW": {
    locale: "zh-TW",
    version: "2026-06-sprint15",
    common: {
      productName: "陽明心學交易系統",
      sprintName: "Sprint15 多語言基礎架構",
      routes: {
        assessment: "交易人格測評",
        report: "結果報告卡",
        training: "七日訓練",
        retest: "複測變化",
        userCenter: "觀心檔案",
        globalReflection: "全球照見層"
      }
    },
    coreWorldview: {
      title: "以交易照人心",
      positioning: "透過交易行為、情緒觸發與念頭模式，照見自己的交易人格。",
      principle: "系統記錄的是反應模式，不給行情結論。",
      trainingLoop: "照見、覺察、訓練、復盤，再複測。",
      compliance: "本系統僅用於交易認知、行為訓練與風險教育；不構成投資建議。",
      translationPolicy: "核心世界觀先人工翻譯，功能文案可後續補齊。",
      glossary: {
        observeHeart: "照見此心",
        awareness: "覺察",
        train: "訓練",
        review: "復盤",
        unity: "知行合一",
        practiceInAction: "事上練心"
      }
    },
    globalReflection: {
      title: "全球照見層",
      subtitle: "不比較，不評判，只共同照見交易時最先浮上的那一念。",
      voteTitle: "今日一念投票",
      mirrorTitle: "匿名人格鏡像",
      scrollTitle: "全球修行長卷"
    }
  },
  ja: {
    locale: "ja",
    version: "2026-06-sprint15",
    common: {
      productName: "陽明心学トレーディングシステム",
      sprintName: "Sprint15 多言語基盤",
      routes: {
        assessment: "取引人格リフレクション",
        report: "結果カード",
        training: "7日間の稽古",
        retest: "再測定の変化",
        userCenter: "内省アーカイブ",
        globalReflection: "グローバル内省レイヤー"
      }
    },
    coreWorldview: {
      title: "取引を通して心を映す",
      positioning: "取引行動、感情の引き金、繰り返す思考から、自分の反応人格を見つめます。",
      principle: "記録するのは反応パターンであり、市場の結論ではありません。",
      trainingLoop: "映す、気づく、稽古する、振り返る、そして再測定する。",
      compliance: "本システムは取引認知、行動訓練、リスク教育のためのものです。投資助言ではありません。",
      translationPolicy: "核心となる世界観を人の手で先に翻訳し、機能文言は段階的に整えます。",
      glossary: {
        observeHeart: "この心を映す",
        awareness: "気づき",
        train: "稽古",
        review: "振り返り",
        unity: "知行合一",
        practiceInAction: "行動の中で練る"
      }
    },
    globalReflection: {
      title: "グローバル内省レイヤー",
      subtitle: "比べず、裁かず、最初に現れた反応を共に見つめます。",
      voteTitle: "今日の第一念",
      mirrorTitle: "匿名人格ミラー",
      scrollTitle: "世界の修行巻"
    }
  },
  ko: {
    locale: "ko",
    version: "2026-06-sprint15",
    common: {
      productName: "양명심학 트레이딩 시스템",
      sprintName: "Sprint15 다국어 기반",
      routes: {
        assessment: "트레이딩 성향 성찰",
        report: "결과 카드",
        training: "7일 훈련",
        retest: "재측정 변화",
        userCenter: "성찰 기록",
        globalReflection: "글로벌 성찰 레이어"
      }
    },
    coreWorldview: {
      title: "거래를 통해 마음을 비춘다",
      positioning: "거래 행동, 감정의 촉발, 반복되는 생각을 통해 자신의 반응 성향을 비춥니다.",
      principle: "시장의 결론이 아니라 반응 패턴을 기록합니다.",
      trainingLoop: "비추고, 알아차리고, 훈련하고, 복기한 뒤 다시 측정합니다.",
      compliance: "본 시스템은 거래 인지, 행동 훈련, 위험 교육을 위한 것이며 투자 조언이 아닙니다.",
      translationPolicy: "핵심 세계관은 사람이 먼저 번역하고, 기능 문구는 단계적으로 보완합니다.",
      glossary: {
        observeHeart: "이 마음을 비추기",
        awareness: "알아차림",
        train: "훈련",
        review: "복기",
        unity: "앎과 행함의 일치",
        practiceInAction: "행동 속 수련"
      }
    },
    globalReflection: {
      title: "글로벌 성찰 레이어",
      subtitle: "비교하지 않고 판단하지 않으며, 처음 떠오른 반응을 함께 비춥니다.",
      voteTitle: "오늘의 첫 생각",
      mirrorTitle: "익명 성향 거울",
      scrollTitle: "세계 수련 두루마리"
    }
  },
  es: {
    locale: "es",
    version: "2026-06-sprint15",
    common: {
      productName: "Sistema Yangming de Mente y Trading",
      sprintName: "Sprint 15 Base Multilingue",
      routes: {
        assessment: "Reflejo de Personalidad",
        report: "Tarjeta de Resultado",
        training: "Practica de Siete Dias",
        retest: "Cambios de Reevaluacion",
        userCenter: "Archivo de Reflexion",
        globalReflection: "Capa Global de Reflexion"
      }
    },
    coreWorldview: {
      title: "Que el trading revele la mente",
      positioning: "El sistema refleja la personalidad de trading a traves de conducta, detonantes emocionales y pensamientos recurrentes.",
      principle: "Registra patrones de reaccion, no conclusiones de mercado.",
      trainingLoop: "Reflejar, notar, entrenar, revisar y volver a evaluar.",
      compliance: "Este sistema es solo para cognicion de trading, entrenamiento conductual y educacion de riesgo; no es asesoramiento de inversion.",
      translationPolicy: "La vision central se traduce manualmente primero; los textos funcionales pueden ampliarse despues.",
      glossary: {
        observeHeart: "Reflejar la mente",
        awareness: "Conciencia",
        train: "Entrenar",
        review: "Revisar",
        unity: "Unidad entre saber y hacer",
        practiceInAction: "Practica en la accion"
      }
    },
    globalReflection: {
      title: "Capa Global de Reflexion",
      subtitle: "Sin comparar ni juzgar, solo observamos juntos la primera reaccion que aparece.",
      voteTitle: "Primer Pensamiento de Hoy",
      mirrorTitle: "Espejo Anonimo de Personalidad",
      scrollTitle: "Pergamino Global de Practica"
    }
  }
};

export function normalizeLocale(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return defaultLocale;

  const lower = raw.toLowerCase().replace("_", "-");
  const direct = supportedLocales.find((locale) => locale.code.toLowerCase() === lower);
  if (direct) return direct.code;

  if (lower === "zh" || lower.startsWith("zh-cn") || lower.startsWith("zh-hans")) return "zh-CN";
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hant") || lower.startsWith("zh-hk")) return "zh-TW";

  const base = supportedLocales.find((locale) => locale.code.toLowerCase().split("-")[0] === lower.split("-")[0]);
  return base?.code || defaultLocale;
}

export function matchLocaleFromAcceptLanguage(header = "") {
  const candidates = String(header || "")
    .split(",")
    .map((item) => item.trim().split(";")[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized !== defaultLocale || candidate.toLowerCase().startsWith("zh")) return normalized;
  }

  return defaultLocale;
}

export function getLocaleBundle(locale = "") {
  const normalized = normalizeLocale(locale);
  return localeBundles[normalized] || localeBundles[defaultLocale];
}
