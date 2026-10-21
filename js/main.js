import Game from './Game.js';
import Player from './Player.js';

const canvas = document.querySelector('#game');

const ui = {
  score: document.querySelector('#score'),
  lives: document.querySelector('#lives'),
  wave: document.querySelector('#wave'),
  high: document.querySelector('#high'),
  money: document.querySelector('#money'),
  bombs: document.querySelector('#bombs'),
  weapon: document.querySelector('#weapon') || { textContent: '' },
  bossHud: document.querySelector('#bossHud') || { hidden: true },
  bossFill: document.querySelector('#bossFill') || { style: {} },
};

const g = new Game(canvas, ui);

const overlay = document.querySelector('#overlay');
const title = document.querySelector('#title');
const message = document.querySelector('#message');
const start = document.querySelector('#start');
const mode = document.querySelector('#mode');
const resume = document.querySelector('#resume');
const restart = document.querySelector('#restart');
const menuBtn = document.querySelector('#menu');
const shopMoney = document.querySelector('#shopMoney');
const skins = [...document.querySelectorAll('.skin')];

const SKIN_INFO = {
  cyan: { name: 'Неон', cost: 0 },
  violet: { name: 'Плазма', cost: 5 },
  gold: { name: 'Солнце', cost: 7 },
  coral: { name: 'Коралл', cost: 9 },
  lime: { name: 'Лайм', cost: 11 },
  rose: { name: 'Розовый кварц', cost: 13 },
};

// Превью — через «фантомного» игрока, реальный g.player не трогаем.
function drawPreviews() {
  skins.forEach((button) => {
    const cv = button.querySelector('canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);

    const phantom = { g: { skin: button.dataset.skin } };
    Player.prototype.render.call(ctx ? phantom : phantom, ctx, cv.width / 2, cv.height / 2, 1.4);
  });
}

function labelFor(skin) {
  const info = SKIN_INFO[skin] || { name: skin, cost: 0 };
  const equipped = skin === g.skin;
  const owned = g.isOwned(skin);

  if (equipped) return '✓ Выбрано · ' + info.name;
  if (owned) return 'Надеть · ' + info.name;
  return info.name + ' · ' + info.cost;
}

function sync() {
  const end = g.state === 'win' || g.state === 'lose';
  const menu = g.state === 'menu';
  const playing = g.state === 'playing';
  const paused = g.state === 'paused';

  overlay.style.display = playing ? 'none' : 'flex';

  start.hidden = !menu;
  mode.hidden = !menu;
  menuBtn.hidden = !(playing || paused || end);
  resume.hidden = !paused;
  restart.hidden = !end;

  shopMoney.textContent = g.wallet;

  skins.forEach((b) => {
    const skin = b.dataset.skin;
    const equipped = skin === g.skin;
    const owned = g.isOwned(skin);
    b.classList.toggle('active', equipped);
    b.classList.toggle('owned', owned && !equipped);
    const label = b.querySelector('span');
    if (label) label.textContent = labelFor(skin);
  });

  if (paused) {
    title.textContent = 'ПАУЗА';
    message.textContent = 'Нажмите «Продолжить» или P';
  } else if (end) {
    title.textContent = g.state === 'win' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
    message.textContent = 'Счёт: ' + g.score + ' · Волна: ' + g.wave;
  } else if (menu) {
    title.textContent = 'NEON BEETLE ASSAULT';
    message.textContent = 'Выберите режим и нажмите старт';
  }
}

start.onclick = () => {
  g.start();
  sync();
};

restart.onclick = () => {
  g.start();
  sync();
};

resume.onclick = () => {
  g.resume();
  sync();
};

menuBtn.onclick = () => {
  g.returnToMenu();
  drawPreviews();
  sync();
};

mode.onclick = () => {
  g.mode = g.mode === 'campaign' ? 'endless' : 'campaign';
  mode.textContent = g.mode === 'campaign' ? 'Кампания 5 волн' : 'Бесконечный';
};

skins.forEach((b) =>
  b.addEventListener('click', () => {
    const result = g.buySkin(b.dataset.skin, +b.dataset.cost);
    if (result === 'poor') {
      message.textContent = 'Недостаточно кредитов!';
    } else if (result === 'equipped') {
      message.textContent = 'Корабль надет (уже был куплен).';
    } else if (result === 'purchased') {
      message.textContent = 'Корабль куплен и надет!';
    }
    drawPreviews();
    sync();
  })
);

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'p') {
    if (g.state === 'playing') g.pause();
    else if (g.state === 'paused') g.resume();
    sync();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) g.pause();
  sync();
});

drawPreviews();
sync();
setInterval(sync, 200);
