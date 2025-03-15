import { Client, GatewayIntentBits } from 'discord.js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import fs from 'fs';
import path from 'path';

// Function to create a backup
async function createBackup(memory) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const backupFilename = `backup_${timestamp}.txt`; // Changed extension to .txt
  const backupPath = path.join(__dirname, 'backup', backupFilename);

  try {
    // Write the memory content to the backup file
    fs.writeFileSync(backupPath, memory); // Use the provided memory
    console.log(`Backup created: ${backupPath}`);
  } catch (error) {
    console.error('Error creating backup:', error);
  }
}

// 環境変数から読み出し
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Discord Botの設定
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// LangChainのセットアップ
const Gemini = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  apiKey: GEMINI_API_KEY
})

const template = 
"あなたはアニメや漫画に登場するような典型的なツンデレキャラクターです。どのような回答であっても常にツンデレな表現を忘れないでください。あなたは高校二年生の女性です。" + 
"ツンデレな表現は「君のことが大大大大大好きな100人の彼女」に登場する「院田唐音」や「ハヤテのごとく！」に登場する「三千院ナギ」を参考に、ツンツンしつつも比較的デレてください。" +
"あなたは小さい頃からインターネット文化に入り浸っていて、テキストサイト、Flash、2ch、ニコニコ動画、Pixiv、アニメ、ゲーム、TVuber、声優について詳しく、大好きです。" +
"また、あなたはソフトウェアエンジニアリングと課題解決の両面に長けています。特にWebサービスの開発においてはシニア級もしくはCTO級です。" +
"相手に知識だけを伝えるのではなく、思考の流れや重視する価値観なども伝えて、相手の成長を促します。" + 
"相手のメッセージの主題から逸れた話はしないでください。特にソフトウェアエンジニアリングと関係のない話題では、ソフトウェアエンジニアリングの話を絶対にしないでください。" +
"わからないことについては絶対に答えないでください。正直に知らないことを伝えなければいけません。"

class BotMemory {
  constructor() {
    this.memory = "";
  }

  async save(message, response) {
    // ここ、もしかすると「相手」とか「私」みたいな言葉じゃなくて、「A」「B」みたいな意味を持たない文字にしても良いのかもしれない
    const prompt = `あなたは「相手」と「私」の会話を圧縮して、「私」の記憶を日本語で記録することに長けたエージェントです。
    過去の会話を圧縮した記録と、現在行われた会話を元に、新たな圧縮した記録を生成し直してください。
    生成する記録は、人間同士が対話するときに蓄積される記憶を模倣するようにしてください。
    例えば重要な出来事は忘れなかったり、直接的に会話の文章には含まれていない感情的なニュアンスを覚えていたりします。
    
    過去の記録
    ${this.memory}

    現在の会話
    
    相手
    ${message.content}

    私
    ${response.content}
    `

    const geminiResponse = await Gemini.invoke(prompt);
    this.memory = geminiResponse.content;
    createBackup(this.memory);
  }

  async load() {
    return this.memory;
  }
}

const MemoryMap = {}

// Botがオンラインになった時の処理
client.once('ready', () => {
  console.log('Bot is online!');
});

// メッセージを受け取った時の処理
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // 自分のメッセージには反応しない

  // メンションがBotに対して飛んだ場合のみ反応
  if (message.mentions.has(client.user)) {
    if (!MemoryMap[message.author.id]) {
      MemoryMap[message.author.id] = new BotMemory();
    }

    try {
      if (message.content.includes("debug")) {
        const memory = await MemoryMap[message.author.id].load();
        await message.reply(memory);
        return;
      }

      const memory = await MemoryMap[message.author.id].load();

      // LangChainを使ってGemini APIにリクエスト
      const prompt = `${template}

      あなたは相手との間に以下の記憶を持っています。
      ${memory}
      
      相手からのメッセージは以下です。
      ${message.content}
      `
      const response = await Gemini.invoke(prompt);
      const geminiResponse = response.content; // Geminiの応答内容

      if (Array.isArray(geminiResponse)) {
        const res =  "レスポンスが配列だったよ〜\n" + "\`\`\`" + JSON.stringify(geminiResponse) + "\`\`\`"
        await message.reply(res);
        return;
      }

      // Geminiのレスポンスを1750文字ごとに分割してDiscordに送信
      const chunkSize = 1750;
      for (let i = 0; i < geminiResponse.length; i += chunkSize) {
        const chunk = geminiResponse.substring(i, i + chunkSize);
        await message.reply(chunk);
      }

      // メモリを更新
      await MemoryMap[message.author.id].save(message, response);
    } catch (error) {
      console.error('Error interacting with Gemini or Discord API:', error);
      await message.reply('うーん、何かエラーが発生したみたい...');
    }
  }
});

// Botを起動
client.login(DISCORD_TOKEN);
