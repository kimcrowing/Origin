from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import time
import uuid

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 用户数据文件
USERS_FILE = 'users.json'

# 如果用户文件不存在，创建初始文件
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            "users": [
                {
                    "id": "user_1",
                    "email": "admin@example.com",
                    "password": "password123",  # 实际应用中应使用加密密码
                    "name": "管理员",
                    "initials": "GL",
                    "avatar": None,
                    "created_at": time.time()
                }
            ]
        }, f, ensure_ascii=False, indent=2)

# 加载用户数据
def load_users():
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载用户数据出错: {e}")
        return {"users": []}

# 保存用户数据
def save_users(data):
    try:
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存用户数据出错: {e}")
        return False

# 登录接口
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"success": False, "message": "请提供邮箱和密码"}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # 加载用户数据
    users_data = load_users()
    
    # 查找匹配的用户
    user = None
    for u in users_data['users']:
        if u['email'] == email and u['password'] == password:
            user = u
            break
    
    if user:
        # 清除密码信息，避免返回给前端
        user_info = {k: v for k, v in user.items() if k != 'password'}
        return jsonify({
            "success": True,
            "message": "登录成功",
            "user": user_info
        })
    else:
        return jsonify({
            "success": False,
            "message": "邮箱或密码不正确"
        }), 401

# 注册接口
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({"success": False, "message": "请提供完整的注册信息"}), 400
    
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    # 加载用户数据
    users_data = load_users()
    
    # 检查邮箱是否已存在
    for user in users_data['users']:
        if user['email'] == email:
            return jsonify({
                "success": False,
                "message": "该邮箱已被注册"
            }), 400
    
    # 创建新用户
    new_user = {
        "id": f"user_{uuid.uuid4().hex[:8]}",
        "email": email,
        "password": password,  # 实际应用中应使用加密密码
        "name": name,
        "initials": ''.join([n[0].upper() for n in name.split()[:2]]) if ' ' in name else name[:2].upper(),
        "avatar": None,
        "created_at": time.time()
    }
    
    # 添加新用户
    users_data['users'].append(new_user)
    
    # 保存用户数据
    if save_users(users_data):
        # 清除密码信息，避免返回给前端
        user_info = {k: v for k, v in new_user.items() if k != 'password'}
        return jsonify({
            "success": True,
            "message": "注册成功",
            "user": user_info
        })
    else:
        return jsonify({
            "success": False,
            "message": "服务器错误，请稍后再试"
        }), 500

# 获取用户信息接口
@app.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    # 加载用户数据
    users_data = load_users()
    
    # 查找匹配的用户
    user = None
    for u in users_data['users']:
        if u['id'] == user_id:
            user = u
            break
    
    if user:
        # 清除密码信息，避免返回给前端
        user_info = {k: v for k, v in user.items() if k != 'password'}
        return jsonify({
            "success": True,
            "user": user_info
        })
    else:
        return jsonify({
            "success": False,
            "message": "用户不存在"
        }), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000) 