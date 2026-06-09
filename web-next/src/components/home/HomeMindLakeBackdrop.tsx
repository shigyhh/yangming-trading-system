import styles from "./HomeMindLakeBackdrop.module.css"

const floatingThoughts = [
  { text: "「再等等。」", className: styles.thoughtA },
  { text: "「回本我就走。」", className: styles.thoughtB },
  { text: "「卖完就涨。」", className: styles.thoughtC },
]

export default function HomeMindLakeBackdrop() {
  return (
    <div className={styles.homeMindLake} aria-hidden="true">
      <div className={styles.layerHeartLake} />
      <div className={styles.layerDistantMarket}>
        <div className={styles.marketMist} />
        <div className={styles.marketLights} />
      </div>
      <div className={styles.layerStillWater} />
      <div className={styles.layerSubtleGlow} />
      <div className={styles.layerFloatingThoughts}>
        {floatingThoughts.map((item) => (
          <span key={item.text} className={`${styles.floatingThought} ${item.className}`}>
            {item.text}
          </span>
        ))}
      </div>
      <div className={styles.layerMirrorAura}>
        <div className={`${styles.mirrorAura} ${styles.mirrorAuraLeft}`} />
        <div className={`${styles.mirrorAura} ${styles.mirrorAuraRight}`} />
        <div className={styles.mirrorAuraBridge} />
      </div>
      <div className={styles.layerVignette} />
    </div>
  )
}
