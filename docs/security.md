# Security Architecture

Depnoyed enforces multiple layers of security to ensure multi-tenant isolation and safe workload execution.

## 1. Authentication & Identity
- **NextAuth:** User sessions are handled via NextAuth using secure, HTTP-only cookies.
- **No Client Trust:** The backend NEVER trusts `userId` or `tenantId` from the client request body. It always derives the identity securely from the server-side session.

## 2. Infrastructure Security
- **No AWS Keys in Code:** The application uses IAM Roles for Service Accounts (IRSA) to interact with AWS resources if needed.
- **Least Privilege RBAC:** The Depnoyed backend `ServiceAccount` only has permissions to `get, list, watch, create, update, patch, delete` specific resources (`deployments`, `services`, `ingresses`, `pvcs`, `pods`) within tenant namespaces.
- **No Privileged Containers:** Customer workloads are deployed without `privileged: true` or host filesystem mounts.

## 3. Application Security
- **Quotas:** Server-side limits prevent abuse. Users are strictly limited to a maximum of 3 deployments per account.
- **Safe Hostnames:** Hostnames are dynamically generated using `app.slug` and a random suffix. Arbitrary user-controlled domain names are rejected.
- **Manifest Validation:** Users cannot submit arbitrary Kubernetes YAML. They can only deploy verified applications from the marketplace catalog.
