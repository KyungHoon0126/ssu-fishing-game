/* p5.js Fishing Game - Mouse Move + Space Timing (Dynamic Difficulty)
   Controls:
   Mouse X            : move boat
   Mouse Click        : drop / reel (라인 올리기/내리기)
   Enter / Click      : start / restart
   ★ Hooked 상태에서:
      - 화면 상단 게이지 바에 마커가 중앙을 지날 때
        스페이스바를 누르면 물고기가 한 칸씩 위로 올라온다.
   ★ 변경 사항:
      1. 기본 캐치 범위를 넓게
      2. 물고기 크기가 클수록 캐치 범위가 점점 좁아짐
      3. 물고기 크기가 클수록 게이지 마커 속도가 빨라짐
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

  // ★ 플레이 중 스페이스바로 캐치 타이밍 판정
  if (game.state === "PLAY" && key === ' ') {
    game.handleGaugeHit();
  }
}

// ★ 클릭으로 시작/재시작 + 플레이 중엔 캐스팅/리트리브
function mousePressed() {
  if (game.state === "MENU") game.start();
  else if (game.state === "RESULT") game.reset();
  else if (game.state === "PLAY") {
    // 물고기에 훅이 걸려있지 않을 때만 라인 토글
    if (!game.hook.fish) {
      game.hook.toggleDrop();
    }
  }
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

    // ★ 스페이스 타이밍 게이지 관련 상태 (동적 난이도 파라미터 포함)
    this.gauge = {
      x: width / 2,
      y: 80,
      w: 260,
      h: 16,

      // 물고기 크기에 따라 달라지는 범위/속도 설정
      minR: 10,           // 물고기 최소 반지름 (기준)
      maxR: 28,           // 물고기 최대 반지름 (기준)
      baseTolerance: 40,  // 가장 작은 물고기 기준 허용 범위 (픽셀)
      minToleranceFactor: 0.4, // 가장 큰 물고기는 이 비율까지 감소 (0~1)

      speedMin: 0.035,    // 가장 작은 물고기 게이지 속도
      speedMax: 0.085,    // 가장 큰 물고기 게이지 속도

      currentTolerance: 26 // 매 프레임 실제 사용할 허용 범위
    };

    this.gaugePhase = 0;        // 마커 위치 계산용 위상
    this.gaugeActive = false;   // 훅킹 중에만 true
    this.gaugeLastHit = 0;      // 최근 성공 타이밍 (이펙트용)
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
    // 타이머 종료 → 결과 화면 전환
    if (this.state === "PLAY" && this.timeLeft() <= 0.01) {
      this.state = "RESULT";
      this.best = max(this.best, this.score);
      this.hook.reset(true);
    }
    if (this.state !== "PLAY") return;

    this.boat.update();
    for (const f of this.school) f.update();
    this.hook.update();

    // 훅이 내려가는 중 & 아직 물고기를 훅킹하지 않았을 때 충돌 판정
    if (!this.hook.fish && this.hook.mode === "DOWN") {
      for (const f of this.school) {
        if (!f.caught && dist(this.hook.x, this.hook.y, f.x, f.y) < this.hook.r + f.r) {
          this.hook.onHook(f);
          break;
        }
      }
    }

    // 훅킹된 물고기가 수면까지 올라왔는지 체크
    if (this.hook.fish && this.hook.y <= this.boat.hookY()) {
      const f = this.hook.fish;
      f.caught = true;  // 최종 획득
      this.score += f.score;
      this.caught += 1;
      this.school = this.school.filter(x => x !== f);
      this.school.push(Fish.random());
      this.hook.reset(false);
    }

    // ★ 훅킹 중일 때만 게이지 마커 애니메이션 활성화 + 동적 난이도 계산
    if (this.hook.fish && this.hook.mode === "HOOKED") {
      this.gaugeActive = true;

      const fishR = this.hook.fish.r;
      const g = this.gauge;

      // 물고기 크기를 0~1로 정규화
      const normR = map(fishR, g.minR, g.maxR, 0, 1, true);

      // (1) 캐치 허용 범위: 작은 물고기→넓음, 큰 물고기→좁음
      const factor = lerp(1.0, g.minToleranceFactor, normR); // r 커질수록 factor 감소
      g.currentTolerance = g.baseTolerance * factor;

      // (2) 게이지 속도: 작은 물고기→느림, 큰 물고기→빠름
      const speed = lerp(g.speedMin, g.speedMax, normR);
      this.gaugePhase += speed;

    } else {
      this.gaugeActive = false;
    }
  }

  render() {
    this.drawBackground();

    if (this.state === "MENU") {
      this.drawTitle("FISHING DAY");
      this.drawSub("마우스로 배 이동, 클릭으로 낚시, 마커 중앙에 맞춰 SPACE로 끌어올리기, ENTER/클릭 시작");
      return;
    }

    // 바닥 영역
    noStroke();
    fill(16, 100, 120);
    rect(0, height - 60, width, 60);

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
    // 수면 그라디언트
    noStroke();
    for (let y = 0; y < height; y++) {
      const c = lerpColor(color(120, 200, 255), color(10, 140, 210), y / height);
      stroke(c);
      line(0, y, width, y);
    }

    // 수면 파동 라인
    stroke(255, 255, 255, 60);
    strokeWeight(3);
    const surfaceY = this.boat.y + 20;
    for (let x = 0; x < width; x += 16) {
      const y = surfaceY + sin((frameCount * 0.05 + x) * 0.05) * 3;
      line(x, y, x + 12, y);
    }
  }

  drawUI() {
    // 상단 HUD 배경
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

    // ★ 스페이스 타이밍 게이지 (HOOKED 상태에서만 표시)
    if (this.gaugeActive) {
      const gx = this.gauge.x;
      const gy = this.gauge.y;
      const gw = this.gauge.w;
      const gh = this.gauge.h;

      // 게이지 바 배경
      noStroke();
      fill(0, 120);
      rect(gx - gw / 2, gy, gw, gh, 8);

      // 중앙 기준 라인
      stroke(255, 120);
      strokeWeight(2);
      line(gx, gy, gx, gy + gh);

      // 마커 위치 (sin 파형으로 좌우 왕복)
      const tt = (sin(this.gaugePhase) * 0.5 + 0.5); // 0 ~ 1
      const markerX = lerp(gx - gw / 2 + 8, gx + gw / 2 - 8, tt);

      // 최근 성공 타이밍 시 살짝 반짝이는 효과
      const flash = (millis() - this.gaugeLastHit < 150) ? 255 : 220;

      noStroke();
      fill(255, flash);
      circle(markerX, gy + gh / 2, gh * 1.3);

      // 안내 텍스트
      noStroke();
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

  // ★ 스페이스바 입력 시 타이밍 판정
  //   - 마커가 "게이지 중앙" 근처일 때만 성공
  //   - 성공하면 훅이 한 칸 위로 올라감
  handleGaugeHit() {
    if (!this.gaugeActive) return;

    const gx = this.gauge.x;
    const gw = this.gauge.w;
    const tolerance = this.gauge.currentTolerance || this.gauge.baseTolerance;

    // 현재 마커 위치 계산(그림과 동일한 공식 사용)
    const tt = (sin(this.gaugePhase) * 0.5 + 0.5);
    const markerX = lerp(gx - gw / 2 + 8, gx + gw / 2 - 8, tt);

    // "정중앙" 기준으로 허용 범위 내인지 체크
    const centerX = gx;
    const distFromCenter = abs(markerX - centerX);

    if (distFromCenter <= tolerance) {
      // ★ 퍼펙트 타이밍 성공 → 훅에 보너스 적용 (한 칸 위로)
      this.hook.pullStep();

      // 성공 이펙트 시간 기록
      this.gaugeLastHit = millis();
    } else {
      // 실패 시 별다른 패널티 없음 (원하면 추가 가능)
    }
  }
}

/* ---------------- Entities ---------------- */

