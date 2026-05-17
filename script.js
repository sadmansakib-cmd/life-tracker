/* global firebase, Chart */
// @ts-nocheck

// ---------------------------
// Firebase Init
// ---------------------------
const firebaseConfig = {
  apiKey: "************************************",
  authDomain: "the-spaceship.firebaseapp.com",
  databaseURL: "https://the-spaceship-default-rtdb.firebaseio.com",
  projectId: "the-spaceship",
  storageBucket: "the-spaceship.firebasestorage.app",
  messagingSenderId: "768189261696",
  appId: "1:768189261696:web:5f3998c0aed1a4b0a74365"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUser = null;
let myChartInstance = null;
let lastAnalyticsSnapshot = null;

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

// ---------------------------
// UI Helpers (Toast)
// ---------------------------
function toast(type, title, msg, timeout = 2600) {
  const container = document.getElementById("toast-container");
  if (!container) {
    alert(`${title}\n${msg}`);
    return;
  }

  const el = document.createElement("div");
  el.className = `toast ${type || "info"}`;
  el.innerHTML = `<div class="t-title">${title}</div><div class="t-msg">${msg}</div>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "all .25s ease";
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

function setActiveMenu(pageName) {
  const menu = document.getElementById("side-menu");
  if (!menu) return;
  const links = menu.querySelectorAll("a[data-page]");
  links.forEach(a => {
    a.classList.toggle("active", a.getAttribute("data-page") === pageName);
  });
}

function updateCommanderUI(user) {
  const email = user?.email || "—";
  const uid = user?.uid || "—";

  const emailEl = document.getElementById("user-email");
  const avatarEl = document.getElementById("user-avatar");
  const stEmail = document.getElementById("st-email");
  const stUid = document.getElementById("st-uid");

  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = (email?.[0] || "U").toUpperCase();
  if (stEmail) stEmail.textContent = email;
  if (stUid) stUid.textContent = uid;
}

// ---------------------------
// Auth
// ---------------------------
auth.onAuthStateChanged((user) => {
  currentUser = user || null;

  const authScreen = document.getElementById("auth-screen");
  const main = document.getElementById("main-dashboard");

  if (user) {
    if (authScreen) authScreen.style.display = "none";
    if (main) main.style.display = "flex";
    updateCommanderUI(user);

    switchPage("dashboard");
  } else {
    if (authScreen) authScreen.style.display = "flex";
    if (main) main.style.display = "none";
  }
});

function handleAuth(type) {
  const emailEl = document.getElementById("auth-email");
  const passEl = document.getElementById("auth-pass");
  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const pass = passEl.value;

  if (!email || !pass) {
    toast("danger", "Auth", "Please enter email & password.");
    return;
  }

  if (type === "signup") {
    auth.createUserWithEmailAndPassword(email, pass)
      .then(() => toast("success", "Welcome", "Commander initialized."))
      .catch(e => toast("danger", "Signup failed", e.message));
  } else {
    auth.signInWithEmailAndPassword(email, pass)
      .then(() => toast("success", "Access granted", "Welcome aboard, Commander."))
      .catch(e => toast("danger", "Login failed", e.message));
  }
}

// ---------------------------
// Local Data System
// ---------------------------
const dataKeys = {
  study: ['uni', 'online', 'self', 'others'],
  skills: ['prog', 'iot', 'presence', 'work', 'comm'],
  health: ['sleep', 'water', 'diet', 'exercise', 'supps', 'cheat'],
  discipline: ['morning', 'delay', 'social', 'plan'],
  realtalk: ['prayer', 'moral', 'finance', 'mental']
};

let dailyData = JSON.parse(localStorage.getItem("dailyOSData")) || initData();

function initData() {
  const obj = {};
  for (const cat in dataKeys) {
    obj[cat] = {};
    dataKeys[cat].forEach(item => (obj[cat][item] = 0));
  }
  return obj;
}

window.addEventListener("load", () => {
  setDate();
  checkMidnightReset();
  loadInputs();
  setupListeners();
  calculateAll();
  bindSettingsButtons();
  bindAnalyticsToggles();
});

// Date
function setDate() {
  const el = document.getElementById("current-date");
  if (!el) return;
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  el.innerText = new Date().toLocaleDateString("en-US", options);
}

// Midnight reset
function checkMidnightReset() {
  const lastSavedDate = localStorage.getItem("lastSavedDateOS");
  const currentDate = new Date().toLocaleDateString();

  if (lastSavedDate && lastSavedDate !== currentDate) {
    const history = JSON.parse(localStorage.getItem("osHistory")) || [];
    history.push({ date: lastSavedDate, data: dailyData });
    localStorage.setItem("osHistory", JSON.stringify(history));

    dailyData = initData();
    localStorage.setItem("dailyOSData", JSON.stringify(dailyData));
  }
  localStorage.setItem("lastSavedDateOS", currentDate);
}

function setupListeners() {
  const inputs = document.querySelectorAll('input[type="number"]');
  inputs.forEach(input => {
    input.addEventListener("input", (e) => {
      let val = parseFloat(e.target.value) || 0;
      if (val > 10) val = 10;
      if (val < 0) val = 0;

      const [cat, item] = e.target.id.split("-");
      if (!dailyData[cat]) return;

      dailyData[cat][item] = val;

      localStorage.setItem("dailyOSData", JSON.stringify(dailyData));
      calculateAll();
    });
  });
}

function loadInputs() {
  for (const cat in dataKeys) {
    dataKeys[cat].forEach(item => {
      const el = document.getElementById(`${cat}-${item}`);
      if (!el) return;
      if (dailyData[cat][item]) el.value = dailyData[cat][item] || "";
    });
  }
}

// ---------------------------
// Core Calculation
// ---------------------------
function computeTelemetryFromDailyData() {
  // Study
  const s = dailyData.study;
  const studyPoints = (s.uni * 0.8) + (s.online * 1.2) + (s.self * 1.5) + (s.others * 0.5);
  const studyPerc = (studyPoints / 40) * 100;

  // Skill
  const sk = dailyData.skills;
  const skillPoints = (sk.prog * 1.5) + (sk.iot * 1.5) + (sk.presence * 1.0);
  const skillPerc = (skillPoints / 40) * 100;
  const bonusOverall = ((sk.work / 10) * 5) + ((sk.comm / 10) * 5);

  // Health
  const h = dailyData.health;
  let healthPoints = h.sleep + h.water + h.diet + h.exercise + h.supps;
  healthPoints -= h.cheat;
  if (healthPoints < 0) healthPoints = 0;
  const healthPerc = (healthPoints / 50) * 100;

  // Discipline
  const d = dailyData.discipline;
  const discPoints = (d.morning * 1.5) + d.delay + d.social + d.plan;
  const discPerc = (discPoints / 45) * 100;

  // Real Talk
  const r = dailyData.realtalk;
  const realPoints = r.prayer + r.moral + r.finance + r.mental;
  const realPerc = (realPoints / 40) * 100;

  // Overall
  const baseOverall = (studyPerc + skillPerc + healthPerc + discPerc + realPerc) / 5;
  let finalOverall = baseOverall + bonusOverall;
  if (finalOverall > 100) finalOverall = 100;
  if (finalOverall < 0) finalOverall = 0;

  const clampRound = (x) => Math.max(0, Math.min(100, Math.round(x)));

  return {
    study: clampRound(studyPerc),
    skill: clampRound(skillPerc),
    health: clampRound(healthPerc),
    discipline: clampRound(discPerc),
    realtalk: clampRound(realPerc),
    overall: clampRound(finalOverall),
  };
}

function calculateAll() {
  const t = computeTelemetryFromDailyData();
  updateRing("study", t.study);
  updateRing("skills", t.skill);
  updateRing("health", t.health);
  updateRing("discipline", t.discipline);
  updateRing("realtalk", t.realtalk);
  updateRing("overall", t.overall);
}

// Smooth progress ring animation (low-lag)
function updateRing(id, percentage) {
  if (isNaN(percentage)) percentage = 0;

  const circle = document.getElementById(`ring-${id}`);
  const text = document.getElementById(`perc-${id}`);
  if (!circle || !text) return;

  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;

  const to = Math.max(0, Math.min(100, Math.round(percentage)));
  const from = Number(circle.dataset.perc || 0);
  circle.dataset.perc = String(to);

  text.innerText = `${to}%`;

  if (reduceMotion) {
    circle.style.strokeDashoffset = circumference - (to / 100) * circumference;
    return;
  }

  const duration = 520;
  const start = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const p = from + (to - from) * eased;

    circle.style.strokeDashoffset = circumference - (p / 100) * circumference;

    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------------------------
// Cloud Sync (matches ring logic)
// ---------------------------
function saveAndSync() {
  if (!currentUser) {
    toast("danger", "Sync blocked", "Commander, please login first!");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const firebasePayload = computeTelemetryFromDailyData();

  db.ref(`users/${currentUser.uid}/logs/${today}`).set(firebasePayload)
    .then(() => {
      toast("success", "Sync complete", "Data synced to cloud successfully.");
      fetchWeeklyLogs();
      generateSpaceshipAnalytics();
    })
    .catch((error) => {
      toast("danger", "Sync failed", error.message);
    });
}

// ---------------------------
// SPA Navigation
// ---------------------------
function switchPage(pageName) {
  const pages = ["dashboard", "weekly", "analytics", "settings"];
  pages.forEach(p => {
    const el = document.getElementById(`${p}-page`);
    if (el) el.style.display = (p === pageName) ? "block" : "none";
  });

  setActiveMenu(pageName);

  if (pageName === "weekly") fetchWeeklyLogs();
  if (pageName === "analytics") generateSpaceshipAnalytics();
  if (pageName === "settings") updateCommanderUI(currentUser);
}

// ---------------------------
// Weekly Logs
// ---------------------------
function fetchWeeklyLogs() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const tableBody = document.getElementById("weekly-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" class="table-muted">Pulling telemetry data...</td></tr>`;

  const logsRef = firebase.database().ref("users/" + user.uid + "/logs");

  logsRef.orderByKey().limitToLast(7).once("value", (snapshot) => {
    tableBody.innerHTML = "";

    if (!snapshot.exists()) {
      tableBody.innerHTML = `<tr><td colspan="7" class="table-muted">No past mission logs found. Sync some data first!</td></tr>`;
      return;
    }

    let totalSynergy = 0;
    let dayCount = 0;
    let bestScore = -1;
    let bestDayName = "--";
    let tableHTML = "";

    snapshot.forEach((childSnapshot) => {
      const dateStr = childSnapshot.key;
      const data = childSnapshot.val() || {};

      const study = data.study || 0;
      const skills = data.skill || 0;
      const health = data.health || 0;
      const discipline = data.discipline || 0;
      const realtalk = data.realtalk || 0;
      const overall = data.overall || 0;

      totalSynergy += overall;
      dayCount++;

      if (overall > bestScore) {
        bestScore = overall;
        bestDayName = dateStr;
      }

      tableHTML = `
        <tr>
          <td style="color:#8892b0;">${dateStr}</td>
          <td style="color:#00ff88; font-weight:800;">${overall}%</td>
          <td>${study}%</td>
          <td>${skills}%</td>
          <td>${health}%</td>
          <td>${discipline}%</td>
          <td>${realtalk}%</td>
        </tr>
      ` + tableHTML; // newest on top
    });

    tableBody.innerHTML = tableHTML;

    const avgSynergy = Math.round(totalSynergy / dayCount);
    const avgEl = document.getElementById("weekly-avg");
    const bestEl = document.getElementById("weekly-best");
    if (avgEl) avgEl.innerText = avgSynergy + "%";
    if (bestEl) bestEl.innerText = bestDayName;
  }, (error) => {
    console.error("Transmission Error:", error);
    tableBody.innerHTML = `<tr><td colspan="7" class="table-muted" style="color:#ff4d6d;">Telemetry lost: Database restricted.</td></tr>`;
  });
}

// ---------------------------
// Analytics (BAR chart + all visible by default)
// ---------------------------
function bindAnalyticsToggles() {
  const ids = ["tg-overall","tg-study","tg-skill","tg-health","tg-discipline","tg-realtalk"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      if (!myChartInstance) return;
      applyDatasetVisibility();
      myChartInstance.update();
    });
  });

  const range = document.getElementById("analytics-range");
  if (range) range.addEventListener("change", () => generateSpaceshipAnalytics());
}

