export const personalityProfiles = {
  fomo_chaser: {
    label: "冲动型",
    poeticName: "逐影者",
    summary: "你最容易被“再不上就错过了”带动。",
    risk: "容易在行情加速时提前进场，忽略原计划。",
    training: "冲动前 10 秒暂停，先确认是否符合入场条件。",
    trigger: {
      key: "fear_of_missing_out",
      label: "怕错过",
      description: "快速波动、外界热闹、错过感升起时，更容易被第一念牵动。",
      firstThought: "再不上就错过了。"
    },
    camp: {
      name: "冲动型七日知行训练",
      reason: "当前最需要训练的是行动前暂停与计划复核。",
      focus: "照见怕错过、稳定暂停动作、形成复盘闭环。"
    }
  },
  panic_runner: {
    label: "焦虑型",
    poeticName: "惊弓者",
    summary: "你最容易被“先跑再说”带动。",
    risk: "容易在波动中把正常回撤当成危险。",
    training: "建立亏损场景下的三呼吸确认动作。",
    trigger: {
      key: "fear_of_loss",
      label: "怕失去",
      description: "波动放大、浮盈回吐或不确定感增强时，容易先求脱离。",
      firstThought: "先跑，亏损不能扩大。"
    },
    camp: {
      name: "焦虑型七日知行训练",
      reason: "当前最需要训练的是情绪升起后的确认动作。",
      focus: "照见恐惧、稳定呼吸、回到预设边界。"
    }
  },
  hold_and_hope: {
    label: "扛单型",
    poeticName: "抱亏者",
    summary: "你最容易被“它会回来”带动。",
    risk: "容易和亏损谈判，拖延执行失效条件。",
    training: "把止损条件提前写下，触发后只执行不解释。",
    trigger: {
      key: "unwilling_to_accept",
      label: "不甘认错",
      description: "条件失效、结果不如预期时，容易把希望当成判断。",
      firstThought: "再等等，它会回来。"
    },
    camp: {
      name: "扛单型七日知行训练",
      reason: "当前最需要训练的是边界触发后的执行动作。",
      focus: "照见不甘、前置边界、触发后不解释。"
    }
  },
  prove_self: {
    label: "偏执型",
    poeticName: "争胜者",
    summary: "你最容易被“我要证明我没错”带动。",
    risk: "容易把交易变成自我证明，而不是执行系统。",
    training: "每次交易前写下：这笔不是为了证明我是谁。",
    trigger: {
      key: "need_to_prove",
      label: "想证明",
      description: "被比较、被质疑或连续不顺时，容易把动作交给面子。",
      firstThought: "我要证明我没错。"
    },
    camp: {
      name: "偏执型七日知行训练",
      reason: "当前最需要训练的是把自我证明和执行动作分开。",
      focus: "照见证明心、降低对抗、回到系统条件。"
    }
  },
  revenge_rescuer: {
    label: "赌徒型",
    poeticName: "补漏者",
    summary: "你最容易被“我要打回来”带动。",
    risk: "连续不顺时容易加频、加动作、加情绪。",
    training: "设定连续亏损后的强制暂停规则。",
    trigger: {
      key: "want_to_win_back",
      label: "想扳回",
      description: "失守之后，容易急着用下一次动作修补上一刻的不舒服。",
      firstThought: "我要打回来。"
    },
    camp: {
      name: "赌徒型七日知行训练",
      reason: "当前最需要训练的是失守后的冷却与复盘。",
      focus: "照见补回冲动、练习暂停、记录触发。"
    }
  },
  hesitant_watcher: {
    label: "拖延型",
    poeticName: "迟疑者",
    summary: "你最容易被“再等等”困住。",
    risk: "看见机会但难以行动，事后又被错过感拉回。",
    training: "每次只验证一个关键条件，减少反复确认。",
    trigger: {
      key: "afraid_to_choose",
      label: "怕选错",
      description: "机会靠近但不够确定时，容易把确认变成拖延。",
      firstThought: "再等等，还不够确定。"
    },
    camp: {
      name: "拖延型七日知行训练",
      reason: "当前最需要训练的是把确认动作收束到一个关键条件。",
      focus: "照见迟疑、减少反复确认、练习小步执行。"
    }
  },
  over_control: {
    label: "完美型",
    poeticName: "执镜者",
    summary: "你最容易被“必须完全确定”带动。",
    risk: "过度寻求确定性，错把控制感当安全感。",
    training: "区分“必要确认”和“焦虑确认”。",
    trigger: {
      key: "need_total_control",
      label: "怕失控",
      description: "信息很多或边界模糊时，容易想把所有变量都确认完。",
      firstThought: "必须完全确认才安全。"
    },
    camp: {
      name: "完美型七日知行训练",
      reason: "当前最需要训练的是识别必要确认与焦虑确认。",
      focus: "照见控制心、减少过度验证、保留复盘证据。"
    }
  },
  numb_repeat: {
    label: "失察型",
    poeticName: "失明者",
    summary: "你最容易在违规后跳过复盘。",
    risk: "错误没有被命名，就会反复回来。",
    training: "用三句话复盘：触发点、第一念、下一次动作。",
    trigger: {
      key: "avoid_review",
      label: "不想回看",
      description: "发现自己又偏离时，容易用跳过复盘来回避不舒服。",
      firstThought: "算了，不想复盘。"
    },
    camp: {
      name: "失察型七日知行训练",
      reason: "当前最需要训练的是最小复盘动作。",
      focus: "照见逃避、命名触发、写下下一次动作。"
    }
  },
  disciplined_observer: {
    label: "平衡型",
    poeticName: "守心者",
    summary: "你已经具备一定的观察与暂停能力。",
    risk: "风险较低，但仍需要把稳定动作持续训练成习惯。",
    training: "继续巩固计划前置、触发确认、复盘记录。",
    trigger: {
      key: "return_to_plan",
      label: "先停一下",
      description: "情绪仍会升起，但你更容易先回到计划与边界。",
      firstThought: "先停一下，看是否符合计划。"
    },
    camp: {
      name: "平衡型七日巩固训练",
      reason: "当前重点是把稳定动作继续沉淀为习惯。",
      focus: "巩固计划前置、触发确认与复盘记录。"
    }
  }
};

