#!/usr/bin/env bash
# ============================================================
# 校园交易平台 - VPS 生产部署脚本（前后端同域）
#
# 架构：
#   浏览器 ──► Nginx :80/443
#                ├─ /            → frontend/dist 静态文件
#                ├─ /api/        → 127.0.0.1:3000 (Express)
#                ├─ /uploads/    → 127.0.0.1:3000 (用户图片)
#                └─ /socket.io/  → 127.0.0.1:3000 (WebSocket)
#
# 相比旧 deploy.sh 的关键区别：
#   旧方案用 `vite preview` 起 PM2 进程跑前端 —— 那是预览服务器，
#   性能与稳定性都不适合生产，且导致 5173 端口、跨域、Host 检查等一堆问题。
#   本脚本改为 Nginx 直接托管构建产物，同域访问，无跨域问题。
#
# 用法：
#   sudo bash deploy/deploy-vps.sh              # 交互式
#   sudo bash deploy/deploy-vps.sh install      # 首次完整部署
#   sudo bash deploy/deploy-vps.sh update       # 拉代码 + 重建 + 重启
#   sudo bash deploy/deploy-vps.sh status       # 查看状态
#   sudo bash deploy/deploy-vps.sh logs         # 查看后端日志
#   sudo bash deploy/deploy-vps.sh restart      # 重启后端
#
# 环境变量（可覆盖）：
#   DOMAIN=example.com   站点域名（留空则用 IP / 任意 Host 访问）
#   BACKEND_PORT=3000    后端端口
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="$PROJECT_DIR/logs"

BACKEND_PORT="${BACKEND_PORT:-3000}"
DOMAIN="${DOMAIN:-}"
NGINX_SITE="campus-trade"
NGINX_AVAILABLE="/etc/nginx/sites-available/$NGINX_SITE"
NGINX_ENABLED="/etc/nginx/sites-enabled/$NGINX_SITE"
PM2_APP="campus-trade-backend"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[信息]${NC} $*"; }
ok()    { echo -e "${GREEN}[完成]${NC} $*"; }
warn()  { echo -e "${YELLOW}[警告]${NC} $*"; }
err()   { echo -e "${RED}[错误]${NC} $*" >&2; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    err "请使用 root 权限运行：sudo bash $0 $*"
    exit 1
  fi
}

# ---------------- 环境检查 ----------------
check_deps() {
  info "检查运行环境..."

  if ! command -v node >/dev/null 2>&1; then
    err "未安装 Node.js，请先安装 Node.js 20 LTS"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
  fi

  local major
  major=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  if [[ "$major" -lt 20 ]]; then
    err "Node.js 版本过低：$(node -v)（需要 >= 20）"
    exit 1
  fi
  ok "Node.js $(node -v)"

  if ! command -v npm >/dev/null 2>&1; then
    err "未安装 npm"; exit 1
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    warn "未安装 PM2，正在安装..."
    npm install -g pm2
  fi
  ok "PM2 $(pm2 -v 2>/dev/null | tail -1)"

  if ! command -v nginx >/dev/null 2>&1; then
    warn "未安装 Nginx，正在安装..."
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -qq && apt-get install -y nginx
    elif command -v yum >/dev/null 2>&1; then
      yum install -y nginx
    else
      err "无法自动安装 Nginx，请手动安装"; exit 1
    fi
  fi
  ok "Nginx 已安装"

  if ! command -v mysql >/dev/null 2>&1; then
    warn "未检测到 mysql 客户端，跳过数据库连通性检查"
  fi
}

