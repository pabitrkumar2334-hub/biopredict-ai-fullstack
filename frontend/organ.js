const MODULES = {
  Diabetes: {
    organ: 'Pancreas',
    title: 'Pancreas diabetes intelligence',
    eyebrow: 'Pancreas module',
    tone: '#00f0ff',
    rgb: '0, 240, 255',
    summary: 'A focused 3D screening page for glucose regulation, insulin response, BMI load, age, and family-risk patterns linked to diabetes risk.',
    stage: 'Pancreas / insulin response model',
    runHref: 'index.html?module=Diabetes#playground',
    signals: [
      ['Fasting glucose pressure', 'Checks whether the sample is showing high glucose load or borderline diabetic pattern.', 74],
      ['Insulin resistance pathway', 'Combines insulin, BMI, and age signals to estimate metabolic strain.', 62],
      ['Future diabetes watch', 'Projects near-term and long-term watch risk from the current model score.', 82],
    ],
    beats: [
      ['01 Biomarker capture', 'Glucose, insulin, BMI, age, pregnancies, and family-risk values are collected from manual input or report extraction.'],
      ['02 Pancreatic response', 'The model reads the balance between sugar load and insulin response to estimate diabetes screening probability.'],
      ['03 Risk timeline', 'The result is translated into current risk plus future watch scores for 1, 5, and 10 years.'],
    ],
  },
  Heart: {
    organ: 'Heart',
    title: 'Heart disease risk intelligence',
    eyebrow: 'Cardiac module',
    tone: '#ff4e6a',
    rgb: '255, 78, 106',
    summary: 'An immersive cardiac screening page for cholesterol, blood pressure, chest-pain type, ECG pattern, and exercise-response markers.',
    stage: 'Heart / cardiac stress model',
    runHref: 'index.html?module=Heart#playground',
    signals: [
      ['Coronary pattern screening', 'Uses cholesterol, age, vessel, and chest-pain indicators to estimate coronary-risk pattern.', 78],
      ['Pressure and rhythm strain', 'Reads blood pressure and ECG-style fields as practical cardiac stress signals.', 66],
      ['Exercise response risk', 'Checks max heart rate, exercise angina, and ST depression markers.', 71],
    ],
    beats: [
      ['01 Cardiac markers', 'The model receives blood pressure, cholesterol, age, ECG-style inputs, and exercise-response values.'],
      ['02 Signal alignment', 'Inputs are converted into the same feature order used by the trained heart model pipeline.'],
      ['03 Risk interpretation', 'The model output becomes a risk percentage, disease pattern cards, graph, and PDF report.'],
    ],
  },
  Liver: {
    organ: 'Liver',
    title: 'Liver disease pattern intelligence',
    eyebrow: 'Liver module',
    tone: '#dfb15b',
    rgb: '223, 177, 91',
    summary: 'A high-contrast liver module for bilirubin, ALT, AST, alkaline phosphatase, albumin, protein balance, and age-based screening.',
    stage: 'Liver / metabolic enzyme model',
    runHref: 'index.html?module=Liver#playground',
    signals: [
      ['Fatty liver watch', 'Looks for enzyme and protein-balance patterns that may suggest liver stress.', 64],
      ['Inflammation marker pattern', 'Reads ALT, AST, and alkaline phosphatase movement as liver-cell irritation signals.', 72],
      ['Bilirubin balance stress', 'Tracks total and direct bilirubin with albumin and A/G ratio context.', 58],
    ],
    beats: [
      ['01 LFT values', 'The page focuses on bilirubin, ALT, AST, ALP, albumin, total protein, and A/G ratio.'],
      ['02 Hepatic pattern', 'The model combines enzyme elevations and protein balance to classify liver disease risk.'],
      ['03 Care guidance', 'The output suggests specialist direction and follow-up tests such as LFT, GGT, hepatitis panel, or ultrasound.'],
    ],
  },
  Kidney: {
    organ: 'Kidneys',
    title: 'Kidney filtration intelligence',
    eyebrow: 'Kidney module',
    tone: '#51a9ff',
    rgb: '81, 169, 255',
    summary: 'A renal screening page for creatinine, urea, electrolytes, urine markers, hemoglobin, blood pressure, and diabetes-linked kidney risk.',
    stage: 'Kidney / filtration model',
    runHref: 'index.html?module=Kidney#playground',
    signals: [
      ['CKD screening signal', 'Checks creatinine, urea, blood pressure, and diabetes markers for kidney-risk pattern.', 76],
      ['Filtration clearance pattern', 'Reads urine albumin, specific gravity, and waste-clearance values.', 68],
      ['Electrolyte imbalance watch', 'Uses sodium, potassium, hemoglobin, WBC/RBC, and urine markers.', 61],
    ],
    beats: [
      ['01 Renal markers', 'Creatinine, urea, sodium, potassium, urine values, hemoglobin, and BP are mapped into the kidney model.'],
      ['02 Filtration story', 'The visualization emphasizes waste clearance, pressure load, and electrolyte balance.'],
      ['03 Report output', 'The prediction returns risk level, biomarker table, graph, future watch score, and downloadable PDF.'],
    ],
  },
};

