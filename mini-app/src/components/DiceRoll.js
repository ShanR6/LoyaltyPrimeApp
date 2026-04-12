// DiceRoll.js - Исправленная версия с нормальными кубиками
import { useState, useEffect } from 'react';
import './DiceRoll.css';

const ROLL_COST = 25;
const JACKPOT_BASE = 1000;

export function DiceRoll({ onBalanceUpdate, userBalance }) {
    const [dice1, setDice1] = useState(3);
    const [dice2, setDice2] = useState(4);
    const [isRolling, setIsRolling] = useState(false);
    const [result, setResult] = useState(null);
    const [lastWin, setLastWin] = useState(null);
    const [jackpot, setJackpot] = useState(JACKPOT_BASE);
    const [betMultiplier, setBetMultiplier] = useState(1);
    const [showCombinations, setShowCombinations] = useState(false);
    const [comboHistory, setComboHistory] = useState([]);
    const [particles, setParticles] = useState([]);
    
    // Комбинации и их множители
    const combinations = {
        '7': { name: 'Счастливая семерка', multiplier: 8, icon: '🍀', color: '#f1c40f', description: 'Удача на вашей стороне!' },
        '11': { name: 'Одиннадцать', multiplier: 6, icon: '✨', color: '#e67e22', description: 'Отличная комбинация!' },
        '2': { name: 'Змеиные глаза', multiplier: 15, icon: '🐍', color: '#2ecc71', description: 'Редкая комбинация!' },
        '12': { name: 'Боксерские перчатки', multiplier: 15, icon: '🥊', color: '#e74c3c', description: 'Максимальная удача!' },
        'double': { name: 'Дубль', multiplier: 5, icon: '🎲', color: '#9b59b6', description: 'Одинаковые кости!' },
        'even': { name: 'Четная сумма', multiplier: 1.5, icon: '📊', color: '#3498db', description: 'Хороший результат' },
        'odd': { name: 'Нечетная сумма', multiplier: 1.2, icon: '🎯', color: '#1abc9c', description: 'Неплохо!' },
        '3': { name: 'Тройка', multiplier: 4, icon: '3️⃣', color: '#f39c12', description: 'Счастливое число' },
        '4': { name: 'Четверка', multiplier: 3, icon: '4️⃣', color: '#16a085', description: 'Хорошо!' },
        '5': { name: 'Пятерка', multiplier: 2.5, icon: '5️⃣', color: '#27ae60', description: 'Неплохо!' },
        '6': { name: 'Шестерка', multiplier: 2, icon: '6️⃣', color: '#2980b9', description: 'Средний результат' },
        '8': { name: 'Восьмерка', multiplier: 2.5, icon: '8️⃣', color: '#8e44ad', description: 'Хорошо!' },
        '9': { name: 'Девятка', multiplier: 3, icon: '9️⃣', color: '#d35400', description: 'Отлично!' },
        '10': { name: 'Десятка', multiplier: 4, icon: '🔟', color: '#c0392b', description: 'Прекрасно!' }
    };
    
    // Создание частиц для эффекта выигрыша
    const createParticles = () => {
        const newParticles = [];
        for (let i = 0; i < 30; i++) {
            newParticles.push({
                id: Date.now() + i + Math.random(),
                x: Math.random() * window.innerWidth,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 8,
                life: 1,
                color: `hsl(${Math.random() * 60 + 40}, 100%, 60%)`
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
        
        // Анимация частиц
        const interval = setInterval(() => {
            setParticles(prev => prev.filter(p => p.life > 0).map(p => ({
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                vy: p.vy + 0.3,
                life: p.life - 0.02
            })));
        }, 16);
        
        setTimeout(() => clearInterval(interval), 1500);
    };
    
    // Сохранение джекпота
    const saveJackpot = (value) => {
        setJackpot(value);
        localStorage.setItem('dice_jackpot', value);
    };
    
    // Загрузка джекпота
    useEffect(() => {
        const saved = localStorage.getItem('dice_jackpot');
        if (saved) setJackpot(parseInt(saved));
        
        const savedHistory = localStorage.getItem('dice_history');
        if (savedHistory) {
            try {
                setComboHistory(JSON.parse(savedHistory));
            } catch(e) {}
        }
    }, []);
    
    // Определение комбинации и расчет выигрыша
    const evaluateRoll = (val1, val2) => {
        const sum = val1 + val2;
        const isDouble = val1 === val2;
        let winAmount = 0;
        let combo = null;
        
        // Особые комбинации
        if (isDouble && sum === 2) {
            winAmount = 50 * betMultiplier;
            combo = combinations['2'];
        } else if (isDouble && sum === 12) {
            winAmount = 50 * betMultiplier;
            combo = combinations['12'];
        } else if (sum === 7) {
            winAmount = 30 * betMultiplier;
            combo = combinations['7'];
        } else if (sum === 11) {
            winAmount = 25 * betMultiplier;
            combo = combinations['11'];
        } else if (isDouble) {
            winAmount = 20 * betMultiplier;
            combo = combinations['double'];
        } else if (sum === 10) {
            winAmount = 18 * betMultiplier;
            combo = combinations['10'];
        } else if (sum === 9) {
            winAmount = 14 * betMultiplier;
            combo = combinations['9'];
        } else if (sum === 8) {
            winAmount = 12 * betMultiplier;
            combo = combinations['8'];
        } else if (sum === 3) {
            winAmount = 16 * betMultiplier;
            combo = combinations['3'];
        } else if (sum === 4) {
            winAmount = 12 * betMultiplier;
            combo = combinations['4'];
        } else if (sum === 5) {
            winAmount = 10 * betMultiplier;
            combo = combinations['5'];
        } else if (sum === 6) {
            winAmount = 8 * betMultiplier;
            combo = combinations['6'];
        } else if (sum % 2 === 0) {
            winAmount = 6 * betMultiplier;
            combo = combinations['even'];
        } else {
            winAmount = 4 * betMultiplier;
            combo = combinations['odd'];
        }
        
        // Шанс на джекпот (1%)
        const jackpotChance = Math.random() < 0.01;
        let isJackpot = false;
        
        if (jackpotChance && winAmount > 0) {
            winAmount += jackpot;
            combo = { ...combo, name: `${combo.name} + ДЖЕКПОТ!`, multiplier: combo.multiplier + 10, icon: '💎' };
            saveJackpot(JACKPOT_BASE);
            isJackpot = true;
        } else if (!jackpotChance && winAmount === 0) {
            // Добавляем немного в джекпот при проигрыше
            const addedToJackpot = Math.floor(ROLL_COST * betMultiplier * 0.1);
            saveJackpot(jackpot + addedToJackpot);
        }
        
        return { winAmount, combo, isJackpot };
    };
    
    const rollDice = () => {
        if (isRolling) return;
        
        const totalCost = ROLL_COST * betMultiplier;
        if (userBalance < totalCost) {
            alert(`❌ Недостаточно бонусов! Нужно ${totalCost} бонусов.`);
            return;
        }
        
        onBalanceUpdate(-totalCost, 'spend');
        setIsRolling(true);
        setResult(null);
        
        let rollCount = 0;
        const maxRolls = 12;
        const final1 = Math.floor(Math.random() * 6) + 1;
        const final2 = Math.floor(Math.random() * 6) + 1;
        
        const interval = setInterval(() => {
            // Показываем случайные значения во время анимации
            setDice1(Math.floor(Math.random() * 6) + 1);
            setDice2(Math.floor(Math.random() * 6) + 1);
            rollCount++;
            
            if (rollCount >= maxRolls) {
                clearInterval(interval);
                setDice1(final1);
                setDice2(final2);
                
                const { winAmount, combo, isJackpot } = evaluateRoll(final1, final2);
                
                setTimeout(() => {
                    if (winAmount > 0) {
                        onBalanceUpdate(winAmount, 'earn');
                        setLastWin(winAmount);
                        createParticles();
                        
                        // Добавляем в историю
                        const newHistory = [{
                            id: Date.now(),
                            dice1: final1,
                            dice2: final2,
                            combo: combo?.name || 'Нет выигрыша',
                            win: winAmount,
                            multiplier: betMultiplier
                        }, ...comboHistory].slice(0, 10);
                        setComboHistory(newHistory);
                        localStorage.setItem('dice_history', JSON.stringify(newHistory));
                        
                        setResult({
                            win: true,
                            amount: winAmount,
                            combo: combo,
                            message: `${combo?.icon || '🎉'} ${combo?.name || 'Выигрыш'}! +${winAmount} бонусов!`,
                            isJackpot
                        });
                        
                        // Вибрация при большом выигрыше
                        if (winAmount > 100) {
                            try { navigator.vibrate?.(200); } catch(e) {}
                        }
                    } else {
                        setResult({
                            win: false,
                            amount: 0,
                            message: `😢 Выпало ${final1} и ${final2} (сумма ${final1 + final2}). Попробуйте ещё раз!`
                        });
                    }
                    
                    setIsRolling(false);
                    
                    if (typeof window.updateQuestProgress === 'function') {
                        window.updateQuestProgress('play_dice', 1);
                    }
                }, 200);
            }
        }, 80);
    };
    
    // Функция для отображения точек на кубике
    const renderDiceDots = (value) => {
        const dotPositions = {
            1: [[1, 1]],
            2: [[0, 0], [2, 2]],
            3: [[0, 0], [1, 1], [2, 2]],
            4: [[0, 0], [0, 2], [2, 0], [2, 2]],
            5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
            6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]]
        };
        
        const positions = dotPositions[value] || [];
        
        return (
            <div className="dice-dots-grid">
                {[0, 1, 2].map(row => (
                    [0, 1, 2].map(col => {
                        const hasDot = positions.some(([r, c]) => r === row && c === col);
                        return (
                            <div 
                                key={`${row}-${col}`} 
                                className={`dice-dot ${hasDot ? 'active' : ''}`}
                            />
                        );
                    })
                ))}
            </div>
        );
    };
    
    return (
        <div className="dice-roll-container">
            {/* Частицы для эффекта */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="particle"
                    style={{
                        position: 'fixed',
                        left: p.x,
                        top: p.y,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        opacity: p.life,
                        backgroundColor: p.color,
                        pointerEvents: 'none',
                        zIndex: 1000,
                        transform: `scale(${p.life})`
                    }}
                />
            ))}
            
            <div className="dice-header">
                <div className="dice-title">
                    <span className="dice-main-emoji">🎲</span>
                    <h3>Кости: Премиум</h3>
                </div>
                <div className="dice-stats-panel">
                    <div className="jackpot-display">
                        <span className="jackpot-icon">💎</span>
                        <span className="jackpot-value">{jackpot.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            {/* Множитель ставки */}
            <div className="bet-multiplier-section">
                <div className="multiplier-label">Множитель ставки:</div>
                <div className="multiplier-buttons">
                    {[1, 2, 3, 5, 10].map(mult => (
                        <button
                            key={mult}
                            className={`multiplier-btn ${betMultiplier === mult ? 'active' : ''}`}
                            onClick={() => setBetMultiplier(mult)}
                            disabled={isRolling}
                        >
                            x{mult}
                        </button>
                    ))}
                </div>
                <div className="total-cost">
                    Стоимость: <span className="cost-value">{ROLL_COST * betMultiplier}</span> бонусов
                </div>
            </div>
            
            {/* Игровая область с костями */}
            <div className="dice-game-area">
                <div className="dice-table">
                    <div className={`dice-wrapper ${isRolling ? 'rolling' : ''}`}>
                        <div className="dice-cube">
                            {renderDiceDots(dice1)}
                        </div>
                    </div>
                    <div className="dice-vs">VS</div>
                    <div className={`dice-wrapper ${isRolling ? 'rolling' : ''}`}>
                        <div className="dice-cube">
                            {renderDiceDots(dice2)}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Кнопка броска */}
            <div className="dice-controls">
                <button
                    className={`roll-btn ${isRolling ? 'spinning' : ''}`}
                    onClick={rollDice}
                    disabled={isRolling || userBalance < ROLL_COST * betMultiplier}
                >
                    {isRolling ? (
                        <><span className="spinner-icon">🎲</span> Бросаем...</>
                    ) : (
                        <><span className="roll-icon">🎲</span> Бросить кости!</>
                    )}
                </button>
            </div>
            
            {/* Результат */}
            {result && (
                <div className={`dice-result ${result.win ? 'win' : 'lose'} ${result.isJackpot ? 'jackpot' : ''}`}>
                    <div className="result-emoji">{result.win ? (result.isJackpot ? '💎' : '🎉') : '😢'}</div>
                    <div className="result-message">{result.message}</div>
                    {result.win && result.combo && (
                        <div className="combo-badge" style={{ backgroundColor: result.combo.color }}>
                            x{result.combo.multiplier}
                        </div>
                    )}
                </div>
            )}
            
            {/* Последний выигрыш */}
            {lastWin !== null && !result && lastWin > 0 && (
                <div className="last-win-card">
                    <span className="trophy-icon">🏆</span>
                    <span>Последний выигрыш: {lastWin} бонусов</span>
                </div>
            )}
            
            {/* Таблица комбинаций */}
            <div className="combinations-section">
                <button 
                    className="combinations-toggle"
                    onClick={() => setShowCombinations(!showCombinations)}
                >
                    {showCombinations ? '📋 Скрыть комбинации' : '📖 Показать все комбинации'}
                </button>
                
                {showCombinations && (
                    <div className="combinations-grid">
                        {Object.entries(combinations).map(([key, combo]) => (
                            <div key={key} className="combo-card" style={{ borderColor: combo.color }}>
                                <div className="combo-icon">{combo.icon}</div>
                                <div className="combo-name">{combo.name}</div>
                                <div className="combo-multiplier">x{combo.multiplier}</div>
                                <div className="combo-desc">{combo.description}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* История комбинаций */}
            {comboHistory.length > 0 && (
                <div className="history-section">
                    <div className="history-title">📜 Последние выигрыши</div>
                    <div className="history-list">
                        {comboHistory.slice(0, 5).map(entry => (
                            <div key={entry.id} className="history-item">
                                <div className="history-dice">
                                    🎲 {entry.dice1} + {entry.dice2}
                                </div>
                                <div className="history-combo">{entry.combo}</div>
                                <div className="history-win">+{entry.win}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}