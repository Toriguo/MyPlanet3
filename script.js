(function () {
  'use strict';

  /* ===== IndexedDB ===== */
  const DB_NAME = 'my_galaxy_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';
  let db = null;

  function openDB() {
    return new Promise(function (resolve, reject) {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function () { reject(request.error); };
      request.onsuccess = function () { resolve(request.result); };
      request.onupgradeneeded = function (event) {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  function dbGet(id) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = function () { resolve(req.result ? req.result.data : null); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /* ===== 星空背景 ===== */
  const starfield = document.getElementById('starfield');
  const ctxStars = starfield.getContext('2d');
  let stars = [];
  let animStars = null;
  let scrollY = 0;
  let width, height;

  function resize() {
    width = starfield.width = Math.min(window.innerWidth, 900);
    height = starfield.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    const count = Math.floor((width * height) / 4000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 3,
        z: Math.random(),
        size: Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: 0.3 + Math.random() * 0.5,
      });
    }
  }

  function drawStars(time) {
    ctxStars.clearRect(0, 0, width, height);
    const colors = ['#ffffff', '#ccddff', '#aaccff', '#88ccff'];

    stars.forEach(function (star) {
      const factor = 0.1 + star.z * 0.4;
      const offsetY = (scrollY * factor) % (height * 3);
      let y = star.y - offsetY;
      if (y < -10) y += height * 3;

      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.brightness * twinkle;

      ctxStars.fillStyle = colors[Math.floor(star.z * colors.length)];
      ctxStars.globalAlpha = alpha;

      const px = Math.round(star.x);
      const py = Math.round(y);
      ctxStars.fillRect(px, py, star.size, star.size);
    });
    ctxStars.globalAlpha = 1;
    animStars = requestAnimationFrame(drawStars);
  }

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(drawStars);

  /* ===== 流星效果 ===== */
  const meteorCanvas = document.getElementById('meteor-canvas');
  const mCtx = meteorCanvas.getContext('2d');
  let meteors = [];
  let meteorTimer = 0;

  function resizeMeteor() {
    const hero = document.getElementById('hero');
    meteorCanvas.width = hero.clientWidth;
    meteorCanvas.height = hero.clientHeight;
  }

  function createMeteor() {
    const startX = Math.random() * meteorCanvas.width;
    const startY = Math.random() * meteorCanvas.height * 0.3;
    const length = 80 + Math.random() * 120;
    const speed = 3 + Math.random() * 4;
    const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;

    meteors.push({
      x: startX,
      y: startY,
      length: length,
      speed: speed,
      angle: angle,
      life: 1,
      decay: 0.01 + Math.random() * 0.02,
      width: 1 + Math.random() * 2,
    });
  }

  function drawMeteors() {
    mCtx.clearRect(0, 0, meteorCanvas.width, meteorCanvas.height);

    meteors = meteors.filter(function (meteor) {
      meteor.x += Math.cos(meteor.angle) * meteor.speed;
      meteor.y += Math.sin(meteor.angle) * meteor.speed;
      meteor.life -= meteor.decay;

      if (meteor.life <= 0) return false;

      const tailX = meteor.x - Math.cos(meteor.angle) * meteor.length;
      const tailY = meteor.y - Math.sin(meteor.angle) * meteor.length;

      const gradient = mCtx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
      gradient.addColorStop(0, 'rgba(255, 255, 255, ' + meteor.life + ')');
      gradient.addColorStop(0.1, 'rgba(200, 230, 255, ' + (meteor.life * 0.8) + ')');
      gradient.addColorStop(0.5, 'rgba(136, 204, 255, ' + (meteor.life * 0.4) + ')');
      gradient.addColorStop(1, 'rgba(136, 204, 255, 0)');

      mCtx.strokeStyle = gradient;
      mCtx.lineWidth = meteor.width;
      mCtx.lineCap = 'round';
      mCtx.beginPath();
      mCtx.moveTo(meteor.x, meteor.y);
      mCtx.lineTo(tailX, tailY);
      mCtx.stroke();

      mCtx.fillStyle = 'rgba(255, 255, 255, ' + meteor.life + ')';
      mCtx.beginPath();
      mCtx.arc(meteor.x, meteor.y, meteor.width * 1.5, 0, Math.PI * 2);
      mCtx.fill();

      return true;
    });

    meteorTimer++;
    if (meteorTimer > 60 + Math.random() * 120) {
      createMeteor();
      meteorTimer = 0;
    }

    requestAnimationFrame(drawMeteors);
  }

  window.addEventListener('resize', resizeMeteor);
  resizeMeteor();
  requestAnimationFrame(drawMeteors);

  /* ===== 银河系旋臂粒子 ===== */
  const galaxyCanvas = document.getElementById('galaxy-canvas');
  const gCtx = galaxyCanvas.getContext('2d');
  let galaxyParticles = [];
  let galaxyTime = 0;

  function resizeGalaxy() {
    const container = document.getElementById('galaxy-container');
    galaxyCanvas.width = container.clientWidth;
    galaxyCanvas.height = container.clientHeight;
    initGalaxyParticles();
  }

  function initGalaxyParticles() {
    galaxyParticles = [];
    const count = 200;
    const cx = galaxyCanvas.width / 2;
    const cy = galaxyCanvas.height / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const arm = Math.floor(Math.random() * 4);
      const armAngle = arm * (Math.PI / 2);
      const dist = Math.random() * Math.min(cx, cy) * 0.9;
      const spiralAngle = dist * 0.01;

      galaxyParticles.push({
        angle: armAngle + spiralAngle + (Math.random() - 0.5) * 0.5,
        dist: dist,
        size: 1 + Math.random() * 2,
        speed: 0.0001 + Math.random() * 0.0003,
        hue: 180 + Math.random() * 60,
        brightness: 0.3 + Math.random() * 0.5,
      });
    }
  }

  function drawGalaxy() {
    gCtx.clearRect(0, 0, galaxyCanvas.width, galaxyCanvas.height);
    const cx = galaxyCanvas.width / 2;
    const cy = galaxyCanvas.height / 2;

    galaxyParticles.forEach(function (p) {
      p.angle += p.speed;
      const x = cx + Math.cos(p.angle) * p.dist;
      const y = cy + Math.sin(p.angle) * p.dist;

      const twinkle = 0.5 + 0.5 * Math.sin(galaxyTime * 0.002 + p.dist);
      const alpha = p.brightness * twinkle;

      gCtx.fillStyle = `hsl(${p.hue}, 70%, ${70 + twinkle * 30}%)`;
      gCtx.globalAlpha = alpha;
      gCtx.fillRect(Math.round(x), Math.round(y), p.size, p.size);
    });
    gCtx.globalAlpha = 1;

    galaxyTime += 16;
    requestAnimationFrame(drawGalaxy);
  }

  window.addEventListener('resize', resizeGalaxy);
  setTimeout(resizeGalaxy, 100);
  drawGalaxy();

  /* ===== 银河带效果 ===== */
  const milkyCanvas = document.getElementById('milky-canvas');
  let milkyAnim = null;
  let milkyParticles = [];

  if (milkyCanvas) {
    const mCtx = milkyCanvas.getContext('2d');
    let milkyWidth, milkyHeight;

    function resizeMilky() {
      milkyWidth = milkyCanvas.width = milkyCanvas.parentElement.clientWidth;
      milkyHeight = milkyCanvas.height = 120;
      initMilky();
    }

    function initMilky() {
      milkyParticles = [];
      for (let i = 0; i < 100; i++) {
        milkyParticles.push({
          x: Math.random() * milkyWidth,
          y: milkyHeight / 2 + (Math.random() - 0.5) * milkyHeight * 0.5,
          size: 1 + Math.random() * 2,
          speedX: 0.2 + Math.random() * 0.5,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    function drawMilky(t) {
      mCtx.clearRect(0, 0, milkyWidth, milkyHeight);
      milkyParticles.forEach(function (p) {
        p.x += p.speedX;
        if (p.x > milkyWidth + 10) p.x = -10;
        const twinkle = 0.4 + 0.6 * Math.sin(t * 0.002 + p.twinkleOffset);
        mCtx.fillStyle = '#ffffff';
        mCtx.globalAlpha = twinkle * 0.6;
        mCtx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      });
      milkyAnim = requestAnimationFrame(drawMilky);
    }

    window.addEventListener('resize', resizeMilky);
    resizeMilky();
    requestAnimationFrame(drawMilky);
  }

  /* ===== 变量声明 ===== */
  const galaxyModal = document.getElementById('galaxy-modal');
  const modalLabel = document.getElementById('modal-label');
  const modalClose = document.getElementById('modal-close');
  const modalBg = galaxyModal.querySelector('.galaxy-modal-bg');
  const modalStarCanvas = document.getElementById('modal-star-canvas');
  const modalStarCtx = modalStarCanvas.getContext('2d');
  const galaxyOrbits = document.getElementById('galaxy-orbits');
  const floatingContainer = document.getElementById('floating-images-container');

  const planetColors = ['#88ccff', '#ff88cc', '#88ffaa', '#ffcc88', '#ff8888', '#88ffcc', '#cc88ff', '#ffcc66'];
  const orbitSizeStep = 100;
  const orbitDurationStep = 15;
  const planetPositions = [
    { top: '0', left: '50%', right: 'auto', bottom: 'auto' },
    { top: '25%', right: '0', left: 'auto', bottom: 'auto' },
    { bottom: '0', left: '50%', right: 'auto', top: 'auto' },
    { left: '0', top: '35%', right: 'auto', bottom: 'auto' }
  ];

  let portfolioData = [];
  let currentPlanetIndex = 0;
  let scatterParticles = [];
  let scatterAnimId = null;
  let floatingImages = [];

  function resizeModalStarCanvas() {
    modalStarCanvas.width = Math.min(window.innerWidth, 900);
    modalStarCanvas.height = window.innerHeight;
  }

  function createScatterParticles(originX, originY, count) {
    scatterParticles = [];
    const dreamColors = [
      { h: 280, s: 80, l: 70 },
      { h: 320, s: 90, l: 75 },
      { h: 200, s: 85, l: 75 },
      { h: 170, s: 80, l: 70 },
      { h: 260, s: 85, l: 80 },
      { h: 300, s: 75, l: 75 },
      { h: 220, s: 90, l: 80 },
      { h: 340, s: 80, l: 75 }
    ];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const colorDef = dreamColors[Math.floor(Math.random() * dreamColors.length)];
      const hue = colorDef.h + (Math.random() - 0.5) * 30;
      const sat = colorDef.s + (Math.random() - 0.5) * 20;
      const light = colorDef.l + (Math.random() - 0.5) * 20;

      scatterParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 4,
        life: 1,
        decay: 0.003 + Math.random() * 0.012,
        color: `hsl(${hue}, ${sat}%, ${light}%)`,
        glowColor: `hsla(${hue}, ${sat}%, ${light}%, 0.4)`,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 3 + Math.random() * 8,
        trail: [],
        maxTrail: 5 + Math.floor(Math.random() * 8),
        type: Math.random() < 0.3 ? 'star' : Math.random() < 0.6 ? 'diamond' : 'dot',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  function drawScatter() {
    modalStarCtx.clearRect(0, 0, modalStarCanvas.width, modalStarCanvas.height);

    scatterParticles = scatterParticles.filter(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= p.decay;
      p.rotation += p.rotSpeed;

      if (p.life <= 0) return false;

      p.trail.push({ x: p.x, y: p.y, life: p.life });
      if (p.trail.length > p.maxTrail) {
        p.trail.shift();
      }

      const twinkle = 0.5 + 0.5 * Math.sin(p.life * p.twinkleSpeed * 10 + p.twinkle);
      const alpha = p.life * twinkle;

      for (let t = 0; t < p.trail.length - 1; t++) {
        const trailPoint = p.trail[t];
        const trailAlpha = (t / p.trail.length) * alpha * 0.5;
        const trailSize = p.size * (t / p.trail.length) * 0.6;

        modalStarCtx.globalAlpha = trailAlpha;
        modalStarCtx.fillStyle = p.glowColor;
        modalStarCtx.beginPath();
        modalStarCtx.arc(trailPoint.x, trailPoint.y, trailSize + 1, 0, Math.PI * 2);
        modalStarCtx.fill();
      }

      modalStarCtx.globalAlpha = alpha * 0.3;
      modalStarCtx.fillStyle = p.glowColor;
      modalStarCtx.beginPath();
      modalStarCtx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      modalStarCtx.fill();

      modalStarCtx.globalAlpha = alpha;
      modalStarCtx.fillStyle = p.color;

      if (p.type === 'star') {
        drawStar(p.x, p.y, p.size * 1.5, p.rotation);
      } else if (p.type === 'diamond') {
        drawDiamond(p.x, p.y, p.size, p.rotation);
      } else {
        modalStarCtx.beginPath();
        modalStarCtx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        modalStarCtx.fill();
      }

      return true;
    });

    modalStarCtx.globalAlpha = 1;

    if (scatterParticles.length > 0) {
      scatterAnimId = requestAnimationFrame(drawScatter);
    }
  }

  function drawStar(x, y, size, rotation) {
    modalStarCtx.save();
    modalStarCtx.translate(x, y);
    modalStarCtx.rotate(rotation);
    modalStarCtx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) modalStarCtx.moveTo(px, py);
      else modalStarCtx.lineTo(px, py);
    }
    modalStarCtx.closePath();
    modalStarCtx.fill();
    modalStarCtx.restore();
  }

  function drawDiamond(x, y, size, rotation) {
    modalStarCtx.save();
    modalStarCtx.translate(x, y);
    modalStarCtx.rotate(rotation);
    modalStarCtx.beginPath();
    modalStarCtx.moveTo(0, -size);
    modalStarCtx.lineTo(size * 0.6, 0);
    modalStarCtx.lineTo(0, size);
    modalStarCtx.lineTo(-size * 0.6, 0);
    modalStarCtx.closePath();
    modalStarCtx.fill();
    modalStarCtx.restore();
  }

  function getPlanetScreenPos(planet) {
    const rect = planet.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function createPlanet(index, name) {
    const orbit = document.createElement('div');
    orbit.className = 'orbit';

    const isMobile = window.innerWidth < 768;
    const mobileScale = isMobile ? 0.85 : 1.3;
    const baseOrbit = isMobile ? 180 : 220;
    const orbitSize = (baseOrbit + index * orbitSizeStep) * mobileScale;
    const orbitDuration = 20 + index * orbitDurationStep;
    orbit.style.width = orbitSize + 'px';
    orbit.style.height = orbitSize + 'px';
    orbit.style.animationDuration = orbitDuration + 's';

    const planet = document.createElement('div');
    planet.className = 'planet';
    planet.setAttribute('data-index', index);
    planet.style.animationDuration = orbitDuration + 's';

    const pos = planetPositions[index % planetPositions.length];
    if (pos.top !== undefined) planet.style.top = pos.top;
    if (pos.bottom !== undefined) planet.style.bottom = pos.bottom;
    if (pos.left !== undefined) planet.style.left = pos.left;
    if (pos.right !== undefined) planet.style.right = pos.right;

    const glow = document.createElement('div');
    glow.className = 'planet-glow';
    glow.style.setProperty('--planet-color', planetColors[index % planetColors.length]);

    // 星球大小不一：默认4个星球有不同尺寸
    const planetSizes = [0.7, 1.0, 1.3, 0.85];
    const sizeScale = planetSizes[index % planetSizes.length] * (isMobile ? 0.8 : 1);
    glow.style.transform = 'scale(' + sizeScale + ')';

    const label = document.createElement('span');
    label.className = 'planet-label';
    label.textContent = name || '';

    planet.appendChild(glow);
    planet.appendChild(label);
    orbit.appendChild(planet);

    planet.addEventListener('click', function (e) {
      e.stopPropagation();
      const clickedIndex = parseInt(this.getAttribute('data-index'));
      openPlanetGallery(clickedIndex);
    });

    galaxyOrbits.appendChild(orbit);
  }

  /* ===== 漂浮图片布局 ===== */
  function calculateFloatingPositions(count, viewportW, viewportH) {
    const positions = [];
    const isMobile = viewportW < 768;
    const imgW = isMobile ? 110 : 160;
    const imgH = imgW * 4 / 3;
    const margin = isMobile ? 20 : 60;
    const usableW = viewportW - margin * 2 - imgW;
    const usableH = viewportH - margin * 2 - imgH;

    if (count === 1) {
      positions.push({
        x: viewportW / 2 - imgW / 2,
        y: viewportH / 2 - imgH / 2
      });
      return positions;
    }

    if (count === 2) {
      positions.push(
        { x: viewportW * 0.2 - imgW / 2, y: viewportH / 2 - imgH / 2 },
        { x: viewportW * 0.8 - imgW / 2, y: viewportH / 2 - imgH / 2 }
      );
      return positions;
    }

    if (count === 3) {
      positions.push(
        { x: viewportW * 0.15 - imgW / 2, y: viewportH * 0.3 - imgH / 2 },
        { x: viewportW * 0.85 - imgW / 2, y: viewportH * 0.3 - imgH / 2 },
        { x: viewportW * 0.5 - imgW / 2, y: viewportH * 0.7 - imgH / 2 }
      );
      return positions;
    }

    if (count === 4) {
      positions.push(
        { x: viewportW * 0.12 - imgW / 2, y: viewportH * 0.25 - imgH / 2 },
        { x: viewportW * 0.88 - imgW / 2, y: viewportH * 0.25 - imgH / 2 },
        { x: viewportW * 0.12 - imgW / 2, y: viewportH * 0.75 - imgH / 2 },
        { x: viewportW * 0.88 - imgW / 2, y: viewportH * 0.75 - imgH / 2 }
      );
      return positions;
    }

    if (count === 5) {
      positions.push(
        { x: viewportW * 0.1 - imgW / 2, y: viewportH * 0.25 - imgH / 2 },
        { x: viewportW * 0.5 - imgW / 2, y: viewportH * 0.12 - imgH / 2 },
        { x: viewportW * 0.9 - imgW / 2, y: viewportH * 0.25 - imgH / 2 },
        { x: viewportW * 0.25 - imgW / 2, y: viewportH * 0.78 - imgH / 2 },
        { x: viewportW * 0.75 - imgW / 2, y: viewportH * 0.78 - imgH / 2 }
      );
      return positions;
    }

    if (count === 6) {
      positions.push(
        { x: viewportW * 0.08 - imgW / 2, y: viewportH * 0.2 - imgH / 2 },
        { x: viewportW * 0.5 - imgW / 2, y: viewportH * 0.08 - imgH / 2 },
        { x: viewportW * 0.92 - imgW / 2, y: viewportH * 0.2 - imgH / 2 },
        { x: viewportW * 0.08 - imgW / 2, y: viewportH * 0.8 - imgH / 2 },
        { x: viewportW * 0.5 - imgW / 2, y: viewportH * 0.92 - imgH / 2 },
        { x: viewportW * 0.92 - imgW / 2, y: viewportH * 0.8 - imgH / 2 }
      );
      return positions;
    }

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = Math.min(usableW, usableH) * 0.42;
      positions.push({
        x: viewportW / 2 + Math.cos(angle) * radius - imgW / 2,
        y: viewportH / 2 + Math.sin(angle) * radius * 0.75 - imgH / 2
      });
    }

    return positions;
  }

  async function openPlanetGallery(planetIndex) {
    currentPlanetIndex = planetIndex;

    // 如果没有数据或该星球没有图片，显示提示
    if (!portfolioData || !portfolioData[planetIndex] || portfolioData[planetIndex].images.length === 0) {
      const planetEl = document.querySelector('.planet[data-index="' + planetIndex + '"]');
      const name = planetEl ? planetEl.querySelector('.planet-label').textContent : ('星迹 ' + String(planetIndex + 1).padStart(2, '0'));
      alert(name + ' 还没有图片，去编辑页面添加吧！');
      return;
    }

    const planet = portfolioData[planetIndex];
    const images = planet.images;

    modalLabel.textContent = planet.name || ('星迹 ' + String(planetIndex + 1).padStart(2, '0'));

    resizeModalStarCanvas();

    const planetElement = document.querySelector('.planet[data-index="' + planetIndex + '"]');
    if (planetElement) {
      const pos = getPlanetScreenPos(planetElement);
      createScatterParticles(pos.x, pos.y, 80);

      if (scatterAnimId) cancelAnimationFrame(scatterAnimId);
      scatterAnimId = requestAnimationFrame(drawScatter);
    }

    floatingContainer.innerHTML = '';
    floatingImages = [];

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const positions = calculateFloatingPositions(images.length, viewportW, viewportH);

    for (let i = 0; i < images.length; i++) {
      const imgData = images[i];
      const src = await dbGet(imgData.id);
      if (!src) continue;

      const wrapper = document.createElement('div');
      wrapper.className = 'floating-image';
      wrapper.style.left = positions[i].x + 'px';
      wrapper.style.top = positions[i].y + 'px';
      wrapper.dataset.float = ((i % 6) + 1);

      const img = document.createElement('img');
      img.src = src;
      img.alt = '旅行记录';

      const sparkle1 = document.createElement('div');
      sparkle1.className = 'star-sparkle';
      sparkle1.style.top = '10%';
      sparkle1.style.left = '15%';
      sparkle1.style.animationDelay = (Math.random() * 2) + 's';

      const sparkle2 = document.createElement('div');
      sparkle2.className = 'star-sparkle';
      sparkle2.style.top = '80%';
      sparkle2.style.right = '10%';
      sparkle2.style.animationDelay = (Math.random() * 2 + 1) + 's';

      const sparkle3 = document.createElement('div');
      sparkle3.className = 'star-sparkle';
      sparkle3.style.top = '50%';
      sparkle3.style.left = '5%';
      sparkle3.style.animationDelay = (Math.random() * 2 + 0.5) + 's';

      wrapper.appendChild(img);
      wrapper.appendChild(sparkle1);
      wrapper.appendChild(sparkle2);
      wrapper.appendChild(sparkle3);

      floatingContainer.appendChild(wrapper);
      floatingImages.push(wrapper);
    }

    galaxyModal.classList.add('active');

    floatingImages.forEach(function (el, idx) {
      setTimeout(function () {
        el.classList.add('active');
      }, 100 + idx * 150);
    });
  }

  function closeModal() {
    galaxyModal.classList.remove('active');
    if (scatterAnimId) {
      cancelAnimationFrame(scatterAnimId);
      scatterAnimId = null;
    }
    modalStarCtx.clearRect(0, 0, modalStarCanvas.width, modalStarCanvas.height);
    scatterParticles = [];

    floatingImages.forEach(function (el) {
      el.classList.remove('active');
    });

    setTimeout(function () {
      floatingContainer.innerHTML = '';
      floatingImages = [];
    }, 600);
  }

  modalClose.addEventListener('click', closeModal);
  modalBg.addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  window.addEventListener('resize', function () {
    if (galaxyModal.classList.contains('active')) {
      resizeModalStarCanvas();
    }
  });

  function renderPlanets() {
    galaxyOrbits.innerHTML = '';

    // 默认显示4个星球
    const planetCount = (portfolioData && portfolioData.length > 0) ? portfolioData.length : 4;

    for (let i = 0; i < planetCount; i++) {
      const name = (portfolioData && portfolioData[i] && portfolioData[i].name)
        ? portfolioData[i].name
        : '';
      createPlanet(i, name);
    }
  }

  const STORAGE_KEY = 'my_galaxy_data';

  function getStorageData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function loadSavedData() {
    const data = getStorageData();

    const avatarImg = document.getElementById('avatar-img');
    const avatarBase64 = await dbGet('avatar');
    if (avatarImg && avatarBase64) {
      avatarImg.src = avatarBase64;
    }

    if (data && data.portfolio && Array.isArray(data.portfolio)) {
      portfolioData = data.portfolio;
    } else {
      portfolioData = [];
    }

    renderPlanets();

    const socialIcons = document.querySelectorAll('.social-icon');
    socialIcons.forEach(function (icon) {
      const title = icon.getAttribute('title').toLowerCase();
      if (title === 'instagram' && data && data.ig_link) {
        icon.setAttribute('href', data.ig_link);
      } else if (title === 'rednote' && data && data.xhs_link) {
        icon.setAttribute('href', data.xhs_link);
      } else if (title === 'douyin' && data && data.dy_link) {
        icon.setAttribute('href', data.dy_link);
      }
    });
  }

  openDB().then(function (database) {
    db = database;
    loadSavedData();
  }).catch(function (err) {
    console.error('IndexedDB 打开失败:', err);
    loadSavedData();
  });

})();
