(() => {
  const config = window.CA_CONFIG || {};
  const publishableKey = config.SUPABASE_PUBLISHABLE_KEY || "";
  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.SUPABASE_URL || "") &&
    typeof publishableKey === "string" &&
    publishableKey.length > 20 &&
    Boolean(window.supabase && window.supabase.createClient);

  window.CA_APP = {
    config,
    supabase: configured
      ? window.supabase.createClient(config.SUPABASE_URL, publishableKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        })
      : null,
    configured
  };

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