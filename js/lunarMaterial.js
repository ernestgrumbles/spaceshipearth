import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function createLunarMaterial(texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      moonMap: { value: texture },
      phase: { value: 0.72 },
      illum: { value: 0.57 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D moonMap;
      uniform float phase;
      uniform float illum;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vec3 texel = texture2D(moonMap, vUv).rgb;

        // Use the visible face normal as a simple screen-space lunar phase mask.
        // This is intentionally presentation-forward: the displayed illumination
        // percentage now controls how much of the lunar disk actually reads as lit.
        float waning = step(0.5, phase);
        float side = mix(1.0, -1.0, waning);
        float phaseAxis = side * vNormal.x;
        float litThreshold = mix(0.96, -0.96, illum);
        float falloff = smoothstep(litThreshold - 0.10, litThreshold + 0.10, phaseAxis);

        float limb = smoothstep(0.0, 1.0, max(vNormal.z, 0.0));
        float earthshine = 0.025;
        float litStrength = 1.24;
        float light = earthshine + falloff * litStrength;
        light *= 0.72 + limb * 0.34;
        light = clamp(light, 0.0, 1.20);

        gl_FragColor = vec4(texel * light, 1.0);
      }
    `,
  });
}

export function updateLunarMaterial(material, moonInfo) {
  if (!material || !material.uniforms) return;
  material.uniforms.phase.value = moonInfo.phase;
  material.uniforms.illum.value = moonInfo.illumination / 100;
}
