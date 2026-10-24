/* Animecia page-speed helpers: early connections, responsive image loading, safe static caching. */
(() => {
  "use strict";
  try {
    const scriptUrls = Array.from(document.scripts).map(script => script.src).filter(Boolean);
    const needsSupabase = scriptUrls.some(src => /supabase-js|auth-core\.js|auth-required\.js/i.test(src));
    const needsCdn = scriptUrls.some(src => src.startsWith("https://cdn.jsdelivr.net/"));

    function addLink(rel, href, crossOrigin) {
      if (document.head.querySelector('link[rel="' + rel + '"][href="' + href + '"]')) return;
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      if (crossOrigin) link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }

    if (needsSupabase) {
      addLink("preconnect", "https://bhgdjuwlxvbaeraaivmh.supabase.co", true);
      addLink("dns-prefetch", "//bhgdjuwlxvbaeraaivmh.supabase.co", false);
    }
    if (needsCdn) {
      addLink("preconnect", "https://cdn.jsdelivr.net", true);
      addLink("dns-prefetch", "//cdn.jsdelivr.net", false);
    }

    function optimizeImages(root) {
      const images = [];
      if (root && root.tagName === "IMG") images.push(root);
      if (root && root.querySelectorAll) images.push(...root.querySelectorAll("img"));
      for (const img of images) {
        if (!img.hasAttribute("decoding")) img.decoding = "async";
        if (img.dataset.lcp === "true") {
          img.loading = "eager";
          img.fetchPriority = "high";
        } else if (!img.hasAttribute("loading")) {
          const rect = img.getBoundingClientRect();
          img.loading = rect.top < window.innerHeight * 1.25 ? "eager" : "lazy";
        }
        // Do not let below-the-fold lazy images compete with the main content.
        if (img.loading === "lazy" && img.getAttribute("fetchpriority") === "high") {
          img.removeAttribute("fetchpriority");
        }
      }
    }

    optimizeImages(document);
    if ("MutationObserver" in window && document.documentElement) {
      const observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === 1) optimizeImages(node);
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    const pageUrl = new URL(window.location.href);
    const sensitiveRoute = /\/(?:auth-callback|reset-password)\.html$/i.test(pageUrl.pathname);
    const sensitiveQuery = ["code", "access_token", "refresh_token", "token_hash"].some(key => pageUrl.searchParams.has(key));
    if ("serviceWorker" in navigator && !sensitiveRoute && !sensitiveQuery) {
      window.addEventListener("load", () => {
        const script = document.querySelector('script[src*="performance.js"]');
        const swUrl = new URL("sw.js", script?.src || document.baseURI);
        navigator.serviceWorker.register(swUrl, { scope: new URL("./", swUrl).pathname }).catch(() => {});
      }, { once: true });
    }
  } catch (_) {
    // Performance enhancements must never prevent the page's core scripts from running.
  }
})();
