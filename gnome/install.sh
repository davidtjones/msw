#!/bin/sh
# Install the Monitor Switch GNOME extension by symlinking it into GNOME's
# extensions folder, so a `git pull` (plus logging out and back in) is all it
# takes to update. Also enables it.
#
# Usage: gnome/install.sh

set -eu

[ "$(uname -s)" = Linux ] || { echo "GNOME extension is Linux only" >&2; exit 1; }

here=$(cd "$(dirname "$0")" && pwd)
uuid=msw@davidtjones.github.io
dir=${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions

mkdir -p "$dir"
if [ -e "$dir/$uuid" ] && [ ! -L "$dir/$uuid" ]; then
    echo "$dir/$uuid exists and isn't a symlink; remove it and rerun" >&2
    exit 1
fi
ln -sfn "$here/$uuid" "$dir/$uuid"
echo "linked $dir/$uuid"

# `gnome-extensions enable` only works once GNOME has loaded the extension,
# which needs a new login. Before that, add it to the enabled list directly.
if gnome-extensions enable "$uuid" 2>/dev/null; then
    echo "enabled $uuid"
else
    list=$(gsettings get org.gnome.shell enabled-extensions)
    case $list in
        *"'$uuid'"*) ;;
        "@as []") gsettings set org.gnome.shell enabled-extensions "['$uuid']" ;;
        *) gsettings set org.gnome.shell enabled-extensions "${list%]}, '$uuid']" ;;
    esac
    echo "enabled $uuid; log out and back in to load it"
fi
