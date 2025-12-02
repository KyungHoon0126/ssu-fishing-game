// Game.prototype에 정보창과 공통 버튼 렌더러 혼합
(function () {
  if (typeof Game === "undefined") return;

  // 게임 설명 패널과 스크롤 콘텐츠 그리기
  Game.prototype.drawInfoScreen = function () {
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

    const textAreaW =
      panel.w - textMarginX * 2 - (scrollTrackWidth + scrollGap);
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
    if (typeof textWrap === "function" && typeof WORD !== "undefined")
      textWrap(WORD);

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
  };

  // 주어진 경계 안에 라벨이 있는 버튼 그리기
  Game.prototype.drawButton = function (bounds, label) {
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
  };

  // 닫기 버튼(정사각형 + X) 렌더링
  Game.prototype.drawCloseButton = function (bounds) {
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
  };

  // 설명 텍스트 영역에 붙는 커스텀 스크롤바 그리기
  Game.prototype.drawInfoScrollbar = function (x, y, h, totalHeight, opts) {
    const options = opts || {};
    const scrollValue =
      typeof options.scroll === "number" ? options.scroll : this.infoScroll;
    const scrollMax =
      typeof options.scrollMax === "number"
        ? options.scrollMax
        : this.infoScrollMax;
    const trackW = 8;
    push();
    rectMode(CENTER);
    noStroke();
    fill(255, 80);
    rect(x, y + h / 2, trackW, h, 6);

    const visibleRatio = h / totalHeight;
    const knobH = max(30, h * visibleRatio);
    const available = h - knobH;
    const progress = scrollMax === 0 ? 0 : scrollValue / scrollMax;
    const knobCenterY = y + knobH / 2 + available * progress;

    fill(255, 180);
    rect(x, knobCenterY, trackW, knobH, 6);
    pop();
  };

  // 정보 패널의 중앙 위치와 크기 정의
  Game.prototype.infoPanelBounds = function () {
    return {
      x: width / 2,
      y: height / 2,
      w: width * 0.68,
      h: height * 0.62,
    };
  };

  // 시작 버튼의 위치 계산
  Game.prototype.infoStartButtonBounds = function () {
    const panel = this.infoPanelBounds();
    const buttonH = 52;
    const bottomMargin = 40;
    const centerY = panel.y + panel.h / 2 - bottomMargin - buttonH / 2;
    return {
      x: panel.x,
      y: centerY,
      w: 220,
      h: buttonH,
    };
  };

  // 닫기 버튼 위치 계산
  Game.prototype.infoCloseButtonBounds = function () {
    const panel = this.infoPanelBounds();
    return {
      x: panel.x + panel.w / 2 - 36,
      y: panel.y - panel.h / 2 + 36,
      w: 32,
      h: 32,
    };
  };
})();
