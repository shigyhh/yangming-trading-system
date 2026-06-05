const complianceNote = "本系统用于交易心理觉察与行为训练，不构成投资建议。"

export const oneThoughtScenes = [
  { key: "surge", label: "急涨时", x: 24, y: 34, drift: -0.06, delay: 0 },
  { key: "plunge", label: "急跌时", x: 76, y: 34, drift: 0.07, delay: 180 },
  { key: "missed", label: "踏空后", x: 20, y: 49, drift: 0.05, delay: 340 },
  { key: "floatingGain", label: "浮盈时", x: 79, y: 49, drift: -0.04, delay: 520 },
  { key: "floatingLoss", label: "浮亏时", x: 24, y: 64, drift: -0.03, delay: 660 },
  { key: "beforeStop", label: "止损前", x: 75, y: 64, drift: 0.04, delay: 820 },
  { key: "lossStreak", label: "连续亏损后", x: 28, y: 76, drift: 0.06, delay: 980 },
  { key: "winStreak", label: "连续盈利后", x: 72, y: 76, drift: -0.05, delay: 1140 },
  { key: "crowdNoise", label: "别人都在说时", x: 34, y: 87, drift: -0.04, delay: 1320 },
  { key: "review", label: "收盘复盘时", x: 66, y: 87, drift: 0.05, delay: 1460 },
]

const sceneAliases = {
  othersTalking: "crowdNoise",
}

const mirrorAliases = {
  chasing: "chase",
  holdingLoss: "hold",
  following: "herd",
  procrastination: "delay",
  conscience: "liangzhi",
}

const sceneDrivenMirrorKeys = {
  surge: "chase",
  plunge: "anxiety",
  missed: "chase",
  floatingGain: "anxiety",
  floatingLoss: "hold",
  beforeStop: "hold",
  lossStreak: "gamble",
  winStreak: "gamble",
  crowdNoise: "herd",
  review: "delay",
}

const thoughtLibrary = {
  surge: {
    default: "我不能又慢一步。",
    intensity: {
      1: "这一涨，我的心先快了一拍。",
      2: "它一动，我就怕自己落后。",
      3: "我不能又慢一步。",
      4: "我不能又慢一步。",
      5: "我不能又慢一步。",
    },
  },
  plunge: {
    default: "它突然下去，我也想立刻做点什么。",
    intensity: {
      4: "它突然下去，我也想立刻做点什么。",
      5: "再不处理，我会更慌。",
    },
  },
  missed: {
    default: "我刚才为什么没有上？",
    intensity: {
      4: "刚才那一下，我怎么又错过了？",
      5: "我刚才为什么没有上？",
    },
  },
  floatingGain: {
    default: "这点利润不能再还回去。",
    intensity: {
      4: "这点利润不能再还回去。",
      5: "到手的东西，我不能又失去。",
    },
  },
  floatingLoss: {
    default: "再等等，也许很快就回来。",
    intensity: {
      4: "再等等，也许很快就回来。",
      5: "现在认错，我会很难受。",
    },
  },
  beforeStop: {
    default: "先别走，万一马上反抽呢？",
    intensity: {
      4: "到底要不要执行，还是再看一下？",
      5: "先别走，万一马上反抽呢？",
    },
  },
  lossStreak: {
    default: "下一笔我一定要扳回来。",
    intensity: {
      4: "再错一次，我可能更受不了。",
      5: "下一笔我一定要扳回来。",
    },
  },
  winStreak: {
    default: "手感来了，可以再快一点。",
    intensity: {
      4: "这次状态这么好，不能停在这里。",
      5: "手感来了，可以再快一点。",
    },
  },
  crowdNoise: {
    default: "大家都在说，是不是我错了？",
    intensity: {
      4: "他们都这么确定，我还要不要坚持？",
      5: "外面越热闹，我越怕自己错过。",
    },
  },
  review: {
    default: "今天先别看了，明天再复盘。",
    intensity: {
      4: "这一笔失控，值得被我看见。",
      5: "今天先别看了，明天再复盘。",
    },
  },
}

const fallbackThoughts = [
  "我不能又慢一步。",
  "这一念起来了，我先看见它。",
  "此刻动的不是市场，是我的心。",
]

