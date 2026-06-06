// ╔══════════════════════════════════════════════════════════╗
// ║         TAXITJ BOT — Такси Таджикистан                  ║
// ║   Клиент + Водитель + Админ в одном боте                ║
// ║   Файл: taxi_bot.js                                     ║
// ╚══════════════════════════════════════════════════════════╝
//
// КАК ЗАПУСТИТЬ:
// 1. Установи Node.js с сайта nodejs.org
// 2. Создай папку taxibot, положи этот файл туда
// 3. Открой терминал в этой папке
// 4. Напиши: pnm install node-telegram-bot-api
// 5. Замени YOUR_BOT_TOKEN ниже на токен от @BotFather
// 6. Замени ADMIN_TELEGRAM_ID на свой Telegram ID (узнай у @userinfobot)
// 7. Напиши: node taxi_bot.js

const TelegramBot = require('node-telegram-bot-api');

// ══════════════════════════════════════════════════════
// ⚙️  НАСТРОЙКИ — МЕНЯЙ ТОЛЬКО ЭТИ СТРОКИ
// ══════════════════════════════════════════════════════
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = 1132103047;             // ← вставь свой Telegram ID
const CURRENCY = 'TJS';                 // валюта
const BASE_PRICE = 5;                   // стартовая цена поездки
const PRICE_PER_KM = 2.5;              // цена за км
// ══════════════════════════════════════════════════════

const bot = new TelegramBot(TOKEN, { polling: true });

// ══════════════════════════════════════════════════════
// 🗄️  БАЗА ДАННЫХ (хранится в памяти, простой вариант)
//     Для сохранения между перезапусками — читай в конце файла
// ══════════════════════════════════════════════════════
const db = {
  users: {},       // { telegram_id: { name, phone, role, lang, rating, rides } }
  drivers: {},     // { telegram_id: { ...user, car, isOnline, currentRide } }
  rides: {},       // { rideId: { ...данные поездки } }
  waitingRides: [], // очередь заказов без водителя
  rideCounter: 1,
};

