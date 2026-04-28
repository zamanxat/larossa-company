/**
 * Larossa портал — жалпы пароль (күн бойы) немесе портал әкімші паролі (үздіксіз).
 * admin_settings: portal_password_hash, portal_admin_password_hash
 */
(function () {
  "use strict";

  var SB_URL = "https://jnuokhhqojlurvadcduv.supabase.co";
  var SB_KEY = "sb_publishable_3l9NjY0Qadv3dJ9x3-t19w_8mKniZBk";
  var STORAGE = "lrs_portal_sess_v1";
  var LRS_PWD_PEP = "Larossa|admin|pwd|v1";
  var SPLASH_ID = "lrsPortalGateSplash";
  var dailyMonitorId = null;

  function showSplash() {
    if (document.getElementById(SPLASH_ID)) return;
    var el = document.createElement("div");
    el.id = SPLASH_ID;
    el.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;background:radial-gradient(ellipse 92% 58% at 50% -12%,rgba(10,135,84,.13),transparent 52%),radial-gradient(ellipse 65% 45% at 100% 100%,rgba(14,165,120,.09),transparent 48%),linear-gradient(165deg,#e8f4ef 0%,#f4f7f5 42%,#eef6ff 100%);";
    el.setAttribute("aria-hidden", "true");
    (document.body || document.documentElement).appendChild(el);
  }

  function hideSplash() {
    var e = document.getElementById(SPLASH_ID);
    if (e) e.remove();
  }

  function localYmd() {
    var n = new Date();
    var y = n.getFullYear();
    var m = String(n.getMonth() + 1).padStart(2, "0");
    var d = String(n.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function readSess() {
    try {
      var j = localStorage.getItem(STORAGE);
      if (!j) return null;
      return JSON.parse(j);
    } catch (e) {
      return null;
    }
  }

  function validSess(s) {
    if (!s || !s.k) return false;
    if (s.k === "p") return true;
    if (s.k === "d") return s.d === localYmd();
    return false;
  }

  function validateAndClean() {
    var s = readSess();
    if (!s) return null;
    if (!validSess(s)) {
      try {
        localStorage.removeItem(STORAGE);
      } catch (e) {}
      return null;
    }
    return s;
  }

  function looksLikeHash(st) {
    return typeof st === "string" && /^[a-f0-9]{64}$/i.test(st);
  }

  async function hashPwd(plain) {
    var t = String(plain || "");
    if (!t || !window.crypto || !window.crypto.subtle) return null;
    var b = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(LRS_PWD_PEP + t))
    );
    return Array.from(b, function (x) {
      return x.toString(16).padStart(2, "0");
    }).join("");
  }

  async function pwdMatch(stored, plain) {
    var st = String(stored ?? ""),
      pl = String(plain || "");
    if (!pl) return false;
    var h = await hashPwd(pl);
    if (!h) return st === pl;
    if (looksLikeHash(st)) return h === st.toLowerCase();
    return st === pl;
  }

  function hasPortalProtection(row) {
    if (!row || typeof row !== "object") return false;
    var p = row.portal_password_hash;
    var a = row.portal_admin_password_hash;
    var ph = p != null && String(p).trim() !== "";
    var ah = a != null && String(a).trim() !== "";
    return ph || ah;
  }

  function syncSessionActionsVisible(enabled) {
    var act = document.getElementById("portalSessionActions");
    if (!act) return;
    if (enabled && validateAndClean()) act.hidden = false;
    else act.hidden = true;
  }

  function saveSession(kind) {
    try {
      if (kind === "d") {
        localStorage.setItem(STORAGE, JSON.stringify({ k: "d", d: localYmd() }));
      } else if (kind === "p") {
        localStorage.setItem(STORAGE, JSON.stringify({ k: "p" }));
      }
    } catch (e) {}
  }

  function portalLogout() {
    if (dailyMonitorId != null) {
      clearInterval(dailyMonitorId);
      dailyMonitorId = null;
    }
    try {
      localStorage.removeItem(STORAGE);
    } catch (e) {}
    location.reload();
  }

  function startDailySessionMonitor() {
    if (dailyMonitorId != null) {
      clearInterval(dailyMonitorId);
      dailyMonitorId = null;
    }
    dailyMonitorId = setInterval(function () {
      var s = readSess();
      if (!s || s.k !== "d") return;
      if (s.d === localYmd()) return;
      try {
        localStorage.removeItem(STORAGE);
      } catch (e) {}
      location.reload();
    }, 15000);
  }

  window.LarossaPortalAuth = {
    logout: portalLogout,
    validateAndClean: validateAndClean,
  };

  async function fetchPortalRow(sb) {
    try {
      var r = await sb
        .from("admin_settings")
        .select("portal_password_hash,portal_admin_password_hash")
        .eq("id", 1)
        .single();
      if (r.error || !r.data) return null;
      return r.data;
    } catch (e) {
      return null;
    }
  }

  function mountGate(row, onOk) {
    var ph = row.portal_password_hash;
    var ah = row.portal_admin_password_hash;
    var hasP = ph != null && String(ph).trim() !== "";
    var hasA = ah != null && String(ah).trim() !== "";

    var wrap = document.createElement("div");
    wrap.id = "lrsPortalGateRoot";
    wrap.className = "lrs-portal-gate";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "lrsPortalGateTitle");

    var card = document.createElement("div");
    card.className = "lrs-portal-gate__card";

    var accent = document.createElement("div");
    accent.className = "lrs-portal-gate__accent";
    accent.setAttribute("aria-hidden", "true");

    var head = document.createElement("div");
    head.className = "lrs-portal-gate__head";

    var title = document.createElement("h1");
    title.id = "lrsPortalGateTitle";
    title.className = "lrs-portal-gate__title";
    title.textContent = "Порталға кіру";

    var sub = document.createElement("p");
    sub.className = "lrs-portal-gate__sub";
    sub.textContent = "Құпия сөзді енгізіңіз";

    head.appendChild(title);
    head.appendChild(sub);

    var inner = document.createElement("div");
    inner.className = "lrs-portal-gate__inner";

    var err = document.createElement("p");
    err.id = "lrsPortalGateErr";
    err.className = "lrs-portal-gate__err";

    var field = document.createElement("div");
    field.className = "lrs-portal-gate__field";

    var fieldIcon = document.createElement("span");
    fieldIcon.className = "lrs-portal-gate__field-icon";
    fieldIcon.setAttribute("aria-hidden", "true");
    fieldIcon.innerHTML = '<i class="fas fa-key"></i>';

    var inp = document.createElement("input");
    inp.type = "password";
    inp.className = "lrs-portal-gate__input";
    inp.autocomplete = "current-password";
    inp.placeholder = "Пароль";
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") trySubmit();
    });

    field.appendChild(fieldIcon);
    field.appendChild(inp);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lrs-portal-gate__btn";
    btn.textContent = "Кіру";

    async function trySubmit() {
      err.textContent = "";
      var pwd = (inp.value || "").trim();
      if (!pwd) {
        err.textContent = "Парольді енгізіңіз";
        inp.focus();
        return;
      }
      btn.disabled = true;
      try {
        var matchDaily = hasP && (await pwdMatch(ph, pwd));
        var matchAdmin = hasA && (await pwdMatch(ah, pwd));
        if (matchDaily) {
          saveSession("d");
          startDailySessionMonitor();
          wrap.remove();
          hideSplash();
          syncSessionActionsVisible(true);
          if (typeof onOk === "function") onOk("d");
          return;
        }
        if (matchAdmin) {
          saveSession("p");
          wrap.remove();
          hideSplash();
          syncSessionActionsVisible(true);
          if (typeof onOk === "function") onOk("p");
          return;
        }
        err.textContent = "Пароль дұрыс емес";
        inp.value = "";
        inp.focus();
      } finally {
        btn.disabled = false;
      }
    }

    btn.addEventListener("click", trySubmit);

    inner.appendChild(err);
    inner.appendChild(field);
    inner.appendChild(btn);

    card.appendChild(accent);
    card.appendChild(head);
    card.appendChild(inner);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    inp.focus();
  }

  async function init() {
    if (document.body && document.body.getAttribute("data-skip-portal-gate") === "1") {
      hideSplash();
      return;
    }
    showSplash();
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
      hideSplash();
      return;
    }
    var sb = window.supabase.createClient(SB_URL, SB_KEY);
    var row = await fetchPortalRow(sb);
    if (!row || !hasPortalProtection(row)) {
      hideSplash();
      try {
        localStorage.removeItem(STORAGE);
      } catch (e) {}
      syncSessionActionsVisible(false);
      return;
    }

    var sess = validateAndClean();
    if (sess) {
      hideSplash();
      if (sess.k === "d") startDailySessionMonitor();
      syncSessionActionsVisible(true);
      return;
    }

    hideSplash();
    mountGate(row, function () {});
  }

  function bindLogoutBtn() {
    var b = document.getElementById("portalLogoutBtn");
    if (b && !b.getAttribute("data-lrs-bound")) {
      b.setAttribute("data-lrs-bound", "1");
      b.addEventListener("click", portalLogout);
    }
  }

  showSplash();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindLogoutBtn();
      init();
    });
  } else {
    bindLogoutBtn();
    init();
  }
})();
