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
TOKEN = ''
APP_ID = 54517632
BACKEND_URL = 'http://localhost:3001'


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

# Initialize Flask app
app = Flask(__name__)


# ---------- Функция отправки ----------
def send_message(user_id, text, keyboard=None):
    random_id = random.randint(1, 2 ** 63 - 1)
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


# ---------- Загрузка изображения на сервера VK ----------
def upload_photo_from_url(image_url):
    """Загружает изображение по ссылке на сервера VK и возвращает attachment строку"""
    try:
        # Скачиваем изображение по ссылке
        response = session.get(image_url, timeout=30)
        if response.status_code != 200:
            print(f"❌ Не удалось скачать изображение: {response.status_code}")
            return None
        
        # Получаем URL для загрузки
        upload_url = vk.photos.getMessagesUploadServer()['upload_url']
        
        # Загружаем изображение на сервер VK
        upload_response = session.post(upload_url, files={'photo': response.content})
        upload_data = upload_response.json()
        
        # Сохраняем изображение
        saved_photo = vk.photos.saveMessagesPhoto(
            server=upload_data['server'],
            photo=upload_data['photo'],
            hash=upload_data['hash']
        )
        
        # Формируем attachment строку
        photo_id = saved_photo[0]['id']
        owner_id = saved_photo[0]['owner_id']
        attachment = f"photo{owner_id}_{photo_id}"
        
        print(f"✅ Изображение загружено: {attachment}")
        return attachment
        
    except Exception as e:
        print(f"❌ Ошибка загрузки изображения: {e}")
        import traceback
        traceback.print_exc()
        return None


# ---------- Клавиатура ----------
def get_main_keyboard():
    return {
        "buttons": [
            [
                {"action": {"type": "open_app", "label": "🚀 Перейти в приложение", "app_id": APP_ID}}
            ]
        ],
        "inline": False
    }


