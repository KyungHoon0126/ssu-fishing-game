// 계절별 능력치와 스프라이트를 가진 물고기 개체 표현
class Fish {
  // 초기 위치, 반지름, 속도 범위 등을 받아 물고기 구성
  constructor(x, y, r, speed, strength, score, hue, name = "FISH") {
    this.x = x;
    this.y = y;
    this.r = r;
    this.speed = speed;
    this.vx = random(speed[0], speed[1]) * (random() < 0.5 ? 1 : -1);
    this.vy = random(0.2, 0.5) * (random() < 0.5 ? 1 : -1);
    this.strength = strength;
    this.score = score;
    this.hue = hue;
    this.name = name;
    this.noiseSeed = random(1000);
    this.flip = this.vx < 0 ? 1 : -1;
    this.hookedBaseX = null;
    this.hookedPhase = random(TWO_PI);
    this.caught = false;
    this.hookedPhase = random(TWO_PI);
  }

  // 주어진 계절 데이터에서 무작위 물고기 설정을 뽑아 인스턴스 생성
  static randomBySeason(seasonName) {
    const seasonData = SEASON_DATA[seasonName];
    const fishData = random(seasonData.fishes);
    const r = fishData.r;
    const x = random(r * 2, width - r * 2);
    const y = random(180, height - 50);
    return new Fish(
      x,
      y,
      r,
      fishData.speed,
      fishData.r,
      fishData.score,
      fishData.color,
      fishData.name
    );
  }

  // 경계에 닿으면 방향을 반전시켜 유영
  updateHooked(hook) {
    if (this.hookedBaseX === null) this.hookedBaseX = this.x;

    // 물고기 크기별 흔들림 스케일 (큰 물고기일수록 더 넓게/더 많이 흔들림)
    const minR = game.gauge.minR;
    const maxR = game.gauge.maxR;
    const sizeT = constrain((this.r - minR) / (maxR - minR), 0, 1);

    // 흔들림 범위(진폭): 전체적으로 키우고 + 큰 물고기일수록 더 큼
    const baseAmp = 14; // 전체 흔들림 기본 폭(전보다 크게)
    const extraAmp = 32; // 큰 물고기 가산 폭
    const amp = baseAmp + extraAmp * sizeT;

    // 흔들림 속도: 큰 물고기일수록 조금 느리게
    const baseFreq = 0.06;
    const slowDown = 0.03;
    const freq = baseFreq - slowDown * sizeT;

    this.hookedPhase += freq;

    // 좌우 흔들림
    const targetX = this.hookedBaseX + sin(this.hookedPhase) * amp;

    // 화면 밖으로 너무 나가지 않게 제한
    const clampX = constrain(targetX, this.r * 2, width - this.r * 2);

    this.x = clampX;
    this.flip = sin(this.hookedPhase) >= 0 ? -1 : 1;
  }

  update() {
    // 훅에 걸린 상태에서도 좌우로만 계속 움직이도록 한다.
    if (this.caught) {
      const wobbleX = sin(frameCount * 0.25 + this.hookedPhase) * 1.8;
      this.x += wobbleX;

      // 화면 밖으로 튀거나 벽을 계속 뚫지 않게 최소한으로 클램프한다.
      this.x = constrain(this.x, 20, width - 20);

      // 훅킹 중에는 좌우 방향(뒤집힘)도 흔들림 방향에 맞춰 자연스럽게 갱신한다.
      this.flip = wobbleX < 0 ? 1 : -1;
      return;
    }

    if (this.x < 20 || this.x > width - 20) this.vx *= -1;
    if (this.y < 160 || this.y > height - 80) this.vy *= -1;
    this.x += this.vx;
    this.y += this.vy;
    this.flip = this.vx < 0 ? 1 : -1;
  }

  // 보유 중인 이미지가 있으면 스프라이트를, 없으면 단색 도형 그리기
  draw() {
    push();
    translate(this.x, this.y);
    scale(this.flip, 1);

    const animSpeed = 0.08;
    const animWave = sin(frameCount * animSpeed + this.noiseSeed);
    const bobOffset = animWave * map(this.r, 12, 26, 2, 5);
    const tailWiggle = animWave * 0.06 * map(this.r, 12, 26, 1.2, 0.8);

    translate(0, bobOffset);
    rotate(tailWiggle);

    const img = fishImages[this.name];
    const imgW = this.r * 4.0;
    const imgH = this.r * 2.8;

    if (img) {
      image(img, -imgW / 2, -imgH / 2, imgW, imgH);
      if (this.score >= 20) {
        noFill();
        stroke(255, 220);
        strokeWeight(1.2);
        ellipse(0, 0, imgW + 6, imgH + 6);
      }
    } else {
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
    }
    pop();
  }
}
