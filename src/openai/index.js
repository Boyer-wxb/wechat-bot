import { remark } from 'remark'
import stripMarkdown from 'strip-markdown'
import { Configuration, OpenAIApi } from 'openai'
import dotenv from 'dotenv'
const env = dotenv.config().parsed // 环境参数
console.log('加载openapi-key:', env.OPENAI_API_KEY.substring(0,4), '...')

const configuration = new Configuration({
  organization: "org-tQtoh40bfNu17mE1qNnyj89e",
  apiKey: env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export async function getOpenAiReply(prompt) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    temperature: 0.5, // 每次返回的答案的相似度0-1（0：每次都一样，1：每次都不一样）
    max_tokens: 4000,
    top_p: 1,
    presence_penalty: 0.6,
  })
  console.log('↓↓↓↓↓↓↓↓↓↓response↓↓↓↓↓↓↓↓↓↓')
  console.log(JSON.stringify(response.data))
  console.log('↑↑↑↑↑↑↑↑↑response↑↑↑↑↑↑↑↑↑')
  const reply = await markdownToText(response.data.choices[0].text)
  console.log('reply----->', reply)
  return `${reply}\nvia ChatGPT`
}

export async function getOpenAiChat(messages) {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: 0.3, // 每次返回的答案的相似度0-1（0：每次都一样，1：每次都不一样）
    max_tokens: 4000,
    top_p: 1,
    presence_penalty: 0.6,
  })
  console.log('↓↓↓↓↓↓↓↓↓↓response↓↓↓↓↓↓↓↓↓↓')
  console.log(JSON.stringify(response.data))
  console.log('↑↑↑↑↑↑↑↑↑response↑↑↑↑↑↑↑↑↑')
  const reply = await markdownToText(response.data.choices[0].message.content)
  console.log('reply----->', reply)
  return {
    message: response.data.choices[0].message,
    reply: reply
  }
}

async function markdownToText(markdown) {
  return remark()
    .use(stripMarkdown)
    .processSync(markdown ?? '')
    .toString()
}
