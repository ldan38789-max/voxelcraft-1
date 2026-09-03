// ==============================================================================
// SHADER KHỐI (BLOCK) — ánh sáng đỉnh được nướng sẵn (baked vertex light + AO),
// điều chế thêm theo chu kỳ ngày/đêm qua uniform `dayLight`.
// ==============================================================================
export const blockVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vLight;
  attribute float lightValue;

  void main() {
    vUv = uv;
    vLight = lightValue;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const blockFragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float dayLight;
  varying vec2 vUv;
  varying float vLight;

  void main() {
    vec4 texColor = texture2D(map, vUv);
    if (texColor.a < 0.1) discard;
    float night = mix(0.22, 1.0, clamp(dayLight, 0.0, 1.0));
    vec3 shaded = texColor.rgb * vLight * night;
    gl_FragColor = vec4(shaded, 1.0);
  }
`;

// ==============================================================================
// SHADER NƯỚC — trong suốt, có sóng nhẹ ở mặt trên, đổi màu theo ngày/đêm
// ==============================================================================
export const waterVertexShader = /* glsl */ `
  uniform float time;
  attribute float lightValue;
  attribute float topFlag;
  varying float vLight;

  void main() {
    vLight = lightValue;
    vec3 pos = position;
    if (topFlag > 0.5) {
      pos.y += sin(pos.x * 0.6 + time * 1.6) * 0.045 + cos(pos.z * 0.5 + time * 1.3) * 0.045;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const waterFragmentShader = /* glsl */ `
  uniform float dayLight;
  uniform vec3 waterColor;
  uniform float opacity;
  varying float vLight;

  void main() {
    float night = mix(0.3, 1.0, clamp(dayLight, 0.0, 1.0));
    vec3 shaded = waterColor * vLight * night;
    gl_FragColor = vec4(shaded, opacity);
  }
`;

// ==============================================================================
// SHADER SKY DOME — gradient trời + mặt trời/mặt trăng + sao ban đêm
// ==============================================================================
export const skyVertexShader = /* glsl */ `
  varying vec3 vWorldDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(worldPos.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const skyFragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float starOpacity;
  varying vec3 vWorldDir;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 sky = mix(bottomColor, topColor, pow(h, 0.55));

    float sunAmount = max(dot(dir, normalize(sunDirection)), 0.0);
    vec3 sunGlow = sunColor * pow(sunAmount, 12.0) * 0.9;
    float sunDisc = smoothstep(0.9993, 0.9998, sunAmount);
    sky += sunGlow;
    sky = mix(sky, sunColor, sunDisc);

    if (dir.y > 0.0 && starOpacity > 0.01) {
      vec3 cell = floor(dir * 140.0);
      float s = hash(cell);
      float star = step(0.9975, s) * starOpacity;
      sky += vec3(star);
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;
