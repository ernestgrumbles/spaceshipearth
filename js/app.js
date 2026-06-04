import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const ORBITAL_SPEED = 29.78;
const openedAt = performance.now();

let scene, camera, renderer, earthGroup, earth, clouds, nightLights, atmosphere, moon;
let homeMarker3D, subsolarMarker3D;
let home = null;
let followMe = false;
let mouseX = 0;
let mouseY = 0;
let currentYaw = 0;

const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

function showNotice() {
  const notice = $('notice');
  if (notice) notice.style.display = 'block';
}

try {
  init();
  animate();
} catch (error) {
  console.error(error);
  showNotice();
}

tickClock();
tickMotion();
refreshData();
setInterval(tickClock, 1000);
setInterval(tickMotion, 1000);
setInterval(refreshData, 10 * 60 * 1000);

function init() {
  const canvas = $('scene');
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.18, 6.4);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.AmbientLight(0x172536, 1.0));

  const sunLight = new THREE.DirectionalLight(0xfff2cc, 4.2);
  sunLight.position.set(-5, 1.5, 3.6);
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x6de8ff, 1.35);
  rimLight.position.set(4, 1, -2);
  scene.add(rimLight);

  earthGroup = new THREE.Group();
  earthGroup.position.set(0, 0.02, 0);
  scene.add(earthGroup);

  const earthDay = loadTexture('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
  earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.86, 128, 128),
    new THREE.MeshPhongMaterial({
      map: earthDay,
      shininess: 14,
      specular: new THREE.Color(0x1b3458),
    }),
  );
  earth.rotation.y = Math.PI;
  earthGroup.add(earth);

  const nightTex = loadTexture('https://threejs.org/examples/textures/planets/earth_lights_2048.png');
  nightLights = new THREE.Mesh(
    new THREE.SphereGeometry(1.864, 128, 128),
    new THREE.MeshBasicMaterial({
      map: nightTex,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  nightLights.rotation.y = Math.PI;
  earthGroup.add(nightLights);

  const cloudTex = loadTexture('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');
  clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.889, 128, 128),
    new THREE.MeshLambertMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  clouds.rotation.y = Math.PI;
  earthGroup.add(clouds);

  atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 128, 128),
    new THREE.MeshBasicMaterial({
      color: 0x6de8ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  earthGroup.add(atmosphere);

  homeMarker3D = makeMarker(0x6de8ff, 0.029);
  homeMarker3D.visible = false;
  earthGroup.add(homeMarker3D);

  subsolarMarker3D = makeMarker(0xffd06f, 0.026);
  earthGroup.add(subsolarMarker3D);

  moon = makeMoon();
  scene.add(moon);

  makeSunVector();
  makeOrbitRings();

  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
  });

  $('locBtn')?.addEventListener('click', requestHomePort);
  $('followBtn')?.addEventListener('click', toggleFollow);
  $('refreshBtn')?.addEventListener('click', refreshData);
  $('noticeClose')?.addEventListener('click', () => {
    $('notice').style.display = 'none';
  });
}

function loadTexture(url) {
  const texture = loader.load(url, undefined, undefined, showNotice);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeMarker(color, size) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), new THREE.MeshBasicMaterial({ color })));
  group.add(
    new THREE.Mesh(
      new THREE.TorusGeometry(size * 2.35, size * 0.13, 10, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
    ),
  );
  return group;
}

function makeMoon() {
  const group = new THREE.Group();
  const moonTex = loadTexture('https://threejs.org/examples/textures/planets/moon_1024.jpg');
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 64, 64),
    new THREE.MeshPhongMaterial({ map: moonTex, shininess: 2 }),
  );
  group.add(mesh);
  group.position.set(2.75, 0.88, 0.25);
  return group;
}

function makeSunVector() {
  const mat = new THREE.LineBasicMaterial({ color: 0xffd06f, transparent: true, opacity: 0.55 });
  const points = [new THREE.Vector3(-4.45, 1.22, 0), new THREE.Vector3(-2.15, 0.55, 0)];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat));

  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffd06f }));
  sunGlow.position.set(-4.55, 1.25, 0);
  scene.add(sunGlow);
}

