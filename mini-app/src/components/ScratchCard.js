// ScratchCard.js - Исправленная версия с единым стилем индикатора игр
import { useState, useEffect } from 'react';
import './ScratchCard.css';

const API_URL = 'http://localhost:3001';

// Символы по умолчанию
const DEFAULT_SYMBOLS = [
    { id: '🍒', name: 'Вишня', value: 10, multiplier: 1, color: '#e74c3c', prob: 15 },
    { id: '🍋', name: 'Лимон', value: 15, multiplier: 1.5, color: '#f1c40f', prob: 14 },
    { id: '🍊', name: 'Апельсин', value: 20, multiplier: 2, color: '#e67e22', prob: 13 },
    { id: '🍉', name: 'Арбуз', value: 25, multiplier: 2.5, color: '#2ecc71', prob: 12 },
    { id: '⭐', name: 'Звезда', value: 50, multiplier: 5, color: '#f39c12', prob: 10 },
    { id: '💎', name: 'Алмаз', value: 100, multiplier: 10, color: '#9b59b6', prob: 8 },
    { id: '7️⃣', name: 'Семёрка', value: 200, multiplier: 20, color: '#e74c3c', prob: 5 },
    { id: '🎰', name: 'ДЖЕКПОТ', value: 500, multiplier: 50, color: '#ff4d4d', prob: 3 }
];

// Создание игрового поля 3x3
const createBoard = (symbols, winningSymbolParam = null) => {
    let winningSymbol = winningSymbolParam;
    
    if (!winningSymbol) {
        const totalProb = symbols.reduce((sum, s) => sum + (s.prob || 10), 0);
        let random = Math.random() * totalProb;
        let cumulative = 0;
        
        for (const symbol of symbols) {
            cumulative += symbol.prob || 10;
            if (random <= cumulative) {
                winningSymbol = symbol;
                break;
            }
        }
    }
    
    const board = [];
    
    for (let i = 0; i < 3; i++) {
        board.push({
            id: `${winningSymbol.id}_win_${i}`,
            symbol: winningSymbol,
            revealed: false,
            isWinning: true
        });
    }
    
    const otherSymbols = symbols.filter(s => s.id !== winningSymbol.id);
    for (let i = 0; i < 6; i++) {
        const totalProb = otherSymbols.reduce((sum, s) => sum + (s.prob || 10), 0);
        let random = Math.random() * totalProb;
        let cumulative = 0;
        let selectedSymbol = otherSymbols[0];
        
        for (const symbol of otherSymbols) {
            cumulative += symbol.prob || 10;
            if (random <= cumulative) {
                selectedSymbol = symbol;
                break;
            }
        }
        
        board.push({
            id: `${selectedSymbol.id}_lose_${i}`,
            symbol: selectedSymbol,
            revealed: false,
            isWinning: false
        });
    }
    
    for (let i = board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [board[i], board[j]] = [board[j], board[i]];
    }
    
    return board;
};

