// Game.prototype에 메뉴 관련 그리기 함수 혼합
(function () {
  if (typeof Game === "undefined") return;

  // 메인 메뉴 타이틀, 버튼, 탭을 묶어서 렌더링
  Game.prototype.drawMenuScreen = function () {
    this.drawTitle("SHOONG SHOONG");
    this.drawSub("시작하기를 눌러 설명 확인");
    this.drawButton(this.menuButtonBounds(), "시작하기");
    this.drawMenuCredit();
    this.drawSeasonTabs();
    this.drawMenuMoneyBadge();
    this.drawMenuUtilityIcons();
    if (this.isMenuOverlayOpen()) {
      this.drawMenuOverlay();
    }
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

  Game.prototype.drawMenuMoneyBadge = function () {
    push();
    fill(255);
    textAlign(LEFT, TOP);
    textSize(18);
    text(`소지금 : ${this.money}원`, 26, 26);
    pop();
  };

  Game.prototype.menuUtilityIconBounds = function (type) {
    const size = 56;
    const labelGap = 6;
    const labelHeight = 16;
    const totalH = size + labelGap + labelHeight;
    const marginRight = 86;
    const gap = 18;
    const index = type === "SHOP" ? 0 : 1;
    const x = width - marginRight - index * (size + gap) - size / 2;
    const iconCenterY = 96;
    const y = iconCenterY + (labelGap + labelHeight) / 2;
    return {
      x,
      y,
      w: size,
      h: totalH,
      iconCenterY,
      size,
      labelGap,
      labelHeight,
    };
  };

  Game.prototype.drawMenuUtilityIcons = function () {
    const configs = [
      { type: "SHOP", label: "상점" },
      { type: "INVENTORY", label: "보관함" },
    ];

    for (const cfg of configs) {
      const bounds = this.menuUtilityIconBounds(cfg.type);
      const active = this.menuOverlay === cfg.type;
      const hover = this.isPointInRect(mouseX, mouseY, bounds);
      const iconRadius = bounds.size / 2;
      const circleColor = active
        ? color(255, 255, 255)
        : color(255, hover ? 255 : 235);
      const borderColor = active ? color(255, 240, 150) : color(255, 245, 220);

      push();
      stroke(borderColor);
      strokeWeight(active ? 3 : 1.5);
      fill(circleColor);
      circle(bounds.x, bounds.iconCenterY, bounds.size);

      this.drawMenuUtilityGlyph(
        cfg.type,
        bounds.x,
        bounds.iconCenterY,
        iconRadius
      );

      noStroke();
      fill(255);
      textAlign(CENTER, TOP);
      textSize(12);
      text(
        cfg.label,
        bounds.x,
        bounds.iconCenterY + iconRadius + bounds.labelGap
      );
      pop();
    }
  };

  Game.prototype.drawMenuUtilityGlyph = function (type, cx, cy, r) {
    push();
    translate(cx, cy);
    const img = type === "SHOP" ? uiImages?.shop : uiImages?.inventory;
    if (img) {
      imageMode(CENTER);
      const scale = r * 1.6;
      image(img, 0, 0, scale, scale);
    } else {
      stroke(20, 70, 110);
      strokeWeight(2.4);
      noFill();
      circle(0, 0, r * 1.2);
      line(-r * 0.4, 0, r * 0.4, 0);
      if (type === "SHOP") {
        line(0, -r * 0.4, 0, r * 0.4);
      }
    }
    pop();
  };

  Game.prototype.drawMenuOverlay = function () {
    this.drawDimOverlay(200);
    const panel = this.menuOverlayBounds();

    push();
    rectMode(CENTER);
    noStroke();
    fill(12, 46, 78, 240);
    rect(panel.x, panel.y, panel.w, panel.h, 20);
    pop();

    this.drawCloseButton(this.menuOverlayCloseBounds());

    if (this.menuOverlay === "SHOP") {
      this.drawShopOverlay(panel);
    } else if (this.menuOverlay === "INVENTORY") {
      this.drawInventoryOverlay(panel);
    }
  };

  Game.prototype.menuOverlayBounds = function () {
    return {
      x: width / 2,
      y: height / 2,
      w: width * 0.74,
      h: height * 0.8,
    };
  };

  Game.prototype.menuOverlayCloseBounds = function () {
    const panel = this.menuOverlayBounds();
    return {
      x: panel.x + panel.w / 2 - 32,
      y: panel.y - panel.h / 2 + 32,
      w: 32,
      h: 32,
    };
  };

  Game.prototype.menuOverlayViewport = function () {
    const panel = this.menuOverlayBounds();
    const paddingX = 36;
    const headerOffset = 120;
    const bottomPadding = 46;
    return {
      x: panel.x - panel.w / 2 + paddingX,
      y: panel.y - panel.h / 2 + headerOffset,
      w: panel.w - paddingX * 2,
      h: panel.h - headerOffset - bottomPadding,
    };
  };

  Game.prototype.menuOverlayLayout = function () {
    const viewport = this.menuOverlayViewport();
    const rowH = 92;
    const gap = 12;
    return {
      viewport,
      rowH,
      gap,
      width: viewport.w - 20,
      centerX: viewport.x + viewport.w / 2,
      startY: viewport.y + 6,
    };
  };

  Game.prototype.updateMenuOverlayScrollMetrics = function (rowCount) {
    const layout = this.menuOverlayLayout();
    const totalHeight =
      rowCount * layout.rowH + Math.max(0, rowCount - 1) * layout.gap;
    this.menuOverlayContentHeight = totalHeight;
    const overflow = totalHeight - layout.viewport.h;
    this.menuOverlayScrollMax = max(0, overflow);
    this.menuOverlayScroll = constrain(
      this.menuOverlayScroll,
      0,
      this.menuOverlayScrollMax
    );
  };

  Game.prototype.drawMenuOverlayScrollbar = function () {
    if (this.menuOverlayScrollMax <= 0) return;
    const viewport = this.menuOverlayViewport();
    const trackX = viewport.x + viewport.w - 6;
    const totalHeight = Math.max(
      viewport.h,
      this.menuOverlayContentHeight || viewport.h
    );
    this.drawInfoScrollbar(trackX, viewport.y, viewport.h, totalHeight, {
      scroll: this.menuOverlayScroll,
      scrollMax: this.menuOverlayScrollMax,
    });
  };

  Game.prototype.overlayRowBounds = function (index) {
    const layout = this.menuOverlayLayout();
    const y =
      layout.startY +
      index * (layout.rowH + layout.gap) +
      layout.rowH / 2 -
      this.menuOverlayScroll;
    const top = y - layout.rowH / 2;
    const bottom = y + layout.rowH / 2;
    const viewport = layout.viewport;
    const visible = bottom >= viewport.y && top <= viewport.y + viewport.h;
    return {
      x: layout.centerX,
      y,
      w: layout.width,
      h: layout.rowH,
      visible,
    };
  };

  Game.prototype.shopButtonBounds = function (index, rowOverride) {
    const row = rowOverride || this.overlayRowBounds(index);
    if (!row.visible) return null;
    return {
      x: row.x + row.w / 2 - 70,
      y: row.y,
      w: 120,
      h: 36,
    };
  };

  Game.prototype.inventoryButtonBounds = function (index, rowOverride) {
    const row = rowOverride || this.overlayRowBounds(index);
    if (!row.visible) return null;
    return {
      x: row.x + row.w / 2 - 70,
      y: row.y,
      w: 120,
      h: 36,
    };
  };

  Game.prototype.getOwnedBaitList = function () {
    if (!Array.isArray(BAIT_TYPES)) return [];
    return BAIT_TYPES.filter((bait) => this.hasBait(bait.id));
  };

  Game.prototype.drawShopOverlay = function (panel) {
    const items = Array.isArray(BAIT_TYPES) ? BAIT_TYPES : [];
    fill(255);
    textAlign(CENTER, TOP);
    textSize(28);
    text("상점 - 미끼 구매", panel.x, panel.y - panel.h / 2 + 40);
    textSize(16);
    text(
      "어려운 물고기를 낚아 모은 골드로 새로운 미끼를 구매하세요.",
      panel.x,
      panel.y - panel.h / 2 + 72
    );

    this.updateMenuOverlayScrollMetrics(items.length);
    const viewport = this.menuOverlayViewport();

    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(viewport.x, viewport.y, viewport.w, viewport.h);
    drawingContext.clip();

    items.forEach((bait, index) => {
      const row = this.overlayRowBounds(index);
      if (!row.visible) return;
      const owned = this.hasBait(bait.id);
      const canBuy = !owned && this.canAfford(bait.price);
      push();
      rectMode(CENTER);
      noStroke();
      fill(255, owned ? 45 : 30);
      rect(row.x, row.y, row.w, row.h, 16);
      pop();

      const thumbSize = row.h - 6;
      const thumbX = row.x - row.w / 2 + thumbSize / 2 + 14;
      this.drawBaitThumbnail(bait, thumbX, row.y, thumbSize);

      const leftX = thumbX + thumbSize / 2 + 18;
      const textWidth = row.x + row.w / 2 - leftX - 150;
      fill(255);
      textAlign(LEFT, TOP);
      textSize(18);
      text(bait.name, leftX, row.y - row.h / 2 + 10);

      textSize(12);
      textLeading(18);
      fill(220);
      text(bait.desc, leftX, row.y - row.h / 2 + 36, textWidth);

      const effectInfo = this.describeBaitEffects(bait);
      fill(180, 215, 255);
      textSize(12);
      text(`효과: ${effectInfo}`, leftX, row.y + row.h / 2 - 28, textWidth);

      fill(255, 235, 160);
      textAlign(RIGHT, TOP);
      textSize(15);
      const priceLabel = bait.price > 0 ? `${bait.price} GOLD` : "기본 지급";
      text(priceLabel, row.x + row.w / 2 - 20, row.y - row.h / 2 + 12);

      const btn = this.shopButtonBounds(index, row);
      if (!btn) return;
      const hover = this.isPointInRect(mouseX, mouseY, btn);
      push();
      rectMode(CENTER);
      stroke(canBuy ? color(255) : color(200));
      strokeWeight(2);
      fill(
        owned
          ? color(120, 220)
          : canBuy
          ? color(255, 255, 255, hover ? 230 : 185)
          : color(120, 120, 120, 140)
      );
      rect(btn.x, btn.y, btn.w, btn.h, 10);
      pop();

      fill(owned ? 30 : 20);
      textAlign(CENTER, CENTER);
      textSize(14);
      let label = "구매";
      if (owned) label = "보유중";
      else if (!canBuy) label = "골드 부족";
      text(label, btn.x, btn.y);
    });

    drawingContext.restore();
    pop();

    this.drawMenuOverlayScrollbar();
    textLeading(20);
  };

  Game.prototype.drawInventoryOverlay = function (panel) {
    const items = this.getOwnedBaitList();
    fill(255);
    textAlign(CENTER, TOP);
    textSize(28);
    text("보관함 - 미끼 교체", panel.x, panel.y - panel.h / 2 + 40);
    textSize(16);
    text(
      "보유중인 미끼를 선택해 현재 장비를 바꿀 수 있습니다.",
      panel.x,
      panel.y - panel.h / 2 + 72
    );

    if (!items.length) {
      textSize(18);
      fill(220);
      text(
        "보유중인 미끼가 없습니다. 상점에서 먼저 구매해 주세요.",
        panel.x,
        panel.y
      );
      return;
    }

    this.updateMenuOverlayScrollMetrics(items.length);
    const viewport = this.menuOverlayViewport();

    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(viewport.x, viewport.y, viewport.w, viewport.h);
    drawingContext.clip();

    items.forEach((bait, index) => {
      const row = this.overlayRowBounds(index);
      if (!row.visible) return;
      const equipped = this.activeBaitId === bait.id;
      push();
      rectMode(CENTER);
      noStroke();
      fill(equipped ? color(255, 255, 255, 55) : color(255, 35));
      rect(row.x, row.y, row.w, row.h, 16);
      pop();

      const thumbSize = row.h - 6;
      const thumbX = row.x - row.w / 2 + thumbSize / 2 + 14;
      this.drawBaitThumbnail(bait, thumbX, row.y, thumbSize);

      const leftX = thumbX + thumbSize / 2 + 18;
      const textWidth = row.x + row.w / 2 - leftX - 140;

      fill(255);
      textAlign(LEFT, TOP);
      textSize(20);
      text(bait.name, leftX, row.y - row.h / 2 + 10);

      textSize(13);
      fill(220);
      const effectInfo = this.describeBaitEffects(bait);
      text(
        `${bait.desc}\n${effectInfo}`,
        leftX,
        row.y - row.h / 2 + 38,
        textWidth
      );

      const btn = this.inventoryButtonBounds(index, row);
      if (!btn) return;
      const hover = this.isPointInRect(mouseX, mouseY, btn);
      const canEquip = !equipped;
      push();
      rectMode(CENTER);
      stroke(canEquip ? color(255) : color(200));
      strokeWeight(2);
      fill(
        equipped
          ? color(120, 220)
          : canEquip
          ? color(255, 255, 255, hover ? 220 : 180)
          : color(120, 120, 120, 140)
      );
      rect(btn.x, btn.y, btn.w, btn.h, 10);
      pop();

      fill(equipped ? 20 : 30);
      textAlign(CENTER, CENTER);
      textSize(15);
      let label = "장착";
      if (equipped) label = "장착중";
      text(label, btn.x, btn.y);
    });

    drawingContext.restore();
    pop();

    this.drawMenuOverlayScrollbar();
  };

  Game.prototype.describeBaitEffects = function (bait) {
    if (!bait || !bait.effects) return "";
    const parts = [];
    if (bait.effects.toleranceBonus) {
      parts.push(`게이지 +${bait.effects.toleranceBonus}`);
    }
    if (bait.effects.valueMultiplier && bait.effects.valueMultiplier !== 1) {
      parts.push(`골드 x${bait.effects.valueMultiplier}`);
    }
    if (bait.effects.reelBonus && bait.effects.reelBonus !== 1) {
      parts.push(`당기기 속도 x${bait.effects.reelBonus}`);
    }
    return parts.length ? parts.join(" / ") : "특별 효과 없음";
  };

  Game.prototype.getBaitImage = function (bait) {
    if (!bait || !baitImages) return null;
    if (baitImages[bait.id]) return baitImages[bait.id];
    return null;
  };

  Game.prototype.drawBaitThumbnail = function (bait, x, y, size) {
    push();
    rectMode(CENTER);
    noStroke();
    fill(255, 255, 255, 18);
    rect(x, y, size + 18, size + 14, 12);
    const img = this.getBaitImage(bait);
    if (img) {
      imageMode(CENTER);
      const aspect = img.width && img.height ? img.width / img.height : 1;
      let drawW = size;
      let drawH = size;
      if (aspect > 1) drawH = size / aspect;
      else drawW = size * aspect;
      image(img, x, y, drawW, drawH);
    } else {
      fill(255, 220);
      textAlign(CENTER, CENTER);
      textSize(10);
      text("NO IMG", x, y);
    }
    pop();
  };

  Game.prototype.handleMenuUtilityClick = function (px, py) {
    const icons = [{ type: "SHOP" }, { type: "INVENTORY" }];
    for (const icon of icons) {
      const bounds = this.menuUtilityIconBounds(icon.type);
      if (this.isPointInRect(px, py, bounds)) {
        if (this.menuOverlay === icon.type) this.closeMenuOverlay();
        else if (icon.type === "SHOP") this.openShop();
        else this.openInventory();
        return true;
      }
    }
    return false;
  };

  Game.prototype.handleMenuOverlayClick = function (px, py) {
    if (!this.isMenuOverlayOpen()) return false;
    const closeBounds = this.menuOverlayCloseBounds();
    if (this.isPointInRect(px, py, closeBounds)) {
      this.closeMenuOverlay();
      return true;
    }
    if (this.menuOverlay === "SHOP") {
      return this.handleShopClick(px, py);
    }
    if (this.menuOverlay === "INVENTORY") {
      return this.handleInventoryClick(px, py);
    }
    return false;
  };

  Game.prototype.handleShopClick = function (px, py) {
    const items = Array.isArray(BAIT_TYPES) ? BAIT_TYPES : [];
    for (let i = 0; i < items.length; i++) {
      const btn = this.shopButtonBounds(i);
      if (btn && this.isPointInRect(px, py, btn)) {
        return this.buyBait(items[i].id);
      }
    }
    return false;
  };

  Game.prototype.handleInventoryClick = function (px, py) {
    const items = this.getOwnedBaitList();
    for (let i = 0; i < items.length; i++) {
      const btn = this.inventoryButtonBounds(i);
      if (btn && this.isPointInRect(px, py, btn)) {
        return this.equipBait(items[i].id);
      }
    }
    return false;
  };
})();
