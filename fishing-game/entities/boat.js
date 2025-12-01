// 수면 위를 이동하는 플레이어 배 제어
class Boat {
  // 초기 위치와 속도 설정
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 5;
    this.dir = 0;
  }

  // 배를 현재 진행 방향으로 움직이고 화면 범위 안에 고정
  update() {
    this.x += this.dir * this.speed;
    this.x = constrain(this.x, 80, width - 80);
  }

  // 낚싯바늘이 매달리는 수면 높이 반환
  hookY() {
    return this.y + 26;
  }

  // 왼쪽 이동 시작
  moveLeft() {
    this.dir = -1;
  }

  // 오른쪽 이동 시작
  moveRight() {
    this.dir = 1;
  }

  // 이동 멈춤
  stop() {
    this.dir = 0;
  }

  // 배의 간단한 도형 표현 그리기
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
