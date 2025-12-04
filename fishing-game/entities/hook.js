// 낚싯줄의 상태 전환 (내리기 / 올리기 / 훅킹) 관리
class Hook {
  // 보트를 받아 내부 상태를 초기화한다.
  constructor(boat) {
    this.boat = boat;
    this.reset(true);
  }

  // 낚싯줄 상태와 위치를 초기값으로 되돌린다.
  reset(moveToBoat) {
    this.mode = "UP"; // UP | DOWN | HOOKED
    this.fish = null;
    this.lenMax = height - this.boat.y - 80;
    this.dropSpeed = 5;
    this.reelSpeed = 3.6;
    this.minStep = 20;
    this.maxStep = 50;
    this.hookBaseX = this.boat.x;
    this.hookPhase = 0;
    this.hookOffsetY = 18;
    this.disableHookUntil = 0;
    if (moveToBoat) {
      this.x = this.boat.x;
      this.y = this.boat.hookY();
    }
  }

  // 낚싯줄을 올리거나 내리는 모드 토글
  toggleDrop() {
    if (game.state !== "PLAY") return;
    if (this.fish) return;
    this.mode = this.mode === "DOWN" ? "UP" : "DOWN";
  }

  // 훅 반경을 getter로 제공한다.
  get r() {
    return 10;
  }

  // 현재 모드에 따라 줄과 물고기 위치 갱신
  update() {
    if (this.mode !== "HOOKED") {
      this.x = lerp(this.x, this.boat.x, 0.35);
    }
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

      // 후킹 중에는 물고기가 좌우로 움직이고, 훅은 그 움직임을 추적한다.
      if (this.hookBaseX === undefined) this.hookBaseX = this.x;
      if (this.hookPhase === undefined) this.hookPhase = 0;

      if (typeof fish.updateHooked === "function") {
        fish.updateHooked(this);
      }

      // 훅은 물고기의 좌우 움직임을 따라가되, y는 pullStep으로만 올라가게 유지한다.
      this.x = lerp(this.x, fish.x, 0.25);
    }
  }

  // 물고기가 닿았을 때 훅 상태로 진입
  onHook(fish) {
    // 이미 훅킹 중이면 다른 물고기로 교체되지 않도록 방어한다.
    if (this.mode === "HOOKED" && this.fish) return;

    this.fish = fish;
    this.mode = "HOOKED";
    fish.caught = true;

    this.hookOffsetY = 18;
    this.hookBaseX = this.x;
    this.hookPhase = 0;
    fish.hookedBaseX = fish.x;
  }

  // 실패 판정 시 물고기를 놓치고 다시 내리기
  forceEscape() {
    if (!this.fish) return;

    this.fish.hookedBaseX = null;
    this.fish.caught = false;
    this.fish = null;
    this.mode = "DOWN";

    // 훅 재후킹 쿨타임 갱신
    if (typeof game !== "undefined") game.lastHookEscapeTime = millis();
    this.disableHookUntil = millis() + 1000;
  }

  // 완전 실패 시 낚싯줄을 위로 끌어올리기
  forceFullMiss() {
    if (!this.fish) return;

    this.fish.hookedBaseX = null;
    this.fish.caught = false;
    this.fish = null;
    this.mode = "UP";

    // 훅 재후킹 쿨타임 갱신
    if (typeof game !== "undefined") game.lastHookEscapeTime = millis();
    this.disableHookUntil = millis() + 1000;
  }

  // 게이지 히트 시 낚싯줄을 일정 단계만큼 끌어올리기
  pullStep(mult = 1) {
    if (this.mode !== "HOOKED" || !this.fish) return;

    // 미끼 효과 데이터 가져오기
    const effects = game.getActiveBaitEffects();
    const baitMultiplier = effects.reelBonus || 1;

    const distFromBoat = this.y - this.boat.hookY();
    const depthRatio = constrain(distFromBoat / this.lenMax, 0, 1);
    const baseStep = lerp(this.minStep, this.maxStep, depthRatio);

    const r = this.fish.r;
    const sizeRatio = constrain(
      (r - game.gauge.minR) / (game.gauge.maxR - game.gauge.minR),
      0,
      1
    );

    let sizeFactor = lerp(1.0, 0.6, sizeRatio);

    if (baitMultiplier >= 1.5) {
      sizeFactor = lerp(sizeFactor, 1.0, 0.5);
    }

    let step = baseStep * sizeFactor;

    step *= baitMultiplier;
    step *= mult;

    // 스페이스바로 당기면 훅 위치가 올라가고, 다음 update()에서 물고기가 훅을 따라오며 줄도 자연스럽게 짧아진다.
    this.y -= step;
    if (this.y < this.boat.hookY()) this.y = this.boat.hookY();

    // 후킹 중에는 상하 이동을 pullStep에서만 반영해 물고기가 자연스럽게 같이 딸려 올라오게 한다.
    this.fish.y = this.y + this.hookOffsetY;
  }

  // 낚싯줄과 바늘을 화면에 그리기
  draw() {
    stroke(70);
    strokeWeight(2);
    line(this.boat.x, this.boat.hookY() - 32, this.x, this.y);

    push();
    translate(this.x, this.y);

    // 바늘 몸체
    noStroke();
    fill(230);
    circle(0, 0, this.r * 2);

    // 바늘 갈고리
    stroke(80);
    strokeWeight(3);
    noFill();
    arc(0, 6, 16, 16, PI * 0.1, PI * 1.2);

    // 미끼 이미지
    const baitId = game.activeBaitId || "BASIC";
    const baitImg = baitImages[baitId];

    if (baitImg) {
      push();
      translate(0, 14);

      const swaySpeed = 0.1;
      const swayAngle = 0.2;
      rotate(sin(frameCount * swaySpeed) * swayAngle);

      imageMode(CENTER);
      const drawW = 42;
      const scale = drawW / baitImg.width;
      const drawH = baitImg.height * scale;

      image(baitImg, 0, 0, drawW, drawH);
      pop();
    }

    pop();
  }
}
