(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasObserver = "IntersectionObserver" in window;

  /* Fade content in as it scrolls into view. */
  const items = document.querySelectorAll(".reveal");
  if (hasObserver) {
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            reveal.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    items.forEach((el) => reveal.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  /* Run the hero animations only while they are on screen. */
  const stage = document.querySelector(".stage");
  if (stage) {
    if (hasObserver) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => stage.classList.toggle("live", entry.isIntersecting));
      }).observe(stage);
    } else {
      stage.classList.add("live");
    }
  }

  /* Scroll progress line in the nav bar, and the back-to-top button.
     One passive listener, batched with requestAnimationFrame. */
  const bar = document.querySelector(".bar");
  const toTop = document.querySelector(".to-top");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (bar) {
      bar.style.setProperty("--p", p.toFixed(4));
    }
    if (toTop) {
      toTop.classList.toggle("show", window.scrollY > window.innerHeight * 0.9);
    }
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* Mark the current section in the nav and slide the indicator to it.
     This only changes attributes, a transform, and the nav's own horizontal
     scroll. It never scrolls the page itself. */
  const nav = document.querySelector(".site-nav");
  const links = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
  const ind = nav ? nav.querySelector(".nav-ind") : null;
  let active = -2;

  const place = (snap) => {
    if (!ind) {
      return;
    }
    const link = links[active];
    if (!link) {
      ind.style.opacity = "0";
      return;
    }
    ind.classList.toggle("snap", Boolean(snap));
    ind.style.width = link.offsetWidth + "px";
    ind.style.transform = "translateX(" + link.offsetLeft + "px)";
    ind.style.opacity = "1";
  };

  const setActive = (index) => {
    if (index === active) {
      return;
    }
    const first = active === -2 || active === -1;
    active = index;
    links.forEach((a, i) => {
      if (i === index) {
        a.setAttribute("aria-current", "true");
      } else {
        a.removeAttribute("aria-current");
      }
    });
    place(first);
    const link = links[index];
    if (link && nav.scrollWidth > nav.clientWidth) {
      const left = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
      nav.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
    }
  };

  if (hasObserver && links.length) {
    const watch = links.map((a) => document.querySelector(a.getAttribute("href")));
    /* Recognition has no nav link of its own, so it keeps "Certifications" lit. */
    const certIndex = links.findIndex((a) => a.getAttribute("href") === "#certifications");
    watch.push(document.getElementById("recognition"));
    watch.push(document.getElementById("contact"));
    const visible = new Set();

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.add(entry.target);
          } else {
            visible.delete(entry.target);
          }
        });
        let index = -1;
        watch.forEach((el, i) => {
          if (el && visible.has(el)) {
            index = i;
          }
        });
        if (index === links.length) {
          index = certIndex;
        }
        setActive(index >= links.length ? -1 : index);
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    watch.forEach((el) => el && spy.observe(el));

    let timer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => place(true), 120);
    });
  }

  /* Case study sheet. Each project card has data-case="id" and a matching
     <template id="case-id"> in index.html. */
  const dialog = document.getElementById("case");
  if (!dialog || typeof dialog.showModal !== "function") {
    return;
  }
  const body = document.getElementById("case-body");
  const title = document.getElementById("case-title");
  const kind = document.getElementById("case-kind");
  let opener = null;

  const open = (id, from) => {
    const tpl = document.getElementById("case-" + id);
    if (!tpl) {
      return;
    }
    opener = from || null;
    title.textContent = tpl.dataset.title || "";
    kind.textContent = tpl.dataset.kind || "";
    body.replaceChildren(tpl.content.cloneNode(true));
    root.classList.add("modal-open");
    dialog.showModal();
    body.scrollTop = 0;
    history.replaceState(null, "", "#case-" + id);
  };

  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-case]");
    if (card && !event.target.closest("a")) {
      open(card.dataset.case, event.target.closest("button") || card.querySelector(".more"));
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close]")) {
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    root.classList.remove("modal-open");
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (opener) {
      opener.focus({ preventScroll: true });
    }
  });

  if (window.location.hash.startsWith("#case-")) {
    open(window.location.hash.slice(6), null);
  }
})();

/* Resume viewer: opens the resume PDF in a sheet; the link still works as a plain new-tab link without JS. */
(function () {
  const sheet = document.getElementById("resume");
  const frame = document.getElementById("resume-frame");
  if (!sheet || !frame || typeof sheet.showModal !== "function") {
    return;
  }
  let opener = null;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-resume]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    opener = link;
    if (!frame.getAttribute("src")) {
      frame.src = link.getAttribute("href") + "#view=FitH";
    }
    document.documentElement.classList.add("modal-open");
    sheet.showModal();
  });
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet || event.target.closest("[data-close]")) {
      sheet.close();
    }
  });
  sheet.addEventListener("close", () => {
    document.documentElement.classList.remove("modal-open");
    if (opener) {
      opener.focus({ preventScroll: true });
    }
  });
})();
