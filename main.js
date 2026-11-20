import * as THREE from 'three';

// ============================================================
// 초기화
// ============================================================
const canvas = document.getElementById('game');
const uiMapTitle = document.getElementById('map-title');
const uiHint = document.getElementById('hint');
const uiWinScreen = document.getElementById('win-screen');
const uiDialogueBox = document.getElementById('dialogue-box');
const uiNpcName = uiDialogueBox.querySelector('.npc-name');
const uiDialogueText = uiDialogueBox.querySelector('.dialogue-text');
const uiContinueHint = uiDialogueBox.querySelector('.continue-hint');
const uiInteractPrompt = document.getElementById('interact-prompt');
const uiDuelOverlay = document.getElementById('duel-overlay');
const uiPlayerDice = document.getElementById('player-dice');
const uiEnemyDice = document.getElementById('enemy-dice');
const uiDuelResult = document.getElementById('duel-result');
const uiDuelBtn = document.getElementById('duel-btn');
const uiHealthFill = document.getElementById('health-fill');
const uiEnemyWarning = document.getElementById('enemy-warning');
const uiBookshelfPrompt = document.getElementById('bookshelf-prompt');
const uiAttackHint = document.getElementById('attack-hint');
const uiInvSlots = document.getElementById('inv-slots');
const uiGoldCount = document.getElementById('gold-count');
const uiBookshelfUI = document.getElementById('bookshelf-ui');
const uiShelfHeld = document.getElementById('shelf-held');
const uiShelfStored = document.getElementById('shelf-stored');
const uiBookshelfClose = document.getElementById('bookshelf-close');
const uiShopUI = document.getElementById('shop-ui');
const uiShopTitle = document.getElementById('shop-title');
const uiShopItems = document.getElementById('shop-items');
const uiShopSellItems = document.getElementById('shop-sell-items');
const uiShopClose = document.getElementById('shop-close');
const uiQuestLog = document.getElementById('quest-log');
const uiQuestPopup = document.getElementById('quest-popup');
const uiQuestPopupTitle = document.getElementById('quest-popup-title');
const uiQuestPopupDesc = document.getElementById('quest-popup-desc');
const uiQuestPopupReward = document.getElementById('quest-popup-reward');
const uiQuestAccept = document.getElementById('quest-accept');
const uiQuestDecline = document.getElementById('quest-decline');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const aspect = window.innerWidth / window.innerHeight;
const viewSize = 15;
const camera = new THREE.OrthographicCamera(
  -viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 1000
);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();

// ============================================================
// 이모지 오버레이 레이어
// ============================================================
const overlayDiv = document.createElement('div');
overlayDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:hidden;';
document.body.appendChild(overlayDiv);

const emojiLabels = []; // { mesh, el, emoji }

