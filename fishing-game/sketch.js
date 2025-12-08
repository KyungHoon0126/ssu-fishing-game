/* p5.js 낚시 게임 - 마우스 이동 + 스페이스 타이밍 */

let game;
let fishImages = {};
let baitImages = {};
let backgroundImages = {};
let sfxController = {
  gauge: {},
};
let rewardSfx = null;
let uiImages = {
  shop: null,
  inventory: null,
  logo: null,
};

const AUDIO_BASE_PATH = "Resources/Audio/";
const BACKGROUND_BASE_PATH = "Resources/Background/";
const MENU_BGM_FILE = "시작.mp3";
const SEASON_BGM_FILES = {
  SPRING: "봄 테마.mp3",
  SUMMER: "여름 테마.mp3",
  AUTUMN: "가을 테마.mp3",
  WINTER: "겨울 테마.mp3",
};
const SEASON_BACKGROUND_FILES = {
  SPRING: "봄 배경.png",
  SUMMER: "여름 배경.png",
  AUTUMN: "가을 배경.png",
  WINTER: "겨울 배경.png",
};
const INVENTORY_BGM_FILE = "도감.mp3";
const RESULT_BGM_FILE = "종료.mp3";
const COUNTDOWN_BGM_FILE = "카운트다운.mp3";
const GAUGE_SFX_FILES = {
  HIT: "hit.mp3",
  MISS: "miss.mp3",
  PERFECT: "Perfect.mp3",
};
const REWARD_SFX_FILE = "코인2.mp3";

let bgmController = {
  menu: null,
  inventory: null,
  result: null,
  countdown: null,
  seasons: {},
  current: null,
  volume: 0.07,
  muted: false,
};

function toggleMute() {
  bgmController.muted = !bgmController.muted;
  if (bgmController.muted) {
    outputVolume(0, 0.1);
  } else {
    outputVolume(1, 0.1);
  }
}

// 핵심 p5 생명주기 훅들은 Game 인스턴스에 처리 위임
// p5의 preload 단계에서 BGM과 모든 물고기 이미지를 미리 불러온다.
function preload() {
  console.log("preload 시작");
  bgmController.menu = loadSound(
    AUDIO_BASE_PATH + MENU_BGM_FILE,
    () => console.log("시작 BGM 로드 성공"),
    (err) => console.error("시작 BGM 로드 실패", err)
  );

  bgmController.inventory = loadSound(
    AUDIO_BASE_PATH + INVENTORY_BGM_FILE,
    () => console.log("도감 BGM 로드 성공"),
    (err) => console.error("도감 BGM 로드 실패", err)
  );

  bgmController.result = loadSound(
    AUDIO_BASE_PATH + RESULT_BGM_FILE,
    () => console.log("종료 BGM 로드 성공"),
    (err) => console.error("종료 BGM 로드 실패", err)
  );

  bgmController.countdown = loadSound(
    AUDIO_BASE_PATH + COUNTDOWN_BGM_FILE,
    () => console.log("카운트다운 BGM 로드 성공"),
    (err) => console.error("카운트다운 BGM 로드 실패", err)
  );

  for (const [seasonKey, file] of Object.entries(SEASON_BGM_FILES)) {
    bgmController.seasons[seasonKey] = loadSound(
      AUDIO_BASE_PATH + file,
      () => console.log(`${seasonKey} BGM 로드 성공`),
      (err) => console.error(`${seasonKey} BGM 로드 실패`, err)
    );
  }

  for (const [seasonKey, file] of Object.entries(SEASON_BACKGROUND_FILES)) {
    backgroundImages[seasonKey] = loadImage(
      BACKGROUND_BASE_PATH + file,
      () => console.log(`${seasonKey} 배경 이미지 로드 성공`),
      (err) => console.error(`${seasonKey} 배경 이미지 로드 실패`, err)
    );
  }

  for (const [effect, file] of Object.entries(GAUGE_SFX_FILES)) {
    sfxController.gauge[effect] = loadSound(
      AUDIO_BASE_PATH + file,
      () => console.log(`${effect} SFX 로드 성공`),
      (err) => console.error(`${effect} SFX 로드 실패`, err)
    );
  }

  rewardSfx = loadSound(
    "Resources/코인2.mp3",
    () => console.log("코인 보상 SFX 로드 성공"),
    (err) => console.error("코인 보상 SFX 로드 실패", err)
  );

  uiImages.shop = loadImage(
    "Resources/상점.png",
    () => console.log("상점 아이콘 로드 성공"),
    (err) => console.error("상점 아이콘 로드 실패", err)
  );
  uiImages.inventory = loadImage(
    "Resources/보관함.png",
    () => console.log("보관함 아이콘 로드 성공"),
    (err) => console.error("보관함 아이콘 로드 실패", err)
  );

  uiImages.logo = loadImage(
    "Resources/로고.png",
    () => console.log("로고 이미지 로드 성공"),
    (err) => console.error("로고 이미지 로드 실패", err)
  );

  const allFish = [];
  for (const season in SEASON_DATA) {
    allFish.push(...SEASON_DATA[season].fishes);
  }

  for (const fishData of allFish) {
    fishImages[fishData.name] = loadImage(
      "Resources/Fish/" + fishData.img,
      () => console.log(`${fishData.name} 로드 성공`),
      (err) => console.error(`${fishData.name} 로드 실패`)
    );
  }

  if (Array.isArray(BAIT_TYPES)) {
    for (const bait of BAIT_TYPES) {
      if (!bait || !bait.img) continue;
      baitImages[bait.id] = loadImage(
        "Resources/Bait/" + bait.img,
        () => console.log(`${bait.name} 미끼 이미지 로드 성공`),
        (err) => console.error(`${bait.name} 미끼 이미지 로드 실패`, err)
      );
    }
  }
}

