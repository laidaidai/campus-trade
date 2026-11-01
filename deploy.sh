#!/bin/bash

# 校园交易平台 PM2 自动部署脚本
# 版本: 1.0
# 作者: Campus Trade Team

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="campus-trade"
PROJECT_DIR="/opt/campus-trade"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="/var/log/campus-trade"
PM2_APP_NAME="campus-trade"

# Git处理函数 - 增强稳定性
handle_git_conflicts() {
    echo -e "${BLUE}检测Git状态...${NC}"
    
    # 检查工作区状态
    local has_work_changes=false
    local has_staged_changes=false
    
    # 检查工作区修改
    if ! git diff --quiet; then
        has_work_changes=true
        echo -e "${YELLOW}检测到工作区修改${NC}"
    fi
    
    # 检查暂存区修改
    if ! git diff --cached --quiet; then
        has_staged_changes=true
        echo -e "${YELLOW}检测到暂存区修改${NC}"
    fi
    
    # 增强的Git处理逻辑
    if [ "$has_work_changes" = true ] || [ "$has_staged_changes" = true ]; then
        echo -e "${YELLOW}检测到本地修改，开始安全处理...${NC}"
        
        # 显示修改摘要
        echo -e "${CYAN}修改摘要:${NC}"
        git diff --stat
        git diff --cached --stat
        
        # 自动选择最安全的方案：暂存本地修改，拉取后自动合并
        echo -e "${BLUE}自动暂存本地修改...${NC}"
        git stash push -m "部署前本地修改 $(date '+%Y-%m-%d %H:%M:%S')"
        
        # 确保远程仓库是最新的
        echo -e "${BLUE}获取远程更新...${NC}"
        git fetch origin
        
        # 拉取远程更新
        echo -e "${BLUE}拉取远程更新...${NC}"
        if ! git pull origin master; then
            echo -e "${RED}拉取失败，尝试强制拉取...${NC}"
            git reset --hard origin/master
        fi
        
        # 尝试应用本地修改
        echo -e "${BLUE}尝试应用本地修改...${NC}"
        if ! git stash pop; then
            echo -e "${YELLOW}自动合并失败，丢弃本地修改以确保更新成功...${NC}"
            git stash drop
            echo -e "${GREEN}✓ 已使用远程最新版本${NC}"
        else
            echo -e "${GREEN}✓ 本地修改已成功合并${NC}"
        fi
        
        echo -e "${GREEN}✓ Git操作完成${NC}"
    else
        echo -e "${GREEN}✓ 没有检测到本地修改${NC}"
        
        # 确保远程仓库是最新的
        echo -e "${BLUE}获取远程更新...${NC}"
        git fetch origin
        
        # 直接拉取远程更新
        echo -e "${BLUE}拉取远程更新...${NC}"
        if ! git pull origin master; then
            echo -e "${RED}拉取失败，尝试强制拉取...${NC}"
            git reset --hard origin/master
        fi
        
        echo -e "${GREEN}✓ Git拉取完成${NC}"
    fi
    
    # 验证Git状态
    echo -e "${BLUE}验证Git状态...${NC}"
    git status --porcelain
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Git状态正常${NC}"
    else
        echo -e "${YELLOW}⚠ Git状态异常，但继续执行${NC}"
    fi
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}错误: 请使用root权限运行此脚本${NC}"
        echo "使用: sudo ./deploy.sh"
        exit 1
    fi
}

# 检查系统环境
check_environment() {
    echo -e "${BLUE}正在检查系统环境...${NC}"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js 未安装${NC}"
        echo "请先安装 Node.js 18+ 版本"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}错误: Node.js 版本过低 (当前: $(node -v))${NC}"
        echo "请升级到 Node.js 18+ 版本"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}错误: npm 未安装${NC}"
        exit 1
    fi
    
    # 检查PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}正在安装 PM2...${NC}"
        npm install -g pm2
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        echo "请先安装 Docker"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 环境检查通过${NC}"
}

# 创建必要目录
create_directories() {
    echo -e "${BLUE}创建必要目录...${NC}"
    mkdir -p "$PROJECT_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKEND_DIR/uploads"
    mkdir -p "$FRONTEND_DIR/dist"
    echo -e "${GREEN}✓ 目录创建完成${NC}"
}

# 检查项目是否存在
check_project() {
    if [ ! -d "$PROJECT_DIR" ] || [ ! -f "$PROJECT_DIR/package.json" ]; then
        echo -e "${RED}错误: 项目目录不存在或项目文件缺失${NC}"
        echo "请确保项目已正确部署到 $PROJECT_DIR"
        exit 1
    fi
}

