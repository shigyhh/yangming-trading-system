"use client"

import type { FormEvent, ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import type { KlineSegment, KlineSegmentListFilters } from "@yangming/contracts/kline-segment"
import type { TrainingPack } from "@yangming/contracts/training-pack"

import {
  createKlineSegment,
  fetchKlineSegments,
  setKlineSegmentEnabled,
  updateKlineSegment,
} from "./kline-segment-api"
import { fetchTrainingPacks } from "./training-pack-api"

const sceneTagOptions = [
  "放量拉升",
  "假突破",
  "冲高回落",
  "破位下跌",
  "弱反弹",
  "连续阴跌",
  "下跌中继",
  "反抽诱多",
  "洗盘后走强",
  "趋势中继",
  "横盘噪音",
  "突然异动",
  "普涨行情",
  "快速反弹",
]

const errorTypeOptions = [
  "追高冲动",
  "扛单被套",
  "卖飞懊悔",
  "补仓冲动",
  "计划外交易",
  "盈利拿不住",
  "空仓焦虑",
  "急于翻本",
]

const emptyFilters = {
  includeDisabled: true,
  symbol: "",
  period: "",
  errorType: "",
  sceneTag: "",
  trainingPackId: "",
}

const emptyForm = {
  symbol: "",
  name: "",
  period: "1d",
  startDate: "",
  endDate: "",
  sceneTags: "",
  errorTypes: "",
  trainingPackIds: [] as string[],
  difficulty: "初级",
  note: "",
  enabled: true,
}

type KlineSegmentFilterState = typeof emptyFilters
type KlineSegmentFormState = typeof emptyForm

export function KlineSegmentAdmin() {
  const [segments, setSegments] = useState<KlineSegment[]>([])
  const [trainingPacks, setTrainingPacks] = useState<TrainingPack[]>([])
  const [filters, setFilters] = useState<KlineSegmentFilterState>(emptyFilters)
  const [form, setForm] = useState<KlineSegmentFormState>(emptyForm)
  const [editingId, setEditingId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    void loadInitialData()
    // 初次进入后台时加载一次列表，后续筛选由表单提交触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enabledCount = useMemo(() => segments.filter((segment) => segment.enabled).length, [segments])
  const disabledCount = segments.length - enabledCount

  async function loadInitialData() {
    setLoading(true)
    setError("")
    try {
      const [nextSegments, nextTrainingPacks] = await Promise.all([
        fetchKlineSegments(toFilters(filters)),
        fetchTrainingPacks({ includeDisabled: true }),
      ])
      setSegments(nextSegments)
      setTrainingPacks(nextTrainingPacks)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取K线片段失败")
    } finally {
      setLoading(false)
    }
  }

  async function loadSegments(nextFilters: KlineSegmentFilterState = filters) {
    setLoading(true)
    setError("")
    try {
      const nextSegments = await fetchKlineSegments(toFilters(nextFilters))
      setSegments(nextSegments)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取K线片段失败")
    } finally {
      setLoading(false)
    }
  }

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadSegments(filters)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")

    try {
      const payload = toPayload(form)
      const saved = editingId
        ? await updateKlineSegment(editingId, payload)
        : await createKlineSegment(payload)

      setSegments((current) => upsertSegment(current, saved))
      setNotice(editingId ? "K线片段已更新" : "K线片段已新增")
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存K线片段失败")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(segment: KlineSegment) {
    setSaving(true)
    setError("")
    setNotice("")

    try {
      const updated = await setKlineSegmentEnabled(segment.id, !segment.enabled)
      setSegments((current) => upsertSegment(current, updated))
      setNotice(updated.enabled ? "K线片段已启用" : "K线片段已停用")
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "更新启用状态失败")
    } finally {
      setSaving(false)
    }
  }

  function startEdit(segment: KlineSegment) {
    setEditingId(segment.id)
    setForm({
      symbol: segment.symbol,
      name: segment.name,
      period: segment.period,
      startDate: segment.startDate,
      endDate: segment.endDate,
      sceneTags: segment.sceneTags.join("，"),
      errorTypes: segment.errorTypes.join("，"),
      trainingPackIds: segment.trainingPackIds,
      difficulty: segment.difficulty || "初级",
      note: segment.note,
      enabled: segment.enabled,
    })
    setNotice("")
  }

  function resetForm() {
    setEditingId("")
    setForm(emptyForm)
  }

  function resetFilters() {
    setFilters(emptyFilters)
    void loadSegments(emptyFilters)
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="片段总数" value={segments.length} />
        <MetricCard label="启用中" value={enabledCount} />
        <MetricCard label="已停用" value={disabledCount} />
      </section>

      <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-story text-xl tracking-[.04em]">片段过滤</h2>
            <p className="mt-1 font-function text-xs leading-5 text-[rgba(244,235,221,.48)]">
              按 symbol、period、errorType、sceneTag、trainingPackId 查看 KlineSegment 列表。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadInitialData()}
            disabled={loading || saving}
            className={secondaryButtonClassName}
          >
            加载K线片段
          </button>
        </div>

        <form onSubmit={handleFilterSubmit} className="mt-5 grid gap-4 md:grid-cols-6">
          <Field label="symbol">
            <input value={filters.symbol} onChange={(event) => setFilters({ ...filters, symbol: event.target.value })} className={inputClassName} />
          </Field>
          <Field label="period">
            <input value={filters.period} onChange={(event) => setFilters({ ...filters, period: event.target.value })} placeholder="1d / 60m" className={inputClassName} />
          </Field>
          <Field label="errorType">
            <select value={filters.errorType} onChange={(event) => setFilters({ ...filters, errorType: event.target.value })} className={inputClassName}>
              <option value="">全部</option>
              {errorTypeOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="sceneTag">
            <select value={filters.sceneTag} onChange={(event) => setFilters({ ...filters, sceneTag: event.target.value })} className={inputClassName}>
              <option value="">全部</option>
              {sceneTagOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="trainingPackId">
            <select value={filters.trainingPackId} onChange={(event) => setFilters({ ...filters, trainingPackId: event.target.value })} className={inputClassName}>
              <option value="">全部</option>
              {trainingPacks.map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.title || pack.id}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={loading || saving} className={primaryButtonClassName}>
              过滤
            </button>
            <button type="button" onClick={resetFilters} disabled={loading || saving} className={secondaryButtonClassName}>
              重置
            </button>
          </div>
          <label className="inline-flex items-center gap-2 font-function text-sm text-[rgba(244,235,221,.72)] md:col-span-6">
            <input
              type="checkbox"
              checked={filters.includeDisabled}
              onChange={(event) => setFilters({ ...filters, includeDisabled: event.target.checked })}
            />
            includeDisabled 查看启用和禁用片段
          </label>
        </form>

        {error ? (
          <p className="mt-4 rounded-lg border border-[rgba(120,60,45,.26)] bg-[rgba(120,60,45,.14)] px-4 py-3 font-function text-sm text-[rgba(244,210,196,.9)]">
            读取K线片段失败：{error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-lg border border-[rgba(95,132,117,.24)] bg-[rgba(95,132,117,.12)] px-4 py-3 font-function text-sm text-[rgba(174,205,191,.9)]">
            {notice}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-story text-xl tracking-[.04em]">{editingId ? "编辑K线片段" : "新增片段"}</h2>
            <p className="mt-1 font-function text-xs leading-5 text-[rgba(244,235,221,.48)]">
              片段只保存标注边界、场景标签、错题类型和 trainingPackIds，不保存完整 K 线 bars。
            </p>
          </div>
          {editingId ? (
            <button type="button" onClick={resetForm} className={secondaryButtonClassName}>
              取消编辑
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="symbol">
              <input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} required className={inputClassName} />
            </Field>
            <Field label="name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className={inputClassName} />
            </Field>
            <Field label="period">
              <input value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} required className={inputClassName} />
            </Field>
            <Field label="difficulty">
              <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className={inputClassName}>
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
              </select>
            </Field>
            <Field label="startDate">
              <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required className={inputClassName} />
            </Field>
            <Field label="endDate">
              <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required className={inputClassName} />
            </Field>
            <Field label="sceneTags">
              <input
                value={form.sceneTags}
                onChange={(event) => setForm({ ...form, sceneTags: event.target.value })}
                placeholder="用逗号分隔，例如：放量拉升，假突破"
                className={inputClassName}
              />
            </Field>
            <Field label="errorTypes">
              <input
                value={form.errorTypes}
                onChange={(event) => setForm({ ...form, errorTypes: event.target.value })}
                placeholder="用逗号分隔，例如：追高冲动，计划外交易"
                className={inputClassName}
              />
            </Field>
          </div>

          <Field label="trainingPackIds">
            <div className="grid gap-2 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] p-3 md:grid-cols-2">
              {trainingPacks.length ? trainingPacks.map((pack) => (
                <label key={pack.id} className="inline-flex items-center gap-2 font-function text-sm text-[rgba(244,235,221,.72)]">
                  <input
                    type="checkbox"
                    checked={form.trainingPackIds.includes(pack.id)}
                    onChange={(event) => setForm({ ...form, trainingPackIds: toggleListValue(form.trainingPackIds, pack.id, event.target.checked) })}
                  />
                  <span>{pack.title || pack.id}</span>
                </label>
              )) : (
                <span className="font-function text-sm text-[rgba(244,235,221,.44)]">训练包列表为空，仍可保存未绑定片段。</span>
              )}
            </div>
          </Field>

          <Field label="note">
            <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={textareaClassName} />
          </Field>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="inline-flex items-center gap-2 font-function text-sm text-[rgba(244,235,221,.72)]">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              enabled
            </label>
            <button type="submit" disabled={saving} className={primaryButtonClassName}>
              {saving ? "保存中" : editingId ? "保存编辑" : "新增片段"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/80 shadow-[0_30px_90px_rgba(0,0,0,.32)]">
        <div className="border-b border-[rgba(217,189,122,.12)] px-4 py-4 md:px-5">
          <h2 className="font-story text-xl tracking-[.04em]">K线片段列表</h2>
          <p className="mt-1 font-function text-xs leading-5 text-[rgba(244,235,221,.48)]">
            页面读取 kline-service KlineSegment API；预览 K线可在后续复用 kline-history/slice。
          </p>
        </div>

        {loading ? (
          <p className="px-5 py-8 font-function text-sm text-[rgba(244,235,221,.52)]">加载中，正在读取K线片段。</p>
        ) : segments.length === 0 ? (
          <p className="px-5 py-8 font-function text-sm text-[rgba(244,235,221,.52)]">暂无K线片段。请先新增一条片段标注。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse">
              <thead>
                <tr className="border-b border-[rgba(217,189,122,.1)] bg-white/[.025]">
                  {["name", "symbol", "period", "dateRange", "sceneTags", "errorTypes", "trainingPackIds", "difficulty", "enabled", "note", "操作"].map((column) => (
                    <th key={column} className="px-4 py-3 text-left font-function text-xs font-medium tracking-[.08em] text-[rgba(244,235,221,.52)]">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((segment) => (
                  <tr key={segment.id} className="border-b border-[rgba(217,189,122,.08)] align-top">
                    <td className="px-4 py-4 font-function text-sm text-[#F4EBDD]">{segment.name || segment.id}</td>
                    <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.72)]">{segment.symbol}</td>
                    <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.66)]">{segment.period}</td>
                    <td className="px-4 py-4 font-mono text-xs text-[rgba(244,235,221,.56)]">{segment.startDate} → {segment.endDate}</td>
                    <td className="max-w-[180px] px-4 py-4 font-function text-xs leading-5 text-[rgba(244,235,221,.56)]">{segment.sceneTags.join(" / ") || "待补充"}</td>
                    <td className="max-w-[180px] px-4 py-4 font-function text-xs leading-5 text-[rgba(216,183,111,.72)]">{segment.errorTypes.join(" / ") || "待补充"}</td>
                    <td className="max-w-[220px] px-4 py-4 font-mono text-xs leading-5 text-[rgba(244,235,221,.56)]">{segment.trainingPackIds.join(" / ") || "未绑定"}</td>
                    <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.68)]">{segment.difficulty}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 font-function text-xs ${segment.enabled ? "border-[rgba(95,132,117,.26)] bg-[rgba(95,132,117,.12)] text-[rgba(174,205,191,.88)]" : "border-[rgba(120,60,45,.28)] bg-[rgba(120,60,45,.16)] text-[rgba(231,188,171,.86)]"}`}>
                        {segment.enabled ? "启用" : "停用"}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-4 font-function text-xs leading-5 text-[rgba(244,235,221,.56)]">{segment.note || "无备注"}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(segment)} className={tableButtonClassName}>
                          编辑
                        </button>
                        <button type="button" onClick={() => handleToggle(segment)} disabled={saving} className={tableButtonClassName}>
                          {segment.enabled ? "停用" : "启用"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[rgba(217,189,122,.12)] bg-black/20 px-4 py-3">
      <p className="font-function text-xs tracking-[.16em] text-[rgba(216,183,111,.62)]">{label}</p>
      <p className="mt-2 font-story text-2xl tracking-[.04em] text-[#F4EBDD]">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-function text-xs text-[rgba(244,235,221,.44)]">{label}</span>
      {children}
    </label>
  )
}

function toFilters(filters: KlineSegmentFilterState): KlineSegmentListFilters {
  return {
    includeDisabled: filters.includeDisabled,
    symbol: filters.symbol.trim(),
    period: filters.period.trim(),
    errorType: filters.errorType,
    sceneTag: filters.sceneTag,
    trainingPackId: filters.trainingPackId,
  }
}

function toPayload(form: KlineSegmentFormState) {
  return {
    symbol: form.symbol.trim(),
    name: form.name.trim(),
    period: form.period.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    sceneTags: splitList(form.sceneTags),
    errorTypes: splitList(form.errorTypes),
    trainingPackIds: form.trainingPackIds,
    difficulty: form.difficulty,
    note: form.note,
    enabled: form.enabled,
  }
}

function splitList(value: string) {
  return value.split(/[，,、/]/).map((item) => item.trim()).filter(Boolean)
}

function toggleListValue(values: string[], value: string, checked: boolean) {
  if (checked) return values.includes(value) ? values : values.concat(value)
  return values.filter((item) => item !== value)
}

function upsertSegment(segments: KlineSegment[], nextSegment: KlineSegment) {
  const exists = segments.some((segment) => segment.id === nextSegment.id)
  const nextSegments = exists ? segments.map((segment) => (segment.id === nextSegment.id ? nextSegment : segment)) : segments.concat(nextSegment)
  return nextSegments.sort((left, right) => left.symbol.localeCompare(right.symbol) || left.period.localeCompare(right.period) || left.startDate.localeCompare(right.startDate))
}

const inputClassName = "min-h-10 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-function text-sm text-[rgba(244,235,221,.82)] outline-none placeholder:text-[rgba(244,235,221,.28)]"
const textareaClassName = `${inputClassName} min-h-24 py-3 leading-6`
const primaryButtonClassName = "h-10 rounded-lg border border-[rgba(217,189,122,.22)] bg-[rgba(216,183,111,.12)] px-4 font-function text-sm text-[rgba(244,235,221,.86)] transition hover:border-[rgba(216,183,111,.42)] disabled:opacity-50"
const secondaryButtonClassName = "h-10 rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-4 font-function text-sm text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.38)] disabled:opacity-50"
const tableButtonClassName = "rounded-lg border border-[rgba(217,189,122,.16)] px-3 py-2 font-function text-xs text-[rgba(216,183,111,.82)] transition hover:border-[rgba(216,183,111,.34)] hover:text-[#F4EBDD] disabled:opacity-50"
