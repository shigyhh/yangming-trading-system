export type AssessmentTag =
  | "fomo_chaser"
  | "panic_runner"
  | "hold_and_hope"
  | "prove_self"
  | "revenge_rescuer"
  | "hesitant_watcher"
  | "over_control"
  | "numb_repeat"
  | "disciplined_observer"

export type AssessmentOption = {
  id: string
  text: string
  tags: AssessmentTag[]
  weight: number
}

export type AssessmentQuestion = {
  id: string
  scene: string
  title: string
  desc: string
  options: AssessmentOption[]
}

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: "q1",
    scene: "场景 01 · 拉升",
    title: "当行情突然快速拉升时，你心里最先出现的是哪一句？",
    desc: "价格突然拉起来，已经离开原来的计划区。屏幕还在跳，你的心先动了一下。",
    options: [
      { id: "q1_a", text: "“再不上就错过了。”", tags: ["fomo_chaser"], weight: 2 },
      { id: "q1_b", text: "“别人都赚到了，我不能落下。”", tags: ["prove_self", "fomo_chaser"], weight: 1 },
      { id: "q1_c", text: "“我还要再确认一下，万一是假突破。”", tags: ["over_control"], weight: 1 },
      { id: "q1_d", text: "“先停一下，看它是否符合我的计划。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q2",
    scene: "场景 02 · 反向",
    title: "当你刚进场，价格立刻反向波动时，你最容易怎么想？",
    desc: "刚刚下单，价格马上反着走。浮亏一出现，原先写好的计划开始变得刺眼。",
    options: [
      { id: "q2_a", text: "“不行，先跑，亏损不能扩大。”", tags: ["panic_runner"], weight: 2 },
      { id: "q2_b", text: "“再等等，它应该会回来。”", tags: ["hold_and_hope"], weight: 2 },
      { id: "q2_c", text: "“我得补一笔，把成本拉回来。”", tags: ["revenge_rescuer"], weight: 2 },
      { id: "q2_d", text: "“先看原来的失效条件有没有出现。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q3",
    scene: "场景 03 · 错过",
    title: "当你错过一波明显行情时，心里最常出现什么？",
    desc: "你看着行情走出来，却没有在里面。越看越觉得，刚才那一下是不是不该犹豫。",
    options: [
      { id: "q3_a", text: "“下一次我不能再慢了。”", tags: ["fomo_chaser"], weight: 2 },
      { id: "q3_b", text: "“是不是我判断力太差了？”", tags: ["prove_self"], weight: 2 },
      { id: "q3_c", text: "“我还是不适合做交易。”", tags: ["panic_runner", "numb_repeat"], weight: 1 },
      { id: "q3_d", text: "“错过就错过，只复盘是否属于我的机会。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q4",
    scene: "场景 04 · 不顺",
    title: "连续两三次不顺之后，你更像哪一种？",
    desc: "连续几笔都不顺，账户数字变得刺眼。你知道该慢下来，但心里开始不服。",
    options: [
      { id: "q4_a", text: "“今天必须打回来。”", tags: ["revenge_rescuer"], weight: 2 },
      { id: "q4_b", text: "“我要证明刚刚只是运气不好。”", tags: ["prove_self"], weight: 2 },
      { id: "q4_c", text: "“算了，不想看了，明天再说。”", tags: ["numb_repeat"], weight: 2 },
      { id: "q4_d", text: "“今天先降频，复盘后再决定。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q5",
    scene: "场景 05 · 模糊",
    title: "当机会看起来很好，但你的条件还没完全满足时，你通常会怎样？",
    desc: "机会看起来不错，但还差一个确认。规则和欲望之间，开始出现一条缝。",
    options: [
      { id: "q5_a", text: "“先进去一点，不然就没位置了。”", tags: ["fomo_chaser"], weight: 2 },
      { id: "q5_b", text: "“必须所有条件都完美，否则不能动。”", tags: ["over_control"], weight: 2 },
      { id: "q5_c", text: "“我会反复看，最后可能什么都没做。”", tags: ["hesitant_watcher"], weight: 2 },
      { id: "q5_d", text: "“只按预设条件，不提前，不幻想。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q6",
    scene: "场景 06 · 回吐",
    title: "当浮盈开始回吐时，你最容易出现哪句话？",
    desc: "刚有一点浮盈，价格又往回走。明明还在计划内，你却开始担心到手的东西消失。",
    options: [
      { id: "q6_a", text: "“先落袋为安，别又亏回去。”", tags: ["panic_runner"], weight: 2 },
      { id: "q6_b", text: "“再拿一下，可能还有更大空间。”", tags: ["hold_and_hope"], weight: 1 },
      { id: "q6_c", text: "“我这次一定要拿出一个漂亮结果。”", tags: ["prove_self"], weight: 2 },
      { id: "q6_d", text: "“按计划移动止损或分批处理。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q7",
    scene: "场景 07 · 比较",
    title: "当你看到别人晒盈利，而你没有跟上时，你最真实的反应是？",
    desc: "别人晒出了盈利截图，而你没有参与。那一刻，行情不只是在屏幕上，也开始在心里比较。",
    options: [
      { id: "q7_a", text: "“我不能比别人差。”", tags: ["prove_self"], weight: 2 },
      { id: "q7_b", text: "“下一个机会我一定要冲进去。”", tags: ["fomo_chaser"], weight: 2 },
      { id: "q7_c", text: "“他们是不是知道什么我不知道的？”", tags: ["over_control"], weight: 1 },
      { id: "q7_d", text: "“别人的交易不是我的系统。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q8",
    scene: "场景 08 · 止损",
    title: "当计划已经提示该止损，但你心里还想再等等时，你更像哪一种？",
    desc: "止损条件已经出现，你也看见了。可手没有动，心里先开始替这笔交易找理由。",
    options: [
      { id: "q8_a", text: "“再给它一点空间，也许会回来。”", tags: ["hold_and_hope"], weight: 2 },
      { id: "q8_b", text: "“这次止损就证明我错了。”", tags: ["prove_self"], weight: 2 },
      { id: "q8_c", text: "“我会很慌，直接乱点掉。”", tags: ["panic_runner"], weight: 2 },
      { id: "q8_d", text: "“到了失效条件就执行，不和亏损谈判。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q9",
    scene: "场景 09 · 失守",
    title: "当你明知道自己违规交易后，你通常会怎么处理？",
    desc: "你知道这笔交易不在计划内。结束之后，最难的不是看结果，而是看见自己刚才为什么失守。",
    options: [
      { id: "q9_a", text: "“不想看，过去就过去了。”", tags: ["numb_repeat"], weight: 2 },
      { id: "q9_b", text: "“我会找理由证明这次特殊。”", tags: ["prove_self"], weight: 2 },
      { id: "q9_c", text: "“我会马上再做一笔想补回来。”", tags: ["revenge_rescuer"], weight: 2 },
      { id: "q9_d", text: "“写下触发点、念头和动作。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q10",
    scene: "场景 10 · 空仓",
    title: "很长时间没有交易机会时，你最容易被什么带走？",
    desc: "很久没有符合条件的机会。市场还在动，你却空着仓，心里开始觉得自己是不是太慢了。",
    options: [
      { id: "q10_a", text: "“是不是该主动找点机会？”", tags: ["fomo_chaser"], weight: 2 },
      { id: "q10_b", text: "“我看得越久越不敢动。”", tags: ["hesitant_watcher"], weight: 2 },
      { id: "q10_c", text: "“我需要更多确认，不然不安全。”", tags: ["over_control"], weight: 2 },
      { id: "q10_d", text: "“没有符合条件，就继续等。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q11",
    scene: "场景 11 · 噪音",
    title: "行情剧烈波动、信息很多时，你的第一反应通常是？",
    desc: "消息很多，价格剧烈波动，群里也开始热闹。外面的声音一多，你的第一念也跟着浮出来。",
    options: [
      { id: "q11_a", text: "“太危险了，先离场再说。”", tags: ["panic_runner"], weight: 2 },
      { id: "q11_b", text: "“这里可能有大机会，不能错过。”", tags: ["fomo_chaser"], weight: 2 },
      { id: "q11_c", text: "“我要把所有信息都看完才能决定。”", tags: ["over_control"], weight: 2 },
      { id: "q11_d", text: "“只看和我计划相关的信息。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
  {
    id: "q12",
    scene: "场景 12 · 重复",
    title: "复盘时看到自己又犯了同一个错误，你心里更像哪一句？",
    desc: "省察时，你发现这不是第一次。相似的场景、相似的念头，又把你带回同一个动作。",
    options: [
      { id: "q12_a", text: "“怎么又这样，算了不想了。”", tags: ["numb_repeat"], weight: 2 },
      { id: "q12_b", text: "“其实这次情况不一样。”", tags: ["hold_and_hope", "prove_self"], weight: 1 },
      { id: "q12_c", text: "“我必须马上证明自己能改。”", tags: ["prove_self", "revenge_rescuer"], weight: 1 },
      { id: "q12_d", text: "“这说明我需要一个可执行的训练动作。”", tags: ["disciplined_observer"], weight: 1 },
    ],
  },
]
