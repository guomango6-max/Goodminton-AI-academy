import ChatRoom from '../components/ChatRoom';

export default function FriendPage() {
  return (
    <ChatRoom
      role="friend"
      accentColor="emerald"
      title="Goodminton Academy"
      subtitle="球友咨询 — 一起把球打得更好"
      welcomeTitle="嘿，球友"
      welcomeDesc="技术问题、战术思路、双打配合、如何针对不同对手——有什么想聊的尽管问。"
      prompts={[
        { icon: '🧠', text: '我的反手总是被对手压制，该怎么改善？' },
        { icon: '🤝', text: '双打时我和搭档总是抢球/漏球，怎么建立默契？' },
        { icon: '📊', text: '我打球最大的弱点是什么，怎么针对性地练？' },
        { icon: '⚡', text: '怎么让自己的进攻更有变化，不容易被读懂？' },
        { icon: '🔄', text: '从后场转换到网前总是慢半拍，步法怎么练？' },
        { icon: '🎮', text: '下次打球想约一场，能帮我制定个简单的比赛策略吗？' },
      ]}
    />
  );
}
