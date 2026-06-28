"use client"

import type { FormEvent, ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import type { TrainingPack } from "@yangming/contracts/training-pack"

import {
  createTrainingPack,
  fetchTrainingPacks,
  setTrainingPackEnabled,
  updateTrainingPack,
} from "./training-pack-api"

const emptyForm = {
  title: "",
  errorType: "",
  sceneTags: "",
  trainingGoal: "",
  expectedAction: "",
  defaultPrompt: "",
  trainingPrescription: "",
  difficulty: "初级",
  enabled: true,
  sortOrder: 90,
}

type TrainingPackFormState = typeof emptyForm

export function TrainingPackAdmin() {
  const [packs, setPacks] = useState<TrainingPack[]>([])
  const [form, setForm] = useState<TrainingPackFormState>(emptyForm)
  const [editingId, setEditingId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    void loadPacks()
  }, [])

  const enabledCount = useMemo(() => packs.filter((pack) => pack.enabled).length, [packs])
  const disabledCount = packs.length - enabledCount

  async function loadPacks() {
    setLoading(true)
    setError("")
    try {
      const nextPacks = await fetchTrainingPacks({ includeDisabled: true })
      setPacks(nextPacks)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取训练包失败")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")

    try {
      const payload = toPayload(form)
      const saved = editingId
        ? await updateTrainingPack(editingId, payload)
        : await createTrainingPack(payload)

      setPacks((current) => upsertPack(current, saved))
      setNotice(editingId ? "训练包已更新" : "训练包已新增")
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存训练包失败")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(pack: TrainingPack) {
    setSaving(true)
    setError("")
    setNotice("")

    try {
      const updated = await setTrainingPackEnabled(pack.id, !pack.enabled)
      setPacks((current) => upsertPack(current, updated))
      setNotice(updated.enabled ? "训练包已启用" : "训练包已停用")
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "更新启用状态失败")
    } finally {
      setSaving(false)
    }
  }

  function startEdit(pack: TrainingPack) {
    setEditingId(pack.id)
    setForm({
      title: pack.title,
      errorType: pack.errorType,
      sceneTags: pack.sceneTags.join("，"),
      trainingGoal: pack.trainingGoal,
      expectedAction: pack.expectedAction,
      defaultPrompt: pack.defaultPrompt,
      trainingPrescription: pack.trainingPrescription,
      difficulty: pack.difficulty || "初级",
      enabled: pack.enabled,
      sortOrder: pack.sortOrder,
    })
    setNotice("")
  }

  function resetForm() {
    setEditingId("")
    setForm(emptyForm)
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="训练包总数" value={packs.length} />
        <MetricCard label="启用中" value={enabledCount} />
        <MetricCard label="已停用" value={disabledCount} />
      </section>

      <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-story text-xl tracking-[.04em]">{editingId ? "编辑训练包" : "新增训练包"}</h2>
            <p className="mt-1 font-function text-xs leading-5 text-[rgba(244,235,221,.48)]">
              字段会提交到 P7-1A Training Pack API，供网页后台管理和后续小程序读取。
            </p>
          </div>
          <button
            type="button"
            onClick={loadPacks}
            disabled={loading || saving}
            className="h-10 w-fit rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-4 font-function text-sm text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.38)] disabled:opacity-50"
          >
            加载训练包
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-[rgba(120,60,45,.26)] bg-[rgba(120,60,45,.14)] px-4 py-3 font-function text-sm text-[rgba(244,210,196,.9)]">
            读取训练包失败：{error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-lg border border-[rgba(95,132,117,.24)] bg-[rgba(95,132,117,.12)] px-4 py-3 font-function text-sm text-[rgba(174,205,191,.9)]">
            {notice}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="title">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className={inputClassName} />
            </Field>
            <Field label="errorType">
              <input value={form.errorType} onChange={(event) => setForm({ ...form, errorType: event.target.value })} required className={inputClassName} />
            </Field>
            <Field label="sceneTags">
              <input
                value={form.sceneTags}
                onChange={(event) => setForm({ ...form, sceneTags: event.target.value })}
                placeholder="用逗号分隔，例如：放量拉升，假突破"
                className={inputClassName}
              />
            </Field>
            <Field label="difficulty">
              <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className={inputClassName}>
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
              </select>
            </Field>
            <Field label="trainingGoal">
              <textarea value={form.trainingGoal} onChange={(event) => setForm({ ...form, trainingGoal: event.target.value })} required className={textareaClassName} />
            </Field>
            <Field label="expectedAction">
              <textarea value={form.expectedAction} onChange={(event) => setForm({ ...form, expectedAction: event.target.value })} required className={textareaClassName} />
            </Field>
            <Field label="defaultPrompt">
              <textarea value={form.defaultPrompt} onChange={(event) => setForm({ ...form, defaultPrompt: event.target.value })} className={textareaClassName} />
            </Field>
            <Field label="trainingPrescription">
              <textarea value={form.trainingPrescription} onChange={(event) => setForm({ ...form, trainingPrescription: event.target.value })} className={textareaClassName} />
            </Field>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 font-function text-sm text-[rgba(244,235,221,.72)]">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                />
                enabled
              </label>
              <label className="inline-flex items-center gap-2 font-function text-sm text-[rgba(244,235,221,.72)]">
                sortOrder
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) || 0 })}
                  className="h-10 w-24 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-mono text-sm text-[rgba(244,235,221,.82)] outline-none"
                />
              </label>
            </div>
            <div className="flex gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-10 rounded-lg border border-[rgba(217,189,122,.14)] px-4 font-function text-sm text-[rgba(244,235,221,.58)] transition hover:border-[rgba(216,183,111,.32)]"
                >
                  取消编辑
                </button>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-lg border border-[rgba(217,189,122,.22)] bg-[rgba(216,183,111,.12)] px-4 font-function text-sm text-[rgba(244,235,221,.86)] transition hover:border-[rgba(216,183,111,.42)] disabled:opacity-50"
              >
                {saving ? "保存中" : editingId ? "保存编辑" : "新增训练包"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/80 shadow-[0_30px_90px_rgba(0,0,0,.32)]">
        <div className="border-b border-[rgba(217,189,122,.12)] px-4 py-4 md:px-5">
          <h2 className="font-story text-xl tracking-[.04em]">训练包列表</h2>
          <p className="mt-1 font-function text-xs leading-5 text-[rgba(244,235,221,.48)]">
            默认展示启用和停用训练包，按 sortOrder 排序。页面不使用本地假数据作为正式数据源。
          </p>
        </div>

        {loading ? (
          <p className="px-5 py-8 font-function text-sm text-[rgba(244,235,221,.52)]">加载中，正在读取训练包。</p>
        ) : packs.length === 0 ? (
          <p className="px-5 py-8 font-function text-sm text-[rgba(244,235,221,.52)]">暂无训练包。请先新增一条公共训练配置。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead>
                <tr className="border-b border-[rgba(217,189,122,.1)] bg-white/[.025]">
                  {["title", "errorType", "sceneTags", "trainingGoal", "expectedAction", "trainingPrescription", "difficulty", "enabled", "sortOrder", "操作"].map((column) => (
                    <th key={column} className="px-4 py-3 text-left font-function text-xs font-medium tracking-[.08em] text-[rgba(244,235,221,.52)]">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packs.map((pack) => (
                  <tr key={pack.id} className="border-b border-[rgba(217,189,122,.08)] align-top">
                    <td className="px-4 py-4 font-function text-sm text-[#F4EBDD]">{pack.title}</td>
                    <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.72)]">{pack.errorType}</td>
                    <td className="max-w-[170px] px-4 py-4 font-function text-xs leading-5 text-[rgba(244,235,221,.56)]">{pack.sceneTags.join(" / ") || "待补充"}</td>
                    <td className="max-w-[210px] px-4 py-4 font-function text-xs leading-5 text-[rgba(244,235,221,.62)]">{pack.trainingGoal}</td>
                    <td className="max-w-[210px] px-4 py-4 font-function text-xs leading-5 text-[rgba(216,183,111,.72)]">{pack.expectedAction}</td>
                    <td className="max-w-[200px] px-4 py-4 font-function text-xs leading-5 text-[rgba(244,235,221,.56)]">{pack.trainingPrescription || "待补充"}</td>
                    <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.68)]">{pack.difficulty}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 font-function text-xs ${pack.enabled ? "border-[rgba(95,132,117,.26)] bg-[rgba(95,132,117,.12)] text-[rgba(174,205,191,.88)]" : "border-[rgba(120,60,45,.28)] bg-[rgba(120,60,45,.16)] text-[rgba(231,188,171,.86)]"}`}>
                        {pack.enabled ? "启用" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.62)]">{pack.sortOrder}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(pack)} className={tableButtonClassName}>
                          编辑
                        </button>
                        <button type="button" onClick={() => handleToggle(pack)} disabled={saving} className={tableButtonClassName}>
                          {pack.enabled ? "停用" : "启用"}
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

function toPayload(form: TrainingPackFormState) {
  return {
    title: form.title,
    errorType: form.errorType,
    sceneTags: form.sceneTags.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
    trainingGoal: form.trainingGoal,
    expectedAction: form.expectedAction,
    defaultPrompt: form.defaultPrompt,
    trainingPrescription: form.trainingPrescription,
    difficulty: form.difficulty,
    enabled: form.enabled,
    sortOrder: form.sortOrder,
  }
}

function upsertPack(packs: TrainingPack[], nextPack: TrainingPack) {
  const exists = packs.some((pack) => pack.id === nextPack.id)
  const nextPacks = exists ? packs.map((pack) => (pack.id === nextPack.id ? nextPack : pack)) : packs.concat(nextPack)
  return nextPacks.sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, "zh-CN"))
}

const inputClassName = "min-h-10 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-function text-sm text-[rgba(244,235,221,.82)] outline-none placeholder:text-[rgba(244,235,221,.28)]"
const textareaClassName = `${inputClassName} min-h-24 py-3 leading-6`
const tableButtonClassName = "rounded-lg border border-[rgba(217,189,122,.16)] px-3 py-2 font-function text-xs text-[rgba(216,183,111,.82)] transition hover:border-[rgba(216,183,111,.34)] hover:text-[#F4EBDD] disabled:opacity-50"
