import { useState, useEffect } from 'react';
import vkBridge from '@vkontakte/vk-bridge';
import './App.css';
import { GameWheel } from './components/GameWheel';
import { DailyQuests } from './components/DailyQuests';
import { ReferralSystem } from './components/ReferralSystem';
import { LoyaltyCard } from './components/LoyaltyCard';
import { DiceRoll } from './components/DiceRoll';
import { ScratchCard } from './components/ScratchCard';
import { Giveaways } from './components/Giveaways';


const API_URL = 'http://localhost:3001';

// Определяем DEFAULT_TIERS ДО его использования
const DEFAULT_TIERS = [
    { name: '🌱 Новичок', threshold: 0, multiplier: 1, cashback: 3, color: '#95a5a6', icon: '🌱' },
    { name: '🥉 Бронза', threshold: 500, multiplier: 1.2, cashback: 5, color: '#cd7f32', icon: '🥉' },
    { name: '🥈 Серебро', threshold: 2000, multiplier: 1.5, cashback: 7, color: '#bdc3c7', icon: '🥈' },
    { name: '🥇 Золото', threshold: 8000, multiplier: 2, cashback: 10, color: '#f1c40f', icon: '🥇' },
    { name: '💎 Бриллиант', threshold: 20000, multiplier: 2.5, cashback: 15, color: '#00b4d8', icon: '💎' }
];

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
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [brandColor, setBrandColor] = useState('#ff4d4d');
  const [birthdayDate, setBirthdayDate] = useState(null);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [purchasedPromotions, setPurchasedPromotions] = useState([]);
  
  const getCurrentTier = (balance) => {
    if (tiers && tiers.length > 0) {
        let current = tiers[0];
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (balance >= tiers[i].threshold) {
                current = tiers[i];
                break;
            }
        }
        return current;
    }
    let current = DEFAULT_TIERS[0];
    for (let i = DEFAULT_TIERS.length - 1; i >= 0; i--) {
        if (balance >= DEFAULT_TIERS[i].threshold) {
            current = DEFAULT_TIERS[i];
            break;
        }
    }
    return current;
  };
  
  const getNextTier = (balance) => {
    const tiersList = tiers.length > 0 ? tiers : DEFAULT_TIERS;
    for (let i = 0; i < tiersList.length; i++) {
        if (balance < tiersList[i].threshold) return tiersList[i];
    }
    return null;
  };
  
  const getProgressToNextTier = (balance) => {
    const current = getCurrentTier(balance);
    const next = getNextTier(balance);
    if (!next) return 100;
    const progress = ((balance - current.threshold) / (next.threshold - current.threshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // Загрузка компаний ТОЛЬКО из базы данных
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const response = await fetch(`${API_URL}/api/companies/list`);
        if (response.ok) {
          const companies = await response.json();
          if (companies && companies.length > 0) {
            setAvailableCompanies(companies);
          } else {
            setAvailableCompanies([]);
          }
        } else {
          console.error('Ошибка загрузки компаний:', response.status);
          setAvailableCompanies([]);
        }
      } catch (error) {
        console.error('Ошибка загрузки компаний:', error);
        setAvailableCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);
  

useEffect(() => {
  // Обновляем акции при переключении на вкладку offers или при изменении userId/selectedGroup
  if ((activeTab === 'offers' || activeTab === 'home') && userId && selectedGroup?.id) {
    const refreshActivePromotions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/promotions/${selectedGroup.id}`);
        if (response.ok) {
          const allPromos = await response.json();
          const now = new Date();
          
          const activePromotions = allPromos.filter(promo => {
            if (!promo.active) return false;
            if (!promo.start_date || !promo.end_date) return false;
            
            const startDate = new Date(promo.start_date);
            const endDate = new Date(promo.end_date);
            
            // Проверяем с учетом времени
            return now >= startDate && now <= endDate;
          });
          
          setPromotions(activePromotions);
        }
      } catch (error) {
        console.error('Ошибка обновления акций:', error);
      }
    };
    
    refreshActivePromotions();
    
    // Добавляем интервал для автоматического обновления каждую минуту
    const interval = setInterval(refreshActivePromotions, 60000);
    
    return () => clearInterval(interval);
  }
}, [activeTab, userId, selectedGroup?.id]);
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);
  
  return () => clearInterval(timer);
}, []);


  // Загрузка уровней с сервера
  useEffect(() => {
    const loadTiersFromServer = async (companyId) => {
        try {
            const response = await fetch(`${API_URL}/api/companies/${companyId}/tiers`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.tiers && data.tiers.length > 0) {
                setTiers(data.tiers);
              }
            }
        } catch (error) {
            console.error('Ошибка загрузки уровней:', error);
        }
    };
    
    if (selectedGroup?.id) {
        loadTiersFromServer(selectedGroup.id);
    }
  }, [selectedGroup]);

// Добавьте эту функцию после getProgressToNextTier и перед getMinutesWord
function getHoursWord(hours) {
  const lastDigit = hours % 10;
  const lastTwoDigits = hours % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'часов';
  }
  
  switch (lastDigit) {
    case 1: return 'час';
    case 2:
    case 3:
    case 4: return 'часа';
    default: return 'часов';
  }
}

function getMinutesWord(minutes) {
  const lastDigit = minutes % 10;
  const lastTwoDigits = minutes % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'минут';
  }
  
  switch (lastDigit) {
    case 1: return 'минута';
    case 2:
    case 3:
    case 4: return 'минуты';
    default: return 'минут';
  }
}
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
        
        // Синхронизируем баланс из базы данных
        const groupData = userGroupsData[companyId] || { 
          bonusBalance: 0, 
          totalEarned: 0, 
          totalSpent: 0, 
          regDate: new Date().toLocaleDateString('ru-RU'), 
          lastDaily: null, 
          participatedRaffles: {}, 
          history: [] 
        };
        
        // Обновляем баланс из БД (ВСЕГДА используем данные из БД)
        groupData.bonusBalance = data.user.bonus_balance || 0;
        groupData.totalEarned = data.user.total_earned || 0;
        groupData.totalSpent = data.user.total_spent || 0;
        
        // Сохраняем обновленные данные
        const updated = { ...userGroupsData, [companyId]: groupData };
        setUserGroupsData(updated);
        saveAllGroupsData(userInfo.id, updated);
        
        const promosResponse = await fetch(`${API_URL}/api/promotions/${companyId}`);
        if (promosResponse.ok) {
          const allPromos = await promosResponse.json();
          
          // Фильтруем ТОЛЬКО активные акции для VK Mini App (с учетом времени)
          const now = new Date();
          
          const activePromotions = allPromos.filter(promo => {
            // 1. Проверяем флаг активности
            if (!promo.active) return false;
            
            // 2. Проверяем наличие дат
            if (!promo.start_date || !promo.end_date) return false;
            
            const startDate = new Date(promo.start_date);
            const endDate = new Date(promo.end_date);
            
            // 3. Проверяем, что текущее время в диапазоне (с учетом часов и минут)
            const isActive = now >= startDate && now <= endDate;
            
            return isActive;
          });
          
          setPromotions(activePromotions);
          console.log('Активные акции для VK Mini App:', activePromotions.length);
        }
        
        // Загружаем дату дня рождения
        try {
          const birthdayResponse = await fetch(`${API_URL}/api/users/${data.user.id}/birthday`);
          if (birthdayResponse.ok) {
            const birthdayData = await birthdayResponse.json();
            if (birthdayData.success && birthdayData.birthday_date) {
              setBirthdayDate(birthdayData.birthday_date);
            }
          }
        } catch (error) {
          console.error('Ошибка загрузки дня рождения:', error);
        }
        
        // Загружаем купленные акции
        try {
          const purchasedResponse = await fetch(`${API_URL}/api/users/${data.user.id}/promotions/purchased/${companyId}`);
          if (purchasedResponse.ok) {
            const purchasedData = await purchasedResponse.json();
            if (purchasedData.success) {
              setPurchasedPromotions(purchasedData.purchased || []);
            }
          }
        } catch (error) {
          console.error('Ошибка загрузки купленных акций:', error);
        }
        
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
      setUserGroupsData({});
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
  
  // Функция для синхронизации баланса из БД
  const syncBalanceFromDB = async () => {
    if (!userId || !selectedGroup) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/getOrCreate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vkId: userInfo?.id,
          companyId: selectedGroup.id,
          name: `${userInfo?.first_name} ${userInfo?.last_name}`
        })
      });
      
      const data = await response.json();
      if (data.success) {
        const cur = getCurrentGroupData();
        // Обновляем только из БД, игнорируя localStorage
        const newData = {
          ...cur,
          bonusBalance: data.user.bonus_balance || 0,
          totalEarned: data.user.total_earned || 0,
          totalSpent: data.user.total_spent || 0
        };
        saveCurrentGroupData(newData);
        console.log('Баланс синхронизирован из БД:', newData.bonusBalance);
      }
    } catch (error) {
      console.error('Ошибка синхронизации баланса:', error);
    }
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

  // Функция сохранения дня рождения
  const saveBirthday = async (date) => {
    if (!userId) {
      showModal('Ошибка', 'Пользователь не найден');
      return false;
    }
    
    if (birthdayDate) {
      showModal('Ошибка', 'Дата дня рождения уже установлена и не может быть изменена');
      return false;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/birthday`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthday_date: date })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setBirthdayDate(date);
        setShowBirthdayModal(false);
        showModal('✅ Успешно!', 'Дата дня рождения сохранена');
        return true;
      } else {
        showModal('Ошибка', data.message || 'Не удалось сохранить дату');
        return false;
      }
    } catch (error) {
      console.error('Ошибка сохранения дня рождения:', error);
      showModal('Ошибка', 'Ошибка подключения к серверу');
      return false;
    }
  };

  // Функция покупки акции
  const purchasePromotion = async (promotion) => {
    if (!userId || !selectedGroup) {
      showModal('Ошибка', 'Выберите компанию');
      return;
    }
    
    const bonusCost = promotion.reward_value * 10;
    const cur = getCurrentGroupData();
    
    if (cur.bonusBalance < bonusCost) {
      showModal('Недостаточно бонусов', `Для покупки акции "${promotion.name}" нужно ${bonusCost} баллов. У вас: ${cur.bonusBalance} баллов`);
      return;
    }
    
    if (!confirm(`Купить акцию "${promotion.name}" за ${bonusCost} баллов?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/promotions/${promotion.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedGroup.id })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Списываем бонусы
        await updateBalanceAndStats(-bonusCost, 'spend');
        
        // Обновляем список купленных акций
        const purchasedResponse = await fetch(`${API_URL}/api/users/${userId}/promotions/purchased/${selectedGroup.id}`);
        if (purchasedResponse.ok) {
          const purchasedData = await purchasedResponse.json();
          if (purchasedData.success) {
            setPurchasedPromotions(purchasedData.purchased || []);
          }
        }
        
        showModal('✅ Успешно!', data.message || `Акция "${promotion.name}" куплена`);
      } else {
        showModal('Ошибка', data.message || 'Не удалось купить акцию');
      }
    } catch (error) {
      console.error('Ошибка покупки акции:', error);
      showModal('Ошибка', 'Ошибка подключения к серверу');
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
  
  // Синхронизируем баланс при возврате в приложение
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId && selectedGroup) {
        syncBalanceFromDB();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Также синхронизируем при фокусе окна
    window.addEventListener('focus', () => {
      if (userId && selectedGroup) {
        syncBalanceFromDB();
      }
    });
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', syncBalanceFromDB);
    };
  }, [userId, selectedGroup]);

  const handleSelectGroup = async (company) => {
    // Извлекаем цвет бренда из компании (поддерживаем оба формата)
    const color = company.brand_color || company.brandColor || '#ff4d4d';
    setBrandColor(color);
    
    setSelectedGroup({ 
      id: company.id, 
      name: company.company, 
      color: color, 
      icon: '🏢', 
      description: company.description 
    });
    
    if (userInfo?.id) {
      await loadUserData(company.id, userInfo.id, `${userInfo.first_name} ${userInfo.last_name}`);
    }
    setStep('profile');
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
          <div style={{ width:100, height:100, background:`linear-gradient(145deg, ${brandColor}, ${brandColor}cc)`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, margin:'0 auto 24px' }}>{initials}</div>
          <h1 style={{ fontSize:28, marginBottom:8, color:'white' }}>Добро пожаловать!</h1>
          <p style={{ fontSize:16, opacity:0.8, marginBottom:32, color:'white' }}>{userInfo?.first_name}, рады видеть вас в LoyaltyPrime</p>
          <button onClick={() => setStep('selectGroup')} style={{ background:brandColor, border:'none', padding:'16px 32px', borderRadius:40, color:'white', fontSize:18, fontWeight:600, cursor:'pointer', width:'100%', maxWidth:280 }}>Начать →</button>
        </div>
      </div>
    );
  }
  
  if (step === 'selectGroup') {
    if (loadingCompanies) return <div style={{ padding:20, textAlign:'center', color:'white', background:'#1a1f2e', minHeight:'100vh' }}>Загрузка списка заведений...</div>;
    
    if (availableCompanies.length === 0) {
      return (
        <div style={{ maxWidth:500, margin:'0 auto', padding:20, background:'#1a1f2e', minHeight:'100vh' }}>
          <div style={{ textAlign:'center', marginBottom:30 }}>
            <h2 style={{ fontSize:24, marginBottom:8, color:'white' }}>Нет доступных заведений</h2>
            <p style={{ opacity:0.7, color:'white' }}>Пожалуйста, добавьте заведения в базу данных</p>
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ maxWidth:500, margin:'0 auto', padding:20, background:'#1a1f2e', minHeight:'100vh' }}>
        <div style={{ textAlign:'center', marginBottom:30 }}><h2 style={{ fontSize:24, marginBottom:8, color:'white' }}>Выберите заведение</h2><p style={{ opacity:0.7, color:'white' }}>В каком заведении хотите копить бонусы?</p></div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {availableCompanies.map(company => {
            const compColor = company.brand_color || company.brandColor || '#ff4d4d';
            return (
            <div key={company.id} style={{ background:'rgba(30,35,48,0.8)', borderRadius:24, border:`1px solid ${compColor}40`, cursor:'pointer' }} onClick={() => handleSelectGroup(company)}>
              <div style={{ display:'flex', alignItems:'center', padding:16 }}>
                <div style={{ fontSize:48, marginRight:16 }}>🏢</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:18, color:'white' }}>{company.company}</div>
                  <div style={{ fontSize:12, opacity:0.7, color:'white' }}>{company.description}</div>
                </div>
                <div style={{ fontSize:24, color:'white' }}>→</div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentGroupData = getCurrentGroupData();
  const currentBalance = currentGroupData?.bonusBalance || 0;
  const currentTier = getCurrentTier(currentBalance);
  const nextTier = getNextTier(currentBalance);
  const progressToNext = getProgressToNextTier(currentBalance);

  return (
    <div style={{ maxWidth:500, margin:'0 auto', padding:'20px 16px 30px', background:'#1a1f2e', minHeight:'100vh' }}>
      <header style={{ background:`linear-gradient(135deg, ${selectedGroup?.color}40, rgba(30,35,48,0.9))`, borderRadius:28, padding:20, marginBottom:20, border:`1px solid ${selectedGroup?.color}60` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:52, height:52, background:`linear-gradient(145deg, ${selectedGroup?.color}, ${selectedGroup?.color}cc)`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{selectedGroup?.icon}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:'white' }}>{userInfo?.first_name} {userInfo?.last_name}</div>
              <div style={{ fontSize:11, opacity:0.7, color:'white' }}>{selectedGroup?.name}</div>
            </div>
          </div>
          <button onClick={() => setStep('selectGroup')} style={{ background:'rgba(255,255,255,0.15)', border:'none', padding:'8px 12px', borderRadius:20, color:'white', fontSize:12, cursor:'pointer' }}>🔄 Сменить</button>
        </div>
        
        <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:20, padding:16, marginBottom:12, cursor:'pointer' }} onClick={() => setShowTiersModal(true)}>
          <div style={{ fontSize:13, opacity:0.8, marginBottom:8, color:'white' }}>💰 Текущий баланс</div>
          <div style={{ fontSize:36, fontWeight:800, marginBottom:12, color:'white' }}>
            {currentBalance.toLocaleString()} <span style={{ fontSize:14, fontWeight:400 }}>бонусов</span>
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ background:'rgba(255,255,255,0.2)', height:8, borderRadius:20, overflow:'hidden' }}>
              <div style={{ width:`${progressToNext}%`, height:'100%', background:`linear-gradient(90deg, ${currentTier?.color}, ${selectedGroup?.color})`, borderRadius:20, transition:'width 0.3s ease' }} />
            </div>
          </div>
          {nextTier ? (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, opacity:0.7, color:'white' }}>
              <span>{currentTier?.name}</span>
              <span>до {nextTier.name}</span>
              <span>{nextTier.threshold - currentBalance} бонусов</span>
            </div>
          ) : (
            <div style={{ fontSize:11, opacity:0.7, textAlign:'center', color:'white' }}>🏆 Максимальный уровень достигнут!</div>
          )}
          <div style={{ fontSize:10, textAlign:'center', marginTop:8, opacity:0.5, color:'white' }}>👆 Нажмите, чтобы увидеть все уровни</div>
        </div>
        
        <div style={{ display:'flex', justifyContent:'center', gap:16, background:'rgba(0,0,0,0.3)', borderRadius:16, padding:'8px 12px' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, opacity:0.7, color:'white' }}>Множитель</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#ffd966' }}>x{currentTier?.multiplier || 1}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, opacity:0.7, color:'white' }}>Кешбэк</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#ffd966' }}>{currentTier?.cashback || (currentTier?.multiplier * 5) || 5}%</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, opacity:0.7, color:'white' }}>Всего заработано</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#ffd966' }}>{currentGroupData?.totalEarned || 0}</div>
          </div>
        </div>
      </header>

      <nav style={{ display:'flex', gap:8, background:'rgba(0,0,0,0.3)', padding:6, borderRadius:60, marginBottom:24, flexWrap:'wrap', justifyContent:'center' }}>
        {['home','card','offers','giveaways','games','quests','referral','history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex:'0 1 auto', background:activeTab===tab ? brandColor : 'transparent', border:'none', padding:'10px 12px', borderRadius:40, fontSize:12, fontWeight:600, color:activeTab===tab ? 'white' : '#aaa', cursor:'pointer', whiteSpace:'nowrap' }}>
            {tab==='home'?'🏠 Главная':tab==='card'?'🎫 Карта':tab==='offers'?'🎁 Акции':tab==='giveaways'?'🎰 Розыгрыши':tab==='games'?'🎮 Игры':tab==='quests'?'📋 Задания':tab==='referral'?'👥 Друзья':'📜 История'}
          </button>
        ))}
      </nav>

      {activeTab === 'card' && selectedGroup && <LoyaltyCard userInfo={userInfo} selectedGroup={selectedGroup} />}
      
      {activeTab === 'home' && selectedGroup && (
  <>
    <div style={{ background:`linear-gradient(135deg, ${selectedGroup.color}20, rgba(30,35,48,0.7))`, borderRadius:28, padding:20, marginBottom:20, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:8 }}>{selectedGroup.icon}</div>
      <h2 style={{ fontSize:22, marginBottom:4, color:'white' }}>{selectedGroup.name}</h2>
      <p style={{ opacity:0.8, fontSize:14, color:'white' }}>{selectedGroup.description}</p>
    </div>
    
    <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20 }}>
      <h3 style={{ fontSize:18, marginBottom:12, color:'white' }}>📊 Моя статистика</h3>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', color:'white' }}>
        <span>Потрачено бонусов:</span>
        <span style={{ fontWeight:700, color:'#ffd966' }}>{currentGroupData?.totalSpent || 0}</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', color:'white' }}>
        <span>День рождения:</span>
        <span 
          style={{ fontWeight:700, color:'#ffd966', cursor:'pointer' }} 
          onClick={() => setShowBirthdayModal(true)}
        >
          {birthdayDate ? new Date(birthdayDate).toLocaleDateString('ru-RU') : '📝 Установить'}
        </span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', color:'white' }}>
        <span>Дата регистрации:</span>
        <span style={{ fontWeight:700, color:'#ffd966' }}>{currentGroupData?.regDate}</span>
      </div>
    </div>
    
    {/* Блок с активными акциями на главной */}
    {promotions.length > 0 && (
      <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20, marginTop:20 }}>
        <h3 style={{ fontSize:18, marginBottom:12, color:'white' }}>🎁 Активные акции</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {promotions.slice(0, 3).map(offer => {
            const endDate = offer.end_date ? new Date(offer.end_date) : null;
            const now = currentTime;
            
            const timeLeftMs = endDate ? endDate - now : 0;
            let timeLeftText = '';
            let totalSeconds = 0;
            let totalMinutes = 0;
            let totalHours = 0;
            
            if (timeLeftMs > 0) {
              totalSeconds = Math.floor(timeLeftMs / 1000);
              totalMinutes = Math.floor(totalSeconds / 60);
              totalHours = Math.floor(totalMinutes / 60);
              const hours = totalHours;
              const minutes = totalMinutes % 60;
              const seconds = totalSeconds % 60;
              
              if (hours > 0) {
                if (minutes > 0) {
                  timeLeftText = `${hours} ${getHoursWord(hours)} ${minutes} ${getMinutesWord(minutes)}`;
                } else {
                  timeLeftText = `${hours} ${getHoursWord(hours)}`;
                }
              } else if (minutes > 0) {
                timeLeftText = `${minutes} ${getMinutesWord(minutes)} ${seconds} сек`;
              } else {
                timeLeftText = `${seconds} секунд`;
              }
            } else {
              timeLeftText = 'Акция завершена';
            }
            
            const showTimeLeft = timeLeftMs > 0;
            
            return (
              <div key={offer.id} style={{ background:'rgba(0,0,0,0.3)', borderRadius:16, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:24 }}>{offer.emoji || '🎯'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:'white', fontSize:14 }}>{offer.name}</div>
                    <div style={{ fontSize:11, opacity:0.7, color:'white' }}>{offer.description?.substring(0, 50)}...</div>
                    {showTimeLeft && (
                      <div style={{ 
                        fontSize:11, 
                        color: totalHours < 1 ? '#ff6b6b' : '#ffd966', 
                        marginTop:4,
                        fontWeight: 500,
                        fontFamily: totalHours > 0 ? 'inherit' : 'monospace'
                      }}>
                        ⏰ Осталось: {timeLeftText}
                      </div>
                    )}
                    {!showTimeLeft && (
                      <div style={{ fontSize:11, color: '#e74c3c', marginTop:4, fontWeight: 500 }}>
                        ❌ {timeLeftText}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveTab('offers')}
                    style={{ background:'#ff4d4d', border:'none', padding:'6px 12px', borderRadius:20, color:'white', fontSize:11, cursor:'pointer' }}
                  >
                    Подробнее
                  </button>
                </div>
              </div>
            );
          })}
          {promotions.length > 3 && (
            <div style={{ textAlign:'center', marginTop:8 }}>
              <button 
                onClick={() => setActiveTab('offers')}
                style={{ background:'transparent', border:'1px solid #ff4d4d', padding:'8px 16px', borderRadius:20, color:'#ff4d4d', fontSize:12, cursor:'pointer' }}
              >
                + ещё {promotions.length - 3} акций
              </button>
            </div>
          )}
        </div>
      </div>
    )}
  </>
)}
      
     {activeTab === 'offers' && (
  <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
      <h3 style={{ fontSize:18, color:'white' }}>🔥 Акции и скидки</h3>
      <div style={{ fontSize:11, color: '#ffd966', fontFamily: 'monospace' }}>
        🕐 {currentTime.toLocaleTimeString('ru-RU')}
      </div>
    </div>
    {promotions.length > 0 ? (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {promotions.map(offer => {
          const rewardType = offer.reward_type || 'bonus';
          const rewardValue = offer.reward_value || 0;
          const rewardText = rewardType === 'bonus' ? `+${rewardValue} бонусов` : `${rewardValue}% скидка`;
          
          const startDate = offer.start_date ? new Date(offer.start_date) : null;
          const endDate = offer.end_date ? new Date(offer.end_date) : null;
          const now = currentTime;
          
          // Вычисляем оставшееся время
          const timeLeftMs = endDate ? endDate - now : 0;
          let timeLeftText = '';
          let totalSeconds = 0;
          let totalMinutes = 0;
          let totalHours = 0;
          
          if (timeLeftMs > 0) {
            totalSeconds = Math.floor(timeLeftMs / 1000);
            totalMinutes = Math.floor(totalSeconds / 60);
            totalHours = Math.floor(totalMinutes / 60);
            const hours = totalHours;
            const minutes = totalMinutes % 60;
            const seconds = totalSeconds % 60;
            
            if (hours > 0) {
              // Если есть часы - показываем только часы и минуты
              if (minutes > 0) {
                timeLeftText = `Осталось: ${hours}ч ${minutes}м`;
              } else {
                timeLeftText = `Осталось: ${hours}ч`;
              }
            } else if (minutes > 0) {
              // Если только минуты - показываем минуты и секунды
              timeLeftText = `Осталось: ${minutes}м ${seconds}с`;
            } else {
              // Если только секунды
              timeLeftText = `Осталось: ${seconds}с`;
            }
          } else if (timeLeftMs <= 0 && endDate) {
            timeLeftText = 'Акция завершена';
          }
          
          const formatDateTime = (date) => {
            if (!date) return '';
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          };
          
          const isCurrentlyActive = startDate && endDate && now >= startDate && now <= endDate;
          const showTimeLeft = timeLeftMs > 0 && timeLeftMs < 24 * 60 * 60 * 1000;
          
          return (
            <div key={offer.id} style={{ 
              background:'rgba(0,0,0,0.3)', 
              borderRadius:20, 
              padding:'14px 16px',
              borderLeft: isCurrentlyActive ? '4px solid #2ecc71' : '4px solid #e74c3c'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:32 }}>{offer.emoji || '🎯'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:'white', fontSize:16 }}>{offer.name}</div>
                  <div style={{ fontSize:12, opacity:0.8, marginTop:4, color:'white' }}>{offer.description}</div>
                  {startDate && endDate && (
                    <div style={{ 
                      fontSize:11, 
                      marginTop:8,
                      padding: '6px 10px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 12,
                      display: 'inline-block'
                    }}>
                      <span style={{ opacity:0.6 }}>🕐 Действует:</span>{' '}
                      <strong style={{ color: '#ffd966' }}>{formatDateTime(startDate)}</strong>
                      <span style={{ opacity:0.6 }}> → </span>
                      <strong style={{ color: '#ffd966' }}>{formatDateTime(endDate)}</strong>
                    </div>
                  )}
                  {showTimeLeft && isCurrentlyActive && (
                    <div style={{ 
                      fontSize:12, 
                      marginTop:8,
                      color: totalHours < 1 ? '#ff6b6b' : '#ffd966',
                      fontWeight: 600,
                      fontFamily: totalHours > 0 ? 'inherit' : 'monospace',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '4px 8px',
                      borderRadius: 8,
                      display: 'inline-block'
                    }}>
                      ⏰ {timeLeftText}
                    </div>
                  )}
                  {!isCurrentlyActive && endDate && now > endDate && (
                    <div style={{ fontSize:11, marginTop:6, color: '#e74c3c' }}>
                      ❌ Акция завершена
                    </div>
                  )}
                  
                  {/* Кнопка покупки акции */}
                  {isCurrentlyActive && (
                    <div style={{ marginTop:12 }}>
                      {(() => {
                        const bonusCost = offer.reward_value * 10;
                        const alreadyPurchased = purchasedPromotions.some(
                          p => p.promotion_id === offer.id && 
                               new Date(p.promotion_cycle_start).getTime() === new Date(offer.start_date).getTime()
                        );
                        
                        if (alreadyPurchased) {
                          return (
                            <div style={{ 
                              padding:'8px 16px', 
                              background:'rgba(46,204,113,0.2)', 
                              border:'1px solid #2ecc71',
                              borderRadius:12, 
                              fontSize:12, 
                              color:'#2ecc71',
                              fontWeight:600,
                              textAlign:'center'
                            }}>
                              ✅ Куплена за {bonusCost} баллов
                            </div>
                          );
                        }
                        
                        return (
                          <button 
                            onClick={() => purchasePromotion(offer)}
                            style={{ 
                              padding:'8px 16px', 
                              background: currentBalance >= bonusCost ? brandColor : '#666',
                              border:'none',
                              borderRadius:12, 
                              fontSize:12, 
                              color:'white',
                              fontWeight:600,
                              cursor: currentBalance >= bonusCost ? 'pointer' : 'not-allowed',
                              width:'100%'
                            }}
                          >
                            🛒 Купить за {bonusCost} баллов
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <div style={{ 
                  background: '#f39c12', 
                  padding:'6px 14px', 
                  borderRadius:20, 
                  fontSize:13, 
                  fontWeight:700, 
                  color:'white',
                  whiteSpace: 'nowrap'
                }}>
                  {rewardText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div style={{ textAlign:'center', padding:40, opacity:0.6, color:'white' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
        <div>На данный момент нет активных акций</div>
        <div style={{ fontSize:12, marginTop:8, opacity:0.5 }}>Загляните позже!</div>
      </div>
    )}
  </div>
)}
      



{activeTab === 'games' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* СКРЫТЫЙ КОМПОНЕНТ ДЛЯ РЕГИСТРАЦИИ ФУНКЦИИ - ВСЕГДА МОНТИРУЕТСЯ */}
        <div style={{ display: 'none' }}>
            <DailyQuests 
                userBalance={currentBalance} 
                onBalanceUpdate={updateBalanceAndStats} 
                userId={userId} 
                selectedGroupId={selectedGroup?.id}
                vkId={userInfo?.id}
            />
        </div>
        
        <GameWheel 
            onBalanceUpdate={updateBalanceAndStats} 
            userBalance={currentBalance}
            companyId={selectedGroup?.id}
            userId={userId}
        />
        <DiceRoll 
            onBalanceUpdate={updateBalanceAndStats} 
            userBalance={currentBalance}
            companyId={selectedGroup?.id}
        />
        <ScratchCard 
            onBalanceUpdate={updateBalanceAndStats} 
            userBalance={currentBalance}
            companyId={selectedGroup?.id}
            userId={userId}
        />
    </div>
)}
      
      {activeTab === 'giveaways' && selectedGroup && (
  <Giveaways 
    selectedGroupId={selectedGroup?.id}
    userId={userId}
    userBalance={currentBalance}
    onBalanceUpdate={updateBalanceAndStats}
  />
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
      
      {activeTab === 'referral' && selectedGroup && <ReferralSystem onBalanceUpdate={updateBalanceAndStats} userId={userInfo?.id} selectedGroupId={selectedGroup?.id} />}
      

      {activeTab === 'history' && (
  <div style={{ background:'rgba(30,35,48,0.7)', borderRadius:28, padding:20 }}>
    <h3 style={{ fontSize:18, marginBottom:12, color:'white' }}>📋 История операций</h3>
    <div style={{ display:'flex', flexDirection:'column', gap:12 }} id="history-container">
      {currentGroupData?.history?.length > 0 ? (
        <>
          {/* Показываем покупки из транзакций, если они есть */}
          {currentGroupData.history.map(item => {
            // Определяем тип операции для отображения иконки
            let icon = '';
            let itemColor = '';
            
            if (item.type === 'earn') {
              if (item.desc.includes('покупк') || item.desc.includes('Покупка')) {
                icon = '🛒';
                itemColor = '#2ecc71';
              } else if (item.desc.includes('задани') || item.desc.includes('Задани')) {
                icon = '✅';
                itemColor = '#3498db';
              } else if (item.desc.includes('бонус') && item.desc.includes('Ежедневный')) {
                icon = '📅';
                itemColor = '#f39c12';
              } else {
                icon = '➕';
                itemColor = '#b5e4a0';
              }
            } else {
              if (item.desc.includes('обмен')) {
                icon = '🎁';
                itemColor = '#e74c3c';
              } else if (item.desc.includes('акци') || item.desc.includes('promotion')) {
                icon = '🎯';
                itemColor = '#9b59b6';
              } else if (item.desc.includes('скидк') || item.desc.includes('discount')) {
                icon = '💰';
                itemColor = '#27ae60';
              } else {
                icon = '➖';
                itemColor = '#ff9f8f';
              }
            }
            
            return (
              <div key={item.id} style={{ background:'rgba(0,0,0,0.3)', borderRadius:20, padding:'14px 16px', borderLeft: `4px solid ${itemColor}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:24 }}>{icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500, color:'white' }}>{item.desc}</div>
                    <div style={{ fontSize:11, opacity:0.5, marginTop:4, color:'white' }}>{item.date}</div>
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, color:item.type==='earn' ? '#b5e4a0' : '#ff9f8f' }}>{item.points} баллов</div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ textAlign:'center', padding:24, opacity:0.6, color:'white' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          <div>Нет операций</div>
          <div style={{ fontSize:12, marginTop:8, opacity:0.5 }}>Совершите покупку в заведении, чтобы появилась история</div>
        </div>
      )}
      
      {/* Кнопка загрузки истории с сервера */}
      <button 
        onClick={async () => {
          if (userId && selectedGroup?.id) {
            try {
              const response = await fetch(`${API_URL}/api/users/${userId}/transactions/${selectedGroup.id}?limit=100`);
              const data = await response.json();
              if (data.success && data.transactions.length > 0) {
                // Преобразуем транзакции с сервера в формат истории
                const serverHistory = data.transactions.map(t => {
                  const date = new Date(t.createdAt);
                  const formattedDate = date.toLocaleString('ru-RU');
                  
                  let icon = '';
                  let itemColor = '';
                  
                  if (t.type === 'earn') {
                    if (t.description.includes('Покупка') || t.source === 'pos') {
                      icon = '🛒';
                      itemColor = '#2ecc71';
                    } else if (t.description.includes('Задание')) {
                      icon = '✅';
                      itemColor = '#3498db';
                    } else if (t.description.includes('Ежедневный')) {
                      icon = '📅';
                      itemColor = '#f39c12';
                    } else {
                      icon = '➕';
                      itemColor = '#b5e4a0';
                    }
                  } else {
                    if (t.description.includes('Списание')) {
                      icon = '💸';
                      itemColor = '#e74c3c';
                    } else if (t.description.includes('Покупка акции') || t.description.includes('promotion')) {
                      icon = '🎯';
                      itemColor = '#9b59b6';
                    } else {
                      icon = '➖';
                      itemColor = '#ff9f8f';
                    }
                  }
                  
                  return {
                    id: t.id,
                    desc: t.description || (t.type === 'earn' ? 'Начисление бонусов' : 'Списание бонусов'),
                    points: t.bonusChange > 0 ? `+${t.bonusChange}` : `${t.bonusChange}`,
                    date: formattedDate,
                    type: t.type,
                    icon: icon,
                    color: itemColor,
                    amount: t.amount,
                    source: t.source
                  };
                });
                
                // Показываем транзакции из базы данных
                const historyContainer = document.getElementById('history-container');
                if (historyContainer) {
                  // Удаляем старые записи (кроме кнопки)
                  const existingItems = historyContainer.querySelectorAll('div[style*="background:rgba(0,0,0,0.3)"]');
                  existingItems.forEach(item => item.remove());
                  
                  // Добавляем новые транзакции
                  const transactionsHtml = serverHistory.slice(0, 50).map(item => `
                    <div style="background:rgba(0,0,0,0.3); border-radius:20px; padding:14px 16px; margin-bottom:12px; border-left: 4px solid ${item.color};">
                      <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:24px">${item.icon}</span>
                        <div style="flex:1">
                          <div style="font-weight:500; color:white;">${item.desc}</div>
                          <div style="font-size:11px; opacity:0.5; color:white; margin-top:4px;">${item.date}</div>
                          ${item.amount > 0 ? `<div style="font-size:11px; opacity:0.7; color:#ffd966; margin-top:2px;">💰 Сумма: ${item.amount}₽</div>` : ''}
                          ${item.source === 'pos' ? '<div style="font-size:10px; opacity:0.5; color:#aaa; margin-top:2px;">🏪 POS Терминал</div>' : ''}
                        </div>
                        <div style="font-size:16px; font-weight:700; color:${item.type === 'earn' ? '#b5e4a0' : '#ff9f8f'}">${item.points} баллов</div>
                      </div>
                    </div>
                  `).join('');
                  
                  // Вставляем перед кнопкой
                  const button = historyContainer.querySelector('button');
                  if (button) {
                    button.insertAdjacentHTML('beforebegin', transactionsHtml);
                  } else {
                    historyContainer.insertAdjacentHTML('beforeend', transactionsHtml);
                  }
                }
              } else {
                alert('Нет транзакций для отображения');
              }
            } catch (error) {
              console.error('Ошибка загрузки истории с сервера:', error);
              alert('Ошибка загрузки истории');
            }
          }
        }}
        style={{ background:'rgba(255,255,255,0.1)', border:'none', padding:'10px 16px', borderRadius:20, color:'white', cursor:'pointer', marginTop:8 }}
      >
        🔄 Загрузить историю из базы данных
      </button>
    </div>
  </div>
)}

      {showTiersModal && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.95)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }} onClick={() => setShowTiersModal(false)}>
          <div style={{ background:'linear-gradient(135deg,#1e2538,#131825)', borderRadius:32, maxWidth:400, width:'100%', maxHeight:'80vh', overflow:'auto', position:'relative' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:24 }}>
              <h3 style={{ color:'white', marginBottom:20, fontSize:20 }}>🏆 Все уровни программы</h3>
              <p style={{ color:'#aaa', fontSize:12, marginBottom:16 }}>Чем больше тратите, тем выше уровень и больше преимуществ!</p>
              {tiers.map((tier, idx) => (
                <div key={idx} style={{ marginBottom:12, padding:12, background:`${tier.color}20`, borderRadius:16, borderLeft:`4px solid ${tier.color}`, transition:'all 0.2s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:28 }}>{tier.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:'white', fontSize:16 }}>{tier.name}</div>
                      <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>
                        <span>💰 от {tier.threshold.toLocaleString()} ₽</span>
                        <span style={{ marginLeft:12 }}>⚡ x{tier.multiplier}</span>
                        <span style={{ marginLeft:12 }}>💸 {tier.cashback || tier.multiplier * 5}%</span>
                      </div>
                    </div>
                    {idx === tiers.findIndex(t => t.name === getCurrentTier(currentBalance).name) && (
                      <span style={{ background:'#ffd966', color:'#1a1f2e', padding:'4px 8px', borderRadius:12, fontSize:10, fontWeight:600 }}>Текущий</span>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:16, padding:12, marginTop:16 }}>
                <div style={{ fontSize:12, color:'#aaa', textAlign:'center' }}>
                  💡 Подсказка: Уровень повышается автоматически при достижении порога трат
                </div>
              </div>
              <button onClick={() => setShowTiersModal(false)} style={{ width:'100%', padding:12, background:'#ff4d4d', border:'none', borderRadius:12, color:'white', fontWeight:600, cursor:'pointer', marginTop:16 }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showBirthdayModal && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.95)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }} onClick={() => !birthdayDate && setShowBirthdayModal(false)}>
          <div style={{ background:'linear-gradient(135deg,#1e2538,#131825)', borderRadius:32, maxWidth:400, width:'100%', position:'relative' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:24 }}>
              <h3 style={{ color:'white', marginBottom:12, fontSize:20 }}>🎂 День рождения</h3>
              {birthdayDate ? (
                <div>
                  <p style={{ color:'#aaa', fontSize:14, marginBottom:16, textAlign:'center' }}>
                    Ваш день рождения уже установлен:<br/>
                    <strong style={{ color:'#ffd966', fontSize:18 }}>{new Date(birthdayDate).toLocaleDateString('ru-RU')}</strong>
                  </p>
                  <p style={{ color:'#ff6b6b', fontSize:12, textAlign:'center', marginBottom:20 }}>
                    ⚠️ Дата дня рождения не может быть изменена
                  </p>
                  <button onClick={() => setShowBirthdayModal(false)} style={{ width:'100%', padding:12, background:'#ffd966', border:'none', borderRadius:12, color:'#1a1f2e', fontWeight:600, cursor:'pointer' }}>
                    Закрыть
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color:'#aaa', fontSize:13, marginBottom:16, textAlign:'center' }}>
                    Укажите вашу дату дня рождения для получения специальных предложений и бонусов!
                  </p>
                  <p style={{ color:'#ff6b6b', fontSize:11, textAlign:'center', marginBottom:16 }}>
                    ⚠️ Внимание: после сохранения дата не может быть изменена
                  </p>
                  <div style={{ marginBottom:20 }}>
                    <label style={{ color:'white', fontSize:13, display:'block', marginBottom:8 }}>Выберите дату:</label>
                    <input 
                      type="date" 
                      id="birthdayInput"
                      style={{ 
                        width:'100%', 
                        padding:12, 
                        borderRadius:12, 
                        border:'1px solid rgba(255,255,255,0.2)', 
                        background:'rgba(255,255,255,0.1)', 
                        color:'white',
                        fontSize:16
                      }}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const dateInput = document.getElementById('birthdayInput');
                      if (dateInput && dateInput.value) {
                        saveBirthday(dateInput.value);
                      } else {
                        showModal('Ошибка', 'Пожалуйста, выберите дату');
                      }
                    }} 
                    style={{ width:'100%', padding:12, background:'#ffd966', border:'none', borderRadius:12, color:'#1a1f2e', fontWeight:600, cursor:'pointer', marginBottom:8 }}
                  >
                    💾 Сохранить дату
                  </button>
                  <button onClick={() => setShowBirthdayModal(false)} style={{ width:'100%', padding:12, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:12, color:'white', fontWeight:600, cursor:'pointer' }}>
                    Отмена
                  </button>
                </div>
              )}
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