export function ScratchCard({ onBalanceUpdate, userBalance, companyId, userId, companyTimezoneOffset = 0 }) {
    const [board, setBoard] = useState([]);
    const [gameActive, setGameActive] = useState(true);
    const [isRevealing, setIsRevealing] = useState(false);
    const [result, setResult] = useState(null);
    const [lastWin, setLastWin] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [foundWinning, setFoundWinning] = useState(0);
    const [selectedSymbol, setSelectedSymbol] = useState(null);
    const [playsToday, setPlaysToday] = useState(null);
	const [hintUsedInGame, setHintUsedInGame] = useState(false);
    
    // Состояние для бесплатной подсказки
    const [freeHintAvailable, setFreeHintAvailable] = useState(false);
    const [freeHintUsed, setFreeHintUsed] = useState(false);
    
    // Настройки игры (загружаются с сервера)
    const [settings, setSettings] = useState({
        cost: 20,
        maxAttempts: 3,
        symbols: DEFAULT_SYMBOLS,
        hintCost: 15,
        freeHintDaily: false,
        maxPlaysPerDay: 0,
        active: true
    });
    const [settingsLoaded, setSettingsLoaded] = useState(false);
	// В начале компонента, после объявления useState, добавьте:

// Загрузка количества игр при монтировании и при фокусе окна
useEffect(() => {
    if (!userId || !companyId) return;
    
    const loadPlaysToday = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}/games/plays/${companyId}?gameType=scratch&timezoneOffset=${companyTimezoneOffset}`);
            const data = await response.json();
            if (data.success) {
                setPlaysToday(data.plays?.scratch || 0);
                console.log('🎫 ScratchCard: игр сегодня (загружено):', data.plays?.scratch);
            }
        } catch (error) {
            console.error('Ошибка загрузки количества игр:', error);
        }
    };
    
    loadPlaysToday();
}, [userId, companyId]);

// Добавьте обработчик видимости страницы
useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && userId && companyId) {
            const reloadPlays = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/users/${userId}/games/plays/${companyId}?gameType=scratch`);
                    const data = await response.json();
                    if (data.success) {
                        setPlaysToday(data.plays?.scratch || 0);
                    }
                } catch (error) {
                    console.error('Ошибка перезагрузки:', error);
                }
            };
            reloadPlays();
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
    };
}, [userId, companyId]);

useEffect(() => {
    const loadSettings = async () => {
        if (!companyId) return;
        
        try {
            const response = await fetch(`${API_URL}/api/games/${companyId}/scratch`);
            const data = await response.json();
            
            console.log('🎫 Scratch загружены настройки:', data);
            
            if (data.success) {
                // ✅ Убираем условие data.active !== false - загружаем ВСЕГДА
                setSettings({
                    cost: data.settings.cost || 20,
                    maxAttempts: data.settings.maxAttempts || 3,
                    symbols: data.settings.symbols || DEFAULT_SYMBOLS,
                    hintCost: data.settings.hintCost || 15,
                    freeHintDaily: data.settings.freeHintDaily || false,
                    maxPlaysPerDay: data.settings.maxPlaysPerDay || 0,
                    active: data.active !== false  // ✅ active будет true или false
                });
                console.log('🎫 Scratch active =', data.active !== false);
            } else {
                // Если ответ не success, используем дефолтные значения
                setSettings(prev => ({ ...prev, active: true }));
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек скретч-карты:', error);
            setSettings(prev => ({ ...prev, active: true }));
        }
        setSettingsLoaded(true);
    };
    
    loadSettings();
}, [companyId]);

    // ✅ ЗАГРУЗКА КОЛИЧЕСТВА СЫГРАННЫХ ИГР СЕГОДНЯ
    useEffect(() => {
        if (!userId || !companyId) {
            console.log('⏳ ScratchCard: ждём userId для загрузки статистики игр');
            return;
        }
        
        const loadPlaysToday = async () => {
            try {
                console.log('🎫 ScratchCard: загружаем статистику игр для userId:', userId);
                const response = await fetch(`${API_URL}/api/users/${userId}/games/plays/${companyId}?gameType=scratch`);
                const data = await response.json();
                if (data.success) {
                    setPlaysToday(data.plays?.scratch || 0);
                    console.log('🎫 ScratchCard: игр сегодня:', data.plays?.scratch);
                }
            } catch (error) {
                console.error('Ошибка загрузки количества игр для Scratch:', error);
                setPlaysToday(0);
            }
        };
        
        loadPlaysToday();
    }, [userId, companyId]);

    // ✅ ПРОВЕРКА ЛИМИТА ИГР
    const isLimitReached = () => {
        if (playsToday === null) return true;
        const maxPlays = settings.maxPlaysPerDay || 0;
        if (maxPlays === 0) return false;
        return playsToday >= maxPlays;
    };

    const getRemainingPlays = () => {
        const maxPlays = settings.maxPlaysPerDay || 0;
        if (maxPlays === 0) return null;
        return Math.max(0, maxPlays - (playsToday || 0));
    };

    // Загрузка состояния бесплатной подсказки из localStorage
    useEffect(() => {
        if (!userId) return;
        
        const key = `scratch_free_hint_${userId}_${companyId}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const today = new Date().toDateString();
                
                if (data.date === today) {
                    setFreeHintUsed(data.used);
                    setFreeHintAvailable(false);
                } else {
                    setFreeHintUsed(false);
                    setFreeHintAvailable(settings.freeHintDaily);
                }
            } catch(e) {}
        } else {
            setFreeHintAvailable(settings.freeHintDaily);
            setFreeHintUsed(false);
        }
    }, [userId, companyId, settings.freeHintDaily]);

useEffect(() => {
    const handleRefreshPlays = () => {
        if (userId && companyId) {
            const loadPlays = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/users/${userId}/games/plays/${companyId}?gameType=scratch&timezoneOffset=${companyTimezoneOffset}`);
                    const data = await response.json();
                    if (data.success) {
                        setPlaysToday(data.plays?.scratch || 0);
                        console.log('🎫 Счётчик обновлён по событию refreshGamePlays');
                    }
                } catch (error) {
                    console.error('Ошибка обновления счётчика:', error);
                }
            };
            loadPlays();
        }
    };
    
    window.addEventListener('refreshGamePlays', handleRefreshPlays);
    return () => window.removeEventListener('refreshGamePlays', handleRefreshPlays);
}, [userId, companyId]);
    // Сохранение состояния бесплатной подсказки
    const saveFreeHintState = (used) => {
        const today = new Date().toDateString();
        const key = `scratch_free_hint_${userId}_${companyId}`;
        localStorage.setItem(key, JSON.stringify({
            used: used,
            date: today
        }));
        setFreeHintUsed(used);
        setFreeHintAvailable(!used && settings.freeHintDaily);
    };

    // Новая игра
