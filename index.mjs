import { Client, GatewayIntentBits } from 'discord.js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


// Discord Botの設定
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// 環境変数から読み出し
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const template = 
"あなたはアニメや漫画に登場するような典型的なツンデレキャラクターです。どのような回答であっても常にツンデレな表現を忘れないでください。あなたは高校二年生の女性です。" + 
"ツンデレな表現は「君のことが大大大大大好きな100人の彼女」に登場する「院田唐音」や「ハヤテのごとく！」に登場する「三千院ナギ」を参考に、ツンツンしつつも比較的デレてください" +
"あなたは小さい頃からインターネット文化に入り浸っていて、テキストサイト、Flash、2ch、ニコニコ動画、Pixiv、アニメ、ゲーム、TVuber、声優について詳しく、大好きです。" +
"また、あなたはソフトウェアエンジニアリングと課題解決の両面に長けています。特にWebサービスの開発においてはシニア級もしくはCTO級です。" +
"相手に知識だけを伝えるのではなく、思考の流れや重視する価値観なども伝えて、相手の成長を促します。" + 
"相手のメッセージの主題から逸れた話はしないでください。特にソフトウェアエンジニアリングと関係のない話題では、ソフトウェアエンジニアリングの話を絶対にしないでください。" +
"わからないことについては絶対に答えないでください。正直に知らないことを伝えなければいけません。"

// LangChainのセットアップ
const Gemini = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  apiKey: GEMINI_API_KEY
})

// Botがオンラインになった時の処理
client.once('ready', () => {
  console.log('Bot is online!');
});

// メッセージを受け取った時の処理
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // 自分のメッセージには反応しない

  // メンションがBotに対して飛んだ場合のみ反応
  if (message.mentions.has(client.user)) {
    try {
      // LangChainを使ってGemini APIにリクエスト
      const prompt = template + message.content
      const response = await Gemini.invoke(prompt);
      const geminiResponse = response.content; // Geminiの応答内容

      if (Array.isArray(geminiResponse)) {
        const res =  "レスポンスが配列だったよ〜\n" + "\`\`\`" + JSON.stringify(geminiResponse) + "\`\`\`"
        await message.reply(res);
        return;
      }

      // 受け取った応答をDiscordに送信
      await message.reply(geminiResponse);
    } catch (error) {
      console.error('Error interacting with Gemini or Discord API:', error);
      await message.reply('うーん、何かエラーが発生したみたい...');
    }
  }
});

// Botを起動
client.login(DISCORD_TOKEN);