function applyDatasetVisibility() {
  if (!myChartInstance) return;
  const map = {
    0: "tg-overall",
    1: "tg-study",
    2: "tg-skill",
    3: "tg-health",
    4: "tg-discipline",
    5: "tg-realtalk",
  };

  myChartInstance.data.datasets.forEach((ds, i) => {
    const tgid = map[i];
    const tg = document.getElementById(tgid);
    ds.hidden = tg ? !tg.checked : false;
  });
}

function generateSpaceshipAnalytics() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const chartCanvas = document.getElementById("spaceshipChart");
  if (!chartCanvas) return;

  const rangeEl = document.getElementById("analytics-range");
  const days = rangeEl ? Number(rangeEl.value) : 7;

  const subtitle = document.getElementById("analytics-subtitle");
  if (subtitle) subtitle.textContent = `${days}-Day Core Performance Spectrum`;

  const logsRef = firebase.database().ref("users/" + user.uid + "/logs");

  logsRef.orderByKey().limitToLast(days).once("value", (snapshot) => {
    if (!snapshot.exists()) {
      toast("info", "Analytics", "No logs found yet. Sync some days first.");
      return;
    }

    lastAnalyticsSnapshot = snapshot;

    const dates = [];
    const overall = [];
    const study = [];
    const skill = [];
    const health = [];
    const discipline = [];
    const realtalk = [];

    snapshot.forEach((childSnapshot) => {
      const log = childSnapshot.val() || {};
      dates.push(childSnapshot.key);

      overall.push(log.overall || 0);
      study.push(log.study || 0);
      skill.push(log.skill || 0);
      health.push(log.health || 0);
      discipline.push(log.discipline || 0);
      realtalk.push(log.realtalk || 0);
    });

    // Summary
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0) / arr.length) : 0;
    const avgOverall = avg(overall);

    let bestIdx = 0;
    for (let i = 1; i < overall.length; i++) if (overall[i] > overall[bestIdx]) bestIdx = i;

    const latest = overall[overall.length - 1] || 0;
    const trend = latest - avgOverall;

    const anAvg = document.getElementById("an-avg");
    const anBest = document.getElementById("an-best");
    const anTrend = document.getElementById("an-trend");
    const anLatest = document.getElementById("an-latest");

    if (anAvg) anAvg.textContent = `${avgOverall}%`;
    if (anBest) anBest.textContent = `${dates[bestIdx]} (${overall[bestIdx]}%)`;
    if (anLatest) anLatest.textContent = `${latest}%`;
    if (anTrend) {
      const sign = trend > 0 ? "+" : "";
      anTrend.textContent = `${sign}${trend}% vs avg`;
    }

    // Chart
    if (myChartInstance) myChartInstance.destroy();

    const ctx = chartCanvas.getContext("2d");

    myChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Overall",
            data: overall,
            backgroundColor: "rgba(0, 255, 136, 0.18)",
            borderColor: "#00ff88",
            borderWidth: 1,
            borderRadius: 10
          },
          {
            label: "Study",
            data: study,
            backgroundColor: "rgba(0, 243, 255, 0.14)",
            borderColor: "#00f3ff",
            borderWidth: 1,
            borderRadius: 10
          },
          {
            label: "Skill",
            data: skill,
            backgroundColor: "rgba(255, 204, 0, 0.14)",
            borderColor: "#ffcc00",
            borderWidth: 1,
            borderRadius: 10
          },
          {
            label: "Health",
            data: health,
            backgroundColor: "rgba(96, 165, 250, 0.14)",
            borderColor: "#60a5fa",
            borderWidth: 1,
            borderRadius: 10
          },
          {
            label: "Discipline",
            data: discipline,
            backgroundColor: "rgba(167, 139, 250, 0.14)",
            borderColor: "#a78bfa",
            borderWidth: 1,
            borderRadius: 10
          },
          {
            label: "Real Talk",
            data: realtalk,
            backgroundColor: "rgba(251, 113, 133, 0.14)",
            borderColor: "#fb7185",
            borderWidth: 1,
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 650, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: {
              color: "rgba(226,232,240,0.85)",
              font: { family: "Inter", weight: "700" }
            }
          },
          tooltip: {
            backgroundColor: "rgba(17,24,39,0.95)",
            titleColor: "#fff",
            bodyColor: "rgba(226,232,240,0.85)",
            borderColor: "rgba(0,243,255,0.2)",
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(0,243,255,0.06)" },
            ticks: { color: "rgba(156,163,175,0.9)" }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(0,243,255,0.06)" },
            ticks: { color: "rgba(156,163,175,0.9)" }
          }
        }
      }
    });

    applyDatasetVisibility();
    myChartInstance.update();
  });
}

