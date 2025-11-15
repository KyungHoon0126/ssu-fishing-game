/* p5.js Fishing Game - TITLE -> HOWTO -> PLAY
   Controls:
   Left/Right: move boat
   Space: drop / reel
   Up/Down: tension control while hooked
   Flow:
     1) TITLE 화면에서 [시작하기] 버튼 또는 Enter -> HOWTO
     2) HOWTO 화면에서 [게임 시작] 버튼 또는 Enter -> PLAY
        HOWTO 화면 오른쪽 위 [X] 버튼 -> TITLE
*/

let game;
let bgm;

function preload() {
  console.log("preload 시작");
  bgm = loadSound("Resource/Out of Flux - CHONKLAP.mp3", 
    () => console.log("bgm 로드 성공"),
    (err) => console.error("bgm 로드 실패", err)
  );
}

function setup() {
  const c = createCanvas(900, 560);
  c.parent("wrap");

  // 키 입력 받기 위해 캔버스에 포커스 주기
  c.elt.tabIndex = 0;
  c.elt.focus();

  game = new Game();
}

function draw() {
  game.update();
  game.render();
}

// ENTER 인식 헬퍼
function isEnter() {
  return keyCode === ENTER || keyCode === 13 || key === "Enter";
}

function keyPressed() {
  // 상태별 Enter 처리
  if (isEnter()) {
    if (game.state === "TITLE") {
      game.goHowto();
    } else if (game.state === "HOWTO") {
      game.start();
    } else if (game.state === "RESULT") {
      game.reset();
    }
  }

  // SPACE = 낚시줄 내리기/올리기
  if (key === " ") game.hook && game.hook.toggleDrop();
}

function mousePressed() {
  if (game) game.handleMousePressed();
}

/* ---------------- Core Game ---------------- */

class Game {
  constructor() {
    this.state = "TITLE";        // TITLE | HOWTO | PLAY | RESULT
    this.duration = 90;          // 게임 시간 (sec)
    this.startMillis = 0;

    this.score = 0;
    this.best = 0;
    this.caught = 0;

    this.boat = new Boat(width * 0.5, 90);
    this.hook = new Hook(this.boat);

    this.school = [];
    this.spawnFishes(12);
  }

  goHowto() {
    this.state = "HOWTO";
  }

  start() {
    this.state = "PLAY";
    this.startMillis = millis();

    if (bgm && typeof bgm.isPlaying === "function" && typeof bgm.loop === "function") {
      if (!bgm.isPlaying()) {
        bgm.loop();          // 반복 재생
        bgm.setVolume(0.4);  // 볼륨 조절
      }
    } else {
      console.warn("BGM이 아직 준비되지 않았습니다.");
    }
  }

  reset() {
    this.state = "TITLE";
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
    // PLAY 상태에서만 타이머 진행 및 오브젝트 업데이트
    if (this.state === "PLAY" && this.timeLeft() <= 0.01) {
      this.state = "RESULT";
      this.best = max(this.best, this.score);
      this.hook.reset(true);
      if (bgm && typeof bgm.stop === "function" && typeof bgm.isPlaying === "function") {
        if (bgm.isPlaying()) {
          bgm.stop();
        }
      }
    }
    if (this.state !== "PLAY") return;

    this.boat.update();
    for (const f of this.school) f.update();
    this.hook.update();

    // 훅이 내려가는 중일 때만 충돌 체크
    if (!this.hook.fish && this.hook.mode === "DOWN") {
      for (const f of this.school) {
        if (
          !f.caught &&
          dist(this.hook.x, this.hook.y, f.x, f.y) <
            this.hook.r + f.r
        ) {
          this.hook.onHook(f);
          break;
        }
      }
    }

    // 물고기 끌어올리기 성공
    if (this.hook.fish && this.hook.y <= this.boat.hookY()) {
      const f = this.hook.fish;
      f.caught = true;
      this.score += f.score;
      this.caught += 1;
      this.school = this.school.filter((x) => x !== f);
      this.school.push(Fish.random());
      this.hook.reset(false);
    }
  }

