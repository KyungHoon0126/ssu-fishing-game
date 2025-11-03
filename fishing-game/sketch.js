/* -----------------------------------------------------
  p5.js Fishing (MVP)  —  controls:
  ←/→ : move boat,  Space : drop/retract hook,
  ↑/↓ : adjust tension (while hooked); ↑ also reels up.
----------------------------------------------------- */

let game; // holds state machine

function setup() {
  createCanvas(900, 560);
  game = new Game();
}

function draw() {
  game.update();
  game.render();
}

// -------------------- Game State --------------------
class Game {
  constructor() {
    this.state = "MENU"; // MENU | PLAY | RESULT
    this.timer = 60;     // seconds
    this.score = 0;
    this.best = 0;
    this.boat = new Boat(width / 2, 110);
    this.hook = new Hook(this.boat);
    this.school = [];
    this.fx = new FX();
    this.spawnFishes(14);
    this.countdownLast = millis();
  }

  reset() {
    this.timer = 60;
    this.score = 0;
    this.boat = new Boat(width / 2, 110);
    this.hook = new Hook(this.boat);
    this.school = [];
    this.spawnFishes(14);
    this.state = "PLAY";
    this.countdownLast = millis();
  }

  spawnFishes(n) {
    for (let i = 0; i < n; i++) {
      const type = random(["small", "mid", "rare"]);
      this.school.push(new Fish(random(width), random(220, height - 50), type));
    }
  }

  update() {
    if (this.state !== "PLAY") return;

    // timer
    const now = millis();
    if (now - this.countdownLast >= 1000) {
      this.timer--;
      this.countdownLast = now;
      if (this.timer <= 0) {
        this.best = max(this.best, this.score);
        this.state = "RESULT";
      }
    }

    this.boat.update();
    this.hook.update();

    // fishes
    for (const f of this.school) f.update();

    // hook hit test
    if (!this.hook.fish) {
      for (const f of this.school) {
        if (!f.caught && dist(this.hook.x, this.hook.y, f.x, f.y) < this.hook.r + f.r) {
          this.hook.hookFish(f);
          break;
        }
      }
    }

    // land success
    if (this.hook.landedFish) {
      const f = this.hook.landedFish;
      this.score += f.score;
      this.fx.pop(this.boat.x, this.boat.y + 10, `+${f.score}`);
      // respawn that fish
      const idx = this.school.indexOf(f);
      if (idx >= 0) this.school.splice(idx, 1);
      this.school.push(new Fish(random(width), random(220, height - 50), random(["small", "mid", "rare"])));
      this.hook.landedFish = null;
    }
  }

  render() {
    drawSea();
    if (this.state === "MENU") this.drawMenu();
    if (this.state === "PLAY") this.drawPlay();
    if (this.state === "RESULT") this.drawResult();
    this.fx.render();
  }

  drawPlay() {
    // seabed deco
    drawSeabed();

    // fishes
    for (const f of this.school) f.draw();

    // boat & hook/UI
    this.boat.draw();
    this.hook.draw();

    // HUD
    noStroke();
    fill(255, 240);
    rect(16, 16, 190, 70, 10);
    fill(30);
    textSize(16);
    textStyle(BOLD);
    text(`SCORE  ${nf(this.score, 4)}`, 28, 40);
    text(`TIME   ${this.timer}s`, 28, 66);

    // tension gauge when hooked
    if (this.hook.fish) {
      drawTension(this.hook.tension, this.hook.safeMin, this.hook.safeMax);
    }
  }

  drawMenu() {
    this.boat.draw();
    this.hook.drawRopeOnly();

    fill(255, 240);
    rect(width / 2 - 260, height / 2 - 110, 520, 220, 18);
    fill(20);
    textAlign(CENTER, CENTER);
    textSize(32);
    textStyle(BOLD);
    text("Fishing Day", width / 2, height / 2 - 35);
    textSize(16);
    textStyle(NORMAL);
    text("←/→ 보트 이동   Space 훅 내리기/올리기   ↑/↓ 텐션 조절\n제한시간 안에 많이 잡아보세요!", width / 2, height / 2 + 10);
    textSize(14);
    text("Press ENTER to Start", width / 2, height / 2 + 60);
    textAlign(LEFT, BASELINE);
  }

  drawResult() {
    this.boat.draw();
    this.hook.drawRopeOnly();

    fill(255, 240);
    rect(width / 2 - 260, height / 2 - 120, 520, 240, 18);
    fill(20);
    textAlign(CENTER, CENTER);
    textSize(30);
    textStyle(BOLD);
    text("Result", width / 2, height / 2 - 55);
    textSize(18);
    textStyle(NORMAL);
    text(`Score : ${this.score}\nBest  : ${this.best}`, width / 2, height / 2 + 0);
    textSize(14);
    text("ENTER: Restart   |   M: Menu", width / 2, height / 2 + 60);
    textAlign(LEFT, BASELINE);
  }
}

