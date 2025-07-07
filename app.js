import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getResult } from './game.js';
import { quizData } from './quizdata.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk mem-parsing body JSON dari permintaan.
app.use(express.json());

const activeGames = {};
const activeQuizzes = {};

// VERIFIKASI KEAMANAN SEKARANG DIAKTIFKAN KEMBALI!
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, id, data } = req.body;
  
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Jika interaksi bukan PING, kita bisa berasumsi ada 'member'
  if (!req.body.member) {
      return res.status(400).send({ error: 'Unsupported interaction context.' });
  }
  const userId = req.body.member.user.id;

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    if (name === 'test') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `hello world ${getRandomEmoji()}`,
        },
      });
    }
    
    if (name === 'challenge' && id) {
      const objectName = req.body.data.options[0].value;
      activeGames[id] = {
        id: userId,
        objectName,
      };

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Rock papers scissors challenge from <@${userId}>`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: `accept_button_${req.body.id}`,
                  label: 'Accept',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }

    if (name === 'quiz') {
      const level = options[0].name;
      const questions = quizData[level];

      if (!questions) {
        return res.status(400).send({ error: 'Invalid level' });
      }

      activeQuizzes[userId] = {
        level: level,
        questions: [...questions].sort(() => Math.random() - 0.5),
        currentQuestionIndex: 0,
        score: 0,
      };

      const quiz = activeQuizzes[userId];
      const question = quiz.questions[quiz.currentQuestionIndex];
      const questionNumber = quiz.currentQuestionIndex + 1;
      const totalQuestions = quiz.questions.length;

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

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;

    if (componentId.startsWith('quiz_answer_button_')) {
      const quizUserId = componentId.replace('quiz_answer_button_', '');
      const quiz = activeQuizzes[quizUserId];

      if (!quiz) return res.status(400).send({ error: 'Quiz not found' });
      
      const question = quiz.questions[quiz.currentQuestionIndex];

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
                  style: 1,
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }
  }
  
  if (type === InteractionType.MODAL_SUBMIT) {
    const modalId = data.custom_id;

    if (modalId.startsWith('quiz_modal_submit_')) {
      const quizUserId = modalId.replace('quiz_modal_submit_', '');
      const quiz = activeQuizzes[quizUserId];

      if (!quiz) return res.status(400).send({ error: 'Quiz not found' });
      
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
      
      if (quiz.currentQuestionIndex >= quiz.questions.length) {
        const finalMessage = `Kuis Selesai! 🎉\n\nSkor akhir Anda untuk level ${quiz.level.toUpperCase()} adalah **${quiz.score}/${quiz.questions.length}**.`;
        delete activeQuizzes[quizUserId];
        
        return res.send({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: {
                content: `${resultText}\n\n${finalMessage}`,
                components: []
            }
        });
      } else {
        const questionNumber = quiz.currentQuestionIndex + 1;
        const totalQuestions = quiz.questions.length;
        const nextQuestion = quiz.questions[quiz.currentQuestionIndex];
        const nextMessage = `Kuis JLPT ${quiz.level.toUpperCase()} (Skor: ${quiz.score})\n\nPertanyaan ${questionNumber}/${totalQuestions}: **${nextQuestion.kanji}**`;

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
                          custom_id: `quiz_answer_button_${userId}`,
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

  console.error('Unknown interaction type:', type);
  return res.status(400).json({ error: 'Unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});