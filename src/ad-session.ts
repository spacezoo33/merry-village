export type AdEvent =
  | "userEarnedReward"
  | "dismissed"
  | "failedToShow"
  | "other";
export type AdPort = {
  load: (loaded: () => void, error: () => void) => () => void;
  show: (event: (event: AdEvent) => void, error: () => void) => () => void;
};
/** Only the SDK's earned-reward event qualifies. Closing or showing an ad never does. */
export function watchReward(
  port: AdPort,
  progress: (value: string) => void,
  timeout = 180_000,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false,
      loaded = false,
      earned = false;
    let stopLoad: (() => void) | undefined, stopShow: (() => void) | undefined;
    const cleanup = (stop: (() => void) | undefined) => {
      try {
        stop?.();
      } catch {
        /* Already-disposed native subscriptions must not swallow a reward result. */
      }
    };
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup(stopLoad);
      cleanup(stopShow);
      resolve(result);
    };
    let timer = setTimeout(() => finish(false), Math.min(timeout, 15_000));
    try {
      progress("광고를 불러오고 있어요…");
      stopLoad = port.load(
        () => {
          if (settled || loaded) return;
          loaded = true;
          clearTimeout(timer);
          timer = setTimeout(() => finish(earned), timeout);
          progress("광고 시청을 완료하면 이용권이 지급돼요");
          try {
            stopShow = port.show(
              (event) => {
                if (settled) return;
                if (event === "userEarnedReward") earned = true;
                if (event === "dismissed" || event === "failedToShow")
                  finish(earned);
              },
              () => finish(earned),
            );
            if (settled) cleanup(stopShow);
          } catch {
            finish(false);
          }
        },
        () => finish(false),
      );
      if (settled) cleanup(stopLoad);
    } catch {
      finish(false);
    }
  });
}
