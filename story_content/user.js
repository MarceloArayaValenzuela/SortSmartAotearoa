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
window.Script342 = function()
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

window.Script343 = function()
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

window.Script344 = function()
{
  /*
  Certificate capture + download (and optional share) with robust debugging

  Slide: Certificate
  Trigger: Execute JavaScript when the user clicks the "Share" button (display name: Share)

  SETUP REQUIRED IN STORYLINE:
  - Select the rectangle: certificateArea
  - Set its Accessibility text (Alt Text) to exactly:
      CERTIFICATE_CONTAINER

  What this version improves:
  - Debug overlay + console logs (tells you exactly why it fails)
  - Loads html2canvas from multiple CDNs
  - Finds the target container by:
      1) Accessibility text (data-acc-text / aria-label / title)
      2) Fallback: largest visible Storyline object wrapper near slide bounds
  - Uses a Blob-based download approach (more reliable on mobile)
  - Tries Web Share with files when available

  After it works, we can turn off DEBUG.
*/

(function () {
  const DEBUG = true;

  const CERT_CONTAINER_ACC_TEXT = 'CERTIFICATE_CONTAINER';
  const FILE_NAME = 'SortSmart_Certificate.png';

  // Capture tuning
  const CAPTURE_SCALE = 2;
  const CAPTURE_BG = null; // or '#FAF4B4'

  const SHARE_TITLE = 'Sort Smart Aotearoa';
  const SHARE_TEXT = 'I completed Sort Smart Aotearoa — taking my first step to help keep Auckland beautiful.';

  // ---------- Debug overlay ----------
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
    el.style.fontSize = '14px';
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
    if (obj !== undefined) {
      console.log('[CERT]', msg, obj);
    } else {
      console.log('[CERT]', msg);
    }
    if (DEBUG && overlay) {
      overlay.textContent += (overlay.textContent ? '\n' : '') + String(msg);
    }
  }

  function fail(msg, err) {
    console.error('[CERT][FAIL]', msg, err || '');
    if (DEBUG && overlay) {
      overlay.textContent += (overlay.textContent ? '\n' : '') + 'ERROR: ' + msg;
    }
    alert(msg);
  }

  // Prevent double click races
  if (window.__ss_certCaptureBusy) {
    log('Busy: ignoring click');
    return;
  }
  window.__ss_certCaptureBusy = true;

  function cssEscape(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ');
  }

  // ---------- html2canvas loader (multi-CDN) ----------
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
    if (typeof html2canvas !== 'undefined') {
      log('html2canvas already available');
      return html2canvas;
    }

    if (window.__ss_html2canvasLoadingPromise) {
      log('Waiting for existing html2canvas load promise');
      return window.__ss_html2canvasLoadingPromise;
    }

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
          log('Loading html2canvas from: ' + src);
          await loadScript(src);
          if (typeof html2canvas !== 'undefined') {
            log('html2canvas loaded OK');
            return html2canvas;
          }
          lastErr = new Error('Loaded script but html2canvas is undefined');
        } catch (e) {
          lastErr = e;
          log('Failed loading from: ' + src);
        }
      }
      throw lastErr || new Error('Failed to load html2canvas');
    })();

    return window.__ss_html2canvasLoadingPromise;
  }

  // ---------- DOM target discovery ----------
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

  function guessCertificateContainerFallback() {
    // Fallback strategy:
    // Find the largest visible element that looks like a Storyline object wrapper.
    // This is heuristic; we log what we picked.
    const candidates = Array.from(document.querySelectorAll('div'))
      .filter(isVisible)
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(x => x.r.width > 200 && x.r.height > 200)
      .sort((a, b) => (b.r.width * b.r.height) - (a.r.width * a.r.height));

    if (!candidates.length) return null;

    const pick = candidates[0];
    log(`Fallback pick: ${Math.round(pick.r.width)}x${Math.round(pick.r.height)} at (${Math.round(pick.r.left)},${Math.round(pick.r.top)})`);
    return pick.el;
  }

  // ---------- Download/share helpers ----------
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

  function downloadBlob(blob, filename) {
    // More reliable than data URLs, especially on mobile
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
        log('Shared via Web Share');
        return true;
      }
    } catch (e) {
      if (String(e && e.name) === 'AbortError') {
        log('Share canceled by user');
        return true;
      }
      log('Share failed; will fall back to download');
    }
    return false;
  }

  // ---------- Main ----------
  async function run() {
    log('Starting capture...');
    log('Location: ' + window.location.href);

    // Find container
    let container = findByAccText(CERT_CONTAINER_ACC_TEXT);
    if (container) {
      log('Found container by Accessibility text');
    } else {
      log('Could not find by Accessibility text. Trying fallback heuristic...');
      container = guessCertificateContainerFallback();
    }

    if (!container) {
      fail(
        'Could not find the certificate container in the published page.\n\n' +
        'Fix: Select "certificateArea" and set its Accessibility text to:\n' +
        CERT_CONTAINER_ACC_TEXT
      );
      return;
    }

    const vis = await waitForVisible(container, 2500);
    if (!vis) {
      fail('The certificate area is not visible yet. Click "Reveal" first, then click Share again.');
      return;
    }

    const rect = container.getBoundingClientRect();
    log(`Container rect: ${Math.round(rect.width)}x${Math.round(rect.height)}`);

    // Load html2canvas
    let h2c;
    try {
      h2c = await loadHtml2Canvas();
    } catch (e) {
      fail('html2canvas could not be loaded. If you are hosting on Vercel, confirm this page can load CDN scripts.', e);
      return;
    }

    // Capture
    let canvas;
    try {
      log('Capturing...');
      canvas = await h2c(container, {
        scale: CAPTURE_SCALE,
        backgroundColor: CAPTURE_BG,
        useCORS: true,
        allowTaint: false,
        logging: false
      });
      log(`Canvas: ${canvas.width}x${canvas.height}`);
    } catch (e) {
      fail(
        'Capture failed. Most common cause is CORS-tainted images/fonts.\n\n' +
        'Make sure all images are imported into Storyline (not externally hosted) and test again.',
        e
      );
      return;
    }

    // Export + download/share
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      fail('Could not convert capture to PNG blob.');
      return;
    }

    const shared = await tryShareFile(blob, FILE_NAME);
    if (!shared) {
      log('Downloading PNG...');
      downloadBlob(blob, FILE_NAME);
      log('Download triggered (if your browser allows it).');
    }

    log('Done.');
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

