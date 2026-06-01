const DEFAULT_IDLE_MINUTES = 10;
const CHECK_INTERVAL_MINUTES = 1;
const ACTIVITY_KEY = "tabActivity";

let activityMap = new Map();
let dirty = false;

async function loadActivityMap() {
  const data = await browser.storage.local.get(ACTIVITY_KEY);
  if (data[ACTIVITY_KEY]) {
    activityMap = new Map(Object.entries(data[ACTIVITY_KEY]));
  }
}

async function saveActivityMap() {
  if (!dirty) return;
  dirty = false;
  await browser.storage.local.set({ [ACTIVITY_KEY]: Object.fromEntries(activityMap) });
}

async function getSetting(key, def) {
  const result = await browser.storage.local.get(key);
  return result[key] ?? def;
}

function touchTab(tabId) {
  activityMap.set(String(tabId), Date.now());
  dirty = true;
}

function removeTab(tabId) {
  activityMap.delete(String(tabId));
  dirty = true;
}

async function unloadIdleTabs() {
  const enabled = await getSetting("enabled", true);
  if (!enabled) return;

  const idleMs = (await getSetting("idleMinutes", DEFAULT_IDLE_MINUTES)) * 60 * 1000;
  const pinnedExempt = await getSetting("pinnedExempt", true);
  const audibleExempt = await getSetting("audibleExempt", true);
  const now = Date.now();

  const tabs = await browser.tabs.query({});
  const existingIds = new Set(tabs.map(t => String(t.id)));

  for (const key of activityMap.keys()) {
    if (!existingIds.has(key)) {
      activityMap.delete(key);
      dirty = true;
    }
  }

  for (const tab of tabs) {
    const key = String(tab.id);

    if (tab.active) {
      touchTab(key);
      continue;
    }

    if (pinnedExempt && tab.pinned) continue;
    if (audibleExempt && tab.audible) continue;

    let lastActivity = activityMap.get(key);
    if (lastActivity === undefined) {
      touchTab(key);
      continue;
    }

    if (now - lastActivity >= idleMs) {
      try {
        await browser.tabs.discard(tab.id);
        removeTab(key);
      } catch {
        // Tab may already be discarded or inaccessible
      }
    }
  }

  await saveActivityMap();
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "activity" && sender.tab) {
    touchTab(sender.tab.id);
  }
});

browser.tabs.onCreated.addListener((tab) => {
  touchTab(tab.id);
});

browser.tabs.onRemoved.addListener((tabId) => {
  removeTab(tabId);
});

browser.tabs.onActivated.addListener((activeInfo) => {
  touchTab(activeInfo.tabId);
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "check-idle-tabs") {
    unloadIdleTabs();
  }
});

browser.alarms.create("check-idle-tabs", {
  periodInMinutes: CHECK_INTERVAL_MINUTES,
});

(async () => {
  await loadActivityMap();
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    if (!activityMap.has(String(tab.id))) {
      activityMap.set(String(tab.id), now);
      dirty = true;
    }
  }
  await saveActivityMap();
})();