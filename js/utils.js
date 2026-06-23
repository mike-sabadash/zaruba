(function () {
  window.zarubaQs = function () {
    var q = {};
    var s = window.location.search.slice(1);
    if (!s) return q;
    s.split("&").forEach(function (pair) {
      var i = pair.indexOf("=");
      if (i === -1) q[pair] = "";
      else q[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return q;
  };

  window.zarubaFormatDateTime = function (iso) {
    var d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  window.zarubaHaversineMeters = function (lat1, lon1, lat2, lon2) {
    var R = 6371000;
    function toRad(x) {
      return (x * Math.PI) / 180;
    }
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  window.zarubaNickClass = function (u) {
    if (!u || !u.cosmetics) return "text-zinc-900 dark:text-white";
    if (u.cosmetics.nickColor === "gold") return "text-amber-400";
    if (u.cosmetics.nickColor === "orange") return "text-zb-accent";
    return "text-zinc-900 dark:text-white";
  };

  window.zarubaSportLabel = function (sport) {
    return sport === "football_5" ? "Футбол 5×5" : "Баскет 3×3";
  };

  window.zarubaVibrate = function () {
    if (navigator.vibrate) navigator.vibrate(40);
  };
})();
