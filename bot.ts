process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Bot, Keyboard } from '@maxhub/max-bot-api';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

dotenv.config();

// 1. Инициализация базы данных
async function initDB() {
  const db = await open({
    filename: './bot.db',
    driver: sqlite3.Database,
  });

  // Создаём таблицу, если её нет
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      first_seen TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

// 2. Создаём бота
const bot = new Bot(process.env.BOT_TOKEN!);
const db = await initDB();

// 3. Создаём клавиатуру ОДИН РАЗ (глобально)
const mainKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.link(
      '📍 Узнать адрес ближайшего укрытия',
      'https://maps29.ru/orbismap/public_map/geoportal29/shelt_population_shelter_locations/#/map/39.806865,64.549972/15/10979'
    ),
  ],
  [
    Keyboard.button.link(
      '📝 Уточнить информацию или задать вопрос',
      'https://pos.gosuslugi.ru/form/?opaId=277439&utm_source=vk&utm_mediu%20m=11&utm_campaign=1052901000811'
    ),
  ],
  [
    Keyboard.button.link(
      '📢 Следить за обстановкой',
      'https://max.ru/id2901131820_gos'
    ),
  ],
]);

// 4. Функция приветствия — сохраняет нового пользователя
async function sendWelcomeMessage(ctx: any) {
  const userId = ctx.user?.user_id;

  if (userId) {
    // Проверяем, есть ли пользователь в базе
    const existing = await db.get('SELECT * FROM users WHERE user_id = ?', userId);

    if (!existing) {
      // Новый пользователь
      await db.run('INSERT INTO users (user_id) VALUES (?)', userId);
      const total = await db.get('SELECT COUNT(*) as count FROM users');
    }
  }

  // Отправляем приветствие
  await ctx.reply(
    `Добрый день! В данном боте вы можете узнать адрес ближайшего к вам укрытия в случае объявления воздушной угрозы. Выберите пункт ниже:`,
    {
      attachments: [mainKeyboard],
    }
  );
}

// 5. Команда для просмотра статистики
bot.command('stats', async (ctx) => {
  const total = await db.get('SELECT COUNT(*) as count FROM users');
  await ctx.reply(`👥 Всего пользователей: ${total.count}`);
});

// 6. Обработчик для кнопки "НАЧАТЬ"
bot.on('bot_started', async (ctx) => {
  await sendWelcomeMessage(ctx);
});

// 7. Обработчик для команды /start
bot.command('start', async (ctx) => {
  await sendWelcomeMessage(ctx);
});

// 8. Запускаем бота
bot.start();