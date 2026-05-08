// ScratchCard.js - Добавляем maxPlaysPerDay
import { useState, useEffect } from 'react';
import './ScratchCard.css';

const API_URL = 'http://localhost:3001';

// Символы по умолчанию (оставляем без изменений)
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
	const [playsLoaded, setPlaysLoaded] = useState(false);
    
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
        maxPlaysPerDay: 0,  // ← ДОБАВЛЕНО
        active: true
    });
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // Загрузка количества сыгранных игр сегодня
    useEffect(() => {
    if (!userId || !companyId) return;
    const loadPlaysToday = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}/games/plays/${companyId}`);
            const data = await response.json();
            if (data.success) {
                setPlaysToday(data.plays.scratch);
            }
        } catch (error) {
            console.error('Ошибка загрузки количества игр:', error);
        } finally {
            setPlaysLoaded(true);
        }
    };
    loadPlaysToday();
}, [userId, companyId]);
    
    // Проверка лимита игр
    const getRemainingPlays = () => {
    if (playsToday === null) return null;
    const maxPlays = settings.maxPlaysPerDay || 0;
    if (maxPlays === 0) return Infinity;
    return Math.max(0, maxPlays - playsToday);
};

    // Загрузка настроек с сервера
    useEffect(() => {
        const loadSettings = async () => {
            if (!companyId) return;
            
            try {
                const response = await fetch(`${API_URL}/api/games/${companyId}/scratch`);
                const data = await response.json();
                
                if (data.success && data.active !== false) {
                    setSettings({
                        cost: data.settings.cost || 20,
                        maxAttempts: data.settings.maxAttempts || 3,
                        symbols: data.settings.symbols || DEFAULT_SYMBOLS,
                        hintCost: data.settings.hintCost || 15,
                        freeHintDaily: data.settings.freeHintDaily || false,
                        maxPlaysPerDay: data.settings.maxPlaysPerDay || 0,  // ← ДОБАВЛЕНО
                        active: data.active
                    });
                }
            } catch (error) {
                console.error('Ошибка загрузки настроек скретч-карты:', error);
            }
            setSettingsLoaded(true);
        };
        
        loadSettings();
    }, [companyId]);

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
    
    const maxPlays = settings.maxPlaysPerDay || 0;
    if (maxPlays > 0 && playsToday >= maxPlays) {
        alert(`❌ Вы исчерпали лимит игр на сегодня (${maxPlays}/${maxPlays}). Завтра будет новый лимит!`);
        return;
    }
    
    if (userBalance < settings.cost) {
        alert(`❌ Недостаточно бонусов! Нужно ${settings.cost} бонусов.`);
        return;
    }
    
    await onBalanceUpdate(-settings.cost, 'spend', { source: 'game', gameType: 'scratch', action: 'newGame' });
    
    // ✅ СОХРАНЯЕМ СЧЁТЧИК В БД
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}/games/increment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId, gameType: 'scratch' })
        });
        const data = await response.json();
        if (data.success) {
            setPlaysToday(data.playsToday);
        }
    } catch (error) {
        console.error('Ошибка сохранения счетчика игр:', error);
        // Fallback
        setPlaysToday(prev => prev + 1);
    }
    
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
                    
                    if (typeof window.updateQuestProgress === 'function') {
                        window.updateQuestProgress('scratch_card', 1);
                    }
                }
            }
            
            if (!isFreeHint && newAttemptsLeft === 0 && newFoundWinning < 3) {
                setResult({
                    type: 'lose',
                    value: 0,
                    message: `😢 Вы не нашли 3 одинаковых символа за ${settings.maxAttempts} попыток. Попробуйте ещё раз!`
                });
                setGameActive(false);
            }
            
            setIsRevealing(false);
            
            if (!isFreeHint && typeof window.updateQuestProgress === 'function') {
                window.updateQuestProgress('scratch_card', 1);
            }
        }, 200);
    };

    // Подсказка - показать одну выигрышную ячейку
    const showHint = async () => {
        if (!gameActive) return;
        if (isRevealing) return;
        if (attemptsLeft <= 0) return;
        
        const unrevealedWinning = board.findIndex(cell => cell.isWinning && !cell.revealed);
        
        if (unrevealedWinning === -1) {
            alert('❌ Нет доступных подсказок!');
            return;
        }
        
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
            alert(`❌ Недостаточно бонусов! Нужно ${settings.hintCost} бонусов за подсказку.`);
        }
    };
    
    if (!settingsLoaded) {
        return (
            <div className="scratch-card-3x3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <div style={{ color: 'white' }}>Загрузка...</div>
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
    const remainingPlaysText = settings.maxPlaysPerDay > 0 
        ? `Осталось игр сегодня: ${remainingPlays === Infinity ? settings.maxPlaysPerDay : remainingPlays}/${settings.maxPlaysPerDay}`
        : null;

    return (
        <div className="scratch-card-3x3">
            {/* Баннер лимита игр */}
            {settings.maxPlaysPerDay > 0 && remainingPlays <= 3 && remainingPlays > 0 && playsToday !== null (
                <div className="limit-warning" style={{
                    background: remainingPlays === 0 ? '#e74c3c' : '#f39c12',
                    borderRadius: '30px',
                    padding: '8px 16px',
                    marginBottom: '16px',
                    textAlign: 'center',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 'bold'
                }}>
                    ⚠️ {remainingPlays === 0 ? 'Лимит игр на сегодня исчерпан!' : `Осталось ${remainingPlays} игр на сегодня`}
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
                <h3>🎰 НАЙДИ 3 ОДИНАКОВЫХ</h3>
                <div className="scratch-cost">
                    <span className="cost-icon">🎟️</span>
                    <span className="cost-value">{settings.cost}</span>
                </div>
            </div>
            
            {remainingPlaysText && (
                <div className="remaining-plays" style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginBottom: '8px' }}>
                    {remainingPlaysText}
                </div>
            )}
            
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
            
            <div className="game-rules">
                <div className="rule-item">🎯 Найдите 3 одинаковых символа</div>
                <div className="rule-item">🖱️ У вас всего {settings.maxAttempts} попыток!</div>
                <div className="rule-item">🏆 Соберите все 3 и выиграйте множитель!</div>
            </div>
            
            {/* Прогресс */}
            <div className="game-progress">
                <div className="progress-text">
                    🎲 Попыток осталось: {attemptsLeft} / {settings.maxAttempts}
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
                    🔍 Найдено одинаковых: {foundWinning} / 3
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
                    💡 Подсказка: ищите символ <span style={{ fontSize: '20px' }}>{selectedSymbol.id}</span>
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
                    disabled={isRevealing || !playsLoaded || (settings.maxPlaysPerDay > 0 && playsToday >= settings.maxPlaysPerDay)}
                >
                    🎲 НОВАЯ ИГРА
                </button>
                {gameActive && attemptsLeft > 0 && foundWinning < 3 && (
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
                        💡 ПОДСКАЗКА 
                        {settings.freeHintDaily && freeHintAvailable && !freeHintUsed 
                            ? ' (БЕСПЛАТНО)' 
                            : ` (${settings.hintCost})`}
                    </button>
                )}
            </div>
            
            {/* Результат */}
            {result && (
                <div className={`game-result ${result.type === 'win' ? 'win' : result.type === 'info' ? 'info' : 'lose'} show`}>
                    <div className="result-icon">{result.type === 'win' ? '🏆' : result.type === 'info' ? '💡' : '😢'}</div>
                    <div className="result-text">{result.message}</div>
                </div>
            )}
            
            {/* Последний выигрыш */}
            {lastWin && !result && lastWin > 0 && (
                <div className="last-win">
                    🏆 ПОСЛЕДНИЙ ВЫИГРЫШ: +{lastWin}
                </div>
            )}
            
            {/* Информация о множителях */}
            <div className="multiplier-info">
                <div className="info-title">🎁 Множители выигрыша:</div>
                <div className="multiplier-list">
                    {settings.symbols.map(sym => (
                        <div key={sym.id} className="multiplier-item">
                            <span>{sym.id}</span>
                            <span>x{sym.multiplier}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}