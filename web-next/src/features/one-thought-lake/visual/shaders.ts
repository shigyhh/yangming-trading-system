export const thoughtParticleVertexShader = `
attribute float aAlpha;
attribute float aDepth;
attribute float aPhase;
attribute float aSize;
attribute vec3 aColor;

uniform float uGoldIntensity;
uniform float uPixelRatio;
uniform float uTime;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float breath = 0.82 + 0.18 * sin(uTime * 0.72 + aPhase);
  float nearScale = clamp(520.0 / max(180.0, -mvPosition.z), 0.72, 1.56);

  gl_PointSize = aSize * uPixelRatio * breath * nearScale * 1.14;
  gl_Position = projectionMatrix * mvPosition;

  vAlpha = aAlpha * (0.98 + aDepth * 0.34) * uGoldIntensity;
  vColor = aColor;
}
`

export const thoughtParticleFragmentShader = `
precision highp float;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float distanceToCenter = length(center);
  float softCircle = smoothstep(0.5, 0.0, distanceToCenter);
  float ember = smoothstep(0.22, 0.0, distanceToCenter);
  float alpha = softCircle * vAlpha;

  if (alpha < 0.01) discard;

  vec3 color = mix(vColor * 0.78, vec3(1.0, 0.9, 0.58), ember * 0.38);
  gl_FragColor = vec4(color, alpha);
}
`
