import json
import random
import ssl
import time
import threading
import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
import vk_api
from vk_api.longpoll import VkLongPoll, VkEventType
from vk_api.exceptions import ApiError
from flask import Flask, request, jsonify

# ========== КОНФИГУРАЦИЯ ==========
#GROUP_ID = 237231570
TOKEN = ''
#CONFIRMATION_CODE = 'd4ea25a4'  # из настроек Callback API
APP_ID = 54517632                       # ID вашего мини-приложения
BACKEND_URL = 'http://localhost:3001'  # URL backend API

# ---------- Фикс SSL (TLS 1.2) ----------
class CustomHTTPAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        kwargs['ssl_version'] = ssl.PROTOCOL_TLSv1_2
        return super().init_poolmanager(*args, **kwargs)

session = requests.Session()
session.mount('https://', CustomHTTPAdapter())
session.timeout = (10, 30)

vk_session = vk_api.VkApi(token=TOKEN, session=session)
vk = vk_session.get_api()
longpoll = VkLongPoll(vk_session)

active_users = set()

# Initialize Flask app for receiving campaign requests
app = Flask(__name__)

# ---------- Функция отправки ----------
def send_message(user_id, text, keyboard=None):
    random_id = random.randint(1, 2**63 - 1)
    params = {
        "peer_id": user_id,
        "message": text,
        "random_id": random_id
    }
    if keyboard:
        params["keyboard"] = json.dumps(keyboard, ensure_ascii=False)

    try:
        vk.messages.send(**params)
        print(f"✅ Отправлено {user_id}: {text[:40]}")
        return True
    except ApiError as e:
        print(f"❌ Ошибка VK API: {e}")
        return False
    except Exception as e:
        print(f"❌ Ошибка соединения: {e}")
        return False

# ---------- Клавиатура (без color у open_app) ----------
def get_main_keyboard():
    return {
        "buttons": [
            [
                {"action": {"type": "text", "label": "📖 Описание"}, "color": "primary"},
                {"action": {"type": "open_app", "label": "🚀 Перейти в приложение", "app_id": APP_ID}}
                # color у open_app не указываем
            ],
            [
                {"action": {"type": "text", "label": "ℹ️ Помощь"}, "color": "secondary"}
            ]
        ],
        "inline": False
    }

# ---------- Фоновые уведомления из backend ----------
def check_and_send_notifications():
    """Проверяет новые уведомления из backend и отправляет их пользователям"""
    try:
        # Получаем все компании (для примера - компания 1)
        company_id = 1
        
        # Получаем активные кампании, которые готовы к отправке
        response = requests.get(f'{BACKEND_URL}/api/companies/{company_id}/campaigns')
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                campaigns = data.get('campaigns', [])
                
                for campaign in campaigns:
                    if campaign.get('is_active'):
                        # Получаем пользователей для этой кампании
                        audience = campaign.get('audience', 'all')
                        users_response = requests.get(
                            f'{BACKEND_URL}/api/companies/{company_id}/users/segment/{audience}'
                        )
                        
                        if users_response.status_code == 200:
                            users_data = users_response.json()
                            if users_data.get('success'):
                                users = users_data.get('users', [])
                                
                                # Отправляем уведомления пользователям, которые активны в боте
                                for user in users:
                                    vk_id = int(user.get('vk_id'))
                                    if vk_id in active_users:
                                        title = campaign.get('title', '')
                                        message = campaign.get('message', '')
                                        image_url = campaign.get('image_url')
                                        
                                        # Формируем сообщение
                                        full_message = f"{title}\n\n{message}"
                                        
                                        # Если есть картинка, отправляем её primero
                                        if image_url:
                                            try:
                                                # Отправляем картинку
                                                vk.messages.send(
                                                    peer_id=vk_id,
                                                    attachment=image_url,
                                                    message=full_message,
                                                    random_id=random.randint(1, 2**63 - 1)
                                                )
                                                print(f"📤 Отправлено уведомление с картинкой {vk_id}: {title}")
                                            except Exception as e:
                                                print(f"❌ Ошибка отправки картинки: {e}")
                                                # Если не удалось отправить картинку, отправляем только текст
                                                send_message(vk_id, full_message)
                                        else:
                                            # Отправляем только текст
                                            send_message(vk_id, full_message)
                                        
                                # Помечаем кампанию как выполненную (обновляет last_sent_at)
                                requests.post(f'{BACKEND_URL}/api/campaigns/{campaign["id"]}/execute')
                                print(f"✅ Кампания {campaign['name']} выполнена")
    except Exception as e:
        print(f"❌ Ошибка проверки уведомлений: {e}")

