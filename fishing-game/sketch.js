/* p5.js Fishing Game - MVP (index.html + sketch.js)
   Controls:
   Left/Right: move boat
   Space: drop / reel
   Up/Down: tension control while hooked
   Enter / Click: start / restart
*/

let game;

function setup() {
  const c = createCanvas(900, 560);
  c.parent("wrap");

  // ★ 포커스 강제 부여 (키 입력 인식 보장)
  c.elt.tabIndex = 0;
  c.elt.focus();

  game = new Game();
}

function draw() {
  game.update();
  game.render();
}

// ★ ENTER를 다양한 방식으로 인식
function isEnter() {
  return keyCode === ENTER || keyCode === 13 || key === 'Enter';
}

function keyPressed() {
  if (game.state === "MENU" && isEnter()) game.start();
  else if (game.state === "RESULT" && isEnter()) game.reset();

  if (key === ' ') game.hook && game.hook.toggleDrop();
}

// ★ 클릭으로도 시작/재시작 가능 (포커스 문제 대비)
function mousePressed() {
  if (game.state === "MENU") game.start();
  else if (game.state === "RESULT") game.reset();
}

/* ---------------- Core Game ---------------- */

class Game {
  constructor() {
    this.state = "MENU";         // MENU | PLAY | RESULT
    this.duration = 90;          // seconds
    this.startMillis = 0;

    this.score = 0;
    this.best = 0;
    this.caught = 0;

    this.boat = new Boat(width * 0.5, 90);
    this.hook = new Hook(this.boat);

    this.school = [];
    this.spawnFishes(12);
  }

  start() {
    this.state = "PLAY";
    this.startMillis = millis();
  }

  reset() {
    this.state = "MENU";
    this.score = 0;
    this.caught = 0;
    this.hook.reset(true);
    this.school = [];
    this.spawnFishes(12);
  }

  spawnFishes(n) { for (let i = 0; i < n; i++) this.school.push(Fish.random()); }

  timeLeft() {
    if (this.state !== "PLAY") return this.duration;
    const t = (millis() - this.startMillis) / 1000;
    return max(0, this.duration - t);
  }

  update() {
    if (this.state === "PLAY" && this.timeLeft() <= 0.01) {
      this.state = "RESULT";
      this.best = max(this.best, this.score);
      this.hook.reset(true);
    }
    if (this.state !== "PLAY") return;

    this.boat.update();
    for (const f of this.school) f.update();
    this.hook.update();

    if (!this.hook.fish && this.hook.mode === "DOWN") {
      for (const f of this.school) {
        if (!f.caught && dist(this.hook.x, this.hook.y, f.x, f.y) < this.hook.r + f.r) {
          this.hook.onHook(f);
          break;
        }
      }
    }

    if (this.hook.fish && this.hook.y <= this.boat.hookY()) {
      const f = this.hook.fish;
      f.caught = true;
      this.score += f.score;
      this.caught += 1;
      this.school = this.school.filter(x => x !== f);
      this.school.push(Fish.random());
      this.hook.reset(false);
    }
  }

  render() {
    this.drawBackground();

    if (this.state === "MENU") {
      this.drawTitle("FISHING DAY");
      this.drawSub("←/→ 이동, SPACE 낚시, ↑/↓ 텐션, ENTER 또는 클릭 시작");
      return;
    }

    noStroke(); fill(16, 100, 120); rect(0, height - 60, width, 60);
    for (const f of this.school) f.draw();
    this.boat.draw();
    this.hook.draw();
    this.drawUI();

    if (this.state === "RESULT") {
      this.drawTitle("TIME UP!");
      this.drawSub(`SCORE ${this.score}  |  BEST ${this.best}  |  ENTER/클릭 재시작`);
    }
  }

  drawBackground() {
    noStroke();
    for (let y = 0; y < height; y++) {
      const c = lerpColor(color(120, 200, 255), color(10, 140, 210), y / height);
      stroke(c); line(0, y, width, y);
    }
    stroke(255, 255, 255, 60); strokeWeight(3);
    const surfaceY = this.boat.y + 20;
    for (let x = 0; x < width; x += 16) {
      const y = surfaceY + sin((frameCount * 0.05 + x) * 0.05) * 3;
      line(x, y, x + 12, y);
    }
  }

  drawUI() {
    noStroke(); fill(0, 60); rect(0, 0, width, 40);
    const t = this.timeLeft();
    fill(255); textAlign(LEFT, CENTER); textSize(16);
    text(`TIME ${nf(floor(t / 60), 2)}:${nf(floor(t % 60), 2)}`, 12, 20);
    textAlign(CENTER, CENTER); text(`SCORE ${this.score}`, width / 2, 20);
    textAlign(RIGHT, CENTER); text(`CAUGHT ${this.caught}`, width - 12, 20);

    if (this.hook.fish) {
      const w = 260, h = 16, x = width / 2 - w / 2, y = 50;
      fill(0, 120); rect(x, y, w, h, 8);
      fill(80, 220, 120, 160); rect(x + w * 0.25, y, w * 0.5, h, 8);
      fill(255); const k = this.hook.tension / 100; rect(x, y, w * k, h, 8);
      noStroke(); fill(255); textAlign(CENTER, TOP); text("TENSION", width / 2, y + h + 4);
    }
  }

  drawTitle(s) {
    fill(0, 140); rect(0, 0, width, height);
    textAlign(CENTER, CENTER); fill(255); textSize(52); textStyle(BOLD);
    text(s, width / 2, height / 2 - 20);
    textSize(18); textStyle(NORMAL);
  }

  drawSub(s) { textAlign(CENTER, CENTER); fill(240); textSize(18); text(s, width / 2, height / 2 + 24); }
}

