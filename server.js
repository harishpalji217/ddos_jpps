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
let shouldStop = false;
let statusMessage = '🔴 Idle';

bot.start((ctx) => {
  ctx.reply(
    '🤖 K6 Stress Test Bot\n\n' +
    'Commands:\n' +
    '/start_test - Start looping stress test\n' +
    '/stop - Stop the stress test\n' +
    '/status - Check current status\n' +
    '/help - Show this help'
  );
});

bot.help((ctx) => ctx.reply(
  'How it works:\n' +
  '• /start_test runs k6 with `3-stress-test.js` in a loop (repeats forever)\n' +
  '• /stop kills the current test and stops the loop\n' +
  '• The test hits ' + TARGET_URL + '\n' +
  '• Configure via env vars: `BOT_TOKEN`, `TARGET_URL`'
));

function runStressTest() {
  return new Promise((resolve) => {
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
      resolve(code);
    });

    currentProcess.on('error', (err) => {
      currentProcess = null;
      resolve(-1);
    });
  });
}

async function startLoopingTest(ctx) {
  isRunning = true;
  shouldStop = false;
  let iteration = 0;

  await ctx.reply(`🚀 Stress test started!\nTarget: ${TARGET_URL}\nRepeating until /stop is sent.`);
  statusMessage = '🟢 Running';

  while (!shouldStop) {
    iteration++;
    const statusMsg = await ctx.reply(`🔄 Iteration #${iteration} starting...`);

    const exitCode = await runStressTest();

    if (shouldStop) break;

    if (exitCode === 0) {
      await ctx.telegram.sendMessage(ctx.chat.id, `✅ Iteration #${iteration} complete. Restarting...`);
    } else {
      await ctx.telegram.sendMessage(ctx.chat.id, `⚠️ Iteration #${iteration} finished (exit code: ${exitCode}). Restarting...`);
    }
  }

  isRunning = false;
  statusMessage = '🔴 Idle';
  await ctx.reply('⏹️ Stress test stopped.');
}

bot.command('start_test', async (ctx) => {
  if (isRunning) {
    return ctx.reply('⚠️ Test is already running! Use /stop first.');
  }
  startLoopingTest(ctx).catch((err) => {
    console.error('Loop error:', err.message);
    isRunning = false;
    statusMessage = '🔴 Idle';
  });
});

bot.command('stop', async (ctx) => {
  if (!isRunning) {
    return ctx.reply('⚠️ No test is currently running.');
  }

  shouldStop = true;

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

  await ctx.reply('⏹️ Stopping test...');
});

bot.command('status', (ctx) => {
  ctx.reply(`Status: ${statusMessage}`);
});

bot.launch().then(() => console.log('🤖 Bot is running!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