// -------------------- Boat --------------------
class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 4.2;
  }
  update() {
    if (keyIsDown(LEFT_ARROW)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.x += this.speed;
    this.x = constrain(this.x, 60, width - 60);
  }
  draw() {
    // simple cartoon boat
    push();
    translate(this.x, this.y);
    noStroke();
    // hull
    fill(255, 140, 90);
    rectMode(CENTER);
    rect(0, 18, 160, 28, 12);
    quad(-80, 18, 80, 18, 60, 36, -60, 36);
    // cabin
    fill(240);
    rect(-20, -6, 70, 26, 6);
    fill(80, 150, 250, 220);
    rect(-30, -8, 18, 14, 3);
    rect(-10, -8, 18, 14, 3);
    // mast
    stroke(80);
    strokeWeight(3);
    line(30, -35, 30, 15);
    // bobbing
    pop();
  }
}

// -------------------- Hook (line + mini-game) --------------------
class Hook {
  constructor(boat) {
    this.boat = boat;
    this.surfaceY = boat.y + 36;
    this.x = boat.x + 30;
    this.y = this.surfaceY;
    this.targetY = this.surfaceY;
    this.dropSpeed = 6;
    this.r = 10;

    this.fish = null;         // currently hooked fish
    this.landedFish = null;   // set when landed
    this.tension = 0;         // 0..100
    this.safeMin = 20;        // safe zone for steady reel
    this.safeMax = 75;
  }

  toggleDrop() {
    if (this.fish) return; // cannot toggle while fighting
    // drop if near surface, else retract
    if (this.targetY <= this.surfaceY + 5) {
      this.targetY = height - 40; // drop
    } else {
      this.targetY = this.surfaceY; // retract
    }
  }

  hookFish(f) {
    f.caught = true;
    this.fish = f;
    this.tension = 50;
  }

  breakLine() {
    // fail: fish escapes
    if (this.fish) {
      this.fish.escape();
      this.fish = null;
      this.tension = 0;
      this.targetY = this.surfaceY; // retract automatically
    }
  }

  landFish() {
    // success
    if (this.fish) {
      this.fish.landed();
      this.landedFish = this.fish;
      this.fish = null;
      this.tension = 0;
    }
  }

  reelInput() {
    // ↑ reduces tension & pulls up, ↓ increases a bit
    let delta = 0;
    if (keyIsDown(UP_ARROW)) delta -= 1.5;
    if (keyIsDown(DOWN_ARROW)) delta += 1.0;
    return delta;
  }

  update() {
    // rope follows boat
    this.x = this.boat.x + 30;

    // free dropping/retracting when no fish
    if (!this.fish) {
      const dir = this.targetY - this.y;
      this.y += constrain(dir, -this.dropSpeed, this.dropSpeed);
      // clamp
      this.y = constrain(this.y, this.surfaceY, height - 30);
      return;
    }

    // fighting mini-game
    const f = this.fish;

    // fish random force (harder for rarer fish)
    const jitter = (noise(frameCount * 0.07 + f.seed) - 0.5) * f.strength * 1.4;
    const surge = sin(frameCount * (0.05 + f.strength * 0.01)) * f.strength * 0.4;
    this.tension += jitter + surge;

    // player input effect
    this.tension += this.reelInput();

    // natural relaxation
    this.tension -= 0.3;
    this.tension = constrain(this.tension, 0, 100);

    // move hook and fish together (if safe, reel up)
    if (this.tension >= 100) this.breakLine();

    // safe zone: slow reel up
    const inSafe = this.tension > this.safeMin && this.tension < this.safeMax;
    if (inSafe && keyIsDown(UP_ARROW)) {
      this.y -= 2.2;
      f.y = this.y; f.x += (this.x - f.x) * 0.15;
    } else {
      // fish drags around the hook
      const pull = map(this.tension, 0, 100, 0.4, 3.0);
      const angle = noise(frameCount * 0.05 + f.seed) * TAU;
      this.x += cos(angle) * pull * 0.4;
      this.y += sin(angle) * pull * 0.3;
      f.x += (this.x - f.x) * 0.25;
      f.y += (this.y - f.y) * 0.25;
    }

    // boundaries
    this.x = constrain(this.x, 20, width - 20);
    this.y = constrain(this.y, this.surfaceY, height - 30);

    // landed?
    if (this.y <= this.surfaceY + 2) this.landFish();
  }

  draw() {
    // rope
    stroke(60);
    strokeWeight(2);
    line(this.boat.x + 30, this.surfaceY - 10, this.x, this.y - 8);

    // hook head
    noStroke();
    fill(240);
    circle(this.x, this.y, this.r * 2);
    stroke(60);
    strokeWeight(3);
    noFill();
    arc(this.x, this.y + 6, 20, 16, 0, PI); // little hook shape
  }

  drawRopeOnly() {
    stroke(60);
    strokeWeight(2);
    line(this.boat.x + 30, this.surfaceY - 10, this.x, this.y - 8);
  }
}

