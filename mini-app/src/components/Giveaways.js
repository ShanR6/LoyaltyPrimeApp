import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

export function Giveaways({ selectedGroupId }) {
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedGroupId) {
      loadGiveaways();
    }
  }, [selectedGroupId]);

  const loadGiveaways = async () => {
    if (!selectedGroupId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/giveaways/${selectedGroupId}/active`);
      const data = await response.json();
      
      if (data.success) {
        setGiveaways(data.giveaways);
      } else {
        setError('Ошибка загрузки розыгрышей');
      }
    } catch (error) {
      console.error('Ошибка загрузки розыгрышей:', error);
      setError('Не удалось загрузить розыгрыши');
    } finally {
      setLoading(false);
    }
  };

  const openGiveaway = (link) => {
    // Открываем ссылку в новом окне/вкладке
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div style={{ 
        background: 'rgba(30, 35, 48, 0.7)', 
        borderRadius: 28, 
        padding: 20,
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ fontSize: 16 }}>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        background: 'rgba(30, 35, 48, 0.7)', 
        borderRadius: 28, 
        padding: 20,
        textAlign: 'center',
        color: '#ff6b6b'
      }}>
        <div style={{ fontSize: 16 }}>{error}</div>
        <button 
          onClick={loadGiveaways}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  if (giveaways.length === 0) {
    return (
      <div style={{ 
        background: 'rgba(30, 35, 48, 0.7)', 
        borderRadius: 28, 
        padding: 20,
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎰</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Нет активных розыгрышей
        </div>
        <div style={{ fontSize: 12, opacity: 0.5 }}>
          Следите за обновлениями! Скоро появятся новые розыгрыши 🎁
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(30, 35, 48, 0.7)', 
      borderRadius: 28, 
      padding: 20
    }}>
      <h3 style={{ 
        fontSize: 18, 
        marginBottom: 16, 
        color: 'white',
        fontWeight: 700
      }}>
        🎰 Розыгрыши
      </h3>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12 
      }}>
        {giveaways.map(giveaway => (
          <div 
            key={giveaway.id}
            style={{ 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: 16, 
              padding: 16,
              cursor: 'pointer',
              transition: 'transform 0.2s, background 0.2s',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onClick={() => openGiveaway(giveaway.link)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 8 
            }}>
              <div style={{ 
                fontWeight: 700, 
                fontSize: 16,
                color: 'white',
                flex: 1
              }}>
                🎁 {giveaway.name}
              </div>
              <div style={{
                fontSize: 12,
                color: '#3498db',
                fontWeight: 600
              }}>
                Открыть →
              </div>
            </div>
            
            {giveaway.description && (
              <div style={{ 
                fontSize: 13, 
                opacity: 0.7, 
                marginBottom: 8, 
                color: 'white',
                lineHeight: 1.4
              }}>
                {giveaway.description}
              </div>
            )}
            
            <div style={{ 
              fontSize: 11, 
              color: 'rgba(255,255,255,0.4)',
              marginTop: 8
            }}>
              Создан: {new Date(giveaway.created_at).toLocaleDateString('ru-RU')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
