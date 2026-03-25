window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
var getKeyDown = player.getKeyDown;
var keydown = player.keydown;
var keyup = player.keyup;
window.Script343 = function()
{
  /*
  Request Fullscreen on Start click (enter only)
  Slide: 1.1 Intro
  Shape: Rectangle 3 (START)

  Notes:
  - Browsers require fullscreen requests to be initiated by a user gesture (click/tap).
  - iOS Safari may not support true fullscreen for arbitrary elements.
  - This is "enter only": if already fullscreen, it does nothing.
*/

(function () {
  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function requestFullscreen() {
    if (isFullscreen()) return;

    const el = document.documentElement; // fullscreen the whole page

    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (req) {
      try {
        const result = req.call(el);
        // If a Promise is returned, suppress unhandled rejections
        if (result && typeof result.then === 'function') {
          result.catch(() => {});
        }
      } catch (e) {
        // Fail silently (often blocked on some devices/browsers)
      }
    }
  }

  requestFullscreen();
})();

}

window.Script344 = function()
{
  /*
  Share a link from the Share button (Web Share API + Clipboard fallback)
  Slide: 1.2 Outro
  Shape: Rectangle 3 (display text: "Share")
  Trigger: Execute JavaScript when user clicks

  Notes:
  - Mobile browsers usually support navigator.share(). Desktop support varies.
  - If sharing isn't supported, the script copies the link to clipboard.
*/

(function () {
  const url = 'https://marceloaraya.framer.website/#sortsmart';
  const title = 'Sort Smart Aotearoa';
  const text = 'Check out Sort Smart Aotearoa — help keep Tāmaki Makaurau beautiful!';

  function promptCopyFallback(link) {
    // Last-resort fallback if clipboard API is unavailable/blocked
    window.prompt('Copy this link to share:', link);
  }

  async function copyToClipboard(link) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        alert('Link copied to clipboard! Paste it to share.');
        return true;
      }
    } catch (e) {
      // fall through
    }

    // Older fallback (may still be blocked in some contexts)
    try {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        alert('Link copied to clipboard! Paste it to share.');
        return true;
      }
    } catch (e) {
      // fall through
    }

    promptCopyFallback(link);
    return false;
  }

  async function shareLink() {
    // Prefer native share sheet when available
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (e) {
      // If user cancels share, do nothing.
      // If it fails for other reasons, we fall back to clipboard.
      if (String(e && e.name) === 'AbortError') return;
    }

    // Desktop fallback: copy the link
    await copyToClipboard(url);
  }

  shareLink();
})();

}