# 检测和启动MySQL数据库
start_mysql() {
    echo -e "${BLUE}检测MySQL服务...${NC}"
    
    # 首先检查.env文件是否存在
    if [ -f "$PROJECT_DIR/.env" ] && grep -q "DB_HOST" "$PROJECT_DIR/.env"; then
        echo -e "${GREEN}✓ 检测到环境配置文件，将使用现有配置${NC}"
        source "$PROJECT_DIR/.env"
        return 0
    else
        echo -e "${YELLOW}未检测到环境配置文件，将引导您完成配置${NC}"
        echo -e "${BLUE}请完成以下配置信息：${NC}"
        
        # 获取数据库配置
        echo -e "${YELLOW}数据库配置：${NC}"
        read -p "请输入MySQL主机 (默认: localhost): " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
        
        read -p "请输入MySQL端口 (默认: 3306): " DB_PORT
        DB_PORT=${DB_PORT:-3306}
        
        read -p "请输入数据库名称 (默认: campus_trade): " DB_NAME
        DB_NAME=${DB_NAME:-campus_trade}
        
        read -p "请输入数据库用户名 (默认: root): " DB_USER
        DB_USER=${DB_USER:-root}
        
        read -p "请输入数据库密码: " DB_PASSWORD
        
        # 获取应用配置
        echo -e "${YELLOW}应用配置：${NC}"
        read -p "请输入JWT密钥 (默认: campus_trade_jwt_secret_key_2024_production): " JWT_SECRET
        JWT_SECRET=${JWT_SECRET:-campus_trade_jwt_secret_key_2024_production}
        
        read -p "请输入后端端口 (默认: 3000): " APP_PORT
        APP_PORT=${APP_PORT:-3000}
        
        read -p "请输入 Nginx 对外端口 (默认: 80): " FRONTEND_PORT
        FRONTEND_PORT=${FRONTEND_PORT:-80}
        
        # 获取邮件配置
        echo -e "${YELLOW}邮件配置（可选）：${NC}"
        read -p "请输入SMTP服务器 (默认: smtp.qq.com): " SMTP_HOST
        SMTP_HOST=${SMTP_HOST:-smtp.qq.com}
        
        read -p "请输入SMTP端口 (默认: 587): " SMTP_PORT
        SMTP_PORT=${SMTP_PORT:-587}
        
        read -p "请输入邮箱账号 (默认: your_email@qq.com): " SMTP_USER
        SMTP_USER=${SMTP_USER:-your_email@qq.com}
        
        read -p "请输入邮箱密码 (默认: your_email_password): " SMTP_PASS
        SMTP_PASS=${SMTP_PASS:-your_email_password}
        
        # 自动获取服务器信息
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
        SERVER_HOSTNAME=$(hostname -f 2>/dev/null || echo "localhost")
        
        # 创建.env文件
        echo -e "${BLUE}创建环境配置文件...${NC}"
        cat > "$PROJECT_DIR/.env" << EOF
# 数据库配置
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT配置
JWT_SECRET=$JWT_SECRET

# 应用配置
NODE_ENV=production
PORT=$APP_PORT
FRONTEND_PORT=$FRONTEND_PORT
BASE_URL=http://$SERVER_IP:$APP_PORT
ALLOWED_ORIGINS=http://$SERVER_IP:$FRONTEND_PORT,http://$SERVER_IP:$APP_PORT,http://$SERVER_HOSTNAME:$FRONTEND_PORT,http://$SERVER_HOSTNAME:$APP_PORT

# 前端配置
VITE_PORT=$FRONTEND_PORT
VITE_API_TARGET=http://$SERVER_IP:$APP_PORT
VITE_BASE_URL=
VITE_API_URL=/api

# 服务器信息
SERVER_IP=$SERVER_IP
SERVER_HOSTNAME=$SERVER_HOSTNAME

# 邮件配置
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
EOF
        
        echo -e "${GREEN}✓ 环境配置文件创建完成${NC}"
        echo -e "${CYAN}配置信息：${NC}"
        echo -e "  数据库: $DB_HOST:$DB_PORT/$DB_NAME"
        echo -e "  用户: $DB_USER"
        echo -e "  应用端口: $APP_PORT"
        echo -e "  服务器IP: $SERVER_IP"
        echo
        return 0
    fi
    
    # 检测MySQL服务状态（仅用于验证连接）
    echo -e "${BLUE}检测MySQL服务状态...${NC}"
    
    # 检测系统MySQL服务
    if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
        echo -e "${GREEN}✓ 检测到系统MySQL服务正在运行${NC}"
        MYSQL_TYPE="system"
    elif docker ps --format 'table {{.Names}}' | grep -q "mysql"; then
        echo -e "${GREEN}✓ 检测到Docker MySQL容器正在运行${NC}"
        MYSQL_TYPE="docker_running"
    elif docker ps -a --format 'table {{.Names}}' | grep -q "mysql"; then
        echo -e "${YELLOW}检测到Docker MySQL容器已存在但未运行，正在启动...${NC}"
        docker start mysql
        MYSQL_TYPE="docker_started"
    else
        echo -e "${YELLOW}未检测到MySQL服务，正在安装Docker MySQL...${NC}"
        MYSQL_TYPE="docker_new"
        
        # 创建Docker MySQL容器
        echo -e "${BLUE}创建Docker MySQL容器...${NC}"
        docker run -d \
            --name mysql \
            --restart unless-stopped \
            -e MYSQL_ROOT_PASSWORD="campus_trade_root_2024" \
            -e MYSQL_DATABASE="$DB_NAME" \
            -e MYSQL_USER="$DB_USER" \
            -e MYSQL_PASSWORD="$DB_PASSWORD" \
            -e TZ=Asia/Shanghai \
            -p 3306:3306 \
            -v "$PROJECT_DIR/backend/database:/docker-entrypoint-initdb.d:ro" \
            mysql:8.0 \
            --default-authentication-plugin=mysql_native_password \
            --character-set-server=utf8mb4 \
            --collation-server=utf8mb4_unicode_ci
        
        echo -e "${YELLOW}等待MySQL启动...${NC}"
        sleep 20
        
        # 等待MySQL完全启动
        echo -e "${BLUE}等待MySQL服务就绪...${NC}"
        for i in {1..60}; do
            if docker exec mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
                echo -e "${GREEN}✓ MySQL服务已就绪${NC}"
                break
            fi
            echo -n "."
            sleep 2
        done
    fi
    
    # 验证MySQL连接
    if [ "$MYSQL_TYPE" = "docker_running" ] || [ "$MYSQL_TYPE" = "docker_started" ] || [ "$MYSQL_TYPE" = "docker_new" ]; then
        echo -e "${YELLOW}验证MySQL连接...${NC}"
        
        # 首先等待容器完全启动
        for i in {1..30}; do
            if docker ps --format 'table {{.Names}}' | grep -q "mysql" && ! docker ps --format 'table {{.Status}}' | grep -q "Restarting"; then
                break
            fi
            echo -n "."
            sleep 2
        done
        
        # 然后验证MySQL服务
        for i in {1..30}; do
            if docker exec mysql mysqladmin ping -h localhost -u "$DB_USER" -p"$DB_PASSWORD" --silent 2>/dev/null; then
                echo -e "${GREEN}✓ MySQL连接成功${NC}"
                return 0
            fi
            echo -n "."
            sleep 2
        done
        
        echo -e "${RED}错误: MySQL连接失败${NC}"
        echo -e "${YELLOW}请检查MySQL容器状态: docker logs mysql${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ 系统MySQL服务可用${NC}"
    fi
}

