(() => {
  const config = window.CA_CONFIG || {};
  const publishableKey = config.SUPABASE_PUBLISHABLE_KEY || "";
  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.SUPABASE_URL || "") &&
    typeof publishableKey === "string" &&
    publishableKey.length > 20 &&
    Boolean(window.supabase && window.supabase.createClient);

  const hasOAuthCode = new URLSearchParams(location.search).has("code");
  window.CA_APP = {
    config,
    supabase: configured
      ? window.supabase.createClient(config.SUPABASE_URL, publishableKey, {
          auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        })
      : null,
    configured
  };

  // Keep the PKCE verifier, callback and session on the same origin.
  const returnKey = "caJunctionOAuthReturn";
  window.caStartGoogleLogin = async destination => {
    if (location.hostname.endsWith(".ca-junction.pages.dev") || location.hostname === "ca-junction.pages.dev") {
      location.assign("https://cajunction.in" + destination.pathname + destination.search + "#continue-google");
      return {};
    }
    sessionStorage.setItem(returnKey, destination.pathname + destination.search);
    return window.CA_APP.supabase.auth.signInWithOAuth({
      provider: "google", options: { redirectTo: location.origin + "/" }
    });
  };
  if (configured && location.origin === "https://cajunction.in" &&
      ["/admin", "/account", "/account.html"].includes(location.pathname) &&
      location.hash === "#continue-google") {
    const referrer = document.referrer && new URL(document.referrer);
    history.replaceState(null, "", location.pathname + location.search);
    if (referrer && referrer.protocol === "https:" &&
        (referrer.hostname === "ca-junction.pages.dev" || referrer.hostname.endsWith(".ca-junction.pages.dev"))) {
      window.caStartGoogleLogin(location).catch(() => {});
    }
  }
  if (configured && hasOAuthCode && location.pathname === "/") {
    const saved = sessionStorage.getItem(returnKey);
    sessionStorage.removeItem(returnKey);
    const target = new URL(saved || "/account", location.origin);
    window.CA_APP.supabase.auth.getSession().then(({data,error}) => {
      if (target.origin === location.origin && ["/admin","/account","/account.html"].includes(target.pathname)) {
        if (error || !data.session) target.searchParams.set("oauth","google");
        location.replace(target.pathname + target.search);
      }
    });
  }

  window.caSetMessage = (element, message, type = "info") => {
    if (!element) return;
    element.textContent = message;
    element.dataset.state = type;
  };

  window.caFormatINR = value =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      .format(Number(value || 0));

  window.caWhatsAppUrl = (message = config.WHATSAPP_MESSAGE || "") => {
    const phone = String(config.WHATSAPP_PHONE || "").replace(/\D/g, "");
    return phone.length >= 10
      ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(message)
      : "";
  };
})();