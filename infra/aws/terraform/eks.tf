module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.16"

  cluster_name    = var.cluster_name
  cluster_version = "1.35"

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.public_subnets

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    depnoyed_nodes_al2023 = {
      ami_type     = "AL2023_x86_64_STANDARD" # Migrated from AL2 (deprecated for k8s 1.33+)
      min_size     = var.node_group_min_size
      max_size     = var.node_group_max_size
      desired_size = var.node_group_desired_size

      instance_types = [var.node_instance_type]
      capacity_type  = "ON_DEMAND"

      # Attach the EBS CSI policy to the node IAM role so that the CSI driver can manage volumes
      iam_role_additional_policies = {
        ebs_csi = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
      }
    }
  }

  # Enable OIDC provider for IRSA
  enable_irsa = true
}
