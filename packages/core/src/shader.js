/**
 * WebGL2 refraction. The tier that exists because Safari will not apply an SVG
 * filter to a live <video>, and because canvas-drawn content has no live DOM to
 * bend. It reads the same conceptual material as the SVG path — bevelled rim,
 * Snell refraction, per-channel dispersion, Fresnel specular — but evaluates it
 * per-pixel in the fragment shader instead of baking it into a map.
 *
 * Deliberately kept to WebGL2 rather than WebGPU: WebGPU's baseline is still
 * limited (no macOS-Intel or Linux Firefox), so WebGL2 is the floor.
 */

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;      // the backdrop
uniform vec2  u_texSize;      // backdrop size in px
uniform vec2  u_origin;       // this surface's top-left within the backdrop, px
uniform vec2  u_size;         // this surface's size, px
uniform float u_radius;       // corner radius, px
uniform float u_band;         // width of the edge lens ring, px
uniform float u_depth;        // apparent thickness, px
uniform float u_curvature;
uniform float u_ior;
uniform float u_chroma;       // 0..1 dispersion
uniform float u_spec;         // 0..1 specular intensity
uniform float u_specPower;
uniform vec3  u_light;
uniform float u_blur;         // frost radius, px
uniform float u_saturate;
uniform float u_tintA;
uniform vec3  u_tint;

// exact SDF for a rounded box, negative inside
float sdRoundRect(vec2 p, vec2 half_, float r) {
  vec2 q = abs(p) - half_ + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// analytic gradient: unit length except on the medial axis
vec2 gradRoundRect(vec2 p, vec2 half_, float r) {
  vec2 s = sign(p);
  s = vec2(s.x == 0.0 ? 1.0 : s.x, s.y == 0.0 ? 1.0 : s.y);
  vec2 q = abs(p) - half_ + r;
  if (q.x > 0.0 && q.y > 0.0) return s * normalize(q);
  return q.x > q.y ? vec2(s.x, 0.0) : vec2(0.0, s.y);
}

// dh/du for the bevel. Slope -> 0 at u = 1, which is what makes the interior of
// the lens mathematically undisplaced.
float bevelSlope(float u, float c) {
  return c * pow(max(1.0 - u, 0.0), c - 1.0);
}

// a cheap separable-ish frost. Poisson-style taps on a golden-angle spiral give
// a smooth result at far fewer samples than a box blur.
vec3 frost(vec2 uv, float radiusPx) {
  if (radiusPx < 0.35) return texture(u_tex, uv).rgb;
  vec3 sum = vec3(0.0);
  float total = 0.0;
  const int TAPS = 16;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float a = fi * 2.39996323;                       // golden angle
    float r = sqrt((fi + 0.5) / float(TAPS)) * radiusPx;
    vec2 off = vec2(cos(a), sin(a)) * r / u_texSize;
    float w = 1.0 - r / (radiusPx + 1.0);
    sum += texture(u_tex, uv + off).rgb * w;
    total += w;
  }
  return sum / total;
}

void main() {
  // fragment position in surface-local px, origin at the centre
  vec2 local = v_uv * u_size - u_size * 0.5;
  vec2 half_ = u_size * 0.5;
  float d = sdRoundRect(local, half_, u_radius);

  // outside the silhouette: fully transparent, the CSS rim draws the edge
  if (d > 0.0) { outColor = vec4(0.0); return; }

  float u = clamp(-d / u_band, 0.0, 1.0);
  vec2 g = gradRoundRect(local, half_, u_radius);
  float s = u_depth * bevelSlope(u, u_curvature) / u_band;
  vec2 h = s * -g;                                   // grad(height)

  vec3 N = normalize(vec3(-h, 1.0));

  // Snell, thin slab. I = (0,0,-1)
  vec2 base = (local + u_origin + u_size * 0.5) / u_texSize;

  vec3 rgb;
  // per-channel index of refraction == real dispersion, not a flat RGB offset
  float spread = u_chroma * 0.045;
  float iorR = u_ior * (1.0 + spread);
  float iorG = u_ior;
  float iorB = u_ior * (1.0 - spread);
  float chan[3];
  chan[0] = iorR; chan[1] = iorG; chan[2] = iorB;
  for (int c = 0; c < 3; c++) {
    float eta = 1.0 / chan[c];
    float cosi = N.z;
    float k = 1.0 - eta * eta * (1.0 - cosi * cosi);
    vec2 off = vec2(0.0);
    if (k >= 0.0) {
      float f = eta * cosi - sqrt(k);
      vec3 T = vec3(f * N.xy, -eta + f * N.z);
      if (T.z < -1e-6) off = T.xy * (u_depth / -T.z);
    }
    vec2 uv = base + off / u_texSize;
    rgb[c] = frost(clamp(uv, vec2(0.001), vec2(0.999)), u_blur)[c];
  }

  // vibrancy, matching the CSS saturate() step
  float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(l), rgb, u_saturate);

  // tint
  rgb = mix(rgb, u_tint, u_tintA);

  // Fresnel + Blinn specular from the same normal
  float spec = pow(max(dot(N, normalize(u_light)), 0.0), u_specPower);
  float fres = pow(1.0 - N.z, 5.0) * 4.0;
  rgb += (spec + fres) * u_spec;

  // antialias the silhouette
  float aa = clamp(-d, 0.0, 1.0);
  outColor = vec4(rgb, aa);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{draw: Function, setSource: Function, dispose: Function} | null}
 */
export function createShaderSurface(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
  });
  if (!gl) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const U = {};
  for (const n of ['u_tex', 'u_texSize', 'u_origin', 'u_size', 'u_radius', 'u_band',
    'u_depth', 'u_curvature', 'u_ior', 'u_chroma', 'u_spec', 'u_specPower',
    'u_light', 'u_blur', 'u_saturate', 'u_tintA', 'u_tint']) {
    U[n] = gl.getUniformLocation(prog, n);
  }

  let texW = 1;
  let texH = 1;

  return {
    setSource(src) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      texW = src.width || src.videoWidth || 1;
      texH = src.height || src.videoHeight || 1;
    },

    draw(o) {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(o.w * dpr);
      const h = Math.round(o.h * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U.u_tex, 0);
      gl.uniform2f(U.u_texSize, texW, texH);
      gl.uniform2f(U.u_origin, o.x, o.y);
      gl.uniform2f(U.u_size, o.w, o.h);
      gl.uniform1f(U.u_radius, o.radius);
      gl.uniform1f(U.u_band, Math.max(o.band, 1));
      gl.uniform1f(U.u_depth, o.depth);
      gl.uniform1f(U.u_curvature, o.curvature);
      gl.uniform1f(U.u_ior, o.ior);
      gl.uniform1f(U.u_chroma, o.chroma);
      gl.uniform1f(U.u_spec, o.specular);
      gl.uniform1f(U.u_specPower, o.specularPower);
      gl.uniform3f(U.u_light, o.light[0], o.light[1], o.light[2]);
      gl.uniform1f(U.u_blur, o.blur);
      gl.uniform1f(U.u_saturate, o.saturate);
      gl.uniform1f(U.u_tintA, o.tintA);
      gl.uniform3f(U.u_tint, o.tint[0], o.tint[1], o.tint[2]);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    dispose() {
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
