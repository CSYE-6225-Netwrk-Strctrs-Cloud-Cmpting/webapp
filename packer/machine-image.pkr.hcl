packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  description = "AWS region to deploy the instance"
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  default     = "dev"
}

variable "instance_type" {
  description = "AWS EC2 instance type"
  default     = "t3.micro"
}

source "amazon-ebs" "custom_ami" {
  region        = var.aws_region
  profile       = var.aws_profile
  instance_type = var.instance_type
  ami_name      = "custom-ami-{{timestamp}}"
  ami_users     = ["575108914806"]
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"] # Canonical
    most_recent = true
  }
  ssh_username = "ubuntu"
}

build {
  sources = ["source.amazon-ebs.custom_ami"]

  provisioner "file" {
    source      = "packer/webapp.zip" # Your local file
    destination = "/tmp/webapp.zip"   # Target path in the VM
  }

  provisioner "shell" {
    inline = [
      "sudo apt update",
      "sudo apt install -y postgresql postgresql-contrib unzip nodejs npm",

      # Ensure PostgreSQL service is running
      "sudo systemctl start postgresql",
      "sudo systemctl enable postgresql",

      # Ensure PostgreSQL configuration allows password authentication
      "PG_CONF=$(ls /etc/postgresql/*/main/pg_hba.conf) && sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' $PG_CONF",
      "sudo systemctl restart postgresql",

      # Set PostgreSQL password and create database
      "sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'password123';\"",
      "sudo -u postgres psql -c \"CREATE DATABASE csye6225;\"",

      # Ensure group and user exist
      "sudo groupadd -f csye6225",
      "sudo useradd -m -g csye6225 -s /bin/bash csye6225 || echo 'User csye6225 already exists'",

      # Ensure /opt/webapp exists and extract webapp.zip if it exists
      "sudo mkdir -p /opt/webapp",
      "if [ -f /tmp/webapp.zip ]; then sudo unzip /tmp/webapp.zip -d /opt/webapp; else echo 'WARNING: /tmp/webapp.zip does not exist, skipping unzip.'; fi",
      "sudo chown -R csye6225:csye6225 /opt/webapp",

      # Create systemd service for the webapp
      "echo '[Unit]\nDescription=WebApp Service\nAfter=network.target\n[Service]\nUser=csye6225\nGroup=csye6225\nExecStart=/usr/bin/node /opt/webapp/app.js\nRestart=always\n[Install]\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/webapp.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp.service"
    ]
  }
}
