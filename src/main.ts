import { setAudioHidden, disposeAudio, audioDiagnostics } from "./audio-engine";
import { lightLabel, nextLighting } from "./lighting";
import { snowLayer, adaptSnow } from "./snow";
import { TrainSound } from "./train-sound";
import "./style.css";
import {
  VILLAGES, BASIC_VILLAGES, ALL_VILLAGES, BASIC_TRACK_IDS, isBasicVillage,
  TRACKS,
  villageById,
  type SelectionId,
  type TrackId,
} from "./catalog";
import {
  defaults,
  parsePreferences,
  reconcileAccess,
  canUseVillage,
  grantVillagePass,
} from "./state";
import { Actors } from "./actors";
import { scene } from "./scene";
import { productThumbnail, preloadProduct } from "./product";
import { icon, type Icon } from "./icons";
import { MusicPlayer, type MusicState } from "./music";
import {
  subscribeSheetBack,
  bindSafeArea,
  adAvailability,
  earnPass,
  savePhoto,
  type AdAvailability, serverTime, readNativePreferences, writeNativePreferences,
} from "./native";
import { captureVillage } from "./photo";

import { BasicLights, nextBasicPattern } from "./basic-lights";
import { AccessClock } from "./access-clock";

async function start() {
const KEY = "merry-village:v2";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let storageWorking = true;
let preferences = defaults();
try {
  preferences = parsePreferences((await readNativePreferences(KEY)) ?? localStorage.getItem(KEY));
} catch {
  storageWorking = false;
}
let savedTime = 0;
try { savedTime = Number(localStorage.getItem(KEY + ":time")) || 0; } catch { /* storage unavailable */ }
const clock = new AccessClock(Math.max(savedTime,preferences.lastSeenTime));
const initialTime = await serverTime();
if (initialTime) clock.sync(initialTime);
reconcileAccess(preferences, clock.now());

type Sheet = "villages" | "music" | "photo" | "pass";
let sheet: Sheet | null = null;
let backGeneration = 0;
let stopSheetBack = () => {};
function releaseSheetBack() {
  backGeneration++;
  stopSheetBack();
  stopSheetBack = () => {};
}
let availability: AdAvailability | null = null,
  availabilityPromise: Promise<void> | null = null;
let rewardBusy = false,
  adMessage = "",
  photoBlob: Blob | null = null,
  photoUrl = "",
  photoBusy = false,
  photoToken = 0;
let musicState: MusicState = "paused";
let actors: Actors | null = null;
let basicLights: BasicLights | null = null;
let savedJourney = 0;
let renderedVillage: SelectionId | null = null;
const app = document.querySelector<HTMLElement>("#app")!;
let stopSafeArea = () => {};
void bindSafeArea(app).then(stop => { stopSafeArea = stop; });
const nav: { id: Sheet; label: string; icon: Icon }[] = [
  { id: "villages", label: "빌리지", icon: "village" },
  { id: "music", label: "음악 선택", icon: "music" },
  { id: "photo", label: "사진 촬영", icon: "camera" },
];
app.innerHTML = `
 <main class="experience">
 <div class="hero">
 ${snowLayer("back")}<div id="scene-host"></div>${snowLayer("front")}
 <div class="scene-controls" role="group" aria-label="오르골 조작">${(
   [
     { id: "motion", label: "동작", symbol: "play" },
     { id: "lights", label: "조명", symbol: "lantern" },
     { id: "snow", label: "눈", symbol: "snow" },
   ] as const
 )
   .map(
     (c) =>
       `<button id="${c.id}-toggle" data-action="${c.id}" aria-label="${c.label}" aria-pressed="true">${icon(c.symbol)}<span>${c.label}<b id="${c.id}-label" hidden></b></span></button>`,
   )
   .join("")}</div>
 <p class="graphics-status" id="graphics-status" role="status"></p>
 </div>
 <div class="selected-village"><div><strong id="village-title"></strong><small id="village-access"></small></div></div>
 <div class="now-playing"><div class="song-detail"><strong id="song-name"></strong><div class="song-timeline"><input id="progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="음악 재생 위치"><span id="music-time">0:00 / 0:00</span></div><span id="music-status" role="status"></span></div><button class="transport" data-action="previous" aria-label="이전 곡">${icon("play")}</button><button class="round-play" data-action="play" aria-label="음악 재생">${icon("play")}</button><button class="transport" data-action="next" aria-label="다음 곡">${icon("play")}</button></div>
 </main><nav class="bottom-nav" aria-label="메인 메뉴">${nav.map((item) => `<button data-action="${item.id}" aria-label="${item.label}" aria-expanded="false">${icon(item.icon)}<span>${item.label}</span></button>`).join("")}</nav>
 <dialog class="sheet" id="sheet" aria-labelledby="sheet-title"><div class="sheet-shell"><header class="sheet-header"><div><p class="eyebrow">MERRY VILLAGE</p><h2 id="sheet-title"></h2></div><button class="close-button" data-action="close" aria-label="닫기">${icon("close")}</button></header><div id="sheet-content"></div><p id="sheet-feedback" class="sheet-feedback" role="status" aria-live="polite"></p></div></dialog>
 <div id="toast" class="toast" role="status" aria-live="polite"></div>`;
const trainSound = new TrainSound((status) => {
  app.dataset.sound = status;
});
const stopSnowMonitor = adaptSnow(app);
const dialog = app.querySelector<HTMLDialogElement>("#sheet")!;
const content = app.querySelector<HTMLElement>("#sheet-content")!;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
function toast(message: string): void {
  const el = app.querySelector<HTMLElement>("#toast")!;
  el.textContent = message;
  const feedback = app.querySelector<HTMLElement>("#sheet-feedback");
  if (dialog.open && feedback) feedback.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 4200);
}
function persist(): void {
  preferences.lastSeenTime = clock.now();
  writeNativePreferences(KEY, JSON.stringify(preferences));
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
    localStorage.setItem(KEY + ":time", String(clock.now()));
    storageWorking = true;
  } catch {
    storageWorking = false;
  }
}
let rewardTarget: SelectionId = "cozy";
function setRewardTarget(target: SelectionId) {
  if (rewardTarget !== target) adMessage = "";
  rewardTarget = target;
}
function villageUnlocked(id: SelectionId) { return canUseVillage(preferences, id, clock.now()); }
function targetActive() { return villageUnlocked(rewardTarget); }
const basic = () => isBasicVillage(preferences.village);
function display() { return { village: preferences.village, effect: null, night: preferences.night }; }
function formatExpiry(pass: { expiresAt: number } | null | undefined): string {
  return pass
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(pass.expiresAt)
    : "";
}
const player = new MusicPlayer(
  preferences.track,
  preferences.volume,
  (state) => {
    musicState = state;
    updateMusic();
  },
  () => { void player.play(); },
);
player.setRepeat(true);
let playerTrack = preferences.track;
function selectTrack(track: TrackId) { playerTrack = track; player.select(track); }
function changeTrack(direction: number) {
  const tracks = TRACKS.filter((t) => t.available && (!basic() || BASIC_TRACK_IDS.includes(t.id as TrackId)));
  const i = tracks.findIndex((t) => t.id === preferences.track);
  preferences.track = tracks[(i + direction + tracks.length) % tracks.length]!
    .id as TrackId;
  selectTrack(preferences.track);
  void player.play();
  persist();
  updateMusic();
}
function updateMusic(): void {
  for (const button of app.querySelectorAll<HTMLButtonElement>('.transport')) button.hidden = false;
  const track = TRACKS.find((t) => t.id === preferences.track)!;
  app.querySelector("#song-name")!.textContent = track.name;
  app.querySelector("#music-status")!.textContent =
    musicState === "playing"
      ? preferences.volume === 0
        ? "음량 0 · 재생 중"
        : "오르골이 연주하고 있어요"
      : musicState === "blocked"
        ? "재생 버튼을 눌러 음악을 켜주세요"
        : musicState === "unavailable"
          ? "이 브라우저는 음악 재생을 지원하지 않아요"
          : "잠시 쉬어가는 중";
  for (const b of app.querySelectorAll<HTMLButtonElement>(
    '[data-action="play"]',
  )) {
    b.innerHTML = icon(musicState === "playing" ? "pause" : "play");
    b.setAttribute(
      "aria-label",
      musicState === "playing" ? "음악 일시정지" : "음악 재생",
    );
    b.disabled = musicState === "unavailable";
  }
  for (const row of app.querySelectorAll<HTMLElement>("[data-track]"))
    row.setAttribute(
      "aria-pressed",
      String(row.dataset.track === preferences.track),
    );
}
function render(): void {
  const current = display();
  if (basic() && !BASIC_TRACK_IDS.includes(preferences.track)) preferences.track = "snow";
  if (playerTrack !== preferences.track) {
    const playing = musicState === "playing";
    selectTrack(preferences.track);
    if (playing) void player.play();
  }
  app.dataset.tier = basic() ? "basic" : "premium";
  if (renderedVillage !== current.village) {
    savedJourney = actors?.journeyTime ?? savedJourney;
    trainSound.setRunning(false);
    actors?.destroy();
    actors = null;
    basicLights?.destroy();
    basicLights = null;
    app.querySelector("#scene-host")!.innerHTML = scene(current.village);
    if (isBasicVillage(current.village)) {
      basicLights = new BasicLights(app.querySelector<HTMLCanvasElement>(".basic-lights")!,current.village);
      app.querySelector("#graphics-status")!.textContent = "";
    } else try {
      actors = new Actors(
        app.querySelector<HTMLElement>("#scene-host .actor-stage")!,
        current.village,
        (journey, x, visible, lap) =>
          trainSound.updatePosition(journey, x, visible, current.village, lap),
        savedJourney,
      );
      app.querySelector("#graphics-status")!.textContent = "";
    } catch {
      actors = null;
      app.querySelector("#graphics-status")!.textContent =
        "3D 그래픽을 지원하지 않아 동작을 표시할 수 없어요.";
    }
    renderedVillage = current.village;
  }
  app.dataset.village = current.village;
  app.querySelector("#village-title")!.textContent = villageById(current.village).name;
  app.querySelector("#village-access")!.textContent = villageById(current.village).premium ? `${formatExpiry(!isBasicVillage(current.village) ? preferences.villagePasses[current.village] : null)}까지 이용 가능` : "무료 베이직 · 항상 이용 가능";

  app.dataset.effect = current.effect ?? "none";
  app.classList.add("night");
  actors?.update({
    motion: preferences.motion,
    pattern: preferences.lightPattern,
    gold: current.effect === "shooting",
    hidden: document.hidden || rewardBusy || dialog.open,
  });
  trainSound.syncJourney(
    Number(
      app
        .querySelector("#scene-host .actor-stage")
        ?.getAttribute("data-elapsed") ?? 0,
    ),
  );
  trainSound.setRunning(
    !!actors &&
      preferences.motion &&
      !reducedMotion.matches &&
      !document.hidden &&
      !rewardBusy && !dialog.open,
  );
  basicLights?.update(preferences.basicPattern,document.hidden || rewardBusy || dialog.open,reducedMotion.matches);
  app.classList.toggle("snow-off", !preferences.snow);
  if (actors)
    app.querySelector("#graphics-status")!.textContent = reducedMotion.matches
      ? "움직임 줄이기 설정으로 동작이 정지되어 있어요."
      : "";
  for (const id of ["motion", "lights", "snow"] as const) {
    const button = app.querySelector<HTMLButtonElement>(`#${id}-toggle`)!;
    button.setAttribute(
      "aria-pressed",
      id === "lights" ? "true" : String(preferences[id]),
    );
    app.querySelector(`#${id}-label`)!.textContent =
      "";
    if (id !== "lights") button.setAttribute("aria-label", `${id === "motion" ? "동작" : "눈"} · ${preferences[id] ? "켜짐" : "꺼짐"}`);
    if (id === "lights") {
      button.setAttribute("aria-label", "조명");
    }
    if (id === "lights") {
      button.title = `${lightLabel(preferences)} · 눌러 다음 패턴`;
      button.dataset.pattern = preferences.lightPattern;
    }
    if (id === "motion") { button.disabled = !actors; button.hidden = basic(); }
    if (id === "lights" && basic()) { button.dataset.pattern = preferences.basicPattern; button.title = preferences.basicPattern === "gentle" ? "은은한 조명" : "반짝이는 조명"; }
  }
  updateMusic();
}
function cleanPhoto(): void {
  photoToken++;
  photoBusy = false;
  photoBlob = null;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = "";
}
function closeSheet(): void {
  releaseSheetBack();
  if (dialog.open) dialog.close();
  app.classList.remove("sheet-open");
  syncVisibility();
}
function openSheet(next: Sheet, explicitTarget?: SelectionId): void {
  if (explicitTarget) setRewardTarget(explicitTarget);
  checkExpiry();

  if (sheet === "photo" && next !== "photo") cleanPhoto();
  sheet = next;
  app.querySelector("#sheet-feedback")!.textContent = "";
  renderSheet();
  for (const b of app.querySelectorAll("[aria-expanded]"))
    b.setAttribute(
      "aria-expanded",
      String((b as HTMLElement).dataset.action === next),
    );
  app.classList.add("sheet-open");
  if (!dialog.open) {
    dialog.showModal();
    const generation = ++backGeneration;
    void subscribeSheetBack(() => {
      if (!rewardBusy) closeSheet();
    }).then((stop) => {
      if (generation !== backGeneration || !dialog.open) stop();
      else stopSheetBack = stop;
    });
  }
  if (next === "pass") void checkAds();
  if (next === "photo" && !photoBlob && !photoBusy) void takePhoto();
  syncVisibility();
}
function cardLabel(id: SelectionId, premium: boolean): string {
  return premium ? (villageUnlocked(id) ? "프리미엄 · 이용 중" : "프리미엄 · 잠금 · 광고 시청") : "기본 · 무료";
}
function renderSheet(): void {
  const title = {
    villages: "오늘은 어떤 빌리지로 갈까요?",
    music: "마음에 닿는 오르골",
    photo: "이 순간을 사진으로",
    pass: "특별한 겨울, 7일 동안",
  };
  app.querySelector("#sheet-title")!.textContent = sheet ? title[sheet] : "";
  if (sheet === "villages") {
    const cards = (list: typeof ALL_VILLAGES) => `<div class="village-grid">${list.map(v => {
      const active = villageUnlocked(v.id), pass = !isBasicVillage(v.id) ? preferences.villagePasses[v.id] : null;
      const days = pass ? Math.max(1,Math.ceil((pass.expiresAt-clock.now())/86400000)) : 0;
      return `<button class="village-card" data-village="${v.id}" aria-pressed="${preferences.village === v.id}"><span class="card-art card-${v.id}">${productThumbnail(v.id)}</span><span class="card-body"><span class="card-badge ${v.premium ? "premium" : ""}">${v.premium ? icon("star") : icon("check")}${cardLabel(v.id,v.premium)}</span><strong>${v.name}</strong><span>${v.subtitle}</span><small>${!v.premium ? "광고 없이 항상 무료" : active ? `이용 중 · ${days}일 남음 · ${formatExpiry(pass)}까지` : pass ? "이용 기간 만료 · 광고 보고 다시 이용" : "광고 보고 7일 이용"}</small></span></button>`;
    }).join("")}</div>`;
    content.innerHTML = `<h3>무료 베이직</h3>${cards([...BASIC_VILLAGES])}<h3>프리미엄 빌리지</h3><p class="sheet-description">광고 1회 정상 시청 후 선택한 빌리지를 7일 동안 이용해요. 잠긴 마을은 정적 이미지로 미리 볼 수 있어요.</p>${cards([...VILLAGES])}`;
  } else if (sheet === "music") {
    content.innerHTML = `<p class="sheet-description">${basic() ? "무료 베이직은 고요한 밤과 징글벨 두 곡을 즐길 수 있어요." : "직접 만든 오르골 캐럴 5곡이에요."}<br>브라우저에서는 첫 재생에 터치가 필요할 수 있어요.</p><p class="small-note">선택한 곡을 계속 반복해요. 이전·다음 버튼으로 곡을 바꿀 수 있어요.</p><div class="tracks">${(basic() ? TRACKS.filter(t => BASIC_TRACK_IDS.includes(t.id as TrackId)) : TRACKS).map((t, i) => `<button class="track-row" data-track="${t.id}" ${!t.available ? "disabled" : ""} aria-pressed="${preferences.track === t.id}"><span class="track-number">0${i + 1}</span><span><strong>${t.name}</strong><small>${t.mood} · ${t.bpm} BPM</small></span><span class="track-note">${icon("music")}</span></button>`).join("")}</div><div class="volume-control"><label for="volume">음량</label><input id="volume" type="range" min="0" max="1" step="0.05" value="${preferences.volume}"><output id="volume-value">${Math.round(preferences.volume * 100)}%</output><button class="round-play" data-action="play" aria-label="음악 재생">${icon("play")}</button></div><p class="small-note">외부 녹음물을 사용하지 않는 자체 합성 연주예요. 악보의 Public Domain 표기와 출처는 프로젝트 음악 권리 문서에 기록했어요.</p>`;
  } else if (sheet === "pass") {
    const active = targetActive();
    const label = villageById(rewardTarget).name;
    const pass = !isBasicVillage(rewardTarget) ? preferences.villagePasses[rewardTarget] : null;
    content.innerHTML = `<div class="locked-village-preview">${productThumbnail(rewardTarget)}</div><div class="pass-hero"><span class="pass-seal">${icon("star")}<strong>7</strong><small>DAYS</small></span><h3>${label}</h3><p>${active ? `${formatExpiry(pass)}까지 이용할 수 있어요.` : "보상형 광고 완료 후 이 콘텐츠를 7일 동안 이용해요."}</p></div><p class="sheet-description">빌리지 이용권은 각각 독립적이에요. 이용 중에는 기간을 누적 연장할 수 없어요.</p>${active ? "" : `<button class="wide-button gold" data-action="reward" ${!availability?.ready || rewardBusy ? "disabled" : ""}>${icon("play")}${rewardBusy ? "보상 확인 중…" : pass ? "광고 보고 다시 이용" : "광고 보고 7일 이용"}</button>`}<p class="ad-status" role="status">${adMessage || (active ? "이미 이용 중인 콘텐츠예요." : availability?.reason ?? "광고 연결을 확인하고 있어요.")}</p><p class="small-note">이 기기의 로컬 이용권이에요. 저장소를 지우거나 기기를 바꾸면 유지되지 않아요.</p><button class="text-button" data-action="villages">빌리지 둘러보기</button>`;
  } else if (sheet === "photo") {
    content.innerHTML = `<p class="sheet-description">버튼 없이 마을만 담은 1200 × 1560 PNG 사진이에요.</p><div class="photo-preview">${photoUrl ? `<img src="${photoUrl}" alt="${villageById(display().village).name} 촬영 사진">` : `<div class="photo-loading">${icon("camera")}<span>${photoBusy ? "사진을 만들고 있어요…" : "사진을 준비해 주세요"}</span></div>`}</div><div class="photo-actions"><button class="wide-button gold" data-action="save-photo" ${!photoBlob ? "disabled" : ""}>${icon("download")}사진 저장</button><button class="wide-button" data-action="retake" ${photoBusy ? "disabled" : ""}>다시 촬영</button></div><p class="small-note">웹에서는 다운로드를 요청해요. 저장되지 않으면 사진을 길게 눌러 저장해 주세요.</p>`;
  }
  updateMusic();
}
async function checkAds(): Promise<void> {
  if (!availabilityPromise)
    availabilityPromise = adAvailability().then((value) => {
      availability = value;
      if (sheet === "pass") renderSheet();
    });
  await availabilityPromise;
}
async function claimReward(): Promise<void> {
  if (rewardBusy || !availability?.ready || targetActive()) return;
  const target = rewardTarget;
  rewardBusy = true;
  adMessage = "광고를 준비하고 있어요…";
  syncVisibility();
  renderSheet();
  try {
    const earned = await earnPass(availability.groupId, (message) => {
      adMessage = message;
      if (sheet === "pass") renderSheet();
    });
    if (earned) {
      const verifiedTime = await serverTime();
      if (!verifiedTime) { adMessage = "서버 시간을 확인하지 못해 이용권을 지급하지 않았어요. 연결 상태를 확인해 주세요."; return; }
      clock.sync(verifiedTime);
      if (!grantVillagePass(preferences,target,clock.now(),earned)) return;
      persist();
      try { await preloadProduct(target); }
      catch { adMessage = "이용권은 저장됐지만 이미지를 불러오지 못했어요. 빌리지에서 다시 선택해 주세요."; return; }
      preferences.village = target;
      persist();
      render();
      adMessage = "보상 확인이 완료됐어요. 특별한 겨울을 7일 동안 즐겨보세요.";
      toast(
        storageWorking
          ? "7일 이용권을 받았어요!"
          : "이용권을 받았지만 저장이 차단되어 이번 화면에서만 유지돼요.",
      );
    } else {
      adMessage =
        "보상 완료가 확인되지 않아 이용권을 지급하지 않았어요. 다시 시도해 주세요.";
    }
  } catch {
    adMessage = "광고를 불러오지 못했어요. 이용권은 지급되지 않았어요.";
  } finally {
    rewardBusy = false;
    syncVisibility();
    if (sheet === "pass") renderSheet();
  }
}
async function takePhoto(): Promise<void> {
  checkExpiry();
  if (photoBusy) return;
  cleanPhoto();
  photoBusy = true;
  const token = photoToken,
    current = display();
  renderSheet();
  try {
    const captureActors = actors;
    await captureActors?.ready;
    if (token !== photoToken || sheet !== "photo") return;
    const blob = await captureVillage(
      current.village,
      current.night,
      preferences.snow,
      current.effect,
      captureActors?.snapshot() ?? null,
      preferences.lightPattern,
      actors?.lightingTime ?? basicLights?.time ?? 0,
      preferences.basicPattern,
    );
    if (token !== photoToken || sheet !== "photo") return;
    photoBlob = blob;
    photoUrl = URL.createObjectURL(blob);
  } catch {
    toast("사진을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
  } finally {
    if (token === photoToken) {
      photoBusy = false;
      if (sheet === "photo") renderSheet();
    }
  }
}
async function saveCurrentPhoto(): Promise<void> {
  checkExpiry();
  if (!photoBlob) return;
  const button = content.querySelector<HTMLButtonElement>(
    "[data-action=save-photo]",
  );
  if (button) button.disabled = true;
  try {
    const kind = await savePhoto(
      photoBlob,
      `merry-village-${display().village}.png`,
    );
    toast(
      kind === "native"
        ? "사진 저장을 완료했어요."
        : "사진 다운로드를 요청했어요. 다운로드 목록을 확인해 주세요.",
    );
  } catch {
    toast("사진 저장이 완료되지 않았어요. 사진을 길게 눌러 저장해 주세요.");
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}
function checkExpiry(): void {
  if (reconcileAccess(preferences, clock.now())) {
    adMessage = "이용 기간이 끝났어요. 광고를 보고 다시 열 수 있어요.";
    cleanPhoto();
    persist();
    render();
    if (sheet) renderSheet();
    if (sheet === "photo") void takePhoto();
    toast("이용권 기간이 끝나 무료 콘텐츠로 돌아왔어요.");
  }
}
function syncVisibility(): void {
  const hidden = document.hidden || rewardBusy;
  basicLights?.update(preferences.basicPattern,hidden || dialog.open,reducedMotion.matches);
  const visualHidden = hidden || dialog.open;
  app.classList.toggle("ambient-paused", hidden);
  player.setHidden(hidden);
  trainSound.syncJourney(
    Number(
      app
        .querySelector("#scene-host .actor-stage")
        ?.getAttribute("data-elapsed") ?? 0,
    ),
  );
  trainSound.setRunning(
    !!actors && preferences.motion && !reducedMotion.matches && !visualHidden,
  );
  actors?.update({
    motion: preferences.motion,
    pattern: preferences.lightPattern,
    gold: display().effect === "shooting",
    hidden: visualHidden,
  });
  setAudioHidden(hidden);
  if (!document.hidden) checkExpiry();
}
let selectionGeneration = 0;
app.addEventListener("click", async (event) => {
  const target = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!target || target.disabled || rewardBusy) return;
  const village = target.dataset.village as SelectionId | undefined,
    track = target.dataset.track as TrackId | undefined;
  if (village) {
    checkExpiry();
    if (villageById(village).premium && !villageUnlocked(village)) {
      openSheet("pass",village);
      return;
    }
    else {
      const generation = ++selectionGeneration;
      try { await preloadProduct(village); } catch { toast("빌리지 이미지를 불러오지 못했어요. 다시 선택해 주세요."); return; }
      if (generation !== selectionGeneration) return;
      checkExpiry();
      if (!villageUnlocked(village)) { openSheet("pass",village); return; }
      preferences.village = village;
      if (isBasicVillage(village) && !BASIC_TRACK_IDS.includes(preferences.track)) preferences.track = "snow";
      persist();
    }
    render();
    closeSheet();
    return;
  }
  if (track) {
    if (basic() && !BASIC_TRACK_IDS.includes(track)) return;
    if (!TRACKS.some((t) => t.id === track && t.available)) {
      toast("이 곡은 권리 확인 중이라 재생할 수 없어요.");
      return;
    }
    preferences.track = track;
    persist();
    selectTrack(track);
    void player.play();
    render();
    renderSheet();
    return;
  }
  switch (target.dataset.action) {
    case "villages":
    case "music":
    case "photo":
    case "pass":
      openSheet(target.dataset.action);
      break;
    case "close":
      closeSheet();
      break;
    case "play":
      player.toggle();
      break;
    case "snow":
      preferences.snow = !preferences.snow;
      persist();
      render();
      break;
    case "motion":
      preferences.motion = !preferences.motion;
      persist();
      render();
      break;
    case "lights":
      if (basic()) preferences.basicPattern = nextBasicPattern(preferences.basicPattern);
      else Object.assign(preferences, nextLighting(preferences));
      persist();
      render();
      break;
    case "previous":
    case "next": {
      changeTrack(target.dataset.action === "next" ? 1 : -1);
      break;
    }
    case "repeat":
      preferences.repeat = true;
      player.setRepeat(true);
      persist();
      renderSheet();
      break;
    case "reward":
      void claimReward();
      break;
    case "retake":
      void takePhoto();
      break;
    case "save-photo":
      void saveCurrentPhoto();
      break;
  }
});
content.addEventListener("input", (event) => {
  if ((event.target as HTMLElement).id === "volume") {
    preferences.volume = Number((event.target as HTMLInputElement).value);
    player.setVolume(preferences.volume);
    persist();
    const output = content.querySelector("#volume-value");
    if (output) output.textContent = `${Math.round(preferences.volume * 100)}%`;
    updateMusic();
  }
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeSheet();
  }
});
dialog.addEventListener("close", () => {
  if (dialog.open) return;
  releaseSheetBack();
  app.classList.remove("sheet-open");
  syncVisibility();
  if (sheet === "photo") cleanPhoto();
  sheet = null;
  for (const b of app.querySelectorAll("[aria-expanded]"))
    b.setAttribute("aria-expanded", "false");
});
document.addEventListener("visibilitychange", syncVisibility);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void serverTime().then(t => { if (t) { clock.sync(t); checkExpiry(); persist(); } });
});
reducedMotion.addEventListener("change", render);
const expiryTimer = setInterval(checkExpiry, 1000);
const gesture = (event: PointerEvent) => {
  if (
    !!actors && preferences.motion &&
    !reducedMotion.matches &&
    !trainSound.diagnostics.running
  )
    void trainSound.unlock();
  if ((event.target as Element).closest("[data-action=play],[data-track]"))
    return;
  if (player.isWanted && musicState !== "playing") void player.play();
};
document.addEventListener("pointerdown", gesture);
const progress = app.querySelector<HTMLInputElement>("#progress")!;
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
function updateProgress() {
  app.dataset.audioMetrics = JSON.stringify(audioDiagnostics());
  app.dataset.soundDiagnostics = JSON.stringify(trainSound.diagnostics);
  progress.max = String(player.duration);
  if (document.activeElement !== progress)
    progress.value = String(player.currentTime);
  app.querySelector("#music-time")!.textContent =
    `${time(player.currentTime)} / ${time(player.duration)}`;
}
progress.addEventListener("input", () => {
  player.seek(Number(progress.value));
  updateProgress();
});
const progressTimer = setInterval(() => {
  if (!document.hidden) updateProgress();
}, 400);
await preloadProduct(preferences.village);
render();
persist();
syncVisibility();
updateProgress();
void player.play();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    releaseSheetBack();
    stopSafeArea();
    stopSnowMonitor();
    basicLights?.destroy();
    actors?.destroy();
    reducedMotion.removeEventListener("change", render);
    clearInterval(progressTimer);
    trainSound.destroy();
    player.destroy();
    disposeAudio();
    clearInterval(expiryTimer);
    clearTimeout(toastTimer);
    cleanPhoto();
    document.removeEventListener("visibilitychange", syncVisibility);
    document.removeEventListener("pointerdown", gesture);
  });

}
void start().catch(() => {
  document.querySelector("#app")!.textContent = "빌리지를 불러오지 못했어요. 연결 상태를 확인하고 다시 열어주세요.";
});
