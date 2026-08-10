# Install the EBS CSI Driver addon for dynamic PVC provisioning
resource "aws_eks_addon" "ebs_csi" {
  cluster_name = module.eks.cluster_name
  addon_name   = "aws-ebs-csi-driver"
  
  depends_on = [
    module.eks.eks_managed_node_groups
  ]
}

# The default StorageClass created by the addon is typically named "gp2".
# EKS automatically creates it, but if you want to define a standard gp3 StorageClass:
# (Requires Kubernetes provider to be configured using the cluster endpoint and auth token)