// 캔버스를 생성하고 Game 객체를 초기화
function setup() {
  const c = createCanvas(900, 560);
  c.parent("wrap");
  c.elt.tabIndex = 0;
  c.elt.focus();
  game = new Game();
  if (game && typeof game.ensureMenuMusic === "function") {
    game.ensureMenuMusic();
  }
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
  if (game && game.handleSoundToggleClick(mouseX, mouseY)) return;

  if (typeof getAudioContext === "function") {
    const audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state !== "running") {
      try {
        userStartAudio();
      } catch (err) {
        console.warn("오디오 컨텍스트 시작 실패", err);
      }
      if (
        bgmController.current &&
        typeof bgmController.current.isPlaying === "function" &&
        typeof bgmController.current.loop === "function" &&
        !bgmController.current.isPlaying()
      ) {
        bgmController.current.loop();
      } else if (game) {
        if (game.state === "MENU" || game.state === "INFO") {
          playMenuMusic();
        } else if (game.state === "PLAY") {
          if (game.countdownTriggered) playCountdownMusic();
          else playSeasonMusic(game.season);
        } else if (game.state === "RESULT") {
          playResultMusic();
        }
      }
    }
  }

  if (game.state === "MENU") {
    if (game.isMenuOverlayOpen()) {
      if (game.handleMenuOverlayClick(mouseX, mouseY)) return;
      const panel = game.menuOverlayBounds();
      if (!game.isPointInRect(mouseX, mouseY, panel)) {
        game.closeMenuOverlay();
      }
      return;
    }
    if (game.handleLogoClick(mouseX, mouseY)) return;
    if (game.handleMenuUtilityClick(mouseX, mouseY)) return;
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
      if (game.handleResultPokedexLogoClick(mouseX, mouseY)) return;
      const closeBounds = game.getPokedexCloseBounds();
      if (game.isPointInRect(mouseX, mouseY, closeBounds)) {
        game.closeResultPokedex();
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
  const delta = event.delta || event.deltaY || 0;

  if (game.state === "MENU" && game.isMenuOverlayOpen()) {
    const scrollSpeed = 0.35;
    game.scrollMenuOverlay(delta * scrollSpeed);
    return false;
  }

  if (game.state !== "INFO" && !game.pokedexOpen) return;

  const scrollSpeed = 0.35;
  game.infoScroll = constrain(
    game.infoScroll + delta * scrollSpeed,
    0,
    game.infoScrollMax
  );
  return false;
}

function playMenuMusic() {
  setActiveBgm(bgmController.menu, "MENU");
}

function playSeasonMusic(season) {
  const track = season ? bgmController.seasons[season] : null;
  if (!track) {
    console.warn(`계절 BGM을 찾을 수 없습니다: ${season}`);
    return;
  }
  setActiveBgm(track, season);
}

function playInventoryMusic() {
  setActiveBgm(bgmController.inventory, "INVENTORY");
}

function playResultMusic() {
  setActiveBgm(bgmController.result, "RESULT");
}

function playCountdownMusic() {
  setActiveBgm(bgmController.countdown, "COUNTDOWN");
}

function stopActiveMusic() {
  if (
    bgmController.current &&
    typeof bgmController.current.stop === "function"
  ) {
    bgmController.current.stop();
  }
  bgmController.current = null;
}

function setActiveBgm(sound, label = "") {
  if (!sound) {
    console.warn("재생할 사운드가 없습니다.", label);
    return;
  }
  if (typeof sound.isLoaded === "function" && !sound.isLoaded()) {
    console.warn("사운드가 아직 로드되지 않았습니다.", label);
    return;
  }
  if (
    bgmController.current === sound &&
    typeof sound.isPlaying === "function" &&
    sound.isPlaying()
  ) {
    return;
  }
  if (
    bgmController.current &&
    typeof bgmController.current.stop === "function"
  ) {
    bgmController.current.stop();
  }
  bgmController.current = sound;
  const vol = bgmController.volume || 0.12;
  if (typeof sound.setVolume === "function") {
    sound.setVolume(vol);
  }
  if (typeof sound.loop === "function") {
    sound.loop();
  }
}

function playGaugeFeedbackSound(effect) {
  if (!effect) return;
  const key = effect.toUpperCase();
  const sfx = sfxController.gauge[key];
  if (!sfx) return;
  if (typeof sfx.isLoaded === "function" && !sfx.isLoaded()) return;
  if (typeof sfx.isPlaying === "function" && sfx.isPlaying()) {
    if (typeof sfx.stop === "function") sfx.stop();
  }
  if (typeof sfx.play === "function") {
    sfx.play();
  }
}

function playRewardSound() {
  if (!rewardSfx) return;
  if (typeof rewardSfx.isLoaded === "function" && !rewardSfx.isLoaded()) return;
  if (typeof rewardSfx.isPlaying === "function" && rewardSfx.isPlaying()) {
    if (typeof rewardSfx.stop === "function") rewardSfx.stop();
  }
  if (typeof rewardSfx.play === "function") rewardSfx.play();
}
