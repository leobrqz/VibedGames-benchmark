export const createQuestSystem = ({ onReward, onLog }) => {
  const quests = [
    { id: 'clear-camps', label: 'Clear 3 camps', progress: 0, target: 3, rewardXp: 45, completed: false },
    { id: 'collect-items', label: 'Collect 5 items', progress: 0, target: 5, rewardXp: 25, completed: false },
  ];

  const advance = (questId, amount = 1) => {
    const quest = quests.find((entry) => entry.id === questId);
    if (!quest || quest.completed) {
      return;
    }
    quest.progress = Math.min(quest.target, quest.progress + amount);
    if (quest.progress >= quest.target) {
      quest.completed = true;
      onReward?.(quest.rewardXp);
      onLog?.(`${quest.label} complete`);
    }
  };

  return {
    quests,
    onCampCleared() {
      advance('clear-camps');
    },
    onItemCollected() {
      advance('collect-items');
    },
  };
};