# 安装依赖
install_dependencies() {
    echo -e "${BLUE}安装项目依赖...${NC}"
    
    # 清理npm缓存
    echo -e "${YELLOW}清理npm缓存...${NC}"
    npm cache clean --force 2>/dev/null || true
    
    # 根目录依赖
    echo -e "${YELLOW}安装根目录依赖...${NC}"
    cd "$PROJECT_DIR"
    if [ -f "package.json" ]; then
        rm -rf node_modules package-lock.json 2>/dev/null || true
        npm install --no-optional --production=false
    fi
    
    # 后端依赖
    echo -e "${YELLOW}安装后端依赖...${NC}"
    cd "$BACKEND_DIR"
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm install --no-optional --production=false
    
    # 前端依赖
    echo -e "${YELLOW}安装前端依赖...${NC}"
    cd "$FRONTEND_DIR"
    rm -rf node_modules package-lock.json 2>/dev/null || true
    
    # 安装前端依赖，确保包含可选依赖
    echo -e "${YELLOW}安装前端依赖（包含可选依赖）...${NC}"
    npm install --force --no-optional=false
    
    # 确保rollup平台特定依赖已安装
    echo -e "${YELLOW}确保Rollup平台依赖...${NC}"
    npm install @rollup/rollup-linux-x64-gnu --save-optional --force 2>/dev/null || true
    
    # 安装构建必需的依赖
    echo -e "${YELLOW}安装构建必需依赖...${NC}"
    npm install terser --save-dev --force 2>/dev/null || true
    npm install @vitejs/plugin-vue --save-dev --force 2>/dev/null || true
    npm install vite --save-dev --force 2>/dev/null || true
    
    # 验证关键依赖
    echo -e "${YELLOW}验证关键依赖...${NC}"
    cd "$BACKEND_DIR"
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/bcryptjs" ]; then
        echo -e "${RED}错误: 关键依赖安装失败${NC}"
        echo -e "${YELLOW}尝试重新安装...${NC}"
        npm install bcryptjs --save
    fi
    
    # 验证前端关键依赖
    echo -e "${YELLOW}验证前端关键依赖...${NC}"
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/terser" ]; then
        echo -e "${YELLOW}前端缺少terser依赖，正在安装...${NC}"
        npm install terser --save-dev --force
    fi
    
    if [ ! -d "node_modules/@vitejs/plugin-vue" ]; then
        echo -e "${YELLOW}前端缺少Vue插件依赖，正在安装...${NC}"
        npm install @vitejs/plugin-vue --save-dev --force
    fi
    
    if [ ! -d "node_modules/vite" ]; then
        echo -e "${YELLOW}前端缺少Vite依赖，正在安装...${NC}"
        npm install vite --save-dev --force
    fi
    
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
}