const params = new URLSearchParams(window.location.search);
const selected = MODULES[params.get('module')] ? params.get('module') : 'Diabetes';
const data = MODULES[selected];

let scene, camera, renderer, organGroup, particleGroup;
let scrollProgress = 0;
let mouseX = 0;
let mouseY = 0;
let pulseTargets = [];

function setContent() {
  document.documentElement.style.setProperty('--organ-tone', data.tone);
  document.documentElement.style.setProperty('--organ-rgb', data.rgb);
  document.title = `BioPredict AI | ${data.organ} Module`;

  document.getElementById('organ-eyebrow').textContent = data.eyebrow;
  document.getElementById('organ-title').textContent = data.title;
  document.getElementById('organ-summary').textContent = data.summary;
  document.getElementById('organ-stage-label').textContent = data.stage;
  document.getElementById('signals-label').textContent = `${data.organ} signals`;
  document.getElementById('signals-title').textContent = `What the ${data.organ.toLowerCase()} module searches for.`;
  document.getElementById('signals-desc').textContent = data.summary;
  document.getElementById('workflow-title').textContent = `${data.organ} model workflow.`;
  document.getElementById('workflow-desc').textContent = 'Scroll through the organ model while each screening layer is explained in plain language.';
  document.getElementById('cta-organ-title').textContent = `Run the ${data.organ} prediction model.`;

  ['run-selected-model', 'cta-run-selected-model', 'nav-run-model'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = data.runHref;
  });

  document.getElementById('organ-signal-grid').innerHTML = data.signals.map((signal, index) => `
    <article class="organ-signal-card">
      <span class="signal-index">0${index + 1}</span>
      <h3>${signal[0]}</h3>
      <p>${signal[1]}</p>
      <div class="organ-signal-line" style="--signal-width:${signal[2]}%">
        <span></span>
      </div>
    </article>
  `).join('');

  document.getElementById('organ-beat-list').innerHTML = data.beats.map((beat) => `
    <article class="organ-beat-card">
      <span>${beat[0]}</span>
      <h3>${beat[0].replace(/^[0-9]+\s/, '')}</h3>
      <p>${beat[1]}</p>
    </article>
  `).join('');

  const visual = document.getElementById('anatomy-visual');
  if (visual) visual.innerHTML = getOrganSvg(selected);
}

function svgDefs() {
  return `
    <defs>
      <radialGradient id="organBodyGradient" cx="45%" cy="35%" r="68%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.34)" />
        <stop offset="42%" stop-color="rgba(var(--organ-rgb),0.24)" />
        <stop offset="100%" stop-color="rgba(var(--organ-rgb),0.04)" />
      </radialGradient>
      <linearGradient id="redGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,130,150,0.76)" />
        <stop offset="55%" stop-color="rgba(255,55,78,0.46)" />
        <stop offset="100%" stop-color="rgba(110,10,30,0.2)" />
      </linearGradient>
    </defs>
  `;
}

function getOrganSvg(module) {
  if (module === 'Heart') return heartSvg();
  if (module === 'Liver') return liverSvg();
  if (module === 'Kidney') return kidneySvg();
  return pancreasSvg();
}

