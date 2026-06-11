"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { CSSProperties } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type CycleNode = {
  key: "trigger" | "thought" | "action" | "result" | "retrigger"
  title: string
  short: string
  detail: string
}

export type CycleMirrorCase = {
  id: string
  sourceMirror: string
  title: string
  status: string
  verdict: string
  practice: string
  dataSourceLabel?: string
  sourceId?: string
  nodes: CycleNode[]
}

const cycleCases: CycleMirrorCase[] = [
  {
    id: "anxiety",
    sourceMirror: "焦虑之镜",
    title: "止盈过早循环",
    status: "刚有浮盈，心已动。",
    verdict: "你卖掉的不是仓位，是承受波动的能力。",
    practice: "今日只练一件事：浮盈出现后，先看计划，不看账户数字。",
    nodes: [
      { key: "trigger", title: "触发", short: "账户刚变绿。", detail: "价格刚往有利方向走，你的眼睛已经从计划移到“到手的钱”。" },
      { key: "thought", title: "念头", short: "先卖一点吧。", detail: "心里那句最响的是：先落袋为安，别一会儿又亏回去。" },
      { key: "action", title: "动作", short: "规则没破，我先跑了。", detail: "原计划还没失效，但手已经替恐惧做了决定。" },
      { key: "result", title: "结果", short: "卖完它继续涨。", detail: "价格继续走，你看着空出来的位置，懊悔和不甘又起来。" },
      { key: "retrigger", title: "再次触发", short: "下次更想先落袋。", detail: "下一次刚有浮盈，你更想提前离场，循环又回来了。" },
    ],
  },
  {
    id: "holdingLoss",
    sourceMirror: "扛单之镜",
    title: "亏损不认错循环",
    status: "止损已到，心还在谈判。",
    verdict: "你扛住的不是仓位，是不愿承认错误的自己。",
    practice: "今日只练一件事：失效条件触发后，不解释，只执行。",
    nodes: [
      { key: "trigger", title: "触发", short: "已经打到止损。", detail: "原本写好的失效条件出现了，计划已经给出答案。" },
      { key: "thought", title: "念头", short: "再等等，说不定回来。", detail: "你开始找理由：也许是假跌，也许只是洗一下。" },
      { key: "action", title: "动作", short: "我把止损撤了。", detail: "你把规则改成希望，把执行改成等待。" },
      { key: "result", title: "结果", short: "亏损越扛越大。", detail: "仓位还在，心却越来越急，后面每一次波动都更刺眼。" },
      { key: "retrigger", title: "再次触发", short: "下次更不想认错。", detail: "因为上一次亏得太痛，下一次更想证明自己没有错。" },
    ],
  },
  {
    id: "chasing",
    sourceMirror: "追涨之镜",
    title: "怕错过追涨循环",
    status: "一念怕错过，循环已起。",
    verdict: "你追的不是行情，是怕被机会抛下的不安。",
    practice: "今日只练一件事：没有系统信号，不主动找机会。",
    nodes: [
      { key: "trigger", title: "怕错过", short: "怕错过。", detail: "行情一拉，你先感到的不是机会，而是自己要被落下。" },
      { key: "thought", title: "追涨", short: "追进去。", detail: "你把等待看成失败，规则还没说话，手已经动了。" },
      { key: "action", title: "被套", short: "一买就被套。", detail: "买点追在情绪高处，价格一回落，心也跟着沉下去。" },
      { key: "result", title: "不甘", short: "不甘心。", detail: "你不想承认这笔是情绪驱动，开始找理由、等反弹。" },
      { key: "retrigger", title: "再次追涨", short: "下次再次追涨。", detail: "你把亏损理解成慢了半拍，于是下一次更怕错过。" },
    ],
  },
  {
    id: "gambling",
    sourceMirror: "执念之镜",
    title: "亏后翻本循环",
    status: "刚亏一笔，心想讨回。",
    verdict: "你不是在交易，是在用下一笔逃避上一笔。",
    practice: "今日只练一件事：连续亏损后，先停，不立刻寻找下一笔。",
    nodes: [
      { key: "trigger", title: "触发", short: "刚亏完一笔。", detail: "账户数字变少，心里先出现的是不服和急。" },
      { key: "thought", title: "念头", short: "下一把打回来。", detail: "你想快速修复结果，也想修复被亏损刺到的自我。" },
      { key: "action", title: "动作", short: "仓位和频率都上去了。", detail: "交易从执行系统变成押注，仓位替情绪说话。" },
      { key: "result", title: "结果", short: "越想翻，越失控。", detail: "越想翻回，越容易把节奏交给上一笔亏损。" },
      { key: "retrigger", title: "再次触发", short: "更急着找下一把。", detail: "亏损越大，越想证明还能赢，循环更深。" },
    ],
  },
  {
    id: "hesitation",
    sourceMirror: "犹疑之镜",
    title: "看对不敢做循环",
    status: "机会已现，心还在求保。",
    verdict: "你不是缺信号，是在寻找一个不会犯错的保证。",
    practice: "今日只练一件事：只验证一个关键条件，够了就行动。",
    nodes: [
      { key: "trigger", title: "触发", short: "它到计划区了。", detail: "条件已经大致满足，但你还想多看一点。" },
      { key: "thought", title: "念头", short: "万一我一做就错呢？", detail: "你不是在确认机会，而是在寻找绝对安全。" },
      { key: "action", title: "动作", short: "我又多等了一个确认。", detail: "你把准备做成拖延，把谨慎做成退缩。" },
      { key: "result", title: "结果", short: "看对了，但没上。", detail: "行情走出来后，你又被懊悔和自责拉住。" },
      { key: "retrigger", title: "再次触发", short: "下次更不敢下手。", detail: "越懊悔，越想下次完全确认，循环继续。" },
    ],
  },
  {
    id: "fantasy",
    sourceMirror: "幻想之镜",
    title: "走势幻想循环",
    status: "走势已变，心还在等。",
    verdict: "你等的不是反转，是想让市场替你证明没错。",
    practice: "今日只练一件事：走势失效后，不用故事补规则。",
    nodes: [
      { key: "trigger", title: "触发", short: "走势已经不对了。", detail: "原来的走势不再成立，盘口和节奏都在提醒你：这笔交易变了。" },
      { key: "thought", title: "念头", short: "它只是洗一下。", detail: "你不愿承认判断失效，开始用一句“洗盘”替自己争取时间。" },
      { key: "action", title: "动作", short: "我继续等它回来。", detail: "你把退出条件放到一边，等市场回来证明自己当初没错。" },
      { key: "result", title: "结果", short: "能走的位置错过了。", detail: "价格越走越远，能主动处理的位置变成了被动承受的位置。" },
      { key: "retrigger", title: "再次触发", short: "下次更会编理由。", detail: "上一次没有及时承认变化，下一次就更容易把幻想当判断。" },
    ],
  },
  {
    id: "following",
    sourceMirror: "从众之镜",
    title: "跟风失主循环",
    status: "别人一说，心就外求。",
    verdict: "你听见的不是消息，是自己不敢负责的声音。",
    practice: "今日只练一件事：听到观点后，先回到自己的条件表。",
    nodes: [
      { key: "trigger", title: "触发", short: "群里都在说它。", detail: "一条消息、一个观点、几句热闹讨论，让你原本的计划开始松动。" },
      { key: "thought", title: "念头", short: "他们是不是知道什么？", detail: "你开始怀疑自己的判断，把外界声音当成更可靠的答案。" },
      { key: "action", title: "动作", short: "我放下计划跟了。", detail: "你没有重新验证条件，只是借别人的确定感安放自己的不安。" },
      { key: "result", title: "结果", short: "涨跌都怪到别人身上。", detail: "赚钱也不是自己的系统，亏钱更难真正复盘，因为理由在别人身上。" },
      { key: "retrigger", title: "再次触发", short: "下次更想听答案。", detail: "越不敢负责，越想在外面找确定，主见又一次被交出去。" },
    ],
  },
  {
    id: "procrastination",
    sourceMirror: "拖延之镜",
    title: "复盘拖延循环",
    status: "知道该复盘，手却停在明天。",
    verdict: "你拖延的不是复盘，是面对自己的那一刻。",
    practice: "今日只练一件事：收盘后只写一条错误，不求完整。",
    nodes: [
      { key: "trigger", title: "触发", short: "今天又没按计划。", detail: "你知道这笔交易有问题，也知道该把它写下来。" },
      { key: "thought", title: "念头", short: "太累了，明天再复盘。", detail: "你把复盘推到明天，好像推迟记录，错误就不会那么刺眼。" },
      { key: "action", title: "动作", short: "我直接关掉记录。", detail: "页面关了，情绪也压下去了，但问题没有被真正看见。" },
      { key: "result", title: "结果", short: "错误没有被写下来。", detail: "没有被命名的错误，会继续以同样的方式回来。" },
      { key: "retrigger", title: "再次触发", short: "下次还是这个反应。", detail: "因为没有复盘成规则，下一次遇到相似情境，身体还是按旧惯性行动。" },
    ],
  },
  {
    id: "conscience",
    sourceMirror: "良知之镜",
    title: "规则守心循环",
    status: "情绪仍起，手先守住。",
    verdict: "情绪仍会起，但你不再把方向盘交给它。",
    practice: "今日只练一件事：先看见这一念，再按规则走一步。",
    nodes: [
      { key: "trigger", title: "触发", short: "情绪也起来了。", detail: "行情一动，贪、惧、急、疑也会动，但这一次你先看见了它。" },
      { key: "thought", title: "念头", short: "我看见这一念。", detail: "你没有立刻压住情绪，也没有立刻跟着情绪走，只是先把它照出来。" },
      { key: "action", title: "动作", short: "我先停三秒看规则。", detail: "你的手慢下来，先回到进出条件、仓位边界和失效位置。" },
      { key: "result", title: "结果", short: "这次没交给情绪。", detail: "结果未必马上变好，但这一次交易不是由冲动接管。" },
      { key: "retrigger", title: "再次触发", short: "下次更容易守住。", detail: "每一次看见而不被牵走，都会让下一次执行规则更容易一点。" },
    ],
  },
]

