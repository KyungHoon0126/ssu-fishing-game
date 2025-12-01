/* p5.js 낚시 게임 - 마우스 이동 + 스페이스 타이밍 */

let game;
let bgm;
let fishImages = {};

// 핵심 p5 생명주기 훅들은 Game 인스턴스에 처리 위임
// p5의 preload 단계에서 BGM과 모든 물고기 이미지를 미리 불러온다.
function preload() {
  console.log("preload 시작");
  bgm = loadSound(
    "Resources/Out of Flux - CHONKLAP.mp3",
    () => console.log("bgm 로드 성공"),
    (err) => console.error("bgm 로드 실패", err)
  );

  const allFish = [];
  for (const season in SEASON_DATA) {
    allFish.push(...SEASON_DATA[season].fishes);
  }

  for (const fishData of allFish) {
    fishImages[fishData.name] = loadImage(
      "Resources/Fishes/" + fishData.img,
      () => console.log(`${fishData.name} 로드 성공`),
      (err) => console.error(`${fishData.name} 로드 실패`)
    );
  }
}

// 캔버스를 생성하고 Game 객체를 초기화
function setup() {
  const c = createCanvas(900, 560);
  c.parent("wrap");
  c.elt.tabIndex = 0;
  c.elt.focus();
  game = new Game();
}

// 매 프레임마다 Game 업데이트와 렌더링을 위임
function draw() {
  game.update();
  game.render();
}

// ENTER 입력을 다루는 헬퍼로 키코드 차이를 흡수
function isEnter() {
  return keyCode === ENTER || keyCode === 13 || key === "Enter";
}

// 상태에 따라 메뉴, 정보창, 플레이 중 키 입력 처리
function keyPressed() {
  const lowerKey = (key || "").toLowerCase();
  if (game.state === "MENU" && isEnter()) {
    game.showInfo();
  } else if (game.state === "INFO") {
    if (isEnter()) game.start();
    if (lowerKey === "x") game.closeInfo();
  } else if (game.state === "RESULT" && isEnter()) {
    if (!game.pokedexOpen) {
      game.reset();
    }
  }

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

// 방향키를 뗄 때 배의 이동을 즉시 멈춤
function keyReleased() {
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    if (game && game.boat) game.boat.stop();
  }
}

// 각 게임 상태별로 클릭을 버튼/도감/후크 토글에 연결
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
    if (game.pokedexOpen) {
      const closeBounds = game.getPokedexCloseBounds();
      if (game.isPointInRect(mouseX, mouseY, closeBounds)) {
        game.pokedexOpen = false;
        return;
      }
    } else {
      game.reset();
    }
  } else if (game.state === "PLAY") {
    if (!game.hook.fish) game.hook.toggleDrop();
  }
}

// 정보창 또는 도감 열람 시 스크롤 입력을 처리
function mouseWheel(event) {
  if (game.state !== "INFO" && !game.pokedexOpen) return;

  const scrollSpeed = 0.35;
  const delta = event.delta || event.deltaY || 0;
  game.infoScroll = constrain(
    game.infoScroll + delta * scrollSpeed,
    0,
    game.infoScrollMax
  );
  return false;
}
