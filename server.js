const { Telegraf } = require('telegraf');
const { spawn, execSync } = require('child_process');
const path = require('path');

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

bot.start((ctx) => {
  ctx.reply(
    '🤖 K6 Stress Test Bot\n\n' +
    'Commands:\n' +
    '/start - Start continuous stress test\n' +
    '/stop - Stop the stress test\n' +
    '/status - Check current status\n' +
    '/help - Show this help'
  );
});

bot.help((ctx) => ctx.reply(
  'How it works:\n' +
  '• /start runs k6 continuously (ramps up to 1000 users and stays there)\n' +
  '• /stop kills the test immediately\n' +
  '• The test hits ' + TARGET_URL + '\n' +
  '• Configure via env vars: `BOT_TOKEN`, `TARGET_URL`'
));

bot.command('start', async (ctx) => {
  if (isRunning) {
    return ctx.reply('⚠️ Test is already running! Use /stop first.');
  }

  isRunning = true;
  shouldStop = false;
  statusMessage = '🟢 Running';

  const testFile = path.join(__dirname, '3-stress-test.js');
  const env = { ...process.env, TARGET_URL };

  currentProcess = spawn('k6', ['run', testFile], { env, stdio: 'pipe', shell: true });

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
});

bot.command('stop', async (ctx) => {
  if (!isRunning) {
    return ctx.reply('⚠️ No test is currently running.');
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
          if (currentProcess) currentProcess.kill('SIGKILL');
        }, 5000);
      }
    } catch (e) {
      // ignore
    }
    currentProcess = null;
  }

  await ctx.reply('⏹️ Stress test stopped. Website is now free.');
});

bot.command('status', (ctx) => {
  ctx.reply(`Status: ${statusMessage}`);
});

bot.launch().then(() => console.log('🤖 Bot is running!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Status: ${statusMessage}`);
}).listen(PORT, () => console.log(`🌐 Health server on port ${PORT}`));
