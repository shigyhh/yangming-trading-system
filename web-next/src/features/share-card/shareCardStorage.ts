import { getStorage, setStorage } from "@/features/assessment/storage"

import type { ShareCard } from "./shareCardTypes"

export const shareCardStorageKey = "ym_share_cards_v1"
export const latestShareCardStorageKey = "ym_latest_share_card_v1"

export function loadShareCards() {
  return getStorage<ShareCard[]>(shareCardStorageKey, [])
}

export function loadLatestShareCard() {
  return getStorage<ShareCard | null>(latestShareCardStorageKey, null)
}

export function saveShareCard(card: ShareCard) {
  const nextCards = [
    ...loadShareCards().filter((item) => item.shareCardId !== card.shareCardId && !(item.sourceType === card.sourceType && item.sourceId === card.sourceId)),
    card,
  ]

  setStorage(shareCardStorageKey, nextCards)
  setStorage(latestShareCardStorageKey, card)

  return nextCards
}