function heartSvg() {
  return `
    <svg class="anatomy-svg heart-anatomy" viewBox="0 0 520 460" role="img" aria-label="Animated heart anatomy">
      ${svgDefs()}
      <path class="organ-shell" fill="url(#redGlowGradient)" d="M255 405C118 312 86 181 145 111c34-40 86-37 113 3 30-46 96-54 138-14 70 67 35 210-141 305Z"/>
      <path class="organ-core" d="M248 124c-18 56-20 123-7 203M282 125c25 71 20 141-18 236M165 174c56 0 80 35 84 91M360 164c-59 17-84 55-88 116"/>
      <path class="organ-vessel" d="M245 116c-2-47 6-72 32-88M286 119c34-44 72-57 111-43M222 122c-18-49-55-72-100-62"/>
      <path class="organ-vessel" d="M277 28c39 4 69 25 91 56M398 77c34 4 62-8 82-30M122 60c-24 0-48-10-70-31"/>
      <path class="organ-branch" d="M157 191c52 4 70 33 82 78M370 180c-45 23-67 51-82 91M216 310c-28 24-58 38-93 40M300 313c35 27 73 42 116 40"/>
      <path class="organ-flow" d="M257 84c18 80 13 169-16 270M300 87c-24 70-17 151 20 244"/>
      <circle class="organ-node" cx="250" cy="260" r="8"/>
      <circle class="organ-node" cx="309" cy="229" r="6"/>
      <circle class="organ-particle" cx="151" cy="253" r="4"/>
      <circle class="organ-particle" cx="412" cy="244" r="5"/>
    </svg>
  `;
}

function kidneySvg() {
  return `
    <svg class="anatomy-svg kidney-anatomy" viewBox="0 0 520 460" role="img" aria-label="Animated kidney anatomy">
      ${svgDefs()}
      <path class="organ-shell" d="M256 57c-82 4-148 89-137 192 12 112 94 168 160 139 43-19 44-61 14-91-22-22-31-47-19-76 15-37 64-48 84-86 22-43-24-82-102-78Z"/>
      <path class="organ-core" d="M282 120c-72 27-105 95-84 163 15 50 59 71 94 52M293 174c-46 8-76 46-66 88 5 22 19 38 39 48"/>
      <path class="organ-vessel" d="M296 226c75 2 108-31 145-80M294 241c73 17 101 60 133 113"/>
      <path class="organ-branch" d="M288 220c-31 17-54 43-63 82M306 230c25-9 49-27 73-57M305 249c27 12 53 33 76 66"/>
      <path class="organ-flow" d="M265 319c24 35 28 68 21 103"/>
      <circle class="organ-node" cx="278" cy="229" r="8"/>
      <circle class="organ-node" cx="232" cy="286" r="5"/>
      <circle class="organ-particle" cx="181" cy="151" r="5"/>
      <circle class="organ-particle" cx="206" cy="353" r="4"/>
    </svg>
  `;
}

function liverSvg() {
  return `
    <svg class="anatomy-svg liver-anatomy" viewBox="0 0 560 430" role="img" aria-label="Animated liver anatomy">
      ${svgDefs()}
      <path class="organ-shell" d="M62 246c16-80 102-138 219-151 87-10 164 7 216 46 38 28 24 75-32 99-74 32-111 96-209 99-95 3-105-54-194-47-19 1-28-18 0-46Z"/>
      <path class="organ-core" d="M160 246c99-71 218-78 323-66M189 294c65-55 112-86 199-102M261 320c16-65 45-103 96-130"/>
      <path class="organ-vessel" d="M276 305c13-71 42-123 104-168"/>
      <path class="organ-branch" d="M311 240c-46-27-91-39-137-38M323 224c49-31 98-39 147-28M293 275c-39 24-77 36-118 37M340 263c39 20 76 29 112 29"/>
      <path class="organ-flow" d="M102 248c101-29 218-39 361-31M152 190c116 31 214 30 296 4"/>
      <circle class="organ-node" cx="316" cy="236" r="8"/>
      <circle class="organ-node" cx="381" cy="181" r="5"/>
      <circle class="organ-particle" cx="455" cy="142" r="6"/>
      <circle class="organ-particle" cx="489" cy="117" r="4"/>
      <circle class="organ-particle" cx="421" cy="314" r="5"/>
    </svg>
  `;
}

