import {
  getStorage,
  setStorage,
} from "@/features/assessment/storage"

import type { HeartProof } from "./heartProofTypes"

export const heartProofStorageKey = "ym_heart_proofs_v1"
export const latestHeartProofStorageKey = "ym_latest_heart_proof_v1"

export function loadHeartProofs() {
  return getStorage<HeartProof[]>(heartProofStorageKey, [])
}

export function loadLatestHeartProof() {
  return getStorage<HeartProof | null>(latestHeartProofStorageKey, null)
}

export function saveHeartProof(heartProof: HeartProof) {
  const nextProofs = [
    ...loadHeartProofs().filter((proof) => (
      proof.heartProofId !== heartProof.heartProofId &&
      !(proof.sourceType === heartProof.sourceType && proof.sourceId === heartProof.sourceId)
    )),
    heartProof,
  ]

  setStorage(heartProofStorageKey, nextProofs)
  setStorage(latestHeartProofStorageKey, heartProof)

  return nextProofs
}
