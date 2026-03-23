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
  var player = GetPlayer();

var url = https://marceloaraya.framer.website/;

var text = "Check out Sort Smart Aotearoa — help keep Tāmaki Makaurau beautiful! ♻️ " + url;

// Use Web Share API if available (mobile)
if (navigator.share) {
    navigator.share({
        title: "Sort Smart Aotearoa",
        text: "I just played Sort Smart Aotearoa! Help keep Auckland beautiful.",
        url: url
    }).catch(function(err) {
        console.error("Share failed:", err);
        // Fallback to clipboard
        copyToClipboard(url);
    });
} else {
    // Fallback for desktop
    copyToClipboard(url);
}

// Helper function to copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        alert("Link copied to clipboard! You can now share it.");
    }).catch(function(err) {
        alert("Unable to copy. You can manually copy this link: " + text);
    });
}
}

window.Script344 = function()
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
