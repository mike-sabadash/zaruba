/**
 * Telegram Mini App Integration Layer
 * Handles WebApp API, auth, navigation, haptics, theming
 */
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;

  // ─── Telegram API wrapper ────────────────────────────
  window.TMA = {
    ready: function () {
      if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#09090b');
        tg.setBackgroundColor('#09090b');
      }
    },

    // ─── User ─────────────────────────────────────────
    getUser: function () {
      if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) return null;
      var u = tg.initDataUnsafe.user;
      return {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name || '',
        username: u.username || '',
        photoUrl: u.photo_url || null,
        languageCode: u.languageCode || 'ru',
        isPremium: u.is_premium || false,
      };
    },

    getInitData: function () {
      return tg ? tg.initData : '';
    },

    // ─── Navigation ───────────────────────────────────
    showBackButton: function (show) {
      if (!tg) return;
      if (show) tg.BackButton.show();
      else tg.BackButton.hide();
    },

    onBackButton: function (cb) {
      if (!tg) return;
      tg.BackButton.onClick(cb);
    },

    // ─── Main Button (CTA) ────────────────────────────
    showMainButton: function (text, cb) {
      if (!tg) return;
      tg.MainButton.setText(text);
      tg.MainButton.show();
      tg.MainButton.enable();
      if (cb) tg.MainButton.onClick(cb);
    },

    hideMainButton: function () {
      if (tg) tg.MainButton.hide();
    },

    setMainButtonProgress: function (show) {
      if (tg) {
        if (show) tg.MainButton.showProgress();
        else tg.MainButton.hideProgress();
      }
    },

    // ─── Haptic Feedback ──────────────────────────────
    haptic: {
      impact: function (style) {
        if (tg) tg.HapticFeedback.impactOccurred(style || 'medium');
      },
      notification: function (type) {
        if (tg) tg.HapticFeedback.notificationOccurred(type || 'success');
      },
      selection: function () {
        if (tg) tg.HapticFeedback.selectionChanged();
      },
    },

    // ─── Theme ────────────────────────────────────────
    theme: function () {
      if (!tg) return { colorScheme: 'dark', params: {} };
      return {
        colorScheme: tg.colorScheme,
        params: tg.themeParams,
      };
    },

    isDark: function () {
      return tg ? tg.colorScheme === 'dark' : true;
    },

    // ─── Viewport ─────────────────────────────────────
    viewportHeight: function () {
      return tg ? tg.viewportHeight : window.innerHeight;
    },

    viewportWidth: function () {
      return tg ? tg.viewportWidth : window.innerWidth;
    },

    // ─── Cloud Storage ────────────────────────────────
    cloudGet: function (key) {
      return new Promise(function (resolve) {
        if (!tg) { resolve(localStorage.getItem('tma_' + key)); return; }
        tg.CloudStorage.getItem(key, function (err, value) {
          resolve(err ? null : value);
        });
      });
    },

    cloudSet: function (key, value) {
      return new Promise(function (resolve) {
        if (!tg) { localStorage.setItem('tma_' + key, value); resolve(true); return; }
        tg.CloudStorage.setItem(key, value, function (err) {
          resolve(!err);
        });
      });
    },

    // ─── Misc ─────────────────────────────────────────
    openLink: function (url) {
      if (tg) tg.openLink(url);
      else window.open(url, '_blank');
    },

    shareMessage: function (msgId) {
      if (tg) tg.shareMessage(msgId);
    },

    close: function () {
      if (tg) tg.close();
    },

    platform: function () {
      return tg ? tg.platform : 'unknown';
    },
  };
})();
