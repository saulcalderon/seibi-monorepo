#!/usr/bin/env bash
# Drive Seibi Dev (the development variant of apps/mobile) on the iOS
# Simulator or the Android emulator with Maestro, and keep the evidence.
#
#   verify.sh launch  ios|android [--rebuild]   boot the device, install Seibi Dev, start Metro
#   verify.sh doctor  ios|android               read-only: is this instance worth driving?
#   verify.sh drive   ios|android <flow>        run flows/<flow>.yaml, record video + screenshots
#   verify.sh cleanup [ios|android|all]         stop what launch started (all: Metro too); evidence stays
#   verify.sh where                             print the evidence root
#
# Environment (all optional):
#   SEIBI_VERIFY_PORT      Metro port (default 8081). One Metro per port.
#   SEIBI_VERIFY_EVIDENCE  evidence root (default ~/seibi-verify), outside git
#   SEIBI_VERIFY_AVD       Android Virtual Device (default seibi-pixel)
#   SEIBI_VERIFY_EMU_PORT  emulator console port (default 5560 -> serial emulator-5560)
#   SEIBI_VERIFY_SIM       iOS Simulator name (default "Seibi Verify"), created if missing
#   MAESTRO_BIN            Maestro CLI (default: maestro on PATH, else ~/.maestro/bin/maestro)
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$(cd "$SKILL_DIR/../../.." && pwd)"
FLOWS_DIR="$SKILL_DIR/flows"

APP_ID="com.seibiapp.app.dev"
DEV_CLIENT_SCHEME="exp+seibi"
PORT="${SEIBI_VERIFY_PORT:-8081}"
EVIDENCE_ROOT="${SEIBI_VERIFY_EVIDENCE:-$HOME/seibi-verify}"
AVD="${SEIBI_VERIFY_AVD:-seibi-pixel}"
EMU_PORT="${SEIBI_VERIFY_EMU_PORT:-5560}"
SERIAL="emulator-$EMU_PORT"
SIM_NAME="${SEIBI_VERIFY_SIM:-Seibi Verify}"
SIM_TYPE="iPhone 17"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR="$ANDROID_HOME/emulator/emulator"
STATE_DIR="${TMPDIR:-/tmp}/seibi-verify-$PORT"

if [[ -n "${MAESTRO_BIN:-}" ]]; then MAESTRO="$MAESTRO_BIN"
elif command -v maestro >/dev/null 2>&1; then MAESTRO="$(command -v maestro)"
else MAESTRO="$HOME/.maestro/bin/maestro"; fi

# Metro must serve this checkout's apps/mobile as Seibi Dev, nothing else.
EXPECTED_METRO="Seibi Dev|seibi|$APP_DIR"

export EXPO_PUBLIC_APP_VARIANT=development
mkdir -p "$STATE_DIR"

log() { printf '[verify] %s\n' "$*" >&2; }
die() { printf '[verify] FAIL: %s\n' "$*" >&2; exit 1; }

platform_arg() {
  case "${1:-}" in ios|android) echo "$1" ;; *) die "platform must be ios or android" ;; esac
}

# --- iOS Simulator -----------------------------------------------------------

sim_udid() {
  xcrun simctl list devices available -j | python3 -c '
import json, sys
name = sys.argv[1]
for runtime, devices in json.load(sys.stdin)["devices"].items():
    if "iOS" not in runtime: continue
    for d in devices:
        if d["name"] == name: print(d["udid"]); sys.exit(0)
' "$SIM_NAME"
}

sim_state() {
  xcrun simctl list devices -j | python3 -c '
import json, sys
for devices in json.load(sys.stdin)["devices"].values():
    for d in devices:
        if d["udid"] == sys.argv[1]: print(d["state"]); sys.exit(0)
' "$1"
}

