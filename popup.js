async function loadSettings() {
  const data = await browser.storage.local.get([
    "enabled",
    "idleMinutes",
    "pinnedExempt",
    "audibleExempt",
  ]);

  document.getElementById("enabled").checked = data.enabled ?? true;
  document.getElementById("idleMinutes").value = data.idleMinutes ?? 10;
  document.getElementById("pinnedExempt").checked = data.pinnedExempt ?? true;
  document.getElementById("audibleExempt").checked = data.audibleExempt ?? true;
}

async function saveSettings() {
  const enabled = document.getElementById("enabled").checked;
  const idleMinutes = parseInt(document.getElementById("idleMinutes").value, 10);
  const pinnedExempt = document.getElementById("pinnedExempt").checked;
  const audibleExempt = document.getElementById("audibleExempt").checked;

  if (isNaN(idleMinutes) || idleMinutes < 1 || idleMinutes > 120) {
    showStatus("Minutes must be 1-120", true);
    return;
  }

  await browser.storage.local.set({
    enabled,
    idleMinutes,
    pinnedExempt,
    audibleExempt,
  });

  showStatus("Saved");
}

function showStatus(msg, isError = false) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.style.color = isError ? "#ef5350" : "#81c784";
  setTimeout(() => {
    el.textContent = "";
  }, 2000);
}

document.addEventListener("DOMContentLoaded", loadSettings);
document.getElementById("save").addEventListener("click", saveSettings);