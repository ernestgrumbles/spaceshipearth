import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const ORBITAL_SPEED = 29.78;
const openedAt = performance.now();

let scene, camera, renderer;
let globe, earth, clouds, lights, moon, moonMesh, homeMarker, sunObject;
let home = null;
let followMe = false;
let mouseX = 0;
let mouseY = 0;
let yaw = 0;

const EARTH_RADIUS = 1.52;
const MARKER_RADIUS = EARTH_RADIUS + 0.055;
const PRESENTATION_SPIN = 0.0005;
const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

function notice() {
  const el = $('notice');
  if (el) el.style.display = 'block';
}

try {
  init();
  animate();
} catch (error) {
  console.error(error);
  notice();
}

updateClock();
updateMotion();
refreshData();
setInterval(updateClock, 1000);
setInterval(updateMotion, 1000);
setInterval(refreshData, 10 * 60 * 1000);

function init() {
  const canvas = $('scene');
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.22, 7.55);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.AmbientLight(0x142434, 0.74));

  const sol = new THREE.DirectionalLight(0xfff2cc, 4.8);
  sol.position.set(-5, 1.65, 3.8);
  scene.add(sol);

  const rim = new THREE.DirectionalLight(0x6de8ff, 1.28);
  rim.position.set(4.2, 1.2, -2.4);
  scene.add(rim);

  globe = new THREE.Group();
  globe.position.set(0, -0.20, 0);
  scene.add(globe);

  earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 128, 128),
    new THREE.MeshPhongMaterial({
      map: texture('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),
      shininess: 14,
      specular: new THREE.Color(0x1b3458),
    }),
  );
  globe.add(earth);

  lights = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS + 0.004, 128, 128),
    new THREE.MeshBasicMaterial({
      map: texture('https://threejs.org/examples/textures/planets/earth_lights_2048.png'),
      transparent: true,
      opacity: 0.30,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  globe.add(lights);

  clouds = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS + 0.027, 128, 128),
    new THREE.MeshLambertMaterial({
      map: texture('https://threejs.org/examples/textures/planets/earth_clouds_1024.png'),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
  );
  globe.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS + 0.12, 128, 128),
    new THREE.MeshBasicMaterial({
      color: 0x6de8ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  globe.add(atmosphere);

  homeMarker = marker(0x6de8ff, 0.026);
  homeMarker.visible = false;
  globe.add(homeMarker);

  moon = makeMoon();
  scene.add(moon);

  sunObject = makeSunVector();
  makeOrbitRings();

  $('subsolarLabel').style.display = 'none';

  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
  });

  $('locBtn')?.addEventListener('click', requestHomePort);
  $('followBtn')?.addEventListener('click', toggleFollow);
  $('refreshBtn')?.addEventListener('click', refreshData);
  $('noticeClose')?.addEventListener('click', () => { $('notice').style.display = 'none'; });
}

function texture(url) {
  const t = loader.load(url, undefined, undefined, notice);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function marker(color, size) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), new THREE.MeshBasicMaterial({ color })));
  g.add(new THREE.Mesh(
    new THREE.TorusGeometry(size * 2.4, size * 0.13, 10, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
  ));
  return g;
}

function makeMoon() {
  const group = new THREE.Group();
  moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 64, 64),
    new THREE.MeshPhongMaterial({ map: texture('https://threejs.org/examples/textures/planets/moon_1024.jpg'), shininess: 2 }),
  );
  group.add(moonMesh);
  group.position.set(2.18, 0.86, -0.08);
  return group;
}

function makeSunVector() {
  const group = new THREE.Group();
  group.position.set(-4.92, 1.32, 0);

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.04, 0.0, 0),
      new THREE.Vector3(2.68, -0.84, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffd06f, transparent: true, opacity: 0.62 }),
  );
  group.add(line);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd06f }),
  );
  group.add(sun);
  scene.add(group);
  return group;
}

