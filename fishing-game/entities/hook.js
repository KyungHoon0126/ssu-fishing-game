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

  // 물고기가 닿았을 때 훅 상태로 진입
  onHook(fish) {
    this.fish = fish;
    this.mode = "HOOKED";
    fish.caught = true;
  }

  // 실패 판정 시 물고기를 놓치고 다시 내리기
  forceEscape() {
    if (!this.fish) return;
    this.fish.caught = false;
    this.fish = null;
    this.mode = "DOWN";
  }

  // 완전 실패 시 낚싯줄을 위로 끌어올리기
  forceFullMiss() {
    if (!this.fish) return;
    this.fish.caught = false;
    this.fish = null;
    this.mode = "UP";
  }

  // 게이지 히트 시 낚싯줄을 일정 단계만큼 끌어올리기
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

  // 낚싯줄과 바늘을 화면에 그리기
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
