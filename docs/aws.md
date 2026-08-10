# AWS EKS Infrastructure

Depnoyed utilizes Amazon Elastic Kubernetes Service (EKS) for its production environment. This document describes the AWS infrastructure and the deployment mechanisms.

## Infrastructure as Code (Terraform)

The infrastructure is fully defined in Terraform under `infra/aws/terraform/`. It provisions:
- **VPC & Networking:** A secure VPC with public and private subnets, utilizing a NAT Gateway for outbound traffic from private nodes.
- **EKS Cluster:** A managed Kubernetes control plane.
- **Managed Node Groups:** EC2 instances (default `t3.medium`) that run the workloads.
- **EBS CSI Driver:** The add-on required to dynamically provision PersistentVolumeClaims for stateful workloads.
- **IAM (IRSA):** OIDC provider configured to allow EKS Pods to assume AWS IAM roles safely without hardcoding access keys.

## Deployment Flow (Depnoyed Control Plane)

Depnoyed itself runs inside the EKS cluster in the `depnoyed-system` namespace.
- **Namespaces:** Customer workloads are strictly isolated into `depnoyed-<tenant-id>` namespaces.
- **Permissions:** The Depnoyed backend uses a dedicated `ServiceAccount` bounded by a `ClusterRole` that follows the principle of least privilege. It cannot delete the cluster or manipulate infrastructure outside of the `depnoyed-*` namespace pattern.

## Cost Estimation

For prototype testing, the cluster is designed to be minimal:
- EKS Control Plane: ~$73/mo
- NAT Gateway: ~$32/mo
- Node Group (2x t3.medium): ~$60/mo
Total base cost: ~$165/mo.

Do not use this configuration in production without reviewing autoscaling, multi-AZ high availability, and EBS snapshot backups.
