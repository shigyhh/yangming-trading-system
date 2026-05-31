import { getBehaviorMirrorSignal, type BehaviorMirrorId } from "./behavior-mirrors"
import { assessmentQuestions, type AssessmentQuestion, type AssessmentTag } from "./questions"

export type AssessmentAnswer = {
  questionId: string
  optionId: string
}

export type AssessmentTypeProfile = {
  key: AssessmentTag
  label: string
  poeticName: string
  summary: string
  risk: string
  training: string
  score: number
}

export type AssessmentReport = {
  createdAt: string
  totalQuestions: number
  answeredCount: number
  sourceMirror?: {
    id: BehaviorMirrorId
    name: string
    behavior: string
    thought: string
    thief: string[]
    verdict: string
  }
  primaryType: AssessmentTypeProfile
  secondaryType: AssessmentTypeProfile
  scores: Record<AssessmentTag, number>
  riskRadar: Array<{ key: string; label: string; value: number }>
  firstThought: string
  firstThoughtDisplay: string
  trainingDirection: string
  disclaimer: string
}

const typeProfiles: Record<AssessmentTag, Omit<AssessmentTypeProfile, "key" | "score">> = {
  fomo_chaser: {
    label: "冲动型",
    poeticName: "逐影者",
    summary: "你最容易被“再不上就错过了”带动。",
    risk: "容易在行情加速时提前进场，忽略原计划。",
    training: "冲动前 10 秒暂停，先确认是否符合入场条件。",
  },
  panic_runner: {
    label: "焦虑型",
    poeticName: "惊弓者",
    summary: "你最容易被“先跑再说”带动。",
    risk: "容易在波动中把正常回撤当成危险。",
    training: "建立亏损场景下的三呼吸确认动作。",
  },
  hold_and_hope: {
    label: "扛单型",
    poeticName: "抱亏者",
    summary: "你最容易被“它会回来”带动。",
    risk: "容易和亏损谈判，拖延执行失效条件。",
    training: "把止损条件提前写下，触发后只执行不解释。",
  },
  prove_self: {
    label: "偏执型",
    poeticName: "争胜者",
    summary: "你最容易被“我要证明我没错”带动。",
    risk: "容易把交易变成自我证明，而不是执行系统。",
    training: "每次交易前写下：这笔不是为了证明我是谁。",
  },
  revenge_rescuer: {
    label: "赌徒型",
    poeticName: "补漏者",
    summary: "你最容易被“我要打回来”带动。",
    risk: "连续不顺时容易加频、加仓、加情绪。",
    training: "设定连续亏损后的强制暂停规则。",
  },
  hesitant_watcher: {
    label: "拖延型",
    poeticName: "迟疑者",
    summary: "你最容易被“再等等”困住。",
    risk: "看见机会但难以行动，事后又被错过感拉回。",
    training: "每次只验证一个关键条件，减少反复确认。",
  },
  over_control: {
    label: "完美型",
    poeticName: "执镜者",
    summary: "你最容易被“必须完全确定”带动。",
    risk: "过度寻求确定性，错把控制感当安全感。",
    training: "区分“必要确认”和“焦虑确认”。",
  },
  numb_repeat: {
    label: "失察型",
    poeticName: "失明者",
    summary: "你最容易在违规后跳过复盘。",
    risk: "错误没有被命名，就会反复回来。",
    training: "用三句话复盘：触发点、第一念、下一次动作。",
  },
  disciplined_observer: {
    label: "平衡型",
    poeticName: "守心者",
    summary: "你已经具备一定的观察与暂停能力。",
    risk: "风险较低，但仍需要把稳定动作持续训练成习惯。",
    training: "继续巩固计划前置、触发确认、复盘记录。",
  },
}

const riskTypeKeys: AssessmentTag[] = [
  "fomo_chaser",
  "panic_runner",
  "hold_and_hope",
  "prove_self",
  "revenge_rescuer",
  "hesitant_watcher",
  "over_control",
  "numb_repeat",
]

const firstThoughtMap: Record<AssessmentTag, string> = {
  fomo_chaser: "再不上就错过了。",
  panic_runner: "先跑，亏损不能扩大。",
  hold_and_hope: "再等等，它会回来。",
  prove_self: "我要证明我没错。",
  revenge_rescuer: "我要打回来。",
  hesitant_watcher: "再等等，还不够确定。",
  over_control: "必须完全确认才安全。",
  numb_repeat: "算了，不想复盘。",
  disciplined_observer: "先停一下，看是否符合计划。",
}

