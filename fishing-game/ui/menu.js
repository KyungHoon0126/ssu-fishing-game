// Game.prototype에 메뉴 관련 그리기 함수 혼합
(function () {
  if (typeof Game === "undefined") return;

  // 메인 메뉴 타이틀, 버튼, 탭을 묶어서 렌더링
  Game.prototype.drawMenuScreen = function () {
    this.drawTitle("SHOONG SHOONG FISHING");
    this.drawSub("시작하기를 눌러 설명을 확인하세요");
    this.drawButton(this.menuButtonBounds(), "시작하기");
    this.drawMenuCredit();
    this.drawSeasonTabs();
  };

  // 화면 하단 우측에 제작자 정보 표기
  Game.prototype.drawMenuCredit = function () {
    fill(255, 220);
    textAlign(RIGHT, BOTTOM);
    textSize(16);
    text(this.authorCredit, width - 24, height - 18);
  };

  // 선택 가능한 계절 탭들 버튼 형태로 출력
  Game.prototype.drawSeasonTabs = function () {
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
  };

  // 계절 탭들의 위치/크기 계산해 배열로 반환
  Game.prototype.seasonTabRects = function () {
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
        bounds: { x: cx, y: cy, w: tabW, h: tabH },
      });
    }
    return rects;
  };

  // 메뉴의 "시작하기" 버튼 영역 반환
  Game.prototype.menuButtonBounds = function () {
    return {
      x: width / 2,
      y: height / 2 + 90,
      w: 200,
      h: 56,
    };
  };

  // 클릭 좌표가 탭 영역에 닿았는지 확인하고 계절을 전환
  Game.prototype.handleSeasonTabClick = function (px, py) {
    const tabs = this.seasonTabRects();
    for (const tab of tabs) {
      if (this.isPointInRect(px, py, tab.bounds)) {
        this.setSeason(tab.season);
        return true;
      }
    }
    return false;
  };
})();
