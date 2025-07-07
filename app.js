import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { quizData } from './quizdata.js';

// Objek untuk melacak kuis yang sedang aktif untuk setiap pengguna
const activeQuizzes = new Map();

// Membuat client bot baru
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // WAJIB untuk membaca isi pesan pengguna!
  ],
});

// Event handler saat bot siap dan online
client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Event handler untuk interaksi (slash command)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const userId = interaction.user.id;

  if (commandName === 'test') {
    await interaction.reply('Test command works! ✨');
  }

  if (commandName === 'quiz') {
    if (activeQuizzes.has(userId)) {
      await interaction.reply({ content: 'Anda sudah memiliki kuis yang aktif. Selesaikan dulu kuis tersebut!', ephemeral: true });
      return;
    }

    const level = interaction.options.getString('level');
    const questions = quizData[level];
    
    // Acak pertanyaan
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

    activeQuizzes.set(userId, {
      questions: shuffledQuestions,
      currentQuestionIndex: 0,
      score: 0,
      channel: interaction.channel, // Simpan channel tempat kuis dimulai
    });

    await interaction.reply(`Kuis JLPT ${level.toUpperCase()} dimulai!`);
    sendQuizQuestion(userId, interaction.channel);
  }
});

// Event handler untuk setiap pesan yang dibuat
client.on(Events.MessageCreate, async message => {
  // Abaikan pesan dari bot lain (termasuk diri sendiri)
  if (message.author.bot) return;

  const userId = message.author.id;

  // Cek apakah pengguna yang mengirim pesan memiliki kuis aktif
  if (activeQuizzes.has(userId)) {
    const quiz = activeQuizzes.get(userId);

    // Pastikan jawaban diberikan di channel yang benar
    if (message.channel.id !== quiz.channel.id) return;
    
    const userAnswer = message.content.trim();
    const correctAnswer = quiz.questions[quiz.currentQuestionIndex].hiragana;

    if (userAnswer === correctAnswer) {
      quiz.score++;
      
      const kanji = quiz.questions[quiz.currentQuestionIndex].kanji;
      await message.channel.send(`**Benar!**\n# ${kanji}\n${correctAnswer}`);
      
      quiz.currentQuestionIndex++;
      
      // Kirim pertanyaan berikutnya atau selesaikan kuis
      if (quiz.currentQuestionIndex < quiz.questions.length) {
        sendQuizQuestion(userId, message.channel);
      } else {
        await message.channel.send(`🎉 Kuis Selesai! Skor akhir Anda: **${quiz.score}/${quiz.questions.length}**`);
        activeQuizzes.delete(userId);
      }
    } else {
        // Jika jawaban salah, bot bisa memberi feedback atau diam saja.
        // Untuk saat ini kita diamkan agar tidak spam.
    }
  }
});

// Fungsi untuk mengirim pertanyaan kuis
function sendQuizQuestion(userId, channel) {
  const quiz = activeQuizzes.get(userId);
  if (!quiz) return;
  
  const question = quiz.questions[quiz.currentQuestionIndex];
  const questionNumber = quiz.currentQuestionIndex + 1;
  const totalQuestions = quiz.questions.length;

  channel.send(`Pertanyaan ${questionNumber}/${totalQuestions}:\n# ${question.kanji}`);
}


// Login ke Discord dengan token bot Anda
client.login(process.env.DISCORD_TOKEN);