# Prints the simulator's UDID and nothing else on stdout; everything else goes to stderr.
ensure_sim() {
  local udid runtime
  udid="$(sim_udid || true)"
  if [[ -z "$udid" ]]; then
    runtime="$(xcrun simctl list runtimes available -j | python3 -c '
import json, sys
ios = [r for r in json.load(sys.stdin)["runtimes"] if r["platform"] == "iOS" and r["isAvailable"]]
print(ios[-1]["identifier"] if ios else "")')"
    [[ -n "$runtime" ]] || die "no iOS Simulator runtime installed. Run: xcodebuild -downloadPlatform iOS"
    log "creating simulator \"$SIM_NAME\" ($SIM_TYPE, $runtime)"
    udid="$(xcrun simctl create "$SIM_NAME" "$SIM_TYPE" "$runtime")"
    # A new iOS 27 simulator ignores dark-mode changes until it has rebooted once.
    log "first boot of the new simulator, then a restart"
    xcrun simctl boot "$udid" >&2
    xcrun simctl bootstatus "$udid" -b >/dev/null
    xcrun simctl shutdown "$udid" >&2
  fi
  if [[ "$(sim_state "$udid")" != "Booted" ]]; then
    log "booting simulator $udid"
    xcrun simctl boot "$udid" >&2
    echo "$udid" > "$STATE_DIR/sim-booted-by-us"
  fi
  xcrun simctl bootstatus "$udid" -b >/dev/null
  # Show the device for anyone watching; Maestro does not need the window.
  open -a "$(xcode-select -p)/Applications/Simulator.app" --args -CurrentDeviceUDID "$udid" >&2 2>/dev/null || true
  # Pre-approve the dev client scheme, so opening it shows no "Open in Seibi Dev?" prompt.
  local plist="$HOME/Library/Developer/CoreSimulator/Devices/$udid/data/Library/Preferences/com.apple.launchservices.schemeapproval.plist"
  local key="com.apple.CoreSimulator.CoreSimulatorBridge-->$DEV_CLIENT_SCHEME"
  /usr/libexec/PlistBuddy -c "Set :'$key' $APP_ID" "$plist" >/dev/null 2>&1 \
    || /usr/libexec/PlistBuddy -c "Add :'$key' string $APP_ID" "$plist" >/dev/null 2>&1
  echo "$udid"
}

# --- Android emulator --------------------------------------------------------

emu_running() { "$ADB" devices 2>/dev/null | grep -q "^$SERIAL[[:space:]]*device"; }