window.Script345 = function()
{
  /*
  JS Debug: detect malformed JSON in variables (ultra-light + no resolver spam)

  Problem observed:
    Console spam: "resolver::resolvePath - Path did not resolve at: <VarName>"
    This is caused by calling getVar() for variables that do not exist.
    The repeated spam can contribute to intermittent freezing/stutters.

  Fix:
    - Only call getVar() for variables confirmed to exist using player.GetVars()
    - Scan runs ONCE (no update() loop)
    - Very small log budget
    - Optional opt-in switch: DebugMode (True/False)

  How to use:
    1) Create a Storyline True/False variable named DebugMode
    2) Set DebugMode = True when you want scanning
    3) Set DebugMode = False for production
*/

(function () {
  // --- Opt-in switch (recommended) ---
  // If DebugMode variable exists, only run when it is true.
  // If it doesn't exist, run once (so you still get help without setup).
  let debugModeExists = false;
  let debugModeOn = true;

  try {
    const allVars = player.GetVars();
    debugModeExists = Object.prototype.hasOwnProperty.call(allVars, 'DebugMode');
    if (debugModeExists) {
      debugModeOn = !!allVars.DebugMode;
    }

    if (!debugModeOn) return;

    // --- Keep this list short and explicit ---
    const explicitSuspects = [
      'PileLevel',
      'StreakCount',
      'EcoPoints',
      'RandomReward',
      'lifegreen'
    ];

    // If you later discover real JSON variables, add them here.
    const probeNames = [
      'GameState',
      'RewardData',
      'EcoRewardData',
      'Payload',
      'Config',
      'Settings',
      'Debug',
      'LastEvent',
      'LastResult',
      'JsError'
    ];

    function uniq(arr) {
      const out = [];
      for (let i = 0; i < arr.length; i++) {
        if (out.indexOf(arr[i]) === -1) out.push(arr[i]);
      }
      return out;
    }

    function looksLikeJsonString(s) {
      if (typeof s !== 'string') return false;
      const t = s.trim();
      return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
    }

    function maybeInterestingString(s) {
      if (typeof s !== 'string') return false;
      const t = s.trim();
      if (!t) return false;
      return /[\{\}\[\]:]/.test(t) || t.length > 120;
    }

    // Small log budget to prevent console flooding
    const LOG_BUDGET = 25;
    let logsUsed = 0;
    function log(...args) {
      if (logsUsed >= LOG_BUDGET) return;
      console.log(...args);
      logsUsed++;
    }
    function warn(...args) {
      if (logsUsed >= LOG_BUDGET) return;
      console.warn(...args);
      logsUsed++;
    }
    function error(...args) {
      if (logsUsed >= LOG_BUDGET) return;
      console.error(...args);
      logsUsed++;
    }

    const suspects = uniq(explicitSuspects.concat(probeNames));

    // Only scan variables that actually exist (prevents resolver::resolvePath spam)
    const existing = [];
    for (let i = 0; i < suspects.length; i++) {
      const name = suspects[i];
      if (Object.prototype.hasOwnProperty.call(allVars, name)) existing.push(name);
    }

    log('[JS Debug] Scan starting. DebugMode:', debugModeExists ? String(!!allVars.DebugMode) : '(variable not found; running once)');
    log('[JS Debug] Existing suspects on this slide:', existing);

    for (let i = 0; i < existing.length; i++) {
      const name = existing[i];
      const val = allVars[name];

      if (typeof val === 'string') {
        if (maybeInterestingString(val)) {
          log('[JS Debug] Var', name, '=', val);
        }

        if (looksLikeJsonString(val)) {
          try {
            JSON.parse(val);
          } catch (e) {
            error('[JS Debug] JSON.parse FAILED for', name);
            error('[JS Debug] Value:', val);
            error('[JS Debug] Error:', e);
          }
        } else {
          const t = val.trim();
          if (t.includes(':')) {
            const isUrl = /^https?:\/\//i.test(t);
            const isTime = /^\d{1,2}:\d{2}/.test(t);
            if (!isUrl && !isTime) {
              warn('[JS Debug] Possible non-JSON string containing ":" (only a problem if some other code JSON.parse()s it):', name);
              warn('[JS Debug] Value:', val);
            }
          }
        }
      } else {
        // For key numeric vars, log once
        if (explicitSuspects.indexOf(name) !== -1) {
          log('[JS Debug] Var', name, '=', val);
        }
      }

      if (logsUsed >= LOG_BUDGET) {
        warn('[JS Debug] Log budget reached; stopping early.');
        break;
      }
    }

    log('[JS Debug] Scan finished. Logs used:', logsUsed, 'of', LOG_BUDGET);
  } catch (e) {
    // Never break the slide
    try { console.error('[JS Debug] Unexpected error (caught):', e); } catch (_) {}
  }
})();

}

