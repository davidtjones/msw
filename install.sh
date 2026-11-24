#!/bin/sh
# Install msw by symlinking it (and the inputs and pxp configs) from this
# repo, so a `git pull` is all it takes to update.
#
# Usage: ./install.sh [bin-dir]    (default: ~/.local/bin)

set -eu

repo=$(cd "$(dirname "$0")" && pwd)
bin_dir=${1:-$HOME/.local/bin}
config_dir=${XDG_CONFIG_HOME:-$HOME/.config}/msw

mkdir -p "$bin_dir" "$config_dir"

ln -sf "$repo/msw" "$bin_dir/msw"
echo "linked $bin_dir/msw"

# Don't clobber a hand-edited config file.
for f in inputs pxp; do
    if [ -e "$config_dir/$f" ] && [ ! -L "$config_dir/$f" ]; then
        echo "kept existing $config_dir/$f (not a symlink; compare with $repo/$f)"
    else
        ln -sf "$repo/$f" "$config_dir/$f"
        echo "linked $config_dir/$f"
    fi
done

case ":$PATH:" in
    *":$bin_dir:"*) ;;
    *) echo "warning: $bin_dir is not on your PATH" ;;
esac

case $(uname -s) in
    Linux) tool=ddcutil ;;
    Darwin) tool=m1ddc ;;
    *) tool= ;;
esac
if [ -n "$tool" ] && ! command -v "$tool" >/dev/null; then
    echo "warning: $tool is not installed"
fi
