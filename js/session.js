(function () {
  var KEY = "zaruba_user_id";

  window.ZarubaSession = {
    get: function () {
      return localStorage.getItem(KEY);
    },
    set: function (id) {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    },
    clear: function () {
      localStorage.removeItem(KEY);
    },
  };
})();
