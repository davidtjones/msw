#!/bin/sh
# SwiftBar plugin for msw: a menu bar button that switches the monitor to
# TARGET, a submenu for the other inputs, and PIP/PBP controls on monitors
# that support them. Refreshes every 10 minutes (from the filename) and after
# each action.
#
# Symlink this into your SwiftBar plugin folder. Change TARGET to taste.

TARGET=DP-1

# SwiftBar doesn't load your shell's PATH.
PATH=$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
export PATH

# Menu items run this script again with "msw <args>".
if [ "${1:-}" = msw ]; then
    shift
    exec msw "$@"
fi

# action <msw args...> -> SwiftBar attributes that run `msw <args>`
action() {
    printf "bash='%s' param1=msw" "$0"
    n=2
    for a in "$@"; do
        printf ' param%d=%s' "$n" "$a"
        n=$((n + 1))
    done
    printf ' terminal=false refresh=true'
}

# `msw ls` and `msw layouts` lines look like "* linux (0x0f, DP-1)": a "*"
# for the current one, then a name and the hex value.

# entry_name <line> -> "linux"; unnamed inputs give their raw value, "0x13"
entry_name() {
    en=${1#??}
    en=${en% (0x*}
    if [ "$en" = unknown ]; then echo "0x$(hex_of "$1")"; else echo "$en"; fi
}

# hex_of <line or label> -> "0f"
hex_of() {
    h=${1##*(0x}
    echo "${h%%[,)]*}"
}

# layout_title "pbp 50" -> "PBP 50", "off" -> "Off"
layout_title() {
    case $1 in
        *' '*) printf '%s %s\n' "$(echo "${1%% *}" | tr '[:lower:]' '[:upper:]')" "${1#* }" ;;
        off) echo Off ;;
        *) echo "$1" ;;
    esac
}

# Menu bar icon
echo "| sfimage=display"
echo "---"
echo "Switch to $TARGET | $(action "$TARGET") sfimage=arrow.right.circle"

inputs=$(msw ls 2>/dev/null) || inputs=
main=$(printf '%s\n' "$inputs" | sed -n 's/^\* //p')
echo "Current: ${main:-unavailable} | disabled=true"

echo "---"
echo "Other inputs"
printf '%s\n' "$inputs" | while IFS= read -r line; do
    [ -n "$line" ] || continue
    name=$(entry_name "$line")
    [ "$name" = "$TARGET" ] && continue
    echo "--$name | $(action "$name")"
done

# PIP/PBP. With no pxp config only "off" is listed, so skip it all.
layouts=$(msw layouts 2>/dev/null) || layouts=
[ "$(printf '%s\n' "$layouts" | grep -c .)" -gt 1 ] || exit 0

cur_layout=$(printf '%s\n' "$layouts" | sed -n 's/^\* //p')
cur_layout=${cur_layout% (0x*}

echo "---"
echo "Layout: $(layout_title "${cur_layout:-unknown}")"
printf '%s\n' "$layouts" | while IFS= read -r line; do
    name=${line#??}
    name=${name% (0x*}
    [ "$name" = unknown ] && continue
    checked=
    case $line in '*'*) checked=' checked=true' ;; esac
    # Unquoted on purpose: "pbp 50" becomes the two arguments pbp and 50.
    # shellcheck disable=SC2086
    echo "--$(layout_title "$name") | $(action $name)$checked"
done

second=$(msw get second 2>/dev/null) || second=
if [ -n "$second" ]; then
    echo "Second input: $(entry_name "  $second")"
    printf '%s\n' "$inputs" | while IFS= read -r line; do
        # The main input can't also be the second one.
        case $line in ''|'*'*) continue ;; esac
        name=$(entry_name "$line")
        checked=
        [ "$(hex_of "$line")" = "$(hex_of "$second")" ] && checked=' checked=true'
        echo "--$name | $(action second "$name")$checked"
    done
fi

if [ -n "$cur_layout" ] && [ "$cur_layout" != off ]; then
    echo "Swap inputs | $(action swap)"
fi