# ---------------- 环境变量 ----------------
ensure_env_file() {
  local env_file="$PROJECT_DIR/.env"

  if [[ -f "$env_file" ]] && grep -q "DB_HOST" "$env_file"; then
    ok "使用已有 .env"
    return
  fi

  warn "未找到 .env，开始交互式创建（可直接回车使用默认值）"

  local db_host db_port db_user db_pass db_name jwt smtp_host smtp_port smtp_user smtp_pass
  read -rp "数据库地址 [localhost]: " db_host; db_host=${db_host:-localhost}
  read -rp "数据库端口 [3306]: " db_port; db_port=${db_port:-3306}
  read -rp "数据库用户 [campus_user]: " db_user; db_user=${db_user:-campus_user}
  read -rsp "数据库密码: " db_pass; echo
  read -rp "数据库名 [campus_trade]: " db_name; db_name=${db_name:-campus_trade}

  jwt=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")

  echo ""
  info "邮件服务用于发送验证码（可留空，留空则注册不强制邮箱验证）"
  read -rp "SMTP 主机 [smtp.qq.com]: " smtp_host; smtp_host=${smtp_host:-smtp.qq.com}
  read -rp "SMTP 端口 [465]: " smtp_port; smtp_port=${smtp_port:-465}
  read -rp "SMTP 用户（邮箱）: " smtp_user
  read -rsp "SMTP 授权码: " smtp_pass; echo

  cat > "$env_file" <<EOF
# ===== 数据库 =====
DB_HOST=$db_host
DB_PORT=$db_port
DB_USER=$db_user
DB_PASSWORD=$db_pass
DB_NAME=$db_name

# ===== JWT（自动生成，勿泄露）=====
JWT_SECRET=$jwt

# ===== 应用 =====
NODE_ENV=production
PORT=$BACKEND_PORT
TRUST_PROXY=1
ALLOWED_ORIGINS=${DOMAIN:+http://$DOMAIN,https://$DOMAIN}

# ===== 邮件 =====
SMTP_HOST=$smtp_host
SMTP_PORT=$smtp_port
SMTP_USER=$smtp_user
SMTP_PASS=$smtp_pass

# ===== 邮箱验证 =====
# 留空=配置了 SMTP 就自动开启；不想强制验证可设为 false
#REQUIRE_EMAIL_VERIFICATION=true
EOF

  chmod 600 "$env_file"
  ok "已生成 .env（权限 600）"
  warn "请确认数据库已创建并导入 backend/database/*.sql"
}

# ---------------- 后端 ----------------
build_backend() {
  info "构建后端..."
  cd "$BACKEND_DIR"
  npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund
  # 编译需要 devDependencies（typescript）
  npm install --no-audit --no-fund >/dev/null 2>&1 || true
  rm -rf dist
  npm run build
  mkdir -p "$BACKEND_DIR/uploads/products" "$BACKEND_DIR/uploads/avatars"
  ok "后端构建完成"
}

# ---------------- 前端 ----------------
build_frontend() {
  info "构建前端（同域部署：API 走相对路径 /api）..."
  cd "$FRONTEND_DIR"
  npm install --no-audit --no-fund
  rm -rf dist
  # 同域部署关键点：VITE_API_URL=/api，VITE_BASE_URL 留空以使用相对路径
  VITE_API_URL=/api VITE_BASE_URL="" npm run build

  if [[ ! -f "$FRONTEND_DIR/dist/index.html" ]]; then
    err "前端构建失败：dist/index.html 不存在"
    exit 1
  fi
  ok "前端构建完成：$FRONTEND_DIR/dist"
}

# ---------------- PM2 ----------------
start_backend() {
  info "启动/重启后端 (PM2)..."
  mkdir -p "$LOG_DIR"

  cd "$PROJECT_DIR"
  pm2 delete "$PM2_APP" >/dev/null 2>&1 || true
  pm2 start deploy/ecosystem.config.js
  pm2 save >/dev/null

  # 让 PM2 开机自启（首次会打印一条命令，无副作用）
  pm2 startup >/dev/null 2>&1 || true

  sleep 3
  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
    ok "后端健康检查通过：http://127.0.0.1:$BACKEND_PORT/health"
  else
    err "后端健康检查失败，请查看日志：pm2 logs $PM2_APP"
    pm2 logs "$PM2_APP" --lines 20 --nostream || true
    exit 1
  fi
}

# ---------------- Nginx ----------------
configure_nginx() {
  info "配置 Nginx..."

  local server_name="${DOMAIN:-_}"
  local root_dir="$FRONTEND_DIR/dist"

  sed -e "s|__SERVER_NAME__|$server_name|g" \
      -e "s|__ROOT__|$root_dir|g" \
      -e "s|__BACKEND__|127.0.0.1:$BACKEND_PORT|g" \
      "$PROJECT_DIR/deploy/nginx.conf.template" > "$NGINX_AVAILABLE"

  ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

  # 移除可能抢占 80 端口的默认站点
  if [[ -e /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
    info "已禁用 Nginx 默认站点（避免抢占 80 端口）"
  fi

  if ! nginx -t; then
    err "Nginx 配置校验失败"
    exit 1
  fi

  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx 2>/dev/null || systemctl restart nginx
    systemctl enable nginx >/dev/null 2>&1 || true
  else
    nginx -s reload
  fi
  ok "Nginx 已加载配置"
}

# ---------------- 防火墙提示 ----------------
firewall_hint() {
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    warn "检测到 ufw 已启用，请确认放行 80/443 端口："
    echo "  sudo ufw allow 80,443/tcp"
  fi
}

# ---------------- 数据库初始化提示 ----------------
db_hint() {
  local sql
  sql=$(ls "$BACKEND_DIR"/database/*.sql 2>/dev/null | head -1)
  if [[ -n "$sql" ]]; then
    info "如需初始化数据库结构："
    echo "  mysql -u root -p -e 'CREATE DATABASE IF NOT EXISTS campus_trade DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"
    echo "  mysql -u root -p campus_trade < $sql"
  fi
}

# ---------------- 输出访问地址 ----------------
print_urls() {
  local ip
  ip=$(curl -s --max-time 3 ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "服务器IP")

  echo ""
  echo "=================================================="
  echo -e "${GREEN}🎉 部署完成${NC}"
  echo "=================================================="
  if [[ -n "$DOMAIN" ]]; then
    echo -e "  访问地址:   ${GREEN}http://$DOMAIN${NC}"
  else
    echo -e "  访问地址:   ${GREEN}http://$ip${NC}"
  fi
  echo -e "  健康检查:   http://$ip/health"
  echo -e "  后端直连:   http://127.0.0.1:$BACKEND_PORT（仅本机，供 Nginx 反代）"
  echo ""
  echo -e "  前端产物:   $FRONTEND_DIR/dist"
  echo -e "  上传目录:   $BACKEND_DIR/uploads"
  echo -e "  环境配置:   $PROJECT_DIR/.env"
  echo ""
  echo -e "  常用命令："
  echo "    pm2 status                     # 进程状态"
  echo "    pm2 logs $PM2_APP              # 后端日志"
  echo "    pm2 restart $PM2_APP           # 重启后端"
  echo "    sudo nginx -t && sudo systemctl reload nginx"
  echo "    bash deploy/deploy-vps.sh update   # 更新代码后重新部署"
  echo ""
  echo -e "${YELLOW}  提示：测试账号 testuser / 123456${NC}"
  echo "=================================================="
}

# ---------------- 主流程 ----------------
cmd_install() {
  require_root
  check_deps
  ensure_env_file
  build_backend
  build_frontend
  start_backend
  configure_nginx
  firewall_hint
  db_hint
  print_urls
}

cmd_update() {
  require_root
  info "拉取最新代码..."
  cd "$PROJECT_DIR"
  if [[ -d .git ]]; then
    git pull --ff-only || warn "git pull 失败，请手动处理冲突"
  fi
  build_backend
  build_frontend
  start_backend
  configure_nginx
  ok "更新完成"
}

cmd_status() {
  echo "=== PM2 ==="
  pm2 status "$PM2_APP" 2>/dev/null || echo "后端未运行"
  echo ""
  echo "=== 健康检查 ==="
  curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" 2>/dev/null || echo "后端无响应"
  echo ""
  echo "=== Nginx ==="
  nginx -t 2>&1 | tail -2
  echo ""
  echo "=== 前端产物 ==="
  ls -la "$FRONTEND_DIR/dist/index.html" 2>/dev/null || echo "dist 不存在，请先构建"
}

cmd_logs()  { pm2 logs "$PM2_APP" --lines 100; }
cmd_restart() { require_root; start_backend; }

case "${1:-menu}" in
  install)  cmd_install ;;
  update)   cmd_update ;;
  status)   cmd_status ;;
  logs)     cmd_logs ;;
  restart)  cmd_restart ;;
  menu)
    echo "请选择操作："
    echo "  1) 首次部署 (install)"
    echo "  2) 更新部署 (update)"
    echo "  3) 查看状态 (status)"
    echo "  4) 查看日志 (logs)"
    read -rp "输入序号 [1]: " choice
    case "${choice:-1}" in
      1) cmd_install ;;
      2) cmd_update ;;
      3) cmd_status ;;
      4) cmd_logs ;;
      *) err "无效选项"; exit 1 ;;
    esac
    ;;
  *)
    sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
