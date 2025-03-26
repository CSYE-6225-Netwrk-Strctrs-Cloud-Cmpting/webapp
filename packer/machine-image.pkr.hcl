packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon"
    }
    googlecompute = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/googlecompute"
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

variable "ami_users" {
  description = "AWS Account ID for sharing the AMI"
  default     = ["575108914806"]
}

variable "gcp_zone" {
  type    = string
  default = "us-central1-a"
}

variable "gcp_image_name" {
  type    = string
  default = "my-custom-image"
}

locals {
  timestamp = regex_replace(timestamp(), "[- TZ:]", "")
}

source "amazon-ebs" "custom_ami" {
  region        = var.aws_region
  profile       = var.aws_profile
  instance_type = var.instance_type
  ami_name      = "custom-ami-{{timestamp}}"
  ami_users     = var.ami_users
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

# source "googlecompute" "ubuntu_nodejs" {
#   project_id          = 459095826681
#   source_image        = "ubuntu-2404-noble-amd64-v20250214"
#   source_image_family = "ubuntu-2404-lts-noble"
#   zone                = var.gcp_zone
#   image_name          = "${var.gcp_image_name}-${local.timestamp}"
#   ssh_username        = "ubuntu"
#   machine_type        = "e2-micro"
#   disk_size           = 10
#   disk_type           = "pd-standard"
# }

build {
  sources = [
    "source.amazon-ebs.custom_ami"
    # "source.googlecompute.ubuntu_nodejs"
  ]

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

      # Ensure csye6225 user exists
      "sudo groupadd -f csye6225",
      "sudo id -u csye6225 &>/dev/null || sudo useradd -m -g csye6225 -s /usr/sbin/nologin csye6225",

      "curl -O https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb",
      "sudo dpkg -i amazon-cloudwatch-agent.deb",

      # Unzip webapp
      "sudo mkdir -p /opt/webapp",
      "if [ -f /tmp/webapp.zip ]; then sudo unzip /tmp/webapp.zip -d /opt/webapp; else echo 'WARNING: /tmp/webapp.zip does not exist, skipping unzip.'; fi",
      "sudo chown -R csye6225:csye6225 /opt/webapp",
      "sudo chmod 750 /opt/webapp",

      # Create logs directory and initial log file
      "sudo mkdir -p /opt/webapp/logs",
      "sudo touch /opt/webapp/logs/csye6225.log",
      "sudo chown -R csye6225:csye6225 /opt/webapp/logs",
      "sudo chmod 750 /opt/webapp/logs",

      # Install dependencies

      "cd /opt/webapp",
      "echo '📦 Installing dependencies...' ",
      "sudo npm install helmet cors winston --save",
      "sudo npm install --production || { echo '❌ npm install failed'; exit 1; }",
      "echo '✅ npm install completed'",

      # Setup systemd service
      "echo '[Unit]\nDescription=WebApp Service\nAfter=network.target\n[Service]\nUser=csye6225\nGroup=csye6225\nExecStart=/usr/bin/node /opt/webapp/app.js\nRestart=always\n[Install]\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/webapp.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp.service",

      # Prepare and move CloudWatch config
      "sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc",
      "sudo mv /tmp/cloudwatch-agent-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json",

      # Start CloudWatch agent with config
      # Start CloudWatch agent with config automatically
      "sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s",
      "sudo systemctl restart amazon-cloudwatch-agent.service"
    ]
  }
}