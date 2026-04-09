import React, { useState } from 'react';

export function ScratchCard({ onWin, userBalance, onBalanceUpdate }) {
  const [scratched, setScratched] = useState(false);
  const [prize, setPrize] = useState(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [canScratch, setCanScratch] = useState(true);

  const prizes = [
    { value: 5, probability: 35, label: '5 бонусов' },
    { value: 10, probability: 25, label: '10 бонусов' },
    { value: 20, probability: 15, label: '20 бонусов' },
    { value: 50, probability: 10, label: '50 бонусов' },
    { value: 100, probability: 8, label: '100 бонусов' },
    { value: 200, probability: 4, label: '200 бонусов' },
    { value: 0, probability: 3, label: '0 бонусов' }
  ];

  const getRandomPrize = () => {
    const random = Math.random() * 100;
    let cumulative = 0;
    for (const p of prizes) {
      cumulative += p.probability;
      if (random <= cumulative) {
        return p;
      }
    }
    return prizes[0];
  };

  const startScratching = () => {
    if (!canScratch || isScratching) return;
    
    setIsScratching(true);
    setScratchProgress(0);
    
    // Имитация процесса стирания
    const interval = setInterval(() => {
      setScratchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          completeScratch();
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const completeScratch = async () => {
    const wonPrize = getRandomPrize();
    setPrize(wonPrize);
    setScratched(true);
    setIsScratching(false);
    setCanScratch(false);
    
    if (wonPrize.value > 0 && onBalanceUpdate) {
      await onBalanceUpdate(wonPrize.value, 'earn');
      if (onWin) onWin(wonPrize.value);
    }
    
    // Сохраняем время последней скретч-карты
    localStorage.setItem('lastScratch', Date.now().toString());
  };

  // Проверка доступности (раз в день)
  React.useEffect(() => {
    const lastScratch = localStorage.getItem('lastScratch');
    if (lastScratch) {
      const lastDate = new Date(parseInt(lastScratch));
      const now = new Date();
      const hoursDiff = (now - lastDate) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        setCanScratch(false);
      }
    }
  }, []);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎫 Скретч-карта дня</h3>
      
      <div
        style={{
          ...styles.card,
          background: scratched ? 'linear-gradient(135deg, #2c3e50, #34495e)' : 'linear-gradient(135deg, #7f8c8d, #95a5a6)'
        }}
        onClick={startScratching}
      >
        {!scratched ? (
          <div style={styles.cardFront}>
            {isScratching ? (
              <div style={styles.scratchingProgress}>
                <div style={{ ...styles.progressBar, width: `${scratchProgress}%` }} />
                <span>Стираем... {scratchProgress}%</span>
              </div>
            ) : (
              <div style={styles.scratchInstruction}>
                <div style={styles.scratchIcon}>🎲</div>
                <div>Нажми, чтобы стереть</div>
                {!canScratch && <div style={styles.unavailable}>Доступно завтра</div>}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.cardBack}>
            {prize && (
              <>
                <div style={styles.prizeIcon}>🎁</div>
                <div style={styles.prizeValue}>
                  {prize.value > 0 ? `+${prize.value}` : prize.label}
                </div>
                {prize.value > 0 && <div style={styles.prizeLabel}>бонусов</div>}
              </>
            )}
          </div>
        )}
      </div>
      
      {!canScratch && !scratched && (
        <div style={styles.nextAvailable}>
          Новая скретч-карта будет доступна завтра
        </div>
      )}
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
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 15
  },
  card: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s'
  },
  cardFront: {
    textAlign: 'center',
    color: 'white',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  scratchInstruction: {
    textAlign: 'center'
  },
  scratchIcon: {
    fontSize: 48,
    marginBottom: 10
  },
  scratchingProgress: {
    textAlign: 'center',
    width: '80%'
  },
  progressBar: {
    height: 4,
    background: '#ffd966',
    borderRadius: 2,
    marginBottom: 10,
    transition: 'width 0.1s'
  },
  cardBack: {
    textAlign: 'center',
    color: '#ffd966'
  },
  prizeIcon: {
    fontSize: 48,
    marginBottom: 10
  },
  prizeValue: {
    fontSize: 36,
    fontWeight: 'bold'
  },
  prizeLabel: {
    fontSize: 14,
    opacity: 0.8
  },
  unavailable: {
    fontSize: 12,
    marginTop: 10,
    color: '#aaa'
  },
  nextAvailable: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.7
  }
};