def send_notifications():
    """Фоновая задача для отправки уведомлений каждые 60 секунд"""
    while True:
        if active_users:
            check_and_send_notifications()
        else:
            print("📭 Нет активных пользователей для уведомлений.")
        time.sleep(60)  # Проверяем каждую минуту

notification_thread = threading.Thread(target=send_notifications, daemon=True)
notification_thread.start()

# ---------- Flask endpoint для мгновенной отправки кампаний ----------
@app.route('/send_campaign_messages', methods=['POST'])
def send_campaign_messages():
    """Получает задачу от backend и немедленно отправляет сообщения пользователям"""
    try:
        data = request.json
        campaign_id = data.get('campaign_id')
        title = data.get('title', '')
        message = data.get('message', '')
        image_url = data.get('image_url')
        users = data.get('users', [])
        
        print(f"📨 Получена задача на отправку кампании {campaign_id} для {len(users)} пользователей")
        
        full_message = f"{title}\n\n{message}"
        sent_count = 0
        
        for user in users:
            vk_id = int(user.get('vk_id'))
            # Отправляем всем пользователям, не только активным (для рассылок)
            try:
                if image_url:
                    # Отправляем с картинкой
                    vk.messages.send(
                        peer_id=vk_id,
                        attachment=image_url,
                        message=full_message,
                        random_id=random.randint(1, 2**63 - 1)
                    )
                    print(f"📤 Отправлено с картинкой {vk_id}: {title}")
                else:
                    # Отправляем только текст
                    send_message(vk_id, full_message)
                
                sent_count += 1
            except Exception as e:
                print(f"❌ Ошибка отправки {vk_id}: {e}")
        
        print(f"✅ Кампания {campaign_id} отправлена {sent_count}/{len(users)} пользователям")
        
        return jsonify({
            'success': True,
            'sent_count': sent_count,
            'total': len(users)
        })
    except Exception as e:
        print(f"❌ Ошибка обработки кампании: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ---------- Основной цикл ----------
print("🚀 Long Poll бот запущен. Ожидание сообщений...")
print(f"📱 ID мини-приложения: {APP_ID}")
print(f"🔗 Backend URL: {BACKEND_URL}")
print(f"🌐 Flask server running on http://localhost:5000")

# Запускаем Flask в отдельном потоке
def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()

while True:
    try:
        for event in longpoll.listen():
            if event.type == VkEventType.MESSAGE_NEW and event.to_me:
                user_id = event.user_id
                text = event.text.lower().strip()
                print(f"💬 Сообщение от {user_id}: '{text}'")

                active_users.add(user_id)

                # Обработка команд (с эмодзи и без)
                if text in ('привет', 'start', 'начать'):
                    send_message(
                        user_id,
                        "👋 Привет! Добро пожаловать!\n\nИспользуй кнопки ниже.",
                        get_main_keyboard()
                    )
                elif text in ('описание', '📖 описание'):
                    send_message(
                        user_id,
                        "📖 **Наше предложение**\n\nБонусы, акции, личный кабинет.\Нажмите «Перейти в приложение»!",
                        get_main_keyboard()
                    )
                elif text in ('помощь', 'ℹ помощь', 'ℹ️ помощь'):
                    send_message(
                        user_id,
                        "ℹ️ **Помощь**\n\n• Описание — подробности.\n• Перейти в приложение — запуск Mini App.\n• Бот присылает уведомления раз в минуту.",
                        get_main_keyboard()
                    )
                else:
                    send_message(
                        user_id,
                        "Пожалуйста, используйте кнопки меню.",
                        get_main_keyboard()
                    )
    except Exception as e:
        print(f"❌ Ошибка Long Poll: {e}, переподключение через 5 секунд...")
        time.sleep(5)