// ══════════════════════════════════════════════════════
// 🌍  ПЕРЕВОДЫ (ru / tg / en)
// ══════════════════════════════════════════════════════
const T = {
  ru: {
    welcome:      '👋 Добро пожаловать в *TaxiTJ*!\n\nТакси по всему Таджикистану 🇹🇯\n\nВыбери свою роль:',
    chooseRole:   'Кто ты?',
    iAmClient:    '🧍 Я пассажир',
    iAmDriver:    '🚖 Я водитель',
    askPhone:     '📱 Отправь свой номер телефона:',
    sharePhone:   '📲 Поделиться номером',
    askFrom:      '📍 Откуда едешь?\n\nНапиши адрес или район (например: *Проспект Рудаки, 37*)',
    askTo:        '🏁 Куда едешь?\n\nНапиши адрес или район',
    chooseTariff: '🚗 Выбери тариф:',
    economy:      '🚗 Эконом',
    comfort:      '🚙 Комфорт',
    business:     '🏎 Бизнес',
    orderCreated: (id, from, to, price) => `✅ *Заказ #${id} создан!*\n\n📍 Откуда: ${from}\n🏁 Куда: ${to}\n💰 Цена: ~${price} ${CURRENCY}\n\n⏳ Ищем водителя...`,
    noDrivers:    '😔 Водителей сейчас нет. Попробуй через несколько минут.',
    driverFound:  (name, car, phone, eta) => `🎉 *Водитель найден!*\n\n👨 ${name}\n🚗 ${car}\n📞 ${phone}\n⏱ Приедет через ~${eta} мин`,
    cancelRide:   '❌ Отменить поездку',
    rideCancelled:'❌ Поездка отменена',
    rideStarted:  '🚗 Поездка началась! Приятной дороги 😊',
    rideCompleted:'✅ Поездка завершена!\n\nОцени водителя:',
    rate1: '⭐ 1', rate2: '⭐⭐ 2', rate3: '⭐⭐⭐ 3', rate4: '⭐⭐⭐⭐ 4', rate5: '⭐⭐⭐⭐⭐ 5',
    thankRating:  '🙏 Спасибо за оценку!',
    mainMenu:     '🏠 Главное меню',
    orderTaxi:    '🚖 Заказать такси',
    myRides:      '📋 Мои поездки',
    myProfile:    '👤 Мой профиль',
    changeLang:   '🌐 Язык',
    // Водитель
    driverMenu:   '🚖 Меню водителя',
    goOnline:     '🟢 Выйти на линию',
    goOffline:    '🔴 Уйти с линии',
    nowOnline:    '🟢 Ты на линии! Ждём заказы...',
    nowOffline:   '🔴 Ты ушёл с линии',
    newOrder:     (id, from, to, price) => `🔔 *Новый заказ #${id}!*\n\n📍 Откуда: ${from}\n🏁 Куда: ${to}\n💰 Цена: ${price} ${CURRENCY}`,
    acceptRide:   '✅ Принять',
    declineRide:  '❌ Отказать',
    rideAccepted: '✅ Заказ принят! Едь к пассажиру.',
    arrivedBtn:   '📍 Я на месте',
    startRideBtn: '▶️ Начать поездку',
    endRideBtn:   '🏁 Завершить поездку',
    myEarnings:   '💰 Мой заработок',
    earnings:     (total, count) => `💰 *Заработок:*\n\nПоездок: ${count}\nОбщий заработок: ${total} ${CURRENCY}`,
    regCar:       '🚗 Какая у тебя машина?\n\nНапиши: *Марка, Цвет, Номер*\nПример: _Nexia 3, Белый, 01 AA 123 TJ_',
    driverReady:  (name, car) => `✅ *Ты зарегистрирован как водитель!*\n\n👨 ${name}\n🚗 ${car}\n\nМожешь выходить на линию!`,
    // Админ
    adminMenu:    '⚙️ Панель администратора',
    adminStats:   '📊 Статистика',
    adminDrivers: '🚖 Водители',
    adminRides:   '📋 Все поездки',
    adminBroadcast:'📢 Рассылка',
    stats:        (users, drivers, rides, active) => `📊 *Статистика TaxiTJ*\n\n👥 Пользователей: ${users}\n🚖 Водителей: ${drivers}\n📋 Всего поездок: ${rides}\n🟢 Активных поездок: ${active}`,
    noRides:      '📋 Поездок ещё нет',
    profile:      (name, phone, rides, rating) => `👤 *Профиль*\n\n👨 ${name}\n📞 ${phone}\n🚖 Поездок: ${rides}\n⭐ Рейтинг: ${rating}`,
  },
  tg: {
    welcome:      '👋 Хуш омадед ба *TaxiTJ*!\n\nТаксӣ дар тамоми Тоҷикистон 🇹🇯\n\nНақши худро интихоб кунед:',
    chooseRole:   'Шумо кӣ ҳастед?',
    iAmClient:    '🧍 Ман мусофир',
    iAmDriver:    '🚖 Ман ронанда',
    askPhone:     '📱 Рақами телефони худро фиристед:',
    sharePhone:   '📲 Рақамро мубодила кунед',
    askFrom:      '📍 Аз куҷо меравед?\n\nМанзилро нависед',
    askTo:        '🏁 Ба куҷо меравед?\n\nМанзилро нависед',
    chooseTariff: '🚗 Тарифро интихоб кунед:',
    economy:      '🚗 Иқтисодӣ',
    comfort:      '🚙 Кофур',
    business:     '🏎 Бизнес',
    orderCreated: (id, from, to, price) => `✅ *Фармоиш #${id} қабул шуд!*\n\n📍 Аз: ${from}\n🏁 Ба: ${to}\n💰 Нарх: ~${price} ${CURRENCY}\n\n⏳ Ронанда меҷӯем...`,
    noDrivers:    '😔 Ҳоло ронанда нест. Каме дертар кӯшиш кунед.',
    driverFound:  (name, car, phone, eta) => `🎉 *Ронанда ёфт шуд!*\n\n👨 ${name}\n🚗 ${car}\n📞 ${phone}\n⏱ Тақрибан ${eta} дақиқа`,
    cancelRide:   '❌ Бекор кардан',
    rideCancelled:'❌ Сафар бекор шуд',
    rideStarted:  '🚗 Сафар оғоз шуд! Роҳи хуш 😊',
    rideCompleted:'✅ Сафар тамом шуд!\n\nРонандаро баҳо диҳед:',
    rate1:'⭐ 1',rate2:'⭐⭐ 2',rate3:'⭐⭐⭐ 3',rate4:'⭐⭐⭐⭐ 4',rate5:'⭐⭐⭐⭐⭐ 5',
    thankRating:  '🙏 Ташаккур!',
    mainMenu:     '🏠 Менюи асосӣ',
    orderTaxi:    '🚖 Таксӣ фармоиш диҳед',
    myRides:      '📋 Сафарҳои ман',
    myProfile:    '👤 Профили ман',
    changeLang:   '🌐 Забон',
    driverMenu:   '🚖 Менюи ронанда',
    goOnline:     '🟢 Ба хат баромадан',
    goOffline:    '🔴 Аз хат рафтан',
    nowOnline:    '🟢 Шумо дар хат ҳастед!',
    nowOffline:   '🔴 Шумо аз хат рафтед',
    newOrder:     (id, from, to, price) => `🔔 *Фармоиши нав #${id}!*\n\n📍 Аз: ${from}\n🏁 Ба: ${to}\n💰 Нарх: ${price} ${CURRENCY}`,
    acceptRide:   '✅ Қабул кардан',
    declineRide:  '❌ Рад кардан',
    rideAccepted: '✅ Фармоиш қабул шуд!',
    arrivedBtn:   '📍 Ман омадам',
    startRideBtn: '▶️ Оғоз кардан',
    endRideBtn:   '🏁 Тамом кардан',
    myEarnings:   '💰 Даромади ман',
    earnings:     (total, count) => `💰 *Даромад:*\n\nСафарҳо: ${count}\nУмумӣ: ${total} ${CURRENCY}`,
    regCar:       '🚗 Мошини шумо чӣ?\n\nНависед: *Марка, Ранг, Рақам*',
    driverReady:  (name, car) => `✅ *Шумо ҳамчун ронанда бақайд гирифта шудед!*\n\n👨 ${name}\n🚗 ${car}`,
    adminMenu:    '⚙️ Панели маъмур',
    adminStats:   '📊 Омор',
    adminDrivers: '🚖 Ронандагон',
    adminRides:   '📋 Ҳамаи сафарҳо',
    adminBroadcast:'📢 Паём фиристодан',
    stats:        (users, drivers, rides, active) => `📊 *Омори TaxiTJ*\n\n👥 Корбарон: ${users}\n🚖 Ронандагон: ${drivers}\n📋 Сафарҳо: ${rides}\n🟢 Фаъол: ${active}`,
    noRides:      '📋 Ҳанӯз сафаре нест',
    profile:      (name, phone, rides, rating) => `👤 *Профил*\n\n👨 ${name}\n📞 ${phone}\n🚖 Сафарҳо: ${rides}\n⭐ Рейтинг: ${rating}`,
  },
  en: {
    welcome:      '👋 Welcome to *TaxiTJ*!\n\nTaxi across Tajikistan 🇹🇯\n\nChoose your role:',
    chooseRole:   'Who are you?',
    iAmClient:    '🧍 I\'m a passenger',
    iAmDriver:    '🚖 I\'m a driver',
    askPhone:     '📱 Send your phone number:',
    sharePhone:   '📲 Share phone number',
    askFrom:      '📍 Where are you going from?\n\nType address or area',
    askTo:        '🏁 Where are you going to?\n\nType address or area',
    chooseTariff: '🚗 Choose tariff:',
    economy:      '🚗 Economy',
    comfort:      '🚙 Comfort',
    business:     '🏎 Business',
    orderCreated: (id, from, to, price) => `✅ *Order #${id} created!*\n\n📍 From: ${from}\n🏁 To: ${to}\n💰 Price: ~${price} ${CURRENCY}\n\n⏳ Looking for driver...`,
    noDrivers:    '😔 No drivers available. Try again in a few minutes.',
    driverFound:  (name, car, phone, eta) => `🎉 *Driver found!*\n\n👨 ${name}\n🚗 ${car}\n📞 ${phone}\n⏱ ~${eta} min away`,
    cancelRide:   '❌ Cancel ride',
    rideCancelled:'❌ Ride cancelled',
    rideStarted:  '🚗 Ride started! Have a nice trip 😊',
    rideCompleted:'✅ Ride completed!\n\nRate your driver:',
    rate1:'⭐ 1',rate2:'⭐⭐ 2',rate3:'⭐⭐⭐ 3',rate4:'⭐⭐⭐⭐ 4',rate5:'⭐⭐⭐⭐⭐ 5',
    thankRating:  '🙏 Thanks for rating!',
    mainMenu:     '🏠 Main menu',
    orderTaxi:    '🚖 Order taxi',
    myRides:      '📋 My rides',
    myProfile:    '👤 My profile',
    changeLang:   '🌐 Language',
    driverMenu:   '🚖 Driver menu',
    goOnline:     '🟢 Go online',
    goOffline:    '🔴 Go offline',
    nowOnline:    '🟢 You are online! Waiting for orders...',
    nowOffline:   '🔴 You went offline',
    newOrder:     (id, from, to, price) => `🔔 *New order #${id}!*\n\n📍 From: ${from}\n🏁 To: ${to}\n💰 Price: ${price} ${CURRENCY}`,
    acceptRide:   '✅ Accept',
    declineRide:  '❌ Decline',
    rideAccepted: '✅ Order accepted! Go to passenger.',
    arrivedBtn:   '📍 I\'ve arrived',
    startRideBtn: '▶️ Start ride',
    endRideBtn:   '🏁 End ride',
    myEarnings:   '💰 My earnings',
    earnings:     (total, count) => `💰 *Earnings:*\n\nRides: ${count}\nTotal: ${total} ${CURRENCY}`,
    regCar:       '🚗 What\'s your car?\n\nType: *Model, Color, Plate*\nExample: _Nexia 3, White, 01 AA 123 TJ_',
    driverReady:  (name, car) => `✅ *You are registered as a driver!*\n\n👨 ${name}\n🚗 ${car}`,
    adminMenu:    '⚙️ Admin panel',
    adminStats:   '📊 Statistics',
    adminDrivers: '🚖 Drivers',
    adminRides:   '📋 All rides',
    adminBroadcast:'📢 Broadcast',
    stats:        (users, drivers, rides, active) => `📊 *TaxiTJ Statistics*\n\n👥 Users: ${users}\n🚖 Drivers: ${drivers}\n📋 Total rides: ${rides}\n🟢 Active: ${active}`,
    noRides:      '📋 No rides yet',
    profile:      (name, phone, rides, rating) => `👤 *Profile*\n\n👨 ${name}\n📞 ${phone}\n🚖 Rides: ${rides}\n⭐ Rating: ${rating}`,
  }
};

