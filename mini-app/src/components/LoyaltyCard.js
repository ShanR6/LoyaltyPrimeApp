import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export function LoyaltyCard({ userInfo, userBalance, selectedGroup, onBalanceUpdate }) {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [qrData, setQrData] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [countdown, setCountdown] = useState(0);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Генерация QR-кода с данными пользователя
    const generateQRCode = async () => {
        if (!userInfo || !selectedGroup) return;
        
        setIsGenerating(true);
        
        // Формируем данные для QR-кода
        const qrDataString = JSON.stringify({
            vkId: userInfo.id,
            userName: `${userInfo.first_name} ${userInfo.last_name}`,
            companyId: selectedGroup.id,
            companyName: selectedGroup.name,
            balance: userBalance,
            timestamp: Date.now(),
            expiresIn: 5 * 60 * 1000, // 5 минут
            version: '1.0'
        });
        
        setQrData(qrDataString);
        
        try {
            const qrDataUrl = await QRCode.toDataURL(qrDataString, {
                width: 300,
                margin: 2,
                color: {
                    dark: selectedGroup.color || '#000000',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'H'
            });
            setQrCodeUrl(qrDataUrl);
            setLastUpdated(Date.now());
            setCountdown(300);
            
            // Сохраняем в localStorage для синхронизации
            localStorage.setItem('lastQRData', JSON.stringify({
                qrDataUrl,
                qrDataString,
                timestamp: Date.now(),
                userInfo: { id: userInfo.id, name: `${userInfo.first_name} ${userInfo.last_name}` }
            }));
        } catch (err) {
            console.error('Ошибка генерации QR-кода:', err);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Таймер обратного отсчёта
    useEffect(() => {
        if (countdown <= 0) return;
        
        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
        
        return () => clearInterval(timer);
    }, [countdown]);
    
    // Автоматическое обновление QR-кода каждые 5 минут
    useEffect(() => {
        generateQRCode();
        
        const interval = setInterval(() => {
            generateQRCode();
        }, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [userInfo, selectedGroup, userBalance]);
    
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Копирование QR-кода в буфер обмена
    const copyQRCode = async () => {
        if (!qrCodeUrl && !qrData) {
            await generateQRCode();
        }
        
        try {
            // Копируем текст QR-данных
            await navigator.clipboard.writeText(qrData);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
            
            // Вибрация при успешном копировании (если доступно)
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
        } catch (err) {
            // Fallback: показываем alert с данными
            alert('QR-данные:\n' + qrData);
        }
    };
    
    const saveQRCode = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `loyalty_qr_${userInfo?.id}_${selectedGroup?.id}.png`;
            link.click();
        }
    };
    
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>🎫 Моя карта лояльности</h3>
                <button onClick={generateQRCode} style={styles.refreshBtn} disabled={isGenerating}>
                    {isGenerating ? '🔄 Генерация...' : '🔄 Обновить'}
                </button>
            </div>
            
            <div style={styles.qrContainer}>
                {qrCodeUrl ? (
                    <img 
                        src={qrCodeUrl} 
                        alt="QR-код для кассы" 
                        style={styles.qrCode}
                    />
                ) : (
                    <div style={styles.qrPlaceholder}>
                        <div>{isGenerating ? 'Генерация QR-кода...' : '📱'}</div>
                    </div>
                )}
                
                <div style={styles.qrHint}>
                    <div>📸 Покажите этот QR-код кассиру</div>
                    <div style={styles.timer}>
                        ⏱️ Действителен: {formatTime(countdown)}
                    </div>
                </div>
            </div>
            
            {/* Кнопки копирования и сохранения */}
            <div style={styles.actionButtons}>
                <button 
                    onClick={copyQRCode} 
                    style={{...styles.actionBtn, ...styles.copyBtn}}
                    disabled={!qrCodeUrl}
                >
                    {copySuccess ? '✅ Скопировано!' : '📋 Скопировать QR-код'}
                </button>
                <button 
                    onClick={saveQRCode} 
                    style={{...styles.actionBtn, ...styles.saveBtn}}
                    disabled={!qrCodeUrl}
                >
                    💾 Сохранить QR
                </button>
            </div>
            
            <div style={styles.userInfo}>
                <div style={styles.userName}>
                    {userInfo?.first_name} {userInfo?.last_name}
                </div>
                <div style={styles.userId}>
                    ID: {userInfo?.id}
                </div>
            </div>
            
            <div style={styles.balanceInfo}>
                <div style={styles.balanceLabel}>💰 Баланс бонусов</div>
                <div style={styles.balanceValue}>{userBalance}</div>
                <div style={styles.balanceHint}>
                    {selectedGroup?.name && `в ${selectedGroup.name}`}
                </div>
            </div>
            
            <div style={styles.cardFooter}>
                <div style={styles.level}>
                    {userBalance >= 1000 ? '💎 VIP' : userBalance >= 500 ? '🥇 Золото' : userBalance >= 200 ? '🥈 Серебро' : '🥉 Бронза'}
                </div>
                <div style={styles.multiplier}>
                    Множитель: x{userBalance >= 1000 ? 2 : userBalance >= 500 ? 1.5 : 1.2}
                </div>
            </div>
            
            <div style={styles.instruction}>
                <div style={styles.instructionTitle}>📖 Как использовать:</div>
                <ol style={styles.instructionList}>
                    <li>Покажите QR-код кассиру</li>
                    <li>Кассир сканирует код</li>
                    <li>Бонусы автоматически начислятся</li>
                    <li>QR-код обновляется каждые 5 минут</li>
                </ol>
            </div>
        </div>
    );
}

const styles = {
    container: {
        background: 'rgba(30, 35, 48, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: 28,
        padding: 20,
        marginBottom: 20,
        border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 18,
        fontWeight: 700,
        margin: 0
    },
    refreshBtn: {
        background: 'rgba(255,255,255,0.1)',
        border: 'none',
        padding: '8px 16px',
        borderRadius: 20,
        color: 'white',
        fontSize: 12,
        cursor: 'pointer'
    },
    qrContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 20
    },
    qrCode: {
        width: 250,
        height: 250,
        borderRadius: 20,
        backgroundColor: 'white',
        padding: 10,
        cursor: 'pointer'
    },
    qrPlaceholder: {
        width: 250,
        height: 250,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaa',
        fontSize: 48
    },
    qrHint: {
        textAlign: 'center',
        marginTop: 12,
        fontSize: 12,
        opacity: 0.8
    },
    timer: {
        fontSize: 11,
        color: '#ffd966',
        marginTop: 4
    },
    actionButtons: {
        display: 'flex',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 20
    },
    actionBtn: {
        padding: '10px 20px',
        borderRadius: 30,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s ease'
    },
    copyBtn: {
        background: 'linear-gradient(135deg, #3498db, #2980b9)',
        color: 'white',
        flex: 1
    },
    saveBtn: {
        background: 'rgba(255,255,255,0.1)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.2)',
        flex: 1
    },
    userInfo: {
        textAlign: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
    },
    userName: {
        fontWeight: 700,
        fontSize: 18,
        marginBottom: 4
    },
    userId: {
        fontSize: 11,
        opacity: 0.6
    },
    balanceInfo: {
        textAlign: 'center',
        marginBottom: 16,
        padding: 16,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 20
    },
    balanceLabel: {
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 8
    },
    balanceValue: {
        fontSize: 36,
        fontWeight: 800,
        color: '#ffd966'
    },
    balanceHint: {
        fontSize: 10,
        opacity: 0.5,
        marginTop: 4
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8
    },
    level: {
        padding: '6px 12px',
        background: 'rgba(255,215,0,0.15)',
        borderRadius: 20,
        fontSize: 12
    },
    multiplier: {
        padding: '6px 12px',
        background: 'rgba(46,204,113,0.15)',
        borderRadius: 20,
        fontSize: 12,
        color: '#2ecc71'
    },
    instruction: {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 12,
        fontSize: 11
    },
    instructionTitle: {
        fontWeight: 600,
        marginBottom: 8
    },
    instructionList: {
        marginLeft: 20,
        lineHeight: 1.6
    }
};