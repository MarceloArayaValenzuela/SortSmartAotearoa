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
window.Script325 = function()
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

window.Script326 = function()
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

window.Script327 = function()
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

};
