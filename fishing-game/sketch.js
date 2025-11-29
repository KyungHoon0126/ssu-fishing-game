/* p5.js Fishing Game - Mouse Move + Space Timing */

let game;
let bgm;

const SEASON_DATA = {
  SPRING: {
    label: "봄",
    fishes: [
      { name: "벚꽃멸치", r: 12, speed: [1.5, 2.1], score: 5, color: [255, 127, 80] },
      { name: "청연어", r: 16, speed: [1.2, 1.9], score: 10, color: [80, 180, 255] },
      { name: "벚꽃돔", r: 20, speed: [1.0, 1.6], score: 15, color: [255, 195, 110] },
      { name: "분홍농어", r: 22, speed: [0.9, 1.5], score: 18, color: [250, 160, 190] },
      { name: "벚해삼", r: 26, speed: [0.8, 1.3], score: 25, color: [120, 210, 255] }
    ]
  },
  SUMMER: {
    label: "여름",
    fishes: [
      { name: "노랑망둥어", r: 12, speed: [1.6, 2.3], score: 6, color: [255, 205, 80] },
      { name: "은갈치", r: 16, speed: [1.4, 2.0], score: 10, color: [220, 240, 255] },
      { name: "파랑숭어", r: 20, speed: [1.2, 1.8], score: 15, color: [60, 140, 255] },
      { name: "황금참돔", r: 22, speed: [1.0, 1.6], score: 18, color: [255, 210, 90] },
      { name: "해태", r: 26, speed: [0.9, 1.4], score: 25, color: [80, 220, 200] }
    ]
  },
  AUTUMN: {
    label: "가을",
    fishes: [
      { name: "주홍전갱이", r: 12, speed: [1.4, 2.0], score: 6, color: [220, 120, 70] },
      { name: "가을도미", r: 16, speed: [1.2, 1.9], score: 10, color: [255, 180, 90] },
      { name: "단풍고등어", r: 20, speed: [1.0, 1.6], score: 15, color: [175, 75, 50] },
      { name: "낙엽농어", r: 22, speed: [0.9, 1.4], score: 18, color: [200, 150, 110] },
      { name: "붉은장어", r: 26, speed: [0.8, 1.3], score: 25, color: [120, 70, 50] }
    ]
  },
  WINTER: {
    label: "겨울",
    fishes: [
      { name: "빙어", r: 12, speed: [1.3, 1.9], score: 6, color: [210, 220, 255] },
      { name: "눈송장어", r: 16, speed: [1.1, 1.8], score: 10, color: [180, 200, 240] },
      { name: "얼음방어", r: 20, speed: [0.9, 1.5], score: 15, color: [120, 170, 255] },
      { name: "설돔", r: 22, speed: [0.8, 1.3], score: 18, color: [235, 240, 250] },
      { name: "혹한가자미", r: 26, speed: [0.7, 1.2], score: 25, color: [100, 200, 210] }
    ]
  }
};

function preload() {
  console.log("preload 시작");
  bgm = loadSound("Resources/Out of Flux - CHONKLAP.mp3", 
    () => console.log("bgm 로드 성공"),
    (err) => console.error("bgm 로드 실패", err)
  );
}

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
  const lowerKey = (key || "").toLowerCase();

  if (game.state === "MENU" && isEnter()) {
    game.showInfo();
  } else if (game.state === "INFO") {
    if (isEnter()) game.start();
    if (lowerKey === "x") game.closeInfo();
  } else if (game.state === "RESULT" && isEnter()) {
    game.reset();
  }

  // 스페이스 → 타이밍 판정
  if (game.state === "PLAY" && key === " ") {
    game.handleGaugeHit();
  }

  if (game.state === "PLAY") {
    const isHooked = game.hook && game.hook.fish && game.hook.mode === "HOOKED";
    
    if (!isHooked) {
      if (keyCode === LEFT_ARROW) {
        game.boat.moveLeft();
      } else if (keyCode === RIGHT_ARROW) {
        game.boat.moveRight();
      }
    }

    if (keyCode === DOWN_ARROW) {
      if (!game.hook.fish) game.hook.toggleDrop();
    }
  }
}