const aliasToCaseId: Record<string, string> = {
  anxiety: "anxiety",
  panic_runner: "anxiety",
  holdingLoss: "holdingLoss",
  hold_and_hope: "holdingLoss",
  chasing: "chasing",
  fomo_chaser: "chasing",
  gambling: "gambling",
  revenge_rescuer: "gambling",
  hesitation: "hesitation",
  hesitant_watcher: "hesitation",
  over_control: "hesitation",
  fantasy: "fantasy",
  prove_self: "fantasy",
  following: "following",
  procrastination: "procrastination",
  numb_repeat: "procrastination",
  conscience: "conscience",
  disciplined_observer: "conscience",
}

const cycleThiefOrbit = ["贪", "急", "惧", "疑", "慢", "痴"]

const cycleThiefPositions = [
  { x: 0, y: -48 },
  { x: 42, y: -24 },
  { x: 42, y: 24 },
  { x: 0, y: 48 },
  { x: -42, y: 24 },
  { x: -42, y: -24 },
]

const cycleThievesByCaseId: Record<string, string[]> = {
  anxiety: ["惧", "疑"],
  holdingLoss: ["痴", "慢"],
  chasing: ["贪", "急"],
  gambling: ["贪", "急", "痴"],
  hesitation: ["疑", "惧"],
  fantasy: ["痴"],
  following: ["疑", "惧"],
  procrastination: ["慢"],
  conscience: ["知止", "守心", "执行"],
}