// -------------------- Fish --------------------
class Fish {
  constructor(x, y, type = "small") {
    this.x = x;
    this.y = y;
    this.type = type;
    this.seed = random(1000);
    this.caught = false;
    this.dir = random([1, -1]);
    if (type === "small") {
      this.r = 12; this.speed = 1.5; this.strength = 8;  this.score = 50;
      this.color = color(255, 180, 70);
    } else if (type === "mid") {
      this.r = 18; this.speed = 1.2; this.strength = 14; this.score = 120;
      this.color = color(90, 200, 240);
    } else {
      this.r = 24; this.speed = 1.1; this.strength = 22; this.score = 300; // rare
      this.color = color(180, 120, 255);
    }
  }

  update() {
    if (this.caught) return; // follow hook while caught (handled by Hook)

    // wandering swim
    const nx = noise(frameCount * 0.01 + this.seed);
    const ny = noise(frameCount * 0.015 + this.seed + 99);
    this.x += (nx - 0.5) * 4 * this.speed * this.dir;
    this.y += (ny - 0.5) * 3 * this.speed;

    // bounds + gentle current
    this.x += sin(frameCount * 0.003 + this.seed) * 0.6;
    this.y += sin(frameCount * 0.004 + this.seed) * 0.5;

    if (this.x < 20 || this.x > width - 20) this.dir *= -1;
    this.x = constrain(this.x, 20, width - 20);
    this.y = constrain(this.y, 210, height - 30);
  }

  draw() {
    push();
    translate(this.x, this.y);
    noStroke();
    fill(this.color);
    // body
    ellipse(0, 0, this.r * 2.2, this.r * 1.4);
    // tail
    triangle(-this.r * 1.6, 0, -this.r * 0.8, -this.r * 0.7, -this.r * 0.8, this.r * 0.7);
    // eye
    fill(255);
    circle(this.r * 0.6, -2, 6);
    fill(20);
    circle(this.r * 0.6, -2, 2.8);
    pop();
  }

  escape() {
    this.caught = false;
    // dash away
    this.x += random([-1, 1]) * 50;
    this.y += random(-30, 30);
  }

  landed() {
    this.caught = false;
    // nothing else; Game will respawn
  }
}

// -------------------- Visual FX --------------------
class FX {
  constructor() { this.items = []; }
  pop(x, y, label) {
    this.items.push({ x, y, a: 255, s: 1, t: label });
  }
  render() {
    for (const it of this.items) {
      it.y -= 0.6;
      it.a -= 3;
      it.s += 0.02;
    }
    this.items = this.items.filter(it => it.a > 0);
    push();
    textAlign(CENTER, CENTER);
    for (const it of this.items) {
      fill(255, it.a);
      textSize(18 * it.s);
      textStyle(BOLD);
      text(it.t, it.x, it.y);
    }
    pop();
  }
}

// -------------------- Helpers & UI --------------------
function keyPressed() {
  if (keyCode === 32) { // Space
    if (game.state === "PLAY") game.hook.toggleDrop();
  }
  if (keyCode === ENTER) {
    if (game.state === "MENU") game.reset();
    else if (game.state === "RESULT") game.reset();
  }
  if (key === 'M' || key === 'm') {
    if (game.state === "RESULT") game.state = "MENU";
  }
}

function drawSea() {
  background(40, 170, 230);
  noStroke();
  // sky gradient
  for (let i = 0; i < 160; i++) {
    const c = lerpColor(color(180, 220, 255), color(90, 180, 255), i / 160);
    stroke(c); line(0, i, width, i);
  }
  noStroke();
  // parallax waves
  for (let layer = 0; layer < 3; layer++) {
    const baseY = 160 + layer * 18;
    fill(20, 140 + layer * 10, 210, 140);
    beginShape();
    vertex(0, height);
    for (let x = 0; x <= width; x += 8) {
      const y = baseY + sin((frameCount * 0.02 + x * 0.02) + layer) * (6 + layer * 3);
      vertex(x, y);
    }
    vertex(width, height);
    endShape(CLOSE);
  }
}

function drawSeabed() {
  // corals / sand
  noStroke();
  fill(240, 200, 120, 200);
  rect(0, height - 40, width, 40);
  for (let i = 0; i < width; i += 60) {
    fill(255, 170, 80, 200);
    ellipse(i + 20, height - 28, 12, 12);
  }
  // some plants
  for (let i = 0; i < width; i += 120) {
    push();
    translate(i + 40, height - 38);
    stroke(40, 160, 100, 200);
    strokeWeight(3);
    noFill();
    for (let k = 0; k < 4; k++) {
      const h = 18 + k * 6;
      bezier(0, 0, 6, -h * 0.3, -6, -h * 0.6, 0, -h);
    }
    pop();
  }
}

function drawTension(val, safeMin, safeMax) {
  const x = width - 220, y = 20, w = 200, h = 18;
  noStroke();
  fill(255, 240);
  rect(x - 10, y - 10, w + 20, 56, 10);
  fill(30);
  textSize(14);
  textStyle(BOLD);
  text("TENSION", x - 2, y - 14);

  // bar bg
  fill(230);
  rect(x, y, w, h, 6);

  // safe zone
  fill(120, 220, 140);
  rect(x + (safeMin / 100) * w, y, (safeMax - safeMin) / 100 * w, h, 6);

  // current
  fill(240, 80, 80);
  rect(x, y, (val / 100) * w, h, 6);
}
