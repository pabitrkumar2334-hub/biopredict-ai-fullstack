/**
 * BioPredict AI - Interactive 3D Background Engine & Interactive Widgets
 * Implements HTML5 WebGL via Three.js (scroll-driven DNA, particle clouds, silver rings)
 */

// Global state variables
let scene, camera, renderer;
let dnaGroup;
let backgroundParticles, dnaParticles;
let silverRings = [];
let targetCameraY = 15;
let currentCameraY = 15;
let targetCameraRot = 0;
let currentCameraRot = 0;
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// Scroll parameters
let scrollProgress = 0;

// Initialize Three.js WebGL Scene
function initWebGL() {
  const container = document.getElementById('webgl-canvas');
  if (!container) return;

  // Scene setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x061013, 0.035);

  // Camera setup
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
  camera.position.set(0, 15, 22);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x0a1e24, 1.5);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 3.0);
  dirLight1.position.set(5, 10, 7);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xdfb15b, 1.5);
  dirLight2.position.set(-5, -5, -5);
  scene.add(dirLight2);

  // Point lights for specular highlights on metal/gold
  const pointLight1 = new THREE.PointLight(0x00f0ff, 4, 30);
  pointLight1.position.set(0, 5, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xdfb15b, 3, 30);
  pointLight2.position.set(0, -5, 5);
  scene.add(pointLight2);

  // Create Scene Elements
  dnaGroup = new THREE.Group();
  scene.add(dnaGroup);

  createDNA();
  createSilverRings();
  createParticles();

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('scroll', onWindowScroll);

  // Start Loop
  animate();
}

// Custom helical curve for Three.js TubeGeometry
class HelixCurve extends THREE.Curve {
  constructor(scale = 1, phase = 0, height = 50, radius = 3.5, turns = 4) {
    super();
    this.scale = scale;
    this.phase = phase;
    this.height = height;
    this.radius = radius;
    this.turns = turns;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const angle = t * Math.PI * 2 * this.turns + this.phase;
    const tx = Math.cos(angle) * this.radius;
    const ty = (t - 0.5) * this.height; // centered around Y
    const tz = Math.sin(angle) * this.radius;
    return optionalTarget.set(tx, ty, tz).multiplyScalar(this.scale);
  }
}

// Generate the DNA double helix
function createDNA() {
  const height = 65;
  const radius = 4.2;
  const turns = 3.5;

  // Helix 1 Path
  const curve1 = new HelixCurve(1, 0, height, radius, turns);
  // Helix 2 Path (180 degrees out of phase)
  const curve2 = new HelixCurve(1, Math.PI, height, radius, turns);

  // Materials
  // Deep teal/black backbone material with high specular reflectivity
  const backboneMat = new THREE.MeshStandardMaterial({
    color: 0x0c2128,
    metalness: 0.85,
    roughness: 0.15,
    bumpScale: 0.05
  });

  // Tube Geometries for backbones
  const geom1 = new THREE.TubeGeometry(curve1, 150, 0.45, 12, false);
  const geom2 = new THREE.TubeGeometry(curve2, 150, 0.45, 12, false);

  const tube1 = new THREE.Mesh(geom1, backboneMat);
  const tube2 = new THREE.Mesh(geom2, backboneMat);
  dnaGroup.add(tube1);
  dnaGroup.add(tube2);

  // Add the connecting rungs (nucleotides)
  const rungCount = 75;
  const rungMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfb15b, // Gold
    metalness: 0.9,
    roughness: 0.25,
    emissive: 0x332200,
    emissiveIntensity: 0.5
  });

  const rungGeom = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);

  for (let i = 0; i < rungCount; i++) {
    const t = i / rungCount;
    const p1 = curve1.getPoint(t);
    const p2 = curve2.getPoint(t);

    const rung = new THREE.Mesh(rungGeom, rungMaterial);
    
    // Scale Cylinder to span between the two backbone points
    const distance = p1.distanceTo(p2);
    rung.scale.set(1, distance, 1);

    // Position rung at midpoint
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    rung.position.copy(midpoint);

    // Rotate rung to align from p1 to p2
    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    rung.setRotationFromQuaternion(quaternion);

    dnaGroup.add(rung);
  }

  // Create Nanotech gold wireframe cylinders (from user reference image)
  const wireframeCount = 5;
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xdfb15b,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });

  for (let i = 0; i < wireframeCount; i++) {
    // Generate cylinders at intervals along the helix
    const yPos = (i / (wireframeCount - 1) - 0.5) * (height * 0.7);
    
    // Double layered wireframe cylinder
    const wGeom = new THREE.CylinderGeometry(radius * 1.3, radius * 1.3, 3, 16, 4, true);
    const wMesh = new THREE.Mesh(wGeom, wireframeMaterial);
    wMesh.position.set(0, yPos, 0);
    wMesh.rotation.y = i * 0.8;
    dnaGroup.add(wMesh);
  }
}

