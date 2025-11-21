
let game;

function setup() {
  const c = createCanvas(900, 560);
  c.parent("wrap");
  c.elt.tabIndex = 0;
  c.elt.focus();
  game = new Game();
}

function draw() {
  game.update();
  game.render();
}

function keyPressed() {
  if (game.state === "RESULT" && (keyCode === ENTER || key === 'Enter')) game.reset();
  if (game.state === "PLAY" && key === ' ') game.hook && game.hook.toggleDrop();
}
function mousePressed() {
  if (game.state === "MENU") game.checkSeasonTabs();
  else if (game.state === "RESULT") game.reset();
}


class Game {
  constructor() {
    this.state = "MENU";
    this.season = "SPRING";
    this.duration = 90;
    this.startMillis = 0;

    this.score = 0;
    this.best = 0;
    this.caught = 0;
    this.scorePopup = null;

    this.boat = new Boat(width / 2, 90);
    this.hook = new Hook(this.boat);
    this.school = [];
    this.particles = [];

    // 물고기별 누적 점수 테이블
    this.fishScoreMap = {};
  }

  /* ------------ State Management ------------ */
  changeSeason(newSeason) {
    this.season = newSeason;
    this.start();
  }

  checkSeasonTabs() {
    const yOffset = height / 2 + 70;
    const w = width / 4;
    if (mouseY > yOffset && mouseY < yOffset + 50) {
      const idx = floor(map(mouseX, 0, width, 0, 4));
      const seasons = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
      if (seasons[idx]) this.changeSeason(seasons[idx]);
    }
  }

  start() {
    this.state = "PLAY";
    this.startMillis = millis();
    this.score = 0;
    this.caught = 0;
    this.hook.reset(true);
    this.spawnFishes(10);
    this.particles = [];
    this.fishScoreMap = {}; // 시즌 시작 시 초기화
  }

  reset() {
    this.state = "MENU";
    this.hook.reset(true);
    this.particles = [];
  }

  spawnFishes(n) {
    this.school = [];
    for (let i = 0; i < n; i++) this.school.push(Fish.bySeason(this.season));
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
    this.hook.update();
    for (const f of this.school) f.update();

    // 낚시 중일 때
    if (!this.hook.fish && this.hook.mode === "DOWN") {
      for (const f of this.school) {
        if (!f.caught && dist(this.hook.x, this.hook.y, f.x, f.y) < this.hook.r + f.r) {
          this.hook.onHook(f);
          break;
        }
      }
    }

    // 물고기 잡았을 때
    if (this.hook.fish && this.hook.y <= this.boat.hookY()) {
      const f = this.hook.fish;
      f.caught = true;

      this.score += f.score;
      this.caught += 1;
      this.scorePopup = { x: f.x, y: f.y, value: f.score, alpha: 255 };

      // 각 물고기 누적 점수 갱신
      if (!this.fishScoreMap[f.name]) this.fishScoreMap[f.name] = 0;
      this.fishScoreMap[f.name] += f.score;

      this.school = this.school.filter(x => x !== f);
      this.school.push(Fish.bySeason(this.season));
      this.hook.reset(false);
    }

    this.updateParticles();
  }

