import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

export function DailyQuests({ userBalance, onBalanceUpdate, userId, selectedGroupId, vkId }) {
  const [quests, setQuests] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completedQuestsIds, setCompletedQuestsIds] = useState({});
  const [claimedQuestsIds, setClaimedQuestsIds] = useState({});
  const [lastLoginDate, setLastLoginDate] = useState(null);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);

  const loadQuestsFromDB = async () => {
    if (!selectedGroupId) return [];
    
    try {
      const response = await fetch(`${API_URL}/api/quests/${selectedGroupId}`);
      if (response.ok) {
        const questsData = await response.json();
        const now = new Date();
        const transformed = questsData
          .filter(q => {
            if (!q.active) return false;
            const createdAt = new Date(q.created_at);
            const expiresDays = q.expires_days || 30;
            const expiresAt = new Date(createdAt.getTime() + expiresDays * 24 * 60 * 60 * 1000);
            return expiresAt > now;
          })
          .map(q => ({
            id: q.id,
            title: q.title,
            description: q.description || '',
            reward: q.reward,
            type: mapQuestType(q.title),
            target: getTargetByType(q.title),
            progress: 0,
            completed: false,
            claimed: false,
            emoji: q.emoji || '✅'
          }));
        return transformed;
      }
    } catch (error) {
      console.error('Ошибка загрузки заданий из БД:', error);
    }
    
    return [
      { id: 1, title: 'Ежедневный вход', description: 'Заходите в приложение каждый день', reward: 10, type: 'daily_login', target: 1, progress: 0, completed: false, claimed: false, emoji: '✅' },
      { id: 2, title: 'Покрутить колесо', description: 'Сыграйте в Колесо фортуны', reward: 15, type: 'spin_wheel', target: 1, progress: 0, completed: false, claimed: false, emoji: '🎡' },
      { id: 3, title: 'Пригласить друга', description: 'Поделитесь приложением', reward: 50, type: 'invite_friend', target: 1, progress: 0, completed: false, claimed: false, emoji: '👥' }
    ];
  };

  const loadUserProgress = async () => {
    if (!userId || !selectedGroupId) return null;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/quests/progress/all`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Ошибка загрузки прогресса из БД:', error);
    }
    return null;
  };

  const saveProgressToDB = async (questsData, totalEarnedData, streakData, lastLoginData) => {
    if (!userId || !selectedGroupId) return;
    
    try {
      await fetch(`${API_URL}/api/users/${userId}/quests/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedGroupId,
          quests: questsData.map(q => ({
            id: q.id,
            progress: q.progress,
            completed: q.completed,
            claimed: q.claimed
          })),
          totalEarned: totalEarnedData,
          streak: streakData,
          lastLoginDate: lastLoginData || new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Ошибка сохранения прогресса в БД:', error);
    }
  };

  const saveCompletedQuestToDB = async (questId, reward) => {
    if (!userId) return false;
    
    try {
      const response = await fetch(`${API_URL}/api/users/completeQuest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          questId: questId,
          reward: reward
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Ошибка сохранения выполненного задания в БД:', error);
      return false;
    }
  };

  const checkAndClaimDailyBonus = async () => {
    if (!userId || !selectedGroupId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/dailyBonus/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          companyId: selectedGroupId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Если ежедневный бонус отключен в CRM
        if (data.disabled) {
          setDailyBonusClaimed(true);
          return;
        }
        
        if (!data.claimed) {
          // Используем настройки из CRM
          const settings = data.settings || { baseAmount: 10, streakBonus: 5 };
          const bonusAmount = (settings.baseAmount || 10) + Math.floor(streak / 7) * (settings.streakBonus || 5);
          
          const claimResponse = await fetch(`${API_URL}/api/users/dailyBonus/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              companyId: selectedGroupId,
              bonusAmount: bonusAmount,
              streak: streak + 1
            })
          });
          
          if (claimResponse.ok) {
            if (onBalanceUpdate) {
              await onBalanceUpdate(bonusAmount, 'earn');
            }
            setStreak(prev => prev + 1);
            setDailyBonusClaimed(true);
            showNotification(`Ежедневный бонус! +${bonusAmount} бонусов! Серия: ${streak + 1} дней 🔥`);
            updateQuestProgress('daily_login', 1);
          }
        } else {
          setDailyBonusClaimed(true);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки ежедневного бонуса:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      const loadedQuests = await loadQuestsFromDB();
      const savedProgress = await loadUserProgress();
      
      if (savedProgress && savedProgress.quests) {
        const mergedQuests = loadedQuests.map(quest => {
          const saved = savedProgress.quests.find(q => q.id === quest.id);
          if (saved) {
            return { ...quest, ...saved };
          }
          return quest;
        });
        setQuests(mergedQuests);
        setTotalEarned(savedProgress.totalEarned || 0);
        setStreak(savedProgress.streak || 0);
        setLastLoginDate(savedProgress.lastLoginDate);
        
        const completed = {};
        const claimed = {};
        mergedQuests.forEach(q => {
          if (q.completed) completed[q.id] = true;
          if (q.claimed) claimed[q.id] = true;
        });
        setCompletedQuestsIds(completed);
        setClaimedQuestsIds(claimed);
      } else {
        setQuests(loadedQuests);
      }
      
      setLoading(false);
    };
    
    if (selectedGroupId && userId) {
      init();
    }
  }, [selectedGroupId, userId]);

  useEffect(() => {
    if (!loading && userId && selectedGroupId && !dailyBonusClaimed) {
      checkAndClaimDailyBonus();
    }
  }, [loading, userId, selectedGroupId]);

  useEffect(() => {
    if (!loading && quests.length > 0 && userId && selectedGroupId) {
      saveProgressToDB(quests, totalEarned, streak, lastLoginDate);
    }
  }, [quests, totalEarned, streak, loading, userId, selectedGroupId]);

  const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2ecc71;padding:12px 20px;border-radius:30px;color:white;z-index:1000;animation:slideUp 0.3s ease;">
        🎉 ${message}
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const updateQuestProgress = (questType, increment = 1, value = null) => {
    setQuests(prev => {
      const updated = prev.map(quest => {
        if (quest.type === questType && !quest.completed && !quest.claimed) {
          let newProgress = value !== null ? Math.min(value, quest.target) : Math.min(quest.progress + increment, quest.target);
          const completed = newProgress >= quest.target;
          return { ...quest, progress: newProgress, completed };
        }
        return quest;
      });
      return updated;
    });
  };

  const claimReward = async (questId) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) return;
    
    const saved = await saveCompletedQuestToDB(questId, quest.reward);
    
    if (saved) {
      const updated = quests.map(q => 
        q.id === questId ? { ...q, claimed: true } : q
      );
      setQuests(updated);
      setTotalEarned(prev => prev + quest.reward);
      setClaimedQuestsIds(prev => ({ ...prev, [questId]: true }));
      
      if (onBalanceUpdate) {
        await onBalanceUpdate(quest.reward, 'earn');
      }
      
      showNotification(`Задание "${quest.title}" выполнено! +${quest.reward} бонусов!`);
    }
  };

  const resetNonPersistentQuests = () => {
    setQuests(prev => prev.map(q => {
      if (q.type !== 'reach_balance' && q.type !== 'spend_bonus') {
        return { ...q, progress: 0, completed: false, claimed: false };
      }
      return q;
    }));
  };

  useEffect(() => {
    const checkDailyLogin = () => {
      if (!userId || !selectedGroupId) return;
      
      const today = new Date().toDateString();
      const lastLogin = lastLoginDate ? new Date(lastLoginDate).toDateString() : null;
      
      if (lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin === yesterday.toDateString()) {
          setStreak(prev => prev + 1);
        } else {
          setStreak(1);
          resetNonPersistentQuests();
        }
        
        setLastLoginDate(new Date().toISOString());
        updateQuestProgress('daily_login', 1);
      }
    };
    
    if (!loading && lastLoginDate !== undefined) {
      checkDailyLogin();
    }
  }, [loading, userId, selectedGroupId, lastLoginDate]);

  useEffect(() => {
    if (userBalance !== undefined) {
      updateQuestProgress('reach_balance', 0, userBalance);
    }
  }, [userBalance]);

  useEffect(() => {
    window.updateQuestProgress = updateQuestProgress;
    return () => delete window.updateQuestProgress;
  }, []);

  function mapQuestType(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('вход')) return 'daily_login';
    if (lowerTitle.includes('колесо')) return 'spin_wheel';
    if (lowerTitle.includes('друг') || lowerTitle.includes('пригласи')) return 'invite_friend';
    if (lowerTitle.includes('накопить')) return 'reach_balance';
    if (lowerTitle.includes('потратить')) return 'spend_bonus';
    if (lowerTitle.includes('покупк')) return 'make_purchase';
    return 'daily_login';
  }
  
  function getTargetByType(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('накопить')) return 500;
    if (lowerTitle.includes('потратить')) return 200;
    if (lowerTitle.includes('покупк')) return 3;
    return 1;
  }

  const getCompletedCount = () => quests.filter(q => q.completed).length;
  const totalAvailable = quests.reduce((sum, q) => sum + (q.completed && !q.claimed ? q.reward : 0), 0);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: 20, color: 'white' }}>
          Загрузка заданий...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>📋 Ежедневные задания</h3>
          <div style={styles.streak}>🔥 Серия: {streak} дней</div>
        </div>
        <div style={styles.rewardInfo}>
          🎁 Доступно: {totalAvailable} бонусов
        </div>
      </div>
      
      <div style={styles.progressOverview}>
        <div style={styles.progressBarContainer}>
          <div style={{...styles.progressBarFill, width: quests.length > 0 ? `${(getCompletedCount()/quests.length)*100}%` : '0%'}} />
        </div>
        <div style={styles.progressText}>
          Выполнено {getCompletedCount()} из {quests.length}
        </div>
      </div>
      
      <div style={styles.questsList}>
        {quests.map(quest => (
          <div 
            key={quest.id} 
            style={{
              ...styles.questItem, 
              background: quest.completed ? 'rgba(46,204,113,0.15)' : 'rgba(0,0,0,0.3)', 
              borderLeft: quest.completed ? '3px solid #2ecc71' : '3px solid transparent',
              opacity: quest.claimed ? 0.6 : 1
            }}
          >
            <div style={styles.questInfo}>
              <div style={styles.questTitle}>
                <span style={{ fontSize: 24, marginRight: 8 }}>{quest.emoji}</span>
                {quest.title}
              </div>
              <div style={styles.questDescription}>{quest.description}</div>
              {quest.target > 1 && (
                <div style={styles.questProgress}>
                  <div style={styles.progressBarContainerSmall}>
                    <div style={{...styles.progressBarFillSmall, width: `${(quest.progress/quest.target)*100}%`}} />
                  </div>
                  <span style={styles.progressTextSmall}>{quest.progress}/{quest.target}</span>
                </div>
              )}
            </div>
            <div style={styles.questReward}>
              <div style={styles.rewardValue}>+{quest.reward}</div>
              <div style={styles.rewardLabel}>бонусов</div>
              {!quest.completed ? (
                <div style={styles.statusPending}>⏳ Не выполнено</div>
              ) : quest.claimed ? (
                <div style={styles.statusClaimed}>✅ Получено</div>
              ) : (
                <button onClick={() => claimReward(quest.id)} style={styles.claimButton}>
                  Забрать
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {quests.length === 0 && (
        <div style={{ textAlign: 'center', padding: 20, opacity: 0.7, color: 'white' }}>
          Нет активных заданий
        </div>
      )}
      
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

const styles = {
  container: { 
    background: 'rgba(30, 35, 48, 0.7)', 
    borderRadius: 28, 
    padding: 20, 
    marginBottom: 20 
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16, 
    flexWrap: 'wrap', 
    gap: 10 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 700, 
    margin: 0, 
    color: 'white' 
  },
  streak: { 
    fontSize: 12, 
    color: '#ffd966', 
    marginTop: 4 
  },
  rewardInfo: { 
    fontSize: 13, 
    color: '#ffd966', 
    background: 'rgba(255,215,0,0.15)', 
    padding: '6px 12px', 
    borderRadius: 20 
  },
  progressOverview: { 
    marginBottom: 20, 
    padding: '12px 16px', 
    background: 'rgba(0,0,0,0.3)', 
    borderRadius: 16 
  },
  progressBarContainer: { 
    height: 6, 
    background: 'rgba(255,255,255,0.2)', 
    borderRadius: 3, 
    overflow: 'hidden', 
    marginBottom: 8 
  },
  progressBarFill: { 
    height: '100%', 
    background: 'linear-gradient(90deg,#2ecc71,#27ae60)', 
    borderRadius: 3, 
    transition: 'width 0.3s' 
  },
  progressText: { 
    fontSize: 11, 
    opacity: 0.7, 
    textAlign: 'center',
    color: 'white' 
  },
  questsList: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 10 
  },
  questItem: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '14px 16px', 
    borderRadius: 20, 
    flexWrap: 'wrap', 
    gap: 12 
  },
  questInfo: { 
    flex: 1 
  },
  questTitle: { 
    fontWeight: 700, 
    marginBottom: 4,
    color: 'white',
    display: 'flex',
    alignItems: 'center'
  },
  questDescription: { 
    fontSize: 12, 
    opacity: 0.7, 
    marginBottom: 8,
    color: 'white' 
  },
  questProgress: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10 
  },
  progressBarContainerSmall: { 
    flex: 1, 
    height: 4, 
    background: 'rgba(255,255,255,0.2)', 
    borderRadius: 2, 
    overflow: 'hidden' 
  },
  progressBarFillSmall: { 
    height: '100%', 
    background: '#ffd966', 
    borderRadius: 2, 
    transition: 'width 0.3s' 
  },
  progressTextSmall: { 
    fontSize: 10, 
    opacity: 0.7, 
    minWidth: 50,
    color: 'white' 
  },
  questReward: { 
    textAlign: 'center', 
    minWidth: 90 
  },
  rewardValue: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#ffd966' 
  },
  rewardLabel: { 
    fontSize: 10, 
    opacity: 0.7, 
    marginBottom: 8,
    color: 'white' 
  },
  statusPending: { 
    fontSize: 11, 
    color: '#aaa' 
  },
  statusClaimed: { 
    fontSize: 11, 
    color: '#2ecc71' 
  },
  claimButton: { 
    background: '#ff4d4d', 
    border: 'none', 
    padding: '6px 12px', 
    borderRadius: 20, 
    color: 'white', 
    fontSize: 12, 
    cursor: 'pointer', 
    width: '100%' 
  }
};