// Generate floating metallic silver rings
function createSilverRings() {
  const ringCount = 14;
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xa3b8cc, // Silver/Platinum
    metalness: 0.95,
    roughness: 0.05,
    envMapIntensity: 1.0
  });

  // Vary ring sizes slightly
  for (let i = 0; i < ringCount; i++) {
    const outerRadius = 1.2 + Math.random() * 1.5;
    const tubeRadius = 0.25 + Math.random() * 0.15;
    const ringGeom = new THREE.TorusGeometry(outerRadius, tubeRadius, 16, 64);
    const ringMesh = new THREE.Mesh(ringGeom, ringMaterial);

    // Scatter in space
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 10;
    const x = Math.cos(angle) * radius;
    // Distribute along the Y axis of the DNA
    const y = (Math.random() - 0.5) * 55;
    const z = Math.sin(angle) * radius - 5; // offset slightly backwards for depth

    ringMesh.position.set(x, y, z);
    
    // Random rotation
    ringMesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Save properties for animated tumbling
    silverRings.push({
      mesh: ringMesh,
      rotSpeedX: 0.002 + Math.random() * 0.006,
      rotSpeedY: 0.002 + Math.random() * 0.006,
      rotSpeedZ: 0.001 + Math.random() * 0.003,
      floatSpeed: 0.0005 + Math.random() * 0.001,
      floatAmp: 2 + Math.random() * 3,
      baseY: y,
      baseAngle: Math.random() * 100
    });

    scene.add(ringMesh);
  }
}

// Create floating glowing cyan particles (dust and DNA-bound)
function createParticles() {
  // 1. Background Dust Particle System
  const bgCount = 280;
  const bgGeom = new THREE.BufferGeometry();
  const bgPositions = new Float32Array(bgCount * 3);
  const bgSizes = new Float32Array(bgCount);

  for (let i = 0; i < bgCount; i++) {
    // Spherical distribution
    const r = 10 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    bgPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 70; // Y axis span
    bgPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    bgSizes[i] = 1.0 + Math.random() * 2.5;
  }

  bgGeom.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));

  // Custom round particle canvas texture
  const pTexture = createParticleTexture();

  const bgMaterial = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.38,
    map: pTexture,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  backgroundParticles = new THREE.Points(bgGeom, bgMaterial);
  scene.add(backgroundParticles);

  // 2. DNA-bound glowing particles mapping to the helix paths
  const dnaCount = 350;
  const dnaGeom = new THREE.BufferGeometry();
  const dnaPositions = new Float32Array(dnaCount * 3);

  // Helix curves reference for position mapping
  const height = 65;
  const radius = 4.2;
  const turns = 3.5;
  const curve1 = new HelixCurve(1, 0, height, radius, turns);
  const curve2 = new HelixCurve(1, Math.PI, height, radius, turns);

  for (let i = 0; i < dnaCount; i++) {
    const t = Math.random();
    const curve = Math.random() > 0.5 ? curve1 : curve2;
    const point = curve.getPoint(t);

    // Add slight random offset to cluster around the backbone
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.9,
      (Math.random() - 0.5) * 0.9,
      (Math.random() - 0.5) * 0.9
    );
    point.add(offset);

    dnaPositions[i * 3] = point.x;
    dnaPositions[i * 3 + 1] = point.y;
    dnaPositions[i * 3 + 2] = point.z;
  }

  dnaGeom.setAttribute('position', new THREE.BufferAttribute(dnaPositions, 3));

  const dnaParticleMaterial = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.45,
    map: pTexture,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  dnaParticles = new THREE.Points(dnaGeom, dnaParticleMaterial);
  dnaGroup.add(dnaParticles);
}