function pancreasSvg() {
  return `
    <svg class="anatomy-svg pancreas-anatomy" viewBox="0 0 560 360" role="img" aria-label="Animated pancreas anatomy">
      ${svgDefs()}
      <path class="organ-shell" d="M69 203c27-59 94-88 168-71 52 12 75 42 122 24 70-27 138-7 153 49 14 51-32 95-95 89-58-6-83-42-128-25-76 29-174 48-217-13-12-17-12-34-3-53Z"/>
      <path class="organ-core" d="M95 214c74-23 145-21 212-3 74 20 128 17 178-14M119 248c70-16 134-16 190 0 53 15 102 16 147-6"/>
      <path class="organ-vessel" d="M128 182c67 42 121 54 171 39 61-18 104-18 151 10"/>
      <path class="organ-branch" d="M171 166c-17 31-21 61-12 91M240 170c-10 28-10 57 2 86M344 174c-8 36-4 68 15 96M426 173c11 27 14 55 5 84"/>
      <path class="organ-flow" d="M103 223c82 7 150 1 207-18 74-25 132-19 177 19"/>
      <circle class="organ-node" cx="185" cy="211" r="9"/>
      <circle class="organ-node" cx="273" cy="226" r="7"/>
      <circle class="organ-node" cx="390" cy="219" r="8"/>
      <circle class="organ-particle" cx="210" cy="132" r="5"/>
      <circle class="organ-particle" cx="337" cy="151" r="4"/>
      <circle class="organ-particle" cx="468" cy="178" r="5"/>
    </svg>
  `;
}

function initOrganWebGL() {
  const container = document.getElementById('organ-webgl');
  if (!container || !window.THREE) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05090c, 0.045);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 24);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  const tone = new THREE.Color(data.tone);
  scene.add(new THREE.AmbientLight(0x07131a, 2.2));

  const key = new THREE.PointLight(tone, 4.8, 58);
  key.position.set(6, 5, 12);
  scene.add(key);

  const rim = new THREE.PointLight(0xffffff, 1.6, 42);
  rim.position.set(-9, 2, -6);
  scene.add(rim);

  const gold = new THREE.PointLight(0xdfb15b, 1.6, 38);
  gold.position.set(-4, -6, 8);
  scene.add(gold);

  organGroup = new THREE.Group();
  scene.add(organGroup);
  buildOrganModel(tone);
  buildParticles(tone);

  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', () => {
    const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
    scrollProgress = window.scrollY / maxScroll;
  }, { passive: true });
  window.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  animate();
}

function buildOrganModel(tone) {
  pulseTargets = [];
  const glass = new THREE.MeshPhysicalMaterial({
    color: tone,
    transparent: true,
    opacity: 0.34,
    roughness: 0.2,
    metalness: 0.18,
    transmission: 0.2,
    clearcoat: 0.9,
    emissive: tone,
    emissiveIntensity: 0.08,
    side: THREE.DoubleSide,
  });

  const wire = new THREE.MeshBasicMaterial({
    color: tone,
    wireframe: true,
    transparent: true,
    opacity: 0.28,
  });

  if (selected === 'Heart') buildHeart(glass, wire);
  if (selected === 'Diabetes') buildPancreas(glass, wire);
  if (selected === 'Liver') buildLiver(glass, wire);
  if (selected === 'Kidney') buildKidneys(glass, wire);

  addPathways(tone);
}

function addMesh(geometry, material, position, scale, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.userData.baseScale = new THREE.Vector3(...scale);
  organGroup.add(mesh);
  return mesh;
}

function buildHeart(glass, wire) {
  const geometry = createProceduralHeartGeometry();
  const heartMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8a0f1a,
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.25,
    sheen: 1,
    sheenColor: new THREE.Color(0xff3a4a),
    sheenRoughness: 0.5,
    emissive: 0x260006,
    emissiveIntensity: 0.16,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff2030,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const veinMaterial = new THREE.MeshBasicMaterial({
    color: 0x3a0008,
    wireframe: true,
    transparent: true,
    opacity: 0.22,
  });

  const heart = addMesh(geometry, heartMaterial, [0, -0.35, 0], [1.38, 1.38, 1.38], [0.08, 0.08, Math.PI]);
  const glow = addMesh(geometry, glowMaterial, [0, -0.35, 0], [1.46, 1.46, 1.46], [0.08, 0.08, Math.PI]);
  const veins = addMesh(geometry, veinMaterial, [0, -0.35, 0], [1.47, 1.47, 1.47], [0.08, 0.08, Math.PI]);

  pulseTargets.push(heart, glow, veins);

  addHeartVessels();
}

