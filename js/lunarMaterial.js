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
        texel = pow(texel, vec3(0.82));

        float waning = step(0.5, phase);
        float side = mix(1.0, -1.0, waning);
        float x = side * vNormal.x;
        float y = vNormal.y;
        float diskCurve = sqrt(max(0.0, 1.0 - y * y));

        float crescentWidth = max(0.02, illum);
        float boundary = diskCurve * (1.0 - crescentWidth * 2.0);
        float falloff = smoothstep(boundary - 0.045, boundary + 0.045, x);

        float limb = smoothstep(0.0, 1.0, max(vNormal.z, 0.0));
        float earthshine = 0.10;
        float litStrength = 1.18;
        float light = earthshine + falloff * litStrength;
        light *= 0.78 + limb * 0.30;
        light = clamp(light, 0.0, 1.20);

        vec3 shadowFloor = vec3(0.018) * (1.0 - falloff) * limb;
        gl_FragColor = vec4(texel * light + shadowFloor, 1.0);
      }
    `,
  });
}

export function updateLunarMaterial(material, moonInfo) {
  if (!material || !material.uniforms) return;
  material.uniforms.phase.value = moonInfo.phase;
  material.uniforms.illum.value = moonInfo.illumination / 100;
}
