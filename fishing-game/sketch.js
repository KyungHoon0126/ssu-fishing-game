/* p5.js Fishing Game - Mouse Move + Space Timing */

let game;

function setup() {
  const c = createCanvas(900, 560);
  c.parent("wrap");
  c.elt.tabIndex = 0;   // 키 입력 포커스
  c.elt.focus();
  game = new Game();
}

function draw() {
  game.update();
  game.render();
}

function isEnter() {
  return keyCode === ENTER || keyCode === 13 || key === "Enter";
}

function keyPressed() {
  if (game.state === "MENU" && isEnter()) game.start();
  else if (game.state === "RESULT" && isEnter()) game.reset();

  // 스페이스 → 타이밍 판정
  if (game.state === "PLAY" && key === " ") {
    game.handleGaugeHit();
  }
}

function mousePressed() {
  if (game.state === "MENU") game.start();
  else if (game.state === "RESULT") game.reset();
  else if (game.state === "PLAY") {
    // 훅킹 중이 아닐 때만 캐스팅/회수
    if (!game.hook.fish) game.hook.toggleDrop();
  }
}

/* ---------------- Game ---------------- */

class Game {
  constructor() {
    this.state = "MENU";      // MENU | PLAY | RESULT
    this.duration = 90;
    this.startMillis = 0;

    this.score = 0;
    this.best = 0;
    this.caught = 0;

    this.boat = new Boat(width * 0.5, 90);
    this.hook = new Hook(this.boat);

    this.school = [];
    this.spawnFishes(12);

    // 게이지 상태
    this.gauge = {
      x: width / 2,
      y: 80,
      baseW: 150,
      baseH: 16,
      w: 150,
      h: 16,
      minR: 10,
      maxR: 28,
      baseTolerance: 24,
      minToleranceFactor: 0.5,
      speedMin: 0.035,
      speedMax: 0.085,
      currentTolerance: 24
    };

    this.gaugePhase = 0;
    this.gaugeActive = false;
    this.gaugeLastHit = 0;

    // 스페이스 연타 체크
    this.lastSpaceTime = 0;
    this.spaceSpamStreak = 0;
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

  spawnFishes(n) {
    for (let i = 0; i < n; i++) this.school.push(Fish.random());
  }

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

    // 훅 → 물고기 충돌
    if (!this.hook.fish && this.hook.mode === "DOWN") {
      for (const f of this.school) {
        if (!f.caught && dist(this.hook.x, this.hook.y, f.x, f.y) < this.hook.r + f.r) {
          this.hook.onHook(f);
          break;
        }
      }
    }

    // 수면 도달 시 획득
    if (this.hook.fish && this.hook.y <= this.boat.hookY()) {
      const f = this.hook.fish;
      f.caught = true;
      this.score += f.score;
      this.caught += 1;
      this.school = this.school.filter(x => x !== f);
      this.school.push(Fish.random());
      this.hook.reset(false);
    }

    // 훅킹 중일 때 게이지 갱신
    if (this.hook.fish && this.hook.mode === "HOOKED") {
      this.gaugeActive = true;

      const fishR = this.hook.fish.r;
      const g = this.gauge;

      const normR = map(fishR, g.minR, g.maxR, 0, 1, true);

      // 판정 범위
      const factor = lerp(1.0, g.minToleranceFactor, normR);
      g.currentTolerance = g.baseTolerance * factor;

      // 마커 속도
      const speed = lerp(g.speedMin, g.speedMax, normR);
      this.gaugePhase += speed;

      // 게이지 크기
      const minScale = 0.7;
      const maxScale = 1.0;
      const sizeScale = lerp(minScale, maxScale, normR);
      g.w = g.baseW * sizeScale;
      g.h = g.baseH * sizeScale;
    } else {
      this.gaugeActive = false;
    }
  }

  render() {
    this.drawBackground();

    if (this.state === "MENU") {
      this.drawTitle("FISHING DAY");
      this.drawSub("마우스 이동 / 클릭 낚시 / SPACE 타이밍 / ENTER 시작");
      return;
    }

    fill(16, 100, 120);
    noStroke();
    rect(0, height - 60, width, 60);

    for (const f of this.school) f.draw();
    this.boat.draw();
    this.hook.draw();
    this.drawUI();

    if (this.state === "RESULT") {
      this.drawTitle("TIME UP!");
      this.drawSub(`SCORE ${this.score}  |  BEST ${this.best}  |  ENTER 재시작`);
    }
  }

  drawBackground() {
    // 물 배경
    noStroke();
    for (let y = 0; y < height; y++) {
      const c = lerpColor(color(120, 200, 255), color(10, 140, 210), y / height);
      stroke(c);
      line(0, y, width, y);
    }

    // 수면
    stroke(255, 255, 255, 60);
    strokeWeight(3);
    const surfaceY = this.boat.y + 20;
    for (let x = 0; x < width; x += 16) {
      const y = surfaceY + sin((frameCount * 0.05 + x) * 0.05) * 3;
      line(x, y, x + 12, y);
    }
  }