ensure_emulator() {
  if ! emu_running; then
    "$EMULATOR" -list-avds | grep -qx "$AVD" || die "AVD $AVD not found (emulator -list-avds)"
    log "starting emulator $AVD as $SERIAL"
    ( set -m; nohup "$EMULATOR" -avd "$AVD" -port "$EMU_PORT" -no-snapshot-save -no-boot-anim -no-audio \
        > "$STATE_DIR/emulator.log" 2>&1 < /dev/null & echo $! > "$STATE_DIR/emulator.pid" ) >/dev/null 2>&1
  fi
  "$ADB" -s "$SERIAL" wait-for-device
  local i
  for i in $(seq 1 180); do
    [[ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && break
    sleep 1
  done
  [[ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed | tr -d '\r')" == "1" ]] || die "emulator did not finish booting"
  "$ADB" -s "$SERIAL" reverse "tcp:$PORT" "tcp:$PORT" >/dev/null
}

# --- Metro -------------------------------------------------------------------

metro_status() { curl -s --max-time 2 "http://localhost:$PORT/status" || true; }

# Prints "<name>|<slug>|<project root>" from the dev server's manifest.
metro_identity() {
  curl -s --max-time 10 -H "expo-platform: ${1:-ios}" -H 'accept: application/expo+json,application/json' \
    "http://localhost:$PORT" | python3 -c '
import json, sys
try:
    m = json.load(sys.stdin)
except Exception:
    print("unreadable|"); sys.exit(0)
c = (m.get("extra") or {}).get("expoClient") or m
root = (c.get("_internal") or {}).get("projectRoot")
print("%s|%s|%s" % (c.get("name"), c.get("slug"), root))'
}

ensure_metro() {
  if [[ "$(metro_status)" == "packager-status:running" ]]; then
    [[ "$(metro_identity)" == "$EXPECTED_METRO" ]] || die "port $PORT serves something else ($(metro_identity)); set SEIBI_VERIFY_PORT"
    log "Metro already running on $PORT"
    return
  fi
  log "starting Metro on $PORT (log: $STATE_DIR/metro.log)"
  # Own process group (set -m), no inherited stdio: the caller's pipe closes when launch ends.
  ( cd "$APP_DIR" || exit 1; set -m
    nohup ./node_modules/.bin/expo start --port "$PORT" > "$STATE_DIR/metro.log" 2>&1 < /dev/null & ) >/dev/null 2>&1
  local i
  for i in $(seq 1 120); do [[ "$(metro_status)" == "packager-status:running" ]] && break; sleep 1; done
  [[ "$(metro_status)" == "packager-status:running" ]] || die "Metro did not start; see $STATE_DIR/metro.log"
  # Record the process that owns the port (the package-manager shim may not be it).
  metro_listener > "$STATE_DIR/metro.pid"
}

metro_listener() { lsof -t -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1; }

# Bundle once before driving, so the flow does not wait on a cold Metro cache.
warm_bundle() {
  local url
  url="$(curl -s --max-time 30 -H "expo-platform: $1" -H 'accept: application/expo+json,application/json' \
    "http://localhost:$PORT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["launchAsset"]["url"])')"
  log "warming the $1 bundle"
  curl -s --max-time 600 -o /dev/null "$url" || die "Metro failed to bundle for $1; see $STATE_DIR/metro.log"
}

# The link that cold-starts Seibi Dev on this Metro, without the dev menu's
# onboarding, floating button or auto-opened menu. Same format Expo CLI
# (SDK 58) opens. localhost works on both: the simulator shares the Mac's
# network, and launch maps the port into the emulator with adb reverse.
dev_url() {
  local enc
  enc="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "http://localhost:$PORT")"
  echo "$DEV_CLIENT_SCHEME://?__expo_url=$enc&__expo_disable_fab=1&__expo_disable_auto_launch=1&__expo_disable_onboarding=1"
}

# --- Commands ----------------------------------------------------------------

cmd_launch() {
  local platform rebuild="" udid
  platform="$(platform_arg "${1:-}")"; [[ "${2:-}" == "--rebuild" ]] && rebuild=1
  if [[ "$platform" == ios ]]; then
    udid="$(ensure_sim)"
    if [[ -n "$rebuild" ]] || ! xcrun simctl get_app_container "$udid" "$APP_ID" >/dev/null 2>&1; then
      log "building and installing Seibi Dev on $udid (first build takes several minutes)"
      ( cd "$APP_DIR" && ./node_modules/.bin/expo run:ios --device "$udid" --no-bundler ) > "$STATE_DIR/build-ios.log" 2>&1 \
        || die "iOS build failed; see $STATE_DIR/build-ios.log"
    fi
  else
    ensure_emulator
    if [[ -n "$rebuild" ]] || ! "$ADB" -s "$SERIAL" shell pm path "$APP_ID" 2>/dev/null | grep -q package:; then
      log "building and installing Seibi Dev on $SERIAL (first build takes several minutes)"
      ( cd "$APP_DIR" && ANDROID_SERIAL="$SERIAL" ./node_modules/.bin/expo run:android --device "$AVD" --no-bundler ) \
        > "$STATE_DIR/build-android.log" 2>&1 || die "Android build failed; see $STATE_DIR/build-android.log"
    fi
  fi
  ensure_metro
  warm_bundle "$platform"
  cmd_doctor "$platform"
}

cmd_doctor() {
  local platform ok=1 udid
  platform="$(platform_arg "${1:-}")"
  echo "app dir:   $APP_DIR"
  echo "git:       $(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null) @ $(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null)"
  if [[ -x "$MAESTRO" ]]; then echo "maestro:   $("$MAESTRO" --version 2>/dev/null | tail -1) ($MAESTRO)"
  else echo "maestro:   MISSING ($MAESTRO)"; ok=0; fi
  if [[ "$(metro_status)" == "packager-status:running" ]]; then
    echo "metro:     running on $PORT, serves $(metro_identity "$platform")"
    [[ "$(metro_identity "$platform")" == "$EXPECTED_METRO" ]] || { echo "           expected $EXPECTED_METRO"; ok=0; }
    if [[ -f "$STATE_DIR/metro.pid" ]]; then echo "           started by verify.sh (pid $(cat "$STATE_DIR/metro.pid"))"
    else echo "           not started by verify.sh: do not drive it unless it is yours"; fi
  else echo "metro:     NOT running on $PORT"; ok=0; fi
  if [[ "$platform" == ios ]]; then
    udid="$(sim_udid || true)"
    if [[ -n "$udid" && "$(sim_state "$udid")" == "Booted" ]]; then
      echo "simulator: \"$SIM_NAME\" $udid booted"
      if xcrun simctl get_app_container "$udid" "$APP_ID" >/dev/null 2>&1; then
        echo "app:       $APP_ID installed ($(/usr/libexec/PlistBuddy -c 'Print :CFBundleDisplayName' "$(xcrun simctl get_app_container "$udid" "$APP_ID")/Info.plist"))"
      else echo "app:       $APP_ID NOT installed"; ok=0; fi
    else echo "simulator: \"$SIM_NAME\" not booted"; ok=0; fi
  else
    if emu_running; then
      echo "emulator:  $SERIAL ($("$ADB" -s "$SERIAL" emu avd name 2>/dev/null | head -1 | tr -d '\r')) booted"
      if "$ADB" -s "$SERIAL" shell pm path "$APP_ID" 2>/dev/null | grep -q package:; then echo "app:       $APP_ID installed"
      else echo "app:       $APP_ID NOT installed"; ok=0; fi
      "$ADB" -s "$SERIAL" reverse --list | grep -q "tcp:$PORT" && echo "reverse:   tcp:$PORT -> host" \
        || { echo "reverse:   tcp:$PORT MISSING"; ok=0; }
    else echo "emulator:  $SERIAL not running"; ok=0; fi
  fi
  if [[ "$ok" == 1 ]]; then echo "doctor:    OK"; else echo "doctor:    NOT READY (run: verify.sh launch $platform)"; return 1; fi
}

cmd_drive() {
  local platform flow device run_dir status=0
  platform="$(platform_arg "${1:-}")"; flow="${2:-}"
  [[ -f "$FLOWS_DIR/$flow.yaml" ]] || die "no flow $FLOWS_DIR/$flow.yaml"
  if [[ "$platform" == ios ]]; then device="$(sim_udid)"; else device="$SERIAL"; fi
  run_dir="$EVIDENCE_ROOT/$(date +%Y%m%d-%H%M%S)-$flow-$platform"
  mkdir -p "$run_dir"
  cmd_doctor "$platform" > "$run_dir/doctor.txt" || { cat "$run_dir/doctor.txt"; die "doctor failed; see above"; }
  log "driving $flow on $platform; evidence: $run_dir"
  "$MAESTRO" test --device "$device" --no-ansi "$FLOWS_DIR/$flow.yaml" \
    -e APP_ID="$APP_ID" -e DEV_URL="$(dev_url)" \
    --test-output-dir "$run_dir" --debug-output "$run_dir/debug" \
    --format junit --output "$run_dir/report.xml" 2>&1 | tee "$run_dir/maestro.log" || status=1
  echo "evidence:  $run_dir"
  # Maestro nests artifacts as <run>/<timestamp>/<flow name>/{startRecording,takeScreenshot}/.
  find "$run_dir" \( -name '*.mp4' -o -name '*.png' \) -not -path "$run_dir/debug/*" -print | sed 's/^/  /'
  find "$run_dir" -name '*.mp4' -not -path "$run_dir/debug/*" | grep -q . || { log "no video was recorded"; status=1; }
  [[ "$status" == 0 ]] && echo "result:    PASS" || echo "result:    FAIL"
  return "$status"
}

cmd_cleanup() {
  local which="${1:-all}" pid pgid udid i
  # Metro serves both platforms, so only a full cleanup stops it.
  if [[ "$which" == all && -f "$STATE_DIR/metro.pid" ]]; then
    pid="$(cat "$STATE_DIR/metro.pid")"
    if [[ -n "$pid" && "$(metro_listener)" == "$pid" ]]; then
      pgid="$(ps -o pgid= -p "$pid" | tr -d ' ')"
      log "stopping Metro (pid $pid, process group $pgid)"
      kill -TERM -- "-$pgid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      for i in $(seq 1 10); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
      kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
    else
      log "Metro pid $pid no longer owns port $PORT; nothing to stop"
    fi
    rm -f "$STATE_DIR/metro.pid"
  fi
  if [[ "$which" == all || "$which" == android ]]; then
    "$ADB" -s "$SERIAL" reverse --remove "tcp:$PORT" >/dev/null 2>&1 || true
    if [[ -f "$STATE_DIR/emulator.pid" ]]; then
      log "stopping emulator $SERIAL"
      "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1 || kill -TERM "$(cat "$STATE_DIR/emulator.pid")" 2>/dev/null || true
      rm -f "$STATE_DIR/emulator.pid"
    fi
  fi
  if [[ "$which" == all || "$which" == ios ]] && [[ -f "$STATE_DIR/sim-booted-by-us" ]]; then
    udid="$(cat "$STATE_DIR/sim-booted-by-us")"
    log "shutting down simulator $udid"
    xcrun simctl shutdown "$udid" 2>/dev/null || true
    rm -f "$STATE_DIR/sim-booted-by-us"
  fi
  log "evidence kept in $EVIDENCE_ROOT"
}

case "${1:-}" in
  launch) shift; cmd_launch "$@" ;;
  doctor) shift; cmd_doctor "$@" ;;
  drive) shift; cmd_drive "$@" ;;
  cleanup) shift; cmd_cleanup "$@" ;;
  where) echo "$EVIDENCE_ROOT" ;;
  *) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 2 ;;
esac
