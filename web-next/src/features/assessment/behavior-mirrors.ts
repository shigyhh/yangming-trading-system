import type { AssessmentTag } from "./questions"

export type BehaviorMirrorId =
  | "chasing"
  | "holdingLoss"
  | "fantasy"
  | "gambling"
  | "following"
  | "hesitation"
  | "procrastination"
  | "anxiety"
  | "conscience"

export type BehaviorMirrorSignal = {
  id: BehaviorMirrorId
  name: string
  behavior: string
  thought: string
  thief: string[]
  verdict: string
  assessmentTag: AssessmentTag
  training: string
}

export const behaviorMirrorSignals: BehaviorMirrorSignal[] = [
  {
    id: "chasing",
    name: "追涨之镜",
    behavior: "一涨就怕错过，手比规则快。",
    thought: "再不上车就来不及了。",
    thief: ["贪", "急"],
    verdict: "你追的不是行情，是怕被机会抛下的不安。",
    assessmentTag: "fomo_chaser",
    training: "看到快速拉升时，先问：这是否在我的计划内。",
  },
  {
    id: "holdingLoss",
    name: "扛单之镜",
    behavior: "一亏就不认错，把希望当判断。",
    thought: "再等等，说不定能回来。",
    thief: ["痴", "慢"],
    verdict: "你守住的不是仓位，是不愿承认错误的自己。",
    assessmentTag: "hold_and_hope",
    training: "失效条件触发后，不解释，只执行。",
  },
  {
    id: "fantasy",
    name: "幻想之镜",
    behavior: "明知走势变了，还等它回来证明自己。",
    thought: "它只是洗盘，后面一定会回来。",
    thief: ["痴"],
    verdict: "你等的不是反转，是想让市场替你证明没错。",
    assessmentTag: "prove_self",
    training: "走势变了，就回到条件，不用故事补规则。",
  },
  {
    id: "gambling",
    name: "赌性之镜",
    behavior: "亏后想一把翻身，把交易变成押注。",
    thought: "这一把做对，就能全回来。",
    thief: ["贪", "急", "痴"],
    verdict: "你不是在交易，是在用下一笔逃避上一笔。",
    assessmentTag: "revenge_rescuer",
    training: "连续亏损后先停下来，不用下一笔修复上一笔。",
  },
  {
    id: "following",
    name: "从众之镜",
    behavior: "别人一说就心乱，把主见交给外界。",
    thought: "他们都说能涨，我是不是也该进？",
    thief: ["疑", "惧"],
    verdict: "你听见的不是消息，是自己不敢负责的声音。",
    assessmentTag: "over_control",
    training: "听到外界观点后，先回到自己的条件表。",
  },
  {
    id: "hesitation",
    name: "犹疑之镜",
    behavior: "看对不敢做，做了又拿不住。",
    thought: "再确认一下吧，万一错了怎么办？",
    thief: ["疑", "惧"],
    verdict: "你不是缺信号，是在寻找一个不会犯错的保证。",
    assessmentTag: "hesitant_watcher",
    training: "只验证一个关键条件，够了就行动。",
  },
  {
    id: "procrastination",
    name: "拖延之镜",
    behavior: "知道该复盘、该建规则，却总说明天。",
    thought: "今天太累了，明天再复盘。",
    thief: ["慢"],
    verdict: "你拖延的不是复盘，是面对自己的那一刻。",
    assessmentTag: "numb_repeat",
    training: "收盘后只写一条错误，不求完整。",
  },
  {
    id: "anxiety",
    name: "焦虑之镜",
    behavior: "赚一点怕回吐，亏一点就慌乱。",
    thought: "先卖一点吧，万一跌下来呢？",
    thief: ["惧", "疑"],
    verdict: "你卖掉的不是仓位，是承受波动的能力。",
    assessmentTag: "panic_runner",
    training: "浮盈出现后，先看计划，不看账户数字。",
  },
  {
    id: "conscience",
    name: "良知之镜",
    behavior: "看见情绪起伏，仍按规则行动。",
    thought: "我看见情绪了，但这次按规则来。",
    thief: ["知止", "守心", "执行"],
    verdict: "情绪仍会起，但你不再把方向盘交给它。",
    assessmentTag: "disciplined_observer",
    training: "先看见这一念，再按规则走一步。",
  },
]

export const behaviorMirrorSignalById = behaviorMirrorSignals.reduce(
  (signals, signal) => {
    signals[signal.id] = signal
    return signals
  },
  {} as Record<BehaviorMirrorId, BehaviorMirrorSignal>,
)

export function isBehaviorMirrorId(value?: string | null): value is BehaviorMirrorId {
  return Boolean(value && value in behaviorMirrorSignalById)
}

export function getBehaviorMirrorSignal(value?: string | null) {
  return isBehaviorMirrorId(value) ? behaviorMirrorSignalById[value] : null
}
