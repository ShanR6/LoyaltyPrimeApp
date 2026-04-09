import { useState, useEffect } from 'react';
import vkBridge from '@vkontakte/vk-bridge';
import './App.css';
import { GameWheel } from './components/GameWheel';
import { ScratchCard } from './components/ScratchCard';
import { DailyQuests } from './components/DailyQuests';
import { ReferralSystem } from './components/ReferralSystem';
import { LoyaltyCard } from './components/LoyaltyCard';

const API_URL = 'http://localhost:3001';

export function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [step, setStep] = useState('welcome');
  const [userGroupsData, setUserGroupsData] = useState({});
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState({ show: false, title: '', message: '' });
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [tiers, setTiers] = useState([]);
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userTierData, setUserTierData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Функция принудительного обновления данных об уровнях
  const refreshTierData = async () => {
    if (!userId || !selectedGroup) return;
    
    setRefreshing(true);
    try {
      console.log('🔄 Обновление данных об уровнях...');
      
      // Обновляем уровни компании
      const tiersResponse = await fetch(`${API_URL}/api/companies/${selectedGroup.id}/tiers`);
      const tiersData = await tiersResponse.json();
      console.log('📊 Получены уровни компании:', tiersData);
      
      if (tiersData.success && tiersData.tiers && tiersData.tiers.length > 0) {
        setTiers(tiersData.tiers);
      }
      
      // Обновляем данные пользователя
      const userTierResponse = await fetch(`${API_URL}/api/users/${userId}/tier`);
      const userTierDataResult = await userTierResponse.json();
      console.log('👤 Получены данные пользователя:', userTierDataResult);
      
      if (userTierDataResult.success) {
        setUserTierData(userTierDataResult);
      }
    } catch (error) {
      console.error('Ошибка обновления данных уровней:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadTiersFromServer = async (companyId, userId) => {
    if (!companyId) return [];
    
    try {
      const response = await fetch(`${API_URL}/api/companies/${companyId}/tiers`);
      const data = await response.json();
      console.log('📊 Загрузка уровней компании:', data);
      
      if (data.success && data.tiers && data.tiers.length > 0) {
        setTiers(data.tiers);
        
        if (userId) {
          const userTierResponse = await fetch(`${API_URL}/api/users/${userId}/tier`);
          const userTierDataResult = await userTierResponse.json();
          console.log('👤 Загрузка данных пользователя:', userTierDataResult);
          if (userTierDataResult.success) {
            setUserTierData(userTierDataResult);
          }
        }
        return data.tiers;
      } else {
        // Дефолтные уровни если нет данных
        const defaultTiers = [
          { name: "Новичок", threshold: 0, multiplier: 1, cashback: 5, color: "#95a5a6", icon: "🌱" },
          { name: "Серебро", threshold: 1000, multiplier: 1.2, cashback: 6, color: "#bdc3c7", icon: "🥈" },
          { name: "Золото", threshold: 5000, multiplier: 1.5, cashback: 7.5, color: "#f1c40f", icon: "🥇" },
          { name: "Платина", threshold: 20000, multiplier: 2, cashback: 10, color: "#3498db", icon: "💎" }
        ];
        setTiers(defaultTiers);
        return defaultTiers;
      }
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
      const defaultTiers = [
        { name: "Новичок", threshold: 0, multiplier: 1, cashback: 5, color: "#95a5a6", icon: "🌱" },
        { name: "Серебро", threshold: 1000, multiplier: 1.2, cashback: 6, color: "#bdc3c7", icon: "🥈" },
        { name: "Золото", threshold: 5000, multiplier: 1.5, cashback: 7.5, color: "#f1c40f", icon: "🥇" },
        { name: "Платина", threshold: 20000, multiplier: 2, cashback: 10, color: "#3498db", icon: "💎" }
      ];
      setTiers(defaultTiers);
      return defaultTiers;
    }
  };

  const getCurrentTier = () => {
    if (userTierData && userTierData.currentTier) {
      return userTierData.currentTier;
    }
    if (tiers && tiers.length > 0) {
      return tiers[0];
    }
    return { name: 'Новичок', multiplier: 1, threshold: 0, color: '#95a5a6', icon: '🌱', cashback: 5 };
  };
  
  const getNextTier = () => {
    if (userTierData && userTierData.nextTier) {
      return userTierData.nextTier;
    }
    if (tiers && tiers.length > 1) {
      return tiers[1];
    }
    return null;
  };
  
  const getProgressToNextTier = () => {
    if (userTierData && userTierData.progressToNext !== undefined) {
      return userTierData.progressToNext;
    }
    return 0;
  };

  const getTotalEarned = () => {
    if (userTierData && userTierData.totalEarned !== undefined) {
      return userTierData.totalEarned;
    }
    return 0;
  };

  const getProgressGradient = () => {
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    
    if (nextTier) {
      return `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`;
    }
    return `linear-gradient(90deg, ${currentTier.color}, ${currentTier.color})`;
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const response = await fetch(`${API_URL}/api/companies/list`);
        const companies = await response.json();
        if (companies && companies.length > 0) {
          setAvailableCompanies(companies);
        }
      } catch (error) {
        console.error('Ошибка загрузки компаний:', error);
        setAvailableCompanies([
          { id: 1, company: 'Пиццерия "Маргарита"', brandColor: '#e74c3c', description: 'Итальянская кухня' },
          { id: 2, company: 'Кофейня "Кофеин"', brandColor: '#8e44ad', description: 'Ароматный кофе' }
        ]);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  const loadUserData = async (companyId, vkUserId, userName) => {
    try {
      const response = await fetch(`${API_URL}/api/users/getOrCreate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vkId: vkUserId,
          companyId: companyId,
          name: userName
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setUserId(data.user.id);
        
        const promosResponse = await fetch(`${API_URL}/api/promotions/${companyId}`);
        if (promosResponse.ok) {
          const promos = await promosResponse.json();
          setPromotions(promos.filter(p => p.active));
        }
        
        await loadTiersFromServer(companyId, data.user.id);
        return data;
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
    return null;
  };

  const saveAllGroupsData = (userId, data) => {
    if (userId) localStorage.setItem(`loyaltyPrime_groups_${userId}`, JSON.stringify(data));
  };
  
  const loadAllGroupsData = (userId) => {
    if (!userId) return;
    const saved = localStorage.getItem(`loyaltyPrime_groups_${userId}`);
    if (saved) {
      try { setUserGroupsData(JSON.parse(saved)); } catch(e) {}
    } else {
      const initial = {};
      availableCompanies.forEach(c => {
        initial[c.id] = {
          bonusBalance: 100, totalEarned: 100, totalSpent: 0,
          regDate: new Date().toLocaleDateString('ru-RU'), lastDaily: null,
          participatedRaffles: {},
          history: [{ id: Date.now(), desc: `Приветственные бонусы в "${c.company}"`, points: '+100', date: new Date().toLocaleString(), type: 'earn' }]
        };
      });
      setUserGroupsData(initial);
      saveAllGroupsData(userId, initial);
    }
  };
  
  const getCurrentGroupData = () => {
    if (!selectedGroup) return null;
    return userGroupsData[selectedGroup.id] || { bonusBalance: 0, totalEarned: 0, totalSpent: 0, regDate: new Date().toLocaleDateString('ru-RU'), lastDaily: null, participatedRaffles: {}, history: [] };
  };
  
  const saveCurrentGroupData = (newData) => {
    if (!selectedGroup || !userInfo?.id) return;
    const updated = { ...userGroupsData, [selectedGroup.id]: newData };
    setUserGroupsData(updated);
    saveAllGroupsData(userInfo.id, updated);
  };
  
  const addHistory = (desc, pointsChange, type) => {
    if (!selectedGroup) return;
    const cur = getCurrentGroupData();
    const sign = type === 'earn' ? '+' : '-';
    const newHistory = [{ id: Date.now(), desc, points: `${sign}${Math.abs(pointsChange)}`, date: new Date().toLocaleString(), type }, ...(cur.history || [])].slice(0,50);
    saveCurrentGroupData({ ...cur, history: newHistory });
  };
  
  const updateBalanceAndStats = async (change, type) => {
    if (!selectedGroup) return false;
    const cur = getCurrentGroupData();
    let newBalance = cur.bonusBalance + change;
    if (newBalance < 0) {
      showModal('Недостаточно бонусов', `Не хватает ${Math.abs(change)} баллов в "${selectedGroup.name}"`);
      return false;
    }
    
    if (userId) {
      try {
        await fetch(`${API_URL}/api/users/updateBalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            change: change,
            type: type,
            description: type === 'earn' ? `Начисление ${change} бонусов` : `Списание ${Math.abs(change)} бонусов`
          })
        });
        
        if (type === 'earn') {
          await refreshTierData();
        }
      } catch (error) {
        console.error('Ошибка обновления баланса:', error);
      }
    }
    
    const newData = { ...cur, bonusBalance: newBalance };
    if (type === 'earn') {
      newData.totalEarned = cur.totalEarned + change;
      addHistory(`Начисление +${change}`, change, 'earn');
    } else if (type === 'spend') {
      newData.totalSpent = cur.totalSpent + Math.abs(change);
      addHistory(`Списание: ${Math.abs(change)} баллов`, change, 'spend');
    }
    saveCurrentGroupData(newData);
    return true;
  };
  
  const showModal = (title, message) => setModal({ show: true, title, message });
  const closeModal = () => setModal({ show: false, title: '', message: '' });

  const exchangeReward = (reward) => {
    const cur = getCurrentGroupData();
    if (cur.bonusBalance >= reward.cost) {
      if (updateBalanceAndStats(-reward.cost, 'spend')) {
        showModal('Успешно!', `Вы обменяли ${reward.title} в "${selectedGroup.name}". Бонусы списаны.`);
      }
    } else {
      showModal('Недостаточно баллов', `Вам не хватает ${reward.cost - cur.bonusBalance} бонусов в "${selectedGroup.name}"`);
    }
  };

  useEffect(() => {
    const getUserData = async () => {
      try {
        const data = await vkBridge.send('VKWebAppGetUserInfo');
        setUserInfo(data);
        loadAllGroupsData(data.id);
      } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
      } finally {
        setLoading(false);
      }
    };
    getUserData();
  }, []);

  const handleSelectGroup = async (company) => {
    setSelectedGroup({ 
      id: company.id, 
      name: company.company, 
      color: company.brandColor, 
      icon: '🏢', 
      description: company.description 
    });
    
    if (userInfo?.id) {
      await loadUserData(company.id, userInfo.id, `${userInfo.first_name} ${userInfo.last_name}`);
    }
    setStep('profile');
  };

  const getRewardsForGroup = (groupId) => {
    return [
      { id: 1, title: '🍕 Маленькая пицца', cost: 100, description: '30% скидка', popular: true },
      { id: 2, title: '🥤 Бесплатный напиток', cost: 50, description: 'в подарок' },
      { id: 3, title: '🍰 Десерт', cost: 75, description: 'Чизкейк или мороженое' }
    ];
  };
  
  const getInitials = (firstName, lastName) => {
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    return firstName ? firstName[0].toUpperCase() : '?';
  };

  if (loading) return <div style={{ padding:20, textAlign:'center', color:'white', background:'#1a1f2e', minHeight:'100vh' }}>Загрузка...</div>;

  const initials = getInitials(userInfo?.first_name, userInfo?.last_name);
  
  if (step === 'welcome') {
    return (
      <div style={{ maxWidth:500, margin:'0 auto', padding:20, minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', background:'#1a1f2e' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:100, height:100, background:'linear-gradient(145deg,#ff7e5e,#ff4d4d)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, margin:'0 auto 24px' }}>{initials}</div>
          <h1 style={{ fontSize:28, marginBottom:8, color:'white' }}>Добро пожаловать!</h1>
          <p style={{ fontSize:16, opacity:0.8, marginBottom:32, color:'white' }}>{userInfo?.first_name}, рады видеть вас в LoyaltyPrime</p>
          <button onClick={() => setStep('selectGroup')} style={{ background:'#ff4d4d', border:'none', padding:'16px 32px', borderRadius:40, color:'white', fontSize:18, fontWeight:600, cursor:'pointer', width:'100%', maxWidth:280 }}>Начать →</button>
        </div>
      </div>
    );
  }
  
  if (step === 'selectGroup') {
    if (loadingCompanies) return <div style={{ padding:20, textAlign:'center', color:'white', background:'#1a1f2e', minHeight:'100vh' }}>Загрузка списка заведений...</div>;
    return (
      <div style={{ maxWidth:500, margin:'0 auto', padding:20, background:'#1a1f2e', minHeight:'100vh' }}>
        <div style={{ textAlign:'center', marginBottom:30 }}><h2 style={{ fontSize:24, marginBottom:8, color:'white' }}>Выберите заведение</h2><p style={{ opacity:0.7, color:'white' }}>В каком заведении хотите копить бонусы?</p></div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {availableCompanies.map(company => (
            <div key={company.id} style={{ background:'rgba(30,35,48,0.8)', borderRadius:24, border:`1px solid ${company.brandColor}40`, cursor:'pointer' }} onClick={() => handleSelectGroup(company)}>
              <div style={{ display:'flex', alignItems:'center', padding:16 }}><div style={{ fontSize:48, marginRight:16 }}>🏢</div><div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:18, color:'white' }}>{company.company}</div><div style={{ fontSize:12, opacity:0.7, color:'white' }}>{company.description}</div></div><div style={{ fontSize:24, color:'white' }}>→</div></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentGroupData = getCurrentGroupData();
  const currentBalance = currentGroupData?.bonusBalance || 0;
  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progressToNext = getProgressToNextTier();
  const totalEarned = getTotalEarned();
  const currentRewards = getRewardsForGroup(selectedGroup.id);
  const progressGradient = getProgressGradient();

  return (
    <div style={{ maxWidth:500, margin:'0 auto', padding:'20px 16px 30px', background:'#1a1f2e', minHeight:'100vh' }}>
      {/* Кнопка принудительного обновления */}
      <div style={{ textAlign:'right', marginBottom:8 }}>
        <button 
          onClick={refreshTierData} 
          style={{ background:'rgba(255,255,255,0.1)', border:'none', padding:'6px 12px', borderRadius:20, color:'white', fontSize:11, cursor:'pointer' }}
          disabled={refreshing}
        >
          {refreshing ? '🔄 Обновление...' : '🔄 Обновить уровни'}
        </button>
      </div>

      <header style={{ background:`linear-gradient(135deg, ${selectedGroup.color}40, rgba(30,35,48,0.9))`, borderRadius:28, padding:20, marginBottom:20, border:`1px solid ${selectedGroup.color}60` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:52, height:52, background:`linear-gradient(145deg, ${selectedGroup.color}, ${selectedGroup.color}cc)`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{selectedGroup.icon}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:'white' }}>{userInfo?.first_name} {userInfo?.last_name}</div>
              <div style={{ fontSize:11, opacity:0.7, color:'white' }}>{selectedGroup.name}</div>
            </div>
          </div>
          <button onClick={() => setStep('selectGroup')} style={{ background:'rgba(255,255,255,0.15)', border:'none', padding:'8px 12px', borderRadius:20, color:'white', fontSize:12, cursor:'pointer' }}>🔄 Сменить</button>
        </div>
        
        {/* Карточка баланса */}
        <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:20, padding:16, marginBottom:12, cursor:'pointer' }} onClick={() => setShowTiersModal(true)}>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:8, color:'white', display:'flex', alignItems:'center', gap:8 }}>
            <span>{currentTier.icon}</span>
            <span>{currentTier.name}</span>
          </div>
          <div style={{ fontSize:36, fontWeight:800, marginBottom:12, color:'white' }}>
            {currentBalance.toLocaleString()} <span style={{ fontSize:14, fontWeight:400 }}>бонусов</span>
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ background:'rgba(255,255,255,0.2)', height:8, borderRadius:20, overflow:'hidden' }}>
              <div style={{ width:`${progressToNext}%`, height:'100%', background:progressGradient, borderRadius:20, transition:'width 0.3s ease' }} />
            </div>
          </div>
          {nextTier ? (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, opacity:0.7, color:'white' }}>
              <span>{currentTier.name}</span>
              <span>до {nextTier.name}</span>
              <span>{Math.max(0, nextTier.threshold - totalEarned).toLocaleString()} бонусов</span>
            </div>
          ) : (
            <div style={{ fontSize:11, opacity:0.7, textAlign:'center', color:'white' }}>🏆 Максимальный уровень достигнут!</div>
          )}
          <div style={{ fontSize:10, textAlign:'center', marginTop:8, opacity:0.5, color:'white' }}>👆 Нажмите, чтобы увидеть все уровни</div>
        </div>
        
        <div style={{ display:'flex', justifyContent:'center', gap:16, background:'rgba(0,0,0,0.3)', borderRadius:16, padding:'8px 12px' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, opacity:0.7, color:'white' }}>Множитель</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#ffd966' }}>x{currentTier.multiplier}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, opacity:0.7, color:'white' }}>Кешбэк</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#ffd966' }}>{currentTier.cashback || (currentTier.multiplier * 5)}%</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, opacity:0.7, color:'white' }}>Всего заработано</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#ffd966' }}>{totalEarned.toLocaleString()}</div>
          </div>
        </div>
      </header>

      <nav style={{ display:'flex', gap:8, background:'rgba(0,0,0,0.3)', padding:6, borderRadius:60, marginBottom:24, flexWrap:'wrap', justifyContent:'center' }}>
        {['home','card','offers','games','quests','referral','history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex:'0 1 auto', background:activeTab===tab ? '#ff4d4d' : 'transparent', border:'none', padding:'10px 12px', borderRadius:40, fontSize:12, fontWeight:600, color:activeTab===tab ? 'white' : '#aaa', cursor:'pointer', whiteSpace:'nowrap' }}>
            {tab==='home'?'🏠 Главная':tab==='card'?'🎫 Карта':tab==='offers'?'🎁 Акции':tab==='games'?'🎮 Игры':tab==='quests'?'📋 Задания':tab==='referral'?'👥 Друзья':'📜 История'}
          </button>
        ))}
      </nav>

      {activeTab === 'card' && (
        <LoyaltyCard 
          userInfo={userInfo} 
          userBalance={currentBalance} 
          selectedGroup={selectedGroup} 
          onBalanceUpdate={updateBalanceAndStats} 
          tiers={tiers} 
          userTierData={userTierData}
          onRefresh={refreshTierData}
        />
      )}
      
      {activeTab === 'home' && (
        <>
          <div style={{ background:`linear-gradient(135deg, ${selectedGroup.color}20, rgba(30,35,48,0.7))`, borderRadius:28, padding:20, marginBottom:20, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:8 }}>{selectedGroup.icon}</div>
            <h2 style={{ fontSize:22, marginBottom:4, color:'white' }}>{selectedGroup.name}</h2>
            <p style={{ opacity:0.8, fontSize:14, color:'white' }}>{selectedGroup.description}</p>
          </div>
          
          <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20, marginBottom:20 }}>
            <h3 style={{ fontSize:18, marginBottom:12, color:'white' }}>📊 Моя статистика</h3>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', color:'white' }}>
              <span>Всего заработано:</span>
              <span style={{ fontWeight:700, color:'#ffd966' }}>{totalEarned.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', color:'white' }}>
              <span>Потрачено бонусов:</span>
              <span style={{ fontWeight:700, color:'#ffd966' }}>{currentGroupData?.totalSpent?.toLocaleString() || 0}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', color:'white' }}>
              <span>Дата регистрации:</span>
              <span style={{ fontWeight:700, color:'#ffd966' }}>{currentGroupData?.regDate}</span>
            </div>
          </div>
          
          <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20 }}>
            <h3 style={{ fontSize:18, marginBottom:12, color:'white' }}>🎁 Обмен бонусов</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {currentRewards.map(reward => (
                <div key={reward.id} style={{ background:'rgba(0,0,0,0.3)', borderRadius:20, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700, color:'white' }}>
                      {reward.title} {reward.popular && <span style={{ fontSize:10, background:'#ffd966', color:'#1a1f2e', padding:'2px 6px', borderRadius:12, marginLeft:6 }}>🔥 Популярное</span>}
                    </div>
                    <div style={{ fontSize:12, opacity:0.7, color:'white' }}>{reward.cost} баллов • {reward.description}</div>
                  </div>
                  <button onClick={() => exchangeReward(reward)} style={{ background:'#ff4d4d', border:'none', padding:'8px 16px', borderRadius:40, color:'white', fontWeight:600, fontSize:13, cursor:'pointer' }}>Обменять</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'offers' && (
        <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20 }}>
          <h3 style={{ fontSize:18, marginBottom:12, color:'white' }}>🔥 Акции и скидки</h3>
          {promotions.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {promotions.map(offer => (
                <div key={offer.id} style={{ background:'rgba(0,0,0,0.3)', borderRadius:20, padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:24 }}>{offer.emoji1} {offer.emoji2}</span>
                    <div>
                      <div style={{ fontWeight:700, color:'white' }}>{offer.name}</div>
                      <div style={{ fontSize:12, opacity:0.7, marginTop:4, color:'white' }}>{offer.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:20, opacity:0.7, color:'white' }}>Нет активных акций</div>
          )}
        </div>
      )}
      
      {activeTab === 'games' && (
        <>
          <GameWheel onBalanceUpdate={updateBalanceAndStats} userBalance={currentBalance} />
          <ScratchCard onBalanceUpdate={updateBalanceAndStats} userBalance={currentBalance} />
        </>
      )}
      
      {activeTab === 'quests' && (
        <DailyQuests 
          userBalance={currentBalance} 
          onBalanceUpdate={updateBalanceAndStats} 
          userId={userId} 
          selectedGroupId={selectedGroup?.id}
          vkId={userInfo?.id}
        />
      )}
      
      {activeTab === 'referral' && <ReferralSystem onBalanceUpdate={updateBalanceAndStats} userId={userInfo?.id} selectedGroupId={selectedGroup?.id} />}
      
      {activeTab === 'history' && (
        <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20 }}>
          <h3 style={{ fontSize:18, marginBottom:12, color:'white' }}>📋 История операций</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {currentGroupData?.history?.length>0 ? currentGroupData.history.map(item => (
              <div key={item.id} style={{ background:'rgba(0,0,0,0.3)', borderRadius:20, padding:'14px 16px' }}>
                <div style={{ fontWeight:500, color:'white' }}>{item.desc}</div>
                <div style={{ fontSize:11, opacity:0.5, marginTop:4, color:'white' }}>{item.date}</div>
                <div style={{ fontSize:14, fontWeight:700, marginTop:6, color:item.type==='earn'?'#b5e4a0':'#ff9f8f' }}>{item.points} баллов</div>
              </div>
            )) : <div style={{ textAlign:'center', padding:24, opacity:0.6, color:'white' }}>Нет операций</div>}
          </div>
        </div>
      )}

      {showTiersModal && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.95)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }} onClick={() => setShowTiersModal(false)}>
          <div style={{ background:'linear-gradient(135deg,#1e2538,#131825)', borderRadius:32, maxWidth:400, width:'100%', maxHeight:'80vh', overflow:'auto', position:'relative' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h3 style={{ color:'white', margin:0 }}>Все уровни</h3>
                <button onClick={refreshTierData} style={{ background:'rgba(255,255,255,0.1)', border:'none', padding:'8px 12px', borderRadius:20, color:'white', fontSize:12, cursor:'pointer' }}>
                  🔄 Обновить
                </button>
              </div>
              {tiers && tiers.length > 0 ? tiers.map((tier, idx) => {
                const isCurrent = currentTier && currentTier.name === tier.name;
                return (
                  <div key={idx} style={{ 
                    marginBottom:16, 
                    padding:12, 
                    background: isCurrent ? `${tier.color}40` : `${tier.color}20`, 
                    borderRadius:16, 
                    borderLeft: `4px solid ${tier.color}`,
                    border: isCurrent ? `2px solid ${tier.color}` : 'none'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:24 }}>{tier.icon}</span>
                      <div>
                        <div style={{ fontWeight:700, color:'white' }}>
                          {tier.name}
                          {isCurrent && <span style={{ fontSize:10, marginLeft:8, color: tier.color }}>▼ Текущий</span>}
                        </div>
                        <div style={{ fontSize:12, color:'#aaa' }}>
                          {tier.threshold.toLocaleString()} ₽ • x{tier.multiplier} бонусов • {tier.cashback || (tier.multiplier * 5)}% кешбэк
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign:'center', color:'white', padding:20 }}>Нет настроенных уровней</div>
              )}
              <button onClick={() => setShowTiersModal(false)} style={{ width:'100%', padding:12, background:'#ff4d4d', border:'none', borderRadius:12, color:'white', fontWeight:600, cursor:'pointer', marginTop:16 }}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
      
      {modal.show && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={closeModal}>
          <div style={{ background:'#1e2538', borderRadius:32, padding:24, maxWidth:300, width:'80%', textAlign:'center', position:'relative' }} onClick={e=>e.stopPropagation()}>
            <span onClick={closeModal} style={{ position:'absolute', top:12, right:18, fontSize:28, cursor:'pointer', color:'white' }}>&times;</span>
            <h3 style={{ marginBottom:12, color:'white' }}>{modal.title}</h3>
            <p style={{ whiteSpace:'pre-line', color:'white' }}>{modal.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}