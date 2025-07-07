// app.js

import 'dotenv/config';

console.log('Memuat Kredensial:');
console.log('APP_ID:', process.env.APP_ID ? 'Ditemukan' : 'TIDAK DITEMUKAN');
console.log('PUBLIC_KEY:', process.env.PUBLIC_KEY ? 'Ditemukan' : 'TIDAK DITEMUKAN');
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Ditemukan' : 'TIDAK DITEMUKAN');

import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
// Impor data kuis yang baru kita buat
import { quizData } from './quizdata.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games and quizzes
const activeGames = {};
const activeQuizzes = {}; // Objek untuk menyimpan status kuis aktif per pengguna

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, id, data, member } = req.body;
  const userId = member.user.id;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    // ... (handler untuk command 'test' dan 'challenge' yang sudah ada) ...

    // Handler untuk command '/quiz'
    if (name === 'quiz') {
      const level = options[0].name; // 'n5', 'n4', dll.
      const questions = quizData[level];

      if (!questions) {
        return res.status(400).send({ error: 'Invalid level' });
      }

      // Inisialisasi status kuis untuk pengguna
      activeQuizzes[userId] = {
        level: level,
        questions: [...questions].sort(() => Math.random() - 0.5), // Acak pertanyaan
        currentQuestionIndex: 0,
        score: 0,
        originalMessageId: null, // Akan kita isi nanti
      };

      const quiz = activeQuizzes[userId];
      const question = quiz.questions[quiz.currentQuestionIndex];
      const questionNumber = quiz.currentQuestionIndex + 1;
      const totalQuestions = quiz.questions.length;

      // Kirim pertanyaan pertama
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Kuis JLPT ${level.toUpperCase()} Dimulai!\n\nPertanyaan ${questionNumber}/${totalQuestions}: **${question.kanji}**`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: `quiz_answer_button_${userId}`,
                  label: 'Jawab',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }
  }

  // Handler untuk interaksi komponen (tombol)
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;

    if (componentId.startsWith('quiz_answer_button_')) {
      const quizUserId = componentId.replace('quiz_answer_button_', '');
      const quiz = activeQuizzes[quizUserId];

      if (!quiz) {
        return res.status(400).send({ error: 'Quiz not found' });
      }
      
      // Simpan ID pesan original agar bisa diedit nanti
      if(!quiz.originalMessageId) {
        quiz.originalMessageId = req.body.message.id;
      }
      
      const question = quiz.questions[quiz.currentQuestionIndex];

      // Tampilkan modal untuk input jawaban
      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `quiz_modal_submit_${quizUserId}`,
          title: `Pertanyaan: ${question.kanji}`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'answer_input',
                  label: 'Masukkan bacaan hiragana',
                  style: 1, // 1 untuk input teks pendek
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }
  }
  
  // Handler untuk submit modal
  if (type === InteractionType.MODAL_SUBMIT) {
    const modalId = data.custom_id;

    if (modalId.startsWith('quiz_modal_submit_')) {
      const quizUserId = modalId.replace('quiz_modal_submit_', '');
      const quiz = activeQuizzes[quizUserId];

      if (!quiz) {
        return res.status(400).send({ error: 'Quiz not found' });
      }

      const userAnswer = data.components[0].components[0].value.trim();
      const correctAnswer = quiz.questions[quiz.currentQuestionIndex].hiragana;

      let resultText;
      if (userAnswer === correctAnswer) {
        quiz.score++;
        resultText = `✅ **Benar!** Jawaban yang benar adalah **${correctAnswer}**.`;
      } else {
        resultText = `❌ **Salah.** Jawaban yang benar adalah **${correctAnswer}**.`;
      }
      
      quiz.currentQuestionIndex++;
      
      const questionNumber = quiz.currentQuestionIndex + 1;
      const totalQuestions = quiz.questions.length;
      
      // Cek apakah kuis sudah selesai
      if (quiz.currentQuestionIndex >= totalQuestions) {
        const finalMessage = `Kuis Selesai! 🎉\n\nSkor akhir Anda untuk level ${quiz.level.toUpperCase()} adalah **${quiz.score}/${totalQuestions}**.`;
        delete activeQuizzes[quizUserId]; // Hapus sesi kuis
        
        // Update pesan original dengan hasil akhir
        return res.send({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: {
                content: `${resultText}\n\n${finalMessage}`,
                components: [] // Hapus tombol
            }
        });
        
      } else {
        // Lanjut ke pertanyaan berikutnya
        const nextQuestion = quiz.questions[quiz.currentQuestionIndex];
        const nextMessage = `Kuis JLPT ${quiz.level.toUpperCase()} (Skor: ${quiz.score})\n\nPertanyaan ${questionNumber}/${totalQuestions}: **${nextQuestion.kanji}**`;

        // Update pesan original dengan pertanyaan baru
        return res.send({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: {
                content: `${resultText}\n\n${nextMessage}`,
                components: [
                    {
                      type: MessageComponentTypes.ACTION_ROW,
                      components: [
                        {
                          type: MessageComponentTypes.BUTTON,
                          custom_id: `quiz_answer_button_${quizUserId}`,
                          label: 'Jawab',
                          style: ButtonStyleTypes.PRIMARY,
                        },
                      ],
                    },
                ]
            }
        });
      }
    }
  }

});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});