window.Script345 = function()
{
  /*
  Certificate capture + download/share (html2canvas loader, Storyline-safe)

  Slide: Certificate
  Trigger: Execute JavaScript when user clicks "Share" (button text: "Complete")

  IMPORTANT SETUP (Storyline):
  - Select the shape: certificateArea
  - Set its Accessibility text (Alt Text) to exactly:
      CERTIFICATE_CONTAINER

  What this does:
  - Loads html2canvas (once)
  - Finds the published DOM element for certificateArea (prefers Accessibility text)
  - Waits until it's visible (so user must click after Reveal)
  - Captures to canvas, downloads PNG
  - If supported, opens Web Share with the image file
*/

(function () {
  // =========================
  // 1) CONFIG
  // =========================
  const CERT_CONTAINER_ACC_TEXT = 'CERTIFICATE_CONTAINER';
  const FILE_NAME = 'SortSmart_Certificate.png';

  // Capture tuning
  const CAPTURE_SCALE = 2;          // 2 is usually crisp without huge memory
  const CAPTURE_BG = null;          // null preserves transparency; set '#FAF4B4' if you want solid

  // Share metadata
  const SHARE_TITLE = 'Sort Smart Aotearoa';
  const SHARE_TEXT = 'I completed Sort Smart Aotearoa — taking my first step to help keep Auckland beautiful.';

  // =========================
  // 2) html2canvas loader (once)
  // =========================
  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (typeof html2canvas !== 'undefined') {
        resolve(html2canvas);
        return;
      }

      if (window.__ss_html2canvasLoadingPromise) {
        window.__ss_html2canvasLoadingPromise.then(resolve).catch(reject);
        return;
      }

      window.__ss_html2canvasLoadingPromise = new Promise((res, rej) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.async = true;
        script.onload = () => {
          if (typeof html2canvas === 'undefined') rej(new Error('html2canvas loaded but is undefined'));
          else res(html2canvas);
        };
        script.onerror = () => rej(new Error('Failed to load html2canvas from CDN'));
        document.head.appendChild(script);
      });

      window.__ss_html2canvasLoadingPromise.then(resolve).catch(reject);
    });
  }

  // =========================
  // 3) Find certificateArea in published DOM
  // =========================
  function cssEscape(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ');
  }

  function findByAccText(label) {
    // Storyline commonly renders accessibility text to data-acc-text.
    // Some environments might map it to aria-label or title.
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

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    // If element is display:none or not in layout, rect will often be 0.
    // Also ensure it's within viewport-ish (Storyline player might scroll).
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

  // =========================
  // 4) Download + Share helpers
  // =========================
  function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      if (!canvas) return resolve(null);
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      } else {
        // Very old browsers fallback
        const dataUrl = canvas.toDataURL('image/png');
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        resolve(new Blob([ab], { type: 'image/png' }));
      }
    });
  }

  // =========================
  // 5) Main
  // =========================
  async function captureDownloadShare() {
    const container = findByAccText(CERT_CONTAINER_ACC_TEXT);

    if (!container) {
      alert(
        'I could not find the certificate container in the published page.\n\n' +
        'Fix: Select "certificateArea" and set its Accessibility text to:\n' +
        CERT_CONTAINER_ACC_TEXT
      );
      return;
    }

    // Ensure user clicked after Reveal (when certificateArea is actually on screen)
    const ok = await waitForVisible(container, 2500);
    if (!ok) {
      alert('The certificate is not visible yet. Click "Reveal" first, then click "Complete" again.');
      return;
    }

    const h2c = await loadHtml2Canvas();

    let canvas;
    try {
      canvas = await h2c(container, {
        scale: CAPTURE_SCALE,
        backgroundColor: CAPTURE_BG,
        useCORS: true,
        allowTaint: false,
        logging: false
      });
    } catch (e) {
      console.error('[Certificate capture] html2canvas failed:', e);
      alert(
        'Could not capture the certificate.\n\n' +
        'Most common cause: cross-origin (CORS) images/fonts tainting the canvas.\n' +
        'Ensure all images are imported into Storyline (not loaded from external URLs).'
      );
      return;
    }

    // Download
    try {
      const dataUrl = canvas.toDataURL('image/png');
      downloadDataUrl(dataUrl, FILE_NAME);
    } catch (e) {
      console.error('[Certificate capture] toDataURL failed:', e);
      alert('Capture worked but could not export as PNG. The canvas may be tainted by external media.');
      return;
    }

    // Share (optional)
    try {
      const blob = await canvasToBlob(canvas);
      if (!blob) return;

      const file = new File([blob], FILE_NAME, { type: 'image/png' });

      if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, files: [file] });
      }
    } catch (e) {
      // Ignore share errors/cancel
      console.warn('[Certificate capture] share not completed:', e);
    }
  }

  // Prevent double click races
  if (window.__ss_certCaptureBusy) return;
  window.__ss_certCaptureBusy = true;

  Promise.resolve()
    .then(captureDownloadShare)
    .finally(() => {
      setTimeout(() => {
        window.__ss_certCaptureBusy = false;
      }, 800);
    });
})();
}

};
