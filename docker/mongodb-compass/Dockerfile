# MongoDB Compass with noVNC
# Based on Ubuntu with X11, VNC, and noVNC

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:1 \
    VNC_PORT=5901 \
    NOVNC_PORT=6080 \
    COMPASS_VERSION=1.42.4

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg2 \
    ca-certificates \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    openbox \
    dbus-x11 \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libuuid1 \
    libappindicator3-1 \
    libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

# Download and install MongoDB Compass
RUN wget -q https://downloads.mongodb.com/compass/mongodb-compass__amd64.deb -O /tmp/compass.deb \
    && dpkg -i /tmp/compass.deb || apt-get install -f -y \
    && rm /tmp/compass.deb

# Create startup script
RUN cat > /start.sh << 'EOF'
#!/bin/bash
set -e

# Start Xvfb
Xvfb :1 -screen 0 1920x1080x24 &
XVFB_PID=\$!

# Wait for Xvfb
sleep 2

# Start window manager
openbox &

# Start x11vnc
x11vnc -display :1 -nopw -listen 0.0.0.0 -xkb -forever &
VNC_PID=\$!

# Start noVNC (websockify)
websockify --web /usr/share/novnc/ 6080 localhost:5901 &
NOVNC_PID=\$!

# Start MongoDB Compass if MONGODB_URI is set
if [ -n \"\\" ]; then
    mongodb-compass --disable-gpu --no-sandbox \ &
else
    mongodb-compass --disable-gpu --no-sandbox &
fi

# Wait for any process to exit
wait -n
EOF

RUN chmod +x /start.sh

EXPOSE 6080

CMD [\"/start.sh\"]