# 构建项目
build_project() {
    echo -e "${BLUE}构建项目...${NC}"
    
    # 构建后端
    echo -e "${YELLOW}构建后端...${NC}"
    cd "$BACKEND_DIR"
    if ! npm run build; then
        echo -e "${RED}后端构建失败，尝试重新安装依赖...${NC}"
        rm -rf node_modules package-lock.json
        npm install
        npm run build
    fi
    
    # 构建前端
    echo -e "${YELLOW}构建前端...${NC}"
    cd "$FRONTEND_DIR"
    
    # 先尝试正常构建
    if npm run build 2>/dev/null; then
        echo -e "${GREEN}✓ 前端构建成功${NC}"
    else
        echo -e "${YELLOW}前端构建失败，尝试修复依赖问题...${NC}"
        
        # 清理依赖
        rm -rf node_modules package-lock.json
        
        # 重新安装依赖，强制安装可选依赖
        npm install --force --no-optional=false
        
        # 专门安装rollup相关依赖
        echo -e "${YELLOW}安装Rollup平台特定依赖...${NC}"
        npm install @rollup/rollup-linux-x64-gnu --save-optional --force
        
        # 安装构建必需的依赖
        echo -e "${YELLOW}安装构建必需依赖...${NC}"
        npm install terser --save-dev --force
        npm install @vitejs/plugin-vue --save-dev --force
        npm install vite --save-dev --force
        
        # 再次尝试构建
        if npm run build; then
            echo -e "${GREEN}✓ 前端构建成功${NC}"
        else
            echo -e "${RED}前端构建仍然失败，尝试最后修复...${NC}"
            
            # 最后尝试：清理缓存并重新安装所有依赖
            npm cache clean --force
            rm -rf node_modules package-lock.json
            npm install --force
            
            # 确保关键依赖存在
            npm install terser @vitejs/plugin-vue vite --save-dev --force
            
            if npm run build; then
                echo -e "${GREEN}✓ 前端构建成功${NC}"
            else
                echo -e "${RED}前端构建仍然失败，请手动检查依赖${NC}"
                echo -e "${YELLOW}可以尝试运行: cd $FRONTEND_DIR && npm install --force${NC}"
                echo -e "${YELLOW}然后手动安装: npm install terser @vitejs/plugin-vue vite --save-dev${NC}"
                exit 1
            fi
        fi
    fi
    
    echo -e "${GREEN}✓ 项目构建完成${NC}"
}