// Generate circular texture programmatically
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(0, 240, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(0, 240, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Scroll Callback
function onWindowScroll() {
  // Calculate scroll percentage
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return;
  
  scrollProgress = window.scrollY / maxScroll;

  // Map scroll progress to camera coordinate targets
  // As user scrolls down, camera sinks from Y = 15 to Y = -25
  targetCameraY = 15 - scrollProgress * 40;
  // Camera orbits around the DNA helix
  targetCameraRot = scrollProgress * Math.PI * 2.5;
}

// Mouse Move Callback for Parallax
function onMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) / 100;
  mouseY = (event.clientY - windowHalfY) / 100;
}

// Handle Window Resize
function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation Loop
function animate(time) {
  requestAnimationFrame(animate);

  const timeSec = time * 0.001 || 0;

  // 1. Slow continuous rotation of DNA
  if (dnaGroup) {
    dnaGroup.rotation.y = timeSec * 0.05;
  }

  // 2. Animate background particles (gentle drift)
  if (backgroundParticles) {
    backgroundParticles.rotation.y = timeSec * 0.015;
    backgroundParticles.rotation.x = Math.sin(timeSec * 0.005) * 0.05;
  }

  // 3. Animate Silver Toruses (Floating & Tumbling)
  silverRings.forEach(ring => {
    ring.mesh.rotation.x += ring.rotSpeedX;
    ring.mesh.rotation.y += ring.rotSpeedY;
    ring.mesh.rotation.z += ring.rotSpeedZ;

    // Floating vertical movement
    ring.baseAngle += ring.floatSpeed * 10;
    ring.mesh.position.y = ring.baseY + Math.sin(ring.baseAngle) * ring.floatAmp;
  });

  // 4. Smooth camera interpolation (lerping)
  // Interpolate camera height
  currentCameraY += (targetCameraY - currentCameraY) * 0.05;
  camera.position.y = currentCameraY;

  // Interpolate camera rotation
  currentCameraRot += (targetCameraRot - currentCameraRot) * 0.05;
  
  // Parallax calculations (combine scroll rotation and mouse position offsets)
  const orbitRadius = 24 - scrollProgress * 6; // zoom in slightly as we scroll
  const baseAngle = currentCameraRot;
  const parallaxX = mouseX * 0.25;
  const parallaxY = -mouseY * 0.25;

  camera.position.x = Math.sin(baseAngle) * orbitRadius + parallaxX;
  camera.position.z = Math.cos(baseAngle) * orbitRadius;
  
  // Look at the center of the helix, offset slightly by mouse parallax
  const targetLookAt = new THREE.Vector3(0, currentCameraY - 2 + parallaxY, 0);
  camera.lookAt(targetLookAt);

  renderer.render(scene, camera);
}

// Launch engine on window load
window.addEventListener('DOMContentLoaded', () => {
  initWebGL();
  initPlayground();
});


/**
 * Interactive Simulation Playground Controller
 */
