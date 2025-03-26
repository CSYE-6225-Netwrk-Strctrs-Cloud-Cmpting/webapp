packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  default = "us-east-1"
}

variable "aws_profile" {
  default = "dev"
}

variable "instance_type" {
  default = "t3.micro"
}

variable "ami_users" {
  default = ["575108914806"]
}

locals {
  timestamp = regex_replace(timestamp(), "[- TZ:]", "")
}

source "amazon-ebs" "custom_ami" {
  region        = var.aws_region
  profile       = var.aws_profile
  instance_type = var.instance_type
  ami_name      = "custom-ami-${local.timestamp}"
  ami_users     = var.ami_users

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"]
    most_recent = true
  }

  ssh_username = "ubuntu"
}

build {
  sources = ["source.amazon-ebs.custom_ami"]

  provisioner "file" {
    source      = "packer/webapp.zip"
    destination = "/tmp/webapp.zip"
  }

  provisioner "file" {
    source      = "packer/cloudwatch-agent-config.json"
    destination = "/tmp/cloudwatch-agent-config.json"
  }

  provisioner "shell" {
    inline = [
      "sudo apt update",
      "sudo apt install -y unzip nodejs npm curl",

      # Create csye6225 user and group if not exists
      "sudo getent group csye6225 || sudo groupadd csye6225",
      "sudo getent passwd csye6225 || sudo useradd -m -g csye6225 -s /usr/sbin/nologin csye6225",

      # Install CloudWatch Agent
      "curl -O https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb",
      "sudo dpkg -i amazon-cloudwatch-agent.deb",

      # Prepare /opt/webapp directory
      "sudo mkdir -p /opt/webapp",
      "if [ -f /tmp/webapp.zip ]; then sudo unzip /tmp/webapp.zip -d /opt/webapp; else echo 'webapp.zip missing'; fi",
      "sudo chown -R csye6225:csye6225 /opt/webapp",
      "sudo chmod 750 /opt/webapp",

      # Setup logs
      "sudo mkdir -p /opt/webapp/logs",
      "sudo touch /opt/webapp/logs/csye6225.log",
      "sudo chown -R csye6225:csye6225 /opt/webapp/logs",
      "sudo chmod 750 /opt/webapp/logs",

      # Install dependencies
      "cd /opt/webapp",
      "sudo npm install helmet cors winston --save",
      "sudo npm install --production || { echo 'npm install failed'; exit 1; }",

      # Create systemd service
      "echo '[Unit]' | sudo tee /etc/systemd/system/webapp.service",
      "echo 'Description=WebApp Service' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo 'After=network.target' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo '[Service]' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo 'User=csye6225' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo 'Group=csye6225' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo 'ExecStart=/usr/bin/node /opt/webapp/app.js' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo 'Restart=always' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo '[Install]' | sudo tee -a /etc/systemd/system/webapp.service",
      "echo 'WantedBy=multi-user.target' | sudo tee -a /etc/systemd/system/webapp.service",

      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp.service",

      # Setup CloudWatch Agent
      "sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc",
      "sudo mv /tmp/cloudwatch-agent-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json",
      "sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s",
      "sudo systemctl restart amazon-cloudwatch-agent.service"
    ]
  }
}