const { Telegraf } = require('telegraf');
const { spawn, execSync } = require('child_process');
const path = require('path');
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const TARGET_URL = process.env.TARGET_URL || 'https://schoolwebapp.com/';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN environment variable is required');
  console.error('   Get one from @BotFather on Telegram');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
let isRunning = false;
let currentProcess = null;
let statusMessage = '🔴 Idle';

async function startTest(ctx) {
  if (isRunning) {
    return ctx.reply('⚠️ Test is already running! Use /stop first.');
  }

  isRunning = true;
  statusMessage = '🟢 Running';

  const testFile = path.join(__dirname, '3-stress-test.js');
  const env = { ...process.env, TARGET_URL };

  currentProcess = spawn('k6', ['run', testFile], { env, stdio: 'pipe' });

  currentProcess.stdout.on('data', (data) => {
    process.stdout.write(`[k6] ${data}`);
  });

  currentProcess.stderr.on('data', (data) => {
    process.stderr.write(`[k6] ${data}`);
  });

  currentProcess.on('close', (code) => {
    currentProcess = null;
    if (isRunning) {
      isRunning = false;
      statusMessage = '🔴 Idle';
      ctx.reply(`⚠️ Test stopped unexpectedly (exit code: ${code}). Send /start to resume.`).catch(() => {});
    }
  });

  currentProcess.on('error', (err) => {
    currentProcess = null;
    isRunning = false;
    statusMessage = '🔴 Idle';
    ctx.reply(`❌ Failed to start k6: ${err.message}`).catch(() => {});
  });

  await ctx.reply(`🚀 Stress test started!\nTarget: ${TARGET_URL}\nRamping up to 1000 users...\nWebsite stays busy until /stop is sent.`);
}

bot.start(async (ctx) => {
  await ctx.reply(
    '🤖 K6 Stress Test Bot\n\n' +
    'Commands:\n' +
    '/start - Start continuous stress test\n' +
    '/stop - Stop the stress test\n' +
    '/status - Check current status\n' +
    '/help - Show this help'
  );
  await startTest(ctx);
});

bot.help((ctx) => ctx.reply(
  'How it works:\n' +
  '• /start runs k6 continuously (ramps up to 1000 users)\n' +
  '• /stop kills the test immediately\n' +
  '• Target: ' + TARGET_URL
));

bot.command('stop', async (ctx) => {
  if (!currentProcess && !isRunning) {
    return await ctx.reply('⚠️ No test is currently running.');
  }

  isRunning = false;
  statusMessage = '🔴 Idle';

  if (currentProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', currentProcess.pid.toString(), '/f', '/t']);
      } else {
        currentProcess.kill('SIGTERM');
        setTimeout(() => {
          try { if (currentProcess) currentProcess.kill('SIGKILL'); } catch (e) {}
        }, 3000);
      }
    } catch (e) {}
    currentProcess = null;
  }

  try {
    await ctx.reply('⏹️ Stress test stopped. Website is now free.');
  } catch (e) {}
});

bot.command('status', (ctx) => {
  ctx.reply(`Status: ${statusMessage}`);
});

function clearTelegramWebhook() {
  return new Promise((resolve) => {
    https.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve());
    }).on('error', () => resolve());
  });
}

async function startBot() {
  await clearTelegramWebhook();
  try {
    await bot.launch();
    console.log('🤖 Bot is running!');
  } catch (err) {
    if (err.response?.error_code === 409) {
      console.log('⚠️ 409 conflict, retrying...');
      await clearTelegramWebhook();
      await new Promise(r => setTimeout(r, 2000));
      await bot.launch();
      console.log('🤖 Bot is running!');
    } else {
      throw err;
    }
  }
}

startBot().catch(err => console.error('Failed to start bot:', err.message));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const PORT = process.env.PORT || 3000;
require('http').createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Status: ${statusMessage}`);
}).listen(PORT, () => console.log(`🌐 Health server on port ${PORT}`));
