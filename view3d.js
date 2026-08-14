/**
 * HORLOGE 3D WATCH INTERACTIVE ENGINE
 * Powered by Three.js & OrbitControls with Video 360° Support
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let modalContainer = null;
let canvasContainer = null;
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let animationFrameId = null;
let currentWatchGroup = null;
let hourHand = null;
let minuteHand = null;
let secondHand = null;
let caseMaterialMesh = null;
let currentAutoRotate = true;

let currentParams = { modelName: '', imgSrc: '', materialType: '', videoSrc: '' };

// Material presets for 3D watch casing
const MATERIAL_PRESETS = {
  gold: { color: 0xe9c176, metalness: 0.95, roughness: 0.2, name: '18K Gold' },
  rosegold: { color: 0xe0a98b, metalness: 0.92, roughness: 0.22, name: 'Rose Gold' },
  platinum: { color: 0xe5e8ec, metalness: 0.98, roughness: 0.15, name: 'Platinum' },
  titanium: { color: 0x8a929a, metalness: 0.85, roughness: 0.35, name: 'Titanium' },
  obsidian: { color: 0x222224, metalness: 0.90, roughness: 0.25, name: 'Obsidian Black' },
  carbon: { color: 0x181819, metalness: 0.60, roughness: 0.50, name: 'Carbon Fiber' }
};

function getMaterialPreset(materialType = '') {
  const lower = materialType.toLowerCase();
  if (lower.includes('rose')) return MATERIAL_PRESETS.rosegold;
  if (lower.includes('platinum') || lower.includes('white gold') || lower.includes('silver')) return MATERIAL_PRESETS.platinum;
  if (lower.includes('obsidian') || lower.includes('black') || lower.includes('dlc')) return MATERIAL_PRESETS.obsidian;
  if (lower.includes('carbon') || lower.includes('ntpt')) return MATERIAL_PRESETS.carbon;
  if (lower.includes('titanium')) return MATERIAL_PRESETS.titanium;
  return MATERIAL_PRESETS.gold;
}

// Stop and dispose Three.js scene
function stopThreeScene() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  if (scene) {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    scene = null;
  }
}

// 1. Create Modal DOM Structure
function createModalDOM() {
  if (document.getElementById('watch-3d-modal')) return;

  const modalHtml = `
    <div id="watch-3d-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md transition-opacity duration-300">
      <div class="relative w-full max-w-5xl h-[85vh] bg-surface-container-low border border-outline-variant/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md z-10 gap-4">
          <div class="flex items-center gap-3">
            <div class="size-8 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-lg">3d_rotation</span>
            </div>
            <div>
              <h3 id="watch-3d-title" class="text-lg md:text-xl headline-font text-white font-bold tracking-wide">3D Watch View</h3>
              <p id="watch-3d-subtitle" class="text-xs text-on-surface-variant font-medium">Real-time 3D Interactive Renderer • Drag to rotate 360°</p>
            </div>
          </div>

          <!-- Mode Switcher Tabs (Video vs 3D Canvas) -->
          <div id="watch-3d-mode-tabs" class="hidden flex items-center gap-1.5 bg-surface-container-high p-1 rounded-full border border-outline-variant">
            <button id="btn-mode-video" class="px-3.5 py-1 rounded-full text-xs font-bold transition-all bg-primary text-on-primary shadow-sm flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">videocam</span> 360° Video
            </button>
            <button id="btn-mode-interactive" class="px-3.5 py-1 rounded-full text-xs font-bold transition-all text-on-surface-variant hover:text-white flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">view_in_ar</span> Interactive 3D
            </button>
          </div>
          
          <button id="watch-3d-close" class="size-10 rounded-full bg-surface-container hover:bg-surface-bright text-on-surface hover:text-white transition-colors flex items-center justify-center border border-outline-variant">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- 3D Canvas / Video Container Area -->
        <div id="watch-3d-canvas-container" class="relative flex-1 w-full h-full bg-gradient-to-b from-surface-container-lowest via-surface to-background cursor-grab active:cursor-grabbing overflow-hidden">
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  modalContainer = document.getElementById('watch-3d-modal');
  canvasContainer = document.getElementById('watch-3d-canvas-container');

  // Event Listeners
  document.getElementById('watch-3d-close').addEventListener('click', close3DView);
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) close3DView();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalContainer.classList.contains('hidden')) {
      close3DView();
    }
  });

  const btnModeVideo = document.getElementById('btn-mode-video');
  const btnModeInteractive = document.getElementById('btn-mode-interactive');

  if (btnModeVideo) {
    btnModeVideo.addEventListener('click', () => {
      btnModeVideo.className = "px-3.5 py-1 rounded-full text-xs font-bold transition-all bg-primary text-on-primary shadow-sm flex items-center gap-1";
      if (btnModeInteractive) btnModeInteractive.className = "px-3.5 py-1 rounded-full text-xs font-bold transition-all text-on-surface-variant hover:text-white flex items-center gap-1";
      renderVideoMode(currentParams.videoSrc);
    });
  }

  if (btnModeInteractive) {
    btnModeInteractive.addEventListener('click', () => {
      btnModeInteractive.className = "px-3.5 py-1 rounded-full text-xs font-bold transition-all bg-primary text-on-primary shadow-sm flex items-center gap-1";
      if (btnModeVideo) btnModeVideo.className = "px-3.5 py-1 rounded-full text-xs font-bold transition-all text-on-surface-variant hover:text-white flex items-center gap-1";
      renderInteractive3DMode(currentParams.imgSrc, currentParams.materialType);
    });
  }

  window.addEventListener('resize', onWindowResize);
}

// 2. Render Video Showcase Mode
function renderVideoMode(videoSrc) {
  stopThreeScene();

  const subtitleEl = document.getElementById('watch-3d-subtitle');
  if (subtitleEl) subtitleEl.textContent = 'Ultra-HD 360° Velvet Platform Rotation • Studio Showcase';

  if (!canvasContainer) return;
  canvasContainer.className = "relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden";

  canvasContainer.innerHTML = `
    <div class="relative w-full h-full flex items-center justify-center bg-black">
      <video id="watch-3d-video" class="w-full h-full object-contain" autoplay loop muted playsinline controls>
        <source src="${videoSrc}" type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full bg-black/75 border border-white/15 backdrop-blur-md text-xs text-on-surface-variant flex items-center gap-3 pointer-events-none">
        <span class="flex items-center gap-1 text-primary"><span class="material-symbols-outlined text-sm">3d_rotation</span> Studio 360° Velvet Showcase</span>
        <span class="text-white/20">•</span>
        <span class="text-white/80 font-mono text-[11px]">4K Ultra-HD Rotation</span>
      </div>
    </div>
  `;
}

// 3. Bind Interactive 3D Control Buttons
function bind3DControlListeners() {
  const btnAutorotate = document.getElementById('btn-3d-autorotate');
  if (btnAutorotate) {
    btnAutorotate.addEventListener('click', () => {
      currentAutoRotate = !currentAutoRotate;
      if (controls) controls.autoRotate = currentAutoRotate;
      const txt = document.getElementById('txt-3d-autorotate');
      if (txt) txt.textContent = currentAutoRotate ? 'Pause Auto-Rotate' : 'Start Auto-Rotate';
    });
  }

  const btnReset = document.getElementById('btn-3d-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (controls && camera) {
        camera.position.set(0, 0, 4.5);
        controls.target.set(0, 0, 0);
        controls.update();
      }
    });
  }

  document.querySelectorAll('[data-finish]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const presetKey = e.currentTarget.getAttribute('data-finish');
      if (MATERIAL_PRESETS[presetKey] && caseMaterialMesh) {
        const p = MATERIAL_PRESETS[presetKey];
        caseMaterialMesh.material.color.setHex(p.color);
        caseMaterialMesh.material.metalness = p.metalness;
        caseMaterialMesh.material.roughness = p.roughness;
      }
    });
  });
}

// 4. Render Interactive 3D Canvas Mode
function renderInteractive3DMode(imgSrc, materialType) {
  const videoEl = document.getElementById('watch-3d-video');
  if (videoEl) videoEl.pause();

  const subtitleEl = document.getElementById('watch-3d-subtitle');
  if (subtitleEl) subtitleEl.textContent = `Finish: ${materialType || 'Custom Manufacture'} • Real-time Interactive 3D Model`;

  if (!canvasContainer) return;
  canvasContainer.className = "relative flex-1 w-full h-full bg-gradient-to-b from-surface-container-lowest via-surface to-background cursor-grab active:cursor-grabbing overflow-hidden";

  canvasContainer.innerHTML = `
    <!-- Floating Overlay Controls -->
    <div class="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
      <button id="btn-3d-autorotate" class="px-3.5 py-1.5 rounded-full bg-surface/80 border border-outline-variant text-xs text-primary font-semibold hover:border-primary transition-all flex items-center gap-1.5 backdrop-blur-md">
        <span class="material-symbols-outlined text-sm">sync</span>
        <span id="txt-3d-autorotate">${currentAutoRotate ? 'Pause Auto-Rotate' : 'Start Auto-Rotate'}</span>
      </button>
      <button id="btn-3d-reset" class="px-3.5 py-1.5 rounded-full bg-surface/80 border border-outline-variant text-xs text-on-surface font-semibold hover:text-white hover:border-primary transition-all flex items-center gap-1.5 backdrop-blur-md">
        <span class="material-symbols-outlined text-sm">restart_alt</span> Reset View
      </button>
    </div>

    <!-- Material Finish Selector -->
    <div class="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-outline-variant backdrop-blur-md">
      <span class="text-[10px] uppercase text-on-surface-variant font-bold tracking-wider mr-1">Finish:</span>
      <button data-finish="gold" title="18K Gold" class="size-5 rounded-full bg-[#e9c176] border border-white/40 hover:scale-110 transition-transform"></button>
      <button data-finish="rosegold" title="Rose Gold" class="size-5 rounded-full bg-[#e0a98b] border border-white/40 hover:scale-110 transition-transform"></button>
      <button data-finish="platinum" title="Platinum" class="size-5 rounded-full bg-[#e5e8ec] border border-white/40 hover:scale-110 transition-transform"></button>
      <button data-finish="obsidian" title="Obsidian Black" class="size-5 rounded-full bg-[#222224] border border-white/40 hover:scale-110 transition-transform"></button>
    </div>

    <!-- Bottom Control Bar / Guidance -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-xs text-on-surface-variant flex items-center gap-3">
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm text-primary">drag_pan</span> Drag to Rotate</span>
      <span class="text-white/20">•</span>
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm text-primary">zoom_in</span> Scroll to Zoom</span>
    </div>
  `;

  bind3DControlListeners();

  const preset = getMaterialPreset(materialType);
  setTimeout(() => {
    initThreeScene(imgSrc, preset);
  }, 50);
}

// 5. Window Resize Handler
function onWindowResize() {
  if (!renderer || !camera || !canvasContainer) return;
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;
  if (width === 0 || height === 0) return;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// 6. Build Detailed 3D Watch Mesh
function createWatch3D(dialImageUrl, materialPreset) {
  const watchGroup = new THREE.Group();

  // A. Case Base Material
  const caseMat = new THREE.MeshStandardMaterial({
    color: materialPreset.color,
    metalness: materialPreset.metalness,
    roughness: materialPreset.roughness,
    envMapIntensity: 1.2
  });

  // B. Main Watch Body (Outer Ring / Case)
  const caseRadius = 1.6;
  const caseHeight = 0.45;
  const caseGeo = new THREE.CylinderGeometry(caseRadius, caseRadius * 0.98, caseHeight, 64);
  const caseMesh = new THREE.Mesh(caseGeo, caseMat);
  caseMesh.rotation.x = Math.PI / 2; // Flat facing viewer
  watchGroup.add(caseMesh);
  caseMaterialMesh = caseMesh;

  // C. Polished Bezel Ring
  const bezelGeo = new THREE.TorusGeometry(1.55, 0.08, 32, 64);
  const bezelMesh = new THREE.Mesh(bezelGeo, caseMat);
  bezelMesh.position.z = caseHeight / 2 + 0.02;
  watchGroup.add(bezelMesh);

  // D. Inner Dial Ring
  const innerRingGeo = new THREE.TorusGeometry(1.42, 0.05, 16, 64);
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: 0x111113,
    metalness: 0.8,
    roughness: 0.3
  });
  const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRingMesh.position.z = caseHeight / 2 + 0.03;
  watchGroup.add(innerRingMesh);

  // E. Recessed Dial Face with Watch Texture
  const dialRadius = 1.4;
  const dialGeo = new THREE.CircleGeometry(dialRadius, 64);
  
  const textureLoader = new THREE.TextureLoader();
  const resolvedUrl = (dialImageUrl && !dialImageUrl.startsWith('http') && !dialImageUrl.startsWith('/') && !dialImageUrl.startsWith('data:') && !dialImageUrl.startsWith('./'))
    ? '/' + dialImageUrl
    : dialImageUrl;

  const dialMat = new THREE.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0.1
  });

  const dialTexture = textureLoader.load(
    resolvedUrl || dialImageUrl,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      dialMat.map = tex;
      dialMat.needsUpdate = true;
    },
    undefined,
    (err) => {
      console.warn('Texture load fallback attempt:', dialImageUrl, err);
      if (resolvedUrl !== dialImageUrl) {
        textureLoader.load(dialImageUrl, (fallbackTex) => {
          fallbackTex.colorSpace = THREE.SRGBColorSpace;
          dialMat.map = fallbackTex;
          dialMat.needsUpdate = true;
        });
      }
    }
  );
  dialMat.map = dialTexture;

  const dialMesh = new THREE.Mesh(dialGeo, dialMat);
  dialMesh.position.z = caseHeight / 2 + 0.04;
  watchGroup.add(dialMesh);

  // F. 3D Clock Hands
  const handMat = new THREE.MeshStandardMaterial({
    color: materialPreset.color,
    metalness: 0.95,
    roughness: 0.15
  });

  // Center pin
  const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 32);
  const pinMesh = new THREE.Mesh(pinGeo, handMat);
  pinMesh.rotation.x = Math.PI / 2;
  pinMesh.position.z = caseHeight / 2 + 0.09;
  watchGroup.add(pinMesh);

  // Hour Hand
  const hHandGeo = new THREE.BoxGeometry(0.05, 0.7, 0.02);
  hHandGeo.translate(0, 0.35, 0);
  hourHand = new THREE.Mesh(hHandGeo, handMat);
  hourHand.position.z = caseHeight / 2 + 0.08;
  hourHand.rotation.z = -Math.PI / 4; // 10 o'clock position
  watchGroup.add(hourHand);

  // Minute Hand
  const mHandGeo = new THREE.BoxGeometry(0.04, 1.05, 0.02);
  mHandGeo.translate(0, 0.525, 0);
  minuteHand = new THREE.Mesh(mHandGeo, handMat);
  minuteHand.position.z = caseHeight / 2 + 0.09;
  minuteHand.rotation.z = Math.PI / 6; // 2 o'clock position
  watchGroup.add(minuteHand);

  // Second Hand (Thin red accent)
  const sHandMat = new THREE.MeshBasicMaterial({ color: 0xdd3333 });
  const sHandGeo = new THREE.BoxGeometry(0.02, 1.25, 0.015);
  sHandGeo.translate(0, 0.5, 0);
  secondHand = new THREE.Mesh(sHandGeo, sHandMat);
  secondHand.position.z = caseHeight / 2 + 0.10;
  watchGroup.add(secondHand);

  // G. Sapphire Crystal Glass Cover
  const glassGeo = new THREE.CircleGeometry(1.5, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.z = caseHeight / 2 + 0.12;
  watchGroup.add(glassMesh);

  // H. Crown (Right Side Winder)
  const crownGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.35, 32);
  const crownMesh = new THREE.Mesh(crownGeo, caseMat);
  crownMesh.rotation.z = Math.PI / 2;
  crownMesh.position.set(1.7, 0, 0);
  watchGroup.add(crownMesh);

  // I. Top & Bottom Lugs + Strap Attachments
  const lugGeo = new THREE.BoxGeometry(0.3, 0.6, 0.35);
  // Top left lug
  const lugTL = new THREE.Mesh(lugGeo, caseMat);
  lugTL.position.set(-0.9, 1.7, 0);
  lugTL.rotation.z = -0.2;
  watchGroup.add(lugTL);
  // Top right lug
  const lugTR = new THREE.Mesh(lugGeo, caseMat);
  lugTR.position.set(0.9, 1.7, 0);
  lugTR.rotation.z = 0.2;
  watchGroup.add(lugTR);

  // Bottom left lug
  const lugBL = new THREE.Mesh(lugGeo, caseMat);
  lugBL.position.set(-0.9, -1.7, 0);
  lugBL.rotation.z = 0.2;
  watchGroup.add(lugBL);
  // Bottom right lug
  const lugBR = new THREE.Mesh(lugGeo, caseMat);
  lugBR.position.set(0.9, -1.7, 0);
  lugBR.rotation.z = -0.2;
  watchGroup.add(lugBR);

  // Strap (Top & Bottom Extension)
  const strapMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1c,
    roughness: 0.7,
    metalness: 0.1
  });
  const strapGeo = new THREE.BoxGeometry(1.5, 1.2, 0.2);
  const strapTop = new THREE.Mesh(strapGeo, strapMat);
  strapTop.position.set(0, 2.2, -0.1);
  watchGroup.add(strapTop);

  const strapBottom = new THREE.Mesh(strapGeo, strapMat);
  strapBottom.position.set(0, -2.2, -0.1);
  watchGroup.add(strapBottom);

  return watchGroup;
}

// 7. Initialize Three.js Scene
function initThreeScene(dialImageUrl, materialPreset) {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Clear existing canvas
  canvasContainer.innerHTML = '';
  canvasContainer.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = currentAutoRotate;
  controls.autoRotateSpeed = 2.5;
  controls.minDistance = 2.2;
  controls.maxDistance = 7.0;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.0);
  keyLight.position.set(4, 5, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xbad2ff, 1.0);
  fillLight.position.set(-4, -2, 3);
  scene.add(fillLight);

  const pointLight = new THREE.PointLight(0xffea9f, 1.5, 10);
  pointLight.position.set(0, 3, 2);
  scene.add(pointLight);

  // Build Watch Mesh
  currentWatchGroup = createWatch3D(dialImageUrl, materialPreset);
  scene.add(currentWatchGroup);

  // Animation Loop
  const clock = new THREE.Clock();
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Ticking Second Hand
    if (secondHand) {
      secondHand.rotation.z = -elapsedTime * (Math.PI / 30); // 60s full rotation
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

// 8. Open 3D View Function
export function open3DView(modelName, imgSrc, materialType = '', videoSrc = '') {
  createModalDOM();

  currentParams = { modelName, imgSrc, materialType, videoSrc };

  const titleEl = document.getElementById('watch-3d-title');
  const modeTabs = document.getElementById('watch-3d-mode-tabs');
  const btnModeVideo = document.getElementById('btn-mode-video');
  const btnModeInteractive = document.getElementById('btn-mode-interactive');

  if (titleEl) titleEl.textContent = `${modelName} - 3D View`;

  if (videoSrc) {
    if (modeTabs) modeTabs.classList.remove('hidden');
    if (btnModeVideo) btnModeVideo.className = "px-3.5 py-1 rounded-full text-xs font-bold transition-all bg-primary text-on-primary shadow-sm flex items-center gap-1";
    if (btnModeInteractive) btnModeInteractive.className = "px-3.5 py-1 rounded-full text-xs font-bold transition-all text-on-surface-variant hover:text-white flex items-center gap-1";
    renderVideoMode(videoSrc);
  } else {
    if (modeTabs) modeTabs.classList.add('hidden');
    renderInteractive3DMode(imgSrc, materialType);
  }

  modalContainer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// 9. Close 3D View Function
export function close3DView() {
  if (!modalContainer) return;
  modalContainer.classList.add('hidden');
  document.body.style.overflow = '';

  const videoEl = document.getElementById('watch-3d-video');
  if (videoEl) {
    videoEl.pause();
  }

  stopThreeScene();
}

// Expose globally on window for inline HTML onclick handlers
if (typeof window !== 'undefined') {
  window.open3DView = open3DView;
  window.close3DView = close3DView;
}
