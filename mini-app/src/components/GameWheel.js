import { useState, useRef, useEffect } from 'react';
import './GameWheel.css';

const SECTORS = [
    { name: '50 бонусов', value: 50, color: '#2ecc71', icon: '🎁' },
    { name: '10 бонусов', value: 10, color: '#3498db', icon: '💰' },
    { name: '100 бонусов', value: 100, color: '#e74c3c', icon: '🎉' },
    { name: 'Попробуй ещё', value: 0, color: '#95a5a6', icon: '😢' },
    { name: '25 бонусов', value: 25, color: '#f39c12', icon: '⭐' },
    { name: '5 бонусов', value: 5, color: '#1abc9c', icon: '🪙' },
    { name: '200 бонусов', value: 200, color: '#9b59b6', icon: '🏆' },
    { name: 'Скидка 10%', value: 'discount', color: '#e67e22', icon: '🎫' }
];

const SPIN_COST = 25;
const FREE_SPIN_DAYS = 1; // Бесплатное вращение каждые N дней

export function GameWheel({ onBalanceUpdate, userBalance }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [lastWin, setLastWin] = useState(null);
    const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
    const [useFreeSpin, setUseFreeSpin] = useState(false);
    const [rotation, setRotation] = useState(0);
    const wheelRef = useRef(null);
    
    // Загрузка данных о бесплатных вращениях
    useEffect(() => {
        const lastSpinDate = localStorage.getItem('wheel_last_spin');
        const savedFreeSpins = localStorage.getItem('wheel_free_spins');
        
        if (savedFreeSpins) {
            setFreeSpinsLeft(parseInt(savedFreeSpins));
        }
        
        if (lastSpinDate) {
            const daysSinceLastSpin = Math.floor((Date.now() - new Date(lastSpinDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceLastSpin >= FREE_SPIN_DAYS && freeSpinsLeft === 0) {
                setFreeSpinsLeft(1);
                localStorage.setItem('wheel_free_spins', '1');
            }
        }
    }, []);
    
    const saveFreeSpins = (spins) => {
        setFreeSpinsLeft(spins);
        localStorage.setItem('wheel_free_spins', spins.toString());
    };
    
    const getPrize = (sectorIndex) => {
        const sector = SECTORS[sectorIndex];
        if (sector.value === 'discount') {
            return { type: 'discount', value: 10, message: '🎫 Скидка 10% на следующий заказ!' };
        }
        if (sector.value === 0) {
            return { type: 'lose', value: 0, message: '😢 Попробуйте ещё раз!' };
        }
        return { type: 'bonus', value: sector.value, message: `🎉 Вы выиграли ${sector.value} бонусов!` };
    };
    
    const spin = () => {
    if (isSpinning) return;
    
    // Проверка на бесплатное вращение
    let cost = SPIN_COST;
    let isFree = false;
    
    if (useFreeSpin && freeSpinsLeft > 0) {
        cost = 0;
        isFree = true;
        saveFreeSpins(freeSpinsLeft - 1);
        setUseFreeSpin(false);
    } else if (userBalance < SPIN_COST) {
        alert(`Недостаточно бонусов! Нужно ${SPIN_COST} бонусов.`);
        return;
    }
    
    // Списываем бонусы если платное вращение
    if (!isFree && cost > 0) {
        onBalanceUpdate(-cost, 'spend');
    }
    
    setIsSpinning(true);
    setResult(null);
    
    // Выбираем случайный сектор
    const weights = [15, 25, 5, 30, 20, 35, 3, 10];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let sectorIndex = 0;
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
            sectorIndex = i;
            break;
        }
    }
    
    const sectorAngle = 360 / SECTORS.length;
    const targetRotation = rotation + 360 * 5 + (360 - (sectorIndex * sectorAngle));
    
    setRotation(targetRotation);
    
    setTimeout(() => {
        const prize = getPrize(sectorIndex);
        
        if (prize.type === 'bonus' && prize.value > 0) {
            onBalanceUpdate(prize.value, 'earn');
            setLastWin(prize.value);
            
            // 🔥 ОБНОВЛЯЕМ КВЕСТ "ПОКРУТИТЬ КОЛЕСО" 🔥
            if (typeof window.updateQuestProgress === 'function') {
                window.updateQuestProgress('spin_wheel', 1);
                console.log('✅ Квест "Покрутить колесо" обновлен, выигрыш:', prize.value);
            }
        } else if (prize.type === 'discount') {
            const discounts = JSON.parse(localStorage.getItem('user_discounts') || '[]');
            discounts.push({
                id: Date.now(),
                value: prize.value,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                used: false
            });
            localStorage.setItem('user_discounts', JSON.stringify(discounts));
            setLastWin('10% скидка');
            
            // 🔥 ТОЖЕ ОБНОВЛЯЕМ КВЕСТ 🔥
            if (typeof window.updateQuestProgress === 'function') {
                window.updateQuestProgress('spin_wheel', 1);
            }
        }
        
        setResult(prize);
        setIsSpinning(false);
        
        if (!isFree) {
            localStorage.setItem('wheel_last_spin', new Date().toISOString());
        }
        
        if (prize.type === 'bonus' && prize.value > 50) {
            try {
                navigator.vibrate?.(200);
            } catch(e) {}
        }
    }, 3000);
};
    
    return (
        <div className="game-wheel-container">
            <div className="wheel-header">
                <h3>🎡 Колесо фортуны</h3>
                <div className="wheel-stats">
                    <div className="cost-badge">
                        🎟️ Стоимость: {SPIN_COST} бонусов
                    </div>
                    {freeSpinsLeft > 0 && (
                        <div className="free-spins-badge">
                            🆓 Бесплатных вращений: {freeSpinsLeft}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="wheel-wrapper">
                <div 
                    className="wheel"
                    ref={wheelRef}
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    {SECTORS.map((sector, index) => (
                        <div
                            key={index}
                            className="wheel-sector"
                            style={{
                                transform: `rotate(${index * (360 / SECTORS.length)}deg)`,
                                backgroundColor: sector.color
                            }}
                        >
                            <div className="sector-content">
                                <span className="sector-icon">{sector.icon}</span>
                                <span className="sector-name">{sector.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="wheel-pointer">▼</div>
            </div>
            
            <div className="wheel-controls">
                {freeSpinsLeft > 0 && (
                    <label className="free-spin-checkbox">
                        <input
                            type="checkbox"
                            checked={useFreeSpin}
                            onChange={(e) => setUseFreeSpin(e.target.checked)}
                            disabled={isSpinning}
                        />
                        Использовать бесплатное вращение
                    </label>
                )}
                
                <button
                    className={`spin-btn ${isSpinning ? 'spinning' : ''}`}
                    onClick={spin}
                    disabled={isSpinning || (userBalance < SPIN_COST && freeSpinsLeft === 0)}
                >
                    {isSpinning ? '🌀 Вращение...' : '🎲 Крутить!'}
                </button>
            </div>
            
            {result && (
                <div className={`wheel-result ${result.type === 'bonus' && result.value > 0 ? 'win' : result.type === 'discount' ? 'discount' : 'lose'}`}>
                    {result.message}
                </div>
            )}
            
            {lastWin && !result && (
                <div className="last-win">
                    🏆 Последний выигрыш: {typeof lastWin === 'number' ? `${lastWin} бонусов` : lastWin}
                </div>
            )}
        </div>
    );
}