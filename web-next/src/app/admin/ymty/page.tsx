"use client"

import type { FormEvent, ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"

type Product = {
  product_code: string
  product_name: string
  display_price_yuan: number
  amount_cents: number
  currency?: string
  cycle: string
  start_time: string
  lecturer: string
  status: string
}

type Livecode = {
  code_key: string
  name: string
  wecom_link: string
  qr_image: string
  auto_redirect_after_paid: boolean
  redirect_delay_ms: number
  remark: string
  button_text: string
  service_text: string
  status: string
}

type CourseUser = {
  added_wechat: boolean
  joined_group: boolean
  added_wechat_at?: string | null
  joined_group_at?: string | null
}

type Order = {
  order_id: string
  product_name: string
  amount_cents: number
  pay_channel: string
  pay_status: string
  channel: string
  campaign: string
  creative: string
  created_at: string
  paid_at: string | null
  course_user?: CourseUser
}

type AuditLog = {
  id?: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  before_json: unknown
  after_json: unknown
  ip: string
  created_at: string
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "")

const apiEndpoints = [
  "GET /api/admin/campaign/ymty",
  "POST /api/admin/campaign/ymty",
  "POST /api/admin/livecode",
  "GET /api/admin/orders",
  "GET /api/admin/audit-logs",
]

const emptyProduct: Product = {
  product_code: "YMXX_JY_TY",
  product_name: "阳明心学交易体验营",
  display_price_yuan: 1.68,
  amount_cents: 168,
  currency: "CNY",
  cycle: "7天训练",
  start_time: "每周滚动开营｜晚20:00",
  lecturer: "知行飞哥",
  status: "online",
}

const emptyLivecode: Livecode = {
  code_key: "YMXX_YMTY_DEFAULT",
  name: "阳明心学交易体验营默认活码",
  wecom_link: "",
  qr_image: "",
  auto_redirect_after_paid: false,
  redirect_delay_ms: 600,
  remark: "知行 + 手机号后4位",
  button_text: "添加课程助教微信",
  service_text: "客服方式：支付后添加课程助教微信",
  status: "active",
}

export default function YmtyAdminPage() {
  const [adminToken, setAdminToken] = useState("")
  const [adminId, setAdminId] = useState("ymty-admin")
  const [product, setProduct] = useState<Product>(emptyProduct)
  const [originalProduct, setOriginalProduct] = useState<Product>(emptyProduct)
  const [livecode, setLivecode] = useState<Livecode>(emptyLivecode)
  const [orders, setOrders] = useState<Order[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [message, setMessage] = useState("正在读取体验营后台配置...")
  const [loading, setLoading] = useState(false)

  const paidCount = useMemo(() => orders.filter((order) => order.pay_status === "paid").length, [orders])
  const addedWechatCount = useMemo(() => orders.filter((order) => order.course_user?.added_wechat).length, [orders])
  const joinedGroupCount = useMemo(() => orders.filter((order) => order.course_user?.joined_group).length, [orders])

  useEffect(() => {
    void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshAll() {
    setLoading(true)
    try {
      const [campaignData, ordersData, auditData] = await Promise.all([
        adminFetch<{ product: Product; livecode: Livecode }>("/api/admin/campaign/ymty"),
        adminFetch<{ orders: Order[] }>("/api/admin/orders"),
        adminFetch<{ audit_logs: AuditLog[] }>("/api/admin/audit-logs"),
      ])
      setProduct(campaignData.product)
      setOriginalProduct(campaignData.product)
      setLivecode(campaignData.livecode)
      setOrders(ordersData.orders || [])
      setAuditLogs(auditData.audit_logs || [])
      setMessage("配置已同步自 server API。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取后台配置失败")
    } finally {
      setLoading(false)
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const priceChanged = Number(product.amount_cents) !== Number(originalProduct.amount_cents)
      || Number(product.display_price_yuan) !== Number(originalProduct.display_price_yuan)

    if (priceChanged) {
      const ok = confirm("确认修改体验营价格？价格修改只影响新订单，旧订单金额不会被覆盖。")
      if (!ok) return
    }

    setLoading(true)
    try {
      const data = await adminFetch<{ product: Product }>("/api/admin/campaign/ymty", {
        method: "POST",
        body: JSON.stringify({
          product_code: product.product_code,
          product_name: product.product_name,
          display_price_yuan: Number(product.display_price_yuan),
          amount_cents: Number(product.amount_cents),
          cycle: product.cycle,
          start_time: product.start_time,
          lecturer: product.lecturer,
          status: product.status,
        }),
      })
      setProduct(data.product)
      setOriginalProduct(data.product)
      setMessage("产品与价格已保存。")
      await refreshAuditLogs()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "产品保存失败")
    } finally {
      setLoading(false)
    }
  }

  async function saveLivecode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      const data = await adminFetch<{ livecode: Livecode }>("/api/admin/livecode", {
        method: "POST",
        body: JSON.stringify({
          code_key: livecode.code_key,
          name: livecode.name,
          wecom_link: livecode.wecom_link,
          qr_image: livecode.qr_image,
          auto_redirect_after_paid: livecode.auto_redirect_after_paid,
          redirect_delay_ms: Number(livecode.redirect_delay_ms),
          remark: livecode.remark,
          button_text: livecode.button_text,
          service_text: livecode.service_text,
          status: livecode.status,
        }),
      })
      setLivecode(data.livecode)
      setMessage("活码与获客助手配置已保存。")
      await refreshAuditLogs()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "活码保存失败")
    } finally {
      setLoading(false)
    }
  }

  async function markCourseUser(orderId: string, patch: Partial<CourseUser>) {
    setLoading(true)
    try {
      await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/course-user`, {
        method: "POST",
        body: JSON.stringify(patch),
      })
      setMessage("学员承接状态已更新。")
      await refreshOrders()
      await refreshAuditLogs()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "承接状态更新失败")
    } finally {
      setLoading(false)
    }
  }

  async function refreshOrders() {
    const data = await adminFetch<{ orders: Order[] }>("/api/admin/orders")
    setOrders(data.orders || [])
  }

  async function refreshAuditLogs() {
    const data = await adminFetch<{ audit_logs: AuditLog[] }>("/api/admin/audit-logs")
    setAuditLogs(data.audit_logs || [])
  }

  async function adminFetch<T>(path: string, options: RequestInit = {}) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": adminId,
        ...(adminToken ? { "x-admin-token": adminToken } : {}),
        ...(options.headers || {}),
      },
      cache: "no-store",
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.ok === false) {
      throw new Error(String(data?.error || "后台接口请求失败"))
    }
    return data as T
  }

  return (
    <main className="min-h-svh bg-[#080807] px-4 py-6 text-[#F4EBDD] md:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(216,183,111,.12),transparent_30rem),radial-gradient(circle_at_86%_16%,rgba(95,132,117,.11),transparent_28rem),linear-gradient(180deg,rgba(8,8,7,.78),#080807)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[rgba(217,189,122,.16)] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-function text-xs tracking-[.22em] text-[rgba(216,183,111,.72)]">YMTY ADMIN</p>
            <h1 className="mt-3 font-story text-3xl font-semibold tracking-[.04em] md:text-5xl">体验营后台</h1>
            <p className="mt-4 max-w-3xl font-function text-sm leading-7 text-[rgba(244,235,221,.62)]">
              管理价格、支付后助教入口、订单承接与操作日志。前端展示价格只用于展示，真实支付金额以后端订单为准；价格修改只影响新订单。
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-[rgba(217,189,122,.14)] bg-white/[.035] p-3 md:min-w-[320px]">
            <label className="grid gap-1">
              <span className="font-function text-xs text-[rgba(244,235,221,.48)]">操作人</span>
              <input value={adminId} onChange={(event) => setAdminId(event.target.value)} className={inputClass} />
            </label>
            <label className="grid gap-1">
              <span className="font-function text-xs text-[rgba(244,235,221,.48)]">后台 Token</span>
              <input value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="开发环境可留空" className={inputClass} />
            </label>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="订单总数" value={orders.length} />
          <Metric label="已支付" value={paidCount} />
          <Metric label="已加微" value={addedWechatCount} />
          <Metric label="已入群" value={joinedGroupCount} />
        </section>

        <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/82 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="font-function text-sm text-[rgba(244,235,221,.68)]">{message}</p>
            <button type="button" onClick={refreshAll} disabled={loading} className={secondaryButtonClass}>
              {loading ? "同步中..." : "刷新后台数据"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {apiEndpoints.map((item) => (
              <code key={item} className="rounded border border-[rgba(217,189,122,.12)] bg-black/20 px-2 py-1 font-mono text-[11px] text-[rgba(244,235,221,.46)]">{item}</code>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={saveProduct} className={panelClass}>
            <SectionHeader title="产品与价格" note="修改价格会写入 audit_logs；旧订单金额保持原值。" />
            <Field label="product_code"><input value={product.product_code} onChange={(event) => setProduct({ ...product, product_code: event.target.value })} className={inputClass} /></Field>
            <Field label="product_name"><input value={product.product_name} onChange={(event) => setProduct({ ...product, product_name: event.target.value })} className={inputClass} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="display_price_yuan"><input type="number" step="0.01" value={product.display_price_yuan} onChange={(event) => setProduct({ ...product, display_price_yuan: Number(event.target.value) })} className={inputClass} /></Field>
              <Field label="amount_cents"><input type="number" step="1" value={product.amount_cents} onChange={(event) => setProduct({ ...product, amount_cents: Number(event.target.value) })} className={inputClass} /></Field>
            </div>
            <Field label="cycle"><input value={product.cycle} onChange={(event) => setProduct({ ...product, cycle: event.target.value })} className={inputClass} /></Field>
            <Field label="start_time"><input value={product.start_time} onChange={(event) => setProduct({ ...product, start_time: event.target.value })} className={inputClass} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="lecturer"><input value={product.lecturer} onChange={(event) => setProduct({ ...product, lecturer: event.target.value })} className={inputClass} /></Field>
              <Field label="status">
                <select value={product.status} onChange={(event) => setProduct({ ...product, status: event.target.value })} className={inputClass}>
                  <option value="online">online</option>
                  <option value="offline">offline</option>
                  <option value="paused">paused</option>
                </select>
              </Field>
            </div>
            <button type="submit" disabled={loading} className={primaryButtonClass}>保存产品配置</button>
          </form>

          <form onSubmit={saveLivecode} className={panelClass}>
            <SectionHeader title="企业微信活码 / 获客助手" note="公开配置不返回二维码和获客助手链接，paid 后才由 afterpay 解锁。" />
            <Field label="wecom_link"><input value={livecode.wecom_link} onChange={(event) => setLivecode({ ...livecode, wecom_link: event.target.value })} placeholder="企业微信获客助手链接" className={inputClass} /></Field>
            <Field label="qr_image">
              <input value={livecode.qr_image} onChange={(event) => setLivecode({ ...livecode, qr_image: event.target.value })} placeholder="二维码图片 URL" className={inputClass} />
              <p className="font-function text-xs text-[rgba(244,235,221,.42)]">上传功能待实现；当前支持填写二维码图片 URL。</p>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="auto_redirect_after_paid">
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-function text-sm">
                  <input type="checkbox" checked={livecode.auto_redirect_after_paid} onChange={(event) => setLivecode({ ...livecode, auto_redirect_after_paid: event.target.checked })} />
                  paid 后自动跳转获客助手
                </label>
              </Field>
              <Field label="redirect_delay_ms"><input type="number" value={livecode.redirect_delay_ms} onChange={(event) => setLivecode({ ...livecode, redirect_delay_ms: Number(event.target.value) })} className={inputClass} /></Field>
            </div>
            <Field label="remark"><input value={livecode.remark} onChange={(event) => setLivecode({ ...livecode, remark: event.target.value })} className={inputClass} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="button_text"><input value={livecode.button_text} onChange={(event) => setLivecode({ ...livecode, button_text: event.target.value })} className={inputClass} /></Field>
              <Field label="status">
                <select value={livecode.status} onChange={(event) => setLivecode({ ...livecode, status: event.target.value })} className={inputClass}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </Field>
            </div>
            <Field label="service_text"><input value={livecode.service_text} onChange={(event) => setLivecode({ ...livecode, service_text: event.target.value })} className={inputClass} /></Field>
            <button type="submit" disabled={loading} className={primaryButtonClass}>保存助教入口</button>
          </form>
        </section>

        <section className={panelClass}>
          <SectionHeader title="订单与学员" note="退款按钮留到真实支付接入后实现；当前仅做支付后承接状态。" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
              <thead>
                <tr className="border-b border-[rgba(217,189,122,.1)] bg-white/[.025]">
                  {["order_id", "product_name", "amount_cents", "pay_channel", "pay_status", "channel", "campaign", "creative", "created_at", "paid_at", "已加微", "已入群", "操作"].map((column) => (
                    <th key={column} className="px-3 py-3 text-left font-function text-xs font-medium text-[rgba(244,235,221,.52)]">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id} className="border-b border-[rgba(217,189,122,.08)]">
                    <td className="px-3 py-3 font-mono text-xs">{order.order_id}</td>
                    <td className="px-3 py-3 font-function text-sm">{order.product_name}</td>
                    <td className="px-3 py-3 font-mono text-sm">{order.amount_cents}</td>
                    <td className="px-3 py-3 font-function text-sm">{order.pay_channel}</td>
                    <td className="px-3 py-3"><StatusPill value={order.pay_status} /></td>
                    <td className="px-3 py-3 font-function text-sm">{order.channel || "-"}</td>
                    <td className="px-3 py-3 font-function text-sm">{order.campaign || "-"}</td>
                    <td className="px-3 py-3 font-function text-sm">{order.creative || "-"}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatTime(order.created_at)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatTime(order.paid_at)}</td>
                    <td className="px-3 py-3 font-function text-sm">{order.course_user?.added_wechat ? "是" : "否"}</td>
                    <td className="px-3 py-3 font-function text-sm">{order.course_user?.joined_group ? "是" : "否"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={tinyButtonClass} onClick={() => markCourseUser(order.order_id, { added_wechat: true })} disabled={order.pay_status !== "paid"}>标记已加微</button>
                        <button type="button" className={tinyButtonClass} onClick={() => markCourseUser(order.order_id, { joined_group: true })} disabled={order.pay_status !== "paid"}>标记已入群</button>
                        <button type="button" className={tinyButtonClass} onClick={() => setSelectedOrder(order)}>详情</button>
                        <span className="rounded border border-[rgba(244,235,221,.1)] px-2 py-1 font-function text-xs text-[rgba(244,235,221,.34)]">退款 TODO</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedOrder ? (
            <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-[rgba(217,189,122,.12)] bg-black/25 p-4 font-mono text-xs leading-6 text-[rgba(244,235,221,.68)]">
              {JSON.stringify(selectedOrder, null, 2)}
            </pre>
          ) : null}
        </section>

        <section className={panelClass}>
          <SectionHeader title="操作日志" note="价格、活码、学员承接状态的变更都应在这里可追溯。" />
          <div className="grid gap-3">
            {auditLogs.map((log) => (
              <details key={`${log.created_at}-${log.action}-${log.target_id}`} className="rounded-lg border border-[rgba(217,189,122,.1)] bg-black/20 p-3">
                <summary className="cursor-pointer font-function text-sm text-[rgba(244,235,221,.78)]">
                  {log.created_at} · {log.admin_id} · {log.action} · {log.target_type}:{log.target_id} · {log.ip || "-"}
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <JsonBox label="before_json" value={log.before_json} />
                  <JsonBox label="after_json" value={log.after_json} />
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[rgba(217,189,122,.14)] bg-[#11100D]/78 p-4">
      <p className="font-function text-xs text-[rgba(244,235,221,.48)]">{label}</p>
      <p className="mt-2 font-mono text-2xl text-[#D8B76F]">{value}</p>
    </div>
  )
}

function SectionHeader({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-story text-xl tracking-[.04em]">{title}</h2>
      <p className="mt-1 font-function text-xs leading-6 text-[rgba(244,235,221,.48)]">{note}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-function text-xs text-[rgba(244,235,221,.46)]">{label}</span>
      {children}
    </label>
  )
}

function StatusPill({ value }: { value: string }) {
  const paid = value === "paid"
  return (
    <span className={`rounded-full border px-2.5 py-1 font-function text-xs ${paid ? "border-[rgba(95,132,117,.3)] bg-[rgba(95,132,117,.14)] text-[rgba(174,205,191,.9)]" : "border-[rgba(216,183,111,.2)] bg-[rgba(216,183,111,.1)] text-[rgba(216,183,111,.86)]"}`}>
      {value}
    </span>
  )
}

function JsonBox({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-2 font-function text-xs text-[rgba(244,235,221,.44)]">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-lg bg-black/25 p-3 font-mono text-xs leading-6 text-[rgba(244,235,221,.62)]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function formatTime(value?: string | null) {
  if (!value) return "-"
  return value.replace("T", " ").slice(0, 19)
}

const panelClass = "rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/82 p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)]"
const inputClass = "min-h-10 w-full rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-function text-sm text-[rgba(244,235,221,.82)] outline-none placeholder:text-[rgba(244,235,221,.28)]"
const primaryButtonClass = "mt-2 min-h-10 rounded-lg border border-[rgba(216,183,111,.28)] bg-[linear-gradient(135deg,rgba(216,183,111,.22),rgba(95,132,117,.12))] px-4 font-function text-sm text-[#F4EBDD] transition hover:border-[rgba(216,183,111,.5)] disabled:cursor-not-allowed disabled:opacity-55"
const secondaryButtonClass = "min-h-10 rounded-lg border border-[rgba(217,189,122,.18)] px-4 font-function text-sm text-[rgba(244,235,221,.74)] transition hover:border-[rgba(216,183,111,.42)] disabled:cursor-not-allowed disabled:opacity-55"
const tinyButtonClass = "rounded border border-[rgba(217,189,122,.16)] px-2 py-1 font-function text-xs text-[rgba(244,235,221,.7)] transition hover:border-[rgba(216,183,111,.4)] disabled:cursor-not-allowed disabled:opacity-35"
