import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { quizData } from './quizdata.js';

// --- PENGATURAN BARU ---
const prefix = 'g!'; // Prefix untuk semua command
const activeQuizzes = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Event handler utama untuk semua pesan
client.on(Events.MessageCreate, async message => {
  // Abaikan pesan dari bot
  if (message.author.bot) return;

  const userId = message.author.id;
  const quiz = activeQuizzes.get(userId);

  // --- LOGIKA BARU: Cek apakah ini adalah sebuah command ---
  if (message.content.startsWith(prefix)) {
    // Parsing command dan argumen
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command: g!t (test)
    if (command === 't') {
      await message.channel.send('Test command works! ✨');
    }
    
    // Command: g!k (quiz)
    else if (command === 'k') {
      if (activeQuizzes.has(userId)) {
        await message.reply('Anda sudah memiliki kuis yang aktif. Selesaikan dulu atau ketik `!stop`.');
        return;
      }
      
      const [level, targetScoreStr] = args;
      const targetScore = parseInt(targetScoreStr);

      // Validasi input
      if (!level || !quizData[level]) {
        await message.reply('Format salah. Gunakan: `g!k [level] [target_score]`. Contoh: `g!k n5 5`');
        return;
      }
      if (isNaN(targetScore) || targetScore < 1) {
        await message.reply('Target skor harus berupa angka dan minimal 1.');
        return;
      }
      
      const questions = [...quizData[level]].sort(() => Math.random() - 0.5);

      activeQuizzes.set(userId, {
        questions: questions,
        currentQuestionIndex: 0,
        score: 0,
        targetScore: targetScore,
        channel: message.channel,
        timer: null,
      });

      await message.channel.send(`Kuis JLPT ${level.toUpperCase()} dimulai! Target skor: **${targetScore}**. Gunakan \`!skip\` atau \`!stop\`.`);
      sendQuizQuestion(userId, message.channel);
    }
  } 
  // --- Jika bukan command, cek apakah ini adalah jawaban kuis ---
  else if (quiz && message.channel.id === quiz.channel.id) {
    const userAnswer = message.content.trim();
    
    // Command !stop dan !skip
    if (userAnswer.toLowerCase() === '!stop') {
      clearTimeout(quiz.timer);
      await message.channel.send(`Kuis dihentikan. Skor akhir Anda: **${quiz.score}/${quiz.targetScore}** tercapai.`);
      activeQuizzes.delete(userId);
      return;
    }
    
    if (userAnswer.toLowerCase() === '!skip') {
      clearTimeout(quiz.timer);
      const correctAnswer = quiz.questions[quiz.currentQuestionIndex].hiragana;
      await message.channel.send(`Pertanyaan dilewati. Jawaban yang benar adalah **${correctAnswer}**.`);
      quiz.currentQuestionIndex = (quiz.currentQuestionIndex + 1) % quiz.questions.length;
      sendQuizQuestion(userId, message.channel);
      return;
    }

    const correctAnswer = quiz.questions[quiz.currentQuestionIndex].hiragana;
    if (userAnswer === correctAnswer) {
      clearTimeout(quiz.timer);
      quiz.score++;
      
      const kanji = quiz.questions[quiz.currentQuestionIndex].kanji;
      await message.channel.send(`**Benar!** (Skor: ${quiz.score}/${quiz.targetScore})\n\`\`\`\n ${kanji} \n ${correctAnswer} \n\`\`\``);
      
      if (quiz.score >= quiz.targetScore) {
        await message.channel.send(`🎉 Selamat! Anda telah mencapai target skor **${quiz.targetScore}**!`);
        activeQuizzes.delete(userId);
      } else {
        quiz.currentQuestionIndex = (quiz.currentQuestionIndex + 1) % quiz.questions.length;
        sendQuizQuestion(userId, message.channel);
      }
    }
  }
});

function sendQuizQuestion(userId, channel) {
  const quiz = activeQuizzes.get(userId);
  if (!quiz) return;

  const question = quiz.questions[quiz.currentQuestionIndex];
  
  channel.send(`Skor: [**${quiz.score}/${quiz.targetScore}**]\n# ${question.kanji}`);

  quiz.timer = setTimeout(async () => {
    if (activeQuizzes.has(userId)) {
      const correctAnswer = question.hiragana;
      await channel.send(`Waktu habis! Jawaban yang benar adalah **${correctAnswer}**.`);
      
      quiz.currentQuestionIndex = (quiz.currentQuestionIndex + 1) % quiz.questions.length;
      sendQuizQuestion(userId, channel);
    }
  }, 5000);
}

// Login ke Discord
client.login(process.env.DISCORD_TOKEN);