// Вспомогательные функции
function getLang(id) {
  return (db.users[id] && db.users[id].lang) || 'ru';
}
function t(id, key, ...args) {
  const lang = getLang(id);
  const val = T[lang][key];
  return typeof val === 'function' ? val(...args) : val;
}
function getUser(id) { return db.users[id]; }
function isAdmin(id) { return Number(id) === Number(ADMIN_ID); }
function isDriver(id) { return db.drivers[id] !== undefined; }
function genId() { return db.rideCounter++; }
function calcPrice(tariff) {
  const dist = Math.floor(Math.random() * 8) + 3; // 3–10 км
  const mult = tariff === 'economy' ? 1 : tariff === 'comfort' ? 1.5 : 2.2;
  return Math.round((BASE_PRICE + dist * PRICE_PER_KM) * mult);
}

// Состояния для диалогов
const state = {}; // { userId: { step, data } }
function setState(id, step, data = {}) { state[id] = { step, data }; }
function clearState(id) { delete state[id]; }

// ══════════════════════════════════════════════════════
// 📨  ОТПРАВКА СООБЩЕНИЙ — вспомогательные функции
// ══════════════════════════════════════════════════════

// Главное меню клиента
function sendClientMenu(chatId) {
  const l = getLang(chatId);
  bot.sendMessage(chatId, T[l].mainMenu, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: T[l].orderTaxi }],
        [{ text: T[l].myRides }, { text: T[l].myProfile }],
        [{ text: T[l].changeLang }],
      ],
      resize_keyboard: true,
    }
  });
}

