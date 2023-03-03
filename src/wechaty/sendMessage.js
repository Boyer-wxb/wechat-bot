import { getOpenAiReply as getReply, getOpenAiChat } from '../openai/index.js'
import { botName, roomWhiteList, aliasWhiteList } from '../../config.js'

/**
 * 默认消息发送
 * @param msg
 * @param bot
 * @returns {Promise<void>}
 */
export async function defaultMessage(msg, bot) {
  const contact = msg.talker() // 发消息人
  const receiver = msg.to() // 消息接收人
  const content = msg.text() // 消息内容
  const room = msg.room() // 是否是群消息
  const roomName = (await room?.topic()) || null // 群名称
  const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
  const remarkName = await contact.alias() // 备注名称
  const name = await contact.name() // 微信名称
  const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
  const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
  const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
  const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己
  // console.debug('msg解析:',contact,'|', receiver,'|', content, '|',room, '|',roomName,'|', alias,'|', remarkName,'|', name, '|',isText,'|', isRoom, '|',isAlias, '|',isBotSelf)
  // TODO 你们可以根据自己的需求修改这里的逻辑
  if (isText && !isBotSelf) {
    const now = Date.now();
    if ((now - 1e3 * msg.payload.timestamp) > 200000
    ) {
      console.debug('跳过过期消息：',content , ', 超时时间：', now - 1e3 * msg.payload.timestamp)
      return 
    }
    // if (!content.startsWith('? ') && !content.startsWith('？ ') && !content.startsWith('> ')) {
    //   console.log('跳过?判断')
    //   return 
    // }
    console.debug(JSON.stringify(msg))

    try {
      const trimed = content.substr(1)
      if (trimed.length < 5) 
      {
        console.debug('msg trimed:', trimed)
        return 
      }
      // 区分群聊和私聊
      if (isRoom && room) {
        await room.say(await getReply(trimed.replace(`${botName}`, '')))
      } 
      // 私人聊天，白名单内的直接发送
      else if (isAlias && !room) {
        await contact.say(await getReply(trimed))
      }
    } catch (e) {
      console.error(e)
    }
  }
}

var currentSession = buildSession()
/**
 * 聊天消息发送
 * @param msg
 * @param bot
 * @returns {Promise<void>}
 */
export async function chatMessage(msg, bot) {
  const contact = msg.talker() // 发消息人
  const receiver = msg.to() // 消息接收人
  const content = msg.text() // 消息内容
  const room = msg.room() // 是否是群消息
  const roomName = (await room?.topic()) || null // 群名称
  const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
  const remarkName = await contact.alias() // 备注名称
  const name = await contact.name() // 微信名称
  const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
  const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
  const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
  const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己

  if (!isRoom || !isText) return
  if (content.indexOf('开始新会话') > 0) {
    currentSession = buildSession()
  }
  freshSession()
  if(isBotSelf){
    currentSession.messages.push(buildAss(content))
  }else{
    const prompt = content.substr(1).replace(`${botName}`, '')
    currentSession.messages.push(buildUser(prompt))
  }

  if(currentSession.messages.length > currentSession.maxContext){
    currentSession.messages = currentSession.messages.slice(1)
  }

  try {
    fmtMsg()
    const res = await getOpenAiChat(currentSession.messages)
    currentSession.messages.push(res.message)
    await room.say(res.reply)
  } catch (error) {
    console.error(error)
  }
}

function buildUser(msg) {
  return { role: 'user', content: msg}
}

function buildAss(msg) {
  return { role: 'assistant', content: msg}
}

function freshSession() {
  if (!currentSession) {
    currentSession = buildSession()
    return
  }
  const now = Date.now()
  if ((now - currentSession.createTime)/(1000*60) > 15){
    //session过期
    currentSession = buildSession()
  }
}

function buildSession() {
  return {
    createTime: Date.now(),
    expired: 15, //过期时间15分钟
    messages: [],
    maxContext: 20, //最大上下文数量
  }
}

function fmtMsg(){
  currentSession.messages.forEach(e=>{
    e.content = e.content.replace('(\n|\r|(\r\n)|(\u0085)|(\u2028)|(\u2029))', '')
  })
}