function keyReleased() {
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    if (game && game.boat) game.boat.stop();
  }
}

function mousePressed() {
  if (game.state === "MENU") {
    if (game.handleSeasonTabClick(mouseX, mouseY)) return;
    const btn = game.menuButtonBounds();
    if (game.isPointInRect(mouseX, mouseY, btn)) game.showInfo();
  } else if (game.state === "INFO") {
    const startBtn = game.infoStartButtonBounds();
    const closeBtn = game.infoCloseButtonBounds();

    if (game.isPointInRect(mouseX, mouseY, startBtn)) {
      game.start();
    } else if (game.isPointInRect(mouseX, mouseY, closeBtn)) {
      game.closeInfo();
    }
  } else if (game.state === "RESULT") {
    game.reset();
  }
}

function mouseWheel(event) {
  if (game.state !== "INFO" || game.infoScrollMax <= 0) return;
  const scrollSpeed = 0.35;
  const delta = event.delta || event.deltaY || 0;
  game.infoScroll = constrain(
    game.infoScroll + delta * scrollSpeed,
    0,
    game.infoScrollMax
  );
  return false;
}

/* ---------------- Game ---------------- */

class Game {
  constructor() {
    this.state = "MENU";      // MENU | INFO | PLAY | RESULT
    this.season = "SPRING";
    this.duration = 90;
    this.startMillis = 0;

    this.score = 0;
    this.best = 0;
    this.caught = 0;
    this.fishScoreMap = {};

    this.boat = new Boat(width * 0.5, 90);
    this.hook = new Hook(this.boat);

    this.school = [];
    this.spawnFishes(12);
    this.particles = [];

    this.infoLines = [
      "[게임 목표]",
      "- 90초 안에 더 많은 물고기를 낚아 높은 점수를 노리세요.",
      "",
      "[조작법]",
      "- ← / → 키: 배 좌우 이동",
      "- ↓ 키: 낚싯바늘 올리기/내리기",
      "- SPACE: 게이지 타이밍 성공 시 당기기",
      "- ENTER: 선택/시작, X: 설명 닫기",
      "",
      "[TIP]",
      "- 큰 물고기일수록 게이지 범위가 좁아집니다.",
      "- 연타 페널티가 있으니 타이밍을 노려보세요."
    ];

    this.infoScroll = 0;
    this.infoScrollMax = 0;
    this.authorCredit = "20251669 김경훈\n20253308 강성준\n20241095 박규리";

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

    this.gaugeEffect = "";
    this.gaugeEffectTime = 0;
  }

  setSeason(season) {
    if (!SEASON_DATA[season] || this.season === season) return;
    this.season = season;
    if (this.state !== "PLAY") {
      this.school = [];
      this.spawnFishes(12);
    }
  }

  start() {
    this.state = "PLAY";
    this.startMillis = millis();
    this.fishScoreMap = {};
    this.particles = [];

    if (bgm && typeof bgm.isPlaying === "function" && typeof bgm.loop === "function") {
      if (!bgm.isPlaying()) {
        bgm.loop();          // 반복 재생
        bgm.setVolume(0.4);  // 볼륨 조절
      }
    } else {
      console.warn("BGM이 아직 준비되지 않았습니다.");
    }
  }

  showInfo() {
    this.state = "INFO";
    this.infoScroll = 0;
    this.infoScrollMax = 0;
  }

  closeInfo() {
    this.state = "MENU";
  }

  reset() {
    this.state = "MENU";
    this.score = 0;
    this.caught = 0;
    this.hook.reset(true);
    this.school = [];
    this.spawnFishes(12);
    this.particles = [];
  }

  spawnFishes(n) {
    for (let i = 0; i < n; i++) this.school.push(Fish.randomBySeason(this.season));
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
      if (bgm && typeof bgm.stop === "function" && typeof bgm.isPlaying === "function") {
        if (bgm.isPlaying()) {
          bgm.stop();
        }
      }
    }
    this.updateParticles();
    if (this.state !== "PLAY") return;