// ---------------------------
// Settings Actions
// ---------------------------
function bindSettingsButtons() {
  const btnLogout = document.getElementById("btn-logout");
  const btnClearToday = document.getElementById("btn-clear-today");
  const btnClearCache = document.getElementById("btn-clear-cache");
  const btnExportJSON = document.getElementById("btn-export-json");
  const btnExportCSV = document.getElementById("btn-export-csv");
  const btnDeleteTodayCloud = document.getElementById("btn-delete-today-cloud");

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      auth.signOut()
        .then(() => toast("info", "Logged out", "Commander has left the spaceship."))
        .catch(e => toast("danger", "Logout failed", e.message));
    });
  }

  if (btnClearToday) btnClearToday.addEventListener("click", clearTodayLocal);

  if (btnClearCache) {
    btnClearCache.addEventListener("click", () => {
      if (!confirm("Clear local cache? (This resets local daily inputs + local history cache). Cloud logs stay safe.")) return;
      localStorage.removeItem("dailyOSData");
      localStorage.removeItem("lastSavedDateOS");
      localStorage.removeItem("osHistory");
      dailyData = initData();
      clearInputsFromDOM();
      calculateAll();
      toast("success", "Local cache cleared", "Browser data reset completed.");
    });
  }

  if (btnExportJSON) btnExportJSON.addEventListener("click", () => exportLogs("json"));
  if (btnExportCSV) btnExportCSV.addEventListener("click", () => exportLogs("csv"));

  if (btnDeleteTodayCloud) btnDeleteTodayCloud.addEventListener("click", deleteTodayCloudLog);
}

