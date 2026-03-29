#!/usr/bin/env bash
# ============================================================================
# MinIO 備份腳本
# 用途：備份 MinIO 上的所有 bucket 資料
# 使用方式：bash scripts/backup-minio.sh [OPTIONS]
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { [ "$QUIET" = true ] || echo -e "${GREEN}[MINIO-BACKUP]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

ENV="dev"
OUTPUT_DIR=""
RETENTION_DAYS=7
QUIET=false
TARGET_BUCKET=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)             ENV="$2"; shift 2 ;;
    --output-dir)      OUTPUT_DIR="$2"; shift 2 ;;
    --retention-days)  RETENTION_DAYS="$2"; shift 2 ;;
    --bucket)          TARGET_BUCKET="$2"; shift 2 ;;
    --quiet)           QUIET=true; shift ;;
    --help|-h)
      echo "Usage: bash scripts/backup-minio.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --env dev|prod            環境（預設 dev）"
      echo "  --output-dir <path>       備份輸出目錄"
      echo "  --retention-days <n>      備份保留天數（預設 7）"
      echo "  --bucket <name>           只備份指定 bucket"
      echo "  --quiet                   減少輸出"
      exit 0
      ;;
    *) error "未知參數: $1" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$OUTPUT_DIR" ]; then
  OUTPUT_DIR="$PROJECT_DIR/backups/minio"
fi
mkdir -p "$OUTPUT_DIR"

# 載入環境變數
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

MINIO_URL="${BUILTIN_MINIO_URL:-http://localhost:9000}"
MINIO_USER="${BUILTIN_MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${BUILTIN_MINIO_ROOT_PASSWORD:-minioadmin}"

# 確認 mc 可用
if ! command -v mc >/dev/null 2>&1; then
  # 嘗試透過 k8s exec 備份
  info "mc 未安裝，嘗試透過 k8s exec 備份..."

  POD_NAME=$(kubectl get pods -n aigo-system -l app=builtin-minio -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  if [ -z "$POD_NAME" ]; then
    error "mc 未安裝且 MinIO Pod 不可用。請安裝 mc: brew install minio/stable/mc"
  fi

  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  BACKUP_NAME="minio_${ENV}_${TIMESTAMP}"

  # 列出 bucket
  BUCKETS=$(kubectl exec -n aigo-system "$POD_NAME" -- mc ls local/ 2>/dev/null | awk '{print $NF}' | tr -d '/')

  for bucket in $BUCKETS; do
    if [ -n "$TARGET_BUCKET" ] && [ "$bucket" != "$TARGET_BUCKET" ]; then
      continue
    fi
    info "備份 bucket: $bucket"
    BUCKET_DIR="${OUTPUT_DIR}/${BACKUP_NAME}/${bucket}"
    mkdir -p "$BUCKET_DIR"

    # 透過 kubectl cp 逐檔複製（效率較低但通用）
    kubectl exec -n aigo-system "$POD_NAME" -- mc ls "local/${bucket}/" --recursive 2>/dev/null | while read -r line; do
      FILE_PATH=$(echo "$line" | awk '{print $NF}')
      if [ -n "$FILE_PATH" ]; then
        DIR=$(dirname "${BUCKET_DIR}/${FILE_PATH}")
        mkdir -p "$DIR"
        kubectl exec -n aigo-system "$POD_NAME" -- mc cat "local/${bucket}/${FILE_PATH}" > "${BUCKET_DIR}/${FILE_PATH}" 2>/dev/null || true
      fi
    done
    info "  $bucket → $BUCKET_DIR"
  done

  info "MinIO 備份完成: ${OUTPUT_DIR}/${BACKUP_NAME}"
  exit 0
fi

# 使用 mc 備份
ALIAS_NAME="aigo-backup-src"
mc alias set "$ALIAS_NAME" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS" --api S3v4 2>/dev/null

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="minio_${ENV}_${TIMESTAMP}"
BACKUP_DIR="${OUTPUT_DIR}/${BACKUP_NAME}"
mkdir -p "$BACKUP_DIR"

info "開始備份 MinIO..."
info "  來源: $MINIO_URL"
info "  目標: $BACKUP_DIR"

# 列出並同步所有 bucket
BUCKETS=$(mc ls "$ALIAS_NAME/" 2>/dev/null | awk '{print $NF}' | tr -d '/')

for bucket in $BUCKETS; do
  if [ -n "$TARGET_BUCKET" ] && [ "$bucket" != "$TARGET_BUCKET" ]; then
    continue
  fi
  info "  同步 bucket: $bucket"
  mkdir -p "${BACKUP_DIR}/${bucket}"
  mc mirror "$ALIAS_NAME/${bucket}" "${BACKUP_DIR}/${bucket}" --overwrite 2>/dev/null || \
    warn "  $bucket 同步失敗（可能為空 bucket）"
done

# 計算備份大小
if command -v du >/dev/null 2>&1; then
  TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
  info "備份完成: $TOTAL_SIZE"
fi

# 清理過期備份
info "清理過期備份..."
find "$OUTPUT_DIR" -maxdepth 1 -name "minio_${ENV}_*" -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null && \
  info "  已清理超過 ${RETENTION_DAYS} 天的備份" || true

BACKUP_COUNT=$(find "$OUTPUT_DIR" -maxdepth 1 -name "minio_${ENV}_*" -type d 2>/dev/null | wc -l | tr -d ' ')
info "目前共有 ${BACKUP_COUNT} 個 MinIO 備份"

echo "$BACKUP_DIR"
