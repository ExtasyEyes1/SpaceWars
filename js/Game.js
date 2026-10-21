import Player from './Player.js';
import Enemy from './Enemy.js';
import Bonus from './Bonus.js';
import { createInput } from './input.js';
import { rects, circleRect } from './collision.js';

const SKIN_COSTS = { cyan: 0, violet: 5, gold: 7, coral: 9, lime: 11, rose: 13 };

export default class Game {
  constructor(canvas, ui) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.ui = ui;
    this.input = createInput();
    this.mode = 'campaign';
    this.state = 'menu';

    // Персистентные данные — читаем ОДИН раз
    this.wallet = this.loadWallet();
    this.skin = this.loadSkin();
    this.owned = this.loadOwned();
    // Гарантируем, что выбранный скин действительно принадлежит игроку
    if (!this.owned[this.skin]) {
      this.skin = 'cyan';
      this.saveSkin();
    }
    this.weaponLevel = 1;

    this.last = 0;
    this.stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * 900,
      y: Math.random() * 600,
      p: Math.random() * 6,
    }));

    this.loop = this.loop.bind(this);
    this.reset();
    requestAnimationFrame(this.loop);
  }

  reset() {
    this.weaponLevel = 1;
    this.score = 0;
    this.money = this.wallet;
    this.bombs = 0;
    this.wave = 1;
    this.bullets = [];
    this.enemies = [];
    this.bonuses = [];
    this.player = new Player(this);
    this.player.skin = this.skin; // применяем сохранённый скин
    this.boss = null;
    this.spawnWave();
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.last = performance.now();
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.input.clear();
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.last = performance.now();
    }
  }

  // Выход в главное меню. НЕ трогает кошелёк, скин и список покупок.
  returnToMenu() {
    this.state = 'menu';
    this.input.clear();
    this.bullets = [];
    this.enemies = [];
    this.bonuses = [];
    this.boss = null;
    this.player = new Player(this);
    this.player.skin = this.skin;
    this.wave = 1;
    this.score = 0;
    this.money = this.wallet;
    this.bombs = 0;
  }

  spawnWave() {
    if (this.wave === 5 && this.mode === 'campaign') {
      this.boss = new Enemy(this, 360, 55, 2, 'boss', 1);
      this.boss.isBoss = true;
      this.boss.hp = this.boss.maxHp = 120;
      this.boss.w = 110;
      this.boss.h = 82;
      this.enemies = [this.boss];
      return;
    }
    const n = 5 + this.wave * 2;
    const pattern = ['sin', 'zig', 'line'][(this.wave - 1) % 3];
    const difficulty = 1 + (this.wave - 1) * 0.14;
    for (let i = 0; i < n; i++) {
      this.enemies.push(
        new Enemy(
          this,
          70 + (i % 8) * 100,
          45 + Math.floor(i / 8) * 45,
          i % 3,
          pattern,
          difficulty
        )
      );
    }
  }

  dropBonus(enemy) {
    if (enemy.isBoss) return;
    const roll = Math.random();
    const type = roll < 0.3 ? 'money' : roll < 0.43 ? 'bomb' : roll < 0.55 ? 'up' : null;
    if (type) {
      this.bonuses.push(new Bonus(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, type));
    }
  }

  update(dt) {
    if (this.state !== 'playing') return;

    this.player.update(dt, this.input);
    this.bullets.forEach((b) => b.update(dt));
    this.enemies.forEach((e) => e.update(dt));
    this.bonuses.forEach((b) => b.update(dt));

    for (const bullet of this.bullets) {
      if (bullet.dead || bullet.owner !== 'player') continue;
      for (const enemy of this.enemies) {
        if (enemy.dead || !rects(bullet, enemy)) continue;
        bullet.dead = true;
        enemy.hp--;
        if (enemy.hp <= 0) {
          enemy.dead = true;
          this.score += enemy.isBoss ? 3000 : 100;
          this.dropBonus(enemy);
        }
        break;
      }
    }

    for (const bullet of this.bullets) {
      if (bullet.dead || bullet.owner !== 'enemy') continue;
      if (rects(bullet, this.player)) {
        bullet.dead = true;
        this.player.lives--;
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.isBoss) continue;
      if (rects(enemy, this.player)) {
        enemy.dead = true;
        this.player.lives--;
      }
    }

    for (const bonus of this.bonuses) {
      if (bonus.dead) continue;
      if (circleRect({ x: bonus.x, y: bonus.y, r: bonus.r }, this.player)) {
        bonus.dead = true;
        if (bonus.type === 'money') {
          this.wallet++;
          this.money = this.wallet;
          this.saveWallet();
        }
        if (bonus.type === 'up' && this.player.weapon < 4) {
          this.player.weapon++;
          this.weaponLevel = this.player.weapon;
        }
        if (bonus.type === 'bomb') this.bombs++;
      }
    }

    if ((this.input.consume('e') || this.input.consume('bomb')) && this.bombs) {
      this.bombs--;
      this.enemies.forEach((e) => {
        if (!e.isBoss) e.dead = true;
      });
    }

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bonuses = this.bonuses.filter((b) => !b.dead);

    if (this.player.lives <= 0) {
      this.end(false);
    } else if (!this.enemies.length) {
      if (this.wave >= 5 && this.mode === 'campaign') this.end(true);
      else {
        this.wave++;
        this.spawnWave();
      }
    }
  }

  // ---------- Хранилище ----------
  loadWallet() {
    try {
      return +(localStorage.getItem('neonWallet') || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveWallet() {
    try {
      localStorage.setItem('neonWallet', String(this.wallet));
    } catch {}
  }

  loadSkin() {
    try {
      const saved = localStorage.getItem('neonSkin') || 'cyan';
      return saved in SKIN_COSTS ? saved : 'cyan';
    } catch {
      return 'cyan';
    }
  }

  saveSkin() {
    try {
      localStorage.setItem('neonSkin', this.skin);
    } catch {}
  }

  loadOwned() {
    const defaults = { cyan: true, violet: false, gold: false, coral: false, lime: false, rose: false };
    try {
      const raw = localStorage.getItem('neonOwned');
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed, cyan: true };
    } catch {
      return defaults;
    }
  }

  saveOwned() {
    try {
      localStorage.setItem('neonOwned', JSON.stringify(this.owned));
    } catch {}
  }

  isOwned(skin) {
    return !!this.owned[skin];
  }

  /**
   * Покупка или экипировка скина.
   * Возвращает:
   *  'equipped'      — скин уже был куплен, просто надели
   *  'purchased'     — скин куплен и надет
   *  'poor'          — не хватает кредитов
   *  'noop'          — уже надет
   */
  buySkin(skin, cost) {
    if (!(skin in SKIN_COSTS)) return 'noop';
    const price = SKIN_COSTS[skin];

    if (skin === this.skin) return 'noop';

    // Уже принадлежит — просто надеваем, БЕЗ списания
    if (this.isOwned(skin)) {
      this.equipSkin(skin);
      return 'equipped';
    }

    // Нужно купить
    if (this.wallet < price) return 'poor';

    this.wallet -= price;
    this.money = this.wallet;
    this.owned[skin] = true;
    this.saveWallet();
    this.saveOwned();

    this.equipSkin(skin);
    return 'purchased';
  }

  equipSkin(skin) {
    this.skin = skin;
    this.saveSkin();
    if (this.player) this.player.skin = skin;
  }

  // ---------- Конец игры ----------
  end(win) {
    this.state = win ? 'win' : 'lose';
    try {
      const high = +(localStorage.getItem('neonHigh') || 0);
      if (this.score > high) localStorage.setItem('neonHigh', String(this.score));
    } catch {}
  }

  render() {
    const c = this.x;
    c.fillStyle = '#02050d';
    c.fillRect(0, 0, 900, 600);

    this.stars.forEach((s) => {
      c.fillStyle =
        'rgba(180,240,255,' + (0.3 + 0.5 * Math.sin(performance.now() / 500 + s.p)) + ')';
      c.fillRect(s.x, s.y, 2, 2);
    });

    this.bonuses.forEach((b) => b.render(c));
    this.enemies.forEach((e) => e.render(c));
    this.bullets.forEach((b) => b.render(c));
    this.player.render(c);

    if (this.ui.score) this.ui.score.textContent = this.score;
    if (this.ui.lives) this.ui.lives.textContent = this.player.lives;
    if (this.ui.wave) this.ui.wave.textContent = this.wave;
    if (this.ui.money) this.ui.money.textContent = this.wallet;
    if (this.ui.bombs) this.ui.bombs.textContent = this.bombs;
    if (this.ui.weapon) this.ui.weapon.textContent = this.player.weapon;

    if (this.boss && !this.boss.dead) {
      this.ui.bossHud.hidden = false;
      this.ui.bossFill.style.width =
        Math.max(0, (this.boss.hp / this.boss.maxHp) * 100) + '%';
    } else if (this.ui.bossHud) {
      this.ui.bossHud.hidden = true;
    }

    try {
      this.ui.high.textContent = localStorage.getItem('neonHigh') || 0;
    } catch {
      this.ui.high.textContent = 0;
    }
  }

  loop(time) {
    const dt = Math.min(0.05, (time - this.last) / 1000 || 0);
    this.last = time;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }
}