  drawUI() {
    // 상단 HUD
    noStroke();
    fill(0, 60);
    rect(0, 0, width, 40);

    const t = this.timeLeft();
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(16);
    text(`TIME ${nf(floor(t / 60), 2)}:${nf(floor(t % 60), 2)}`, 12, 20);

    textAlign(CENTER, CENTER);
    text(`SCORE ${this.score}`, width / 2, 20);

    textAlign(RIGHT, CENTER);
    text(`CAUGHT ${this.caught}`, width - 12, 20);

    // 게이지
    if (this.gaugeActive) {
      const gx = this.gauge.x;
      const gy = this.gauge.y;
      const gw = this.gauge.w;
      const gh = this.gauge.h;

      // 바
      noStroke();
      fill(0, 120);
      rect(gx - gw / 2, gy, gw, gh, 8);

      // 성공 영역
      const tol = this.gauge.currentTolerance || this.gauge.baseTolerance;
      fill(80, 220, 160, 90);
      rect(gx - tol, gy, tol * 2, gh, 6);

      // 마커
      const tt = (sin(this.gaugePhase) * 0.5 + 0.5);
      const markerX = lerp(gx - gw / 2 + 8, gx + gw / 2 - 8, tt);
      const flash = millis() - this.gaugeLastHit < 150 ? 255 : 220;

      noStroke();
      fill(255, flash);
      circle(markerX, gy + gh / 2, gh * 1.3);

      // 안내
      fill(255);
      textAlign(CENTER, TOP);
      textSize(14);
      text("마커가 중앙을 지날 때 SPACE!", gx, gy + gh + 6);
    }
  }

  drawTitle(s) {
    fill(0, 140);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    fill(255);
    textSize(52);
    textStyle(BOLD);
    text(s, width / 2, height / 2 - 20);
    textSize(18);
    textStyle(NORMAL);
  }

  drawSub(s) {
    textAlign(CENTER, CENTER);
    fill(240);
    textSize(18);
    text(s, width / 2, height / 2 + 24);
  }

  // 스페이스 입력 처리 (타이밍 + 연타 페널티)
  handleGaugeHit() {
    if (!this.gaugeActive) return;

    const now = millis();
    const dt = now - this.lastSpaceTime;
    this.lastSpaceTime = now;

    // 연타 카운트
    const spamThreshold = 200;
    const maxSpamStreak = 12;
    if (dt < spamThreshold) {
      this.spaceSpamStreak = min(this.spaceSpamStreak + 1, maxSpamStreak);
    } else {
      this.spaceSpamStreak = 0;
    }

    // 연타가 5번 초과 시(6회 이상) 도망 확률
    if (this.spaceSpamStreak > 5) {
      const minEscapeChance = 0.2; // 6회
      const maxEscapeChance = 0.8; // 12회
      const k = map(this.spaceSpamStreak, 6, maxSpamStreak, 0, 1, true);
      const escapeChance = lerp(minEscapeChance, maxEscapeChance, k);

      if (random() < escapeChance) {
        this.hook.forceEscape();   // 이 물고기 완전 놓침
        this.spaceSpamStreak = 0;
        return;
      }
    }

    // 타이밍 판정
    const gx = this.gauge.x;
    const gw = this.gauge.w;
    const tolerance = this.gauge.currentTolerance;

    const tt = (sin(this.gaugePhase) * 0.5 + 0.5);
    const markerX = lerp(gx - gw / 2 + 8, gx + gw / 2 - 8, tt);

    if (abs(markerX - gx) <= tolerance) {
      this.hook.pullStep();
      this.gaugeLastHit = millis();
    }
  }
}

/* ---------------- Boat ---------------- */

class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  update() {
    this.x = constrain(mouseX, 80, width - 80);
  }

  hookY() {
    return this.y + 26;
  }

  draw() {
    push();
    translate(this.x, this.y);

    noStroke();
    fill(250);
    rect(-70, -18, 140, 36, 12);
    fill(40, 120, 200);
    rect(-70, 0, 140, 18, 0, 0, 12, 12);

    fill(255, 240, 220);
    rect(-20, -34, 46, 20, 6);
    fill(40, 120, 200);
    circle(6, -24, 10);

    stroke(60);
    strokeWeight(3);
    line(0, -36, 0, -60);
    noStroke();
    fill(230);
    circle(0, -60, 10);

    pop();
  }
}

/* ---------------- Hook ---------------- */

class Hook {
  constructor(boat) {
    this.boat = boat;
    this.reset(true);
  }

