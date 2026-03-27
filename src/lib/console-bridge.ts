/**
 * Console bridge script content.
 * Injected into generated apps to capture browser console output
 * and send it to the parent window via postMessage.
 */
export const CONSOLE_BRIDGE_SCRIPT = `
(function() {
  if (window.__consoleBridgeInstalled) return;
  window.__consoleBridgeInstalled = true;

  var levels = ['log', 'info', 'warn', 'error', 'debug'];
  var original = {};

  levels.forEach(function(level) {
    original[level] = console[level];
    console[level] = function() {
      var args = Array.prototype.slice.call(arguments);
      var message = args.map(function(a) {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch(e) { return String(a); }
      }).join(' ');

      try {
        window.parent.postMessage({
          type: '__CONSOLE_BRIDGE__',
          level: level,
          message: message,
          timestamp: Date.now()
        }, '*');
      } catch(e) {}

      original[level].apply(console, arguments);
    };
  });

  // Capture uncaught errors
  window.addEventListener('error', function(e) {
    try {
      window.parent.postMessage({
        type: '__CONSOLE_BRIDGE__',
        level: 'error',
        message: e.message + ' at ' + e.filename + ':' + e.lineno + ':' + e.colno,
        timestamp: Date.now()
      }, '*');
    } catch(ex) {}
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    try {
      var reason = e.reason;
      var message = reason instanceof Error ? reason.message : String(reason);
      window.parent.postMessage({
        type: '__CONSOLE_BRIDGE__',
        level: 'error',
        message: 'Unhandled Promise Rejection: ' + message,
        timestamp: Date.now()
      }, '*');
    } catch(ex) {}
  });
})();
`;
