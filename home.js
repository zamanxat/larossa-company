/**
 * Larossa басты бет — тек қана Supabase CDN, React жоқ
 */
(function () {
  "use strict";

  var SB_URL = "https://jnuokhhqojlurvadcduv.supabase.co";
  var SB_KEY = "sb_publishable_3l9NjY0Qadv3dJ9x3-t19w_8mKniZBk";
  var DEFAULT_BONUS_PCT = 9;

  var sb =
    typeof window.supabase !== "undefined" ? window.supabase.createClient(SB_URL, SB_KEY) : null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isTodayLocal(iso) {
    if (!iso) return false;
    var t = new Date(iso);
    var n = new Date();
    return (
      t.getFullYear() === n.getFullYear() &&
      t.getMonth() === n.getMonth() &&
      t.getDate() === n.getDate()
    );
  }

  function getRankRangeClient(rankPubFrom, rankPubTo) {
    var now = new Date();
    if (rankPubFrom && rankPubTo) {
      return {
        s: new Date(rankPubFrom + "T00:00:00"),
        e: new Date(rankPubTo + "T23:59:59.999"),
      };
    }
    if (rankPubFrom) {
      return { s: new Date(rankPubFrom + "T00:00:00"), e: now };
    }
    return { s: new Date(now.getFullYear(), now.getMonth(), 1), e: now };
  }

  function inRankRange(iso, s, e) {
    if (!iso) return false;
    var t = new Date(iso);
    return t >= s && t <= e;
  }

  function orderBonusTg(o) {
    var tot = Number(o.price || 0) + Number(o.price2 || 0);
    var pct = parseFloat(String(o.bonus_percent != null ? o.bonus_percent : DEFAULT_BONUS_PCT));
    return Math.round(tot * (pct / 100));
  }

  function buildRank(orders, managers) {
    var mmap = {};
    managers.forEach(function (m) {
      mmap[m.id] = m.name;
    });
    var by = {};
    (orders || []).forEach(function (o) {
      var id = o.manager_id;
      if (id == null) return;
      var sid = String(id);
      if (!by[sid]) by[sid] = { sum: 0, cnt: 0 };
      by[sid].sum += Number(o.price || 0) + Number(o.price2 || 0);
      by[sid].cnt += 1;
    });
    return Object.keys(by)
      .map(function (id) {
        return {
          id: id,
          name: mmap[Number(id)] || "—",
          sum: by[id].sum,
          cnt: by[id].cnt,
        };
      })
      .filter(function (x) {
        return x.name !== "—";
      })
      .sort(function (a, b) {
        return b.sum - a.sum;
      });
  }

  function defaultPrize(n) {
    var defs = { 1: "1 орын — жүлде", 2: "2 орын — жүлде", 3: "3 орын — жүлде" };
    return defs[n] || "";
  }

  function syncMarqueeDuration(wrap, mqInner, enabled) {
    if (!enabled || !wrap || !mqInner) return;
    var feed = mqInner.querySelector(".today-feed");
    if (!feed || !wrap) return;
    var halfPx = feed.scrollHeight * 0.5;
    if (halfPx < 20) return;
    var sec = Math.max(12, Math.min(100, halfPx / 20));
    wrap.style.setProperty("--today-marquee-sec", sec + "s");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var companyElNav = document.querySelector(".portal-topnav__company-name");
    var rankTitleBar = document.getElementById("rankTitleBar");
    var rankPeriodBar = document.getElementById("rankPeriodBar");
    var podiumEl = document.getElementById("podium");
    var rankListEl = document.getElementById("rankList");
    var rankExpandRow = document.getElementById("rankExpandRow");
    var rankToggle = document.getElementById("rankToggle");
    var rankSkel = document.getElementById("rankSkel");
    var dayRevEl = document.getElementById("dayRev");
    var dayCntEl = document.getElementById("dayCnt");
    var todaySubEl = document.getElementById("todaySub");
    var scrollRef = document.getElementById("todayFeedScroll");
    var mqRef = document.getElementById("todayFeedMarquee");
    var todayFeedInner = document.getElementById("todayFeedInner");
    var toastEl = document.getElementById("toastErr");

    var expanded = false;
    var fullRank = [];
    var mgrMap = {};
    var prizeMap = { 1: "", 2: "", 3: "" };
    var todayCards = [];
    var marquee = false;
    var loading = true;
    var rankError = "";

    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add("show");
      setTimeout(function () {
        toastEl.classList.remove("show");
      }, 4200);
    }

    function renderPodium() {
      if (!podiumEl) return;
      if (loading || rankError || !fullRank.length) {
        podiumEl.innerHTML = "";
        return;
      }
      var top = [fullRank[0], fullRank[1], fullRank[2]];
      var order = [top[1], top[0], top[2]];
      var cls = ["p2", "p1", "p3"];
      var icons = ["fa-medal", "fa-crown", "fa-award"];
      var html = "";
      for (var i = 0; i < 3; i++) {
        var m = order[i];
        if (!m) {
          html += '<div class="p-slot ' + cls[i] + '" style="visibility:hidden"></div>';
          continue;
        }
        var place = i === 0 ? 2 : i === 1 ? 1 : 3;
        var pr = prizeMap[place] || defaultPrize(place);
        var premium = i === 1 ? " p-slot--premium" : "";
        var rankBadge =
          i === 1
            ? '<div class="p-rank-badge" aria-hidden="true"><span class="p-rank-badge__txt">Топ 1</span></div>'
            : "";
        html +=
          '<div class="p-slot ' +
          cls[i] +
          premium +
          '">' +
          rankBadge +
          '<div class="p-medal"><i class="fas ' +
          icons[i] +
          '" aria-hidden="true"></i></div>' +
          '<div class="p-name">' +
          esc(m.name) +
          "</div>" +
          '<div class="p-sum">' +
          m.sum.toLocaleString("kk-KZ") +
          " ₸ · " +
          m.cnt +
          " тапсырыс</div>" +
          '<div class="p-prize">' +
          esc(pr) +
          "</div></div>";
      }
      podiumEl.innerHTML = html;
    }

    function renderRankRest() {
      if (!rankListEl || !rankExpandRow) return;
      /* Подиумда тек 1–3; 4-орыннан бастап толық тізім */
      var showToggle = fullRank.length > 3 && !loading && !rankError;
      rankExpandRow.style.display = showToggle ? "flex" : "none";
      if (!expanded || !showToggle) {
        rankListEl.innerHTML = "";
        rankListEl.style.display = "none";
        return;
      }
      rankListEl.style.display = "block";
      var h = "";
      for (var i = 0; i < fullRank.length - 3; i++) {
        var m = fullRank[3 + i];
        var placeNum = i + 4;
        h +=
          '<div class="rank-row" style="animation-delay:' +
          i * 0.04 +
          's"><div class="rank-num">' +
          placeNum +
          '</div><div class="rank-body"><b>' +
          esc(m.name) +
          "</b><span>" +
          m.sum.toLocaleString("kk-KZ") +
          " ₸ · " +
          m.cnt +
          " тапсырыс</span></div></div>";
      }
      rankListEl.innerHTML = h;
    }

    function updateRankToggle() {
      if (!rankToggle) return;
      rankToggle.classList.toggle("on", expanded);
      rankToggle.setAttribute("aria-checked", expanded ? "true" : "false");
    }

    function renderToday() {
      if (!todayFeedInner || !scrollRef) return;
      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollRef.classList.toggle("has-marquee", marquee && !reduced && todayCards.length > 0);

      if (!todayCards.length) {
        todayFeedInner.innerHTML =
          '<div class="today-empty"><i class="fas fa-inbox" aria-hidden="true"></i> Бүгін әлі тапсырыс жоқ</div>';
        return;
      }

      var blocks = "";
      todayCards.forEach(function (o, idx) {
        var t = new Date(o.created_at);
        var timeStr = t.toLocaleTimeString("kk-KZ", { hour: "2-digit", minute: "2-digit" });
        var mid = o.manager_id;
        var mgr =
          (mid != null && mgrMap[String(mid)]) || (o.manager_name || "").trim() || "—";
        var bon = orderBonusTg(o);
        var tot = Number(o.price || 0) + Number(o.price2 || 0);
        var prod = o.product || "—";
        var gift = (o.gift || "").trim();
        var giftSuffix = gift && gift !== "Жоқ" ? " · " + esc(gift) : "";
        blocks +=
          '<article class="today-card">' +
          '<div class="today-card-h"><div class="today-time">' +
          esc(timeStr) +
          '</div><div class="today-mgr">' +
          esc(mgr) +
          "</div></div>" +
          '<div class="today-client">' +
          esc(o.client_name || "—") +
          "</div>" +
          '<div class="today-phone">' +
          esc(o.client_phone || "") +
          "</div>" +
          '<div class="today-products"><strong>Тауарлар:</strong> ' +
          esc(prod) +
          giftSuffix +
          "</div>" +
          '<div class="today-foot"><span class="today-total">' +
          tot.toLocaleString("kk-KZ") +
          " ₸</span>";
        if (bon > 0) {
          blocks +=
            '<span class="today-bonus">ЗП тиісті: ' + bon.toLocaleString("kk-KZ") + " ₸</span>";
        }
        blocks += "</div></article>";
      });

      var useMq = marquee && !reduced;
      todayFeedInner.innerHTML = useMq ? blocks + blocks : blocks;

      requestAnimationFrame(function () {
        syncMarqueeDuration(scrollRef, mqRef, useMq);
        requestAnimationFrame(function () {
          syncMarqueeDuration(scrollRef, mqRef, useMq);
          setTimeout(function () {
            syncMarqueeDuration(scrollRef, mqRef, useMq);
          }, 120);
        });
      });
    }

    function renderSkel() {
      if (!rankSkel) return;
      if (loading) {
        rankSkel.textContent = "Жүктелуде…";
        rankSkel.style.display = "block";
        return;
      }
      if (rankError) {
        rankSkel.textContent = rankError;
        rankSkel.style.display = "block";
        return;
      }
      if (!fullRank.length) {
        rankSkel.textContent = "Бұл уақыт аралығында рейтингке дерек жоқ.";
        rankSkel.style.display = "block";
        return;
      }
      rankSkel.style.display = "none";
    }

    function refreshAll() {
      renderSkel();
      renderPodium();
      renderRankRest();
      updateRankToggle();
      renderToday();
    }

    if (rankToggle) {
      rankToggle.addEventListener("click", function () {
        expanded = !expanded;
        renderRankRest();
        updateRankToggle();
      });
    }

    if (scrollRef && mqRef) {
      scrollRef.addEventListener(
        "pointerdown",
        function () {
          if (marquee) mqRef.classList.add("is-paused");
        },
        { passive: true },
      );
      scrollRef.addEventListener(
        "pointerup",
        function () {
          mqRef.classList.remove("is-paused");
        },
        { passive: true },
      );
      scrollRef.addEventListener(
        "pointercancel",
        function () {
          mqRef.classList.remove("is-paused");
        },
        { passive: true },
      );
    }

    async function load() {
      loading = true;
      rankError = "";
      if (rankPeriodBar) rankPeriodBar.textContent = "";
      refreshAll();

      if (!sb) {
        loading = false;
        rankError = "Байланыс баптауы жоқ.";
        refreshAll();
        return;
      }

      try {
        if (!navigator.onLine) throw new Error("offline");

        var pr = await sb.from("larossa_rank_prizes").select("*").order("rank_place");
        if (!pr.error && pr.data) {
          prizeMap = { 1: "", 2: "", 3: "" };
          pr.data.forEach(function (row) {
            var pl = Number(row.rank_place);
            if (pl >= 1 && pl <= 3) prizeMap[pl] = row.prize_text || "";
          });
        }

        var sdRes = await sb.from("site_display").select("company_name,rank_date_from,rank_date_to").eq("id", 1).single();

        var rf = "";
        var rt = "";
        if (!sdRes.error && sdRes.data) {
          if (sdRes.data.company_name) {
            if (companyElNav) companyElNav.textContent = sdRes.data.company_name;
          }
          rf = String(sdRes.data.rank_date_from || "").slice(0, 10);
          rt = String(sdRes.data.rank_date_to || "").slice(0, 10);
        }

        var gr0 = getRankRangeClient(rf, rt);
        var a = gr0.s
          ? gr0.s.toLocaleDateString("kk-KZ", { day: "numeric", month: "long", year: "numeric" })
          : "";
        var b = gr0.e
          ? gr0.e.toLocaleDateString("kk-KZ", { day: "numeric", month: "long", year: "numeric" })
          : "";
        var periodTitle = a && b ? "Рейтинг есептелетін кезең: " + a + " — " + b : "";
        if (rankTitleBar) rankTitleBar.title = periodTitle;
        var periodTitleAttr = periodTitle || "";
        if (companyElNav) companyElNav.title = periodTitleAttr;
        if (rankPeriodBar && a && b) {
          rankPeriodBar.textContent =
            a === b ? "Кезең: " + a : "Кезең: " + a + " — " + b;
        }

        var oRes = await sb
          .from("orders")
          .select(
            "manager_id,manager_name,price,price2,created_at,client_name,client_phone,product,gift,bonus_percent",
          )
          .limit(8000);

        if (oRes.error) throw oRes.error;
        var allOrders = oRes.data || [];

        var mRes = await sb.from("managers_list").select("id,name,is_active").order("id");
        var managers = (mRes.data || []).filter(function (m) {
          return m.is_active !== false;
        });
        if (!managers.length) {
          var m2 = await sb.from("managers").select("id,name,is_active").order("id");
          managers = (m2.data || []).filter(function (m) {
            return m.is_active !== false;
          });
        }

        mgrMap = {};
        managers.forEach(function (m) {
          mgrMap[String(m.id)] = m.name;
        });

        var gr = getRankRangeClient(rf, rt);
        var ordersRank = allOrders.filter(function (o) {
          return inRankRange(o.created_at, gr.s, gr.e);
        });
        fullRank = buildRank(ordersRank, managers);

        var todayList = allOrders.filter(function (o) {
          return isTodayLocal(o.created_at);
        });
        var sum = todayList.reduce(function (s, o) {
          return s + Number(o.price || 0) + Number(o.price2 || 0);
        }, 0);
        if (dayRevEl) dayRevEl.textContent = sum.toLocaleString("kk-KZ") + " ₸";
        if (dayCntEl) dayCntEl.textContent = String(todayList.length);

        var now = new Date();
        if (todaySubEl) {
          todaySubEl.textContent = now.toLocaleDateString("kk-KZ", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
        }

        if (!todayList.length) {
          todayCards = [];
          marquee = false;
        } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          todayCards = todayList.sort(function (a, b) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          marquee = false;
        } else {
          todayCards = todayList.sort(function (a, b) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          marquee = true;
        }

        loading = false;
        rankError = "";
      } catch (e) {
        loading = false;
        if (rankPeriodBar) rankPeriodBar.textContent = "";
        var off = !navigator.onLine || (e && e.message === "offline");
        rankError = off
          ? "Интернет қосылмаған. Дерек жүктелмеді."
          : "Дерек жүктелмеді. Кейінірек қайта көріңіз.";
        fullRank = [];
        showToast("Интернет немесе сервер қатесі. Тексеріп, қайта ашыңыз.");
      }
      refreshAll();
    }

    window.addEventListener("online", function () {
      document.body.classList.remove("is-offline");
    });
    window.addEventListener("offline", function () {
      document.body.classList.add("is-offline");
    });
    if (!navigator.onLine) document.body.classList.add("is-offline");

    void load();
  });
})();
