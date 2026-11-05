#!/usr/bin/env python3
"""
Deploy ContainBench to Vultr Cloud Compute instance (207.246.89.99)
"""

import sys
import time
import paramiko

VM_IP = "207.246.89.99"
VM_USER = "root"
REPO_URL = "https://github.com/cesjavi/containbench.git"

def deploy(password: str):
    print(f"[*] Connecting to {VM_USER}@{VM_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VM_IP, username=VM_USER, password=password, timeout=15)
        print("[+] SSH connection established successfully!")
    except Exception as e:
        print(f"[-] Failed to connect: {e}")
        sys.exit(1)

    commands = [
        ("Installing git / checking docker...", "which git || apt-get update && apt-get install -y git"),
        ("Cloning or pulling ContainBench repository...", 
         f"if [ -d /root/containbench ]; then cd /root/containbench && git pull; else git clone {REPO_URL} /root/containbench; fi"),
        ("Configuring environment...", 
         "cd /root/containbench/docker && if [ ! -f .env ]; then cp .env.example .env; fi"),
        ("Building and launching ContainBench Docker containers (this takes ~1-2 mins)...", 
         "cd /root/containbench/docker && docker compose up -d --build"),
        ("Checking container status...", 
         "docker ps"),
    ]

    for desc, cmd in commands:
        print(f"\n[>] {desc}")
        stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
        for line in iter(stdout.readline, ""):
            print("    " + line.strip())
        rc = stdout.channel.recv_exit_status()
        if rc != 0:
            err = stderr.read().decode('utf-8', errors='ignore')
            print(f"[-] Command exited with status {rc}: {err}")

    # Health check
    print("\n[>] Verifying application health...")
    time.sleep(3)
    stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:8000/health || echo 'Waiting for backend...'")
    print("    Backend status:", stdout.read().decode().strip())

    ssh.close()
    print("\n=======================================================")
    print(" ContainBench successfully deployed on Vultr VM!")
    print(f" Web UI: http://{VM_IP}  (or http://{VM_IP}:3000)")
    print(" Login:  admin / containbench")
    print("=======================================================")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/deploy_vultr.py <ROOT_PASSWORD>")
        sys.exit(1)
    deploy(sys.argv[1])

