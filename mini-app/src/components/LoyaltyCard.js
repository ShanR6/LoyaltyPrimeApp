import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export function LoyaltyCard({ userInfo, userBalance, selectedGroup, onBalanceUpdate, tiers, userTierData, onRefresh }) {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [qrData, setQrData] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showTiersModal, setShowTiersModal] = useState(false);
    const [localTiers, setLocalTiers] = useState(tiers || []);
    const [localUserTierData, setLocalUserTierData] = useState(userTierData || null);
    const [refreshing, setRefreshing] = useState(false);

    // Обновляем локальные данные при изменении пропсов
    useEffect(() => {
        if (tiers && tiers.length > 0) {
            setLocalTiers(tiers);
        }
        if (userTierData) {
            setLocalUserTierData(userTierData);
        }
    }, [tiers, userTierData]);

    const generateQRCode = async () => {
        if (!userInfo || !selectedGroup) return;
        
        setIsGenerating(true);
        
        const qrDataString = JSON.stringify({
            vkId: userInfo.id,
            userName: `${userInfo.first_name} ${userInfo.last_name}`,
            companyId: selectedGroup.id,
            companyName: selectedGroup.name,
            balance: userBalance,
            timestamp: Date.now(),
            expiresIn: 5 * 60 * 1000,
            version: '1.0'
        });
        
        setQrData(qrDataString);
        
        try {
            const qrDataUrl = await QRCode.toDataURL(qrDataString, {
                width: 250,
                margin: 2,
                color: {
                    dark: selectedGroup.color || '#000000',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'H'
            });
            setQrCodeUrl(qrDataUrl);
            setCountdown(300);
        } catch (err) {
            console.error('Ошибка генерации QR-кода:', err);
        } finally {
            setIsGenerating(false);
        }
    };
    
    useEffect(() => {
        if (countdown <= 0) return;
        
        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
        
        return () => clearInterval(timer);
    }, [countdown]);
    
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
    
    const copyQRCode = async () => {
        if (!qrCodeUrl && !qrData) {
            await generateQRCode();
        }
        
        try {
            await navigator.clipboard.writeText(qrData);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
            
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
        } catch (err) {
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

    const handleRefresh = async () => {
        setRefreshing(true);
        if (onRefresh) {
            await onRefresh();
        }
        setRefreshing(false);
    };

    const getCurrentTier = () => {
        // Если есть данные с сервера, используем их
        if (localUserTierData && localUserTierData.currentTier) {
            return localUserTierData.currentTier;
        }
        
        // Если нет данных, но есть tiers, вычисляем самостоятельно
        if (localTiers && localTiers.length > 0) {
            let current = localTiers[0];
            for (let i = localTiers.length - 1; i >= 0; i--) {
                if (userBalance >= localTiers[i].threshold) {
                    current = localTiers[i];
                    break;
                }
            }
            return current;
        }
        
        // Дефолтный уровень
        return { 
            name: 'Новичок', 
            multiplier: 1, 
            threshold: 0, 
            color: '#95a5a6', 
            icon: '🌱', 
            cashback: 5 
        };
    };

    const getNextTier = () => {
        // Если есть данные с сервера, используем их
        if (localUserTierData && localUserTierData.nextTier) {
            return localUserTierData.nextTier;
        }
        
        // Если нет данных, но есть tiers, вычисляем самостоятельно
        if (localTiers && localTiers.length > 0) {
            for (let i = 0; i < localTiers.length; i++) {
                if (userBalance < localTiers[i].threshold) {
                    return localTiers[i];
                }
            }
        }
        
        return null;
    };

    const getProgressToNext = () => {
        // Если есть данные с сервера, используем их
        if (localUserTierData && localUserTierData.progressToNext !== undefined) {
            return localUserTierData.progressToNext;
        }
        
        // Вычисляем самостоятельно
        const current = getCurrentTier();
        const next = getNextTier();
        if (!next) return 100;
        const progress = ((userBalance - current.threshold) / (next.threshold - current.threshold)) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    const getTotalEarned = () => {
        if (localUserTierData && localUserTierData.totalEarned !== undefined) {
            return localUserTierData.totalEarned;
        }
        return userBalance;
    };

    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    const progressToNext = getProgressToNext();
    const totalEarned = getTotalEarned();
    
    const getProgressGradient = () => {
        if (nextTier) {
            return `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`;
        }
        return `linear-gradient(90deg, ${currentTier.color}, ${currentTier.color})`;
    };

    const displayTiers = localTiers && localTiers.length > 0 ? localTiers : [
        { name: "Новичок", threshold: 0, multiplier: 1, cashback: 5, color: "#95a5a6", icon: "🌱" },
        { name: "Серебро", threshold: 1000, multiplier: 1.2, cashback: 6, color: "#bdc3c7", icon: "🥈" },
        { name: "Золото", threshold: 5000, multiplier: 1.5, cashback: 7.5, color: "#f1c40f", icon: "🥇" },
        { name: "Платина", threshold: 20000, multiplier: 2, cashback: 10, color: "#3498db", icon: "💎" }
    ];

    return (
        <div style={styles.container}>
            {/* Кнопка обновления */}
            <div style={styles.refreshHeader}>
                <button 
                    onClick={handleRefresh} 
                    style={styles.refreshButton}
                    disabled={refreshing}
                >
                    {refreshing ? '🔄 Обновление...' : '🔄 Обновить уровни'}
                </button>
            </div>

            <div style={styles.header}>
                <h3 style={styles.title}>🎫 Моя карта лояльности</h3>
                <button onClick={generateQRCode} style={styles.generateBtn} disabled={isGenerating}>
                    {isGenerating ? '🔄 Генерация...' : '🔄 Обновить QR'}
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
            
            <div style={styles.actionButtons}>
                <button 
                    onClick={copyQRCode} 
                    style={{...styles.actionBtn, ...styles.copyBtn}}
                    disabled={!qrCodeUrl}
                >
                    {copySuccess ? '✅ Скопировано!' : '📋 Скопировать QR'}
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
            
            {/* Карточка с уровнем */}
            <div style={styles.tierCard}>
                <div style={styles.tierHeader}>
                    <span style={styles.tierIcon}>{currentTier.icon}</span>
                    <span style={styles.tierName}>{currentTier.name}</span>
                </div>
                <div style={styles.tierBalance}>
                    {userBalance.toLocaleString()} <span style={styles.tierBalanceSmall}>бонусов</span>
                </div>
                <div style={styles.progressSection}>
                    <div style={styles.progressBarContainer}>
                        <div style={{...styles.progressBarFill, width: `${progressToNext}%`, background: getProgressGradient()}} />
                    </div>
                    {nextTier ? (
                        <div style={styles.progressLabels}>
                            <span>{currentTier.name}</span>
                            <span>до {nextTier.name}</span>
                            <span>{Math.max(0, nextTier.threshold - totalEarned).toLocaleString()} бонусов</span>
                        </div>
                    ) : (
                        <div style={styles.maxLevel}>🏆 Максимальный уровень достигнут!</div>
                    )}
                </div>
            </div>
            
            <div style={styles.cardFooter}>
                <div style={styles.multiplier}>
                    ⚡ Множитель: x{currentTier.multiplier}
                </div>
                <div style={styles.cashback}>
                    💰 Кешбэк: {currentTier.cashback || (currentTier.multiplier * 5)}%
                </div>
            </div>
            
            <div style={styles.infoNote}>
                <div style={styles.infoIcon}>ℹ️</div>
                <div style={styles.infoText}>
                    Чем больше покупок, тем выше уровень и больше бонусов!
                </div>
            </div>

            <button onClick={() => setShowTiersModal(true)} style={styles.viewAllBtn}>
                📊 Посмотреть все уровни
            </button>

            {/* Модальное окно со всеми уровнями */}
            {showTiersModal && (
                <div style={styles.modalOverlay} onClick={() => setShowTiersModal(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Все уровни</h3>
                            <button onClick={handleRefresh} style={styles.modalRefreshBtn} disabled={refreshing}>
                                🔄
                            </button>
                        </div>
                        
                        {displayTiers.map((tier, idx) => {
                            const isCurrent = currentTier && currentTier.name === tier.name;
                            const tierThreshold = tier.threshold || 0;
                            return (
                                <div key={idx} style={{
                                    ...styles.tierListItem, 
                                    borderLeftColor: tier.color, 
                                    background: isCurrent ? `${tier.color}30` : 'rgba(255,255,255,0.05)',
                                    border: isCurrent ? `2px solid ${tier.color}` : 'none'
                                }}>
                                    <span style={styles.tierListIcon}>{tier.icon}</span>
                                    <div style={styles.tierListInfo}>
                                        <div style={styles.tierListName}>
                                            {tier.name}
                                            {isCurrent && <span style={styles.currentBadge}>Текущий</span>}
                                        </div>
                                        <div style={styles.tierListDetails}>
                                            {tierThreshold.toLocaleString()} ₽ • x{tier.multiplier} бонусов • {tier.cashback || (tier.multiplier * 5)}% кешбэк
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        <button onClick={() => setShowTiersModal(false)} style={styles.closeModalBtn}>
                            Закрыть
                        </button>
                    </div>
                </div>
            )}
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
    refreshHeader: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: 10
    },
    refreshButton: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '6px 12px',
        borderRadius: 20,
        color: 'white',
        fontSize: 11,
        cursor: 'pointer'
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
        margin: 0,
        color: 'white'
    },
    generateBtn: {
        background: 'rgba(255, 255, 255, 0.1)',
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
        width: 200,
        height: 200,
        borderRadius: 20,
        backgroundColor: 'white',
        padding: 10,
        cursor: 'pointer'
    },
    qrPlaceholder: {
        width: 200,
        height: 200,
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
        opacity: 0.8,
        color: 'white'
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
        marginBottom: 4,
        color: 'white'
    },
    userId: {
        fontSize: 11,
        opacity: 0.6,
        color: 'white'
    },
    tierCard: {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16
    },
    tierHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12
    },
    tierIcon: {
        fontSize: 28
    },
    tierName: {
        fontSize: 18,
        fontWeight: 700,
        color: '#ffd966'
    },
    tierBalance: {
        textAlign: 'center',
        fontSize: 32,
        fontWeight: 800,
        color: 'white',
        marginBottom: 16
    },
    tierBalanceSmall: {
        fontSize: 14,
        fontWeight: 400
    },
    progressSection: {
        marginTop: 8
    },
    progressBarContainer: {
        background: 'rgba(255,255,255,0.2)',
        height: 8,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 8
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 20,
        transition: 'width 0.3s ease'
    },
    progressLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 10,
        opacity: 0.7,
        color: 'white'
    },
    maxLevel: {
        textAlign: 'center',
        fontSize: 11,
        opacity: 0.7,
        color: '#ffd966'
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8
    },
    multiplier: {
        padding: '6px 12px',
        background: 'rgba(46,204,113,0.15)',
        borderRadius: 20,
        fontSize: 12,
        color: '#2ecc71'
    },
    cashback: {
        padding: '6px 12px',
        background: 'rgba(255,215,0,0.15)',
        borderRadius: 20,
        fontSize: 12,
        color: '#ffd966'
    },
    infoNote: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16
    },
    infoIcon: {
        fontSize: 18
    },
    infoText: {
        fontSize: 11,
        color: '#aaa',
        flex: 1
    },
    viewAllBtn: {
        width: '100%',
        padding: '12px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 40,
        color: 'white',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 20
    },
    modalContent: {
        background: 'linear-gradient(135deg, #1e2538, #131825)',
        borderRadius: 32,
        maxWidth: 400,
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: 24
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 700,
        margin: 0
    },
    modalRefreshBtn: {
        background: 'rgba(255,255,255,0.1)',
        border: 'none',
        padding: '8px 12px',
        borderRadius: 20,
        color: 'white',
        fontSize: 14,
        cursor: 'pointer'
    },
    tierListItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftStyle: 'solid'
    },
    tierListIcon: {
        fontSize: 28
    },
    tierListInfo: {
        flex: 1
    },
    tierListName: {
        fontWeight: 700,
        color: 'white',
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
    },
    tierListDetails: {
        fontSize: 11,
        color: '#aaa'
    },
    currentBadge: {
        fontSize: 10,
        background: '#ffd966',
        color: '#1a1f2e',
        padding: '2px 8px',
        borderRadius: 12
    },
    closeModalBtn: {
        width: '100%',
        padding: 12,
        background: '#ff4d4d',
        border: 'none',
        borderRadius: 12,
        color: 'white',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: 16
    }
};