const newGame = async () => {
    if (isRevealing) return;
    if (!settings.active) {
        alert('Игра временно недоступна');
        return;
    }
    
    if (isLimitReached()) {
        alert(`❌ Вы исчерпали лимит игр на сегодня (${settings.maxPlaysPerDay}/${settings.maxPlaysPerDay}). Завтра будет новый лимит!`);
        return;
    }
    
    if (userBalance < settings.cost) {
        alert(`❌ Недостаточно бонусов! Нужно ${settings.cost} бонусов.`);
        return;
    }
    
    await onBalanceUpdate(settings.cost, 'spend', { source: 'game', gameType: 'scratch', action: 'newGame' });
    
    // ✅ СБРАСЫВАЕМ ФЛАГ ПОДСКАЗКИ ПРИ НОВОЙ ИГРЕ
    setHintUsedInGame(false);
    
    // ✅ СОХРАНЯЕМ СЧЁТЧИК В БД
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}/games/increment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId, gameType: 'scratch', timezoneOffset: companyTimezoneOffset })
        });
        const data = await response.json();
        if (data.success) {
            setPlaysToday(data.playsToday);
            console.log('✅ Scratch plays incremented to:', data.playsToday);
        }
    } catch (error) {
        console.error('Ошибка сохранения счетчика игр:', error);
        setPlaysToday(prev => (prev || 0) + 1);
    }
    
    // ✅ ОТПРАВЛЯЕМ СОБЫТИЕ О ПРОГРЕССЕ ЗАДАНИЯ
    window.dispatchEvent(new CustomEvent('questProgress', { 
        detail: { type: 'scratch_card', increment: 1 } 
    }));
    
    const newBoard = createBoard(settings.symbols);
    const winningSym = newBoard.find(cell => cell.isWinning)?.symbol;
    
    setBoard(newBoard);
    setSelectedSymbol(winningSym);
    setGameActive(true);
    setResult(null);
    setLastWin(null);
    setShowConfetti(false);
    setAttemptsLeft(settings.maxAttempts);
    setFoundWinning(0);
};

