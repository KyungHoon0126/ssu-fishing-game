// 게임 상태 전환부터 엔티티 관리, 렌더링까지 총괄하는 메인 컨트롤러
class Game {
  // Game 인스턴스를 생성하며 초기 상태와 객체를 준비
  constructor() {
    this.state = "MENU"; // 가능한 상태: MENU | INFO | PLAY | RESULT
    this.season = "SPRING";
    this.duration = 60; // 게임 시간
    this.startMillis = 0;
    this.score = 0;
    this.best = 0;
    this.caught = 0;
    this.fishScoreMap = {};
    this.pokedexOpen = false; //도감 팝업 열림 상태
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
      "- 연타 페널티가 있으니 타이밍을 노려보세요.",
    ];
    this.infoScroll = 0;
    this.infoScrollMax = 0;
    this.authorCredit = "20251669 김경훈\n20253308 강성준\n20241095 박규리";

    // 재화 및 미끼 상태
    this.money = 0;
    this.menuOverlay = null; // SHOP | INVENTORY | null
    this.ownedBaits = {};
    this.activeBaitId = "BASIC";
    this.runEarnings = 0;
    this.baitEffectsEnabled = true;
    this.menuOverlayScroll = 0;
    this.menuOverlayScrollMax = 0;
    this.menuOverlayContentHeight = 0;
    this.initializeBaitInventory();

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
      currentTolerance: 24,
    };
    this.gaugePhase = 0;
    this.gaugeActive = false;
    this.gaugeLastHit = 0;

    // 스페이스 연타 체크
    this.lastSpaceTime = 0;
    this.spaceSpamStreak = 0;
    this.gaugeEffect = "";
    this.gaugeEffectTime = 0;
    this.countdownTriggered = false;

    // 훅 재후킹 쿨타임 관리
    this.lastHookEscapeTime = 0; // 마지막으로 물고기를 놓친 시각
    this.hookRehookDelay = 250; // 놓친 직후 재후킹까지 대기 시간(ms)

    // 엔딩 크레딧 관련
    this.resultStartTime = 0;
    this.creditsStartTime = 0;
    this.creditsFinished = false;
    this.credits = [
      "해당 게임은 2025년 숭실대학교 디지털미디어학과",
      "김경훈, 강성준, 박규리 학생이 제작하였습니다.",
      "p5.js를 이용하여 제작되었습니다.",
      "",
      "코드에서의 AI 사용 비율은 약 30% 입니다. (코드 및 리소스 이미지, 음악 포함)",
      "",
      "[ p5.js 활용 및 기술적 구현 상세 ]",
      "1. Core: preload/setup/draw 생명주기 및 Event-Driven 입력 처리",
      "2. Rendering: push/pop 매트릭스 스택, drawingContext 클리핑, 커스텀 셰이프",
      "3. Math/Physics: p5.Vector 기반 운동 연산, lerp/map/constrain 보간 제어",
      "4. Audio: p5.sound 라이브러리를 활용한 비동기 리소스 로딩 및 제어",
      "5. Architecture: ES6 Class 모듈화, Prototype Mixin, State Pattern 적용",
      "",
      "감사합니다.",
    ];
  }

  // 메뉴에서 계절을 바꾸면 해당 계절 물고기를 다시 생성
  setSeason(season) {
    if (!SEASON_DATA[season] || this.season === season) return;
    this.season = season;
    if (this.state !== "PLAY") {
      this.school = [];
      this.spawnFishes(12);
    }
  }

  // 게임을 시작하며 타이머, 점수, 배경음 등을 초기화
  start() {
    this.state = "PLAY";
    this.startMillis = millis();
    this.fishScoreMap = {};
    this.particles = [];
    this.runEarnings = 0;
    this.closeMenuOverlay();
    this.countdownTriggered = false;
    if (typeof playSeasonMusic === "function") {
      playSeasonMusic(this.season);
    } else {
      console.warn("시즌 BGM 함수를 찾을 수 없습니다.");
    }
  }

  // 메뉴에서 게임 설명 패널 열기
  showInfo() {
    this.state = "INFO";
    this.infoScroll = 0;
    this.infoScrollMax = 0;
    this.closeMenuOverlay();
  }

  // 정보 패널을 닫고 메뉴로 복귀
  closeInfo() {
    this.state = "MENU";
    this.ensureMenuMusic();
  }

  // 결과 후 다시 메뉴 상태로 되돌리고 각종 수치를 리셋
  reset() {
    this.state = "MENU";
    this.score = 0;
    this.caught = 0;
    this.hook.reset(true);
    this.school = [];
    this.spawnFishes(12);
    this.particles = [];
    this.runEarnings = 0;
    this.closeMenuOverlay();
    this.countdownTriggered = false;
    this.ensureMenuMusic();
  }

  ensureMenuMusic() {
    if (typeof playMenuMusic === "function") {
      playMenuMusic();
    }
  }

  // 현재 계절에 맞는 물고기를 n마리 생성
  spawnFishes(n) {
    for (let i = 0; i < n; i++)
      this.school.push(Fish.randomBySeason(this.season));
  }

  // 남은 시간을 초 단위로 계산
  timeLeft() {
    if (this.state !== "PLAY") return this.duration;
    const t = (millis() - this.startMillis) / 1000;
    return max(0, this.duration - t);
  }

  // 매 프레임 호출되어 상태 전환, 물리, 훅킹 판정을 진행
  update() {
    const remainingTime = this.timeLeft();

    if (this.state === "PLAY" && remainingTime <= 0.01) {
      this.state = "RESULT";
      this.resultStartTime = millis();
      this.creditsStartTime = 0;
      this.creditsFinished = false;
      this.best = max(this.best, this.score);
      this.hook.reset(true);
      this.pokedexOpen = true; // 결과 화면 진입 시 도감 열기
      if (typeof playResultMusic === "function") {
        playResultMusic();
      } else if (typeof stopActiveMusic === "function") {
        stopActiveMusic();
      }
    }

    if (
      this.state === "PLAY" &&
      !this.countdownTriggered &&
      remainingTime <= 10
    ) {
      this.countdownTriggered = true;
      if (typeof playCountdownMusic === "function") {
        playCountdownMusic();
      }
    }

    this.updateParticles();

    if (this.state !== "PLAY") return;

    this.boat.update();
    this.hook.update();

    // 훅킹된 물고기는 '잡혀서 고정'이 아니라 좌우로 저항하며 움직이도록 업데이트한다.
    for (const f of this.school) {
      const isHookedFish =
        this.hook && this.hook.mode === "HOOKED" && this.hook.fish === f;

      if (isHookedFish) {
        if (typeof f.updateHooked === "function") {
          f.updateHooked(this.hook);
        } else if (typeof f.update === "function" && f.update.length >= 1) {
          f.update(true, this.hook);
        } else if (typeof f.update === "function") {
          f.update();
        }
      } else {
        f.update();
      }
    }

    // 낚싯줄이 내려가는 중, 재후킹 쿨타임이 끝났을 때만 훅킹 시도
    if (!this.hook.fish && this.hook.mode === "DOWN") {
      // Hook에서 잠근 시간까지는 재후킹 금지
      if (millis() < (this.hook.disableHookUntil || 0)) return;
      // 최근 이탈 이후 일정 시간 동안은 재후킹 방지
      if (millis() - this.lastHookEscapeTime >= this.hookRehookDelay) {
        for (const f of this.school) {
          if (
            !f.caught &&
            dist(this.hook.x, this.hook.y, f.x, f.y) < this.hook.r + f.r
          ) {
            this.hook.onHook(f);
            this.gaugeLastHit = millis(); // 훅킹 시 기준 시간
            this.spaceSpamStreak = 0;
            break;
          }
        }
      }
    }

    // 물고기가 수면까지 올라오면 포획 처리
    if (this.hook.fish && this.hook.y <= this.boat.hookY()) {
      const f = this.hook.fish;
      f.caught = true;
      this.score += f.score;
      this.caught += 1;
      const label = f.name || "FISH";
      this.fishScoreMap[label] = (this.fishScoreMap[label] || 0) + f.score;
      const payout = this.calcFishPayout(f);
      this.addMoney(payout);
      if (typeof playRewardSound === "function") {
        playRewardSound();
      }
      this.school = this.school.filter((x) => x !== f);
      this.school.push(Fish.randomBySeason(this.season));
      this.hook.reset(false);
    }

    // 훅킹 중일 때 게이지 UI 갱신
    // 큰 물고기일수록 판정 범위는 좁아지고 마커는 빨라짐.
    if (this.hook.fish && this.hook.mode === "HOOKED") {
      this.gaugeActive = true;
      const fishR = this.hook.fish.r;
      const g = this.gauge;
      const normR = map(fishR, g.minR, g.maxR, 0, 1, true);

      // 판정 범위
      const factor = lerp(1.0, g.minToleranceFactor, normR);
      const toleranceBase = g.baseTolerance * factor;
      const toleranceBonus = this.getActiveBaitEffects().toleranceBonus || 0;
      g.currentTolerance = toleranceBase + toleranceBonus;

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
      const baseTimeout = 4500;
      const timeoutPenalty = lerp(0, 1600, normR);
      const timeout = baseTimeout - timeoutPenalty;
      if (this.gaugeLastHit > 0 && millis() - this.gaugeLastHit > timeout) {
        this.hook.forceEscape();
        this.lastHookEscapeTime = millis();
      }
    } else {
      this.gaugeActive = false;
    }
  }

  // 화면에 배경, 엔티티, UI, 결과창 등 그리기
  render() {
    this.drawBackground();
    this.drawParticles();

    if (this.state === "MENU") {
      this.drawMenuScreen();
      this.drawSoundToggle();
      return;
    }

    if (this.state === "INFO") {
      this.drawInfoScreen();
      return;
    }

    for (const f of this.school) f.draw();
    this.boat.draw();
    this.hook.draw();
    this.drawUI();

    if (this.state === "RESULT") {
      this.drawTitle("TIME UP!");
      this.drawSub(`SCORE ${this.score} | BEST ${this.best} | ENTER 재시작`);
      this.drawResultLogo();
      if (this.pokedexOpen) {
        this.drawResultPokedex();
      } else {
        // 도감이 닫히면 즉시 크레딧 표시
        if (!this.creditsFinished && this.creditsStartTime > 0) {
          this.drawCredits();
        }
      }
    }
  }

  closeResultPokedex() {
    this.pokedexOpen = false;
    this.creditsStartTime = millis();
  }

  drawCredits() {
    const elapsed = millis() - this.creditsStartTime;
    const speed = 0.05; // 스크롤 속도
    const startY = height + 50;
    const lineHeight = 30;

    // 마지막 줄이 화면 위로 완전히 사라졌는지 확인
    const lastLineIndex = this.credits.length - 1;
    const lastLineY = startY + lastLineIndex * lineHeight - elapsed * speed;
    if (lastLineY < -50) {
      this.creditsFinished = true;
      return;
    }

    this.drawDimOverlay(180); // 배경을 좀 더 어둡게

    textAlign(CENTER, CENTER);
    textSize(18);
    fill(255);
    noStroke();

    for (let i = 0; i < this.credits.length; i++) {
      const lineY = startY + i * lineHeight - elapsed * speed;
      // 화면 내에 있을 때만 그리기
      if (lineY < height + 50 && lineY > -50) {
        text(this.credits[i], width / 2, lineY);
      }
    }
  }

  // 사운드 토글 버튼 영역
  getSoundToggleBounds() {
    // 메뉴 화면: 로고 우측에 배치
    if (this.state === "MENU") {
      return {
        x: 126,
        y: 66,
        r: 16,
      };
    }
    // PLAY 화면: 상단 HUD 남은 시간 우측에 배치
    if (this.state === "PLAY") {
      return {
        x: 130,
        y: 20,
        r: 12,
      };
    }
    // 그 외 화면 (INFO, RESULT)에서는 버튼 영역 없음 (클릭 불가)
    return { x: -100, y: -100, r: 0 };
  }

  drawSoundToggle() {
    const btn = this.getSoundToggleBounds();
    const isMuted = bgmController.muted;
    const hover = dist(mouseX, mouseY, btn.x, btn.y) < btn.r;

    push();
    translate(btn.x, btn.y);

    // 배경 원
    noStroke();
    fill(0, 100);
    if (hover) fill(50, 150);
    circle(0, 0, btn.r * 2.4);

    // 아이콘 중앙 정렬을 위한 보정
    translate(-2, 0);

    // 스피커 아이콘
    stroke(255);
    strokeWeight(2);
    noFill();

    // 스피커 본체
    beginShape();
    vertex(-6, -4);
    vertex(-2, -4);
    vertex(4, -8);
    vertex(4, 8);
    vertex(-2, 4);
    vertex(-6, 4);
    endShape(CLOSE);

    // 소리 파동 (ON일 때만)
    if (!isMuted) {
      arc(6, 0, 8, 8, -PI / 3, PI / 3);
      arc(6, 0, 14, 14, -PI / 3, PI / 3);
    } else {
      // MUTE 표시 (X)
      stroke(255, 100, 100);
      line(6, -4, 12, 4);
      line(12, -4, 6, 4);
    }

    pop();
  }

  handleSoundToggleClick(px, py) {
    const btn = this.getSoundToggleBounds();
    if (dist(px, py, btn.x, btn.y) < btn.r) {
      toggleMute();
      return true;
    }
    return false;
  }

  // 계절에 맞는 배경 그래디언트/이미지와 장식 그리기
  drawBackground() {
    const hasImage = this.drawSeasonBackgroundImage();
    if (!hasImage) {
      this.drawGradientBackground();
    }

    this.drawSurfaceHighlights();

    if (this.season === "SUMMER") this.drawSeaweed();
    else if (this.season === "SPRING") this.drawSpringAnemones();
    else if (this.season === "AUTUMN") this.drawAutumnRocks();
    else if (this.season === "WINTER") this.drawWinterIceFloes();
  }

  drawSeasonBackgroundImage() {
    if (typeof backgroundImages === "undefined") return false;
    const img = backgroundImages[this.season];
    if (!(img && img.width && img.height)) return false;
    push();
    imageMode(CENTER);
    const scale = Math.max(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    image(img, width / 2, height / 2, drawW, drawH);
    pop();
    return true;
  }

  drawGradientBackground() {
    const bgPreset = {
      SPRING: { top: color(205, 235, 255), bottom: color(80, 160, 210) },
      SUMMER: { top: color(80, 200, 255), bottom: color(0, 100, 180) },
      AUTUMN: { top: color(170, 210, 240), bottom: color(30, 90, 140) },
      WINTER: { top: color(200, 220, 245), bottom: color(60, 90, 150) },
    }[this.season] || {
      top: color(120, 200, 255),
      bottom: color(10, 140, 210),
    };

    noStroke();
    for (let y = 0; y < height; y++) {
      const c = lerpColor(bgPreset.top, bgPreset.bottom, y / height);
      stroke(c);
      line(0, y, width, y);
    }
  }

  drawSurfaceHighlights() {
    stroke(255, 255, 255, 70);
    strokeWeight(2.5);
    const surfaceY = this.boat.y + 20;
    for (let x = 0; x < width; x += 16) {
      const y = surfaceY + sin(frameCount * 0.05 + x * 0.05) * 3;
      line(x, y, x + 12, y);
    }
  }

  // 상단 HUD, 게이지, 도감 패널 등 그리기
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
    text(`CAUGHT ${this.caught} | GOLD ${this.money}`, width - 12, 20);

    const activeBait = this.getActiveBaitConfig();
    if (activeBait) {
      textAlign(LEFT, CENTER);
      textSize(14);
      fill(255, 240);
      text(`현재 미끼 : ${activeBait.name}`, 12, 52);
    }

    this.drawSoundToggle();

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
      const tt = sin(this.gaugePhase) * 0.5 + 0.5;
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

      // 판정 결과에 따라 잠깐 떠오르는 텍스트 이펙트.
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

        const ex = width / 2 + 90;
        const ey = 20 + floatOffset;
        if (label) {
          text(label, ex, ey);
        }
      }
    } else {
      this.gaugeEffect = "";
    }

    if (this.state === "PLAY") {
      this.drawFishScorePanel();
    }
  }

  // 현재 계절 물고기의 누적 점수를 박스 형태로 보여주기
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

  // 여름 배경에서 출렁이는 해초 그리기
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

  // 봄 배경의 말랑한 말미잘 장식 그리기
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

  // 가을 배경의 바닥 바위 실루엣 배치
  drawAutumnRocks() {
    const baseY = height - 55;
    const rocks = [
      { x: 140, w: 130, h: 38 },
      { x: 340, w: 110, h: 30 },
      { x: 560, w: 160, h: 44 },
      { x: 760, w: 120, h: 36 },
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

  // 겨울 배경 위에 떠 있는 빙판 띄우기
  drawWinterIceFloes() {
    const surfaceY = this.boat.y + 26;
    const floes = [
      { x: 140, w: 140 },
      { x: 330, w: 120 },
      { x: 520, w: 150 },
      { x: 720, w: 130 },
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
      quad(
        -f.w / 2 + 10,
        -4,
        -f.w / 2 + 35,
        -14,
        -f.w / 2 + 75,
        -12,
        -f.w / 2 + 40,
        -2
      );
      pop();
    }
  }

  // 현재 선택한 계절의 물고기 설정 배열 반환
  getSeasonFishList() {
    const info = SEASON_DATA[this.season];
    return info ? info.fishes : [];
  }

  // 계절별 파티클(꽃잎, 비, 낙엽, 눈) 생성·업데이트
  updateParticles() {
    const type = {
      SPRING: "petal",
      SUMMER: "rain",
      AUTUMN: "leaf",
      WINTER: "snow",
    }[this.season];

    if (type && frameCount % 6 === 0) {
      this.particles.push(new Particle(type));
    }
    for (const p of this.particles) p.update();
    this.particles = this.particles.filter((p) => !p.offscreen());
  }

  // 화면에 활성 파티클을 모두 렌더링
  drawParticles() {
    for (const p of this.particles) p.draw();
  }

  // 주어진 투명도로 화면 전체를 어둡게 덮기
  drawDimOverlay(alpha = 140) {
    noStroke();
    fill(0, alpha);
    rect(0, 0, width, height);
  }

  // 주어진 점이 중심 좌표/폭/높이로 정의된 사각형 안인지 검사
  isPointInRect(px, py, bounds) {
    const { x, y, w, h } = bounds;
    return (
      px >= x - w / 2 && px <= x + w / 2 && py >= y - h / 2 && py <= y + h / 2
    );
  }

  // 중앙에 큰 타이틀 텍스트를 표시
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

  // 타이틀 아래에 보조 문구 출력
  drawSub(s) {
    textAlign(CENTER, CENTER);
    fill(240);
    textSize(18);
    text(s, width / 2, height / 2 + 24);
  }

  applyGaugeFeedback(effect) {
    if (!effect) {
      this.gaugeEffect = "";
      this.gaugeEffectTime = millis();
      return;
    }
    this.gaugeEffect = effect;
    this.gaugeEffectTime = millis();
    if (typeof playGaugeFeedbackSound === "function") {
      playGaugeFeedbackSound(effect);
    }
  }

  // 스페이스 입력 처리 (타이밍 + 연타 페널티)
  handleGaugeHit() {
    if (!this.gaugeActive) return;

    const now = millis();
    const dt = now - this.lastSpaceTime;
    this.lastSpaceTime = now;

    // 연타 카운트
    const spamThreshold = 260;
    const maxSpamStreak = 12;

    if (dt < spamThreshold) {
      this.spaceSpamStreak = min(this.spaceSpamStreak + 1, maxSpamStreak);
    } else {
      this.spaceSpamStreak = 0;
    }

    if (this.spaceSpamStreak > 3) {
      const minEscapeChance = 0.35;
      const maxEscapeChance = 0.9;
      const k = map(this.spaceSpamStreak, 4, maxSpamStreak, 0, 1, true);
      const escapeChance = lerp(minEscapeChance, maxEscapeChance, k);

      if (random() < escapeChance) {
        this.hook.forceFullMiss();
        this.spaceSpamStreak = 0;
        // 연타로 인한 완전 실패도 MISS 이펙트 표시
        this.applyGaugeFeedback("MISS");
        // 방금 물고기를 놓친 시각 기록
        this.lastHookEscapeTime = millis();
        return;
      }
    }

    const gx = this.gauge.x;
    const gw = this.gauge.w;
    const tolerance = this.gauge.currentTolerance;
    const tt = sin(this.gaugePhase) * 0.5 + 0.5;
    const markerX = lerp(gx - gw / 2 + 8, gx + gw / 2 - 8, tt);
    const distCenter = abs(markerX - gx);

    const timingSuccess = distCenter <= tolerance;

    if (timingSuccess) {
      let mul = 1.0;
      const perfectThreshold = tolerance * 0.15;
      if (distCenter <= perfectThreshold) {
        mul = 1.4;
        this.applyGaugeFeedback("PERFECT");
      } else {
        this.applyGaugeFeedback("HIT");
      }

      this.hook.pullStep(mul);
      this.gaugeLastHit = millis();
    } else {
      this.applyGaugeFeedback("MISS");
      const generalEscapeChance = 0.2;
      if (random() < generalEscapeChance) {
        this.hook.forceEscape();
        // 방금 물고기를 놓친 시각 기록
        this.lastHookEscapeTime = millis();
      }
    }
  }

  // 도감 닫기 버튼의 사각형 영역 계산
  getPokedexCloseBounds() {
    const boxW = 540;
    const boxH = 460;
    const boxX = width / 2;
    const boxY = height / 2;
    return {
      x: boxX + boxW / 2 - 20, // 여백 조정
      y: boxY - boxH / 2 + 20,
      w: 24, // 버튼 크기도 약간 축소
      h: 24,
    };
  }

  // 결과 화면 중앙 하단에 로고 표시
  drawResultLogo() {
    if (!uiImages.logo) return;
    const size = 80;
    const x = width / 2;
    const y = height / 2 + 100;
    push();
    imageMode(CENTER);
    image(uiImages.logo, x, y, size, size);
    pop();
  }

  // 결과 화면에서 계절별 도감 표시
  drawResultPokedex() {
    this.drawDimOverlay(230);

    const panelW = width * 0.85;
    const panelH = height * 0.85;
    const panelX = width / 2;
    const panelY = height / 2;
    const margin = 20;
    const rowHeight = 110;

    // 도감 패널 배경
    push();
    rectMode(CENTER);
    stroke(200);
    strokeWeight(2);
    fill(12, 46, 78, 245); // 진한 남색 배경
    rect(panelX, panelY, panelW, panelH, 20);

    // 도감 좌측 상단 로고
    if (uiImages.logo) {
      const logoSize = 80;
      const logoX = panelX - panelW / 2 + margin + logoSize / 2;
      const logoY = panelY - panelH / 2 + margin + logoSize / 2;
      imageMode(CENTER);
      image(uiImages.logo, logoX, logoY, logoSize, logoSize);
    }

    // 제목 (현재 계절 표시)
    noStroke();
    fill(255);
    textAlign(CENTER, TOP);
    textSize(36);
    textStyle(BOLD);
    text(
      `낚시 도감 - [ ${SEASON_DATA[this.season].label} ]`,
      panelX,
      panelY - panelH / 2 + margin + 4
    );
    textStyle(NORMAL);

    textSize(18);
    fill(255, 240);
    text(
      `이번 라운드 수익: ${this.runEarnings || 0} GOLD`,
      panelX,
      panelY - panelH / 2 + margin + 44
    );

    // 닫기 버튼
    this.drawCloseButton(this.getPokedexCloseBounds());

    // 도감 내용 영역 계산
    const contentYStart = panelY - panelH / 2 + margin + 60;
    const contentAreaH = panelH - margin * 2 - 60;
    const contentAreaW = panelW - margin * 2;
    const panelLeft = panelX - panelW / 2;
    const rowLeft = panelLeft + margin + 46;
    const rowWidth = contentAreaW - 80;

    // 모든 물고기가 아니라, 현재 계절 물고기 사용
    const fishes = this.getSeasonFishList();

    let currentY = contentYStart - this.infoScroll;

    for (const fish of fishes) {
      // 각 항목은 초상, 잡은 횟수, 설명 텍스트를 묶어서 그린다.
      const isCaught = this.fishScoreMap[fish.name] > 0;
      const earnedScore = this.fishScoreMap[fish.name] || 0;
      const catchCount = Math.floor(earnedScore / fish.score);

      // 항목 기준 위치
      const imgSize = 100;

      // 이미지가 그려질 절대 좌표 계산 (translate 사용 안 함)
      const imgCenterX = rowLeft + imgSize / 2 + 4;
      const imgCenterY = currentY + rowHeight / 2;

      // 화면(스크롤 영역) 밖으로 나가면 그리지 않음 (성능 최적화 + 클리핑 효과)
      if (
        currentY + rowHeight > contentYStart &&
        currentY < contentYStart + contentAreaH
      ) {
        // 배경 박스 (잡은 경우는 밝게, 미등록은 옅게)
        noStroke();
        rectMode(CORNER);
        if (isCaught) {
          fill(255, 255, 255, 25);
        } else {
          fill(255, 255, 255, 12);
        }
        rect(rowLeft, currentY, rowWidth, rowHeight - 18, 16);

        // 이미지 그리기 (절대 좌표 사용)
        push(); // 스타일 격리
        noTint(); // 투명도 초기화 (필수)

        if (isCaught) {
          const img = fishImages[fish.name];
          if (img && img.width > 0) {
            imageMode(CENTER);
            // 비율 유지 크기 계산
            let scale = 1.0;
            if (img.width > img.height) {
              scale = (imgSize * 0.9) / img.width; // 너비 기준 맞춤
            } else {
              scale = (imgSize * 0.9) / img.height; // 높이 기준 맞춤
            }
            // 절대 좌표에 그리기
            image(
              img,
              imgCenterX,
              imgCenterY,
              img.width * scale,
              img.height * scale
            );
          } else {
            // 이미지 없을 때
            fill(255, 100, 100);
            noStroke();
            circle(imgCenterX, imgCenterY, imgSize * 0.82);
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(10);
            text("NO IMG", imgCenterX, imgCenterY);
          }
        } else {
          // 못 잡았을 때 (?)
          fill(0, 0, 0, 60);
          noStroke();
          circle(imgCenterX, imgCenterY, imgSize * 0.82);
          fill(255, 100);
          textAlign(CENTER, CENTER);
          textSize(24);
          text("?", imgCenterX, imgCenterY);
        }
        pop(); // 스타일 격리 끝

        // 텍스트 정보 표시
        const textX = imgCenterX + imgSize / 2 + 32;
        const textW = rowLeft + rowWidth - textX - 18;

        if (isCaught) {
          textAlign(LEFT, TOP);
          textSize(18);
          textStyle(BOLD);
          fill(255, 245, 130);
          text(`${fish.name} (x${catchCount})`, textX, currentY + 8);

          textSize(13);
          textStyle(NORMAL);
          fill(220);
          text(fish.desc, textX, currentY + 32, textW);
        } else {
          textAlign(LEFT, TOP);
          textSize(18);
          textStyle(BOLD);
          fill(210);
          text("???", textX, currentY + 8);

          textSize(13);
          textStyle(NORMAL);
          fill(200);
          text("도감에 등록되지 않았습니다.", textX, currentY + 32, textW);
        }
      }

      // 다음 항목을 위해 Y 좌표 증가
      currentY += rowHeight;
    }

    // 스크롤바 그리기
    const totalHeight = currentY - (contentYStart - this.infoScroll);
    this.infoScrollMax = max(0, totalHeight - contentAreaH);

    if (this.infoScrollMax > 0) {
      const scrollTrackWidth = 8;
      const scrollTrackX = panelX + contentAreaW / 2 - scrollTrackWidth / 2;
      this.drawInfoScrollbar(
        scrollTrackX,
        contentYStart,
        contentAreaH,
        totalHeight
      );
    }

    pop(); // 도감 패널 전체 push/pop 닫기
  }

  handleResultPokedexLogoClick(px, py) {
    if (!this.pokedexOpen) return false;
    const panelW = width * 0.85;
    const panelH = height * 0.85;
    const panelX = width / 2;
    const panelY = height / 2;
    const margin = 20;
    const logoSize = 80;
    const logoX = panelX - panelW / 2 + margin + logoSize / 2;
    const logoY = panelY - panelH / 2 + margin + logoSize / 2;

    const bounds = { x: logoX, y: logoY, w: logoSize, h: logoSize };
    if (this.isPointInRect(px, py, bounds)) {
      window.open("https://mediamba.ssu.ac.kr", "_blank");
      return true;
    }
    return false;
  }

  // 모든 계절 물고기 정보를 하나의 배열로 펼침.
  getAllFishConfigurations() {
    const allFish = [];
    for (const season in SEASON_DATA) {
      allFish.push(
        ...SEASON_DATA[season].fishes.map((f) => ({
          ...f,
          season: SEASON_DATA[season].label,
        }))
      );
    }
    return allFish;
  }

  // 미끼 및 상점 관련 보조 메서드들
  initializeBaitInventory() {
    if (!Array.isArray(BAIT_TYPES)) return;
    for (const bait of BAIT_TYPES) {
      if (bait.price === 0) {
        this.ownedBaits[bait.id] = true;
        if (!this.activeBaitId) this.activeBaitId = bait.id;
      }
    }
    if (!this.getBaitById(this.activeBaitId) && BAIT_TYPES.length) {
      this.activeBaitId = BAIT_TYPES[0].id;
    }
  }

  getBaitById(id) {
    if (!Array.isArray(BAIT_TYPES)) return null;
    return BAIT_TYPES.find((bait) => bait.id === id) || null;
  }

  getActiveBaitConfig() {
    return this.getBaitById(this.activeBaitId) || this.getBaitById("BASIC");
  }

  getActiveBaitEffects() {
    const base = {
      toleranceBonus: 0,
      valueMultiplier: 1,
      reelBonus: 1,
    };
    if (!this.baitEffectsEnabled) return base;

    const bait = this.getActiveBaitConfig();
    if (!bait || !bait.effects) return base;
    return {
      toleranceBonus: bait.effects.toleranceBonus || 0,
      valueMultiplier: bait.effects.valueMultiplier || 1,
      reelBonus: bait.effects.reelBonus || 1,
    };
  }

  hasBait(id) {
    return !!this.ownedBaits[id];
  }

  canAfford(amount) {
    return this.money >= amount;
  }

  buyBait(id) {
    const bait = this.getBaitById(id);
    if (!bait || this.hasBait(id)) return false;
    if (!this.canAfford(bait.price)) return false;
    this.money -= bait.price;
    this.ownedBaits[id] = true;
    if (typeof playRewardSound === "function") {
      playRewardSound();
    }
    return true;
  }

  equipBait(id) {
    if (!this.hasBait(id) || this.activeBaitId === id) return false;
    this.activeBaitId = id;
    return true;
  }

  calcFishPayout(fish) {
    const base = (fish?.score || 0) * 5;
    const effects = this.getActiveBaitEffects();
    return Math.floor(base * (effects.valueMultiplier || 1));
  }

  addMoney(amount) {
    if (!amount) return;
    this.money += amount;
    this.runEarnings += amount;
  }

  isMenuOverlayOpen() {
    return this.menuOverlay === "SHOP" || this.menuOverlay === "INVENTORY";
  }

  openShop() {
    this.menuOverlay = "SHOP";
    this.resetMenuOverlayScroll();
    if (typeof playInventoryMusic === "function") {
      playInventoryMusic();
    }
  }

  openInventory() {
    this.menuOverlay = "INVENTORY";
    this.resetMenuOverlayScroll();
    if (typeof playInventoryMusic === "function") {
      playInventoryMusic();
    }
  }

  closeMenuOverlay() {
    this.menuOverlay = null;
    this.resetMenuOverlayScroll();
    if (this.state === "MENU" || this.state === "INFO") {
      this.ensureMenuMusic();
    }
  }

  resetMenuOverlayScroll() {
    this.menuOverlayScroll = 0;
    this.menuOverlayScrollMax = 0;
    this.menuOverlayContentHeight = 0;
  }

  scrollMenuOverlay(delta) {
    if (!this.isMenuOverlayOpen()) return;
    const limit = Math.max(0, this.menuOverlayScrollMax || 0);
    if (limit <= 0) return;
    this.menuOverlayScroll = constrain(
      this.menuOverlayScroll + delta,
      0,
      limit
    );
  }
}