# ---------- Flask endpoint для массовой рассылки ----------
@app.route('/send_messages', methods=['POST'])
def send_messages():
    """Получает задачу от backend и отправляет сообщения пользователям"""
    try:
        data = request.json
        title = data.get('title', '')
        message = data.get('message', '')
        image_url = data.get('image_url')
        button_link = data.get('button_link')
        button_text = data.get('button_text', 'Перейти')
        users = data.get('users', [])

        print(f"📨 Получена задача на отправку для {len(users)} пользователей")

        full_message = f"📢 {title}\n\n{message}"
        sent_count = 0
        failed_count = 0
        
        # Загружаем изображение один раз для всех пользователей
        photo_attachment = None
        if image_url:
            print(f"🖼️ Загрузка изображения: {image_url}")
            photo_attachment = upload_photo_from_url(image_url)
            if photo_attachment:
                print(f"✅ Изображение готово: {photo_attachment}")
            else:
                print(f"⚠️ Не удалось загрузить изображение, будет отправлена ссылка")

        # Создаем клавиатуру с кнопкой если есть ссылка
        keyboard = None
        if button_link:
            keyboard = {
                "buttons": [
                    [
                        {"action": {"type": "open_link", "link": button_link, "label": button_text}}
                    ]
                ],
                "inline": True
            }

        for user in users:
            vk_id = int(user.get('vk_id'))
            try:
                random_id = random.randint(1, 2 ** 63 - 1)

                params = {
                    "peer_id": vk_id,
                    "message": full_message,
                    "random_id": random_id
                }

                # Используем загруженное фото или ссылку как запасной вариант
                if photo_attachment:
                    params["attachment"] = photo_attachment
                elif image_url:
                    # Если не удалось загрузить, отправляем ссылку в тексте
                    params["message"] = full_message + f"\n\n🖼️ Изображение: {image_url}"

                if keyboard:
                    params["keyboard"] = json.dumps(keyboard, ensure_ascii=False)

                vk.messages.send(**params)
                sent_count += 1
                print(f"📤 Отправлено {vk_id}: {title[:30]}...")

                time.sleep(0.05)

            except Exception as e:
                print(f"❌ Ошибка отправки {vk_id}: {e}")
                failed_count += 1

        print(f"✅ Рассылка завершена: отправлено {sent_count}, ошибок {failed_count}")

        return jsonify({
            'success': True,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total': len(users)
        })
    except Exception as e:
        print(f"❌ Ошибка обработки рассылки: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ---------- Flask endpoint для проверки статуса ----------
@app.route('/send_messages_status', methods=['GET'])
def send_messages_status():
    return jsonify({'status': 'ok'})


# ---------- Flask endpoint для кампаний ----------
@app.route('/send_campaign_messages', methods=['POST'])
def send_campaign_messages():
    """Получает задачу от backend и отправляет сообщения кампании пользователям"""
    try:
        data = request.json
        campaign_id = data.get('campaign_id')
        title = data.get('title', '')
        message = data.get('message', '')
        image_url = data.get('image_url')
        button_link = data.get('button_link')
        button_text = data.get('button_text', 'Перейти')
        users = data.get('users', [])

        print(f"📨 Получена задача кампании {campaign_id} для {len(users)} пользователей")

        full_message = f"{title}\n\n{message}"
        sent_count = 0
        failed_count = 0
        
        # Загружаем изображение один раз для всех пользователей
        photo_attachment = None
        if image_url:
            print(f"🖼️ Загрузка изображения: {image_url}")
            photo_attachment = upload_photo_from_url(image_url)
            if photo_attachment:
                print(f"✅ Изображение готово: {photo_attachment}")
            else:
                print(f"⚠️ Не удалось загрузить изображение, будет отправлена ссылка")

        # Создаем клавиатуру с кнопкой если есть ссылка
        keyboard = None
        if button_link:
            keyboard = {
                "buttons": [
                    [
                        {"action": {"type": "open_link", "link": button_link, "label": button_text}}
                    ]
                ],
                "inline": True
            }

        for user in users:
            vk_id = int(user.get('vk_id'))
            try:
                random_id = random.randint(1, 2 ** 63 - 1)

                params = {
                    "peer_id": vk_id,
                    "message": full_message,
                    "random_id": random_id
                }

                # Используем загруженное фото или ссылку как запасной вариант
                if photo_attachment:
                    params["attachment"] = photo_attachment
                elif image_url:
                    # Если не удалось загрузить, отправляем ссылку в тексте
                    params["message"] = full_message + f"\n\n🖼️ Изображение: {image_url}"

                if keyboard:
                    params["keyboard"] = json.dumps(keyboard, ensure_ascii=False)

                vk.messages.send(**params)
                sent_count += 1
                print(f"📤 Кампания {campaign_id}: отправлено {vk_id}")

                time.sleep(0.05)

            except Exception as e:
                print(f"❌ Ошибка отправки кампании {vk_id}: {e}")
                failed_count += 1

        print(f"✅ Кампания {campaign_id} завершена: отправлено {sent_count}, ошибок {failed_count}")

        return jsonify({
            'success': True,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total': len(users)
        })
    except Exception as e:
        print(f"❌ Ошибка обработки кампании: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ---------- Основной цикл ----------
print("🚀 Long Poll бот запущен. Ожидание сообщений...")
print(f"📱 ID мини-приложения: {APP_ID}")
print(f"🔗 Backend URL: {BACKEND_URL}")


# Запускаем Flask в отдельном потоке
def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)


flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()

# Основной цикл обработки сообщений
while True:
    try:
        for event in longpoll.listen():
            if event.type == VkEventType.MESSAGE_NEW and event.to_me:
                user_id = event.user_id
                text = event.text.lower().strip()
                print(f"💬 Сообщение от {user_id}: '{text}'")

                active_users.add(user_id)

                if text in ('привет', 'start', 'начать'):
                    send_message(
                        user_id,
                        "👋 Привет! Добро пожаловать!\nНажми кнопку ниже, чтобы открыть приложение.",
                        get_main_keyboard()
                    )
                else:
                    send_message(
                        user_id,
                        "Нажми кнопку «Перейти в приложение» для продолжения.",
                        get_main_keyboard()
                    )
    except Exception as e:
        print(f"❌ Ошибка Long Poll: {e}, переподключение через 5 секунд...")
        time.sleep(5)