  reset(moveToBoat) {
    this.mode = "UP";        // UP | DOWN | HOOKED
    this.fish = null;
    this.lenMax = height - this.boat.y - 80;
    this.dropSpeed = 5;
    this.reelSpeed = 3.6;

    // 깊이 기반 step 범위
    this.minStep = 20;
    this.maxStep = 50;

    if (moveToBoat) {
      this.x = this.boat.x;
      this.y = this.boat.hookY();
    }
  }

  toggleDrop() {
    if (game.state !== "PLAY") return;
    if (this.fish) return;
    this.mode = this.mode === "DOWN" ? "UP" : "DOWN";
  }

  get r() {
    return 10;
  }

  update() {
    this.x = lerp(this.x, this.boat.x, 0.35);

    if (this.mode === "DOWN") {
      this.y += this.dropSpeed;
      const maxY = this.boat.hookY() + this.lenMax;
      if (this.y >= maxY) this.mode = "UP";
    } else if (this.mode === "UP") {
      if (!this.fish) {
        this.y -= this.reelSpeed;
        if (this.y <= this.boat.hookY()) this.y = this.boat.hookY();
      }
    } else if (this.mode === "HOOKED" && this.fish) {
      const fish = this.fish;
      fish.x = lerp(fish.x, this.x, 0.2);
      fish.y = lerp(fish.y, this.y + 18, 0.2);
    }
  }

  onHook(fish) {
    this.fish = fish;
    this.mode = "HOOKED";
    fish.caught = true;
  }

  // 연타 패널티: 물고기 놓침 + 빈 훅 회수
  forceEscape() {
    if (!this.fish) return;
    this.fish.caught = false; // 다시 자유롭게
    this.fish = null;
    this.mode = "UP";         // 라인은 위로 감김
  }

  // 타이밍 성공 시 위로 당기기 (깊이 + 물고기 크기 반영)
  pullStep() {
    if (this.mode !== "HOOKED" || !this.fish) return;

    const distFromBoat = this.y - this.boat.hookY();
    const depthRatio = constrain(distFromBoat / this.lenMax, 0, 1);
    const baseStep = lerp(this.minStep, this.maxStep, depthRatio);

    const r = this.fish.r;
    const sizeRatio = constrain(
      (r - game.gauge.minR) / (game.gauge.maxR - game.gauge.minR),
      0,
      1
    );
    const sizeFactor = lerp(1.0, 0.6, sizeRatio);

    const step = baseStep * sizeFactor;

    this.y -= step;
    if (this.y < this.boat.hookY()) this.y = this.boat.hookY();
  }

  draw() {
    stroke(70);
    strokeWeight(2);
    line(this.boat.x, this.boat.hookY() - 32, this.x, this.y);

    noStroke();
    fill(230);
    circle(this.x, this.y, this.r * 2);

    stroke(80);
    strokeWeight(3);
    noFill();
    arc(this.x, this.y + 6, 16, 16, PI * 0.1, PI * 1.2);
  }
}

/* ---------------- Fish ---------------- */

class Fish {
  constructor(x, y, r, speed, strength, score, hue) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = random([-1, 1]) * speed;
    this.vy = (random() - 0.5) * speed * 0.6;
    this.baseSpeed = speed;
    this.strength = strength;
    this.score = score;
    this.caught = false;
    this.hue = hue;
    this.noiseSeed = random(1000);
    this.flip = this.vx < 0 ? -1 : 1;
  }

  static random() {
    const y = random(180, height - 90);
    const type = random();

    if (type < 0.6) {
      // 작은 물고기
      return new Fish(
        random(40, width - 40),
        y,
        12,
        random(1.6, 2.2),
        2.5,
        5,
        color(255, 180, 80)
      );
    } else if (type < 0.9) {
      // 중간 물고기
      return new Fish(
        random(40, width - 40),
        y,
        18,
        random(1.2, 1.8),
        4,
        12,
        color(120, 220, 180)
      );
    } else {
      // 큰 물고기
      return new Fish(
        random(40, width - 40),
        y,
        26,
        random(0.9, 1.4),
        5.5,
        25,
        color(110, 140, 255)
      );
    }
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
    push();
    translate(this.x, this.y);
    scale(this.flip, 1);

    noStroke();
    fill(this.hue);
    ellipse(0, 0, this.r * 2.2, this.r * 1.3);
    triangle(-this.r * 1.4, 0, -this.r * 2.0, -this.r * 0.5, -this.r * 2.0, this.r * 0.5);

    fill(255);
    circle(this.r * 0.6, -this.r * 0.15, this.r * 0.35);
    fill(40);
    circle(this.r * 0.6, -this.r * 0.15, this.r * 0.18);

    if (this.score >= 20) {
      stroke(255, 220);
      noFill();
      strokeWeight(1.2);
      ellipse(0, 0, this.r * 2.5, this.r * 1.5);
    }

    pop();
  }
}