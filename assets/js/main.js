// IP PointLink — site behaviour (no dependencies)
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

  // ---------- Header: shadow on scroll + mobile menu ----------
  const header = $(".site-header");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 4);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const toggle = $(".nav-toggle");
  const nav = $("#main-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); } });
    nav.addEventListener("focusout", (e) => { if (nav.classList.contains("is-open") && e.relatedTarget && !nav.contains(e.relatedTarget) && e.relatedTarget !== toggle) setOpen(false); });
    document.addEventListener("click", (e) => { if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false); });
    const mq = window.matchMedia("(min-width: 961px)");
    const onMq = (e) => e.matches && setOpen(false);
    mq.addEventListener ? mq.addEventListener("change", onMq) : mq.addListener(onMq);
  }

  // ---------- Reveal on scroll ----------
  const reveals = $$(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // ---------- Pricing page: monthly / annual toggle ----------
  const billingButtons = $$(".billing-toggle [data-billing]");
  if (billingButtons.length) {
    const apply = (mode) => {
      billingButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.billing === mode)));
      $$(".plans--page [data-price]").forEach((el) => { el.textContent = el.dataset[mode]; });
      $$(".plans--page [data-billed]").forEach((el) => {
        el.textContent = mode === "annual" ? `Billed $${el.dataset.annualTotal} yearly.` : "Billed monthly. Cancel anytime.";
      });
      $$(".plans--page [data-plan-cta]").forEach((a) => {
        const url = new URL(a.getAttribute("href"), location.href);
        url.searchParams.set("billing", mode);
        a.setAttribute("href", `get-started.html${url.search}`);
      });
    };
    billingButtons.forEach((b) => b.addEventListener("click", () => apply(b.dataset.billing)));
    if ((new URLSearchParams(location.search).get("billing") || "").toLowerCase() === "annual") apply("annual");
  }

  // ---------- FAQ: filter + search ----------
  const faq = $("[data-faq]");
  if (faq) {
    const items = $$("details", faq);
    const empty = $("[data-faq-empty]");
    const filterButtons = $$(".faq-filter [data-filter]");
    const search = $("#faq-q");
    let cat = "all";
    const run = () => {
      const q = (search ? search.value : "").trim().toLowerCase();
      let shown = 0;
      items.forEach((d) => {
        const match = (cat === "all" || d.dataset.cat === cat) && (!q || d.textContent.toLowerCase().includes(q));
        d.hidden = !match;
        if (match) shown++;
      });
      if (empty) empty.style.display = shown ? "none" : "block";
    };
    const setCat = (c) => {
      cat = c;
      filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === c)));
      run();
    };
    filterButtons.forEach((b) => b.addEventListener("click", () => setCat(b.dataset.filter)));
    $$("[data-topic]").forEach((a) => a.addEventListener("click", () => { if (search) search.value = ""; setCat(a.dataset.topic); }));
    if (search) {
      search.addEventListener("input", () => {
        run();
      });
      $("[data-faq-search]").addEventListener("submit", (e) => {
        e.preventDefault();
        run();
        $("#faq").scrollIntoView({ behavior: smooth() });
        const first = items.find((d) => !d.hidden);
        if (first && search.value.trim()) first.open = true;
      });
    }
  }

  // ---------- Form validation helpers ----------
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const fieldOf = (input) => input.closest(".field");
  const setError = (input, msg) => {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.toggle("is-invalid", !!msg);
    const err = $(".field__error", field);
    if (err) err.textContent = msg || "";
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) {
      if (!err.id) err.id = `${input.id || input.name}-error`;
      const ids = new Set((input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
      msg ? ids.add(err.id) : ids.delete(err.id);
      ids.size ? input.setAttribute("aria-describedby", [...ids].join(" ")) : input.removeAttribute("aria-describedby");
    }
  };

  const showSuccess = (form, data) => {
    const wrap = form.closest("[data-form-wrap]");
    $$("[data-echo]", wrap).forEach((el) => { el.textContent = data[el.dataset.echo] || ""; });
    wrap.classList.add("is-sent");
    const ok = $(".form-success", wrap);
    ok.focus({ preventScroll: true });
    ok.scrollIntoView({ behavior: smooth(), block: "center" });
  };

  const wireForm = (form, validators, onValid) => {
    if (!form) return;
    const validate = (input) => {
      const fn = validators[input.name];
      if (!fn) return true;
      const msg = fn(input, form);
      setError(input, msg);
      return !msg;
    };
    const touched = new Set();
    form.addEventListener("blur", (e) => {
      const t = e.target;
      if (t.name && validators[t.name] && t.type !== "checkbox" && t.value !== "") { touched.add(t.name); validate(t); }
    }, true);
    form.addEventListener("input", (e) => { if (touched.has(e.target.name)) validate(e.target); });
    form.addEventListener("change", (e) => { if (e.target.type === "checkbox" || e.target.tagName === "SELECT") validate(e.target); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let firstBad = null;
      Object.keys(validators).forEach((name) => {
        const input = form.elements[name];
        if (!input) return;
        touched.add(name);
        if (!validate(input) && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }
      onValid(Object.fromEntries(new FormData(form)));
    });
  };

  const required = (label) => (i) => (i.value.trim() ? "" : `Please enter your ${label}.`);
  const email = (i) => (!i.value.trim() ? "Please enter your email address." : EMAIL_RE.test(i.value.trim()) ? "" : "Please enter a valid email address.");

  // ---------- Contact form ----------
  const contact = $("#contact-form");
  wireForm(contact, {
    name: required("name"),
    email,
    topic: (i) => (i.value ? "" : "Please choose a topic."),
    message: (i) => (i.value.trim().length >= 10 ? "" : "Please add a little more detail (10+ characters)."),
  }, (data) => showSuccess(contact, { name: data.name.trim().split(" ")[0], email: data.email.trim() }));

  // ---------- Sign-up form ----------
  const signup = $("#signup-form");
  if (signup) {
    const params = new URLSearchParams(location.search);
    const planParam = (params.get("plan") || "").toLowerCase();
    const billingParam = (params.get("billing") || "").toLowerCase();
    if (planParam && signup.elements.plan) {
      const radio = $(`input[name="plan"][value="${CSS.escape(planParam)}"]`, signup);
      if (radio) radio.checked = true;
    }
    if (billingParam === "annual" || billingParam === "monthly") {
      const radio = $(`input[name="billing"][value="${billingParam}"]`, signup);
      if (radio) radio.checked = true;
    }

    const money = (n) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    const updateSummary = () => {
      const plan = $('input[name="plan"]:checked', signup);
      const billing = $('input[name="billing"]:checked', signup).value;
      const per = Number(plan.dataset[billing]);
      $$(".plan-picker [data-price]", signup).forEach((el) => { el.textContent = el.dataset[billing]; });
      $('[data-sum="plan"]').textContent = plan.dataset.name;
      $('[data-sum="billing"]').textContent = billing === "annual" ? `Annual ($${per}/mo)` : "Monthly";
      $('[data-sum="total"]').textContent = money(billing === "annual" ? per * 12 : per);
      const hint = $("[data-location-hint]", signup);
      if (hint) hint.textContent = plan.value === "starter"
        ? "Starter plans are assigned the closest available location to your preference."
        : "Your dedicated IP will be provisioned in this location.";
    };
    signup.addEventListener("change", (e) => { if (e.target.name === "plan" || e.target.name === "billing") updateSummary(); });
    updateSummary();

    // Password show/hide + strength meter
    const pass = signup.elements.password;
    const pwToggle = $(".pw-toggle", signup);
    pwToggle.addEventListener("click", () => {
      const show = pass.type === "password";
      pass.type = show ? "text" : "password";
      pwToggle.textContent = show ? "Hide" : "Show";
      pwToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
    const meter = $(".pw-meter", signup);
    const score = (v) => {
      if (!v) return 0;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[a-z]/i.test(v) && /\d/.test(v)) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
      return Math.max(1, s);
    };
    const meterText = $("[data-pw-strength]", signup);
    pass.addEventListener("input", () => {
      const sc = score(pass.value);
      meter.dataset.score = String(sc);
      if (meterText) meterText.textContent = sc ? `Password strength: ${["", "weak", "fair", "good", "strong"][sc]}` : "";
    });

    wireForm(signup, {
      first: required("first name"),
      last: required("last name"),
      email,
      location: (i) => (i.value ? "" : "Please choose a preferred IP location."),
      password: (i) => (!i.value ? "Please create a password."
        : i.value.length < 8 ? "Password must be at least 8 characters."
        : !(/[a-z]/i.test(i.value) && /\d/.test(i.value)) ? "Include at least one letter and one number." : ""),
      password2: (i, f) => (!i.value ? "Please confirm your password." : i.value === f.elements.password.value ? "" : "Passwords don't match."),
      terms: (i) => (i.checked ? "" : "Please accept the terms to continue."),
    }, (data) => {
      const plan = $('input[name="plan"]:checked', signup);
      showSuccess(signup, { first: data.first.trim(), email: data.email.trim(), planName: plan.dataset.name });
    });
    // Re-check the confirmation whenever the main password changes
    pass.addEventListener("input", () => {
      const p2 = signup.elements.password2;
      if (p2.value) setError(p2, p2.value === pass.value ? "" : "Passwords don't match.");
    });
  }
})();
