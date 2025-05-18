#!/bin/bash

echo "Cleaning up Docker system..."

# Remove all stopped containers
echo "Removing stopped containers..."
docker container prune -f

# Remove unused images
echo "Removing unused images..."
docker image prune -a -f

# Remove unused volumes
echo "Removing unused volumes..."
docker volume prune -f

# Remove unused networks
echo "Removing unused networks..."
docker network prune -f

# Full system prune as a last resort (careful with this one)
# echo "Full system prune..."
# docker system prune -a -f

# Display current disk usage
echo "Current Docker disk usage:"
docker system df

echo "Cleanup complete!" 