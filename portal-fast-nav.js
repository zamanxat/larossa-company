/**
 * Портал навигациясы: Reactсыз SPA-ға ұқсас жылдамдық — prefetch + жеңіл кіру/шығу.
 */
(function () {
  "use strict";

  var prefetchSet = Object.create(null);
  var hoverTimer;

  function sameOriginHtml(url) {
    try {
      var u = new URL(url, location.href);
      if (u.origin !== location.origin) return false;
      if (u.hash && u.pathname === new URL(location.href).pathname && u.search === new URL(location.href).search)
        return false;
      var name = (u.pathname.split("/").pop() || "").toLowerCase();
      return /\.html?$/.test(name);
    } catch (e) {
      return false;
    }
  }

  function prefetch(url) {
    if (navigator.connection && navigator.connection.saveData) return;
    if (!url || prefetchSet[url]) return;
    prefetchSet[url] = true;
    var l = document.createElement("link");
    l.rel = "prefetch";
    l.href = url;
    document.head.appendChild(l);
  }

  function intentTarget(e) {
    var t = e.target;
    if (!t || !t.closest) return null;
    return t.closest("a[href]");
  }

  function maybePrefetchFromEvent(e) {
    var a = intentTarget(e);
    if (!a || !a.href) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    var rel = (a.getAttribute("rel") || "").toLowerCase();
    if (rel.indexOf("external") !== -1) return;
    if (!sameOriginHtml(a.href)) return;
    prefetch(a.href);
  }

  document.addEventListener(
    "touchstart",
    function (e) {
      maybePrefetchFromEvent(e);
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    "mouseover",
    function (e) {
      if (typeof e.clientX === "number" && e.clientX === 0 && e.clientY === 0) return;
      clearTimeout(hoverTimer);
      var ev = e;
      hoverTimer = setTimeout(function () {
        maybePrefetchFromEvent(ev);
      }, 65);
    },
    { passive: true }
  );

  document.addEventListener(
    "click",
    function (e) {
      var a = intentTarget(e);
      if (!a || !a.href) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      if (!sameOriginHtml(a.href)) return;
      document.documentElement.classList.add("portal-nav-leave");
    },
    true
  );

  function preconnectSupabase() {
    if (navigator.connection && navigator.connection.saveData) return;
    var host = "https://jnuokhhqojlurvadcduv.supabase.co";
    if (document.querySelector('link[rel="preconnect"][href="' + host + '"]')) return;
    var l = document.createElement("link");
    l.rel = "preconnect";
    l.href = host;
    l.crossOrigin = "";
    document.head.appendChild(l);
  }
  preconnectSupabase();
})();