function createProceduralHeartGeometry() {
  const shape = new THREE.Shape();
  const x = 0;
  const y = 0;
  shape.moveTo(x, y + 0.5);
  shape.bezierCurveTo(x, y + 0.5, x - 0.4, y + 1.2, x - 1.1, y + 1.2);
  shape.bezierCurveTo(x - 2.2, y + 1.2, x - 2.2, y - 0.2, x - 2.2, y - 0.2);
  shape.bezierCurveTo(x - 2.2, y - 0.9, x - 1.4, y - 1.8, x, y - 2.6);
  shape.bezierCurveTo(x + 1.4, y - 1.8, x + 2.2, y - 0.9, x + 2.2, y - 0.2);
  shape.bezierCurveTo(x + 2.2, y - 0.2, x + 2.2, y + 1.2, x + 1.1, y + 1.2);
  shape.bezierCurveTo(x + 0.4, y + 1.2, x, y + 0.5, x, y + 0.5);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.4,
    bevelEnabled: true,
    bevelSegments: 12,
    steps: 4,
    bevelSize: 0.5,
    bevelThickness: 0.5,
    curveSegments: 64,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

function addHeartVessels() {
  const vesselMaterial = new THREE.MeshStandardMaterial({
    color: 0x00d9ff,
    metalness: 0.35,
    roughness: 0.25,
    emissive: 0x003344,
    emissiveIntensity: 0.65,
  });
  const arteryMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2e46,
    metalness: 0.28,
    roughness: 0.28,
    emissive: 0x44000a,
    emissiveIntensity: 0.5,
  });

  const vesselSpecs = [
    [[-0.9, 1.55, 0.2], [-1.15, 3.15, 0.25], 0.18, vesselMaterial],
    [[0.18, 1.62, 0.15], [0.25, 3.35, 0.2], 0.2, vesselMaterial],
    [[0.96, 1.44, 0.16], [1.75, 2.9, 0.18], 0.16, vesselMaterial],
    [[1.1, 0.32, 0.38], [3.55, 0.95, 0.25], 0.07, arteryMaterial],
    [[-0.95, -0.18, 0.42], [-3.1, -0.75, 0.25], 0.065, arteryMaterial],
    [[0.25, -0.48, 0.48], [0.75, -2.8, 0.3], 0.06, arteryMaterial],
  ];

  vesselSpecs.forEach(([start, end, radius, material]) => {
    const curve = new THREE.LineCurve3(new THREE.Vector3(...start), new THREE.Vector3(...end));
    const tube = new THREE.TubeGeometry(curve, 24, radius, 12, false);
    const mesh = new THREE.Mesh(tube, material);
    mesh.userData.baseScale = new THREE.Vector3(1, 1, 1);
    organGroup.add(mesh);
    pulseTargets.push(mesh);
  });
}

function buildPancreas(glass, wire) {
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 1.2;
    const y = Math.sin(i * 0.9) * 0.5;
    addMesh(new THREE.SphereGeometry(1.25, 34, 22), glass, [x, y, 0], [1.15, 0.62, 0.58], [0, 0, i * 0.18]);
  }
  addMesh(new THREE.SphereGeometry(4.9, 32, 18), wire, [0, 0, 0], [1.2, 0.36, 0.42], [0, 0, 0.06]);
}

function buildLiver(glass, wire) {
  addMesh(new THREE.SphereGeometry(3.3, 48, 28), glass, [-1.2, 0, 0], [1.35, 0.82, 0.58], [0.08, 0.02, -0.08]);
  addMesh(new THREE.SphereGeometry(2.45, 48, 28), glass, [2.0, -0.28, 0], [1.1, 0.68, 0.52], [0.12, -0.1, 0.22]);
  addMesh(new THREE.SphereGeometry(4.3, 28, 18), wire, [0.25, -0.1, 0], [1.35, 0.52, 0.38], [0, 0, 0.04]);
}