# 创建完整的环境配置文件（在MySQL配置完成后）
create_complete_env_file() {
    echo -e "${BLUE}创建环境配置文件...${NC}"
    
    # 获取其他必要配置
    echo -e "${YELLOW}配置应用信息${NC}"
    read -p "请输入JWT密钥 (默认: campus_trade_jwt_secret_key_2024_production): " JWT_SECRET
    JWT_SECRET=${JWT_SECRET:-campus_trade_jwt_secret_key_2024_production}
    
    read -p "请输入应用端口 (默认: 3000): " APP_PORT
    APP_PORT=${APP_PORT:-3000}
    
    echo -e "${YELLOW}配置邮件服务（可选）${NC}"
    read -p "请输入SMTP服务器 (默认: smtp.qq.com): " SMTP_HOST
    SMTP_HOST=${SMTP_HOST:-smtp.qq.com}
    
    read -p "请输入SMTP端口 (默认: 587): " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    
    read -p "请输入邮箱账号 (默认: your_email@qq.com): " SMTP_USER
    SMTP_USER=${SMTP_USER:-your_email@qq.com}
    
    read -p "请输入邮箱密码 (默认: your_email_password): " SMTP_PASS
    SMTP_PASS=${SMTP_PASS:-your_email_password}
    
    # 自动获取服务器信息
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    SERVER_HOSTNAME=$(hostname -f 2>/dev/null || echo "localhost")
    
        # 创建.env文件
        cat > "$PROJECT_DIR/.env" << EOF
# 数据库配置
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT配置
JWT_SECRET=$JWT_SECRET

# 应用配置
NODE_ENV=production
PORT=$APP_PORT
FRONTEND_PORT=$FRONTEND_PORT
BASE_URL=http://$SERVER_IP:$APP_PORT
ALLOWED_ORIGINS=http://$SERVER_IP:$FRONTEND_PORT,http://$SERVER_IP:$APP_PORT,http://$SERVER_HOSTNAME:$FRONTEND_PORT,http://$SERVER_HOSTNAME:$APP_PORT

# 前端配置
VITE_PORT=$FRONTEND_PORT
VITE_API_TARGET=http://$SERVER_IP:$APP_PORT
VITE_BASE_URL=
VITE_API_URL=/api

# 服务器信息
SERVER_IP=$SERVER_IP
SERVER_HOSTNAME=$SERVER_HOSTNAME

# 邮件配置
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
EOF
    
    echo -e "${GREEN}✓ 环境配置文件创建完成${NC}"
}

# 创建环境配置文件（兼容旧版本）
create_env_file() {
    echo -e "${BLUE}检查环境配置文件...${NC}"
    
    # 如果.env文件已存在且包含数据库配置，则使用现有配置
    if [ -f "$PROJECT_DIR/.env" ] && grep -q "DB_HOST" "$PROJECT_DIR/.env"; then
        echo -e "${GREEN}使用现有环境配置${NC}"
        # 读取现有配置
        source "$PROJECT_DIR/.env"
        return 0
    else
        echo -e "${YELLOW}未找到环境配置文件，将在MySQL配置后创建${NC}"
        return 1
    fi
}

# 部署前端（构建静态产物并交由 Nginx 托管）
# 说明：不再使用 `vite preview` —— 那是预览服务器，不适合生产，
# 且会引入 5173 端口、Host 检查、跨域等一堆问题。
# 现在由 Nginx 直接托管 dist/ 并反向代理 /api、/uploads、/socket.io。
start_frontend_service() {
    echo -e "${BLUE}构建前端静态文件...${NC}"

    if [ -f "$PROJECT_DIR/.env" ]; then
        source "$PROJECT_DIR/.env"
    fi

    cd "$FRONTEND_DIR" || return 1

    # 同域部署：API 走相对路径 /api，VITE_BASE_URL 留空
    VITE_API_URL=/api VITE_BASE_URL="" npm run build

    if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
        echo -e "${RED}✗ 前端构建失败：dist/index.html 不存在${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ 前端构建完成: $FRONTEND_DIR/dist${NC}"

    # 清理旧的 vite preview 进程（历史遗留）
    pm2 stop campus-trade-frontend 2>/dev/null || true
    pm2 delete campus-trade-frontend 2>/dev/null || true
    pkill -f "start-preview.js" 2>/dev/null || true

    # 安装 Nginx 站点配置
    if [ -f "$PROJECT_DIR/deploy/nginx.conf.template" ] && command -v nginx &> /dev/null; then
        echo -e "${BLUE}配置 Nginx...${NC}"
        local SERVER_NAME="${DOMAIN:-_}"
        if [ -n "${FRONTEND_DOMAIN:-}" ]; then
            SERVER_NAME="$FRONTEND_DOMAIN"
        fi

        sed -e "s|__SERVER_NAME__|$SERVER_NAME|g" \
            -e "s|__ROOT__|$FRONTEND_DIR/dist|g" \
            -e "s|__BACKEND__|127.0.0.1:${BACKEND_PORT:-3000}|g" \
            "$PROJECT_DIR/deploy/nginx.conf.template" > /etc/nginx/sites-available/campus-trade

        ln -sf /etc/nginx/sites-available/campus-trade /etc/nginx/sites-enabled/campus-trade
        rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

        if nginx -t 2>/dev/null; then
            systemctl reload nginx 2>/dev/null || nginx -s reload
            echo -e "${GREEN}✓ Nginx 已加载配置，前端通过 80 端口访问${NC}"
        else
            echo -e "${RED}✗ Nginx 配置校验失败，请检查 /etc/nginx/sites-available/campus-trade${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ 未找到 deploy/nginx.conf.template 或未安装 Nginx${NC}"
        echo -e "${YELLOW}  前端产物已就绪: $FRONTEND_DIR/dist${NC}"
        echo -e "${YELLOW}  请手动配置 Web 服务器指向该目录${NC}"
    fi
}

