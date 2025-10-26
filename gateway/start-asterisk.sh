#!/bin/bash
set -e

echo "Starting Asterisk WebRTC Gateway..."

# Ensure directories exist with proper permissions
mkdir -p /var/run/asterisk /var/log/asterisk /var/lib/asterisk /var/spool/asterisk
chown -R asterisk:asterisk /var/run/asterisk /var/log/asterisk /var/lib/asterisk /var/spool/asterisk /etc/asterisk

# Remove any capability requirements from modules
# This prevents the "Unable to install capabilities" error
sed -i 's/^load => res_cap.so/;load => res_cap.so/' /etc/asterisk/modules.conf || true
sed -i 's/^preload => res_cap.so/;preload => res_cap.so/' /etc/asterisk/modules.conf || true

# Start Asterisk as the asterisk user without capability requirements
exec su -s /bin/bash asterisk -c '/usr/sbin/asterisk -f -vvv -c'
