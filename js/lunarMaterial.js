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
        float waning = step(0.5, phase);
        float side = mix(1.0, -1.0, waning);
        float phaseOffset = (illum - 0.5) * 1.15;
        float falloff = smoothstep(phaseOffset - 0.78, phaseOffset + 0.78, side * vNormal.x);
        float limb = smoothstep(0.0, 1.0, max(vNormal.z, 0.0));
        float earthshine = 0.16;
        float light = earthshine + falloff * 0.88;
        light *= 0.70 + limb * 0.30;
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