# 启动PM2服务
start_pm2_services() {
    echo -e "${BLUE}启动PM2服务...${NC}"
    
    # 停止现有服务
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
    
    # 创建PM2配置文件
    # 读取.env文件中的环境变量
    if [ -f "$PROJECT_DIR/.env" ]; then
        source "$PROJECT_DIR/.env"
    fi
    
    cat > "$PROJECT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: '$BACKEND_DIR/dist/server.js',
    cwd: '$PROJECT_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: ${PORT:-3000},
      DB_HOST: '${DB_HOST:-localhost}',
      DB_PORT: '${DB_PORT:-3306}',
      DB_USER: '${DB_USER:-root}',
      DB_PASSWORD: '${DB_PASSWORD}',
      DB_NAME: '${DB_NAME:-campus_trade}',
      JWT_SECRET: '${JWT_SECRET}',
      SMTP_HOST: '${SMTP_HOST:-smtp.qq.com}',
      SMTP_PORT: '${SMTP_PORT:-587}',
      SMTP_USER: '${SMTP_USER:-your_email@qq.com}',
      SMTP_PASS: '${SMTP_PASS:-your_email_password}',
      SERVER_IP: '${SERVER_IP:-localhost}',
      SERVER_HOSTNAME: '${SERVER_HOSTNAME:-localhost}',
      BASE_URL: '${BASE_URL:-http://localhost:3000}',
      ALLOWED_ORIGINS: '${ALLOWED_ORIGINS:-http://localhost:80,http://localhost:3000}'
    },
    error_file: '$LOG_DIR/error.log',
    out_file: '$LOG_DIR/out.log',
    log_file: '$LOG_DIR/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
    
    # 启动后端服务
    pm2 start "$PROJECT_DIR/ecosystem.config.js"
    
    # 保存PM2配置
    pm2 save
    pm2 startup
    
    echo -e "${GREEN}✓ PM2服务启动完成${NC}"
}

