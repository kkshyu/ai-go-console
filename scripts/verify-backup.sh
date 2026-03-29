#!/usr/bin/env bash
# ============================================================================
# 備份驗證腳本
# 用途：驗證備份檔案完整性與可還原性
# 使用方式：bash scripts/verify-backup.sh [OPTIONS]
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[VERIFY]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
pass()  { echo -e "${GREEN}[PASS]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; FAILURES=$((FAILURES + 1)); }

FAILURES=0
BACKUP_FILE=""
BACKUP_DIR=""
ENV="dev"
CHECK_ALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --backup-file)  BACKUP_FILE="$2"; shift 2 ;;
    --backup-dir)   BACKUP_DIR="$2"; shift 2 ;;
    --env)          ENV="$2"; shift 2 ;;
    --all)          CHECK_ALL=true; shift ;;
    --help|-h)
      echo "Usage: bash scripts/verify-backup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --backup-file <path>   驗證指定的 DB 備份檔"
      echo "  --backup-dir <path>    驗證指定目錄下所有備份"
      echo "  --env dev|prod         環境（預設 dev）"
      echo "  --all                  驗證 backups/ 下所有備份"
      exit 0
      ;;
    *) error "未知參數: $1" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 驗證單一 DB 備份檔 ─────────────────────────────────────────────────────