// Открыть ячейку
const revealCell = (index, isFreeHint = false) => {
    if (!gameActive) return;
    if (isRevealing) return;
    if (board[index].revealed) return;
    if (attemptsLeft <= 0) return;
    
    setIsRevealing(true);
    
    const currentAttemptsLeft = attemptsLeft;
    const currentFoundWinning = foundWinning;
    
    setTimeout(async () => {
        const newBoard = [...board];
        newBoard[index].revealed = true;
        setBoard(newBoard);
        
        let newAttemptsLeft = currentAttemptsLeft;
        let newFoundWinning = currentFoundWinning;
        
        if (!isFreeHint) {
            newAttemptsLeft = currentAttemptsLeft - 1;
            setAttemptsLeft(newAttemptsLeft);
        }
        
        if (newBoard[index].isWinning) {
            newFoundWinning = currentFoundWinning + 1;
            setFoundWinning(newFoundWinning);
            
            if (newFoundWinning === 3) {
                const winAmount = newBoard[index].symbol.value * newBoard[index].symbol.multiplier;
                await onBalanceUpdate(winAmount, 'earn', { source: 'game', gameType: 'scratch', action: 'win' });
                setLastWin(winAmount);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
                setResult({
                    type: 'win',
                    value: winAmount,
                    message: `🎉 ПОБЕДА! Вы нашли 3 ${newBoard[index].symbol.name} и выиграли ${winAmount} бонусов! 🎉`
                });
                setGameActive(false);
                try { navigator.vibrate?.(200); } catch(e) {}
                
            }
        }
        
        if (!isFreeHint && newAttemptsLeft === 0 && newFoundWinning < 3) {
            setResult({
                type: 'lose',
                value: 0,
                message: `Вы не нашли 3 одинаковых символа за ${settings.maxAttempts} попыток. Попробуйте ещё раз!`
            });
            setGameActive(false);
        }
        
        setIsRevealing(false);
        
    }, 200);
};

    // Подсказка - показать одну выигрышную ячейку
    const showHint = async () => {
    if (!gameActive) return;
    if (isRevealing) return;
    if (attemptsLeft <= 0) return;
    
    // ✅ ПРОВЕРКА: подсказка уже использована в этой игре
    if (hintUsedInGame) {
        setResult({
            type: 'info',
            message: 'Подсказка уже использована в этой игре (можно только 1 раз)'
        });
        setTimeout(() => setResult(null), 2000);
        return;
    }
    
    const unrevealedWinning = board.findIndex(cell => cell.isWinning && !cell.revealed);
    
    if (unrevealedWinning === -1) {
        alert('❌ Нет доступных подсказок!');
        return;
    }
    
    // ✅ УСТАНАВЛИВАЕМ ФЛАГ, ЧТО ПОДСКАЗКА ИСПОЛЬЗОВАНА
    setHintUsedInGame(true);
    
    if (settings.freeHintDaily && freeHintAvailable && !freeHintUsed) {
        saveFreeHintState(true);
        revealCell(unrevealedWinning, true);
        setResult({
            type: 'info',
            message: '🎁 Использована бесплатная подсказка!'
        });
        setTimeout(() => setResult(null), 2000);
    } 
    else if (userBalance >= settings.hintCost) {
        await onBalanceUpdate(-settings.hintCost, 'spend', { source: 'game', gameType: 'scratch', action: 'hint' });
        revealCell(unrevealedWinning, false);
    } 
    else {
        // Если не хватило бонусов, возвращаем флаг обратно
        setHintUsedInGame(false);
        alert(`❌ Недостаточно бонусов! Нужно ${settings.hintCost} бонусов за подсказку.`);
    }
};
    
    // ✅ Показываем загрузку, если нет userId или не загрузились настройки
    if (!userId || !settingsLoaded || playsToday === null) {
        return (
            <div className="scratch-card-3x3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
                <div style={{ color: 'white', fontSize: '24px' }}>🎫</div>
                <div style={{ color: 'white' }}>Загрузка игры...</div>
                <div style={{ color: '#aaa', fontSize: '12px' }}>
                    {!userId && 'Ожидание авторизации...'}
                    {userId && !settingsLoaded && 'Загрузка настроек...'}
                    {userId && settingsLoaded && playsToday === null && 'Загрузка статистики...'}
                </div>
            </div>
        );
    }
	
    if (!settings.active) {
    return (
        <div className="scratch-card-3x3" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
            <div style={{ color: '#ffd966', fontSize: '18px', fontWeight: 'bold' }}>Игра временно недоступна</div>
            <div style={{ color: '#aaa', fontSize: '14px', marginTop: '8px' }}>Загляните позже!</div>
        </div>
    );
}
    
    const remainingPlays = getRemainingPlays();
    const limitReached = isLimitReached();

    return (
        <div className="scratch-card-3x3">
            {/*  БАННЕР ЛИМИТА ИГР  */}
            {settings.maxPlaysPerDay > 0 && playsToday !== null && (
                <div style={{ 
                    background: limitReached ? '#e74c3c' : (remainingPlays <= 3 ? '#f39c12' : 'rgba(255,255,255,0.1)'),
                    borderRadius: '30px',
                    padding: '8px 16px',
                    marginBottom: '16px',
                    textAlign: 'center',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 'bold'
                }}>
                    {limitReached 
                        ? `Лимит игр на сегодня исчерпан! (${playsToday}/${settings.maxPlaysPerDay})`
                        : `Игр сегодня: ${playsToday} / ${settings.maxPlaysPerDay}${remainingPlays <= 3 ? ` • Осталось: ${remainingPlays}` : ''}`
                    }
                </div>
            )}
			
            
            {showConfetti && (
                <div className="confetti-overlay">
                    {Array.from({ length: 100 }).map((_, i) => (
                        <div
                            key={i}
                            className="confetti-piece"
                            style={{
                                '--x': `${Math.random() * 200 - 100}%`,
                                '--delay': `${Math.random() * 3}s`,
                                '--color': `hsl(${Math.random() * 360}, 80%, 60%)`
                            }}
                        />
                    ))}
                    <div className="confetti-text">🎉 ПОБЕДА! 🎉</div>
                </div>
            )}
            
            <div className="scratch-header">
                <h3>НАЙДИ 3 ОДИНАКОВЫХ</h3>
            </div>
            
            {/* Баннер бесплатной подсказки */}
            {settings.freeHintDaily && freeHintAvailable && !freeHintUsed && (
                <div className="free-hint-banner" style={{
                    background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                    borderRadius: '30px',
                    padding: '10px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>💡</span>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>Доступна 1 бесплатная подсказка!</span>
                    </div>
                    <button
                        onClick={showHint}
                        disabled={isRevealing || attemptsLeft === 0}
                        style={{
                            background: 'white',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '30px',
                            color: '#8e44ad',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Использовать 💡
                    </button>
                </div>
            )}
            
            {/* Баннер что бесплатная подсказка использована */}
            {settings.freeHintDaily && !freeHintAvailable && freeHintUsed && (
                <div className="free-hint-used" style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '30px',
                    padding: '8px 16px',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>💡 Бесплатная подсказка уже использована сегодня. Завтра будет новая!</span>
                </div>
            )}
            
            
            {/* Прогресс */}
            <div className="game-progress">
                <div className="progress-text">
                    Попыток осталось: {attemptsLeft} / {settings.maxAttempts}
                </div>
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${(settings.maxAttempts - attemptsLeft) / settings.maxAttempts * 100}%` }}
                    />
                </div>
            </div>
            
            {/* Найдено одинаковых */}
            <div className="found-progress">
                <div className="found-text">
                    Найдено одинаковых: {foundWinning} / 3
                </div>
                <div className="found-bar">
                    <div 
                        className="found-fill" 
                        style={{ width: `${(foundWinning / 3) * 100}%` }}
                    />
                </div>
            </div>
            
            {/* Выигрышный символ (подсказка) */}
            {selectedSymbol && foundWinning < 3 && gameActive && (
                <div className="hint-symbol">
                    Подсказка: ищите символ <span style={{ fontSize: '20px' }}>{selectedSymbol.id}</span>
                </div>
            )}
            
            {/* Игровое поле 3x3 */}
            <div className="game-board-3x3">
                {board.map((cell, index) => (
                    <div
                        key={cell.id}
                        className={`game-cell ${cell.revealed ? 'revealed' : 'hidden'} ${cell.revealed && cell.isWinning ? 'winning' : ''}`}
                        onClick={() => revealCell(index, false)}
                    >
                        {cell.revealed ? (
                            <div className="cell-content" style={{ background: cell.symbol.color }}>
                                <div className="cell-emoji">{cell.symbol.id}</div>
                                <div className="cell-name">{cell.symbol.name}</div>
                                {cell.isWinning && (
                                    <div className="cell-value">x{cell.symbol.multiplier}</div>
                                )}
                            </div>
                        ) : (
                            <div className="cell-cover">
                                <div className="cover-icon">❓</div>
                                <div className="cover-text">открыть</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Кнопки */}
            <div className="game-buttons">
                <button
                    className="new-game-btn"
                    onClick={newGame}
                    disabled={isRevealing || playsToday === null || limitReached}
                    style={{
                        opacity: (playsToday === null || limitReached) ? 0.6 : 1,
                        cursor: (playsToday === null || limitReached) ? 'not-allowed' : 'pointer'
                    }}
                >
                    НОВАЯ ИГРА
                </button>
                {gameActive && attemptsLeft > 0 && foundWinning < 3 && !limitReached && (
                    <button
                        className="hint-btn"
                        onClick={showHint}
                        disabled={isRevealing}
                        style={{
                            background: settings.freeHintDaily && freeHintAvailable && !freeHintUsed 
                                ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' 
                                : 'rgba(241, 196, 15, 0.2)'
                        }}
                    >
                        ПОДСКАЗКА 
                        {settings.freeHintDaily && freeHintAvailable && !freeHintUsed 
                            ? ' (БЕСПЛАТНО)' 
                            : ` (${settings.hintCost})`}
                    </button>
                )}
            </div>
            
            {/* Результат */}
            {result && (
                <div className={`game-result ${result.type === 'win' ? 'win' : result.type === 'info' ? 'info' : 'lose'} show`}>
                    <div className="result-text">{result.message}</div>
                </div>
            )}
            
            {/* Последний выигрыш */}
            {lastWin && !result && lastWin > 0 && (
                <div className="last-win">
                    ПОСЛЕДНИЙ ВЫИГРЫШ: +{lastWin}
                </div>
            )}
			<div className="hint-info" style={{
    background: 'rgba(155, 89, 182, 0.2)',
    borderRadius: '12px',
    padding: '8px 12px',
    marginBottom: '16px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#dda0dd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
}}>
    <span>Подсказку можно использовать только 1 раз за игру</span>
    {hintUsedInGame && gameActive && (
        <span style={{ color: '#e74c3c', fontSize: '11px' }}>(Уже использована)</span>
    )}
    {settings.freeHintDaily && freeHintAvailable && !freeHintUsed && !hintUsedInGame && (
        <span style={{ color: '#2ecc71', fontSize: '11px' }}>🎁 Сегодня бесплатно!</span>
    )}
</div>
            
            {/* Информация о множителях */}
            <div className="multiplier-info">
                <div className="info-title">Множители выигрыша:</div>
                <div className="multiplier-list">
                    {settings.symbols.map(sym => (
                        <div key={sym.id} className="multiplier-item">
                            <span>{sym.id}</span>
                            <span>x{sym.multiplier}</span>
                        </div>
                    ))}
                </div>
            </div>
			<div className="game-info" style={{
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '12px 16px',
    marginBottom: '16px',
	marginTop: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
}}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'white', fontSize: '14px' }}>Стоимость игры:</span>
    </div>
    <div style={{ 
        background: '#ff4d4d', 
        padding: '6px 16px', 
        borderRadius: '30px',
        fontWeight: 'bold',
        color: 'white',
        fontSize: '16px'
    }}>
        {settings.cost} бонусов
    </div>
</div>
        </div>
    );
}