// Главное меню водителя
function sendDriverMenu(chatId) {
  const l = getLang(chatId);
  const driver = db.drivers[chatId];
  const statusBtn = driver && driver.isOnline ? T[l].goOffline : T[l].goOnline;
  bot.sendMessage(chatId, T[l].driverMenu, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: statusBtn }],
        [{ text: T[l].myEarnings }, { text: T[l].myProfile }],
        [{ text: T[l].changeLang }],
      ],
      resize_keyboard: true,
    }
  });
}

// Главное меню админа
function sendAdminMenu(chatId) {
  bot.sendMessage(chatId, T[getLang(chatId)].adminMenu, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '📊 Статистика' }, { text: '🚖 Водители' }],
        [{ text: '📋 Все поездки' }, { text: '📢 Рассылка' }],
        [{ text: '🌐 Язык' }],
      ],
      resize_keyboard: true,
    }
  });
}

// Кнопки выбора языка
function sendLangMenu(chatId) {
  bot.sendMessage(chatId, '🌐 Выбери язык / Забонро интихоб кун / Choose language:', {
    reply_markup: {
      inline_keyboard: [[
        { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
        { text: '🇹🇯 Тоҷикӣ', callback_data: 'lang_tg' },
        { text: '🇬🇧 English', callback_data: 'lang_en' },
      ]]
    }
  });
}

// Уведомить всех онлайн-водителей о новом заказе
function notifyDrivers(ride) {
  const onlineDrivers = Object.values(db.drivers).filter(d => d.isOnline && !d.currentRide);
  if (onlineDrivers.length === 0) return false;
  onlineDrivers.forEach(driver => {
    const l = getLang(driver.id);
    bot.sendMessage(driver.id, T[l].newOrder(ride.id, ride.from, ride.to, ride.price), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: T[l].acceptRide, callback_data: `accept_${ride.id}` },
          { text: T[l].declineRide, callback_data: `decline_${ride.id}` },
        ]]
      }
    });
  });
  return true;
}

