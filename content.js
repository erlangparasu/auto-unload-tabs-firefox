const THROTTLE_MS = 5000;

let lastSent = 0;

function sendActivity() {
  const now = Date.now();
  if (now - lastSent < THROTTLE_MS) return;
  lastSent = now;
  browser.runtime.sendMessage({ type: "activity" }).catch(() => {});
}

document.addEventListener("mousemove", sendActivity, { passive: true });
document.addEventListener("keydown", sendActivity, { passive: true });
document.addEventListener("mousedown", sendActivity, { passive: true });
document.addEventListener("scroll", sendActivity, { passive: true });