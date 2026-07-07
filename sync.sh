#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
SSH_ALIAS="Hive"
REMOTE_USER=$(ssh -q "$SSH_ALIAS" 'whoami' 2>/dev/null || echo "unknown")
REMOTE_HOME="/home/$REMOTE_USER"
APP_DIR="$REMOTE_HOME/hive-backend"
NGINX_CONF="hive.conf"

# ─── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
BG_CYAN='\033[46m\033[30m'
NC='\033[0m'

# ─── Menu Items ──────────────────────────────────────────────────────────────
MENU_ITEMS=(
  "Sync .env.production"
  "Deploy code (rsync)"
  "Install dependencies (remote)"
  "Restart PM2 services"
  "Reload Nginx config"
  "View PM2 logs"
  "Check server status"
  "SSH into server"
  "Exit"
)

MENU_ICONS=("📄" "🚀" "📦" "🔄" "🌐" "📋" "💚" "🖥️ " "👋")

# ─── Drawing ─────────────────────────────────────────────────────────────────
SELECTED=0

draw_menu() {
  clear
  echo ""
  echo -e "  ${BOLD}${CYAN}┌──────────────────────────────────────┐${NC}"
  echo -e "  ${BOLD}${CYAN}│${NC}  ${BOLD}⚡ ${SSH_ALIAS} Server Manager${NC}             ${BOLD}${CYAN}│${NC}"
  echo -e "  ${BOLD}${CYAN}│${NC}  ${DIM}$REMOTE_USER@$SSH_ALIAS → $APP_DIR${NC}"
  echo -e "  ${BOLD}${CYAN}├──────────────────────────────────────┤${NC}"
  echo ""

  for i in "${!MENU_ITEMS[@]}"; do
    if [[ $i -eq $SELECTED ]]; then
      echo -e "  ${BG_CYAN} ▸ ${MENU_ICONS[$i]} ${MENU_ITEMS[$i]} ${NC}"
    else
      echo -e "    ${DIM}${MENU_ICONS[$i]} ${MENU_ITEMS[$i]}${NC}"
    fi
  done

  echo ""
  echo -e "  ${BOLD}${CYAN}└──────────────────────────────────────┘${NC}"
  echo -e "  ${DIM}↑↓ navigate  ⏎ select  q quit${NC}"
  echo ""
}

# ─── Task Runners ────────────────────────────────────────────────────────────
run_header() {
  echo ""
  echo -e "  ${BOLD}${YELLOW}▶ $1${NC}"
  echo -e "  ${DIM}─────────────────────────────────────${NC}"
}

run_footer_ok() {
  echo ""
  echo -e "  ${GREEN}✔ $1${NC}"
}

run_footer_err() {
  echo ""
  echo -e "  ${RED}✖ $1${NC}"
}

pause() {
  echo ""
  echo -e "  ${DIM}Press any key to return...${NC}"
  read -rsn1
}

# ── 1. Sync env ──────────────────────────────────────────────────────────────
sync_env() {
  run_header "Syncing .env.production → $APP_DIR/"
  if scp .env.production "$SSH_ALIAS:$APP_DIR/.env.production"; then
    run_footer_ok "Environment file synced"
  else
    run_footer_err "Failed to sync .env.production"
  fi
  pause
}

# ── 2. Deploy code ──────────────────────────────────────────────────────────
deploy_code() {
  run_header "Deploying code via rsync"
  rsync -avz --delete \
    --exclude '.env' --exclude '.env.*' --exclude '*.env' \
    --exclude 'logs' --exclude 'node_modules' --exclude '.github' \
    --exclude '.secrets' --exclude '.git' \
    ./ "$SSH_ALIAS:$APP_DIR/"
  run_footer_ok "Code deployed"
  pause
}

# ── 3. Install deps ─────────────────────────────────────────────────────────
install_deps() {
  run_header "Installing dependencies on remote"
  ssh -t "$SSH_ALIAS" "cd $APP_DIR && export BUN_INSTALL=\"\$HOME/.bun\" && export PATH=\"\$BUN_INSTALL/bin:\$PATH\" && bun install --frozen-lockfile"
  run_footer_ok "Dependencies installed"
  pause
}