window.Script346 = function()
{
  /*
  JS - Capture certificate (crop to certificateArea, hide buttons) - Share/Download

  Slide: Certificate

  Trigger in Storyline:
  - Execute JavaScript: this code
  - When user clicks: Share (display name: Share; button text: “Complete”)

  What it does:
  - Uses html2canvas to capture the currently-visible slide content
  - Tries to inline currently-loaded <img> elements to data URLs (helps with missing images)
  - Temporarily hides the two buttons so they are NOT included in the image
  - Crops the resulting image to the on-screen bounds of the rectangle named “certificateArea”
  - Downloads PNG and attempts Web Share on supported devices

  Required Storyline setup (IMPORTANT):
  1) Set Accessibility text (Alt Text) for these shapes:
     - Rectangle 2 (button text “Show Again”)  ->  BTN_SHOW_AGAIN
     - Share       (button text “Complete”)   ->  BTN_COMPLETE

  2) Ensure the rectangle named “certificateArea” has Accessibility text (Alt Text) exactly:
     - CERTIFICATE_CONTAINER

  Notes / limits:
  - Still “best effort” due to browser limitations and html2canvas.
  - Inlining images only works for images that are same-origin and can be fetched as blobs.
  - If you publish to Vercel with strict CSP, allow the html2canvas CDN (or self-host it).
*/

(function () {
  const DEBUG = false;

  // Accessibility labels (Alt Text) you set in Storyline
  const CERT_CONTAINER_ACC_TEXT = 'CERTIFICATE_CONTAINER';
  const BTN_SHOW_AGAIN_ACC_TEXT = 'BTN_SHOW_AGAIN';
  const BTN_COMPLETE_ACC_TEXT = 'BTN_COMPLETE';

  const FILE_NAME = 'SortSmart_Certificate.png';

  // Capture tuning
  const CAPTURE_SCALE = 2;            // increase for sharper export (bigger file)
  const CAPTURE_BG = null;           // e.g. '#FAF4B4' if you want to force a background
  const WAIT_FOR_ASSETS_MS = 8000;   // longer wait for Storyline images/fonts
  const INLINE_IMAGES_TIMEOUT_MS = 6000;

  // Share metadata
  const SHARE_TITLE = 'Sort Smart Aotearoa';
  const SHARE_TEXT = 'I completed Sort Smart Aotearoa — taking my first step to help keep Auckland beautiful.';

  // -------------------- Debug overlay --------------------
  function ensureOverlay() {
    if (!DEBUG) return null;
    let el = document.getElementById('__ss_cert_debug');
    if (el) return el;
    el = document.createElement('div');
    el.id = '__ss_cert_debug';
    el.style.position = 'fixed';
    el.style.left = '12px';
    el.style.top = '12px';
    el.style.right = '12px';
    el.style.zIndex = '999999';
    el.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    el.style.fontSize = '13px';
    el.style.lineHeight = '1.25';
    el.style.padding = '10px 12px';
    el.style.background = 'rgba(0,0,0,.82)';
    el.style.color = '#fff';
    el.style.border = '1px solid rgba(255,255,255,.25)';
    el.style.borderRadius = '8px';
    el.style.maxHeight = '40vh';
    el.style.overflow = 'auto';
    el.style.whiteSpace = 'pre-wrap';
    document.body.appendChild(el);
    return el;
  }

  const overlay = ensureOverlay();
  function log(msg, obj) {
    if (obj !== undefined) console.log('[CERT]', msg, obj);
    else console.log('[CERT]', msg);
    if (DEBUG && overlay) overlay.textContent += (overlay.textContent ? '\n' : '') + String(msg);
  }

  function fail(msg, err) {
    console.error('[CERT][FAIL]', msg, err || '');
    if (DEBUG && overlay) overlay.textContent += (overlay.textContent ? '\n' : '') + 'ERROR: ' + msg;
    alert(msg);
  }

  // Prevent double clicks
  if (window.__ss_certCaptureBusy) return;
  window.__ss_certCaptureBusy = true;

  function cssEscape(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ');
  }

  // -------------------- html2canvas loader --------------------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadHtml2Canvas() {
    if (typeof html2canvas !== 'undefined') return html2canvas;
    if (window.__ss_html2canvasLoadingPromise) return window.__ss_html2canvasLoadingPromise;

    const cdns = [
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
    ];

    window.__ss_html2canvasLoadingPromise = (async () => {
      let lastErr;
      for (let i = 0; i < cdns.length; i++) {
        const src = cdns[i];
        try {
          log('Loading html2canvas: ' + src);
          await loadScript(src);
          if (typeof html2canvas !== 'undefined') return html2canvas;
          lastErr = new Error('Loaded script but html2canvas is undefined');
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('Failed to load html2canvas');
    })();

    return window.__ss_html2canvasLoadingPromise;
  }

  // -------------------- DOM helpers --------------------
  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    return true;
  }

  async function waitForVisible(el, timeoutMs = 2500) {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (isVisible(el)) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return isVisible(el);
  }

  function area(el) {
    const r = el.getBoundingClientRect();
    return r.width * r.height;
  }

  function findByAccText(label) {
    const selectors = [
      `[data-acc-text="${cssEscape(label)}"]`,
      `[aria-label="${cssEscape(label)}"]`,
      `[title="${cssEscape(label)}"]`
    ];
    for (let i = 0; i < selectors.length; i++) {
      const el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function pickLargestVisibleElement(selectors) {
    let best = null;
    let bestArea = 0;

    selectors.forEach(sel => {
      const els = Array.from(document.querySelectorAll(sel));
      els.forEach(el => {
        if (!isVisible(el)) return;
        const a = area(el);
        if (a > bestArea) {
          best = el;
          bestArea = a;
        }
      });
    });

    return best;
  }

  function findBestCaptureRoot() {
    const root = pickLargestVisibleElement([
      '[data-slide-id]',
      '[data-scene-id]',
      '.slide',
      '.slide-layer',
      '#slide',
      '#storyContent',
      '#content'
    ]);

    return root || document.body;
  }

  function hideElementsTemporarily(elements) {
    const records = [];
    elements.forEach(el => {
      if (!el) return;
      records.push({
        el,
        display: el.style.display,
        visibility: el.style.visibility,
        opacity: el.style.opacity,
        pointerEvents: el.style.pointerEvents
      });

      el.style.pointerEvents = 'none';
      el.style.visibility = 'hidden';
    });

    return function restore() {
      records.forEach(r => {
        r.el.style.display = r.display;
        r.el.style.visibility = r.visibility;
        r.el.style.opacity = r.opacity;
        r.el.style.pointerEvents = r.pointerEvents;
      });
    };
  }

  function nextFrame() {
    return new Promise(r => requestAnimationFrame(() => r()));
  }

  async function waitForFonts(timeoutMs) {
    try {
      if (!document.fonts || !document.fonts.ready) return;
      const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs));
      await Promise.race([document.fonts.ready, timeout]);
    } catch (_) {}
  }

  async function waitForImagesIn(rootEl, timeoutMs) {
    try {
      const imgs = Array.from((rootEl || document).querySelectorAll('img'))
        .filter(img => img && img.src);

      if (!imgs.length) return;

      await Promise.race([
        Promise.all(imgs.map(img => {
          try {
            img.loading = 'eager';
            img.decoding = 'sync';
          } catch (_) {}

          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(resolve => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });
        })),
        new Promise(resolve => setTimeout(resolve, timeoutMs))
      ]);
    } catch (_) {}
  }

  function isSameOrigin(url) {
    try {
      const u = new URL(url, window.location.href);
      return u.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  async function blobToDataUrl(blob) {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  }

  async function inlineImagesIn(rootEl, timeoutMs) {
    // Attempts to fetch same-origin images and replace their src with data URLs.
    // This can prevent “missing image” issues in html2canvas.
    const imgs = Array.from((rootEl || document).querySelectorAll('img'))
      .filter(img => img && img.src && isVisible(img));

    const originals = new Map();

    const start = performance.now();
    const tasks = imgs.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src) return;
      if (src.startsWith('data:')) return;
      if (!isSameOrigin(src)) {
        // Keep as-is; html2canvas may still render if CORS headers allow.
        img.crossOrigin = 'anonymous';
        return;
      }

      try {
        originals.set(img, { src: img.src, srcset: img.getAttribute('srcset'), currentSrc: img.currentSrc });
        img.crossOrigin = 'anonymous';

        const resp = await fetch(src, { cache: 'force-cache', mode: 'same-origin' });
        if (!resp.ok) return;
        const blob = await resp.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (!dataUrl) return;

        // Remove srcset to prevent browser from swapping it back
        img.removeAttribute('srcset');
        img.src = dataUrl;
        await waitForImagesIn(img.parentElement || rootEl, 1500);
      } catch (_) {
        // ignore
      }
    });

    await Promise.race([
      Promise.all(tasks),
      new Promise(resolve => setTimeout(resolve, timeoutMs))
    ]);

    log('inlineImagesIn done after ms: ' + Math.round(performance.now() - start));

    return function restore() {
      originals.forEach((val, img) => {
        try {
          if (val.srcset != null) img.setAttribute('srcset', val.srcset);
          img.src = val.src;
        } catch (_) {}
      });
    };
  }

  // -------------------- Canvas helpers --------------------
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      if (!canvas) return resolve(null);
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        resolve(new Blob([ab], { type: 'image/png' }));
      }
    });
  }

  function cropCanvasToRect(sourceCanvas, rectCssPixels, scale) {
    const sx = Math.round(rectCssPixels.left * scale);
    const sy = Math.round(rectCssPixels.top * scale);
    const sw = Math.round(rectCssPixels.width * scale);
    const sh = Math.round(rectCssPixels.height * scale);

    const maxW = sourceCanvas.width;
    const maxH = sourceCanvas.height;

    const cx = clamp(sx, 0, maxW);
    const cy = clamp(sy, 0, maxH);
    const cw = clamp(sw, 0, maxW - cx);
    const ch = clamp(sh, 0, maxH - cy);

    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;

    const ctx = out.getContext('2d');
    ctx.drawImage(sourceCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return out;
  }

  // -------------------- Download/share helpers --------------------
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  }

  async function tryShareFile(blob, filename) {
    try {
      if (!blob) return false;
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, files: [file] });
        return true;
      }
    } catch (e) {
      if (String(e && e.name) === 'AbortError') return true;
    }
    return false;
  }

  // -------------------- Main --------------------
  async function run() {
    const certRectEl = findByAccText(CERT_CONTAINER_ACC_TEXT);
    if (!certRectEl) {
      fail('Could not find the certificate area.\n\nMake sure “certificateArea” has Accessibility text: CERTIFICATE_CONTAINER.');
      return;
    }

    const captureRoot = findBestCaptureRoot();
    const ok = await waitForVisible(captureRoot, 2500);
    if (!ok) {
      fail('The certificate is not visible yet. Click “Reveal” first, then click “Complete” again.');
      return;
    }

    let h2c;
    try {
      h2c = await loadHtml2Canvas();
    } catch (e) {
      fail('html2canvas could not be loaded. If you have a CSP on Vercel, allow the CDN domain or self-host html2canvas.', e);
      return;
    }

    // Buttons to hide
    const btnShowAgain = findByAccText(BTN_SHOW_AGAIN_ACC_TEXT);
    const btnComplete = findByAccText(BTN_COMPLETE_ACC_TEXT);

    const restoreButtons = hideElementsTemporarily([btnShowAgain, btnComplete]);

    // Hide the certificateArea outline/border so it doesn’t appear in capture
    const oldOutline = certRectEl.style.outline;
    const oldBorder = certRectEl.style.border;
    const oldStroke = certRectEl.style.stroke;
    certRectEl.style.outline = 'none';
    certRectEl.style.border = 'none';
    certRectEl.style.stroke = 'none';

    // Wait for assets
    await waitForFonts(WAIT_FOR_ASSETS_MS);
    await waitForImagesIn(captureRoot, WAIT_FOR_ASSETS_MS);

    // Attempt to inline same-origin images (helps with picture states / missing badges)
    const restoreInlined = await inlineImagesIn(captureRoot, INLINE_IMAGES_TIMEOUT_MS);

    // Ensure layout updates apply
    await nextFrame();

    const rect = certRectEl.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      restoreButtons();
      restoreInlined();
      certRectEl.style.outline = oldOutline || '';
      certRectEl.style.border = oldBorder || '';
      certRectEl.style.stroke = oldStroke || '';
      fail('Certificate area is too small/invisible. Make sure it’s visible between 00:06 and 00:12.');
      return;
    }

    let canvas;
    try {
      // Try standard rendering first
      try {
        canvas = await h2c(captureRoot, {
          scale: CAPTURE_SCALE,
          backgroundColor: CAPTURE_BG,
          useCORS: true,
          allowTaint: true,
          imageTimeout: WAIT_FOR_ASSETS_MS,
          logging: false,
          foreignObjectRendering: false
        });
      } catch (e1) {
        // Fallback: foreignObjectRendering sometimes captures images/text differently.
        log('Retrying capture with foreignObjectRendering=true');
        canvas = await h2c(captureRoot, {
          scale: CAPTURE_SCALE,
          backgroundColor: CAPTURE_BG,
          useCORS: true,
          allowTaint: true,
          imageTimeout: WAIT_FOR_ASSETS_MS,
          logging: false,
          foreignObjectRendering: true
        });
      }
    } catch (e) {
      fail(
        'Capture failed. If badges are still missing, it’s typically due to how Storyline renders picture states or because some assets are blocked/tainted.\n\nIf you use CSP on Vercel, ensure images/fonts are allowed and same-origin.',
        e
      );
      return;
    } finally {
      restoreButtons();
      restoreInlined();
      certRectEl.style.outline = oldOutline || '';
      certRectEl.style.border = oldBorder || '';
      certRectEl.style.stroke = oldStroke || '';
    }

    const cropped = cropCanvasToRect(canvas, rect, CAPTURE_SCALE);
    const blob = await canvasToBlob(cropped);
    if (!blob) {
      fail('Could not convert capture to a PNG.');
      return;
    }

    const shared = await tryShareFile(blob, FILE_NAME);
    if (!shared) downloadBlob(blob, FILE_NAME);
  }

  Promise.resolve()
    .then(run)
    .finally(() => {
      setTimeout(() => {
        window.__ss_certCaptureBusy = false;
      }, 800);
    });
})();

}

};
