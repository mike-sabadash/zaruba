/**
 * SPA Router for Telegram Mini App
 * Hash-based routing, no page reloads
 */
(function () {
  var routes = {};
  var currentRoute = null;
  var container = null;

  window.Router = {
    init: function (rootId) {
      container = document.getElementById(rootId);
      window.addEventListener('hashchange', function () { Router.resolve(); });
      Router.resolve();
    },

    register: function (path, renderFn) {
      routes[path] = renderFn;
    },

    navigate: function (path) {
      window.location.hash = '#' + path;
    },

    resolve: function () {
      var hash = window.location.hash.slice(1) || '/';
      var parts = hash.split('?');
      var path = parts[0];
      var qs = Router.parseQs(parts[1] || '');

      if (!container) return;

      // Find matching route
      var renderFn = routes[path];
      if (!renderFn) {
        renderFn = routes['/'];
      }

      currentRoute = { path: path, qs: qs };

      // Show back button for sub-pages
      var subPages = ['/zaruba', '/judge', '/profile', '/shop'];
      var isSubPage = subPages.some(function (p) { return path.indexOf(p) === 0; });
      TMA.showBackButton(isSubPage);

      // Render
      renderFn(container, qs);
    },

    getCurrentRoute: function () {
      return currentRoute;
    },

    parseQs: function (str) {
      var q = {};
      if (!str) return q;
      str.split('&').forEach(function (pair) {
        var i = pair.indexOf('=');
        if (i === -1) q[decodeURIComponent(pair)] = '';
        else q[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
      });
      return q;
    },
  };

  // Back button handler
  TMA.onBackButton(function () {
    var hash = window.location.hash.slice(1) || '/';
    if (hash === '/') {
      TMA.close();
    } else {
      window.history.back();
    }
  });
})();
