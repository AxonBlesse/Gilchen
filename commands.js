import 'dotenv/config';
import { REST, Routes } from 'discord.js';

const commands = [
  {
    name: 'test',
    description: 'Replies with a test message!',
  },
  {
    name: 'quiz',
    description: 'Starts a Japanese vocabulary quiz.',
    options: [
      {
        name: 'level',
        description: 'The JLPT level for the quiz.',
        type: 3, // String type
        required: true,
        choices: [
          { name: 'N5', value: 'n5' },
          { name: 'N4', value: 'n4' },
          { name: 'N3', value: 'n3' },
          { name: 'N2', value: 'n2' },
          { name: 'N1', value: 'n1' },
        ],
      },
    ],
  },
  // Command 'challenge' bisa ditambahkan di sini jika Anda ingin mengimplementasikannya kembali nanti.
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.APP_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();