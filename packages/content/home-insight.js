export const homeDailyInsightCards = [
  {
    key: "pause_before_chase",
    heartProof: "知而能停",
    reflectionTitle: "临盘照见",
    reflectionText: "见涨心动时，先看计划是否也动。",
    stageLabel: "心学关卡",
    stageValue: "事上练",
    actionLabel: "今日动作",
    actionValue: "停十秒",
  },
  {
    key: "write_boundary",
    heartProof: "先立其界",
    reflectionTitle: "临盘照见",
    reflectionText: "边界未写清，情绪就会替你改规则。",
    stageLabel: "心学关卡",
    stageValue: "立志关",
    actionLabel: "今日动作",
    actionValue: "写边界",
  },
  {
    key: "ask_self_first",
    heartProof: "主见先立",
    reflectionTitle: "临盘照见",
    reflectionText: "想问别人前，先写下自己的判断。",
    stageLabel: "心学关卡",
    stageValue: "照心关",
    actionLabel: "今日动作",
    actionValue: "先自问",
  },
  {
    key: "loss_cooling",
    heartProof: "不急翻回",
    reflectionTitle: "临盘照见",
    reflectionText: "上一笔的情绪，不该替下一笔下单。",
    stageLabel: "心学关卡",
    stageValue: "破心贼",
    actionLabel: "今日动作",
    actionValue: "离屏三分",
  },
  {
    key: "exit_rule",
    heartProof: "有出有入",
    reflectionTitle: "临盘照见",
    reflectionText: "只写入场，不算完整计划。",
    stageLabel: "心学关卡",
    stageValue: "知行合一",
    actionLabel: "今日动作",
    actionValue: "补离场",
  },
  {
    key: "reduce_noise",
    heartProof: "少听外声",
    reflectionTitle: "临盘照见",
    reflectionText: "外部越热闹，越要回到自己的条件表。",
    stageLabel: "心学关卡",
    stageValue: "照心关",
    actionLabel: "今日动作",
    actionValue: "关噪声",
  },
  {
    key: "review_one_error",
    heartProof: "一错即明",
    reflectionTitle: "临盘照见",
    reflectionText: "今天只复盘一个偏离点，让错误被命名。",
    stageLabel: "心学关卡",
    stageValue: "事上练",
    actionLabel: "今日动作",
    actionValue: "写一错",
  },
  {
    key: "do_not_overexplain",
    heartProof: "不为心辩",
    reflectionTitle: "临盘照见",
    reflectionText: "规则触发后，少解释一次，就多守住一次。",
    stageLabel: "心学关卡",
    stageValue: "致良知",
    actionLabel: "今日动作",
    actionValue: "照规则",
  },
]

export function getHomeDailyInsightCard(date = new Date()) {
  const dayIndex = getDayIndex(date)
  return homeDailyInsightCards[dayIndex % homeDailyInsightCards.length]
}

function getDayIndex(date) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return 0

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)
  const year = Number(parts.find((part) => part.type === "year")?.value || value.getUTCFullYear())
  const month = Number(parts.find((part) => part.type === "month")?.value || value.getUTCMonth() + 1)
  const day = Number(parts.find((part) => part.type === "day")?.value || value.getUTCDate())
  const utcDay = Date.UTC(year, month - 1, day)
  return Math.floor(utcDay / 86_400_000)
}
