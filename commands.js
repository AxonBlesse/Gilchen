import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

// Command containing options
const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
};

// ==================================================
// === TAMBAHKAN DEFINISI PERINTAH KUIS DI SINI ===
const QUIZ_COMMAND = {
  name: 'quiz',
  description: 'Memulai kuis kosakata bahasa Jepang berdasarkan level JLPT.',
  options: [
    {
      type: 1, // Tipe 1 menandakan SUB_COMMAND
      name: 'n5',
      description: 'Mulai kuis kosakata JLPT N5.',
    },
    {
      type: 1,
      name: 'n4',
      description: 'Mulai kuis kosakata JLPT N4.',
    },
    {
      type: 1,
      name: 'n3',
      description: 'Mulai kuis kosakata JLPT N3.',
    },
    {
      type: 1,
      name: 'n2',
      description: 'Mulai kuis kosakata JLPT N2.',
    },
    {
      type: 1,
      name: 'n1',
      description: 'Mulai kuis kosakata JLPT N1.',
    },
  ],
  type: 1,
};
// ==================================================


// === DAN TAMBAHKAN QUIZ_COMMAND KE DALAM ARRAY INI ===
const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, QUIZ_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);