  updateParticles() {
    if (frameCount % 5 === 0) {
      if (this.season === "SPRING") this.particles.push(new Particle("petal"));
      else if (this.season === "SUMMER") this.particles.push(new Particle("rain"));
      else if (this.season === "AUTUMN") this.particles.push(new Particle("leaf"));
      else if (this.season === "WINTER") this.particles.push(new Particle("snow"));
    }
    for (let p of this.particles) p.update();
    this.particles = this.particles.filter(p => !p.offscreen());
  }

  
  render() {
    this.drawBackground();
    for (let p of this.particles) p.draw();

    if (this.state === "MENU") {
      this.drawMenu();
      return;
    }

    // World elements
    noStroke();
    fill(16, 100, 120);
    rect(0, height - 60, width, 60);
    for (const f of this.school) f.draw();
    this.boat.draw();
    this.hook.draw();

    // UI & Score
    this.drawUI();

    // Score popup animation
    if (this.scorePopup) {
      fill(255, this.scorePopup.alpha);
      textAlign(CENTER, CENTER);
      textSize(20);
      text(`+${this.scorePopup.value}`, this.scorePopup.x, this.scorePopup.y);
      this.scorePopup.y -= 1.5;
      this.scorePopup.alpha -= 6;
      if (this.scorePopup.alpha <= 0) this.scorePopup = null;
    }

    if (this.state === "RESULT") {
      this.drawTitle("TIME UP!");
      this.drawSub(`SCORE ${this.score} | BEST ${this.best} | 클릭하여 재시작`);
    }
  }

  
  drawMenu() {
    const c1 = color(200, 245, 255);
    const c2 = color(100, 200, 255);
    for (let y = 0; y < height; y++) {
      stroke(lerpColor(c1, c2, y / height));
      line(0, y, width, y);
    }
    stroke(255, 255, 255, 90);
    const surfaceY = 110;
    for (let x = 0; x < width; x += 16) {
      const y = surfaceY + sin(frameCount * 0.05 + x * 0.05) * 3;
      line(x, y, x + 14, y);
    }
    fill(0, 120);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    fill(255);
    textSize(52);
    textStyle(BOLD);
    text("FISHING DAY", width / 2, height / 2 - 40);
    textSize(18);
    textStyle(NORMAL);
    text("←/→ 이동, SPACE 낚시, ↑/↓ 텐션, ENTER 또는 클릭 시작", width / 2, height / 2 + 10);

    // Season tabs
    const labels = ["봄", "여름", "가을", "겨울"];
    const w = width / 4;
    const yOffset = height / 2 + 70;
    for (let i = 0; i < 4; i++) {
      noStroke();
      fill(0, 80, 140, 160);
      rect(i * w + 5, yOffset, w - 10, 50, 8);
      fill(255);
      textSize(20);
      text(labels[i], w * i + w / 2, yOffset + 25);
    }
  }

  drawBackground() {
    const colors = {
      SPRING: [color(220, 245, 255), color(160, 200, 255)],
      SUMMER: [color(200, 250, 255), color(120, 210, 250)],
      AUTUMN: [color(170, 230, 255), color(50, 160, 200)],
      WINTER: [color(210, 230, 255), color(160, 190, 230)],
    };
    const [topColor, bottomColor] = colors[this.season];
    for (let y = 0; y < height; y++) {
      stroke(lerpColor(topColor, bottomColor, y / height));
      line(0, y, width, y);
    }
    stroke(255, 255, 255, 70);
    const surfaceY = 110;
    for (let x = 0; x < width; x += 16) {
      const y = surfaceY + sin(frameCount * 0.05 + x * 0.05) * 3;
      line(x, y, x + 14, y);
    }
  }

  drawUI() {
    noStroke();
    fill(0, 80);
    rect(0, 0, width, 35);
    const t = this.timeLeft();
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(14);
    text(`TIME ${nf(floor(t / 60), 2)}:${nf(floor(t % 60), 2)}`, 12, 18);
    textAlign(CENTER, CENTER);
    text(`SCORE ${this.score}`, width / 2, 18);
    textAlign(RIGHT, CENTER);
    text(`CAUGHT ${this.caught}`, width - 12, 18);

    if (this.state === "PLAY") this.drawFishScores();
  }

  drawFishScores() {
    const table = this.fishTypeScores();
    const boxX = width - 180, boxY = 35, boxW = 170, boxH = 140;
    noStroke();
    fill(0, 70, 120, 120);
    rect(boxX, boxY, boxW, boxH, 10);

    textSize(13);
    fill(255);
    textAlign(CENTER, CENTER);
    text("🐟 FISH SCORES", boxX + boxW / 2, boxY + 16);

    let y = boxY + 36;
    for (const f of table) {
      const score = this.fishScoreMap[f.label] || 0;
      fill(255, 230);
      textAlign(LEFT, CENTER);
      text(f.label, boxX + 14, y);
      textAlign(RIGHT, CENTER);
      fill(255, 255, 120);
      text(`+${score}`, boxX + boxW - 14, y);
      y += 20;
    }
  }