function buildKidneys(glass, wire) {
  addMesh(new THREE.SphereGeometry(2.1, 42, 26), glass, [-2.2, 0, 0], [0.74, 1.45, 0.62], [0, 0, -0.22]);
  addMesh(new THREE.SphereGeometry(2.1, 42, 26), glass, [2.2, 0, 0], [0.74, 1.45, 0.62], [0, 0, 0.22]);
  addMesh(new THREE.TorusGeometry(1.2, 0.08, 10, 60), wire, [-2.2, 0, 0.2], [1, 1.38, 1], [0, 0.2, 0]);
  addMesh(new THREE.TorusGeometry(1.2, 0.08, 10, 60), wire, [2.2, 0, 0.2], [1, 1.38, 1], [0, -0.2, 0]);
}

function addPathways(tone) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xdfb15b,
    metalness: 0.75,
    roughness: 0.24,
    emissive: 0x332200,
    emissiveIntensity: 0.24,
  });
  const geom = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);

  for (let i = 0; i < 18; i++) {
    const strand = new THREE.Mesh(geom, mat);
    const angle = i * 0.7;
    strand.position.set(Math.cos(angle) * (3 + (i % 4) * 0.25), Math.sin(angle * 0.7) * 2.0, Math.sin(angle) * 1.6);
    strand.scale.set(1, 2 + (i % 5) * 0.6, 1);
    strand.rotation.set(Math.sin(angle) * 0.9, 0, angle);
    organGroup.add(strand);
  }

  const ringMat = new THREE.MeshBasicMaterial({ color: tone, wireframe: true, transparent: true, opacity: 0.16 });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.8 + i * 1.25, 0.025, 8, 120), ringMat);
    ring.rotation.set(Math.PI / 2.4, 0.2 + i * 0.12, i * 0.45);
    organGroup.add(ring);
  }
}

function buildParticles(tone) {
  particleGroup = new THREE.Group();
  scene.add(particleGroup);
  const isHeart = selected === 'Heart';
  const geom = new THREE.SphereGeometry(isHeart ? 0.04 : 0.055, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: isHeart ? 0xff5a6a : tone,
    transparent: true,
    opacity: isHeart ? 0.6 : 0.58,
  });

  const count = isHeart ? 900 : 130;
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geom, mat);
    if (isHeart) {
      const r = 6 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      p.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      p.scale.setScalar(0.65 + Math.random() * 1.45);
    } else {
      p.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 18);
      p.scale.setScalar(0.6 + Math.random() * 2.3);
    }
    particleGroup.add(p);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  const t = time * 0.001;
  if (organGroup) {
    const isHeart = selected === 'Heart';
    const beat =
      Math.pow(Math.sin(t * 2.6) * 0.5 + 0.5, 8) * 0.18 +
      Math.pow(Math.sin(t * 2.6 - 0.35) * 0.5 + 0.5, 12) * 0.1;
    organGroup.rotation.y = isHeart
      ? scrollProgress * Math.PI * 2.2 + t * 0.05 + mouseX * 0.1
      : t * 0.28 + scrollProgress * Math.PI * 2.0 + mouseX * 0.12;
    organGroup.rotation.x = isHeart
      ? Math.sin(scrollProgress * Math.PI * 1.5) * 0.4 - mouseY * 0.08
      : Math.sin(t * 0.8) * 0.12 + scrollProgress * 0.5 - mouseY * 0.08;
    organGroup.position.y = isHeart
      ? Math.sin(t * 0.9) * 0.18 - scrollProgress * 1.2
      : Math.sin(t * 0.9) * 0.22 - scrollProgress * 2.4;
    const scale = isHeart
      ? 1 + scrollProgress * 0.05
      : 1 + Math.sin(t * 1.2) * 0.025 + scrollProgress * 0.12;
    organGroup.scale.setScalar(scale);
    if (isHeart) {
      pulseTargets.forEach((mesh, index) => {
        const base = mesh.userData.baseScale || new THREE.Vector3(1, 1, 1);
        const pulse = 1 + beat * (index === 1 ? 1.22 : 1);
        mesh.scale.set(base.x * pulse, base.y * pulse, base.z * pulse);
      });
    }
  }
  if (particleGroup) {
    particleGroup.rotation.y = selected === 'Heart' ? t * 0.03 : -t * 0.045;
    particleGroup.rotation.x = selected === 'Heart' ? t * 0.01 : t * 0.018;
  }
  camera.position.y += ((scrollProgress * 8) - camera.position.y) * 0.035;
  renderer.render(scene, camera);
}

setContent();
initOrganWebGL();
