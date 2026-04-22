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

# ========== КОНФИГУРАЦИЯ ==========
#GROUP_ID = 237231570
TOKEN = ''
#CONFIRMATION_CODE = 'd4ea25a4'  # из настроек Callback API
APP_ID = 54517632                       # ID вашего мини-приложения

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

# ---------- Фоновые уведомления ----------
def send_notifications():
    while True:
        if active_users:
            message = "🔔 Тестовое уведомление! Ваше мини-приложение готово."
            for user_id in list(active_users):
                send_message(user_id, message)
        else:
            print("📭 Нет активных пользователей для уведомлений.")
        time.sleep(15)

notification_thread = threading.Thread(target=send_notifications, daemon=True)
notification_thread.start()

# ---------- Основной цикл ----------
print("🚀 Long Poll бот запущен. Ожидание сообщений...")
print(f"📱 ID мини-приложения: {APP_ID}")

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
                        "📖 **Наше предложение**\n\nБонусы, акции, личный кабинет.\nНажмите «Перейти в приложение»!",
                        get_main_keyboard()
                    )
                elif text in ('помощь', 'ℹ помощь', 'ℹ️ помощь'):
                    send_message(
                        user_id,
                        "ℹ️ **Помощь**\n\n• Описание — подробности.\n• Перейти в приложение — запуск Mini App.\n• Бот присылает уведомления раз в 15 секунд.",
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