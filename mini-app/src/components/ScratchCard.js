// ScratchCard.js - 3x3, 3 попытки, найди 3 одинаковых
import { useState } from 'react';
import './ScratchCard.css';

const CARD_COST = 20;


async function loadScratchSettingsFromServer(companyId) {
    try {
        const response = await fetch(`${API_URL}/api/games/${companyId}/scratch`);
        const data = await response.json();
        if (data.success) {
            return {
                cost: data.settings.cost || 20,
                maxAttempts: data.settings.maxAttempts || 3,
                symbols: data.settings.symbols || SYMBOLS,
                hintCost: data.settings.hintCost || 15,
                active: data.active
            };
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
    return { cost: 20, maxAttempts: 3, symbols: SYMBOLS, hintCost: 15, active: true };
}
// Символы для игры
const SYMBOLS = [
    { id: '🍒', name: 'Вишня', value: 10, multiplier: 1, color: '#e74c3c' },
    { id: '🍋', name: 'Лимон', value: 15, multiplier: 1.5, color: '#f1c40f' },
    { id: '🍊', name: 'Апельсин', value: 20, multiplier: 2, color: '#e67e22' },
    { id: '🍉', name: 'Арбуз', value: 25, multiplier: 2.5, color: '#2ecc71' },
    { id: '⭐', name: 'Звезда', value: 50, multiplier: 5, color: '#f39c12' },
    { id: '💎', name: 'Алмаз', value: 100, multiplier: 10, color: '#9b59b6' },
    { id: '7️⃣', name: 'Семёрка', value: 200, multiplier: 20, color: '#e74c3c' },
    { id: '🎰', name: 'ДЖЕКПОТ', value: 500, multiplier: 50, color: '#ff4d4d' }
];

// Создание игрового поля 3x3
const createBoard = () => {
    // Выбираем случайный символ для победы
    const winningSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    
    // Создаем массив из 9 ячеек
    const board = [];
    
    // Добавляем 3 выигрышных символа
    for (let i = 0; i < 3; i++) {
        board.push({
            id: `${winningSymbol.id}_win_${i}`,
            symbol: winningSymbol,
            revealed: false,
            isWinning: true
        });
    }
    
    // Добавляем 6 проигрышных символов (случайные, но не выигрышный)
    const otherSymbols = SYMBOLS.filter(s => s.id !== winningSymbol.id);
    for (let i = 0; i < 6; i++) {
        const randomSymbol = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
        board.push({
            id: `${randomSymbol.id}_lose_${i}`,
            symbol: randomSymbol,
            revealed: false,
            isWinning: false
        });
    }
    
    // Перемешиваем массив
    for (let i = board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [board[i], board[j]] = [board[j], board[i]];
    }
    
    return board;
};

export function ScratchCard({ onBalanceUpdate, userBalance }) {
    const [board, setBoard] = useState([]);
    const [gameActive, setGameActive] = useState(true);
    const [isRevealing, setIsRevealing] = useState(false);
    const [result, setResult] = useState(null);
    const [lastWin, setLastWin] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [foundWinning, setFoundWinning] = useState(0);
    const [selectedSymbol, setSelectedSymbol] = useState(null);

    // Новая игра
    const newGame = () => {
        if (isRevealing) return;
        
        if (userBalance < CARD_COST) {
            alert(`❌ Недостаточно бонусов! Нужно ${CARD_COST} бонусов.`);
            return;
        }
        
        onBalanceUpdate(-CARD_COST, 'spend');
        
        const newBoard = createBoard();
        // Находим выигрышный символ
        const winningSym = newBoard.find(cell => cell.isWinning)?.symbol;
        
        setBoard(newBoard);
        setSelectedSymbol(winningSym);
        setGameActive(true);
        setResult(null);
        setLastWin(null);
        setShowConfetti(false);
        setAttemptsLeft(3);
        setFoundWinning(0);
    };

    // Открыть ячейку
    const revealCell = (index) => {
        if (!gameActive) return;
        if (isRevealing) return;
        if (board[index].revealed) return;
        if (attemptsLeft <= 0) return;
        
        setIsRevealing(true);
        
        setTimeout(() => {
            const newBoard = [...board];
            newBoard[index].revealed = true;
            setBoard(newBoard);
            
            const newAttemptsLeft = attemptsLeft - 1;
            setAttemptsLeft(newAttemptsLeft);
            
            // Проверяем, выигрышная ли ячейка
            if (newBoard[index].isWinning) {
                const newFoundWinning = foundWinning + 1;
                setFoundWinning(newFoundWinning);
                
                // Если нашли 3 выигрышных символа - ПОБЕДА!
                if (newFoundWinning === 3) {
                    const winAmount = newBoard[index].symbol.value * newBoard[index].symbol.multiplier;
                    onBalanceUpdate(winAmount, 'earn');
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
            
            // Если кончились попытки и не собрали 3 одинаковых - ПРОИГРЫШ
            if (newAttemptsLeft === 0 && foundWinning < 2) {
                setResult({
                    type: 'lose',
                    value: 0,
                    message: `😢 Вы не нашли 3 одинаковых символа за 3 попытки. Попробуйте ещё раз!`
                });
                setGameActive(false);
            }
            
            setIsRevealing(false);
            
            if (typeof window.updateQuestProgress === 'function') {
                window.updateQuestProgress('scratch_card', 1);
            }
        }, 200);
    };

    // Подсказка - показать одну выигрышную ячейку (за бонусы)
    const showHint = () => {
        if (!gameActive) return;
        if (isRevealing) return;
        if (attemptsLeft <= 0) return;
        
        // Находим неоткрытую выигрышную ячейку
        const unrevealedWinning = board.findIndex(cell => cell.isWinning && !cell.revealed);
        
        if (unrevealedWinning !== -1 && userBalance >= 15) {
            onBalanceUpdate(-15, 'spend');
            revealCell(unrevealedWinning);
        } else if (unrevealedWinning === -1) {
            alert('❌ Нет доступных подсказок!');
        } else {
            alert(`❌ Недостаточно бонусов! Нужно 15 бонусов за подсказку.`);
        }
    };

    return (
        <div className="scratch-card-3x3">
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
                    <span className="cost-value">{CARD_COST}</span>
                </div>
            </div>
            
            <div className="game-rules">
                <div className="rule-item">🎯 Найдите 3 одинаковых символа</div>
                <div className="rule-item">🖱️ У вас всего 3 попытки!</div>
                <div className="rule-item">🏆 Соберите все 3 и выиграйте множитель!</div>
            </div>
            
            {/* Прогресс */}
            <div className="game-progress">
                <div className="progress-text">
                    🎲 Попыток осталось: {attemptsLeft} / 3
                </div>
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${(3 - attemptsLeft) / 3 * 100}%` }}
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
            
            {/* Выигрышный символ (скрыт до победы) */}
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
                        onClick={() => revealCell(index)}
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
                    disabled={isRevealing}
                >
                    🎲 НОВАЯ ИГРА
                </button>
                {gameActive && attemptsLeft > 0 && foundWinning < 3 && (
                    <button
                        className="hint-btn"
                        onClick={showHint}
                        disabled={isRevealing}
                    >
                        💡 ПОДСКАЗКА (15)
                    </button>
                )}
            </div>
            
            {/* Результат */}
            {result && (
                <div className={`game-result ${result.type === 'win' ? 'win' : 'lose'} show`}>
                    <div className="result-icon">{result.type === 'win' ? '🏆' : '😢'}</div>
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
                    {SYMBOLS.map(sym => (
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
