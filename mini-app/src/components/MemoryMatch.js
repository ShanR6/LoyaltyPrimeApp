import { useState, useEffect } from 'react';
import './MemoryMatch.css';

const CARD_SYMBOLS = ['🎁', '💰', '🎉', '⭐', '🏆', '🍕', '🎮', '🏅'];
const PAIR_REWARD = 10;
const PERFECT_REWARD = 50;

export function MemoryMatch({ onBalanceUpdate }) {
    const [cards, setCards] = useState([]);
    const [flippedIndexes, setFlippedIndexes] = useState([]);
    const [matchedIndexes, setMatchedIndexes] = useState([]);
    const [moves, setMoves] = useState(0);
    const [gameComplete, setGameComplete] = useState(false);
    const [reward, setReward] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [timeElapsed, setTimeElapsed] = useState(0);
    
    useEffect(() => {
        startNewGame();
    }, []);
    
    useEffect(() => {
        let timer;
        if (startTime && !gameComplete) {
            timer = setInterval(() => {
                setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [startTime, gameComplete]);
    
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };
    
    const startNewGame = () => {
        const duplicated = [...CARD_SYMBOLS, ...CARD_SYMBOLS];
        const shuffled = shuffleArray(duplicated);
        setCards(shuffled.map((symbol, index) => ({ id: index, symbol, matched: false })));
        setFlippedIndexes([]);
        setMatchedIndexes([]);
        setMoves(0);
        setGameComplete(false);
        setReward(0);
        setStartTime(Date.now());
        setTimeElapsed(0);
    };
    
    const handleCardClick = (index) => {
        if (gameComplete) return;
        if (flippedIndexes.includes(index)) return;
        if (matchedIndexes.includes(index)) return;
        if (flippedIndexes.length === 2) return;
        
        const newFlipped = [...flippedIndexes, index];
        setFlippedIndexes(newFlipped);
        
        if (newFlipped.length === 2) {
            setMoves(moves + 1);
            const card1 = cards[newFlipped[0]];
            const card2 = cards[newFlipped[1]];
            
            if (card1.symbol === card2.symbol) {
                setTimeout(() => {
                    setMatchedIndexes([...matchedIndexes, newFlipped[0], newFlipped[1]]);
                    setFlippedIndexes([]);
                    
                    const newMatchedCount = matchedIndexes.length + 2;
                    if (newMatchedCount === cards.length) {
                        const timeBonus = Math.max(0, 60 - timeElapsed);
                        const totalReward = PAIR_REWARD * CARD_SYMBOLS.length + Math.floor(timeBonus / 10) * 5;
                        setReward(totalReward);
                        onBalanceUpdate(totalReward, 'earn');
                        setGameComplete(true);
                        
                        if (typeof window.updateQuestProgress === 'function') {
                            window.updateQuestProgress('play_memory', 1);
                        }
                    }
                }, 500);
            } else {
                setTimeout(() => {
                    setFlippedIndexes([]);
                }, 1000);
            }
        }
    };
    
    const getCardStatus = (index) => {
        if (matchedIndexes.includes(index)) return 'matched';
        if (flippedIndexes.includes(index)) return 'flipped';
        return 'hidden';
    };
    
    return (
        <div className="memory-match-container">
            <div className="memory-header">
                <h3>🧠 Найди пару</h3>
                <div className="memory-stats">
                    <div className="stat">🎯 Ходы: {moves}</div>
                    <div className="stat">⏱️ {timeElapsed}с</div>
                    {gameComplete && <div className="stat win">🏆 +{reward}</div>}
                </div>
            </div>
            
            <div className="memory-grid">
                {cards.map((card, index) => (
                    <div
                        key={card.id}
                        className={`memory-card ${getCardStatus(index)}`}
                        onClick={() => handleCardClick(index)}
                    >
                        <div className="card-front">{card.symbol}</div>
                        <div className="card-back">?</div>
                    </div>
                ))}
            </div>
            
            <button className="memory-restart" onClick={startNewGame}>
                🔄 Новая игра
            </button>
            
            {gameComplete && (
                <div className="memory-complete">
                    <div className="complete-emoji">🎉🏆✨</div>
                    <div className="complete-text">Поздравляю! Выиграно {reward} бонусов!</div>
                </div>
            )}
        </div>
    );
}