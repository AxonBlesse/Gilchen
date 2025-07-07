import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { quizData } from './quizdata.js';

const prefix = 'g!';
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

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const quiz = activeQuizzes.get(userId);

  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 't') {
      await message.channel.send('Test command works! ✨');
    }

    else if (command === 'q') {
      if (activeQuizzes.has(userId)) {
        await message.reply('Anda sudah memiliki kuis yang aktif. Selesaikan dulu atau ketik `!stop`.');
        return;
      }
      
      const [level, targetScoreStr] = args;
      const targetScore = parseInt(targetScoreStr);

      if (!level || !quizData[level]) {
        await message.reply('Format salah. Gunakan: `g!q [level] [target_score]`. Contoh: `g!q n5 5`');
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
  // --- PERUBAHAN UTAMA DIMULAI DI SINI ---
  else if (quiz && message.channel.id === quiz.channel.id) {
    const userAnswer = message.content.trim();
    
    // Perintah !stop dan !skip
    if (userAnswer.toLowerCase() === '!stop' || userAnswer.toLowerCase() === '!skip') {
        clearTimeout(quiz.timer);
        if(userAnswer.toLowerCase() === '!stop'){
            await message.channel.send(`Kuis dihentikan. Skor akhir Anda: **${quiz.score}/${quiz.targetScore}** tercapai.`);
            activeQuizzes.delete(userId);
        } else {
            const correctAnswer = quiz.questions[quiz.currentQuestionIndex];
            await message.channel.send(`Pertanyaan dilewati. Jawaban yang benar adalah **${correctAnswer.hiragana}**.`);
            quiz.currentQuestionIndex = (quiz.currentQuestionIndex + 1) % quiz.questions.length;
            sendQuizQuestion(userId, message.channel);
        }
        return;
    }

    const correctAnswer = quiz.questions[quiz.currentQuestionIndex];

    // Bot hanya akan bereaksi jika jawabannya benar.
    if (userAnswer === correctAnswer.hiragana) {
      // Hentikan timer karena jawaban sudah benar.
      clearTimeout(quiz.timer);
      quiz.score++;
      
      // Tampilkan pesan "Benar!" dengan format baru
      await message.channel.send(`**Benar!** (Skor: ${quiz.score}/${quiz.targetScore})\n## ${correctAnswer.hiragana}\n*${correctAnswer.arti}*`);
      
      // Cek apakah target skor tercapai
      if (quiz.score >= quiz.targetScore) {
        await message.channel.send(`🎉 Selamat! Anda telah mencapai target skor **${quiz.targetScore}**!`);
        activeQuizzes.delete(userId);
      } else {
        // Lanjut ke pertanyaan berikutnya
        quiz.currentQuestionIndex = (quiz.currentQuestionIndex + 1) % quiz.questions.length;
        sendQuizQuestion(userId, message.channel);
      }
    }
    // Jika jawaban salah, bot tidak akan melakukan apa-apa dan membiarkan timer berjalan.
  }
});

function sendQuizQuestion(userId, channel) {
  const quiz = activeQuizzes.get(userId);
  if (!quiz) return;

  const question = quiz.questions[quiz.currentQuestionIndex];
  
  // Tampilan pertanyaan menggunakan teks biasa dengan heading
  channel.send(`Skor: [**${quiz.score}/${quiz.targetScore}**]\n# ${question.kanji}`);

  // Timer akan berjalan. Jika tidak ada jawaban benar dalam 5 detik, timer akan dieksekusi.
  quiz.timer = setTimeout(async () => {
    if (activeQuizzes.has(userId)) {
      const correctAnswer = question;
      // Pesan ini sekarang berfungsi sebagai feedback untuk "waktu habis" DAN "jawaban salah".
      await channel.send(`Waktu habis! Jawaban yang benar adalah:\n## ${correctAnswer.hiragana}\n*${correctAnswer.arti}*`);
      
      quiz.currentQuestionIndex = (quiz.currentQuestionIndex + 1) % quiz.questions.length;
      sendQuizQuestion(userId, channel);
    }
  }, 5000);
}

client.login(process.env.DISCORD_TOKEN);