function clearInputsFromDOM() {
  const inputs = document.querySelectorAll('input[type="number"]');
  inputs.forEach(i => (i.value = ""));
}

function clearTodayLocal() {
  if (!confirm("Clear today's inputs (local only)?")) return;

  dailyData = initData();
  localStorage.setItem("dailyOSData", JSON.stringify(dailyData));
  clearInputsFromDOM();
  calculateAll();
  toast("success", "Today cleared", "Local inputs reset. Cloud logs unchanged.");
}

function deleteTodayCloudLog() {
  if (!currentUser) {
    toast("danger", "Not logged in", "Please login first.");
    return;
  }
  const today = new Date().toISOString().split("T")[0];

  if (!confirm(`Delete today's cloud log (${today})? This cannot be undone.`)) return;

  db.ref(`users/${currentUser.uid}/logs/${today}`).remove()
    .then(() => {
      toast("success", "Cloud log deleted", "Today's cloud telemetry removed.");
      fetchWeeklyLogs();
      generateSpaceshipAnalytics();
    })
    .catch(e => toast("danger", "Delete failed", e.message));
}

async function exportLogs(format) {
  if (!currentUser) {
    toast("danger", "Export blocked", "Commander, please login first!");
    return;
  }

  try {
    toast("info", "Export", "Preparing file...");

    const ref = db.ref(`users/${currentUser.uid}/logs`).orderByKey();
    const snap = await ref.once("value");

    if (!snap.exists()) {
      toast("info", "Export", "No cloud logs to export yet.");
      return;
    }

    const obj = snap.val() || {};
    const filenameBase = `spaceship-logs-${currentUser.uid.slice(0,6)}`;

    if (format === "json") {
      downloadBlob(
        JSON.stringify(obj, null, 2),
        `${filenameBase}.json`,
        "application/json"
      );
      toast("success", "Export ready", "JSON downloaded.");
      return;
    }

    // CSV
    const rows = [["date","overall","study","skill","health","discipline","realtalk"]];
    Object.keys(obj).sort().forEach(date => {
      const d = obj[date] || {};
      rows.push([
        date,
        d.overall ?? "",
        d.study ?? "",
        d.skill ?? "",
        d.health ?? "",
        d.discipline ?? "",
        d.realtalk ?? ""
      ]);
    });

    const csv = rows
      .map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(","))
      .join("\n");

    downloadBlob(csv, `${filenameBase}.csv`, "text/csv");
    toast("success", "Export ready", "CSV downloaded.");
  } catch (e) {
    toast("danger", "Export failed", e.message || String(e));
  }
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
 