function makeOrbitRings() {
  const mat = new THREE.LineBasicMaterial({ color: 0x6de8ff, transparent: true, opacity: 0.045 });
  for (const r of [2.0, 2.42, 2.86]) {
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.15 - 0.20, -0.18));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
}

function latLonToVector3(lat, lon, radius = MARKER_RADIUS) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function setHomeMarker() {
  if (!home) return;
  homeMarker.position.copy(latLonToVector3(home.lat, home.lon));
  homeMarker.lookAt(new THREE.Vector3(0, 0, 0));
}

function labelObject(obj, label, dx = 38, dy = -10, requireFront = true) {
  if (!label) return;
  const world = new THREE.Vector3();
  obj.getWorldPosition(world);

  let facingCamera = true;
  if (requireFront && globe) {
    const normal = world.clone().sub(globe.position).normalize();
    facingCamera = normal.dot(camera.position.clone().sub(world).normalize()) > -0.12;
  }

  world.project(camera);
  const x = (world.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-world.y * 0.5 + 0.5) * window.innerHeight;
  const onscreen = facingCamera && world.z < 1 && x > 0 && x < window.innerWidth && y > 0 && y < window.innerHeight;

  label.style.left = `${x + dx}px`;
  label.style.top = `${y + dy}px`;
  label.style.display = onscreen ? 'block' : 'none';
}

function animate() {
  requestAnimationFrame(animate);

  const now = new Date();
  const sun = solarGeometry(now);

  if (followMe && home) {
    const target = THREE.MathUtils.degToRad(-home.lon - 90);
    yaw += shortestAngle(target - yaw) * 0.025;
  } else {
    yaw += PRESENTATION_SPIN;
  }

  globe.rotation.y = yaw;
  clouds.rotation.y += 0.00035;

  const t = performance.now();
  moon.position.x = 2.18 + Math.sin(t / 13000) * 0.05;
  moon.position.y = 0.86 + Math.cos(t / 11000) * 0.025;
  moon.lookAt(globe.position);
  moonMesh.rotation.y += 0.0007;

  camera.position.x += (mouseX * 0.15 - camera.position.x) * 0.03;
  camera.position.y += (0.22 - mouseY * 0.09 - camera.position.y) * 0.03;
  camera.lookAt(0, -0.08, 0);

  if (home) {
    setHomeMarker();
    homeMarker.visible = true;
    $('daylightState').textContent = isDayAt(home.lat, home.lon, sun) ? 'Day side' : 'Night side';
    labelObject(homeMarker, $('homeLabel'), 38, -10, true);
  } else {
    $('homeLabel').style.display = 'none';
  }

  labelObject(sunObject, $('sunLabel'), 40, -8, false);
  $('subsolarLabel').style.display = 'none';

  $('subsolarLat').textContent = `${sun.subsolarLat.toFixed(2)}°`;
  $('subsolarLon').textContent = `${sun.subsolarLon.toFixed(2)}°`;
  $('declination').textContent = `${sun.declination.toFixed(2)}°`;

  renderer.render(scene, camera);
}

function shortestAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateClock() {
  const now = new Date();
  $('time').textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
  $('date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  if (home) $('localTime').textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatKm(km) {
  return km > 1000000 ? `${(km / 1000000).toFixed(2)}M km` : `${Math.round(km).toLocaleString()} km`;
}

function updateMotion() {
  const now = new Date();
  const elapsed = (performance.now() - openedAt) / 1000;
  const today = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  $('distanceOpen').textContent = formatKm(elapsed * ORBITAL_SPEED);
  $('distanceToday').textContent = formatKm(today * ORBITAL_SPEED);
}

function moonInfo(date = new Date()) {
  const period = 2551443;
  const base = new Date(Date.UTC(2001, 0, 24, 13, 35, 0)).getTime() / 1000;
  const phase = ((date.getTime() / 1000 - base) % period) / period;
  const age = phase * 29.530588853;
  let name = 'New';
  if (age < 1.84566) name = 'New';
  else if (age < 5.53699) name = 'Waxing crescent';
  else if (age < 9.22831) name = 'First quarter';
  else if (age < 12.91963) name = 'Waxing gibbous';
  else if (age < 16.61096) name = 'Full';
  else if (age < 20.30228) name = 'Waning gibbous';
  else if (age < 23.99361) name = 'Last quarter';
  else if (age < 27.68493) name = 'Waning crescent';
  return { name, age: age.toFixed(1), phase };
}

function solarGeometry(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const day = Math.floor((date - start) / 86400000);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const gamma = 2 * Math.PI / 365 * (day - 1 + (hour - 12) / 24);
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const minutesUTC = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let subsolarLon = 180 - (minutesUTC + eqtime) / 4;
  subsolarLon = ((subsolarLon + 540) % 360) - 180;
  return { declination: decl * 180 / Math.PI, subsolarLat: decl * 180 / Math.PI, subsolarLon };
}

function isDayAt(lat, lon, sun) {
  const latR = lat * Math.PI / 180;
  const sunLatR = sun.subsolarLat * Math.PI / 180;
  const lonDiff = (lon - sun.subsolarLon) * Math.PI / 180;
  const cosZenith = Math.sin(latR) * Math.sin(sunLatR) + Math.cos(latR) * Math.cos(sunLatR) * Math.cos(lonDiff);
  return cosZenith > 0;
}

function requestHomePort() {
  if (!navigator.geolocation) {
    $('homeStatus').textContent = 'No geolocation API';
    $('homePosition').textContent = 'Unavailable';
    return;
  }
  $('homeStatus').textContent = 'Requesting location';
  navigator.geolocation.getCurrentPosition((pos) => {
    home = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    $('homeStatus').textContent = 'Home port locked';
    $('homePosition').textContent = `${home.lat.toFixed(3)}°, ${home.lon.toFixed(3)}°`;
    $('localTime').textContent = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    followMe = true;
    $('followBtn').textContent = 'Follow me: on';
    $('followBtn').classList.add('toggle-on');
    setHomeMarker();
    refreshData();
  }, () => {
    $('homeStatus').textContent = 'Location denied';
    $('homePosition').textContent = 'Manual mode';
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
}

function toggleFollow() {
  followMe = !followMe;
  $('followBtn').textContent = `Follow me: ${followMe ? 'on' : 'off'}`;
  $('followBtn').classList.toggle('toggle-on', followMe);
}

async function fetchQuakes() {
  try {
    const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
    const data = await r.json();
    const events = data.features || [];
    $('quakeCount').textContent = events.length;
    return { count: events.length };
  } catch {
    $('quakeCount').textContent = 'offline';
    return { count: 'unknown' };
  }
}

async function fetchISS() {
  try {
    const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const data = await r.json();
    $('iss').textContent = `${data.latitude.toFixed(2)}°, ${data.longitude.toFixed(2)}°`;
  } catch {
    $('iss').textContent = 'offline';
  }
}

async function fetchSolarWind() {
  try {
    const r = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json');
    const rows = await r.json();
    const last = rows.slice(1).reverse().find((row) => row[2]);
    $('solarWind').textContent = last ? `${Number(last[2]).toFixed(0)} km/s` : 'quiet';
  } catch {
    $('solarWind').textContent = 'offline';
  }
}

async function refreshData() {
  const moon = moonInfo();
  $('moonPhase').textContent = moon.name;
  $('moonAge').textContent = `${moon.age} days`;
  const quake = await fetchQuakes();
  await Promise.all([fetchISS(), fetchSolarWind()]);
  const hp = home ? ` Home port is locked at ${home.lat.toFixed(2)}°, ${home.lon.toFixed(2)}° and currently on the ${$('daylightState').textContent.toLowerCase()}.` : ' Home port is standing by pending location permission.';
  $('shipLog').textContent = `Earth remains in stable transit around Sol at approximately 29.78 km/s. Lunar telemetry reports a ${moon.name.toLowerCase()} phase, ${moon.age} days into cycle. Seismic feed shows ${quake.count} M4.5+ crust events in the prior 24 hours.${hp}`;
}