function initPlayground() {
  const btnRun = document.getElementById('run-sim-btn');
  const btnRandom = document.getElementById('random-seq-btn');
  const seqInput = document.getElementById('sequence-input');
  const modelSelect = document.getElementById('model-select');
  const terminal = document.getElementById('terminal-log');
  const progressBarContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-fill');
  
  if (!btnRun || !btnRandom || !seqInput) return;

  const nucleotides = ['A', 'T', 'C', 'G'];
  
  // 1. Random Sequence Generator
  btnRandom.addEventListener('click', () => {
    let length = 24 + Math.floor(Math.random() * 16);
    let sequence = '';
    for (let i = 0; i < length; i++) {
      sequence += nucleotides[Math.floor(Math.random() * 4)];
    }
    seqInput.value = sequence;
    logTerminal(`[SYSTEM] New random genome sequence generated: ${sequence.slice(0, 10)}... (${length} bp)`, 'success');
    
    // Trigger small SVG preview update
    updateProteinSVG(sequence);
  });

  // 2. Run simulation
  let running = false;
  btnRun.addEventListener('click', () => {
    if (running) return;
    
    const seq = seqInput.value.trim().toUpperCase();
    const model = modelSelect.value;

    // Validate sequence
    if (!seq) {
      logTerminal('[ERROR] Please input or generate a DNA sequence first.', 'error');
      return;
    }
    
    const invalidChars = [...seq].filter(char => !nucleotides.includes(char));
    if (invalidChars.length > 0) {
      logTerminal(`[ERROR] Invalid characters found: "${invalidChars.join(', ')}". Only A, T, C, G allowed.`, 'error');
      return;
    }

    running = true;
    btnRun.disabled = true;
    btnRun.style.opacity = 0.5;
    btnRun.textContent = 'Analyzing...';
    progressBarContainer.style.display = 'block';
    
    logTerminal(`[INIT] Starting structural prediction using model: ${model.toUpperCase()}...`);
    logTerminal(`[PARSING] Reading sequence length: ${seq.length} bases...`);

    let progress = 0;
    const duration = 2800; // ms
    const intervalTime = 50;
    const steps = duration / intervalTime;
    const progressIncrement = 100 / steps;

    const interval = setInterval(() => {
      progress += progressIncrement;
      progressBar.style.width = `${Math.min(progress, 100)}%`;

      // Log random neural processing events
      if (Math.random() > 0.85 && progress < 90) {
        const layers = ['Convolutional L3', 'Transformer Block 8', 'Attention Matrix QK', 'Decoder L2'];
        const selectedLayer = layers[Math.floor(Math.random() * layers.length)];
        logTerminal(`[NEURAL] Processing ${selectedLayer}... confidence: ${(0.82 + Math.random() * 0.17).toFixed(4)}`, 'loading');
      }

      // Slightly perturb protein nodes during folding prediction
      perturbProteinSVG();

      if (progress >= 100) {
        clearInterval(interval);
        
        // Finalize prediction outputs
        setTimeout(() => {
          logTerminal('[SUCCESS] Folding computation completed successfully!', 'success');
          
          // Calculate mock metrics
          const freeEnergy = (-12.4 - Math.random() * 25.8).toFixed(2);
          const accuracy = (94.2 + Math.random() * 5.6).toFixed(1);
          
          logTerminal(`[RESULTS] Predicted Delta-G: ${freeEnergy} kcal/mol`);
          logTerminal(`[RESULTS] AlphaFold Quality Score (pLDDT): ${accuracy}%`);
          logTerminal(`[SYSTEM] 3D Coordinate data exported to client.`, 'success');
          
          // Render final folded state
          foldProteinSVG(seq);

          running = false;
          btnRun.disabled = false;
          btnRun.style.opacity = 1;
          btnRun.textContent = 'Synthesize & Predict';
          progressBarContainer.style.display = 'none';
          progressBar.style.width = '0%';
        }, 300);
      }
    }, intervalTime);
  });

  // Terminal logging utility
  function logTerminal(text, type = '') {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = `> ${text}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  // Visualizing DNA sequence as a mock folded protein node chain in SVG
  const svg = document.getElementById('protein-svg');
  let nodes = [];
  let links = [];

  function updateProteinSVG(sequence) {
    if (!svg) return;
    svg.innerHTML = ''; // Clear SVG
    nodes = [];
    links = [];

    const seqLen = sequence.length;
    const padding = 30;
    const width = svg.clientWidth || 360;
    const height = svg.clientHeight || 200;

    // Draw connecting path line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'folding-path');
    path.setAttribute('id', 'folding-path-line');
    svg.appendChild(path);

    // Generate path nodes mapping a spiral pattern matching primary structure
    for (let i = 0; i < seqLen; i++) {
      const angle = (i / seqLen) * Math.PI * 4; // double spiral
      const radius = 15 + (i / seqLen) * 60;
      
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height / 2 + Math.sin(angle) * radius;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      
      // color based on nucleotide
      const base = sequence[i];
      let color = '#00f0ff'; // Default Cyan (A)
      if (base === 'T') color = '#dfb15b'; // Gold
      if (base === 'C') color = '#ffffff'; // White
      if (base === 'G') color = '#a3b8cc'; // Silver
      
      circle.setAttribute('fill', color);
      circle.setAttribute('r', 5 + (i % 3)); // slight variation in size
      circle.setAttribute('class', 'folding-node');
      
      svg.appendChild(circle);
      nodes.push({ element: circle, base: base, x: x, y: y, baseAngle: angle, baseRadius: radius });
    }

    updatePathLine();
  }

  function updatePathLine() {
    const pathLine = document.getElementById('folding-path-line');
    if (!pathLine || nodes.length === 0) return;

    let d = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 1; i < nodes.length; i++) {
      d += ` L ${nodes[i].x} ${nodes[i].y}`;
    }
    pathLine.setAttribute('d', d);
  }

  // Perturb SVG nodes during prediction processing (simulating search steps)
  function perturbProteinSVG() {
    const width = svg.clientWidth || 360;
    const height = svg.clientHeight || 200;

    nodes.forEach((node, i) => {
      // Perturb node locations slightly using random walk offsets
      const currentX = parseFloat(node.element.getAttribute('cx'));
      const currentY = parseFloat(node.element.getAttribute('cy'));

      const dx = (Math.random() - 0.5) * 6;
      const dy = (Math.random() - 0.5) * 6;

      // Bound to display box
      const nextX = Math.max(10, Math.min(width - 10, currentX + dx));
      const nextY = Math.max(10, Math.min(height - 10, currentY + dy));

      node.element.setAttribute('cx', nextX);
      node.element.setAttribute('cy', nextY);
      node.x = nextX;
      node.y = nextY;
    });

    updatePathLine();
  }

  // Fold SVG nodes into a tight globular protein shape at final output
  function foldProteinSVG(sequence) {
    const width = svg.clientWidth || 360;
    const height = svg.clientHeight || 200;

    // Target a complex alpha-helix ring shape in center
    nodes.forEach((node, i) => {
      // 3 overlapping cluster centers
      const clusterCount = 3;
      const clusterIdx = i % clusterCount;
      let centerX = width / 2;
      let centerY = height / 2;

      if (clusterIdx === 1) {
        centerX += 40;
        centerY -= 20;
      } else if (clusterIdx === 2) {
        centerX -= 35;
        centerY += 30;
      }

      const clusterAngle = (i / (nodes.length / clusterCount)) * Math.PI * 2;
      const clusterRadius = 15 + Math.sin(i * 0.9) * 10;

      const targetX = centerX + Math.cos(clusterAngle) * clusterRadius;
      const targetY = centerY + Math.sin(clusterAngle) * clusterRadius;

      // Animate transition using custom inline ease
      let currentX = node.x;
      let currentY = node.y;

      let steps = 0;
      function step() {
        steps++;
        currentX += (targetX - currentX) * 0.15;
        currentY += (targetY - currentY) * 0.15;
        node.element.setAttribute('cx', currentX);
        node.element.setAttribute('cy', currentY);
        node.x = currentX;
        node.y = currentY;
        updatePathLine();

        if (steps < 20) {
          requestAnimationFrame(step);
        }
      }
      step();
    });
  }

  // Initial draw
  updateProteinSVG(seqInput.value);
}


/**
 * BioPredict full-stack controller.
 * This function intentionally overrides the older DNA-sequence simulator controller above.
 */
function initPlayground() {
  const apiBase = window.location.origin;
  const diseaseSelect = document.getElementById('disease-select');
  const reportFile = document.getElementById('report-file');
  const extractBtn = document.getElementById('extract-report-btn');
  const predictBtn = document.getElementById('run-predict-btn');
  const fieldsContainer = document.getElementById('biomarker-fields');
  const terminal = document.getElementById('terminal-log');
  const riskSummary = document.getElementById('risk-summary');
  const tableBody = document.querySelector('#analysis-table tbody');
  const chartSvg = document.getElementById('risk-chart-svg');
  const downloadBtn = document.getElementById('download-report-btn');

  if (!diseaseSelect || !fieldsContainer || !predictBtn) return;

  let config = null;
  let latestPdfBase64 = null;
  let latestPdfFilename = 'BioPredict_Report.pdf';

  function logTerminal(text, type = '') {
    if (!terminal) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = `> ${text}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function getFieldValue(field) {
    const el = document.getElementById(`field-${field.key}`);
    if (!el) return field.default;
    if (field.type === 'select') return Number(el.value);
    const parsed = Number(el.value);
    return Number.isFinite(parsed) ? parsed : field.default;
  }

  function setFieldValue(key, value) {
    const el = document.getElementById(`field-${key}`);
    if (!el || value === undefined || value === null || value === '') return;
    el.value = value;
  }

  function renderFields() {
    const disease = diseaseSelect.value;
    const fields = config?.fields?.[disease] || [];
    fieldsContainer.innerHTML = fields.map((field) => {
      const input = field.type === 'select'
        ? `<select id="field-${field.key}">${field.options.map((option) => `<option value="${option.value}" ${option.value === field.default ? 'selected' : ''}>${option.label}</option>`).join('')}</select>`
        : `<input id="field-${field.key}" type="number" step="any" value="${field.default}">`;
      return `
        <div class="form-group">
          <label for="field-${field.key}">${field.label}</label>
          ${input}
        </div>
      `;
    }).join('');
    latestPdfBase64 = null;
    downloadBtn.disabled = true;
    riskSummary.innerHTML = '<span class="empty-state">Enter values or upload a report, then run prediction.</span>';
    tableBody.innerHTML = '';
    chartSvg.innerHTML = '';
  }

  async function loadConfig() {
    try {
      const response = await fetch(`${apiBase}/api/config`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      config = await response.json();
      renderFields();
      logTerminal('[SYSTEM] Backend API connected.', 'success');
      if (config.modelErrors && Object.keys(config.modelErrors).length) {
        Object.entries(config.modelErrors).forEach(([name, error]) => {
          logTerminal(`[MODEL WARNING] ${name}: ${error}`, 'loading');
        });
      }
    } catch (error) {
      logTerminal(`[ERROR] Could not connect to API: ${error.message}`, 'error');
    }
  }

  async function extractReport() {
    const disease = diseaseSelect.value;
    const file = reportFile.files?.[0];
    if (!file) {
      logTerminal('[ERROR] Choose a PDF or image report first.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('disease', disease);
    formData.append('file', file);

    extractBtn.disabled = true;
    extractBtn.textContent = 'Extracting...';
    logTerminal(`[OCR] Extracting report values for ${disease}...`);

    try {
      const response = await fetch(`${apiBase}/api/extract-report`, {
        method: 'POST',
        body: formData,
      });
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!response.ok) throw new Error(data.detail || `API returned ${response.status}`);

      Object.entries(data.values || {}).forEach(([key, value]) => {
        if (key === 'gender_binary') {
          setFieldValue(disease === 'Liver' ? 'gender' : 'sex', value);
        }
        setFieldValue(key, value);
      });

      const count = Object.keys(data.values || {}).length;
      logTerminal(`[SUCCESS] Extracted ${count} values from report ${data.reportId}.`, 'success');
    } catch (error) {
      logTerminal(`[ERROR] Report extraction failed: ${error.message}`, 'error');
    } finally {
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract Values';
    }
  }

  function collectInputs() {
    const fields = config?.fields?.[diseaseSelect.value] || [];
    const inputs = {};
    fields.forEach((field) => {
      inputs[field.key] = getFieldValue(field);
    });
    return inputs;
  }

  function renderRiskResult(data) {
    const levelClass = data.color || 'green';
    riskSummary.innerHTML = `
      <div class="risk-kicker">${data.organ} screening result</div>
      <div class="risk-value ${levelClass}">
        <strong>${Number(data.riskPercent).toFixed(2)}%</strong>
        <span>${data.riskLevel}</span>
      </div>
      <p>${data.advice}</p>
      <p><strong>Suggested doctor:</strong> ${data.doctor}. <strong>Useful tests:</strong> ${data.tests}.</p>
    `;
  }

  function renderTable(rows) {
    tableBody.innerHTML = (rows || []).map((row) => {
      const statusClass = row.status.toLowerCase().includes('normal') && !row.status.toLowerCase().includes('above') && !row.status.toLowerCase().includes('below')
        ? 'normal'
        : row.status.toLowerCase().includes('above')
          ? 'above'
          : 'below';
      return `
        <tr>
          <td>${row.parameter}</td>
          <td>${Number(row.value).toFixed(2)}</td>
          <td>${row.normalRange}</td>
          <td class="${statusClass}">${row.status}</td>
        </tr>
      `;
    }).join('');
  }

  function renderChart(chart) {
    const labels = chart.labels || [];
    const values = chart.values || [];
    const normalHigh = chart.normalHigh || [];
    const colors = chart.colors || [];
    const width = 420;
    const height = 220;
    const padding = 34;
    const max = Math.max(1, ...values, ...normalHigh);
    const barWidth = Math.max(8, (width - padding * 2) / Math.max(labels.length, 1) * 0.34);

    let svg = `
      <line class="chart-axis" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line class="chart-axis" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
    `;

    labels.forEach((label, index) => {
      const slot = (width - padding * 2) / labels.length;
      const x = padding + slot * index + slot / 2;
      const normalHeight = (normalHigh[index] / max) * (height - padding * 2);
      const valueHeight = (values[index] / max) * (height - padding * 2);
      svg += `
        <rect class="chart-bar-normal" x="${x - barWidth}" y="${height - padding - normalHeight}" width="${barWidth}" height="${normalHeight}" rx="3" />
        <rect class="chart-bar-value" x="${x + 2}" y="${height - padding - valueHeight}" width="${barWidth}" height="${valueHeight}" rx="3" fill="${colors[index] || '#27e7c2'}" />
        <text class="chart-label" x="${x}" y="${height - 10}" text-anchor="middle">${label.slice(0, 8)}</text>
      `;
    });

    chartSvg.innerHTML = svg;
  }

  async function runPrediction() {
    const disease = diseaseSelect.value;
    predictBtn.disabled = true;
    predictBtn.textContent = 'Analyzing...';
    logTerminal(`[MODEL] Running ${disease} prediction...`);

    try {
      const response = await fetch(`${apiBase}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease, inputs: collectInputs() }),
      });
      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseError) {
        throw new Error(raw || 'Backend returned a non-JSON error.');
      }
      if (!response.ok) throw new Error(data.detail || `API returned ${response.status}`);

      renderRiskResult(data);
      renderTable(data.analysisRows);
      renderChart(data.chart);
      latestPdfBase64 = data.pdfBase64;
      latestPdfFilename = data.pdfFilename;
      downloadBtn.disabled = false;
      logTerminal(`[SUCCESS] ${disease} prediction complete: ${data.riskPercent}% ${data.riskLevel}.`, 'success');
    } catch (error) {
      logTerminal(`[ERROR] Prediction failed: ${error.message}`, 'error');
    } finally {
      predictBtn.disabled = false;
      predictBtn.textContent = 'Analyse & Predict Risk';
    }
  }

  function downloadPdf() {
    if (!latestPdfBase64) return;
    const byteCharacters = atob(latestPdfBase64);
    const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = latestPdfFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  diseaseSelect.addEventListener('change', renderFields);
  extractBtn.addEventListener('click', extractReport);
  predictBtn.addEventListener('click', runPrediction);
  downloadBtn.addEventListener('click', downloadPdf);

  document.querySelectorAll('.feature-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      const text = event.currentTarget.textContent.toLowerCase();
      if (text.includes('diabetes')) diseaseSelect.value = 'Diabetes';
      if (text.includes('heart')) diseaseSelect.value = 'Heart';
      if (text.includes('liver')) diseaseSelect.value = 'Liver';
      if (text.includes('kidney')) diseaseSelect.value = 'Kidney';
      renderFields();
    });
  });

  loadConfig();
}