  fishTypeScores() {
    return {
      SPRING: [
        { label: "벚꽃멸치", score: 5 },
        { label: "청연어", score: 8 },
        { label: "벚꽃돔", score: 10 },
        { label: "분홍농어", score: 15 },
        { label: "벚해삼", score: 25 },
      ],
      SUMMER: [
        { label: "노랑망둥어", score: 5 },
        { label: "은갈치", score: 8 },
        { label: "파랑숭어", score: 12 },
        { label: "황금참돔", score: 15 },
        { label: "해태", score: 25 },
      ],
      AUTUMN: [
        { label: "주홍전갱이", score: 5 },
        { label: "가을도미", score: 8 },
        { label: "단풍고등어", score: 12 },
        { label: "낙엽농어", score: 15 },
        { label: "붉은장어", score: 25 },
      ],
      WINTER: [
        { label: "빙어", score: 5 },
        { label: "눈송장어", score: 8 },
        { label: "얼음방어", score: 12 },
        { label: "설돔", score: 15 },
        { label: "혹한가자미", score: 25 },
      ],
    }[this.season];
  }

  drawTitle(s) {
    fill(0, 140);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    fill(255);
    textSize(52);
    textStyle(BOLD);
    text(s, width / 2, height / 2 - 40);
    textSize(18);
    textStyle(NORMAL);
  }

  drawSub(s) {
    fill(240);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(s, width / 2, height / 2 + 10);
  }
}



class Particle {
  constructor(type) {
    this.type = type;
    this.x = random(width);
    this.y = random(-20, 0);
    this.vy = random(1.2, 3.2);
    this.vx = (type === "leaf" || type === "petal") ? random(-0.7, 0.7) : 0;
    this.size = random(6, 14);
    this.rot = random(TWO_PI);
    this.spin = random(-0.03, 0.03);
  }
  update() { this.x += this.vx; this.y += this.vy; this.rot += this.spin; }
  offscreen() { return this.y > height + 20; }
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    noStroke();
    if (this.type === "snow") fill(255, 240);
    else if (this.type === "petal") fill(255, 180, 200);
    else if (this.type === "leaf") fill(255, 180, 60);
    else if (this.type === "rain") fill(150, 220, 255, 180);
    ellipse(0, 0, this.size, this.size * 0.6);
    pop();
  }
}


class Boat {
  constructor(x, y) { this.x = x; this.y = y; this.speed = 4; }
  update() {
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) this.x += this.speed;
    this.x = constrain(this.x, 80, width - 80);
  }
  hookY() { return this.y + 26; }
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

