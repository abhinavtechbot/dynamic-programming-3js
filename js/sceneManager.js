import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  createGroundFieldMaterial,
  createEnergyPulseMaterial,
  createFresnelHaloMaterial,
} from './shaders.js';
import { createTextSprite, updateTextSprite } from './labels.js';

const PALETTE = {
  cyan: 0x22d3ee,
  emerald: 0x34d399,
  rose: 0xfb7185,
  gold: 0xfbbf24,
  indigo: 0x6366f1,
  sky: 0x38bdf8,
  slate: 0x334155,
  darkBase: 0x0f172a,
};

export class SceneManager {
  constructor(container, tooltipEl) {
    this.container = container;
    this.tooltipEl = tooltipEl;
    this.bloomEnabled = true;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.022);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
    this.camera.position.set(0, 6, 16);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);

    // Postprocessing Bloom
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,
      0.42,
      0.68
    );
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 48;
    this.mobileSheetCollapsed = false;
    this._tapDown = null;

    // Camera smooth transition target
    this.camGoalPos = null;
    this.camGoalTarget = null;

    // Lighting
    this._setupLights();
    this._setupEnvironment();

    // Dynamic chapter group & raycasting
    this.stageGroup = new THREE.Group();
    this.beamGroup = new THREE.Group();
    this.scene.add(this.stageGroup);
    this.scene.add(this.beamGroup);

    this.interactables = [];
    this.animatedPulseMaterials = [];
    this.activeHalo = this._createActiveHalo();
    this.scene.add(this.activeHalo);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);
    this.pointerScreen = { x: 0, y: 0 };

    // Chapter runtime refs
    this.trace = null;
    this.nodeVisuals = [];
    this.edgeVisuals = [];
    this.memoVisuals = [];
    this.barVisuals = [];
    this.gridVisuals = [];
    this.itemVisuals = [];
    this.slidingWindowMesh = null;
    this.slidingWindowTargetX = 0;
    this.slidingWindowTargetWidth = 4;

    this._bindEvents();
    this.onResize();
    this._animate();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 1.0);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(8, 16, 10);
    this.scene.add(dir);

    const rim = new THREE.PointLight(0x22d3ee, 1.8, 30);
    rim.position.set(-10, 8, -8);
    this.scene.add(rim);

    const warm = new THREE.PointLight(0xfbbf24, 1.2, 26);
    warm.position.set(10, 6, 8);
    this.scene.add(warm);
  }

  _setupEnvironment() {
    // Custom GLSL ground field plane
    const groundGeo = new THREE.PlaneGeometry(90, 90);
    groundGeo.rotateX(-Math.PI / 2);
    this.groundMat = createGroundFieldMaterial();
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.position.y = -0.02;
    this.scene.add(ground);

    // Subtle ambient floating WebGL dust particles for depth perception
    const starCount = 240;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 52;
      pos[i * 3 + 1] = Math.random() * 18 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 42;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.09,
      transparent: true,
      opacity: 0.45,
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particles);
  }

  _createActiveHalo() {
    const geo = new THREE.SphereGeometry(0.68, 28, 28);
    this.haloMat = createFresnelHaloMaterial(PALETTE.cyan);
    const mesh = new THREE.Mesh(geo, this.haloMat);
    mesh.visible = false;
    return mesh;
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this._tapDown = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' && this._tapDown) {
        const dx = e.clientX - this._tapDown.x;
        const dy = e.clientY - this._tapDown.y;
        if (Math.hypot(dx, dy) < 9) {
          const rect = this.renderer.domElement.getBoundingClientRect();
          this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          this.pointerScreen.x = e.clientX;
          this.pointerScreen.y = e.clientY;
        }
      }
      this._tapDown = null;
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointerScreen.x = e.clientX;
      this.pointerScreen.y = e.clientY;
    });

    this.renderer.domElement.addEventListener('pointerleave', () => {
      this.pointer.set(-999, -999);
      this.tooltipEl.classList.add('hidden');
    });

    this.controls.addEventListener('start', () => {
      // Cancel auto camera glide when user grabs orbit controls
      this.camGoalPos = null;
      this.camGoalTarget = null;
    });
  }

  setMobileSheetCollapsed(collapsed) {
    this.mobileSheetCollapsed = collapsed;
    this.onResize();
  }

  setTheme(mode) {
    const isLight = mode === 'light';
    const bgHex = isLight ? 0xeef2f9 : 0x070a12;
    this.scene.background.setHex(bgHex);
    this.scene.fog.color.setHex(bgHex);
    this.scene.fog.density = isLight ? 0.015 : 0.022;
    if (this.groundMat?.uniforms?.uIsLight) {
      this.groundMat.uniforms.uIsLight.value = isLight ? 1.0 : 0.0;
    }
    if (this.particles?.material) {
      this.particles.material.color.setHex(isLight ? 0x64748b : 0x60a5fa);
      this.particles.material.opacity = isLight ? 0.32 : 0.45;
    }
    if (this.bloomPass) {
      this.bloomPass.strength = isLight ? 0.14 : 0.48;
      this.bloomPass.threshold = isLight ? 0.86 : 0.68;
    }
    this.renderer.toneMappingExposure = isLight ? 1.02 : 1.08;
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;

    // On narrow portrait mobile viewports, widen vertical FOV so horizontal 3D scenes never clip
    if (w <= 768 && aspect < 1) {
      this.camera.fov = Math.min(72, 45 / Math.pow(aspect, 0.56));
      const yOffset = this.mobileSheetCollapsed ? Math.round(h * 0.02) : Math.round(h * 0.12);
      this.camera.setViewOffset(w, h, 0, yOffset, w, h);
    } else {
      this.camera.fov = 45;
      // Center optical axis squarely in the open stage between #left-panel and #right-hud
      const leftOffset = w > 1024 ? 72 : w > 768 ? 110 : 0;
      if (leftOffset > 0) {
        this.camera.setViewOffset(w, h, -leftOffset, 0, w, h);
      } else {
        this.camera.clearViewOffset();
      }
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  toggleBloom() {
    this.bloomEnabled = !this.bloomEnabled;
    return this.bloomEnabled;
  }

  resetCamera() {
    if (!this.trace || !this.trace.camera) return;
    const { pos, target } = this.trace.camera;
    const goalPos = new THREE.Vector3(...pos);
    const goalTarget = new THREE.Vector3(...target);

    // Pull camera slightly back on narrow mobile portrait screens for comfortable touch margins
    if (window.innerWidth <= 768 && window.innerWidth < window.innerHeight) {
      const dir = goalPos.clone().sub(goalTarget).multiplyScalar(1.16);
      goalPos.copy(goalTarget).add(dir);
    }

    this.camGoalPos = goalPos;
    this.camGoalTarget = goalTarget;
  }

  /* ==========================================================================
   * LOAD CHAPTER SCENE
   * ========================================================================== */
  loadTrace(trace) {
    this._clearGroup(this.stageGroup);
    this._clearBeams();

    this.trace = trace;
    this.interactables = [];
    this.nodeVisuals = [];
    this.edgeVisuals = [];
    this.memoVisuals = [];
    this.barVisuals = [];
    this.gridVisuals = [];
    this.itemVisuals = [];
    this.slidingWindowMesh = null;
    this.activeHalo.visible = false;

    if (trace.type === 'tree' || trace.type === 'memoTree') {
      this._buildTreeScene(trace);
    } else if (trace.type === 'bars1d') {
      this._buildBars1DScene(trace);
    } else if (trace.type === 'grid2d') {
      this._buildGrid2DScene(trace);
    }

    this.resetCamera();
  }

  _buildTreeScene(trace) {
    const sphereGeo = new THREE.IcosahedronGeometry(0.42, 2);

    // Static tree structural edges (dim until child becomes visible)
    for (const edge of trace.edges) {
      const fromNd = trace.nodes[edge.from];
      const toNd = trace.nodes[edge.to];
      const pts = [
        new THREE.Vector3(fromNd.x, fromNd.y, fromNd.z),
        new THREE.Vector3(toNd.x, toNd.y, toNd.z),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.0,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this.stageGroup.add(line);
      this.edgeVisuals.push({ edge, line, mat: lineMat });
    }

    // Tree Nodes
    for (const nd of trace.nodes) {
      const group = new THREE.Group();
      group.position.set(nd.x, nd.y, nd.z);
      group.scale.setScalar(0.001);

      const mat = new THREE.MeshStandardMaterial({
        color: PALETTE.slate,
        emissive: 0x000000,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.35,
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.userData.hoverInfo = () => ({
        title: `fib(${nd.val})`,
        sub: `Tree Depth: ${nd.depth} • Exact Result: ${nd.result}${
          nd.willHitCache ? ' • ⚡ Pruned by Memo Cache' : ''
        }`,
      });
      this.interactables.push(mesh);
      group.add(mesh);

      const label = createTextSprite(`f(${nd.val})`, { scale: 0.0085, fontSize: 26 });
      label.position.set(0, 0.78, 0);
      group.add(label);

      this.stageGroup.add(group);
      this.nodeVisuals.push({
        nd,
        group,
        mesh,
        mat,
        label,
        targetScale: 0.001,
        lastText: '',
      });
    }

    // Optional Memo Vault Slots (Chapter 2)
    if (trace.memoSlots && trace.memoSlots.length > 0) {
      // Vault base platform
      const vaultWidth = trace.memoSlots.length * 1.95 + 0.8;
      const platGeo = new THREE.BoxGeometry(vaultWidth, 0.16, 1.55);
      const platMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0c4a6e,
        emissiveIntensity: 0.25,
        roughness: 0.4,
        metalness: 0.6,
      });
      const platform = new THREE.Mesh(platGeo, platMat);
      platform.position.set(0, 0.06, 3.4);
      this.stageGroup.add(platform);

      const vaultTitle = createTextSprite('MEMO VAULT  memo[0..n]', {
        bgColor: 'rgba(8, 20, 40, 0.9)',
        borderColor: 'rgba(34, 211, 238, 0.5)',
        textColor: '#22d3ee',
        fontSize: 24,
        scale: 0.0085,
      });
      vaultTitle.position.set(0, 0.18, 4.55);
      this.stageGroup.add(vaultTitle);

      const slotGeo = new THREE.OctahedronGeometry(0.42, 0);
      for (const slot of trace.memoSlots) {
        const grp = new THREE.Group();
        grp.position.set(slot.x, slot.y, slot.z);

        const mat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          emissive: 0x000000,
          emissiveIntensity: 0.45,
          roughness: 0.2,
          metalness: 0.5,
          wireframe: true,
        });
        const crystal = new THREE.Mesh(slotGeo, mat);
        crystal.userData.hoverInfo = () => ({
          title: `memo[${slot.k}]`,
          sub:
            this.currentMemoVals?.[slot.k] !== null && this.currentMemoVals?.[slot.k] !== undefined
              ? `Cached Value: ${this.currentMemoVals[slot.k]} (O(1) Lookup)`
              : 'Empty cache slot (not computed yet)',
        });
        this.interactables.push(crystal);
        grp.add(crystal);

        const lbl = createTextSprite(`[${slot.k}]: ?`, { scale: 0.0082, fontSize: 25 });
        lbl.position.set(0, 0.78, 0);
        grp.add(lbl);

        this.stageGroup.add(grp);
        this.memoVisuals.push({ slot, grp, crystal, mat, lbl, lastKey: '' });
      }
    }
  }

  _buildBars1DScene(trace) {
    const pedGeo = new THREE.CylinderGeometry(0.62, 0.7, 0.18, 6);
    const colGeo = new THREE.BoxGeometry(0.95, 1, 0.95);

    for (const cell of trace.cells) {
      const grp = new THREE.Group();
      grp.position.set(cell.x, 0, cell.z);

      const pedMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.6,
      });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = 0.09;
      grp.add(ped);

      const colMat = new THREE.MeshStandardMaterial({
        color: PALETTE.slate,
        emissive: 0x000000,
        emissiveIntensity: 0.35,
        roughness: 0.22,
        metalness: 0.35,
        transparent: true,
        opacity: 0.95,
      });
      const col = new THREE.Mesh(colGeo, colMat);
      col.scale.y = 0.05;
      col.position.y = 0.18 + 0.025;
      col.userData.hoverInfo = () => ({
        title: `dp[${cell.i}]`,
        sub: `Exact Fibonacci Value: ${cell.val}${
          cell.i >= 2 ? ` = dp[${cell.i - 1}] + dp[${cell.i - 2}]` : ' (Base Case)'
        }`,
      });
      this.interactables.push(col);
      grp.add(col);

      const idxLabel = createTextSprite(`i=${cell.i}`, {
        bgColor: 'rgba(15, 23, 42, 0.78)',
        textColor: '#94a3b8',
        fontSize: 24,
        scale: 0.008,
      });
      idxLabel.position.set(0, -0.35, 0.78);
      grp.add(idxLabel);

      const valLabel = createTextSprite('?', { scale: 0.009, fontSize: 28 });
      valLabel.position.set(0, 0.75, 0);
      grp.add(valLabel);

      this.stageGroup.add(grp);
      this.barVisuals.push({
        cell,
        grp,
        col,
        colMat,
        valLabel,
        targetH: 0.08,
        curH: 0.08,
        lastKey: '',
      });
    }

    // Sliding Window Enclosure for Chapter 4 (hidden if windowRange is null)
    const winGeo = new THREE.BoxGeometry(1, 6.2, 1.85);
    const winEdges = new THREE.EdgesGeometry(winGeo);
    const winLineMat = new THREE.LineBasicMaterial({
      color: PALETTE.gold,
      transparent: true,
      opacity: 0.9,
    });
    const winGlassMat = new THREE.MeshPhysicalMaterial({
      color: PALETTE.gold,
      transparent: true,
      opacity: 0.07,
      roughness: 0.1,
      depthWrite: false,
    });

    const winGroup = new THREE.Group();
    const glass = new THREE.Mesh(winGeo, winGlassMat);
    const frame = new THREE.LineSegments(winEdges, winLineMat);
    winGroup.add(glass);
    winGroup.add(frame);
    winGroup.position.set(0, 3.1, 0);
    winGroup.visible = false;
    this.stageGroup.add(winGroup);
    this.slidingWindowMesh = winGroup;
  }

  _buildGrid2DScene(trace) {
    const { N, W, items, gridCells } = trace;
    const spacingX = 1.65;
    const spacingZ = 1.75;
    const startX = -(W * spacingX) / 2;
    const startZ = -(N * spacingZ) / 2;

    // Capacity column headers along back edge
    for (let w = 0; w <= W; w++) {
      const capLbl = createTextSprite(`w=${w}`, {
        bgColor: 'rgba(15, 23, 42, 0.85)',
        borderColor: 'rgba(56, 189, 248, 0.45)',
        textColor: '#38bdf8',
        fontSize: 24,
        scale: 0.0082,
      });
      capLbl.position.set(startX + w * spacingX, 0.35, startZ - 1.05);
      this.stageGroup.add(capLbl);
    }

    // Row 0 + Item badges along left edge
    const zeroLbl = createTextSprite('0 Items', {
      bgColor: 'rgba(15, 23, 42, 0.85)',
      textColor: '#94a3b8',
      fontSize: 23,
      scale: 0.008,
    });
    zeroLbl.position.set(startX - 1.55, 0.35, startZ);
    this.stageGroup.add(zeroLbl);

    for (let i = 1; i <= N; i++) {
      const item = items[i - 1];
      const itemZ = startZ + i * spacingZ;
      const itemLbl = createTextSprite(`${item.name}`, {
        subtext: `wt:${item.weight}  val:${item.value}`,
        bgColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(148, 163, 184, 0.45)',
        textColor: '#f8fafc',
        subColor: '#fbbf24',
        fontSize: 23,
        scale: 0.008,
      });
      itemLbl.position.set(startX - 1.7, 0.52, itemZ);
      this.stageGroup.add(itemLbl);
      this.itemVisuals.push({ item, sprite: itemLbl, selected: false });
    }

    // 2D Grid Columns
    const colGeo = new THREE.BoxGeometry(1.18, 1, 1.18);
    for (const cell of gridCells) {
      const grp = new THREE.Group();
      grp.position.set(cell.x, 0, cell.z);

      const mat = new THREE.MeshStandardMaterial({
        color: PALETTE.slate,
        emissive: 0x000000,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.35,
        transparent: true,
        opacity: 0.94,
      });
      const mesh = new THREE.Mesh(colGeo, mat);
      mesh.scale.y = 0.1;
      mesh.position.y = 0.05;
      mesh.userData.hoverInfo = () => {
        const itemDesc =
          cell.i === 0
            ? 'Base Row (0 items)'
            : `Up to Item ${cell.i}: ${items[cell.i - 1].name} (wt=${items[cell.i - 1].weight}, val=${items[cell.i - 1].value})`;
        return {
          title: `dp[${cell.i}][${cell.w}] = ${cell.val}`,
          sub: `${itemDesc} • Bag Capacity w = ${cell.w}`,
        };
      };
      this.interactables.push(mesh);
      grp.add(mesh);

      const valLbl = createTextSprite('', { scale: 0.0075, fontSize: 25 });
      valLbl.position.set(0, 0.5, 0);
      valLbl.visible = false;
      grp.add(valLbl);

      this.stageGroup.add(grp);
      this.gridVisuals.push({
        cell,
        grp,
        mesh,
        mat,
        valLbl,
        targetH: 0.12,
        curH: 0.12,
        lastKey: '',
      });
    }
  }

  /* ==========================================================================
   * APPLY STEP SNAPSHOT
   * ========================================================================== */
  applyStep(stepIdx) {
    if (!this.trace) return;
    const step = this.trace.steps[stepIdx];
    if (!step) return;

    this._clearBeams();

    if (this.trace.type === 'tree' || this.trace.type === 'memoTree') {
      this._applyTreeStep(step);
    } else if (this.trace.type === 'bars1d') {
      this._applyBars1DStep(step);
    } else if (this.trace.type === 'grid2d') {
      this._applyGrid2DStep(step);
    }
  }

  _applyTreeStep(step) {
    // Update nodes
    step.nodeStates.forEach((st, idx) => {
      const vis = this.nodeVisuals[idx];
      const nd = vis.nd;
      if (st.status === 'hidden') {
        vis.targetScale = 0.001;
        vis.label.visible = false;
        return;
      }

      vis.targetScale = st.status === 'active' || st.status === 'cacheHit' ? 1.22 : 1.0;
      vis.label.visible = true;

      let col = PALETTE.slate;
      let emCol = 0x000000;
      let border = 'rgba(148,163,184,0.45)';
      let txtCol = '#f8fafc';

      if (st.status === 'active') {
        col = PALETTE.cyan;
        emCol = PALETTE.cyan;
        border = 'rgba(34,211,238,0.85)';
        txtCol = '#22d3ee';
      } else if (st.status === 'waiting') {
        col = PALETTE.indigo;
        emCol = 0x312e81;
        border = 'rgba(129,140,248,0.6)';
      } else if (st.status === 'done') {
        col = PALETTE.emerald;
        emCol = 0x065f46;
        border = 'rgba(52,211,153,0.7)';
        txtCol = '#6ee7b7';
      } else if (st.status === 'redundant') {
        col = PALETTE.rose;
        emCol = 0x9f1239;
        border = 'rgba(251,113,133,0.85)';
        txtCol = '#fda4af';
      } else if (st.status === 'cacheHit') {
        col = PALETTE.gold;
        emCol = 0xb45309;
        border = 'rgba(251,191,36,0.9)';
        txtCol = '#fde68a';
      }

      vis.mat.color.setHex(col);
      vis.mat.emissive.setHex(emCol);

      const textStr = st.displayVal !== null ? `f(${nd.val})=${st.displayVal}` : `f(${nd.val})`;
      const cacheKey = `${textStr}_${st.status}`;
      if (vis.lastText !== cacheKey) {
        updateTextSprite(vis.label, textStr, {
          borderColor: border,
          textColor: txtCol,
          scale: 0.0082,
          fontSize: 25,
        });
        vis.lastText = cacheKey;
      }
    });

    // Update structural edges visibility
    for (const ev of this.edgeVisuals) {
      const childStatus = step.nodeStates[ev.edge.to].status;
      ev.mat.opacity = childStatus === 'hidden' ? 0.0 : 0.48;
      ev.mat.color.setHex(childStatus === 'redundant' ? PALETTE.rose : 0x475569);
    }

    // Update Memo Vault (if Chapter 2)
    if (step.memoStates && this.memoVisuals.length > 0) {
      this.currentMemoVals = step.memoStates;
      step.memoStates.forEach((val, k) => {
        const mv = this.memoVisuals[k];
        const isActiveSlot = step.activeMemoIdx === k;
        const filled = val !== null;
        mv.mat.wireframe = !filled;
        mv.mat.color.setHex(filled ? (isActiveSlot ? PALETTE.gold : PALETTE.emerald) : 0x334155);
        mv.mat.emissive.setHex(isActiveSlot ? PALETTE.gold : filled ? 0x065f46 : 0x000000);

        const str = filled ? `[${k}]: ${val}` : `[${k}]: ?`;
        const key = `${str}_${isActiveSlot}`;
        if (mv.lastKey !== key) {
          updateTextSprite(mv.lbl, str, {
            borderColor: isActiveSlot
              ? 'rgba(251,191,36,0.9)'
              : filled
              ? 'rgba(52,211,153,0.75)'
              : 'rgba(100,116,139,0.4)',
            textColor: isActiveSlot ? '#fde68a' : filled ? '#6ee7b7' : '#94a3b8',
            scale: 0.0082,
            fontSize: 25,
          });
          mv.lastKey = key;
        }
      });
    }

    // Active Fresnel Halo + Floor Ripple
    if (step.activeNodeId !== null && step.activeNodeId !== undefined) {
      const nd = this.trace.nodes[step.activeNodeId];
      const st = step.nodeStates[step.activeNodeId]?.status;
      if (st && st !== 'hidden') {
        this.activeHalo.visible = true;
        this.activeHalo.position.set(nd.x, nd.y, nd.z);
        const haloHex =
          st === 'redundant' ? PALETTE.rose : st === 'cacheHit' ? PALETTE.gold : PALETTE.cyan;
        this.haloMat.uniforms.uColor.value.setHex(haloHex);
        this._setGroundFocus(nd.x, nd.z, haloHex);
      } else {
        this.activeHalo.visible = false;
      }
    }

    // Active custom-GLSL energy beams
    for (const b of step.activeBeams || []) {
      let p1, p2;
      if (b.from !== undefined && b.to !== undefined) {
        const n1 = this.trace.nodes[b.from];
        const n2 = this.trace.nodes[b.to];
        p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
        p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
      } else if (b.fromMemo !== undefined && b.toNode !== undefined) {
        const m = this.trace.memoSlots[b.fromMemo];
        const n2 = this.trace.nodes[b.toNode];
        p1 = new THREE.Vector3(m.x, m.y, m.z);
        p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
      } else if (b.fromNode !== undefined && b.toMemo !== undefined) {
        const n1 = this.trace.nodes[b.fromNode];
        const m = this.trace.memoSlots[b.toMemo];
        p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
        p2 = new THREE.Vector3(m.x, m.y, m.z);
      } else if (b.fromNode !== undefined && b.toNode !== undefined) {
        const n1 = this.trace.nodes[b.fromNode];
        const n2 = this.trace.nodes[b.toNode];
        p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
        p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
      }
      if (p1 && p2) {
        this._spawnEnergyTube(p1, p2, b.color, 0.9);
      }
    }
  }

  _applyBars1DStep(step) {
    this.activeHalo.visible = false;

    step.cellStates.forEach((st, idx) => {
      const bv = this.barVisuals[idx];
      const cell = bv.cell;

      const hasVal = st.val !== null;
      bv.targetH = hasVal ? cell.maxHeight : 0.1;

      let col = PALETTE.slate;
      let emCol = 0x000000;
      let wireframe = false;
      let opacity = 0.95;
      let border = 'rgba(148,163,184,0.4)';
      let txtCol = '#94a3b8';

      if (st.status === 'active') {
        col = PALETTE.cyan;
        emCol = 0x0891b2;
        border = 'rgba(34,211,238,0.9)';
        txtCol = '#22d3ee';
      } else if (st.status === 'source') {
        col = PALETTE.gold;
        emCol = 0x92400e;
        border = 'rgba(251,191,36,0.85)';
        txtCol = '#fde68a';
      } else if (st.status === 'done') {
        col = PALETTE.emerald;
        emCol = 0x065f46;
        border = 'rgba(52,211,153,0.7)';
        txtCol = '#6ee7b7';
      } else if (st.status === 'final') {
        col = PALETTE.gold;
        emCol = 0xb45309;
        border = 'rgba(251,191,36,0.95)';
        txtCol = '#fef08a';
      } else if (st.status === 'evicted') {
        col = 0x334155;
        emCol = 0x000000;
        wireframe = true;
        opacity = 0.28;
        bv.targetH = Math.max(0.25, cell.maxHeight * 0.45);
        border = 'rgba(71,85,105,0.35)';
        txtCol = '#64748b';
      }

      bv.colMat.color.setHex(col);
      bv.colMat.emissive.setHex(emCol);
      bv.colMat.wireframe = wireframe;
      bv.colMat.opacity = opacity;

      const labelTxt = hasVal ? `${st.val}` : '?';
      const key = `${labelTxt}_${st.status}`;
      if (bv.lastKey !== key) {
        updateTextSprite(bv.valLabel, labelTxt, {
          borderColor: border,
          textColor: txtCol,
          scale: 0.009,
          fontSize: 28,
        });
        bv.lastKey = key;
      }
    });

    // Ground focus
    if (step.activeIdx !== undefined) {
      const c = this.trace.cells[step.activeIdx];
      this._setGroundFocus(c.x, c.z, PALETTE.cyan);
    }

    // Sliding Window Frame (Chapter 4)
    if (step.windowRange && this.slidingWindowMesh) {
      const [lo, hi] = step.windowRange;
      const xLo = this.trace.cells[lo].x;
      const xHi = this.trace.cells[hi].x;
      this.slidingWindowMesh.visible = true;
      this.slidingWindowTargetX = (xLo + xHi) * 0.5;
      this.slidingWindowTargetWidth = Math.abs(xHi - xLo) + 1.65;
    } else if (this.slidingWindowMesh) {
      this.slidingWindowMesh.visible = false;
    }

    // Dependency energy arcs
    for (const b of step.activeBeams || []) {
      const c1 = this.trace.cells[b.fromIdx];
      const c2 = this.trace.cells[b.toIdx];
      const p1 = new THREE.Vector3(c1.x, 0.2 + c1.maxHeight, c1.z);
      const p2 = new THREE.Vector3(c2.x, 0.2 + c2.maxHeight, c2.z);
      this._spawnEnergyTube(p1, p2, b.color, b.arcHeight || 1.6);
    }
  }

  _applyGrid2DStep(step) {
    this.activeHalo.visible = false;
    const { W } = this.trace;

    step.gridStates.forEach((st, flatIdx) => {
      const gv = this.gridVisuals[flatIdx];
      const cell = gv.cell;
      const hasVal = st.val !== null;
      gv.targetH = hasVal ? cell.targetHeight : 0.1;

      let col = 0x1e293b;
      let emCol = 0x000000;
      let opacity = 0.94;
      let border = 'rgba(148,163,184,0.4)';
      let txtCol = '#cbd5e1';

      if (st.status === 'hidden') {
        col = 0x1e293b;
        opacity = 0.35;
      } else if (st.status === 'base') {
        col = 0x334155;
        txtCol = '#94a3b8';
      } else if (st.status === 'done') {
        col = PALETTE.emerald;
        emCol = 0x064e3b;
        txtCol = '#a7f3d0';
      } else if (st.status === 'active') {
        col = PALETTE.cyan;
        emCol = 0x0891b2;
        border = 'rgba(34,211,238,0.95)';
        txtCol = '#22d3ee';
      } else if (st.status === 'skipSrc') {
        col = PALETTE.sky;
        emCol = 0x0369a1;
        border = 'rgba(56,189,248,0.9)';
        txtCol = '#7dd3fc';
      } else if (st.status === 'takeSrc') {
        col = PALETTE.gold;
        emCol = 0xb45309;
        border = 'rgba(251,191,36,0.95)';
        txtCol = '#fde68a';
      } else if (st.status === 'optimal') {
        col = PALETTE.gold;
        emCol = 0xd97706;
        border = 'rgba(251,191,36,1.0)';
        txtCol = '#fef08a';
      } else if (st.status === 'pathSkip') {
        col = PALETTE.sky;
        emCol = 0x0284c7;
        border = 'rgba(56,189,248,0.85)';
        txtCol = '#bae6fd';
      }

      gv.mat.color.setHex(col);
      gv.mat.emissive.setHex(emCol);
      gv.mat.opacity = opacity;

      gv.valLbl.visible = hasVal;
      if (hasVal) {
        const key = `${st.val}_${st.status}`;
        if (gv.lastKey !== key) {
          updateTextSprite(gv.valLbl, `${st.val}`, {
            borderColor: border,
            textColor: txtCol,
            scale: 0.0074,
            fontSize: 25,
          });
          gv.lastKey = key;
        }
      }
    });

    // Highlight selected items on left rack (Chapter 6 Backtracking)
    const selectedSet = new Set(step.selectedItems || []);
    for (const iv of this.itemVisuals) {
      const isSel = selectedSet.has(iv.item.id);
      if (iv.selected !== isSel) {
        iv.selected = isSel;
        updateTextSprite(iv.sprite, isSel ? `✓ ${iv.item.name}` : iv.item.name, {
          subtext: `wt:${iv.item.weight}  val:${iv.item.value}`,
          bgColor: isSel ? 'rgba(69, 26, 3, 0.92)' : 'rgba(15, 23, 42, 0.92)',
          borderColor: isSel ? 'rgba(251, 191, 36, 0.95)' : 'rgba(148, 163, 184, 0.45)',
          textColor: isSel ? '#fef08a' : '#f8fafc',
          subColor: '#fbbf24',
          fontSize: 23,
          scale: 0.008,
        });
      }
    }

    // Ground ripple under active cell
    if (step.activeCell) {
      const [ai, aw] = step.activeCell;
      const gv = this.gridVisuals[ai * (W + 1) + aw];
      if (gv) {
        this._setGroundFocus(gv.cell.x, gv.cell.z, PALETTE.cyan);
      }
    }

    // 2D Dependency / Backtrack Energy Bridges
    for (const b of step.activeBeams || []) {
      const [r1, c1] = b.from;
      const [r2, c2] = b.to;
      const g1 = this.gridVisuals[r1 * (W + 1) + c1];
      const g2 = this.gridVisuals[r2 * (W + 1) + c2];
      if (g1 && g2) {
        const p1 = new THREE.Vector3(g1.cell.x, g1.cell.targetHeight + 0.15, g1.cell.z);
        const p2 = new THREE.Vector3(g2.cell.x, g2.cell.targetHeight + 0.15, g2.cell.z);
        this._spawnEnergyTube(p1, p2, b.color, b.arcHeight || 1.5);
      }
    }
  }

  _setGroundFocus(x, z, colorHex) {
    this.groundMat.uniforms.uActivePos.value.set(x, 0, z);
    this.groundMat.uniforms.uActiveStrength.value = 1.0;
    this.groundMat.uniforms.uActiveColor.value.setHex(colorHex);
  }

  _spawnEnergyTube(p1, p2, colorHex = PALETTE.cyan, lift = 1.2) {
    const mid = p1.clone().lerp(p2, 0.5);
    mid.y += lift;
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.065, 10, false);
    const pulseMat = createEnergyPulseMaterial(colorHex, 1.7, 0.95);
    const mesh = new THREE.Mesh(tubeGeo, pulseMat);
    this.beamGroup.add(mesh);
    this.animatedPulseMaterials.push(pulseMat);
  }

  _clearBeams() {
    this.animatedPulseMaterials = [];
    this._clearGroup(this.beamGroup);
  }

  _clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
    }
  }

  /* ==========================================================================
   * RENDER & SPRING ANIMATION LOOP
   * ========================================================================== */
  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    const lerpAlpha = 1 - Math.exp(-10 * dt);

    // Update GLSL shader uniforms
    this.groundMat.uniforms.uTime.value = elapsed;
    this.haloMat.uniforms.uTime.value = elapsed;
    for (const mat of this.animatedPulseMaterials) {
      mat.uniforms.uTime.value = elapsed;
    }

    // Subtle rotation of ambient particles and memo crystals
    this.particles.rotation.y = elapsed * 0.015;
    for (const mv of this.memoVisuals) {
      mv.crystal.rotation.y = elapsed * 0.9 + mv.slot.k * 0.4;
    }

    // Smooth scale transitions for Tree Nodes
    for (const nv of this.nodeVisuals) {
      const s = THREE.MathUtils.lerp(nv.group.scale.x, nv.targetScale, lerpAlpha);
      nv.group.scale.setScalar(s);
    }

    // Smooth height spring for 1D Bars
    for (const bv of this.barVisuals) {
      bv.curH = THREE.MathUtils.lerp(bv.curH, bv.targetH, lerpAlpha);
      bv.col.scale.y = bv.curH;
      bv.col.position.y = 0.18 + bv.curH * 0.5;
      bv.valLabel.position.y = 0.18 + bv.curH + 0.48;
    }

    // Smooth glide for Chapter 4 Sliding Window
    if (this.slidingWindowMesh && this.slidingWindowMesh.visible) {
      this.slidingWindowMesh.position.x = THREE.MathUtils.lerp(
        this.slidingWindowMesh.position.x,
        this.slidingWindowTargetX,
        lerpAlpha
      );
      this.slidingWindowMesh.scale.x = THREE.MathUtils.lerp(
        this.slidingWindowMesh.scale.x,
        this.slidingWindowTargetWidth,
        lerpAlpha
      );
    }

    // Smooth height spring for 2D Knapsack Grid
    for (const gv of this.gridVisuals) {
      gv.curH = THREE.MathUtils.lerp(gv.curH, gv.targetH, lerpAlpha);
      gv.mesh.scale.y = gv.curH;
      gv.mesh.position.y = gv.curH * 0.5;
      gv.valLbl.position.y = gv.curH + 0.42;
    }

    // Smooth camera preset glide
    if (this.camGoalPos && this.camGoalTarget) {
      this.camera.position.lerp(this.camGoalPos, 0.08);
      this.controls.target.lerp(this.camGoalTarget, 0.08);
      if (
        this.camera.position.distanceTo(this.camGoalPos) < 0.05 &&
        this.controls.target.distanceTo(this.camGoalTarget) < 0.05
      ) {
        this.camGoalPos = null;
        this.camGoalTarget = null;
      }
    }

    this.controls.update();
    this._updateHoverRaycast();

    if (this.bloomEnabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  _updateHoverRaycast() {
    if (this.pointer.x < -1 || this.interactables.length === 0) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    const hit = hits.find((h) => h.object.parent && h.object.parent.scale.x > 0.1);

    if (hit && hit.object.userData.hoverInfo) {
      const info = hit.object.userData.hoverInfo();
      this.tooltipEl.innerHTML = `<div class="tt-title">${info.title}</div><div class="tt-sub">${info.sub}</div>`;
      const maxX = Math.max(12, window.innerWidth - 265);
      this.tooltipEl.style.left = `${Math.max(12, Math.min(maxX, this.pointerScreen.x + 14))}px`;
      this.tooltipEl.style.top = `${Math.max(76, Math.min(window.innerHeight - 160, this.pointerScreen.y - 18))}px`;
      this.tooltipEl.classList.remove('hidden');
    } else {
      this.tooltipEl.classList.add('hidden');
    }
  }
}
