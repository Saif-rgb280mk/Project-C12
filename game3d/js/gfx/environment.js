// KINETIC XI 3D — graphics
// environment.js : sky, sun, floodlights, light shafts, stars, fog and the PBR environment map.
//   Clear Day / Sunset : physically based Sky (Preetham model) + shadow-casting sun.
//   Floodlit Night / Rain : four roof-corner floodlight SpotLights with real-time shadow maps,
//   additive volumetric light shafts, a star field and exponential fog.
//   The environment map (PMREM) is re-baked for every condition so PBR materials reflect
//   the right sky or floodlight rig.
'use strict';
(function (K) {
  const G = K.GFX, P = K.PITCH;

  const COND = {
    'Clear Day': { sky: true, sunElev: 52, sunAz: 145, turb: 2.6, rayleigh: 0.9, mie: 0.0022, sun: 3.2, sunColor: '#fff2df',
      hemi: ['#cfe3ff', '#40613a', 0.85], flood: 0, exposure: 0.56, fog: ['#a9c2db', 0.00028], stars: false, lamp: 0.4 },
    Sunset: { sky: true, sunElev: 4, sunAz: 250, turb: 6.5, rayleigh: 2.2, mie: 0.007, sun: 2.6, sunColor: '#ff8f4f',
      hemi: ['#ffb48a', '#2a2418', 0.42], flood: 0.32, exposure: 0.8, fog: ['#b86f4c', 0.0011], stars: false, lamp: 4 },
    'Floodlit Night': { sky: false, bg: '#03060c', sun: 0, hemi: ['#2c3c5c', '#0a1208', 0.2], flood: 1, exposure: 0.9,
      fog: ['#0a0f18', 0.0011], stars: true, lamp: 10 },
    Rain: { sky: false, bg: '#080b11', sun: 0, hemi: ['#34425c', '#0b120b', 0.3], flood: 0.95, exposure: 0.98,
      fog: ['#1b2331', 0.0032], stars: false, lamp: 10, rain: true, wet: true },
  };
  G.CONDITION_NAMES = Object.keys(COND);

  /** Additive light-shaft cone (fake volumetrics): bright near the lamp, fading with
   *  distance and toward the silhouette edges. */
  function shaftMaterial(T) {
    return new T.ShaderMaterial({
      uniforms: { uColor: { value: new T.Color('#fff2d6') }, uIntensity: { value: 0.08 }, uLen: { value: 90 } },
      vertexShader: `
        uniform float uLen; varying float vT; varying vec3 vN; varying vec3 vView; varying float vNear;
        void main() {
          vT = clamp(-position.y / uLen, 0.0, 1.0);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vNear = smoothstep(10.0, 38.0, distance(cameraPosition, wp.xyz));
          vN = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uIntensity; varying float vT; varying vec3 vN; varying vec3 vView; varying float vNear;
        void main() {
          float edge = pow(abs(dot(normalize(vN), normalize(vView))), 1.7);
          float fade = smoothstep(0.0, 0.06, vT) * pow(1.0 - vT, 1.3);
          gl_FragColor = vec4(uColor * uIntensity * edge * fade * vNear, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
    });
  }

  G.Atmosphere = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      this.engine = engine;
      const scene = (this.scene = engine.scene);
      this.pmrem = new T.PMREMGenerator(engine.renderer);
      this.envTarget = null;

      this.sky = new T.Sky();
      this.sky.scale.setScalar(4500);
      scene.add(this.sky);

      this.hemi = new T.HemisphereLight('#cfe3ff', '#40613a', 0.8);
      scene.add(this.hemi);

      const sun = (this.sun = new T.DirectionalLight('#fff2df', 3));
      sun.castShadow = true;
      const sc = sun.shadow.camera;
      sc.left = -72; sc.right = 72; sc.top = 50; sc.bottom = -50; sc.near = 20; sc.far = 420;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.03;
      scene.add(sun);
      scene.add(sun.target);

      // Roof-corner floodlight clusters, each aimed across the pitch at the far quadrant.
      this.floods = [];
      this.shafts = [];
      const corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
      for (const [sx, sz] of corners) {
        const light = new T.SpotLight('#fff4e0', 0, 0, 0.64, 0.6, 2);
        light.position.set(sx * 57.5, 37.0, sz * 39.0);
        light.target.position.set(-sx * 16, 0, -sz * 9);
        light.castShadow = true;
        light.shadow.camera.near = 35;
        light.shadow.camera.far = 170;
        light.shadow.bias = -0.00025;
        light.shadow.normalBias = 0.04;
        scene.add(light);
        scene.add(light.target);
        this.floods.push(light);
        // Light shaft
        const dir = light.target.position.clone().sub(light.position);
        const len = Math.min(dir.length(), 95);
        const geo = new T.ConeGeometry(len * Math.tan(0.5), len, 40, 1, true);
        geo.translate(0, -len / 2, 0);
        const mat = shaftMaterial(T);
        mat.uniforms.uLen.value = len;
        const cone = new T.Mesh(geo, mat);
        cone.position.copy(light.position);
        cone.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), dir.normalize());
        cone.renderOrder = 10;
        cone.frustumCulled = false;
        scene.add(cone);
        this.shafts.push(cone);
      }

      // Star field for clear nights.
      const n = 1800, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = Math.random() * Math.PI * 2, v = Math.acos(1 - Math.random() * 0.95);
        pos[i * 3] = Math.sin(v) * Math.cos(u) * 1800;
        pos[i * 3 + 1] = Math.cos(v) * 1800;
        pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 1800;
      }
      const sg = new T.BufferGeometry();
      sg.setAttribute('position', new T.BufferAttribute(pos, 3));
      this.stars = new T.Points(sg, new T.PointsMaterial({ color: '#d4dcff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
      scene.add(this.stars);

      scene.fog = new T.FogExp2('#0a0f18', 0.0011);
      this.condition = null;
      this.shadowQuality = '2048';
      this.volumetric = true;
      this.time = 0;
    }

    get def() { return COND[this.condition] || COND['Floodlit Night']; }

    setConditions(name) {
      const T = this.T, c = COND[name] || COND['Floodlit Night'];
      this.condition = COND[name] ? name : 'Floodlit Night';
      const scene = this.scene;
      this.sky.visible = c.sky;
      if (c.sky) {
        const u = this.sky.material.uniforms;
        u.turbidity.value = c.turb; u.rayleigh.value = c.rayleigh; u.mieCoefficient.value = c.mie; u.mieDirectionalG.value = 0.8;
        const sunDir = new T.Vector3().setFromSphericalCoords(1, T.MathUtils.degToRad(90 - c.sunElev), T.MathUtils.degToRad(c.sunAz));
        u.sunPosition.value.copy(sunDir);
        this.sun.position.copy(sunDir).multiplyScalar(220);
        scene.background = null;
      } else {
        scene.background = new T.Color(c.bg);
      }
      this.sun.intensity = c.sun;
      this.sun.color.set(c.sunColor || '#ffffff');
      this.sun.visible = c.sun > 0;
      this.hemi.color.set(c.hemi[0]); this.hemi.groundColor.set(c.hemi[1]); this.hemi.intensity = c.hemi[2];
      for (const f of this.floods) { f.intensity = 8200 * c.flood; f.visible = c.flood > 0; }
      this.stars.visible = c.stars;
      scene.fog.color.set(c.fog[0]);
      scene.fog.density = c.fog[1];
      this.engine.renderer.toneMappingExposure = c.exposure;
      this.engine.setBloomStrength(c.sky ? (c.flood > 0 ? 0.32 : 0.18) : 0.55);
      this.applyShafts();
      this.applyShadows();
      this.bakeEnvironment(c);
    }

    bakeEnvironment(c) {
      const T = this.T;
      const env = new T.Scene();
      if (c.sky) {
        const sky = new T.Sky();
        sky.scale.setScalar(1000);
        for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) sky.material.uniforms[k].value = this.sky.material.uniforms[k].value;
        sky.material.uniforms.sunPosition.value.copy(this.sky.material.uniforms.sunPosition.value);
        env.add(sky);
      } else {
        const dome = new T.Mesh(new T.SphereGeometry(100, 24, 16), new T.MeshBasicMaterial({ color: c.bg, side: T.BackSide }));
        env.add(dome);
        const lampMat = new T.MeshBasicMaterial({ color: new T.Color('#fff2d8').multiplyScalar(18 * c.flood) });
        for (const f of this.floods) {
          const q = new T.Mesh(new T.PlaneGeometry(14, 5), lampMat);
          q.position.copy(f.position).multiplyScalar(0.9);
          q.lookAt(0, 0, 0);
          env.add(q);
        }
        const ground = new T.Mesh(new T.CircleGeometry(80, 24), new T.MeshBasicMaterial({ color: '#0f2a12' }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        env.add(ground);
      }
      if (this.envTarget) this.envTarget.dispose();
      this.envTarget = this.pmrem.fromScene(env, 0.02);
      this.scene.environment = this.envTarget.texture;
      env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }

    setShadowQuality(q) {
      this.shadowQuality = q;
      this.applyShadows();
    }

    applyShadows() {
      const on = this.shadowQuality !== 'Off';
      const size = parseInt(this.shadowQuality, 10) || 1024;
      const r = this.engine.renderer;
      const wasOn = r.shadowMap.enabled;
      r.shadowMap.enabled = on;
      const setSize = (light) => {
        if (light.shadow.mapSize.x !== size) {
          light.shadow.mapSize.set(size, size);
          if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
        }
      };
      this.sun.castShadow = on && this.sun.visible;
      setSize(this.sun);
      const casting = size >= 2048 ? 4 : 2;
      this.floods.forEach((f, i) => { f.castShadow = on && f.visible && i < casting; setSize(f); });
      if (wasOn !== on) this.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
    }

    setVolumetric(on) { this.volumetric = on; this.applyShafts(); }

    applyShafts() {
      const c = this.def;
      for (const s of this.shafts) {
        s.visible = this.volumetric && c.flood > 0;
        s.material.uniforms.uIntensity.value = (c.rain ? 0.12 : c.sky ? 0.05 : 0.075) * c.flood;
      }
    }

    update(dt) {
      this.time += dt;
      // Subtle floodlight flicker in rain (droplets crossing the beams).
      if (this.def.rain && this.volumetric) for (const s of this.shafts) s.material.uniforms.uIntensity.value = 0.11 + 0.015 * Math.sin(this.time * 9 + s.id);
    }
  };
})(window.KXI);