function createEmojiLabel(mesh, emoji, offsetY = 1.5) {
  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute;
    font-size: 28px;
    pointer-events: none;
    text-shadow: 0 0 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.9);
    transform: translate(-50%, -50%);
    transition: transform 0.1s;
  `;
  el.textContent = emoji;
  overlayDiv.appendChild(el);
  emojiLabels.push({ mesh, el, offsetY });
  return el;
}

function updateEmojiLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  for (const label of emojiLabels) {
    const pos = new THREE.Vector3();
    label.mesh.getWorldPosition(pos);
    pos.y += label.offsetY;

    const projected = pos.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;

    // 화면 뒤에 있으면 숨김
    if (projected.z > 1) {
      label.el.style.display = 'none';
    } else {
      label.el.style.display = 'block';
      label.el.style.left = x + 'px';
      label.el.style.top = y + 'px';
      // 거리에 따라 크기 조절
      const dist = camera.position.distanceTo(pos);
      const scale = Math.max(0.5, Math.min(1.2, 15 / dist));
      label.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
  }
}

// ============================================================
// 프로시저럴 텍스처 생성
// ============================================================
function createCanvasTexture(width, height, drawFn) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  drawFn(ctx, width, height);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// 잔디 타일 텍스처
const grassTex = createCanvasTexture(64, 64, (ctx) => {
  ctx.fillStyle = '#3a5a2e';
  ctx.fillRect(0, 0, 64, 64);
  // 잔디 픽셀
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    ctx.fillStyle = Math.random() > 0.5 ? '#4a6a3e' : '#2a4a1e';
    ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
  }
});

// 길 텍스처
const pathTex = createCanvasTexture(64, 64, (ctx) => {
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#6a5a4a' : '#4a3a2a';
    ctx.fillRect(Math.floor(Math.random()*64), Math.floor(Math.random()*64), 3, 3);
  }
});

// 벽 텍스처
const wallTex = createCanvasTexture(64, 64, (ctx) => {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, 64, 64);
  // 벽돌 패턴
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  for (let y = 0; y < 64; y += 16) {
    const offset = (y % 32 === 0) ? 0 : 8;
    for (let x = offset; x < 64; x += 16) {
      ctx.strokeRect(x, y, 16, 16);
    }
  }
});

// 바닥 텍스처 (집)
const floorTex = createCanvasTexture(64, 64, (ctx) => {
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(0, 0, 64, 64);
  // 나무 결 패턴
  for (let y = 0; y < 64; y += 8) {
    ctx.fillStyle = y % 16 === 0 ? '#6a5a4a' : '#4a3a2a';
    ctx.fillRect(0, y, 64, 8);
  }
});

// 동굴 바닥
const caveFloorTex = createCanvasTexture(64, 64, (ctx) => {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `rgba(${30+Math.random()*20}, ${30+Math.random()*20}, ${50+Math.random()*20}, 0.5)`;
    ctx.fillRect(Math.floor(Math.random()*64), Math.floor(Math.random()*64), 2+Math.random()*3, 2+Math.random()*3);
  }
});

// ============================================================
// 색상
// ============================================================
const COLORS = {
  villageBg: new THREE.Color(0x2d3c28),
  caveBg: new THREE.Color(0x140f23),
  houseBg: new THREE.Color(0x3a2a1a),
  player: new THREE.Color(0xdcb464),
  portal: new THREE.Color(0x64c8ff),
  book: new THREE.Color(0xffd700),
  target: new THREE.Color(0xff6464),
  ink: new THREE.Color(0xa060ff),
  enemy: new THREE.Color(0x8800aa),
  gold: new THREE.Color(0xffd700),
  cafe: new THREE.Color(0xcc8844),
  bookshelf: new THREE.Color(0x654321),
  projectile: new THREE.Color(0x66ddff),
  melee: new THREE.Color(0xffaa44),
  npc: {
    hunter: new THREE.Color(0xcc4444),
    bookseller: new THREE.Color(0x44aa44),
    writer: new THREE.Color(0x8866cc),
    cafeOwner: new THREE.Color(0xcc8844),
    shopkeeper: new THREE.Color(0x88aacc),
  },
  building: {
    bookstore: 0x44aa44,
    cafe: 0xcc8844,
    general: 0x88aacc,
  }
};

// ============================================================
// 아이템 정의
// ============================================================
const ITEM_DEFS = {
  normal_book: { name: '일반 책', icon: '📕', type: 'book', damage: 10, magicDmg: 15, color: 0xcc4444, buyPrice: 20, sellPrice: 10 },
  magic_book: { name: '마법서', icon: '📗', type: 'book', damage: 15, magicDmg: 25, color: 0x44cc44, buyPrice: 50, sellPrice: 25 },
  legendary_book: { name: '전설의 책', icon: '📙', type: 'book', damage: 25, magicDmg: 40, color: 0xffd700, buyPrice: 999, sellPrice: 500 },
  ink_drop: { name: '빛나는 잉크', icon: '🫧', type: 'collectible', color: 0xa060ff, sellPrice: 5 },
  memory_piece: { name: '기억 조각', icon: '🧩', type: 'collectible', color: 0x8866cc, sellPrice: 10 },
  heal_scroll: { name: '치유 주문서', icon: '💚', type: 'consumable', heal: 30, color: 0x44ff44, buyPrice: 15, sellPrice: 7 },
  honey_bread: { name: '꿀벌빵', icon: '🍞', type: 'consumable', heal: 50, color: 0xddaa44, buyPrice: 25, sellPrice: 12 },
  ink_tea: { name: '잉크차', icon: '🍵', type: 'consumable', heal: 40, color: 0x6644aa, buyPrice: 20, sellPrice: 10 },
  page_pie: { name: '페이지 파이', icon: '🥧', type: 'consumable', heal: 60, color: 0xcc8844, buyPrice: 35, sellPrice: 18 },
};

// ============================================================
// NPC 정의
// ============================================================
const NPC_DEFS = {
  hunter: {
    name: '📖 책 사냥꾼',
    emoji: '📖',
    position: { village: [-4, 4], cave: null, house: null },
    color: COLORS.npc.hunter,
    dialogues: {
      intro: ['후후... 전설의 책을 찾고 있구나?', '그 책은 쉽게 주어지지 않아. 내 힘을 시험해봐.', '결투에서 이기면 힌트를 주지.'],
      win: ['크하하! 제법이군!', '힌트를 주마: 전설의 책은 동굴最深部에 있어.', '잉크 괴물을 물리치고 길을 열어라.'],
      lose: ['훗, 아직 부족하구나.', '다시 도전해보고 싶으면 언제든지 와.'],
      afterWin: ['이미 힌트는 줬다. 동굴 깊숙이 들어가봐.']
    }
  },
  bookseller: {
    name: '🏪 서점 주인',
    emoji: '🏪',
    position: { village: [4, -4], cave: null, house: null },
    color: COLORS.npc.bookseller,
    dialogues: {
      intro: ['어서오세요, 여행객!', '부흐링 마을 서점에 오신 걸 환영합니다.', '전설의 책이라고요? 흠...听说过 그런 책이 있죠.'],
      afterWin: ['책 사냥꾼을 이기셨다고요? 대단하세요!', '집에서 책을 관리해보세요.']
    }
  },
  writer: {
    name: '✍️ 기억을 잃은 작가',
    emoji: '✍️',
    position: { village: [-3, -5], cave: null, house: null },
    color: COLORS.npc.writer,
    dialogues: {
      intro: ['나는... 나는 누구지?', '분명 중요한 책을 쓰고 있었는데...', '전설의 책... 그걸 찾으면 기억이 돌아올지도 몰라.'],
      afterWin: ['아! 당신이 그 책을 찾았군요!', '기억이... 조금씩 돌아오는 것 같아.', '고마워요, 여행객.']
    }
  },
  cafeOwner: {
    name: '☕ 카페 주인',
    emoji: '☕',
    position: { village: [2, 5], cave: null, house: null },
    color: COLORS.npc.cafeOwner,
    dialogues: {
      intro: ['환영합니다, 여행자!', '꿈꾸는 책들의 도시 카페입니다.', '꿀벌빵, 잉크차, 페이지 파이 준비됐어요!']
    }
  },
  shopkeeper: {
    name: '🏪 잡화점 주인',
    emoji: '🏪',
    position: { village: [6, 5], cave: null, house: null },
    color: COLORS.npc.shopkeeper,
    dialogues: {
      intro: ['어서오세요!', '잡화엔 무엇이든 있어요!', '필요한 거 있으면 말하세요.']
    }
  }
};

// ============================================================
// 상점 정의
// ============================================================
const SHOP_DEFS = {
  cafe: {
    title: '☕ 꿈꾸는 책들의 도시 카페',
    buyItems: [
      { itemId: 'honey_bread', price: 25 },
      { itemId: 'ink_tea', price: 20 },
      { itemId: 'page_pie', price: 35 },
    ]
  },
  bookstore: {
    title: '📚 서점 (책 거래)',
    buyItems: [
      { itemId: 'normal_book', price: 20 },
      { itemId: 'magic_book', price: 50 },
    ],
    rareChance: 0.1,
    rareItem: { itemId: 'legendary_book', price: 500 },
  },
  generalStore: {
    title: '🏪 잡화점',
    buyItems: [
      { itemId: 'heal_scroll', price: 15 },
      { itemId: 'honey_bread', price: 25 },
      { itemId: 'ink_tea', price: 20 },
    ]
  }
};

// ============================================================
// 게임 상태
// ============================================================
let currentMap = 'village';
let gameWon = false;
let playerHP = 100;
let playerGold = 30;

let inventory = [];
let bookshelf = [];
const maxInventory = 6;

const npcStates = {};
for (const key of Object.keys(NPC_DEFS)) {
  npcStates[key] = { hasWonDuel: false, isTalking: false };
}

// 플레이어
const playerGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
const playerMat = new THREE.MeshStandardMaterial({ color: COLORS.player });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 0.8, 0);
scene.add(player);
createEmojiLabel(player, '🧑‍🎨', 1.5);

const targetMarkerGeo = new THREE.RingGeometry(0.2, 0.3, 16);
const targetMarkerMat = new THREE.MeshBasicMaterial({ color: COLORS.target, side: THREE.DoubleSide });
const targetMarker = new THREE.Mesh(targetMarkerGeo, targetMarkerMat);
targetMarker.rotation.x = -Math.PI / 2;
targetMarker.position.set(0, 0.05, 0);
targetMarker.visible = false;
scene.add(targetMarker);

let targetX = 0, targetZ = 0;
let isMoving = false;
const playerSpeed = 0.08;

// 포털
const portalGeo = new THREE.BoxGeometry(1.5, 3, 0.3);
const portalMat = new THREE.MeshStandardMaterial({ color: COLORS.portal, emissive: COLORS.portal, emissiveIntensity: 0.3 });
const villagePortal = new THREE.Mesh(portalGeo, portalMat);
const cavePortal = new THREE.Mesh(portalGeo, portalMat.clone());
const housePortal = new THREE.Mesh(portalGeo, portalMat.clone());

const bookGeo = new THREE.BoxGeometry(0.6, 0.8, 0.15);
const bookMat = new THREE.MeshStandardMaterial({ color: COLORS.book, emissive: COLORS.book, emissiveIntensity: 0.5 });
const legendaryBookObj = new THREE.Mesh(bookGeo, bookMat);

// NPC & 적 & 수집품 & 골드 & 투사체
const npcMeshes = {};
const enemyMeshes = [];
const itemMeshes = [];
const goldDrops = [];
const projectiles = [];
const meleeEffects = [];
let bookshelfFurniture = null;
let bookshelfBlocking = true;
const buildingMeshes = [];

// 보스
let bossMesh = null;
let bossActive = false;

// ============================================================
// 퀘스트 정의
// ============================================================
const MAIN_QUEST = {
  id: 'legendary_book',
  title: '📙 전설의 책을 찾아서',
  steps: [
    { id: 'talk_hunter', desc: '책 사냥꾼과 대화하고 결투에서 승리하기', check: () => npcStates.hunter.hasWonDuel },
    { id: 'enter_cave', desc: '속삭이는 동굴에 진입하기', check: () => questState.enteredCave },
    { id: 'push_bookshelf', desc: '동굴의 책장을 밀하여 길 열기', check: () => !bookshelfBlocking && currentMap === 'cave' },
    { id: 'collect_ink', desc: '빛나는 잉크 방울 3개 수집하기', check: () => (inventory.filter(s=>s.itemId==='ink_drop').reduce((a,s)=>a+s.count,0) + bookshelf.filter(s=>s.itemId==='ink_drop').reduce((a,s)=>a+s.count,0)) >= 3 },
    { id: 'defeat_boss', desc: '동굴의 잉크 보스 처치하기', check: () => questState.bossDefeated },
    { id: 'get_book', desc: '전설의 책 획득하기', check: () => inventory.some(s=>s.itemId==='legendary_book') || bookshelf.some(s=>s.itemId==='legendary_book') || gameWon },
  ],
  reward: '게임 클리어! + 200 골드',
  goldReward: 200,
};

let questState = {
  accepted: false,
  declined: false,
  enteredCave: false,
  bossDefeated: false,
  currentStep: 0,
  completed: false,
};

let pendingQuest = null; // 현재 팝업에 뜬 퀘스트

// ============================================================
// 조명
// ============================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// ============================================================
// 맵 빌더
// ============================================================
function createTileMesh(geo, tex) {
  const mat = new THREE.MeshStandardMaterial({ map: tex });
  return (x, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.1, z);
    scene.add(m);
    return m;
  };
}

function createWallMesh(geo, tex) {
  const mat = new THREE.MeshStandardMaterial({ map: tex });
  return (x, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.85, z);
    scene.add(m);
    return m;
  };
}

const tileGeo = new THREE.BoxGeometry(1, 0.2, 1);
const wallGeo = new THREE.BoxGeometry(1, 1.5, 1);
const bookshelfGeo = new THREE.BoxGeometry(2, 2.5, 0.6);

const makeTile = createTileMesh(tileGeo, grassTex);
const makePath = createTileMesh(tileGeo, pathTex);
const makeWall = createWallMesh(wallGeo, wallTex);

function clearMap() {
  emojiLabels.length = 0;
  overlayDiv.innerHTML = '';

  const toRemove = [];
  scene.traverse((child) => {
    if (child.isMesh && child !== player && child !== targetMarker) toRemove.push(child);
  });
  toRemove.forEach((m) => {
    scene.remove(m);
    m.geometry?.dispose();
    if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
    else m.material?.dispose();
  });
  Object.keys(npcMeshes).forEach(k => delete npcMeshes[k]);
  enemyMeshes.length = 0;
  itemMeshes.length = 0;
  goldDrops.length = 0;
  projectiles.length = 0;
  meleeEffects.length = 0;
  buildingMeshes.length = 0;
  bookshelfFurniture = null;
  bookshelfBlocking = true;

  // 플레이어 이모지 다시 추가
  createEmojiLabel(player, '🧑‍🎨', 1.5);
}

function createBuilding(x, z, w, h, color, label, emoji) {
  const geo = new THREE.BoxGeometry(w, h, 1);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h/2, z);
  mesh.userData = { type: 'building', label };
  scene.add(mesh);
  buildingMeshes.push(mesh);
  if (emoji) createEmojiLabel(mesh, emoji, h/2 + 0.8);
}

function createNPC(key) {
  const def = NPC_DEFS[key];
  const pos = def.position[currentMap];
  if (!pos) return;
  const geo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
  const mat = new THREE.MeshStandardMaterial({ color: def.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], 0.8, pos[1]);
  mesh.userData = { npcKey: key };
  scene.add(mesh);
  npcMeshes[key] = mesh;
  createEmojiLabel(mesh, def.emoji, 1.5);
}

function createEnemy(x, z) {
  const geo = new THREE.SphereGeometry(0.5, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.enemy, emissive: COLORS.enemy, emissiveIntensity: 0.4 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.6, z);
  mesh.userData = { type: 'enemy', hp: 3, maxHp: 3, speed: 0.02, lastAttack: 0 };
  scene.add(mesh);
  enemyMeshes.push(mesh);
  createEmojiLabel(mesh, '👾', 1);
}

function createItemDrop(x, z, itemId) {
  const def = ITEM_DEFS[itemId];
  const geo = new THREE.SphereGeometry(0.3, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.4, z);
  mesh.userData = { type: 'item', itemId, collected: false };
  scene.add(mesh);
  itemMeshes.push(mesh);
  createEmojiLabel(mesh, def.icon, 0.8);
}

function createGoldDrop(x, z, amount) {
  const geo = new THREE.SphereGeometry(0.2, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.3, z);
  mesh.userData = { type: 'gold', amount, collected: false };
  scene.add(mesh);
  goldDrops.push(mesh);
  createEmojiLabel(mesh, '💰', 0.6);
}

function createBookshelfFurniture(x, z) {
  const tex = createCanvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, 0, 64, 64);
    // 책장 선반
    for (let y = 0; y < 64; y += 16) {
      ctx.fillStyle = '#543210';
      ctx.fillRect(0, y, 64, 2);
    }
    // 책들
    const bookColors = ['#cc4444', '#44aa44', '#4444cc', '#ccaa44', '#aa44cc'];
    for (let y = 2; y < 64; y += 16) {
      let bx = 2;
      while (bx < 60) {
        const bw = 3 + Math.random() * 4;
        ctx.fillStyle = bookColors[Math.floor(Math.random() * bookColors.length)];
        ctx.fillRect(bx, y, bw, 12);
        bx += bw + 1;
      }
    }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex });
  const mesh = new THREE.Mesh(bookshelfGeo, mat);
  mesh.position.set(x, 1.35, z);
  mesh.userData = { type: 'bookshelf_furniture' };
  scene.add(mesh);
  bookshelfFurniture = mesh;
  createEmojiLabel(mesh, '📚', 2);
}

function buildVillage() {
  clearMap();
  scene.background = COLORS.villageBg;

  // 타일 매핑 함수로 교체
  for (let x = -10; x < 10; x++)
    for (let z = -10; z < 10; z++) makeTile(x, z);
  for (let x = -10; x < 10; x++) makePath(x, 0);

  [[-5,-3],[-5,-2],[-5,-1]].forEach(([x,z]) => makeWall(x, z));

  createBuilding(4, -4, 2, 1.5, COLORS.building.bookstore, 'bookstore', '📚');
  createBuilding(2, 5, 2, 1.5, COLORS.building.cafe, 'cafe', '☕');
  createBuilding(6, 5, 2, 1.5, COLORS.building.general, 'general', '🏪');

  villagePortal.position.set(8, 1.5, 0);
  scene.add(villagePortal);
  createEmojiLabel(villagePortal, '🕳️', 2);

  housePortal.position.set(-8, 1.5, 0);
  scene.add(housePortal);
  createEmojiLabel(housePortal, '🏠', 2);

  createNPC('hunter');
  createNPC('bookseller');
  createNPC('writer');
  createNPC('cafeOwner');
  createNPC('shopkeeper');

  player.position.set(0, 0.8, 0);
  uiMapTitle.textContent = '부흐링 마을 (책들의 도시)';
  uiHint.textContent = '🖱️ 이동 | Space:공격 Click:마법 | ▶동굴 ◀집 | 건물:상점';
  uiAttackHint.style.display = 'block';
  uiEnemyWarning.style.display = 'none';
  uiBookshelfPrompt.style.display = 'none';
  updateQuestUI();
}
  clearMap();
  scene.background = COLORS.caveBg;

  const caveTile = createTileMesh(tileGeo, caveFloorTex);
  for (let x = -10; x < 10; x++)
    for (let z = -10; z < 10; z++) caveTile(x, z);

  const caveWalls = [];
  for (let i = -10; i < 10; i++) caveWalls.push([i,-8],[i,8],[-8,i],[8,i]);
  const doorIdx = caveWalls.findIndex(([x,z]) => x===-8 && z===0);
  caveWalls.splice(doorIdx, 1);
  caveWalls.forEach(([x,z]) => makeWall(x, z));

  [[-4,-4],[-4,-3],[-4,-2],[0,3],[0,4],[0,5],[3,-5],[3,-4],[3,-3]]
    .forEach(([x,z]) => makeWall(x, z));

  cavePortal.position.set(-8, 1.5, 0);
  scene.add(cavePortal);
  createEmojiLabel(cavePortal, '🕳️', 2);

  createBookshelfFurniture(2, 0);
  bookshelfBlocking = true;

  createItemDrop(-3, -6, 'ink_drop');
  createItemDrop(-6, 5, 'memory_piece');
  createItemDrop(5, -6, 'ink_drop');
  createItemDrop(4, 6, 'magic_book');

  createEnemy(0, -5);
  createEnemy(5, 3);
  createEnemy(-2, 6);

  // 보스는 책장 밀기 후 등장
  // 보스 위치: 동굴 깊숙한 곳 (6, 5 근처)

  legendaryBookObj.position.set(6, 0.5, 5);
  scene.add(legendaryBookObj);
  createEmojiLabel(legendaryBookObj, '📙', 1.2);

  player.position.set(-6, 0.8, 0);
  uiMapTitle.textContent = '속삭이는 동굴 (부흐링 지하 미로)';
  uiHint.textContent = '🖱️ 이동 | Space:공격 Click:마법 | 아이템 수집!';
  uiAttackHint.style.display = 'block';
  uiEnemyWarning.style.display = 'none';
  uiBookshelfPrompt.style.display = 'none';

  // 퀘스트 상태 업데이트
  if (questState.accepted && !questState.enteredCave) {
    questState.enteredCave = true;
    checkQuestProgress();
  }
}

function buildHouse() {
  clearMap();
  scene.background = COLORS.houseBg;

  for (let x = -6; x < 6; x++)
    for (let z = -6; z < 6; z++) createTileMesh(tileGeo, floorTex)(x, z);

  for (let i = -6; i < 6; i++) {
    makeWall(i, -6);
    makeWall(i, 6);
    makeWall(-6, i);
  }
  // 문
  scene.children.forEach(c => {
    if (c.geometry === wallGeo && c.position.x === -6 && Math.abs(c.position.z) <= 1) {
      scene.remove(c);
    }
  });

  createBookshelfFurniture(0, -4);

  const tableGeo = new THREE.BoxGeometry(2, 0.8, 1);
  const tableTex = createCanvasTexture(64, 32, (ctx) => {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 64, 32);
    for (let y = 0; y < 32; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? '#7B3503' : '#9B5523';
      ctx.fillRect(0, y, 64, 4);
    }
  });
  const tableMat = new THREE.MeshStandardMaterial({ map: tableTex });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(3, 0.4, 2);
  scene.add(table);

  housePortal.position.set(-6, 1.5, 0);
  scene.add(housePortal);
  createEmojiLabel(housePortal, '🚪', 2);

  player.position.set(0, 0.8, 4);
  uiMapTitle.textContent = '🏠 내 집 (책장 관리)';
  uiHint.textContent = 'E 키로 책장 열기 | Space:공격 Click:마법';
  uiAttackHint.style.display = 'block';
  uiEnemyWarning.style.display = 'none';
  uiBookshelfPrompt.style.display = 'none';
}

// ============================================================
// UI (골드, 인벤토리, 상점, 책장)
// ============================================================
function updateHealthUI() { uiHealthFill.style.width = `${Math.max(0, playerHP)}%`; }
function updateGoldUI() { uiGoldCount.textContent = playerGold; }

// ============================================================
// 퀘스트 UI
// ============================================================
function updateQuestUI() {
  if (!questState.accepted || questState.completed) {
    uiQuestLog.innerHTML = questState.completed ? '<div class="quest-entry completed"><span class="q-title">✅ 전설의 책을 찾았다!</span></div>' : '<div style="color:#666;font-size:13px;">진행 중인 퀘스트 없음</div>';
    return;
  }
  let html = `<div class="quest-entry"><span class="q-title">${MAIN_QUEST.title}</span>`;
  for (let i = 0; i < MAIN_QUEST.steps.length; i++) {
    const step = MAIN_QUEST.steps[i];
    const done = step.check();
    const marker = done ? '✅' : (i === questState.currentStep ? '🔸' : '⬜');
    html += `<div class="q-step">${marker} ${step.desc}</div>`;
  }
  html += '</div>';
  uiQuestLog.innerHTML = html;
}

function showQuestPopup(quest) {
  pendingQuest = quest;
  uiQuestPopupTitle.textContent = quest.title;
  uiQuestPopupDesc.textContent = '전설의 책을 찾기 위한 여정. 책 사냥꾼과 결투하고, 동굴에서 보스를 물리쳐라!';
  uiQuestPopupReward.textContent = `보상: ${quest.reward}`;
  uiQuestPopup.style.display = 'block';
}

function acceptQuest() {
  if (!pendingQuest) return;
  questState.accepted = true;
  questState.currentStep = 0;
  pendingQuest = null;
  uiQuestPopup.style.display = 'none';
  updateQuestUI();
  uiHint.textContent = '📜 퀘스트 수락! 책 사냥꾼과 대화하세요.';
}

function declineQuest() {
  questState.declined = true;
  pendingQuest = null;
  uiQuestPopup.style.display = 'none';
  uiHint.textContent = '퀘스트를 거절했습니다.';
}

uiQuestAccept.addEventListener('click', acceptQuest);
uiQuestDecline.addEventListener('click', declineQuest);

function checkQuestProgress() {
  if (!questState.accepted || questState.completed) return;

  for (let i = 0; i < MAIN_QUEST.steps.length; i++) {
    if (MAIN_QUEST.steps[i].check()) {
      questState.currentStep = i + 1;
    } else {
      break;
    }
  }

  // 모든 단계 완료
  if (questState.currentStep >= MAIN_QUEST.steps.length) {
    questState.completed = true;
    playerGold += MAIN_QUEST.goldReward;
    updateGoldUI();
    gameWon = true;
  }

  updateQuestUI();
}

// ============================================================
// 보스 생성
// ============================================================
function createBoss(x, z) {
  if (bossActive) return;
  bossActive = true;

  const geo = new THREE.SphereGeometry(1.2, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaa0044,
    emissive: 0xaa0044,
    emissiveIntensity: 0.6,
  });
  bossMesh = new THREE.Mesh(geo, mat);
  bossMesh.position.set(x, 1.2, z);
  bossMesh.userData = { type: 'boss', hp: 20, maxHp: 20, speed: 0.03, lastAttack: 0, phase: 1 };
  scene.add(bossMesh);
  createEmojiLabel(bossMesh, '🐉', 2);

  uiHint.textContent = '🐉 잉크 보스가 나타났다!';
}

function updateBoss() {
  if (!bossActive || !bossMesh) return;
  if (bossMesh.userData.hp <= 0) return;

  const now = Date.now();
  const dx = player.position.x - bossMesh.position.x;
  const dz = player.position.z - bossMesh.position.z;
  const dist = Math.sqrt(dx*dx + dz*dz);

  // 추적 (위상 따라 다름)
  const speed = bossMesh.userData.phase === 2 ? bossMesh.userData.speed * 1.5 : bossMesh.userData.speed;
  if (dist < 12) {
    bossMesh.position.x += (dx/dist) * speed;
    bossMesh.position.z += (dz/dist) * speed;
  }

  // 패턴: HP 50% 이하 시 2페이즈 (빨라짐)
  if (bossMesh.userData.hp <= 10 && bossMesh.userData.phase === 1) {
    bossMesh.userData.phase = 2;
    bossMesh.material.emissiveIntensity = 1.0;
    uiHint.textContent = '🐉 보스가 격노했다! (2페이즈)';
  }

  // 공격
  if (dist < 2 && now - bossMesh.userData.lastAttack > 1500) {
    playerHP -= 20;
    bossMesh.userData.lastAttack = now;
    updateHealthUI();
    if (playerHP <= 0) {
      playerHP = 50; updateHealthUI();
      player.position.set(-6, 0.8, 0);
      uiHint.textContent = '💀 쓰러졌다... 동굴 입구에서 부활!';
      setTimeout(()=>{ uiHint.textContent = '🐉 보스와 전투 중!'; }, 3000);
    }
  }

  // 애니메이션
  bossMesh.position.y = 1.2 + Math.sin(now*0.003)*0.3;
  bossMesh.rotation.y += 0.01;
}

function defeatBoss() {
  if (!bossMesh) return;
  questState.bossDefeated = true;
  scene.remove(bossMesh);
  removeEmojiForMesh(bossMesh);
  bossActive = false;

  // 보상
  playerGold += 50;
  updateGoldUI();
  createGoldDrop(bossMesh.position.x, bossMesh.position.z, 30);
  uiHint.textContent = '🐉 보스를 처치했다! +50G';

  checkQuestProgress();
}

function updateInventoryUI() {
  uiInvSlots.innerHTML = '';
  if (inventory.length === 0) { uiInvSlots.innerHTML = '<div style="color:#666;font-size:13px;">빈 슬롯</div>'; return; }
  for (const slot of inventory) {
    const def = ITEM_DEFS[slot.itemId];
    const div = document.createElement('div');
    div.className = 'inv-slot';
    div.innerHTML = `<span class="icon">${def.icon}</span><span class="name">${def.name}</span><span class="count">x${slot.count}</span>`;
    uiInvSlots.appendChild(div);
  }
}

function addToInventory(itemId, count = 1) {
  const def = ITEM_DEFS[itemId];
  if (def.type === 'book') {
    if (inventory.find(s => s.itemId === itemId)) return false;
    if (inventory.length >= maxInventory) return false;
    inventory.push({ itemId, count: 1 });
  } else {
    const existing = inventory.find(s => s.itemId === itemId);
    if (existing) { existing.count += count; }
    else {
      if (inventory.length >= maxInventory) return false;
      inventory.push({ itemId, count });
    }
  }
  updateInventoryUI();
  return true;
}

function removeFromInventory(itemId, count = 1) {
  const idx = inventory.findIndex(s => s.itemId === itemId);
  if (idx === -1) return false;
  inventory[idx].count -= count;
  if (inventory[idx].count <= 0) inventory.splice(idx, 1);
  updateInventoryUI();
  return true;
}

function getBestBook() {
  const books = inventory.filter(s => ITEM_DEFS[s.itemId].type === 'book');
  if (books.length === 0) return null;
  return books.reduce((b, s) => ITEM_DEFS[s.itemId].magicDmg > ITEM_DEFS[b.itemId].magicDmg ? s : b);
}

function updateBookshelfUI() {
  uiShelfHeld.innerHTML = '';
  uiShelfStored.innerHTML = '';
  const books = inventory.filter(s => ITEM_DEFS[s.itemId].type === 'book');
  uiShelfHeld.innerHTML = books.length === 0 ? '<div style="color:#666;font-size:13px;">책이 없습니다</div>' :
    books.map(s => `<div class="shelf-item"><span>${ITEM_DEFS[s.itemId].icon} ${ITEM_DEFS[s.itemId].name}</span><button onclick="window._shelfStore('${s.itemId}')">꽂기</button></div>`).join('');
  uiShelfStored.innerHTML = bookshelf.length === 0 ? '<div style="color:#666;font-size:13px;">빈 책장</div>' :
    bookshelf.map(s => `<div class="shelf-item"><span>${ITEM_DEFS[s.itemId].icon} ${ITEM_DEFS[s.itemId].name} x${s.count}</span><button onclick="window._shelfTake('${s.itemId}')">꺼내기</button></div>`).join('');
}

window._shelfStore = function(id) { if (removeFromInventory(id,1)) { const e=bookshelf.find(s=>s.itemId===id); if(e) e.count++; else bookshelf.push({itemId:id,count:1}); updateBookshelfUI(); updateInventoryUI(); }};
window._shelfTake = function(id) { if (inventory.length>=maxInventory) { uiHint.textContent='🎒 인벤토리 가득!'; return; } const i=bookshelf.findIndex(s=>s.itemId===id); if(i===-1) return; bookshelf[i].count--; if(bookshelf[i].count<=0) bookshelf.splice(i,1); addToInventory(id,1); updateBookshelfUI(); updateInventoryUI(); };
uiBookshelfClose.addEventListener('click', closeBookshelfUI);

// ============================================================
// 상점
// ============================================================
let currentShop = null;
let isShopOpen = false;

function openShop(key) {
  const shop = SHOP_DEFS[key];
  if (!shop) return;
  currentShop = key;
  isShopOpen = true;
  uiShopTitle.textContent = shop.title;
  renderShopBuy();
  renderShopSell();
  uiShopUI.style.display = 'block';
}

function renderShopBuy() {
  const shop = SHOP_DEFS[currentShop];
  let html = '';
  for (const item of shop.buyItems) {
    const def = ITEM_DEFS[item.itemId];
    const canBuy = playerGold >= item.price;
    html += `<div class="shop-item"><span>${def.icon} ${def.name}</span><span class="price">💰 ${item.price}</span><button ${canBuy?'':'disabled'} onclick="window._shopBuy('${item.itemId}',${item.price})">구매</button></div>`;
  }
  if (shop.rareItem && Math.random() < shop.rareChance) {
    const r = ITEM_DEFS[shop.rareItem.itemId];
    html += `<div class="shop-item" style="border:1px solid #ffd700"><span>⭐ ${r.icon} ${r.name}</span><span class="price">💰 ${shop.rareItem.price}</span><button ${playerGold>=shop.rareItem.price?'':'disabled'} onclick="window._shopBuy('${shop.rareItem.itemId}',${shop.rareItem.price})">구매</button></div>`;
  }
  uiShopItems.innerHTML = html;
}

function renderShopSell() {
  if (inventory.length === 0) { uiShopSellItems.innerHTML = '<div style="color:#666;font-size:13px;">판매할 아이템 없음</div>'; return; }
  uiShopSellItems.innerHTML = inventory.map(s => {
    const def = ITEM_DEFS[s.itemId];
    const p = def.sellPrice || 1;
    return `<div class="shop-item"><span>${def.icon} ${def.name} x${s.count}</span><span class="price">+💰 ${p}</span><button onclick="window._shopSell('${s.itemId}')">판매</button></div>`;
  }).join('');
}

window._shopBuy = function(id, price) {
  if (playerGold < price) return;
  if (inventory.length >= maxInventory && !inventory.find(s=>s.itemId===id)) { uiHint.textContent='🎒 인벤토리 가득!'; return; }
  playerGold -= price;
  addToInventory(id, 1);
  updateGoldUI(); renderShopBuy(); renderShopSell();
  uiHint.textContent = `${ITEM_DEFS[id].icon} ${ITEM_DEFS[id].name} 구매!`;
};

window._shopSell = function(id) {
  const def = ITEM_DEFS[id];
  const p = def.sellPrice || 1;
  if (removeFromInventory(id, 1)) { playerGold += p; updateGoldUI(); renderShopBuy(); renderShopSell(); uiHint.textContent = `${def.icon} ${def.name} 판매! +💰${p}`; }
};

function closeShop() { isShopOpen = false; currentShop = null; uiShopUI.style.display = 'none'; }
uiShopClose.addEventListener('click', closeShop);

// ============================================================
// 카메라
// ============================================================
function updateCamera() {
  const camOffset = new THREE.Vector3(20, 20, 20);
  const target = player.position.clone().add(camOffset);
  camera.position.lerp(target, 0.1);
  camera.lookAt(player.position);
}

// ============================================================
// 충돌
// ============================================================
function getCollidables() {
  const collidables = [];
  scene.traverse((child) => {
    if (child.isMesh && child !== player && child !== targetMarker) {
      const isWall = child.geometry === wallGeo;
      const isPortal = child === villagePortal || child === cavePortal || child === housePortal;
      const isNPC = Object.values(npcMeshes).includes(child);
      const isBS = child === bookshelfFurniture && bookshelfBlocking;
      const isBld = child.userData?.type === 'building';
      if (isWall || isPortal || isNPC || isBS || isBld) collidables.push(child);
    }
  });
  return collidables;
}

function checkCollision(x, z) {
  const pb = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, player.position.y, z), new THREE.Vector3(0.8, 1.6, 0.8));
  for (const obj of getCollidables()) if (pb.intersectsBox(new THREE.Box3().setFromObject(obj))) return true;
  return false;
}

// ============================================================
// NPC & 건물 근접
// ============================================================
let nearNpcKey = null;
let nearBuilding = null;
function checkNearNPC() { nearNpcKey = null; for (const [k,m] of Object.entries(npcMeshes)) if (player.position.distanceTo(m.position)<2) { nearNpcKey=k; return; } }
function checkNearBuilding() { nearBuilding = null; for (const b of buildingMeshes) if (player.position.distanceTo(b.position)<2) { nearBuilding=b.userData.label; return; } }

let nearBookshelfFurniture = false;
function checkNearBookshelfFurniture() { nearBookshelfFurniture = false; if (bookshelfFurniture && currentMap==='house' && player.position.distanceTo(bookshelfFurniture.position)<2.5) nearBookshelfFurniture=true; }

// ============================================================
// 대화 & 결투
// ============================================================
let dialogueQueue = [];
let dialogueLineIndex = 0;
let isDialogueActive = false;
let typingTimer = null;
let isTyping = false;

function getDialogueLines(key) {
  const def = NPC_DEFS[key];
  if (key==='hunter' && npcStates.hunter.hasWonDuel) return def.dialogues.afterWin;
  if ((key==='bookseller'||key==='writer') && npcStates.hunter.hasWonDuel) return def.dialogues.afterWin;
  return def.dialogues.intro;
}

function startDialogue(key) {
  if (isDialogueActive || isBookshelfOpen || isShopOpen) return;
  isDialogueActive = true;
  npcStates[key].isTalking = true;
  dialogueQueue = getDialogueLines(key);
  dialogueLineIndex = 0;
  showCurrentDialogueLine(key);
  uiDialogueBox.style.display = 'block';
  uiInteractPrompt.style.display = 'none';
}

function showCurrentDialogueLine(key) {
  if (dialogueLineIndex >= dialogueQueue.length) { endDialogue(key); return; }
  const def = NPC_DEFS[key];
  uiNpcName.textContent = def.name;
  const text = dialogueQueue[dialogueLineIndex];
  let ci = 0;
  uiDialogueText.innerHTML = '';
  isTyping = true;
  uiContinueHint.textContent = '';
  if (typingTimer) clearInterval(typingTimer);
  typingTimer = setInterval(() => {
    if (ci < text.length) { uiDialogueText.innerHTML = text.substring(0,ci+1)+'<span class="cursor">▌</span>'; ci++; }
    else { clearInterval(typingTimer); isTyping = false; uiContinueHint.textContent = dialogueLineIndex<dialogueQueue.length-1?'E 키: 다음':'E 키: 닫기'; }
  }, 40);
}

function advanceDialogue(key) {
  if (isTyping) { clearInterval(typingTimer); isTyping=false; uiDialogueText.innerHTML=dialogueQueue[dialogueLineIndex]; uiContinueHint.textContent=dialogueLineIndex<dialogueQueue.length-1?'E 키: 다음':'E 키: 닫기'; return; }
  if (dialogueLineIndex < dialogueQueue.length-1) { dialogueLineIndex++; showCurrentDialogueLine(key); }
  else endDialogue(key);
}

function endDialogue(key) {
  isDialogueActive = false;
  npcStates[key].isTalking = false;
  uiDialogueBox.style.display = 'none';
  if (typingTimer) clearInterval(typingTimer);
  if (key==='hunter' && !npcStates.hunter.hasWonDuel) startDuel();
  // 퀘스트 제안: 결투 승리 후
  if (key==='hunter' && npcStates.hunter.hasWonDuel && !questState.accepted && !questState.declined) {
    setTimeout(() => showQuestPopup(MAIN_QUEST), 1000);
  }
}

let duelActive = false;
function startDuel() {
  duelActive = true;
  uiDuelOverlay.style.display = 'flex';
  uiPlayerDice.textContent = '?'; uiEnemyDice.textContent = '?';
  uiDuelResult.textContent = ''; uiDuelResult.className = '';
  uiDuelBtn.disabled = false; uiDuelBtn.textContent = '주사위 굴리기!';
}

function rollDuelDice() {
  uiDuelBtn.disabled = true;
  uiPlayerDice.textContent = '...'; uiEnemyDice.textContent = '...';
  uiDuelResult.textContent = '';
  let rc = 0;
  const ri = setInterval(() => {
    uiPlayerDice.textContent = Math.floor(Math.random()*6)+1;
    uiEnemyDice.textContent = Math.floor(Math.random()*6)+1;
    uiPlayerDice.classList.add('rolling'); uiEnemyDice.classList.add('rolling');
    rc++;
    if (rc >= 15) {
      clearInterval(ri);
      uiPlayerDice.classList.remove('rolling'); uiEnemyDice.classList.remove('rolling');
      const pr = Math.floor(Math.random()*6)+1;
      const er = Math.floor(Math.random()*6)+1;
      uiPlayerDice.textContent = pr; uiEnemyDice.textContent = er;
      if (pr>er) { uiDuelResult.textContent='승리! 🎉'; uiDuelResult.className='win'; npcStates.hunter.hasWonDuel=true; }
      else if (pr<er) { uiDuelResult.textContent='패배... 💀'; uiDuelResult.className='lose'; }
      else { uiDuelResult.textContent='무승부! 다시!'; uiDuelResult.className=''; }
      uiDuelBtn.disabled = false;
      uiDuelBtn.textContent = (pr<er) ? '다시 도전!' : '닫기';
    }
  }, 80);
}

function closeDuel() {
  duelActive = false;
  uiDuelOverlay.style.display = 'none';
  const lines = npcStates.hunter.hasWonDuel ? NPC_DEFS.hunter.dialogues.win : NPC_DEFS.hunter.dialogues.lose;
  dialogueQueue = lines; dialogueLineIndex = 0;
  isDialogueActive = true; npcStates.hunter.isTalking = true;
  uiDialogueBox.style.display = 'block';
  showCurrentDialogueLine('hunter');
}

uiDuelBtn.addEventListener('click', () => { if (npcStates.hunter.hasWonDuel || uiDuelBtn.textContent==='닫기') closeDuel(); else rollDuelDice(); });

// ============================================================
// 책장 UI
// ============================================================
let isBookshelfOpen = false;
function openBookshelfUI() { if (!nearBookshelfFurniture) return; isBookshelfOpen=true; updateBookshelfUI(); uiBookshelfUI.style.display='block'; }
function closeBookshelfUI() { isBookshelfOpen=false; uiBookshelfUI.style.display='none'; }

// ============================================================
// 전투
// ============================================================
function meleeAttack() {
  const book = getBestBook();
  const dmg = book ? ITEM_DEFS[book.itemId].damage : 5;
  const geo = new THREE.RingGeometry(0.5, 1.2, 16);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.melee, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(player.position);
  mesh.position.y = 0.8;
  mesh.rotation.x = -Math.PI/2;
  mesh.userData = { life: 15 };
  scene.add(mesh);
  meleeEffects.push(mesh);

  // 적 데미지
  for (const e of enemyMeshes) {
    if (e.userData.hp<=0) continue;
    if (player.position.distanceTo(e.position)<2) {
      e.userData.hp -= dmg;
      if (e.userData.hp<=0) { dropEnemyLoot(e); scene.remove(e); removeEmojiForMesh(e); }
    }
  }
  // 보스 데미지
  if (bossActive && bossMesh && bossMesh.userData.hp > 0) {
    if (player.position.distanceTo(bossMesh.position) < 2.5) {
      bossMesh.userData.hp -= dmg;
      if (bossMesh.userData.hp <= 0) defeatBoss();
    }
  }
}

function shootProjectile() {
  if (isDialogueActive||duelActive||isBookshelfOpen||isShopOpen) return;
  const book = getBestBook();
  const dmg = book ? ITEM_DEFS[book.itemId].magicDmg : 5;
  const dx = targetX-player.position.x;
  const dz = targetZ-player.position.z;
  const dist = Math.sqrt(dx*dx+dz*dz);
  if (dist<0.5) return;
  const dir = new THREE.Vector3(dx/dist,0,dz/dist);
  const geo = new THREE.SphereGeometry(0.2,8,8);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.projectile, transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(player.position);
  mesh.position.y = 1;
  mesh.userData = { dir, speed: 0.2, damage: dmg, life: 60 };
  scene.add(mesh);
  projectiles.push(mesh);
}

function updateProjectiles() {
  for (let i=projectiles.length-1; i>=0; i--) {
    const p = projectiles[i];
    p.position.x += p.userData.dir.x * p.userData.speed;
    p.position.z += p.userData.dir.z * p.userData.speed;
    p.userData.life--;
    let hit = false;
    for (const e of enemyMeshes) {
      if (e.userData.hp<=0) continue;
      if (p.position.distanceTo(e.position)<1) {
        e.userData.hp -= p.userData.damage;
        hit = true;
        if (e.userData.hp<=0) { dropEnemyLoot(e); scene.remove(e); removeEmojiForMesh(e); }
        break;
      }
    }
    // 보스 명중 체크
    if (!hit && bossActive && bossMesh && bossMesh.userData.hp > 0) {
      if (p.position.distanceTo(bossMesh.position) < 1.5) {
        bossMesh.userData.hp -= p.userData.damage;
        hit = true;
        if (bossMesh.userData.hp <= 0) defeatBoss();
      }
    }
    if (hit || p.userData.life<=0) { scene.remove(p); projectiles.splice(i,1); }
  }
}

function updateMeleeEffects() {
  for (let i=meleeEffects.length-1; i>=0; i--) {
    const m = meleeEffects[i];
    m.userData.life--;
    m.material.opacity = m.userData.life/15;
    m.scale.multiplyScalar(1.05);
    if (m.userData.life<=0) { scene.remove(m); meleeEffects.splice(i,1); }
  }
}

function dropEnemyLoot(enemy) {
  const goldAmount = Math.floor(Math.random()*10)+5;
  createGoldDrop(enemy.position.x, enemy.position.z, goldAmount);
  const drops = ['ink_drop','memory_piece','heal_scroll'];
  createItemDrop(enemy.position.x+(Math.random()-0.5)*2, enemy.position.z+(Math.random()-0.5)*2, drops[Math.floor(Math.random()*drops.length)]);
}

function removeEmojiForMesh(mesh) {
  const idx = emojiLabels.findIndex(l => l.mesh === mesh);
  if (idx !== -1) {
    const label = emojiLabels[idx];
    label.el.remove();
    emojiLabels.splice(idx, 1);
  }
}

// ============================================================
// 적 AI
// ============================================================
function updateEnemies() {
  const now = Date.now();
  let nearestDist = Infinity;
  for (const e of enemyMeshes) {
    if (e.userData.hp<=0) continue;
    const dx = player.position.x-e.position.x;
    const dz = player.position.z-e.position.z;
    const dist = Math.sqrt(dx*dx+dz*dz);
    if (dist<nearestDist) nearestDist=dist;
    if (dist<8) { e.position.x+=(dx/dist)*e.userData.speed; e.position.z+=(dz/dist)*e.userData.speed; }
    if (dist<1 && now-e.userData.lastAttack>2000) {
      playerHP -= 15;
      e.userData.lastAttack = now;
      updateHealthUI();
      if (playerHP<=0) {
        playerHP=50; updateHealthUI();
        player.position.set(-6,0.8,0); targetX=-6; targetZ=0;
        uiHint.textContent='💀 쓰러졌다... 동굴 입구에서 부활!';
        setTimeout(()=>{uiHint.textContent='🖱️ 이동 | Space:공격 Click:마법';},3000);
      }
    }
    e.position.y = 0.6+Math.sin(now*0.005+e.position.x*2)*0.15;
  }
  uiEnemyWarning.style.display = (nearestDist<3&&currentMap==='cave') ? 'block' : 'none';
}

// ============================================================
// 수집
// ============================================================
function checkItemCollection() {
  for (const item of itemMeshes) {
    if (item.userData.collected) continue;
    if (player.position.distanceTo(item.position)<1.2) {
      const itemId = item.userData.itemId;
      const def = ITEM_DEFS[itemId];
      if (def.type==='consumable'&&def.heal) {
        playerHP=Math.min(100,playerHP+def.heal); updateHealthUI();
        uiHint.textContent=`${def.icon} ${def.name} 사용! HP +${def.heal}`;
      } else if (def.type==='book') {
        if (!addToInventory(itemId)) { uiHint.textContent='🎒 인벤토리 가득!'; return; }
        uiHint.textContent=`${def.icon} ${def.name} 획득!`;
      } else {
        if (!addToInventory(itemId)) { uiHint.textContent='🎒 인벤토리 가득!'; return; }
        uiHint.textContent=`${def.icon} ${def.name} 획득!`;
      }
      item.userData.collected = true;
      scene.remove(item);
      removeEmojiForMesh(item);
      updateInventoryUI();
      if (itemId==='legendary_book') gameWon=true;
    }
  }
  for (const g of goldDrops) {
    if (g.userData.collected) continue;
    if (player.position.distanceTo(g.position)<1.2) {
      playerGold += g.userData.amount;
      g.userData.collected = true;
      scene.remove(g);
      removeEmojiForMesh(g);
      updateGoldUI();
      uiHint.textContent=`💰 ${g.userData.amount} 골드 획득!`;
    }
  }
}

// ============================================================
// 책장 밀기
// ============================================================
function pushBookshelf() {
  if (currentMap!=='cave'||!bookshelfFurniture||!bookshelfBlocking) return;
  if (player.position.distanceTo(bookshelfFurniture.position)>=2) return;
  bookshelfBlocking=false;
  bookshelfFurniture.position.x+=3;
  uiHint.textContent='📚 책장을 밀었다! 길이 열렸다!';

  // 퀘스트 체크
  if (questState.accepted) checkQuestProgress();

  // 보스 등장
  setTimeout(() => {
    if (currentMap === 'cave' && questState.accepted) {
      createBoss(6, 4);
    }
  }, 1500);

  setTimeout(()=>{uiHint.textContent='🖱️ 이동 | Space:공격 Click:마법';},3000);
}

// ============================================================
// 이벤트
// ============================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0),0);

canvas.addEventListener('click', (event) => {
  if (gameWon||isDialogueActive||duelActive||isBookshelfOpen||isShopOpen) return;
  mouse.x=(event.clientX/window.innerWidth)*2-1;
  mouse.y=-(event.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const target=new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane,target);
  if (target) {
    targetX=target.x; targetZ=target.z;
    isMoving=true;
    targetMarker.position.set(targetX,0.05,targetZ);
    targetMarker.visible=true;
    shootProjectile();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key==='e'||event.key==='E') {
    if (isShopOpen) { closeShop(); return; }
    if (isBookshelfOpen) { closeBookshelfUI(); return; }
    if (isDialogueActive&&nearNpcKey) { advanceDialogue(nearNpcKey); return; }
    if (nearBookshelfFurniture&&currentMap==='house') { openBookshelfUI(); return; }
    if (nearBuilding) { openShop(nearBuilding); return; }
    if (nearNpcKey&&!isDialogueActive&&!duelActive) { startDialogue(nearNpcKey); return; }
  }
  if (event.key===' ') {
    event.preventDefault();
    if (!isDialogueActive&&!duelActive&&!isBookshelfOpen&&!isShopOpen) {
      if (currentMap==='cave') pushBookshelf();
      else meleeAttack();
    }
  }
});

window.addEventListener('resize', () => {
  const aspect=window.innerWidth/window.innerHeight;
  camera.left=-viewSize*aspect; camera.right=viewSize*aspect;
  camera.top=viewSize; camera.bottom=-viewSize;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});

// ============================================================
// 메인 루프
// ============================================================
buildVillage();
updateHealthUI(); updateGoldUI(); updateInventoryUI();

function animate() {
  requestAnimationFrame(animate);
  if (gameWon) { uiWinScreen.classList.remove('hidden'); renderer.render(scene,camera); return; }

  if (isMoving&&!isDialogueActive&&!duelActive&&!isBookshelfOpen&&!isShopOpen) {
    const dx=targetX-player.position.x;
    const dz=targetZ-player.position.z;
    const dist=Math.sqrt(dx*dx+dz*dz);
    if (dist<0.1) { player.position.x=targetX; player.position.z=targetZ; isMoving=false; targetMarker.visible=false; }
    else {
      const mx=(dx/dist)*playerSpeed;
      const mz=(dz/dist)*playerSpeed;
      if (!checkCollision(player.position.x+mx,player.position.z+mz)) { player.position.x+=mx; player.position.z+=mz; }
      else { isMoving=false; targetMarker.visible=false; }
    }
  }

  if (!isDialogueActive&&!duelActive&&!isBookshelfOpen&&!isShopOpen) {
    if (currentMap==='village') { checkNearNPC(); checkNearBuilding(); uiInteractPrompt.style.display=(nearNpcKey||nearBuilding)?'block':'none'; }
  }

  if (currentMap==='cave') {
    updateEnemies();
    checkItemCollection();
    updateProjectiles();
    updateMeleeEffects();
    updateBoss();
    checkQuestProgress();
  }
  if (currentMap==='house') { checkNearBookshelfFurniture(); uiBookshelfPrompt.style.display=nearBookshelfFurniture?'block':'none'; }

  if (currentMap==='village') {
    if (player.position.distanceTo(villagePortal.position)<1.5) { currentMap='cave'; buildCave(); }
    if (player.position.distanceTo(housePortal.position)<1.5) { currentMap='house'; buildHouse(); }
  } else if (currentMap==='cave') {
    if (player.position.distanceTo(cavePortal.position)<1.5) { currentMap='village'; buildVillage(); }
    if (player.position.distanceTo(legendaryBookObj.position)<1&&!legendaryBookObj.userData.collected) {
      // 보스를 처치해야만 획득 가능
      if (questState.bossDefeated) {
        legendaryBookObj.userData.collected=true;
        scene.remove(legendaryBookObj);
        removeEmojiForMesh(legendaryBookObj);
        addToInventory('legendary_book');
        uiHint.textContent='📙 전설의 책을 획득했다!';
        checkQuestProgress();
      } else {
        uiHint.textContent='🔒 보스를 먼저 물리쳐야 전설의 책을 얻을 수 있다!';
      }
    }
  } else if (currentMap==='house') {
    if (player.position.distanceTo(housePortal.position)<1.5) { currentMap='village'; buildVillage(); }
  }

  if (currentMap==='cave'&&!legendaryBookObj.userData.collected) {
    legendaryBookObj.rotation.y+=0.02;
    legendaryBookObj.position.y=0.5+Math.sin(Date.now()*0.003)*0.2;
  }

  for (const m of Object.values(npcMeshes)) m.position.y=0.8+Math.sin(Date.now()*0.002+m.position.x)*0.1;
  for (const item of itemMeshes) if (!item.userData.collected) item.position.y=0.4+Math.sin(Date.now()*0.004+item.position.x)*0.15;
  for (const g of goldDrops) if (!g.userData.collected) g.position.y=0.3+Math.sin(Date.now()*0.005+g.position.x)*0.1;

  updateEmojiLabels();
  updateCamera();
  renderer.render(scene, camera);
}

animate();