  handleMousePressed() {
    const mx = mouseX;
    const my = mouseY;

    if (this.state === "TITLE") {
      // TITLE 화면의 [시작하기] 버튼
      const bw = 220,
        bh = 60;
      const bx = width / 2 - bw / 2;
      const by = height * 0.6;

      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        this.goHowto();
      }
    } else if (this.state === "HOWTO") {
      // HOWTO 화면의 X 버튼 (우상단)
      const xSize = 32;
      const xX = width - xSize - 20;
      const xY = 20;
      if (mx >= xX && mx <= xX + xSize && my >= xY && my <= xY + xSize) {
        this.state = "TITLE";
        return;
      }

      // HOWTO 화면의 [게임 시작] 버튼 (하단 중앙)
      const bw = 220,
        bh = 60;
      const bx = width / 2 - bw / 2;
      const by = height - 100;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        this.start();
      }
    } else if (this.state === "RESULT") {
      // 결과 화면에서 아무 곳이나 클릭 시 TITLE로 돌아가기
      this.reset();
    }
  }

  render() {
    this.drawBackground();

    if (this.state === "TITLE") {
      this.drawTitle("SHOONG SHOONG FISHING");

      this.drawSub("시작하기 버튼을 눌러 진행하세요");

      this.drawButton(
        width / 2 - 110,
        height * 0.6,
        220,
        60,
        "시작하기",
        true
      );

      textAlign(RIGHT, BOTTOM);
      fill(255, 180);
      textSize(14);
      text("Made by 20251669 김경훈, 강성준, 박규리", width - 10, height - 10);

      return;
    }

    if (this.state === "HOWTO") {
      // 어두운 오버레이
      fill(0, 170);
      rect(0, 0, width, height);

      // HOWTO 패널
      const pw = 520,
        ph = 320;
      const px = width / 2 - pw / 2;
      const py = height / 2 - ph / 2;
      noStroke();
      fill(245);
      rect(px, py, pw, ph, 16);

      // 제목
      fill(30);
      textAlign(LEFT, TOP);
      textSize(26);
      text("게임 설명 & 조작법", px + 24, py + 20);

      // 설명 텍스트
      textSize(16);
      textLeading(22);
      const info =
        "- 제한 시간 90초 동안\n" +
        "  가능한 많은 물고기를 잡으세요.\n\n" +
        "- 물고기가 훅에 걸리면 텐션 바를\n" +
        "  안전 구간에 유지하며 끌어올리세요.\n\n" +
        "[조작법]\n" +
        "  ← / → : 보트 이동\n" +
        "  SPACE : 낚시줄 내리기 / 올리기\n" +
        "  ↑ / ↓ : 텐션 조절";
      text(info, px + 24, py + 70);

      // X 버튼 (우상단)
      const xSize = 32;
      const xX = width - xSize - 20;
      const xY = 20;
      fill(255, 230);
      rect(xX, xY, xSize, xSize, 8);
      fill(40);
      textAlign(CENTER, CENTER);
      textSize(20);
      text("X", xX + xSize / 2, xY + xSize / 2);

      // [게임 시작] 버튼 (하단)
      this.drawButton(
        width / 2 - 110,
        height - 100,
        220,
        60,
        "게임 시작",
        true
      );

      return;
    }

    // ---- PLAY & RESULT 공통 배경/오브젝트 ----
    noStroke();
    fill(16, 100, 120);
    rect(0, height - 60, width, 60);

    for (const f of this.school) f.draw();
    this.boat.draw();
    this.hook.draw();
    this.drawUI();

    if (this.state === "RESULT") {
      this.drawTitle("TIME UP!");
      this.drawSub(
        `SCORE ${this.score}  |  BEST ${this.best}  |  ENTER/클릭: 처음으로`
      );
    }
  }

  drawBackground() {
    // 하늘~바다 그라디언트
    noStroke();
    for (let y = 0; y < height; y++) {
      const c = lerpColor(
        color(120, 200, 255),
        color(10, 140, 210),
        y / height
      );
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
    // 상단 바
    noStroke();
    fill(0, 60);
    rect(0, 0, width, 40);

    const t = this.timeLeft();
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(16);
    text(
      `TIME ${nf(floor(t / 60), 2)}:${nf(floor(t % 60), 2)}`,
      12,
      20
    );

    textAlign(CENTER, CENTER);
    text(`SCORE ${this.score}`, width / 2, 20);

    textAlign(RIGHT, CENTER);
    text(`CAUGHT ${this.caught}`, width - 12, 20);

    // 텐션 바
    if (this.hook.fish) {
      const w = 260,
        h = 16,
        x = width / 2 - w / 2,
        y = 50;
      fill(0, 120);
      rect(x, y, w, h, 8);
      fill(80, 220, 120, 160);
      rect(x + w * 0.25, y, w * 0.5, h, 8);
      fill(255);
      const k = this.hook.tension / 100;
      rect(x, y, w * k, h, 8);
      noStroke();
      fill(255);
      textAlign(CENTER, TOP);
      text("TENSION", width / 2, y + h + 4);
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

  // 공용 버튼 그리기
  drawButton(x, y, w, h, label, primary) {
    noStroke();
    if (primary) fill(30, 144, 255);
    else fill(220);
    rect(x, y, w, h, 12);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(label, x + w / 2, y + h / 2);
  }
}

/* ---------------- Entities ---------------- */

class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 4.2;
  }

  update() {
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) this.x += this.speed;
    this.x = constrain(this.x, 80, width - 80);
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

class Hook {
  constructor(boat) {
    this.boat = boat;
    this.reset(true);
  }

  reset(moveToBoat) {
    this.mode = "UP"; // UP | DOWN | HOOKED
    this.fish = null;
    this.tension = 50;
    this.lenMax = height - this.boat.y - 80;
    this.dropSpeed = 5;
    this.reelSpeed = 3.6;
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
    // 보트 따라가기
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
      const pull =
        (noise(frameCount * 0.06 + fish.noiseSeed) - 0.5) *
        fish.strength *
        2.2;
      let input = 0;
      if (keyIsDown(UP_ARROW)) input -= 2.6;
      if (keyIsDown(DOWN_ARROW)) input += 2.6;

      this.tension = constrain(this.tension + pull + input, 0, 100);

      // 텐션이 안전 구간일 때만 끌어올리기
      if (this.tension > 20 && this.tension < 80) {
        this.y -=
          this.reelSpeed *
          map(60 - abs(this.tension - 50), 10, 60, 0.6, 1.6, true);
      }

      if (this.tension >= 100) this.breakLine();
      if (this.tension <= 0) this.escapeFish();

      // 물고기 위치를 훅에 붙이기
      fish.x = lerp(fish.x, this.x, 0.2);
      fish.y = lerp(fish.y, this.y + 18, 0.2);
    }
  }

  onHook(fish) {
    this.fish = fish;
    this.mode = "HOOKED";
    this.tension = 55;
    fish.caught = true; // 싸우는 동안 고정
  }

  breakLine() {
    game.score = max(0, game.score - 5);
    this.fish && (this.fish.caught = false);
    this.fish = null;
    this.mode = "DOWN";
    this.tension = 50;
  }

  escapeFish() {
    this.fish && (this.fish.caught = false);
    this.fish = null;
    this.mode = "DOWN";
    this.tension = 50;
  }

  draw() {
    stroke(70);
    strokeWeight(2);
    line(
      this.boat.x,
      this.boat.hookY() - 32,
      this.x,
      this.y
    );
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
  constructor(x, y, r, speed, strength, score, hue) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = random([-1, 1]) * speed;
    this.vy = (random() - 0.5) * speed * 0.6;
    this.baseSpeed = speed;
    this.strength = strength; // 1~6
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
      // small
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
      // medium
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
      // rare big
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
    this.x +=
      this.vx +
      sin(frameCount * 0.03 + this.noiseSeed) * 0.4;
    this.y +=
      this.vy +
      cos(frameCount * 0.02 + this.noiseSeed) * 0.3;
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
    triangle(
      -this.r * 1.4,
      0,
      -this.r * 2.0,
      -this.r * 0.5,
      -this.r * 2.0,
      this.r * 0.5
    );
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
