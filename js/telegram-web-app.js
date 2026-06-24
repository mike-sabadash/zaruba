/**
 * Telegram WebApp API — local mock for blocked environments
 * Provides the same interface as https://telegram.org/js/telegram-web-app.js
 * When running inside Telegram, the real script overrides this.
 */
(function () {
  if (window.Telegram && window.Telegram.WebApp) return; // real script already loaded

  var themeParams = {
    bg_color: '#0a0a0a',
    text_color: '#f5f5f5',
    hint_color: '#a0a0a0',
    link_color: '#818cf8',
    button_color: '#818cf8',
    button_text_color: '#ffffff',
    secondary_bg_color: '#141414',
  };

  var mainButton = {
    _text: '',
    _visible: false,
    _progress: false,
    _cb: null,
    setText: function (t) { this._text = t; },
    show: function () { this._visible = true; },
    hide: function () { this._visible = false; },
    enable: function () {},
    disable: function () {},
    showProgress: function () { this._progress = true; },
    hideProgress: function () { this._progress = false; },
    onClick: function (cb) { this._cb = cb; },
    offClick: function () { this._cb = null; },
  };

  var backButton = {
    _visible: false,
    _cb: null,
    show: function () { this._visible = true; },
    hide: function () { this._visible = false; },
    onClick: function (cb) { this._cb = cb; },
    offClick: function () { this._cb = null; },
  };

  var hapticFeedback = {
    impactOccurred: function () {},
    notificationOccurred: function () {},
    selectionChanged: function () {},
  };

  var cloudStorage = {
    getItem: function (key, cb) { cb(null, null); },
    setItem: function (key, value, cb) { cb(null); },
    removeItem: function (key, cb) { cb(null); },
    getKeys: function (cb) { cb(null, []); },
  };

  window.Telegram = {
    WebApp: {
      initData: '',
      initDataUnsafe: {
        user: null,
        chat_instance: null,
        chat_type: null,
        start_param: null,
        can_send_after: null,
      },
      version: '7.10',
      platform: 'unknown',
      colorScheme: 'dark',
      themeParams: themeParams,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      viewportStableHeight: window.innerHeight,
      isExpanded: true,
      headerColor: '#0a0a0a',
      backgroundColor: '#0a0a0a',
      ready: function () {},
      expand: function () {},
      close: function () {},
      MainButton: mainButton,
      BackButton: backButton,
      HapticFeedback: hapticFeedback,
      CloudStorage: cloudStorage,
      setHeaderColor: function () {},
      setBackgroundColor: function () {},
      openLink: function (url) { window.open(url, '_blank'); },
      openTelegramLink: function () {},
      shareMessage: function () {},
      switchInlineQuery: function () {},
      requestContact: function (cb) { cb(false); },
      requestWriteAccess: function (cb) { cb(false); },
    },
  };
})();
