(function () {
  'use strict';

  /* ===== 星空背景 ===== */
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let scrollY = 0;
  let width, height;

  function resizeCanvas() {
    width = canvas.width = 480;
    height = canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    const count = Math.floor((width * height) / 4000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 3,
        size: Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3,
        layer: Math.floor(Math.random() * 3),
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: 0.3 + Math.random() * 0.5,
      });
    }
  }

  function drawStars(time) {
    ctx.clearRect(0, 0, width, height);
    const parallaxFactors = [0.1, 0.25, 0.45];
    const colors = ['#ffffff', '#ccddff', '#aaccff', '#88ccff'];

    stars.forEach(function (star) {
      const factor = parallaxFactors[star.layer];
      const offsetY = (scrollY * factor) % (height * 3);
      let y = star.y - offsetY;
      if (y < -10) y += height * 3;

      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.brightness * twinkle;

      ctx.fillStyle = colors[star.layer];
      ctx.globalAlpha = alpha;

      const px = Math.round(star.x);
      const py = Math.round(y);
      ctx.fillRect(px, py, star.size, star.size);
    });
    ctx.globalAlpha = 1;
  }

  function animateStars(timestamp) {
    drawStars(timestamp);
    requestAnimationFrame(animateStars);
  }

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(animateStars);

  /* ===== IndexedDB 存储 ===== */
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

  function dbPut(id, data) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id: id, data: data });
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error); };
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

  function dbDelete(id) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /* ===== localStorage 存元数据（不含图片） ===== */
  const STORAGE_KEY = 'my_galaxy_data';

  function getStorageData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveStorageData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function fileToBase64(file) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }

  /* ===== 头像上传 ===== */
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('avatar-preview');

  avatarInput.addEventListener('change', async function () {
    const file = avatarInput.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    avatarPreview.src = base64;
    await dbPut('avatar', base64);
  });

  /* ===== 动态星球编辑 ===== */
  const planetGrid = document.getElementById('planet-upload-grid');
  const addPlanetBtn = document.getElementById('add-planet-btn');
  const hiddenFileInput = document.getElementById('hidden-file-input');
  const previewModal = document.getElementById('image-preview-modal');
  const previewImage = document.getElementById('preview-image');
  const previewCloseBtn = document.getElementById('preview-close-btn');
  const previewDeleteBtn = document.getElementById('preview-delete-btn');

  let portfolioData = [];
  let nextImageId = 0;
  let currentPlanet = 0;
  let currentImageId = null;

  // 渲染所有星球卡片
  function renderPlanetCards() {
    planetGrid.innerHTML = '';

    portfolioData.forEach(function (planet, index) {
      const card = document.createElement('div');
      card.className = 'planet-upload-card';
      card.dataset.planet = index;

      const header = document.createElement('div');
      header.className = 'planet-upload-header';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'planet-name-input';
      nameInput.value = planet.name || ('星迹 ' + String(index + 1).padStart(2, '0'));
      nameInput.placeholder = '星球名称';
      nameInput.dataset.planet = index;

      nameInput.addEventListener('change', function () {
        portfolioData[index].name = this.value.trim();
        saveAllPortfolio();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-planet-btn';
      deleteBtn.textContent = '删除';
      deleteBtn.dataset.planet = index;

      header.appendChild(nameInput);
      header.appendChild(deleteBtn);

      const imagesContainer = document.createElement('div');
      imagesContainer.className = 'planet-images';
      imagesContainer.dataset.planet = index;

      // 渲染已有图片
      planet.images.forEach(function (imgData) {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.planet = index;
        item.dataset.id = imgData.id;

        const img = document.createElement('img');
        img.dataset.src = imgData.id;
        img.alt = '图片';
        img.loading = 'lazy';

        item.appendChild(img);
        imagesContainer.appendChild(item);

        // 异步加载图片
        dbGet(imgData.id).then(function (base64) {
          if (base64) img.src = base64;
        });

        item.addEventListener('click', function () {
          currentPlanet = index;
          currentImageId = imgData.id;
          dbGet(imgData.id).then(function (base64) {
            if (base64) {
              previewImage.src = base64;
              previewModal.classList.add('active');
            }
          });
        });
      });

      // 添加图片按钮
      const addBtn = document.createElement('div');
      addBtn.className = 'image-item add-planet-image';
      addBtn.dataset.planet = index;
      addBtn.innerHTML = '<span>+</span>';
      imagesContainer.appendChild(addBtn);

      card.appendChild(header);
      card.appendChild(imagesContainer);
      planetGrid.appendChild(card);
    });
  }

  // 添加星球
  addPlanetBtn.addEventListener('click', function () {
    const newIndex = portfolioData.length;
    portfolioData.push({
      planet: newIndex,
      name: '',
      images: []
    });
    renderPlanetCards();
    saveAllPortfolio();
  });

  // 删除星球
  planetGrid.addEventListener('click', async function (e) {
    if (e.target.classList.contains('delete-planet-btn')) {
      const index = parseInt(e.target.dataset.planet);
      if (!confirm('确定要删除这个星球及其所有图片吗？')) return;

      // 删除所有图片数据
      for (const img of portfolioData[index].images) {
        await dbDelete(img.id);
      }

      portfolioData.splice(index, 1);

      // 重新编号
      portfolioData.forEach(function (p, i) {
        p.planet = i;
      });

      renderPlanetCards();
      saveAllPortfolio();
    }
  });

  // 添加图片按钮点击
  planetGrid.addEventListener('click', function (e) {
    const addBtn = e.target.closest('.add-planet-image');
    if (addBtn) {
      const planetIndex = parseInt(addBtn.dataset.planet);
      currentPlanet = planetIndex;
      hiddenFileInput.dataset.planet = planetIndex;
      hiddenFileInput.click();
    }
  });

  // 文件选择处理（支持多选）
  hiddenFileInput.addEventListener('change', async function () {
    const files = hiddenFileInput.files;
    if (!files || files.length === 0) return;

    const planetIndex = parseInt(this.dataset.planet);

    for (let i = 0; i < files.length; i++) {
      const base64 = await fileToBase64(files[i]);
      const imageId = 'img_' + nextImageId++;
      portfolioData[planetIndex].images.push({ id: imageId, planet: planetIndex });
      await dbPut(imageId, base64);
    }

    renderPlanetCards();
    saveAllPortfolio();

    hiddenFileInput.value = '';
  });

  // 关闭预览
  previewCloseBtn.addEventListener('click', function () {
    previewModal.classList.remove('active');
  });

  previewModal.querySelector('.preview-modal-bg').addEventListener('click', function () {
    previewModal.classList.remove('active');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      previewModal.classList.remove('active');
    }
  });

  // 删除图片
  previewDeleteBtn.addEventListener('click', async function () {
    if (!currentImageId) return;

    const planetImages = portfolioData[currentPlanet].images;
    const idx = planetImages.findIndex(function (img) { return img.id === currentImageId; });

    if (idx !== -1) {
      const imgId = planetImages[idx].id;
      planetImages.splice(idx, 1);
      await dbDelete(imgId);
      renderPlanetCards();
      saveAllPortfolio();
      previewModal.classList.remove('active');
    }
  });

  // 保存所有星球图片元数据到 localStorage
  function saveAllPortfolio() {
    const data = getStorageData() || {};
    data.portfolio = portfolioData;
    saveStorageData(data);
  }

  /* ===== 社交链接 ===== */
  const igInput = document.getElementById('ig-link');
  const xhsInput = document.getElementById('xhs-link');
  const dyInput = document.getElementById('dy-link');

  igInput.addEventListener('input', function () {
    saveSetting('ig_link', igInput.value);
  });
  xhsInput.addEventListener('input', function () {
    saveSetting('xhs_link', xhsInput.value);
  });
  dyInput.addEventListener('input', function () {
    saveSetting('dy_link', dyInput.value);
  });

  function saveSetting(key, value) {
    const data = getStorageData() || {};
    data[key] = value;
    saveStorageData(data);
  }

  /* ===== 加载已保存数据 ===== */
  async function loadSavedData() {
    const data = getStorageData();
    if (!data) return;

    if (data.avatar) {
      const avatarBase64 = await dbGet('avatar');
      if (avatarBase64) avatarPreview.src = avatarBase64;
    }

    if (data.ig_link) igInput.value = data.ig_link;
    if (data.xhs_link) xhsInput.value = data.xhs_link;
    if (data.dy_link) dyInput.value = data.dy_link;
  }

  async function loadSavedPortfolio() {
    const data = getStorageData();

    if (data && data.portfolio && Array.isArray(data.portfolio)) {
      portfolioData = data.portfolio;
      portfolioData.forEach(function (planet) {
        planet.images.forEach(function (img) {
          if (typeof img.id === 'string' && img.id.startsWith('img_')) {
            const num = parseInt(img.id.replace('img_', ''));
            if (num >= nextImageId) nextImageId = num + 1;
          }
        });
      });
    } else {
      portfolioData = [];
    }

    renderPlanetCards();
  }

  /* ===== 保存按钮 ===== */
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');

  saveBtn.addEventListener('click', async function () {
    saveAllPortfolio();

    const avatarBase64 = await dbGet('avatar');
    if (!avatarBase64) {
      const data = getStorageData() || {};
      delete data.avatar;
      saveStorageData(data);
    }

    saveSetting('ig_link', igInput.value);
    saveSetting('xhs_link', xhsInput.value);
    saveSetting('dy_link', dyInput.value);

    saveStatus.textContent = '已保存！正在前往分享页面...';
    saveStatus.style.color = '#88ff88';

    setTimeout(function () {
      window.location.href = 'index.html';
    }, 800);
  });

  /* ===== 初始化 ===== */
  openDB().then(function (database) {
    db = database;
    loadSavedData();
    loadSavedPortfolio();
  }).catch(function (err) {
    console.error('IndexedDB 打开失败:', err);
  });

})();
