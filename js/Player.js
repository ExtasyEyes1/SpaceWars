import Bullet from './Bullet.js';

// Три РАЗНЫХ силуэта. Координаты модели в пространстве 0..34 × 0..28.
const SHIPS = {
  cyan: {
    color: '#62f8ff',
    draw(c) {
      // Классический истребитель: широкие крылья, «ступенька» в центре.
      c.moveTo(17, 0);
      c.lineTo(34, 28);
      c.lineTo(24, 28);
      c.lineTo(17, 20);
      c.lineTo(10, 28);
      c.lineTo(0, 28);
    },
    details(c) {
      // Оранжевые сопла
      c.fillStyle = '#ffb24d';
      c.fillRect(6, 26, 6, 4);
      c.fillRect(22, 26, 6, 4);
      // Кабина
      c.fillStyle = '#eaffff';
      c.beginPath();
      c.ellipse(17, 14, 3.2, 5, 0, 0, Math.PI * 2);
      c.fill();
    },
  },
};

const COLORS = {
  cyan: '#62f8ff', violet: '#c27dff', gold: '#ffe66d',
  coral: '#ff7b6b', lime: '#a8ff70', rose: '#ff78c8',
};

export default class Player {
  constructor(game) {
    this.g = game;
    this.reset();
  }

  reset() {
    this.x = 433;
    this.y = 545;
    this.w = 34;
    this.h = 28;
    this.speed = 360;
    this.cool = 0;
    this.lives = 3;
    this.weapon = (this.g && this.g.weaponLevel) || 1;
    // Источник истины — g.skin, загруженный из localStorage
    this.skin = (this.g && this.g.skin) || 'cyan';
  }

  update(dt, input) {
    // Держим скин синхронным с выбором игрока
    if (this.g && this.g.skin) this.skin = this.g.skin;

    const direction =
      (input.isDown('arrowleft', 'a', 'left') ? -1 : 0) +
      (input.isDown('arrowright', 'd', 'right') ? 1 : 0);
    this.x = Math.max(20, Math.min(846, this.x + direction * this.speed * dt));
    this.cool -= dt;

    if (input.isDown(' ', 'fire') && this.cool <= 0) {
      this.cool = 0.25;
      const angles = {
        1: [0],
        2: [-0.09, 0.09],
        3: [-0.15, 0, 0.15],
        4: [-0.2, -0.07, 0.07, 0.2],
      }[this.weapon];
      for (const angle of angles) {
        this.g.bullets.push(
          new Bullet(
            this.x + 15,
            this.y - 14,
            -Math.cos(angle) * 520,
            'player',
            Math.sin(angle) * 520
          )
        );
      }
    }
  }

  // Рисует корабль. (x,y) — точка привязки (совпадает с this.x, this.y).
  // scale=1 даёт модель ~34×28; работает и на маленьком preview-canvas.
  render(c, x = this.x, y = this.y, scale = 1) {
    // Синхронизируемся с игрой КАЖДЫЙ кадр — скин меняется мгновенно.
    if (this.g && this.g.skin) this.skin = this.g.skin;

    const ship = SHIPS.cyan;
    const shipColor = COLORS[this.skin] || COLORS.cyan;

    c.save();
    // Центр модели (17,14) помещаем в (x,y):
    c.translate(x, y);
    c.scale(scale, scale);
    c.translate(-17, -14);

    c.shadowBlur = 20;
    c.shadowColor = shipColor;
    c.fillStyle = shipColor;

    c.beginPath();
    ship.draw(c);
    c.closePath();
    c.fill();

    // Неоновая обводка — делает силуэт читаемым на любом фоне
    c.lineWidth = 1.5;
    c.strokeStyle = shipColor;
    c.stroke();

    c.shadowBlur = 0;
    if (ship.details) ship.details(c);

    c.restore();
  }
}
