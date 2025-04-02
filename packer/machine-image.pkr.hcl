packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = ">= 1.0.0"
    }
  }
}

variable "AWS_REGION" {
  default = "us-east-1"
}

variable "AWS_PROFILE" {
  default = "dev"
}

variable "demo_account_ids" {
  description = "List of AWS Account IDs to share AMI with"
  type        = list(string)
  default     = ["575108914806"]
}

variable "inst_type" {
  default = "t2.micro"
}

variable "S3_BUCKET_NAME" {
  default = "csye62252025"
}

source "amazon-ebs" "ubuntu" {
  ami_name      = "ubuntu-24.04-{{timestamp}}"
  profile       = var.AWS_PROFILE
  region        = var.AWS_REGION
  source_ami    = "ami-0fe67b8200454bad4"
  instance_type = var.inst_type
  ssh_username  = "ubuntu"

  ami_users = var.demo_account_ids

  tags = {
    Name  = "Ubuntu-webapp-AMI"
    Owner = "YourName"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  # Upload app and CloudWatch config files
  provisioner "file" {
    source      = "webapp.zip"
    destination = "/tmp/webapp.zip"
  }

  provisioner "file" {
    source      = "packer/cloudwatch-agent-config.json"
    destination = "/tmp/cloudwatch-agent-config.json"
  }

  # Install dependencies and setup application
  provisioner "shell" {
    inline = [
      "export DEBIAN_FRONTEND=noninteractive",
      "sudo apt update -y",

      # Fix SSL issues
      "sudo apt install -y software-properties-common",
      "sudo add-apt-repository universe",
      "sudo apt-get update --fix-missing",
      "sudo apt-get remove -y --purge libssl-dev",
      "sudo apt-get autoremove -y",
      "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl3t64=3.0.13-0ubuntu3.5",
      "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl-dev",

      # Install Node.js and other packages
      "sudo apt install -y nodejs npm unzip",

      # Create user and group
      "sudo groupadd -f csye6225",
      "sudo useradd -r -s /usr/sbin/nologin -g csye6225 csye6225 || echo 'User already exists'",

      # Setup application directory
      "sudo mkdir -p /opt/csye6225/webapp",
      "sudo unzip -q /tmp/webapp.zip -d /opt/csye6225/webapp",

      # Create .env file
      "echo 'AWS_REGION=${var.AWS_REGION}' | sudo tee -a /opt/csye6225/webapp/.env",
      "echo 'S3_BUCKET_NAME=${var.S3_BUCKET_NAME}' | sudo tee -a /opt/csye6225/webapp/.env",

      # Set permissions
      "sudo chown csye6225:csye6225 /opt/csye6225/webapp/.env",
      "sudo chmod 600 /opt/csye6225/webapp/.env",

      # Install only production dependencies
      "cd /opt/csye6225/webapp/ && sudo npm install --only=production --no-fund --no-audit",

      # Ownership and permissions
      "sudo chown -R csye6225:csye6225 /opt/csye6225/webapp",
      "sudo chmod -R 750 /opt/csye6225/webapp"
    ]
  }

  # Install and configure CloudWatch Agent
  provisioner "shell" {
    inline = [
      "wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb",
      "sudo dpkg -i amazon-cloudwatch-agent.deb",
      "sudo systemctl enable amazon-cloudwatch-agent",
      "sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/tmp/cloudwatch-agent-config.json -s"
    ]
  }

  # Upload systemd service file for app
  provisioner "file" {
    content     = <<-EOF
    [Unit]
    Description=CSYE 6225 App
    After=network.target

    [Service]
    Type=simple
    User=csye6225
    Group=csye6225
    EnvironmentFile=/opt/csye6225/webapp/.env
    WorkingDirectory=/opt/csye6225/webapp
    ExecStart=/usr/bin/node /opt/csye6225/webapp/app.js
    Restart=always
    StandardOutput=syslog
    StandardError=syslog
    SyslogIdentifier=csye6225

    [Install]
    WantedBy=multi-user.target
    EOF
    destination = "/tmp/csye6225.service"
  }

  # Enable and start app service
  provisioner "shell" {
    inline = [
      "sudo mv /tmp/csye6225.service /etc/systemd/system/csye6225.service",
      "sudo chmod 664 /etc/systemd/system/csye6225.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable csye6225.service",
      "sudo systemctl start csye6225.service"
    ]
  }
}