const baseMirrorContent = {
  chase: {
    reflection: ["你怕的不是错过行情。", "你怕的是错过之后，", "那个又慢了一步的自己。"],
    evidence: "我看见自己不是在追行情，\n是在追那个“不想再慢一步”的自己。",
    practice: "下一次急涨时，先停三息。\n不追第一口气，只记录这一念。",
  },
  hold: {
    reflection: ["你扛的不是仓位。", "你扛的是不愿承认，", "自己这一次已经看错了。"],
    evidence: "我看见自己不是在等反弹，\n是在等市场替我证明“我没错”。",
    practice: "下一次触发止损时，先执行，再复盘。\n不在盘中和亏损讲道理。",
  },
  fantasy: {
    reflection: ["你等的不是机会。", "你等的是一个，", "可以不用面对错误的理由。"],
    evidence: "我看见自己不是相信行情，\n是在相信一个能让我舒服的故事。",
    practice: "下一次说“这次不一样”时，写下三个事实。\n只看事实，不看愿望。",
  },
  gamble: {
    reflection: ["你想赢回来的不是亏损。", "你想赢回的是，", "被市场打碎的自尊。"],
    evidence: "我看见自己不是在交易，\n是在和那个“输不起的自己”较劲。",
    practice: "下一次亏损后，暂停一笔。\n先离开盘面，再决定是否继续。",
  },
  herd: {
    reflection: ["你跟的不是别人。", "你跟的是自己，", "不敢独自负责的那颗心。"],
    evidence: "我看见自己不是相信别人，\n是在逃避为自己的选择负责。",
    practice: "下一次看见群里热闹时，先写自己的判断。\n再看外界声音。",
  },
  hesitate: {
    reflection: ["你不是缺信号。", "你是在寻找一个，", "不会犯错的保证。"],
    evidence: "我看见自己不是谨慎，\n是在用“再等等”保护自己不犯错。",
    practice: "下一次信号出现时，只问一句：\n这是不是我的规则内动作？",
  },
  delay: {
    reflection: ["你拖的不是复盘。", "你拖的是再次看见，", "那个失控过的自己。"],
    evidence: "我看见自己不是没时间，\n是不想面对今天那个没有守住规则的我。",
    practice: "收盘后三分钟，只写一笔最失控的交易。\n不求完整，只求不逃。",
  },
  anxiety: {
    reflection: ["你卖掉的不是仓位。", "你卖掉的是，", "自己承受波动的能力。"],
    evidence: "我看见自己不是在保护利润，\n是在保护那颗害怕回吐的心。",
    practice: "下一次浮盈波动时，先看规则，不看情绪。\n不到规则位，不用情绪替你平仓。",
  },
  liangzhi: {
    reflection: ["你不是没有情绪。", "你只是终于看见，", "规则可以大过那一刻的冲动。"],
    evidence: "我看见自己不是战胜市场，\n而是第一次没有被自己的情绪带走。",
    practice: "记录一次守住规则的证据。\n让自己知道：我可以不跟着情绪走。",
  },
}

const sceneMirrorContent = {
  chase: {
    surge: {
      intensity: {
        5: {
          reflection: ["你怕的不是错过行情。", "你怕的是再次证明自己，", "比别人慢了一步。"],
          evidence: "我看见自己不是在追行情，\n而是在追那个“不想再慢一步”的自己。",
          practice: "下一次急涨时，先停三息。\n不追第一口气，只记录这一念。",
        },
      },
    },
    missed: {
      default: {
        reflection: ["你追的不是当下。", "你追的是刚才那个，", "没有及时行动的自己。"],
        evidence: "我看见自己不是在补机会，\n是在补刚才没动的遗憾。",
        practice: "下一次踏空后，只记录事实。\n不把遗憾变成下一笔冲动。",
      },
    },
    winStreak: {
      default: {
        reflection: ["你相信的不是规则。", "你相信的是此刻，", "手感还能继续带你往前。"],
        evidence: "我看见自己不是更清醒，\n只是更容易把顺手当成确定。",
        practice: "连续盈利后，先减速一笔。\n只按原规则复核，不加快动作。",
      },
    },
  },
  hold: {
    floatingLoss: {
      default: {
        reflection: ["你等的不是价格回来。", "你等的是市场替你说，", "刚才没有错。"],
        evidence: "我看见自己不是在等反弹，\n是在等一个不用认错的理由。",
        practice: "下一次浮亏扩大时，只问规则是否失效。\n失效就执行，情绪留到复盘。",
      },
    },
    beforeStop: {
      default: {
        reflection: ["你迟疑的不是动作。", "你迟疑的是承认，", "这一次该到此为止。"],
        evidence: "我看见自己不是不懂规则，\n是不愿在盘中承认规则已经触发。",
        practice: "下一次止损前，先执行，再写心情。\n不让心情替规则延迟。",
      },
    },
  },
  herd: {
    crowdNoise: {
      default: {
        reflection: ["外面的声音越响。", "你越难听见，", "自己原本的判断。"],
        evidence: "我看见自己不是相信别人，\n是在借热闹逃避独自负责。",
        practice: "下一次别人都在说时，先写下自己的判断。\n写完再看外界声音。",
      },
    },
  },
  gamble: {
    lossStreak: {
      default: {
        reflection: ["你想赢回来的不是亏损。", "你想赢回的是，", "被连续打乱后的自尊。"],
        evidence: "我看见自己不是在交易，\n是在和那个输不起的自己较劲。",
        practice: "连续亏损后，暂停一笔。\n离开盘面，再决定是否继续训练。",
      },
    },
  },
}