function makeOrbitRings() {
  const mat = new THREE.LineBasicMaterial({ color: 0x6de8ff, transparent: true, opacity: 0.12 });
  for (const radius of [2.35, 2.75, 3.18]) {
    const points = [];
    for (let i = 0; i <= 240; i++) {
      const angle = (i / 240) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.18 - 0.08, -0.18));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat));
  }
}

function latLonToVector3(lat, lon, radius = 1.94) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function setMarkerLatLon(marker, lat, lon) {
  marker.position.copy(latLonToVector3(lat, lon, 1.94));
  marker.lookAt(new THREE.Vector3(0, 0, 0));
}

function worldToScreen(obj, label) {
  const vector = new THREE.Vector3();
  obj.getWorldPosition(vector);
  vector.project(camera);
  const visible = vector.z < 1;
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  label.style.left = `${x + 68}px`;
  label.style.top = `${y - 10}px`;
  label.style.display = visible ? 'block' : 'none';
}

function animate() {
  requestAnimationFrame(animate);

  const now = new Date();
  const sun = solarGeometry(now);
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const naturalYaw = (utcHours / 24) * Math.PI * 2;
  let targetYaw = naturalYaw;

  if (followMe && home) targetYaw = -THREE.MathUtils.degToRad(home.lon);
  currentYaw += (targetYaw - currentYaw) * 0.025;

  earthGroup.rotation.y = currentYaw;
  earth.rotation.y += 0.00042;
  clouds.rotation.y += 0.00072;
  nightLights.rotation.y = earth.rotation.y;

  moon.rotation.y += 0.0012;
  moon.position.x = 2.75 + Math.sin(performance.now() / 9000) * 0.08;
  moon.position.y = 0.88 + Math.cos(performance.now() / 11000) * 0.035;

  camera.position.x += (mouseX * 0.18 - camera.position.x) * 0.03;
  camera.position.y += (0.18 - mouseY * 0.10 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  setMarkerLatLon(subsolarMarker3D, sun.subsolarLat, sun.subsolarLon);
  worldToScreen(subsolarMarker3D, $('subsolarLabel'));

  if (home) {
    setMarkerLatLon(homeMarker3D, home.lat, home.lon);
    homeMarker3D.visible = true;
    $('daylightState').textContent = isDayAt(home.lat, home.lon, sun) ? 'Day side' : 'Night side';
    worldToScreen(homeMarker3D, $('homeLabel'));
  } else {
    $('homeLabel').style.display = 'none';
  }

  $('subsolarLat').textContent = `${sun.subsolarLat.toFixed(2)}°`;
  $('subsolarLon').textContent = `${sun.subsolarLon.toFixed(2)}°`;
  $('declination').textContent = `${sun.declination.toFixed(2)}°`;

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function tickClock() {
  const now = new Date();
  $('time').textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
  $('date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  if (home) $('localTime').textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatKm(km) {
  if (km > 1000000) return `${(km / 1000000).toFixed(2)}M km`;
  return `${Math.round(km).toLocaleString()} km`;
}

function tickMotion() {
  const now = new Date();
  const elapsed = (performance.now() - openedAt) / 1000;
  const today = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  $('distanceOpen').textContent = formatKm(elapsed * ORBITAL_SPEED);
  $('distanceToday').textContent = formatKm(today * ORBITAL_SPEED);
}

function moonInfo(date = new Date()) {
  const lunarPeriod = 2551443;
  const base = new Date(Date.UTC(2001, 0, 24, 13, 35, 0)).getTime() / 1000;
  const phase = ((date.getTime() / 1000 - base) % lunarPeriod) / lunarPeriod;
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
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
    const data = await response.json();
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
    const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const data = await response.json();
    $('iss').textContent = `${data.latitude.toFixed(2)}°, ${data.longitude.toFixed(2)}°`;
  } catch {
    $('iss').textContent = 'offline';
  }
}

async function fetchSolarWind() {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json');
    const rows = await response.json();
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