# ── 4. Restart PM2 ──────────────────────────────────────────────────────────
restart_pm2() {
  run_header "Restarting PM2 services"
  ssh -t "$SSH_ALIAS" "cd $APP_DIR && export BUN_INSTALL=\"\$HOME/.bun\" && export PATH=\"\$BUN_INSTALL/bin:\$PATH\" && bunx pm2 restart ecosystem.config.cjs || bunx pm2 start ecosystem.config.cjs"
  run_footer_ok "PM2 services restarted"
  pause
}

# ── 5. Reload Nginx ─────────────────────────────────────────────────────────
reload_nginx() {
  run_header "Reloading Nginx configuration"
  scp ${NGINX_CONF} "$SSH_ALIAS:~/${NGINX_CONF}" && ssh -t "$SSH_ALIAS" "sudo cp ~/${NGINX_CONF} /etc/nginx/conf.d/${NGINX_CONF} && sudo nginx -t && sudo systemctl reload nginx"
  run_footer_ok "Nginx config reloaded"
  pause
}

# ── 6. PM2 logs ─────────────────────────────────────────────────────────────
view_logs() {
  run_header "Streaming PM2 logs (Ctrl+C to stop)"
  ssh -t "$SSH_ALIAS" "export BUN_INSTALL=\"\$HOME/.bun\" && export PATH=\"\$BUN_INSTALL/bin:\$PATH\" && cd $APP_DIR && bunx pm2 logs --lines 50"
  pause
}

# ── 7. Server status ────────────────────────────────────────────────────────
check_status() {
  run_header "Server Status"
  echo ""
  echo -e "  ${CYAN}PM2 Processes:${NC}"
  ssh -t "$SSH_ALIAS" "export BUN_INSTALL=\"\$HOME/.bun\" && export PATH=\"\$BUN_INSTALL/bin:\$PATH\" && bunx pm2 list" 2>/dev/null
  echo ""
  echo -e "  ${CYAN}Nginx:${NC}"
  ssh "$SSH_ALIAS" "sudo systemctl is-active nginx" 2>/dev/null && echo -e "  ${GREEN}● running${NC}" || echo -e "  ${RED}● stopped${NC}"
  echo ""
  echo -e "  ${CYAN}Disk / Memory:${NC}"
  ssh "$SSH_ALIAS" "df -h / | tail -1 | awk '{print \"  Disk: \" \$3 \"/\" \$2 \" (\" \$5 \" used)\"}'; free -h | awk '/Mem:/{print \"  RAM:  \" \$3 \"/\" \$2 \" used\"}'"
  pause
}

# ── 8. SSH in ────────────────────────────────────────────────────────────────
ssh_into() {
  run_header "Opening SSH session (type 'exit' to return)"
  ssh -t "$SSH_ALIAS"
  pause
}

# ─── Input Handler ───────────────────────────────────────────────────────────
handle_selection() {
  case $SELECTED in
    0) sync_env ;;
    1) deploy_code ;;
    2) install_deps ;;
    3) restart_pm2 ;;
    4) reload_nginx ;;
    5) view_logs ;;
    6) check_status ;;
    7) ssh_into ;;
    8) clear; echo -e "\n  ${CYAN}👋 See ya!${NC}\n"; exit 0 ;;
  esac
}

# ─── Main Loop ───────────────────────────────────────────────────────────────
LAST_IDX=$(( ${#MENU_ITEMS[@]} - 1 ))

while true; do
  draw_menu

  # Read a single keypress
  IFS= read -rsn1 key

  # Handle escape sequences (arrow keys)
  if [[ "$key" == $'\x1b' ]]; then
    read -rsn2 -t 0.1 rest
    key+="$rest"
  fi

  case "$key" in
    $'\x1b[A' | k)  # Up arrow or k
      (( SELECTED = SELECTED > 0 ? SELECTED - 1 : LAST_IDX ))
      ;;
    $'\x1b[B' | j)  # Down arrow or j
      (( SELECTED = SELECTED < LAST_IDX ? SELECTED + 1 : 0 ))
      ;;
    "")  # Enter
      handle_selection
      ;;
    q)
      clear
      echo -e "\n  ${CYAN}👋 See ya!${NC}\n"
      exit 0
      ;;
  esac
done
