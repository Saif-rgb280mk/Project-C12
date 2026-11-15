// KINETIC XI 3D — graphics
// engine.js : WebGL renderer + post-processing chain.
//   RenderPass (HDR, half-float, optional 4x MSAA) → UnrealBloomPass (floodlight & LED glow)
//   → OutputPass (ACES filmic tone mapping + sRGB) → FXAA (optional, on the final LDR image).
// Render resolution scale, anti-aliasing mode and bloom are switchable live from the menu.
'use strict';
(function (K) {
  const G = (K.GFX = K.GFX || {});

  /** Converts a simulation position (x along pitch, y across, z up) to Three.js (y up). */
  G.toV3 = (T, p, out) => (out || new T.Vector3()).set(p.x, p.z || 0, -p.y);
  /** Simulation heading (radians, CCW from +x) → Three.js rotation.y of a model facing +Z. */
  G.yawOf = (heading) => heading + Math.PI / 2;

  G.Engine = class {
    constructor(container, T) {
      this.T = T;
      const r = (this.renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false }));
      r.outputColorSpace = T.SRGBColorSpace;
      r.toneMapping = T.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.0;
      r.shadowMap.enabled = true;
      r.shadowMap.type = T.PCFSoftShadowMap;
      r.domElement.id = 'gl';
      container.appendChild(r.domElement);
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.5, 2500);
      this.renderScale = 1;
      this.aa = 'MSAA';
      this.bloomOn = true;
      this.buildComposer();
      window.addEventListener('resize', () => this.resize());
    }

    buildComposer() {
      const T = this.T;
      if (this.composer) {
        this.composer.renderTarget1.dispose();
        this.composer.renderTarget2.dispose();
      }
      const rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, samples: this.aa === 'MSAA' ? 4 : 0 });
      const c = (this.composer = new T.EffectComposer(this.renderer, rt));
      this.renderPass = new T.RenderPass(this.scene, this.camera);
      this.bloomPass = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.55, 0.45, 0.92);
      this.outputPass = new T.OutputPass();
      this.fxaaPass = new T.ShaderPass(T.FXAAShader);
      // NaN/Inf guard. A single invalid HDR pixel (a 0^y in a shader, or a specular highlight
      // overflowing half-float range on Apple GPUs) is blurred by every bloom mip level into
      // big black rectangles. Sanitising the bloom input and the tone-mapping input stops it.
      const guard = (mat, maxV) => {
        const src = mat.fragmentShader;
        // GLSL ES 1.0 has no isnan(): NaN is the only value for which both comparisons are
        // false; min/max then clamp +Inf (and, on Metal, also discard NaN on their own).
        const M = maxV.toFixed(1);
        const fn = 'float kxiOk(float x) { return (x >= 0.0 || x <= 0.0) ? min(max(x, 0.0), ' + M + ') : 0.0; }\n' +
          'vec4 kxiSafe(vec4 c) { return vec4(kxiOk(c.r), kxiOk(c.g), kxiOk(c.b), min(max(c.a, 0.0), 1.0)); }\n';
        mat.fragmentShader = src.replace('void main()', fn + 'void main()').replace(/texture2D\(\s*tDiffuse\s*,\s*vUv\s*\)/g, 'kxiSafe(texture2D(tDiffuse, vUv))');
        mat.needsUpdate = true;
        return mat.fragmentShader !== src;
      };
      this.guarded = guard(this.bloomPass.materialHighPassFilter, 64) && guard(this.outputPass.material, 60000);
      c.addPass(this.renderPass);
      c.addPass(this.bloomPass);
      c.addPass(this.outputPass);
      c.addPass(this.fxaaPass);
      this.bloomPass.enabled = this.bloomOn;
      this.bloomPass.strength = this.bloomStrength == null ? 0.55 : this.bloomStrength;
      this.fxaaPass.enabled = this.aa === 'FXAA';
      this.resize();
    }

    /** Bloom strength follows the lighting condition (floodlit nights glow more than daylight). */
    setBloomStrength(v) { this.bloomStrength = v; this.bloomPass.strength = v; }

    /** Applies the live graphics settings that belong to the renderer itself. */
    applyGraphics(g) {
      const scale = K.clamp(Number(g.renderScale) || 1, 0.5, 1.5);
      const aaChanged = g.aa !== this.aa;
      this.renderScale = scale;
      this.aa = g.aa;
      this.bloomOn = !!g.bloom;
      if (aaChanged) this.buildComposer();
      this.bloomPass.enabled = this.bloomOn;
      this.fxaaPass.enabled = this.aa === 'FXAA';
      this.resize();
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      // 100% = one rendered pixel per CSS pixel; 150% supersamples toward full Retina.
      const pr = this.renderScale;
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h);
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.fxaaPass.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    }

    get drawingBufferSize() {
      const v = new this.T.Vector2();
      return this.renderer.getDrawingBufferSize(v);
    }

    render() { this.composer.render(); }
  };
})(window.KXI);
