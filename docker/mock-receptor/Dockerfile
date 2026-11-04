# Mock exfiltration receptor for scenarios CB-002 and CB-003
FROM python:3.11-slim

RUN useradd -u 1002 -m receptor
WORKDIR /app
COPY receptor.py .
USER receptor

EXPOSE 8080
EXPOSE 5353/udp
CMD ["python3", "-u", "receptor.py"]