    this.boat.update();
    for (const f of this.school) f.update();
    this.hook.update();

    // 훅 → 물고기 충돌
    if (!this.hook.fish && this.hook.mode === "DOWN") {
      for (const f of this.school) {
        if (!f.caught && dist(this.hook.x, this.hook.y, f.x, f.y) < this.hook.r + f.r) {
          this.hook.onHook(f);
          this.gaugeLastHit = millis();      // 훅킹 시 기준 시간
          this.spaceSpamStreak = 0;
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
      const label = f.name || "FISH";
      this.fishScoreMap[label] = (this.fishScoreMap[label] || 0) + f.score;
      this.school = this.school.filter(x => x !== f);
      this.school.push(Fish.randomBySeason(this.season));
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

      // 일정 시간 히트 없으면 이탈
      const timeout = 2500;
      if (this.gaugeLastHit > 0 && millis() - this.gaugeLastHit > timeout) {
        this.hook.forceEscape();
      }
    } else {
      this.gaugeActive = false;
    }
  }

  render() {
    this.drawBackground();
    this.drawParticles();

    if (this.state === "MENU") {
      this.drawMenuScreen();
      return;
    }

    if (this.state === "INFO") {
      this.drawInfoScreen();
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
    const bgPreset = {
      SPRING: { top: color(205, 235, 255), bottom: color(80, 160, 210) },
      SUMMER: { top: color(80, 200, 255), bottom: color(0, 100, 180) },
      AUTUMN: { top: color(170, 210, 240), bottom: color(30, 90, 140) },
      WINTER: { top: color(200, 220, 245), bottom: color(60, 90, 150) }
    }[this.season] || { top: color(120, 200, 255), bottom: color(10, 140, 210) };

    noStroke();
    for (let y = 0; y < height; y++) {
      const c = lerpColor(bgPreset.top, bgPreset.bottom, y / height);
      stroke(c);
      line(0, y, width, y);
    }

    stroke(255, 255, 255, 70);
    strokeWeight(2.5);
    const surfaceY = this.boat.y + 20;
    for (let x = 0; x < width; x += 16) {
      const y = surfaceY + sin((frameCount * 0.05 + x * 0.05)) * 3;
      line(x, y, x + 12, y);
    }

    if (this.season === "SUMMER") this.drawSeaweed();
    else if (this.season === "SPRING") this.drawSpringAnemones();
    else if (this.season === "AUTUMN") this.drawAutumnRocks();
    else if (this.season === "WINTER") this.drawWinterIceFloes();
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

    if (this.gaugeEffect && millis() - this.gaugeEffectTime < 400) {
      const elapsed = millis() - this.gaugeEffectTime;
      const dur = 400;
      const tFade = constrain(elapsed / dur, 0, 1);
      const alpha = 255 * (1 - tFade);
      const floatOffset = -4 - 6 * tFade;

      textAlign(LEFT, CENTER);
      textSize(18);

      let label = "";
      if (this.gaugeEffect === "PERFECT") {
        fill(255, 255, 120, alpha);
        label = "PERFECT!";
      } else if (this.gaugeEffect === "HIT") {
        fill(120, 255, 120, alpha);
        label = "HIT!";
      } else if (this.gaugeEffect === "MISS") {
        fill(255, 120, 120, alpha);
        label = "MISS!";
      }

      const ex = width / 2 + 90;   // SCORE 기준 오른쪽 옆
      const ey = 20 + floatOffset; // SCORE와 비슷한 높이에서 살짝 위로 떠오르는 느낌
      if (label) {
        text(label, ex, ey);
      }
    } else {
      this.gaugeEffect = "";
    }

    if (this.state === "PLAY") {
      this.drawFishScorePanel();
    }
  }

  drawMenuScreen() {
    this.drawTitle("FISHING DAY");
    this.drawSub("시작하기를 눌러 설명을 확인하세요");
    this.drawButton(this.menuButtonBounds(), "시작하기");
    this.drawMenuCredit();
    this.drawSeasonTabs();
  }

  drawInfoScreen() {
    this.drawDimOverlay(190);

    const panel = this.infoPanelBounds();
    push();
    rectMode(CENTER);
    noStroke();
    fill(12, 46, 78, 235);
    rect(panel.x, panel.y, panel.w, panel.h, 26);
    pop();

    const titleY = panel.y - panel.h / 2 + 32;
    const textMarginX = 36;
    const textMarginTop = 88;
    const textMarginBottom = 110;
    const scrollTrackWidth = 8;
    const scrollGap = 12;
    const textAreaW = panel.w - textMarginX * 2 - (scrollTrackWidth + scrollGap);
    const textAreaH = panel.h - textMarginTop - textMarginBottom;
    const textX = panel.x - panel.w / 2 + textMarginX;
    const textY = panel.y - panel.h / 2 + textMarginTop;
    const scrollTrackX = textX + textAreaW + scrollGap + scrollTrackWidth / 2;

    fill(255);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(30);
    text("게임 설명", textX, titleY);

    textStyle(NORMAL);
    textSize(18);
    const lineHeight = 26;
    textLeading(lineHeight);
    if (typeof textWrap === "function" && typeof WORD !== "undefined") textWrap(WORD);

    const textTotalH = this.infoLines.length * lineHeight;
    this.infoScrollMax = max(0, textTotalH - textAreaH);
    this.infoScroll = constrain(this.infoScroll, 0, this.infoScrollMax);

    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(textX, textY, textAreaW, textAreaH);
    drawingContext.clip();
    text(this.infoLines.join("\n"), textX, textY - this.infoScroll, textAreaW);
    drawingContext.restore();
    pop();
    textLeading(20);

    if (this.infoScrollMax > 0) {
      this.drawInfoScrollbar(scrollTrackX, textY, textAreaH, textTotalH);
    }

    this.drawButton(this.infoStartButtonBounds(), "시작하기");
    this.drawCloseButton(this.infoCloseButtonBounds());
  }

  drawButton(bounds, label) {
    const hover = this.isPointInRect(mouseX, mouseY, bounds);
    push();
    rectMode(CENTER);
    stroke(hover ? color(255) : color(255, 220));
    strokeWeight(2);
    fill(hover ? color(255, 255, 255, 240) : color(255, 255, 255, 200));
    rect(bounds.x, bounds.y, bounds.w, bounds.h, 18);

    noStroke();
    fill(24, 78, 120);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(label, bounds.x, bounds.y + 2);
    pop();
  }

  drawCloseButton(bounds) {
    const hover = this.isPointInRect(mouseX, mouseY, bounds);
    push();
    rectMode(CENTER);
    stroke(hover ? color(255, 160, 160) : color(255, 220));
    strokeWeight(2);
    noFill();
    rect(bounds.x, bounds.y, bounds.w, bounds.h, 8);

    strokeWeight(3);
    const dx = bounds.w * 0.3;
    const dy = bounds.h * 0.3;
    line(bounds.x - dx, bounds.y - dy, bounds.x + dx, bounds.y + dy);
    line(bounds.x - dx, bounds.y + dy, bounds.x + dx, bounds.y - dy);
    pop();
  }

  drawMenuCredit() {
    fill(255, 220);
    textAlign(RIGHT, BOTTOM);
    textSize(16);
    text(this.authorCredit, width - 24, height - 18);
  }

  drawFishScorePanel() {
    const fishes = this.getSeasonFishList();
    if (!fishes.length) return;
    const boxW = 210;
    const rowH = 22;
    const boxH = 28 + fishes.length * rowH;
    const boxX = width - boxW - 18;
    const boxY = 44;

    push();
    rectMode(CORNER);
    noStroke();
    fill(70, 110, 160, 210);
    rect(boxX, boxY, boxW, boxH, 14);

    fill(255);
    textAlign(CENTER, CENTER);
    textSize(15);
    text("🐟 FISH SCORES", boxX + boxW / 2, boxY + 14);

    let rowY = boxY + 34;
    textSize(13);
    for (const cfg of fishes) {
      const earned = this.fishScoreMap[cfg.name] || 0;

      textAlign(LEFT, CENTER);
      fill(250);
      text(cfg.name, boxX + 14, rowY);

      textAlign(RIGHT, CENTER);
      fill(255, 245, 130);
      text(`+${earned}`, boxX + boxW - 14, rowY);

      rowY += rowH;
    }
    pop();
  }

  drawSeasonTabs() {
    const tabs = this.seasonTabRects();
    if (!tabs.length) return;
    textSize(18);
    textAlign(CENTER, CENTER);
    for (const tab of tabs) {
      const { bounds, season } = tab;
      const info = SEASON_DATA[season];
      const active = this.season === season;
      const hover = this.isPointInRect(mouseX, mouseY, bounds);
      const strokeCol = active ? color(255) : color(255, 255, 255, 180);
      const baseAlpha = active ? 240 : 170;
      const fillAlpha = hover ? baseAlpha : baseAlpha - 40;

      push();
      rectMode(CENTER);
      stroke(strokeCol);
      strokeWeight(active ? 2.5 : 1.5);
      fill(255, 255, 255, constrain(fillAlpha, 80, 255));
      rect(bounds.x, bounds.y, bounds.w, bounds.h, 14);

      noStroke();
      fill(active ? color(20, 70, 110) : color(20, 70, 110, 220));
      text(info.label, bounds.x, bounds.y);
      pop();
    }
  }

  drawSeaweed() {
    const baseY = height - 70;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const x = 90 + i * 140;
      const sway = sin(frameCount * 0.02 + i) * 12;
      const hue = color(40, 150 + i * 8, 100 + i * 6, 180);
      push();
      noStroke();
      fill(hue);
      beginShape();
      vertex(x - 12, baseY);
      bezierVertex(
        x - 24 + sway * 0.4,
        baseY - 40,
        x - 18 - sway * 0.4,
        baseY - 90,
        x - 6,
        baseY - 130
      );
      bezierVertex(
        x + sway * 0.6,
        baseY - 110,
        x + 6 - sway * 0.6,
        baseY - 50,
        x + 10,
        baseY
      );
      endShape(CLOSE);
      pop();
    }
  }

  drawSpringAnemones() {
    const baseY = height - 60;
    const spots = [80, 210, 360, 510, 660, 790];
    for (const x of spots) {
      push();
      translate(x, baseY);
      const pulse = sin(frameCount * 0.05 + x * 0.01) * 4;
      noStroke();
      fill(255, 190, 210, 210);
      ellipse(0, pulse, 28, 60);
      fill(255, 160, 200, 220);
      ellipse(-12, pulse + 6, 18, 42);
      ellipse(12, pulse + 4, 18, 42);
      fill(255, 230, 120, 220);
      circle(0, pulse - 4, 14);
      pop();
    }
  }

  drawAutumnRocks() {
    const baseY = height - 55;
    const rocks = [
      { x: 140, w: 130, h: 38 },
      { x: 340, w: 110, h: 30 },
      { x: 560, w: 160, h: 44 },
      { x: 760, w: 120, h: 36 }
    ];
    for (const r of rocks) {
      push();
      translate(r.x, baseY);
      noStroke();
      fill(90, 70, 60, 220);
      ellipse(0, 0, r.w, r.h);
      fill(120, 95, 80, 180);
      ellipse(-r.w * 0.15, -6, r.w * 0.6, r.h * 0.5);
      pop();
    }
  }

  drawWinterIceFloes() {
    const surfaceY = this.boat.y + 26;
    const floes = [
      { x: 140, w: 140 },
      { x: 330, w: 120 },
      { x: 520, w: 150 },
      { x: 720, w: 130 }
    ];
    for (const f of floes) {
      const wobble = sin(frameCount * 0.03 + f.x * 0.02) * 2;
      push();
      translate(f.x, surfaceY + wobble);
      noStroke();
      fill(235, 245, 255, 180);
      beginShape();
      vertex(-f.w / 2, 0);
      vertex(-f.w / 2 + 20, -12);
      vertex(f.w / 2 - 18, -10);
      vertex(f.w / 2, 0);
      vertex(f.w / 2 - 24, 10);
      vertex(-f.w / 2 + 16, 8);
      endShape(CLOSE);
      fill(200, 220, 255, 120);
      quad(-f.w / 2 + 10, -4, -f.w / 2 + 35, -14, -f.w / 2 + 75, -12, -f.w / 2 + 40, -2);
      pop();
    }
  }

  drawInfoScrollbar(x, y, h, totalHeight) {
    const trackW = 8;
    push();
    rectMode(CENTER);
    noStroke();
    fill(255, 80);
    rect(x, y + h / 2, trackW, h, 6);

    const visibleRatio = h / totalHeight;
    const knobH = max(30, h * visibleRatio);
    const available = h - knobH;
    const progress = this.infoScrollMax === 0 ? 0 : this.infoScroll / this.infoScrollMax;
    const knobCenterY = y + knobH / 2 + available * progress;

    fill(255, 180);
    rect(x, knobCenterY, trackW, knobH, 6);
    pop();
  }

  seasonTabRects() {
    const keys = Object.keys(SEASON_DATA);
    if (!keys.length) return [];
    const tabW = 130;
    const tabH = 46;
    const gap = 16;
    const totalW = keys.length * tabW + (keys.length - 1) * gap;
    const startX = width / 2 - totalW / 2;
    const topY = height / 2 + 160;
    const rects = [];
    for (let i = 0; i < keys.length; i++) {
      const season = keys[i];
      const cx = startX + i * (tabW + gap) + tabW / 2;
      const cy = topY + tabH / 2;
      rects.push({
        season,
        bounds: { x: cx, y: cy, w: tabW, h: tabH }
      });
    }
    return rects;
  }

  getSeasonFishList() {
    const info = SEASON_DATA[this.season];
    return info ? info.fishes : [];
  }

  updateParticles() {
    const type = {
      SPRING: "petal",
      SUMMER: "rain",
      AUTUMN: "leaf",
      WINTER: "snow"
    }[this.season];

    if (type && frameCount % 6 === 0) {
      this.particles.push(new Particle(type));
    }

    for (const p of this.particles) p.update();
    this.particles = this.particles.filter(p => !p.offscreen());
  }

  drawParticles() {
    for (const p of this.particles) p.draw();
  }

  drawDimOverlay(alpha = 140) {
    noStroke();
    fill(0, alpha);
    rect(0, 0, width, height);
  }

  menuButtonBounds() {
    return {
      x: width / 2,
      y: height / 2 + 90,
      w: 200,
      h: 56
    };
  }

  infoPanelBounds() {
    return {
      x: width / 2,
      y: height / 2,
      w: width * 0.68,
      h: height * 0.62
    };
  }

  infoStartButtonBounds() {
    const panel = this.infoPanelBounds();
    const buttonH = 52;
    const bottomMargin = 40;
    const centerY = panel.y + panel.h / 2 - bottomMargin - buttonH / 2;
    return {
      x: panel.x,
      y: centerY,
      w: 220,
      h: buttonH
    };
  }

  infoCloseButtonBounds() {
    const panel = this.infoPanelBounds();
    return {
      x: panel.x + panel.w / 2 - 36,
      y: panel.y - panel.h / 2 + 36,
      w: 32,
      h: 32
    };
  }

  isPointInRect(px, py, bounds) {
    const { x, y, w, h } = bounds;
    return (
      px >= x - w / 2 &&
      px <= x + w / 2 &&
      py >= y - h / 2 &&
      py <= y + h / 2
    );
  }

  handleSeasonTabClick(px, py) {
    const tabs = this.seasonTabRects();
    for (const tab of tabs) {
      if (this.isPointInRect(px, py, tab.bounds)) {
        this.setSeason(tab.season);
        return true;
      }
    }
    return false;
  }

  drawTitle(s) {
    this.drawDimOverlay(140);
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
    
    if (this.spaceSpamStreak > 3) {
      const minEscapeChance = 0.2;
      const maxEscapeChance = 0.8;
      const k = map(this.spaceSpamStreak, 6, maxSpamStreak, 0, 1, true);
      const escapeChance = lerp(minEscapeChance, maxEscapeChance, k);

      if (random() < escapeChance) {
        this.hook.forceFullMiss();
        this.spaceSpamStreak = 0;

        this.gaugeEffect = "MISS";
        this.gaugeEffectTime = millis();
        return;
      }
    }

    const gx = this.gauge.x;
    const gw = this.gauge.w;
    const tolerance = this.gauge.currentTolerance;

    const tt = (sin(this.gaugePhase) * 0.5 + 0.5);
    const markerX = lerp(gx - gw / 2 + 8, gx + gw / 2 - 8, tt);

    const distCenter = abs(markerX - gx);
    const timingSuccess = distCenter <= tolerance;

    if (timingSuccess) {
      let mul = 1.0;

      const perfectThreshold = tolerance * 0.15;

      if (distCenter <= perfectThreshold) {
        mul = 1.4;
        this.gaugeEffect = "PERFECT";
      } else {
        this.gaugeEffect = "HIT";
      }

      this.gaugeEffectTime = millis();
      this.hook.pullStep(mul);
      this.gaugeLastHit = millis();
    } else {
      this.gaugeEffect = "MISS";
      this.gaugeEffectTime = millis();

      const generalEscapeChance = 0.15;
      if (random() < generalEscapeChance) {
        this.hook.forceEscape();
      }
    }
  }
}

/* ---------------- Boat ---------------- */
class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.speed = 5;
    this.dir = 0;
  }

  update() {
    this.x += this.dir * this.speed;
    this.x = constrain(this.x, 80, width - 80);
  }

  hookY() {
    return this.y + 26;
  }

  moveLeft() {
    this.dir = -1;
  }

  moveRight() {
    this.dir = 1;
  }

  stop() {
    this.dir = 0;
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

  forceEscape() {
    if (!this.fish) return;
    this.fish.caught = false;
    this.fish = null;
    this.mode = "DOWN";
  }

  forceFullMiss() {
    if (!this.fish) return;
    this.fish.caught = false;
    this.fish = null;
    this.mode = "UP";
  }

  // 타이밍 성공 시 위로 당기기 (깊이 + 물고기 크기 반영)
  pullStep(mult = 1) {
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

    const step = baseStep * sizeFactor * mult;

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
  constructor(x, y, r, speed, strength, score, hue, name = "FISH") {
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
    this.name = name;
    this.noiseSeed = random(1000);
    this.flip = this.vx < 0 ? -1 : 1;
  }

  static random() {
    return Fish.randomBySeason("SPRING");
  }

  static randomBySeason(season) {
    const seasonInfo = SEASON_DATA[season] || SEASON_DATA.SPRING;
    const def = random(seasonInfo.fishes);
    const speedRange = def.speed || [1.2, 1.8];
    const speed = random(speedRange[0], speedRange[1]);
    return new Fish(
      random(40, width - 40),
      random(180, height - 90),
      def.r,
      speed,
      4,
      def.score,
      color(...def.color),
      def.name
    );
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

class Particle {
  constructor(type) {
    this.type = type;
    this.x = random(width);
    this.y = random(-40, 0);
    this.vy = random(1.2, 3.2);
    this.vx = (type === "leaf" || type === "petal") ? random(-0.4, 0.4) : 0;
    this.size = random(6, 14);
    this.rot = random(TWO_PI);
    this.spin = random(-0.02, 0.02);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.spin;
  }

  offscreen() {
    return this.y > height + 40;
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    noStroke();
    if (this.type === "snow") fill(255, 240);
    else if (this.type === "petal") fill(255, 180, 200);
    else if (this.type === "leaf") fill(255, 190, 90);
    else if (this.type === "rain") fill(150, 220, 255, 180);
    else fill(255, 200);
    ellipse(0, 0, this.size, this.size * 0.6);
    pop();
  }
}