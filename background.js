const DEFAULT_IDLE_MINUTES = 10;
const CHECK_INTERVAL_MINUTES = 1;

const tabActivity = new Map();

async function getIdleMinutes() {
  const { idleMinutes } = await browser.storage.local.get("idleMinutes");
  return idleMinutes ?? DEFAULT_IDLE_MINUTES;
}

async function getEnabled() {
  const { enabled } = await browser.storage.local.get("enabled");
  return enabled ?? true;
}

async function getPinnedExempt() {
  const { pinnedExempt } = await browser.storage.local.get("pinnedExempt");
  return pinnedExempt ?? true;
}

async function getAudibleExempt() {
  const { audibleExempt } = await browser.storage.local.get("audibleExempt");
  return audibleExempt ?? true;
}

function touchTab(tabId) {
  tabActivity.set(tabId, Date.now());
}

function removeTab(tabId) {
  tabActivity.delete(tabId);
}

async function unloadIdleTabs() {
  const enabled = await getEnabled();
  if (!enabled) return;

  const idleMs = (await getIdleMinutes()) * 60 * 1000;
  const pinnedExempt = await getPinnedExempt();
  const audibleExempt = await getAudibleExempt();
  const now = Date.now();

  const tabs = await browser.tabs.query({});

  for (const tab of tabs) {
    if (!tabActivity.has(tab.id)) {
      touchTab(tab.id);
      continue;
    }

    if (tab.active) {
      touchTab(tab.id);
      continue;
    }

    if (pinnedExempt && tab.pinned) continue;
    if (audibleExempt && tab.audible) continue;

    const lastActivity = tabActivity.get(tab.id);
    if (now - lastActivity >= idleMs) {
      try {
        await browser.tabs.discard(tab.id);
        tabActivity.delete(tab.id);
      } catch {
        // Tab may already be discarded or inaccessible
      }
    }
  }
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

browser.tabs.query({}).then((tabs) => {
  for (const tab of tabs) {
    touchTab(tab.id);
  }
});