import { redirect } from "next/navigation"

type ReviewRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function buildTradeReviewQuery(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
      return
    }

    if (typeof value === "string") params.set(key, value)
  })

  return params.toString()
}

export default async function ReviewRedirectPage({ searchParams }: ReviewRedirectPageProps) {
  const query = buildTradeReviewQuery(await searchParams)

  redirect(`/trade-review${query ? `?${query}` : ""}`)
}