const cycleThiefDescriptions: Record<string, string> = {
  贪: "想多拿一点，忘了边界。",
  急: "等不及，手比规则快。",
  惧: "怕失去，先把心交出去。",
  疑: "不信规则，开始外求。",
  慢: "该断不断，一拖再拖。",
  痴: "看不清，也不愿承认。",
}

type CycleMirrorProps = {
  initialMirrorId?: string
  onMirrorChange?: (mirrorId: string) => void
}

const nodeBaseAngles = [-90, -18, 54, 126, 198]

function resolveCase(mirrorId?: string | null) {
  const caseId = mirrorId ? aliasToCaseId[mirrorId] ?? mirrorId : "anxiety"
  return cycleCases.find((item) => item.id === caseId) ?? cycleCases[0]
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

function getNodeVisual(angle: number) {
  const rad = (angle * Math.PI) / 180
  const depth = (Math.sin(rad) + 1) / 2
  const x = Math.cos(rad) * 146
  const y = Math.sin(rad) * 136
  const scale = 0.68 + depth * 0.34
  const opacity = 0.22 + depth * 0.72
  const blur = (1 - depth) * 2.8

  return {
    x,
    y,
    scale,
    opacity,
    blur,
    depth,
    zIndex: Math.round(depth * 100),
  }
}

export function CycleMirror({ initialMirrorId, onMirrorChange }: CycleMirrorProps) {
  const reduceMotion = useReducedMotion()
  const cycle = useMemo(() => resolveCase(initialMirrorId), [initialMirrorId])
  const [angleOffset, setAngleOffset] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null)
  const [accepted, setAccepted] = useState(false)
  const touchStartXRef = useRef<number | null>(null)

  const nodeVisuals = useMemo(
    () =>
      cycle.nodes.map((node, index) => {
        const angle = normalizeDegrees(nodeBaseAngles[index] + angleOffset)
        return { node, index, angle, ...getNodeVisual(angle) }
      }),
    [angleOffset, cycle.nodes],
  )

  const focusedIndex = useMemo(() => {
    if (revealedIndex !== null) return revealedIndex

    return nodeVisuals.reduce((current, item) => (item.depth > nodeVisuals[current].depth ? item.index : current), 0)
  }, [nodeVisuals, revealedIndex])

  const focusedVisual = nodeVisuals.find((item) => item.index === focusedIndex) ?? nodeVisuals[0]
  const activeNode = cycle.nodes[focusedIndex]
  const activeThieves = cycleThievesByCaseId[cycle.id] ?? []
  const isConscienceCycle = cycle.id === "conscience"
  const causalLineLength = Math.max(48, Math.sqrt(focusedVisual.x ** 2 + focusedVisual.y ** 2))
  const causalLineAngle = (Math.atan2(focusedVisual.y, focusedVisual.x) * 180) / Math.PI - 90

  useEffect(() => {
    if (reduceMotion || revealedIndex !== null) return

    let frameId = 0
    let previousTime = performance.now()

    const tick = (time: number) => {
      const delta = Math.min(time - previousTime, 64)
      previousTime = time
      const degreesPerSecond = hovered ? 5 : 17

      setAngleOffset((current) => current + (delta / 1000) * degreesPerSecond)
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [hovered, reduceMotion, revealedIndex])

  useEffect(() => {
    onMirrorChange?.(cycle.id)
  }, [cycle.id, onMirrorChange])

  const revealNode = useCallback((index: number) => {
    setRevealedIndex(index)
    setAccepted(false)
  }, [])

  const continueSeeing = () => {
    setRevealedIndex(null)
    setAccepted(false)
    setAngleOffset((current) => current + 72)
  }

  const switchBySwipe = (direction: -1 | 1) => {
    const nextIndex = (focusedIndex + direction + cycle.nodes.length) % cycle.nodes.length
    revealNode(nextIndex)
  }

  return (
    <section
      className={cn("cycle-mirror", revealedIndex !== null && "is-revealed")}
      aria-label="循环之镜"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={(event) => {
        touchStartXRef.current = event.touches[0]?.clientX ?? null
        setHovered(true)
      }}
      onTouchEnd={(event) => {
        const startX = touchStartXRef.current
        touchStartXRef.current = null
        setHovered(false)

        if (startX === null) return

        const endX = event.changedTouches[0]?.clientX ?? startX
        const deltaX = endX - startX
        if (Math.abs(deltaX) > 36) switchBySwipe(deltaX > 0 ? -1 : 1)
      }}
    >
      <div className="cycle-space" aria-hidden="true">
        <span className="mist mist-one" />
        <span className="mist mist-two" />
        <span className="star-track track-one" />
        <span className="star-track track-two" />
        <span className="particle particle-one" />
        <span className="particle particle-two" />
        <span className="particle particle-three" />
      </div>

      <header className="cycle-header">
        <p className="source-mirror">{cycle.sourceMirror}之后</p>
        <h1>循环之镜</h1>
        <p>照见你反复犯错的那条因果链。</p>
      </header>

      <div className="cycle-stage">
        <div className="cycle-orbit" aria-live="polite">
          <div
            className="causal-line"
            style={{
              height: causalLineLength,
              transform: `translateX(-50%) rotate(${causalLineAngle}deg)`,
            }}
          />
          <div className="orbit-shadow" aria-hidden="true" />
          <div className="orbit-path orbit-path-one" aria-hidden="true" />
          <div className="orbit-path orbit-path-two" aria-hidden="true" />

          <motion.div
            key={`${cycle.id}-${focusedIndex}-${revealedIndex ?? "idle"}`}
            className={cn("water-mirror", revealedIndex !== null && "is-rippling")}
            initial={{ filter: "blur(6px)", opacity: 0.72 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="water-depth" aria-hidden="true" />
            <span className="water-reflection" aria-hidden="true" />
            <span className="water-ripple ripple-one" aria-hidden="true" />
            <span className="water-ripple ripple-two" aria-hidden="true" />
            <p className="mirror-status">{cycle.status}</p>
            <p className="mirror-verdict">{revealedIndex === null ? "不是行情重复伤你，是同一个念头反复牵动你。" : cycle.verdict}</p>
          </motion.div>

          <div className="causal-nodes">
            {nodeVisuals.map((item) => {
              const isFocused = item.index === focusedIndex
              const isRevealed = item.index === revealedIndex

              return (
                <motion.button
                  key={item.node.key}
                  type="button"
                  className={cn("causal-fragment", isFocused && "is-focused", isRevealed && "is-open")}
                  aria-pressed={isRevealed}
                  aria-label={`${item.node.short}：${item.node.detail}`}
                  animate={{
                    x: item.x,
                    y: item.y,
                    scale: isRevealed ? 1.08 : item.scale,
                    opacity: isRevealed ? 1 : item.opacity,
                    filter: `blur(${isRevealed ? 0 : item.blur}px)`,
                  }}
                  transition={{ duration: 0.54, ease: [0.22, 1, 0.36, 1] }}
                  style={{ zIndex: isRevealed ? 120 : item.zIndex + 20 }}
                  onClick={() => revealNode(item.index)}
                  onFocus={() => setHovered(true)}
                  onBlur={() => setHovered(false)}
                >
                  {isFocused || isRevealed ? (
                    <>
                      <span className="fragment-short">{item.node.short}</span>
                    </>
                  ) : (
                    <span className="fragment-dot" aria-hidden="true" />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      <motion.div
        key={`${cycle.id}-${activeNode.key}-${revealedIndex ?? "focus"}`}
        className={cn("cycle-inscription", revealedIndex !== null && "is-complete")}
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="inscription-label">{revealedIndex === null ? "这一步正在靠近" : "这一幕显影"}</p>
        {revealedIndex !== null ? <h2>{activeNode.short}</h2> : null}
        <p>{revealedIndex === null ? activeNode.short : activeNode.detail}</p>
      </motion.div>

      {revealedIndex !== null ? (
        <motion.div
          key={`${cycle.id}-thieves-${revealedIndex}`}
          className={cn("cycle-thief-constellation", isConscienceCycle && "is-liangzhi")}
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.62, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          aria-label={isConscienceCycle ? "良知显影" : "六贼后显"}
        >
          <p>{isConscienceCycle ? "良知显影" : "六贼后显"}</p>
          {isConscienceCycle ? (
            <div className="cycle-virtue-list">
              {activeThieves.map((virtue) => (
                <span key={virtue}>{virtue}</span>
              ))}
            </div>
          ) : (
            <>
              <span className="cycle-thief-ring" aria-hidden="true" />
              {cycleThiefOrbit.map((thief, index) => {
                const position = cycleThiefPositions[index]
                const active = activeThieves.includes(thief)

                return (
                  <span
                    key={thief}
                    className={cn("cycle-thief-star", active && "is-active")}
                    style={{
                      "--cycle-thief-x": `${position.x}px`,
                      "--cycle-thief-y": `${position.y}px`,
                    } as CSSProperties}
                  >
                    {thief}
                    {active ? <small>{cycleThiefDescriptions[thief]}</small> : null}
                  </span>
                )
              })}
            </>
          )}
        </motion.div>
      ) : null}

      {revealedIndex !== null ? (
        <div className={cn("cycle-action-rail", accepted && "has-practice")}>
          <button type="button" onClick={continueSeeing}>
            继续照见
          </button>
          <button type="button" className={cn(accepted && "is-accepted")} onClick={() => setAccepted(true)}>
            {accepted ? "已收下这一念" : "收下这一念"}
          </button>
          {accepted ? <Link href="/practice-change">进入今日修行</Link> : null}
        </div>
      ) : null}

      <p className="practice-line">{accepted ? cycle.practice : "轻触一段真实交易反应，看它如何把你牵回同一个循环。"}</p>

      <style jsx global>{`
        .cycle-mirror {
          position: relative;
          min-height: auto;
          overflow: hidden;
          padding: 4px 0 0;
          text-align: center;
          isolation: isolate;
        }

        .cycle-space {
          position: absolute;
          inset: -5% -18%;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .mist,
        .star-track,
        .particle {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .mist {
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(214, 183, 111, 0.11), transparent 66%);
          filter: blur(18px);
          opacity: 0.66;
        }

        .mist-one {
          left: 0;
          top: 10%;
          width: 82%;
          height: 28%;
          animation: mist-drift 18s ease-in-out infinite;
        }

        .mist-two {
          right: -8%;
          bottom: 12%;
          width: 72%;
          height: 30%;
          background: radial-gradient(ellipse, rgba(95, 132, 117, 0.12), transparent 68%);
          animation: mist-drift 21s ease-in-out infinite reverse;
        }

        .star-track {
          left: 50%;
          top: 46%;
          width: min(118vw, 620px);
          height: 210px;
          border: 1px solid rgba(180, 157, 93, 0.08);
          border-radius: 50%;
          opacity: 0.2;
          transform: translate(-50%, -50%) rotate(-10deg);
          box-shadow: inset 0 0 34px rgba(180, 157, 93, 0.025);
        }

        .track-two {
          width: min(105vw, 540px);
          height: 150px;
          border-style: dashed;
          border-color: rgba(95, 132, 117, 0.11);
          transform: translate(-50%, -50%) rotate(18deg);
        }

        .particle {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(216, 183, 111, 0.68);
          box-shadow: 0 0 14px rgba(216, 183, 111, 0.34);
          animation: particle-orbit 11s linear infinite;
        }

        .particle-one {
          left: 22%;
          top: 31%;
        }

        .particle-two {
          right: 18%;
          top: 42%;
          animation-duration: 14s;
          animation-delay: -3s;
        }

        .particle-three {
          left: 46%;
          bottom: 18%;
          animation-duration: 17s;
          animation-delay: -6s;
        }

        .cycle-header {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 7px;
          justify-items: center;
          margin-top: 4px;
        }

        .source-mirror {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.74);
        }

        .cycle-header h1 {
          margin: 0;
          font-family: var(--font-world);
          font-size: clamp(2.28rem, 10vw, 3.28rem);
          font-weight: 300;
          line-height: 1.06;
          letter-spacing: 0.09em;
          color: rgba(242, 235, 220, 0.92);
          text-shadow: 0 0 28px rgba(216, 183, 111, 0.07);
          transform: translateX(0.045em);
        }

        .cycle-header p:last-child {
          max-width: 21em;
          margin: 0;
          font-family: var(--font-narrative);
          font-size: 0.92rem;
          font-weight: 300;
          line-height: 1.72;
          letter-spacing: 0.035em;
          color: rgba(220, 212, 195, 0.5);
        }

        .cycle-stage {
          position: relative;
          z-index: 2;
          width: 100%;
          height: clamp(302px, 76vw, 350px);
          margin: 14px auto 0;
        }

        .cycle-orbit {
          position: relative;
          z-index: 2;
          width: min(100%, 390px);
          height: 100%;
          margin: 0 auto;
          perspective: 980px;
        }

        .orbit-shadow,
        .orbit-path,
        .water-mirror,
        .causal-nodes,
        .causal-line {
          position: absolute;
          left: 50%;
          top: 50%;
        }

        .orbit-shadow {
          z-index: 1;
          width: 330px;
          height: 122px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(0, 0, 0, 0.52), transparent 72%);
          filter: blur(10px);
          transform: translate(-50%, 76%);
        }

        .orbit-path {
          z-index: 8;
          border: 1px solid rgba(180, 157, 93, 0.13);
          border-radius: 50%;
          opacity: 0.3;
          pointer-events: none;
        }

        .orbit-path-one {
          width: 302px;
          height: 168px;
          transform: translate(-50%, -50%) rotate(-11deg);
          animation: path-turn 24s linear infinite;
        }

        .orbit-path-two {
          width: 258px;
          height: 128px;
          border-style: dashed;
          border-color: rgba(95, 132, 117, 0.14);
          transform: translate(-50%, -50%) rotate(18deg);
          animation: path-turn 19s linear infinite reverse;
        }

        .causal-line {
          z-index: 28;
          width: 1px;
          background: linear-gradient(180deg, rgba(216, 183, 111, 0.52), rgba(216, 183, 111, 0.16), transparent);
          opacity: 0.54;
          transform-origin: 50% 0%;
          pointer-events: none;
        }

        .water-mirror {
          z-index: 34;
          display: grid;
          grid-template-rows: 1fr auto auto 1fr;
          width: clamp(176px, 49vw, 204px);
          height: clamp(176px, 49vw, 204px);
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(216, 183, 111, 0.64);
          border-radius: 50%;
          background:
            radial-gradient(circle at 44% 32%, rgba(242, 235, 220, 0.2), transparent 20%),
            radial-gradient(circle at 48% 52%, rgba(95, 132, 117, 0.42), transparent 55%),
            radial-gradient(circle at 50% 72%, rgba(180, 157, 93, 0.14), transparent 60%),
            linear-gradient(145deg, rgba(13, 48, 46, 0.98), rgba(4, 13, 13, 0.98));
          box-shadow:
            0 26px 74px rgba(0, 0, 0, 0.54),
            0 0 88px rgba(95, 132, 117, 0.22),
            0 0 54px rgba(180, 157, 93, 0.16),
            inset 0 0 78px rgba(0, 0, 0, 0.72),
            inset 0 0 0 10px rgba(214, 183, 111, 0.07);
          transform: translate(-50%, -50%);
          outline: 1px solid rgba(216, 183, 111, 0.12);
          outline-offset: 8px;
          animation: cycle-water-breathe 6.4s ease-in-out infinite;
        }

        .water-mirror::before {
          content: "";
          position: absolute;
          inset: 14px;
          border: 1px dashed rgba(220, 212, 195, 0.12);
          border-radius: inherit;
        }

        .water-reflection {
          position: absolute;
          inset: -20% -8% 48%;
          transform: rotate(-14deg);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent);
          opacity: 0.56;
          animation: water-glide 7s ease-in-out infinite;
          pointer-events: none;
        }

        .water-depth {
          position: absolute;
          inset: 10%;
          border-radius: 50%;
          background:
            repeating-radial-gradient(circle, rgba(220, 212, 195, 0.05) 0 1px, transparent 1px 14px),
            radial-gradient(circle at 52% 54%, rgba(216, 183, 111, 0.08), transparent 60%);
          opacity: 0.58;
          animation: water-depth-shift 8s ease-in-out infinite;
          pointer-events: none;
        }

        .water-ripple {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 56px;
          height: 56px;
          border: 1px solid rgba(216, 183, 111, 0.36);
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
          pointer-events: none;
        }

        .ripple-one,
        .water-mirror.is-rippling .ripple-one {
          animation: ripple-out 1.1s ease-out forwards;
        }

        .ripple-two,
        .water-mirror.is-rippling .ripple-two {
          animation: ripple-out 1.1s ease-out 180ms forwards;
        }

        .mirror-status,
        .mirror-verdict {
          position: relative;
          z-index: 2;
          max-width: 82%;
          margin: 0;
          text-align: center;
        }

        .mirror-status {
          grid-row: 2;
          align-self: end;
          font-family: var(--font-narrative);
          font-size: clamp(1.05rem, 4.7vw, 1.32rem);
          font-weight: 300;
          line-height: 1.55;
          letter-spacing: 0.05em;
          color: rgba(242, 235, 220, 0.9);
        }

        .mirror-verdict {
          grid-row: 3;
          align-self: start;
          margin-top: 8px;
          font-family: var(--font-function);
          font-size: 0.72rem;
          line-height: 1.65;
          letter-spacing: 0.045em;
          color: rgba(220, 212, 195, 0.54);
        }

        .causal-nodes {
          z-index: 48;
          width: 0;
          height: 0;
          transform: translate(-50%, -50%);
        }

        .causal-fragment {
          position: absolute;
          left: -46px;
          top: -37px;
          display: grid;
          width: 92px;
          min-height: 74px;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.18);
          border-radius: 42% 58% 48% 52% / 52% 42% 58% 48%;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.065), transparent 28%),
            radial-gradient(circle at 50% 42%, rgba(95, 132, 117, 0.26), transparent 58%),
            rgba(12, 11, 9, 0.62);
          box-shadow:
            0 18px 44px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          color: inherit;
          cursor: pointer;
          font: inherit;
          padding: 8px;
          text-align: center;
          transform-origin: center;
          -webkit-tap-highlight-color: transparent;
        }

        .causal-fragment::before {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(220, 212, 195, 0.055);
          border-radius: inherit;
          pointer-events: none;
        }

        .causal-fragment.is-focused {
          left: -56px;
          top: -41px;
          width: 112px;
          min-height: 82px;
          border-color: rgba(216, 183, 111, 0.48);
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.075), transparent 28%),
            radial-gradient(circle at 50% 42%, rgba(216, 183, 111, 0.14), transparent 60%),
            rgba(15, 14, 11, 0.78);
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.46),
            0 0 34px rgba(216, 183, 111, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .causal-fragment.is-open {
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.09), transparent 26%),
            radial-gradient(circle at 50% 44%, rgba(216, 183, 111, 0.17), transparent 62%),
            rgba(19, 16, 11, 0.82);
        }

        .fragment-dot {
          position: relative;
          z-index: 2;
          display: block;
          width: 13px;
          height: 13px;
          border: 1px solid rgba(216, 183, 111, 0.46);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(242, 235, 220, 0.58), rgba(216, 183, 111, 0.36) 42%, rgba(216, 183, 111, 0.08) 70%);
          box-shadow: 0 0 18px rgba(216, 183, 111, 0.18);
        }

        .causal-fragment.is-focused .fragment-dot {
          width: 18px;
          height: 18px;
          border-color: rgba(216, 183, 111, 0.72);
          box-shadow:
            0 0 24px rgba(216, 183, 111, 0.22),
            0 0 0 10px rgba(216, 183, 111, 0.045);
        }

        .fragment-title,
        .fragment-short {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
        }

        .fragment-title {
          font-family: var(--font-world);
          font-size: 0.68rem;
          line-height: 1.15;
          letter-spacing: 0.16em;
          color: rgba(180, 157, 93, 0.68);
          white-space: nowrap;
        }

        .causal-fragment.is-focused .fragment-title,
        .causal-fragment.is-open .fragment-title {
          color: rgba(180, 157, 93, 0.78);
        }

        .fragment-short {
          margin-top: 0;
          font-family: var(--font-function);
          font-size: 0.8rem;
          line-height: 1.45;
          letter-spacing: 0.035em;
          color: rgba(242, 235, 220, 0.78);
          overflow-wrap: break-word;
        }

        .fragment-short + .fragment-title {
          margin-top: 6px;
        }

        .cycle-inscription {
          position: relative;
          z-index: 4;
          width: 100%;
          min-height: 72px;
          margin: 4px auto 0;
          padding: 10px 10px 0;
          border-top: 1px solid rgba(180, 157, 93, 0.08);
        }

        .inscription-label {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.68);
        }

        .cycle-inscription h2 {
          margin: 7px 0 0;
          font-family: var(--font-world);
          font-size: clamp(1.42rem, 6.2vw, 1.9rem);
          font-weight: 300;
          letter-spacing: 0.09em;
          color: rgba(242, 235, 220, 0.88);
        }

        .cycle-inscription p:last-child {
          max-width: 24em;
          margin: 8px auto 0;
          font-family: var(--font-narrative);
          font-size: 0.9rem;
          font-weight: 300;
          line-height: 1.72;
          letter-spacing: 0.035em;
          color: rgba(220, 212, 195, 0.62);
        }

        .cycle-inscription.is-complete p:last-child {
          color: rgba(220, 212, 195, 0.74);
        }

        .cycle-inscription.is-complete {
          min-height: 132px;
        }

        .cycle-thief-constellation {
          position: relative;
          z-index: 5;
          width: min(100%, 270px);
          height: 144px;
          margin: -12px auto 8px;
          color: rgba(220, 212, 195, 0.58);
          pointer-events: none;
        }

        .cycle-thief-constellation > p {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 3;
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.68);
          transform: translate(-50%, -50%);
          white-space: nowrap;
        }

        .cycle-thief-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 132px;
          height: 132px;
          border: 1px solid rgba(120, 60, 45, 0.24);
          border-radius: 50%;
          box-shadow:
            0 0 34px rgba(120, 60, 45, 0.08),
            inset 0 0 28px rgba(0, 0, 0, 0.28);
          transform: translate(-50%, -50%);
          animation: thief-cycle-breathe 5.8s ease-in-out infinite;
        }

        .cycle-thief-ring::before {
          content: "";
          position: absolute;
          inset: 16px;
          border: 1px dashed rgba(180, 157, 93, 0.12);
          border-radius: inherit;
        }

        .cycle-thief-star {
          position: absolute;
          left: 50%;
          top: 50%;
          display: grid;
          min-width: 30px;
          min-height: 30px;
          place-items: center;
          border: 1px solid rgba(180, 157, 93, 0.14);
          border-radius: 50%;
          background: rgba(7, 6, 5, 0.42);
          color: rgba(220, 212, 195, 0.28);
          font-family: var(--font-world);
          font-size: 0.92rem;
          font-weight: 300;
          line-height: 1;
          transform: translate(-50%, -50%) translate(var(--cycle-thief-x), var(--cycle-thief-y));
          transition:
            color 260ms ease,
            border-color 260ms ease,
            box-shadow 260ms ease,
            background 260ms ease;
        }

        .cycle-thief-star.is-active {
          border-color: rgba(120, 60, 45, 0.54);
          background:
            radial-gradient(circle, rgba(120, 60, 45, 0.26), transparent 68%),
            rgba(20, 10, 7, 0.54);
          color: rgba(242, 220, 168, 0.88);
          box-shadow:
            0 0 18px rgba(120, 60, 45, 0.18),
            0 0 0 6px rgba(120, 60, 45, 0.035);
        }

        .cycle-thief-star small {
          position: absolute;
          left: 50%;
          top: calc(100% + 6px);
          width: 8.5em;
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.62rem;
          font-weight: 400;
          line-height: 1.45;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.46);
          transform: translateX(-50%);
        }

        .cycle-virtue-list {
          position: absolute;
          left: 50%;
          top: 50%;
          display: flex;
          gap: 10px;
          transform: translate(-50%, 12px);
        }

        .cycle-virtue-list span {
          border: 1px solid rgba(216, 183, 111, 0.24);
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(216, 183, 111, 0.06);
          color: rgba(242, 220, 168, 0.78);
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.1em;
        }

        .cycle-thief-constellation.is-liangzhi {
          height: 92px;
          margin-top: -18px;
        }

        .cycle-action-rail {
          position: relative;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 10px;
        }

        .cycle-action-rail button,
        .cycle-action-rail a {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(180, 157, 93, 0.2);
          border-radius: 999px;
          background: rgba(5, 5, 4, 0.34);
          color: rgba(220, 212, 195, 0.72);
          cursor: pointer;
          font-family: var(--font-function);
          font-size: 0.74rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          line-height: 1.25;
          padding: 0 10px;
          text-align: center;
          text-decoration: none;
          transition:
            border-color 260ms ease,
            color 260ms ease,
            background 260ms ease,
            transform 180ms ease;
        }

        .cycle-action-rail a,
        .cycle-action-rail button.is-accepted {
          border-color: rgba(216, 183, 111, 0.42);
          background: rgba(180, 157, 93, 0.12);
          color: rgba(242, 235, 220, 0.9);
        }

        .cycle-action-rail button:active,
        .cycle-action-rail a:active {
          transform: scale(0.985);
        }

        .practice-line {
          position: relative;
          z-index: 5;
          min-height: 36px;
          margin: 10px auto 0;
          font-family: var(--font-function);
          font-size: 0.78rem;
          line-height: 1.75;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.46);
        }

        @media (max-width: 380px) {
          .cycle-header h1 {
            font-size: 2.72rem;
          }

          .cycle-orbit {
            height: 100%;
          }

          .water-mirror {
            width: 174px;
            height: 174px;
          }

          .causal-fragment {
            width: 86px;
            min-height: 70px;
            left: -43px;
            top: -35px;
          }

          .cycle-action-rail {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .cycle-mirror {
            padding-top: 0;
          }

          .cycle-space {
            inset: -4% -12%;
          }

          .mist {
            opacity: 0.46;
          }

          .star-track {
            top: 42%;
            width: 112vw;
            height: 164px;
            opacity: 0.14;
          }

          .track-two {
            width: 96vw;
            height: 118px;
          }

          .cycle-header {
            gap: 5px;
            margin-top: 0;
          }

          .source-mirror {
            font-size: 0.66rem;
            letter-spacing: 0.16em;
          }

          .cycle-header h1 {
            font-size: clamp(2.45rem, 12vw, 3.08rem);
            line-height: 1.02;
            letter-spacing: 0.075em;
          }

          .cycle-header p:last-child {
            max-width: 18em;
            font-size: 0.82rem;
            line-height: 1.55;
            opacity: 0.82;
          }

          .cycle-stage {
            height: clamp(270px, 68vw, 310px);
            margin-top: 8px;
          }

          .cycle-orbit {
            width: min(100%, 360px);
          }

          .orbit-shadow {
            width: 276px;
            height: 96px;
            filter: blur(9px);
          }

          .orbit-path-one {
            width: 266px;
            height: 140px;
            opacity: 0.24;
          }

          .orbit-path-two {
            width: 224px;
            height: 106px;
            opacity: 0.2;
          }

          .water-mirror {
            width: clamp(162px, 45vw, 184px);
            height: clamp(162px, 45vw, 184px);
            outline-offset: 6px;
            border-color: rgba(216, 183, 111, 0.42);
            box-shadow:
              0 22px 64px rgba(0, 0, 0, 0.5),
              0 0 58px rgba(95, 132, 117, 0.16),
              0 0 36px rgba(180, 157, 93, 0.1),
              inset 0 0 62px rgba(0, 0, 0, 0.7),
              inset 0 0 0 8px rgba(214, 183, 111, 0.052);
          }

          .mirror-status {
            font-size: clamp(0.98rem, 4.4vw, 1.14rem);
            line-height: 1.48;
          }

          .mirror-verdict {
            max-width: 72%;
            margin-top: 6px;
            font-size: 0.62rem;
            line-height: 1.52;
            opacity: 0.86;
          }

          .causal-fragment {
            left: -38px;
            top: -32px;
            width: 76px;
            min-height: 64px;
            padding: 7px;
          }

          .causal-fragment.is-focused {
            left: -48px;
            top: -37px;
            width: 96px;
            min-height: 74px;
          }

          .fragment-dot {
            width: 10px;
            height: 10px;
          }

          .causal-fragment.is-focused .fragment-dot {
            width: 15px;
            height: 15px;
          }

          .fragment-title {
            font-size: 0.62rem;
          }

          .fragment-short {
            font-size: 0.72rem;
            line-height: 1.38;
          }

          .cycle-inscription {
            min-height: 78px;
            margin-top: 0;
            padding: 8px 12px 0;
            border-top-color: rgba(180, 157, 93, 0.045);
          }

          .cycle-inscription.is-complete {
            min-height: 122px;
          }

          .inscription-label {
            font-size: 0.66rem;
            letter-spacing: 0.16em;
          }

          .cycle-inscription h2 {
            margin-top: 5px;
            font-size: clamp(1.18rem, 5.6vw, 1.52rem);
          }

          .cycle-inscription p:last-child {
            max-width: 22em;
            margin-top: 7px;
            font-size: 0.82rem;
            line-height: 1.62;
          }

          .cycle-thief-constellation {
            height: 116px;
            margin-top: -14px;
            margin-bottom: 4px;
          }

          .cycle-thief-ring {
            width: 108px;
            height: 108px;
          }

          .cycle-thief-star {
            min-width: 27px;
            min-height: 27px;
            font-size: 0.82rem;
            transform: translate(-50%, -50%) translate(calc(var(--cycle-thief-x) * 0.82), calc(var(--cycle-thief-y) * 0.82));
          }

          .cycle-thief-star small {
            display: none;
          }

          .cycle-action-rail {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 8px;
          }

          .cycle-action-rail.has-practice {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cycle-action-rail a {
            grid-column: 1 / -1;
          }

          .cycle-action-rail button,
          .cycle-action-rail a {
            min-height: 42px;
            font-size: 0.72rem;
          }

          .practice-line {
            max-width: 24em;
            min-height: 30px;
            margin-top: 8px;
            font-size: 0.72rem;
            line-height: 1.62;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mist,
          .particle,
          .star-track,
          .orbit-path,
          .water-reflection,
          .water-ripple {
            animation: none !important;
          }
        }

        @keyframes cycle-water-breathe {
          0%,
          100% {
            box-shadow:
              0 26px 74px rgba(0, 0, 0, 0.54),
              0 0 88px rgba(95, 132, 117, 0.22),
              0 0 54px rgba(180, 157, 93, 0.16),
              inset 0 0 78px rgba(0, 0, 0, 0.72),
              inset 0 0 0 10px rgba(214, 183, 111, 0.07);
          }

          50% {
            box-shadow:
              0 30px 86px rgba(0, 0, 0, 0.62),
              0 0 104px rgba(95, 132, 117, 0.28),
              0 0 70px rgba(180, 157, 93, 0.21),
              inset 0 0 88px rgba(0, 0, 0, 0.78),
              inset 0 0 0 10px rgba(214, 183, 111, 0.09);
          }
        }

        @keyframes water-depth-shift {
          0%,
          100% {
            opacity: 0.42;
            transform: scale(0.96) rotate(-2deg);
          }

          50% {
            opacity: 0.64;
            transform: scale(1.04) rotate(2deg);
          }
        }

        @keyframes mist-drift {
          0%,
          100% {
            opacity: 0.48;
            transform: translateX(-12px);
          }

          50% {
            opacity: 0.78;
            transform: translateX(14px);
          }
        }

        @keyframes particle-orbit {
          from {
            transform: rotate(0deg) translateX(34px) rotate(0deg);
          }

          to {
            transform: rotate(360deg) translateX(34px) rotate(-360deg);
          }
        }

        @keyframes path-turn {
          from {
            rotate: 0deg;
          }

          to {
            rotate: 360deg;
          }
        }

        @keyframes water-glide {
          0%,
          100% {
            opacity: 0.28;
            transform: translateX(-18px) rotate(-14deg);
          }

          50% {
            opacity: 0.52;
            transform: translateX(18px) rotate(-14deg);
          }
        }

        @keyframes ripple-out {
          0% {
            opacity: 0.64;
            transform: translate(-50%, -50%) scale(0.42);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(3.2);
          }
        }

        @keyframes thief-cycle-breathe {
          0%,
          100% {
            opacity: 0.58;
            transform: translate(-50%, -50%) scale(0.985) rotate(0deg);
          }

          50% {
            opacity: 0.88;
            transform: translate(-50%, -50%) scale(1.015) rotate(8deg);
          }
        }
      `}</style>
    </section>
  )
}