# 检查服务状态
check_status() {
    echo -e "${BLUE}检查服务状态...${NC}"
    
    echo -e "${CYAN}=== PM2 服务状态 ===${NC}"
    pm2 status
    
    # 检查PM2服务是否运行
    if pm2 list | grep -q "campus-trade.*online"; then
        echo -e "${GREEN}✓ PM2服务正在运行${NC}"
        
        # 显示服务日志
        echo -e "\n${CYAN}=== 最近的服务日志 ===${NC}"
        pm2 logs "$PM2_APP_NAME" --lines 5 --nostream
    else
        echo -e "${RED}✗ PM2服务未运行或状态异常${NC}"
        echo -e "${YELLOW}问题诊断:${NC}"
        
        # 检查PM2进程是否存在
        if pm2 list | grep -q "campus-trade"; then
            echo -e "  - PM2进程存在但状态异常"
            pm2 logs "$PM2_APP_NAME" --err --lines 3 --nostream
        else
            echo -e "  - PM2进程不存在"
        fi
        
        # 检查配置文件
        if [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
            echo -e "  - PM2配置文件存在"
        else
            echo -e "  - PM2配置文件缺失"
        fi
        
        # 检查后端文件
        if [ -f "$BACKEND_DIR/dist/server.js" ]; then
            echo -e "  - 后端构建文件存在"
        else
            echo -e "  - 后端构建文件缺失"
        fi
        
        # 检查环境变量
        if [ -f "$PROJECT_DIR/.env" ]; then
            echo -e "  - 环境配置文件存在"
        else
            echo -e "  - 环境配置文件缺失"
        fi
    fi
    
    echo -e "\n${CYAN}=== 应用端口检查 ===${NC}"
    
    # 读取环境变量获取配置的端口
    if [ -f "$PROJECT_DIR/.env" ]; then
        source "$PROJECT_DIR/.env"
    fi
    
    # 检查后端端口（从环境变量读取）
    BACKEND_PORT=${PORT:-3000}
    if netstat -tlnp | grep -q ":$BACKEND_PORT "; then
        echo -e "${GREEN}✓ 后端服务端口 $BACKEND_PORT 正在监听${NC}"
        BACKEND_STATUS="运行中"
    else
        echo -e "${RED}✗ 后端服务端口 $BACKEND_PORT 未监听${NC}"
        BACKEND_STATUS="未运行"
    fi
    
    # 检查 Nginx（前端静态托管）
    FRONTEND_PORT_DETECTED="未检测到"
    if curl -fsS "http://127.0.0.1:80/" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Nginx 正在提供前端页面（80 端口）${NC}"
        FRONTEND_PORT_DETECTED="80"
    else
        echo -e "${YELLOW}⚠ Nginx 未在 80 端口响应${NC}"
        echo -e "${YELLOW}  请检查: nginx -t && systemctl status nginx${NC}"
    fi
    
    # 检查数据库端口
    if netstat -tlnp | grep -q ":3306"; then
        echo -e "${GREEN}✓ 数据库端口 3306 正在监听${NC}"
    else
        echo -e "${RED}✗ 数据库端口 3306 未监听${NC}"
    fi
    
    echo -e "\n${CYAN}=== 系统资源使用情况 ===${NC}"
    echo "内存使用:"
    free -h
    echo -e "\n磁盘使用:"
    df -h /
    echo -e "\nCPU使用:"
    top -bn1 | grep "Cpu(s)"
    
    echo -e "\n${CYAN}=== 端口占用情况 ===${NC}"
    netstat -tlnp | grep -E ':(80|3000|3306|8080|5173)'
    
    echo -e "\n${CYAN}=== Docker 容器状态 ===${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # 显示访问地址
    echo -e "\n${CYAN}=== 访问地址 ===${NC}"
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    
    if [ "$BACKEND_STATUS" = "运行中" ]; then
        echo -e "后端API: ${GREEN}http://$SERVER_IP:$BACKEND_PORT${NC}"
    else
        echo -e "后端API: ${RED}未运行 (配置端口: $BACKEND_PORT)${NC}"
    fi
    
    echo -e "数据库: ${GREEN}$SERVER_IP:3306${NC}"
    
    if [ "$FRONTEND_PORT_DETECTED" != "未检测到" ]; then
        echo -e "前端: ${GREEN}http://$SERVER_IP:$FRONTEND_PORT_DETECTED${NC}"
    else
        echo -e "前端: ${YELLOW}未检测到运行中的前端服务 (配置端口: $FRONTEND_PORT)${NC}"
    fi
}

# 更新代码 - 安全更新流程
update_code() {
    echo -e "${BLUE}开始安全更新代码...${NC}"
    
    cd "$PROJECT_DIR"
    
    # 第一步：停止所有正在运行的服务
    echo -e "${YELLOW}第一步：停止正在运行的服务...${NC}"
    stop_services
    
    # 等待服务完全停止
    sleep 3
    
    # 第二步：处理Git更新
    echo -e "${YELLOW}第二步：处理Git更新...${NC}"
    if [ -d ".git" ]; then
        handle_git_conflicts
    else
        echo -e "${YELLOW}警告: 未检测到Git仓库，跳过代码更新${NC}"
    fi
    
    # 第三步：重新安装依赖
    echo -e "${YELLOW}第三步：重新安装依赖...${NC}"
    install_dependencies
    
    # 第四步：重新构建项目
    echo -e "${YELLOW}第四步：重新构建项目...${NC}"
    build_project
    
    # 第五步：重新启动服务
    echo -e "${YELLOW}第五步：重新启动服务...${NC}"
    restart_services
    
    echo -e "${GREEN}✓ 代码更新完成${NC}"
}

# 重启服务
restart_services() {
    echo -e "${BLUE}重启服务...${NC}"
    
    pm2 restart "$PM2_APP_NAME"
    stop_frontend_service
    start_frontend_service
    
    echo -e "${GREEN}✓ 服务重启完成${NC}"
}

# 停止前端服务
stop_frontend_service() {
    echo -e "${BLUE}停止前端服务...${NC}"
    
    # 停止PM2前端服务
    pm2 stop campus-trade-frontend 2>/dev/null || true
    pm2 delete campus-trade-frontend 2>/dev/null || true
    
    # 清理PM2配置文件
    rm -f "$PROJECT_DIR/frontend/ecosystem-frontend.config.js" 2>/dev/null || true
    rm -f "$PROJECT_DIR/frontend/ecosystem-frontend.config.cjs" 2>/dev/null || true
    
    # 读取环境变量获取前端端口
    if [ -f "$PROJECT_DIR/.env" ]; then
        source "$PROJECT_DIR/.env"
    fi
    
    FRONTEND_PORT=${FRONTEND_PORT:-80}
    
    # 查找并停止Vite前端服务进程（备用）
    FRONTEND_PID=$(netstat -tlnp | grep ":$FRONTEND_PORT " | awk '{print $7}' | cut -d'/' -f1)
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}停止Vite前端服务进程 (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 2
        
        # 检查是否已停止
        if ! netstat -tlnp | grep -q ":$FRONTEND_PORT "; then
            echo -e "${GREEN}✓ Vite前端服务已停止${NC}"
        else
            echo -e "${YELLOW}强制停止Vite前端服务...${NC}"
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
    else
        echo -e "${YELLOW}未找到运行中的Vite前端服务${NC}"
    fi
    
    # 停止其他可能的进程
    pkill -f "start-preview.js" 2>/dev/null || true
    pkill -f "npm run preview" 2>/dev/null || true
    pkill -f "vite preview" 2>/dev/null || true
}

# 停止服务
stop_services() {
    echo -e "${BLUE}停止服务...${NC}"
    
    pm2 stop "$PM2_APP_NAME"
    stop_frontend_service
    
    echo -e "${GREEN}✓ 服务已停止${NC}"
}

# 删除部署
remove_deployment() {
    echo -e "${RED}警告: 此操作将删除PM2服务，但保留项目目录和Docker容器${NC}"
    read -p "确定要继续吗? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}删除PM2服务...${NC}"
        pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
        pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
        
        echo -e "${BLUE}停止前端服务...${NC}"
        stop_frontend_service
        
        echo -e "${BLUE}清理日志文件...${NC}"
        rm -rf "$LOG_DIR" 2>/dev/null || true
        
        echo -e "${GREEN}✓ 所有服务已删除，项目目录和Docker容器已保留${NC}"
        echo -e "${CYAN}项目目录位置: $PROJECT_DIR${NC}"
        echo -e "${CYAN}Docker容器: mysql (已保留)${NC}"
    else
        echo -e "${YELLOW}操作已取消${NC}"
    fi
}

# 一键部署
deploy_all() {
    echo -e "${PURPLE}开始一键部署...${NC}"
    
    check_environment
    create_directories
    check_project
    
    # 跳过Git检测（一键部署不需要Git处理）
    echo -e "${GREEN}✓ 一键部署模式，跳过Git检测${NC}"
    
    start_mysql
    install_dependencies
    build_project
    start_pm2_services
    start_frontend_service
    
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}      校园交易平台部署完成！${NC}"
    echo -e "${GREEN}==========================================${NC}"
    # 获取服务器IP用于显示
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    
    echo -e "${CYAN}访问地址:${NC}"
    echo -e "  后端API: http://$SERVER_IP:$APP_PORT"
    echo -e "  数据库: $SERVER_IP:3306"
    echo -e "${CYAN}服务器信息:${NC}"
    echo -e "  IP地址: $SERVER_IP"
    echo -e "  主机名: $(hostname -f 2>/dev/null || echo 'localhost')"
    echo -e "${CYAN}管理命令:${NC}"
    echo -e "  查看状态: pm2 status"
    echo -e "  查看日志: pm2 logs $PM2_APP_NAME"
    echo -e "  重启服务: pm2 restart $PM2_APP_NAME"
    echo -e "${GREEN}==========================================${NC}"
}