function normalizeSceneKey(sceneKey) {
  const key = sceneAliases[sceneKey] || sceneKey
  return oneThoughtScenes.some((scene) => scene.key === key) ? key : "surge"
}

function normalizeMirrorKey(mirrorKey) {
  const key = mirrorAliases[mirrorKey] || mirrorKey
  return baseMirrorContent[key] ? key : "chase"
}

function normalizeIntensity(intensity) {
  return [1, 2, 3, 4, 5].includes(intensity) ? intensity : 3
}

function pickFallback(items, random) {
  const index = Math.max(0, Math.min(items.length - 1, Math.floor(random() * items.length)))
  return items[index]
}

function sceneForKey(sceneKey) {
  const key = normalizeSceneKey(sceneKey)
  return oneThoughtScenes.find((scene) => scene.key === key) || oneThoughtScenes[0]
}

function normalizeContent(content) {
  return {
    reflection: {
      lines: content.reflection,
    },
    evidence: {
      text: content.evidence,
    },
    practice: {
      text: content.practice,
    },
  }
}

export function getOneThoughtForScene({ sceneKey = "surge", intensity = 3, random = Math.random } = {}) {
  const scene = sceneForKey(sceneKey)
  const normalizedIntensity = normalizeIntensity(intensity)
  const sceneThought = thoughtLibrary[scene.key]
  const text =
    sceneThought?.intensity?.[normalizedIntensity] ||
    sceneThought?.default ||
    pickFallback(fallbackThoughts, random)

  return {
    sceneKey: scene.key,
    sceneLabel: scene.label,
    intensity: normalizedIntensity,
    text,
    complianceNote,
  }
}

/**
 * @param {{
 *   sceneKey?: string
 *   intensity?: number
 * }} options
 */
export function getSceneDrivenMirror({ sceneKey = "surge", intensity = 3 } = {}) {
  const scene = sceneForKey(sceneKey)
  const normalizedIntensity = normalizeIntensity(intensity)
  const mirrorKey = normalizeMirrorKey(sceneDrivenMirrorKeys[scene.key] || "chase")

  return {
    sceneKey: scene.key,
    sceneLabel: scene.label,
    intensity: normalizedIntensity,
    mirrorKey,
    complianceNote,
  }
}

export function getMirrorSceneReflection({ mirrorKey = "chase", sceneKey = "surge", intensity = 3, random = Math.random } = {}) {
  const scene = sceneForKey(sceneKey)
  const normalizedMirrorKey = normalizeMirrorKey(mirrorKey)
  const normalizedIntensity = normalizeIntensity(intensity)
  const sceneContent = sceneMirrorContent[normalizedMirrorKey]?.[scene.key]
  const content =
    sceneContent?.intensity?.[normalizedIntensity] ||
    sceneContent?.default ||
    baseMirrorContent[normalizedMirrorKey] ||
    baseMirrorContent[pickFallback(Object.keys(baseMirrorContent), random)]
  const normalized = normalizeContent(content)

  return {
    mirrorKey: normalizedMirrorKey,
    sceneKey: scene.key,
    sceneLabel: scene.label,
    intensity: normalizedIntensity,
    ...normalized,
    complianceNote,
  }
}

/**
 * @param {{
 *   sceneKey?: string
 *   mirrorKey?: string
 *   thought?: string | { text?: string }
 *   thief?: string
 *   evidence?: string | { text?: string }
 *   practice?: string | { text?: string }
 *   createdAt?: number
 * }} options
 */
export function createLivingMirrorGrowthRecord({
  sceneKey = "surge",
  mirrorKey = "chase",
  thought,
  thief = "",
  evidence,
  practice,
  createdAt = Date.now(),
} = {}) {
  const scene = sceneForKey(sceneKey)
  const normalizedMirrorKey = normalizeMirrorKey(mirrorKey)

  return {
    scene: scene.key,
    mirrorId: normalizedMirrorKey,
    thought: typeof thought === "string" ? thought : thought?.text || "",
    thief,
    evidence: typeof evidence === "string" ? evidence : evidence?.text || "",
    practice: typeof practice === "string" ? practice : practice?.text || "",
    createdAt,
  }
}
