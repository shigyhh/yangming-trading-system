export const brandCharacterSystem = {
  title: "照骨字系",
  subtitle: "一枚照主位，八个字成法。",
  principle: "照为主印；其余八字只作锚点、模块和产品动作。",
  mainCharacter: {
    key: "zhao",
    character: "照",
    tier: "main",
    role: "主形象艺术字",
    phrase: "先照见自己",
    usage: "主标、头像、报告封面、分享卡、视频片头、完成盖印"
  },
  supportingCharacters: [
    {
      key: "xin",
      character: "心",
      tier: "anchor",
      role: "起点",
      phrase: "一念初动",
      usage: "观心、心证、照人心"
    },
    {
      key: "zhi",
      character: "知",
      tier: "anchor",
      role: "清明",
      phrase: "知而未行",
      usage: "良知、明知、知行合一"
    },
    {
      key: "xing",
      character: "行",
      tier: "anchor",
      role: "落实",
      phrase: "知行合一",
      usage: "照行为、行为训练、行后复盘"
    },
    {
      key: "zhi_stop",
      character: "止",
      tier: "method",
      role: "停顿",
      phrase: "停十秒",
      usage: "暂停、先照心、让念头露出来"
    },
    {
      key: "zheng",
      character: "证",
      tier: "method",
      role: "证据",
      phrase: "落回证据",
      usage: "心证、取证、复盘证据"
    },
    {
      key: "fu",
      character: "复",
      tier: "method",
      role: "回看",
      phrase: "复盘行为",
      usage: "回看、回证、回到第一念"
    },
    {
      key: "lian",
      character: "练",
      tier: "method",
      role: "训练",
      phrase: "事上训练",
      usage: "七日训练、行为训练、只练一件事"
    },
    {
      key: "jie",
      character: "界",
      tier: "boundary",
      role: "边界",
      phrase: "守住边界",
      usage: "合规提示、风险教育、不越界"
    }
  ]
};

export const brandCharacterTiers = {
  anchor: {
    label: "心学锚字",
    description: "心、知、行承载标题和章节气质，回到心学底盘。"
  },
  method: {
    label: "产品法字",
    description: "止、证、复、练只服务训练动作、报告模块和复盘路径。"
  },
  boundary: {
    label: "边界字",
    description: "界只表达风险边界、合规边界和不越界。"
  }
};

export const brandCharacterSequence = [
  "先照，才有知。",
  "有知，才有行。",
  "行后，才有证。",
  "有证，才可复。",
  "反复，才成练。",
  "有界，才可信。"
];

export const brandMotionSystem = {
  title: "照骨动效语法",
  principle: "九个字只用九种克制动作；慢、轻、可复用，不做炫技。",
  mainMotion: {
    key: "zhao_stamp",
    character: "照",
    motion: "盖印",
    className: "motion-zhao-stamp",
    usage: "报告生成、完成状态、分享卡水印和视频片头。"
  },
  supportingMotions: [
    {
      key: "xin_gather",
      character: "心",
      motion: "微聚",
      className: "motion-xin-gather",
      usage: "测评入口、观心、第一念浮现。"
    },
    {
      key: "zhi_reveal",
      character: "知",
      motion: "显明",
      className: "motion-zhi-reveal",
      usage: "良知、明知、解释变清楚。"
    },
    {
      key: "xing_settle",
      character: "行",
      motion: "落位",
      className: "motion-xing-settle",
      usage: "行为训练、动作执行、知行合一。"
    },
    {
      key: "zhi_pause",
      character: "止",
      motion: "停顿",
      className: "motion-zhi-pause",
      usage: "停十秒、暂停、让念头露出来。"
    },
    {
      key: "zheng_stamp",
      character: "证",
      motion: "落章",
      className: "motion-zheng-stamp",
      usage: "心证、取证、复盘证据。"
    },
    {
      key: "fu_loop",
      character: "复",
      motion: "回环",
      className: "motion-fu-loop",
      usage: "复盘、回看、回到第一念。"
    },
    {
      key: "lian_sediment",
      character: "练",
      motion: "沉淀",
      className: "motion-lian-sediment",
      usage: "七日训练、完成态、长期塑形。"
    },
    {
      key: "jie_contain",
      character: "界",
      motion: "收束",
      className: "motion-jie-contain",
      usage: "合规边界、风险教育、不越界。"
    }
  ]
};

export function getBrandMotionByCharacter(character) {
  if (character === brandMotionSystem.mainMotion.character) return brandMotionSystem.mainMotion;

  return brandMotionSystem.supportingMotions.find((item) => item.character === character) || null;
}
