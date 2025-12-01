// 계절 분위기를 살리는 간단한 파티클 (눈, 꽃잎 등) 표현
class Particle {
  // 타입에 따라 시작 위치와 이동 속도를 무작위 지정
  constructor(type) {
    this.type = type;
    this.x = random(width);
    this.y = random(-40, 0);
    this.vy = random(1.2, 3.2);
    this.vx = type === "leaf" || type === "petal" ? random(-0.4, 0.4) : 0;
    this.size = random(6, 14);
    this.rot = random(TWO_PI);
    this.spin = random(-0.02, 0.02);
  }

  // 중력 없이 지정 속도로 이동하고 회전을 누적
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.spin;
  }

  // 화면 아래로 벗어났는지 여부를 반환
  offscreen() {
    return this.y > height + 40;
  }

  // 타입별 색상을 적용해 타원을 그리기
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
