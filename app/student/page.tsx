import ChatRoom from '../components/ChatRoom';

export default function StudentPage() {
  return (
    <ChatRoom
      role="student"
      accentColor="blue"
      title="Goodminton Academy"
      subtitle="学员诊室 — 你的反馈直接改进课程"
      welcomeTitle="你好，学员"
      welcomeDesc="课好不好、练得顺不顺、有没有搞不懂的——什么都可以说。我会认真记录，用来优化下一次课。"
      prompts={[
        { icon: '📋', text: '上节课我最大的收获是……但还有个地方没搞懂' },
        { icon: '😤', text: '感觉某个动作练了很久还是没进步，很挫败' },
        { icon: '⏱️', text: '课程节奏有点快 / 有点慢，我跟不上 / 想要更多挑战' },
        { icon: '🏸', text: '今天练推球，力量不够，不知道哪里出了问题' },
        { icon: '🎯', text: '我有个具体的训练目标想聊聊，看怎么安排比较好' },
        { icon: '💬', text: '我有个想法想给教练提，但不知道怎么说' },
      ]}
    />
  );
}
