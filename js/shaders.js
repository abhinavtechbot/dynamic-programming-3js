import * as THREE from 'three';

/**
 * Custom WebGL GLSL Ground Grid + Active Subproblem Harmonic Ripple Shader
 */
export function createGroundFieldMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uActivePos: { value: new THREE.Vector3(0, 0, 0) },
      uActiveStrength: { value: 0.0 },
      uActiveColor: { value: new THREE.Color(0x22d3ee) },
      uIsLight: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uActivePos;
      uniform float uActiveStrength;
      uniform vec3 uActiveColor;
      uniform float uIsLight;
      varying vec3 vWorldPos;

      void main() {
        // Multi-scale Cartesian grid in XZ plane
        vec2 coord = vWorldPos.xz * 0.5;
        vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
        float line = min(grid.x, grid.y);
        float minorGrid = 1.0 - min(line, 1.0);

        vec2 majorCoord = vWorldPos.xz * 0.125;
        vec2 mGrid = abs(fract(majorCoord - 0.5) - 0.5) / fwidth(majorCoord);
        float majorLine = 1.0 - min(min(mGrid.x, mGrid.y), 1.0);

        // Distance fade from origin
        float distOrigin = length(vWorldPos.xz);
        float radialFade = smoothstep(38.0, 6.0, distOrigin);

        // Harmonic energy ripple under currently executing DP state
        float distActive = length(vWorldPos.xz - uActivePos.xz);
        float wave = sin(distActive * 2.6 - uTime * 4.5) * 0.5 + 0.5;
        float ring = smoothstep(5.5, 0.0, distActive) * wave * uActiveStrength;
        float coreSpot = smoothstep(2.4, 0.0, distActive) * uActiveStrength;

        vec3 darkBase = vec3(0.10, 0.18, 0.34) * minorGrid * 0.45
                      + vec3(0.18, 0.36, 0.62) * majorLine * 0.65;
        vec3 lightBase = vec3(0.55, 0.62, 0.74) * minorGrid * 0.40
                       + vec3(0.32, 0.42, 0.58) * majorLine * 0.58;
        vec3 baseCol = mix(darkBase, lightBase, uIsLight);
        vec3 rippleCol = uActiveColor * (ring * 0.55 + coreSpot * 0.45);

        vec3 finalCol = baseCol + rippleCol;
        float alpha = clamp((minorGrid * 0.25 + majorLine * 0.45 + ring * 0.4 + coreSpot * 0.35) * radialFade, 0.0, 0.85);

        gl_FragColor = vec4(finalCol, alpha);
      }
    `,
  });
}

/**
 * Custom WebGL GLSL Directional Energy Pulse Shader for 3D Dependency Tubes
 * Animates directional packets from UV.x = 0 (source subproblem) -> UV.x = 1 (target state)
 */
export function createEnergyPulseMaterial(hexColor = 0x22d3ee, speed = 1.6, opacity = 0.9) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(hexColor) },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
      uProgress: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uSpeed;
      uniform float uOpacity;
      uniform float uProgress;
      varying vec2 vUv;

      void main() {
        if (vUv.x > uProgress) discard;

        // Traveling directional light pulses from source (0.0) -> target (1.0)
        float phase = fract(vUv.x * 2.2 - uTime * uSpeed);
        float pulse = smoothstep(0.0, 0.25, phase) * smoothstep(0.85, 0.25, phase);
        float headGlow = smoothstep(0.15, 0.0, abs(vUv.x - uProgress));

        vec3 col = uColor * (0.45 + pulse * 1.35 + headGlow * 1.2);
        float alpha = (0.28 + pulse * 0.72) * uOpacity;

        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * Custom WebGL GLSL Fresnel Aura Shell for Active / Cache-Hit 3D Nodes
 */
export function createFresnelHaloMaterial(hexColor = 0x22d3ee) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(hexColor) },
      uIntensity: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.2);
        float breathe = 0.8 + 0.2 * sin(uTime * 5.0);
        gl_FragColor = vec4(uColor * breathe * 1.4, fresnel * 0.85 * uIntensity);
      }
    `,
  });
}
