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
  organGroup.add(mesh);
  return mesh;
}

function buildHeart(glass, wire) {
  addMesh(new THREE.SphereGeometry(2.6, 48, 32), glass, [-1, 0.3, 0], [1, 1.22, 0.85], [0.1, 0.1, -0.28]);
  addMesh(new THREE.SphereGeometry(2.4, 48, 32), glass, [1.2, 0.35, 0], [0.95, 1.12, 0.85], [0, -0.08, 0.22]);
  addMesh(new THREE.ConeGeometry(2.6, 4.2, 48), glass, [0.25, -2.2, 0], [1, 1, 0.82], [0.1, 0.08, -0.12]);
  addMesh(new THREE.SphereGeometry(2.9, 24, 18), wire, [0, -0.35, 0], [1.15, 1.38, 0.85], [0.2, 0.2, -0.2]);
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
  const geom = new THREE.SphereGeometry(0.055, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: tone, transparent: true, opacity: 0.58 });

  for (let i = 0; i < 130; i++) {
    const p = new THREE.Mesh(geom, mat);
    p.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 18);
    p.scale.setScalar(0.6 + Math.random() * 2.3);
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
    organGroup.rotation.y = t * 0.28 + scrollProgress * Math.PI * 2.0 + mouseX * 0.12;
    organGroup.rotation.x = Math.sin(t * 0.8) * 0.12 + scrollProgress * 0.5 - mouseY * 0.08;
    organGroup.position.y = Math.sin(t * 0.9) * 0.22 - scrollProgress * 2.4;
    const scale = 1 + Math.sin(t * 1.2) * 0.025 + scrollProgress * 0.12;
    organGroup.scale.setScalar(scale);
  }
  if (particleGroup) {
    particleGroup.rotation.y = -t * 0.045;
    particleGroup.rotation.x = t * 0.018;
  }
  camera.position.y += ((scrollProgress * 8) - camera.position.y) * 0.035;
  renderer.render(scene, camera);
}

setContent();
initOrganWebGL();