// ══════════════════════════════════════════════════════
// 🤖  КОМАНДА /start
// ══════════════════════════════════════════════════════
bot.onText(/\/start/, (msg) => {
  const id = msg.chat.id;
  const name = msg.from.first_name || 'Друг';

  // Если уже зарегистрирован
  if (db.users[id]) {
    if (isAdmin(id)) return sendAdminMenu(id);
    if (isDriver(id)) return sendDriverMenu(id);
    return sendClientMenu(id);
  }

  // Сохраняем базовые данные
  db.users[id] = { id, name, lang: 'ru', role: 'client', rides: 0, rating: 5.0 };

  // Если это админ
  if (isAdmin(id)) {
    db.users[id].role = 'admin';
    bot.sendMessage(id, `👋 Привет, *${name}*! Ты администратор.`, { parse_mode: 'Markdown' });
    return sendAdminMenu(id);
  }

  // Выбор роли для нового пользователя
  const l = getLang(id);
  bot.sendMessage(id, T[l].welcome, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: T[l].iAmClient, callback_data: 'role_client' },
        { text: T[l].iAmDriver, callback_data: 'role_driver' },
      ]]
    }
  });
});

// ══════════════════════════════════════════════════════
// 📩  ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
// ══════════════════════════════════════════════════════
bot.on('message', (msg) => {
  if (!msg.text && !msg.contact) return;
  const id = msg.chat.id;
  const text = msg.text || '';
  const l = getLang(id);
  const user = getUser(id);

  if (!user) return; // ещё не запустил /start

  // ── ОБРАБОТКА СОСТОЯНИЙ (многошаговые диалоги) ──
  if (state[id]) {
    const { step, data } = state[id];

    // Шаг: ввод номера телефона
    if (step === 'ask_phone') {
      const phone = msg.contact ? msg.contact.phone_number : text;
      db.users[id].phone = phone;
      if (data.role === 'driver') {
        setState(id, 'ask_car');
        bot.sendMessage(id, t(id, 'regCar'), { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } });
      } else {
        clearState(id);
        sendClientMenu(id);
      }
      return;
    }

    // Шаг: ввод машины (для водителя)
    if (step === 'ask_car') {
      db.users[id].role = 'driver';
      db.drivers[id] = { ...db.users[id], car: text, isOnline: false, currentRide: null, earnings: 0, completedRides: 0 };
      clearState(id);
      bot.sendMessage(id, t(id, 'driverReady', user.name, text), { parse_mode: 'Markdown' });
      sendDriverMenu(id);
      // Уведомить админа
      bot.sendMessage(ADMIN_ID, `🚖 Новый водитель!\n👨 ${user.name}\n🚗 ${text}\n📞 ${db.users[id].phone || 'не указан'}`);
      return;
    }

    // Шаг: ввод откуда
    if (step === 'ask_from') {
      setState(id, 'ask_to', { from: text });
      bot.sendMessage(id, t(id, 'askTo'), { parse_mode: 'Markdown' });
      return;
    }

    // Шаг: ввод куда
    if (step === 'ask_to') {
      setState(id, 'choose_tariff', { from: data.from, to: text });
      bot.sendMessage(id, t(id, 'chooseTariff'), {
        reply_markup: {
          inline_keyboard: [
            [{ text: t(id, 'economy') + ' (~' + calcPrice('economy') + ' ' + CURRENCY + ')', callback_data: 'tariff_economy' }],
            [{ text: t(id, 'comfort') + ' (~' + calcPrice('comfort') + ' ' + CURRENCY + ')', callback_data: 'tariff_comfort' }],
            [{ text: t(id, 'business') + ' (~' + calcPrice('business') + ' ' + CURRENCY + ')', callback_data: 'tariff_business' }],
          ]
        }
      });
      return;
    }

    // Шаг: рассылка (только для админа)
    if (step === 'broadcast' && isAdmin(id)) {
      const allUsers = Object.keys(db.users);
      let sent = 0;
      allUsers.forEach(uid => {
        try {
          bot.sendMessage(uid, `📢 *Сообщение от TaxiTJ:*\n\n${text}`, { parse_mode: 'Markdown' });
          sent++;
        } catch(e) {}
      });
      clearState(id);
      bot.sendMessage(id, `✅ Рассылка отправлена ${sent} пользователям`);
      return;
    }
  }

  // ── КНОПКИ МЕНЮ ──────────────────────────────────

  // ЗАКАЗАТЬ ТАКСИ
  if (text === T[l].orderTaxi || text === T['ru'].orderTaxi || text === T['tg'].orderTaxi || text === T['en'].orderTaxi) {
    setState(id, 'ask_from');
    bot.sendMessage(id, t(id, 'askFrom'), { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } });
    return;
  }

  // ОНЛАЙН / ОФФЛАЙН (водитель)
  if (isDriver(id)) {
    if (text === T[l].goOnline || text === T['ru'].goOnline || text === T['tg'].goOnline || text === T['en'].goOnline) {
      db.drivers[id].isOnline = true;
      bot.sendMessage(id, t(id, 'nowOnline'), { parse_mode: 'Markdown' });
      sendDriverMenu(id);
      // Если есть ожидающие заказы — отправить водителю
      if (db.waitingRides.length > 0) {
        const ride = db.waitingRides[0];
        notifyDrivers(ride);
      }
      return;
    }
    if (text === T[l].goOffline || text === T['ru'].goOffline || text === T['tg'].goOffline || text === T['en'].goOffline) {
      db.drivers[id].isOnline = false;
      bot.sendMessage(id, t(id, 'nowOffline'));
      sendDriverMenu(id);
      return;
    }
    if (text === T[l].myEarnings || text === T['ru'].myEarnings) {
      const d = db.drivers[id];
      bot.sendMessage(id, t(id, 'earnings', d.earnings || 0, d.completedRides || 0), { parse_mode: 'Markdown' });
      return;
    }
  }

  // МОИ ПОЕЗДКИ (клиент)
  if (text === T[l].myRides || text === T['ru'].myRides) {
    const userRides = Object.values(db.rides).filter(r => r.clientId === id);
    if (userRides.length === 0) {
      bot.sendMessage(id, t(id, 'noRides'));
    } else {
      const list = userRides.slice(-5).map(r =>
        `#${r.id} | ${r.from} → ${r.to} | ${r.price} ${CURRENCY} | ${r.status}`
      ).join('\n');
      bot.sendMessage(id, `📋 *Последние поездки:*\n\n${list}`, { parse_mode: 'Markdown' });
    }
    return;
  }

  // МОЙ ПРОФИЛЬ
  if (text === T[l].myProfile || text === T['ru'].myProfile || text === T[l].profile || text === '👤 Мой профиль') {
    const u = db.users[id];
    bot.sendMessage(id, t(id, 'profile', u.name, u.phone || '—', u.rides || 0, u.rating || 5.0), { parse_mode: 'Markdown' });
    return;
  }

  // ЯЗЫК
  if (text === T[l].changeLang || text === '🌐 Язык' || text === '🌐 Забон' || text === '🌐 Language') {
    sendLangMenu(id);
    return;
  }

  // ── ADMIN МЕНЮ ───────────────────────────────────
  if (isAdmin(id)) {
    if (text === '📊 Статистика') {
      const activeRides = Object.values(db.rides).filter(r => r.status === 'active' || r.status === 'searching').length;
      bot.sendMessage(id, T[getLang(id)].stats(
        Object.keys(db.users).length,
        Object.keys(db.drivers).length,
        Object.keys(db.rides).length,
        activeRides
      ), { parse_mode: 'Markdown' });
      return;
    }
    if (text === '🚖 Водители') {
      const list = Object.values(db.drivers).map(d =>
        `${d.isOnline ? '🟢' : '🔴'} ${d.name} | ${d.car} | поездок: ${d.completedRides || 0}`
      ).join('\n');
      bot.sendMessage(id, list || 'Водителей нет', { parse_mode: 'Markdown' });
      return;
    }
    if (text === '📋 Все поездки') {
      const all = Object.values(db.rides).slice(-10);
      if (all.length === 0) { bot.sendMessage(id, 'Поездок нет'); return; }
      const list = all.map(r => `#${r.id} ${r.from}→${r.to} ${r.price}${CURRENCY} [${r.status}]`).join('\n');
      bot.sendMessage(id, `📋 Последние 10 поездок:\n\n${list}`);
      return;
    }
    if (text === '📢 Рассылка') {
      setState(id, 'broadcast');
      bot.sendMessage(id, '📢 Напиши текст рассылки:', { reply_markup: { remove_keyboard: true } });
      return;
    }
  }
});