export const riskTypeKeys = [
  "fomo_chaser",
  "panic_runner",
  "hold_and_hope",
  "prove_self",
  "revenge_rescuer",
  "hesitant_watcher",
  "over_control",
  "numb_repeat"
];

export const firstThoughtDisplayMap = Object.fromEntries(
  Object.entries(personalityProfiles).map(([key, profile]) => [
    key,
    profile.trigger.firstThought.replace(/[。？?]/g, "")
  ])
);

export const sevenDayTrainingPrescription = [
  {
    day: 1,
    theme: "照见第一念",
    action: "每次想立刻行动时，先写下此刻第一念。",
    reflectionPrompt: "今天最强的一次第一念是什么？"
  },
  {
    day: 2,
    theme: "停十秒",
    action: "行动前停十秒，只确认是否符合原计划。",
    reflectionPrompt: "停十秒后，动作有没有变慢？"
  },
  {
    day: 3,
    theme: "复核边界",
    action: "行动前写下理由、边界、退出条件。",
    reflectionPrompt: "今天是否先写边界，再决定动作？"
  },
  {
    day: 4,
    theme: "记录触发",
    action: "只记录触发情绪，不急于修正结果。",
    reflectionPrompt: "哪一种场景最容易牵动你？"
  },
  {
    day: 5,
    theme: "降低噪声",
    action: "盘中减少外部声音，只看自己的计划卡。",
    reflectionPrompt: "减少噪声后，心是否更稳？"
  },
  {
    day: 6,
    theme: "省察偏离",
    action: "复盘一次偏离计划的动作，只写一个可修正点。",
    reflectionPrompt: "下次最小可改动作是什么？"
  },
  {
    day: 7,
    theme: "复测准备",
    action: "回看 7 天记录，标出最常出现的心贼。",
    reflectionPrompt: "这 7 天最需要继续训练的一件事是什么？"
  }
];
