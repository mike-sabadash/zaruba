(function () {
  /**
   * Карта: основной режим — Яндекс (JavaScript API). Ключ в ZARUBA_YANDEX_API_KEY или
   * localStorage «zaruba_yandex_api_key» (удобно для теста без правки файла).
   *
   * Без ключа на главной показывается подсказка. Резерв — MapLibre + CARTO (тёмная/светлая схема).
   */
  window.ZARUBA_YANDEX_API_KEY = "e781b9fa-1f02-4b97-a01c-2b1bc20e101f";

  window.ZARUBA_MAP = {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a> © <a href="https://carto.com/attributions/" rel="noreferrer">CARTO</a>',
    tilesDark: [
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    ],
    tilesLight: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    ],
  };

  window.ZARUBA_MOCK_SMS_CODE = "123456";

  window.ZARUBA_POINTS = {
    WIN_PLAYER: 30,
    GOAL: 5,
    MVP: 25,
    FAN_PER_PLAYER: 5,
    CAPTAIN_WIN_BONUS: 20,
    CHECKIN: 10,
    DAILY_FANS_BONUS: 50,
    DAILY_FANS_TARGET: 3,
  };

  window.ZARUBA_SHOP_ITEMS = [
    {
      id: "nick_gold",
      title: "Золотой ник",
      description: "Цвет ника на карточках и в профиле",
      price: 300,
      type: "cosmetic",
      cosmeticKey: "nickColor",
      cosmeticValue: "gold",
    },
    {
      id: "nick_orange",
      title: "Огненный ник",
      description: "Оранжевый акцент",
      price: 300,
      type: "cosmetic",
      cosmeticKey: "nickColor",
      cosmeticValue: "orange",
    },
    {
      id: "frame_unique",
      title: "Рамка «Трафарет»",
      description: "Уникальная рамка аватара",
      price: 200,
      type: "cosmetic",
      cosmeticKey: "avatarFrame",
      cosmeticValue: "stencil",
    },
    {
      id: "ach_own_board",
      title: "Ачивка «Свой в доску»",
      description: "Значок в профиле",
      price: 150,
      type: "achievement",
      achievementId: "own_the_board",
    },
    {
      id: "sticker_pack",
      title: "Стикерпак «Заруба»",
      description: "Набор стикеров в чате",
      price: 250,
      type: "sticker",
    },
  ];

  window.zarubaCharismaStatus = function (totalCharisma) {
    if (totalCharisma >= 500) return "Уличный генерал";
    if (totalCharisma >= 200) return "Гроза района";
    return "Бродяга";
  };

  window.zarubaCharismaProgress = function (totalCharisma) {
    if (totalCharisma < 200) {
      return {
        current: totalCharisma,
        next: 200,
        pct: (totalCharisma / 200) * 100,
      };
    }
    if (totalCharisma < 500) {
      return {
        current: totalCharisma - 200,
        next: 300,
        pct: ((totalCharisma - 200) / 300) * 100,
      };
    }
    return { current: totalCharisma, next: totalCharisma, pct: 100 };
  };
})();
