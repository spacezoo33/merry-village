import { watchReward } from "./ad-session";
export type AdAvailability = {
  ready: boolean;
  reason: string;
  groupId: string;
};
export async function adAvailability(): Promise<AdAvailability> {
  let groupId = "";
  try {
    const response = await fetch(
      new URL("./runtime-config.json", document.baseURI),
      { cache: "no-store" },
    );
    if (response.ok) {
      const config = await response.json();
      if (typeof config.rewardedAdGroupId === "string")
        groupId = config.rewardedAdGroupId.trim().slice(0, 200);
    }
  } catch {
    /* configuration unavailable: no ad or reward */
  }
  if (!groupId)
    return {
      ready: false,
      reason:
        "보상형 광고 연결을 준비 중이에요. 지금은 특별 빌리지와 밤을 미리 볼 수 있어요.",
      groupId,
    };
  if (import.meta.env.DEV)
    return {
      ready: false,
      reason:
        "개발 미리보기에서는 실제 광고를 재생하거나 이용권을 지급하지 않아요.",
      groupId,
    };
  try {
    const sdk = await import("@apps-in-toss/web-framework");
    if (
      sdk.Environment.environment !== "toss" ||
      !sdk.loadFullScreenAd.isSupported() ||
      !sdk.showFullScreenAd.isSupported()
    )
      return {
        ready: false,
        reason: "보상형 광고는 지원되는 토스 앱에서 이용할 수 있어요.",
        groupId,
      };
    return { ready: true, reason: "", groupId };
  } catch {
    return {
      ready: false,
      reason:
        "웹 미리보기에서는 광고를 시청할 수 없어요. 토스 앱에서 이용해 주세요.",
      groupId,
    };
  }
}
export async function earnPass(
  groupId: string,
  progress: (status: string) => void,
): Promise<boolean> {
  if (import.meta.env.DEV || !groupId) return false;
  const sdk = await import("@apps-in-toss/web-framework");
  if (
    sdk.Environment.environment !== "toss" ||
    !sdk.loadFullScreenAd.isSupported() ||
    !sdk.showFullScreenAd.isSupported()
  )
    return false;
  return watchReward(
    {
      load: (loaded, error) =>
        sdk.loadFullScreenAd({
          options: { adGroupId: groupId },
          onEvent: (event) => {
            if (event.type === "loaded") loaded();
          },
          onError: error,
        }),
      show: (event, error) =>
        sdk.showFullScreenAd({
          options: { adGroupId: groupId },
          onEvent: (value) =>
            event(
              value.type === "userEarnedReward" ||
                value.type === "dismissed" ||
                value.type === "failedToShow"
                ? value.type
                : "other",
            ),
          onError: error,
        }),
    },
    progress,
  );
}
export async function savePhoto(
  blob: Blob,
  fileName: string,
): Promise<"native" | "download"> {
  let nativeSave:
    | ((options: {
        data: string;
        fileName: string;
        mimeType: string;
      }) => Promise<void>)
    | undefined;
  try {
    if (!import.meta.env.DEV) {
      const sdk = await import("@apps-in-toss/web-framework");
      if (sdk.File.saveBase64.isSupported()) nativeSave = sdk.File.saveBase64;
    }
  } catch {
    /* Ordinary browsers have no native bridge; use a real download. */
  }
  if (nativeSave) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]!);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    await nativeSave({ data, fileName, mimeType: "image/png" });
    return "native";
  }
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "download";
}