// Контакт (телефон)
bot.on('contact', (msg) => {
  const id = msg.chat.id;
  if (state[id] && state[id].step === 'ask_phone') {
    const phone = msg.contact.phone_number;
    db.users[id].phone = phone;
    const { data } = state[id];
    if (data && data.role === 'driver') {
      setState(id, 'ask_car');
      bot.sendMessage(id, t(id, 'regCar'), { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } });
    } else {
      clearState(id);
      sendClientMenu(id);
    }
  }
});

// ══════════════════════════════════════════════════════
// 🔘  ОБРАБОТКА КНОПОК (callback_query)
// ══════════════════════════════════════════════════════
bot.on('callback_query', (query) => {
  const id = query.from.id;
  const data = query.data;
  const l = getLang(id);

  bot.answerCallbackQuery(query.id);

  // ВЫБОР ЯЗЫКА
  if (data.startsWith('lang_')) {
    const lang = data.replace('lang_', '');
    db.users[id].lang = lang;
    bot.sendMessage(id, lang === 'ru' ? '✅ Язык изменён на Русский' : lang === 'tg' ? '✅ Забон иваз шуд' : '✅ Language changed to English');
    if (isAdmin(id)) sendAdminMenu(id);
    else if (isDriver(id)) sendDriverMenu(id);
    else sendClientMenu(id);
    return;
  }

  // ВЫБОР РОЛИ
  if (data === 'role_client') {
    db.users[id].role = 'client';
    setState(id, 'ask_phone', { role: 'client' });
    bot.sendMessage(id, t(id, 'askPhone'), {
      reply_markup: {
        keyboard: [[{ text: t(id, 'sharePhone'), request_contact: true }]],
        resize_keyboard: true, one_time_keyboard: true
      }
    });
    return;
  }

  if (data === 'role_driver') {
    db.users[id].role = 'driver';
    setState(id, 'ask_phone', { role: 'driver' });
    bot.sendMessage(id, t(id, 'askPhone'), {
      reply_markup: {
        keyboard: [[{ text: t(id, 'sharePhone'), request_contact: true }]],
        resize_keyboard: true, one_time_keyboard: true
      }
    });
    return;
  }

  // ВЫБОР ТАРИФА
  if (data.startsWith('tariff_') && state[id] && state[id].step === 'choose_tariff') {
    const tariff = data.replace('tariff_', '');
    const { from, to } = state[id].data;
    const price = calcPrice(tariff);
    const rideId = genId();

    const ride = {
      id: rideId,
      clientId: id,
      driverId: null,
      from, to, tariff, price,
      status: 'searching',
      createdAt: new Date().toISOString(),
    };
    db.rides[rideId] = ride;
    db.users[id].rides = (db.users[id].rides || 0) + 1;
    clearState(id);

    bot.sendMessage(id, t(id, 'orderCreated', rideId, from, to, price), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: t(id, 'cancelRide'), callback_data: `cancel_${rideId}` }]]
      }
    });

    // Поиск водителя
    const found = notifyDrivers(ride);
    if (!found) {
      db.waitingRides.push(ride);
      bot.sendMessage(id, t(id, 'noDrivers'));
    }
    return;
  }

  // ВОДИТЕЛЬ ПРИНЯЛ ЗАКАЗ
  if (data.startsWith('accept_')) {
    const rideId = parseInt(data.replace('accept_', ''));
    const ride = db.rides[rideId];
    if (!ride || ride.status !== 'searching') {
      bot.sendMessage(id, '❌ Заказ уже взят или отменён');
      return;
    }

    ride.status = 'accepted';
    ride.driverId = id;
    db.drivers[id].currentRide = rideId;

    const driver = db.drivers[id];
    const eta = Math.floor(Math.random() * 7) + 2; // 2–8 мин

    // Уведомить пассажира
    const cl = getLang(ride.clientId);
    bot.sendMessage(ride.clientId,
      T[cl].driverFound(driver.name, driver.car, driver.phone || '—', eta),
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: T[cl].cancelRide, callback_data: `cancel_${rideId}` }]]
        }
      }
    );

    // Меню для водителя
    bot.sendMessage(id, t(id, 'rideAccepted'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: t(id, 'arrivedBtn'), callback_data: `arrived_${rideId}` }]
        ]
      }
    });

    // Убрать заказ из очереди ожидающих
    db.waitingRides = db.waitingRides.filter(r => r.id !== rideId);
    return;
  }

  // ВОДИТЕЛЬ НА МЕСТЕ
  if (data.startsWith('arrived_')) {
    const rideId = parseInt(data.replace('arrived_', ''));
    const ride = db.rides[rideId];
    if (!ride) return;

    const cl = getLang(ride.clientId);
    bot.sendMessage(ride.clientId, `📍 Водитель прибыл! Выходи.`);
    bot.sendMessage(id, '✅ Пассажир уведомлён', {
      reply_markup: {
        inline_keyboard: [[{ text: t(id, 'startRideBtn'), callback_data: `start_${rideId}` }]]
      }
    });
    return;
  }

  // НАЧАЛО ПОЕЗДКИ
  if (data.startsWith('start_')) {
    const rideId = parseInt(data.replace('start_', ''));
    const ride = db.rides[rideId];
    if (!ride) return;

    ride.status = 'active';
    const cl = getLang(ride.clientId);
    bot.sendMessage(ride.clientId, T[cl].rideStarted);
    bot.sendMessage(id, '🚗 Поездка начата!', {
      reply_markup: {
        inline_keyboard: [[{ text: t(id, 'endRideBtn'), callback_data: `end_${rideId}` }]]
      }
    });
    return;
  }

  // ЗАВЕРШЕНИЕ ПОЕЗДКИ
  if (data.startsWith('end_')) {
    const rideId = parseInt(data.replace('end_', ''));
    const ride = db.rides[rideId];
    if (!ride) return;

    ride.status = 'completed';
    db.drivers[id].currentRide = null;
    db.drivers[id].earnings = (db.drivers[id].earnings || 0) + ride.price;
    db.drivers[id].completedRides = (db.drivers[id].completedRides || 0) + 1;

    // Попросить пассажира оценить
    const cl = getLang(ride.clientId);
    bot.sendMessage(ride.clientId, T[cl].rideCompleted, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: T[cl].rate1, callback_data: `rate_${rideId}_1` },
          { text: T[cl].rate2, callback_data: `rate_${rideId}_2` },
          { text: T[cl].rate3, callback_data: `rate_${rideId}_3` },
          { text: T[cl].rate4, callback_data: `rate_${rideId}_4` },
          { text: T[cl].rate5, callback_data: `rate_${rideId}_5` },
        ]]
      }
    });

    bot.sendMessage(id, `✅ Поездка завершена!\n💰 Заработок: +${ride.price} ${CURRENCY}`);
    sendDriverMenu(id);
    return;
  }

  // ОЦЕНКА ПОЕЗДКИ
  if (data.startsWith('rate_')) {
    const [, rideId, stars] = data.split('_');
    const ride = db.rides[rideId];
    if (ride && ride.driverId) {
      // Обновляем рейтинг водителя
      const driver = db.drivers[ride.driverId];
      if (driver) {
        const count = driver.completedRides || 1;
        driver.rating = ((driver.rating || 5) * (count - 1) + parseInt(stars)) / count;
        driver.rating = Math.round(driver.rating * 10) / 10;
      }
    }
    bot.sendMessage(id, t(id, 'thankRating'));
    sendClientMenu(id);
    return;
  }

  // ОТМЕНА ПОЕЗДКИ
  if (data.startsWith('cancel_')) {
    const rideId = parseInt(data.replace('cancel_', ''));
    const ride = db.rides[rideId];
    if (!ride) return;

    ride.status = 'cancelled';

    // Если был водитель — уведомить
    if (ride.driverId) {
      db.drivers[ride.driverId].currentRide = null;
      bot.sendMessage(ride.driverId, '❌ Пассажир отменил поездку');
      sendDriverMenu(ride.driverId);
    }

    bot.sendMessage(id, t(id, 'rideCancelled'));

    if (isDriver(id)) sendDriverMenu(id);
    else sendClientMenu(id);
    return;
  }

  // ВОДИТЕЛЬ ОТКАЗАЛ
  if (data.startsWith('decline_')) {
    bot.sendMessage(id, '↩️ Заказ пропущен');
    return;
  }
});