verify_db_backup() {
  local file="$1"
  local filename=$(basename "$file")

  info "驗證 DB 備份: $filename"

  # 1. 檔案存在且非空
  if [ ! -f "$file" ]; then
    fail "  檔案不存在: $file"
    return
  fi

  local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
  if [ "$size" -lt 100 ]; then
    fail "  檔案太小 (${size} bytes)，可能損壞"
    return
  fi
  pass "  檔案大小: $(echo "$size" | awk '{printf "%.2f MB", $1/1024/1024}')"

  # 2. gzip 完整性
  if echo "$file" | grep -q '\.gz$'; then
    if gunzip -t "$file" 2>/dev/null; then
      pass "  gzip 完整性: OK"
    else
      fail "  gzip 完整性: 損壞"
      return
    fi

    # 3. pg_restore --list 驗證
    if command -v pg_restore >/dev/null 2>&1; then
      local toc_count=$(gunzip -c "$file" | pg_restore --list 2>/dev/null | wc -l | tr -d ' ' || echo "0")
      if [ "$toc_count" -gt 0 ]; then
        pass "  pg_restore TOC: ${toc_count} 個物件"
      else
        # 可能是純 SQL 格式
        local line_count=$(gunzip -c "$file" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
        if [ "$line_count" -gt 10 ]; then
          pass "  SQL 行數: ${line_count} 行"
        else
          fail "  備份內容過少"
        fi
      fi
    else
      warn "  pg_restore 不可用，跳過內容驗證"
    fi
  fi

  # 4. 與前次備份比較大小
  local dir=$(dirname "$file")
  local prev_file=$(find "$dir" -name "aigo_${ENV}_*.sql.gz" -newer "$file" -not -name "$filename" 2>/dev/null | sort | head -1)
  if [ -z "$prev_file" ]; then
    prev_file=$(find "$dir" -name "aigo_${ENV}_*.sql.gz" -not -name "$filename" 2>/dev/null | sort -r | head -1)
  fi

  if [ -n "$prev_file" ] && [ -f "$prev_file" ]; then
    local prev_size=$(stat -f%z "$prev_file" 2>/dev/null || stat -c%s "$prev_file" 2>/dev/null || echo "0")
    if [ "$prev_size" -gt 0 ]; then
      local ratio=$(echo "$size $prev_size" | awk '{printf "%.0f", ($1/$2)*100}')
      if [ "$ratio" -lt 50 ]; then
        warn "  大小變化: ${ratio}% （比前次小很多，請確認）"
      elif [ "$ratio" -gt 200 ]; then
        warn "  大小變化: ${ratio}% （比前次大很多，請確認）"
      else
        pass "  大小變化: ${ratio}% (vs $(basename "$prev_file"))"
      fi
    fi
  fi
}

# ── 驗證 MinIO 備份 ────────────────────────────────────────────────────────
verify_minio_backup() {
  local dir="$1"
  local dirname=$(basename "$dir")

  info "驗證 MinIO 備份: $dirname"

  if [ ! -d "$dir" ]; then
    fail "  目錄不存在: $dir"
    return
  fi

  local file_count=$(find "$dir" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$file_count" -eq 0 ]; then
    warn "  備份為空（可能是空 bucket）"
  else
    pass "  檔案數量: $file_count"
  fi

  local total_size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
  pass "  總大小: $total_size"

  # 列出 bucket
  for bucket_dir in "$dir"/*/; do
    if [ -d "$bucket_dir" ]; then
      local bucket_name=$(basename "$bucket_dir")
      local bucket_files=$(find "$bucket_dir" -type f 2>/dev/null | wc -l | tr -d ' ')
      pass "  bucket/$bucket_name: $bucket_files 檔案"
    fi
  done
}

# ── 執行驗證 ────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  備份驗證報告"
echo "=========================================="
echo ""

if [ -n "$BACKUP_FILE" ]; then
  verify_db_backup "$BACKUP_FILE"
elif [ -n "$BACKUP_DIR" ]; then
  # 驗證目錄下所有 DB 備份
  for f in "$BACKUP_DIR"/aigo_*.sql.gz; do
    [ -f "$f" ] && verify_db_backup "$f"
  done
  # 驗證目錄下所有 MinIO 備份
  for d in "$BACKUP_DIR"/minio_*/; do
    [ -d "$d" ] && verify_minio_backup "$d"
  done
elif [ "$CHECK_ALL" = true ]; then
  BACKUPS_ROOT="$PROJECT_DIR/backups"

  if [ -d "$BACKUPS_ROOT/db" ]; then
    info "=== DB 備份 ==="
    for f in "$BACKUPS_ROOT/db"/aigo_*.sql.gz; do
      [ -f "$f" ] && verify_db_backup "$f"
    done
  else
    warn "無 DB 備份目錄: $BACKUPS_ROOT/db"
  fi

  echo ""

  if [ -d "$BACKUPS_ROOT/minio" ]; then
    info "=== MinIO 備份 ==="
    for d in "$BACKUPS_ROOT/minio"/minio_*/; do
      [ -d "$d" ] && verify_minio_backup "$d"
    done
  else
    warn "無 MinIO 備份目錄: $BACKUPS_ROOT/minio"
  fi

  echo ""

  if [ -d "$BACKUPS_ROOT/snapshots" ]; then
    info "=== 快照 ==="
    SNAPSHOT_COUNT=$(find "$BACKUPS_ROOT/snapshots" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    pass "  快照數量: $SNAPSHOT_COUNT"
    # 顯示最近 5 筆
    find "$BACKUPS_ROOT/snapshots" -name "*.json" -type f 2>/dev/null | sort -r | head -5 | while read -r f; do
      local fname=$(basename "$f")
      local fsize=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null || echo "0")
      info "  $fname ($(echo "$fsize" | awk '{printf "%.1f KB", $1/1024}'))"
    done
  fi
else
  echo "請指定驗證目標："
  echo "  --backup-file <path>   驗證指定的 DB 備份檔"
  echo "  --backup-dir <path>    驗證指定目錄下所有備份"
  echo "  --all                  驗證 backups/ 下所有備份"
  exit 1
fi

# ── 總結 ────────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
if [ "$FAILURES" -eq 0 ]; then
  echo -e "  ${GREEN}所有驗證通過${NC}"
else
  echo -e "  ${RED}${FAILURES} 項驗證失敗${NC}"
fi
echo "=========================================="

exit "$FAILURES"
