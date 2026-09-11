FROM node:20-alpine

# yt-dlp needs python. ffmpeg is not required, since only complete progressive
# files are offered and nothing is muxed.
RUN apk add --no-cache python3 py3-pip ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app
COPY package.json ./
COPY server.mjs ./

ENV PORT=8080
EXPOSE 8080

# Keep yt-dlp current without rebuilding the image.
CMD ["sh", "-c", "pip3 install --no-cache-dir --break-system-packages --upgrade yt-dlp >/dev/null 2>&1; node server.mjs"]