class Hook {
  constructor(boat) { this.boat = boat; this.reset(true); }
  reset(moveToBoat) {
    this.mode = "UP";
    this.fish = null;
    this.tension = 50;
    this.lenMax = height - this.boat.y - 80;
    this.dropSpeed = 5;
    this.reelSpeed = 3.6;
    if (moveToBoat) { this.x = this.boat.x; this.y = this.boat.hookY(); }
  }
  toggleDrop() {
    if (game.state !== "PLAY" || this.fish) return;
    this.mode = this.mode === "DOWN" ? "UP" : "DOWN";
  }
  get r() { return 10; }
  update() {
    this.x = lerp(this.x, this.boat.x, 0.35);
    if (this.mode === "DOWN") {
      this.y += this.dropSpeed;
      if (this.y >= this.boat.hookY() + this.lenMax) this.mode = "UP";
    } else if (this.mode === "UP") {
      this.y -= this.reelSpeed;
      if (this.y <= this.boat.hookY()) this.y = this.boat.hookY();
    } else if (this.mode === "HOOKED" && this.fish) {
      const fish = this.fish;
      const pull = (noise(frameCount * 0.06 + fish.noiseSeed) - 0.5) * fish.strength * 2.2;
      let input = 0;
      if (keyIsDown(UP_ARROW)) input -= 2.6;
      if (keyIsDown(DOWN_ARROW)) input += 2.6;
      this.tension = constrain(this.tension + pull + input, 0, 100);
      if (this.tension > 20 && this.tension < 80)
        this.y -= this.reelSpeed *
          map(60 - abs(this.tension - 50), 10, 60, 0.6, 1.6, true);
      if (this.tension >= 100) this.breakLine();
      if (this.tension <= 0) this.escapeFish();
      fish.x = lerp(fish.x, this.x, 0.2);
      fish.y = lerp(fish.y, this.y + 18, 0.2);
    }
  }
  onHook(fish) { this.fish = fish; this.mode = "HOOKED"; this.tension = 55; fish.caught = true; }
  breakLine() { game.score = max(0, game.score - 5); if (this.fish) this.fish.caught = false; this.fish = null; this.mode = "DOWN"; this.tension = 50; }
  escapeFish() { if (this.fish) this.fish.caught = false; this.fish = null; this.mode = "DOWN"; this.tension = 50; }
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

class Fish {
  constructor(x, y, r, speed, strength, score, hue, name) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = random([-1, 1]) * speed;
    this.vy = random(-speed / 3, speed / 3);
    this.strength = strength;
    this.score = score;
    this.hue = hue;
    this.name = name;
    this.caught = false;
    this.noiseSeed = random(1000);
    this.flip = this.vx < 0 ? -1 : 1;
  }

  static bySeason(season) {
    const table = {
      SPRING: [
        ["벚꽃멸치", 12, [255,150,200], 1.6, 5],
        ["청연어", 14, [255,180,230], 1.8, 8],
        ["벚꽃돔", 16, [255,220,250], 2.0, 10],
        ["분홍농어", 20, [240,140,200], 1.5, 15],
        ["벚해삼", 24, [255,100,150], 1.2, 25],
      ],
      SUMMER: [
        ["노랑망둥어", 12, [255,230,80], 2.0, 5],
        ["은갈치", 15, [255,200,120], 2.2, 8],
        ["파랑숭어", 18, [255,220,160], 2.4, 12],
        ["황금참돔", 22, [255,240,200], 2.0, 15],
        ["해태", 26, [250,255,230], 1.8, 25],
      ],
      AUTUMN: [
        ["주홍전갱이", 12, [255,150,90], 1.5, 5],
        ["가을도미", 16, [255,170,120], 1.6, 8],
        ["단풍고등어", 20, [255,190,140], 1.8, 12],
        ["낙엽농어", 22, [255,210,160], 1.5, 15],
        ["붉은장어", 26, [255,230,180], 1.3, 25],
      ],
      WINTER: [
        ["빙어", 12, [180,220,255], 1.4, 5],
        ["눈송장어", 15, [200,240,255], 1.5, 8],
        ["얼음방어", 18, [160,200,255], 1.6, 12],
        ["설돔", 22, [190,230,255], 1.3, 15],
        ["혹한가자미", 26, [220,250,255], 1.2, 25],
      ],
    }[season];

    const f = random(table);
    const [name, r, col, speed, score] = f;
    return new Fish(random(40, width - 40), random(180, height - 90),
      r, speed, 4, score, color(...col), name);
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
    ellipse(0, 0, this.r * 2.2, this.r * 1.2);
    triangle(-this.r * 1.4, 0, -this.r * 2.0, -this.r * 0.5, -this.r * 2.0, this.r * 0.5);
    fill(255);
    circle(this.r * 0.6, -this.r * 0.1, this.r * 0.35);
    fill(40);
    circle(this.r * 0.6, -this.r * 0.1, this.r * 0.18);
    pop();
  }
}