// ══════════════════════════════════════════════════════
// 🚀  ЗАПУСК
// ══════════════════════════════════════════════════════
console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║     🚖 TaxiTJ Bot запущен!           ║');
console.log('╚══════════════════════════════════════╝');
console.log('');
console.log('✅ Бот работает. Нажми Ctrl+C для остановки.');
console.log('');

bot.on('polling_error', (err) => {
  console.error('❌ Ошибка:', err.message);
  if (err.message.includes('401')) {
    console.error('⚠️  Неверный токен! Проверь TOKEN в начале файла.');
  }
});

// ══════════════════════════════════════════════════════
// 💾  СОХРАНЕНИЕ ДАННЫХ В ФАЙЛ (раскомментируй чтобы включить)
// ══════════════════════════════════════════════════════
/*
const fs = require('fs');
const DB_FILE = './data.json';

// Загрузить при старте
if (fs.existsSync(DB_FILE)) {
  const saved = JSON.parse(fs.readFileSync(DB_FILE));
  Object.assign(db, saved);
  console.log('💾 База данных загружена из файла');
}

// Сохранять каждые 30 секунд
setInterval(() => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}, 30000);

// Сохранить при выходе
process.on('SIGINT', () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log('\n💾 База сохранена. Пока!');
  process.exit(0);
});
*/