/* ---------------- Entities ---------------- */

class Boat {
  constructor(x, y) { this.x = x; this.y = y; this.speed = 4.2; }
  update() {
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) this.x += this.speed;
    this.x = constrain(this.x, 80, width - 80);
  }
  hookY() { return this.y + 26; }
  draw() {
    push(); translate(this.x, this.y);
    noStroke(); fill(250); rect(-70, -18, 140, 36, 12);
    fill(40, 120, 200); rect(-70, 0, 140, 18, 0, 0, 12, 12);
    fill(255, 240, 220); rect(-20, -34, 46, 20, 6);
    fill(40, 120, 200); circle(6, -24, 10);
    stroke(60); strokeWeight(3); line(0, -36, 0, -60);
    noStroke(); fill(230); circle(0, -60, 10);
    pop();
  }
}

class Hook {
  constructor(boat) { this.boat = boat; this.reset(true); }
  reset(moveToBoat) {
    this.mode = "UP"; this.fish = null; this.tension = 50;
    this.lenMax = height - this.boat.y - 80;
    this.dropSpeed = 5; this.reelSpeed = 3.6;
    if (moveToBoat) { this.x = this.boat.x; this.y = this.boat.hookY(); }
  }
  toggleDrop() {
    if (game.state !== "PLAY") return;
    if (this.fish) return;
    this.mode = (this.mode === "DOWN") ? "UP" : "DOWN";
  }
  get r() { return 10; }
  update() {
    this.x = lerp(this.x, this.boat.x, 0.35);
    if (this.mode === "DOWN") {
      this.y += this.dropSpeed;
      const maxY = this.boat.hookY() + this.lenMax;
      if (this.y >= maxY) this.mode = "UP";
    } else if (this.mode === "UP") {
      this.y -= this.reelSpeed;
      if (this.y <= this.boat.hookY()) this.y = this.boat.hookY();
    } else if (this.mode === "HOOKED" && this.fish) {
      const fish = this.fish;
      const pull = (noise(frameCount * 0.06 + fish.noiseSeed) - 0.5) * fish.strength * 2.2;
      let input = 0; if (keyIsDown(UP_ARROW)) input -= 2.6; if (keyIsDown(DOWN_ARROW)) input += 2.6;
      this.tension = constrain(this.tension + pull + input, 0, 100);
      if (this.tension > 20 && this.tension < 80) {
        this.y -= this.reelSpeed * map(60 - abs(this.tension - 50), 10, 60, 0.6, 1.6, true);
      }
      if (this.tension >= 100) this.breakLine();
      if (this.tension <= 0) this.escapeFish();
      fish.x = lerp(fish.x, this.x, 0.2); fish.y = lerp(fish.y, this.y + 18, 0.2);
    }
  }
  onHook(fish) { this.fish = fish; this.mode = "HOOKED"; this.tension = 55; fish.caught = true; }
  breakLine() { game.score = max(0, game.score - 5); this.fish && (this.fish.caught = false); this.fish = null; this.mode = "DOWN"; this.tension = 50; }
  escapeFish() { this.fish && (this.fish.caught = false); this.fish = null; this.mode = "DOWN"; this.tension = 50; }
  draw() {
    stroke(70); strokeWeight(2); line(this.boat.x, this.boat.hookY() - 32, this.x, this.y);
    noStroke(); fill(230); circle(this.x, this.y, this.r * 2);
    stroke(80); strokeWeight(3); noFill(); arc(this.x, this.y + 6, 16, 16, PI * 0.1, PI * 1.2);
  }
}

class Fish {
  constructor(x, y, r, speed, strength, score, hue) {
    this.x = x; this.y = y; this.r = r;
    this.vx = random([-1, 1]) * speed; this.vy = (random() - 0.5) * speed * 0.6;
    this.baseSpeed = speed; this.strength = strength; this.score = score;
    this.caught = false; this.hue = hue; this.noiseSeed = random(1000);
    this.flip = this.vx < 0 ? -1 : 1;
  }
  static random() {
    const y = random(180, height - 90); const type = random();
    if (type < 0.6) return new Fish(random(40, width - 40), y, 12, random(1.6, 2.2), 2.5, 5, color(255, 180, 80));
    else if (type < 0.9) return new Fish(random(40, width - 40), y, 18, random(1.2, 1.8), 4, 12, color(120, 220, 180));
    else return new Fish(random(40, width - 40), y, 26, random(0.9, 1.4), 5.5, 25, color(110, 140, 255));
  }
  update() {
    if (this.caught) return;
    this.x += this.vx + sin(frameCount * 0.03 + this.noiseSeed) * 0.4;
    this.y += this.vy + cos(frameCount * 0.02 + this.noiseSeed) * 0.3;
    if (this.x < 20 || this.x > width - 20) this.vx *= -1;
    if (this.y < 160 || this.y > height - 80) this.vy *= -1;
    this.flip = this.vx < 0 ? -1 : 1;
  }
  draw() {
    push(); translate(this.x, this.y); scale(this.flip, 1);
    noStroke(); fill(this.hue);
    ellipse(0, 0, this.r * 2.2, this.r * 1.3);
    triangle(-this.r * 1.4, 0, -this.r * 2.0, -this.r * 0.5, -this.r * 2.0, this.r * 0.5);
    fill(255); circle(this.r * 0.6, -this.r * 0.15, this.r * 0.35);
    fill(40); circle(this.r * 0.6, -this.r * 0.15, this.r * 0.18);
    if (this.score >= 20) { stroke(255, 220); noFill(); strokeWeight(1.2); ellipse(0, 0, this.r * 2.5, this.r * 1.5); }
    pop();
  }
}
