# 🎓 校园交易平台 (Campus Trade Platform)

<div align="center">

### 一个现代化的校园二手交易平台

基于 Vue.js 3 + Node.js + MySQL 构建，支持实时聊天、商品交易等完整功能

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-blue.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

[功能特性](#-核心特性) •
[在线演示](#-在线演示) •
[快速开始](#-快速开始) •
[部署指南](#-部署方式) •
[开发文档](#-开发指南)

</div>

---

## 📖 项目简介

校园交易平台是一个专为高校学生设计的二手物品交易系统，提供了便捷的商品发布、浏览、交易和沟通功能。平台采用前后端分离架构，支持Docker一键部署，具有良好的可扩展性和维护性。

## 🎬 在线演示

> **测试账号：** `testuser` / `123456`

<!-- 如果有在线演示地址，请在这里添加 -->

## 📸 功能预览

> 主要功能界面展示

- 🏠 **首页** - 瀑布流商品展示，智能分类筛选
- 📝 **发布商品** - 简洁的发布流程，支持多图上传
- 💬 **实时聊天** - 基于 Socket.IO 的即时通讯
- 👤 **个人中心** - 我的商品、收藏、浏览历史管理

<!-- 可以在这里添加截图 -->

## ✨ 核心特性

- 🔐 **完善的用户系统** - 注册/登录、个人信息管理、头像上传
- 📦 **商品管理** - 发布、编辑、删除商品，支持多图上传
- 🔍 **智能搜索** - 分类筛选、关键词搜索、价格排序
- 💬 **实时聊天** - 基于Socket.IO的即时通讯，买卖双方实时沟通
- ⭐ **收藏功能** - 收藏感兴趣的商品，方便后续查看
- 📊 **浏览历史** - 自动记录浏览记录，智能去重
- 📧 **邮箱验证** - 邮箱验证码注册，保障账号安全
- 🤖 **AI 交易助手「小易」** - 悬浮聊天助手，基于大模型 Function Calling 搜索真实在售商品、查订单、解答交易规则；发布页支持「AI 写文案」，一键生成商品描述（可选，不配置则自动关闭）
- 🎨 **美观UI** - 小红书风格界面，瀑布流布局，响应式设计
- 🐳 **Docker支持** - 一键部署，开箱即用
- 🌐 **域名访问** - 支持任意域名和IP地址访问，无需配置

## 🛠️ 技术栈

### 前端技术
| 技术 | 版本 | 说明 |
|------|------|------|
| Vue.js | 3.x | 渐进式JavaScript框架（Composition API） |
| Vue Router | 4.x | 官方路由管理器 |
| Pinia | 2.x | 轻量级状态管理 |
| Vite | 5.x | 下一代前端构建工具 |
| Axios | 1.x | HTTP 客户端 |
| Socket.IO Client | 4.x | 实时双向通信 |

### 后端技术
| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 20+ | JavaScript 运行环境 |
| Express.js | 4.x | Web 应用框架 |
| TypeScript | 5.x | JavaScript 的超集 |
| MySQL | 8.0+ | 关系型数据库 |
| JWT | 9.x | JSON Web Token 身份认证 |
| bcrypt | 5.x | 密码加密 |
| Multer | 1.x | 文件上传中间件 |
| Socket.IO | 4.x | 实时通信引擎 |
| Nodemailer | 6.x | 邮件发送 |

### 开发工具
- Docker & Docker Compose - 容器化部署
- Git - 版本控制
- ESLint - 代码检查
- Prettier - 代码格式化

## 📁 项目结构

```
campus-trade/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                # API 接口封装
│   │   ├── assets/             # 静态资源
│   │   ├── components/         # Vue 组件
│   │   │   ├── Icon.vue       # 图标组件
│   │   │   ├── ImageUploader.vue  # 图片上传组件
│   │   │   ├── ProductCard.vue    # 商品卡片
│   │   │   └── ...
│   │   ├── composables/        # 组合式函数
│   │   ├── config/             # 配置文件
│   │   ├── router/             # 路由配置
│   │   ├── stores/             # Pinia 状态管理
│   │   ├── utils/              # 工具函数
│   │   ├── views/              # 页面视图
│   │   │   ├── Home.vue       # 首页
│   │   │   ├── Auth.vue       # 登录/注册
│   │   │   ├── Publish.vue    # 发布商品
│   │   │   ├── ProductDetail.vue  # 商品详情
│   │   │   ├── Messages.vue   # 消息列表
│   │   │   ├── Chat.vue       # 聊天页面
│   │   │   └── ...
│   │   ├── App.vue             # 根组件
│   │   └── main.js             # 入口文件
│   ├── public/                 # 公共资源
│   ├── Dockerfile              # Docker 构建文件
│   ├── nginx.conf              # Nginx 配置
│   └── package.json
│
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── config/             # 配置文件
│   │   │   ├── database.ts    # 数据库配置
│   │   │   └── socket.ts      # Socket.IO 配置
│   │   ├── controllers/        # 控制器
│   │   │   ├── userController.ts
│   │   │   ├── productController.ts
│   │   │   ├── messageController.ts
│   │   │   └── ...
│   │   ├── models/             # 数据模型
│   │   │   ├── userModel.ts
│   │   │   ├── productModel.ts
│   │   │   └── ...
│   │   ├── routes/             # 路由
│   │   ├── middleware/         # 中间件
│   │   │   ├── auth.ts        # JWT 认证
│   │   │   └── upload.ts      # 文件上传
│   │   ├── utils/              # 工具函数
│   │   ├── app.ts              # Express 应用
│   │   └── server.ts           # 服务器入口
│   ├── database/               # 数据库脚本
│   │   └── 00-campus-trade.sql # 初始化脚本
│   ├── uploads/                # 文件上传目录
│   │   ├── avatars/           # 用户头像
│   │   └── products/          # 商品图片
│   ├── Dockerfile              # Docker 构建文件
│   └── package.json
│
├── docker-compose.yml           # Docker Compose 配置
├── docker.env.example           # Docker 环境变量示例
├── docker-restart.sh            # Docker 管理脚本
├── deploy.sh                    # 一键部署脚本 (Linux/Mac) ⭐ 新增
├── deploy.ps1                   # 一键部署脚本 (Windows PowerShell) ⭐ 新增
├── deploy.bat                   # 一键部署脚本 (Windows 批处理) ⭐ 新增
├── .gitignore                   # Git 忽略文件
└── README.md                    # 项目文档
```

## 🎯 功能模块

### 1. 用户模块
- ✅ 用户注册（邮箱验证码）
- ✅ 用户登录（支持用户名/邮箱）
- ✅ 个人信息管理
- ✅ 头像上传
- ✅ 密码修改
- ✅ JWT Token 认证

### 2. 商品模块
- ✅ 商品发布（支持多图上传，最多10张）
- ✅ 商品编辑/删除
- ✅ 商品分类（10个分类）
  - 📱 电子产品
  - 📚 图书教材
  - 🏠 生活用品
  - 👔 服装鞋帽
  - ⚽ 运动器材
  - 💄 美妆护肤
  - 🔌 数码配件
  - ✏️ 文具用品
  - 🍔 食品饮料
  - 📦 其他
- ✅ 商品搜索（标题、描述）
- ✅ 商品筛选（分类、价格）
- ✅ 商品排序（最新、价格）
- ✅ 商品状态管理（在售/已售/预定）
- ✅ 商品浏览历史

### 3. 交易模块
- ✅ 收藏商品
- ✅ 浏览历史
- ✅ 实时聊天（买卖双方沟通）
- ✅ 消息未读提醒
- ✅ 订单管理（开发中）

### 4. 消息模块
- ✅ 实时聊天（Socket.IO）
- ✅ 消息列表
- ✅ 未读消息提醒
- ✅ 历史消息加载
- ✅ 消息已读状态

## 🚀 快速开始

### 📋 环境要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 20.0.0 | 推荐使用 20 LTS |
| MySQL | >= 8.0 | 数据库服务器 |
| npm | >= 9.0 | 包管理器 |
| Docker | >= 20.0 (可选) | 容器化部署 |
| Docker Compose | >= 2.0 (可选) | 容器编排 |

### 🎯 一键部署（推荐）⭐⭐⭐⭐⭐

我们提供了一键部署脚本，自动完成环境配置和项目启动：

#### Windows 用户

```powershell
# 方式1：使用批处理文件（推荐，自动处理权限）
.\deploy.bat

# 方式2：直接运行 PowerShell 脚本
.\deploy.ps1

# 命令行指定部署方式
.\deploy.ps1 docker    # Docker 部署
.\deploy.ps1 local     # 本地部署
```

#### Linux/Mac 用户

```bash
# 添加执行权限
chmod +x deploy.sh

# 交互式菜单
./deploy.sh

# 命令行指定部署方式
./deploy.sh docker     # Docker 部署
./deploy.sh local      # 本地部署
```

#### 一键部署脚本功能

**Docker 部署模式：**
- ✅ 自动检查 Docker 环境
- ✅ 自动创建并引导配置 `.env` 文件
- ✅ 一键构建并启动所有服务（前端、后端、MySQL）
- ✅ 显示服务状态和访问地址
- ✅ 提供常用管理命令

**本地部署模式：**
- ✅ 自动检查 Node.js 和 MySQL 环境
- ✅ 自动安装所有依赖（根目录、前端、后端）
- ✅ 自动创建环境配置文件
- ✅ 自动编译后端代码
- ✅ 可选的数据库自动导入
- ✅ 一键启动开发服务器
- ✅ 支持域名和IP地址访问
- ✅ 自动禁用Host检查，无需配置域名

### 🎯 手动部署方式

如果你希望手动控制部署过程，可以选择以下方式：

| 部署方式 | 适用场景 | 难度 | 推荐指数 |
|---------|---------|------|---------|
| [Docker 部署](#方式一docker-部署推荐) | 快速体验、生产部署 | ⭐ | ⭐⭐⭐⭐⭐ |
| [本地开发部署](#方式二本地开发部署) | 开发调试 | ⭐⭐ | ⭐⭐⭐⭐ |

---

### 方式一：Docker 部署（推荐）⭐

Docker部署是**最简单**的方式，一键启动前后端和数据库。

#### 1. 克隆项目

```bash
git clone https://github.com/yourusername/campus-trade.git
cd campus-trade
```

#### 2. 配置环境变量

**Windows 用户：**
```powershell
# 复制环境变量模板
copy docker.env.example .env

# 编辑配置文件
notepad .env
```

**Linux/Mac 用户：**
```bash
# 复制环境变量模板
cp docker.env.example .env

# 编辑配置文件
nano .env
```

**必须修改的配置项：**
```env
# 数据库密码（强密码，至少16位）
MYSQL_ROOT_PASSWORD=your_strong_root_password_here
DB_PASSWORD=your_strong_db_password_here

# JWT密钥（至少32个字符的随机字符串）
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_change_in_production

# 邮箱配置（用于发送验证码）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your_email@qq.com
SMTP_PASS=your_qq_smtp_authorization_code  # 注意：这是授权码，不是邮箱密码
```

> 💡 **获取QQ邮箱授权码**：
> 1. 登录QQ邮箱 → 设置 → 账户
> 2. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
> 3. 开启"POP3/SMTP服务"
> 4. 点击"生成授权码"，按提示操作

#### 3. 一键启动

**Windows 用户：**
```powershell
.\docker-start.ps1
```

**Linux/Mac 用户：**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

#### 4. 访问应用

启动成功后（约2-3分钟），访问：
- 🌐 **前端页面**: http://localhost
- 🔌 **后端API**: http://localhost/api
- ❤️ **健康检查**: http://localhost/health

#### 5. 测试账号

系统已内置测试账号，可直接登录：
- **用户名**: `testuser`
- **密码**: `123456`

### 方式二：本地开发部署

适合开发和调试。

#### 1. 克隆项目

```bash
git clone https://github.com/yourusername/campus-trade.git
cd campus-trade
```

#### 2. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

#### 3. 数据库初始化

**创建数据库：**
```bash
mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE campus_trade DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'campus_user'@'localhost' IDENTIFIED BY 'your_password';

-- 授权
GRANT ALL PRIVILEGES ON campus_trade.* TO 'campus_user'@'localhost';
FLUSH PRIVILEGES;

-- 导入数据
USE campus_trade;
SOURCE backend/database/00-campus-trade.sql;
```

或使用命令行：
```bash
mysql -u root -p campus_trade < backend/database/00-campus-trade.sql
```

#### 4. 配置环境变量

**后端环境变量：**

创建 `backend/.env` 文件：
```env
# 数据库配置（本地开发 - 重要：DB_HOST 必须是 localhost）
DB_HOST=localhost
DB_PORT=3306
DB_USER=campus_user
DB_PASSWORD=your_password
DB_NAME=campus_trade

# JWT配置（至少32字符）
JWT_SECRET=your_jwt_secret_key_min_32_characters_for_development

# 邮件服务配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your_email@qq.com
SMTP_PASS=your_qq_smtp_authorization_code

# 应用配置
PORT=3000
NODE_ENV=development
```

**前端环境变量：**

创建 `frontend/.env` 文件：
```env
VITE_API_URL=http://localhost:3000/api
VITE_BASE_URL=http://localhost:3000
```

#### 5. 启动服务

**开发模式（热重载）：**

```bash
# 终端 1 - 启动后端
cd backend
npm run dev

# 终端 2 - 启动前端
cd frontend
npm run dev
```

**生产模式：**

```bash
# 构建后端
cd backend
npm run build
npm start

# 构建前端
cd frontend
npm run build
npm run preview
```

#### 6. 访问应用

- **前端**: http://localhost:5173（开发模式，Vite dev server）
- **后端**: http://localhost:3000
- **API健康检查**: http://localhost:3000/health

## 🐳 Docker 详细说明

### 服务架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器                            │
│                http://localhost                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Frontend Container (Nginx)                 │
│  - 端口: 80                                             │
│  - 静态文件服务                                         │
│  - 反向代理                                             │
│    ├── /api → Backend Container                        │
│    ├── /socket.io → Backend Container (WebSocket)     │
│    └── /uploads → Backend Container (文件)            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Container (Node.js)                │
│  - 端口: 3000 (内部)                                    │
│  - Express.js 应用                                      │
│  - Socket.IO 服务                                       │
│  - JWT 认证                                             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              MySQL Container                            │
│  - 端口: 3306 (内部)                                    │
│  - 数据持久化 (Volume)                                  │
│  - 自动初始化                                           │
└─────────────────────────────────────────────────────────┘
```

### Docker 常用命令

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 重新构建并启动
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# 重启服务
docker-compose restart

# 停止服务（不删除容器）
docker-compose stop

# 停止并删除容器（保留数据）
docker-compose down

# 停止并删除所有内容（包括数据！）
docker-compose down -v

# 健康检查
./docker-healthcheck.sh    # Linux/Mac
.\docker-healthcheck.ps1   # Windows

# 进入容器内部
docker exec -it campus-trade-backend sh
docker exec -it campus-trade-frontend sh
docker exec -it campus-trade-mysql bash

# 查看数据库
docker exec -it campus-trade-mysql mysql -u campus_user -p campus_trade
```

### 数据备份与恢复

**备份数据库：**
```bash
# 方法1：导出到本地文件
docker-compose exec -T mysql mysqldump -u root -p'your_password' campus_trade > backup_$(date +%Y%m%d_%H%M%S).sql

# 方法2：使用脚本
docker exec campus-trade-mysql mysqldump -u root -p'your_password' campus_trade > backup.sql
```

**恢复数据库：**
```bash
# 从备份文件恢复
docker-compose exec -T mysql mysql -u root -p'your_password' campus_trade < backup.sql
```

**备份上传文件：**
```bash
# 备份上传文件目录
docker cp campus-trade-backend:/app/uploads ./uploads_backup

# 恢复上传文件
docker cp ./uploads_backup/. campus-trade-backend:/app/uploads
```

## 🔧 配置说明

### 环境变量详解

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `APP_PORT` | 前端访问端口 | 80 | 否 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | - | ✅ |
| `DB_HOST` | 数据库主机 | mysql (Docker) / localhost (本地) | ✅ |
| `DB_PORT` | 数据库端口 | 3306 | 否 |
| `DB_USER` | 数据库用户 | campus_user | ✅ |
| `DB_PASSWORD` | 数据库密码 | - | ✅ |
| `DB_NAME` | 数据库名称 | campus_trade | ✅ |
| `JWT_SECRET` | JWT 密钥 | - | ✅ |
| `SMTP_HOST` | SMTP 服务器 | smtp.qq.com | ✅ |
| `SMTP_PORT` | SMTP 端口 | 465 | ✅ |
| `SMTP_USER` | SMTP 用户名 | - | ✅ |
| `SMTP_PASS` | SMTP 授权码 | - | ✅ |
| `NODE_ENV` | 运行环境 | production (Docker) / development (本地) | 否 |
| `PORT` | 后端端口 | 3000 | 否 |
| `AI_API_KEY` | AI 助手 API 密钥（不配则 AI 功能自动关闭） | - | 否 |
| `AI_BASE_URL` | OpenAI 兼容接口地址 | https://api.deepseek.com/v1 | 否 |
| `AI_MODEL` | 模型名 | deepseek-chat | 否 |

### 安全建议

1. **密码强度**
   - 数据库密码：至少16位，包含大小写字母、数字、特殊字符
   - JWT密钥：至少32位随机字符串
   - 建议使用密码生成器：https://passwordsgenerator.net/

2. **环境变量管理**
   - ❌ 永远不要提交 `.env` 文件到Git
   - ✅ 使用 `.env.example` 作为模板
   - ✅ 生产环境使用环境变量或密钥管理服务

3. **定期维护**
   - 每3-6个月更换一次密码
   - 定期备份数据库和上传文件
   - 及时更新依赖包

4. **HTTPS部署**
   - 生产环境必须使用HTTPS
   - 可使用 Let's Encrypt 免费证书
   - 配置Nginx SSL

## 🖥️ Linux 服务器部署

### 方式三：Linux 一键部署脚本

适合在 Linux 服务器上直接部署（无需 Docker）。

#### 支持的系统
- Ubuntu 18.04+ / Debian 10+
- CentOS 7+ / RHEL 7+ / Rocky Linux 8+

#### 快速部署

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/campus-trade.git
cd campus-trade

# 2. 运行部署脚本（需要 root 权限）
chmod +x deploy.sh
sudo bash deploy.sh
```

部署脚本会自动完成：
- ✅ 安装 Node.js 20 LTS
- ✅ 安装 MySQL 数据库
- ✅ 安装 Nginx Web 服务器
- ✅ 安装 PM2 进程管理器
- ✅ 配置数据库和环境变量
- ✅ 构建并启动项目
- ✅ 配置 Nginx 反向代理

#### 邮件服务配置注意事项

**国外服务器：**
- ❌ QQ、163 等国内邮箱可能无法访问
- ✅ 推荐使用 Gmail、Outlook 或 SendGrid

**国内服务器：**
- ✅ QQ、163 邮箱正常使用
- ✅ 需要配置 SMTP 授权码

**如果无法配置邮件服务：**
- 使用测试账号直接登录：`testuser` / `123456`
- 注册功能仍然可用，只是跳过邮箱验证

#### 服务管理

部署完成后，使用以下命令管理服务：

```bash
# 查看服务状态
./status.sh

# 启动服务
./start.sh

# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 查看日志
./logs.sh

# PM2 命令
pm2 list                    # 查看进程列表
pm2 logs campus-trade-backend  # 查看日志
pm2 restart campus-trade-backend  # 重启服务
pm2 monit                   # 实时监控
```

#### 访问应用

部署成功后访问：
- 🌐 前端：`http://你的服务器IP`（80 端口，Nginx 托管）
- 🔌 后端 API：通过 Nginx 反向代理，`http://你的服务器IP/api`
- ❤️ 健康检查：`http://你的服务器IP/health`

#### 🌐 域名访问配置

**无需额外配置** —— Nginx 配置默认 `server_name _`，接受任意域名和 IP。

绑定正式域名：编辑 `/etc/nginx/sites-available/campus-trade`，把 `server_name _;` 改成你的域名，
然后 `sudo nginx -t && sudo systemctl reload nginx`。

**端口说明：**

| 服务 | 端口 | 是否对外 |
|------|------|----------|
| Nginx（前端 + 反代） | 80 / 443 | ✅ 对外 |
| 后端 Express | 3000 | ❌ 仅本机，供 Nginx 反代 |
| MySQL | 3306 | ❌ 仅本机 |

> ⚠️ 后端 3000 端口**不要**在防火墙对外开放，所有请求都应经由 Nginx。
> 这样能保证 `X-Forwarded-For` 正确传递、限流拿到真实 IP，也避免绕过 HTTPS。

## 🚀 生产部署（VPS 前后端同域）⭐ 推荐

这是**最推荐**的生产部署方式：前端静态文件和后端 API 都在同一台服务器、同一个域名下，
没有跨域问题，Socket.IO 实时聊天和图片上传都能正常工作。

### 为什么不用 Vercel / 纯静态托管

本项目后端依赖以下能力，Serverless 平台**无法支持**：

| 依赖 | 静态托管平台 |
|------|-------------|
| Socket.IO 长连接（实时聊天） | ❌ 不支持长连接 |
| Express 常驻进程 | ⚠️ 需改造成函数 |
| MySQL 连接池 | ⚠️ 需外接云数据库 |
| 本地文件上传 `backend/uploads/` | ❌ 文件系统只读/临时 |

如果前端部署到 Vercel 而后端在别处，还会多出跨域、Cookie、WebSocket 代理等一堆问题。
**同域部署可以完全避开这些麻烦。**

### 一键部署

```bash
# 1. 上传代码到服务器
git clone https://github.com/laidaidai/campus-trade.git /opt/campus-trade
cd /opt/campus-trade

# 2. 初始化数据库（仅首次）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS campus_trade DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p campus_trade < backend/database/campus_trade_2025-10-18_143811.sql

# 3. 执行部署脚本
sudo bash deploy/deploy-vps.sh install
```

脚本会自动完成：

- ✅ 检查 Node.js 20+ / PM2 / Nginx 环境（缺失则自动安装）
- ✅ 交互式生成 `.env`（JWT 密钥自动随机生成，权限 600）
- ✅ 构建后端（TypeScript 编译）与前端（`VITE_API_URL=/api`）
- ✅ 用 PM2 启动后端并做健康检查
- ✅ 生成并启用 Nginx 站点配置，禁用默认站点
- ✅ 输出访问地址与常用运维命令

### 日常运维

```bash
sudo bash deploy/deploy-vps.sh update    # 拉代码 + 重建 + 重启
sudo bash deploy/deploy-vps.sh status    # 查看状态
sudo bash deploy/deploy-vps.sh logs      # 查看后端日志
sudo bash deploy/deploy-vps.sh restart   # 仅重启后端

pm2 status                               # 进程状态
pm2 logs campus-trade-backend            # 后端日志
sudo nginx -t && sudo systemctl reload nginx
```

### 目录结构

```
/opt/campus-trade/
├── .env                      # 环境变量（600 权限，勿提交）
├── frontend/dist/            # 前端构建产物 ← Nginx root
├── backend/dist/             # 后端编译产物 ← PM2 运行
├── backend/uploads/          # 用户上传图片（务必纳入备份）
├── logs/                     # PM2 日志
└── deploy/
    ├── deploy-vps.sh         # 生产部署脚本
    ├── nginx.conf.template   # Nginx 站点配置模板
    └── ecosystem.config.js   # PM2 配置
```

### 上线 HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot 会自动改写 Nginx 配置并配置证书自动续期。

### 关于 PM2 多实例（重要）

`deploy/ecosystem.config.js` 中固定 `instances: 1`。原因是 Socket.IO 当前使用**内存适配器**，
多实例会导致同一用户连接落到不同进程、消息推送丢失。

如需横向扩容，按顺序操作：

1. 接入 Redis：`@socket.io/redis-adapter`
2. Nginx `upstream` 改为 `ip_hash`（或配置 sticky cookie）
3. 再把 `instances` 改为 `'max'`

（验证码存储已迁移到 MySQL，本身不阻碍多实例。）

## 🤖 AI 交易助手「小易」

平台内置一个 AI 助手，提供两个能力：

1. **悬浮聊天助手**：全局右下角悬浮球，点击展开对话面板。基于大模型 Function Calling，可以：
   - 搜索真实在售商品（自动返回可点击的商品卡片）
   - 查看商品详情
   - 查询当前用户的订单（我的购买 / 我的卖出）
   - 解答平台交易规则、发布流程、交易建议
2. **AI 写文案**：发布商品页的「商品描述」旁有 `✨ AI 写文案` 按钮，根据已填的标题 / 分类 / 成色一键生成商品描述。

### 工作原理

- 后端**手写 tool-calling 循环**（不依赖 LangChain），对接任意 **OpenAI 兼容**接口。
- AI 只能调用**只读**工具（搜索/查详情/查订单/查分类），**无法写库**——下单、发布等写操作必须由用户在前端确认后走原接口，避免 AI 误操作。
- 对话走 **SSE 流式**输出，前端打字机效果；工具调用最多 4 轮，防止死循环烧钱。
- 按用户限流：10 次/分钟、300 次/天，防止刷 token 账单。

### 启用方式

在 `.env` 中配置（不配置则整个 AI 模块自动静默关闭，不影响其他功能）：

```env
# 以 DeepSeek 为例（便宜、中文效果好，推荐）
AI_API_KEY=sk-xxxx
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

其他 OpenAI 兼容服务商：

| 服务商 | AI_BASE_URL | AI_MODEL |
|--------|-------------|----------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |

配置后重启后端即可。前端会通过 `GET /api/ai/status` 自动探测是否启用：未启用时悬浮球显示未启用态、发布页不显示 AI 按钮。

## 📝 开发指南

### 项目脚本

**根目录：**
```bash
npm run dev        # 同时启动前后端（开发模式）
```

**后端（backend/）：**
```bash
npm run dev        # 开发模式（热重载）
npm run build      # 编译TypeScript
npm start          # 生产模式运行
npm run lint       # 代码检查
```

**前端（frontend/）：**
```bash
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run preview    # 预览生产构建
npm run lint       # 代码检查
```

### 添加新功能

1. **后端API开发**
   ```typescript
   // backend/src/routes/exampleRoutes.ts
   import { Router } from 'express';
   import { ExampleController } from '../controllers/exampleController';
   
   const router = Router();
   router.get('/example', ExampleController.getExample);
   export default router;
   ```

2. **前端API调用**
   ```javascript
   // frontend/src/api/example.js
   import request from './request';
   
   export const getExample = () => {
     return request.get('/example');
   };
   ```

3. **添加新页面**
   ```javascript
   // frontend/src/router/index.js
   {
     path: '/example',
     name: 'Example',
     component: () => import('@/views/Example.vue')
   }
   ```

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 Vue 3 风格指南
- 使用 TypeScript 类型注解
- 提交前运行 `npm run lint`

## 🐛 故障排除

### 常见问题

#### 1. Docker 容器无法启动

**问题：** 容器启动失败或健康检查失败

**解决方案：**
```bash
# 查看容器日志
docker-compose logs backend
docker-compose logs mysql
docker-compose logs frontend

# 检查端口占用
# Windows
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :80
lsof -i :3000

# 清理并重新启动
docker-compose down
docker-compose up -d --build
```

#### 2. 数据库连接失败

**问题：** `ECONNREFUSED` 或 `ER_ACCESS_DENIED_ERROR`

**Docker 环境：**
```bash
# 检查 MySQL 容器状态
docker-compose ps mysql

# 等待 MySQL 完全启动（约10-15秒）
docker-compose logs mysql | grep "ready for connections"

# 检查环境变量
docker-compose exec backend printenv | grep DB_

# 确认配置
# ✅ DB_HOST=mysql (Docker 中必须是 mysql)
# ✅ DB_USER=campus_user (不要使用 root)
```

**本地环境：**
```bash
# 检查 MySQL 服务
# Windows
net start | findstr MySQL

# Linux/Mac
systemctl status mysql

# 确认配置
# ✅ DB_HOST=localhost (本地必须是 localhost)
# ✅ 用户已创建并授权
```

#### 3. 图片上传后无法显示

**问题：** 上传成功但返回404

**解决方案：**
```bash
# 检查 Nginx 配置
docker exec campus-trade-frontend cat /etc/nginx/conf.d/default.conf | grep uploads

# 应该看到：location ^~ /uploads/ {

# 如果没有 ^~，重新构建前端
docker-compose build frontend --no-cache
docker-compose up -d frontend

# 检查上传目录权限
docker exec campus-trade-backend ls -la /app/uploads/
```

#### 4. 实时聊天无法连接

**问题：** WebSocket 连接失败

**解决方案：**
```bash
# 检查后端日志
docker-compose logs backend | grep Socket

# 检查 Nginx WebSocket 配置
docker exec campus-trade-frontend cat /etc/nginx/conf.d/default.conf | grep socket.io

# 确认前端连接地址
# 生产: 使用相对路径 /socket.io
# 开发: 使用完整地址 http://localhost:3000
```

#### 5. 邮箱验证码发送失败

**问题：** `Error: Invalid login`

**解决方案：**
1. 确认使用的是**授权码**，不是邮箱密码
2. 检查SMTP配置是否正确
3. 确认QQ邮箱已开启SMTP服务

```bash
# 查看详细错误日志
docker-compose logs backend | grep SMTP
docker-compose logs backend | grep email
```

#### 6. 前端页面空白

**问题：** 页面加载后显示空白

**解决方案：**
```bash
# 检查浏览器控制台错误

# 清除浏览器缓存和 localStorage
# 打开开发者工具 F12 -> Application -> Clear storage

# 重新构建前端
cd frontend
npm run build

# Docker 环境重新构建
docker-compose build frontend --no-cache
docker-compose up -d frontend
```

#### 7. 登录失败 - 密码错误

**问题：** 明明密码正确却提示密码错误

**解决方案：**
```bash
# 可能是数据库初始化问题，重置数据库
docker-compose down -v  # 删除所有数据
docker-compose up -d    # 重新创建

# 使用测试账号
# 用户名: testuser
# 密码: 123456
```

### 性能优化

1. **前端优化**
   - 启用 Gzip 压缩（Nginx 已配置）
   - 使用懒加载路由
   - 图片压缩和懒加载

2. **后端优化**
   - 数据库索引优化
   - 使用 Redis 缓存（可选）
   - 启用 Node.js cluster 模式

3. **数据库优化**
   ```sql
   -- 查看慢查询
   SHOW VARIABLES LIKE 'slow_query_log';
   
   -- 查看索引使用情况
   SHOW INDEX FROM products;
   
   -- 优化表
   OPTIMIZE TABLE products;
   ```

## 📊 API 文档

### 认证相关

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/users/register` | POST | 用户注册 | 否 |
| `/api/users/login` | POST | 用户登录 | 否 |
| `/api/users/profile` | GET | 获取个人信息 | ✅ |
| `/api/users/profile` | PUT | 更新个人信息 | ✅ |

### 商品相关

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/products` | GET | 获取商品列表 | 否 |
| `/api/products` | POST | 发布商品 | ✅ |
| `/api/products/:id` | GET | 获取商品详情 | 否 |
| `/api/products/:id` | PUT | 更新商品 | ✅ |
| `/api/products/:id` | DELETE | 删除商品 | ✅ |
| `/api/categories` | GET | 获取分类列表 | 否 |

### 消息相关

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/messages/conversations` | GET | 获取会话列表 | ✅ |
| `/api/messages/:conversationId` | GET | 获取聊天记录 | ✅ |
| `/api/messages/unread-count` | GET | 获取未读消息数 | ✅ |

更多API文档请查看源代码中的注释。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👥 作者

欢迎贡献代码！

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Express.js](https://expressjs.com/) - 快速的 Node.js Web 框架
- [Socket.IO](https://socket.io/) - 实时通信引擎
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [MySQL](https://www.mysql.com/) - 可靠的关系型数据库

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 💬 Issues: [提交问题](https://github.com/yourusername/campus-trade/issues)
- 📧 Email: your.email@example.com
- 🌟 Star: 如果这个项目对你有帮助，请给一个 Star！

## 📊 项目统计

![Alt](https://repobeats.axiom.co/api/embed/your-repo-id.svg "Repobeats analytics image")

---

<div align="center">

### ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/campus-trade&type=Date)](https://star-history.com/#yourusername/campus-trade&Date)

**如果这个项目对你有帮助，请给一个 Star ⭐**

Made with ❤️ by Campus Trade Team

</div>