# 主菜单
show_menu() {
    clear
    echo -e "${PURPLE}==========================================${NC}"
    echo -e "${PURPLE}      校园交易平台 PM2 自动部署脚本${NC}"
    echo -e "${PURPLE}==========================================${NC}"
    echo
    echo -e "${CYAN}可用操作:${NC}"
    echo -e "  ${GREEN}1)${NC} 一键部署 (执行环境检查、初始化、构建并启动PM2服务)"
    echo -e "  ${GREEN}2)${NC} 一键删除 (移除 PM2 服务，保留项目目录和Docker容器)"
    echo -e "  ${GREEN}3)${NC} 一键启动 (pm2 start)"
    echo -e "  ${GREEN}4)${NC} 一键关闭 (pm2 stop)"
    echo -e "  ${GREEN}5)${NC} 重启服务 (pm2 restart)"
    echo -e "  ${GREEN}6)${NC} 更新代码 (拉取最新代码、重新构建并重启服务)"
    echo -e "  ${GREEN}7)${NC} 检查状态 (pm2 status + 系统资源)"
    echo -e "  ${GREEN}8)${NC} 退出"
    echo
}

# 主程序
main() {
    check_root
    
    while true; do
        show_menu
        read -p "请输入选项 [1-8]: " choice
        
        case $choice in
            1)
                deploy_all
                ;;
            2)
                remove_deployment
                ;;
            3)
                pm2 start "$PM2_APP_NAME" 2>/dev/null || echo -e "${RED}服务启动失败，请先执行一键部署${NC}"
                ;;
            4)
                stop_services
                ;;
            5)
                restart_services
                ;;
            6)
                update_code
                ;;
            7)
                check_status
                ;;
            8)
                echo -e "${GREEN}再见！${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项，请重新选择${NC}"
                ;;
        esac
        
        echo
        read -p "按回车键继续..."
    done
}

# 运行主程序
main "$@"