const firstThoughtDisplayMap: Record<AssessmentTag, string> = {
  fomo_chaser: "再不上就错过了",
  panic_runner: "先跑再说",
  hold_and_hope: "它会回来",
  prove_self: "我要证明自己",
  revenge_rescuer: "我要打回来",
  hesitant_watcher: "再等等",
  over_control: "必须完全确认",
  numb_repeat: "算了，不想复盘",
  disciplined_observer: "先停一下",
}

function makeEmptyScores(): Record<AssessmentTag, number> {
  return Object.keys(typeProfiles).reduce((scores, key) => {
    scores[key as AssessmentTag] = 0
    return scores
  }, {} as Record<AssessmentTag, number>)
}

function toProfile(key: AssessmentTag, score: number): AssessmentTypeProfile {
  return {
    key,
    ...typeProfiles[key],
    score,
  }
}

export function getAssessmentTypeLabel(key: AssessmentTag) {
  return typeProfiles[key]?.label ?? "未定型"
}

function findSelectedOption(questions: AssessmentQuestion[], answer: AssessmentAnswer) {
  const question = questions.find((item) => item.id === answer.questionId)
  return question?.options.find((option) => option.id === answer.optionId)
}

function normalizeRiskValue(score: number) {
  return Math.max(0, Math.min(100, score * 20))
}

function getSourceMirror(mirrorId?: string | null) {
  const signal = getBehaviorMirrorSignal(mirrorId)
  if (!signal) return null

  return {
    id: signal.id,
    name: signal.name,
    behavior: signal.behavior,
    thought: signal.thought,
    thief: signal.thief,
    verdict: signal.verdict,
  }
}

export function generateAssessmentReport(
  answers: AssessmentAnswer[],
  questions: AssessmentQuestion[] = assessmentQuestions,
  sourceMirrorId?: string | null,
): AssessmentReport {
  const scores = makeEmptyScores()
  let answeredCount = 0
  const mirrorSignal = getBehaviorMirrorSignal(sourceMirrorId)

  answers.forEach((answer) => {
    const option = findSelectedOption(questions, answer)
    if (!option) return

    answeredCount += 1
    option.tags.forEach((tag) => {
      scores[tag] += option.weight
    })
  })

  if (mirrorSignal) {
    scores[mirrorSignal.assessmentTag] += mirrorSignal.id === "conscience" ? 3 : 4
  }

  const sortedAll = (Object.keys(scores) as AssessmentTag[])
    .map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score)

  const sortedRisks = riskTypeKeys
    .map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score)

  const observerScore = scores.disciplined_observer
  const highestRisk = sortedRisks[0]
  const primaryKey = highestRisk.score >= Math.max(2, observerScore * 0.6)
    ? highestRisk.key
    : sortedAll[0]?.key ?? "disciplined_observer"

  const secondaryKey = sortedAll.find((item) => item.key !== primaryKey)?.key ?? "disciplined_observer"

  const riskRadar = [
    { key: "impulse", label: "冲动追入", value: normalizeRiskValue(scores.fomo_chaser) },
    { key: "panic", label: "恐慌离场", value: normalizeRiskValue(scores.panic_runner) },
    { key: "holding", label: "扛单拖延", value: normalizeRiskValue(scores.hold_and_hope) },
    { key: "proving", label: "证明执念", value: normalizeRiskValue(scores.prove_self + scores.revenge_rescuer) },
    { key: "hesitation", label: "犹豫过控", value: normalizeRiskValue(scores.hesitant_watcher + scores.over_control) },
    { key: "review", label: "复盘失察", value: normalizeRiskValue(scores.numb_repeat) },
  ]

  const primaryType = toProfile(primaryKey, scores[primaryKey])

  return {
    createdAt: new Date().toISOString(),
    totalQuestions: questions.length,
    answeredCount,
    sourceMirror: getSourceMirror(sourceMirrorId) ?? undefined,
    primaryType,
    secondaryType: toProfile(secondaryKey, scores[secondaryKey]),
    scores,
    riskRadar,
    firstThought: mirrorSignal?.thought ?? firstThoughtMap[primaryKey],
    firstThoughtDisplay: mirrorSignal?.thought.replace(/[。？?]/g, "") ?? firstThoughtDisplayMap[primaryKey],
    trainingDirection: mirrorSignal?.training ?? primaryType.training,
    disclaimer: "本报告仅用于交易心理观察与训练，不预测行情，不提供买卖建议，不构成任何投资建议。",
  }
}

export function generateMirrorReport(mirrorId: string): AssessmentReport {
  return generateAssessmentReport([], [], mirrorId)
}
