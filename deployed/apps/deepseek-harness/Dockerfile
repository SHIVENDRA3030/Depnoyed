# Depnoyed marketplace image for DeepSeek Harness.
#
# Base: community image smanx/deepseek-harness:0.1.1-rc.2 (pinned; newer
# dsh releases crash-loop, see app readme). dsh's HMR plugin needs Node
# internals; the bundled node-addon-require-builtin prebuilt fails to load
# on this base image's Node v24.20, so we launch dsh with
# `node --expose-internals` (direct-require path) instead of the bare `dsh`
# bin, whose shebang starts plain node.
FROM smanx/deepseek-harness:0.1.1-rc.2
RUN sed -i 's|^dsh web --port|node --expose-internals /usr/local/lib/node_modules/@deepseek-ai/dsh/lib/bin.js web --port|' /app/entrypoint.sh