class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  update() {
    // ★ 마우스 X로만 이동
    this.x = constrain(mouseX, 80, width - 80);
  }

  hookY() {
    return this.y + 26;
  }

  draw() {
    push();
    translate(this.x, this.y);

    // 배
    noStroke();
    fill(250);
    rect(-70, -18, 140, 36, 12);
    fill(40, 120, 200);
    rect(-70, 0, 140, 18, 0, 0, 12, 12);

    // 캐빈
    fill(255, 240, 220);
    rect(-20, -34, 46, 20, 6);
    fill(40, 120, 200);
    circle(6, -24, 10);

    // 깃대
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
    this.mode = "UP";  // UP | DOWN | HOOKED
    this.fish = null;
    this.lenMax = height - this.boat.y - 80;
    this.dropSpeed = 5;
    this.reelSpeed = 3.6;
    this.stepHeight = 16; // ★ 타이밍 성공 시 한 번에 올라가는 거리

    if (moveToBoat) {
      this.x = this.boat.x;
      this.y = this.boat.hookY();
    }
  }

  toggleDrop() {
    if (game.state !== "PLAY") return;
    if (this.fish) return;
    this.mode = (this.mode === "DOWN") ? "UP" : "DOWN";
  }

  get r() {
    return 10;
  }

  update() {
    // 훅 X는 보트 쪽으로 자연스럽게 끌려감
    this.x = lerp(this.x, this.boat.x, 0.35);

    if (this.mode === "DOWN") {
      this.y += this.dropSpeed;
      const maxY = this.boat.hookY() + this.lenMax;
      if (this.y >= maxY) this.mode = "UP";
    } else if (this.mode === "UP") {
      // 물고기가 훅킹되지 않았을 때만 자동으로 위로 감김
      if (!this.fish) {
        this.y -= this.reelSpeed;
        if (this.y <= this.boat.hookY()) this.y = this.boat.hookY();
      }
    } else if (this.mode === "HOOKED" && this.fish) {
      const fish = this.fish;

      // ★ 자동으로 위로 올라가지 않음
      //    (pullStep()이 호출될 때만 stepHeight만큼 위로 이동)

      // 물고기 위치는 훅을 따라 천천히 이동
      fish.x = lerp(fish.x, this.x, 0.2);
      fish.y = lerp(fish.y, this.y + 18, 0.2);
    }
  }

  onHook(fish) {
    this.fish = fish;
    this.mode = "HOOKED";
    fish.caught = true;  // 더 이상 자유롭게 움직이지 않음
  }

  // ★ 스페이스 타이밍 퍼펙트 시 호출: 한 칸씩 위로 끌어올림
  pullStep() {
    if (this.mode !== "HOOKED" || !this.fish) return;

    this.y -= this.stepHeight;
    if (this.y < this.boat.hookY()) {
      this.y = this.boat.hookY();
    }
  }

  draw() {
    // 줄
    stroke(70);
    strokeWeight(2);
    line(this.boat.x, this.boat.hookY() - 32, this.x, this.y);

    // 훅 몸통
    noStroke();
    fill(230);
    circle(this.x, this.y, this.r * 2);

    // 바늘 모양
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
    this.strength = strength;  // 현재는 사용 안 하지만 확장 가능
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
      // 큰 물고기 (희귀)
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

    // 몸통
    ellipse(0, 0, this.r * 2.2, this.r * 1.3);
    // 꼬리
    triangle(
      -this.r * 1.4, 0,
      -this.r * 2.0, -this.r * 0.5,
      -this.r * 2.0, this.r * 0.5
    );

    // 눈
    fill(255);
    circle(this.r * 0.6, -this.r * 0.15, this.r * 0.35);
    fill(40);
    circle(this.r * 0.6, -this.r * 0.15, this.r * 0.18);

    // 큰 물고기 강조 링
    if (this.score >= 20) {
      stroke(255, 220);
      noFill();
      strokeWeight(1.2);
      ellipse(0, 0, this.r * 2.5, this.r * 1.5);
    }

    pop();
  }
}