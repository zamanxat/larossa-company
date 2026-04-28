/**
 * Портал жоғарғы навигациядағы .portal-topnav__company-name мәтінін site_display-тен толтырады.
 * Басқа беттерде қосымша сұранымсыз қолданбаңыз — онда өз fetch логикасы бар.
 */
(function () {
  var SB_URL = "https://jnuokhhqojlurvadcduv.supabase.co";
  var SB_KEY = "sb_publishable_3l9NjY0Qadv3dJ9x3-t19w_8mKniZBk";

  function apply(name) {
    if (!name) return;
    document.querySelectorAll(".portal-topnav__company-name").forEach(function (el) {
      el.textContent = name;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof supabase === "undefined" || !supabase.createClient) return;
    var sb = supabase.createClient(SB_URL, SB_KEY);
    sb.from("site_display")
      .select("company_name")
      .eq("id", 1)
      .single()
      .then(function (r) {
        if (r && r.data && r.data.company_name) apply(r.data.company_name);
      })
      .catch(function () {});
  });
})();
