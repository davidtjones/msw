#!/bin/sh
# SwiftBar plugin for msw: a menu bar button that switches the monitor to
# TARGET, plus a submenu for the other inputs. Refreshes every 10 minutes
# (from the filename) and after each switch.
#
# Symlink this into your SwiftBar plugin folder. Change TARGET to taste.

TARGET=DP-1

# SwiftBar doesn't load your shell's PATH.
PATH=$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
export PATH

if [ "${1:-}" = switch ]; then
    exec msw "$2"
fi

# Menu bar icon
echo "| sfimage=display"
echo "---"
echo "Switch to $TARGET | bash='$0' param1=switch param2=$TARGET terminal=false refresh=true sfimage=arrow.right.circle"

cur=$(msw get 2>/dev/null) || cur="unavailable"
echo "Current: $cur | disabled=true"

echo "---"
echo "Other inputs"
# `msw ls` lines look like: "* DP-1     (0x0f)"
msw ls 2>/dev/null | awk '{ sub(/^\*/, " "); if (!seen[$1]++) print $1 }' | while read -r name; do
    [ "$name" = unknown ] && continue
    [ "$name" = "$TARGET" ] && continue
    echo "--$name | bash='$0' param1=switch param2=$name terminal=false refresh=true"
done
