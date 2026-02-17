// Google Publisher Tag (GPT) Rewarded Ad Controller for Web
//
// Prerequisites:
//   1. Google Ad Manager account (free): https://admanager.google.com/
//   2. Link your AdSense account to Ad Manager
//   3. Create a "Rewarded" ad unit and get the ad unit path
//   4. Replace the AD_UNIT_PATH below with your actual path

// TODO: Replace with your Google Ad Manager network ID and ad unit path
// Format: "/network-id/ad-unit-name"
const AD_UNIT_PATH = "/your-network-id/rewarded-ad-unit";

export type AdState =
  | "idle"
  | "loading"
  | "loaded"
  | "showing"
  | "rewarded"
  | "error";

export interface RewardedAdController {
  load: () => void;
  show: () => void;
  getState: () => AdState;
  onStateChange: (callback: (state: AdState) => void) => () => void;
  dispose: () => void;
}

declare global {
  interface Window {
    googletag?: typeof googletag;
  }
}

declare namespace googletag {
  function cmd_push(fn: () => void): void;
  const cmd: Array<() => void>;
  function defineOutOfPageSlot(
    adUnitPath: string,
    format: number
  ): Slot | null;
  function enableServices(): void;
  function display(slot: Slot): void;
  function destroySlots(slots?: Slot[]): boolean;
  function pubads(): PubAdsService;

  const enums: {
    OutOfPageFormat: {
      REWARDED: number;
    };
  };

  interface Slot {
    addService(service: PubAdsService): Slot;
  }

  interface PubAdsService {
    addEventListener(
      eventType: string,
      listener: (event: RewardedEvent) => void
    ): PubAdsService;
    removeEventListener(
      eventType: string,
      listener: (event: RewardedEvent) => void
    ): void;
  }

  interface RewardedEvent {
    slot: Slot;
    makeRewardedVisible?: () => void;
  }
}

export function createRewardedAdController(): RewardedAdController | null {
  if (typeof window === "undefined" || !window.googletag) {
    return null;
  }

  let state: AdState = "idle";
  let listeners: Array<(state: AdState) => void> = [];
  let slot: googletag.Slot | null = null;

  function setState(newState: AdState) {
    state = newState;
    listeners.forEach((cb) => cb(newState));
  }

  const onReady = (event: googletag.RewardedEvent) => {
    if (event.slot !== slot) return;
    setState("loaded");
  };

  const onGranted = (event: googletag.RewardedEvent) => {
    if (event.slot !== slot) return;
    setState("rewarded");
  };

  const onClosed = (event: googletag.RewardedEvent) => {
    if (event.slot !== slot) return;
    // If closed without reward, state stays as-is (not "rewarded")
  };

  return {
    load() {
      setState("loading");

      window.googletag!.cmd.push(() => {
        const gt = window.googletag!;

        slot = gt.defineOutOfPageSlot(
          AD_UNIT_PATH,
          gt.enums.OutOfPageFormat.REWARDED
        );

        if (!slot) {
          setState("error");
          return;
        }

        slot.addService(gt.pubads());

        gt.pubads().addEventListener("rewardedSlotReady", onReady);
        gt.pubads().addEventListener("rewardedSlotGranted", onGranted);
        gt.pubads().addEventListener("rewardedSlotClosed", onClosed);

        gt.enableServices();
        gt.display(slot);
      });
    },

    show() {
      // The "rewardedSlotReady" event provides makeRewardedVisible
      // We re-listen to capture the event with the visibility trigger
      if (state !== "loaded" || !slot) return;

      setState("showing");

      window.googletag!.cmd.push(() => {
        const gt = window.googletag!;

        // Remove the previous ready listener and add one that auto-shows
        gt.pubads().removeEventListener("rewardedSlotReady", onReady);
        gt.pubads().addEventListener(
          "rewardedSlotReady",
          (event: googletag.RewardedEvent) => {
            if (event.slot !== slot) return;
            event.makeRewardedVisible?.();
          }
        );

        // Re-fetch to trigger the ready event again
        if (slot) {
          gt.display(slot);
        }
      });
    },

    getState() {
      return state;
    },

    onStateChange(callback) {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter((cb) => cb !== callback);
      };
    },

    dispose() {
      if (slot && window.googletag) {
        window.googletag.cmd.push(() => {
          const gt = window.googletag!;
          gt.pubads().removeEventListener("rewardedSlotReady", onReady);
          gt.pubads().removeEventListener("rewardedSlotGranted", onGranted);
          gt.pubads().removeEventListener("rewardedSlotClosed", onClosed);
          if (slot) gt.destroySlots([slot]);
          slot = null;
        });
      }
      listeners = [];
      state = "idle";
    },
  };
}
