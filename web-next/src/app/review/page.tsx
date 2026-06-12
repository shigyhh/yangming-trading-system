import { redirect } from "next/navigation"

export default async function ReviewCompatibilityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item))
      return
    }
    if (value !== undefined) query.set(key, value)
  })

  const suffix = query.toString()
  redirect(suffix ? `/trade-review?${suffix}` : "/trade-review")
}
