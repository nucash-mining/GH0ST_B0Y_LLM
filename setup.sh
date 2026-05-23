#!/bin/bash
# One-time setup script for GH0ST_B0Y Oracle
# Run this once: bash /home/nuts/Documents/wattx-llm/GH0ST_B0Y/setup.sh

echo "Setting up 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 Oracle..."

# Make launcher executable
chmod +x /home/nuts/Documents/wattx-llm/GH0ST_B0Y/launch-ghost-oracle.sh

# Make desktop file executable and trusted
chmod +x /home/nuts/Desktop/GH0ST_B0Y_Oracle.desktop
gio set /home/nuts/Desktop/GH0ST_B0Y_Oracle.desktop metadata::trusted true 2>/dev/null

echo "Done! You can now double-click GH0ST_B0Y_Oracle on your Desktop."
