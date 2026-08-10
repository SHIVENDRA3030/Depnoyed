# Depnoyed EKS Infrastructure

This directory contains the Terraform configuration to deploy the AWS infrastructure required to run the Depnoyed platform.

## Architecture

This Terraform configuration provisions:
- A new VPC with public and private subnets across 2 Availability Zones.
- A NAT Gateway to allow private nodes to access the internet.
- An AWS EKS Cluster running Kubernetes v1.28.
- A Managed Node Group using `t3.medium` instances (configurable).
- IAM OIDC provider for IRSA (IAM Roles for Service Accounts).
- The Amazon EBS CSI Driver add-on for dynamic PersistentVolume provisioning.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) or [OpenTofu](https://opentofu.org/)
- AWS CLI configured with administrator access (`aws configure`)

## Usage

1. Initialize Terraform:
   ```bash
   terraform init
   ```

2. Review the plan:
   ```bash
   terraform plan
   ```

3. Apply the configuration (takes ~15-20 minutes):
   ```bash
   terraform apply
   ```

4. Configure your local `kubectl` to access the cluster:
   ```bash
   $(terraform output -raw configure_kubectl)
   ```

5. Verify nodes and storage class:
   ```bash
   kubectl get nodes
   kubectl get storageclass
   ```

## Cost Estimation

By default, this provisions:
- 2x `t3.medium` instances (~$60/month)
- EKS Control Plane ($73/month)
- 1x NAT Gateway (~$32/month)
- EBS Volumes (varies by user deployments)

To keep costs lower, you can modify `variables.tf` to reduce the `node_group_desired_size` to 1, or use spot instances.
