import { setAudioHidden, disposeAudio, audioDiagnostics } from "./audio-engine";
import { lightLabel, nextLighting } from "./lighting";
import { snowLayer, adaptSnow } from "./snow";
import { TrainSound } from "./train-sound";
import "./style.css";
import {
  VILLAGES,
  NIGHTS,
  TRACKS,
  villageById,
  type VillageId,
  type TrackId,
  type NightId,
} from "./catalog";
import {
  defaults,
  parsePreferences,
  hasPass,
  reconcileAccess,
  passForReward,
} from "./state";
import { Actors } from "./actors";
import { scene } from "./scene";
import { icon, type Icon } from "./icons";
import { MusicPlayer, type MusicState } from "./music";
import {
  adAvailability,
  earnPass,
  savePhoto,
  type AdAvailability,
} from "./native";
import { captureVillage } from "./photo";

const KEY = "merry-village:v2";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let storageWorking = true;
let preferences = defaults();
try {
  preferences = parsePreferences(localStorage.getItem(KEY));
} catch {
  storageWorking = false;
}
reconcileAccess(preferences, Date.now());
let passWasActive = hasPass(preferences.pass, Date.now());
let preview: {
  village: VillageId;
  effect: NightId | null;
  night: boolean;
} | null = null;
type Sheet = "villages" | "music" | "nights" | "photo" | "pass";
let sheet: Sheet | null = null;
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
let renderedVillage: VillageId | null = null;
const app = document.querySelector<HTMLElement>("#app")!;
const nav: { id: Sheet; label: string; icon: Icon }[] = [
  { id: "villages", label: "빌리지", icon: "village" },
  { id: "music", label: "음악 선택", icon: "music" },
  { id: "nights", label: "특별한 밤", icon: "night" },
  { id: "photo", label: "사진 촬영", icon: "camera" },
];
app.innerHTML = `
 <main class="experience">
 <div class="hero"><div class="night-effects" aria-hidden="true"><div class="aurora"></div><div class="starfield"><i style="--sx:7%;--sy:0%;--sd:-0.0s"></i><i style="--sx:44%;--sy:23%;--sd:-0.63s"></i><i style="--sx:81%;--sy:46%;--sd:-1.26s"></i><i style="--sx:18%;--sy:69%;--sd:-1.8900000000000001s"></i><i style="--sx:55%;--sy:2%;--sd:-2.52s"></i><i style="--sx:92%;--sy:25%;--sd:-3.15s"></i><i style="--sx:29%;--sy:48%;--sd:-3.7800000000000002s"></i><i style="--sx:66%;--sy:71%;--sd:-4.41s"></i><i style="--sx:3%;--sy:4%;--sd:-5.04s"></i><i style="--sx:40%;--sy:27%;--sd:-5.67s"></i><i style="--sx:77%;--sy:50%;--sd:-6.3s"></i><i style="--sx:14%;--sy:73%;--sd:-6.93s"></i><i style="--sx:51%;--sy:6%;--sd:-7.5600000000000005s"></i><i style="--sx:88%;--sy:29%;--sd:-8.19s"></i><i style="--sx:25%;--sy:52%;--sd:-8.82s"></i><i style="--sx:62%;--sy:75%;--sd:-9.45s"></i><i style="--sx:99%;--sy:8%;--sd:-10.08s"></i><i style="--sx:36%;--sy:31%;--sd:-10.71s"></i><i style="--sx:73%;--sy:54%;--sd:-11.34s"></i><i style="--sx:10%;--sy:77%;--sd:-11.97s"></i><i style="--sx:47%;--sy:10%;--sd:-12.6s"></i><i style="--sx:84%;--sy:33%;--sd:-13.23s"></i><i style="--sx:21%;--sy:56%;--sd:-13.86s"></i><i style="--sx:58%;--sy:79%;--sd:-14.49s"></i></div><div class="wishes">${Array.from({ length: 12 }, (_, i) => `<i style="--left:${(i * 31 + 9) % 94}%;--delay:-${i * 0.9}s;--duration:${8 + (i % 4)}s"></i>`).join("")}</div></div>
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
       `<button id="${c.id}-toggle" data-action="${c.id}" aria-label="${c.label}" aria-pressed="true">${icon(c.symbol)}<span>${c.label} <b id="${c.id}-label">ON</b></span></button>`,
   )
   .join("")}</div>
 <p class="graphics-status" id="graphics-status" role="status"></p>
 </div><div class="preview-ribbon" id="preview-ribbon" hidden><span>특별 콘텐츠 미리보기 · 이용권은 지급되지 않아요</span><button data-action="exit-preview">돌아가기</button></div>
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
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
    storageWorking = true;
  } catch {
    storageWorking = false;
  }
}
function unlocked(): boolean {
  return hasPass(preferences.pass, Date.now());
}
function display() {
  return (
    preview ?? {
      village: preferences.village,
      effect: preferences.effect,
      night: preferences.night,
    }
  );
}
function formatExpiry(): string {
  return preferences.pass
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(preferences.pass.expiresAt)
    : "";
}
const player = new MusicPlayer(
  preferences.track,
  preferences.volume,
  (state) => {
    musicState = state;
    updateMusic();
  },
);
function updateMusic(): void {
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
  if (renderedVillage !== current.village) {
    trainSound.setRunning(false);
    actors?.destroy();
    app.querySelector("#scene-host")!.innerHTML = scene(current.village);
    try {
      actors = new Actors(
        app.querySelector<HTMLElement>("#scene-host .actor-stage")!,
        current.village,
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
  app.dataset.effect = current.effect ?? "none";
  app.classList.add("night");
  app.classList.toggle("lights-off", !preferences.lights);
  actors?.update({
    motion: preferences.motion,
    lights: preferences.lights,
    pattern: preferences.lightPattern,
    gold: current.effect === "wishes",
    hidden: document.hidden || rewardBusy,
  });
  trainSound.syncJourney(
    Number(
      app
        .querySelector("#scene-host .actor-stage")
        ?.getAttribute("data-elapsed") ?? 0,
    ),
  );
  trainSound.setRunning(
    preferences.motion &&
      !reducedMotion.matches &&
      !document.hidden &&
      !rewardBusy,
  );
  app.classList.toggle("snow-off", !preferences.snow);
  if (actors)
    app.querySelector("#graphics-status")!.textContent = reducedMotion.matches
      ? "움직임 줄이기 설정으로 동작이 정지되어 있어요."
      : "";
  for (const id of ["motion", "lights", "snow"] as const) {
    const button = app.querySelector<HTMLButtonElement>(`#${id}-toggle`)!;
    button.setAttribute("aria-pressed", String(preferences[id]));
    app.querySelector(`#${id}-label`)!.textContent =
      id === "lights"
        ? lightLabel(preferences)
        : preferences[id]
          ? "ON"
          : "OFF";
    if (id === "lights") {
      button.setAttribute(
        "aria-label",
        `조명: ${lightLabel(preferences)}. 눌러 다음 패턴`,
      );
    }
    if (id === "motion") button.disabled = !actors;
  }
  app.querySelector<HTMLElement>("#preview-ribbon")!.hidden = !preview;
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
  if (dialog.open) dialog.close();
}
function openSheet(next: Sheet): void {
  const photoLocked = next === "photo" && !!preview;
  if (photoLocked) next = "pass";
  if (sheet === "photo" && next !== "photo") cleanPhoto();
  sheet = next;
  app.querySelector("#sheet-feedback")!.textContent = "";
  renderSheet();
  for (const b of app.querySelectorAll("[aria-expanded]"))
    b.setAttribute(
      "aria-expanded",
      String((b as HTMLElement).dataset.action === next),
    );
  if (!dialog.open) dialog.showModal();
  if (photoLocked)
    app.querySelector("#sheet-feedback")!.textContent =
      "미리보기 사진 저장은 이용권이 필요해요. 기본 마을은 무료로 촬영할 수 있어요.";
  if (next === "pass") void checkAds();
  if (next === "photo" && !photoBlob && !photoBusy) void takePhoto();
}
function cardLabel(premium: boolean): string {
  return premium ? (unlocked() ? "이용 가능" : "특별 · 미리보기") : "무료";
}
function renderSheet(): void {
  const title = {
    villages: "오늘은 어떤 빌리지로 갈까요?",
    music: "마음에 닿는 오르골",
    nights: "조금 더 특별한 밤",
    photo: "이 순간을 사진으로",
    pass: "특별한 겨울, 7일 동안",
  };
  app.querySelector("#sheet-title")!.textContent = sheet ? title[sheet] : "";
  if (sheet === "villages") {
    content.innerHTML = `<p class="sheet-description">무료 마을 3곳은 언제든 머물 수 있어요. 특별 마을은 이용권 없이도 미리 볼 수 있어요.</p><div class="village-grid">${VILLAGES.map((v) => `<button class="village-card" data-village="${v.id}" aria-pressed="${display().village === v.id}"><span class="card-art card-${v.id}">${scene(v.id)}</span><span class="card-body"><span class="card-badge ${v.premium ? "premium" : ""}">${v.premium ? icon("star") : icon("check")}${cardLabel(v.premium)}</span><strong>${v.name}</strong><span>${v.subtitle}</span></span></button>`).join("")}</div><button class="wide-button gold" data-action="pass">${icon("star")}${unlocked() ? "내 7일 이용권 확인" : "특별 빌리지 3종 · 7일 이용권"}</button>`;
  } else if (sheet === "music") {
    content.innerHTML = `<p class="sheet-description">권리 근거를 기록한 무료 캐럴 4곡을 직접 합성해요. 4번 곡은 권리 확인 전까지 재생하지 않아요.<br>브라우저에서는 첫 재생에 터치가 필요할 수 있어요.</p><div class="tracks">${TRACKS.map((t, i) => `<button class="track-row" data-track="${t.id}" ${!t.available ? "disabled" : ""} aria-pressed="${preferences.track === t.id}"><span class="track-number">0${i + 1}</span><span><strong>${t.name}</strong><small>${t.mood} · ${t.bpm} BPM</small></span><span class="track-note">${icon("music")}</span></button>`).join("")}</div><div class="volume-control"><label for="volume">음량</label><input id="volume" type="range" min="0" max="1" step="0.05" value="${preferences.volume}"><output id="volume-value">${Math.round(preferences.volume * 100)}%</output><button class="round-play" data-action="play" aria-label="음악 재생">${icon("play")}</button></div><p class="small-note">외부 녹음물을 사용하지 않는 자체 합성 연주예요. 악보의 Public Domain 표기와 출처는 프로젝트 음악 권리 문서에 기록했어요.</p>`;
  } else if (sheet === "nights") {
    content.innerHTML = `<p class="sheet-description">마을에 다른 빛을 켜보세요. 움직임 줄이기를 켜면 고요한 정지 효과로 보여드려요.</p><button class="basic-night" data-effect="none">${icon("moon")}<span><strong>기본 밤</strong><small>늘 무료인 따뜻한 창문 불빛</small></span>${display().effect === null ? icon("check") : ""}</button><div class="night-list">${NIGHTS.map((n) => `<button class="night-card night-${n.id}" data-effect="${n.id}" aria-pressed="${display().effect === n.id}"><span class="night-swatch">${icon(n.symbol)}</span><span><strong>${n.name}</strong><small>${n.description}</small><em>${unlocked() ? "이용 가능" : "특별 · 미리보기"}</em></span>${icon(unlocked() ? "check" : "lock")}</button>`).join("")}</div><button class="wide-button gold" data-action="pass">${icon("star")}${unlocked() ? "내 이용권 확인" : "광고 시청으로 특별한 7일"}</button>`;
  } else if (sheet === "pass") {
    const active = unlocked();
    content.innerHTML = `<div class="pass-hero"><span class="pass-seal">${icon("star")}<strong>7</strong><small>DAYS OF MAGIC</small></span><h3>${active ? "특별한 겨울을 즐기고 있어요" : "매일, 새로운 설렘을 만나요"}</h3><p>${active ? `${formatExpiry()}까지 이용할 수 있어요.` : "보상형 광고를 끝까지 시청하고<br>7일 동안 특별 콘텐츠를 이용해 보세요."}</p></div><ul class="benefits"><li>${icon("check")}특별 빌리지 3종</li><li>${icon("check")}특별한 밤 3종</li><li>${icon("check")}선택한 특별 마을 사진 저장</li></ul>${active ? "" : `<button class="wide-button gold" data-action="reward" ${!availability?.ready || rewardBusy ? "disabled" : ""}>${icon("play")}${rewardBusy ? "광고 확인 중…" : availability === null ? "광고 연결 확인 중…" : availability.ready ? "광고 보고 7일 이용권 받기" : "광고 연결 준비 중"}</button>`}<p class="ad-status" role="status">${adMessage || (active ? "이미 이용 중일 때는 광고를 다시 볼 필요가 없어요." : (availability?.reason ?? "광고 연결 가능 여부를 확인하고 있어요."))}</p><p class="small-note">이용권은 이 기기의 로컬 저장소에 보관돼요. 저장소를 지우거나 기기를 바꾸면 유지되지 않아요.${!storageWorking ? " 현재 브라우저 저장이 차단되어 있어요." : ""}</p><button class="text-button" data-action="villages">빌리지 둘러보기</button>`;
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
  if (rewardBusy || !availability?.ready || unlocked()) return;
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
      preferences.pass = passForReward(Date.now(), earned);
      passWasActive = unlocked();
      if (preview) {
        preferences.village = preview.village;
        preferences.effect = preview.effect;
        preferences.night = preview.night;
        preview = null;
      }
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
  if (photoBusy || preview) return;
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
      preferences.lights,
      captureActors?.snapshot() ?? null,
      preferences.lightPattern,
      actors?.lightingTime ?? 0,
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
  const active = unlocked();
  const expired = passWasActive && !active;
  passWasActive = active;
  if (reconcileAccess(preferences, Date.now()) || expired) {
    preview = null;
    if (expired)
      adMessage = "이용권이 만료됐어요. 무료 마을은 계속 이용할 수 있어요.";
    persist();
    render();
    if (sheet) renderSheet();
    toast("이용권 기간이 끝나 무료 콘텐츠로 돌아왔어요.");
  }
}
function syncVisibility(): void {
  const hidden = document.hidden || rewardBusy;
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
    preferences.motion && !reducedMotion.matches && !hidden,
  );
  actors?.update({
    motion: preferences.motion,
    lights: preferences.lights,
    pattern: preferences.lightPattern,
    gold: display().effect === "wishes",
    hidden,
  });
  setAudioHidden(hidden);
  if (!document.hidden) checkExpiry();
}
app.addEventListener("click", (event) => {
  const target = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!target || target.disabled) return;
  const village = target.dataset.village as VillageId | undefined,
    track = target.dataset.track as TrackId | undefined,
    effect = target.dataset.effect as NightId | "none" | undefined;
  if (village) {
    checkExpiry();
    if (villageById(village).premium && !unlocked())
      preview = { village, effect: null, night: preferences.night };
    else {
      preview = null;
      preferences.village = village;
      persist();
    }
    render();
    closeSheet();
    return;
  }
  if (track) {
    if (!TRACKS.some((t) => t.id === track && t.available)) {
      toast("이 곡은 권리 확인 중이라 재생할 수 없어요.");
      return;
    }
    preferences.track = track;
    persist();
    player.select(track);
    void player.play();
    render();
    renderSheet();
    return;
  }
  if (effect) {
    checkExpiry();
    if (effect !== "none" && !unlocked())
      preview = { village: display().village, effect, night: true };
    else {
      preview = null;
      preferences.effect = effect === "none" ? null : effect;
      preferences.night = true;
      persist();
    }
    render();
    closeSheet();
    return;
  }
  switch (target.dataset.action) {
    case "villages":
    case "music":
    case "nights":
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
      Object.assign(preferences, nextLighting(preferences));
      persist();
      render();
      break;
    case "previous":
    case "next": {
      const availableTracks = TRACKS.filter((t) => t.available);
      const i = availableTracks.findIndex((t) => t.id === preferences.track);
      preferences.track = availableTracks[
        (i +
          (target.dataset.action === "next" ? 1 : availableTracks.length - 1)) %
          availableTracks.length
      ]!.id as TrackId;
      player.select(preferences.track);
      void player.play();
      persist();
      updateMusic();
      break;
    }
    case "exit-preview":
      preview = null;
      render();
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
  if (sheet === "photo") cleanPhoto();
  sheet = null;
  for (const b of app.querySelectorAll("[aria-expanded]"))
    b.setAttribute("aria-expanded", "false");
});
document.addEventListener("visibilitychange", syncVisibility);
reducedMotion.addEventListener("change", render);
const expiryTimer = setInterval(checkExpiry, 30_000);
const gesture = (event: PointerEvent) => {
  if (
    preferences.motion &&
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
render();
persist();
syncVisibility();
updateProgress();
void player.play();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stopSnowMonitor();
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
